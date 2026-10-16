/**
 * BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 2): `findUnitRowState` contra SQLite real — o guard do
 * `AccountingScopeResolver` só vale se o dono e o `internalName` da tabela-mãe forem conferidos na base, não num mock.
 * Os dois `seedUnit` e o `productUnits` são o controle positivo: sem eles todo `null` passaria por vacuidade.
 */
import prisma from '@/lib/prisma';
import { DynamicTableRepository } from '../DynamicTableRepository';
import { pushTestSchema, resetDb, disconnectDb, seedUser, seedUnit, seedDynamicTable, seedDynamicTableData } from '@test/helpers';

const repo = new DynamicTableRepository();

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe('DynamicTableRepository.findUnitRowState', () => {
  it("linha viva de units do dono → 'live'", async () => {
    const a = await seedUser({ username: 'unit-a' });
    await seedUnit({ userId: a.id, id: 'unit-viva' });
    await expect(repo.findUnitRowState(a.id, 'unit-viva')).resolves.toBe('live');
  });

  it("linha apagada de units do dono → 'deleted'", async () => {
    const a = await seedUser({ username: 'unit-a' });
    await seedUnit({ userId: a.id, id: 'unit-apagada', deleted: true });
    await expect(repo.findUnitRowState(a.id, 'unit-apagada')).resolves.toBe('deleted');
  });

  it('id de units de OUTRO dono → null', async () => {
    const a = await seedUser({ username: 'unit-a' });
    const b = await seedUser({ username: 'unit-b' });
    await seedUnit({ userId: b.id, id: 'unit-do-b' });
    await expect(repo.findUnitRowState(b.id, 'unit-do-b')).resolves.toBe('live');
    await expect(repo.findUnitRowState(a.id, 'unit-do-b')).resolves.toBeNull();
  });

  it('id de linha de OUTRA tabela do mesmo dono (productUnits) → null', async () => {
    const a = await seedUser({ username: 'unit-a' });
    await seedUnit({ userId: a.id, id: 'unit-viva' });
    const outra = await seedDynamicTable({ userId: a.id, name: 'Unidades de produto', internalName: 'productUnits' });
    const linha = await seedDynamicTableData({ dynamicTableId: outra.id });
    expect(await prisma.dynamicTableData.count({ where: { id: linha.id } })).toBe(1);
    await expect(repo.findUnitRowState(a.id, linha.id)).resolves.toBeNull();
  });

  it('string livre → null', async () => {
    const a = await seedUser({ username: 'unit-a' });
    await seedUnit({ userId: a.id, id: 'unit-viva' });
    await expect(repo.findUnitRowState(a.id, 'qualquer-coisa')).resolves.toBeNull();
  });
});
