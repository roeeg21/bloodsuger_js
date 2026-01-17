import { NextResponse } from 'next/server';
import { getLiveCgmReading } from '@/lib/dexcom';

export async function GET() {
  // To use mock data for development, you can uncomment the lines below
  // and comment out the try/catch block.
  // import { generateCgmReading } from '@/lib/data';
  // return NextResponse.json(generateCgmReading());

  try {
    const cgmData = await getLiveCgmReading();
    return NextResponse.json(cgmData);
  } catch (err: any) {
    console.error('Dexcom API error:', err);
    // Return a structured error that the frontend can display
    return NextResponse.json({ error: `Failed to fetch from Dexcom: ${err.message}` }, { status: 500 });
  }
}
