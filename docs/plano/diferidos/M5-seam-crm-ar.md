---
id: "M5-seam-crm-ar"
tipo: "diferido"
dominio: "governanca"
titulo: "Seam CRM → Contas a Receber"
estado: "done"
estado_detalhe: "✅ 2026-07-20 (ADR-CRM-AR-SEAM); emenda trava pós-Won ✅ 2026-09-26 (#385 `af68ef0f`)"
prs: ["#137", "#385"]
ancora_sdd: "§M5"
atualizado: "2026-09-26"
---
# M5-seam-crm-ar — Seam CRM → Contas a Receber

**Estado:** `done` — ✅ 2026-07-20 (ADR-CRM-AR-SEAM); emenda trava pós-Won ✅ 2026-09-26 (#385 `af68ef0f`)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #137, #385  
**Âncora no SDD consolidado:** §M5

## Evidência

- #385 (`af68ef0f`, 2026-09-26) — emenda "decide pós-Won: travar" (dono, 2026-09-25): opp Won/Lost terminal (`immutableAfter` + recusa em `advanceOpportunity`), Won decidido pela etapa gravada, `PresetSync` propaga `immutableAfter`. Resíduo operacional: `sync-preset crmOpportunities` por tenant; pipelines existentes sem etapas Ganho/Perdido (GAP-MAP linhas CRM).

- `docs/SDD-LUMINARIS.md:1117` → | **Seam CRM → Contas a Receber** (recebível-órfão N4a do Council v2) | ✅ **Implementado 2026-07-20** ([ADR-CRM-AR-SEAM](../../adr/ADR-CRM-AR-SEAM.md)) | Oportunidade `Won` deixou de postar direto `D 1.1.2 / C 3.1` (mapper aposentado) e passa a criar `Receivable` no subrazão AR via `CrmReceivableBridge` (reconhecimento `D 1.1.5 / C 3.1`; settlement = recebimento humano na aba AR — o fato de pagamento que o CRM não tem). Chave `documentNumber=CRM-<oppId>`, zero migração/rota nova; guards de idempotência: entrada legada `crm.opportunity.won` intocada + lookup tombstone-aware (cancelamento humano
