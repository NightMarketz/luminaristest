import type { AccountingPolicyVersion, Prisma } from 'generated/prisma';
import { AccountantRequiredError, ForbiddenError, NotFoundError, PolicyNoAccountantError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { ILalurRepository } from '../repositories/ILalurRepository';
import type { IAccountantAssignmentRepository } from '../repositories/IAccountantAssignmentRepository';
import type { IAccountingPolicyVersionRepository } from '../repositories/IAccountingPolicyVersionRepository';
import {
  POLICY_VERSION_APPLIED,
  POLICY_VERSION_PROPOSED,
  POLICY_VERSION_REJECTED,
  type PolicyTarget,
} from '../models/AccountingPolicyVersion.model';
import type { PolicyVersionStatus } from '../models/ledgerStatus';
import { FiscalProfilePolicyPayloadSchema } from '../dtos/FiscalProfileDto';
import { ScopeSettingsPolicyPayloadSchema } from '../dtos/AccountingScopeSettingsDto';
import type {
  PolicyVersionDetailView,
  PolicyVersionView,
  ProposePolicyVersionInput,
} from '../dtos/AccountingPolicyVersionDto';
import type { AuditService } from './AuditService';
import type { FiscalProfileService } from './FiscalProfileService';
import type { AccountingScopeSettingsService } from './AccountingScopeSettingsService';
import { toPolicyJson } from './policyVersionApply';

/** Chaves de conta (`Account`) por alvo — rótulo `code — name` no detalhe (item 8). */
const ACCOUNT_KEYS: Record<PolicyTarget, readonly string[]> = {
  FISCAL_PROFILE: [
    'icmsRecuperavelAccountId', 'pisCofinsRecuperavelAccountId', 'insumoExpenseAccountId',
    'irpjDespesaAccountId', 'csllDespesaAccountId', 'irpjRecolherAccountId', 'csllRecolherAccountId',
  ],
  SCOPE_SETTINGS: [
    'bankChargeExpenseAccountId', 'bankChargeIncomeAccountId', 'depreciationExpenseAccountId',
    'disposalGainAccountId', 'disposalLossAccountId',
  ],
};
/** `depreciationParteBAccountId` aponta para `LalurParteBAccount`, não `Account` (FK diferente). */
const PARTE_B_KEY = 'depreciationParteBAccountId';

/** Linha → resposta da API (§4.1): sem slot, `userId` nem `deletedAt`. */
export function toPolicyVersionView(v: AccountingPolicyVersion): PolicyVersionView {
  return {
    id: v.id,
    unitId: v.unitId,
    target: v.target as PolicyTarget,
    version: v.version,
    status: v.status as PolicyVersionStatus,
    payload: v.payload as Record<string, unknown>,
    appliedSnapshot: (v.appliedSnapshot as Record<string, unknown> | null) ?? null,
    proposedById: v.proposedById,
    decidedById: v.decidedById,
    assignmentId: v.assignmentId,
    decisionReason: v.decisionReason,
    decidedAt: v.decidedAt ? v.decidedAt.toISOString() : null,
    createdAt: v.createdAt.toISOString(),
  };
}

/**
 * AccountingPolicyVersionService — parâmetros de política versionados com aprovação do contador
 * (BE-INCR-ACCOUNTING-POLICY-VERSION, nó GOV-CONTADOR, F-GOV-6 b; BRIEF itens 7–11). FIRST-CLASS PRISMA; não chama
 * `postEntry`.
 *
 * - F-POL-1 (a): registro ao lado das tabelas vivas — os leitores seguem lendo `FiscalProfile`/`AccountingScopeSettings`.
 * - F-POL-3 (a): com contador ACTIVE, a mudança só vale depois da aprovação; a aplicação é o MESMO `applyInTx` do PUT.
 * - F-POL-6 (a): nova proposta substitui a pendente na mesma tx; aprovar a substituída cai no CAS (409).
 * - Gate em dois níveis em approve/reject: preflight fora da tx e releitura da atribuição ACTIVE com `tx` antes do CAS.
 * - Propostas órfãs (item 11): ficam PROPOSED; o próximo PUT sem contador as substitui; um contador novo pode decidir.
 */
export class AccountingPolicyVersionService {
  constructor(
    private readonly repo: IAccountingPolicyVersionRepository,
    private readonly assignmentRepo: IAccountantAssignmentRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    private readonly fiscalProfileService: FiscalProfileService,
    private readonly scopeSettingsService: AccountingScopeSettingsService,
    private readonly accountRepo: IAccountRepository,
    private readonly lalurRepo: ILalurRepository,
  ) {}

  /** Item 7: proposta do dono. */
  async propose(scope: AccountingScope, dto: ProposePolicyVersionInput): Promise<PolicyVersionView> {
    if (!this.policy.canProposePolicyVersion(scope, dto.target)) {
      throw new ForbiddenError('Você não tem permissão para propor mudança de política neste escopo.');
    }
    // 7.3: preflight das contas — as mesmas asserções do applyInTx, só leitura.
    if (dto.target === 'FISCAL_PROFILE') await this.fiscalProfileService.validate(scope, dto.payload);
    else await this.scopeSettingsService.validate(scope, dto.payload);
    // 7.4: sem contador não há quem aprove (F-GOV-4 a: use o PUT).
    if (!(await this.assignmentRepo.findActive(scope))) throw new PolicyNoAccountantError();
    return this.repo.runTransaction(async (tx) => {
      // Releitura autoritativa (preâmbulo do §3: todo gate em dois níveis) — atribuição encerrada entre o preflight e a tx.
      if (!(await this.assignmentRepo.findActive(scope, tx))) throw new PolicyNoAccountantError();
      const pending = await this.repo.findPending(scope, dto.target, tx);
      if (pending) {
        // F-POL-6 (a): libera o slot ANTES de criar a nova (o @@unique do slot seguraria a 2ª PROPOSED).
        await this.repo.transition(pending.id, 'PROPOSED', 'SUPERSEDED', {}, tx);
      }
      const created = await this.repo.create(
        {
          userId: scope.ownerUserId,
          unitId: scope.unitId,
          target: dto.target,
          version: await this.repo.nextVersion(scope, dto.target, tx),
          status: 'PROPOSED',
          payload: toPolicyJson(dto.payload), // parse com defaults, SEM unitId (condição do REKEY)
          proposedById: scope.actorUserId,
        },
        tx,
      );
      if (pending) {
        // O id da substituta só existe agora: grava o elo com CAS no estado que acabamos de pôr (mesma tx).
        await this.repo.transition(pending.id, 'SUPERSEDED', 'SUPERSEDED', { supersededById: created.id }, tx);
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: POLICY_VERSION_PROPOSED,
        targetType: 'accounting_policy_version',
        targetId: created.id,
        payload: { policyVersionId: created.id, target: created.target, version: created.version, supersededId: pending?.id },
      });
      return toPolicyVersionView(created);
    });
  }

  /** Item 8: histórico do escopo, mais novo primeiro (dono ou contador ativo do par). */
  async list(
    scope: AccountingScope,
    filter: { target?: PolicyTarget; status?: PolicyVersionStatus },
  ): Promise<PolicyVersionView[]> {
    await this.assertCanRead(scope);
    return (await this.repo.list(scope, filter)).map(toPolicyVersionView);
  }

  /** Item 8: detalhe com o estado ATUAL do alvo e o rótulo das contas — o contador avalia sem ler o perfil. */
  async get(scope: AccountingScope, id: string): Promise<PolicyVersionDetailView> {
    await this.assertCanRead(scope);
    const v = await this.repo.findById(scope, id);
    if (!v) throw new NotFoundError(`Versão de política '${id}' não foi encontrada.`);
    const target = v.target as PolicyTarget;
    const current: Record<string, unknown> | null =
      target === 'FISCAL_PROFILE'
        ? ((await this.fiscalProfileService.get(scope)) as unknown as Record<string, unknown> | null)
        : ((await this.scopeSettingsService.get(scope)) as unknown as Record<string, unknown>);
    const payload = v.payload as Record<string, unknown>;
    return { ...toPolicyVersionView(v), current, accountLabels: await this.accountLabels(scope, target, [payload, current]) };
  }

  /** Item 9: aprovação do contador — CAS + aplicação na MESMA tx; falha na aplicação devolve tudo (segue PROPOSED). */
  async approve(scope: AccountingScope, id: string): Promise<PolicyVersionView> {
    await this.assertCanDecide(scope);
    return this.repo.runTransaction(async (tx) => {
      const active = await this.assertCanDecide(scope, tx); // gate autoritativo, antes do CAS
      const found = await this.repo.findById(scope, id, tx);
      if (!found) throw new NotFoundError(`Versão de política '${id}' não foi encontrada.`);
      const applied = await this.repo.transition(
        found.id,
        'PROPOSED',
        'APPLIED',
        { decidedById: scope.actorUserId, decidedAt: new Date(), assignmentId: active.id },
        tx,
      );
      const view =
        applied.target === 'FISCAL_PROFILE'
          ? await this.fiscalProfileService.applyInTx(scope, FiscalProfilePolicyPayloadSchema.parse(applied.payload), tx, applied.id)
          : await this.scopeSettingsService.applyInTx(scope, ScopeSettingsPolicyPayloadSchema.parse(applied.payload), tx, applied.id);
      const withSnapshot = await this.repo.setAppliedSnapshot(applied.id, toPolicyJson(view), tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: POLICY_VERSION_APPLIED,
        targetType: 'accounting_policy_version',
        targetId: applied.id,
        payload: { policyVersionId: applied.id, target: applied.target, version: applied.version, assignmentId: active.id },
      });
      return toPolicyVersionView(withSnapshot);
    });
  }

  /** Item 10: rejeição do contador, motivo obrigatório (validado no DTO). */
  async reject(scope: AccountingScope, id: string, reason: string): Promise<PolicyVersionView> {
    await this.assertCanDecide(scope);
    return this.repo.runTransaction(async (tx) => {
      const active = await this.assertCanDecide(scope, tx);
      const found = await this.repo.findById(scope, id, tx);
      if (!found) throw new NotFoundError(`Versão de política '${id}' não foi encontrada.`);
      const rejected = await this.repo.transition(
        found.id,
        'PROPOSED',
        'REJECTED',
        { decidedById: scope.actorUserId, decidedAt: new Date(), assignmentId: active.id, decisionReason: reason },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: POLICY_VERSION_REJECTED,
        targetType: 'accounting_policy_version',
        targetId: rejected.id,
        payload: { policyVersionId: rejected.id, target: rejected.target, version: rejected.version, reason },
      });
      return toPolicyVersionView(rejected);
    });
  }

  private async assertCanRead(scope: AccountingScope): Promise<void> {
    const active = await this.assignmentRepo.findActive(scope);
    if (!this.policy.canReadPolicyVersions(scope, active)) {
      throw new ForbiddenError('Você não tem permissão para ler as versões de política deste escopo.');
    }
  }

  /** Lê a atribuição ACTIVE (com `tx` quando dentro da tx) e aplica `canDecidePolicyVersion`; 403 se falhar. */
  private async assertCanDecide(scope: AccountingScope, tx?: Prisma.TransactionClient) {
    const active = await this.assignmentRepo.findActive(scope, tx);
    if (!active || !this.policy.canDecidePolicyVersion(scope, active)) {
      throw new AccountantRequiredError('aprovar ou rejeitar a versão de política');
    }
    return active;
  }

  private async accountLabels(
    scope: AccountingScope,
    target: PolicyTarget,
    sources: Array<Record<string, unknown> | null>,
  ): Promise<Record<string, string>> {
    const labels: Record<string, string> = {};
    for (const src of sources) {
      if (!src) continue;
      for (const key of ACCOUNT_KEYS[target]) {
        const id = src[key];
        if (typeof id !== 'string' || labels[id]) continue;
        const a = await this.accountRepo.findById(scope, id);
        if (a) labels[id] = `${a.code} — ${a.name}`;
      }
      const parteB = target === 'SCOPE_SETTINGS' ? src[PARTE_B_KEY] : undefined;
      if (typeof parteB === 'string' && !labels[parteB]) {
        const b = await this.lalurRepo.findParteBById(scope, parteB);
        if (b) labels[parteB] = `${b.codCtaB} — ${b.descricao}`;
      }
    }
    return labels;
  }
}
