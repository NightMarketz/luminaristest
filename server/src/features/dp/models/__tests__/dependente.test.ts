/**
 * BE-INCR-DP-F2 PR-1 itens 13–15 — a carga da Tabela 07 (`legal_parameters_dp_dependente_v1.sql`, gerada por
 * pesquisas-legais/brief-pes4-f2/gerar_carga_dependente.py do HTML oficial [F1-D10]), a contagem de dependentes do IRRF
 * e a validação do salário-família com a idade da FOLHA_REGRA (duas fotografias: a real e uma alterada).
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_DP_DEPENDENTE, legalParamsSeedRows } from '@test/helpers/legalParams';
import { ValidationError } from '../../../../lib/errors';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import { linhaLegalVigente, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { assertSalarioFamilia, dependentesIrrfNaData, TIPOS_DEPENDENTE_SALARIO_FAMILIA } from '../dependente';
import { regraInt } from '../regrasFolha';
import { alterada, REAL } from '../folha/__tests__/fotografias';

const norm = (s: string) => s.replace(/\r\n/g, '\n');
const LINHAS = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_DP_DEPENDENTE) as (LinhaLegal & { fonteSha256: string | null })[];
const SHA_D10 = '19abfe05f6823c7b6428d7c7cfb35f8e06f39b20e585ee5eb8c5079a607c2347';

describe('DP-F2 PR-1 item 13 — carga legal_parameters_dp_dependente_v1.sql (Tabela 07)', () => {
  it('a migração carrega o texto da carga e só insere', () => {
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261107140000_legal_parameters_dp_dependente/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_DP_DEPENDENTE, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('11 tipos, hash registrado no PR, sha256 do HTML oficial em cada linha, PUBLISHED e no formato da tabela', () => {
    expect(LINHAS.map((l) => [l.chave, l.vigenteDesde, l.vigenteAte])).toEqual([
      ['01', '2014-01-01', null],
      ['02', '2018-01-08', null],
      ['03', '2018-01-08', null],
      ['04', '2018-01-08', '2023-04-25'],
      ['06', '2018-01-08', null],
      ['07', '2018-01-08', '2023-04-25'],
      ['09', '2014-01-01', null],
      ['10', '2018-01-08', null],
      ['11', '2014-01-01', null],
      ['12', '2018-01-08', null],
      ['99', '2014-01-01', null],
    ]);
    expect(createHash('sha256').update(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_DP_DEPENDENTE, 'utf8'))).digest('hex')).toBe(
      '0bc8fa7e5d84a432e99fcde021ca94c0f8e8fe2564e9c038f5327e24e9c64b84',
    );
    for (const l of LINHAS) expect([l.tabela, l.fonteSha256, l.status]).toEqual(['ESOCIAL_TIPO_DEPENDENTE', SHA_D10, 'PUBLISHED']);
    const fora = LINHAS.map((l) => erroDeFormato({ ...l, tabela: l.tabela as never, valorJson: l.valorJson ? JSON.parse(l.valorJson) : null })).filter((e) => e !== null);
    expect(fora).toEqual([]);
  });

  it('o tipo 04 (filho universitário) não vale depois de 25/04/2023', () => {
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_TIPO_DEPENDENTE', '04', '2023-04-25')).toBeDefined();
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_TIPO_DEPENDENTE', '04', '2023-04-26')).toBeUndefined();
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_TIPO_DEPENDENTE', '05', '2026-01-01')).toBeUndefined();
  });

  it('os tipos do salário-família existem na Tabela 07 vigente em 2026', () => {
    for (const t of TIPOS_DEPENDENTE_SALARIO_FAMILIA) expect(linhaLegalVigente(LINHAS, 'ESOCIAL_TIPO_DEPENDENTE', t, '2026-01-01')).toBeDefined();
  });
});

describe('DP-F2 item 14 — dependentesIrrfNaData', () => {
  const deps = [
    { deduzIrrf: true, vigenteDesde: '2026-01-01', vigenteAte: null },
    { deduzIrrf: false, vigenteDesde: '2026-01-01', vigenteAte: null },
    { deduzIrrf: true, vigenteDesde: '2026-04-01', vigenteAte: null },
    { deduzIrrf: true, vigenteDesde: '2025-01-01', vigenteAte: '2026-02-28' },
  ];
  it('conta só os vigentes na data que deduzem', () => {
    expect(dependentesIrrfNaData(deps, '2026-02-15')).toBe(2);
    expect(dependentesIrrfNaData(deps, '2026-03-15')).toBe(1);
    expect(dependentesIrrfNaData(deps, '2026-04-01')).toBe(2);
    expect(dependentesIrrfNaData([], '2026-04-01')).toBe(0);
  });
});

describe('DP-F2 item 15 — salário-família (idade da FOLHA_REGRA)', () => {
  const idade = (foto: readonly LinhaLegal[] = REAL) => regraInt(foto, 'SALARIO_FAMILIA_IDADE_MAX', '2026-03-01');
  const filho = { tipo: '03', nascimento: '2012-03-02', invalido: false, vigenteDesde: '2026-03-01' }; // 13 anos

  it('filho de 13 anos passa; aos 14 completos não (o direito cessa ao completar a idade)', () => {
    expect(() => assertSalarioFamilia(filho, idade())).not.toThrow();
    expect(() => assertSalarioFamilia({ ...filho, nascimento: '2012-03-01' }, idade())).toThrow(ValidationError);
  });

  it('inválido de qualquer idade passa (Lei 8.213 art. 66)', () => {
    expect(() => assertSalarioFamilia({ ...filho, nascimento: '1990-01-01', invalido: true }, idade())).not.toThrow();
  });

  it('tipo que não é filho nem equiparado (cônjuge 01, pais 09) é recusado com o campo', () => {
    for (const tipo of ['01', '09', '99']) {
      try {
        assertSalarioFamilia({ ...filho, tipo }, idade());
        throw new Error('não lançou');
      } catch (e) {
        expect((e as ValidationError).details).toEqual({ campo: 'tipo' });
      }
    }
  });

  it('a idade vem da linha: com 12 anos na FOLHA_REGRA, o filho de 13 já não passa', () => {
    const foto = alterada({ SALARIO_FAMILIA_IDADE_MAX: 12 });
    expect(idade(foto).valor).toBe(12);
    expect(() => assertSalarioFamilia(filho, idade(foto))).toThrow(/12 anos/);
  });
});
