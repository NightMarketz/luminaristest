/**
 * BE-INCR-LEGAL-PARAMS PR-1 — unidade: a semente da migração (uma fonte só para banco real, banco de teste e testes
 * dos cálculos), o lookup puro (item 4 + L-7) e a policy (item 12, F-LP-2 b).
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE, LEGAL_PARAMS_SEED_FILE_V2, LEGAL_PARAMS_SEED_FILE_V3, LEGAL_PARAMS_SEED_FILE_V4, LEGAL_PARAMS_SEED_FILE_V5, legalParamsSeedRows, tabelaApuracaoSemente } from '@test/helpers/legalParams';
import anexoFixture from '../../accounting/fixtures/anexo-iii-in-1700-2017.json';
import { LEGAL_PARAMETER_TABELAS, TABELAS_MIGRADAS, linhaLegalVigente, linhasEmVigor, type LinhaLegal } from '../models/legalParameter';
import { erroDeFormato, type LinhaParaFormato } from '../models/formatoLinha';
import { LegalParameterPolicy } from '../policies/LegalParameterPolicy';

const MIGRATION = path.resolve(__dirname, '../../../../prisma/migrations/20261007150000_add_legal_parameters/migration.sql');
const MIGRATION_V2 = path.resolve(__dirname, '../../../../prisma/migrations/20261007160000_add_legal_parameters_v2/migration.sql');
const MIGRATION_V3 = path.resolve(__dirname, '../../../../prisma/migrations/20261007170000_legal_parameters_v3_depreciacao/migration.sql');
const MIGRATION_V5 = path.resolve(__dirname, '../../../../prisma/migrations/20261010090000_legal_parameters_v5_csll_bancos/migration.sql');
const MIGRATION_V4 = path.resolve(__dirname, '../../../../prisma/migrations/20261009120000_legal_parameters_v4_csll_lc224/migration.sql');
const norm = (s: string) => s.replace(/\r\n/g, '\n');

describe('semente da migração (item 6)', () => {
  it('o migration.sql carrega o texto de prisma/data/legal_parameters_v1.sql, byte a byte', () => {
    expect(norm(fs.readFileSync(MIGRATION, 'utf8'))).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE, 'utf8')).trimEnd());
  });

  it('PR-2: o migration.sql v2 carrega o texto de prisma/data/legal_parameters_v2.sql, byte a byte', () => {
    expect(norm(fs.readFileSync(MIGRATION_V2, 'utf8'))).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_V2, 'utf8')).trimEnd());
  });

  it('PR-2: 509 linhas nas 10 tabelas restantes (sem a depreciação, PR-3); ids únicos em v1+v2; PUBLISHED, com fonte e no formato da tabela', () => {
    const todas = legalParamsSeedRows();
    expect(new Set(todas.map((r) => r.id)).size).toBe(todas.length);
    const v2 = todas.filter((r) => r.id.startsWith('lp2-'));
    const contagem: Record<string, number> = {};
    for (const r of v2) contagem[r.tabela] = (contagem[r.tabela] ?? 0) + 1;
    expect(contagem).toEqual({
      CODIGO_RECEITA: 18, PIS_COFINS_MONOFASICO_NCM: 118, CST_PIS_COFINS: 8, CFOP_IMOBILIZADO: 2, NFE_CSTAT_AUTORIZADA: 2,
      OBRIGACAO_REGIME: 12, LC116_SERVICO: 337, ISS_LIMITE: 1, LEIAUTE_SPED: 2, FERIADO_NACIONAL: 9,
    });
    expect(v2).toHaveLength(509);
    for (const r of v2) {
      expect([r.id, r.status, r.fonte.trim() !== '', TABELAS_MIGRADAS.has(r.tabela as never)]).toEqual([r.id, 'PUBLISHED', true, true]);
      const linha = { ...r, tabela: r.tabela, valorJson: r.valorJson === null ? undefined : (JSON.parse(r.valorJson) as unknown) } as LinhaParaFormato;
      expect([r.id, erroDeFormato(linha)]).toEqual([r.id, null]);
    }
  });

  it('PR-3: TABELAS_MIGRADAS = todas (DEPRECIACAO_ANEXO_III aberta), menos MEI_ANEXO_XI até ter consumidor (SIMPLES-PISO-ANEXO-XI)', () => {
    expect(LEGAL_PARAMETER_TABELAS.filter((t) => !TABELAS_MIGRADAS.has(t))).toEqual(['MEI_ANEXO_XI']);
  });

  it('PR-3: o migration.sql v3 carrega o texto de prisma/data/legal_parameters_v3.sql, byte a byte', () => {
    expect(norm(fs.readFileSync(MIGRATION_V3, 'utf8'))).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_V3, 'utf8')).trimEnd());
  });

  it('PR-3 (item 9, paridade): as 222 linhas DEPRECIACAO_ANEXO_III são o fixture do Anexo III, linha a linha', () => {
    const v3 = legalParamsSeedRows().filter((r) => r.id.startsWith('lp3-'));
    expect(v3.every((r) => r.tabela === 'DEPRECIACAO_ANEXO_III' && r.status === 'PUBLISHED' && r.vigenteDesde === '2017-01-01' && r.vigenteAte === null)).toBe(true);
    const fixture = (anexoFixture as { sha256: string; rows: { ncm: string | null; sourceRow: number | null; description: string; lifeYears: number; annualRateBp: number; source: string; justification?: string }[] });
    const doBanco = v3.map((r) => {
      const j = JSON.parse(r.valorJson ?? 'null') as Record<string, unknown>;
      return { ncm: j.ncm, sourceRow: r.chave === 'NOTA' ? null : Number(r.chave), description: j.description, lifeYears: j.lifeYears, annualRateBp: j.annualRateBp, source: r.discriminador, ...(j.justification ? { justification: j.justification } : {}) };
    });
    expect(doBanco).toEqual(fixture.rows);
    for (const r of v3) {
      expect([r.id, r.valorInt, r.valorTexto, r.fonte.startsWith('IN RFB 1.700/2017, Anexo III')]).toEqual([r.id, null, null, true]);
      const linha = { ...r, tabela: 'DEPRECIACAO_ANEXO_III', valorJson: JSON.parse(r.valorJson ?? 'null') as unknown } as LinhaParaFormato;
      expect([r.id, erroDeFormato(linha)]).toEqual([r.id, null]);
    }
  });

  it('PR-3: formato DEPRECIACAO_ANEXO_III recusa taxa fora de 1..10000, discriminador CUSTOM e chave não numérica', () => {
    const base = { tabela: 'DEPRECIACAO_ANEXO_III' as const, chave: '2', discriminador: 'ANEXO_III_IN_1700_2017', valorJson: { annualRateBp: 1000, ncm: null, description: 'X', lifeYears: 10 } };
    expect(erroDeFormato(base)).toBeNull();
    expect(erroDeFormato({ ...base, valorJson: { ...base.valorJson, annualRateBp: 0 } })).not.toBeNull();
    expect(erroDeFormato({ ...base, discriminador: 'CUSTOM' })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: 'X1' })).not.toBeNull();
    expect(erroDeFormato({ ...base, valorJson: undefined, valorInt: 1000 })).not.toBeNull();
  });

  it('20 linhas: 14 TAX_ASSESSMENT (13 + ARREDONDAMENTO), 2 CSLL_ALIQUOTA, 4 PIS_COFINS; ids únicos; todas PUBLISHED com fonte', () => {
    const rows = legalParamsSeedRows().filter((r) => r.id.startsWith('lp1-'));
    const por = (t: string) => rows.filter((r) => r.tabela === t).length;
    expect([rows.length, por('TAX_ASSESSMENT'), por('CSLL_ALIQUOTA'), por('PIS_COFINS')]).toEqual([20, 14, 2, 4]);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    for (const r of rows) {
      expect(r.status).toBe('PUBLISHED');
      expect(r.fonte.trim()).not.toBe('');
      expect(TABELAS_MIGRADAS.has(r.tabela as never)).toBe(true);
    }
  });

  it('o catálogo tem as 14 tabelas do item 2 (o item 27 do inventário fica fora) + as 7 do Simples (X14 PR-1) + MEI_ANEXO_XI (SIMPLES-PISO-ANEXO-XI)', () => {
    expect(LEGAL_PARAMETER_TABELAS).toHaveLength(22);
  });
});

describe('BE-INCR-CSLL-ALIQUOTA-LC224 — linhas v4 de CSLL_ALIQUOTA (BRIEF §3 itens 1–3, 7)', () => {
  const S1 = 'faa47fa18631e4b78931693fb9ef7edabe7a58c6d288c9eee8374397c40940c3';

  it('item 1: o migration.sql v4 carrega o texto de prisma/data/legal_parameters_v4.sql, byte a byte', () => {
    expect(norm(fs.readFileSync(MIGRATION_V4, 'utf8'))).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_V4, 'utf8')).trimEnd());
  });

  it('item 2: 7 linhas, só CSLL_ALIQUOTA, PUBLISHED, sem supersedesId, com fonteUrl e o sha256 do S1 (F-CA-5 a), no formato', () => {
    const v4 = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_V4);
    expect(v4.map((r) => r.id)).toEqual(['lp4-csll-3', 'lp4-csll-7-a', 'lp4-csll-7-b', 'lp4-csll-7-c', 'lp4-csll-8-a', 'lp4-csll-8-b', 'lp4-csll-8-c']);
    for (const r of v4) {
      expect([r.id, r.tabela, r.status, r.supersedesId, r.fonteSha256, r.fonteUrl?.startsWith('https://normasinternet2.receita.fazenda.gov.br/')]).toEqual([r.id, 'CSLL_ALIQUOTA', 'PUBLISHED', null, S1, true]);
      expect([r.id, erroDeFormato({ ...r, tabela: 'CSLL_ALIQUOTA', valorJson: undefined } as LinhaParaFormato)]).toEqual([r.id, null]);
    }
  });

  it('item 2: aliquotaCsll por chave × data (F-CA-1 a: 3 desde 01/04/2026, antes pela v5 — BE-INCR-CSLL-BANCOS-Q1; F-CA-2 a: 2028 publicado)', () => {
    const t = tabelaApuracaoSemente();
    const DATAS = ['2026-03-31', '2026-04-01', '2026-06-30', '2027-12-31', '2028-01-01'];
    const esperado: Record<string, (number | undefined)[]> = {
      '3': [2000, 2000, 2000, 2000, 2000], // 2026-03-31 pela lp5-csll-3-a (BE-INCR-CSLL-BANCOS-Q1 item 3)
      '7': [900, 1200, 1200, 1200, 1500],
      '8': [1500, 1750, 1750, 1750, 2000],
    };
    for (const [ind, valores] of Object.entries(esperado)) {
      expect(DATAS.map((d) => t.aliquotaCsll(ind, d)?.valor)).toEqual(valores);
    }
    expect(t.aliquotaCsll('7', '2026-06-30')?.fonte).toBe('IN RFB 1.700/2017 art. 30-D III a (red. IN RFB 2.315/2026)');
    expect(t.aliquotaCsll('8', '2026-03-31')?.fonte).toBe('IN RFB 1.700/2017 art. 30 I (redação anterior à IN RFB 2.315/2026)');
    expect(t.aliquotaCsll('7', '2025-12-31')).toBeUndefined();
  });

  it('item 3: as linhas 1 e 4 não mudam (valor e fonte da v1) em 2026 e 2028', () => {
    const t = tabelaApuracaoSemente();
    for (const d of ['2026-06-30', '2028-03-31']) {
      expect(t.aliquotaCsll('1', d)).toEqual({ valor: 900, fonte: 'Lei 7.689/1988 art. 3º III' });
      expect(t.aliquotaCsll('4', d)).toEqual({ valor: 1500, fonte: 'Lei 7.689/1988 art. 3º I' });
    }
  });

  it('item 7: a migração só insere em legal_parameters (sem job de recálculo, sem UPDATE/DELETE)', () => {
    const sql = norm(fs.readFileSync(MIGRATION_V4, 'utf8')).split('\n').filter((l) => l.trim() && !l.startsWith('--'));
    expect(sql.every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });
});

describe('BE-INCR-CSLL-BANCOS-Q1 — linha v5 do código 3 antes de 01/04/2026 (BRIEF §3 itens 1–2; F-CB-1 b, F-CB-2 b)', () => {
  const S1 = 'faa47fa18631e4b78931693fb9ef7edabe7a58c6d288c9eee8374397c40940c3';
  const ART_30_IV = 'IN RFB 1.700/2017 art. 30 IV (red. IN RFB 1.942/2020; revogado pela IN RFB 2.315/2026)';

  it('item 1: o migration.sql v5 carrega o texto de prisma/data/legal_parameters_v5.sql, byte a byte, e só insere', () => {
    const mig = norm(fs.readFileSync(MIGRATION_V5, 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_V5, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('item 2: 1 linha, CSLL_ALIQUOTA 3, 2020-03-01..2026-03-31, PUBLISHED, sem supersede, fonte S1, no formato', () => {
    const v5 = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_V5);
    expect(v5.map((r) => [r.id, r.tabela, r.chave, r.valorInt, r.vigenteDesde, r.vigenteAte, r.status, r.supersedesId, r.fonte, r.fonteSha256])).toEqual([
      ['lp5-csll-3-a', 'CSLL_ALIQUOTA', '3', 2000, '2020-03-01', '2026-03-31', 'PUBLISHED', null, ART_30_IV, S1],
    ]);
    expect(erroDeFormato({ ...v5[0], tabela: 'CSLL_ALIQUOTA', valorJson: undefined } as LinhaParaFormato)).toBeNull();
  });

  it('item 2: aliquotaCsll(3, d) — nada antes de 01/03/2020 (eram 15%); art. 30 IV até 31/03/2026; art. 30-D II depois', () => {
    const t = tabelaApuracaoSemente();
    const DATAS = ['2020-02-29', '2020-03-01', '2025-12-31', '2026-03-31', '2026-04-01', '2028-01-01'];
    expect(DATAS.map((d) => t.aliquotaCsll('3', d)?.valor)).toEqual([undefined, 2000, 2000, 2000, 2000, 2000]);
    expect(DATAS.slice(1).map((d) => t.aliquotaCsll('3', d)?.fonte)).toEqual([
      ART_30_IV, ART_30_IV, ART_30_IV, 'IN RFB 1.700/2017 art. 30-D II (red. IN RFB 2.315/2026)', 'IN RFB 1.700/2017 art. 30-D II (red. IN RFB 2.315/2026)',
    ]);
  });
});

const L = (o: Partial<LinhaLegal>): LinhaLegal => ({
  id: 'a', tabela: 'T', chave: 'K', discriminador: null, valorInt: 1, valorTexto: null, valorJson: null, fonte: 'f',
  vigenteDesde: '2020-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null, ...o,
});

describe('lookup puro (item 4; emenda §9 L-6, L-7)', () => {
  it('mais recente com vigenteDesde ≤ data ≤ vigenteAte; DRAFT e REVOKED não valem', () => {
    const ls = [
      L({ id: 'a', valorInt: 1 }),
      L({ id: 'b', valorInt: 2, vigenteDesde: '2026-01-01', vigenteAte: '2026-06-30' }),
      L({ id: 'c', valorInt: 3, vigenteDesde: '2026-03-01', status: 'DRAFT' }),
      L({ id: 'd', valorInt: 4, vigenteDesde: '2026-04-01', status: 'REVOKED' }),
    ];
    expect(linhaLegalVigente(ls, 'T', 'K', '2025-12-31')?.id).toBe('a');
    expect(linhaLegalVigente(ls, 'T', 'K', '2026-06-30')?.id).toBe('b');
    expect(linhaLegalVigente(ls, 'T', 'K', '2026-07-01')?.id).toBe('a');
    expect(linhaLegalVigente(ls, 'T', 'K', '2019-12-31')).toBeUndefined();
    expect(linhaLegalVigente(ls, 'T', 'K', '2026-03-31', 'X')).toBeUndefined(); // discriminador diferente
  });

  it('substituída por PUBLISHED sai; substituta DRAFT ou REVOKED não substitui', () => {
    const base = L({ id: 'a', valorInt: 1 });
    expect(linhasEmVigor([base, L({ id: 'b', valorInt: 2, supersedesId: 'a' })]).map((l) => l.id)).toEqual(['b']);
    expect(linhasEmVigor([base, L({ id: 'b', supersedesId: 'a', status: 'DRAFT' })]).map((l) => l.id)).toEqual(['a']);
    expect(linhasEmVigor([base, L({ id: 'b', supersedesId: 'a', status: 'REVOKED' })]).map((l) => l.id)).toEqual(['a']);
  });
});

describe('LegalParameterPolicy (item 12, F-LP-2 b)', () => {
  const p = new LegalParameterPolicy();
  it('qualquer autenticado lê; só PLATFORM_ADMIN gere — ADMIN não', () => {
    expect([p.canRead({ userId: 'u', role: 'USER' }), p.canRead({ userId: '', role: 'PLATFORM_ADMIN' })]).toEqual([true, false]);
    expect(['USER', 'ADMIN', 'PLATFORM_ADMIN'].map((role) => p.canManage({ userId: 'u', role }))).toEqual([false, false, true]);
    expect(p.canManage({ userId: '', role: 'PLATFORM_ADMIN' })).toBe(false);
  });
});
