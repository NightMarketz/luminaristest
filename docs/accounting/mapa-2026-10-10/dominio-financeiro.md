# Mapa do domínio FINANCEIRO / tesouraria / gestão: o que existe contra um ERP brasileiro completo

Base: worktree `brief-fe-tarifa-f7-b13fea` = `origin/main` 845d79ce, 2026-10-10. Tarefa só de leitura.
Referência de mercado: o que Conta Azul, Omie, Nibo, Bling, Granatum, TOTVS Protheus Financeiro, Odoo e ERPNext cobrem.
Montei o checklist a partir do conhecimento geral desses produtos. **Não conferi o site de cada fornecedor.**

**Classes:** CÓDIGO (existe em `server/src`) · PLANO (nó, gate, diferido, ADR, PRE-ADR ou BRIEF) ·
**PLANO-órfão** (citado num ADR ou BRIEF como "fora do MVP" ou "incremento futuro", **sem nó e sem autorização**; conta
como PLANO, mas na prática é lacuna) · SÓ DESTINO · REJEITADO · **NÃO MAPEADO**.

**Grau de cada afirmação:** "verificado" = li o arquivo ou fiz o grep citado. Tela "inferida" = deduzida da estrutura
do app, sem abrir no browser. Relevância = julgamento meu para o 1º cliente (Simples, SP capital, salão de beleza ou
clínica estética).

**Contagem (95 itens):** CÓDIGO 40 (vários parciais ou sem tela) · PLANO 8 · PLANO-órfão 4 · SÓ DESTINO 10 ·
REJEITADO 2 · **NÃO MAPEADO 31**.

---

## 1. Contas a pagar

| # | Item | Classe | Evidência | Tela? | Relevância 1º cliente | Externo? |
|---|---|---|---|---|---|---|
| 1.1 | Cadastro de título a pagar (fornecedor, competência, vencimento, conta de despesa) | CÓDIGO | `services/PayableService.ts`, `model Payable` (schema:995), nó FIN-01 done | Sim: `AccountsPayablePanel.tsx`, `CreatePayableModal.tsx` | — | — |
| 1.2 | NF-e de compra preenche o título a pagar | CÓDIGO | `NfeImportService.ts`, nó F1 done | Sim: `NfePanel.tsx` | — | — |
| 1.3 | Pagamento total ou parcial, com estorno | CÓDIGO | `PayablePayment`, nó F3 done (#307) | Sim | — | — |
| 1.4 | Cadastro de fornecedor | CÓDIGO | `CounterpartyService.ts`, FIN-03 | Sim: `CounterpartiesPanel.tsx` | — | — |
| 1.5 | **Recorrência** (aluguel, energia, software todo mês) | PLANO-órfão | `ADR-INCR-AP-accounts-payable.md:186` F3 → (a): "fora do MVP… incremento próprio". Nenhum nó. O grep por `recorr|recurring` em `features/accounting` não acha nada | Não | **Alta**: as despesas fixas do salão são todas mensais | Não |
| 1.6 | **Parcelamento** (uma compra gera N títulos) | NÃO MAPEADO | O grep por `parcelament|installment` em `server/src` e `docs/plano` não acha nada fora de Simples/ECF | Não | Alta/média: compra de insumo e equipamento em 3x | Não |
| 1.7 | Aprovação do pagamento antes de pagar | NÃO MAPEADO | A torre maker-checker (`EntryApprovalService.ts`) só cobre o **lançamento manual**. O `PayableService` não tem passo de aprovação | Não | Baixa: o dono é quem paga | Não |
| 1.8 | Agendamento de pagamento | NÃO MAPEADO | O grep por `agendamento de pagamento|scheduledPayment` volta vazio | Não | Baixa/média | Banco |
| 1.9 | Pagamento em lote | NÃO MAPEADO | Não existe rota de pagamento em lote. O `pay` trata um título por vez | Não | Baixa | Não |
| 1.10 | Remessa CNAB de **pagamento** (SISPAG, segmentos A/J) | PLANO (ambíguo) | `diferidos/M5-remessa.md` fala em "integração bancária de saída", depende do gate D6. Mas o ADR do F5 (§6.1) e o nó F6 só tratam de **cobrança** CNAB e Pix de saída. Pagamento a fornecedor por CNAB não aparece escrito em lugar nenhum | Não | Baixa | **Banco (D6)** |
| 1.11 | Pix de saída | PLANO | nó **F6** `blocked`: a API Payouts do MP exige chave Ed25519 aprovada pelo MP e não tem OAuth para terceiros | Não | Média | **MP ou banco** |
| 1.12 | **Boleto de fornecedor** pela linha digitável ou código de barras, e DDA | NÃO MAPEADO | O grep por `DDA|linha digit|código de barras|barcode` não acha nada no vault nem em `docs/accounting` | Não | Média: a leitura da linha é local e evita erro de digitação | DDA = banco; a leitura da linha não precisa de nada externo |
| 1.13 | Retenções na fonte no pagamento (IRRF, CSRF, INSS, ISS do tomador) | PLANO | `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md` (não commitado): linha 35 diz que o contas a pagar "não registra retenção nenhuma"; linhas 100–101; trilho futuro `RETENCOES-REINF`. Forks pendentes | Não | Média: o Simples tomador retém pouco, mas o ISS de SP sobre serviço tomado aparece | Não |
| 1.14 | Adiantamento a fornecedor | NÃO MAPEADO | O grep por `adiantamento` só acha o passivo do pacote (`passivo-adiantamento` do binding) | Não | Baixa | Não |
| 1.15 | **Rateio por centro de custo no título** | NÃO MAPEADO | Hoje a dimensão só entra pelo `postEntry` ou pelo lançamento manual (`dimensionTagging.ts`, chamado só por `PostingService` e `EntryApprovalService`). `PayableDto` e `PayableService` não têm `dimension`. O escopo do `ADR-INCR-DIM-dimensions.md:52-55` é só `postEntry` | Não | Média: um salão com 2 unidades já resolve pelo `unitId`. Rateio percentual entre centros de custo não existe | Não |
| 1.16 | Anexo da nota ou comprovante no título | CÓDIGO (só backend) | `attachmentId` no DTO (ADR AP F4 → b). A tela de criar título não tem upload: o grep `attach` em `CreatePayableModal.tsx` dá 0. O anexo só aparece no `JournalEntriesPanel.tsx` | Parcial | Média | Não |
| 1.17 | Despesa operacional como tabela DynamicTable (`Expenses`, categoria, `isPlanned`) | CÓDIGO | `presets/modules/finance/ExpensesModule.ts`. **Fica fora do razão e paralela ao `Payable`** (veja o risco R1) | Sim: `ExpensesTable.tsx` | — | — |

## 2. Contas a receber e cobrança

| # | Item | Classe | Evidência | Tela? | Relevância | Externo? |
|---|---|---|---|---|---|---|
| 2.1 | Título a receber avulso | CÓDIGO | `ReceivableService.ts`, FIN-02 | Sim: `AccountsReceivablePanel.tsx` | — | — |
| 2.2 | Venda do salão como faturamento (prazo, vencimento, meio de pagamento) | CÓDIGO | `presets/.../SalesModule.ts` (`paymentTermDays`, `dueDate`, `paymentMethod`), `sales/services/RegisterPaymentService.ts` | Sim: `SalesCreateModal.tsx`, `SaleDetailPanel.tsx` | — | — |
| 2.3 | Oportunidade ganha no CRM vira título a receber | CÓDIGO | FIN-13 | Sim (CRM) | — | — |
| 2.4 | **Recorrência ou assinatura** (clube mensal, mensalidade) | PLANO-órfão | `ADR-INCR-AR-accounts-receivable.md:197` F3 → (a) "fora do MVP"; destino 06.2 "contratos recorrentes PROPOSTO"; o ADR do F5 (linha 61) exclui cobrança recorrente | Não | **Média/alta**: clube de assinatura é comum em salão e estética | Provedor (cartão recorrente) |
| 2.5 | Parcelamento da venda em N títulos ou boletos | NÃO MAPEADO | A venda tem um só `dueDate`, e não existe "parcela" no AR | Não | Média: tratamento estético costuma ser parcelado | Não |
| 2.6 | Cobrança por boleto ou Pix no provedor (Mercado Pago) com webhook | CÓDIGO (sem tela) | `CollectionChargeService.ts`, `collection/MercadoPagoCollectionProvider.ts`, `collectionChargeController.ts`; os PRs #484, #609 e #615 **estão em main** (git log). A tela é o `FE-INCR-PAYMENT-PROVIDER-brief.md` (não commitado, forks F-FE-COB-1..8 pendentes) | **Não** | Alta | **MP + chave no env (M2)** |
| 2.7 | Cobrança por cartão ou link de pagamento | NÃO MAPEADO | `CollectionCharge.kind` só aceita `BOLETO | PIX` (schema:2481). O ADR do F5 não cobre cartão | Não | Média | Provedor |
| 2.8 | Pix no balcão (QR dinâmico por venda) | PLANO-órfão | Aparece só em `ADR-INCR-PAYMENT-PROVIDER-COLLECTION.md` §11, como "registrado, não planejado" | Não | Média | Provedor |
| 2.9 | **Régua de cobrança** (lembrete antes e depois do vencimento, por e-mail ou WhatsApp) | SÓ DESTINO | destino 06.8 "cobrança automática com régua PROPOSTO"; 18-caminho, onda 3. O grep `régua|dunning` no código e no vault volta vazio | Não | **Média/alta** | SMTP (o server não tem, destino 09:14) e WhatsApp Business API |
| 2.10 | Juros, multa e desconto | CÓDIGO parcial + PLANO | O encargo entra como sobra da linha do extrato (`BankSettlementItem.chargeCents`, F7). A classificação mora × punitiva e desconto condicional × incondicional fica na **emenda 3.3 do F7** (planejar autorizado 29/09, sem BRIEF). No título (boleto), só com o adaptador CNAB (ADR F5 §6.1), porque o MP não aceita (MP11) | Não (no título) | Média | Banco, para juros no boleto |
| 2.11 | Protesto | PLANO | ADR F5 §6.1 (adaptador CNAB, gate D6) e nó F5, decisão 7 | Não | Baixa | Banco |
| 2.12 | Negativação (Serasa, SPC, Boa Vista) | NÃO MAPEADO | O grep `negativa|serasa|SPC` só acha a frase de que o MP não suporta | Não | Baixa | Birô de crédito |
| 2.13 | Renegociação ou acordo de dívida | NÃO MAPEADO | O grep `renegocia` só acha texto de IN da RFB | Não | Baixa/média | Não |
| 2.14 | Adiantamento de cliente genérico (sinal para reservar horário) | NÃO MAPEADO | Só o pacote cai no passivo 2.1.1. Sinal de agendamento não tem tratamento | Não | **Média**: clínica estética costuma cobrar sinal | Não |
| 2.15 | Inadimplência e aging | CÓDIGO | `AgingReportService.ts`, FIN-04 | Sim: `AgingPanel.tsx` | — | — |
| 2.16 | Perda estimada (PDD) e baixa de título incobrável como perda | NÃO MAPEADO | O cancel do título estorna o reconhecimento, o que não é baixa como perda. "PDD" só aparece no código de ajuste do ECF (docs da Fase 3) | Não | Baixa | Não |
| 2.17 | Antecipação de recebíveis | NÃO MAPEADO | O grep `antecipação de receb|anticipation` volta vazio | Não | Média | Adquirente ou banco |
| 2.18 | **Conciliação de adquirente / maquininha** (taxa MDR, prazo D+30, parcelado, aluguel do POS) | PLANO-órfão + SÓ DESTINO | `ADR-D01-settlement-reversal.md:16,62,97` criou o "**Incremento F** (Acquirer Payout & Card Fees)", com evento `salon.card.payout.settled` e lançamento `D Banco líq / D Taxa / C 1.1.4` (`D0-d-settlement-ratification.md:74`). **Nunca virou nó**: o grep `card.payout` dá 0 no código e no vault. Destino 06.8 "conciliação de adquirente PROPOSTO". Hoje o cartão debita a conta `1.1.4` pelo bruto, e a baixa e a taxa ficam manuais | Não | **ALTA**: a maior parte da receita do salão entra por cartão, e a `1.1.4` acumula sem baixa | Arquivo EDI ou API da adquirente (o depósito já entra pelo OFX) |
| 2.19 | Tarifa do provedor como despesa | CÓDIGO (só MP) | `BankSettlementItem.feeCents` / `feeEntryId` (F5 PR-3). A tela é o `FE-INCR-BANK-SETTLEMENT-FEE`, planned | Não | Média | MP |
| 2.20 | Split comercial (a adquirente repassa direto a cota do profissional-parceiro) | NÃO MAPEADO | O grep `split de pagamento|splitPayment` não acha nada no código. "Split" no destino quer dizer o split **tributário** (2.21). A Lei 12.592, art. 1º-A § 2º, manda o salão **centralizar** recebimentos, então o split na adquirente é escolha de produto | Não | Média | Adquirente com split |
| 2.21 | Split payment tributário (IBS/CBS retido pelo liquidante) | SÓ DESTINO | destino 06.8, 10 e 18 ("a partir de 2027"); sem nó (o `M5-ibs-cbs` não fala de split) | Não | Média (horizonte 2027) | Liquidante e governo |
| 2.22 | **Gorjeta** (registro, repasse ao profissional, separada da receita) | NÃO MAPEADO | O grep `gorjeta|gratuity|tipCents` só acha texto da Res. CGSN em `fontes-oficiais` | Não | **Média**: gorjeta no cartão entra no caixa do salão e precisa ser repassada | Não |
| 2.23 | Cancelar ou devolver venda com estorno financeiro | CÓDIGO | `SalesCancellationService.ts`, FIN-08 | Sim: `SaleActionModals.tsx` | — | — |
| 2.24 | Estorno ou chargeback da cobrança | CÓDIGO | status `CHARGED_BACK` e `PARTIALLY_REFUNDED`, sem efeito no razão (F-PPB-8 b) | Não | Baixa | MP |

## 3. Tesouraria

| # | Item | Classe | Evidência | Tela? | Relevância | Externo? |
|---|---|---|---|---|---|---|
| 3.1 | Várias contas e caixas | CÓDIGO parcial | Cada conta é uma folha do plano (`1.1.1 Banco`, `1.1.3 Caixa`), o `BankStatement.glAccountId` aponta para ela, e a `PaymentAccount` cobre o MP. **Não existe entidade "conta bancária"** com banco, agência e conta (`M5-remessa.md`) | Sim (plano e conciliação) | Média | Não |
| 3.2 | **Caixa físico ou PDV**: abertura, fechamento, sangria, suprimento, operador | SÓ DESTINO | destino 03 (edição Essencial "vendas/PDV, agenda, caixa"), 18-caminho onda 3 "PDV + NFC-e". O grep `sangria|suprimento|abertura de caixa|cashRegister` dá 0 no código. A conta `1.1.3 Caixa` existe | Não | **ALTA**: o salão recebe em dinheiro e precisa conferir o caixa do dia por operador | Não |
| 3.3 | Fechamento de caixa diário por meio de pagamento (esperado × contado) | SÓ DESTINO | Cabe dentro do "caixa" do destino 03. Nada no código | Não | **Alta** | Não |
| 3.4 | Transferência entre contas | SÓ DESTINO | destino 06.8 "multi-conta com transferências PROPOSTO". Hoje só dá por lançamento manual (`JournalEntryModal.tsx`) | Parcial (lançamento manual) | Média: o depósito do dinheiro do caixa no banco é diário | Não |
| 3.5 | Saldo consolidado | CÓDIGO parcial | Balanço e razão (`AccountingReportService`), KPI "Saldo de Caixa" (`CashflowKpiProcessor.ts`, sobre DynamicTable). A consolidação entre unidades ou empresas está rejeitada (`R-torre-multiempresa`) | Sim | Média | — |
| 3.6 | Conciliação bancária OFX e CNAB 240, com auto-match e desfazer | CÓDIGO | `ReconciliationService.ts`, `lib/cnab.ts`, FIN-05 | Sim: `ReconciliationPanel.tsx` | — | — |
| 3.7 | Baixa por retorno bancário (proposta + confirmação humana) | CÓDIGO | `BankSettlementService.ts`, F7 | Sim: `BankSettlementPanel.tsx` | — | — |
| 3.8 | Extrato automático do MP (relatório de liberações diário) | CÓDIGO | `jobs/MpReleaseReportScheduler.ts` (F5 PR-3, #615) | Parcial: aparece como extrato importado; destravar e upload ficam no BRIEF de FE | Média | MP |
| 3.9 | **Open Finance** ou API do banco para extrato automático | SÓ DESTINO | destino 06.8 e 09 "Open Finance PROPOSTO". Nada em nó | Não | Média | **Sim**: quem recebe dados no Open Finance é instituição participante autorizada pelo BCB (Res. Conjunta 1/2020). Um ERP sem autorização precisa de agregador ou parceiro regulado (inferido da norma; fontes no fim) |
| 3.10 | Aplicações financeiras e rendimentos | NÃO MAPEADO | Não há conta de aplicação no plano (`ChartOfAccountsFixture.ts`) nem entidade | Não | Baixa | Banco |
| 3.11 | Empréstimos e financiamentos (contrato, cronograma SAC ou Price, juros × principal) | NÃO MAPEADO | A DFC só classifica o prefixo de financiamento (`CashFlowReportService.ts:30`). Não há contrato nem cronograma | Não | Média: clínica financia equipamento (laser) e salão pega capital de giro | Não |
| 3.12 | Cheques (recebidos e emitidos, pré-datados, custódia) | NÃO MAPEADO | O grep `\bcheques?\b` só acha "pré-cheque" | Não | Baixa | Não |
| 3.13 | Cartão de crédito corporativo (fatura e itens da fatura) | NÃO MAPEADO | O grep `cartão corporativo|fatura do cartão` volta vazio | Não | Média: insumo comprado no cartão da empresa | Não (o OFX da fatura funcionaria) |

## 4. Planejamento e análise

| # | Item | Classe | Evidência | Tela? | Relevância | Externo? |
|---|---|---|---|---|---|---|
| 4.1 | Fluxo de caixa realizado: DFC pelo método indireto | CÓDIGO | `CashFlowReportService.ts`, FIN-06 | Sim: `DFCPanel.tsx` | — | — |
| 4.2 | Fluxo realizado pelo método direto (entradas e saídas por categoria, dia a dia) | CÓDIGO parcial | Os KPIs `CashflowKpiProcessor.ts` leem as tabelas `sales` e `expenses` da DynamicTable, não o razão. Não existe extrato diário por categoria | Sim (dashboard de KPIs) | Alta | Não |
| 4.3 | Fluxo projetado | CÓDIGO | `CashForecastReportService.ts`, F4 | Sim: `CashForecastPanel.tsx` | — | — |
| 4.4 | Orçamento × realizado | SÓ DESTINO | destino 06.8 "orçamento vs realizado PROPOSTO"; destino 03 coloca na edição Avançado. Embrião em DynamicTable: `isPlanned` / `budgetGroup` em `ExpensesModule.ts`, `GoalsModule` com meta × real de vendas. Não há orçamento por conta e mês | Não | Média | Não |
| 4.5 | DRE gerencial separada da contábil | CÓDIGO parcial | DRE por dimensão (`DimensionReportService.resultByDimension`, `DimensionReports.tsx`), KPIs de lucro sobre DynamicTable (`ProfitKpiProcessor.ts`). Destino 06.8 "DRE gerencial por centro de custo PROPOSTO". Falta uma estrutura gerencial própria, com agrupamento diferente do plano contábil | Sim (parcial) | Média | Não |
| 4.6 | Categorias e plano gerencial | CÓDIGO | Plano de contas editável, `expenseCategory` na DynamicTable | Sim | — | — |
| 4.7 | Centros de custo e projetos | CÓDIGO | `DimensionService.ts`, M5-dimensoes | Sim: `DimensionsPanel.tsx` | — | — |
| 4.8 | Prazo médio de recebimento e de pagamento, liquidez, solvência | CÓDIGO | `CashflowKpiProcessor.ts`, itens 6, 9, 10 e 11 (sobre DynamicTable) | Sim | — | — |
| 4.9 | Margem bruta, operacional, líquida e de contribuição | CÓDIGO | `ProfitKpiProcessor.ts`, itens 7 a 10 | Sim | — | — |
| 4.10 | Ticket médio da venda ou atendimento | CÓDIGO parcial | Existe "Receita por Cliente" (`RevenueKpiProcessor`). `avgTicket` só existe no CRM (`CrmConversionProcessor.ts`) | Parcial | Média | Não |
| 4.11 | **Ponto de equilíbrio** | NÃO MAPEADO | O grep `ponto de equil|break-?even` dá 0 no código | Não | **Média/alta**: é pergunta típica do dono de salão | Não |
| 4.12 | EBITDA | NÃO MAPEADO | O grep `ebitda|lajida` dá 0 em tudo | Não | Baixa | Não |
| 4.13 | Ciclo de caixa e prazo médio de estoque | NÃO MAPEADO | Existem prazo médio de recebimento e de pagamento, mas não prazo médio de estoque nem ciclo | Não | Baixa (salão tem pouco estoque) | Não |
| 4.14 | Cenários e simulação | NÃO MAPEADO | O grep `cenário|scenario` não acha nada de domínio | Não | Baixa | Não |

## 5. Comissões e parceria

| # | Item | Classe | Evidência | Tela? | Relevância | Externo? |
|---|---|---|---|---|---|---|
| 5.1 | Cálculo da comissão por item e profissional, gerado quando a venda é finalizada | CÓDIGO | `rules/plugins/sales/commissions.ts` (`materializeCommissions`), percentuais no `EmployeesModule.ts` | Inferido: tabela genérica da DynamicTable no dashboard. Não há tela dedicada (grep `commission` em `my-app/features/*.tsx` = 0) | — | — |
| 5.2 | Comissão paga (Pending → Paid) | CÓDIGO, **sem efeito financeiro** | `CommissionsPlugin.ts` só carimba `paidAt`; não gera título nem lançamento (`PRE-ADR-PESSOAL…md:99`) | Inferido (genérica) | — | — |
| 5.3 | Comissão integrada ao contas a pagar e ao razão | PLANO | `PRE-ADR-PESSOAL…md:343-345` ("comissão→repasse/folha é serviço de aplicação"); `PARECER-ARCHITECT-ADR-P2.md:35` | Não | Alta | Não |
| 5.4 | Regras avançadas de comissão (sobre o líquido da taxa do cartão, menos o custo do produto usado, faixa por meta) | NÃO MAPEADO | Hoje é `commission` fixo por item. O grep por regra de base líquida volta vazio | Não | **Média/alta**: descontar a taxa do cartão antes de comissionar é prática comum | Não |
| 5.5 | Contrato de parceria (Lei 12.592): cota do salão, homologação, vigência | CÓDIGO (só backend) | `model SalaoParceriaContrato` (schema:2612), rota `/api/accounting/simples/parcerias`. Só serve para segregação fiscal (X14) | **Não** (grep `parceria` no FE = 0) | Alta | Sindicato (homologação) |
| 5.6 | Repasse ao profissional-parceiro com retenção | PLANO | `PRE-ADR-PESSOAL…md:331-337` F-PES-6 (a), trilho `PARCERIA-REPASSE`. **Pendente** e não commitado | Não | **Alta** | Não |
| 5.7 | **Extrato do profissional** (comissões, repasses, vales, saldo) | NÃO MAPEADO | Não existe relatório por `employeeId` | Não | **Alta**: o profissional cobra o extrato todo mês | Não |
| 5.8 | Vale ou adiantamento ao profissional, descontado no repasse | NÃO MAPEADO | Nada encontrado | Não | Média | Não |

## 6. Pré-pago, crédito e fidelidade

| # | Item | Classe | Evidência | Tela? | Relevância | Externo? |
|---|---|---|---|---|---|---|
| 6.1 | Pacote pré-pago (saldo, consumo, passivo 2.1.1, reconcile) | CÓDIGO | `packages/services/PackageBalanceService.ts`, FIN-12, FE-INCR-VENDA-PACOTE | Sim: wizard de venda | — | — |
| 6.2 | Validade do pacote e receita por não uso (3.4) | CÓDIGO (não implantado) | #483, #530; nó PACOTE-VALIDADE inflight | Sim | — | — |
| 6.3 | **Vale-presente (gift card)** | NÃO MAPEADO | Só aparece como jurisprudência análoga em `PACOTE-VALIDADE.md:39` | Não | Média: presente é comum em estética | Não |
| 6.4 | Crédito do cliente (haver por devolução, troco, pagamento a maior) | NÃO MAPEADO | O grep `store credit|crédito do cliente` volta vazio | Não | Média | Não |
| 6.5 | Cashback ou fidelidade por pontos | NÃO MAPEADO | Só existe a flag `isLoyalCustomer` (`SalesModule.ts:76`) e o tipo `Loyalty` em `CampaignsModule` | Não | Média | Não |

## 7. Multi-moeda e câmbio

| # | Item | Classe | Evidência | Tela? | Relevância | Externo? |
|---|---|---|---|---|---|---|
| 7.1 | Multi-moeda na transação (`transactionCurrencyCode` / `exchangeRate`) | REJEITADO | `rejeitadas/R-multimoeda.md` (BRL-only, campo reservado no `AccountingScope`) | — | Baixa | — |
| 7.2 | Câmbio realizado e monitor de câmbio no AR | REJEITADO (com direção registrada) | Mesmo arquivo: a direção de 29/09 aponta um "ADR de moeda no Contas a Receber", mas o estado segue `rejected` até esse ADR ser ratificado; a autorização para redigir ainda não foi dada | — | Baixa | — |
| 7.3 | PTAX do BCB **só para exibir** no CRM | PLANO | nó CRM-RB (planned; `PtaxRate` em `features/fx`; falta o "executa"). Não reabre o R-multimoeda | Não | Baixa | API PTAX do BCB |

## 8. Controles

| # | Item | Classe | Evidência | Tela? | Relevância | Externo? |
|---|---|---|---|---|---|---|
| 8.1 | Maker-checker do lançamento | CÓDIGO | `EntryApprovalService.ts`, M5-torre-aprovacao | Sim: `EntryApprovalsPanel.tsx` | — | — |
| 8.2 | Aprovação por **alçada de valor** (no pagamento ou no lançamento) | NÃO MAPEADO | Não há limite por valor no `EntryApprovalService`. O ADR-INCR-DIM deixa "alçada/RBAC" **FORA** (linha 55), mas como exclusão, não como plano | Não | Baixa | Não |
| 8.3 | Perfis de acesso | CÓDIGO parcial + diferido | Métodos `can*` em `IAccountingPolicy.ts` e `Role` no `User`. O RBAC granular está em `diferidos/M5-lgpd-rbac.md` (⚫, parcial) | Parcial | Média: a recepcionista não deveria ver o financeiro | Não |
| 8.4 | Trilha de auditoria encadeada | CÓDIGO | `AuditEvent` e `AuditChainHead` | — | — | — |
| 8.5 | Anexos de comprovante | CÓDIGO | `DocumentAttachmentService.ts` (veja o 1.16 sobre a tela) | Parcial | — | — |
| 8.6 | Fechamento do caixa diário | SÓ DESTINO | O mesmo do 3.3 | Não | Alta | Não |

## 9. Integração

| # | Item | Classe | Evidência | Tela? | Relevância | Externo? |
|---|---|---|---|---|---|---|
| 9.1 | Webhook de entrada do provedor | CÓDIGO | Webhook do MP (F5 PR-2, #609) | — | — | MP |
| 9.2 | API pública com chave e webhooks de saída | SÓ DESTINO | destino 09:19 (GATILHO P5), 18 onda 6. Existe o OpenAPI estático, mas não há API key de tenant | Não | Baixa | — |
| 9.3 | E-commerce e marketplace | SÓ DESTINO | destino 09:18, 11 (varejo) | Não | Baixa | Plataformas |
| 9.4 | Integração por API com o banco do cliente | PLANO | gate **D6** (convênio e leiaute do banco), M5-remessa | Não | Baixa/média | Banco |
| 9.5 | Importação e exportação de dados (CSV) | CÓDIGO | `DataExchangeImportService.ts` / `DataExchangeExportService.ts` | Sim: `ImportExportPanel.tsx` | — | — |

---

## Riscos encontrados durante o mapeamento (fora da classificação)

- **R1. Duas fontes de despesa e receita.** Os KPIs de gestão (fluxo, margem, prazo médio de pagamento) leem as tabelas
  `expenses` e `sales` da DynamicTable. O contas a pagar formal (`Payable`) e o razão são outra fonte. Uma despesa
  lançada só no `Payable` não aparece no KPI, e o inverso também vale. **Inferido** pela leitura dos templates
  (`CashflowKpiTemplate.ts`: `expensesTableKey`). Não rodei o cenário.
- **R2. A conta `1.1.4 A Receber Cartão` não tem baixa automática.** O "Incremento F" do ADR-D01 foi aceito como
  dívida ("accepted, documented", linha 114) e depois sumiu do vault. Item 2.18.
- **R3. A nota F5 do vault está defasada.** O `estado_detalhe` diz que o PR-2 #609 está "aberto, sem merge", mas o
  `git log` de main tem o #609 (ac80e1f8), o #615 (2f942f73) e os fixes #621/#623. Isso pede fold.

## Fontes externas

- Res. Conjunta BCB/CMN nº 1/2020 (Open Finance; define a instituição receptora como participante):
  https://normativos.bcb.gov.br/Lists/Normativos/Attachments/51028/Res_Conj_0001_v9_L.pdf
- Lei 12.592/2012, art. 1º-A (incluído pela Lei 13.352/2016), já transcrito em `PRE-ADR-PESSOAL…md:174-177`:
  https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12592.htm
