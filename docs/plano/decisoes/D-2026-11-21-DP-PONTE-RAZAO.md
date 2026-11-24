---
id: "D-2026-11-21-DP-PONTE-RAZAO"
tipo: "decisao"
dominio: "pessoal"
titulo: "DP (nó PES-4): emenda da ponte folha → razão / Simples / CPP com RAT, FAP e terceiros — forks F-PNT-1..7 e F-PNT-3b, decisões do dono em 21/11"
estado: "decided"
autorizacao: "dono, chat, 2026-11-21: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\" (planejamento da emenda) + questionário (AskUserQuestion) da sessão de planejamento com as respostas literais da tabela — decide forks do BRIEF; não é 'executa'"
atualizado: "2026-11-21"
---
# D-2026-11-21-DP-PONTE-RAZAO — forks da emenda do PES-4 (ponte folha → razão / Simples / CPP), 21/11/2026

**Estado:** `decided`. **Escopo:** o [`BE-INCR-DP-PONTE-RAZAO-brief.md`](../../accounting/BE-INCR-DP-PONTE-RAZAO-brief.md)
e seus forks. **Não** autoriza código: o `executa` da emenda pede autorização nova ([[D-2026-10-28-FLUXO-AUTONOMO]]).
Contexto: [[D-2026-11-02-DP-PRE-ADR]] (F-DP-4: `postEntry` direto), [[D-2026-11-06-DP-BRIEF-F2]] (regra de parâmetro),
lacuna `L-20261121-181950-5cb9`.

## Forks (questionário, 21/11, duas rodadas)

| Fork | Decisão (palavras do dono) | Contra a recomendação? |
|---|---|---|
| F-PNT-1 Quando a folha vira lançamento | *"Fechar e lançar (Recommended)"*: a emenda traz `FECHADA` e a reabertura com estorno | não |
| F-PNT-2 Granularidade | *"Um por folha e unidade (Recommended)"* | não |
| F-PNT-3 Onde moram RAT, FAP e FPAS | *"Tudo em parâmetros legais"* | **sim** (recomendação: lei em `LegalParameter`, FAP/grau/FPAS num cadastro por estabelecimento) |
| F-PNT-3b Consequência (tabela global, só o admin publica) | *"Linha por CNPJ, via admin (Recommended)"*: FAP e grau pelo CNPJ do estabelecimento, FPAS pela raiz; o admin propõe e publica a pedido do contador | não |
| F-PNT-4 Contas de pessoal | *"Plano padrão + papéis (Recommended)"* | não |
| F-PNT-5 Provisões de 13º e férias | *"Provisionar já (Recommended)"*: base contratual agora, médias e baixa no F3 | não |
| F-PNT-6 Como o Simples recebe a folha | *"Ler do DP (Recommended)"*: porta com precedência sobre o histórico, como a receita | não |
| F-PNT-7 Folha do fator r (ambiguidade A-1/A-2) | *"Caixa (pago no mês)"* | **sim** (recomendação: competência, provisória) |

## Consequências que o dono aceitou

- **F-PNT-3/3b:** o FAP de cada ano e o grau de cada estabelecimento dependem do admin da plataforma; a linha fica na
  tabela que todos os escopos leem (sem dado de pessoa). Precisa do CNPJ do estabelecimento, que o schema não guarda por
  unidade: com mais de uma unidade, o fechamento trava até existir o campo (caixa).
- **F-PNT-7:** o FGTS e a CPP "efetivamente recolhidos" só existem quando o F5 trouxer as guias. Até lá, todo mês do DP sai
  incompleto e o **fator r continua pelo histórico digitado**; a emenda entrega a porta, a precedência e a soma.
- A pergunta ao contador continua aberta (dossiê `pesquisas-legais/emenda-pes4-ponte-folha/` §4, A-1 e A-2); se ele ler
  diferente, muda só a soma do item 36 do BRIEF.
