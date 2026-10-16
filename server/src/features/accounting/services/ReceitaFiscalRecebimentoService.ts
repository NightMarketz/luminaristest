import { ValidationError } from '../../../lib/errors';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../models/dates';
import type { AccountingScope } from '../scope/AccountingScope';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IReceitaFiscalRecebimentoRepository, OrigemRecebimento } from '../repositories/IReceitaFiscalRecebimentoRepository';

/** Meio de pagamento que consome o adiantamento de pacote (SelectPresets.paymentMethod). */
export const MEIO_PACOTE = 'Package Balance';
const MEIOS_CARTAO = { 'Debit Card': 'simplesCaixaPrazoCartaoDebitoDias', 'Credit Card': 'simplesCaixaPrazoCartaoCreditoDias' } as const;

export interface RecebimentoDaVenda {
  saleId: string;
  /** `totalAmount` da venda em reais (pagamento integral — a venda do salão tem um único pagamento). */
  amount: number;
  meio: string;
  /** Dia (YYYY-MM-DD) do `sale.settled`: o `paidAt` no fuso do escopo. */
  diaPagamento: string;
  /** Dia (YYYY-MM-DD) do `sale.finalized`: a prestação do serviço. */
  diaPrestacao: string;
}

/**
 * BE-INCR-SIMPLES-CAIXA PR-1 (nó X14-CAIXA, itens 1, 5, 6 e 7a; F-CX-1 a) — recebimentos de venda, base do DAS no
 * regime de caixa (Res. CGSN 140 art. 16 § 1º, vigente até 31/12/2026).
 *
 * atomicUntil: commit 1 = o `sale.settled` (postEntry, tx raiz própria, na ponte de liquidação); commit 2 = `registrar`
 * (a linha do recebimento). Nunca "mesma tx": uma falha entre os dois deixa a liquidação no razão sem recebimento, e a
 * passada `reconcileReceitaFiscalRecebimentos` (job de reconcile e backfill sob demanda) regrava — idempotente pela
 * @@unique (PJ, unidade, venda, origem). O estorno segue o mesmo par: commit 1 = reversal do `sale.settled`; commit 2 =
 * `estornar`.
 */
export class ReceitaFiscalRecebimentoService {
  constructor(
    private readonly repo: IReceitaFiscalRecebimentoRepository,
    private readonly companyRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
  ) {}

  /** Grava o recebimento da venda (idempotente). Devolve true quando criou a linha. */
  async registrar(scope: AccountingScope, r: RecebimentoDaVenda): Promise<boolean> {
    const valorCents = Math.round(r.amount * 100);
    if (!Number.isSafeInteger(valorCents) || valorCents <= 0) {
      throw new ValidationError(`Valor inválido para o recebimento da venda '${r.saleId}'.`);
    }
    // Item 6 — o consumo de pacote é recebimento no dia da prestação: o adiantamento é reconhecido na prestação, "ainda
    // que no regime de caixa" (Res. CGSN 140 art. 2º § 9º).
    const origem: OrigemRecebimento = r.meio === MEIO_PACOTE ? 'PACKAGE_BALANCE' : 'SALE_SETTLED';
    const dia = origem === 'PACKAGE_BALANCE' ? r.diaPrestacao : await this.diaDoRecebimento(scope, r.meio, r.diaPagamento);
    return this.repo.createIfAbsent(scope, {
      saleId: r.saleId,
      dia,
      competenciaCaixa: dia.slice(0, 7),
      valorCents: BigInt(valorCents),
      meio: r.meio,
      origem,
    });
  }

  /** Item 5 — o estorno do `sale.settled` (cancelamento da venda paga) marca o recebimento REVERTED, com o dia. */
  async estornar(scope: AccountingScope, saleId: string, diaEstorno: string): Promise<number> {
    return this.repo.markReverted(scope, saleId, diaEstorno);
  }

  async registrado(scope: AccountingScope, saleId: string): Promise<boolean> {
    return (await this.repo.findBySale(scope, saleId)).length > 0;
  }

  async ativo(scope: AccountingScope, saleId: string): Promise<boolean> {
    return (await this.repo.findBySale(scope, saleId)).some((l) => l.status === 'ACTIVE');
  }

  /**
   * Item 7a (F-CX-2 c + F-CX-2.1 a) — no cartão, o recebimento é `paidAt + N`, com o N do perfil do ano do pagamento.
   * Sem prazo no perfil (perfil por competência ou ausente), N = 0: a receita desse ano é tributada pela competência.
   */
  private async diaDoRecebimento(scope: AccountingScope, meio: string, diaPagamento: string): Promise<string> {
    const campo = MEIOS_CARTAO[meio as keyof typeof MEIOS_CARTAO];
    if (!campo) return diaPagamento;
    const perfil = await this.companyRepo.findByYear(scope, Number(diaPagamento.slice(0, 4)));
    const n = perfil?.[campo] ?? 0;
    return dateOnlyFromDayNumber(dayNumberFromDateOnly(diaPagamento) + n);
  }
}
