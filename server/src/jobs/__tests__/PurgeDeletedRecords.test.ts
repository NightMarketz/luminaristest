/**
 * BE-INCR-INTERVIEW-SESSION (nó W4) — item 9, F-W4-5 b (dono, questionário, 2026-10-16): a sessão da entrevista
 * expirada ou apagada some em 7 dias (minimização LGPD); `DynamicTableData` segue em 90.
 */
const deleteManyDynamic = jest.fn().mockResolvedValue({ count: 0 });
const deleteManyInterview = jest.fn().mockResolvedValue({ count: 0 });
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    dynamicTableData: { deleteMany: (...a: unknown[]) => deleteManyDynamic(...a) },
    interviewSession: { deleteMany: (...a: unknown[]) => deleteManyInterview(...a) },
  },
}));

import { INTERVIEW_SESSION_RETENTION_MS, purgeOldDeletedRecords } from '../PurgeDeletedRecords';

const DIA = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-16T12:00:00.000Z').getTime();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => jest.restoreAllMocks());

describe('purgeOldDeletedRecords — InterviewSession', () => {
  it('a retenção da sessão é de 7 dias', () => {
    expect(INTERVIEW_SESSION_RETENTION_MS).toBe(7 * DIA);
  });

  it('apaga a sessão expirada OU apagada antes de now − 7 dias', async () => {
    await purgeOldDeletedRecords();

    const corte = new Date(NOW - 7 * DIA);
    expect(deleteManyInterview).toHaveBeenCalledTimes(1);
    expect(deleteManyInterview).toHaveBeenCalledWith({
      where: { OR: [{ expiresAt: { lt: corte } }, { deletedAt: { lt: corte } }] },
    });
  });

  it('DynamicTableData continua no corte de 90 dias', async () => {
    await purgeOldDeletedRecords();

    expect(deleteManyDynamic).toHaveBeenCalledWith({ where: { deletedAt: { lt: new Date(NOW - 90 * DIA) } } });
  });
});
