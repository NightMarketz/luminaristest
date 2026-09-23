---
id: "PASSO-12"
tipo: "motor"
dominio: "motor"
titulo: "GAP-MAP 8 — deleteTableData ignora immutableAfter/lifecycle (teste + fork a/b)"
estado: "blocked"
estado_detalhe: "Espera 'instrumenta' + fork do dono (a guard no delete × b RESTRICT)"
ancora_sdd: "§III.1 passo 12 · §III.4"
atualizado: "2026-09-23"
---
# PASSO-12 — GAP-MAP 8 — deleteTableData ignora immutableAfter/lifecycle (teste + fork a/b)

**Estado:** `blocked` — Espera 'instrumenta' + fork do dono (a guard no delete × b RESTRICT)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 passo 12 · §III.4

## Docs

- [`docs/operating-manual/GAP-MAP.md`](../../operating-manual/GAP-MAP.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1509` → | 12 | **GAP-MAP 8 — `deleteTableData` ignora `immutableAfter`/`lifecycle`** | motor DynamicTable (fora da régua) | `sessao-instrumentacao`; fix só após fork | Guards 2/3 rodam só em `updateTableData`; delete = `beforeDelete` → `deleteConstraints` → soft delete. Teste = `immutableAfter scope:'all'` satisfeito → `deleteTableData` deve lançar. **Fork do fix é do dono:** (a) guard no delete × (b) `deleteConstraints` RESTRICT no pai | teste-guarda vermelho; fork ratificado; depois `sessao-correcao` | **falta "instrumenta"** + fork | ⬜ [H] |
- `docs/SDD-LUMINARIS.md:1946` → ### Passo 12 — GAP-MAP 8, Instrumentação + Fork Decision
