---
id: "FE-INCR-FIXED-ASSETS"
tipo: "fe"
dominio: "contabil"
titulo: "Tela do C8 (imobilizado)"
estado: "planned"
estado_detalhe: "BE do C8 em main (5/5 PRs: #354–#356, #366, #368). 02/10: BRIEF escrito (sessao-planejamento) — 34 itens em 2 PRs (aba Imobilizado: bens/classes/taxas/contas + depreciação/reconcile; fatia NF-e classId); 7 forks F-FAFE-1..7 PENDENTES com recomendação. Fato novo: #461 (ITEM-DESTINATION, EMENDA item 23) tirou o CFOP do roteamento — F-B2-2 → a ficou sem objeto (F-FAFE-1). Falta ratificar os forks e o 'executa'"
depende_de: ["[[C8]]", "[[ITEM-DESTINATION]]?"]
autorizacao: "dono, chat, 2026-10-02: \"Autorizo planejar o BRIEF FE-INCR-FIXED-ASSETS (dono, 02/10) — só o BRIEF, sem 'executa'.\""
ancora_sdd: "§III.1 (fora da régua)"
atualizado: "2026-10-02"
---
# FE-INCR-FIXED-ASSETS — Tela do C8 (imobilizado)

**Estado:** `planned` — BE do C8 em main (5/5 PRs: #354–#356, #366, #368). 02/10: BRIEF escrito (sessao-planejamento) — 34 itens em 2 PRs (aba Imobilizado: bens/classes/taxas/contas + depreciação/reconcile; fatia NF-e classId); 7 forks F-FAFE-1..7 PENDENTES com recomendação. Fato novo: #461 (ITEM-DESTINATION, EMENDA item 23) tirou o CFOP do roteamento — F-B2-2 → a ficou sem objeto (F-FAFE-1). Falta ratificar os forks e o 'executa'  
**Autorização:** dono, chat, 2026-10-02: "Autorizo planejar o BRIEF FE-INCR-FIXED-ASSETS (dono, 02/10) — só o BRIEF, sem 'executa'."  
**Depende de:** [[C8]], [[ITEM-DESTINATION]]? (só o PR-1, #461, já em main)  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 (fora da régua)

## Docs

- Decisão: [[D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE]]
- [`docs/accounting/FE-INCR-FIXED-ASSETS-brief.md`](../../accounting/FE-INCR-FIXED-ASSETS-brief.md) — BRIEF (02/10, `sessao-planejamento`): 34 itens / 2 PRs; forks F-FAFE-1..7 PENDENTES

## Evidência

- `docs/SDD-LUMINARIS.md:1514` → 17/09 sessão 6, F-FE-DL-1..4 [H]**; `FE-INCR-FIXED-ASSETS` (tela do C8) e `FE-INCR-SPED-SIGNERS` (combobox de qualificação,
