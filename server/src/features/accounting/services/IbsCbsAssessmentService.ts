/**
 * IbsCbsAssessmentService — apuração MENSAL de IBS/CBS no regime regular (IBS-CBS-2027 PR-2). FIRST-CLASS PRISMA.
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: reverseEntry da reclassificação viva de cada linha SUPERSEDED do (PJ, ano, mês, tributo) e depois
 *              postEntry(sourceType='ibs_cbs_assessment', sourceId=<id da apuração>) no último dia do mês: D receita de
 *              serviços (3.1) / D receita de revenda (3.3) / C IBS|CBS a recolher do perfil fiscal = débitos (BRIEF item 12,
 *              F-IBS-8 c, F-IBS-14 a); gate de período dentro da tx do postEntry; a reclassificação é achada pela FONTE
 *              teste: ibsCbsProvision.integration.test.ts › "item 12 (commit 1 — razão): D receita de serviços + D receita de revenda / C a recolher = débitos; período fechado ⇒ a confirmação fica, pendente, nenhum lançamento"
 *              teste: ibsCbsProvision.integration.test.ts › "item 12 (substituição): estorna a reclassificação da substituída e posta a da nova — 1 viva por tributo"
 *   commit 2 — subrazão: CAS provisaoEntryId `where null`, sem tx de razão
 *              teste: ibsCbsProvision.integration.test.ts › "item 12 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)"
 *   reconcile — reconcileIbsCbsProvisao(): read-first, idempotente; fecha "commit 1 ok, commit 2 falhou" e a reclassificação pendente
 *              teste: ibsCbsProvision.integration.test.ts › "item 12 (reconcile): completa e é idempotente — 2ª chamada sem lançamento novo, mesmo provisaoEntryId"
 *   fora da tx — a confirmação (item 9) commita ANTES, em runTransaction próprio; falha da reclassificação não a desfaz
 *
 * BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6–13 (F-IBS-2 a). Molde X7 Fase A / X8: a confirmação
 * recalcula FORA da tx e abre UMA `runTransaction` com os gates autoritativos dentro (memória `authoritative-gate-inside-tx`,
 * `tx` propagado ao repo): perfil da PJ igual ao lido, CAS de `expectedSupersedesId` (409), cascata (substituir M derruba
 * M+1.. do tributo, devolvidos em `reconfirmar`). Contas da receita: as do plano padrão que o `receitaBrutaPorAtividade`
 * segrega (3.1 serviço, 3.3 revenda).
 */
import type { CompanyFiscalProfile, ConsumptionTaxAssessment, Prisma } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IConsumptionTaxAssessmentRepository } from '../repositories/IConsumptionTaxAssessmentRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import { AUTHORIZED_STATUSES, type IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
import { REVENDA_ACCOUNT_CODE, SERVICO_ACCOUNT_CODE } from './receitaBrutaPorAtividade';
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
/** Item 12: fonte (chave de idempotência do `postEntry`) da reclassificação receita → IBS/CBS a recolher. */
export const IBS_CBS_PROVISION_SOURCE_TYPE = 'ibs_cbs_assessment';

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
    private readonly fiscalDocumentRepo: Pick<IFiscalDocumentRepository, 'findForIbsCbs' | 'saleIdsWithAuthorizedDocument'>,
    private readonly journalEntryRepo: Pick<IJournalEntryRepository, 'findSourceIdsInWindow'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    /** Item 12: a reclassificação em 2 commits (contas do perfil fiscal; razão pelo PostingService). */
    private readonly fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findByScope'>,
    private readonly accountRepo: Pick<IAccountRepository, 'findById'>,
    private readonly postingService: Pick<PostingService, 'postEntry' | 'reverseEntry' | 'findEntryBySource'>,
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

    const { row, cair, reconfirmar } = await this.repo.runTransaction(async (tx) => {
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
      return { row, cair, reconfirmar: posteriores.map((p) => `${mm(p.mes)}/${p.anoCalendario}`) };
    });
    // Item 12 — DEPOIS do commit da confirmação, best-effort: estorna a reclassificação do que caiu e lança a da nova.
    for (const sub of cair) await this.bestEffort(sub.id, () => this.estornarViva(scope, sub));
    const final = (await this.bestEffort(row.id, () => this.provisionar(scope, row))) ?? row;
    return { assessment: toView(final), reconfirmar };
  }

  /**
   * Item 12 — reconcile: completa o que faltar (estorno da substituída, lançamento, CAS). Idempotente: estorno e
   * `postEntry` são idempotentes pela fonte e o CAS só vincula se estiver nulo. Os erros (período fechado, conta não
   * configurada) sobem ao chamador — não há confirmação a proteger.
   */
  async reconcileIbsCbsProvisao(scope: AccountingScope, id: string): Promise<IbsCbsAssessmentView> {
    this.assertManage(scope);
    const row = await this.repo.findById(scope.ownerUserId, id);
    if (!row) throw new NotFoundError(`Apuração de IBS/CBS '${id}' não encontrada.`);
    if (row.status !== 'CONFIRMED') {
      await this.estornarViva(scope, row);
      return toView(row);
    }
    return toView(await this.provisionar(scope, row));
  }

  /** "Falha em qualquer passo ⇒ a confirmação fica" (molde X7 item 15). O erro vai ao log; nunca relança. */
  private async bestEffort<T>(assessmentId: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      logger.warn('IBS/CBS: reclassificação pendente (a confirmação fica; reconcile em reconcileIbsCbsProvisao)', {
        assessmentId,
        motivo: error instanceof Error ? error.message : String(error),
        error,
      });
      return null;
    }
  }

  /**
   * Item 12: (1) estorna a reclassificação viva das SUPERSEDED do mesmo (PJ, ano, mês, tributo) — nunca duas vivas;
   * (2) pendente ⇒ reaproveita o lançamento achado pela fonte (crash entre post e CAS) ou posta D 3.1 / D 3.3 / C a recolher
   * pelas linhas RECLASSIFICACAO_* da memória (soma = `debitosCents`) no último dia do mês; (3) CAS do `provisaoEntryId`.
   * Débito 0 ⇒ nada a reclassificar.
   */
  private async provisionar(scope: AccountingScope, row: ConsumptionTaxAssessment): Promise<ConsumptionTaxAssessment> {
    const owner = scope.ownerUserId;
    for (const sub of await this.repo.findSuperseded(owner, row.anoCalendario, row.mes, row.tributo)) await this.estornarViva(scope, sub);
    if (row.provisaoEntryId || row.debitosCents === 0n) return row;

    const s: AccountingScope = { ...scope, unitId: row.unitId };
    let entry = await this.postingService.findEntryBySource(s, IBS_CBS_PROVISION_SOURCE_TYPE, row.id);
    if (entry && (entry.reversedById || entry.status !== 'Posted')) {
      throw new ValidationError(`A reclassificação da apuração '${row.id}' (${entry.id}) foi estornada fora do fluxo — substitua a apuração para lançar de novo.`);
    }
    if (!entry) {
      const fp = await this.fiscalProfileRepo.findByScope(s);
      const rotulo = `${row.tributo} a recolher`;
      const recolher = await this.contaDoPerfil(s, row.tributo === 'IBS' ? fp?.ibsRecolherAccountId : fp?.cbsRecolherAccountId, rotulo);
      const memoria = MemoriaIbsCbsSchema.parse(row.memoria);
      const valor = (codigo: string) => BigInt(memoria.find((l) => l.codigo === codigo)?.valorCents ?? '0');
      const servico = valor('RECLASSIFICACAO_SERVICO');
      const revenda = valor('RECLASSIFICACAO_REVENDA');
      if (servico + revenda !== row.debitosCents) {
        throw new ValidationError(`apuração '${row.id}': reclassificação (${servico} + ${revenda}) difere dos débitos (${row.debitosCents}).`);
      }
      const lines = [
        ...(servico !== 0n ? [{ accountCode: SERVICO_ACCOUNT_CODE, debitCents: Number(servico), creditCents: 0 }] : []),
        ...(revenda !== 0n ? [{ accountCode: REVENDA_ACCOUNT_CODE, debitCents: Number(revenda), creditCents: 0 }] : []),
        { accountCode: recolher, debitCents: 0, creditCents: Number(row.debitosCents) },
      ];
      entry = await this.postingService.postEntry(s, {
        unitId: s.unitId,
        date: fimDoMes(row.anoCalendario, row.mes),
        description: `${row.tributo} ${mm(row.mes)}/${row.anoCalendario}: receita → ${rotulo} (apuração ${row.id})`,
        sourceType: IBS_CBS_PROVISION_SOURCE_TYPE,
        sourceId: row.id,
        lines,
      });
    }
    await this.repo.setProvisaoEntryId(owner, row.id, entry.id); // false ⇒ outra chamada já vinculou; a releitura mostra
    return (await this.repo.findById(owner, row.id)) ?? row;
  }

  /** Estorna a reclassificação da linha (achada pela fonte), se viva. Já estornada ou inexistente ⇒ nada. */
  private async estornarViva(scope: AccountingScope, row: ConsumptionTaxAssessment): Promise<void> {
    const s: AccountingScope = { ...scope, unitId: row.unitId };
    const entry = await this.postingService.findEntryBySource(s, IBS_CBS_PROVISION_SOURCE_TYPE, row.id);
    if (!entry || entry.reversedById || entry.status !== 'Posted') return;
    await this.postingService.reverseEntry(s, {
      unitId: s.unitId,
      lancamentoId: entry.id,
      reversalPostingDate: fimDoMes(row.anoCalendario, row.mes),
      reason: `apuração ${row.id} substituída`,
    });
  }

  /** F-TA-7 (a): conta ausente ⇒ erro com o motivo (a confirmação fica pendente; o reconcile o devolve). */
  private async contaDoPerfil(scope: AccountingScope, id: string | null | undefined, rotulo: string): Promise<string> {
    if (!id) throw new ValidationError(`Conta de ${rotulo} não configurada no perfil fiscal da unidade (F-TA-7).`);
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${rotulo} '${id}' não existe neste escopo.`);
    return account.code;
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
      natureza: d.kind === 'NFE' ? 'MERCADORIA' : 'SERVICO', // item 12: NFS-e = serviço, NF-e = mercadoria
      status: d.status as IbsCbsDocumento['status'],
      ibsCents: d.vIbsCents,
      cbsCents: d.vCbsCents,
      baseCents: null, // o documento não persiste a base de IBS/CBS (nem o ADN a devolve) — CONFERENCIA_SEM_BASE (dono 21/10)
      cClassTrib: null,
    }));
    // Item 7 (dono 21/10): venda liquidada no mês (`sale.settled` não estornado) sem documento autorizado vivo em NENHUM mês.
    const liquidadas = await this.journalEntryRepo.findSourceIdsInWindow(scope, 'sale.settled', LEDGER_STATUSES, mesBounds(ano, mes));
    const comDocumento = new Set(await this.fiscalDocumentRepo.saleIdsWithAuthorizedDocument(scope, liquidadas));
    const vendasSemDocumento = liquidadas.filter((s) => !comDocumento.has(s));

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
