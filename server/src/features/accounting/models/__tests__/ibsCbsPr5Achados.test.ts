/**
 * Achados da revisão do #861 (IBS-CBS-2027 PR-5; autorização: dono, chat do coordenador, 2026-10-23) — testes-guarda puros.
 * Decisões do dono por questionário em 23/10: regra de vencimento desconhecida ⇒ `null` + aviso (achado 2); apuração
 * SUPERSEDED ⇒ 200 + aviso (achado 3). Os achados que precisam de banco/HTTP estão em
 * src/__tests__/ibsCbsPr5Achados.integration.test.ts.
 */
import type { ConsumptionTaxAssessment } from 'generated/prisma';
import { legalParamsSeedRows } from '@test/helpers/legalParams';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import { vencimentoIbsCbsDe } from '../ibsCbsParams';
import { resumoIbsCbs, type ApuracaoParaResumo } from '../../../../lib/ibsCbsApuracao';
import { linhasDaApuracaoIbsCbs } from '../ibsCbsMemoExport';

const todas = legalParamsSeedRows();

describe('achado 4 — a regra de formato da OBRIGACAO_REGIME aceita toda obrigação da matriz', () => {
  it('cada linha OBRIGACAO_REGIME da semente passa no formato (revisá-la pelo LEGAL-PARAMS não dá 400)', () => {
    const linhas = todas.filter((l) => l.tabela === 'OBRIGACAO_REGIME');
    expect(linhas.some((l) => l.chave === 'IBS_CBS_APURACAO')).toBe(true);
    const erros = linhas.map((l) => [l.id, erroDeFormato({ ...l, valorJson: JSON.parse(l.valorJson ?? 'null') })]).filter(([, e]) => e !== null);
    expect(erros).toEqual([]);
  });
});

// `substituida` (achado 3) entra pela asserção de tipo: o guarda compila antes do campo existir.
const apuracao = (over: Partial<ApuracaoParaResumo> & { substituida?: boolean } = {}): ApuracaoParaResumo =>
  ({
    id: 'cta-1', tributo: 'CBS', anoCalendario: 2027, mes: 1, saldoCents: 1000n, avisoParametroLegal: null, substituida: false,
    memoria: [{ codigo: 'SALDO', descricao: 'saldo', valorCents: '1000', fonte: 'LC 214/2025 art. 45' }],
    ...over,
  }) as ApuracaoParaResumo;

describe('achado 2 — linha VENCIMENTO publicada com regra desconhecida ⇒ vencimento null + aviso (dono 23/10), não erro', () => {
  it('só valorInt (sem valorTexto) na linha publicada: o resumo sai com null e o aviso VENCIMENTO_REGRA_DESCONHECIDA', () => {
    const errada = todas.map((l) => (l.id === 'ibscbs-cbs-vencimento-2027' ? { ...l, valorInt: 20, valorTexto: null } : l));
    let r: ReturnType<typeof resumoIbsCbs> | undefined;
    expect(() => {
      r = resumoIbsCbs({ apuracao: apuracao(), vencimento: vencimentoIbsCbsDe(errada, 'CBS', '2027-01'), feriados: todas, codMun: '3550308' });
    }).not.toThrow();
    expect(r?.vencimento).toBeNull();
    expect(r?.avisos.map((a) => a.split(':')[0])).toEqual(['VENCIMENTO_REGRA_DESCONHECIDA']);
    expect(r?.avisos[0]).toContain('ibscbs-cbs-vencimento-2027');
  });
});

describe('achado 3 — resumo de apuração SUPERSEDED avisa que a versão foi substituída (dono 23/10: 200 + aviso)', () => {
  it('apuração substituída ⇒ aviso APURACAO_SUBSTITUIDA; a viva não o recebe', () => {
    const venc = vencimentoIbsCbsDe(todas, 'CBS', '2027-01');
    const velha = resumoIbsCbs({ apuracao: apuracao({ substituida: true }), vencimento: venc, feriados: todas, codMun: '3550308' });
    expect(velha.avisos.map((a) => a.split(':')[0])).toEqual(['APURACAO_SUBSTITUIDA']);
    const viva = resumoIbsCbs({ apuracao: apuracao(), vencimento: venc, feriados: todas, codMun: '3550308' });
    expect(viva.avisos).toEqual([]);
  });
});

describe('achado 6 — o export do contador valida a memória com o schema do IBS/CBS', () => {
  it('código de memória fora do enum do IBS/CBS ⇒ MemoriaInvalidaError com o id (não passa como se fosse IRPJ/CSLL)', () => {
    const row = {
      id: 'cta-irpj', userId: 'u', unitId: 'un', anoCalendario: 2027, mes: 1, tributo: 'IBS', regime: 'REAL', debitosCents: 0n, creditosCents: 0n,
      saldoCents: 0n, memoria: [{ codigo: 'IRPJ_DEVIDO', descricao: 'linha de IRPJ', valorCents: '0', fonte: 'Lei 9.249' }], parametrosIds: [],
      parametrosSha256: 'a'.repeat(64), entradaInformada: null, avisoParametroLegal: null, status: 'CONFIRMED', supersedesId: null, provisaoEntryId: null,
      confirmedById: 'u', confirmedAt: new Date('2027-02-05T12:00:00.000Z'), createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    } as ConsumptionTaxAssessment;
    expect(() => linhasDaApuracaoIbsCbs(row)).toThrow(/cta-irpj/);
  });
});
