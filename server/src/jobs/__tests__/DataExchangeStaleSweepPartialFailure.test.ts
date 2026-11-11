/**
 * EFX F-18.2 (A1, revisor rodada 1) — o loop do repositório vira job a job; se um `updateMany` lança no meio, os
 * jobs que JÁ viraram FAILED não estão mais PROCESSING (o ciclo seguinte não os pega) e o job não tem coluna de
 * motivo: o alerta `stale_processing` de cada um tem de sair mesmo com a falha posterior, e o erro segue propagado.
 */
const findMany = jest.fn();
const updateMany = jest.fn();
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: { accountingDataExchangeJob: { findMany: (...a: unknown[]) => findMany(...a), updateMany: (...a: unknown[]) => updateMany(...a) } },
}));

import { DataExchangeRepository } from '../../features/accounting/repositories/DataExchangeRepository';
import { DataExchangeStaleSweepScheduler } from '../DataExchangeStaleSweepScheduler';

const job = (id: string) => ({ id, userId: 'u1', unitId: 'un1', kind: 'EXPORT_X' });

describe('DataExchangeStaleSweepScheduler — falha parcial da varredura', () => {
  it('alerta os jobs já levados a FAILED quando o 2º updateMany falha, e propaga o erro', async () => {
    findMany.mockResolvedValue([job('j1'), job('j2'), job('j3')]);
    updateMany.mockResolvedValueOnce({ count: 1 }).mockRejectedValueOnce(new Error('db down'));
    const alert = jest.fn();
    const log = { event: jest.fn() };
    const repo = new DataExchangeRepository();
    const scheduler = new DataExchangeStaleSweepScheduler({ sweep: () => repo.failStaleProcessing(new Date()), log, alert });

    await expect(scheduler.runOnce()).rejects.toThrow('db down');

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({
      source: 'data_exchange_export', event: 'generation_failed', jobId: 'j1', reason: 'stale_processing',
    }));
    expect(alert).not.toHaveBeenCalledWith(expect.objectContaining({ jobId: 'j2' }));
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({ source: 'data_exchange_stale_sweep', event: 'job_failed', error: 'db down' }));
    expect(log.event).toHaveBeenCalledWith('warn', 'job.completed', 'data_exchange_stale_sweep',
      expect.objectContaining({ reason: 'stale_processing', jobIds: ['j1'] }));
  });
});
