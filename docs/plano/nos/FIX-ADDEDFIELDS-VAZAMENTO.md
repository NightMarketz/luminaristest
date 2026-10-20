---
id: "FIX-ADDEDFIELDS-VAZAMENTO"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Onboarding Controle Total: addedFields mutava o preset compartilhado e vazava campo para o tenant seguinte"
estado: "done"
estado_detalhe: "20/10 (fold): #772 mergeado em main em 20/10 (04:44Z); nó fecha (done) · PR #772 aberto (teste-guarda 90673ae9 → fix 84a2720f); CI 11/12 verde em 19/10, 1 pendente; merge só com OK por número"
autorizacao: "sessão iniciada pelo dono no app a partir do cartão proposto, 2026-10-19 — o corpo do PR #772 não cita frase de autorização; o dono completa se quiser citação literal. Merge NÃO autorizado · fold R0 (dono, chat, 2026-10-20): \"Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a).\" — D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS (commit 6ca851d2, PR do plano de complemento); só o fold, não é executa"
prs: ["#772"]
atualizado: "2026-10-20"
---
# FIX-ADDEDFIELDS-VAZAMENTO — Onboarding Controle Total: addedFields mutava o preset compartilhado e vazava campo para o tenant seguinte

**Estado:** `done` — 20/10 (fold): #772 mergeado em main em 20/10 (04:44Z); nó fecha (done) · PR #772 aberto (teste-guarda 90673ae9 → fix 84a2720f); CI 11/12 verde em 19/10, 1 pendente; merge só com OK por número  
**Autorização:** sessão iniciada pelo dono no app a partir do cartão proposto, 2026-10-19 — o corpo do PR #772 não cita frase de autorização; o dono completa se quiser citação literal. Merge NÃO autorizado **Fold R0:** fold R0 (dono, chat, 2026-10-20): "Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a)." — D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS (commit 6ca851d2, PR do plano de complemento); só o fold, não é executa  
**Depende de:** —  
**PRs:** #772  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

## Lacuna

`handleCustomCreation` fazia `fields.push` no schema do singleton do preset. Provado: `BeautySalonPreset.tables.customers`
foi de 20 para 21 campos depois do create do tenant A, e o create rápido do tenant B instalou o campo do A. Correção:
reatribuir em vez de mutar.
