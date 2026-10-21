/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (BRIEF item 5; F-IRD-13, F-IRD-18) — tabelas IRRF_DISTRIBUICAO e TJLP na tabela de
 * parâmetros legais, com a carga inicial de 2026. Fontes: dossiê pesquisas-legais/irrf-distribuicao [D02] [D05] [D12] [D19].
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_IRRF_DISTRIBUICAO, legalParamsSeedRows } from '@test/helpers/legalParams';
import { LEGAL_PARAMETER_TABELAS, ParametroLegalAusenteError, exigirLinhaVigente } from '../models/legalParameter';
import { erroDeFormato } from '../models/formatoLinha';

const MIGRATION = path.resolve(__dirname, '../../../../prisma/migrations/20261021120000_add_partners_irrf_distribuicao/migration.sql');
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const rows = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IRRF_DISTRIBUICAO);

describe('IRRF_DISTRIBUICAO e TJLP (item 5)', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_irrf_distribuicao_v1.sql, byte a byte', () => {
    expect(norm(fs.readFileSync(MIGRATION, 'utf8'))).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_IRRF_DISTRIBUICAO, 'utf8')).trimEnd());
  });

  it('as duas tabelas estão no catálogo', () => {
    expect(LEGAL_PARAMETER_TABELAS).toEqual(expect.arrayContaining(['IRRF_DISTRIBUICAO', 'TJLP']));
  });

  it('carga: valores do BRIEF, todas PUBLISHED, com fonte, URL e sha256, e no formato', () => {
    expect(rows.map((r) => [r.tabela, r.chave, r.valorInt, r.valorTexto, r.vigenteDesde, r.vigenteAte])).toEqual([
      ['IRRF_DISTRIBUICAO', 'ALIQUOTA_PF_BP', 1000, null, '2026-01-01', null],
      ['IRRF_DISTRIBUICAO', 'LIMITE_MENSAL_PF_CENTS', 5000000, null, '2026-01-01', null],
      ['IRRF_DISTRIBUICAO', 'ALIQUOTA_JCP_BP', 1750, null, '2026-01-01', null],
      ['IRRF_DISTRIBUICAO', 'TRANSICAO_APROVACAO_ATE', null, '2025-12-31', '2026-01-01', null],
      ['IRRF_DISTRIBUICAO', 'TRANSICAO_APROVACAO_ATE', null, '2026-01-31', '2026-01-01', null],
      ['TJLP', '2026-T01', 7658, null, '2026-01-01', '2026-03-31'],
      ['TJLP', '2026-T02', 7608, null, '2026-04-01', '2026-06-30'],
      ['TJLP', '2026-T03', 7617, null, '2026-07-01', '2026-09-30'],
      ['TJLP', '2026-T04', 7742, null, '2026-10-01', '2026-12-31'],
    ]);
    for (const r of rows) {
      expect([r.id, r.status, r.fonte.trim() !== '', r.fonteUrl?.startsWith('https://'), r.fonteSha256?.length]).toEqual([r.id, 'PUBLISHED', true, true, 64]);
      expect([r.id, erroDeFormato({ ...r, tabela: r.tabela as never, valorJson: undefined })]).toEqual([r.id, null]);
    }
  });

  it('o prazo da transição: a linha de 31/01/2026 (liminar das ADIs 7.912/7.914) substitui a de 31/12/2025 (§ 3º II)', () => {
    const l = exigirLinhaVigente(rows, 'IRRF_DISTRIBUICAO', 'TRANSICAO_APROVACAO_ATE', '2026-03-10');
    expect([l.valorTexto, l.fonte]).toEqual(['2026-01-31', expect.stringContaining('ADIs 7.912 e 7.914')]);
    const semLiminar = rows.filter((r) => r.id !== 'ird-transicao-2026-01-31');
    expect(exigirLinhaVigente(semLiminar, 'IRRF_DISTRIBUICAO', 'TRANSICAO_APROVACAO_ATE', '2026-03-10').valorTexto).toBe('2025-12-31');
  });

  it('com linha vigente devolve o valor; sem linha na data → PARAMETRO_LEGAL_AUSENTE, nunca zero', () => {
    expect(exigirLinhaVigente(rows, 'TJLP', '2026-T04', '2026-11-15').valorInt).toBe(7742);
    expect(exigirLinhaVigente(rows, 'IRRF_DISTRIBUICAO', 'ALIQUOTA_JCP_BP', '2026-06-30').valorInt).toBe(1750);
    for (const [tabela, chave, data] of [
      ['IRRF_DISTRIBUICAO', 'ALIQUOTA_PF_BP', '2025-12-31'],
      ['TJLP', '2027-T01', '2027-01-15'],
      ['TJLP', '2026-T01', '2026-04-01'],
    ] as const) {
      let erro: unknown;
      try {
        exigirLinhaVigente(rows, tabela, chave, data);
      } catch (e) {
        erro = e;
      }
      expect(erro).toBeInstanceOf(ParametroLegalAusenteError);
      expect((erro as ParametroLegalAusenteError).errorCode).toBe('PARAMETRO_LEGAL_AUSENTE');
    }
  });

  it('formato recusa: alíquota fora de 0..10000, chave desconhecida, prazo que não é data, TJLP com chave fora de YYYY-T0n', () => {
    const base = { tabela: 'IRRF_DISTRIBUICAO' as const };
    expect(erroDeFormato({ ...base, chave: 'ALIQUOTA_PF_BP', valorInt: 10001 })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: 'OUTRA', valorInt: 10 })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: 'LIMITE_MENSAL_PF_CENTS', valorInt: 0 })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: 'TRANSICAO_APROVACAO_ATE', valorTexto: '2026-02-30' })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: 'TRANSICAO_APROVACAO_ATE', valorInt: 20260131 })).toContain('valorTexto');
    expect(erroDeFormato({ tabela: 'TJLP', chave: '2026-Q1', valorInt: 7658 })).not.toBeNull();
    expect(erroDeFormato({ tabela: 'TJLP', chave: '2026-T05', valorInt: 7658 })).not.toBeNull();
    expect(erroDeFormato({ tabela: 'TJLP', chave: '2026-T01', valorInt: 7658 })).toBeNull();
  });
});
