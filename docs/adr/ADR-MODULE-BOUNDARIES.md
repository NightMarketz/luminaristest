# ADR-MODULE-BOUNDARIES — Fronteira entre features, peça fora de camada e job como entrypoint (extensão do `check:arch`)

- **Data:** 2026-10-20
- **Status:** **Accepted 2026-11-24** (dono, questionário; forks F-MB-1..12 ratificados — §10 e `docs/plano/decisoes/D-2026-11-24-MODULE-BOUNDARIES-FORKS.md`). **Não é "executa":** nada ligado, nada movido; ligar regra e mover pasta pedem BRIEF e "executa". Texto de 20/10: nada ligado. Nenhuma regra entrou no `.dependency-cruiser.cjs`, nenhum arquivo foi movido. Ligar qualquer regra daqui exige ratificação do dono (forks §7) e é emenda datada a este ADR (`ADR-ARCH-BOUNDARIES.md` §5).
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

## 7. Forks — RATIFICADOS em 24/11/2026 (decisões no §10; a tabela abaixo é a proposta de 20/10)

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

## 10. Emenda de 24/11/2026 — ratificação dos forks (dono, questionário)

Registro com as respostas literais: `docs/plano/decisoes/D-2026-11-24-MODULE-BOUNDARIES-FORKS.md`. Esta emenda **não
liga regra nem move arquivo**: o que segue é o que o BRIEF de execução tem de cumprir. Onde a decisão diverge do texto
dos §2–§4, vale esta seção.

> `F-MB-1..6` também nomeia os forks de `D-2026-10-31-MODULOS-BASE-SUBMODULOS` (outro assunto). Fora deste ADR, cite
> estes como "F-MB-n do ADR-MODULE-BOUNDARIES".

### 10.1 Decisões

| Fork | Decisão | Efeito sobre o texto de 20/10 |
|---|---|---|
| F-MB-1 | **(b)** pasta `features/<x>/public/` | M1 e U9 trocam o alvo permitido de `index\.ts` para `/public/`. Em todo o ADR, "pelo index" passa a ler "pela pasta `public/`". As condições seguem: sem efeito colateral, sem reexportar repositório; o registro de processadores do `analytics/index.ts` sai para o bootstrap |
| F-MB-2 | **(a)** `models/` e `dtos/` também pela API pública | M1 não ganha o `pathNot` de `(models\|dtos)`. Baseline de 20/10: 264 |
| F-MB-3 | **(c), opção nova** — porta estreita de dados | Ver §10.2. `rules/` entra no `LAYER_DIR` como pasta do motor e fica fora da D1 (como na opção a); o contrato do plugin encolhe |
| F-MB-4 | **(a)** `domain/` + `ports/` + `adapters/` | Como proposto; o comentário da D1 diz "função pura, não engine" |
| F-MB-5 | **(a)** `fixtures/` de produção → `domain/` | `computeCompiledFromHash` vira função pura antes |
| F-MB-6 | **(a)** 3 CLIs de migração única + `jobs/repositories/` isentas por nome; `app.ts`/`server.ts` = composition roots | Como proposto. O `$executeRaw` do `rekeyLegacyUnitCli.ts:412` foi lido em 24/11: `UPDATE` de `unitId` em tx, com conferência de contagem e rollback |
| F-MB-7 | **(a)** separar o kit do `features/dashboard` | Como proposto, com §0 do Contrato e skills no mesmo PR |
| F-MB-8 | **(a)** tudo ligado já, com baseline | Troca a ordem do §4 — ver §10.3 |
| F-MB-9 | **(a)** `DynamicTableReader` na API pública do motor | Insumo fechado em 24/11: nenhuma das chamadas dos 7 serviços passa `tx` (lido pelos argumentos das chamadas, não por execução). São 10 pontos de guarda copiada em `CrmPipelineService` (5), `RegisterPaymentService` (1), `SalesCancellationService` (1) e `PackageAcceptanceService` (3) |
| F-MB-10 | **(b)** `Navbar` vai para uma feature | U8 fica sem exceção nomeada; baseline U8 3 → 0 depois da mudança |
| F-MB-11 (novo) | **(a)** posse de model no ESLint do server | Ver §10.4 |
| F-MB-12 (novo) | **(a)** o PR que liga a M2 move as pastas | Ver §10.3 |

### 10.2 F-MB-3 (c) — `RuleDataAccess`

Medida de 24/11 (leitura de `dynamicTables/rules/**`): os 10 plugins usam **8 dos 31 métodos** do
`IDynamicTableRepository`, para **ler e gravar** outras tabelas (reserva de estoque, comissão, agendamento, métricas
do cliente) com o repositório preso à transação da linha (`DynamicTableService.ts:603-620`, `:809-823`, `:929-943`).
O efeito no mesmo commit é o que o motor entrega, e a decisão o preserva.

```ts
// rules/RuleTypes.ts — hoje: repository: IDynamicTableRepository
interface RuleDataAccess {
  findDataById; findRowsByFieldValue; findDataByTableId;
  findTableByInternalName; findTablesByUserId;
  createData; updateData; deleteData;
}
interface RuleContext { /* … */ data: RuleDataAccess; }
```

- Mudança só de tipo: o `txRepo` que o serviço já passa satisfaz a porta. Comportamento igual, provado pelos testes
  dos plugins sem alteração de asserção.
- O plugin deixa de alcançar `createTable`, `deleteTable`, `deleteTablesByUserId`, `deleteAllDataByUserId` e
  `withTransaction`.
- Funções puras dos plugins (`discountGuard`, cálculos) vão para `domain/` e entram na D1.
- Não é o caso "PARE" do `CLAUDE.md` raiz: nenhum serviço Prisma entra no `RuleContext`.
- **Fica aberto (declarado ao dono na pergunta):** o plugin grava em outra tabela sem passar pela validação dela, e a
  lógica de venda/CRM mora dentro de `features/dynamicTables`. A opção "plugin puro que devolve efeitos" fecha os dois,
  pede PRE-ADR próprio e entra **depois** desta, não no lugar.

### 10.3 Ordem de pagamento com F-MB-8 (a) e F-MB-12 (a)

1. **P0 e P1** como no §4 (repontar `BindingScope`; pagar as 15 L3–L6).
2. **Ligação única:** M1a, M1, J1, D1, U8 e U9 entram com baseline no mesmo PR. Com a M1 ligada e nenhuma `public/`
   existente, todo import novo entre features cria o arquivo em `public/` da feature alvo no mesmo PR.
3. **M2 liga no PR que move as pastas** (o P4 do §4), e esse PR sobe para logo depois da ligação: não há período com
   duas pastas. `dynamicTables/presets` é choke point com PRs abertos (BUILDER-VERTICAIS PR-5/PR-6): o BRIEF marca a
   janela sem PR paralelo e a ordem de rebase.
4. **P3** (M1a 32 → 0, com o `DynamicTableReader`), **F-MB-3 (c)**, **F-MB-11** e **P5** (frontend) seguem, um PR por
   item.

Os baselines deste ADR são de 20/10 (`310a92b4`). O BRIEF mede de novo antes de gravar qualquer baseline.

### 10.4 F-MB-11 (a) — posse de model do Prisma

A M1a barra import; não barra `prisma.<model>.update(...)` de um model alheio, que não importa nada da feature dona.
Medida de 24/11 (regex sobre `server/src`, 146 models, 138 com escrita em produção): **nenhum repositório grava model
de outra feature**. Escritas fora da dona: `DynamicTableService.ts:501` → `user.updateMany` (exceção nominal já
comentada no código, onboarding na tx do install) e jobs/`server.ts` (`PurgeDeletedRecords`, as CLIs do F-MB-6,
`server.ts` → `document`), que a J1 trata.

- Mapa versionado `model → feature dona` (um arquivo, 146 linhas; model compartilhado declara o núcleo dono).
- Regra no ESLint do server, no job de lint que já roda: `create`, `createMany`, `update`, `updateMany`, `upsert`,
  `delete`, `deleteMany` e `$executeRaw*` de um model só dentro de `repositories/` da dona. Baseline = as exceções
  acima, nomeadas.
- **Exceção nova à regra ⛔ do `CLAUDE.md` raiz**, no molde do `no-console` (dono, 23/10): o dependency-cruiser não
  enxerga chamada do Prisma. A linha entra no `CLAUDE.md` raiz no PR que ligar a regra, citando esta data.
- Limite da medida: regex, não AST. A regra de lint é a medida definitiva; se ela achar mais que o baseline acima,
  o achado vai à caixa antes de qualquer supressão.

## 11. Emenda de 24/11/2026 — ligação das regras (PR-2 do BRIEF de execução)

Autorização: dono, chat, 24/11/2026: "Executa o BRIEF inteiro". Esta emenda registra o que o §8 item 4 pede: o baseline
antes/depois de cada regra ligada e a prova de que cada uma morde. As regras valem na branch
`integration/module-boundaries-be`; a `main` as recebe no fechamento, com baseline medido de novo.

### 11.1 O que entrou, e onde o texto dos §2–§3 muda

| Regra | Como entrou | Diferença para o texto de 20/10 |
|---|---|---|
| `M1a-no-foreign-repository` | como no §2 | — |
| `M1-cross-feature-via-public` | alvo permitido = `features/<x>/public/` | o §2 dizia "pelo `index.ts`" (F-MB-1 b) |
| `M3-public-no-repository` | `public/` não importa `repositories/` | regra nova, que este ADR não tinha (F-MBE-3 a) |
| `D2-domain-is-pure` | como a "D1" do §2 | o nome muda: `D1` já é `D1-dp-core-not-optional` desde 03/11 (F-MBE-4 a). Onde o §2, o §8 e o §10 dizem "D1" para a pureza de `domain/`, leia `D2` |
| `J1-job-is-entrypoint` | como no §2, com as isenções do F-MB-6 (a) | — |
| `L5`, `L6` (alteradas) | o `to` ganha `PUBLIC_EXEC`: arquivo de `public/` que não é `*.types.ts` | ajuste novo (F-MBE-3 a). O esboço do BRIEF chamava a constante de `FOREIGN_PUBLIC_EXEC`; ela não distingue a feature de origem, então ficou `PUBLIC_EXEC` |
| `U8-components-no-domain-service` | como no §3, sem exceção nomeada (F-MB-10 b) | — |
| `U9-cross-feature-via-public` | alvo permitido = `features/<x>/public/` | o §3 dizia "pelo `index`" |
| `M2` | **não entrou** | liga por feature, no PR que move as pastas (F-MB-12 a, F-MBE-2 c) |

### 11.2 Baseline antes/depois por regra

| Regra | Medida do BRIEF (`main` `d3f3a201c`, 24/11) | Gravado no PR-2 (depois do PR-0, PR-1a e PR-1b) |
|---|---|---|
| `M1` | 393 | **378** |
| `M1a` | 49 | **36** |
| `J1` | 18 | **16** |
| `M3` | — (regra nova) | **0** (não entra no arquivo) |
| `D2` | 0 | **0** (não entra no arquivo) |
| `L5` | 4 | **0** |
| `L6` | 4 | **0** |
| `U8` | 11 | **11** |
| `U9` | 45 | **45** |

A `M1` caiu 13 no PR-0 (os imports de `BindingScope` passaram a `public/`) e mais 2 no PR-1a/PR-1b; o BRIEF previa 380
depois do PR-0. Arquivo de baseline: server 11 → 441 entradas, my-app 23 → 79, só acréscimo. As contagens por regra da
config versionada são iguais às da config temporária da sessão de planejamento rodada na mesma árvore
(`M1` 378, `M1a` 36, `J1` 16, `X3` 11; `U8` 11, `U9` 45).

### 11.3 Prova de que cada regra morde (saída literal de `npm run check:arch`, 24/11)

Cada plantio é um arquivo de sonda criado, o gate rodado e o arquivo removido. Com o plantio: exit ≠ 0 e a linha
`error` abaixo. Com a contraprova: `✔ no dependency violations found` e exit 0. Baseline ignorado em todas as rodadas:
441 (server) e 79 (my-app).

| Regra | Plantio | Saída | Exit |
|---|---|---|---|
| `M1a` | `crm/services/__sondaM1a.ts` importa `accounting/repositories/IPayableRepository` | `error M1a-no-foreign-repository: src/features/crm/services/__sondaM1a.ts → src/features/accounting/repositories/IPayableRepository.ts` (e a mesma aresta em `M1-cross-feature-via-public`) | 2 |
| `M1` | `crm/services/__sondaM1.ts` importa `fx/services/PtaxSyncService` | `error M1-cross-feature-via-public: src/features/crm/services/__sondaM1.ts → src/features/fx/services/PtaxSyncService.ts` | 1 |
| `D2` | `analytics/domain/__sondaD2.ts` importa `analytics/services/AnalyticsService` | `error D2-domain-is-pure: src/features/analytics/domain/__sondaD2.ts → src/features/analytics/services/AnalyticsService.ts` | 1 |
| `J1` | `jobs/__sondaJ1.ts` importa `lib/prisma` | `error J1-job-is-entrypoint: src/jobs/__sondaJ1.ts → src/lib/prisma.ts` | 1 |
| `M3` | `fx/public/__sondaM3.ts` com `export * from '../repositories/IPtaxRateRepository'` | `error M3-public-no-repository: src/features/fx/public/__sondaM3.ts → src/features/fx/repositories/IPtaxRateRepository.ts` | 1 |
| `L5` | `sectorKits/policies/__sondaL5.ts` importa `accountingBinding/public/bindingScope` | `error L5-policy-is-pure: src/features/sectorKits/policies/__sondaL5.ts → src/features/accountingBinding/public/bindingScope.ts` | 1 |
| `L5` (própria feature) | `accountingBinding/policies/__sondaL5.ts` importa `../public/bindingScope` | `error L5-policy-is-pure: src/features/accountingBinding/policies/__sondaL5.ts → src/features/accountingBinding/public/bindingScope.ts` | 1 |
| `L6` | `sectorKits/models/__sondaL6.ts` importa `accountingBinding/public/bindingScope` | `error L6-model-dto-are-leaves: src/features/sectorKits/models/__sondaL6.ts → src/features/accountingBinding/public/bindingScope.ts` | 1 |
| `U8` | `components/__sondaU8.tsx` importa `lib/services/user.service` | `error U8-components-no-domain-service: components/__sondaU8.tsx → lib/services/user.service.ts` | 1 |
| `U9` | `features/crm/__sondaU9.ts` importa `features/dashboard/shared/utils/formatters` | `error U9-cross-feature-via-public: features/crm/__sondaU9.ts → features/dashboard/shared/utils/formatters.ts` | 1 |

| Regra | Contraprova | Exit |
|---|---|---|
| `M1a` | o mesmo import a partir de `accounting/services/__sondaM1a.ts` (mesma feature) | 0 |
| `M1` | `fx/public/__sonda.ts` plantado e importado por `crm/services/__sondaM1.ts` | 0 |
| `D2` | `analytics/domain/__sondaD2.ts` importa `analytics/core/models/ChartPreset` | 0 |
| `J1` | `jobs/__sondaJ1.ts` importa `lib/factory` | 0 |
| `M3` | `fx/public/__sondaM3.ts` com `export * from '../models/ptax'` | 0 |
| `L5` | `sectorKits/policies/__sondaL5.ts` importa `accountingBinding/public/bindingScope.types` | 0 |
| `L6` | `sectorKits/models/__sondaL6.ts` importa `accountingBinding/public/bindingScope.types` | 0 |
| `U8` | `components/__sondaU8.tsx` importa `lib/utils/nonEmpty` | 0 |
| `U9` | `features/dashboard/public/__sonda.ts` plantado e importado por `features/crm/__sondaU9.ts` | 0 |

Depois de cada caso o arquivo de sonda foi removido e o `git status` não mostrou sobra. A prova rodou no Windows, com
o `node_modules` pela junção do depósito; o resultado do CI (Linux) é o que vale para o my-app.

### 11.4 Declarado

- **`L5`/`L6` na própria feature:** o texto do F-MBE-3 (a) fala em "`public/` de outra feature". A regra gravada barra
  também a policy que importa o `public/` executável da própria feature (linha "própria feature" do §11.3), porque o
  `to` não enxerga a feature do `from`. Hoje a medida é 0 nos dois casos.
- **Lint de `public/`** (`export *` e import por efeito colateral, F-MBE-3 a): o BRIEF não atribuía a regra a nenhum
  PR (lacuna `L-20261124-193620-f833`). Dono, questionário, 24/11: "No PR-2". Entrou como R6 no
  `server/eslint.config.mjs` (`no-restricted-syntax` em `src/features/*/public/**`; spec em
  `docs/architecture/lint-layer-gate.md` §R6), no job de lint que já roda. Baseline 0. Prova (24/11):
  `fx/public/__sondaLint.ts` com `export * from '../models/ptax'` ⇒ `npx eslint` exit 1 (`R6 … export * em public/ de
  feature`); com `import '../models/ptax'` ⇒ exit 1 (`R6 … import por efeito colateral`); com
  `export type { PtaxRate } from '../models/ptax'` ⇒ exit 0; `npm run lint` inteiro ⇒ exit 0. O bloco de `public/`
  repete os seletores do `catch` silencioso (OBS-R8), que seguem valendo ali (plantio: exit 1). A linha de exceção no
  `CLAUDE.md` raiz não foi acrescentada: a decisão do F-MBE-3 não a pede, ao contrário do §10.4 para a regra de posse.
- **Skill `job-generator` × `J1`:** a skill mandava o job usar o Prisma direto e não usar o `getFactory()` (lacuna
  `L-20261124-193622-4901`). Dono, questionário, 24/11: "Regra agora". A regra `JOB-005`, o passo 3 do contrato de
  geração, os anti-padrões, o caso `happy-2` dos evals e o controle do `skill-audit` passam a mandar o job pelo
  `getFactory()`; Prisma direto fica só no seed de volume em `server/scripts/`. `jobs/PurgeDeletedRecords.ts` está
  marcado na skill como dívida do baseline da `J1` até o PR-7.x. O eval comportamental da skill não foi rodado de novo.
- **`IUser` e `Role` × `M1`:** as skills mandam service e policy importarem `IUser` e `Role` de
  `features/users/models/User.model` (`SVC-006`, `POL-008`, linha "Actor" do Contrato §2, `GENERATION_CONTRACTS.md`).
  Plantio de 24/11: `crm/services/__sondaIUser.ts` com esse import ⇒ `error M1-cross-feature-via-public`, exit 1. O
  baseline tem 17 arestas `M1` com esse destino. Dono, questionário, 24/11: "Tudo em user.types.ts":
  `users/public/user.types.ts` reexporta o tipo `IUser` e o enum `Role` de `models/`; `*.types.ts` passa a valer para
  tipo e enum/constante de `models/`, com regra nova que impede o arquivo de importar outra pasta. Vai em PR próprio na
  pilha, antes do PR-3.x, que reponta os imports existentes e as regras das skills. **Até lá as skills citadas seguem
  apontando `users/models/`** (lacuna `L-20261124-194301-a802`).
- **Contrato e skills:** o §2 do `_ARCHITECTURE-CONTRACT.md`, o `GENERATION_CONTRACTS.md` e as skills geradoras de
  service, repository, policy, dto, workflow, CRUD, fullstack e feature de frontend passam a dizer as duas regras
  (import entre features só por `public/`; peça de feature em pasta de camada).
