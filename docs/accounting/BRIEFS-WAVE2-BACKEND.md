# BRIEFS-WAVE2-BACKEND — 4 mini-BRIEFs (sessão de planejamento)

> **Nota do registrador (2026-08-31):** registro histórico congelado — este é o BRIEF tal como
> existia no momento da execução (2026-08-30); status de fork, "pendente"s e achados aqui **podem
> estar desatualizados**. Os desfechos reais (o que de fato foi mergeado, o que ficou em andamento,
> o que foi diferido) estão em
> [`PRE-DADOS-REAIS-2026-08-30.md`](./PRE-DADOS-REAIS-2026-08-30.md).

> **Autorização citável:** "Pode disparar" + forks F3(a), F4(ampla), F5(a), F6(agora), ratificados
> via AskUserQuestion pelo dono em 2026-08-30 (sessão do orquestrador que abriu esta sessão de
> planejamento). Precedente de ratificação **dentro da sessão** (fork-a-fork, dono respondendo na
> hora): já usado em NF-e e INCR-DIM — ver `.claude/skills/sessao-planejamento/SKILL.md`,
> "Pendências de ratificação do próprio template", item 3. Nenhum documento datado 2026-08-30
> nomeia F3–F6 fora desta conversa — a autorização É esta conversa; registrado aqui como fato, não
> reinterpretado.
>
> **Base:** worktree HEAD = `origin/main` = `41884c8a` (confirmado via `git fetch` antes de ler
> qualquer arquivo). Todos os `file:line` abaixo foram lidos nesta sessão, não citados de memória.
>
> **Escopo:** backend apenas (`server/`), por convenção do repo (`BE-INCR-*` ≠ `FE-INCR-*`).
> Nenhuma linha de código foi escrita — só os 4 BRIEFs abaixo.

---

## BRIEF-W2-C — webhook de alerta mínimo (F3a)

### Insumos lidos
- `server/src/jobs/AccountingSyncScheduler.ts:88-136` (`runOnce`) — resumo do reconcile já calcula
  `blocked`/`summary.failed` e já decide `warn` vs `info` (linha 116).
- `server/src/jobs/accountingSyncReconcileCli.ts` (arquivo inteiro, 55 linhas) — mesmo resumo, saída
  CLI.
- `server/src/features/accounting/services/SpedGenerationService.ts:129-140`,
  `SpedEcfGenerationService.ts:176-187`, `DataExchangeExportService.ts:143-151` — **os 3 catches são
  byte-a-byte idênticos**: `catch (error) { await this.repo.updateJob(scope, job.id, { status:
  'FAILED' }); throw error; }`. Nenhum dos 3 chama `logger` hoje.
- `server/.env.example` — confirmado BOM (`EF BB BF`) + `\r\n` no primeiro byte via `xxd`. Edição
  precisa preservar os 3 bytes iniciais.

### Checklist numerado
1. Novo helper `server/src/lib/alertWebhook.ts`: função `sendAlertWebhook(payload: AlertPayload):
   void` — **fire-and-forget** (não `await` no call site), `fetch` com `AbortController` timeout
   curto (ex.: 3000 ms, const nomeada), sem retry. No-op silencioso quando `ALERT_WEBHOOK_URL` não
   está setada (não é warn — ausência é configuração válida). Falha do fetch (rede, non-2xx, timeout)
   vira **um único `logger.warn`** ("alert webhook failed") — nunca propaga, nunca derruba o
   chamador.
2. `ALERT_WEBHOOK_URL` adicionada ao `.env.example` **preservando o BOM** — inserir a linha via
   ferramenta que não reescreve o arquivo do zero (ou reconfirmar os 3 bytes `EF BB BF` após a
   edição).
3. Chamada em `AccountingSyncScheduler.runOnce()` dentro do bloco `if (blocked > 0 ||
   summary.failed > 0)` (linha 116) — mesmo payload que já vai pro `logger.warn`, mais `job` e
   `runId`.
4. Chamada em `accountingSyncReconcileCli.runCli()` — mesmo predicado (`summary.failed > 0`, e
   opcionalmente `blocked > 0`) espelhando o scheduler, **para não branch-ar o CLI e o scheduler em
   critérios diferentes de alerta** (achado: hoje o CLI só usa `failed` no exit code — o alerta deve
   seguir o MESMO critério do scheduler, `blocked>0 || failed>0`, não o exit code).
5. Chamada nos 3 catches de `FAILED` (Sped/SpedEcf/DataExchange) — **antes** do `throw error;`,
   payload com `job.id`, `kind`, `scope.unitId`. Como os 3 catches são idênticos, considerar extrair
   um único helper privado (`failJob(scope, job, error)`) nos 3 services **só se não** violar posse
   de cada service (são classes distintas sem base comum hoje) — do contrário, repetir a chamada 3x
   é aceitável (Contrato §0: divergência de posse sanciona bespoke).
6. Teste: mock de `fetch` (nunca chamada real) — assert (a) payload shape correto por gatilho, (b)
   webhook nunca chamado quando `ALERT_WEBHOOK_URL` ausente, (c) erro do webhook (fetch rejeita ou
   non-2xx) **não** propaga nem muda o retorno/exit code do chamador, (d) timeout curto é respeitado
   (fake timers).

### Contratos (esboço)
```ts
// server/src/lib/alertWebhook.ts
interface AlertPayload {
  source: 'accounting_sync_reconcile' | 'sped_ecd' | 'sped_ecf' | 'data_exchange_export';
  event: 'reconcile_summary' | 'generation_failed';
  timestamp: string; // ISO
  [key: string]: unknown; // campos livres por gatilho (failed, blocked, jobId, kind…)
}
function sendAlertWebhook(payload: AlertPayload): void; // fire-and-forget, nunca lança
```

### Gate de saída
`tsc` limpo; teste novo verde; `.env.example` com BOM intacto (`xxd -l 3` = `ef bb bf`); nenhum
`await` no call site do webhook (fire-and-forget verificado por leitura, não só por teste).

### Forks pendentes de ratificação
- **F-W2C-1:** extrair `failJob()` compartilhado nos 3 services de geração vs. repetir a chamada 3x.
  Recomendação: **repetir** — os 3 catches já são cópias independentes hoje (nenhum dos 3 services
  compartilha base), e um helper cross-service para 3 linhas idênticas é o tipo de abstração prematura
  que o ponytail cortaria. **PENDENTE.**
- **F-W2C-2:** o critério de alerta do CLI deve ser `blocked>0 || failed>0` (paridade com o
  scheduler) ou só `failed>0` (paridade com o exit code atual)? Recomendação: paridade com o
  **scheduler** — o alerta é sobre "algo pede atenção humana", não sobre o exit code do processo.
  **PENDENTE.**

---

## BRIEF-W2-D — instrumentação de tempo AMPLA (F4)

### Insumos lidos
- `server/src/lib/monitoring.ts` (43 linhas, arquivo inteiro) — **achado que muda o desenho:** já
  existe `Metrics.startTimer(metricName)` — `Date.now()`-based, retorna `(opts:{success,...}) =>
  void` que loga `duration` em `info` (sucesso) ou `warn` (falha). **Já em uso vivo** (não
  código morto — confirmado via grep): `VectorRepository.ts:56,137,232` e
  `DocumentProcessingService.ts:22,69,100,129`. Isto é o canônico a reusar (Contrato §0), não um
  helper novo.
- `server/src/lib/logger.ts:99-119` — confirma a restrição dura: só `error`/`warn` chamam
  `appendToErrorLog` (linha 117-119); `info` é console-only. `Metrics.startTimer` hoje só vira
  `warn` quando `success:false` — uma corrida **lenta mas bem-sucedida** loga em `info` e portanto
  **não sobrevive ao disco**. É a lacuna que este BRIEF fecha.
- `server/src/app.ts:21-111` (arquivo inteiro) — stack de middleware: `helmet → cors → compression →
  json → urlencoded → rateLimit → authMiddleware → routes → 404 → error handler`. Nenhum middleware
  de duração hoje.
- `server/src/jobs/AccountingSyncScheduler.ts:100-121` — **já tem `durationMs`** no resumo (linha
  107) e já decide `warn` por `blocked>0||failed>0` — layer 1 já cumprida aqui, nada a fazer.
- `server/src/jobs/accountingSyncReconcileCli.ts:19-49` — **não tem `durationMs`** — falta.
- `server/src/features/accounting/services/SpedGenerationService.ts`,
  `SpedEcfGenerationService.ts`, `DataExchangeExportService.ts` — **zero chamada a `logger` hoje**
  (grep confirmou) — layer 1 nasce do zero nos 3.
- `server/src/features/accounting/services/AccountingReportService.ts:322,352,363,436,496` —
  `trialBalance` (Balancete), `accountLedger` (Razão por conta), `balanceSheet` (BP),
  `incomeStatement` (DRE).
- `server/src/features/accounting/services/CashFlowReportService.ts:181` — `cashFlowStatement`
  (DFC).
- `server/src/features/accounting/services/DailyJournalReportService.ts:72` — `dailyJournal`
  (Livro Diário).

### Checklist numerado
1. **Estender `Metrics.startTimer`** (não recriar): aceitar `warnThresholdMs?: number` opcional no
   retorno-callback ou num segundo parâmetro de `startTimer`. Regra: `warn` quando `!success` **OU**
   `duration > warnThresholdMs` (quando fornecido); senão `info`. Assinatura antiga sem threshold
   preserva o comportamento atual byte-a-byte (nenhum dos 7 call sites vivos muda de log level) —
   mudança aditiva, não breaking.
2. **Layer 1 — resumos de job.** `durationMs` sempre presente:
   - `accountingSyncReconcileCli.runCli()` — adicionar (scheduler já tem).
   - `SpedGenerationService`/`SpedEcfGenerationService`/`DataExchangeExportService` — envolver o
     método de geração inteiro (da criação do `job` PROCESSING até o retorno ou o `throw` do catch
     FAILED) com `metrics.startTimer('sped_ecd_generation')` (nomes por serviço) + threshold
     proposto (ver contrato).
3. **Layer 2 — middleware HTTP.** Novo middleware em `app.ts`, inserido logo após `compression()` e
   antes de `json()` (mede parsing de body + auth + rota inteira — é o tempo fim-a-fim que interessa
   pro operador). Usa `res.on('finish', …)` + `Date.now()` (zero dep nova, reusa o padrão de
   `Metrics`). `warn` quando `duration > HTTP_WARN_THRESHOLD_MS` (const, proposto 2000 ms — rotas de
   relatório pesado já são medidas separadamente na layer 3, o threshold HTTP é sobre a cauda longa
   agregada, não sobre o relatório em si).
4. **Layer 3 — serviços de relatório.** Envolver os 6 métodos listados acima com
   `metrics.startTimer('report_<nome>')` + threshold por camada (proposto: 1000 ms para
   `trialBalance`/`accountLedger`/`dailyJournal`, 1500 ms para `balanceSheet`/`incomeStatement`/
   `cashFlowStatement` — os 3 últimos agregam sobre o razão inteiro). Todos os thresholds em uma
   única const exportada (`server/src/lib/reportThresholds.ts` ou similar) — não espalhados por
   arquivo.
5. Teste: (a) assert que `durationMs`/`duration` existe no objeto logado em cada resumo de job
   tocado; (b) assert que uma chamada artificialmente lenta (mock do clock ou `now` injetável, como
   o scheduler já faz em `SchedulerDeps.now`) dispara `logger.warn` mesmo com `success:true`; (c)
   assert que abaixo do threshold permanece `info` (não regride o comportamento atual dos 7 call
   sites vivos).

### Contratos (esboço)
```ts
// server/src/lib/monitoring.ts (extensão aditiva)
interface MetricOptions {
  success: boolean;
  warnThresholdMs?: number; // NOVO — opcional, backward-compatible
  [key: string]: unknown;
}
// startTimer() em si não muda de assinatura; a decisão de log level em `endTimer(options)` passa a
// checar `!options.success || (options.warnThresholdMs != null && duration > options.warnThresholdMs)`.
```
```ts
// server/src/lib/reportThresholds.ts (novo)
export const REPORT_WARN_THRESHOLDS_MS = {
  trialBalance: 1000,
  accountLedger: 1000,
  dailyJournal: 1000,
  balanceSheet: 1500,
  incomeStatement: 1500,
  cashFlowStatement: 1500,
} as const;
export const HTTP_WARN_THRESHOLD_MS = 2000;
```

### Gate de saída
`tsc` limpo; os 7 call sites vivos de `Metrics.startTimer` continuam com o MESMO log level nos
testes existentes deles (regressão zero); teste novo comprova threshold→warn; middleware HTTP testado
via supertest (`res.on('finish')` dispara mesmo em erro 4xx/5xx).

### Forks pendentes de ratificação
- **F-W2D-1:** valores numéricos dos thresholds (1000/1500/2000 ms acima) são um **chute
  fundamentado em nada além da forma da query** — não há medição real de tempo de resposta em
  `dev.db`. Recomendação: ratificar como ponto de partida configurável (const exportada, fácil de
  ajustar depois de medir em produção), não como número final. **PENDENTE — e nomeio o viés: eu não
  tenho dado de latência real para calibrar isso (T8).**
- **F-W2D-2:** middleware HTTP mede a rota inteira (parsing+auth+handler) ou só o handler de rota
  (inserido depois de `authMiddleware`, antes de `app.use('/api', routes)`)? Recomendação: a rota
  inteira (posição proposta no checklist item 3) — é o tempo que o operador de fato quer saber
  ("por que essa requisição demorou"), não só o tempo de negócio. **PENDENTE.**

---

## BRIEF-W2-E — autoMatch em chunks (F5a)

### Insumos lidos
- `server/src/features/accounting/services/ReconciliationService.ts` (linhas 1-340 lidas por
  inteiro). Achados exatos:
  - `autoMatchStatement` (linha 234-267): preflight fora da tx (linha 238-239, só existe-e-não-está-
    deletado), depois **uma única `runTransaction` interativa** (linha 243-266) que relê o
    `statement` DENTRO da tx (linha 246 — ACC-011, guarda contra `deleteStatement` concorrente),
    carrega `findLinesByStatement(scope, statementId, 'UNMATCHED', tx)` (linha 248) e itera TODAS as
    linhas UNMATCHED num loop síncrono dentro da MESMA tx.
  - Comentário ponytail explícito nas linhas 241-242: *"one interactive tx for the whole statement
    (Prisma default 5s) — chunk per N lines if real statements ever hit the timeout."* — é
    literalmente o upgrade que este BRIEF especifica.
  - Semântica por linha (linhas 251-264): 1 candidato → `commitMatch` (comita); 0 candidatos →
    `zeroCandidates++`; >1 → `ambiguous++` (abstém, D6). Nada disso muda com o chunking.
  - `commitMatch` (linhas 319-352, início) já relê `line` e `statement` DENTRO da tx recebida
    (ACC-011) — **é o gate autoritativo que já existe**; chunking só precisa preservar que cada
    lote continua chamando isso dentro da SUA PRÓPRIA tx, não de uma tx externa já fechada.
  - `findLinesByStatement` (interface `IReconciliationRepository.ts:100-105`, impl
    `ReconciliationRepository.ts:163-175`) — **hoje sem paginação** (`findMany` sem `skip/take`,
    `orderBy: lineNumber asc`, comentário da interface diz "Unpaginated — a statement is one bounded
    file"). Precisa de um `take` opcional.
  - O filtro `status: 'UNMATCHED'` já existe no `where` — é isto que torna o re-run seguro por
    construção: uma linha já comitada (`MATCHED`) sai do `WHERE status='UNMATCHED'` e nunca é
    reconsiderada. Não precisa de cursor/offset — o **próprio filtro de status é o cursor**.

### Checklist numerado
1. Const `RECONCILE_CHUNK_SIZE` (proposto 200, configurável, mesmo padrão de
   `RECONCILE_WINDOW_DAYS` linha 25) em `ReconciliationService.ts`.
2. Estender `findLinesByStatement` (interface + `ReconciliationRepository` + a implementação
   `TransactionalDynamicTableRepository`-equivalente, se existir uma segunda impl — checar) com um
   4º parâmetro opcional `{ take?: number }`, preservando `orderBy: lineNumber asc` (ordem
   determinística entre lotes).
3. Reescrever `autoMatchStatement`: **preflight fora de tx continua** (linha 238-239, sem mudança);
   depois, **loop de lotes**, cada iteração abrindo SUA PRÓPRIA `runTransaction`:
   ```
   loop:
     lote = runTransaction(tx => {
       statement = findStatementById(scope, statementId, tx)   // ACC-011 — relido A CADA lote
       if !statement: throw NotFoundError                       // para o lote seguinte, não corrompe os já commitados
       lines = findLinesByStatement(scope, statementId, 'UNMATCHED', tx, { take: CHUNK_SIZE })
       if lines.length == 0: return { done: true, ...zeros }
       para cada linha: mesma lógica de match/commitMatch de hoje
       return { done: false, processed, matched, zeroCandidates, ambiguous }
     })
     acumula lote no summary total
     se lote.done: break
   ```
4. **Re-check de liveness por lote (ACC-011):** já coberto no passo 3 — `findStatementById` roda
   DENTRO de cada tx de lote, não uma vez fora do loop. Se o statement for soft-deletado entre o
   lote N e o lote N+1, o lote N+1 lança `NotFoundError` — os lotes 1..N **já commitados
   permanecem commitados** (cada um é uma tx independente já fechada). É este o comportamento que o
   teste-falsificador (item 6) prova.
5. Acumulador de `AutoMatchSummary` atravessando lotes: somar `processed/matched/zeroCandidates/
   ambiguous` de cada lote no objeto de retorno final — a interface pública de
   `autoMatchStatement` (assinatura e shape do retorno) **não muda**, só o corpo.
6. Teste-falsificador dupla:
   - (a) extrato com `N_LINHAS > RECONCILE_CHUNK_SIZE` (ex.: 2.5x o chunk) processa **todas** as
     linhas (assert `summary.processed === total UNMATCHED` e nenhuma linha fica órfã sem
     classificação).
   - (b) extrato deletado (soft-delete) **entre** o commit do lote 1 e o início do lote 2 (via mock/
     spy no repo que injeta o delete no ponto exato entre lotes) → lote 2 lança `NotFoundError`;
     assert que os matches do lote 1 **permanecem no banco** (não são revertidos) e que a exceção se
     propaga ao chamador (não é engolida).

### Contratos (esboço)
```ts
// IReconciliationRepository.ts — extensão aditiva, backward-compatible
findLinesByStatement(
  scope: AccountingScope,
  statementId: string,
  status?: BankStatementLineStatus,
  tx?: Prisma.TransactionClient,
  opts?: { take?: number }, // NOVO
): Promise<BankStatementLine[]>;
```
Assinatura pública de `autoMatchStatement(scope, statementId): Promise<AutoMatchSummary>` — **sem
mudança** (o chunking é interno).

### Gate de saída
`tsc` limpo; os dois testes-falsificadores do item 6 vermelho→verde; suíte existente de
`ReconciliationService` (auto-match de extrato pequeno, dentro de 1 lote) permanece verde sem
alteração de asserts — prova que o comportamento de extrato pequeno é idêntico ao de hoje.

### Forks pendentes de ratificação
- **F-W2E-1:** valor de `RECONCILE_CHUNK_SIZE` (proposto 200) — mesmo caveat do F-W2D-1: chute sem
  medição de quantas linhas cabem em 5s de tx interativa no SQLite real. Recomendação: const
  configurável, não hardcoded inline. **PENDENTE.**
- **F-W2E-2:** quando o lote N+1 lança `NotFoundError` (statement sumiu no meio), o método deve (a)
  propagar a exceção crua (comportamento proposto acima) ou (b) engolir e retornar o summary parcial
  com um campo `interrupted: true`? Recomendação: **(a) propagar** — mascarar um extrato que
  desapareceu no meio como "sucesso parcial silencioso" é exatamente a classe de bug
  `param-aceito-e-ignorado-e-bug` da memória do projeto (fingir sucesso quando não é). **PENDENTE.**

---

## BRIEF-W2-F — marca d'água no reconcile (F6, dono ratificou AGORA contra recomendação — rigor extra)

### Insumo lido — job inteiro
`server/src/jobs/accountingSyncReconcile.job.ts` (1216 linhas, lido por inteiro, não por amostra).
Fatos extraídos:

- O job roda **8 passes** (`reconcileCrmReceivables`, `reconcileSaleSales`, `reconcileSale
  Cancellations`, `reconcileSaleReturns`, `reconcileSaleSettlements`, `reconcileSaleCogs`,
  `reconcileSalePackageOrigin`, `reconcileSalePackageConsumption`) mais um check warn-only
  (`reconcilePackageBalanceVsLiability`). **Nenhum usa timestamp hoje** — o predicado é 100% baseado
  em **valor de campo** (`status = 'Won'|'Finalized'|'Cancelled'|'Returned'`, mais
  `paymentStatus='Paid'` para settlement/consumption), via `listSalesByStatus()` (linhas 960-974) e
  `findRowsByFieldValue(table.id, 'status', 'Won')` (linha 1028) — que é `SELECT * WHERE
  json_extract(data,'$.status') = ? AND deletedAt IS NULL`, **sem filtro de tempo algum**
  (`DynamicTableRepository.ts:335-347`).
- **Por que o desenho de hoje nunca pula linha:** ele reescaneia a população vitalícia inteira a
  cada tick (5 min, `AccountingSyncScheduler` linha 21) — não há janela, não há cursor, então uma
  linha que virou elegível a qualquer momento no passado aparece em TODO tick seguinte até ser
  processada. A idempotência (`hasExistingEntry`/`findMovement`/checagem de status) é o que torna
  isso barato o suficiente para reescanear sempre, não um filtro de novidade.
- **Onde os escritores mutam o predicado:** o `status`/`paymentStatus` de uma linha `DynamicTable
  Data` é escrito via os controllers de CRM/Sales (fora deste job) — sempre por `prisma.
  dynamicTableData.update(...)`, nunca `$executeRaw` sobre essa tabela (confirmado: grep por
  `$executeRaw.*dynamic_table_data` = zero resultados). O campo `updatedAt DateTime @updatedAt`
  (schema `prisma/schema.prisma:257`) é **Prisma-gerenciado automaticamente em todo `update()`** —
  não há caminho de escrita que mude `status` sem também bater `updatedAt`. Isto fecha UM modo de
  falha (escrita que muda o predicado sem deixar rastro de tempo), mas não fecha o modo citado no
  enunciado do BRIEF (ver abaixo).

### A invariante e o modo de falha do desenho ingênuo
**Invariante:** nenhuma linha elegível pode ser pulada, nunca — mesmo sob concorrência.

**Desenho ingênuo (rejeitado):** cursor = `max(updatedAt)` visto no lote anterior; próximo tick
filtra `updatedAt > cursor`. **Falha concreta:** SQLite aqui roda com `PRAGMA busy_timeout = 5000`
(`server/src/lib/prisma.ts:24`) — uma transação de escrita pode ficar até 5s **enfileirada**
aguardando o lock antes de commitar. Cenário: no tick N, a transação A começa a atualizar uma linha
para `status='Won'` no instante T0; ela fica bloqueada (lock) e só commita em T0+4s. Enquanto isso,
outra transação B, iniciada depois mas sem contenção, commita em T0+0.5s com `updatedAt=T0+0.5s`. O
tick N lê o `max(updatedAt)` visto = `T0+0.5s` (de B) e avança o cursor pra lá — mas quando A
finalmente commita em T0+4s, seu `updatedAt` é `T0+4s` (Prisma marca no momento do `update()`, que
pode ser antes do commit efetivo sob contenção — a ordem de commit não é a ordem do timestamp
carimbado). Se o próximo tick já rodou entre T0+0.5s e T0+4s com o cursor em `T0+0.5s`, ele SIM pega
A no tick seguinte (`updatedAt=T0+4s > T0+0.5s`) — **esse caso específico não quebra**. O caso que
quebra de verdade: se o cursor avança para o **maior `updatedAt` observado**, e uma escrita commita
**depois** da leitura do cursor mas com um `updatedAt` **menor ou igual** ao que já foi visto e
persistido como cursor (ex.: relógio de sistema sem alta resolução, duas escritas no mesmo
milissegundo, ou — mais realista neste repo — uma migração/import que seta `updatedAt` explicitamente
para uma data passada, algo que o Prisma permite se o campo for passado no `data:` de um `update`
bruto de outra rotina que não este job). **Neste caso a linha nunca mais entra em nenhum
`WHERE updatedAt > cursor` futuro — perda silenciosa, exatamente a invariante violada.**

### Desenho seguro proposto: marca d'água por INÍCIO DE JANELA, não por valor máximo visto
- Persistir `watermarkAt` = **início do tick anterior menos uma janela de sobreposição**
  (`OVERLAP_MS`), nunca o maior `updatedAt` observado nas linhas. Cada tick roda:
  `runStartAt = now()`; filtra `updatedAt >= watermarkAt` (mantendo o filtro de `status` existente,
  inalterado); ao FIM do tick, **só se todos os 8 passes completaram sem exceção não-capturada**,
  persiste `watermarkAt = runStartAt - OVERLAP_MS` (nunca regressivo — `max(novo, watermark atual)`
  não se aplica aqui porque o novo é sempre >= o antigo por construção do relógio monotônico do
  processo).
- **Por que isso fecha o modo de falha acima:** o novo cursor não depende de "qual foi o maior
  timestamp que eu vi" — depende só de "quando este tick COMEÇOU a rodar, menos uma margem de
  segurança". Qualquer escrita que commite com um `updatedAt` **anterior** ao início do tick, mesmo
  que sua visibilidade (commit) só aconteça DEPOIS do início do tick por causa do `busy_timeout`,
  ainda está coberta enquanto `OVERLAP_MS` for maior que o atraso de commit mais o atraso de
  visibilidade. `busy_timeout=5000ms` é o teto documentado de quanto uma tx pode ficar esperando
  neste banco — proponho `OVERLAP_MS = 15 * 60 * 1000` (15 min, 180x o teto de 5s), configurável
  via const nomeada, não hardcoded inline.
- **Onde persiste:** tabela nova aditiva `JobWatermark` (singleton por `job`, não por tenant — o job
  já varre TODOS os tenants num único tick, então um cursor por tenant não faz sentido aqui):
  ```prisma
  model JobWatermark {
    job         String   @id
    watermarkAt DateTime
    updatedAt   DateTime @updatedAt
    @@map("job_watermarks")
  }
  ```
  Migração aditiva (`CREATE TABLE`, sem `ALTER` de tabela existente) — mesmo padrão de baixo risco
  do `AuditChainHead` (`prisma/schema.prisma:384-394`, precedente de tabela singleton/cursor neste
  schema). Precisa de **smoke-gate** (`smoke-gate-s6-x-migracao-de-dado` da memória — S6 reprova
  backfill por desenho; aqui não há backfill, é `INSERT` inicial de uma linha com `watermarkAt =
  epoch (1970-01-01)` no primeiro tick, o que faz o primeiro run se comportar EXATAMENTE como hoje —
  varredura completa — preservando o comportamento atual até o segundo tick).
- **Query estendida:** `findRowsByFieldValue` (linha 335-347) precisa de uma 2ª variante ou de um
  parâmetro extra `{ updatedAtFrom?: Date }` no `WHERE`, preservando `json_extract(data, '$.status')
  = ?` como está — aditivo, não substitui a função existente (outros 15+ call sites de
  `findRowsByFieldValue` fora deste job não devem ganhar filtro de tempo).

### Checklist numerado
1. Migração aditiva `JobWatermark` (schema acima) + seed do primeiro valor (epoch) no primeiro uso
   (lazy — não precisa de script de backfill separado).
2. Estender `DynamicTableRepository`/`IDynamicTableRepository` com filtro de tempo opcional em
   `findRowsByFieldValue` (ou método irmão dedicado, para não mudar a assinatura dos 15+ call sites
   existentes).
3. `runAccountingSyncReconcile()`: ler `watermarkAt` no início, propagar pro filtro de todas as 8
   listagens (`listWonOpportunities`, `listSalesByStatus`, etc.), computar `runStartAt` antes de
   qualquer pass, persistir `runStartAt - OVERLAP_MS` **só depois** do `reduce(mergeSummaries)`
   final (linha 1212) ter retornado sem lançar.
4. `OVERLAP_MS` const nomeada e configurável (proposto 15 min — ver fork abaixo).
5. Teste-falsificador **obrigatório**, dois cenários no MESMO teste:
   - **Desenho ingênuo (prova a falha):** mock de `updatedAt` de uma linha commitada DEPOIS do
     cursor avançar, mas com valor de `updatedAt` MENOR que o cursor já persistido (simula
     commit-atrasado-sob-contenção) → assert que um cursor "maior valor visto" NUNCA mais inclui
     essa linha em nenhuma consulta futura.
   - **Desenho proposto (prova o fechamento):** mesmo cenário — linha com `updatedAt` anterior ao
     `runStartAt` do tick N, mas cujo commit só fica visível depois do tick N já ter rodado → assert
     que o tick N+1, usando `watermarkAt = tick-N.runStartAt - OVERLAP_MS`, **inclui** essa linha
     (porque seu `updatedAt` cai dentro de `[watermarkAt, agora]`).
6. Suíte de regressão: primeiro tick (watermark=epoch) processa a população inteira — idêntico ao
   comportamento pré-mudança; nenhuma suíte de reconcile existente muda de resultado.

### Contratos (esboço)
```prisma
model JobWatermark {
  job         String   @id
  watermarkAt DateTime
  updatedAt   DateTime @updatedAt
  @@map("job_watermarks")
}
```
```ts
// runAccountingSyncReconcile() — assinatura pública inalterada (Promise<ReconcileSummary>);
// watermark é detalhe interno, não vaza no retorno.
```

### Gate de saída
`tsc` limpo; migração roda em `dev.db` real sem erro (smoke-gate); teste-falsificador (item 5) prova
os DOIS lados (ingênuo quebra, proposto não); suíte de reconcile existente 100% verde sem alteração
de assert.

### Forks pendentes de ratificação
- **F-W2F-1:** `OVERLAP_MS = 15 min` é 180x o teto documentado de `busy_timeout` (5s) — margem
  generosa, mas **sem medição de pior caso real de atraso de commit sob carga neste banco**.
  Recomendação: ratificar como ponto de partida configurável, revisar depois de medir contenção real
  em produção. **PENDENTE — viés nomeado: não tenho dado de carga real, só o teto documentado do
  PRAGMA (T8).**
- **F-W2F-2:** granularidade do watermark — um único cursor global (proposto) vs. um cursor por
  pass (8 cursores, um por `reconcile*`). Recomendação: **global único** — os 8 passes já rodam
  sempre juntos, sequencialmente, no mesmo tick (linhas 1019-1210); cursores independentes
  adicionariam complexidade sem benefício, já que nenhum pass roda sozinho hoje. **PENDENTE.**
- **F-W2F-3 (o mais importante):** este BRIEF entrega um desenho que FECHA a invariante sob a
  suposição de que `OVERLAP_MS` é escolhido corretamente E que nenhuma escrita externa a este
  processo (import direto no banco, migração manual, replica futura) seta `updatedAt` para uma data
  MAIS ANTIGA que `watermarkAt` no momento em que a escrita se torna visível. Essa suposição É
  verificável hoje (grep confirmou zero `$executeRaw` sobre `dynamic_table_data`) mas **não é
  garantida estruturalmente** — nenhum constraint impede um código futuro de fazer isso. Registro
  isto como o resíduo de risco do desenho proposto: ele fecha o modo de falha do enunciado (commit
  atrasado sob contenção), mas depende de uma disciplina de escrita que só está provada por ausência
  de contra-exemplo hoje, não por constraint de schema. **Não é motivo para devolver "arriscado
  demais"** (o modo de falha citado no enunciado está genuinamente fechado), mas é motivo para o
  dono decidir se aceita esse resíduo ou prefere manter a varredura completa (sem watermark) até
  haver medição real de que o custo da varredura completa é um problema de fato — **nenhuma
  medição de performance foi feita nesta sessão de planejamento (insumo ausente)**.

### Insumos ausentes
- Nenhuma medição de tempo de execução do `runAccountingSyncReconcile()` atual (quantas linhas por
  tick, quanto tempo o full-scan leva hoje) — sem isso, o benefício do watermark é assumido, não
  medido. Fora do escopo desta sessão (moratória — não varri o repo além do job e seus vizinhos
  diretos).

---

## Achados fora de escopo (registrados, não planejados)
- `Metrics.startTimer` (BRIEF-D) é canônico e vivo, mas seu uso está hoje restrito a
  `features/documents/` — nenhum outro domínio (accounting, CRM) o usa. Vale uma auditoria de reuso
  mais ampla depois (fora desta autorização — ORCH-006).
- Os 3 catches `FAILED` idênticos em Sped/SpedEcf/DataExchange (BRIEF-C) sugerem que os 3 services
  poderiam compartilhar uma base/mixin de "job de exportação com storage" — não proponho isso aqui
  (fora do item autorizado; F3a pede só o webhook).

## Resumo (≤10 linhas)
4 mini-BRIEFs prontos em `BRIEFS-WAVE2-BACKEND.md`: (C) webhook fire-and-forget em 2 pontos do
reconcile + 3 catches FAILED idênticos de Sped/Ecf/DataExchange, atenção ao BOM do `.env.example`.
(D) achado que muda o desenho: `server/src/lib/monitoring.ts` já tem `Metrics.startTimer` vivo em uso
(`VectorRepository`, `DocumentProcessingService`) — estender com threshold, não recriar; scheduler já
tem `durationMs`, CLI e os 3 geradores SPED/ECF/export não. (E) `autoMatchStatement`
(`ReconciliationService.ts:234-267`) já tem o comentário ponytail nomeando o upgrade; filtro
`status='UNMATCHED'` já é o cursor natural — chunking só precisa de `take` na query + tx por lote.
(F) job (1216 linhas, lido inteiro) não usa timestamp hoje — só `status`; desenho ingênuo
(cursor=max-visto) quebra sob `busy_timeout=5000ms`; proposto watermark por início-de-janela com
overlap 15min (180x o teto), tabela aditiva `JobWatermark`, persiste só após sucesso total. 9 forks
listados, nenhum ratificado (é o desenho da sessão de planejamento). Maior risco residual: F-W2F-3
(watermark depende de disciplina de escrita não garantida por schema) e os thresholds numéricos de
D/E/F são chutes sem medição real — nomeados explicitamente, não escondidos.
