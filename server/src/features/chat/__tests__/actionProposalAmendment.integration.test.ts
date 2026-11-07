/**
 * BE-INCR-TEAMMATES PR-0 (emenda F-TM-8 a) — `ActionProposalRepository.create` grava os campos novos quando vêm e
 * deixa os defaults quando não vêm (achado 1 do revisor do #1120: o tipo aceitava e o corpo descartava).
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ActionProposalRepository } from '../repositories/ActionProposalRepository';

const base = (userId: string) => ({ userId, action: 'CREATE', tableId: 't', tableName: 'leads', tableLabel: 'Leads', data: {}, status: 'PENDING' });

describe('ActionProposalRepository.create — emenda F-TM-8 a', () => {
  let userId: string;
  beforeAll(async () => {
    pushTestSchema();
    await resetDb();
    userId = (await prisma.user.create({ data: { name: 'emenda', username: 'emenda-ap', email: 'emenda-ap@test.local', password: 'x', role: 'USER' } })).id;
  }, 120000);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem os campos novos: kind TABLE_ROW e o resto nulo (2ª leitura)', async () => {
    const created = await new ActionProposalRepository().create(base(userId));
    const row = await prisma.actionProposal.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.kind).toBe('TABLE_ROW');
    expect(row.payload).toBeNull();
    expect(row.teammateId).toBeNull();
    expect(row.channelMessageId).toBeNull();
    expect(row.expiresAt).toBeNull();
  });

  it('payload null explícito grava NULL do SQL, igual ao default (achado da rodada 2 do #1120)', async () => {
    const created = await new ActionProposalRepository().create({ ...base(userId), payload: null });
    const [row] = await prisma.$queryRaw<{ t: string }[]>`SELECT typeof(payload) AS t FROM action_proposals WHERE id = ${created.id}`;
    expect(row.t).toBe('null');
  });

  it('com os campos novos: todos gravados (2ª leitura)', async () => {
    const expiresAt = new Date('2026-11-07T12:00:00.000Z');
    const payload = { kind: 'LIMITE_ATINGIDO', limit: 'HOPS', threadId: 'th-1' };
    const created = await new ActionProposalRepository().create({
      ...base(userId), kind: 'LIMITE_ATINGIDO', payload, teammateId: 'tm-1', channelMessageId: 'cm-1', expiresAt,
    });
    const row = await prisma.actionProposal.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.kind).toBe('LIMITE_ATINGIDO');
    expect(row.payload).toEqual(payload);
    expect(row.teammateId).toBe('tm-1');
    expect(row.channelMessageId).toBe('cm-1');
    expect(row.expiresAt?.toISOString()).toBe(expiresAt.toISOString());
  });
});
