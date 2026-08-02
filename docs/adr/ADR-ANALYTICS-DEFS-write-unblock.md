# ADR-ANALYTICS-DEFS — Escrita de definições de analytics (destravar × apagar × congelar)

- **Data:** 2026-08-01 · **Emenda F-AD6:** 2026-08-02
- **Status:** **Accepted (parcial) — RATIFICADO POR SINAL HUMANO 2026-08-01: `F-AD0 → (c) manter
  congelado`.** `F-AD5` (a tela) fica **explicitamente aberto** — e é ele que reabre este ADR.
  `F-AD1`, `F-AD2`, `F-AD3`, `F-AD4` ficam **dormentes** (só existem sob `F-AD0=(a)`).
  **`F-AD6` tem agora o `_REUSE-CRITERION.md` respondido com evidência (F-AD6.1): (c) está ELIMINADA;
  o fork real é (a) × (b), com `(b) deletar` como default — pendente de UMA pergunta ao dono (F-AD6.3).**
  Nada foi deletado: a emenda de 2026-08-02 é **só documento**, e passou por revisão adversarial
  independente que corrigiu 6 pontos (registrados inline). Barreira implementada e verificada: **§4.2**.
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

### 1.1 Evidência adicional para F-AD6 (emenda 2026-08-02)

Levantada para responder o `_REUSE-CRITERION.md` com fato, não com chute. Mesmo regime: **lido no arquivo**
(ou **executado**), nunca inferido de grafo.

| # | Claim | Grau | Evidência |
|---|---|---|---|
| E13 | Existe um **TERCEIRO** caminho de analytics — e é o **único com consumidor real**: `GET /api/analytics/discover/:tableId` é chamado pelo dashboard de finanças | **verificado** | `routes/analytics.ts:35` → `analyticsController.ts:88-101` → `AnalyticsService.discoverKPIsAsync:409`; consumo: `my-app/.../AnalyticsDashboard.tsx:111` → `hooks/analytics/useAnalyticsData.ts:128` → `services/FinanceService.ts:72-74` (e `my-app/lib/services/analytics.service.ts:10`) |
| E14 | `discoverKPIsAsync` **já sintetiza `PipelineSpec` a partir de um `tableId` cru** e emite KPIs escalares `sum`, `avg` (sobre um campo) e `count`, com `dimensions: []`, como cards. **Limite — corrigido pela revisão independente:** o `count` **não** leva `field`, e **nenhum** dos 7 charts sintetizados emite `filters`. A tradução que o repo já faz cobre o caso **não-filtrado**, não "exatamente os três KPIs do `custom-kpis`" como esta linha dizia na 1ª redação | **verificado** | `AnalyticsService.ts:437-451` (sum), `:454-467` (avg), `:525-540` (count, sem `field`); todos `processor:'aggregatePipeline'`, `source:{kind:'tableId', id: tableId}`; zero ocorrências de `filters` no método |
| E15 | Os dois formatos **não são** subconjunto um do outro. Em runtime: `min`/`max` só existem no `KpiDefinition`; `contains` só existe no `KpiFilter`; `ne`/`in`/`nin` só existem no `PipelineSpec`. Não é divergência de tipo — é divergência do **executor** | **verificado** | `CustomKpiExecutor.ts:94-141` (`count\|sum\|avg\|min\|max`) e `:47-78` (`eq\|gt\|lt\|gte\|lte\|contains`) × `AggregatePipelineProcessor.ts:151-169` (`sum\|count\|avg\|formula`) e `:101-128` (`eq\|ne\|in\|nin\|gt\|gte\|lt\|lte`) |
| E16 | **Nada, em lugar nenhum, escreve linha na tabela CORE `analyticsDefinitions`** — nem usuário (403, E1–E4) nem sistema. A família `*AsSystem` cobre **tabela/schema/preset**, nunca **dado**: não existe `createTableDataAsSystem` | **verificado** | `grep "AsSystem" server/src` → só `createTableAsSystem:193`, `updateTableSchemaAsSystem:208`, `updateTableAsSystem:252`, `installPresetAsSystem:278`, `deleteTableAsSystem:445` (`DynamicTableService.ts`). O único write de dado "de sistema" é `createTableData(..., {isSystem:true})` — que E4 já mostrou **não** driblar a policy |
| E17 | No **`dev.db` real** a tabela CORE `analyticsDefinitions` existe (instalada por preset) e tem **0 linhas** — o laço de leitura de `AnalyticsService:100-163` itera vazio | **verificado por execução** | Probe via client Prisma gerado contra `server/prisma/prisma/dev.db`: `internalName='analyticsDefinitions'` → 1 tabela (`cmr2jy28z006gci1kqgp1vh7l`), `dynamicTableData.count({dynamicTableId})` → **0** (de 13 tabelas dinâmicas no banco) |
| E18 | `KpiDefinition.tableId` é **exigido pelo Zod e nunca lido** — o controller usa só o `tableId` de topo do request; nem `validateKpiDefinition` nem `executeCustomKpis` tocam `kpi.tableId`. Classe `param-aceito-e-ignorado` | **verificado** | `customKpiController.ts:82,90,124` (só o `tableId` de topo) × `KpiSchema.ts:24` (exigido) e `:68-94` / `CustomKpiExecutor.ts` inteiro (nenhuma referência a `tableId`) |
| E19 | `POST /api/analytics/custom-kpis` **não está** no `server/public/openapi.json` commitado, enquanto `/api/analytics/definitions` está. Rota viva e não documentada (classe REV-006, wiring) | **verificado** | `grep -o '"/api/analytics[^"]*"' server/public/openapi.json` → 9 paths, `custom-kpis` ausente |
| E20 | **Nenhum** arquivo de teste referencia `CustomKpi`/`custom-kpis`/`executeCustomKpis`/`KpiDefinitionSchema` — **nem** `aggregatePipeline`/`compilePipeline`. Os dois executores estão sem cobertura direta | **verificado** | `grep -rl` sobre `src/**/*.{test,spec}.ts` + `test/` devolve vazio para os dois conjuntos. (`KpiEngine.spec.ts` cobre `RevenueKpiProcessor`, outro caminho) |
| E22 | **Não existe rota nenhuma que execute um `PipelineSpec` fornecido pelo cliente.** `analyticsController.ts` não lê `req.body` em lugar algum; os únicos endpoints de analytics que aceitam corpo são os de `definitions` (403 para todos). `aggregatePipeline` só é alcançável por spec autorado **no servidor** (preset estático ou `discoverKPIsAsync`) | **verificado (revisão independente)** | `controllers/analyticsController.ts` (arquivo inteiro, zero `req.body`); `routes/analytics.ts` (só `GET` fora do `custom-kpis`); `routes/analyticsDefinitions.ts` + E1–E4 |
| E23 | `KpiSchema` e `CustomKpiExecutor` **não têm nenhum importador** fora do próprio `customKpiController.ts` | **verificado (revisão independente)** | `customKpiController.ts:20` e `:22` são as duas únicas importações em todo `server/src` |
| E24 | Os presets estáticos que usam o pipeline são **13**, não "15+", e a chave é `templateKey`, não `processor` (`processor:'aggregatePipeline'` aparece **0×** em `presets/`) | **verificado (revisão independente)** | `SalesModule.ts:408,434,460,509` (4); `SalesItemsMixed.ts:32,66,97,158,215,275` (6); `ExpensesModule.ts:88,135,157` (3) |
| E21 | O comentário da própria policy **afirma o contrário do código**: diz que "*only internal system processes (`isSystem = true`) are authorised to write to them*" — mas nenhum processo de sistema escreve dado em tabela `'system'` (E16 + E4) | **verificado** | `DynamicTablePolicy.ts:28-29` (comentário) × `:30-34` (código) × `DynamicTableService.ts:514` vs `:529` |

## 2. Três correções à premissa de entrada

Registradas porque **removem trabalho do plano** (T5: input que só confirma não vira texto; estes três
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

**Nota de status (2026-08-02):** o próprio ADR e o registro do N1 na triagem também já foram mergeados —
**PR #158** (`f0bc39a`) e **PR #159** (`2cdda74`), ambos em `origin/main` desde 2026-08-01T18:36. Esta
emenda nasce **em cima de `origin/main`**, não de branch aberta.

**PR #155 foi mergeado** (`55838da`) — a triagem está em `main`, não mais numa branch. Re-verificado em
`origin/main` **depois** do merge: os quatro achados do arquivo são F1–F4; **zero** ocorrências de `"N1"`,
`canManageData` ou `presentation.*system` em `AV-L1-TRIAGEM.json`. O `"aceito com gatilho"` que existe no
JSON é o **F4** (`documentsController` bypassa factory), não o N1. **Consequência:** o gatilho *"quando
existir tela para autorar definições"* não tem registro durável na triagem — **este ADR é o registro**.
Registrá-lo também lá é uma edição em `main`, não algo que já aconteceu.

### 2.4 (emenda) O caminho "seed/sistema escreve a definição" **não existe hoje** — F-AD5(c) é mais caro do que este ADR estimou

Esta seção **corrige a v1 deste próprio ADR**, e é a correção que mais muda número: F-AD5(c) ("sem tela —
autoria por seed/onboarding AI") está escrito aqui como *"torna F-AD0=(a) desnecessário, porque o seed
escreve via `*AsSystem`, sem policy"* e com custo **"0 no frontend"**. **A premissa é falsa** (E16):

- A família `*AsSystem` do `DynamicTableService` tem **cinco** membros e todos operam sobre **tabela,
  schema ou preset** — `createTableAsSystem`, `updateTableSchemaAsSystem`, `updateTableAsSystem`,
  `installPresetAsSystem`, `deleteTableAsSystem`. **Não existe `createTableDataAsSystem`.**
- O único write de **dado** com sabor de sistema é `createTableData(user, tableId, dto, { isSystem: true })`
  — e **E4** já provou que `canManageData` roda em `:514`, quinze linhas antes de `isSystem` sequer ser
  derivado (`:529`). Um seed que tentasse esse caminho tomaria **o mesmo 403**.
- **E21**: o comentário da policy (`DynamicTablePolicy.ts:28-29`) afirma exatamente a capacidade que não
  existe. É provável que seja a origem do próprio N1 — quem leu o comentário concluiu, corretamente a
  partir dele e incorretamente a partir do código, que havia um caminho de sistema.

**Consequência para o dono (não decidida aqui):** se F-AD5 fechar em **(c)**, ele **não** é "0 no
frontend, muda o alvo para `interview-setup-generator`". Ele exige **primeiro construir o caminho de
escrita de sistema que não existe** — seja um `createTableDataAsSystem`, seja passar `isSystem` a
`canManageData`, seja o estado `'managed'` de F-AD1(c). Ou seja: **F-AD5(c) implica F-AD1**, e não o
contrário como a v1 sugeria. Corrigir o comentário de E21 é item de uma linha e independente de tudo isto.

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

### F-AD6 — `/api/analytics/custom-kpis` (E12): o irmão órfão — 🟡 **RECOMENDAÇÃO INSTRUÍDA: (b) deletar** — aguarda ratificação

Segundo caminho de analytics autorado pelo usuário: vivo, sem 403, com Zod completo **e** validação de
campo contra o schema da tabela — e **zero chamadores no `my-app`**.

#### F-AD6.1 — `_REUSE-CRITERION.md` respondido (era a investigação que a v1 deixou em aberto)

A v1 afirmou, sem prova, que `KpiDefinition` e `PipelineSpec` são *"duas formas diferentes para o mesmo
objeto de domínio"*. **A afirmação está certa, mas pela metade** — e a metade que faltava (Etapa 2) é a
que decide o fork. O critério tem **duas etapas e a 2 nunca colapsa na 1**:

**Etapa 1 — DETECTOR: é o mesmo objeto de domínio? → SIM.**

Respondido pelo par (shape, posse), não por aparência:

- **Mesma posse / mesma derivação.** Os dois derivam **linhas de uma única `DynamicTable` do próprio
  usuário**, lidas pelo `DynamicTableService` sob `canView`: `custom-kpis` via
  `getAllTableData(ctx, tableId)` (`customKpiController.ts:124`); o pipeline via
  `fetchByTableId(compiled.source.id)` (`AggregatePipelineProcessor.ts:217-227`). Não é "fonte parecida",
  é a mesma tabela lida pelo mesmo serviço.
- **A chave de domínio aparece nos dois shapes** — o sinal barato do critério. `KpiDefinition.tableId`
  (`KpiSchema.ts:24`) e `PipelineSpec.source = {kind:'tableId', id}` (`Pipeline.ts:13`). Nenhum dos dois é
  genérico/prop-driven: os dois carregam a identidade da tabela.
- **Corroboração que não depende da minha leitura comparativa (E14):** o repositório **já faz a
  tradução**. `discoverKPIsAsync` recebe só um `tableId` e emite, em `PipelineSpec`, o KPI escalar
  `sum`/`avg`/`count` com `dimensions: []`, renderizado como `type:'card'` (`AnalyticsService.ts:437-451`,
  `:454-467`, `:525-540`). **Peso corrigido pela revisão independente:** essa tradução cobre só o caso
  **não-filtrado** (E14 — o discover nunca emite `filters`), enquanto o `custom-kpis` agrega **com filtro
  do usuário**. Então E14 **não** é prova de equivalência ponta-a-ponta; é prova de que o caso trivial já
  está traduzido em código nosso. **Quem carrega a Etapa 1 é o shape:** `PipelineSpec.filters` (`Pipeline.ts:33-37`)
  expressa filtro por campo/operador/valor, que é literalmente o que `KpiFilter` (`KpiSchema.ts:16-20`)
  expressa — mesma tripla, outra grafia (`op` × `operator`).

→ **Mesmo objeto. NÃO pare aqui** (mesmo-objeto ≠ "consolide já"). Vá à Etapa 2.

**Delta real entre as formas (E15)** — é todo o custo de qualquer convergência, e não é o que a v1
imaginava. As formas **não são subconjunto uma da outra**; cada uma tem algo que a outra não executa:

| Capacidade | `KpiDefinition` / `CustomKpiExecutor` | `PipelineSpec` / `AggregatePipelineProcessor` |
|---|---|---|
| medidas | `count` `sum` `avg` **`min` `max`** | `count` `sum` `avg` **`formula`** |
| operadores de filtro | `eq` `gt` `lt` `gte` `lte` **`contains`** | `eq` `gt` `lt` `gte` `lte` **`ne` `in` `nin`** |
| dimensões / agrupamento | **não tem** | `field` + `period` (day…year) |
| joins, sort, limit | **não tem** | tem |
| saída | escalar `{kpiName, value, error}` | `ChartDataPoint[]` (o caso escalar é o `card` de E14) |

Ou seja: o que o lado `custom-kpis` tem de exclusivo são **duas medidas e um operador** — `min`, `max`,
`contains`. Nada estrutural.

**Etapa 2 — DECISOR: os dois lados estão vivos? → NÃO. Um está morto.**

| Lado | Sinais | Veredito |
|---|---|---|
| `PipelineSpec` **autorado no servidor** (a forma) | **13** configs de chart em preset estático (E24: `SalesModule` 4, `SalesItemsMixed` 6, `ExpensesModule` 3), o template `aggregatePipeline` registrado, `discoverKPIsAsync` — e **um consumidor real no frontend** (E13: `AnalyticsDashboard.tsx:111` → `useAnalyticsData.ts:128` → `/analytics/discover/{tableId}`) | **VIVO** |
| `KpiDefinition` / `custom-kpis` | rota registrada e sem 403 — mas **zero** chamadores no `my-app` (E12, re-verificado), **zero** importadores fora do próprio controller (E23), **zero** testes (E20), **ausente do `openapi.json`** commitado (E19), e um campo obrigatório que ninguém lê (E18) | **MORTO por abandono** |
| `PipelineSpec` **persistido em `analyticsDefinitions`** (o ramo autorado-e-salvo) | 403 para todos (E1–E4), **nenhum escritor de sistema existe** (E16), **0 linhas no `dev.db` real** (E17) | **MORTO — e é o que F-AD0=(c) já ratificou congelar** |
| `PipelineSpec` **fornecido por requisição** (executar spec do cliente, sem salvar) | **não existe implementação nenhuma** (E22): nenhuma rota de analytics lê `req.body` fora de `definitions` | **VAZIO — não é vivo nem morto; nunca foi construído** |

> Distinção que a v1 borrou, agora em quatro categorias (a 4ª entrou pela revisão independente):
> `PipelineSpec`-**a-forma-autorada-no-servidor** está vivíssimo; `PipelineSpec`-**persistido** está morto;
> `PipelineSpec`-**por-requisição** está *vazio*. As três são coisas diferentes e o fork depende de separá-las.
> **A categoria vazia é onde o `custom-kpis` compete** — e nela o "lado vivo" está tão vazio quanto o morto.
> É por isso que a recomendação abaixo é forte na Etapa 1/Etapa 2 e **condicional** em F-AD6.3.

**A regra do critério aplicada literalmente:** *"Se um está morrendo, **não clone o morto** — reuse o vivo
(ele herda; o morto some com a ilha dele)."*

→ **Isso mata a opção (c).** Convergir "`custom-kpis` vira a execução stateless" seria **promover a forma
morta a executor canônico** do KPI escalar — exatamente o anti-padrão que o critério nomeia. O executor
stateless do KPI escalar **já existe e já é o vivo**: `aggregatePipeline` com `dimensions: []`, provado
por E14. (c) não é convergência; é clonar o morto por cima do vivo.

#### F-AD6.2 — Os três forks, reavaliados

| Opção | Consequência | Custo |
|---|---|---|
| **(a) Deixar como está** | Mantém rota `POST` viva, sem consumidor, sem teste, fora do `openapi.json`, com um campo exigido-e-ignorado (E18). A próxima auditoria acha a mesma coisa por outro nome — que é literalmente como este ADR nasceu | 0 agora; recorrente depois |
| **(b) Deletar** ⬅ **recomendado, com a ressalva de F-AD6.3** | Remove a **única** superfície do repo que aceita KPI autorado em runtime (E22 — e depois dela a categoria fica **vazia**, não "coberta pelo vivo"). O que se perde de capacidade real é `min`, `max` e `contains` (E15), **não** "o único executor que funciona": ele não tem teste nenhum (E20) e o caso escalar não-filtrado já é executado pelo vivo (E14) | **Baixo.** 3 arquivos deletados — `controllers/customKpiController.ts`, `features/analytics/engine/CustomKpiExecutor.ts`, `features/analytics/schemas/KpiSchema.ts` — mais **2 linhas** em `routes/analytics.ts` (`:11` import, `:16` rota). Nenhum importador sobra (**E23**) |
| **(c) Convergir** | **Rejeitada por evidência**, não por custo: F-AD6.1/Etapa 2. Converger para a forma morta é clonar o morto; converger para a viva **é a opção (b)** com um adendo de 3 medidas/operadores — que é o item abaixo, não um projeto | — |

**(b′) Adendo — NÃO faz parte da recomendação de (b); fica pendurado em F-AD5.** Se um dia alguém autorar
pipeline (isto é: se **F-AD5** disser que existe tela), as três capacidades que só a forma morta tinha
podem ser portadas **para a forma viva** por ~6 linhas em 2 arquivos: `min`/`max` no `Measure`
(`Pipeline.ts:49-53`) + no `switch` de `computeMeasure` (`AggregatePipelineProcessor.ts:151-169`), e
`contains` no `FilterOp` (`Pipeline.ts:28`) + em `applyFilters` (`:101-128`). **Não fazer agora**: sem
autor de pipeline, seriam três capacidades novas com zero chamadores — repetindo o erro que gerou o ADR.

**Recomendação: (b), condicionada à pergunta de F-AD6.3.** Em uma linha: o critério de reuso responde
*"reuse o vivo, não clone o morto"* — o que **elimina (c) definitivamente** e deixa **(b)** como default;
**(a)** só se o dono disser que existe superfície de execução ad-hoc no roadmap (E22 — hoje ela não existe
em lugar nenhum).

#### F-AD6.3 — Dependência de F-AD5: **existe, e é estreita** (corrigido pela revisão independente)

> **Esta subseção foi reescrita.** A 1ª redação afirmava que F-AD6 **não** depende de F-AD5, apoiada numa
> tabela de três ramos. A revisão adversarial independente furou o argumento em dois pontos e ela estava
> certa nos dois: (i) a enumeração **não era exaustiva** — o próprio parágrafo de viés nomeava um 4º ramo
> que a tabela não tinha; (ii) a linha de escape do ramo (b) supunha que "um preview rodaria pelo
> `aggregatePipeline`", e **E22 mostra que essa superfície não existe**. O registro do erro fica: era
> exaustividade afirmada sem checar, exatamente o defeito que §2.4 corrige na v1.

| Se F-AD5 = | `custom-kpis` seria o ponto de partida? | (b) ainda vale? |
|---|---|---|
| **(a) tela genérica** (`GenericTable`+`Modal` sobre `definitions`) | Não — a tela autora **definição persistida** em `PipelineSpec`; `custom-kpis` é stateless e de gramática mais fraca | **Sim** |
| **(c) sem tela / autoria por onboarding** | Não — não há autor humano em runtime; e §2.4 mostra que esse ramo primeiro precisa de um caminho de escrita de sistema que não existe | **Sim** |
| **(b) builder de pipeline** — *e qualquer coisa que precise de **preview/execução ad-hoc*** | **Talvez.** Um builder precisa executar spec do cliente **sem salvar**, e essa categoria está **vazia** (E22). `custom-kpis` é a única implementação existente dela — com a gramática errada, mas existente | **CONTESTADO — é a pergunta ao dono** |

**A pergunta que decide, e que o par não responde:** *o roadmap prevê alguma superfície de execução
ad-hoc de KPI (preview de builder, painel "monte seu KPI", ferramenta de KPI do agente AI)?*

- **Se NÃO** → **(b) deletar**, e a recomendação é firme: as Etapas 1 e 2 do critério de reuso fecham
  sozinhas ("reuse o vivo, não clone o morto") e a categoria vazia continua vazia porque ninguém a quer.
- **Se SIM** → **(a) manter até F-AD5 fechar** é a escolha honesta, **mas** então `custom-kpis` deixa de
  ser curiosidade e vira dívida ativa: E18 (campo exigido-e-ignorado) e E19 (rota fora do `openapi.json`)
  viram itens de conserto, e a decisão real passa a ser *"a superfície ad-hoc executa `PipelineSpec`
  (reescrever o endpoint, ~1 fatia) ou `KpiDefinition` (manter a 2ª gramática para sempre)?"* — e aí o
  critério de reuso volta a mandar: **executar a forma viva**.

**O que continua NÃO dependendo de F-AD5:** o veredito do `_REUSE-CRITERION.md` de F-AD6.1 — mesmo objeto
de domínio (Etapa 1), com o lado `KpiDefinition` morto e o lado `PipelineSpec`-autorado-no-servidor vivo
(Etapa 2). **Isso mata (c) em qualquer cenário**, porque (c) promove a forma morta a executor canônico.
O fork real que sobrou é **(a) × (b)**, e só ele depende da pergunta acima.

**O que teria falhado se eu estivesse errado (OPS-001 #4):** se `custom-kpis` tivesse **um** chamador
(X1), **um** importador externo (E23), **um** teste (E20), ou constasse do `openapi.json` (E19), a Etapa 2
daria "ambos vivos" e a resposta viraria **(c)**. As quatro checagens foram feitas por mim **e refeitas
por um revisor independente com instrução de me derrubar**; as quatro deram no mesmo sentido. **Calibração
honesta (também da revisão):** eu vendi o probe do `dev.db` (E17) como "a checagem que mais podia me
desmentir" — **é a mais fraca**. Zero linhas num banco de dev é consistente com "ninguém exercitou aqui",
não com "o desenho impede escrita". Quem sustenta essa conclusão é **E16**, que é estática e exaustiva
sobre todo caminho de escrita. E17 corrobora; não falsifica.

**Achado da revisão que vale registrar:** `server/scripts/test-report-2026-06-12.html:587` contém uma
linha `POST /api/analytics/custom-kpis` → `200` → *"sum / avg / count / min / max por tabela"*. É relatório
estático, **não** chamador executável (nenhum script em `server/scripts/` referencia a rota) — a conclusão
"lado morto" sobrevive. Mas é prova de que o endpoint **já foi exercitado e respondeu 200** em 2026-06-12,
o que qualifica "morto por abandono": nasceu funcionando e nunca foi ligado a nada.

**Viés declarado (T8):** deleção é a resposta que agrada review, do mesmo jeito que "congelar" era em
F-AD0 — o mesmo viés estrutural, invertido. Na 1ª redação eu descartei o ramo do preview **por juízo**
("achei fraco"), não por evidência — e foi exatamente aí que a revisão me pegou. A versão honesta é a
tabela acima: o ramo existe, é o único contestado, e quem o resolve é o dono.

**Achados laterais que a investigação levantou** (independentes do veredito, cada um de uma linha):
E18 `tableId` exigido-e-ignorado (morre com (b), vira bug com (a)); E19 rota fora do `openapi.json`
(classe REV-006 — o gate de wiring não pegou); E21 comentário da policy afirmando capacidade inexistente
(§2.4 — corrigir independe de tudo).

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
- **F-AD6=(b) deletar `custom-kpis` — ⏸ RECOMENDADO, NÃO IMPLEMENTADO (aguarda ratificação).** Uma fatia,
  toda deleção, independente de F-AD0 e de F-AD5 (F-AD6.3): remover `src/controllers/customKpiController.ts`,
  `src/features/analytics/engine/CustomKpiExecutor.ts`, `src/features/analytics/schemas/KpiSchema.ts` e as
  duas linhas de `src/routes/analytics.ts` (`:11` import, `:16` rota). Nenhum outro importador existe
  (**E23**). **Gates:** `cd server && npx tsc --noEmit` limpo; `npm run docs:generate` sem path órfão — e note
  que a spec **não** vai mudar, porque a rota nunca esteve lá (E19), o que é em si o sintoma a registrar.
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
5. **(emenda) A v1 deste ADR errou o custo de F-AD5(c)** por confiar num comentário de policy em vez do
   código (§2.4/E21). O viés que isso expõe é meu, não do dono: li `*AsSystem` como família genérica sem
   enumerar os membros. A checagem que corrigiu — `grep "AsSystem"` + leitura dos cinco — é a que deveria
   ter vindo antes da frase, não depois.
6. **(emenda) A emenda de F-AD6 foi revisada por agente independente e 6 pontos caíram** — E14 vendida
   como equivalência (era só o caso não-filtrado), "15+" presets (eram 13), E20 citada para uma conclusão
   sobre importadores (é E23), contagem de linhas de rota (2, não 1), E17 promovida a falsificador (é
   corroborante) e — o mais grave — a tabela de independência de F-AD5, que não era exaustiva e cuja
   linha de escape supunha uma superfície inexistente (E22). Todos corrigidos inline. **O padrão do erro
   é um só: afirmar exaustividade sem enumerar** — o mesmo de §2.4. Se houver terceira ocorrência, isso
   deixa de ser deslize e vira item de `_OPERATING-GATES.md`.
7. **(emenda) E17 é uma medição de UM banco.** O `dev.db` local tem 0 definições; isso é forte porque é o
   único banco populado que existe (o produto nunca foi implantado — memória
   `accounting-gargalo-is-human-validation`). Se algum dia houver banco de produção, a afirmação "o ramo
   persistido está morto" tem de ser re-medida lá antes de qualquer deleção.

## 7. Relacionados

- PR #157 (`6500249`) — DTO Zod na fronteira (AV-L1 F2). Este ADR nasce do N1 da revisão daquele PR.
- PR #155 (**mergeado**, `55838da`) — `docs/audit/AV-L1-TRIAGEM.json` agora em `main`; ver **§2.3**.
- `5621c38` — a correção "o CI JÁ injeta a chave dummy" na própria triagem. É a evidência de §4.2 e o
  precedente do mesmo erro que corrigi ali: afirmar ausência de ambiente sem ler o workflow.
- Memória `isSystem-nao-driba-canManageData` — a armadilha de E4, confirmada.
- `.claude/skills/_REUSE-CRITERION.md` — obrigatório na fatia 4; **respondido em F-AD6.1** (Etapa 1 = mesmo
  objeto; Etapa 2 = um lado morto → "reuse o vivo, não clone o morto").
- PR #158 (`f0bc39a`) — a v1 deste ADR + a barreira de §4.2. PR #159 (`2cdda74`) — o registro do N1 na
  triagem AV-L1. **Ambos mergeados** em 2026-08-01; esta emenda parte de `origin/main`.
