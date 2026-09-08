# DARIUS OSS - Roadmap

The goal is not to build the entire system at once, but to construct a small, correct, extensible, and verifiable core first.

## Phase 0: AUDIT (Current Phase)
- **Goal:** Understand current state and define architecture.
- **Deliverables:**
  - `DARIUS_OSS_AUDIT.md`
  - `DARIUS_OSS_ARCHITECTURE.md`
  - `DARIUS_OSS_ROADMAP.md`
- **Status:** In Progress.

## Phase 1: CORE RUNTIME
- **Goal:** Implement the fundamental units.
- **Deliverables:**
  - Core, Task, State abstractions.
  - Agent and Model abstractions.
  - Basic Tool abstractions.
- **Milestone:** The system can define and track a single, simple Task.

## Phase 2: PLANNER
- **Goal:** Enable complex objective execution.
- **Deliverables:**
  - Task Graph generation.
  - Dependencies and Parallel execution.
  - Retries and Checkpoints.
- **Milestone:** System can break down an objective into multiple linked Tasks.

## Phase 3: TOOL ENGINE
- **Goal:** Robust tool execution and integration.
- **Deliverables:**
  - Tool registry and Permissions.
  - Execution and Validation.
  - Initial MCP adapter.
- **Milestone:** Agents can safely use native and external tools.

## Phase 4: MEMORY
- **Goal:** Persistent and semantic memory.
- **Deliverables:**
  - Memory interface and Local storage.
  - Retrieval, Ranking, and Persistence.
- **Milestone:** Agents can recall information from past tasks and sessions.

## Phase 5: CONTEXT ENGINE
- **Goal:** Optimize LLM context usage.
- **Deliverables:**
  - Context selection and Compression.
  - Retrieval and Token budgeting.
- **Milestone:** No more context overflows; relevant context is injected automatically.

## Phase 6: SKILLS
- **Goal:** Codify procedural knowledge.
- **Deliverables:**
  - Skill loader and Registry.
  - Skill execution and Validation.
- **Milestone:** Agents can load and execute specific workflow templates.

## Phase 7: MULTI-AGENT
- **Goal:** Specialized roles and collaboration.
- **Deliverables:**
  - Delegation mechanisms.
  - Specialized agents (Research, Coder, Critic).
  - Inter-agent communication and lifecycle.
- **Milestone:** Tasks can be passed between specialized agents.

## Phase 8: BACKGROUND TASKS
- **Goal:** Autonomous and recurring execution.
- **Deliverables:**
  - Scheduler, Recurring, and Long-running tasks.
  - Checkpoints and Notifications.
- **Milestone:** DARIUS can execute tasks periodically without human triggers.

## Phase 9: BROWSER
- **Goal:** Web interaction capability.
- **Deliverables:**
  - Browser abstraction and adapters.
- **Milestone:** Agents can safely navigate and extract data from the web.

## Phase 10: ARTIFACTS
- **Goal:** Structured output management.
- **Deliverables:**
  - Artifact Engine to track code, documents, and media generation.
- **Milestone:** DARIUS can produce and version verifiable outputs.

## Phase 11: OBSERVABILITY
- **Goal:** System visibility and tracing.
- **Deliverables:**
  - Logs, metrics, traces.
  - Cost and execution history tracking.
- **Milestone:** Full visibility into what the system did and why.

## Phase 12: SECURITY HARDENING
- **Goal:** Enterprise-grade security.
- **Deliverables:**
  - Audits of permissions, sandbox, secrets, and network.
  - Protection against prompt injection and data leakage.
- **Milestone:** A highly secure and resilient runtime.
