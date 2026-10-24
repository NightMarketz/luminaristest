---
id: "D-2026-10-23-LEGAL-PARAMS-DISCRIMINADOR-E-PUBLICADAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas deixadas fora do #870: discriminador das alíquotas de IBS_CBS validado; checagem só-leitura das linhas já publicadas fora do formato"
estado: "decided"
autorizacao: "dono, questionário na sessão das lacunas, 2026-10-23: \"Autorizo as 2 (Recomendado)\". A opção dizia: (1) a regra exige chave CBS com ALIQUOTA, ou IBS com ALIQUOTA_UF|ALIQUOTA_MUN, e valorInt em bp; (2) linhas já publicadas, decidir com evidência entre um script que as liste e documentar que o caso é impossível, sem migrar dado; sessao-instrumentacao → sessao-correcao, sem merge"
atualizado: "2026-10-23"
---
# D-2026-10-23-LEGAL-PARAMS-DISCRIMINADOR-E-PUBLICADAS

Origem: "Fora de escopo" do #868, reafirmado no #870 ([[LEGAL-PARAMS]], [[IBS-CBS-2027]]).

| Lacuna | Resposta do dono (literal) | Efeito |
|---|---|---|
| A regra `IBS_CBS` de `formatoLinha.ts` só conferia a linha VENCIMENTO. A alíquota passava com qualquer discriminador, entrava em vigor e nenhum cálculo a lia | "Autorizo as 2 (Recomendado)" | A linha que não é VENCIMENTO exige CBS/ALIQUOTA ou IBS/ALIQUOTA_UF\|ALIQUOTA_MUN e valorInt em bp. `propose` e `publish` respondem 400 |
| Linhas já publicadas não são revalidadas | idem (escolha por evidência) | Checagem só-leitura `npm run check:legal-params-formato`. Não é caso impossível: num banco migrado do zero, 318 linhas PUBLISHED do Simples já falham na regra de hoje. Nenhum dado é migrado |

Não há merge.
