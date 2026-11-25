/**
 * Air Window Calculator — SmogGuard
 * Finds the best 3-hour window (lowest PM2.5) and worst/avoid 3-hour window (highest PM2.5)
 * from the 24-hour PM2.5 forecast.
 */

/**
 * Calculate best ventilation/outdoor window and avoid hours from 24-hour PM2.5 data.
 * @param {Array<{hour: number, pm25: number}>} hourlyData
 */
export function calculateAirWindow(hourlyData) {
  if (!Array.isArray(hourlyData) || hourlyData.length === 0) {
    return {
      bestWindowStart: 5,
      bestWindowEnd: 8,
      bestPm25: 0,
      avoidWindowStart: 18,
      avoidWindowEnd: 21,
      worstHour: 19,
      worstPm25: 0,
      averagePm25: 0,
      hourlyData: [],
    };
  }

  let bestAvg = Infinity;
  let bestStart = 0;
  let worstAvg = -Infinity;
  let avoidStart = 18;

  for (let start = 0; start < hourlyData.length; start++) {
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      const idx = (start + i) % hourlyData.length;
      sum += Number(hourlyData[idx]?.pm25) || 0;
    }
    const avg = sum / 3;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = hourlyData[start].hour;
    }
    if (avg > worstAvg) {
      worstAvg = avg;
      avoidStart = hourlyData[start].hour;
    }
  }

  let worstHour = hourlyData[0].hour;
  let worstPm25 = -Infinity;
  let totalPm25 = 0;

  for (const entry of hourlyData) {
    const val = Number(entry.pm25) || 0;
    totalPm25 += val;
    if (val > worstPm25) {
      worstPm25 = val;
      worstHour = entry.hour;
    }
  }

  return {
    bestWindowStart: bestStart,
    bestWindowEnd: (bestStart + 3) % 24,
    bestPm25: Math.round(bestAvg),
    avoidWindowStart: avoidStart,
    avoidWindowEnd: (avoidStart + 3) % 24,
    avoidPm25: Math.round(worstAvg),
    worstHour,
    worstPm25: Math.round(worstPm25),
    averagePm25: Math.round(totalPm25 / hourlyData.length),
    hourlyData,
  };
}
