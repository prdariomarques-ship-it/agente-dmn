# DARIUS OSS - Architecture Matrix Report

This matrix compares the target architecture defined in `DARIUS_OSS_ARCHITECTURE.md` against the real code implementation currently present in the repository, highlighting the "Architecture Drift" and defining exactly what is real, what is an interface, and what is merely roadmap.

| Component | Contract | Implementation | Persistent | Tested | Integrated |
|---|:---:|:---:|:---:|:---:|:---:|
| **Core** | ✓ | ✓ | ✓ | ✓ | ? |
| **Task Engine** | ✓ | ✓ | ✓ | ✓ | ? |
| **Planner** | ✓ | ✓ | ✓ (via Core) | ✓ | ? |
| **State** | ✓ | ✓ | ✓ | ✓ | ? |
| **Persistence** | ✓ | ✓ (SQLite) | ✓ | ✓ | ? |
| **Memory** | ✓ | ✓ (InMemoryMVP) | ? | ✓ | ? |
| **Model** | ✓ | parcial | N/A | ? | ? |
| **Tools** | ✓ | parcial | N/A | ✓ | ? |
| **MCP** | ✓ | parcial | N/A | ? | ? |
| **Skills** | ✓ | futuro | N/A | — | — |
| **Multi-Agent** | ✓ | futuro | — | — | — |
| **Background** | ✓ | parcial? | ? | ? | ? |
| **Browser** | ✓ | futuro | — | — | — |
| **Verification** | ✓ | parcial | — | ? | ? |
| **Security** | ✓ | parcial (HITL) | — | ✓ | ? |
| **Observability** | ✓ | parcial (API UI)| ? | ✓ | ? |

## Analysis of the Matrix
- **Core, Task Engine, Planner, State, Persistence**: These are fully implemented in TypeScript (`src/core`, `src/planner`). They have strong interfaces, SQLite implementations, and pass strict unit testing including crash-survival simulations. However, their integration with the wider legacy systems (Telegram bot) is still pending ("?").
- **Memory**: The semantic Memory Engine exists with interfaces and an InMemory adapter (`src/memory`), but it is not yet backed by a true persistent DB (like the new SQLite core).
- **Tools, Model, Security**: Tools have risk-level enforcement and HITL loops. However, the true LLM Model adapters are "partial" (legacy Python code might exist but isn't wired to the TS core).
- **Architecture Drift**: The Python/Hexagonal implementations (`darius/jobs`, `runtime/ollama.py`) mentioned in legacy PRs are currently disconnected from this TypeScript Core Runtime. We must converge the TS `TaskEngine` and the Python `LLMAdapters` into a unified execution flow before building new layers like Skills.

## Recommended Next Phase
We must converge the Model Layer. We have a robust, crash-survivable TS Core Runtime, but no actual LLM binding natively integrated into this new `TaskEngine`. We should wire a real Model adapter into the `Agent.observe/think/act` pipeline before advancing to Context Engine or Skills.
