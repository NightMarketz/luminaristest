/**
 * ProfitDistributionService — distribuição de lucros com IRRF (BE-INCR-IRRF-DISTRIBUICAO PR-2). FIRST-CLASS PRISMA.
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: postEntry(sourceType='profit.distribution', sourceId=<id do evento>) na `dataEvento`; gate de período
 *              dentro da tx do postEntry e, antes do evento, a prévia `validateEntry` (período fechado ⇒ nada grava)
 *              teste: profitDistribution.integration.test.ts › "item 17: período fechado ⇒ ACCOUNTING_PERIOD_NOT_OPEN e nada grava (nem evento, nem lançamento)"
 *   commit 2 — subrazão: CAS PENDING_POST → POSTED + entryId `where entryId null`, sem tx de razão
 *              teste: profitDistribution.integration.test.ts › "item 17 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)"
 *   reconcile — reconcileLancamento() (POST /profit-distributions/:id/lancamento): read-first pela fonte, idempotente
 *              teste: profitDistribution.integration.test.ts › "item 17 (reconcile): 2ª chamada não lança de novo e devolve o mesmo entryId"
 *   fora da tx — o evento (commit "0", PENDING_POST) commita ANTES em runTransaction próprio, com a soma do mês e o
 *              aviso de saldo dentro dela; falha do lançamento deixa o evento pendente (log), sem desfazê-lo
 *              teste: profitDistribution.integration.test.ts › "item 17 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)"
 */
import type { Account, Prisma, ProfitDistributionEvent } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, RetencaoExcedePagamentoError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { exigirLinhaVigente, parametrosUsados, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IProfitDistributionRepository, TotalPorConta } from '../repositories/IProfitDistributionRepository';
import type { IPartnerRepository } from '../repositories/IPartnerRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
import type {
  CancelProfitDistributionInput,
  IrrfMensal,
  IrrfMensalQuery,
  MemoriaDistribuicao,
  ProfitDistributionInput,
  ProfitDistributionPreview,
} from '../dtos/ProfitDistributionDto';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { LUCROS_ACUMULADOS_GRUPO_CODE, RESERVAS_LUCROS_GRUPO_CODE } from '../fixtures/ChartOfAccountsFixture';
import {
  CODIGO_RECEITA_DIVIDENDOS,
  STATUS_QUE_SOMAM,
  brutoMinimo,
  calcularMes,
  sugestao,
  tetoSemRetencao,
  vencimentoIrrfDividendos,
  type CalculoMes,
  type EventoDoMes,
  type ParametrosIrrf,
} from '../models/profitDistribution';

export const PROFIT_DISTRIBUTION_SOURCE_TYPE = 'profit.distribution';
export const PROFIT_DISTRIBUTION_CREATED = 'profit_distribution.created';
export const PROFIT_DISTRIBUTION_CANCELLED = 'profit_distribution.cancelled';

/** Item 18 (dono, questionário de 2026-10-23: "Plano padrão") — lucros acumulados (2.3.1) e reservas de lucros (2.3.3). */
export const PREFIXOS_SALDO_LUCRO = [LUCROS_ACUMULADOS_GRUPO_CODE, RESERVAS_LUCROS_GRUPO_CODE] as const;
const AVISO_SALDO_LUCRO =
  'distribuição acima do lucro apurado: risco de devolução ou de tributação; IN 1.500 art. 8º § 1º';

export interface ProfitDistributionView {
  id: string;
  unitId: string;
  partnerId: string;
  evento: string;
  dataEvento: string;
  competencia: string;
  debitoAccountId: string;
  contraAccountId: string;
  brutoCents: number;
  irrfCents: number;
  liquidoCents: number;
  origemLucro: string;
  anoResultado: number | null;
  aprovadoEm: string | null;
  atoSourceDocumentId: string | null;
  memoria: MemoriaDistribuicao;
  parametrosSha256: string;
  avisoSaldoLucro: string | null;
  status: string;
  entryId: string | null;
  cancelledAt: string | null;
}

/** O que a prévia e a gravação compartilham: sócio, contas e parâmetros já validados. */
interface Preparo {
  s: AccountingScope;
  taxId: string;
  tipoPessoa: string;
  competencia: string;
  contraAccountId: string;
  irrfRecolherAccountId: string | null;
  params: ParametrosIrrf;
  linhas: LinhaLegal[];
  transicao: { linhaId: string; valor: string } | null;
}

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-2 (BRIEF itens 10–21) — evento de distribuição de lucros (crédito, pagamento, emprego ou
 * entrega: F-IRD-4, o primeiro evento) com o IRRF do art. 6º-A da Lei 9.250 [D05]. A soma do mês é por `taxId` na PJ
 * inteira (todas as unidades), dentro da tx que grava o evento (item 12). Policy: a régua da apuração de tributos
 * (`canManageTaxAssessment`/`canReadTaxAssessment`) — o evento gera retenção e DARF.
 */
export class ProfitDistributionService {
  constructor(
    private readonly repo: IProfitDistributionRepository,
    private readonly partnerRepo: Pick<IPartnerRepository, 'findById'>,
    private readonly accountRepo: Pick<IAccountRepository, 'findById'>,
    private readonly fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findByScope'>,
    private readonly postingService: Pick<PostingService, 'postEntry' | 'validateEntry' | 'reverseEntry' | 'findEntryBySource'>,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  /** Item 15 (F-IRD-5R) — teto sem retenção, IRRF que o evento geraria e a sugestão. Nada grava. */
  async preview(scope: AccountingScope, input: ProfitDistributionInput): Promise<ProfitDistributionPreview> {
    this.assertRead(scope);
    const p = await this.preparar(scope, input);
    const outros = (await this.repo.listDoMes(scope.ownerUserId, p.taxId, p.competencia, STATUS_QUE_SOMAM)).map(toEventoDoMes);
    const bruto = BigInt(input.brutoCents);
    const calc = calcularMes(outros, { brutoCents: bruto, origemLucro: input.origemLucro }, p.params, p.tipoPessoa);
    const excede = calc.irrfEventoCents > bruto;
    return {
      competencia: p.competencia,
      somaMesCents: Number(calc.somaMesCents),
      baseMesCents: Number(calc.baseMesCents),
      devidoMesCents: Number(calc.devidoMesCents),
      jaRetidoCents: Number(calc.jaRetidoCents),
      irrfEventoCents: Number(calc.irrfEventoCents),
      liquidoCents: Number(bruto - calc.irrfEventoCents),
      tetoSemRetencaoCents: p.tipoPessoa === 'PJ' ? Number(p.params.limiteMensalCents) : Number(tetoSemRetencao(outros, p.params)),
      brutoMinimoCents: excede ? Number(brutoMinimo(outros, input.origemLucro, p.params, p.tipoPessoa)) : null,
      sugestao: sugestao(outros, calc, bruto, p.params, p.tipoPessoa),
      avisoSaldoLucro: await this.avisoSaldoLucro(scope.ownerUserId, input.dataEvento, bruto),
    };
  }

  /**
   * Itens 12, 16, 17 e 18 — grava o evento (`PENDING_POST`) com a soma do mês recalculada DENTRO da tx e lança em
   * seguida. Período fechado ⇒ a prévia do lançamento recusa antes de gravar qualquer coisa.
   */
  async create(scope: AccountingScope, input: ProfitDistributionInput): Promise<ProfitDistributionView> {
    this.assertManage(scope);
    const p = await this.preparar(scope, input);
    const bruto = BigInt(input.brutoCents);

    // Prévia do lançamento fora da tx (período, contas que aceitam lançamento), com o IRRF de agora: a soma autoritativa
    // é refeita dentro da tx abaixo.
    const prevista = calcularMes(
      (await this.repo.listDoMes(scope.ownerUserId, p.taxId, p.competencia, STATUS_QUE_SOMAM)).map(toEventoDoMes),
      { brutoCents: bruto, origemLucro: input.origemLucro },
      p.params,
      p.tipoPessoa,
    );
    if (prevista.irrfEventoCents <= bruto) {
      await this.postingService.validateEntry(p.s, {
        unitId: p.s.unitId,
        date: input.dataEvento,
        description: 'prévia da distribuição de lucros',
        sourceType: PROFIT_DISTRIBUTION_SOURCE_TYPE,
        lines: await this.linhas(p, input.debitoAccountId, bruto, prevista.irrfEventoCents),
      });
    }

    const row = await this.repo.runTransaction(async (tx) => {
      const outros = (await this.repo.listDoMes(scope.ownerUserId, p.taxId, p.competencia, STATUS_QUE_SOMAM, tx)).map(toEventoDoMes);
      const calc = calcularMes(outros, { brutoCents: bruto, origemLucro: input.origemLucro }, p.params, p.tipoPessoa);
      if (calc.irrfEventoCents > bruto) {
        const minimo = brutoMinimo(outros, input.origemLucro, p.params, p.tipoPessoa);
        throw new RetencaoExcedePagamentoError(
          `O IRRF do mês que cabe a este evento (${calc.irrfEventoCents} centavos) passa do bruto (${bruto}): o menor bruto que cobre a retenção é ${minimo} centavos (F-IRD-5R).`,
          { brutoMinimoCents: Number(minimo), irrfEventoCents: Number(calc.irrfEventoCents) },
        );
      }
      if (calc.irrfEventoCents > 0n && !p.irrfRecolherAccountId) throw contaNaoConfigurada('IRRF a recolher');
      const memoria = this.memoria(p, outros, calc);
      const avisoSaldoLucro = await this.avisoSaldoLucro(scope.ownerUserId, input.dataEvento, bruto, tx);
      const usados = parametrosUsados(p.linhas, input.dataEvento, input.dataEvento);
      const created = await this.repo.create(
        scope.ownerUserId,
        scope.actorUserId,
        {
          unitId: p.s.unitId,
          partnerId: input.partnerId,
          taxId: p.taxId,
          evento: input.evento,
          dataEvento: input.dataEvento,
          competencia: p.competencia,
          debitoAccountId: input.debitoAccountId,
          contraAccountId: p.contraAccountId,
          brutoCents: bruto,
          irrfCents: calc.irrfEventoCents,
          liquidoCents: bruto - calc.irrfEventoCents,
          origemLucro: input.origemLucro,
          anoResultado: input.anoResultado ?? null,
          aprovadoEm: input.aprovadoEm ?? null,
          atoSourceDocumentId: input.atoSourceDocumentId ?? null,
          memoria: memoria as unknown as Prisma.InputJsonValue,
          parametrosIds: usados.ids,
          parametrosSha256: usados.sha256,
          avisoSaldoLucro,
          status: 'PENDING_POST',
        },
        tx,
      );
      await this.auditService.append(tx, p.s, {
        actorUserId: scope.actorUserId,
        eventType: PROFIT_DISTRIBUTION_CREATED,
        targetType: 'profit_distribution',
        targetId: created.id,
        payload: {
          distributionId: created.id,
          partnerId: created.partnerId,
          evento: created.evento,
          dataEvento: created.dataEvento,
          origemLucro: created.origemLucro,
          brutoCents: String(created.brutoCents),
          irrfCents: String(created.irrfCents),
          liquidoCents: String(created.liquidoCents),
        },
      });
      return created;
    });

    try {
      return toView(await this.lancar(scope, row));
    } catch (error) {
      logger.warn('Distribuição de lucros: lançamento pendente (o evento fica; reconcile em POST /profit-distributions/:id/lancamento)', {
        distributionId: row.id,
        motivo: error instanceof Error ? error.message : String(error),
        error,
      });
      return toView(row);
    }
  }

  /** Item 17 — reconcile: completa o lançamento que faltar. Idempotente; os erros (período, conta) sobem ao chamador. */
  async reconcileLancamento(scope: AccountingScope, id: string): Promise<ProfitDistributionView> {
    this.assertManage(scope);
    const row = await this.repo.findById(scope.ownerUserId, id);
    if (!row) throw new NotFoundError(`Distribuição '${id}' não encontrada.`);
    if (row.status !== 'PENDING_POST') return toView(row);
    return toView(await this.lancar(scope, row));
  }

  /**
   * Item 20 (F-IRD-8) — cancela só o ÚLTIMO evento `POSTED` do `taxId` na competência (por `dataEvento`, depois
   * `createdAt`). Ordem: gate na tx → estorno (idempotente) → gate de novo + CAS na tx. O estorno nunca vem antes do
   * gate (memória efeito-irreversivel-antes-do-gate); uma falha entre o estorno e o CAS converge repetindo o cancelamento.
   */
  async cancel(scope: AccountingScope, id: string, input: CancelProfitDistributionInput): Promise<ProfitDistributionView> {
    this.assertManage(scope);
    const owner = scope.ownerUserId;
    const row = await this.repo.runTransaction(async (tx) => this.assertCancelavel(owner, id, tx));
    const s: AccountingScope = { ...scope, unitId: row.unitId };
    if (row.entryId) {
      await this.postingService.reverseEntry(s, {
        unitId: s.unitId,
        lancamentoId: row.entryId,
        reversalPostingDate: row.dataEvento,
        reason: `distribuição de lucros ${row.id} cancelada`,
      });
    }
    await this.repo.runTransaction(async (tx) => {
      await this.assertCancelavel(owner, id, tx);
      if (!(await this.repo.markCancelled(owner, id, { cancelledById: scope.actorUserId, cancelReason: input.motivo ?? null }, tx))) {
        throw new ConflictError(`A distribuição '${id}' mudou de status durante o cancelamento.`);
      }
      await this.auditService.append(tx, s, {
        actorUserId: scope.actorUserId,
        eventType: PROFIT_DISTRIBUTION_CANCELLED,
        targetType: 'profit_distribution',
        targetId: id,
        payload: { distributionId: id, partnerId: row.partnerId, entryId: row.entryId ?? '', irrfCents: String(row.irrfCents) },
      });
    });
    return toView((await this.repo.findById(owner, id)) ?? row);
  }

  /** Item 21 (L8) — DARF 1841 do mês: total retido na PJ, eventos com retenção e vencimento. */
  async irrfMensal(scope: AccountingScope, query: IrrfMensalQuery): Promise<IrrfMensal> {
    this.assertRead(scope);
    const eventos = (await this.repo.listDaCompetencia(scope.ownerUserId, query.competencia, STATUS_QUE_SOMAM)).filter((e) => e.irrfCents > 0n);
    const feriados = await this.legalParams.fotografia(['FERIADO_NACIONAL']);
    return {
      competencia: query.competencia,
      codigoReceita: CODIGO_RECEITA_DIVIDENDOS,
      totalCents: Number(eventos.reduce((s, e) => s + e.irrfCents, 0n)),
      vencimento: vencimentoIrrfDividendos(query.competencia, feriados),
      eventos: eventos.map((e) => e.id),
    };
  }

  async get(scope: AccountingScope, id: string): Promise<ProfitDistributionView> {
    this.assertRead(scope);
    const row = await this.repo.findById(scope.ownerUserId, id);
    if (!row) throw new NotFoundError(`Distribuição '${id}' não encontrada.`);
    return toView(row);
  }

  /** Itens 4, 11, 14 e 5 — sócio, contas por natureza, transição e parâmetros legais vigentes na `dataEvento`. */
  private async preparar(scope: AccountingScope, input: ProfitDistributionInput): Promise<Preparo> {
    const s: AccountingScope = { ...scope, unitId: input.unitId };
    const partner = await this.partnerRepo.findById(scope, input.partnerId);
    if (!partner) throw new NotFoundError(`Sócio '${input.partnerId}' não encontrado.`);
    if (!partner.residenteBrasil) {
      throw new ValidationError(
        'Sócio não residente no Brasil: a distribuição a residente no exterior (Lei 9.249 art. 10 §§ 4º–5º) está fora do escopo (F-IRD-7).',
        null,
        'SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO',
      );
    }

    await this.contaComNatureza(s, input.debitoAccountId, 'Equity', 'debitoAccountId (lucros acumulados ou reserva)');
    const fp = await this.fiscalProfileRepo.findByScope(s);
    let contraAccountId: string;
    if (input.evento === 'CREDITO') {
      // Item 11 (F-IRD-9): o líquido vai ao passivo do sócio configurado no perfil (F-TA-7).
      if (!fp?.dividendosPagarAccountId) throw contaNaoConfigurada('dividendos a pagar');
      contraAccountId = (await this.contaComNatureza(s, fp.dividendosPagarAccountId, 'Liability', 'dividendos a pagar')).id;
    } else {
      const natureza = input.evento === 'EMPREGO' ? 'Equity' : 'Asset';
      const rotulo = input.evento === 'EMPREGO' ? 'contraAccountId (capital social)' : 'contraAccountId (banco, caixa ou o bem entregue)';
      contraAccountId = (await this.contaComNatureza(s, input.contraAccountId as string, natureza, rotulo)).id;
    }

    const linhas = await this.legalParams.fotografia(['IRRF_DISTRIBUICAO']);
    const params: ParametrosIrrf = {
      aliquotaBp: exigirLinhaVigente(linhas, 'IRRF_DISTRIBUICAO', 'ALIQUOTA_PF_BP', input.dataEvento).valorInt as number,
      limiteMensalCents: BigInt(exigirLinhaVigente(linhas, 'IRRF_DISTRIBUICAO', 'LIMITE_MENSAL_PF_CENTS', input.dataEvento).valorInt as number),
    };

    let transicao: Preparo['transicao'] = null;
    if (input.origemLucro === 'TRANSICAO') {
      // Item 14 (L4, L4a): aprovação até a linha vigente de TRANSICAO_APROVACAO_ATE (hoje 2026-01-31, liminar das ADIs
      // 7.912/7.914) e o ato anexado, do escopo.
      const linha = exigirLinhaVigente(linhas, 'IRRF_DISTRIBUICAO', 'TRANSICAO_APROVACAO_ATE', input.dataEvento);
      const ate = linha.valorTexto as string;
      if ((input.aprovadoEm as string) > ate) {
        throw new ValidationError(
          `Lucro da transição aprovado em ${input.aprovadoEm}, depois do prazo vigente ${ate} (Lei 9.250 art. 6º-A § 3º II; ${linha.fonte}).`,
          null,
          'TRANSICAO_FORA_DO_PRAZO',
        );
      }
      if (!(await this.repo.findSourceDocument(scope.ownerUserId, s.unitId, input.atoSourceDocumentId as string))) {
        throw new NotFoundError(`Ato de aprovação '${input.atoSourceDocumentId}' não encontrado nesta unidade.`);
      }
      transicao = { linhaId: linha.id, valor: ate };
    }

    return {
      s,
      taxId: partner.taxId,
      tipoPessoa: partner.tipoPessoa,
      competencia: input.dataEvento.slice(0, 7),
      contraAccountId,
      irrfRecolherAccountId: fp?.irrfRecolherAccountId ?? null,
      params,
      linhas,
      transicao,
    };
  }

  private memoria(p: Preparo, outros: readonly EventoDoMes[], calc: CalculoMes): MemoriaDistribuicao {
    return {
      competencia: p.competencia,
      tipoPessoa: p.tipoPessoa === 'PJ' ? 'PJ' : 'PF',
      eventos: outros.map((e) => ({ id: e.id, brutoCents: Number(e.brutoCents), irrfCents: Number(e.irrfCents), origemLucro: e.origemLucro as 'CORRENTE' | 'TRANSICAO' })),
      somaMesCents: Number(calc.somaMesCents),
      limiteMensalCents: Number(p.params.limiteMensalCents),
      aliquotaBp: p.params.aliquotaBp,
      baseMesCents: Number(calc.baseMesCents),
      devidoMesCents: Number(calc.devidoMesCents),
      jaRetidoCents: Number(calc.jaRetidoCents),
      irrfEventoCents: Number(calc.irrfEventoCents),
      transicaoAprovacaoAte: p.transicao,
    };
  }

  /**
   * Item 18 (F-IRD-10; dono, questionário de 2026-10-23: "Plano padrão") — aviso, nunca bloqueio. Compara o bruto vivo do
   * ano até `dataEvento` (este incluído) com o saldo credor de 2.3.1 + 2.3.3 mais o resultado (receita − despesa) do ano
   * até a data, na PJ inteira. Os lançamentos das distribuições e os estornos deles ficam fora do saldo: o bruto já as
   * conta.
   */
  private async avisoSaldoLucro(owner: string, dataEvento: string, bruto: bigint, tx?: Prisma.TransactionClient): Promise<string | null> {
    const ano = dataEvento.slice(0, 4);
    const distribuido =
      (await this.repo.listNoIntervalo(owner, `${ano}-01-01`, dataEvento, STATUS_QUE_SOMAM, tx)).reduce((s, e) => s + e.brutoCents, 0n) + bruto;
    const ate = new Date(dataEvento);
    const filtro = { ate, status: LEDGER_STATUSES, excluirFonte: PROFIT_DISTRIBUTION_SOURCE_TYPE };
    const pl = somaCredora(await this.repo.totaisPorConta(owner, filtro, tx), (t) => PREFIXOS_SALDO_LUCRO.some((p) => t.code === p || t.code.startsWith(`${p}.`)));
    const resultado = somaCredora(
      await this.repo.totaisPorConta(owner, { ...filtro, de: new Date(`${ano}-01-01`) }, tx),
      (t) => t.nature === 'Revenue' || t.nature === 'Expense',
    );
    return distribuido > pl + resultado ? AVISO_SALDO_LUCRO : null;
  }

  /** Item 17 — commit 2 + CAS: reaproveita o lançamento já postado pela fonte (crash entre post e CAS) ou posta. */
  private async lancar(scope: AccountingScope, row: ProfitDistributionEvent): Promise<ProfitDistributionEvent> {
    const s: AccountingScope = { ...scope, unitId: row.unitId };
    let entry = await this.postingService.findEntryBySource(s, PROFIT_DISTRIBUTION_SOURCE_TYPE, row.id);
    if (entry && (entry.reversedById || entry.status !== 'Posted')) {
      throw new ValidationError(`O lançamento da distribuição '${row.id}' (${entry.id}) foi estornado fora do fluxo.`);
    }
    if (!entry) {
      const fp = await this.fiscalProfileRepo.findByScope(s);
      const p = { s, contraAccountId: row.contraAccountId, irrfRecolherAccountId: fp?.irrfRecolherAccountId ?? null };
      entry = await this.postingService.postEntry(s, {
        unitId: s.unitId,
        date: row.dataEvento,
        description: `Distribuição de lucros (${row.evento}) — sócio ${row.partnerId}, evento ${row.id}`,
        sourceType: PROFIT_DISTRIBUTION_SOURCE_TYPE,
        sourceId: row.id,
        lines: await this.linhas(p, row.debitoAccountId, row.brutoCents, row.irrfCents),
      });
    }
    await this.repo.markPosted(scope.ownerUserId, row.id, entry.id); // false ⇒ outra chamada já vinculou; a releitura mostra
    return (await this.repo.findById(scope.ownerUserId, row.id)) ?? row;
  }

  /** Item 17 (F-IRD-9) — D débito bruto / C contrapartida líquido / C IRRF a recolher (só se > 0). */
  private async linhas(
    p: { s: AccountingScope; contraAccountId: string; irrfRecolherAccountId: string | null },
    debitoAccountId: string,
    bruto: bigint,
    irrf: bigint,
  ): Promise<Array<{ accountCode: string; debitCents: number; creditCents: number }>> {
    const codigo = async (id: string) => (await this.contaDoEscopo(p.s, id)).code;
    const lines = [
      { accountCode: await codigo(debitoAccountId), debitCents: Number(bruto), creditCents: 0 },
      { accountCode: await codigo(p.contraAccountId), debitCents: 0, creditCents: Number(bruto - irrf) },
    ];
    if (irrf > 0n) {
      if (!p.irrfRecolherAccountId) throw contaNaoConfigurada('IRRF a recolher');
      lines.push({ accountCode: await codigo(p.irrfRecolherAccountId), debitCents: 0, creditCents: Number(irrf) });
    }
    return lines;
  }

  /** Item 20 — gate do cancelamento: só o último POSTED do `taxId` na competência. */
  private async assertCancelavel(owner: string, id: string, tx: Prisma.TransactionClient): Promise<ProfitDistributionEvent> {
    const row = await this.repo.findById(owner, id, tx);
    if (!row) throw new NotFoundError(`Distribuição '${id}' não encontrada.`);
    if (row.status !== 'POSTED') throw new ConflictError(`Só uma distribuição lançada (POSTED) pode ser cancelada; esta está ${row.status}.`, 'DISTRIBUICAO_NAO_POSTADA');
    const lancados = await this.repo.listDoMes(owner, row.taxId, row.competencia, ['POSTED'], tx);
    const ultimo = lancados[lancados.length - 1];
    if (ultimo && ultimo.id !== row.id) {
      throw new ConflictError(
        `Só o último evento do mês do sócio pode ser cancelado (F-IRD-8): cancele antes a distribuição '${ultimo.id}'.`,
        'NAO_E_O_ULTIMO_DO_MES',
      );
    }
    return row;
  }

  private async contaDoEscopo(s: AccountingScope, id: string): Promise<Account> {
    const conta = await this.accountRepo.findById(s, id);
    if (!conta || conta.deletedAt) throw new NotFoundError(`Conta '${id}' não encontrada nesta unidade.`);
    return conta;
  }

  private async contaComNatureza(s: AccountingScope, id: string, natureza: string, rotulo: string): Promise<Account> {
    const conta = await this.contaDoEscopo(s, id);
    if (conta.nature !== natureza) throw new ValidationError(`A conta de ${rotulo} tem de ser ${natureza}; '${conta.code}' é ${conta.nature}.`);
    return conta;
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler as distribuições de lucros.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para registrar distribuições de lucros.');
  }
}

/** F-TA-7 — conta ausente no perfil fiscal da unidade ⇒ 400 com o rótulo. */
function contaNaoConfigurada(rotulo: string): ValidationError {
  return new ValidationError(`Conta de ${rotulo} não configurada no perfil fiscal da unidade (F-TA-7).`);
}

function somaCredora(totais: readonly TotalPorConta[], filtro: (t: TotalPorConta) => boolean): bigint {
  return totais.filter(filtro).reduce((s, t) => s + t.creditCents - t.debitCents, 0n);
}

function toEventoDoMes(e: ProfitDistributionEvent): EventoDoMes {
  return { id: e.id, brutoCents: e.brutoCents, irrfCents: e.irrfCents, origemLucro: e.origemLucro };
}

function toView(row: ProfitDistributionEvent): ProfitDistributionView {
  return {
    id: row.id,
    unitId: row.unitId,
    partnerId: row.partnerId,
    evento: row.evento,
    dataEvento: row.dataEvento,
    competencia: row.competencia,
    debitoAccountId: row.debitoAccountId,
    contraAccountId: row.contraAccountId,
    brutoCents: Number(row.brutoCents),
    irrfCents: Number(row.irrfCents),
    liquidoCents: Number(row.liquidoCents),
    origemLucro: row.origemLucro,
    anoResultado: row.anoResultado,
    aprovadoEm: row.aprovadoEm,
    atoSourceDocumentId: row.atoSourceDocumentId,
    memoria: row.memoria as unknown as MemoriaDistribuicao,
    parametrosSha256: row.parametrosSha256,
    avisoSaldoLucro: row.avisoSaldoLucro,
    status: row.status,
    entryId: row.entryId,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
  };
}
