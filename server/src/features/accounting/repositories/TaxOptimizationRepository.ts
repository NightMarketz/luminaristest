import prisma from '../../../lib/prisma';
import type { Prisma, ServiceCostEvidence, TaxOptimizationPolicy, TaxOptimizationSuggestion } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  ITaxOptimizationRepository,
  ServiceCostEvidenceData,
  SuggestionDecision,
  TaxOptimizationPolicyData,
  TaxOptimizationSuggestionData,
} from './ITaxOptimizationRepository';

/** Prisma-backed `tax_optimization_policies`, `service_cost_evidences` e `tax_optimization_suggestions` (EFICIENCIA-FISCAL PR-1). */
export class TaxOptimizationRepository implements ITaxOptimizationRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async listPolicies(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<TaxOptimizationPolicy[]> {
    return this.db(tx).taxOptimizationPolicy.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null },
      orderBy: [{ vigenteDesde: 'asc' }, { createdAt: 'asc' }],
    });
  }

  public async createPolicy(scope: AccountingScope, data: TaxOptimizationPolicyData, tx?: Prisma.TransactionClient): Promise<TaxOptimizationPolicy> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.db(tx).taxOptimizationPolicy.create({ data: { userId, unitId, createdById: scope.actorUserId, ...data } });
  }

  public async closePolicy(id: string, vigenteAte: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).taxOptimizationPolicy.update({ where: { id }, data: { vigenteAte } });
  }

  public async listServiceCosts(scope: AccountingScope, serviceRefs?: readonly string[], tx?: Prisma.TransactionClient): Promise<ServiceCostEvidence[]> {
    return this.db(tx).serviceCostEvidence.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null, ...(serviceRefs ? { serviceRef: { in: [...serviceRefs] } } : {}) },
      orderBy: [{ serviceRef: 'asc' }, { vigenteDesde: 'asc' }, { createdAt: 'asc' }],
    });
  }

  public async findServiceCost(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<ServiceCostEvidence | null> {
    return this.db(tx).serviceCostEvidence.findFirst({ where: { ...accountingScopeWhere(scope), id, deletedAt: null } });
  }

  public async createServiceCost(scope: AccountingScope, data: ServiceCostEvidenceData, tx?: Prisma.TransactionClient): Promise<ServiceCostEvidence> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.db(tx).serviceCostEvidence.create({ data: { userId, unitId, createdById: scope.actorUserId, ...data } });
  }

  public async softDeleteServiceCost(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).serviceCostEvidence.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  public async listSuggestions(scope: AccountingScope, status?: string, tx?: Prisma.TransactionClient): Promise<TaxOptimizationSuggestion[]> {
    return this.db(tx).taxOptimizationSuggestion.findMany({
      where: { ...accountingScopeWhere(scope), ...(status ? { status } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  public async findSuggestion(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<TaxOptimizationSuggestion | null> {
    return this.db(tx).taxOptimizationSuggestion.findFirst({ where: { ...accountingScopeWhere(scope), id } });
  }

  public async findPendingSuggestion(
    scope: AccountingScope,
    key: { practice: string; subjectType: string; subjectId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<TaxOptimizationSuggestion | null> {
    const { practice, subjectType, subjectId } = key;
    return this.db(tx).taxOptimizationSuggestion.findFirst({
      where: { ...accountingScopeWhere(scope), practice, subjectType, subjectId, pendingSlot: 'PROPOSED' },
    });
  }

  public async createSuggestion(scope: AccountingScope, data: TaxOptimizationSuggestionData, tx?: Prisma.TransactionClient): Promise<TaxOptimizationSuggestion> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.db(tx).taxOptimizationSuggestion.create({ data: { userId, unitId, status: 'PROPOSED', pendingSlot: 'PROPOSED', ...data } });
  }

  public async transitionSuggestion(
    id: string,
    from: string,
    to: string,
    decision: SuggestionDecision | null,
    tx?: Prisma.TransactionClient,
  ): Promise<TaxOptimizationSuggestion | null> {
    const { count } = await this.db(tx).taxOptimizationSuggestion.updateMany({
      where: { id, status: from },
      data: { status: to, pendingSlot: null, ...(decision ?? {}) },
    });
    if (count !== 1) return null;
    return this.db(tx).taxOptimizationSuggestion.findUnique({ where: { id } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
