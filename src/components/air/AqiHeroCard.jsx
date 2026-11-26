/**
 * @fileoverview AQI Hero Card showing live/cached/manual/demo AQI, WHO ratio, and 24-hour bars.
 */

import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Pm25HourlyChart from './Pm25HourlyChart';
import MonitorCalibrateForm from './MonitorCalibrateForm';
import { evaluateAqi, resolveEffectiveAirSeries } from '@/calculators/aqi';
import { calculateAirWindow } from '@/calculators/airWindow';
import { formatTimestamp } from '@/utils/format';

/**
 * Display current AQI, WHO 2021 ratio, 24-hour PM2.5 chart, monitor calibration, and severe-smog demo.
 * @param {Object} props - Air state and action callbacks.
 * @returns {JSX.Element} AQI Hero Card component.
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
  const airData = airState.data;
  const calibration = airState.calibration;

  const { effectiveHourly, effectivePm25 } = resolveEffectiveAirSeries(
    airData,
    calibration,
    aqiScale
  );
  const metrics = evaluateAqi(effectivePm25, aqiScale);
  const windowInfo = calculateAirWindow(effectiveHourly);

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
              {Number(airData.roundedLon).toFixed(1)}° • Updated{' '}
              {formatTimestamp(airData.fetchedAt)}
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
              <span aria-hidden="true">ℹ️</span>
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

          <Pm25HourlyChart
            hourlyData={effectiveHourly}
            windowInfo={windowInfo}
            aqiScale={aqiScale}
          />

          <div className="hero-actions-bar">
            <button
              type="button"
              className="btn btn--secondary"
              aria-expanded={showCalibrate}
              onClick={() => setShowCalibrate((v) => !v)}
            >
              📟 Calibrate with monitor
            </button>
            <button type="button" className="btn btn--secondary" onClick={onLoadSampleDemo}>
              🌫️ Sample severe-smog demo
            </button>
            {airData?.roundedLat != null && onRefreshLive && (
              <button type="button" className="btn btn--ghost" onClick={onRefreshLive}>
                🔄 Refresh live Open-Meteo
              </button>
            )}
          </div>

          {showCalibrate && (
            <MonitorCalibrateForm
              calibration={calibration}
              aqiScale={aqiScale}
              onCalibrate={onCalibrate}
              onClearCalibration={onClearCalibration}
              onApplyManualPm25={onApplyManualPm25}
              onClose={() => setShowCalibrate(false)}
            />
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
