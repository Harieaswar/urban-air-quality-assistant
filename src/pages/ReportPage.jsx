import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/state/AppContext';
import { selectCalculatorProfile } from '@/state/sessionStore';
import factorsData from '@/data/factors.json';
import actionsData from '@/data/actions.json';
import assumptionsData from '@/data/assumptions.json';
import GlassCard from '@/components/ui/GlassCard';
import ImpactCard from '@/components/cards/ImpactCard';
import { EvidenceBadge, EffortBadge, CostBadge } from '@/components/ui/Badge';
import {
  evaluateAqi,
  aqiToApproxPm25,
  calibrateHourlyPm25,
} from '@/calculators/aqi';
import { calculateAirWindow } from '@/calculators/airWindow';
import { getHealthAdvisory } from '@/calculators/advisory';
import { calculateExposure } from '@/calculators/exposure';
import { calculateFootprint } from '@/calculators/footprint';
import { buildRoomByRoomPlan } from '@/calculators/purifier';
import {
  buildPrioritizedMeasures,
  buildHourlyRoutine,
} from '@/calculators/routine';
import {
  calculateCumulativeImpact,
  rankSustainableAlternatives,
} from '@/calculators/impact';
import { formatCO2, formatHour, formatINR, formatRange, formatTimestamp } from '@/utils/format';

/**
 * 10-Section "Smog and Air Quality Report" — SmogGuard
 * Regenerates automatically whenever any wizard answer or air reading changes.
 * Supports Print / Save as PDF (@media print) and Download JSON.
 */
export default function ReportPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const aqiScale = state.preferences.aqiScale || 'india_naqi';
  const profile = useMemo(() => selectCalculatorProfile(state), [state]);
  const airData = state.air.data;
  const calibration = state.air.calibration;

  const currentHour = new Date().getHours();
  const calibratedPm25 =
    calibration?.enabled && calibration?.value != null
      ? calibration.mode === 'aqi'
        ? aqiToApproxPm25(calibration.value, aqiScale)
        : Number(calibration.value)
      : null;

  const effectiveHourly = useMemo(() => {
    const raw = airData?.hourlyData || [];
    return calibratedPm25 != null ? calibrateHourlyPm25(raw, calibratedPm25, currentHour) : raw;
  }, [airData, calibratedPm25, currentHour]);

  const effectivePm25 =
    calibratedPm25 != null
      ? calibratedPm25
      : airData?.currentPm25 ?? effectiveHourly[0]?.pm25 ?? 0;

  const aqiMetrics = useMemo(() => evaluateAqi(effectivePm25, aqiScale), [effectivePm25, aqiScale]);
  const airWindow = useMemo(() => calculateAirWindow(effectiveHourly), [effectiveHourly]);
  const advisory = useMemo(
    () => getHealthAdvisory(effectivePm25, state.family.sensitiveGroups, aqiScale),
    [effectivePm25, state.family.sensitiveGroups, aqiScale]
  );
  const exposure = useMemo(
    () => calculateExposure(profile, { outdoorPm25: effectivePm25 }),
    [profile, effectivePm25]
  );
  const footprint = useMemo(() => calculateFootprint(profile, factorsData), [profile]);
  const roomPlan = useMemo(
    () => buildRoomByRoomPlan(state.rooms.list, state.family.sensitiveGroups),
    [state.rooms.list, state.family.sensitiveGroups]
  );
  const cleanRoom = roomPlan.find((r) => r.isCleanRoom) || roomPlan[0];
  const prioritizedMeasures = useMemo(
    () => buildPrioritizedMeasures(actionsData, profile),
    [profile]
  );
  const hourlyRoutine = useMemo(
    () => buildHourlyRoutine(profile, airWindow, cleanRoom),
    [profile, airWindow, cleanRoom]
  );
  const selectedActions = useMemo(
    () => actionsData.filter((a) => state.selectedActionIds.includes(a.id)),
    [state.selectedActionIds]
  );
  const impactSummary = useMemo(
    () =>
      calculateCumulativeImpact(
        selectedActions.length > 0 ? selectedActions : actionsData.slice(0, 5),
        profile,
        factorsData
      ),
    [selectedActions, profile]
  );
  const rankedAlternatives = useMemo(
    () =>
      rankSustainableAlternatives(
        actionsData,
        profile,
        factorsData,
        state.preferences.altRankBy || 'emissions'
      ).slice(0, 8),
    [profile, state.preferences.altRankBy]
  );

  const editStep = (stepNum) => {
    dispatch({ type: 'SET_STEP', step: stepNum });
    navigate('/wizard');
  };

  const handleDownloadJson = () => {
    const reportBundle = {
      generatedAt: new Date().toISOString(),
      summary: {
        location: airData?.locationName || state.location.name,
        aqi: aqiMetrics.aqi,
        scale: aqiScale,
        category: aqiMetrics.category.label,
        pm25: aqiMetrics.pm25,
        timesWhoGuideline: aqiMetrics.whoRatio,
        exposureIndex: exposure,
        annualFootprintKgCO2e: footprint,
      },
      forecast24h: airWindow,
      healthAdvisory: advisory,
      rankedSources: exposure.contributingFactors,
      prioritizedMeasures,
      roomPlan,
      hourlyRoutine,
      actionImpacts: impactSummary,
      sustainableAlternatives: rankedAlternatives,
      profile: state,
    };

    const blob = new Blob([JSON.stringify(reportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smogguard-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container report-page">
      <div className="report-top-bar no-print">
        <div>
          <h1 className="page-title">📄 Smog and Air Quality Report</h1>
          <p className="wizard-subtitle">
            Updates live whenever you change any wizard answer, monitor calibration, or AQI scale.
          </p>
        </div>
        <div className="report-actions">
          <button type="button" className="btn btn--primary" onClick={() => window.print()}>
            🖨️ Print / Save as PDF
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleDownloadJson}>
            📥 Download JSON
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => editStep(1)}>
            ✏️ Edit Answers
          </button>
        </div>
      </div>

      {/* 1. Summary */}
      <section className="page-section report-section" aria-labelledby="sec-summary">
        <div className="section-heading-row">
          <h2 id="sec-summary">1. Executive Summary</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => editStep(1)}>
            Edit Location
          </button>
        </div>
        <GlassCard>
          <div className="report-summary-grid">
            <div>
              <p className="summary-label">Location & Date</p>
              <p className="summary-val">{airData?.locationName || state.location.name}</p>
              <p className="summary-sub">{formatTimestamp(airData?.fetchedAt || Date.now())}</p>
            </div>
            <div>
              <p className="summary-label">Current AQI ({aqiScale === 'us_aqi' ? 'US AQI' : 'India NAQI'})</p>
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
                Footprint: {formatRange(footprint.total.low, footprint.total.central, footprint.total.high)} kg CO₂e/yr
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* 2. 24-Hour Forecast */}
      <section className="page-section report-section" aria-labelledby="sec-forecast">
        <h2 id="sec-forecast">2. 24-Hour Forecast — Best & Avoid Hours</h2>
        <GlassCard>
          <div className="window-summary-row">
            <span className="badge badge--green">
              🌬️ Best window: {formatHour(airWindow.bestWindowStart)}–{formatHour(airWindow.bestWindowEnd)} (avg ~{airWindow.bestPm25} µg/m³)
            </span>
            <span className="badge badge--red">
              🚨 Avoid outdoor exertion: {formatHour(airWindow.avoidWindowStart)}–{formatHour(airWindow.avoidWindowEnd)} (avg ~{airWindow.avoidPm25} µg/m³)
            </span>
            <span className="badge badge--blue">
              24h average: ~{airWindow.averagePm25} µg/m³
            </span>
          </div>
          <div className="pm25-bars-chart report-bars" role="img" aria-label="24-hour PM2.5 forecast chart">
            {effectiveHourly.map((entry) => {
              const maxVal = Math.max(100, ...effectiveHourly.map((x) => x.pm25));
              const hPct = Math.max(6, Math.round((entry.pm25 / maxVal) * 100));
              const barCat = evaluateAqi(entry.pm25, aqiScale).category;
              return (
                <div key={entry.hour} className="pm25-bar-col">
                  <span className="pm25-bar-num">{Math.round(entry.pm25)}</span>
                  <div className="pm25-bar-track">
                    <div
                      className="pm25-bar-fill"
                      style={{ height: `${hPct}%`, backgroundColor: barCat.color }}
                    />
                  </div>
                  <span className="pm25-bar-hr">{entry.hour % 3 === 0 ? `${entry.hour}h` : ''}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </section>

      {/* 3. Health Advisory for Selected Family Members */}
      <section className="page-section report-section" aria-labelledby="sec-advisory">
        <div className="section-heading-row">
          <h2 id="sec-advisory">3. Health Advisory for Your Household</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => editStep(2)}>
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
            <p className="field-help">No sensitive-group profiles selected; general MoHFW/NCDC guidance shown above.</p>
          )}
          <p className="medical-disclaimer" role="note">
            ⚠️ {advisory.disclaimer}
          </p>
        </GlassCard>
      </section>

      {/* 4. Top Indoor & Outdoor Pollution Sources Ranked */}
      <section className="page-section report-section" aria-labelledby="sec-sources">
        <div className="section-heading-row">
          <h2 id="sec-sources">4. Top Indoor & Outdoor Pollution Sources (Ranked)</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => editStep(3)}>
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

      {/* 5. Prioritized Preventive Measures */}
      <section className="page-section report-section" aria-labelledby="sec-measures">
        <h2 id="sec-measures">5. Prioritized Preventive Measures</h2>
        <div className="measures-tiers-grid">
          {prioritizedMeasures.map((tier) => (
            <GlassCard key={tier.tierId} className="tier-card">
              <h3>
                <span aria-hidden="true">{tier.icon}</span> {tier.label}
              </h3>
              {tier.items.length === 0 ? (
                <p className="field-help">No additional actions needed in this tier for your home.</p>
              ) : (
                <div className="tier-items">
                  {tier.items.map((item) => (
                    <div key={item.id} className="tier-item">
                      <div className="tier-item-header">
                        <strong>{item.title}</strong>
                        <button
                          type="button"
                          className={`action-toggle no-print ${
                            state.selectedActionIds.includes(item.id) ? 'selected' : ''
                          }`}
                          onClick={() => dispatch({ type: 'TOGGLE_ACTION', id: item.id })}
                        >
                          {state.selectedActionIds.includes(item.id) ? 'Selected ✓' : 'Select'}
                        </button>
                      </div>
                      <p>
                        <strong>Why it works:</strong> {item.whyItWorks}
                      </p>
                      <p>
                        <strong>Expected effect:</strong> {item.effectRange}
                      </p>
                      <div className="action-card-badges">
                        <CostBadge tier={item.costTier} />
                        <EffortBadge level={item.effort} />
                        <EvidenceBadge level={item.evidence} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 6. Room-by-Room Plan */}
      <section className="page-section report-section" aria-labelledby="sec-rooms">
        <div className="section-heading-row">
          <h2 id="sec-rooms">6. Room-by-Room Plan & Clean Room Sizing</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => editStep(3)}>
            Edit Rooms
          </button>
        </div>
        <div className="rooms-plan-grid">
          {roomPlan.map((room) => (
            <GlassCard
              key={room.id}
              className={`room-plan-card ${room.isCleanRoom ? 'clean-room-highlight' : ''}`}
            >
              <div className="room-plan-top">
                <h3>{room.name}</h3>
                {room.isCleanRoom && (
                  <span className="badge badge--green">🛡️ Designated Clean Room</span>
                )}
              </div>
              <p className="room-plan-reason">{room.cleanRoomReason}</p>
              <div className="room-sizing-stats">
                <div>
                  <span>Volume:</span> <strong>{room.sizing.roomVolume} m³</strong> (
                  {room.sizing.areaSqM} m² × {room.sizing.ceilingHeightM} m)
                </div>
                <div>
                  <span>Target HEPA CADR (≥{room.sizing.achievedACH} ACH):</span>{' '}
                  <strong>
                    {room.sizing.cadrRange.min}–{room.sizing.cadrRange.max} m³/h
                  </strong>
                </div>
                <div>
                  <span>Est. Running Cost:</span>{' '}
                  <strong>~{formatINR(room.sizing.runningCostPerMonth)}/month</strong> (
                  {room.sizing.annualEmissions} kg CO₂e/yr grid)
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 7. Hour-by-Hour Routine for Today */}
      <section className="page-section report-section" aria-labelledby="sec-routine">
        <div className="section-heading-row">
          <h2 id="sec-routine">7. Hour-by-Hour Routine for Today</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => editStep(4)}>
            Edit Routine
          </button>
        </div>
        <GlassCard>
          <div className="routine-timeline">
            {hourlyRoutine.map((slot, idx) => (
              <div key={idx} className="routine-row">
                <div className="routine-time">
                  <span aria-hidden="true">{slot.icon}</span>
                  <strong>{slot.timeRange}</strong>
                  <span className="routine-slot-name">{slot.slot}</span>
                </div>
                <div className="routine-body">
                  <p>
                    <strong>{slot.action}</strong>
                  </p>
                  <p className="field-help">{slot.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      {/* 8. Impact Card for Each Action */}
      <section className="page-section report-section" aria-labelledby="sec-impacts">
        <h2 id="sec-impacts">8. Direct Action Impact Cards (Personal Exposure, Emissions & Savings)</h2>
        <GlassCard className="impact-totals-banner">
          <p>
            <strong>Combined Selected Plan Impact (with overlap guard):</strong>{' '}
            {formatRange(
              impactSummary.totalCO2Saved.low,
              impactSummary.totalCO2Saved.central,
              impactSummary.totalCO2Saved.high
            )}{' '}
            kg CO₂e/year • Est. {formatINR(impactSummary.totalMoneySaved)}/year saved
          </p>
          {impactSummary.overlaps.length > 0 && (
            <p className="field-help">
              {impactSummary.overlaps.map((o) => o.note).join(' ')}
            </p>
          )}
        </GlassCard>
        <div className="impact-cards-stack">
          {impactSummary.actionImpacts.map(({ action, impact }) => (
            <ImpactCard
              key={action.id}
              action={action}
              impact={impact}
              isSelected={state.selectedActionIds.includes(action.id)}
              onToggle={(id) => dispatch({ type: 'TOGGLE_ACTION', id })}
            />
          ))}
        </div>
      </section>

      {/* 9. Sustainable Alternatives with CO2e, INR & Payback */}
      <section className="page-section report-section" aria-labelledby="sec-alternatives">
        <div className="section-heading-row">
          <h2 id="sec-alternatives">9. Sustainable Alternatives & Payback</h2>
          <div className="scale-toggle no-print" role="group" aria-label="Rank alternatives by">
            {[
              { id: 'emissions', label: 'CO₂e Cut' },
              { id: 'exposure', label: 'Exposure' },
              { id: 'payback', label: 'Payback' },
              { id: 'effort', label: 'Lowest Effort' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`scale-btn ${
                  (state.preferences.altRankBy || 'emissions') === mode.id ? 'active' : ''
                }`}
                onClick={() =>
                  dispatch({ type: 'UPDATE_PREFERENCES', payload: { altRankBy: mode.id } })
                }
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <GlassCard>
          <div style={{ overflowX: 'auto' }}>
            <table className="factor-table">
              <thead>
                <tr>
                  <th>Alternative</th>
                  <th>Annual CO₂e Saved</th>
                  <th>Est. Annual Savings</th>
                  <th>Est. Upfront Cost</th>
                  <th>Payback</th>
                </tr>
              </thead>
              <tbody>
                {rankedAlternatives.map(({ action, impact }) => (
                  <tr key={action.id}>
                    <td>
                      <strong>{action.title}</strong>
                      <div className="table-sub">{impact.exposureChange}</div>
                    </td>
                    <td>{formatCO2(impact.co2SavedKg.central)}</td>
                    <td>{formatINR(impact.moneySavedINR)}/yr</td>
                    <td>
                      {impact.upfrontCostINR.typical > 0
                        ? `${formatINR(impact.upfrontCostINR.min)}–${formatINR(impact.upfrontCostINR.max)}`
                        : '₹0'}
                    </td>
                    <td>{impact.payback.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="field-help">
            🛡️ Greenwashing guard: Keep working appliances unless payback is clear; embodied manufacturing emissions apply to premature replacements. Costs are planning ranges — verify locally.
          </p>
        </GlassCard>
      </section>

      {/* 10. Assumptions, Data Sources & Limitations */}
      <section className="page-section report-section" aria-labelledby="sec-assumptions">
        <h2 id="sec-assumptions">10. Assumptions, Data Sources & Limitations</h2>
        <GlassCard>
          <h3>Data Sources</h3>
          <ul className="sources-list">
            {assumptionsData.dataSources.map((src, i) => (
              <li key={i}>
                <strong>{src.name}</strong> ({src.license}) — {src.purpose}
              </li>
            ))}
          </ul>

          <h3 style={{ marginTop: 'var(--space-lg)' }}>Key Assumptions & Conservative Defaults</h3>
          <p className="field-help">{assumptionsData.defaults.source}</p>
          <ul className="sources-list">
            <li>Electricity tariff benchmark: ₹{assumptionsData.defaults.electricityRatePerKwh}/kWh; grid factor: 0.82 kgCO₂e/kWh (CEA v18).</li>
            <li>WHO 2021 24-hour PM2.5 benchmark: {assumptionsData.who2021.pm25_24h_ugm3} µg/m³.</li>
            <li>Purifier running cost assumes {assumptionsData.defaults.purifierWatts}W for {assumptionsData.defaults.purifierHoursPerDay} hrs/day at {assumptionsData.defaults.targetACH} ACH.</li>
          </ul>

          <h3 style={{ marginTop: 'var(--space-lg)' }}>Limitations</h3>
          <ul className="sources-list">
            {assumptionsData.limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
          <p style={{ marginTop: 'var(--space-md)' }} className="no-print">
            <Link to="/methodology">View full emission factor & evidence tables →</Link>
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
