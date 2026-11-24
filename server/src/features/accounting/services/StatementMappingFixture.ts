import { CANONICAL_ACCOUNTS, isContaDoPlanoPadrao } from '../fixtures/ChartOfAccountsFixture';

export const STATEMENT_MAPPING_VERSION = 'statement-mapping.v8';

/**
 * Declarative mapping rules for BP (Balanço Patrimonial) and DRE (Demonstração
 * do Resultado do Exercício). Matching order within each statement: rules with a
 * `codePrefix` are checked first (more specific), then nature-only rules.
 *
 * Sign conventions (applied to rawBalance = debitCents − creditCents):
 *   debit_positive  → amountCents =  rawBalance   (Asset: positive = have it)
 *   credit_positive → amountCents = −rawBalance   (Liability/Equity: positive = owe it)
 *   debit_negative  → amountCents = −rawBalance   (Expense/Deduction: negative = reduces the result)
 */
export const STATEMENT_MAPPING_RULES = [
  // ── Balanço Patrimonial ─────────────────────────────────────────────────
  { id: 'bp.assets',      statement: 'BP',  match: { nature: 'Asset' },                       section: 'assets',            sign: 'debit_positive',  order: 100 },
  { id: 'bp.liabilities', statement: 'BP',  match: { nature: 'Liability' },                   section: 'liabilities',       sign: 'credit_positive', order: 200 },
  { id: 'bp.equity',      statement: 'BP',  match: { nature: 'Equity' },                      section: 'equity',            sign: 'credit_positive', order: 300 },
  // ── DRE ─────────────────────────────────────────────────────────────────
  { id: 'dre.gross_rev',  statement: 'DRE', match: { nature: 'Revenue', codePrefix: '3.1' },  section: 'grossRevenue',      sign: 'credit_positive', order: 100 },
  // Receita de Revenda de Mercadorias (3.3, ADR-INCR-REVENUE-SPLIT) is ALSO gross revenue —
  // without this rule findMappingRule returns undefined and the DRE silently drops it, so the
  // income statement underreports and J150 diverges from I355 (closing closes 3.3 by nature).
  { id: 'dre.gross_rev_resale', statement: 'DRE', match: { nature: 'Revenue', codePrefix: '3.3' }, section: 'grossRevenue', sign: 'credit_positive', order: 105 },
  // Receita de Pacotes Não Utilizados (3.4, BE-INCR-PACOTE-VALIDADE F-PV-4 a) — PROVISÓRIA até o contador
  // (PE-1: receita bruta, outras receitas operacionais ou outra). Sem regra, a conta sumiria da DRE em silêncio.
  { id: 'dre.gross_rev_breakage', statement: 'DRE', match: { nature: 'Revenue', codePrefix: '3.4' }, section: 'grossRevenue', sign: 'credit_positive', order: 106 },
  { id: 'dre.deductions', statement: 'DRE', match: { nature: 'Revenue', codePrefix: '3.2' },  section: 'revenueDeductions', sign: 'debit_negative',   order: 110 },
  // Tributos sobre a receita (3.6.x: 3.6.1 PIS, 3.6.2 COFINS — F-KE-1/F-KE-2 do KIT-SETOR; F-PCB-1R a, dono 13/10):
  // dedução da receita bruta (Lei 6.404 art. 187 I). Sem regra, a conta sumiria da DRE em silêncio (só há regra por prefixo para Revenue).
  { id: 'dre.deductions_taxes', statement: 'DRE', match: { nature: 'Revenue', codePrefix: '3.6' }, section: 'revenueDeductions', sign: 'debit_negative', order: 111 },
  // Custo das Mercadorias Vendidas (4.2, INCR-INVENTORY Body 2). MUST precede the nature-only
  // dre.expenses rule in this array so findMappingRule (first-match) routes 4.2 to costOfGoodsSold
  // instead of the generic expenses bucket — otherwise CMV would inflate expenses and the DRE would
  // report no cost of goods line. Same debit_negative sign as an expense (a cost reduces net).
  // Resultado financeiro (emenda 3.3, PR-1, E3; F-ENC-9 a, dono 13/10): 3.5 receitas financeiras (crédito positivo) e
  // 4.3 despesas financeiras (débito negativo) numa seção própria, no precedente do CMV. As duas regras ficam ANTES da
  // regra só por natureza `dre.expenses` (first-match), senão 4.3 cairia em despesas operacionais. 4.4 (multas
  // indedutíveis) e 4.6 (tarifa, L9) seguem em `expenses` pela regra por natureza.
  { id: 'dre.financial_rev', statement: 'DRE', match: { nature: 'Revenue', codePrefix: '3.5' }, section: 'financialResult', sign: 'credit_positive', order: 260 },
  { id: 'dre.financial_exp', statement: 'DRE', match: { nature: 'Expense', codePrefix: '4.3' }, section: 'financialResult', sign: 'debit_negative', order: 261 },
  { id: 'dre.cogs',       statement: 'DRE', match: { nature: 'Expense', codePrefix: '4.2' },   section: 'costOfGoodsSold',   sign: 'debit_negative',   order: 250 },
  // Custo dos Serviços Prestados (4.7, lacuna 35d3; dono 21/11): o insumo do serviço é custo, acima do lucro bruto (NBC TG 1002
  // item 5.1 (d)). Antes da regra só por natureza `dre.expenses` (first-match), senão cairia em despesas operacionais.
  { id: 'dre.cogs_services', statement: 'DRE', match: { nature: 'Expense', codePrefix: '4.7' }, section: 'costOfGoodsSold', sign: 'debit_negative', order: 251 },
  { id: 'dre.expenses',   statement: 'DRE', match: { nature: 'Expense' },                     section: 'expenses',          sign: 'debit_negative',   order: 300 },
] as const;

export type StatementMappingRule = (typeof STATEMENT_MAPPING_RULES)[number];
export type StatementId = 'BP' | 'DRE';

/** Does `rule` match (nature, code) in `statement` by the rule table alone (nature + `codePrefix`)? */
function matchesByTable(r: StatementMappingRule, nature: string, code: string, statement: StatementId): boolean {
  if (r.statement !== statement) return false;
  if (r.match.nature !== nature) return false;
  if ('codePrefix' in r.match && !code.startsWith(r.match.codePrefix)) return false;
  return true;
}

/**
 * Returns the first matching rule for (row.nature, row.code, statement), or undefined — the rule TABLE alone, without the
 * account's identity. The BP and the aging use it; every DRE reader uses `findDreRule` (papel + identidade da folha).
 */
export function findMappingRule(
  nature: string,
  code: string,
  statement: StatementId,
): StatementMappingRule | undefined {
  return STATEMENT_MAPPING_RULES.find((r) => matchesByTable(r, nature, code, statement));
}

/** Folhas analíticas do plano padrão: uma regra cujo `codePrefix` é uma delas designa ESSA conta, não um grupo. */
const FOLHAS_DO_PLANO_PADRAO: ReadonlySet<string> = new Set(CANONICAL_ACCOUNTS.filter((a) => a.acceptsEntries).map((a) => a.code));

/**
 * Regra de folha do plano padrão em `Expense` (hoje `dre.cogs` 4.2 e `dre.cogs_services` 4.7). Só `Expense`: é a única
 * natureza com regra genérica a seguir (`dre.expenses`). Uma conta alheia de `Revenue` num código de folha segue pelo
 * prefixo — sem regra seguinte ela sairia da DRE e o J150 divergiria do I355 (BRIEF BE-INCR-CONTA-CANONICA-PAPEL, achado 1).
 */
function isRegraDeFolhaExpense(r: StatementMappingRule): boolean {
  return r.match.nature === 'Expense' && 'codePrefix' in r.match && FOLHAS_DO_PLANO_PADRAO.has(r.match.codePrefix);
}

/** A linha de saldo que a DRE classifica: a identidade da conta (código, nome, natureza) e o id (papel). */
export interface DreRow {
  accountId: string;
  code: string;
  name: string;
  nature: string;
}

/**
 * A regra da DRE de uma conta — a ÚNICA função que os leitores da DRE usam (seções, resultado, diagnóstico, J150).
 * 1. Papel (lacuna 038d; cédula D-2026-11-21-DRE-INSUMO-PELO-PAPEL, Lei 6.404/76 art. 187 II/III): a conta apontada em
 *    `insumoExpenseAccountId` do perfil fiscal é custo dos serviços, qualquer que seja o código. Só para `Expense`.
 * 2. Identidade da folha (lacuna 13dd; dono, 21/11, "pelo papel/natureza, não só pelo código"): a conta que ocupa o
 *    código EXATO de uma folha do plano padrão em `Expense` só casa a regra da folha se É essa folha (nome + natureza da
 *    definição, `isContaDoPlanoPadrao`). A conta do usuário nesse código (ex.: 4.7 "Perda na Baixa de Imobilizado") cai
 *    na regra seguinte, `dre.expenses`. Os outros códigos do prefixo (subcontas legadas) seguem a tabela, como antes.
 * 3. O resto: a tabela de regras por natureza + prefixo, como `findMappingRule`.
 */
export function findDreRule(row: DreRow, custoServicosAccountIds: ReadonlySet<string>): StatementMappingRule | undefined {
  if (row.nature === 'Expense' && custoServicosAccountIds.has(row.accountId)) {
    return STATEMENT_MAPPING_RULES.find((r) => r.id === 'dre.cogs_services');
  }
  return STATEMENT_MAPPING_RULES.find(
    (r) =>
      matchesByTable(r, row.nature, row.code, 'DRE') &&
      (!isRegraDeFolhaExpense(r) || !('codePrefix' in r.match) || row.code !== r.match.codePrefix || isContaDoPlanoPadrao(row)),
  );
}

/** Applies the sign convention and returns a signed integer (cents). */
export function applySign(rawBalance: number, sign: StatementMappingRule['sign']): number {
  switch (sign) {
    case 'debit_positive':  return rawBalance;
    case 'credit_positive': return -rawBalance;
    case 'debit_negative':  return -rawBalance;
  }
}
