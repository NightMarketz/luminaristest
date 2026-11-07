/**
 * BE-INCR-DP-F2 PR-0R itens 65–67 — a carga `legal_parameters_dp_regras_v1.sql` (gerada por
 * pesquisas-legais/brief-pes4-f2/gerar_carga_regras.py), o formato das tabelas `FOLHA_REGRA` e `DP_CATEGORIA_ENCARGO` e o
 * leitor `regrasFolha`: linha ausente ⇒ `PARAMETRO_LEGAL_AUSENTE`, nunca valor padrão; a virada da EC 141/2026 é vigência.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_DP_REGRAS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { ParametroLegalAusenteError, TABELAS_MIGRADAS, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import { CATEGORIAS_NUCLEO } from '../vinculo';
import { encargoDaCategoria, regrasFolha, regraInt } from '../regrasFolha';

const norm = (s: string) => s.replace(/\r\n/g, '\n');
const LINHAS = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_DP_REGRAS) as (LinhaLegal & { fonteSha256: string | null; fonteUrl: string | null })[];
const json = (l: LinhaLegal) => (l.valorJson ? JSON.parse(l.valorJson) : undefined);
const v = <T>(r: { valor: T }) => r.valor;

describe('DP-F2 PR-0R — carga legal_parameters_dp_regras_v1.sql', () => {
  it('a migração carrega o texto da carga e só insere', () => {
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261107120000_legal_parameters_dp_regras/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_DP_REGRAS, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('contagem e hash da carga são os registrados no PR (mudar sem regerar pelo script quebra aqui)', () => {
    expect(LINHAS.filter((l) => l.tabela === 'FOLHA_REGRA')).toHaveLength(25);
    expect(LINHAS.filter((l) => l.tabela === 'DP_CATEGORIA_ENCARGO')).toHaveLength(4);
    expect(createHash('sha256').update(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_DP_REGRAS, 'utf8'))).digest('hex')).toBe('c90636306e0fef98bd4b541b6416d88382fad00c999c219986c932c459f00a72');
  });

  it('item 65 — toda linha é PUBLISHED, tem fonte e id único; só as duas decisões registradas ficam sem SHA de arquivo', () => {
    for (const l of LINHAS) expect([l.status, l.fonte.length > 0]).toEqual(['PUBLISHED', true]);
    expect(new Set(LINHAS.map((l) => l.id)).size).toBe(LINHAS.length);
    expect(LINHAS.filter((l) => l.fonteSha256 === null).map((l) => l.id).sort()).toEqual(['dp-regra-arredondamento-2026', 'dp-regra-divisor-2026']);
  });

  it('itens 65–66 — toda linha está no formato da tabela; as duas tabelas são migradas (DRAFT → PUBLISHED → REVOKED, item 75)', () => {
    const fora = LINHAS.map((l) => ({ id: l.id, erro: erroDeFormato({ ...l, tabela: l.tabela as never, valorJson: json(l) }) })).filter((x) => x.erro !== null);
    expect(fora).toEqual([]);
    expect([TABELAS_MIGRADAS.has('FOLHA_REGRA'), TABELAS_MIGRADAS.has('DP_CATEGORIA_ENCARGO')]).toEqual([true, true]);
  });

  it('formato recusa chave fora do catálogo, texto fora das formas do código e inteiro fora da faixa', () => {
    expect(erroDeFormato({ tabela: 'FOLHA_REGRA', chave: 'HE_ADICIONAL_INVENTADO', valorInt: 1 })).toMatch(/chave fora do catálogo/);
    expect(erroDeFormato({ tabela: 'FOLHA_REGRA', chave: 'SALARIO_HORA_DIVISOR', valorTexto: 'POR_220' })).toMatch(/SEMANA_SEIS_DIAS\|DIAS_DE_TRABALHO_DA_ESCALA/);
    expect(erroDeFormato({ tabela: 'FOLHA_REGRA', chave: 'REPOUSO_DIAS_MIN', valorInt: 8 })).toMatch(/0\.\.7/);
    expect(erroDeFormato({ tabela: 'FOLHA_REGRA', chave: 'HE_ADICIONAL_BP', valorTexto: '5000' })).toMatch(/valorInt/);
    expect(erroDeFormato({ tabela: 'DP_CATEGORIA_ENCARGO', chave: '101', valorJson: { inss: 'EMPREGADO', fgtsChave: 'FGTS_10', irrf: true } })).toMatch(/fgtsChave/);
  });
});

describe('DP-F2 PR-0R item 67 — regrasFolha(fotografia, data)', () => {
  it('valores iniciais em 2026-03-15, cada um com a linha de onde veio', () => {
    const r = regrasFolha(LINHAS, '2026-03-15');
    expect({
      he: v(r.heAdicionalBp), heRepouso: v(r.heRepousoAdicionalBp),
      noturno: [v(r.noturno.adicionalBp), v(r.noturno.horaSegundos), v(r.noturno.inicioMin), v(r.noturno.fimMin)],
      afast: v(r.afastamentoDiasEmpresa), base: v(r.mensalistaBaseDias), semana: v(r.semanaDsrInicio),
      limite: v(r.jornadaLimiteSemanalMin), repouso: v(r.repousoDiasMin), divisor: v(r.salarioHoraDivisor),
      arrInss: v(r.arredondamentoInss), arr: v(r.arredondamento), sf: v(r.salarioFamiliaIdadeMax),
    }).toEqual({
      he: 5000, heRepouso: 10000, noturno: [2000, 3150, 1320, 300], afast: 15, base: 30, semana: 'SEG',
      limite: 2640, repouso: 1, divisor: 'SEMANA_SEIS_DIAS', arrInss: 'TRUNCAR_POR_FAIXA', arr: 'MEIO_PARA_CIMA_CENTAVO', sf: 14,
    });
    expect(r.heAdicionalBp.linhaId).toBe('dp-regra-he-adicional-1988');
    expect(Object.fromEntries(CATEGORIAS_NUCLEO.map((c) => [c, v(r.encargoPorCategoria[c])]))).toEqual({
      '101': { inss: 'EMPREGADO', fgtsChave: 'FGTS_BP', irrf: true },
      '103': { inss: 'EMPREGADO', fgtsChave: 'FGTS_APRENDIZ_BP', irrf: true },
      '901': { inss: 'NENHUM', fgtsChave: null, irrf: true },
      '723': { inss: 'CONTRIBUINTE_INDIVIDUAL', fgtsChave: null, irrf: true },
    });
  });

  it('EC 141/2026 é vigência, não data no código: 44 h → 42 h em 16/12/2026 → 40 h em 16/12/2027; 1 → 2 dias de repouso; divisor pela escala', () => {
    const em = (d: string) => {
      const r = regrasFolha(LINHAS, d);
      return [v(r.jornadaLimiteSemanalMin), v(r.repousoDiasMin), v(r.salarioHoraDivisor)];
    };
    expect(em('2026-12-15')).toEqual([2640, 1, 'SEMANA_SEIS_DIAS']);
    expect(em('2026-12-16')).toEqual([2520, 2, 'DIAS_DE_TRABALHO_DA_ESCALA']);
    expect(em('2027-12-15')).toEqual([2520, 2, 'DIAS_DE_TRABALHO_DA_ESCALA']);
    expect(em('2027-12-16')).toEqual([2400, 2, 'DIAS_DE_TRABALHO_DA_ESCALA']);
  });

  it('linha ausente ⇒ ParametroLegalAusenteError nomeando tabela, chave e data; nunca o valor de outra vigência', () => {
    const sem = LINHAS.filter((l) => l.id !== 'dp-regra-jornada-limite-2027');
    expect(() => regrasFolha(sem, '2028-01-01')).toThrow(ParametroLegalAusenteError);
    expect(() => regrasFolha(sem, '2028-01-01')).toThrow('Sem linha vigente de FOLHA_REGRA/JORNADA_LIMITE_SEMANAL_MIN em 2028-01-01');
    // Antes da 1ª vigência das decisões registradas (2026-01-01) o leitor não inventa arredondamento.
    expect(() => regrasFolha(LINHAS, '2025-12-31')).toThrow('FOLHA_REGRA/ARREDONDAMENTO_INSS em 2025-12-31');
  });

  it('item 66 — categoria sem linha ⇒ PARAMETRO_LEGAL_AUSENTE; texto fora das formas do código ⇒ ausente', () => {
    expect(() => encargoDaCategoria(LINHAS, '701', '2026-03-15')).toThrow('DP_CATEGORIA_ENCARGO/701 em 2026-03-15');
    const torta = LINHAS.map((l) => (l.chave === 'SALARIO_HORA_DIVISOR' ? { ...l, valorTexto: 'POR_220' } : l));
    expect(() => regrasFolha(torta, '2026-03-15')).toThrow('FOLHA_REGRA/SALARIO_HORA_DIVISOR');
  });

  it('linha DRAFT ou substituída não vale; a substituta PUBLISHED vale', () => {
    const base = LINHAS.find((l) => l.chave === 'HE_ADICIONAL_BP')!;
    const nova = { ...base, id: 'nova', valorInt: 6000, supersedesId: base.id };
    expect(v(regraInt([...LINHAS, { ...nova, status: 'DRAFT' }], 'HE_ADICIONAL_BP', '2026-03-15'))).toBe(5000);
    expect(v(regraInt([...LINHAS, nova], 'HE_ADICIONAL_BP', '2026-03-15'))).toBe(6000);
  });
});
