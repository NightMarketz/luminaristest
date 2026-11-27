/**
 * BE-INCR-ESCALA-BASE itens 39 e 42 — `HolidayExceptionService.sync` com dublês estreitos (repositório da escala, motor,
 * calendário). A integração pelo motor real está em `holidaySync.integration.test.ts`.
 */
import type { UserContext } from '../../../lib/authUtils';
import { NotFoundError } from '../../../lib/errors';
import { SchedulingPolicy } from '../policies/SchedulingPolicy';
import type { ISchedulingRowRepository, ProjectionRow } from '../repositories/ISchedulingRowRepository';
import { HolidayExceptionService, type ProjectionWriterPort } from '../services/HolidayExceptionService';

const user = { userId: 'u1', id: 'u1' } as UserContext;

function setup(opts: { units?: Record<string, string | null>; holidays?: Record<string, string[]>; noTable?: boolean } = {}) {
  const units: Record<string, string | null> = opts.units ?? { 'unit-1': 'America/Sao_Paulo' };
  let holidays: Record<string, string[]> = opts.holidays ?? { 'unit-1': ['2027-01-01', '2027-11-20'] };
  const store: ProjectionRow[] = [];
  const rows = {
    unitState: jest.fn(async (_o: string, id: string) => (id in units ? 'live' : null)),
    tableId: jest.fn(async () => (opts.noTable ? null : 'exc-table')),
    liveUnitIds: jest.fn(async () => Object.keys(units)),
    unitTimeZoneSetting: jest.fn(async (_o: string, id: string) => units[id] ?? null),
    projectionRows: jest.fn(async () => store.map((r) => ({ ...r }))),
  } as unknown as ISchedulingRowRepository;
  let n = 0;
  const writer: jest.Mocked<ProjectionWriterPort> = {
    createTableData: jest.fn(async (_u: UserContext, _t: string, dto: { data: Record<string, unknown> }, _o: { isSystem: boolean }) => {
      const id = `exc-${++n}`;
      store.push({ id, sourceId: String(dto.data.sourceId), deleted: false, data: dto.data });
      return { id };
    }),
    updateTableData: jest.fn(async (_u: UserContext, id: string, dto: { data: Record<string, unknown> }, _o: { isSystem: boolean }) => {
      units[id] = String(dto.data.timeZone);
      return {};
    }),
  };
  const effects = { afterDataWrite: jest.fn() };
  const calendar = { holidaysFor: jest.fn(async (_u: string, unitId: string) => holidays[unitId] ?? []) };
  const service = new HolidayExceptionService(rows, writer, effects, calendar, new SchedulingPolicy(), 'America/Sao_Paulo');
  return {
    service,
    store,
    writer,
    effects,
    calendar,
    setHolidays: (h: Record<string, string[]>) => (holidays = h),
  };
}

describe('HolidayExceptionService.sync (item 39)', () => {
  it('cria uma exceção da unidade por feriado, o dia inteiro no fuso da unidade, como sistema', async () => {
    const { service, writer, effects } = setup();
    await expect(service.sync(user, { unitId: 'unit-1', year: 2027 })).resolves.toEqual({ created: 2, skipped: 0, deletedByUser: 0 });
    expect(writer.createTableData).toHaveBeenNthCalledWith(
      1,
      user,
      'exc-table',
      {
        data: {
          unitId: 'unit-1',
          kind: 'HOLIDAY',
          origin: 'HOLIDAY_CALENDAR',
          startAt: '2027-01-01T03:00:00.000Z', // 00:00 em São Paulo (UTC−3)
          endAt: '2027-01-02T03:00:00.000Z',
          sourceType: 'HOLIDAY',
          sourceId: 'unit-1:2027-01-01',
        },
      },
      { isSystem: true },
    );
    expect(effects.afterDataWrite).toHaveBeenCalledTimes(1);
    expect(effects.afterDataWrite).toHaveBeenCalledWith('u1');
  });

  it('o dia segue o fuso da unidade (America/Manaus, UTC−4)', async () => {
    const { service, writer } = setup({ units: { 'unit-1': 'America/Manaus' }, holidays: { 'unit-1': ['2027-11-20'] } });
    await service.sync(user, { unitId: 'unit-1', year: 2027 });
    expect(writer.createTableData.mock.calls[0][2].data).toMatchObject({ startAt: '2027-11-20T04:00:00.000Z', endAt: '2027-11-21T04:00:00.000Z' });
  });

  it('idempotente: a segunda rodada pula tudo e não chama o efeito', async () => {
    const { service, writer, effects } = setup();
    await service.sync(user, { unitId: 'unit-1', year: 2027 });
    effects.afterDataWrite.mockClear();
    await expect(service.sync(user, { unitId: 'unit-1', year: 2027 })).resolves.toEqual({ created: 0, skipped: 2, deletedByUser: 0 });
    expect(writer.createTableData).toHaveBeenCalledTimes(2);
    expect(effects.afterDataWrite).not.toHaveBeenCalled();
  });

  it('F-ESC-23: o feriado que o usuário desligou não volta, e conta em deletedByUser', async () => {
    const { service, store, writer } = setup();
    await service.sync(user, { unitId: 'unit-1', year: 2027 });
    store[0].data = { ...store[0].data, disabled: true }; // o usuário abriu a unidade no 01/01 (linha viva, desligada)
    await expect(service.sync(user, { unitId: 'unit-1', year: 2027 })).resolves.toEqual({ created: 0, skipped: 1, deletedByUser: 1 });
    expect(writer.createTableData).toHaveBeenCalledTimes(2);
  });

  it('dado de antes da emenda: o feriado apagado também não volta (a chave conta a linha apagada)', async () => {
    const { service, store, writer } = setup();
    await service.sync(user, { unitId: 'unit-1', year: 2027 });
    store[0].deleted = true; // o usuário abriu a unidade no 01/01
    await expect(service.sync(user, { unitId: 'unit-1', year: 2027 })).resolves.toEqual({ created: 0, skipped: 1, deletedByUser: 1 });
    expect(writer.createTableData).toHaveBeenCalledTimes(2);
  });

  it('item 42: feriado municipal novo depois do sync → o próximo sync cria só o que falta', async () => {
    const { service, writer, setHolidays } = setup();
    await service.sync(user, { unitId: 'unit-1', year: 2027 });
    setHolidays({ 'unit-1': ['2027-01-01', '2027-01-25', '2027-11-20'] });
    await expect(service.sync(user, { unitId: 'unit-1', year: 2027 })).resolves.toEqual({ created: 1, skipped: 2, deletedByUser: 0 });
    expect(writer.createTableData).toHaveBeenCalledTimes(3);
    expect(writer.createTableData.mock.calls[2][2].data.sourceId).toBe('unit-1:2027-01-25');
  });

  it('F-ESC-18: unidade sem fuso recebe antes o padrão da borda, e a exceção usa esse fuso', async () => {
    const { service, writer } = setup({ units: { 'unit-1': null }, holidays: { 'unit-1': ['2027-01-01'] } });
    await service.sync(user, { unitId: 'unit-1', year: 2027 });
    expect(writer.updateTableData).toHaveBeenCalledWith(user, 'unit-1', { data: { timeZone: 'America/Sao_Paulo' } }, { isSystem: true });
    expect(writer.updateTableData.mock.invocationCallOrder[0]).toBeLessThan(writer.createTableData.mock.invocationCallOrder[0]);
    expect(writer.createTableData.mock.calls[0][2].data.startAt).toBe('2027-01-01T03:00:00.000Z');
  });

  it('sem unitId: todas as unidades vivas do dono, cada uma com a sua chave', async () => {
    const { service, writer } = setup({
      units: { 'unit-1': 'America/Sao_Paulo', 'unit-2': 'America/Sao_Paulo' },
      holidays: { 'unit-1': ['2027-01-01'], 'unit-2': ['2027-01-01'] },
    });
    await expect(service.sync(user, { year: 2027 })).resolves.toEqual({ created: 2, skipped: 0, deletedByUser: 0 });
    expect(writer.createTableData.mock.calls.map((c) => c[2].data.sourceId)).toEqual(['unit-1:2027-01-01', 'unit-2:2027-01-01']);
  });

  it('unidade de outro dono ou apagada → 404, nada gravado', async () => {
    const { service, writer } = setup();
    await expect(service.sync(user, { unitId: 'unit-x', year: 2027 })).rejects.toBeInstanceOf(NotFoundError);
    expect(writer.createTableData).not.toHaveBeenCalled();
  });

  it('instância sem a tabela scheduleExceptions (rollout não rodou): nada a fazer', async () => {
    const { service, calendar } = setup({ noTable: true });
    await expect(service.sync(user, { year: 2027 })).resolves.toEqual({ created: 0, skipped: 0, deletedByUser: 0 });
    expect(calendar.holidaysFor).not.toHaveBeenCalled();
  });

  it('falha no meio: o que já foi gravado ainda chama o efeito, e o erro sobe', async () => {
    const { service, writer, effects } = setup();
    writer.createTableData.mockImplementationOnce(async () => ({ id: 'ok' })).mockRejectedValueOnce(new Error('boom'));
    await expect(service.sync(user, { unitId: 'unit-1', year: 2027 })).rejects.toThrow('boom');
    expect(effects.afterDataWrite).toHaveBeenCalledTimes(1);
  });
});
