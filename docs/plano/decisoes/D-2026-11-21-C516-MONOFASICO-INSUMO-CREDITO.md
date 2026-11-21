---
id: "D-2026-11-21-C516-MONOFASICO-INSUMO-CREDITO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Crédito de PIS/Cofins do monofásico usado como insumo: chave por cliente no perfil fiscal, padrão LIGADO (D-5 reaberta)"
estado: "decided"
autorizacao: "dono, AskUserQuestion, 2026-11-21 (lacuna L-20261120-224253-c516, nó ITEM-DESTINATION): \"Ligada (reabre a D-5)\""
atualizado: "2026-11-21"
---
# D-2026-11-21-C516-MONOFASICO-INSUMO-CREDITO

**Estado:** `decided`. Reabre o padrão da D-5 de [[D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO]] ("configurável por cliente,
padrão sem crédito, o contador liga") e fecha o item 7 do BRIEF do [[ITEM-DESTINATION]] (F-ID-4, que rodava na etapa (c)).

## Decisão

- Chave `pisCofinsCreditMonofasicoInsumo` no perfil fiscal (`FiscalProfileDto`, coluna em `fiscal_profiles`), **padrão `true`**.
  Os perfis que já existem também ficam com a chave ligada (a migração usa `DEFAULT true`). O contador desliga por cliente.
- Com a chave ligada, o item `INSUMO_SERVICO` que é monofásico **pela tabela de NCM** credita PIS/Cofins pelo percentual
  básico (1,65% + 7,6%) no regime não cumulativo, **em qualquer CST** (inclusive 04/06 do distribuidor), com um warning
  que cita a fonte.
- Continua com crédito 0, com warning:
  - a chave desligada;
  - o item monofásico só pelo CST da nota, com o NCM fora da tabela;
  - o item `REVENDA`;
  - os regimes cumulativo e Simples.

## Fonte (dossiê `insumos-salao-sp`, 20/11)

- IN RFB 2.121/2022 art. 178 [D23]: "A vedação de que trata o inciso I do art. 160 não se aplica aos produtos a que se
  refere o art. 60 utilizados como insumos [...] desde que em alguma etapa anterior [...] tenha havido o pagamento".
  No monofásico, quem paga é o fabricante ou importador.
- SC Cosit 16/2024 [D28]: o crédito usa o percentual de 1,65% e "não pode utilizar a(s) alíquota(s) concentrada(s)".
- SC Cosit 496/2017 [D29], que a própria D-5 já usava para tornar o crédito configurável.

O art. 178 alcança o **produto do art. 60**, ou seja, a lista de NCM. Por isso o CST da nota não basta: o código só
credita quando o NCM está na tabela `PIS_COFINS_MONOFASICO_NCM`.

## Validade

A Lei 10.147 é revogada pela LC 214/2025 a partir de 2027. A chave vale para os períodos de 2026.
