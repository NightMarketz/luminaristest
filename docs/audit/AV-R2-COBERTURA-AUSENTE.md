# AV-R2 · Cobertura Ausente — as obrigações de teste não atendidas

**110 unidades com código executável no `server/src` não aparecem em nenhuma linha dos 154
arquivos de teste — 14.290 linhas de comportamento que nenhum teste nomeia.** Dessas, **43
carregam invariante de dinheiro, transação, inquilino ou período**: são as que quebram em
silêncio. A camada de controller é o buraco concentrado: **31 dos 34 controllers** não têm
menção alguma.

> **Este relatório não mede cobertura de linha e não avalia a suíte que existe.** Ele responde
> a outra pergunta: qual teste deveria existir e não existe. A força da suíte atual segue
> desconhecida (AV-03, teto 1, sem `node_modules`).

---

## Estado do grafo e do recorte

| | |
|---|---|
| Commit | `643d2eb` |
| Grafo | 10.841 nós · 23.540 arestas · `ready` |
| Recorte | `server/src` (630 arquivos `.ts`) |
| Unidades (não-teste, não-`.d.ts`) | 476 |
| Corpus de teste | 154 arquivos, 1,26 MB concatenados |
| Imports resolvidos | 1.535 relativos + 181 via alias `@/` + 278 externos |

**Método, em uma frase:** o grafo localizou as unidades e os papéis; o disco confirmou cada
uma (CBM-001). A pergunta de cobertura não foi "existe `<Unidade>.test.ts`?" — esse teste
subconta grosseiramente, porque neste repositório o arquivo de teste é nomeado pelo **cenário**
(`PostingRepository.concurrency.test.ts`, `AgingOutstanding.integration.test.ts`). A pergunta
foi: **o nome desta unidade aparece em algum lugar do corpus de teste?**

---

## Funil: de 476 a 110

| Etapa | Sai | Fica | Critério |
|---|---|---|---|
| Unidades no recorte | — | 476 | `.ts`, fora de `__tests__` |
| Nomeadas em algum teste | 269 | 207 | `includes` no corpus, com caso de sanidade |
| Sem código executável | 88 | 119 | interface, type, model declarativo, barrel |
| Órfãs (fan-in 0, sem invariante, não-fronteira) | 9 | **110** | devolvidas ao AV-11 |

As 88 descartadas por serem tipo puro incluem todos os `I*Repository` e `I*Policy` — verificado
em `IReceivableRepository.ts`: 130 linhas, **zero** classes ou funções. Exigir teste de um
arquivo de tipos seria ruído, e um relatório de 207 linhas com metade impossível de acionar é
pior que um de 110.

---

## Peça central · as obrigações, por peso de invariante

Ordenação: número de invariantes distintos, depois fan-in. **Não por tamanho de arquivo** — um
arquivo grande sem invariante e sem fan-in é dívida do AV-11, não urgência de teste.

### Nível 1 · três invariantes ou mais — quebram em silêncio

| # | Unidade | Papel | Fan-in | Invariantes | O que o teste deve afirmar | Mutação do AV-03 que ele mata |
|---|---|---|---|---|---|---|
| 1 | `controllers/accountingController.ts` (625 l.) | controller | 1 | dinheiro, inquilino, autoriza | Que um pedido com `unitId` de outro dono retorna 403 e **não** vaza nem a existência do recurso; e que valor monetário chega ao serviço em centavos inteiros, não em float do corpo JSON | **M5** (remover filtro de inquilino) e **M4** (trocar sinal/lado do valor) |
| 2 | `repositories/CounterpartyRepository.ts` (57 l.) | repository | 1 | tx, inquilino, soft-delete | Que toda escrita dentro de `runTransaction` recebe o `tx` e que a leitura exclui `deletedAt` — nos **dois** sentidos: o registro apagado não volta na lista e a chave dele não bloqueia recriação | **M3** (remover propagação de `tx`) |
| 3 | `repositories/DimensionRepository.ts` (143 l.) | repository | 1 | tx, inquilino, soft-delete | Idem, mais: que a dimensão de um dono nunca aparece na consulta de outro, mesmo por id direto | **M3** e **M5** |
| 4 | `repositories/ReferentialMappingRepository.ts` (88 l.) | repository | 1 | tx, inquilino, soft-delete | Que o de-para RFB versionado não mistura versões entre donos e que a escrita é atômica com o lançamento que a origina | **M3** |

### Nível 2 · dois invariantes — DTOs de fronteira e serviços

| # | Unidade | Papel | Fan-in | Invariantes | O que o teste deve afirmar | Mutação |
|---|---|---|---|---|---|---|
| 5 | `dtos/DimensionDto.ts` (106 l.) | dto | 3 | dinheiro, inquilino | Que o parse **recusa** valor monetário fracionário, string vazia e `unitId` ausente — teste de rejeição, não de aceitação | **M2** (mover fronteira `>=`→`>`) |
| 6 | `dtos/CounterpartyDto.ts` (81 l.) | dto | 2 | dinheiro, inquilino | Idem, mais documento (CPF/CNPJ) malformado | **M2** |
| 7 | `dtos/DocumentAttachmentDto.ts` (55 l.) | dto | 1 | inquilino, soft-delete | Que o DTO não aceita referência a anexo de outro dono nem a anexo já apagado | **M5** |
| 8 | `dtos/ReferentialCatalogDto.ts` (72 l.) | dto | 1 | inquilino, autoriza | Que o parse rejeita escrita em catálogo de sistema (403 por desenho) | **M1** (inverter guarda) |
| 9 | `dtos/InventoryDto.ts` (63 l.) | dto | 0 | dinheiro, inquilino | Que quantidade negativa e custo acima do teto `MAX_CENTS` são recusados na fronteira | **M2** |
| 10–12 | `DataExchangeDto`, `EntryApprovalDto`, `ReferentialMappingDto` | dto | 2 | inquilino | Que cada um recusa payload sem escopo de inquilino, em vez de aceitar e filtrar depois | **M5** |
| 13 | `services/LuminarisAgentService.ts` (229 l.) | service | 2 | autoriza | Que a proposta de ação do agente não executa sem confirmação e que ferramenta fora da lista é recusada | **M1** e **M6** (retorno antecipado antes do gate) |

### Nível 3 · a camada de controller inteira

**31 dos 34 controllers não são nomeados por nenhum teste.** Os três que são:
`crmController`, `dynamicTablesController` e os cobertos pelos `*.routes.integration.test.ts`.

| Controllers sem menção | Linhas |
|---|---|
| `dashboardController` · `documentsController` · `reconciliationController` | 376 · 331 · 281 |
| `dataExchangeController` · `documentAttachmentController` · `payableController` · `receivableController` · `referentialMappingController` · `customKpiController` | 172 · 146 · 148 · 148 · 148 · 144 |
| `entryApprovalController` · `dimensionController` · `interviewController` · `userController` · `dashboardLayoutController` | 129 · 126 · 113 · 122 · 192 |
| `analyticsController` · `structuredDataController` · `referentialCatalogController` · `savedViewsController` · `analyticsDefinitionsController` | 166 · 90 · 90 · 76 · 95 |
| `counterpartyController` · `reportsController` · `spedController` · `salesController` · `attachmentsController` · `chatInstancesController` · `chatMessagesController` · `closingController` · `packageBalanceController` · `authUtilityController` · `chatController` | 78 · 60 · 57 · 56 · 124 · 99 · 50 · 34 · 31 · 27 · 22 |

**O teste que falta é o mesmo para todos, e é um só por controller:** que o handler recusa —
com o código HTTP certo — o pedido de um dono sobre recurso de outro, e que o parâmetro que
ele aceita é o parâmetro que ele usa. Esse segundo ponto é a classe de bug "param aceito e
ignorado", que já mordeu este repositório antes.

Mutação que essa família mata: **M5** e **M6**.

### Nível 4 · o resto, por papel

| Papel | Obrigações | Nota |
|---|---|---|
| `outro` (motores, processadores, registries) | 29 | analytics: `AggregatePipelineProcessor` (433 l.), `MultiTableCalculationProcessor` (195 l.), `TemporalAggregationProcessor` (127 l.) e mais 6 processadores; interview: 6 unidades de `CustomizationService`/`FieldCustomizationService` |
| `service` | 10 | `AnalyticsService` (558 l.), `CustomizationService` (478 l.), `InterviewService` (183 l.), `CrmAnalyticsService`, `DocumentProcessingService`, `dimensionTagging`, `dataExchangeMappers` |
| `repository` | 8 | 4 já no nível 1; restantes: `AccountingPeriodRepository`, `ReferentialAccountRepository`, `ActionProposalRepository`, `ChunkRepository` |
| `dto` | 20 | 8 já acima; restantes concentrados em `crm/dtos` e nos DTOs de relatório contábil |
| `rule` | 4 | `ProductAutoStockPlugin`, `UnitAutoStockPlugin`, `appointmentSync`, `customerMetrics` — plugins do motor de regras, todos tocando `unitId` |
| `lib` | 4 | `ExcelExtractor`, `ExcelStructuredExtractor`, `qdrant-initializer`, `PromptSanitizer` |
| `sync` | 1 | `mappers/revenueSplit.ts` — split proporcional de receita, invariante de dinheiro (Σ == total) |
| `job` | 1 | `PurgeDeletedRecords.ts` — apaga em definitivo o que está soft-deletado |
| `preset` | 2 | `FieldPresetKnowledgeBase`, `PresetManager` |

---

## Órfãos · não são lacuna de teste

Nove unidades têm fan-in **zero**, nenhum invariante e não são fronteira. O AV-20 proíbe
listá-las como teste faltando: escrever teste para código que ninguém chama é pagar para
manter o que deveria sumir. Vão para o AV-11 decidir entre remover ou ligar.

| Unidade | Linhas |
|---|---|
| `features/dynamicTables/validation/GovernanceEngine.ts` | 279 |
| `scripts/audit-cashflow-kpi.ts` · `audit-cost-kpi.ts` · `audit-profit-kpi.ts` · `audit-revenue-kpi.ts` | 106 · 100 · 95 · 73 |
| `features/analytics/services/AnalyticsDefinitionValidator.ts` | 86 |
| `features/dynamicTables/utils/RelationUtils.ts` | 78 |
| `features/structuredData/types/Sheet.types.ts` | 43 |
| `features/dynamicTables/utils/TableUtils.ts` | 11 |

Os quatro `scripts/audit-*-kpi.ts` são scripts de auditoria manual de uso único — o veredito
provável é remoção, não teste. `GovernanceEngine.ts` com 279 linhas e fan-in zero é a única
que merece uma pergunta antes de qualquer decisão.

---

## Não medido

| Medição | Motivo | Consequência |
|---|---|---|
| Cobertura indireta (G6) | não enumerada por unidade | Uma unidade sem menção pode estar sendo exercida por teste de integração de outra camada. A lista diz "nenhum teste a nomeia", **não** "nenhum teste a executa". A diferença importa para priorizar. |
| Fan-in por CALLS no grafo | `in_degree` de `Class` vem ~0 por desenho | Instanciação via factory não é aresta `CALLS`; composição JSX também não. **Todo fan-in deste relatório é por IMPORTS, medido no disco.** Nenhuma classe foi ranqueada por `in_degree` (CBM-001). |
| Nó de articulação | não computado | O sinal mais forte de G3 ficou de fora; o ranking usa invariante + fan-in apenas. |
| `my-app` | fora do recorte | O frontend tem 20 arquivos de teste e não foi enumerado. |

---

## Três movimentos mais baratos

1. **Um teste de fronteira por controller, gerado do mesmo molde** — 31 arquivos quase
   idênticos: pedido cruzado entre donos → código de recusa; parâmetro aceito → parâmetro
   usado. Fecha a maior lacuna de camada com o menor custo unitário.
2. **Os quatro do nível 1** — `accountingController` e os três repositórios com tx + inquilino
   + soft-delete. São os que quebram sem ninguém ver.
3. **Os nove DTOs contábeis, como teste de rejeição** — DTO se testa pelo que ele **recusa**;
   um teste que só prova que o payload bom passa não mata mutação nenhuma.

---

## Inquérito

1. **Dos 31 controllers sem teste, quantos já são exercidos por um `*.routes.integration.test.ts`
   de outra rota?** *Onde a resposta existiria: rodando a suíte com cobertura — hoje impossível
   sem `node_modules`.* É a diferença entre 31 testes novos e talvez 12.
2. **`GovernanceEngine.ts` — 279 linhas, ninguém importa. Está morto ou está desligado?**
   *Onde existiria: em nenhum lugar do repositório.*
3. **Quando um DTO recusa um payload, alguém já viu a mensagem que o usuário recebe?**
   *Onde existiria: num teste de rejeição — exatamente os que não existem.*

---

## Auto-verificação

| Checagem | Resultado |
|---|---|
| Unidade sem executável na lista? | Nenhuma — 88 descartadas, filtro verificado em `IReceivableRepository.ts` |
| Classe ranqueada por `in_degree` do grafo? | Nenhuma — declarado em Não medido |
| Conclusão sustentada só por aresta? | Nenhuma — todo número veio do disco; o grafo deu papéis e censo |
| Número de saída truncada ou regex montada por string? | **Dois foram pegos antes de publicar** — ver abaixo |
| Órfão listado como teste faltando? | Não — 9 separados e devolvidos ao AV-11 |
| Linha da peça central que só diz "falta teste"? | Nenhuma nos níveis 1–3; o nível 4 é agregado por papel e declara isso |
| Ordenei por tamanho de arquivo? | Não — por invariante, depois fan-in |

### Três defeitos de medição pegos durante esta rodada

1. **Regex montada por concatenação.** `new RegExp("\\b"+nome+"\\b")` perdeu o escape; `\b`
   virou caractere backspace e o padrão nunca casou. Resultado descartado: *"454 de 476
   unidades sem teste"*. Real: 110. Pego por um caso de sanidade (`PostingService`, que tem
   1.352 linhas de teste, aparecia como "sem teste").
2. **Fan-in cego a alias.** O contador só resolvia `./` e `../`; os **181** imports via `@/`
   sumiam. Isso zerava o fan-in de todos os controllers e teria produzido uma lista de órfãos
   falsa — `AnalyticsResolver.ts`, 852 linhas, apareceria como código morto.
3. **Cobertura por nome de arquivo.** Procurar `<Unidade>.test.ts` subconta, porque o teste é
   nomeado pelo cenário. Trocado por busca no corpus inteiro.

Os três viraram emenda no AV-00 §2.2b — *a forma da saída é parte da medição* — com a regra
de que todo número do relatório passa por um caso de sanidade antes de ser publicado.
