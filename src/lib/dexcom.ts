import { type CgmReading, generateCgmReading } from '@/lib/data';

/**
 * MOCK IMPLEMENTATION
 * This function simulates a call to the Dexcom API.
 * It uses a mock data generator to return a simulated CGM reading.
 */
export async function getLiveCgmReading(): Promise<CgmReading> {
  console.warn('Using mock data because the Dexcom library failed to install. Please check your npm environment.');
  return generateCgmReading();
}
