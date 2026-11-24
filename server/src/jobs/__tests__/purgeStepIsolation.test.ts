/**
 * EFX F-19.1 (auditoria de estruturas implícitas, ficha EFX-19; GAP-MAP "Estruturas implícitas — faixa 1"):
 * um passo da purga que lança não pode impedir os outros nesse ciclo (a purga roda a cada 24 h), e a falha alerta
 * (ADR-OBSERVABILIDADE OBS-R11). O que cada passo expurga não muda aqui — só o isolamento entre eles.
 */
const deleteManyDynamic = jest.fn();
const deleteManyInterview = jest.fn();
const deleteManyReport = jest.fn();
const deleteManyView = jest.fn();
const findManyAttachment = jest.fn();
const deleteManyAttachment = jest.fn();
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    dynamicTableData: { deleteMany: (...a: unknown[]) => deleteManyDynamic(...a) },
    interviewSession: { deleteMany: (...a: unknown[]) => deleteManyInterview(...a) },
    crmReportDefinition: { deleteMany: (...a: unknown[]) => deleteManyReport(...a) },
    savedTableView: { deleteMany: (...a: unknown[]) => deleteManyView(...a) },
    crmAttachment: {
      findMany: (...a: unknown[]) => findManyAttachment(...a),
      deleteMany: (...a: unknown[]) => deleteManyAttachment(...a),
    },
  },
}));
const sendAlertWebhook = jest.fn();
jest.mock('../../lib/alertWebhook', () => ({ sendAlertWebhook: (...a: unknown[]) => sendAlertWebhook(...a) }));

import { purgeOldDeletedRecords } from '../PurgeDeletedRecords';

beforeEach(() => {
  jest.clearAllMocks();
  deleteManyDynamic.mockRejectedValue(new Error('SQLITE_BUSY: database is locked'));
  deleteManyInterview.mockResolvedValue({ count: 0 });
  deleteManyReport.mockResolvedValue({ count: 0 });
  deleteManyView.mockResolvedValue({ count: 0 });
  findManyAttachment.mockResolvedValue([]);
  deleteManyAttachment.mockResolvedValue({ count: 0 });
});

describe('EFX F-19.1 — passo da purga que falha não bloqueia os outros', () => {
  it('EFX F-19.1: o primeiro passo lança e os seguintes ainda rodam, com alerta da falha', async () => {
    await purgeOldDeletedRecords().catch(() => undefined);

    expect(deleteManyDynamic).toHaveBeenCalledTimes(1);
    expect({
      interviewSession: deleteManyInterview.mock.calls.length,
      crmReportDefinition: deleteManyReport.mock.calls.length,
      savedTableView: deleteManyView.mock.calls.length,
      crmAttachment: findManyAttachment.mock.calls.length,
    }).toEqual({ interviewSession: 1, crmReportDefinition: 1, savedTableView: 1, crmAttachment: 1 });
    expect(sendAlertWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'job_failed', step: 'DynamicTableData' }),
    );
  });
});
