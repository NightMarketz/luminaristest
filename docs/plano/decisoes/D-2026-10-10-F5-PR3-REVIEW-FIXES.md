---
id: "D-2026-10-10-F5-PR3-REVIEW-FIXES"
tipo: "decisao"
dominio: "financeiro"
titulo: "Achados A1/A2 do review independente do #615 (F5 PR-3) — R1 (a) e R2 (a) decididos pelo dono"
estado: "decided"
autorizacao: "dono, chat, 2026-10-10: \"R1 a, R2 a\" — resposta aos 2 achados do review independente do PR #615"
atualizado: "2026-10-10"
---
# D-2026-10-10-F5-PR3-REVIEW-FIXES — achados do review do #615 ([[F5]])

**Estado:** `decided`.
**Autorização:** dono, chat, 2026-10-10: "R1 a, R2 a". A ordem era corrigir no próprio #615, mas ele já estava
mergeado (`2f942f73`). Por isso o coordenador mandou a correção para um PR novo contra `main`, e o R1/R2 valem
do mesmo jeito. Retorno: `.claude/retornos/f5-pr3-review-fixes.md`.

| # | Achado do review | Decisão (dono, chat, 2026-10-10) |
|---|---|---|
| A1 (ALTO) | Numa faixa sem movimento, o `mp_release` traz só as linhas de saldo. O `importStatement` dá 400 "Extrato sem linhas de dados", o job pega o mesmo arquivo a cada ciclo e a watermark nunca anda | **R1 (a)**: avança a watermark SEM criar extrato e grava o audit `payment_account.release_report_empty_range` (`paymentAccountId`, `fileName`, `fromUtc`, `toUtc`), que entra na allowlist. O import manual continua recusando extrato sem linhas |
| A2 (MÉDIO) | O arquivo do job sobrepõe um extrato já importado (upload manual ou arquivo regerado com outro sha256) e cai em 400 `release_report_overlap` a cada ciclo | **R2 (a)**: diante da sobreposição o job PARA naquela conta, grava um alerta visível e não tenta de novo até o operador agir. Nada é apagado sozinho |

## Como foi aplicado (escolhas que o R2 (a) delegou)

- **Alerta visível.** O `status` da PaymentAccount (`DRAFT | ACTIVE | CREDENTIAL_INVALID | DISABLED`) não foi
  usado, porque ele também governa a emissão de cobrança do PR-2: parar o relatório não pode parar a cobrança.
  Entrou a coluna nova `PaymentAccount.releaseReportBlockedReason` (nullable), exposta em `PaymentAccountView`, mais
  o audit `payment_account.release_report_blocked` (`paymentAccountId`, `fileName`, `fromUtc`, `toUtc`, `code`,
  `sourceIds`). Migração `20261012120000_add_payment_account_release_report_block`, com um único `ADD COLUMN`, que é
  atômico e não deixa estado de metade aplicada.
- **Como o operador destrava.** Ele resolve a sobreposição (por exemplo, exclui o extrato manual que cobre a faixa)
  e chama `POST /api/payment-accounts/:id/release-report/unblock` com `{ unitId }`. A chamada exige
  `canManagePaymentAccounts`, limpa o campo e grava `payment_account.release_report_unblocked`. O próximo ciclo
  baixa a faixa de novo. Se a sobreposição continuar, o job para outra vez: é um bloqueio por destravamento,
  nunca uma tentativa por ciclo. Conta que não está bloqueada responde 200 sem efeito.
- **Arquivo byte a byte igual ao manual** (mesmo sha256): o import devolve o extrato existente (idempotente, sem
  mudança) e a watermark anda. Isso não é sobreposição.

## Aberto

- Tela: o FE ainda não mostra `releaseReportBlockedReason` nem tem o botão de destravar. Fica para o BRIEF de FE
  do F5/F7, que o dono abre.
