'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { CgmNav } from '@/components/cgm-nav';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type HistoryRecord = {
  Glucose: number;
  Status: 'low' | 'ok' | 'high';
  Trend: string;
  Time: string;
};

type RangeKey = '1d' | '7d' | '30d' | 'all';

const rangeOptions: { key: RangeKey; label: string; ms: number | null }[] = [
  { key: '1d', label: '1D', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '7D', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '30D', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'All', ms: null },
];

const chartConfig = {
  glucose: {
    label: 'Glucose',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

function downsample(records: HistoryRecord[], maxPoints = 1000) {
  if (records.length <= maxPoints) return records;

  const step = Math.ceil(records.length / maxPoints);
  return records.filter(
    (_, index) => index === 0 || index === records.length - 1 || index % step === 0
  );
}

function formatAxisTime(value: number, range: RangeKey) {
  const date = new Date(value);
  if (range === '1d' || range === '7d') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function GraphPage() {
  const [records, setRecords] = React.useState<HistoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [range, setRange] = React.useState<RangeKey>('all');
  const [lastSync, setLastSync] = React.useState<Date | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/cgm/history', { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load history');
        }

        const nextRecords = Array.isArray(payload.records) ? payload.records : [];
        if (!cancelled) {
          setRecords(nextRecords);
          setLastSync(new Date());
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Unable to load graph data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRecords = React.useMemo(() => {
    if (records.length === 0) return [] as HistoryRecord[];

    const selected = rangeOptions.find((item) => item.key === range);
    if (!selected || selected.ms === null) return records;

    const latestTs = new Date(records[records.length - 1].Time).getTime();
    const cutoff = latestTs - selected.ms;
    return records.filter((record) => new Date(record.Time).getTime() >= cutoff);
  }, [records, range]);

  const chartRecords = React.useMemo(() => {
    return downsample(filteredRecords).map((record) => ({
      ...record,
      timestamp: new Date(record.Time).getTime(),
      glucose: record.Glucose,
    }));
  }, [filteredRecords]);

  const stats = React.useMemo(() => {
    if (filteredRecords.length === 0) {
      return null;
    }

    const values = filteredRecords.map((record) => record.Glucose);
    const sum = values.reduce((acc, value) => acc + value, 0);
    const latest = filteredRecords[filteredRecords.length - 1];

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(sum / values.length),
      latest: latest.Glucose,
      firstTime: filteredRecords[0].Time,
      lastTime: latest.Time,
    };
  }, [filteredRecords]);

  return (
    <div className="w-full max-w-6xl space-y-6">
      <CgmNav />

      <section className="rounded-3xl border border-white/10 bg-card/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Glucose History Graph</h1>
            <p className="text-sm text-muted-foreground">
              First reading available from the API through today ({new Date().toLocaleDateString('en-US')}).
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lastSync ? `Last synced ${lastSync.toLocaleTimeString('en-US')}` : 'Syncing...'}
            </p>
          </div>

          <div className="inline-flex w-full gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:w-auto">
            {rangeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={[
                  'flex-1 rounded-xl border px-4 py-2 text-sm font-semibold backdrop-blur-xl transition-all duration-200 active:scale-[0.98] sm:flex-none',
                  range === option.key
                    ? 'border-white/15 bg-white/15 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_18px_rgba(0,0,0,0.26)]'
                    : 'border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground',
                ].join(' ')}
                aria-pressed={range === option.key}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Latest', value: stats ? `${stats.latest}` : '--' },
            { label: 'Average', value: stats ? `${stats.avg}` : '--' },
            { label: 'Min', value: stats ? `${stats.min}` : '--' },
            { label: 'Max', value: stats ? `${stats.max}` : '--' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {item.label}
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {loading ? '--' : item.value}
                <span className="ml-1 text-sm font-medium text-muted-foreground">mg/dL</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-background/40 p-3 sm:p-4">
          {loading ? (
            <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
              Loading glucose history...
            </div>
          ) : chartRecords.length === 0 ? (
            <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
              No readings found for this range.
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="h-[360px] w-full aspect-auto [&_.recharts-cartesian-axis-tick_text]:text-[11px]"
            >
              <AreaChart data={chartRecords} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <defs>
                  <linearGradient id="glucoseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-glucose)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-glucose)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <ReferenceLine y={60} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                <ReferenceLine y={250} stroke="hsl(var(--warning))" strokeDasharray="4 4" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tickFormatter={(value) => formatAxisTime(Number(value), range)}
                />
                <YAxis
                  width={42}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `${value}`}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { Time?: string } | undefined;
                        return row?.Time ? formatShortDateTime(row.Time) : 'Reading';
                      }}
                      formatter={(value) => (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Glucose</span>
                          <span className="font-semibold text-foreground">
                            {value} mg/dL
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="glucose"
                  stroke="var(--color-glucose)"
                  fill="url(#glucoseFill)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>
            Showing {filteredRecords.length.toLocaleString()} reading
            {filteredRecords.length === 1 ? '' : 's'}
            {chartRecords.length !== filteredRecords.length
              ? ` (plotted ${chartRecords.length.toLocaleString()} for performance)`
              : ''}
          </span>
          <span>
            {stats ? `${formatShortDateTime(stats.firstTime)} to ${formatShortDateTime(stats.lastTime)}` : '--'}
          </span>
        </div>
      </section>
    </div>
  );
}
