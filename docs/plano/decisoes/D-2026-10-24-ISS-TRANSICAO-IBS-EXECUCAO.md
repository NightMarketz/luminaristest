---
id: "D-2026-10-24-ISS-TRANSICAO-IBS-EXECUCAO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Executa do ISS-TRANSICAO-IBS (só o PR-1) e aresta [[M5-ibs-cbs]] lida como [[IBS-CBS-2027]], o nó que o promoveu"
estado: "decided"
autorizacao: "dono, chat, 2026-10-24: \"Autorizo executar o nó ISS-TRANSICAO-IBS. Autorização do dono, chat, 2026-10-24: 'executa ISS-TRANSICAO-IBS'\" e, depois do relato da dependência, \"segue\". Sem merge"
atualizado: "2026-10-24"
---
# D-2026-10-24-ISS-TRANSICAO-IBS-EXECUCAO

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-24: *"executa ISS-TRANSICAO-IBS"*, *"PR sem merge"*. Nó:
[[ISS-TRANSICAO-IBS]].

## O que o dono pediu

O pedido mandou descobrir antes de codar o que é o [[M5-ibs-cbs]] e se está pronto ("Se não estiver, pare e me diga o que
falta").

## O que a sessão achou (verificado)

- O [[M5-ibs-cbs]] é o **diferido** `docs/plano/diferidos/M5-ibs-cbs.md` (`deferred`, sem autorização). Em 20/10 ele foi
  **promovido** ao nó [[IBS-CBS-2027]], que diz isso no próprio título. Esse nó está `done`, com os 8 PRs em `main` (#777, #812,
  #826, #833, #842, #861, #868 e #877), entre eles a tabela `IBS_CBS` que o PR-1 consome.
- Diferido não fecha, então o `_INDEX` marcava a aresta como ✗ e o nó não aparecia em "Destravados agora".
- O PR-2 depende de verdade de uma coisa aberta: P-ISS-1..3 do contador, sem resposta.

## Como ficou

A sessão apresentou isso ao dono e propôs trocar a aresta para [[IBS-CBS-2027]] e executar só o PR-1. A pergunta foi
interrompida antes de o resultado ser registrado. O dono respondeu **"segue"**, lido como a opção recomendada:

| Ponto | Fica |
|---|---|
| `depende_de` do [[ISS-TRANSICAO-IBS]] | `[[IBS-CBS-2027]]`, o nó que promoveu o diferido (o [[M5-ibs-cbs]] segue como trilha histórica) |
| Escopo do executa | **só o PR-1** (itens 1–7 do BRIEF). O PR-2 (itens 8–14) espera P-ISS-1..3 e um executa próprio (F-ISS-7 a) |
| Merge | não |

**A confirmar na revisão do PR:** se "segue" não queria dizer a troca da aresta, basta reverter o campo `depende_de` da nota.
O código do PR-1 não depende dessa troca.

## Lacuna L-1 do PR-1 (respondida)

Dono, chat, 2026-10-24: *"L-1: o texto padrão do SemLinhaVigenteError basta para o IBS 2029–2032; não muda o ibsCbsParams.ts."*
Sem linha `PUBLISHED`, o IBS de 2029–2032 dá o erro padrão ("Sem linha vigente de IBS_CBS/IBS/ALIQUOTA_UF|MUN em …"). A
mensagem da CBS de 2027 (`CBS_REFERENCIA_NAO_PUBLICADA`) não ganha equivalente, e o `ibsCbsParams.ts` do [[IBS-CBS-2027]] não
muda.

## O que NÃO decide

- O PR-2, P-ISS-1..5 e qualquer valor do IBS de 2029–2032 (as linhas nascem `DRAFT`; publicar é ato do operador).
