# BE-INCR-E1-DEVOLUCAO-PACOTE — o que sobrou do E-1 depois do #849 (BRIEF)

> **Questionário de decisão (Parte A) e BRIEF da correção (Parte B).** Sessão de planejamento: não traz código nem
> `executa`, e nenhum fork se auto-ratifica. Todos os forks estão **RATIFICAÇÃO PENDENTE**.

## 0. Cabeçalho

| Campo | Conteúdo |
|---|---|
| Item a planejar | GAP-MAP Nível 5, linha **E-1** ("Pacote — cancelar ou devolver venda de pacote contabiliza errado", `docs/operating-manual/GAP-MAP.md:171`), na parte que o PR #849 (`8daf6632`, em `main`) deixou aberta: (1) **devolução** (status `Returned`); (2) **pacote já consumido, total ou parcialmente**; (3) **subrazão `InventoryItem`**, que não volta no cancelamento (achado da linha CMV, `GAP-MAP.md:172`). O E-1 não tem nota de nó em `docs/plano/nos/`: o item é a linha do GAP-MAP |
| Autorização | Dono, chat, **2026-10-22**: *"Autorizo só as de planejamento"*. Escopo: só planejamento, sem código, sem `executa`, e nenhum fork se auto-ratifica. **Cobre exatamente o item?** Sim. As três partes vêm da própria linha E-1/CMV e do commit do #849 ("Devolução e consumo parcial seguem fora"). Instrumentação e correção pedem autorização nova (ORCH-006) |
| Insumos | `git show 8daf6632`, `saleCancellation.reversalGaps.integration.test.ts`, GAP-MAP E-1 e CMV, `BE-INCR-PACOTE-VALIDADE-brief.md` §2 e F-PV-8, `BE-INCR-DFE-brief.md` 5c (F-DFE-9), `fontes-oficiais/TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md`, dossiê legal novo [`pesquisas-legais/e1-devolucao-pacote/relatorio.md`](../../pesquisas-legais/e1-devolucao-pacote/relatorio.md) e o código listado no §B1 |
| Nós vizinhos | **PACOTE-VALIDADE** (guarda 9.2 / F-PV-8: origem `Returned` bloqueia o vencimento); **INCR-INVENTORY** (D8: `reverseStockForSale` a custo original; D6: tie-out subrazão × 1.1.6); **DFE** (F-DFE-9 `pacoteFatoGerador`; pendência `sale_cancelled_with_live_document`); **X14 PR-3** (subrazão fiscal `registrarEstorno`); **M5-ibs-cbs** (apuração IBS/CBS, diferida: destino do efeito fiscal) |
| Saída | Este documento, o dossiê legal e uma linha de ponteiro no E-1 do GAP-MAP. Nenhum outro arquivo |

---

# PARTE A — Questionário de decisão (primeiro entregável)

Cada pergunta traz o caso, o que o código faz hoje, as leituras com o lançamento D/C, o efeito fiscal e a
recomendação com fonte. Exemplo numérico comum: **pacote de R$ 100,00** vendido a prazo (D 1.1.2 / C 2.1.1.01 =
100). O consumo de R$ 40,00 é uma venda de serviço paga com `Package Balance`: receita D 1.1.2 / C 3.1 = 40, depois
liquidação D 2.1.1.01 / C 1.1.2 = 40 e movimento `debit` de 4000 no saldo.

**Fonte fiscal comum** (dossiê [D04]/[D05], grau V-texto): o regulamento da CBS define **devolução** como
"desfazimento de operação após o fornecimento" e **cancelamento** como desfazimento "antes do fornecimento"
(Dec. 12.955/2026 art. 57 § 1º). O pacote pago antes é a hipótese da LC 214 art. 10 § 4º. Se o serviço não é
prestado, o § 5º (red. LC 227/2026) manda aplicar "as regras aplicáveis ao cancelamento". **Logo, para o fisco,
devolver pacote não consumido é cancelar.** Hoje o produto não tem apuração de IBS/CBS (M5 diferido), então esse
efeito vira contrato para o M5, não código deste incremento (§B5).

> A linha E-1 cita "LC 214 art. 10 §3". O § 3º (red. LC 227/2026) trata de execução continuada ou fracionada. O
> dispositivo do pacote é o **§ 4º/§ 5º** (dossiê §1 item 2). Este BRIEF não corrige o GAP-MAP: só aponta para cá.

### Q1 · F-E1D-1 — Devolução (`Returned`) de venda de pacote **não consumido**

**Hoje** (V, `SaleReversalBridge.ts:130-157`; `SaleReturnedMapper.ts:22-23`): lança D 3.2 Devoluções / C 1.1.2 =
100. Como a venda só-pacote não reconheceu receita (`SaleSalesAccountingBridge.ts:66`), o 3.2 fica contra uma receita
que nunca existiu, e a DRE mostra receita líquida −100 (I). O `sale.package.sold` (C 2.1.1.01 = 100) e o saldo
do cliente (6000/10000) ficam intactos. A guarda 9.2 bloqueia o vencimento desse saldo para sempre, porque
`Returned` não tem a liberação por `reversal` (`accountingSyncReconcile.job.ts:1758-1760`).

| Leitura | Lançamento | Efeito fiscal | Custo |
|---|---|---|---|
| **(a) Tratar como cancelamento** | Sem 3.2. Movimento `reversal` no saldo, depois estorno do `sale.package.sold` (D 2.1.1.01 / C 1.1.2 = 100) e, se houver, do `sale.settled`, como o #849 faz no `Cancelled`. A guarda 9.2 libera `Returned` com `reversal` | Bate com o art. 57 § 1º II: cancelamento, documento pelo fornecedor (§ 6º II). Com `pacoteFatoGerador = 'CONSUMO'` não houve NFS-e nem ISS. Com `'VENDA'`, a NFS-e viva já gera a pendência `sale_cancelled_with_live_document` (`FiscalDocumentEmissionService.ts:496`) | O ramo `Returned` do bridge passa a desviar a venda só-pacote para o caminho do cancelamento |
| (b) Recusar | `POST /api/sales/return` de venda só-pacote → 400 "use o cancelamento". Nada no razão | Mesmo resultado fiscal de (a), porque o operador cancela | Menor no código. Muda a rota, e a tela que oferece "Devolver" recebe 400 |
| (c) Manter o 3.2 | Como hoje | Diverge do art. 57: trata como devolução algo que não foi fornecido | Zero. Deixa o passivo fantasma e a receita negativa |

**Recomendação: (a).** É a classificação do fisco (Dec. 12.955 art. 57 § 1º II; LC 214 art. 10 § 5º) e reaproveita o
caminho que o #849 já provou (3/3 verde). (b) é aceitável se o dono preferir que "devolução" fique reservada a
produto e serviço. **RATIFICAÇÃO PENDENTE.**

### Q2 · F-E1D-2 — Devolução de venda de **produto**: CMV e estoque

**Hoje** (V): o 3.2 entra, mas o `sale.cogs` (D 4.2 / C 1.1.6) fica, e o CMV de um produto que voltou continua no
resultado. O estoque físico da DynamicTable volta (`stockSync.ts:239-243`), mas nem o razão (1.1.6) nem o subrazão
`InventoryItem` voltam.

| Leitura | Lançamento | Efeito fiscal | Custo |
|---|---|---|---|
| **(a) Estornar o `sale.cogs`** | `reverseEntry` do `sale.cogs` (D 1.1.6 / C 4.2, a custo original), datado no dia da devolução. Antes dele (tx1), `InventoryService.reverseStockForSale` devolve qtd e valor ao `InventoryItem` | Nenhum direto. CMV não é base de IBS/CBS nem de ISS | Reusa o que o #849 fez no cancelamento e o D8 já pronto (`InventoryService.ts:293`) |
| (b) Lançamento novo `sale.returned.cogs` | D 1.1.6 / C 4.2 com sourceType próprio. O `sale.cogs` original fica `Posted` | Nenhum | Mapper, evento e binding novos. Simetria com o 3.2 (a devolução é evento novo, D2-Q5) |
| (c) Não estornar (perda/avaria) | Produto devolvido baixado como perda | Nenhum | Precisa de flag de avaria: frente nova |

**Recomendação: (a).** No resultado, (a) e (b) dão o mesmo saldo. (a) não cria sourceType, binding nem mapper, e
usa o custo original do D8, que é o que Odoo (`_reverse_moves`, anglo-saxão) e ERPNext (`is_return` + `update_stock`)
fazem. Grau dessa referência: **assumido**, pelo pedido; o código deles não foi lido nesta sessão. (c) fica fora (§B8).
**RATIFICAÇÃO PENDENTE.**

### Q3 · F-E1D-3 — Cancelar ou devolver venda de pacote **parcialmente consumido**

**Hoje** (V, `PackageBalanceService.ts:235-272`; `accountingSyncReconcile.job.ts`): saldo < crédito → `'consumed'`,
nada se escreve, e o reconcile abre a pendência `PACKAGE_ORIGIN_REVERSED`. No exemplo, o saldo fica 60, o 2.1.1.01
fica 60 e os R$ 40 consumidos já são receita.

| Leitura | Lançamento | Efeito fiscal | Custo |
|---|---|---|---|
| **(a) Estornar só o resíduo** | Movimento `reversal` de 6000 (o resíduo da venda, ver Q5) e lançamento novo `sale.package.refund`: D 2.1.1.01 / C 1.1.2 = 60 (contrapartida em Q6). A receita dos 40 consumidos fica. O `sale.package.sold` fica `Posted`, e o líquido do 2.1.1.01 é 100 − 40 − 60 = 0 | Fiscalmente são duas partes: os 40 consumidos foram fornecidos (sem desfazimento) e os 60 não (cancelamento, art. 10 § 5º). Com `'CONSUMO'`, não há NFS-e a mexer no resíduo. Com `'VENDA'`, a nota inteira saiu na venda e o ajuste parcial é pendente de validação externa (§B6) | Mapper e evento novos (`sale.package.refund`), resíduo calculado no serviço |
| (b) Recusar | 400 `PACKAGE_PARTIALLY_CONSUMED` antes de mudar o status. O cliente não tem como receber o saldo pelo sistema | — | Pequeno. Empurra o reembolso para fora do sistema |
| (c) Manter a pendência (#849) | Nada. O contador lança à mão | — | Zero. A pendência nunca se resolve sozinha |

**Recomendação: (a).** Reembolsar só o não usado é o desfazimento "antes do fornecimento" da parte não prestada
(Dec. 12.955 art. 57 § 1º II), e a parte prestada já virou receita no consumo (F-DFE-9 a). Fecha o 2.1.1.01 com o
saldo do cliente, sem lançamento manual. **RATIFICAÇÃO PENDENTE.**

### Q4 · F-E1D-4 — Pacote **totalmente consumido**

**Hoje** (V): mesma pendência do Q3. Todos os serviços foram prestados e reconhecidos nas vendas de consumo, e o
2.1.1.01 dessa venda já é zero.

| Leitura | Lançamento | Efeito fiscal | Custo |
|---|---|---|---|
| **(a) Recusar** | `cancel`/`return` da venda de origem → 400 `PACKAGE_FULLY_CONSUMED` **antes** de mudar o status. O reembolso de serviço já prestado sai pela devolução das **vendas de consumo** (Q7) | Coerente: não há operação não fornecida para cancelar | Um teste de leitura no `SalesCancellationService` antes do flip. Muda o comportamento do #849, que hoje aceita e deixa pendência |
| (b) Aceitar sem efeito | Status vira `Cancelled`/`Returned`, nada no razão, sem pendência | A venda some da lista de vivas sem documento fiscal correspondente | Pequeno. O status mente sobre o que aconteceu |
| (c) Manter a pendência (#849) | Nada | — | Zero |

**Recomendação: (a).** Cancelar uma venda cujos serviços foram todos prestados não tem efeito fiscal ou contábil
legítimo (art. 57 § 1º: não há desfazimento antes do fornecimento). O caminho certo é devolver o serviço prestado.
**RATIFICAÇÃO PENDENTE.**

### Q5 · F-E1D-5 — Quanto do saldo é **desta** venda, quando o cliente comprou o mesmo pacote mais de uma vez

**Hoje** (V): o saldo é um só por cliente × pacote (`findBalance(customerId, packageId)`), e os créditos ficam por
`saleId`. O #849 testa "saldo ≥ crédito". Com duas compras de 100 e consumo de 40 (saldo 160), cancelar a **mais
antiga** estorna 100 inteiros, embora o consumo tenha saído dela.

| Leitura | Resíduo da venda S | Custo |
|---|---|---|
| **(a) FIFO** | O consumo come primeiro o crédito mais antigo: `resíduo(S) = clamp(saldo − Σ créditos vivos mais novos que S, 0, crédito(S))` | Uma leitura dos créditos do saldo. Muda o #849 só para cliente com mais de um crédito |
| (b) Pró-rata | `resíduo(S) = saldo × crédito(S) / Σ créditos vivos` | Arredondamento de centavos a decidir |
| (c) Manter "saldo ≥ crédito" | Estorna o crédito inteiro se couber; senão, `consumed` | Zero. Incoerente com Q3 (a): o resíduo parcial não existe nessa regra |

**Recomendação: (a).** É a ordem natural de consumo de crédito antecipado e dá resíduo inteiro em centavos, sem
arredondamento. **Insumo a conferir:** se a recompra renova a validade do saldo inteiro (PACOTE-VALIDADE), FIFO e
vencimento precisam usar a mesma ordem (§B7). **RATIFICAÇÃO PENDENTE.**

### Q6 · F-E1D-6 — Contrapartida do **reembolso do resíduo** (Q3 a)

| Leitura | Lançamento | Custo |
|---|---|---|
| **(a) C 1.1.2 A Receber** | D 2.1.1.01 / C 1.1.2. Se a venda já foi paga, o 1.1.2 fica credor até o reembolso financeiro, o mesmo padrão da devolução hoje (D2-Q5, `SaleReturnedMapper`) | Zero de plano de contas. Herda a lacuna do reembolso financeiro (§B8 A4) |
| (b) Estorno proporcional do `sale.settled` | D 2.1.1.01 / C conta do meio de pagamento (Caixa/Banco/1.1.4) = resíduo | Precisa escolher a forma de pagamento quando a liquidação foi mista |
| (c) Passivo novo "Reembolsos a clientes" | D 2.1.1.01 / C 2.1.x | Conta nova + referencial ECD (o H1 já sofreu com a 3.4 sem referencial) |

**Recomendação: (a).** É o padrão já ratificado para a devolução (D2-Q5) e não toca plano de contas nem referencial.
**RATIFICAÇÃO PENDENTE.**

### Q7 · F-E1D-7 — Devolução de venda de **serviço já prestado** (inclui a venda de consumo de pacote)

**Hoje** (V): D 3.2 / C 1.1.2 e linhas negativas `DEVOLUCAO` no subrazão fiscal (`ReceitaFiscalService.ts:152-178`).

| Leitura | Efeito | Fiscal |
|---|---|---|
| **(a) Manter e perguntar ao contador** | Razão como está (3.2 é a redutora certa de receita reconhecida) | IBS/CBS: devolução após fornecimento, documento pelo fornecedor se o cliente não emite (art. 57 § 6º I b), mesma base e alíquota (LC 214 arts. 12 § 7º e 17). **ISS:** a LC 116 não tem regra (arts. 1º e 7º); efeito municipal não lido (dossiê §4) |
| (b) Bloquear a devolução de serviço até a resposta | 400 | — |

**Recomendação: (a).** O razão está certo, e a dúvida é só de ISS municipal: vai como pergunta ao contador (§B6).
**Atenção:** devolver uma venda de consumo paga com `Package Balance` não devolve o saldo ao cliente (§B8 A1). Isso
fica fora deste item. **RATIFICAÇÃO PENDENTE.**

### Q8 · F-E1D-8 — O reconcile re-dirige a devolução?

**Hoje** (V, `accountingSyncReconcile.job.ts:746-800`): `reconcileSaleReturns` só re-dirige o `sale.returned`.

(a) **Sim:** como o #849 fez em `reconcileSaleCancellations`, o reconcile da devolução passa a re-dirigir o saldo, o
`sale.package.sold`/`sale.package.refund`, o `sale.cogs` e o subrazão. (b) Só a ponte.
**Recomendação: (a).** Todos esses passos são commits separados (tx1/tx2) e best-effort. Sem re-drive, uma queda
entre eles fica para sempre. **RATIFICAÇÃO PENDENTE.**

### Q9 · F-E1D-9 — Subrazão `InventoryItem` nas vendas **já canceladas** depois do #849

O #849 estorna o `sale.cogs` no razão sem devolver o subrazão. O tie-out D6 (Σ `StockMovement.valueCentsDelta` ==
`InventoryItem.totalValueCents` == saldo 1.1.6) quebra a cada cancelamento de produto (I: deduzido do código, não
executado). (a) **O reconcile dos cancelamentos chama `reverseStockForSale`** para toda venda `Cancelled` com
movimento `COGS` e sem `REVERSAL`, o que repara as já canceladas sem migração. (b) Só as novas.
**Recomendação: (a).** Sem produção, o backfill pelo reconcile é de graça e idempotente (`reversalEventId`).
**RATIFICAÇÃO PENDENTE.**

---

# PARTE B — BRIEF da correção

## B1. Fatos (V = lido no código nesta sessão · I = inferido, não executado)

| # | Fato | Onde | Grau |
|---|---|---|---|
| F1 | `Returned` → `sale.returned` D 3.2 / C 1.1.2 pelo `totalAmount` inteiro | `SaleReversalBridge.ts:130-157`; `SaleReturnedMapper.ts:22-23,57-58` | V |
| F2 | O ramo `Returned` não toca `sale.cogs`, `sale.package.sold`, `PackageBalanceService` nem `InventoryService` | `SaleReversalBridge.ts:130-157` | V |
| F3 | Venda só-pacote não lança `sale.finalized` → o 3.2 da devolução fica contra receita inexistente | `SaleSalesAccountingBridge.ts:66` | V (gate) / I (efeito na DRE) |
| F4 | A guarda 9.2 sempre bloqueia origem `Returned`, e só libera `Cancelled` com `reversal` | `accountingSyncReconcile.job.ts:1758-1760` | V |
| F5 | `reverseCreditFromSale`: saldo < crédito → `'consumed'`, sem escrita; senão estorna o crédito inteiro | `PackageBalanceService.ts:235-272` | V |
| F6 | Consumo = venda de serviço com receita `sale.finalized` + `sale.settled` D 2.1.1.01 / C 1.1.2 (`Package Balance`) + movimento `debit` | `SaleSettledMapper.ts:22,31,42`; `RegisterPaymentService.ts:190` | V |
| F7 | Saldo único por cliente × pacote; créditos por `saleId` | `PackageBalanceService.ts` (`findBalance`, `listCreditMovements`) | V |
| F8 | `InventoryService.reverseStockForSale` (D8: custo original, idempotente por `reversalEventId`, audita `inventory.reversed`) não tem chamador fora do teste unitário | `InventoryService.ts:293-370`; `grep -rn reverseStockForSale server/src` | V |
| F9 | O cancelamento estorna o `sale.cogs` no razão sem o subrazão → tie-out D6 quebra | `SaleReversalBridge.ts:110-114` + F8 | V (código) / I (quebra) |
| F10 | O estoque físico (DynamicTable) volta em `Cancelled`/`Returned` vindo de `Finalized` | `stockSync.ts:239-243` | V |
| F11 | `reconcileSaleReturns` só re-dirige `sale.returned` | `accountingSyncReconcile.job.ts:746-800` | V |
| F12 | A devolução é da venda inteira: o DTO não tem itens nem valor | `SalesCancellationDto.ts` | V |
| F13 | `registrarEstorno` devolve 0 sem linhas `VENDA` (caso do pacote com `CONSUMO`) | `ReceitaFiscalService.ts:153-154` | V |
| F14 | Venda `Cancelled`/`Returned` com NFS-e viva → pendência `sale_cancelled_with_live_document` | `FiscalDocumentEmissionService.ts:496` | V |
| F15 | O binding tem entradas por sourceType (`sale.package.sold` em `saleBinding`/`clinicBinding`, `PerformanceLiabilityArchetype`) | `accountingBinding/fixtures/*.ts`, `archetypes/*.ts` | V |

## B2. Checklist (cada item testável sozinho; a forma final segue os forks; itens condicionais marcados)

**Bloco 1 — subrazão de estoque (direto, sem fork de regra; D8/D6 do INCR-INVENTORY)**
1. **Cancelamento devolve o `InventoryItem`.** No ramo `Cancelled` do `SaleReversalBridge`, chamar
   `InventoryService.reverseStockForSale(scope, { saleId, reversalEventId: 'sale.cancelled:<saleId>', reversalDate })`
   (tx1) **antes** do `reverseEntry` do `sale.cogs` (tx2), na ordem do `recordSaleCogs`. Teste T2.
2. **Reconcile dos cancelamentos re-dirige o subrazão** (F-E1D-9 a): `SaleCancellationReconcileDeps.reverseStock`,
   chamado antes de estornar o `sale.cogs`. Também repara as vendas já canceladas. Teste T9.

**Bloco 2 — devolução de produto (F-E1D-2)**
3. *(F-E1D-2 a)* O ramo `Returned` estorna o `sale.cogs` (`reverseEntry`, `reversalPostingDate` = dia da devolução,
   o mesmo `returnDay` do 3.2), com o subrazão antes (`reversalEventId: 'sale.returned:<saleId>'`). Teste T1.
   *(se b)* mapper `SaleReturnedCogsMapper` (`sale.returned.cogs`, D 1.1.6 / C 4.2, `costCents` do subrazão) + binding.

**Bloco 3 — pacote (F-E1D-1, 3, 4, 5, 6)**
4. *(F-E1D-5)* `PackageBalanceService.residualOfSale(scope, saleId, tx)`: lê o crédito da venda, os créditos vivos do
   mesmo saldo (sem `reversal`) e o saldo **na tx**, e devolve `{ creditCents, residualCents }` pela regra ratificada.
   Teste unitário T7.
5. *(F-E1D-3/4)* `reverseCreditFromSale` passa a devolver o desfecho tipado do §B3: `reversed` (resíduo = crédito),
   `partial` (0 < resíduo < crédito; movimento `reversal` com `deltaCents = resíduo`), `consumed` (resíduo 0, sem
   escrita) e `no_credit`. A chave de idempotência continua `(userId, unitId, saleId, 'reversal')`.
6. *(F-E1D-4 a)* `SalesCancellationService.transition`: antes do flip, se a venda é só-pacote e
   `residualOfSale.residualCents === 0`, lança 400 `PACKAGE_FULLY_CONSUMED`. O status fica `Finalized` e nada é
   escrito. Teste T6. *(se b/c: o item cai.)*
7. *(F-E1D-1 a)* O ramo `Returned` do bridge, para venda só-pacote (`isAllPackageSale`), segue o caminho do
   cancelamento do pacote: não lança o 3.2, e lança o `reversal` + estorno do `sale.package.sold` (+ `sale.settled`,
   se houver). Teste T3. *(se b)* `SalesCancellationService.return_` recusa venda só-pacote com 400
   `PACKAGE_RETURN_IS_CANCELLATION`, e o item 7 vira só o teste do 400.
8. *(F-E1D-3 a)* Desfecho `partial`, em `Cancelled` ou `Returned`: mapper novo `SalePackageRefundMapper`
   (`sale.package.refund`, D 2.1.1.01 / C conforme F-E1D-6, `refundCents` inteiro vindo do movimento, sem
   float→cents). O `sale.package.sold` **não** é estornado. Registrar o mapper no `AccountingSyncService` e o
   sourceType no binding (`saleBinding`, `clinicBinding`; arquétipo a escolher entre `PerformanceLiabilityArchetype`
   e `ReversalArchetype`, F15). Testes T4 e T5.
9. **Guarda 9.2** (`buildPackageExpiryDeps.findReversedOrigin`): origem `Returned` **ou** `Cancelled` com movimento
   `reversal` não bloqueia mais. Teste T3 (asserção de vencimento liberado).
10. A pendência `PACKAGE_ORIGIN_REVERSED` no reconcile fica só para o desfecho que a ratificação mantiver como
    manual. Com F-E1D-3 a e F-E1D-4 a, ela some do caminho do cancelamento, e o teste do reconcile muda junto.

**Bloco 4 — reconcile da devolução (F-E1D-8 a)**
11. `SaleReturnReconcileDeps` ganha `findEntry`, `reverse`, `reversePackageCredit` e `reverseStock`.
    `reconcileSaleReturns` re-dirige, na ordem: subrazão → `sale.cogs`; saldo → `sale.package.sold` ou
    `sale.package.refund`. O `sale.returned` (3.2) só sai para venda que não é só-pacote. Teste T8.
12. `retryOneReconcilePendingItem` (ramo `sale.returned`) recebe as mesmas deps, espelhando o que o #849 fez no ramo
    do cancelamento.

**Bloco 5 — gates que o diff aciona**
13. `tsc` limpo em `server/` (`npx tsc --noEmit` e `tsconfig.test.json`). `check:arch` sem violação nova: o
    `SalesCancellationService` chama o `PackageBalanceService` pela factory, no nível de orquestração, nunca dentro
    do motor (Contrato §2.1).
14. Allowlist `auditCanonical.ts`: nenhum eventType novo previsto (`inventory.reversed` já existe). Se a correção
    criar um, ele entra na mesma mudança.
15. `dtoShapeSnapshot` e openapi: **sem mudança** (DTO e rotas iguais). Se F-E1D-1 b for escolhido, o 400 novo entra
    na doc da rota `sales.paths.ts`.
16. Códigos de erro novos (`PACKAGE_FULLY_CONSUMED`, e `PACKAGE_RETURN_IS_CANCELLATION` se F-E1D-1 b) como
    `ValidationError` com `errorCode` próprio (memória `erro-especifico-para-skip-em-job`). Mensagem em pt.

## B3. Contratos (esboço materializável)

```ts
// features/packages/services/PackageBalanceService.ts
export type PackageReversalOutcome =
  | { kind: 'no_credit' }
  | { kind: 'reversed'; reversedCents: number }                       // resíduo == crédito
  | { kind: 'partial'; reversedCents: number; consumedCents: number } // F-E1D-3 (a)
  | { kind: 'consumed'; consumedCents: number };                      // resíduo 0 — F-E1D-4

residualOfSale(scope: AccountingScope, saleId: string, tx?: Tx):
  Promise<{ creditCents: number; residualCents: number } | null>;     // null = venda sem crédito
reverseCreditFromSale(scope: AccountingScope, saleId: string): Promise<PackageReversalOutcome>;

// features/accounting/sync/AccountingSyncPort.ts
buildSalePackageRefundEvent(input: {
  saleId: string; unitId: string; refundCents: number; // inteiro, do movimento 'reversal'
  occurredAt: string;                                  // dia do cancelamento/devolução (date-only do escopo)
  label: string;
}): AccountingEvent; // sourceType 'sale.package.refund'

// features/accounting/sync/mappers/SalePackageRefundMapper.ts
//   D 2.1.1.01 (PACOTES_PRE_PAGOS_CODE) = refundCents
//   C 1.1.2    (A_RECEBER_CODE)         = refundCents     // F-E1D-6 (a); (b)/(c) trocam a conta de crédito
//   guarda: Number.isSafeInteger, > 0, ≤ MAX_CENTS (espelho do SaleCogsMapper)

// features/accounting/services/InventoryService.ts — já existe (D8), passa a ter chamador
reverseStockForSale(scope, { saleId, reversalEventId: `sale.cancelled:${saleId}` | `sale.returned:${saleId}`, reversalDate: Date })

// jobs/accountingSyncReconcile.job.ts
interface SaleCancellationReconcileDeps { /* + */ reverseStock: (scope, saleId) => Promise<void>;
  reversePackageCredit: (scope, saleId) => Promise<PackageReversalOutcome>; }
interface SaleReturnReconcileDeps { /* + */ findEntry; reverse; reverseStock;
  reversePackageCredit: (scope, saleId) => Promise<PackageReversalOutcome>; isAllPackage: (ownerUserId, saleId) => Promise<boolean>; }

// erros (400) — ValidationError com errorCode
'PACKAGE_FULLY_CONSUMED'          // F-E1D-4 (a)
'PACKAGE_RETURN_IS_CANCELLATION'  // só se F-E1D-1 (b)
```

**Tabela de efeitos esperados** (com as recomendações; R = resíduo, C = CMV original):

| Venda | `Cancelled` | `Returned` |
|---|---|---|
| Produto | estorna receita, liquidação e `sale.cogs`; `InventoryItem` +qtd/+C | 3.2 = total; estorna `sale.cogs`; `InventoryItem` +qtd/+C |
| Serviço | estorna receita e liquidação (já é assim) | 3.2 = total (já é assim) |
| Pacote não consumido | como o #849 (saldo, 2.1.1.01, liquidação) | **igual ao `Cancelled`**, sem 3.2 |
| Pacote parcial | `reversal` R + `sale.package.refund` D 2.1.1.01 / C 1.1.2 = R | igual ao `Cancelled`, sem 3.2 |
| Pacote todo consumido | 400 `PACKAGE_FULLY_CONSUMED` | 400 `PACKAGE_FULLY_CONSUMED` |

## B4. Testes-guarda previstos (para a `sessao-instrumentacao`; vermelhos pelo motivo certo, com pré-condição conferida)

Arquivo sugerido: `server/src/__tests__/saleReturn.reversalGaps.integration.test.ts`, no molde do
`saleCancellation.reversalGaps.integration.test.ts` (SQLite real, preset `beautySalon`, rota real, pré-condição
asserida antes da ação).

| # | Caso | Asserção que fica vermelha hoje | Fork |
|---|---|---|---|
| T1 | Devolução de produto (estoque 10 un / R$ 40, vende 2) | `4.2` volta a 0 (hoje 800); `InventoryItem` volta a 10 un / 4000; 3.2 = 5000 (controle verde) | F-E1D-2 |
| T2 | Cancelamento de produto | `InventoryItem` volta a 10 un / 4000 (hoje 8 / 3200); Σ `StockMovement` == saldo 1.1.6 | direto |
| T3 | Devolução de pacote não consumido (100) | `2.1.1.01` = 0 (hoje 10000); 3.2 = 0 (hoje 10000); saldo do cliente = 0; `findReversedOrigin` devolve `null` | F-E1D-1 |
| T4 | Cancelamento de pacote 100 com consumo 40 | saldo = 0 (hoje 6000); `2.1.1.01` = 0 (hoje 6000); 3.1 do consumo = 4000 (controle); sem pendência `PACKAGE_ORIGIN_REVERSED` | F-E1D-3/6 |
| T5 | Devolução do mesmo caso de T4 | igual a T4 e 3.2 = 0 | F-E1D-1/3 |
| T6 | Pacote todo consumido → cancelar | 400 `PACKAGE_FULLY_CONSUMED`; status segue `Finalized` (hoje 200 + pendência) | F-E1D-4 |
| T7 | Duas compras de 100, consumo 40, cancela a **mais antiga** | movimento `reversal` = 6000 (FIFO; hoje 10000) | F-E1D-5 |
| T8 | Devolução com o bridge falhando entre tx1 e tx2 → `reconcileSaleReturns` | depois do reconcile, T3/T1 valem; segunda passada não duplica (idempotência) | F-E1D-8 |
| T9 | Venda cancelada sem `REVERSAL` de estoque → reconcile dos cancelamentos | `InventoryItem` reparado; segunda passada não duplica | F-E1D-9 |

**Regra para a instrumentação:** um caso cujo fork não foi ratificado **não** é escrito. O teste-guarda de F-E1D-x só
nasce com o fork decidido, porque o esperado depende dele. T2 é direto e pode ir já na primeira instrumentação
autorizada.

## B5. Forks pendentes de ratificação

| ID | Pergunta | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| F-E1D-1 | Devolução de pacote não consumido | (a) como cancelamento · (b) recusar 400 · (c) manter 3.2 | **(a)** — Dec. 12.955 art. 57 § 1º II; LC 214 art. 10 § 5º | RATIFICAÇÃO PENDENTE |
| F-E1D-2 | CMV/estoque na devolução de produto | (a) `reverseEntry` do `sale.cogs` + D8 · (b) `sale.returned.cogs` novo · (c) perda | **(a)** — reuso; D8 | RATIFICAÇÃO PENDENTE |
| F-E1D-3 | Pacote parcialmente consumido | (a) estornar o resíduo · (b) recusar · (c) pendência manual | **(a)** — art. 57 § 1º II na parte não fornecida | RATIFICAÇÃO PENDENTE |
| F-E1D-4 | Pacote todo consumido | (a) 400 antes do flip · (b) aceitar sem efeito · (c) pendência | **(a)** | RATIFICAÇÃO PENDENTE |
| F-E1D-5 | Atribuição do resíduo com mais de um crédito | (a) FIFO · (b) pró-rata · (c) "saldo ≥ crédito" | **(a)** | RATIFICAÇÃO PENDENTE |
| F-E1D-6 | Contrapartida do reembolso do resíduo | (a) C 1.1.2 · (b) estorno proporcional da liquidação · (c) passivo novo | **(a)** — D2-Q5 | RATIFICAÇÃO PENDENTE |
| F-E1D-7 | Devolução de serviço já prestado | (a) manter + pergunta ao contador · (b) bloquear | **(a)** | RATIFICAÇÃO PENDENTE |
| F-E1D-8 | Reconcile da devolução | (a) re-drive completo · (b) só a ponte | **(a)** | RATIFICAÇÃO PENDENTE |
| F-E1D-9 | Subrazão das vendas já canceladas | (a) reparo pelo reconcile · (b) só novas | **(a)** | RATIFICAÇÃO PENDENTE |

## B6. Pendente de validação externa (nada disto entra no checklist como decidido)

1. **ISS na devolução de serviço já prestado (SP).** A LC 116 não decide (arts. 1º e 7º). Pergunta ao contador:
   *"Em São Paulo, devolver o valor de um serviço já prestado, com NFS-e emitida, permite cancelar a nota ou excluir o
   valor da base do ISS? Por qual dispositivo?"* O subrazão fiscal hoje grava `DEVOLUCAO` negativa (X14 PR-3), e a
   resposta diz se essa linha pode reduzir a base do ISS.
2. **Pacote com `pacoteFatoGerador = 'VENDA'` e reembolso parcial.** Pergunta: *"Na NFS-e emitida na venda de um
   pacote, o reembolso do saldo não usado exige cancelar e substituir a nota pelo valor consumido?"*
3. **IBS/CBS (contrato para o M5, não para este incremento):** cancelamento do pacote e do resíduo = documento fiscal
   do fornecedor no valor desfeito (art. 57 §§ 3º e 6º II), base e alíquota da operação original (LC 214 arts. 12 § 7º
   e 17), crédito ou estorno de débito ao fornecedor (art. 47 § 8º). Antecipação na venda do pacote (art. 10 § 4º).
   Devolução de operação que não gerou crédito ao adquirente depende de provar o encargo (art. 57 § 8º I c/c
   art. 38 II).

## B7. Insumos ausentes

- Regulamento do IBS e lei/regulamento do ISS de São Paulo: não lidos (dossiê §5).
- Ordem de consumo × validade: se a recompra renova a validade do saldo inteiro, FIFO (F-E1D-5) e vencimento
  (PACOTE-VALIDADE item 6) precisam usar a mesma ordem. Não conferido nesta sessão.
- Arquétipo de binding do `sale.package.refund` (F15): escolher entre `PerformanceLiabilityArchetype` e
  `ReversalArchetype` pede leitura do interpretador do binding na sessão de feature.
- Código do Odoo (`_reverse_moves`) e do ERPNext (`is_return`, `update_stock`): citados pelo pedido, não lidos
  (grau: assumido).

## B8. Achados fora de escopo (registrados, não planejados)

- **A1 — cancelar ou devolver uma venda de consumo paga com `Package Balance` não devolve o saldo.** O estorno do
  `sale.settled` recompõe o 2.1.1.01 (espelho de D 2.1.1.01 / C 1.1.2), mas nada estorna o movimento `debit`. O
  saldo do cliente fica menor que o passivo. Grau I (lido em `SaleReversalBridge.ts:98-107` e
  `PackageBalanceService.ts:128-185`, não executado). Pede instrumentação própria.
- **A2 — venda mista com item `Package`** (tabela `SalesItemsMixed`): `SalePackageSoldBridge.ts:56` só age em venda
  só-pacote, e a mista lança o `totalAmount` inteiro como receita, sem passivo e sem crédito. Grau I.
- **A3 — devolução parcial por item:** o DTO devolve a venda inteira (F12).
- **A4 — saída de caixa do reembolso** na devolução não é modelada: o 1.1.2 fica credor (D2-Q5). Afeta Q6 (a).
- **A5 — produto devolvido avariado** (perda em vez de retorno ao estoque): F-E1D-2 (c).
- **A6 — citação da linha E-1:** "LC 214 art. 10 §3" deve apontar para o § 4º/§ 5º (dossiê §1 item 2).

## B9. Riscos e vieses

- **Viés de reuso:** recomendo (a) em quase tudo porque reaproveita o #849. Contra isso: F-E1D-4 (a) e F-E1D-5 (a)
  **mudam** o comportamento ratificado no #849 (pendência para o consumido; "saldo ≥ crédito"). O dono decidiu no
  #849 que o consumido "não estorna e deixa pendência", e reabrir isso é escolha dele, não ajuste.
- **Caso adversarial tentado:** "devolução de pacote não consumido é devolução, e o 3.2 está certo". Refutado pelo
  texto: art. 57 § 1º do Dec. 12.955 (Planalto, conferido 22/10) e LC 214 art. 10 § 5º (red. LC 227) chamam de
  cancelamento o desfazimento antes do fornecimento. Além disso, o 3.2 reduz uma receita que a venda só-pacote nunca
  lançou (`SaleSalesAccountingBridge.ts:66`).
- **Não executado:** nenhum efeito do §B1 marcado I foi rodado. O tie-out D6 quebrado depois do #849 (F9) é dedução, e
  T2 é o teste que o prova ou refuta.

## Fontes

- Dossiê: [`pesquisas-legais/e1-devolucao-pacote/relatorio.md`](../../pesquisas-legais/e1-devolucao-pacote/relatorio.md) — [D01] LC 116/2003 (acervo, compilada); [D04] LC 214/2025 compilada (Planalto, 22/10/2026); [D05] Dec. 12.955/2026 (Planalto, 22/10/2026).
- PR #849 (`8daf6632`): cancelamento estorna CMV, passivo e saldo do pacote não consumido.
- `docs/accounting/BE-INCR-PACOTE-VALIDADE-brief.md` §2 e F-PV-8; `docs/accounting/BE-INCR-DFE-brief.md` 5c (F-DFE-9); `docs/accounting/BE-INCR-INVENTORY-impl-plan.md` (D6, D8).
