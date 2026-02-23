'use server';

// Define the CgmReading type locally since it's not exported from server.mjs
export type CgmReading = {
  Glucose: number;
  Status: 'low' | 'ok' | 'high';
  Trend: 'rising quickly' | 'rising' | 'rising slightly' | 'steady' | 'falling slightly' | 'falling' | 'falling quickly';
  Time: string;
};

export type HistoricalCgmReading = CgmReading;

const DEFAULT_PROXY_CANDIDATES = ['http://localhost:3000', 'http://localhost:3011'] as const;
const DEFAULT_FALLBACK_APP_BASE = 'https://bloodsuger.vercel.app';

// A function to validate and cast the trend string.
function toCgmTrend(trend: string): CgmReading['Trend'] {
  const validTrends: CgmReading['Trend'][] = [
    'rising quickly',
    'rising',
    'steady',
    'falling',
    'falling quickly',
    'rising slightly',
    'falling slightly',
  ];

  if (!trend) {
    console.warn(`Received empty trend value. Defaulting to 'steady'.`);
    return 'steady';
  }

  const lowercasedTrend = trend.toLowerCase();

  // Direct match with our expected format
  if (validTrends.includes(lowercasedTrend as CgmReading['Trend'])) {
    return lowercasedTrend as CgmReading['Trend'];
  }
  
  // Handle Dexcom API trend formats (camelCase)
  switch (lowercasedTrend) {
    case 'doubleup':
      return 'rising quickly';
    case 'singleup':
      return 'rising';
    case 'fortyfiveup':
      return 'rising slightly';
    case 'flat':
      return 'steady';
    case 'fortyfivedown':
      return 'falling slightly';
    case 'singledown':
      return 'falling';
    case 'doubledown':
      return 'falling quickly';
    default:
      console.warn(`Unknown trend value received from API: "${trend}". Defaulting to 'steady'.`);
      return 'steady';
  }
}

function normalizeTimeString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return new Date().toISOString();
  }

  const trimmed = value.trim();
  if (trimmed.includes('T')) return trimmed;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace(' ', 'T');
  }

  return trimmed;
}

function toStatus(value: number, apiStatus: unknown): CgmReading['Status'] {
  const validStatuses: CgmReading['Status'][] = ['low', 'ok', 'high'];
  if (typeof apiStatus === 'string' && validStatuses.includes(apiStatus as CgmReading['Status'])) {
    return apiStatus as CgmReading['Status'];
  }

  if (value <= 60) return 'low';
  if (value >= 250) return 'high';
  return 'ok';
}

function parseReading(data: any): CgmReading {
  const glucoseValueRaw = data?.Glucose;
  const glucoseValue =
    typeof glucoseValueRaw === 'string' ? parseInt(glucoseValueRaw, 10) : glucoseValueRaw;

  if (typeof glucoseValue !== 'number' || Number.isNaN(glucoseValue)) {
    console.error('Failed to parse glucose value from API. Received data:', JSON.stringify(data));
    throw new Error('Invalid glucose value received from API.');
  }

  return {
    Glucose: glucoseValue,
    Status: toStatus(glucoseValue, data?.Status),
    Trend: toCgmTrend(data?.Trend),
    Time: normalizeTimeString(data?.Time),
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function getProxyCandidates() {
  const envPrimary = process.env.DEXCOM_PROXY_URL?.trim();
  const extras = (process.env.DEXCOM_PROXY_URLS || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  return Array.from(
    new Set([envPrimary, ...extras, ...DEFAULT_PROXY_CANDIDATES].filter(isNonEmptyString))
  );
}

function getFallbackBase() {
  return (process.env.FALLBACK_API_BASE || DEFAULT_FALLBACK_APP_BASE).replace(/\/+$/, '');
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromCandidates<T>({
  candidates,
  buildUrl,
  parse,
}: {
  candidates: string[];
  buildUrl: (base: string) => string;
  parse: (payload: any) => T;
}): Promise<T> {
  const errors: string[] = [];

  for (const base of candidates) {
    const url = buildUrl(base.replace(/\/+$/, ''));
    try {
      const payload = await fetchJsonWithTimeout(url);
      if (payload?.error) {
        throw new Error(`${url} returned error: ${payload.error}`);
      }
      return parse(payload);
    } catch (err: any) {
      errors.push(`${url} -> ${err?.message || String(err)}`);
    }
  }

  throw new Error(`All CGM sources failed. Tried: ${errors.join(' | ')}`);
}

async function fetchFromUrls<T>({
  urls,
  parse,
}: {
  urls: string[];
  parse: (payload: any) => T;
}): Promise<T> {
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const payload = await fetchJsonWithTimeout(url);
      if (payload?.error) {
        throw new Error(`${url} returned error: ${payload.error}`);
      }
      return parse(payload);
    } catch (err: any) {
      errors.push(`${url} -> ${err?.message || String(err)}`);
    }
  }

  throw new Error(`All CGM sources failed. Tried: ${errors.join(' | ')}`);
}

/**
 * Fetches the latest CGM reading from the Dexcom proxy API.
 * The proxy handles OAuth and returns a simplified format.
 */
export async function getLiveCgmReading(): Promise<CgmReading> {
  try {
    // Calculate time range (last 6 hours to now)
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    
    // Format dates as ISO strings without milliseconds
    const startDate = sixHoursAgo.toISOString().split('.')[0];
    const endDate = now.toISOString().split('.')[0];
    
    const proxyCandidates = getProxyCandidates();
    const fallbackBase = getFallbackBase();
    const latestUrls = [
      ...proxyCandidates.map((base) => `${base}/egvs?start=${startDate}&end=${endDate}`),
      `${fallbackBase}/api/cgm`,
      `${fallbackBase}/`,
    ];

    return await fetchFromUrls<CgmReading>({
      urls: latestUrls,
      parse: parseReading,
    });

  } catch (error: any) {
    console.error('Failed to fetch or process live CGM data:', error);
    // Re-throw the error so the API route can catch it and return a 500 status
    throw new Error(`Could not fetch live CGM data. ${error.message}`);
  }
}

async function getCgmRange(start: Date, end: Date): Promise<HistoricalCgmReading[]> {
  const startDate = start.toISOString().split('.')[0];
  const endDate = end.toISOString().split('.')[0];
  const proxyCandidates = getProxyCandidates();
  const fallbackBase = getFallbackBase();
  const historyUrls = [
    ...proxyCandidates.map((base) => `${base}/egvs/history?start=${startDate}&end=${endDate}`),
    `${fallbackBase}/api/cgm/history`,
    `${fallbackBase}/`,
  ];

  return fetchFromUrls<HistoricalCgmReading[]>({
    urls: historyUrls,
    parse: (data) => {
      const rawRecords = Array.isArray(data?.records)
        ? data.records
        : data && typeof data === 'object' && 'Glucose' in data
          ? [data]
          : [];

      return rawRecords
        .map((record: any) => {
          try {
            return parseReading(record);
          } catch {
            return null;
          }
        })
        .filter(
          (record: HistoricalCgmReading | null): record is HistoricalCgmReading => !!record
        );
    },
  });
}

/**
 * Fetches a historical CGM series from the earliest available reading found by scanning
 * backwards in weekly chunks until several consecutive empty chunks are encountered.
 */
export async function getCgmHistoryFromFirstReading(): Promise<HistoricalCgmReading[]> {
  const now = new Date();
  const chunkMs = 7 * 24 * 60 * 60 * 1000;
  const maxChunks = 520; // ~10 years
  const emptyChunkStopThreshold = 4; // stop after ~4 weeks of no data once data was found

  let chunkEnd = now;
  let emptyChunks = 0;
  const collected: HistoricalCgmReading[] = [];

  for (let i = 0; i < maxChunks; i += 1) {
    const chunkStart = new Date(chunkEnd.getTime() - chunkMs);
    const records = await getCgmRange(chunkStart, chunkEnd);

    if (records.length > 0) {
      collected.push(...records);
      emptyChunks = 0;
    } else if (collected.length > 0) {
      emptyChunks += 1;
      if (emptyChunks >= emptyChunkStopThreshold) {
        break;
      }
    }

    chunkEnd = new Date(chunkStart.getTime() - 1000);
  }

  const deduped = new Map<string, HistoricalCgmReading>();
  for (const record of collected) {
    if (record.Time) {
      deduped.set(record.Time, record);
    }
  }

  return Array.from(deduped.values()).sort(
    (a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime()
  );
}
