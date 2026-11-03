# BE-INCR-MODULOS-BASE-SUBMODULOS — BRIEF: categorias com base fixa + submódulos opcionais (F-BV-2)

- **Data:** 2026-10-31 (detalhado na mesma data, a pedido do dono: *"Vamos tentar trazer mais detalhes ao brief"*)
- **Status:** BRIEF — forks F-MS-1..8 **RATIFICADOS** em 31/10 (questionário; F-MS-1/2 → (b), demais → (a)),
  ver [`D-2026-10-31-MODULOS-BASE-SUBMODULOS`](../plano/decisoes/D-2026-10-31-MODULOS-BASE-SUBMODULOS.md) §F-MS.
  Nenhum fork aberto. **Sem código, sem "executa"** — código exige "executa" do dono (ORCH-006).
- **Nó:** [`docs/plano/nos/BUILDER-VERTICAIS.md`](../plano/nos/BUILDER-VERTICAIS.md), comportamento 5 do esqueleto do
  [`PRE-ADR-BUILDER-VERTICAIS.md`](../adr/PRE-ADR-BUILDER-VERTICAIS.md) §5 ("se F-BV-2 a: módulos não-CRM no registro").
- **Escopo:** backend + os contratos gerados que o FE já importa (`my-app/types/contracts/**.gen.ts`, regenerados, sem
  mudança de tela). Seletor de módulos e navegação por categoria no FE = `FE-INCR-MODULOS-BASE-SUBMODULOS` (separado).

## TLDR

Hoje só o CRM é módulo; salão e clínica montam 17 tabelas à mão e a remoção é decidida tabela a tabela. Este BRIEF
generaliza o registro de módulos do CRM para 7 categorias (PESSOAS, VENDAS, ESTOQUE, AGENDA, CRM, FINANCEIRO, GESTÃO),
cada uma com **uma base fixa** e **submódulos de uma tabela**, em 6 PRs que **não mudam nenhuma instalação de salão ou
clínica** (provado por igualdade com o payload capturado antes). Achado que vira correção: a variante de `saleItems` é
escolhida pelo ESTOQUE, não por Produtos (item 12). Risco principal: os testes de igualdade só provam algo se o
payload de referência for capturado **antes** de cada PR (item 0).

## 0. Autorização, decisões e insumos

- **Autorização:** dono, chat, 2026-10-31: *"Sim, abre o BRIEF"*; detalhamento: *"Vamos tentar trazer mais detalhes ao
  brief"*. Cobre este documento; não cobre código.
- **Decisões que este BRIEF respeita como fato (não rediscutir):**
  - F-BV-1..7 (a) — [`D-2026-10-21-CHAT-C-FORKS`](../plano/decisoes/D-2026-10-21-CHAT-C-FORKS.md): F-BV-2 (a) "todo
    agrupamento vira módulo no registro, faseado"; F-BV-3 (a) "manifesto só declara `bridges` de enum fechado";
    F-BV-7 (a) sync completo fora (GAP-MAP #397).
  - F-MB-1..6 e F-MS-1..8 — [`D-2026-10-31-MODULOS-BASE-SUBMODULOS`](../plano/decisoes/D-2026-10-31-MODULOS-BASE-SUBMODULOS.md).
  - I8 / BE-INCR-CRM-SUBMODULES (F-SUB-1..8): lista plana de módulos atômicos; `group` só UI; módulo inteiro ou nada
    (`MODULE_PARTIAL`); sem cascata no servidor (`DEPENDENT_MODULE_KEPT`); relação opcional descartada sem o módulo e
    restaurada por sync.
  - W2 (F-W2-1..3): trava dinâmica (`removability.ts`), `TABLE_LOCKED` no create, lista de tabelas lidas pela
    contabilidade.
  - W1 F-W1-5/6: desmarcar tabela de módulo não-fixo desmarca o módulo; sessão nasce de preset ∪ módulos.
  - TESTE-ACOPLAMENTO-PRESET F-TAP-1 (b): cada módulo do `MODULE_REGISTRY` é testado isolado — passa a cobrir os
    módulos novos sem esforço extra; achado novo entra em `KNOWN_GAPS` com nó dono (F-TAP-4 a).
  - ADR-PERSISTENCE-BOUNDARY §2.1: tudo aqui é mundo DynamicTable; nenhum serviço Prisma entra no registro, no
    `moduleSelection.ts` nem no `removability.ts`.

### 0.1 Código lido (origin/main `b20c21e3`, 31/10) — verificado lendo o arquivo

| # | Fato | Onde |
|---|---|---|
| E1 | `MODULE_KEYS` só CRM; `category: z.literal('crm')`; guarda "não-fixo = 1 tabela" | `server/src/features/dynamicTables/presets/modules/registry.ts:30,46` |
| E2 | `resolveModuleSelection`: pedido ∪ default da suíte; dependência **fixa** entra implícita; não-fixa ausente → 400 `missingModule` | `presets/modules/moduleSelection.ts:17-41` |
| E3 | `applyModuleRemovals`: `FIXED_MODULE_PARTIAL`, `MODULE_PARTIAL`, `DEPENDENT_MODULE_KEPT` | `moduleSelection.ts:52-80` |
| E4 | Create: `{...Core.tables, ...composeModuleTables(mods), ...originalPreset.tables}`; remoção por módulo antes da trava por tabela | `server/src/controllers/dashboardController.ts:202-213` |
| E5 | Relação **opcional** para tabela ausente é descartada (create e install); obrigatória → 400 | `dashboardController.ts:289-318`; `DynamicTableService.ts:378-396` |
| E6 | Variante de `saleItems`: `inventory.stock` ∧ `services.catalog` → mixed; só `inventory.stock` → products-only; senão services-only. `inventory.stock` é fornecido por `productUnits` (ESTOQUE), **não** por `products` (`catalog.products`) | `DynamicTableService.ts:420-431`; `ProductModule.ts:21-23,73-75` |
| E7 | `products.deleteConstraints` aponta por marcador para `productUnits`, `saleItems`, `stockMovements`; o install só resolve marcador em campo `relation` | `ProductModule.ts:39-59`; `DynamicTableService.ts:230-238` |
| E8 | No delete, a constraint só é consultada para tabelas que **de fato** têm relação apontando para a tabela da linha (`findTablesByUserId` → filtra `relation.targetTable === table.id`) | `DynamicTableService.ts:840-875` |
| E9 | `requiresTables`: `sales`→`saleItems`; `appointments`→`services`,`customers`; `commissions`→`sales`,`saleItems` | módulos em `presets/modules/**` |
| E10 | `lockedByAccounting` em `customers`, `packages`, `sales`, `saleItems` (salão e clínica) | `systems/BeautySalonPreset.ts`, `AestheticClinicPreset.ts` |
| E11 | Ponte de pacote tolera catálogo ausente (`null` + warn) | `accounting/sync/bridges/saleItems.ts:139` |
| E12 | Tipo do tomador lê `customers`; sem a tabela → `NAO_IDENTIFICADO` | `accounting/sync/bridges/saleItems.ts:241-247` |
| E13 | CMV: `InventoryService.recordSaleCogs` (subrazão **Prisma**, alimentado por `receiveStock` via `PayableService`); **não** lê `productUnits`/`stockMovements` | `accounting/sync/bridges/SaleSalesAccountingBridge.ts:150-187`; `accounting/services/InventoryService.ts:140,221` |
| E14 | `goals` só relaciona `unitId` (+ `metricKey`); `reports` sem relação; `campaigns` só `unitId`. `GoalsPlugin` casa só a própria tabela | `presets/modules/business/*.ts`; `rules/plugins/GoalsPlugin.ts:43` |
| E15 | "Ligar depois" por chave atômica, com checagem de dependência instalada | `services/ModuleInstallService.ts:56-95` |
| E16 | Consumidores de `registry.ts` no server: create, DTOs `CreateDashboard`/`InstallModule`/`InterviewModules`/`ChatInterview`, `ModuleKnowledgeBase`, `ModuleSuggester`, `StateManager`, `sessionComposition`, `CustomizationService`, `InterviewService`, `StageHandlers`, `InterviewTypes`, `PresetSyncService`, `PresetService`, `presets/index.ts`, `CrmPipelineService`, `buildQuickPreset`, `removability.ts` | grep `modules/registry` |
| E17 | FE: `my-app/features/crm/lib/crmModules.ts` espelha as chaves CRM à mão (`CrmModuleKey` + `CRM_MODULE_TABLES`); `ModuleChecklist.tsx` consome `moduleViews`; 4 contratos `.gen.ts` carregam o enum | `my-app/features/crm/lib/crmModules.ts:9-16`; `my-app/types/contracts/**` |
| E18 | `server/public/openapi.json` carrega o enum de chaves (6 ocorrências de `"CRM-2A"`) | grep |

### 0.2 Conclusões tiradas dos fatos acima

- **CMV não depende de ESTOQUE (DT)** (E13): VEN-PROD sem EST-0 continua postando CMV quando a compra entra por contas
  a pagar. Há **dois estoques**: o operacional (DT `productUnits`, quantidade) e o valorado (Prisma `InventoryItem`).
  Este BRIEF não os une (achado §7). Grau: verificado lendo; não executado.
- **`deleteConstraints` com alvo ausente não quebra o delete** (E8): sem a tabela-alvo, nenhuma tabela referencia a
  linha por aquele caminho e a constraint nunca é lida. F-MS-4 (a) fica condicionado ao item 18 — se verde, nada se
  descarta. Grau: inferido da leitura; o item 18 é a checagem.
- **GESTÃO não depende de outra categoria por tabela** (E14). `metricKey` lê KPIs que podem não ter fonte (meta de
  venda sem VENDAS) — tratado como dado vazio, não como dependência (item 25).
- **PESSOAS-0 obrigatória com VENDAS** (F-MB-1/6) tem razão fiscal concreta: sem `customers` o tomador vira
  `NAO_IDENTIFICADO` em toda venda (E12).

## 1. Mapa-alvo

| Categoria | Base fixa (chave → tabelas) | Submódulos (chave → tabela) | `dependsOn` | `requiresOneOf` |
|---|---|---|---|---|
| core | (fora do registro) units, employees, tasks, stakeholders | — | — | — |
| pessoas | `PES-0` → customers | `PES-FORN` → suppliers | — | — |
| vendas | `VEN-0` → sales, saleItems | `VEN-SERV` → services · `VEN-PROD` → products · `VEN-PAC` → packages · `VEN-COM` → commissions | `VEN-0`: [PES-0] · `VEN-COM`: [VEN-0] · demais: [VEN-0] | `VEN-0`: [[VEN-SERV, VEN-PROD, VEN-PAC]] |
| estoque | `EST-0` → productUnits, stockMovements | — | [VEN-PROD] | — |
| agenda | `AGE-0` → appointments | — | [PES-0, VEN-SERV] | — |
| crm | `CRM-0` (inalterado) | CRM-1, CRM-2A, CRM-2B, CRM-3 (inalterados) · `CRM-CAMP` → campaigns | `CRM-CAMP`: [CRM-0] | — |
| financeiro | `FIN-0` → expenses | `FIN-REC` → otherRevenues · `FIN-BASE` → financialBaselines | — | — |
| gestao | `GES-0` → reports | `GES-META` → goals | — | — |

**Default do salão e da clínica** (todos ligados, igual a hoje): `CRM-0, CRM-1, CRM-CAMP, PES-0, PES-FORN, VEN-0,
VEN-SERV, VEN-PROD, VEN-PAC, VEN-COM, EST-0, AGE-0, FIN-0, FIN-REC, FIN-BASE, GES-0, GES-META`.

> Nota: `CRM-CAMP` no default liga `CRM-0`, que o salão e a clínica já têm. Um vertical sem CRM perde campanhas
> (F-MB-3b, escolha do dono).

**Grupos de UI (`MODULE_GROUPS`, F-SUB-5 a — só alias de entrada, nunca dependência):** um por categoria nova, com a
chave da categoria em maiúsculas (`PESSOAS`, `VENDAS`, `ESTOQUE`, `AGENDA`, `FINANCEIRO`, `GESTAO`) expandindo para
todos os módulos da categoria. O CRM mantém só `CRM-2`.

## 2. Checklist de comportamentos

Formato de cada item: **o que** · arquivos · teste (arquivo → caso) · aceite.

### PR-0 — Fotografia de referência (pré-requisito dos testes de igualdade)

0. **Capturar o payload atual** de create do salão e da clínica (sem `modules`/`removedTables`, e com 3 remoções
   representativas: `campaigns`, `goals`, `commissions`) e o resultado de `computeTableLocks` com todas as tabelas
   mantidas, como fixture JSON versionada.
   - Arquivos: `server/src/features/dynamicTables/presets/__tests__/fixtures/suite-payload-baseline.json` (novo);
     script `presets/__tests__/captureSuiteBaseline.ts` (novo, roda via jest com `--testNamePattern=capture` e
     `UPDATE_BASELINE=1`).
   - Teste: `presets/__tests__/suitePayloadBaseline.test.ts` → "o payload atual é igual à fotografia" (verde em main).
   - Aceite: commit da fixture **antes** de qualquer mudança de registro; os PRs 1–5 comparam contra ela e só podem
     alterá-la no próprio PR com a justificativa escrita no diff (ex.: item 12 muda a variante só no caso sem ESTOQUE,
     que a fotografia não cobre).

### PR-1 — Registro genérico (nenhuma instalação muda)

1. **Categoria vira enum.** `MODULE_CATEGORIES = ['crm','pessoas','vendas','estoque','agenda','financeiro','gestao']`;
   `moduleDefSchema.category = z.enum(MODULE_CATEGORIES)`.
   - Arquivos: `presets/modules/registry.ts`.
   - Teste: `presets/modules/__tests__/moduleRegistry.test.ts` → "toda entrada do registro passa no schema".
2. **Uma base por categoria.** Invariante: para cada categoria **presente no registro**, exatamente um módulo
   `fixed: true`; fixo pode ter N tabelas; não-fixo exatamente 1 (guarda atual mantida).
   - Teste: `moduleRegistry.test.ts` → "cada categoria tem uma base", "não-fixo tem uma tabela"; teste negativo com
     registro sintético de duas bases → falha nomeando a categoria.
3. **Dependência entre categorias.** `dependsOn` aceita qualquer chave. Dependência para base fixa (de qualquer
   categoria) entra implícita; para não-fixo ausente → 400 `missingModule` (mensagem atual).
   - Arquivos: `moduleSelection.ts` (`resolveModuleSelection` — hoje já usa `registry[dep].fixed`; o que muda é só o
     registro com dependência cruzada).
   - Teste: `moduleSelection.test.ts` com registro sintético: "AGE-0 puxa PES-0 implícito", "AGE-0 sem VEN-SERV → 400
     missingModule VEN-SERV".
4. **`requiresOneOf`.** Campo `requiresOneOf: ModuleKey[][]` (default `[]`, cada grupo com ≥2 chaves).
   `resolveModuleSelection` (após fechar dependências) e `applyModuleRemovals` (sobre os mantidos) lançam
   `ValidationError` com `{ reason: 'REQUIRES_ONE_OF', module, oneOf }` e mensagem
   `O módulo '<m>' exige pelo menos um destes: <a>, <b>, <c>.`
   - Teste: `moduleSelection.test.ts` → "VEN-0 sem catálogo → 400 REQUIRES_ONE_OF", "remover os três catálogos → 400",
     "remover dois de três → ok".
5. **Remover a base remove a categoria.** Em `applyModuleRemovals`: se todas as tabelas da base saíram, todos os
   módulos da categoria saem; se sobrar submódulo da categoria com tabela mantida → 400 `DEPENDENT_MODULE_KEPT`
   (mesma regra F-SUB-6, sem cascata); se outra categoria depender da base → idem.
   - Teste: "remover sales+saleItems com VEN-SERV mantido → 400 DEPENDENT_MODULE_KEPT [VEN-SERV]", "remover a
     categoria VENDAS inteira com AGE-0 mantido → 400 (AGE-0 depende de VEN-SERV)".
6. **Fonte de schema por módulo.** `TABLE_SOURCES` passa a ser montado de um mapa `MODULE_TABLE_SOURCES: Record<ModuleKey,
   Record<string, module>>`, para que `systems/*.ts` não importem de novo o mesmo módulo.
   - Teste: "toda tabela de todo módulo tem fonte" (já implícito em `composeModuleTables`; vira asserção explícita).
7. **Grupos por categoria.** `MODULE_GROUP_KEYS` ganha `PESSOAS`, `VENDAS`, `ESTOQUE`, `AGENDA`, `FINANCEIRO`, `GESTAO`;
   `expandModuleSelectors` inalterado (já é genérico).
   - Teste: "VENDAS expande para VEN-0, VEN-SERV, VEN-PROD, VEN-PAC, VEN-COM".
8. **Não-regressão.** Com o registro novo e só as entradas CRM, o payload do salão/clínica é igual à fotografia (item 0).
   - Gate: `suitePayloadBaseline.test.ts` verde; `presetSchemaCoupling.test.ts` verde sem item novo em `KNOWN_GAPS`.

### PR-2 — PESSOAS, VENDAS e catálogo

9. **Registrar PES-0 e PES-FORN.** `aiDescription` pt (ver item 34), `freeSelects: {}` (F-MS-6).
10. **Registrar VEN-0 e submódulos.** Conforme §1. `VEN-0.lockedBy` ainda **não** existe (PR-5); a trava continua vindo
    de `lockedByAccounting` na tabela da suíte até lá.
11. **Presets declaram módulos.** `BeautySalonPreset` e `AestheticClinicPreset`: `modules` passa a listar as chaves
    de PESSOAS e VENDAS; as tabelas `customers`, `suppliers`, `sales`, `saleItems`, `services`, `products`, `packages`,
    `commissions` saem de `tables`. **A clínica troca a fonte de `customers`** (`aestheticClinicCustomerModule`): o
    módulo PES-0 precisa aceitar **override de fonte por suíte** — ver item 11a.
    - 11a. `PresetSuite.moduleOverrides?: Partial<Record<string, unknown>>` (internalName → módulo-fonte), aplicado em
      `composeModuleTables(keys, overrides)`; guarda: o override precisa ter o mesmo `internalName` e conter todos os
      campos que algum plugin/ponte lê (manifesto `PLUGIN_MANIFEST` do teste de acoplamento).
    - 11b. `lockedByAccounting` continua aplicado: `composeModuleTables` recebe `locked: string[]` da suíte até o PR-5.
    - Arquivos: `systems/BeautySalonPreset.ts`, `systems/AestheticClinicPreset.ts`, `presets/modules/registry.ts`,
      `presets/index.ts` (tipo `PresetSuite`), `dashboardController.ts` (passa overrides/locked).
    - Teste: `suitePayloadBaseline.test.ts` igual à fotografia para os dois; `aestheticClinicPreset.test.ts` → "customers
      da clínica vem do módulo da ficha".
12. **Variante de `saleItems` pelos submódulos.** Em `installPresetAsSystem`, a variante deixa de ler `inventory.stock`:
    `VEN-PROD` ∧ `VEN-SERV` → mixed; só `VEN-PROD` → products-only; só `VEN-SERV` → services-only; qualquer combinação
    com `VEN-PAC` sem os dois → mixed (F-MS-3 a). Fonte da verdade: `providesCapabilities` (`catalog.products` de
    `products`, `services.catalog` de `services`, `catalog.packages` de `packages`), sem ler a lista de módulos dentro
    do `DynamicTableService` (o serviço continua sem conhecer o registro).
    - Arquivos: `services/DynamicTableService.ts:418-431`.
    - Confirmar no PR: `SalesItemsServicesOnly`/`ProductsOnly` não têm `packageId` (premissa do F-MS-3).
    - Teste: `DynamicTableService.presetVariant.test.ts` (novo) → 5 casos: {PROD,SERV}→mixed, {PROD}→products-only,
      {PROD sem EST-0}→products-only (**o caso que hoje cai em services-only**), {SERV}→services-only, {PAC}→mixed.
    - Aceite: fotografia inalterada (salão/clínica têm EST-0, mixed nos dois caminhos).
13. **`moduleOfTable` cobre as tabelas novas.** Consequência automática: `assertAddedFieldsRespectModules` passa a
    proibir sombrear campo declarado em `sales`, `customers` etc. (antes valia só para CRM).
    - Teste: `moduleSelection.test.ts` → "addedFields.sales com campo 'totalAmount' → 400".
    - Risco: hoje esse sombreamento passa; o teste de igualdade não pega porque o default não usa `addedFields`.
14. **Contratos.** DTOs `CreateDashboard`, `InstallModule`, `InterviewModules`, `ChatInterview` aceitam as chaves novas
    (enum já derivado de `MODULE_KEYS`/`moduleSelectorSchema`).
    - Gate: snapshot de shape dos DTOs — **inserir só as chaves novas** (UPDATE do snapshot reordena no Windows;
      reverter e inserir à mão); regenerar `my-app/types/contracts/**.gen.ts`; `server/public/openapi.json` atualizado
      no mesmo PR (o enum muda; o path-count não).
15. **`ModuleInstallService` por categoria.** "Ligar depois" `VEN-PAC` num tenant sem pacotes instala `packages`; ligar
    `VEN-SERV` restaura relações opcionais descartadas (`saleItems.serviceId` não é descartado hoje porque a variante
    mixed o declara — confirmar). Teste de integração: `ModuleInstallService.int.test.ts` → "instala VEN-PAC depois".

### PR-3 — ESTOQUE e AGENDA

16. **Registrar EST-0 e AGE-0** conforme §1; salão/clínica ligam os dois; tabelas saem de `tables`.
    - Teste: fotografia inalterada.
17. **Remover ESTOQUE na criação** (`removedTables: ['productUnits','stockMovements']`) → instala sem as duas; a variante
    continua products-only/mixed (item 12); `stockMovements.supplierId` irrelevante.
    - Teste: `dashboardController.modules.int.test.ts` → "salão sem ESTOQUE instala e vende produto".
18. **Apagar produto sem ESTOQUE** (F-MS-4): instalar com VEN-PROD sem EST-0, criar produto, apagar → sucesso; com uma
    venda referenciando o produto → recusa pela constraint `RESTRICT` de `saleItems` (que existe).
    - Teste: `DynamicTableService.deleteConstraints.int.test.ts` → os dois casos.
    - Esperado **verde** pela leitura (E8). Se vermelho → aplicar F-MS-4 (a): descartar no install a constraint com
      alvo ausente (`DynamicTableService.ts:378-396`, mesmo laço do descarte de relação) e restaurar no install do
      módulo-alvo.
19. **Plugins com alvo ausente são no-op.** `ProductAutoStockPlugin`, `UnitAutoStockPlugin`,
    `StockMovementsApplyPlugin`, `rules/plugins/sales/stockSync`, `appointmentSync`: criar produto/unidade/venda sem
    EST-0 ou sem AGE-0 não lança.
    - Teste: um caso por plugin em `rules/plugins/__tests__/absentTarget.test.ts` (novo).
20. **Guarda de exclusão de produto com estoque valorado** (`dynamicTablesController.ts:23`,
    `hasOpenStockForProducts`) continua valendo sem EST-0 — é Prisma, independe da tabela DT. Teste: caso no
    `absentTarget.test.ts` ou no int de delete.

### PR-4 — FINANCEIRO, GESTÃO e Campanhas

21. **Registrar FIN-0, FIN-REC, FIN-BASE, GES-0, GES-META** conforme §1; tabelas saem de `tables`.
22. **Registrar `CRM-CAMP`** (`category: 'crm'`, `dependsOn: ['CRM-0']`). Sem ele, `sales.campaignId` é descartado
    (E5); entra em `OPTIONAL_RELATIONS` do `presetSchemaCoupling.test.ts` com motivo `F-MB-3b`.
    - FE: `my-app/features/crm/lib/crmModules.ts` espelha as chaves CRM à mão (E17) — `CrmModuleKey` precisa ganhar
      `CRM-CAMP`; é edição de FE no **mesmo** PR só se o `tsc` do my-app quebrar com o contrato gerado; senão fica para
      o FE-INCR (registrar no corpo do PR).
23. **Suítes sem tabela solta.** Depois deste PR, `tables` de salão/clínica só contém override (item 11a) — teste
    `presetModules.test.ts` → "toda tabela de suíte pertence a módulo", com allowlist nomeada e motivo (vazia esperada).
24. **Fotografia inalterada** para o default e para as 3 remoções do item 0 (remover `campaigns` agora = remover
    `CRM-CAMP`; remover `goals` = `GES-META`; remover `commissions` = `VEN-COM`).
25. **Meta sem fonte.** GES-META sem VENDAS: criar meta com `metricKey` de venda → aceita; o KPI devolve vazio, não
    erro. Teste: caso em `GoalsPlugin.test.ts`.

### PR-5 — Obrigatório derivado das pontes e trava no módulo

26. **`bridges` no preset** (F-MS-7 a): `PresetSuite.bridges: BridgeKey[]` com `BRIDGE_KEYS = ['sales@1'] as const`;
    salão e clínica declaram `['sales@1']`. Mapa fechado
    `BRIDGE_REQUIRES: Record<BridgeKey, ModuleKey[]> = { 'sales@1': ['PES-0', 'VEN-0'] }`.
27. **Recusa de seleção sem o obrigatório.** No create, após `applyModuleRemovals`: módulo exigido por ponte ausente
    → 400 `{ reason: 'BRIDGE_REQUIRES_MODULE', bridge, module }`, mensagem
    `A contabilidade do setor (<bridge>) exige o módulo '<m>'.` Também em `StateManager` (recusa na conversa, mesma
    mensagem).
    - Teste: `moduleSelection.test.ts` + `dashboardController.modules.int.test.ts` → "remover VENDAS do salão → 400",
      "remover PESSOAS do salão → 400 (PES-0)".
28. **Trava no módulo.** `ModuleDef.lockedBy?: 'accounting'` + regra: a trava vale quando a suíte declara uma ponte que
    exige o módulo. Resultado: PES-0 e VEN-0 travados em salão/clínica; **VEN-PAC deixa de ser travado** (F-MB-5).
    `lockedByAccounting` sai de `customers`/`sales`/`saleItems`/`packages` nas suítes.
    - Arquivos: `removability.ts` (`lockOf` lê a trava do módulo dono antes da trava por `meta`), `TableFactory.ts`
      (mantém o helper para compatibilidade, sem uso nas suítes), `systems/*.ts`.
    - Teste: `removability.test.ts` → "packages sem trava no salão", "customers travado por ACCOUNTING", mensagem
      inalterada; fotografia: muda **só** a trava de `packages` (atualização explícita da fixture, justificada no diff).
29. **Pacotes depois do 1º lançamento** (F-MS-5 a): sem caminho novo. Teste de integração: tenant com venda de pacote
    lançada → apagar a tabela `packages` é recusado pelas guardas atuais; apagar a linha do pacote vendido é recusado
    (`saleItems.packageId` RESTRICT).
    - Se vermelho: **lacuna** registrada no GAP-MAP com nó próprio (guarda no controller/serviço de integração — nunca
      no `DynamicTableService`); este PR não conserta.

### PR-6 — Entrevista com IA e conhecimento de módulos

30. **`aiDescription` dos 14 módulos novos** em pt, uma frase que diga o que a tabela guarda e o que liga
    (ex.: `VEN-PAC`: "Pacotes de sessões pré-pagas com validade; a venda de pacote gera passivo até o consumo.").
    Teste: `ModuleKnowledgeBase.test.ts` → "todo módulo aparece no conhecimento da IA".
31. **`ModuleSuggester`** sugere por categoria: base sempre que a categoria é sugerida; submódulo quando a descrição o
    justifica. Teste: descrição "loja de roupas sem agendamento" → sem `AGE-0`, com `VEN-PROD` e `EST-0`; "barbearia" →
    com `AGE-0`, `VEN-SERV`.
32. **`StateManager`/`sessionComposition`** usam as chaves novas sem lista paralela; F-W1-5 (desmarcar tabela de
    submódulo desmarca o módulo com aviso; base fixa travada) vale para todas as categorias. Teste: "desmarcar
    `packages` desmarca VEN-PAC", "desmarcar `sales` → recusa (base de VENDAS, exigida pela ponte)".
33. **Sessão nascida do salão = create default** (F-W1-6 a). Teste: igualdade dos módulos da sessão com o default §1.
34. **`buildQuickPreset`** (onboarding rápido) produz a mesma seleção default. Teste de igualdade.

## 3. Contratos

```ts
// presets/modules/registry.ts
export const MODULE_CATEGORIES = ['crm','pessoas','vendas','estoque','agenda','financeiro','gestao'] as const;

export const MODULE_KEYS = [
  'CRM-0','CRM-1','CRM-2A','CRM-2B','CRM-3','CRM-CAMP',
  'PES-0','PES-FORN',
  'VEN-0','VEN-SERV','VEN-PROD','VEN-PAC','VEN-COM',
  'EST-0','AGE-0',
  'FIN-0','FIN-REC','FIN-BASE',
  'GES-0','GES-META',
] as const;

export const MODULE_GROUP_KEYS = ['CRM-2','PESSOAS','VENDAS','ESTOQUE','AGENDA','FINANCEIRO','GESTAO'] as const;

export const moduleDefSchema = z.object({
  key: moduleKeySchema,
  category: z.enum(MODULE_CATEGORIES),
  group: moduleGroupKeySchema.optional(),
  name: z.object({ pt: z.string().min(1), en: z.string().min(1) }).strict(),
  aiDescription: z.string().min(1),
  fixed: z.boolean(),
  tables: z.array(z.string().min(1)).min(1),             // fixo: N; não-fixo: 1 (guarda em teste)
  dependsOn: z.array(moduleKeySchema),
  requiresOneOf: z.array(z.array(moduleKeySchema).min(2)).default([]),
  lockedBy: z.literal('accounting').optional(),           // PR-5
  freeSelects: z.record(z.string(), z.array(z.string().min(1))),
}).strict();

// presets/index.ts
export const BRIDGE_KEYS = ['sales@1'] as const;
export type BridgeKey = (typeof BRIDGE_KEYS)[number];
export const BRIDGE_REQUIRES: Readonly<Record<BridgeKey, readonly ModuleKey[]>> = { 'sales@1': ['PES-0', 'VEN-0'] };

export type PresetSuite = {
  key: string;
  name: string;
  description: string;
  modules: ModuleKey[];
  bridges: BridgeKey[];                                   // PR-5
  moduleOverrides?: Record<string, unknown>;              // PR-2, internalName → módulo-fonte
  aiProfile: { name: string; description: string };
  tables: Record<string, PresetTableDefinition>;          // após PR-4: só o que não é módulo (esperado: vazio)
};

// ValidationError.details novos
type RequiresOneOf = { reason: 'REQUIRES_ONE_OF'; module: ModuleKey; oneOf: ModuleKey[] };
type BridgeRequiresModule = { reason: 'BRIDGE_REQUIRES_MODULE'; bridge: BridgeKey; module: ModuleKey };
// reaproveitados sem mudança: missingModule, MODULE_PARTIAL, FIXED_MODULE_PARTIAL, DEPENDENT_MODULE_KEPT, TABLE_LOCKED
```

`presetModuleViewSchema` (`GET /dashboard/presets/:key`) ganha `category` — mudança aditiva no DTO de resposta
(snapshot só com a inserção).

## 4. Forks — RATIFICADOS 2026-10-31

| Fork | Decisão |
|---|---|
| F-MS-1 | **(b)** sufixo legível (contra a recomendação) |
| F-MS-2 | **(b)** `CRM-CAMP` |
| F-MS-3 | (a) Pacotes não muda a variante; só Pacotes → mixed |
| F-MS-4 | (a) descartar no install a `deleteConstraint` com alvo ausente — **só se o item 18 ficar vermelho** (E8 indica que não precisa) |
| F-MS-5 | (a) sem caminho novo; teste prova as guardas atuais; vermelho → lacuna |
| F-MS-6 | (a) `freeSelects` nascem `{}` |
| F-MS-7 | (a) `bridges` no preset TS agora |
| F-MS-8 | (a) Comissões em VENDAS; FINANCEIRO com base Despesas |

### Decisões de detalhe sem fork (caminho único pelo que já está decidido)

- **Override de fonte por suíte (item 11a)** — necessário porque a clínica usa outro módulo para `customers` e F-MB-1
  pôs `customers` na base de PESSOAS. A alternativa (dois módulos PES-0) quebra "uma base por categoria" (item 2).
- **Grupos por categoria (item 7)** — F-SUB-5 (a) já fixou que grupo é alias de UI; o nome da categoria é o alias
  natural.
- **`category` em `moduleViews`** — aditivo, necessário para o FE agrupar sem lista paralela (E17).

## 5. Pendente de validação externa

- Nenhuma regra contábil/fiscal nova. A trava contábil muda de lugar (tabela → módulo); as tabelas lidas pela
  contabilidade continuam as do W2 (F-W2-2). `packages` destravado na criação é decisão do dono (F-MB-5), não regra
  de lei.
- Sign-off de browser do seletor de módulos fica no `FE-INCR-*`.

## 6. Insumos ausentes

Os 5 do primeiro rascunho foram resolvidos por leitura (§0.2: CMV, Metas/Relatórios, FE, `deleteConstraints`, openapi).
Restam:

- Se `SalesItemsServicesOnly`/`ProductsOnly` têm `packageId` — premissa do F-MS-3, conferida no início do PR-2.
- Se `saleItems.serviceId` é descartado em alguma combinação hoje (item 15).
- Lista exata de chaves que `ModuleSuggester` reconhece por texto (item 31) — lida no início do PR-6.

## 7. Achados fora de escopo

- **Dois estoques** (E13): DT `productUnits` (quantidade operacional) × Prisma `InventoryItem` (valorado, CMV). Um
  vertical com VEN-PROD sem EST-0 tem CMV mas não tem saldo operacional na tela. Unificar ou explicar ao usuário é nó
  próprio.
- **Tenants já instalados:** a filiação a módulos pode ser derivada das tabelas presentes, sem migração de linhas; o sync
  completo (lifecycle, deleteConstraints, noOverlap, compositeUnique) segue no GAP-MAP #397 (F-BV-7 a).
- **Não existe "desinstalar módulo"** (só remoção na criação e delete de tabela).
- **Verticais fora do molde "venda"** (locação, obra, assinatura): arquétipo + ponte próprios (F-BV-3 a); entram em
  `BRIDGE_KEYS` só com PR de código revisado.
- `crmModules.ts` no FE espelha chaves à mão; o FE-INCR deveria derivar de `moduleViews`.

## 8. Gates que o diff aciona

| Gate | PRs |
|---|---|
| `cd server && npx tsc --noEmit` e `cd my-app && npx tsc --noEmit` (+ `npm run test:types` no my-app) | todos |
| Snapshot de shape dos DTOs (inserção manual) + contratos `.gen.ts` + `openapi.json` | 2, 4, 5 |
| `presetSchemaCoupling.test.ts` / `analyticsFieldMappingCoupling.test.ts` (F-TAP-1 b cobre cada módulo novo isolado) | 1–4 |
| `suitePayloadBaseline.test.ts` (fotografia do item 0) | 1–5 |
| `npm run check:arch` | todos |
| `npm run test:integration` (com `--runInBand`) para os `*.int.test.ts` | 2, 3, 5 |
| `node scripts/classe-risco.mjs pr <n>` — PR-5 mexe em trava contábil, esperado **vermelho** | 5 |

## 9. Tamanho e perfil

| PR | Itens | Arquivos (estimado) | Perfil |
|---|---|---|---|
| PR-0 | 0 | 3 | opus-baixo |
| PR-1 | 1–8 | 4 | opus-médio |
| PR-2 | 9–15 | ~14 (DTOs + contratos gerados) | opus-médio |
| PR-3 | 16–20 | ~8 | opus-médio |
| PR-4 | 21–25 | ~8 | opus-baixo |
| PR-5 | 26–29 | ~8 | opus-médio (classe vermelha) |
| PR-6 | 30–34 | ~8 | opus-médio |

Ordem: PR-0 → PR-1 → PR-2 → {PR-3, PR-4 em paralelo, arquivos disjuntos exceto as duas suítes — serializar a edição de
`systems/*.ts`} → PR-5 → PR-6.

## 10. Riscos (inclui vieses do autor)

- **Principal:** os testes de igualdade só provam algo com a fotografia capturada **antes** (item 0). Fotografia
  regenerada dentro de um PR que muda comportamento esconde a mudança — por isso a fixture só muda com justificativa no
  diff.
- **Override da clínica (item 11a):** é o ponto mais novo do desenho; se o override puder trocar campo lido por ponte,
  a clínica para de lançar. A guarda contra `PLUGIN_MANIFEST` existe para isso.
- **Item 13 muda comportamento** de quem hoje sombreia campo de `sales` via `addedFields` — sem fotografia que pegue.
- Viés de continuidade: o corte segue o mecanismo do CRM. Alternativa não testada: módulo com N tabelas não-fixas.
- Casos adversariais tentados:
  - "Produtos sem Estoque continua vendável" — **refutado no código atual** (E6) → item 12.
  - "Sem ESTOQUE o CMV para" — **não se confirmou** (E13): o CMV usa o estoque valorado em Prisma.
  - "`deleteConstraints` com alvo ausente quebra o delete" — **não se confirmou na leitura** (E8); o item 18 é a prova.
