/**
 * Contratos de entrada do BE-INCR-ACCOUNTANT-GOVERNANCE (BRIEF §4.1) — a forma está no snapshot; aqui a lógica fina.
 */
import {
  AcceptAccountantAssignmentSchema,
  EndAccountantAssignmentSchema,
  InviteAccountantSchema,
  ListAccountantAssignmentsQuerySchema,
} from '../AccountantAssignmentDto';

describe('InviteAccountantSchema', () => {
  const ok = { unitId: 'u', accountingContactId: 'c', accountantEmail: '  Contador@Ex.com ' };
  it('normaliza o e-mail (trim + minúsculas)', () => {
    expect(InviteAccountantSchema.parse(ok).accountantEmail).toBe('contador@ex.com');
  });
  it('e-mail inválido é recusado', () => {
    expect(InviteAccountantSchema.safeParse({ ...ok, accountantEmail: 'nao-e-email' }).success).toBe(false);
  });
  it('.strict(): campo extra é recusado', () => {
    expect(InviteAccountantSchema.safeParse({ ...ok, role: 'ADMIN' }).success).toBe(false);
  });
});

describe('AcceptAccountantAssignmentSchema (F-GOV-8 a reforçada, F-GOV-11 a)', () => {
  it('exige declaresWrittenContract === true', () => {
    expect(AcceptAccountantAssignmentSchema.safeParse({ declaresWrittenContract: true }).success).toBe(true);
    expect(AcceptAccountantAssignmentSchema.safeParse({ declaresWrittenContract: false }).success).toBe(false);
    expect(AcceptAccountantAssignmentSchema.safeParse({}).success).toBe(false);
  });
  it('sem responsibleFrom (F-GOV-11 a): o campo é recusado pelo .strict()', () => {
    expect(
      AcceptAccountantAssignmentSchema.safeParse({ declaresWrittenContract: true, responsibleFromYear: 2026 }).success,
    ).toBe(false);
  });
});

describe('EndAccountantAssignmentSchema', () => {
  it('reason obrigatório e não vazio depois do trim', () => {
    expect(EndAccountantAssignmentSchema.safeParse({ reason: '   ' }).success).toBe(false);
    expect(EndAccountantAssignmentSchema.safeParse({}).success).toBe(false);
    expect(EndAccountantAssignmentSchema.parse({ reason: ' distrato ' }).reason).toBe('distrato');
  });
  it('reason acima de 500 é recusado', () => {
    expect(EndAccountantAssignmentSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('ListAccountantAssignmentsQuerySchema', () => {
  it('exige unitId', () => {
    expect(ListAccountantAssignmentsQuerySchema.safeParse({}).success).toBe(false);
  });
});
