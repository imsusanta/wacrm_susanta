import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient } from '@/lib/supabase/server';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

export async function POST(request: NextRequest) {
  try {
    const context = await requireRole('viewer');
    const db = getAdminClient();

    const body = await request.json();
    const { endpoint, keys } = body ?? {};

    if (
      !endpoint ||
      typeof endpoint !== 'string' ||
      !keys?.p256dh ||
      !keys?.auth
    ) {
      return NextResponse.json(
        { error: 'INVALID_SUBSCRIPTION_PAYLOAD' },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    const userAgent = request.headers.get('user-agent') || null;

    const { error } = await db.from('push_subscriptions').upsert(
      {
        account_id: context.accountId,
        user_id: context.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('[PushSubscribe] Upsert error:', error.message);
      return NextResponse.json(
        { error: 'FAILED_TO_SAVE_SUBSCRIPTION' },
        { status: 500, headers: PRIVATE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Push notifications enabled.' },
      { status: 200, headers: PRIVATE_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await requireRole('viewer');
    const db = getAdminClient();

    const body = await request.json();
    const { endpoint } = body ?? {};

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'ENDPOINT_REQUIRED' },
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    const { error } = await db
      .from('push_subscriptions')
      .delete()
      .eq('account_id', context.accountId)
      .eq('endpoint', endpoint);

    if (error) {
      return NextResponse.json(
        { error: 'FAILED_TO_DELETE_SUBSCRIPTION' },
        { status: 500, headers: PRIVATE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Unsubscribed from push notifications.' },
      { status: 200, headers: PRIVATE_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
