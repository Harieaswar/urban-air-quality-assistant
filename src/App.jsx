/**
 * @fileoverview Root SmogGuard router, skip-to-content link, navigation bar, and route titles.
 */

import React, { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import LandingPage from './pages/LandingPage';
import WizardPage from './pages/WizardPage';
import ReportPage from './pages/ReportPage';
import MethodologyPage from './pages/MethodologyPage';
import SettingsPage from './pages/SettingsPage';

const NAV_ITEMS = [
  { path: '/', label: 'Home', title: 'SmogGuard — Home & Live Air Monitor' },
  { path: '/wizard', label: '4-Step Wizard', title: 'SmogGuard — 4-Step Household Wizard' },
  { path: '/report', label: 'Report', title: 'SmogGuard — Smog and Air Quality Report' },
  { path: '/methodology', label: 'Methodology', title: 'SmogGuard — Methodology & Data Sources' },
  { path: '/settings', label: 'Settings', title: 'SmogGuard — Settings & Data Control' },
];

/**
 * Root application component wrapping routes in the persistent `AppProvider`.
 * @returns {JSX.Element} Application root.
 */
export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

function AppShell() {
  const location = useLocation();

  useEffect(() => {
    const match = NAV_ITEMS.find((n) => n.path === location.pathname);
    document.title = match
      ? match.title
      : 'SmogGuard — Household Air Quality & Low-Emission Planner';
  }, [location.pathname]);

  return (
    <>
      <a href="#main-content" className="skip-link no-print">
        Skip to main content
      </a>
      <header>
        <nav className="nav no-print" aria-label="Main navigation">
          <Link to="/" className="nav-logo">
            🛡️ SmogGuard
          </Link>
          <ul className="nav-links">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={location.pathname === item.path ? 'active' : ''}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/wizard" element={<WizardPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </>
  );
}
