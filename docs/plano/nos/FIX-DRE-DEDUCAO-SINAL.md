---
id: "FIX-DRE-DEDUCAO-SINAL"
tipo: "plataforma"
dominio: "contabil"
titulo: "Resultado da DRE soma a dedução da receita (3.2/3.6) em vez de subtrair"
estado: "planned"
estado_detalhe: "Aberto 31/10 no preflight do H2 (passos 16–23): o `db:seed:accounting` saiu com exit 1 no tie-out do seed-presumido em 31/10/2026 (balancete fecha, BP não). Causa verificada: `computeDreNet` soma `revenueDeductions`, e a dedução de saldo devedor entra positiva na seção (regra `credit_negative` devolve o saldo cru, débito − crédito). O resultado fica inflado em 2 × a dedução. Cadeia: instrumentação (teste vermelho pelo resultado líquido) → correção. Executa dado pelo dono em 31/10"
depende_de: []
autorizacao: "dono, chat, 2026-10-31: \"Pode documentar o bug e disparar uma sessão pra corrigir\" — cobre instrumentação + correção deste nó"
prs: []
ancora_sdd: "—"
atualizado: "2026-10-31"
---
# FIX-DRE-DEDUCAO-SINAL — Resultado da DRE soma a dedução da receita

**Estado:** `planned` — aberto 31/10 no preflight do [[H2]] (passos 16–23). Executa dado pelo dono em 31/10.
**Autorização:** dono, chat, 2026-10-31: *"Pode documentar o bug e disparar uma sessão pra corrigir"* — instrumentação + correção.
**Depende de:** —
**Desbloqueia:** o tie-out do `db:seed:accounting` (P0 do [[H2]] e do [[H1]]) com venda devolvida no exercício; DRE/BP corretos na tela.
**Âncora no SDD consolidado:** —

## Sintoma (verificado, 31/10, `main` `8fc95db2`, dev.db real)

- `npm run db:seed:accounting -- --years 2025,2026 --i-have-a-backup` → `FALHOU: tie-out não fecha`. Só um corte:
  `seed-presumido`, `asOf 2026-10-31`, `trialBalanceBalanced: true`, `balanceSheetBalanced: false`. O seed não criou nada
  (`entriesCreated 0`); em 29/10 (H1 tentativa 4) o mesmo corte fechava.
- `GET /api/accounting/balance-sheet?unitId=cmuw4yqxg001jcii0iz2yb9rw&asOf=2026-10-31` (build de produção):
  `assets 23894602 · liabilities 3424876 · equity 11076634 · netResultLine 9425092 · balanced false` → A − (P + PL + R) = **−32000**.
- Razão direto no dev.db (lançamentos `Posted` até 31/10/2026, mesma unidade): resultado 2026 = 3.1 −12897009 · 3.2 +16000 ·
  3.3 −4961464 · 4.1 +6256866 · 4.2 +2192515 (débito − crédito) → resultado **9393092**. Diferença para o BP = 32000 = 2 × 16000,
  o saldo da `3.2 Devoluções de Vendas` (as duas devoluções do H2, 2026/0176 e 2026/0185, de 29 e 30/10).

## Causa (verificada por leitura)

- `AccountingReportService.ts:221` — `balanceCents = debitCents − creditCents`.
- `StatementMappingFixture.ts` — `dre.deductions` (3.2) e `dre.deductions_taxes` (3.6) usam `sign: 'credit_negative'`, e
  `applySign(raw, 'credit_negative') = raw`: dedução de saldo devedor sai **positiva** na seção (é o que
  `AccountingReportService.bp-dre.test.ts` fixa: 3.6.1 débito 650 → `'650'`).
- `AccountingReportService.ts` `computeDreNet` (~l. 245–275) — `netCents = grossRevenue + deductions + cogs + financial + expenses`:
  a dedução positiva **soma** ao resultado. Receita líquida = bruta − deduções (Lei 6.404 art. 187 I).
- Nenhum teste confere o resultado líquido com dedução de saldo devedor.

## Raio (inferido pelos chamadores de `computeDreNet`; a sessão confirma)

- `incomeStatement` — resultado da DRE na tela e onde mais ele for lido (J150 da ECD, se usar este campo).
- `balanceSheet` — `netResultLine` e o `balanced` do BP; `priorNetCents` dos diagnósticos.
- `~l. 743` — LAIR do Lucro Real trimestral (e-Lalur / ECF Real).
- Afeta todo tenant com devolução (3.2) ou PIS/COFINS sobre a receita (3.6, Presumido/Real) no período. O H1 tentativa 4 (2025)
  não tinha 3.2/3.6 com saldo e passou no PVA.

## Cadeia

1. **Instrumentação** (`sessao-instrumentacao`): teste-guarda que falha pelo motivo certo — resultado líquido da DRE e
   `balanced` do BP com 3.1 crédito + 3.2/3.6 débito; LAIR com dedução.
2. **Correção** (`sessao-correcao`): diff mínimo para o teste passar, sem mudar o sinal exibido da linha de dedução
   (fixado pelos testes existentes), salvo se a leitura do J150 mostrar que a seção é consumida com outro sinal.
3. Depois do merge: rodar de novo o `db:seed:accounting` no dev.db real e conferir o tie-out (P0 do H2).
