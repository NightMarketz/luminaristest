---
id: "D-2026-10-15-CRM-RB-TEMPLATES-ROTA"
tipo: "decisao"
dominio: "plataforma"
titulo: "Rota de modelos do builder de relatórios do CRM (BE) + PR-C da tela — executa e pares de moeda na mesma rota"
estado: "decided"
autorizacao: "dono, chat, 2026-10-15, questionário em resposta a 'Pode seguir implementando os planos de crm' — escopo: 'BE + PR-C (Recomendado)'; pares de moeda: 'Sim, na mesma rota (Recomendado)'"
atualizado: "2026-10-15"
---
# D-2026-10-15-CRM-RB-TEMPLATES-ROTA — executa da rota de modelos e do PR-C do [[FE-INCR-CRM-REPORT-BUILDER]]

**Estado:** `decided` (2 cédulas, as duas na recomendação).
**Autorização:** dono, chat, 15/10/2026. Pedido: *"Pode seguir implementando os planos de crm"*. O questionário da
sessão perguntou o escopo, porque o PR-C não tinha "executa" e o pré-requisito de BE (F-FRB4=(a)) não tinha BRIEF.

| Cédula | Opções | Decisão |
|---|---|---|
| Escopo do "executa" | BE + PR-C · só o BRIEF da rota · PR-C sem BE (reabre F-FRB4 → b) | **BE + PR-C**: BRIEF curto da rota, implementar a rota (PR 1) e o PR-C (PR 2, empilhado); nenhum merge sem OK por número |
| Pares valor→moeda | na mesma rota · só os modelos | **Na mesma rota**: `GET /api/crm/reports/templates` devolve `{ templates, moneyCurrencyPairs }`; o espelho manual `CRM_MONEY_CURRENCY_PAIRS_FE` sai |

Não cobre: item 23 (sign-off de browser, gate humano), o achado `JoinRef.rightField` e o valor de pipeline divergente.

BRIEF: [`docs/crm/BE-INCR-CRM-REPORT-TEMPLATES-brief.md`](../../crm/BE-INCR-CRM-REPORT-TEMPLATES-brief.md).
