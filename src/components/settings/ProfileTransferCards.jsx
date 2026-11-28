/**
 * @fileoverview JSON profile Export and Import setting sections with file validation feedback.
 */

import React, { useState, useRef } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';

/**
 * Render Export JSON and Import JSON cards for saving or restoring household profiles.
 * @param {Object} props - Current state snapshot and store dispatch.
 * @returns {JSX.Element} Profile transfer section cards.
 */
export default function ProfileTransferCards({ state, dispatch }) {
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
    <>
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
    </>
  );
}
