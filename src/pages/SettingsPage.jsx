/**
 * @fileoverview Settings & Data Control Page for theme, AQI scale, JSON import/export, restart, and clear data.
 */

import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/state/AppContext';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';

/**
 * Render Settings page for appearance, default AQI scale, JSON import/export, restart, and clearing data.
 * @returns {JSX.Element} Settings page.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { state, dispatch, deleteAllData } = useAppStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importError, setImportError] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smogguard-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const imported = parsed.profile ? parsed.profile : parsed;
        if (!imported || typeof imported !== 'object' || (!imported.location && !imported.family)) {
          throw new Error('Missing required location or family sections in JSON');
        }
        dispatch({ type: 'IMPORT_STATE', payload: imported });
        setImportError(false);
        setImportStatus('✅ Profile imported! Your wizard answers and report have been updated.');
      } catch (err) {
        console.warn('Invalid JSON import:', err);
        setImportError(true);
        setImportStatus('❌ Invalid file format. Please select a valid SmogGuard JSON export.');
      }
    };
    reader.readAsText(file);
  };

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

      <section className="settings-group">
        <GlassCard>
          <span className="settings-label">Export JSON Profile</span>
          <p style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
            Save your entire SmogGuard household profile and preferences to a local JSON file.
          </p>
          <Button onClick={handleExport} icon="📥">
            Export JSON
          </Button>
        </GlassCard>
      </section>

      <section className="settings-group">
        <GlassCard>
          <span className="settings-label">Import JSON Profile</span>
          <p style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
            Restore a previously exported SmogGuard JSON file.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
            aria-label="Import JSON profile file"
          />
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary" icon="📤">
            Import JSON
          </Button>
          {importStatus && (
            <p
              className={importError ? 'field-error' : 'field-help'}
              style={{ marginTop: 'var(--space-sm)' }}
              role={importError ? 'alert' : 'status'}
            >
              {importStatus}
            </p>
          )}
        </GlassCard>
      </section>

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
