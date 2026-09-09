# DARIUS OSS — RC1 LIVE CONNECTIVITY REPORT

## AMBIENTE & TOPOLOGIA
- **Stitch:** BLOCKED (Não detectado no ambiente atual).
- **DARIUS RC1:** Presente no host local (`192.168.0.2`), rodando estaticamente via Node/Vitest no port padrão não ativado de listener HTTP.
- **Proxy/Network:** BLOCKED (Não detectado ou configurado nas variáveis de ambiente).
- **Ollama / Real Provider:** BLOCKED (`curl: (7) Failed to connect to localhost port 11434`). Nenhuma variável de endpoint remoto mapeada via env vars (`OPENAI_API_KEY`, etc) configurada.
- **Variáveis de Ambiente:** Nenhuma variável contendo IPs ou URLs externas injetada na sessão atual (apenas confs padrão do Ubuntu bash).

## TESTES EXECUTADOS

### CHECKPOINT 1 & 2: NETWORK PROBE
- Stitch → Proxy/DARIUS: **BLOCKED**
- DARIUS → Provider (127.0.0.1:11434): **FAIL** (Connection refused)
- Provider → Model: **BLOCKED**

### CHECKPOINT 3: DIRECT MODEL VALIDATION
- **Resultado:** BLOCKED. O ambiente de container isolado atual recusa rotas ativas ao Ollama e não contém endpoints alternativos de teste na variável de ambiente. A validação do streaming e da resposta do modelo falhou na etapa de conexão TCP.

### CHECKPOINT 4, 5, 6, 7: DARIUS INTEGRATION COM MODELO REAL
- **Resultado:** BLOCKED. Devido ao bloqueio na etapa 3, é inviável engatar o motor DARIUS (`TaskEngine`) em uma malha de rede com resposta viva de predição LLM, impossibilitando a captura real da telemetria no formato esperado. A arquitetura permanece testada com mocks determinísticos.

## DIVERGÊNCIAS ENTRE RC1 E AMBIENTE REAL
Não é possível apurar divergências de runtime em predição live (e.g., quebras no parser `<TOOL_CALL>` induzidas por instabilidade de token do modelo), visto que não há um `host` ou infraestrutura ativa de LLMs emparelhada.

## CONCLUSÃO OBJETIVA
A topologia de rede neste ambiente falha imediatamente no `Network Probe`. Nenhuma infraestrutura de provider foi encontrada escutando nas portas nativas (11434) e nenhuma variável injeta hosts alternativos. Sendo assim, o DARIUS OSS segue validado de forma estritamente offline sob o RC1.

| Camada | Resultado |
|---|---|
| Stitch | BLOCKED |
| Proxy/Network | BLOCKED |
| DARIUS endpoint | BLOCKED (Sem server running) |
| Model provider | FAIL |
| Real inference | BLOCKED |
| Task execution | BLOCKED (No inference to trigger loop) |
| Persistence | BLOCKED (No execution loop fired) |
| Verification | BLOCKED (No evidence created) |
| Tool | BLOCKED (No inference triggers tool) |
| Artifact | BLOCKED |
| Recovery | BLOCKED |
| Telemetry/UI | BLOCKED |
