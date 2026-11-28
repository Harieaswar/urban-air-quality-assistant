/**
 * @fileoverview Shared 24-hour PM2.5 bar chart with best/avoid highlights and accessible table alternative.
 */

import React, { useState, useMemo } from 'react';
import { evaluateAqi } from '@/calculators/aqi';
import { BOUNDS, TIME_UNITS } from '@/constants';
import { formatHour } from '@/utils/format';

function isWithinWindow(hour, startHour) {
  return hour >= startHour && hour < startHour + TIME_UNITS.WINDOW_HOURS;
}

function resolveWindowTag(isBest, isAvoid) {
  if (isBest) return 'Best';
  if (isAvoid) return 'Avoid';
  return 'Standard';
}

function buildHourlyRows(hourlyData, windowInfo, aqiScale) {
  const maxBarPm25 = Math.max(BOUNDS.MIN_BAR_BASELINE, ...hourlyData.map((h) => h.pm25));
  return hourlyData.map((entry) => {
    const evaluation = evaluateAqi(entry.pm25, aqiScale);
    const isBest = isWithinWindow(entry.hour, windowInfo.bestWindowStart);
    const isAvoid = isWithinWindow(entry.hour, windowInfo.avoidWindowStart);
    const heightPct = Math.max(
      BOUNDS.MIN_BAR_PCT,
      Math.round((entry.pm25 / maxBarPm25) * BOUNDS.PERCENT_SCALE)
    );
    return {
      ...entry,
      evaluation,
      isBest,
      isAvoid,
      heightPct,
      windowTag: resolveWindowTag(isBest, isAvoid),
    };
  });
}

function HourlyBarsChart({ rows, summaryText }) {
  return (
    <div className="pm25-bars-chart" role="img" aria-label={summaryText}>
      {rows.map((row) => (
        <div
          key={row.hour}
          className={`pm25-bar-col ${row.isBest ? 'is-best' : ''} ${row.isAvoid ? 'is-avoid' : ''}`}
          title={`${formatHour(row.hour)}: ${row.pm25} µg/m³ (${row.evaluation.category.label})`}
        >
          <span className="pm25-bar-num">{Math.round(row.pm25)}</span>
          <div className="pm25-bar-track">
            <div
              className="pm25-bar-fill"
              style={{
                height: `${row.heightPct}%`,
                backgroundColor: row.evaluation.category.color,
              }}
            />
          </div>
          <span className="pm25-bar-hr">
            {row.hour % TIME_UNITS.WINDOW_HOURS === 0 ? `${row.hour}h` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function HourlyFallbackTable({ rows, aqiScale }) {
  return (
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
          {rows.map((row) => (
            <tr key={row.hour}>
              <td>{formatHour(row.hour)}</td>
              <td>{row.pm25}</td>
              <td>{row.evaluation.aqi}</td>
              <td>
                <span aria-hidden="true">{row.evaluation.category.icon}</span>{' '}
                {row.evaluation.category.label}
              </td>
              <td>{row.windowTag}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartHeader({ heading, windowInfo, showTable, onToggleTable }) {
  return (
    <div className="pm25-bars-header">
      <h3>{heading}</h3>
      <div className="window-badges">
        <span className="badge badge--green">
          🌬️ Best: {formatHour(windowInfo.bestWindowStart)}–{formatHour(windowInfo.bestWindowEnd)}{' '}
          (~
          {windowInfo.bestPm25} µg/m³)
        </span>
        <span className="badge badge--red">
          🚨 Avoid: {formatHour(windowInfo.avoidWindowStart)}–
          {formatHour(windowInfo.avoidWindowEnd)} (~{windowInfo.avoidPm25} µg/m³)
        </span>
        <button
          type="button"
          className="btn btn--ghost btn--sm no-print"
          aria-expanded={showTable}
          onClick={onToggleTable}
        >
          {showTable ? 'Hide hourly table' : 'Show hourly table'}
        </button>
      </div>
    </div>
  );
}

function buildSummaryText(windowInfo) {
  return `24-hour PM2.5 forecast. Best 3-hour ventilation window: ${formatHour(
    windowInfo.bestWindowStart
  )} to ${formatHour(windowInfo.bestWindowEnd)} averaging ${
    windowInfo.bestPm25
  } micrograms per cubic meter. Avoid outdoor exertion: ${formatHour(
    windowInfo.avoidWindowStart
  )} to ${formatHour(windowInfo.avoidWindowEnd)} averaging ${
    windowInfo.avoidPm25
  } micrograms per cubic meter.`;
}

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
  const rows = useMemo(
    () => buildHourlyRows(hourlyData, windowInfo, aqiScale),
    [hourlyData, windowInfo, aqiScale]
  );
  const summaryText = buildSummaryText(windowInfo);

  return (
    <div className="pm25-bars-section">
      <ChartHeader
        heading={heading}
        windowInfo={windowInfo}
        showTable={showTable}
        onToggleTable={() => setShowTable((prev) => !prev)}
      />
      <p className="field-help">{summaryText}</p>
      <HourlyBarsChart rows={rows} summaryText={summaryText} />
      {showTable && <HourlyFallbackTable rows={rows} aqiScale={aqiScale} />}
    </div>
  );
}
