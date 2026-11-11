/**
 * EFX F-18.2 (auditoria de estruturas implícitas, fichas EFX-18 e SM-18; GAP-MAP "Estruturas implícitas — faixa 1"):
 * depois de uma queda entre o `createJob` (PROCESSING) e a transação do EXPORTED, o `AccountingDataExchangeJob`
 * ficava PROCESSING para sempre. Decisão do dono (questionário, 2026-11-10, SM Q-07 = a): uma varredura por
 * `updatedAt` antigo leva o job a FAILED, no padrão do `claimStaleConfirming` (SM-07). SQLite real: o `updatedAt`
 * semeado é gravado pelo Prisma, no mesmo formato que a varredura compara.
 */
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { pushTestSchema } from '@test/helpers';

const UNIT = 'unit-efx-f18-2';
const OWNER = 'owner-efx-f18-2';

type StaleSweep = { failStaleProcessing?: (now: Date) => Promise<unknown> };

const criarJob = (updatedAt: Date, supersedesJobId?: string) =>
  prisma.accountingDataExchangeJob.create({
    data: {
      userId: OWNER, unitId: UNIT, direction: 'EXPORT', kind: 'EXPORT_SPED_ECD', status: 'PROCESSING',
      requestedById: OWNER, createdAt: updatedAt, updatedAt, supersedesJobId,
    },
  });

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterAll(async () => {
  await prisma.accountingDataExchangeJob.deleteMany({ where: { unitId: UNIT } });
});

describe('EFX F-18.2 — job de exportação preso em PROCESSING', () => {
  it('EFX F-18.2: job PROCESSING antigo vira FAILED depois da varredura; o recente fica PROCESSING', async () => {
    const now = new Date();
    const preso = await criarJob(new Date(now.getTime() - 60 * 60 * 1000));
    const emCurso = await criarJob(now);

    const service = getFactory().getDataExchangeExportService() as unknown as StaleSweep;
    await service.failStaleProcessing?.(now);

    const depois = await prisma.accountingDataExchangeJob.findMany({
      where: { id: { in: [preso.id, emCurso.id] } },
      select: { id: true, status: true },
    });
    const status = Object.fromEntries(depois.map((j) => [j.id === preso.id ? 'preso' : 'emCurso', j.status]));
    expect(status).toEqual({ preso: 'FAILED', emCurso: 'PROCESSING' });
  });

  it('EFX F-18.2: substituta presa vira FAILED com supersedesJobId limpo, e a nova tentativa sobre o original cria', async () => {
    const now = new Date();
    const original = await prisma.accountingDataExchangeJob.create({
      data: { userId: OWNER, unitId: UNIT, direction: 'EXPORT', kind: 'EXPORT_SPED_ECD', status: 'EXPORTED', requestedById: OWNER },
    });
    const substitutaPresa = await criarJob(new Date(now.getTime() - 60 * 60 * 1000), original.id);

    const service = getFactory().getDataExchangeExportService() as unknown as StaleSweep;
    await service.failStaleProcessing?.(now);

    const depois = await prisma.accountingDataExchangeJob.findUnique({
      where: { id: substitutaPresa.id },
      select: { status: true, supersedesJobId: true },
    });
    expect(depois).toEqual({ status: 'FAILED', supersedesJobId: null });
    await expect(criarJob(now, original.id)).resolves.toMatchObject({ supersedesJobId: original.id });
  });
});
