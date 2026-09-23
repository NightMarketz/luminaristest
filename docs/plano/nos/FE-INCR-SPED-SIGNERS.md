---
id: "FE-INCR-SPED-SIGNERS"
tipo: "fe"
dominio: "contabil"
titulo: "Combobox de qualificação de signatário (BRIEF C12 §6.3, rota nova)"
estado: "blocked"
estado_detalhe: "BE C12 já mergeado (#353); texto de 17/09 ainda diz 'espera merge do BE'"
depende_de: ["[[C12]]"]
ancora_sdd: "§III.1 (fora da régua)"
atualizado: "2026-09-23"
---
# FE-INCR-SPED-SIGNERS — Combobox de qualificação de signatário (BRIEF C12 §6.3, rota nova)

**Estado:** `blocked` — BE C12 já mergeado (#353); texto de 17/09 ainda diz 'espera merge do BE'  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[C12]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 (fora da régua)

## Docs

- [`docs/accounting/BE-INCR-SPED-IDENTITY-MASKS-brief.md`](../../accounting/BE-INCR-SPED-IDENTITY-MASKS-brief.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1514` → 17/09 sessão 6, F-FE-DL-1..4 [H]**; `FE-INCR-FIXED-ASSETS` (tela do C8) e `FE-INCR-SPED-SIGNERS` (combobox de qualificação,
- `docs/SDD-LUMINARIS.md:1161` → > | **C12** máscaras de identidade no SPED | B — nó novo do re-baseline | ✅ BRIEF em `main` (#322 `1c469e2f`); 4 forks ✅ ratificados 16/09 (todos a) → `ready` **após transcrição J930/0930**, ~~falta "executa"~~ **"Executa C12" 18/09** → ✅ **MERGEADO #353 `edb80ec8` (20/09). Contábil 19/22 → 20/22** (fold 22/09). Residual = `FE-INCR-SPED-SIGNERS` (tela) | `BE-INCR-SPED-IDENTITY-MASKS-brief.md` |
