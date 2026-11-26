/**
 * @fileoverview Reusable three-way theme selector (Dark / Light / Solid).
 */

import React from 'react';

const THEME_OPTIONS = [
  { id: 'dark', label: '🌙 Dark' },
  { id: 'light', label: '☀️ Light' },
  { id: 'solid', label: '■ Solid' },
];

/**
 * Three-way radiogroup theme selector synced to the application store.
 * @param {{ value: string, onChange: function(string): void }} props - Current theme and setter.
 * @returns {JSX.Element} Theme toggle control.
 */
export default function ThemeToggle({ value = 'dark', onChange }) {
  return (
    <div className="theme-toggle-group" role="radiogroup" aria-label="Theme selection">
      {THEME_OPTIONS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          className={`theme-toggle-btn ${value === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
