# BE-INCR-CRM-REPORT-BUILDER — BRIEF (sessão de planejamento)

> **Estado:** BRIEF — **7/7 forks RATIFICADOS 2026-09-26 (dono, AskUserQuestion)**; F-RB4 diverge da recomendação. **Emenda 2026-09-29 (§8):** fork novo **F-RB8 moeda DECIDIDO** pelo dono (soma por moeda + visão convertida à parte pela PTAX do BCB); sub-forks **fechados** na 2ª rodada (F-RB8a ratificado; 8f resolvido pela 8a; 8b–8e fechados por regra sem veto — §4.1); nomes de campo corrigidos. Sem código; execução exige "executa". Nó do vault: [`docs/plano/nos/CRM-RB.md`](../plano/nos/CRM-RB.md).
> **Risco principal (2 linhas):** este nó entrega só o câmbio **simulado** (PTAX do momento da consulta). O **realizado** e o
> monitor de câmbio dependem de um ADR de moeda no Contas a Receber que reabre a R-multimoeda e ainda não existe (F-RB8a, §4.1).
> Resta pendente só o valor de pipeline (§4.2, não bloqueia); antes do "executa" falta o PRE-ADR do nó (decidido em 26/09).
> Histórico (26/09): o builder é a resposta ao `F-AD5` do [`ADR-ANALYTICS-DEFS`](../adr/ADR-ANALYTICS-DEFS-write-unblock.md);
> F-RB1=(a) contorna o `F-AD0=(c)` (Prisma), F-AD0 segue congelado.

## 0. Formulário

- **Item a planejar:** gap **#14** "Relatórios & Dashboards customizáveis pelo usuário (builder)" —
  `docs/crm/CRM_REMEDIATION_AND_ROADMAP.md:157` (Parte B; doc supersedido → SDD §IV.3, citado só como origem).
  Congelado pelo **D4** (`COUNCIL-BOARD-CRM-2026-07-20-v3-resolution.md:17`), **descongelado pelo dono 25/09** (só o #14).
- **Autorização (literal, chat do dono, 2026-09-26):** "autorizo planejar o builder de relatórios do CRM".
  **Cobertura:** cobre exatamente planejar o #14. **Não** cobre: código, ratificar fork, reabrir o ADR-ANALYTICS-DEFS
  (o BRIEF só aponta que F-RB1 o reabre), nem o `custom-kpis` órfão além de registrar a relação (F-RB6).
  Divergência de protocolo registrada: `docs/plano/README.md` pede PRE-ADR ratificado antes de nó novo em `nos/`;
  o nó foi criado por instrução explícita do orquestrador com autorização citável, estado `planned` (não `ready`).
- **Autorização da emenda de 29/09 (literal):** decisão **14** de `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md`
  (PR #440; dono, questionário de 29/09): *"Soma por moeda e conversão a parte com cambio"* + *"PTAX do BCB, taxa do dia"*;
  texto da decisão: "Emenda do BRIEF, mais corrigir os nomes de campo (`leads.value` → `latestProposalAmount`, etc.) antes do
  'executa'". Evidência: `docs/accounting/DOSSIE-DECISOES-2026-09-29.md` §7 (D-11). **Cobertura:** F-RB8 + nomes de campo +
  registro da decisão ortogonal do valor de pipeline (pedido do dono no chat de 29/09). **Não** cobre: código, ratificar os
  sub-forks F-RB8a..f (fechados depois, na 2ª rodada — §4.1), editar o GAP-MAP (feito só depois do OK do dono na 2ª
  rodada — §7). **Esta sessão só documenta** (dono, 29/09: *"Aqui vamos apenas documentar, quem vai autorizar oque, é em
  outra sessão"*): nenhuma linha deste BRIEF autoriza trabalho; autorização é dada em outra sessão.
- **Insumos (lidos no arquivo — grau verificado salvo nota):**
  - `server/src/features/analytics/core/pipeline/Pipeline.ts` — `PipelineSpec` {source: presetTable|tableId, joins, filters(eq/ne/in/nin/gt/gte/lt/lte), dimensions(field|period), measures(sum/count/avg/formula) 1..n, sort, limit}.
  - `server/src/features/analytics/dynamic/processors/AggregatePipelineProcessor.ts` — executa o spec via `fetchByPresetTableKey`/`fetchByTableId`.
  - `server/src/features/analytics/services/AnalyticsService.ts:86-139` — lê definições da tabela CORE `analyticsDefinitions`; pipeline inválido é **descartado em silêncio** (E8 do ADR).
  - `server/src/features/analytics/dtos/AnalyticsDefinitionDto.ts` — `pipeline` é só `JsonBlock` na fronteira (E7 do ADR).
  - `server/src/features/dynamicTables/policies/DynamicTablePolicy.ts` `canManageData` — `presentation:'system'` ⇒ 403 para todos; travado por `DynamicTableService.systemTableWriteLock.test.ts`.
  - `docs/adr/ADR-ANALYTICS-DEFS-write-unblock.md` — F-AD0=(c) congelar (ratificado 01/08); F-AD5 (a tela) **ABERTO**; F-AD6=(a) manter `custom-kpis` até F-AD5 fechar.
  - `server/src/features/analytics/schemas/KpiSchema.ts` + `POST /api/analytics/custom-kpis` — KPI escalar stateless, zero consumidor FE (E12).
  - `server/src/features/crm/services/CrmAnalyticsService.ts` — bundle **fixo** (funil/fonte/status/BANT/propostas/atividades) sobre `leads`; reusa processors `analytics/kpis/crm`.
  - Precedentes Prisma de config por usuário sobre tabela dinâmica: `SavedTableView` (`schema.prisma:69`, `tableId` sem FK, `config Json`, soft-delete) e `DashboardLayout` (`schema.prisma:104`, grid `positions[].widgetConfig`).
  - **Emenda 29/09 (lidos em `origin/main` `9dd690b3`):** campos monetários e de moeda dos presets —
    `LeadsModule.ts:82-97` (`latestProposalAmount` currency + `latestProposalCurrency` select BRL/USD/EUR, **opcional, sem default**),
    `LeadProposalsModule.ts:23-30` (`amount` + `currency` **obrigatória**), `OpportunitiesModule.ts:77-94` (`amount` + `currency`
    opcional, **default BRL**); `closedAt` só em `crmOpportunities` (`OpportunitiesModule.ts:113`); nomes internos das tabelas em
    `presets/modules/registry.ts:66-115,173-178`; `CURRENCIES = ['BRL','USD','EUR']` em `server/src/features/crm/constants.ts:1`;
    `AggregatePipelineProcessor.ts:133-148` (valor nulo de dimensão vira chave `''`) e `:153` (`sum` = `Number` puro);
    precedente de tabela global de fonte oficial `ReferentialAccount` (`schema.prisma:516`); scheduler `DfePollScheduler`
    (`server/src/jobs/DfePollScheduler.ts:1-9`, ligado em `server.ts:50`); `fetch` nativo com `AbortController` (`app.ts:92`).
    API PTAX do BCB **consultada ao vivo em 29/09** (§8).
- **Nós vizinhos:** consome o motor `analytics` (PipelineSpec) e as tabelas CRM (`leads`, `crmOpportunities`, `leadActivities`, `leadProposals`, `crmAccounts`, `crmContacts`); [[I8]] condiciona quais estão instaladas. FE canônico: `AnalyticsDashboard`/`ChartRenderer`/`DashboardKpiCard` (golden ref do roadmap §Fase 4). Consumidor: tela do CRM (`FE-INCR-CRM-REPORT-BUILDER`, nó vizinho — **fora** deste BRIEF, regra BE-por-padrão).

## 1. Registro de Fronteira (module-boundary-selector)

```
## Registro de Fronteira — ReportDefinition (definição salva de relatório/dashboard do CRM)
- Camada: Prisma first-class — F-RB1=(a) RATIFICADO 2026-09-26         [decisão do dono sobre evidência inferida]
    SEL-001 4 perguntas: todas caem no lado DynamicTable (errado-e-corrigido é aceitável; nenhum número é fonte
    de verdade — o relatório LÊ, não é razão; unicidade só de UX; sem write-path fora do motor). Tripwires: nenhum
    (sem dinheiro autoritativo, sem self-relation, sem atomicidade cross-tabela). => o seletor PERMITE DT, não obriga.
    O que decide é outra coisa: a definição é METADADO DE PLATAFORMA sobre tabelas (aponta tableId/campos), não
    registro de negócio que o usuário modela. Precedentes verificados do mesmo shape moram em Prisma
    (SavedTableView, DashboardLayout); o único precedente DT (analyticsDefinitions) é tabela 'system' congelada por
    ADR. Colocar em DT exige ou reverter F-AD0 ou criar tabela DT não-system que o usuário também veria/editaria
    como JSON cru no dashboard (efeito colateral E11 do ADR).
- Tipo (se DT): n/a sob a recomendação; sob F-RB1(b) seria canônico selecionável (critério c: tela canônica o descobre).
- Contratos implícitos de nome (SEL-003, grau inferido — grep, não prova): a definição salva referencia
    tableId + nomes de campo das tabelas CRM (leads.status/source/stageId/latestProposalAmount/latestProposalCurrency…,
    crmOpportunities.amount/currency/status/closedAt, leadProposals.amount/currency — nomes corrigidos 29/09).
    Renomear/remover campo desses presets ou customização do usuário quebra a definição → hoje o motor pula em
    silêncio (E8). Checklist item 6 transforma isso em erro nomeado.
- Alfândega: n/a — o builder é somente leitura sobre dados operacionais; nenhum evento, bridge ou lançamento.
    Justificativa: nenhum write-path em dado de negócio. Valores monetários exibidos são float JSON do motor
    (currency), operacionais, NÃO verdade contábil — rotular na UI (fora deste BRIEF). Desde 29/09 (F-RB8): somados
    SEMPRE por moeda; a visão convertida é à parte e rotulada (§1.1, checklist 17-26).
- Riscos anotados: (1) F-AD0 ratificado 'congelar'; (2) custom-kpis órfão (F-AD6) sobrevive até F-AD5 fechar —
    este nó fecha F-AD5, então F-AD6 volta à mesa (F-RB6); (3) processamento em memória (getAllTableData) — custo
    cresce com linhas; limite por F-RB5.
- Roteamento (se F-RB1=a): backend-prisma-model-generator → backend-repository-generator → backend-policy-generator
    → backend-service-generator → backend-dto-generator → backend-controller-generator → backend-route-generator
    → backend-test-suite-generator (+ api-contract-sync-generator p/ openapi).
- Forks do dono: F-RB1..F-RB7 — todos RATIFICADOS 2026-09-26 (§4).
```

### 1.1 Registro de Fronteira — tabela de taxas (emenda 29/09, F-RB8)

```
## Registro de Fronteira — PtaxRate (PTAX de fechamento do BCB: 1 linha por moeda por dia útil)
- Camada: Prisma first-class — decidido por REGRA (Contrato §2.1, teste de decisão), não por fork:   [verificado no contrato]
    Q1 o usuário cria/configura o esquema em runtime? NÃO.
    Q2 invariante financeiro/legal que o banco deve garantir? NÃO (a conversão é exibição).
    Q3 a integridade depende de @@unique/tipos reais? SIM — idempotência do job = @@unique([currency, rateDate]);
       `unique` de preset NÃO é constraint (AC-2.1-B5, AC-2.2-2), e duas execuções do job gravariam a mesma cotação.
    Q4 é dado de infraestrutura do negócio, não configurável pelo usuário? SIM — cotação oficial copiada de fonte pública.
    => Prisma. DynamicTable reprova também no efeito: a taxa oficial viraria linha editável pelo usuário na tela do motor.
- Tenancy: GLOBAL, sem userId — a PTAX é um fato público igual para todo tenant. Precedente do mesmo shape:
    `ReferentialAccount` (schema.prisma:516 — plano referencial da RFB, global, @@unique de importação, sem soft-delete).
- Soft-delete: não se aplica — append-only, sem rota de escrita nem de delete (mesmo precedente).
- Integração: lida pelo CrmReportService (serviço de aplicação); nada entra no motor DT (AC-2.1-B1/B4 intactos).
- Módulo: NEUTRO, server/src/features/fx/ (não features/crm) — o ADR de moeda e o monitor de câmbio vão reusar
    tabela, client e job (decisão D-2026-09-29-CRM-RB-MOEDA-REALIZADO).
- Alfândega: nenhuma — não gera lançamento, evento nem título. NÃO é o slot `exchangeRate` do AccountingScope
    (R-multimoeda, rejeitada). F-RB8f resolvido 29/09 pela 8a: aqui é só exibição; a parte contábil vai
    para o ADR de moeda no Contas a Receber, que deve reusar esta tabela.
- Roteamento: backend-prisma-model-generator → backend-repository-generator → job-generator (scheduler)
    → backend-test-suite-generator. Sem controller/rota (a taxa viaja dentro do `run`, checklist 24).
```

## 2. Checklist numerado (cada item testável isolado) — escopo BE

Forks resolvidos: F-RB1=(a), F-RB2=(a), F-RB3=(b), F-RB4=(c), F-RB5=(a), F-RB6=(a), F-RB7=(a), **F-RB8 (decidido 29/09)**.
Sub-forks (29/09, 2ª rodada — §4.1): **F-RB8a ratificado** (simulado aqui; realizado + monitor → ADR de moeda), **F-RB8f
resolvido** pela 8a, **F-RB8b–8e fechados por regra** (um só caminho razoável; dono avisado, sem veto). Os itens 17-26 já refletem isso.

1. **Modelo `CrmReportDefinition`** (F-RB1=(a)): `id cuid`, `userId` (FK User, cascade como `SavedTableView`), `name`,
   `description?`, `kind` (`chart|table|kpi`), `spec Json` (validado por §3 `ReportSpecSchema`), `chartType`,
   `createdAt/updatedAt/deletedAt` (soft-delete). `@@index([userId])`. Teste: migração aplica em SQLite e é idempotente no prólogo (memória `migracao-sqlite-nao-e-transacional`).
2. **Repository** `ICrmReportDefinitionRepository` + impl — `findManyByUser`, `findById`, `create`, `update`, `softDelete`; aceita `tx` opcional. Teste: listagem exclui `deletedAt != null`.
3. **Policy** `CrmReportDefinitionPolicy` (F-RB4=(c) + complemento **ratificado pelo dono 2026-09-26, AskUserQuestion:
   ADMIN com controle total**): **ler/rodar/editar/apagar** = dono **ou** `ADMIN` (qualquer relatório). Não-dono
   não-ADMIN → 404 (anti-enumeração; confirmar contra `SavedTableViewPolicy` na execução). Edição pelo ADMIN não
   transfere posse: `userId` do relatório é imutável no update.
   **Run de relatório alheio pelo ADMIN resolve a fonte contra as tabelas do DONO do relatório (`report.userId`),
   não do ADMIN** — senão o ADMIN vê os próprios dados com o rótulo de outro. Testes: dono lista só os seus;
   ADMIN lista todos; ADMIN PUT/DELETE em alheio → 200 e `userId` inalterado; outro usuário comum → 404; run pelo ADMIN lê linhas do dono.
   **D4 não reaberto (verificado contra `COUNCIL-BOARD-CRM-2026-07-20-v3-resolution.md` e o descongelamento de
   25/09):** o que o D4 congela é *team selling* — equipe, hierarquia, compartilhamento entre vendedores.
   F-RB4=(c) usa só o papel global `ADMIN` que já existe (mesmo eixo do `canView` do motor, `DynamicTablePolicy`),
   sem modelo de equipe, sem compartilhamento par-a-par. Se a execução precisar de "equipe", PARE: é D4.
4. **DTO Zod `.strict()`** (§3) — `CreateCrmReportSchema`, `UpdateCrmReportSchema` (partial + refine não-vazio, cuidado Zod 4 `.partial()` × `.default()`: nenhum `.default()` no create — memória `zod4-partial-aplica-default-reseta-campo`), `RunCrmReportSchema`. Teste de snapshot de shape + testes de refine (source whitelist, measures ≥1, campo inexistente).
5. **Whitelist de fonte**: `source` só pode ser tabela CRM do próprio usuário (F-RB3 define o conjunto). Resolução por `internalName` (padrão `CrmAnalyticsService.resolveTable`), nunca `tableId` arbitrário vindo do cliente sem checagem de posse. Teste: `tableId` de outro usuário → 404.
6. **Validação de campos contra o schema vivo da tabela** no save **e** no run: campo inexistente → `400 REPORT_FIELD_NOT_FOUND` com o nome do campo (fecha a classe E8 "descarta em silêncio" para este caminho). Teste: salvar ok → renomear campo no schema → run devolve erro nomeado, não série vazia.
7. **Service `CrmReportService.run(user, id | spec)`** — traduz `ReportSpec` → `PipelineSpec` e executa via `AggregatePipelineProcessor` (reuso; nada de agregador novo). Saída = `RunCrmReportOutput` (§3): `points: ChartDataPoint[]` (mesmo contrato do `CrmAnalyticsBundle`, consumível por `ChartRenderer`) — a verdade, por moeda (F-RB8) — e, só com `convertTo`, o bloco `converted` à parte (item 24). Teste: fixture com 3 leads em 2 status → contagem por status bate.
8. **Preview sem salvar** (`POST /api/crm/reports/run` com spec inline) — mesmo caminho do item 7. Teste: spec inválido → 400 na fronteira.
9. **Limites** (F-RB5=(a), teto conservador): `limit` de pontos na saída e teto de linhas lidas; acima → `422 REPORT_TOO_LARGE`, nunca truncamento silencioso. Teste nos dois lados do teto.
10. **Rotas** `GET/POST /api/crm/reports`, `GET/PUT/DELETE /api/crm/reports/:id`, `POST /api/crm/reports/run`, `POST /api/crm/reports/:id/run` — registro em 2 toques (`routes/crm*` + `docs.paths.ts`), auth deny-by-default. Gate: guard de path-count do openapi atualizado + `public/openapi.json` regenerado. O F-RB8 **não** cria rota (a taxa viaja dentro do `run`).
11. **Factory** — `getCrmReportService()` no `lib/factory`; emenda 29/09: `getPtaxRateRepository()` e `getPtaxClient()` também. Sem `new` de repo dentro de service.
12. **Dashboard** (F-RB2=(a)): widget `crmReport` no `DashboardLayout` existente, `widgetConfig: { reportId }`. Validação do `reportId` no service (o DTO do layout tem `widgetConfig: z.any()`). Teste: widget com `reportId` apagado → erro nomeado; `reportId` alheio → 404 (ADMIN: visível, F-RB4).
13. **Templates iniciais** (F-RB7=(a)): os 6 gráficos fixos do `CrmAnalyticsBundle` expressos como `ReportSpec` para o usuário clonar. Teste: cada template roda e bate com o bundle fixo na mesma fixture (paridade). O F-RB8 não mexe na paridade: nenhum dos 6 gráficos soma dinheiro (verificado 29/09 — `CrmRelatedProcessors.ts`/`CrmSegmentationProcessors.ts` não leem `amount`/`currency`; só os cards do `CrmConversionProcessor` somam, e cards não são template).
14. **i18n pt/en** das mensagens de erro novas (`REPORT_FIELD_NOT_FOUND`, `REPORT_TOO_LARGE`, `REPORT_SOURCE_NOT_ALLOWED`; emenda 29/09: `REPORT_CURRENCY_MIXED`, `REPORT_CONVERSION_NOT_APPLICABLE` e os rótulos `NO_CURRENCY`/`UNDECLARED_CURRENCY`) — gate de paridade.
15. **Audit**: sem `eventType` novo previsto (não é dado financeiro; F-RB4=(c) é leitura do ADMIN, sem compartilhamento). O job da PTAX (item 23) também não: não é ação de usuário nem dado autoritativo — só log.
16. **Remover `POST /api/analytics/custom-kpis`** (F-RB6=(a), emenda do ADR-ANALYTICS-DEFS 26/09): rota, controller,
    `CustomKpiExecutor`, `KpiSchema` se sem outro consumidor (grep na execução), entrada no `docs.paths.ts` e
    guard de path-count do openapi. Teste: rota responde 404; `tsc` limpo. PR próprio, antes ou depois do builder.

**Emenda 29/09 — moeda (F-RB8).** A verdade é a soma **por moeda**; a visão convertida é **à parte** e rotulada.

17. **Regra da verdade por moeda** (F-RB8, decidido): no save **e** no run, medida `sum` ou `avg` sobre campo monetário
    (`numberFormat:'currency'` no schema vivo) que tenha par de moeda (`CRM_MONEY_CURRENCY_PAIRS`, §3, com o campo-par
    presente no schema vivo) exige **(i)** dimensão `field` no campo-par **da mesma fonte**, ou **(ii)** filtro `eq`, ou `in`
    com um único valor, no campo-par. Sem isso → `400 REPORT_CURRENCY_MIXED {field, currencyField}`. `count` não é afetada.
    `avg` entra pelo mesmo princípio (média de USD com BRL é a mesma mistura) — **extensão inferida do objetivo** da decisão,
    que cita só `sum`; se o dono discordar, sai uma linha. Testes: `sum` sem moeda → 400; com dimensão de moeda → 200 e um
    ponto por moeda; filtro `eq USD` → 200; `ne`, `nin` ou `in` com 2 valores → 400; medida sobre fonte de join exige o par
    do join, não o da fonte principal.
18. **Moeda nula na linha** (F-RB8c, fechado por regra 29/09): o grupo de moeda vazia — que hoje vira a chave `''`
    (`AggregatePipelineProcessor.ts:143`) — sai com chave estável `__NO_CURRENCY__` e rótulo i18n, nunca como string vazia,
    e fica fora da visão convertida. Caso real: `leads.latestProposalCurrency` é opcional e sem default. Teste: 2 leads USD +
    1 lead com valor e sem moeda → 2 pontos, um deles "sem moeda".
19. **Campo monetário sem par** (F-RB8d, fechado por regra 29/09): campo `numberFormat:'currency'` fora de
    `CRM_MONEY_CURRENCY_PAIRS` (customização do usuário) ou cujo par sumiu do schema vivo → `sum`/`avg` permitidos, saída
    marcada `meta.currency = { mode: 'undeclared' }` e fora da visão convertida (`excluded[].reason = 'UNDECLARED_CURRENCY'`).
    Teste: campo custom de dinheiro soma sem 400 e sem `converted.points`.
20. **Modelo `PtaxRate`** (§1.1; Prisma first-class, global): migração idempotente no prólogo (memória
    `migracao-sqlite-nao-e-transacional`); append-only, sem soft-delete, sem rota. Cotação guardada como inteiro × 10⁵ (a API
    devolve 5 casas, §8) — mesmo idioma do `annualRateBp` do `DepreciationRate` (inteiro escalado, sem `Decimal`).
    Teste: a segunda gravação da mesma `(currency, rateDate)` não duplica.
21. **Repository `IPtaxRateRepository`** + impl: `upsertClosing(quote)` idempotente pelo `@@unique` (o `createMany` com
    `skipDuplicates` provavelmente não existe no SQLite — **não verificado**, conferir na execução; upsert por linha resolve),
    `findLatestOnOrBefore(currency, date)`, `findLatestDate(currency)`. Teste: consulta com data de sábado devolve a de sexta.
22. **Client `BcbPtaxClient implements IPtaxClient`**: `fetch` nativo + `AbortController` com timeout (precedente `app.ts:92`);
    endpoint `CotacaoMoedaPeriodo` (§8); aceita **só** o boletim de fechamento — o rótulo é `'Fechamento'` nesse endpoint e
    `'Fechamento PTAX'` no `CotacaoMoedaDia` (verificado 29/09; aceitar os dois e rejeitar `Abertura`/`Intermediário`); datas
    `MM-DD-YYYY` na URL; `dataHoraCotacao` vem **sem fuso** e é hora de Brasília; cotação × 10⁵ com `Math.round`. Testes com
    fixtures gravadas dos payloads de 29/09 (dia útil com 5 boletins; sábado com `value: []`; dia corrente antes das 13h com 3
    boletins e sem fechamento) — **sem rede no CI**.
23. **Job `PtaxRateScheduler`** (clone mínimo de `DfePollScheduler`, com a mesma ressalva de lock local e sem timer em teste;
    `server.ts` liga como a linha 50): **uma cotação por moeda por dia útil**. Cada execução pede ao BCB o intervalo
    [último `rateDate` guardado + 1 dia (ou hoje − 10 dias na primeira vez) .. hoje em Brasília] e grava os fechamentos que
    vierem — lacuna de servidor parado se fecha sozinha. O tick só chama o BCB se houver lacuna e, para o dia corrente, depois
    do horário de publicação (fechamento às ~13h03–13h10 de Brasília nas amostras de 24–28/09, §8). Moedas = `CURRENCIES` − BRL
    (`crm/constants.ts:1`). Falha do BCB → `warn` e nova tentativa no tick seguinte; nunca derruba o boot. Testes: lacuna de 3
    dias fechada numa chamada; sem lacuna → zero chamadas ao client; client lança → job não lança.
24. **Visão convertida à parte** (F-RB8, decidido): `spec.convertTo: 'BRL'` opcional. Com ele, o `run` devolve `converted`
    **ao lado** de `points`, nunca no lugar. Regras: cada grupo de moeda × PTAX de **venda** (F-RB8e) da data
    de referência (F-RB8a ratificado: o momento da consulta, em Brasília — é o câmbio **simulado**; o realizado é do ADR de moeda); sem PTAX nessa data, usa a última ≤ data
    (F-RB8b), com `rateDate` e
    `stale = (referência − rateDate) > 5 dias corridos` por moeda; BRL passa com taxa 1; a dimensão de moeda colapsa com
    `addMoney` (`analytics/utils/CurrencyUtils.ts:6`); `avg` convertida = Σ(soma_c × taxa_c) ÷ Σ n_c, com uma medida `count`
    interna que não conta no teto de 4 do F-RB5; grupos sem moeda, sem par ou sem taxa vão para `excluded[]` com o número de
    linhas — nunca somem em silêncio. `convertTo` num relatório sem medida monetária com par → `400
    REPORT_CONVERSION_NOT_APPLICABLE` (parâmetro aceito e ignorado é bug silencioso — memória `param-aceito-e-ignorado-e-bug`).
    Testes: 100 USD + 50 BRL com PTAX venda 5,21320 → `converted` 571,32 e `points` intactos (2 pontos); `avg` com USD {100, 300}
    e BRL {50} → 711,76; consulta no sábado → `rateDate` = sexta, `stale: false`; tabela vazia → `excluded RATE_UNAVAILABLE`;
    taxa de 6 dias → `stale: true`.
25. **Snapshot de shape**: `ReportSpecSchema` com `convertTo` e o `RunCrmReportOutput` (com `meta.currency` e `converted`)
    entram no snapshot de DTO; i18n no item 14.
26. **Fronteira com a contabilidade** (F-RB8f, resolvido pela 8a): tabela, repositório, client e job moram em
    `server/src/features/fx/` (módulo neutro), porque o ADR de moeda e o monitor de câmbio vão reusá-los. Até esse ADR ser
    ratificado, nada em `server/src/features/accounting/**` importa `features/fx` — conferido por grep no review.

## 3. Contratos (esboço — materializar na sessão de feature)

```ts
import { z } from 'zod';

// Fonte: nome interno de tabela CRM (whitelist por F-RB3), resolvido server-side para tableId do próprio usuário.
// Nomes corrigidos 29/09 contra presets/modules/registry.ts:173-178 (eram 'proposals'/'accounts'/'contacts', inexistentes).
export const CRM_REPORT_SOURCES = ['leads', 'crmOpportunities', 'leadActivities', 'leadProposals', 'crmAccounts', 'crmContacts'] as const; // F-RB3
export type CrmReportSource = (typeof CRM_REPORT_SOURCES)[number];

// F-RB8 (29/09): par valor→moeda dos campos monetários de preset. Campo monetário = numberFormat 'currency' no schema vivo.
export const CRM_MONEY_CURRENCY_PAIRS = {
  leads: { latestProposalAmount: 'latestProposalCurrency' }, // LeadsModule.ts:82-97 — moeda opcional, sem default
  leadProposals: { amount: 'currency' },                     // LeadProposalsModule.ts:23-30 — moeda obrigatória
  crmOpportunities: { amount: 'currency' },                  // OpportunitiesModule.ts:77-94 — moeda opcional, default BRL
} as const satisfies Partial<Record<CrmReportSource, Record<string, string>>>;

const FieldRef = z.string().trim().min(1).max(64);

export const ReportFilterSchema = z.object({
  field: FieldRef,
  op: z.enum(['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte']), // = FilterOp do PipelineSpec
  value: z.unknown(),
}).strict();

export const ReportDimensionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('field'), field: FieldRef, label: z.string().max(80).optional() }).strict(),
  z.object({
    type: z.literal('period'),
    dateField: FieldRef, // inclui os sintéticos _createdAt/_updatedAt (padrão CrmAnalyticsService.loadRows)
    period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
    label: z.string().max(80).optional(),
  }).strict(),
]);

export const ReportMeasureSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('count'), field: FieldRef.optional(), alias: z.string().max(40).optional() }).strict(),
  z.object({ type: z.literal('sum'), field: FieldRef, alias: z.string().max(40).optional() }).strict(),
  z.object({ type: z.literal('avg'), field: FieldRef, alias: z.string().max(40).optional() }).strict(),
  // 'formula' do PipelineSpec FORA do v1 — F-RB5
]);

export const ReportSpecSchema = z.object({
  source: z.enum(CRM_REPORT_SOURCES),
  joins: z.array(z.object({
    leftField: FieldRef,
    rightSource: z.enum(CRM_REPORT_SOURCES),
    rightField: FieldRef,
    alias: z.string().max(40).optional(),
  }).strict()).max(2).optional(),            // F-RB5
  filters: z.array(ReportFilterSchema).max(10).optional(),
  dimensions: z.array(ReportDimensionSchema).max(2).optional(),
  measures: z.array(ReportMeasureSchema).min(1).max(4),
  sort: z.object({ by: z.enum(['dimension', 'measure']), key: z.string().optional(), dir: z.enum(['asc', 'desc']).optional() }).strict().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  convertTo: z.literal('BRL').optional(), // F-RB8: pede a visão convertida À PARTE; sem .default() (Zod 4 × partial)
}).strict();
// Regra de moeda (checklist 17) NÃO cabe no Zod: depende do schema vivo (numberFormat + campo-par) → validada no service.

export const CreateCrmReportSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).optional(),
  kind: z.enum(['chart', 'table', 'kpi']),
  chartType: z.enum(['bar', 'line', 'area', 'pie', 'donut', 'table']), // = CHART_TYPES do AnalyticsDefinitionDto
  spec: ReportSpecSchema,
}).strict();

export const UpdateCrmReportSchema = CreateCrmReportSchema.partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'At least one field must be provided.' });

export const RunCrmReportSchema = z.object({ spec: ReportSpecSchema }).strict(); // preview

// Saída — points reusa ChartDataPoint; emenda 29/09 acrescenta meta.currency e o bloco converted (F-RB8)
type CurrencyMode =
  | null                                                          // relatório sem medida monetária
  | { mode: 'dimension'; field: string }                          // um ponto por moeda (a moeda é parte da chave)
  | { mode: 'filter'; field: string; value: 'BRL' | 'USD' | 'EUR' }
  | { mode: 'undeclared' };                                       // F-RB8d: campo monetário sem par
type PtaxRateView = {
  currency: 'USD' | 'EUR';
  side: 'venda';                                                  // F-RB8e
  rate: number;                                                   // sellRateE5 / 1e5
  rateDate: string;                                               // YYYY-MM-DD — SEMPRE exibida (decisão do dono)
  stale: boolean;                                                 // F-RB8b: referência − rateDate > 5 dias corridos
  source: 'BCB_PTAX_FECHAMENTO';
};
type ConvertedView = {
  target: 'BRL';
  referenceDate: string;                                          // F-RB8a: dia da consulta (Brasília)
  rates: PtaxRateView[];
  points: ChartDataPoint[];                                       // dimensão de moeda colapsada
  excluded: Array<{ reason: 'NO_CURRENCY' | 'UNDECLARED_CURRENCY' | 'RATE_UNAVAILABLE'; currency?: string; rows: number }>;
};
// type RunCrmReportOutput = {
//   points: ChartDataPoint[];                                    // VERDADE — nunca mistura moedas
//   meta: { rowsRead: number; truncated: false; currency: CurrencyMode };
//   converted?: ConvertedView;                                   // só com spec.convertTo; nunca substitui points
// };
// Erros nomeados: 400 REPORT_FIELD_NOT_FOUND {field} · 400 REPORT_SOURCE_NOT_ALLOWED · 404 (não é seu / não existe) · 422 REPORT_TOO_LARGE {rowsRead, cap}
//   + 29/09: 400 REPORT_CURRENCY_MIXED {field, currencyField} · 400 REPORT_CONVERSION_NOT_APPLICABLE

// Porta do BCB (F-RB8) — o teste usa fake com os payloads gravados de 29/09; o CI não acessa a rede
export interface PtaxClosingQuote { currency: 'USD' | 'EUR'; rateDate: string; buyRateE5: number; sellRateE5: number; quotedAt: Date }
export interface IPtaxClient {
  /** CotacaoMoedaPeriodo filtrado no fechamento; dia sem boletim (fim de semana, feriado) simplesmente não vem. */
  fetchClosing(currency: 'USD' | 'EUR', fromDate: string, toDate: string): Promise<PtaxClosingQuote[]>;
}
```

Prisma (esboço, F-RB1=a):

```prisma
model CrmReportDefinition {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String?
  kind        String    // chart | table | kpi (validado no DTO)
  chartType   String
  spec        Json      // ReportSpecSchema
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@index([userId])
  @@map("crm_report_definitions")
}

// F-RB8 (emenda 29/09) — global, append-only (precedente ReferentialAccount, schema.prisma:516)
model PtaxRate {
  id         String   @id @default(cuid())
  currency   String   // ISO 4217: 'USD' | 'EUR' (CURRENCIES − BRL, crm/constants.ts:1)
  rateDate   DateTime // date-only — dia do boletim de fechamento (Brasília); validado por isValidDateOnly
  buyRateE5  Int      // cotacaoCompra × 1e5 (a API devolve 5 casas — §8)
  sellRateE5 Int      // cotacaoVenda × 1e5 — a usada na conversão (F-RB8e)
  quotedAt   DateTime // dataHoraCotacao do BCB (vem sem fuso; é hora de Brasília, UTC−3)
  source     String   // 'BCB_PTAX_FECHAMENTO'
  fetchedAt  DateTime @default(now())

  @@unique([currency, rateDate]) // idempotência do job + busca "última ≤ data"
  @@map("ptax_rates")
}
```

## 4. Forks — ✅ 7/7 RATIFICADOS 2026-09-26 (dono, AskUserQuestion)

| Fork | Pergunta | Opções | Recomendação | Decisão |
|---|---|---|---|---|
| **F-RB1** | Onde a definição salva mora? | **(a)** Prisma first-class `CrmReportDefinition` (padrão `SavedTableView`); **(b)** destravar a tabela DT `analyticsDefinitions` (reverte F-AD0=(c) — policy+preset+4 docs, ADR §2); **(c)** tabela DT **não-system** nova de preset CRM | **(a)** — metadado de plataforma, precedente vivo do mesmo shape em Prisma, não toca o F-AD0 ratificado. Custo: F-AD0/`analyticsDefinitions` continua existindo em paralelo (duas casas de "definição") → F-RB6. | ✅ (a) RATIFICADO 2026-09-26 |
| **F-RB2** | O "dashboard" do builder é o quê? | **(a)** widget novo no `DashboardLayout` existente (`widgetConfig.reportId`); **(b)** entidade `CrmDashboard` própria no CRM (lista ordenada de reportIds); **(c)** v1 só relatórios, dashboard depois | **(a)** — reuso do grid canônico; evita segunda casa de layout. Risco: `widgetConfig: z.any()` no DTO do layout (validação fraca herdada). | ✅ (a) RATIFICADO 2026-09-26 |
| **F-RB3** | Quais fontes o builder enxerga? | **(a)** só `leads` + `crmOpportunities`; **(b)** todas as tabelas CRM instaladas (whitelist por internalName); **(c)** qualquer tabela do usuário (vira builder genérico, não do CRM) | **(b)** — cobre o gap #14 sem virar builder de plataforma (c = frente nova, exige nova autorização). | ✅ (b) RATIFICADO 2026-09-26 |
| **F-RB4** | Visibilidade | **(a)** só o dono; **(b)** dono + "compartilhar com o tenant/equipe"; **(c)** ADMIN vê todos | **(a)** no v1 — compartilhamento depende de modelo de equipe que o D4 manteve congelado (team selling). | ✅ **(c)** RATIFICADO 2026-09-26 — **diverge** da recomendação; complemento 2026-09-26 (AskUserQuestion): ADMIN também edita e apaga (controle total); checklist 3 ajustado; D4 não reaberto |
| **F-RB5** | Expressividade/limites do v1 | **(a)** sem `formula`, ≤2 joins, ≤2 dimensões, ≤4 medidas, teto de linhas lidas com 422; **(b)** paridade total com `PipelineSpec` (inclui `formula` via ExpressionEvaluator); **(c)** sem joins | **(a)** — menor superfície; `formula` executa expressão do usuário e merece revisão própria. Teto numérico = a medir na execução (Insumo ausente §6). | ✅ (a) RATIFICADO 2026-09-26 |
| **F-RB6** | Destino dos irmãos `analyticsDefinitions` (congelado) e `custom-kpis` (órfão, F-AD6 "manter até F-AD5 fechar") | **(a)** este nó fecha F-AD5 ⇒ reabrir ADR-ANALYTICS-DEFS com emenda: F-AD5→(b) builder dedicado (no CRM), F-AD6→ deletar `custom-kpis`; **(b)** manter ambos intocados e só registrar; **(c)** convergir `custom-kpis` no `ReportSpec` (medida escalar = `kind:'kpi'`) | **(a)** — o gatilho do F-AD6 é literalmente F-AD5 fechar; deixar dois caminhos órfãos é o risco E12. Decisão de ADR = dono. | ✅ (a) RATIFICADO 2026-09-26 — emenda registrada no ADR |
| **F-RB7** | Templates iniciais | **(a)** os 6 gráficos do `CrmAnalyticsBundle` viram templates clonáveis (paridade testada); **(b)** sem templates; **(c)** substituir o bundle fixo pelos templates (apagar `CrmAnalyticsService` fixo) | **(a)** — destrava o usuário sem tela em branco; (c) é refatoração de algo vivo, fora do #14. | ✅ (a) RATIFICADO 2026-09-26 |
| **F-RB8** *(emenda 29/09)* | Moeda: como somar valores de moedas diferentes? | (A) moeda única por tenant; **(B)** somar por moeda, nunca misturar, 400 no `sum` sem dimensão de moeda; (C) câmbio; (D) só a moeda-base + "N fora do total" (dossiê 29/09 §7, D-11) | **(B)** (dossiê) | ✅ **DECIDIDO 2026-09-29** (dono, questionário; decisão 14): **(B) + visão convertida à parte** — *"Soma por moeda e conversão a parte com cambio"* + *"PTAX do BCB, taxa do dia"*: tabela de taxas, cotada 1×/dia, com a data exibida. Checklist 17-26 |

### 4.1 Sub-forks do F-RB8 — ✅ fechados em 29/09 (2ª rodada)

O dono decidiu o **quê** (por moeda + convertida à parte pela PTAX do dia). Estes eram os **como**. Na 2ª rodada (29/09) o
dono ratificou o 8a (com acréscimo) e, com isso, resolveu o 8f. A sessão reavaliou 8b–8e: em cada um só um caminho é
razoável dada a decisão. Por isso foram fechados por regra, depois de aviso explícito ao dono ("fecho por regra, se você não
vetar"), que não vetou. Colunas de caminhos e recomendação mantidas como registro.

| Sub-fork | Pergunta | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| **F-RB8a** | Que data de PTAX converte uma oportunidade **ganha**? | **(a)** o dia da consulta para todas as linhas (abertas e ganhas); **(b)** ganha pela PTAX do dia do ganho (`crmOpportunities.closedAt`), aberta pela do dia da consulta; **(c)** (b) só quando o relatório tem dimensão de período sobre `closedAt` | **(a)** — é a leitura literal de "taxa do dia" e dá **uma** data por moeda para exibir (o dono pediu "a data da taxa", no singular). A verdade histórica já está preservada na soma por moeda. (b) exige converter linha a linha **antes** de agregar (o agregador soma por grupo, `AggregatePipelineProcessor.ts:153`), um histórico de PTAX desde o `closedAt` mais antigo e só vale para `crmOpportunities` — leads e propostas não têm data de ganho (`closedAt` só em `OpportunitiesModule.ts:113`). **Custo de (a):** num relatório "ganhos por mês" convertido, os meses antigos saem pelo câmbio de hoje; o rótulo com a data da taxa deixa isso visível | ✅ **RATIFICADO 29/09 (dono), com acréscimo**: *"8a é a simulação do cambio do momento da simulação e depois calcular se foi feito o cambio mesmo com os dados do cambio real"* + *"ADR moeda no A Receber e ainda um monitor que avisa quando vale a pena fazer esse câmbio"*. **Simulado** = (a), neste nó. **Realizado** (o câmbio de fato, do recebimento no Contas a Receber) e **monitor de câmbio** → ADR de moeda, fora deste nó (`docs/plano/decisoes/D-2026-09-29-CRM-RB-MOEDA-REALIZADO.md`) |
| **F-RB8b** | Sem PTAX na data de referência (fim de semana, feriado, antes da publicação, BCB fora do ar) | **(a)** a última PTAX de fechamento ≤ data de referência, com a data dela exibida e `stale: true` se tiver mais de 5 dias corridos; **(b)** sem visão convertida (`RATE_UNAVAILABLE`); **(c)** buscar ao vivo no BCB durante o `run` | **(a)** — (b) deixaria a visão vazia em todo fim de semana e em toda manhã antes das ~13h (em 29/09, às 12h26, o dia ainda não tinha fechamento — §8); (c) prende o relatório à disponibilidade do BCB e contradiz "cotada 1×/dia, guardada". Os 5 dias cobrem o Carnaval (da sexta até a manhã da quarta de Cinzas = 5 dias; calendário **inferido**, não conferido no BCB); passar disso indica job parado, não calendário. Tabela vazia para a moeda → `excluded RATE_UNAVAILABLE` (item 24) | ✅ **FECHADO por regra 29/09** — (a); (b) e (c) não são razoáveis pelos motivos ao lado; dono avisado, sem veto |
| **F-RB8c** | Linha com valor e **moeda nula** | **(a)** grupo explícito "sem moeda" na verdade, fora da conversão, com contagem; **(b)** assumir BRL (`DEFAULT_CURRENCY`); **(c)** excluir a linha | **(a)** — não inventa moeda. (b) é a mistura que o dono proibiu, aplicada ao desconhecido; (c) some com dado em silêncio. O caso existe: `leads.latestProposalCurrency` é opcional e sem default | ✅ **FECHADO por regra 29/09** — (a); decorre do "nunca misturar"; dono avisado, sem veto |
| **F-RB8d** | Campo monetário **sem par de moeda** (campo `currency` criado pelo usuário numa tabela CRM, ou par apagado do schema) | **(a)** `sum`/`avg` permitidos, marcados "moeda não declarada", fora da conversão; **(b)** 400 `REPORT_CURRENCY_UNKNOWN`; **(c)** o spec declara o par (`currencyField`) | **(a)** — sem coluna de moeda, o dado não consegue guardar duas moedas, então não há mistura a detectar; (b) bloqueia o dinheiro do próprio usuário; (c) aumenta a superfície do spec por um caso raro | ✅ **FECHADO por regra 29/09** — (a); sem coluna de moeda não há mistura possível; dono avisado, sem veto |
| **F-RB8e** | PTAX de **compra** ou de **venda**? | **(a)** venda; **(b)** compra; **(c)** média das duas | **(a)** — é a referência usual de mercado ("PTAX venda") — **não verificado**, convenção. A diferença é imaterial para exibição: 0,0006 R$/US$ (≈0,01%) nas amostras de 24–28/09 (verificado). As duas são guardadas, então trocar não exige migração | ✅ **FECHADO por regra 29/09** — (a); imaterial e reversível sem migração; dono avisado, sem veto |
| **F-RB8f** | A tabela de taxas **colide** com a rejeitada [`R-multimoeda`](../plano/rejeitadas/R-multimoeda.md) (ledger BRL-only; slot `exchangeRate` no `AccountingScope`)? Pelo protocolo do vault, colisão com rejeitada = ADR antes | **(a)** não colide: é exibição do CRM, sem lançamento; a tabela tem o nome da fonte (`PtaxRate`), não o do slot contábil, e a contabilidade não a lê (item 26); **(b)** colide → ADR antes do "executa" | **(a)** — a rejeição é sobre moeda **no razão**; nada aqui toca `features/accounting`. O lugar onde multi-moeda contábil de fato morde é outro (§7: o ganho em USD vira título a receber em R$) — esse, sim, é território da R-multimoeda | ✅ **RESOLVIDO pela 8a (29/09)** — (a) para este nó; a parte contábil vai explicitamente para o ADR de moeda, que reabre a R-multimoeda e deve reusar a `PtaxRate` (módulo neutro `features/fx`, item 26) |

### 4.2 Decisão ortogonal PENDENTE — fonte e filtro do "valor de pipeline" (não é deste nó)

Registrada a pedido do dono (29/09). **Não bloqueia o builder:** no builder, o usuário escolhe a fonte e o filtro de forma
explícita, e os templates do F-RB7 não somam dinheiro (item 13). Corrigir exige autorização própria (instrumentação →
correção); aqui só fica listado.

- **Fato (verificado 29/09 em `9dd690b3`):**
  - **Visão geral** — `my-app/features/crm/hooks/useCrmData.ts:55-75` (`computeKpis`): fonte `leads.latestProposalAmount`;
    filtro status ∉ {Lost, Disqualified} (**inclui Won e Converted**); ignora `latestProposalCurrency`.
  - **Analytics** — `server/src/features/analytics/kpis/crm/CrmConversionProcessor.ts:34-38`: filtro `status === 'Open'` e
    valor > 0; `server/src/features/crm/services/CrmAnalyticsService.ts:86-97` troca `pipelineValue` (e ganhos, win rate,
    forecast, ticket) por `crmOpportunities.amount` quando a tabela existe — decisão do dono de 25/09. Ignora `currency`.
  - GAP-MAP: linha "**CRM — valor de pipeline diverge entre visão geral e analytics, e soma moedas**"
    (`docs/operating-manual/GAP-MAP.md:107`), `[ABERTO]`, só registro.
- **Leads × oportunidades — a diferença real (pergunta do dono, 29/09; lido no código em `4b3b7711`):**
  - **Lead** (módulo base CRM-0, `registry.ts:60-66`) é a **pré-qualificação**: quem é o contato, origem, BANT, score, etapa
    no funil. O valor que carrega é um **retrato da última proposta** (`latestProposalAmount/Currency`, `LeadsModule.ts:81-97`),
    não um negócio próprio. Status: Open/Won/Lost/Disqualified/Converted (`LeadsModule.ts:109-113`).
  - **Oportunidade** (módulo opcional, `registry.ts:108-117`: "oportunidade ganha gera conta a receber") é o **negócio**:
    valor, moeda, probabilidade, previsão de fechamento, status Open/Won/Lost e `closedAt`. **Só ela gera dinheiro no
    razão**: o Won dispara o título a receber (`crmController.ts:94-135`) e fica imutável (`OpportunitiesModule.ts:116`).
  - **O lead não "vira" oportunidade — ele pode gerar uma, e continua existindo.** Há duas ações distintas, e nenhuma
    faz o que o nome "conversão" sugere por inteiro:
    - `POST /api/crm/pipeline/convert-lead-to-opportunity` (`routes/crm.ts:21`) cria a oportunidade ligada ao lead e
      **não consome o lead** (`CrmPipelineService.ts:383-386`: "The lead is NOT consumed/terminated — it stays as-is").
      O lead segue com o próprio status e o retrato da proposta. O `amount` da oportunidade é digitado, sem cópia do
      valor do lead (`:454`).
    - `POST /api/crm/pipeline/convert-lead` (`routes/crm.ts:17`) é a única que **encerra** o lead (status `Converted` +
      `convertedAt`). Ela cria **conta + contato**, **não** oportunidade (`CrmPipelineService.ts:106-113`).
    - Uma oportunidade também existe **sem lead**: `crmOpportunities.leadId` é opcional (`OpportunitiesModule.ts:28-35`,
      `required: false`).
    - Os dois funis usam as mesmas etapas. Na prática, o mesmo negócio pode aparecer **duas vezes**: no lead (retrato da
      proposta) e na oportunidade. O conselho CRM de 20/07 já tinha chamado isso de separação "nominal" (CA1). Se o
      desenho pretendido é "o lead vira oportunidade" (encerra ao gerar), isso é decisão de produto em aberto, **não
      registrada** em lugar nenhum que esta sessão tenha lido.
  - **Por isso os números divergem:** a visão geral soma o **retrato** nos leads, inclusive Won e Converted. O analytics
    soma os **negócios abertos** nas oportunidades. Não é arredondamento: são coisas diferentes.
- **Sinal do dono sobre o modelo (29/09), só documentado:** *"Pode atrelar a oportunidade ao lead tendo historico de informações e se atualizar a oportunidade atualiza o lead"*. Está registrado no §9 do PRE-ADR
  `docs/adr/ADR-CRM-lead-opportunity-model.md` como a opção "vincular e espelhar", com as perguntas abertas. Se for
  implementado, a visão geral e o analytics passam a ver o mesmo valor nos negócios vinculados. A divergência que sobra
  é o filtro e os registros sem vínculo.
- **Status após a pergunta:** o dono pediu a diferença antes de escolher. A recomendação (a) continua: "pipeline" é negócio
  aberto, e negócio mora na oportunidade.
- **Caminhos:** (a) a visão geral passa a ler o mesmo que o analytics (oportunidades, só Open; leads como fallback sem a
  tabela); (b) o analytics volta para leads; (c) os dois convivem com rótulos distintos ("pipeline de leads" × "pipeline de
  oportunidades").
- **Recomendação:** **(a)** — a decisão de 25/09 já escolheu a fonte ("ganhos, win rate, ticket e receita vêm de
  `crmOpportunities`"); a visão geral é que não acompanhou. E "pipeline" é o que está em aberto: Won já foi ganho.
  **Qualquer caminho herda o F-RB8:** o card hoje mostra um número só, e terá de mostrar um por moeda (e, se o dono quiser,
  a conversão à parte). O conserto é maior que uma linha.
- **Status:** ⏳ PENDENTE (dono).

## 5. Pendente de validação externa

- Nenhuma regra contábil/fiscal/legal. Única ressalva: soma de `amount` de oportunidades (nome corrigido 29/09; era `value`) é operacional (float JSON do motor), não número contábil — a UI deve dizer isso (FE, fora deste BRIEF).
- Emenda 29/09: a PTAX é **publicação do BCB**, não regra legal aplicada. A visão convertida é estimativa de exibição; o rótulo
  "estimativa pela PTAX de dd/mm, não é número contábil" é do FE (vizinho). Nenhum item do checklist depende de norma.

## 6. Insumos ausentes

- Volume real de linhas CRM por tenant (para o teto do F-RB5) — medir no `dev.db` real (`server/prisma/prisma/dev.db`) na execução.
- Confirmar se `AggregatePipelineProcessor` aplica `sort`/`limit` e `period` sobre `_createdAt` sintético (lido só até a resolução de fonte, linhas 179-280).
- ~~Nomes internos exatos das tabelas de propostas/contas/contatos após [[I8]] (whitelist F-RB3).~~ **Resolvido 29/09:**
  `leadProposals`, `crmAccounts`, `crmContacts` (`presets/modules/registry.ts:77,89,102,175-177`); o [[I8]] só condiciona quais
  estão instaladas (módulos selecionáveis).
- Emenda 29/09 — `createMany({ skipDuplicates })` no SQLite: provavelmente não suportado pelo Prisma (**não verificado**); o
  item 21 já usa upsert por linha, então a dúvida não bloqueia.
- Emenda 29/09 — saída de rede do servidor em produção para `olinda.bcb.gov.br` (firewall/proxy do ambiente de implantação):
  **desconhecida** — pelo grep, é o primeiro `fetch` do servidor a uma API pública externa (o único outro, `app.ts:92`, é o
  health check do Qdrant; SDKs de IA não foram contados). Sem saída, o job registra `warn` e a visão convertida cai em `RATE_UNAVAILABLE`; a verdade por moeda não depende disso.
- Emenda 29/09 — limites de uso e SLA da API Olinda do BCB: não documentados na resposta; o job faz ≤ 2 chamadas por dia útil
  (USD, EUR) quando não há lacuna.

## 7. Achados fora de escopo (não planejados)

- `DashboardLayoutDto` `widgetConfig: z.any()` — validação fraca pré-existente.
- `AnalyticsService` descarta definição inválida em silêncio (E8 do ADR) para o caminho `analyticsDefinitions` — não corrigido aqui.
- `FE-INCR-CRM-REPORT-BUILDER` (tela: builder fonte→dimensões→medidas→filtros + preview com `ChartRenderer`) — nó vizinho, BRIEF próprio. Emenda 29/09: herda do F-RB8 a exibição por moeda, o bloco convertido separado com a data da taxa e o aviso `stale`, e o KPI (`kind:'kpi'`) com um valor por moeda.
- **Emenda 29/09 — NOVO, REGISTRADO no GAP-MAP (Nível 3) com OK do dono 29/09 (*"Registrar; corrige no ADR"*):** uma
  **oportunidade ganha em USD/EUR vira título a receber em R$ pelo valor nominal**. `crmController.ts:126-133` monta o `WonOpportunityFact` com `amount` e sem
  `currency`; `CrmReceivableBridge.ts:61` documenta `amount` como "reais"; não há guarda BRL-only em lugar nenhum de
  `server/src` (grep). Grau: **leitura verificada; efeito inferido** (sem execução nem teste). É aqui que moeda no razão morde
  de fato — território da [`R-multimoeda`](../plano/rejeitadas/R-multimoeda.md), não deste nó.
- Emenda 29/09 — a whitelist de 6 fontes (`CRM_REPORT_SOURCES`) deixa de fora `leadPipelines` e `leadStages`, que também são
  tabelas do módulo CRM (`registry.ts:66`). O F-RB3=(b) diz "todas as tabelas CRM instaladas". Não alterado aqui (fora do
  pedido); a sessão de feature ou o dono decide se entram (por exemplo, como alvo de join para mostrar o nome da etapa).
- Emenda 29/09 — o `sum` do agregador é `Number` puro (`AggregatePipelineProcessor.ts:153`), não `addMoney`: deriva de float
  em somas longas. Pré-existente, afeta todo relatório; o item 24 usa `addMoney` só na conversão.

## 8. Emenda 2026-09-29 — registro e evidência

**O que mudou:** fork **F-RB8** (moeda) decidido pelo dono, com os sub-forks F-RB8a..f pendentes (§4, §4.1); checklist
17-26; contratos (§3: `CRM_MONEY_CURRENCY_PAIRS`, `convertTo`, `RunCrmReportOutput`, `IPtaxClient`, model `PtaxRate`);
Registro de Fronteira da tabela de taxas (§1.1); nomes de campo corrigidos; decisão ortogonal do valor de pipeline (§4.2).
Os itens 1-16 e os forks F-RB1..F-RB7 **não** foram reabertos — só receberam os nomes corretos e as notas do F-RB8.

**Nomes corrigidos (verificados no código em 29/09):**

| Citado até 26/09 | Nome real | Onde |
|---|---|---|
| `leads.value` | `latestProposalAmount` (+ `latestProposalCurrency`) | `LeadsModule.ts:82-97` |
| `crmOpportunities.value` | `amount` (+ `currency`) | `OpportunitiesModule.ts:77-94` |
| fonte `proposals` | `leadProposals` (`amount` + `currency`) | `registry.ts:77,175`; `LeadProposalsModule.ts:23-30` |
| fonte `accounts` | `crmAccounts` | `registry.ts:89,176` |
| fonte `contacts` | `crmContacts` | `registry.ts:102,177` |

**API PTAX do BCB — consultada ao vivo em 29/09 (≈12h26 de Brasília), leitura sem autenticação:**
- Endpoint de intervalo: `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@moeda='USD'&@dataInicial='09-24-2026'&@dataFinalCotacao='09-28-2026'&$filter=tipoBoletim eq 'Fechamento'&$format=json`
  → 3 fechamentos (24, 25 e 28/09; o sábado e o domingo não vêm). Venda: 5,17950 · 5,19910 · 5,21320.
- Endpoint do dia: `CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)` → em dia útil, 5 boletins (`Abertura`, 3×
  `Intermediário`, `Fechamento PTAX`); o fechamento saiu às 13:03 (24/09), 13:10 (25/09) e 13:03 (28/09).
- Sábado 26/09 → `"value": []`. Dia 29/09 às 12h26 → só 3 boletins, **sem fechamento** (motivo do F-RB8b).
- O rótulo do fechamento **muda entre os endpoints** (`'Fechamento'` × `'Fechamento PTAX'`) — o item 22 aceita os dois.
- EUR vem direto em reais (`cotacaoVenda` 5,92530 em 28/09); a lista `Moedas` inclui EUR. As cotações vêm com 5 casas.
- Diferença compra × venda nas amostras: 0,0006 R$/US$.

**Caso adversarial tentado contra a conclusão "Prisma first-class" (§1.1):** "a taxa é só um cache de exibição, cabe num
preset DynamicTable 'system' e poupa migração". Resultado: reprova no Q3 — a idempotência do job exige `@@unique`, e o
`unique` de preset é checado fora da transação (AC-2.1-B5), então dois ticks concorrentes gravariam a mesma cotação; e a
tabela 'system' é justamente a que o F-AD0 congelou. A conclusão se manteve.

**Checagem que teria falhado se a emenda estivesse errada:** os nomes da tabela acima foram lidos nos arquivos citados (um
nome inventado não aparece no `grep`); o comportamento do fim de semana e do "antes das 13h" veio da API, não de memória.

### 8.1 Segunda rodada (29/09, mesma sessão)

- **F-RB8a ratificado com acréscimo:** o simulado (PTAX do momento da consulta) fica neste nó. O realizado (o câmbio de
  fato, que vem do recebimento no Contas a Receber) e um **monitor que avisa quando vale a pena fazer o câmbio** vão para um
  **ADR de moeda no Contas a Receber**, que reabre a R-multimoeda. Registro: `docs/plano/decisoes/D-2026-09-29-CRM-RB-MOEDA-REALIZADO.md`.
- **F-RB8f** resolvido pela 8a. **F-RB8b–8e** fechados por regra, depois de aviso ao dono, sem veto.
- **Consequência de desenho:** a `PtaxRate`, o repositório, o client e o job vão para um módulo neutro, `server/src/features/fx/`
  (§1.1, item 26), porque o ADR e o monitor vão reusá-los.
- **GAP-MAP:** o achado "Won em USD/EUR vira título em R$ nominal" entrou no Nível 3 como `[ABERTO]`, com o conserto no ADR.
- **§4.2** ganhou a resposta factual à pergunta do dono ("qual a real diferença entre leads e oportunidades?"). A decisão
  do valor de pipeline segue pendente.
- **Só documentação** (dono, 29/09): o ADR de moeda e o monitor ficam registrados como direção; quem autoriza o quê é
  decidido em outra sessão.
- **§4.2** também passou a responder "o lead se torna oportunidade?": não. O lead gera uma oportunidade e continua
  existindo; a única ação que encerra o lead cria conta + contato, não oportunidade; e a oportunidade não exige lead.
- **Caso adversarial tentado contra "realizado = CRM à mão"** (a opção mais barata): contradiz a imutabilidade do Won
  decidida em 25/09 (`OpportunitiesModule.ts:116`, "edits would drift CRM × ledger") e cria uma segunda fonte do valor
  recebido. O dono escolheu o ADR, o que mantém uma fonte só.
