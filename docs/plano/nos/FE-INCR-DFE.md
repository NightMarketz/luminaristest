---
id: "FE-INCR-DFE"
tipo: "fe"
dominio: "fiscal"
titulo: "Tela da emissão de DF-e"
estado: "planned"
estado_detalhe: "Fase C do PLANO-EMISSAO-FISCAL-2026-09-27: botão de emitir, ficha espelho do portal (copiar por campo, no formato do portal), upload do XML com releitura na tela e cancelamento manual. BRIEF depois dos forks F-MAN do DFE-MANUAL; as telas a imitar vêm do guia oficial do emissor web v1.2 (4 passos, tabela de campos — insumo 0.6 fechado 27/09)"
depende_de: ["[[X10b]]", "[[DFE-MANUAL]]"]
autorizacao: "dono em chat 27/09: \"planeje com granularidade…\" — plano (Fase C); o BRIEF abre depois dos forks F-MAN; sem 'executa'"
ancora_sdd: "§M5 · §M0 fold 18/09"
atualizado: "2026-09-27"
---
# FE-INCR-DFE — Tela da emissão de DF-e

**Estado:** `planned` — Fase C do PLANO-EMISSAO-FISCAL-2026-09-27: botão de emitir, ficha espelho do portal (copiar por campo, no formato do portal), upload do XML com releitura na tela e cancelamento manual. BRIEF depois dos forks F-MAN do DFE-MANUAL; as telas a imitar vêm do guia oficial do emissor web v1.2 (4 passos, tabela de campos — insumo 0.6 fechado 27/09)  
**Autorização:** dono em chat 27/09: "planeje com granularidade…" — plano (Fase C); o BRIEF abre depois dos forks F-MAN; sem 'executa'  
**Depende de:** [[X10b]], [[DFE-MANUAL]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5 · §M0 fold 18/09

## Evidência

- `docs/SDD-LUMINARIS.md:517` → > (F-DFE-13 a) — `FE-INCR-DFE` (tela) também fica de fora, BRIEF próprio.
- `docs/SDD-LUMINARIS.md:1129` → | **Emissão de DF-e via parceiro emissor (API)** — NFS-e nacional + NF-e | ✅ **NFS-e nacional MERGEADA 18/09** (X10b, BE-INCR-DFE, PR-1 #348 `f00b304a` · PR-2 #349 `0dcbb22b` · PR-3 #350 `e61c0f6d`) — NF-e ⏳ **[EMENDA 2026-09-18]** Documento de saída montado até a borda (`FiscalProfile`, `ServiceFiscalProfile`, porta `DfeEmissorPort` com `Null`/`File`/`Disabled`, DPS montada/validada/enviada, ciclo pós-SENT — transição, autorização, reenvio, cancelamento, polling, webhook) e entregue por HTTP a parceiro emissor; retorno vira proveniência (`FiscalDocument`). **Dado externo:** contratar parceiro

## Fold 27/09

- Passos C.1–C.6 do [`PLANO-EMISSAO-FISCAL-2026-09-27.md`](../../accounting/PLANO-EMISSAO-FISCAL-2026-09-27.md). A ficha e o upload consomem as rotas do [[DFE-MANUAL]] (BRIEF itens 11–14).
