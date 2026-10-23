/**
 * IBS-CBS-2027 PR-5 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 21–24; lacunas respondidas pelo dono por
 * questionário em 23/10). Puro, sem banco: a semente é o mesmo texto da migração. Fontes: LC 214/2025 arts. 41 § 1º, 43, 45
 * § 6º; Decreto 12.955/2026 arts. 27 § 1º, 44 § 3º, 44 § 6º e 45 (Planalto compilado em 23/10, dossiê
 * verif-2026-10-23-ibs-cbs-vencimento [D02]).
 */
import fs from 'fs';
import path from 'path';
import type { ConsumptionTaxAssessment } from 'generated/prisma';
import { LEGAL_PARAMS_SEED_FILE_IBS_CBS_V2, legalParamsSeedRows } from '@test/helpers/legalParams';
import { matrizObrigacoesDe, resolverObrigacoes } from '../obrigacoesPorRegime';
import { ObrigacaoRegimeJson } from '../../../legalParameters/models/formatoLinha';
import { tabelaIbsCbsDe, vencimentoIbsCbsDe } from '../ibsCbsParams';
import { AVISO_RESUMO_IBS_CBS, montarEnvioApuracaoIbsCbs, resumoIbsCbs, ultimoDiaUtilDoMesSeguinte, type ApuracaoParaResumo } from '../../../../lib/ibsCbsApuracao';
import { IbsCbsResumoSchema } from '../../dtos/IbsCbsAssessmentDto';
import { familiasDaLinha } from '../../services/TaxAssessmentRecalcService';
import { IBS_CBS_MEMO_COLUMNS, linhaMetaIbsCbs, linhasDaApuracaoIbsCbs, selecionarApuracoesIbsCbs } from '../ibsCbsMemoExport';
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';

const pr5 = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS_V2);
const todas = legalParamsSeedRows(); // todas as sementes (a matriz inteira + IBS_CBS v1 e v2 + feriados)

describe('semente do PR-5', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_ibs_cbs_v2.sql e só insere', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261023120000_legal_parameters_ibs_cbs_pr5/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_IBS_CBS_V2, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
    expect(pr5).toHaveLength(6);
    expect(pr5.every((l) => l.fonte.trim().length > 0 && /^[0-9a-f]{64}$/.test(l.fonteSha256 ?? ''))).toBe(true);
  });
});

describe('item 21 — matriz OBRIGACAO_REGIME ganha IBS_CBS_APURACAO', () => {
  const condicoes = { aporteInvestidorAnjo: null, livroCaixaSemEscrituracao: null, distribuicaoAcimaBase: null };
  const status = (regime: 'MEI' | 'SIMPLES' | 'PRESUMIDO' | 'REAL', data: string, inativa = false) =>
    resolverObrigacoes({ regime, inativa, condicoes }, matrizObrigacoesDe(todas, data)).find((o) => o.obrigacao === 'IBS_CBS_APURACAO');

  it('o valorJson de cada linha nova obedece ao formato da tabela', () => {
    for (const l of pr5.filter((x) => x.tabela === 'OBRIGACAO_REGIME')) expect([l.id, ObrigacaoRegimeJson.safeParse(JSON.parse(l.valorJson ?? '')).success]).toEqual([l.id, true]);
  });

  it.each(['PRESUMIDO', 'REAL'] as const)('%s: OBRIGATORIA desde 2027-01-01 (LC 214 arts. 41 § 1º, 43, 45 § 6º), ativa e inativa (Dec. 12.955 art. 44 § 6º)', (regime) => {
    expect(status(regime, '2027-01-01')).toMatchObject({ status: 'OBRIGATORIA', fonte: expect.stringContaining('43 e 45 § 6º') });
    expect(status(regime, '2027-01-01', true)).toMatchObject({ status: 'OBRIGATORIA', fonte: expect.stringContaining('art. 44 § 6º') });
  });

  it.each(['SIMPLES', 'MEI'] as const)('%s: NAO_SE_APLICA (DAS, art. 41 § 1º)', (regime) => {
    expect(status(regime, '2027-06-30')).toMatchObject({ status: 'NAO_SE_APLICA', fonte: expect.stringContaining('art. 41 § 1º') });
  });

  it('sem linha de 2026 (F-IBS-7 b) e vai no fim da ordem da matriz', () => {
    expect(status('REAL', '2026-12-31')).toBeUndefined();
    const real = resolverObrigacoes({ regime: 'REAL', inativa: false, condicoes }, matrizObrigacoesDe(todas, '2027-01-01'));
    expect(real[real.length - 1].obrigacao).toBe('IBS_CBS_APURACAO');
  });
});

describe('item 22 — vencimento e resumo', () => {
  it('as linhas VENCIMENTO não entram na tabela de alíquotas; CBS publicada (art. 45), IBS DRAFT ⇒ null', () => {
    expect(() => tabelaIbsCbsDe(todas)).not.toThrow();
    expect(tabelaIbsCbsDe(todas).some((p) => (p.chave as string) === 'VENCIMENTO')).toBe(false);
    expect(vencimentoIbsCbsDe(todas, 'CBS', '2027-01')).toMatchObject({ regra: 'ULTIMO_DIA_UTIL_MES_SEGUINTE', fonte: expect.stringContaining('Decreto 12.955/2026 art. 45') });
    expect(vencimentoIbsCbsDe(todas, 'IBS', '2027-01')).toBeNull();
    expect(vencimentoIbsCbsDe(todas, 'CBS', '2026-12')).toBeNull();
  });

  it('regra desconhecida na linha publicada ⇒ erro (não um vencimento inventado)', () => {
    const errada = todas.map((l) => (l.id === 'ibscbs-cbs-vencimento-2027' ? { ...l, valorTexto: 'DIA_20' } : l));
    expect(() => vencimentoIbsCbsDe(errada, 'CBS', '2027-01')).toThrow(/regra desconhecida/);
  });

  it('último dia útil do mês seguinte: pula sábado, domingo e feriado do município; dezembro vira janeiro', () => {
    expect(ultimoDiaUtilDoMesSeguinte(2027, 1, todas, null)).toBe('2027-02-26'); // 28/02/2027 é domingo
    expect(ultimoDiaUtilDoMesSeguinte(2027, 3, todas, null)).toBe('2027-04-30'); // sexta
    expect(ultimoDiaUtilDoMesSeguinte(2027, 12, todas, null)).toBe('2028-01-31'); // segunda
    const local: LinhaLegal = { id: 'fx-feriado', tabela: 'FERIADO_LOCAL', chave: '11-30', discriminador: '3550308', valorInt: null, valorTexto: 'FIXO', valorJson: null, fonte: 'fixture', vigenteDesde: '2000-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null };
    expect(ultimoDiaUtilDoMesSeguinte(2027, 10, [...todas, local], '3550308')).toBe('2027-11-29'); // 30/11 feriado municipal (fixture)
    expect(ultimoDiaUtilDoMesSeguinte(2027, 10, [...todas, local], null)).toBe('2027-11-30'); // sem município: só o nacional
  });

  const apuracao = (over: Partial<ApuracaoParaResumo> = {}): ApuracaoParaResumo => ({
    id: 'cta-1', tributo: 'CBS', anoCalendario: 2027, mes: 1, saldoCents: 1000n, avisoParametroLegal: null,
    memoria: [{ codigo: 'SALDO', descricao: 'saldo', valorCents: '1000', fonte: 'LC 214/2025 art. 45' }],
    ...over,
  });
  const split = (n: number, v: string) => ({ codigo: `SPLIT_EXTINCAO_${n}`, descricao: 'split', valorCents: v, fonte: 'Dec. 12.955 art. 44 § 3º' });
  const venc = vencimentoIbsCbsDe(todas, 'CBS', '2027-01');

  it('saldo a recolher = saldo − split extinto (art. 44 § 3º); vencimento calculado', () => {
    const r = resumoIbsCbs({ apuracao: apuracao({ memoria: [split(1, '200'), split(2, '100')] }), vencimento: venc, feriados: todas, codMun: '3550308' });
    expect(r).toMatchObject({ saldoARecolherCents: 700n, vencimento: '2027-02-26', avisos: [] });
    expect(IbsCbsResumoSchema.safeParse(r).success).toBe(true);
  });

  it('≤ 0 ⇒ 0 + aviso (dono 23/10): saldo credor; split maior que o saldo (excesso devolvido, art. 27 § 1º)', () => {
    const credor = resumoIbsCbs({ apuracao: apuracao({ saldoCents: -500n }), vencimento: venc, feriados: todas, codMun: '3550308' });
    expect(credor.saldoARecolherCents).toBe(0n);
    expect(credor.avisos[0]).toMatch(new RegExp(`^${AVISO_RESUMO_IBS_CBS.SALDO_CREDOR}: .*500 centavos`));
    const excede = resumoIbsCbs({ apuracao: apuracao({ memoria: [split(1, '1200')] }), vencimento: venc, feriados: todas, codMun: '3550308' });
    expect(excede.saldoARecolherCents).toBe(0n);
    expect(excede.avisos[0]).toMatch(new RegExp(`^${AVISO_RESUMO_IBS_CBS.SPLIT_EXCEDENTE}: .*200 centavos volta ao contribuinte`));
  });

  it('IBS sem linha publicada ⇒ vencimento null + aviso (não 400); sem município e aviso de parâmetro legal aparecem', () => {
    const ibs = resumoIbsCbs({ apuracao: apuracao({ tributo: 'IBS' }), vencimento: vencimentoIbsCbsDe(todas, 'IBS', '2027-01'), feriados: todas, codMun: '3550308' });
    expect(ibs.vencimento).toBeNull();
    expect(ibs.avisos.map((a) => a.split(':')[0])).toEqual([AVISO_RESUMO_IBS_CBS.VENCIMENTO_NAO_PUBLICADO]);
    const r = resumoIbsCbs({ apuracao: apuracao({ avisoParametroLegal: 'Parâmetro legal mudou — reconfirme' }), vencimento: venc, feriados: todas, codMun: null });
    expect(r.avisos.map((a) => a.split(':')[0])).toEqual([AVISO_RESUMO_IBS_CBS.VENCIMENTO_SEM_MUNICIPIO, AVISO_RESUMO_IBS_CBS.PARAMETRO_LEGAL]);
  });

  it('contrato de saída: chave fora do schema, saldo negativo ou data fora do formato ⇒ rejeita', () => {
    const ok = resumoIbsCbs({ apuracao: apuracao(), vencimento: venc, feriados: todas, codMun: null });
    expect(IbsCbsResumoSchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
    expect(IbsCbsResumoSchema.safeParse({ ...ok, saldoARecolherCents: -1n }).success).toBe(false);
    expect(IbsCbsResumoSchema.safeParse({ ...ok, vencimento: '26/02/2027' }).success).toBe(false);
    expect(IbsCbsResumoSchema.safeParse({ ...ok, memoria: [{ codigo: 'INVENTADO', descricao: '', valorCents: '0', fonte: '' }] }).success).toBe(false);
  });
});

describe('item 23 — porta EnvioApuracaoIbsCbs (adaptador nenhum, R5)', () => {
  it('o envio é montado do resumo, com período AAAA-MM e sha256 determinístico do corpo', () => {
    const r = resumoIbsCbs({ apuracao: { id: 'cta-9', tributo: 'CBS', anoCalendario: 2027, mes: 3, saldoCents: 4200n, avisoParametroLegal: null, memoria: [] }, vencimento: vencimentoIbsCbsDe(todas, 'CBS', '2027-03'), feriados: todas, codMun: null });
    const e = montarEnvioApuracaoIbsCbs(r);
    expect(e).toMatchObject({ apuracaoId: 'cta-9', tributo: 'CBS', periodo: '2027-03', saldoARecolherCents: '4200', vencimento: '2027-04-30' });
    expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(montarEnvioApuracaoIbsCbs(r).sha256).toBe(e.sha256);
    expect(montarEnvioApuracaoIbsCbs({ ...r, saldoARecolherCents: 4201n }).sha256).not.toBe(e.sha256);
  });
});

describe('item 24 — job de recálculo e export do contador', () => {
  it('familiasDaLinha: alíquota de IBS_CBS ⇒ família IBS_CBS; VENCIMENTO não alcança apuração', () => {
    expect(familiasDaLinha({ tabela: 'IBS_CBS', chave: 'CBS', discriminador: 'ALIQUOTA' })).toEqual(['IBS_CBS']);
    expect(familiasDaLinha({ tabela: 'IBS_CBS', chave: 'IBS', discriminador: 'ALIQUOTA_UF' })).toEqual(['IBS_CBS']);
    expect(familiasDaLinha({ tabela: 'IBS_CBS', chave: 'CBS', discriminador: 'VENCIMENTO' })).toEqual([]);
  });

  const row = (over: Partial<ConsumptionTaxAssessment>): ConsumptionTaxAssessment => ({
    id: 'cta', userId: 'u', unitId: 'un', anoCalendario: 2027, mes: 1, tributo: 'IBS', regime: 'REAL', debitosCents: 1500n, creditosCents: 500n,
    saldoCents: 1000n, memoria: [{ codigo: 'SALDO', descricao: 'saldo', valorCents: '1000', fonte: 'LC 214/2025 art. 45' }], parametrosIds: [],
    parametrosSha256: 'a'.repeat(64), entradaInformada: null, avisoParametroLegal: null, status: 'CONFIRMED', supersedesId: null, provisaoEntryId: null,
    confirmedById: 'u', confirmedAt: new Date('2027-02-05T12:00:00.000Z'), createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    ...over,
  });

  it('EXPORT_IBS_CBS_MEMO: só CONFIRMED vivas com o mês inteiro na janela, em ordem; RESUMO antes da MEMORIA', () => {
    const rows = [
      row({ id: 'b', mes: 2, tributo: 'CBS' }), row({ id: 'a', mes: 2, tributo: 'IBS' }), row({ id: 'jan', mes: 1 }),
      row({ id: 'sub', status: 'SUPERSEDED', mes: 2 }), row({ id: 'del', deletedAt: new Date(), mes: 2 }), row({ id: 'mar', mes: 3 }),
    ];
    const sel = selecionarApuracoesIbsCbs(rows, { periodStart: '2027-02-01', periodEnd: '2027-02-28' });
    expect(sel.map((r) => r.id)).toEqual(['b', 'a']); // fevereiro: CBS antes de IBS
    expect(selecionarApuracoesIbsCbs(rows, { periodStart: '2027-02-02', periodEnd: '2027-03-31' }).map((r) => r.id)).toEqual(['mar']);
    const linhas = linhasDaApuracaoIbsCbs(row({ id: 'x', supersedesId: 'w' }));
    expect(linhas.map((l) => [l[8], l[9], l[11]])).toEqual([['RESUMO', 'debitos', '1500'], ['RESUMO', 'creditos', '500'], ['RESUMO', 'saldo', '1000'], ['MEMORIA', 'SALDO', '1000']]);
    expect(linhas[0].slice(0, 8)).toEqual(['2027', '1', 'IBS', 'REAL', 'a'.repeat(64), '2027-02-05T12:00:00.000Z', 'x', 'w']);
    expect(linhas[0]).toHaveLength(IBS_CBS_MEMO_COLUMNS.length);
    expect(linhaMetaIbsCbs({ periodStart: '2027-01-01', periodEnd: '2027-12-31' }, 2, new Date('2027-03-01T00:00:00.000Z'))).toBe('# kind=EXPORT_IBS_CBS_MEMO; periodStart=2027-01-01; periodEnd=2027-12-31; apuracoes=2; geradoEm=2027-03-01T00:00:00.000Z');
    expect(() => linhasDaApuracaoIbsCbs(row({ id: 'quebrada', memoria: [{ codigo: '' }] }))).toThrow(/quebrada/);
  });
});
