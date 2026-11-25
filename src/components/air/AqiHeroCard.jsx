import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import {
  evaluateAqi,
  aqiToApproxPm25,
  calibrateHourlyPm25,
} from '@/calculators/aqi';
import { calculateAirWindow } from '@/calculators/airWindow';
import { formatHour, formatTimestamp } from '@/utils/format';
import { validateRange } from '@/utils/validate';

/**
 * AQI Hero Card — SmogGuard
 * Displays:
 * - Current AQI + category (icon, text, color) with India NAQI / US AQI toggle
 * - "Times the WHO guideline" ratio
 * - 24-hour PM2.5 bar chart with best & avoid hours highlighted
 * - Source, rounded coordinates, and timestamp
 * - "Calibrate with monitor" & "Sample severe-smog demo" controls
 */
export default function AqiHeroCard({
  airState,
  aqiScale,
  onToggleScale,
  onCalibrate,
  onClearCalibration,
  onLoadSampleDemo,
  onRefreshLive,
  onApplyManualPm25,
}) {
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [calMode, setCalMode] = useState(airState.calibration?.mode || 'pm25');
  const [calInput, setCalInput] = useState(
    airState.calibration?.value != null ? String(airState.calibration.value) : ''
  );
  const [calError, setCalError] = useState('');

  const airData = airState.data;
  const calibration = airState.calibration;

  const rawHourly = airData?.hourlyData || [];
  const currentHour = new Date().getHours();
  const calibratedPm25 =
    calibration?.enabled && calibration?.value != null
      ? calibration.mode === 'aqi'
        ? aqiToApproxPm25(calibration.value, aqiScale)
        : Number(calibration.value)
      : null;

  const effectiveHourly =
    calibratedPm25 != null
      ? calibrateHourlyPm25(rawHourly, calibratedPm25, currentHour)
      : rawHourly;

  const effectiveCurrentPm25 =
    calibratedPm25 != null
      ? calibratedPm25
      : airData?.currentPm25 ?? effectiveHourly[0]?.pm25 ?? 0;

  const metrics = evaluateAqi(effectiveCurrentPm25, aqiScale);
  const windowInfo = calculateAirWindow(effectiveHourly);
  const maxBarPm25 = Math.max(100, ...effectiveHourly.map((h) => h.pm25));

  const handleApplyCalibrate = (e) => {
    e.preventDefault();
    const maxAllowed = calMode === 'aqi' ? 500 : 1000;
    const label = calMode === 'aqi' ? 'Monitor AQI' : 'Monitor PM2.5 (µg/m³)';
    const check = validateRange(calInput, 0, maxAllowed, label);
    if (!check.valid) {
      setCalError(check.error);
      return;
    }
    setCalError('');
    onCalibrate({
      enabled: true,
      mode: calMode,
      value: check.value,
      calibratedAt: new Date().toISOString(),
    });
    setShowCalibrate(false);
  };

  return (
    <GlassCard className="aqi-hero-card">
      <div className="aqi-hero-top">
        <div>
          <span className="hero-eyebrow">
            {airData?.mode === 'sample_demo'
              ? '🧪 Sample Severe-Smog Demo'
              : airData?.mode === 'manual'
                ? '📟 Manual PM2.5 Entry'
                : '📡 Local Air Quality Monitor'}
          </span>
          <h2 className="hero-location">{airData?.locationName || 'Location not selected'}</h2>
          {airData?.roundedLat != null && airData?.roundedLon != null && (
            <p className="hero-meta">
              Rounded coords: {Number(airData.roundedLat).toFixed(1)}°,{' '}
              {Number(airData.roundedLon).toFixed(1)}° • Updated {formatTimestamp(airData.fetchedAt)}
            </p>
          )}
        </div>

        <div className="scale-toggle" role="group" aria-label="AQI scale selector">
          <button
            type="button"
            className={`scale-btn ${aqiScale === 'india_naqi' ? 'active' : ''}`}
            onClick={() => onToggleScale('india_naqi')}
            aria-pressed={aqiScale === 'india_naqi'}
          >
            India NAQI
          </button>
          <button
            type="button"
            className={`scale-btn ${aqiScale === 'us_aqi' ? 'active' : ''}`}
            onClick={() => onToggleScale('us_aqi')}
            aria-pressed={aqiScale === 'us_aqi'}
          >
            US AQI
          </button>
        </div>
      </div>

      {airState.loading ? (
        <div className="skeleton-box" aria-live="polite" aria-busy="true">
          <div className="skeleton-line skeleton-line--lg" />
          <div className="skeleton-line" />
          <div className="skeleton-bars" />
        </div>
      ) : (
        <>
          {(airState.error || airData?.notice) && (
            <div className="notice-banner" role="status" aria-live="polite">
              <span>ℹ️</span>
              <span>{airState.error || airData?.notice}</span>
            </div>
          )}

          <div className="aqi-stats-grid">
            <div className="aqi-score-block">
              <div className="aqi-number" style={{ borderColor: metrics.category.color }}>
                <span className="aqi-value">{metrics.aqi}</span>
                <span className="aqi-unit">{aqiScale === 'us_aqi' ? 'US AQI' : 'India NAQI'}</span>
              </div>
              <div>
                <div className="aqi-category-pill">
                  <span aria-hidden="true">{metrics.category.icon}</span>
                  <span>{metrics.category.label}</span>
                </div>
                <p className="aqi-pm-sub">
                  PM2.5: <strong>{metrics.pm25} µg/m³</strong>
                  {calibration?.enabled ? ' (monitor calibrated)' : ''}
                </p>
              </div>
            </div>

            <div className="who-ratio-block">
              <div className="who-ratio-value">{metrics.whoRatio}×</div>
              <div className="who-ratio-label">
                times the WHO 2021 24h guideline ({metrics.whoGuideline24h} µg/m³)
              </div>
              {airData?.weather && (
                <div className="weather-chips">
                  {airData.weather.temperatureC != null && (
                    <span>🌡️ {airData.weather.temperatureC}°C</span>
                  )}
                  {airData.weather.humidityPct != null && (
                    <span>💧 {airData.weather.humidityPct}% RH</span>
                  )}
                  {airData.weather.windSpeedKmh != null && (
                    <span>💨 {airData.weather.windSpeedKmh} km/h</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 24-Hour PM2.5 Bar Chart */}
          <div className="pm25-bars-section">
            <div className="pm25-bars-header">
              <h3>24-Hour PM2.5 Forecast (µg/m³)</h3>
              <div className="window-badges">
                <span className="badge badge--green">
                  🌬️ Best: {formatHour(windowInfo.bestWindowStart)}–{formatHour(windowInfo.bestWindowEnd)} (~{windowInfo.bestPm25} µg/m³)
                </span>
                <span className="badge badge--red">
                  🚨 Avoid: {formatHour(windowInfo.avoidWindowStart)}–{formatHour(windowInfo.avoidWindowEnd)} (~{windowInfo.avoidPm25} µg/m³)
                </span>
              </div>
            </div>

            <div
              className="pm25-bars-chart"
              role="img"
              aria-label={`24-hour PM2.5 bars. Best window ${formatHour(windowInfo.bestWindowStart)} to ${formatHour(windowInfo.bestWindowEnd)}. Peak around ${formatHour(windowInfo.worstHour)} at ${windowInfo.worstPm25} micrograms per cubic meter.`}
            >
              {effectiveHourly.map((entry) => {
                const heightPct = Math.max(6, Math.round((entry.pm25 / maxBarPm25) * 100));
                const barEval = evaluateAqi(entry.pm25, aqiScale);
                const isBest =
                  entry.hour >= windowInfo.bestWindowStart &&
                  entry.hour < windowInfo.bestWindowStart + 3;
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
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: barEval.category.color,
                        }}
                      />
                    </div>
                    <span className="pm25-bar-hr">
                      {entry.hour % 3 === 0 ? `${entry.hour}h` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action bar: Calibrate with monitor, Sample severe-smog demo, Refresh */}
          <div className="hero-actions-bar">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setShowCalibrate((v) => !v)}
            >
              📟 Calibrate with monitor
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onLoadSampleDemo}
            >
              🌫️ Sample severe-smog demo
            </button>
            {airData?.roundedLat != null && onRefreshLive && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onRefreshLive}
              >
                🔄 Refresh live Open-Meteo
              </button>
            )}
          </div>

          {showCalibrate && (
            <form className="calibrate-panel" onSubmit={handleApplyCalibrate}>
              <div className="calibrate-row">
                <div>
                  <label htmlFor="calibrate-mode" className="field-label">
                    Monitor unit
                  </label>
                  <select
                    id="calibrate-mode"
                    className="text-input"
                    value={calMode}
                    onChange={(e) => setCalMode(e.target.value)}
                  >
                    <option value="pm25">PM2.5 (µg/m³)</option>
                    <option value="aqi">
                      {aqiScale === 'us_aqi' ? 'US AQI' : 'India NAQI'}
                    </option>
                  </select>
                </div>
                <div>
                  <label htmlFor="calibrate-value" className="field-label">
                    Your monitor reading right now
                  </label>
                  <input
                    id="calibrate-value"
                    type="number"
                    step="0.1"
                    className="text-input"
                    value={calInput}
                    onChange={(e) => setCalInput(e.target.value)}
                    placeholder={calMode === 'pm25' ? 'e.g. 165' : 'e.g. 320'}
                  />
                </div>
                <button type="submit" className="btn btn--primary">
                  Apply Calibration
                </button>
                {onApplyManualPm25 && calMode === 'pm25' && (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => {
                      const check = validateRange(calInput, 0, 1000, 'Manual PM2.5 (µg/m³)');
                      if (!check.valid) {
                        setCalError(check.error);
                        return;
                      }
                      setCalError('');
                      onApplyManualPm25(check.value);
                      setShowCalibrate(false);
                    }}
                  >
                    Use as Manual Fallback
                  </button>
                )}
                {calibration?.enabled && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      onClearCalibration();
                      setCalInput('');
                      setShowCalibrate(false);
                    }}
                  >
                    Reset Calibration
                  </button>
                )}
              </div>
              {calError && (
                <p className="field-error" role="alert">
                  {calError}
                </p>
              )}
              <p className="field-help">
                Calibrating scales the 24-hour curve to match your handheld/indoor sensor reading. Low-cost laser monitors can read higher when humidity exceeds 75%.
              </p>
            </form>
          )}

          <p className="source-footnote">
            Source: {airData?.source || 'Open-Meteo CAMS'} • Timestamp:{' '}
            {airData?.timestampIso || formatTimestamp(airData?.fetchedAt)}
          </p>
        </>
      )}
    </GlassCard>
  );
}
