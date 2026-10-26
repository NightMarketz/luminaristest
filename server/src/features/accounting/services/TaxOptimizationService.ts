import type { Prisma, ServiceCostEvidence, TaxOptimizationPolicy, TaxOptimizationSuggestion } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { ActiveAccountant, IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountantAssignmentRepository } from '../repositories/IAccountantAssignmentRepository';
import type { ITaxOptimizationRepository, TaxOptimizationPolicyData } from '../repositories/ITaxOptimizationRepository';
import type { AuditService } from './AuditService';
import type { DecideSuggestionInput, ServiceCostEvidenceInput, SuggestionStatus, UpdateTaxOptimizationPolicyInput } from '../dtos/TaxOptimizationDto';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly, scopeToday } from '../models/dates';
import {
  CRITERIO_CARGA_LEGAL_BASIS,
  FISCAL_GUARD_BLOCKED,
  POLICY_UPDATED,
  POLITICA_PADRAO,
  SERVICE_COST_CREATED,
  SERVICE_COST_DELETED,
  SUGGESTION_ACCEPTED,
  SUGGESTION_PROPOSED,
  SUGGESTION_REJECTED,
  SYSTEM_PROPOSER,
  canonicalSha256,
  vigenteEm,
  type PoliticaVigente,
  type TaxPractice,
} from '../models/taxOptimization';

export interface TaxOptimizationPolicyView extends PoliticaVigente {
  versoes: Array<Omit<PoliticaVigente, 'aprovador'> & { id: string; suggestionId: string | null; createdAt: string }>;
}

export interface ServiceCostEvidenceView {
  id: string;
  serviceRef: string;
  custoCents: string | null;
  catalogoMinimoCents: string | null;
  sourceDocumentId: string | null;
  vigenteDesde: string;
  vigenteAte: string | null;
  createdAt: string;
}

export interface TaxOptimizationSuggestionView {
  id: string;
  unitId: string;
  practice: string;
  subjectType: string;
  subjectId: string;
  status: string;
  legalBasis: unknown;
  estimatedSavingCents: string;
  calc: unknown;
  parametrosSha256: string;
  proposedBy: string;
  decidedById: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  supersedesId: string | null;
  createdAt: string;
}

export type UpdatePolicyResult =
  | { applied: true; policy: TaxOptimizationPolicyView }
  | { applied: false; suggestion: TaxOptimizationSuggestionView };

export interface ProposeSuggestionArgs {
  practice: TaxPractice;
  subjectType: string;
  subjectId: string;
  legalBasis: ReadonlyArray<{ norma: string; artigo: string }>;
  estimatedSavingCents: bigint;
  calc: Record<string, unknown>;
}

const toPolitica = (p: TaxOptimizationPolicy): PoliticaVigente => ({
  id: p.id,
  criterioAlocacao: p.criterioAlocacao as PoliticaVigente['criterioAlocacao'],
  pisoServico: p.pisoServico as PoliticaVigente['pisoServico'],
  aprovador: p.aprovador,
  severidadePisoProporcional: p.severidadePisoProporcional as PoliticaVigente['severidadePisoProporcional'],
  vigenteDesde: p.vigenteDesde,
  vigenteAte: p.vigenteAte,
});

export const toSuggestionView = (s: TaxOptimizationSuggestion): TaxOptimizationSuggestionView => ({
  id: s.id,
  unitId: s.unitId,
  practice: s.practice,
  subjectType: s.subjectType,
  subjectId: s.subjectId,
  status: s.status,
  legalBasis: s.legalBasis,
  estimatedSavingCents: s.estimatedSavingCents.toString(),
  calc: s.calc,
  parametrosSha256: s.parametrosSha256,
  proposedBy: s.proposedBy,
  decidedById: s.decidedById,
  decidedAt: s.decidedAt ? s.decidedAt.toISOString() : null,
  decisionReason: s.decisionReason,
  supersedesId: s.supersedesId,
  createdAt: s.createdAt.toISOString(),
});

const toCostView = (c: ServiceCostEvidence): ServiceCostEvidenceView => ({
  id: c.id,
  serviceRef: c.serviceRef,
  custoCents: c.custoCents === null ? null : c.custoCents.toString(),
  catalogoMinimoCents: c.catalogoMinimoCents === null ? null : c.catalogoMinimoCents.toString(),
  sourceDocumentId: c.sourceDocumentId,
  vigenteDesde: c.vigenteDesde,
  vigenteAte: c.vigenteAte,
  createdAt: c.createdAt.toISOString(),
});

/** Payload de auditoria da sugestão: ids, prática e centavos — sem PII nem texto livre (ADR D3, I-13). */
const suggestionAudit = (s: TaxOptimizationSuggestion, extra: Record<string, string> = {}) => ({
  suggestionId: s.id,
  practice: s.practice,
  subjectType: s.subjectType,
  subjectId: s.subjectId,
  estimatedSavingCents: s.estimatedSavingCents.toString(),
  ...extra,
});

/**
 * EFICIENCIA-FISCAL PR-1 itens 5, 7 e 8 (BRIEF BE-INCR-EFICIENCIA-FISCAL; ADR-INCR-EFICIENCIA-FISCAL D1–D3) — política
 * comercial de eficiência fiscal da unidade, custo de serviço (piso, F-EF-1 a) e o ciclo da sugestão
 * PROPOSED → ACCEPTED | REJECTED | EXPIRED. FIRST-CLASS PRISMA; não chama `postEntry`.
 *
 * - Política versionada por vigência: a nova fecha a aberta em vigenteDesde − 1; vigenteDesde tem de ser posterior ao da
 *   última versão (409). O PUT com CARGA_TRIBUTARIA não grava: vira sugestão CRITERIO_CARGA que só o contador ACTIVE decide
 *   (triagem 21/10; I-6); sem contador ⇒ 409 CRITERIO_CARGA_EXIGE_CONTADOR.
 * - Decisão (F-EF-3 a): contador ACTIVE; sem ele, o dono; quem propôs não decide; SYSTEM nunca decide (não é ator de
 *   rota). `decisionReason` obrigatório em REJECTED e no aceite fora do padrão (CRITERIO_CARGA). Gate em dois níveis: a
 *   atribuição ACTIVE é relida com `tx` antes do CAS do status (memória "gate autoritativo dentro da tx").
 * - Uma PROPOSED viva por assunto (`pendingSlot`): proposta humana nova expira a anterior (`supersedesId`); a do sistema
 *   reaproveita a viva.
 */
export class TaxOptimizationService {
  constructor(
    private readonly repo: ITaxOptimizationRepository,
    private readonly assignmentRepo: Pick<IAccountantAssignmentRepository, 'findActive'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  // ---- Política (item 5) ----

  async getPolicy(scope: AccountingScope): Promise<TaxOptimizationPolicyView> {
    this.assertManage(scope);
    const linhas = await this.repo.listPolicies(scope);
    return this.policyView(linhas, scopeToday(scope));
  }

  /** Política vigente na data, sem gate de leitura — o chamador (fiscal-check, emissão) já checou o dele. */
  async politicaVigente(scope: AccountingScope, data: string): Promise<PoliticaVigente> {
    const linha = vigenteEm(await this.repo.listPolicies(scope), data);
    return linha ? toPolitica(linha) : POLITICA_PADRAO;
  }

  async updatePolicy(scope: AccountingScope, input: UpdateTaxOptimizationPolicyInput): Promise<UpdatePolicyResult> {
    this.assertManage(scope);
    const data: TaxOptimizationPolicyData = {
      criterioAlocacao: input.criterioAlocacao,
      pisoServico: input.pisoServico,
      vigenteDesde: input.vigenteDesde,
      suggestionId: null,
    };
    if (input.criterioAlocacao === 'CARGA_TRIBUTARIA') {
      if (!(await this.assignmentRepo.findActive(scope))) throw this.cargaExigeContador();
      const suggestion = await this.repo.runTransaction(async (tx) => {
        if (!(await this.assignmentRepo.findActive(scope, tx))) throw this.cargaExigeContador();
        return this.proposeInTx(
          scope,
          {
            practice: 'CRITERIO_CARGA',
            subjectType: 'UNIT',
            subjectId: scope.unitId,
            legalBasis: CRITERIO_CARGA_LEGAL_BASIS,
            estimatedSavingCents: 0n,
            calc: { criterioAlocacao: input.criterioAlocacao, pisoServico: input.pisoServico, vigenteDesde: input.vigenteDesde },
          },
          scope.actorUserId,
          tx,
        );
      });
      return { applied: false, suggestion: toSuggestionView(suggestion) };
    }
    await this.repo.runTransaction((tx) => this.createVersionInTx(scope, data, tx));
    return { applied: true, policy: this.policyView(await this.repo.listPolicies(scope), scopeToday(scope)) };
  }

  // ---- Custo de serviço (item 5, F-EF-1 a) ----

  async listServiceCosts(scope: AccountingScope): Promise<ServiceCostEvidenceView[]> {
    this.assertManage(scope);
    return (await this.repo.listServiceCosts(scope)).map(toCostView);
  }

  /** Custos vigentes na data por serviço, sem gate (chamado pelo fiscal-check). */
  async custosDeServicoVigentes(scope: AccountingScope, serviceRefs: readonly string[], data: string): Promise<Map<string, ServiceCostEvidence>> {
    const out = new Map<string, ServiceCostEvidence>();
    if (serviceRefs.length === 0) return out;
    const linhas = await this.repo.listServiceCosts(scope, serviceRefs);
    for (const ref of serviceRefs) {
      const v = vigenteEm(linhas.filter((l) => l.serviceRef === ref), data);
      if (v) out.set(ref, v);
    }
    return out;
  }

  async createServiceCost(scope: AccountingScope, input: ServiceCostEvidenceInput): Promise<ServiceCostEvidenceView> {
    this.assertManage(scope);
    const { unitId: _unitId, ...data } = input;
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.createServiceCost(scope, data, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: SERVICE_COST_CREATED,
        targetType: 'service_cost_evidence',
        targetId: row.id,
        payload: this.costAudit(row),
      });
      return toCostView(row);
    });
  }

  async deleteServiceCost(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findServiceCost(scope, id, tx);
      if (!row) throw new NotFoundError(`Custo de serviço '${id}' não encontrado.`);
      await this.repo.softDeleteServiceCost(id, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: SERVICE_COST_DELETED,
        targetType: 'service_cost_evidence',
        targetId: row.id,
        payload: this.costAudit(row),
      });
    });
  }

  // ---- Sugestões (itens 7 e 8) ----

  async listSuggestions(scope: AccountingScope, status?: SuggestionStatus): Promise<TaxOptimizationSuggestionView[]> {
    await this.assertRead(scope);
    return (await this.repo.listSuggestions(scope, status)).map(toSuggestionView);
  }

  async hasActiveAccountant(scope: AccountingScope): Promise<boolean> {
    return (await this.assignmentRepo.findActive(scope)) !== null;
  }

  /** Item 8: sugestão do sistema — reaproveita a PROPOSED viva do mesmo assunto, senão cria. Devolve o id. */
  async proposeSystem(scope: AccountingScope, args: ProposeSuggestionArgs): Promise<string> {
    return this.repo.runTransaction(async (tx) => {
      const viva = await this.repo.findPendingSuggestion(scope, args, tx);
      if (viva) return viva.id;
      return (await this.proposeInTx(scope, args, SYSTEM_PROPOSER, tx)).id;
    });
  }

  /** I-7: há sugestão PRINCIPAL_ACESSORIO aceita para o assunto? */
  async aceita(scope: AccountingScope, practice: TaxPractice, subjectType: string, subjectId: string): Promise<boolean> {
    return (await this.repo.listSuggestions(scope, 'ACCEPTED')).some((s) => s.practice === practice && s.subjectType === subjectType && s.subjectId === subjectId);
  }

  async accept(scope: AccountingScope, id: string, input: DecideSuggestionInput): Promise<TaxOptimizationSuggestionView> {
    const found = await this.preflightDecision(scope, id);
    if (found.practice === 'CRITERIO_CARGA' && !input.reason) {
      throw new ValidationError('decisionReason é obrigatório no aceite fora do padrão (CRITERIO_CARGA — I-6).', { reason: ['obrigatório'] });
    }
    return this.repo.runTransaction(async (tx) => {
      const active = await this.assertCanDecide(scope, found, tx);
      const decided = await this.repo.transitionSuggestion(
        found.id,
        'PROPOSED',
        'ACCEPTED',
        { decidedById: scope.actorUserId, decidedAt: new Date(), decisionReason: input.reason ?? null },
        tx,
      );
      if (!decided) throw new ConflictError(`Sugestão '${id}' já foi decidida ou substituída.`, 'SUGESTAO_JA_DECIDIDA');
      let policyId = '';
      if (decided.practice === 'CRITERIO_CARGA') {
        const calc = decided.calc as { criterioAlocacao?: string; pisoServico?: string; vigenteDesde?: string };
        const atual = await this.politicaVigenteTx(scope, scopeToday(scope), tx);
        policyId = (
          await this.createVersionInTx(
            scope,
            {
              criterioAlocacao: 'CARGA_TRIBUTARIA',
              pisoServico: calc.pisoServico ?? atual.pisoServico,
              vigenteDesde: calc.vigenteDesde ?? scopeToday(scope),
              suggestionId: decided.id,
            },
            tx,
          )
        ).id;
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: SUGGESTION_ACCEPTED,
        targetType: 'tax_optimization_suggestion',
        targetId: decided.id,
        payload: suggestionAudit(decided, { assignmentId: active?.id ?? '', policyId }),
      });
      return toSuggestionView(decided);
    });
  }

  async reject(scope: AccountingScope, id: string, input: DecideSuggestionInput): Promise<TaxOptimizationSuggestionView> {
    if (!input.reason) throw new ValidationError('decisionReason é obrigatório para rejeitar (ADR D3).', { reason: ['obrigatório'] });
    const found = await this.preflightDecision(scope, id);
    return this.repo.runTransaction(async (tx) => {
      const active = await this.assertCanDecide(scope, found, tx);
      const decided = await this.repo.transitionSuggestion(
        found.id,
        'PROPOSED',
        'REJECTED',
        { decidedById: scope.actorUserId, decidedAt: new Date(), decisionReason: input.reason ?? null },
        tx,
      );
      if (!decided) throw new ConflictError(`Sugestão '${id}' já foi decidida ou substituída.`, 'SUGESTAO_JA_DECIDIDA');
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: SUGGESTION_REJECTED,
        targetType: 'tax_optimization_suggestion',
        targetId: decided.id,
        payload: suggestionAudit(decided, { assignmentId: active?.id ?? '' }),
      });
      return toSuggestionView(decided);
    });
  }

  /** Item 6 / BRIEF item 24: a emissão barrada pela guarda fica na trilha — códigos e critério, sem valor nem PII. */
  async auditGuardBlocked(scope: AccountingScope, saleId: string, criterio: string, codes: readonly string[]): Promise<void> {
    await this.repo.runTransaction((tx) =>
      this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: FISCAL_GUARD_BLOCKED,
        targetType: 'sale',
        targetId: saleId,
        payload: { saleId, criterio, codes: [...new Set(codes)].sort().join(',') },
      }),
    );
  }

  // ---- internos ----

  private async proposeInTx(scope: AccountingScope, args: ProposeSuggestionArgs, proposedBy: string, tx: Prisma.TransactionClient): Promise<TaxOptimizationSuggestion> {
    const viva = await this.repo.findPendingSuggestion(scope, args, tx);
    if (viva) {
      // ADR D3: nova proposta ⇒ nova linha; a anterior sai de cena (EXPIRED) e libera o slot ANTES do create.
      await this.repo.transitionSuggestion(viva.id, 'PROPOSED', 'EXPIRED', null, tx);
    }
    const created = await this.repo.createSuggestion(
      scope,
      {
        practice: args.practice,
        subjectType: args.subjectType,
        subjectId: args.subjectId,
        legalBasis: args.legalBasis.map((l) => ({ ...l })) as Prisma.InputJsonValue,
        estimatedSavingCents: args.estimatedSavingCents < 0n ? 0n : args.estimatedSavingCents,
        calc: JSON.parse(JSON.stringify(args.calc, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))) as Prisma.InputJsonValue,
        parametrosSha256: canonicalSha256(args.calc),
        proposedBy,
        supersedesId: viva?.id ?? null,
      },
      tx,
    );
    await this.auditService.append(tx, scope, {
      actorUserId: proposedBy === SYSTEM_PROPOSER ? null : proposedBy,
      actorType: proposedBy === SYSTEM_PROPOSER ? 'SYSTEM' : undefined,
      eventType: SUGGESTION_PROPOSED,
      targetType: 'tax_optimization_suggestion',
      targetId: created.id,
      payload: suggestionAudit(created, { supersedesId: viva?.id ?? '' }),
    });
    return created;
  }

  private async createVersionInTx(scope: AccountingScope, data: TaxOptimizationPolicyData, tx: Prisma.TransactionClient): Promise<TaxOptimizationPolicy> {
    const linhas = await this.repo.listPolicies(scope, tx);
    const ultima = linhas.reduce<TaxOptimizationPolicy | null>((a, b) => (!a || b.vigenteDesde >= a.vigenteDesde ? b : a), null);
    if (ultima && data.vigenteDesde <= ultima.vigenteDesde) {
      throw new ConflictError(
        `vigenteDesde ${data.vigenteDesde} não é posterior ao da versão vigente (${ultima.vigenteDesde}) — a política é versionada para frente.`,
        'VIGENCIA_RETROATIVA',
      );
    }
    const vespera = dateOnlyFromDayNumber(dayNumberFromDateOnly(data.vigenteDesde) - 1);
    for (const aberta of linhas.filter((l) => l.vigenteAte === null || l.vigenteAte >= data.vigenteDesde)) {
      await this.repo.closePolicy(aberta.id, vespera, tx);
    }
    const created = await this.repo.createPolicy(scope, data, tx);
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType: POLICY_UPDATED,
      targetType: 'tax_optimization_policy',
      targetId: created.id,
      payload: {
        policyId: created.id,
        criterioAlocacao: created.criterioAlocacao,
        pisoServico: created.pisoServico,
        vigenteDesde: created.vigenteDesde,
        suggestionId: created.suggestionId ?? '',
      },
    });
    return created;
  }

  private async politicaVigenteTx(scope: AccountingScope, data: string, tx: Prisma.TransactionClient): Promise<PoliticaVigente> {
    const linha = vigenteEm(await this.repo.listPolicies(scope, tx), data);
    return linha ? toPolitica(linha) : POLITICA_PADRAO;
  }

  private policyView(linhas: readonly TaxOptimizationPolicy[], hoje: string): TaxOptimizationPolicyView {
    const vigente = vigenteEm(linhas, hoje);
    return {
      ...(vigente ? toPolitica(vigente) : POLITICA_PADRAO),
      versoes: linhas.map((l) => {
        const { aprovador: _a, ...p } = toPolitica(l);
        return { ...p, id: l.id, suggestionId: l.suggestionId, createdAt: l.createdAt.toISOString() };
      }),
    };
  }

  private async preflightDecision(scope: AccountingScope, id: string): Promise<TaxOptimizationSuggestion> {
    const found = await this.repo.findSuggestion(scope, id);
    if (!found) throw new NotFoundError(`Sugestão '${id}' não encontrada.`);
    await this.assertCanDecide(scope, found);
    return found;
  }

  /** Gate de decisão (F-EF-3 a), relido com `tx` dentro da transação antes do CAS. */
  private async assertCanDecide(scope: AccountingScope, s: TaxOptimizationSuggestion, tx?: Prisma.TransactionClient): Promise<ActiveAccountant | null> {
    const active = await this.assignmentRepo.findActive(scope, tx);
    if (!this.policy.canDecideTaxSuggestion(scope, active, s.practice)) {
      throw new ForbiddenError(
        s.practice === 'CRITERIO_CARGA'
          ? 'Só o contador responsável ativo decide a troca para CARGA_TRIBUTARIA (triagem 21/10).'
          : active
            ? 'Este escopo tem contador responsável ativo — só ele decide a sugestão.'
            : 'Você não tem permissão para decidir sugestões de eficiência fiscal neste escopo.',
      );
    }
    if (s.proposedBy === scope.actorUserId) throw new ForbiddenError('Quem propôs a sugestão não a decide (F-EF-3 a).');
    return active;
  }

  private cargaExigeContador(): ConflictError {
    return new ConflictError(
      'CRITERIO_CARGA_EXIGE_CONTADOR: a alocação por carga tributária só vale com aceite do contador responsável ativo (triagem 21/10).',
      'CRITERIO_CARGA_EXIGE_CONTADOR',
    );
  }

  private costAudit(c: ServiceCostEvidence): Record<string, string> {
    return {
      serviceCostId: c.id,
      serviceRef: c.serviceRef,
      custoCents: c.custoCents === null ? '' : c.custoCents.toString(),
      catalogoMinimoCents: c.catalogoMinimoCents === null ? '' : c.catalogoMinimoCents.toString(),
      sourceDocumentId: c.sourceDocumentId ?? '',
      vigenteDesde: c.vigenteDesde,
      vigenteAte: c.vigenteAte ?? '',
    };
  }

  /** BRIEF §4.3: o `POST /api/sales/:id/fiscal-check` usa a régua do perfil fiscal (grava o custo e pode propor sugestão). */
  assertCanCheckSale(scope: AccountingScope): void {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para verificar a venda contra a guarda fiscal.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxOptimization(scope)) throw new ForbiddenError('Você não tem permissão para a política de eficiência fiscal desta unidade.');
  }

  /** Leitura das sugestões: quem gere a política ou o contador ACTIVE do par (que decide). */
  private async assertRead(scope: AccountingScope): Promise<void> {
    if (this.policy.canManageTaxOptimization(scope)) return;
    const active = await this.assignmentRepo.findActive(scope);
    if (!this.policy.canDecidePolicyVersion(scope, active)) throw new ForbiddenError('Você não tem permissão para ler as sugestões de eficiência fiscal.');
  }
}
