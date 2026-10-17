---
id: "M5-cnpj-alfa"
tipo: "diferido"
dominio: "governanca"
titulo: "CNPJ alfanumérico (transversal)"
estado: "done"
estado_detalhe: "✅ #280"
prs: ["#280"]
ancora_sdd: "§M5"
atualizado: "2026-10-17"
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

## Verificação legal 17/10/2026

- O DV do CNPJ alfanumérico confere com o exemplo oficial da IN RFB 2.119 Anexo XV (`12ABC34501DE` → 35). A data **não** é "em produção desde 01/07/2026": a IN 2.119 art. 2º p.ú. compilada diz só "previsão de implementação a partir de julho de 2026" (dossiê [`verif-2026-10-17-lgpd-cdc-obrigacoes`](../../../pesquisas-legais/verif-2026-10-17-lgpd-cdc-obrigacoes/relatorio.md) #8–9 [D24][D26]). Na NF-e, a NT 2026.004 v1.01 (produção 01/07/2026) confere; a NT Conjunta 2025.001 não foi lida.
