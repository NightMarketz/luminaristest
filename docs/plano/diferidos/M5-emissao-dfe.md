---
id: "M5-emissao-dfe"
tipo: "diferido"
dominio: "governanca"
titulo: "Emissão de DF-e via parceiro emissor (API)"
estado: "done"
estado_detalhe: "NFS-e ✅ #348-#350; NF-e 55 ⏳; = régua X10b"
prs: ["#348", "#349", "#350"]
ancora_sdd: "§M5"
atualizado: "2026-10-17"
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

## Verificação legal 17/10/2026

- **SP sem inutilização a partir de 01/11/2026** (Aj. SINIEF 38/26 e 40/26) — reabre F-NFCE-5/E-6, em planejamento na sessão de NFC-e.
- NTs que o inventário não listava: 2026.010 (DANFE IBS/CBS, 01/12/2026 → [[NFE-DANFE-IBSCBS]]), 2026.009, 2026.006 (split payment), 2026.003, 2014.001 v1.41 (EPEC). A partir de 01/11/2026 o MOC passa a ser o online mantido pelo Paraná. Dossiê [`verif-2026-10-17-nfe-nfce-dfe`](../../../pesquisas-legais/verif-2026-10-17-nfe-nfce-dfe/relatorio.md).
