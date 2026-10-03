/**
 * BE-INCR-SEED-UNIDADE-E-ENV item 7 (F-P3 → c) — `deleteByUserId` dos donos canônicos das tabelas da purga do sistema
 * (`ActionProposalRepository`, `KnowledgeGraphRepository`): apagam o usuário pedido e SÓ ele.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ActionProposalRepository } from '../repositories/ActionProposalRepository';
import { KnowledgeGraphRepository } from '../repositories/KnowledgeGraphRepository';
import type { KnowledgeGraphData } from '../services/KnowledgeGraphService';

const makeUser = (n: number) =>
  prisma.user.create({ data: { name: `purga-${n}`, username: `purga-user-${n}`, email: `purga-${n}@test.local`, password: 'x', role: 'USER' } });
const proposal = (userId: string) => ({ userId, action: 'CREATE', tableId: 't', tableName: 'leads', tableLabel: 'Leads', data: {}, status: 'PENDING' });

describe('deleteByUserId (purga do sistema do usuário)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await resetDb();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ActionProposalRepository.deleteByUserId apaga as propostas do dono pedido e preserva as do outro', async () => {
    const [a, b] = [await makeUser(1), await makeUser(2)];
    const repo = new ActionProposalRepository();
    await repo.create(proposal(a.id));
    await repo.create(proposal(a.id));
    await repo.create(proposal(b.id));

    await repo.deleteByUserId(a.id);

    expect(await prisma.actionProposal.count({ where: { userId: a.id } })).toBe(0);
    expect(await prisma.actionProposal.count({ where: { userId: b.id } })).toBe(1);
  });

  it('KnowledgeGraphRepository.deleteByUserId apaga o grafo do dono pedido, preserva o do outro e não falha sem grafo', async () => {
    const [a, b, semGrafo] = [await makeUser(3), await makeUser(4), await makeUser(5)];
    const repo = new KnowledgeGraphRepository();
    const graph = { nodes: [], edges: [] } as unknown as KnowledgeGraphData;
    await repo.upsert(a.id, graph);
    await repo.upsert(b.id, graph);

    await repo.deleteByUserId(a.id);

    expect(await repo.findByUserId(a.id)).toBeNull();
    expect(await repo.findByUserId(b.id)).not.toBeNull();
    await expect(repo.deleteByUserId(semGrafo.id)).resolves.toBeUndefined();
  });
});
