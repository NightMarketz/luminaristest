---
id: "FIS-08"
tipo: "regua"
dominio: "fiscal"
titulo: "NF-e — BE + UI"
estado: "done"
estado_detalhe: "✅ #267/#283/#286 (fold 08/09)"
prs: ["#267", "#283", "#286"]
ancora_sdd: "§M7.1"
atualizado: "2026-09-23"
---
# FIS-08 — NF-e — BE + UI

**Estado:** `done` — ✅ #267/#283/#286 (fold 08/09)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #267, #283, #286  
**Âncora no SDD consolidado:** §M7.1

## Docs

- [`docs/adr/ADR-INCR-NFE-fiscal-ingestion.md`](../../adr/ADR-INCR-NFE-fiscal-ingestion.md)

## Evidência

- [`docs/accounting/CEDULA-DECISAO-2026-09-03-modulos.md:122`](../../accounting/CEDULA-DECISAO-2026-09-03-modulos.md)
- `docs/SDD-LUMINARIS.md:1438` → | **Fiscal** | ~~4/12~~ ~~4/13~~ ~~5/13 (38%)~~ **7/13 (54%, fold 2026-09-08: nós 5/6 import catálogo + botão ECF Real ✅ #295; nó 8 NF-e BE+UI ✅ #267/#283/#286; nó transversal CNPJ alfanumérico ✅ #280)** | 7/15 | blocos L/M/N, NF-e, apuração de tributos (ADR), EFD-Contribuições (ADR, raso, por último), DCTFWeb (ADR), D3 sob Lucro Real, **emissão de DF-e via parceiro emissor (ADR, F-M7)** | X2, H1, H1 2ª passada, **parceiro emissor + certificado** |
- `docs/SDD-LUMINARIS.md:1205` → | 11 | **NF-e** (ingestão fiscal) — [ADR-INCR-NFE](../../adr/ADR-INCR-NFE-fiscal-ingestion.md) **RATIFICADO fork-a-fork 2026-07-20** (PR #131) | ✅ **BE MERGEADO 2026-09-03** (PR #267, squash `9fbe200f`: rebase da tag + fix BigInt + fork (a) LAC-E/F-D2 por item; review indep. FAIL→PASS; CI verde; smoke sobre `dev.db` real OK). **[FOLD 2026-09-08] UI MERGEADA:** `BE-INCR-NFE-PREVIEW` (#283 `83c70088`, `POST /api/nfe/preview` com `alreadyImported`, rodada 2a) + `FE-INCR-NFE` (#286 `af35bfc9`, aba "NF-e" 20ª do painel contábil: compra via preview + mapeamento com memória local, venda por seletor d
