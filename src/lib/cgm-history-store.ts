import { promises as fs } from 'fs';
import path from 'path';
import type { CgmReading } from '@/lib/dexcom';

const CSV_HEADER = 'Time,Glucose,Status,Trend\n';
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');
const TMP_DATA_DIR = '/tmp/bloodsuger-data';

function getDataDir() {
  if (process.env.CGM_DATA_DIR) return process.env.CGM_DATA_DIR;
  if (process.env.VERCEL || process.env.LAMBDA_TASK_ROOT) return TMP_DATA_DIR;
  return LOCAL_DATA_DIR;
}

function getCsvPath() {
  return path.join(getDataDir(), 'cgm-readings.csv');
}

type StoredRow = CgmReading;

function csvEscape(value: string | number | null | undefined) {
  const raw = value == null ? '' : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

async function ensureCsvFile() {
  const dataDir = getDataDir();
  const csvPath = getCsvPath();
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(csvPath);
  } catch {
    await fs.writeFile(csvPath, CSV_HEADER, 'utf8');
  }
}

function normalizeStoredReading(reading: CgmReading): StoredRow {
  const glucose =
    typeof reading.Glucose === 'string'
      ? Number.parseInt(reading.Glucose as unknown as string, 10)
      : reading.Glucose;

  return {
    Glucose: Number.isFinite(glucose) ? glucose : 0,
    Status:
      reading.Status === 'low' || reading.Status === 'high' || reading.Status === 'ok'
        ? reading.Status
        : 'ok',
    Trend: reading.Trend || 'steady',
    Time: typeof reading.Time === 'string' ? reading.Time.replace(' ', 'T') : new Date().toISOString(),
  };
}

export async function storeCgmReading(reading: CgmReading) {
  const normalized = normalizeStoredReading(reading);
  await ensureCsvFile();
  const csvPath = getCsvPath();

  const current = await fs.readFile(csvPath, 'utf8');
  const lines = current.trimEnd().split('\n');
  const lastLine = lines.length > 1 ? lines[lines.length - 1] : null;

  if (lastLine) {
    const [lastTime, lastGlucose] = parseCsvLine(lastLine);
    if (lastTime === normalized.Time && Number(lastGlucose) === normalized.Glucose) {
      return;
    }
  }

  const row = [
    csvEscape(normalized.Time),
    csvEscape(normalized.Glucose),
    csvEscape(normalized.Status),
    csvEscape(normalized.Trend),
  ].join(',') + '\n';

  await fs.appendFile(csvPath, row, 'utf8');
}

export async function getStoredCgmReadings(): Promise<StoredRow[]> {
  await ensureCsvFile();
  const content = await fs.readFile(getCsvPath(), 'utf8');
  const lines = content.split('\n').map((line) => line.trimEnd()).filter(Boolean);

  if (lines.length <= 1) return [];

  const rows: StoredRow[] = [];
  const seen = new Set<string>();

  for (const line of lines.slice(1)) {
    const [Time, Glucose, Status, Trend] = parseCsvLine(line);
    const glucoseNum = Number.parseInt(Glucose, 10);
    if (!Time || !Number.isFinite(glucoseNum)) continue;

    const key = `${Time}|${glucoseNum}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      Time: Time.includes('T') ? Time : Time.replace(' ', 'T'),
      Glucose: glucoseNum,
      Status: Status === 'low' || Status === 'high' || Status === 'ok' ? Status : 'ok',
      Trend: (Trend || 'steady') as CgmReading['Trend'],
    });
  }

  rows.sort((a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime());
  return rows;
}

export function getCgmCsvPath() {
  return getCsvPath();
}
