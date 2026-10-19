/**
 * Seam de transação do repositório do motor (correção de arquitetura 2026-10-19, autorização do dono em
 * chat: "Verifique a arquitetura e faça todas as correções sugeridas e mais correções necessárias no
 * DynamicTable") — SQLite real.
 *
 * Teste-guarda de dois defeitos que a cópia transacional do repositório (`TransactionalDynamicTableRepository`,
 * removida) carregava e o repositório raiz não — provados vermelhos antes da correção, contra a classe antiga:
 *   P1 `findRowsReferencingId` com `LIMIT 100` dentro da tx (Expected: 150 / Received: 100) — o lote de delete
 *      (`deleteTableDataBatch`) rodava `checkDeleteRules` com esse repo: `RESTRICT_IF_AGGREGATE` subcontava e
 *      `CASCADE` deixava órfãos acima de 100;
 *   P2 `findTablesReferencingTableId` sem o `userId` da interface (devolvia a tabela de OUTRO tenant).
 * Mais o contrato do seam: `runInTransaction` reverte tudo quando a função lança, e é reentrante (chamado num
 * repo já ligado à tx, reusa a tx em vez de aninhar).
 *
 * Run via `npm run test:integration`.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb, seedUser, seedDynamicTable, seedDynamicTableData } from '@test/helpers';
import { DynamicTableRepository } from '../DynamicTableRepository';

beforeAll(() => { pushTestSchema(); }, 120000);
afterEach(async () => { await resetDb(); });
afterAll(async () => { await disconnectDb(); });

const repo = () => new DynamicTableRepository();

describe('DynamicTableRepository — o repositório ligado à tx é o MESMO código do repositório raiz', () => {
  it('P1: findRowsReferencingId dentro da tx devolve TODAS as 150 linhas que referenciam (sem LIMIT)', async () => {
    const u = await seedUser({ username: 'p1' });
    const parent = await seedDynamicTable({ userId: u.id, name: 'Parent' });
    const child = await seedDynamicTable({
      userId: u.id, name: 'Child',
      schema: { fields: [{ name: 'parentId', label: 'P', type: 'relation', required: true, relation: { targetTable: parent.id } }] },
    });
    const target = await seedDynamicTableData({ dynamicTableId: parent.id, data: { title: 't' } });
    for (let i = 0; i < 150; i++) await seedDynamicTableData({ dynamicTableId: child.id, data: { parentId: target.id } });

    const inTx = await prisma.$transaction(async tx => (await repo().withTransaction(tx).findRowsReferencingId(child.id, 'parentId', target.id)).length);
    const outside = (await repo().findRowsReferencingId(child.id, 'parentId', target.id)).length;
    expect(inTx).toBe(150);
    expect(outside).toBe(150);
  });

  it('P2: findTablesReferencingTableId dentro da tx fica no tenant pedido', async () => {
    const a = await seedUser({ username: 'p2a' });
    const b = await seedUser({ username: 'p2b' });
    const target = await seedDynamicTable({ userId: a.id, name: 'Target' });
    const relSchema = { fields: [{ name: 'x', label: 'x', type: 'relation', required: false, relation: { targetTable: target.id } }] };
    const mine = await seedDynamicTable({ userId: a.id, name: 'Mine ref', schema: relSchema });
    await seedDynamicTable({ userId: b.id, name: 'Other tenant ref', schema: relSchema });

    const refs = await prisma.$transaction(async tx => repo().withTransaction(tx).findTablesReferencingTableId(target.id, a.id));
    expect(refs.map(r => r.id)).toEqual([mine.id]);
  });

  it('runInTransaction: a função lança → nada persiste (linha e versão revertem juntas)', async () => {
    const u = await seedUser({ username: 'tx-rollback' });
    const t = await seedDynamicTable({ userId: u.id });
    await expect(repo().runInTransaction(async txRepo => {
      await txRepo.createData(t.id, { title: 'ghost' });
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(await prisma.dynamicTableData.count({ where: { dynamicTableId: t.id } })).toBe(0);
    expect(await prisma.dynamicTableRowVersion.count({ where: { dynamicTableId: t.id } })).toBe(0);
  });

  it('runInTransaction é reentrante: chamado no repo da tx, reusa a tx (a reversão externa leva a escrita interna)', async () => {
    const u = await seedUser({ username: 'tx-reentrant' });
    const t = await seedDynamicTable({ userId: u.id });
    const spy = jest.spyOn(prisma, '$transaction');
    try {
      await expect(repo().runInTransaction(async txRepo => {
        await txRepo.runInTransaction(async inner => { await inner.createData(t.id, { title: 'inner' }); });
        throw new Error('outer boom');
      })).rejects.toThrow('outer boom');
      expect(spy).toHaveBeenCalledTimes(1); // uma tx só — a interna não abriu outra
    } finally {
      spy.mockRestore();
    }
    expect(await prisma.dynamicTableData.count({ where: { dynamicTableId: t.id } })).toBe(0);
  });

  it('runInTransaction entrega o tx do Prisma para a única escrita fora do motor (marco T0) e commita junto', async () => {
    const u = await seedUser({ username: 'tx-user' });
    const t = await seedDynamicTable({ userId: u.id });
    await repo().runInTransaction(async (txRepo, tx) => {
      await txRepo.createData(t.id, { title: 'row' });
      await tx.user.update({ where: { id: u.id }, data: { onboardingCompletedAt: new Date() } });
    });
    expect(await prisma.dynamicTableData.count({ where: { dynamicTableId: t.id } })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).onboardingCompletedAt).not.toBeNull();
  });
});
