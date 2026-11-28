/**
 * @fileoverview SmogGuard Landing Page featuring live/cached/demo AQI, 24h bars, and family advisory.
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resolveEffectiveAirSeries } from '@/calculators';
import { AqiHeroCard, GlassCard, HealthAdvisoryCard, LocationSearch } from '@/components';
import { BOUNDS } from '@/constants';
import { useAppStore } from '@/state';

const WIZARD_STEPS_PREVIEW = [
  {
    step: BOUNDS.STEP_LOCATION,
    title: '1. Location',
    desc: 'City search or coordinates, home type, cooling & rental status',
  },
  {
    step: BOUNDS.STEP_FAMILY,
    title: '2. Family',
    desc: 'Household size, sensitive members, goals, budget & effort',
  },
  {
    step: BOUNDS.STEP_ROOMS,
    title: '3. Rooms',
    desc: 'Room dimensions, clean-room candidate, cooking & smoke sources',
  },
  {
    step: BOUNDS.STEP_ROUTINE,
    title: '4. Routine',
    desc: 'Commute, electricity kWh, diet, waste & outdoor timing',
  },
];

function HeroBanner({ wizardCompleted, onStartWizard }) {
  return (
    <section className="hero-banner glass-card" aria-labelledby="landing-title">
      <div className="hero-banner-content">
        <span className="badge badge--teal">100% Static Browser App • Keyless Open-Meteo Data</span>
        <h1 id="landing-title" className="hero-title">
          SmogGuard — Household Air Protection & Low-Emission Planner
        </h1>
        <p className="hero-subtitle">
          Check live or cached CAMS PM2.5 forecasts, calibrate with your personal monitor, tailor
          MoHFW/NCDC advisories for your family, and build a room-by-room smog & carbon plan in 4
          guided steps.
        </p>
        <div className="hero-cta-row">
          <button type="button" className="btn btn--primary" onClick={onStartWizard}>
            {wizardCompleted ? '✏️ Edit 4-Step Wizard' : '🧭 Start 4-Step Wizard'}
          </button>
          <Link to="/report" className="btn btn--secondary">
            📄 View Smog & Air Quality Report
          </Link>
        </div>
      </div>
    </section>
  );
}

function QuickSearchSection({ location, onSelectLocation }) {
  return (
    <section className="page-section" aria-label="Quick location search">
      <GlassCard>
        <LocationSearch
          locationName={location.name}
          lat={location.lat}
          lon={location.lon}
          onSelectLocation={onSelectLocation}
        />
      </GlassCard>
    </section>
  );
}

function buildRefreshCallback(location, loadLocationAir) {
  const hasCoords =
    location.lat !== null &&
    location.lat !== undefined &&
    location.lon !== null &&
    location.lon !== undefined;
  if (!hasCoords) return null;
  return () =>
    loadLocationAir({
      lat: location.lat,
      lon: location.lon,
      name: location.name,
      forceRefresh: true,
    });
}

function LandingMonitorSection({ store, aqiScale }) {
  const { state, dispatch, loadLocationAir, loadSampleSevereSmog, applyManualAirReading } = store;
  const resetCal = () =>
    dispatch({
      type: 'SET_CALIBRATION',
      payload: { enabled: false, value: null, calibratedAt: null },
    });

  return (
    <section className="page-section" aria-label="Current Air Quality and 24-hour forecast">
      <AqiHeroCard
        airState={state.air}
        aqiScale={aqiScale}
        onToggleScale={(scale) =>
          dispatch({ type: 'UPDATE_PREFERENCES', payload: { aqiScale: scale } })
        }
        onCalibrate={(cal) => dispatch({ type: 'SET_CALIBRATION', payload: cal })}
        onClearCalibration={resetCal}
        onLoadSampleDemo={loadSampleSevereSmog}
        onApplyManualPm25={applyManualAirReading}
        onRefreshLive={buildRefreshCallback(state.location, loadLocationAir)}
      />
    </section>
  );
}

function WizardPreviewGrid({ onOpenStep }) {
  return (
    <section className="page-section wizard-preview-grid" aria-label="4-Step Wizard Overview">
      {WIZARD_STEPS_PREVIEW.map((item) => (
        <GlassCard key={item.step} className="wizard-step-preview">
          <h2>{item.title}</h2>
          <p>{item.desc}</p>
          <button type="button" className="btn btn--ghost" onClick={() => onOpenStep(item.step)}>
            Open Step {item.step} →
          </button>
        </GlassCard>
      ))}
    </section>
  );
}

function LandingAdvisorySection({ effectivePm25, aqiScale, sensitiveGroups, dispatch }) {
  return (
    <section className="page-section" aria-label="Health advisory">
      <HealthAdvisoryCard
        pm25={effectivePm25}
        aqiScale={aqiScale}
        selectedFamilyIds={sensitiveGroups}
        onToggleFamilyMember={(id) => dispatch({ type: 'TOGGLE_SENSITIVE_GROUP', id })}
        showChips
      />
    </section>
  );
}

function selectLandingLocation(dispatch, loadLocationAir) {
  return async ({ name, lat, lon }) => {
    dispatch({ type: 'UPDATE_LOCATION', payload: { name, lat, lon } });
    dispatch({
      type: 'SET_CALIBRATION',
      payload: { enabled: false, value: null, calibratedAt: null },
    });
    await loadLocationAir({ lat, lon, name });
  };
}

/**
 * Render the SmogGuard landing dashboard and quick-start flow.
 * @returns {JSX.Element} Landing page.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const store = useAppStore();
  const { state, dispatch, loadLocationAir } = store;
  const aqiScale = state.preferences.aqiScale || 'india_naqi';
  const { effectivePm25 } = resolveEffectiveAirSeries(
    state.air.data,
    state.air.calibration,
    aqiScale
  );

  return (
    <div className="page-container landing-page">
      <HeroBanner
        wizardCompleted={state.wizardCompleted}
        onStartWizard={() => navigate('/wizard')}
      />
      <QuickSearchSection
        location={state.location}
        onSelectLocation={selectLandingLocation(dispatch, loadLocationAir)}
      />
      <LandingMonitorSection store={store} aqiScale={aqiScale} />
      <LandingAdvisorySection
        effectivePm25={effectivePm25}
        aqiScale={aqiScale}
        sensitiveGroups={state.family.sensitiveGroups}
        dispatch={dispatch}
      />
      <WizardPreviewGrid
        onOpenStep={(step) => {
          dispatch({ type: 'SET_STEP', step });
          navigate('/wizard');
        }}
      />
    </div>
  );
}
