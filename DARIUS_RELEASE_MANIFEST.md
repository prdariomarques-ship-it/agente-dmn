# DARIUS RELEASE MANIFEST — RC1+ (freeze candidate)

Branch: `feature/darius-finance` · HEAD: `78708e830e43d287fd1f86e9fb066d7c628edeff`
Gerado em 2026-09-13 pela operação "FINAL RC HARDING + RC FREEZE PREP".
**Nenhuma tag foi criada. Nenhuma operação remota foi executada.**

## RC1 BASE
- `3b791ac` — release: finalize DARIUS OSS RC1 (único RC1 verificável; `cec1b02` não existe como objeto)
- `c7c2e55` — `main` (gateway Telegram), ancestral direto do RC1 (merge-base confirmado)
- `0d8fb00` — camada herdada pós-RC1 (Stitch UI, bot fix, web export — 8 commits de terceiros)

## HARDENING (Core)
- `724bb7b` — feat(finance): vertical + contrato de plugins + patch approval gate (100% aditivo)
- `a44a6a7` — fix(core): approval-gate "Store = authoritative state" (syncWithStore + 9 testes)
- `f60a58b` — fix(core): timeout mede só tempo ativo — WAITING_APPROVAL não consome orçamento
  (D1/D2 reproduzidos deterministicamente e corrigidos; 7 testes de budget)
- `68ea982` — test(core): prova estática de isolamento Core↔plugins

## API / SERVER
- `cd69c6b` — feat(server): HTTP API oficializada como adapter puro (express/cors adicionados)
- `bd204f4` — fix(api): /api/agents 500 (JSON circular), leak de internos em /agents/:id,
  guards de decisão Finance (409)
- `6ce2c20` / `01bd99b` — docs: relatórios de hardening e validação RC
- `eacc604` — feat(server): fronteira de auth mínima opt-in `DARIUS_API_TOKEN` (timing-safe,
  /api/health aberto; localhost sem token permanece idêntico)
- `200251f` — fix(api): contrato no-CoT forçado no trace de `/api/tasks/:id`

## WEB
- `0c7489d` — feat(web): fonte restaurada do export + conectada ao contrato da API (7 páginas)
- `78708e8` — feat(web): badge distinto para CANCELLED
- Build: `npm install` limpo + `vite build` PASS (98 módulos) + `tsc --noEmit` 0 erros; `dist/` ignorado

## FINANCE
- Vertical completo em `src/plugins/finance/**` (plugin `finance@0.1.0` via PluginHost)
- 5 tools READ-only auditadas (4 LOW + 1 MEDIUM), timeout declarado, sem dump de params nos logs
- Providers mock determinísticos (`isLive: false`), cotação nunca inventada para símbolo desconhecido
- E2E: approve → COMPLETED verificado; reject → FAILED explícito; cenários determinísticos
- Relatório sobrevive a restart real (teste de reabertura de store SQLite)
- Sem broker, ordens, dinheiro real, shell, fs ou rede (scan limpo)

## MOBILE
- Scaffold Expo confirmado (`mobile/App.js` placeholder + `package.json` SDK 51; axios declarado, não usado)
- SEM APK — não alegado. Gaps: app.json/eas.json ausentes, UI/API client por fazer,
  entrega de token ao app (arquitetural), validação em device/emulador impossível neste ambiente

## TESTS (estado no HEAD)
- Backend: **152/152 testes** (34 arquivos) — inclui budget semantics (7), approval security matrix,
  persistência pós-restart, isolamento estático (2), no-CoT adapter, guards de decisão
- Typecheck: `tsc --noEmit` **0 erros** (backend e web)
- Smokes ao vivo: server 22/22 (endpoints, CORS allowlist/preflight, input inválido, 404/400/409)
  + auth 10/10 (Bearer/x-darius-token, 401, health aberto, legacy sem env)
- Bot Telegram: fail-fast sem token; isolado das mudanças (só grammy + access.js)

## SECURITY
- Scan de secrets/PII: limpo (`.env.example` só placeholders; nenhum valor real commitado)
- Scan de padrões perigosos (child_process/eval/innerHTML/CORS wildcard/shell): limpo
- CORS allowlist (nunca `*`), métodos GET/POST, bind loopback por default
- Ferramentas de risco HIGH/CRITICAL bloqueadas por policy no default
- Limitação conhecida pré-RC1: `POST /api/tasks` sem auth quando `DARIUS_API_TOKEN` não definido

## DEPENDÊNCIAS (classificação — SEM auto-update, fixes exigem mudança breaking)
- Backend: 4 moderate — `@vitest/mocker` (dev-only), `qs` via express (DoS; breaking)
- Web: `vite` **high** (dev-server: path traversal em optimized deps; launch-editor UNC/Windows —
  não afeta o build de produção; fix = vite@8 breaking) + `react-router` 2× moderate (fix v7 breaking)

## KNOWN LIMITATIONS (documentadas, não bloqueiam)
- Path B de resume (`resumeTask` após saída do loop) concede fatia fresca de orçamento por
  aprovação — semântica pragmática documentada; sem retry infinito (exige decisão humana)
- Caminho simples armazena resultado com prefixo "DONE: " (cosmético, pré-RC1)
- `registerCustomVerifier` permite sobrescrever verificador (benigno no uso atual)
- Entrega de token para browser UI = decisão arquitetural pendente
- Sem E2E em dispositivo/emulador Android nesta rodada

## REMOTE STATUS
- **NENHUMA operação remota**: sem push, merge, force-push, rebase ou tag
- `469e8b1` (remote tip phase-0, branch destrutiva que deletou src/) confirmado FORA do histórico
- `origin/main` = `c7c2e55` (intocado); nosso HEAD não existe em nenhum remote
- Checkpoint local: `checkpoint/hardening-start` = `724bb7b`
