/**
 * P2 comportamento 11 — T0 do *time-to-first-ECD* (BE-INCR-P2-VERTICAL-CLINICA §3 item 11;
 * ADR-P2-second-vertical.md EMENDA 2026-08-25 F-P2-4b + EMENDA 2026-09-14 R7; F-I2-1 → a).
 *
 * O marco `User.onboardingCompletedAt` nasce NA MESMA transação de `installPresetAsSystem`: install que
 * confirma grava o T0; install que reverte (Pass 2 falha ao resolver relação) não deixa T0 nem tabela.
 * Mora fora do perímetro zero-diff (`src/__tests__/`) de propósito — a exceção nominal da emenda libera
 * UMA escrita em `DynamicTableService.installPresetAsSystem` e nada mais lá dentro (nem teste).
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, disconnectDb } from '@test/helpers/db';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { ValidationError } from '@/lib/errors';

const service = new DynamicTableService(new DynamicTableRepository(), new DynamicTablePolicy());
const USERS = ['t0-ok', 't0-rollback'];

const authors = {
  name: 'Authors',
  category: 'people',
  schema: { fields: [{ name: 'name', label: 'Name', type: 'string', required: true }] },
};
const booksPointingTo = (targetKey: string) => ({
  name: 'Books',
  category: 'people',
  schema: {
    fields: [
      { name: 'title', label: 'Title', type: 'string', required: true },
      { name: 'author', label: 'Author', type: 'relation', required: true, relation: { targetTable: `@@PRESET_TABLE_KEY::${targetKey}` } },
    ],
  },
});

describe('T0 do time-to-first-ECD — User.onboardingCompletedAt na tx de installPresetAsSystem', () => {
  beforeAll(async () => {
    pushTestSchema();
    for (const id of USERS) {
      await prisma.user.create({ data: { id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' } });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.dynamicTable.deleteMany({ where: { userId: { in: USERS } } });
    await prisma.user.deleteMany({ where: { id: { in: USERS } } });
    await disconnectDb();
  });

  it('nasce NULL — usuário sem onboarding não tem T0', async () => {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: 't0-ok' } });
    expect(u.onboardingCompletedAt).toBeNull();
  });

  it('install que confirma grava o marco (T0 ≥ instante anterior ao install, ≤ agora)', async () => {
    const before = new Date();
    await service.installPresetAsSystem('t0-ok', { tables: { authors, books: booksPointingTo('authors') } } as any);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: 't0-ok' } });
    expect(u.onboardingCompletedAt).not.toBeNull();
    expect(u.onboardingCompletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(u.onboardingCompletedAt!.getTime()).toBeLessThanOrEqual(Date.now());
    expect(await prisma.dynamicTable.count({ where: { userId: 't0-ok' } })).toBe(2);
  });

  it('install que reverte (Pass 2 falha) NÃO deixa T0 — o marco está na mesma tx das tabelas', async () => {
    await expect(
      service.installPresetAsSystem('t0-rollback', { tables: { authors, books: booksPointingTo('nao-existe') } } as any),
    ).rejects.toBeInstanceOf(ValidationError);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: 't0-rollback' } });
    expect(u.onboardingCompletedAt).toBeNull();
    // Se as tabelas do Pass 1 tivessem sobrevivido, o marco também teria — esta linha é o que prova a tx.
    expect(await prisma.dynamicTable.count({ where: { userId: 't0-rollback' } })).toBe(0);
  });
});
