---
id: "M5-referencial"
tipo: "diferido"
dominio: "governanca"
titulo: "Plano de Contas Referencial versionado"
estado: "done"
estado_detalhe: "✅ #58 (+ Track A #71, Track B #74)"
prs: ["#58", "#71", "#74"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-referencial — Plano de Contas Referencial versionado

**Estado:** `done` — ✅ #58 (+ Track A #71, Track B #74)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #58, #71, #74  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1106` → | **Plano de Contas Referencial versionado** (mapeamento Account→código RFB + diagnóstico de cobertura) | ✅ **Mergeado em `main`** (BE-INCR-9, PR #58, 2026-07-09; review independente PASS + smoke-gate PASS) | **ADR-INCR9** (`docs/adr/ADR-INCR9-referential-chart-mapping.md`). First-class Prisma: `ReferentialMapping` (migração aditiva, tabela nova vazia), `@@unique([userId,unitId,accountId,mappingVersion])` (versões coexistem — D2), SEM `deletedAt` (hard-delete + trilha no AuditEvent — D5), `mappingVersion` string livre (D1). Write com gate in-tx (Account ativo+folha, ACC-011) + `AuditService.ap
