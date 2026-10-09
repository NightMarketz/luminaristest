/**
 * X7 Fase C PR-2 — função pura do ISS por competência (BRIEF C itens 13, 15, 16, 19; F-TC-1/2/4 a).
 */
import { agregarIssPorCompetencia, IssLinhaSchema, municipioDoPayload, type IssDocInput } from '../issCompetencia';

const SP = '3550308';
const RJ = '3304557';

function doc(over: Partial<IssDocInput>): IssDocInput {
  return {
    dCompet: '2026-03-15', municipioIbge: SP, tpRetISSQN: 1, vServCents: 10000n, baseIssCents: 10000n, vIssCents: 500n,
    divergente: false, ...over,
  };
}

describe('agregarIssPorCompetencia (item 13)', () => {
  it('teste-tabela: competência × município × retido; soma e conta; ordem competência, município, próprio→retido', () => {
    const linhas = agregarIssPorCompetencia([
      doc({}),
      doc({ dCompet: '2026-03-31', vServCents: 20000n, baseIssCents: 20000n, vIssCents: 1000n }),
      doc({ tpRetISSQN: 2, vServCents: 7000n, baseIssCents: 7000n, vIssCents: 350n }),
      doc({ municipioIbge: RJ }),
      doc({ dCompet: '2026-02-28' }),
    ]);
    expect(linhas).toEqual([
      { competencia: '2026-02', municipioIbge: SP, retido: false, documentos: 1, documentosSemIss: 0, divergentes: 0, vServCents: '10000', baseIssCents: '10000', vIssCents: '500' },
      { competencia: '2026-03', municipioIbge: RJ, retido: false, documentos: 1, documentosSemIss: 0, divergentes: 0, vServCents: '10000', baseIssCents: '10000', vIssCents: '500' },
      { competencia: '2026-03', municipioIbge: SP, retido: false, documentos: 2, documentosSemIss: 0, divergentes: 0, vServCents: '30000', baseIssCents: '30000', vIssCents: '1500' },
      { competencia: '2026-03', municipioIbge: SP, retido: true, documentos: 1, documentosSemIss: 0, divergentes: 0, vServCents: '7000', baseIssCents: '7000', vIssCents: '350' },
    ]);
  });

  it('item 15: retido e próprio da mesma competência/município nunca somam na mesma linha', () => {
    const linhas = agregarIssPorCompetencia([doc({ tpRetISSQN: 1 }), doc({ tpRetISSQN: 2 })]);
    expect(linhas.map((l) => [l.retido, l.vIssCents])).toEqual([[false, '500'], [true, '500']]);
  });

  it('item 16 (F-TC-2 a): nota sem vIss/baseIss soma 0 e conta em documentosSemIss', () => {
    const [l] = agregarIssPorCompetencia([doc({}), doc({ vIssCents: null, baseIssCents: null })]);
    expect(l).toMatchObject({ documentos: 2, documentosSemIss: 1, vServCents: '20000', baseIssCents: '10000', vIssCents: '500' });
  });

  it('item 19: não aplica alíquota — base sem vIss não vira ISS', () => {
    const [l] = agregarIssPorCompetencia([doc({ baseIssCents: 100000n, vIssCents: null })]);
    expect(l.vIssCents).toBe('0');
  });

  it('F-TC-4 (a): divergente entra na soma e é contado', () => {
    const [l] = agregarIssPorCompetencia([doc({}), doc({ divergente: true })]);
    expect(l).toMatchObject({ documentos: 2, divergentes: 1, vIssCents: '1000' });
  });

  it('competência por fatia da string (sem fuso): 2026-03-31 fica em março', () => {
    expect(agregarIssPorCompetencia([doc({ dCompet: '2026-03-31' })])[0].competencia).toBe('2026-03');
  });

  it('valor acima de 2^53 soma exato', () => {
    const [l] = agregarIssPorCompetencia([doc({ vIssCents: 9007199254740993n }), doc({ vIssCents: 1n })]);
    expect(l.vIssCents).toBe('9007199254740994');
  });

  it('entrada vazia ⇒ nenhuma linha; entrada fora do contrato ⇒ erro', () => {
    expect(agregarIssPorCompetencia([])).toEqual([]);
    expect(() => agregarIssPorCompetencia([doc({ municipioIbge: '123' })])).toThrow();
  });
});

describe('contratos', () => {
  it('IssLinhaSchema é strict', () => {
    const ok = { competencia: '2026-03', municipioIbge: SP, retido: false, documentos: 1, documentosSemIss: 0, divergentes: 0, vServCents: '1', baseIssCents: '1', vIssCents: '1' };
    expect(IssLinhaSchema.safeParse(ok).success).toBe(true);
    expect(IssLinhaSchema.safeParse({ ...ok, total: '2' }).success).toBe(false);
  });

  it('municipioDoPayload lê infDPS.serv.locPrest.cLocPrestacao (F-TC-1 a); ausente ⇒ null', () => {
    expect(municipioDoPayload(JSON.stringify({ infDPS: { serv: { locPrest: { cLocPrestacao: SP } } } }))).toBe(SP);
    expect(municipioDoPayload(JSON.stringify({ infDPS: {} }))).toBeNull();
  });
});
