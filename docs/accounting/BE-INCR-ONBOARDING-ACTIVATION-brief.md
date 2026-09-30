# BRIEF — BE-INCR-ONBOARDING-ACTIVATION (nós I4 + I5): o onboarding liga a contabilidade; venda sem mapper vira pendência visível

> Produzido em `sessao-planejamento`, 2026-09-29, sobre `origin/main` `9dd690b3`. Nós [I4](../plano/nos/I4.md) e
> [I5](../plano/nos/I5.md) do [plano em grafo](ONBOARDING-WIZARD-plano-grafo-brief.md) (§ I4 e I5, linhas 185-221).
>
> **Forks ratificados (dono, 2026-09-29, *"Ratificar as recomendações"*, decisão 13 de
> `D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE`):** F-I4-1 → **(a)** · F-I4-2 → **(b)** · F-I4-3 → **(a)** ·
> F-I5-1 → **(a)** · F-I5-2 → **(b)**.
>
> **Forks novos, abertos por esta leitura (RATIFICAÇÃO PENDENTE):** F-I4-4 (recarga dos mappers depois da
> ativação), F-I4-5 (o wizard mostra o resultado contábil?), F-I5-3 (quando um miss é `NO_MAPPER_FOR_UNIT`),
> F-I5-4 (forma da tela). **Nenhum se auto-ratifica.** O F-I4-4 decide se o I4 cumpre o objetivo: sem ele, a
> unidade recém-ativada só lança depois de reiniciar o processo (§1, linha 5).
>
> **Autoriza planejar, não executar.** Código exige *"executa"* (ORCH-006).

## 0. Contexto fixo

- **Item:** o onboarding (Rápido, Controle Total, Entrevista) passa a ativar o binding contábil padrão do setor
  na mesma requisição. Hoje o wizard faz zero dos quatro degraus (achado int. 1). Venda de unidade sem mapper
  passa a ter um código próprio e aparece numa tela (achados int. 7-9). É a ponta da espinha N0 → I1 → I3 → **I4**,
  com **I5** de guarda.
- **Autorização:** dono, chat, 2026-09-29: *"Ratificar as recomendações"*, decisão 13 de
  [`D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md`](../plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md),
  com evidência no dossiê [`DOSSIE-DECISOES-2026-09-29.md`](DOSSIE-DECISOES-2026-09-29.md) §6 D-10. Os dois
  arquivos e o campo `autorizacao` das notas I4/I5 chegam pelo PR #440 (lidos em
  `origin/claude/docs-decisoes-2026-09-29`). O campo diz: *"forks … + PLANEJAR (sem 'executa')"*. **Cobre este
  BRIEF e nada além.** Duas divergências de forma, declaradas:
  1. O nome do arquivo segue o pedido do dono (`…-ACTIVATION-brief.md`), não o do plano (`…-ACTIVATE-brief.md`).
  2. O BRIEF é `BE-INCR`, mas inclui um PR de front (PR-3). O motivo é que o F-I5-2 (b), ratificado, **é** uma
     tela. Separar num `FE-INCR` exigiria um nó novo, e o pedido foi "cobrir I4 e I5".
- **Premissa que morreu:** o plano ainda fala em *"reconcile re-tenta a cada 5 min e segura o watermark"*.
  O #296 (`4ea2c4c9`) desfez isso. A marca avança sempre e toda falha vira linha em `reconcile_pending_items`.
  O I5 parte do estado da §1, não do plano.
- **Insumos lidos no código nesta sessão (V):**
  - `dashboardController.ts:310-315` (custom) e `:399-403` (quick): `installPresetAsSystem` → `createFirstUnitOrRollback`
    (`:122`) → `createCompanyFiscalProfileOrRollback` (`:164`). Os dois passos compensam com `purgeUserSystem`
    (`:106-110`) e respondem 500 `ONBOARDING_ROLLED_BACK`. **`purgeUserSystem` não limpa contabilidade**: só
    tabelas dinâmicas, KnowledgeGraph e ActionProposal.
  - `BindingActivationService.activateDefault` (`features/accountingBinding/services/BindingActivationService.ts:68-141`),
    I3 / #389 (`cf40ab68`): policy → setor do registry → `already-active` → pré-check sem escrita → flags → `compile()`.
    A policy `canActivateDefault` é `!!scope.actorUserId` (`AccountingBindingPolicy.ts:22-24`). A factory expõe o
    serviço por escopo (`lib/factory.ts:1205`).
  - `ActivateDefaultBindingDto.ts`: request `.strict()` com `installChartIfEmpty` e `openCurrentPeriodIfMissing`.
    O resultado `Active | already-active | Draft`, com `blocking[]` de `ActivationBlockingIssueSchema`.
  - `sectorBindingRegistry.ts:20-21`: `beautySalon` e `aestheticClinic`. As chaves de suíte em
    `presets/index.ts:21-30` são `beautySalon`, `aestheticClinic` e `crmModule`. No modo custom, o
    `presetKey` passa por `keyToPascalCase` (`PresetManager.ts:10-15`), então `beauty_salon` e `beautySalon`
    carregam o mesmo preset.
  - `AccountingSyncService.sync` (`features/accounting/sync/AccountingSyncService.ts:116-120`) faz o lookup
    `unitId:sourceType` e depois a chave global. Num miss, lança `ValidationError('Nenhum mapper registrado…')`.
    `ValidationError` fixa `errorCode = 'VALIDATION_ERROR'` (`lib/errors.ts:72`).
  - **O registro de mappers é montado só no boot:** `initializeAccountingSyncFromBindings()`
    (`lib/factory.ts:1264-1267`) é chamado apenas por `server.ts:37`. Nada o chama depois de uma ativação
    (grep em `server/src`; o F-FEEDER-5 fixou "leitura é boot único" em `BE-INCR-BINDING-FEEDER-brief.md:219-224`).
  - A skip-list é `SYNC_SKIP_ERROR_CODES` (`AccountingSyncPort.ts:91`). Quem a lê: as 4 pontes de venda (5 chamadas
    de `sync()`), `crmController.ts:140`, `PayableService`, `ReceivableService`, e o job via
    `classifyBlockedSyncError` (`accountingSyncReconcile.job.ts:192`). Um código na lista vira `blocked` e é
    gravado com `reportPending(skipCode as ReconcilePendingReasonCodeValue)`. **O cast não é checado**: um código
    que esteja na lista e falte no enum passa pelo tsc.
  - Enum `ReconcilePendingReasonCode` (`ReconcilePendingDto.ts:16-23`, 5 valores). Ele aparece em:
    `__dto-shapes__.json`, `my-app/types/contracts/accounting/ReconcilePendingDto.gen.ts`, `docs.paths.ts:4334`,
    `public/openapi.json` e o comentário de `schema.prisma:1742` (a coluna é `String`, sem migração).
  - Rota `GET /api/reconcile-pending` e `POST /api/reconcile-pending/rescan` (`routes/reconcilePending.ts`,
    `routes/index.ts:82`). O rescan (`ReconcilePendingService.ts:68-125`) re-dirige e **não reclassifica**
    (`bumpAttempts`). O upsert do job reescreve `reasonCode` quando revê o item (`ReconcilePendingRepository.ts:45-50`).
  - Front: nenhum consumidor de `/reconcile-pending` nem de `/accounting-binding` em `my-app`.
    `SetupService.createDashboard` devolve `void` (`my-app/lib/services/setup.service.ts:84`), e o hook da
    Entrevista só faz `router.push('/dashboard')` (`useAiInterview.ts:118`). **A resposta do create não é
    lida.** O molde de painel de lista de rota da contabilidade é o `BankSettlementPanel` (#436).
- **Nós vizinhos:** I1 (#374, `2c33303a`) dá o `unitId`. I3 (#389) dá o endpoint e as flags. I10 cobre o
  boot com zero `Active` (runbook humano). I7 é o reset, que não limpa contabilidade. I6 valida o `unitId`.
  Testes que este BRIEF estende: `dashboardCreate.firstUnit|fiscal.integration.test.ts`,
  `dashboardModules.integration.test.ts`, `AccountingSyncService.test.ts`, `accountingSyncReconcile.test.ts`,
  `reconcilePendingReasonCodes.guard.test.ts`, `SaleSalesAccountingBridge.test.ts`,
  `factory.initializeAccountingSyncFromBindings.integration.test.ts`, `activateDefault.integration.test.ts`.

## 1. Estado atual medido (de onde o BRIEF parte)

| # | Situação | Hoje (V, por leitura) |
|---|---|---|
| 1 | Onboarding de um salão | Cria tabelas, a unidade e o perfil fiscal. **Nenhum binding, plano de contas ou período.** |
| 2 | Venda finalizada numa unidade sem binding | `ValidationError` "Nenhum mapper" → a ponte faz `logger.error` → o job grava `FAILED` em `reconcile_pending_items`, com o texto no `reasonDetail`. A marca avança. |
| 3 | Operador vê a pendência | Só por `GET /api/reconcile-pending` direto. Não há tela. |
| 4 | Ativar pelo `POST /accounting-binding/activate-default` | O binding fica `Active` no banco… |
| 5 | …e a venda seguinte da mesma unidade | …**continua sem mapper até reiniciar o processo**, porque o registro é do boot (§0). Inferido por leitura; nenhum teste cobre. O teste do item 13 é o que falharia hoje. |

## 2. Checklist numerado de comportamentos

Ordem de execução: **PR-1 → PR-2**. O PR-3 pode rodar em paralelo ao PR-2 depois do PR-1, porque só depende do
enum. O PR-4 existe só se o F-I4-5 for (b). Cada item traz o teste que o prova. Sessão: `sessao-feature` sobre
este BRIEF, com o teste de cada item escrito e vermelho **antes** do código.

### PR-1 — I5 backend: classificar "sem mapper"

1. **Erro específico.** `NoMapperForUnitError extends AppError`, status 500, `errorCode 'NO_MAPPER_FOR_UNIT'`,
   em `lib/errors.ts`, ao lado de `NoActiveAccountingBindingsError`. A mensagem cita `unitId` e `sourceType`.
   Estende `AppError`, não `ValidationError`, porque `ValidationError` fixa o `errorCode` (`errors.ts:72`).
   *Teste:* `syncSkipErrorCode(new NoMapperForUnitError('u','sale.finalized')) === 'NO_MAPPER_FOR_UNIT'`.
2. **Quem lança.** `AccountingSyncService.sync` lança o erro novo no miss. O alcance depende do **F-I5-3**; a
   recomendação é (b): só quando a unidade não tem **nenhum** mapper registrado. Um miss numa unidade que tem
   binding continua `ValidationError` e cai em `FAILED`, porque é bug de cobertura e deve ser ruidoso.
   *Testes em `AccountingSyncService.test.ts`:*
   - o caso da `:265-282` ("unit-b sem registro") passa a esperar `NoMapperForUnitError`;
   - o caso novo "unit-a registrada, evento sem mapper" continua `ValidationError`;
   - o caso da `:152-159` (registro global, evento aposentado) continua `ValidationError`.
   Com F-I5-3 (a), os três passam a esperar o erro novo.
3. **Skip-list.** `SYNC_SKIP_ERROR_CODES` ganha `'NO_MAPPER_FOR_UNIT'`. O JSDoc (`AccountingSyncPort.ts:81-90`)
   ganha o bullet *"transitório por ação de admin: ativar o binding da unidade; depois recarga (F-I4-4) e rescan"*.
   *Teste-guarda novo:* todo valor de `SYNC_SKIP_ERROR_CODES` está em `ReconcilePendingReasonCode.options`.
   Ele fecha o cast não checado da §0 e vale para códigos futuros.
4. **Enum e contrato.** `ReconcilePendingReasonCode` ganha `'NO_MAPPER_FOR_UNIT'`, com comentário "transitório".
   Materializar na mesma mudança:
   - `UPDATE_DTO_SNAPSHOT=1` regenera `__dto-shapes__.json` e `ReconcilePendingDto.gen.ts`;
   - o enum de `docs.paths.ts:4334`;
   - `npm run docs:generate` regenera `public/openapi.json`;
   - o comentário de `schema.prisma:1742`, sem migração.
   *Gates:* `dtoShapeSnapshot` e `openapi-paths` verdes, e o path-count não muda.
5. **Pontes ao vivo.** Com o código na lista, as 4 pontes de venda registram `logger.warn` "skipped" em vez de
   `logger.error`, sem nenhuma outra mudança. *Teste (`SaleSalesAccountingBridge.test.ts`):* com o `sync`
   rejeitando `NoMapperForUnitError`, espera-se `warn` com `code:'NO_MAPPER_FOR_UNIT'` e `error` não chamado.
6. **Reconcile em lote (o teste-guarda do plano).** O passe de `sale.finalized` recebe o `sync` rejeitando
   `NoMapperForUnitError`. Esperado: `summary.blocked === 1`, `summary.failed === 0`, e `reportPending` com
   `reasonCode:'NO_MAPPER_FOR_UNIT'` e a mensagem no `reasonDetail`. *Teste em `accountingSyncReconcile.test.ts`.*
   A marca já avança desde o #296; o teste assere que `pendingWriteFailed` fica ausente.
7. **Borda HTTP.** `GET /api/reconcile-pending?unitId=<u>&reasonCode=NO_MAPPER_FOR_UNIT` → 200. O DTO de query
   aceita o valor novo, e antes do item 4 dá 400. *Teste de integração:* semear uma linha pendente com o código
   novo e listá-la.
8. **O que não muda (declarado):** linhas `FAILED` antigas com "Nenhum mapper" não são reclassificadas (sem
   migração de dado). Só mudam se o job rever o item dentro da janela. O rescan continua sem reclassificar.
   AP, AR e CRM postam por `postEntry`, sem mapper (V por leitura), então o código novo nunca aparece neles.

### PR-2 — I4 backend: o onboarding ativa

9. **Setor do preset (F-I4-3 a).** Uma função pura no `dashboardController` resolve o `sectorKey`:
   - modo quick: o `suiteKey`, se estiver em `SECTOR_BINDING_REGISTRY`;
   - modo custom: a chave da suíte cujo preset é o carregado por `getPresetByKey(presetKey)`. `beauty_salon` e
     `beautySalon` resolvem igual. A técnica é livre (identidade no `tablePresetSuites` ou normalização da string);
     o contrato está nos testes;
   - senão, `null`.
   *Teste:* `beautySalon`, `beauty_salon` e `aestheticClinic` resolvem para o setor; `crmModule` e `crm_module`
   dão `null`.
10. **Chamada e ordem (F-I4-1 a).** A ordem fica: instalar → unidade → perfil fiscal → **contabilidade**.
    A ativação vai por último porque as compensações anteriores (`purgeUserSystem`) não limpam contabilidade.
    Assim, nenhum passo que compensa roda depois de uma escrita contábil. A chamada é
    `getFactory().getAccountingBindingActivationService(scope).activateDefault(scope, { sectorKey,
    installChartIfEmpty: true, openCurrentPeriodIfMissing: true })`, com `scope = resolveBindingScope(ctx, unitId)`.
    As duas flags em `true` são a razão de existir do F-B2 (a) e do F-I3-1 (a): *"torna o onboarding uma chamada
    só"*. Fica fora da tx do schema, que já foi commitada.
    *Teste de integração (quick `beautySalon`):* 201 com `data.accounting = { status:'Active',
    sectorKey:'beautySalon', bindingVersion:1 }`. No banco: 1 binding `Active` para `(user, unitId)`, plano de
    contas com linhas, e o período do **mês UTC corrente** `OPEN` (mesmo relógio do `activateDefault`, ver
    `activateDefault.integration.test.ts:28`). Repetir com `aestheticClinic`. Se a clínica compilar `Draft` no
    plano canônico, **pare e reporte**: é achado de fixture, fora deste BRIEF.
11. **Falha não derruba o tenant (F-I4-2 b).**
    - `activateDefault` devolve `Draft` → 201 com `accounting:{ status:'Draft', sectorKey, bindingVersion?,
      blocking:[…] }`.
    - `activateDefault` **lança** → `logger.error` e 201 com `accounting:{ status:'Draft', sectorKey, blocking:[{
      code:'ACCOUNTING_ACTIVATION_FAILED', message }] }`.
    - Nos dois casos: nada de `purgeUserSystem`; tabelas, unidade e perfil fiscal ficam.
    *Testes:* serviço de ativação mockado devolvendo `Draft` e depois lançando. Espera-se 201, `GET /dynamic-tables`
    não vazio e nenhum `ONBOARDING_ROLLED_BACK`.
    **Assimetria registrada, como o dono ratificou:** falha na unidade ou no perfil fiscal → 500
    `ONBOARDING_ROLLED_BACK` com o sistema desfeito. Falha na contabilidade → 201 com o tenant de pé e a
    contabilidade em `Draft`. O motivo: *"a ativação contábil falhar não deve apagar o sistema do cliente"*
    (dossiê D-10). As vendas desse tenant vão para `NO_MAPPER_FOR_UNIT` (PR-1), e é isso que torna o `Draft`
    visível e não silencioso.
12. **Preset sem binding (F-I4-3 a).** `crmModule`, ou custom sem setor → `accounting:{ status:'not-applicable' }`.
    `activateDefault` não é chamado; nenhum binding, plano de contas ou período é gravado.
    *Teste (`dashboardModules.integration.test.ts` ou caso novo):* `prisma.accountingBinding.count({ where:{ userId } }) === 0`.
13. **Recarga dos mappers (F-I4-4, PENDENTE; o texto segue a recomendação (a)).** Depois de `status:'Active'`,
    o controller chama `getFactory().initializeAccountingSyncFromBindings()`. As chamadas são serializadas por
    uma cadeia de `Promise` no módulo do controller, para que duas ativações simultâneas não se atropelem na troca
    de referência. `ponytail:` o teto é um processo (T11); multi-processo exigiria outro sinal. Se a recarga
    falhar: `logger.error` e `accounting:{ status:'Draft', blocking:[{ code:'ACCOUNTING_SYNC_RELOAD_FAILED' }] }`.
    Para a unidade nova isso é inalcançável por construção: uma unidade virgem não colide.
    ***Teste de integração (a prova do nó):*** `POST /dashboard/create` (salão) → criar produto ou serviço →
    finalizar uma venda pelo caminho normal de escrita **sem reiniciar** → existe `JournalEntry` com
    `sourceType:'sale.finalized'` e `sourceId` igual à venda. **Hoje este teste falha** (§1, linha 5). Se o
    F-I4-4 for (b), o teste passa a asserir a pendência `NO_MAPPER_FOR_UNIT` e, depois de
    `initializeAccountingSyncFromBindings()` e do rescan, a resolução.
14. **Contrato de saída materializado.** Os dois ramos (quick e custom) validam `accounting` com
    `OnboardingAccountingResultSchema.parse()` antes de responder, no mesmo padrão do `activateDefaultBinding`.
    A descrição de `/api/dashboard/create` em `docs.paths.ts:658-669` ganha o parágrafo do bloco `accounting` e
    da assimetria; `npm run docs:generate`. Rota nova: nenhuma, então o path-count não muda.
15. **Auditoria:** nenhum `eventType` novo. A ativação audita pela cadeia `binding.*` do `compile()`, que já
    existe, e o `auditCanonical.ts` não muda. *Gate:* `auditAllowlistCoverage` continua verde, sem teste novo.
16. **Regressão:** as suítes `firstUnit`, `fiscal` e `modules` continuam verdes, porque o campo é aditivo.
    O caso de compensação do fiscal (`dashboardCreate.fiscal.integration.test.ts:82`) ganha a asserção
    `accountingBinding.count === 0` depois do 500, que prova que a ativação vem depois do fiscal.

### PR-3 — I5 frontend: a linha visível (F-I5-2 b)

17. **Serviço.** `my-app/lib/services/reconcilePending.service.ts` com `list(query)` e `rescan(body)`.
    Query e body usam `import type` de `ReconcilePendingDto.gen`. As respostas são tipadas à mão (padrão D11,
    como `bankSettlement.service.ts`). *Teste vitest do serviço:* URL, query e body.
18. **Tela (forma pelo F-I5-4, PENDENTE; o texto segue a recomendação (a)).** `ReconcilePendingPanel.tsx`
    numa aba nova `pendencias` do `AccountingView`. Colunas: origem (`sourceType`), id, motivo (rótulo i18n por
    código), detalhe, primeira e última vez vistas, tentativas.
    - Filtros: por motivo e "mostrar resolvidas" (`includeResolved`).
    - Paginação por `nextCursor` (keyset). O `StandardPagination` é paginado por número, então o critério de
      reuso decide na execução, com a justificativa no relatório.
    - Botão "Re-varrer": chama `rescan({ unitId })`, mostra `attempted/resolved/stillPending` por `notify` e
      recarrega. 403 via `resolveErrorWithCode`.
    - O rótulo de `NO_MAPPER_FOR_UNIT` diz o que fazer: *"a contabilidade desta unidade não está ativa"*.
    - Reuso canônico conforme `my-app/CLAUDE.md`: `neutral-*`, `rounded-2xl`.
19. **i18n:** paridade pt/en em `public/locales/{pt,en}/accounting.json`: `view.tabs.pendencias`, os rótulos dos
    **6** códigos e os textos da tela.
20. **Testes vitest do painel:** lista renderizada; rótulo do código novo; "Re-varrer" chama o serviço e
    recarrega; estado vazio. Espere o **DOM**, não a chamada (memória
    `handler-async-closure-stale-x-waitfor-tohavebeencalled`).
    *Gates:* `npm run test:types`, porque o `tsc` cru exclui testes, e build de produção (tela atrás de
    `withAuth`). O sign-off de browser fica como resíduo **humano**.

### PR-4 — só se F-I4-5 → (b): o wizard mostra o resultado contábil

21. `SetupService.createDashboard` passa a devolver `data`. `useAiInterview.handleCreateSystem`, `QuickSetup`
    e `TotalControlSetup` mostram um aviso que não bloqueia (`notify`) quando `data.accounting?.status ===
    'Draft'`, antes de navegar. i18n pt/en. *Teste vitest do hook:* resposta `Draft` gera o aviso, e `Active`
    não gera nada.

## 3. Camadas

| PR | Route | Controller | Service | Repository → Prisma | Policy |
|---|---|---|---|---|---|
| 1 | — (nenhuma nova; `/api/reconcile-pending` existe) | — | `AccountingSyncService` (lança), `AccountingSyncPort` (lista); job consome | `ReconcilePendingRepository.upsertPending` (existe) | — |
| 2 | `POST /api/dashboard/create` (existe) | `dashboardController`: resolver de setor e helper `activateAccountingOrReport`, ao lado dos dois helpers `…OrRollback` | `BindingActivationService` (existe; I3) | `AccountingBindingRepository` e portas de chart/período (existem) | `AccountingBindingPolicy.canActivateDefault` (existe) |
| 3 | `GET` e `POST /rescan` existentes | `reconcilePendingController` (existe) | `ReconcilePendingService` (existe) | idem | `canRead/ManageReconcilePending` (existem) |

Nenhum Service, Repo, Policy ou rota nova. A integração cross-módulo fica no controller de integração
(Contrato §2.1), **fora do motor de plugins**. Nada é injetado em `DynamicTableService`, `RuleContext` ou `RulePlugin`.

## 4. Contratos esboçados

```ts
// lib/errors.ts (PR-1)
export class NoMapperForUnitError extends AppError {
  constructor(unitId: string, sourceType: string) {
    super(`Nenhum mapper registrado para o evento '${sourceType}' na unidade '${unitId}' — ` +
          `a contabilidade desta unidade não está ativa.`, 500, 'NO_MAPPER_FOR_UNIT');
    Object.setPrototypeOf(this, NoMapperForUnitError.prototype);
  }
}

// features/accounting/sync/AccountingSyncPort.ts (PR-1)
export const SYNC_SKIP_ERROR_CODES =
  ['ACCOUNTING_PERIOD_NOT_OPEN', 'MAX_CENTS_EXCEEDED', 'NO_MAPPER_FOR_UNIT'] as const;

// features/accounting/dtos/ReconcilePendingDto.ts (PR-1) — muda o contrato gerado
export const ReconcilePendingReasonCode = z.enum([
  'FAILED', 'ACCOUNTING_PERIOD_NOT_OPEN', 'MAX_CENTS_EXCEEDED',
  'OPENING_ENTRY_MISSING', 'MISSING_PAID_WITH_PACKAGE_ID',
  'NO_MAPPER_FOR_UNIT', // transitório — resolve quando a unidade ganha binding Active (I4) + recarga + rescan
]);

// features/accountingBinding/dtos/ActivateDefaultBindingDto.ts (PR-2) — reusa ActivationBlockingIssueSchema
export const ONBOARDING_ACCOUNTING_STATUSES = ['Active', 'Draft', 'not-applicable'] as const;
export const ONBOARDING_ACCOUNTING_CODES = ['ACCOUNTING_ACTIVATION_FAILED', 'ACCOUNTING_SYNC_RELOAD_FAILED'] as const;
export const OnboardingAccountingResultSchema = z.object({
  status: z.enum(ONBOARDING_ACCOUNTING_STATUSES),
  sectorKey: z.string().min(1).optional(),              // ausente em not-applicable
  bindingVersion: z.number().int().positive().optional(),
  blocking: z.array(ActivationBlockingIssueSchema).optional(), // presente só em Draft
}).strict();
// 'already-active' do activateDefault → 'Active' (inalcançável numa unidade virgem, mapeado por completude)

// resposta de POST /dashboard/create (PR-2), aditiva
{ success: true, data: { …campos atuais (suiteKey|presetKey, unitId, fiscal, modules, tables),
                         accounting: OnboardingAccountingResult } }

// my-app/lib/services/reconcilePending.service.ts (PR-3)
list(q: ListReconcilePendingQueryDtoInput): Promise<ReconcilePendingListView>   // view tipada à mão (D11)
rescan(b: RescanReconcilePendingDtoInput): Promise<{ attempted: number; resolved: number; stillPending: number }>
```

O `OnboardingAccountingResultSchema` vive em `features/accountingBinding/dtos/`, que o snapshot de shape não
varre (ele varre só `features/accounting/dtos/`). Não gera `.gen.ts`. O PR-4, se existir, tipa a resposta à mão
(D11).

## 5. Forks

### Ratificados — 2026-09-29, decisão 13 (não rediscutir)

- **F-I4-1 → (a):** a chamada fica no `dashboardController`, depois da instalação e da unidade, fora da tx do schema.
  O item 10 a põe também depois do perfil fiscal, pelo motivo da compensação. Isso cabe em "após", sem mudar o fork.
- **F-I4-2 → (b):** o tenant nasce e a resposta traz `accounting:{status:'Draft', blocking}`. A assimetria com
  unidade e fiscal está no item 11.
- **F-I4-3 → (a):** preset sem binding → `not-applicable`.
- **F-I5-1 → (a):** `NoMapperForUnitError` / `NO_MAPPER_FOR_UNIT` na skip-list. O valor entra no enum e muda o
  contrato gerado.
- **F-I5-2 → (b):** linha visível na UI. A tabela e a rota existem desde o #296; falta a tela (PR-3).

### Novos — RATIFICAÇÃO PENDENTE

- **F-I4-4 · a unidade recém-ativada lança sem reiniciar?** O registro de mappers é só do boot (F-FEEDER-5).
  Sem recarga, o I4 grava `Active` e as vendas continuam sem mapper até o próximo boot.
  - **(a)** O controller do onboarding chama `initializeAccountingSyncFromBindings()`, que já existe e é
    público, depois de `Active`, em série. Não muda a classe `AccountingSyncService` nem a fábrica.
  - **(a′)** A mesma recarga, mas no caminho comum do `compile()` → `Active`. Cobre também `POST
    /accounting-binding/compile` e `/activate-default`, que têm a mesma lacuna. Porém muda o comportamento de
    rotas do I1/I3/P1 fora desta autorização.
  - **(b)** Aceitar o reinício: o runbook ganha o degrau "reiniciar depois do primeiro onboarding", e as vendas
    do intervalo viram `NO_MAPPER_FOR_UNIT` e esperam o rescan.
  - **(c)** Lookup preguiçoso por unidade dentro do `sync()` (lê o binding `Active` no miss). Reabre o
    F-FEEDER-5 e põe I/O de banco no caminho quente.

  **Recomendação: (a).** É a única que cumpre *"tenant self-service contabilmente operante"* dentro do escopo
  autorizado, com zero forma nova. O (a′) é o conserto de classe, mas pede autorização sobre rotas de outros nós;
  por isso fica registrado como achado. O (b) deixa o I4 entregar um `Active` que não lança, que é o que o
  I5 existe para não esconder. **PENDENTE.**
- **F-I4-5 · o wizard mostra o resultado contábil?** Hoje o front descarta a resposta do create (§0).
  - **(a)** Não: nesta rodada só o BE devolve `accounting`. A visibilidade vem pela aba de pendências quando
    houver venda.
  - **(b)** Sim: PR-4, um aviso que não bloqueia quando vier `Draft`.

  **Recomendação: (b).** Um campo devolvido e nunca lido é a classe `param-aceito-e-ignorado-e-bug` do lado da
  saída. Com (a), um tenant `Draft` só descobre na primeira venda travada. O custo é 3 chamadores e 1 chave i18n.
  **PENDENTE.**
- **F-I5-3 · quando o miss é `NO_MAPPER_FOR_UNIT`?**
  - **(a)** Todo miss de mapper.
  - **(b)** Só quando a unidade não tem nenhum mapper registrado. Um evento sem mapper numa unidade com binding
    `Active` continua `ValidationError` e cai em `FAILED`, ruidoso.

  **Recomendação: (b).** O caso ratificado é *"venda de tenant sem binding"*. A outra metade é a falha que o gate
  de cobertura do `compile()` existe para impedir: se acontecer, é bug. Pular com `warn` violaria a memória
  `erro-especifico-para-skip-em-job` ("skip só com erro de code próprio que não esconde bug"). O custo é um
  `Set<unitId>` montado no construtor. **PENDENTE.**
- **F-I5-4 · forma da tela.**
  - **(a)** Aba própria "Pendências" com filtros, resolvidas e botão "Re-varrer" (rota e policy existem).
  - **(b)** Seção só de leitura dentro de uma aba existente (Conciliação).

  **Recomendação: (a).** Sem "Re-varrer" na tela, uma `NO_MAPPER_FOR_UNIT` resolvida pela ativação só sai da
  lista por chamada HTTP manual. O único chamador de `findUnresolved` e de `retryOneReconcilePendingItem` é o
  `ReconcilePendingService.rescan`, então o job não re-dirige linhas fora da janela (V, grep). **PENDENTE.**

## 6. Pendente de validação externa

**Vazia.** Nenhuma regra contábil, fiscal ou legal nasce aqui. A ativação reusa as fixtures de binding e o plano
canônico já existentes, e a validação profissional deles segue nos gates que já os cobrem (H1/H2). Abrir o
período do mês é ato que a UI já expõe sem gate adicional (`PeriodsPanel`, argumento ratificado no F-I3-1).

## 7. Insumos ausentes

1. **Segurança da troca de referência sob tráfego.** Inferido (I): `initializeAccountingSyncFromBindings()` troca
   `this.services.accountingSync`; chamadas em voo seguram a instância antiga e nenhum serviço captura a instância
   (grep em `factory.ts:705,980`). Só o teste do item 13 sob carga provaria. Não há teste concorrente previsto,
   porque o Windows serializa o SQLite (memória `windows-serializa-sqlite-ci-linux-nao`).
2. **A clínica compila `Active` no plano canônico?** NV. O item 10 mede; se der `Draft`, a execução para.

## 8. Achados fora de escopo (registrar, não planejar)

- **O registro de mappers também não recarrega em `POST /accounting-binding/compile` e `/activate-default`.**
  É a mesma causa do F-I4-4, nas rotas do P1/I3. Candidato ao GAP-MAP se o F-I4-4 ficar em (a).
- **Boot com zero `Active` aborta** (F-FEEDER-4, `server.ts:36-58`). Num banco virgem, ninguém chega ao
  onboarding que o I4 automatiza. É o degrau do runbook **I10** (humano); o I4 pressupõe uma instância já de pé.
- **Mês UTC × fuso do escopo:** o `activateDefault` abre o mês **UTC** (desenho do I3). Um onboarding nas
  últimas 3 horas do mês em BRT abre o mês seguinte. As vendas daquela noite caem num período ausente e viram
  `ACCOUNTING_PERIOD_NOT_OPEN`. Não muda aqui.
- **O reset (I7) não limpa o que o I4 cria:** binding, plano de contas e período. O alimentador continua
  registrando mappers de uma unidade morta (inofensivo). A dívida do I7 cresce, e o nó já existe.
- **Cobertura por snapshot da fixture:** o gate de cobertura usa o `operationalSchema` da fixture, não as
  tabelas realmente instaladas. No modo custom sem `sales`, a ativação sai `Active` mesmo assim, o que é inofensivo
  porque não há emissor. É desenho do I3/P2.
- **Linhas `FAILED` legadas "Nenhum mapper"** ficam com o rótulo antigo (item 8). Se o dono quiser o histórico
  reclassificado, é migração de dado, com nó próprio.

## 9. Riscos e vieses (T8)

- **Risco principal:** se o F-I4-4 for (b), o I4 fecha com o selo `Active` e sem lançamento até o reinício.
  Esse é o modo de falha "verde que não opera", e só o teste do item 13 o denuncia.
- **Viés desta sessão:** as recomendações dos forks novos puxam para a opção que cabe na autorização atual,
  (a) em vez de (a′) no F-I4-4. O dono já registrou preferir completude a MVP (memória
  `dono-quer-completude-nao-mvp`). Se valer aqui, (a′) é a leitura "completa", e ela exige ampliar a autorização.
- **Caso adversarial tentado:** "o I5 já está resolvido pelo #296, e o `FAILED` basta". Refutado em parte. A
  captura existe, mas com `FAILED` a pendência se confunde com bug genuíno, a ponte loga `error` a cada venda de
  um tenant `Draft` e a tela não tem como orientar. O código próprio muda o que o operador consegue fazer; a
  captura em si já estava lá.
- **Checagem que falharia se este BRIEF estiver errado sobre o registro só do boot:** o teste do item 13,
  rodado com os itens 9-12 implementados e **sem** a recarga. A leitura prevê vermelho (sem mapper para a unidade
  nova). Se der verde, o F-I4-4 era desnecessário, e o BRIEF volta ao dono antes do item 13.
