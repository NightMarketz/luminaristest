# BRIEF — FE-INCR-PURCHASE-VALUATION (LAC-D)

> Produzido em sessão de planejamento, 2026-09-02. **FORKS RATIFICADOS 2026-09-02** — dono, nesta
> sessão: "ratifico todas as recomendações dos forks". **Consequência estrutural do F-D2=(b):** o
> incremento ganhou o irmão BE — [BE-INCR-PURCHASE-PHYSICAL-SYNC-brief.md](BE-INCR-PURCHASE-PHYSICAL-SYNC-brief.md)
> — que deve ser executado ANTES desta metade FE (o fluxo físico é pré-requisito do bloqueio do
> MovementModal, F-D1).

## Contexto fixo

- **Item:** LAC-D — valoração da compra pela tela. `ACCOUNTING-MASTER-MAP.md` §5.1, linha **LAC-D**;
  `PROXIMOS-PASSOS-2026-09-01.md` §1 item A2 (**antes do M2**). Reabre formalmente o diferimento
  "CRUD de estoque" com motivo novo (distorção silenciosa receita-sem-CMV, não dupla valoração).
- **Autorização:** dono, 2026-09-01 (posição na fila) + 2026-09-02 ("planeja todos os LAC").
- **Insumos existentes:**
  - Backend COMPLETO e testado: `CreatePayableSchema` com XOR duro (`expenseAccountId` ⊕
    `inventoryProductRef`+`inventoryQty`; par meio-preenchido rejeitado nomeando o campo);
    `PayableService.createPayable` ordem exata: policy → tx1 (counterparty + linha OPEN + audit) →
    tx2 postEntry **D 1.1.6 × C 2.1.2** (compensação em falha) → `receiveStock` best-effort
    (idempotente por `sourceId=payableId`; `reconcilePayables` re-dirige). Cancel simétrico com CAS
    que recusa `qtyOnHand` negativo. Fiação `InventoryService`→`PayableService` já ligada na Factory.
  - FE atual: `CreatePayablePayload` exige `expenseAccountId: string` (o tipo **não expressa** a
    compra); `CreatePayableModal` sempre envia `expenseAccountId` (`:112-122`) e o exige em
    `isValid`; tipo `Payable` não tem os campos de inventário. `createPayable` do service é
    passthrough (não muda).
  - Tela de estoque: `MovementModal` grava linha DT `stockMovements` (custo float em reais,
    `sourceType:'UI_INVENTORY_MANAGER'`); `StockMovementsApplyPlugin` aplica delta em
    `productUnits.stock` e valida Purchase (supplier + cost>0) — o cost **morre no JSON**.
    `receiveStock` é subledger-only: **não** toca `productUnits.stock`.
  - ADR-INCR-INVENTORY: Payable = origem única de valoração; superfície CRUD de estoque diferida.
  - Guarda PII (#255/#258): `payable.created` tem allowlist testada — nenhum campo novo de auditoria.
  - Memória `smoke-gate-s6-x-migracao-de-dado`: backfill é migração de dado com gate próprio.
- **Nós vizinhos:** LAC-E (termômetro — o tie-out 1.1.6 e a passada warn medem o antes/depois deste
  incremento); `useInventoryData` (consome movimentos); plugin `ProductAutoStockPlugin`/
  `UnitAutoStockPlugin` (auto-criação de `productUnits` — ver Insumo ausente 1).

## Checklist numerado de comportamentos

1. **Tipos do client:** `CreatePayablePayload.expenseAccountId` vira opcional; +
   `inventoryProductRef?: string`, `inventoryQty?: number`; tipo `Payable` ganha os dois campos e
   `expenseAccountId: string | null`. Testável: unit do service (payload de estoque não carrega
   `expenseAccountId` — o `.strict()`+XOR do servidor é o falsificador).
2. **`CreatePayableModal` com modo "Despesa | Compra de estoque":** modo estoque troca o seletor de
   conta por (produto — dropdown da tabela `products` do tenant — e quantidade int > 0);
   `isValid` implementa o XOR na UI (par meio-preenchido inalcançável); `amountCents` continua o
   TOTAL da compra (rótulo claro — memória do footgun `parseBrl` 100×). Testável: render + submit
   nos dois modos.
3. **Exibição do payable de inventário** (listagem/detalhe da aba Contas a Pagar): mostra
   produto + quantidade onde o de despesa mostra conta. Testável: fixture com os dois tipos.
4. **Destino do `MovementModal` em `reason='Purchase'`** — conforme fork **F-D1**.
   Se (a): opção Purchase desabilitada/removida com texto explicativo + atalho "registrar em
   Contas a Pagar"; plugin BE mantém a validação como defesa em profundidade (sem mudança BE).
5. **Entrada FÍSICA da compra valorada** — conforme fork **F-D2** (obrigatório resolver junto de
   F-D1: se a tela de estoque bloqueia Purchase e nada mais cria o movimento físico, a compra
   valorada não aparece no estoque da tela).
6. **i18n pt/en** de todas as strings novas; **build de produção** (withAuth).
7. **Instrumentação (sessão própria):** teste-guarda que falha hoje — o modal AP não consegue
   emitir payload de inventário (tipo não permite) — e o teste do fluxo físico conforme F-D2.

## Contratos esboçados

```ts
// my-app/lib/services/accountsPayable.service.ts (delta)
interface CreatePayablePayload {
  unitId: string; supplierName: string; description: string;
  issueDate: string; dueDate: string; amountCents: number;
  supplierRef?: string; counterpartyId?: string; documentNumber?: string; attachmentId?: string;
  expenseAccountId?: string;            // ← era obrigatório
  inventoryProductRef?: string;         // ← novo (XOR com expenseAccountId, os dois juntos)
  inventoryQty?: number;                // ← novo
}
interface Payable { /* ...campos atuais... */ expenseAccountId: string | null;
  inventoryProductRef: string | null; inventoryQty: number | null; }
```

## Forks — RATIFICADOS 2026-09-02 (todas as recomendações acolhidas)

- **F-D1 — destino do `MovementModal` em `reason='Purchase'`** *(o fork central da lacuna)*:
  (a) **bloquear** na tela com aviso + atalho para Contas a Pagar — coerente com o ADR (Payable =
  origem única de valoração), menor diff, zero ambiguidade contábil;
  (b) **criar o Payable automaticamente** junto do movimento — uma tela, duas escritas; exige
  endpoint orquestrador de integração (nível controller, §2.1) e decisão de idempotência entre as
  escritas; vira meio-BE.
  **Recomendação: (a) neste incremento**; (b) registrado como evolução de UX futura. **RATIFICADO 2026-09-02 (recomendação).**
- **F-D2 — quem dá a entrada FÍSICA quando a compra entra pelo Payable:**
  (a) usuário registra movimento físico separado (reason distinto) — duas ações manuais, feio e
  esquecível (recria a dessincronia no sentido oposto);
  (b) **o fluxo do Payable de inventário também cria o movimento físico DT** (integração no nível
  serviço/controller — permitido pelo §2.1; idempotente por `sourceId=payableId`; cancel do payable
  reverte o físico junto) — exige incremento BE irmão (`BE-INCR-PURCHASE-PHYSICAL-SYNC`), pois este
  BRIEF é FE-only;
  (c) o FE faz as duas chamadas (payable + movimento com `sourceType` novo que o plugin aceite sem
  re-exigir cost/supplier) — sem atomicidade, órfãos possíveis em falha parcial.
  **Recomendação: (b)** — atomicidade e idempotência no lugar certo; se ratificado, abrir o BRIEF
  irmão BE (nova sessão de planejamento, já coberta pela autorização da LAC-D? **não** — registrar
  como frente adjacente que precisa de um "sim" explícito do dono ao caminho (b)). **RATIFICADO 2026-09-02 (recomendação).**
- **F-D3 — payables de inventário na conciliação/aging:** nada muda (mesma 2.1.2, mesmos fluxos de
  pagamento) — confirmar que NENHUM tratamento especial é desejado. **Recomendação: nenhum.**
  PENDENTE (barato de ratificar).

## Pendente de validação externa

— (vazia; o posting D 1.1.6 × C 2.1.2 e a média móvel já foram ratificados no ADR-INCR-INVENTORY;
nenhuma regra fiscal nova).

## Insumos ausentes

1. **Produto sem `productUnits` na unidade** (produto novo nunca movimentado): confirmar se
   `ProductAutoStockPlugin`/`UnitAutoStockPlugin` auto-criam a linha antes do movimento físico do
   F-D2 — determina se o fluxo físico precisa de passo de bootstrap. Pausa localizada no F-D2.
2. **Backfill dos produtos já entrados sem valoração** — fora deste incremento por decisão da
   emenda (migração de dado, classe S6, gate próprio); registrado aqui para não se perder: exigirá
   decisão do dono sobre valorar a que custo (último conhecido × informado à mão).

## Achados fora de escopo

- Endpoint orquestrador "compra" unificado (`POST /api/purchases`) — só se F-D1=(b).
- NF-e de compra pré-preenchendo o Payable (item 11 do Bloco B — travado no XML real; este
  incremento é o degrau manual que a NF-e automatizará).
- Qualquer mudança no `StockMovementsApplyPlugin` além de defesa em profundidade.
