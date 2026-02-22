'use server';

// Define the CgmReading type locally since it's not exported from server.mjs
export type CgmReading = {
  Glucose: number;
  Status: 'low' | 'ok' | 'high';
  Trend: 'rising quickly' | 'rising' | 'rising slightly' | 'steady' | 'falling slightly' | 'falling' | 'falling quickly';
  Time: string;
};

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

  // Direct match with our expected format
  if (validTrends.includes(lowercasedTrend as CgmReading['Trend'])) {
    return lowercasedTrend as CgmReading['Trend'];
  }
  
  // Handle Dexcom API trend formats (camelCase)
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
 * Fetches the latest CGM reading from the Dexcom proxy API.
 * The proxy handles OAuth and returns a simplified format.
 */
export async function getLiveCgmReading(): Promise<CgmReading> {
  try {
    // Calculate time range (last 6 hours to now)
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    
    // Format dates as ISO strings without milliseconds
    const startDate = sixHoursAgo.toISOString().split('.')[0];
    const endDate = now.toISOString().split('.')[0];
    
    // Build URL with query parameters
    const baseUrl = process.env.DEXCOM_PROXY_URL || 'http://localhost:3000';
    const url = `${baseUrl}/egvs?start=${startDate}&end=${endDate}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // Disable caching for real-time data
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // The API might not return data if there's an error on its side
    if (data.error) {
      throw new Error(`API returned an error: ${data.error}`);
    }

    const glucoseValueRaw = data.Glucose;
    const glucoseValue = typeof glucoseValueRaw === 'string' 
      ? parseInt(glucoseValueRaw, 10) 
      : glucoseValueRaw;

    if (typeof glucoseValue !== 'number' || isNaN(glucoseValue)) {
      console.error('Failed to parse glucose value from API. Received data:', JSON.stringify(data));
      throw new Error('Invalid glucose value received from API.');
    }
    
    // Directly use the status from the API if it's valid, otherwise calculate it as a fallback
    let status: CgmReading['Status'];
    const validStatuses: CgmReading['Status'][] = ['low', 'ok', 'high'];
    if (data.Status && validStatuses.includes(data.Status)) {
      status = data.Status;
    } else {
      console.warn(`Invalid or missing status from API, calculating fallback. Received: ${data.Status}`);
      if (glucoseValue <= 60) {
        status = 'low';
      } else if (glucoseValue >= 250) {
        status = 'high';
      } else {
        status = 'ok';
      }
    }

    const reading: CgmReading = {
      Glucose: glucoseValue,
      Status: status,
      Trend: toCgmTrend(data.Trend),
      Time: data.Time || new Date().toISOString(),
    };
    
    return reading;

  } catch (error: any) {
    console.error('Failed to fetch or process live CGM data:', error);
    // Re-throw the error so the API route can catch it and return a 500 status
    throw new Error(`Could not fetch live CGM data. ${error.message}`);
  }
}