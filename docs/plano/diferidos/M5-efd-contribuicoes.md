---
id: "M5-efd-contribuicoes"
tipo: "diferido"
dominio: "governanca"
titulo: "EFD-Contribuições"
estado: "blocked"
estado_detalhe: "⚫→⏳ ADR autorizado (F-M2); = régua X8"
ancora_sdd: "§M5"
atualizado: "2026-10-17"
---
# M5-efd-contribuicoes — EFD-Contribuições

**Estado:** `blocked` — ⚫→⏳ ADR autorizado (F-M2); = régua X8  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1121` → | **EFD-Contribuições** (PIS/COFINS não-cumulativos, mensal) | ⚫→⏳ **autorizado a abrir ADR 2026-09-03 (F-M2)** | **Nunca constou do mapa** até esta data: 0 linhas em `server/src`, 0 docs. Obrigação acessória do Lucro Real (regime-alvo). Validador próprio (PVA EFD-Contribuições). Insumo obrigatório = item 1 do [pedido ao contador](../../accounting/PEDIDO-CONTADOR-2026-09-03.md). Depende do ADR de apuração de tributos. |

## Verificação legal 17/10/2026

- A EFD-Contribuições continua fora da matriz de obrigações (`obrigacoesPorRegime.ts:6-7`, F-X8-1). A IN RFB 1.252/2012 **não foi lida** nesta rodada (dossiê [`verif-2026-10-17-pis-cofins`](../../../pesquisas-legais/verif-2026-10-17-pis-cofins/relatorio.md) item 23). Com a extinção do PIS/Cofins em 2027 (LC 214 art. 542), o escopo se limita aos períodos até 12/2026.
