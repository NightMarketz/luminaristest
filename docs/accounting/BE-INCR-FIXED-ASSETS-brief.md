# BRIEF — BE-INCR-FIXED-ASSETS (nó C8 · imobilizado + depreciação + retificação versionada ECD/ECF)

> **Estado: BRIEF pronto. Forks do ADR (F-FA1..F-FA9) RATIFICADOS por delegação** (parecer §4 do ADR com
> recomendação em todos — cédula 2026-09-14, linha C8). **4 forks NOVOS `RATIFICAÇÃO PENDENTE` (§3)**,
> descobertos ao materializar os contratos — o parecer não os cobre, logo voltam ao dono. Nenhuma linha de
> código nasce deste documento antes da ratificação dos 4. Escrito em `sessao-planejamento` (2026-09-15,
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
2. **`DepreciationRate`** `{ id, userId, unitId, ncmPrefix String? (4 dígitos), description, lifeYears Int,
   annualRateBp Int, source ('ANEXO_III_IN_1700_2017' | 'ANEXO_III_NOTA_1' | 'ANEXO_III_NOTA_2' | 'CUSTOM'),
   sourceUrl?, sourceSha256?, justification?, hiddenAt?, createdById, createdAt }`,
   `@@unique([userId, unitId, ncmPrefix, source])` (SQLite trata `NULL` como distinto — o par sem NCM
   INSTALAÇÕES/EDIFICAÇÕES usa `ncmPrefix=null` + `description` na chave → ver F-FA10). Linhas `ANEXO_*` são
   **imutáveis** (parecer D4): `PUT` numa linha `ANEXO_*` → 400; editar = criar `CUSTOM`; `hiddenAt` só oculta.
3. **Seed do Anexo III** — parser do HTML do corpus → JSON estático versionado em
   `server/src/features/accounting/fixtures/anexo-iii-in-1700-2017.json` (gerado por script **com o sha do HTML
   gravado no JSON**; linhas de capítulo descartadas; 2 linhas sem NCM; Notas (1)/(2) como linhas próprias
   NCM `8417`/`null` com `source` `ANEXO_III_NOTA_*`). `DepreciationRateSeedService.seed(scope)` idempotente por
   `@@unique` (2ª passada = 0 inserts, **asserido**). Gatilho: ver F-FA11.
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
6. **`AccountingDataExchangeJob.supersedesJobId String? @unique`** (self-FK, `onDelete: Restrict`) +
   `verificationTermRef String?`. Índice existente inalterado.
7. **`LalurProcess`/`AccountingDataExchangeJob`**: flag `ecfRectificationRequired Boolean @default(false)` no
   exercício (onde `LalurProcess` já ancora o ano) — F-FA7 (b).

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
    depreciável com `activatedAt ≤ fim do mês`: quota = `min((costCents − residualValueCents) × annualRateBp ÷
    120000, custoDepreciável − acumulado)` em `BigInt` (`÷ 12` meses e `÷ 10000` bp); quota `0` → `FULLY_DEPRECIATED`
    sem entry. **Mês de ativação e de baixa contam inteiros** (art. 123 §2).
13. Cada quota = `postEntry({ sourceType: 'fixed_asset.depreciation', sourceId: `${assetId}:${yearMonth}`, date:
    último dia do mês, lines: D despesa (ScopeSettings) / C acumulada (classe) })` — **uma tx por ativo**; a
    idempotência é a do `PostingService` (hit → `skipped`), sem guarda própria (parecer D2).
14. **ACC-TIEOUT (parecer D3):** dentro da **mesma tx** do posting, `FixedAsset.accumulatedDepreciationCents +=
    quota` via CAS (`updateMany where { id, accumulatedDepreciationCents: lido }`, 0 linhas → `ConflictError`);
    o repo de ativo recebe o `tx` do `postEntry` (ACC-012). Teste de tie-out: Σ linhas de crédito com
    `sourceType='fixed_asset.depreciation'` e `sourceId LIKE '${assetId}:%'` === `accumulatedDepreciationCents −
    openingAccumulatedCents`.
15. Mês `HARD_CLOSED`/`FUTURE` → `AccountingPeriodNotOpenError` propagado por ativo em `failed[]`, nunca engole
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
    deprecia até `activate` (art. 121 §2). Re-import da mesma chave de NF-e → idempotência **já existente** do
    import (não duplica rascunho) — teste re-upload.

**Bloco F — Parte B (D6, F-FA4/F-FA8)**

23. No fechamento trimestral (`LalurService`), para cada ativo `ACTIVE` com `bookAnnualRateBp ≠ null` **ou**
    `residualValueCents > 0`: diferença trimestral = Σ(quota fiscal − quota contábil) do trimestre, onde quota
    fiscal = `costCents × annualRateBp ÷ 120000` e contábil = a postada. Diferença > 0 → exclusão; < 0 → adição;
    acumulado fiscal atingiu `costCents` (art. 124 §5) → adição do excedente e baixa da Parte B.
24. Movimento `LalurParteBMovement` `origem='system'`, substituído a cada fechamento (padrão `:838`), na conta da
    Parte B configurada em `AccountingScopeSettings.depreciationParteBAccountId` (FK `LalurParteBAccount`); ausente
    com diferença ≠ 0 → `ValidationError` nomeando o COD_PB_RFB esperado (parecer D6; **COD_PB_RFB = dado do
    contador, §5**). Vínculo M312 (`LalurEntryJournalEntry`) para os entries de quota do trimestre.
25. Default (sem override, residual 0) → diferença **exatamente 0** → nenhum movimento (teste: fechamento sem
    ativo com override não cria linha `system` nova).

**Bloco G — retificação versionada (D8/D9, F-FA7 b)**

26. `SpedEcdDto.declarant`: `superRefine` — `indFinEsc='1'` **exige** `codHashSub` **e** o body ganha
    `supersedesJobId` + `verificationTermRef` (obrigatórios quando `'1'`; proibidos quando `'0'`). 400 nomeado.
27. `SpedEcfDto`/`SpedEcfRealDto`: `retificadora ('N'|'S', default 'N')`, `numRec` (obrigatório quando `'S'`),
    `supersedesJobId` (obrigatório quando `'S'`). `lib/ecf.ts` já emite.
28. Serviço de geração valida **dentro da tx** (ACC-011): `supersedesJobId` existe no `scope`, mesmo `kind`,
    mesmos `periodStart/periodEnd`, status `EXPORTED`, e **ainda não tem sucessor** (`@unique` fecha a corrida
    → P2002 = `ConflictError`). O substituído **não muda** (`status`, `sha256`, `storageKey` inalterados —
    asserido após a substituição). Job novo grava `supersedesJobId`; `sha256` novo ≠ antigo (asserir os dois).
29. ECD substituta gerada → `ecfRectificationRequired=true` no exercício; `AccountingDeliveryService.buildDeliveryPackage`
    recusa (400 nomeado) enquanto `true`; ECF `retificadora='S'` do mesmo ano zera a flag (na tx).
30. `GET /data-exchange/jobs` expõe `supersedesJobId`/`supersededByJobId` (derivado) e a listagem mantém o
    anterior baixável (resposta 7). Eventos `sped.ecd_substituted` / `sped.ecf_rectified` (allowlist: `jobId`,
    `supersedesJobId`, `sha256`, `year`).
31. Runbook em branco `docs/runbooks/RUNBOOK-ECD-SUBSTITUTA.md` (formato `RUNBOOK-FORMAT.md`): pré-condições
    (erro não corrigível por extemporâneo — ITG 2000 31–36), Termo de Verificação colado, `codHashSub` do
    recibo, assinatura. Agente prepara; **não preenche**.

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
| **F-FA10** | Chave da taxa sem NCM (INSTALAÇÕES/EDIFICAÇÕES) e Notas | (a) `@@unique([userId, unitId, ncmPrefix, source, description])` — `description` entra na chave só para cobrir `ncmPrefix=null` · (b) coluna `key String` sintética (`'NCM:8471'`, `'INSTALACOES'`, `'NOTA_1'`) `@@unique([userId, unitId, key])` | **(b)** — chave explícita e estável; (a) depende de texto da fonte que pode mudar de acentuação entre versões do Anexo |
| **F-FA11** | Gatilho do seed do Anexo III (~250 linhas × N escopos) | (a) em `installPresetAsSystem`/T0 (P2 #320) — todo escopo novo nasce com a tabela · (b) lazy: primeira leitura de `GET /depreciation-rates` semeia · (c) comando explícito `POST /depreciation-rates/seed` | **(b)** — escopos antigos ganham a tabela sem migração de dado (S6 reprova backfill) e T0 não cresce 250 inserts; idempotente por `@@unique` de qualquer forma |
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
UpsertDepreciationRateSchema = { unitId, key, ncmPrefix?, description, lifeYears: int>0, annualRateBp: int(1..10000), justification: string (obrigatório) }  // sempre source='CUSTOM'
// SPED
SpedEcdDto.declarant.indFinEsc '1' ⇒ codHashSub (string 40 hex) & body.supersedesJobId & body.verificationTermRef obrigatórios
SpedEcf(Real)Dto: retificadora: 'N'|'S' = 'N'; numRec?: string(41 dígitos? — confirmar no leiaute); supersedesJobId?  // 'S' ⇒ ambos obrigatórios
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
- Formato exato de `NUM_REC` (ECF) e `COD_HASH_SUB` (ECD) nos leiautes — o corpus local tem o Manual ECF L12
  (verificar campo 0000.NUM_REC) e o leiaute ECD para `COD_HASH_SUB` (40 caracteres, **inferido**).

## 6. Insumos ausentes

- Leiaute ECD (Bloco 0/K) **não está no corpus local** (`fontes-oficiais/`): o tamanho de `COD_HASH_SUB` e a
  regra de `IND_FIN_ESC` foram lidos só do `lib/sped.ts` existente. Baixar via `scripts/baixar-fontes-oficiais.mjs`
  antes da `sessao-feature` (lembrar: `--so=<id>` reescreve o MANIFEST; `git checkout -- MANIFEST.md` depois).
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
custo 100.000 × 10% a.a. em 12 meses → 12 quotas de 833 + resto na última, Σ = 10.000; classe `LAND` → 0
entries; `HARD_CLOSED` → `failed[]` com 0 entries; job substituído com `sha256` inalterado após substituição;
2º substituto do mesmo job → 409 · review independente PASS · OPS-001 com adversarial escrito.
