---
id: "M5-emissao-dfe"
tipo: "diferido"
dominio: "governanca"
titulo: "Emissão de DF-e via parceiro emissor (API)"
estado: "done"
estado_detalhe: "NFS-e ✅ #348-#350; NF-e 55 ⏳; = régua X10b"
prs: ["#348", "#349", "#350"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-emissao-dfe — Emissão de DF-e via parceiro emissor (API)

**Estado:** `done` — NFS-e ✅ #348-#350; NF-e 55 ⏳; = régua X10b  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #348, #349, #350  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1129` → | **Emissão de DF-e via parceiro emissor (API)** — NFS-e nacional + NF-e | ✅ **NFS-e nacional MERGEADA 18/09** (X10b, BE-INCR-DFE, PR-1 #348 `f00b304a` · PR-2 #349 `0dcbb22b` · PR-3 #350 `e61c0f6d`) — NF-e ⏳ **[EMENDA 2026-09-18]** Documento de saída montado até a borda (`FiscalProfile`, `ServiceFiscalProfile`, porta `DfeEmissorPort` com `Null`/`File`/`Disabled`, DPS montada/validada/enviada, ciclo pós-SENT — transição, autorização, reenvio, cancelamento, polling, webhook) e entregue por HTTP a parceiro emissor; retorno vira proveniência (`FiscalDocument`). **Dado externo:** contratar parceiro
