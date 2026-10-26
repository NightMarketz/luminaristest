import type { Prisma, ServiceCostEvidence, TaxOptimizationPolicy, TaxOptimizationSuggestion } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface TaxOptimizationPolicyData {
  criterioAlocacao: string;
  pisoServico: string;
  vigenteDesde: string;
  suggestionId: string | null;
}

export interface ServiceCostEvidenceData {
  serviceRef: string;
  custoCents: bigint | null;
  catalogoMinimoCents: bigint | null;
  sourceDocumentId: string | null;
  vigenteDesde: string;
  vigenteAte: string | null;
}

export interface TaxOptimizationSuggestionData {
  practice: string;
  subjectType: string;
  subjectId: string;
  legalBasis: Prisma.InputJsonValue;
  estimatedSavingCents: bigint;
  calc: Prisma.InputJsonValue;
  parametrosSha256: string;
  proposedBy: string;
  supersedesId: string | null;
}

export interface SuggestionDecision {
  decidedById: string;
  decidedAt: Date;
  decisionReason: string | null;
}

/**
 * EFICIENCIA-FISCAL PR-1 (BRIEF itens 5 e 7) — único lugar com `prisma.taxOptimizationPolicy.*`,
 * `prisma.serviceCostEvidence.*` e `prisma.taxOptimizationSuggestion.*`. `tx?` em todos; `runTransaction` é o seam de tx.
 * `transitionSuggestion` é o CAS do status (updateMany where status = de) — 0 linhas ⇒ o serviço responde 409.
 */
export interface ITaxOptimizationRepository {
  listPolicies(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<TaxOptimizationPolicy[]>;
  createPolicy(scope: AccountingScope, data: TaxOptimizationPolicyData, tx?: Prisma.TransactionClient): Promise<TaxOptimizationPolicy>;
  closePolicy(id: string, vigenteAte: string, tx?: Prisma.TransactionClient): Promise<void>;

  listServiceCosts(scope: AccountingScope, serviceRefs?: readonly string[], tx?: Prisma.TransactionClient): Promise<ServiceCostEvidence[]>;
  findServiceCost(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<ServiceCostEvidence | null>;
  createServiceCost(scope: AccountingScope, data: ServiceCostEvidenceData, tx?: Prisma.TransactionClient): Promise<ServiceCostEvidence>;
  softDeleteServiceCost(id: string, tx?: Prisma.TransactionClient): Promise<void>;

  listSuggestions(scope: AccountingScope, status?: string, tx?: Prisma.TransactionClient): Promise<TaxOptimizationSuggestion[]>;
  findSuggestion(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<TaxOptimizationSuggestion | null>;
  findPendingSuggestion(
    scope: AccountingScope,
    key: { practice: string; subjectType: string; subjectId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<TaxOptimizationSuggestion | null>;
  /** A sugestão ACCEPTED mais recente do assunto (consulta pontual — I-7). */
  findAcceptedSuggestion(
    scope: AccountingScope,
    key: { practice: string; subjectType: string; subjectId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<TaxOptimizationSuggestion | null>;
  createSuggestion(scope: AccountingScope, data: TaxOptimizationSuggestionData, tx?: Prisma.TransactionClient): Promise<TaxOptimizationSuggestion>;
  /** CAS PROPOSED → ACCEPTED | REJECTED | EXPIRED; devolve a linha nova ou null se o status já não era `from`. */
  transitionSuggestion(
    id: string,
    from: string,
    to: string,
    decision: SuggestionDecision | null,
    tx?: Prisma.TransactionClient,
  ): Promise<TaxOptimizationSuggestion | null>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
