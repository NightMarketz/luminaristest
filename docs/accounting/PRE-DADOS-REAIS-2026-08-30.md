# Pré-dados-reais — registro do inventário de 16 itens (2026-08-30)

> **Documento REGISTRADOR, não ratificador.** Não edita `ACCOUNTING-MASTER-MAP.md` nem
> `PROXIMOS-PASSOS-2026-08-28.md` — fold desses é decisão do dono. Autorização citável: "Pode
> disparar" (dono, 2026-08-30).

**Data do registro:** 2026-08-30, atualizado 2026-08-31 (3×: A-3 em andamento -> fechado ->
documentacao do teto no OpenAPI via #246). **Base (`git log -1 origin/main`):**
`4ff859bd66c3151a513782ae766e5daa31b35079` — PR #246,
`docs(accounting): documenta teto MAX_CENTS no OpenAPI + doc dedicado`, mergeado sobre `0bea6755`
(#245, ainda a base funcional deste registro para A-3/BigInt).

**As 2 linhas (OPS-001 §5):** de 16 itens do inventário, **12 fecharam via PR mergeado** (SHAs
confirmados 1:1 contra `origin/main`, A-3/#245 incluso — o item entra fechado nesta versão), **1 é
decisão do dono não-código** (B-2 — a razão de nenhum destes 12 estar em §5.1 ainda é um segundo
não-item, o não-fold do mapa em si), e **3 continuam gate humano** (B-4, E-1/X2, E-2/H1 — B-4 tem o
código pronto desde #235, mas o ensaio em si segue exigindo execução humana). O risco principal
agora: **o único gate que cobre a classe "handle async vazado em teste
de integração" roda a suíte inteira sem escopo por diff, então herda o custo total a cada PR** — ver
§6. Nota de correção: uma mensagem anterior (não verificada por mim antes de escrever) afirmava que
esse gate não corre nos checks de PR; **isso é falso** — confirmei o oposto rodando `gh api` contra
as duas últimas PRs da wave (§6 traz a evidência).

---

## 1. Inventário — os 16 itens

| # | Item | Desfecho | PR / SHA / evidência |
|---|---|---|---|
| A-1 | Contraparte: `nameNormalized` assume `@@unique` + `taxId` opcional | ✅ **FECHADO** | PR #241, `ed71d6a3669b9b3dd5bc88056fcb8c5396deb642` |
| A-2 | `verifyAuditChain` sem chamador de produção | ✅ **FECHADO** | PR #237, `13367a2de0cd9da9a63755380fb8c5bdfef342ee` |
| A-3 | Teto Int32 → BigInt (13 colunas / 11 models) | ✅ **FECHADO** | PR #245, `0bea6755f45c77f933890c64d862b4f0fc0e9755` |
| B-1 | Backup do `dev.db` | ✅ **FECHADO** | PR #235, `b37ca9ec47213f358eb43fcedabf29ef4320e35d` |
| B-2 | Sem migração *down* | ⚪ **DIFERIDO por decisão** | não virou código: o backup (B-1) **é** o rollback — já emendado no `RUNBOOK-M2-DEPLOY-SMOKE.md` (item A5-3, PR #236) |
| B-3 | Artefato de deploy sem schema wireado | ✅ **FECHADO** | PR #236, `bcb94131286b6ce12e000fae00a6f791317ca1e7` (reuso de `scripts/migrate-deploy.mjs` já existente, ver §3) |
| B-4 | Ensaio de restauração nunca exercitado | 🔴 **GATE HUMANO** | runbook em branco pronto — `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md` (criado no PR #235); agente não assina |
| C-1 | Sem alerta externo em falha | ✅ **FECHADO** | PR #239, `dad96d23c72441fdb15d10a99088cb5963bfb924` |
| C-2 | Sem instrumentação de tempo | ✅ **FECHADO** | PR #242, `035e527969aebc2355e974c6046c902b90cdd499` |
| D-1 | Sem índice em `JournalEntry(date)` | ✅ **FECHADO** | PR #234, `5f88696e1e395e1de4fd6486b4dcc0c80154ee68` |
| D-2 | `autoMatch` em transação única (extrato grande) | ✅ **FECHADO** | PR #240, `d2ab0e43ba99d1a2410aef41fc835afcf11770be` |
| D-3 | `accountingSyncReconcile` sem watermark (full-scan) | ✅ **FECHADO** | PR #243, `bacdef5b057c73578797fd64e5e25c359bccb7a6` |
| E-1 | `coverage().ready` mede presença, não correção | 🔴 **GATE HUMANO** | fecha com X2 (arquivo referencial RFB oficial) — `docs/accounting/RUNBOOK-X2-RFB-REFERENCIAL.md` |
| E-2 | ECD sem oráculo externo | 🔴 **GATE HUMANO** | fecha com H1 (PVA oficial) — `docs/accounting/RUNBOOK-H1-PVA.md` |
| E-3 | `closeExercise` sem tela | ✅ **FECHADO** | PR #238, `177c38ec679dedb4de278f99ee5ee845c61661b3` |
| G | Bloco de diferidos (A7/A8 da auditoria 08-15, LGPD/RBAC item 14, folha, imobilizado, IA/analytics, inbox/outbox) | ⚪ **DIFERIDO** | fora do escopo desta wave; nenhum dos 12 PRs toca esses eixos (confirmado por leitura dos 12 corpos — nenhuma menção) |

12 de 16 fecharam via código nesta rodada (11 da primeira leva + A-3/#245). 1 é decisão-do-dono/
não-código (B-2; o não-fold do mapa não é item numerado, é a razão de nenhum destes 12 estar em
§5.1 ainda). 3 seguem gate humano (B-4, E-1, E-2 — mais o G, que é decisão de escopo, não gate).
B-4 já tem o código pronto (script + runbook, PR #235); o ensaio em si continua exigindo execução
humana — por isso segue listado também em §7.

**Divergência com a lista de entrada:** a lista do pedido cita "B-2 sem migração down" como item
separado de B-1/B-3/B-4 — confirmado: **nenhuma migração `down.sql` existe no repo** (checado por
`find server/prisma/migrations -iname "*down*"` → **0 resultados**, nem nesta wave nem antes dela). O
fechamento é textual (RUNBOOK-M2, item A5-3) e não de código, como o pedido já antecipava.

---

## 2. A-3 (BigInt) — FECHADO, PR #245

**Histórico da leitura deste item, para quem comparar versões deste doc:** 2026-08-30, branches
paradas sem commit próprio (EM ANDAMENTO). 2026-08-31 cedo, corrigido para "trabalho ativo
não-commitado" depois que o orquestrador reportou 15+ arquivos modificados no worktree
`agent-a60fd31afa0a89379` (achado que eu não pude verificar sozinho, por isolamento de worktree —
só corroborei indiretamente, via mtimes de artefato no scratchpad). 2026-08-31 tarde: **fechado**,
PR #245 mergeado como `0bea6755f45c77f933890c64d862b4f0fc0e9755`, confirmado por
`git log --oneline origin/main` e `gh pr view 245`.

### O que o PR entregou (extraído do corpo de #245, lido na íntegra)

- **13 colunas `*Cents` em 11 models**, `Int → BigInt` via `RedefineTables` (SQLite não tem `ALTER
  COLUMN TYPE`): `Posting.debitCents/creditCents`, `BankStatement.openingBalanceCents/
  closingBalanceCents`, `BankStatementLine.amountCents`, `CustomerPackageBalance.balanceCents`,
  `PackageBalanceMovement.deltaCents`, `Payable.amountCents`, `PayablePayment.amountCents`,
  `Receivable.amountCents`, `ReceivableReceipt.amountCents`, `InventoryItem.totalValueCents`,
  `StockMovement.valueCentsDelta`. Migração:
  `server/prisma/migrations/20260831032258_int_to_bigint_cents/migration.sql`.
- **Varredura read-side completa**: 9 arquivos de `groupBy`/`_sum` + todo sítio de aritmética direta
  sobre um `*Cents` bigint em 13 services/1 repositório/1 job — 59 erros de `tsc` fechados,
  `tsc --noEmit` limpo em `server` e `my-app` (confirmado no corpo do PR).
- **`centsFromDb`/`centsFromDbNullable`** (`server/src/features/accounting/models/money.ts`) —
  bridge bigint→number, usado em todo sítio de aritmética. Confirmado por leitura direta:
  `centsFromDb` na linha 36, `centsFromDbNullable` na linha 47 do arquivo em `origin/main`.
- **`jsonBigintReplacer`** (`server/src/lib/jsonBigintReplacer.ts`) — rede de segurança na fronteira
  HTTP para CRUD passthrough que devolve entidade Prisma crua sem ter passado por um sítio de
  aritmética. Confirmado por leitura direta de `server/src/app.ts` em `origin/main`:
  `app.set('json replacer', jsonBigintReplacer)`, chamado uma única vez dentro de `createApp()` —
  ou seja, **escopo GLOBAL do app** (toda resposta JSON de todo router montado nesta instância, não
  só rotas de contabilidade). Ver §4 para o achado de blast radius correspondente.
- **`server/scripts/smoke-gate-w2b-bigint-cents.mjs`** com flag `--self-test` — confirmado por
  leitura: `SELF_TEST = args.includes('--self-test')`, corrompe 1 linha da tabela-semente e exige
  que a verificação V2 reprove SÓ aquela tabela (falsificador rodado, não só um script que sempre
  passa).

### Fork F-W2B-1 — "tudo de uma vez", ratificado e executado

O BRIEF recomendava fatiar (só `Posting`, único defeito confirmado — ACC-INCR6-J-001); o dono
ratificou o oposto. Executado como decidido: as 13 colunas na mesma investida.

### Gates finais (do corpo do PR, não re-executados por mim)

`tsc --noEmit` limpo em `server`+`my-app` antes/depois; `test:unit` 168/168 suites, 2107/2107
testes; `test:integration --runInBand` 53/53 suites, 499/499 testes; `my-app` vitest 35/35
arquivos, 175/175 testes; `dtoShapeSnapshot.test.ts` sem drift; smoke-gate 26/26 checks verdes
contra cópia do `dev.db` real (30 postings), original intocado (md5/mtime/size idênticos).

---

## 3. Forks ratificados pelo dono em 2026-08-30

Citados nos corpos dos 12 PRs mergeados **e agora também nos 4 documentos-fonte, commitados
verbatim nesta mesma branch** (ratificação do dono, 2026-08-31): `docs/accounting/BRIEFS-WAVE1.md`,
`BRIEFS-WAVE2-SCHEMA.md`, `BRIEFS-WAVE2-BACKEND.md`, `BRIEFS-WAVE2-FE.md` — cada um com uma nota de
registrador no topo apontando de volta para este documento como a fonte de desfecho real. São
registro histórico congelado: o status de fork e os "pendentes" ali refletem o momento da execução
(2026-08-30), não o resultado final — este §3 e o §1 são a leitura atualizada.

| Fork | Decisão | Onde aparece |
|---|---|---|
| **F1(b)** | `nameNormalized` = trim + fold de caixa + colapso de espaço (SEM accent-folding) | PR #241 |
| **F2 / F-W2B-1** | BigInt "tudo de uma vez" (as 13 colunas numa sessão) | PR #245 (ver §2) |
| **F-W2B-2** | `MAX_CENTS` vira teto de POLÍTICA (não mais de persistência) pós-migração | PR #245 (ver §4) |
| **F-W2B-3** | Serialização bigint→`number` guardado (nunca bigint→`string`) via `centsFromDb`/`jsonBigintReplacer` | PR #245 (ver §2 e §4) |
| **F3(a)** | Webhook de alerta mínimo, fire-and-forget | PR #239 |
| **F4 (ampla)** | Instrumentação de tempo nas 3 camadas (job/HTTP/relatórios), não só 1 | PR #242 |
| **F5(a)** | `autoMatch` em lotes (chunk) de tamanho fixo | PR #240 |
| **F6 (agora)** | Watermark trailing implementado já, não adiado | PR #243 |
| **F7 (agora)** | Tela de encerramento implementada já | PR #238 |
| **F-W2F-3** | Resíduo aceito: colisão de tumba depende de invariante de aplicação, não de constraint | PR #243 (ver achado §4) |

**Forks de rotina decididos pelo orquestrador e citados nos PRs** (contagem real, não "~15"): **19**
sub-decisões nomeadas — F-C1/F-C2 (#235), F-A1/F-A2 (#237), FORK 1/2/3 (#238), F-W2C-1/F-W2C-2
(#239), F-W2E-1/F-W2E-2 (#240), F-W2A-3/F-W2A-4/F-W2A-5 (#241), F-W2D-1/F-W2D-2 (#242),
F-W2F-1/F-W2F-2/F-W2F-3 (#243). **Divergência com o pedido:** a lista de entrada estimava "~15";
a contagem real nos corpos de PR é 19 — reporto a diferença, não corrijo a estimativa por ela.

---

## 4. Achados não-bloqueantes — confirmados por leitura direta do código (não só do texto do PR)

Cada um abaixo foi **relido no arquivo fonte**, não só extraído do corpo do PR:

- **#242 — requisição abortada pelo cliente não é medida.** `server/src/middleware/httpTiming.ts:22`
  usa só `res.on('finish', ...)`; não há listener em `close`. O próprio docstring do arquivo (linhas
  13-17) documenta que `finish` cobre 2xx/4xx/5xx, mas não menciona abort do cliente — a lacuna não
  está documentada como conhecida, é uma omissão real.
- **#242 — anti-ruído de 403 tem teste explícito em só 1 dos 6 métodos.** Grep por
  `does NOT log the metric` em `server/src/features/accounting/services/__tests__/` retorna **1
  único hit**, em `AccountingReportService.test.ts:363`, para `accountLedger`. Os outros 5
  (`trialBalance`, `balanceSheet`, `incomeStatement` em `AccountingReportService.ts`; `dailyJournal`
  em `DailyJournalReportService.ts`; `cashFlowStatement` em `CashFlowReportService.ts`) **têm o
  comportamento correto por inspeção** — `startTimer` aparece sempre DEPOIS do `if
  (!this.policy.canRead(...))` nos 6 métodos (confirmado por grep de linha) — mas só 1 tem teste que
  afirma isso.
- **#242 — os 3 timers de geração ficaram sem `warnThresholdMs`.** `server/src/lib/reportThresholds.ts`
  só define `REPORT_WARN_THRESHOLDS_MS` (6 relatórios) e `HTTP_WARN_THRESHOLD_MS`; os 3 call sites de
  `metrics.startTimer('sped_ecd_generation'|'sped_ecf_generation'|'data_exchange_export')`
  (`SpedGenerationService.ts:136`, `SpedEcfGenerationService.ts:180`,
  `DataExchangeExportService.ts:148`) chamam `endTimer({...})` sem o campo — confirmado por leitura
  dos 3 arquivos. Decisão do orquestrador citada no PR: threshold só com medição real, `durationMs`
  presente já basta para esta wave.
- **#241 — colisão entre "tumbas" depende de invariante de aplicação, não de constraint.** O
  comentário da própria migração (`20260830160349_counterparty_identity_normalization/migration.sql`,
  linhas 15-19) explica que duas linhas arquivadas nunca colidem porque o prefixo `deleted:<id>:<name>`
  embute um `cuid` globalmente único — mas essa garantia depende de `archiveCounterparty` **sempre**
  escrever esse prefixo exato; não há `CHECK` de schema que force o formato. É uma invariante de
  aplicação documentada, não uma constraint de banco.
- **#241 — docstring de `mintCounterparty` cita a chave antiga.** `counterpartyResolution.ts:81`
  ainda diz `@@unique([userId,unitId,type,name])` — a chave real, desde este PR, é
  `(userId,unitId,type,nameNormalized)`. Comentário morto, confirmado por leitura; não afeta
  comportamento (é só doc inline).
- **#243 — resíduo F-W2F-3 documentado no job e na migração.** Confirmado em dois lugares:
  `server/src/jobs/accountingSyncReconcile.job.ts` (busca por `KNOWN RESIDUAL` retorna hit) e
  `server/prisma/migrations/20260830130000_add_job_watermark/migration.sql`. O resíduo: um item que
  falha isolado (fault-isolated) some do scan da marca depois de `OVERLAP_MS` sem ser retocado — troca
  retry-infinito por retry-com-janela; decisão do dono pendente sobre rescan periódico.
- **#235 — runbook B-4 registra ausência de linha no mapa.** Grep por `B-1|B-4` em
  `docs/accounting/ACCOUNTING-MASTER-MAP.md` → **0 ocorrências**, confirmando o que o PR já
  registrava: não há linha "B-1"/"B-4" no mapa mestre; o runbook aponta isso no campo de rastreio
  para o dono preencher se/quando o mapa ganhar a linha.
- **#245 — `MAX_CENTS` continua = teto Int32 antigo, em todos os DTOs de dinheiro; decisão
  ratificada, não pendência.** Confirmado por leitura: `server/src/features/accounting/models/
  money.ts:20` — `export const MAX_CENTS = 2_147_483_647;`, referenciado em 7 DTOs/serviços
  (`PostingDto`, `PayableDto`, `InventoryDto`, `ReconciliationDto`, `dataExchangeValidators.ts`,
  `ExerciseClosingService.ts`, `errors.ts`, entre outros — 14 arquivos de produção+teste no total,
  grep confirma). A persistência aguenta BigInt desde este PR; a API continua rejeitando >R$21,47M
  com 400. O ganho de #245 é **defensivo** (dado herdado/import acima do teto antigo não envenena
  mais a leitura via overflow silencioso — ver `PostingRepository.moneyOverflow.test.ts`), não
  capacidade nova na API. **Decisão do dono, 2026-08-31: MANTER o teto como política** — guarda de
  sanidade contra erro de digitação, sobe quando um cliente real precisar. O docstring do próprio
  `money.ts` já registra essa reclassificação ("MAX_CENTS is a POLICY ceiling only (F-W2B-2a)").
  **Atualização 2026-08-31 — a decisão foi DOCUMENTADA:** PR #246 mergeado
  (`4ff859bd66c3151a513782ae766e5daa31b35079`, confirmado em `origin/main`) criou
  [`docs/accounting/LIMITE-MAX-CENTS.md`](./LIMITE-MAX-CENTS.md) (57 linhas, arquivo confirmado
  presente em `origin/main`) e anotou `maximum: 2147483647` (+ `minimum: -2147483647` nos campos
  bilaterais) em 6 campos de dinheiro do contrato OpenAPI (`PostingDto` debit/credit,
  `PayableDto` ×2, `ReceivableDto` ×2, `ReconciliationDto` — saldo bilateral ±). Antes do #246,
  `server/public/openapi.json` tinha **0 ocorrências** de `2147483647`; depois, **10** — confirmado
  por `grep -o "2147483647" server/public/openapi.json | wc -l` rodado nos dois commits
  (`0bea6755` = 0, `origin/main` atual = 10). Quem integra pelo contrato agora vê o teto declarado,
  não só descobre via 400 em runtime.
- **#245 — `jsonBigintReplacer` tem alcance GLOBAL, não só contabilidade.** Confirmado por leitura
  de `server/src/app.ts`: `app.set('json replacer', jsonBigintReplacer)` roda uma única vez dentro
  de `createApp()`, antes de qualquer `app.use()` de rota — vale para TODA resposta JSON do
  processo Express, não só rotas `/api/accounting/*`. Teste unitário
  (`server/src/lib/__tests__/jsonBigintReplacer.test.ts`) confirma que valores não-bigint passam
  intocados (`'passes non-bigint values through untouched'`), mas **nenhum teste de integração
  deste PR bate um endpoint não-contábil** para provar byte-identidade em produção — o diff completo
  de #245 (42 arquivos) não toca nenhum controller/rota fora de `features/accounting`. O claim de
  que "revisor verificou... byte-idêntico em endpoints não-contábeis" (recebido por mensagem) fica
  registrado com grau **informado**, não confirmado por artefato de teste que eu tenha lido — é
  plausível dado que a função é comprovadamente no-op para não-bigint, mas não é a mesma coisa que
  uma prova ponta-a-ponta. Registro como fato de blast radius para quem for mexer depois: qualquer
  regressão em `jsonBigintReplacer` afeta o app inteiro, não só o módulo de contabilidade.
- **#245 — correção ao próprio PR: `_sum` de centavos não existia só em `PostingRepository`.**
  O corpo do PR atribui a correção de agregação a "um único ponto de concentração:
  `PostingRepository.groupByAccount`/`groupByAccountAndDimension`". Grep por `_sum` em
  `server/src/jobs/accountingSyncReconcile.job.ts` (em `origin/main`) encontra **mais 2 sítios**,
  independentes do repositório: linha 1289 (`prisma.customerPackageBalance.groupBy({ _sum: {
  balanceCents: true } })`, dentro de `reconcilePackageBalanceVsLiability`) e linha 1307
  (`prisma.posting.aggregate({ _sum: { debitCents: true, creditCents: true } })`, cálculo do saldo
  de `2.1.1`). Ambos **foram convertidos corretamente** via `centsFromDb` nas linhas seguintes
  (1294, 1310) — não é um bug, é uma imprecisão de escopo na descrição do PR. Registrado aqui
  porque a próxima pessoa que procurar "todo `_sum` de `*Cents`" pelo texto do PR erraria a
  contagem.
- **`ACCOUNTING-MASTER-MAP.md` T4 (linha 256) está stale desde o #245 — pendência de fold do dono,
  não corrigida por mim.** Confirmado por leitura: a linha diz "Dinheiro = centavo inteiro `Int`,
  teto Int32 compartilhado (`MAX_CENTS`)... Upgrade a `BigInt` só quando um leg real passar de ~R$
  21,47M" — descreve o upgrade a `BigInt` como evento FUTURO condicional, quando na verdade já
  aconteceu (#245, mergeado). O achado é do executor do #246 (documentado no próprio PR como fora de
  escopo, não consertado ali) — correto não consertar: master map é **Decisão TRAVADA**, exige ADR +
  sinal humano (ORCH-006), e este documento REGISTRADOR não edita `ACCOUNTING-MASTER-MAP.md`. Fica
  registrado aqui como pendência de fold explícita para o dono: a linha T4 precisa de uma emenda que
  separe os dois eixos que #245 desacoplou — persistência (`BigInt`, já feito) vs. teto de política
  da API (`MAX_CENTS = 2_147_483_647`, mantido por decisão, ver achado acima) — hoje T4 trata os dois
  como um só número com um só destino.

---

## 5. Método do pipeline

Executor → revisor independente (worktree separado) → merge serial, um PR por vez, cada branch
nascendo de `origin/main` fresco. Dois desvios de BRIEF foram sancionados pelo orquestrador, não
pelo executor: **#236** reusou `scripts/migrate-deploy.mjs` já existente em vez de criar o script
novo que o BRIEF pedia (achado de "reuse antes de recriar" antes de codar); **#240** introduziu um
cursor efêmero (`afterLineNumber`) não previsto no pseudocódigo do BRIEF, para fechar um loop
infinito que o desenho original do BRIEF teria produzido em lotes com linhas sempre-ambíguas. O
orquestrador relata 3 FAILs de review reais anteriores aos PRs finais (#233 ponteiro morto vizinho,
#239 escape síncrono do webhook, #243 resíduo não documentado) e 1 agente que morreu após pushar sem
perder o trabalho — **nenhum dos dois é verificável por artefato de git**: os PRs mergeados já
representam o estado final pós-correção, e o histórico de review/sessão que precedeu cada PR não
sobrevive no repositório. Registro como relatado pelo orquestrador, grau **informado**, não
verificado.

---

## 6. Buraco no desenho da CI (achado do pipeline) — e uma correção a uma leitura errada dele

**Fato 1 — o flake, confirmado.** O push do #243 para `main` (run
`33354586288`, evento `push`, branch `main`) falhou na 1ª tentativa: job "Server – typecheck & test"
com `conclusion: failure`. Log baixado e lido (`gh api .../jobs/99374188655/logs`): a falha ocorreu
dentro do passo `Assert no leaked handles (forceExit tripwire)` (que roda `npm run test:leaks`, uma
2ª passada de `jest --detectOpenHandles --runInBand` sobre a suíte inteira), não no passo `Run
tests` anterior (que passou limpo). Resultado exato: `Test Suites: 1 failed, 220 passed, 221 total` /
`Tests: 1 failed, 2606 passed, 2607 total`, com
`PostingRepository.concurrency.test.ts` reprovando em
`PrismaClientKnownRequestError: Transaction API error: Unable to start a transaction in the given
time.` (linha 90 do teste). A 2ª tentativa do mesmo run (`attempts/2`) voltou 100% verde sem
nenhuma mudança de código — consistente com a classe de flake já registrada no projeto
(`windows-serializa-sqlite-ci-linux-nao`/TECH-DEBT-TEST-001: contenção de lock SQLite sob
`--runInBand`, não bug de diff).

**Fato 2 — o achado estrutural que a mensagem original trazia estava ERRADO, e a correção é o
achado real.** A mensagem que motivou esta seção afirmava que o passo "Assert no leaked handles"
"só roda no push para `main`, não nos checks de PR — então nenhum gate de PR cobre essa classe".
**Verifiquei diretamente e isso é falso:**

- `.github/workflows/ci.yml` (linhas 3-5): `on: push: / pull_request:` — **sem filtro de branch em
  nenhum dos dois**, e o passo do tripwire não tem `if:` que o restrinja a um evento específico.
- `gh api repos/.../actions/jobs/99371644981` (o job "Server – typecheck & test" do run
  `33353669579`, **evento `pull_request`**, PR #243) lista o passo `"Assert no leaked handles
  (forceExit tripwire)"` com `"conclusion":"success"` — ele **rodou e passou** no check da própria
  PR #243.
- Repeti a checagem em PR #245 (`gh pr checks 245` → run `33359241248`, confirmado `event:
  pull_request` via `gh api`): mesmo passo, mesmo resultado — `"conclusion":"success"`.
- `gh api repos/.../branches/main/protection` confirma que **"Server – typecheck & test" é status
  check obrigatório** para merge em `main` — como o tripwire é um PASSO dentro desse job (não um
  job/check separado), uma falha nele reprova o job inteiro, o que **bloquearia o merge da PR**, não
  só o push pós-merge.

**Conclusão:** o gate cobre a classe, inclusive em PR. O que é verdade — e é o achado estrutural
real, mais estreito do que o originalmente relatado — é que o passo **re-executa a suíte inteira sob
`--detectOpenHandles`, sem escopo por diff**, então todo PR paga o custo total de tempo (esse passo
sozinho não tem medição própria no log, mas o job inteiro levou 12-15 min nos runs inspecionados) e
herda qualquer flake de concorrência pré-existente na suíte inteira, não só nos arquivos que o PR
tocou. Isso não é proposto para solução aqui — é registro para o dono decidir, incluindo se vale a
pena registrar/rastrear a ocorrência específica de `PostingRepository.concurrency.test.ts` como
instância nomeada da classe TECH-DEBT-TEST-001.

---

## 7. O que continua sendo gate humano

Nenhum agente substitui estes. Runbooks confirmados **sem nenhuma assinatura**
(`grep -c "\[x\]" docs/accounting/RUNBOOK*.md` → 0 em todos):

| Gate | Runbook | Cobre |
|---|---|---|
| **H1** — sign-off PVA | `docs/accounting/RUNBOOK-H1-PVA.md` | ECD/Apuração/ECF no PVA oficial da RFB (fecha E-2) |
| **H2** — sign-off de browser | `docs/accounting/RUNBOOK-H2-BROWSER-SIGNOFF.md` | app em build de produção contra `dev.db` real |
| **X2** — arquivo RFB | `docs/accounting/RUNBOOK-X2-RFB-REFERENCIAL.md` | referencial oficial "PJ em Geral" (fecha E-1) |
| **M2** — deploy | `docs/accounting/RUNBOOK-M2-DEPLOY-SMOKE.md` | 1º deploy real, host provisionado (ADR-M2 §7 aberto) |
| **B-4** — ensaio de restauração | `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md` | backup → restaurar → validar (nunca exercitado) |

Todos em branco por desenho — agente prepara o runbook, não preenche evidência, não marca desfecho,
não assina. Runbook sem assinatura é nulo.

---

## 8. Proposta, não ratificação

Este documento **não** entra na fila §5.1 do `ACCOUNTING-MASTER-MAP.md` nem dobra o
`PROXIMOS-PASSOS-2026-08-28.md`. Fold é decisão do dono (ORCH-006) — este registro só organiza o que
já está em `origin/main` mais o que ainda falta, para essa decisão ser tomada com o inventário
completo na mão.

---

## 9. Emenda 2026-08-31 — quatro correções de fato sobre este registro

Este é um registro **datado**: as seções acima não foram reescritas. O que se apurou no dia seguinte,
lendo os runbooks e o código em vez do resumo:

### 9.1 E-1 / X2 nunca dependeu de terceiro

O §1 classifica o X2 como espera pelo contador. O próprio `RUNBOOK-X2-RFB-REFERENCIAL.md` sempre deu a
fonte alternativa — "contador **ou portal SPED/RFB**" — e o arquivo foi baixado em 2026-08-31 de
<http://sped.rfb.gov.br/arquivo/download/8002>:
`Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_2026.xlsx`, 1.724.077 bytes.

Duas ressalvas que só apareceram ao abrir o arquivo, ambas registradas na emenda do próprio X2:

1. **O arquivo oficial é XLSX; o conversor lê texto com pipe.** O passo 1 do runbook, como estava, não
   aceitava o arquivo que a pré-condição mandava baixar. Ou se pula o conversor (a rota de import já
   aceita XLSX e só exige `code`,`name`,`isAnalytic`), ou se corrigem os índices para
   `--tipo 4 --parent 5` — o default veio de um leiaute de fornecedor, não da RFB.
2. **O arquivo é do ano-calendário 2025**, não "de 2026". Se o encerramento executado no H1 for de outro
   exercício, esta não é a tabela.

**Efeito na fila:** o item 6 do Bloco A (§5.1 do master map) deixa de ser *dado externo em espera* e
passa a *executável*. Emendado lá.

### 9.2 São seis runbooks em branco, não cinco

Além dos cinco nomeados no `RUNBOOK-FORMAT.md`, existe `RUNBOOK-H3-P2-CLINICA.md` (prova do P2, vertical
clínica estética), preparado em 2026-08-25 e igualmente sem assinatura. O próprio cabeçalho dele registra
que ainda não está na tabela dos cinco e que a linha depende de o dono promover o ADR-P2.

Conferência de 2026-08-31: `grep -c "[x]"` = **0** nos **seis**.

### 9.3 B-4 é pré-condição de E-2, não um item paralelo

A pré-condição **P2** do `RUNBOOK-H1-PVA.md` exige backup do `dev.db` real porque o passo 1 do H1
**escreve no razão**. Sem B-4 executado, o H1 começa em desfecho BLOQUEADO. A ordem **B-4 → H1** é
imposta pelo runbook, não é preferência de execução. Registrado como linha própria no Bloco A.

### 9.4 Lacuna nova, registrada e não aberta: apuração de tributos

O item **G** deste inventário lista o que está diferido **por decisão**. A apuração de tributos não estava
nem aí: o mapa registra o *subrazão* de fiscal/tributos e o `ADR-INCR-NFE` para o *documento fiscal*, mas
**nada calcula** o que se paga por mês ou trimestre. Hoje o sistema não computa tributo algum — a ECF só
segrega receita bruta e o PVA aplica a presunção, por decisão ratificada em ADR — e ECD/ECF são obrigações
**anuais**.

Varredura em `server/src` (2026-08-31): **0** ocorrências de `PIS`, `COFINS`, `ICMS`, `DARF`,
`Simples Nacional`, `NFS-e`; `ISS` aparece 2× e apenas como *string* de categoria de despesa em script
de auditoria de KPI.

**Foi registrado no §5 do master map como diferido, não aberto.** Abrir exige ADR + sinal humano
(ORCH-006), e o desenho depende de uma pergunta ainda sem resposta: **o regime tributário do primeiro
cliente real**. Optante do Simples é dispensado de ECD/ECF mas paga DAS todo mês — o que inverteria a
prioridade entre esta lacuna e o Núcleo 5.

> Nada nesta emenda muda a ordem dos gates humanos: **B-4 → H1 → H2 → M2** segue de pé, e nenhum deles
> fica mais barato depois. Um agente preparou e emendou estes runbooks; **evidência, desfecho e
> assinatura continuam sendo do executor humano**.
