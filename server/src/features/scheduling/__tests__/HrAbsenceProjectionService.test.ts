/**
 * BE-INCR-ESCALA-BASE item 45 — `HrAbsenceProjectionService.reconcile` com dublês estreitos (porta do DP, repositório da
 * escala, motor). O caminho real (DP → reconcile → gate da agenda) está em `hrAbsence.integration.test.ts`.
 */
import type { UserContext } from '../../../lib/authUtils';
import type { AbsenceRecord } from '../ports/AbsenceSourcePort';
import type { ISchedulingRowRepository, ProjectionRow } from '../repositories/ISchedulingRowRepository';
import { HrAbsenceProjectionService } from '../services/HrAbsenceProjectionService';

const user = { userId: 'u1', id: 'u1' } as UserContext;
const TODAY = '2027-03-01';

function setup(initial: AbsenceRecord[], opts: { deadUnits?: string[]; noTable?: boolean } = {}) {
  let absences = initial;
  const store: ProjectionRow[] = [];
  const rows = {
    tableId: async () => (opts.noTable ? null : 'exc'),
    unitState: async (_o: string, id: string) => ((opts.deadUnits ?? []).includes(id) ? 'deleted' : 'live'),
    unitTimeZone: async () => 'America/Sao_Paulo',
    projectionRows: async () => store.map((r) => ({ ...r, data: { ...r.data } })),
  } as unknown as ISchedulingRowRepository;
  let n = 0;
  const writer = {
    createTableData: jest.fn(async (_u: UserContext, _t: string, dto: { data: Record<string, unknown> }, _o: { isSystem: boolean }) => {
      const id = `x${++n}`;
      store.push({ id, sourceId: String(dto.data.sourceId), deleted: false, data: dto.data });
      return { id };
    }),
    updateTableData: jest.fn(async (_u: UserContext, id: string, dto: { data: Record<string, unknown> }, _o: { isSystem: boolean }) => {
      const r = store.find((s) => s.id === id)!;
      r.data = { ...r.data, ...dto.data };
      return {};
    }),
  };
  const deleter = {
    deleteAsSystem: jest.fn(async (id: string) => {
      store.find((s) => s.id === id)!.deleted = true;
    }),
  };
  const effects = { afterDataWrite: jest.fn() };
  const service = new HrAbsenceProjectionService(rows, writer, deleter, effects, { absencesFor: async () => absences });
  return { service, store, writer, deleter, effects, setAbsences: (a: AbsenceRecord[]) => (absences = a) };
}

const abs = (sourceId: string, startDate: string, endDate: string | null, employeeRef: string | null = 'emp-1', unitId = 'unit-1'): AbsenceRecord => ({
  sourceId,
  employeeRef,
  unitId,
  startDate,
  endDate,
});

describe('HrAbsenceProjectionService.reconcile (item 45)', () => {
  it('cria a exceção ABSENCE/HR da pessoa, dia inteiro no fuso da unidade, como sistema', async () => {
    const { service, writer, effects } = setup([abs('a1', '2027-03-10', '2027-03-12')]);
    await expect(service.reconcile(user, TODAY)).resolves.toMatchObject({ created: 1, updated: 0, deleted: 0 });
    expect(writer.createTableData).toHaveBeenCalledWith(
      user,
      'exc',
      {
        data: {
          employeeId: 'emp-1',
          unitId: 'unit-1',
          kind: 'ABSENCE',
          origin: 'HR',
          startAt: '2027-03-10T03:00:00.000Z',
          endAt: '2027-03-13T03:00:00.000Z', // fim inclusive: até o começo do dia seguinte
          sourceType: 'DP_ABSENCE',
          sourceId: 'a1',
        },
      },
      { isSystem: true },
    );
    expect(effects.afterDataWrite).toHaveBeenCalledWith('u1');
  });

  it('idempotente: a 2ª rodada não escreve nem chama o efeito', async () => {
    const { service, writer, effects } = setup([abs('a1', '2027-03-10', '2027-03-12')]);
    await service.reconcile(user, TODAY);
    effects.afterDataWrite.mockClear();
    await expect(service.reconcile(user, TODAY)).resolves.toMatchObject({ created: 0, updated: 0, deleted: 0, unchanged: 1 });
    expect(writer.createTableData).toHaveBeenCalledTimes(1);
    expect(writer.updateTableData).not.toHaveBeenCalled();
    expect(effects.afterDataWrite).not.toHaveBeenCalled();
  });

  it('afastamento sem fim vai até hoje + 400 dias e é renovado quando o dia anda', async () => {
    const { service, store } = setup([abs('a1', '2027-02-20', null)]);
    await service.reconcile(user, TODAY);
    expect(store[0].data.endAt).toBe('2028-04-05T03:00:00.000Z'); // 01/03/2027 + 400 = 04/04/2028, até o fim do dia
    await expect(service.reconcile(user, '2027-03-02')).resolves.toMatchObject({ updated: 1 });
    expect(store[0].data.endAt).toBe('2028-04-06T03:00:00.000Z');
  });

  it('o DP mudou as datas → atualiza; o afastamento saiu do DP → apaga pelo repositório', async () => {
    const { service, store, deleter, setAbsences } = setup([abs('a1', '2027-03-10', '2027-03-12'), abs('a2', '2027-04-01', '2027-04-02')]);
    await service.reconcile(user, TODAY);
    setAbsences([abs('a1', '2027-03-10', '2027-03-15')]);
    await expect(service.reconcile(user, TODAY)).resolves.toMatchObject({ created: 0, updated: 1, deleted: 1 });
    expect(store.find((r) => r.sourceId === 'a1')?.data.endAt).toBe('2027-03-16T03:00:00.000Z');
    expect(deleter.deleteAsSystem).toHaveBeenCalledWith(store.find((r) => r.sourceId === 'a2')!.id);
  });

  it('vínculo sem employeeRef é pulado e contado; unidade apagada também', async () => {
    const { service, writer } = setup([abs('a1', '2027-03-10', '2027-03-12', null), abs('a2', '2027-03-10', '2027-03-12', 'emp-2', 'unit-gone')], { deadUnits: ['unit-gone'] });
    await expect(service.reconcile(user, TODAY)).resolves.toMatchObject({ created: 0, skippedNoEmployeeRef: 1, skippedUnitNotLive: 1 });
    expect(writer.createTableData).not.toHaveBeenCalled();
  });

  it('a projeção que terminou antes da janela fica como está (o passado não se reconcilia)', async () => {
    const { service, store, deleter, setAbsences } = setup([abs('old', '2027-02-01', '2027-02-05')]);
    await service.reconcile(user, '2027-02-01');
    setAbsences([]); // o DP não devolve mais (fora da janela de hoje)
    await expect(service.reconcile(user, TODAY)).resolves.toMatchObject({ deleted: 0 });
    expect(deleter.deleteAsSystem).not.toHaveBeenCalled();
    expect(store[0].deleted).toBe(false);
  });

  it('instância sem a tabela scheduleExceptions: nada a fazer', async () => {
    const { service } = setup([abs('a1', '2027-03-10', '2027-03-12')], { noTable: true });
    await expect(service.reconcile(user, TODAY)).resolves.toMatchObject({ created: 0 });
  });
});
