/**
 * BE-INCR-DP-PONTE-RAZAO PR-P0 itens 1–3 — a carga `legal_parameters_dp_encargos_v1.sql` (RAT por grau e limites do FAP)
 * e os formatos das três tabelas, registrados pela borda do DP (F-PBA-7 a). A `TERCEIROS_FPAS` nasce sem linha (A-3).
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_DP_ENCARGOS, legalParamsSeedRows } from '@test/helpers/legalParams';
import type { LinhaLegal } from '../../../../../legalParameters/models/legalParameter';
import { createFormatRegistry } from '../../../../../legalParameters/models/formatRegistry';
import { ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS } from '../../../../../accounting/paises/br/legalParameters';
import { DP_LEGAL_TABLES } from '../../../../models/legalTables';
import { DP_BR_LEGAL_PARAMETER_FORMATS } from '..';

const erroDeFormato = createFormatRegistry([...ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS, ...DP_BR_LEGAL_PARAMETER_FORMATS]).formatError;
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const LINHAS = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_DP_ENCARGOS) as (LinhaLegal & { fonteSha256: string | null; fonteUrl: string | null })[];
const SHA_D01 = '6ace89674b04578f1f2ff4e16d4ab89e4a251e1da7b44b288870cc63ec2bb0b7';
const SHA_D02 = '3311fc0954581236c74cbcd937470a15a481f5a858b6197fc538ce11e824d827';

describe('PR-P0 — carga legal_parameters_dp_encargos_v1.sql', () => {
  it('a migração carrega o texto da carga e só insere', () => {
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../../../prisma/migrations/20261126120000_legal_parameters_dp_encargos/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_DP_ENCARGOS, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('contagem e hash da carga são os registrados no PR', () => {
    expect(LINHAS.map((l) => [l.tabela, l.chave, l.valorInt, l.vigenteDesde])).toEqual([
      ['RAT_ALIQUOTA', 'GRAU_1', 100, '1998-12-11'],
      ['RAT_ALIQUOTA', 'GRAU_2', 200, '1998-12-11'],
      ['RAT_ALIQUOTA', 'GRAU_3', 300, '1998-12-11'],
      ['FAP_LIMITES', 'MIN_X10000', 5000, '2003-05-09'],
      ['FAP_LIMITES', 'MAX_X10000', 20000, '2003-05-09'],
    ]);
    expect(createHash('sha256').update(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_DP_ENCARGOS, 'utf8'))).digest('hex')).toBe('bb762bdb9e5ffec225b84b0942f0026bcce461400db24e634d5fba7537a6b18e');
  });

  it('toda linha é PUBLISHED, sem fim, com a fonte do dossiê (D01 para o RAT, D02 para o FAP) e id único', () => {
    for (const l of LINHAS) expect([l.status, l.vigenteAte, l.fonteSha256]).toEqual(['PUBLISHED', null, l.tabela === 'RAT_ALIQUOTA' ? SHA_D01 : SHA_D02]);
    expect(new Set(LINHAS.map((l) => l.id)).size).toBe(LINHAS.length);
    expect(LINHAS.some((l) => l.tabela === 'TERCEIROS_FPAS')).toBe(false);
  });

  it('toda linha está no formato, e as três tabelas estão no catálogo do DP', () => {
    expect(LINHAS.map((l) => erroDeFormato(l)).filter((e) => e !== null)).toEqual([]);
    expect(DP_LEGAL_TABLES).toEqual(expect.arrayContaining(['RAT_ALIQUOTA', 'FAP_LIMITES', 'TERCEIROS_FPAS']));
  });
});

describe('PR-P0 itens 1–3 — formatos', () => {
  it('RAT_ALIQUOTA: chave GRAU_1..3, valorInt em bp', () => {
    expect(erroDeFormato({ tabela: 'RAT_ALIQUOTA', chave: 'GRAU_4', valorInt: 100 })).toMatch(/GRAU_1\|GRAU_2\|GRAU_3/);
    expect(erroDeFormato({ tabela: 'RAT_ALIQUOTA', chave: 'GRAU_1', valorInt: 10_001 })).toMatch(/bp 0\.\.10000/);
    expect(erroDeFormato({ tabela: 'RAT_ALIQUOTA', chave: 'GRAU_1', discriminador: 'X', valorInt: 100 })).toMatch(/sem discriminador/);
    expect(erroDeFormato({ tabela: 'RAT_ALIQUOTA', chave: 'GRAU_1', valorTexto: '1%' })).toMatch(/valorInt/);
  });

  it('FAP_LIMITES: chave MIN_X10000|MAX_X10000, valorInt 1..30000', () => {
    expect(erroDeFormato({ tabela: 'FAP_LIMITES', chave: 'MEDIO', valorInt: 10_000 })).toMatch(/MIN_X10000\|MAX_X10000/);
    expect(erroDeFormato({ tabela: 'FAP_LIMITES', chave: 'MIN_X10000', valorInt: 0 })).toMatch(/1\.\.30000/);
    expect(erroDeFormato({ tabela: 'FAP_LIMITES', chave: 'MAX_X10000', valorInt: 30_001 })).toMatch(/1\.\.30000/);
  });

  it('TERCEIROS_FPAS: chave de 3 dígitos; totalBp = soma das entidades de código de 4 dígitos', () => {
    const fpas515 = { entidades: { '0001': 250, '0002': 20, '0016': 100, '0032': 150, '0064': 60 }, totalBp: 580 };
    expect(erroDeFormato({ tabela: 'TERCEIROS_FPAS', chave: '515', valorJson: fpas515 })).toBeNull();
    expect(erroDeFormato({ tabela: 'TERCEIROS_FPAS', chave: '515', valorJson: { ...fpas515, totalBp: 590 } })).toMatch(/totalBp = soma/);
    expect(erroDeFormato({ tabela: 'TERCEIROS_FPAS', chave: '515', valorJson: { entidades: { '64': 60 }, totalBp: 60 } })).toMatch(/4 dígitos/);
    expect(erroDeFormato({ tabela: 'TERCEIROS_FPAS', chave: '515', valorJson: { entidades: {}, totalBp: 0 } })).toMatch(/totalBp = soma/);
    expect(erroDeFormato({ tabela: 'TERCEIROS_FPAS', chave: '51', valorJson: fpas515 })).toMatch(/3 dígitos/);
  });
});

describe('PR-P1 item 7 — enquadramento por CNPJ (formato e checagem contra a tabela de lei)', () => {
  const CNPJ = '12ABC34501DE35';
  const TERCEIROS_515: LinhaLegal = {
    id: 'teste-fpas-515', tabela: 'TERCEIROS_FPAS', chave: '515', discriminador: null, valorInt: null, valorTexto: null,
    valorJson: JSON.stringify({ entidades: { '0001': 250, '0064': 60 }, totalBp: 310 }), fonte: 'teste', vigenteDesde: '2022-10-19', vigenteAte: null, status: 'PUBLISHED', supersedesId: null,
  };
  const deps = { rowsOf: (t: string) => [...LINHAS, TERCEIROS_515].filter((l) => l.tabela === t) };

  it('RAT_GRAU_ESTABELECIMENTO: chave = CNPJ com DV, grau 1..3 com linha em RAT_ALIQUOTA em toda a vigência', () => {
    expect(erroDeFormato({ tabela: 'RAT_GRAU_ESTABELECIMENTO', chave: CNPJ, valorInt: 2, vigenteDesde: '2026-01-01' }, deps)).toBeNull();
    expect(erroDeFormato({ tabela: 'RAT_GRAU_ESTABELECIMENTO', chave: '12ABC34501DE36', valorInt: 2 })).toMatch(/DV válido/);
    expect(erroDeFormato({ tabela: 'RAT_GRAU_ESTABELECIMENTO', chave: CNPJ, valorInt: 4 })).toMatch(/grau 1\.\.3/);
    expect(erroDeFormato({ tabela: 'RAT_GRAU_ESTABELECIMENTO', chave: CNPJ, valorInt: 2, vigenteDesde: '1998-01-01' }, deps)).toMatch(/RAT_ALIQUOTA sem GRAU_2 em vigor \(em 1998-01-01\)/);
  });

  it('FAP_ESTABELECIMENTO: vigência anual, fim obrigatório e FAP entre os FAP_LIMITES vigentes', () => {
    const ok = { tabela: 'FAP_ESTABELECIMENTO', chave: CNPJ, valorInt: 12_345, vigenteDesde: '2026-01-01', vigenteAte: '2026-12-31' };
    expect(erroDeFormato(ok, deps)).toBeNull();
    expect(erroDeFormato({ ...ok, valorInt: 20_001 }, deps)).toMatch(/FAP 20001 fora de 5000\.\.20000/);
    expect(erroDeFormato({ ...ok, vigenteDesde: '2026-02-01' })).toMatch(/1º de janeiro/);
    expect(erroDeFormato({ ...ok, vigenteAte: '2027-12-31' })).toMatch(/31 de dezembro do mesmo ano/);
    const registry = createFormatRegistry([...ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS, ...DP_BR_LEGAL_PARAMETER_FORMATS]);
    expect(registry.endRequiredError({ tabela: 'FAP_ESTABELECIMENTO', chave: CNPJ, vigenteAte: null })).toMatch(/vigenteAte é obrigatório/);
  });

  it('FPAS_EMPRESA: chave = raiz de 8 posições, valorTexto = FPAS com linha em TERCEIROS_FPAS, valorJson opcional', () => {
    const ok = { tabela: 'FPAS_EMPRESA', chave: CNPJ.slice(0, 8), valorTexto: '515', vigenteDesde: '2026-01-01' };
    expect(erroDeFormato(ok, deps)).toBeNull();
    expect(erroDeFormato({ ...ok, valorJson: { codigoTerceiros: '0115' } }, deps)).toBeNull();
    expect(erroDeFormato({ ...ok, valorJson: { codigoTerceiros: '115' } })).toMatch(/codigoTerceiros/);
    expect(erroDeFormato({ ...ok, chave: CNPJ })).toMatch(/raiz do CNPJ/);
    expect(erroDeFormato({ ...ok, valorTexto: '999' }, deps)).toMatch(/TERCEIROS_FPAS sem a linha do FPAS 999/);
  });
});
