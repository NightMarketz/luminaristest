---
id: "FE-INCR-DFE"
tipo: "fe"
dominio: "fiscal"
titulo: "Tela da emissão de DF-e"
estado: "planned"
estado_detalhe: "Fase C do PLANO-EMISSAO-FISCAL-2026-09-27: botão de emitir, ficha espelho do portal (copiar por campo, no formato do portal), upload do XML com releitura na tela e cancelamento manual. BRIEF depois dos forks F-MAN do DFE-MANUAL; as telas a imitar vêm do guia oficial do emissor web v1.2 (4 passos, tabela de campos — insumo 0.6 fechado 27/09) · 29/09: 1º cliente = Simples em SP capital → esta tela é o caminho legal da NFS-e (Emissor Nacional exclusivo desde 01/11/2026). Forks do BRIEF decididos: PR-0 com as telas de perfil fiscal (unidade + serviço — sem elas nenhuma venda emite); toque no BE para persistir a releitura e expor ids de XML/PDF; botão no SaleDetailPanel; upload por input file (padrão NfePanel); ambiente derivado da view com aviso se divergir do /status. Fila: logo depois do SEED-UNITS"
depende_de: ["[[X10b]]", "[[DFE-MANUAL]]"]
autorizacao: "dono em chat 27/09: \"planeje com granularidade…\" — plano (Fase C); o BRIEF abre depois dos forks F-MAN; sem 'executa'; 29/09: BRIEF com os 5 forks decididos + download do Guia do Emissor Web v1.2 autorizado (sem 'executa')"
ancora_sdd: "§M5 · §M0 fold 18/09"
atualizado: "2026-09-29"
---
# FE-INCR-DFE — Tela da emissão de DF-e

**Estado:** `planned` — Fase C do PLANO-EMISSAO-FISCAL-2026-09-27: botão de emitir, ficha espelho do portal (copiar por campo, no formato do portal), upload do XML com releitura na tela e cancelamento manual. BRIEF depois dos forks F-MAN do DFE-MANUAL; as telas a imitar vêm do guia oficial do emissor web v1.2 (4 passos, tabela de campos — insumo 0.6 fechado 27/09) · 29/09: 1º cliente = Simples em SP capital → esta tela é o caminho legal da NFS-e (Emissor Nacional exclusivo desde 01/11/2026). Forks do BRIEF decididos: PR-0 com as telas de perfil fiscal (unidade + serviço — sem elas nenhuma venda emite); toque no BE para persistir a releitura e expor ids de XML/PDF; botão no SaleDetailPanel; upload por input file (padrão NfePanel); ambiente derivado da view com aviso se divergir do /status. Fila: logo depois do SEED-UNITS  
**Autorização:** dono em chat 27/09: "planeje com granularidade…" — plano (Fase C); o BRIEF abre depois dos forks F-MAN; sem 'executa'; 29/09: BRIEF com os 5 forks decididos + download do Guia do Emissor Web v1.2 autorizado (sem 'executa')  
**Depende de:** [[X10b]], [[DFE-MANUAL]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5 · §M0 fold 18/09

## Evidência

- `docs/SDD-LUMINARIS.md:517` → > (F-DFE-13 a) — `FE-INCR-DFE` (tela) também fica de fora, BRIEF próprio.
- `docs/SDD-LUMINARIS.md:1129` → | **Emissão de DF-e via parceiro emissor (API)** — NFS-e nacional + NF-e | ✅ **NFS-e nacional MERGEADA 18/09** (X10b, BE-INCR-DFE, PR-1 #348 `f00b304a` · PR-2 #349 `0dcbb22b` · PR-3 #350 `e61c0f6d`) — NF-e ⏳ **[EMENDA 2026-09-18]** Documento de saída montado até a borda (`FiscalProfile`, `ServiceFiscalProfile`, porta `DfeEmissorPort` com `Null`/`File`/`Disabled`, DPS montada/validada/enviada, ciclo pós-SENT — transição, autorização, reenvio, cancelamento, polling, webhook) e entregue por HTTP a parceiro emissor; retorno vira proveniência (`FiscalDocument`). **Dado externo:** contratar parceiro

## Fold 27/09

- Passos C.1–C.6 do [`PLANO-EMISSAO-FISCAL-2026-09-27.md`](../../accounting/PLANO-EMISSAO-FISCAL-2026-09-27.md). A ficha e o upload consomem as rotas do [[DFE-MANUAL]] (BRIEF itens 11–14).

## Fold 02/10

- Registro, sem mudança de estado: achado **A8** no BRIEF (§7) — entregar a nota ao tomador não está planejado; a tela só
  dá download, e só em produção. Fork **F-COB-1**, pendente do dono, em [`MAPA-COBERTURA-EMISSAO-2026-10-02.md`](../../accounting/MAPA-COBERTURA-EMISSAO-2026-10-02.md) §3.1.

## Docs

- [`docs/accounting/FE-INCR-DFE-brief.md`](../../accounting/FE-INCR-DFE-brief.md) — BRIEF (29/09, passo C.1): 29 itens em 3 PRs (PR-0 perfil fiscal da unidade e dos serviços → PR-1 toque no BE → PR-2 tela), contratos, mapa DPS → portal pelo Guia do Emissor Web v1.2, PV-1..10 para o `RUNBOOK-H2-DFE-MANUAL`. Forks F-FE-DFE-1..5 decididos em 29/09; **F-FE-DFE-6..9 PENDENTES** (o 9 reabre o F-MAN-5 se o portal não entregar o XML do evento — guia p. 80). Sem 'executa'; na fila, depois do [[SEED-UNITS]]
- [`docs/accounting/BE-INCR-DFE-MANUAL-brief.md`](../../accounting/BE-INCR-DFE-MANUAL-brief.md) — rotas consumidas (itens 11–14) e forks F-MAN-1..5
- [`docs/accounting/PLANO-EMISSAO-FISCAL-2026-09-27.md`](../../accounting/PLANO-EMISSAO-FISCAL-2026-09-27.md) — Fase C
