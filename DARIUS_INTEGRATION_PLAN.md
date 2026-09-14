# DARIUS OSS — INTEGRATION PLAN

This plan maps the integration required to transport the lost evolutionary features (Core Hardening, Server/API, Web, Finance, Mobile) into the official RC1 branch safely.

## 1. Core Hardening
* **Dependencies:** None.
* **Expected Files:** `src/core/engine.ts`, `src/core/types.ts`, `src/core/sqlite.ts`
* **Potential Conflicts:** The runaway loop bug on `PAUSED` status needs to be fixed without destroying idempotency locks from RC1.
* **Safe Order:** 1st
* **Tests Needed:** `pause`, `resume`, `reject`, `cancel`, `retry + pause`, `verification + pause`.

## 2. Server/API
* **Dependencies:** `express`, `cors`, `@types/express`, `@types/cors`.
* **Expected Files:** `src/server.ts`, `src/api/adapter.ts`, `package.json` (deps).
* **Potential Conflicts:** API adapter changes in the lost branches might conflict with the `DARIUSUIAdapter` natively present in RC1.
* **Safe Order:** 2nd
* **Tests Needed:** API contract validation (health, dashboard, tasks, agents), CORS boundary validation (localhost only).

## 3. Web
* **Dependencies:** `react`, `react-dom`, `vite`, `tailwindcss` (All managed within `web/package.json`).
* **Expected Files:** `web/` directory (extracted from `DARIUS_WEB_EXPORT.zip`).
* **Potential Conflicts:** Ensure API calls match the new `server.ts` routes securely.
* **Safe Order:** 3rd
* **Tests Needed:** `tsc -b` and `vite build` inside `web/`.

## 4. Plugin System
* **Dependencies:** None.
* **Expected Files:** `src/plugins/host.ts`, `src/plugins/types.ts`.
* **Potential Conflicts:** Interaction with the core Task Engine. Plugin registration must be decoupled.
* **Safe Order:** 4th
* **Tests Needed:** Registration tests, isolation tests.

## 5. Finance
* **Dependencies:** None (kept deterministic via mocks).
* **Expected Files:** `src/plugins/finance/`.
* **Potential Conflicts:** Core importing Finance. Must ensure Core remains agnostic and Finance is purely a plugin.
* **Safe Order:** 5th
* **Tests Needed:** Vertical scenarios (`CRYPTO_CRASH_50`, `EQUITY_BEAR_30`), approval gate tests.

## 6. Mobile
* **Dependencies:** `expo`, `react-native`.
* **Expected Files:** `mobile/` directory (scaffold).
* **Potential Conflicts:** None. Just file placement.
* **Safe Order:** 6th
* **Tests Needed:** `DARIUS_MOBILE_CHECKLIST.md` generation.
