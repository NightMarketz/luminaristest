---
id: "M5-remessa"
tipo: "diferido"
dominio: "governanca"
titulo: "Remessa CNAB / boleto / Pix"
estado: "blocked"
estado_detalhe: "⚫→⏳ ADR autorizado (F-M3); = régua F5/F6; dado externo D6"
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-remessa — Remessa CNAB / boleto / Pix

**Estado:** `blocked` — ⚫→⏳ ADR autorizado (F-M3); = régua F5/F6; dado externo D6  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1125` → | **Remessa CNAB / boleto / Pix** (integração bancária de saída) | ⚫→⏳ **autorizado a abrir ADR 2026-09-03 (F-M3)** | `lib/cnab.ts` só **lê** retorno/extrato; não existe entidade "conta bancária". **Dado externo:** convênio e leiaute do banco do 1º cliente — gate humano sem sessão de agente. |
