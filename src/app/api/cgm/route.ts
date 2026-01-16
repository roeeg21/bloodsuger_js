import { NextResponse } from 'next/server';
import { generateCgmReading } from '@/lib/data';

export async function GET() {
  const cgmData = generateCgmReading();
  return NextResponse.json(cgmData);
}
