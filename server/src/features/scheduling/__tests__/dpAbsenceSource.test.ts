/**
 * BE-INCR-ESCALA-BASE itens 43 e 44 — `DpAbsenceSourceAdapter`: os afastamentos do DP como `AbsenceRecord`, achando a
 * pessoa pelo `employeeRef`, com dublês dos serviços do DP (o caminho real está em `hrAbsence.integration.test.ts`).
 */
import { DP_LIST_LIMIT, DpAbsenceSourceAdapter, DpListTruncatedError, type DpAfastamentoReader, type DpVinculoReader } from '../adapters/DpAbsenceSourceAdapter';

type Vinculo = Awaited<ReturnType<DpVinculoReader['listVinculos']>>[number];
type Trabalhador = Awaited<ReturnType<DpVinculoReader['listTrabalhadores']>>[number];
type Afastamento = Awaited<ReturnType<DpAfastamentoReader['listAfastamentos']>>[number];

const vinculo = (id: string, trabalhadorId: string, unitId: string) => ({ id, trabalhadorId, unitId }) as Vinculo;
const trab = (id: string, employeeRef: string | null, removida = false) => ({ id, employeeRef, pessoaOperacionalRemovida: removida }) as Trabalhador;
const afast = (id: string, inicio: string, fim: string | null) => ({ id, inicio, fim }) as Afastamento;

function adapter(vs: Vinculo[], ts: Trabalhador[], as: Record<string, Afastamento[]>) {
  const listAfastamentos = jest.fn(async (_s: unknown, vinculoId: string) => as[vinculoId] ?? []);
  const port = new DpAbsenceSourceAdapter(
    { listVinculos: async () => vs, listTrabalhadores: async () => ts } as unknown as DpVinculoReader,
    { listAfastamentos } as unknown as DpAfastamentoReader,
  );
  return { port, listAfastamentos };
}

describe('DpAbsenceSourceAdapter (item 44)', () => {
  it('cada afastamento que toca a janela vira um registro com a pessoa operacional e a unidade do vínculo', async () => {
    const { port, listAfastamentos } = adapter([vinculo('v1', 't1', 'unit-1')], [trab('t1', 'emp-1')], {
      v1: [afast('a-dentro', '2027-02-01', '2027-02-10'), afast('a-aberto', '2026-12-01', null), afast('a-passado', '2026-01-01', '2026-01-31'), afast('a-futuro', '2028-06-01', null)],
    });
    await expect(port.absencesFor('u1', '2027-01-01', '2028-02-05')).resolves.toEqual([
      { sourceId: 'a-dentro', employeeRef: 'emp-1', unitId: 'unit-1', startDate: '2027-02-01', endDate: '2027-02-10' },
      { sourceId: 'a-aberto', employeeRef: 'emp-1', unitId: 'unit-1', startDate: '2026-12-01', endDate: null },
    ]);
    // O afastamento é lido no escopo da unidade do vínculo, do dono pedido.
    expect(listAfastamentos).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 'u1', unitId: 'unit-1' }), 'v1');
  });

  it('sem employeeRef ou com a pessoa removida (D-6): o registro vai com employeeRef null', async () => {
    const { port } = adapter([vinculo('v1', 't1', 'u'), vinculo('v2', 't2', 'u')], [trab('t1', null), trab('t2', 'emp-2', true)], {
      v1: [afast('a1', '2027-01-02', '2027-01-03')],
      v2: [afast('a2', '2027-01-02', '2027-01-03')],
    });
    const out = await port.absencesFor('u1', '2027-01-01', '2027-12-31');
    expect(out.map((r) => [r.sourceId, r.employeeRef])).toEqual([
      ['a1', null],
      ['a2', null],
    ]);
  });

  it('lista do DP no teto (truncada): falha alto, nunca devolve a lista parcial', async () => {
    const many = Array.from({ length: DP_LIST_LIMIT }, (_, i) => vinculo(`v${i}`, 't', 'u'));
    const { port } = adapter(many, [], {});
    await expect(port.absencesFor('u1', '2027-01-01', '2027-12-31')).rejects.toBeInstanceOf(DpListTruncatedError);
  });
});
