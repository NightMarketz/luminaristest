/** BE-INCR-DP-PONTE-RAZAO item 36 — folha do fator r pela leitura de caixa (F-PNT-7 b). */
import fc from 'fast-check';
import { FALTA_RECOLHIMENTO_F5, folhaFatorRDoMes } from '../folhaFatorR';

describe('item 36 — folhaFatorRDoMes', () => {
  it('sem recolhimento (adaptador nulo até o F5): incompleta, com o que falta, e só a remuneração paga', () => {
    expect(folhaFatorRDoMes({ mes: '2026-03', remuneracaoPagaCents: 300_000n, recolhimento: null, cppForaDoDas: false })).toEqual({
      mes: '2026-03',
      folhaCents: 300_000n,
      origem: 'DP',
      completa: false,
      falta: FALTA_RECOLHIMENTO_F5,
    });
  });

  it('com recolhimento, fora do Anexo IV: paga + FGTS; a CPP (dentro do DAS) não entra', () => {
    const r = folhaFatorRDoMes({ mes: '2026-03', remuneracaoPagaCents: 300_000n, recolhimento: { fgtsCents: 24_000n, cppCents: 60_000n }, cppForaDoDas: false });
    expect(r).toMatchObject({ folhaCents: 324_000n, completa: true, falta: null });
  });

  it('com recolhimento e Anexo IV: paga + FGTS + CPP recolhida fora do DAS (A-2 leitura 1)', () => {
    const r = folhaFatorRDoMes({ mes: '2026-03', remuneracaoPagaCents: 300_000n, recolhimento: { fgtsCents: 24_000n, cppCents: 60_000n }, cppForaDoDas: true });
    expect(r.folhaCents).toBe(384_000n);
  });

  it('remuneração paga negativa é erro de programação', () => {
    expect(() => folhaFatorRDoMes({ mes: '2026-03', remuneracaoPagaCents: -1n, recolhimento: null, cppForaDoDas: false })).toThrow(RangeError);
  });

  it('propriedade: a folha nunca é menor que a remuneração paga, e só fica completa com recolhimento', () => {
    const big = fc.bigInt({ min: 0n, max: 10n ** 12n });
    fc.assert(
      fc.property(big, fc.option(fc.record({ fgtsCents: big, cppCents: big }), { nil: null }), fc.boolean(), (paga, rec, anexoIv) => {
        const r = folhaFatorRDoMes({ mes: '2026-03', remuneracaoPagaCents: paga, recolhimento: rec, cppForaDoDas: anexoIv });
        return r.folhaCents >= paga && r.completa === (rec !== null) && (r.falta === null) === r.completa;
      }),
    );
  });
});
