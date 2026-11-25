import React, { useState, useEffect } from 'react';

/** Three-way theme toggle: Dark / Light / Solid */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('bg_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bg_theme', theme);
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  const themes = [
    { id: 'light', label: '☀️ Light' },
    { id: 'dark', label: '🌙 Dark' },
    { id: 'solid', label: '■ Solid' },
  ];

  return (
    <div className="theme-toggle-group" role="radiogroup" aria-label="Theme selection">
      {themes.map(t => (
        <button
          key={t.id}
          className={`theme-toggle-btn ${theme === t.id ? 'active' : ''}`}
          onClick={() => setTheme(t.id)}
          role="radio"
          aria-checked={theme === t.id}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
