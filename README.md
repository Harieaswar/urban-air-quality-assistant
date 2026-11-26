# SmogGuard — Frontend-Only Household Air Protection & Low-Emission Planner

SmogGuard is a **100% frontend-only static web application** (React + Vite) with no backend and no API keys. It fetches keyless public forecasts from Open-Meteo directly in the browser, computes personalized indoor exposure, purifier CADR sizing, and carbon footprints with pure JavaScript calculators, and generates a printable 10-section **Smog and Air Quality Report**.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

### Scripts
- `npm run dev` — Start Vite development view
- `npm run build` — Build static bundle in `dist/`
- `npm run preview` — Preview static `dist/` build locally
- `npm run lint` — Run ESLint across `src/`
- `npm run format:check` — Verify Prettier formatting
- `npm test` — Run Vitest unit, accessibility (`jest-axe`), and component tests
- `npm run test:coverage` — Run tests with V8 coverage report
- `npm run test:e2e` — Run Playwright end-to-end test against static preview

## How This Meets the Brief

| Brief Requirement | How SmogGuard Implements It | Key Files |
|---|---|---|
| **Frontend-only static web app (no backend / no AI / no keys)** | Pure React + Vite static app; `.env.example` documents zero keys required; strict CSP `connect-src` restricted to Open-Meteo hosts | [index.html](index.html), [package.json](package.json), [.env.example](.env.example) |
| **Live keyless Open-Meteo APIs with privacy & resilience** | 300 ms debounced geocoding with `AbortController`, `0.1°` coordinate rounding, 30-min `localStorage` cache, 8 s timeout, ordered fallback (cache → manual PM2.5 → Sample Severe-Smog Day) | [src/services/openMeteo.js](src/services/openMeteo.js), [src/components/air/LocationSearch.jsx](src/components/air/LocationSearch.jsx) |
| **Guided 4-step wizard (`Location`, `Family`, `Rooms`, `Routine`)** | Accessible chip/radio/numeric inputs with `"Other"` (validated text) and `"Not sure"` (`"unknown"` conservative default) on every group; single-source reducer store | [src/pages/WizardPage.jsx](src/pages/WizardPage.jsx), [src/components/wizard/ChoiceGroup.jsx](src/components/wizard/ChoiceGroup.jsx), [src/state/sessionStore.js](src/state/sessionStore.js) |
| **AQI hero card, 24h bars, monitor calibration & sample demo** | India NAQI / US AQI toggle, WHO 2021 guideline ratio, 24-hour PM2.5 bars with data table alternative, monitor calibration, and sample severe-smog episode | [src/components/air/AqiHeroCard.jsx](src/components/air/AqiHeroCard.jsx), [src/components/air/Pm25HourlyChart.jsx](src/components/air/Pm25HourlyChart.jsx) |
| **Low-emission daily routines** | Hour-by-hour daily routine adapted to forecast best/avoid windows, cooking exhaust, commute, and clean-room sleeping plan | [src/calculators/routine.js](src/calculators/routine.js), [src/pages/ReportPage.jsx](src/pages/ReportPage.jsx) |
| **Indoor air quality (IAQ) hacks & room-by-room clean room** | Ranked indoor/outdoor pollution sources, 4-tier preventive measures (`Do now`, `Today`, `This week`, `Later`) with evidence badges, and CADR/ACH/cost purifier sizing | [src/calculators/exposure.js](src/calculators/exposure.js), [src/calculators/purifier.js](src/calculators/purifier.js), [src/data/evidence.json](src/data/evidence.json) |
| **Sustainable alternatives with `"Show the math"`** | CO₂e saved (low/central/high ranges), INR bill savings, payback period, greenwashing guard, overlap guard, and expandable `"Show the math"` on every action & alternative | [src/calculators/impact.js](src/calculators/impact.js), [src/components/cards/ImpactCard.jsx](src/components/cards/ImpactCard.jsx), [src/data/factors.json](src/data/factors.json) |
| **Health advisories & family tailoring** | MoHFW/NCDC category guidance tailored for Children, Older adults, Breathing/heart conditions, and Pregnancy with `"not medical advice"` note | [src/calculators/advisory.js](src/calculators/advisory.js), [src/data/advisories.json](src/data/advisories.json), [src/components/air/HealthAdvisoryCard.jsx](src/components/air/HealthAdvisoryCard.jsx) |
| **WCAG 2.1 AA accessibility** | Skip link, unique page titles, one `<h1>` per page, ARIA combobox, step-heading focus management, `aria-describedby`/`aria-invalid` error links, table alternative for charts, `forced-colors` / `reduced-motion` / `reduced-transparency`, Solid mode | [src/styles/index.css](src/styles/index.css), [src/App.jsx](src/App.jsx) |
