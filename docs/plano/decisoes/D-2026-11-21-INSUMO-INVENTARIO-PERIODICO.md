---
id: "D-2026-11-21-INSUMO-INVENTARIO-PERIODICO"
tipo: "decisao"
dominio: "contabil"
titulo: "F-ID-3 reaberta: insumo do serviço vira estoque com ajuste por inventário periódico (c)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-21 (AskUserQuestion, lacuna L-20261120-223332-f79c): \"(c) Inventário periódico\" + \"Executa (BRIEF + PR)\""
atualizado: "2026-11-21"
---
# D-2026-11-21-INSUMO-INVENTARIO-PERIODICO — insumo do serviço em estoque, baixa por contagem

**Estado:** `decided`.
**Autorização:** dono, chat, 21/11/2026, AskUserQuestion da lacuna `L-20261120-223332-f79c`:
*"(c) Inventário periódico"* e *"Executa (BRIEF + PR)"*. O `executa` vale para o BRIEF
[`BE-INCR-INSUMO-INVENTARIO-PERIODICO-brief.md`](../../accounting/BE-INCR-INSUMO-INVENTARIO-PERIODICO-brief.md) inteiro
(D-2026-10-28-FLUXO-AUTONOMO).

## O que mudou

A F-ID-3 "a" ([[D-2026-09-29-ITEM-DESTINATION-FORKS]]: insumo vai para despesa na entrada da NF-e) é reaberta.
- **Fundamento:** NBC TG 1002 item 13.6 manda reconhecer o estoque como despesa "na forma de custo [...] do serviço
  vendido" no período da receita, e o item 13.2 manda levar a compra ao estoque pelo custo de aquisição (dossiê
  `insumos-salao-sp`, D12; fonte oficial <https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG1002.pdf>).
  A norma vale para a microentidade (receita até R$ 4,8 mi, item P2). Para a empresa maior (NBC TG 1000 / CPC 16) o
  princípio é o mesmo, mas o texto **não foi lido** nesta decisão.
- **Escolha (c):** a compra de insumo debita uma conta de **estoque de insumo** (ativo, separada da 1.1.6 da revenda).
  No fechamento, o salão informa o valor contado. O sistema lança a diferença entre o saldo contábil e o contado
  como custo (D conta de insumo / C estoque de insumo), ou o inverso se o contado for maior.
- **Descartadas:** (a) manter a despesa (fica fora do item 13.6) e (b) baixa por consumo (exige ADR do
  `InventoryItem`, movimento novo e apontamento de cada retirada pelo salão).

## O que o salão tem de fazer

Contar o estoque de insumo em cada fechamento. Com contagem mensal, todo mês fica certo. Com contagem só anual,
só o balanço de dezembro fica certo: os meses do meio continuam com o insumo no ativo até a contagem.

## Dependências e pendências

- **Lacuna irmã 35d3:** a linha de "custo dos serviços prestados" na DRE (NBC TG 1002 item 5.1 d) é dela. Aqui o
  débito do consumo vai para a `insumoExpenseAccountId` que o contador já configura.
- **P-4 do contador** (`PERGUNTAS-DE-LEI-2026-10-10.md:52`): fica respondida pela norma para a microentidade. Para a
  empresa acima de R$ 4,8 mi segue com o contador.
