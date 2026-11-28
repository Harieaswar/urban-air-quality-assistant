/**
 * @fileoverview 10-Section Smog and Air Quality Report Page orchestrator.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TIME_UNITS } from '@/constants';
import { useAppStore } from '@/state';
import { useReportMetrics } from '@/hooks';
import { ReportSummarySections, ReportActionSections, ReportImpactSections } from '@/components';

function downloadJsonBundle(bundle) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smogguard-report-${new Date().toISOString().slice(0, TIME_UNITS.ISO_DATE_PREFIX_LEN)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportTopBar({ onDownloadJson, onEditAnswers }) {
  return (
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
        <button type="button" className="btn btn--secondary" onClick={onDownloadJson}>
          📥 Download JSON
        </button>
        <button type="button" className="btn btn--ghost" onClick={onEditAnswers}>
          ✏️ Edit Answers
        </button>
      </div>
    </div>
  );
}

function ReportBodyContent({ state, dispatch, metrics, editStep }) {
  return (
    <>
      <ReportSummarySections
        airData={metrics.airData}
        locationName={state.location.name}
        aqiScale={metrics.aqiScale}
        aqiMetrics={metrics.aqiMetrics}
        airWindow={metrics.airWindow}
        effectiveHourly={metrics.effectiveHourly}
        advisory={metrics.advisory}
        exposure={metrics.exposure}
        footprint={metrics.footprint}
        onEditStep={editStep}
      />
      <ReportActionSections
        prioritizedMeasures={metrics.prioritizedMeasures}
        selectedActionIds={state.selectedActionIds}
        roomPlan={metrics.roomPlan}
        hourlyRoutine={metrics.hourlyRoutine}
        onToggleAction={(id) => dispatch({ type: 'TOGGLE_ACTION', id })}
        onEditStep={editStep}
      />
      <ReportImpactSections
        impactSummary={metrics.impactSummary}
        rankedAlternatives={metrics.rankedAlternatives}
        selectedActionIds={state.selectedActionIds}
        altRankBy={state.preferences.altRankBy || 'emissions'}
        onToggleAction={(id) => dispatch({ type: 'TOGGLE_ACTION', id })}
        onChangeRankBy={(altRankBy) =>
          dispatch({ type: 'UPDATE_PREFERENCES', payload: { altRankBy } })
        }
      />
    </>
  );
}

/**
 * Render the live-updating 10-section Smog and Air Quality Report with Print/PDF and JSON export.
 * @returns {JSX.Element} Report page.
 */
export default function ReportPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const metrics = useReportMetrics(state);

  const editStep = (stepNum) => {
    dispatch({ type: 'SET_STEP', step: stepNum });
    navigate('/wizard');
  };

  return (
    <div className="page-container report-page">
      <ReportTopBar
        onDownloadJson={() => downloadJsonBundle(metrics.buildReportExportBundle())}
        onEditAnswers={() => editStep(1)}
      />
      <ReportBodyContent state={state} dispatch={dispatch} metrics={metrics} editStep={editStep} />
    </div>
  );
}
