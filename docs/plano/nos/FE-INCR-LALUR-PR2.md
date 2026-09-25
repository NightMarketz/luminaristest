---
id: "FE-INCR-LALUR-PR2"
tipo: "fe"
dominio: "fiscal"
titulo: "FE-INCR-LALUR PR 2 — M410 + fechar trimestre + diagnóstico na tela"
estado: "ready"
estado_detalhe: "Crescimento do X4; falta 'executa'"
depende_de: ["[[X4]]"]
ancora_sdd: "§III.1 passo 6 · §III.2"
atualizado: "2026-09-23"
---
# FE-INCR-LALUR-PR2 — FE-INCR-LALUR PR 2 — M410 + fechar trimestre + diagnóstico na tela

**Estado:** `ready` — Crescimento do X4; falta 'executa'  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[X4]]  
**Desbloqueia:** [[H1b]] (pontilhada)  
**Âncora no SDD consolidado:** §III.1 passo 6 · §III.2

## Docs

- [`docs/accounting/FE-INCR-LALUR-brief.md`](../../accounting/FE-INCR-LALUR-brief.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1503` → | 6 | **FE-INCR-LALUR PR 2** (M410 + fechar trimestre + diagnóstico na tela) | contábil (crescimento X4) | `sessao-feature` | BRIEF FE-LALUR §3; `withAuth` ⇒ verificar contra build de produção; vitest com shim `React` global | PR + review + merge; numerador inalterado | **falta "executa"** | ⬜ [H] |
- `docs/SDD-LUMINARIS.md:1656` → FEL2["FE-INCR-LALUR PR 2<br/>M410 + fechar + diagnóstico na tela"]:::ready
- `docs/SDD-LUMINARIS.md:1700` → X4 --> FEL2
- `docs/SDD-LUMINARIS.md:1749` → | **FE-INCR-LALUR PR 2** | **ready** (F-FE-4 → a; 3C mergeado; PR 1 mergeado) — sem item de fila próprio: entra como crescimento do X4 quando o dono chamar | #315 ✅ · #316 ✅ | BRIEF FE-LALUR §3 |
