/**
 * Marketing — Campaign report helpers.
 *
 * Pure functions so aggregation and date-range parsing are unit-testable
 * without a database. The API route feeds stored broadcast rows in; no
 * metric here is fabricated — everything derives from trigger-maintained
 * counters on `broadcasts`.
 */

import type { Broadcast } from '@/types';

export const REPORT_RANGE_PRESETS = [
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'this_month',
  'custom',
] as const;

export type ReportRangePreset = (typeof REPORT_RANGE_PRESETS)[number];

export interface ReportDateRange {
  from: Date;
  to: Date;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * Parses the UI range presets into an absolute UTC window.
 * Returns null for invalid custom ranges so callers can reject them.
 */
export function resolveReportRange(
  preset: string,
  customFrom?: string | null,
  customTo?: string | null
): ReportDateRange | null {
  const now = new Date();

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'last_7_days': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfDay(now) };
    }
    case 'last_30_days': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 29);
      return { from, to: endOfDay(now) };
    }
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case 'custom': {
      if (!customFrom || !customTo) return null;
      const from = new Date(customFrom);
      const to = new Date(customTo);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return null;
      }
      if (from > to) return null;
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    default:
      return null;
  }
}

export interface CampaignRateSummary {
  totalCampaigns: number;
  sent: number;
  delivered: number;
  read: number;
  replies: number;
  failed: number;
  recipients: number;
  clicks: number;
  conversions: number;
  attributedRevenue: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  ctr: number;
  conversionRate: number;
}

/** Safe percentage with one decimal. */
export function rate(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * Aggregates campaign performance over an already-filtered set of
 * broadcasts. Delivery/read rates are relative to messages actually
 * sent; reply and CTR rates relative to delivered.
 */
export function aggregateBroadcasts(
  broadcasts: Broadcast[]
): CampaignRateSummary {
  const totals = broadcasts.reduce(
    (acc, b) => ({
      sent: acc.sent + (b.sent_count ?? 0),
      delivered: acc.delivered + (b.delivered_count ?? 0),
      read: acc.read + (b.read_count ?? 0),
      replies: acc.replies + (b.replied_count ?? 0),
      failed: acc.failed + (b.failed_count ?? 0),
      recipients: acc.recipients + (b.total_recipients ?? 0),
      clicks: acc.clicks + (b.clicks_count ?? 0),
      conversions: acc.conversions + (b.conversions_count ?? 0),
      attributedRevenue:
        acc.attributedRevenue + Number(b.attributed_revenue ?? 0),
    }),
    {
      sent: 0,
      delivered: 0,
      read: 0,
      replies: 0,
      failed: 0,
      recipients: 0,
      clicks: 0,
      conversions: 0,
      attributedRevenue: 0,
    }
  );

  return {
    totalCampaigns: broadcasts.length,
    ...totals,
    deliveryRate: rate(totals.delivered, totals.sent),
    readRate: rate(totals.read, totals.sent),
    replyRate: rate(totals.replies, totals.delivered),
    ctr: rate(totals.clicks, totals.delivered),
    conversionRate: rate(totals.conversions, totals.delivered),
  };
}

/** Client-safe CSV export of the report table (formula-injection safe). */
export function buildReportCsv(broadcasts: Broadcast[]): string {
  const header =
    'Campaign,Status,Sent,Delivered,Read,Read Rate %,Replies,Reply Rate %,Clicks,CTR %,Conversions,Revenue,Created';
  const rows = broadcasts.map((b) => {
    const sent = b.sent_count ?? 0;
    const delivered = b.delivered_count ?? 0;
    const read = b.read_count ?? 0;
    const replies = b.replied_count ?? 0;
    const clicks = b.clicks_count ?? 0;
    const conversions = b.conversions_count ?? 0;
    const revenue = b.attributed_revenue ?? 0;

    return [
      b.name,
      b.status,
      sent,
      delivered,
      read,
      rate(read, sent),
      replies,
      rate(replies, delivered),
      clicks,
      rate(clicks, delivered),
      conversions,
      revenue,
      b.created_at,
    ]
      .map(csvEscape)
      .join(',');
  });
  return [header, ...rows].join('\n');
}

function csvEscape(value: unknown): string {
  let str = String(value ?? '').trim();
  // Prevent CSV formula injection (CWE-1236).
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}
