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

export const BANK_SETTLEMENT_ORIGINS = ['STATEMENT_LINE', 'CNAB_RETURN'] as const;
export type BankSettlementOrigin = (typeof BANK_SETTLEMENT_ORIGINS)[number];

export const BANK_SETTLEMENT_STATUSES = ['PENDING', 'CONFIRMING', 'CONFIRMED', 'REJECTED', 'FAILED', 'STALE'] as const;
export type BankSettlementStatus = (typeof BANK_SETTLEMENT_STATUSES)[number];

export const BANK_SETTLEMENT_TITLE_TYPES = ['PAYABLE', 'RECEIVABLE'] as const;
export type BankSettlementTitleType = (typeof BANK_SETTLEMENT_TITLE_TYPES)[number];

export const BANK_SETTLEMENT_STEPS = ['SETTLE', 'CHARGE', 'MATCH'] as const;
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
