/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (item 9) — liquidar dividendos ou JCP a pagar é saída de Financiamento, não Operacional;
 * o IRRF retido segue no operacional, como os demais tributos a recolher.
 */
import { classifyCashFlowSection } from '../CashFlowReportService';
import { CANONICAL_ACCOUNTS, REFERENCIAL_PLANO_PADRAO } from '../../fixtures/ChartOfAccountsFixture';

describe('fluxo de caixa × obrigações com sócios (item 9)', () => {
  it('2.1.7.01 dividendos e 2.1.7.02 JCP a pagar → financing; 2.1.7.03 IRRF a recolher → operating', () => {
    expect(classifyCashFlowSection('Liability', '2.1.7.01')).toBe('financing');
    expect(classifyCashFlowSection('Liability', '2.1.7.02')).toBe('financing');
    expect(classifyCashFlowSection('Liability', '2.1.7.03')).toBe('operating');
    expect(classifyCashFlowSection('Liability', '2.1.2.01')).toBe('operating');
  });

  it('as folhas do referencial do plano padrão existem no plano canônico como folhas', () => {
    for (const e of REFERENCIAL_PLANO_PADRAO) {
      expect([e.accountCode, CANONICAL_ACCOUNTS.find((a) => a.code === e.accountCode)?.acceptsEntries]).toEqual([e.accountCode, true]);
    }
  });
});
