/**
 * F-E4-1 (a) — dono, questionário, 2026-10-12 ([[D-2026-10-12-QUESTIONARIO-DONO]]); executa: dono, chat, 2026-10-17.
 * Tabela FERIADO_LOCAL: feriados estaduais e municipais na tabela de parâmetros legais, começando por SP e São Paulo
 * capital. Dossiê: pesquisas-legais/fer-sp-feriados-locais.
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_FERIADO_LOCAL, legalParamsSeedRows } from '@test/helpers/legalParams';
import { LEGAL_PARAMETER_TABELAS } from '../models/legalParameter';
import { erroDeFormato } from '../models/formatoLinha';

const MIGRATION = path.resolve(__dirname, '../../../../prisma/migrations/20261017134500_legal_parameters_fer_feriado_local/migration.sql');
const norm = (s: string) => s.replace(/\r\n/g, '\n');

describe('FERIADO_LOCAL (F-E4-1 a)', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_feriado_local_v1.sql, byte a byte', () => {
    expect(norm(fs.readFileSync(MIGRATION, 'utf8'))).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_FERIADO_LOCAL, 'utf8')).trimEnd());
  });

  it('a tabela está no catálogo', () => {
    expect(LEGAL_PARAMETER_TABELAS).toContain('FERIADO_LOCAL');
  });

  it('6 linhas: 09/07 de SP (UF 35) e os 5 dias da Lei municipal 7.008/1967 art. 1º (red. Lei 13.707/2004); todas no formato', () => {
    const rows = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_FERIADO_LOCAL);
    expect(rows.map((r) => [r.discriminador, r.chave])).toEqual([
      ['35', '07-09'],
      ['3550308', '01-25'],
      ['3550308', '11-02'],
      ['3550308', '11-20'],
      ['3550308', 'PASCOA-2'],
      ['3550308', 'PASCOA+60'],
    ]);
    for (const r of rows) {
      expect([r.id.startsWith('fer-'), r.tabela, r.status, r.fonteSha256?.length]).toEqual([true, 'FERIADO_LOCAL', 'PUBLISHED', 64]);
      expect([r.id, erroDeFormato({ ...r, valorJson: undefined })]).toEqual([r.id, null]);
    }
  });

  it('formato recusa discriminador que não é código IBGE de UF (2) ou município (7), data impossível e móvel fora de PASCOA±N', () => {
    const base = { tabela: 'FERIADO_LOCAL', chave: '07-09', discriminador: '35', valorTexto: 'FIXO' };
    expect(erroDeFormato(base)).toBeNull();
    expect(erroDeFormato({ ...base, discriminador: 'SP' })).not.toBeNull();
    expect(erroDeFormato({ ...base, discriminador: null })).not.toBeNull();
    expect(erroDeFormato({ ...base, discriminador: '355030' })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: '02-30' })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: 'PASCOA-2', valorTexto: 'PASCOA' })).toBeNull();
    expect(erroDeFormato({ ...base, chave: 'PASCOA-2', valorTexto: 'FIXO' })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: 'CARNAVAL', valorTexto: 'PASCOA' })).not.toBeNull();
  });
});
