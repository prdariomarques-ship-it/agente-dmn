# DARIUS OSS - Roadmap

The goal is not to build the entire system at once, but to construct a small, correct, extensible, and verifiable core first.

## Phase 0: AUDIT (Current Phase)
- **Goal:** Understand current state and define architecture.
- **Status:** COMPLETED

## Phase 1: CORE RUNTIME
- **Goal:** Implement the fundamental units.
- **Status:** COMPLETED

## Phase 2: PLANNER
- **Goal:** Enable complex objective execution.
- **Status:** COMPLETED

## Phase 3: TOOL ENGINE
- **Goal:** Robust tool execution and integration.
- **Status:** COMPLETED

## Phase 4.5: PERSISTENCE & RECOVERY (New Priority)
- **Goal:** Survive process restarts and explicitly separate Task State from Memory.
- **Deliverables:**
  - TaskStore, ExecutionStore, EventStore, CheckpointStore.
  - State persistence and Crash recovery (`resume()`).
  - Idempotency mechanisms to prevent duplicate side effects.
- **Milestone:** Process can crash during Observe/Think/Act and safely recover.
- **Status:** IN PROGRESS

## Phase 4: MEMORY
- **Goal:** Persistent and semantic memory (Short-term, Session, Episodic, Semantic, Procedural, Long-term).
- **Status:** COMPLETED (Moved to interface implementation, will integrate further after Persistence phase)

## Phase 5: CONTEXT ENGINE
- **Goal:** Optimize LLM context usage (Retrieval, compression, token budgeting).
- **Status:** PENDING

## Phase 6: SKILLS
- **Goal:** Codify procedural knowledge.
- **Status:** PENDING

## Phase 7: MULTI-AGENT
- **Goal:** Specialized roles and collaboration.
- **Status:** PENDING

## Phase 8: BACKGROUND TASKS
- **Goal:** Autonomous, long-running, and recurring execution.
- **Status:** PENDING

## Phase 9: BROWSER
- **Goal:** Web interaction capability.
- **Status:** PENDING

## Phase 10: ARTIFACTS
- **Goal:** Structured output management.
- **Status:** PENDING

## Phase 11: OBSERVABILITY
- **Goal:** System visibility and tracing.
- **Status:** PENDING

## Phase 12: SECURITY HARDENING
- **Goal:** Enterprise-grade security.
- **Status:** PENDING
