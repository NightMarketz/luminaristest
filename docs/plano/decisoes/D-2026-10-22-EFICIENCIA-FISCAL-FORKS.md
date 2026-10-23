---
id: "D-2026-10-22-EFICIENCIA-FISCAL-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-EF-14..17 do BRIEF EFICIENCIA-FISCAL ratificados por questionário, todos pela recomendação (a); F-EF-16 reabre o F-DFE-15 (a)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22: \"Dispara 1 pra ratificar os forks\" (sessão de ratificação aberta pela sessão de origem). Respostas no AskUserQuestion de 22/10, 1 rodada. Decide forks; NÃO é 'executa' nem merge"
atualizado: "2026-10-22"
---
# D-2026-10-22-EFICIENCIA-FISCAL-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-22 — *"Dispara 1 pra ratificar os forks"*. As opções vieram de
`docs/accounting/BE-INCR-EFICIENCIA-FISCAL-brief.md` §5 (#846). Nó: [[EFICIENCIA-FISCAL]].

## Respostas do dono (literal = o rótulo escolhido no questionário)

| Fork | Resposta literal | Opção | O que fica decidido |
|---|---|---|---|
| F-EF-14 piso no proporcional | "(a) Avisa no proporcional (Recomendado)" | (a) | `ITEM_ABAIXO_DO_PISO`/`COMBO_ABAIXO_DO_CUSTO` = WARN sob PROPORCIONAL, BLOCK sob CARGA (`severidadePisoProporcional` = WARN, sem PUT) |
| F-EF-15 razão e DPS por item | "(a) Peso líquido (Recomendado)" | (a) | `splitRevenueCredit` e o `splitCents` da DPS usam o peso líquido quando há `discountCents`; venda legada no bruto (toca o ADR-INCR-REVENUE-SPLIT D5) |
| F-EF-16 destaque do desconto | "(a) Destacar (Recomendado)" | (a) | `vServ` = catálogo, `vDescIncond` = Σ `discountCents` do grupo; **reabre o F-DFE-15 (a)** |
| F-EF-17 padrão do pacote | "(a) Não mudar default (Recomendado)" | (a) | `pacoteFatoGerador` segue `CONSUMO`; padrão por regime só como alerta e sugestão |

Nenhuma escolha contra a recomendação.

## Efeito

Com F-EF-14..16 ratificados, o PR-1 deixa de esperar fork (o BRIEF §3 condicionava o `executa` a eles). O PR-2 segue bloqueado
pelo X10a. F-EF-15 e F-EF-16 mudam decisões escritas (ADR-INCR-REVENUE-SPLIT D5 e F-DFE-15 a): a emenda desses textos vai no
PR que implementar, não aqui.

## O que NÃO decide

Não é `executa`, não é merge e não responde P-EF-1, 6, 7, 8, 11, 12.
