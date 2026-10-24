import type { AccountingScope } from '../scope/AccountingScope';
import type { PagamentoPacote, SaldoPacote } from '../models/ibsCbsAntecipacao';

/**
 * IBS-CBS-2027 PR-3 (itens 17–18) — o que a antecipação do pacote pré-pago lê, sem regra de negócio: os eventos já
 * mapeados no razão (`sale.package.sold`, `sale.settled`) e o subrazão do saldo (`PackageBalanceMovement`). Só leitura.
 */
export interface DadosPacoteIbsCbs {
  /** Vendas de pacote liquidadas no mês (`sale.settled` vivo no mês + `sale.package.sold` vivo da mesma venda). */
  pagamentos: PagamentoPacote[];
  /** Pares cliente × pacote com consumo ou vencimento no mês, com todos os movimentos até o fim do mês. */
  saldos: SaldoPacote[];
  /** Dia do pagamento e do documento autorizado de cada venda de origem dos saldos acima (ausente = não paga). */
  pagamentoDaVenda: Record<string, { pagoEm: string; dataDocumento: string | null }>;
  /** Vendas de pacote cujo `sale.package.sold` foi estornado com data no mês. */
  cancelamentos: { saleId: string; dia: string }[];
  /** Vendas de consumo (movimento `debit` no mês) com documento fiscal autorizado vivo. */
  consumosComDocumento: string[];
}

export interface IIbsCbsPacoteRepository {
  /** `de`/`ate` = primeiro e último dia do mês (date-only, inclusivos, no fuso do escopo). */
  dadosDoMes(scope: AccountingScope, de: string, ate: string): Promise<DadosPacoteIbsCbs>;
}
