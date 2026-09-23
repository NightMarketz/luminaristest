---
id: "M5-caixa-projetado"
tipo: "diferido"
dominio: "governanca"
titulo: "Fluxo de caixa projetado (read-only)"
estado: "done"
estado_detalhe: "✅ #298; = régua F4"
prs: ["#298"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-caixa-projetado — Fluxo de caixa projetado (read-only)

**Estado:** `done` — ✅ #298; = régua F4  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #298  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1124` → | **Fluxo de caixa projetado** (read-only) | ✅ **Mergeado em `main`** (FE-INCR-CASH-FORECAST, PR #298 `63ceba20`, 2026-09-08, rodada 5 SDD; review indep. PASS com 1 achado ALTO não-bloqueante — teste cross-tenant ausente, classe pré-existente na família de reports) | `CashForecastReportService.ts` first-class Prisma read-only, horizonte 90 dias fixo (F-CF1→a), saldo inicial derivado do razão via `AccountingReportService.balancesAsOf`+`isCashAccount` (F-CF2→a), granularidade diária (F-CF3→a), policy AND payable/receivable (F-CF5→a); helper `outstandingLines.ts` extraído de `AgingReportService`
