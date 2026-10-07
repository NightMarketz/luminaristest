/**
 * PisCofinsAssessmentService — apuração MENSAL de PIS/Cofins (nó X8, BE-INCR-PIS-COFINS PR-2). FIRST-CLASS PRISMA.
 *
 * A confirmação é UMA `runTransaction` (commit 1 do X7 item 14). PR-3 (BRIEF itens 17–19): DEPOIS dela, a provisão
 * (bridge no molde do X7 item 15 — 2 commits, best-effort, estorno da substituída) é delegada ao
 * `TaxAssessmentService.provisionarAposConfirmacao`, que é quem chama `postEntry` e carrega o cabeçalho `atomicUntil`;
 * o reconcile é a rota do X7 (item 18) e o encerramento × provisão pendente é o do X7 (item 19). Nenhum `postEntry` aqui.
 *
 * Reusa (F-X8-2 a): o model e o repositório `TaxAssessment` do X7 (sem migração), a policy `canRead/ManageTaxAssessment`
 * (item 15), os eventType `tax.assessment.confirmed`/`.superseded` (itens 14 e 22), `receitaBrutaPorAtividade` com o
 * MESMO gate de exaustividade (item 7, F-PCB-1 b) e a leitura do crédito do mês do PR-1 (`findPisCofinsCredits`, item 6).
 */
import type { CompanyFiscalProfile, Prisma, TaxAssessment } from 'generated/prisma';
import { ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ITaxAssessmentRepository } from '../repositories/ITaxAssessmentRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { IPayableRepository } from '../repositories/IPayableRepository';
import type { AuditService } from './AuditService';
import type { PisCofinsConfirmInput, PisCofinsPreviewInput } from '../dtos/PisCofinsDto';
import { receitaBrutaPorAtividade } from './receitaBrutaPorAtividade';
import { TAX_ASSESSMENT_CONFIRMED, TAX_ASSESSMENT_SUPERSEDED, toView, type TaxAssessmentPreviewLinha, type TaxAssessmentService, type TaxAssessmentView } from './TaxAssessmentService';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { MemoriaCalculoSchema } from '../models/taxAssessmentCalc';
import { fimDoMes } from '../models/taxAssessmentCalcAnual';
import { mesBounds } from '../models/Lalur.model';
import { razaoCreditoPisCofins, tabelaPisCofinsDe, type TributoPisCofins } from '../models/pisCofinsParams';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import {
  TRIBUTOS_PIS_COFINS,
  apurarPisCofinsMensal,
  isPeriodoPisCofins,
  mesDoPeriodo,
  modalidadeDoRegime,
  parametrosDoMes,
  periodoDoMes,
  type OrigemSaldoAnterior,
  type PeriodoPisCofins,
  type ResultadoPisCofins,
} from '../models/pisCofinsCalc';

/** BRIEF item 12: a forma gravada nas linhas de PIS/Cofins. */
export const FORMA_PIS_COFINS = 'MENSAL';

export interface PisCofinsPreviewView {
  pis: TaxAssessmentPreviewLinha;
  cofins: TaxAssessmentPreviewLinha;
  provisaoContasConfiguradas: boolean;
  avisos: string[];
}

export interface PisCofinsConfirmView {
  pis: TaxAssessmentView;
  cofins: TaxAssessmentView;
}

interface Calculo {
  perfil: CompanyFiscalProfile;
  resultado: Record<TributoPisCofins, ResultadoPisCofins>;
  /** Ids das linhas CONFIRMED de M(x−1) cujo saldo credor o cálculo leu (item 11) — re-checados dentro da tx. */
  anterioresIds: string[];
  provisaoContasConfiguradas: boolean;
  avisos: string[];
}

const ehPisCofins = (r: TaxAssessment): boolean => (TRIBUTOS_PIS_COFINS as readonly string[]).includes(r.tributo) && isPeriodoPisCofins(r.periodo);
const mes = (r: TaxAssessment): number => mesDoPeriodo(r.periodo as PeriodoPisCofins);

/** Linhas CONFIRMED vivas de PIS/COFINS lidas para o saldo credor e a ordem (item 11). */
interface ConfirmadosVizinhos {
  doAno: TaxAssessment[];
  /** Só em M01: as do ano anterior (janeiro lê dezembro — item 11). */
  anoAnterior: TaxAssessment[];
  /** Só em M12: as do ano seguinte (o M01 seguinte leu este dezembro — item 14, "de trás para frente"). */
  anoSeguinte: TaxAssessment[];
}

/**
 * Item 11 (F-PCB-2 a; ordem sequencial, precedente F-TA-3 a). M(x−1) = dezembro do ano anterior quando Mxx = M01.
 *  - M(x−1) confirmado nos 2 tributos ⇒ lê o `saldoNegativoCents` (= saldo credor) de cada um; `saldoCredorAnterior`
 *    no payload ⇒ 400;
 *  - senão, Mxx ≠ M01 com mês anterior do MESMO ano confirmado ⇒ 409 (pule nada; confirme M(x−1));
 *  - senão é o 1º mês apurado no sistema: o operador informa o saldo (ou nenhum).
 */
export function saldoAnterior(
  ano: number,
  periodo: PeriodoPisCofins,
  v: Pick<ConfirmadosVizinhos, 'doAno' | 'anoAnterior'>,
  informado: { PIS: string; COFINS: string } | undefined,
): { origem: OrigemSaldoAnterior; ids: string[] } {
  const m = mesDoPeriodo(periodo);
  const [anoPrev, mPrev] = m === 1 ? [ano - 1, 12] : [ano, m - 1];
  const prev = (m === 1 ? v.anoAnterior : v.doAno).filter((r) => r.periodo === periodoDoMes(mPrev));
  const pis = prev.find((r) => r.tributo === 'PIS');
  const cofins = prev.find((r) => r.tributo === 'COFINS');
  if (pis && cofins) {
    if (informado) {
      throw new ValidationError(`saldoCredorAnterior só no 1º mês apurado no sistema: ${periodoDoMes(mPrev)}/${anoPrev} está confirmado e o saldo credor é lido dele (BRIEF X8 F-PCB-2 a).`);
    }
    return {
      origem: { tipo: 'LIDO', periodo: periodoDoMes(mPrev), ano: anoPrev, PIS: pis.saldoNegativoCents, COFINS: cofins.saldoNegativoCents },
      ids: [pis.id, cofins.id],
    };
  }
  const antesNoAno = v.doAno.filter((r) => mes(r) < m);
  if (antesNoAno.length > 0) {
    throw new ConflictError(`confirme ${periodoDoMes(mPrev)}/${anoPrev} (PIS e COFINS) antes de ${periodo}/${ano} (BRIEF X8 item 11 — ordem sequencial).`, 'TAX_ASSESSMENT_ORDER');
  }
  if (!informado) return { origem: { tipo: 'NENHUM' }, ids: [] };
  return { origem: { tipo: 'INFORMADO', PIS: BigInt(informado.PIS), COFINS: BigInt(informado.COFINS) }, ids: [] };
}

/**
 * BE-INCR-PIS-COFINS PR-2 (nó X8; BRIEF itens 7–16) — prévia e confirmação (commit 1) da apuração mensal de PIS e
 * Cofins. A aritmética é a função pura `apurarPisCofinsMensal`; aqui só se lê perfil, razão, NF-e do mês e as linhas
 * confirmadas vizinhas, e se grava. A leitura (GET) é a do X7 (item 16).
 *
 * Confirmação (item 14, molde X7 item 14): recalcula FORA da tx e abre UMA `runTransaction` com os gates autoritativos
 * dentro (memória `authoritative-gate-inside-tx`, `tx` propagado ao repo): perfil da PJ igual ao lido, linhas de M(x−1)
 * iguais às lidas, CAS do a pagar, ordem (item 11), "de trás para frente" (item 14), um só CONFIRMED por (PJ, ano,
 * tributo, período). Sem trava de forma (PIS/Cofins seguem o regime da PJ, já travado pelo X13/X7) e sem cascata.
 */
export class PisCofinsAssessmentService {
  constructor(
    private readonly repo: ITaxAssessmentRepository,
    private readonly companyProfileRepo: ICompanyFiscalProfileRepository,
    private readonly fiscalProfileRepo: IFiscalProfileRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly payableRepo: Pick<IPayableRepository, 'findPisCofinsCredits'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    /** PR-3 (item 17): a provisão em 2 commits do X7, reusada — não há 2ª implementação do bridge. */
    private readonly provisao: Pick<TaxAssessmentService, 'provisionarAposConfirmacao'>,
    /** BE-INCR-LEGAL-PARAMS PR-1 (F-LP-4 a): a fotografia das alíquotas de PIS/Cofins que a função pura recebe. */
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  /** Item 13 — calcula PIS e Cofins juntos (D1) e não persiste. */
  async preview(scope: AccountingScope, input: PisCofinsPreviewInput): Promise<PisCofinsPreviewView> {
    this.assertRead(scope);
    const c = await this.calcular(scope, input);
    return {
      pis: toPreviewLinha(c.resultado.PIS, input.periodo),
      cofins: toPreviewLinha(c.resultado.COFINS, input.periodo),
      provisaoContasConfiguradas: c.provisaoContasConfiguradas,
      avisos: c.avisos,
    };
  }

  /** Item 14 — confirmação, commit 1. */
  async confirm(scope: AccountingScope, input: PisCofinsConfirmInput): Promise<PisCofinsConfirmView> {
    this.assertManage(scope);
    const c = await this.calcular(scope, input);
    const { anoCalendario: ano, periodo } = input;
    const owner = scope.ownerUserId;
    const m = mesDoPeriodo(periodo);

    const { out: gravadas, vivos: cair } = await this.repo.runTransaction(async (tx) => {
      const perfilTx = await this.companyProfileRepo.findByYear(scope, ano, tx);
      if (!perfilTx || perfilTx.updatedAt.getTime() !== c.perfil.updatedAt.getTime()) {
        throw new ConflictError(`o perfil fiscal da empresa de ${ano} mudou durante a confirmação — refaça a prévia.`, 'TAX_ASSESSMENT_STALE');
      }
      const v = await this.vizinhos(owner, ano, periodo, tx);

      // Item 11 dentro da tx: ordem (409) e as linhas de M(x−1) lidas no cálculo.
      const s = saldoAnterior(ano, periodo, v, input.saldoCredorAnterior);
      if (!mesmoConjunto(s.ids, c.anterioresIds)) {
        throw new ConflictError(`a apuração confirmada do mês anterior a ${periodo}/${ano} mudou — refaça a prévia.`, 'TAX_ASSESSMENT_STALE');
      }

      // CAS do a pagar (item 14).
      for (const t of TRIBUTOS_PIS_COFINS) {
        const r = c.resultado[t];
        if (input.expectedAPagarCents[t] !== r.aPagarCents.toString()) {
          throw new ConflictError(
            `${t}: a pagar recalculado (${r.aPagarCents} centavos) difere do esperado (${input.expectedAPagarCents[t]}) — refaça a prévia.`,
            'TAX_ASSESSMENT_CAS',
          );
        }
      }

      // Item 14: o saldo credor do mês seguinte leu ESTE mês — substituir (ou confirmar por trás) depois dele ⇒ 409.
      const posteriores = [...v.doAno.filter((r) => mes(r) > m), ...v.anoSeguinte.filter((r) => r.periodo === 'M01')];
      if (posteriores.length > 0) {
        const p = [...new Set(posteriores.map((r) => `${r.periodo}/${r.anoCalendario}`))].join(', ');
        throw new ConflictError(`${p} já confirmado depois de ${periodo}/${ano}: substitua de trás para frente (BRIEF X8 item 14).`, 'TAX_ASSESSMENT_ORDER');
      }

      // Um só CONFIRMED por (PJ, ano, tributo, período) (item 14) — molde do X7.
      const vivos = v.doAno.filter((r) => r.periodo === periodo);
      const supersedes = input.supersedesIds ?? [];
      const estranhos = supersedes.filter((id) => !vivos.some((r) => r.id === id));
      if (estranhos.length > 0) {
        throw new ConflictError(`supersedesIds [${estranhos.join(', ')}] não é a apuração CONFIRMED viva de ${periodo}/${ano}.`, 'TAX_ASSESSMENT_SUPERSEDES');
      }
      const naoNomeados = vivos.filter((r) => !supersedes.includes(r.id));
      if (naoNomeados.length > 0) {
        throw new ConflictError(
          `${periodo}/${ano} já tem apuração confirmada (${naoNomeados.map((r) => `${r.tributo} ${r.id}`).join(', ')}) — para substituir, informe supersedesIds.`,
          'TAX_ASSESSMENT_ALREADY_CONFIRMED',
        );
      }
      const mudou = await this.repo.markSuperseded(owner, vivos.map((r) => r.id), tx);
      if (mudou !== vivos.length) {
        throw new ConflictError(`apuração substituída em paralelo em ${periodo}/${ano} — refaça a prévia.`, 'TAX_ASSESSMENT_STALE');
      }

      const confirmedAt = new Date();
      const out = {} as Record<TributoPisCofins, TaxAssessment>;
      for (const t of TRIBUTOS_PIS_COFINS) {
        const r = c.resultado[t];
        const substituida = vivos.find((x) => x.tributo === t) ?? null;
        const row = await this.repo.create(
          {
            userId: owner,
            unitId: scope.unitId,
            anoCalendario: ano,
            tributo: t,
            regime: perfilTx.regime,
            forma: FORMA_PIS_COFINS,
            periodo,
            modo: r.modo,
            codigoReceita: r.codigoReceita,
            baseCents: r.baseCents,
            devidoCents: r.devidoCents,
            deducoesCents: r.deducoesCents,
            aPagarCents: r.aPagarCents,
            saldoNegativoCents: r.saldoNegativoCents,
            diferencaPostergadaCents: 0n,
            memoria: MemoriaCalculoSchema.parse(r.memoria) as Prisma.InputJsonValue,
            tabelaVersao: r.tabelaVersao,
            status: 'CONFIRMED',
            supersedesId: substituida?.id ?? null,
            confirmedById: scope.actorUserId,
            confirmedAt,
          },
          tx,
        );
        out[t] = row;
        // Item 22: o MESMO eventType do X7 e o mesmo payload (allowlist `tax.assessment.confirmed`), tributo = PIS/COFINS.
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: TAX_ASSESSMENT_CONFIRMED,
          targetType: 'tax_assessment',
          targetId: row.id,
          payload: {
            assessmentId: row.id,
            tributo: t,
            periodo,
            anoCalendario: String(ano),
            aPagarCents: row.aPagarCents.toString(),
            devidoCents: row.devidoCents.toString(),
            tabelaVersao: row.tabelaVersao,
            modo: row.modo,
            diferencaPostergadaCents: '0',
          },
        });
      }
      for (const sub of vivos) {
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: TAX_ASSESSMENT_SUPERSEDED,
          targetType: 'tax_assessment',
          targetId: sub.id,
          payload: {
            assessmentId: sub.id,
            supersededById: out[sub.tributo as TributoPisCofins].id,
            tributo: sub.tributo,
            periodo: sub.periodo,
            anoCalendario: String(ano),
          },
        });
      }
      return { out, vivos };
    });
    // Item 17 — commits 2/3, best-effort DEPOIS do commit 1: estorna a provisão das substituídas e provisiona as novas.
    const [pis, cofins] = await this.provisao.provisionarAposConfirmacao(scope, cair, [gravadas.PIS, gravadas.COFINS]);
    return { pis: toView(pis), cofins: toView(cofins) };
  }

  /** Lê perfis, razão, NF-e do mês e M(x−1) e chama a função pura. Recusas do item 9 (400) e a ordem do item 11 (409). */
  private async calcular(scope: AccountingScope, input: PisCofinsPreviewInput): Promise<Calculo> {
    const { anoCalendario: ano, periodo } = input;
    const m = mesDoPeriodo(periodo);
    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (!perfil) throw new ValidationError(`perfil fiscal da empresa de ${ano} ausente — cadastre-o antes de apurar PIS/Cofins.`);
    const modalidade = modalidadeDoRegime(perfil.regime); // SIMPLES/MEI ⇒ 400 (DAS)
    const linhasLegais = await this.legalParams.fotografia(['PIS_COFINS', 'CODIGO_RECEITA']);
    const tabela = tabelaPisCofinsDe(linhasLegais);
    parametrosDoMes(tabela, ano, periodo, modalidade); // ≥ 2027-01 ⇒ 400 (a função pura repete; aqui a recusa vem antes de ler o razão)
    if (perfil.ecfIndRecReceita === '1') {
      throw new ValidationError('regime de caixa (ecf.indRecReceita = 1): PIS/Cofins seguem o critério do IRPJ/CSLL e o caixa está fora (IN RFB 2.121/2022 art. 127; ADR-INCR-PIS-COFINS D6).');
    }
    const fp = await this.fiscalProfileRepo.findByScope(scope);
    if (!fp) throw new ValidationError('perfil fiscal da unidade ausente — cadastre-o (pisCofinsRegime) antes de apurar PIS/Cofins.');
    if (fp.pisCofinsRegime !== modalidade) {
      throw new ValidationError(
        `pisCofinsRegime da unidade (${fp.pisCofinsRegime}) diverge da modalidade do regime ${perfil.regime} da empresa em ${ano} (${modalidade}) — ` +
          'corrija o perfil fiscal da unidade (IN RFB 2.121/2022 arts. 122 e 145; F-X8-3 a).',
      );
    }

    const w = mesBounds(ano, m);
    const outras = (await this.postingRepo.unitIdsWithMovement(scope.ownerUserId, LEDGER_STATUSES, w.from, w.to)).filter((u) => u !== scope.unitId);
    if (outras.length > 0) {
      throw new ValidationError(`outra unidade da PJ com movimento em ${periodo}/${ano}: a apuração centralizada de várias unidades fica fora (ADR-INCR-PIS-COFINS D5; F-X7-7 a).`, {
        unidadesComMovimento: outras,
      });
    }

    const v = await this.vizinhos(scope.ownerUserId, ano, periodo);
    const s = saldoAnterior(ano, periodo, v, input.saldoCredorAnterior);

    const rec = await receitaBrutaPorAtividade({ accountRepo: this.accountRepo, postingRepo: this.postingRepo }, scope, w.from, w.to);
    const mm = String(m).padStart(2, '0');
    const creditosNfe = modalidade === 'NAO_CUMULATIVO' ? await this.payableRepo.findPisCofinsCredits(scope, `${ano}-${mm}-01`, fimDoMes(ano, m), razaoCreditoPisCofins(linhasLegais, fimDoMes(ano, m))) : [];

    const avisos: string[] = [];
    // No cumulativo o saldo credor lido do mês anterior (que também foi cumulativo) é sempre 0; se não for, avisa.
    let origem = s.origem;
    if (modalidade === 'CUMULATIVO' && origem.tipo === 'LIDO') {
      if (origem.PIS > 0n || origem.COFINS > 0n) {
        avisos.push(`saldo credor de ${origem.periodo}/${origem.ano} não se aplica no cumulativo (IN RFB 2.121/2022 art. 122) — confira com o contador.`);
      }
      origem = { tipo: 'NENHUM' };
    }
    const resultado = apurarPisCofinsMensal({
      tabela,
      ano,
      periodo,
      modalidade,
      receitaServicoCents: BigInt(rec.servicoCents),
      receitaRevendaCents: BigInt(rec.revendaCents),
      ajustesBase: input.ajustesBase,
      outrosCreditos: input.outrosCreditos,
      retencoes: input.retencoes,
      creditosNfe,
      saldoAnterior: origem,
    });

    // PR-3 (L-5, dono 06/10): mês com outros créditos > 0 exige também a redutora que os recebe na provisão.
    const temOutros = TRIBUTOS_PIS_COFINS.some((t) => resultado[t].memoria.some((l) => /^CREDITO_/.test(l.codigo) && !l.codigo.startsWith('CREDITO_NFE') && BigInt(l.valorCents) > 0n));
    const provisaoContasConfiguradas = !!(
      fp.pisDespesaAccountId &&
      fp.cofinsDespesaAccountId &&
      fp.pisRecolherAccountId &&
      fp.cofinsRecolherAccountId &&
      (modalidade === 'CUMULATIVO' || fp.pisCofinsRecuperavelAccountId) &&
      (!temOutros || fp.pisCofinsCreditoOutrosAccountId) &&
      // retenções (dono 06/10): retido a compensar + transitória a conciliar, nos 2 regimes
      (input.retencoes.every((r) => BigInt(r.valorCents) === 0n) || (fp.pisCofinsRetidoCompensarAccountId && fp.pisCofinsRetencaoConciliarAccountId))
    );
    if (!provisaoContasConfiguradas) {
      avisos.push('contas da provisão de PIS/Cofins não configuradas no perfil fiscal da unidade — a provisão ficará pendente (BRIEF X8 itens 2 e 17; com outros créditos no mês, também a redutora pisCofinsCreditoOutrosAccountId; com retenções, as contas de retido a compensar e a conciliar).');
    }
    if (input.ajustesBase.length === 0 && rec.revendaCents > 0) {
      avisos.push('ajustes não informados: a base tributa toda a receita (revenda com alíquota zero e cota-parte do parceiro só saem se informadas — BRIEF X8 item 13).');
    }
    if (creditosNfe.some((n) => n.derivado)) {
      avisos.push('há NF-e do mês com crédito PIS × Cofins derivado por 165:760 (nota anterior à gravação separada — F-X8-7 a).');
    }
    return { perfil, resultado, anterioresIds: s.ids, provisaoContasConfiguradas, avisos };
  }

  /** Linhas CONFIRMED vivas de PIS/COFINS do ano (+ dezembro anterior em M01, + janeiro seguinte em M12). */
  private async vizinhos(owner: string, ano: number, periodo: PeriodoPisCofins, tx?: Prisma.TransactionClient): Promise<ConfirmadosVizinhos> {
    const m = mesDoPeriodo(periodo);
    const ler = async (a: number) => (await this.repo.findConfirmedByYear(owner, a, tx)).filter(ehPisCofins);
    return {
      doAno: await ler(ano),
      anoAnterior: m === 1 ? await ler(ano - 1) : [],
      anoSeguinte: m === 12 ? await ler(ano + 1) : [],
    };
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler a apuração de PIS/Cofins.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para confirmar a apuração de PIS/Cofins.');
  }
}

function mesmoConjunto(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

function toPreviewLinha(r: ResultadoPisCofins, periodo: string): TaxAssessmentPreviewLinha {
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
    diferencaPostergadaCents: '0',
    tabelaVersao: r.tabelaVersao,
    memoria: r.memoria,
  };
}
