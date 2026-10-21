/**
 * IbsCbsAssessmentService — apuração MENSAL de IBS e CBS do regime regular (nó IBS-CBS-2027, PR-2). FIRST-CLASS PRISMA.
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: reverseEntry da reclassificação viva de cada linha SUPERSEDED do mesmo (PJ, ano, mês, tributo) e
 *              das posteriores derrubadas pela cascata (tx própria, idempotente) e depois postEntry(sourceType=
 *              'ibs_cbs_assessment', sourceId=<id da apuração>) no último dia do mês: D receita-serviço (3.1) e D
 *              receita-revenda (3.3) pelo débito declarado nas NFS-e × NF-e / C IBS ou CBS a recolher (F-IBS-8 c,
 *              F-IBS-14 a; BRIEF item 12); gate de período dentro da tx do postEntry
 *              teste: ibsCbsAssessment.integration.test.ts › "item 12 (commit 1 — razão): D 3.1 / D 3.3 / C a recolher pelo débito dos documentos; soma = debitosCents"
 *              teste: ibsCbsAssessment.integration.test.ts › "item 12 (commit 1 — razão): período fechado ⇒ a confirmação fica, reclassificação pendente, nenhum lançamento"
 *              teste: ibsCbsAssessment.integration.test.ts › "item 12 (substituição): estorna a reclassificação da substituída e posta a da nova — 1 viva por tributo"
 *   commit 2 — subrazão: CAS provisaoEntryId `where null`, sem tx de razão
 *              teste: ibsCbsAssessment.integration.test.ts › "item 12 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)"
 *   reconcile — POST /ibs-cbs-assessments/:id/provisao (dono 21/10) completa o que faltar; nada já feito é refeito
 *              teste: ibsCbsAssessment.integration.test.ts › "item 12 (reconcile): completa e é idempotente — 2ª chamada sem lançamento novo, mesmo provisaoEntryId"
 *   fora da tx — a confirmação (item 9) commita ANTES, em runTransaction próprio; falha da reclassificação não a desfaz
 *              teste: ibsCbsAssessment.integration.test.ts › "item 12 (commit 1 — razão): período fechado ⇒ a confirmação fica, reclassificação pendente, nenhum lançamento"
 *
 * BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6–13 (ADR-INCR-IBS-CBS-2027 D1, D3, D4). Débito = o que o
 * documento autorizado declarou (LC 214 art. 60 § 1º; F-IBS-3 a); saldo = débitos − créditos (art. 45), créditos = 0 no
 * PR-2 (declarado na memória). Regime regular só (art. 41 § 1º — Simples/MEI ⇒ 400) e só a partir de 2027 (F-IBS-7 b).
 * Lacunas do PR-2 ratificadas pelo dono em 21/10: conferência sem base pulada com aviso; venda sem documento = `sale.settled`
 * do mês sem documento autorizado vivo; mês novo atrás de um posterior confirmado ⇒ 409 (molde X8); reconcile com rota.
 */
import type { CompanyFiscalProfile, ConsumptionTaxAssessment, FiscalProfile, Prisma } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IConsumptionTaxAssessmentRepository } from '../repositories/IConsumptionTaxAssessmentRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { parametrosUsados, type ParametrosUsados } from '../../legalParameters/models/legalParameter';
import type { IbsCbsAssessmentConfirmInput, IbsCbsAssessmentListQuery, IbsCbsAssessmentPreviewInput } from '../dtos/IbsCbsAssessmentDto';
import { IBS_CBS_INICIO_MSG } from '../dtos/IbsCbsAssessmentDto';
import { agregarIbsCbsPorCompetencia, aliquotaBpNaData, type IbsCbsDocumento } from '../models/ibsCbsCompetencia';
import { tabelaIbsCbsDe, type TributoConsumo } from '../models/ibsCbsParams';
import { MemoriaCalculoSchema, type MemoriaLinha } from '../models/taxAssessmentCalc';
import { fimDoMes } from '../models/taxAssessmentCalcAnual';
import { mesBounds } from '../models/Lalur.model';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { REVENDA_ACCOUNT_CODE, SERVICO_ACCOUNT_CODE } from './receitaBrutaPorAtividade';

export const IBS_CBS_ASSESSMENT_CONFIRMED = 'tax.ibs_cbs_assessment.confirmed';
export const IBS_CBS_ASSESSMENT_SUPERSEDED = 'tax.ibs_cbs_assessment.superseded';
/** Item 12 — fonte (chave de idempotência do `postEntry`) da reclassificação receita → passivo. */
export const IBS_CBS_ASSESSMENT_SOURCE_TYPE = 'ibs_cbs_assessment';

const FONTE_SALDO = 'LC 214/2025 art. 45 (saldo = débitos − créditos)';
const pad2 = (m: number): string => String(m).padStart(2, '0');

export interface IbsCbsAssessmentView {
  id: string;
  anoCalendario: number;
  mes: number;
  tributo: string;
  regime: string;
  debitosCents: string;
  creditosCents: string;
  saldoCents: string;
  status: string;
  supersedesId: string | null;
  provisaoEntryId: string | null;
  provisaoPendente: boolean;
  parametrosSha256: string;
  avisoParametroLegal: string | null;
  memoria: MemoriaLinha[];
  confirmedAt: string;
}

export interface IbsCbsPreviewView {
  anoCalendario: number;
  mes: number;
  tributo: TributoConsumo;
  debitosCents: string;
  creditosCents: string;
  saldoCents: string;
  memoria: MemoriaLinha[];
  /** O CAS da confirmação: id da apuração CONFIRMED viva do mês/tributo, ou null. */
  expectedSupersedesId: string | null;
  provisaoContasConfiguradas: boolean;
  avisos: string[];
}

export interface IbsCbsConfirmView {
  apuracao: IbsCbsAssessmentView;
  /** Meses posteriores do mesmo tributo derrubados pela substituição (MM/AAAA) — reconfirmar. */
  reconfirmar: string[];
}

interface Calculo {
  perfil: CompanyFiscalProfile;
  debitosCents: bigint;
  memoria: MemoriaLinha[];
  parametros: ParametrosUsados;
  provisaoContasConfiguradas: boolean;
  avisos: string[];
}

/** Item 12: a reclassificação falta quando a linha está CONFIRMED, tem débito e ainda não tem lançamento vinculado. */
export function provisaoIbsCbsPendente(row: Pick<ConsumptionTaxAssessment, 'status' | 'provisaoEntryId' | 'debitosCents'>): boolean {
  return row.status === 'CONFIRMED' && row.provisaoEntryId === null && row.debitosCents > 0n;
}

export function toIbsCbsView(r: ConsumptionTaxAssessment): IbsCbsAssessmentView {
  return {
    id: r.id,
    anoCalendario: r.anoCalendario,
    mes: r.mes,
    tributo: r.tributo,
    regime: r.regime,
    debitosCents: r.debitosCents.toString(),
    creditosCents: r.creditosCents.toString(),
    saldoCents: r.saldoCents.toString(),
    status: r.status,
    supersedesId: r.supersedesId,
    provisaoEntryId: r.provisaoEntryId,
    provisaoPendente: provisaoIbsCbsPendente(r),
    parametrosSha256: r.parametrosSha256,
    avisoParametroLegal: r.avisoParametroLegal,
    memoria: MemoriaCalculoSchema.parse(r.memoria),
    confirmedAt: r.confirmedAt.toISOString(),
  };
}

/** Subtotal da memória lido pelo item 12 (serviço/mercadoria) — a reclassificação não relê os documentos. */
function valorDaMemoria(memoria: MemoriaLinha[], codigo: string): bigint {
  const l = memoria.find((x) => x.codigo === codigo);
  return l ? BigInt(l.valorCents) : 0n;
}

const posterior = (r: Pick<ConsumptionTaxAssessment, 'anoCalendario' | 'mes'>, ano: number, mes: number): boolean =>
  r.anoCalendario > ano || (r.anoCalendario === ano && r.mes > mes);

export class IbsCbsAssessmentService {
  constructor(
    private readonly repo: IConsumptionTaxAssessmentRepository,
    private readonly companyProfileRepo: ICompanyFiscalProfileRepository,
    private readonly fiscalProfileRepo: IFiscalProfileRepository,
    private readonly fiscalDocumentRepo: Pick<IFiscalDocumentRepository, 'findAuthorizedForIbsCbs' | 'saleIdsWithAuthorizedDocument'>,
    private readonly journalEntryRepo: Pick<IJournalEntryRepository, 'findManyForExport'>,
    private readonly postingRepo: Pick<IPostingRepository, 'unitIdsWithMovement'>,
    private readonly accountRepo: Pick<IAccountRepository, 'findById'>,
    private readonly postingService: Pick<PostingService, 'postEntry' | 'reverseEntry' | 'findEntryBySource'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  /** Item 9 — prévia (não persiste). */
  async preview(scope: AccountingScope, input: IbsCbsAssessmentPreviewInput): Promise<IbsCbsPreviewView> {
    this.assertRead(scope);
    const c = await this.calcular(scope, input);
    const viva = (await this.repo.findConfirmed(scope.ownerUserId, input.anoCalendario, input.tributo)).find((r) => r.mes === input.mes) ?? null;
    return {
      anoCalendario: input.anoCalendario,
      mes: input.mes,
      tributo: input.tributo,
      debitosCents: c.debitosCents.toString(),
      creditosCents: '0',
      saldoCents: c.debitosCents.toString(),
      memoria: c.memoria,
      expectedSupersedesId: viva?.id ?? null,
      provisaoContasConfiguradas: c.provisaoContasConfiguradas,
      avisos: c.avisos,
    };
  }

  /**
   * Item 9 — confirmação (commit 1): recalcula FORA da tx e abre UMA `runTransaction` com os gates autoritativos dentro
   * (memória "gate autoritativo dentro da tx", `tx` propagado): perfil da PJ igual ao lido, CAS do `expectedSupersedesId`
   * (409), mês novo atrás de um posterior confirmado (409, dono 21/10), cascata na substituição (invariante §10.4).
   * Depois do commit, a reclassificação do item 12 em best-effort.
   */
  async confirm(scope: AccountingScope, input: IbsCbsAssessmentConfirmInput): Promise<IbsCbsConfirmView> {
    this.assertManage(scope);
    const c = await this.calcular(scope, input);
    const { anoCalendario: ano, mes, tributo } = input;
    const owner = scope.ownerUserId;
    const saldo = c.debitosCents; // créditos = 0 no PR-2

    const r = await this.repo.runTransaction(async (tx) => {
      const perfilTx = await this.companyProfileRepo.findByYear(scope, ano, tx);
      if (!perfilTx || perfilTx.updatedAt.getTime() !== c.perfil.updatedAt.getTime()) {
        throw new ConflictError(`o perfil fiscal da empresa de ${ano} mudou durante a confirmação — refaça a prévia.`, 'IBS_CBS_ASSESSMENT_STALE');
      }
      const doAno = await this.repo.findConfirmed(owner, ano, tributo, tx);
      const viva = doAno.find((x) => x.mes === mes) ?? null;
      if ((viva?.id ?? null) !== input.expectedSupersedesId) {
        throw new ConflictError(
          `${tributo} ${pad2(mes)}/${ano}: a apuração viva é ${viva ? `'${viva.id}'` : 'nenhuma'}, não ${input.expectedSupersedesId ? `'${input.expectedSupersedesId}'` : 'nenhuma'} — refaça a prévia.`,
          'IBS_CBS_ASSESSMENT_CAS',
        );
      }
      const posteriores = [...doAno, ...(await this.repo.findConfirmed(owner, ano + 1, tributo, tx))].filter((x) => posterior(x, ano, mes));
      if (posteriores.length > 0 && !viva) {
        const p = posteriores.map((x) => `${pad2(x.mes)}/${x.anoCalendario}`).join(', ');
        throw new ConflictError(`${tributo} ${p} já confirmado depois de ${pad2(mes)}/${ano}: confirme os meses em ordem (BRIEF IBS-CBS-2027 item 9; dono 21/10, molde X8).`, 'IBS_CBS_ASSESSMENT_ORDER');
      }
      const cair = viva ? [viva, ...posteriores] : [];
      const mudou = await this.repo.markSuperseded(owner, cair.map((x) => x.id), tx);
      if (mudou !== cair.length) throw new ConflictError(`apuração substituída em paralelo em ${pad2(mes)}/${ano} — refaça a prévia.`, 'IBS_CBS_ASSESSMENT_STALE');

      const row = await this.repo.create(
        {
          userId: owner,
          unitId: scope.unitId,
          anoCalendario: ano,
          mes,
          tributo,
          regime: perfilTx.regime,
          debitosCents: c.debitosCents,
          creditosCents: 0n,
          saldoCents: saldo,
          memoria: MemoriaCalculoSchema.parse(c.memoria) as Prisma.InputJsonValue,
          parametrosIds: c.parametros.ids,
          parametrosSha256: c.parametros.sha256,
          entradaInformada: { anoCalendario: ano, mes, tributo } as Prisma.InputJsonValue,
          avisoParametroLegal: null,
          status: 'CONFIRMED',
          supersedesId: viva?.id ?? null,
          confirmedById: scope.actorUserId,
          confirmedAt: new Date(),
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: IBS_CBS_ASSESSMENT_CONFIRMED,
        targetType: 'consumption_tax_assessment',
        targetId: row.id,
        payload: { assessmentId: row.id, tributo, anoCalendario: String(ano), mes: String(mes), saldoCents: saldo.toString(), parametrosSha256: c.parametros.sha256 },
      });
      for (const sub of cair) {
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: IBS_CBS_ASSESSMENT_SUPERSEDED,
          targetType: 'consumption_tax_assessment',
          targetId: sub.id,
          payload: { assessmentId: sub.id, supersededById: row.id, tributo, anoCalendario: String(sub.anoCalendario), mes: String(sub.mes) },
        });
      }
      return { row, cair, reconfirmar: posteriores.map((x) => `${pad2(x.mes)}/${x.anoCalendario}`) };
    });

    // Item 12 — commits 1/2 da reclassificação, best-effort DEPOIS da confirmação: estorna as que caíram e posta a nova.
    for (const s of r.cair) await this.bestEffort(s.id, () => this.estornarReclassificacaoViva(scope, s));
    const nova = (await this.bestEffort(r.row.id, () => this.reclassificar(scope, r.row))) ?? r.row;
    return { apuracao: toIbsCbsView(nova), reconfirmar: r.reconfirmar };
  }

  /** Item 12 / dono 21/10 — POST /:id/provisao: completa o que faltar. Erros (período fechado, conta) sobem ao chamador. */
  async reconcileProvisao(scope: AccountingScope, id: string): Promise<IbsCbsAssessmentView> {
    this.assertManage(scope);
    const row = await this.repo.findById(scope.ownerUserId, id);
    if (!row) throw new NotFoundError(`Apuração de IBS/CBS '${id}' não encontrada.`);
    if (row.status !== 'CONFIRMED') {
      await this.estornarReclassificacaoViva(scope, row);
      return toIbsCbsView(row);
    }
    return toIbsCbsView(await this.reclassificar(scope, row));
  }

  /** Item 13 — lista da PJ no ano (o `unitId` do escopo só resolve policy). */
  async list(scope: AccountingScope, query: IbsCbsAssessmentListQuery): Promise<IbsCbsAssessmentView[]> {
    this.assertRead(scope);
    if (query.anoCalendario < 2027) throw new ValidationError(IBS_CBS_INICIO_MSG);
    return (await this.repo.findByYear(scope.ownerUserId, query.anoCalendario)).map(toIbsCbsView);
  }

  private async bestEffort<T>(assessmentId: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      logger.warn('IBS/CBS: reclassificação pendente (a confirmação fica; reconcile em POST /ibs-cbs-assessments/:id/provisao)', {
        assessmentId,
        motivo: error instanceof Error ? error.message : String(error),
        error,
      });
      return null;
    }
  }

  /**
   * Item 12 (F-IBS-8 c, F-IBS-14 a). Primeiro estorna a reclassificação viva de toda linha SUPERSEDED do mesmo (PJ, ano,
   * mês, tributo) — nunca duas vivas; depois, se pendente, reaproveita o lançamento já postado pela fonte (crash entre
   * post e CAS) ou posta D 3.1 / D 3.3 / C a recolher no último dia do mês; por fim o CAS do `provisaoEntryId`.
   */
  private async reclassificar(scope: AccountingScope, row: ConsumptionTaxAssessment): Promise<ConsumptionTaxAssessment> {
    const owner = scope.ownerUserId;
    for (const sub of await this.repo.findSuperseded(owner, row.anoCalendario, row.mes, row.tributo)) await this.estornarReclassificacaoViva(scope, sub);
    if (!provisaoIbsCbsPendente(row)) return row;

    const s: AccountingScope = { ...scope, unitId: row.unitId };
    let entry = await this.postingService.findEntryBySource(s, IBS_CBS_ASSESSMENT_SOURCE_TYPE, row.id);
    if (entry && (entry.reversedById || entry.status !== 'Posted')) {
      throw new ValidationError(`A reclassificação da apuração '${row.id}' (${entry.id}) foi estornada fora do fluxo — substitua a apuração para lançar de novo.`);
    }
    if (!entry) {
      const fp = await this.fiscalProfileRepo.findByScope(s);
      const memoria = MemoriaCalculoSchema.parse(row.memoria);
      const servico = Number(valorDaMemoria(memoria, 'DEBITO_SERVICO'));
      const mercadoria = Number(valorDaMemoria(memoria, 'DEBITO_MERCADORIA'));
      const recolher = await this.contaRecolher(s, row.tributo === 'IBS' ? fp?.ibsRecolherAccountId : fp?.cbsRecolherAccountId, `${row.tributo} a recolher`);
      const lines = [
        ...(servico > 0 ? [{ accountCode: SERVICO_ACCOUNT_CODE, debitCents: servico, creditCents: 0 }] : []),
        ...(mercadoria > 0 ? [{ accountCode: REVENDA_ACCOUNT_CODE, debitCents: mercadoria, creditCents: 0 }] : []),
        { accountCode: recolher, debitCents: 0, creditCents: servico + mercadoria },
      ];
      entry = await this.postingService.postEntry(s, {
        unitId: s.unitId,
        date: fimDoMes(row.anoCalendario, row.mes),
        description: `Reclassificação do ${row.tributo} da receita para o passivo — ${pad2(row.mes)}/${row.anoCalendario} (apuração ${row.id})`,
        sourceType: IBS_CBS_ASSESSMENT_SOURCE_TYPE,
        sourceId: row.id,
        lines,
      });
    }
    await this.repo.setProvisaoEntryId(owner, row.id, entry.id); // false ⇒ outra chamada já vinculou; a releitura mostra
    return (await this.repo.findById(owner, row.id)) ?? row;
  }

  /** Estorna a reclassificação da linha (achada pela fonte), se viva. Já estornada ⇒ nada. */
  private async estornarReclassificacaoViva(scope: AccountingScope, row: ConsumptionTaxAssessment): Promise<void> {
    const s: AccountingScope = { ...scope, unitId: row.unitId };
    const entry = await this.postingService.findEntryBySource(s, IBS_CBS_ASSESSMENT_SOURCE_TYPE, row.id);
    if (!entry || entry.reversedById || entry.status !== 'Posted') return;
    await this.postingService.reverseEntry(s, {
      unitId: s.unitId,
      lancamentoId: entry.id,
      reversalPostingDate: fimDoMes(row.anoCalendario, row.mes),
      reason: `apuração de ${row.tributo} ${row.id} substituída`,
    });
  }

  private async contaRecolher(scope: AccountingScope, id: string | null | undefined, rotulo: string): Promise<string> {
    if (!id) throw new ValidationError(`Conta de ${rotulo} não configurada no perfil fiscal da unidade (BRIEF IBS-CBS-2027 item 12).`);
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${rotulo} '${id}' não existe neste escopo.`);
    return account.code;
  }

  /** Lê perfil, documentos e vendas liquidadas do mês e monta a memória. Recusas do item 10 (400). */
  private async calcular(scope: AccountingScope, input: IbsCbsAssessmentPreviewInput): Promise<Calculo> {
    const { anoCalendario: ano, mes, tributo } = input;
    if (ano < 2027) throw new ValidationError(IBS_CBS_INICIO_MSG);
    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (!perfil) throw new ValidationError(`perfil fiscal da empresa de ${ano} ausente — cadastre-o antes de apurar IBS/CBS.`);
    if (perfil.regime === 'SIMPLES' || perfil.regime === 'MEI') {
      throw new ValidationError(`regime ${perfil.regime}: o IBS/CBS do optante vai no DAS — a apuração mensal é só do regime regular (LC 214/2025 art. 41 § 1º; ADR-INCR-IBS-CBS-2027 D1).`);
    }
    if (perfil.regime !== 'PRESUMIDO' && perfil.regime !== 'REAL') throw new ValidationError(`regime '${perfil.regime}' sem apuração de IBS/CBS.`);

    const w = mesBounds(ano, mes);
    const outras = (await this.postingRepo.unitIdsWithMovement(scope.ownerUserId, LEDGER_STATUSES, w.from, w.to)).filter((u) => u !== scope.unitId);
    if (outras.length > 0) {
      throw new ValidationError(`outra unidade da PJ com movimento em ${pad2(mes)}/${ano}: a apuração de várias unidades fica fora (molde X7/X8, F-X7-7 a).`, {
        unidadesComMovimento: outras,
      });
    }

    const de = `${ano}-${pad2(mes)}-01`;
    const ate = fimDoMes(ano, mes);
    const linhasLegais = await this.legalParams.fotografia(['IBS_CBS']);
    const tabela = tabelaIbsCbsDe(linhasLegais);
    const parametros = parametrosUsados(linhasLegais, de, ate);

    const docs = await this.fiscalDocumentRepo.findAuthorizedForIbsCbs(scope, de, ate);
    const entradas: IbsCbsDocumento[] = docs.map((d) => ({
      fiscalDocumentId: d.id,
      kind: d.kind === 'NFE' ? 'NFE' : 'NFSE',
      dataEmissaoLocal: d.dCompet,
      status: d.status as IbsCbsDocumento['status'],
      ibsCents: d.vIbsCents,
      cbsCents: d.vCbsCents,
      baseCents: null, // o FiscalDocument não guarda a base de IBS/CBS (lacuna do PR-2, dono 21/10)
      cClassTrib: null,
    }));
    const g = agregarIbsCbsPorCompetencia(entradas, tabela).find((x) => x.tributo === tributo && x.competencia === `${ano}-${pad2(mes)}`);
    const debitosCents = g?.debitosCents ?? 0n;
    const memoria: MemoriaLinha[] = [...(g?.memoria ?? [])];
    memoria.push(
      { codigo: 'DEBITO_SERVICO', descricao: `${tributo} das NFS-e do mês (sai da receita de serviços 3.1 — item 12)`, valorCents: (g?.debitoServicoCents ?? 0n).toString(), fonte: 'F-IBS-8 (c); F-IBS-14 (a)' },
      { codigo: 'DEBITO_MERCADORIA', descricao: `${tributo} das NF-e do mês (sai da receita de revenda 3.3 — item 12)`, valorCents: (g?.debitoMercadoriaCents ?? 0n).toString(), fonte: 'F-IBS-8 (c); F-IBS-14 (a)' },
    );
    if (g && g.documentosSemGrupo > 0) {
      memoria.push({ codigo: 'DOCUMENTOS_SEM_GRUPO', descricao: `${g.documentosSemGrupo} documento(s) autorizado(s) sem ${tributo} declarado — somam 0`, valorCents: '0', fonte: 'ADR-INCR-IBS-CBS-2027 §13.2' });
    }

    // Item 7 (dono 21/10): venda liquidada no mês (`sale.settled` vivo) sem documento autorizado vivo em nenhum mês.
    const liquidadas = (await this.journalEntryRepo.findManyForExport(scope, LEDGER_STATUSES, w))
      .filter((e) => e.sourceType === 'sale.settled' && !e.reversedById && e.sourceId)
      .map((e) => e.sourceId as string);
    const comDoc = new Set(await this.fiscalDocumentRepo.saleIdsWithAuthorizedDocument(scope, liquidadas));
    [...new Set(liquidadas)].filter((id) => !comDoc.has(id)).forEach((saleId, i) => {
      memoria.push({ codigo: `VENDA_SEM_DOCUMENTO_${i + 1}`, descricao: `venda ${saleId} liquidada no mês sem documento fiscal autorizado — o débito não a inclui`, valorCents: '0', fonte: 'ADR-INCR-IBS-CBS-2027 F-IBS-3 (a); dono 21/10' });
    });

    const bp = tributo === 'IBS' ? (['ALIQUOTA_UF', 'ALIQUOTA_MUN'] as const).map((k) => {
      const t = tabela.find((p) => p.tributo === 'IBS' && p.chave === k && p.vigenteDesde <= de && (p.vigenteAte === null || p.vigenteAte >= de));
      return t ? `${k === 'ALIQUOTA_UF' ? 'UF' : 'município'} ${t.aliquotaBp} bp` : `${k === 'ALIQUOTA_UF' ? 'UF' : 'município'} sem linha`;
    }).join(' + ') : null;
    const cbsBp = tributo === 'CBS' ? aliquotaBpNaData(tabela, 'CBS', de) : null;
    memoria.push(
      { codigo: 'CREDITOS_NAO_IMPLEMENTADOS_PR3', descricao: 'créditos de entrada (art. 47) entram no PR-3 — saldo do PR-2 sem crédito', valorCents: '0', fonte: 'BRIEF IBS-CBS-2027 item 9' },
      { codigo: 'RECEITA_BRUTA_ATE_APURACAO', descricao: 'o IBS/CBS fica na receita até esta apuração; o balancete intramensal mostra a receita bruta', valorCents: '0', fonte: 'F-IBS-14 (a), ratificado 21/10' },
      {
        codigo: 'SALDO',
        descricao: `saldo de ${tributo} a recolher (débitos − créditos)${bp ? ` — alíquotas ${ano}: ${bp}, um só saldo (ADR D4)` : cbsBp === null ? ' — alíquota de referência não publicada; o débito é o declarado' : ` — alíquota ${cbsBp} bp`}`,
        valorCents: debitosCents.toString(),
        fonte: FONTE_SALDO,
      },
    );

    const fp: FiscalProfile | null = await this.fiscalProfileRepo.findByScope(scope);
    const provisaoContasConfiguradas = !!(tributo === 'IBS' ? fp?.ibsRecolherAccountId : fp?.cbsRecolherAccountId);
    const avisos: string[] = [];
    if (!provisaoContasConfiguradas) {
      avisos.push(`conta de ${tributo} a recolher não configurada no perfil fiscal da unidade — a reclassificação ficará pendente (BRIEF IBS-CBS-2027 item 12).`);
    }
    return {
      perfil,
      debitosCents,
      memoria,
      parametros,
      provisaoContasConfiguradas,
      avisos,
    };
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler a apuração de IBS/CBS.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para confirmar a apuração de IBS/CBS.');
  }
}
