---
id: "FE-INCR-DFE"
tipo: "fe"
dominio: "fiscal"
titulo: "Tela da emissão de DF-e"
estado: "planned"
estado_detalhe: "BRIEF próprio, ainda não aberto"
depende_de: ["[[X10b]]"]
ancora_sdd: "§M5 · §M0 fold 18/09"
atualizado: "2026-09-23"
---
# FE-INCR-DFE — Tela da emissão de DF-e

**Estado:** `planned` — BRIEF próprio, ainda não aberto  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[X10b]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5 · §M0 fold 18/09

## Evidência

- `docs/SDD-LUMINARIS.md:517` → > (F-DFE-13 a) — `FE-INCR-DFE` (tela) também fica de fora, BRIEF próprio.
- `docs/SDD-LUMINARIS.md:1129` → | **Emissão de DF-e via parceiro emissor (API)** — NFS-e nacional + NF-e | ✅ **NFS-e nacional MERGEADA 18/09** (X10b, BE-INCR-DFE, PR-1 #348 `f00b304a` · PR-2 #349 `0dcbb22b` · PR-3 #350 `e61c0f6d`) — NF-e ⏳ **[EMENDA 2026-09-18]** Documento de saída montado até a borda (`FiscalProfile`, `ServiceFiscalProfile`, porta `DfeEmissorPort` com `Null`/`File`/`Disabled`, DPS montada/validada/enviada, ciclo pós-SENT — transição, autorização, reenvio, cancelamento, polling, webhook) e entregue por HTTP a parceiro emissor; retorno vira proveniência (`FiscalDocument`). **Dado externo:** contratar parceiro
