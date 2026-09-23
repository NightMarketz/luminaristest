---
id: "M5-torre-aprovacao"
tipo: "diferido"
dominio: "governanca"
titulo: "Torre de aprovação (maker-checker, SoD)"
estado: "done"
estado_detalhe: "✅ #108 + Emenda F3"
prs: ["#108"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-torre-aprovacao — Torre de aprovação (maker-checker, SoD)

**Estado:** `done` — ✅ #108 + Emenda F3  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #108  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1112` → | **Torre de aprovação** (maker-checker, SoD, `submittedById`/`approvedById`/`version`/`contentHash`) | ✅ **Mergeado em `main`** (`docs/adr/ADR-INCR-APPROVAL-maker-checker.md`, PR #108 `1f4ff78`, 2026-07-14) + **Emenda F3 re-ratificada fork-a-fork** (§9 do ADR) | **ADR-INCR-APPROVAL**. Extensão do `JournalEntry` (migração aditiva: `submittedById`/`approvedById`/`version`/`contentHash` + `fiscalYear`/`entryNumber` **nullable** — nascem no approve, ACC-015). Ciclo por comandos `EntryApprovalService` (`createDraft`/`updateDraft`/`submit`/`approve`/`reject`, ACC-016) — **não** substitui `postEntry
