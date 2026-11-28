/**
 * @fileoverview SmogGuard Landing Page featuring live/cached/demo AQI, 24h bars, and family advisory.
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/state/AppContext';
import GlassCard from '@/components/ui/GlassCard';
import LocationSearch from '@/components/air/LocationSearch';
import AqiHeroCard from '@/components/air/AqiHeroCard';
import HealthAdvisoryCard from '@/components/air/HealthAdvisoryCard';
import { resolveEffectiveAirSeries } from '@/calculators/aqi';

const WIZARD_STEPS_PREVIEW = [
  {
    step: 1,
    title: '1. Location',
    desc: 'City search or coordinates, home type, cooling & rental status',
  },
  {
    step: 2,
    title: '2. Family',
    desc: 'Household size, sensitive members, goals, budget & effort',
  },
  {
    step: 3,
    title: '3. Rooms',
    desc: 'Room dimensions, clean-room candidate, cooking & smoke sources',
  },
  { step: 4, title: '4. Routine', desc: 'Commute, electricity kWh, diet, waste & outdoor timing' },
];

/**
 * Render the SmogGuard landing dashboard and quick-start flow.
 * @returns {JSX.Element} Landing page.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const { state, dispatch, loadLocationAir, loadSampleSevereSmog, applyManualAirReading } =
    useAppStore();

  const aqiScale = state.preferences.aqiScale || 'india_naqi';
  const { effectivePm25 } = resolveEffectiveAirSeries(
    state.air.data,
    state.air.calibration,
    aqiScale
  );

  const handleSelectLocation = async ({ name, lat, lon }) => {
    dispatch({ type: 'UPDATE_LOCATION', payload: { name, lat, lon } });
    dispatch({
      type: 'SET_CALIBRATION',
      payload: { enabled: false, value: null, calibratedAt: null },
    });
    await loadLocationAir({ lat, lon, name });
  };

  return (
    <div className="page-container landing-page">
      <section className="hero-banner glass-card" aria-labelledby="landing-title">
        <div className="hero-banner-content">
          <span className="badge badge--teal">
            100% Static Browser App • Keyless Open-Meteo Data
          </span>
          <h1 id="landing-title" className="hero-title">
            SmogGuard — Household Air Protection & Low-Emission Planner
          </h1>
          <p className="hero-subtitle">
            Check live or cached CAMS PM2.5 forecasts, calibrate with your personal monitor, tailor
            MoHFW/NCDC advisories for your family, and build a room-by-room smog & carbon plan in 4
            guided steps.
          </p>
          <div className="hero-cta-row">
            <button type="button" className="btn btn--primary" onClick={() => navigate('/wizard')}>
              {state.wizardCompleted ? '✏️ Edit 4-Step Wizard' : '🧭 Start 4-Step Wizard'}
            </button>
            <Link to="/report" className="btn btn--secondary">
              📄 View Smog & Air Quality Report
            </Link>
          </div>
        </div>
      </section>

      <section className="page-section" aria-label="Quick location search">
        <GlassCard>
          <LocationSearch
            locationName={state.location.name}
            lat={state.location.lat}
            lon={state.location.lon}
            onSelectLocation={handleSelectLocation}
          />
        </GlassCard>
      </section>

      <section className="page-section" aria-label="Current Air Quality and 24-hour forecast">
        <AqiHeroCard
          airState={state.air}
          aqiScale={aqiScale}
          onToggleScale={(scale) =>
            dispatch({ type: 'UPDATE_PREFERENCES', payload: { aqiScale: scale } })
          }
          onCalibrate={(cal) => dispatch({ type: 'SET_CALIBRATION', payload: cal })}
          onClearCalibration={() =>
            dispatch({
              type: 'SET_CALIBRATION',
              payload: { enabled: false, value: null, calibratedAt: null },
            })
          }
          onLoadSampleDemo={loadSampleSevereSmog}
          onApplyManualPm25={applyManualAirReading}
          onRefreshLive={
            state.location.lat !== null &&
            state.location.lat !== undefined &&
            state.location.lon !== null &&
            state.location.lon !== undefined
              ? () =>
                  loadLocationAir({
                    lat: state.location.lat,
                    lon: state.location.lon,
                    name: state.location.name,
                    forceRefresh: true,
                  })
              : null
          }
        />
      </section>

      <section className="page-section" aria-label="Health advisory">
        <HealthAdvisoryCard
          pm25={effectivePm25}
          aqiScale={aqiScale}
          selectedFamilyIds={state.family.sensitiveGroups}
          onToggleFamilyMember={(id) => dispatch({ type: 'TOGGLE_SENSITIVE_GROUP', id })}
          showChips
        />
      </section>

      <section className="page-section wizard-preview-grid" aria-label="4-Step Wizard Overview">
        {WIZARD_STEPS_PREVIEW.map((item) => (
          <GlassCard key={item.step} className="wizard-step-preview">
            <h2>{item.title}</h2>
            <p>{item.desc}</p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                dispatch({ type: 'SET_STEP', step: item.step });
                navigate('/wizard');
              }}
            >
              Open Step {item.step} →
            </button>
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
