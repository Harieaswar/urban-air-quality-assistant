/**
 * @fileoverview Presentational AQI score, category pill, WHO guideline ratio, and weather chips.
 */

import React from 'react';

function WeatherChips({ weather }) {
  if (!weather) return null;
  const hasVal = (v) => v !== null && v !== undefined;
  return (
    <div className="weather-chips">
      {hasVal(weather.temperatureC) && <span>🌡️ {weather.temperatureC}°C</span>}
      {hasVal(weather.humidityPct) && <span>💧 {weather.humidityPct}% RH</span>}
      {hasVal(weather.windSpeedKmh) && <span>💨 {weather.windSpeedKmh} km/h</span>}
    </div>
  );
}

/**
 * Render AQI badge, PM2.5 reading, WHO 2021 ratio, and optional weather summary.
 * @param {Object} props - Evaluated AQI metrics, active scale, calibration, and air data.
 * @returns {JSX.Element} Hero stats grid.
 */
export default function HeroStatsGrid({ metrics, aqiScale, calibration, airData }) {
  return (
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
        <WeatherChips weather={airData?.weather} />
      </div>
    </div>
  );
}
