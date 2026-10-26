---
id: "D-2026-10-26-NFE-DANFE-IBSCBS-LACUNAS-PR0"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas L-DANFE-PR0-1..3 do PR-0 do NFE-DANFE-IBSCBS decididas por questionário, todas na recomendação"
estado: "decided"
autorizacao: "dono, chat, 2026-10-26: \"Me pergunta as 3 lacunas L-DANFE-PR0-1..3 com as opções e a recomendação.\" Respostas no AskUserQuestion de 26/10. Decide lacunas de spec; NÃO é 'executa' do PR-1..PR-3 nem merge"
atualizado: "2026-10-26"
---
# D-2026-10-26-NFE-DANFE-IBSCBS-LACUNAS-PR0

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-26: *"Me pergunta as 3 lacunas L-DANFE-PR0-1..3 com as opções e
a recomendação."* As lacunas saíram do PR-0 (#906) e estão no §7 de `docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md`.
Fontes: `docs/accounting/fontes-oficiais/TRANSCRICAO-NT2026010-DANFE-RTC-2026-10-26.md` e
`TRANSCRICAO-MOC70-AnexoII-DANFE-2026-10-26.md`. Nó: [[NFE-DANFE-IBSCBS]].

## Respostas do dono (literal = o rótulo escolhido no questionário)

| Lacuna | Resposta literal | Efeito no BRIEF | Recomendação |
|---|---|---|---|
| L-DANFE-PR0-1: o teste do item 1 dizia "12 de item"; a NT §4.3 tem 11 campos impressos e 14 tags | "Corrigir para 11/14 (Recomendado)" | o critério do item 1 passa a "11 campos impressos, 14 tags (contando as 3 `pAliqEfet`)"; nenhum item de código muda | a mesma |
| L-DANFE-PR0-2: "SEM VALOR FISCAL" em homologação vai em Informações Complementares **ou** em marca d'água (`[MOC-DANFE-HOMOLOG]`) | "Os dois (Recomendado)" | item 14: marca d'água destacada **e** a frase no início de Informações Complementares; o teste confere as duas; a marca não pode cobrir dados (`[MOC-DANFE-MARCA-DAGUA]`) | a mesma |
| L-DANFE-PR0-3: o texto de consulta da autenticidade difere entre o MOC 7.0 e o modelo da NT 2026.010 | "Texto da NT 2026.010 (Recomendado)" | item 11 imprime *"Consulte a autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da SEFAZ autorizadora"* (modelo da NT, p. 8) | a mesma |

## O que NÃO decide

Não é `executa` de nenhum PR (PR-1..PR-3 continuam precisando do próprio) e não é merge. A pendência da versão online do MOC
(a partir de 01/11/2026) segue para o PR-2.
