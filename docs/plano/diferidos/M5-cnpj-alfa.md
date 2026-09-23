---
id: "M5-cnpj-alfa"
tipo: "diferido"
dominio: "governanca"
titulo: "CNPJ alfanumérico (transversal)"
estado: "done"
estado_detalhe: "✅ #280"
prs: ["#280"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-cnpj-alfa — CNPJ alfanumérico (transversal)

**Estado:** `done` — ✅ #280  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #280  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1131` → | **CNPJ alfanumérico** (IN RFB 2.229/2024; produção desde 01/07/2026; NT 2026.004 na NF-e) | ✅ **MERGEADO 2026-09-08 — PR #280 (`76c8defb`), rodada 1 do plano SDD.** BRIEF #272, forks F-CNPJ-1..5 ratificados 07/09 (F-CNPJ-4 → b: rigor também no parser). `lib/cnpj.ts` (formato + DV ASCII−48 + chave NT 2026.004), 4 regex dos DTOs ECD/ECF, coerência chave×CNPJ×cDV no parser e no teste (fixtures sintéticos corrigidos: DVs e cDV estavam errados), `Counterparty.normalizeTaxId` sem `\D`. Review independente PASS. Pendente externo: Manual da ECD não lido — prova é o PVA (H1). ~~⏳ BRIEF `BE-INCR-CNPJ-
