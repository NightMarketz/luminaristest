---
id: "CSLL-LC224"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Alíquotas da CSLL pela LC 224/2025 — linhas v4 de CSLL_ALIQUOTA + códigos ECF 3/7/8 (BE-INCR-CSLL-ALIQUOTA-LC224)"
estado: "ready"
estado_detalhe: "09/10: BRIEF escrito; F-CA-1..6 ratificados por questionário (F-CA-3 e F-CA-6 contra a recomendação). Sem 'executa'. Pendências externas P-CA-1..4 (texto da LC 224 no DOU, redação anterior, regra do PVA para 7/8, rateio no Real anual)"
depende_de: ["[[LEGAL-PARAMS]]", "[[X7]]"]
autorizacao: "dono, chat, 2026-10-09: \"Planeja a atualização de CSLL_ALIQUOTA pela LC 224/2025 — sessao-planejamento, sem 'executa'\"; F-CA-1..6 ratificados por questionário no mesmo dia; \"Cria a nota do nó CSLL-LC224 e abre o PR do BRIEF\" — sem 'executa' · dono, chat, 2026-10-10 ([[D-2026-10-10-QUESTIONARIO-DONO]]): executa depois de conferir P-CA-1/2 na fonte oficial; P-CA-3/4 como aviso no PR"
ancora_sdd: "—"
atualizado: "2026-10-09"
prs: []
---
# CSLL-LC224 — alíquotas da CSLL pela LC 224/2025

**Estado:** `ready` — BRIEF com forks ratificados. Código só depois de um `executa` do dono.

## Escopo

- Linhas v4 de `CSLL_ALIQUOTA`, só acréscimos (`supersedesId = null`): `3` = 20%; `7` = 9% → 12% → 15%; `8` = 15% → 17,5% → 20%.
- Enum `indAliqCsll` ampliado para `['1','3','4','7','8']` nos 3 DTOs (F-CA-3 b).
- Real anual/estimativa com código `7`/`8` ⇒ 400 (F-CA-4 a).

## Docs

- [`docs/accounting/BE-INCR-CSLL-ALIQUOTA-LC224-brief.md`](../../accounting/BE-INCR-CSLL-ALIQUOTA-LC224-brief.md) — BRIEF + forks F-CA-1..6

## Desbloqueia

- Apuração de CSLL de instituição de pagamento, SCFI e banco no [[X7]] (a decisão do F-CA-3 abre esse público).
