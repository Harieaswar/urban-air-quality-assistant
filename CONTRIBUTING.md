# Contributing to SmogGuard

Thank you for helping improve **SmogGuard**! Because SmogGuard serves households during high-smog episodes and intentionally runs as a zero-secret browser app, contributors must maintain strict architectural and quality invariants.

---

## Core Invariants

1. **100% Frontend-Only & Secret-Free**
   - Never add a backend server, proxy endpoint, serverless function, LLM/AI SDK, `.env` secrets, or API tokens.
   - External requests must stay strictly keyless and listed in the `connect-src` CSP directive in `index.html`.
2. **Pure Calculators**
   - Code inside `src/calculators/` and `src/utils/` must remain side-effect-free (no `fetch`, no DOM reads/writes, no `localStorage`).
   - All numeric assumptions and emission factors must cite source, year, and uncertainty bounds in `src/data/` or `src/constants/`.
3. **Guided Accessibility First**
   - Every wizard choice group supports `"Other"` (with accessible text validation) and `"Not sure"` (conservative default).
   - Preserve skip links, landmark roles, keyboard combobox navigation, `aria-invalid`/`aria-describedby` links, chart data tables, and reduced-motion/high-contrast CSS modes.

---

## Code Quality Standards (Enforced via ESLint + Prettier)

Running `npm run lint` and `npm run format:check` validates:
- **Zero warnings policy** (`--max-warnings=0`)
- **Max file length:** `200` lines (`max-lines`)
- **Max function length:** `40` code lines (`max-lines-per-function`)
- **Max cyclomatic complexity:** `10` (`complexity`)
- **Max nesting depth:** `3` (`max-depth`) and **max parameters:** `4` (`max-params`)
- **No console logs** (`no-console`), **no nested ternaries** (`no-nested-ternary`), **no magic numbers** (`no-magic-numbers`, except inside `src/constants/`)
- **JSDoc required** (`@fileoverview` header per module; `@param` and `@returns` on all exported functions)

---

## Development & Verification Workflow

Before opening a pull request, run:

```bash
npm run format
npm run lint
npm run test:coverage
npm run build
```

All tests (Vitest unit, storage recovery, Open-Meteo fallback/timeout/HTTP error tests, and `jest-axe` page audits) must pass cleanly, preserving **≥ 90% coverage** on `src/calculators/` and `src/services/`.
