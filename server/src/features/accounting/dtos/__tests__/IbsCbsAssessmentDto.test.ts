/** IBS-CBS-2027 PR-2 (BRIEF itens 10 e 13; contrato §4.2) — contratos de entrada da apuração mensal. */
import { IBS_CBS_INICIO_MSG, IbsCbsAssessmentConfirmSchema, IbsCbsAssessmentListQuerySchema, IbsCbsAssessmentPreviewSchema } from '../IbsCbsAssessmentDto';

const base = { unitId: 'u1', anoCalendario: 2027, mes: 1, tributo: 'IBS' };

describe('IbsCbsAssessmentDto', () => {
  it('item 10 (F-IBS-7 b): ano < 2027 ⇒ erro nomeado na prévia, na confirmação e na lista', () => {
    for (const r of [
      IbsCbsAssessmentPreviewSchema.safeParse({ ...base, anoCalendario: 2026 }),
      IbsCbsAssessmentConfirmSchema.safeParse({ ...base, anoCalendario: 2026, expectedSupersedesId: null }),
      IbsCbsAssessmentListQuerySchema.safeParse({ unitId: 'u1', anoCalendario: '2026' }),
    ]) {
      expect(r.success).toBe(false);
      expect(JSON.stringify(r.error!.flatten())).toContain(IBS_CBS_INICIO_MSG);
    }
  });

  it('contrato: .strict(), mês 1..12, tributo IBS|CBS, expectedSupersedesId obrigatório (null = 1ª confirmação)', () => {
    expect(IbsCbsAssessmentPreviewSchema.safeParse(base).success).toBe(true);
    expect(IbsCbsAssessmentPreviewSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(IbsCbsAssessmentPreviewSchema.safeParse({ ...base, mes: 13 }).success).toBe(false);
    expect(IbsCbsAssessmentPreviewSchema.safeParse({ ...base, tributo: 'ISS' }).success).toBe(false);
    expect(IbsCbsAssessmentConfirmSchema.safeParse(base).success).toBe(false);
    expect(IbsCbsAssessmentConfirmSchema.safeParse({ ...base, expectedSupersedesId: null }).success).toBe(true);
    expect(IbsCbsAssessmentListQuerySchema.parse({ unitId: 'u1', anoCalendario: '2027' }).anoCalendario).toBe(2027);
  });
});
