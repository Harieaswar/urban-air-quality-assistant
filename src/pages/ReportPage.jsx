/**
 * @fileoverview 10-Section Smog and Air Quality Report Page orchestrator.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/state';
import { useReportMetrics } from '@/hooks';
import { ReportSummarySections, ReportActionSections, ReportImpactSections } from '@/components';

/**
 * Render the live-updating 10-section Smog and Air Quality Report with Print/PDF and JSON export.
 * @returns {JSX.Element} Report page.
 */
export default function ReportPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const {
    aqiScale,
    airData,
    effectiveHourly,
    aqiMetrics,
    airWindow,
    advisory,
    exposure,
    footprint,
    roomPlan,
    prioritizedMeasures,
    hourlyRoutine,
    impactSummary,
    rankedAlternatives,
    buildReportExportBundle,
  } = useReportMetrics(state);

  const editStep = (stepNum) => {
    dispatch({ type: 'SET_STEP', step: stepNum });
    navigate('/wizard');
  };

  const handleDownloadJson = () => {
    const bundle = buildReportExportBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
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

      <ReportSummarySections
        airData={airData}
        locationName={state.location.name}
        aqiScale={aqiScale}
        aqiMetrics={aqiMetrics}
        airWindow={airWindow}
        effectiveHourly={effectiveHourly}
        advisory={advisory}
        exposure={exposure}
        footprint={footprint}
        onEditStep={editStep}
      />

      <ReportActionSections
        prioritizedMeasures={prioritizedMeasures}
        selectedActionIds={state.selectedActionIds}
        roomPlan={roomPlan}
        hourlyRoutine={hourlyRoutine}
        onToggleAction={(id) => dispatch({ type: 'TOGGLE_ACTION', id })}
        onEditStep={editStep}
      />

      <ReportImpactSections
        impactSummary={impactSummary}
        rankedAlternatives={rankedAlternatives}
        selectedActionIds={state.selectedActionIds}
        altRankBy={state.preferences.altRankBy || 'emissions'}
        onToggleAction={(id) => dispatch({ type: 'TOGGLE_ACTION', id })}
        onChangeRankBy={(altRankBy) =>
          dispatch({ type: 'UPDATE_PREFERENCES', payload: { altRankBy } })
        }
      />
    </div>
  );
}
