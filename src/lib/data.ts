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
