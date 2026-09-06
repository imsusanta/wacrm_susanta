'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Download,
  Megaphone,
  Eye,
  CheckCircle2,
  MousePointerClick,
  TrendingUp,
  IndianRupee,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { getBroadcastStatus } from '@/lib/broadcast-status';
import {
  REPORT_RANGE_PRESETS,
  buildReportCsv,
  rate,
  type CampaignRateSummary,
  type ReportRangePreset,
} from '@/lib/marketing/campaign-reports';
import type { Broadcast } from '@/types';

const RANGE_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  this_month: 'This Month',
  all: 'All Time',
};

interface ReportsResponse {
  data: {
    campaigns: Broadcast[];
    summary: CampaignRateSummary;
    range: { preset: string; from?: string | null; to?: string | null };
  };
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-muted-foreground text-xs font-medium">
            {label}
          </div>
          <div className="text-foreground text-xl font-bold tabular-nums">
            {value}
          </div>
          {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampaignReportsPage() {
  const router = useRouter();
  const { accountId } = useAuth();
  const [campaigns, setCampaigns] = useState<Broadcast[]>([]);
  const [summary, setSummary] = useState<CampaignRateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<ReportRangePreset | 'all'>('last_30_days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchReports = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ range });
      if (range === 'custom') {
        if (customFrom) params.set('from', customFrom);
        if (customTo) params.set('to', customTo);
      }
      const res = await fetch(`/api/broadcasts/reports?${params}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed');
      const payload = (await res.json()) as ReportsResponse;
      setCampaigns(payload.data.campaigns ?? []);
      setSummary(payload.data.summary ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [accountId, range, customFrom, customTo]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const csvHref = useMemo(() => {
    if (!campaigns.length) return null;
    return `data:text/csv;charset=utf-8,${encodeURIComponent(buildReportCsv(campaigns))}`;
  }, [campaigns]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">
            Campaign Reports
          </h1>
          <p className="text-muted-foreground text-sm">
            See how your WhatsApp campaigns are performing.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!csvHref}
          onClick={() => {
            if (!csvHref) return;
            const anchor = document.createElement('a');
            anchor.href = csvHref;
            anchor.download = `campaign-report-${new Date().toISOString().slice(0, 10)}.csv`;
            anchor.click();
            toast.success('Report exported as CSV.');
          }}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {/* Date range filter */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Date range filter"
      >
        {[...REPORT_RANGE_PRESETS.filter((r) => r !== 'custom'), 'all'].map(
          (preset) => (
            <Button
              key={preset}
              size="sm"
              variant={range === preset ? 'default' : 'outline'}
              onClick={() => setRange(preset as ReportRangePreset | 'all')}
              aria-pressed={range === preset}
            >
              {RANGE_LABELS[preset]}
            </Button>
          )
        )}
        <Button
          size="sm"
          variant={range === 'custom' ? 'default' : 'outline'}
          onClick={() => setRange('custom')}
          aria-pressed={range === 'custom'}
        >
          Custom Range
        </Button>
      </div>

      {range === 'custom' && (
        <div className="border-border flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <div>
            <label
              htmlFor="report-from"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              From
            </label>
            <Input
              id="report-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-44"
            />
          </div>
          <div>
            <label
              htmlFor="report-to"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              To
            </label>
            <Input
              id="report-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-44"
            />
          </div>
          <Button size="sm" onClick={() => void fetchReports()}>
            Apply
          </Button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <ErrorState
          title="Unable to load reports"
          message="We couldn't load your campaign performance right now."
          onRetry={() => void fetchReports()}
        />
      )}

      {/* Empty state */}
      {!loading && !error && campaigns.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No campaign data yet."
          description="Campaign performance will appear here after you send your first campaign."
          actionLabel="Create Campaign"
          onAction={() => {
            router.push('/broadcasts/new');
          }}
        />
      )}

      {/* Report content */}
      {!loading && !error && summary && campaigns.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard
              icon={Megaphone}
              label="Total Campaigns"
              value={summary.totalCampaigns.toLocaleString()}
              sub={`${summary.sent.toLocaleString()} sent`}
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Delivered"
              value={summary.delivered.toLocaleString()}
              sub={`${rate(summary.delivered, summary.sent)}% delivery`}
            />
            <SummaryCard
              icon={Eye}
              label="Read Rate"
              value={`${summary.readRate}%`}
              sub={`${summary.read.toLocaleString()} read`}
            />
            <SummaryCard
              icon={MousePointerClick}
              label="CTA Clicks (CTR)"
              value={summary.clicks.toLocaleString()}
              sub={`${summary.ctr}% CTR`}
            />
            <SummaryCard
              icon={TrendingUp}
              label="Conversions"
              value={summary.conversions.toLocaleString()}
              sub={`${summary.conversionRate}% rate`}
            />
            <SummaryCard
              icon={IndianRupee}
              label="Revenue"
              value={`₹${summary.attributedRevenue.toLocaleString()}`}
              sub="Attributed"
            />
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle className="text-base">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Read (%)</TableHead>
                    <TableHead className="text-right">Replies (%)</TableHead>
                    <TableHead className="text-right">Clicks (CTR)</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => {
                    const status = getBroadcastStatus(c.status);
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link
                            href={`/broadcasts/${c.id}`}
                            className="hover:text-primary text-sm font-medium underline-offset-4 hover:underline"
                          >
                            {c.name}
                          </Link>
                          <span
                            className={`mt-0.5 block w-fit rounded-full border px-1.5 py-px text-[11px] ${status.classes}`}
                          >
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(c.sent_count ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(c.delivered_count ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(c.read_count ?? 0).toLocaleString()}
                          <span className="text-muted-foreground ml-1 text-[11px]">
                            ({rate(c.read_count ?? 0, c.sent_count ?? 0)}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(c.replied_count ?? 0).toLocaleString()}
                          <span className="text-muted-foreground ml-1 text-[11px]">
                            (
                            {rate(c.replied_count ?? 0, c.delivered_count ?? 0)}
                            %)
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(c.clicks_count ?? 0).toLocaleString()}
                          <span className="text-muted-foreground ml-1 text-[11px]">
                            ({rate(c.clicks_count ?? 0, c.delivered_count ?? 0)}
                            %)
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-400 tabular-nums">
                          {(c.conversions_count ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-400 tabular-nums">
                          ₹{Number(c.attributed_revenue ?? 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {campaigns.map((c) => {
              const status = getBroadcastStatus(c.status);
              return (
                <Card key={c.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/broadcasts/${c.id}`}
                        className="text-sm font-semibold underline-offset-4 hover:underline"
                      >
                        {c.name}
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${status.classes}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <span>Sent: {(c.sent_count ?? 0).toLocaleString()}</span>
                      <span>
                        Delivered: {(c.delivered_count ?? 0).toLocaleString()}
                      </span>
                      <span>
                        Read: {(c.read_count ?? 0).toLocaleString()} (
                        {rate(c.read_count ?? 0, c.sent_count ?? 0)}%)
                      </span>
                      <span>
                        Clicks: {(c.clicks_count ?? 0).toLocaleString()} (
                        {rate(c.clicks_count ?? 0, c.delivered_count ?? 0)}%)
                      </span>
                      <span className="font-medium text-emerald-400">
                        Conversions:{' '}
                        {(c.conversions_count ?? 0).toLocaleString()}
                      </span>
                      <span className="font-semibold text-emerald-400">
                        Revenue: ₹
                        {Number(c.attributed_revenue ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
