import type { Account, FiscalProfile, LegalParameter, Payable, Prisma, TaxWithholding, WithholdingProfile } from 'generated/prisma';
import { ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import { ultimoDiaUtilAteDia20 } from '../../../lib/vencimentoRetencao';
import { linhaLegalVigente, type LegalParameterTabela } from '../../legalParameters/models/legalParameter';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { ICounterpartyRepository } from '../repositories/ICounterpartyRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IPayableRepository } from '../repositories/IPayableRepository';
import type { ITaxWithholdingRepository } from '../repositories/ITaxWithholdingRepository';
import type { IWithholdingProfileRepository } from '../repositories/IWithholdingProfileRepository';
import type { AuditService } from './AuditService';
import type { PfDeducoesInput, WithholdingOverrideInput } from '../dtos/PayableDto';
import type { WithholdingLineView, WithholdingSummary } from '../dtos/WithholdingDto';
import { centsFromDb } from '../models/money';
import { deletedDocumentNumber, PAYABLE_ORIGIN_WITHHOLDING_TAX, WITHHOLDING_KIND, WITHHOLDING_METHOD } from '../models/Payable.model';
import { REGIMES_EMPRESA, type RegimeEmpresa } from '../models/regimeEmpresa';
import { taxIdKindDe, TRIBUTOS_CSRF, type NaturezaServico, type RegimeContraparte, type TributoRetencao } from '../models/retencaoParams';
import { brutoDaParcela, calcularRetencoes, type EventoRetencao, type LinhaRetencao } from '../models/withholdingCalc';
import { toWithholdingLineView } from '../models/withholdingView';
import { resolveOrCreateCounterpartyId } from './counterpartyResolution';

export const AP_WITHHOLDING_RECORDED = 'ap.withholding.recorded';
export const AP_WITHHOLDING_REVERSED = 'ap.withholding.reversed';
export const TAX_PAYABLE_UPSERTED = 'tax_payable.upserted';

/** Item 19 — avisos do título de imposto. */
export const AVISO_TITULO_IMPOSTO = { VENCIMENTO_ISS_INFORMAR: 'VENCIMENTO_ISS_INFORMAR' } as const;

/** Tabelas que o cálculo lê (fotografia de plataforma, F-LP-4 a). */
const TABELAS: readonly LegalParameterTabela[] = ['RETENCAO', 'RETENCAO_CODIGO', 'IRRF_PF_MENSAL', 'FERIADO_NACIONAL', 'FERIADO_LOCAL'];
/** Item 20: só tributo administrado pela RFB acumula o DARF < R$ 10 (Lei 9.430 art. 68 § 1º). */
const TRIBUTOS_DARF: readonly string[] = ['IRRF', ...TRIBUTOS_CSRF];

/** Item 8 / F-RET-19 a — o papel do perfil fiscal (conta a recolher) de cada tributo retido. */
const PAPEL_A_RECOLHER: Record<TributoRetencao, { campo: keyof FiscalProfile; rotulo: string }> = {
  IRRF: { campo: 'retencaoIrrfRecolherAccountId', rotulo: 'IRRF retido a recolher' },
  CSLL: { campo: 'retencaoCsrfRecolherAccountId', rotulo: 'CSRF retida a recolher' },
  COFINS: { campo: 'retencaoCsrfRecolherAccountId', rotulo: 'CSRF retida a recolher' },
  PIS: { campo: 'retencaoCsrfRecolherAccountId', rotulo: 'CSRF retida a recolher' },
  INSS: { campo: 'retencaoInssRecolherAccountId', rotulo: 'INSS retido a recolher' },
  ISS: { campo: 'retencaoIssRecolherAccountId', rotulo: 'ISS retido a recolher' },
};

/** Uma retenção planejada: a linha calculada + a conta a recolher (só quando há valor). */
export interface RetencaoPlanejada extends LinhaRetencao {
  overrideMotivo: string | null;
  account: Pick<Account, 'id' | 'code'> | null;
}

export interface PlanoRetencao {
  event: EventoRetencao;
  counterpartyId: string;
  perfil: WithholdingProfile | null;
  dataFatoGerador: string;
  competencia: string;
  brutoCents: bigint;
  linhas: RetencaoPlanejada[];
  avisos: string[];
  parametrosIds: string[];
  parametrosSha256: string;
  /** Fotografia usada (vencimento do título). */
  legais: LegalParameter[];
  fiscalProfile: FiscalProfile | null;
}

/** A baixa sem caixa gravada — o `PayableService` posta D 2.1.2 / C `accountCode` sob `sourceId = paymentId`. */
export interface BaixaRetencao {
  paymentId: string;
  withholdingId: string;
  tributo: TributoRetencao;
  amountCents: number;
  accountCode: string;
  date: string;
}

/**
 * BE-INCR-RETENCOES-FONTE PR-2 (BRIEF itens 10–23; F-RET-10/11/12/17/18 a) — as retenções FEITAS no AP. Este serviço
 * calcula (via `withholdingCalc`), grava o subrazão (baixas WITHHOLDING, `TaxWithholding`, título de imposto) DENTRO da tx
 * que o `PayableService` abre, e lê o contrato da Reinf. O razão (postEntry/reverseEntry) é do `PayableService`: aqui não há
 * lançamento — o título de imposto não tem reconhecimento próprio (F-RET-11 a), o passivo já está na conta a recolher.
 */
export class WithholdingService {
  constructor(
    private readonly taxRepo: ITaxWithholdingRepository,
    private readonly payableRepo: IPayableRepository,
    private readonly counterpartyRepo: ICounterpartyRepository,
    private readonly profileRepo: IWithholdingProfileRepository,
    private readonly fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findByScope'>,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly accountRepo: Pick<IAccountRepository, 'findById'>,
    private readonly legalParams: { fotografia(tabelas: readonly LegalParameterTabela[]): Promise<LegalParameter[]> },
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  /** Fotografia das tabelas do cálculo — lida FORA da tx (cache de plataforma). */
  async fotografia(): Promise<LegalParameter[]> {
    return this.legalParams.fotografia(TABELAS);
  }

  // ── Plano ───────────────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Itens 10–12, 15–16 — o plano de UM evento para a contraparte, dentro da tx do chamador (a contraparte pode ter acabado
   * de nascer na tx1). Perfil = o vigente na data; dois perfis vigentes da mesma contraparte ⇒ 400 nomeado (o título não diz
   * a natureza — lacuna de spec registrada). Sobrescrita só PARA MENOS, com motivo (ADR D5); para mais ⇒ 400. Conta a
   * recolher ausente quando há valor ⇒ 400 nomeado (F-TA-7).
   */
  async planejar(
    scope: AccountingScope,
    e: {
      event: EventoRetencao;
      counterpartyId: string;
      brutoCents: bigint;
      dataFatoGerador: string;
      legais: LegalParameter[];
      overrides?: readonly WithholdingOverrideInput[];
      pfDeducoes?: PfDeducoesInput;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PlanoRetencao> {
    const contraparte = await this.counterpartyRepo.findById(scope, e.counterpartyId, tx);
    const perfis = (await this.profileRepo.list(scope, e.counterpartyId, tx)).filter(
      (p) => p.vigenteDesde <= e.dataFatoGerador && (p.vigenteAte === null || e.dataFatoGerador <= p.vigenteAte),
    );
    if (perfis.length > 1) {
      throw new ValidationError(
        `PERFIL_RETENCAO_AMBIGUO: a contraparte tem ${perfis.length} perfis de retenção vigentes em ${e.dataFatoGerador} (${perfis.map((p) => p.naturezaServico).join(', ')}); deixe um só vigente por data.`,
        null,
        'PERFIL_RETENCAO_AMBIGUO',
      );
    }
    const perfil = perfis[0] ?? null;
    const competencia = e.dataFatoGerador.slice(0, 7);
    const fiscalProfile = await this.fiscalProfileRepo.findByScope(scope, tx);
    const vazio: PlanoRetencao = { event: e.event, counterpartyId: e.counterpartyId, perfil, dataFatoGerador: e.dataFatoGerador, competencia, brutoCents: e.brutoCents, linhas: [], avisos: [], parametrosIds: [], parametrosSha256: '', legais: e.legais, fiscalProfile };
    if (!perfil && (e.overrides?.length ?? 0) === 0) {
      // ADR D5: o aviso SEM_PERFIL só faz sentido no reconhecimento (uma vez por título).
      if (e.event === 'SETTLEMENT') return vazio;
    }
    const regimePagador = perfil ? await this.regimePagador(scope, e.dataFatoGerador, tx) : 'REAL';
    const taxIdKind = taxIdKindDe(contraparte?.taxId);
    const pf = taxIdKind === 'CPF' || contraparte?.regimeTributario === 'PF';
    const doMes = pf && e.event === 'RECOGNITION' && perfil?.irrf ? await this.taxRepo.somaIrrfDoMes(scope, e.counterpartyId, competencia, tx) : null;
    const r = calcularRetencoes({
      event: e.event,
      brutoCents: e.brutoCents,
      dataFatoGerador: e.dataFatoGerador,
      regimePagador,
      beneficiario: { regime: (contraparte?.regimeTributario as RegimeContraparte | null) ?? null, temDeclaracaoOptante: !!contraparte?.declaracaoOptanteDocumentId, taxIdKind },
      perfil: perfil
        ? { naturezaServico: perfil.naturezaServico as NaturezaServico, natRend: perfil.natRend, irrf: perfil.irrf, csrf: perfil.csrf, inss: perfil.inss, inssCprb: perfil.inssCprb, issRetido: perfil.issRetido, issAliquotaBp: perfil.issAliquotaBp }
        : null,
      pf: doMes
        ? {
            rendimentoMesAntesCents: doMes.rendimentoCents,
            retidoMesAntesCents: doMes.retidoCents,
            dependentes: e.pfDeducoes?.dependentes ?? 0,
            previdenciaCents: BigInt(e.pfDeducoes?.previdenciaCents ?? 0),
            pensaoCents: BigInt(e.pfDeducoes?.pensaoCents ?? 0),
          }
        : undefined,
      tabela: e.legais,
    });
    const linhas = this.aplicarOverrides(r.linhas, e.overrides ?? []);
    const comConta: RetencaoPlanejada[] = [];
    for (const l of linhas) comConta.push({ ...l, account: l.amountCents > 0n ? await this.contaARecolher(scope, fiscalProfile, l.tributo, tx) : null });
    return { ...vazio, linhas: comConta, avisos: r.avisos, parametrosIds: r.parametrosIds, parametrosSha256: r.parametrosSha256 };
  }

  /**
   * Item 17 (F-RET-4 a): o bruto da parcela `g` a partir do PAGO em caixa e as alíquotas de CSRF vigentes na data. Sem perfil
   * com CSRF, pagador optante ou beneficiário optante (as regras do `calcularRetencoes`) ⇒ `g = pago`. Maior `g` que fecha
   * (dono 24/10); o saldo restante tem preferência (item 18).
   */
  async brutoDaBaixa(
    scope: AccountingScope,
    e: { counterpartyId: string; pagoCents: bigint; restanteCents: bigint; data: string; legais: LegalParameter[] },
  ): Promise<bigint> {
    const plano = await this.planejar(scope, { event: 'SETTLEMENT', counterpartyId: e.counterpartyId, brutoCents: e.restanteCents, dataFatoGerador: e.data, legais: e.legais });
    const bps = plano.linhas.map((l) => l.aliquotaBp ?? 0);
    if (bps.length === 0) return e.pagoCents;
    const min = linhaLegalVigente(e.legais, 'RETENCAO', 'MINIMO', e.data, 'CSRF')?.valorInt ?? null;
    return brutoDaParcela(e.pagoCents, bps, e.restanteCents, min === null ? null : BigInt(min));
  }

  private aplicarOverrides(linhas: LinhaRetencao[], overrides: readonly WithholdingOverrideInput[]): (LinhaRetencao & { overrideMotivo: string | null })[] {
    const out = linhas.map((l) => ({ ...l, overrideMotivo: null as string | null }));
    for (const o of overrides) {
      const l = out.find((x) => x.tributo === o.tributo);
      if (!l) throw new ValidationError(`withholdings: não há retenção de ${o.tributo} calculada para este título — sobrescrita só para menos (ADR D5).`, null, 'RETENCAO_OVERRIDE_SEM_LINHA');
      if (BigInt(o.amountCents) > l.amountCents) {
        throw new ValidationError(`withholdings: ${o.tributo} de ${o.amountCents} centavos é maior que o calculado (${l.amountCents}) — sobrescrita só para menos (ADR D5).`, null, 'RETENCAO_OVERRIDE_MAIOR');
      }
      if (BigInt(o.amountCents) < l.amountCents) Object.assign(l, { amountCents: BigInt(o.amountCents), overrideMotivo: o.motivo });
    }
    return out;
  }

  private async regimePagador(scope: AccountingScope, data: string, tx?: Prisma.TransactionClient): Promise<'MEI' | 'SIMPLES' | 'PRESUMIDO' | 'REAL'> {
    const perfil = await this.companyProfileRepo.findByYear(scope, Number(data.slice(0, 4)), tx);
    const regime = perfil?.regime;
    if (!regime || !(REGIMES_EMPRESA as readonly string[]).includes(regime)) {
      throw new ValidationError(
        `REGIME_PAGADOR_AUSENTE: o perfil fiscal da empresa de ${data.slice(0, 4)} não tem regime — sem ele não dá para saber se a empresa retém CSRF (Lei 10.833 art. 30 § 2º).`,
        null,
        'REGIME_PAGADOR_AUSENTE',
      );
    }
    return regime as RegimeEmpresa;
  }

  /** Item 21 — re-drive: a conta a recolher do tributo pelo perfil fiscal ATUAL (a baixa não guarda a conta). */
  async contaParaBaixa(scope: AccountingScope, tributo: TributoRetencao): Promise<Pick<Account, 'id' | 'code'>> {
    return this.contaARecolher(scope, await this.fiscalProfileRepo.findByScope(scope), tributo);
  }

  private async contaARecolher(scope: AccountingScope, fp: FiscalProfile | null, tributo: TributoRetencao, tx?: Prisma.TransactionClient): Promise<Pick<Account, 'id' | 'code'>> {
    const papel = PAPEL_A_RECOLHER[tributo];
    const id = fp?.[papel.campo] as string | null | undefined;
    const conta = id ? await this.accountRepo.findById(scope, id, tx) : null;
    if (!conta || conta.deletedAt || !conta.acceptsEntries) {
      throw new ValidationError(`CONTA_RETENCAO_NAO_CONFIGURADA: conta de ${papel.rotulo} não configurada no perfil fiscal da unidade (F-TA-7).`, null, 'CONTA_RETENCAO_NAO_CONFIGURADA');
    }
    return { id: conta.id, code: conta.code };
  }

  // ── Gravação (dentro da tx do PayableService) ───────────────────────────────────────────────────────────────────────

  /**
   * Itens 13–15, 17, 19–20 — grava, na tx do chamador, uma baixa sem caixa WITHHOLDING por linha com valor, a
   * `TaxWithholding` de cada linha (a dispensa também, com `settlementId` null — a Reinf informa o pagamento) e o título de
   * imposto. O `paidCents` do título de origem é do chamador (claim/criação). Devolve as baixas a postar.
   */
  async gravar(
    scope: AccountingScope,
    plano: PlanoRetencao,
    titulo: Pick<Payable, 'id'>,
    e: { originSettlementId: string | null; documentoNumero: string | null; documentoSerie: string | null },
    tx: Prisma.TransactionClient,
  ): Promise<BaixaRetencao[]> {
    const baixas: BaixaRetencao[] = [];
    for (const l of plano.linhas) {
      const temValor = l.amountCents > 0n;
      const payment = temValor
        ? await this.payableRepo.createPayment(
            { userId: scope.ownerUserId, unitId: scope.unitId, payableId: titulo.id, amountCents: Number(l.amountCents), method: WITHHOLDING_METHOD, paidAt: new Date(plano.dataFatoGerador), paidByUserId: scope.actorUserId, status: 'ACTIVE', kind: WITHHOLDING_KIND },
            tx,
          )
        : null;
      const taxPayableId = temValor ? await this.upsertTitulo(scope, plano, l, tx) : null;
      const tw = await this.taxRepo.create(
        scope,
        {
          direction: 'MADE',
          tributo: l.tributo,
          event: plano.event,
          titleType: 'PAYABLE',
          titleId: titulo.id,
          settlementId: payment?.id ?? null,
          originSettlementId: e.originSettlementId,
          counterpartyId: plano.counterpartyId,
          naturezaServico: plano.perfil?.naturezaServico ?? null,
          natRend: plano.perfil?.natRend ?? null,
          dataFatoGerador: plano.dataFatoGerador,
          competencia: plano.competencia,
          brutoCents: plano.brutoCents,
          baseCents: l.baseCents,
          aliquotaBp: l.aliquotaBp,
          amountCents: l.amountCents,
          dispensa: l.dispensa,
          overrideMotivo: l.overrideMotivo,
          codigoReceita: l.codigoReceita,
          taxPayableId,
          documentoNumero: e.documentoNumero,
          documentoSerie: e.documentoSerie,
          pfDetalhe: l.pf ? JSON.stringify(Object.fromEntries(Object.entries(l.pf).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v]))) : null,
          parametrosIds: JSON.stringify(plano.parametrosIds),
          parametrosSha256: plano.parametrosSha256,
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: AP_WITHHOLDING_RECORDED,
        targetType: 'payable',
        targetId: titulo.id,
        payload: {
          withholdingId: tw.id,
          payableId: titulo.id,
          tributo: l.tributo,
          event: plano.event,
          amountCents: l.amountCents.toString(),
          competencia: plano.competencia,
          codigoReceita: l.codigoReceita ?? '',
          dispensa: l.dispensa ?? '',
          taxPayableId: taxPayableId ?? '',
        },
      });
      if (payment) baixas.push({ paymentId: payment.id, withholdingId: tw.id, tributo: l.tributo, amountCents: Number(l.amountCents), accountCode: l.account!.code, date: plano.dataFatoGerador });
    }
    return baixas;
  }

  /**
   * Item 19 (F-RET-11 a) — título de imposto por (beneficiário-sistema, código, competência): soma enquanto OPEN sem baixa
   * (CAS); com baixa, abre complementar (`-C1`, `-C2`…). Código ainda DRAFT ⇒ sem título (item 2). Item 20: ao abrir o
   * título de uma competência, os títulos OPEN anteriores do mesmo código abaixo de R$ 10 viram `DEFERRED` e somam aqui.
   */
  private async upsertTitulo(scope: AccountingScope, plano: PlanoRetencao, l: RetencaoPlanejada, tx: Prisma.TransactionClient): Promise<string | null> {
    if (l.tributo !== 'ISS' && !l.codigoReceita) return null;
    const ym = plano.competencia.replace('-', '');
    const codMun = plano.perfil?.issCodMun ?? null;
    const sistema = l.tributo === 'ISS' ? `MUNICIPIO:${codMun}` : l.tributo === 'INSS' ? 'INSS' : 'UNIAO';
    const codigo = l.tributo === 'ISS' ? 'ISS' : l.codigoReceita!;
    const prefix = `${codigo}-${ym}`;
    const counterpartyId = await resolveOrCreateCounterpartyId(
      { counterpartyRepo: this.counterpartyRepo, auditService: this.auditService, policy: this.policy },
      scope,
      'SUPPLIER',
      undefined,
      sistema,
      'O beneficiário do título de imposto deve ser um fornecedor (SUPPLIER).',
      tx,
    );
    const valor = Number(l.amountCents);
    const titulos = await this.payableRepo.findTaxTitles(scope, counterpartyId, prefix, tx);
    const aberto = titulos.find((t) => t.status === 'OPEN' && t.paidCents === 0n);
    if (aberto) {
      const antes = centsFromDb(aberto.amountCents);
      if ((await this.payableRepo.adjustTaxTitleAmount(scope, aberto.id, antes, valor, tx)) !== 1) {
        throw new ConflictError('TITULO_IMPOSTO_CONCORRENTE: o título de imposto mudou em paralelo — repita a operação.', 'TITULO_IMPOSTO_CONCORRENTE');
      }
      await this.auditTitulo(scope, aberto.id, codigo, plano.competencia, antes + valor, tx);
      return aberto.id;
    }
    let documentNumber = titulos.length > 0 ? `${prefix}-C${titulos.length}` : prefix;
    let total = valor;
    const absorvidos: Payable[] = [];
    if (titulos.length === 0 && TRIBUTOS_DARF.includes(l.tributo)) {
      const min = linhaLegalVigente(plano.legais, 'RETENCAO', 'MINIMO', plano.dataFatoGerador, 'DARF')?.valorInt ?? null;
      if (min !== null) {
        for (const t of await this.payableRepo.findOpenTaxTitlesByCode(scope, counterpartyId, `${codigo}-`, tx)) {
          const ymT = (t.documentNumber ?? '').slice(codigo.length + 1, codigo.length + 7);
          if (ymT < ym && centsFromDb(t.amountCents) < min) absorvidos.push(t);
        }
      }
      for (const t of absorvidos) {
        total += centsFromDb(t.amountCents);
        documentNumber += `+${(t.documentNumber ?? '').slice(codigo.length + 1)}`;
      }
    }
    const dueDate = this.vencimento(plano, l.tributo);
    const created = await this.payableRepo.create(
      {
        userId: scope.ownerUserId,
        unitId: scope.unitId,
        supplierName: sistema,
        supplierRef: null,
        counterpartyId,
        documentNumber,
        description: `Retenção na fonte — ${codigo} — competência ${plano.competencia}`,
        issueDate: new Date(plano.dataFatoGerador),
        dueDate: new Date(dueDate),
        amountCents: total,
        expenseAccountId: null,
        inventoryProductRef: null,
        inventoryQty: null,
        inventoryMultiItem: false,
        status: 'OPEN',
        createdById: scope.actorUserId,
        origin: PAYABLE_ORIGIN_WITHHOLDING_TAX,
        liabilityAccountId: l.account!.id,
      },
      tx,
    );
    for (const t of absorvidos) {
      await this.payableRepo.updatePayable(scope, t.id, { status: 'DEFERRED' }, tx);
      await this.taxRepo.repointTaxPayable(scope, t.id, created.id, tx);
    }
    await this.auditTitulo(scope, created.id, codigo, plano.competencia, total, tx);
    return created.id;
  }

  /** Item 4 / item 19 — IRRF, CSRF e INSS: dia 20 do mês seguinte ou o dia útil anterior; ISS: dia do perfil ou 10 com aviso. */
  private vencimento(plano: PlanoRetencao, tributo: TributoRetencao): string {
    const codMun = plano.fiscalProfile?.codMun ?? null;
    if (tributo !== 'ISS') return ultimoDiaUtilAteDia20(plano.competencia, plano.legais, codMun);
    const [a, m] = plano.competencia.split('-').map(Number);
    const [ano, mes] = m === 12 ? [a + 1, 1] : [a, m + 1];
    const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const dia = plano.perfil?.issVencimentoDia ?? null;
    if (dia === null) plano.avisos.push(`${AVISO_TITULO_IMPOSTO.VENCIMENTO_ISS_INFORMAR}: o perfil não tem o dia de vencimento do ISS (lei municipal) — o título vence no dia 10; ajuste o perfil.`);
    return `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia ?? 10, ultimo)).padStart(2, '0')}`;
  }

  private async auditTitulo(scope: AccountingScope, id: string, codigo: string, competencia: string, totalCents: number, tx: Prisma.TransactionClient): Promise<void> {
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType: TAX_PAYABLE_UPSERTED,
      targetType: 'payable',
      targetId: id,
      payload: { taxPayableId: id, codigoReceita: codigo, competencia, amountCents: String(totalCents) },
    });
  }

  // ── Estorno (item 21) ────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Item 21 — pré-checagem fora da tx (o gate autoritativo é o CAS do `reverterNaTx`): título de imposto já baixado (total
   * ou parcial) ⇒ 409 "imposto já recolhido — estorne o DARF antes" (invariante 7). Roda ANTES do estorno no razão, para que
   * um comando recusado não tenha mexido em nada.
   */
  async assertEstornavel(scope: AccountingScope, linhas: readonly TaxWithholding[]): Promise<void> {
    for (const l of linhas) {
      if (!l.taxPayableId || l.amountCents === 0n) continue;
      const t = await this.payableRepo.findById(scope, l.taxPayableId);
      if (t && (t.status !== 'OPEN' || t.paidCents !== 0n)) throw this.impostoRecolhido(t.documentNumber);
    }
  }

  /**
   * Item 21 — na tx do chamador: encolhe o título (CAS; 0 ⇒ cancela o título), marca a linha REVERSED e cancela a baixa
   * WITHHOLDING. Devolve os centavos liberados (o chamador devolve ao `paidCents` do título de origem).
   */
  async reverterNaTx(scope: AccountingScope, linhas: readonly TaxWithholding[], tx: Prisma.TransactionClient): Promise<number> {
    let liberado = 0;
    for (const l of linhas) {
      const cents = Number(l.amountCents);
      if (l.taxPayableId && cents > 0) {
        const t = await this.payableRepo.findById(scope, l.taxPayableId, tx);
        if (t) {
          const antes = centsFromDb(t.amountCents);
          if ((await this.payableRepo.adjustTaxTitleAmount(scope, t.id, antes, -cents, tx)) !== 1) throw this.impostoRecolhido(t.documentNumber);
          if (antes - cents === 0) {
            await this.payableRepo.updatePayable(scope, t.id, { status: 'CANCELLED', deletedAt: new Date(), documentNumber: deletedDocumentNumber(t.id, t.documentNumber) }, tx);
          }
        }
      }
      if ((await this.taxRepo.markReversed(scope, [l.id], tx)) !== 1) continue;
      if (l.settlementId) {
        await this.payableRepo.cancelPaymentIfActive(scope, l.settlementId, tx);
        liberado += cents;
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: AP_WITHHOLDING_REVERSED,
        targetType: 'payable',
        targetId: l.titleId,
        payload: { withholdingId: l.id, payableId: l.titleId, tributo: l.tributo, amountCents: l.amountCents.toString(), taxPayableId: l.taxPayableId ?? '' },
      });
    }
    return liberado;
  }

  private impostoRecolhido(documento: string | null): ConflictError {
    return new ConflictError(`IMPOSTO_JA_RECOLHIDO: o título de imposto ${documento ?? ''} já tem baixa — imposto já recolhido; estorne o DARF antes.`, 'IMPOSTO_JA_RECOLHIDO');
  }

  // ── Leitura (item 23) ────────────────────────────────────────────────────────────────────────────────────────────────

  async linhasFeitas(scope: AccountingScope, competencia: string): Promise<WithholdingLineView[]> {
    this.assertRead(scope);
    return (await this.taxRepo.findMadeWithOrigin(scope, competencia)).map(toWithholdingLineView);
  }

  /** Item 23 — feitas por código (título de imposto), com vencimento, status e as competências somadas (art. 68 § 1º). */
  async resumo(scope: AccountingScope, competencia: string): Promise<WithholdingSummary> {
    this.assertRead(scope);
    const linhas = await this.taxRepo.findMadeWithOrigin(scope, competencia);
    const avisos: string[] = [];
    const porTitulo = new Map<string, typeof linhas>();
    const semTitulo = new Map<string, typeof linhas>();
    for (const l of linhas.filter((x) => x.amountCents > 0n)) {
      const mapa = l.taxPayableId ? porTitulo : semTitulo;
      const k = l.taxPayableId ?? `${l.codigoReceita ?? 'SEM_CODIGO'}|${l.tributo}`;
      mapa.set(k, [...(mapa.get(k) ?? []), l]);
    }
    const feitas: WithholdingSummary['feitas'] = [];
    for (const [id, ls] of porTitulo) {
      const t = await this.payableRepo.findById(scope, id);
      const doc = t?.documentNumber ?? '';
      const [, resto = ''] = doc.split('-');
      feitas.push({
        codigoReceita: ls[0].codigoReceita,
        tributos: [...new Set(ls.map((x) => x.tributo))],
        totalCents: t ? t.amountCents.toString() : ls.reduce((s, x) => s + x.amountCents, 0n).toString(),
        vencimento: t ? t.dueDate.toISOString().slice(0, 10) : null,
        status: (t?.status === 'PAYING' ? 'PARTIALLY_PAID' : (t?.status ?? 'OPEN')) as WithholdingSummary['feitas'][number]['status'],
        competenciasSomadas: resto.split('+').map((ym) => `${ym.slice(0, 4)}-${ym.slice(4, 6)}`).filter((c) => /^\d{4}-\d{2}$/.test(c)),
        taxPayableId: id,
        linhas: ls.length,
      });
    }
    for (const [, ls] of semTitulo) {
      feitas.push({ codigoReceita: ls[0].codigoReceita, tributos: [...new Set(ls.map((x) => x.tributo))], totalCents: ls.reduce((s, x) => s + x.amountCents, 0n).toString(), vencimento: null, status: 'OPEN', competenciasSomadas: [competencia], taxPayableId: null, linhas: ls.length });
      avisos.push(`CODIGO_RECEITA_DRAFT: ${ls.length} retenção(ões) de ${ls[0].tributo} sem código de receita publicado — sem título de imposto.`);
    }
    return { competencia, feitas, sofridas: [], avisos };
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadPayable(scope)) throw new ForbiddenError('Você não tem permissão para ler as retenções.');
  }
}
