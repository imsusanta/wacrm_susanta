import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient as getSupabaseAdminClient } from '@/lib/supabase/server';
import { findPlanBySlug, resolvePlanRowId } from '@/core/billing/plans';
import { verifyRazorpayWebhookSignature } from '@/lib/billing/razorpay';
import {
  parseRazorpayWebhook,
  RazorpayWebhookPayloadError,
} from '@/lib/billing/razorpay-webhook';

function resultRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return resultRecord(value[0]);
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[Razorpay Webhook] Secret is not configured');
      return NextResponse.json(
        { error: 'Webhook service is unavailable' },
        { status: 503 }
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    if (!verifyRazorpayWebhookSignature(rawBody, signature, secret)) {
      console.warn('[Razorpay Webhook] Invalid signature rejected');
      return NextResponse.json({ error: 'Invalid webhook request' }, { status: 400 });
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(rawBody) as unknown;
    } catch {
      throw new RazorpayWebhookPayloadError('Malformed JSON');
    }
    const event = parseRazorpayWebhook(decoded);
    if (event.kind === 'ignored') {
      return NextResponse.json({ received: true, event: event.event });
    }

    const database = getSupabaseAdminClient();
    const { data: order, error: orderError } = await database
      .from('platform_payments')
      .select(
        'id, account_id, razorpay_order_id, razorpay_payment_id, amount, currency, plan_slug, payment_type, status, is_setup_fee_included, setup_fee_amount, monthly_recurring_amount, subscription_id'
      )
      .eq('razorpay_order_id', event.orderId)
      .maybeSingle();
    if (orderError) throw new Error('Payment order lookup failed');
    if (!order) {
      console.error('[Razorpay Webhook] Unknown provider order rejected');
      return NextResponse.json(
        { error: 'Payment order is not recognized' },
        { status: 409 }
      );
    }

    if (order.status === 'captured') {
      if (order.razorpay_payment_id !== event.paymentId) {
        console.error('[Razorpay Webhook] Captured order/payment mismatch');
        return NextResponse.json({ error: 'Payment conflict' }, { status: 409 });
      }
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    const expectedAmountPaise = Math.round(Number(order.amount) * 100);
    if (
      !Number.isSafeInteger(expectedAmountPaise) ||
      expectedAmountPaise <= 0 ||
      expectedAmountPaise !== event.amountPaise
    ) {
      console.error('[Razorpay Webhook] Provider amount mismatch rejected');
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }
    if (String(order.currency).toUpperCase() !== event.currency) {
      console.error('[Razorpay Webhook] Provider currency mismatch rejected');
      return NextResponse.json({ error: 'Payment currency mismatch' }, { status: 400 });
    }

    if (event.event === 'payment.failed') {
      const { data, error } = await database.rpc(
        'record_razorpay_failed_payment',
        {
          p_order_id: event.orderId,
          p_payment_id: event.paymentId,
          p_amount: event.amountPaise / 100,
          p_currency: event.currency,
          p_error_code: event.failureCode || 'PAYMENT_FAILED',
          p_error_reason: event.failureReason || 'Provider reported failure',
        }
      );
      const result = resultRecord(data);
      if (error || !result?.ok) {
        throw new Error('Failed to record provider payment failure');
      }
      return NextResponse.json({
        received: true,
        status: String(result.status || 'payment_failure_recorded'),
      });
    }

    const targetPlan = await findPlanBySlug(String(order.plan_slug || ''));
    if (!targetPlan || !targetPlan.isActive) {
      throw new Error('Persisted payment references an invalid plan');
    }
    const planRowId = await resolvePlanRowId(targetPlan);
    if (!planRowId) throw new Error('Plan catalog row is unavailable');

    const signatureDigest = createHash('sha256').update(signature).digest('hex');
    const { data, error } = await database.rpc(
      'apply_razorpay_captured_payment',
      {
        p_order_id: event.orderId,
        p_payment_id: event.paymentId,
        p_amount: event.amountPaise / 100,
        p_currency: event.currency,
        p_plan_id: planRowId,
        p_signature_digest: signatureDigest,
        p_event_type: event.event,
      }
    );
    const result = resultRecord(data);
    if (error || !result?.ok) {
      throw new Error('Failed to apply captured provider payment');
    }

    return NextResponse.json({
      received: true,
      status: result.duplicate ? 'already_processed' : 'subscription_activated',
      plan: targetPlan.slug,
      new_end_date: result.period_end,
    });
  } catch (error) {
    if (error instanceof RazorpayWebhookPayloadError) {
      console.warn('[Razorpay Webhook] Invalid payload rejected');
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }
    console.error('[Razorpay Webhook] Processing failed');
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
