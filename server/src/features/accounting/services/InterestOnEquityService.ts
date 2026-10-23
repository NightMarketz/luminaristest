/**
 * InterestOnEquityService — juros sobre o capital próprio (BE-INCR-IRRF-DISTRIBUICAO PR-3/PR-4). FIRST-CLASS PRISMA.
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: postEntry(sourceType='jcp.credit', sourceId=<id do cálculo>) na `dataCredito`; gate de período
 *              dentro da tx do postEntry e, antes do cálculo, a prévia `validateEntry` (período fechado ⇒ nada grava)
 *              teste: jcpConfirm.integration.test.ts › "item 28: período fechado ⇒ ACCOUNTING_PERIOD_NOT_OPEN e nada grava (nem cálculo, nem lançamento)"
 *   commit 2 — subrazão: CAS PENDING_POST → POSTED + entryId `where entryId null`; depois, numa tx própria, a Parte A
 *              `system` do e-Lalur/e-Lacs com o vínculo M312 ao lançamento + CAS de `lalurEntryIds` `where null` (item 29)
 *              teste: jcpConfirm.integration.test.ts › "item 28 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento e grava a Parte A"
 *   reconcile — reconcileLancamento() (POST /jcp/:id/lancamento): read-first pela fonte e pelo `lalurEntryIds`, idempotente
 *              teste: jcpConfirm.integration.test.ts › "item 28 (reconcile): 2ª chamada não lança nem grava a Parte A de novo"
 *   fora da tx — a confirmação (o cálculo PENDING_POST + alocações) commita ANTES em runTransaction próprio, com a prévia
 *              recalculada e o hash conferido dentro dela (item 27); falha do lançamento deixa o cálculo pendente (log)
 *              teste: jcpConfirm.integration.test.ts › "item 27: a confirmação recalcula na tx — prévia velha → 409 PREVIA_DESATUALIZADA; outra no mesmo período → 409"
 */
import { createHash } from 'crypto';
import type { Prisma } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { InterestOnEquityWithAlocacoes } from '../repositories/IInterestOnEquityRepository';
import type { ILalurRepository } from '../repositories/ILalurRepository';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
import { deletedLalurCodigo } from './LalurService';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { exigirLinhaVigente, parametrosUsados, type LinhaLegal, type ParametrosUsados } from '../../legalParameters/models/legalParameter';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IInterestOnEquityRepository, MovimentoDiario } from '../repositories/IInterestOnEquityRepository';
import type { IPartnerRepository } from '../repositories/IPartnerRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { JcpBaseContas, JcpBaseGrupo } from '../dtos/CompanyFiscalProfileDto';
import type { JcpConfirmInput, JcpIrrf, JcpIrrfQuery, JcpPreview, JcpPreviewInput } from '../dtos/InterestOnEquityDto';
import { formaEfetiva } from './CompanyFiscalProfileService';
import { janelaDoPeriodo } from '../models/janelaApuracao';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { CLOSING_SOURCE_TYPE } from '../models/closing';
import { linhasDoLivro, vigenteNoAno } from '../models/Lalur.model';
import { PARTICIPACAO_TOTAL_BP, somaParticipacaoBp, vigenteEm } from '../models/partner';
import {
  chaveTjlp,
  diaAnterior,
  faixasJcp,
  irrfJcp,
  lalurPrevisto,
  limiteDedutivel,
  rateioPorParticipacao,
  taxaDiariaTexto,
  CODIGO_RECEITA_JCP,
  decendioDe,
  vencimentoIrrfJcp,
  type Faixa,
  type FormaJcp,
  type LinhaLalurPrevista,
} from '../models/interestOnEquity';

/** O cálculo inteiro, em `bigint` — a prévia (PR-3) o mostra; a confirmação (PR-4) o regrava dentro da tx. */
export interface CalculoJcp {
  unitId: string;
  anoCalendario: number;
  periodo: string;
  dataCredito: string;
  forma: FormaJcp;
  totalCents: bigint;
  faixas: Faixa[];
  jurosMaxTjlpCents: bigint;
  limite50LucroCents: bigint;
  limite50ReservasCents: bigint;
  limiteDedutivelCents: bigint;
  excessoIndedutivelCents: bigint;
  alocacoes: Array<{ partnerId: string; participacaoBp: number; brutoCents: bigint; irrfCents: bigint; liquidoCents: bigint }>;
  lalurPrevisto: LinhaLalurPrevista[];
  avisos: string[];
  aliquotaBp: number;
  parametros: ParametrosUsados;
}

export const JCP_SOURCE_TYPE = 'jcp.credit';
export const JCP_CONFIRMED = 'interest_on_equity.confirmed';
export const JCP_LALUR_RECORDED = 'interest_on_equity.lalur_recorded';
export const JCP_CANCELLED = 'interest_on_equity.cancelled';
/** Item 29 (L-IRD-6) — histórico fixo das linhas `system` da Parte A; nunca texto do usuário. */
export const JCP_LALUR_HISTORICO = 'Juros sobre o capital próprio (IN 1.700 art. 75) — ajuste gerado pelo sistema na confirmação do JCP';

export interface JcpView {
  id: string;
  unitId: string;
  anoCalendario: number;
  periodo: string;
  dataCredito: string;
  forma: string;
  debitoAccountId: string;
  totalCents: number;
  irrfCents: number;
  liquidoCents: number;
  jurosMaxTjlpCents: number;
  limiteDedutivelCents: number;
  excessoCents: number;
  status: string;
  entryId: string | null;
  lalurEntryIds: string[] | null;
  alocacoes: Array<{ partnerId: string; participacaoBp: number; brutoCents: number; irrfCents: number; liquidoCents: number }>;
  memoria: unknown;
  previaSha256: string;
}

/** Item 29 — as linhas do catálogo L12 do ano (M300A/M350A), achadas pela descrição oficial, nunca pelo código literal. */
const DESCRICAO_EXCLUSAO_JCP = '(-) Juros sobre o capital próprio';
const DESCRICAO_ADICAO_EXCESSO_JCP = 'Excesso de juros sobre o capital próprio pagos ou creditados';

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-3 (BRIEF itens 22–26) — cálculo e prévia do JCP (Lei 9.249 art. 9º [D02]; IN 1.700
 * art. 75 [D11]). Só no lucro real (F-IRD-12), um cálculo por período de apuração (F-IRD-17), base pro rata die pelo
 * saldo diário das contas do mapa do PL (F-IRD-15/16) e TJLP mensal ÷ dias do mês (F-IRD-18). Lacunas decididas pelo
 * dono em 23/10 ([[D-2026-10-23-IRRF-DISTRIBUICAO-LACUNAS]]): L-IRD-2 (saldo do limite no início do período) e L-IRD-3
 * (`dataCredito` dentro do período, TJLP até ela). O razão lido é o da unidade (`unitId`), como o mapa do PL (item 8).
 * Nada grava: a prévia não chama `postEntry`.
 */
export class InterestOnEquityService {
  constructor(
    private readonly repo: IInterestOnEquityRepository,
    private readonly partnerRepo: Pick<IPartnerRepository, 'list'>,
    private readonly accountRepo: Pick<IAccountRepository, 'findById'>,
    private readonly companyRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findByScope'>,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly policy: IAccountingPolicy,
    private readonly postingService: Pick<PostingService, 'postEntry' | 'validateEntry' | 'reverseEntry' | 'findEntryBySource'>,
    private readonly lalurRepo: Pick<ILalurRepository, 'createEntry' | 'replaceEntryJournalLinks' | 'findEntryById' | 'updateEntry'>,
    private readonly auditService: AuditService,
  ) {}

  /** Item 26 — a prévia: base por faixa, limites, rateio por sócio com IRRF de 17,5%, excesso e Parte A prevista. */
  async preview(scope: AccountingScope, input: JcpPreviewInput): Promise<JcpPreview> {
    this.assertRead(scope);
    return toPreview(await this.calcular({ ...scope, unitId: input.unitId }, input));
  }

  /**
   * Item 27 (L-IRD-5: "Hash da prévia") — confirma: recalcula DENTRO da tx e recusa com 409 se o hash mudou ou se já há
   * um cálculo vivo no período; grava o cálculo (PENDING_POST) e as alocações; depois lança (item 28) e grava a Parte A
   * (item 29). Período fechado ⇒ a prévia do lançamento recusa antes de gravar qualquer coisa.
   */
  async confirm(scope: AccountingScope, input: JcpConfirmInput): Promise<JcpView> {
    this.assertManage(scope);
    const s: AccountingScope = { ...scope, unitId: input.unitId };
    const fora = await this.calcular(s, input);
    const contas = await this.contasDoLancamento(s, input);
    await this.postingService.validateEntry(s, {
      unitId: s.unitId,
      date: input.dataCredito,
      description: 'prévia do lançamento do JCP',
      sourceType: JCP_SOURCE_TYPE,
      lines: await this.linhas(s, contas, fora.totalCents, somaIrrf(fora)),
    });

    const row = await this.repo.runTransaction(async (tx) => {
      const c = await this.calcular(s, input, tx);
      if (previaSha256(c) !== input.previaSha256) {
        throw new ConflictError('A prévia mudou desde que foi calculada (saldo, TJLP, sócios ou perfil): refaça a prévia e confirme de novo.', 'PREVIA_DESATUALIZADA');
      }
      const vivo = await this.repo.findVivo(s.ownerUserId, input.anoCalendario, input.periodo, tx);
      if (vivo) throw new ConflictError(`Já há JCP confirmado em ${input.periodo}/${input.anoCalendario} (cálculo ${vivo.id}): cancele-o antes.`, 'JCP_JA_CONFIRMADO_NO_PERIODO');
      const irrf = somaIrrf(c);
      const created = await this.repo.create(
        s.ownerUserId,
        s.actorUserId,
        {
          unitId: s.unitId,
          anoCalendario: c.anoCalendario,
          periodo: c.periodo,
          dataCredito: c.dataCredito,
          forma: c.forma,
          debitoAccountId: contas.debitoAccountId,
          memoria: memoriaDe(c) as unknown as Prisma.InputJsonValue,
          jurosMaxTjlpCents: c.jurosMaxTjlpCents,
          limite50LucroCents: c.limite50LucroCents,
          limite50ReservasCents: c.limite50ReservasCents,
          limiteDedutivelCents: c.limiteDedutivelCents,
          totalCents: c.totalCents,
          irrfCents: irrf,
          liquidoCents: c.totalCents - irrf,
          excessoCents: c.excessoIndedutivelCents,
          parametrosIds: c.parametros.ids,
          parametrosSha256: c.parametros.sha256,
          previaSha256: input.previaSha256,
          alocacoes: c.alocacoes.map((a) => ({ partnerId: a.partnerId, participacaoBp: a.participacaoBp, brutoCents: a.brutoCents, irrfCents: a.irrfCents, liquidoCents: a.liquidoCents })),
        },
        tx,
      );
      await this.auditService.append(tx, s, {
        actorUserId: s.actorUserId,
        eventType: JCP_CONFIRMED,
        targetType: 'interest_on_equity',
        targetId: created.id,
        payload: {
          calculationId: created.id,
          anoCalendario: String(created.anoCalendario),
          periodo: created.periodo,
          forma: created.forma,
          dataCredito: created.dataCredito,
          totalCents: String(created.totalCents),
          irrfCents: String(created.irrfCents),
          limiteDedutivelCents: String(created.limiteDedutivelCents),
          excessoCents: String(created.excessoCents),
        },
      });
      return created;
    });

    try {
      return toView(await this.lancar(scope, row));
    } catch (error) {
      logger.warn('JCP: lançamento ou Parte A pendente (o cálculo fica; reconcile em POST /jcp/:id/lancamento)', {
        calculationId: row.id,
        motivo: error instanceof Error ? error.message : String(error),
        error,
      });
      return toView((await this.repo.findById(scope.ownerUserId, row.id)) ?? row); // o lançamento pode ter entrado
    }
  }

  /** Item 28 — reconcile: completa o lançamento e a Parte A que faltarem. Idempotente; os erros sobem ao chamador. */
  async reconcileLancamento(scope: AccountingScope, id: string): Promise<JcpView> {
    this.assertManage(scope);
    const row = await this.repo.findById(scope.ownerUserId, id);
    if (!row) throw new NotFoundError(`JCP '${id}' não encontrado.`);
    if (row.status === 'CANCELLED') return toView(row);
    return toView(await this.lancar(scope, row));
  }

  /**
   * Item 30 — cancela o cálculo: estorna o lançamento e arquiva as linhas `system` da Parte A. JCP pago (L-IRD-4: débito
   * na conta de JCP a pagar com data ≥ `dataCredito`, fora do próprio lançamento e do estorno dele) → 409. Ordem: gate na
   * tx → estorno (idempotente) → gate de novo + arquivo + CAS na tx. Período fechado: o estorno recusa e nada muda.
   */
  async cancel(scope: AccountingScope, id: string): Promise<JcpView> {
    this.assertManage(scope);
    const owner = scope.ownerUserId;
    const row = await this.repo.runTransaction(async (tx) => this.assertCancelavel(scope, id, tx));
    const s: AccountingScope = { ...scope, unitId: row.unitId };
    if (row.entryId) {
      await this.postingService.reverseEntry(s, {
        unitId: s.unitId,
        lancamentoId: row.entryId,
        reversalPostingDate: row.dataCredito,
        reason: `JCP ${row.id} cancelado`,
      });
    }
    await this.repo.runTransaction(async (tx) => {
      await this.assertCancelavel(scope, id, tx);
      const ids = (row.lalurEntryIds as string[] | null) ?? [];
      for (const lid of ids) {
        const e = await this.lalurRepo.findEntryById(s, lid, tx);
        if (e && !e.deletedAt) await this.lalurRepo.updateEntry(s, lid, { deletedAt: new Date(), codigo: deletedLalurCodigo(lid, e.codigo) }, tx);
      }
      if (!(await this.repo.markCancelled(owner, id, scope.actorUserId, tx))) throw new ConflictError(`O JCP '${id}' mudou de status durante o cancelamento.`);
      await this.auditService.append(tx, s, {
        actorUserId: scope.actorUserId,
        eventType: JCP_CANCELLED,
        targetType: 'interest_on_equity',
        targetId: id,
        payload: { calculationId: id, entryId: row.entryId ?? '', lalurEntryIds: ids.join(',') },
      });
    });
    return toView((await this.repo.findById(owner, id)) ?? row);
  }

  /** Item 31 (L13, L16) — DARF 5706 da competência, um por decêndio do crédito. */
  async irrfMensal(scope: AccountingScope, query: JcpIrrfQuery): Promise<JcpIrrf> {
    this.assertRead(scope);
    const calcs = await this.repo.listDaCompetencia(scope.ownerUserId, query.competencia, ['PENDING_POST', 'POSTED']);
    const feriados = await this.legalParams.fotografia(['FERIADO_NACIONAL']);
    const porDecendio = new Map<number, { decendio: number; vencimento: string; totalCents: number; calculos: string[] }>();
    for (const c of calcs) {
      const d = decendioDe(c.dataCredito);
      const g = porDecendio.get(d) ?? { decendio: d, vencimento: vencimentoIrrfJcp(c.dataCredito, feriados), totalCents: 0, calculos: [] };
      g.totalCents += Number(c.irrfCents);
      g.calculos.push(c.id);
      porDecendio.set(d, g);
    }
    const darfs = [...porDecendio.values()].sort((a, b) => a.decendio - b.decendio);
    return { competencia: query.competencia, codigoReceita: CODIGO_RECEITA_JCP, totalCents: darfs.reduce((t, d) => t + d.totalCents, 0), darfs };
  }

  async get(scope: AccountingScope, id: string): Promise<JcpView> {
    this.assertRead(scope);
    const row = await this.repo.findById(scope.ownerUserId, id);
    if (!row) throw new NotFoundError(`JCP '${id}' não encontrado.`);
    return toView(row);
  }

  /** Item 28 (L9, L11, F-IRD-11) — a conta debitada (despesa de JCP ou a de PL), JCP a pagar e IRRF a recolher. */
  private async contasDoLancamento(s: AccountingScope, input: Pick<JcpPreviewInput, 'forma' | 'debitoPlAccountId'>) {
    const fp = await this.fiscalProfileRepo.findByScope(s);
    const exigir = (id: string | null | undefined, rotulo: string): string => {
      if (!id) throw new ValidationError(`Conta de ${rotulo} não configurada no perfil fiscal da unidade (F-TA-7).`);
      return id;
    };
    return {
      debitoAccountId: input.forma === 'PL' ? (input.debitoPlAccountId as string) : exigir(fp?.jcpDespesaAccountId, 'despesa de JCP'),
      jcpPagarAccountId: exigir(fp?.jcpPagarAccountId, 'JCP a pagar'),
      irrfRecolherAccountId: exigir(fp?.irrfRecolherAccountId, 'IRRF a recolher'),
    };
  }

  /** Item 28 — D conta debitada total / C JCP a pagar líquido / C IRRF a recolher (o crédito individualizado do § 10). */
  private async linhas(
    s: AccountingScope,
    contas: { debitoAccountId: string; jcpPagarAccountId: string; irrfRecolherAccountId: string },
    total: bigint,
    irrf: bigint,
  ): Promise<Array<{ accountCode: string; debitCents: number; creditCents: number }>> {
    const codigo = async (id: string) => {
      const conta = await this.accountRepo.findById(s, id);
      if (!conta || conta.deletedAt) throw new NotFoundError(`Conta '${id}' não encontrada nesta unidade.`);
      return conta.code;
    };
    const lines = [
      { accountCode: await codigo(contas.debitoAccountId), debitCents: Number(total), creditCents: 0 },
      { accountCode: await codigo(contas.jcpPagarAccountId), debitCents: 0, creditCents: Number(total - irrf) },
    ];
    if (irrf > 0n) lines.push({ accountCode: await codigo(contas.irrfRecolherAccountId), debitCents: 0, creditCents: Number(irrf) });
    return lines;
  }

  /** Itens 28 e 29 — commit 2 + CAS do lançamento; depois a Parte A + CAS de `lalurEntryIds` numa tx própria. */
  private async lancar(scope: AccountingScope, row: InterestOnEquityWithAlocacoes): Promise<InterestOnEquityWithAlocacoes> {
    const owner = scope.ownerUserId;
    const s: AccountingScope = { ...scope, unitId: row.unitId };
    let atual = row;
    if (atual.status === 'PENDING_POST') {
      let entry = await this.postingService.findEntryBySource(s, JCP_SOURCE_TYPE, atual.id);
      if (entry && (entry.reversedById || entry.status !== 'Posted')) {
        throw new ValidationError(`O lançamento do JCP '${atual.id}' (${entry.id}) foi estornado fora do fluxo.`);
      }
      if (!entry) {
        const contas = await this.contasDoLancamento(s, { forma: atual.forma as FormaJcp, debitoPlAccountId: atual.debitoAccountId });
        entry = await this.postingService.postEntry(s, {
          unitId: s.unitId,
          date: atual.dataCredito,
          description: `Juros sobre o capital próprio ${atual.periodo}/${atual.anoCalendario} (${atual.forma}) — cálculo ${atual.id}`,
          sourceType: JCP_SOURCE_TYPE,
          sourceId: atual.id,
          lines: await this.linhas(s, { ...contas, debitoAccountId: atual.debitoAccountId }, atual.totalCents, atual.irrfCents),
        });
      }
      await this.repo.markPosted(owner, atual.id, entry.id); // false ⇒ outra chamada já vinculou; a releitura mostra
      atual = (await this.repo.findById(owner, atual.id)) ?? atual;
    }
    if (atual.status === 'POSTED' && atual.lalurEntryIds === null && atual.entryId) await this.gravarParteA(s, atual, atual.entryId);
    return (await this.repo.findById(owner, atual.id)) ?? atual;
  }

  /**
   * Item 29 (F-IRD-11; L-IRD-6: "Conta debitada") — linhas `system` da Parte A em `lalur` e `lacs`, IND_RELACAO 2 com a
   * conta debitada no lançamento do JCP e o vínculo M312 a ele. Os códigos vêm do catálogo L12 do ano. Tudo numa tx com o
   * CAS de `lalurEntryIds`: ou grava tudo, ou nada.
   */
  private async gravarParteA(s: AccountingScope, row: InterestOnEquityWithAlocacoes, entryId: string): Promise<void> {
    const previstas = lalurPrevisto(row.forma as FormaJcp, row.totalCents, row.limiteDedutivelCents, (livro) => codigosJcp(livro, row.anoCalendario));
    await this.repo.runTransaction(async (tx) => {
      const ids: string[] = [];
      for (const l of previstas) {
        const e = await this.lalurRepo.createEntry(
          {
            userId: s.ownerUserId,
            unitId: s.unitId,
            year: row.anoCalendario,
            quarter: row.periodo,
            livro: l.livro,
            codigo: l.codigo,
            valorCents: l.valorCents,
            indRelacao: '2',
            histLancamento: JCP_LALUR_HISTORICO,
            parteBId: null,
            accountId: row.debitoAccountId,
            createdById: s.actorUserId,
            origem: 'system',
          },
          tx,
        );
        await this.lalurRepo.replaceEntryJournalLinks(e.id, [entryId], tx);
        ids.push(e.id);
      }
      if (!(await this.repo.setLalurEntryIds(s.ownerUserId, row.id, ids, tx))) throw new ConflictError(`A Parte A do JCP '${row.id}' já foi gravada.`);
      await this.auditService.append(tx, s, {
        actorUserId: s.actorUserId,
        eventType: JCP_LALUR_RECORDED,
        targetType: 'interest_on_equity',
        targetId: row.id,
        payload: { calculationId: row.id, lalurEntryIds: ids.join(',') },
      });
    });
  }

  /** Item 30 — gate do cancelamento: POSTED e não pago (L-IRD-4). */
  private async assertCancelavel(scope: AccountingScope, id: string, tx: Prisma.TransactionClient): Promise<InterestOnEquityWithAlocacoes> {
    const row = await this.repo.findById(scope.ownerUserId, id, tx);
    if (!row) throw new NotFoundError(`JCP '${id}' não encontrado.`);
    if (row.status !== 'POSTED') throw new ConflictError(`Só um JCP lançado (POSTED) pode ser cancelado; este está ${row.status}.`, 'JCP_NAO_POSTADO');
    const fp = await this.fiscalProfileRepo.findByScope({ ...scope, unitId: row.unitId }, tx);
    if (fp?.jcpPagarAccountId && row.entryId) {
      const pago = await this.repo.debitosNaContaDesde(scope.ownerUserId, fp.jcpPagarAccountId, new Date(row.dataCredito), row.entryId, LEDGER_STATUSES, tx);
      if (pago > 0n) throw new ConflictError(`JCP já pago: há baixa de ${pago} centavos no JCP a pagar desde ${row.dataCredito}. Estorne a baixa antes.`, 'JCP_JA_PAGO');
    }
    return row;
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler o JCP.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para confirmar ou cancelar o JCP.');
  }

  async calcular(s: AccountingScope, input: JcpPreviewInput, tx?: Prisma.TransactionClient): Promise<CalculoJcp> {
    // Item 22 (F-IRD-12) e item 23 (F-IRD-17): só no Real; o período segue a forma do perfil, como no X7.
    const perfil = await this.companyRepo.findByYear(s, input.anoCalendario, tx);
    if (!perfil || perfil.regime !== 'REAL') {
      throw new ValidationError(
        'JCP só no lucro real (F-IRD-12): fora dele não há dedução, e o IRRF de 17,5% é definitivo ao sócio PF.',
        null,
        'JCP_SO_NO_LUCRO_REAL',
      );
    }
    const forma = formaEfetiva(perfil.regime, perfil.formaApuracaoIrpjCsll);
    if ((forma === 'ANUAL') !== (input.periodo === 'A00')) {
      throw new ValidationError(`Período ${input.periodo} não serve ao Real ${forma ?? 'sem forma'}: trimestral usa T01..T04; anual usa A00.`, null, 'PERIODO_INCOMPATIVEL_COM_A_FORMA');
    }
    const janela = janelaDoPeriodo(input.anoCalendario, input.periodo);
    if (input.dataCredito < janela.de || input.dataCredito > janela.ate) {
      throw new ValidationError(`dataCredito ${input.dataCredito} fora do período ${input.periodo} (${janela.de} a ${janela.ate}) — L-IRD-3.`, null, 'DATA_CREDITO_FORA_DO_PERIODO');
    }

    // Item 22 (F-IRD-14, F-IRD-7): participações vigentes somam 100% e nenhum sócio no exterior.
    const socios = (await this.partnerRepo.list(s, tx)).filter((p) => vigenteEm(p, input.dataCredito));
    if (socios.some((p) => !p.residenteBrasil)) {
      throw new ValidationError('Há sócio não residente no Brasil: o JCP a residente no exterior está fora do escopo (F-IRD-7).', null, 'SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO');
    }
    const soma = somaParticipacaoBp(socios);
    if (soma !== PARTICIPACAO_TOTAL_BP) {
      throw new ValidationError(`As participações vigentes em ${input.dataCredito} somam ${soma} bp; o JCP exige ${PARTICIPACAO_TOTAL_BP} (item 22).`, null, 'SOMA_PARTICIPACOES_INVALIDA');
    }

    const mapa = perfil.jcpBaseContas as JcpBaseContas | null;
    if (!mapa) throw new ValidationError('Mapa das contas do PL (jcpBaseContas) não configurado no perfil da empresa (item 8).', null, 'JCP_MAPA_PL_NAO_CONFIGURADO');
    if (input.forma === 'PL') {
      const conta = await this.accountRepo.findById(s, input.debitoPlAccountId as string, tx);
      if (!conta || conta.deletedAt) throw new NotFoundError(`Conta '${input.debitoPlAccountId}' não encontrada nesta unidade.`);
      if (conta.nature !== 'Equity') throw new ValidationError(`A conta debitada no JCP em PL tem de ser Equity; '${conta.code}' é ${conta.nature}.`);
    }

    // Item 22 (L-IRD-3): TJLP vigente do início do período até a dataCredito; sem linha → PARAMETRO_LEGAL_AUSENTE.
    const linhas: LinhaLegal[] = await this.legalParams.fotografia(['TJLP', 'IRRF_DISTRIBUICAO']);
    const taxaDoDia = (dia: string) => exigirLinhaVigente(linhas, 'TJLP', chaveTjlp(dia), dia).valorInt as number;
    const aliquotaBp = exigirLinhaVigente(linhas, 'IRRF_DISTRIBUICAO', 'ALIQUOTA_JCP_BP', input.dataCredito).valorInt as number;

    // Item 24 — base pro rata die pelo saldo do fim do dia anterior.
    const grupos = Object.entries(mapa) as Array<[JcpBaseGrupo, string[]]>;
    const grupoDe = new Map<string, JcpBaseGrupo>();
    for (const [g, ids] of grupos) for (const id of ids) grupoDe.set(id, g);
    const movs = await this.repo.movimentosDasContas(s.ownerUserId, [...grupoDe.keys()], new Date(input.dataCredito), LEDGER_STATUSES, tx);
    const saldoAte = saldosPorGrupo(movs, grupoDe);
    const fimAnoAnterior = `${input.anoCalendario - 1}-12-31`;
    const lucrosAnoAnterior = saldoAte(fimAnoAnterior, ['LUCROS_ACUMULADOS']);
    const baseNoFimDoDia = (dia: string): bigint => {
      // § 1º VI (L12): lucros acumulados só até o saldo apurado no exercício anterior.
      const la = saldoAte(dia, ['LUCROS_ACUMULADOS']);
      return saldoAte(dia, ['CAPITAL_INTEGRALIZADO', 'RESERVAS_CAPITAL', 'RESERVAS_LUCROS', 'ACOES_TESOURARIA']) + (la < lucrosAnoAnterior ? la : lucrosAnoAnterior);
    };
    const { faixas, jurosMaxTjlpCents } = faixasJcp(janela.de, input.dataCredito, baseNoFimDoDia, taxaDoDia);

    // Item 25 — limites: lucro do período antes do JCP, após a CSLL e antes do IRPJ (§§ 2º I e 3º), e lucros + reservas
    // no início do período (L-IRD-2).
    const fp = await this.fiscalProfileRepo.findByScope(s, tx);
    const fora = new Set([fp?.jcpDespesaAccountId, fp?.irpjDespesaAccountId].filter((id): id is string => !!id));
    const doPeriodo = await this.repo.totaisDaUnidade(s.ownerUserId, s.unitId, {
      de: new Date(janela.de),
      ate: new Date(janela.ate),
      status: LEDGER_STATUSES,
      excluirFontes: [CLOSING_SOURCE_TYPE],
    }, tx);
    const lucro = doPeriodo
      .filter((t) => (t.nature === 'Revenue' || t.nature === 'Expense') && !fora.has(t.accountId))
      .reduce((acc, t) => acc + t.creditCents - t.debitCents, 0n);
    const lucrosReservas = saldoAte(diaAnterior(janela.de), ['LUCROS_ACUMULADOS', 'RESERVAS_LUCROS']);
    const limites = limiteDedutivel(jurosMaxTjlpCents, lucro, lucrosReservas);

    const total = BigInt(input.totalCents);
    const alocacoes = this.alocar(input, socios, total).map((a) => {
      const irrf = irrfJcp(a.brutoCents, aliquotaBp);
      return { ...a, irrfCents: irrf, liquidoCents: a.brutoCents - irrf };
    });

    // Item 8 — conta de PL com saldo e fora do mapa aparece como aviso.
    const avisos: string[] = [];
    const naData = await this.repo.totaisDaUnidade(s.ownerUserId, s.unitId, { ate: new Date(diaAnterior(input.dataCredito)), status: LEDGER_STATUSES, excluirFontes: [] }, tx);
    const foraDoMapa = naData.filter((t) => t.nature === 'Equity' && t.creditCents !== t.debitCents && !grupoDe.has(t.accountId)).map((t) => t.code).sort();
    if (foraDoMapa.length > 0) {
      avisos.push(`Contas de PL com saldo fora do mapa da base do JCP (jcpBaseContas): ${foraDoMapa.join(', ')}. Confira se alguma entra no art. 75 I–V.`);
    }

    return {
      unitId: s.unitId,
      anoCalendario: input.anoCalendario,
      periodo: input.periodo,
      dataCredito: input.dataCredito,
      forma: input.forma,
      totalCents: total,
      faixas,
      jurosMaxTjlpCents,
      ...limites,
      excessoIndedutivelCents: total > limites.limiteDedutivelCents ? total - limites.limiteDedutivelCents : 0n,
      alocacoes,
      lalurPrevisto: lalurPrevisto(input.forma, total, limites.limiteDedutivelCents, (livro) => codigosJcp(livro, input.anoCalendario)),
      avisos,
      aliquotaBp,
      parametros: parametrosUsados(
        linhas.filter((l) => l.tabela === 'TJLP' || l.chave === 'ALIQUOTA_JCP_BP'),
        janela.de,
        input.dataCredito,
      ),
    };
  }

  /** Item 26 — rateio pela participação, ou o do corpo: só sócios vigentes, e a soma bate com o total. */
  private alocar(
    input: JcpPreviewInput,
    socios: ReadonlyArray<{ id: string; participacaoBp: number }>,
    total: bigint,
  ): Array<{ partnerId: string; participacaoBp: number; brutoCents: bigint }> {
    const bp = new Map(socios.map((p) => [p.id, p.participacaoBp]));
    if (!input.rateio) {
      return rateioPorParticipacao(total, socios.map((p) => ({ partnerId: p.id, participacaoBp: p.participacaoBp }))).map((r) => ({
        ...r,
        participacaoBp: bp.get(r.partnerId) as number,
      }));
    }
    const fora = input.rateio.filter((r) => !bp.has(r.partnerId)).map((r) => r.partnerId);
    if (fora.length > 0) throw new ValidationError(`Rateio com quem não é sócio vigente em ${input.dataCredito}: ${fora.join(', ')}.`, null, 'RATEIO_INVALIDO');
    const soma = input.rateio.reduce((acc, r) => acc + BigInt(r.brutoCents), 0n);
    if (soma !== total) throw new ValidationError(`O rateio soma ${soma} centavos; o total é ${total}.`, null, 'RATEIO_INVALIDO');
    return input.rateio.map((r) => ({ partnerId: r.partnerId, participacaoBp: bp.get(r.partnerId) as number, brutoCents: BigInt(r.brutoCents) }));
  }
}

/** Saldo credor (crédito − débito) acumulado até o fim de `dia`, somado nos grupos pedidos. */
function saldosPorGrupo(movs: readonly MovimentoDiario[], grupoDe: ReadonlyMap<string, JcpBaseGrupo>) {
  const ordenados = [...movs].sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));
  return (dia: string, grupos: readonly JcpBaseGrupo[]): bigint => {
    let s = 0n;
    for (const m of ordenados) {
      if (m.dia > dia) break;
      if (grupos.includes(grupoDe.get(m.accountId) as JcpBaseGrupo)) s += m.creditCents - m.debitCents;
    }
    return s;
  };
}

/** Item 29 — os códigos da exclusão e da adição do JCP no catálogo L12 vigente no ano. */
export function codigosJcp(livro: 'lalur' | 'lacs', ano: number): { exclusao: string; adicaoExcesso: string } {
  const achar = (descricao: string, tipoLanc: string) => {
    const linha = linhasDoLivro(livro).find((l) => l.descricao === descricao && l.tipoLanc === tipoLanc && vigenteNoAno(l, ano));
    if (!linha) throw new ValidationError(`Catálogo L12 sem a linha "${descricao}" (${livro}) vigente em ${ano}.`);
    return linha.codigo;
  };
  return { exclusao: achar(DESCRICAO_EXCLUSAO_JCP, 'E'), adicaoExcesso: achar(DESCRICAO_ADICAO_EXCESSO_JCP, 'A') };
}

function somaIrrf(c: CalculoJcp): bigint {
  return c.alocacoes.reduce((t, a) => t + a.irrfCents, 0n);
}

/** L-IRD-5 — hash do cálculo inteiro (o que a prévia mostra + a proveniência dos parâmetros). */
export function previaSha256(c: CalculoJcp): string {
  const { previaSha256: _vazio, ...semHash } = toPreviewSemHash(c);
  return createHash('sha256').update(JSON.stringify({ ...semHash, parametros: c.parametros.sha256 })).digest('hex');
}

function memoriaDe(c: CalculoJcp) {
  const p = toPreviewSemHash(c);
  return { faixas: p.faixas, limite50LucroCents: p.limite50LucroCents, limite50ReservasCents: p.limite50ReservasCents, lalurPrevisto: p.lalurPrevisto, avisos: p.avisos };
}

function toPreview(c: CalculoJcp): JcpPreview {
  return { ...toPreviewSemHash(c), previaSha256: previaSha256(c) };
}

function toView(row: InterestOnEquityWithAlocacoes): JcpView {
  return {
    id: row.id,
    unitId: row.unitId,
    anoCalendario: row.anoCalendario,
    periodo: row.periodo,
    dataCredito: row.dataCredito,
    forma: row.forma,
    debitoAccountId: row.debitoAccountId,
    totalCents: Number(row.totalCents),
    irrfCents: Number(row.irrfCents),
    liquidoCents: Number(row.liquidoCents),
    jurosMaxTjlpCents: Number(row.jurosMaxTjlpCents),
    limiteDedutivelCents: Number(row.limiteDedutivelCents),
    excessoCents: Number(row.excessoCents),
    status: row.status,
    entryId: row.entryId,
    lalurEntryIds: (row.lalurEntryIds as string[] | null) ?? null,
    alocacoes: row.alocacoes.map((a) => ({
      partnerId: a.partnerId,
      participacaoBp: a.participacaoBp,
      brutoCents: Number(a.brutoCents),
      irrfCents: Number(a.irrfCents),
      liquidoCents: Number(a.liquidoCents),
    })),
    memoria: row.memoria,
    previaSha256: row.previaSha256,
  };
}

function toPreviewSemHash(c: CalculoJcp): JcpPreview {
  return {
    previaSha256: '',
    faixas: c.faixas.map((f) => ({ de: f.de, ate: f.ate, baseCents: Number(f.baseCents), taxaDiaria: taxaDiariaTexto(f), jurosCents: Number(f.jurosCents) })),
    jurosMaxTjlpCents: Number(c.jurosMaxTjlpCents),
    limite50LucroCents: Number(c.limite50LucroCents),
    limite50ReservasCents: Number(c.limite50ReservasCents),
    limiteDedutivelCents: Number(c.limiteDedutivelCents),
    excessoIndedutivelCents: Number(c.excessoIndedutivelCents),
    alocacoes: c.alocacoes.map((a) => ({
      partnerId: a.partnerId,
      participacaoBp: a.participacaoBp,
      brutoCents: Number(a.brutoCents),
      irrfCents: Number(a.irrfCents),
      liquidoCents: Number(a.liquidoCents),
    })),
    lalurPrevisto: c.lalurPrevisto.map((l) => ({ livro: l.livro, codigo: l.codigo, valorCents: Number(l.valorCents) })),
    avisos: c.avisos,
  };
}
