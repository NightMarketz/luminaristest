---
id: "M5-source-document"
tipo: "diferido"
dominio: "governanca"
titulo: "SourceDocument + JournalEntrySource (proveniência formal)"
estado: "done"
estado_detalhe: "✅ BE-INCR-8 #43"
prs: ["#43"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-source-document — SourceDocument + JournalEntrySource (proveniência formal)

**Estado:** `done` — ✅ BE-INCR-8 #43  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #43  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1104` → | **SourceDocument + JournalEntrySource** (proveniência formal) | ✅ **Mergeado em `main`** (BE-INCR-8, PR #43, 2026-07-08; review independente PASS; commit de feature `a18886c`) | **ADR-INCR8** (altitude **A1 seam fino**). First-class Prisma: `SourceDocument`+`JournalEntrySource` (migração additiva, 0 ALTER), `SourceProvenanceRepository`, DTO `sourceDocument?` `.strict()`, seam na tx do `postEntry` (origem+link+audit `entry.source_recorded` átomos), import desdobra `externalReference`→`externalRef` com `sourceId` **byte-idêntico** (T7 intocada), no-cascade (sem FK User, D7). Consumidor (ECD/EC
