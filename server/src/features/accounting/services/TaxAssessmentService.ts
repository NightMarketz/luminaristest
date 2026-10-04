/**
 * TaxAssessmentService — apuração trimestral de IRPJ/CSLL (nó X7, Fase A). FIRST-CLASS PRISMA.
 *
 * PR-2 (BRIEF itens 12–14, 17, 19): preview, confirmação (commit 1) e leitura. A provisão no razão (commits 2/3,
 * itens 15–16) é do PR-3 e entra neste arquivo junto com o cabeçalho `atomicUntil` (AC-2.3-2).
 */
import type { CompanyFiscalProfile, Prisma, TaxAssessment } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import {
  MemoriaCalculoSchema,
  PERIODOS_TRIMESTRAIS,
  apurarPresumidoTrimestral,
  apurarRealTrimestral,
  trimestresEmAtividade,
  type MemoriaAnterior,
  type PeriodoTrimestral,
  type ResultadoApuracao,
  type TributoApuracao,
} from '../models/taxAssessmentCalc';
import type {
  TaxAssessmentCalcView,
  TaxAssessmentConfirmInput,
  TaxAssessmentListQuery,
  TaxAssessmentPreviewInput,
  TaxAssessmentPreviewView,
  TaxAssessmentView,
} from '../dtos/TaxAssessmentDto';
import type { ITaxAssessmentRepository } from '../repositories/ITaxAssessmentRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { ILalurRepository } from '../repositories/ILalurRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';
import type { AccountingReportService } from './AccountingReportService';
import type { AuditService } from './AuditService';
import { formaEfetiva } from './CompanyFiscalProfileService';
import { quarterWindows } from './SpedEcfGenerationService';
import { receitaBrutaPorAtividade } from './receitaBrutaPorAtividade';

export const TAX_ASSESSMENT_CONFIRMED = 'tax.assessment.confirmed';
export const TAX_ASSESSMENT_SUPERSEDED = 'tax.assessment.superseded';

const TRIBUTOS: readonly TributoApuracao[] = ['IRPJ', 'CSLL'];
const idx = (p: string): number => PERIODOS_TRIMESTRAIS.indexOf(p as PeriodoTrimestral);

interface Calculo {
  perfil: CompanyFiscalProfile;
  resultados: Record<TributoApuracao, ResultadoApuracao>;
  contasConfiguradas: boolean;
  avisos: string[];
  /** Ids das memórias confirmadas lidas como "anteriores" (F-TA-3 a) — re-checados dentro da tx da confirmação. */
  anterioresIds: string[];
}

/**
 * F-TA-3 (a) + decisão do dono 04/10 (lacuna L-A, "cadeia obsoleta ⇒ 409"): para apurar `periodo`, cada trimestre
 * anterior em atividade precisa de um CONFIRMED por tributo, e nenhum deles pode estar obsoleto — obsoleto = confirmado
 * ANTES do CONFIRMED do trimestre que o antecede (o anterior foi substituído depois), ou sucessor de um obsoleto.
 * Devolve as listas em ordem; vazias ⇒ a cadeia está sã. Trimestre anterior ao início de atividade não é exigido.
 */
export function verificarCadeia(
  confirmados: Pick<TaxAssessment, 'tributo' | 'periodo' | 'confirmedAt'>[],
  periodo: PeriodoTrimestral,
  ativos: PeriodoTrimestral[],
): { faltantes: string[]; obsoletos: string[] } {
  const faltantes = new Set<string>();
  const obsoletos = new Set<string>();
  const exigidos = PERIODOS_TRIMESTRAIS.filter((p) => idx(p) < idx(periodo) && ativos.includes(p));
  for (const tributo of TRIBUTOS) {
    let anterior: Date | null = null;
    let cadeiaObsoleta = false;
    for (const p of exigidos) {
      const row = confirmados.find((c) => c.tributo === tributo && c.periodo === p);
      if (!row) {
        faltantes.add(p);
        anterior = null;
        continue;
      }
      if (cadeiaObsoleta || (anterior && row.confirmedAt < anterior)) {
        cadeiaObsoleta = true;
        obsoletos.add(p);
      }
      anterior = row.confirmedAt;
    }
  }
  const ordem = (s: Set<string>) => [...s].sort((a, b) => idx(a) - idx(b));
  return { faltantes: ordem(faltantes), obsoletos: ordem(obsoletos) };
}

/** L-C (decisão do dono 04/10): pendente ⇔ CONFIRMED ∧ devido > 0 ∧ sem lançamento de provisão. */
export function provisaoPendente(row: Pick<TaxAssessment, 'status' | 'devidoCents' | 'provisaoEntryId'>): boolean {
  return row.status === 'CONFIRMED' && row.devidoCents > 0n && row.provisaoEntryId === null;
}

function calcView(r: ResultadoApuracao, periodo: string): TaxAssessmentCalcView {
  return {
    tributo: r.tributo,
    periodo,
    modo: r.modo,
    codigoReceita: r.codigoReceita,
    baseCents: r.baseCents.toString(),
    devidoCents: r.devidoCents.toString(),
    deducoesCents: r.deducoesCents.toString(),
    aPagarCents: r.aPagarCents.toString(),
    saldoNegativoCents: r.saldoNegativoCents.toString(),
    tabelaVersao: r.tabelaVersao,
    memoria: r.memoria,
  };
}

export function toTaxAssessmentView(row: TaxAssessment): TaxAssessmentView {
  return {
    id: row.id,
    tributo: row.tributo as TributoApuracao,
    periodo: row.periodo,
    modo: row.modo,
    codigoReceita: row.codigoReceita,
    baseCents: row.baseCents.toString(),
    devidoCents: row.devidoCents.toString(),
    deducoesCents: row.deducoesCents.toString(),
    aPagarCents: row.aPagarCents.toString(),
    saldoNegativoCents: row.saldoNegativoCents.toString(),
    status: row.status as TaxAssessmentView['status'],
    supersedesId: row.supersedesId,
    provisaoPendente: provisaoPendente(row),
    tabelaVersao: row.tabelaVersao,
    memoria: MemoriaCalculoSchema.parse(row.memoria),
    confirmedAt: row.confirmedAt.toISOString(),
  };
}

/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7). Lê o perfil da PJ (X13), as contas da provisão da unidade (F-TA-6 a), o razão
 * (itens 6/7) e o e-Lalur; calcula pelas funções puras do PR-1 e persiste a confirmação. Nunca escreve no perfil além
 * da trava da forma (F-X7-5 a), nem no e-Lalur.
 */
export class TaxAssessmentService {
  constructor(
    private readonly repo: ITaxAssessmentRepository,
    private readonly companyProfileRepo: ICompanyFiscalProfileRepository,
    private readonly fiscalProfileRepo: IFiscalProfileRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly lalurRepo: ILalurRepository,
    private readonly reportService: AccountingReportService,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  /** POST /accounting/tax-assessments/preview (item 13) — calcula IRPJ e CSLL juntos (art. 31 § 7º); não persiste. */
  async preview(scope: AccountingScope, dto: TaxAssessmentPreviewInput): Promise<TaxAssessmentPreviewView> {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para apurar IRPJ/CSLL.');
    const c = await this.calcular(scope, dto);
    return {
      irpj: calcView(c.resultados.IRPJ, dto.periodo),
      csll: calcView(c.resultados.CSLL, dto.periodo),
      provisaoContasConfiguradas: c.contasConfiguradas,
      avisos: c.avisos,
    };
  }

  /**
   * POST /accounting/tax-assessments (item 14) — commit 1. Recalcula FORA da tx e abre UMA `runTransaction` com todos os
   * gates autoritativos dentro dela (memória authoritative-gate-inside-tx): CAS do a pagar, um só CONFIRMED vivo por
   * (PJ, ano, tributo, período), cadeia de trimestres (F-TA-3 a / L-A), anteriores ainda vivos, regime do ano, trava
   * da forma; marca as substituídas, grava as 2 linhas e audita.
   */
  async confirm(scope: AccountingScope, dto: TaxAssessmentConfirmInput): Promise<TaxAssessmentView[]> {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para confirmar a apuração de IRPJ/CSLL.');
    const c = await this.calcular(scope, dto);
    const ano = dto.anoCalendario;
    const periodo = dto.periodo as PeriodoTrimestral;
    const supersedesIds = dto.supersedesIds ?? [];

    const created = await this.repo.runTransaction(async (tx) => {
      for (const t of TRIBUTOS) {
        if (dto.expectedAPagarCents[t] !== c.resultados[t].aPagarCents.toString()) {
          throw new ConflictError(
            `${t}: o valor a pagar mudou (esperado ${dto.expectedAPagarCents[t]}, recalculado ${c.resultados[t].aPagarCents}) — refaça o preview.`,
            'TAX_ASSESSMENT_STALE',
          );
        }
      }

      const confirmados = await this.repo.findMany(scope, { anoCalendario: ano, status: 'CONFIRMED' }, tx);
      const vivos = confirmados.filter((r) => r.periodo === periodo);
      for (const id of supersedesIds) {
        if (!vivos.some((v) => v.id === id)) {
          throw new ConflictError(`supersedesIds: '${id}' não é a apuração CONFIRMED vigente de ${periodo}/${ano}.`, 'TAX_ASSESSMENT_SUPERSEDES_INVALID');
        }
      }
      for (const v of vivos) {
        if (!supersedesIds.includes(v.id)) {
          throw new ConflictError(
            `${v.tributo} de ${periodo}/${ano} já está confirmado (${v.id}) — para corrigir, envie supersedesIds com o id.`,
            'TAX_ASSESSMENT_ALREADY_CONFIRMED',
          );
        }
      }

      const ativos = trimestresEmAtividade(ano, c.perfil.inicioAtividadeEm, c.perfil.encerramentoAtividadeEm);
      const cadeia = verificarCadeia(confirmados, periodo, ativos);
      if (cadeia.faltantes.length > 0) {
        throw new ConflictError(`Confirme antes, em ordem: ${cadeia.faltantes.join(', ')} de ${ano} (F-TA-3).`, 'TAX_ASSESSMENT_ORDER');
      }
      if (cadeia.obsoletos.length > 0) {
        throw new ConflictError(
          `Trimestre anterior substituído: reconfirme por substituição, em ordem, ${cadeia.obsoletos.join(', ')} de ${ano} antes de ${periodo} (F-TA-3).`,
          'TAX_ASSESSMENT_CHAIN_STALE',
        );
      }
      const idsAnterioresVivos = confirmados.filter((r) => idx(r.periodo) < idx(periodo)).map((r) => r.id);
      if (idsAnterioresVivos.length !== c.anterioresIds.length || c.anterioresIds.some((id) => !idsAnterioresVivos.includes(id))) {
        throw new ConflictError('Um trimestre anterior mudou durante a confirmação — refaça o preview.', 'TAX_ASSESSMENT_STALE');
      }

      const outroRegime = confirmados.find((r) => r.regime !== c.perfil.regime);
      if (outroRegime) {
        throw new ConflictError(
          `O regime do perfil (${c.perfil.regime}) difere do das apurações já confirmadas em ${ano} (${outroRegime.regime}).`,
          'TAX_ASSESSMENT_REGIME_MISMATCH',
        );
      }

      const now = new Date();
      await this.companyProfileRepo.travarFormaApuracao(scope, ano, now, tx);

      const rows: TaxAssessment[] = [];
      for (const t of TRIBUTOS) {
        const r = c.resultados[t];
        const substituida = vivos.find((v) => v.tributo === t) ?? null;
        if (substituida && !(await this.repo.markSuperseded(scope, substituida.id, tx))) {
          throw new ConflictError(`A apuração ${substituida.id} foi alterada por outra operação — releia e tente de novo.`, 'TAX_ASSESSMENT_STALE');
        }
        const row = await this.repo.create(
          scope,
          {
            unitId: scope.unitId,
            anoCalendario: ano,
            tributo: t,
            regime: c.perfil.regime,
            forma: 'TRIMESTRAL',
            periodo,
            modo: r.modo,
            codigoReceita: r.codigoReceita,
            baseCents: r.baseCents,
            devidoCents: r.devidoCents,
            deducoesCents: r.deducoesCents,
            aPagarCents: r.aPagarCents,
            saldoNegativoCents: r.saldoNegativoCents,
            memoria: r.memoria as unknown as Prisma.InputJsonValue,
            tabelaVersao: r.tabelaVersao,
            supersedesId: substituida?.id ?? null,
            confirmedAt: now,
          },
          tx,
        );
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: TAX_ASSESSMENT_CONFIRMED,
          targetType: 'tax_assessment',
          targetId: row.id,
          payload: {
            assessmentId: row.id,
            tributo: t,
            periodo,
            anoCalendario: ano,
            aPagarCents: r.aPagarCents.toString(),
            devidoCents: r.devidoCents.toString(),
            tabelaVersao: r.tabelaVersao,
          },
        });
        if (substituida) {
          await this.auditService.append(tx, scope, {
            actorUserId: scope.actorUserId,
            eventType: TAX_ASSESSMENT_SUPERSEDED,
            targetType: 'tax_assessment',
            targetId: substituida.id,
            payload: { assessmentId: substituida.id, supersededById: row.id, tributo: t, periodo, anoCalendario: ano },
          });
        }
        rows.push(row);
      }
      return rows;
    });

    return created.map(toTaxAssessmentView);
  }

  /** GET /accounting/tax-assessments (item 17) — da PJ, por ano; filtros opcionais de período e status. */
  async list(scope: AccountingScope, q: TaxAssessmentListQuery): Promise<TaxAssessmentView[]> {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler as apurações de IRPJ/CSLL.');
    const rows = await this.repo.findMany(scope, { anoCalendario: q.anoCalendario, periodo: q.periodo, status: q.status });
    return rows.map(toTaxAssessmentView);
  }

  /** GET /accounting/tax-assessments/:id (item 17). */
  async getById(scope: AccountingScope, id: string): Promise<TaxAssessmentView> {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler as apurações de IRPJ/CSLL.');
    const row = await this.repo.findById(scope, id);
    if (!row) throw new NotFoundError(`Apuração '${id}' não foi encontrada.`);
    return toTaxAssessmentView(row);
  }

  // ─── cálculo (preview e confirmação) ─────────────────────────────────────────────────────────────────────────

  private async calcular(scope: AccountingScope, dto: TaxAssessmentPreviewInput): Promise<Calculo> {
    const ano = dto.anoCalendario;
    const periodo = dto.periodo as PeriodoTrimestral;
    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (!perfil) throw new ValidationError(`Perfil fiscal da empresa de ${ano} não cadastrado — cadastre antes de apurar.`);
    if (perfil.regime === 'SIMPLES' || perfil.regime === 'MEI') {
      throw new ValidationError(`Regime ${perfil.regime}: o IRPJ/CSLL vai no DAS — DAS é da onda 3 (ADR D12).`);
    }
    if (formaEfetiva(perfil.regime, perfil.formaApuracaoIrpjCsll) === 'ANUAL') {
      throw new ValidationError('Forma de apuração anual é da Fase B.');
    }

    const w = quarterWindows(ano).find((x) => x.perApur === periodo)!;
    const outras = await this.repo.findOtherUnitsWithMovement(scope, w.from, w.to, LEDGER_STATUSES);
    if (outras.length > 0) {
      throw new ValidationError(
        `Outra(s) unidade(s) da empresa com movimento em ${periodo}/${ano}: ${outras.join(', ')}. A Fase A apura uma unidade só (F-X7-7 a).`,
        { unidades: outras },
      );
    }

    const fp = await this.fiscalProfileRepo.findByScope(scope);
    const despesas = [fp?.irpjDespesaAccountId, fp?.csllDespesaAccountId].filter((x): x is string => !!x);
    const contasConfiguradas = !!(fp?.irpjDespesaAccountId && fp.csllDespesaAccountId && fp.irpjRecolherAccountId && fp.csllRecolherAccountId);

    const confirmados = await this.repo.findMany(scope, { anoCalendario: ano, status: 'CONFIRMED' });
    const anterioresRows = confirmados.filter((r) => idx(r.periodo) < idx(periodo));
    const anteriores = (t: TributoApuracao): MemoriaAnterior[] =>
      anterioresRows
        .filter((r) => r.tributo === t)
        .map((r) => ({ periodo: r.periodo as PeriodoTrimestral, memoria: MemoriaCalculoSchema.parse(r.memoria) }));

    const resultados = {} as Record<TributoApuracao, ResultadoApuracao>;
    if (perfil.regime === 'PRESUMIDO') {
      const receita = await receitaBrutaPorAtividade({ accountRepo: this.accountRepo, postingRepo: this.postingRepo }, scope, w.from, w.to);
      for (const t of TRIBUTOS) {
        resultados[t] = apurarPresumidoTrimestral({
          ano,
          periodo,
          tributo: t,
          receitaServicoCents: BigInt(receita.servicoCents),
          receitaRevendaCents: BigInt(receita.revendaCents),
          perfil,
          anteriores: anteriores(t),
          deducoes: dto.deducoes,
        });
      }
    } else {
      const resultado = await this.reportService.resultadoAntesIrpjCsll(scope, w.from, w.to, despesas);
      const entries = await this.lalurRepo.findManyEntries(scope, { year: ano, quarter: periodo, includeArchived: false });
      const parteBFechada = (await this.lalurRepo.findClosing(scope, ano, periodo)) !== null;
      for (const t of TRIBUTOS) {
        const livro = t === 'IRPJ' ? 'lalur' : 'lacs';
        resultados[t] = apurarRealTrimestral({
          ano,
          periodo,
          tributo: t,
          resultadoAntesCents: BigInt(resultado),
          contasProvisaoConfiguradas: despesas.length === 2,
          linhasParteA: entries.filter((e) => e.livro === livro).map((e) => ({ codigo: e.codigo, valorCents: e.valorCents })),
          parteBFechada,
          perfil,
          deducoes: dto.deducoes,
        });
      }
    }

    const avisos: string[] = [];
    if (!contasConfiguradas) {
      avisos.push(
        'Contas da provisão (despesa e a recolher de IRPJ/CSLL) não configuradas no perfil fiscal da unidade: a confirmação fica com a provisão pendente até configurar e reconciliar (F-TA-7).',
      );
    }
    const cadeia = verificarCadeia(confirmados, periodo, trimestresEmAtividade(ano, perfil.inicioAtividadeEm, perfil.encerramentoAtividadeEm));
    if (cadeia.faltantes.length > 0) avisos.push(`Trimestre(s) anterior(es) sem confirmação: ${cadeia.faltantes.join(', ')} — a confirmação será recusada (F-TA-3).`);
    if (cadeia.obsoletos.length > 0) avisos.push(`Trimestre(s) anterior(es) a reconfirmar por substituição: ${cadeia.obsoletos.join(', ')} (F-TA-3).`);

    return { perfil, resultados, contasConfiguradas, avisos, anterioresIds: anterioresRows.map((r) => r.id) };
  }
}
