/**
 * BE-INCR-PAIS-NA-BORDA-F3 itens 4, 6 e 9 — a composição da factory (`LEGAL_PARAMETER_FORMATS`) cobre o catálogo inteiro,
 * uma registração por tabela, com o dono do §5 (F-F3-2 a: as cinco compartilhadas são da contabilidade); e as seis tabelas
 * que caíam no fallback do serviço agora têm registração explícita, com o envelope único de mensagem (F-F3-7 a).
 */
import { LEGAL_PARAMS_SEED_FILE, legalParamsSeedRows } from '@test/helpers/legalParams';
import { LEGAL_PARAMETER_FORMATS } from '../../../lib/factory';
import { ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS } from '../../accounting/paises/br/legalParameters';
import { DP_BR_LEGAL_PARAMETER_FORMATS } from '../../dp/paises/br/legalParameters';
import { createFormatRegistry, type LinhaParaFormato } from '../models/formatRegistry';
import { ACCOUNTING_LEGAL_TABLES } from '../../accounting/models/legalTables';
import { DP_LEGAL_TABLES, DP_SHARED_LEGAL_TABLES_READ } from '../../dp/models/legalTables';

const registry = createFormatRegistry(LEGAL_PARAMETER_FORMATS);

describe('cobertura do catálogo (item 9)', () => {
  it('todo nome do catálogo tem exatamente uma registração, e toda registração tem nome no catálogo', () => {
    const registradas = LEGAL_PARAMETER_FORMATS.map((r) => r.table);
    expect(new Set(registradas).size).toBe(registradas.length);
    expect([...registradas].sort()).toEqual([...ACCOUNTING_LEGAL_TABLES, ...DP_LEGAL_TABLES].sort());
    expect(registradas).toHaveLength(56);
  });

  it('item 13 (F-F3-1 a): cada borda registra exatamente os nomes que o centro do seu domínio declara; o que o DP lê da contabilidade é dela', () => {
    expect(ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS.map((r) => r.table).sort()).toEqual([...ACCOUNTING_LEGAL_TABLES].sort());
    expect(DP_BR_LEGAL_PARAMETER_FORMATS.map((r) => r.table).sort()).toEqual([...DP_LEGAL_TABLES].sort());
    for (const t of DP_SHARED_LEGAL_TABLES_READ) expect(ACCOUNTING_LEGAL_TABLES).toContain(t);
  });

  it('a factory compõe exatamente as bordas da contabilidade BR e do DP BR (os testes de domínio montam a mesma união)', () => {
    expect(LEGAL_PARAMETER_FORMATS).toEqual([...ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS, ...DP_BR_LEGAL_PARAMETER_FORMATS]);
  });

  it('dono de cada tabela (§5; F-F3-2 a) e país br', () => {
    const dono = (d: string) => registry.tables().filter((t) => t.domain === d).map((t) => t.table).sort();
    expect(dono('dp')).toEqual(
      ['DP_CATEGORIA_ENCARGO', 'ESOCIAL_CATEGORIA', 'ESOCIAL_INCIDENCIA_RUBRICA', 'ESOCIAL_MOTIVO_AFASTAMENTO', 'ESOCIAL_NATUREZA_RUBRICA', 'ESOCIAL_TIPO_DEPENDENTE', 'FAP_ESTABELECIMENTO', 'FAP_LIMITES', 'FOLHA_REGRA', 'FPAS_EMPRESA', 'INSS_EMPREGADO', 'RAT_ALIQUOTA', 'RAT_GRAU_ESTABELECIMENTO', 'TERCEIROS_FPAS'],
    );
    expect(dono('accounting')).toHaveLength(42);
    for (const t of ['FERIADO_NACIONAL', 'FERIADO_LOCAL', 'SALARIO_MINIMO', 'IRRF_PF_MENSAL', 'ENCARGO_FOLHA']) expect(dono('accounting')).toContain(t);
    expect(new Set(registry.tables().map((t) => t.country))).toEqual(new Set(['br']));
  });
});

describe('fallback do PR-1 vira registração explícita (item 4)', () => {
  it('as linhas de TAX_ASSESSMENT e PIS_COFINS da semente passam', () => {
    const rows = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE).filter((r) => r.tabela === 'TAX_ASSESSMENT' || r.tabela === 'PIS_COFINS');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const l: LinhaParaFormato = { tabela: r.tabela, chave: r.chave, discriminador: r.discriminador, valorInt: r.valorInt, valorTexto: r.valorTexto };
      expect([r.id, registry.formatError(l)]).toEqual([r.id, null]);
    }
  });

  it('PIS_COFINS com discriminador X e TAX_ASSESSMENT sem o valor certo dão o envelope único (F-F3-7 a)', () => {
    expect(registry.formatError({ tabela: 'PIS_COFINS', chave: 'PIS', discriminador: 'X', valorInt: 165 })).toBe(
      'PIS_COFINS/PIS: chave PIS|COFINS e discriminador CUMULATIVO|NAO_CUMULATIVO.',
    );
    expect(registry.formatError({ tabela: 'TAX_ASSESSMENT', chave: 'ARREDONDAMENTO', valorInt: 1 })).toBe('TAX_ASSESSMENT: o valor desta tabela é valorTexto.');
    expect(registry.formatError({ tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ', valorTexto: 'x' })).toBe('TAX_ASSESSMENT: o valor desta tabela é valorInt.');
    for (const t of ['CSLL_ALIQUOTA', 'SIMPLES_LIMITE', 'SIMEI_VALOR', 'SALARIO_MINIMO']) {
      expect(registry.formatError({ tabela: t, chave: 'K', valorInt: 1 })).toBeNull();
      expect(registry.formatError({ tabela: t, chave: 'K', valorTexto: 'a' })).toBe(`${t}: o valor desta tabela é valorInt.`);
    }
  });

  it('fim obrigatório (lacuna 03e4, F-F3-6 a): PIS_COFINS inteira e ISS_LIMITE/ALIQUOTA_MAX_BP, declarados pela contabilidade; FAP_ESTABELECIMENTO, pelo DP', () => {
    expect(registry.endRequiredError({ tabela: 'PIS_COFINS', chave: 'COFINS', vigenteAte: null })).toMatch(/^PIS_COFINS\/COFINS: vigenteAte é obrigatório/);
    expect(registry.endRequiredError({ tabela: 'ISS_LIMITE', chave: 'ALIQUOTA_MAX_BP', vigenteAte: null })).toMatch(/^ISS_LIMITE\/ALIQUOTA_MAX_BP: vigenteAte é obrigatório/);
    expect(registry.endRequiredError({ tabela: 'ISS_LIMITE', chave: 'ALIQUOTA_MIN_BP', vigenteAte: null })).toBeNull();
    const comFim = LEGAL_PARAMETER_FORMATS.filter((r) => r.endRequired).map((r) => r.table).sort();
    // DP-PONTE-RAZAO PR-P1 item 7: o FAP do estabelecimento vale por ano (Dec. 3.048 art. 202-A), então publica o fim.
    expect(comFim).toEqual(['FAP_ESTABELECIMENTO', 'ISS_LIMITE', 'PIS_COFINS']);
  });
});
