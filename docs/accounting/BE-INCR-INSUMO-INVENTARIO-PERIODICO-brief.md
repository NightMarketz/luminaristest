# BE-INCR-INSUMO-INVENTARIO-PERIODICO — BRIEF

> **Sessão:** `sessao-planejamento`, 21/11/2026. **Nó:** [ITEM-DESTINATION](../plano/nos/ITEM-DESTINATION.md) (reabre a F-ID-3).
> **Lacuna:** `L-20261120-223332-f79c`. **Decisão:** [D-2026-11-21-INSUMO-INVENTARIO-PERIODICO](../plano/decisoes/D-2026-11-21-INSUMO-INVENTARIO-PERIODICO.md).

## 0. Contexto fixo

- **Item a planejar:** a F-ID-3 do [BRIEF do ITEM-DESTINATION](BE-INCR-ITEM-DESTINATION-brief.md), linhas 420 a 432, e o
  achado A-5 (linha 542). Hoje o insumo do serviço é debitado na `insumoExpenseAccountId` na entrada da NF-e
  (`NfeImportService.ts:381-395`, `PayableService.ts:1573-1588`).
- **Autorização:** dono, chat, 21/11/2026 (AskUserQuestion): *"(c) Inventário periódico"* e *"Executa (BRIEF + PR)"*.
  Cobre este BRIEF e o PR dele. Não cobre a linha da DRE (lacuna 35d3) nem a tela (FE).
- **Norma (origem citada):** NBC TG 1002 itens 13.2, 13.5 e 13.6 (dossiê `insumos-salao-sp`, D12, SHA-256
  `22e993c6…bd335`; fonte <https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG1002.pdf>).
- **Insumos consumados (fatos):**
  - `FiscalProfile.insumoExpenseAccountId` (folha Expense) foi configurado pelo contador (F-ID-5 a).
  - `InventoryItem`/`StockMovement` são só da revenda. O tie-out LAC-E exige Σ `InventoryItem` = saldo de `Estoques`
    (`ESTOQUES_CODE = '1.1.3.01'`, `ChartOfAccountsFixture.ts:231`; era a `1.1.6`). Por isso o insumo **não pode** cair nela.
  - `postingRepo.groupByAccount(scope, LEDGER_STATUSES, { to })` dá o saldo por conta até uma data (o mesmo cálculo do
    `balancesAsOf`).
  - `journalEntryRepo.findBySource` dá a idempotência por `sourceType` + `sourceId`.
- **Vizinhos:**
  - Consome: `FiscalProfileService` (perfil versionado por `AccountingPolicyVersion`), `PayableService` (lançamento de
    reconhecimento) e `PostingService.postEntry` (gate de período).
  - É consumido por: DRE e balanço (relatórios já existentes; a linha do custo do serviço é da 35d3).

## 1. Checklist de comportamentos

1. **Conta de estoque de insumo no perfil fiscal.**
   - Campo novo `insumoStockAccountId` (nullable) em `FiscalProfile`: coluna, DTO de entrada e de saída, payload
     versionado (`AccountingPolicyVersionService`) e allowlist do `auditCanonical`.
   - É validado como folha de **ativo** do escopo. A conta `ESTOQUES_CODE` é recusada com 400 nomeado, porque é o estoque
     de revenda e quebraria o tie-out LAC-E.
2. **Entrada da NF-e com a conta configurada.**
   - Com `insumoStockAccountId` preenchido, o item `INSUMO_SERVICO` vai para `insumoItems` com
     `accountId = insumoStockAccountId` e `stock: true`.
   - Sem a conta, o comportamento de hoje (despesa na entrada) fica igual. Configurar a conta é o que liga a (c), e
     o código da conta é do contador (precedente F-ID-5 e D-5).
   - A (c) também exige `insumoExpenseAccountId`, porque a contagem a usa: com a conta de estoque e sem a de despesa,
     o import dá o mesmo 400 de hoje.
3. **`insumoItems[].stock` no `PayableDto`.**
   - Campo opcional `stock: true`. Com ele, `PayableService` valida a conta como folha de ativo; sem ele, como folha
     de despesa (o caminho de hoje).
   - O débito agrupado por conta não muda: o insumo em estoque debita a conta de estoque de insumo.
4. **Contagem do estoque de insumo:** `POST /api/accounting/insumo-stock-counts`.
   - **Entrada:** `{ unitId, countDate (YYYY-MM-DD), countedValueCents ≥ 0 }`.
   - **Exige** `insumoStockAccountId` e `insumoExpenseAccountId` no perfil; sem uma delas, 400 nomeado.
   - **Saldo contábil:** saldo da conta de estoque de insumo até o fim do dia de `countDate`
     (`LEDGER_STATUSES`).
   - **Diferença:** `ajuste = saldo − contado`.
     - Maior que 0: D `insumoExpenseAccountId` / C estoque de insumo (consumo).
     - Menor que 0: D estoque de insumo / C `insumoExpenseAccountId` (sobra).
     - Igual a 0: nenhum lançamento.
   - **Lançamento:** data `countDate`, `sourceType = 'insumo_stock_count'`, `sourceId = <unitId>:<countDate>`. O
     `sourceDocument.rawJson` guarda o contado e o saldo.
   - **Idempotência:** segunda contagem na mesma data e unidade dá 409 `INSUMO_COUNT_ALREADY_POSTED`. Para corrigir,
     estorne o lançamento (fluxo de estorno já existente) e conte de novo.
   - **Recontagem depois do estorno** (review #1297, achado 1): o `reverseEntry` genérico só libera a chave do
     `closing`. Por isso cada recontagem usa a `sourceId` seguinte (`<base>#2`, `#3`…), e só a última pode estar ativa.
     O saldo da recontagem exclui as contagens estornadas da data e os estornos delas. Sem isso, um estorno datado
     depois de `countDate` deixaria a contagem original no saldo.
   - **Policy:** `canManageFiscalProfile`, a mesma régua de quem fecha período.
   - **Período fechado:** o gate é o do `postEntry`.
   - **Saída:** `{ countDate, bookValueCents, countedValueCents, adjustmentCents, entryId | null }`.
5. **Camadas:** rota em `routes/accounting.ts`, controller próprio, `InsumoStockCountService` na factory, DTO Zod
   `.strict()` com snapshot de shape, e entrada no `openapi.json`.
6. **Teste do cenário (guarda)** em `server/src/controllers/__tests__/insumoStockCount.integration.test.ts`.
   - O cenário é R$ 3.000 de tinta comprados em 30/12 e consumidos em janeiro. O XML de teste é assinado e a data não
     muda, então a guarda usa a mesma virada de mês: 8788 de insumo em 10/07/2025, consumidos em agosto.
   - Em 31/07, o balanço mostra 8788 na conta de estoque de insumo e a despesa de insumo de julho é 0.
   - A contagem de 31/07 com 8788 não gera lançamento.
   - A contagem de 31/08 com 0 lança 8788 de custo em agosto.

## 2. Contratos

```ts
// FiscalProfileDto (entrada e payload versionado)
insumoStockAccountId: z.string().min(1).nullable().optional()

// PayableDto.insumoItem
{ accountId, productRef, cProd, nItem, costCents, description?, stock?: z.literal(true).optional() }

// InsumoStockCountDto
CreateInsumoStockCountSchema = z.object({
  unitId: z.string().min(1),
  countDate: z.string().refine(isValidDateOnly),
  countedValueCents: z.number().int().min(0).max(MAX_CENTS),
}).strict()
InsumoStockCountViewSchema = z.object({
  countDate: z.string(), bookValueCents: z.number().int(), countedValueCents: z.number().int(),
  adjustmentCents: z.number().int(), entryId: z.string().nullable(),
}).strict()
```

## 3. Forks

| Fork | Estado |
|---|---|
| F-ID-3 (c), inventário periódico | ✅ ratificado (dono, 21/11) |

Os detalhes abaixo decorrem das regras já ratificadas e não abrem fork:
- a conta de estoque é configurada pelo contador (F-ID-5 a, D-5);
- a contagem é informada em valor, porque o salão valoriza pelo custo médio ou PEPS (item 13.5) e não há custo
  unitário de insumo no sistema;
- a correção se faz por estorno (fluxo existente).

## 4. Pendente de validação externa

- Empresa acima de R$ 4,8 mi (NBC TG 1000 / CPC 16): o texto não foi lido. É a P-4 do contador.

## 5. Insumos ausentes

- Nenhum para o backend.

## 6. Residuais declarados

- **Saldo lido fora da transação do lançamento.** Uma compra com data até `countDate`, lançada depois da contagem, não
  entra no ajuste. É o comportamento do inventário periódico: a contagem vale para a data dela. Para corrigir, estorne
  o lançamento e conte de novo.
- **Contagem com ajuste zero não grava nada.** Uma 2ª contagem na mesma data, com outro valor, lança normalmente: a
  1ª não deixou rastro no razão.
- **Re-drive do `PayableService`** (`buildRecognitionInputFromRow`): é o mesmo residual já registrado para o insumo
  (débito na `1.1.6` na janela de crash). Não muda aqui.

## 7. Achados fora de escopo

- Linha "custo dos serviços prestados" na DRE: lacuna 35d3, já em sessão própria.
- Tela da contagem e campo da conta no perfil (FE): par FE, como o A-6 do ITEM-DESTINATION.
