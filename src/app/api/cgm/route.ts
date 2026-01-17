import { NextResponse } from 'next/server';
import { generateCgmReading, type CgmReading } from '@/lib/data';

export async function GET() {
  // This endpoint currently returns mock data.
  // To connect to a real Dexcom feed, you would replace the call
  // to generateCgmReading() with a call to the Dexcom API.
  try {
    const cgmData: CgmReading = generateCgmReading();
    return NextResponse.json(cgmData);
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: `Failed to generate mock data: ${err.message}` }, { status: 500 });
  }
}
