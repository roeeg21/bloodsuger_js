export type CgmReading = {
  Glucose: number;
  Status: 'low' | 'ok' | 'high';
  Trend:
    | 'rising quickly'
    | 'rising'
    | 'steady'
    | 'falling'
    | 'falling quickly'
    | 'rising slightly'
    | 'falling slightly';
  Time: string;
};

const trends: CgmReading['Trend'][] = [
  'rising quickly',
  'rising',
  'steady',
  'falling',
  'falling quickly',
  'rising slightly',
  'falling slightly',
];

// Generates a single mock CGM reading
export function generateCgmReading(): CgmReading {
  const value = Math.floor(Math.random() * (260 - 50 + 1)) + 50; // Random value between 50 and 260

  let status: CgmReading['Status'];
  if (value < 60) {
    status = 'low';
  } else if (value > 250) {
    status = 'high';
  } else {
    status = 'ok';
  }

  const trend = trends[Math.floor(Math.random() * trends.length)];
  const time = new Date().toISOString();

  return {
    Glucose: value,
    Status: status,
    Trend: trend,
    Time: time,
  };
}

export type CgmDataPoint = {
  time: string;
  value: number;
};

// Generates mock CGM data for the last 24 hours
export function generateCgmData(): CgmDataPoint[] {
  const data: CgmDataPoint[] = [];
  const now = new Date();
  let currentValue = 120;

  for (let i = 24 * 12; i >= 0; i--) {
    // 12 readings per hour (every 5 minutes)
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
    const hours = timestamp.getHours();
    
    // Simulate some daily patterns
    let change = (Math.random() - 0.5) * 5; // Base random fluctuation
    
    // Higher after typical meal times
    if ([8, 13, 19].includes(hours)) {
      change += Math.random() * 5;
    }
    
    // Lower during deep sleep
    if (hours >= 2 && hours <= 5) {
      change -= Math.random() * 3;
    }

    currentValue += change;

    // Keep values in a reasonable range
    if (currentValue < 60) currentValue = 60 + Math.random() * 5;
    if (currentValue > 250) currentValue = 250 - Math.random() * 10;
    
    data.push({
      time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(currentValue),
    });
  }

  return data;
}

export function getLatestCgmValue(): number {
    const data = generateCgmData();
    return data[data.length - 1].value;
}
