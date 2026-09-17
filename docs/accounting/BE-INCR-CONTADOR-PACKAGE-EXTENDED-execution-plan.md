# C6b — Plano de execução granular: BE-INCR-CONTADOR-PACKAGE-EXTENDED

> **✅ EXECUTADO 2026-09-17: PR-1 #337 `daf76279` · PR-2 #338 `15c8bf53` · PR-3 #340 `373d00d4`. Reviews independentes: PR-1 PASS (+1 MÉDIO fechado), PR-2 FAIL→PASS (2 ALTO + 1 MÉDIO), PR-3 FAIL→PASS (1 BLOQUEANTE na migração). Desvios registrados nos PRs; nenhum fork novo.**
>
> **Estado: plano de execução (granularização do BRIEF), 2026-09-16.** Forks F-C6b-1..5 → (a) ✅
> ratificados (`CEDULA-DECISAO-2026-09-16-forks-c11-c12-c6b-c8-seed.md`). C11 ✅ mergeado (#334
> `a2c974cb`) — a pré-condição serial está satisfeita. **Implementação continua exigindo "executa"
> do dono (ORCH-006).** Este documento NÃO altera o BRIEF (`BE-INCR-CONTADOR-PACKAGE-EXTENDED-brief.md`)
> — ele o desce ao nível de passo/arquivo/teste, e registra **3 forks novos (F-C6b-6..8)** que a leitura
> do código pós-C11 expôs dentro do caminho (a) de F-C6b-3. Escrito em `sessao-planejamento`.
>
> **✅ 2026-09-16 (mesma data, sessão seguinte): F-C6b-6/7/8 → (a) RATIFICADOS pelo dono via
> `AskUserQuestion` (todos na recomendação) + fatiamento **3 PRs seriais** ratificado + "executa" dado:
> *"Pode disparar a implementação em sonnets"*. Cada PR roda por `sessao-feature` em agente próprio,
> serial (PR-N+1 só abre após merge de PR-N).**

- **Autorização:** cédula 10/09 resposta 8 + CORREÇÃO 10/09 (BRIEF, "Contexto fixo"); planejamento
  autorizado por `PROXIMOS-PASSOS-2026-09-14.md` passo 5; forks ratificados 16/09 (#333). Pedido do dono
  desta sessão: *"Granula o planejamento de C6b"* — granularizar, não executar.
- **Insumos lidos nesta sessão** (todos em `origin/main` `a2c974cb`): `AccountingDeliveryService.ts`
  (413 l., já com `reviewService.assertPairSignedOff` de C11 no preflight e dentro da tx),
  `AccountingDelivery.model.ts`, `AccountingDeliveryDto.ts`, `IAccountingDeliveryRepository.ts` +
  impl, `DataExchangeExportService.ts` (238 l.), `DataExchangeDto.ts`, `DataExchange.model.ts`,
  `AccountingReportService.ts:362-610`, `ReconciliationService.ts:682-720` + `IReconciliationRepository.ts`,
  `IJournalEntryRepository.ts:151-185` (`findManyForExport`), `audit/auditCanonical.ts:147-149`,
  `schema.prisma:1390-1455` + `:644-648`, `routes/accounting.ts:200-229`,
  `controllers/accountingDeliveryController.ts`, `lib/factory.ts:920-935`, testes existentes
  (`AccountingDeliveryService.test.ts`, `AccountingDelivery.integration.test.ts`,
  `DataExchangeExportService.test.ts`, `AccountingDeliveryDto.test.ts`, `__dto-shapes__.json`).

---

## 0. Achados da leitura que mudam a granularidade (não o BRIEF)

| # | Achado (verificado no código) | Efeito no plano |
|---|---|---|
| A1 | `buildDeliveryManifest` recebe `ecd`/`ecf` **nomeados**, não `files[]`; `DeliveryFileKind = 'ECD'|'ECF'` é união fechada (`AccountingDelivery.model.ts:21-22, 55-70`). O service lê `manifest.files[0]/[1]` por **posição** em 3 lugares (`:151-152`, `:325-326`). | Passo 4 troca a assinatura por `items[]` e **remove** todo acesso por índice — substituir por `manifest.core.ecd/ecf` ou busca por `kind`. Teste de snapshot cobre 2 e 6 itens. |
| A2 | **Balancete e razão não têm janela nenhuma**: `trialBalance(scope)` e `accountLedger(scope, accountCode)` (`AccountingReportService.ts:362, 416`); o export só passa `asOf` para BP/DRE (`DataExchangeExportService.ts:64-78`). `asOf` é **aceito e ignorado** para `EXPORT_TRIAL_BALANCE` (`ExportRequestSchema` o declara opcional para todos os kinds) — classe `param-aceito-e-ignorado-e-bug`. | F-C6b-3 (a) diz "asOf/janela do DTO → período", mas para balancete/razão **não existe janela no DTO**. Abre **F-C6b-6** (balancete: `asOf` passa a ser usado via `balancesAsOf`) e **F-C6b-7** (razão: janela + escopo de contas). Sem isso, item 5 do BRIEF (período do extra ⊆ pacote) é inaplicável a 2 dos 6 kinds. |
| A3 | `EXPORT_GENERAL_LEDGER` é **uma conta por job** (`accountCode` obrigatório no `superRefine`). "Razão" para o contador = todas as contas; com `extraJobIds ≤ 20` o pacote não comporta um job por conta. | **F-C6b-7** inclui "razão geral" (todas as contas com movimento) como modo do mesmo kind. |
| A4 | DRE já é janela `[01-01 do ano(asOf), asOf]` (`AccountingReportService.ts:594`); BP é acumulado até `asOf`. | Regra de período por kind (Passo 6, tabela): BP/DRE/balancete gravam `[Jan-1 do ano(asOf), asOf]`; razão/conciliação/amostra gravam a janela explícita do DTO. Sem fork — decorre de F-C6b-3 (a). |
| A5 | Relatório de pendências da conciliação é **por `glAccountId`** (`ReconciliationService.ts:683`); há `findScopeBankAccountIds` e `findLinesWithActiveMatches` no repo. | `EXPORT_BANK_RECONCILIATION` (Passo 8) itera as contas bancárias do escopo — **zero método novo de escrita**, 1 método de leitura novo (linhas casadas por janela, todas as contas). |
| A6 | `findManyForExport(scope, statuses, window)` já devolve lançamentos+pernas+conta por janela (`IJournalEntryRepository.ts:164`, usado pela ECD I200/I250). `JournalEntry.sourceType/sourceId` existem (`schema.prisma:532-533`). | `EXPORT_ENTRY_SAMPLE` (Passo 9) é **puro** sobre esse read: amostragem determinística em memória; zero repo novo. Abre **F-C6b-8** (algoritmo da semente — precisa ser reproduzível e citável no manifesto). |
| A7 | `delivery.package_built` tem 7 chaves na allowlist (`auditCanonical.ts:147`); `itemCount`/`kinds` não estão. | Passo 11: allowlist na **mesma** mudança (regra da casa), teste-guarda de allowlist derivado. |
| A8 | `accounting_delivery_logs` do `dev.db` real está vazia (BRIEF §5.3) — backfill (Passo 2) só se prova em fixture; S6 vacuoso. | Passo 2 escreve fixture com 1 log pré-existente **antes** da migração no teste de integração do smoke. |
| A9 | Rotas de delivery moram em `server/src/routes/accounting.ts:226-229` + `docs.paths.ts` (não há `features/accounting/routes/`); controller em `server/src/controllers/accountingDeliveryController.ts`; factory `lib/factory.ts:929`. | Write-set dos choke points (PAR-001) fica explícito nos Passos 12–13. |

---

## 1. Forks NOVOS — ✅ RATIFICADOS 2026-09-16, todos (a) (desdobramento de F-C6b-3 (a) e F-C6b-5 (a))

| # | Pergunta | Caminhos | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-C6b-6** | Balancete no pacote: como o export passa a ter período, já que `trialBalance(scope)` não tem janela | (a) `EXPORT_TRIAL_BALANCE` **usa** o `asOf` que já aceita (hoje ignorado): `balancesAsOf(scope, asOf)`; período gravado `[Jan-1 do ano(asOf), asOf]`; sem `asOf` → job sem período → **não entra** no pacote (400 nomeado, igual ao SPED antigo) · (b) exigir `asOf` sempre (quebra chamadores atuais) · (c) balancete "all-time" entra sem período | **(a)** — fecha o `asOf` aceito-e-ignorado (bug de classe) sem quebrar chamador; (c) deixa balancete de qualquer ano entrar em pacote de 2026 (o que F-C6b-3 (a) proíbe) |
| **F-C6b-7** | Razão no pacote: janela + escopo de contas | (a) `EXPORT_GENERAL_LEDGER` ganha `periodStart/periodEnd` **opcionais** e `accountCode` vira opcional: sem `accountCode` = **razão geral** (todas as contas com movimento na janela, colunas `accountCode, accountName` + linha `OPENING_BALANCE` por conta = saldo antes de `periodStart`); com `accountCode` = comportamento atual + janela. Novo método `accountLedger(scope, accountCode, window?)` no `AccountingReportService` com saldo de abertura · (b) filtrar linhas no export (running balance nasce errado sem abertura) · (c) manter 1 conta/job e o contador escolhe até 20 contas | **(a)** — é o que um contador chama de razão; (b) produz saldo corrente falso; (c) contradiz "todos os possíveis" (resposta 8) |
| **F-C6b-8** | Algoritmo da semente da amostra (F-C6b-5 (a) fixa "n por conta, semente determinística", não o **como**) | (a) `sha256(seed + accountCode + entryId)` → ordena por hash, pega os `n` primeiros por conta; a semente e o algoritmo vão para a 1ª linha do CSV (`# seed=…; algorithm=sha256-rank-v1`) · (b) PRNG (`mulberry32`) semeado + Fisher-Yates por conta · (c) semente = `sha256` do próprio job da ECD (amostra amarrada ao arquivo) | **(a)** — sem estado, sem PRNG a manter, reproduzível por qualquer um com uma planilha; (c) é elegante mas acopla amostra a regeneração da ECD |

Ratificados (a)/(a)/(a) pelo dono em 2026-09-16 (AskUserQuestion). Os passos abaixo executam **(a)** nos três.

---

## 2. Fatiamento em PRs (PAR-003 aplicado — tudo same-domain ⇒ serial, PAR-005)

Todos os slices editam arquivos existentes do domínio `accounting` ⇒ **nenhum paralelismo** (PAR-002
"edita arquivo existente" + "same-domain"). Ordem serial, cada PR mergeado antes do próximo
(`squash-merge-quebra-prs-empilhados`: **não** empilhar; abrir o PR N+1 de `main` após o merge de N).

| PR | Nome | Passos | Depende | Toca `buildPackage`? | Gate próprio |
|---|---|---|---|---|---|
| **PR-1** | Período nos exports de relatório (F-C6b-3 a, F-C6b-6/7) | 5, 6, 7 | — | não | `test:integration` + snapshot DTO + `docs:generate` (enum inalterado; props novas) |
| **PR-2** | Exports novos: conciliação + amostra (Bloco C) | 8, 9, 10 | PR-1 (regra de período) | não | + `docs:generate` (2 kinds no enum) |
| **PR-3** | Tabela filha + manifesto N-ário + extras no build/confirm (Blocos A/B/D) | 1, 2, 3, 4, 11, 12, 13, 14 | PR-1, PR-2 | **sim** | + `smoke:migration` + allowlist + review independente |

**Por que 3 e não 1:** PR-1/PR-2 são valor em si (exports com período e 2 relatórios novos) e têm
write-set disjunto do `AccountingDeliveryService` — a migração (o passo de maior blast radius) fica
num PR curto, revisável contra o `dev.db` real. **Alternativa declarada:** 1 PR único (como C11, 15
comportamentos) — válida se o dono preferir um "executa" só; o custo é um review de ~25 arquivos.
**Fatiamento em 3 PRs seriais ratificado pelo dono em 2026-09-16.**

---

## 3. Passos numerados (ordem de implementação dentro de cada PR)

Convenção: **W** = write-set (arquivos), **T** = teste que falha se o passo estiver errado, **F** =
fork que morde aqui. Caminhos relativos a `server/src/features/accounting/` salvo indicação.

### PR-1 — período nos exports de relatório

**Passo 5 — DTO de export ganha janela e usa o `asOf` que já aceita**
- W: `dtos/DataExchangeDto.ts` — `ExportRequestSchema`: `periodStart`/`periodEnd` (`dateOnly`,
  opcionais, `to ≥ from` no `superRefine`), `accountCode` deixa de ser obrigatório para
  `EXPORT_GENERAL_LEDGER` (F-C6b-7 a); `asOf` continua opcional. `dtos/__tests__/__dto-shapes__.json`
  regenerado. `docs.paths.ts` (`POST /api/accounting/data-exchange/exports` — props novas).
- T: `DataExchangeDto.test.ts`: `periodEnd < periodStart` → issue em `periodEnd`; razão sem
  `accountCode` → **válido** (era inválido: o teste existente inverte).
- F: F-C6b-7.

**Passo 6 — os 4 exports gravam `periodStart/periodEnd` no job (F-C6b-3 a)**
- W: `services/DataExchangeExportService.ts` — `buildTable` devolve `{ table, period }`; `createJob`
  recebe `periodStart/periodEnd` (colunas já existem — `schema.prisma:638-639`, **zero migração**).
  `services/AccountingReportService.ts`: `trialBalance(scope, asOf?)` delega em `balancesAsOf` quando
  `asOf` vier (F-C6b-6 a); `accountLedger(scope, accountCode, window?)` com linha de abertura
  (F-C6b-7 a); `IReportReader` em `DataExchangeExportService.ts:24-29` atualizado.
- Regra de período por kind (decorre de A4):

  | kind | entrada | período gravado |
  |---|---|---|
  | `EXPORT_TRIAL_BALANCE` | `asOf` (opcional) | `[Jan-1 do ano(asOf), asOf]`; sem `asOf` → `null/null` |
  | `EXPORT_BALANCE_SHEET` / `EXPORT_INCOME_STATEMENT` | `asOf` (obrigatório, já era) | `[Jan-1 do ano(asOf), asOf]` |
  | `EXPORT_GENERAL_LEDGER` | `periodStart/End` (opcionais) | a janela; sem janela → `null/null` |
  | `EXPORT_TEMPLATE` / `EXPORT_IMPORT_ERRORS` | — | `null/null` (nunca entram no pacote) |
- T: `DataExchangeExportService.test.ts`: DRE com `asOf=2026-12-31` → job com
  `periodStart=2026-01-01, periodEnd=2026-12-31`; balancete sem `asOf` → `null`; balancete com
  `asOf=2026-06-30` → linhas iguais a `balancesAsOf(2026-06-30)` (**falha hoje**: `asOf` é ignorado).
- F: F-C6b-6, F-C6b-7.

**Passo 7 — razão geral (todas as contas com movimento)**
- W: `AccountingReportService.accountLedger` (ou método irmão `generalLedger(scope, window)`) +
  `DataExchangeExportService.buildTable` case `EXPORT_GENERAL_LEDGER` sem `accountCode`: headers
  `accountCode, accountName, date, entryId, entryNumber, description, status, debitCents, creditCents,
  runningBalanceCents`, 1 linha `OPENING_BALANCE` por conta. Fonte: `postingRepo.groupByAccount(scope,
  LEDGER_STATUSES, {to: periodStart-1d})` para abertura + `journalEntryRepo.findManyForExport` para as
  pernas da janela (reuso do read da ECD — A6).
- T: fixture com 2 contas, 1 lançamento antes da janela e 2 dentro → linha de abertura da conta A =
  saldo pré-janela; `runningBalance` final = abertura + Σ janela; conta sem movimento na janela **não
  aparece**.
- F: F-C6b-7.

### PR-2 — exports novos (Bloco C)

**Passo 8 — `EXPORT_BANK_RECONCILIATION`**
- W: `models/DataExchange.model.ts` (`EXPORT_KINDS` +1), `dtos/DataExchangeDto.ts`
  (`IMPLEMENTED_EXPORT_KINDS` +1; `periodStart/End` **obrigatórios** para este kind no `superRefine`),
  `services/DataExchangeExportService.ts` (case novo; injeção de um `IReconciliationReader` mínimo —
  mesmo padrão do `IReportReader`), `repositories/IReconciliationRepository.ts` + impl (**1 read
  novo**: `findMatchedLinesByWindow(scope, glAccountIds, window)` devolvendo linha + posting casado +
  `matchType`), `lib/factory.ts` (injeção), `docs.paths.ts` (enum), `__dto-shapes__.json`.
- Tabela: `section (MATCHED|UNMATCHED_LINE|UNMATCHED_POSTING), bankAccountCode, statementId, lineDate,
  amountCents, memo, entryId, entryNumber, matchType`. Contas = `findScopeBankAccountIds` (A5);
  pendências = `findUnmatchedLinesByAccount`/`findUnmatchedBankPostings` por conta (reuso do
  `pendingReport`). Período gravado = janela do DTO.
- T: fixture com 1 conta bancária, 1 linha casada + 1 linha sem match + 1 posting sem linha → 3 linhas
  nas 3 seções; escopo B não vê nada (cross-tenant).

**Passo 9 — `EXPORT_ENTRY_SAMPLE`**
- W: `models/DataExchange.model.ts` (+1 kind), `dtos/DataExchangeDto.ts` (`EntrySampleExportSchema`
  do BRIEF §4: `periodStart/End`, `perAccount 1..50 default 5`, `seed 1..64` — como **extensão** do
  `ExportRequestSchema` via `superRefine` por kind, não schema paralelo, para o controller continuar
  com 1 parse), `models/entrySample.ts` (**função pura** `sampleEntries(entries, {perAccount, seed})`
  — F-C6b-8 a: rank por `sha256(seed|accountCode|entryId)`), `services/DataExchangeExportService.ts`
  (case novo; fonte `journalEntryRepo.findManyForExport(scope, LEDGER_STATUSES, window)` — injetar
  `IJournalEntryRepository` ou expor via `IReportReader`), `docs.paths.ts`, `__dto-shapes__.json`.
- Tabela: 1ª linha de metadado `# seed=<seed>; algorithm=sha256-rank-v1; perAccount=<n>`; colunas
  `accountCode, accountNature, entryId, entryNumber, date, description, sourceType, sourceId,
  debitCents, creditCents`. "Conta com movimento" = aparece em ≥1 perna na janela; resultado ×
  patrimonial pela `nature` da conta (F-C6b-5 a).
- T (unitário, puro): mesma `seed` → mesma amostra em 2 chamadas; `seed` diferente → amostra diferente
  em fixture de 20 lançamentos/conta; conta com 3 lançamentos e `perAccount=5` → 3 (sem repetição).
- F: F-C6b-8.

**Passo 10 — registro dos kinds novos**
- W: `docs.paths.ts` (enum `kind` do export: +2), `npm run docs:generate` → `public/openapi.json`;
  `__tests__/openapi-paths.test.ts` (path-count inalterado — só enum). `DataExchangeDto.test.ts`
  (kinds novos parseiam; `EXPORT_BANK_RECONCILIATION` sem janela → issue).
- T: snapshot de shape muda **duas** vezes (Passos 8 e 9) — 1 regen ao fim do PR-2.

### PR-3 — tabela filha, manifesto N-ário, extras (Blocos A/B/D)

**Passo 1 — `AccountingDeliveryItem` (schema + migração aditiva)**
- W: `server/prisma/schema.prisma` — modelo do BRIEF §4 (`@@unique([deliveryId, jobId])`,
  `@@index([deliveryId, position])`, `@@map("accounting_delivery_items")`); relações inversas:
  `AccountingDeliveryLog.items AccountingDeliveryItem[]`, `AccountingDataExchangeJob.deliveryItems
  AccountingDeliveryItem[] @relation("DeliveryItemJob")` (junto de `:644-648`).
  `AccountingContact.packageProfile Json?` (F-C6b-2 a) **na mesma migração** (1 migração, 2 tabelas).
  Migração `server/prisma/migrations/2026MMDDhhmmss_add_accounting_delivery_items/migration.sql` com
  prólogo `IF NOT EXISTS` (classe `migracao-sqlite-nao-e-transacional`).
- T: `npx prisma migrate diff` vazio após aplicar; `resetDb()` já limpa as tabelas contábeis por
  derivação do schema (`resetdb-nao-limpa-contabilidade` FECHADO) — confirmar que a tabela nova entra
  na guarda derivada (teste existente falha se não).

**Passo 2 — backfill dos pacotes existentes (F-C6b-1 a)**
- W: mesma `migration.sql`: `INSERT INTO accounting_delivery_items (…) SELECT … FROM
  accounting_delivery_logs d WHERE NOT EXISTS (SELECT 1 FROM accounting_delivery_items i WHERE
  i.deliveryId = d.id AND i.jobId = d.ecdJobId)` ×2 (ECD `position 0`, ECF `position 1`; `kind` =
  `'EXPORT_SPED_ECD'` / `job.kind` da ECF — lido por JOIN em `accounting_data_exchange_jobs`, porque a
  ECF tem 2 kinds).
- T: `repositories/__tests__/AccountingDelivery.integration.test.ts` — insere 1 log **por SQL cru**
  sem itens, roda o SQL do backfill 2× → `count(items) = 2` nas duas passadas; `sha256` do item ==
  `manifestSha256Ecd/Ecf`. `npm run smoke:migration` — declarar S6 vacuoso no PR (A8).

**Passo 3 — invariante "núcleo = colunas fixas = itens 0/1"**
- W: `repositories/IAccountingDeliveryRepository.ts` + impl: `createItems(deliveryId, items[], tx)`,
  `listItems(scope, deliveryId, tx?)`. `AccountingDeliveryService.confirmDelivery`: dentro da **mesma**
  tx do `create`, `createItems` com núcleo (0/1) + extras (2..n).
- T: service test com repo fake — todo `create` é seguido por `createItems` cujos itens 0/1 casam
  `ecdJobId/manifestSha256Ecd` e `ecfJobId/manifestSha256Ecf`; integração: `listItems` após confirm
  devolve `position` contíguo a partir de 0.

**Passo 4 — manifesto N-ário**
- W: `models/AccountingDelivery.model.ts` — `DeliveryManifestFile.kind: ExportKind`;
  `buildDeliveryManifest({ scope, period, contactId, core: {ecd, ecf}, extras: Array<{kind, jobId,
  sha256}>, generatedAt })` → `files = [core.ecd, core.ecf, ...extras]` (ordem = `position`).
  `DELIVERY_FILE_KINDS` é removido (era só `'ECD'|'ECF'`; o núcleo passa a `EXPORT_SPED_ECD` /
  kind real da ECF). `AccountingDeliveryService`: **todo** `manifest.files[0]/[1]` (`:151-152`,
  `:325-326`) vira `manifest.files.find(f => f.jobId === ecd.id)` ou campo `core` — sem índice mágico.
- T: `models/__tests__` snapshot do manifesto com 2 e com 6 itens; teste-guarda: `grep -n "files\[[01]\]"
  AccountingDeliveryService.ts` = 0 (ou, melhor, o snapshot com extras já quebra se a posição for
  assumida).
- Nota FE: `FE-INCR-DELIVERY` (nó vizinho, fora de escopo) lê `files[].kind` — mudança de `'ECD'` para
  `'EXPORT_SPED_ECD'` é **quebra de contrato de leitura**; registrar em §5 (achados fora de escopo)
  e avisar no PR.

**Passo 11 — `extraJobIds` no build/confirm + idempotência (F-C6b-4 a)**
- W: `dtos/AccountingDeliveryDto.ts` — `BuildDeliveryPackageSchema`/`ConfirmDeliverySchema` +
  `extraJobIds: z.array(z.string().min(1)).max(20).default([])` (`.strict()` mantido);
  `__dto-shapes__.json`. `models/AccountingDelivery.model.ts` — `DELIVERABLE_EXPORT_KINDS` (BRIEF §4).
  `AccountingDeliveryService`: `resolveExtras(scope, ids, period)` — por id: `findJobById` (404
  cross-tenant), `status EXPORTED`, `sha256`, `kind ∈ DELIVERABLE_EXPORT_KINDS` (SPED como extra → 400),
  `unitId === scope.unitId`, `periodStart/End` não nulos e `⊆ period` (400 nomeado
  `EXTRA_PERIOD_OUT_OF_RANGE`; job sem período → 400 "regere com asOf/janela" — F-C6b-6/7), `kind`
  duplicado → 400 `DUPLICATE_KIND`, id duplicado em `extraJobIds` → 400. Chamado no `build`
  (preflight) **e** dentro da tx do `confirm` (gate autoritativo — `authoritative-gate-inside-tx`).
  Idempotência: `findByJobsAndContact` existente + extras diferentes dos itens gravados → **409**
  `PACKAGE_ALREADY_DELIVERED` com `deliveryId` (hoje `SENT→SENT` devolve a linha; passa a comparar o
  conjunto de `jobId` dos extras antes de devolver). Mesmo conjunto → comportamento atual (sem evento).
- T (service, repo fake): 6 casos — extra cross-tenant → 404; extra SPED → 400; extra de 2025 em
  pacote 2026 → 400; 2 extras do mesmo kind → 400 `DUPLICATE_KIND`; 2º confirm com extras diferentes
  → 409 com o **mesmo** `deliveryId`; 2º confirm com os mesmos extras → mesma linha, sem novo evento.
- F: F-C6b-4 (já a), F-C6b-6/7 (regra de "sem período").

**Passo 12 — eventos de auditoria**
- W: `AccountingDeliveryService.appendDeliveryEvents` — `delivery.package_built` + `itemCount`
  (string) e `kinds` (array de `ExportKind`, ordem = position); `audit/auditCanonical.ts:147` +
  `'itemCount', 'kinds'` **na mesma mudança**; `sha256Ecd/Ecf` ficam; sha256 dos extras **não** entram.
- T: teste de allowlist existente (classe `accounting-audit-allowlist-guards`) passa a cobrir as 2
  chaves; teste do service assere o payload com 6 itens.

**Passo 13 — perfil de pacote por contato (F-C6b-2 a)**
- W: `dtos/AccountingDeliveryDto.ts` — `PackageProfileSchema { kinds: z.array(z.enum(DELIVERABLE_EXPORT_KINDS)).max(20) }.strict()`
  + `PackageProfileQuerySchema { unitId, contactId }`; `repositories/IAccountingContactRepository.ts`
  + impl: `updatePackageProfile(scope, contactId, kinds, tx?)`; `AccountingContactService`
  (`getPackageProfile`, `setPackageProfile` — policy `canManageAccountingContact` no PUT,
  `canReadAccountingContact` no GET; contato arquivado → 404); `controllers/accountingDeliveryController.ts`
  (2 handlers); `routes/accounting.ts` (`GET`/`PUT /delivery/profile` — **antes** de `/delivery/:id`,
  senão `profile` casa como `:id`); `docs.paths.ts` (+1 path, 2 ops); `openapi-paths.test.ts`
  BASELINE +1; `docs:generate`.
- T: controller integration — PUT com kind fora do enum → 400; PUT em contato de outro escopo → 404;
  GET devolve `kinds: []` quando nulo; **perfil não é gate**: build com extras ≠ perfil passa.

**Passo 14 — gates de fechamento do PR-3**
- `cd server && npx tsc --noEmit` · `npm run test:integration` (`--runInBand`, memória
  `integration-suite-precisa-de-runinband`) · `npm run smoke:migration` (S6 vacuoso declarado) ·
  `npm run docs:generate` + `openapi-paths.test.ts` · `__dto-shapes__.json` regen · allowlist ·
  **review independente em worktree** (`reviewer-independence-separate-agent`) · OPS-001 com os 3
  adversariais do BRIEF §7 + 1 novo: **extra sem período gravado (job gerado antes do PR-1) → 400
  nomeado, nunca item com período nulo**.

---

## 4. Write-set consolidado (PAR-001 — choke points em negrito)

| Arquivo | PR-1 | PR-2 | PR-3 |
|---|---|---|---|
| `server/prisma/schema.prisma` + migração | | | ✎ |
| `models/DataExchange.model.ts` | | ✎ | |
| `models/AccountingDelivery.model.ts` | | | ✎ |
| `models/entrySample.ts` (novo, puro) | | ✚ | |
| `dtos/DataExchangeDto.ts` | ✎ | ✎ | |
| `dtos/AccountingDeliveryDto.ts` | | | ✎ |
| `dtos/__tests__/__dto-shapes__.json` | ✎ | ✎ | ✎ |
| `services/AccountingReportService.ts` | ✎ | | |
| `services/DataExchangeExportService.ts` | ✎ | ✎ | |
| `services/AccountingDeliveryService.ts` | | | ✎ |
| `services/AccountingContactService.ts` | | | ✎ |
| `repositories/IReconciliationRepository.ts` + impl | | ✎ | |
| `repositories/IAccountingDeliveryRepository.ts` + impl | | | ✎ |
| `repositories/IAccountingContactRepository.ts` + impl | | | ✎ |
| `audit/auditCanonical.ts` | | | ✎ |
| **`server/src/lib/factory.ts`** | | ✎ | |
| **`server/src/routes/accounting.ts`** | | | ✎ |
| **`server/src/routes/docs.paths.ts`** + `public/openapi.json` | ✎ | ✎ | ✎ |
| `server/src/controllers/accountingDeliveryController.ts` | | | ✎ |
| `server/src/__tests__/openapi-paths.test.ts` (BASELINE) | | | ✎ |

Nenhum arquivo de `my-app/` (BE por padrão; FE = `FE-INCR-DELIVERY`, nó vizinho).

---

## 5. Achados fora de escopo (não planejar — autorização própria)

1. **Quebra de leitura no FE** (Passo 4): `files[].kind` muda de `'ECD'|'ECF'` para `ExportKind`.
   **Verificado nesta sessão:** `grep -rl "delivery/build\|manifest" my-app/src` = 0 — nenhum
   consumidor FE em `main`; a quebra só nasce quando `FE-INCR-DELIVERY` for planejado (aviso no BRIEF dele).
2. **`asOf` aceito-e-ignorado em `EXPORT_TRIAL_BALANCE`** já é bug hoje (A2) — F-C6b-6 (a) o fecha de
   passagem; se o dono escolher (c), abrir lacuna própria no GAP-MAP.
3. `retryDelivery` não recria itens (só `FAILED→QUEUED` na linha) — coerente, nada a fazer; registrado
   para o revisor não abrir achado.
4. DMPL/DFC/notas, PDF-resumo, transporte, perfil por escopo — inalterados do BRIEF §6.

## 6. Pendente de validação externa / insumos ausentes

1. Linha ao contador (BRIEF §5.1) segue no pedido (#331, item ampliado) — formato e conjunto de
   demonstrativos. A resposta pode mudar `DELIVERABLE_EXPORT_KINDS` (aditivo, sem migração).
2. Amostra sem norma citável (BRIEF §5.2) — F-C6b-8 é decisão do dono, não regra de domínio.
3. `dev.db` real com `accounting_delivery_logs` vazia — backfill provado só em fixture (A8).

## 7. Estimativa de tamanho (para o "executa")

| PR | Arquivos | Testes novos/alterados | Migração |
|---|---|---|---|
| PR-1 | 6 | ~8 casos | não |
| PR-2 | 9 | ~10 casos | não |
| PR-3 | 14 | ~20 casos + smoke | **sim** (aditiva + backfill) |

Ordem obrigatória PR-1 → PR-2 → PR-3 (PR-3 valida período dos extras que PR-1 grava; PR-3 lista kinds
que PR-2 cria). Cada um pela `sessao-feature`, com o BRIEF + este plano como spec.
