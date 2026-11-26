/**
 * @fileoverview Pure calculator for identifying best ventilation and peak avoid 3-hour windows.
 */

const WINDOW_HOURS = 3;
const HOURS_PER_DAY = 24;
const DEFAULT_BEST_START = 5;
const DEFAULT_AVOID_START = 18;
const DEFAULT_WORST_HOUR = 19;

function findSlidingWindows(hourlyData) {
  let bestAvg = Infinity;
  let bestStart = 0;
  let worstAvg = -Infinity;
  let avoidStart = DEFAULT_AVOID_START;

  for (let start = 0; start < hourlyData.length; start++) {
    let sum = 0;
    for (let i = 0; i < WINDOW_HOURS; i++) {
      const idx = (start + i) % hourlyData.length;
      sum += Number(hourlyData[idx]?.pm25) || 0;
    }
    const avg = sum / WINDOW_HOURS;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = hourlyData[start].hour;
    }
    if (avg > worstAvg) {
      worstAvg = avg;
      avoidStart = hourlyData[start].hour;
    }
  }
  return { bestAvg, bestStart, worstAvg, avoidStart };
}

/**
 * Compute best 3-hour ventilation window and worst 3-hour avoid window from hourly PM2.5 data.
 * @param {Array<{hour: number, pm25: number}>} hourlyData - 24-hour PM2.5 readings.
 * @returns {Object} Best window, avoid window, worst hour, and 24-hour average.
 */
export function calculateAirWindow(hourlyData) {
  if (!Array.isArray(hourlyData) || hourlyData.length === 0) {
    return {
      bestWindowStart: DEFAULT_BEST_START,
      bestWindowEnd: DEFAULT_BEST_START + WINDOW_HOURS,
      bestPm25: 0,
      avoidWindowStart: DEFAULT_AVOID_START,
      avoidWindowEnd: DEFAULT_AVOID_START + WINDOW_HOURS,
      avoidPm25: 0,
      worstHour: DEFAULT_WORST_HOUR,
      worstPm25: 0,
      averagePm25: 0,
      hourlyData: [],
    };
  }

  const { bestAvg, bestStart, worstAvg, avoidStart } = findSlidingWindows(hourlyData);

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
    bestWindowEnd: (bestStart + WINDOW_HOURS) % HOURS_PER_DAY,
    bestPm25: Math.round(bestAvg),
    avoidWindowStart: avoidStart,
    avoidWindowEnd: (avoidStart + WINDOW_HOURS) % HOURS_PER_DAY,
    avoidPm25: Math.round(worstAvg),
    worstHour,
    worstPm25: Math.round(worstPm25),
    averagePm25: Math.round(totalPm25 / hourlyData.length),
    hourlyData,
  };
}
