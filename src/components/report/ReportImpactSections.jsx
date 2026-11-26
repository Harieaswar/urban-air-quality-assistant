/**
 * @fileoverview Report Sections 8–10: Action Impact Cards, Sustainable Alternatives with "Show the math", and Assumptions.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '@/components/ui/GlassCard';
import ImpactCard from '@/components/cards/ImpactCard';
import assumptionsData from '@/data/assumptions.json';
import { formatCO2, formatINR, formatRange } from '@/utils/format';

function AlternativeRow({ action, impact }) {
  const [showMath, setShowMath] = useState(false);

  return (
    <>
      <tr>
        <td>
          <strong>{action.title}</strong>
          <div className="table-sub">{impact.exposureChange}</div>
          <button
            type="button"
            className="show-math-toggle no-print"
            aria-expanded={showMath}
            onClick={() => setShowMath((v) => !v)}
          >
            {showMath ? '▼' : '▶'} Show the math
          </button>
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
      {showMath && (
        <tr className="math-detail-row">
          <td colSpan={5}>
            <div className="show-math-content">
              <p>
                <strong>Formula:</strong> {impact.formula}
              </p>
              {impact.sources?.length > 0 && (
                <p>
                  <strong>Sources:</strong> {impact.sources.join(' | ')}
                </p>
              )}
              {impact.assumptions?.length > 0 && (
                <p>
                  <strong>Assumptions:</strong> {impact.assumptions.join('; ')}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Render Report Sections 8 through 10.
 * @param {Object} props - Impact summary, ranked alternatives, rank mode, and handlers.
 * @returns {JSX.Element} Report sections 8–10.
 */
export default function ReportImpactSections({
  impactSummary,
  rankedAlternatives,
  selectedActionIds,
  altRankBy,
  onToggleAction,
  onChangeRankBy,
}) {
  return (
    <>
      <section className="page-section report-section" aria-labelledby="sec-impacts">
        <h2 id="sec-impacts">
          8. Direct Action Impact Cards (Personal Exposure, Emissions & Savings)
        </h2>
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
            <p className="field-help">{impactSummary.overlaps.map((o) => o.note).join(' ')}</p>
          )}
        </GlassCard>
        <div className="impact-cards-stack">
          {impactSummary.actionImpacts.map(({ action, impact }) => (
            <ImpactCard
              key={action.id}
              action={action}
              impact={impact}
              isSelected={selectedActionIds.includes(action.id)}
              onToggle={onToggleAction}
            />
          ))}
        </div>
      </section>

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
                className={`scale-btn ${altRankBy === mode.id ? 'active' : ''}`}
                aria-pressed={altRankBy === mode.id}
                onClick={() => onChangeRankBy(mode.id)}
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
                  <th scope="col">Alternative</th>
                  <th scope="col">Annual CO₂e Saved</th>
                  <th scope="col">Est. Annual Savings</th>
                  <th scope="col">Est. Upfront Cost</th>
                  <th scope="col">Payback</th>
                </tr>
              </thead>
              <tbody>
                {rankedAlternatives.map(({ action, impact }) => (
                  <AlternativeRow key={action.id} action={action} impact={impact} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="field-help">
            🛡️ Greenwashing guard: Keep working appliances unless payback is clear; embodied
            manufacturing emissions apply to premature replacements. Costs are planning ranges —
            verify locally.
          </p>
        </GlassCard>
      </section>

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
            <li>
              Electricity tariff benchmark: ₹{assumptionsData.defaults.electricityRatePerKwh}/kWh;
              grid factor: 0.82 kgCO₂e/kWh (CEA v18).
            </li>
            <li>
              WHO 2021 24-hour PM2.5 benchmark: {assumptionsData.who2021.pm25_24h_ugm3} µg/m³.
            </li>
            <li>
              Purifier running cost assumes {assumptionsData.defaults.purifierWatts}W for{' '}
              {assumptionsData.defaults.purifierHoursPerDay} hrs/day at{' '}
              {assumptionsData.defaults.targetACH} ACH.
            </li>
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
    </>
  );
}
