# BE-INCR-CONTADOR-PACKAGE — Emenda 3.4 (nó C6b) — BRIEF

> Sessão: `sessao-planejamento` · 2026-09-29 · base `origin/main` `9dd690b3`. **Sem código.**
> Saída = este documento + a linha em `docs/plano/nos/C6b.md` §Docs. Nenhum fork é ratificado aqui.
> Execução exige "executa" do dono (ORCH-006) **e** a ratificação dos forks da §5.

## 0. Contexto fixo

- **Item:** Fase 3.4 de [`PLANO-POS-CONTADOR-2026-09-23.md:105`](PLANO-POS-CONTADOR-2026-09-23.md). É a emenda do nó
  [`C6b`](../plano/nos/C6b.md), que está `done` com a emenda aberta no `estado_detalhe`. Origem: linha 12 da
  [triagem](TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md) (*"memória de cálculo IRPJ/CSLL/PIS/COFINS; créditos por nota e
  item com a regra; aging conciliado; ficha individual do imobilizado; inventário; conciliação apurado ×
  contabilizado × pago; XLSX para ele, CSV para importação"*). A triagem registra: *"Dono decide o escopo; parte
  depende de X7"*.
- **Autorização (citável):** decisão 16 de `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md`
  (PR #440, lida de `origin/claude/docs-decisoes-2026-09-29`; **ainda não está em `main`**): *"Planejar autorizado
  para as 4 emendas: … 3.4 [[C6b]] (inventário/ficha/aging agora; memória de cálculo depois do X7)"*. O cabeçalho
  do mesmo doc limita o alcance: *"'Planejar' autoriza BRIEF/ADR; código continua exigindo 'executa'"*. O
  fatiamento veio no pedido desta sessão (dono, 29/09): **AGORA** = inventário, ficha do imobilizado e aging
  exportáveis, mais os créditos por nota. **DEPOIS DO X7** = memória de cálculo e conciliação de tributos.
- **Cobertura da autorização:** cobre exatamente o bloco AGORA (§3). Os itens que dependem do X7 ficam só
  registrados (§8). Os **créditos por item** não aparecem em nenhuma das duas fatias; viraram o fork F-C6bE-6, sem
  planejamento aqui. A tela (FE) é nó vizinho e virou o fork F-C6bE-9.
- **Evidência de apoio:** `docs/accounting/DOSSIE-DECISOES-2026-09-29.md` §8, linha "3.4 C6b" (mesmo PR #440):
  *"XLSX já existe … Faltam: rota de inventário, export da ficha do imobilizado, export do aging; a memória de
  cálculo depende do X7"*.
- **Insumos consumados (fato, não se rediscute):** o [`BRIEF do C6b`](BE-INCR-CONTADOR-PACKAGE-EXTENDED-brief.md)
  (F-C6b-1..5 → a) e o seu [plano de execução](BE-INCR-CONTADOR-PACKAGE-EXTENDED-execution-plan.md) (F-C6b-6..8 → a),
  mergeados em #337/#338/#340. Também valem o ADR-CONTADOR-DELIVERY (F-CD3/4/6/7 → a), o INCR-INVENTORY (D6: a média
  móvel é derivada, o tie-out é por construção), o BE-INCR-FIXED-ASSETS (quota por `sourceId = assetId:yyyy-mm`), a
  EMENDA F-AG4→b do aging (tie-out só com `asOf == hoje`) e o X6 (crédito calculado por item e gravado por nota).
- **Nós vizinhos:**
  - **Consome:** [[C6]]/C6b (pacote, `resolveExtras`), [[X6]] (créditos), [[C8]] (imobilizado), [[F3]] (baixa
    parcial), INCR-INVENTORY e INCR-AGING.
  - **É consumido por:** [[FE-INCR-DELIVERY]] (`inflight`: PR-D1/PR-D2 leem `DELIVERABLE_EXPORT_KINDS`) e pelo
    contador.
  - **Emendas irmãs do mesmo dia:**
    - 3.2 [[C8]]: BRIEF em `origin/claude/c8-emenda-3-2-brief`, com `leaseEndDate` no ativo (E10) e amortização com o
      mesmo `sourceType` da depreciação (E11).
    - 3.1 [[ITEM-DESTINATION]]: BRIEF em sessão paralela, sem branch publicado quando esta sessão leu.
    - ADR do [[X7]]: sessão paralela.

## 1. Estado medido do código (V = lido nesta sessão em `9dd690b3`; I = inferido)

| # | Fato | Onde | Grau |
|---|---|---|---|
| S1 | XLSX existe: `serializeTable(table, 'csv'\|'xlsx')` grava **uma** planilha (`Sheet1`); todo export aceita `format: ['csv','xlsx']` | `lib/spreadsheet.ts:146,161`; `DataExchangeDto.ts:59`; `exceljs ^4.4.0` em `server/package.json:48` | V |
| S2 | Os `kind` de export são String no banco. Kind novo = **zero migração** | `DataExchange.model.ts:14-35` | V |
| S3 | Extras entregáveis: `DELIVERABLE_EXPORT_KINDS` (6). O `PackageProfileSchema` herda o enum | `AccountingDelivery.model.ts:28-35`; `AccountingDeliveryDto.ts:82-84` | V |
| S4 | `resolveExtras` exige `EXPORTED` + `sha256` + kind entregável + **um extra por kind** (`DUPLICATE_KIND`) + **período gravado ⊆ período do núcleo** (`EXTRA_PERIOD_OUT_OF_RANGE`). O núcleo exige meses `HARD_CLOSED` | `AccountingDeliveryService.ts:416-475`, `:132`, `:506` | V |
| S5 | Regra de período por kind: posição (balancete/BP/DRE) = `[1º/jan do ano(asOf), asOf]`; janela (razão/conciliação/amostra) = `[periodStart, periodEnd]` | `DataExchangeExportService.ts:163-165,169-172,220,237` | V |
| S6 | Precedente de linha-meta `#` no topo do arquivo (semente e algoritmo), com os nomes de coluna na 1ª linha de `rows` | `DataExchangeExportService.ts:348-363` (F-C6b-8 a) | V |
| S7 | `export()` checa só `policy.canRead`. As políticas de domínio (`canReadInventory`, `canReadPayable`, `canReadReceivable`) hoje valem o mesmo (`!!actorUserId`) | `DataExchangeExportService.ts:376`; `AccountingPolicy.ts:18,43,51,91` | V |
| S8 | **Inventário:** `InventoryService.listInventory` existe **sem rota**. `InventoryItem` é o snapshot **atual** (`qtyOnHand`, `totalValueCents`). `StockMovement` é append-only, com `qtyDelta`/`valueCentsDelta` com sinal e `occurredAt` date-only. Σ movimentos = snapshot (D6, `reconcileInventory`) | `InventoryService.ts:104-113,484-518`; `schema.prisma:1224-1266`; grep `routes/accounting.ts` = 0 | V |
| S9 | **Aging:** `GET /reports/aging` devolve JSON e não é exportável. O saldo em aberto vem do **status atual** do título (`amountCents − paidCents`). O tie-out só sai com `asOf == scopeToday`; fora disso, `tieOut: null` + `as_of_not_today` | `routes/accounting.ts:175`; `outstandingLines.ts:52-83`; `AgingReportService.ts:326-345` | V |
| S10 | A data do estorno do cancelamento (`dto.reversalDate`) vai **só no lançamento de estorno**, não na linha do título. O estorno liga-se ao original por `JournalEntry.reversedById` | `PayableService.ts:648-673,745-748`; `schema.prisma:544-546` | V |
| S11 | A baixa por retorno bancário passa por `registerPayment`/`registerReceipt` (mesmas origens `ap.payment`/`ar.receipt`) | `BankSettlementService.ts:318-319`; `Payable.model.ts:91-92`; `Receivable.model.ts:49-50` | V |
| S12 | **Imobilizado:** `GET /fixed-assets/:id` devolve só o ativo, sem histórico. A quota mensal é lançamento `fixed_asset.depreciation` com `sourceId = ${assetId}:${yyyy-mm}`. `sumCreditsBySourcePrefix` já reconstrói o acumulado pelo razão | `routes/accounting.ts:356`; `FixedAssetService.ts:57-59`; `DepreciationService.ts:21,176`; `IPostingRepository.ts:90-102` | V |
| S13 | O `FixedAsset` guarda `annualRateBp` (fiscal, snapshot) e `bookAnnualRateBp?`. A quota lançada usa `book ?? fiscal` | `schema.prisma:1687-1733`; BRIEF C8 3.2 §1 S5 | V |
| S14 | **Créditos:** calculados **por item** (`AcquisitionCost.itens: ItemCost[]`, com base, classe e crédito ICMS/PIS-COFINS) e **descartados** depois do import. Por nota, grava-se só `recoverableTaxLines` = JSON `[{accountId, accountCode, amountCents, kind: ICMS\|PIS_COFINS}]`. Regime, base e alertas **não** são gravados | `lib/nfeCost.ts:38-62,93-157`; `NfeImportService.ts:115-157,186-209`; `PayableService.ts:250,1185-1198`; `schema.prisma:955` | V |
| S15 | NF-e importada: `documentNumber = chaveAcesso`. Título cancelado tem o número renomeado para `deleted:<id>:<doc>` | `NfeImportService.ts:147`; `IPayableRepository.ts:64` | V |
| S16 | Há precedente de detalhamento por item no `SourceDocument.rawJson` do reconhecimento (`{ fixedAssetItems }`, C8 PR-5), sem coluna nova | `PayableService.ts:1119-1123` | V |
| S17 | FE: `ImportExportPanel` oferece **4** kinds. Os 2 do C6b PR-2 (conciliação, amostra) **não têm gerador na UI**. O `DeliveryPanel` rotula os kinds num `Record<string,string>` | `ImportExportPanel.tsx:22-27`; `DeliveryPanel.tsx:28-38`; grep `exportReport(` = só o painel | V |
| S18 | O evento `data_exchange.export_generated` já tem `kind` na allowlist; `delivery.package_built` já tem `kinds` | `auditCanonical.ts:48,177` | V |

## 2. O que a emenda é, e o que não é

**É:** cinco `ExportKind` novos no `DataExchangeExportService`, todos em CSV/XLSX (S1) e todos **extras entregáveis**
no pacote. São eles: inventário na data, fichas do imobilizado na data, aging AP e aging AR conciliados na data, e
créditos por nota no período. Cada relatório de posição **reconstrói a data pedida** a partir de um log append-only
(movimentos de estoque, razão) e fecha contra a conta de controle do razão. Um relatório "de hoje" não entra num pacote
de período `HARD_CLOSED` (S4 + S5): o período gravado cairia fora do núcleo e o pacote devolveria
`EXTRA_PERIOD_OUT_OF_RANGE` sempre.

**Não é:**
- memória de cálculo nem conciliação de tributos (§8, depois do X7);
- créditos por item (F-C6bE-6);
- tela (F-C6bE-9);
- o Livro Registro de Inventário legal nem o Bloco H (§6.1);
- rota JSON nova (F-C6bE-10).

## 3. Checklist de comportamentos (implementáveis, cada um testável)

> Os itens de aging estão escritos para a recomendação de F-C6bE-1 (c) e F-C6bE-2 (b). Se o dono escolher outro
> caminho, eles são reescritos antes do "executa", não improvisados.

**Bloco A — Fiação comum (zero migração, zero rota nova)**

1. `EXPORT_KINDS`, `IMPLEMENTED_EXPORT_KINDS` e `DELIVERABLE_EXPORT_KINDS` ganham os 5 kinds da §4.1 (S2, S3). O
   `PackageProfileSchema` herda o enum sem edição.
2. DTO (`ExportRequestSchema.superRefine`):
   - `asOf` passa a ser **obrigatório** nos 4 kinds de posição. A regra de BP/DRE (`DataExchangeDto.ts:70`) vira o
     conjunto `ASOF_REQUIRED_KINDS`.
   - `EXPORT_PURCHASE_TAX_CREDITS` entra em `PERIOD_REQUIRED_KINDS`. Com isso herda a proibição de
     `accountCode`/`asOf`/`templateKind` (`:127-137`).
   - Os kinds de posição proíbem `accountCode` e `templateKind`, e o par de período já é barrado pela regra existente.
     Classe `param-aceito-e-ignorado`.
   - Testes: cada campo proibido → 400 com `path`; sem `asOf` → 400.
3. `asOf` **no futuro** (`> scopeToday(scope)`) → 400 `AS_OF_IN_FUTURE`, checado no serviço (o fuso é do escopo). Uma
   posição futura mostraria o dado de hoje com data de amanhã. O teste usa relógio fixo (classe
   `teste-de-hoje-quebra-em-janela-utc`).
4. O período gravado no job segue a regra de posição de S5 (`[1º/jan do ano(asOf), asOf]`); para os créditos, segue a
   janela do DTO. Teste de pacote: um extra de posição com `asOf` = fim do período entra, e um com `asOf` no ano
   seguinte → `EXTRA_PERIOD_OUT_OF_RANGE`.
5. **Política por kind** no `export()`, além do `canRead` (S7): inventário → `canReadInventory`; aging AP e créditos →
   `canReadPayable`; aging AR → `canReadReceivable`; imobilizado → `canRead` (o mesmo de `FixedAssetService`). É a
   política do relatório de origem, para o RBAC futuro (F6) não abrir uma porta lateral pelo export. Teste com policy
   dublê negando só a de domínio → 403.
6. **Formato do arquivo:**
   - Linhas-meta `#` no topo, pelo mecanismo do precedente S6: a 1ª em `headers`, as demais no início de `rows`. Depois
     vem a linha de nomes de coluna, e as linhas de dados são **homogêneas** (importáveis em CSV).
   - As meta dizem: kind, `asOf` ou janela, versão do algoritmo e **um tie-out por conta de controle**.
   - O tie-out tem a forma `AgingTieOut` (`AgingReportService.ts:131-145`) e normaliza o sinal pela natureza com
     `findMappingRule` + `applySign`, como o aging já faz. Não se reescreve `nature === 'Liability' ? -x : x`.
7. Cada kind tem um **builder puro** em `features/accounting/models/`. O precedente é `entrySample.ts`: leituras entram,
   `{ metaLines, columns, rows }` sai, e há teste unitário sem Prisma. O `switch` de `buildTable` só orquestra.
8. Leituras novas entram por **interfaces estreitas** no construtor do `DataExchangeExportService`, satisfeitas
   estruturalmente pelos repositórios (precedente: `IReportReader`, `IReconciliationReader`, `IAccountReader`,
   `:37-80`). O factory passa os repositórios. O saldo da conta na data reusa
   `AccountingReportService.balancesAsOf`, que vira mais um método de `IReportReader`.
9. **Todo método de repositório novo tem teste de integração com Prisma real** (`npm run test:integration`,
   `--runInBand`). Memória `repositorios-de-contabilidade-nao-sao-exercitados`: teste de serviço com repositório falso
   não prova a query.
10. Sem evento de auditoria novo: `export_generated` já carrega `kind` (S18). Sem path novo: o path-count do openapi
    fica igual; `docs:generate` só alarga o enum de `kind` em `POST /data-exchange/exports` e no perfil do pacote.

**Bloco B — `EXPORT_INVENTORY` (posição do estoque na data)**

11. A posição é **reconstruída de `StockMovement`**: Σ `qtyDelta` e Σ `valueCentsDelta` com `occurredAt ≤ asOf` (fim do
    dia UTC), por item. Entram itens `ARCHIVED` e soft-deleted se tinham saldo na data: existiam naquela data. Nunca se
    lê o snapshot atual do `InventoryItem` (S8), que só vale para hoje e cairia na regra de S4.
12. Linhas com `qty = 0` **e** `valor = 0` são omitidas. Uma linha com só um dos dois zerado **fica**, com
    `anomaly = 'QTY_VALUE_MISMATCH'` (estoque zerado com valor residual é sinal para o contador, não ruído).
13. `unitCostCents = round-half-up(valor ÷ qty)` é só informativo. O invariante é sobre o **total** (D6); não se promete
    que `unit × qty = total`. Teste com 3 unidades a 100 centavos no total.
14. Tie-out contra **`1.1.6`** (`ESTOQUES_CODE`) na data. Teste: fixture com compra (AP), venda (COGS) e estorno de
    venda, com `asOf` antes e depois do estorno; Σ valor = saldo da `1.1.6`, e diferença zero.
15. **Não** lê o `DynamicTable` do produto (Contrato §2.1: integração cross-módulo não mora no motor nem no export
    contábil). O arquivo traz `productRef` + `description` (snapshot). O nome, NCM e unidade do produto ficam na §6.1.

**Bloco C — `EXPORT_PURCHASE_TAX_CREDITS` (créditos por nota no período)**

16. Linhas = `Payable` com `inventoryMultiItem = true` (o caminho do import da NF-e, o único que calcula crédito; S14)
    e `issueDate` na janela. `issueDate` é a data do lançamento `ap.payable` (`PayableService.ts:1111`), o que amarra o
    arquivo ao razão. Crédito ausente vira coluna `0`, não linha omitida: uma nota **sem** crédito também é informação.
17. Colunas por nota: chave (`documentNumber` **sem** o prefixo `deleted:<id>:`, S15), fornecedor, contraparte,
    emissão, custo bruto (`amountCents`), crédito ICMS + conta, crédito PIS/COFINS + conta, status **na data de fim da
    janela** e `reversalDate`. Testes:
    - uma nota cancelada **depois** do fim da janela sai `ACTIVE` (a data vem do estorno ligado por `reversedById`,
      S10);
    - uma cancelada dentro da janela sai `CANCELLED` e fica fora dos totais da meta.
18. A regra aplicada segue F-C6bE-5 (a): a meta registra o perfil fiscal **vigente na geração**, rotulado assim, e a
    frase *"o regime da data de cada nota não é gravado"*.
19. **Sem tie-out** neste kind, e a meta diz por quê. A conta a recuperar também recebe o consumo pela apuração (X7),
    então Σ créditos ≠ saldo por desenho. A conciliação dos créditos fica na §8.

**Bloco D — `EXPORT_FIXED_ASSET_REGISTER` (fichas do imobilizado na data)**

20. Um arquivo com as fichas de **todos** os ativos da unidade (F-C6bE-3 a). Critérios:
    - entram os ativos com `acquiredAt ≤ asOf`;
    - os baixados antes de 1º/jan do ano(`asOf`) ficam fora;
    - os ativos `PENDING_ACTIVATION` entram com o status e sem quotas.
21. Linhas por ativo, com `rowType ∈ ASSET | OPENING | QUOTA | DISPOSAL`:
    - `ASSET`: cadastro (código, descrição, classe, contas, NCM, quantidade, datas, custo, residual, taxa fiscal
      `annualRateBp`, taxa contábil `bookAnnualRateBp` + justificativa, fonte da taxa, chave da NF-e de origem via
      `sourceDocumentId`);
    - `OPENING`: `openingAccumulatedCents`;
    - `QUOTA`: uma por mês lançado até `asOf`, com `entryId`, `entryNumber`, quota, acumulado e valor líquido;
    - `DISPOSAL`: data, `entryId` e ganho/perda.
22. As quotas vêm do razão (S12): uma leitura nova lista os créditos `fixed_asset.depreciation` até `asOf`, e o builder
    separa `assetId` do `sourceId`. Invariante testado: com `asOf` ≥ último mês lançado, a Σ das linhas `QUOTA` + a
    `OPENING` de cada ativo é igual a `sumCreditsBySourcePrefix` + a abertura. É a mesma soma que o `reconcile` grava
    em `accumulatedDepreciationCents`.
23. Mostra-se **só a quota lançada** (a contábil). A fiscal fica fora (F-C6bE-4 a); as duas taxas aparecem no
    cabeçalho.
24. Tie-out **por conta** (não por classe: duas classes podem dividir a conta), na data:
    - Σ custo dos ativos não baixados = saldo da conta de custo;
    - Σ acumulado = saldo da conta de depreciação acumulada.

    Cada conta vira uma linha-meta. Teste: um lançamento manual na conta de custo aparece como diferença ≠ 0.
25. **Coordenação com a emenda 3.2 do C8.** Se ela já estiver em `main` na execução, a linha `ASSET` inclui
    `leaseEndDate` e o tipo da classe, e as quotas de amortização entram sozinhas (mesmo `sourceType`, E11). Se não
    estiver, o último PR a mergear acrescenta as colunas (§9.3).

**Bloco E — `EXPORT_AGING_PAYABLE` / `EXPORT_AGING_RECEIVABLE` (aging conciliado na data)**

26. O saldo em aberto de cada título **na data** vem do razão (F-C6bE-1 c): Σ das partidas na conta de controle
    (`2.1.2` para AP, `1.1.5` para AR; `AGING_CONTROL_ACCOUNT_CODE` reusado) com `entry.date ≤ asOf` e status em
    `LEDGER_STATUSES`, das entries do título:
    - reconhecimento `ap.payable`/`ar.receivable`, com `sourceId` = id do título;
    - pagamentos e recebimentos `ap.payment`/`ar.receipt`, com `sourceId` = id da baixa, mapeado ao título;
    - os estornos dos dois, pela ligação `reversedById`.

    Vencimento, número e contraparte vêm do título, **incluindo cancelados e soft-deleted**; o número sai sem o prefixo
    `deleted:`.
27. Faixas e agrupamento reusam `bucketForDaysOverdue` e `AGING_BUCKETS` (`AgingReportService.ts:23,59`). Títulos com
    saldo zero na data são omitidos.
28. Partidas na conta de controle **sem título** (lançamento manual, saldo de abertura) saem como linhas
    `section = 'UNLINKED'` (entry, data, histórico, valor). A meta traz:
    - `titlesTotalCents`, `unlinkedTotalCents` e `controlAccountBalanceCents`;
    - `differenceCents = saldo − títulos − não vinculadas` (tem de ser 0: diferente de 0 é bug do builder);
    - `tiesOut = (unlinkedTotalCents === 0 && differenceCents === 0)`.
29. Testes adversariais (fixture de integração, os dois lados):
    - título cancelado **depois** de `asOf` aparece em aberto;
    - pagamento parcial com `paidAt > asOf` não abate;
    - baixa por retorno bancário (S11) abate na data do pagamento;
    - estorno de pagamento depois de `asOf` não reabre o título na data;
    - lançamento manual na `2.1.2` sai `UNLINKED` e dá `tiesOut = false`;
    - com `asOf = hoje`, o saldo por título do razão é igual ao do subrazão (`amountCents − paidCents`). Esse
      cruzamento pega a janela de crash de 2 commits.

**Bloco F — Gates do PR de implementação**

30. Rodar, nesta ordem:
    1. `cd server && npx tsc --noEmit && npm run test:integration`.
    2. `UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot` e comitar os
       `.gen.ts` regenerados em `my-app/types/contracts/accounting/` (`DataExchangeDto`, `AccountingDeliveryDto`).
    3. `cd my-app && npx tsc --noEmit && npm run test:types`. O `tsc` cru do my-app exclui os testes (memória
       `tsc-noemit-my-app-exclui-testes`).
    4. `npm run docs:generate`: o enum alarga e o path-count fica igual.

    Sem migração, logo sem `smoke:migration`: declarar. Sem eventType novo, logo a allowlist não muda: declarar.

## 4. Contratos esboçados

### 4.1 Kinds e DTO

```ts
// models/DataExchange.model.ts — EXPORT_KINDS (+5; coluna String ⇒ zero migração)
'EXPORT_INVENTORY',              // posição na data (Bloco B)
'EXPORT_PURCHASE_TAX_CREDITS',   // janela (Bloco C)
'EXPORT_FIXED_ASSET_REGISTER',   // posição na data (Bloco D)
'EXPORT_AGING_PAYABLE',          // posição na data (Bloco E) — F-C6bE-2 (b); se (a): um só 'EXPORT_AGING'
'EXPORT_AGING_RECEIVABLE',

// models/AccountingDelivery.model.ts — DELIVERABLE_EXPORT_KINDS += os mesmos 5 (PackageProfileSchema herda)

// dtos/DataExchangeDto.ts
const POSITION_KINDS = new Set(['EXPORT_INVENTORY', 'EXPORT_FIXED_ASSET_REGISTER',
  'EXPORT_AGING_PAYABLE', 'EXPORT_AGING_RECEIVABLE']);
const ASOF_REQUIRED_KINDS = new Set(['EXPORT_BALANCE_SHEET', 'EXPORT_INCOME_STATEMENT', ...POSITION_KINDS]);
// PERIOD_REQUIRED_KINDS += 'EXPORT_PURCHASE_TAX_CREDITS'
// superRefine: ASOF_REQUIRED_KINDS sem asOf → issue ['asOf'];
//              POSITION_KINDS com accountCode|templateKind → issue no path do campo.
// (period/perAccount/seed já são barrados fora dos seus kinds pelas regras existentes, :81-123)
// F-C6bE-8 (a): ExportRequestSchema ganha .strict()
```

### 4.2 Leituras novas (interfaces estreitas, satisfeitas pelos repositórios)

```ts
interface IInventoryPositionReader {            // IInventoryRepository
  findPositionAsOf(scope: AccountingScope, until: Date): Promise<Array<{
    inventoryItemId: string; productRef: string; description: string | null; status: string;
    deleted: boolean; qty: number; valueCents: number; lastMovementAt: Date | null }>>;  // groupBy StockMovement
}
interface IPurchaseCreditReader {               // IPayableRepository (+ IJournalEntryRepository p/ o estorno)
  findPurchasesInWindow(scope: AccountingScope, window: ExportWindow): Promise<Array<{
    id: string; documentNumber: string | null; supplierName: string; counterpartyId: string;
    issueDate: Date; amountCents: number; status: string;
    recoverableTaxLines: Array<{ accountCode: string; amountCents: number; kind: 'ICMS' | 'PIS_COFINS' }>;
    recognitionReversalDate: Date | null }>>;    // data do estorno do `ap.payable`, via reversedById
}
interface IFixedAssetRegisterReader {           // IFixedAssetRepository + IPostingRepository
  findRegisterAssets(scope: AccountingScope, asOf: Date): Promise<Array<FixedAsset & {
    class: Pick<FixedAssetClass, 'code' | 'costAccountId' | 'accumulatedDepreciationAccountId'>;
    sourceExternalRef: string | null }>>;
  listCreditsBySourceType(scope: AccountingScope, sourceType: string, until: Date): Promise<Array<{
    entryId: string; entryNumber: number | null; date: Date; sourceId: string; creditCents: number }>>;
}
interface IControlLedgerReader {                // IPostingRepository
  findControlPostingsUntil(scope: AccountingScope, accountId: string, until: Date): Promise<Array<{
    entryId: string; entryNumber: number | null; date: Date; description: string;
    sourceType: string; sourceId: string | null;
    reverses: { sourceType: string; sourceId: string | null } | null;   // estorno → origem do original
    debitCents: number; creditCents: number }>>;
}
interface IAgingTitleReader {                   // um por lado: IPayableRepository / IReceivableRepository
  findTitlesByIds(scope: AccountingScope, ids: string[]): Promise<Array<{   // inclui cancelados/soft-deleted
    id: string; documentNumber: string | null; issueDate: Date; dueDate: Date;
    counterpartyId: string; counterpartyName: string }>>;
  findSettlementTitleIds(scope: AccountingScope, settlementIds: string[]): Promise<Map<string, string>>;
}
// IReportReader += balancesAsOf(scope, date) — já existe em AccountingReportService (AgingReportService.ts:365)
```

### 4.3 Colunas (a 2ª linha do arquivo; meta `#` acima, §3 item 6)

```ts
export const INVENTORY_COLUMNS = ['productRef', 'description', 'status', 'qty', 'totalValueCents',
  'unitCostCents', 'lastMovementDate', 'anomaly'] as const;
export const PURCHASE_TAX_CREDIT_COLUMNS = ['payableId', 'accessKey', 'supplierName', 'counterpartyId',
  'issueDate', 'grossCostCents', 'icmsCreditCents', 'icmsAccountCode', 'pisCofinsCreditCents',
  'pisCofinsAccountCode', 'statusAtPeriodEnd', 'reversalDate'] as const;
export const FIXED_ASSET_REGISTER_COLUMNS = ['assetCode', 'rowType', 'date', 'description', 'classCode',
  'costAccountCode', 'accumulatedAccountCode', 'ncmPrefix', 'quantity', 'acquiredAt', 'activatedAt', 'status',
  'costCents', 'residualValueCents', 'fiscalAnnualRateBp', 'bookAnnualRateBp', 'rateSource', 'sourceAccessKey',
  'entryId', 'entryNumber', 'amountCents', 'accumulatedAfterCents', 'netBookValueCents'] as const;
export const AGING_COLUMNS = ['section', 'counterpartyName', 'counterpartyId', 'titleId', 'documentNumber',
  'issueDate', 'dueDate', 'daysOverdue', 'bucket', 'outstandingCents',
  'entryId', 'entryDate', 'entryDescription'] as const;            // entry* só em section = 'UNLINKED'
// meta de tie-out (1 linha por conta): `# tieOut account=<code> subledger=<c> balance=<c> diff=<c> ok=<bool>`
```

## 5. Forks — RATIFICAÇÃO PENDENTE (todos)

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-C6bE-1** | Como o aging fica "conciliado" **numa data passada** | (a) só `asOf = hoje`, reusando o serviço inteiro · (b) reconstruir pelo subrazão: `issueDate ≤ asOf`, baixas `ACTIVE` com data ≤ `asOf` · (c) reconstruir pelo **razão**: saldo por título = Σ partidas na conta de controle das entries do título, com estornos, até `asOf`; partidas sem título saem listadas | **(c).** (a) nunca entra no pacote: o núcleo é `HARD_CLOSED`, logo o período fica no passado e o extra de hoje cai em `EXTRA_PERIOD_OUT_OF_RANGE` (S4/S5). (b) erra em cancelamento: a data do estorno não está na linha do título (S10) e pediria coluna + backfill. (c) usa só dado histórico exato e mostra o que não fecha (UNLINKED). Custo: 2 leituras novas e o mapeamento baixa → título |
| **F-C6bE-2** | Um kind de aging ou dois | (a) `EXPORT_AGING` com seções AP e AR · (b) `EXPORT_AGING_PAYABLE` + `EXPORT_AGING_RECEIVABLE` | **(b)**: espelha o `kind` do `GET /reports/aging`; cada arquivo fecha contra **uma** conta; a política fica por lado (item 5); o contador escolhe no perfil. Custo: 1 valor a mais no enum |
| **F-C6bE-3** | Granularidade da "ficha individual" | (a) um arquivo com as fichas de todos os ativos · (b) um arquivo por ativo (`assetId` obrigatório) · (c) (a) + filtro `assetId` opcional | **(a)**: o pacote aceita **um extra por kind** (`DUPLICATE_KIND`, S4); em (b) só um ativo iria. Em (c), um job filtrado anexado ao pacote entregaria o conjunto incompleto sem aviso. A ficha de um ativo na tela é assunto do FE (F-C6bE-9) |
| **F-C6bE-4** | Ficha com a quota fiscal além da contábil | (a) só a quota lançada, com as duas taxas no cabeçalho · (b) + coluna da quota fiscal recalculada (`quotaCumulativa` com `annualRateBp`) e a diferença | **(a)**: a diferença contábil × fiscal é o Bloco F da emenda 3.2 do C8 (F-EM-9, registro no e-Lalur). Calcular aqui criaria uma 2ª fonte que pode divergir. Reabrir quando o P3 do C8 mergear, lendo o movimento da Parte B |
| **F-C6bE-5** | "Com a regra": o que o arquivo de créditos diz sobre a regra aplicada | (a) só o gravado (tipo, valor, conta) + o perfil **vigente na geração** rotulado assim · (b) passar a gravar no import, daqui em diante, o retrato da regra (regime, flags, base, alertas) no `SourceDocument.rawJson` (precedente S16, zero migração); notas antigas saem "sem retrato" · (c) coluna ou tabela nova | **(a) agora**, e o retrato vai junto com F-C6bE-6. (b) mexe no caminho de escrita de dinheiro (import da NF-e), e o 3.1 vai mexer no mesmo ponto para gravar a destinação por item: fazer as duas coisas em dois PRs separados dá duas formas de guardar o item |
| **F-C6bE-6** | Para onde vão os **créditos por item** (fora das duas fatias decididas) | (a) requisito cruzado do BRIEF 3.1 [[ITEM-DESTINATION]], que já decide onde o item de compra mora; o export por item vem depois · (b) gravar agora `ItemCost[]` no `rawJson` (S14/S16) e exportar · (c) depois do X7 | **(a)**: a destinação por item (revenda × insumo) **muda o crédito do item**. Gravar o item antes do 3.1 gravaria uma forma que o 3.1 troca em seguida. Notas antigas não têm o item de qualquer jeito (descartado, S14) |
| **F-C6bE-7** | "XLSX para ele, CSV para importação" dentro do pacote | (a) um formato por kind no pacote (o operador escolhe ao gerar; o outro formato continua baixável do job) · (b) o mesmo kind em 2 formatos (`DUPLICATE_KIND` passa a ser por kind + formato) | **(a)**: não mexe na regra ratificada do C6b (S4). Perguntar ao contador quais arquivos ele **importa** (§6.4) antes de (b) |
| **F-C6bE-8** | `.strict()` no `ExportRequestSchema` (hoje não é strict: chave desconhecida some calada) | (a) sim, nesta emenda · (b) não, achado separado | **(a)**: o Contrato §3 pede DTO `.strict()`. Sem ele, um `assetId` enviado "para filtrar a ficha" sumiria calado e sairia o conjunto inteiro. O FE usa o tipo gerado, então não manda chave extra. Muda o comportamento dos kinds existentes (400 onde antes havia silêncio); por isso é fork |
| **F-C6bE-9** | Tela | (a) BRIEF só de BE; o FE (gerar os 5 kinds **e** os 2 do C6b PR-2 no `ImportExportPanel`, e os rótulos no `DeliveryPanel`) vira BRIEF próprio depois do BE · (b) um PR de FE dentro deste BRIEF | **(a)**: a casa separa BE e FE. O achado S17 (2 kinds de 17/09 sem gerador na UI) mostra que a lacuna já existia e merece a sua frente. Até lá, os kinds novos só saem pela API |
| **F-C6bE-10** | Rotas JSON de leitura (`GET /inventory?asOf=`, `GET /fixed-assets/:id/history`) além do export | (a) não: só export; o path-count fica igual · (b) sim, nesta emenda | **(a)**: a decisão diz "exportáveis". Rota de leitura existe para tela, e entra com o FE (F-C6bE-9) |
| **F-C6bE-11** | Fatiamento | (a) 1 PR · (b) 2 PRs seriais: **P1** fiação + inventário + créditos (leituras simples) → **P2** ficha + aging (reconstrução pelo razão; a ficha coordena com a 3.2) · (c) 1 PR por kind | **(b)**: P2 concentra o risco (F-C6bE-1 c), e empurrar a ficha para P2 aumenta a chance de a 3.2 do C8 já estar em `main` (item 25). (c) faz 4 rebases seguidos nos mesmos 5 arquivos |

## 6. Pendente de validação externa (não entra no checklist como decidido)

1. **Inventário legal.** O arquivo é **gerencial** (posição e valor pela média móvel). Falta o contador dizer se
   precisa do **Livro Registro de Inventário** ou do **Bloco H** da EFD ICMS/IPI, que pedem NCM, unidade e posse de
   terceiros e vêm do `DynamicTable` do produto (item 15). A obrigação do Livro para o Simples com IE (1º cliente) é
   **NV**: norma não lida.
2. **Mês do crédito** de PIS/COFINS/ICMS: a data de **emissão** ou a de **entrada** define o período? O item 16 usa
   `issueDate`, porque é a única data gravada e a do lançamento. A regra (Lei 10.833 art. 3º § 1º, "no mês") **não
   foi lida** nesta sessão.
3. **Faixas do aging** (a vencer, 1–30, 31–60, 61–90, 90+). São convenção do INCR-AGING, não norma; o contador pode
   querer outras.
4. **Quais arquivos o contador importa** (CSV) e quais só lê (XLSX): decide F-C6bE-7.
5. **Campos da ficha** que o contador espera além dos do item 21 (plaqueta, localização, responsável): não existem no
   modelo; perguntar antes de inventar.

As 5 perguntas vão para o próximo pedido ao contador ([[ENVIO-PEDIDO-CONTADOR]]). O agente não envia; o dono envia.

## 7. Insumos ausentes (pausados, não varridos — regra 2)

- O `sourceType`/`sourceId` que `PostingService.reverseEntry` grava **no estorno** não foi lido. O item 26 depende só
  de `reversedById`, que existe (S10). Falta confirmar na execução que **todo** caminho de cancelamento (título,
  baixa, baixa por retorno bancário) passa por `reverseEntry`.
- Se `sumCreditsBySourcePrefix` filtra status de entry: não lido. Define se a leitura do item 22 filtra
  `LEDGER_STATUSES` igual a ele (o invariante do item 22 pega a divergência).
- Se `FixedAssetRepository.findManyByUnit` inclui soft-deleted e baixados: não lido. Define a query de
  `findRegisterAssets`.
- Custo do item 26 em escopo grande (todas as partidas da conta de controle até `asOf`): não medido. O `dev.db` real
  é pequeno (memória `dev-db-real-path-is-nested`).

## 8. Diferido — depende do [[X7]] (registrado, **fora** do checklist)

| Pedido do contador | Por que espera | Nome reservado (não entra no enum agora) |
|---|---|---|
| Memória de cálculo IRPJ/CSLL/PIS/COFINS | Não existe apuração: o X7 está `blocked` e só tem autorização de ADR (F-M2) | `EXPORT_TAX_ASSESSMENT_MEMO` |
| Conciliação apurado × contabilizado × pago | Precisa do "apurado" do X7 e do "pago" da guia (DARF/DAS) | `EXPORT_TAX_RECONCILIATION` |
| Conciliação dos créditos com o razão | A apuração consome o crédito da conta a recuperar (item 19) | idem acima |

**Requisito cruzado para o ADR do X7** (registrado aqui, não no ADR, que é de outra sessão): a apuração tem de sair
como **dado legível por período** (base, alíquota, dedução e resultado por tributo), para que um builder puro na
mesma forma do §3 item 7 exporte a memória sem recalcular.

## 9. Achados fora de escopo

1. **S17:** os kinds `EXPORT_BANK_RECONCILIATION` e `EXPORT_ENTRY_SAMPLE` (C6b PR-2, 17/09) não têm gerador na UI.
   Pela tela, o pacote só recebe os 4 relatórios antigos como extras. Entra no BRIEF de FE (F-C6bE-9).
2. **Parâmetro aceito e ignorado** nos kinds antigos: balancete, BP e DRE aceitam `accountCode`/`templateKind` e os
   ignoram (`DataExchangeDto.ts:69-137` só barra esses campos em conciliação e amostra). F-C6bE-8 (a) não resolve isso
   (são chaves conhecidas). Candidato a `sessao-instrumentacao` → correção.
3. **Coordenação 3.2 × 3.4:** o BRIEF do C8 (E10/E11) não cita a ficha. Quem mergear por último acrescenta
   `leaseEndDate` e o tipo da classe na linha `ASSET` (item 25). Registrado aqui porque esta sessão não edita o BRIEF
   de outro item (regra 1).
4. **`GET /reports/aging` com `asOf` passado** mostra títulos emitidos **depois** da data como "a vencer": o saldo vem
   do status atual e não há filtro por `issueDate` no laço (`AgingReportService.ts:259-300`). Grau I (leitura do laço;
   sem teste que prove). Se F-C6bE-1 → (c), o builder pode passar a servir o JSON também. É outra frente.
5. **1º cliente (Simples):** `icmsContribuinte` é forçado a `false` (GAP-MAP `[ABERTO]`, decisão 5) e o Simples não
   apura crédito de PIS/COFINS (`nfeCost.ts`, LC 123 art. 23). Para ele, o arquivo de créditos sai **todo zero**; o
   valor do Bloco C é para a régua Presumido/Real (H1).

## 10. Riscos e vieses (T8)

- **Risco principal:** o aging pelo razão (F-C6bE-1 c) depende de toda baixa e todo cancelamento deixarem uma entry
  ligada ao título. Um caminho que mexa no subrazão sem entry (janela de crash de 2 commits, ou algum caminho não
  lido; ver §7) aparece como diferença entre subrazão e razão. Com `asOf ≠ hoje`, ninguém cruza essa diferença. O
  teste do item 29 só a pega com `asOf = hoje`.
- **Viés do autor:** preferi reconstruir pelo log (movimentos, razão) em todos os relatórios de posição por
  **coerência com o pacote** (S4). O custo dessa escolha está subestimado até a medição do §7. Também posso ter
  tratado como "direto" (itens 3, 6 e 12) decisões que o dono pode querer ver como fork. Todas estão justificadas no
  item e são reversíveis antes do "executa".
- **Adversarial tentado contra a conclusão "dá para fazer sem migração":** (i) o inventário em data passada precisa de
  coluna nova? Não: `StockMovement.occurredAt` + deltas com sinal bastam (S8). (ii) A ficha precisa de uma tabela de
  quotas? Não: o `sourceId` codifica ativo e mês (S12). (iii) O aging precisa da data do cancelamento? Sim, e ela está
  no estorno, ligada por `reversedById` (S10). A conclusão sobrevive. Quebraria se algum cancelamento **não** estornar
  lançamento (§7, 1º item).
