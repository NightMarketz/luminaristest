---
id: "M5-telas-ja-existente"
tipo: "diferido"
dominio: "governanca"
titulo: "Telas do já-existente sem consumidor FE"
estado: "done"
estado_detalhe: "✅ #293 + #295"
prs: ["#293", "#295"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-telas-ja-existente — Telas do já-existente sem consumidor FE

**Estado:** `done` — ✅ #293 + #295  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #293, #295  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1127` → | **Telas do já-existente sem consumidor FE** | ✅ **Mergeadas em `main`**, ambas rodada 4 SDD 2026-09-08 — `FE-INCR-AUDIT-PROVENANCE` (PR #293 `05a1b413`, slice A, review PASS com 1 achado cosmético não-bloqueante) + `FE-INCR-COMPLIANCE-2` (PR #295 `2a4608ab`, slice B, review PASS; Fase B paridade i18n 939=939) | `audit/verify-chain` (botão "Verificar cadeia de auditoria" no `JournalEntriesPanel`, agora consumido) + `source-documents` por lançamento (botão "Proveniência" por linha, agora consumido); `sped/ecf/real/generate` (`SpedEcfRealPanel`, agora consumido) + `referential/catalog/import` (
