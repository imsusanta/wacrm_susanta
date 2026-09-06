import { describe, expect, it } from 'vitest';
import {
  aggregateBroadcasts,
  buildReportCsv,
  rate,
  resolveReportRange,
} from './campaign-reports';
import type { Broadcast } from '@/types';

function makeBroadcast(overrides: Partial<Broadcast> = {}): Broadcast {
  return {
    id: 'b1',
    user_id: 'u1',
    name: 'Campaign One',
    template_name: 'hello_world',
    template_language: 'en_US',
    status: 'sent',
    total_recipients: 10,
    sent_count: 10,
    delivered_count: 8,
    read_count: 5,
    replied_count: 4,
    failed_count: 0,
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('rate', () => {
  it('returns 0 for empty denominators instead of NaN', () => {
    expect(rate(5, 0)).toBe(0);
    expect(rate(5, -3)).toBe(0);
  });

  it('rounds to one decimal', () => {
    expect(rate(1, 3)).toBe(33.3);
    expect(rate(2, 3)).toBe(66.7);
    expect(rate(1, 2)).toBe(50);
  });
});

describe('resolveReportRange', () => {
  it('resolves "today" as the full local day', () => {
    const { from, to } = resolveReportRange('today')!;
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(to.getHours()).toBe(23);
    expect(to.getDate()).toBe(new Date().getDate());
  });

  it('resolves "yesterday" as the previous day', () => {
    const { from } = resolveReportRange('yesterday')!;
    const expected = new Date();
    expected.setDate(expected.getDate() - 1);
    expect(from.getDate()).toBe(expected.getDate());
    expect(from.getMonth()).toBe(expected.getMonth());
  });

  it('resolves "last_7_days" as six days back through now', () => {
    const { from, to } = resolveReportRange('last_7_days')!;
    expect(
      Math.round((to.getTime() - from.getTime()) / 86_400_000)
    ).toBeCloseTo(6.99, 1);
  });

  it('accepts valid custom ranges', () => {
    const { from, to } = resolveReportRange(
      'custom',
      '2026-08-01T00:00:00.000Z',
      '2026-08-07T00:00:00.000Z'
    )!;
    expect(to.getTime()).toBeGreaterThan(from.getTime());
  });

  it('rejects invalid custom ranges', () => {
    expect(resolveReportRange('custom', '', '')).toBeNull();
    expect(resolveReportRange('custom', 'garbage', '2026-08-01')).toBeNull();
    expect(resolveReportRange('custom', '2026-08-07', '2026-08-01')).toBeNull();
  });

  it('rejects unknown presets', () => {
    expect(resolveReportRange('all_time')).toBeNull();
  });
});

describe('aggregateBroadcasts', () => {
  it('sums counters and computes rates against the right bases', () => {
    const summary = aggregateBroadcasts([
      makeBroadcast(),
      makeBroadcast({
        id: 'b2',
        total_recipients: 20,
        sent_count: 18,
        delivered_count: 12,
        read_count: 6,
        replied_count: 3,
        failed_count: 2,
        clicks_count: 4,
        conversions_count: 2,
        attributed_revenue: 3500,
      }),
    ]);

    expect(summary.totalCampaigns).toBe(2);
    expect(summary.sent).toBe(28);
    expect(summary.delivered).toBe(20);
    expect(summary.read).toBe(11);
    expect(summary.replies).toBe(7);
    expect(summary.failed).toBe(2);
    expect(summary.recipients).toBe(30);
    expect(summary.clicks).toBe(4);
    expect(summary.conversions).toBe(2);
    expect(summary.attributedRevenue).toBe(3500);

    expect(summary.deliveryRate).toBe(rate(20, 28));
    expect(summary.readRate).toBe(rate(11, 28));
    expect(summary.replyRate).toBe(rate(7, 20)); // vs delivered
    expect(summary.ctr).toBe(rate(4, 20)); // clicks vs delivered
    expect(summary.conversionRate).toBe(rate(2, 20)); // conversions vs delivered
  });
});

describe('buildReportCsv', () => {
  it('renders a header plus one row per broadcast with CTR and revenue', () => {
    const csv = buildReportCsv([
      makeBroadcast({
        clicks_count: 2,
        conversions_count: 1,
        attributed_revenue: 1500,
      }),
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain(
      'Campaign,Status,Sent,Delivered,Read,Read Rate %,Replies,Reply Rate %,Clicks,CTR %,Conversions,Revenue,Created'
    );
    expect(lines[1]).toContain('"Campaign One","sent","10","8"');
    expect(lines[1]).toContain('"2"'); // clicks
    expect(lines[1]).toContain('"1500"'); // revenue
  });

  it('neutralizes CSV formula injection and escapes quotes', () => {
    const csv = buildReportCsv([
      makeBroadcast({ name: '=HYPERLINK("http://evil")' }),
    ]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('""http://evil""');
  });
});
