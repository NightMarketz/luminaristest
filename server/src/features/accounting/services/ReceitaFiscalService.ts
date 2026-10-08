import { ForbiddenError } from '../../../lib/errors';
import { CLOSING_SOURCE_TYPE } from '../models/closing';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { mesBounds } from '../models/Lalur.model';
import { RESALE_REVENUE_ACCOUNT, SERVICE_REVENUE_ACCOUNT, splitRevenueCredit } from '../sync/mappers/revenueSplit';
import type { SaleRevenueLine } from '../sync/bridges/saleItems';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { IReceitaFiscalRepository, ReceitaFiscalLinhaData } from '../repositories/IReceitaFiscalRepository';
import type { IServiceFiscalProfileRepository } from '../repositories/IServiceFiscalProfileRepository';
import type { SimplesEntradasService } from './SimplesEntradasService';

/** Conta de devoluções (ChartOfAccountsFixture): entra no tie-out com sinal de dedução. */
export const DEVOLUCOES_ACCOUNT = '3.2';

/** Linha sintética de uma venda sem itens classificáveis: o razão lançou tudo em 3.1 (fallback do `splitRevenueCredit`). */
export const ITEM_VENDA_INTEIRA = '__venda__';

export interface VendaReconhecida {
  saleId: string;
  /** `totalAmount` em reais, como o mapper o recebe (ele arredonda ×100 — aqui também). */
  amount: number;
  /** Dia da receita (YYYY-MM-DD), o mesmo `occurredAt` do `sale.finalized`. */
  dia: string;
  lines: readonly SaleRevenueLine[];
}

export interface TieOut {
  competencia: string;
  subrazaoCents: number;
  razaoCents: number;
  ok: boolean;
  alerta: { codigo: 'TIEOUT_DIVERGENTE'; detalhe: string } | null;
}

/**
 * Item 15 — rateio PURO dos créditos que o razão lançou (`splitRevenueCredit`, o mesmo do `SaleFinalizedMapper`) pelos
 * itens da venda, na proporção de quantidade × preço dentro de cada natureza. O resíduo de centavo de cada natureza vai
 * para o último item dela, então Σ das linhas = crédito 3.1 + crédito 3.3 da venda, exatamente.
 */
export function ratearReceita(amount: number, lines: readonly SaleRevenueLine[]): Array<{ line: SaleRevenueLine | null; natureza: 'SERVICO' | 'REVENDA'; receitaCents: number }> {
  const totalCents = Math.round(amount * 100);
  const serviceReais = lines.filter((l) => l.nature === 'Service').reduce((s, l) => s + l.lineReais, 0);
  const productReais = lines.filter((l) => l.nature === 'Product').reduce((s, l) => s + l.lineReais, 0);
  const creditos = splitRevenueCredit(totalCents, { serviceReais, productReais });
  const credito = (code: string) => creditos.find((c) => c.accountCode === code)?.creditCents ?? 0;

  // Sem decomposição utilizável o razão lançou tudo em 3.1: uma linha só, de serviço, para a venda inteira.
  if (serviceReais + productReais <= 0) return [{ line: null, natureza: 'SERVICO', receitaCents: totalCents }];

  const out: Array<{ line: SaleRevenueLine | null; natureza: 'SERVICO' | 'REVENDA'; receitaCents: number }> = [];
  for (const [nature, natureza, cents] of [
    ['Service', 'SERVICO', credito(SERVICE_REVENUE_ACCOUNT)],
    ['Product', 'REVENDA', credito(RESALE_REVENUE_ACCOUNT)],
  ] as const) {
    const doBalde = lines.filter((l) => l.nature === nature && l.lineReais > 0);
    const base = doBalde.reduce((s, l) => s + l.lineReais, 0);
    // Defesa (review PR-2): crédito numa natureza sem item positivo — o rateio não teria onde pôr; uma linha sintética
    // leva o valor inteiro para nenhum centavo sumir do subrazão.
    if (doBalde.length === 0) {
      if (cents !== 0) out.push({ line: null, natureza, receitaCents: cents });
      continue;
    }
    let resto = cents;
    doBalde.forEach((l, i) => {
      const v = i === doBalde.length - 1 ? resto : Math.round(cents * (l.lineReais / base));
      resto -= v;
      out.push({ line: l, natureza, receitaCents: v });
    });
  }
  return out;
}

/**
 * BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, BRIEF itens 15–16; F-SN-5 → c) — subrazão fiscal de receita e tie-out contra o
 * razão.
 *
 * atomicUntil: commit 1 = o `sale.finalized` (postEntry, tx raiz própria, na ponte); commit 2 = `registrarVenda` (as
 * linhas da venda numa tx). Nunca "mesma tx" (memória postentry-tx-raiz-subrazao-2-commits): uma falha entre os dois
 * deixa a receita no razão sem subrazão, e a passada `reconcileReceitaFiscal` do job de reconcile regrava — idempotente
 * pela @@unique (PJ, unidade, venda, item).
 *
 * Ponte = finalização (competência), não liquidação: a base do Simples é a receita AUFERIDA salvo opção pelo caixa (Res.
 * CGSN 140 art. 16; LC 123 art. 18 § 3º) — decisão pela lei, dono 07/10 ("pesquisa qual a convenção").
 */
export class ReceitaFiscalService {
  constructor(
    private readonly repo: IReceitaFiscalRepository,
    private readonly serviceFiscalRepo: Pick<IServiceFiscalProfileRepository, 'findManyByServiceRefs'>,
    private readonly entradas: Pick<SimplesEntradasService, 'contratoEmEfeito'>,
    private readonly accountRepo: Pick<IAccountRepository, 'findByCode'>,
    private readonly postingRepo: Pick<IPostingRepository, 'groupByAccount'>,
    private readonly policy: IAccountingPolicy,
  ) {}

  /** Item 15 — commit 2 da venda finalizada. Idempotente: linhas já gravadas ficam. Devolve quantas criou. */
  async registrarVenda(scope: AccountingScope, venda: VendaReconhecida): Promise<number> {
    const rateio = ratearReceita(venda.amount, venda.lines);
    const servicos = [...new Set(venda.lines.map((l) => l.serviceRef).filter((r): r is string => r !== null))];
    const perfis = servicos.length > 0 ? await this.serviceFiscalRepo.findManyByServiceRefs(scope, servicos) : [];
    const cTribNacDe = new Map(perfis.map((p) => [p.serviceRef, p.cTribNac]));

    const linhas: ReceitaFiscalLinhaData[] = [];
    for (const r of rateio) {
      const l = r.line;
      let parceriaContratoId: string | null = null;
      let cotaProfissionalCents = 0n;
      // Parceria só em serviço de beleza (Lei 12.592 art. 1º-A caput); a cota do profissional sai da receita bruta (§ 5º).
      if (l && l.nature === 'Service' && l.employeeRef) {
        const contrato = await this.entradas.contratoEmEfeito(scope, l.employeeRef, venda.dia);
        if (contrato) {
          parceriaContratoId = contrato.id;
          cotaProfissionalCents = BigInt(Math.round((r.receitaCents * (10000 - contrato.cotaSalaoBp)) / 10000));
        }
      }
      linhas.push({
        competencia: venda.dia.slice(0, 7),
        dia: venda.dia,
        saleId: venda.saleId,
        itemRef: l?.itemRef ?? (r.natureza === 'SERVICO' ? ITEM_VENDA_INTEIRA : `${ITEM_VENDA_INTEIRA}:REVENDA`),
        natureza: r.natureza,
        cTribNac: l?.serviceRef ? (cTribNacDe.get(l.serviceRef) ?? null) : null,
        productRef: l?.productRef ?? null,
        receitaCents: BigInt(r.receitaCents),
        // Sem atributo fiscal do produto (X10a) as marcas ficam vazias; a segregação vem da declaração manual (item 12).
        excluir: [],
        parceriaContratoId,
        cotaProfissionalCents,
      });
    }
    return this.repo.createLinhasDaVenda(scope, linhas);
  }

  /** O reconcile pergunta antes de regravar. */
  async vendaRegistrada(scope: AccountingScope, saleId: string): Promise<boolean> {
    return (await this.repo.countLinhasDaVenda(scope, saleId)) > 0;
  }

  async mesesComSubrazao(scope: AccountingScope, competencias: readonly string[]): Promise<Set<string>> {
    this.assertRead(scope);
    return new Set(await this.repo.competenciasComLinhas(scope, competencias));
  }

  /**
   * Item 16 — Σ do subrazão da competência × saldo do razão no mês: (C − D) de 3.1 + 3.3 + 3.2 (a devolução tem saldo
   * devedor, então entra subtraindo), sem o lançamento de encerramento. Divergência ⇒ `TIEOUT_DIVERGENTE`; o bloqueio da
   * confirmação é do PR-3 (item 20).
   */
  async tieOut(scope: AccountingScope, competencia: string): Promise<TieOut> {
    this.assertRead(scope);
    const subrazaoCents = (await this.repo.findByCompetencia(scope, competencia)).reduce((s, l) => s + Number(l.receitaCents), 0);
    const contas = await Promise.all([SERVICE_REVENUE_ACCOUNT, RESALE_REVENUE_ACCOUNT, DEVOLUCOES_ACCOUNT].map((c) => this.accountRepo.findByCode(scope, c)));
    const ids = new Set(contas.filter((c) => c !== null).map((c) => c!.id));
    const [ano, mes] = competencia.split('-').map(Number);
    const { from, to } = mesBounds(ano, mes);
    const totais = await this.postingRepo.groupByAccount(scope, LEDGER_STATUSES, { from, to, excludeSourceTypes: [CLOSING_SOURCE_TYPE] });
    const razaoCents = totais.filter((t) => ids.has(t.accountId)).reduce((s, t) => s + t.creditCents - t.debitCents, 0);
    const ok = subrazaoCents === razaoCents;
    return {
      competencia,
      subrazaoCents,
      razaoCents,
      ok,
      alerta: ok ? null : { codigo: 'TIEOUT_DIVERGENTE', detalhe: `subrazão ${subrazaoCents} × razão ${razaoCents} centavos em ${competencia}` },
    };
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler a apuração do Simples Nacional.');
  }
}
