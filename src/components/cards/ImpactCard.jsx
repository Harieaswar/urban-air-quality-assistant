/**
 * @fileoverview Impact card showing personal exposure, CO₂e cut, bill payback, and expandable math proof.
 */

import React, { useState } from 'react';
import { EvidenceBadge, EffortBadge, CostBadge } from '@/components/ui/Badge';
import { formatINR, formatRange } from '@/utils/format';

function ImpactCardHeader({ action, isSelected, onToggle }) {
  return (
    <div className="impact-card-header">
      <div>
        <h3 className="impact-card-title">{action.title}</h3>
        <p className="impact-card-desc">{action.description}</p>
      </div>
      {onToggle && (
        <button
          type="button"
          className={`action-toggle ${isSelected ? 'selected' : ''}`}
          onClick={() => onToggle(action.id)}
          aria-pressed={isSelected}
        >
          {isSelected ? 'In My Plan ✓' : 'Add to Plan'}
        </button>
      )}
    </div>
  );
}

function ImpactMetricsRow({ impact }) {
  const emissionsLabel =
    impact.co2SavedKg.central > 0
      ? `${formatRange(impact.co2SavedKg.low, impact.co2SavedKg.central, impact.co2SavedKg.high)} kg CO₂e/yr`
      : 'Exposure-focused (0 direct CO₂e cut)';
  const savingsLabel =
    impact.moneySavedINR > 0
      ? `~${formatINR(impact.moneySavedINR)}/yr (${formatINR(impact.moneyRangeINR.low)}–${formatINR(impact.moneyRangeINR.high)})`
      : '₹0 direct bill saving';

  return (
    <div className="impact-metrics-row">
      <div className="impact-metric">
        <span className="impact-metric-label">Personal Exposure</span>
        <span className="impact-metric-val">{impact.exposureChange}</span>
      </div>
      <div className="impact-metric">
        <span className="impact-metric-label">City / Household Emissions</span>
        <span className="impact-metric-val">{emissionsLabel}</span>
      </div>
      <div className="impact-metric">
        <span className="impact-metric-label">Annual Bill Savings & Payback</span>
        <span className="impact-metric-val">
          {savingsLabel}
          {' • '}
          {impact.payback?.label}
        </span>
      </div>
    </div>
  );
}

function MathDetailsContent({ impact }) {
  const inputEntries = impact.inputs ? Object.entries(impact.inputs) : [];
  return (
    <div className="show-math-content">
      <p>
        <strong>Formula:</strong> {impact.formula}
      </p>
      {impact.upfrontCostINR?.typical > 0 && (
        <p>
          <strong>Planning upfront cost:</strong> {formatINR(impact.upfrontCostINR.min)}–
          {formatINR(impact.upfrontCostINR.max)} (typical {formatINR(impact.upfrontCostINR.typical)}
          ; estimate, verify locally)
        </p>
      )}
      {inputEntries.length > 0 && (
        <p>
          <strong>Inputs:</strong> {inputEntries.map(([k, v]) => `${k}=${v}`).join(', ')}
        </p>
      )}
      {impact.assumptions?.length > 0 && (
        <p>
          <strong>Assumptions:</strong> {impact.assumptions.join('; ')}
        </p>
      )}
      {impact.sources?.length > 0 && (
        <p>
          <strong>Sources:</strong> {impact.sources.join(' | ')}
        </p>
      )}
    </div>
  );
}

/**
 * Render an impact card with plan toggle button, exposure/CO₂e metrics, badges, and "Show the math".
 * @param {Object} props - Action entry, computed impact, selection flag, and toggle callback.
 * @returns {JSX.Element} Impact card article.
 */
export default function ImpactCard({ action, impact, isSelected, onToggle }) {
  const [showMath, setShowMath] = useState(false);

  return (
    <article className="impact-card">
      <ImpactCardHeader action={action} isSelected={isSelected} onToggle={onToggle} />
      <ImpactMetricsRow impact={impact} />
      <div className="action-card-badges">
        <EvidenceBadge level={action.evidence} />
        <EffortBadge level={action.effort} />
        <CostBadge tier={action.costTier} />
        {action.rentalFriendly && <span className="badge badge--teal">✓ Rental-friendly</span>}
      </div>
      <div className="show-math">
        <button
          type="button"
          className="show-math-toggle"
          onClick={() => setShowMath((v) => !v)}
          aria-expanded={showMath}
        >
          {showMath ? '▼' : '▶'} Show the math
        </button>
        {showMath && <MathDetailsContent impact={impact} />}
      </div>
    </article>
  );
}
