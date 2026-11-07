/** BE-INCR-TEAMMATES PR-0 item 3 — os contratos da §2.2 recusam chave extra (.strict) e aceitam a forma do BRIEF. */
import {
  LlmCredentialReadSchema,
  McpServerCreateSchema,
  ProposalPayloadSchema,
  RoutineScheduleSchema,
  TeammateCreateSchema,
  TurnJobSchema,
} from '../TeammatesDto';

const teammate = {
  name: 'Conciliador',
  role: 'Conciliação bancária',
  playbook: 'Concilie o extrato.',
  allowedTools: ['query_table_data'],
  provider: 'anthropic',
  model: 'claude-x',
};

describe('TeammatesDto (§2.2)', () => {
  it('TeammateCreate aceita o mínimo e recusa chave extra', () => {
    expect(TeammateCreateSchema.safeParse(teammate).success).toBe(true);
    expect(TeammateCreateSchema.safeParse({ ...teammate, userId: 'u1' }).success).toBe(false);
  });

  it('toolOverrides só aceita PROPOSTA (aperta, nunca afrouxa)', () => {
    expect(TeammateCreateSchema.safeParse({ ...teammate, toolOverrides: { query_table_data: 'PROPOSTA' } }).success).toBe(true);
    expect(TeammateCreateSchema.safeParse({ ...teammate, toolOverrides: { request_record_update: 'LIVRE' } }).success).toBe(false);
  });

  it('LlmCredentialRead não carrega a chave', () => {
    const read = { id: 'c1', provider: 'openai', last4: 'abcd', monthlyTokenBudget: null, createdAt: '2026-11-06T00:00:00.000Z' };
    expect(LlmCredentialReadSchema.safeParse(read).success).toBe(true);
    expect(LlmCredentialReadSchema.safeParse({ ...read, apiKey: 'sk-1234567890' }).success).toBe(false);
  });

  it('RoutineSchedule: hora HH:MM, dia do mês até 28, sem campo de outra frequência', () => {
    expect(RoutineScheduleSchema.safeParse({ freq: 'DAILY', time: '08:30' }).success).toBe(true);
    expect(RoutineScheduleSchema.safeParse({ freq: 'DAILY', time: '24:00' }).success).toBe(false);
    expect(RoutineScheduleSchema.safeParse({ freq: 'MONTHLY', time: '08:30', monthday: 29 }).success).toBe(false);
    expect(RoutineScheduleSchema.safeParse({ freq: 'DAILY', time: '08:30', weekday: 1 }).success).toBe(false);
  });

  it('McpServerCreate exige https', () => {
    expect(McpServerCreateSchema.safeParse({ name: 'x', url: 'https://mcp.exemplo.com' }).success).toBe(true);
    expect(McpServerCreateSchema.safeParse({ name: 'x', url: 'http://mcp.exemplo.com' }).success).toBe(false);
  });

  it('TurnJob só leva turnId', () => {
    expect(TurnJobSchema.safeParse({ turnId: 't1' }).success).toBe(true);
    expect(TurnJobSchema.safeParse({ turnId: 't1', userId: 'u1' }).success).toBe(false);
  });

  it('ProposalPayload discrimina por kind; amountCents é string de dígitos', () => {
    const match = {
      kind: 'SETTLEMENT_MATCH',
      statementLineId: 'l1',
      targetType: 'RECEIVABLE',
      targetId: 'r1',
      amountCents: '12345',
      rationale: 'valor e data batem',
    };
    expect(ProposalPayloadSchema.safeParse(match).success).toBe(true);
    expect(ProposalPayloadSchema.safeParse({ ...match, amountCents: '123.45' }).success).toBe(false);
    expect(ProposalPayloadSchema.safeParse({ kind: 'LIMITE_ATINGIDO', limit: 'HOPS' }).success).toBe(true);
    expect(ProposalPayloadSchema.safeParse({ kind: 'OUTRO' }).success).toBe(false);
  });
});
