# BE-INCR-RESET-CONSISTENTE — BRIEF do nó I7 (`DELETE /dashboard/system`)

**Nó:** [I7](../plano/nos/I7.md) · **Sessão:** `sessao-planejamento` · **Data:** 2026-10-15 · **Base:** `main` `8ba1ed8f`
**Autorização:** dono, chat, 2026-10-15: *"Autorizo planejar o BRIEF do I7 — sessao-planejamento, sem código, sem
'executa'"*. Cobre o BRIEF e o fold; **não** autoriza implementar (falta o "executa").
**Forks:** F-I7-1..F-I7-4 **RATIFICADOS** pelo dono por questionário nesta sessão, os quatro na recomendação
([D-2026-10-15-I7-RESET-FORKS](../plano/decisoes/D-2026-10-15-I7-RESET-FORKS.md)). Não há fork pendente.

Lacuna de origem: achados int. 17, 18 e 19 de 03/09. O reset apaga as tabelas e deixa para trás a contabilidade,
os chats, os documentos, os layouts e as visões salvas. O cache de KPI sobrevive, e a rota não tem teste
(`ONBOARDING-WIZARD-plano-grafo-brief.md` §I7). Resíduo herdado do I2: a reinstalação sobrescreve o T0.

## 0. Estado medido no código (lido, 15/10, `8ba1ed8f`)

| # | Fato | Onde | Grau |
|---|---|---|---|
| E1 | `DELETE /api/dashboard/system` → `deleteUserSystem` → `SystemProvisioningService.purgeUserSystem(ctx.id)` → **204**. Não há checagem de papel nem policy | `routes/dashboard.ts:35`, `controllers/dashboardController.ts:451-463` | lido |
| E2 | `purgeUserSystem` faz três coisas: `deleteAllTablesForUser` (dados e depois tabelas), `knowledgeGraphs.deleteByUserId` e `actionProposals.deleteByUserId`. Tem **dois** chamadores: o reset e a compensação do onboarding (`compensate`). A interface já avisa *"o nó I7 separa as duas intenções depois"* | `features/onboarding/services/SystemProvisioningService.ts:63-64, 108-112, 211-224` | lido |
| E3 | O único teste é unitário, com fakes, e só cobre as três chamadas. A rota não tem teste nenhum | `features/onboarding/__tests__/SystemProvisioningService.test.ts:200-208`; grep de `dashboard/system` em `__tests__` | lido |
| E4 | `kpiCacheService` é um singleton em memória (TTL de 5 min) e tem `invalidate(userId)`. O motor o chama no `createTableData`, mas o reset **não** | `features/analytics/services/KpiCacheService.ts:49-60`, `DynamicTableService.ts:595` | lido |
| E5 | Os modelos não contábeis com `userId` que o reset **não** apaga são estes. `SavedTableView`, `CrmReportDefinition` e `CrmAttachment` têm `deletedAt`, e o `CrmAttachment` tem `storageKey` (arquivo em disco). `DashboardLayout` e `ChatInstance` (cujas mensagens caem em cascata) não têm `deletedAt`. `Document` tem chunks e `StructuredData` e não aponta para tabela nenhuma | `prisma/schema.prisma` (script de leitura dos `model`) | lido |
| E6 | Esses donos já têm repositório canônico: `savedViews/`, `dashboardLayout/`, `chatInstances/`, `crm/CrmReportDefinitionRepository`, `attachments/AttachmentRepository` (*"Soft-delete universal — no prisma.delete()"*). O apagar do anexo é `softDelete` + `storage.deleteFile(storageKey)`. Só KG e ActionProposal têm `deleteByUserId` | `features/*/repositories/`, `attachments/services/AttachmentService.ts:126-140` | lido |
| E7 | **Desde o I4, o onboarding de preset com setor (salão, clínica) já escreve contabilidade.** O `activateDefault` → `KitInstallService.install` roda os passos CANONICAL_CHART, CHART_EXTENSION, ROLE_DEFAULTS, PERIOD, COMPILE (binding), SERVICE_FISCAL_DEFAULTS e REFERENTIAL, mais o `KitInstallation`, e grava eventos na trilha (`binding.activated`, o evento do kit). O provisionamento grava `CompanyFiscalProfile` e o `FiscalProfile` da unidade | `accountingBinding/services/BindingActivationService.ts:79-…`, `sectorKits/services/KitInstallService.ts:182-237`, `SystemProvisioningService.ts:96-103` | lido |
| E8 | Consequência de E7: o 409 *"enquanto houver qualquer contabilidade"* do plano de 07/09 recusaria o reset de **todo** tenant de salão ou clínica logo depois do onboarding. Daí o F-I7-1 ratificado como "só com movimento" | dedução de E7 + E1 | inferido (o item 12 prova) |
| E9 | A trilha `AuditEvent`/`AuditChainHead` é chaveada por `(scopeUserId, unitId)` e não tem FK para `User`. `AccountingPeriodTransition` tem FK `onDelete: Cascade` para `AccountingPeriod` | `schema.prisma` | lido |
| E10 | O T0 é gravado na tx do install com `tx.user.update({ data: { onboardingCompletedAt: new Date() } })`, incondicional. A linha é a exceção nominal `SYMBOL_ALLOWLIST` do `proveP2ZeroDiffCli`, que **não** roda no CI: é a prova do range da vertical P2 (`grep` em `.github/workflows` não acha nada) | `DynamicTableService.ts:467-470`, `jobs/proveP2ZeroDiffCli.ts:68-90` | lido |
| E11 | `handleApiError` só põe `details` na resposta para uma lista nominal de classes (`ValidationError`, `ModuleNotInstalledError`, …). O exemplar de 409 com `details` é o `ModuleNotInstalledError` | `lib/apiUtils.ts:35-43`, `lib/errors.ts:146-160` | lido |
| E12 | No FE, `DashboardSidebar.handleDeleteSystem` faz `confirm` → `DynamicTableService.deleteSystem()` → redireciona para `/dashboard/setup`. No `catch`, *"Error already handled automatically by apiClient"* | `my-app/features/dashboard/DashboardSidebar.tsx:124-136` | lido |
| E13 | `UserContext.id === userId`. O escopo contábil é o `userId` dono, com N unidades. O usuário só reseta o próprio sistema | `types/UserContext.ts` | lido |

## 1. Forks (todos RATIFICADOS 2026-10-15, questionário)

- **F-I7-1 → "409 só com movimento".** O reset é recusado com **409** e contagens por tipo quando existe
  *movimento* contábil em qualquer unidade do usuário. Quando só existe a *configuração que o onboarding escreve*
  (kit, plano, período vazio, binding, perfis), o reset a remove por um serviço **da contabilidade**, numa tx com
  o gate re-checado dentro dela. A trilha `AuditEvent`/`AuditChainHead` **nunca** é apagada. Caminhos rejeitados:
  "409 com qualquer contabilidade" (E8: mataria o reset do salão) · "nunca tocar a contabilidade" (deixa o
  `unitId` morto do achado 17) · cascata (a trilha não cai em cascata: `audit-log-no-fk-cascade`).
- **F-I7-2 → "Tudo, menos Documentos".** Entram na purga: layouts, visões salvas, relatórios do CRM, anexos do CRM
  (linha + blob), chats de widget, KnowledgeGraph e ActionProposals. Os `Document` (com chunks e
  `StructuredData`) **ficam**.
- **F-I7-3 → "Preservar o 1º T0".** `onboardingCompletedAt` só é gravado se estiver `null`.
- **F-I7-4 → "Sim, evento de reset na trilha".** Na mesma tx da remoção contábil, cada unidade que teve
  configuração removida recebe um evento novo com as contagens removidas.

## 2. Checklist de comportamentos (cada um testável sozinho)

### PR-1 — reset não contábil + rota testada (F-I7-2, F-I7-3) · `sonnet-medio`

1. **Separar as intenções (E2).** `ISystemProvisioningService` passa a expor `resetUserSystem(ctx)` (o reset).
   `purgeUserSystem` vira `private compensateProvisioning(userId)`: o mesmo corpo de hoje (tabelas + KG +
   proposals), só para o `compensate`. Teste: `compensate` chama só os três de hoje, e o reset chama o conjunto do
   item 2.
2. **Purga não contábil pelos donos canônicos (F-I7-2, E5/E6).** Ordem: `deleteAllTablesForUser` → KG → proposals
   → `DashboardLayout` (hard, não tem `deletedAt`) → `ChatInstance` (hard, as mensagens caem pela FK) →
   `SavedTableView` (soft) → `CrmReportDefinition` (soft) → `CrmAttachment` (soft, depois `storage.deleteFile`
   best-effort por anexo, com `logger.warn` em falha e sem abortar). Cada repositório ganha
   `deleteByUserId(userId)` ou `softDeleteByUserId(userId)`, conforme a convenção de soft-delete do próprio dono
   (E6). Nenhum `prisma.*` fora do repositório. **`Document` não é tocado.** Teste de integração: um usuário com
   uma linha de cada fica com zero vivas em cada tabela da lista e o `Document` intacto. Um 2º usuário com as
   mesmas linhas não perde nada (isolamento de tenant).
3. **Cache de KPI (E4).** No fim do reset, `kpiCacheService.invalidate(userId)`. Teste: `set('<u>:x')` → reset →
   `get` dá `null`. A chave `'<u2>:x'` de outro usuário sobrevive.
4. **Policy (Contrato §2).** `ISystemProvisioningPolicy.canResetSystem(ctx): boolean` (o usuário autenticado
   reseta o próprio sistema, que é o comportamento de hoje, E13). O serviço lança `ForbiddenError` quando a
   policy recusa. Teste unitário da policy.
5. **Idempotência.** Reset sobre um sistema já vazio dá 204 e não lança. Teste.
6. **T0 preservado (F-I7-3, E10).** No `installPresetAsSystem`, a escrita passa a ser
   `tx.user.updateMany({ where: { id: userId, onboardingCompletedAt: null }, data: { onboardingCompletedAt: new Date() } })`,
   na mesma tx e no mesmo símbolo. Teste de integração: install → T0₁ → reset → install → T0 continua T0₁. O teste
   de rollback do I2 (#320) continua verde. Nota: o diff mexe na linha da `SYMBOL_ALLOWLIST`. A prova zero-diff é
   do range da P2 e não roda no CI (E10), então nenhum gate quebra. O comentário da linha cita o F-I7-3.
7. **Rota coberta (E3).** Teste de integração HTTP (supertest): 401 sem token; 204 com token e tabelas; 204 com
   sistema vazio (item 5); depois do reset, `POST /dashboard/create` volta a passar da guarda one-shot (deixa de
   ser 403).
8. **Gates do diff.** `tsc` server + `tsconfig.test.json`; `check:arch` (os repositórios novos ficam na própria
   feature, e o onboarding importa só a interface); `docs.paths.ts` sem path novo (o guard de path-count fica
   igual).

### PR-2 — gate contábil, remoção da configuração e 409 (F-I7-1, F-I7-4) · `opus-medio`

9. **Classificação fechada das tabelas contábeis (F-I7-1).** Uma constante em `features/accounting/models/`
   (`accountingResetClassification.ts`) põe **todo** `model` do schema que tem `userId` ou `unitId` contábil em
   exatamente uma de três classes:
   - `TRAIL` = `AuditEvent`, `AuditChainHead`. Nunca apagada, nunca bloqueia.
   - `SETUP` = **exatamente** o que o onboarding escreve (E7). Candidatos pela leitura, que o executor confirma
     *medindo* (item 10): `KitInstallation`, `Account`, `ReferentialMapping`, `AccountingPeriod` (as
     `AccountingPeriodTransition` caem pela FK, E9), `AccountingBinding`, `RoleAccountOverride`,
     `ServiceFiscalProfile`, `FiscalProfile`, `CompanyFiscalProfile`, `AccountingScopeSettings`, sequências vazias.
   - `BLOCKING` = todo o resto (lançamento, posting, AP/AR e baixas, documento fiscal, extrato/conciliação, pacote,
     ativo, LALUR, apuração, Simples, exportações, revisões, atribuição de contador, política versionada…).
   **Regra:** o que o onboarding não escreve, bloqueia. Uma tabela nova nasce `BLOCKING` até alguém a
   classificar. Teste-guarda: lê os `model` do `schema.prisma` e falha se algum `model` com `unitId` ou com
   `userId` contábil estiver fora das três classes, ou em duas delas.
10. **`SETUP` medido, não suposto.** Teste de integração: onboarding Rápido do salão **e** da clínica com
    `fiscal.regime` conhecido → o conjunto de tabelas contábeis com linha do usuário ⊆ `SETUP ∪ TRAIL`. Se o
    passo do kit escrever uma tabela que não está em `SETUP`, o teste falha, e a correção é *classificar*. Não é
    alargar a remoção às cegas. Se a tabela parecer trilha (log de evento), **pare e registre**: é decisão não
    coberta.
11. **Serviço da contabilidade.** Novo `AccountingScopeResetService` (`features/accounting/services/`) com
    `IAccountingScopeResetRepository` (o único com `prisma.*`) e `IAccountingScopeResetPolicy`, mais factory. Um
    método só: `purgeSetupIfNoMovement(userId): Promise<AccountingResetOutcome>`. Dentro de **um**
    `runTransaction` (gate autoritativo dentro da tx: `authoritative-gate-inside-tx`; o `tx` vai a toda chamada
    de repositório: `tx-nao-propagado-ao-repo`):
    1. conta `BLOCKING` por tabela, em todas as unidades do `userId`;
    2. se alguma contagem for maior que 0, lança `SystemResetBlockedByAccountingError` (nada foi apagado);
    3. para cada `unitId` com linha em `SETUP`, faz `audit.append(tx, scope, { eventType: 'accounting.scope_reset', payload: { removed } })` (F-I7-4) **antes** dos deletes, na mesma tx;
    4. apaga `SETUP` em ordem segura de FK (filhos antes dos pais; `Account` por último entre os que o referenciam).
    Teste de integração: (a) só `SETUP` → remove tudo, um evento por unidade, `AuditEvent`/`AuditChainHead` com
    as linhas anteriores intactas e a cadeia válida (hash anterior → novo); (b) um `JournalEntry` → lança, e zero
    linhas removidas em qualquer classe; (c) duas unidades, só uma com movimento → lança, e nada removido nas
    duas.
12. **Integração no reset.** `SystemProvisioningService.resetUserSystem` chama `purgeSetupIfNoMovement`
    **primeiro**. Se lançar, nada não contábil foi apagado. Depois vem a purga do item 2. `atomicUntil`: a
    remoção contábil e a não contábil são commits separados. Se a 2ª falhar, o reset de novo é idempotente (a
    contábil já vazia passa direto). O serviço de onboarding importa o serviço da contabilidade por interface, no
    nível de integração (Contrato §2.1), e **nunca** pelo motor. Teste: onboarding do salão → reset → 204 →
    `POST /dashboard/create` → contabilidade da **nova** unidade ativa (`accounting.status: 'Active'`), sem
    `BindingSectorConflictError`.
13. **Contrato do 409 (D3+, F-I7-1).** `SystemResetBlockedByAccountingError extends AppError` (409,
    `SYSTEM_RESET_BLOCKED_BY_ACCOUNTING`, `details` validado pelo schema da §3) entra na lista do
    `handleApiError` que expõe `details` (E11). A `message` é humana, em pt (o `apiClient` do FE a mostra, E12).
    Teste HTTP: tenant com 1 lançamento → 409 com `details.blocking=[{ table: 'JournalEntry', count: 1 }, …]` →
    as tabelas dinâmicas continuam lá.
14. **`auditCanonical` (F-I7-4).** `'accounting.scope_reset'` entra no allowlist de campos de
    `features/accounting/audit/auditCanonical.ts` no mesmo PR (`removed` é um mapa `tabela → contagem`, sem PII).
    O teste do allowlist fica verde.
15. **Gates do diff.** `dtoShapeSnapshot` com o `SystemResetBlockedDetailsSchema` novo (insira só o schema novo:
    `dto-snapshot-update-reordena-no-windows`); `docs.paths.ts` com o `'409'` em `DELETE /api/dashboard/system`
    e o openapi estático regenerado (`openapi-wiring-static-artifact`); `check:arch`; `tsc` server + testes; a
    integração em shards (`npm run test:integration`).

## 3. Contratos esboçados

```ts
// features/accounting/models/accountingResetClassification.ts
export const ACCOUNTING_RESET_TRAIL = ['AuditEvent', 'AuditChainHead'] as const;
export const ACCOUNTING_RESET_SETUP = [/* medido no item 10 */] as const;
export const ACCOUNTING_RESET_BLOCKING = [/* todo o resto, item 9 */] as const;
export type BlockingTable = (typeof ACCOUNTING_RESET_BLOCKING)[number];
export type SetupTable = (typeof ACCOUNTING_RESET_SETUP)[number];

// features/accounting/dtos/AccountingResetDto.ts
export const SystemResetBlockedDetailsSchema = z.object({
  blocking: z.array(z.object({
    table: z.enum(ACCOUNTING_RESET_BLOCKING),
    count: z.number().int().positive(),
  }).strict()).min(1),
}).strict();

export interface AccountingResetOutcome {
  /** Por unidade: o que saiu de SETUP. Vazio = não havia contabilidade. */
  removed: Array<{ unitId: string; counts: Partial<Record<SetupTable, number>> }>;
}

// lib/errors.ts
export class SystemResetBlockedByAccountingError extends AppError {
  public readonly details: z.infer<typeof SystemResetBlockedDetailsSchema>;
  // 409, 'SYSTEM_RESET_BLOCKED_BY_ACCOUNTING',
  // message: 'O sistema tem movimento contábil (…) e não pode ser resetado. …'
}

// features/onboarding/services/SystemProvisioningService.ts
export interface ISystemProvisioningService {
  assertCanProvision(ctx: UserContext): Promise<void>;
  provision(ctx: UserContext, input: ProvisionInput): Promise<ProvisionResult>;
  /** @throws ForbiddenError | SystemResetBlockedByAccountingError */
  resetUserSystem(ctx: UserContext): Promise<void>;
}
// ISystemProvisioningPolicy += canResetSystem(ctx: UserContext): boolean

// features/accounting/services/AccountingScopeResetService.ts
export interface IAccountingScopeResetService {
  /** @throws SystemResetBlockedByAccountingError — gate DENTRO da tx; trilha nunca apagada */
  purgeSetupIfNoMovement(userId: string): Promise<AccountingResetOutcome>;
}

// auditCanonical.ts
'accounting.scope_reset': ['removed'],
```

HTTP, `DELETE /api/dashboard/system`:
- `204`: reset feito (ou o sistema já estava vazio).
- `401`: sem autenticação.
- `403`: a policy recusou.
- `409` **(novo, D3+)**:
  `{ code: 'SYSTEM_RESET_BLOCKED_BY_ACCOUNTING', message, details: { blocking: [{ table, count }] } }`.

## 4. Divisão em PRs

| PR | Itens | Perfil | Depende |
|---|---|---|---|
| PR-1 | 1–8 (purga não contábil, cache, policy, T0, rota testada) | `sonnet-medio` | — |
| PR-2 | 9–15 (classificação, serviço contábil com gate na tx, evento na trilha, 409) | `opus-medio` (remove configuração contábil e grava na trilha) | PR-1 (o `resetUserSystem` separado) |

Os dois são BE. O FE é nó vizinho (§7).

## 5. Pendente de validação externa

Vazia. Nenhum item cria regra contábil ou fiscal. A remoção só alcança configuração **sem movimento** e preserva a
trilha. O ponto em que um contador poderia opinar (pode-se descartar plano e período vazios de uma unidade que
nunca lançou?) não tem artefato normativo: o tenant nunca escriturou nada. Se o dono quiser essa validação, ela
entra no pacote do `luminaris-contador-liaison`, e não aqui.

## 6. Insumos ausentes

1. O conjunto exato de `SETUP`. A leitura dá os candidatos (E7), e o item 10 mede. Se aparecer uma tabela que
   tenha cara de log, é pausa registrada, não decisão do executor.

## 7. Achados fora de escopo (registrados, não planejados)

- **FE do 409:** o `DashboardSidebar` só mostra a `message` (E12). Um modal com as contagens por tipo e o caminho
  para resolver seria um `FE-INCR` à parte, e precisa de autorização própria.
- **`GET /dashboard/system` não existe no BE.** Mesmo assim, `analytics.service.getSystemStatus` e
  `dynamic-table.service.getSystem` o chamam (`my-app/lib/services/*.ts`). Medido por grep; não sei se tem
  consumidor vivo.
- **Contador com acesso ao escopo:** um `AccountantAssignment` ativo é `BLOCKING` pela regra do item 9 (o
  onboarding não o escreve). O dono revoga o contador antes de resetar. É consequência, não fork. Se o dono
  preferir outra coisa, vira emenda.
