/**
 * @fileoverview JSON profile Export and Import setting sections with centralized validation feedback.
 */

import React, { useState, useRef } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import { TIME_UNITS } from '@/constants';
import { validateProfileImport } from '@/utils/validate';

function downloadProfileSnapshot(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smogguard-profile-${new Date().toISOString().slice(0, TIME_UNITS.ISO_DATE_PREFIX_LEN)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportProfileCard({ onExport }) {
  return (
    <section className="settings-group">
      <GlassCard>
        <span className="settings-label">Export JSON Profile</span>
        <p style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
          Save your entire SmogGuard household profile and preferences to a local JSON file.
        </p>
        <Button onClick={onExport} icon="📥">
          Export JSON
        </Button>
      </GlassCard>
    </section>
  );
}

function ImportProfileCard({ fileInputRef, onFileChange, importStatus, importError }) {
  return (
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
          onChange={onFileChange}
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
  );
}

/**
 * Render Export JSON and Import JSON cards for saving or restoring household profiles.
 * @param {Object} props - Current state snapshot and store dispatch.
 * @returns {JSX.Element} Profile transfer section cards.
 */
export default function ProfileTransferCards({ state, dispatch }) {
  const [importStatus, setImportStatus] = useState('');
  const [importError, setImportError] = useState(false);
  const fileInputRef = useRef(null);

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const check = validateProfileImport(String(evt.target?.result || ''));
      if (!check.valid) {
        setImportError(true);
        setImportStatus('❌ Invalid file format. Please select a valid SmogGuard JSON export.');
        return;
      }
      dispatch({ type: 'IMPORT_STATE', payload: check.data });
      setImportError(false);
      setImportStatus('✅ Profile imported! Your wizard answers and report have been updated.');
    };
    reader.readAsText(file);
  };

  return (
    <>
      <ExportProfileCard onExport={() => downloadProfileSnapshot(state)} />
      <ImportProfileCard
        fileInputRef={fileInputRef}
        onFileChange={handleImport}
        importStatus={importStatus}
        importError={importError}
      />
    </>
  );
}
