'use server';
import { type CgmReading } from '@/lib/data';

// A function to validate and cast the trend string.
function toCgmTrend(trend: string): CgmReading['Trend'] {
  const validTrends: CgmReading['Trend'][] = [
    'rising quickly',
    'rising',
    'steady',
    'falling',
    'falling quickly',
    'rising slightly',
    'falling slightly',
  ];

  if (!trend) {
    console.warn(`Received empty trend value. Defaulting to 'steady'.`);
    return 'steady';
  }

  const lowercasedTrend = trend.toLowerCase();

  // The pydexcom library returns user-friendly strings that match our enum.
  if (validTrends.includes(lowercasedTrend as CgmReading['Trend'])) {
    return lowercasedTrend as CgmReading['Trend'];
  }
  
  // Handle other possible trend formats, just in case.
  switch (lowercasedTrend) {
    case 'doubleup':
      return 'rising quickly';
    case 'singleup':
      return 'rising';
    case 'fortyfiveup':
        return 'rising slightly';
    case 'flat':
      return 'steady';
    case 'fortyfivedown':
        return 'falling slightly';
    case 'singledown':
      return 'falling';
    case 'doubledown':
      return 'falling quickly';
    default:
      console.warn(`Unknown trend value received from API: "${trend}". Defaulting to 'steady'.`);
      return 'steady';
  }
}


/**
 * Fetches the latest CGM reading from the external blood sugar API.
 */
export async function getLiveCgmReading(): Promise<CgmReading> {
  try {
    const response = await fetch('https://bloodsuger.onrender.com/');
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // The API might not return data if there's an error on its side.
    if (data.error) {
        throw new Error(`API returned an error: ${data.error}`);
    }

    const glucoseValueRaw = data.value;
    const glucoseValue = typeof glucoseValueRaw === 'string' 
      ? parseInt(glucoseValueRaw, 10) 
      : glucoseValueRaw;

    if (typeof glucoseValue !== 'number' || isNaN(glucoseValue)) {
      console.error('Failed to parse glucose value from API. Received data:', JSON.stringify(data));
      throw new Error('Invalid glucose value received from API.');
    }

    let status: CgmReading['Status'];
    if (glucoseValue <= 60) {
      status = 'low';
    } else if (glucoseValue >= 250) {
      status = 'high';
    } else {
      status = 'ok';
    }

    const reading: CgmReading = {
      Glucose: glucoseValue,
      Status: status,
      Trend: toCgmTrend(data.trend),
      Time: data.time || new Date().toISOString(),
    };
    
    return reading;

  } catch (error: any) {
    console.error('Failed to fetch or process live CGM data:', error);
    // Re-throw the error so the API route can catch it and return a 500 status.
    throw new Error(`Could not fetch live CGM data. ${error.message}`);
  }
}
