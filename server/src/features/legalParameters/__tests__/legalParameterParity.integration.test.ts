/**
 * BE-INCR-LEGAL-PARAMS PR-1 — teste de PARIDADE do item 6: para cada tabela migrada, o lookup antigo (a tabela em
 * código, congelada aqui como estava em `origin/main` 5c077e30) e o novo (banco semeado pela migração → serviço →
 * fotografia → adaptador) devolvem o mesmo valor E a mesma fonte em todas as chaves, nas datas de borda (véspera e
 * dia de cada vigência) e no fim de cada mês de 2025–2027. Só com este teste verde as tabelas TS saíram.
 */
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { linhaVigente, tabelaApuracaoDe, type AtividadePresuncao, type ChaveParametro } from '@/features/accounting/models/taxAssessmentParams';
import { parametroPisCofinsVigente, tabelaPisCofinsDe, type ModalidadePisCofins, type TributoPisCofins } from '@/features/accounting/models/pisCofinsParams';

// ─── Tabelas antigas, congeladas (git show 5c077e30:server/src/features/accounting/models/{taxAssessmentParams,pisCofinsParams}.ts)
type Antiga = { chave: ChaveParametro; atividade?: AtividadePresuncao; valor: number; fonte: string; vigenteDesde: string };
const LEI_9249 = '1996-01-01';
const IN_1700 = '2017-03-16';
const LEI_9250 = '1996-01-01';
const ANTIGA_APURACAO: Antiga[] = [
  { chave: 'IRPJ_ALIQ', valor: 1500, fonte: 'IN RFB 1.700/2017 art. 29 caput', vigenteDesde: IN_1700 },
  { chave: 'IRPJ_ADIC_ALIQ', valor: 1000, fonte: 'IN RFB 1.700/2017 art. 29 § 1º', vigenteDesde: IN_1700 },
  { chave: 'IRPJ_ADIC_LIMITE_MES_CENTS', valor: 2_000_000, fonte: 'IN RFB 1.700/2017 art. 29 §§ 1º–2º (R$ 20.000,00 × meses do período)', vigenteDesde: IN_1700 },
  { chave: 'PRESUNCAO_IRPJ', atividade: 'SERVICO', valor: 3200, fonte: 'Lei 9.249/1995 art. 15 § 1º III a', vigenteDesde: LEI_9249 },
  { chave: 'PRESUNCAO_IRPJ', atividade: 'REVENDA', valor: 800, fonte: 'Lei 9.249/1995 art. 15 caput', vigenteDesde: LEI_9249 },
  { chave: 'PRESUNCAO_CSLL', atividade: 'SERVICO', valor: 3200, fonte: 'Lei 9.249/1995 art. 20 (32% p/ as atividades do art. 15 § 1º III)', vigenteDesde: LEI_9249 },
  { chave: 'PRESUNCAO_CSLL', atividade: 'REVENDA', valor: 1200, fonte: 'Lei 9.249/1995 art. 20 caput', vigenteDesde: LEI_9249 },
  { chave: 'COMPENSACAO_TETO', valor: 3000, fonte: 'IN RFB 1.700/2017 art. 64', vigenteDesde: IN_1700 },
  { chave: 'LC224_ACRESCIMO_IRPJ', valor: 1000, fonte: 'IN RFB 2.305/2025 art. 14 e art. 3º I (IRPJ desde 01/01/2026)', vigenteDesde: '2026-01-01' },
  { chave: 'LC224_ACRESCIMO_CSLL', valor: 1000, fonte: 'IN RFB 2.305/2025 art. 14 e art. 3º II (CSLL desde 01/04/2026)', vigenteDesde: '2026-04-01' },
  { chave: 'LC224_LIMITE_TRIMESTRE_CENTS', valor: 125_000_000, fonte: 'IN RFB 2.305/2025 art. 15 § 2º (redação da IN 2.306/2026)', vigenteDesde: '2026-01-01' },
  { chave: 'PRESUNCAO_IRPJ_REDUZIDA', valor: 1600, fonte: 'IN RFB 1.700/2017 art. 33 § 7º e art. 215 § 10; Lei 9.250/1995 art. 40', vigenteDesde: LEI_9250 },
  { chave: 'RECEITA_LIMITE_REDUZIDA_ANO_CENTS', valor: 12_000_000, fonte: 'IN RFB 1.700/2017 art. 33 § 7º e art. 215 § 10; Lei 9.250/1995 art. 40 (R$ 120.000,00 no ano)', vigenteDesde: LEI_9250 },
];
const ANTIGA_CSLL: Record<string, { valor: number; fonte: string }> = {
  '1': { valor: 900, fonte: 'Lei 7.689/1988 art. 3º III' },
  '4': { valor: 1500, fonte: 'Lei 7.689/1988 art. 3º I' },
};
const IN_2121 = '2022-12-15';
const ATE = '2026-12-31';
const CODIGOS_FONTE = 'Receita Federal, DCTF — Tabelas de códigos de receita PIS (27/02/2024) e Cofins (27/07/2023)';
const ANTIGA_PIS_COFINS = [
  { tributo: 'PIS', modalidade: 'CUMULATIVO', aliquotaBp: 65, codigoReceita: '810902', fonte: `IN RFB 2.121/2022 art. 128; ${CODIGOS_FONTE}`, vigenteDesde: IN_2121, vigenteAte: ATE },
  { tributo: 'COFINS', modalidade: 'CUMULATIVO', aliquotaBp: 300, codigoReceita: '217201', fonte: `IN RFB 2.121/2022 art. 128; Lei 9.718/1998 art. 8º; ${CODIGOS_FONTE}`, vigenteDesde: IN_2121, vigenteAte: ATE },
  { tributo: 'PIS', modalidade: 'NAO_CUMULATIVO', aliquotaBp: 165, codigoReceita: '691201', fonte: `IN RFB 2.121/2022 art. 150; Lei 10.637/2002 art. 2º; ${CODIGOS_FONTE}`, vigenteDesde: IN_2121, vigenteAte: ATE },
  { tributo: 'COFINS', modalidade: 'NAO_CUMULATIVO', aliquotaBp: 760, codigoReceita: '585601', fonte: `IN RFB 2.121/2022 art. 150; Lei 10.833/2003 art. 2º; ${CODIGOS_FONTE}`, vigenteDesde: IN_2121, vigenteAte: ATE },
] as const;

function antigaApuracao(chave: ChaveParametro, data: string, atividade?: AtividadePresuncao): Antiga | undefined {
  let melhor: Antiga | undefined;
  for (const p of ANTIGA_APURACAO) {
    if (p.chave !== chave || p.atividade !== atividade || p.vigenteDesde > data) continue;
    if (!melhor || p.vigenteDesde > melhor.vigenteDesde) melhor = p;
  }
  return melhor;
}

const vespera = (d: string): string => new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
const fimDoMes = (ano: number, m: number): string => new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);

/** Datas apuráveis (o 1º ano apurável é 2025, `taxAssessmentParams.ts`): fim de cada mês 2025–2027 + bordas das vigências ≥ 2025. */
const DATAS = [
  ...[2025, 2026, 2027].flatMap((a) => Array.from({ length: 12 }, (_, i) => fimDoMes(a, i + 1))),
  ...['2026-01-01', '2026-04-01', '2027-01-01'].flatMap((d) => [vespera(d), d]),
  '2025-01-01',
  ATE,
];

describe('BE-INCR-LEGAL-PARAMS item 6 — paridade tabela em código × banco', () => {
  beforeAll(() => pushTestSchema());
  afterEach(() => resetDb());
  afterAll(() => disconnectDb());

  it('TAX_ASSESSMENT: mesmo valor e mesma fonte em toda chave × atividade × data', async () => {
    const t = tabelaApuracaoDe(await getFactory().getLegalParameterService().fotografia(['TAX_ASSESSMENT', 'CSLL_ALIQUOTA', 'CODIGO_RECEITA']));
    const pares = [...new Set(ANTIGA_APURACAO.map((p) => `${p.chave}|${p.atividade ?? ''}`))];
    let comparados = 0;
    for (const par of pares) {
      const [chave, atv] = par.split('|') as [ChaveParametro, string];
      const atividade = (atv || undefined) as AtividadePresuncao | undefined;
      for (const data of DATAS) {
        const antiga = antigaApuracao(chave, data, atividade);
        const nova = linhaVigente(t, chave, data, atividade);
        expect([par, data, nova?.valor, nova?.fonte]).toEqual([par, data, antiga?.valor, antiga?.fonte]);
        comparados += 1;
      }
    }
    expect(comparados).toBe(pares.length * DATAS.length);
    expect(t.linhas).toHaveLength(ANTIGA_APURACAO.length);
  });

  it('CSLL_ALIQUOTA: indicadores 1 e 4 com mesmo valor e fonte em toda data apurável; indicador ausente segue ausente', async () => {
    const t = tabelaApuracaoDe(await getFactory().getLegalParameterService().fotografia(['TAX_ASSESSMENT', 'CSLL_ALIQUOTA', 'CODIGO_RECEITA']));
    for (const data of DATAS) {
      for (const ind of ['1', '4']) expect(t.aliquotaCsll(ind, data)).toEqual(ANTIGA_CSLL[ind]);
      for (const ind of ['2', '3']) expect(t.aliquotaCsll(ind, data)).toBeUndefined();
    }
  });

  it('PIS_COFINS: mesma alíquota, código, fonte e vigência em todo tributo × modalidade × data (2027 não resolve)', async () => {
    const t = tabelaPisCofinsDe(await getFactory().getLegalParameterService().fotografia(['PIS_COFINS', 'CODIGO_RECEITA']));
    for (const a of ANTIGA_PIS_COFINS) {
      for (const data of DATAS) {
        const antiga = a.vigenteDesde <= data && data <= a.vigenteAte ? a : undefined;
        const nova = parametroPisCofinsVigente(t, a.tributo as TributoPisCofins, a.modalidade as ModalidadePisCofins, data);
        expect([a.tributo, a.modalidade, data, nova && { ...nova }]).toEqual([a.tributo, a.modalidade, data, antiga && { ...antiga }]);
      }
    }
  });
});
