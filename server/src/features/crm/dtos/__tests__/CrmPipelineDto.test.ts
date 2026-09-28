import { AdvanceStageSchema } from '../CrmPipelineDto';

describe('AdvanceStageSchema', () => {
  // Lacuna (2026-09-25, resíduo do fix "advanceStage pela etapa gravada"): advanceStage decide a
  // proposta pelo `type` gravado da etapa e ignora o `stageType` do cliente — o DTO não pode seguir
  // aceitando-o (param aceito-e-ignorado). Mesma regra do AdvanceOpportunitySchema: 400.
  it('recusa stageType que advanceStage ignora', () => {
    const base = { leadId: 'l1', stageId: 's2' };

    expect(AdvanceStageSchema.safeParse(base).success).toBe(true);
    expect(AdvanceStageSchema.safeParse({ ...base, stageType: 'proposal' }).success).toBe(false);
  });
});
