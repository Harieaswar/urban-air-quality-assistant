/**
 * @fileoverview Settings & Data Control Page for theme, AQI scale, JSON import/export, restart, and clear data.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/state/AppContext';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import ProfileTransferCards from '@/components/settings/ProfileTransferCards';

/**
 * Render Settings page for appearance, default AQI scale, JSON import/export, restart, and clearing data.
 * @returns {JSX.Element} Settings page.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { state, dispatch, deleteAllData } = useAppStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  return (
    <div className="page-container">
      <h1 className="page-title">⚙️ Settings & Data Control</h1>

      <section className="settings-group">
        <GlassCard>
          <span className="settings-label">Appearance Theme (Glassmorphic / Light / Solid)</span>
          <ThemeToggle
            value={state.preferences.theme}
            onChange={(theme) => dispatch({ type: 'UPDATE_PREFERENCES', payload: { theme } })}
          />
        </GlassCard>
      </section>

      <section className="settings-group">
        <GlassCard>
          <span className="settings-label">Default AQI Scale</span>
          <div className="scale-toggle" role="group" aria-label="Default AQI scale">
            <button
              type="button"
              className={`scale-btn ${state.preferences.aqiScale === 'india_naqi' ? 'active' : ''}`}
              aria-pressed={state.preferences.aqiScale === 'india_naqi'}
              onClick={() =>
                dispatch({ type: 'UPDATE_PREFERENCES', payload: { aqiScale: 'india_naqi' } })
              }
            >
              India NAQI (CPCB)
            </button>
            <button
              type="button"
              className={`scale-btn ${state.preferences.aqiScale === 'us_aqi' ? 'active' : ''}`}
              aria-pressed={state.preferences.aqiScale === 'us_aqi'}
              onClick={() =>
                dispatch({ type: 'UPDATE_PREFERENCES', payload: { aqiScale: 'us_aqi' } })
              }
            >
              US AQI (EPA)
            </button>
          </div>
        </GlassCard>
      </section>

      <ProfileTransferCards state={state} dispatch={dispatch} />

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
              <Button
                onClick={() => {
                  dispatch({ type: 'RESTART' });
                  setConfirmRestart(false);
                  navigate('/wizard');
                }}
              >
                Confirm Restart
              </Button>
              <Button onClick={() => setConfirmRestart(false)} variant="ghost">
                Cancel
              </Button>
            </div>
          )}
        </GlassCard>
      </section>

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
                onClick={() => {
                  deleteAllData();
                  setConfirmDelete(false);
                  navigate('/');
                }}
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

      <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
        <Link to="/" className="btn btn--primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
