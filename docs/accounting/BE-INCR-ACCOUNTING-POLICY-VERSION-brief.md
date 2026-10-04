# BE-INCR-ACCOUNTING-POLICY-VERSION — parâmetros de política versionados com aprovação do contador (PLANO, não executar)

> **Estado: BRIEF pronto, forks F-POL-1..7 ✅ RATIFICADOS 04/10** (questionário do dono, todos na recomendação —
> §5.1; nenhum fork pendente). Produzido por `sessao-planejamento` em 2026-10-03/04 contra `origin/main` **`0ace46a6`**, números do re-key e do openapi reconferidos em **`fe842379`** (04/10). Não contém código de aplicação. **Código exige "executa" próprio do
> dono** (ORCH-006).

## 0. Cabeçalho

- **Item:** nó [[GOV-CONTADOR]], "Falta: […] política versionada (F-GOV-6 b)". Origem: passo 5.2 do
  [`PLANO-POS-CONTADOR-2026-09-23`](PLANO-POS-CONTADOR-2026-09-23.md) ("parâmetros de política versionados com
  aprovação"), PRE-ADR [`ACCOUNTANT-GOVERNANCE`](../adr/PRE-ADR-ACCOUNTANT-GOVERNANCE.md) §3 item 3
  (`AccountingPolicyVersion`), e §6 de [`BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md`](BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md):
  *"vai em incremento próprio. As configurações da família I-3 continuam com o operador até lá. É esse incremento que
  entrega a 'aprovação do contador' citada no F-PC-1 (b) e no F-PC-2 (b)."*
- **Autorização:** dono, chat, 03/10/2026: *"Planeja os BRIEFs das telas e da política versionada do GOV-CONTADOR
  (dono, 03/10/2026) — sessao-planejamento. […] (2) BE: política versionada (F-GOV-6 b; AccountingPolicyVersion citado
  em BE-INCR-ACCOUNTANT-GOVERNANCE-brief §6). Se criar model com unitId, o BRIEF tem que mandar classificá-lo no
  inventário do re-key (caso #493). Forks novos vão para mim por questionário. Sem 'executa'."*
- **A autorização cobre exatamente este item?** Sim, com um recorte. O §6 do BRIEF do BE cita **F-PC-1 (b) e
  F-PC-2 (b)**. O F-PC-1 (b) está dentro: é o caso-modelo deste incremento ("o default continua 'não credita', e o
  cliente liga com a aprovação do contador", PLANO-POS-CONTADOR, Fase 1). O **F-PC-2 foi ratificado em (a)** em 25/09
  ("alerta só no `warnings` da importação"); o (b) dele é **persistir** o alerta de CST divergente para a revisão do C11.
  Isso é outra capacidade (alerta persistido, não parâmetro aprovado) e vai para §9. A tela vai para o BRIEF irmão do
  FE só no que já existe; a tela da política é nó vizinho (§9).
- **Intenção (T1).** O objetivo não é "ter versão". É que, com contador responsável ativo, **um parâmetro que muda o
  resultado contábil ou fiscal não mude sem a aprovação dele**, e que se saiba **quem aprovou o estado que estava em
  vigor em cada instante**. Sem contador, nada muda para o usuário (F-GOV-4 a).
- **Risco principal.** Com contador ativo, o `PUT` de hoje deixa de aplicar (F-POL-3/F-POL-4). Isso **quebra a tela
  `FixedAssetAccountsSection`** (único consumidor de `PUT /settings` no FE, `FixedAssetAccountsSection.tsx:78`) para o
  dono com contador, até a tela de proposta existir. O perfil fiscal não tem tela (grep vazio no my-app), então lá a
  quebra é só de API. Em segundo lugar: a aprovação no app é atestado interno, como o sign-off (BRIEF do BE §7).

## 1. Forks já decididos que fixam este desenho

| Fork | Decisão | O que fixa aqui |
|---|---|---|
| F-GOV-6 | (b) incremento próprio, depois do papel | Este BRIEF. O papel (`AccountantAssignment`) já existe (#482) |
| F-GOV-4 | (a) empresa sem contador não trava | Sem `ACTIVE`, o `PUT` aplica como hoje |
| F-GOV-3 | (a) o contador tranca reabertura + assinatura | O corpo de `canManageFiscalProfile`/`canManageAccountingSettings` **não muda**; a trava nova é um gate de serviço (item 6) |
| F-GOV-7 | (a+) contador sem escrita no razão | O contador aprova ou rejeita; não propõe nem edita a configuração |
| F-GOV-11 | (a) a atribuição ativa governa tudo | Quem aprova é o contador `ACTIVE` no instante da decisão, sem cobertura por período |
| Resolver pelo par | dono, 03/10 (adendo do #482): `ownerUserId` explícito, par sem ACTIVE → 403 `ACCOUNTANT_NOT_ASSIGNED` | Os handlers novos do contador usam `resolveGovernanceScope(user, unitId, ownerUserId)` |
| F-RK-5 + D-2026-10-03 §1 | KEEP só para trilha com hash; model de escopo sem hash → REKEY | O model novo entra em `REKEY_MODELS` (item 2) |
| F-PC-1 | (b) default "não credita"; o cliente liga com aprovação do contador | `pisCofinsCreditFromSimplesSupplier` (`FiscalProfile`) é parâmetro governado |

## 2. Inventário conferido

Grau: **V** = lido em `0ace46a6` · **I** = inferido do código lido.

| # | Fato | Evidência | Grau |
|---|---|---|---|
| P-1 | `FiscalProfile` é 1 linha por `(userId, unitId)` com os parâmetros de custo/crédito (regime, ICMS, PIS/COFINS, `pisCofinsCreditFromSimplesSupplier`), contas de tributo e o D1f da emissão | `schema.prisma`, `model FiscalProfile`, `@@unique([userId, unitId])` | V |
| P-2 | `PUT /fiscal-profile` é **substituição completa** com defaults do Zod; roda numa tx própria (`repo.runTransaction`) e grava `fiscal_profile.updated` com o estado **pós** de todos os campos governados | `FiscalProfileService.ts:150-200`; `FiscalProfileDto.ts:30-60`; `auditCanonical.ts:142` | V |
| P-3 | Por isso o **histórico do perfil fiscal já existe** na cadeia de auditoria com hash. Falta só a aprovação e quem aprovou | P-2 | V |
| P-4 | `AccountingScopeSettings` é 1 linha por `(userId, unitId)` com 6 contas (encargos, depreciação, ganho/perda na baixa, Parte B). O `PUT /settings` é **parcial** (só as chaves enviadas), valida as contas **fora** de tx e grava sem tx | `AccountingScopeSettingsService.ts:58-100`; `AccountingScopeSettingsDto.ts` | V |
| P-5 | A configuração por escopo **não tem evento de auditoria**: nenhum `append(` no serviço. Hoje não existe histórico dela | grep `append(` em `AccountingScopeSettingsService.ts` vazio | V |
| P-6 | O repo das settings já aceita `tx` (`getSettings`/`upsertSettings`, `BankSettlementRepository.ts:198-215`) | leitura | V |
| P-7 | `CompanyFiscalProfile` é por `(userId, anoCalendario)`, **sem `unitId`**. A atribuição do contador é por `(userId, unitId)` | `schema.prisma`; `@@unique([userId, anoCalendario])` | V |
| P-8 | `ServiceFiscalProfile`, `FixedAssetClass` e `DepreciationRate` são **coleções** (N linhas por escopo, criar/editar/ocultar), não uma linha de parâmetros | `schema.prisma` | V |
| P-9 | O inventário do re-key falha fechado com model novo que tenha `unitId`: `UNCLASSIFIED_MODEL`, e o teste fixa **51 = 49 REKEY + 2 KEEP** desde o #504 (`TaxAssessment`, 04/10; eram 50 = 48 + 2 em `0ace46a6`) | `jobs/rekeyLegacyUnitCli.ts:46-61,80-93`; `__tests__/rekeyLegacyUnitCli.integration.test.ts:149-152` (em `fe842379`) | V |
| P-10 | O caso #493: dois PRs verdes sozinhos, cada um com um model novo com `unitId`, deixaram o `main` vermelho ao mergear | `D-2026-10-03-INTEGRACAO-REKEY-ECF-X7` §1 | V |
| P-11 | `resolveGovernanceScope(user, unitId, ownerUserId?)` e `findActive(scope, tx)` já existem e são o padrão do gate em dois níveis | #482; `AccountantAssignmentService.ts`; `IAccountantAssignmentRepository.ts` | V |
| P-12 | `BASELINE` do `openapi-paths` está em **239** em `fe842379` (era 236 em `0ace46a6`) | `src/__tests__/openapi-paths.test.ts:103` | V |
| P-13 | Consumidores no FE: `PUT /settings` ← `FixedAssetAccountsSection.tsx:78`; `PUT /fiscal-profile` sem consumidor | grep em `my-app/` | V |
| P-14 | A política contábil dos dois `canManage…` é `canClosePeriod` (`!!actor`); o teste `AccountingPolicy.governance.test.ts` (17a do #482) fixa que ela **não muda** para o dono com atribuição ativa | `AccountingPolicy.ts`; o teste | V |

## 3. Checklist numerado (cada item testável sozinho)

> Padrão de camada é requisito: Route → Controller → Service → Repository → Prisma, mais Policy, Factory, DTO Zod
> `.strict()` e soft-delete (Contrato §2/§3). Todo gate de invariante mutável roda em **dois níveis**: preflight fora da
> tx e re-checagem autoritativa **dentro** do `runTransaction`, com `tx` propagado ao repo (memórias
> `authoritative-gate-inside-tx`, `tx-nao-propagado-ao-repo`). O desenho abaixo está na recomendação de cada fork de §5;
> onde um fork mudar o desenho, o item diz o quê.

1. **Constantes.** Em `models/ledgerStatus.ts`: `POLICY_VERSION_STATUSES = ['PROPOSED','APPLIED','REJECTED','SUPERSEDED']
   as const`. Em `models/AccountingPolicyVersion.model.ts`: `POLICY_TARGETS = ['FISCAL_PROFILE','SCOPE_SETTINGS'] as const`
   (o conjunto depende do **F-POL-2**) e os eventTypes.
2. **Migração aditiva `accounting_policy_versions`** (§4.3) **e classificação no re-key, no mesmo PR:**
   - Prólogo `IF NOT EXISTS` (memória `migracao-sqlite-nao-e-transacional`).
   - "No máximo 1 `PROPOSED` por `(userId, unitId, target)`" por coluna-slot anulável em `@@unique`, como o #482
     (precedente I-12 do BRIEF do BE). O slot volta a `NULL` em toda saída de `PROPOSED`.
   - **Re-key (pedido explícito do dono, caso #493):** `'AccountingPolicyVersion'` entra em `REKEY_MODELS`
     (`jobs/rekeyLegacyUnitCli.ts`) com o comentário do critério: *"parâmetro do escopo, sem hash; o payload não
     carrega `unitId` (item 7) → REKEY pelo F-RK-5"*. O teste `rekeyLegacyUnitCli.integration.test.ts:149-152` passa
     a **52 = 50 REKEY + 2 KEEP** (contagem de `fe842379`; o #504 já a moveu uma vez durante este planejamento, prova viva do P-10), com o comentário da contagem atualizado. **Direto:** é o critério ratificado do
     F-RK-5 aplicado pela 3ª vez (D-2026-10-03 §1); deixar a linha no `unitId` antigo tiraria do escopo re-chaveado o
     histórico de quem aprovou.
   - **Antes do merge:** rebase no `main` mais recente e re-rodar `rekeyLegacyUnitCli` (unit + integração). Se outro PR
     tiver acrescentado model com `unitId` no meio, a contagem muda de novo (P-10).
   - `resetDb()` (`test/helpers/db.ts`) apaga a tabela nova **antes** de `accountantAssignment` (FK Restrict, §4.3).
3. **Repositório** `IAccountingPolicyVersionRepository` + implementação (§4.2). Toda leitura filtra `deletedAt: null`.
   Toda escrita recebe `tx`. `transition` é **CAS** (`updateMany where status = from`; 0 linhas →
   `ConflictError('POLICY_VERSION_STATUS_CHANGED')`). `nextVersion(scope, target, tx)` = `max(version) + 1` lido na tx.
4. **Policy pura** (§4.2), sem tocar o corpo de nenhum método existente (P-14):
   - `canProposePolicyVersion(scope, target)`: `owner === actor` e o `canManage…` do alvo.
   - `canDecidePolicyVersion(scope, active)`: `!!active && actor === active.accountantUserId && owner === active.ownerUserId`.
   - `canReadPolicyVersions(scope, active)`: `owner === actor` **ou** a regra acima.
5. **Aplicação dentro de tx — um caminho só para `PUT` e aprovação.**
   - `FiscalProfileService`: extrair o corpo de `upsert` (validações de conta + regime da empresa + `repo.upsert` +
     `fiscal_profile.updated`) para `applyInTx(scope, input, tx, policyVersionId)`. O `upsert` passa a chamar
     `applyInTx` dentro do `runTransaction` que já tem.
   - `AccountingScopeSettingsService`: idem `applyInTx(scope, patch, tx, policyVersionId)`; a validação de conta passa a
     usar o `tx` (P-4, P-6). **Efeito colateral declarado:** o `PUT /settings` passa a rodar em tx (hoje não roda). É
     menos código do que manter dois caminhos.
   - Toda aplicação, de qualquer origem, grava a versão `APPLIED` com `appliedSnapshot` = a view completa depois da
     escrita (§4.3) e, se havia `PROPOSED` do mesmo alvo, faz CAS dele para `SUPERSEDED` (item 9 explica quando).
6. **Gate no `PUT` com contador ativo** (F-POL-3 a + F-POL-4 b):
   - Preflight: `findActive(scope)`; se houver, `PolicyApprovalRequiredError` (409 `POLICY_APPROVAL_REQUIRED`), com a
     mensagem apontando `POST /api/accounting/policy-versions`.
   - **Dentro da tx:** relê `findActive(scope, tx)` antes de `applyInTx`. Se apareceu um ACTIVE entre o preflight e a
     tx, 409 igual.
   - Sem ACTIVE (F-GOV-4 a): o `PUT` aplica como hoje e grava a versão `APPLIED` com `decidedById = actor`,
     `assignmentId = null`.
7. **Proposta (dono)** `POST /api/accounting/policy-versions`, corpo `ProposePolicyVersionSchema` (§4.1). Passos:
   1. `canProposePolicyVersion`.
   2. `payload` validado pelo schema do alvo **sem `unitId`** (`.omit({ unitId: true })`); grava-se o resultado do
      parse, com os defaults aplicados, para o contador aprovar exatamente o que vai valer. O `unitId` nunca entra no
      `payload` (é o que permite o REKEY do item 2; o item 15h prova).
   3. Preflight das contas referenciadas (as mesmas asserções do `applyInTx`, só leitura): erro rápido para o dono.
   4. Exige ACTIVE (`findActive`); sem contador, 409 `POLICY_NO_ACCOUNTANT` com a mensagem "use o PUT".
   5. **Dentro da tx:** se há `PROPOSED` do alvo, CAS dele para `SUPERSEDED` (**F-POL-6 a**); cria a nova com
      `version = nextVersion`. Auditoria `policy_version.proposed`.
8. **Leitura.** `GET /api/accounting/policy-versions?unitId=&target=&status=&ownerUserId=` (histórico, mais novo
   primeiro) e `GET /api/accounting/policy-versions/:id?unitId=&ownerUserId=`. O detalhe devolve `payload`, o estado
   **atual** do alvo e o rótulo (`code — name`) de cada conta referenciada nos dois, para o contador avaliar sem ler o
   perfil fiscal (que não é handler delegado). Os dois usam `resolveGovernanceScope` com `ownerUserId` e
   `canReadPolicyVersions`.
9. **Aprovação (contador)** `POST /api/accounting/policy-versions/:id/approve`, corpo `{ unitId, ownerUserId? }`.
   1. `resolveGovernanceScope`; preflight `canDecidePolicyVersion(scope, active)`. Se falhar,
      `AccountantRequiredError` (403, já existe) — ou 403 `ACCOUNTANT_NOT_ASSIGNED` do resolver.
   2. **Na mesma tx, nesta ordem:** relê `active` com `tx` e reaplica `canDecidePolicyVersion` (gate autoritativo);
      CAS `PROPOSED → APPLIED` com `decidedById`, `decidedAt`, `assignmentId = active.id`; `applyInTx(…, payload,
      tx, version.id)`. Se `applyInTx` lançar (conta apagada, regime da empresa mudou), a tx inteira volta e a
      proposta segue `PROPOSED`: o contador vê o 400 e rejeita.
   3. Auditoria `policy_version.applied` (o `fiscal_profile.updated` do `applyInTx` sai na mesma tx, com
      `policyVersionId`). O `actor` dos dois eventos é o contador; o `scopeUserId` é o dono (padrão do #482 item 7).
10. **Rejeição (contador)** `POST /api/accounting/policy-versions/:id/reject`, corpo `{ unitId, ownerUserId?, reason }`
    (`reason` 1..500, obrigatório). Mesmo gate em dois níveis do item 9; CAS `PROPOSED → REJECTED`; auditoria
    `policy_version.rejected`.
11. **Propostas órfãs.** **Direto:** quando a atribuição termina, a `PROPOSED` fica como está. O próximo `PUT` do dono
    (já sem ACTIVE, item 6) aplica e a marca `SUPERSEDED` (item 5). Um contador novo que aceite depois pode aprovar ou
    rejeitar a proposta pendente: a aprovação é do escopo, não da atribuição (F-GOV-11 a).
12. **Erros nomeados** em `lib/errors.ts`, no padrão do `AccountantRequiredError`: `PolicyApprovalRequiredError` (409
    `POLICY_APPROVAL_REQUIRED`) e `PolicyNoAccountantError` (409 `POLICY_NO_ACCOUNTANT`). O resto reusa `ConflictError`
    com código e `ValidationError`.
13. **Controller, rotas, docs, factory.** `controllers/accountingPolicyVersionController.ts` com 5 handlers; registro
    em `routes/accounting.ts` como segmento estático **antes** de `/:unitId/periods` (comentário `:388`); 4 paths em
    `routes/docs.paths.ts`; `BASELINE` 239 → **243** em `openapi-paths.test.ts:103` (reler o valor no momento do PR);
    `public/openapi.json` regenerado (memória `openapi-wiring-static-artifact`). Factory:
    `getAccountingPolicyVersionService()`; injetar o repo novo e o de atribuição em `FiscalProfileService` e
    `AccountingScopeSettingsService`.
14. **Auditoria** (allowlist do `auditCanonical.ts` **na mesma mudança**):
    - `policy_version.proposed`: `['policyVersionId','target','version','supersededId']`.
    - `policy_version.applied`: `['policyVersionId','target','version','assignmentId']`.
    - `policy_version.rejected`: `['policyVersionId','target','version','reason']`; `reason` entra em
      `MASKABLE_FREE_TEXT_KEYS` (`auditFreeTextMask.ts:48`).
    - `'policyVersionId'` entra em `fiscal_profile.updated`.
    - **Nunca** o `payload` inteiro no evento: ele fica na linha da versão. O evento leva só ids e números.
    - Precisa de prova (I): chave nova na allowlist não muda o hash de evento antigo. O item 15i verifica, como o 17i do
      #482.
15. **Testes** (unit com dublês; integração com `npm run test:integration`, `--runInBand`):
    a. **Sem contador = hoje:** `PUT /fiscal-profile` e `PUT /settings` devolvem 200 com o mesmo corpo de antes e gravam
       uma versão `APPLIED` com `assignmentId = null`.
    b. **Com contador ativo:** os dois `PUT` dão 409 `POLICY_APPROVAL_REQUIRED` e **não** mudam a linha (relida do
       banco).
    c. **Gate dentro da tx, nas duas direções** (determinístico, dublê do repo; memória
       `windows-serializa-sqlite-ci-linux-nao`):
       - `PUT`: `findActive` devolve `null` no preflight e `ACTIVE` na releitura com `tx` → 409.
       - `approve`: `ACTIVE` no preflight e `null` na releitura → 403, e a versão segue `PROPOSED`.
       Retirar o gate de dentro da tx de **qualquer** dos dois tem de derrubar um teste.
    d. **Fluxo F-PC-1 (b) ponta a ponta (supertest):** dono convida, contador aceita, dono propõe
       `pisCofinsCreditFromSimplesSupplier: true` → 201 `PROPOSED`; o perfil segue `false`; contador aprova → perfil
       `true`, versão `APPLIED` com `assignmentId`, `fiscal_profile.updated` com `actor = contador` e
       `scopeUserId = dono`.
    e. **Rejeição:** perfil intocado; `reason` vazio dá 400; terceiro dá 404/403.
    f. **Concorrência lógica:** segunda proposta deixa a primeira `SUPERSEDED`; aprovar a `SUPERSEDED` dá 409
       `POLICY_VERSION_STATUS_CHANGED`. Integração: o slot unique segura 2 `PROPOSED` mesmo sem o check do serviço.
    g. **Re-validação na aprovação:** conta referenciada apagada entre a proposta e a aprovação → 400, proposta segue
       `PROPOSED`, perfil intocado.
    h. **Re-key:** `buildInventory()` classifica `AccountingPolicyVersion` como REKEY (52 = 50 + 2 na base `fe842379`); um teste de unidade
       fixa que o `payload` gravado não tem a chave `unitId`.
    i. **Contratos:** allowlist do `auditCanonical`, máscara do `reason`, hash de cadeia gravada antes da mudança.
    j. **Política:** a matriz do 17a do #482 continua verde sem edição (P-14); os 3 métodos novos têm matriz própria
       (dono, contador ativo do par, contador de outro par, terceiro).
16. **Gates do diff:** `cd server && npx tsc --noEmit` limpo (os literais `: IAccountingPolicy = {` dos testes ganham os
    métodos novos, como no #482 item 18); `dtoShapeSnapshot` com `UPDATE_DTO_SNAPSHOT=1` e os `.gen.ts` commitados;
    `cd my-app && npx tsc --noEmit` + `npm run test:types`; `openapi-paths` e `route-spec-wiring` verdes;
    `npm run smoke:migration -- --db <dev.db real>`; unit + integração verdes; `node scripts/plano-vault.mjs check`.

## 4. Contratos (esboço materializável)

### 4.1 DTOs (`dtos/AccountingPolicyVersionDto.ts`)

```ts
import { UpsertFiscalProfileSchema } from './FiscalProfileDto';
import { UpdateAccountingScopeSettingsSchema } from './AccountingScopeSettingsDto';

// F-POL-2 (b): dois alvos. Zod 4: discriminatedUnion de objetos .strict() (memória zod-strip-mata-discriminador).
export const ProposePolicyVersionSchema = z.discriminatedUnion('target', [
  z.object({
    unitId: z.string().min(1),
    target: z.literal('FISCAL_PROFILE'),
    payload: UpsertFiscalProfileSchema.omit({ unitId: true }),          // substituição completa, defaults aplicados
  }).strict(),
  z.object({
    unitId: z.string().min(1),
    target: z.literal('SCOPE_SETTINGS'),
    payload: UpdateAccountingScopeSettingsSchema.omit({ unitId: true }), // patch parcial, como o PUT de hoje
  }).strict(),
]);

export const ListPolicyVersionsQuerySchema = z.object({
  unitId: z.string().min(1),
  target: z.enum(POLICY_TARGETS).optional(),
  status: z.enum(POLICY_VERSION_STATUSES).optional(),
  ownerUserId: z.string().min(1).optional(),            // par contador×dono (resolver do #482)
}).strict();

export const PolicyVersionScopeQuerySchema = z.object({
  unitId: z.string().min(1),
  ownerUserId: z.string().min(1).optional(),
}).strict();

export const ApprovePolicyVersionSchema = PolicyVersionScopeQuerySchema;  // corpo
export const RejectPolicyVersionSchema = z.object({
  unitId: z.string().min(1),
  ownerUserId: z.string().min(1).optional(),
  reason: z.string().trim().min(1).max(500),
}).strict();

// Resposta (instantes ISO)
export interface PolicyVersionView {
  id: string;
  unitId: string;
  target: PolicyTarget;
  version: number;
  status: PolicyVersionStatus;
  payload: Record<string, unknown>;           // o parse do schema do alvo, sem unitId
  appliedSnapshot: Record<string, unknown> | null;
  proposedById: string | null;                // null quando a versão nasceu de PUT direto (sem contador)
  decidedById: string | null;
  assignmentId: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
}
export interface PolicyVersionDetailView extends PolicyVersionView {
  current: Record<string, unknown> | null;    // estado vivo do alvo agora
  accountLabels: Record<string, string>;      // accountId → "1.1.5 — ICMS a recuperar" (payload ∪ current)
}
```

`UpsertFiscalProfileSchema` e `UpdateAccountingScopeSettingsSchema` **não mudam de forma**. O `PUT` continua com o
mesmo corpo; o que muda é a regra do serviço (item 6).

### 4.2 Policy, repositório e serviço

```ts
// policies/IAccountingPolicy.ts (+)
canProposePolicyVersion(scope: AccountingScope, target: PolicyTarget): boolean;
canDecidePolicyVersion(scope: AccountingScope, active: ActiveAccountant | null): boolean;
canReadPolicyVersions(scope: AccountingScope, active: ActiveAccountant | null): boolean;

// repositories/IAccountingPolicyVersionRepository.ts
export interface IAccountingPolicyVersionRepository {
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<AccountingPolicyVersion | null>;
  findPending(scope: AccountingScope, target: PolicyTarget, tx?: Prisma.TransactionClient): Promise<AccountingPolicyVersion | null>;
  list(scope: AccountingScope, filter: { target?: PolicyTarget; status?: PolicyVersionStatus }): Promise<AccountingPolicyVersion[]>;
  nextVersion(scope: AccountingScope, target: PolicyTarget, tx: Prisma.TransactionClient): Promise<number>;
  create(data: NewPolicyVersion, tx: Prisma.TransactionClient): Promise<AccountingPolicyVersion>;
  /** CAS: where { id, status: from } — 0 linhas → ConflictError('POLICY_VERSION_STATUS_CHANGED'). */
  transition(id: string, from: PolicyVersionStatus, to: PolicyVersionStatus,
             patch: PolicyVersionPatch, tx: Prisma.TransactionClient): Promise<AccountingPolicyVersion>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

// services/AccountingPolicyVersionService.ts
propose(scope: AccountingScope, dto: ProposePolicyVersionInput): Promise<PolicyVersionView>;
list(scope: AccountingScope, filter): Promise<PolicyVersionView[]>;
get(scope: AccountingScope, id: string): Promise<PolicyVersionDetailView>;
approve(scope: AccountingScope, id: string): Promise<PolicyVersionView>;
reject(scope: AccountingScope, id: string, reason: string): Promise<PolicyVersionView>;

// FiscalProfileService / AccountingScopeSettingsService (+)
applyInTx(scope: AccountingScope, input: …, tx: Prisma.TransactionClient, policyVersionId: string): Promise<View>;
```

### 4.3 Prisma (migração aditiva)

```prisma
model AccountingPolicyVersion {
  id               String                @id @default(cuid())
  userId           String                // dono do escopo
  user             User                  @relation("PolicyVersionOwner", fields: [userId], references: [id], onDelete: Restrict)
  unitId           String
  target           String                // FISCAL_PROFILE | SCOPE_SETTINGS (POLICY_TARGETS)
  version          Int                   // monotônico por (userId, unitId, target)
  status           String                // PROPOSED | APPLIED | REJECTED | SUPERSEDED
  pendingSlot      String?               // 'PROPOSED' enquanto PROPOSED, senão NULL
  payload          Json                  // parse do schema do alvo, SEM unitId (item 7 — condição do REKEY)
  appliedSnapshot  Json?                 // view completa depois da aplicação; null fora de APPLIED
  proposedById     String?               // null = nasceu de PUT direto sem contador
  decidedById      String?
  assignmentId     String?               // contador que aprovou/rejeitou
  assignment       AccountantAssignment? @relation(fields: [assignmentId], references: [id], onDelete: Restrict)
  decisionReason   String?
  decidedAt        DateTime?
  supersededById   String?
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt
  deletedAt        DateTime?             // contrato §2; nenhuma rota apaga — trilha de aprovação

  @@unique([userId, unitId, target, version])
  @@unique([userId, unitId, target, pendingSlot])  // NULL distinto no SQLite (precedente I-12 do BRIEF do BE)
  @@index([userId, unitId, target, status])
  @@map("accounting_policy_versions")
}
// User: + policyVersionsOwned AccountingPolicyVersion[] @relation("PolicyVersionOwner")
// AccountantAssignment: + policyVersions AccountingPolicyVersion[]
```

**Direto:**
- **FK Restrict** no dono e na atribuição: é trilha de aprovação (memória `audit-log-no-fk-cascade`), como o #482.
- **`appliedSnapshot` em vez de reconstruir por soma de patches:** o `PUT /settings` é parcial (P-4). Sem o snapshot,
  "o que valia no instante T" exigiria refazer a sequência de patches. Com ele, é "a última `APPLIED` com
  `decidedAt ≤ T`".
- **Versão conta também as rejeitadas e substituídas.** O número identifica a proposta, não o estado vigente. O vigente
  é a última `APPLIED`.

### 4.4 Rotas

| Método | Path | Quem | Resolver |
|---|---|---|---|
| POST | `/api/accounting/policy-versions` | dono | padrão |
| GET | `/api/accounting/policy-versions?unitId=&target=&status=&ownerUserId=` | dono ou contador | **delegado** |
| GET | `/api/accounting/policy-versions/:id?unitId=&ownerUserId=` | dono ou contador | **delegado** |
| POST | `/api/accounting/policy-versions/:id/approve` | contador | **delegado** |
| POST | `/api/accounting/policy-versions/:id/reject` | contador | **delegado** |
| PUT | `/api/accounting/fiscal-profile`, `/api/accounting/settings` | dono | padrão; 409 com contador ativo |

**Efeito declarado:** os handlers delegados vão de 9 (F-GOV-7 a+) para **13**. Os 4 novos só leem e decidem versões
de política; nenhum escreve no razão.

## 5. Forks — ✅ RATIFICADOS 2026-10-04 (registro em §5.1)

| Ref | Pergunta | (a) | (b) | (c) | (d) | Recomendação |
|---|---|---|---|---|---|---|
| **F-POL-1** | Forma da versão | **Registro ao lado das tabelas vivas:** `FiscalProfile`/`AccountingScopeSettings` continuam a fonte que os leitores usam; `AccountingPolicyVersion` guarda propostas, aprovações e o snapshot aplicado | A tabela de versões vira a fonte: todo leitor (`nfeCost`, X7, depreciação, emissão…) passa a ler a versão vigente | Sem tabela nova: colunas de proposta pendente nas próprias tabelas vivas; histórico só pela auditoria | — | **(a).** É "dado versionado, não engine" (PRE-ADR §3.3) com o menor raio: nenhum leitor muda. (b) reescreve todos os consumidores do perfil fiscal. (c) não dá histórico às settings, que hoje não têm auditoria (P-5), e mistura estado pendente com estado vigente na mesma linha |
| **F-POL-2** | Quais parâmetros ficam sob aprovação | Só `FiscalProfile` | **`FiscalProfile` + `AccountingScopeSettings`** (as duas linhas únicas por unidade) | (b) + `CompanyFiscalProfile` (regime anual, forma de apuração, declarante) | Toda a família I-3, incluindo as coleções (`ServiceFiscalProfile`, `FixedAssetClass`, `DepreciationRate`) | **(b).** As duas são parâmetro puro por `(userId, unitId)`, o mesmo escopo da atribuição. (c) esbarra no P-7: o perfil da empresa não tem `unitId`, e com unidades em contadores diferentes não há "o" contador que aprova; precisa de regra própria. (d) versiona coleções, uma forma diferente (criar/editar/ocultar N linhas), que cabe num incremento seguinte. (a) deixa as contas de depreciação e de encargos sem aprovação, e elas mudam o lançamento tanto quanto o perfil |
| **F-POL-3** | Dono muda parâmetro com contador ativo | **Vira proposta; só vale depois da aprovação** | Aplica na hora; o contador ratifica depois (rejeitar reverte) | Só o contador edita a configuração (escrita delegada) | — | **(a).** É o texto do F-PC-1 (b): "o cliente liga com a aprovação do contador". Em (b), o valor não aprovado já entrou em importações e lançamentos antes da ratificação, e reverter não desfaz o efeito. (c) dá escrita ao contador, contra o F-GOV-7 (a+), e tira do operador a configuração, contra o F-GOV-3 (a) |
| **F-POL-4** | Forma da API sob (a) | O `PUT` vira proposta em silêncio: 202 com a versão | **O `PUT` responde 409 `POLICY_APPROVAL_REQUIRED`; a proposta tem rota própria** (`POST /policy-versions`) | — | — | **(b).** `PUT` que devolve sucesso sem aplicar engana quem o chama hoje (a tela de contas do imobilizado, P-13, mostraria "salvo"). Com 409, o cliente antigo falha alto, e o novo fala com a rota de proposta de forma explícita |
| **F-POL-5** | O lançamento/importação registra a versão de política usada? | **Não; "o que valia em T" sai da última `APPLIED` com `decidedAt ≤ T`** | Sim: `policyVersionId` nos consumidores (lançamento, importação de NF-e, apuração) | — | — | **(a).** (b) põe coluna nova em tabelas do razão e muda cada consumidor. O snapshot com instante (§4.3) já responde a pergunta. Se a auditoria do contador pedir o carimbo por lançamento, ele entra depois sem desfazer (a) |
| **F-POL-6** | Nova proposta com outra pendente | **A nova substitui a pendente** (`SUPERSEDED`, na mesma tx); aprovar a antiga dá 409 | 409 `POLICY_PROPOSAL_PENDING_EXISTS` + rota de retirada para o dono | — | — | **(a).** Menos uma rota e um estado. O dono nunca fica preso esperando um contador que não decide. O CAS impede que o contador aprove uma proposta já substituída. (b) segue o precedente do convite do #482 (409 para PENDING duplicado), que tem rota de encerramento para não prender |
| **F-POL-7** | Versão inicial dos escopos que já existem | **Nenhuma: o histórico começa na primeira mudança depois do deploy** | Migração de dado cria a versão 1 `APPLIED` com o estado atual de cada linha | Versão 1 criada sob demanda, na primeira leitura do histórico | — | **(a).** O estado anterior não foi aprovado por ninguém, e o histórico diz isso sem inventar um aprovador. O perfil fiscal já tem a trilha anterior em `fiscal_profile.updated` (P-3). (b) é migração de dado, que o S6 reprova por desenho (memória `smoke-gate-s6-x-migracao-de-dado`), e o backfill do PACOTE-VALIDADE mostrou o custo. (c) escreve dentro de leitura |

### 5.1 RATIFICAÇÃO — 2026-10-04 (dono, questionário; pedido: *"Forks novos vão para mim por questionário"*)

| Fork | Escolha do dono | Contra a recomendação? |
|---|---|---|
| F-POL-1 | (a) registro ao lado das tabelas vivas | não |
| F-POL-2 | (b) `FiscalProfile` + `AccountingScopeSettings` | não |
| F-POL-3 | (a) vira proposta; só vale depois da aprovação | não |
| F-POL-4 | (b) `PUT` → 409 `POLICY_APPROVAL_REQUIRED` + `POST /policy-versions` | não |
| F-POL-5 | (a) sem carimbo; vigente em T = última `APPLIED` com `decidedAt ≤ T` | não |
| F-POL-6 | (a) a nova proposta substitui a pendente | não |
| F-POL-7 | (a) sem versão inicial; o histórico começa no deploy | não |

Efeito: o §3 e o §4 valem como escritos (foram redigidos na recomendação). Não é "executa".

## 6. Pendente de validação externa

- **O contador não validou a lista de parâmetros.** O item 0 da resposta dele (23/09) pede política aprovada pelo
  contador, mas não lista quais. O F-POL-2 é escolha de produto até ele confirmar. O `luminaris-contador-liaison` pode
  montar a pergunta; o dono envia.
- **Valor da aprovação no app:** é atestado interno, com o mesmo alcance do sign-off (BRIEF do BE §7; MP 2.200-2 art.
  10 § 2º). Tratar como fato consumado exige a leitura do contador.
- **F-GOV-1 (CRC-SP)** segue do dono. A resposta pode mudar quem decide parâmetro fiscal (software × serviço contábil).

## 7. Insumos ausentes

- Nenhum que bloqueie o desenho. A resposta integral do contador ao item 0 não foi relida (mesma ressalva do BRIEF do BE
  §8); o F-POL-2 depende dela, e o §6 registra.

## 8. Ordem e dependências

- **Depende de:** #482 (mergeado). Nada mais.
- **Desbloqueia:** o FE da política (nó vizinho, §9) e a tela `FixedAssetAccountsSection` para o dono com contador ativo.
- **Recomendação de ordem:** mergear este BE só junto com, ou depois de, o FE de proposta, ou aceitar por escrito que a
  tela de contas do imobilizado dá 409 para quem tem contador ativo nesse intervalo (risco principal, §0). Hoje não há
  produção: o [[M2]] (1º deploy) está `human-open` no `_INDEX` (V). Logo nenhum escopo real tem contador ativo, e o
  intervalo é teórico até o M2 (I, decorre do anterior).

## 9. Achados fora de escopo (não planejados)

- **F-PC-2 (b) — alerta de CST divergente persistido para a revisão do C11:** citado no §6 do BRIEF do BE junto com
  este incremento, mas é capacidade diferente (persistir `warnings` de importação). F-PC-2 foi ratificado em (a); o (b)
  pede autorização própria.
- **FE da política versionada** (propor, ver o diff, aprovar, rejeitar): nó vizinho, BRIEF e autorização próprios. O
  BRIEF irmão `FE-INCR-ACCOUNTANT-GOVERNANCE` não o cobre.
- **`CompanyFiscalProfile` e as coleções da família I-3** sob aprovação: ficam como (c)/(d) do F-POL-2.
- **`PUT /settings` sem auditoria** (P-5): este incremento dá histórico às settings pela tabela de versões, não por
  evento próprio. Um `scope_settings.updated` na cadeia é outra decisão.
- **Carimbo de versão por lançamento** (F-POL-5 b), se o contador pedir.
