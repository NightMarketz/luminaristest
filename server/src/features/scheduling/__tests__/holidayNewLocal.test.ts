/**
 * BE-INCR-ESCALA-BASE item 42 — feriado municipal novo no `LegalParameter` depois do sync: o próximo sync cria só o que
 * falta. O adaptador BR é o real (`BrHolidayCalendarAdapter` + `isHoliday`); a fotografia do `LegalParameter` e o
 * repositório da escala são dublês (a costura pelo motor real está em `holidaySync.integration.test.ts`).
 */
import type { UserContext } from '../../../lib/authUtils';
import type { LinhaLegal } from '../../legalParameters/models/legalParameter';
import { BrHolidayCalendarAdapter } from '../paises/br/adapters/BrHolidayCalendarAdapter';
import { SchedulingPolicy } from '../policies/SchedulingPolicy';
import type { ISchedulingRowRepository, ProjectionRow } from '../repositories/ISchedulingRowRepository';
import { HolidayExceptionService } from '../services/HolidayExceptionService';

const linha = (tabela: string, chave: string, discriminador: string | null): LinhaLegal => ({
  id: `${tabela}-${discriminador ?? 'BR'}-${chave}`,
  tabela,
  chave,
  discriminador,
  valorInt: null,
  valorTexto: discriminador ? 'FIXO' : null,
  valorJson: null,
  fonte: 'teste',
  vigenteDesde: '2024-01-01',
  vigenteAte: null,
  status: 'PUBLISHED',
  supersedesId: null,
});

it('item 42: a linha FERIADO_LOCAL nova do município entra no próximo sync, e só ela', async () => {
  // A tabela FERIADO_LOCAL vazia é erro (fail-closed, `linhasVigentesDaTabela`): começa com o 09/07 da UF de SP.
  const feriados: LinhaLegal[] = [linha('FERIADO_NACIONAL', '01-01', null), linha('FERIADO_NACIONAL', '12-25', null), linha('FERIADO_LOCAL', '07-09', '35')];
  const store: ProjectionRow[] = [];
  const rows = {
    unitState: async () => 'live',
    tableId: async () => 'exc',
    liveUnitIds: async () => ['unit-1'],
    unitTimeZoneSetting: async () => 'America/Sao_Paulo',
    projectionRows: async () => store.map((r) => ({ ...r })),
  } as unknown as ISchedulingRowRepository;
  const writer = {
    createTableData: jest.fn(async (_u: UserContext, _t: string, dto: { data: Record<string, unknown> }, _o: { isSystem: boolean }) => {
      store.push({ id: `e${store.length}`, sourceId: String(dto.data.sourceId), deleted: false, data: dto.data });
      return { id: `e${store.length}` };
    }),
    updateTableData: jest.fn(async () => ({})),
  };
  const adapter = new BrHolidayCalendarAdapter({ fotografia: async () => feriados } as never, { findByScope: async () => ({ codMun: '3550308' }) } as never);
  const service = new HolidayExceptionService(rows, writer, { afterDataWrite: jest.fn() }, adapter, new SchedulingPolicy(), 'America/Sao_Paulo');
  const user = { userId: 'u1', id: 'u1' } as UserContext;

  await expect(service.sync(user, { unitId: 'unit-1', year: 2027 })).resolves.toEqual({ created: 3, skipped: 0, deletedByUser: 0 });

  // Publicado depois: aniversário da cidade de São Paulo (25/01), na tabela FERIADO_LOCAL do município.
  feriados.push(linha('FERIADO_LOCAL', '01-25', '3550308'));
  await expect(service.sync(user, { unitId: 'unit-1', year: 2027 })).resolves.toEqual({ created: 1, skipped: 3, deletedByUser: 0 });
  expect(writer.createTableData).toHaveBeenCalledTimes(4);
  expect(writer.createTableData.mock.calls[3][2].data.sourceId).toBe('unit-1:2027-01-25');
});
