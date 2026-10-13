import { REFERENCIAL_2025_CANONICO } from '../kits/_shared/referencial2025Canonico';
import { BEAUTY_SALON_KIT_V2 } from '../kits/beautySalon/kit.v2';
import { AESTHETIC_CLINIC_KIT_V2 } from '../kits/aestheticClinic/kit.v2';

/**
 * BE-INCR-KIT-SETOR-EMENDA-1, PR-K1, item 1 — o referencial compartilhado é o do salão v2 (publicado, não se edita):
 * o deep-equal trava a divergência sem tocar no publicado. Item 2 — a clínica v2 usa o compartilhado nos 2 regimes.
 */
describe('REFERENCIAL_2025_CANONICO (PR-K1, itens 1–2)', () => {
  it('é deep-equal às entradas 2025 do salão v2 (Presumido e Real)', () => {
    expect(BEAUTY_SALON_KIT_V2.referential.map((b) => b.regime)).toEqual(['PRESUMIDO', 'REAL']);
    for (const bloco of BEAUTY_SALON_KIT_V2.referential) expect(bloco.entries).toStrictEqual([...REFERENCIAL_2025_CANONICO]);
  });

  it('a clínica v2 = Presumido e Real 2025 com as 15 entradas do compartilhado', () => {
    expect(AESTHETIC_CLINIC_KIT_V2.referential.map((b) => [b.regime, b.mappingVersion])).toEqual([
      ['PRESUMIDO', '2025'],
      ['REAL', '2025'],
    ]);
    for (const bloco of AESTHETIC_CLINIC_KIT_V2.referential) {
      expect(bloco.entries).toHaveLength(15);
      expect(bloco.entries).toStrictEqual([...REFERENCIAL_2025_CANONICO]);
    }
  });
});
