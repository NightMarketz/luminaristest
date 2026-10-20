# Achados da sessão de 2026-10-19 — motor DynamicTable, camada de construção e módulos anteriores ao baseline

**Pedido do dono (chat, 2026-10-19):** "Verifique a arquitetura e faça todas as correções sugeridas e mais correções necessárias no DynamicTable", seguido de quatro perguntas (o que falta na arquitetura; construção/encaixe/customização de módulos; comportamento do builder fora do CRM e o que nasce ao final da escolha; inventário do que temos; visão micro dos módulos antigos) e da autorização "Autorizo as duas (Recommended)" para registrar no GAP-MAP, instrumentar e corrigir as lacunas do estoque/comissão/readOnly e do analytics (sem merge).

**Grau de cada claim:** **[P]** provado executando nesta sessão (sonda em SQLite real ou teste) · **[V]** verificado por leitura do código citado, dos dois lados quando há FE+BE · **[I]** inferido, não executado.

**Como foi medido:** leitura direta do motor e dos documentos (auditoria de regressão 2026-10, contrato §2, GAP-MAP, vault `docs/plano/`), 5 sondas temporárias em SQLite real (apagadas, não commitadas), 5 leituras independentes por agente em escopos disjuntos (plugins/vendas, analytics, chat/agente/documentos, auth/infra/satélites, frontend antigo) com os piores achados reconferidos por mim no código, e gates (`tsc` ×2, `check:arch`, `skill-audit`, unit 357 suítes, integração 4/4 shards) no PR #769.

---

## 0. Estado ao fim da sessão (o que existe, onde, e o que depende do dono)

| Item | Onde | Estado | Pendente do dono |
|---|---|---|---|
| Correções de arquitetura do motor | PR [#769](https://github.com/NightMarketz/luminaristest/pull/769), branch `claude/dynamictable-architecture-fixes-9e5ba8` | CI 14/14 verde; decisão em `docs/plano/decisoes/D-2026-10-19-DT-ARQUITETURA-CORRECOES.md` | OK de merge por número |
| Estoque não baixa no Finalized · comissão sem `rate` · DynamicForm envia readOnly | PR [#771](https://github.com/NightMarketz/luminaristest/pull/771), branch `claude/goofy-gates-bf02b6` | 3 pares teste→fix, GAP-MAP Nível 3 [CORRIGIDO]; CI 14/14 verde | OK de merge por número |
| Analytics com dado fabricado/errado (6 itens) | PR [#770](https://github.com/NightMarketz/luminaristest/pull/770), branch `claude/lucid-bhabha-aaaf3d` | 6 pares teste→fix, GAP-MAP Nível 5; CI 14/14 verde | OK de merge por número **e** decisão (a) esconder KPIs derivados de constante × (b) ler dado real de funcionários |
| `addedFields` do create custom vaza entre tenants | PR [#772](https://github.com/NightMarketz/luminaristest/pull/772), branch `claude/musing-goldwasser-188139`, commits `90673ae9` (teste vermelho) + `84a2720f` (fix) | verificado localmente (tsc, check:arch, suíte dashboard 12/106); CI 11/12 verde, 1 pendente | OK de merge por número |
| BRIEF: motor deixa de chamar consumidores (KnowledgeGraph/KpiCache) | branch `claude/mystifying-ptolemy-65dd7c` (empilhada no #769), commits `00113cfd` + `d4967c4c`, **não pushada** — `docs/accounting/BE-INCR-DT-NO-CONSUMER-CALLS-brief.md` + nota de nó | BRIEF com 7 lacunas e opções (a)–(d); forks ratificados na recomendação, opção (b), com autorização registrada pela sessão | push/PR do BRIEF; depois `executa` |
| Este documento + vault | este arquivo, 10 nós em `docs/plano/nos/`, decisão `D-2026-10-19-ACHADOS-NA-FILA`, seção E da `FILA-ORDEM` | PR de docs (branch `claude/vault-achados-2026-10-19`) | OK de merge por número |

Regra da casa aplicada: "pode mergear tudo" não autoriza merge; a confirmação é por número de PR (CLAUDE.md "Merge só com PR nomeado").

---

## 1. Arquitetura do motor DynamicTable — o que foi corrigido no #769

Fonte das "correções sugeridas": FALHAs do grupo A em `docs/operating-manual/AUDITORIA-REGRESSAO-ARQUITETURAL-2026-10.md` §2 (R1, R3, R4, R6, R14) + Contrato §2 + memórias `orchestration-service-tx-repo-smell` / `tx-nao-propagado-ao-repo`. Cada item teve sonda vermelha antes do diff (saídas literais no corpo do PR).

| # | Achado | Grau | Correção |
|---|---|---|---|
| 1 | `TransactionalDynamicTableRepository` era cópia de 380 linhas de `DynamicTableRepository` com dois desvios reais: `findRowsReferencingId` com `LIMIT 100` (o lote de delete rodava `checkDeleteRules` com ela → `RESTRICT_IF_AGGREGATE` subcontava, `CASCADE` deixava órfãos acima de 100) e `findTablesReferencingTableId` sem `userId` (devolvia tabela de outro tenant). Vermelho: `Expected: 150 / Received: 100`; id do tenant B na lista | [P] | Classe apagada. `DynamicTableRepository` é único, aceita client raiz ou de tx, expõe `withTransaction(tx)` e `runInTransaction(fn, {timeout})` (reentrante) |
| 2 | `DynamicTableService` importava `lib/prisma` (R1, baseline L3) e instanciava o repo tx 7× (R4) | [V] | Service só chama o seam do repositório; baseline do `check:arch` 32 → 31; ledger de dívida C5 (`docs/architecture/lint-layer-gate.md`) com a supressão SANCTIONED removida. Marco T0 do `installPresetAsSystem` literal (allowlist do `proveP2ZeroDiffCli`) |
| 3 | `validation/SchemaValidator` e `GovernanceEngine` existiam e os docs diziam que o service delegava; o service tinha cópia inline *drifted* (um lado sem o fix Zod 4 `.partial()` #385; o outro sem a contagem indexada). `PresetInstallerService` dos docs nunca existiu no git | [V] | Engines viram implementação única; service só orquestra. `SchemaValidator.buildZodSchema(schema, applyDefaults)`; `GovernanceEngine.assertNotImmutableForDelete`. Docs da feature corrigidos |
| 4 | `compositeUnique` fazia `findAllDataByTableId` (full scan) com `countByCompositeFieldValues` existindo sem chamador. Vermelho: `findAllDataByTableId` chamado | [P] | Contagem indexada `json_extract`; booleano JSON comparado como 1/0 |
| 5 | GAP-MAP 8 TOCTOU (#390, aberto): `deleteTableData` lia regras de delete fora da tx. Vermelho: `findTablesByUserId` do repo raiz chamado | [P] | `checkDeleteRules` dentro de `runInTransaction` com repo tx-bound (mesmo desenho do lote #409) |
| 6 | R3: `PresetSyncService`/`ModuleInstallService` sem policy; ADMIN-only vivia só nos controllers. Vermelho: USER chegava ao repositório | [P] | `DynamicTablePolicy.canAdministerPresets` consultado antes de qualquer leitura; 3 controllers deixaram de repetir o check (403 continua) |
| 7 | R14: 10 `as any` no motor (7 `(this.tx as any).$queryRaw`), `console.*` no service, log de validação com payload (C4) | [V] | Zero `any` fora do contrato; `logger` com contexto; log só com nomes de campo |
| 8 | Métodos mortos no repositório (`findDataByTableIdPaged`, `countDataByTableId`, `getDataByTableId`) | [V] | Removidos |
| 9 | `installPresetAsSystem` mutava `preset.tables` do chamador | [V] | Cópia de trabalho local |
| 10 | R6: `deleteTable`, `deleteTablesByUserId`, `deleteAllDataByUserId` são hard delete | [V] | **Por desenho, não dívida**: `DynamicTable` não tem `deletedAt`; é purga de reset/conta com cascade de FK (F-DTV-4 a, LGPD art. 16/18). Declarado no JSDoc da interface. Soft-delete de tabela exigiria migração + filtro em toda leitura — fora do pedido |

Contrato emendado (`.claude/skills/_ARCHITECTURE-CONTRACT.md` AC-2.1-B5 e AC-2.2-2): o texto dizia que `unique`/`compositeUnique` só rodava antes da tx; desde o GAP-MAP 7 (2026-09-23) há re-checagem in-tx sob lock, e desde esta sessão a contagem é indexada. `skill-audit run` → 0 findings.

### 1.1 O que ainda é arquitetura do motor (não corrigido, por decisão de desenho)

- **O motor chama dois consumidores** [V]: `DynamicTableService` importa `KnowledgeGraphService` (chat) e `KpiCacheService` (analytics) e os aciona após escritas. Não viola o gate B1 (não são módulos Prisma first-class), mas contradiz o contrato §2.1 ("o motor nunca chama o consumidor"). → BRIEF escrito (branch `claude/mystifying-ptolemy-65dd7c`), 8 forks pendentes.
- **Trava de unicidade é in-process** [V]: `unique`/`compositeUnique`/`noOverlap` fecham a corrida só dentro de um processo Node (teto declarado; SQLite, um processo por arquivo).
- Métodos de usuário `createTable`/`updateTable`/`deleteTable` são código morto por desenho (policy sempre nega) [V]; cosmético.
- Cobertura do grupo A é a pior da auditoria (62,7% de linhas) e o repositório só é exercitado por integração (R16) [V].
- Fora do motor (grupo A da auditoria, não corrigido aqui): R20–R22 do `my-app` (13 `fetch(` cru, 12 `<table>` próprias, `zinc`/`rounded-xl`) e `ReportService` importando prisma (R1).

---

## 2. Camada de construção (presets, módulos, encaixe, customização)

### 2.1 Bug provado

- **`addedFields` do create "Controle Total" muta o preset compartilhado e vaza para o tenant seguinte** [P]. `dashboardController.ts` (handleCustomCreation) faz `tableSchema.fields.push(...)` no schema do singleton do preset. Sonda: `BeautySalonPreset.tables.customers.schema.fields` 20 → 21 após o create do tenant A; create rápido do tenant B instala `customers` com `campoDoTenantA`. Os outros caminhos (`applySelectOverrides`, drop de relação opcional, `TableFactory`) já clonam. → fix na branch `claude/musing-goldwasser-188139`, sem PR.

### 2.2 Encaixe das regras (verificado agora, sem teste-guarda)

Varredura de Core + módulos + 3 suítes checando se `compositeUnique`, `immutableAfter`, `compare`, `lifecycle`, `noOverlap`, `requiredIf`, `deleteConstraints`, `defaultDisplayField`, `defaultValue` de select e alvos de relação apontam para campo/tabela existente: **zero inconsistência** [P]; só as duas relações opcionais de `leads` → contas/contatos, descartadas por desenho. Não existe teste disso (item do REVIEW_BACKLOG desde junho: "um typo num módulo vira regra silenciosa"); a sonda vira teste em minutos.

### 2.3 Lacunas estruturais (não bug)

- **Só o CRM é "módulo"** [V]: `MODULE_REGISTRY` tem 5 chaves (CRM-0, 1, 2A, 2B, 3). As 17 tabelas do salão são compostas à mão na suíte, sem chave de módulo; "ligar depois", `freeSelects`, `moduleViews` e remoção por módulo só existem para CRM; o resto remove tabela a tabela via `meta` (requires/excludes/capabilities). Dois mecanismos para a mesma pergunta.
- **Preset é código, não dado** [V]: salão e clínica repetem 17 linhas idênticas de composição; vertical novo é arquivo TS. O vault já nomeia o próximo passo (`BUILDER-VERTICAIS`, destravado, sem autorização): preset vira manifesto serializável.
- **Customização pós-instalação é fina e com perda** [V]: `PresetSyncService` propaga só campos, opções de select e `immutableAfter`; `lifecycle`, `deleteConstraints`, `noOverlap` e `compositeUnique` nunca chegam a tenant instalado; o sync desfaz `selectOverrides` (#397, aberto no GAP-MAP).
- **Wizard**: W2, W4, W5, W7 fechados; W3 e W6 em voo (sign-off de browser e decisão humana); W1 só planejado.
- Registro desatualizado: o backlog diz que `aiDescription` não tem consumidor (tem: `ModuleKnowledgeBase`); `description` dos módulos continua campo morto (`TableFactory` descarta).

### 2.4 Comportamento real do builder fora do CRM e o que nasce ao final

- **Rápido** (`QuickSetup` e entrevista): `buildQuickPreset` monta Core + módulos CRM da suíte + **todas** as tabelas da suíte como estão. Nenhuma escolha para vendas, agenda, produtos, estoque, despesas; única variação automática é a troca de `saleItems` para produtos/serviços/misto pelas capacidades.
- **Entrevista com IA**: envia só `{suiteKey, unit, fiscal, modules}`; a customização feita na conversa (tabelas e campos por IA) **não chega ao create** (W1 `planned`). Hoje a entrevista é seletor de suíte com customização descartada.
- **Controle Total**: envia `presetKey`, `removedTables`, `addedFields`, unidade, fiscal; fora do CRM é ligar/desligar tabela inteira com travas (`ACCOUNTING` em clientes/pacotes/vendas/itens; relação obrigatória; `requiresTables`; capacidade). A tela nunca envia campo (`customFields` vazio); `modules`/`selectOverrides` não são enviados.
- **Ao final** (`SystemProvisioningService.provision` + controller): guarda one-shot (403 se já tem tabelas); `installPresetAsSystem` em uma tx (marco T0); primeira linha de `units` pelo caminho normal (plugins semeiam funil e estoque por unidade); perfil fiscal da empresa se regime conhecido (`NAO_SEI` → `pendente`); perfil da unidade best-effort; falha nos passos 3–4 compensa tudo; ativação contábil pelo kit do setor (salão/clínica; CRM puro `not-applicable`) com plano de contas, período aberto, binding e recarga de mappers; `Draft` ou erro não derruba o tenant (códigos `CHART_OF_ACCOUNTS_EMPTY`, `ACCOUNTING_PERIOD_NOT_OPEN`, `EVENT_COVERAGE_MISSING`, `KIT_INSTALL_STEP_FAILED`, `KIT_FISCAL_PROFILE_REQUIRED`, `ACCOUNTING_ACTIVATION_FAILED`, `ACCOUNTING_SYNC_RELOAD_FAILED`); redirect para `/dashboard`.
- **O que ainda há a fazer depois**: regime fiscal se `NAO_SEI`; cadastros operacionais nascem vazios (sem seed de negócio); ajuste de estrutura fora do CRM só por admin via `sync-preset`/`install-table`; sign-off de browser do W3 pendente.

### 2.5 E-commerce de produto físico, hoje

Não existe vertical: três suítes (salão, clínica, CRM) e dois kits (salão, clínica). A entrevista responde `none` ou força salão/CRM; Rápido com `beautySalon` instala agenda, serviços, pacotes, comissões e campanhas e o kit contábil do salão (catálogo LC 116); Controle Total chega ao mais perto (sem `services.catalog` a `saleItems` vira só-produtos), mas `packages` não sai (trava `ACCOUNTING`) e o kit segue o do salão. Faltam em módulo: ciclo do pedido com frete/rastreio/transportadora, variantes/SKU, categorias, canal/marketplace e repasse, devolução como fluxo, checkout; NFC-e (X10a) e emissão própria (X10i) bloqueadas por oráculo externo. O que já cobre: produtos com estoque por unidade, movimentos, venda com itens, clientes, fornecedores, despesas, CRM; na contabilidade, arquétipos de receita, liquidação, estorno e CMV. Para ter o vertical hoje: módulos novos + `EcommercePreset.ts` com `aiProfile` + kit `sectorKits/kits/ecommerce/kit.v1.ts` no `KIT_REGISTRY` (binding/plano/referencial; frete e repasse pedem papel de conta novo) + testes no padrão da clínica — exatamente o problema que `BUILDER-VERTICAIS` descreve.

### 2.6 Inventário (verticais + módulos agnósticos), régua 54/63

Verticais: salão (molde, kit v6), clínica estética (P2, kit v6), CRM puro (sem kit). Fechado: Core; CRM-0..3; agenda/pacotes do molde (validade em main, não implantada); venda "recebo depois"; estoque por unidade + subrazão first-class + NF-e de compra → título; financeiro 17/19 (AP/AR subrazão, aging, caixa projetado, conciliação OFX/CNAB, baixas F7); contabilidade 21/22 (plano 4 níveis, períodos, hash-chain, maker-checker, relatórios, ECD, imobilizado, revisão, pacote ao contador); fiscal 16/22 (ECF Real, NFS-e nacional, apuração X7 fase C, Simples com telas em PR, DCTFWeb em voo); analytics canônico; kanban; agente de chat. Faltam, por faixa: builder de verticais; comércio operacional (PDV, compras, pedido/frete/devolução, variantes); infraestrutura de SaaS (e-mail, reset de senha, backup, planos/cobrança do próprio produto, rastreio de erro, console de frota); atendimento, marketing, RH/folha (diferidos); administração do tenant (1 usuário = 1 tenant, sem organização/convite). Gargalo medido pelo vault: H1, H2, M2 (PVA, sign-off de browser, 1º deploy) em gate humano.

---

## 3. Visão micro dos módulos anteriores ao baseline (0db39612, 2026-06-11)

Pastas pré-baseline: `analytics`, `chat`, `chatInstances`, `chatMessages`, `dashboardLayout`, `documents`, `dynamicTables`, `interview`, `reports`, `structuredData`, `users` (+ `my-app/features/dashboard`). Achados de junho reconferidos por mim: **corrigidos** — CORS por `ALLOWED_ORIGIN`, rate limit de login, `/health` com DB e Qdrant, SIGTERM limpo, limites e magic bytes de upload, JWT com `algorithms: ['HS256']`; **ainda abertos** — transporte de e-mail inexistente, "esqueci a senha" sem rota, `deleteOldProposals` nunca chamado, logout só limpa cookie, sparkline com `Math.random`, sem interceptor de 401, Sentry só em comentário, `structured-data` montado sem consumidor.

### 3.1 Motor de regras e fluxos de venda (plugins)

Fato estrutural [V]: o service persiste a linha **antes** de rodar `afterUpdate` e devolve o record dessa primeira escrita; `beforeCreate`/`beforeUpdate` rodam **fora** da transação.

| # | Achado | Grau | Estado |
|---|---|---|---|
| 1 | **Estoque nunca baixa ao finalizar venda; cancelar/devolver depois infla o estoque.** `stockSync.ts` ~210-223: a "guarda de idempotência" relê a venda e retorna se `status === 'Finalized'`, mas em `afterUpdate` a linha já está Finalized. Sonda real: venda com 2 unidades → após Finalized `stock 10, reserved 2` (nada baixa) e 1 movimento de saída gravado (inconsistente) | [P] | **PR #771** |
| 2 | Comissão materializada grava `commissionRate`; o preset usa o field preset cujo `name` é `rate` → taxa sempre vazia | [V] | **PR #771** |
| 3 | Editar qualquer item de serviço falha com Appointments instalado mesmo com `requiresAppointment=false` (`SalesPlugin` ~76-82 chama a coerência de agendamento incondicionalmente; `appointmentSync.ts:45` lança sem `appointmentId`) | [V] | aberto |
| 4 | Compra manual de estoque vira `Adjustment`: `StockMovementsApplyPlugin:35` lê `sourceType`, campo que o preset não declara (Zod remove); `reason='Adjustment'` forçado; o KPI de custo só conta "purchase" → compras somem do custo | [V] | aberto |
| 5 | Provisionamento de estoque pára em 50 linhas: `ProductAutoStockPlugin:50` e `UnitAutoStockPlugin:49` usam `findDataByTableId` sem paginação (default 50) | [V] | aberto |
| 6 | Venda que nasce `Finalized` pula todos os guards de finalização (só exige `unitId`/`date`); o controller lança receita a partir dela | [V] mecanismo · [I] gravidade | aberto |
| 7 | Efeitos de escrita em hooks fora da tx: ajuste de estoque (`SMA:98/132`), criação de agendamento (`appointmentSync:133`), soft delete da venda (`SP:240/268`) antes do `runInTransaction` | [V] | aberto |
| 8 | Ponte contábil e resposta HTTP recebem a linha pré-recálculo (`DTS` devolve a 1ª escrita; `SP` ~308-324 recalcula totais depois) → receita contabilizada = valor enviado pelo cliente | [V] mecanismo · [I] impacto | aberto |
| 9 | Serviço conta `qty=1` no cabeçalho, mas os KPIs somam `q*p` | [V] | aberto |
| 10 | Fallback de estoque cruza unidade (`resolveProductUnitId` devolve a 1ª linha de qualquer unidade) | [V] | aberto |
| 11 | `LeadsPlugin.afterUpdate` "limpa" `nextActionAt` depois de persistido (nada reescreve) | [V] | aberto |
| 12 | Falha no 1º item soft-deleta a venda em rascunho (`saleItems.ts:10-21`); o usuário perde o draft | [V] | aberto |
| 13 | Agendamento automático escapa de `noOverlap`/`lifecycle`/`AppointmentsPlugin` (`appointmentSync:117-133`, `now+1h`) | [V] | aberto |
| 14 | `customerMetrics`: heurística sobrescreve `AtRisk/Churned`; `isLoyalCustomer` usa estágio pós-incremento; datas `date` gravadas como ISO datetime | [V] | aberto |
| 15 | Recálculo grava `id` dentro do JSON da linha (`SP:319`) — polui dado e ledger de versões | [V] | aberto |
| 16 | `GoalsPlugin`: meta aumentada mantém "Reached" com progresso <50% | [V] | aberto |
| 17 | `reason` gravado `'SALE'/'RETURN'` vs opções do preset `'Sale'/'Return'` | [V] | aberto |
| 18 | Ramo `sourceType === 'SALE'` do `SMA` é morto → editar/apagar movimentação de venda pelo serviço aplica/reverte estoque como se fosse manual | [V] | aberto |
| 19–22 | Código morto em `SP.beforeUpdate`; `AppointmentsPlugin` descarta a tolerância de duração (`if (!durationOk) {}`); campos declarados sem leitor/escritor (`serviceCommission`, `productCommission`, `actorId`, `prevStageId`, `nextStageId`); heurística por nome inalcançável | [V] | cosmético |
| 23 | Horário do profissional em hora local do servidor (`getHours()`) | [I] | aberto |

Sólido [V]: pacotes (`PackageBalanceService` com decremento condicional em SQL, aceite com hash, 30+ casos); `RegisterPaymentService`/`SalesCancellationService` (whitelist, cross-tenant, idempotência, ponte pós-commit); todo metadado de preset tem consumidor; `tableFinder.resolveTable` consistente; XOR/no-mix/um-pacote-por-venda cobertos.

### 3.2 Analytics e KPIs

| # | Achado | Grau | Estado |
|---|---|---|---|
| 1 | **Top-10 ordena por nome, não por valor** (`AggregatePipelineProcessor` ignora `sort.by:'measure'`); idem receita por tipo/canal e custo por categoria | [V] (reconferido por mim) | **PR #770** |
| 2 | **Contas a pagar sempre 0**: bloco de caixa do `SalesModule` (~577) manda `expenseDateField:'date'`; `expenses` só tem `paymentDate`/`dueDate`; toda despesa descartada; liquidez vira sentinela 999. Teste verde por fixture com `date`. Os outros 3 blocos do mesmo arquivo usam `paymentDate` | [V] (reconferido) | **PR #770** |
| 3 | **KPIs com constantes inventadas**: `employeesCount:3, totalHoursWorked:528, equity:50000, recurringProfit:3500` → "Lucro por Funcionário/Hora", "Produtividade", "Rentabilidade", "Qualidade do Lucro" | [V] (reconferido) | **PR #770** (opção segura: esconder; decisão a/b do dono) |
| 4 | Barra "período anterior" fabricada: `previous: d.previousValue \|\| d.value * 0.8` | [V] (reconferido) | **PR #770** |
| 5 | Sparkline `Math.random()` no `GoldKpiWidgetView`; `sparklineData` real sempre `[]` | [V] | **PR #770** |
| 6 | ▼ vermelho sem dado para trend `flat` (`DashboardKpiCard`) | [V] | **PR #770** |
| 7 | Card do grupo mostra o último KPI do grid com o título do grupo | [V] | aberto |
| 8 | Seletor de período não afeta pipelines/CORE/discover; `formatPeriod` usa data local do servidor | [V] | aberto |
| 9 | Fronteiras de período divergem entre KPIs do mesmo painel (custos em UTC, receita no fuso do usuário) | [V] | aberto |
| 10 | Margem de contribuição por produto é fórmula errada admitida; `previousValue` NaN com qty 0 | [V] | aberto |
| 11 | `DataSanitizer`: "1.500" vira 1,5 | [V] | aberto |
| 12 | Categorias de despesa por keyword: `Personnel` casa em fixed e admin; "Manutenção"/"Não recorrentes" sempre 0 | [V] | aberto |
| 13 | Dia útil sempre do mês, 8h/dia hardcoded | [V] | aberto |
| 14 | Drill-down passa `tableSource` como `tableId` → 404 por nome case-sensitive | [I] | aberto |
| 15 | Validação de campo só loga (`AnalyticsService` descarta o `AnalyticsValidator`) — é o que deixa o item 2 passar | [V] | aberto |
| 16 | `importantFields` com campos inexistentes (`status` em expenses) | [V] | baixo |
| 17 | Múltiplas measures colapsam num total; filtro `!==` estrito número×string | [V] | aberto |
| 18 | Leitura dupla e O(n·m): `fetchRecordsForDataPoint` relê a tabela inteira por ponto | [V] | aberto |
| 19 | Heurística de relação por sufixo `Id` pode apontar tabela errada | [V] mecanismo · [I] efeito | aberto |
| 20 | Rotas órfãs: `chart/:key/details`, CRUD `analytics/definitions`; `/presets/:presetKey/data` ignora o param | [V] | aberto |
| 21 | Morto: `getAllPresetGroups`, `AnalyticsDefinitionValidator`, `CompiledPipeline = PipelineSpec` | [V] | aberto |
| 22 | Cache só guarda grupos de preset e é invalidado em toda escrita | [V] | aberto |
| 23 | `UserContext` parcial (`{id,userId} as UserContext`) chega à policy | [V] | aberto |
| 24 | Discover gera KPI para todo campo `number`; `chartType:'table'` não existe no tipo | [V] | aberto |
| 25 | **Nenhum teste liga `fieldMapping` dos presets ao schema real** | [V] | parcialmente coberto no #770 (teste de acoplamento preset↔schema) |

Sólido [V]: `addMoney` + `DataSanitizer` nos processadores; `DateUtils` com `safeTimeZone`; `KpiCacheService.invalidate` por segmento exato; DTOs Zod na borda; `ExpressionEvaluator` sem eval; drill-down por ids.

### 3.3 Chat, agente ERP e documentos

| # | Achado | Grau |
|---|---|---|
| 1 | Cliente pode injetar `role: 'system'` no `history` (`ChatDto.ts:5`); `sanitizeUserInput` só na `query`; sem teto de itens | [V] |
| 2 | Agente sem memória entre turnos: nenhum hook envia `history`; o servidor não carrega as mensagens que persiste | [V] |
| 3 | Loop de tools é de um passo só (`ChatService.ts:214-225`); `query_table_data → request_record_update` num turno é impossível | [V] |
| 4 | Seletor de documentos do RAG chama `/documents?mode=list`, que a rota ignora → "formato inválido" sempre; `/documents/list` sem consumidor | [V] |
| 5 | `DocumentChatWidget` descarta `type`/`proposal` → `ACTION_PROPOSAL` vira beco sem saída | [V] |
| 6 | Documento preso em PROCESSING para sempre após restart (bytes só em memória; sem job) | [V] |
| 7 | Propostas: `deleteOldProposals` nunca roda; sem TTL; `EXECUTED/EXPIRED` nunca escritos | [V] |
| 8 | PII em log: `args` inteiro em `info`; `rawJson` do documento em `warn` | [V] |
| 9 | Custo OpenAI sem freio fora de `/chat` (upload/search/token-cost); extração estruturada para feature aposentada (R26) | [V] |
| 10 | Extração de texto no event loop (até 50 MB); sem worker/fila | [V] |
| 11 | KnowledgeGraph stale: `updateTableSchemaAsSystem` não sincroniza | [V] |
| 12 | Qdrant sem índice de payload em `userId` (todas as buscas filtram por ele) | [V] |
| 13 | `/documents/qdrant-status` vaza contagem global | [V] |
| 14 | COMPLETED com erro silencioso; dois estados de falha (`FAILED` × `ERROR`); FE só agrupa `ERROR` | [V] |
| 15 | Estimativa de tokens nunca aparece (shape da resposta); DOCX dá 400 | [V] |
| 16 | Policy sem rota: `ChatMessageService.getMessageById/updateMessage/deleteMessage`, `ChatInstanceService.getInstanceById` | [V] |
| 17 | Rotas sem consumidor: `documents/search`, `PATCH /documents/:id`, `qdrant-status`, `/:id/qdrant`; `/structured-data/*` inteiro | [V] |
| 18 | Tabela `Chunk` é write-only (texto duplicado no Qdrant) | [V] |
| 19 | Prompt do KG com campos mortos (`displayField` sempre `''`, `label === name`, omite `readOnly/hidden`) | [V] |
| 20 | `DELETE` morto no contrato de proposta | [V] |
| 21 | `inferType` do Excel classifica texto como DATE (`Date.parse`) | [V] |
| 22 | `RequestLock` com hash de 32 bits — colisão entre usuários devolve resposta alheia | [I] |
| 23 | Batch de embeddings num único request | [I] |
| 24 | `getOrCreateInstance` varre todas as instâncias em memória; constantes mortas | [V] |
| 25 | Zero testes para KG, pipeline de documentos, extratores, sanitizer, filtro do Qdrant, injeção via `history`, loop multi-tool, TTL | [V] |

Sólido [V]: tenancy por posse em instâncias, mensagens, documentos e structuredData (404 anti-enumeração); RAG com dupla cerca (posse + filtro `userId`); policy-first nas propostas; persistência server-owned; delete Qdrant→SQL; upload defensivo; rate limit por usuário em `/chat`.

### 3.4 Usuários/auth, infra e satélites

| # | Achado | Grau |
|---|---|---|
| 1 | Exclusão de usuário com trilha contábil → 500 **depois** de apagar os vetores (3 FKs `onDelete: Restrict`; P2003 não mapeado) | [V] |
| 2 | ADMIN "ativando" layout de outro usuário desativa o próprio e não ativa nada (`setActive` com `userId` do admin); mesmo desvio em `deleteLayout` | [V] |
| 3 | Logout não invalida JWT (sem `jti`, sem blacklist); token de 7 dias segue válido após logout, troca de senha ou demoção | [V] |
| 4 | Chamada de logout do frontend sempre 401 (rota não pública; `fetch` sem credenciais) — "funciona" porque o cliente apaga o cookie | [V] |
| 5 | "Esqueceu a senha?" é `href="#"`; sem rota nem transporte de e-mail | [V] |
| 6 | Troca de senha/e-mail sem confirmar a senha atual | [V] |
| 7 | README diz `GET /users/:id` é "self or admin"; middleware nega a USER (teste confirma 403); a tela de edição permite USER e quebra | [V] |
| 8 | Botão "Make admin" temporário na tela de perfil (backend responde 403 — morto, não escalada) | [V] |
| 9 | `uncaughtException` encerra com código 0 | [V] |
| 10 | Purga de soft delete limpa 2 de 47 modelos com `deletedAt` | [V] |
| 11 | "Soft delete" de anexo apaga o binário na hora | [V] |
| 12 | Exclusão de usuário não limpa anexos em disco | [V] |
| 13 | Rota sem consumidor: `POST /reports/generate-chart-data` (serviço com dívida prisma declarada e ninguém chama) | [V] |
| 14 | Rota sem consumidor: `GET /dashboard-layout/:id` | [V] |
| 15 | Página mock reachável: `/users/subscription`; "plano atual" visual no perfil | [V] |
| 16 | "Lembrar-me 30 dias" × JWT de 7 dias | [V] |
| 17 | `/register` e `POST /users` sem rate limit específico | [V] |
| 18 | `trust proxy` nunca definido | [I] |
| 19 | Cookie `auth_token` setado no cliente sem `httpOnly`; backend aceita cookie como fallback | [V] |
| 20 | `x-user-created-at/updated-at` nunca injetados → `createdAt = new Date()` no contexto | [V] |
| 21 | `getLayoutById` vaza existência (403 ≠ 404) | [V] |
| 22 | Upload de anexo não valida posse do `entityId` | [V] |
| 23 | Timers de purge/watchdog nascem no `import`, fora do bootstrap, sem `clearInterval` | [V] |
| 24 | Jobs: agendados no boot — AccountingSync 5 min, DfePoll 2 min, CollectionCharge 15 min, MpReleaseReport 24 h, LegalParamsRecalc 5 min, Ptax 30 min, purge 24 h, watchdog PROCESSING 5 min; **só CLI manual** (sem script em `package.json`): `activateAccountingBindingCli`, `installSectorKitCli`, `upgradeSectorKitsCli`, `rekeyLegacyUnitCli`, `migratePlano4NiveisCli` | [V] |
| 25 | Sem teste: `/health` 503, logout, `uncaughtException`, delete com FK Restrict, ADMIN activate cross-tenant, register sem limiter; zero testes de FE para login/AuthContext/withAuth/users | [V] |

Sólido [V]: middleware deny-by-default com 30+ casos; policy de usuários (último admin protegido, sem enumeração no login); registro/login com DTO compartilhado, bcrypt; `/health` com DB e Qdrant e 503 degradado; SIGTERM com safety-net; tenancy em savedViews/attachments/reports; env fail-fast; logger NDJSON.

### 3.5 Frontend antigo do dashboard

| # | Achado | Grau | Estado |
|---|---|---|---|
| 1 | **Editar registro pela tabela genérica dá 400 em qualquer tabela com campo `readOnly` preenchido**: o submit do `DynamicForm` itera todos os campos do schema (booleanos sempre), `EditRecordButton` preenche `initialData` com eles, e `GovernanceEngine.assertReadOnly` rejeita qualquer chave readOnly presente (ex.: `sales.isNewCustomer`) | [V] (reconferido por mim nos dois lados) | **PR #771** |
| 2 | Entrevista com IA descarta toda a customização (ver §2.4) | [V] | W1 planejado |
| 3 | `datetime` perde a hora e exibe o dia anterior (`type="date"` → meia-noite UTC → local) | [V] | aberto |
| 4 | Sem interceptor de 401/refresh; token expirado vira toast genérico até navegar | [V] | aberto |
| 5 | Erro da API não é `Error` → todo `instanceof Error` cai no fallback; erro por campo nunca aparece no wizard de pessoas | [V] | aberto |
| 6 | Estado da `GenericTabbedView` reseta a cada render do pai (array novo em `tables`) | [V] · [I] frequência | aberto |
| 7 | Botões sem `onClick` no detalhe do Kanban (arquivar, copiar, compartilhar, seguir); "Contact support" no setup; lógica de dependência do Controle Total morta | [V] | aberto |
| 8 | Rotas inexistentes em serviço (morto): `POST /dynamic-tables`, `GET /:tableId/data/:dataId`, `GET /dashboard/system`; `performLookup` com contrato errado | [V] | aberto |
| 9 | DynamicForm ignora `requiredIf`, `validation.min/max`, `format url/custom`, `defaultValue` (o cliente nem declara) | [V] | aberto |
| 10 | Tipo `json` sem componente → "[object Object]" | [V] | aberto |
| 11 | `readOnly`/`disabled`/`aria-invalid` descartados por select/textarea/moeda/percentual/checkbox | [V] | aberto |
| 12 | `PercentageField` quebra em en-US ("1.5%" → 15) | [V] | aberto |
| 13 | Dinheiro em float no form de venda (`quantidade × unitPrice`) | [V] | aberto |
| 14 | UTC-shift em date-only no Kanban; moeda fixa pt-BR | [V] | aberto |
| 15 | Colunas de relação podem nascer ocultas e ficar persistidas (janela de 1 render) | [V] · [I] | aberto |
| 16 | `common.json` en/pt com chaves duplicadas (`actions`, `filters`, `status`) → `t('actions')` devolve a chave | [V] (reconferido: 2 ocorrências em cada) | aberto |
| 17 | Chaves inexistentes `confirm_inactivate`, `delete_confirmation_title` → PT mostra inglês | [V] | aberto |
| 18 | Strings hardcoded em PT/EN em ~12 arquivos (serviços, dashboard, Kanban, analytics) | [V] | aberto |
| 19 | `fetch` cru fora da service layer em 13 pontos | [V] | aberto |
| 20 | SSR do dashboard com base URL diferente do ApiClient | [V] · [I] | aberto |
| 21 | Só `components/ui/Modal.tsx` tem `role=dialog`, foco e trap; 6 modais não | [V] | aberto |
| 22 | Kanban: reordenar dentro da coluna é só local | [V] | aberto |
| 23 | Paginação/filtros 100% client-side; filtros resetam na troca de aba | [V] | aberto |
| 24 | `StandardPagination` rola o primeiro `.overflow-auto` do documento | [V] · [I] | aberto |
| 25 | Branch morto `'sales'` no `renderByCategory` → "No tables found" | [V] | aberto |
| 26–30 | `console.log` de debug e `setTimeout` em `RightSidebar`; `window.confirm` nativo; toast duplo; `useKanbanData` força defaults; `useRelationLookups` deprecado vivo | [V] | aberto |

Sólido [V]: paridade i18n en↔pt (9 namespaces, 0 diff); relações exibidas por label; date-only no caminho principal; zero `any` evitável; `ErrorBoundary` sem supressão global; `Modal.tsx` canônico; venda de pacote em centavos com aceite por hash.

---

## 4. O padrão por trás dos achados

Os módulos antigos têm boa cobertura de **contrato** (policy, DTO, isolamento de tenant, transação) e quase nenhuma de **comportamento com o preset real**: fixtures inventam nomes de campo (`date` em expenses), o validador de analytics só loga, nenhum teste liga `fieldMapping`/campos lidos por plugin ao schema do módulo, e a suíte de plugins exclui de propósito os efeitos de finalização de venda. Por isso a régua de 54/63 nós mede o núcleo contábil, que é sólido, e não o molde operacional, onde o dono do salão clica. A correção estrutural barata é um teste de acoplamento preset↔schema (campos lidos por plugins e KPIs ⊆ campos declarados) e uma suíte de finalização de venda com o preset inteiro — o #770 começa o primeiro, o #771 o segundo.

## 5. Decisões que só o dono pode tomar

1. Merge por número: #769, #771, #770 (ordem sugerida: #769 primeiro; os outros dois são independentes e rebaseiam limpos).
2. #770 item 3: KPIs derivados de constante — (a) esconder de vez ou (b) ler dado real de funcionários/patrimônio.
3. Abrir o PR do `addedFields` (branch `claude/musing-goldwasser-188139`, fix pronto e verificado).
4. Autorizar e ratificar os forks do BRIEF `BE-INCR-DT-NO-CONSUMER-CALLS` (branch não pushada).
5. Priorizar o restante de §3 (itens "aberto"): sugestão de ordem — plugins 3/4/5/7 (correção silenciosa de estoque e compra), chat 1/6/7 (injeção, PROCESSING eterno, propostas sem TTL), auth 1/2/3 (delete 500, ADMIN layout, logout), FE 3/4/5 (datetime, 401, erros), analytics 8/9 (período e fuso).
