---
id: "D-2026-10-24-LEGAL-PARAMS-SIMPLES-FORMATO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Regra de formato das 4 tabelas SIMPLES_* (propose/publish do Simples davam 400 pelo fallback valorInt)"
estado: "decided"
autorizacao: "dono, questionário da sessão das lacunas do #870, 2026-10-24: \"Autorizo (Recomendado)\". A pergunta: \"Autoriza a sessão do Simples a criar a regra de formato das 4 tabelas SIMPLES_*? Hoje, por falta de regra, propor ou publicar qualquer linha delas pela API dá 400. O desenho proposto: FAIXA e REPARTICAO com chave I..V, discriminador F1..F6 e valorJson pelos schemas do simplesCalc; TETO_ISS com chave = anexo, sem discriminador; ENQUADRAMENTO com chave REVENDA|LOCACAO_MOVEL|PARCERIA_GESTAO|SERVICO:<cTribNac de 6 dígitos>, sem discriminador. O fluxo é sessao-instrumentacao → sessao-correcao, num PR empilhado no #877, sem merge e sem migrar dado.\""
atualizado: "2026-10-24"
---
# D-2026-10-24-LEGAL-PARAMS-SIMPLES-FORMATO

Origem: o `npm run check:legal-params-formato` do #877 ([[D-2026-10-23-LEGAL-PARAMS-DISCRIMINADOR-E-PUBLICADAS]]) listou,
num banco migrado do zero, as 318 linhas PUBLISHED da semente do Simples (X14 #573). As 4 tabelas não tinham regra em
`formatoLinha.ts` e caíam no fallback do PR-1, que exige `valorInt`; a semente e o `simplesCalc` usam `valorJson`.

| Tabela | Chave | Discriminador | valorJson (schema do `simplesCalc`) |
|---|---|---|---|
| SIMPLES_ANEXO_FAIXA | I..V | F1..F6 | `FaixaJsonSchema` |
| SIMPLES_ANEXO_REPARTICAO | I..V | F1..F6 | `ReparticaoJsonSchema` |
| SIMPLES_TETO_ISS | I..V | — | `TetoIssJsonSchema` |
| SIMPLES_ENQUADRAMENTO | REVENDA\|LOCACAO_MOVEL\|PARCERIA_GESTAO\|SERVICO:<6 dígitos> | — | `EnquadramentoJsonSchema` |

`SIMPLES_LIMITE` fica fora: é `valorInt` e o fallback já a aceita. Nenhum dado é migrado. Não há merge.
