/**
 * BE-INCR-PIS-COFINS PR-2 (nó X8, BRIEF itens 7, 8, 10, 11; testes 23 a, b, c, d, e) — a função pura da apuração mensal.
 * Números: Presumido R$ 100.000,00 ⇒ PIS 650,00 / Cofins 3.000,00 (IN 2.121 art. 128); Real ⇒ 1.650,00 / 7.600,00
 * (art. 150) menos créditos. Um teste verde prova a aritmética contra a tabela, não contra a lei (oráculo = contador, P-5).
 */
import { apurarPisCofinsMensal, modalidadeDoRegime, type EntradaPisCofins } from '../pisCofinsCalc';
import type { CreditoPisCofinsNota } from '../pisCofinsParams';
import { tabelaPisCofinsSemente } from '@test/helpers/legalParams';

const valor = (memoria: { codigo: string; valorCents: string }[], codigo: string) => memoria.find((m) => m.codigo === codigo)?.valorCents;
const nota = (pisCents: number, cofinsCents: number, derivado = false): CreditoPisCofinsNota => ({
  payableId: `p-${pisCents}`, documentNumber: null, issueDate: '2026-03-10', amountCents: pisCents + cofinsCents, baseCents: null, pisCents, cofinsCents, derivado,
});
const tabela = tabelaPisCofinsSemente(); // BE-INCR-LEGAL-PARAMS PR-1: a fotografia da semente da migração
const entrada = (e: Partial<EntradaPisCofins>): EntradaPisCofins => ({
  tabela, ano: 2026, periodo: 'M03', modalidade: 'CUMULATIVO', receitaServicoCents: 10_000_000n, receitaRevendaCents: 0n,
  ajustesBase: [], outrosCreditos: [], retencoes: [], creditosNfe: [], saldoAnterior: { tipo: 'NENHUM' }, ...e,
});

describe('apurarPisCofinsMensal', () => {
  it('23 (a) Presumido: 100.000,00 ⇒ PIS 650,00 / Cofins 3.000,00, códigos 810902/217201, sem linha de crédito', () => {
    const r = apurarPisCofinsMensal(entrada({}));
    expect(r.PIS).toMatchObject({ modo: 'PIS_COFINS_CUMULATIVO', codigoReceita: '810902', baseCents: 10_000_000n, devidoCents: 65_000n, aPagarCents: 65_000n, saldoNegativoCents: 0n });
    expect(r.COFINS).toMatchObject({ codigoReceita: '217201', devidoCents: 300_000n, aPagarCents: 300_000n });
    expect(r.PIS.memoria.some((m) => m.codigo.startsWith('CREDITO') || m.codigo.startsWith('SALDO'))).toBe(false);
    expect(r.PIS.memoria.every((m) => m.fonte.trim() !== '')).toBe(true);
  });

  it('23 (a) Real: débito 1.650,00 / 7.600,00 menos o crédito da NF-e e dos outros incisos', () => {
    const r = apurarPisCofinsMensal(
      entrada({
        modalidade: 'NAO_CUMULATIVO',
        creditosNfe: [nota(140, 644), nota(10, 46, true)],
        outrosCreditos: [{ inciso: 'III_ENERGIA', baseCents: '100000', documento: 'conta de luz 03/2026' }],
      }),
    );
    // energia: 1.000,00 × 1,65% = 16,50 / × 7,6% = 76,00
    expect(r.PIS).toMatchObject({ modo: 'PIS_COFINS_NAO_CUMULATIVO', codigoReceita: '691201', devidoCents: 165_000n, deducoesCents: 140n + 10n + 1_650n, aPagarCents: 165_000n - 1_800n });
    expect(r.COFINS).toMatchObject({ codigoReceita: '585601', devidoCents: 760_000n, aPagarCents: 760_000n - 644n - 46n - 7_600n });
    expect(valor(r.PIS.memoria, 'CREDITO_NFE')).toBe('140');
    expect(valor(r.PIS.memoria, 'CREDITO_NFE_DERIVADO')).toBe('10');
    expect(r.PIS.memoria.find((m) => m.codigo === 'CREDITO_III_ENERGIA_1')).toMatchObject({ valorCents: '1650', fonte: 'Lei 10.833/2003 art. 3º III' });
    expect(valor(r.PIS.memoria, 'SALDO_CREDOR')).toBe('0');
  });

  it('23 (b) crédito > débito ⇒ a pagar 0 + saldo credor; o mês seguinte o consome', () => {
    const m01 = apurarPisCofinsMensal(entrada({ periodo: 'M01', modalidade: 'NAO_CUMULATIVO', receitaServicoCents: 10_000n, creditosNfe: [nota(1_000, 4_600)] }));
    expect(m01.PIS).toMatchObject({ devidoCents: 165n, aPagarCents: 0n, saldoNegativoCents: 835n });
    expect(m01.COFINS).toMatchObject({ devidoCents: 760n, aPagarCents: 0n, saldoNegativoCents: 3_840n });

    const m02 = apurarPisCofinsMensal(
      entrada({ periodo: 'M02', modalidade: 'NAO_CUMULATIVO', saldoAnterior: { tipo: 'LIDO', periodo: 'M01', ano: 2026, PIS: m01.PIS.saldoNegativoCents, COFINS: m01.COFINS.saldoNegativoCents } }),
    );
    expect(m02.PIS).toMatchObject({ aPagarCents: 165_000n - 835n, saldoNegativoCents: 0n });
    expect(m02.COFINS).toMatchObject({ aPagarCents: 760_000n - 3_840n });
    expect(m02.PIS.memoria.find((m) => m.codigo === 'SALDO_CREDOR_ANTERIOR')).toMatchObject({ valorCents: '835', descricao: expect.stringContaining('M01/2026') });
  });

  it('item 8: retenção acima do devido depois do crédito ⇒ a pagar 0 e excedente na memória, sem virar saldo credor', () => {
    const r = apurarPisCofinsMensal(entrada({ retencoes: [{ tributo: 'PIS', valorCents: '70000', documento: 'nota 12' }] }));
    expect(r.PIS).toMatchObject({ aPagarCents: 0n, saldoNegativoCents: 0n, deducoesCents: 70_000n });
    expect(valor(r.PIS.memoria, 'RETENCAO_EXCEDENTE')).toBe('5000');
    expect(r.COFINS.aPagarCents).toBe(300_000n); // a retenção do PIS não toca a Cofins
  });

  it('item 7: ajustes reduzem a base e ficam na memória com a fonte; acima da receita da atividade ⇒ 400 (23 d)', () => {
    const r = apurarPisCofinsMensal(
      entrada({
        receitaRevendaCents: 2_000_000n,
        ajustesBase: [
          { tipo: 'ALIQUOTA_ZERO_REVENDA', valorCents: '1500000' },
          { tipo: 'COTA_PARTE_PARCEIRO', valorCents: '4000000', documento: 'contrato 7/2026' },
        ],
      }),
    );
    expect(r.PIS.baseCents).toBe(12_000_000n - 5_500_000n);
    expect(r.PIS.memoria.find((m) => m.codigo === 'AJUSTE_ALIQUOTA_ZERO_1')).toMatchObject({ valorCents: '1500000', fonte: expect.stringContaining('Lei 10.147/2000 art. 2º') });
    expect(r.PIS.memoria.find((m) => m.codigo === 'AJUSTE_COTA_PARTE_1')).toMatchObject({ fonte: 'Lei 12.592/2012 art. 1º-A § 5º', descricao: expect.stringContaining('contrato 7/2026') });

    expect(() => apurarPisCofinsMensal(entrada({ ajustesBase: [{ tipo: 'ALIQUOTA_ZERO_REVENDA', valorCents: '1' }] }))).toThrow(/ALIQUOTA_ZERO_REVENDA/);
    expect(() => apurarPisCofinsMensal(entrada({ ajustesBase: [{ tipo: 'COTA_PARTE_PARCEIRO', valorCents: '10000001', documento: 'c' }] }))).toThrow(/COTA_PARTE_PARCEIRO/);
    expect(() => apurarPisCofinsMensal(entrada({ ajustesBase: [{ tipo: 'COTA_PARTE_PARCEIRO', valorCents: '1' }] }))).toThrow(/contrato de parceria/);
  });

  it('item 8: cumulativo com outrosCreditos ou saldo anterior informado > 0 ⇒ 400 "cumulativo não tem crédito"', () => {
    expect(() => apurarPisCofinsMensal(entrada({ outrosCreditos: [{ inciso: 'IV_ALUGUEL_PJ', baseCents: '100' }] }))).toThrow(/cumulativo não tem crédito/);
    expect(() => apurarPisCofinsMensal(entrada({ saldoAnterior: { tipo: 'INFORMADO', PIS: 1n, COFINS: 0n } }))).toThrow(/cumulativo não tem crédito/);
  });

  it('23 (e) 2027-01 ⇒ 400 (revogados — LC 214 art. 542); SIMPLES/MEI ⇒ 400 (DAS); regime → modalidade', () => {
    expect(() => apurarPisCofinsMensal(entrada({ ano: 2027, periodo: 'M01' }))).toThrow(/revogados.*LC 214\/2025 art\. 542/);
    expect(() => modalidadeDoRegime('SIMPLES')).toThrow(/DAS/);
    expect(() => modalidadeDoRegime('MEI')).toThrow(/DAS/);
    expect([modalidadeDoRegime('PRESUMIDO'), modalidadeDoRegime('REAL')]).toEqual(['CUMULATIVO', 'NAO_CUMULATIVO']);
  });
});
