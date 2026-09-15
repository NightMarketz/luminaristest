import {
  PIS_COFINS_MONOFASICO_NCM,
  classifyPisCofinsItem,
  findMonofasicoRule,
  normalizeNcm,
} from '../pisCofinsMonofasicoNcm';

/** X6 F-X6-7 (a) — guarda da transcrição: toda regra cita lei + artigo do MANIFEST; prefixos numéricos. */
describe('PIS_COFINS_MONOFASICO_NCM — guarda da transcrição', () => {
  it('toda entrada cita a lei, o artigo e o arquivo do corpus; prefixo só dígitos (2–8)', () => {
    for (const r of PIS_COFINS_MONOFASICO_NCM) {
      expect(r.fonte).toMatch(/^Lei 10\.(147|485)\/20(00|02) art\. \d+º.*\(Lei-10(147|485)-20(00|02)-monofasico-.*\.html\)$/);
      expect(r.prefixo).toMatch(/^\d{2,8}$/);
      for (const ex of r.exceto ?? []) expect(ex).toMatch(/^\d{8}$/);
    }
    expect(PIS_COFINS_MONOFASICO_NCM.length).toBeGreaterThan(80);
  });

  it('exceções da lei valem: 30.03 é monofásico exceto 3003.90.56; 30.04 exceto 3004.90.46', () => {
    expect(findMonofasicoRule('30039011')?.prefixo).toBe('3003');
    expect(findMonofasicoRule('30039056')).toBeNull();
    expect(findMonofasicoRule('30049046')).toBeNull();
    expect(findMonofasicoRule('30049099')?.prefixo).toBe('3004');
  });

  it('normalizeNcm: pontos/espaços fora; 8 dígitos ou null', () => {
    expect(normalizeNcm('3305.10.00')).toBe('33051000');
    expect(normalizeNcm('3305')).toBeNull();
    expect(normalizeNcm('')).toBeNull();
  });

  it('classificação (item 11): CST 04..09 da nota manda; tabela manda sobre CST 01; sem CST = UNKNOWN', () => {
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '04', cstCofins: '04' }).classe).toBe('MONOFASICO');
    expect(classifyPisCofinsItem({ ncm: '33051000', cstPis: '01', cstCofins: '01' }).classe).toBe('MONOFASICO');
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '01', cstCofins: '01' }).classe).toBe('TRIBUTADO');
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: null, cstCofins: null }).classe).toBe('UNKNOWN');
    expect(classifyPisCofinsItem({ ncm: '', cstPis: '01', cstCofins: '01' }).classe).toBe('UNKNOWN');
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '49', cstCofins: '49' }).classe).toBe('UNKNOWN');
  });
});
