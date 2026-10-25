/**
 * PRESUMIDO-TETO-78MI (BRIEF itens 1–3, 6–7; invariantes 1–3, 9) — a tabela em reais e a função pura do teto.
 */
import fs from 'fs';
import path from 'path';
import { erroDeFormato, type LinhaParaFormato } from '../../../legalParameters/models/formatoLinha';
import { mesesAtividadeAnterior, tetoCents, tetoPresumido, type TetoPresumidoInput } from '../presumidoTeto';
import { UpsertCompanyFiscalProfileSchema } from '../../dtos/CompanyFiscalProfileDto';
import { LEGAL_PARAMS_SEED_FILE_PRESUMIDO_TETO, legalParamsSeedRows, tabelaApuracaoSemente } from '@test/helpers/legalParams';

const T = tabelaApuracaoSemente();
const MIGRATION = path.resolve(__dirname, '../../../../../prisma/migrations/20261024120000_presumido_teto_78mi/migration.sql');
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const TETO = 7_800_000_000n;
const base: TetoPresumidoInput = {
  ano: 2026,
  receitaRazaoCents: null,
  receitaDeclaradaCents: null,
  razaoValido: true,
  mesesAtividadeAnterior: 12,
  inicioAtividadeNoAno: false,
  tabela: T,
};

describe('item 1 (F-PT-7 a) — teto na tabela TAX_ASSESSMENT, em reais', () => {
  it('o migration.sql carrega o texto de prisma/data/legal_parameters_presumido_teto_v1.sql; 2 linhas PUBLISHED com a Lei 9.718 e formato aceito', () => {
    expect(norm(fs.readFileSync(MIGRATION, 'utf8'))).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_PRESUMIDO_TETO, 'utf8')).trimEnd());
    const rows = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_PRESUMIDO_TETO);
    expect(rows.map((r) => [r.tabela, r.chave, r.valorInt, r.vigenteDesde, r.status])).toEqual([
      ['TAX_ASSESSMENT', 'PRESUMIDO_TETO_ANO_REAIS', 78_000_000, '2014-01-01', 'PUBLISHED'],
      ['TAX_ASSESSMENT', 'PRESUMIDO_TETO_MES_REAIS', 6_500_000, '2014-01-01', 'PUBLISHED'],
    ]);
    for (const r of rows) {
      expect(r.fonte).toContain('Lei 9.718/1998 art. 13 caput e art. 14 I');
      expect(erroDeFormato({ ...r, valorJson: undefined } as LinhaParaFormato)).toBeNull();
    }
  });

  it('leitura em 2014-01-01 e em 2026-01-01 ⇒ 7.800.000.000n / 650.000.000n centavos; antes de 2014 ⇒ erro nomeado', () => {
    for (const ano of [2014, 2026]) {
      expect(tetoCents(T, 'PRESUMIDO_TETO_ANO_REAIS', ano)).toBe(TETO);
      expect(tetoCents(T, 'PRESUMIDO_TETO_MES_REAIS', ano)).toBe(650_000_000n);
    }
    expect(() => tetoCents(T, 'PRESUMIDO_TETO_ANO_REAIS', 2013)).toThrow(/Sem linha vigente de TAX_ASSESSMENT\/PRESUMIDO_TETO_ANO_REAIS em 2013-01-01/);
  });
});

describe('item 2 — tetoPresumido', () => {
  it('invariante 1: 78.000.000,00 exato ⇒ DENTRO; +1 centavo ⇒ EXCEDIDO, com o artigo no aviso', () => {
    expect(tetoPresumido({ ...base, receitaRazaoCents: TETO })).toMatchObject({ situacao: 'DENTRO', limiteCents: TETO, avisos: [] });
    const r = tetoPresumido({ ...base, receitaRazaoCents: TETO + 1n });
    expect(r).toMatchObject({ situacao: 'EXCEDIDO', receitaUsadaCents: TETO + 1n, fonte: 'RAZAO' });
    expect(r.avisos.join(' ')).toContain('Lei 9.718/1998 art. 13 caput e art. 14 I');
  });

  it('6 meses e R$ 39.000.000,01 ⇒ EXCEDIDO; R$ 39.000.000,00 ⇒ DENTRO', () => {
    expect(tetoPresumido({ ...base, mesesAtividadeAnterior: 6, receitaRazaoCents: 3_900_000_001n })).toMatchObject({ situacao: 'EXCEDIDO', limiteCents: 3_900_000_000n, mesesConsiderados: 6 });
    expect(tetoPresumido({ ...base, mesesAtividadeAnterior: 6, receitaRazaoCents: 3_900_000_000n }).situacao).toBe('DENTRO');
  });

  it('invariante 2: início no próprio ano ⇒ NAO_SE_APLICA, mesmo com receita acima', () => {
    expect(tetoPresumido({ ...base, inicioAtividadeNoAno: true, receitaRazaoCents: TETO * 2n })).toMatchObject({ situacao: 'NAO_SE_APLICA', avisos: [] });
  });

  it('invariante 3 / item 7: sem receita ⇒ NAO_CONFERIDO; caixa em Y−1 ignora o razão (só a declarada vale)', () => {
    expect(tetoPresumido(base).situacao).toBe('NAO_CONFERIDO');
    const caixa = tetoPresumido({ ...base, razaoValido: false, receitaRazaoCents: TETO * 2n });
    expect(caixa.situacao).toBe('NAO_CONFERIDO');
    expect(caixa.avisos.join(' ')).toContain('art. 13 § 2º');
    expect(tetoPresumido({ ...base, razaoValido: false, receitaRazaoCents: TETO * 2n, receitaDeclaradaCents: 1n })).toMatchObject({ situacao: 'DENTRO', fonte: 'DECLARADA' });
  });

  it('item 6 (F-PT-2 c): os 4 casos — só razão, só declarada, iguais sem aviso, diferentes ⇒ a maior + aviso', () => {
    expect(tetoPresumido({ ...base, receitaRazaoCents: 10n })).toMatchObject({ receitaUsadaCents: 10n, fonte: 'RAZAO', avisos: [] });
    expect(tetoPresumido({ ...base, receitaDeclaradaCents: 20n })).toMatchObject({ receitaUsadaCents: 20n, fonte: 'DECLARADA', avisos: [] });
    expect(tetoPresumido({ ...base, receitaRazaoCents: 30n, receitaDeclaradaCents: 30n })).toMatchObject({ receitaUsadaCents: 30n, avisos: [] });
    const d = tetoPresumido({ ...base, receitaRazaoCents: 10n, receitaDeclaradaCents: TETO + 1n });
    expect(d).toMatchObject({ situacao: 'EXCEDIDO', receitaUsadaCents: TETO + 1n, fonte: 'DECLARADA' });
    expect(d.avisos[0]).toBe('receita de 2025 no razão (R$ 0,10) difere da declarada (R$ 78.000.000,01) — usada a maior.');
  });

  it('item 3: meses null ⇒ teto anual + aviso "não informados"', () => {
    const r = tetoPresumido({ ...base, mesesAtividadeAnterior: null, receitaRazaoCents: 1n });
    expect(r).toMatchObject({ situacao: 'DENTRO', limiteCents: TETO, mesesConsiderados: 12 });
    expect(r.avisos).toEqual(['meses de atividade de 2025 não informados — usado o teto anual.']);
  });
});

describe('item 3 (F-PT-4 a) — mesesAtividadeAnterior', () => {
  it('início em Y−1 ⇒ 13 − mês (o mês de início conta inteiro); antes de Y−1 ⇒ 12; sem data ⇒ null', () => {
    expect([mesesAtividadeAnterior(2026, '2025-01-31'), mesesAtividadeAnterior(2026, '2025-07-15'), mesesAtividadeAnterior(2026, '2025-12-01')]).toEqual([12, 6, 1]);
    expect(mesesAtividadeAnterior(2026, '2019-05-10')).toBe(12);
    expect(mesesAtividadeAnterior(2026, null)).toBeNull();
  });
});

describe('item 5 — DTO receitaTotalAnoAnteriorCents', () => {
  const parse = (regime: string, v: unknown) => UpsertCompanyFiscalProfileSchema.safeParse({ unitId: 'u', regime, receitaTotalAnoAnteriorCents: v });
  it('invariante 9: R$ 78.000.000,01 aceito no PRESUMIDO e no REAL (nenhum teto de DTO abaixo do legal); ausente ⇒ null', () => {
    expect(parse('PRESUMIDO', 7_800_000_001).success).toBe(true);
    expect(parse('REAL', 7_800_000_001).success).toBe(true);
    const sem = UpsertCompanyFiscalProfileSchema.parse({ unitId: 'u', regime: 'PRESUMIDO' });
    expect(sem.receitaTotalAnoAnteriorCents).toBeNull();
  });
  it('SIMPLES/MEI com o campo ⇒ issue no próprio campo; negativo ou fracionário ⇒ recusa', () => {
    for (const regime of ['SIMPLES', 'MEI']) {
      const r = parse(regime, 1);
      expect(r.success).toBe(false);
      expect(r.error?.issues.map((i) => i.path.join('.'))).toContain('receitaTotalAnoAnteriorCents');
    }
    expect(parse('PRESUMIDO', -1).success).toBe(false);
    expect(parse('PRESUMIDO', 1.5).success).toBe(false);
  });
});
