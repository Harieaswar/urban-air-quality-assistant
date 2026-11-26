/**
 * @fileoverview 10-Section Smog and Air Quality Report Page orchestrator.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/state/AppContext';
import { selectCalculatorProfile } from '@/state/sessionStore';
import factorsData from '@/data/factors.json';
import actionsData from '@/data/actions.json';
import ReportSummarySections from '@/components/report/ReportSummarySections';
import ReportActionSections from '@/components/report/ReportActionSections';
import ReportImpactSections from '@/components/report/ReportImpactSections';
import { evaluateAqi, resolveEffectiveAirSeries } from '@/calculators/aqi';
import { calculateAirWindow } from '@/calculators/airWindow';
import { getHealthAdvisory } from '@/calculators/advisory';
import { calculateExposure } from '@/calculators/exposure';
import { calculateFootprint } from '@/calculators/footprint';
import { buildRoomByRoomPlan } from '@/calculators/purifier';
import { buildPrioritizedMeasures, buildHourlyRoutine } from '@/calculators/routine';
import { calculateCumulativeImpact, rankSustainableAlternatives } from '@/calculators/impact';

const MAX_ALTERNATIVES_SHOWN = 8;

/**
 * Render the live-updating 10-section Smog and Air Quality Report with Print/PDF and JSON export.
 * @returns {JSX.Element} Report page.
 */
export default function ReportPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const aqiScale = state.preferences.aqiScale || 'india_naqi';
  const profile = useMemo(() => selectCalculatorProfile(state), [state]);
  const airData = state.air.data;

  const { effectiveHourly, effectivePm25 } = useMemo(
    () => resolveEffectiveAirSeries(airData, state.air.calibration, aqiScale),
    [airData, state.air.calibration, aqiScale]
  );

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
      ).slice(0, MAX_ALTERNATIVES_SHOWN),
    [profile, state.preferences.altRankBy]
  );

  const editStep = (stepNum) => {
    dispatch({ type: 'SET_STEP', step: stepNum });
    navigate('/wizard');
  };

  const handleDownloadJson = () => {
    const bundle = {
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
