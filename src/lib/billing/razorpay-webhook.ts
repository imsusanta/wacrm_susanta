type JsonRecord = Record<string, unknown>;

export class RazorpayWebhookPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RazorpayWebhookPayloadError';
  }
}

export type ParsedRazorpayWebhook =
  | { kind: 'ignored'; event: string }
  | {
      kind: 'payment';
      event: 'payment.captured' | 'order.paid' | 'payment.failed';
      paymentId: string;
      orderId: string;
      amountPaise: number;
      currency: string;
      failureCode?: string;
      failureReason?: string;
    };

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function child(parent: JsonRecord | null, key: string): JsonRecord | null {
  return record(parent?.[key]);
}

function boundedString(value: unknown, max = 255): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function requiredProviderId(
  value: unknown,
  label: string,
  prefix: 'pay_' | 'order_'
): string {
  const id = boundedString(value, 100);
  if (!id || !new RegExp(`^${prefix}[A-Za-z0-9]+$`).test(id)) {
    throw new RazorpayWebhookPayloadError(`Invalid ${label}`);
  }
  return id;
}

export function parseRazorpayWebhook(payload: unknown): ParsedRazorpayWebhook {
  const root = record(payload);
  const event = boundedString(root?.event, 80);
  if (!root || !event) {
    throw new RazorpayWebhookPayloadError('Invalid webhook envelope');
  }

  if (
    event !== 'payment.captured' &&
    event !== 'order.paid' &&
    event !== 'payment.failed'
  ) {
    return { kind: 'ignored', event };
  }

  const payloadRecord = child(root, 'payload');
  const payment = child(child(payloadRecord, 'payment'), 'entity');
  const order = child(child(payloadRecord, 'order'), 'entity');
  if (!payment) {
    throw new RazorpayWebhookPayloadError('Missing payment entity');
  }

  const paymentId = requiredProviderId(payment.id, 'payment id', 'pay_');
  const orderId = requiredProviderId(payment.order_id, 'order id', 'order_');
  const payloadOrderId = boundedString(order?.id, 100);
  if (payloadOrderId && payloadOrderId !== orderId) {
    throw new RazorpayWebhookPayloadError('Payment/order mismatch');
  }

  const amountPaise = Number(payment.amount);
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new RazorpayWebhookPayloadError('Invalid payment amount');
  }

  const currency = boundedString(payment.currency, 3)?.toUpperCase();
  if (!currency || !/^[A-Z]{3}$/.test(currency)) {
    throw new RazorpayWebhookPayloadError('Invalid payment currency');
  }

  return {
    kind: 'payment',
    event,
    paymentId,
    orderId,
    amountPaise,
    currency,
    failureCode: boundedString(payment.error_code, 100),
    failureReason: boundedString(payment.error_description, 255),
  };
}
