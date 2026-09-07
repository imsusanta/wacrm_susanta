import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getVoiceProvider } from '@/core/providers/voice/provider-factory';
import {
  VoiceProviderError,
  type VoiceProviderName,
} from '@/core/providers/voice/voice-provider.interface';
import { voiceRepository } from '@/lib/db/repositories';
import { isUniqueViolation } from '@/core/repositories/voice';
import { storageRepository } from '@/lib/storage/repository';
import { STORAGE_BUCKETS } from '@/lib/storage/buckets';
import { resolveTenantVoiceConfig } from '@/core/providers/voice/credential-resolver';

const MAX_PAYLOAD_BYTES = 1_000_000;
const ALLOWED_CONTENT_TYPE = /^application\/json(?:\s*;|$)/i;

function sanitizedError(error: unknown): { error: string; status: number } {
  if (error instanceof VoiceProviderError) {
    return { error: error.code, status: error.status };
  }
  return { error: 'VOICE_PROVIDER_REQUEST_FAILED', status: 502 };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  if (!['sarvam', 'xai', 'elevenlabs'].includes(providerParam)) {
    return NextResponse.json(
      { error: 'VOICE_PROVIDER_REQUEST_FAILED' },
      { status: 400 }
    );
  }

  if (!ALLOWED_CONTENT_TYPE.test(request.headers.get('content-type') || '')) {
    return NextResponse.json(
      { error: 'VOICE_PROVIDER_REQUEST_FAILED' },
      { status: 415 }
    );
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: 'VOICE_PROVIDER_REQUEST_FAILED' },
      { status: 413 }
    );
  }

  const providerName = providerParam as VoiceProviderName;
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: 'VOICE_PROVIDER_REQUEST_FAILED' },
      { status: 413 }
    );
  }

  try {
    // 1. Initial parse to extract provider event identifiers for candidate tenant lookup
    let tempPayload: Record<string, unknown>;
    try {
      tempPayload = JSON.parse(rawBody);
    } catch {
      throw new VoiceProviderError(
        'VOICE_PROVIDER_REQUEST_FAILED',
        'Invalid JSON payload',
        400
      );
    }

    const dataObj =
      tempPayload.data && typeof tempPayload.data === 'object'
        ? (tempPayload.data as Record<string, unknown>)
        : {};

    const agentId =
      typeof dataObj.agent_id === 'string' ? dataObj.agent_id : undefined;
    const phoneNumberId =
      typeof dataObj.agent_phone_number_id === 'string'
        ? dataObj.agent_phone_number_id
        : undefined;

    // 2. Resolve exactly one candidate integration server-side
    const integration = await voiceRepository.findUniqueTenant(
      providerName,
      agentId,
      phoneNumberId
    );

    if (!integration) {
      throw new VoiceProviderError(
        'VOICE_TENANT_MAPPING_NOT_FOUND',
        'No unique server-side voice integration mapping exists',
        422
      );
    }

    // 3. Resolve tenant-scoped configuration and verify signature using tenant secret
    const tenantConfig = await resolveTenantVoiceConfig(
      integration.accountId,
      providerName
    );
    const provider = getVoiceProvider(providerName, tenantConfig);

    const verification = await provider.verifyWebhook(rawBody, request.headers);
    if (!verification || verification.verified !== true) {
      throw new VoiceProviderError(
        'VOICE_SIGNATURE_INVALID',
        'Voice webhook signature verification failed',
        401
      );
    }

    const event = await provider.normalizeWebhook(rawBody, request.headers);
    const payloadHash = crypto
      .createHash('sha256')
      .update(rawBody)
      .digest('hex');

    // 4. Pre-check for duplicate event before Storage upload to prevent orphan files
    const preExistingEvent = await voiceRepository.findProviderEvent(
      providerName,
      event.externalEventId,
      integration.accountId
    );

    if (preExistingEvent) {
      if (preExistingEvent.payloadHash !== payloadHash) {
        return NextResponse.json(
          {
            error: 'VOICE_DUPLICATE_EVENT',
            message: 'Payload hash mismatch on duplicate event ID',
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { accepted: true, duplicate: true },
        { status: 200 }
      );
    }

    // 5. Store raw payload in private storage (fail closed).
    await storageRepository.verifyBucketExists(STORAGE_BUCKETS.webhookPayloads);
    const filename = `${providerName}_${event.externalEventId.replace(/[^a-zA-Z0-9_.:-]/g, '_')}_${payloadHash.slice(0, 16)}.json`;

    let rawPayloadReference: string;
    try {
      const createdFile = await storageRepository.uploadFile(
        STORAGE_BUCKETS.webhookPayloads,
        Buffer.from(rawBody),
        filename,
        'application/json'
      );
      rawPayloadReference = createdFile.fileId;
    } catch (storageErr) {
      console.error(
        '[voice-webhook] Storage persistence failed for raw payload:',
        storageErr
      );
      throw new VoiceProviderError(
        'VOICE_PROVIDER_PERSISTENCE_FAILED',
        'Failed to store raw webhook payload',
        500
      );
    }

    // 6. Store transcript in private Storage bucket if present
    let transcriptReference: string | undefined = undefined;
    if (event.transcript) {
      try {
        const transcriptFile = await storageRepository.uploadFile(
          STORAGE_BUCKETS.voiceTranscripts,
          Buffer.from(event.transcript),
          `transcript_${event.externalCallId}.txt`,
          'text/plain'
        );
        transcriptReference = transcriptFile.fileId;
      } catch (tErr) {
        console.error(
          '[voice-webhook] Storage persistence failed for transcript:',
          tErr
        );
        await storageRepository
          .deleteFile(STORAGE_BUCKETS.webhookPayloads, rawPayloadReference)
          .catch(() => undefined);

        throw new VoiceProviderError(
          'VOICE_PROVIDER_PERSISTENCE_FAILED',
          'Failed to store transcript',
          500
        );
      }
    }

    // 7. Atomically create provider_event document in Appwrite
    let eventDoc: { $id: string };
    try {
      eventDoc = (await voiceRepository.createProviderEvent({
        accountId: integration.accountId,
        provider: providerName,
        externalEventId: event.externalEventId,
        eventType: event.eventType,
        payloadHash,
        rawPayloadReference,
        processingStatus: 'queued',
        processingAttempts: 0,
        receivedAt: new Date().toISOString(),
      })) as unknown as { $id: string };
    } catch (err: unknown) {
      // Race condition cleanup: delete redundant uploaded Storage files if another thread won insertion
      await storageRepository
        .deleteFile(STORAGE_BUCKETS.webhookPayloads, rawPayloadReference)
        .catch(() => undefined);

      if (transcriptReference) {
        await storageRepository
          .deleteFile(STORAGE_BUCKETS.voiceTranscripts, transcriptReference)
          .catch(() => undefined);
      }

      if (isUniqueViolation(err)) {
        const existingEvent = await voiceRepository.findProviderEvent(
          providerName,
          event.externalEventId,
          integration.accountId
        );
        if (existingEvent && existingEvent.payloadHash !== payloadHash) {
          return NextResponse.json(
            {
              error: 'VOICE_DUPLICATE_EVENT',
              message: 'Payload hash mismatch on duplicate event ID',
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { accepted: true, duplicate: true },
          { status: 200 }
        );
      }
      throw err;
    }

    // 8. Update Call document using Call State Machine (storing transcriptReference, NOT raw text)
    if (event.status) {
      await voiceRepository.upsertCall(
        integration.accountId,
        event.externalCallId,
        {
          provider: providerName,
          direction: event.direction || 'outbound',
          status: event.status,
          agentId: event.externalAgentId,
          startedAt: event.startedAt,
          endedAt: event.endedAt,
          durationSeconds: event.durationSeconds,
          transcriptStatus: event.transcript ? 'available' : 'pending',
          ...(transcriptReference ? { transcriptReference } : {}),
          failureCode: event.failureCode,
          failureMessageSanitized: event.failureMessageSanitized,
        }
      );
    }

    return NextResponse.json(
      { accepted: true, eventId: eventDoc.$id },
      { status: 200 }
    );
  } catch (error) {
    const result = sanitizedError(error);
    console.warn('[voice-webhook]', {
      provider: providerName,
      code: result.error,
    });
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }
}
