import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient } from '@/lib/db/server';
import { encrypt, decrypt } from '@/lib/whatsapp/encryption';

function maskKey(key?: string): string | null {
  if (!key || key.length < 4) return null;
  return `••••••••${key.slice(-4)}`;
}

export async function GET() {
  try {
    const ctx = await requireRole('viewer');
    const db = getAdminClient();

    const { data: integrations } = await db
      .from('voice_integrations')
      .select('*')
      .eq('account_id', ctx.accountId);

    const integrationsMap: Record<string, { configured: boolean; apiKeyMasked: string | null; status: string }> = {
      sarvam: {
        configured: Boolean(process.env.SARVAM_API_KEY),
        apiKeyMasked: maskKey(process.env.SARVAM_API_KEY),
        status: process.env.SARVAM_API_KEY ? 'configured' : 'not_configured',
      },
      elevenlabs: {
        configured: Boolean(process.env.ELEVENLABS_API_KEY),
        apiKeyMasked: maskKey(process.env.ELEVENLABS_API_KEY),
        status: process.env.ELEVENLABS_API_KEY ? 'configured' : 'not_configured',
      },
    };

    for (const item of integrations || []) {
      const provider = item.provider;
      if (!provider) continue;

      let hasApiKey = false;
      let rawKey: string | undefined;

      if (item.encrypted_credentials_reference) {
        try {
          const decrypted = JSON.parse(decrypt(item.encrypted_credentials_reference));
          if (decrypted?.apiKey) {
            hasApiKey = true;
            rawKey = decrypted.apiKey;
          }
        } catch {
          // Encrypted ref not readable
        }
      }

      integrationsMap[provider] = {
        configured: hasApiKey || item.status === 'configured',
        apiKeyMasked: maskKey(rawKey) || (hasApiKey ? '••••••••configured' : null),
        status: item.status || 'configured',
      };
    }

    return NextResponse.json({
      providers: integrationsMap,
      webhooks: {
        elevenlabs: '/api/webhooks/voice/elevenlabs',
        inbound: '/api/webhooks/voice/inbound',
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const db = getAdminClient();

    const body = await request.json();
    const { provider, apiKey, webhookSecret, agentId, phoneNumberId } = body;

    if (!provider || !['sarvam', 'elevenlabs'].includes(provider)) {
      return NextResponse.json(
        { error: 'INVALID_PROVIDER', message: "Provider must be 'sarvam' or 'elevenlabs'" },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: 'INVALID_API_KEY', message: 'API key is required' },
        { status: 400 }
      );
    }

    const payloadToEncrypt = {
      apiKey: apiKey.trim(),
      webhookSecret: webhookSecret?.trim() || (provider === 'elevenlabs' ? 'whsec_placeholder' : undefined),
      agentId: agentId?.trim() || undefined,
      phoneNumberId: phoneNumberId?.trim() || undefined,
    };

    // Encrypt server-side with AES-256-GCM
    const encryptedCredentialsReference = encrypt(JSON.stringify(payloadToEncrypt));

    const { data: upserted, error } = await db
      .from('voice_integrations')
      .upsert(
        {
          account_id: ctx.accountId,
          provider,
          encrypted_credentials_reference: encryptedCredentialsReference,
          agent_id: agentId?.trim() || null,
          provider_phone_number_id: phoneNumberId?.trim() || null,
          status: 'configured',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id,provider' }
      )
      .select('id, provider, status, updated_at')
      .single();

    if (error) {
      console.error('[voice/settings] Database error saving integration:', error);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: upserted.provider,
      status: upserted.status,
      apiKeyMasked: maskKey(apiKey),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[voice/settings] Unexpected error:', err);
    return NextResponse.json(
      { error: 'VOICE_SETTINGS_SAVE_FAILED', message },
      { status: 500 }
    );
  }
}
