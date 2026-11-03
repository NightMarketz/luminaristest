/**
 * Aritmética do Bloco F (C8 emenda 3.2, E16/E21b) — tabela do E16 linha a linha, cruzamento do zero e baixa.
 */
import { blocoFMoves, type BlocoFInput } from '../lalurBlocoF';

const bem = (over: Partial<BlocoFInput>): BlocoFInput => ({ assetId: 'a', fiscalQuotaCents: 0n, bookQuotaCents: 0n, priorDiffCents: 0n, disposedInPeriod: false, ...over });
const mv = (i: BlocoFInput) => blocoFMoves(i).map((m) => [m.codigo, m.conta, m.valorCents]);

describe('blocoFMoves — tabela do E16', () => {
  it('contábil > fiscal (constitui) ⇒ 86 / 1071', () => {
    expect(mv(bem({ fiscalQuotaCents: 300n, bookQuotaCents: 450n }))).toEqual([['86', '1071', 150n]]);
  });
  it('contábil acabou, fiscal continua (realiza 1071) ⇒ 161 / 1071', () => {
    expect(mv(bem({ priorDiffCents: -900n, fiscalQuotaCents: 300n }))).toEqual([['161', '1071', 300n]]);
  });
  it('contábil < fiscal (constitui) ⇒ 161 / 2210', () => {
    expect(mv(bem({ fiscalQuotaCents: 300n, bookQuotaCents: 200n }))).toEqual([['161', '2210', 100n]]);
  });
  it('fiscal atingiu o custo, contábil continua (§ 5º, realiza 2210) ⇒ 86 / 2210', () => {
    expect(mv(bem({ priorDiffCents: 500n, bookQuotaCents: 120n }))).toEqual([['86', '2210', 120n]]);
  });
  it('baixa com saldo 2210 ⇒ 91.01 / 2210 pelo saldo final do bem; com saldo 1071 ⇒ 161 / 1071', () => {
    expect(mv(bem({ priorDiffCents: 500n, fiscalQuotaCents: 30n, bookQuotaCents: 10n, disposedInPeriod: true }))).toEqual([
      ['161', '2210', 20n],
      ['91.01', '2210', 520n],
    ]);
    expect(mv(bem({ priorDiffCents: -70n, disposedInPeriod: true }))).toEqual([['161', '1071', 70n]]);
  });
  it('E21b: diferença que cruza o zero do bem realiza um lado e constitui o outro na MESMA linha', () => {
    expect(mv(bem({ priorDiffCents: -100n, fiscalQuotaCents: 400n, bookQuotaCents: 150n }))).toEqual([
      ['161', '1071', 100n],
      ['161', '2210', 150n],
    ]);
    expect(mv(bem({ priorDiffCents: 40n, bookQuotaCents: 100n }))).toEqual([
      ['86', '2210', 40n],
      ['86', '1071', 60n],
    ]);
  });
  it('E20: diferença 0 sem baixa, ou baixa com saldo zerado ⇒ nada', () => {
    expect(mv(bem({ fiscalQuotaCents: 300n, bookQuotaCents: 300n, priorDiffCents: 10n }))).toEqual([]);
    expect(mv(bem({ priorDiffCents: 50n, bookQuotaCents: 50n, disposedInPeriod: true }))).toEqual([['86', '2210', 50n]]);
  });
});
