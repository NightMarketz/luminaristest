# BRIEF — BE-INCR-INVENTORY-TIEOUT (LAC-E)

> Produzido em sessão de planejamento, 2026-09-02. **FORKS RATIFICADOS 2026-09-02** — dono, nesta
> sessão: "ratifico todas as recomendações dos forks". Cada fork abaixo vale na recomendação.

## Contexto fixo

- **Item:** LAC-E — visibilidade físico×contábil de estoque. `ACCOUNTING-MASTER-MAP.md` §5.1,
  linha **LAC-E**; `PROXIMOS-PASSOS-2026-09-01.md` faixa paralela. Sem dependência de gate;
  termômetro da LAC-D.
- **Autorização:** dono, 2026-09-01 (posição na fila) + 2026-09-02 ("planeja todos os LAC").
- **Insumos existentes:**
  - `TieOutDiagnosticService.ts`: enum fechado `TieOutCheckId = 'receivables'|'payables'|'pos_receivable'`;
    5 deps no construtor; reads paralelos em `Promise.all`; `buildCheck` com igualdade inteira exata;
    `status` agregado por `every(balanced)`. Rota `GET /api/accounting/reports/tie-out` já existe
    (**nenhuma rota nova** ⇒ guard de path-count do openapi não muda).
  - `InventoryService`: `reconcileInventory(scope)` compara snapshot × Σ movimentos e **repara**
    (log warn) — **zero chamadores de produção**; `listInventory/getInventoryItem` sem superfície
    HTTP (diferido por decisão, ADR-INCR-INVENTORY §D3 — este BRIEF NÃO cria rota de inventário).
  - Job `accountingSyncReconcile.job.ts`: 8 passadas com padrão `XDeps` injetado + `ReconcileSummary`;
    watermark congela se `failed>0` (F-W2F-4); precedente de check **warn-only fora do merge**:
    `reconcilePackageBalanceVsLiability` → `{checked, divergences}`, não entra no `reduce` e não
    segura o watermark.
  - Físico: `productUnits.stock` por (productId, unitId), mantido por `StockMovementsApplyPlugin`.
    Contábil: `InventoryItem.qtyOnHand/totalValueCents` por `productRef` (= `String(productId)` da
    DynamicTable, conforme `sync/bridges/saleItems.ts:79`).
  - `CreatePayableSchema` aceita `inventoryProductRef: z.string().min(1)` — **string livre**, sem
    validar existência (typo ⇒ camada de custo órfã que o CMV da venda nunca encontra).
  - Leitura de DynamicTable por serviço de integração é padrão aceito (bridges usam
    `findTableByInternalName`); a proibição do §2.1 é injetar serviço Prisma NO MOTOR, não o inverso.
  - Guarda de PII: eventos de auditoria de payable/receivable têm allowlist testada (#255/#258) —
    nenhum campo novo de payload de auditoria neste incremento.
- **Nós vizinhos:** `PayableService` (consome `inventoryProductRef` — item 4 toca a validação dele);
  consumidor FE do tie-out (ver Insumo ausente 1); LAC-D (consumirá este termômetro).

## Checklist numerado de comportamentos

1. **Check `'inventory'` no tie-out:** novo membro em `TieOutCheckId`; dep novo no construtor
   (repositório de inventário) via Factory; `subledgerCents = Σ InventoryItem.totalValueCents`
   (itens ativos do escopo) × `ledgerCents = debitBalance(1.1.6)` (Asset, sentido natural);
   `detail` explicando a comparação; 8º read no `Promise.all`; push em `checks`. Reusar a constante
   existente do código `1.1.6` (a mesma que `PayableService.recognitionDebitCode` usa — não
   redefinir literal). Testável: unit com fixture de naturezas mistas (memória
   `bp-dre-diagnostics-test-must-mix-natures`) — balanced e divergente.
2. **Passada warn-only físico×contábil no job:** `reconcilePhysicalInventoryDeps` +
   `reconcilePhysicalInventory(deps)` comparando, por produto do escopo, a soma física
   (Σ `productUnits.stock` das unidades) × `qtyOnHand` do subledger; retorna
   `{checked, divergences}`; chamada com `await` **fora** do `mergeSummaries` (não incrementa
   `failed`, não congela watermark — precedente exato citado nos insumos). Divergência ⇒
   `logger.warn` com productRef e os dois números. Testável: unit da passada com deps fake;
   teste de que divergência NÃO altera o summary mergeado.
3. **Chamador para `reconcileInventory`** (subledger consigo mesmo, reparador): conforme fork
   **F-E1**. Se ratificado (a): chamada no início da passada do item 2, best-effort com try/catch
   isolado. Testável: job test asserindo a invocação.
4. **Validação de `inventoryProductRef` contra a tabela `products` do tenant** no
   `PayableService.createPayable` (braço de inventário): ref inexistente ⇒ `ValidationError` (400)
   ANTES de qualquer escrita (tx1 inclusive). Mecânica conforme fork **F-E2**. Testável: teste de
   serviço com ref válida (passa) e typo (400, nada persistido).
5. **Zero rotas novas, zero eventos de auditoria novos** — o guard de path-count e a allowlist do
   `auditCanonical` não mudam (checável no diff).
6. **Cadeia de camadas respeitada:** deps novos entram via Factory; nenhum `new` de repo em serviço
   de feature (memória `orchestration-service-tx-repo-smell`); leituras da passada com repo
   injetado, nunca `prisma` direto no job.

## Contratos esboçados

```ts
// TieOutDiagnosticService
export type TieOutCheckId = 'receivables' | 'payables' | 'pos_receivable' | 'inventory';
// check 'inventory': { controlAccountCode: '1.1.6', subledgerCents: string, ledgerCents: string,
//   differenceCents: string, balanced: boolean, detail: 'Σ InventoryItem.totalValueCents (ativos) vs saldo devedor 1.1.6.' }

// Job — nova passada (warn-only, fora do merge)
export interface ReconcilePhysicalInventoryDeps {
  listSubledgerItems(scope: AccountingScope): Promise<Array<{ productRef: string; qtyOnHand: number }>>;
  sumPhysicalStockByProduct(scope: AccountingScope): Promise<Map<string /*productRef*/, number>>;
  reconcileSubledger?(scope: AccountingScope): Promise<{ itemsChecked: number; itemsRepaired: number }>; // se F-E1=(a)
}
export async function reconcilePhysicalInventory(deps, scope): Promise<{ checked: number; divergences: number }>
```

## Forks — RATIFICADOS 2026-09-02 (todas as recomendações acolhidas)

- **F-E1 — `reconcileInventory` (reparador) roda no job?** (a) sim, no início da passada — a função
  já é conservadora (recomputa do log append-only), idempotente e logada; (b) não — só o check warn,
  reparo manual sob demanda. **Recomendação: (a).** **RATIFICADO 2026-09-02 (recomendação).**
- **F-E2 — validação do `inventoryProductRef`:** *(o quê)* (a) rejeitar 400; (b) warn-only e criar
  mesmo assim; (c) status quo. **Recomendação: (a)** — classe "typo silencioso cria camada órfã".
  *(onde)* (i) no `PayableService` via port fino de leitura DT (padrão das bridges) injetado pela
  Factory; (ii) no controller. **Recomendação: (i)** — a regra pertence ao serviço, e teste de
  serviço a cobre. **RATIFICADO 2026-09-02 (recomendação).**
- **F-E3 — granularidade da comparação física×contábil:** o subledger é por `productRef` (sem
  unidade); o físico é por (produto, unidade). (a) comparar agregado por produto (Σ unidades);
  (b) evoluir o subledger para granularidade por unidade (mudança de modelo — MUITO maior).
  **Recomendação: (a)** — espelha o desenho atual do subledger; (b) é frente nova. **RATIFICADO 2026-09-02 (recomendação).**

## Pendente de validação externa

— (vazia; comparações internas, nenhuma regra fiscal nova).

## Insumos ausentes

1. **Consumidor FE do tie-out:** se a tela renderiza checks por `id` com label i18n, o check novo
   exige par pt/en; se renderiza `detail` cru, nada. Confirmar o componente na implementação —
   pausa localizada (não bloqueia o BE).
2. **Shape exato de `InventoryItem`** (campo de soft-delete/ativo para o filtro do item 1) —
   confirmar no `schema.prisma` na implementação.

## Achados fora de escopo

- Rota `/api/inventory/*` (diferida por ADR — reabrir exige decisão do dono).
- Reconciliação de VALOR físico (o físico não tem valor confiável — o `cost` float é justamente a
  LAC-D); esta passada compara QUANTIDADE.
- Granularidade por unidade no subledger (F-E3 caminho b).
