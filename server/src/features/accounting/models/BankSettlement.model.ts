/**
 * BE-INCR-BANK-SETTLEMENT (nó F7) — retorno bancário → item de baixa PENDENTE confirmado por humano.
 *
 * Autorização: `CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md` (R9 tabela irmã, R6 financeiro antes
 * de fiscal); `CEDULA-DECISAO-2026-09-10-entrevista.md` respostas 20 ("AP/AR NÃO têm baixa automática")
 * e 22 ("o encargo chega pelo retorno"); F-F7-1..5 → (a), ratificados pelo dono em 2026-09-15 por
 * questionário (sessão `PROXIMOS-PASSOS-2026-09-14` passo 7).
 *
 * Constantes de domínio e a REGRA DE CANDIDATURA como função pura (BRIEF item 3) — testável sem banco.
 */

import {
  DESCONTOS_CONCEDIDOS_CODE,
  DESCONTOS_OBTIDOS_CODE,
  JUROS_MORA_PAGOS_CODE,
  JUROS_MORA_RECEBIDOS_CODE,
  MULTAS_MORA_PAGAS_CODE,
  MULTAS_MORA_RECEBIDAS_CODE,
  MULTAS_NAO_TRIBUTARIAS_CODE,
  MULTAS_OFICIO_CODE,
} from '../fixtures/ChartOfAccountsFixture';

export const BANK_SETTLEMENT_ORIGINS = ['STATEMENT_LINE', 'CNAB_RETURN'] as const;
export type BankSettlementOrigin = (typeof BANK_SETTLEMENT_ORIGINS)[number];

export const BANK_SETTLEMENT_STATUSES = ['PENDING', 'CONFIRMING', 'CONFIRMED', 'REJECTED', 'FAILED', 'STALE'] as const;
export type BankSettlementStatus = (typeof BANK_SETTLEMENT_STATUSES)[number];

export const BANK_SETTLEMENT_TITLE_TYPES = ['PAYABLE', 'RECEIVABLE'] as const;
export type BankSettlementTitleType = (typeof BANK_SETTLEMENT_TITLE_TYPES)[number];

/** F5 PR-3 (P3-8): `FEE` (tarifa do provedor) entre `CHARGE` e `MATCH`. IBS-CBS-2027 PR-4: `SPLIT` logo depois da `SETTLE`. */
export const BANK_SETTLEMENT_STEPS = ['SETTLE', 'SPLIT', 'CHARGE', 'FEE', 'MATCH'] as const;
export type BankSettlementStep = (typeof BANK_SETTLEMENT_STEPS)[number];

/** F-F7-5 (a): cap RELATIVO do encargo — 20% do saldo aberto (basis points). Por escopo depois, se pedirem. */
export const BANK_SETTLEMENT_CHARGE_CAP_BP = 2000;

/** Janela de vencimento da candidatura (BRIEF item 3): `dueDate ∈ [line.date − 30d, line.date + 5d]`. */
export const BANK_SETTLEMENT_WINDOW_BEFORE_DAYS = 30;
export const BANK_SETTLEMENT_WINDOW_AFTER_DAYS = 5;

/** Review #326 F5: CONFIRMING mais velho que isto sem desfecho = crash entre CAS e efeito; `retry` pode retomar. */
export const BANK_SETTLEMENT_CONFIRMING_STALE_MS = 10 * 60 * 1000;

/** `sourceType` do lançamento de encargo (BRIEF item 8) — idempotente por `sourceId = item.id`. */
export const BANK_CHARGE_SOURCE_TYPE = 'bank.charge';

/** F5 PR-3 (P3-8): `sourceType` do lançamento da tarifa do provedor — idempotente por `sourceId = item.id`. */
export const PROVIDER_FEE_SOURCE_TYPE = 'provider.fee';

/** F5 PR-3 (G7, dono 2026-10-10): aviso no item proposto para cobrança terminal. A confirmação continua humana. */
export const TERMINAL_CHARGE_WARNING = 'Cobrança em estado terminal no Luminaris';

/** `DESCRIPTION` da linha de pagamento no relatório de liberações (M11) — só ela entra no passo novo (P3-6). */
export const MP_RELEASE_PAYMENT_DESCRIPTION = 'payment';

// ── Emenda 3.3 (BE-INCR-ENCARGOS-DESCONTOS, PR-1, E2 + §4.1) ─────────────────────────────────────────────────────────
// Classes do encargo (F-ENC-2 a, dono 13/10: o humano informa; o extrato não separa juros de multa). Multa de ofício e
// multa não tributária só existem no AP (L1–L3); recebidos são receita financeira (triagem do contador, item 6).
export const BANK_CHARGE_KINDS = ['JUROS_MORA', 'MULTA_MORA', 'MULTA_OFICIO', 'MULTA_NAO_TRIBUTARIA'] as const;
export type BankChargeKind = (typeof BANK_CHARGE_KINDS)[number];
export const BANK_CHARGE_KINDS_BY_SIDE: Record<BankSettlementTitleType, readonly BankChargeKind[]> = {
  PAYABLE: BANK_CHARGE_KINDS,
  RECEIVABLE: ['JUROS_MORA', 'MULTA_MORA'],
};
/** Domínio de `bank_settlement_items.shortfallTreatment` (E12, PR-3). IBS-CBS-2027 PR-4: `SPLIT_IBS_CBS` (EMENDA PR-4, dono 22/10). */
export const SHORTFALL_TREATMENTS = ['PARTIAL', 'DISCOUNT', 'SPLIT_IBS_CBS'] as const;
/** Domínio de `payable_payments.kind` / `receivable_receipts.kind` (E13, PR-3); a coluna nasce no PR-1 (E5). */
export const SETTLEMENT_KINDS = ['PAYMENT', 'DISCOUNT', 'SPLIT_IBS_CBS'] as const;

// ── IBS-CBS-2027 PR-4 (BRIEF itens 19–20 + EMENDA PR-4, dono 22/10) ─────────────────────────────────────────────────
// Split payment (LC 214/2025 arts. 31–33; Decreto 12.955/2026 art. 26 III): o provedor retém o IBS/CBS na liquidação e a
// linha chega MENOR que o título. O resto do título é quitado por recibos sem caixa: D IBS|CBS a recolher / C cliente.
/** `receivable_receipts.kind` e `bank_settlement_items.shortfallTreatment` do split. */
export const SPLIT_IBS_CBS_KIND = 'SPLIT_IBS_CBS' as const;
/** `receivable_receipts.method` do recibo de split — fora de `RECEIPT_METHODS` (o recibo avulso não aceita); a conta vem do perfil fiscal. */
export const SPLIT_IBS_CBS_METHOD = 'SplitPayment' as const;
export const SPLIT_NOT_ALLOWED_PAYABLE = 'split_not_allowed_payable';
export const SPLIT_MISMATCH = 'split_mismatch';
export const SPLIT_ACCOUNT_NOT_CONFIGURED = 'split_account_not_configured';

/** Competência padrão do split (EMENDA PR-4): o mês da linha do extrato (`AAAA-MM-DD` → `AAAA-MM`). */
export function competenciaPadraoDoSplit(lineDate: string): string {
  return lineDate.slice(0, 7);
}

/**
 * Item 19a (pura): com split, a linha (+ tarifa) mais o split quita o saldo inteiro — `abs + ibs + cbs = saldo`.
 * Devolve a falta que sobra (≠ 0 ⇒ `split_mismatch`).
 */
export function diferencaDoSplit(grossCents: number, openCents: number, split: { ibsCents: number; cbsCents: number }): number {
  return openCents - grossCents - split.ibsCents - split.cbsCents;
}
/** Tarifa bancária: classe própria, fora de `BANK_CHARGE_KINDS` (E27); valor em `item.feeCents`. */
export const BANK_FEE_KIND = 'TARIFA_BANCARIA' as const;

export type FinancialAccountClass = BankChargeKind | 'DISCOUNT';

/** F-ENC-1 (a): classe → código canônico (E1); chave ausente = classe que não existe naquele lado. */
export const FINANCIAL_ACCOUNT_CODES: Record<BankSettlementTitleType, Partial<Record<FinancialAccountClass, string>>> = {
  PAYABLE: {
    JUROS_MORA: JUROS_MORA_PAGOS_CODE,
    MULTA_MORA: MULTAS_MORA_PAGAS_CODE,
    MULTA_OFICIO: MULTAS_OFICIO_CODE,
    MULTA_NAO_TRIBUTARIA: MULTAS_NAO_TRIBUTARIAS_CODE,
    DISCOUNT: DESCONTOS_OBTIDOS_CODE,
  },
  RECEIVABLE: {
    JUROS_MORA: JUROS_MORA_RECEBIDOS_CODE,
    MULTA_MORA: MULTAS_MORA_RECEBIDAS_CODE,
    DISCOUNT: DESCONTOS_CONCEDIDOS_CODE,
  },
};

export interface ResolvedFinancialAccount {
  code: string;
  nature: 'Revenue' | 'Expense';
}

/**
 * E2 — resolução pura classe → conta. Natureza esperada pelo prefixo canônico (3.x Revenue, 4.x Expense). `null` quando
 * a classe não existe no lado (ex.: multa de ofício num recebível). Quem usa RE-LÊ a conta pelo código e confere
 * `isFinancialAccountUsable` (o `ensureChartOfAccounts` não confere natureza de código pré-existente, S6).
 */
export function resolveFinancialAccountCode(
  side: BankSettlementTitleType,
  kind: FinancialAccountClass,
): ResolvedFinancialAccount | null {
  const code = FINANCIAL_ACCOUNT_CODES[side][kind];
  if (!code) return null;
  return { code, nature: code.startsWith('3') ? 'Revenue' : 'Expense' };
}

/** E2 — a conta re-lida precisa existir, estar viva, aceitar lançamento e ter a natureza esperada; senão 400 no uso. */
export function isFinancialAccountUsable(
  account: { nature: string; acceptsEntries: boolean; deletedAt: Date | null } | null,
  expected: ResolvedFinancialAccount,
): boolean {
  return !!account && account.deletedAt === null && account.acceptsEntries && account.nature === expected.nature;
}

/** Código do 400 quando `isFinancialAccountUsable` falha (E2). */
export const FINANCIAL_ACCOUNT_INVALID = 'financial_account_invalid';

export const BANK_SETTLEMENT_SCANNED = 'bank_settlement.scanned';
export const BANK_SETTLEMENT_CONFIRMED = 'bank_settlement.confirmed';
export const BANK_SETTLEMENT_REJECTED = 'bank_settlement.rejected';
export const BANK_SETTLEMENT_FAILED = 'bank_settlement.failed';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Título candidato como o scan o enxerga — só o necessário para a regra, já em centavos inteiros. */
export interface CandidateTitle {
  id: string;
  titleType: BankSettlementTitleType;
  dueDate: Date;
  /** amountCents − paidCents/receivedCents (cache atômico do parcial, F-PS1 c). */
  openCents: number;
  documentNumber: string | null;
}

export interface CandidacyResult {
  outcome: 'one' | 'none' | 'ambiguous';
  title?: CandidateTitle;
  proposedCents?: number;
  chargeCents?: number;
}

/**
 * Regra de candidatura (BRIEF item 3; F-F7-5 a): determinística, sem fuzzy. O sinal da linha escolhe o
 * lado (o CHAMADOR já filtrou `titles` pelo lado e pelos status liquidáveis); aqui entram a janela de
 * vencimento, o valor e o desempate por `documentNumber` (insumo §4.2: `Payable/Receivable.documentNumber`
 * existe — cruzado com `line.externalRef`).
 *
 *   |line| === open                       → baixa exata, charge 0
 *   |line| <  open                        → baixa PARCIAL (#307), charge 0
 *   open < |line| ≤ open + cap(open)      → baixa total + encargo = |line| − open
 *   |line| >  open + cap                  → não é candidato (o humano concilia à mão)
 */
export function pickCandidate(
  line: { amountCents: number; date: Date; externalRef: string | null },
  titles: CandidateTitle[],
): CandidacyResult {
  const abs = Math.abs(line.amountCents);
  if (abs === 0) return { outcome: 'none' };
  const from = line.date.getTime() - BANK_SETTLEMENT_WINDOW_BEFORE_DAYS * DAY_MS;
  const to = line.date.getTime() + BANK_SETTLEMENT_WINDOW_AFTER_DAYS * DAY_MS;

  const eligible = titles.filter((t) => {
    if (t.openCents <= 0) return false;
    const due = t.dueDate.getTime();
    if (due < from || due > to) return false;
    const cap = Math.floor((t.openCents * BANK_SETTLEMENT_CHARGE_CAP_BP) / 10000);
    return abs <= t.openCents + cap;
  });

  if (eligible.length === 0) return { outcome: 'none' };
  let chosen: CandidateTitle | undefined = eligible.length === 1 ? eligible[0] : undefined;
  if (!chosen && line.externalRef) {
    const byRef = eligible.filter((t) => t.documentNumber && t.documentNumber === line.externalRef);
    if (byRef.length === 1) chosen = byRef[0];
  }
  if (!chosen) return { outcome: 'ambiguous' };

  const proposedCents = Math.min(abs, chosen.openCents);
  const chargeCents = Math.max(0, abs - chosen.openCents);
  return { outcome: 'one', title: chosen, proposedCents, chargeCents };
}
