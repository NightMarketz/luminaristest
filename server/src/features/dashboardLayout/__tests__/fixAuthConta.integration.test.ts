/**
 * FIX-AUTH-CONTA — testes-guarda (sessao-instrumentacao, lote 1). Achados de
 * `docs/operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md` §3.4 #2 e #21.
 *
 * Run via `npm run test:integration`.
 */
import prisma from '@/lib/prisma';
import { DashboardLayoutService } from '../services/DashboardLayoutService';
import { DashboardLayoutRepository } from '../repositories/DashboardLayoutRepository';
import { DashboardLayoutPolicy } from '../policies/DashboardLayoutPolicy';
import { Role } from '../../users/models/User.model';
import { NotFoundError } from '@/lib/errors';
import { pushTestSchema, resetDb, disconnectDb, seedUser, seedDashboardLayout, ctxFor } from '@test/helpers';

const service = new DashboardLayoutService(new DashboardLayoutRepository(), new DashboardLayoutPolicy());

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

const isActive = async (id: string) => (await prisma.dashboardLayout.findUnique({ where: { id } }))!.isActive;

describe('§3.4 #2 — ADMIN agindo sobre layout de outro usuário usa o userId do admin', () => {
  async function arrange() {
    const admin = await seedUser({ username: 'root', role: Role.ADMIN });
    const owner = await seedUser({ username: 'owner' });
    const adminTab = await seedDashboardLayout({ userId: admin.id, name: 'Admin', isActive: true });
    const ownerA = await seedDashboardLayout({ userId: owner.id, name: 'A', isActive: true });
    const ownerB = await seedDashboardLayout({ userId: owner.id, name: 'B', isActive: false });
    const ctx = ctxFor({ id: admin.id, username: admin.username, role: Role.ADMIN });
    return { adminTab, ownerA, ownerB, ctx };
  }

  it('setActiveLayout ativa o layout do dono e não mexe no layout ativo do admin', async () => {
    const { adminTab, ownerA, ownerB, ctx } = await arrange();

    await service.setActiveLayout(ownerB.id, ctx);

    expect(await isActive(adminTab.id)).toBe(true);
    expect(await isActive(ownerB.id)).toBe(true);
    expect(await isActive(ownerA.id)).toBe(false);
  });

  it('deleteLayout do layout ativo do dono reativa um layout DO DONO, não mexe no do admin', async () => {
    const { adminTab, ownerA, ownerB, ctx } = await arrange();

    await service.deleteLayout(ownerA.id, ctx);

    expect(await isActive(adminTab.id)).toBe(true);
    expect(await isActive(ownerB.id)).toBe(true);
  });
});

describe('§3.4 #21 — getLayoutById vaza existência (403 ≠ 404)', () => {
  it('layout de outro usuário responde NotFoundError, igual a um id inexistente', async () => {
    const owner = await seedUser({ username: 'owner' });
    const other = await seedUser({ username: 'other' });
    const tab = await seedDashboardLayout({ userId: owner.id });

    await expect(
      service.getLayoutById(tab.id, ctxFor({ id: other.id, username: other.username })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
