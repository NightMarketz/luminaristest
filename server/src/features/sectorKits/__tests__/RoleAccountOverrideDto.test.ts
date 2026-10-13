/**
 * BE-INCR-KIT-SETOR PR-3 — contrato do ajuste papel→conta (item 18: `motivo` 10–500; §3.4; emenda E-11.4 da view).
 */
import {
  RemoveRoleOverrideResultSchema,
  RoleOverrideScopeQuerySchema,
  SetRoleOverrideRequestSchema,
  SetRoleOverrideResultSchema,
} from '@/features/sectorKits/dtos/RoleAccountOverrideDto';

const body = { unitId: 'u1', accountId: 'acc1', motivo: 'conta própria de receita de serviço' };

describe('SetRoleOverrideRequestSchema', () => {
  it('aceita {unitId, accountId, motivo}', () => {
    expect(SetRoleOverrideRequestSchema.parse(body)).toEqual(body);
  });

  it.each([
    ['motivo com 9 chars', { ...body, motivo: '123456789' }],
    ['motivo só com espaço em volta de 9 chars', { ...body, motivo: '   123456789   ' }],
    ['motivo com 501 chars', { ...body, motivo: 'x'.repeat(501) }],
    ['sem motivo', { unitId: 'u1', accountId: 'acc1' }],
    ['sem accountId', { unitId: 'u1', motivo: body.motivo }],
    ['chave a mais (strict)', { ...body, role: 'receita-serviço' }],
  ])('recusa: %s', (_caso, input) => {
    expect(SetRoleOverrideRequestSchema.safeParse(input).success).toBe(false);
  });

  it('aceita motivo de exatamente 10 e 500 chars', () => {
    expect(SetRoleOverrideRequestSchema.safeParse({ ...body, motivo: 'x'.repeat(10) }).success).toBe(true);
    expect(SetRoleOverrideRequestSchema.safeParse({ ...body, motivo: 'x'.repeat(500) }).success).toBe(true);
  });
});

describe('query e resultados', () => {
  it('query só com unitId (strict)', () => {
    expect(RoleOverrideScopeQuerySchema.safeParse({ unitId: 'u1' }).success).toBe(true);
    expect(RoleOverrideScopeQuerySchema.safeParse({ unitId: 'u1', role: 'x' }).success).toBe(false);
  });

  it('resultado do PUT: view com kitAccountCode (nullable) + binding', () => {
    const view = {
      id: 'o1',
      role: 'receita-serviço',
      accountId: 'acc1',
      accountCode: '3.5',
      kitAccountCode: '3.1',
      motivo: body.motivo,
      setById: 'u',
      createdAt: '2026-10-13T00:00:00.000Z',
      updatedAt: '2026-10-13T00:00:00.000Z',
    };
    expect(SetRoleOverrideResultSchema.safeParse({ override: view, binding: { status: 'Active', bindingVersion: 2 } }).success).toBe(true);
    expect(SetRoleOverrideResultSchema.safeParse({ override: { ...view, kitAccountCode: null }, binding: { status: 'Active', bindingVersion: 2 } }).success).toBe(true);
    expect(SetRoleOverrideResultSchema.safeParse({ override: view, binding: { status: 'Pronto', bindingVersion: 2 } }).success).toBe(false);
    expect(RemoveRoleOverrideResultSchema.safeParse({ binding: { status: 'Active', bindingVersion: 3 } }).success).toBe(true);
  });
});
