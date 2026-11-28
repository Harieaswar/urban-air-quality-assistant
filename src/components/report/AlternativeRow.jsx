/**
 * @fileoverview Expandable table row for a ranked sustainable alternative with "Show the math" disclosure.
 */

import React, { useState } from 'react';
import { formatCO2, formatINR } from '@/utils/format';

/**
 * Render one alternative row and its collapsible calculation disclosure row.
 * @param {Object} props - Action entry and calculated impact summary.
 * @returns {JSX.Element} Table row fragment.
 */
export default function AlternativeRow({ action, impact }) {
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
