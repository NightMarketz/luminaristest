# ADR-MODULE-BOUNDARIES — Fronteira entre features, peça fora de camada e job como entrypoint (extensão do `check:arch`)

- **Data:** 2026-10-20
- **Status:** **Proposed** — nada ligado. Nenhuma regra entrou no `.dependency-cruiser.cjs`, nenhum arquivo foi movido. Ligar qualquer regra daqui exige ratificação do dono (forks §7) e é emenda datada a este ADR (`ADR-ARCH-BOUNDARIES.md` §5).
- **Classe:** DECISÃO ARQUITETURAL (gate estático — extensão de regra, não gate novo)
- **Autorização:** pedido do dono no chat, 20/10/2026, de uma **medida** do encapsulamento e de uma **sugestão** de arquitetura para separar melhor os módulos (relayed pela sessão que abriu esta). Cobre **propor**. Não cobre ligar regra nem mover código. Formulário: `sessao-planejamento`.
- **Depende de:** `ADR-ARCH-BOUNDARIES.md` (L1–L6, B1/B7, F1, X1–X3, I6; U1–U7; mecânica de baseline §3; exceção ⛔ §4); `.claude/skills/_ARCHITECTURE-CONTRACT.md` §0 (canônicos do FE), §2 (cadeia de camadas), §2.1 (motor × first-class).
- **Conferido contra:** `ADR-DOMAIN-MOTOR-rejected.md`, `ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`, `.claude/skills/_REUSE-CRITERION.md` (§6).

## TLDR (2 linhas)

Nas arestas que as regras atuais enxergam, a conformidade é de 99,6% no server (31 de 6.943) e 99,4% no my-app (23 de 3.578). Mas as regras só medem camada. **Entre features não há fronteira nenhuma**: 264 imports de uma feature em outra, nenhum por API pública, e 45 deles vão direto a `repositories/` de outra feature. Há ainda 220 módulos de produção fora de pasta de camada e 10 jobs que tocam Prisma/repositório direto.
Proposta: 5 regras no server (M1a, M1, M2, J1, D1) e 2 no my-app (U8, U9), cada uma com baseline e ordem de pagamento. O primeiro passo é quase grátis: 13 das 45 arestas M1a e 4 das 5 L5 só importam o **tipo** `BindingScope` pelo arquivo errado.

## 1. Medida (20/10/2026, commit `310a92b4`)

Comandos, cada um rodado nesta sessão:

```
cd server && npx depcruise src --config .dependency-cruiser.cjs --output-type json
cd my-app && node ../server/node_modules/dependency-cruiser/bin/dependency-cruise.mjs pages features components lib types --config .dependency-cruiser.cjs --output-type json
```

As regras propostas foram rodadas com uma config temporária fora do repo: a config do pacote mais as regras deste ADR, escritas como estão no §2/§3. Os números do §2/§3 são a saída **dessas regras**, não uma contagem à mão. Prova de que o `$1` (grupo da feature de origem) funciona: 0 violações M1 com origem e destino na mesma feature, e `chatMessages → chatInstances` conta como cruzada (2).

| Pacote | Módulos | Arestas | Violações no baseline | Conformidade |
|---|---|---|---|---|
| server | 1.585 | 6.943 | 31 (L3 2 · L4 4 · L5 5 · L6 4 · X3 16) | 99,6% |
| my-app | 820 | 3.578 | 23 (U2 1 · U3 18 · U7 4) | 99,4% |

**Artefato de ambiente, não violação:** o worktree não tem `my-app/node_modules`, por isso o cruise do my-app usou o binário do server. Assim `next` resolveu para um store pnpm fora do repo, e `…/next/dist/server/next.js` casou com o `U5` (24 falsos). Isso não afeta U8/U9, que só olham arquivos locais. Não investiguei se o `(^|/)server/` do U5 também casa em CI; está em §9.

**Pontos cegos medidos:**

| Ponto cego | Medida |
|---|---|
| Fronteira entre features (server) | 264 arestas cruzadas, saindo de 22 das 23 features; **0** via `index.ts`. Existe 1 `index.ts` de feature (`analytics/index.ts`), e ele tem efeito colateral: `import './dynamic'; import './kpis'` registram processadores. Destino das arestas: `models/` 69 · `services/` 60 · `repositories/` 45 · `presets/` 22 · `scope/` 16 · `dtos/` 15 · `fixtures/` 15 · `sync/` 7 · `core/` 6 · outros 9 |
| Maiores pares | `sectorKits→accountingBinding` 47 · `accounting→legalParameters` 39 · `interview→dynamicTables` 25 · `packages→accounting` 23 · `analytics→dynamicTables` 10 · `crm→dynamicTables` 10 · `onboarding→accounting` 10 |
| Módulo fora de pasta de camada | 220 de 732 módulos `.ts` de produção em `features/` não têm `services|repositories|policies|models|dtos|controllers` no caminho. 208 deles são importados (823 arestas); os outros 12 só por teste ou por ninguém (é assunto do knip). Maiores: `dynamicTables/presets` 50 · `analytics/kpis` 24 · `dynamicTables/rules` 19 · `accounting/sync` 16 · `sectorKits/kits` 16 · `analytics/dynamic` 15 · `analytics/core` 8 · `interview/FieldCustomizationService` 8 · `accountingBinding/archetypes` 8 · `accounting/dfe` 7. Mais recebidos: `accounting/scope` (211 arestas), `dynamicTables/presets` (173) |
| Singleton Prisma fora de repositório | 15 módulos. Tirando `lib/factory.ts` (composition root) e os 2 L3 do baseline (`ChatService`, `ReportService`), sobram **12**: 10 em `src/jobs/` + `app.ts` + `server.ts` |
| Fronteira entre features (my-app) | 40 arestas cruzadas, 0 `index.ts`: `crm→dashboard` 20 · `accounting→dashboard` 15 · `dashboard→accounting` 2 · `dev→dashboard` 2 · `dashboard→crm` 1 |

**Divergência com o brief que abriu a sessão (os números foram remedidos, não copiados):** cruzadas 273 → **264**. A diferença vem de contagem por entrada de dependência; o depcruise deduplica por par `from→to`. Fora de camada, 251 → **220**: não reproduzi o 251, e a definição usada aqui está na linha acima. M1a deu os mesmos **45**, mas o brief dizia "todas interface I\*Repository", e não é isso: os 45 apontam para arquivos `I*Repository.ts`, só que **13 dos 16** `sectorKits→accountingBinding` importam só `BindingScope`/`bindingScopeWhere`. Esse tipo já mora em `accountingBinding/scope/BindingScope.ts` e é reexportado pelo arquivo do repositório (§4, P0).

## 2. Regras propostas — server

Mesmo estilo de `server/.dependency-cruiser.cjs` (`TEST`, `PRISMA` como lá). Toda regra entra como as de hoje, com `severity: 'error'` e as existentes no baseline: o gate barra só violação nova (`ADR-ARCH-BOUNDARIES.md` §3).

### M1a — nenhuma feature importa `repositories/` de outra (prioridade)

```js
{
  name: 'M1a-no-foreign-repository',
  severity: 'error',
  comment: 'Feature A não conhece o repositório de B (nem a interface). B expõe serviço/porta de leitura.',
  from: { path: '^src/features/([^/]+)/', pathNot: TEST },
  to: { path: '^src/features/[^/]+/repositories/', pathNot: '^src/features/$1/' },
},
```

**Baseline 20/10: 45** (39 type-only). Pares: `sectorKits→accountingBinding` 16 · `crm→dynamicTables` 3 · `packages→accounting` 3 · `sales→dynamicTables` 2 · `documents→users` 2 · `accounting→legalParameters` 2 · `onboarding→chat` 2 · 15 pares com 1 aresta cada. Por alvo: `IAccountingBindingRepository` 16 · `IDynamicTableRepository` 7 · `IUserRepository` 4 · `IFiscalProfileRepository` 3 · `IVectorRepository` 3 · `IChatInstanceRepository` 2 · 10 alvos com 1.

As 7 arestas para `IDynamicTableRepository` (`CrmPipelineService`, `CrmAnalyticsService`, `CrmReportService`, `RegisterPaymentService`, `SalesCancellationService`, `PackageAcceptanceService`, `KnowledgeGraphService`) são **leituras** que pulam o `canManageData` do `DynamicTableService`. As escritas passam pelo serviço (`RegisterPaymentService.ts:23-24`). A guarda de tenant das leituras é refeita à mão em cada chamador, por exemplo `CrmPipelineService.ts:58-64`: `findDataById` "is NOT tenant-scoped", então o chamador compara `dynamicTableId`. Isso é guarda copiada, a classe de bug que a regra quer fechar (verificado no `CrmPipelineService`; nos outros 6, inferido pelo shape da chamada).

**Destino:** a feature dona expõe uma porta de leitura no seu `index.ts`. Para o motor, um `DynamicTableReader` (nome no fork F-MB-9) que resolve tabela por `internalName` do usuário e lê linha **dentro** da tabela, com a guarda de posse num lugar só.

### M1 — feature só importa outra pelo `index.ts`

```js
{
  name: 'M1-cross-feature-via-index',
  severity: 'error',
  comment: 'API pública por feature: features/A só importa features/B/index.ts. O index não tem efeito colateral.',
  from: { path: '^src/features/([^/]+)/', pathNot: TEST },
  to: { path: '^src/features/[^/]+/', pathNot: ['^src/features/$1/', '^src/features/[^/]+/index\\.ts$'] },
},
```

**Baseline 20/10: 264** (contém as 45 da M1a). Se `models/` e `dtos/` ficarem liberados como folhas (fork F-MB-2, opção b), a regra ganha mais um `pathNot` (`'^src/features/[^/]+/(models|dtos)/'`) e o baseline cai para **180**.

### M2 — toda peça de feature mora em pasta de camada

```js
const LAYER_DIR = '/(services|repositories|policies|models|dtos|controllers|domain|ports|adapters)/';
{
  name: 'M2-feature-code-in-layer-folder',
  severity: 'error',
  comment: 'Código de feature vive em pasta de camada. Lógica pura → domain/, interface externa → ports/, implementação externa → adapters/.',
  from: { path: '^src/', pathNot: TEST },
  to: { path: '^src/features/[^/]+/.+\\.ts$', pathNot: [LAYER_DIR, '^src/features/[^/]+/index\\.ts$', TEST] },
},
```

**Baseline 20/10: 823 arestas para 208 módulos** (220 módulos fora de pasta; 12 não importados ficam com o knip). A regra é por aresta, porque o depcruise só barra import: ela pega quem passa a **usar** um módulo mal colocado, não o arquivo criado e ainda não importado. Medido sem `domain|ports|adapters` no `LAYER_DIR`, porque essas pastas ainda não existem.

Destino por grupo (o detalhe vai no BRIEF de execução):

| Hoje | Destino | Pureza medida (importa service/repository/prisma/HTTP?) |
|---|---|---|
| `dynamicTables/presets` (50), `analytics/kpis` (24), `analytics/dynamic` (15), `analytics/core` (8; `core/models/` já casa), `sectorKits/kits` (16), `accountingBinding/archetypes` (8), `accountingBinding/interpreter` (3), `dynamicTables/utils` (5), `analytics/utils` (3), `accounting/audit` (2), `crm/constants.ts`, `sectorKits/registry.ts` | `domain/` | 0 dos 136 módulos |
| `dynamicTables/rules` (19) | **fork F-MB-3**. `RuleContext.repository: IDynamicTableRepository` (`rules/RuleTypes.ts:13`) torna as regras do motor **impuras por contrato** | 1 módulo (o próprio `RuleTypes`) |
| `dynamicTables/validation` (2), `analytics/engine` (2) | `services/` (`GovernanceEngine` recebe `IDynamicTableRepository`; `AnalyticsResolver` importa service) | 1 de 2, 1 de 2 |
| `accounting/sync/AccountingSyncService.ts` + `bridges/` + `mappers/` (16) | serviço → `services/`; `AccountingSyncPort.ts` → `ports/`; mappers puros → `domain/` | 2 de 16 |
| `interview/{Interview,Customization,FieldCustomization}Service/` (19) | `interview/services/<x>/` | 3 de 19 |
| `accounting/dfe` (7), `accounting/collection` (3), `fx/clients` (1), `fx/ports` (1), `accounting/ports` (1) | `*Port.ts` → `ports/`; `Manual/Null/MercadoPago*` → `adapters/` (fork F-MB-4) | 0 |
| `accounting/scope` (3; recebe 211 arestas), `accountingBinding/scope` (1) | `AccountingScope`/`BindingScope` (tipo + where-builder) → `models/`; `AccountingScopeResolver` → `services/`. **A regra I6 cita o caminho `accounting/scope/resolveAccountingScopeInternal.ts`** e muda no mesmo PR | 1 de 3 |
| `accounting/fixtures` (1 `.ts` + 2 `.json`), `accountingBinding/fixtures` (4) | **fork F-MB-5**. São dado de produção: `sectorKits/kits/*/kit.v*.ts` importam `saleBinding`/`clinicBinding`, e o X2 isenta `/fixtures/` só no lado `from` | 3 de 5 (`computeCompiledFromHash` de `BindingCompileService`) |
| `structuredData/types` (2), `accountingBinding/runtime` (1) | `models/` · `services/` | 0 · 0 |

### D1 — `domain/` é pura (vale quando a pasta existir)

```js
{
  name: 'D1-domain-is-pure',
  severity: 'error',
  comment: 'Mesma pureza da F1: domain/ lê models/ e outro domain/; nada de service/repository/Prisma/HTTP.',
  from: { path: '/domain/', pathNot: TEST },
  to: { path: `(/repositories/|/services/|/controllers/|^src/routes/|${PRISMA}|node_modules/express/)` },
},
```

**Baseline: 0 por construção.** Nenhum módulo vai para `domain/` se tiver import impuro (coluna "pureza" acima).

### J1 — job é entrypoint

```js
{
  name: 'J1-job-is-entrypoint',
  severity: 'error',
  comment: 'src/jobs/** é entrypoint: lib/factory → service. Não abre o Prisma nem instancia repositório.',
  from: { path: '^src/jobs/', pathNot: [TEST, '^src/jobs/repositories/', '^src/jobs/(migratePlano4NiveisCli|rekeyLegacyUnitCli|seedAccountingFixtureCli)\\.ts$'] },
  to: { path: `(/repositories/|${PRISMA})` },
},
```

**Baseline 20/10: 20 arestas sem exceção, 16 com as 3 CLIs de migração única nomeadas** (fork F-MB-6). As 16:
- `accountingSyncReconcile.job.ts`: 4 repositórios + prisma.
- `accountingSyncReconcileCli.ts`, `PurgeDeletedRecords.ts`, `JobWatermarkRepository.ts`: prisma.
- `grantPlatformAdminCli.ts`: `IUserRepository`, `UserRepository` e prisma.
- `installSectorKitCli.ts`: `IAccountingBindingRepository` e prisma.
- `upgradeSectorKitsCli.ts`: `IAccountingBindingRepository`, `KitInstallationRepository` e prisma.

`JobWatermarkRepository.ts` **é** um repositório na pasta errada; vai para `src/jobs/repositories/`, isento na origem e sob L4. `app.ts`/`server.ts` (bootstrap: conexão/desligamento) ficam fora do J1 e entram como composition roots ao lado de `lib/factory.ts` (F-MB-6). 11 dos 19 jobs já vão por `lib/factory`.

## 3. Regras propostas — my-app

### U8 — `components/` é UI sem domínio

```js
{
  name: 'U8-components-no-domain-service',
  severity: 'error',
  comment: 'components/ é UI compartilhada: não chama lib/services/ (dado de domínio). Widget de domínio mora em features/<x>/widgets/.',
  from: { path: '^components/', pathNot: TEST },
  to: { path: '^lib/services/' },
},
```

**Baseline 20/10: 3**: `Navbar.tsx → user.service`, `CrmReportWidget.tsx → crmReports.service`, `ErpViewWidget.tsx → dynamic-table.service`. O U3 já existente (18) é o outro lado do mesmo problema. Os 4 widgets de domínio (`CrmReportWidget`, `AnalyticsWidget`, `GoldKpiWidgetView`, `ErpViewWidget`) só são importados pelo registro `components/widgets/dashboard-grid/dashboard-grid.tsx` (e `GoldKpiWidgetView` pelo `AnalyticsWidget`). Destino: `CrmReportWidget` → `features/crm/widgets/`; os 3 outros → `features/dashboard/widgets/`; o registro (`dashboard-grid.tsx`) → `features/dashboard/`. Isso paga U3 18 → 0 e U8 2 → 0 (o `Navbar` é o fork F-MB-10).

### U9 — feature só importa outra pelo `index`

```js
{
  name: 'U9-cross-feature-via-index',
  severity: 'error',
  from: { path: '^features/([^/]+)/', pathNot: TEST },
  to: { path: '^features/[^/]+/', pathNot: ['^features/$1/', '^features/[^/]+/index\\.tsx?$'] },
},
```

**Baseline 20/10: 40.** As 35 de `crm`/`accounting` → `dashboard` mostram que `features/dashboard` virou kit compartilhado. O que importam:
- `dynamic-tables.client.ts`: 11 arestas, fan-in total de 95. Tipos de DynamicTable mais um wrapper sobre `lib/services/dynamic-table.service`.
- `StandardPagination`: 8.
- `formatters.ts`: 3.
- `ChartRenderer`, `DashboardKpiCard`, `analytics.types`, `RelationSelector`, `relation-utils.client`: 2 cada.
- `GenericTable`, `GenericTabbedView`, `FloatingActionButton`: 1 cada.

Separar o kit é o fork F-MB-7. **Custo declarado:** `GenericTable`, `StandardPagination` e `formatters.ts` são canônicos do Contrato §0 com caminho escrito (linhas 17, 18, 26). Mover exige atualizar §0, `docs/claude-skills/GENERATION_CONTRACTS.md` e as golden refs das skills no mesmo PR, com `skill-audit` 0 findings.

## 4. Ordem de pagamento

| Passo | O quê | Efeito medido | Tamanho |
|---|---|---|---|
| **P0** | Repontar `BindingScope`/`bindingScopeWhere` para `accountingBinding/scope/BindingScope.ts` (13 arquivos de `sectorKits`, 2 policies de `accountingBinding`, 3 jobs) e tirar o reexport do `IAccountingBindingRepository.ts` | M1a 45 → **32**; L5 5 → **1**; J1 16 → **14** | mecânico, só path de import |
| **P1** | Restante das 15 L3–L6 do baseline (abaixo) | L3 2→0, L4 4→0, L5 1→0, L6 4→0 | pequeno, um PR por item |
| **P2** | Ligar M1a, J1 e U8 com baseline. Mover `JobWatermarkRepository` para `jobs/repositories/`. Jobs passam por `lib/factory` | barra crescimento já; J1 14 → 0 em PRs pequenos | pequeno |
| **P3** | M1a restante (32): porta de leitura do motor para as 7 do `IDynamicTableRepository` (F-MB-9), depois `IUserRepository` (4), `IFiscalProfileRepository` (3), `IVectorRepository` (3), resto | M1a 32 → 0 | médio; toca CRM/vendas, com teste de guarda de posse por chamador |
| **P4** | M2: mover pastas (§2) e ligar M2 + D1 **no mesmo PR da mudança**. Ligar antes trava todo preset novo em `presets/` enquanto os 50 de hoje ainda moram lá | M2 823 → 0 | grande diff de renome; janela sem PR paralelo nas pastas tocadas (`dynamicTables/presets` é choke point) |
| **P5** | FE: widgets para `features/*/widgets/` (U3+U8), depois o kit do dashboard (F-MB-7) | U3 18 → 0, U8 → 0/1, U9 40 → ≤5 | médio; frontend é dívida planejada (memória `frontend-deferred-strategy`), então vai para o fim |
| **P6** | M1 completo: `index.ts` por feature (sem efeito colateral; o registro do `analytics/index.ts` sai para o bootstrap) e ligar M1 com baseline | M1 264 (ou 180) → 0 ao longo do tempo | o maior; só depois de P3/P4, que já tiram 45 + boa parte das 22 de `presets` |

**Pagamento das 15 violações L3–L6 que já estão no baseline (P0 + P1):**

| Regra | Aresta | Pagamento |
|---|---|---|
| L5 ×4 | `AccountingBindingPolicy`, `IAccountingBindingPolicy`, `SectorKitPolicy`, `ISectorKitPolicy` → `IAccountingBindingRepository` | **só o tipo `BindingScope`** (verificado, linha 1 de cada). P0 resolve |
| L5 ×1 | `StructuredDataPolicy` → `IDocumentRepository` | acesso a dado real (`findById`, `:18`). O service carrega o documento e passa o fato para a policy, que nunca recebe interface de repositório |
| L6 ×2 | `accounting/models/{issLimite,lc116ListaNacional}.ts` → `legalParameters/services/legalParameterCache` (`linhasEmCacheSincrono`) | o model recebe as linhas do parâmetro legal por argumento; quem chama (service) lê o cache |
| L6 ×2 | `accounting/models/outstandingLines.ts` → `IPayableRepository`, `IReceivableRepository` | a função recebe as linhas já carregadas (ou o tipo da linha, em `models/`), sem a interface |
| L4 ×2 | `{I,}AccountantAssignmentRepository` → `policies/IAccountingPolicy` (`ActiveAccountant`) | `ActiveAccountant` → `accounting/models/` |
| L4 ×2 | `{I,}KnowledgeGraphRepository` → `services/KnowledgeGraphService` (`KnowledgeGraphData`) | `KnowledgeGraphData` → `chat/models/` |
| L3 ×2 | `ChatService`, `ReportService` → `lib/prisma` (`prisma.document.findMany`) | já está no debt-ledger do ESLint ("migrar para DocumentRepository"): método de leitura no `DocumentRepository`, e a supressão sai junto |

## 5. Por que isto não é bancada nova (regra ⛔ do CLAUDE.md raiz)

Isto **estende o `check:arch`**, a exceção ratificada em 13/10 (`ADR-ARCH-BOUNDARIES.md` §4): regra de import lida estaticamente, como o `tsc`, no mesmo binário, na mesma config, no mesmo baseline e no mesmo passo de CI. Não cria gate novo, rodada, revisor nem relatório de auditoria. As medidas daqui saem do mesmo `depcruise` que o CI já roda. O que **não** proponho: hook de edição novo (o §7 do ARCH-BOUNDARIES segue como está, não ligado), gate de knip/jscpd bloqueante, nem qualquer checagem que dependa de agente.

## 6. Colisões conferidas

| Documento | Risco | Conclusão |
|---|---|---|
| `ADR-DOMAIN-MOTOR-rejected.md` | o nome `domain/` lembrar o "motor de domínio" rejeitado; `ports/`/`adapters/` lembrarem o `PluginRegistry` | **Sem colisão de substância.** `domain/` é pasta de função pura, sem engine, registry ou ciclo de vida. O ADR rejeitado proíbe um segundo `RulePlugin` e um orquestrador, e nada aqui cria isso. O nome é fork (F-MB-4) justamente para evitar a leitura errada. A regra `atomicUntil` não muda |
| `ADR-PERSISTENCE-BOUNDARY` | M1a/F-MB-9 mexem em como consumidores leem DynamicTable | **Alinhado.** A porta de leitura põe a guarda de posse no motor (o §3 do ADR já cobra do motor garantias G1–G5) e a integração continua acima do motor. Nada injeta serviço Prisma no motor (B1/B7 intactos): a direção é consumidor → motor, nunca o contrário |
| `_REUSE-CRITERION.md` | mover canônicos do §0 (F-MB-7) poderia criar uma segunda cópia | **Sem colisão** se for **mover**, não copiar: um canônico continua um só. O `BindingScope` duplicado de `AccountingScope` é divergência de posse já sancionada (`BindingScope.ts:2-10`), e este ADR mantém |
| Contrato §2.1 / CLAUDE.md "PARE" | F-MB-3 opção (b) mexe no `RuleContext` do motor | Registrado no fork. A recomendação é (a), que não toca o motor |

## 7. Forks — RATIFICAÇÃO PENDENTE (dono)

| Fork | Caminhos | Recomendação |
|---|---|---|
| **F-MB-1** forma da API pública | (a) `features/<x>/index.ts` barrel com exports nomeados, sem `export *` e sem efeito colateral; (b) pasta `public/` com arquivos explícitos | **(a)**: é o que o `analytics` já tenta, e (b) é mais uma pasta. Condição: o `index.ts` não importa por efeito colateral (o registro de processadores sai para o bootstrap) e não reexporta repositório |
| **F-MB-2** `models/`/`dtos/` precisam passar pelo index? | (a) sim, tudo via index (264); (b) liberados como folhas (180) | **(b)**: L6 já garante que são folhas, e forçar via index gera churn sem ganho de encapsulamento |
| **F-MB-3** `dynamicTables/rules` | (a) pasta nomeada do motor: `rules/` entra no `LAYER_DIR` do M2 como exceção, fora do D1; (b) tirar `repository` do `RuleContext` e mover para `domain/` | **(a)**: (b) muda o contrato do plugin do motor, frente própria fora deste ADR |
| **F-MB-4** nomes das pastas novas | (a) `domain/` + `ports/` + `adapters/`; (b) `logic/` no lugar de `domain/`, contra a leitura "motor de domínio"; (c) adapters em `services/` | **(a)**, com o comentário do D1 dizendo "função pura, não engine". (b) é aceitável se o dono quiser zero ambiguidade |
| **F-MB-5** `fixtures/` usados em produção | (a) dado de kit/binding → `domain/` depois de `computeCompiledFromHash` virar função pura; (b) renomear para `catalog/` e incluir no `LAYER_DIR`; (c) manter `fixtures/` como exceção | **(a)**: é dado de domínio do kit, e o nome `fixtures/` engana X2 e leitor |
| **F-MB-6** exceções do J1 | (a) nomear as 3 CLIs de migração única + `jobs/repositories/`; `app.ts`/`server.ts` = composition roots fora do J1; (b) sem exceção: as 3 CLIs vão por service; (c) apagar as CLIs já executadas | **(a)**; (c) para cada CLI cujo runbook já foi assinado (conferir antes, insumo ausente) |
| **F-MB-7** kit do `features/dashboard` (FE) | (a) UI genérica → `components/`, contrato de dado (`dynamic-tables.client.ts`, `relation-utils.client.ts`) → `lib/`, §0 + skills no mesmo PR; (b) declarar `features/dashboard/index.ts` como kit público e aceitar as 35 | **(a)**, por último (P5); (b) congela o "dashboard virou kit" |
| **F-MB-8** quando ligar | (a) tudo com baseline já na ratificação; (b) por fase: M1a/J1/U8 na ratificação, M2+D1 no PR da mudança, M1/U9 quando houver index | **(b)**: M2 ligado antes da mudança barra preset novo em `presets/`, e M1 sem index barra todo import novo de `models/` |
| **F-MB-9** porta de leitura do motor para M1a | (a) `DynamicTableReader` exposto pelo index de `dynamicTables`, com a guarda de posse (tabela do usuário + linha dentro da tabela); (b) manter a injeção de `IDynamicTableRepository` como "variante de orquestração" sancionada | **(a)**: tira 7 cópias da guarda de tenant. Condição: confirmar antes que nenhuma das 7 leituras roda dentro de `tx` (insumo ausente) |
| **F-MB-10** `Navbar → user.service` (U8) | (a) exceção nomeada (casca do app lê o usuário da sessão); (b) `Navbar` vai para `features/` | **(a)**: não é dado de negócio |

## 8. Checklist (só depois da ratificação; cada item testável sozinho)

1. P0 repontado: `npm run check:arch:baseline` encolhe 4 L5. Com a config proposta, M1a 45 → 32 e J1 16 → 14. Diff só de import.
2. Cada pagamento P1 tira a aresta exata do `.dependency-cruiser-known-violations.json` (o arquivo só encolhe).
3. Cada regra ligada tem prova de que morde (`ADR-ARCH-BOUNDARIES.md` §3): um plantio por regra dá exit ≠ 0, e sem o plantio exit 0. Plantios:
   - M1a: service de `crm` importando `features/accounting/repositories/IPayableRepository`.
   - M1: service importando `features/fx/services/…`.
   - J1: job novo importando `lib/prisma`.
   - D1: `domain/` importando service.
   - U8: componente importando `lib/services/x`.
   - U9: feature importando `features/dashboard/shared/...`.
4. Emenda datada aqui com baseline antes/depois de cada regra ligada.
5. Mudanças de caminho que outra regra cita (I6 → `accounting/scope/resolveAccountingScopeInternal.ts`; F1 não muda) vão no mesmo PR.
6. P4/P5 (renome): `tsc` limpo nos dois pacotes, `npm run test:types` no my-app, jest da feature, snapshot de DTO sem churn (memória `dto-snapshot-update-reordena-no-windows`).
7. F-MB-7 (a): §0 do Contrato, `GENERATION_CONTRACTS.md` e golden refs atualizados, e `node .claude/skills/skill-audit/skill-audit.mjs run` com 0 findings.

## 9. Pendências, insumos ausentes, achados fora de escopo

**Pendente de validação externa:** nenhuma. Nada aqui depende de regra contábil, fiscal ou legal. Em issLimite/lc116 só muda **por onde** o parâmetro legal chega, não o valor.

**Insumos ausentes (não varri):**
- Se alguma das 7 leituras via `IDynamicTableRepository` roda dentro de `tx` (F-MB-9).
- Quais CLIs de `jobs/` já foram executadas e têm runbook assinado (F-MB-6 c).
- Se o resto de `components/widgets/dashboard-grid/` (8 módulos além do registro) importa domínio.
- Os 12 módulos fora de camada sem importador em produção (knip).

**Achados fora de escopo:**
- `U5-no-backend-import` usa a regex `(^|/)server/`, que casa com `next/dist/server/` quando `next` resolve fora de `my-app/node_modules` (24 falsos neste worktree). Não investiguei se o mesmo acontece em CI. Se acontecer, precisa de âncora (`^\.\./server/|^server/`).
- O X3 (16 ciclos) não é tratado aqui.
