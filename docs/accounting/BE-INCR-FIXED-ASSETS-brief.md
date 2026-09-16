# BRIEF — BE-INCR-FIXED-ASSETS (nó C8 · imobilizado + depreciação + retificação versionada ECD/ECF)

> **Estado: BRIEF pronto. Forks do ADR (F-FA1..F-FA9) RATIFICADOS por delegação** (parecer §4 do ADR com
> recomendação em todos — cédula 2026-09-14, linha C8). **EMENDA pós-review #330 (2026-09-15):** B1 seed do
> Anexo III reescrito contra a forma real da fonte (A2/A3, F-FA10), B2 J801/J932 na ECD substituta (G26/G31),
> B3 tie-out em 2 txs (C13/C14), S1–S9 (fórmula cumulativa, `bookAnnualRateBp`, dispensa da ECF retificadora,
> cauda da Parte B, 4 casos de período, rascunho por NF-e com re-drive, F-FA11 decidido no BRIEF, manuais no
> MANIFEST, F-FA5 sem comando; delta-review D1–D5: taxa derivada do `8905`, `signers` reusa `SignerSchema`,
> predicado da tx2, `lifeMonths`/cap, prazo por aviso). **3 forks novos ✅ RATIFICADOS 2026-09-16 (dono, via
> `AskUserQuestion`; registro em `CEDULA-DECISAO-2026-09-16-forks-c11-c12-c6b-c8-seed.md`): F-FA10 → (a) · F-FA12 → (a) ·
> F-FA13 → (a), todos na recomendação.** Implementação ainda exige "executa" do dono (ORCH-006). Escrito em `sessao-planejamento` (2026-09-15,
> passo 10.3 de `PROXIMOS-PASSOS-2026-09-14.md`).

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó **C8** (`GRAFO-DEPENDENCIAS-2026-09-14.md` §1 linha C8; `PROXIMOS-PASSOS-2026-09-14.md`
  passo 10) — *"Imobilizado + depreciação — ADR → parecer → BRIEF"*; master map §5 linha *"Imobilizado +
  depreciação (`ADR-INCR-FIXED-ASSETS`)"* + item **retificação ECD/ECF** (*"quem escritura, retifica"*).
- **Autorização:** **F-Z0** (`CEDULA-DECISAO-2026-09-03-modulos.md`, consequências (1) e (2)) — *"imobilizado +
  depreciação viram frente autorizada … retificação de ECD/ECF entra na lista"*; cédula
  `CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md` linha C8 (delegação condicionada); passo 10.3 dentro de
  *"Pode orquestrar os proximos passos"* (dono, 2026-09-14). Cobre **exatamente** este item: backend do
  subrazão de imobilizado + a retificação versionada. **Não cobre** FE (nó vizinho, `FE-INCR-FIXED-ASSETS`
  futuro), amortização de intangível, CIAP.
- **Insumos existentes (lidos):**
  - `docs/adr/ADR-INCR-FIXED-ASSETS.md` — D1–D11 + F-FA1..9 + parecer §4 (refinamentos por decisão, invariantes
    ACC-011/012/014/016/019/021, ACC-TIEOUT, riscos de backfill e seed).
  - `server/src/features/accounting/services/PostingService.ts:303-311,446-453` — idempotência por
    `findBySource` + P2002 re-fetch; `:114-117` gate de período preflight + `assertPeriodOpenTx`; `:220` `MAX_CENTS`.
  - `server/src/features/accounting/services/LalurService.ts:838-845` — movimentos `origem='system'` da Parte B
    substituídos no fechamento; `:239` vínculo M312 exige entry POSTADO; `models/Lalur.model.ts` `LALUR_ORIGENS`.
  - `server/src/features/accounting/services/NfeImportService.ts:19-45,106-137` — custo D3 por item
    (`lib/nfeCost.ts:91 acquisitionCost`), `recoverableTaxLines`, item→`productRef` obrigatório (D6);
    `dtos/NfeDto.ts:52-59` `ImportNfePurchaseSchema { unitId, counterpartyId?, dueDate?, itemMappings[] }`;
    `dtos/PayableDto.ts:93-110` — **3 modos XOR** (`expenseAccountId` | `inventoryProductRef+Qty` |
    `inventoryMultiItem+inventoryItems[]`).
  - `server/src/lib/nfe.ts:54,236` — `cfop` por item (I08), nenhum consumidor hoje.
  - `server/prisma/schema.prisma:615-638` `AccountingDataExchangeJob` (`kind/status String`, `sha256`, `storageKey`,
    `periodStart/End`); `:1337-1349` `AccountingScopeSettings` (F7, FKs `Restrict`); `:531,553` `JournalEntry.sourceType`
    + `@@unique([userId,unitId,sourceType,sourceId])`; `:347-353` `AccountingPeriod.status`.
  - `dtos/SpedEcdDto.ts:46-47` (`indFinEsc`, `codHashSub` já expostos, desacoplados); `lib/ecf.ts:114,125-127,142`
    (`retificadora`/`NUM_REC` suportados, **não expostos** em `SpedEcfDto`/`SpedEcfRealDto`).
  - `services/AccountingReportService.ts:191` — `balanceCents = debit − credit` por conta (BP); `CashFlowReportService.ts:28`
    `INVESTING_ASSET_CODE_PREFIXES=['1.2']`.
  - `policies/AccountingPolicy.ts:120,138` — padrão `canManageBankSettlement`/`canManageFiscalProfile`;
    (rotas ficam em `server/src/routes/accounting.ts`, não em `features/`)
    `routes/accounting.ts:220-226` — segmento estático antes de `/:unitId/periods`; `audit/auditCanonical.ts:138`
    — allowlist por evento (ex.: `fiscal_profile.updated`).
  - Corpus: `fontes-oficiais/IN-RFB-1700-2017.txt` arts. 121–125 (l.2504–2590); Anexo III `43557-tabela.html`
    (sha `d526ac53071a`, versão compilada; 260 linhas) + Notas (1)–(3) (JSON segs. 2447–2452);
    `IN-RFB-2003-2021-ECD.txt` art. 8º; `IN-RFB-2004-2021-ECF.txt` arts. 7º–10.
- **Nós vizinhos:** consome `PostingService` (D2/D5), `LalurService` fechamento trimestral (D6), `NfeImportService`
  + `PayableService` (F-FA3), `SpedGenerationService`/`SpedEcfRealGenerationService` (D8), `AccountingDeliveryService`
  F-CD7 (F-FA7 bloqueia pacote). É consumido por: `FE-INCR-FIXED-ASSETS` (futuro), pacote ao contador (C6b —
  relatório de imobilizado como extra, achado §7), `TieOutDiagnosticService` (tie-out novo).

---

## 1. O que o nó é

Subrazão de **imobilizado** Prisma first-class (`FixedAssetClass` → `FixedAsset` → quotas como `JournalEntry`),
com tabela de taxas `DepreciationRate` **por tenant semeada do Anexo III** (resposta 6), depreciação mensal
**idempotente por ativo×mês** via `PostingService` existente, baixa por comando, diferença contábil×fiscal para a
Parte B pelo fechamento já existente, e **retificação versionada** de ECD/ECF (`supersedesJobId`, anterior
preservado — resposta 7). **Não é:** tela (FE), intangível/exaustão, CIAP, impairment, cron de posting.

## 2. Checklist de comportamentos

**Bloco A — schema, migração e seed** (1 migração aditiva, `npm run smoke:migration`; tabelas novas vazias no
`dev.db` real ⇒ S6 PASS vacuoso, declarar)

1. **`FixedAssetClass`** `{ id, userId, unitId, code, name, depreciable Boolean, costAccountId (FK Account,
   Restrict), accumulatedDepreciationAccountId? (FK Account, Restrict; obrigatório se depreciable), deletedAt,
   createdAt, updatedAt }`, `@@unique([userId, unitId, code])`. Classe `LAND` nasce com `depreciable=false`
   (F-FA5 a). Soft-delete bloqueado com ativo vivo.
2. **`DepreciationRate`** `{ id, userId, unitId, ncm String? (texto da fonte: '8471' | '3926.90' | '8479.8' |
   null), sourceRow Int? (ordinal na fonte; null em CUSTOM), description, lifeYears Int, annualRateBp Int,
   source ('ANEXO_III_IN_1700_2017' | 'ANEXO_III_NOTA_1' | 'ANEXO_III_NOTA_2' | 'CUSTOM'), sourceUrl?,
   sourceSha256?, justification?, hiddenAt?, createdById, createdAt }`. **[B1]** NCM **não é chave** (`3926.90`
   aparece 2× com taxas diferentes na fonte): `@@unique([userId, unitId, source, sourceRow])` para as linhas
   do Anexo; `CUSTOM` usa `id` (sem unique de negócio) — a forma final da chave é **F-FA10**. Linhas `ANEXO_*` são
   **imutáveis** (parecer D4): `PUT` numa linha `ANEXO_*` → 400; editar = criar `CUSTOM`; `hiddenAt` só oculta.
3. **Seed do Anexo III** — parser do HTML do corpus → JSON estático versionado em
   `server/src/features/accounting/fixtures/anexo-iii-in-1700-2017.json` (gerado por script **com o sha do HTML
   gravado no JSON**). **[B1] Regras do parser, cada uma com teste:** (i) `<TR>` cujo texto está em `<STRIKE>`
   → descartada (`8517 0%`); (ii) linha sem taxa → descartada (14 cabeçalhos NCM4 + 2 NCM5 + 22 capítulos);
   (iii) `Capítulo NN` **com** taxa → semeada com `ncm=null` (`Capítulo 57`, 20%); (iv) `--------------` →
   `ncm=null` (INSTALAÇÕES 10%, EDIFICAÇÕES 4%); (v) NCM 5/6 dígitos preservado como texto; (vi) `sourceRow` =
   ordinal da `<TR>` na fonte; (vii) **[D1]** taxa normalizada: `'20 %'` → 2000, `'33,3%'` → 3330; célula `%`
   sem número com prazo presente (só `8905`, prazo 20) → `10000 ÷ prazo` = 500 bp + `justification` "taxa
   derivada do prazo (célula vazia na fonte)" — teste nominal. Contagens **exatas** asseridas pelo teste do
   script: **220 linhas vivas** (221 com taxa − 1 tachada, `8905` incluída) + 2 Notas (NCM `8417` 33,3% · `null` "indústria química" 20%). O JSON é gerado por
   `scripts/anexo-iii-to-fixture.mjs` e **rodar de novo com diff vazio é o teste** (padrão
   `ecf-tabelas-dinamicas-to-catalog.mjs`). `DepreciationRateSeedService.seed(scope)` idempotente por
   `@@unique` (2ª passada = 0 inserts, **asserido**). **Gatilho (decidido aqui, delegado pelo parecer): lazy** —
   a primeira leitura de `GET /depreciation-rates` do escopo semeia; escopos antigos ganham a tabela sem
   migração de dado (S6 reprova backfill) e T0 não cresce 222 inserts.
4. **`FixedAsset`** `{ id, userId, unitId, classId (FK Restrict), code, description, ncmPrefix?, quantity Int=1,
   costCents BigInt, residualValueCents BigInt=0, annualRateBp Int (snapshot), bookAnnualRateBp Int?,
   bookRateJustification?, openingAccumulatedCents BigInt=0, accumulatedDepreciationCents BigInt=0,
   status ('PENDING_ACTIVATION' | 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED'), acquiredAt DateTime (date-only),
   activatedAt DateTime? (date-only), disposedAt DateTime?, disposalEntryId? (FK JournalEntry), sourceDocumentId?
   (FK SourceDocument), payableId? (FK Payable), version Int, deletedAt, … }`, `@@unique([userId, unitId, code])`,
   `@@index([userId, unitId, status])`.
5. **`AccountingScopeSettings`** ganha `depreciationExpenseAccountId?`, `disposalGainAccountId?`,
   `disposalLossAccountId?` (FK Account, Restrict) — DTO `UpdateAccountingScopeSettingsSchema` estendido, evento
   `scope_settings.updated` (allowlist) com os 3 ids.
6. **`AccountingDataExchangeJob.supersedesJobId String? @unique`** (self-FK, `onDelete: Restrict`). Índice
   existente inalterado. (O Termo vive em `verificationTermStorageKey`, item 7 — uma referência só.)
7. **`AccountingDataExchangeJob`** ganha `ecfRectificationRequired Boolean @default(false)`,
   `ecfRectificationWaivedAt DateTime?`, `ecfRectificationWaiverReason String?` e `verificationTermStorageKey
   String?` — a flag vive **no job da ECD substituta** (**[S3]** `LalurProcess` é processo judicial M315, não
   exercício; não existe entidade de exercício no Lalur) — F-FA7 (b).

**Bloco B — ativos e comandos (ACC-016: comandos, nunca `PATCH status`)**

8. `POST /api/accounting/fixed-assets` cria em `PENDING_ACTIVATION` (`classId`, `costCents`, `acquiredAt`,
   `annualRateBp` **ou** `rateId` → snapshot; `residualValueCents`; `bookAnnualRateBp` exige
   `bookRateJustification`, senão 400). Custo por linha > `MAX_CENTS` → 400 `MaxCentsExceededError` (política,
   parecer ACC-014). `GET` lista/detalhe por escopo; `PUT` só em `PENDING_ACTIVATION`; `DELETE` soft só em
   `PENDING_ACTIVATION` ou `ACTIVE` sem quota postada.
9. `POST /fixed-assets/:id/activate { activatedAt }` → `ACTIVE`; classe `depreciable=false` ativa sem quota;
   `activatedAt` anterior ao 1º período `OPEN`/`SOFT_CLOSED` do escopo **exige** `openingAccumulatedCents`
   (parecer, risco de backfill) e não gera quota retroativa. CAS por `version`.
10. Cross-tenant: ativo/classe/taxa de outro `scope` → `NotFoundError` (D11).
11. Policy `canManageFixedAssets(scope)` (deny-by-default, padrão `canManageFiscalProfile`); leitura sob `canRead`.

**Bloco C — depreciação mensal (D2/D3)**

12. `POST /api/accounting/fixed-assets/depreciation/run { unitId, yearMonth }` (F-FA9 a): para cada `ACTIVE`
    depreciável com `activatedAt ≤ fim do mês`: **[S1/S2]** `k` = nº do mês desde a ativação (1-based),
    `base = costCents − residualValueCents`, `bp = bookAnnualRateBp ?? annualRateBp` (a quota **postada** é a
    contábil, F-FA8 b), quota = `floor(base × bp × k ÷ 120000) − floor(base × bp × (k−1) ÷ 120000)` em `BigInt`
    (cumulativa: Σ12 = `base × bp ÷ 10000` exato); **[D4]** `lifeMonths := ceil(120000 ÷ bp)` (120 para 10%,
    37 para 33,3%), **quota postada = `min(cumulativa, base − acumulado)`** (cap do art. 121 §3 — a cumulativa
    não para sozinha e para 33,3% deixaria resíduo de 0,1%); ativo com `acumulado == base` vira
    `FULLY_DEPRECIATED` na tx2 e sai do loop. **Mês de ativação e de baixa contam inteiros** (art. 123 §2).
13. Cada quota = `postEntry({ sourceType: 'fixed_asset.depreciation', sourceId: `${assetId}:${yearMonth}`, date:
    último dia do mês, lines: D despesa (ScopeSettings) / C acumulada (classe) })` — **uma tx por ativo**; a
    idempotência é a do `PostingService`, sem guarda própria (parecer D2). **[B3]** `skipped` = **read-first**:
    `journalEntryRepo.findBySource(scope, 'fixed_asset.depreciation', sourceId)` antes de postar; existe →
    `skipped` — e **[D3]** predicado barato para "tx2 pendente", sem somar o razão: `acumulado − opening <
    min(floor(base × bp × k ÷ 120000), base)` ⇒ roda só o passo 14; não existe → tx1.
14. **ACC-TIEOUT em DUAS txs (parecer D3 emendado, padrão `InventoryService.ts:69-72`):** **[B3]** `postEntry`
    abre tx raiz própria e não aceita `tx` (`PostingService.ts:286,323`) — logo **tx1** = `postEntry`; **tx2** =
    CAS `fixedAssetRepo.addAccumulated(id, quota, { expectedAccumulated, expectedVersion })` (`updateMany`, 0
    linhas → `ConflictError`, sem `Number()` cego em `BigInt`). Janela de crash entre tx1 e tx2 converge por (a)
    read-first do item 13 e (b) `POST /fixed-assets/reconcile { unitId }` — re-drive que recomputa
    `accumulatedDepreciationCents = opening + Σ créditos das linhas 'fixed_asset.depreciation' do ativo` e
    repara drift com `logger.warn` (espelho de `reconcileInventory`). Teste de tie-out: Σ linhas de crédito com
    `sourceType='fixed_asset.depreciation'` e `sourceId LIKE '${assetId}:%'` === `accumulatedDepreciationCents −
    openingAccumulatedCents`; teste de crash: tx1 ok + tx2 falha injetada → `reconcile` fecha o drift.
15. **[S5]** Período `HARD_CLOSED`, `SOFT_CLOSED`, `FUTURE` **ou inexistente** (4 casos — `PostingService.ts:120,137`
    recusa tudo que não é `OPEN`) → `AccountingPeriodNotOpenError` propagado por ativo em `failed[]`, nunca engole
    (memória `erro-especifico-para-skip-em-job`: só `AccountingPeriodNotOpenError` vira `failed`; qualquer outro
    erro aborta o run). Resposta `{ posted: n, skipped: n, failed: [{ assetId, code, message }] }`.
16. Sem `depreciationExpenseAccountId` ou classe sem `accumulatedDepreciationAccountId` → `ValidationError`
    **nomeando** a conta ausente (D7), antes de postar qualquer ativo.
17. Evento `depreciation.posted` (allowlist: `assetId`, `yearMonth`, `quotaCents`, `entryId`) na tx (ACC-019).

**Bloco D — baixa (D5)**

18. `POST /fixed-assets/:id/dispose { disposedAt, proceedsCents, counterpartAccountId? }`: exige quota do mês
    de `disposedAt` postada (ou a posta antes, sequencial e idempotente); posta entry
    `sourceType='fixed_asset.disposal'`, `sourceId=assetId`: D acumulada (saldo) / C custo (`costCents`) / D
    contrapartida (`proceedsCents`, conta informada ou `1.1.1`?) / D perda ou C ganho pela diferença
    (`disposalLoss/GainAccountId`). `proceedsCents=0` = imprestável (art. 121 §4). Ativo → `DISPOSED`,
    `disposalEntryId` gravado. 3 casos testados (>, =, < valor contábil).
19. Evento `fixed_asset.disposed` (allowlist: `assetId`, `entryId`, `gainLossCents`).

**Bloco E — entrada por NF-e (F-FA3 b)**

20. `NfeImportService`: item com `cfop ∈ {1551, 2551}` **sai** do rateio de estoque e do `inventoryItems[]`; seu
    custo (fórmula D3 por item, ICMS incluído no MVP) vai para `fixedAssetItems[]` do payable com
    `{ classId, cProd, costCents, ncm }` — `itemMappings[]` do DTO ganha `classId?` (obrigatório para item 1551/2551,
    400 se ausente; `productRef` proibido nesse item).
21. `CreatePayableSchema` ganha **modo 4** `fixedAssetItems[]` (debita `class.costAccountId`), combinável só com
    o modo 3 (nota mista) — ver **F-FA12**. Nenhum `StockMovement` para item de ativo.
22. Após o payable, `FixedAssetService.createDraftFromPayable` cria 1 `FixedAsset` `PENDING_ACTIVATION` por item
    (`quantity` = qCom inteiro), `payableId` + `sourceDocumentId` = a NF-e (INCR-8), `acquiredAt` = `dhEmi`. Nada
    deprecia até `activate` (art. 121 §2). **[S6]** Re-import da mesma chave de NF-e é **rejeitado loud** pelo
    `@@unique` do `Payable` (`NfeImportService.ts:36-38`) — não é retorno idempotente; e `createDraftFromPayable`
    roda **depois** da tx do `createPayable`. Logo: rascunho keyed por `@@unique([payableId, sourceItemRef])`
    com **read-first**, e `POST /fixed-assets/reconcile` (item 14) também **re-drive** os payables com
    `fixedAssetItems` sem rascunho correspondente. Testes: re-upload → 409 e 0 rascunhos novos; crash entre
    payable e rascunho → `reconcile` cria o rascunho faltante 1×.

**Bloco F — Parte B (D6, F-FA4/F-FA8)**

23. No fechamento trimestral (`LalurService`), para cada ativo com `bookAnnualRateBp ≠ null` **ou**
    `residualValueCents > 0` **e status `ACTIVE` ou `FULLY_DEPRECIATED` com saldo Parte B ≠ 0** (**[S4]** com
    contábil > fiscal o contábil termina antes e a Parte B ainda tem cauda a excluir): diferença trimestral =
    Σ(quota fiscal − quota contábil) do trimestre, onde quota fiscal = cumulativa do item 12 com `bp =
    annualRateBp` e `base = costCents`, e contábil = a postada. Diferença > 0 → exclusão; < 0 → adição;
    acumulado fiscal atingiu `costCents` (art. 124 §5) → adição do excedente e baixa da Parte B.
24. Movimento `LalurParteBMovement` `origem='system'`, substituído a cada fechamento (padrão `:838`), na conta da
    Parte B configurada em `AccountingScopeSettings.depreciationParteBAccountId` (FK `LalurParteBAccount`); ausente
    com diferença ≠ 0 → `ValidationError` nomeando o COD_PB_RFB esperado (parecer D6; **COD_PB_RFB = dado do
    contador, §5**). Vínculo M312 (`LalurEntryJournalEntry`) para os entries de quota do trimestre.
25. Default (sem override, residual 0) → diferença **exatamente 0** → nenhum movimento (teste: fechamento sem
    ativo com override não cria linha `system` nova).

**Bloco G — retificação versionada (D8/D9, F-FA7 b)**

26. `SpedEcdDto.declarant`: `superRefine` — `indFinEsc='1'` **exige** `codHashSub` (**40 hex**, `REGRA_HASH_SUBSTITUIDA`)
    **e** o body ganha `supersedesJobId` + `verificationTerm { codMotSubs: enum('001'..'005','099'), descRtf?,
    signers: SignerSchema[] }` — **[D2]** `signers` **reusa** `SignerSchema` de `SpedEcdDto.ts:72-83` (mesmo objeto
    de domínio: `identNom`, `identCpfCnpj`, `identQualif` **obrigatório** no J932 = `IDENT_QUALIF_T`, `codAssin`,
    `indCrc`, `ufCrc`), nunca um shape paralelo; o `.rtf` do Termo chega como **multipart** na própria chamada de
    geração (fronteira de controller, como o XML da NF-e) e vira `verificationTermStorageKey` (A7). Obrigatórios
    quando `'1'`; proibidos quando `'0'`. 400 nomeado. **[B2]** `lib/sped.ts` ganha **`J801`** (`TIPO_DOC='001'`, `DESC_RTF`,
    `COD_MOT_SUBS`, `ARQ_RTF` = bytes do RTF) e **`J932`** (signatários do Termo) — obrigatórios com
    `IND_FIN_ESC=1` (Manual ECD L9 p.61/193–204); `J935` só se houver auditor. Teste: substituta gerada contém
    `|J801|` e `|J932|`; original não contém nenhum. **[D5]** Prazo (art. 8º §4): exercício `< ano corrente − 2` →
    400; `= ano corrente − 2` → aviso na resposta + `deadlineJustification` obrigatória (a janela real vai até
    ≈ jun/N+2 e é do calendário da RFB, não do sistema).
27. `SpedEcfDto`/`SpedEcfRealDto`: `retificadora ('N'|'S', default 'N')` — o leiaute tem também `'F'` (mudança
    de forma de tributação), **excluído de propósito** (400; reabre regime = ADR de apuração); `numRec` (**C 40**,
    obrigatório quando `'S'`, proibido quando `'N'` — `REGRA_REC_ANTERIOR_OBRIGATORIO` / `_NAO_SE_APLICA`),
    `supersedesJobId` (obrigatório quando `'S'`). `lib/ecf.ts` já emite.
28. Serviço de geração valida **dentro da tx** (ACC-011): `supersedesJobId` existe no `scope`, mesmo `kind`,
    mesmos `periodStart/periodEnd`, status `EXPORTED`, e **ainda não tem sucessor** (`@unique` fecha a corrida
    → P2002 = `ConflictError`). O substituído **não muda** (`status`, `sha256`, `storageKey` inalterados —
    asserido após a substituição). Job novo grava `supersedesJobId`; `sha256` novo ≠ antigo (asserir os dois).
29. ECD substituta gerada → `ecfRectificationRequired=true` **no job substituto** (A7);
    `AccountingDeliveryService.buildDeliveryPackage` lê o **último job ECD do ano** e recusa (400 nomeado)
    enquanto `required && !waivedAt`; ECF `retificadora='S'` do mesmo ano zera a flag (na tx). **[S3]** Comando
    `POST /data-exchange/jobs/:id/waive-ecf-rectification { justification }` (art. 8º IN 2.004 é condicional —
    "que altere contas ou saldos recuperados"; a conclusão é do contador): grava `waivedAt/Reason`, evento
    `sped.ecf_rectification_waived` (allowlist: `jobId`, `year`; **sem** o texto). Teste: sem ECF `'S'` e sem
    dispensa → 400; com dispensa → pacote sai.
30. `GET /data-exchange/jobs` expõe `supersedesJobId`/`supersededByJobId` (derivado) e a listagem mantém o
    anterior baixável (resposta 7). Eventos `sped.ecd_substituted` / `sped.ecf_rectified` (allowlist: `jobId`,
    `supersedesJobId`, `sha256`, `year`).
31. Runbook em branco `docs/runbooks/RUNBOOK-ECD-SUBSTITUTA.md` (formato `RUNBOOK-FORMAT.md`): pré-condições
    (erro não corrigível por extemporâneo — ITG 2000 31–36; dentro do prazo do ano subsequente), **o `.rtf` do
    Termo + `COD_MOT_SUBS` + signatários** (são insumo do J801/J932 — item 26), `codHashSub` do recibo,
    assinatura. Agente prepara; **não preenche**.

**Bloco H — registro e gates transversais**

32. Rotas em `routes/accounting.ts` (segmento estático `/fixed-assets`, `/fixed-asset-classes`,
    `/depreciation-rates`, `/fixed-assets/depreciation/run`) + `docs.paths.ts` + `npm run docs:generate`;
    `openapi-paths.test.ts` **BASELINE sobe de propósito** (estimativa +9 paths).
33. Factory em `lib/factory.ts` (services/repos novos injetados; `FixedAssetService` recebe `PostingService`,
    `IFixedAssetRepository`, `IAccountingPeriodRepository`, `AccountingScopeSettingsService`).
34. Snapshot de shape dos DTOs (`__dto-shapes__.json`); paridade i18n pt/en (`accounting.json`) para as
    mensagens de erro expostas; allowlist `auditCanonical.ts` com **teste-guarda** para cada evento novo
    (memória `accounting-audit-allowlist-guards`).
35. **BP com conta retificadora** (parecer ACC-021, grau inferido): teste de `balanceSheet` com `1.2.9`
    (Asset, saldo credor) provando que aparece **subtraindo** no ativo — se falhar, é lacuna do BP, não deste
    incremento: registrar e pausar (regra 4).
36. Fluxo de caixa: aquisição por NF-e (D `1.2.x`) cai em *investing* sem código novo (teste).
37. `resetDb()` de teste limpa as tabelas novas (memória `resetdb-nao-limpa-contabilidade`: guarda derivada do
    schema deve pegar sozinha — confirmar que o teste-guarda do schema passa).

## 3. Forks — RATIFICAÇÃO PENDENTE (novos; F-FA1..9 do ADR já ratificados por delegação)

| # | Pergunta | Caminhos | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-FA10** | Chave de negócio da taxa, dado que NCM **não** identifica linha na fonte (`3926.90` ×2 com taxas diferentes; 2 linhas com traços; `Capítulo 57` com taxa; NCM de 4/5/6 dígitos) — **[B1] reescrito** | (a) `@@unique([userId, unitId, source, sourceRow])` — ordinal da linha na fonte; `CUSTOM` sem unique de negócio (`id`); tela mostra `ncm + description` · (b) `@@unique([userId, unitId, ncm, description])` com `ncm` texto e `null` permitido — estável entre re-parses, mas depende de acentuação/texto da fonte · (c) `key` sintética derivada (`'NCM:3926.90#2'`) | **(a)** — é a única chave que a fonte garante; (b) quebra se a RFB re-publicar o Anexo com o texto retocado (já aconteceu: retificação de 13/04/2017); (c) é (a) com fantasia |
| ~~F-FA11~~ | ~~Gatilho do seed~~ — **decidido no BRIEF** (A3: lazy), como o parecer delegou ("o BRIEF escolhe"); não volta ao dono | — | — |
| **F-FA12** | Nota mista (itens de estoque + itens CFOP 1551/2551 na mesma NF-e) | (a) permitir: payable com modo 3 + modo 4 juntos, dois débitos · (b) rejeitar 400 ("separe a nota") · (c) importar só a parte de estoque e reportar os itens de ativo em `ignoredItems` | **(a)** — nota mista é comum (máquina + peças); (c) repete a classe "CFOP lido e ignorado"; (b) empurra trabalho manual para uma nota que já é um documento único |
| **F-FA13** | Contrapartida da baixa quando `proceedsCents > 0` | (a) `counterpartAccountId` obrigatório no comando (banco/AR) · (b) sempre gera um `Receivable` (AR) com a venda do bem · (c) sempre `1.1.1` | **(a)** — venda de imobilizado à vista ou a prazo é decisão do operador; (b) acopla ao AR sem demanda; (c) é chute |

## 4. Contratos esboçados

```ts
// DTOs (todos .strict(); date-only via isValidDateOnly)
CreateFixedAssetSchema = { unitId, classId, code, description, ncmPrefix?, quantity?: int>=1,
  costCents: string(BigInt>0), residualValueCents?: string(>=0, < costCents), acquiredAt: dateOnly,
  rateId?: string XOR annualRateBp?: int(1..10000), bookAnnualRateBp?: int, bookRateJustification?: string,
  openingAccumulatedCents?: string }
ActivateFixedAssetSchema = { unitId, activatedAt: dateOnly, openingAccumulatedCents?: string, version: int }
DisposeFixedAssetSchema  = { unitId, disposedAt: dateOnly, proceedsCents: string(>=0), counterpartAccountId?: string, version: int }
RunDepreciationSchema    = { unitId, yearMonth: /^\d{4}-(0[1-9]|1[0-2])$/ }
RunDepreciationResult    = { yearMonth, posted: number, skipped: number, failed: Array<{ assetId, code: 'PERIOD_NOT_OPEN', message }> }
UpsertDepreciationRateSchema = { unitId, ncm?: string, description, lifeYears: int>0, annualRateBp: int(1..10000), justification: string (obrigatório) }  // sempre source='CUSTOM', sourceRow=null
// SPED
SpedEcdDto.declarant.indFinEsc '1' ⇒ codHashSub (string 40 hex maiúsc.) & body.supersedesJobId & body.verificationTerm obrigatórios
SpedEcf(Real)Dto: retificadora: 'N'|'S' = 'N' ('F' do leiaute → 400 de propósito); numRec?: string(len 40); supersedesJobId?  // 'S' ⇒ ambos obrigatórios
SpedEcdDto body: verificationTerm?: { codMotSubs: z.enum(['001','002','003','004','005','099']), descRtf?, signers: SignerSchema[] (reuso), deadlineJustification? }  // indFinEsc '1' ⇒ obrigatório (J801/J932); RTF via multipart
WaiveEcfRectificationSchema = { unitId, justification: string.min(20) }
// Ledger
sourceType 'fixed_asset.depreciation' / sourceId `${assetId}:${yearMonth}`;  sourceType 'fixed_asset.disposal' / sourceId assetId
// Eventos (allowlist): fixed_asset.created|activated|disposed, depreciation.posted, depreciation_rate.created|hidden,
//   scope_settings.updated (+3 ids), sped.ecd_substituted, sped.ecf_rectified
```

## 5. Pendente de validação externa (Passo 11, item h do pedido ao contador)

- Contas do plano: `1.2.x` por classe, `1.2.9.x` depreciação acumulada por classe, despesa de depreciação (`4.x`),
  ganho/perda na alienação — **códigos** vêm do contador; o sistema só exige que existam.
- **COD_PB_RFB** da conta da Parte B para diferença contábil×fiscal de depreciação (aba PARTEB_PADRAO).
- Taxas praticadas: Anexo III integral ou laudo (art. 124 §1/§2)? — define se o seed basta ou se o cliente
  chega com `CUSTOM` no dia 1.
- Depreciação acelerada por turnos usada? (decide quando F-FA2 (b) entra).
- Tratamento do ICMS na aquisição de ativo (custo vs. CIAP 1/48) — hoje custo; confirmar.
- ~~Formato de `NUM_REC`/`COD_HASH_SUB`~~ **fechado pelos manuais** (ADR §1 emendado): `NUM_REC` C 40, `COD_HASH_SUB`
  40 hex, `RETIFICADORA` {N,S,F}. Continua externa: a **data-limite** concreta da substituição (prazo de entrega da
  ECD do ano subsequente — calendário da RFB do ano) e os `COD_MOT_SUBS` que o contador usa.

## 6. Insumos ausentes

- **[S8]** Os manuais ECD L9 e ECF L12 **estão no MANIFEST** (`manual-ecd-l9`, `manual-ecf-l12`) mas os PDFs não
  vão pro git — neste worktree não estão em disco (lidos do worktree `blissful-antonelli-4bfd90`). Antes da
  `sessao-feature`: `node scripts/baixar-fontes-oficiais.mjs --so=manual-ecd-l9` (e `--so=manual-ecf-l12`) e
  `git checkout -- docs/accounting/fontes-oficiais/MANIFEST.md` depois (o `--so` reescreve o manifesto).
- Registro `J801` completo (campos 05+ além de `ARQ_RTF`, tamanhos) — transcrever do Manual ECD pp.193–204 para
  `BE-INCR-SPED-ECD-layout-transcription` antes de codar (padrão do Passo A da ECF).
- Lei 3.470/58 art. 69 (turnos) — não lido; só relevante se F-FA2 (b) reabrir.

## 7. Achados fora de escopo (não planejar; exigem autorização própria)

- **Relatório de imobilizado** (razão auxiliar por bem + mapa de depreciação) como `EXPORT_FIXED_ASSETS` extra do
  pacote C6b — encaixa em `DELIVERABLE_EXPORT_KINDS` (BRIEF C6b §4) sem tocar este nó.
- **Amortização de intangível** (art. 126) — mesma máquina, classe `INTANGIBLE`; ADR/BRIEF próprios.
- **CIAP** (crédito ICMS de ativo 1/48) e crédito PIS/COFINS sobre depreciação (Lei 10.833 art. 3º VI) — gancho X6.
- **FE-INCR-FIXED-ASSETS** — aba na Compliance/Contabilidade com a tabela de taxas (link da fonte na tela é
  requisito da resposta 6, e é **FE**: o BE só devolve `sourceUrl`).
- BP: se o item 35 revelar que a conta retificadora não subtrai, é lacuna do INCR-4, `sessao-instrumentacao`
  própria.

## 8. Gates de envio do PR de implementação

`cd server && npx tsc --noEmit && npm run test:integration` (`--runInBand`; EBUSY no Windows não é regressão —
a CI é o oráculo) · snapshot de DTO · `docs:generate` + BASELINE do `openapi-paths` elevada **de propósito** ·
`smoke:migration` (declarar S6 vacuoso) · allowlist de auditoria com teste-guarda por evento · tie-out (item 14)
· falsificadores obrigatórios: `runMonth` 2× → 2ª chamada `skipped=n, posted=0` (asserir a **segunda**);
custo 100.000 × 10% a.a. → quotas cumulativas 833/833/834…, **Σ12 = 10.000 exato**, mês 120 fecha em 100.000,
ativo `FULLY_DEPRECIATED` e `runMonth` do 121º devolve `posted=0` **sem** o ativo no loop; custo 100.000 × 33,3%
→ mês 37 posta o resíduo (100) e fecha; classe `LAND` → 0 entries; os **4** casos de período (`HARD_CLOSED`,
`SOFT_CLOSED`, `FUTURE`, inexistente) → `failed[]` com 0 entries; job substituído com `sha256` inalterado após
substituição; substituta contém `|J801|`+`|J932|`; tx2 falha injetada → `reconcile` fecha o drift 1×;
2º substituto do mesmo job → 409 · review independente PASS · OPS-001 com adversarial escrito.
