/**
 * FIX-AUTH-CONTA — testes-guarda (sessao-instrumentacao, lote 1). Achados de
 * `docs/operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md` §3.4.
 * Cada caso afirma o comportamento correto e FALHA hoje pelo motivo do achado.
 *
 * Run via `npm run test:integration`.
 */
import bcrypt from 'bcryptjs';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { UserService } from '../services/UserService';
import { UserRepository } from '../repositories/UserRepository';
import { UserPolicy } from '../policies/UserPolicy';
import { Role } from '../models/User.model';
import { ConflictError } from '@/lib/errors';
import type { IVectorRepository } from '@/features/documents/repositories/IVectorRepository';
import { pushTestSchema, resetDb, disconnectDb, seedUser, ctxFor, makeApp, authHeader } from '@test/helpers';

const repo = new UserRepository();

function serviceWithVectorSpy() {
  const deleteVectorsByUserId = jest.fn().mockResolvedValue(undefined);
  const vectors = { deleteVectorsByUserId } as unknown as IVectorRepository;
  return { service: new UserService(repo, new UserPolicy(), vectors), deleteVectorsByUserId };
}

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe('§3.4 #1 — excluir usuário com trilha contábil (FK onDelete: Restrict)', () => {
  it('recusa com ConflictError ANTES de apagar os vetores, e o usuário fica intacto', async () => {
    await seedUser({ username: 'root', role: Role.ADMIN });
    const victim = await seedUser({ username: 'victim' });
    await prisma.accountingPolicyVersion.create({
      data: { userId: victim.id, unitId: 'unit-1', target: 'FISCAL_PROFILE', version: 1, status: 'APPLIED', payload: {} },
    });
    const admin = ctxFor({ id: 'admin-x', username: 'root2', role: Role.ADMIN });
    const { service, deleteVectorsByUserId } = serviceWithVectorSpy();

    const outcome = await service.deleteUser(victim.id, admin).then(
      () => 'resolved',
      (e: unknown) => e,
    );

    expect(await repo.getUserById(victim.id)).not.toBeNull();
    // Hoje: P2003 cru (vira 500) e os vetores já foram apagados.
    expect(outcome).toBeInstanceOf(ConflictError);
    expect(deleteVectorsByUserId).not.toHaveBeenCalled();
  });
});

describe('§3.4 #6 — troca de senha/e-mail sem confirmar a senha atual', () => {
  async function seedSelf() {
    const u = await seedUser({ username: 'self', password: await bcrypt.hash('Old-Passw0rd', 4) });
    return { u, ctx: ctxFor({ id: u.id, username: u.username }) };
  }

  it('trocar a senha sem informar a senha atual é recusado e o hash não muda', async () => {
    const { u, ctx } = await seedSelf();
    const { service } = serviceWithVectorSpy();

    const outcome = await service.updateUser(u.id, { password: 'New-Passw0rd' }, ctx).then(
      () => 'resolved',
      () => 'rejected',
    );

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await bcrypt.compare('Old-Passw0rd', stored.password)).toBe(true);
    expect(outcome).toBe('rejected');
  });

  it('trocar o e-mail sem informar a senha atual é recusado e o e-mail não muda', async () => {
    const { u, ctx } = await seedSelf();
    const { service } = serviceWithVectorSpy();

    const outcome = await service.updateUser(u.id, { email: 'novo@test.co' }, ctx).then(
      () => 'resolved',
      () => 'rejected',
    );

    expect((await repo.getUserById(u.id))!.email).toBe('self@test.co');
    expect(outcome).toBe('rejected');
  });
});

describe('§3.4 #3 — logout não invalida o JWT', () => {
  it('o mesmo token, depois de POST /api/auth/logout, recebe 401', async () => {
    const app = makeApp();
    const u = await seedUser({ username: 'logout-user' });
    const header = authHeader({ id: u.id, username: u.username });

    const before = await request(app).get('/api/auth/me').set(header);
    expect(before.status).toBe(200); // controle: o token vale antes do logout

    const out = await request(app).post('/api/auth/logout').set(header);
    expect(out.status).toBe(200);

    const after = await request(app).get('/api/auth/me').set(header);
    expect(after.status).toBe(401);
  });
});
