/**
 * @fileoverview Shared 24-hour PM2.5 bar chart with best/avoid highlights and accessible table alternative.
 */

import React, { useState } from 'react';
import { evaluateAqi } from '@/calculators/aqi';
import { formatHour } from '@/utils/format';

/**
 * Render 24-hour PM2.5 vertical bars plus a keyboard-accessible toggleable data table.
 * @param {Object} props - Component props.
 * @param {Array<{hour: number, pm25: number}>} props.hourlyData - 24-hour PM2.5 readings.
 * @param {Object} props.windowInfo - Computed best & avoid window summary.
 * @param {'india_naqi'|'us_aqi'} props.aqiScale - Active AQI scale.
 * @param {string} [props.heading='24-Hour PM2.5 Forecast (µg/m³)'] - Section heading.
 * @returns {JSX.Element} Chart and table alternative UI.
 */
export default function Pm25HourlyChart({
  hourlyData = [],
  windowInfo,
  aqiScale,
  heading = '24-Hour PM2.5 Forecast (µg/m³)',
}) {
  const [showTable, setShowTable] = useState(false);
  const maxBarPm25 = Math.max(100, ...hourlyData.map((h) => h.pm25));

  const summaryText = `24-hour PM2.5 forecast. Best 3-hour ventilation window: ${formatHour(
    windowInfo.bestWindowStart
  )} to ${formatHour(windowInfo.bestWindowEnd)} averaging ${
    windowInfo.bestPm25
  } micrograms per cubic meter. Avoid outdoor exertion: ${formatHour(
    windowInfo.avoidWindowStart
  )} to ${formatHour(windowInfo.avoidWindowEnd)} averaging ${
    windowInfo.avoidPm25
  } micrograms per cubic meter.`;

  return (
    <div className="pm25-bars-section">
      <div className="pm25-bars-header">
        <h3>{heading}</h3>
        <div className="window-badges">
          <span className="badge badge--green">
            🌬️ Best: {formatHour(windowInfo.bestWindowStart)}–{formatHour(windowInfo.bestWindowEnd)}{' '}
            (~{windowInfo.bestPm25} µg/m³)
          </span>
          <span className="badge badge--red">
            🚨 Avoid: {formatHour(windowInfo.avoidWindowStart)}–
            {formatHour(windowInfo.avoidWindowEnd)} (~{windowInfo.avoidPm25} µg/m³)
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--sm no-print"
            aria-expanded={showTable}
            onClick={() => setShowTable((prev) => !prev)}
          >
            {showTable ? 'Hide hourly table' : 'Show hourly table'}
          </button>
        </div>
      </div>

      <p className="field-help">{summaryText}</p>

      <div className="pm25-bars-chart" role="img" aria-label={summaryText}>
        {hourlyData.map((entry) => {
          const heightPct = Math.max(6, Math.round((entry.pm25 / maxBarPm25) * 100));
          const barEval = evaluateAqi(entry.pm25, aqiScale);
          const isBest =
            entry.hour >= windowInfo.bestWindowStart && entry.hour < windowInfo.bestWindowStart + 3;
          const isAvoid =
            entry.hour >= windowInfo.avoidWindowStart &&
            entry.hour < windowInfo.avoidWindowStart + 3;

          return (
            <div
              key={entry.hour}
              className={`pm25-bar-col ${isBest ? 'is-best' : ''} ${isAvoid ? 'is-avoid' : ''}`}
              title={`${formatHour(entry.hour)}: ${entry.pm25} µg/m³ (${barEval.category.label})`}
            >
              <span className="pm25-bar-num">{Math.round(entry.pm25)}</span>
              <div className="pm25-bar-track">
                <div
                  className="pm25-bar-fill"
                  style={{ height: `${heightPct}%`, backgroundColor: barEval.category.color }}
                />
              </div>
              <span className="pm25-bar-hr">{entry.hour % 3 === 0 ? `${entry.hour}h` : ''}</span>
            </div>
          );
        })}
      </div>

      {showTable && (
        <div className="hourly-table-wrap">
          <table className="factor-table">
            <caption className="sr-only">Hourly PM2.5 forecast and AQI categories</caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">PM2.5 (µg/m³)</th>
                <th scope="col">AQI ({aqiScale === 'us_aqi' ? 'US' : 'India NAQI'})</th>
                <th scope="col">Category</th>
                <th scope="col">Window</th>
              </tr>
            </thead>
            <tbody>
              {hourlyData.map((entry) => {
                const ev = evaluateAqi(entry.pm25, aqiScale);
                const isBest =
                  entry.hour >= windowInfo.bestWindowStart &&
                  entry.hour < windowInfo.bestWindowStart + 3;
                const isAvoid =
                  entry.hour >= windowInfo.avoidWindowStart &&
                  entry.hour < windowInfo.avoidWindowStart + 3;
                return (
                  <tr key={entry.hour}>
                    <td>{formatHour(entry.hour)}</td>
                    <td>{entry.pm25}</td>
                    <td>{ev.aqi}</td>
                    <td>
                      <span aria-hidden="true">{ev.category.icon}</span> {ev.category.label}
                    </td>
                    <td>{isBest ? 'Best' : isAvoid ? 'Avoid' : 'Standard'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
