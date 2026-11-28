# SmogGuard — Frontend-Only Household Air Protection & Low-Emission Planner

SmogGuard is a **100% frontend-only static web application** built with React and Vite. It requires **no backend, no serverless functions, and no API keys** (see [.env.example](.env.example)). All air-quality lookups happen directly in the browser against public keyless Open-Meteo endpoints with coordinate rounding (`0.1°`), `localStorage` caching, and deterministic local calculators that produce a live 10-section **Smog and Air Quality Report**.

---

## Quick Start

### Prerequisites
- **Node.js** 18+ and **npm** 9+
- No environment secrets or API tokens required

### Run Locally
```bash
npm install
npm run dev
```
Open `http://localhost:5173/`.

### Build & Preview Static Output
```bash
npm run build
npm run preview
```
The production build outputs static assets into `dist/`, ready for Firebase Hosting, Netlify, Vercel, or GitHub Pages.

### Available Scripts
| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite frontend development server |
| `npm run build` | Bundle static production files in `dist/` |
| `npm run preview` | Serve static `dist/` bundle locally on port `4173` |
| `npm run lint` | Run strict ESLint (`max-warnings=0`, JSX a11y, complexity, line limits) |
| `npm run lint:fix` | Auto-fix safe ESLint issues across `src/` |
| `npm run format` | Format `src/` and `tests/` with Prettier |
| `npm run format:check` | Verify Prettier formatting without modifying files |
| `npm test` | Run Vitest unit, integration, and `jest-axe` accessibility suites |
| `npm run test:coverage` | Run Vitest suite with V8 coverage reporting |
| `npm run test:e2e` | Run Playwright smoke tests against built `dist/` preview |

---

## Architecture Overview

SmogGuard enforces strict separation between **pure calculation logic**, **network/storage I/O**, **state management**, **UI hooks**, and **presentational components**:

```text
src/
├── calculators/   # Pure, side-effect-free domain math (AQI, exposure, footprint, CADR, payback, routines)
├── constants/     # Breakpoints, category tables, API timeouts/TTLs, numeric bounds, badge definitions
├── data/          # Versioned JSON datasets with published sources, years, and uncertainty ranges
├── hooks/         # React hooks bridging store state and views (useLocationSearch, useReportMetrics, useWizardController)
├── services/      # Browser-only Open-Meteo clients, typed errors, and 30-min localStorage cache + fallbacks
├── state/         # Single-source reducer, AppProvider context, safe JSON persistence & recovery
├── utils/         # Formatters, sanitizers, coordinate/import validators, conservative unknown resolvers
├── components/    # Modular, single-responsibility UI primitives grouped by air, wizard, report, settings, ui
└── pages/         # Top-level routes: LandingPage, WizardPage, ReportPage, MethodologyPage, SettingsPage
```

For full data-flow diagrams, fallback chains, privacy guarantees, and pure-module boundaries, see **[docs/architecture.md](docs/architecture.md)**. Contributors should review **[CONTRIBUTING.md](CONTRIBUTING.md)**.

---

## How This Meets the Brief

| Brief Requirement | How SmogGuard Implements It | Key Files |
|---|---|---|
| **Frontend-only static web app (no backend / no AI / no keys)** | Pure React + Vite static app; `.env.example` documents zero keys required; strict CSP `connect-src` restricted to Open-Meteo hosts | [index.html](index.html), [package.json](package.json), [.env.example](.env.example) |
| **Live keyless Open-Meteo APIs with privacy & resilience** | 300 ms debounced geocoding with `AbortController`, `0.1°` coordinate rounding, 30-min `localStorage` cache, 8 s timeout, ordered fallback (cache → manual PM2.5 → Sample Severe-Smog Day) | [src/services/openMeteo.js](src/services/openMeteo.js), [src/services/airCache.js](src/services/airCache.js), [src/components/air/LocationSearch.jsx](src/components/air/LocationSearch.jsx) |
| **Guided 4-step wizard (`Location`, `Family`, `Rooms`, `Routine`)** | Accessible chip/radio/numeric inputs with `"Other"` (validated text) and `"Not sure"` (`"unknown"` conservative default) on every group; single-source reducer store | [src/pages/WizardPage.jsx](src/pages/WizardPage.jsx), [src/components/wizard/ChoiceGroup.jsx](src/components/wizard/ChoiceGroup.jsx), [src/state/sessionStore.js](src/state/sessionStore.js) |
| **AQI hero card, 24h bars, monitor calibration & sample demo** | India NAQI / US AQI toggle, WHO 2021 guideline ratio, 24-hour PM2.5 bars with data table alternative, monitor calibration, and sample severe-smog episode | [src/components/air/AqiHeroCard.jsx](src/components/air/AqiHeroCard.jsx), [src/components/air/Pm25HourlyChart.jsx](src/components/air/Pm25HourlyChart.jsx) |
| **Low-emission daily routines** | Hour-by-hour daily routine adapted to forecast best/avoid windows, cooking exhaust, commute, and clean-room sleeping plan | [src/calculators/routine.js](src/calculators/routine.js), [src/pages/ReportPage.jsx](src/pages/ReportPage.jsx) |
| **Indoor air quality (IAQ) hacks & room-by-room clean room** | Ranked indoor/outdoor pollution sources, 4-tier preventive measures (`Do now`, `Today`, `This week`, `Later`) with evidence badges, and CADR/ACH/cost purifier sizing | [src/calculators/exposure.js](src/calculators/exposure.js), [src/calculators/purifier.js](src/calculators/purifier.js), [src/data/evidence.json](src/data/evidence.json) |
| **Sustainable alternatives with `"Show the math"`** | CO₂e saved (low/central/high ranges), INR bill savings, payback period, greenwashing guard, overlap guard, and expandable `"Show the math"` on every action & alternative | [src/calculators/impact.js](src/calculators/impact.js), [src/components/cards/ImpactCard.jsx](src/components/cards/ImpactCard.jsx), [src/data/factors.json](src/data/factors.json) |
| **Health advisories & family tailoring** | MoHFW/NCDC category guidance tailored for Children, Older adults, Breathing/heart conditions, and Pregnancy with `"not medical advice"` note | [src/calculators/advisory.js](src/calculators/advisory.js), [src/data/advisories.json](src/data/advisories.json), [src/components/air/HealthAdvisoryCard.jsx](src/components/air/HealthAdvisoryCard.jsx) |
| **WCAG 2.1 AA accessibility** | Skip link, unique page titles, one `<h1>` per page, ARIA combobox, step-heading focus management, `aria-describedby`/`aria-invalid` error links, table alternative for charts, `forced-colors` / `reduced-motion` / `reduced-transparency`, Solid mode | [src/styles/index.css](src/styles/index.css), [src/App.jsx](src/App.jsx) |
