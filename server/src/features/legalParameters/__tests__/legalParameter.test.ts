/**
 * BE-INCR-LEGAL-PARAMS PR-1 — unidade: a semente da migração (uma fonte só para banco real, banco de teste e testes
 * dos cálculos), o lookup puro (item 4 + L-7) e a policy (item 12, F-LP-2 b).
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE, LEGAL_PARAMS_SEED_FILE_V2, legalParamsSeedRows } from '@test/helpers/legalParams';
import { LEGAL_PARAMETER_TABELAS, TABELAS_MIGRADAS, linhaLegalVigente, linhasEmVigor, type LinhaLegal } from '../models/legalParameter';
import { erroDeFormato, type LinhaParaFormato } from '../models/formatoLinha';
import { LegalParameterPolicy } from '../policies/LegalParameterPolicy';

const MIGRATION = path.resolve(__dirname, '../../../../prisma/migrations/20261007150000_add_legal_parameters/migration.sql');
const MIGRATION_V2 = path.resolve(__dirname, '../../../../prisma/migrations/20261007160000_add_legal_parameters_v2/migration.sql');
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

  it('PR-2: TABELAS_MIGRADAS = todas menos DEPRECIACAO_ANEXO_III (PR-3)', () => {
    expect(LEGAL_PARAMETER_TABELAS.filter((t) => !TABELAS_MIGRADAS.has(t))).toEqual(['DEPRECIACAO_ANEXO_III']);
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

  it('o catálogo tem as 14 tabelas do item 2 (o item 27 do inventário fica fora) + as 7 do Simples (X14 PR-1)', () => {
    expect(LEGAL_PARAMETER_TABELAS).toHaveLength(21);
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
