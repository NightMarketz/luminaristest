/**
 * BE-INCR-TAX-ASSESSMENT-C — EMENDA RASTREIO (BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-EMENDA-RASTREIO-brief.md`
 * itens 6–10) — a planilha da memória de cálculo com a origem de cada linha, a versão dos parâmetros e o vencimento do
 * DARF. Puro (`linhasDaApuracao`, `vencimentoQuotaUnica`, `linhaMeta`); o export pelo serviço tem suíte própria.
 */
import type { TaxAssessment } from 'generated/prisma';
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { MEMO_COLUMNS, RastreioPersistidoInvalidoError, linhaMeta, linhasDaApuracao, vencimentoQuotaUnica } from '../taxAssessmentMemoExport';
import type { RastreioApuracao } from '../taxAssessmentRastreio';

const feriado = (mmdd: string): LinhaLegal => ({
  id: `f-${mmdd}`, tabela: 'FERIADO_NACIONAL', chave: mmdd, discriminador: null, valorInt: null, valorTexto: null, valorJson: null,
  fonte: 'teste', vigenteDesde: '2000-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null,
});
const BASE = [feriado('01-01')];
const col = (nome: (typeof MEMO_COLUMNS)[number]): number => MEMO_COLUMNS.indexOf(nome);

function apuracao(over: Partial<TaxAssessment> = {}): TaxAssessment {
  return {
    id: 'ta-t02', userId: 'owner-1', unitId: 'unit-1', anoCalendario: 2026, tributo: 'IRPJ', regime: 'PRESUMIDO',
    forma: 'TRIMESTRAL', periodo: 'T02', modo: 'PRESUMIDO', codigoReceita: '208901',
    baseCents: 100000n, devidoCents: 15000n, deducoesCents: 0n, aPagarCents: 15000n, saldoNegativoCents: 0n, diferencaPostergadaCents: 0n,
    memoria: [
      { codigo: 'RECEITA_SERVICO', descricao: 'Receita bruta de serviço do trimestre (conta 3.1)', valorCents: '300000', fonte: 'IN 1.700 art. 215' },
      { codigo: 'LC224_SOBRA_ANTERIOR', descricao: 'Diferença não usada', valorCents: '5', fonte: 'IN 2.305 art. 15 § 4º' },
      { codigo: 'ALIQUOTA', descricao: 'Base × 15%', valorCents: '15000', fonte: 'Lei 9.249 art. 3º' },
    ],
    tabelaVersao: 'lc224-2026-v1', parametrosIds: null, parametrosSha256: null, entradaInformada: null, avisoParametroLegal: null,
    rastreio: null, status: 'CONFIRMED', supersedesId: null, provisaoEntryId: null, confirmedById: 'owner-1',
    confirmedAt: new Date('2026-07-10T12:00:00.000Z'), createdAt: new Date('2026-07-10T12:00:00.000Z'),
    updatedAt: new Date('2026-07-10T12:00:00.000Z'), deletedAt: null,
    ...over,
  } as TaxAssessment;
}

const RASTREIO: RastreioApuracao = [
  {
    codigo: 'RECEITA_SERVICO', origemTipo: 'RAZAO', contas: [
      { accountCode: '3.1', accountName: 'Receita de Serviços', from: '2026-04-01', to: '2026-06-30', movimentoCents: '200000', saldoFinalCents: '450000' },
      { accountCode: '3.1.9', accountName: 'Serviços avulsos', from: '2026-04-01', to: '2026-06-30', movimentoCents: '100000' },
    ],
  },
  { codigo: 'LC224_SOBRA_ANTERIOR', origemTipo: 'MEMORIA_ANTERIOR', origemApuracaoId: 'ta-t01', origemPeriodo: 'T01' },
  { codigo: 'ALIQUOTA', origemTipo: 'PARAMETRO' },
];

describe('EMENDA RASTREIO item 9 — vencimento do DARF (quota única; Lei 9.430 arts. 5º, 6º e 28)', () => {
  it.each([
    // [período, feriados, esperado] — T01/2027: fim do trimestre em março ⇒ último dia útil de abril (30/04/2027, sexta)
    ['T01', BASE, '2027-04-30'],
    ['T01', [...BASE, feriado('04-30')], '2027-04-29'], // feriado nacional no último dia útil ⇒ recua
    ['A12', BASE, '2028-01-31'], // art. 6º: dezembro ⇒ janeiro do ano seguinte (31/01/2028, segunda)
    ['A12', [...BASE, feriado('01-31')], '2028-01-28'], // segunda feriado ⇒ sexta anterior
    ['A00', BASE, '2028-03-31'], // art. 6º § 1º I: último dia útil de março do ano seguinte (31/03/2028, sexta)
    ['A00', [...BASE, feriado('03-31')], '2028-03-30'],
    ['T04', BASE, '2028-01-31'],
    ['A05', BASE, '2027-06-30'],
  ] as const)('%s/2027 ⇒ %s', (periodo, feriados, esperado) => {
    expect(vencimentoQuotaUnica(2027, periodo, feriados)).toBe(esperado);
  });

  it('art. 28: a CSLL vence igual ao IRPJ; PIS/COFINS (M01, mesmo model) sai com a coluna vazia', () => {
    const irpj = linhasDaApuracao(apuracao(), BASE)[0][col('vencimentoDarf')];
    const csll = linhasDaApuracao(apuracao({ tributo: 'CSLL' }), BASE)[0][col('vencimentoDarf')];
    expect(irpj).toBe('2026-07-31');
    expect(csll).toBe(irpj);
    expect(linhasDaApuracao(apuracao({ tributo: 'PIS', periodo: 'M01' }), BASE)[0][col('vencimentoDarf')]).toBe('');
  });
});

describe('EMENDA RASTREIO itens 6–8 e 10 — planilha', () => {
  it('item 6: 29 colunas, as 16 de antes na mesma ordem, as 11 novas e as 2 da ECF (C8) ao fim', () => {
    expect(MEMO_COLUMNS).toHaveLength(29);
    expect(MEMO_COLUMNS.slice(0, 16)).toEqual([
      'anoCalendario', 'periodo', 'tributo', 'regime', 'forma', 'modo', 'codigoReceita', 'tabelaVersao', 'confirmedAt',
      'apuracaoId', 'substitui', 'tipoLinha', 'codigo', 'descricao', 'valorCents', 'fonte',
    ]);
    expect(MEMO_COLUMNS.slice(-2)).toEqual(['registroEcf', 'linhaEcf']);
  });

  it('item 7: RESUMO×6 → MEMORIA → RASTREIO×2 (uma por conta, codigo da mãe) → MEMORIA → MEMORIA', () => {
    const linhas = linhasDaApuracao(apuracao({ rastreio: RASTREIO }), BASE);
    expect(linhas.every((l) => l.length === MEMO_COLUMNS.length)).toBe(true);
    expect(linhas.map((l) => [l[col('tipoLinha')], l[col('codigo')]])).toEqual([
      ['RESUMO', 'base'], ['RESUMO', 'devido'], ['RESUMO', 'deducoes'], ['RESUMO', 'aPagar'], ['RESUMO', 'saldoNegativo'], ['RESUMO', 'diferencaPostergada'],
      ['MEMORIA', 'RECEITA_SERVICO'], ['RASTREIO', 'RECEITA_SERVICO'], ['RASTREIO', 'RECEITA_SERVICO'],
      ['MEMORIA', 'LC224_SOBRA_ANTERIOR'], ['MEMORIA', 'ALIQUOTA'],
    ]);
    // RASTREIO: descricao = nome da conta, valorCents = movimento, fonte = 'razão'; conta, janela e saldo nas colunas novas.
    expect(linhas[7].slice(12)).toEqual([
      'RECEITA_SERVICO', 'Receita de Serviços', '200000', 'razão', '2026-07-31', '', '', 'RAZAO', '', '',
      '3.1', 'Receita de Serviços', '2026-04-01', '2026-06-30', '450000', '', '',
    ]);
    expect(linhas[8][col('saldoFinalCents')]).toBe(''); // sem saldo gravado ⇒ vazio, não '0'
    // A soma das RASTREIO bate com a MEMORIA-mãe.
    expect(BigInt(linhas[7][col('valorCents')]) + BigInt(linhas[8][col('valorCents')])).toBe(BigInt(linhas[6][col('valorCents')]));
    // MEMORIA ganha a origem; a de outra apuração aponta o período de origem.
    expect(linhas[6][col('origemTipo')]).toBe('RAZAO');
    expect([linhas[9][col('origemTipo')], linhas[9][col('origemApuracaoId')], linhas[9][col('origemPeriodo')]]).toEqual(['MEMORIA_ANTERIOR', 'ta-t01', 'T01']);
    expect(linhas[10][col('origemTipo')]).toBe('PARAMETRO');
    expect(linhas[0][col('origemTipo')]).toBe(''); // RESUMO não tem origem de linha
  });

  it('item 6: apuração anterior à emenda (rastreio nulo) — sem RASTREIO; as 16 colunas iguais às de antes; origem vazia', () => {
    const linhas = linhasDaApuracao(apuracao(), BASE);
    expect(linhas.map((l) => l[col('tipoLinha')])).toEqual([...Array(6).fill('RESUMO'), 'MEMORIA', 'MEMORIA', 'MEMORIA']);
    expect(linhas[6].slice(0, 16)).toEqual([
      '2026', 'T02', 'IRPJ', 'PRESUMIDO', 'TRIMESTRAL', 'PRESUMIDO', '208901', 'lc224-2026-v1', '2026-07-10T12:00:00.000Z',
      'ta-t02', '', 'MEMORIA', 'RECEITA_SERVICO', 'Receita bruta de serviço do trimestre (conta 3.1)', '300000', 'IN 1.700 art. 215',
    ]);
    expect(linhas[6].slice(19, 27)).toEqual(['', '', '', '', '', '', '', '']);
    expect(linhas[6].slice(27)).toEqual(['P200', '8']); // C8: a linha da ECF do passo, mesmo sem rastreio
  });

  it('item 8: parametrosIds ordenados e ;-separados + sha256 em toda linha; anterior ao PR-4 ⇒ vazias', () => {
    const com = linhasDaApuracao(apuracao({ parametrosIds: ['lp-b', 'lp-a', 'lp-c'], parametrosSha256: 'abc123' }), BASE);
    expect(com.every((l) => l[col('parametrosIds')] === 'lp-a;lp-b;lp-c' && l[col('parametrosSha256')] === 'abc123')).toBe(true);
    const sem = linhasDaApuracao(apuracao(), BASE);
    expect(sem.every((l) => l[col('parametrosIds')] === '' && l[col('parametrosSha256')] === '')).toBe(true);
  });

  it('item 1: rastreio persistido inválido ⇒ erro com o id (500), não silencia', () => {
    expect(() => linhasDaApuracao(apuracao({ rastreio: [{ codigo: 'X', origemTipo: 'NOVO' }] }), BASE)).toThrow(RastreioPersistidoInvalidoError);
    expect(() => linhasDaApuracao(apuracao({ rastreio: [{ codigo: 'X', origemTipo: 'NOVO' }] }), BASE)).toThrow(/ta-t02/);
  });

  it('item 10: a linha-meta diz rastreio=v1', () => {
    expect(linhaMeta({ periodStart: '2026-01-01', periodEnd: '2026-12-31' }, 2, new Date('2026-11-03T00:00:00.000Z'))).toBe(
      '# kind=EXPORT_TAX_ASSESSMENT_MEMO; periodStart=2026-01-01; periodEnd=2026-12-31; apuracoes=2; geradoEm=2026-11-03T00:00:00.000Z; rastreio=v1',
    );
  });
});
