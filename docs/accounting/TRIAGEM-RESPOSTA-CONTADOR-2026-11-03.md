# TRIAGEM — resposta do contador à P-C1 (2026-11-03)

> Skill `luminaris-contador-liaison`, fase 3. **[CTD-002] A resposta é dado externo, não sign-off.** Cada item vira
> artefato checável: "confirma, nada muda" (T5) ou requisito para a **emenda** do BRIEF X7-C §C3 item 5, que tem
> `executa` próprio. Pedido de origem: [`PEDIDO-CONTADOR-2026-10-31.md`](PEDIDO-CONTADOR-2026-10-31.md).
> Recebido: dono, chat, 03/11 (resposta colada); origem confirmada pelo dono no mesmo dia, por questionário: *"Contador de fato"*.
> Relação com o #1011 (`D-2026-11-02-DELEGACAO-DONO` §9, P-C1 por pesquisa, ainda aberto em 03/11): a pesquisa responde
> que a lei não fixa formato, e esta resposta diz qual formato serve à rotina do contador. As duas não se contradizem;
> onde o #1011 diz "pedido sem pergunta", esta triagem prevalece. Sem PII ([CTD-003]): não traz nome, CNPJ nem dado de cliente.

## Em duas linhas

**Saída (b) do critério de aceite: "aprovado com ajustes".** A forma atual (uma aba, vertical, RESUMO antes da MEMÓRIA)
fica. O contador pede 8 informações a mais, 6 delas de prioridade alta, todas de **rastreabilidade**.
**A P-C1 fecha como pergunta.** O que ela abre é uma emenda ao BRIEF X7-C §C3: não é ajuste de coluna. Três das
informações pedidas não existem hoje no model (conta estruturada, lançamento de origem e pagamento do DARF).

## O critério do contador (vira o critério de aceite da emenda)

> "O objetivo é que alguém consiga conferir qualquer valor do IRPJ ou da CSLL e responder: de onde veio esse número, como
> foi calculado e qual informação contábil o sustenta? Se a planilha permitir isso sem precisar consultar o código-fonte
> do sistema, considero o formato adequado para minha rotina de conferência e arquivamento."

## Classificação item a item

Base do "hoje": `server/src/features/accounting/models/taxAssessmentMemoExport.ts` (`MEMO_COLUMNS`, `linhasDaApuracao`),
`MemoriaLinhaSchema` em `taxAssessmentCalc.ts` (só `codigo`, `descricao`, `valorCents`, `fonte`) e o model
`TaxAssessment` em `schema.prisma`, lidos em 03/11 sobre `origin/main`.

| # | O que ele pediu | Prioridade dele | Hoje | Classe | Trilho |
|---|---|---|---|---|---|
| 1 | Uma aba, uma linha por etapa, RESUMO antes da MEMÓRIA, regime/período/tributo/DARF, histórico de substituição | — | **já existe**: `MEMO_COLUMNS` tem `anoCalendario`, `periodo`, `tributo`, `regime`, `forma`, `codigoReceita`, `substitui`, `tipoLinha` RESUMO → MEMORIA | **confirmação** | registro "confirma, nada muda" (T5). Ele rejeita aba por trimestre e passos em colunas: as duas alternativas do pedido saem |
| 2 | Código e nome da conta contábil | Alta | **parcial**: a conta só aparece no texto da descrição de algumas linhas (ex.: `'Receita bruta de serviço do trimestre (conta 3.1)'`); não há coluna | requisito novo | emenda: coluna estruturada. A `MemoriaLinha` persistida não tem o campo, então apuração antiga sai sem ele |
| 3 | Saldo do balancete usado | Alta | **não existe** | requisito novo, com ambiguidade | emenda + fork (abaixo, F-PC1-2) |
| 4 | Período de referência da origem | Alta | **parcial**: o export traz o período da **apuração**; linhas que vêm de outro período (trimestres anteriores, receita acumulada) não dizem qual | requisito novo | emenda |
| 5 | Identificador do lançamento ou documento de origem | Alta | **não existe**: a linha da memória soma o movimento de uma conta no período; pode ser de centenas de lançamentos | requisito novo, decisão de produto | emenda + fork (F-PC1-1) |
| 6 | Fórmula ou regra de cálculo aplicada | Alta | **parcial**: a `descricao` já traz a operação (ex.: `` `Receita de serviço × ${pS.valor / 100}%` ``) e a `fonte` traz a base legal (ex.: `'IN RFB 1.700/2017 art. 215 caput'`) | requisito parcialmente atendido | emenda: conferir se toda linha diz a operação; hoje é texto livre, não fórmula estruturada |
| 7 | Versão dos parâmetros legais | Alta | **parcial**: `tabelaVersao` já sai na planilha; `parametrosIds` e `parametrosSha256` existem no model (PR-4 do LEGAL-PARAMS) e **não** saem | requisito novo, barato | emenda: duas colunas que já estão no model |
| 8 | Data de vencimento do DARF | Média | **não existe** no `TaxAssessment` | requisito novo | emenda; a regra de vencimento é de lei e tem de ser lida no acervo antes (não lida nesta triagem) |
| 9 | Data e valor efetivamente recolhidos | Média | **não existe** ligação entre apuração e pagamento (o model só tem `provisaoEntryId`, a provisão) | **fora da memória** (o próprio contador diz: "não precisa integrar a memória de cálculo propriamente dita") | registrar; depende de onde o pagamento do DARF é lançado. Não entra na emenda sem fork (F-PC1-3) |

**Fora do pedido:** nada. A cadeia que ele desenhou (RESUMO → MEMÓRIA → RASTREABILIDADE → RECOLHIMENTO E HISTÓRICO) é a
mesma lista, organizada.

## Forks que a emenda vai ter de levar ao dono (não decididos aqui)

- **F-PC1-1 — granularidade do "lançamento/documento de origem".** (a) uma linha `RASTREIO` por conta e período, com o
  filtro do razão que reproduz o valor (conta + período), sem listar lançamentos; (b) a lista de ids de lançamento na
  própria linha; (c) linhas `RASTREIO` na mesma aba, uma por lançamento. Ele pediu uma aba só e o formato vertical, o
  que favorece (a) ou (c). A (c) pode gerar milhares de linhas por trimestre.
- **F-PC1-2 — "saldo do balancete".** O valor da linha da receita é o **movimento** da conta no período. O saldo do
  balancete é a **posição** em uma data. Se ele quer o saldo, é uma coluna a mais; se ele quer conferir o movimento
  contra o balancete, o valor já é o número. A pergunta exata ao contador, se o dono quiser: "No saldo do balancete,
  você quer o saldo da conta no fim do período ou o movimento do período (o valor que entrou no cálculo)?"
- **F-PC1-3 — recolhimento.** Ligar a apuração ao pagamento do DARF exige saber onde o pagamento é registrado hoje
  (contas a pagar? baixa da provisão?). Sem esse fio, as linhas de RECOLHIMENTO não têm de onde vir.

## O que destrava

- **P-C1 do [[X7]]:** fecha como pergunta (saída (b) do critério). O X7 continua `inflight`.
- **Emenda ao BRIEF X7-C §C3 item 5:** é trabalho de **planejamento** (`sessao-planejamento`), com autorização do dono,
  depois `executa` próprio. Toca `MemoriaLinhaSchema` (JSON persistido), o export e talvez o cálculo (que precisa passar
  a gravar conta e período de origem em cada linha).
- **[[X9]]:** a resposta não muda nada no X9.

## Graus

- "Hoje" de cada linha: **verificado**, lendo os arquivos citados em 03/11.
- Volume da opção (c) do F-PC1-1 ("milhares de linhas"): **inferido**, pelo número de vendas de um salão por trimestre.
  Não medi.
- Regra do vencimento do DARF: **não lida** nesta triagem.

## Resposta do contador (na íntegra, colada pelo dono em 03/11)

> Minha preferência seria manter exatamente o modelo de uma linha por passo, com RESUMO antes da MEMÓRIA, fazendo alguns
> acréscimos.
>
> ### 1. Formato
>
> Aprovado com ajustes
>
> Eu manteria:
>
> - Uma única aba para todas as apurações.
> - Uma linha por etapa do cálculo.
> - RESUMO primeiro, MEMÓRIA na sequência.
> - Identificação do regime, período, tributo e código DARF.
> - Histórico de substituição de apurações anteriores.
>
> Não criaria uma aba por trimestre. Isso dificulta comparar períodos, localizar diferenças e arquivar o histórico.
>
> Também não colocaria os passos em colunas: o formato vertical é mais fácil de filtrar, auditar e processar
> automaticamente.
>
> ### 2. Informações que acrescentaria
>
> | Informação | Prioridade | Motivo |
> | --- | --- | --- |
> | Código e nome da conta contábil | Alta | Identificar a origem do valor. |
> | Saldo do balancete utilizado | Alta | Conferir a conciliação com a contabilidade. |
> | Período de referência da origem | Alta | Identificar a competência dos dados. |
> | Identificador do lançamento ou documento de origem | Alta | Permitir rastrear o valor até sua origem. |
> | Fórmula ou regra de cálculo aplicada | Alta | Reproduzir e conferir o cálculo. |
> | Versão dos parâmetros legais | Alta | Saber quais parâmetros foram utilizados naquela apuração. |
> | Data de vencimento do DARF | Média | Acompanhar a obrigação tributária. |
> | Data e valor efetivamente recolhido | Média | Conciliar apuração e pagamento. |
>
> Uma distinção importante: a data de recolhimento não precisa integrar a memória de cálculo propriamente dita. Eu a
> manteria como informação de acompanhamento financeiro, associada ao código de receita e à apuração.
>
> ### 3. Minha preferência final
>
> Eu gostaria de conseguir percorrer esta cadeia:
>
> RESUMO DA APURAÇÃO
>
> Base de cálculo · Imposto devido · Deduções · Saldo a pagar
>
> MEMÓRIA DE CÁLCULO
>
> Cada etapa, fórmula, parâmetro e valor utilizado
>
> RASTREABILIDADE
>
> Conta contábil → lançamento → documento → valor calculado
>
> RECOLHIMENTO E HISTÓRICO
>
> DARF → pagamento → substituições → versões anteriores
>
> Minha decisão: manteria a planilha de uma aba, em formato vertical, acrescentando principalmente a rastreabilidade até
> as contas contábeis e os documentos de origem.
>
> O objetivo é que alguém consiga conferir qualquer valor do IRPJ ou da CSLL e responder: de onde veio esse número, como
> foi calculado e qual informação contábil o sustenta?
>
> Se a planilha permitir isso sem precisar consultar o código-fonte do sistema, considero o formato adequado para minha
> rotina de conferência e arquivamento.
