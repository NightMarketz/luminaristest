# BRIEF — BE-INCR-ITEM-DESTINATION (destinação por item na entrada: revenda × insumo do serviço) — nó ITEM-DESTINATION

> Produzido em `sessao-planejamento` em 29/09/2026, sobre `origin/main` `9dd690b3`. É a Fase 3.1 do
> [`PLANO-POS-CONTADOR-2026-09-23.md`](PLANO-POS-CONTADOR-2026-09-23.md) (linha 102) e o nó
> [`docs/plano/nos/ITEM-DESTINATION.md`](../plano/nos/ITEM-DESTINATION.md).
> **Este documento NÃO escreve código.** Tem checklist, contratos esboçados e forks.
> **Forks F-ID-1..9: ✅ RATIFICADOS em 29/09, todos na recomendação** (dono, chat: *"Pode seguir as recomendações"*;
> registro em [`D-2026-09-29-ITEM-DESTINATION-FORKS`](../plano/decisoes/D-2026-09-29-ITEM-DESTINATION-FORKS.md)).
> Nenhum item vira código sem "executa" do dono (ORCH-006).
>
> **Alcance, dito antes de tudo:** o 1º cliente é do **Simples** (decisão de 29/09, questionário 1). No Simples não
> há crédito de ICMS nem de PIS/COFINS pelo regime normal (LC 123 art. 23; código: `nfeCost.ts:111` só credita
> PIS/COFINS em `NAO_CUMULATIVO`, e `FiscalProfileDto.ts:64` força `icmsContribuinte=false` no Simples — V).
> **Nesse cliente, o único efeito deste nó é para onde vai o item: estoque ou despesa (F-ID-3).** O efeito fiscal
> serve à régua **Presumido** (só o ICMS do contribuinte muda) e **Real** (ICMS + PIS/COFINS não-cumulativo).

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó `ITEM-DESTINATION`, Fase 3.1 do plano pós-contador. Texto da linha 102: *"destinação
  por item na entrada (revenda × insumo do serviço) | efeito em estoque, X6 (crédito), ICMS uso e consumo;
  default por produto + override por item; migração | resposta do 0.8(e); ADR se mudar o modelo de Product"*.
  A origem é a crítica **P4** do contador (triagem de 23/09): *mesma tintura — revenda = monofásico sem crédito;
  insumo do serviço = crédito básico, ICMS de uso e consumo; destinação por item na entrada* (grau do contador:
  "lembrado"; ele mesmo disse que "convém solução de consulta").
- **Autorização:** nota `D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE`, **decisão 16** (PR #440, ainda fora de
  `main`; lida de `origin/claude/docs-decisoes-2026-09-29` `b5398c87`): *"Planejar autorizado para as 4 emendas:
  3.1 ITEM-DESTINATION (a posição oficial da RFB sobre monofásico entra como fork, sem esperar o contador)"*.
  Pedido do dono no chat desta sessão (29/09): *"Fase 3.1 PLANEJAR, sem esperar o contador"*, com a posição oficial
  registrada **como fork, não como fato decidido**. A nota diz ainda: *"Não é 'executa'… 'Planejar' autoriza
  BRIEF/ADR; código continua exigindo 'executa'"*.
  - **Cobre exatamente:** este BRIEF, com forks e recomendação.
  - **Não cobre:** código, ratificação de fork, envio do follow-up ao contador (o dono envia; D-6 do dossiê).
  - **Divergência do passo 1:** o plano lista *"resposta do 0.8(e)"* como dependência. A decisão 16 a dispensa
    para planejar. Consequência: a pergunta vira o fork **F-ID-4** e a pendência **P-1**, e não trava o BRIEF.
    Não há outra divergência.
  - **Ordem de merge:** em `main`, o campo `autorizacao` da nota do nó ainda diz "falta". Quem o preenche é o PR
    #440. **Este PR entra depois do #440.**
- **Insumos lidos** (código em `origin/main` `9dd690b3`):
  - `server/src/lib/nfeCost.ts`: `acquisitionCost` puro. Crédito de ICMS por item em `:119`. O portão do
    PIS/COFINS em `:110-114` exige `NAO_CUMULATIVO` e trata o fornecedor do Simples (F-PC-1 b). Base e crédito
    em `:124-137`.
  - `server/src/features/accounting/models/pisCofinsMonofasicoNcm.ts`: `classifyPisCofinsItem`. O NCM da tabela
    decide `MONOFASICO` **qualquer que seja o CST** (`:146`). CST 05..09 vira `MONOFASICO` (`:150`).
    CST 02 fora da tabela credita com alerta (`:151-155`).
  - `server/src/features/accounting/services/NfeImportService.ts`:
    - `allocate`: todo item fora de 1551/2551 exige `productRef` e vai para `inventoryItems`, ou seja, estoque
      1.1.6 (`:306-317`);
    - item com CFOP 1551/2551 vai para `fixedAssetItems` (`:64`, `:274-297`);
    - crédito sem conta configurada dá 400 nomeado (`:184-206`).
  - `server/src/features/accounting/services/NfePreviewService.ts:33-49`: o preview calcula o custo **sem**
    mapeamento de itens, então hoje tudo sai como revenda.
  - `server/src/features/accounting/dtos/NfeDto.ts`: `itemMapping` com XOR `productRef`/`classId` (`:30-47`),
    `ImportNfePurchaseSchema` (`:72-78`), `PreviewNfeSchema` (`:136`), `NfeCostPreviewSchema` (`:151-163`).
  - `server/src/features/accounting/dtos/PayableDto.ts`:
    - o AP **manual** já separa despesa de estoque: `expenseAccountId` XOR `inventoryProductRef` (`:41-42`, V).
      A "destinação" já existe, implícita, no caminho manual;
    - linhas multi-item em `:63-95`; tie-out Σ = `amountCents` em `:121-124` e `:215`.
  - `server/prisma/schema.prisma`:
    - `InventoryItem` tem `@@unique([userId, unitId, productRef])`, e `productRef` é string, não FK (F-INV5,
      `:1224-1245`);
    - `StockMovement` está em `:1251-1266`;
    - `FiscalProfile` está em `:1319+`.
  - `server/src/features/accounting/models/Inventory.model.ts:16`: `STOCK_MOVEMENT_KINDS = INBOUND | COGS |
    ADJUSTMENT | REVERSAL`. **Não existe movimento de consumo de insumo em serviço** (V; a busca por
    insumo/consumo em `server/src` não achou mecanismo).
  - `PhysicalStockSync.ts:7-24`: entrada física (DT `productUnits.stock`) só para linha de estoque do AP.
    `jobs/accountingSyncReconcile.job.ts:1358-1401` compara físico × valorado por `productRef`, só com aviso.
  - `ProductRefLookup.ts:12-29`: porta de existência do produto na DT `products`, que deve ser reusada.
  - `audit/auditCanonical.ts:58` (`payable.created`, com os campos de crédito do X6, item 13) e `:87`
    (`inventory.received`).
  - Docs: [`TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md`](TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md) P4/P8/2a/7a;
    [`BE-INCR-NFE-COST-REGIME-brief.md`](BE-INCR-NFE-COST-REGIME-brief.md) (F-X6-5: não reprocessar nota antiga);
    dossiê `DOSSIE-DECISOES-2026-09-29.md` §4 D-6 item 4 (PR #440).
- **Nós vizinhos:**

  | Nó | Relação |
  |---|---|
  | [[X6]] | Este nó muda o `acquisitionCost` e usa o `classifyPisCofinsItem` sem mudá-lo |
  | [[FIS-08]] | Import, preview e DTO da NF-e |
  | [[D1]] | Contador: pergunta D-6 item 4, ainda não enviada |
  | [[C8]] | Irmão de linha: `fixedAssetItems` roteado por CFOP. Ver o achado A-1 |
  | INCR-INVENTORY / LAC-D / LAC-E | Subrazão, físico e tie-out |
  | [[GOV-CONTADOR]] | Parâmetro fiscal com aprovação do contador; forks ratificados em 29/09, ainda não implementados |
  | [[C6b]] 3.4 | "Créditos por nota e item" (persistência por item) |
  | PRE-ADR IBS/CBS 2027 (onda 3) | Consumidor futuro da destinação (LC 214 art. 57) |

  A tela (mapeamento no `NfePanel`) é FE e fica fora deste BRIEF (ver §6).

## Definição de pronto

Este BRIEF tem checklist numerado e testável (§1), contratos em Zod/Prisma (§2) e forks com caminhos, recomendação
e status **RATIFICAÇÃO PENDENTE** (§3). Tem também pendências de validação externa (§4), insumos ausentes (§5) e
achados fora de escopo (§6). **Fica pronto quando os forks estão listados, não quando estão decididos.**

---

## 1. Checklist de comportamentos

> `[cond:F-ID-n]` indica que o item assume a recomendação daquele fork. Se o dono escolher outro caminho, o item
> muda. A seção "Consequências" de cada fork diz como.

### Fase 0 — Schema e contratos (serial)

1. **Constantes:** `models/itemDestination.ts` com `ITEM_DESTINATIONS = ['REVENDA', 'INSUMO_SERVICO']`
   `[cond:F-ID-1]` e `ITEM_DESTINATION_ORIGINS = ['OVERRIDE', 'PRODUTO', 'FALLBACK']` `[cond:F-ID-6]`.
   Não tem teste próprio: os itens 3–15 exercitam as constantes.
2. **Prisma (migração aditiva):**
   - model `ProductDestinationDefault` `[cond:F-ID-2]`;
   - coluna `FiscalProfile.insumoExpenseAccountId` (nullable, FK `Account` Restrict) `[cond:F-ID-5]`.
   Nenhum `ALTER` em `inventory_items`, `stock_movements` ou `payables` `[cond:F-ID-3]`. Dois cuidados, ambos I:
   - o Prisma no SQLite pode recriar `fiscal_profiles` para uma coluna com FK (RedefineTables). Confira o SQL
     gerado e ponha prólogo idempotente (memória `migracao-sqlite-nao-e-transacional`);
   - `resetDb()` (`server/test/helpers/db.ts:45`) passa a limpar a tabela nova.
   **Teste:** a migração aplica numa cópia do `dev.db` real (`server/prisma/prisma/dev.db`); as suítes de
   integração ficam verdes.
3. **DTOs `.strict()`:**
   - `itemMapping` recebe `destination` opcional. `destination` sem `productRef`, ou junto com `classId`, dá
     issue: imobilizado segue o CFOP;
   - `PreviewNfeSchema` recebe `itemMappings` opcional `[cond:F-ID-8]`;
   - `UpsertFiscalProfileSchema` recebe `insumoExpenseAccountId`;
   - `CreatePayableSchema` recebe `insumoItems`, que só cabe em `inventoryMultiItem`. O tie-out passa a ser
     Σ estoque + Σ imobilizado + Σ insumo + Σ créditos = `amountCents`;
   - schemas do default por produto (§2).
   **Teste:** unitário de cada `superRefine`. Snapshot de shape (`UPDATE_DTO_SNAPSHOT=1`) e
   `my-app/types/contracts/accounting/*.gen.ts` regenerados **no mesmo PR** (gate).

### Fase 1 — Núcleo puro (`nfeCost.ts`)

4. **Retrocompatível:** `acquisitionCost(nfe, itens, regime, destinos?)`. Sem `destinos`, tudo é `REVENDA`, e
   a saída é **idêntica** à de hoje. `ItemCost` ganha `destination`.
   **Teste:** o `nfeCost.test.ts` atual roda sem mudança (T6: patch, não rewrite). Um caso novo passa `destinos`
   todo `REVENDA` e confere igualdade profunda com a chamada sem `destinos`.
5. **ICMS do insumo:** com `icmsContribuinte=true`, item `INSUMO_SERVICO` tem `creditoIcmsCents = 0`, e o
   `vICMS` fica no custo. Fonte:
   - contador P4, "ICMS uso e consumo" (lembrado);
   - RIR/2018 art. 301 § 3º (corpus): só o imposto **recuperável** sai do custo;
   - a não-recuperabilidade do ICMS no insumo de serviço sujeito a ISS está em **[NC]** (P-2). O default é
     conservador: não credita.
   **Teste:** a mesma nota como `REVENDA` credita o `vICMS`; como `INSUMO_SERVICO`, crédito 0 e
   `custoLiquidoCents` maior exatamente pelo `vICMS`.
6. **PIS/COFINS, insumo tributado:** item `INSUMO_SERVICO` com classe `TRIBUTADO` tem a mesma base e o mesmo
   crédito (1,65% + 7,6%) de hoje. Fonte: Lei 10.637 e Lei 10.833, art. 3º II ("bens… utilizados como insumo na
   prestação de serviços"). As leis estão no MANIFEST, mas a redação **não foi relida nesta sessão** porque o
   HTML não fica no git (I). Contador P4: "crédito básico" (lembrado).
   **Teste:** o mesmo item como `REVENDA` e como `INSUMO_SERVICO` dá o mesmo `creditoPisCofinsCents`.
7. **PIS/COFINS, insumo monofásico** `[cond:F-ID-4]`: vale para classe `MONOFASICO` pela **regra de NCM**, não
   pelo CST 05..09. Na recomendação (a):
   - CST do fornecedor **02**: credita 1,65% + 7,6% sobre a base, com warning *"insumo monofásico comprado com
     CST 02 (fabricante/importador) — crédito pela posição da RFB; confira o emitente"*;
   - CST **04/06**: crédito 0, com warning que cita a posição;
   - qualquer outro CST: crédito 0, com warning de CST divergente.
   **Pré-condição:** a transcrição da P-1 no corpus. Até lá, o item roda como **(c)**, o comportamento de hoje:
   crédito 0 com warning.
   **Teste:** um `it` por ramo de CST. `REVENDA` + `MONOFASICO` segue com crédito 0 em qualquer CST (regressão).
8. **Invariantes:**
   - com destinações mistas, Σ `custoLiquidoCents` = `custoEstoqueCents` (item 9 do X6);
   - num perfil `SIMPLES` ou `CUMULATIVO`, a destinação não muda crédito de PIS/COFINS;
   - no `SIMPLES`, também não muda o ICMS.
   **Teste:** perfil Simples e nota mista: créditos 0 nas duas destinações. O único efeito que sobra é a rota do
   item 10.

### Fase 2 — Resolução, import, preview, AP

9. **Resolver (função pura):** a destinação de cada item vem do override do `itemMapping`. Se não houver
   override, vem do default do produto (`productRef`) `[cond:F-ID-2]`. Se não houver default, é `REVENDA` com
   origem `FALLBACK` e warning `[cond:F-ID-6]`. A busca de defaults é **uma** query por unidade + `productRef`s.
   O import **nunca grava** default `[cond:F-ID-9]`.
   **Teste:** 3 itens, um por origem.
10. **Rota contábil** `[cond:F-ID-3]`:
    - `REVENDA` vai para `inventoryItems`, sem mudança: D 1.1.6, `StockMovement INBOUND`, sync físico;
    - `INSUMO_SERVICO` vai para `insumoItems`: D `insumoExpenseAccountId`, **sem** `StockMovement` e **sem**
      sync físico. O tie-out LAC-E continua coerente, porque nenhum dos dois lados vê o insumo;
    - item de CFOP 1551/2551 com `destination` dá 400.
    **Teste:** nota mista (1 revenda + 1 insumo). Esperado: 1 `INBOUND`, `recordPurchaseInbound` chamado 1 vez, e
    o entry com D 1.1.6, D despesa e D a recuperar contra C 2.1.2 = bruto.
11. **Conta de insumo não configurada:** item `INSUMO_SERVICO` sem `insumoExpenseAccountId` dá 400
    `insumo_account_not_configured: …`, com texto no padrão do `recoverable_account_not_configured`
    (`NfeImportService.ts:190-201`). Nada é criado. `createPayable` confere de novo que a conta é folha
    `nature=Expense` do escopo (defesa em profundidade, como o `expenseAccountId`).
    **Teste:** o 400 e zero linhas novas em `payables`, `journal_entries` e `stock_movements`.
12. **Cancelamento:** cancelar uma nota com insumo estorna o entry inteiro (as linhas de despesa entram pelo
    `reverseEntry` que já existe). O contra-movimento físico só atinge as linhas de revenda
    (`PayableService.ts:651-653`).
    **Teste:** saldo 0 na conta de insumo depois do estorno; 1 `Out` físico, não 2.
13. **Auditoria:** o payload de `payable.created` ganha `insumoCents`, no precedente do X6 item 13. A allowlist
    `auditCanonical.ts:58` muda **no mesmo PR** (gate).
    **Teste:** o de allowlist do canônico.
14. **Preview** `[cond:F-ID-8]`:
    - o `itemMappings` opcional passa pelo **mesmo** resolver e pelos mesmos `destinos` do import;
    - a saída ganha `custo.custoInsumoCents` e `custo.destinacoes[]`;
    - sem mapeamento, tudo sai `REVENDA`/`FALLBACK`, e o número é igual ao de hoje;
    - o controller decodifica `itemMappings` com o mesmo `decodeItemMappings` do import
      (`nfeController.ts:55-92`).
    **Teste:** preview e import da mesma nota com o mesmo mapeamento dão os mesmos créditos (preview = import a
    seco).
15. **Resposta do import:** `NfePurchaseImportResult` ganha `destinacoes[]`, com `origem` por item. O operador vê
    o `FALLBACK`.
    **Teste:** o campo presente e igual ao do preview.

### Fase 3 — Default por produto (`[cond:F-ID-2]`, cadeia completa de camadas)

16. **Repository** `ProductDestinationDefaultRepository`: `findManyByProductRefs(scope, refs, tx?)`,
    `upsert(scope, …, tx)` e `softDelete(scope, productRef, tx)`. O upsert **revive** a linha soft-deletada: com o
    `@@unique`, uma segunda linha daria P2002 (memória `unique-de-idempotencia-x-soft-delete`). `list(scope)`
    lista.
    **Teste:** integração no SQLite: upsert, delete, upsert de novo dá 1 linha viva.
17. **Service:**
    - `upsert` confere o produto com `IProductRefLookup.productExists` (reuso) e dá 400 se não existir;
    - policy `canManageFiscalProfile` (reuso), com 403;
    - eventos `product_destination.set` e `product_destination.cleared` **dentro da tx**, com a allowlist no mesmo
      PR.
    **Teste:** 403, 400 de produto inexistente ou de outro tenant, e o evento gravado.
18. **Controller + rotas:**
    - `GET /api/accounting/product-destinations?unitId=`;
    - `PUT /api/accounting/product-destinations` com body `{ unitId, productRef, destination }`;
    - `DELETE /api/accounting/product-destinations/:productRef?unitId=`.
    Registro nos 2 toques (`routes/index.ts` + `docs.paths.ts`). O auth é deny-by-default. `public/openapi.json`
    é regenerado (memória `openapi-wiring-static-artifact`), e o guard de path-count passa para +2 paths.
    **Teste:** integração das 3 rotas e o path-count.
19. **Factory:** o `NfeImportService` e o `NfePreviewService` recebem o repositório de defaults; o novo service
    entra no factory da contabilidade.
    **Teste:** coberto pelos itens 9, 14 e 18.
20. **Perfil fiscal:** o `upsert` aceita `insumoExpenseAccountId`, com `assertExpenseAccount` análogo ao
    `assertAssetAccount` (`FiscalProfileService.ts:199`).
    **Teste:** conta de ativo dá 400; conta de despesa de outro escopo dá 400.

### Migração de dado e retrocompatibilidade (`[cond:F-ID-7]`)

- **Sem migração de dado.** Produto sem default cai em `FALLBACK` = `REVENDA`, que é o comportamento de hoje.
  Nota já importada **não é reprocessada** (ACC-018; precedente F-X6-5 a). Uma nota antiga reclassificada sai por
  estorno + reimportação, ou por ajuste manual.
  **Teste:** nenhuma migração toca `payables`, `stock_movements` ou `inventory_items`; o smoke S6 fica verde sem
  backfill.
- **FE atual:** não manda `destination`, e a resposta ganha campos aditivos. O FE usa **tipos** gerados, não parse
  estrito em runtime (V: `NfeDto.gen.ts` é gerado pelo snapshot). Nada quebra, mas a tela não oferece a escolha
  até existir o par FE (§6, A-6).

### Gates que o diff aciona

`cd server && npx tsc --noEmit` · snapshot de shape dos DTOs + `.gen.ts` · allowlist do `auditCanonical.ts` (3 eventos
tocados) · path-count do openapi + `public/openapi.json` · `npm run test:integration` (com `--runInBand`) ·
`resetDb()` com a tabela nova · `cd my-app && npx tsc --noEmit` + `npm run test:types` se o `.gen.ts` mudar.

---

## 2. Contratos esboçados

### Constantes (`server/src/features/accounting/models/itemDestination.ts`)

```ts
/** ITEM-DESTINATION — destinação declarada pelo COMPRADOR na entrada. O XML do fornecedor não a traz: o
 *  `prod/CFOP` é o da operação do emitente (achado A-1). F-ID-1 (a): 2 valores; o 3º é aditivo. */
export const ITEM_DESTINATIONS = ['REVENDA', 'INSUMO_SERVICO'] as const;
export type ItemDestination = (typeof ITEM_DESTINATIONS)[number];

/** De onde veio a destinação do item (F-ID-6 a) — devolvida no preview/import, nunca inferida em silêncio. */
export const ITEM_DESTINATION_ORIGINS = ['OVERRIDE', 'PRODUTO', 'FALLBACK'] as const;
export type ItemDestinationOrigin = (typeof ITEM_DESTINATION_ORIGINS)[number];
```

### Prisma (F-ID-2 a, F-ID-5 a)

```prisma
// ITEM-DESTINATION (F-ID-2 a): destinação PADRÃO de um produto nesta unidade. Parâmetro fiscal com efeito em
// crédito → Prisma first-class (§2.1), nunca campo do preset. productRef = string escopada, NÃO FK (F-INV5).
model ProductDestinationDefault {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId      String
  productRef  String
  destination String    // ITEM_DESTINATIONS
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? // soft-delete; o upsert REVIVE a linha (unique × soft-delete)

  @@unique([userId, unitId, productRef])
  @@map("product_destination_defaults")
}

// FiscalProfile — coluna nova (F-ID-5 a):
//   insumoExpenseAccountId String?  // conta de resultado (nature=Expense, folha) do insumo do serviço — código do contador
//   insumoExpenseAccount   Account? @relation("FiscalProfileInsumoExpense", fields: [insumoExpenseAccountId], references: [id], onDelete: Restrict)
```

### Zod — entrada

```ts
// NfeDto.ts — itemMapping (extensão; XOR productRef/classId existente mantido)
const itemMapping = z
  .object({
    cProd: z.string().min(1),
    productRef: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    destination: z.enum(ITEM_DESTINATIONS).optional(), // override por item; ausente → default do produto → FALLBACK
  })
  .strict()
  .superRefine((val, ctx) => {
    /* …XOR existente… */
    if (val.destination != null && val.productRef == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['destination'],
        message: `Item '${val.cProd}': destination só cabe em item mapeado com productRef — imobilizado segue o CFOP.` });
    }
  });

// F-ID-8 (a): preview = import a seco
export const PreviewNfeSchema = z
  .object({ unitId: z.string().min(1), itemMappings: z.array(itemMapping).optional() })
  .strict();

// PayableDto.ts — linha nova (F-ID-3 a); só com inventoryMultiItem, como fixedAssetItems
const insumoItem = z
  .object({
    accountId: z.string().min(1), // FiscalProfile.insumoExpenseAccountId, preenchido pelo NfeImportService
    productRef: z.string().min(1), // rastreio (descrição da linha do entry); NÃO gera StockMovement
    cProd: z.string().min(1),
    nItem: z.number().int().positive(),
    costCents: cents,
    description: z.string().min(1).optional(),
  })
  .strict();
// CreatePayableSchema: insumoItems: z.array(insumoItem).optional()
//   gate: inventoryMultiItem ⇒ ao menos um de inventoryItems | fixedAssetItems | insumoItems
//   tie-out: Σ inventoryItems.valueCents + Σ fixedAssetItems.costCents + Σ insumoItems.costCents + Σ recoverableTaxLines === amountCents

// ProductDestinationDto.ts (F-ID-2 a)
export const UpsertProductDestinationSchema = z
  .object({ unitId: z.string().min(1), productRef: z.string().min(1), destination: z.enum(ITEM_DESTINATIONS) })
  .strict();
export const ListProductDestinationsQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

// FiscalProfileDto.ts — UpsertFiscalProfileSchema += insumoExpenseAccountId: z.string().min(1).nullable().optional()
```

### Zod — saída

```ts
export const NfeItemDestinationSchema = z
  .object({
    nItem: z.number().int().positive(),
    cProd: z.string(),
    destination: z.enum(ITEM_DESTINATIONS),
    origem: z.enum(ITEM_DESTINATION_ORIGINS),
  })
  .strict();

// NfeCostPreviewSchema (extensão aditiva). `custoEstoqueCents` mantém o significado atual (custo LÍQUIDO de todos
// os itens costeados — hoje já inclui imobilizado, V: nfeCost não conhece CFOP); o subconjunto que vai para despesa:
//   custoInsumoCents: centsInt,
//   destinacoes: z.array(NfeItemDestinationSchema),

export const ProductDestinationViewSchema = z
  .object({ productRef: z.string(), destination: z.enum(ITEM_DESTINATIONS), updatedAt: z.string() })
  .strict();
```

### Função pura

```ts
// nfeCost.ts — assinatura estendida, retrocompatível (item 4)
export function acquisitionCost(
  nfe: Pick<ParsedNfe, 'totais' | 'emit'>,
  itens: NfeItem[],
  regime: CostRegime,
  destinos?: ReadonlyMap<number /* nItem */, ItemDestination>, // ausente ⇒ tudo REVENDA
): AcquisitionCost; // ItemCost += destination

// resolver (item 9) — puro; a I/O (defaults) fica no service
export function resolveDestinations(
  itens: ReadonlyArray<{ nItem: number; cProd: string }>,
  overrideByCProd: ReadonlyMap<string, ItemDestination>,
  productRefByCProd: ReadonlyMap<string, string>,
  defaultByProductRef: ReadonlyMap<string, ItemDestination>,
): { byNItem: Map<number, ItemDestination>; destinacoes: NfeItemDestination[]; warnings: string[] };
```

### Matriz de crédito por destinação (regime `NAO_CUMULATIVO`, fornecedor fora do Simples ou flag F-PC-1 ligada)

| Destinação | Classe (`classifyPisCofinsItem`) | CST do fornecedor | Crédito PIS/COFINS | ICMS (contribuinte) | Fonte / grau |
|---|---|---|---|---|---|
| REVENDA | TRIBUTADO | 01/02 | base × 9,25% | credita `vICMS` | X6, sem mudança (V) |
| REVENDA | MONOFASICO | qualquer | 0 | credita `vICMS` | Lei 10.833 art. 3º § 2º II (corpus); sem mudança |
| INSUMO_SERVICO | TRIBUTADO | 01/02 | base × 9,25% | **0 (fica no custo)** | art. 3º II das Leis 10.637/10.833 (I); ICMS: P-2 [NC] |
| INSUMO_SERVICO | MONOFASICO por NCM | 02 | **F-ID-4** (rec. a: base × 9,25% + warning) | 0 | IN 2.121 / SC 4.024 (fora do corpus: P-1) **[ERRATA 10/10 — `docs/plano/PERGUNTAS-DE-LEI-2026-10-10.md` §10.2]** a base é a SC Cosit 496/2017 (crédito do insumo monofásico), não a SC 4.024. |
| INSUMO_SERVICO | MONOFASICO por NCM | 04/06/outro | 0 + warning | 0 | idem |
| qualquer | UNKNOWN | — | 0 + warning | conforme a destinação | X6, sem mudança |

No `CUMULATIVO` (Presumido), a coluna de PIS/COFINS é sempre 0 e só a do ICMS muda. No `SIMPLES`, as duas são 0.

---

## 3. Forks — ✅ RATIFICADOS 29/09, todos na recomendação (texto original mantido como registro)

### F-ID-1 — Quais destinações existem — ✅ (a)

- **(a) Duas: `REVENDA` e `INSUMO_SERVICO`.** É o escopo do nó. O enum aceita um 3º valor de forma aditiva.
- (b) Três, com `USO_CONSUMO` (café, limpeza): sem crédito de PIS/COFINS, sem crédito de ICMS, direto na despesa.
  Custa 1 ramo no núcleo e 1 valor no enum, mas cresce o item além do autorizado.
- **Recomendação: (a).** O `USO_CONSUMO` vai para o achado A-2 (é lacuna real, porque hoje café comprado por NF-e
  só entra como estoque). Abrir agora dimensionaria o item além da autorização (regra 5).

### F-ID-2 — Onde mora o default por produto — ✅ (a)

- **(a) Tabela Prisma `ProductDestinationDefault`** por (`userId`, `unitId`, `productRef`), com CRUD próprio
  (itens 16–20).
- (b) Campo `destinacaoPadrao` no preset DynamicTable `products`, lido pelo repositório, como no
  `ProductRefLookup`. **Muda o modelo de Product**, então exige ADR (plano, linha 102). Além disso, qualquer um que
  edita produto na DT mudaria crédito fiscal sem a policy fiscal, o que colide com o §2.1: invariante fiscal não
  vira campo de preset.
- (c) Sem default persistido: só o override por item, com a memória local do FE. Contraria o "default por produto"
  do plano, e o efeito fiscal passaria a depender do navegador de quem importa.
- **Recomendação: (a).** Mantém o parâmetro fiscal sob a policy fiscal e fora do motor; não muda Product, logo não
  exige ADR; segue o padrão do `InventoryItem`/F-INV5 (`productRef` string escopada). O escopo é por unidade
  porque o `FiscalProfile` é por unidade, e uma filial pode revender o que outra usa.

### F-ID-3 — Efeito em estoque do `INSUMO_SERVICO` — ✅ (a)

- **(a) Despesa na entrada:** D `insumoExpenseAccountId`, sem `StockMovement` e sem estoque físico. O insumo sai
  do subrazão e do tie-out LAC-E dos dois lados ao mesmo tempo.
- (b) Estoque separado de materiais: `InventoryItem` por (`productRef`, `destination`), numa conta 1.1.6.x. Exige
  mudar o `@@unique` do `InventoryItem` (logo ADR) e um movimento novo de **consumo em serviço**, que não existe
  (V: `STOCK_MOVEMENT_KINDS`). Sem esse movimento, o estoque de insumo só cresce até alguém fazer ajuste manual.
- (c) Mesmo `InventoryItem` da revenda, com a destinação só fiscal. **Errado:** revenda e insumo têm custo
  unitário diferente (créditos diferentes), e o custo médio móvel misturaria os dois, corrompendo o CMV da revenda.
- **Recomendação: (a).** É o único caminho sem mecanismo inexistente. O AP manual já faz a mesma coisa
  (`expenseAccountId` XOR estoque, V). O teto fica declarado: **o salão não controla o físico da tinta de
  insumo**. O upgrade é (b), com ADR e o movimento de consumo, e está no achado A-5.
- **Pendente do contador (P-4):** se, no Presumido/Real, material de serviço relevante deve ser estoque até o
  consumo (CPC 16) e não despesa na entrada.

### F-ID-4 — Crédito de PIS/COFINS do monofásico comprado como insumo (a posição oficial é **fork**, não fato) — ✅ (a) em 2 etapas: (c) até a P-1

- **(a) Posição da RFB:**
  - **Normas:** IN RFB 2.121/2022 art. 160 I e arts. 534/536 § 1º II; SC SRRF04 nº 4.024/2021 (ambas citadas **[ERRATA 10/10 — `docs/plano/PERGUNTAS-DE-LEI-2026-10-10.md` §10.2]** a SC SRRF04 4.024/2021 não trata de monofásico (é alíquota zero de produto hospitalar). Fonte correta: SC Cosit 496/2017 + SC Cosit 16/2024 (vigentes). F-ID-4 → configurável por cliente (D-5, 10/10).
    pelo dono e pelo dossiê D-6 item 4 como lidas em 29/09; **fora do corpus**, NV nesta sessão).
  - **Regra:** compra **a alíquota zero** (do revendedor) **não dá crédito**, mesmo usada como insumo. Compra do
    **fabricante/importador** dá crédito de 1,65% + 7,6%.
  - **Discriminador:** o CST do fornecedor no XML. **02** (alíquota diferenciada, típica do fabricante/importador)
    credita; **04/06** não credita. CST 01 com NCM monofásico não credita e gera warning (conservador).
  - **Grau do discriminador:** "o CST pode indicar o caso" é I. É o dado que o XML tem, e a nota não diz quem é
    fabricante.
- (b) **Leitura do contador (P4):** insumo credita pela alíquota básica, sem olhar o fornecedor. Grau dele:
  "lembrado"; ele disse que "convém solução de consulta". Contraria a posição normativa da RFB, então há risco de
  glosa.
- (c) **Conservador total:** NCM monofásico nunca credita, em qualquer destinação. É o comportamento de hoje e não
  pede código nesse ramo, mas deixa na mesa um crédito que a própria RFB admite.
- **Recomendação: (a), em duas etapas.**
  1. Entra como (c) até a transcrição da P-1 estar no corpus.
  2. Vira (a) no mesmo item 7, com fonte citada por ramo.
  Motivo: (a) é o único caminho que credita onde a norma permite sem contrariar a RFB. (b) cria risco de autuação.
  (c) é seguro, mas perde crédito lícito. **A decisão final depende do contador** (P-1: pergunta reformulada do
  D-6 item 4); este fork só fixa o que o código faz enquanto isso.

### F-ID-5 — Conta de despesa do insumo — ✅ (a)

- **(a) Uma conta por unidade em `FiscalProfile.insumoExpenseAccountId`**, com o código dado pelo contador e 400
  nomeado se faltar. É o padrão F-X6-8 (a).
- (b) Conta por produto, na tabela do F-ID-2.
- (c) Conta por item, informada pelo operador em cada import.
- **Recomendação: (a).** É o menor contrato e segue o precedente do X6. (b) e (c) multiplicam o parâmetro fiscal
  que o contador precisa aprovar (item 0 da triagem / [[GOV-CONTADOR]]). Se o contador pedir granularidade, (b) é
  1 coluna a mais na tabela do F-ID-2.

### F-ID-6 — Item sem override e sem default de produto — ✅ (a)

- **(a) `REVENDA`, com origem `FALLBACK` e warning** no preview e no import.
- (b) 400: toda linha precisa de destinação explícita.
- **Recomendação: (a).** É o comportamento de hoje, logo não quebra o FE atual nem os imports existentes. O
  warning torna a escolha visível (`param-aceito-e-ignorado-e-bug`). (b) quebraria todo import até o FE e os
  defaults existirem.
- **Risco declarado de (a):** num contribuinte de ICMS, um insumo não marcado credita `vICMS` como revenda, que é
  o erro de hoje, agora com aviso.

### F-ID-7 — Notas já importadas — ✅ (a)

- **(a) Não reprocessar** (ACC-018; precedente F-X6-5 a). A correção sai por estorno + reimportação ou por ajuste
  manual.
- (b) Ferramenta de reclassificação retroativa: move valor de 1.1.6 para despesa e acerta créditos. Toca período
  possivelmente fechado e custo médio já consumido pelo CMV.
- **Recomendação: (a).** O 1º cliente é Simples, onde a reclassificação só mexe em estoque × despesa, e não há
  nota de cliente importada em produção (I: os gates de implantação do Bloco A seguem abertos).

### F-ID-8 — Preview — ✅ (a)

- **(a) O preview aceita `itemMappings` opcional** e aplica o **mesmo** resolver e os mesmos `destinos` do import.
- (b) O preview segue sem mapeamento (tudo `REVENDA`) e só avisa que a destinação é assumida.
- **Recomendação: (a).** Com (b), o preview mostraria crédito diferente do que o import lança para cada item de
  insumo, e o operador confirmaria um número que não é o lançado. O custo de (a) é um campo opcional + o decoder
  que já existe.

### F-ID-9 — O override do import atualiza o default do produto? — ✅ (a)

- **(a) Não.** O default só muda pelo `PUT` explícito, sob a policy fiscal e com evento de auditoria.
- (b) Sim: o último override vira o default.
- **Recomendação: (a).** O default é parâmetro fiscal. Em (b), uma escolha pontual de uma nota mudaria o crédito
  das notas seguintes sem registro de decisão, o que contraria a condição do contador (item 0 da triagem:
  "mudança de parâmetro com aprovação registrada").

### Consequência para o ADR (não é fork; decorre dos forks)

O plano pede ADR **se o modelo de Product mudar**. Sob as recomendações (F-ID-2 a, F-ID-3 a), Product (DT) e
`InventoryItem` ficam intactos: só entram uma tabela aditiva e uma coluna nullable. **Os forks deste BRIEF são o
registro de decisão, e não há ADR** (precedente: o BRIEF do X6 foi a emenda do ADR-INCR-NFE). **Se** o dono
escolher F-ID-2 (b) ou F-ID-3 (b), abre-se ADR antes do "executa".

---

## 4. Pendente de validação externa (fonte citada, grau declarado)

| # | Ponto | Por que não entra no checklist como decidido | Quem fecha |
|---|---|---|---|
| **P-1** | Crédito do monofásico usado como insumo (F-ID-4): IN RFB 2.121/2022 art. 160 I, arts. 534 e 536 § 1º II; SC SRRF04 4.024/2021; Lei 10.147 art. 2º | Fontes **fora do corpus**. O dossiê as dá como lidas em 29/09 (V lá; a aplicação ao salão é I). A transcrição exige autorização de download (padrão D-8) e segue a regra `tabela-transcrita-de-lei` (redação vigente) | O dono autoriza o download. O contador responde a pergunta reformulada do D-6 item 4 **[ERRATA 10/10 — `docs/plano/PERGUNTAS-DE-LEI-2026-10-10.md` §10.2]** P-1 respondida pela SC Cosit 496/2017: há crédito (1,65%/7,6%) do insumo monofásico, inclusive comprado de revendedor; o STJ Tema 1093 trata só de revenda. |
| **P-2** | ICMS do insumo de serviço sujeito ao ISS não é recuperável (item 5) | LC 87/96 art. 20 § 1º e art. 33 I **[NC]**, fora do corpus. O contador disse "ICMS uso e consumo" (lembrado). O default do item 5 é o conservador (sem crédito) | Contador |
| **P-3** | "Insumo" no salão para PIS/COFINS (art. 3º II: tintura, química, descartável) | O conceito de insumo (essencialidade/relevância) não está no corpus **[NC]**. O contador disse "crédito básico" (lembrado) | Contador |
| **P-4** | Insumo na despesa na entrada × estoque de materiais até o consumo (F-ID-3), no Presumido/Real | Critério contábil (CPC 16) e materialidade | Contador |
| **P-5** | LC 214 art. 57 I f: bens "estéticos" = uso e consumo pessoal para crédito de IBS/CBS, salvo § 3º III | Fonte citada pelo dono, **não lida nesta sessão** (NV), fora do corpus. Sem efeito aqui: não existe motor de crédito de IBS/CBS, 2026 é ano de destaque sem escrituração, e o 1º cliente fica no DAS (decisão 1). Registrado porque **a destinação `INSUMO_SERVICO` é o fato que a exceção do § 3º III vai pedir** ao PRE-ADR IBS/CBS 2027 | Transcrição (download autorizado) + PRE-ADR da onda 3 |
| **P-6** | CST 01 com NCM monofásico em insumo (sub-regra do F-ID-4 a) | O dado não diz se o emitente é fabricante. A escolha conservadora é sem crédito + warning | Contador |

## 5. Insumos ausentes

- **Resposta do follow-up ao contador (0.8(e) / D-6 item 4):** rascunhada em 26/09 e ainda não enviada (nota
  [[D1]]). A decisão 16 dispensou a espera para planejar; ela continua necessária para ratificar o F-ID-4 com
  segurança.
- **Corpus:** IN RFB 2.121/2022, SC SRRF04 4.024/2021, LC 87/96 e LC 214 art. 57. Nenhuma está em
  `fontes-oficiais/`.
- **HTML das Leis 10.637/10.833:** estão no MANIFEST, mas não no disco deste worktree. A redação do art. 3º II não
  foi relida (item 6 é I).
- **MOC 7.0 Anexo I, campo I08 (CFOP):** está no MANIFEST, mas não no disco. O achado A-1 ficou em I por isso.

## 6. Achados fora de escopo (registrados, não planejados — frente nova exige autorização)

| # | Achado | Grau | Encaminhamento sugerido |
|---|---|---|---|
| **A-1** | **O roteamento de imobilizado do C8 lê o CFOP do XML do fornecedor.** `NfeImportService.ts:64` roteia pelo `prod/CFOP` (I08) = 1551/2551. Numa NF-e emitida pelo fornecedor, o CFOP é o da **saída dele** (5xxx/6xxx). 1551/2551 é o código de **entrada do comprador**, que o XML do fornecedor não traz. O teste mistura 5102 e 1551 na mesma nota (`NfeImportService.test.ts:438-440`), o que uma nota real não teria. Se isso se confirmar, a rota de imobilizado **nunca dispara com XML real**: a máquina cai no `productRef` ou é rejeitada | código V; semântica do I08 **I** (MOC não relido) | **29/09 (2ª), regra lida no oficial:** MOC 7.0 Anexo I, I08-10 (rejeição 518) — "CFOP de Entrada (inicia por 1, 2, 3) para NF-e de Saída (tpNF=1)"; regra **facultativa** (a critério da UF); PDF rebaixado com sha256 igual ao MANIFEST. Teste-guarda `it.failing` em `NfeImportService.test.ts` ("GAP-MAP imobilizado-cfop-do-fornecedor") + linha [ABERTO] no GAP-MAP. A correção inverte o caso "classId em item NÃO 1551 → 400": decisão do dono |
| A-2 | `USO_CONSUMO` (café, limpeza) comprado por NF-e não tem caminho: todo item fora de 1551 exige `productRef` e vira estoque (`NfeImportService.ts:306-317`) | V | Emenda F-ID-1 (b), com autorização própria |
| A-3 | DIFAL do contribuinte de ICMS na compra interestadual de uso e consumo/insumo não é modelado | I | Onda de ICMS (X8) |
| A-4 | Reclassificação posterior (comprado como revenda, usado como insumo) e o estorno de crédito correspondente | I | BRIEF próprio, se o contador pedir |
| A-5 | Estoque físico e valorado de insumo com **consumo por serviço** (movimento novo + ADR): o upgrade de F-ID-3 (b) | V (não existe) | Frente nova |
| A-6 | **Par FE:** seletor de destinação no mapeamento do `NfePanel` + tela de defaults por produto. Sem ele, a feature só é alcançável pela API | V | Nó FE novo (não existe no vault) |
| A-7 | Persistência de crédito **por item** (a regra aplicada a cada item) para o pacote do contador e para o IBS/CBS futuro | V (hoje só totais) | [[C6b]] 3.4 "créditos por nota e item" |
| A-8 | CFOP de entrada para escrituração derivado da destinação (1102 × 1556 × o CFOP de compra para prestação de serviço sujeita ao ISS) | NV | Consumidor futuro: EFD ICMS/IPI (X8) **[ERRATA 10/10 — `docs/plano/PERGUNTAS-DE-LEI-2026-10-10.md` §10.2]** o CFOP da mercadoria usada em prestação de serviço sujeita ao ISS é **1.128/2.128** (Ajuste SINIEF 03/22, tabela vigente desde 01/06/2022), não 1.556. |

## 7. Plano de execução por fatias (para a `sessao-feature`, depois do "executa")

| PR | Itens | Entrega |
|---|---|---|
| PR-1 | 1–15 (sem a origem `PRODUTO`) + 20 | Núcleo, import/preview/AP com **override por item** + `FALLBACK`; conta de insumo no perfil. Funciona ponta a ponta pela API |
| PR-2 | 2 (tabela), 9 (origem `PRODUTO`), 16–19 | Default por produto: CRUD + resolver completo |

O item 7 entra no PR-1 como (c) e só vira (a) depois da P-1 (F-ID-4). Revisor independente por PR, como sempre;
`main` só com OK do dono.

## 8. Gates de envio [OPS-001]

1. **Objetivo, não a letra:** o objetivo é o sistema lançar certo a mesma tinta como revenda ou como insumo nos
   regimes que creditam. A frase que responde está no topo: no Simples o único efeito é estoque × despesa; o
   efeito fiscal é da régua Presumido/Real (F-ID-3 + matriz do §2).
2. **Grau:** todo fato de código traz `arquivo:linha` (V). As normas fora do corpus estão marcadas NV/[NC] (§4).
   Os itens 5, 6 e 7 dizem o grau da fonte.
3. **Caso adversarial tentado:** *"basta a destinação ser só fiscal, no mesmo estoque"* (F-ID-3 c). Falha porque
   revenda e insumo têm custo unitário diferente, e o custo médio móvel os misturaria. Isso levou à recomendação
   (a). O 2º caso, *"o CFOP do XML já diz a destinação"*, falha porque o CFOP é o do emitente, e isso gerou o
   achado A-1 contra o C8.
4. **Checagem que teria falhado:** o item 4 exige a saída **idêntica** à de hoje sem `destinos` (igualdade
   profunda), e o item 14 exige preview = import com o mesmo mapeamento. Um resolver divergente, ou um ramo
   `REVENDA` alterado sem querer, fica vermelho.
5. **Duas primeiras linhas:** o cabeçalho diz que este documento não é código, que os 9 forks foram ratificados na recomendação em 29/09 (sem "executa") e que
   o 1º cliente (Simples) só sente o efeito em estoque × despesa.
6. **Meus vieses (T8):** (i) tendência a confirmar a posição da RFB porque ela veio pronta no pedido do dono. Por
   isso ela está como fork, com a leitura do contador ao lado. (ii) O achado A-1 é inferência sobre o C8 feita por
   uma sessão de outro nó e precisa de XML real antes de virar defeito.

---

## EMENDA 29/09 — imobilizado vira destinação declarada (achado A-1)

**Autorização:** dono, chat, 29/09: *"Fazer do imobilizado uma destinação declarada, no mesmo modelo do ITEM-DESTINATION."*
Sem "executa". Substitui o roteamento por CFOP do C8 (F-FA12 a, `NfeImportService.ts:64,268,300-305`), que é
inalcançável com XML de fornecedor (MOC 7.0 Anexo I, I08-10; teste-guarda `it.failing` "GAP-MAP imobilizado-cfop-do-fornecedor").

21. **`ITEM_DESTINATIONS` ganha `IMOBILIZADO`.** O enum passa a ser `REVENDA | INSUMO_SERVICO | IMOBILIZADO`.
22. **O `classId` do operador é a declaração.** Item mapeado com `classId` tem destinação `IMOBILIZADO`, origem
    `OVERRIDE`, qualquer que seja o CFOP. `destination: 'IMOBILIZADO'` sem `classId` → 400; `classId` com
    `destination` diferente de `IMOBILIZADO` → 400. O `productRef` segue para `REVENDA`/`INSUMO_SERVICO`.
23. **O CFOP deixa de rotear.** `FIXED_ASSET_CFOPS` sai do caminho de decisão. Um CFOP 1551/2551 no XML (nota de
    entrada própria) mapeado com `productRef` passa a gerar só **warning** ("CFOP de imobilizado mapeado como
    estoque/insumo — confira"), nunca a rota.
24. **Testes:** o `it.failing` do GAP-MAP vira `it`; o caso "classId em item NÃO 1551 → 400" é **invertido**
    (vira aceito); "CFOP 1551 com productRef → 400" vira aceito + warning; o fixture "nota mista" deixa de
    misturar 5102 e 1551 (usa 5102 nos três itens).
25. **Default por produto** (F-ID-2): `IMOBILIZADO` **não** entra como default de produto, porque o imobilizado
    precisa da classe, que não é do produto. O default aceita só `REVENDA | INSUMO_SERVICO`.
26. **Preview/resposta:** `destinacoes[]` mostra `IMOBILIZADO` com `origem: OVERRIDE`.

**Efeito sobre os forks ratificados:** F-ID-1 (a) foi ampliado pelo dono com `IMOBILIZADO`; o resto segue.
A mudança toca o contrato do C8 (F-FA12), mas não o modelo de `FixedAsset`: continua sem ADR.
**Entrega:** entra no PR-1 da §7 (é o mesmo `allocate`).
