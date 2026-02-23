import { NextResponse } from 'next/server';
import { getStoredCgmReadings, getCgmCsvPath } from '@/lib/cgm-history-store';

export async function GET() {
  try {
    const records = await getStoredCgmReadings();
    return NextResponse.json({
      source: 'csv',
      csvPath: getCgmCsvPath(),
      count: records.length,
      firstReading: records[0]?.Time ?? null,
      lastReading: records[records.length - 1]?.Time ?? null,
      records,
    });
  } catch (err: any) {
    console.error('CGM history API error:', err);
    return NextResponse.json(
      { error: `Failed to fetch CGM history: ${err.message}` },
      { status: 500 }
    );
  }
}
