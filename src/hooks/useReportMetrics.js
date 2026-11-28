/**
 * @fileoverview Custom hook computing all 10 live report sections and JSON export data.
 */

import { useMemo } from 'react';
import {
  evaluateAqi,
  resolveEffectiveAirSeries,
  calculateAirWindow,
  getHealthAdvisory,
  calculateExposure,
  calculateFootprint,
  buildRoomByRoomPlan,
  buildPrioritizedMeasures,
  buildHourlyRoutine,
  calculateCumulativeImpact,
  rankSustainableAlternatives,
} from '@/calculators';
import { BOUNDS, IMPACT_FACTORS } from '@/constants';
import actionsData from '@/data/actions.json';
import factorsData from '@/data/factors.json';
import { selectCalculatorProfile } from '@/state';

function useAirReportMetrics(state, aqiScale) {
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
  return { airData, effectiveHourly, effectivePm25, aqiMetrics, airWindow, advisory };
}

function useActionReportMetrics(state, profile, airWindow) {
  const roomPlan = useMemo(
    () => buildRoomByRoomPlan(state.rooms.list, state.family.sensitiveGroups),
    [state.rooms.list, state.family.sensitiveGroups]
  );
  const cleanRoom = roomPlan.find((room) => room.isCleanRoom) || roomPlan[0];
  const prioritizedMeasures = useMemo(
    () => buildPrioritizedMeasures(actionsData, profile),
    [profile]
  );
  const hourlyRoutine = useMemo(
    () => buildHourlyRoutine(profile, airWindow, cleanRoom),
    [profile, airWindow, cleanRoom]
  );
  const selectedActions = useMemo(
    () => actionsData.filter((action) => state.selectedActionIds.includes(action.id)),
    [state.selectedActionIds]
  );
  const activeImpactActions =
    selectedActions.length > 0
      ? selectedActions
      : actionsData.slice(0, IMPACT_FACTORS.DEFAULT_IMPACT_COUNT);
  const impactSummary = useMemo(
    () => calculateCumulativeImpact(activeImpactActions, profile, factorsData),
    [activeImpactActions, profile]
  );
  const rankedAlternatives = useMemo(
    () =>
      rankSustainableAlternatives(
        actionsData,
        profile,
        factorsData,
        state.preferences.altRankBy || 'emissions'
      ).slice(0, BOUNDS.MAX_ALTERNATIVES_REPORT),
    [profile, state.preferences.altRankBy]
  );
  return { roomPlan, prioritizedMeasures, hourlyRoutine, impactSummary, rankedAlternatives };
}

function createReportBundle({
  state,
  aqiScale,
  airData,
  aqiMetrics,
  airWindow,
  advisory,
  exposure,
  footprint,
  actionMetrics,
}) {
  return {
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
    prioritizedMeasures: actionMetrics.prioritizedMeasures,
    roomPlan: actionMetrics.roomPlan,
    hourlyRoutine: actionMetrics.hourlyRoutine,
    actionImpacts: actionMetrics.impactSummary,
    sustainableAlternatives: actionMetrics.rankedAlternatives,
    profile: state,
  };
}

/**
 * Derive reactive report metrics from single-source store state.
 * @param {Object} state - Root application state from `useAppStore`.
 * @returns {Object} All memoized report datasets plus JSON download helper.
 */
export function useReportMetrics(state) {
  const aqiScale = state.preferences.aqiScale || 'india_naqi';
  const profile = useMemo(() => selectCalculatorProfile(state), [state]);
  const air = useAirReportMetrics(state, aqiScale);
  const exposure = useMemo(
    () => calculateExposure(profile, { outdoorPm25: air.effectivePm25 }),
    [profile, air.effectivePm25]
  );
  const footprint = useMemo(() => calculateFootprint(profile, factorsData), [profile]);
  const actionMetrics = useActionReportMetrics(state, profile, air.airWindow);

  return {
    aqiScale,
    ...air,
    exposure,
    footprint,
    ...actionMetrics,
    buildReportExportBundle: () =>
      createReportBundle({ state, aqiScale, ...air, exposure, footprint, actionMetrics }),
  };
}
