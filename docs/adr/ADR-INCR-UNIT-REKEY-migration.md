# ADR-INCR-UNIT-REKEY — Migração de dado: `unitId` legado → linha real em `units` (nó I1b)

> **Status: Proposed — 12 forks RATIFICAÇÃO PENDENTE (§6).** Produzido em `sessao-planejamento`,
> 2026-09-26. Nenhum fork se auto-ratifica; `sessao-feature` só roda depois que o dono ratificar §6.
>
> **Classe:** MIGRAÇÃO DE DADO (não de schema) — reescreve a coluna `unitId` de tabelas contábeis
> Prisma first-class e cria linha em `dynamic_table_data` (`units`). **Sem tabela nova, sem migração
> Prisma nova.**
>
> Criado: 2026-09-26.

---

## 0. Contexto fixo (formulário da sessão)

- **Item a planejar:** nó `docs/plano/nos/I1b.md` — "Backfill CLI do unitId legado (re-key como ADR de
  migração, B-4 antes)", `estado: ready`, `estado_detalhe: "BRIEF no I1; F-I1b-1 → (b); código não
  iniciado"`. Definição do conteúdo: itens **8–10** de
  `docs/accounting/BE-INCR-ONBOARDING-FIRST-UNIT-brief.md` §1 ("I1b — migração do legado") e o bloco
  de forks §3 (**F-I1b-1 → (b)** ratificado 2026-09-07; **F-I1b-2** absorvido por este ADR). O próprio
  BRIEF diz: *"I1b vira `sessao-planejamento` de um ADR de migração"* e reserva o nome deste arquivo
  (§2: `// I1b — definido no ADR-INCR-UNIT-REKEY-migration (não aqui)`).
- **Autorização:** (1) campo `autorizacao` do nó: `"F-I1-3 → (b) 2026-09-07"`; (2) ratificação
  F-I1b-1 → (b) *"re-key como ADR de migração de dado, B-4 antes"* (BRIEF §3, 2026-09-07); (3) dono, no
  chat, 2026-09-26: *"executa LAC-B e I1b"*. **Cobertura:** o primeiro degrau de "executa" para I1b é
  este ADR — cobre exatamente o item. **Não cobre** a execução do CLI contra o `dev.db` real (gate
  humano, §4 comportamento 16) nem os forks de §6.
- **Insumos existentes (lidos nesta sessão, `origin/main` @ `af68ef0f`):**
  - `server/prisma/schema.prisma` — 47 models com coluna `unitId` (lista em §2.1).
  - `server/src/features/accounting/audit/auditCanonical.ts:258,279` — `unitId` entra na tupla
    canônica que gera o `hash` do `AuditEvent`.
  - `server/src/features/accounting/services/AuditService.ts:159-240` — `verifyAuditChain` lista por
    `(scopeUserId, unitId)` e exige `seq=1` com `prevHash=GENESIS_HASH` (`MISSING_GENESIS` caso contrário).
  - `server/src/features/accounting/repositories/AuditRepository.ts:12-31` — `getOrCreateHead` cria a
    cabeça de genesis por `(scopeUserId, unitId)` quando não existe.
  - `server/src/features/accounting/services/DataExchangeExportService.ts:513` — o arquivo é lido por
    `storage.resolveReadPath(job.storageKey)` (caminho gravado, verbatim).
  - `server/src/jobs/activateAccountingBindingCli.ts` + `scripts/activate-salon-binding.mjs` — molde de
    CLI de migração de dado (idempotência por pré-check, proibição de boot/Dockerfile, `--self-check`).
  - `scripts/smoke-migration-gate.mjs` (S1–S8) e `server/package.json:22` (`smoke:migration`).
  - `docs/adr/ADR-M2-deploy-topology.md` decisão 4 (migração nunca no boot).
  - Gate B-4: `docs/plano/gates/B-4.md` + `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md`.
  - Memórias de classe: `migracao-sqlite-nao-e-transacional`, `smoke-gate-s6-x-migracao-de-dado`,
    `audit-log-no-fk-cascade`, `dev-db-real-path-is-nested`, `env-override-defeats-db-flag`,
    `accounting-scope-foundation-no-multicompany`.
- **Nós vizinhos:** I1 (onboarding cria a 1ª linha de `units` — mesmo shape de linha), **I6**
  (`resolveAccountingScope` passa a validar `unitId` contra `units`; depende de I1b — plano em grafo
  `docs/accounting/ONBOARDING-WIZARD-plano-grafo-brief.md:95`), SEED-MY / H1 / H2 (tenants
  `seed-unit-*`, ver F-RK-2), B-4 (pré-condição).

---

## 1. Pré-condição dura: B-4 — **satisfeita (verificado)**

- `docs/plano/gates/B-4.md` (frontmatter em `origin/main`): `estado: "done"`, `estado_detalhe: "PASSOU —
  ensaio 24/09 executado e assinado pelo executor (#371); ERRATA job_watermarks"`, `prs: ["#235",
  "#318", "#371"]`. (A nota vive em `docs/plano/gates/`, não em `docs/plano/nos/`.)
- `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md`: `Executor: [Raphael] Data: 2026-09-24` (l.18);
  `## Desfecho` → `- [x] **PASSOU**` (l.365); `Assinatura do executor: RKtz` (l.379).
- **O que B-4 prova e o que não prova:** prova que o *procedimento* de backup→restauração do `dev.db`
  funciona (ensaio de 24/09). **Não** é o backup deste re-key. O rollback do I1b é um backup **novo**,
  tirado imediatamente antes da execução pelo mesmo procedimento do RUNBOOK-B4 — comportamento 15.

---

## 2. Medição (cópia do `dev.db` real, 2026-09-26)

Cópia de `server/prisma/prisma/dev.db` (mtime 2026-09-25 20:54, WAL vazio) para o scratchpad da sessão;
lida com `sqlite3 ... ?mode=ro`. **O original não foi aberto por nenhuma ferramenta além do `cp`.**
Migrações aplicadas na cópia: **52** = diretórios em `server/prisma/migrations/` (52) → a cópia está no
schema de `main`; toda tabela do schema existe nela.

### 2.1 As tabelas com `unitId` — **47, não 31** (erro do BRIEF corrigido)

Extraídas de `schema.prisma` (models cujo corpo tem a coluna `unitId`), nome físico via `@@map`. Todas
têm `userId`, exceto as duas de auditoria, que têm `scopeUserId`. **Nenhuma FK aponta para `unitId`**
(`PRAGMA foreign_key_list` nas 47: todas as FKs são para `id` de outra tabela ou `User.id`) — logo a
ordem das tabelas no re-key é indiferente para FK (ver F-RK-4 para a ordem que importa).

Linhas por `unitId` na cópia (tabelas vazias marcadas `—`):

| # | tabela | `@@unique` com `unitId` | linhas hoje |
|---|---|---|---|
| 1 | `accounting_periods` | `[userId, unitId, year, month]` | cmr2…=12, seed-presumido=24, seed-real=24, incr6-val=12, incr6-val-178…=12 |
| 2 | `accounting_period_transitions` | — | 7 / 45 / 45 / 1 / 1 |
| 3 | `audit_events` | `[scopeUserId, unitId, seq]`, `[…, hash]` | 52 / 653 / 652 / 30 / 30 — **não re-chaveada** |
| 4 | `audit_chain_heads` | `@@id([scopeUserId, unitId])` | 1 / 1 / 1 / 1 / 1 — **ver F-RK-5** |
| 5 | `accounts` | `[userId, unitId, code]` | 20 / 19 / 19 / 14 / 14 |
| 6 | `referential_mappings` | `[userId, unitId, accountId, mappingVersion]` | seed 14 / 14 |
| 7 | `journal_entries` | `[userId, unitId, sourceType, sourceId]`, `[…, fiscalYear, entryNumber]` | 7 / 357 / 357 / 4 / 4 |
| 8 | `journal_entry_sequences` | — | 2 / 2 / 2 / 1 / 1 |
| 9 | `document_attachments` | — | — |
| 10 | `accounting_data_exchange_jobs` | — | cmr2…=11, seed-presumido=1, incr6=15 / 15 |
| 11 | `accounting_data_exchange_rows` | — | 17 / — / — / 25 / 25 |
| 12 | `postings` | — | 14 / 717 / 717 / 8 / 8 |
| 13 | `bank_statements` | `[userId, unitId, sha256]` | — |
| 14 | `bank_statement_lines` | — | — |
| 15 | `reconciliation_matches` | — | — |
| 16 | `source_documents` | — | seed 84 / 84 |
| 17 | `journal_entry_sources` | — | seed 84 / 84 |
| 18 | `customer_package_balances` | `[userId, unitId, customerId, packageId]` | — |
| 19 | `package_balance_movements` | `[userId, unitId, saleId, kind]` | — |
| 20 | `payables` | `[userId, unitId, supplierName, documentNumber]` | seed 42 / 42 |
| 21 | `payable_payments` | — | seed 42 / 42 |
| 22 | `receivables` | `[userId, unitId, customerName, documentNumber]` | seed 42 / 42 |
| 23 | `receivable_receipts` | — | seed 21 / 21 |
| 24 | `dimension_definitions` | `[userId, unitId, code]` | — |
| 25 | `dimension_values` | `[userId, unitId, definitionId, code]` | — |
| 26 | `posting_dimensions` | — | — |
| 27 | `counterparties` | `[userId, unitId, type, nameNormalized]` | seed 2 / 2 |
| 28 | `inventory_items` | `[userId, unitId, productRef]` | — |
| 29 | `accounting_bindings` | `[userId, unitId, sectorKey, bindingVersion]` | cmr2…=1, seed 1 / 1 |
| 30 | `fiscal_profiles` | `[userId, unitId]` | seed 1 / 1 |
| 31 | `service_fiscal_profiles` | `[userId, unitId, serviceRef]` | — |
| 32 | `fiscal_documents` | `[userId, unitId, saleKey, kind, cTribNac]` | — |
| 33 | `fiscal_document_sequences` | — | — |
| 34 | `bank_settlement_items` | `[userId, unitId, statementLineId, titleType, titleId]` | — |
| 35 | `accounting_scope_settings` | `[userId, unitId]` | — |
| 36 | `fixed_asset_classes` | `[userId, unitId, code]` | — |
| 37 | `depreciation_rates` | `[userId, unitId, source, sourceRow]` | — |
| 38 | `fixed_assets` | `[userId, unitId, code]` | — |
| 39 | `reconcile_pending_items` | `[userId, unitId, sourceType, sourceId]` | — |
| 40 | `accounting_contacts` | — | — |
| 41 | `accounting_delivery_logs` | — | — |
| 42 | `accounting_reviews` | — | — |
| 43 | `accounting_review_findings` | — | — |
| 44 | `lalur_entries` | `[userId, unitId, year, quarter, livro, codigo]` | — |
| 45 | `lalur_parte_b_accounts` | `[userId, unitId, codCtaB, codTributo]` | — |
| 46 | `lalur_parte_b_movements` | — | — |
| 47 | `lalur_parte_b_closings` | `[userId, unitId, year, quarter]` | — |

**Regra de manutenção (T4):** a lista NÃO é hardcoded no CLI como verdade; o CLI a deriva do DMMF do
Prisma (`Prisma.dmmf` — models com campo `unitId`) e o teste de caracterização (comportamento 2) falha
se um model novo com `unitId` aparecer sem ser classificado como "re-chaveia" ou "não re-chaveia".
Isso é o que teria pegado o "31" do BRIEF.

### 2.2 Os `unitId` distintos — 5, em 3 donos

| `unitId` | dono (`userId`/`scopeUserId`) | é linha de `units`? | classificação |
|---|---|---|---|
| `cmr2jyirc006oci1kscm61n6n` | `cmr2jfl4v…` (`admin@luminaris.test`) | **sim** — `dynamic_table_data` da tabela `units` `cmr2jy28u…` do mesmo dono, `{"name":"Matriz","type":"Own","isActive":true}` | **pular** (F-I1b-2 absorvido) |
| `unit-incr6-val` | `cmr2jfl4v…` (admin) | não | legado — resíduo de validação INCR-6 (F-RK-3) |
| `unit-incr6-val-1782938879534` | `cmr2jfl4v…` (admin) | não | idem |
| `seed-unit-presumido` | `cmufn7n5…` (`seed-presumido@seed.local`) | não — **o dono não tem tabela `units`** | legado do SEED-MY (F-RK-2) |
| `seed-unit-real` | `cmufn7te…` (`seed-real@seed.local`) | não — **o dono não tem tabela `units`** | idem |

Só existe **uma** tabela `units` no banco (a do admin). `user-b-incr6@luminaris.test` não tem linha
contábil.

### 2.3 Onde mais os ids aparecem (varredura de todas as colunas das 71 tabelas, `instr`)

- `dynamic_table_data.data`: `cmr2jyirc…` em 96 linhas (é a unidade real, referenciada por relação —
  esperado). **Nenhum** dos 4 legados aparece em JSON de DynamicTable, `knowledge_graphs` ou
  `action_proposals`.
- `accounting_data_exchange_jobs.storageKey`: contém o `unitId` no caminho (seed-presumido 1,
  incr6-val 30 — o prefixo casa as duas variantes). O arquivo é lido por
  `resolveReadPath(job.storageKey)` verbatim → **não re-escrever** `storageKey` (o arquivo em disco
  continua no caminho antigo e continua legível). Inferido da leitura de
  `DataExchangeExportService.ts:513`; o teste do comportamento 9 converte em verificado.

---

## 3. Correções às premissas do BRIEF (patch, não rewrite — T6)

1. **"31 tabelas" → 47** (§2.1). O 31 veio de outro inventário (o `resetDb` limpa 31 tabelas
   contábeis — memória `resetdb-nao-limpa-contabilidade`), não do schema atual.
2. **`WHERE unitId = <legado>` é insuficiente** — a tenancy é `(userId, unitId)`
   (`accounting-scope-foundation-no-multicompany`). O filtro é `WHERE userId = <dono> AND unitId =
   <legado>` (`scopeUserId` nas tabelas de auditoria). Sem isso, dois tenants com a mesma string
   (`seed-unit` era a BASE do SEED-MY) seriam fundidos.
3. **"Prólogo `IF EXISTS`"** vem da classe `migracao-sqlite-nao-e-transacional`, que é sobre **arquivo
   SQL** aplicado por `prisma migrate deploy` / `db execute`. Um CLI TypeScript com
   `prisma.$transaction` interativo **é** transacional no SQLite (um único `BEGIN…COMMIT` na conexão).
   A escolha entre os dois modelos é o fork F-RK-4; o análogo do `IF EXISTS` no CLI é o pré-check de
   schema (comportamento 3).
4. **`audit_chain_heads` não pode ser re-chaveada** sem quebrar a verificação: com a cabeça movida e os
   eventos no `unitId` antigo, `verifyAuditChain(novo)` encontra o 1º evento com `seq = N+1` →
   `MISSING_GENESIS` para sempre. Os eventos não podem mudar de `unitId` porque o `unitId` está na tupla
   do hash (`auditCanonical.ts:279`). → F-RK-5.
5. **`smoke:migration` não exercita este incremento.** O gate aplica migrações Prisma **pendentes**;
   I1b não tem migração → roda como puro gate de integridade (o próprio script o diz). E o S6
   (colunas pré-existentes byte-idênticas) reprova migração de dado por desenho
   (`smoke-gate-s6-x-migracao-de-dado`). → verificação dirigida, comportamento 13 / F-RK-11.
6. **Tenants do SEED-MY não têm tabela `units`** — "criar a linha em `units`" não é executável para
   eles sem criar a tabela dinâmica. → F-RK-2.

---

## 4. Decisão proposta — checklist numerado de comportamentos

Cada item é testável isoladamente. Onde um item depende de fork, o fork está citado e o item descreve
o ramo **recomendado**; se o dono escolher outro ramo, o item muda antes da `sessao-feature`.

**Pré-condições e descoberta**

1. **Invocação só explícita.** O CLI (`server/src/jobs/rekeyLegacyUnitCli.ts`) e o wrapper
   (`scripts/rekey-legacy-unit.mjs`) não são referenciados por `Dockerfile`, `docker-compose*`,
   `server.ts`, `postinstall` nem `package.json#scripts` de start (ADR-M2 decisão 4; BRIEF item 9).
   Testável: grep-teste que falha se algum desses arquivos citar `rekey`.
2. **Inventário derivado do DMMF + classificação fechada.** O CLI lista os models com campo `unitId`
   via DMMF e cada um cai em exatamente uma classe: `REKEY` (45) ou `KEEP` (`AuditEvent`,
   `AuditChainHead` — F-RK-5). Testável: teste de caracterização que falha se um model com `unitId`
   não estiver em nenhuma das duas listas, e que assere 47 hoje.
3. **Pré-check de schema (análogo do `IF EXISTS`).** Antes de qualquer escrita: todas as tabelas do
   inventário existem em `sqlite_master` e não há migração pendente (`_prisma_migrations` finalizadas ==
   diretórios em `prisma/migrations`). Falha → exit 1 sem escrita. Testável: banco temporário com uma
   migração a menos → exit 1, 0 linhas alteradas.
4. **Modo `--plan` (padrão, só leitura) — F-RK-1.** Sem `--apply`, o CLI descobre os pares
   `(dono, unitId)` pela união das 47 tabelas, classifica cada um (`SKIP_REAL_UNIT` / `LEGACY` /
   `EXCLUDED_TENANT`) e imprime JSON com contagem por tabela. Nenhuma escrita (teste: md5 do banco
   idêntico antes/depois).
5. **Pular unidade real (F-I1b-2 absorvido).** Se `unitId` é `id` de uma linha **viva**
   (`deletedAt IS NULL`) de `dynamic_table_data` cuja `dynamicTable` é a `units` **do mesmo dono** →
   `SKIP_REAL_UNIT`, nada escrito. Se é linha de `units` de **outro** dono → exit 1
   (`UNIT_OWNER_MISMATCH`), nada escrito. Testável: fixture com os dois casos.
6. **Tenant sem tabela `units` (F-RK-2, ramo recomendado a).** Dono sem `dynamic_tables.internalName
   = 'units'` → `EXCLUDED_TENANT` no plano e recusa (exit 1, `NO_UNITS_TABLE`) no `--apply`; o CLI nunca
   cria tabela dinâmica. Testável: fixture de tenant seed.

**Execução (`--apply`) — por unidade legada**

7. **Argumentos obrigatórios (F-RK-1, F-RK-9).** `--apply` exige `--owner-user-id`, `--from <legado>` e
   `--name <nome da unidade>`; `--type` opcional (enum do `UnitsModule.type`). Uma unidade por
   invocação (mesmo molde de `activateAccountingBindingCli.ts`). Args inválidos → exit 2 (Zod).
8. **A linha nasce sem plugin (F-RK-8).** `prisma.dynamicTableData.create({ data: { dynamicTableId:
   <units do dono>, data: { name, type?, isActive: true } } })` — id = `@default(cuid())` (F-I1b-1 b),
   **sem** `createTableData` (não semeia "Pipeline Padrão" nem estoque em unidade legada — BRIEF §5
   insumo 1). Testável: após `--apply`, `leadPipelines`/`stockMovements` do dono inalterados; linha nova
   tem o shape da linha `Matriz` existente.
9. **Re-key das 45 tabelas `REKEY` (F-RK-4 ramo a).** Numa única `prisma.$transaction` interativa (com
   `timeout` explícito, ≥ 60 s): cria a linha (item 8) → para cada tabela `REKEY`,
   `UPDATE <t> SET unitId = <novo> WHERE userId = <dono> AND unitId = <legado>` (via
   `$executeRawUnsafe` com nome de tabela da lista fechada do item 2 e valores parametrizados). Nenhuma
   outra coluna muda — em especial `storageKey` (§2.3). Testável: em fixture com linha em ≥ 1 tabela de
   cada grupo (ledger, AP/AR, fiscal, dimensões, lalur), todas as linhas do legado passam ao novo
   `unitId` e `storageKey` fica byte-idêntico.
10. **Contagem antes/depois por tabela, dentro da tx.** Para cada tabela: `before = COUNT(legado)`,
    `affected` = retorno do UPDATE, `after = COUNT(novo)`; se `affected ≠ before` ou `after ≠ before` ou
    `COUNT(legado) ≠ 0` ao fim → `throw` (rollback total). Testável: injetar falha na 20ª tabela → banco
    idêntico ao pré (md5 das tabelas), nenhuma linha em `units` criada.
11. **Trilha preservada (F-RK-5 a, F-RK-7 a).** `audit_events` e `audit_chain_heads` do legado **não**
    mudam: a cadeia antiga fica selada sob o `unitId` legado; a unidade nova começa sua própria cadeia no
    genesis na 1ª escrita. Testável: após `--apply`, `verifyAuditChain({owner, unitId: legado})` → `ok`
    com o mesmo `lastSeq`/`headHash` de antes; `verifyAuditChain({owner, unitId: novo})` → `ok`.
12. **Âncora na trilha nova (F-RK-6, ramo recomendado b).** Na mesma tx, um `AuditEvent` genesis na
    cadeia da unidade nova, `eventType: 'unit.rekeyed'`, `targetType: 'unit'`, `targetId: <novo>`,
    payload `{ fromUnitId, fromHeadHash, fromNextSeq, tables: {…contagens} }` (sem PII). **Gate
    acionado:** o eventType e suas 4 chaves entram em `PAYLOAD_ALLOWLIST` (`auditCanonical.ts:18`) na
    mesma mudança, com o teste de allowlist (`auditCanonical.test.ts`) nas duas direções. Testável: evento
    `seq=1` na cadeia nova com `fromHeadHash` = `headHash` da cabeça legada.
13. **Idempotência.** Segunda execução com o mesmo `--from` após sucesso: o plano classifica o legado
    como ausente (0 linhas) → exit 0 com `NOTHING_TO_DO`, **nenhuma** linha nova em `units` e nenhum
    evento. Execução interrompida (processo morto no meio): pelo item 10, nada foi commitado → re-rodar
    é o caminho. Testável: rodar 2× → 1 linha em `units`, 1 evento `unit.rekeyed`.
14. **Rastreio (BRIEF item 10).** Após o COMMIT, `logger.info({ event: 'unit_rekeyed', ownerUserId,
    from, to, tables: {…contagens} })` e o mesmo JSON em stdout (é o que o executor humano cola no
    runbook). Sem tabela nova. Testável: spy no logger.

**Verificação e execução real**

15. **Backup fresco é pré-condição do `--apply` contra banco que não seja temporário.** O CLI recusa
    `--apply` sem `--backup-path <arquivo>` existente, cujo `sqlite3 integrity_check` seja `ok` e cujo
    mtime seja posterior ao último `updatedAt` do banco-alvo; o procedimento de backup e de
    restauração é o do RUNBOOK-B4 (provado 24/09). Testável: sem o flag → exit 1; com arquivo inválido
    → exit 1.
16. **Execução no `dev.db` real é gate humano.** A `sessao-feature` entrega o CLI + um runbook **em
    branco** (`docs/accounting/RUNBOOK-I1B-UNIT-REKEY.md`, formato `RUNBOOK-FORMAT.md`: backup →
    `--plan` → servidor parado → `--apply` por unidade → verificação → restart → desfecho em 3 estados →
    assinatura). O agente não preenche evidência, não marca desfecho, não assina. O mapa legado→novo
    registrado pelo BRIEF item 10 vive **nesse runbook** (colado da saída do item 14), não neste ADR
    (os cuids só existem depois da execução).
17. **Verificação dirigida sobre cópia (F-RK-11 a) — substitui o S6.** `--verify --against <backup>`
    (ou script de teste de integração) compara pré × pós: (a) toda tabela fora do inventário `REKEY`
    byte-idêntica, exceto `dynamic_table_data` (+1 linha por unidade) e `audit_events`/`audit_chain_heads`
    (+1 evento e +1 cabeça da unidade nova); (b) nas 45 `REKEY`, hash por tabela de **todas as colunas
    exceto `unitId`** idêntico e contagens iguais; (c) `PRAGMA integrity_check = ok`,
    `PRAGMA foreign_key_check` = 0; (d) S8 (Σdébito = Σcrédito por `journal_entry`); (e) item 11.
    `smoke:migration` roda também (0 pendentes → integridade) e o relatório diz que é só isso.
18. **Servidor parado durante o `--apply`** (F-RK-10). O runbook exige; o CLI registra no stdout o
    aviso. Após o restart, o boot relê `accounting_bindings` (a linha `Active` agora sob o `unitId`
    novo). Testável no runbook (humano), não em jest.
19. **Gates mecânicos da mudança:** `tsc --noEmit` do server limpo; `--self-check` do wrapper (molde
    `activate-salon-binding.mjs`: SQLite temporário, fluxo completo 2×) verde; allowlist de
    `auditCanonical.ts` (item 12); nenhum DTO HTTP, rota, OpenAPI ou i18n tocado (CLI não é rota).
    Integração roda com `npm run test:integration` (`--runInBand` —
    `integration-suite-precisa-de-runinband`).

---

## 5. Contratos esboçados

```ts
// server/src/jobs/rekeyLegacyUnitCli.ts
const Args = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('plan') }).strict(),                    // padrão, só leitura
  z.object({
    mode:        z.literal('apply'),
    ownerUserId: z.string().min(1),
    from:        z.string().min(1),                                  // unitId legado
    name:        z.string().min(1).max(120),                         // F-RK-9
    type:        z.enum(UNIT_TYPE_OPTIONS).optional(),               // = options do UnitsModule.type
    backupPath:  z.string().min(1),                                  // item 15
  }).strict(),
  z.object({ mode: z.literal('verify'), against: z.string().min(1) }).strict(),
]);

type TableClass = 'REKEY' | 'KEEP';
const KEEP_TABLES = ['audit_events', 'audit_chain_heads'] as const;   // F-RK-5

type PlanRow = {
  ownerUserId: string;
  unitId: string;
  status: 'SKIP_REAL_UNIT' | 'LEGACY' | 'EXCLUDED_TENANT';
  tables: Record<string, number>;                                    // contagem por tabela REKEY
};

type ApplyResult = {
  event: 'unit_rekeyed';
  ownerUserId: string;
  from: string;
  to: string;                                                        // cuid da linha nova em units
  tables: Record<string, { before: number; affected: number; after: number }>;
  auditAnchor: { seq: 1; fromHeadHash: string; fromNextSeq: string } | null;   // F-RK-6
};

// exit codes: 0 ok / NOTHING_TO_DO · 1 pré-condição (schema, backup, NO_UNITS_TABLE,
// UNIT_OWNER_MISMATCH, contagem divergente → rollback) · 2 args inválidos
```

```
// scripts/rekey-legacy-unit.mjs — wrapper ts-node (molde activate-salon-binding.mjs)
node scripts/rekey-legacy-unit.mjs --plan
node scripts/rekey-legacy-unit.mjs --apply --owner-user-id <id> --from <legado> \
     --name "<nome>" [--type <tipo>] --backup-path <arquivo.db>
node scripts/rekey-legacy-unit.mjs --verify --against <backup.db>
node scripts/rekey-legacy-unit.mjs --self-check
```

**Nota de ambiente (classe `env-override-defeats-db-flag`):** `server/src/config/env.ts` carrega o
`.env` com `override: true` fora de teste — um `--db` no wrapper é **ignorado** pelo CLI filho. O
wrapper **não** oferece `--db`; o alvo é o `DATABASE_URL` do `.env`, e o runbook instrui a trocar o
`.env` para ensaiar sobre cópia e restaurar depois. O CLI imprime o caminho absoluto resolvido do banco
antes de qualquer escrita.

---

## 6. Forks — RATIFICAÇÃO PENDENTE

- **F-RK-1 · Descoberta dos legados.** (a) `--plan` descobre automaticamente pela união das 47 tabelas;
  `--apply` exige `--from` explícito, uma unidade por execução; (b) `--apply` sem argumentos re-chaveia
  tudo que o plano marcar `LEGACY`; (c) sem descoberta — lista dada à mão. **Recomendação: (a)** — o
  humano vê o plano inteiro e decide unidade a unidade (nome exigido por F-RK-9); (b) cria unidades sem
  nome escolhido. **PENDENTE.**
- **F-RK-2 · Tenants do SEED-MY (`seed-unit-presumido`/`seed-unit-real`).** Os donos não têm tabela
  `units`; H1 está aberto e os runbooks H1/H2 citam esses ids literalmente
  (`RUNBOOK-H1-PVA.md:101`, `RUNBOOK-H2-BROWSER-SIGNOFF.md:28`). (a) excluir do I1b (`EXCLUDED_TENANT`);
  o seed passa a nascer com `units` em frente própria, antes de I6; (b) incluir, criando a tabela
  dinâmica `units` para esses donos (instalação de preset/cópia de schema pelo CLI); (c) incluir só depois
  de H1/H2 assinados. **Recomendação: (a)** — criar tabela dinâmica por migração é outra frente, e
  re-chavear no meio do H1 invalida o texto dos runbooks abertos. **Consequência a ratificar junto:** com
  I6 ativo, os tenants seed recebem 400 até a frente do seed existir (ver §9). **PENDENTE.**
- **F-RK-3 · `unit-incr6-val` e `unit-incr6-val-1782938879534` (admin).** São resíduo de validação do
  INCR-6 (import/export): 14 contas, 4 lançamentos, 15 jobs cada. (a) re-chavear como qualquer legado
  (letra do F-I1b-1 b: "para cada `unitId` legado") — viram duas unidades visíveis no ERP do admin;
  (b) não re-chavear; ficam órfãs documentadas, inalcançáveis depois de I6 (dado intacto, nada apagado);
  (c) purgar — descartado (hard delete de trilha contábil). **Recomendação: (b)** — promover resíduo de
  teste a unidade real polui a lista de unidades do tenant do dono; *registro de viés (T8):* a
  preferência do dono de 2026-09-07 ("cobrir todas as lacunas, não MVP") aponta para (a), e a
  recomendação do agente pode estar calibrada para menos dado. **PENDENTE.**
- **F-RK-4 · Modelo transacional.** (a) uma `prisma.$transaction` interativa por unidade (linha em
  `units` + 45 UPDATEs + âncora), atômica; a idempotência vem de, após o commit, não sobrar linha com o
  legado; (b) passos por tabela fora de tx, cada um re-executável (letra do BRIEF item 8) — exige
  persistir o mapa legado→novo antes do 1º passo para que a re-execução reuse o mesmo cuid, o que pede
  um marcador (coluna/tabela nova ou chave extra no JSON de `units`, que o Zod do motor removeria no
  próximo update — classe `zod-strip-mata-discriminador-de-plugin`). **Recomendação: (a)** — no CLI TS o
  SQLite é transacional; (b) importa a premissa do arquivo SQL sem ter o problema dele. **PENDENTE.**
- **F-RK-5 · `audit_chain_heads`.** (a) não re-chavear: a cadeia legada fica selada sob o `unitId`
  antigo; a unidade nova começa no genesis; (b) re-chavear a cabeça — rejeitável: `verifyAuditChain`
  do novo `unitId` falha com `MISSING_GENESIS` para sempre (§3.4); (c) re-chavear e mudar
  `verifyAuditChain` para aceitar continuação — altera código da trilha (ADR-INCR2) fora deste item.
  **Recomendação: (a).** **PENDENTE.**
- **F-RK-6 · Âncora documental na trilha nova.** (a) só log estruturado + runbook (letra do BRIEF
  item 10); (b) log + evento genesis `unit.rekeyed` na cadeia nova com `fromHeadHash`/`fromNextSeq` —
  liga criptograficamente as duas cadeias; custa um eventType novo na allowlist. **Recomendação: (b)** —
  sem ela, "o `unitId` antigo" do `AuditEvent` é só convenção documental, não verificável pela própria
  trilha. **PENDENTE.**
- **F-RK-7 · Leitura do histórico pré-re-key.** Depois do re-key, `listByTarget(novo, JournalEntry, X)`
  não mostra os eventos anteriores de X (estão sob o legado). (a) aceitar — histórico antigo legível via
  CLI/SQL sob o `unitId` legado, com o evento de F-RK-6 (b) apontando para ele; (b) `AuditRepository`
  passa a resolver alias legado→novo — exige persistir o alias (coluna/tabela nova, colide com "sem
  tabela nova" do BRIEF item 10). **Recomendação: (a).** **PENDENTE.**
- **F-RK-8 · Como a linha de `units` nasce.** (a) `prisma.dynamicTableData.create` direto, sem plugins,
  shape igual à linha `Matriz` existente; (b) `createTableData` (roda `LeadsSeedOnUnitPlugin` e
  `UnitAutoStockPlugin`). **Recomendação: (a)** — é o registrado como desejado no BRIEF §5 insumo 1
  ("backfill não deve semear pipeline em unidade legada"). **PENDENTE.**
- **F-RK-9 · Nome/tipo da unidade nova.** (a) `--name` obrigatório, sem default; (b) default = a string
  legada. **Recomendação: (a)** — mesma linha do F-I1-2 → (b) ("`unit` obrigatório, 400"). **PENDENTE.**
- **F-RK-10 · Concorrência com o servidor.** (a) servidor parado é passo obrigatório do runbook; o CLI só
  avisa; (b) o CLI tenta detectar servidor vivo (porta/health) e recusa. **Recomendação: (a)** — detecção
  por porta é predicado de ambiente frágil (classe `gate-predicate-environment-class`: `PORT` do `.env`
  sobrescreve); o risco real é um cliente com `unitId` legado recriar chart lazy sob o legado depois do
  re-key, que I6 fecha. **PENDENTE.**
- **F-RK-11 · Gate de verificação.** (a) verificação dirigida própria (comportamento 17), `smoke:migration`
  roda só como integridade; (b) emendar `smoke-migration-gate.mjs` para aceitar "coluna X muda" —
  aparato de auditoria sob a moratória do CLAUDE.md raiz (decisão do dono). **Recomendação: (a).**
  **PENDENTE.**
- **F-RK-12 · Ordem com I6.** (a) I1b mergeado e executado (runbook assinado) antes de I6 mergear;
  (b) I6 antes — os legados ficam inalcançáveis até o re-key (dado intacto). **Recomendação: (a)** — o
  admin não perde acesso a nada em nenhum momento; com F-RK-3 (b), os `incr6` ficam inalcançáveis de
  qualquer forma. **PENDENTE.**

---

## 7. Pendente de validação externa

Nenhuma regra contábil, fiscal ou legal nasce aqui: `unitId` é chave de escopo, não conta, período ou
lançamento; nenhum valor, data ou natureza muda (comportamento 17 b prova). **Vazia.**

## 8. Insumos ausentes

1. **Ordem das unidades no front.** `useAccountingData.ts:57-62` escolhe `opts[0]` de `units` (citado no
   BRIEF, não relido nesta sessão). Se F-RK-3 (a) for escolhido, a unidade que o admin abre por padrão
   pode mudar para uma `incr6`. Checar a ordenação da listagem antes da `sessao-feature` desse ramo.
2. **`unitId` persistido no cliente** (localStorage/URL) — não verificado; afeta só o comportamento 18.
3. **Estado do dev.db na data da execução.** A medição de §2 é de 2026-09-26; o `--plan` (item 4) é
   quem mede no dia — os números acima não são pré-condição.

## 9. Achados fora de escopo (não planejados — frente nova exige autorização)

- **Seed CLI sem `units`.** `seedAccountingFixtureCli.ts` cria tenants contábeis sem tabela/linha
  `units`; com I6 ativo, `seed-unit-*` recebem 400. Frente própria antes de I6 (ligada a F-RK-2 a).
- **`storageKey` carrega `unitId` no caminho em disco** — vazamento de layout já tratado (não sai no
  DTO); só registra que o layout de storage não segue o re-key.
- **Correção "31 → 47" no BRIEF do I1** e na linha do plano — fold, não edição desta sessão.
