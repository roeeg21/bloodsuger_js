import { NextResponse } from 'next/server';
import { getCgmHistoryFromFirstReading } from '@/lib/dexcom';

export async function GET() {
  try {
    const records = await getCgmHistoryFromFirstReading();
    return NextResponse.json({
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
