# ADR-ANALYTICS-DEFS — Escrita de definições de analytics (destravar × apagar × congelar)

- **Data:** 2026-08-01 · **Emendas de F-AD6:** 2026-08-02 (duas análises independentes — ver aviso abaixo)
- **Status:** **Accepted (parcial) — RATIFICADO POR SINAL HUMANO 2026-08-01: `F-AD0 → (c) manter
  congelado`.** `F-AD5` (a tela) fica **explicitamente aberto** — e é ele que reabre este ADR.
  `F-AD1`, `F-AD2`, `F-AD3`, `F-AD4` ficam **dormentes** (só existem sob `F-AD0=(a)`).
  **`F-AD6` → ✅ RATIFICADO POR SINAL HUMANO 2026-08-02: `(a) MANTER até F-AD5 fechar`** — o dono
  confirmou que **há superfície de execução ad-hoc de KPI no roadmap**. Isso **supersede** a
  recomendação `(b)` que a análise de §2.4/F-AD6 deixou pendente de sinal. **A objeção de (b) NÃO foi
  vista pelo dono ao decidir e continua de pé — ver F-AD6.5**, que é o gatilho para reabrir. Barreira
  implementada e verificada: **§4.2**.

> ### ⚠ Aviso de leitura — duas análises independentes, uma divergência real
>
> Este ADR foi emendado **duas vezes no mesmo dia por sessões que não se viram** (`a94309e` 01:40 →
> PR #160; `be438e0` 02:01 → PR #161, mergeadas em sequência) — e uma **terceira** sessão (`f6da605b`
> 09:20 → PR #162) consertou o código do `custom-kpis` em paralelo, colidindo com a fatia da segunda
> (ver a nota de colisão em **F-AD6.6**). As duas primeiras rodaram o
> `_REUSE-CRITERION.md` sobre `KpiDefinition` × `PipelineSpec` e **chegaram a vereditos opostos na
> Etapa 1**. Ambas estão preservadas de propósito:
>
> | Seção | Veredito Etapa 1 | Rota até o resultado |
> |---|---|---|
> | **§2.4** (1ª) | **DIFERENTE em espécie** — diverge em shape **e** em posse; o critério **para** na Etapa 1 | logo o critério **não obriga** (c) |
> | **§2.6** (2ª) | **MESMO objeto** → Etapa 2 → um lado **morto** | logo *"reuse o vivo, não clone o morto"* **elimina** (c) |
>
> **Convergem no que decide:** o `_REUSE-CRITERION.md` **não sustenta (c)**, por dois caminhos
> independentes. **§2.6 concede a §2.4** na leitura da Etapa 1 (ver a nota de concessão lá) — a §2.4 é
> mais fiel à letra do critério, e a evidência que a §2.6 levantou (E15 da 1ª tabela: os vocabulários
> divergem **nos dois sentidos**) é argumento **a favor** da §2.4, não dela mesma. Onde a §2.6 acrescenta
> e a §2.4 não tinha: E20–E25 abaixo, o custo real de `F-AD5(c)` (§2.5) e os consertos executados
> (F-AD6.6).
- **Autores:** `luminaris-orchestrator` (roteamento, ORCH-001 — não implementa, não aprova) sobre
  evidência lida em código (CBM-001: nada aqui se apoia em grafo ou em memória sem leitura).
- **Origem:** achado **N1** da revisão independente do PR #157 (mergeado, `6500249`), que fechou o
  achado **F2** da auditoria AV-L1 (DTO Zod na fronteira do `analyticsDefinitionsController`).
- **Classe:** `DECISÃO ARQUITETURAL` — não é bug, é **reversão de decisão de desenho** com 4 documentos
  e 1 spec afirmando o contrário.
- **Não-contábil.** Fora do `ACCOUNTING-MASTER-MAP.md`; ORCH-006/ORCH-007 não se aplicam.

## TLDR (2 linhas)

`POST/PUT/DELETE /api/analytics/definitions` responde **403 para todos, inclusive o ADMIN dono**, desde o
baseline `0db3961` — **por desenho**, e o desenho está escrito em 4 lugares; destravar custa muito mais do
que a linha de policy sugere. O risco principal **não** é a policy: é que **não existe consumidor nenhum**
(zero chamadores no `my-app`, e o endpoint irmão `/analytics/custom-kpis` também é órfão), então destravar
sem decidir a tela produz uma superfície de escrita que ninguém usa e todo mundo precisa manter.

**Emenda de F-AD6 (2 linhas):** o irmão órfão `custom-kpis` **não** é "a mesma capacidade por outra
porta" — `KpiDefinition` e `PipelineSpec` divergem em **shape e em posse**, então o `_REUSE-CRITERION.md`
**não** obriga convergência (§2.4); e ele nunca esteve vivo (nasceu numa varredura de auditoria, sem
frontend, sem teste, sem OpenAPI, sem gate que o enxergue — E13–E17). Recomendação: **(b) deletar**;
o risco de errar é uma restauração de um commit (`54b1839`), não a perda de uma capacidade.

---

## 1. Evidência de código (CBM-001 — grau declarado por linha)

Tudo abaixo foi **lido no arquivo**, não inferido de grafo nem de memória.

| # | Claim | Grau | Evidência |
|---|---|---|---|
| E1 | `canManageData` devolve `false` quando `schema.ui.presentation === 'system'`, antes de qualquer checagem de posse | **verificado** | `server/src/features/dynamicTables/policies/DynamicTablePolicy.ts:30-34` |
| E2 | O preset `analyticsDefinitions` é `presentation: 'system'` | **verificado** | `server/src/features/dynamicTables/presets/systems/CoreSystemPreset.ts:47` |
| E3 | As três escritas passam por `createTableData` / `updateTableData` / `deleteTableData`, e as três consultam `canManageData` e lançam `ForbiddenError` | **verificado** | `analyticsDefinitionsController.ts:50,70,87` → `DynamicTableService.ts:514`, `:650`, `:775` |
| E4 | `options.isSystem` **NÃO** destrava: `canManageData(user, table)` nem recebe o parâmetro, e `isSystem` só é derivado 15 linhas depois (`:529`), a serviço de `enforceNoOverlap`/`runRules`/guardas de `readOnly`/`immutableAfter` | **verificado** | `DynamicTableService.ts:514` vs `:529`, `:534`, `:536`, `:664`, `:671` |
| E5 | O `GET` funciona porque só passa por `canView` (dono **ou** ADMIN) | **verificado** | `DynamicTableService.ts:476` → `DynamicTablePolicy.ts:13-15` |
| E6 | O desenho está afirmado em 4 lugares que teriam de ser reescritos junto | **verificado** | `presets/README.md` (tabela de `presentation`), `dynamicTables/README.md:70-73`, `DynamicTablePolicy.spec.ts:5-9`, `CoreSystemPreset.ts:39-41` |
| E7 | `PipelineSpec` é um **type TS fechado** (`source`+`measures` obrigatórios), mas na fronteira `pipeline` é só `JsonBlock` (objeto\|array) | **verificado** | `core/pipeline/Pipeline.ts:67-75` vs `dtos/AnalyticsDefinitionDto.ts:42,59` |
| E8 | Definição com pipeline inválido é **descartada em silêncio** na leitura: `if (!pipeline) continue` e `logger.warn` + `continue` para `source.kind` desconhecido | **verificado** | `AnalyticsService.ts:125`, `:133-139` |
| E9 | O próprio `VALID_BODY` do teste de integração (`{ source: 'sales', groupBy: 'month' }`) **não é** um `PipelineSpec` — seria aceito pelo DTO e descartado por E8 | **verificado** | `__tests__/analyticsDefinitions.routes.integration.test.ts:21-26` cruzado com E7/E8 |
| E10 | **Zero** chamadores no `my-app` — só dois rótulos i18n (`public/locales/{en,pt}/database.json:3`) | **verificado** | `grep -rn "analytics/definitions\|analyticsDefinition" my-app/` devolve só os dois JSON |
| E11 | `isNavigable` esconde tabelas `'system'` do dashboard — o rótulo i18n de E10 está **morto** hoje | **verificado** | `my-app/features/dashboard/category-views/shared/utils/presentationUtils.ts:31-33` |
| E12 | Existe um **segundo** caminho de analytics autorado pelo usuário, vivo e sem 403: `POST /api/analytics/custom-kpis` (stateless, Zod completo, valida campo contra o schema da tabela) — e ele **também** tem zero chamadores no `my-app` | **verificado** | `routes/analytics.ts:16` → `controllers/customKpiController.ts` (todo o arquivo); `grep custom-kpis my-app/` vazio |

### 1.1 Evidência adicional da emenda de F-AD6 (2026-08-01)

Mesma regra: tudo lido no arquivo ou medido em `git`, nada inferido de grafo.

| # | Claim | Grau | Evidência |
|---|---|---|---|
| E13 | `custom-kpis` **não existia no baseline** `0db3961`: nasceu ~6h depois, no commit de **varredura de auditoria** `54b1839` (`feat(analytics): custom KPI … (sec6)`), que criou 3 arquivos + 4 linhas de rota e **zero** arquivo de frontend, **zero** teste, **zero** bloco `@openapi` | **verificado** | `git show --stat 54b1839`; baseline `0db3961` = 2026-06-11 15:57, `54b1839` = 2026-06-11 21:41 |
| E14 | Desde o nascimento os 3 arquivos só foram tocados por **duas varreduras mecânicas** de eliminação de `any` (`bb85ef4`, `70f8927`) — nenhuma mudança de comportamento em ~2 meses | **verificado** | `git log --all --oneline -- customKpiController.ts KpiSchema.ts CustomKpiExecutor.ts` = 3 commits |
| E15 | In-degree **1** no server e **zero teste**: o único importador de `executeCustomKpisHandler` é `routes/analytics.ts:16`; `KpiSchema`/`CustomKpiExecutor` só são importados pelo próprio controller; **nenhum** arquivo de teste importa qualquer um dos três | **verificado** | `grep -rn "KpiSchema\|CustomKpiExecutor\|executeCustomKpis\|customKpiController" server/src server/test` — 7 hits, todos nos 2 arquivos acima |
| E16 | A rota **não está no OpenAPI**: `server/public/openapi.json` tem 137 paths, 10 sob `analytics`, e **nenhum** `custom-kpis`; `docs.paths.ts` documenta `discover/{tableId}`, `definitions` e `definitions/{id}` — não este | **verificado** | `openapi.json` (contagem por `Object.keys(paths)`); `routes/docs.paths.ts:914,995,1017` |
| E17 | **Nenhum gate existente pegaria E16.** `openapi-paths.test.ts` é um **piso** (`pathCount >= BASELINE`) sobre paths **documentados** — uma rota Express sem bloco `@openapi` é invisível para ele, e os outros dois guards (junk keys, `$ref` pendurado) também. Rota que nasce sem doc fica sem doc para sempre | **verificado** | `server/src/__tests__/openapi-paths.test.ts:31,36-39,45-51` |
| E18 | A superfície **viva** de "KPI sobre tabela do usuário" no produto é `GET /analytics/discover/:tableId` — **2 chamadores** no `my-app`. As duas portas de **autoria** (`custom-kpis` e `definitions`) têm **zero** | **verificado** | `my-app/lib/services/analytics.service.ts:10`; `my-app/features/dashboard/category-views/finance/services/FinanceService.ts:74` |
| E19 | `custom-kpis` **fecha posse** (`getTableById` → `canView`) **e não tem o oráculo de §2.2**: o `catch` devolve **404 uniforme** para "não existe" e para "não é seu". Em compensação chama `getAllTableData` → `findMany` **sem `take`** — N KPIs sobre **todas** as linhas da tabela em memória, no processo | **verificado** | `customKpiController.ts:89-97,124`; `DynamicTableService.ts:584-587`; `DynamicTableRepository.ts:131-136` |

> **E16 está RESOLVIDO desde 2026-08-02** (commit `424bc56`): o bloco `@openapi` de
> `POST /api/analytics/custom-kpis` entrou em `routes/docs.paths.ts` e a spec foi regerada —
> **137 → 138 paths, +152 linhas, 0 deleções**, com o `BASELINE` do guard subido a 138 de propósito.
> **E17 (o furo do gate) NÃO está resolvido** e continua valendo como classe: o piso não enxerga rota
> que nunca teve doc. Ver F-AD6.6.

### 1.2 Evidência da 2ª análise independente (2026-08-02) — E20–E25

Renumerada a partir de **E20** para não colidir com E13–E19 da 1ª análise. Só entram os itens que a
1ª tabela **não** tinha; onde as duas mediram a mesma coisa (in-degree, ausência de teste, ausência de
doc, `discover` como superfície viva), a 1ª tabela já cobre e a 2ª **confirma** — T5, não vira texto novo.

| # | Claim | Grau | Evidência |
|---|---|---|---|
| E20 | **Nada, em lugar nenhum, escreve linha na tabela CORE `analyticsDefinitions`** — nem usuário (403, E1–E4) nem sistema. A família `*AsSystem` cobre **tabela/schema/preset**, nunca **dado**: **não existe `createTableDataAsSystem`** | **verificado** | `grep "AsSystem" server/src` → só `createTableAsSystem:193`, `updateTableSchemaAsSystem:208`, `updateTableAsSystem:252`, `installPresetAsSystem:278`, `deleteTableAsSystem:445`. O único write de dado "de sistema" é `createTableData(..., {isSystem:true})` — que E4 já mostrou **não** driblar a policy |
| E21 | No **`dev.db` real** a tabela CORE `analyticsDefinitions` existe (instalada por preset) e tem **0 linhas** | **verificado por execução** | Probe via client Prisma contra `server/prisma/prisma/dev.db`: 1 tabela (`cmr2jy28z006gci1kqgp1vh7l`), `dynamicTableData.count({dynamicTableId})` → **0** (de 13 tabelas dinâmicas). **Peso baixo** — mede *um* banco de dev; quem sustenta a conclusão é E20, que é estática e exaustiva |
| E22 | `KpiDefinition.tableId` é **exigido pelo Zod e nunca lido** — o controller usa só o `tableId` de topo; nem `validateKpiDefinition` nem `executeCustomKpis` tocam `kpi.tableId`. Classe `param-aceito-e-ignorado` | **verificado** | `customKpiController.ts:82,90,124` × `KpiSchema.ts:24` (exigido) e `:68-94` / `CustomKpiExecutor.ts` inteiro (zero referências) |
| E23 | O comentário da própria policy **afirmava o contrário do código**: dizia que "*only internal system processes (`isSystem = true`) are authorised to write to them*", capacidade que E20 mostra não existir. **CORRIGIDO em `424bc56`** | **verificado** | `DynamicTablePolicy.ts` (comentário antigo × `:30-34`) × `DynamicTableService.ts:514` vs `:529` |
| E24 | **Não existe rota nenhuma que execute um `PipelineSpec` fornecido pelo cliente.** `analyticsController.ts` não lê `req.body` em lugar algum; os únicos endpoints de analytics que aceitam corpo são os de `definitions` (403 para todos). `aggregatePipeline` só é alcançável por spec autorado **no servidor** | **verificado** | `controllers/analyticsController.ts` (arquivo inteiro, zero `req.body`); `routes/analytics.ts`; `routes/analyticsDefinitions.ts` + E1–E4 |
| E25 | `discoverKPIsAsync` **sintetiza `PipelineSpec` a partir de um `tableId` cru** e emite KPIs escalares `sum`/`avg`/`count` com `dimensions: []`, como cards — mas **nenhum** dos 7 charts emite `filters`, e o `count` não leva `field`. A tradução que o repo já faz cobre só o caso **não-filtrado** | **verificado** | `AnalyticsService.ts:437-451`, `:454-467`, `:525-540`; zero ocorrências de `filters` no método |

## 2. Seis correções à premissa

**§2.1–§2.3 corrigem o briefing de entrada. §2.4–§2.6 corrigem _este ADR_** (T3: a regra que eu escrevo
se aplica primeiro a mim) — e **§2.6 corrige a análise que a escreveu**, concedendo à §2.4 numa
divergência entre as duas sessões (ver o aviso de leitura no topo).

Registradas porque **removem trabalho do plano** (T5: input que só confirma não vira texto; estas
contradizem).

### 2.1 A invalidação de cache **já existe** — a frente 2 do briefing não é trabalho

`kpiCacheService.invalidate(table.userId)` já roda nas **quatro** escritas de `DynamicTableService`:
`createTableData:551`, `updateTableData:769`, `deleteTableData:861`, `deleteTableDataBatch:911`. A chave de
cache do `AnalyticsService` é `` `${userId}:${presetKeyFilter ?? ''}` `` (`:62`) e `invalidate` casa
exatamente o segmento antes do primeiro `:` (`KpiCacheService.ts:49-57`) — o dono da tabela CORE é o mesmo
`userId` que compõe a chave. **Grau: verificado por leitura dos dois arquivos; NÃO verificado por teste** —
não há teste que amarre essa rota a essa invalidação. O resíduo real é uma barreira de uma linha, não uma
frente.

### 2.2 A guarda de posse do `resolveTableId` **fecha hoje em todos os sites** — o risco é outro

`resolveTableId` devolve o `tableId` cru quando não tem o prefixo `@@PRESET_TABLE_KEY::`
(`AnalyticsResolver.ts:30-32`), e `pipeline.source.kind === 'tableId'` cai nesse ramo — isso está correto no
briefing. Mas **todos** os consumidores desse retorno passam por `getTableById` → `canView` antes de ler
dado: `resolveChartData:329`, `resolveChartDetails:544`, `fetchByTableId:401`, `fetchRecordsForDataPoint:227/254`,
e `getAllTableData:585` re-checa por dentro. **Verificado site a site.** Logo:

- **Não** existe leitura cross-tenant aberta hoje.
- O que existe é (a) **camada única** — qualquer call path futuro que resolva um `tableId` sem passar por
  `getTableById` perde a checagem, e (b) um **oráculo de existência**: com um `tableId` cru de outro
  tenant o `getTableById` lança `ForbiddenError` (403) *fora* do `try` de `resolveChartData` (o `try` abre
  em `:361`), enquanto um id inexistente devolve `"Table not found for key: …"`. Duas respostas
  distinguíveis = confirmação de existência de cuid. Severidade baixa (não vaza dado), classe conhecida
  (mesma família do "oráculo de enum" do council CRM), **mas** hoje o valor é do sistema; com autoria de
  usuário ele passa a ser **controlado pelo cliente**. É item de plano — como defesa em profundidade e
  fechamento de oráculo, não como conserto de furo aberto.

### 2.3 O gatilho do N1 **não está** registrado em `AV-L1-TRIAGEM.json`

**PR #155 foi mergeado** (`55838da`) — a triagem está em `main`, não mais numa branch. Re-verificado em
`origin/main` **depois** do merge: os quatro achados do arquivo são F1–F4; **zero** ocorrências de `"N1"`,
`canManageData` ou `presentation.*system` em `AV-L1-TRIAGEM.json`. O `"aceito com gatilho"` que existe no
JSON é o **F4** (`documentsController` bypassa factory), não o N1. **Consequência:** o gatilho *"quando
existir tela para autorar definições"* não tem registro durável na triagem — **este ADR é o registro**.
Registrá-lo também lá é uma edição em `main`, não algo que já aconteceu.

### 2.4 A premissa de `F-AD6(c)` está **errada**: `KpiDefinition` e `PipelineSpec` **não** são o mesmo objeto

A v1 deste ADR escreveu, em `F-AD6(c)`, que reconciliar os dois *"são duas formas diferentes para o mesmo
objeto de domínio, o gatilho exato do `_REUSE-CRITERION.md`"*. Isso foi afirmado **sem rodar o critério**.
Rodado agora, com os dois arquivos abertos lado a lado, ele responde o contrário.

#### Etapa 1 — DETECTOR: é o mesmo objeto? (shape **E** derivação/posse)

**Shape** — `KpiDefinition` (`features/analytics/schemas/KpiSchema.ts:22-28`) × `PipelineSpec`
(`features/analytics/core/pipeline/Pipeline.ts:67-75`):

| Eixo | `KpiDefinition` | `PipelineSpec` |
|---|---|---|
| medidas | exatamente **1** (`measure` + `field`) | `measures: Measure[]` — **1..n** |
| agrupamento | **nenhum** — o resultado é um escalar | `dimensions?: Dimension[]` (`field` \| `period`), 0..n |
| fonte | `tableId: string` **cru** | `source: DataRef` **discriminado** (`presetTable` \| `tableId`) |
| joins / sort / limit | não existem | `joins?: JoinRef[]`, `sort?: Sort`, `limit?: number` |
| vocabulário de medida | `sum`, `avg`, `count`, **`min`**, **`max`** | `sum`, `count`, `avg`, **`formula`** |
| operadores de filtro | `eq`, `gt`, `lt`, `gte`, `lte`, **`contains`** | `eq`, **`ne`**, **`in`**, **`nin`**, `gt`, `gte`, `lt`, `lte` |
| chave do operador no filtro | `operator` | `op` |
| identidade | carrega `name` (rótulo do resultado) | **não** carrega — o rótulo mora fora, no `title`/`key` da linha |
| saída | **um número** por KPI | **série** (dimensão × medida) |

**Nenhum dos dois é projeção do outro**, e a prova é **bidirecional**: `min`/`max` existem só no primeiro,
`formula` só no segundo; `contains` só no primeiro, `ne`/`in`/`nin` só no segundo. Convergir, portanto,
**não é estreitar** — é **unir dois vocabulários**: perde-se capacidade de um lado ou crescem os dois.

**Posse** — o segundo eixo do critério, e aqui o mais decisivo:

- `KpiDefinition` chega **no corpo da requisição**, por chamada, e **nunca é persistida**
  (`customKpiController.ts:73-82,137` — parse, executa, devolve). Quem possui a definição é **o cliente**.
  Resolução: `tableId` cru → `getTableById` → `getAllTableData`, uma tabela, agregação em JS no processo.
- `PipelineSpec` é uma **linha persistida** da tabela CORE `analyticsDefinitions`. Quem possui é o
  **servidor** — é exatamente disso que o 403 trata. Lida de volta por `AnalyticsService` sobre a própria
  tabela CORE e resolvida pelo `AnalyticsResolver`, que entende `@@PRESET_TABLE_KEY::` e joins.

Isto é, literalmente, o **sinal barato** que o critério manda usar: um é **prop-driven** (recebe a spec
inteira por requisição), o outro é **self-derived** (o servidor lê a própria tabela). O critério trata
essa diferença como *diferente em espécie*, não como clone.

> **Veredito da Etapa 1: DIFERENTE em espécie** — diverge em **shape** *e* em **posse**. O critério manda
> **parar aqui**: divergência **sancionada**, a Etapa 2 **não roda** para a decisão de reuso.
> **Consequência dura:** o `_REUSE-CRITERION.md` **não obriga** `F-AD6=(c)`. Convergir é trabalho
> **opcional de produto**, não pagamento de dívida de reuso — e a frase da v1 sai do ar.

#### Etapa 2 — rodada assim mesmo, por outro motivo

A Etapa 2 não decide reuso aqui (Etapa 1 já parou), mas decide **(a) × (b)**, que é pergunta de **estado**:

- **Lado `custom-kpis`:** in-degree 1, zero teste, zero doc, zero chamador de frontend, `change_count` 3 —
  dos quais **2 são varreduras mecânicas do repo inteiro** (E13–E16). Pelos próprios sinais que o critério
  lista para "legacy", ele é **morto de nascimento**: não é que tenha morrido, é que nunca esteve vivo.
- **Lado `definitions`:** a **leitura** está viva e é carregada (todo dashboard passa por `AnalyticsService`);
  a **escrita** está congelada por `F-AD0=(c)`.

O critério manda **não clonar o morto** — e, quando o morto não tem sequer um vivo correspondente para
herdar dele, sobra a pergunta de F-AD6, que é sobre **manter ou remover**, não sobre reusar.

### 2.5 O caminho "seed/sistema escreve a definição" **não existe hoje** — `F-AD5(c)` é mais caro do que este ADR estimou

*(2ª análise independente, 2026-08-02. Assunto distinto de §2.4 — não conflita com ela.)*

`F-AD5(c)` ("sem tela — autoria por seed/onboarding AI") está escrito neste ADR como *"torna `F-AD0=(a)`
desnecessário, porque o seed escreve via `*AsSystem`, sem policy"*, com custo **"0 no frontend"**.
**A premissa é falsa** (E20):

- A família `*AsSystem` tem **cinco** membros e todos operam sobre **tabela, schema ou preset**.
  **Não existe `createTableDataAsSystem`.**
- O único write de **dado** com sabor de sistema é `createTableData(user, tableId, dto, {isSystem:true})`
  — e **E4** já provou que `canManageData` roda em `:514`, quinze linhas antes de `isSystem` ser derivado
  (`:529`). Um seed que tentasse esse caminho tomaria **o mesmo 403**.
- **E23**: o comentário da policy afirmava exatamente a capacidade inexistente. É a origem provável do
  próprio N1 — quem leu o comentário concluiu, corretamente a partir dele e incorretamente a partir do
  código, que havia caminho de sistema. **Corrigido em `424bc56`.**

**Consequência para o dono (não decidida aqui):** se `F-AD5` fechar em **(c)**, ele **não** é "0 no
frontend". Exige **primeiro construir o caminho de escrita de sistema que não existe** — seja um
`createTableDataAsSystem`, seja passar `isSystem` a `canManageData`, seja o estado `'managed'` de
`F-AD1(c)`. Ou seja: **`F-AD5(c)` implica `F-AD1`**, e não o contrário.

### 2.6 A 2ª análise leu a Etapa 1 ao contrário — e **concede** à §2.4

*(2ª análise independente, 2026-08-02. Registrada porque divergiu, e porque perdeu.)*

Rodando o mesmo `_REUSE-CRITERION.md`, a 2ª análise concluiu **MESMO objeto de domínio** na Etapa 1 e
seguiu para a Etapa 2, onde achou o lado `KpiDefinition` **morto** e aplicou *"reuse o vivo, não clone o
morto"* para eliminar (c). O argumento era: mesma posse e mesma derivação — os dois leem linhas de **uma**
`DynamicTable` do usuário pelo `DynamicTableService` sob `canView` — mais a corroboração de E25 (o repo
já traduz o KPI escalar para `PipelineSpec` em `discoverKPIsAsync`).

**Onde ela erra, e a §2.4 acerta:**

1. **Shape.** O critério é explícito: *"DIFERENTE em espécie ⟺ difere no **shape** OU em quem possui o
   dado"*. A tabela de §2.4 mostra divergência de shape em 9 eixos, e a própria 2ª análise documentou que
   os vocabulários divergem **nos dois sentidos** (`min`/`max` × `formula`; `contains` × `ne`/`in`/`nin`).
   **Essa evidência é argumento a favor de §2.4** — a 2ª análise a levantou e a leu contra si mesma.
2. **Posse.** A 2ª análise mediu posse sobre **as linhas agregadas**; o critério mede posse sobre **o
   artefato comparado** — a spec. E aí a §2.4 está certa: `KpiDefinition` chega **por requisição**
   (prop-driven, cliente possui), `PipelineSpec` é **autorada pelo servidor** (self-derived). E24/E25
   **reforçam** a §2.4: em *todo* caminho existente de `PipelineSpec` quem possui a spec é o servidor.

**Veredito conciliado:** vale a Etapa 1 de **§2.4 — divergência sancionada**. A Etapa 2 da §2.6 não decide
reuso (a Etapa 1 já parou), mas sobrevive como leitura de **estado**, e nisso as duas concordam:
`custom-kpis` está morto. **As duas rotas matam (c) como obrigação de reuso** — é a convergência que
importa, e ela é mais forte por ter vindo de dois caminhos que discordavam.

---

## 3. Forks para ratificação

> Nenhum fork abaixo tem decisão tomada. As "recomendações" são do par de agentes, não do dono.
> **F-AD0 é existencial** — se ele fechar em (b) ou (c), os forks F-AD1..F-AD5 morrem junto.

### F-AD0 — Existencial: o que fazer com as três rotas de escrita — ✅ **DECIDIDO: (c)**

| Opção | Consequência | Custo |
|---|---|---|
| **(a) Destravar de verdade** | Analytics passa a ser autorável pelo usuário; o produto ganha o "usuário monta o próprio KPI" que a tese ERP-gen implica. Obriga F-AD1..F-AD5 **inteiros**: sem DTO de pipeline (F-AD2) o usuário salva e nada aparece, sem tela (F-AD5) nada disso é alcançável. Reescreve 4 docs + 1 spec (E6) | **Alto.** 5 fatias, ~12–16 arquivos (3 novos backend, 4 docs/specs reescritos, 4–6 frontend). Ordem de 2–3 PRs |
| **(b) Apagar as três rotas de escrita** (mantém `GET`) | Remove uma superfície de escrita que **nunca funcionou e ninguém chama** (E10). O DTO do PR #157 vira código morto e sai junto. Elimina o N1, o oráculo de §2.2 e a dívida de manutenção de uma vez. **Perde** o trabalho já mergeado do #157 e fecha a porta até alguém reabrir com ADR novo | **Baixo.** 1 fatia: `routes/analyticsDefinitions.ts` (3 linhas), controller (3 handlers), DTO, teste de integração, `docs.paths.ts`. ~5 arquivos, todos deleção |
| **(c) Manter congelado, documentar e barrar** | Status quo + uma barreira que impede o 403 de ser "descoberto" de novo como bug: um teste de rota que **exige** 403 do dono, ancorado neste ADR. Não entrega nada ao usuário; paga o custo mínimo de não repetir a investigação | **Muito baixo.** 1 arquivo de teste + 1 linha no INDEX. ~2 arquivos |

**Recomendação do par:** **(c) agora, (a) quando a tela entrar na fila do produto.** Razão: a decisão que
importa é F-AD5 (a tela) e ela é de produto, não de arquitetura — destravar antes dela produz superfície de
escrita sem consumidor, que é exatamente o estado que gerou este achado. **(b)** é a opção honesta se o dono
disser que autoria de KPI não é do roadmap; não recomendamos (b) às cegas porque `custom-kpis` (E12) mostra
que a capacidade foi tentada duas vezes — apagar sem decidir F-AD6 troca uma dívida por outra.

> **Viés declarado (T8):** o par tem incentivo estrutural a recomendar "congelar" — é a opção que não pode
> falhar em review. O contrapeso honesto: se a tese do produto é *"onboarding AI gera ERPs setoriais"*,
> KPI autorável é núcleo, não enfeite, e (c) empurra a dívida para um ponto em que ela custa mais.

### F-AD1 — (só se F-AD0=a) Onde reverter: policy × preset × terceiro estado

| Opção | Consequência | Custo |
|---|---|---|
| **(a) Exceção na policy** (allowlist por `internalName`) | A regra "`system` é read-only" continua verdadeira **menos uma tabela**. Exceção nomeada é dívida que cresce por precedente: a próxima tabela de infra autorável pede a segunda linha | 1 arquivo + spec |
| **(b) Tirar `presentation: 'system'` do preset** | Mais simples de escrever, mas **efeito colateral verificado**: `isNavigable` (E11) volta a listar "Analytics Definitions" como tabela normal no dashboard, com CRUD genérico de JSON cru. Isso é F-AD5(a) **de graça** — e explica por que os rótulos i18n de E10 existem. Pode ser o que se quer, mas tem de ser escolhido, não sofrido | 1 linha + reescrita dos 4 docs |
| **(c) Novo estado `'managed'`** (leitura como hoje, escrita do dono) | Torna a distinção *infra-imutável* × *infra-autorável* explícita em vez de exceção. Toca `TablePresentation` nos **dois** lados (backend + `presentationUtils.ts`), e decide de novo, por tabela, se `'managed'` é navegável | 4–6 arquivos, dois lados |

**Recomendação:** **(c)** se F-AD0=(a). É a única que não deixa a policy mentindo (o spec em E6 continua
verdadeiro para `'system'` de verdade) e não liga a tela por acidente.

### F-AD2 — Schema Zod para `PipelineSpec`

O type já existe e é fechado (E7); hoje a fronteira aceita qualquer objeto e o motor descarta (E8/E9).

| Opção | Consequência | Custo |
|---|---|---|
| **(a) Zod completo espelhando `Pipeline.ts`** (`DataRef`, `JoinRef`, `Filter`, `Dimension`, `Measure`, `Sort`) | Fecha E8/E9 na fronteira: o que salva, renderiza. Cria a obrigação de manter dois artefatos em sincronia (type × schema) | 1 arquivo (~70 linhas) + 1 spec |
| **(b) Zod mínimo** (só `source` discriminado + `measures` não-vazio) | Pega os dois casos que o motor realmente descarta, com 15 linhas. Deixa passar medida/dimensão malformada, que morre mais fundo | ~15 linhas |
| **(c) Manter `z.any()`** | Sem custo, mantém o descarte silencioso — inaceitável se F-AD0=(a) | 0 |

**Recomendação:** **(a)**, e derivar o type do Zod (`z.infer`) em vez de manter os dois — elimina a
sincronia manual que é a única objeção real a (a). Ponto de atenção: `Measure.formula` carrega `expression`
avaliada pelo `ExpressionEvaluator` — o Zod valida **forma**, não segurança da expressão; se F-AD0=(a),
a superfície do avaliador com input de usuário é revisão à parte (fora do escopo deste ADR).

### F-AD3 — Política de erro na leitura (`continue` × alto)

Hoje: `continue` silencioso (E8). Com F-AD2=(a), inválido **não entra mais** — o `continue` passa a cobrir
só dado legado.

| Opção | Consequência | Custo |
|---|---|---|
| **(a) Manter `continue` + `logger.warn`** | Uma definição podre não derruba o dashboard inteiro. O usuário ainda não vê *por que* o gráfico sumiu | 0 |
| **(b) Erro alto** | Falha explícita, mas uma linha ruim derruba todos os gráficos do usuário | 1 arquivo |
| **(c) Card de "definição inválida" por definição** | O usuário vê exatamente qual quebrou. É a resposta certa de produto e a mais cara | backend + frontend |

**Recomendação:** **(a)** — com F-AD2 no lugar, (b) e (c) protegem contra um caso que a fronteira já não
deixa entrar. (c) volta à fila se dado legado inválido aparecer em produção.

### F-AD4 — Guarda de posse para `source.kind === 'tableId'`

Contexto e limites reais em **§2.2** (não há furo aberto; há camada única + oráculo).

| Opção | Consequência | Custo |
|---|---|---|
| **(a) Validar posse na escrita** (o `tableId` autorado tem de pertencer ao autor) | Fecha na fronteira, onde o valor entra. Não protege definição já gravada nem call path futuro | ~10 linhas no controller/DTO |
| **(b) Guarda dentro de `resolveTableId`** | Fecha no ponto onde o briefing aponta, para todos os consumidores presentes e futuros. Muda a assinatura (precisa de `allTables`/`user`) — toca 6 call sites | 1 arquivo, 6 sites |
| **(c) Proibir `kind:'tableId'` em definição autorada por usuário** — só `presetTable` | `presetTable` resolve **dentro** de `allTables` do próprio usuário (`AnalyticsResolver.ts:40-46`), então a posse fica fechada por construção, com um estreitamento de enum. Custa a capacidade de apontar para uma tabela sem preset key | ~3 linhas no DTO |

**Recomendação:** **(c) + (a)**: (c) fecha por construção com o menor diff; (a) cobre o dia em que `tableId`
cru voltar a ser necessário. **(b)** só se o dono quiser a garantia independente do caminho — é a mais
robusta e a mais cara. Fechar o oráculo de §2.2 (mover o `getTableById` de `:329` para dentro do `try`, ou
uniformizar a resposta) é item pequeno e independente destes três.

### F-AD5 — A tela — 🔓 **ABERTO** (é ela que reabre este ADR)

| Opção | Consequência | Custo |
|---|---|---|
| **(a) Reusar o canônico** (`GenericTable` + `Modal`) sobre as rotas existentes, JSON cru no campo `pipeline` | Entrega autoria em dias, sem componente novo. O usuário edita JSON à mão — aceitável para operador interno, não para cliente final. Vem quase de graça em F-AD1(b) | 3–4 arquivos (service + página + modal), todos por skill existente |
| **(b) Builder de pipeline dedicado** (fonte → dimensões → medidas → filtros) | É o produto de verdade. Componente novo, sem canônico equivalente no repo → **risco de ilha** (`_REUSE-CRITERION.md` obrigatório antes de gerar) | 8–12 arquivos, PR próprio |
| **(c) Sem tela** — autoria por seed/onboarding AI | Consistente com "o onboarding AI gera o ERP": a definição nasce da entrevista, não da mão do usuário. Torna F-AD0=(a) **desnecessário** (seed escreve via `*AsSystem`, sem policy) | 0 no frontend; muda o alvo para `interview-setup-generator` |

**Recomendação:** nenhuma — **é decisão de produto e o par não decide.** Registrar só a implicação dura:
**(c) torna todo o resto deste ADR desnecessário**, porque o caminho de seed/sistema nunca passou por
`canManageData`. Se a resposta for (c), F-AD0 deve fechar em (b) ou (c).

### F-AD6 — `/api/analytics/custom-kpis` (E12): o irmão órfão — ✅ **DECIDIDO: (a) MANTER até F-AD5 fechar**

> **RATIFICADO POR SINAL HUMANO 2026-08-02: `F-AD6 → (a) manter`.** Perguntado se **há superfície de
> execução ad-hoc de KPI no roadmap** — preview de builder, painel "monte seu KPI", ferramenta de KPI do
> agente AI — o dono respondeu **SIM**. Como E24 mostra que essa categoria está **vazia** no repo hoje,
> `custom-kpis` passa a ser a única implementação existente dela, e a decisão foi mantê-la.
>
> **Isto supersede a recomendação `(b)` abaixo**, que foi escrita antes e deixada explicitamente
> *"aguardando sinal humano"*. **A análise de (b) NÃO foi apagada** — ela continua correta no que mede,
> e sua objeção mais forte sobreviveu à ratificação: **F-AD6.5**.
>
> **O que a decisão NÃO reverte:** (c) segue eliminada pelas duas rotas (§2.4 e §2.6). Quando a superfície
> ad-hoc for construída, ela deve executar **`PipelineSpec`** — as duas análises concordam nisso.
> Manter ≠ consagrar a segunda gramática.

Segundo caminho de analytics autorado pelo usuário: vivo, sem 403, com Zod completo **e** validação de
campo contra o schema da tabela — e **zero chamadores no `my-app`**.

**Duas correções ao que a v1 desta seção afirmou** (T5/T3 — só entram porque *contradizem*):

1. **A premissa de (c) caiu.** Não são "duas formas para o mesmo objeto de domínio": divergem em shape
   **e** em posse, e o `_REUSE-CRITERION.md` para na Etapa 1 com **divergência sancionada** (§2.4).
   O critério não obriga convergência aqui — (c) virou trabalho opcional, não dívida.
2. **A consequência de (b) estava enviesada.** *"Perde o único executor de KPI de usuário que **funciona**
   hoje"* é enganoso: nada o consome (E15/E16), e a superfície viva para a mesma pergunta de produto é
   `GET /analytics/discover/:tableId`, com 2 chamadores reais (E18). O que se perde não é uma capacidade
   em uso — são ~400 linhas de vantagem inicial, recuperáveis de **um** commit.

| Opção | Consequência | Custo |
|---|---|---|
| **(a) Deixar como está** | O custo **não é zero**, ao contrário do que a v1 registrou. Fica uma rota `POST` **viva** (sem 403), **sem doc** (E16), **sem teste** (E15), **sem gate capaz de enxergá-la** (E17) e que faz `findMany` **sem `take`** sobre a tabela alvo (E19). A próxima auditoria a reencontra — esta já é a segunda vez | 0 arquivos; **custo recorrente** de re-descoberta e de rota não observada |
| **(b) Deletar** ⭐ **recomendada** | Fecha a porta de **execução** no mesmo estado em que `F-AD0=(c)` fechou a de **persistência** — é o que a própria v1 pediu ("duas portas fechadas em vez de uma"), agora fechando de verdade. **Não remove capacidade nenhuma do produto:** `discover` segue sendo a superfície viva (E18). Reversível a custo ~0: `54b1839` é commit autocontido, sem dependentes | **Baixo.** 3 deleções (`controllers/customKpiController.ts`, `features/analytics/engine/CustomKpiExecutor.ts`, `features/analytics/schemas/KpiSchema.ts`) + 2 linhas em `routes/analytics.ts`. **Zero** teste a atualizar, **zero** path de OpenAPI a limpar (E16) |
| **(c) Convergir** | **Premissa falsificada** (§2.4). Convergir é **união lossy** de dois vocabulários (`min`/`max` × `formula`; `contains` × `ne`/`in`/`nin`) e **exige `F-AD5` decidido** para saber qual forma ganha: é o **único** ramo deste ADR que depende de produto | Alto e **bloqueado em `F-AD5`** — não decidível pelo agente |

**Recomendação: (b) deletar.** E ela **não depende de `F-AD5`** — o caso adversarial que tentei contra
essa conclusão foi exatamente esse: *"e se `F-AD5` voltar em semanas com o builder de pipeline reusando
`KpiDefinition` inteiro?"*. **Não flipa:** nesse cenário a restauração é `git show 54b1839 | git apply`
(4 arquivos, sem dependentes), contra o custo **garantido** de manter até lá uma rota viva não
documentada, não testada e invisível para todo gate. O único cenário em que **(a)** ganha é o dono já
saber que `F-AD5` fecha em (b) **e** que o builder nasce da forma **escalar** — informação que o agente
não tem e **não vai presumir**.

> **Viés declarado (T8):** simétrico ao de F-AD0 e por isso vale escrever. Lá o par tinha incentivo a
> **congelar**; aqui tem incentivo a **deletar**, porque deleção é a recomendação que sempre parece
> madura e nunca falha em review. O contrapeso honesto: se a tese "onboarding AI gera ERPs setoriais"
> implicar autoria de KPI, `custom-kpis` é o **único** pedaço dessa capacidade que **já executa** — e eu
> estou recomendando descartar trabalho já pago com base em "dá pra recuperar do git", o que é verdade
> **só enquanto alguém lembrar que existe**. Por isso o SHA `54b1839` está no corpo desta seção, e não só
> na história do repositório: este ADR é o que torna a reversibilidade real.

#### F-AD6.5 — A objeção de (b) que o dono **não viu** ao ratificar (gatilho de reabertura)

Registrada porque é a única coisa que poderia flipar a decisão, e a ratificação aconteceu **sem ela na
mesa** — as duas sessões correram em paralelo e a pergunta ao dono foi formulada pela 2ª, que não
conhecia o texto da 1ª. Honestidade de processo, não reabertura por conta própria:

- **O que o dono pesou:** *"a categoria de execução ad-hoc está vazia; `custom-kpis` é a única
  implementação existente dela"* — verdadeiro (E24).
- **O que ele não pesou:** essa implementação está na **gramática errada**, e **as duas análises
  concordam** que a superfície ad-hoc deve executar `PipelineSpec`. Se isso vale, manter `custom-kpis`
  **não é vantagem inicial** — é manter uma rota viva, não testada e (até `424bc56`) invisível para todo
  gate, que ninguém vai reusar. A restauração, se um dia fizer falta, é `git show 54b1839 | git apply`:
  **um commit autocontido, sem dependentes**.
- **A própria seção de (b) antecipou o cenário e o qualificou de forma mais estreita do que a pergunta
  feita:** *"o único cenário em que **(a)** ganha é o dono já saber que `F-AD5` fecha em (b) **e** que o
  builder nasce da forma **escalar**"*. O "sim" do dono confirma a **primeira** metade; **não** a segunda.

**Assimetria que torna (a) a escolha segura mesmo assim, e por isso nada foi desfeito:** `(a)` preserva
tudo e é reversível a qualquer momento; `(b)` destrói e exige sinal novo. Ficar em `(a)` **não fecha** a
porta de `(b)`. **Gatilho explícito:** se `F-AD5` fechar e a superfície ad-hoc nascer executando
`PipelineSpec` — o que ambas as análises esperam — então `(b)` volta à mesa **automaticamente**, porque
nesse momento `custom-kpis` deixa de ter qualquer justificativa e a decisão perde a premissa.

#### F-AD6.6 — O que `(a)` ativa

`(a)` tem custo, e ele está enumerado em §3/F-AD6 na linha da própria opção. Dois itens foram executados
em `424bc56`; dois seguem abertos.

| Item | Evidência | Estado |
|---|---|---|
| **1. `kpis[].tableId` exigido-e-ignorado** | E22 | ✅ **FECHADO por PR #162** (`f6da605b`). Resolvido no ramo **(iii) 400**: request com `kpis[].tableId` divergente do `tableId` de topo agora é rejeitado, em vez de devolver em silêncio números da tabela errada |
| **2. Rota fora do `openapi.json`** | E16 | ✅ **FECHADO por PR #162** (`f6da605b`): bloco `@openapi` **no controller**, `BASELINE` 137→138, spec regerada. **Substituiu** a correção equivalente de `424bc56`, que punha o bloco em `routes/docs.paths.ts` — ver a nota de colisão abaixo |
| **3. Comentário mentiroso da policy** | E23 / §2.5 | ✅ **FEITO 2026-08-02** (`424bc56`). O comentário agora diz o que o código faz — read-only para **todos**, inclusive dono, ADMIN e chamador interno — e nomeia as duas razões, apontando este ADR e a barreira. Write-lock 8/8, policy spec 11/11 |
| **4. Furo do gate de wiring** | E17 | 🔓 **ABERTO — registrado, não construído.** Nenhum dos 3 guards de OpenAPI pega esta classe: um piso não sente falta de path que **nunca** foi contado, e os guards de junk/`$ref` só inspecionam o que a spec **já contém**. Pegar exige diff *tabela-de-rotas × spec*, que não existe. Anotado no próprio `openapi-paths.test.ts` |
| **5. `findMany` sem `take`** | E19 | ✅ **FECHADO por PR #162** — e por um caminho **melhor do que "pôr `take`"**: teto por **recusa** (`400` acima de `MAX_KPI_ROWS = 50_000`, contando antes), porque `getAllTableData` é compartilhado por 15 call sites e um `take` local **truncaria a entrada de um `sum`/`avg`, devolvendo número plausível e ERRADO**. Upgrade path anotado no código |
| **6. Cobertura de teste** | E15/E20 | ✅ **FECHADO por PR #162**: 6 testes de integração no arquivo que já cobria analytics — inclusive um `200` real que semeia 4 linhas (uma soft-deleted) e trava os valores |

> **Nota de colisão (3 sessões paralelas no mesmo fork).** Além da divergência de §2.4×§2.6, uma **terceira**
> sessão (PR #162, 09:20) consertou `custom-kpis` de forma **mais completa** que a fatia de `424bc56`:
> documentou **e** testou **e** limitou **e** fechou o `tableId`. As duas correções de OpenAPI colidiam de
> modo perigoso — o mesmo path definido **duas vezes** (controller × `docs.paths.ts`), que o
> `openapi-paths.test.ts` **não** pegaria, porque a contagem de paths não muda quando um bloco
> sobrescreve o outro. **Resolvido descartando a versão de `424bc56`**: `docs.paths.ts` voltou ao estado
> de `origin/main` e a spec regerada ficou **byte-idêntica** à do #162. É o `_REUSE-CRITERION.md` aplicado
> ao próprio trabalho — entre dois impls do mesmo objeto, some com o pior, mesmo sendo o seu.

**Gates:** `cd server && npx tsc --noEmit` exit 0; após a reconciliação, `openapi-paths` +
`analytics.routes.integration` + `DynamicTablePolicy` + `systemTableWriteLock` = **33/33**. Antes da
entrada do #162, a suíte completa do server rodou **154/154 suites, 1850/1850 testes**.

---

## 4. Plano fatiado (**DORMENTE** — era condicional a F-AD0=(a))

> **F-AD0 fechou em (c).** Este plano inteiro está **substituído** pela fatia única de §4.1, que já foi
> implementada. As cinco fatias abaixo ficam registradas como o custo real de reabrir — é o que
> `F-AD5` compra se a resposta dele for "sim, tem tela".

**Ordem serial, sem lote paralelo.** `_PARALLELIZATION-CONTRACT.md` PAR-005: as fatias 1–3 editam o
**mesmo** subtree (`features/analytics/dtos/` + `dynamicTables/policies/`) e a fatia 4 depende do
comportamento das anteriores para ser verificável. Cinco fatias pequenas e acopladas não pagam o custo de
worktree/merge — **fatiar em paralelo aqui seria cerimônia, não velocidade.**

| Fatia | Skill(s) | Entregável | Gate de saída |
|---|---|---|---|
| **0** | — (humano) | Ratificação fork-a-fork de F-AD0..F-AD6; status deste ADR vira `Accepted` | Sinal humano registrado no ADR |
| **1** | `backend-dto-generator` | `features/analytics/dtos/PipelineSpecDto.ts` conforme **F-AD2**; `AnalyticsDefinitionDto` troca `JsonBlock` por ele no campo `pipeline`; estreitamento de `source` conforme **F-AD4(c)** | `npx tsc --noEmit` limpo; spec que **rejeita** o `VALID_BODY` atual do teste de integração (E9) — se ele continuar passando, o DTO não fez nada |
| **2** | `backend-policy-generator` | Reversão conforme **F-AD1**; reescrita dos **4** artefatos de E6 (`presets/README.md`, `dynamicTables/README.md`, `DynamicTablePolicy.spec.ts`, comentário do `CoreSystemPreset.ts`) | `DynamicTablePolicy.spec.ts` afirma a regra **nova** (não a antiga); teste de rota: dono faz `POST` e recebe **201**, não-dono recebe **403** |
| **3** | `backend-service-generator` | **F-AD4(a)** (posse na escrita) + fechamento do oráculo de §2.2; barreira de uma linha para a invalidação de cache de §2.1 | Teste: definição criada aparece no `GET /analytics/...` seguinte **sem** esperar TTL |
| **4** | `frontend-api-service-generator` → `frontend-table-screen-generator` → `frontend-modal-generator` → **`frontend-design-system`** (obrigatória junto) | A tela conforme **F-AD5**. **Antes de gerar:** responder `_REUSE-CRITERION.md` (shape+posse) e localizar o canônico por `search_graph`/`SIMILAR_TO` — se F-AD5=(b), **risco de ilha declarado** | `cd my-app && npx tsc --noEmit`; verificação em **build de produção** (a tela fica atrás de `withAuth`); `neutral-*`, `rounded-2xl` |
| **5** | `learning-log` | Linha no `docs/adr/INDEX.md`; registro das decisões não-óbvias; nota sobre §2.3 em `main` (PR #155 já mergeado) | INDEX.md com a linha; ledger/memória atualizados |

**Revisão:** ao fim das fatias 1–4, delegar a `luminaris-reviewer` em **agente isolado / worktree próprio**.
PASS emitido pela mesma sequência que implementou é rejeitado por regra (memória
`reviewer-independence-separate-agent`).

### 4.1 Planos alternativos (uma fatia cada)

- **F-AD0=(b) apagar:** deletar os 3 handlers de escrita + as 3 rotas + `AnalyticsDefinitionDto.ts` + o
  teste de integração; limpar `docs.paths.ts`; decidir F-AD6 na mesma fatia. Gate: `tsc` limpo nos dois
  lados + `npm run docs:generate` sem path órfão (memória `openapi-wiring-static-artifact`).
- **F-AD6=(a) manter — ✅ RATIFICADO 2026-08-02.** A fatia que isso ativa está em **F-AD6.6**: itens 2 e 3
  executados em `424bc56`; itens 1, 4 e 5 abertos. O plano de deleção de `(b)` fica registrado em
  §3/F-AD6 como o custo de reabrir — gatilho em **F-AD6.5**.
- **F-AD0=(c) congelar — ✅ IMPLEMENTADO 2026-08-01.**
  `server/src/features/dynamicTables/services/__tests__/DynamicTableService.systemTableWriteLock.test.ts`
  (1 arquivo, 8 casos, projeto `unit`, sem DB/HTTP). Detalhe em §4.2.

---

### 4.2 A barreira implementada (fatia de F-AD0=(c))

**Onde ela NÃO pôde morar, e por quê.** A barreira natural seria um teste de rota exigindo 403 do dono.
Ela é **vacuosa nos dois ambientes**, por motivos *diferentes* — e essa diferença é a armadilha:

| Ambiente | O que o POST do dono responde | Por quê |
|---|---|---|
| Shell local nu | **500**, antes da policy | `getCoreTableId` chama `getFactory()`, que constrói `OpenAIService`; `test/jest.setupEnv.ts` define só `DATABASE_URL`/`NODE_ENV`/`JWT_SECRET` |
| CI | **400** (`CORE analyticsDefinitions table not found`), antes da policy | `.github/workflows/ci.yml:23` injeta `OPENAI_API_KEY: ci-dummy-openai-key` no nível do job, então o factory **constrói normalmente** — mas `seedUser` não instala preset nenhum, e o controller morre no lookup da tabela CORE |

Ou seja: um teste de rota assertando 403 passaria **verde pelo motivo errado** em qualquer um dos dois.
Para produzir um 403 de verdade ali seria preciso primeiro **instalar o `CoreSystemPreset` para o usuário
semeado** — helper que não existe em `test/helpers/` (só `seedUser`/`seedDocument`/`seedDashboardLayout`/
`seedChatInstance`). Não é impossível; é caro e **frágil ao ambiente**. A camada de **service**, com
repositório falso e **policy real**, contorna os dois problemas e prende exatamente os elos que importam.

> Correção registrada: a primeira redação desta seção dizia só "o POST responde 500" e tratava isso como
> propriedade do repo. É propriedade do **shell local**. O CI injeta a chave (medido em `origin/main` @
> `5621c38`, que corrige o mesmo erro na triagem AV-L1 — "afirmei ausência sem procurar"). A conclusão
> — barreira no service — não muda; a justificativa, sim.

**O que ela prende que já não estava preso.** `DynamicTablePolicy.spec.ts` já afirma
`canManageData === false` para `presentation: 'system'` — mas sobre uma tabela **fabricada à mão**. Ele
continua verde se alguém tirar o flag do preset, ou mover a consulta à policy para depois de outra guarda.
Os dois elos soltos são exatamente o conteúdo da barreira:

| Caso | O que prende |
|---|---|
| elo 1 (1 caso) | O preset **real importado** carrega `ui.presentation === 'system'` |
| elo 2 (4 casos) | `create`/`update`/`delete` recusam o **dono** — inclusive o dono com papel **ADMIN** — com a policy real |
| armadilha (2 casos) | **`options.isSystem: true` NÃO destrava** (E4). É o caso que a próxima pessoa vai tentar |
| CONTROLE (1 caso) | Sem o flag, o **mesmo corpo** morre em `ValidationError` — prova que o 403 vem do flag e **não** do falso, e fixa a **ordem** (policy antes da validação de payload) |

**Verificação executada (não afirmada):** `npx tsc --noEmit` limpo; **8/8 verdes**; e duas mutações
provaram que a barreira é carregada — não decorativa:

| Mutação | Resultado |
|---|---|
| Remover `if (presentation === 'system') return false;` da policy | **6 de 8 vermelhos** |
| Remover `ui: { presentation: 'system' }` do preset | **7 de 8 vermelhos** |

Ambos os arquivos revertidos (`git checkout --`); `git status` limpo fora dos entregáveis. Em ambas as
mutações o CONTROLE permaneceu verde — que é o esperado, e é o que mostra que ele mede outra coisa.

## 5. Fora de escopo

- Segurança do `ExpressionEvaluator` sob `Measure.formula` com input de usuário (nasce em F-AD2(a); é
  revisão própria).
- Rótulos i18n mortos de E10 — só passam a importar em F-AD1(b)/(c).
- Qualquer coisa em `server/src/features/accounting/`. Este ADR não toca o ledger.

## 6. Riscos e vieses

1. **Viés de congelamento (T8):** ver F-AD0. O par prefere a opção que não falha em review; o dono decide
   contra a tese do produto, não contra o risco de review.
2. **§2.1 é verificado por leitura, não por teste** — se a invalidação de cache tiver um caminho que não
   li, ela ressurge como bug de "definição nova não aparece". A barreira da fatia 3 é o que **teria
   falhado** se eu estivesse errado (OPS-001 #4).
3. **§2.2 é o inverso do risco esperado:** o briefing tratava a guarda como furo; a leitura site-a-site
   diz que não é. Se um call path novo aparecer entre este ADR e a implementação, a conclusão muda —
   `detect_changes` sobre `AnalyticsResolver.ts` antes de executar a fatia 3.
4. **F-AD5 é fora do alcance do agente.** Se o dono não responder F-AD5, F-AD0=(a) **não deve** começar:
   é a definição de superfície sem consumidor que produziu este achado.

## 7. Relacionados

- PR #157 (`6500249`) — DTO Zod na fronteira (AV-L1 F2). Este ADR nasce do N1 da revisão daquele PR.
- PR #155 (**mergeado**, `55838da`) — `docs/audit/AV-L1-TRIAGEM.json` agora em `main`; ver **§2.3**.
- `5621c38` — a correção "o CI JÁ injeta a chave dummy" na própria triagem. É a evidência de §4.2 e o
  precedente do mesmo erro que corrigi ali: afirmar ausência de ambiente sem ler o workflow.
- Memória `isSystem-nao-driba-canManageData` — a armadilha de E4, confirmada.
- `.claude/skills/_REUSE-CRITERION.md` — obrigatório na fatia 4 e em F-AD6(c).
