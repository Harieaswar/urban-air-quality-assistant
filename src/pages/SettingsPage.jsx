/**
 * @fileoverview Settings & Data Control Page for theme, AQI scale, JSON import/export, restart, and clear data.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, GlassCard, ProfileTransferCards, ThemeToggle } from '@/components';
import { useAppStore } from '@/state';

function ThemeSettingCard({ theme, onChangeTheme }) {
  return (
    <section className="settings-group">
      <GlassCard>
        <span className="settings-label">Appearance Theme (Glassmorphic / Light / Solid)</span>
        <ThemeToggle value={theme} onChange={onChangeTheme} />
      </GlassCard>
    </section>
  );
}

function AqiScaleCard({ aqiScale, onSelectScale }) {
  return (
    <section className="settings-group">
      <GlassCard>
        <span className="settings-label">Default AQI Scale</span>
        <div className="scale-toggle" role="group" aria-label="Default AQI scale">
          <button
            type="button"
            className={`scale-btn ${aqiScale === 'india_naqi' ? 'active' : ''}`}
            aria-pressed={aqiScale === 'india_naqi'}
            onClick={() => onSelectScale('india_naqi')}
          >
            India NAQI (CPCB)
          </button>
          <button
            type="button"
            className={`scale-btn ${aqiScale === 'us_aqi' ? 'active' : ''}`}
            aria-pressed={aqiScale === 'us_aqi'}
            onClick={() => onSelectScale('us_aqi')}
          >
            US AQI (EPA)
          </button>
        </div>
      </GlassCard>
    </section>
  );
}

function RestartWizardCard({ confirmRestart, setConfirmRestart, onConfirm }) {
  return (
    <section className="settings-group">
      <GlassCard>
        <span className="settings-label">Restart Wizard</span>
        <p style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
          Reset wizard answers back to step 1 while keeping your selected theme and AQI scale.
        </p>
        {!confirmRestart ? (
          <Button onClick={() => setConfirmRestart(true)} variant="secondary" icon="🔄">
            Restart Wizard
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <Button onClick={onConfirm}>Confirm Restart</Button>
            <Button onClick={() => setConfirmRestart(false)} variant="ghost">
              Cancel
            </Button>
          </div>
        )}
      </GlassCard>
    </section>
  );
}

function DeleteDataCard({ confirmDelete, setConfirmDelete, onConfirmDelete }) {
  return (
    <section className="settings-group">
      <GlassCard>
        <span className="settings-label">Delete All My Data</span>
        <p style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
          Permanently remove all saved SmogGuard profile answers and cached Open-Meteo forecasts
          from this browser.
        </p>
        {!confirmDelete ? (
          <Button onClick={() => setConfirmDelete(true)} variant="secondary" icon="🗑️">
            Delete all my data
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--primary"
              style={{ background: 'var(--danger)' }}
              onClick={onConfirmDelete}
            >
              Yes, Delete All My Data
            </button>
            <Button onClick={() => setConfirmDelete(false)} variant="ghost">
              Cancel
            </Button>
          </div>
        )}
      </GlassCard>
    </section>
  );
}

function SettingsDangerActions({ state, dispatch, deleteAllData, navigate }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  return (
    <>
      <ProfileTransferCards state={state} dispatch={dispatch} />
      <RestartWizardCard
        confirmRestart={confirmRestart}
        setConfirmRestart={setConfirmRestart}
        onConfirm={() => {
          dispatch({ type: 'RESTART' });
          setConfirmRestart(false);
          navigate('/wizard');
        }}
      />
      <DeleteDataCard
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
        onConfirmDelete={() => {
          deleteAllData();
          setConfirmDelete(false);
          navigate('/');
        }}
      />
    </>
  );
}

/**
 * Render Settings page for appearance, default AQI scale, JSON import/export, restart, and clearing data.
 * @returns {JSX.Element} Settings page.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { state, dispatch, deleteAllData } = useAppStore();

  return (
    <div className="page-container">
      <h1 className="page-title">⚙️ Settings & Data Control</h1>
      <ThemeSettingCard
        theme={state.preferences.theme}
        onChangeTheme={(theme) => dispatch({ type: 'UPDATE_PREFERENCES', payload: { theme } })}
      />
      <AqiScaleCard
        aqiScale={state.preferences.aqiScale}
        onSelectScale={(aqiScale) =>
          dispatch({ type: 'UPDATE_PREFERENCES', payload: { aqiScale } })
        }
      />
      <SettingsDangerActions
        state={state}
        dispatch={dispatch}
        deleteAllData={deleteAllData}
        navigate={navigate}
      />
      <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
        <Link to="/" className="btn btn--primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
