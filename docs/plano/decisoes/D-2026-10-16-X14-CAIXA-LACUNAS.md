---
id: "D-2026-10-16-X14-CAIXA-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "X14-CAIXA: lacunas L1 (estorno no caixa) e L2 (transição competência → caixa) decididas na execução do PR-2"
estado: "decided"
autorizacao: "dono, questionário, 2026-10-16 (repassado pela sessão-mãe da execução): \"Deduz no mês do estorno\" e \"Só vendas de ano no caixa\""
atualizado: "2026-10-16"
---
# D-2026-10-16-X14-CAIXA-LACUNAS — lacunas de spec do PR-2 do X14-CAIXA

**Estado:** `decided`. **Autorização:** dono, questionário, 2026-10-16. Nó: [[X14-CAIXA]].
BRIEF: [`BE-INCR-SIMPLES-CAIXA-brief.md`](../../accounting/BE-INCR-SIMPLES-CAIXA-brief.md). Decisão anterior: [[D-2026-10-15-X14-CAIXA-FORKS]].

## Cédulas

| # | Lacuna | Escolha do dono (literal) | Recomendação | Diverge? |
|---|---|---|---|---|
| L1 | O item 8 (base = só recebimentos ACTIVE) contradiz o item 14 (estorno deduz no mês do estorno): lidos juntos, a dedução sai dobrada | "Deduz no mês do estorno" — (a) base(PA) = recebido no PA (ACTIVE + REVERTED) − estornado/devolvido no PA; o PA de origem não é recalculado | (a) | não |
| L2 | Venda auferida em ano por competência (já tributada) recebida em ano no caixa entraria de novo na base; o mesmo para o art. 20 I | "Só vendas de ano no caixa" — (a) a base caixa e o art. 20 contam só vendas auferidas em ano com perfil CAIXA | (a) | não |

Fundamento de L1: Res. CGSN 140 art. 17 I (dedução no mês da devolução) e p.ú. (no caixa, limitada ao efetivamente
devolvido); art. 18 § 1º. L2 é leitura **sem texto expresso**: a Res. CGSN 140 arts. 16–20 (redação vigente) e o Manual
do PGDAS-D de 17/06/2025 (§5.1) não tratam da entrada no caixa. Vira a ambiguidade **A3** no §5 do BRIEF, com alerta
INFO `RECEBIMENTO_DE_VENDA_TRIBUTADA_POR_COMPETENCIA` na apuração e pergunta ao contador.
