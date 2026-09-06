import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { findPlanBySlug } from '@/core/billing/plans';
import {
  createRazorpayOrder,
  getRazorpayCredentials,
} from '@/lib/billing/razorpay';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const context = await requireRole('owner');
    const body = (await request.json().catch(() => null)) as {
      planSlug?: string;
      planId?: string;
    } | null;
    const rawSlug = body?.planSlug || body?.planId;
    if (!rawSlug) {
      return NextResponse.json(
        { error: 'A planSlug or planId is required' },
        { status: 400 }
      );
    }

    const planSlug = String(rawSlug)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
    const targetPlan = await findPlanBySlug(planSlug);
    if (!targetPlan || !targetPlan.isActive) {
      return NextResponse.json(
        { error: `Plan '${planSlug}' not found or inactive` },
        { status: 404 }
      );
    }

    const setupQuery = await context.admin
      .from('platform_payments')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', context.accountId)
      .eq('status', 'captured')
      .eq('is_setup_fee_included', true);
    if (setupQuery.error) {
      throw new Error('Failed to verify setup-fee history');
    }

    const isFirstTime = (setupQuery.count ?? 0) === 0;
    const totalAmountInInr = isFirstTime
      ? targetPlan.setupFee + targetPlan.monthlyPrice
      : targetPlan.monthlyPrice;
    const amountInPaise = Math.round(totalAmountInInr * 100);
    const receipt = `rcpt_${context.accountId.slice(0, 8)}_${Date.now().toString().slice(-6)}`;

    const order = await createRazorpayOrder({
      amountInPaise,
      currency: targetPlan.currency,
      receipt,
      notes: {
        accountId: context.accountId,
        planSlug: targetPlan.slug,
        isFirstTime: String(isFirstTime),
        userId: context.userId,
      },
    });

    if (
      !order.id ||
      order.amount !== amountInPaise ||
      String(order.currency).toUpperCase() !== targetPlan.currency.toUpperCase()
    ) {
      throw new Error('Razorpay returned an invalid order');
    }

    const now = new Date().toISOString();
    const { error: persistenceError } = await context.admin
      .from('platform_payments')
      .insert({
        account_id: context.accountId,
        razorpay_order_id: order.id,
        razorpay_payment_id: null,
        amount: totalAmountInInr,
        currency: targetPlan.currency.toUpperCase(),
        plan_slug: targetPlan.slug,
        payment_type: isFirstTime
          ? 'setup_and_first_month'
          : 'monthly_renewal',
        status: 'pending',
        is_setup_fee_included: isFirstTime,
        setup_fee_amount: isFirstTime ? targetPlan.setupFee : 0,
        monthly_recurring_amount: targetPlan.monthlyPrice,
        period_start: now,
        period_end: now,
        metadata: { gateway: 'razorpay', receipt },
      });
    if (persistenceError) {
      console.error(
        '[billing/create-order] Failed to persist provider order:',
        persistenceError.message
      );
      throw new Error('Failed to persist Razorpay order');
    }

    const { keyId } = getRazorpayCredentials();
    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      receipt: order.receipt,
      plan: {
        id: targetPlan.id,
        name: targetPlan.name,
        slug: targetPlan.slug,
        setupFee: targetPlan.setupFee,
        monthlyPrice: targetPlan.monthlyPrice,
        isFirstTime,
        totalAmountInInr,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
