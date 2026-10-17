import {
  classifyPisCofinsItem,
  findMonofasicoRule,
  normalizeNcm,
} from '../pisCofinsMonofasicoNcm';

import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_LP9_PC, TABELA_ITEM_SEMENTE, legalParamsSeedRows } from '@test/helpers/legalParams';

// BE-INCR-LEGAL-PARAMS PR-2: a tabela mora em PIS_COFINS_MONOFASICO_NCM; a guarda roda sobre a semente da migração.
const PIS_COFINS_MONOFASICO_NCM = TABELA_ITEM_SEMENTE.regras;
/** X6 F-X6-7 (a) — guarda da transcrição: toda regra cita lei + artigo do MANIFEST; prefixos numéricos. */
describe('PIS_COFINS_MONOFASICO_NCM — guarda da transcrição', () => {
  it('toda entrada cita a lei, o artigo e o arquivo do corpus; prefixo só dígitos (2–8)', () => {
    for (const r of PIS_COFINS_MONOFASICO_NCM) {
      expect(r.fonte).toMatch(
        /^(Lei (10\.(147|485)\/20(00|02)|13\.097\/2015) art\. \d+º?.*\((Lei-10(147|485)-20(00|02)-monofasico-.*|Lei-13097-2015-bebidas-frias)\.html\)|IN RFB 2\.121\/2022 art\. 452 \(Sijut, visão vigente, lida em \d{4}-\d{2}-\d{2}\)|Tabela 4\.3\.10 EFD-Contribuições v1\.25 código \d{3}(\/\d{3})? — .+ \(TABELA-4310-EFD-CONTRIBUICOES-v1\.25\.txt\))$/,
      );
      expect(r.prefixo).toMatch(/^\d{2,8}$/);
      for (const ex of r.exceto ?? []) expect(ex).toMatch(/^\d{8}$/);
    }
    expect(PIS_COFINS_MONOFASICO_NCM.length).toBeGreaterThan(80);
  });

  it('Lei 10.485 art. 1º na redação VIGENTE (Lei 12.973/2014): 73.09, 7310.29, 84.32/84.33 inteiras, 84.34–84.37, 8716.20.00 são monofásicos', () => {
    for (const ncm of ['73090010', '73102910', '76129012', '84248111', '84306990', '84321000', '84331100', '84341000', '84351000', '84361000', '84371000', '87162000']) {
      expect(findMonofasicoRule(ncm, TABELA_ITEM_SEMENTE.regras)?.fonte).toContain('Lei 10.485/2002 art. 1º');
    }
  });

  it('33.06 (higiene bucal) NÃO é monofásico — "3303.00 a 33.07, exceto na posição 33.06" (Lei 10.147 art. 1º, red. Lei 12.839/2013)', () => {
    expect(findMonofasicoRule('33061000', TABELA_ITEM_SEMENTE.regras)).toBeNull();
    expect(findMonofasicoRule('33071000', TABELA_ITEM_SEMENTE.regras)?.fonte).toContain('Lei 10.147');
  });

  it('exceções da lei valem: 30.03 é monofásico exceto 3003.90.56; 30.04 exceto 3004.90.46', () => {
    expect(findMonofasicoRule('30039011', TABELA_ITEM_SEMENTE.regras)?.prefixo).toBe('3003');
    expect(findMonofasicoRule('30039056', TABELA_ITEM_SEMENTE.regras)).toBeNull();
    expect(findMonofasicoRule('30049046', TABELA_ITEM_SEMENTE.regras)).toBeNull();
    expect(findMonofasicoRule('30049099', TABELA_ITEM_SEMENTE.regras)?.prefixo).toBe('3004');
  });

  it('normalizeNcm: pontos/espaços fora; 8 dígitos ou null', () => {
    expect(normalizeNcm('3305.10.00')).toBe('33051000');
    expect(normalizeNcm('3305')).toBeNull();
    expect(normalizeNcm('')).toBeNull();
  });

  // ERRATA 2026-09-25 (correção da Fase 1, triagem do contador P5/item 8): o NCM decide; CST 04 e 02 com NCM fora
  // da tabela creditam com alerta (antes: MONOFASICO e UNKNOWN). CST 05..09 seguem mandando.
  it('classificação (item 11): NCM decide; CST 04/02 fora da tabela → TRIBUTADO + alerta; CST 05..09 da nota manda; sem CST = UNKNOWN', () => {
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '02', cstCofins: '02' }, TABELA_ITEM_SEMENTE)).toEqual({ classe: 'TRIBUTADO', motivo: expect.any(String), alerta: expect.stringContaining('CST 02') });
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '04', cstCofins: '04' }, TABELA_ITEM_SEMENTE)).toEqual({ classe: 'TRIBUTADO', motivo: expect.any(String), alerta: expect.stringContaining('CST 04') });
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '06', cstCofins: '06' }, TABELA_ITEM_SEMENTE).classe).toBe('MONOFASICO');
    expect(classifyPisCofinsItem({ ncm: '33051000', cstPis: '01', cstCofins: '01' }, TABELA_ITEM_SEMENTE).classe).toBe('MONOFASICO');
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '01', cstCofins: '01' }, TABELA_ITEM_SEMENTE).classe).toBe('TRIBUTADO');
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: null, cstCofins: null }, TABELA_ITEM_SEMENTE).classe).toBe('UNKNOWN');
    expect(classifyPisCofinsItem({ ncm: '', cstPis: '01', cstCofins: '01' }, TABELA_ITEM_SEMENTE).classe).toBe('UNKNOWN');
    expect(classifyPisCofinsItem({ ncm: '63026000', cstPis: '49', cstCofins: '49' }, TABELA_ITEM_SEMENTE).classe).toBe('UNKNOWN');
  });

  // Teste-guarda da Fase 1 (PLANO-POS-CONTADOR-2026-09-23, passo 1.6; instrumentado #379). NCM tirado da
  // transcrição `docs/accounting/fontes-oficiais/TRANSCRICAO-monofasico-bebidas-combustiveis-2026-09-25.md`, chave
  // `L13097-art14-IV` ("22.03" — cerveja de malte). CST 01 para isolar a TABELA. Verde desde a correção de 25/09.
  // Metade "combustível" DESTRAVADA em 27/09: a correspondência produto → NCM saiu da Tabela 4.3.10 da
  // EFD-Contribuições v1.25 (corpus `tabela-4310-efd`, transcrição §B.1), que a lei não traz.
  it('GAP C-2 — bebida fria (NCM 2203.00.00, Lei 13.097 art. 14 IV) com CST 01 → MONOFASICO (sem crédito)', () => {
    expect(classifyPisCofinsItem({ ncm: '22030000', cstPis: '01', cstCofins: '01' }, TABELA_ITEM_SEMENTE).classe).toBe('MONOFASICO');
  });

  // Metade combustível do C-2 (GAP-MAP 13). CST 01 isola a TABELA: se o NCM não estiver nela, o retorno é
  // TRIBUTADO — é exatamente o que esta asserção pega. NCMs e chaves vêm da transcrição §B.1 (só linhas com
  // "Término de Escrituração" vazio na v1.25).
  it('GAP C-2 — combustíveis vigentes da Tabela 4.3.10 com CST 01 → MONOFASICO', () => {
    const vigentes: readonly [string, string][] = [
      ['27101259', 'T4310-101 gasolina, exceto de aviação'],
      ['27101921', 'T4310-102 óleo diesel'],
      ['27111910', 'T4310-103 GLP'],
      ['27101911', 'T4310-104 querosene de aviação'],
      ['38260000', 'T4310-109 biodiesel'],
      ['22071000', 'T4310-112/117 álcool carburante (prefixo 2207.10)'],
      ['22072010', 'T4310-112/117 álcool carburante (prefixo 2207.20.1)'],
    ];
    for (const [ncm, rotulo] of vigentes) {
      const r = classifyPisCofinsItem({ ncm, cstPis: '01', cstCofins: '01' }, TABELA_ITEM_SEMENTE);
      expect([ncm, rotulo, r.classe]).toEqual([ncm, rotulo, 'MONOFASICO']);
    }
  });

  // O outro lado da transcrição: linha ENCERRADA não entra (2710.11.59 valeu até 31/12/2011; a vigente é a
  // 2710.12.59) e "Ex" da TIPI dentro de código de bebida não vira monofásico (2208.90.00 Ex 01).
  it('linhas encerradas e "Ex" da TIPI NÃO entram na tabela (2710.11.59, 3824.90.29, 2208.90.00)', () => {
    for (const ncm of ['27101159', '38249029', '22089000']) {
      expect([ncm, classifyPisCofinsItem({ ncm, cstPis: '01', cstCofins: '01' }, TABELA_ITEM_SEMENTE).classe]).toEqual([ncm, 'TRIBUTADO']);
    }
  });
});

// Verificação legal 17/10 (dossiê verif-2026-10-17-pis-cofins, item 9; linhas lp9-pc-ncm-*). Os códigos são os do texto
// do art. 452 da IN RFB 2.121/2022 na visão vigente do Sijut, lida em 2026-10-17; o NCM de 8 dígitos é um exemplo dentro de cada código.
describe('PIS_COFINS_MONOFASICO_NCM — farmacêuticos na TIPI vigente (IN RFB 2.121/2022 art. 452)', () => {
  const ART_452: readonly [string, string][] = [
    ['30021100', '3002.11.00'],
    ['30021210', '3002.12.1'],
    ['30021229', '3002.12.2'],
    ['30021235', '3002.12.3'],
    ['30021300', '3002.13.00'],
    ['30021400', '3002.14.00'],
    ['30021590', '3002.15'],
    ['30024119', '3002.41.1'],
    ['30024129', '3002.41.2'],
    ['30024910', '3002.49.10'],
    ['30024992', '3002.49.92'],
    ['30024999', '3002.49.99'],
    ['30025900', '3002.59.00'],
    ['30029000', '3002.90.00'],
    ['38221100', '3822.11.00'],
    ['38221940', '3822.19.40'],
  ];

  it.each(ART_452)('NCM %s (código %s) com CST 01 → MONOFASICO pela IN RFB 2.121/2022 art. 452', (ncm) => {
    expect(classifyPisCofinsItem({ ncm, cstPis: '01', cstCofins: '01' }, TABELA_ITEM_SEMENTE)).toEqual({ classe: 'MONOFASICO', motivo: expect.stringContaining('IN RFB 2.121/2022 art. 452') });
  });

  it('códigos da TIPI de 2011 (3002.10.x, 3002.20.x, 3002.90.20/92/99) saem da tabela; 3002.49.20 e 3822.19.90 seguem fora', () => {
    for (const ncm of ['30021011', '30021021', '30021031', '30022011', '30022021', '30029020', '30029092', '30029099']) {
      expect([ncm, findMonofasicoRule(ncm, TABELA_ITEM_SEMENTE.regras)]).toEqual([ncm, null]);
    }
    for (const prefixo of ['3002101', '3002102', '3002103', '3002201', '3002202', '30029020', '30029092', '30029099']) {
      expect(TABELA_ITEM_SEMENTE.regras.map((r) => r.prefixo)).not.toContain(prefixo);
    }
    expect(findMonofasicoRule('30024920', TABELA_ITEM_SEMENTE.regras)).toBeNull();
    expect(findMonofasicoRule('38221990', TABELA_ITEM_SEMENTE.regras)).toBeNull();
  });

  it('a migração lp9 carrega o texto de prisma/data/legal_parameters_lp9_pis_cofins_ncm.sql, só insere, e substitui exatamente as 8 linhas de 2011', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261017190000_legal_parameters_lp9_pis_cofins_ncm/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_LP9_PC, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
    const lp9 = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_LP9_PC);
    expect(lp9).toHaveLength(16);
    expect(lp9.map((r) => r.supersedesId).filter((s) => s !== null).sort()).toEqual(['lp2-ncm-004', 'lp2-ncm-005', 'lp2-ncm-006', 'lp2-ncm-007', 'lp2-ncm-008', 'lp2-ncm-011', 'lp2-ncm-012', 'lp2-ncm-013']);
    expect(lp9.every((r) => r.status === 'PUBLISHED' && r.tabela === 'PIS_COFINS_MONOFASICO_NCM' && r.vigenteDesde === '2025-01-01' && r.vigenteAte === null)).toBe(true);
  });
});
