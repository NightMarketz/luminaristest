/**
 * NFE-DANFE-IBSCBS PR-2, item 13. Dois vetores oficiais:
 *  - MOC 7.0 Anexo II §2.1–§2.2 (`[MOC-DANFE-C128-VETOR]`): `09758364` → DV 48 e a sequência de larguras impressa no MOC;
 *  - NT Conjunta 2025.001 §6 (CNPJ alfanumérico): `5225AB83` → Start C, 52, 25, Code A, 'A', 'B', Code C, 83 e DV 30.
 * As larguras esperadas do vetor da NT saem da tabela do Anexo III.01 do MOC (a coluna de larguras da própria NT tem erros
 * de digitação — registrado na transcrição do dossiê `nfe-danfe-pr2`).
 */
import { barcodeChaveSvg, codewordsChave, codewordsHibridos, dvCode128, larguras } from '../code128';
import { ValidationError } from '../../errors';

describe('code128 — vetores oficiais', () => {
  it('MOC: 09758364 → 105, 9, 75, 83, 64; DV 48; larguras do §2.2', () => {
    const cw = codewordsHibridos('09758364');
    expect(cw).toEqual([105, 9, 75, 83, 64]);
    expect(dvCode128(cw)).toBe(48);
    expect(larguras(cw)).toBe('2112322212132412111142121114223131212331112');
  });

  // A NT se contradiz: o exemplo volta para C com só 2 dígitos ("83"), a regra 3 exige 4+. Segue a regra (dono, questionário
  // de 26/10: "Regras numeradas"); o vetor entra pelas palavras-código da própria NT e prova o DV e as larguras.
  it('NT Conjunta 2025.001: palavras-código do exemplo 5225AB83 → DV 30 e as larguras da tabela', () => {
    const cw = [105, 52, 25, 101, 33, 34, 99, 83];
    expect(dvCode128(cw)).toBe(30);
    // 105 · 52 · 25 · 101 · 33 · 34 · 99 · 83 · DV 30 · Stop, pela tabela do MOC Anexo III.01
    expect(larguras(cw)).toBe(
      ['211232', '213311', '321122', '311141', '111323', '131123', '113141', '114212', '212123', '2331112'].join(''),
    );
  });
});

describe('code128 — regras de troca da NT Conjunta 2025.001 §6', () => {
  it('ímpar antes de letra (regra 2): "123A" → 12 em C, Code A, 3 e A em A', () => {
    expect(codewordsHibridos('123A')).toEqual([105, 12, 101, 19, 33]);
  });

  it('em A, grupo ímpar de 4+ dígitos (regra 3): 1º dígito fica em A, depois Code C', () => {
    expect(codewordsHibridos('12A34567')).toEqual([105, 12, 101, 33, 19, 99, 45, 67]);
  });

  it('em A, grupo de menos de 4 dígitos fica em A — inclusive no fim (5225AB83: 8 e 3 em A, regra 3)', () => {
    expect(codewordsHibridos('12A3B')).toEqual([105, 12, 101, 33, 19, 34]);
    expect(codewordsHibridos('5225AB83')).toEqual([105, 52, 25, 101, 33, 34, 24, 19]);
  });
});

describe('codewordsChave / barcodeChaveSvg', () => {
  const NUMERICA = '35260911222333000181550010000123451482135790';
  const ALFA = '35260912ABC34501DE35550010000000011000000012';

  it('chave numérica de 44 dígitos ⇒ 128C puro: Start C + 22 pares', () => {
    const cw = codewordsChave(NUMERICA);
    expect(cw).toHaveLength(23);
    expect(cw.slice(1)).not.toContain(101);
  });

  it('chave com CNPJ alfanumérico ⇒ híbrido, volta para C nos 26 dígitos finais', () => {
    const cw = codewordsChave(ALFA);
    expect(cw).toContain(101);
    expect(cw).toContain(99);
    expect(cw.slice(-13)).toEqual([35, 55, 0, 10, 0, 0, 0, 1, 10, 0, 0, 0, 12]); // "35550010000000011000000012" em pares
  });

  it('entrada que não é chave de 44 posições ⇒ ValidationError', () => {
    expect(() => codewordsChave('123')).toThrow(ValidationError);
    expect(() => codewordsChave(`${NUMERICA}0`)).toThrow(ValidationError);
    expect(() => barcodeChaveSvg('3526091122233300018155001000012345148213579x')).toThrow(ValidationError);
  });

  it('SVG determinístico e sem texto', () => {
    const svg = barcodeChaveSvg(NUMERICA);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(barcodeChaveSvg(NUMERICA)).toBe(svg);
    expect(svg).not.toContain('<text');
  });
});
