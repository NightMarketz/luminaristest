import { ActivationBlockingIssueSchema } from '../dtos/ActivateDefaultBindingDto';

describe('ActivateDefaultBindingDto', () => {
  it('SOT F-12.1: period do bloqueante recusa mês que o calendário não tem (mês 13)', () => {
    const base = { code: 'ACCOUNTING_PERIOD_NOT_OPEN', message: 'Período não aberto.' };
    expect(ActivationBlockingIssueSchema.safeParse({ ...base, period: '2026-13' }).success).toBe(false);
    expect(ActivationBlockingIssueSchema.safeParse({ ...base, period: '2026-12' }).success).toBe(true);
    expect(ActivationBlockingIssueSchema.safeParse(base).success).toBe(true);
  });
});
