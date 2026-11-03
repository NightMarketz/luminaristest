import type { AccountingScope } from '../scope/AccountingScope';
import type { ActiveAccountant, IAccountingPolicy } from './IAccountingPolicy';
import type { PolicyTarget } from '../models/AccountingPolicyVersion.model';

/**
 * Implementation of the accounting policy. Any authenticated user operates within their
 * OWN userId silo (Contract §2). unitId is not gated HERE: the HTTP controllers resolve the scope
 * through AccountingScopeResolver, which validates the client's unitId against the owner's `units`
 * table before any service runs (BE-INCR-SCOPE-UNIT-GUARD, nó I6 — 404 UNIT_NOT_FOUND / 409
 * UNIT_DELETED). Internal callers (jobs, bridges) carry a unitId read from a row already written.
 */
export class AccountingPolicy implements IAccountingPolicy {
  canManage(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canPost(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canRead(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  // ponytail: membership check entra quando unidade for compartilhada
  canClosePeriod(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReconcile(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReadReferential(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canManageReferential(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canManagePayable(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReadPayable(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  /** RETENCOES-FONTE PR-1 (item 6): reusa a regra do AP — quem gere o título gere a retenção dele. */
  canManageWithholdingProfile(scope: AccountingScope): boolean {
    return this.canManagePayable(scope);
  }

  canReadWithholdingProfile(scope: AccountingScope): boolean {
    return this.canReadPayable(scope);
  }

  canManageReceivable(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReadReceivable(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canManageDimension(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReadDimension(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canManageCounterparty(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReadCounterparty(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canManageAccountingContact(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReadAccountingContact(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canManageLalur(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReadLalur(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  // X7 item 19: mesmo predicado de canManageLalur/canReadLalur (troca quando o GOV-CONTADOR for executado).
  canManageTaxAssessment(scope: AccountingScope): boolean {
    return this.canManageLalur(scope);
  }

  canReadTaxAssessment(scope: AccountingScope): boolean {
    return this.canReadLalur(scope);
  }

  canManageInventory(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReadInventory(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  // ponytail: RBAC por papel (F6, ⚫) entra quando os papéis existirem. Aqui só a checagem
  // grosseira de ator; a SoD dinâmica vive em enforcesSegregationOfDuties (abaixo).
  canManageEntryApproval(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canApproveEntry(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  // BE-INCR-RECONCILE-PENDING (nó C7) — mesmo par manage/read de todo recurso do módulo.
  canManageReconcilePending(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  canReadReconcilePending(scope: AccountingScope): boolean {
    return !!scope.actorUserId;
  }

  // BE-INCR-BANK-SETTLEMENT (nó F7, item 11) — composição EXPLÍCITA das policies existentes, não um
  // novo `!!actorUserId`: quando membership chegar, herda o estreitamento de cada uma.
  canReadBankSettlement(scope: AccountingScope): boolean {
    return this.canRead(scope) && this.canReconcile(scope);
  }

  canManageBankSettlement(scope: AccountingScope, titleType: 'PAYABLE' | 'RECEIVABLE'): boolean {
    const byType = titleType === 'PAYABLE' ? this.canManagePayable(scope) : this.canManageReceivable(scope);
    return this.canReconcile(scope) && byType;
  }

  canManageAccountingSettings(scope: AccountingScope): boolean {
    return this.canClosePeriod(scope);
  }

  canReadAccountingSettings(scope: AccountingScope): boolean {
    return this.canRead(scope);
  }

  canManagePaymentAccounts(scope: AccountingScope): boolean {
    return this.canManageAccountingSettings(scope);
  }

  canReadPaymentAccounts(scope: AccountingScope): boolean {
    return this.canReadAccountingSettings(scope);
  }

  // BE-INCR-NFE-COST-REGIME (nó X6, item 2)
  canReadFiscalProfile(scope: AccountingScope): boolean {
    return this.canRead(scope);
  }

  canManageFiscalProfile(scope: AccountingScope): boolean {
    return this.canClosePeriod(scope);
  }

  // BE-INCR-DFE-ADN-EMISSOR PR-1 (item 6): certificado fiscal da unidade — mesma régua do perfil fiscal.
  canManageFiscalCertificate(scope: AccountingScope): boolean {
    return this.canManageFiscalProfile(scope);
  }

  // X10a PR-7 (EMENDA-PSC E-5): credencial do PSC da unidade — mesma régua do perfil fiscal.
  canManagePscCredential(scope: AccountingScope): boolean {
    return this.canManageFiscalProfile(scope);
  }

  // BE-INCR-DFE (nó X10b, BRIEF item 5)
  canManageServiceFiscalProfile(scope: AccountingScope): boolean {
    return this.canManageFiscalProfile(scope);
  }

  // BE-INCR-NFCE (nó X10a, item 10)
  canManageProductFiscalProfile(scope: AccountingScope): boolean {
    return this.canManageFiscalProfile(scope);
  }

  // SIMPLES-PISO-ANEXO-XI bloco 1 (BRIEF item 1)
  canManageIssBeneficioMunicipal(scope: AccountingScope): boolean {
    return this.canManageFiscalProfile(scope);
  }

  // EFICIENCIA-FISCAL PR-1 (BRIEF item 5): política de eficiência fiscal e custo de serviço — mesma régua do perfil fiscal.
  canManageTaxOptimization(scope: AccountingScope): boolean {
    return this.canManageFiscalProfile(scope);
  }

  // EFICIENCIA-FISCAL PR-1 (BRIEF item 7; F-EF-3 a; triagem 21/10): com contador ACTIVE só ele decide; sem ele, o dono
  // com a régua do perfil fiscal. CRITERIO_CARGA só com contador ACTIVE (I-6). Quem propôs não decide — checado no serviço.
  canDecideTaxSuggestion(scope: AccountingScope, active: ActiveAccountant | null, practice: string): boolean {
    if (active) return this.isActiveAccountant(scope, active);
    if (practice === 'CRITERIO_CARGA') return false;
    return !!scope.actorUserId && scope.ownerUserId === scope.actorUserId && this.canManageFiscalProfile(scope);
  }

  canReadFiscalDocument(scope: AccountingScope): boolean {
    return this.canRead(scope);
  }

  // BE-INCR-FIXED-ASSETS (nó C8, item 11)
  canManageFixedAssets(scope: AccountingScope): boolean {
    return this.canClosePeriod(scope);
  }

  canEmitFiscalDocument(scope: AccountingScope): boolean {
    return this.canManage(scope);
  }

  canCancelFiscalDocument(scope: AccountingScope): boolean {
    return this.canManage(scope);
  }

  // BE-INCR-REVIEW-LAYER (nó C11, F-C11-1 → a)
  canReviewAccounting(scope: AccountingScope): boolean {
    return this.canManage(scope);
  }

  canSignOffReview(scope: AccountingScope, active: ActiveAccountant | null): boolean {
    if (active) return this.isActiveAccountant(scope, active);
    return scope.ownerUserId === scope.actorUserId && this.canManage(scope);
  }

  // BE-INCR-ACCOUNTANT-GOVERNANCE (nó GOV-CONTADOR, BRIEF item 4). O corpo de canClosePeriod e da família
  // (configurações, perfil fiscal, imobilizado) NÃO muda (F-GOV-3 a).
  canManageAccountantAssignment(scope: AccountingScope): boolean {
    return !!scope.actorUserId && scope.ownerUserId === scope.actorUserId;
  }

  canRespondToAssignment(actorUserId: string, a: { accountantUserId: string }): boolean {
    return !!actorUserId && actorUserId === a.accountantUserId;
  }

  canEndAssignment(actorUserId: string, a: { userId: string; accountantUserId: string }): boolean {
    return !!actorUserId && (actorUserId === a.userId || actorUserId === a.accountantUserId);
  }

  canReopenPeriod(scope: AccountingScope, active: ActiveAccountant | null): boolean {
    if (active) return this.isActiveAccountant(scope, active);
    return scope.ownerUserId === scope.actorUserId && this.canClosePeriod(scope);
  }

  // BE-INCR-ACCOUNTING-POLICY-VERSION (nó GOV-CONTADOR, BRIEF item 4).
  canProposePolicyVersion(scope: AccountingScope, target: PolicyTarget): boolean {
    if (!scope.actorUserId || scope.ownerUserId !== scope.actorUserId) return false;
    return target === 'FISCAL_PROFILE' ? this.canManageFiscalProfile(scope) : this.canManageAccountingSettings(scope);
  }

  canDecidePolicyVersion(scope: AccountingScope, active: ActiveAccountant | null): boolean {
    return !!active && this.isActiveAccountant(scope, active);
  }

  canReadPolicyVersions(scope: AccountingScope, active: ActiveAccountant | null): boolean {
    return (!!scope.actorUserId && scope.ownerUserId === scope.actorUserId) || this.canDecidePolicyVersion(scope, active);
  }

  private isActiveAccountant(scope: AccountingScope, active: ActiveAccountant): boolean {
    return (
      !!scope.actorUserId &&
      scope.actorUserId === active.accountantUserId &&
      scope.ownerUserId === active.ownerUserId
    );
  }

  // SoD dinâmica (ADR-INCR-APPROVAL F3, re-ratificado fork-a-fork 2026-07-14): OFF enquanto
  // ownerUserId === actorUserId (single-user → staging usável), ativa sozinha quando um delegado
  // opera os livros do dono (ownerUserId !== actorUserId, via membership futuro). Ver
  // resolveAccountingScopeInternal: hoje owner === actor sempre, logo isto é no-op — sem teatro.
  enforcesSegregationOfDuties(scope: AccountingScope): boolean {
    return scope.ownerUserId !== scope.actorUserId;
  }
}
