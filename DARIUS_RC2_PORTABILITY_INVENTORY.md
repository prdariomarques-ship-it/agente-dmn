# DARIUS OSS — RC2 PORTABILITY INVENTORY

This inventory explicitly maps what the GLM agent should port back into the frozen RC2 remote history.

## 1. READY TO PORT
- `web/src/pages/Dashboard.tsx` (Stitch UI implementation)
- `web/src/pages/Tasks.tsx` (Stitch UI execution flow and HITL logic)
- `web/src/pages/Agents.tsx` (Stitch UI)
- `web/src/pages/AgentDetails.tsx` (Stitch UI)
- `web/src/pages/Memory.tsx` (Stitch UI)
- `web/src/pages/Skills.tsx` (Stitch UI)
- `web/src/pages/Logs.tsx` (Stitch UI)
- `web/src/pages/Finance.tsx` (Stitch UI mock for plugin)
- `web/src/App.tsx` (Stitch UI router map)
- `web/tailwind.config.js` (Obsidian palette tokens)
- `src/server.ts` (Express/CORS localhost implementation mapping UI to Engine)

## 2. NEEDS ADAPTATION
- `mobile/App.js` (Scaffold only. Expo configuration needs exact IP address binding matching the execution environment during build time).

## 3. BACKEND GAPS
The UI implementation exposes the following gaps in the underlying API contract which must be resolved locally by GLM in the core engine API adapters if full functionality is required:
- `API GAP — GET /api/finance/portfolio` (Returns 501 Not Implemented. Needs the actual Finance orchestrator).
- `API GAP — GET /api/memory` (Adapter logic missing to parse vector store to JSON schema expected by UI).
- `API GAP — GET /api/skills` (Adapter logic missing to format skill registry properly).

## 4. MOBILE ONLY
- `DARIUS_MOBILE_CHECKLIST.md`
- `DARIUS_ANDROID_HANDOFF.md`
- `DARIUS_TERMUX_DEPLOYMENT.md`

## 5. DO NOT PORT
- Raw tests created in the sandbox to prove `getAgents` or state machine behavior unless GLM has not already built more robust equivalents in the `157` test suite pool. Do not blindly overwrite GLM's test architecture.
