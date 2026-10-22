/**
 * FIX-AUTH-CONTA — testes-guarda (sessao-instrumentacao, lote 2). Achados de
 * `docs/operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md` §3.4.
 * Cada caso afirma o comportamento correto e FALHA hoje pelo motivo do achado.
 *
 * Run via `npm run test:integration`.
 */
import { existsSync } from 'node:fs';
import request from 'supertest';
import prisma from '@/lib/prisma';
import * as storage from '@/lib/attachmentStorage';
import { UserService } from '../services/UserService';
import { UserRepository } from '../repositories/UserRepository';
import { UserPolicy } from '../policies/UserPolicy';
import { Role } from '../models/User.model';
import type { IVectorRepository } from '@/features/documents/repositories/IVectorRepository';
import { pushTestSchema, resetDb, disconnectDb, seedUser, ctxFor, makeApp, authHeader } from '@test/helpers';

const PDF = Buffer.from('%PDF-1.4\n%guarda\n');

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  // Limpa do disco qualquer binário que o caso tenha deixado (o guarda de #12 deixa, hoje).
  for (const { storageKey } of await prisma.crmAttachment.findMany({ select: { storageKey: true } })) {
    await storage.deleteFile(storageKey);
  }
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe('§3.4 #12 — exclusão de usuário não limpa anexos em disco', () => {
  it('depois de excluir o usuário, o binário do anexo dele não fica no disco', async () => {
    await seedUser({ username: 'root', role: Role.ADMIN });
    const victim = await seedUser({ username: 'victim' });
    const { storageKey } = await storage.saveFile(victim.id, 'lead', 'lead-1', 'doc.pdf', PDF);
    await prisma.crmAttachment.create({
      data: {
        userId: victim.id, entityType: 'lead', entityId: 'lead-1', fileName: 'doc.pdf',
        mimeType: 'application/pdf', fileSize: PDF.length, storageKey,
      },
    });
    const absPath = storage.resolveReadPath(storageKey);
    const vectors = { deleteVectorsByUserId: jest.fn().mockResolvedValue(undefined) } as unknown as IVectorRepository;
    const service = new UserService(new UserRepository(), new UserPolicy(), vectors);

    await service.deleteUser(victim.id, ctxFor({ id: 'admin-x', username: 'root2', role: Role.ADMIN }));

    expect(await prisma.user.findUnique({ where: { id: victim.id } })).toBeNull();
    // Hoje: a linha some por Cascade, o arquivo fica órfão em ATTACHMENTS_DIR.
    try {
      expect(existsSync(absPath)).toBe(false);
    } finally {
      await storage.deleteFile(storageKey);
    }
  });
});

describe('§3.4 #22 — upload de anexo não valida posse do entityId', () => {
  it('anexar a um entityId que não é registro do usuário é recusado com 404 e nada é gravado', async () => {
    const owner = await seedUser({ username: 'owner' });

    const res = await request(makeApp())
      .post('/api/crm/attachments')
      .set(authHeader({ id: owner.id, username: owner.username }))
      .field('entityType', 'lead')
      .field('entityId', 'lead-que-nao-existe')
      .attach('file', PDF, { filename: 'doc.pdf', contentType: 'application/pdf' });

    // Hoje: 201 e a linha + binário gravados para um pai que não existe.
    expect(res.status).toBe(404);
    expect(await prisma.crmAttachment.count()).toBe(0);
  });
});
