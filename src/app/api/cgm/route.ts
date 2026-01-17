import { NextResponse } from 'next/server';
import { getLiveCgmReading } from '@/lib/dexcom';

export async function GET() {
  try {
    const cgmData = await getLiveCgmReading();
    return NextResponse.json(cgmData);
  } catch (err: any) {
    console.error('Dexcom API error:', err);
    // Return a structured error that the frontend can display
    return NextResponse.json({ error: `Failed to fetch from Dexcom: ${err.message}` }, { status: 500 });
  }
}
