/**
 * BE-INCR-DP-F0-F1 itens 3 e 4 — vigência por data de efeito e por competência (fast-check).
 */
import fc from 'fast-check';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../../../accounting/models/dates';
import { CompetenciaSchema, proxima, type Competencia } from '../competencia';
import {
  ativaEm,
  semSobreposicao,
  sobrepoe,
  sobrepoeCompetencia,
  versaoVigente,
  vigenteEm,
  VigenciaCompetenciaSchema,
  VigenciaSchema,
  VigenciaSobrepostaError,
  type Vigencia,
  type VigenciaCompetencia,
} from '../vigencia';

const BASE = dayNumberFromDateOnly('2026-01-01');
// Janela curta (60 dias) para as vigências se cruzarem com frequência.
const diaArb = fc.integer({ min: 0, max: 60 });
const vigenciaArb: fc.Arbitrary<Vigencia> = fc
  .tuple(diaArb, fc.option(fc.integer({ min: 0, max: 30 }), { nil: null }))
  .map(([ini, dur]) => ({
    vigenteDesde: dateOnlyFromDayNumber(BASE + ini),
    vigenteAte: dur === null ? null : dateOnlyFromDayNumber(BASE + ini + dur),
  }));

const competencias: Competencia[] = (() => {
  const out: Competencia[] = [];
  let c = CompetenciaSchema.parse('2026-01');
  for (let i = 0; i < 24; i++, c = proxima(c)) out.push(c);
  return out;
})();
const vigCompArb: fc.Arbitrary<VigenciaCompetencia> = fc
  .tuple(fc.integer({ min: 0, max: 18 }), fc.option(fc.integer({ min: 0, max: 5 }), { nil: null }))
  .map(([ini, dur]) => ({
    competenciaInicio: competencias[ini],
    competenciaFim: dur === null ? null : competencias[ini + dur],
  }));

describe('vigência por data de efeito (item 3)', () => {
  it('sobrepoe é simétrica', () => {
    fc.assert(fc.property(vigenciaArb, vigenciaArb, (a, b) => expect(sobrepoe(a, b)).toBe(sobrepoe(b, a))));
  });

  it('semSobreposicao(vs) ⇔ nenhuma data tem duas versões vigentes', () => {
    fc.assert(
      fc.property(fc.array(vigenciaArb, { maxLength: 5 }), (vs) => {
        let algumaDataDupla = false;
        // Depois do dia 91 só as vigências abertas cobrem; o dia 92 representa todas as datas seguintes.
        for (let d = 0; d <= 92 && !algumaDataDupla; d++) {
          const data = dateOnlyFromDayNumber(BASE + d);
          if (vs.filter((v) => vigenteEm(v, data)).length > 1) algumaDataDupla = true;
        }
        expect(semSobreposicao(vs)).toBe(!algumaDataDupla);
      }),
    );
  });

  it('versaoVigente devolve a única que cobre, null sem nenhuma, e lança com duas', () => {
    const a = { id: 'a', vigenteDesde: '2026-01-01', vigenteAte: '2026-01-31' };
    const b = { id: 'b', vigenteDesde: '2026-02-01', vigenteAte: null };
    expect(versaoVigente([a, b], '2026-01-31')?.id).toBe('a');
    expect(versaoVigente([a, b], '2026-02-01')?.id).toBe('b');
    expect(versaoVigente([a, b], '2025-12-31')).toBeNull();
    const c = { id: 'c', vigenteDesde: '2026-01-31', vigenteAte: null };
    expect(() => versaoVigente([a, c], '2026-01-31')).toThrow(VigenciaSobrepostaError);
  });

  it('o schema recusa data fora do calendário e fim antes do início', () => {
    expect(VigenciaSchema.safeParse({ vigenteDesde: '2027-02-30', vigenteAte: null }).success).toBe(false);
    expect(VigenciaSchema.safeParse({ vigenteDesde: '2027-02-10', vigenteAte: '2027-02-09' }).success).toBe(false);
    expect(VigenciaSchema.safeParse({ vigenteDesde: '2027-02-10', vigenteAte: '2027-02-10' }).success).toBe(true);
    expect(VigenciaSchema.safeParse({ vigenteDesde: '2027-02-10', vigenteAte: null, extra: 1 }).success).toBe(false);
  });
});

describe('vigência por competência (item 4)', () => {
  it('sobrepoeCompetencia é simétrica', () => {
    fc.assert(
      fc.property(vigCompArb, vigCompArb, (a, b) => expect(sobrepoeCompetencia(a, b)).toBe(sobrepoeCompetencia(b, a))),
    );
  });

  it('sem sobreposição dois a dois ⇔ nenhuma competência tem duas ativações', () => {
    fc.assert(
      fc.property(fc.array(vigCompArb, { maxLength: 5 }), (vs) => {
        const doisADois = vs.every((a, i) => vs.every((b, j) => i >= j || !sobrepoeCompetencia(a, b)));
        const algumaDupla = competencias.some((c) => vs.filter((v) => ativaEm(v, c)).length > 1);
        expect(doisADois).toBe(!algumaDupla);
      }),
    );
  });

  it('o schema recusa competência inválida e fim antes do início', () => {
    expect(VigenciaCompetenciaSchema.safeParse({ competenciaInicio: '2027-13', competenciaFim: null }).success).toBe(false);
    expect(VigenciaCompetenciaSchema.safeParse({ competenciaInicio: '2027-03', competenciaFim: '2027-02' }).success).toBe(
      false,
    );
    expect(VigenciaCompetenciaSchema.safeParse({ competenciaInicio: '2027-03', competenciaFim: '2027-03' }).success).toBe(true);
  });
});
