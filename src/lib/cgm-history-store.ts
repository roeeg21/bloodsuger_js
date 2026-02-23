import { promises as fs } from 'fs';
import path from 'path';
import type { CgmReading } from '@/lib/dexcom';

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'cgm-readings.csv');
const CSV_HEADER = 'Time,Glucose,Status,Trend\n';

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
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(CSV_PATH);
  } catch {
    await fs.writeFile(CSV_PATH, CSV_HEADER, 'utf8');
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

  const current = await fs.readFile(CSV_PATH, 'utf8');
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

  await fs.appendFile(CSV_PATH, row, 'utf8');
}

export async function getStoredCgmReadings(): Promise<StoredRow[]> {
  await ensureCsvFile();
  const content = await fs.readFile(CSV_PATH, 'utf8');
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
  return CSV_PATH;
}
