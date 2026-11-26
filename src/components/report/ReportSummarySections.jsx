/**
 * @fileoverview Report Sections 1–4: Summary, 24h Forecast, Family Health Advisory, and Ranked Sources.
 */

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Pm25HourlyChart from '@/components/air/Pm25HourlyChart';
import { formatRange, formatTimestamp } from '@/utils/format';

/**
 * Render Report Sections 1 through 4.
 * @param {Object} props - Computed summary, forecast, advisory, exposure, and edit handler.
 * @returns {JSX.Element} Report sections 1–4.
 */
export default function ReportSummarySections({
  airData,
  locationName,
  aqiScale,
  aqiMetrics,
  airWindow,
  effectiveHourly,
  advisory,
  exposure,
  footprint,
  onEditStep,
}) {
  return (
    <>
      <section className="page-section report-section" aria-labelledby="sec-summary">
        <div className="section-heading-row">
          <h2 id="sec-summary">1. Executive Summary</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => onEditStep(1)}>
            Edit Location
          </button>
        </div>
        <GlassCard>
          <div className="report-summary-grid">
            <div>
              <p className="summary-label">Location & Date</p>
              <p className="summary-val">{airData?.locationName || locationName}</p>
              <p className="summary-sub">{formatTimestamp(airData?.fetchedAt || Date.now())}</p>
            </div>
            <div>
              <p className="summary-label">
                Current AQI ({aqiScale === 'us_aqi' ? 'US AQI' : 'India NAQI'})
              </p>
              <p className="summary-val">
                <span aria-hidden="true">{aqiMetrics.category.icon}</span> {aqiMetrics.aqi} —{' '}
                {aqiMetrics.category.label}
              </p>
              <p className="summary-sub">PM2.5: {aqiMetrics.pm25} µg/m³</p>
            </div>
            <div>
              <p className="summary-label">WHO 2021 Guideline Ratio</p>
              <p className="summary-val">{aqiMetrics.whoRatio}× WHO 24h limit</p>
              <p className="summary-sub">Guideline: {aqiMetrics.whoGuideline24h} µg/m³</p>
            </div>
            <div>
              <p className="summary-label">Indoor Exposure & Carbon</p>
              <p className="summary-val">
                {exposure.level} ({exposure.score}/100)
              </p>
              <p className="summary-sub">
                Footprint:{' '}
                {formatRange(footprint.total.low, footprint.total.central, footprint.total.high)} kg
                CO₂e/yr
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="page-section report-section" aria-labelledby="sec-forecast">
        <h2 id="sec-forecast">2. 24-Hour Forecast — Best & Avoid Hours</h2>
        <GlassCard>
          <Pm25HourlyChart
            hourlyData={effectiveHourly}
            windowInfo={airWindow}
            aqiScale={aqiScale}
            heading={`24-Hour PM2.5 Forecast (24h avg: ~${airWindow.averagePm25} µg/m³)`}
          />
        </GlassCard>
      </section>

      <section className="page-section report-section" aria-labelledby="sec-advisory">
        <div className="section-heading-row">
          <h2 id="sec-advisory">3. Health Advisory for Your Household</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => onEditStep(2)}>
            Edit Family
          </button>
        </div>
        <GlassCard>
          <p className="advisory-general">
            <strong>
              <span aria-hidden="true">{advisory.icon}</span> {advisory.categoryLabel}:
            </strong>{' '}
            {advisory.generalAdvice}
          </p>
          {advisory.tailoredNotes.length > 0 ? (
            <div className="tailored-list">
              {advisory.tailoredNotes.map((note) => (
                <div key={note.id} className="tailored-item">
                  <div className="tailored-item-title">
                    <span aria-hidden="true">{note.icon}</span>
                    <strong>{note.label}</strong>
                  </div>
                  <p>{note.advice}</p>
                  <p className="tailored-rationale">{note.rationale}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="field-help">
              No sensitive-group profiles selected; general MoHFW/NCDC guidance shown above.
            </p>
          )}
          <p className="medical-disclaimer" role="note">
            ⚠️ {advisory.disclaimer}
          </p>
        </GlassCard>
      </section>

      <section className="page-section report-section" aria-labelledby="sec-sources">
        <div className="section-heading-row">
          <h2 id="sec-sources">4. Top Indoor & Outdoor Pollution Sources (Ranked)</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => onEditStep(3)}>
            Edit Rooms & Kitchen
          </button>
        </div>
        <GlassCard>
          <ol className="ranked-sources-list">
            {exposure.contributingFactors.map((src, idx) => (
              <li key={src.id || idx} className="ranked-source-item">
                <div className="ranked-source-top">
                  <strong>
                    #{idx + 1} [{src.scope}] {src.source}
                  </strong>
                  <span
                    className={`badge badge--${
                      src.impact === 'high' ? 'red' : src.impact === 'moderate' ? 'yellow' : 'green'
                    }`}
                  >
                    {src.impact.toUpperCase()} ({src.scoreContribution} pts)
                  </span>
                </div>
                <p>{src.detail}</p>
              </li>
            ))}
          </ol>
          <p className="field-help">{exposure.disclaimer}</p>
        </GlassCard>
      </section>
    </>
  );
}
