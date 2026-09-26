import { AdvanceOpportunitySchema } from '../CrmOpportunityDto';

describe('AdvanceOpportunitySchema', () => {
  // Lacuna (teste vivo 2026-09-25, GAP-MAP "AdvanceOpportunityDto aceita stageType/status ignorados"):
  // desde a correção do Won-pelo-servidor, advanceOpportunity decide Won/Lost só pelo `type` gravado
  // da etapa e ignora `stageType`/`status` do cliente — mas o DTO segue aceitando os dois (param
  // aceito-e-ignorado). Regra da casa: ou implementa, ou 400. Sair do DTO só fecha isto se o schema
  // RECUSAR a chave (`.strict()`); o strip default do Zod continuaria aceitando-e-ignorando.
  it.failing('recusa stageType/status que advanceOpportunity ignora', () => {
    const base = { opportunityId: 'opp-1', stageId: 's-neg' };

    expect(AdvanceOpportunitySchema.safeParse({ ...base, stageType: 'closed_won' }).success).toBe(false);
    expect(AdvanceOpportunitySchema.safeParse({ ...base, status: 'Won' }).success).toBe(false);
  });
});
