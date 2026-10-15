/**
 * BE-INCR-ONBOARDING-ACTIVATION EMENDA 14/10, item 9a (F-I4-7 a) — contrato do bloco `fiscal` do onboarding com a
 * pergunta `icmsContribuinte` (sim / não / não sei).
 */
import { OnboardingFiscalSchema } from '../CompanyFiscalProfileDto';

describe('OnboardingFiscalSchema — icmsContribuinte (item 9a)', () => {
  it.each([true, false, null])('aceita icmsContribuinte = %p', (icmsContribuinte) => {
    expect(OnboardingFiscalSchema.safeParse({ regime: 'PRESUMIDO', icmsContribuinte }).success).toBe(true);
  });

  it('aceita o campo ausente ("não sei")', () => {
    expect(OnboardingFiscalSchema.safeParse({ regime: 'REAL' }).success).toBe(true);
  });

  it('não coage string para boolean', () => {
    expect(OnboardingFiscalSchema.safeParse({ regime: 'REAL', icmsContribuinte: 'false' }).success).toBe(false);
  });

  it('.strict(): campo extra continua recusado', () => {
    expect(OnboardingFiscalSchema.safeParse({ regime: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' }).success).toBe(false);
  });
});
