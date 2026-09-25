---
id: "CONT-15"
tipo: "regua"
dominio: "contabil"
titulo: "Tela de source-documents por lançamento"
estado: "done"
estado_detalhe: "✅ #293 (fold 08/09)"
prs: ["#293"]
ancora_sdd: "§M7.1"
atualizado: "2026-09-23"
---
# CONT-15 — Tela de source-documents por lançamento

**Estado:** `done` — ✅ #293 (fold 08/09)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #293  
**Âncora no SDD consolidado:** §M7.1

## Docs

- [`docs/accounting/FE-INCR-AUDIT-PROVENANCE-brief.md`](../../accounting/FE-INCR-AUDIT-PROVENANCE-brief.md)

## Evidência

- [`docs/accounting/CEDULA-DECISAO-2026-09-03-modulos.md:79`](../../accounting/CEDULA-DECISAO-2026-09-03-modulos.md)
- `docs/SDD-LUMINARIS.md:1436` → | **Contábil** | ~~13/17~~ ~~13/19 (68%)~~ **16/19 (84%, fold 2026-09-08: nós 14/15 `verify-chain`+`source-documents` ✅ #293, nó 17 pendências do reconcile ✅ #296)** | 16/22 | e-mail ECD/ECF ao contador (ADR Accepted por delegação + BRIEF ✅ #290 `62b00302`, 2026-09-08, 2 forks novos pendentes — Fork Novo A `year` no DTO/Fork Novo B sem F-CD8-b, condicionado ao F-Z0), **imobilizado/depreciação (ADR, F-Z0)**, **retificação ECD/ECF** | B-4, H1 (ECD), H2 |
- `docs/SDD-LUMINARIS.md:1127` → | **Telas do já-existente sem consumidor FE** | ✅ **Mergeadas em `main`**, ambas rodada 4 SDD 2026-09-08 — `FE-INCR-AUDIT-PROVENANCE` (PR #293 `05a1b413`, slice A, review PASS com 1 achado cosmético não-bloqueante) + `FE-INCR-COMPLIANCE-2` (PR #295 `2a4608ab`, slice B, review PASS; Fase B paridade i18n 939=939) | `audit/verify-chain` (botão "Verificar cadeia de auditoria" no `JournalEntriesPanel`, agora consumido) + `source-documents` por lançamento (botão "Proveniência" por linha, agora consumido); `sped/ecf/real/generate` (`SpedEcfRealPanel`, agora consumido) + `referential/catalog/import` (
