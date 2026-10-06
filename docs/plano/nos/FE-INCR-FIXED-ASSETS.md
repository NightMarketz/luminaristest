---
id: "FE-INCR-FIXED-ASSETS"
tipo: "fe"
dominio: "contabil"
titulo: "Tela do C8 (imobilizado)"
estado: "done"
estado_detalhe: "BE do C8 em main (5/5 PRs: #354–#356, #366, #368). 02/10: BRIEF escrito (sessao-planejamento) — 34 itens em 2 PRs (aba Imobilizado: bens/classes/taxas/contas + depreciação/reconcile; fatia NF-e classId). Fato novo: #461 (ITEM-DESTINATION, EMENDA item 23) tirou o CFOP do roteamento — F-B2-2 → a ficou sem objeto. 02/10 (ratificação): F-FAFE-1..7 → todos (a) ([[D-2026-10-02-FE-INCR-FIXED-ASSETS-FORKS]]). Falta o 'executa' · 03/10: PR-1 (aba Imobilizado — itens 1–26 + 32–34) MERGEADO #486 (`8e337531`) + fix #491 (`a96b42c5`: valor líquido = custo − acumulada, sem descontar a abertura 2×). PR-2 (itens 27–31, fatia NF-e/classId) com 'executa' do dono 05/10 · 05/10: **PR-2 MERGEADO** #523 (`fc5cc884`): controle 'Tipo' Produto|Imobilizado por item costeado (não lê CFOP), `NfeItemMapping` como união discriminada productRef XOR classId, links para Classes/Taxas, memória de mapeamento intacta, tipo derivado do gerado. 34/34 itens em main. Residual: sign-off de browser (RUNBOOK-H2-IMOBILIZADO, em branco desde o PR-1 e já com o passo da NF-e; humano). Nota do #523: o link de taxa detecta o erro por /NCM/ na mensagem do BE (400 sem `code`) — acoplamento ao texto"
depende_de: ["[[C8]]"]
autorizacao: "dono, chat, 2026-10-02: \"Autorizo planejar o BRIEF FE-INCR-FIXED-ASSETS (dono, 02/10) — só o BRIEF, sem 'executa'.\"; dono, 2026-10-02: F-FAFE-1..7 ratificados por questionário (todos a) — sem 'executa'; dono, chat, 2026-10-03: \"Executa o PR-1 do FE-INCR-FIXED-ASSETS — só esta fatia (itens 1–26 + 32–34, aba Imobilizado); o PR-2 (itens 27–31, NF-e) fica fora.\"; dono, chat, 2026-10-05: \"Executa o PR-2 do FE-INCR-FIXED-ASSETS (itens 27–31, fatia NF-e classId)\" (citado no corpo do #523)"
ancora_sdd: "§III.1 (fora da régua)"
prs: ["#486", "#491", "#523"]
atualizado: "2026-10-06"
---
# FE-INCR-FIXED-ASSETS — Tela do C8 (imobilizado)

**Estado:** `done` — BE do C8 em main (5/5 PRs: #354–#356, #366, #368). 02/10: BRIEF escrito (sessao-planejamento) — 34 itens em 2 PRs (aba Imobilizado: bens/classes/taxas/contas + depreciação/reconcile; fatia NF-e classId). Fato novo: #461 (ITEM-DESTINATION, EMENDA item 23) tirou o CFOP do roteamento — F-B2-2 → a ficou sem objeto. 02/10 (ratificação): F-FAFE-1..7 → todos (a) ([[D-2026-10-02-FE-INCR-FIXED-ASSETS-FORKS]]). Falta o 'executa' · 03/10: PR-1 (aba Imobilizado — itens 1–26 + 32–34) MERGEADO #486 (`8e337531`) + fix #491 (`a96b42c5`: valor líquido = custo − acumulada, sem descontar a abertura 2×). PR-2 (itens 27–31, fatia NF-e/classId) com 'executa' do dono 05/10 · 05/10: **PR-2 MERGEADO** #523 (`fc5cc884`): controle 'Tipo' Produto|Imobilizado por item costeado (não lê CFOP), `NfeItemMapping` como união discriminada productRef XOR classId, links para Classes/Taxas, memória de mapeamento intacta, tipo derivado do gerado. 34/34 itens em main. Residual: sign-off de browser (RUNBOOK-H2-IMOBILIZADO, em branco desde o PR-1 e já com o passo da NF-e; humano). Nota do #523: o link de taxa detecta o erro por /NCM/ na mensagem do BE (400 sem `code`) — acoplamento ao texto  
**Autorização:** dono, chat, 2026-10-02: "Autorizo planejar o BRIEF FE-INCR-FIXED-ASSETS (dono, 02/10) — só o BRIEF, sem 'executa'."; dono, 2026-10-02: F-FAFE-1..7 ratificados por questionário (todos a) — sem 'executa'; dono, chat, 2026-10-03: "Executa o PR-1 do FE-INCR-FIXED-ASSETS — só esta fatia (itens 1–26 + 32–34, aba Imobilizado); o PR-2 (itens 27–31, NF-e) fica fora."; dono, chat, 2026-10-05: "Executa o PR-2 do FE-INCR-FIXED-ASSETS (itens 27–31, fatia NF-e classId)" (citado no corpo do #523)  
**Depende de:** [[C8]] (a fatia NF-e usa só o PR-1 do [[ITEM-DESTINATION]], #461, já em main)  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 (fora da régua)  
**PRs:** #486, #491, #523

## Docs

- Decisão: [[D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE]]
- Decisão: [[D-2026-10-02-FE-INCR-FIXED-ASSETS-FORKS]] — F-FAFE-1..7 → (a)
- [`docs/accounting/FE-INCR-FIXED-ASSETS-brief.md`](../../accounting/FE-INCR-FIXED-ASSETS-brief.md) — BRIEF (02/10, `sessao-planejamento`): 34 itens / 2 PRs; forks F-FAFE-1..7 ratificados 02/10 (todos a)

## Evidência

- `docs/SDD-LUMINARIS.md:1514` → 17/09 sessão 6, F-FE-DL-1..4 [H]**; `FE-INCR-FIXED-ASSETS` (tela do C8) e `FE-INCR-SPED-SIGNERS` (combobox de qualificação,
