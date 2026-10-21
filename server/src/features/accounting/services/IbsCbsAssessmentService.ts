/**
 * IbsCbsAssessmentService — apuração MENSAL de IBS/CBS no regime regular (IBS-CBS-2027 PR-2; BRIEF
 * `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6–11 e 13). FIRST-CLASS PRISMA (F-IBS-2 a).
 *
 * Molde X7 Fase A / X8: a confirmação recalcula FORA da tx e abre UMA `runTransaction` com os gates autoritativos dentro
 * (memória `authoritative-gate-inside-tx`, `tx` propagado ao repo): perfil da PJ igual ao lido, CAS de
 * `expectedSupersedesId` (409), cascata (substituir M derruba M+1.. do tributo, devolvidos em `reconfirmar`).
 *
 * Fora deste PR (dono, 2026-10-21): o item 12 (reclassificação receita → passivo, `postEntry` em 2 commits) aguarda o
 * PR #794. A confirmação grava sem `provisaoEntryId` e a memória declara `PROVISAO_PENDENTE_ITEM_12`. Nenhum `postEntry`.
 */
import type { CompanyFiscalProfile, ConsumptionTaxAssessment, Prisma } from 'generated/prisma';
import { ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IConsumptionTaxAssessmentRepository } from '../repositories/IConsumptionTaxAssessmentRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import { AUTHORIZED_STATUSES, type IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { AuditService } from './AuditService';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { parametrosUsados, type ParametrosUsados } from '../../legalParameters/models/legalParameter';
import {
  IBS_CBS_ANTES_DE_2027,
  MemoriaIbsCbsSchema,
  type IbsCbsAssessmentConfirmInput,
  type IbsCbsAssessmentListQuery,
  type IbsCbsAssessmentPreviewInput,
} from '../dtos/IbsCbsAssessmentDto';
import { apurarIbsCbsMes, type IbsCbsDocumento, type ResultadoIbsCbs } from '../models/ibsCbsCompetencia';
import { tabelaIbsCbsDe } from '../models/ibsCbsParams';
import { fimDoMes } from '../models/taxAssessmentCalcAnual';
import { mesBounds } from '../models/Lalur.model';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import type { MemoriaLinha } from '../models/taxAssessmentCalc';

export const IBS_CBS_ASSESSMENT_CONFIRMED = 'tax.ibs_cbs_assessment.confirmed';
export const IBS_CBS_ASSESSMENT_SUPERSEDED = 'tax.ibs_cbs_assessment.superseded';

/** Item 10 (ADR D1; LC 214 art. 41 § 1º [D08]): Simples/MEI recolhem IBS/CBS no DAS. */
export const IBS_CBS_SIMPLES_MEI = 'IBS/CBS de optante pelo Simples Nacional/MEI é recolhido no DAS — apuração do regime regular não se aplica (LC 214/2025 art. 41 § 1º; ADR-INCR-IBS-CBS-2027 D1)';

export interface IbsCbsPreviewView {
  anoCalendario: number;
  mes: number;
  tributo: string;
  debitosCents: string;
  creditosCents: string;
  saldoCents: string;
  documentosSemGrupo: number;
  memoria: MemoriaLinha[];
}

export interface IbsCbsAssessmentView extends Omit<IbsCbsPreviewView, 'documentosSemGrupo'> {
  id: string;
  unitId: string;
  regime: string;
  status: string;
  supersedesId: string | null;
  provisaoEntryId: string | null;
  parametrosSha256: string;
  avisoParametroLegal: string | null;
  confirmedAt: string;
}

export interface IbsCbsConfirmView {
  assessment: IbsCbsAssessmentView;
  /** Meses posteriores do tributo que a substituição derrubou (MM/AAAA) — reconfirmar. */
  reconfirmar: string[];
}

interface Calculo {
  perfil: CompanyFiscalProfile;
  resultado: ResultadoIbsCbs;
  parametros: ParametrosUsados;
}

export class IbsCbsAssessmentService {
  constructor(
    private readonly repo: IConsumptionTaxAssessmentRepository,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly fiscalDocumentRepo: Pick<IFiscalDocumentRepository, 'findForIbsCbs'>,
    private readonly journalEntryRepo: Pick<IJournalEntryRepository, 'findSourceIdsInWindow'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  /** Item 9 — calcula e não persiste. */
  async preview(scope: AccountingScope, input: IbsCbsAssessmentPreviewInput): Promise<IbsCbsPreviewView> {
    this.assertRead(scope);
    const c = await this.calcular(scope, input);
    return toPreview(input, c.resultado);
  }

  /** Item 13 — GET por ano (todas as linhas vivas, CONFIRMED e SUPERSEDED). */
  async list(scope: AccountingScope, q: IbsCbsAssessmentListQuery): Promise<IbsCbsAssessmentView[]> {
    this.assertRead(scope);
    assertAno(q.anoCalendario);
    const perfil = await this.companyProfileRepo.findByYear(scope, q.anoCalendario);
    if (perfil) assertRegime(perfil.regime);
    return (await this.repo.findMany(scope.ownerUserId, q.anoCalendario)).map(toView);
  }

  /** Item 9 — confirmação (commit único; o item 12 fica fora até o #794). */
  async confirm(scope: AccountingScope, input: IbsCbsAssessmentConfirmInput): Promise<IbsCbsConfirmView> {
    this.assertManage(scope);
    const c = await this.calcular(scope, input);
    const { anoCalendario: ano, mes, tributo } = input;
    const owner = scope.ownerUserId;

    return this.repo.runTransaction(async (tx) => {
      const perfilTx = await this.companyProfileRepo.findByYear(scope, ano, tx);
      if (!perfilTx || perfilTx.updatedAt.getTime() !== c.perfil.updatedAt.getTime()) {
        throw new ConflictError(`o perfil fiscal da empresa de ${ano} mudou durante a confirmação — refaça a prévia.`, 'IBS_CBS_ASSESSMENT_STALE');
      }
      const confirmados = await this.repo.findConfirmedFrom(owner, tributo, ano, mes, tx);
      const vivo = confirmados.find((r) => r.anoCalendario === ano && r.mes === mes) ?? null;
      const posteriores = confirmados.filter((r) => r !== vivo);
      // CAS (item 9): o id vivo do mês tem de ser o esperado — null ⇔ nenhum.
      if ((vivo?.id ?? null) !== input.expectedSupersedesId) {
        throw new ConflictError(
          `${tributo} ${mm(mes)}/${ano}: a apuração confirmada viva é ${vivo?.id ?? 'nenhuma'}, diferente de expectedSupersedesId (${input.expectedSupersedesId ?? 'null'}) — refaça a prévia.`,
          'IBS_CBS_ASSESSMENT_CAS',
        );
      }
      // Confirmar um mês NOVO por trás de um posterior confirmado ⇒ 409 (molde X8 item 14); substituir derruba os posteriores.
      if (!vivo && posteriores.length > 0) {
        throw new ConflictError(
          `${posteriores.map((r) => `${mm(r.mes)}/${r.anoCalendario}`).join(', ')} já confirmado depois de ${mm(mes)}/${ano} (${tributo}) — confirme na ordem ou substitua o posterior.`,
          'IBS_CBS_ASSESSMENT_ORDER',
        );
      }
      const cair = vivo ? [vivo, ...posteriores] : [];
      const mudou = await this.repo.markSuperseded(owner, cair.map((r) => r.id), tx);
      if (mudou !== cair.length) {
        throw new ConflictError(`apuração substituída em paralelo em ${mm(mes)}/${ano} — refaça a prévia.`, 'IBS_CBS_ASSESSMENT_STALE');
      }

      const r = c.resultado;
      const row = await this.repo.create(
        {
          userId: owner,
          unitId: scope.unitId,
          anoCalendario: ano,
          mes,
          tributo,
          regime: perfilTx.regime,
          debitosCents: r.debitosCents,
          creditosCents: r.creditosCents,
          saldoCents: r.saldoCents,
          memoria: MemoriaIbsCbsSchema.parse(r.memoria) as Prisma.InputJsonValue,
          parametrosIds: c.parametros.ids,
          parametrosSha256: c.parametros.sha256,
          status: 'CONFIRMED',
          supersedesId: vivo?.id ?? null,
          confirmedById: scope.actorUserId,
          confirmedAt: new Date(),
        },
        tx,
      );
      // Item 13: ids, ano, mês, tributo, saldo — sem PII (memória "allowlist de auditoria"); a memória fica FORA.
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: IBS_CBS_ASSESSMENT_CONFIRMED,
        targetType: 'consumption_tax_assessment',
        targetId: row.id,
        payload: { assessmentId: row.id, anoCalendario: String(ano), mes: String(mes), tributo, saldoCents: row.saldoCents.toString() },
      });
      for (const sub of cair) {
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: IBS_CBS_ASSESSMENT_SUPERSEDED,
          targetType: 'consumption_tax_assessment',
          targetId: sub.id,
          payload: { assessmentId: sub.id, supersededById: row.id, anoCalendario: String(sub.anoCalendario), mes: String(sub.mes), tributo, saldoCents: sub.saldoCents.toString() },
        });
      }
      return { assessment: toView(row), reconfirmar: posteriores.map((p) => `${mm(p.mes)}/${p.anoCalendario}`) };
    });
  }

  /** Lê perfil da PJ, documentos e vendas do mês e chama a função pura. Recusas do item 10 (400). */
  private async calcular(scope: AccountingScope, input: IbsCbsAssessmentPreviewInput): Promise<Calculo> {
    const { anoCalendario: ano, mes, tributo } = input;
    assertAno(ano);
    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (!perfil) throw new ValidationError(`perfil fiscal da empresa de ${ano} ausente — cadastre-o antes de apurar IBS/CBS.`);
    assertRegime(perfil.regime);

    const de = `${ano}-${mm(mes)}-01`;
    const ate = fimDoMes(ano, mes);
    const linhasLegais = await this.legalParams.fotografia(['IBS_CBS']);
    const parametros = parametrosUsados(linhasLegais, de, ate);
    const tabela = tabelaIbsCbsDe(linhasLegais);

    const docs = await this.fiscalDocumentRepo.findForIbsCbs(scope, de, ate, AUTHORIZED_STATUSES);
    const documentos: IbsCbsDocumento[] = docs.map((d) => ({
      fiscalDocumentId: d.id,
      dataEmissaoLocal: d.dCompet, // dia escrito (= sale.date), não ISO UTC
      status: d.status as IbsCbsDocumento['status'],
      ibsCents: d.vIbsCents,
      cbsCents: d.vCbsCents,
      baseCents: null, // o documento não persiste a base de IBS/CBS — conferência sem base (Lacuna L-1 do PR-2)
      cClassTrib: null,
    }));
    const comDocumento = new Set(docs.map((d) => d.saleId));
    const vendas = await this.journalEntryRepo.findSourceIdsInWindow(scope, 'sale.finalized', LEDGER_STATUSES, mesBounds(ano, mes));
    const vendasSemDocumento = vendas.filter((s) => !comDocumento.has(s));

    const resultado = apurarIbsCbsMes({ ano, mes, tributo, tabela, documentos, vendasSemDocumento });
    return { perfil, resultado, parametros };
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler a apuração de IBS/CBS.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para confirmar a apuração de IBS/CBS.');
  }
}

const mm = (m: number): string => String(m).padStart(2, '0');

function assertAno(ano: number): void {
  if (ano < 2027) throw new ValidationError(IBS_CBS_ANTES_DE_2027, null, 'IBS_CBS_ANTES_DE_2027');
}

function assertRegime(regime: string): void {
  if (regime === 'SIMPLES' || regime === 'MEI') throw new ValidationError(IBS_CBS_SIMPLES_MEI, null, 'IBS_CBS_SIMPLES_MEI');
}

function toPreview(input: IbsCbsAssessmentPreviewInput, r: ResultadoIbsCbs): IbsCbsPreviewView {
  return {
    anoCalendario: input.anoCalendario,
    mes: input.mes,
    tributo: r.tributo,
    debitosCents: r.debitosCents.toString(),
    creditosCents: r.creditosCents.toString(),
    saldoCents: r.saldoCents.toString(),
    documentosSemGrupo: r.documentosSemGrupo,
    memoria: r.memoria,
  };
}

export function toView(row: ConsumptionTaxAssessment): IbsCbsAssessmentView {
  return {
    id: row.id,
    unitId: row.unitId,
    anoCalendario: row.anoCalendario,
    mes: row.mes,
    tributo: row.tributo,
    regime: row.regime,
    debitosCents: row.debitosCents.toString(),
    creditosCents: row.creditosCents.toString(),
    saldoCents: row.saldoCents.toString(),
    memoria: MemoriaIbsCbsSchema.parse(row.memoria),
    status: row.status,
    supersedesId: row.supersedesId,
    provisaoEntryId: row.provisaoEntryId,
    parametrosSha256: row.parametrosSha256,
    avisoParametroLegal: row.avisoParametroLegal,
    confirmedAt: row.confirmedAt.toISOString(),
  };
}
