import { type CgmReading, generateCgmReading } from '@/lib/data';

/**
 * NOTE: This function currently returns mock data due to persistent issues
 * with installing a real Dexcom API package. Once the package issue is resolved,
 * this can be replaced with a live API call.
 */
export async function getLiveCgmReading(): Promise<CgmReading> {
  // The application is currently configured to use mock data.
  return generateCgmReading();
}
