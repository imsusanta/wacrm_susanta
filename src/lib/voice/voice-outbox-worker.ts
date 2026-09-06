import crypto from 'node:crypto';
import { getAdminClient } from '@/lib/db/server';
import { voiceRepository } from '@/lib/db/repositories';
import { resolveTenantVoiceConfig } from '@/core/providers/voice/credential-resolver';
import { getVoiceProvider } from '@/core/providers/voice/provider-factory';
import { VoiceProviderError } from '@/core/providers/voice/voice-provider.interface';
import { PostCallPipeline } from '@/lib/voice/post-call-pipeline';

export interface VoiceOutboxMetrics {
  queuedCount: number;
  retryingCount: number;
  processingCount: number;
  deadLetterCount: number;
  processedCount: number;
  workerReady: boolean;
  workerHeartbeatHealthy: boolean;
  lastHeartbeatAt: string | null;
}

const COMMIT_SHA =
  process.env.NEXT_PUBLIC_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  'development';

const WORKER_ID = `voice_worker_primary`;
const HEARTBEAT_FRESHNESS_MS = 120_000;

function db() {
  return getAdminClient();
}

export class VoiceOutboxWorker {
  private static startedAt = new Date().toISOString();
  private static processedCount = 0;
  private static retryCount = 0;
  private static deadLetterCount = 0;
  private static lastSuccessAt: string | null = null;
  private static lastFailureCode: string | null = null;

  static async recordHeartbeat(): Promise<void> {
    const now = new Date().toISOString();
    const row = {
      worker_id: WORKER_ID,
      commit_sha: COMMIT_SHA,
      started_at: this.startedAt,
      last_heartbeat_at: now,
      last_scan_at: now,
      last_success_at: this.lastSuccessAt,
      last_failure_code: this.lastFailureCode,
      processed_count: this.processedCount,
      retry_count: this.retryCount,
      dead_letter_count: this.deadLetterCount,
      updated_at: now,
    };
    try {
      await db().from('worker_health').upsert(row, { onConflict: 'worker_id' });
    } catch {
      /* safe heartbeat logging */
    }
  }

  static async processPendingEvents(): Promise<{
    processed: number;
    failed: number;
  }> {
    const now = new Date().toISOString();
    let processed = 0;
    let failed = 0;
    await this.recordHeartbeat();

    try {
      await db()
        .from('provider_events')
        .update({ status: 'retrying', next_attempt_at: now })
        .eq('status', 'processing')
        .lt('lock_expires_at', now);

      const { data: pendingEvents } = await db()
        .from('provider_events')
        .select('*')
        .in('status', ['queued', 'retrying'])
        .limit(25);

      for (const doc of pendingEvents || []) {
        if (
          doc.next_attempt_at &&
          new Date(doc.next_attempt_at as string).getTime() > Date.now()
        ) {
          continue;
        }

        const lockExpiresAt = new Date(Date.now() + 60_000).toISOString();
        const currentAttempts = Number(doc.attempt_count || 0) + 1;

        const { data: claimed, error: claimErr } = await db()
          .from('provider_events')
          .update({
            status: 'processing',
            lock_owner: WORKER_ID,
            lock_expires_at: lockExpiresAt,
            attempt_count: currentAttempts,
          })
          .eq('id', doc.id)
          .in('status', ['queued', 'retrying'])
          .select('id, lock_owner')
          .maybeSingle();

        if (claimErr || !claimed || claimed.lock_owner !== WORKER_ID) continue;

        try {
          const providerName = doc.provider as 'elevenlabs' | 'sarvam' | 'xai';
          const externalEventId = doc.external_event_id as string;
          const accountId = doc.account_id as string;
          const expectedHash = doc.payload_hash as string;
          const payload = doc.payload;
          const rawBody =
            typeof payload === 'string'
              ? payload
              : JSON.stringify(payload || {});

          if (!accountId) {
            throw new VoiceProviderError(
              'VOICE_PROVIDER_REQUEST_FAILED',
              'Event document is missing required tenant reference',
              400
            );
          }

          const computedHash = crypto
            .createHash('sha256')
            .update(rawBody)
            .digest('hex');
          if (expectedHash && computedHash !== expectedHash) {
            throw new VoiceProviderError(
              'VOICE_PROVIDER_REQUEST_FAILED',
              'Raw payload SHA-256 hash mismatch',
              400
            );
          }

          const tenantConfig = await resolveTenantVoiceConfig(
            accountId,
            providerName
          );
          const provider = getVoiceProvider(providerName, tenantConfig);
          const event = await provider.normalizeWebhook(rawBody);

          if (
            event.externalEventId &&
            event.externalEventId !== externalEventId
          ) {
            throw new VoiceProviderError(
              'VOICE_PROVIDER_REQUEST_FAILED',
              'Normalized event ID mismatch',
              400
            );
          }

          if (event.status) {
            await voiceRepository.upsertCall(accountId, event.externalCallId, {
              provider: providerName,
              direction: event.direction || 'outbound',
              status: event.status,
              agentId: event.externalAgentId,
              startedAt: event.startedAt,
              endedAt: event.endedAt,
              durationSeconds: event.durationSeconds,
              transcriptStatus: event.transcript ? 'available' : 'pending',
              failureCode: event.failureCode,
              failureMessageSanitized: event.failureMessageSanitized,
            });

            // Trigger asynchronous, non-blocking post-call lead extraction & CRM pipeline
            if (event.transcript || event.status === 'completed') {
              try {
                const existingCall = await voiceRepository.findCallByExternalId(
                  accountId,
                  event.externalCallId
                );
                await PostCallPipeline.processCall({
                  accountId,
                  externalCallId: event.externalCallId,
                  transcript:
                    event.transcript || (existingCall?.transcript as string) || '',
                  callerPhone: event.patientPhone,
                  direction: event.direction || 'outbound',
                  durationSeconds: event.durationSeconds,
                  agentId: event.externalAgentId,
                  sttProvider: providerName,
                  ttsProvider: providerName,
                  existingContactId: existingCall?.contactId as string,
                  existingLeadId: existingCall?.leadId as string,
                });
              } catch (pipelineErr) {
                console.warn(
                  '[VoiceOutboxWorker] Post-call intelligence pipeline non-fatal warning:',
                  pipelineErr
                );
              }
            }
          }

          await db()
            .from('provider_events')
            .update({
              status: 'processed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', doc.id);

          this.processedCount++;
          this.lastSuccessAt = new Date().toISOString();
          processed++;
        } catch (err: unknown) {
          failed++;
          this.retryCount++;
          const errorCode =
            err instanceof VoiceProviderError
              ? err.code
              : 'VOICE_PROVIDER_REQUEST_FAILED';
          this.lastFailureCode = errorCode;
          const maxAttempts = Number(doc.max_attempts || 5);
          if (currentAttempts >= maxAttempts) {
            this.deadLetterCount++;
            await db()
              .from('provider_events')
              .update({
                status: 'dead_letter',
                last_error: errorCode,
              })
              .eq('id', doc.id);
          } else {
            const delayMs = Math.min(
              5000 * Math.pow(3, currentAttempts - 1),
              900_000
            );
            await db()
              .from('provider_events')
              .update({
                status: 'retrying',
                next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
                last_error: errorCode,
              })
              .eq('id', doc.id);
          }
        }
      }
    } catch (err) {
      console.warn('[VoiceOutboxWorker] Outbox scan error:', err);
    }

    await this.recordHeartbeat();
    return { processed, failed };
  }

  static async getHealthMetrics(): Promise<VoiceOutboxMetrics> {
    let queuedCount = 0;
    let retryingCount = 0;
    let processingCount = 0;
    let deadLetterCount = 0;
    let processedCount = 0;
    let workerReady = false;
    let workerHeartbeatHealthy = false;
    let lastHeartbeatAt: string | null = null;

    try {
      const { data: workerDoc } = await db()
        .from('worker_health')
        .select('*')
        .eq('worker_id', WORKER_ID)
        .maybeSingle();
      if (workerDoc?.last_heartbeat_at) {
        const heartbeat = String(workerDoc.last_heartbeat_at);
        lastHeartbeatAt = heartbeat;
        const age = Date.now() - new Date(heartbeat).getTime();
        if (age <= HEARTBEAT_FRESHNESS_MS) {
          workerReady = true;
          workerHeartbeatHealthy = true;
        }
      }

      const countStatus = async (status: string) => {
        const { count } = await db()
          .from('provider_events')
          .select('id', { count: 'exact', head: true })
          .eq('status', status);
        return count || 0;
      };
      queuedCount = await countStatus('queued');
      retryingCount = await countStatus('retrying');
      processingCount = await countStatus('processing');
      deadLetterCount = await countStatus('dead_letter');
      processedCount = await countStatus('processed');
    } catch {
      /* safe fallback */
    }

    return {
      queuedCount,
      retryingCount,
      processingCount,
      deadLetterCount,
      processedCount,
      workerReady,
      workerHeartbeatHealthy,
      lastHeartbeatAt,
    };
  }
}
