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
      expect(r.fonte).toMatch(/^Lei (10\.(147|485)\/20(00|02)|13\.097\/2015) art\. \d+º?.*\((Lei-10(147|485)-20(00|02)-monofasico-.*|Lei-13097-2015-bebidas-frias)\.html\)$/);
      expect(r.prefixo).toMatch(/^\d{2,8}$/);
      for (const ex of r.exceto ?? []) expect(ex).toMatch(/^\d{8}$/);
    }
    expect(PIS_COFINS_MONOFASICO_NCM.length).toBeGreaterThan(80);
  });

  it('Lei 10.485 art. 1º na redação VIGENTE (Lei 12.973/2014): 73.09, 7310.29, 84.32/84.33 inteiras, 84.34–84.37, 8716.20.00 são monofásicos', () => {
    for (const ncm of ['73090010', '73102910', '76129012', '84248111', '84306990', '84321000', '84331100', '84341000', '84351000', '84361000', '84371000', '87162000']) {
      expect(findMonofasicoRule(ncm)?.fonte).toContain('Lei 10.485/2002 art. 1º');
    }
  });

  it('33.06 (higiene bucal) NÃO é monofásico — "3303.00 a 33.07, exceto na posição 33.06" (Lei 10.147 art. 1º, red. Lei 12.839/2013)', () => {
    expect(findMonofasicoRule('33061000')).toBeNull();
    expect(findMonofasicoRule('33071000')?.fonte).toContain('Lei 10.147');
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

  // ERRATA 2026-09-25 (correção da Fase 1, triagem do contador P5/item 8): o NCM decide; CST 04 e 02 com NCM fora
  // da tabela creditam com alerta (antes: MONOFASICO e UNKNOWN). CST 05..09 seguem mandando.
  it('classificação (item 11): NCM decide; CST 04/02 fora da tabela → TRIBUTADO + alerta; CST 05..09 da nota manda; sem CST = UNKNOWN', () => {
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '02', cstCofins: '02' })).toEqual({ classe: 'TRIBUTADO', motivo: expect.any(String), alerta: expect.stringContaining('CST 02') });
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '04', cstCofins: '04' })).toEqual({ classe: 'TRIBUTADO', motivo: expect.any(String), alerta: expect.stringContaining('CST 04') });
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '06', cstCofins: '06' }).classe).toBe('MONOFASICO');
    expect(classifyPisCofinsItem({ ncm: '33051000', cstPis: '01', cstCofins: '01' }).classe).toBe('MONOFASICO');
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '01', cstCofins: '01' }).classe).toBe('TRIBUTADO');
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: null, cstCofins: null }).classe).toBe('UNKNOWN');
    expect(classifyPisCofinsItem({ ncm: '', cstPis: '01', cstCofins: '01' }).classe).toBe('UNKNOWN');
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '49', cstCofins: '49' }).classe).toBe('UNKNOWN');
  });

  // Teste-guarda da Fase 1 (PLANO-POS-CONTADOR-2026-09-23, passo 1.6; instrumentado #379). NCM tirado da
  // transcrição `docs/accounting/fontes-oficiais/TRANSCRICAO-monofasico-bebidas-combustiveis-2026-09-25.md`, chave
  // `L13097-art14-IV` ("22.03" — cerveja de malte). CST 01 para isolar a TABELA. Verde desde a correção de 25/09.
  // Metade "combustível" BLOQUEADA: a lei lida não traz NCM (transcrição §B) — não se escreve NCM de memória.
  it('GAP C-2 — bebida fria (NCM 2203.00.00, Lei 13.097 art. 14 IV) com CST 01 → MONOFASICO (sem crédito)', () => {
    expect(classifyPisCofinsItem({ ncm: '22030000', cstPis: '01', cstCofins: '01' }).classe).toBe('MONOFASICO');
  });
});
