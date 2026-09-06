import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { contactsRepository } from '@/lib/db/repositories';
import { voiceRepository } from '@/lib/db/repositories';
import { getVoiceProvider } from '@/core/providers/voice/provider-factory';
import { VoiceProviderError } from '@/core/providers/voice/voice-provider.interface';
import { resolveTenantVoiceConfig } from '@/core/providers/voice/credential-resolver';

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
      return NextResponse.json(
        {
          error: 'VOICE_PROVIDER_REQUEST_FAILED',
          message: 'A valid Idempotency-Key header is required',
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      contactId?: unknown;
      leadId?: unknown;
      agentId?: unknown;
      toNumber?: unknown;
      provider?: unknown;
      context?: unknown;
    } | null;

    let targetPhone = typeof body?.toNumber === 'string' ? body.toNumber.trim() : '';
    let contactId = typeof body?.contactId === 'string' ? body.contactId : undefined;
    const leadId = typeof body?.leadId === 'string' ? body.leadId : undefined;
    const agentId = typeof body?.agentId === 'string' ? body.agentId : undefined;
    let providerName = (body?.provider as string) || '';

    const db = (await import('@/lib/db/server')).getAdminClient();

    // Resolve provider from request body OR from the selected calling agent's config
    if (agentId && !providerName) {
      const { data: agentRow } = await db
        .from('calling_agents')
        .select('tts_provider, stt_provider')
        .eq('id', agentId)
        .eq('account_id', ctx.accountId)
        .maybeSingle();
      providerName = agentRow?.tts_provider || agentRow?.stt_provider || 'elevenlabs';
    }
    if (!providerName) providerName = 'elevenlabs';

    // Validate provider telephony readiness
    if (providerName === 'sarvam') {
      // Sarvam Voice Agents Platform requires a configured app_id (stored as agent_id)
      const sarvamIntegration = await voiceRepository.findIntegration(
        ctx.accountId,
        'sarvam'
      );
      const hasPlatformConfig = sarvamIntegration?.agentId;
      if (!hasPlatformConfig) {
        return NextResponse.json(
          {
            error: 'SARVAM_PLATFORM_NOT_CONFIGURED',
            message:
              'Sarvam AI Voice Agents Platform is not fully configured for outbound calls. ' +
              'To make real phone calls: 1) Create a Voice Agent on platform.sarvam.ai, ' +
              '2) Provision a phone number on the Sarvam platform, ' +
              '3) Add your Sarvam Platform App ID in Calling → Settings. ' +
              'Currently only Sarvam STT/TTS is configured for AI voice processing.',
          },
          { status: 422 }
        );
      }
    }

    if (providerName !== 'elevenlabs' && providerName !== 'sarvam') {
      return NextResponse.json(
        {
          error: 'VOICE_OPERATION_UNSUPPORTED',
          message: `Outbound calling is not supported for provider "${providerName}". Configure ElevenLabs or Sarvam Voice Agents in Calling → Settings.`,
        },
        { status: 501 }
      );
    }


    // 1. Resolve Contact and/or Lead
    let contact: Awaited<ReturnType<typeof contactsRepository.getContact>> = null;
    if (contactId) {
      contact = await contactsRepository.getContact(ctx.accountId, contactId);
      if (contact && typeof contact.phone === 'string') {
        targetPhone = targetPhone || contact.phone;
      }
    } else if (leadId) {
      const { data: lead } = await db
        .from('leads')
        .select('id, contact_id, phone')
        .eq('id', leadId)
        .eq('account_id', ctx.accountId)
        .maybeSingle();
      if (lead) {
        if (lead.contact_id) {
          contactId = lead.contact_id;
          contact = await contactsRepository.getContact(ctx.accountId, lead.contact_id);
        }
        if (lead.phone) {
          targetPhone = targetPhone || lead.phone;
        }
      }
    }

    if (!targetPhone || targetPhone.replace(/[^0-9]/g, '').length < 8) {
      return NextResponse.json(
        {
          error: 'VOICE_PROVIDER_REQUEST_FAILED',
          message: 'A valid phone number (at least 8 digits) or valid contactId/leadId is required',
        },
        { status: 400 }
      );
    }

    if (contact && contact.consentStatus === 'opted_out') {
      return NextResponse.json(
        {
          error: 'VOICE_PROVIDER_REQUEST_FAILED',
          message: 'Contact has opted out of automated voice calls',
        },
        { status: 422 }
      );
    }

    // Resolve trusted tenant-scoped configuration server-side
    let tenantConfig;
    try {
      tenantConfig = await resolveTenantVoiceConfig(
        ctx.accountId,
        providerName as 'elevenlabs' | 'sarvam' | 'xai',
        { allowBootstrap: true }
      );
    } catch {
      const msg =
        providerName === 'sarvam'
          ? 'Sarvam Voice is not configured. Add your Sarvam Voice Agents credentials in Calling → Settings to enable outbound calls.'
          : 'ElevenLabs Voice is not configured. Add your ElevenLabs API Key, Webhook Secret, and Agent ID in Calling → Settings to enable outbound calls via ElevenLabs.';
      return NextResponse.json(
        {
          error: `${providerName.toUpperCase()}_NOT_CONFIGURED`,
          message: msg,
        },
        { status: 422 }
      );
    }
    const integration = await voiceRepository.findIntegration(
      ctx.accountId,
      providerName
    );

    // If a custom calling_agent was selected, check if it has elevenlabs_agent_id
    let remoteAgentId = integration?.agentId || tenantConfig?.agentId;
    if (agentId) {
      const { data: callingAgent } = await db
        .from('calling_agents')
        .select('elevenlabs_agent_id')
        .eq('id', agentId)
        .eq('account_id', ctx.accountId)
        .maybeSingle();
      if (callingAgent?.elevenlabs_agent_id && providerName === 'elevenlabs') {
        remoteAgentId = callingAgent.elevenlabs_agent_id;
      }
    }

    const fingerprint = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          accountId: ctx.accountId,
          contactId: contactId || null,
          targetPhone,
          agentId: agentId || remoteAgentId || null,
          provider: providerName,
          context: body?.context || null,
        })
      )
      .digest('hex');

    // 1. Check idempotency command
    const existingCommand = await voiceRepository.findCommand(
      ctx.accountId,
      idempotencyKey
    );

    if (existingCommand) {
      if (existingCommand.commandFingerprint !== fingerprint) {
        return NextResponse.json(
          {
            error: 'VOICE_PROVIDER_REQUEST_FAILED',
            message: 'Idempotency-Key was already used for a different command',
          },
          { status: 409 }
        );
      }

      if (existingCommand.externalCallId) {
        const existingCall = await voiceRepository.findCallByExternalId(
          ctx.accountId,
          existingCommand.externalCallId
        );
        if (existingCall) {
          return NextResponse.json({ call: existingCall }, { status: 200 });
        }
      }

      return NextResponse.json(
        {
          command: existingCommand,
          status: existingCommand.status,
          message: 'Outbound command is being processed',
        },
        { status: 200 }
      );
    }

    // Atomically claim idempotency key
    let command: Record<string, unknown>;
    try {
      command = await voiceRepository.createCommand({
        accountId: ctx.accountId,
        commandType: 'initiate_outbound_call',
        idempotencyKey,
        commandFingerprint: fingerprint,
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 409) {
        const raceCommand = await voiceRepository.findCommand(
          ctx.accountId,
          idempotencyKey
        );
        if (raceCommand) {
          if (raceCommand.commandFingerprint !== fingerprint) {
            return NextResponse.json(
              {
                error: 'VOICE_PROVIDER_REQUEST_FAILED',
                message:
                  'Idempotency-Key was already used for a different command',
              },
              { status: 409 }
            );
          }
          if (raceCommand.externalCallId) {
            const raceCall = await voiceRepository.findCallByExternalId(
              ctx.accountId,
              raceCommand.externalCallId
            );
            if (raceCall) {
              return NextResponse.json({ call: raceCall }, { status: 200 });
            }
          }
          return NextResponse.json(
            { command: raceCommand, status: raceCommand.status },
            { status: 200 }
          );
        }
      }
      throw err;
    }

    // 2. Persist ONE QUEUED call document
    const callDoc = await voiceRepository.createCall(ctx.accountId, {
      provider: providerName,
      direction: 'outbound',
      status: 'queued',
      externalCallId: `pending_${command.$id}`,
      fromMasked:
        integration?.phoneNumberMasked || tenantConfig?.phoneNumberId || '***',
      toMasked: targetPhone.slice(-4).padStart(targetPhone.length, '*'),
      fromPhone: integration?.phoneNumberMasked || tenantConfig?.phoneNumberId || null,
      toPhone: targetPhone,
      patientPhone: targetPhone,
      contactId: contact?.$id || contactId || null,
      leadId: leadId || null,
      callingAgentId: agentId || null,
      agentId: remoteAgentId,
    });

    // 3. Transition call document status to INITIATING
    await voiceRepository.updateCallStatus(
      ctx.accountId,
      callDoc.$id,
      'initiating'
    );

    // 4. Contact telephony provider using tenant provider instance
    const provider = getVoiceProvider(
      providerName as 'elevenlabs' | 'sarvam' | 'xai',
      tenantConfig ?? undefined
    );
    let outboundResult: { externalCallId: string };

    try {
      outboundResult = await provider.initiateOutboundCall({
        toNumber: targetPhone,
        agentId: remoteAgentId,
        phoneNumberId:
          integration?.providerPhoneNumberId || tenantConfig?.phoneNumberId,
        context:
          typeof body?.context === 'object' && body?.context
            ? (body.context as Record<string, unknown>)
            : undefined,
      });
    } catch (error) {
      // Mark local call FAILED on provider error
      const errorMessage =
        error instanceof VoiceProviderError
          ? error.message
          : 'VOICE_PROVIDER_REQUEST_FAILED';

      await voiceRepository.updateCallStatus(
        ctx.accountId,
        callDoc.$id,
        'failed',
        {
          failureCode:
            error instanceof VoiceProviderError
              ? error.code
              : 'VOICE_PROVIDER_REQUEST_FAILED',
          failureMessageSanitized: errorMessage.slice(0, 120),
        }
      );

      await voiceRepository.updateCommand(command.$id as string, {
        status: 'failed',
        lastErrorSanitized:
          error instanceof VoiceProviderError
            ? error.code
            : 'VOICE_PROVIDER_REQUEST_FAILED',
      });

      if (error instanceof VoiceProviderError) {
        return NextResponse.json(
          { error: error.code, message: error.message },
          { status: error.status }
        );
      }

      return NextResponse.json(
        { error: 'VOICE_PROVIDER_REQUEST_FAILED' },
        { status: 502 }
      );
    }

    // 5. Update that SAME Appwrite call document with externalCallId!
    try {
      const updatedCall = await voiceRepository.updateCallStatus(
        ctx.accountId,
        callDoc.$id,
        'initiating',
        {
          externalCallId: outboundResult.externalCallId,
          updatedAt: new Date().toISOString(),
        }
      );

      await voiceRepository.updateCommand(command.$id as string, {
        status: 'succeeded',
        externalCallId: outboundResult.externalCallId,
        resultReference: outboundResult.externalCallId,
      });

      return NextResponse.json({ call: updatedCall }, { status: 201 });
    } catch (err: unknown) {
      console.error(
        '[outbound-call] Call initiation succeeded but status update failed:',
        err
      );

      // Persist durable outbox reconciliation record
      try {
        await voiceRepository.createProviderEvent({
          accountId: ctx.accountId,
          provider: providerName,
          externalEventId: `reconcile:${outboundResult.externalCallId}`,
          eventType: 'call_reconciliation_needed',
          payloadHash: 'partial_persistence',
          rawPayloadReference: outboundResult.externalCallId,
          processingStatus: 'queued',
          processingAttempts: 0,
          receivedAt: new Date().toISOString(),
        });
      } catch {
        /* best effort reconciliation persistence */
      }

      // Return sanitized failure—NOT fake success or partialSuccess!
      return NextResponse.json(
        {
          error: 'VOICE_PROVIDER_PERSISTENCE_FAILED',
          message: 'Failed to record provider response; reconciliation queued',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
