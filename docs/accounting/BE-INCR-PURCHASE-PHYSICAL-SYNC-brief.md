# BRIEF — BE-INCR-PURCHASE-PHYSICAL-SYNC (metade BE da LAC-D, nascida do F-D2=(b))

> Produzido em sessão de planejamento, 2026-09-02, imediatamente após a ratificação
> ("ratifico todas as recomendações dos forks") que acolheu o **F-D2 caminho (b)** do
> [FE-INCR-PURCHASE-VALUATION-brief.md](FE-INCR-PURCHASE-VALUATION-brief.md) — o "sim" explícito
> que este BRIEF exigia. **Executar ANTES da metade FE** (o bloqueio do MovementModal, F-D1,
> pressupõe este fluxo de pé). **F-PS1/F-PS2 RATIFICADOS 2026-09-02** — dono, nesta sessão:
> "ratifico F-PS1 e F-PS2 nas recomendações".

## Contexto fixo

- **Item:** sincronização física da compra — quando um Payable de inventário é criado, o estoque
  FÍSICO (`productUnits.stock`, via linha em `stockMovements`) sobe junto; no cancelamento, reverte.
  Pertence à LAC-D (`ACCOUNTING-MASTER-MAP.md` §5.1, linha LAC-D, antes do M2).
- **Autorização:** cadeia citável — posição na fila (dono, 2026-09-01) → "planeja todos os LAC"
  (2026-09-02) → ratificação do F-D2=(b) (2026-09-02, mesma sessão).
- **Insumos existentes:**
  - `PayableService.createPayable`: ordem tx1 (linha OPEN + audit) → tx2 (postEntry D 1.1.6 ×
    C 2.1.2, com compensação) → `receiveStock` best-effort (subledger, idempotente por
    `sourceId=payableId`); `cancelPayable` → `reverseStockForReceipt` com CAS anti-negativo.
    `reconcilePayables` re-dirige o que falhar.
  - `StockMovementsApplyPlugin`: aplica delta em `productUnits.stock` no create/update/delete de
    linha `stockMovements`; **early-return para `sourceType === 'SALE'`** (precedente exato de
    sourceType de sistema); para `reason='Purchase'` re-exige `supplierId`+`cost` (validação de
    entrada manual — que o F-D1 vai bloquear na tela).
  - Contrato §2.1: integração cross-módulo NUNCA dentro do motor DynamicTable; serviço de
    integração/controller pode LER e ESCREVER DynamicTable via `DynamicTableService` (precedente:
    `RegisterPaymentService` escreve venda com `isSystem`).
  - `ProductAutoStockPlugin`/`UnitAutoStockPlugin` existem (auto-provisão de `productUnits` — ver
    Insumo ausente 1).
  - Guarda PII (#255/#258): allowlist de `payable.created` — nenhum campo novo de auditoria.
- **Nós vizinhos:** metade FE (`FE-INCR-PURCHASE-VALUATION` — consome este fluxo); LAC-E
  (`reconcilePhysicalInventory` warn-only passa a enxergar este fluxo fechando a divergência);
  `MovementModal` (será bloqueado para Purchase pelo F-D1 — este BRIEF é o substituto).

## Checklist numerado de comportamentos

1. **Port de integração** `PhysicalStockSyncPort` (interface fina) injetado no `PayableService`
   pela Factory — implementação sobre `DynamicTableService` (escrita `isSystem`), NUNCA repo/prisma
   direto, NUNCA dentro do motor de plugins. Testável: unit do serviço com port fake.
2. **No create do Payable de inventário**, após o `receiveStock` (mesmo estágio best-effort):
   criar linha em `stockMovements` com `{ productId: inventoryProductRef, unitId (do payable),
   type:'In', quantity: inventoryQty, date, reason:'Purchase', sourceType:'ACCOUNTING_PAYABLE',
   sourceId: payableId }` — o plugin aplica o delta físico. Falha aqui é `logger.warn`, nunca
   desfaz o payable/razão (mesma semântica do `receiveStock`). Testável: integração
   payable→movimento→`productUnits.stock` incrementado.
3. **Idempotência read-first:** antes de criar, buscar movimento existente com
   `(sourceType:'ACCOUNTING_PAYABLE', sourceId: payableId)`; existente ⇒ no-op.
   `unique` de DynamicTable é TOCTOU (memória `dynamictable-money-and-uniqueness-limits`) — o
   read-first cobre o retry do reconcile; corrida residual de request duplo simultâneo fica
   registrada como teto conhecido (`ponytail:` comment no código). Testável: dupla chamada ⇒ um
   movimento.
4. **`StockMovementsApplyPlugin`:** early-return da validação de Purchase manual quando
   `sourceType === 'ACCOUNTING_PAYABLE'` (espelho do early-return de `'SALE'`) — o dado já nasce
   valorado no razão; o plugin segue aplicando o delta. Testável: unit do plugin.
5. **No `cancelPayable` de inventário**, após `reverseStockForReceipt`: reversão física conforme
   fork **F-PS1**; mesma idempotência read-first (`sourceId: payableId + ':reversal'`). Testável:
   cancel ⇒ estoque físico volta; cancel duplo ⇒ uma reversão.
6. **Passada no job de reconcile** (`reconcilePayables` estendida ou passada irmã): payable de
   inventário postado+recebido sem movimento físico ⇒ re-dirige o movimento (usa a idempotência
   do item 3). Testável: fixture com movimento faltante.
7. **Zero rotas novas, zero eventos de auditoria novos** (path-count e allowlist inalterados);
   cadeia de camadas via Factory; tsc limpo.

## Contratos esboçados

```ts
export interface PhysicalStockSyncPort {
  recordPurchaseInbound(scope: AccountingScope, p: { productRef: string; unitId: string;
    qty: number; payableId: string; occurredAt: Date }): Promise<'created' | 'already-exists' | 'skipped'>;
  reversePurchaseInbound(scope: AccountingScope, p: { payableId: string }): Promise<'reversed' | 'already-reversed' | 'not-found'>;
}
// Linha DT criada: { productId, unitId, type:'In', quantity, date, reason:'Purchase',
//   sourceType:'ACCOUNTING_PAYABLE', sourceId: payableId }  // sem cost/supplier — ver F-PS2
```

## Forks — RATIFICADOS 2026-09-02 (recomendações acolhidas)

- **F-PS1 — forma da reversão física no cancel:** (a) **contra-movimento** (`type:'Out'`,
  `sourceId: payableId+':reversal'`) — preserva o histórico físico como log verdadeiro, espelha o
  estorno contábil (que nunca apaga lançamento); (b) delete do movimento original (o
  `beforeDelete` do plugin reverte o delta) — menos linhas, mas apaga história.
  **Recomendação: (a)** — consistente com a filosofia append-only de todo o resto do sistema.
  **RATIFICADO 2026-09-02 (recomendação).**
- **F-PS2 — campos informativos no movimento físico:** gravar `cost` (reais, derivado de
  `amountCents/100`) e `supplierId` (da counterparty) para exibição na tela de estoque?
  (a) sim, informativo (fonte de verdade continua o razão); (b) não — movimento seco, tela busca
  contexto pelo payable. **Recomendação: (a)** — a tela de movimentos já exibe essas colunas; vazio
  pareceria regressão. RATIFICAÇÃO PENDENTE.

## Pendente de validação externa

— (vazia).

## Insumos ausentes

1. **Auto-provisão de `productUnits`** para produto sem linha na unidade (compra de produto novo):
   confirmar se `ProductAutoStockPlugin`/`UnitAutoStockPlugin` cobrem o caminho do create de
   movimento ou se o port precisa de passo de bootstrap. Pausa localizada nos itens 2/5.
2. **Shape exato do write `isSystem` em `stockMovements`** (colunas readOnly?): confirmar no
   módulo antes de fixar o payload.

## Achados fora de escopo

- Atualização de custo médio FÍSICO (não existe custo físico confiável — o valor é do subledger).
- Compra multi-item num único payable (o braço XOR atual é mono-produto; multi-item é a NF-e,
  Bloco B item 11).
- Qualquer UI (é a metade FE, BRIEF irmão).
