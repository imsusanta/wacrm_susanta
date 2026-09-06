import { describe, expect, it } from 'vitest';
import {
  parseRazorpayWebhook,
  RazorpayWebhookPayloadError,
} from '@/lib/billing/razorpay-webhook';

function captured(overrides: Record<string, unknown> = {}) {
  return {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_ABC123',
          order_id: 'order_XYZ789',
          amount: 499900,
          currency: 'INR',
          notes: { accountId: 'attacker-controlled' },
          ...overrides,
        },
      },
      order: { entity: { id: 'order_XYZ789' } },
    },
  };
}

describe('Razorpay webhook payload validation', () => {
  it('extracts only provider payment facts', () => {
    expect(parseRazorpayWebhook(captured())).toEqual({
      kind: 'payment',
      event: 'payment.captured',
      paymentId: 'pay_ABC123',
      orderId: 'order_XYZ789',
      amountPaise: 499900,
      currency: 'INR',
      failureCode: undefined,
      failureReason: undefined,
    });
  });

  it('rejects missing real payment identifiers', () => {
    expect(() => parseRazorpayWebhook(captured({ id: '' }))).toThrow(
      RazorpayWebhookPayloadError
    );
  });

  it('rejects non-integer and non-positive amounts', () => {
    expect(() => parseRazorpayWebhook(captured({ amount: 0 }))).toThrow(
      'Invalid payment amount'
    );
    expect(() => parseRazorpayWebhook(captured({ amount: 12.5 }))).toThrow(
      'Invalid payment amount'
    );
  });

  it('rejects conflicting payment and order entities', () => {
    const payload = captured();
    payload.payload.order.entity.id = 'order_DIFFERENT';
    expect(() => parseRazorpayWebhook(payload)).toThrow(
      'Payment/order mismatch'
    );
  });

  it('does not parse unrelated webhook shapes as payments', () => {
    expect(parseRazorpayWebhook({ event: 'refund.processed' })).toEqual({
      kind: 'ignored',
      event: 'refund.processed',
    });
  });
});
