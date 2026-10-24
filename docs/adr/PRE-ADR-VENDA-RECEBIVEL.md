# PRE-ADR-VENDA-RECEBIVEL — Venda parcelada, pagamento misto, sinal, estorno, régua e compensação

- **Data:** 2026-10-22
- **Status:** **Proposed**. Os forks F-VR-0..19 estão todos **PENDENTES**. Nenhum código autorizado sem "executa".
- **Autorização:** dono, chat, 2026-10-22: *"Autorizo só as de planejamento"*. A frase foi repassada pela sessão
  coordenadora, que abriu quatro sessões de planejamento (esta, fechamento contábil, folha e devolução). Cobre **este
  PRE-ADR**. Não cobre BRIEF, código nem `executa`, e nenhum fork se ratifica aqui.
- **Passo 1 (a autorização cobre o item?):** cobre. Os seis itens já aparecem como propostos na
  [`PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20`](../plano/PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md): §3.1, §4/F2
  (`TESOURARIA`, `REGUA-COBRANCA`) e §4b.1 (`VENDA-PARCELADA`, `PAGAMENTO-MISTO`, `ESTORNO-PAGAMENTO`). Também estão
  na seção F2 da [`FILA-ORDEM`](../plano/FILA-ORDEM.md). Nenhum tem nota em `docs/plano/nos/`: pela regra do vault, um
  nó só nasce depois de PRE-ADR ratificado. **Divergência registrada:** a lacuna 5 (sinal) e a lacuna 4 (compensação)
  não têm nó próprio. A proposta põe as duas dentro de `TESOURARIA`, e o F-VR-19 decide onde ficam.
- **Autor:** `sessao-planejamento` (agente). Os forks são do dono.
- **Base:** `origin/main` = `672031c5`.
- **Dossiê legal:** [`pesquisas-legais/venda-recebivel/relatorio.md`](../../pesquisas-legais/venda-recebivel/relatorio.md)
  (D01–D06; citado como [Dnn]).

## TLDR

**Em duas linhas.** A venda do salão **não vira título de AR**. Ela é lançada direto em `1.1.2.01 A Receber`, e o
ADR-INCR-AR proibiu levá-la ao subrazão `Receivable` para não contar duas vezes. Como a cobrança do Mercado Pago, o
aging, a régua e a compensação só funcionam sobre `Receivable`, **o primeiro passo das seis lacunas é reabrir essa
fronteira** (F-VR-0, decisão arquitetural com emenda ao ADR-INCR-AR). O risco principal é o estorno: hoje o
`CollectionCharge` já recebe `CHARGED_BACK`/`REFUNDED` do provedor **sem efeito no razão**, então o caixa mostra
dinheiro que já voltou ao cliente.

Ordem proposta (§9): **parcelada (com a costura venda → título) → pagamento misto e crédito do cliente → sinal →
estorno → régua → compensação.**

---

## 0. O que foi medido (grau: **V** = li o arquivo · **I** = inferido · **A** = assumido)

| # | Fato | Grau | Onde |
|---|---|---|---|
| M1 | A venda é linha de DynamicTable (`sales`). Finalizar lança `D 1.1.2.01 / C 3.1(+3.3)` (`sale.finalized`). Pagar lança `D <conta do meio> / C 1.1.2.01` (`sale.settled`). | V | `server/src/features/accounting/sync/mappers/SaleSettledMapper.ts:7-21`, `bridges/SaleSettlementBridge.ts:51-150` |
| M2 | **Um meio por venda:** o mapper lê só `event.paymentMethod` e escolhe uma conta de débito em mapa fechado (`Cash`, `Pix`, `Debit Card`, `Credit Card`, `Package Balance`). O valor liquidado é sempre `totalAmount` inteiro. | V | `SaleSettledMapper.ts:37-43, 70-100`; `SaleSettlementBridge.ts:76-91` |
| M3 | O preset tem `paymentStatus ∈ {Paid, Pending}`. Não existe "parcial". | V | `presets/fields/select/SelectPresets.ts:48-54` |
| M4 | O preset de venda tem `paymentTermDays` (um prazo só) e campos `paidAt`/`paidByUserId`/`paymentReference`/`paidWithPackageId`, que só o `RegisterPaymentService` escreve, com `isSystem`. | V | `presets/modules/finance/SalesModule.ts:35, 137-170`; `features/sales/services/RegisterPaymentService.ts:12-29` |
| M5 | **A venda do salão nunca cria `Receivable`.** `createReceivable` só é chamado pelo controller manual, pelo `CrmReceivableBridge` e pelo seed. | V | `grep createReceivable server/src` → `receivableController.ts:31`, `CrmReceivableBridge.ts:125`, `seedAccountingFixtureCli.ts:386` |
| M6 | O ADR-INCR-AR decidiu que o AR formal é **só** para título avulso: lançar AR de venda do salão "a contabilizaria em dobro". Por isso o AR usa uma conta própria, `1.1.2.03 Clientes a Receber`. | V | `docs/adr/ADR-INCR-AR-accounts-receivable.md:42-48`; `fixtures/ChartOfAccountsFixture.ts:210-216` |
| M7 | `CollectionCharge.receivableId` é obrigatório. **Hoje não há como emitir boleto ou Pix do MP para uma venda do salão.** | V | `server/prisma/schema.prisma:2771-2780` |
| M8 | O AR formal já aceita **recebimento parcial** (`receivedCents`, `PARTIALLY_RECEIVED`, SUM-CAS), recibo `CANCELLED` com estorno e `kind = DISCOUNT`. | V | `schema.prisma:1217-1278`; `services/ReceivableService.ts:219-267`; `models/BankSettlement.model.ts:70` |
| M9 | `installment` = 0 arquivos no backend. "parcela" aparece só em AP e no cálculo de tributos. | V | `grep -ril installment server/src server/prisma/schema.prisma` → vazio |
| M10 | **Chargeback e reembolso já chegam como status**: `CollectionCharge.status` tem `PARTIALLY_REFUNDED`, `CHARGED_BACK` e `REFUNDED`, mapeados do MP. Por decisão PP-D5, nenhuma transição gera lançamento nem mexe no recibo. | V | `models/CollectionCharge.model.ts:13-34, 72-91`; `schema.prisma:2768-2770`; `services/CollectionChargeService.ts:416-445` |
| M11 | O ADR do F5 deixou anotado: "o F7 não estorna recibo confirmado" (refund/chargeback no relatório de liberação). | V | `docs/adr/ADR-INCR-PAYMENT-PROVIDER-COLLECTION.md:376` |
| M12 | O único adiantamento de cliente é o pacote pré-pago (`2.1.1.01`, `CustomerPackageBalance` por cliente × pacote, com validade). | V | `schema.prisma:1049-1066`; `ChartOfAccountsFixture.ts:57-58` |
| M13 | `Counterparty.type ∈ {SUPPLIER, CUSTOMER}`, com unicidade por tipo: o mesmo CNPJ como fornecedor e como cliente são **duas** identidades sem vínculo. | V | `schema.prisma:1384-1402` |
| M14 | As contas de mora já existem: `3.5.1 Juros de Mora Recebidos`, `3.5.2 Multas de Mora Recebidas`, `4.3.3 Descontos Concedidos`. **Não existem** conta de adiantamento genérico de cliente, de recebível em contestação nem de perda com crédito. | V | `ChartOfAccountsFixture.ts:28-135, 254-263` |
| M15 | A comissão de empregado CLT entra no razão **só pela folha** (F-FOL-6 a, proposto). A comissão de parceiro vai para AP pelo `TESOURARIA`. | I (nota da sessão irmã) | `side-session-notes/.../folha-contabil.md` item 3 |
| M16 | O motor DynamicTable faz tabela filha por campo `relation`. O precedente é `saleItems.saleId` → `sales`. Também existe o tipo `json`. | V | `dynamicTables/models/DynamicTable.model.ts:28`; `presets/modules/finance/SalesItemsMixed.ts:2, 48-50` |
| M17 | O modal Nova Venda **sempre** cria a venda `Pending`, com um `paymentMethod` e `paymentTermDays`. O pagamento é registrado depois pelo `SalePaymentModal`, que manda **um** meio. | V | `my-app/.../hooks/sales/useSalesCreateForm.ts:78-79, 271-276`; `components/sales/SaleActionModals.tsx:14-30, 90` |
| M18 | O mapa de status do MP junta todos os `charged_back/*` em `CHARGED_BACK`. A doc do MP no nível de **transação** distingue `in_process` (disputa aberta), `settled` (devolvido ao comprador: o vendedor perdeu) e `reimbursed` (creditado ao vendedor: ganhou). A página de **order** descreve `reimbursed` ao contrário, então a fonte confiável é a transação. | V | `models/CollectionCharge.model.ts:73, 90-91`; MP `checkout-api-orders/payment-management/status/transaction-status.md` e `.../order-status.md` (lidos em 22/10) |

**Correções ao pedido.** (1) "Uma venda gera um único título": na verdade gera **nenhum** título no subrazão. O
"título" é a própria linha da venda contra `1.1.2.01`, sem vencimento por parcela, aging nem cobrança (M5–M7).
(2) "chargeback só aparece em 2 KPIs": aparece também como status de `CollectionCharge` (M10). O efeito contábil, esse
sim, é zero.

## 1. Fronteira e costura (vale para as seis seções)

Pelo [ADR-PERSISTENCE-BOUNDARY](ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md) §2.1:

- **Continua em DynamicTable** o que o usuário desenha: a venda, o catálogo de condição de pagamento (F-VR-1) e a
  agenda (onde nasce o sinal).
- **Vai para Prisma** o que exige escrita atômica em várias tabelas com gate na transação: parcela como título,
  pagamento da venda, crédito do cliente, evento de cobrança, compensação e disputa. Todos movem razão e subrazão no
  mesmo fato.
- **Costura fixa** (§4 do ADR): pós-commit do motor → ponte em `server/src/features/accounting/sync/bridges/` →
  `postEntry(sourceType, sourceId)` idempotente → `reconcile*()`. **Nada dentro de `DynamicTableService`,
  `RuleContext` ou `RulePlugin`** (Contrato §2.1, `[AC-2.1-B1]`, `check:arch` B1). As pontes afetadas são
  `SaleSettlementBridge`/`SaleSettledMapper` (pagamento), `SaleSalesAccountingBridge`/`SaleFinalizedMapper`
  (reconhecimento), `SaleReversalBridge` (cancelamento e devolução) e o padrão do `CrmReceivableBridge` (criar
  `Receivable` a partir de linha DT).
- Todo `*Ref` novo (ex.: `Receivable.originRef = saleId`) declara no schema o preset que referencia e a guarda contra
  órfão (§4 do ADR). A venda `Finalized` já é imutável para usuário e para delete (`SalesModule.ts:176-185`, scope
  `'all'`; delete pelo GAP-MAP 8).

## 2. Decisão transversal — a venda a prazo vira título? (F-VR-0)

As seis lacunas dependem disso. Parcela com vencimento, cobrança no MP (M7), régua, aging, compensação e reabertura
após chargeback precisam de `Receivable`. A venda do salão não tem um (M5), e a ausência foi decidida no ADR-INCR-AR
(M6). **Reabrir essa decisão é DECISÃO ARQUITETURAL**: exige emenda datada ao ADR-INCR-AR, além da ratificação deste
PRE-ADR.

| Caminho | O que é | Custo / risco |
|---|---|---|
| **(a) Parcela = `Receivable` em `1.1.2.03`, sem reconhecimento próprio** | Na finalização, uma venda com condição diferente de "à vista" troca o débito do `sale.finalized` de `1.1.2.01` para `1.1.2.03` e cria N `Receivable` com `originType='SALE'`, `originRef=saleId` e `recognitionSourceType='sale.finalized'`. O `ReceivableService` **não** lança reconhecimento para eles. Cada recebimento usa o `registerReceipt` que já existe (`D <meio> / C 1.1.2.03`). Venda à vista continua como hoje (`1.1.2.01`). | Uma conta, um subrazão, sem dupla contagem. O amarre `Σ Receivable em aberto = saldo 1.1.2.03` continua valendo. Toca `SaleFinalizedMapper` e a ponte. Venda antiga não migra (fica em `1.1.2.01`). |
| (b) Parcelas como linhas DynamicTable (`saleInstallments`) em `1.1.2.01` | Novo preset filho; `sale.settled` por parcela. | Sem `CollectionCharge`, régua, aging ou compensação, porque nada disso lê DT. Duplica o AR formal no motor. |
| (c) `Receivable` "espelho" em `1.1.2.01`, sem lançamento | Subrazão de controle sobre a conta do salão. | Dois subrazões na mesma conta: o amarre deixa de fechar. É o motivo da conta dedicada no ADR-INCR-AR (F7 de lá). |

**Recomendação: (a).** É a única que deixa o MP, a régua e a compensação funcionarem sem duplicar o AR, e mantém a
regra "um subrazão por conta de controle". O risco de dupla contagem que o ADR-INCR-AR viu desaparece porque o
`Receivable` de origem venda **não reconhece receita**: quem reconhece é o `sale.finalized`, uma vez só.
**Status: RATIFICAÇÃO PENDENTE.**

---

## 3. Lacuna 1 — Venda parcelada (`VENDA-PARCELADA`)

**Problema medido.** M3, M4, M9: um prazo só (`paymentTermDays`), dois estados (`Paid`/`Pending`) e nenhum título por
parcela.

**Referência (código-fonte, lido em 22/10/2026; branch `18.0` e `version-15` naquela data):**

- Odoo 18 — `account.payment.term` com linhas `value ∈ {percent, fixed}`, `nb_days` e `delay_type` (fim do mês, fim do
  mês seguinte, dia fixo): <https://github.com/odoo/odoo/blob/18.0/addons/account/models/account_payment_term.py#L283-L329>.
  Vencimentos calculados em `_compute_terms`
  (<https://github.com/odoo/odoo/blob/18.0/addons/account/models/account_payment_term.py#L171>). **A última linha
  sempre recebe o resíduo** do arredondamento
  (<https://github.com/odoo/odoo/blob/18.0/addons/account/models/account_payment_term.py#L228-L232>). Desconto por
  antecipação (`early_discount`): L46, L156-L169.
- ERPNext v15 — `Payment Terms Template` gera, na fatura, a tabela filha `Payment Schedule` (vencimento, porção,
  valor, pago, em aberto, desconto):
  <https://github.com/frappe/erpnext/blob/version-15/erpnext/accounts/doctype/payment_schedule/payment_schedule.json#L42-L136>.
  Geração e validação da soma: `set_payment_schedule` e `validate_payment_schedule_amount`
  (<https://github.com/frappe/erpnext/blob/version-15/erpnext/controllers/accounts_controller.py#L2754>, `#L2980`).
- Nos dois, **a parcela é linha do título** (a fatura), não documento separado. No Luminaris, o título é o
  `Receivable`, então parcela = `Receivable` (F-VR-0 a), agrupada por `originRef`.

**Desenho proposto.**

1. Catálogo **"Condição de pagamento"** desenhado pelo usuário: "à vista", "entrada + 2×", "3× sem juros 30/60/90"
   (F-VR-1).
2. A venda guarda a condição escolhida. Na finalização, uma função **pura** calcula as parcelas (data-base = data da
   venda; resíduo na última, F-VR-2; centavos inteiros) e a ponte cria os N `Receivable` em lote idempotente
   (chave `originRef + installmentNumber`).
3. Parcela com entrada no ato: o recebimento da entrada é registrado na hora, pelo mesmo fluxo do pagamento (§4).
4. `paymentStatus` da venda passa a ser derivado: `Pending` → `Partial` → `Paid`, escrito por `isSystem` quando o
   último recebimento fecha. **Toca o preset**: a opção `Partial` entra em `SelectPresets.paymentStatus`.
5. **Fora:** cartão de crédito parcelado. O salão recebe da adquirente, não do cliente, então isso é recebível de
   adquirente (`1.1.2.02`, agenda D+30), assunto do `CONC-ADQUIRENTE` (F-VR-4).
6. **Preço diferente por prazo ou meio:** é permitido [D04] art. 1º, mas o desconto tem de estar informado "em local e
   formato visíveis" (Lei 10.962 art. 5º-A, incluído pela Lei 13.455 art. 2º [D12], conferida no Planalto). Se o
   catálogo de condição tiver desconto à vista, o FE mostra o desconto na tela da venda.
7. **Simples pelo caixa em 2026:** a venda a prazo exige o registro de valores a receber (Res. CGSN 140 art. 77 +
   Anexo IX: parcelas, vencimento, recebimento, saldo e incobrável). O `Receivable` por parcela já tem esses dados.
   O caixa do Simples **acaba em 01/01/2027** (Res. CGSN 190/2026), conforme o dossiê
   [`simples-regime-caixa`](../../pesquisas-legais/simples-regime-caixa/relatorio.md) itens 3 e 6. Não vale construir
   relatório só para isso.

**Lançamentos (D/C) — venda R$ 300,00, "entrada + 2×", Pix na entrada:**

| Fato | Débito | Crédito | sourceType / sourceId |
|---|---|---|---|
| Finalização (condição a prazo) | `1.1.2.03 Clientes a Receber` 300,00 | `3.1 Receita de Serviços` 300,00 (ou 3.1/3.3 pelo rateio atual) | `sale.finalized` / saleId *(débito muda de 1.1.2.01 para 1.1.2.03)* |
| Entrada | `1.1.1.01 Banco` 100,00 | `1.1.2.03` 100,00 | `ar.receipt` / receiptId *(já existe)* |
| Parcela 2 e 3 | `<conta do meio>` 100,00 | `1.1.2.03` 100,00 | `ar.receipt` / receiptId |
| Venda à vista | sem mudança: `D 1.1.2.01 / C 3.1` e `D <meio> / C 1.1.2.01` | | `sale.finalized`, `sale.settled` |

Venda **com juros** (F-VR-3, recomendação: fora da v1): o total financiado difere do preço à vista e a diferença é
receita financeira a apropriar por competência (`D 1.1.2.03 total / C 3.1 à vista / C 2.1.x juros a apropriar`). O
CDC obriga a informar juros, taxa efetiva anual, número de parcelas e total com e sem financiamento antes da venda
[D01] art. 52 I–V e art. 54-B. Por isso a v1 é **sem juros**.

**Contrato esboçado.**

```ts
// DT — preset "paymentTerms" (usuário desenha; F-VR-1 a). Linhas como preset filho "paymentTermLines" com campo
// relation paymentTermId → paymentTerms, no padrão saleItems.saleId (M16).
PaymentTermLine = { sequence: int, kind: 'PERCENT' | 'FIXED' | 'BALANCE', valueBps?: int /*0..10000*/, valueCents?: int,
                    days: int /*≥0*/, delayType: 'DAYS' | 'DAYS_AFTER_END_OF_MONTH' }
// Prisma — Receivable ganha (migração ALTER ADD COLUMN, prólogo defensivo SQLite):
originType?: 'SALE' | 'CRM' | null; originRef?: string /* saleId — *Ref sem FK, guarda: venda Finalized é imutável */;
installmentNumber?: int; installmentCount?: int; recognitionSourceType?: 'sale.finalized' | null
@@unique([userId, unitId, originType, originRef, installmentNumber])  // idempotência da ponte
// Função pura: computeInstallments(totalCents: bigint, baseDate: DateOnly, lines: PaymentTermLine[]) => { dueDate, amountCents }[]
//   invariante: Σ amountCents === totalCents; resíduo na última (F-VR-2 a)
```

**Forks:** F-VR-0, F-VR-1, F-VR-2, F-VR-3, F-VR-4 (§10).

---

## 4. Lacuna 2 — Pagamento misto, parcial, troco e crédito do cliente (`PAGAMENTO-MISTO`)

**Problema medido.** M2, M3: um meio, valor sempre igual a `totalAmount`, sem troco, sem pagamento a maior e sem
crédito.

**Referência:**

- Odoo 18 PDV — o pedido tem N `pos.payment`, um por meio
  (<https://github.com/odoo/odoo/blob/18.0/addons/point_of_sale/models/pos_payment.py#L20-L22>;
  `payment_ids` em <https://github.com/odoo/odoo/blob/18.0/addons/point_of_sale/models/pos_order.py#L373>). O troco é
  um pagamento negativo: `amount_return = -Σ pagamentos < 0`
  (<https://github.com/odoo/odoo/blob/18.0/addons/point_of_sale/models/pos_order.py#L507-L508>, gravado em L232-L239).
- ERPNext v15 PDV — tabela `payments` por meio (`pos_invoice.py#L129`) e `change_amount = paid − total + write_off`
  numa conta própria `account_for_change_amount`
  (<https://github.com/frappe/erpnext/blob/version-15/erpnext/accounts/doctype/pos_invoice/pos_invoice.py#L489-L501>).
- ERPNext v15 — o que sobra de um pagamento fica `unallocated_amount` (vira adiantamento do cliente):
  <https://github.com/frappe/erpnext/blob/version-15/erpnext/accounts/doctype/payment_entry/payment_entry.py#L1098-L1134>,
  lançado à parte em L1431-L1450.

**Desenho proposto.**

1. **`SalePayment` first-class (Prisma)**, uma linha por meio, append-only, ligada à venda por `saleRef` (F-VR-5).
   Registrar pagamento passa a receber uma **lista** de pagamentos.
2. Cada pagamento tem lançamento próprio: `sourceType='sale.payment'`, `sourceId=salePaymentId` (F-VR-6). O
   `sale.settled` legado continua válido para as vendas que já o têm, e o reconcile não relança venda com
   `sale.settled` existente.
3. **Parcial:** Σ pagamentos < total → `paymentStatus='Partial'`. O resto continua em `1.1.2.01` (à vista) ou nas
   parcelas (§3).
4. **Troco** (só dinheiro): o operador informa o valor entregue; o lançamento usa o **líquido**. Entregue e troco
   ficam na linha, para o fechamento de caixa do `TESOURARIA` (F-VR-7).
5. **Pagamento a maior sem troco** (ex.: Pix de 100 numa venda de 80) → o excedente vira **crédito do cliente**, com
   escolha explícita do operador (F-VR-8).
6. **Crédito do cliente** é um saldo monetário por cliente, **separado** do `CustomerPackageBalance` (F-VR-9).
   É usado como meio de pagamento (`method='Customer Credit'`).
7. `Package Balance` continua meio de pagamento e continua debitando `2.1.1.01` (D1-Q10 intacto).

**Lançamentos (D/C) — venda R$ 80,00 à vista:**

| Fato | Débito | Crédito | sourceType / sourceId |
|---|---|---|---|
| Dinheiro 50 (entregue 60, troco 10) | `1.1.1.02 Caixa` 50,00 | `1.1.2.01 A Receber` 50,00 | `sale.payment` / pagamento 1 |
| Cartão de débito 30 | `1.1.2.02 Adquirente` 30,00 | `1.1.2.01` 30,00 | `sale.payment` / pagamento 2 |
| *Alternativa:* Pix 100 numa venda de 80 | `1.1.1.01 Banco` 100,00 | `1.1.2.01` 80,00 · `2.1.1.02 Créditos de Clientes` *(nova)* 20,00 | `sale.payment` / pagamento |
| Uso do crédito numa venda seguinte | `2.1.1.02` 20,00 | `1.1.2.01` (ou `1.1.2.03` se a prazo) 20,00 | `sale.payment` / pagamento (`method='Customer Credit'`) |
| Pacote (sem mudança) | `2.1.1.01 Pacotes Pré-pagos` | `1.1.2.01` | `sale.payment` / pagamento |

Invariante por venda: Σ créditos em `1.1.2.01` dos pagamentos ≤ débito do `sale.finalized` (gate **dentro** da tx,
memória *authoritative-gate-inside-tx*). Se a venda for a prazo (§3), o pagamento vira `ReceivableReceipt` da parcela, e
o `SalePayment` só aponta para ele.

**Contrato esboçado.**

```prisma
model SalePayment {            // Prisma first-class; append-only; cancel = status + estorno (T5), nunca delete
  id String @id @default(cuid())
  userId String; unitId String
  saleRef String               // *Ref → DT `sales` (guarda: venda Finalized imutável; delete bloqueado pelo preset)
  method String                // Cash | Pix | Debit Card | Credit Card | Package Balance | Customer Credit | Boleto
  amountCents BigInt           // líquido aplicado à venda (> 0)
  tenderedCents BigInt?        // só Cash
  changeCents BigInt?          // só Cash; tenderedCents - amountCents
  overpaidCents BigInt @default(0) // → CustomerCreditMovement OVERPAY na mesma tx
  receivableReceiptId String?  // venda a prazo: aponta para o recibo do AR
  paymentAccountId String?     // MP/adquirente quando houver
  status String                // ACTIVE | CANCELLED | DISPUTED | CHARGED_BACK (ver §6)
  receivedAt DateTime          // date-only no fuso do escopo
  entryId String?
  createdById String?
  @@index([userId, unitId, saleRef])
}
model CustomerCredit { id; userId; unitId; counterpartyId; balanceCents BigInt @default(0)
  @@unique([userId, unitId, counterpartyId]) }
model CustomerCreditMovement { id; userId; unitId; creditId; kind String /* OVERPAY|ADVANCE|APPLY|REFUND|FORFEIT */;
  deltaCents BigInt /* > 0, sinal pelo kind */; sourceType String; sourceId String
  @@unique([userId, unitId, sourceType, sourceId, kind]) }   // idempotência (padrão PackageBalanceMovement)
```

```ts
// DTO Zod .strict() — POST /api/sales/:saleId/payments
RegisterSalePaymentsInput = z.object({ tableId: z.string(), payments: z.array(z.object({
  method: z.enum([...]), amountCents: z.number().int().positive().max(MAX_CENTS),
  tenderedCents: z.number().int().positive().optional(), paymentAccountId: z.string().optional(),
  overpayTo: z.enum(['CHANGE', 'CUSTOMER_CREDIT']).optional() })).min(1).max(10) }).strict()
```

**Forks:** F-VR-5, F-VR-6, F-VR-7, F-VR-8, F-VR-9 (§10).

---

## 5. Lacuna 5 — Sinal ou adiantamento ligado à venda

**Problema medido.** M12: só o pacote pré-pago gera passivo de adiantamento. Sinal de agendamento (ex.: 30% para
reservar uma noiva) não tem onde entrar.

**Referência:**

- ERPNext v15 — o adiantamento é um `Payment Entry` sem alocação, opcionalmente numa conta de passivo própria
  (`book_advance_payments_in_separate_party_account`,
  <https://github.com/frappe/erpnext/blob/version-15/erpnext/accounts/doctype/payment_entry/payment_entry.py#L157-L169>).
  A ligação adiantamento → fatura fica no **Advance Payment Ledger Entry** (`voucher_type/no`,
  `against_voucher_type/no`, `amount`, `event`, `delinked`):
  <https://github.com/frappe/erpnext/blob/version-15/erpnext/accounts/doctype/advance_payment_ledger_entry/advance_payment_ledger_entry.json#L20-L76>.
- Odoo 18 — o pagamento sem fatura fica em aberto na conta do parceiro (`outstanding_account_id`,
  <https://github.com/odoo/odoo/blob/18.0/addons/account/models/account_payment.py#L127>). A fatura mostra os créditos
  em aberto do cliente para o operador aplicar (`invoice_outstanding_credits_debits_widget` e
  `_compute_payments_widget_to_reconcile_info`,
  <https://github.com/odoo/odoo/blob/18.0/addons/account/models/account_move.py#L451>, `#L1403-L1464`). Não há
  documento "sinal" próprio.

**Desenho proposto.** O sinal é um **movimento `ADVANCE` do crédito do cliente** (§4), com `advanceForRef` apontando
para o agendamento ou a venda (F-VR-10). Na finalização da venda vinculada, a ponte aplica o sinal como pagamento
`Customer Credit`. Isso é o equivalente do APL do ERPNext.

**Lançamentos (D/C):**

| Fato | Débito | Crédito | sourceType / sourceId |
|---|---|---|---|
| Recebe sinal R$ 90 (Pix) | `1.1.1.01 Banco` 90,00 | `2.1.1.02 Créditos de Clientes` 90,00 | `customer.credit.advance` / movimentoId |
| Venda finalizada (R$ 300) | `1.1.2.01` 300,00 | `3.1` 300,00 | `sale.finalized` (sem mudança) |
| Aplica o sinal | `2.1.1.02` 90,00 | `1.1.2.01` 90,00 | `sale.payment` / pagamento (`Customer Credit`) |
| Devolve o sinal (cancelamento pelo salão ou desistência sem retenção) | `2.1.1.02` 90,00 | `1.1.1.01 Banco` 90,00 | `customer.credit.refund` / movimentoId |
| Retém o sinal (no-show com cláusula) | `2.1.1.02` 90,00 | `3.x` receita de retenção *(conta pendente, P-VR-4)* | `customer.credit.forfeit` / movimentoId |

**Regra legal.** Arras (sinal) são computadas na prestação quando o contrato é cumprido [D02] art. 417. Se quem pagou
não cumprir, o salão pode reter [D02] art. 418 I. Se o contrato der direito de arrependimento, o sinal só indeniza
[D02] art. 420. **Reter exige cláusula registrada** (F-VR-11).

**Regra fiscal do adiantamento (lida):**

- **IBS/CBS (regime regular, a partir de 2027):** pagamento antes do fornecimento gera **antecipação** dos tributos em
  cada parcela paga. A base é a parcela e a alíquota é a da emissão do documento ou do pagamento, o que vier primeiro.
  No fornecimento, o valor definitivo é calculado sobre o total, e a diferença vira débito ou segue as regras de
  pagamento a maior ([D11] LC 214 art. 10 §4º, redação da **LC 227/2026**; [D13] Decreto 12.955/2026 art. 11 §5º).
  Se o serviço não for prestado (inclusive distrato), aplicam-se as regras do cancelamento ([D11] art. 10 §5º, red.
  LC 227; [D13] art. 11 §6º).
- **Exceção de 5 dias:** a LC permite que o regulamento deixe a antecipação com até **5 dias** entre pagamento e
  fornecimento entrar como débito no período do fornecimento ([D11] art. 10 §7º, incluído pela LC 227). Esse é o caso
  típico do sinal de agendamento. **A CBS não regulamenta essa exceção:** o art. 11 do Decreto 12.955 não traz a
  hipótese nem no texto original [D13] nem na versão do Planalto baixada em 22/10, que já tem os Decretos 13.075,
  13.133 e 13.140 de 2026 [D14]. Hoje, portanto, **todo** sinal sofre antecipação de CBS, inclusive o de agendamento
  em menos de 5 dias. O regulamento do **IBS** (Comitê Gestor) não foi lido.
- **Simples Nacional:** o adiantamento é reconhecido no faturamento, na entrega ou na prestação, o que ocorrer
  primeiro, "ainda que no regime de caixa" (Res. CGSN 140 art. 2º §§8º–9º, dossiê `simples-regime-caixa` item 5). Ou
  seja: o sinal recebido **não** entra no DAS até a prestação ou a emissão da nota.
- **Desenho que sai disso:** o movimento `ADVANCE` grava a data do pagamento e o `advanceForRef`. Isso basta para o
  `IBS-CBS-2027` calcular a antecipação quando a venda tiver regime regular. Este PRE-ADR não calcula tributo: o débito
  da antecipação é item do `IBS-CBS-2027`.

O efeito fiscal do sinal **retido** continua em **Pendente de validação externa** (P-VR-4).

**Contrato esboçado:** `CustomerCreditMovement.kind='ADVANCE'` + `advanceForType: 'APPOINTMENT' | 'SALE'`,
`advanceForRef: string` (*Ref para DT). Rota: `POST /api/customer-credits/:counterpartyId/advances`
(`{ amountCents, method, receivedAt, advanceForType?, advanceForRef? }`.strict()).

**Forks:** F-VR-10, F-VR-11, F-VR-19 (§10).

---

## 6. Lacuna 6 — Chargeback, MED do Pix e reembolso após a liquidação (`ESTORNO-PAGAMENTO`)

**Problema medido.** M10, M11: o provedor avisa `CHARGED_BACK`/`REFUNDED`, o status muda e o razão continua dizendo
que o dinheiro está no banco. O recibo do AR continua `ACTIVE` e o título continua `RECEIVED`. A base do DAS no caixa
(X14-CAIXA, `ReceitaFiscalRecebimento`) também não se mexe.

**Referência.** **Nenhum dos dois ERPs trata chargeback.** A busca de código no GitHub por "chargeback" deu **0
arquivos** em `odoo/odoo` e em `frappe/erpnext` (branch padrão, 22/10). Para validar a busca, o mesmo método achou
`_compute_terms` e `dunning_fee`. O estorno nos dois é nota de crédito mais pagamento ao cliente:

- Odoo 18: `out_refund` (<https://github.com/odoo/odoo/blob/18.0/addons/account/models/account_move.py#L65-L69>) e, no
  provedor de pagamento, `payment.transaction` com `operation='refund'`, criado como transação filha da original
  (<https://github.com/odoo/odoo/blob/18.0/addons/payment/models/payment_transaction.py#L70-L83>; `action_refund`
  L289, `_create_child_transaction` L600).
- ERPNext v15: o `payment_entry` aceita referência a documento de devolução (`is_return`) com saldo ≤ 0
  (<https://github.com/frappe/erpnext/blob/version-15/erpnext/accounts/doctype/payment_entry/payment_entry.py#L671-L674>).
- OCA: "chargeback" só aparece em conectores. No Shopify, o chargeback do repasse vai para uma **conta de ajuste
  própria**, o mesmo padrão da `1.1.2.04` proposta aqui
  (<https://github.com/OCA/connector-shopify/blob/19.0/shopify_connector_account/models/payout_sync.py#L314-L323>).

Aqui o Luminaris vai **além** da referência, porque o fato chega do provedor (webhook ou relatório de liberação) e tem
prazo.

**Mercado Pago (doc oficial, lida em 22/10):**

- Durante o chargeback, *"the disputed amount remains on hold in the seller's account until the process is
  completed"* (`checkout-api-orders/payment-management/chargebacks.md`). O dinheiro fica preso na abertura, e isso apoia
  o F-VR-16 (a).
- O webhook do tópico Chargebacks manda `action: "order.charged_back"`, com `status_detail` e uma lista `chargebacks[]`
  (`id`, `case_id`, `status`, `amount`) (`.../chargebacks/notifications.md`).
- `GET /v1/chargebacks/{id}` traz `coverage_applied`/`coverage_eligible` (o MP cobre o vendedor),
  `documentation_status` e `date_documentation_deadline`. A documentação é enviada **uma vez só** por caso
  (`.../chargebacks/management.md`).
- O `status_detail` da **transação** separa disputa aberta, perda e ganho (M18). O mapeador atual perde isso.
- **Golpe documentado pelo próprio MP:** a pessoa paga, pede o reembolso por uma **nova** transferência e, em paralelo,
  abre o MED do Pix original, e o lojista perde duas vezes (blog do MP, "Segurança no Pix: devolução da conta
  jurídica"; grau I, é blog do provedor e não doc da API). **Guarda de desenho:** reembolso de venda paga por Pix só sai
  como **devolução do Pix original** (pacs.004), nunca como transferência nova para chave informada pelo cliente.
- **Reembolso pela API do MP** (`.../refunds-cancellations.md`): vale até **180 dias** da aprovação; no Pix, o valor
  volta **para a conta do pagador**; exige saldo disponível; pode ser parcial, por transação. Ou seja: o reembolso do
  MP já é a devolução do Pix original, e a guarda anti-golpe se cumpre usando só essa rota.
- **MED no MP:** a doc pública da API **não** descreve como o MED aparece (status próprio ou `refunded`). A
  **Claims API** (`/post-purchase/v1/claims`) **não** é o MED: os motivos dela são só `PNR` (produto não recebido),
  `PDD` (produto diferente ou defeituoso) e `CS` (cancelamento da compra) (`reference/claims/get-reason-for-claim`).
  Fica em I-4.

**Regra legal (MED do Pix, Regulamento anexo à Res. BCB 1/2020, versão 43 no BCB [D06]):** o PSP do recebedor bloqueia
cautelarmente quando há suspeita de fraude (art. 39-B). O MED cobre fraude, falha operacional e Pix Automático
indevido (art. 41-B, redação Res. BCB 402/2024). A devolução bloqueia o saldo do recebedor até o valor pedido, mesmo
em partes (art. 41-D II e par. único, redação Res. BCB 493/2025). O recebedor é avisado do bloqueio e da devolução
(art. 41-F) e pode pedir o cancelamento da devolução em 30 dias a partir do aviso (art. 41-G).

**Prazos do MED (Manual Operacional do DICT v8.5, divulgado pela IN BCB 766/2026, DOU 29/07/2026 [D07][D09]):**

| Etapa | Prazo | Onde |
|---|---|---|
| Cliente (pagador) abre a notificação de fraude | até **80 dias corridos** da transação | [D09] §20.1.1 e §10.1, em vigor desde 01/09/2026 (IN 766 art. 3º, red. IN 767) |
| PSP do recebedor analisa a notificação | até **7 dias** | [D09] §10.1 etapa 7 (histórico de versões) |
| Bloqueio no saldo do recebedor | imediato, até o saldo; novos bloqueios se entrar dinheiro | [D09] §20.1.4 |
| PSP recuperador inicia a devolução | **72 horas** depois da análise; sem isso, o DICT encerra | [D09] §20.1.6 |
| Desbloqueio | só depois de rejeitar, de concluir a devolução ou de cancelar | [D09] §20.1.7 |
| **Recebedor (o salão) contesta uma devolução** feita por fraude do pagador | até **80 dias** depois da devolução | [D09] §20.1.9 |

**Dois prazos convivem.** O Regulamento diz 30 dias para pedir o cancelamento da devolução (art. 41-G), e o Manual
(que "compõe o Regulamento", IN 766 art. 1º) abre a contestação por nova Recuperação de Valores em 80 dias
(§20.1.9). Para o desenho vale o **maior**, com os dois gravados. A contestação que o salão pode abrir tem uma regra
de produto: **cada transação admite uma só Recuperação de Valores**, mesmo cancelada (§20.1.1). Por isso a tela tem
de avisar antes de o operador pedir a contestação ao banco.

Chargeback de cartão não tem norma legal: vem do contrato com a adquirente e da bandeira. No MP, o prazo é o
`date_documentation_deadline` do caso.

**Desenho proposto.**

1. **`PaymentDispute` first-class**: uma linha por evento do provedor (chargeback, MED, reembolso) sobre o
   `SalePayment`/`ReceivableReceipt`, com `OPEN → WON | LOST | CANCELLED`, valor, prazo e referência do provedor.
   Quem cria: o `CollectionChargeService` na transição para `CHARGED_BACK`/`REFUNDED`/`PARTIALLY_REFUNDED`, o F7 ao ler
   refund/chargeback no relatório, ou o operador à mão (adquirente sem integração). O desfecho sai do `status_detail` da
   **transação** do MP (`in_process` → `OPEN`, `settled` → `LOST`, `reimbursed` → `WON`, M18), confirmado por
   `GET /v1/chargebacks/{id}`. O mapa do `CollectionCharge.model.ts` tem de deixar de juntar os três (item do BRIEF).
   Com `coverage_applied = true`, o MP cobre o vendedor: a disputa fecha `WON` mesmo com `settled`.
2. **Na abertura** (dinheiro debitado ou bloqueado): reclassifica para `1.1.2.04 Recebíveis em Contestação` (F-VR-16).
3. **Perdeu:** o recibo é estornado (T5, recibo `CANCELLED`), o título **reabre** (`OPEN`/`PARTIALLY_RECEIVED`) e entra
   na régua (F-VR-17). Ou vai para perda, por decisão do operador.
4. **Ganhou ou o MED foi cancelado (art. 41-G):** estorna a reclassificação.
5. **Reembolso voluntário depois de pago** (cliente insatisfeito): é **devolução de venda**, com lado receita
   (`3.2 Devoluções`). Pertence ao `DEVOLUCAO-VENDA` (Q12, sessão irmã). Aqui fica só o lado dinheiro (F-VR-18).
6. **Base do DAS no caixa (só fatos de 2026):** devolução e cancelamento deduzem "o valor efetivamente devolvido ao
   adquirente" (Res. CGSN 140 arts. 17 p.ú. e 18 §1º, dossiê `simples-regime-caixa` item 4). A perda definitiva gera um
   recebimento **negativo** no `ReceitaFiscalRecebimento` do mês do débito. Esses dispositivos foram **revogados a
   partir de 01/01/2027** junto com o regime de caixa (Res. CGSN 190/2026), então esse ramo só existe para chargeback e
   MED de recebimentos de 2026. Se chargeback se equipara a "devolução ao adquirente" continua em P-VR-6.
7. **Guarda anti-golpe:** reembolso de venda paga por Pix só sai como devolução do Pix original. A rota não aceita chave
   de destino informada pelo cliente.

**Lançamentos (D/C) — venda de R$ 200 paga no cartão, adquirente já repassou:**

| Fato | Débito | Crédito | sourceType / sourceId |
|---|---|---|---|
| Chargeback aberto (adquirente debita) | `1.1.2.04 Recebíveis em Contestação` *(nova)* 200,00 | `1.1.1.01 Banco` 200,00 | `payment.dispute.opened` / disputeId |
| …se a adquirente ainda não tinha repassado | `1.1.2.04` 200,00 | `1.1.2.02 Adquirente` 200,00 | idem |
| Ganhou (dinheiro volta) | `1.1.1.01 Banco` 200,00 | `1.1.2.04` 200,00 | `payment.dispute.won` / disputeId |
| Perdeu → reabre o título | `1.1.2.03` (ou `1.1.2.01` à vista) 200,00 | `1.1.2.04` 200,00 | `payment.dispute.lost` / disputeId |
| Perdeu → perda | `4.5 Perdas com Créditos de Clientes` *(nova)* 200,00 | `1.1.2.04` 200,00 | `payment.dispute.writeoff` / disputeId |
| Tarifa de chargeback | `4.6 Tarifas` | `1.1.1.01 Banco` | pelo F7 / FEE (já existe) |
| MED: bloqueio cautelar | `1.1.2.04` | `1.1.1.01 Banco` | `payment.dispute.opened` (F-VR-16) |
| MED: notificação rejeitada ou devolução cancelada (art. 41-G; Manual §20.1.7 e §20.1.9) | `1.1.1.01 Banco` | `1.1.2.04` | `payment.dispute.won` |
| Chargeback com cobertura do MP (`coverage_applied`) | `1.1.1.01 Banco` | `1.1.2.04` | `payment.dispute.won` |

**Contrato esboçado.**

```prisma
model PaymentDispute {
  id String @id @default(cuid()); userId String; unitId String
  kind String              // CHARGEBACK | PIX_MED | PROVIDER_REFUND
  salePaymentId String?    // ou
  receivableReceiptId String?
  collectionChargeId String?
  providerRef String?      // id da disputa no provedor (MP: chargebacks[].id / case_id; MED: id da Recuperação de Valores)
  amountCents BigInt       // ≤ valor do pagamento; múltiplas parciais permitidas (art. 41-D par. único) até o total
  openedAt DateTime
  contestDeadline DateTime? // MED: devolução + 80 dias (Manual DICT §20.1.9); chargeback MP: date_documentation_deadline
  coverageApplied Boolean @default(false) // MP coverage_applied — o provedor absorve a perda
  documentationSentAt DateTime? // MP aceita documentação uma vez por caso
  status String            // OPEN | WON | LOST | CANCELLED
  resolution String?       // REOPEN_TITLE | WRITE_OFF (só em LOST)
  openEntryId String?; closeEntryId String?
  @@unique([userId, unitId, kind, providerRef])  // idempotência do webhook; providerRef null = manual (SQLite: distinto)
}
```

Gate na tx: Σ disputas abertas e perdidas de um pagamento ≤ valor do pagamento.

**Forks:** F-VR-16, F-VR-17, F-VR-18 (§10).

---

## 7. Lacuna 3 — Régua de cobrança (`REGUA-COBRANCA`)

**Problema medido.** Zero código (proposta §3.1, destino 6.8). Mesmo com código, a régua não alcançaria a venda do
salão sem o F-VR-0 (M5).

**Referência:**

- ERPNext v15 — `Dunning` sobre parcelas em atraso. Juros diários = `taxa/100/365 × em aberto × dias de atraso`, mais
  a taxa de cobrança:
  <https://github.com/frappe/erpnext/blob/version-15/erpnext/accounts/doctype/dunning/dunning.py#L93-L103>. O
  `Dunning Type` traz `dunning_fee`, `rate_of_interest`, texto da carta e `income_account`
  (<https://github.com/frappe/erpnext/blob/version-15/erpnext/accounts/doctype/dunning_type/dunning_type.json#L34-L76>).
  O pagamento resolve a cobrança sozinho (`update_dunnings_linked_to_payment`, `dunning.py#L285-L294`).
- Odoo 18 — `account_followup` é **Enterprise**: `addons/account_followup` não existe no `odoo/odoo` 18.0 (API do
  GitHub: 404 em 22/10). A referência aberta é a OCA `account_credit_control` **18.0**: política com níveis, cada
  nível com `delay_days`, `computation_mode` e `channel`
  (<https://github.com/OCA/credit-control/blob/18.0/account_credit_control/models/credit_control_policy.py#L292-L323>;
  mesmas linhas no 17.0). O mesmo repositório traz `account_invoice_overdue_reminder` (lembrete simples) e
  `account_financial_risk` (bloqueio de venda por risco), ambos 18.0.

**Desenho proposto.**

1. **`CollectionPolicy`** por unidade: passos `D−3, D+1, D+7, D+15…`, canal e modelo de texto; multa e modo de juros.
2. **Job diário** (padrão `MpReleaseReportScheduler`, T11 sem fila) percorre os `Receivable` em aberto e grava
   **`CollectionEvent`** idempotente por (título, versão da política, passo). Envia pelo `EMAIL-TRANSPORT` (Q7).
   WhatsApp fica como gatilho.
3. **2ª via:** o passo pode emitir nova `CollectionCharge` (boleto ou Pix MP), reusando o F5.
4. **Mora** calculada na hora do recebimento, não provisionada (F-VR-13). Multa até 2% [D01] art. 52 §1º; juros pela
   taxa legal quando não convencionados [D02] art. 406 §§1º–3º, vinda do `LEGAL-PARAMS`. Prazo pelo art. 132 do CC, com
   dia não útil já pesquisado no F5.
5. **Guardas do CDC** no próprio motor: nunca cobra título `RECEIVED`/`CANCELLED`/em disputa (art. 42 par. único,
   devolução em dobro); janela de horário e sem exposição a terceiros (arts. 42 e 71); texto com nome, endereço e
   CNPJ do salão (art. 42-A).
6. **Inadimplência visível:** flag por cliente (maior atraso, saldo vencido) lida pela venda e pelo CRM **por consulta**,
   nunca por plugin do motor (Contrato §2.1).
7. **Baixa por perda** fecha a régua (F-VR-14). No **Lucro Real**, a dedução segue a Lei 9.430 [D10] (cópia compilada,
   sem alerta). Para inadimplência a partir de 07/10/2014 (§7º), sem garantia, o crédito pode ser registrado como perda:
   - até R$ 15 mil por operação, vencido há mais de 6 meses;
   - de R$ 15 mil a R$ 100 mil, vencido há mais de 1 ano, **"mantida a cobrança administrativa"**;
   - acima de R$ 100 mil, só com ação judicial.

   Venda parcelada com vencimento antecipado de todas as parcelas soma o total por operação (§2º). Não há perda com
   sócio, administrador ou parente até o 3º grau (§6º). O lançamento é débito em conta de resultado e crédito na conta
   do crédito (art. 10). O crédito recuperado volta ao lucro real (art. 12). **O histórico de `CollectionEvent` é a prova
   da "cobrança administrativa mantida"**, e é por isso que a baixa mora na régua. Fora do Lucro Real (Presumido,
   Simples), a perda não muda o imposto: o gate fiscal vale só quando `FiscalProfile.regime = REAL`.

**Lançamentos (D/C):** a régua em si **não lança**. Ela só gera evento. Os lançamentos aparecem no recebimento e na
perda:

| Fato | Débito | Crédito | sourceType / sourceId |
|---|---|---|---|
| Recebe parcela de R$ 100 com 2% de multa e juros de R$ 0,50 | `<meio>` 102,50 | `1.1.2.03` 100,00 · `3.5.2 Multas de Mora Recebidas` 2,00 · `3.5.1 Juros de Mora Recebidos` 0,50 | `ar.receipt` / receiptId *(linhas de mora novas no mesmo lançamento)* |
| Dispensa a mora | sem linha de mora (ou `kind='DISCOUNT'` se abater principal, `4.3.3`) | | já existe (E13) |
| Baixa por perda | `4.5 Perdas com Créditos de Clientes` *(nova)* | `1.1.2.03` | `ar.writeoff` / receivableId |

**Contrato esboçado.**

```prisma
model CollectionPolicy { id; userId; unitId; name String; version Int; active Boolean
  stepsJson String       // z.array({ offsetDays: int(-30..180), channel: 'EMAIL'|'MANUAL', templateKey: string, reissueCharge: boolean })
  lateFeeBps Int         // ≤ 200 para cliente PF (art. 52 §1º; ambiguidade A)
  interestMode String    // LEGAL | FIXED_MONTHLY (FIXED só com taxa no contrato; ambiguidade B)
  interestBpsMonth Int?  // FIXED; teto 2 × taxa legal do mês (Dec. 22.626 art. 1º) para PF
  @@unique([userId, unitId, name, version]) }
model CollectionEvent { id; userId; unitId; receivableId; policyId; policyVersion Int; stepIndex Int
  channel String; status String /* SENT | SKIPPED_PAID | SKIPPED_DISPUTE | FAILED */; sentAt DateTime?; error String?
  @@unique([receivableId, policyId, policyVersion, stepIndex]) }   // reexecução do job não reenvia
// Receipt DTO ganha: lateFeeCents?: int ≥ 0, lateInterestCents?: int ≥ 0 (calculados pelo serviço; o operador só dispensa)
```

**Forks:** F-VR-12, F-VR-13, F-VR-14; Q4 e Q7 (§10).

---

## 8. Lacuna 4 — Compensação AP × AR do mesmo parceiro

**Problema medido.** Zero código (proposta §3.1). Além disso, M13: o mesmo CNPJ como fornecedor e como cliente são
duas `Counterparty` sem vínculo. **Caso real no salão:** o profissional parceiro (salão-parceiro) tem cota-parte a
receber (AP do salão) e às vezes deve ao salão (produto comprado, adiantamento).

**Referência:**

- OCA 18.0 `account_netting`: assistente sobre linhas selecionadas. Exige o mesmo parceiro, linhas lançadas e não
  conciliadas, e lança um movimento que zera o menor saldo
  (<https://github.com/OCA/account-financial-tools/blob/18.0/account_netting/wizards/account_move_make_netting.py#L37-L110>,
  lançamento em L113-L160).
- ERPNext v15 — `Party Link` liga um Customer a um Supplier
  (<https://github.com/frappe/erpnext/blob/version-15/erpnext/accounts/doctype/party_link/party_link.py#L68-L79>). Com
  "common party accounting" ligado, cada fatura gera sozinha um JE de compensação
  (`process_common_party_accounting` / `create_advance_and_reconcile`,
  <https://github.com/frappe/erpnext/blob/version-15/erpnext/controllers/accounts_controller.py#L3076-L3110>).

**Regra legal.** Só entre dívidas líquidas, vencidas e fungíveis de quem é credor e devedor ao mesmo tempo [D02]
arts. 368–369. Não vale contra direito de terceiro, como crédito penhorado [D02] art. 380. No Simples pelo regime de
caixa, **não está decidido** se a compensação conta como recebimento na data (ambiguidade C → P-VR-3). A dúvida **só
existe para 2026**: o regime de caixa do Simples acaba em 01/01/2027 (Res. CGSN 190/2026, dossiê
`simples-regime-caixa` item 6). Como este item é o 6º da ordem, o P-VR-3 provavelmente perde objeto antes do código.

**Desenho proposto.**

1. **`CounterpartyLink`** (cliente ↔ fornecedor), criado pelo operador. O sistema sugere o par pelo `taxId` igual
   (F-VR-15).
2. **Compensação explícita** (modelo OCA), nunca automática: o operador escolhe `Payable`s e `Receivable`s vencidos dos
   dois lados, e o serviço compensa `min(Σ AP, Σ AR)` numa tx (CAS nos dois títulos, gate de período dentro da tx).
3. Cada título recebe um recibo/pagamento `kind='NETTING'`, que reusa o parcial já existente (M8).

**Lançamento (D/C) — salão deve R$ 500 ao parceiro e o parceiro deve R$ 120:**

| Fato | Débito | Crédito | sourceType / sourceId |
|---|---|---|---|
| Compensação | `2.1.2.01 Fornecedores a Pagar` 120,00 | `1.1.2.03 Clientes a Receber` 120,00 | `netting` / nettingId |
| Resto | AP em aberto de R$ 380, pago pelo fluxo normal | | |

**Contrato esboçado.**

```prisma
model CounterpartyLink { id; userId; unitId; customerId String; supplierId String; createdById String?
  @@unique([userId, unitId, customerId]) @@unique([userId, unitId, supplierId]) }  // 1↔1, como o Party Link
model Netting { id; userId; unitId; linkId; date DateTime; amountCents BigInt; entryId String?
  status String /* ACTIVE | CANCELLED */; createdById String? }
// PayablePayment.kind e ReceivableReceipt.kind ganham 'NETTING' (SETTLEMENT_KINDS), com nettingId
```

**Forks:** F-VR-15; o momento fiscal fica em P-VR-3 (§11).

---

## 9. Ordem sugerida das seis lacunas

| # | Lacuna | Por que nesta posição | Depende de |
|---|---|---|---|
| 1 | **Venda parcelada** + costura venda → título (F-VR-0) | É a fundação. Sem `Receivable` de origem venda, MP, régua, compensação e reabertura não alcançam a venda do salão (M5–M7). | F-VR-0 e emenda ao ADR-INCR-AR |
| 2 | **Pagamento misto**, parcial, troco e crédito do cliente | Troca "um meio por venda" por "um lançamento por pagamento". Estorno e sinal precisam do pagamento individual e do crédito do cliente. | 1 (a prazo vira recibo de parcela) |
| 3 | **Sinal** | Pequeno: é um movimento `ADVANCE` do crédito criado em 2. | 2 |
| 4 | **Estorno** (chargeback, MED, reembolso) | É o único item que deixa **número errado** quando o fluxo do MP rodar em produção (M10). Precisa do pagamento individual (2) e do título reabrível (1). Deve estar em `main` antes de o F5 ir para produção (M2 da fila A4). | 1, 2; F5 PR-2/PR-3 (em `main`) |
| 5 | **Régua de cobrança** | Precisa do título da venda (1), do `EMAIL-TRANSPORT` (Q7), do FE do F5 para a 2ª via (Q4) e da resposta às ambiguidades A/B de mora. | 1; `EMAIL-TRANSPORT`; P-VR-1, P-VR-2 |
| 6 | **Compensação AP × AR** | O caso mais raro no salão (parceiro que deve). Mexe nos dois subrazões. O efeito no Simples pelo caixa é ambíguo (P-VR-3). | 1; P-VR-3 |

**Divergência com a §4b da proposta (Q11):** a onda 1 de lá era `VENDA-PARCELADA → PAGAMENTO-MISTO → TESOURARIA →
REGUA-COBRANCA → ESTORNO-PAGAMENTO`. Aqui, (i) **o estorno vem antes da régua**, porque é risco de número errado e a
régua é ganho de produto; (ii) **o sinal sai do `TESOURARIA`** e vira parte do crédito do cliente (F-VR-19), enquanto o
adiantamento a fornecedor e a compensação ficam no `TESOURARIA`. É proposta: a Q11 continua do dono.

**Uma BRIEF por lacuna** (`BE-INCR-*`, só backend; o FE é nó vizinho), na ordem acima. Cada PR com `executa` próprio.

---

## 10. Forks pendentes de ratificação

Todos com **status: RATIFICAÇÃO PENDENTE**. Responder no chat "F-VR-0 a, F-VR-1 b…".

| ID | Pergunta | Caminhos | Recomendação e por quê |
|---|---|---|---|
| **F-VR-0** | A venda a prazo vira título no AR formal? (reabre ADR-INCR-AR §"Fronteira com os recebíveis do salão") | (a) parcela = `Receivable` em `1.1.2.03`, reconhecimento só pelo `sale.finalized` · (b) parcelas em DT sobre `1.1.2.01` · (c) `Receivable` espelho em `1.1.2.01` | **(a)**: único caminho que dá cobrança MP, régua e compensação à venda sem dupla contagem e sem dois subrazões na mesma conta (§2). Exige **emenda datada ao ADR-INCR-AR**. |
| **F-VR-1** | Quem desenha a condição de pagamento? (mesma pergunta da **Q6** para contratos) | (a) catálogo em DynamicTable + cálculo puro no mundo Prisma · (b) `PaymentTerm` Prisma | **(a)**: o usuário desenha ("entrada + 2×"), a lei não. Pelo ADR-BOUNDARY §2.1, é DT. O que tem invariante (os títulos) já é Prisma. Se a Q6 for respondida (b), esta acompanha. |
| **F-VR-2** | Onde fica o resíduo de centavos das parcelas? | (a) na última (Odoo L228-L232) · (b) na primeira | **(a)**: parcelas iguais na frente e igual à referência. |
| **F-VR-3** | Venda parcelada com juros na v1? | (a) só sem juros; com juros vira gatilho · (b) com juros, receita financeira a apropriar | **(a)**: com juros exige informar CET e taxa efetiva anual antes da venda [D01] arts. 52 e 54-B, mais AVP. No salão o parcelado é quase sempre sem juros (**A**). |
| **F-VR-4** | Cartão de crédito parcelado entra aqui? | (a) não: é recebível de adquirente, vai para `CONC-ADQUIRENTE` · (b) sim | **(a)**: quem deve ao salão é a adquirente, não o cliente. Não há título por cliente. |
| **F-VR-5** | Onde vivem os pagamentos da venda? | (a) `SalePayment` Prisma, append-only · (b) array JSON na linha DT da venda | **(a)**: lançamento, saldo do pacote ou do crédito e subrazão no mesmo fato pedem escrita atômica com gate (ADR-BOUNDARY §2.1). A venda é imutável depois de `Finalized` (§5.1 de lá). |
| **F-VR-6** | Chave do lançamento de liquidação | (a) por pagamento (`sale.payment`/`salePaymentId`), legado `sale.settled` intocado · (b) por venda com N pernas | **(a)**: pagamento parcial em dias diferentes cai em datas e períodos diferentes, e o `@@unique(sourceType, sourceId)` já resolve a idempotência por pagamento. |
| **F-VR-7** | Troco no razão | (a) lança o líquido; entregue e troco ficam na linha para o fechamento de caixa · (b) débito bruto e crédito de troco | **(a)**: o razão não ganha nada com o bruto; a conferência de caixa (`TESOURARIA`) usa a linha. ERPNext usa conta de troco própria, mas só para separar o caixa do PDV. |
| **F-VR-8** | Pagamento a maior sem troco | (a) vira crédito do cliente, com escolha explícita do operador · (b) recusa | **(a)**: é o caso do Pix com valor errado. Recusar empurra o problema para fora do sistema. |
| **F-VR-9** | Crédito do cliente × `CustomerPackageBalance` (ponto aberto da proposta §4b.1) | (a) saldo monetário separado, conta `2.1.1.02` · (b) reusar o saldo de pacote com pacote "sentinela" | **(a)**, **sem validade** na v1: o saldo de pacote é por pacote, tem validade e quebra em `3.4` (PACOTE-VALIDADE, decidido com o jurídico em 04/10). O crédito monetário é dinheiro do cliente sem serviço comprado. Fazê-lo expirar esbarra no art. 51 II do CDC (tirar a opção de reembolso), e não achei norma nem precedente que autorize (P-VR-5 c). |
| **F-VR-10** | Sinal = movimento `ADVANCE` do crédito do cliente? | (a) sim, com `advanceForRef` · (b) documento próprio | **(a)**: mesmo passivo, mesma aplicação (padrão APL do ERPNext). Um instrumento só. |
| **F-VR-11** | O produto suporta reter o sinal (no-show)? | (a) sim, só com cláusula registrada no agendamento/venda · (b) só devolução | **(a)**, desligado por padrão: CC arts. 418 I e 420 [D02] permitem com contrato. Conta de receita e efeito fiscal = P-VR-4. |
| **F-VR-12** | Canal da régua na v1 | (a) e-mail (`EMAIL-TRANSPORT`) + tarefa manual · (b) WhatsApp junto | **(a)**: WhatsApp já é gatilho na proposta §4/F2. Depende da **Q7** (BYOK). |
| **F-VR-13** | Quando reconhecer multa e juros | (a) no recebimento · (b) provisão mensal por competência | **(a)**: no varejo de serviço a mora é muitas vezes perdoada. Provisionar cria receita que vira estorno. *Sob o regime de competência pleno o contador pode preferir (b): P-VR-2.* |
| **F-VR-14** | Baixa por perda | (a) na régua, com `ar.writeoff` em `4.5` (nova) e, no Lucro Real, gate dos limites do art. 9º §7º da Lei 9.430 · (b) só manual no AR | **(a)**: fecha o ciclo da cobrança, e o histórico da régua é a prova da "cobrança administrativa mantida" que o art. 9º §7º II b exige [D10]. |
| **F-VR-15** | Compensação: vínculo e disparo | (a) `CounterpartyLink` 1↔1 sugerido por `taxId` + compensação **explícita** (OCA) · (b) automática a cada título (ERPNext common party) | **(a)**: a compensação extingue obrigação (CC 368); automática no salão-parceiro misturaria repasse e dívida sem o operador ver. |
| **F-VR-16** | Quando lançar chargeback e MED | (a) na abertura (débito ou bloqueio), reclassificando para `1.1.2.04` · (b) só no desfecho | **(a)**: o dinheiro sai ou fica bloqueado na abertura. Vale para o MED (art. 41-D II [D06]; Manual §20.1.4 [D09]) e para o chargeback no MP ("remains on hold", doc do MP). Lançar só no fim é o "caixa mostra dinheiro que voltou" de hoje. |
| **F-VR-17** | Perdeu a disputa: o que acontece com o título | (a) estorna o recibo (T5) e reabre o título, que volta à régua · (b) cria título novo | **(a)**: o recibo `CANCELLED` + estorno já existe (M8). Título novo duplicaria o histórico do cliente. |
| **F-VR-18** | Reembolso voluntário depois de pago | (a) lado receita no `DEVOLUCAO-VENDA` (Q12), lado dinheiro aqui · (b) tudo aqui | **(a)**: a sessão irmã de devolução cuida de `3.2`, CMV e pacote. Dividir pelo lado evita dois donos para o mesmo lançamento. |
| **F-VR-19** | Onde ficam sinal e compensação na régua F | (a) sinal no `PAGAMENTO-MISTO`; compensação e adiantamento a fornecedor no `TESOURARIA` · (b) como na proposta (tudo no `TESOURARIA`) · (c) nós próprios | **(a)**: o sinal é o crédito do cliente. A compensação mexe em AP, que é tesouraria. |
| **Q4** (aberta) | Ordem dos `executa` do bloco R1 | ver proposta §5 | Não decido. A régua (§7) precisa do F5 FE para a 2ª via; se a Q4 for (b) ou (c), a régua anda sem 2ª via. |
| **Q6** (aberta) | Fronteira de `CONTRATOS-RECORRENTES` e `ORCAMENTO` | ver proposta §5 | Não decido. O F-VR-1 é a mesma pergunta para condição de pagamento e deve seguir a resposta. |
| Q7, Q10, Q11, Q12 (abertas) | BYOK do e-mail; os 6 nós novos; ordem dos BRIEFs; devolução | ver proposta §5 | Não decido. Este PRE-ADR assume Q10 (a) ou (b) para os IDs `VENDA-PARCELADA`, `PAGAMENTO-MISTO` e `ESTORNO-PAGAMENTO`. |

---

## 11. Pendente de validação externa (não entra no checklist até ter artefato)

| # | Ponto | Por que não está decidido | Pergunta exata |
|---|---|---|---|
| P-VR-1 | Multa de 2% em parcela **sem juros** (ambiguidade A do dossiê) | O caput do CDC art. 52 fala em "outorga de crédito ou concessão de financiamento". Leitura segura: 2% para todo cliente PF. | Advogado: "Em venda de serviço a consumidor parcelada sem juros, a multa por atraso de parcela pode passar de 2%?" |
| P-VR-2 | Juros de mora convencionados com PF (ambiguidade B) | A Lei de Usura vale para PJ × PF (Lei 14.905 art. 3º só exclui PJ × PJ e afins): teto = 2 × taxa legal [D05] art. 1º, e a taxa legal muda todo mês (Selic − IPCA). Leitura segura: taxa legal por padrão. | Advogado: "Salão com cliente PF: posso cobrar 1% a.m. de mora fixo, ou fico limitado a 2 × (Selic − IPCA) do mês?" Contador: "Juros e multa por competência ou no recebimento?" |
| P-VR-3 | Compensação AP × AR no Simples pelo caixa (ambiguidade C) — **só 2026** | Compensar extingue as duas obrigações sem passar dinheiro. Nenhuma norma lida diz se isso é "recebimento" na data. O caixa do Simples acaba em 01/01/2027 (Res. CGSN 190/2026), então a pergunta só vale para compensação feita em 2026. | Contador, só se a compensação for implementada ainda em 2026: "No Simples pelo regime de caixa, o valor compensado entre o que o parceiro me deve e o que eu devo a ele entra na receita do mês da compensação?" |
| P-VR-4 | Sinal retido em no-show: conta e tributo | Receita de serviço (base de ISS/Simples) ou indenização (arras com função indenizatória, CC 420)? | Contador: "Sinal retido por falta do cliente é receita de serviço ou outra receita? Entra no DAS?" |
| P-VR-5 | (a) Exceção de 5 dias da antecipação no sinal; (b) crédito do cliente **sem** serviço definido é "pagamento antes do fornecimento"?; (c) validade do crédito monetário | **(a) CBS resolvido:** não regulamentada (Dec. 12.955 art. 11, versão do Planalto de 22/10 [D14]); IBS não lido. **(b) Aberto:** o excedente de um Pix a maior não se refere a fornecimento definido. **(c) Lido em parte:** o CDC anula cláusula que "subtraia ao consumidor a opção de reembolso da quantia já paga" (art. 51 II [D01]), que imponha "desvantagem exagerada" (art. 51 IV) ou que preveja perda total das prestações pagas em compra a prestação (art. 53). **Não achei precedente do STJ** sobre validade de crédito de serviço. O único caso de validade no STJ é de telefonia pré-paga, que é setor regulado pela Anatel, e lá a validade foi **mantida**. A pretensão de ressarcimento por enriquecimento sem causa prescreve em 3 anos (CC art. 206 §3º IV [D02]). | (a) IBS: no dossiê do `IBS-CBS-2027`; (b) contador: "Crédito do cliente gerado por pagamento a maior, sem serviço agendado, sofre antecipação de IBS/CBS?"; (c) ver F-VR-9: crédito monetário **sem validade** na v1. A baixa só acontece por reembolso ou uso, e por isso não há pergunta a fazer. |
| P-VR-6 | Chargeback ou MED perdido na base do DAS no caixa — **só 2026** | **Lido:** no caixa, devolução e cancelamento deduzem "o valor efetivamente devolvido ao adquirente" (Res. 140 arts. 17 p.ú. e 18 §1º, revogados a partir de 2027). **Aberto:** se chargeback e MED (dinheiro volta sem o serviço ser desfeito) são "devolução" para esse fim. | Contador: "Venda recebida em setembro/2026 com chargeback perdido em novembro/2026: abato o valor da receita de novembro no Simples pelo caixa?" |
| ~~P-VR-7~~ | ~~Perda com crédito dedutível no Lucro Real~~ | **Resolvido em 22/10:** Lei 9.430 arts. 9º–12 [D10] lidos (limites do §7º, §2º, §6º, art. 10 e art. 12). Entrou na §7 e no F-VR-14. | — |
| P-VR-8 | Contas novas no plano referencial (`2.1.1.02`, `1.1.2.04`, `4.5`) | Toda conta nova precisa de mapeamento referencial na ECD. Códigos são proposta: o BRIEF confere colisão no `ChartOfAccountsFixture` e no binding. | Contador: validar a natureza e o referencial das três contas. |

## 12. Insumos ausentes

- ~~I-1~~ **Resolvido:** o motor faz tabela filha por `relation` (M16). As linhas da condição são preset filho.
- ~~I-2~~ **Resolvido:** o modal cria sempre `Pending`, com um meio, e paga depois pelo `SalePaymentModal` com um meio
  (M17). O FE do item 2 troca esse modal por uma lista de pagamentos. A criação já paga (`create` →
  `maybeSyncSaleSettled`) só acontece por API ou importação, não pelo modal.
- ~~I-3~~ **Resolvido:** Manual Operacional do DICT v8.5 lido ([D09], IN BCB 766/2026 [D07]); prazos na §6.
- **I-4 (parcial):** a doc pública do MP cobre chargeback (webhook, sub-status, prazo de documentação, cobertura),
  mas **não descreve como o MED aparece** na Orders API (status próprio, `refunded` ou só no relatório de liberação).
  O F7 já lê o relatório de liberação (`DESCRIPTION` = refund/chargeback, ADR F5 L376). Para fechar, há duas saídas:
  (a) uma venda Pix real com MED no ambiente do M2, ou (b) perguntar ao suporte do MP. Isso não bloqueia o BRIEF: o
  `PaymentDispute` aceita criação manual.

## 13. Achados fora de escopo (registrados, não planejados)

- **E-1 — Venda do salão não pode ser cobrada pelo MP hoje (M7).** O FE do F5 (fila B6) só alcança títulos avulsos e do
  CRM. Isso muda o valor do `executa` do F5 FE para o salão. Vale a pena o dono saber antes da Q4.
- **E-2 — Status do `CollectionCharge` sem efeito (M10)** já é dívida de correção hoje, sem esperar este PRE-ADR: um
  título avulso pago por Pix MP e depois estornado continua `RECEIVED`. O mapa também junta `charged_back/in_process`,
  `/settled` e `/reimbursed` (M18), então até o status perde se o vendedor ganhou ou perdeu. Candidato a
  `sessao-instrumentacao` (teste que falha) se o dono quiser antes do item 4.
- **E-3 — Fechamento de caixa/PDV** (sangria, suprimento, conferência com o troco da §4) segue no `TESOURARIA`.

## 14. Gates que cada BRIEF vai acionar (entram no checklist, não ficam para o implementador)

- Snapshot de shape dos DTOs Zod (`dtoShapeSnapshot`): DTO novo, inserido sem reordenar (memória *dto-snapshot-update-reordena*).
- Allowlist do `auditCanonical.ts`: `sale.payment.*`, `customer.credit.*`, `payment.dispute.*`, `collection.event.*`,
  `netting.*`, todos na mesma mudança. O `payerSnapshot` fica fora do evento (PII, padrão P2-14).
- `openapi` path-count e paridade i18n pt/en.
- `check:arch` B1: nenhuma ponte importada por `features/dynamicTables/**`.
- Migração SQLite com prólogo defensivo (ALTER em `Receivable`, `PayablePayment.kind`, `ReceivableReceipt.kind`).
- `resetDb` inclui as tabelas novas (memória *resetdb-nao-limpa-contabilidade*).
- Teste de integração com `--runInBand`. Idempotência como varredura de classe: todo write-path novo com o modo real
  de falha (reexecução do job da régua, webhook duplicado, reconcile).
- `X14-CAIXA`: recebimento por pagamento (item 2) e negativo por disputa perdida (item 4), só depois de P-VR-6.

## 15. Caso adversarial e checagem (OPS-001)

- **Caso tentado contra a recomendação F-VR-0 (a):** "o `sale.finalized` já debita `1.1.2.01`; trocar a conta
  quebra o reconcile das vendas antigas". Resposta: a troca vale só para venda com condição a prazo, gravada na
  finalização. A venda antiga não tem condição e continua em `1.1.2.01`. Checagem feita (V): o grep de
  `A_RECEBER_CODE`/`1.1.2.01` em `server/src` achou 4 consumidores fora dos mappers de venda. Dois **precisam entrar no
  BRIEF do item 1**: (i) `SaleReturnedMapper.ts:23` credita `1.1.2.01` fixo, então devolver uma venda a prazo creditaria
  a conta errada (o mapper tem de ler a conta do `sale.finalized`); (ii) `TieOutDiagnosticService.ts:27`
  (`POS_RECEIVABLE_CODE = A_RECEBER_CODE`) amarra `1.1.2.01` como recebível do PDV, e a venda a prazo passa a entrar no
  amarre do AR (`1.1.2.03`, L164). Os outros dois não mudam: `FiscalDocumentEmissionService.ts:44` só cobre o pacote,
  e `AgingReportService.ts:105` já lê `1.1.2.03`, o que ganha a venda a prazo no aging de graça. Nenhum dos quatro
  derruba a recomendação; os dois primeiros viram itens do checklist.
- **Caso tentado contra M5:** talvez a venda crie `Receivable` por outro caminho (job, integração). Checagem: grep de
  `createReceivable` e de `getReceivableService` em `server/src` — três chamadores, nenhum de venda. **Teria falhado**
  se houvesse um quarto.
- **Caso tentado contra M10:** talvez o `CHARGED_BACK` já estorne o recibo em outro serviço. Checagem: grep
  `CHARGED_BACK|REFUNDED` em `server/src` → só `CollectionCharge.model.ts` e `CollectionChargeService.ts` (transição
  de status), mais o ADR F5 L376 dizendo que o F7 não estorna. Nenhum `reverseEntry` ligado a esses status.

## 16. Pesquisa externa colada no chat (22/10) — conferência

O dono colou uma pesquisa sobre MED no MP, a exceção de 5 dias e a validade de crédito. Cada afirmação foi conferida
na fonte primária antes de entrar aqui:

| Afirmação | Resultado | Fonte conferida |
|---|---|---|
| MED dispara os tópicos `claims`/`chargebacks`; `/v1/claims/{id}` traz o motivo | **Não confere.** A Claims API (`/post-purchase/v1/claims`) só tem os motivos PNR, PDD e CS. Não há doc pública ligando MED a ela. A integração do Luminaris usa a Orders API, não `/v1/payments`. | MP `reference/claims/get-reason-for-claim` |
| MED na base Res. BCB 1/2020 e 103/2021 | Confere: o MED entrou pela Res. BCB 103/2021 no Regulamento | [D06] arts. 41-A a 41-G |
| "Art. 10 do Decreto 12.955" espelha a antecipação | **Artigo errado:** o art. 10 trata de imunidade; a antecipação está no art. 11 §5º | [D13], [D14] |
| A exceção de 5 dias depende de regulamento e o decreto não a usa | Confere (só para a CBS) | [D11] art. 10 §7º; [D14] art. 11 |
| CDC art. 51 IV e XI; art. 49 (7 dias fora do estabelecimento) | Confere o texto. O art. 51 II (opção de reembolso) e o art. 53 servem mais ao caso. | [D01] |
| "STJ e Procons entendem abusiva a validade curta" | **Sem precedente achado.** O único caso de validade no STJ é de telefonia pré-paga, e lá a validade foi mantida (setor Anatel) | busca em stj.jus.br, 22/10 |
| Validade "razoável de 6 a 12 meses"; multa de "10% a 20% de praxe" | **Sem fonte.** Não entra como regra. | — |
| Prescrição: 3 anos (CC 206 §3º IV) e 5 anos (CDC 27) | Confere o texto. O art. 27 é sobre dano por fato do serviço, não sobre crédito não usado. | [D01], [D02] |
| "Não cancelar o saldo sem aviso prévio" (validade do pacote) | Já decidido pelo dono com o jurídico em 04/10 (aviso ativo **não** obrigatório; validade em destaque + aceite). Nada novo para reabrir. | `docs/plano/nos/PACOTE-VALIDADE.md` |

## Fontes

- Código: `origin/main` `672031c5` — arquivos e linhas na §0.
- Plano: `docs/plano/FILA-ORDEM.md` §F; `docs/plano/PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md` §3.1, §4/F2, §4b,
  §5 (Q4, Q6, Q7, Q10–Q12); `docs/adr/ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`;
  `docs/adr/ADR-INCR-AR-accounts-receivable.md:42-48`; `docs/adr/ADR-INCR-PAYMENT-PROVIDER-COLLECTION.md:376`.
- Referências (código-fonte lido em 22/10/2026; os números de linha valem para os branches naquela data): Odoo 18.0
  (`account_payment_term.py`, `account_move.py`, `account_payment.py`, `payment_transaction.py`, `pos_payment.py`,
  `pos_order.py`); OCA 18.0 (`account_netting`, `account_credit_control`) e `connector-shopify` 19.0 (`payout_sync.py`);
  ERPNext version-15 (`payment_schedule.json`, `accounts_controller.py`, `dunning.py`, `dunning_type.json`,
  `party_link.py`, `payment_entry.py`, `advance_payment_ledger_entry.json`, `pos_invoice.py`). Busca de código no
  GitHub por "chargeback" em `odoo/odoo`, `frappe/erpnext` e `org:OCA` (22/10). `account_followup` é Enterprise: não
  existe no repositório público (404).
- Mercado Pago (doc oficial, `mercadopago.com.br/developers/pt/docs/checkout-api-orders/...`, lida em 22/10):
  `payment-management/chargebacks.md`, `.../chargebacks/management.md`, `.../chargebacks/notifications.md`,
  `.../status/order-status.md`, `.../status/transaction-status.md`.
- Legal: [`pesquisas-legais/venda-recebivel/relatorio.md`](../../pesquisas-legais/venda-recebivel/relatorio.md) — D01
  CDC, D02 CC, D03 Lei 14.905/2024, D04 Lei 13.455/2017, D10 Lei 9.430/1996, D13 Dec. 12.955/2026 (acervo
  ctresb/leis); D05 Dec. 22.626/1933, D11 LC 214/2025 compilada (com LC 227/2026), D12 Lei 13.455 compilada
  (planalto.gov.br); D06 Regulamento do Pix, Res. BCB 1/2020 v.43, D07 IN BCB 766/2026, D08 Guia MED, D09 Manual
  Operacional do DICT v8.5 (bcb.gov.br). Dossiê vizinho:
  [`simples-regime-caixa`](../../pesquisas-legais/simples-regime-caixa/relatorio.md) (Res. CGSN 140 e 190/2026).
