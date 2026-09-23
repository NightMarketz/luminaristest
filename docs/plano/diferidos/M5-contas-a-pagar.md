---
id: "M5-contas-a-pagar"
tipo: "diferido"
dominio: "governanca"
titulo: "Contas a Pagar — AP operacional"
estado: "done"
estado_detalhe: "✅ #101/#102/#103/#105 + FE #106"
prs: ["#102", "#106"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-contas-a-pagar — Contas a Pagar — AP operacional

**Estado:** `done` — ✅ #101/#102/#103/#105 + FE #106  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #102, #106  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1114` → | **Contas a Pagar — AP operacional** (subrazão de despesa: `Payable`+`PayablePayment` first-class + pagamento + ledger) | ✅ **Mergeado em `main`** (Fase 0 PR #101 `88e411e`; Fases A+B PR #102 `4a6eddb`, 2026-07-14; hardening PR #103 reconcile-re-emit + PR #105 `b245825` CAS atômico exactly-once; ADR corrigido PR #104; `docs/adr/ADR-INCR-AP-accounts-payable.md`) — **2 reviews independentes PASS** (wiring FAIL→fix→PASS: tag jsdoc-openapi em prosa poluía o `openapi.json`); 1010/1010 testes + tsc×2 limpos; **smoke-migration-gate PASS** (`SMOKE-MIGRATION-GATE-INCR-AP.md`, cópia do dev.db real). **
