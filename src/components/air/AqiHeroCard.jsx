/**
 * @fileoverview AQI Hero Card showing live/cached/manual/demo AQI, WHO ratio, and 24-hour bars.
 */

import React, { useState } from 'react';
import HeroStatsGrid from './HeroStatsGrid';
import Pm25HourlyChart from './Pm25HourlyChart';
import MonitorCalibrateForm from './MonitorCalibrateForm';
import GlassCard from '@/components/ui/GlassCard';
import { evaluateAqi, resolveEffectiveAirSeries } from '@/calculators/aqi';
import { calculateAirWindow } from '@/calculators/airWindow';
import { formatTimestamp } from '@/utils/format';

const HERO_EYEBROWS = {
  sample_demo: '🧪 Sample Severe-Smog Demo',
  manual: '📟 Manual PM2.5 Entry',
};

function hasCoords(airData) {
  return (
    airData?.roundedLat !== null &&
    airData?.roundedLat !== undefined &&
    airData?.roundedLon !== null &&
    airData?.roundedLon !== undefined
  );
}

function HeroHeaderBar({ airData, aqiScale, onToggleScale }) {
  return (
    <div className="aqi-hero-top">
      <div>
        <span className="hero-eyebrow">
          {HERO_EYEBROWS[airData?.mode] || '📡 Local Air Quality Monitor'}
        </span>
        <h2 className="hero-location">{airData?.locationName || 'Location not selected'}</h2>
        {hasCoords(airData) && (
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
  );
}

function HeroToolbar({
  showCalibrate,
  setShowCalibrate,
  onLoadSampleDemo,
  airData,
  onRefreshLive,
}) {
  return (
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
      {hasCoords(airData) && onRefreshLive && (
        <button type="button" className="btn btn--ghost" onClick={onRefreshLive}>
          🔄 Refresh live Open-Meteo
        </button>
      )}
    </div>
  );
}

function HeroNoticeBanner({ notice }) {
  if (!notice) return null;
  return (
    <div className="notice-banner" role="status" aria-live="polite">
      <span aria-hidden="true">ℹ️</span>
      <span>{notice}</span>
    </div>
  );
}

function HeroLoadingSkeleton() {
  return (
    <div className="skeleton-box" aria-live="polite" aria-busy="true">
      <div className="skeleton-line skeleton-line--lg" />
      <div className="skeleton-line" />
      <div className="skeleton-bars" />
    </div>
  );
}

function HeroContentBody({ airState, aqiScale, metrics, effectiveHourly, windowInfo, calProps }) {
  const [showCalibrate, setShowCalibrate] = useState(false);
  const { data: airData, calibration, error } = airState;

  return (
    <>
      <HeroNoticeBanner notice={error || airData?.notice} />
      <HeroStatsGrid
        metrics={metrics}
        aqiScale={aqiScale}
        calibration={calibration}
        airData={airData}
      />
      <Pm25HourlyChart hourlyData={effectiveHourly} windowInfo={windowInfo} aqiScale={aqiScale} />
      <HeroToolbar
        showCalibrate={showCalibrate}
        setShowCalibrate={setShowCalibrate}
        onLoadSampleDemo={calProps.onLoadSampleDemo}
        airData={airData}
        onRefreshLive={calProps.onRefreshLive}
      />
      {showCalibrate && (
        <MonitorCalibrateForm
          calibration={calibration}
          aqiScale={aqiScale}
          onCalibrate={calProps.onCalibrate}
          onClearCalibration={calProps.onClearCalibration}
          onApplyManualPm25={calProps.onApplyManualPm25}
          onClose={() => setShowCalibrate(false)}
        />
      )}
      <p className="source-footnote">
        Source: {airData?.source || 'Open-Meteo CAMS'} • Timestamp:{' '}
        {airData?.timestampIso || formatTimestamp(airData?.fetchedAt)}
      </p>
    </>
  );
}

/**
 * Display current AQI, WHO 2021 ratio, 24-hour PM2.5 chart, monitor calibration, and severe-smog demo.
 * @param {Object} props - Air state and action callbacks.
 * @returns {JSX.Element} AQI Hero Card component.
 */
export default function AqiHeroCard(props) {
  const { airState, aqiScale, onToggleScale, ...calProps } = props;
  const { data: airData, calibration, loading } = airState;
  const { effectiveHourly, effectivePm25 } = resolveEffectiveAirSeries(
    airData,
    calibration,
    aqiScale
  );
  const metrics = evaluateAqi(effectivePm25, aqiScale);
  const windowInfo = calculateAirWindow(effectiveHourly);

  return (
    <GlassCard className="aqi-hero-card">
      <HeroHeaderBar airData={airData} aqiScale={aqiScale} onToggleScale={onToggleScale} />
      {loading ? (
        <HeroLoadingSkeleton />
      ) : (
        <HeroContentBody
          airState={airState}
          aqiScale={aqiScale}
          metrics={metrics}
          effectiveHourly={effectiveHourly}
          windowInfo={windowInfo}
          calProps={calProps}
        />
      )}
    </GlassCard>
  );
}
