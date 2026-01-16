import { NextResponse } from 'next/server';
import { generateCgmData } from '@/lib/data';

export async function GET() {
  const cgmData = generateCgmData();
  return NextResponse.json(cgmData);
}
