# BRIEF — BE-INCR-SCOPE-UNIT-GUARD (nó I6): `unitId` validado contra a tabela `units` do dono

> **Status (16/10):** em execução — `executa` do dono, chat, 2026-10-16 (*"Pode começar agora e disparar as sessões com
> brief autorizado"*), 5 PRs empilhados, merge não autorizado; F-I6-11 → (a) ratificado no mesmo dia.
> **Status (15/10):** BRIEF pronto. **Forks: 7 ratificados pelo dono em 2026-10-15** por questionário
> ([`D-2026-10-15-I6-FORKS`](../plano/decisoes/D-2026-10-15-I6-FORKS.md)); **1 fork menor (F-I6-11) PENDENTE**, com
> recomendação. **Não tem "executa"**: a autorização desta sessão é *"planejar o BRIEF do I6 — sessao-planejamento,
> sem código, sem 'executa'"*. A `sessao-feature` só roda com autorização de código citável.
> Produzido em `sessao-planejamento`, 2026-10-15, a partir de `main` `8ba1ed8f`.

## 0. Contexto fixo

- **Item:** nó [`I6`](../plano/nos/I6.md) — "`unitId` validado contra a tabela `units` do tenant". Plano de 07/09:
  [`ONBOARDING-WIZARD-plano-grafo-brief.md`](ONBOARDING-WIZARD-plano-grafo-brief.md) §I6 (lacuna = achado int. 3:
  string livre cria escopo contábil paralelo; nome previsto do BRIEF: este arquivo).
- **Autorização:** dono, chat, 2026-10-15: *"Autorizo planejar o BRIEF do I6 — sessao-planejamento, sem código, sem
  'executa'"*. Cobre o BRIEF, o questionário dos forks D3+ e o fold da nota. **Não cobre código.**
- **Pré-requisito de ordem:** F-RK-12 → (a) "I1b antes do I6" (dono, 2026-10-02). **Satisfeito:** I1b `done`, runbook
  executado no dev.db real e assinado em 2026-10-04 ([`D-2026-10-04-I1B-RUNBOOK-ASSINADO`](../plano/decisoes/D-2026-10-04-I1B-RUNBOOK-ASSINADO.md)).
  F-I6-2 (dado legado) já estava resolvido por F-I1-3 → (b).
- **Fato consumado (lido no código em 2026-10-15, `main` `8ba1ed8f`):**
  - `server/src/features/accounting/scope/AccountingScope.ts:31-44` — `resolveAccountingScope(user, unitId)` é
    **síncrona** e só copia o `unitId`. **Estado da nota confirmado.**
  - `AccountingPolicy.ts:5-9` registra que `unitId` "is not gated here" (silo por `userId`, sem vazamento
    entre tenants — o risco é sub-partição paralela, não leak).
  - **Chamadas:** 235 em **42 controllers** + `resolveGovernanceScope` (`AccountantAssignmentService.ts:71-82`,
    caminho do contador sobre a unidade do dono) usado por 4 controllers (`accountingController`,
    `accountingPolicyVersionController`, `accountingReviewController`, `dataExchangeController`). Chamadores
    internos (unitId vem de linha já gravada, não do cliente): `accountingSyncReconcile.job.ts` (16), as 4 bridges
    de venda, `RegisterPaymentService` (2), `CollectionChargeService` (4), `FiscalDocumentLifecycleService` (4),
    `ReleaseReportService`, `TaxAssessmentRecalcService`, `SystemProvisioningService`, `rekeyLegacyUnitCli`,
    e o hook Won do `crmController.ts:116-134` (unitId da oportunidade).
  - **Fato novo que derruba a premissa da recomendação de 07/09** ("escopo paralelo só nasce escrevendo"):
    `PostingService.listAccounts` (`PostingService.ts:858-866`) é **leitura** e chama `ensureChartOfAccounts` —
    um `GET` de contas com `unitId` qualquer **cria** o plano de contas sob ele.
  - Canônico de consulta a `units`: `DynamicTableRepository.findTableByInternalName(userId, 'units')` (`:55`) +
    `existsByIdInTable(dataId, tableId)` (`:377`, filtra `deletedAt: null`). Mesmo critério de "tabela de unidades"
    do CLI do I1b (`rekeyLegacyUnitCli.ts:283-300`, `internalName === 'units'`) e do provisionamento
    (`SystemProvisioningService.ts:121`).
  - Erros: `AppError(message, statusCode, errorCode)` e `ConflictError(message, errorCode)` em `lib/errors.ts`.
  - Gate `check:arch` = dependency-cruiser (`server/package.json:38`, `.dependency-cruiser.cjs` + baseline
    `.dependency-cruiser-known-violations.json` que só encolhe) — `ADR-ARCH-BOUNDARIES.md` §4.
  - Testes: 125 arquivos de integração citam `unitId` (sintético: `'unit-1'` ×705, `'u1'`, `'u'`…); só 13 criam
    `units`. Não há helper `seedUnit` em `server/test/helpers/` (há `seedDynamicTable` / `seedDynamicTableData`).
  - Seed do H1: desde a re-semeadura de 07/10 o razão do seed está sob o **id gerado** da linha de `units`
    (`seedAccountingFixtureCli.ts:26,307-308`; `RUNBOOK-H1-PVA.md:124-133`). Os ids literais `seed-unit-*` ficam
    com razão antigo e passam a responder 404 — esperado (F-RK-2 a, F-P5 a).
- **Nós vizinhos:** consome I1 (a 1ª linha de `units` nasce no onboarding) e I1b (legado re-chaveado). Ninguém
  depende de I6 no vault. Vizinho de FE (não planejado aqui): o `useAccountingData.ts:49-51` cai num fallback por
  **nome** (`/unidade|units/i`) quando não há `internalName === 'units'` — ver §6.

## 1. Forks (decisões)

| Fork | Decisão | Origem |
|---|---|---|
| **F-I6-1** onde validar | **(d)** serviço novo `AccountingScopeResolver` (async, via factory) em **todo** controller HTTP; chamadores internos seguem com a função síncrona | dono, 2026-10-15 — *"(d) Resolver async (Recomendado)"* |
| **F-I6-2** dado legado | resolvido por F-I1-3 → (b); I1b executado | dono, 2026-09-07 / 2026-10-04 |
| **F-I6-3** resposta a id inexistente ou de outro dono | **404 `UNIT_NOT_FOUND`** | dono, 2026-10-15 — *"404 UNIT_NOT_FOUND (Recomendado)"* |
| **F-I6-4** unidade apagada (soft-delete) | **(b) lê sim, grava não** | dono, 2026-10-15 — *"(b) Lê sim, grava não"* (diverge da recomendação (c); registro T8 feito na pergunta) |
| **F-I6-7** impedir regressão | **regra no `check:arch`** | dono, 2026-10-15 — *"Regra no check:arch (Recomendado)"* |
| **F-I6-8** como cada chamada declara o modo | **explícito por endpoint** (`access: 'read' \| 'write'`, sem default) | dono, 2026-10-15 — *"Explícito, por endpoint (Recomendado)"* |
| **F-I6-9** escrita em unidade apagada do dono | **409 `UNIT_DELETED`** | dono, 2026-10-15 — *"409 UNIT_DELETED (Recomendado)"* |
| **F-I6-10** `listAccounts` em unidade apagada | **leitura, sem criar** o plano de contas | dono, 2026-10-15 — *"Leitura, sem criar (Recomendado)"* |
| **F-I6-11** OpenAPI dos códigos novos | **(a)** componente de resposta compartilhado (`UnitNotFound` 404, `UnitDeleted` 409) referenciado no JSDoc de cada endpoint migrado | dono, questionário, 2026-10-16 — ratificado na abertura da `sessao-feature` (PR-1 cria os componentes em `docs.paths.ts`). **Subcaso (B)** da lacuna L-I6-1 (77 endpoints já declaram `'404'`, 19 já declaram `'409'`): *"Substituir pelo componente"* (dono, questionário, 2026-10-16) — em todo endpoint migrado, 404 e 409 viram `$ref` a `UnitNotFound`/`UnitDeleted`, ocupados ou não; a descrição do componente cobre o caso da unidade e o genérico do código; o que a resposta antiga dizia de específico do endpoint vai para a `description` do endpoint; endpoint sem JSDoc segue sem doc |

(F-I6-5 "chamadores internos" e F-I6-6 "fixtures" não viraram cédula: o primeiro está dentro das opções do F-I6-1
— a (d) os deixa fora; o segundo é direto, §2 item 6.)

## 2. Checklist de comportamentos

**Fundação (PR-1)**

1. **Erros.** `UnitNotFoundError extends AppError` → 404, `errorCode: 'UNIT_NOT_FOUND'`, mensagem
   `"Unidade não encontrada."`; `UnitDeletedError extends ConflictError` → 409, `errorCode: 'UNIT_DELETED'`, mensagem
   `"Unidade apagada — restaure-a para lançar."`. Em `lib/errors.ts`.
   - **Teste:** o middleware de erro devolve status e `errorCode` de cada um.
2. **Repositório.** Método novo em `DynamicTableRepository` (+ interface):
   `findUnitRowState(ownerUserId, unitId): Promise<'live' | 'deleted' | null>` — `null` se o dono não tem tabela
   `internalName === 'units'`, se a linha não existe, ou se a linha é de **outra** tabela/dono; `'deleted'` se
   `deletedAt != null`; `'live'` caso contrário. **Uma** consulta à linha com `include: { dynamicTable }` (padrão de
   `rekeyLegacyUnitCli.classify`), comparando `dynamicTable.userId === ownerUserId` e
   `dynamicTable.internalName === 'units'`.
   - **Teste (repo real, integração):** viva → `'live'`; apagada → `'deleted'`; id de `units` de outro dono → `null`;
     id de linha de **outra** tabela do mesmo dono (ex.: `productUnits`) → `null`; string livre → `null`.
3. **Resolver.** `AccountingScopeResolver` (service, `features/accounting/scope/`), construído na factory com o
   repositório do item 2 e o `AccountantAssignmentService`:
   - `resolve(user, unitId, { access })` → `resolveAccountingScopeInternal(user, unitId)` + `assertUnit`.
   - `resolveGovernance(user, unitId, ownerUserId, { access })` → `resolveGovernanceScope(...)` **primeiro** (o 403
     `ACCOUNTANT_NOT_ASSIGNED` vem antes, sem revelar se a unidade existe) e depois `assertUnit` contra
     `scope.ownerUserId` (a unidade é do **dono**, não do contador).
   - `assertUnit`: `null` → `UnitNotFoundError`; `'deleted'` + `access: 'write'` → `UnitDeletedError`;
     `'deleted'` + `'read'` → devolve o escopo com `unitDeleted: true`; `'live'` → escopo sem a marca.
   - **Teste (unit, repo falso):** a tabela 3×2 (estado × modo) + o caso governança sem vínculo (403, repo de
     `units` não chamado).
4. **Função síncrona vira interna.** `resolveAccountingScope` sai de `AccountingScope.ts` para
   `scope/resolveAccountingScopeInternal.ts` (mesmo corpo). `AccountingScope.ts` fica com a interface,
   `accountingScopeWhere` e o campo novo opcional `unitDeleted?: true`. Os chamadores internos listados no §0 e
   o `AccountantAssignmentService` passam a importar do módulo novo — **sem mudança de comportamento**.
5. **Regra `check:arch` (F-I6-7).** Em `.dependency-cruiser.cjs`: `src/controllers/**` não importa
   `src/features/accounting/scope/resolveAccountingScopeInternal.ts` (import de tipo também conta). As violações
   existentes (os 42 controllers) entram no baseline via `npm run check:arch:baseline` **neste PR**; cada PR seguinte
   o encolhe. Linha nova na tabela de regras do `ADR-ARCH-BOUNDARIES.md`, citando a decisão.
   - **Prova na condição que falha:** um controller de teste temporário importando o módulo → `check:arch` exit ≠ 0;
     retirado → exit 0. Saída literal no corpo do PR.
6. **Helper de teste `seedUnit`** em `server/test/helpers/seed.ts`: `seedUnit({ userId, id, name?, deleted? })` —
   cria (ou reusa) a `DynamicTable` `internalName: 'units'` do dono e a linha com **o id dado** (os testes mantêm
   seus literais `'unit-1'` etc.). Como `DynamicTableData.id` é chave global, dois donos não compartilham o mesmo
   literal: teste com dois atores usa ids distintos.
7. **`listAccounts` sem semear em unidade apagada (F-I6-10).** `PostingService.listAccounts` pula
   `ensureChartOfAccounts` quando `scope.unitDeleted === true`; unidade viva segue igual a hoje.
   - **Teste (unit):** escopo com `unitDeleted` → `ensureChartOfAccounts` não chamado, lista devolvida;
     sem a marca → chamado (regressão).

**Migração dos controllers (PR-2 … PR-5)** — mecânica, por lote de router

8. **Cada controller** troca `resolveAccountingScope(user, x)` por
   `await resolver.resolve(user, x, { access })` (e `resolveGovernanceScope` por `resolver.resolveGovernance`),
   recebendo o resolver pela factory como os demais serviços. O `access` é **explícito em toda chamada** (F-I6-8):
   `'write'` se o handler grava qualquer linha (inclusive `GET` com efeito colateral e `POST` que gera arquivo e
   registra entrega/job); `'read'` se não grava. `listAccounts` é `'read'` (F-I6-10).
9. **Tabela endpoint → modo** no corpo de cada PR (método, rota, controller, modo, motivo em 1 linha). Endpoint de
   leitura que grava (como o `listAccounts`) é marcado — é o insumo do item 8.
10. **Fixtures** de cada suíte de integração tocada chamam `seedUnit` para todo `unitId` usado nas rotas migradas.
    Expectativa de teste só muda nos casos de **outro dono** (antes: lista vazia / 404 do recurso; agora: 404
    `UNIT_NOT_FOUND`), cada um listado no PR com o motivo.
11. **Testes novos por lote** (integração, 1 rota de leitura + 1 de escrita representativas do lote):
    string livre → 404 `UNIT_NOT_FOUND`; unidade de outro dono → 404; unidade apagada → leitura 200 /
    escrita 409 `UNIT_DELETED`; unidade viva → como antes. E **nenhuma linha contábil nova** depois do 404/409
    (contagem de `accounts` / `journal_entries` sob o `unitId` igual a antes) — prova de que o escopo paralelo
    não nasce.
12. **Baseline encolhe:** cada PR regenera o baseline do `check:arch` e o diff dele só remove linhas.

**Fechamento (último PR do lote)**

13. **Baseline zero** para a regra do item 5 (nenhum controller importa a função interna). `AccountingPolicy.ts:5-9`
    e o comentário `ponytail: membership check` de `resolveAccountingScopeInternal` são atualizados para dizer onde o
    `unitId` é validado agora.
14. **Gates do diff:** `npx tsc --noEmit` + `tsc -p tsconfig.test.json` limpos; `npm run test:unit`;
    `npm run test:integration` (4 shards); `npm run check:arch` exit 0; snapshot de DTO sem mudança (nenhum DTO
    novo — o resolver não é DTO); allowlist de auditoria sem mudança (nenhum eventType novo); guard de path-count
    do openapi sem mudança (nenhuma rota nova).

## 3. Contratos esboçados

```ts
// lib/errors.ts
export class UnitNotFoundError extends AppError {
  constructor() { super('Unidade não encontrada.', 404, 'UNIT_NOT_FOUND'); }
}
export class UnitDeletedError extends ConflictError {
  constructor() { super('Unidade apagada — restaure-a para lançar.', 'UNIT_DELETED'); }
}

// features/accounting/scope/AccountingScope.ts (interface ganha 1 campo opcional)
export interface AccountingScope {
  /* …campos de hoje… */
  /** Marca do resolver: a linha de `units` está soft-deleted (só aparece com access 'read'). */
  unitDeleted?: true;
}

// features/dynamicTables/repositories/IDynamicTableRepository.ts
findUnitRowState(ownerUserId: string, unitId: string): Promise<'live' | 'deleted' | null>;

// features/accounting/scope/AccountingScopeResolver.ts
export type ScopeAccess = 'read' | 'write';
export interface IAccountingScopeResolver {
  resolve(user: { userId: string }, unitId: string, opts: { access: ScopeAccess }): Promise<AccountingScope>;
  resolveGovernance(
    user: { userId: string }, unitId: string, ownerUserId: string | undefined, opts: { access: ScopeAccess },
  ): Promise<AccountingScope>;
}
```

Resposta HTTP (corpo no formato do middleware de erro de hoje):

| Situação | `access: 'read'` | `access: 'write'` |
|---|---|---|
| linha viva de `units` do dono | segue (200…) | segue |
| linha apagada de `units` do dono | segue, `unitDeleted: true` | **409** `UNIT_DELETED` |
| id de `units` de outro dono / de outra tabela / string livre / dono sem `units` | **404** `UNIT_NOT_FOUND` | **404** `UNIT_NOT_FOUND` |
| contador sem vínculo ativo (governança) | **403** `ACCOUNTANT_NOT_ASSIGNED` (antes do guard) | idem |

## 4. Forks pendentes de ratificação

- **F-I6-11 · OpenAPI dos códigos novos.** (a) componente de resposta compartilhado (`UnitNotFound` 404,
  `UnitDeleted` 409) referenciado no JSDoc de cada endpoint migrado — mesmo toque do item 8; (b) documentar uma vez
  na descrição geral da API, sem tocar os endpoints. **Recomendação: (a)** — o cliente gerado do contrato vê o 404/409
  por rota, e o custo é uma linha por endpoint que o PR já edita. **RATIFICADO (a)** — dono, questionário,
  2026-10-16 (abertura da `sessao-feature`); subcaso (B) — substituir o 404/409 já declarado pelo componente — dono,
  questionário, 2026-10-16 (ver §1).

## 5. Divisão em PRs

| PR | Conteúdo | Itens |
|---|---|---|
| **PR-1 fundação** | erros, `findUnitRowState`, `AccountingScopeResolver` + factory, função interna, regra `check:arch` + baseline com os 42, `seedUnit`, `listAccounts` (F-I6-10). **Nenhum controller muda de comportamento.** | 1–7 |
| **PR-2** | `accounting.ts` (`accountingController`, `closingController`, `accountingSettingsController`, `accountingReviewController`, `accountingPolicyVersionController`, `dataExchangeController`, `referentialMappingController`, `referentialCatalogController`, `entryApprovalController`, `dimensionController`, `sourceDocumentController`, `documentAttachmentController`, `accountingContactController`, `accountantAssignmentController`, `companySignerController`, `companyFiscalProfileController`, `fiscalProfileController`, `serviceFiscalProfileController`, `accountingDeliveryController`) | 8–12 |
| **PR-3** | AP/AR e tesouraria: `payableController`, `receivableController`, `paymentAccountController`, `bankSettlementController`, `reconciliationController`, `reconcilePendingController`, `collectionChargeController`, `counterpartyController`, `packageBalanceController`, `packageAcceptanceController`, `crmController` (rotas HTTP; o hook Won fica interno) | 8–12 |
| **PR-4** | fiscal/declarações: `fiscalDocumentController`, `nfeController`, `spedController`, `lalurController`, `simplesController`, `taxAssessmentController`, `issBeneficioMunicipalController`, `mitExportController`, `productDestinationController` | 8–12 |
| **PR-5 fechamento** | imobilizado (`fixedAssetController`, `fixedAssetClassController`, `depreciationRateController`) + o que sobrar no baseline; baseline zero; comentários do item 13 | 8–14 |

Os lotes são independentes entre si depois do PR-1 (cada um só toca seus controllers, suas suítes e linhas do
baseline) — podem ir em paralelo, mas o baseline do `check:arch` é arquivo único: **rebase antes do merge e
regenerar**, nunca resolver o conflito do baseline à mão. A lista de controllers acima é a do `grep` de 2026-10-15;
o executor confirma com `grep -rl resolveAccountingScope src/controllers` no início do PR-1 (baseline = verdade).

## 6. Pendente de validação externa

Nenhuma regra contábil, fiscal ou legal nasce aqui: `unitId` é chave de escopo; nenhum valor, data, conta ou
natureza muda. **Vazia.**

## 7. Insumos ausentes

1. **Outros `GET` com efeito colateral.** Só o `listAccounts` foi lido (`ensureChartOfAccounts` em
   `PostingService`). Não varri os demais serviços; o item 9 (tabela endpoint → modo) é onde o executor os acha,
   lendo cada handler do lote. Se aparecer outro `GET` que grava, segue a regra do item 8 (`'write'`) — **exceto**
   se ele também precisar "ler sem criar" em unidade apagada como o F-I6-10: aí é decisão nova (pausa e pergunta).
2. **Custo por request.** O guard acrescenta 1 consulta (`dynamicTableData` por PK + include). Não medido; esperado
   desprezível no SQLite local.

## 8. Achados fora de escopo (não planejados — frente nova exige autorização)

- **Fallback por nome no FE.** `my-app/features/accounting/hooks/useAccountingData.ts:49-51` escolhe uma tabela
  cujo **nome** casa `/unidade|units/i` quando não há `internalName === 'units'`. Com o I6, um id dessa tabela recebe
  404. Frente FE própria (tirar o fallback e/ou tratar 404/409 na tela da Contabilidade).
- **Guarda de delete de unidade com contabilidade.** Hoje o motor deixa apagar a linha de `units` que tem razão; o
  F-I6-4 (b) só impede lançar depois. Bloquear/avisar no delete é guarda do motor (Contrato §2.1) — outra frente.
- **Chamadores internos** (bridges, reconcile, cobrança, NF-e lifecycle) seguem sem validação por decisão (F-I6-1 d):
  o `unitId` deles vem de linha já gravada. Se uma unidade for apagada, eles continuam escrevendo nela — mesmo
  tema do item anterior.
