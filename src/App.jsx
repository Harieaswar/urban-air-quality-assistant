import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import LandingPage from './pages/LandingPage';
import WizardPage from './pages/WizardPage';
import ReportPage from './pages/ReportPage';
import MethodologyPage from './pages/MethodologyPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

function AppShell() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/wizard', label: '4-Step Wizard' },
    { path: '/report', label: 'Report' },
    { path: '/methodology', label: 'Methodology' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <>
      <header>
        <nav className="nav no-print" role="navigation" aria-label="Main navigation">
          <Link to="/" className="nav-logo">
            🛡️ SmogGuard
          </Link>
          <ul className="nav-links">
            {navItems.map((item) => (
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
      <main id="main-content">
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
