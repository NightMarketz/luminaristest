---
id: "OBS"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Observabilidade do server pelos 6 portões: contexto por requisição, 4xx×5xx, redação de PII, alertas dos jobs (Fase A) e registro de acesso do Marco Civil (Fase B, Onda 0)"
estado: "inflight"
estado_detalhe: "24/10 (Fase B parcial): itens 11, 13 e 15 — registro de acesso NDJSON (190 dias, porta por X-Client-Port, expurgo diário) e ALERT_WEBHOOK_URL obrigatória no compose e no runbook M2 ([[D-2026-10-24-OBSERVABILIDADE-FASE-B-PARCIAL]]); itens 12 e 14 seguem na Onda 0 · 23/10 (Fase C): C3 no #874 — gate de catch silencioso (lint + ledger, 10 SANCTIONED, KitPendingService → warn), teste de scheduler por glob e alerta na exceção do AccountingSyncScheduler (itens 6, 7, 7b); C4 (itens 8–10) em paralelo no #872. Fase B segue na Onda 0 · 23/10 (Fase C): C2 no #873 — outboundFetch (P5) no Mercado Pago ×2, BCB PTAX e Qdrant (item 5) · 23/10 (Fase C): C1 no #871 — LOG_EVENTS/LogEntrySchema, logger.event, portões e migração de event (itens 1–4) · 23/10: ADR-OBSERVABILIDADE Accepted, forks F-OBS-10..17 RATIFICADOS, todos pela recomendada ([[D-2026-10-23-OBSERVABILIDADE-FORKS-2]]); Fase C (§6 itens 1–11, com o 7b) autorizada para execução em 4 PRs empilhados, sem merge · 23/10 (executa): Fase A implementada (itens 1–10), com 2 lacunas de spec respondidas pelo dono por questionário — server.ts passa a logger.info; testes fora do no-console. Fase B segue para a Onda 0 · 23/10: PRE-ADR-OBSERVABILIDADE Accepted, forks F-OBS-0..9 RATIFICADOS, todos pela recomendada ([[D-2026-10-23-OBSERVABILIDADE-FORKS]]). Sem fork pendente. O §5 do PRE-ADR é o checklist: 10 itens na Fase A e 5 na Fase B. A Fase A espera o 'executa'; a Fase B espera a Onda 0 (host, que decide F-OBS-4 e confirma F-OBS-5/6)"
depende_de: ["[[D-2026-10-23-OBSERVABILIDADE-FORKS]]", "[[D-2026-10-23-OBSERVABILIDADE-FORKS-2]]", "[[D-2026-10-24-OBSERVABILIDADE-FASE-B-PARCIAL]]"]
autorizacao: "dono, chat, 2026-10-23: \"Planeja e mapeia se há uma forma de cobrir tudo, temos que ter um brief para não se perder depois\" + \"Pode ratificar tudo\" — PRE-ADR e forks · dono, chat, 2026-10-23: \"Executa a Fase A do nó OBS (itens 1 a 10 do PRE-ADR-OBSERVABILIDADE).\" — só a Fase A; a Fase B espera a Onda 0 · dono, chat, 2026-10-23: \"Sessão de execução do nó OBS até o fim da Fase C. Autorizo, em sequência: (1) ratificar os forks F-OBS-10..17 do ADR-OBSERVABILIDADE por questionário comigo; (2) depois da ratificação, EXECUTAR a Fase C inteira (itens 1–11 do ADR-OBSERVABILIDADE §6, incluindo o 7b), seguindo as respostas que eu der, mesmo que alguma não seja a recomendada. Não autorizo merge. A Fase B (F-OBS-4/5/6) fica de fora: depende da Onda 0.\" — forks F-OBS-10..17 e Fase C; sem merge · dono, chat, 2026-10-24: \"Executa os itens 11, 13 e 15 do PRE-ADR-OBSERVABILIDADE §5 (Fase B) com F-OBS-5 (b) e F-OBS-6 (b) provisórios, empilhado no #874. Itens 12 e 14 ficam para a Onda 0. Não autorizo merge.\" — só os itens 11, 13 e 15 da Fase B; sem merge"
ancora_sdd: "§14 · §19"
atualizado: "2026-10-24"
prs: ["#867", "#869", "#871", "#872", "#873", "#874", "#880"]
perfil_previsto: "opus-medio"
perfil_evidencia: "Fase A: ~10 arquivos de infraestrutura (requestContext novo, middleware, logger, apiUtils, httpTiming, auth, 5 schedulers, alertWebhook, eslint.config) com teste por item, sem DTO nem migração; o raio é largo porque o logger toca toda linha, mas o contrato é aditivo"
write_set: ["server/src/lib/requestContext.ts", "server/src/lib/__tests__/requestContext*", "server/src/middleware/requestContext.ts", "server/src/middleware/__tests__/requestContext*", "server/src/middleware/__tests__/httpTiming*", "server/src/middleware/httpTiming.ts", "server/src/middleware/auth.ts", "server/src/lib/logger.ts", "server/src/lib/apiUtils.ts", "server/src/lib/alertWebhook.ts", "server/src/lib/jwt.ts", "server/src/lib/prisma.ts", "server/src/lib/__tests__/**", "server/src/features/dynamicTables/utils/RelationUtils.ts", "server/src/jobs/*Scheduler.ts", "server/src/jobs/__tests__/**", "server/src/server.ts", "server/eslint.config.mjs", "server/src/lib/accessLog.ts", "server/src/middleware/accessLog.ts", "server/src/middleware/__tests__/accessLog*", "docker-compose.yml", "server/src/config/__tests__/dockerCompose.obs.test.ts", "server/.env.example", "docs/accounting/RUNBOOK-M2-DEPLOY-SMOKE.md"]
registros: ["server/src/app.ts"]
---
# OBS — Observabilidade do server

**Estado:** `inflight` — 24/10 (Fase B parcial): itens 11, 13 e 15 — registro de acesso NDJSON (190 dias, porta por X-Client-Port, expurgo diário) e ALERT_WEBHOOK_URL obrigatória no compose e no runbook M2 ([[D-2026-10-24-OBSERVABILIDADE-FASE-B-PARCIAL]]); itens 12 e 14 seguem na Onda 0 · 23/10 (Fase C): C3 no #874 — gate de catch silencioso (lint + ledger, 10 SANCTIONED, KitPendingService → warn), teste de scheduler por glob e alerta na exceção do AccountingSyncScheduler (itens 6, 7, 7b); C4 (itens 8–10) em paralelo no #872. Fase B segue na Onda 0 · 23/10 (Fase C): C2 no #873 — outboundFetch (P5) no Mercado Pago ×2, BCB PTAX e Qdrant (item 5) · 23/10 (Fase C): C1 no #871 — LOG_EVENTS/LogEntrySchema, logger.event, portões e migração de event (itens 1–4) · 23/10: ADR-OBSERVABILIDADE Accepted, forks F-OBS-10..17 RATIFICADOS, todos pela recomendada ([[D-2026-10-23-OBSERVABILIDADE-FORKS-2]]); Fase C (§6 itens 1–11, com o 7b) autorizada para execução em 4 PRs empilhados, sem merge · 23/10 (executa): Fase A implementada (itens 1–10), com 2 lacunas de spec respondidas pelo dono por questionário — server.ts passa a logger.info; testes fora do no-console. Fase B segue para a Onda 0 · 23/10: PRE-ADR-OBSERVABILIDADE Accepted, forks F-OBS-0..9 RATIFICADOS, todos pela recomendada ([[D-2026-10-23-OBSERVABILIDADE-FORKS]]). Sem fork pendente. O §5 do PRE-ADR é o checklist: 10 itens na Fase A e 5 na Fase B. A Fase A espera o 'executa'; a Fase B espera a Onda 0 (host, que decide F-OBS-4 e confirma F-OBS-5/6)  
([[D-2026-10-23-OBSERVABILIDADE-FORKS]]). A Fase A espera o `executa`. A Fase B espera a Onda 0.

**Autorização:** dono, chat, 2026-10-23: "Planeja e mapeia se há uma forma de cobrir tudo, temos que ter um brief
para não se perder depois" e "Pode ratificar tudo" (PRE-ADR e forks). Depois, no mesmo dia: "Executa a Fase A do nó OBS
(itens 1 a 10 do PRE-ADR-OBSERVABILIDADE)." Só a Fase A; a Fase B espera a Onda 0.

**Depende de:** [[D-2026-10-23-OBSERVABILIDADE-FORKS]]. A Fase B depende da Onda 0, que não tem nó: é a implantação de
[[19-riscos-e-premissas]].

**Desbloqueia:** a linha "Observabilidade" de [[14-requisitos-nao-funcionais-do-estado-completo]] e o registro de
acesso exigido pelo Marco Civil quando houver operação.

**Âncora no SDD consolidado:** §14 · §19.

## Escopo

- **Fase A** (itens 1–10 do PRE-ADR §5):
  - `AsyncLocalStorage` com `requestId`, `userId`, `method` e `route` injetados em toda linha de log;
  - `X-Request-Id` na resposta;
  - 4xx×5xx classificados no `handleApiError`;
  - chaves de PII redigidas e path sem query;
  - 9 `console.*` passam ao logger;
  - `no-console` no ESLint;
  - alerta nos 5 schedulers sem alerta e no `uncaughtException`.
- **Fase B** (itens 11–15):
  - registro de acesso de 6 meses (IP, porta, usuário, rota) em sink separado, encriptado e com expurgo;
  - agregador remoto do log de erro;
  - `ALERT_WEBHOOK_URL` obrigatória em produção.
- **Fora:**
  - FE (`FE-INCR-OBS`, a abrir);
  - CLIs;
  - trilha de auditoria contábil;
  - métricas com endpoint (F-OBS-9).

## Gatilho

Pergunta do dono em 23/10 ("varrer o código e pensar em observabilidade já?") e medição da mesma data: o erro de
API sai sem contexto, 5 de 6 jobs não alertam e não existe registro de acesso (PRE-ADR §2, M1–M16).

## Docs

- [`PRE-ADR-OBSERVABILIDADE.md`](../../adr/PRE-ADR-OBSERVABILIDADE.md): mapa dos 6 portões, fatos medidos, checklist em
  2 fases, contratos e forks ratificados.
- [`ADR-OBSERVABILIDADE.md`](../../adr/ADR-OBSERVABILIDADE.md) — **política definitiva (Accepted, 23/10)**: regras OBS-R1..R14, catálogo de
  eventos, `LogEntrySchema`, gates de `catch` silencioso e de scheduler sem alerta, propagação ao contrato e às skills
  (Fase C, itens 1–11), forks F-OBS-10..17 ratificados ([[D-2026-10-23-OBSERVABILIDADE-FORKS-2]]). Pedido do dono, chat, 23/10: "Precisamos de mais estrutura, pq essa
  vai ser a politica definitiva".
- [`pesquisas-legais/marco-civil-guarda-registros`](../../../pesquisas-legais/marco-civil-guarda-registros/relatorio.md):
  Lei 12.965 art. 15 e Dec. 8.771 arts. 13, 15 e 15-A (redação de 2026).
