# Feature: Onboarding (provisionamento do sistema do usuário)

`SystemProvisioningService` monta o sistema de um usuário: instala o preset, cria a 1ª linha de `units` e — com regime
conhecido — o perfil fiscal da empresa do ano corrente. Serve **dois chamadores**: `POST /dashboard/create` (modos Rápido e
Controle Total) e o seed contábil (`db:seed:accounting`). Spec: `docs/accounting/BE-INCR-SEED-UNIDADE-E-ENV-brief.md`
(nó SEED-UNITS; F-S1 → a1, F-P1..F-P7).

Variante **capability feature** (como `reports`/`sales`): não tem tabela própria; orquestra serviços de outras features. Mora
em feature própria porque chama o `CompanyFiscalProfileService` — e `dynamicTables` não pode importar `accounting`
(`no-accounting-imports.boundary.test.ts`; Contrato §2.1: integração cross-módulo é nível de serviço de integração, nunca
dentro do motor).

## Model

Nenhum. Escreve (via serviços/repositórios donos): tabelas dinâmicas do usuário, a 1ª linha de `units`, o perfil fiscal da
empresa; apaga (compensação/reset) tabelas dinâmicas, `KnowledgeGraph` e `ActionProposal`.

## Layering & authorization

```
onboarding/
├── policies/
│   ├── ISystemProvisioningPolicy.ts   # canProvision(ctx, existingTableCount)
│   └── SystemProvisioningPolicy.ts    # setup é one-shot: só com 0 tabelas dinâmicas
├── services/
│   ├── SystemProvisioningService.ts   # assertCanProvision · provision · purgeUserSystem
│   └── buildQuickPreset.ts            # função pura: suíte → módulos → mescla Core+módulos+suíte → overrides → analytics
└── README.md
```

- **Tier-0:** tudo é escopado ao `ctx.userId`; a purga pelos donos canônicos das tabelas
  (`IActionProposalRepository.deleteByUserId`, `IKnowledgeGraphRepository.deleteByUserId`, em `features/chat`) +
  `DynamicTableService.deleteAllTablesForUser`.
- **Policy:** `canProvision` é a guarda one-shot (o 403 "Setup já foi concluído"). O controller mapeia `ForbiddenError` para o
  corpo de sempre (`{ success:false, error:'Forbidden', message }`).
- **DI:** `ApplicationFactory.getSystemProvisioningService()`; dependências por interface (`Pick<DynamicTableService, …>`,
  `Pick<CompanyFiscalProfileService, 'upsert'>`, os 2 repositórios, a policy).

## API

Sem rota própria. Consumidores: `dashboardController.createDashboard` (`POST /api/dashboard/create`),
`dashboardController.deleteUserSystem` (`DELETE /api/dashboard/system`, via `purgeUserSystem`) e `seedAccountingFixtureCli`.

| Método | Ação |
|---|---|
| `assertCanProvision(ctx)` | Só a guarda one-shot. O controller a chama **antes** de montar o preset (o 403 vence qualquer 404/400 de montagem, como antes). |
| `provision(ctx, { preset, unit, fiscal })` | (i) guarda → (ii) `installPresetAsSystem` → (iii) 1ª linha de `units` pelo `createTableData` (plugins rodam) → (iv) perfil fiscal da empresa se `fiscal.regime ∉ {NAO_SEI, ausente}`. Devolve `{ installResult, unitId, fiscal }`. |
| `purgeUserSystem(userId)` | Tabelas + KnowledgeGraph + ActionProposals. Compensação do onboarding **e** "Resetar sistema" (o nó I7 separa as duas intenções depois). |
| `buildQuickPreset(suiteKey, modules, selectOverrides?)` | `{ preset, installedModules }`; `UnknownSuiteError` (404) / `InvalidAnalyticsConfigError` (400) / erros de módulo e de override. |

## Invariants

- **atomicUntil:** cada passo é um commit próprio (preset; unidade + plugins; perfil fiscal). Sem "mesma tx". Falha em (iii) ou
  (iv) ⇒ `purgeUserSystem` ⇒ `OnboardingRolledBackError` (500 `ONBOARDING_ROLLED_BACK`); se a purga falha,
  `OnboardingRollbackFailedError` (500 `ONBOARDING_ROLLBACK_FAILED`). Um novo create depois da compensação **não** recebe 403.
- A 1ª unidade nasce pelo caminho de escrita **normal** (F-I1-1 → b): os plugins de `units` (funil de CRM, estoque por unidade)
  só rodam assim.
- Janela residual conhecida e NÃO tratada (BRIEF do I1): entre a instalação e a compensação, um 2º create concorrente do mesmo
  usuário vê o 403.
- O serviço não escreve `res`; o mapeamento para status/corpos HTTP é do controller.
- O `FiscalProfile` da **unidade** não é criado aqui (lacuna L-PR3-1 do X13: o F-X6-6 proíbe inventar `icmsContribuinte`/`pisCofinsRegime`).

## Interaction with other features

- `dynamicTables`: `getTablesForUser`, `installPresetAsSystem`, `createTableData`, `deleteAllTablesForUser`; presets e módulos.
- `accounting`: `CompanyFiscalProfileService.upsert` (policy + auditoria + gates dele), `resolverObrigacoes`, `AccountingScope`.
- `chat`: repositórios dos donos de `ActionProposal` e `KnowledgeGraph`.
- Seed contábil (`src/jobs/seedAccountingFixtureCli.ts`): tenant sem tabelas ⇒ `provision` com o salão inteiro
  (`buildQuickPreset('beautySalon', [])`) e o `unitId` GERADO; tenant com tabelas ⇒ reaproveita a unidade de mesmo nome ou recusa.
