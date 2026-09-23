---
id: "M5-dimensoes"
tipo: "diferido"
dominio: "governanca"
titulo: "Dimensões (centro de custo/projeto)"
estado: "done"
estado_detalhe: "✅ #113 + FE #116"
prs: ["#113", "#116"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-dimensoes — Dimensões (centro de custo/projeto)

**Estado:** `done` — ✅ #113 + FE #116  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #113, #116  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1113` → | **Dimensões** (centro de custo/projeto — DimensionDefinition/Value/PostingDimension) | ✅ **Mergeado em `main`** (INCR-DIM, PR #113 `9a73392`, 2026-07-15; review independente PASS; **smoke-migration-gate DEPLOY-CLEARED**) | **ADR-INCR-DIM** ratificado fork-a-fork (F0→CONSTRUIR build completa; DIFERIR foi apresentado como recomendação de 1ª classe e recusado). Etiqueta **ORTOGONAL ao ledger** (metadado; não toca Σdébito=Σcrédito/período/numeração/idempotência/audit — invariante-mestre ACC-024). Catálogo **Prisma first-class** (F1): `DimensionDefinition`+`DimensionValue`(parentId/rollup)+`Posti
