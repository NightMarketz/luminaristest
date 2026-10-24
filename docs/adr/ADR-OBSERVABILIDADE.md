# ADR-OBSERVABILIDADE — Política definitiva de observabilidade do server

- **Data:** 2026-10-23
- **Status:** **Accepted 2026-10-23 (dono, chat, questionário)**. Forks F-OBS-10..17 (§7) ratificados, todos
  pela recomendada (a): F-OBS-10 ✔ · F-OBS-11 ✔ · F-OBS-12 ✔ · F-OBS-13 ✔ · F-OBS-14 ✔ · F-OBS-15 ✔ · F-OBS-16 ✔
  · F-OBS-17 ✔. Cédula: `docs/plano/decisoes/D-2026-10-23-OBSERVABILIDADE-FORKS-2.md`. F-OBS-13 e F-OBS-14 são
  exceções explícitas à regra ⛔ do `CLAUDE.md` raiz, registradas lá. As regras OBS-R1..R14 são política desde
  esta data; as marcadas com ✔ já valiam pelos forks F-OBS-0..9.
- **Classe:** DECISÃO ARQUITETURAL (política cross-cutting do backend)
- **Autorização:** dono, chat, 23/10/2026: *"Precisamos de mais estrutura, pq essa vai ser a politica
  definitiva"*. No questionário do mesmo turno, o dono marcou as 4 opções:
  1. ADR definitivo;
  2. regra no contrato e nas skills;
  3. contrato tipado no código;
  4. gate de cumprimento.

  Isso cobre **planejar** as quatro frentes. Não cobre executar. Produzido por `sessao-planejamento`.
- **Substitui como fonte da política:** [`PRE-ADR-OBSERVABILIDADE.md`](PRE-ADR-OBSERVABILIDADE.md). O PRE-ADR
  continua valendo como registro do mapeamento (fatos M1–M16, §3 do Marco Civil) e dos forks F-OBS-0..9.
- **Nó:** [`OBS`](../plano/nos/OBS.md). A Fase A está no PR #869, que este ADR trata como fato consumado.
- **Base:** `origin/main` = `f0107509`. Medições de 23/10 sobre a árvore do #869.

## TLDR (2 linhas)

Log operacional passa por 6 portões, com linha em formato fixo (schema Zod), catálogo fechado de eventos
para esses portões e regras numeradas sobre o que nunca registrar. Lint e teste existentes passam a impedir
`console`, `catch` silencioso e scheduler sem alerta. Contrato e skills apontam para cá.

## 1. Escopo e não-escopo

- **Dentro:** `server/src/**` em produção: requisição HTTP, erro de API, processo, jobs, integração externa
  e a própria linha de log.
- **Fora:**
  - **trilha de auditoria contábil** (evento de negócio, com allowlist de PII própria em `auditCanonical.ts`). Log
    não substitui a auditoria, e a auditoria não é log;
  - **FE**, que fica para um `FE-INCR-OBS` próprio;
  - **CLIs** (`jobs/*Cli.ts`) e **scripts**: saída de terminal;
  - **métricas com endpoint** (F-OBS-9 a).

## 2. Fatos que este ADR assume (medidos em 23/10)

| # | Fato | Evidência |
|---|---|---|
| A1 | São 477 chamadas `logger.*` com mensagem: 96 no estilo `'[Tag] texto'` e o resto em texto livre. Só 3 usam constante como mensagem (o `JOB` dos schedulers). | grep do 1º argumento |
| A2 | O campo `event` já existe em 15 arquivos, com 13 valores soltos: `skipped` 19, `complete` 17, `generation_failed` 9, `reconcile_summary` 8, `failed` 8, `scheduled` 6, `job_failed` 6, `unit_rekeyed` 3, `reconcile_item_failed` 2 e mais 4 com 1 ocorrência cada. Não existe catálogo. | grep `event: '…'` |
| A3 | Há 777 `catch` em produção e **nenhum `catch {}` vazio**. Há 5 `.catch(() => undefined/null)` silenciosos: `accountingBinding/runtime/mapperReload.ts:20` e `dynamicTables/services/DynamicTableService.ts:37` (fila que serializa, e o erro é tratado por quem espera), `sectorKits/services/KitPendingService.ts:167` (limpeza), `jobs/migratePlano4NiveisCli.ts:301` (CLI) e `lib/pdf.ts:52`. | grep |
| A4 | Saída HTTP por `fetch` existe em 4 lugares: `MercadoPagoCollectionProvider.ts:151,180`, `BcbPtaxClient.ts:45`, o ping do Qdrant em `app.ts:93` e o próprio `alertWebhook.ts:44`. Nenhum deles registra duração nem status por chamada. A OpenAI usa SDK, não `fetch`. | grep `fetch(` |
| A5 | O contrato tem **uma** linha sobre log (§1: *"`logger.error(msg, { context })` — string primeiro"*). Não há seção de observabilidade. | `_ARCHITECTURE-CONTRACT.md:38` |
| A6 | A skill `job-generator` (JOB-004) manda `logger.info('Job started', { job })` + `'Job completed'`. **Nenhum dos 6 schedulers segue isso**: todos usam a constante `JOB` como mensagem e o campo `event`. A regra da skill e o código divergem. | `job-generator/SKILL.md:30,67`; `jobs/*Scheduler.ts` |
| A7 | Supressão inline do ESLint precisa de bloco de dívida declarado: o `debt-ledger-check` reprova `eslint-disable` sem a justificativa registrada. | `scripts/debt-ledger-check.mjs`; `docs/architecture/lint-layer-gate.md` |
| A8 | Fase A (#869): contexto por requisição em toda linha, 4xx×5xx, redação de chaves, `no-console`, alerta na falha de 5 schedulers e no `uncaughtException`. | PR #869 |
| A9 | **Correção ao PRE-ADR M8.** O `AccountingSyncScheduler` alerta só pelo resumo (`blocked>0 \|\| failed>0`). Quando o `runOnce` **lança exceção**, ele registra `event:'failed'` e relança **sem alerta**. O M8 o contou como "já alerta", e a Fase A herdou o furo. | `jobs/AccountingSyncScheduler.ts:135-145` (branch do #869) |

## 3. A política: regras OBS-R1..R14

✔ = já vale (é a reescrita de um fork ratificado ou de código da Fase A). As demais dependem do fork
indicado.

**Onde e como registrar**

- **OBS-R1 ✔ Só pelo logger.** Código de produção não chama `console.*`. Exceções fechadas: `jobs/*Cli.ts`,
  `scripts/**`, `config/env.ts`, `lib/logger.ts` e testes. Gate: `no-console` (F-OBS-8).
- **OBS-R2 ✔ Assinatura.** `logger.<nível>(mensagem, contexto)`: mensagem em string literal, sem interpolar
  dado; o dado vai no objeto de contexto. Erro sempre como `{ error }`, nunca como segundo argumento solto.
  Isso reescreve o contrato §1:38.
- **OBS-R3 ✔ Contexto da requisição é automático.** Ninguém passa `requestId`/`userId`/`route` à mão dentro
  de uma requisição: o `formatLog` injeta. Job carrega `job` e, quando houver, `runId`.

**Nível**

- **OBS-R4 ✔ Nível pelo significado** (F-OBS-2 c):
  - `error`: defeito que pede ação. Inclui 5xx, falha de job, falha do processo e falha de integração depois
    das tentativas.
  - `warn`: degradação ou sinal de segurança. Inclui 401/403, job lento ou parcial, alerta que não saiu e
    resposta de integração fora do esperado.
  - `info`: operação normal, incluindo os demais 4xx.
  - `debug`: só em dev.

  Só `warn` e `error` persistem no arquivo de erro (`logger.ts`).
- **OBS-R5 [F-OBS-12] Registrar uma vez, na borda.** O erro é registrado onde é tratado ou convertido:
  `handleApiError`, o `catch` do `runOnce` de um job, ou o `catch` que decide seguir. Um service que só
  relança **não** registra. Isso vale para código novo. O legado não é varrido (§8).

**O que nunca registrar**

- **OBS-R6 ✔ Chaves redigidas** (F-OBS-3 a): `password`, `senha`, `token`, `authorization`, `cookie`, `secret`,
  `certificado`, `pfx`, `cpf`, `cnpj`, `email`. Elas saem como `[redacted]` em qualquer profundidade. Chave nova
  de segredo ou de dado pessoal entra na lista **na mesma mudança** que a introduz.
- **OBS-R7 ✔ Nunca vão ao log:**
  - corpo de requisição ou de resposta;
  - query string;
  - XML fiscal;
  - certificado;
  - mensagem crua de erro de JWT;
  - valor de campo de DynamicTable.

  IDs internos podem ir.

**Erro engolido**

- **OBS-R8 [F-OBS-13] Nenhum `catch` silencioso.** Todo `catch` (ou `.catch`) que não relança precisa:
  - registrar em `warn` ou acima, com `{ error }`; **ou**
  - levar uma supressão justificada no ledger de dívida (A7), para o caso em que o erro é tratado por outro
    caminho (ex.: fila que serializa).

**Portões e eventos**

- **OBS-R9 [F-OBS-10/11] Portão emite evento do catálogo.** As linhas dos 6 portões levam `event` com um nome
  do catálogo fechado (§4). Linha fora dos portões não precisa de `event`.
- **OBS-R10 [F-OBS-16] Integração externa por `fetch` passa pelo wrapper.** Toda chamada de saída nova usa
  `lib/outboundHttp.ts`. O wrapper registra `integration.call` (nome, método, status, duração) e, na falha,
  `integration.failed`, nunca com o payload. O webhook de alerta fica fora, porque registrar a si mesmo daria
  laço.

**Alerta**

- **OBS-R11 ✔ Falha de job e do processo alerta** (F-OBS-7 a). Scheduler novo injeta `alert` com padrão
  `sendAlertWebhook` e dispara `job_failed` no `catch` do `runOnce`. A fonte nova entra em
  `AlertPayload.source` na mesma mudança. Gate: F-OBS-14.

**Formato e retenção**

- **OBS-R12 [F-OBS-11] A linha tem formato fixo.** Toda linha valida contra `LogEntrySchema` (§5). Campo novo
  de topo entra no schema na mesma mudança.
- **OBS-R13 ✔ Retenção:**
  - o arquivo de erro fica 14 dias;
  - o registro de acesso fica 6 meses, com expurgo (Fase B; Marco Civil, Lei 12.965 art. 15; Dec. 8.771
    arts. 13 § 2º e 15-A). Prazo no código: 190 dias por arquivo diário, com expurgo na 1ª escrita de cada dia
    (`ACCESS_LOG_RETENTION_DAYS`, `lib/accessLog.ts`; dono, questionário 2026-10-24);
  - nenhum outro sink sem uma regra de retenção escrita aqui.

**Fronteira**

- **OBS-R14 ✔ Log não é auditoria.** Quem lançou, estornou, emitiu ou aprovou vai para a trilha de auditoria.
  Log responde "o sistema funcionou, e onde falhou?".

## 4. Catálogo de eventos (portões) — esboço para F-OBS-10/11

```ts
// server/src/lib/logEvents.ts
export const LOG_EVENTS = [
  // P1 HTTP
  'http.request',
  // P2 erro de API
  'api.error',
  // auth (P1/P2)
  'auth.denied',
  // P3 processo
  'process.unhandled_rejection', 'process.uncaught_exception', 'process.started',
  // P4 jobs
  'job.started', 'job.completed', 'job.skipped', 'job.failed',
  'job.reconcile_summary', 'job.reconcile_item_failed', 'job.scheduled',
  // P5 integração
  'integration.call', 'integration.failed',
  // alerta
  'alert.failed',
] as const;
export type LogEvent = (typeof LOG_EVENTS)[number];
```

**Migração dos 13 valores atuais (A2), se F-OBS-15 (a):**

| Valor atual | Nome no catálogo |
|---|---|
| `complete`, `cli_complete` | `job.completed` (o CLI fica fora do catálogo; `cli_*` permanece) |
| `failed`, `job_failed`, `generation_failed` | `job.failed`, com `kind` no contexto (`generation` etc.) |
| `skipped` | `job.skipped` |
| `scheduled` | `job.scheduled` |
| `start` | `job.started` |
| `reconcile_summary`, `reconcile_item_failed` | `job.reconcile_summary`, `job.reconcile_item_failed` |
| `uncaught_exception` | `process.uncaught_exception` |
| `unit_rekeyed`, `cli_failed` | CLI: fora do catálogo, sem mudança |

`AlertPayload.event` **não** muda. É o contrato do webhook com quem recebe, e trocar o nome quebraria
consumidor externo.

## 5. Contratos (esboço materializável)

```ts
// server/src/lib/logEvents.ts (continuação)
import { z } from 'zod';

export const LogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string().min(1),
  event: z.enum(LOG_EVENTS).optional(),       // obrigatório só nas linhas de portão (OBS-R9)
  requestId: z.string().optional(),
  userId: z.string().optional(),
  method: z.string().optional(),
  route: z.string().optional(),
  job: z.string().optional(),
}).passthrough();                              // contexto do chamador, já redigido

// Helper (F-OBS-11 a) — portões usam este, o resto segue com logger.<nível>
logger.event(level: 'info' | 'warn' | 'error', event: LogEvent, message: string, context?: LogContext): void;

// server/src/lib/outboundHttp.ts (F-OBS-16 a)
export async function outboundFetch(
  integration: 'mercado_pago' | 'bcb_ptax' | 'qdrant',
  input: string, init?: RequestInit,
): Promise<Response>;          // registra integration.call | integration.failed; nunca o corpo
```

## 6. Checklist de execução (se os forks forem na recomendada)

**Frente 3: contrato tipado**

1. **[F-OBS-10/11]** Criar `lib/logEvents.ts` com `LOG_EVENTS`, `LogEvent` e `LogEntrySchema`.
   - Teste: o catálogo não tem duplicata.
   - Teste: toda linha emitida por `logger.*` em `logger.spec.ts` passa no `LogEntrySchema.parse`.
2. **[F-OBS-11]** `logger.event(level, event, message, ctx)` grava `event` na linha. O tipo recusa nome fora
   do catálogo (teste de tipo com `@ts-expect-error`).
3. **[F-OBS-11]** Os portões passam a emitir eventos do catálogo:
   - P1: `httpTiming` → `http.request`;
   - P2: `handleApiError` → `api.error`;
   - auth: os 3 `warn` → `auth.denied`;
   - P3: `server.ts` → `process.*`;
   - P4: os 6 schedulers → `job.*`;
   - `alertWebhook` → `alert.failed`.

   Testes existentes ajustados aos nomes novos.
4. **[F-OBS-15]** Migrar os valores de `event` dos 15 arquivos pela tabela do §4. O `AlertPayload.event` não
   muda.
5. **[F-OBS-16]** `lib/outboundHttp.ts`, adotado em `MercadoPagoCollectionProvider` (2 chamadas), `BcbPtaxClient`
   e no ping do Qdrant em `app.ts`. Teste com `fetch` falso: sucesso registra `integration.call` com duração e
   status, sem corpo; falha de rede registra `integration.failed`; o erro ainda sobe ao chamador.

**Frente 4: gates**

6. **[F-OBS-13]** No `server/eslint.config.mjs`:
   - `no-empty` com `allowEmptyCatch: false`;
   - `no-restricted-syntax` para `.catch` com arrow que devolve `undefined`/`null`/literal sem chamar nada.

   Os 5 casos de A3 levam supressão com justificativa e bloco de dívida em `lint-layer-gate.md` (A7); o CLI
   fica fora pela exceção de R1. Prova na condição que falha: um `.catch(() => null)` novo num service faz
   `npm run lint` e `debt-ledger-check` saírem ≠ 0.
7. **[F-OBS-14]** `jobs/__tests__/schedulerFailureAlert.test.ts` passa a **descobrir** os arquivos
   `jobs/*Scheduler.ts` por glob e reprova se algum não estiver na tabela de casos. Hoje a tabela é fixa
   (#869), e um scheduler novo passaria sem teste. Prova: um `FooScheduler.ts` vazio em `jobs/` deixa o teste
   vermelho.
7b. **[direto, OBS-R11]** O `AccountingSyncScheduler` ganha `alert` injetado e dispara `job_failed` no `catch`
    do `runOnce` (A9), além do alerta de resumo que já tem. Ele entra na tabela do teste do item 7, que sem
    isso ficaria vermelho.

**Frente 2: contrato e skills**

8. **[direto]** `_ARCHITECTURE-CONTRACT.md`:
   - a linha §1:38 passa a apontar para OBS-R2;
   - nova **§2.4 Observabilidade**, com checklist curto (R1, R2, R4, R5, R6, R8, R9, R10, R11) e link para
     este ADR;
   - o "Anti-omissão" ganha a linha "log/alerta conforme §2.4".
9. **[direto]** Skills:
   - `job-generator` JOB-004 é reescrita para o padrão real: mensagem = `JOB`, `event` do catálogo, `alert`
     injetado, teste de falha. A divergência de A6 acaba;
   - `backend-service-generator` ganha regra R5 (não registrar e relançar) e R8;
   - `backend-test-suite-generator` ganha o padrão de assert de log: `spyOn(console)`, parse da linha e
     `LogEntrySchema` (exemplar: `requestContext.integration.test.ts`);
   - `analytics-kpi-generator` já cumpre R8 e não muda.

   Gate: `node .claude/skills/skill-audit/skill-audit.mjs run` com 0 findings. Se o eval `happy-2` do
   `job-generator` codificar o padrão antigo, ele é atualizado na mesma mudança.
10. **[direto]** `CLAUDE.md` raiz: uma linha na lista de docs, *"Observabilidade (log, nível, PII, alerta) →
    `docs/adr/ADR-OBSERVABILIDADE.md`"*.

**Frente 1: o próprio ADR**

11. **[direto]** Quando F-OBS-10..17 forem ratificados: Status passa a `Accepted`, a linha entra no
    `docs/adr/INDEX.md` e o nó OBS ganha a Fase C (itens 1–10 deste §6).

**Gates acionados:** `tsc` do server; `npm run lint` + `debt-ledger-check`; `check:arch` (`lib/logEvents.ts` e
`lib/outboundHttp.ts` são novos); `skill-audit` (itens 8–9 tocam `.claude/skills/**`); suíte unitária e de
integração (os nomes de `event` mudam nos testes de scheduler). Nenhum DTO de rota, rota ou migração é tocado.

## 7. Forks — RATIFICADOS em 23/10/2026, todos pela recomendada

**F-OBS-10: alcance do catálogo.**
- (a) Só as linhas dos 6 portões.
- (b) Toda chamada `logger.*` (477).
- (c) Sem catálogo.

**Recomendo (a).** Os portões são onde alguém vai filtrar e alertar. (b) obriga a nomear 477 mensagens que
ninguém consulta por nome. (c) mantém os 13 valores soltos de A2. **Status: RATIFICADO (a), 23/10/2026.**

**F-OBS-11: forma da API.**
- (a) `logger.event(level, event, message, ctx)` para os portões; `info`/`warn`/`error` seguem para o resto;
  `LogEntrySchema` em Zod.
- (b) A mensagem passa a ser o nome do evento (`logger.info('job.completed', …)`).
- (c) Métodos por evento (`logger.jobFailed(…)`).

**Recomendo (a).** O tipo do `event` é checado pelo `tsc`, e as 477 chamadas não mudam. (b) perde a
mensagem legível. (c) cria uma API larga demais para manter. **Status: RATIFICADO (a), 23/10/2026.**

**F-OBS-12: registrar uma vez, na borda (OBS-R5).**
- (a) Regra para código novo; legado não varrido.
- (b) Regra e varredura das 138 chamadas `logger.error` atuais.
- (c) Sem regra.

**Recomendo (a).** A linha duplicada (service registra, controller registra de novo) é o ruído típico.
Mas varrer 138 chamadas sem produção para dizer quais duplicam seria trabalho às cegas. A regra vale para a
geração nova pelas skills (item 9). **Status: RATIFICADO (a), 23/10/2026.**

**F-OBS-13: gate de `catch` silencioso (OBS-R8).**
- (a) ESLint `no-empty` + `no-restricted-syntax` para `.catch` silencioso, com os 5 casos justificados no
  ledger.
- (b) Regra de AST própria que detecta `catch` sem `throw`, sem `logger` e sem `return` de erro.
- (c) Só convenção.

**Recomendo (a).** É lint, no job que já roda, com ledger que já existe (A7). (b) daria falso positivo em
boa parte dos 777 `catch` e seria código de gate novo para manter. **Ressalva ⛔:** é gate novo. Pede a
mesma exceção explícita do F-OBS-8 (`CLAUDE.md`, linha de exceções). **Status: RATIFICADO (a), 23/10/2026.** Exceção ⛔ aprovada pelo dono no mesmo questionário e registrada no `CLAUDE.md`.

**F-OBS-14: gate de scheduler sem alerta (OBS-R11).**
- (a) O teste de falha descobre `jobs/*Scheduler.ts` por glob e reprova arquivo sem caso.
- (b) Só a regra na skill.

**Recomendo (a).** É um teste na suíte que já roda, não uma rodada ou bancada. Fecha o furo de a tabela
de #869 ser fixa. **Ressalva ⛔:** como F-OBS-13. **Status: RATIFICADO (a), 23/10/2026.** Exceção ⛔ aprovada pelo dono no mesmo questionário e registrada no `CLAUDE.md`.

**F-OBS-15: migrar os valores de `event` existentes.**
- (a) Migrar os 15 arquivos agora (§4).
- (b) Só o código novo usa o catálogo.

**Recomendo (a).** São 15 arquivos e 13 valores. Sem a migração, o catálogo convive com o vocabulário velho
e o filtro por `job.failed` perde as falhas antigas. O `AlertPayload.event` fica intacto. **Status: RATIFICADO (a), 23/10/2026.**

**F-OBS-16: wrapper de integração (OBS-R10).**
- (a) `lib/outboundHttp.ts` adotado nos 4 `fetch` de A4 (menos o webhook).
- (b) Só a regra, sem wrapper.
- (c) Nada.

**Recomendo (a).** É o único portão (P5) que a Fase A não cobriu, e "cobrir tudo" foi o pedido de origem.
**Status: RATIFICADO (a), 23/10/2026.**

**F-OBS-17: onde a política mora.**
- (a) Este ADR é a fonte; o contrato §2.4 traz o checklist e o link; as skills apontam para o contrato.
- (b) Tudo dentro do contrato, sem ADR.

**Recomendo (a).** Segue o desenho de `ADR-ARCH-BOUNDARIES` (decisão no ADR, checklist no contrato) e
mantém o contrato curto. **Status: RATIFICADO (a), 23/10/2026.**

## 8. O que este ADR deliberadamente não faz

- Não varre as 477 mensagens nem as 138 chamadas `logger.error` atuais (F-OBS-10 a, F-OBS-12 a).
- Não muda `AlertPayload.event`, que é contrato externo.
- Não decide agregador remoto, sink do registro de acesso nem porta de origem: são F-OBS-4/5/6, que ficam
  para a Onda 0.

## 9. Pendente de validação externa

O mesmo do PRE-ADR §8: arts. 16-A a 16-J do Dec. 8.771 (pergunta ao advogado), padrões do CGI.br e LGPD arts.
37/46 aplicados a log. Nenhuma regra deste ADR depende deles. A OBS-R13 cita só o que foi lido (dossiê
[`marco-civil-guarda-registros`](../../pesquisas-legais/marco-civil-guarda-registros/relatorio.md)).

## 10. Insumos ausentes

- **O eval `happy-2` do `job-generator`:** não li se ele codifica o padrão `'Job started'`. O item 9 confere
  na execução.
- **Os 5 casos de A3:** não li cada um para confirmar que o erro é tratado em outro lugar. O item 6 confere
  antes de justificar no ledger. Se um deles for engolimento real, vira `logger.warn` em vez de supressão.

## 11. Achados fora de escopo

- O CLI usa `event` com vocabulário próprio (`cli_complete`, `cli_failed`, `unit_rekeyed`). Fica fora do
  catálogo por R1/§1. Se o dono quiser CLIs no catálogo, é frente nova.
- `lib/monitoring.ts` (`Metrics`) emite `Metric: <nome>` como mensagem. Pelo item 3 ele passa a carregar
  `event: 'http.request'` só no uso do P1. Os outros 7 usos de `startTimer` (VectorRepository,
  DocumentProcessingService) não são portão e não mudam.
