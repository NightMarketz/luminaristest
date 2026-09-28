---
id: "DFE-TPAMB"
tipo: "subno"
dominio: "fiscal"
titulo: "tpAmb da DPS vem do ambiente do documento + tpInsc do Id (BE-INCR-DFE-TPAMB)"
estado: "done"
estado_detalhe: "✅ #416 7ce5fdd2 (28/09): tpAmb [103] da DPS = ambiente do documento (tpAmbFor/ambienteFromTpAmb, uma tabela nas duas direções); reenvio com ambiente divergente → 400; assertTpAmb antes de persistir; e tpInsc do Id [102] = 2 (CNPJ), antes 1 (CPF). CI Linux verde. Abertos no GAP-MAP (#417): id [102] sem nDPS real; consultar/cancelar/webhook pelo ambiente do env; numeração sem ambiente — entram no BRIEF do [[X10i]]"
depende_de: ["[[DFE-MANUAL]]"]
autorizacao: "planejamento: \"Planeje para corrigir\"; tpInsc: \"registra e corrije\"; forks + execução: \"Pode seguir com as recomendações e executa cada uma das duas\" (dono, chat, 2026-09-28)"
prs: ["#412", "#416"]
ancora_sdd: "§III.2 (fora da régua — correção)"
atualizado: "2026-09-28"
---
# DFE-TPAMB — tpAmb da DPS vem do ambiente do documento + tpInsc do Id (BE-INCR-DFE-TPAMB)

**Estado:** `done` — ✅ #416 7ce5fdd2 (28/09): tpAmb [103] da DPS = ambiente do documento (tpAmbFor/ambienteFromTpAmb, uma tabela nas duas direções); reenvio com ambiente divergente → 400; assertTpAmb antes de persistir; e tpInsc do Id [102] = 2 (CNPJ), antes 1 (CPF). CI Linux verde. Abertos no GAP-MAP (#417): id [102] sem nDPS real; consultar/cancelar/webhook pelo ambiente do env; numeração sem ambiente — entram no BRIEF do [[X10i]]  
**Autorização:** planejamento: "Planeje para corrigir"; tpInsc: "registra e corrije"; forks + execução: "Pode seguir com as recomendações e executa cada uma das duas" (dono, chat, 2026-09-28)  
**Depende de:** [[DFE-MANUAL]]  
**Desbloqueia:** [[X10i]] (requisitos de ambiente do FocusEmissor)  
**Âncora no SDD consolidado:** §III.2 (fora da régua — correção)  
**PRs:** #412, #416

## Docs

- [`docs/accounting/BE-INCR-DFE-TPAMB-brief.md`](../../accounting/BE-INCR-DFE-TPAMB-brief.md) — BRIEF (checklist 0–11, forks F-AMB-1..6 RATIFICADOS 28/09)
- Decisão: [[D-2026-09-28-CRM-SUBMODULOS-E-DFE-TPAMB]] (F-AMB-1..6)

## O que é

A DPS saía sempre com `tpAmb=1` (produção), inclusive para documento de homologação — defeito contra a spec do
[[X10b]] (linha [103]). O caminho silencioso era o reenvio após troca de env. Subnó fora da régua: é correção, não
incremento; incluir na régua é decisão do dono.

