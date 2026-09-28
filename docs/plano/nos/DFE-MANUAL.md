---
id: "DFE-MANUAL"
tipo: "regua"
dominio: "fiscal"
titulo: "Emissão manual de NFS-e sem parceiro (ficha + retorno pelo XML) e releitura XML × DPS (BE-INCR-DFE-MANUAL)"
estado: "planned"
estado_detalhe: "Nó de régua por decisão do dono (F-PLAN-1 → b, 27/09). BRIEF 27/09 (itens 1–18); forks F-MAN-1..5 RATIFICADOS 27/09 (F-MAN-1 assinatura já, F-MAN-2 status novo AUTHORIZED_DIVERGENT); sub-fork F-MAN-2b pendente; corpus baixado e transcrito 27/09 (PR-0 ✅: TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md). Telas e numeração do portal: guia oficial do emissor web v1.2. Execução autorizada 27/09 (sessao-feature)."
depende_de: ["[[X10b]]"]
autorizacao: "dono em chat 27/09: \"1. executa 2. só cancelando\" (execução do BRIEF BE-INCR-DFE-MANUAL; F-MAN-2b → b) — planejamento autorizado antes em 27/09 (\"Certo, planeje com granularidade…\")"
ancora_sdd: "§III.2"
atualizado: "2026-09-27"
---
# DFE-MANUAL — Emissão manual de NFS-e sem parceiro (ficha + retorno pelo XML) e releitura XML × DPS (BE-INCR-DFE-MANUAL)

**Estado:** `planned` — Nó de régua por decisão do dono (F-PLAN-1 → b, 27/09). BRIEF 27/09 (itens 1–18); forks F-MAN-1..5 RATIFICADOS 27/09 (F-MAN-1 assinatura já, F-MAN-2 status novo AUTHORIZED_DIVERGENT); sub-fork F-MAN-2b pendente; corpus baixado e transcrito 27/09 (PR-0 ✅: TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md). Telas e numeração do portal: guia oficial do emissor web v1.2. Execução autorizada 27/09 (sessao-feature).  
**Autorização:** dono em chat 27/09: "1. executa 2. só cancelando" (execução do BRIEF BE-INCR-DFE-MANUAL; F-MAN-2b → b) — planejamento autorizado antes em 27/09 ("Certo, planeje com granularidade…")  
**Depende de:** [[X10b]]  
**Desbloqueia:** [[FE-INCR-DFE]], [[X10i]] (releitura e adaptador por documento)  
**Âncora no SDD consolidado:** §III.2

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
