/**
 * DataExchangeRepository — contrato em SQLite REAL, sem mock de Prisma (BE-INCR-FIXED-ASSETS
 * PR-4, item 21, review PR #368 item 6).
 *
 * POR QUE INTEGRAÇÃO, E NÃO UNIT: a invariante "2º substituto do mesmo job → 409" é FECHADA por
 * `@unique(supersedesJobId)` no banco (`SpedGenerationService`/`SpedEcfGenerationService`/
 * `SpedEcfRealGenerationService` só TRADUZEM o P2002 — `isSupersedesUniqueViolation`). Nenhum
 * mock de repositório levanta um `PrismaClientKnownRequestError` de verdade com `meta.target`
 * real do SQLite; só o banco prova que a unique existe e dispara.
 */
import prisma from '@/lib/prisma';
import { Prisma } from 'generated/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { DataExchangeRepository } from '@/features/accounting/repositories/DataExchangeRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { isSupersedesUniqueViolation } from '@/features/accounting/services/spedRectificationGate';

const UNIT = 'unit-dx';
const DONO = 'u-dx-a';

const repo = new DataExchangeRepository();
const scope = resolveAccountingScope({ userId: DONO }, UNIT);

const baseJobData = (over: Record<string, unknown> = {}) => ({
  userId: DONO,
  unitId: UNIT,
  direction: 'EXPORT' as const,
  kind: 'EXPORT_SPED_ECD' as const,
  status: 'EXPORTED' as const,
  requestedById: DONO,
  sha256: 'a'.repeat(64),
  storageKey: `k/${Math.random()}`,
  periodStart: new Date('2026-01-01T00:00:00.000Z'),
  periodEnd: new Date('2026-12-31T00:00:00.000Z'),
  ...over,
});

describe('DataExchangeRepository — @unique(supersedesJobId) em SQLite real (item 21/6)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('CONTROLE: dois jobs SEM supersedesJobId (dois NULL) coexistem — NULL não colide com NULL na unique', async () => {
    const a = await repo.createJob(baseJobData());
    const b = await repo.createJob(baseJobData());
    expect(a.id).not.toBe(b.id);
    expect(a.supersedesJobId).toBeNull();
    expect(b.supersedesJobId).toBeNull();
  });

  it('2º substituto do MESMO job → P2002 real, com "supersedesJobId" no meta.target (SQLite)', async () => {
    const original = await repo.createJob(baseJobData({ status: 'EXPORTED' }));
    const substituto1 = await repo.createJob(baseJobData({ supersedesJobId: original.id }));
    expect(substituto1.supersedesJobId).toBe(original.id);

    let caught: unknown;
    try {
      await repo.createJob(baseJobData({ supersedesJobId: original.id }));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((caught as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
    // Confere o meta.target de verdade (não um mock) — é o que `isSupersedesUniqueViolation`
    // depende para traduzir P2002 → ConflictError (409) nos 3 serviços de geração.
    expect(isSupersedesUniqueViolation(caught)).toBe(true);

    // O job substituído original permanece INALTERADO (status/sha256/storageKey) — a colisão
    // na unique nunca chega a tocar o job de origem.
    const reread = await repo.findJobById(scope, original.id);
    expect(reread?.status).toBe('EXPORTED');
    expect(reread?.sha256).toBe(original.sha256);
    expect(reread?.storageKey).toBe(original.storageKey);
    // E continua havendo só UM sucessor.
    const successor = await repo.findJobBySupersedesJobId(scope, original.id);
    expect(successor?.id).toBe(substituto1.id);
  });

  it('item 1 — um FAILED limpo (supersedesJobId=null) libera nova tentativa sobre o MESMO job', async () => {
    const original = await repo.createJob(baseJobData({ status: 'EXPORTED' }));
    const tentativa1 = await repo.createJob(baseJobData({ supersedesJobId: original.id }));

    // Simula o path FAILED dos 3 serviços: limpa supersedesJobId na mesma escrita.
    await repo.updateJob(scope, tentativa1.id, { status: 'FAILED', supersedesJobId: null });

    // Uma 2ª tentativa sobre o MESMO job original agora não colide na unique — o FAILED não
    // conta mais como sucessor.
    const tentativa2 = await repo.createJob(baseJobData({ supersedesJobId: original.id }));
    expect(tentativa2.supersedesJobId).toBe(original.id);
    expect(tentativa2.id).not.toBe(tentativa1.id);

    const successor = await repo.findJobBySupersedesJobId(scope, original.id);
    expect(successor?.id).toBe(tentativa2.id); // só o sucessor VIVO aparece
  });
});
