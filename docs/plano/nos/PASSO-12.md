---
id: "PASSO-12"
tipo: "motor"
dominio: "motor"
titulo: "GAP-MAP 8 — deleteTableData ignora immutableAfter/lifecycle (teste + fork a/b)"
estado: "done"
estado_detalhe: "✅ #390 c9c16540 (28/09): GAP-MAP 8 instrumentado + corrigido pelo fork (a) do dono (26/09) — delete respeita immutableAfter scope:'all'; #384 992b7254 = shape/fork/gate do orquestrador (passos 11–12) · 28/09 tarde: #409 a090ce5f — o lote (deleteTableDataBatch) respeita immutableAfter scope:'all'; #415 6d8f651e — o lote aplica RESTRICT/CASCADE/hooks do individual (dono: \"Sim deve respeitar as regras de delete\"). Abertos no GAP-MAP: guarda lida fora do tx (TOCTOU); beforeDelete do individual fora da tx (#417)"
prs: ["#384", "#390", "#409", "#415"]
ancora_sdd: "§III.1 passo 12 · §III.4"
atualizado: "2026-09-28"
---
# PASSO-12 — GAP-MAP 8 — deleteTableData ignora immutableAfter/lifecycle (teste + fork a/b)

**Estado:** `done` — ✅ #390 c9c16540 (28/09): GAP-MAP 8 instrumentado + corrigido pelo fork (a) do dono (26/09) — delete respeita immutableAfter scope:'all'; #384 992b7254 = shape/fork/gate do orquestrador (passos 11–12) · 28/09 tarde: #409 a090ce5f — o lote (deleteTableDataBatch) respeita immutableAfter scope:'all'; #415 6d8f651e — o lote aplica RESTRICT/CASCADE/hooks do individual (dono: "Sim deve respeitar as regras de delete"). Abertos no GAP-MAP: guarda lida fora do tx (TOCTOU); beforeDelete do individual fora da tx (#417)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 passo 12 · §III.4  
**PRs:** #384, #390, #409, #415

## Docs

- [`docs/operating-manual/GAP-MAP.md`](../../operating-manual/GAP-MAP.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1509` → | 12 | **GAP-MAP 8 — `deleteTableData` ignora `immutableAfter`/`lifecycle`** | motor DynamicTable (fora da régua) | `sessao-instrumentacao`; fix só após fork | Guards 2/3 rodam só em `updateTableData`; delete = `beforeDelete` → `deleteConstraints` → soft delete. Teste = `immutableAfter scope:'all'` satisfeito → `deleteTableData` deve lançar. **Fork do fix é do dono:** (a) guard no delete × (b) `deleteConstraints` RESTRICT no pai | teste-guarda vermelho; fork ratificado; depois `sessao-correcao` | **falta "instrumenta"** + fork | ⬜ [H] |
- `docs/SDD-LUMINARIS.md:1946` → ### Passo 12 — GAP-MAP 8, Instrumentação + Fork Decision
