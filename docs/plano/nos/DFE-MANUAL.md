---
id: "DFE-MANUAL"
tipo: "regua"
dominio: "fiscal"
titulo: "Emissão manual de NFS-e sem parceiro (ficha + retorno pelo XML) e releitura XML × DPS (BE-INCR-DFE-MANUAL)"
estado: "done"
estado_detalhe: "✅ BE mergeado: #405 21d87689 (27/09) + #406 e49fa6a0 (28/09, pAliq TSDec1V2); integração provada na CI Linux (local EBUSY). Residual: FE-INCR-DFE (tela) → runbook H2-DFE-MANUAL (gate humano); merge sem revisão independente por decisão do dono (28/09) · 28/09 tarde: #410 53389d61 fecha 4 achados da revisão (guarda (v) de ambiente tpAmb, chave única por usuário, dhProc de calendário real, teste da re-checagem na tx); #416 7ce5fdd2 = [[DFE-TPAMB]] (tpAmb e tpInsc da DPS). GAP-MAP (#417) FECHADOS 28/09 noite: #420 03edfc51 — applyResult autoriza antes de anexar + guarda de status na 2ª escrita; #421 65ea90df — cancelamento manual exige evento assinado (verifyNfseEventoSignature). Resíduo [ABERTO]: anexo que falha depois da autorização perde o XML do retorno manual → BRIEF BE-INCR-DFE-ANEXO-PENDENTE (#425, F-PA-1..8 ratificados; falta `executa`) · [[D-2026-09-28-GAP-MAP-3-4-5-E-ANEXO-PENDENTE]]"
depende_de: ["[[X10b]]"]
autorizacao: "dono em chat 27/09: \"1. executa 2. só cancelando\" (execução do BRIEF BE-INCR-DFE-MANUAL; F-MAN-2b → b) — planejamento autorizado antes em 27/09 (\"Certo, planeje com granularidade…\")"
prs: ["#405", "#406", "#410", "#416", "#420", "#421"]
ancora_sdd: "§III.2"
atualizado: "2026-09-28"
---
# DFE-MANUAL — Emissão manual de NFS-e sem parceiro (ficha + retorno pelo XML) e releitura XML × DPS (BE-INCR-DFE-MANUAL)

**Estado:** `done` — ✅ BE mergeado: #405 21d87689 (27/09) + #406 e49fa6a0 (28/09, pAliq TSDec1V2); integração provada na CI Linux (local EBUSY). Residual: FE-INCR-DFE (tela) → runbook H2-DFE-MANUAL (gate humano); merge sem revisão independente por decisão do dono (28/09) · 28/09 tarde: #410 53389d61 fecha 4 achados da revisão (guarda (v) de ambiente tpAmb, chave única por usuário, dhProc de calendário real, teste da re-checagem na tx); #416 7ce5fdd2 = [[DFE-TPAMB]] (tpAmb e tpInsc da DPS). GAP-MAP (#417) FECHADOS 28/09 noite: #420 03edfc51 — applyResult autoriza antes de anexar + guarda de status na 2ª escrita; #421 65ea90df — cancelamento manual exige evento assinado (verifyNfseEventoSignature). Resíduo [ABERTO]: anexo que falha depois da autorização perde o XML do retorno manual → BRIEF BE-INCR-DFE-ANEXO-PENDENTE (#425, F-PA-1..8 ratificados; falta `executa`) · [[D-2026-09-28-GAP-MAP-3-4-5-E-ANEXO-PENDENTE]]  
**Autorização:** dono em chat 27/09: "1. executa 2. só cancelando" (execução do BRIEF BE-INCR-DFE-MANUAL; F-MAN-2b → b) — planejamento autorizado antes em 27/09 ("Certo, planeje com granularidade…")  
**Depende de:** [[X10b]]  
**Desbloqueia:** [[FE-INCR-DFE]], [[X10i]] (releitura e adaptador por documento)  
**Âncora no SDD consolidado:** §III.2  
**PRs:** #405, #406, #410, #416, #420, #421

## Docs

- [`docs/accounting/HANDOFF-2026-09-27-emissao-fiscal.md`](../../accounting/HANDOFF-2026-09-27-emissao-fiscal.md) — **passagem de sessão: leia primeiro**
- [`docs/accounting/BE-INCR-DFE-MANUAL-brief.md`](../../accounting/BE-INCR-DFE-MANUAL-brief.md) — BRIEF (checklist, contratos, forks F-MAN-1..5)
- [`docs/accounting/PLANO-EMISSAO-FISCAL-2026-09-27.md`](../../accounting/PLANO-EMISSAO-FISCAL-2026-09-27.md) — Fases A–B (e D, a prova humana)
- [`docs/adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md`](../../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md) — §11 (emenda 27/09)
- Decisão: [[D-2026-09-26-EMISSAO-FISCAL-BYOK]] (decisões 4 e 5)

## O que é

O `FileEmissor` do X10b grava a DPS num arquivo e espera um `.result.json` escrito à mão. Este nó o transforma no
modo manual de verdade: a tela mostra a DPS na ordem do portal público, a pessoa emite lá com o próprio login, e
devolve o **XML autorizado**. O Luminaris lê o XML, compara campo a campo com o que mandou (**releitura**) e autoriza o
documento. Só NFS-e.

## Cadeia (do plano)

1. **0.4 / 0.5** corpus da NFS-e rebaixado (permissão do dono) → transcrição `infNFSe` + E0010 + evento
2. **A.2** dono ratifica F-MAN-1..5 → **A.3** "executa"
3. **PR-0** transcrição · **PR-1** libs puras da releitura · **PR-2** adaptador manual + adaptador por documento ·
   **PR-3** rotas manuais
4. **Fase D** runbook H2-DFE-MANUAL (dono executa e assina) — depois da tela ([[FE-INCR-DFE]])

## Forks

F-MAN-1 (assinatura do XML enviado) · F-MAN-2 (divergência de conteúdo) · F-MAN-3 (nome do adaptador) · F-MAN-4
(quem numera a DPS) · F-MAN-5 (prova do cancelamento) — texto e recomendações no BRIEF §5. Ratificados 27/09 — ver [[D-2026-09-26-EMISSAO-FISCAL-BYOK]]; F-PLAN-1 → (b): este nó entra na régua fiscal.

## Vizinhos

- [[X10b]] — porta, `FiscalDocument` e montagem da DPS: fato consumado.
- [[X10i]] — a Focus reusa a releitura e a seleção do adaptador por documento.
- [[FE-INCR-DFE]] — ficha espelho, upload do XML e releitura na tela.
- [[D7]] — uma nota com releitura divergente precisa de correção dentro do PNCT.
