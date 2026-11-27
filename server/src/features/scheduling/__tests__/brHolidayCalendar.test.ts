/**
 * BE-INCR-ESCALA-BASE itens 37 e 38 — o adaptador BR da porta `HolidayCalendarPort`: a fotografia `FERIADO_NACIONAL` +
 * `FERIADO_LOCAL` e o município da unidade (`FiscalProfile.codMun`), pela regra `isHoliday` dos pacotes.
 */
import type { LinhaLegal } from '../../legalParameters/models/legalParameter';
import { BrHolidayCalendarAdapter } from '../paises/br/adapters/BrHolidayCalendarAdapter';
import type { HolidayCalendarPort } from '../ports/HolidayCalendarPort';

const linha = (tabela: string, chave: string, discriminador: string | null, valorTexto: string | null = null): LinhaLegal => ({
  id: `${tabela}-${discriminador ?? 'BR'}-${chave}`,
  tabela,
  chave,
  discriminador,
  valorInt: null,
  valorTexto,
  valorJson: null,
  fonte: 'teste',
  vigenteDesde: '2024-01-01',
  vigenteAte: null,
  status: 'PUBLISHED',
  supersedesId: null,
});

const FERIADOS: LinhaLegal[] = [
  linha('FERIADO_NACIONAL', '01-01', null),
  linha('FERIADO_NACIONAL', '11-20', null),
  linha('FERIADO_LOCAL', '07-09', '35', 'FIXO'), // UF de SP
  linha('FERIADO_LOCAL', '01-25', '3550308', 'FIXO'), // São Paulo capital
  linha('FERIADO_LOCAL', 'PASCOA-2', '3550308', 'PASCOA'), // Sexta-feira da Paixão
];

function adapter(codMun: string | null, feriados: LinhaLegal[] = FERIADOS) {
  const fotografia = jest.fn(async () => feriados);
  const findByScope = jest.fn(async () => (codMun ? { codMun } : null));
  // Os dublês têm só o que o adaptador lê; o resto do tipo de retorno não importa aqui.
  const port: HolidayCalendarPort = new BrHolidayCalendarAdapter({ fotografia } as never, { findByScope } as never);
  return { port, fotografia, findByScope };
}

describe('BrHolidayCalendarAdapter (itens 37/38)', () => {
  it('unidade em São Paulo capital: nacional + estadual (UF 35) + municipal, com a data móvel da Páscoa (2027: 26/03)', async () => {
    const { port, findByScope } = adapter('3550308');
    await expect(port.holidaysFor('u1', 'unit-1', 2027)).resolves.toEqual([
      '2027-01-01',
      '2027-01-25',
      '2027-03-26',
      '2027-07-09',
      '2027-11-20',
    ]);
    // O perfil fiscal é lido pela unidade pedida, do dono pedido.
    expect(findByScope).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 'u1', unitId: 'unit-1' }));
  });

  it('outro município da mesma UF: estadual sim, municipal da capital não', async () => {
    const { port } = adapter('3509502'); // Campinas
    await expect(port.holidaysFor('u1', 'unit-1', 2027)).resolves.toEqual(['2027-01-01', '2027-07-09', '2027-11-20']);
  });

  it('unidade sem município cadastrado: só o nacional', async () => {
    const { port } = adapter(null);
    await expect(port.holidaysFor('u1', 'unit-1', 2027)).resolves.toEqual(['2027-01-01', '2027-11-20']);
  });

  it('ano par: os domingos de eleição entram, como na regra isHoliday (2026: 04/10 e 25/10)', async () => {
    const { port } = adapter(null);
    const out = await port.holidaysFor('u1', 'unit-1', 2026);
    expect(out).toEqual(expect.arrayContaining(['2026-10-04', '2026-10-25']));
  });

  it('ano sem nenhuma linha nacional vigente: erro, nunca lista vazia (o sync não grava "sem feriado")', async () => {
    const { port } = adapter(null);
    await expect(port.holidaysFor('u1', 'unit-1', 2023)).rejects.toThrow(/Sem linha vigente de FERIADO_NACIONAL/);
  });
});
