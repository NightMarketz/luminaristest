---
id: "CSLL-LC224"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Alíquotas da CSLL pela LC 224/2025 — linhas v4 de CSLL_ALIQUOTA + códigos ECF 3/7/8 (BE-INCR-CSLL-ALIQUOTA-LC224)"
estado: "done"
estado_detalhe: "10/10: PR #599 — linhas v4 de CSLL_ALIQUOTA (3 desde 01/04/2026; 7/8 em 3 vigências até 2028), enum indAliqCsll 1/3/4/7/8 nos 3 DTOs, Real anual da CSLL com 7/8 ⇒ 400. P-CA-1/2 fechadas na fonte oficial; P-CA-3 (PVA aceita 7/8?) e P-CA-4 (rateio no anual) abertas, como aviso no PR. Achados: banco (3) sem alíquota no 1º tri/2026 (F-CA-1 a); Lei 15.525/2026 (resseguradora 9%) sem código no leiaute 12"
depende_de: ["[[LEGAL-PARAMS]]", "[[X7]]"]
autorizacao: "dono, chat, 2026-10-09: \"Planeja a atualização de CSLL_ALIQUOTA pela LC 224/2025 — sessao-planejamento, sem 'executa'\"; F-CA-1..6 ratificados por questionário no mesmo dia; \"Cria a nota do nó CSLL-LC224 e abre o PR do BRIEF\" — sem 'executa' · dono, chat, 2026-10-10 ([[D-2026-10-10-QUESTIONARIO-DONO]]): executa depois de conferir P-CA-1/2 na fonte oficial; P-CA-3/4 como aviso no PR"
ancora_sdd: "—"
atualizado: "2026-10-09"
prs: ["#599", "#614"]
---
# CSLL-LC224 — alíquotas da CSLL pela LC 224/2025

**Estado:** `done` — 10/10: PR #599 — linhas v4 de CSLL_ALIQUOTA (3 desde 01/04/2026; 7/8 em 3 vigências até 2028), enum indAliqCsll 1/3/4/7/8 nos 3 DTOs, Real anual da CSLL com 7/8 ⇒ 400. P-CA-1/2 fechadas na fonte oficial; P-CA-3 (PVA aceita 7/8?) e P-CA-4 (rateio no anual) abertas, como aviso no PR. Achados: banco (3) sem alíquota no 1º tri/2026 (F-CA-1 a); Lei 15.525/2026 (resseguradora 9%) sem código no leiaute 12  

## Escopo

- Linhas v4 de `CSLL_ALIQUOTA`, só acréscimos (`supersedesId = null`): `3` = 20%; `7` = 9% → 12% → 15%; `8` = 15% → 17,5% → 20%.
- Enum `indAliqCsll` ampliado para `['1','3','4','7','8']` nos 3 DTOs (F-CA-3 b).
- Real anual/estimativa com código `7`/`8` ⇒ 400 (F-CA-4 a).

## Docs

- [`docs/accounting/BE-INCR-CSLL-ALIQUOTA-LC224-brief.md`](../../accounting/BE-INCR-CSLL-ALIQUOTA-LC224-brief.md) — BRIEF + forks F-CA-1..6
- [`docs/accounting/BE-INCR-CSLL-BANCOS-Q1-brief.md`](../../accounting/BE-INCR-CSLL-BANCOS-Q1-brief.md) — fast-follow do F-CA-1 a: código 3 de 2020-03-01 a 2026-03-31 (F-CB-1..3; #614)

## Desbloqueia

- Apuração de CSLL de instituição de pagamento, SCFI e banco no [[X7]] (a decisão do F-CA-3 abre esse público).
