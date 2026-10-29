/**
 * EFICIENCIA-FISCAL PR-4 itens 22–23 (BRIEF BE-INCR-EFICIENCIA-FISCAL; ADR D9, I-10, I-11; D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO
 * #5 e #6) — relatório de economia puro e o contrato Zod da resposta.
 */
import { TaxOptimizationReportQuerySchema, TaxOptimizationReportSchema } from '../../dtos/TaxOptimizationDto';
import {
  competenciaDaSugestao,
  competenciasDaJanela,
  linhaMetaEconomia,
  linhasExportEconomia,
  linhasMedidas,
  montarRelatorio,
  type SugestaoDoRelatorio,
} from '../taxOptimizationReport';

const sug = (o: Partial<SugestaoDoRelatorio>): SugestaoDoRelatorio => ({
  id: 's',
  practice: 'CRITERIO_CARGA',
  subjectType: 'UNIT',
  subjectId: 'unit-1',
  status: 'ACCEPTED',
  estimatedSavingCents: 1000n,
  legalBasis: [{ norma: 'LC 123/2006', artigo: 'art. 3º § 1º' }],
  decidedAt: new Date('2026-03-10T15:00:00Z'),
  createdAt: new Date('2026-03-01T15:00:00Z'),
  ...o,
});
// Fuso do escopo fixo em -03:00 (o serviço usa `scopeDay`).
const diaSp = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
const base = { competencia: '2026-03', unitId: 'unit-1', competenciaDaVenda: new Map<string, string>(), diaNoEscopo: diaSp, medida: null, motivoSemMedida: 'fora do Simples' };

describe('#5 — competência da sugestão', () => {
  it('COMPETENCIA = o próprio mês; SALE e SALE_KIT = mês da venda; sem venda, ou UNIT/ANO/PARTNER = mês da decisão no fuso do escopo', () => {
    const vendas = new Map([['sale-1', '2026-02']]);
    expect(competenciaDaSugestao(sug({ subjectType: 'COMPETENCIA', subjectId: '2026-01' }), vendas, diaSp)).toBe('2026-01');
    expect(competenciaDaSugestao(sug({ subjectType: 'SALE', subjectId: 'sale-1' }), vendas, diaSp)).toBe('2026-02');
    expect(competenciaDaSugestao(sug({ subjectType: 'SALE_KIT', subjectId: 'sale-1:kit-a' }), vendas, diaSp)).toBe('2026-02');
    expect(competenciaDaSugestao(sug({ subjectType: 'SALE', subjectId: 'sale-x' }), vendas, diaSp)).toBe('2026-03');
    expect(competenciaDaSugestao(sug({ subjectType: 'ANO', subjectId: '2026' }), vendas, diaSp)).toBe('2026-03');
    // 01/04 01:00 UTC = 31/03 22:00 em São Paulo
    expect(competenciaDaSugestao(sug({ decidedAt: new Date('2026-04-01T01:00:00Z') }), vendas, diaSp)).toBe('2026-03');
    expect(competenciaDaSugestao(sug({ status: 'PROPOSED', decidedAt: null, createdAt: new Date('2026-05-02T12:00:00Z') }), vendas, diaSp)).toBe('2026-05');
  });
});

describe('itens 22–23 — montarRelatorio', () => {
  it('I-11: só ACCEPTED soma; PROPOSED/REJECTED/EXPIRED só na contagem; outro mês fica fora; a resposta passa no contrato', () => {
    const r = montarRelatorio({
      ...base,
      sugestoes: [
        sug({ id: 'a', estimatedSavingCents: 1500n }),
        sug({ id: 'p', status: 'PROPOSED', decidedAt: null, estimatedSavingCents: 9_999_999n }),
        sug({ id: 'r', status: 'REJECTED', estimatedSavingCents: 7_777n }),
        sug({ id: 'e', status: 'EXPIRED', decidedAt: null }),
        sug({ id: 'outro-mes', decidedAt: new Date('2026-04-15T12:00:00Z'), estimatedSavingCents: 5000n }),
      ],
    });
    expect(TaxOptimizationReportSchema.safeParse(r).success).toBe(true);
    expect(r.totais).toEqual({ aceitasCents: '1500', medidaCents: '0', totalCents: '1500' });
    expect(r.contagem).toEqual({ PROPOSED: 1, REJECTED: 1, EXPIRED: 1 });
    const aceitas = r.linhas.filter((l) => l.tipo === 'SUGESTAO_ACEITA');
    expect(aceitas.map((l) => [l.suggestionId, l.economiaCents, l.legalBasis[0].artigo])).toEqual([['a', '1500', 'art. 3º § 1º']]);
  });

  it('item 22: retenções sofridas e crédito não tomado ficam NAO_DISPONIVEL com o nó; fora do Simples a medida também, com o motivo', () => {
    const r = montarRelatorio({ ...base, sugestoes: [] });
    const consumidas = r.linhas.filter((l) => l.tipo === 'CONSUMIDA');
    expect(consumidas.map((l) => [l.codigo, l.disponivel, l.economiaCents, l.noDependente])).toEqual([
      ['RETENCAO_SOFRIDA', false, null, 'RETENCOES-FONTE'],
      ['CREDITO_NAO_TOMADO', false, null, 'IBS-CBS-2027'],
    ]);
    const medidas = r.linhas.filter((l) => l.tipo === 'MEDIDA');
    expect(medidas.map((l) => [l.codigo, l.disponivel, l.detalhe])).toEqual([
      ['SEGREGACAO_MEDIDA', false, 'fora do Simples'],
      ['DESCONTO_INCONDICIONAL_MEDIDO', false, 'fora do Simples'],
    ]);
    expect(r.totais.totalCents).toBe('0');
  });

  it('#6: segregação = DAS sem marcas − DAS; desconto = desconto × DAS ÷ receita do PA; ambos somam na medida', () => {
    const r = montarRelatorio({ ...base, sugestoes: [], medida: { dasCents: 6000n, dasSemSegregacaoCents: 7300n, receitaPaCents: 100_000n, descontoIncondicionalCents: 5000n } });
    const m = Object.fromEntries(r.linhas.filter((l) => l.tipo === 'MEDIDA').map((l) => [l.codigo, l.economiaCents]));
    expect(m).toEqual({ SEGREGACAO_MEDIDA: '1300', DESCONTO_INCONDICIONAL_MEDIDO: '300' });
    expect(r.totais).toEqual({ aceitasCents: '0', medidaCents: '1600', totalCents: '1600' });
  });

  it('#6: sem segregação no PA ⇒ 0 com o motivo; receita zero ⇒ desconto 0 (sem divisão por zero)', () => {
    const [seg, desc] = linhasMedidas({ dasCents: 0n, dasSemSegregacaoCents: null, receitaPaCents: 0n, descontoIncondicionalCents: 500n }, '');
    expect([seg.economiaCents, desc.economiaCents]).toEqual(['0', '0']);
    expect(seg.detalhe).toContain('nenhuma receita do PA segregada');
  });

  it('I-10: parametrosSha256 muda quando uma sugestão muda de estado ou de valor, e é estável para a mesma entrada', () => {
    const a = montarRelatorio({ ...base, sugestoes: [sug({ id: 'a' })] }).parametrosSha256;
    expect(montarRelatorio({ ...base, sugestoes: [sug({ id: 'a' })] }).parametrosSha256).toBe(a);
    expect(montarRelatorio({ ...base, sugestoes: [sug({ id: 'a', estimatedSavingCents: 1001n })] }).parametrosSha256).not.toBe(a);
    expect(montarRelatorio({ ...base, sugestoes: [sug({ id: 'a', status: 'REJECTED' })] }).parametrosSha256).not.toBe(a);
  });
});

describe('contrato da rota e do export', () => {
  it('query: unitId + competência YYYY-MM, strict', () => {
    expect(TaxOptimizationReportQuerySchema.safeParse({ unitId: 'u', competencia: '2026-03' }).success).toBe(true);
    for (const bad of [{ unitId: 'u', competencia: '2026-13' }, { unitId: 'u' }, { unitId: 'u', competencia: '2026-03', status: 'ACCEPTED' }]) {
      expect(TaxOptimizationReportQuerySchema.safeParse(bad).success).toBe(false);
    }
  });

  it('linha indisponível com centavos (ou disponível sem) viola o contrato', () => {
    const r = montarRelatorio({ ...base, sugestoes: [] });
    const quebrada = { ...r, linhas: [{ ...r.linhas[0], economiaCents: '10' }] };
    expect(TaxOptimizationReportSchema.safeParse(quebrada).success).toBe(false);
  });

  it('competenciasDaJanela cruza o ano; o export tem uma linha por linha do relatório e a contagem só na meta', () => {
    expect(competenciasDaJanela({ periodStart: '2026-11-15', periodEnd: '2027-02-01' })).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    const r = montarRelatorio({ ...base, sugestoes: [sug({ id: 'a' }), sug({ id: 'p', status: 'PROPOSED', decidedAt: null, estimatedSavingCents: 99n })] });
    const rows = linhasExportEconomia(r);
    expect(rows).toHaveLength(r.linhas.length);
    expect(rows[0]).toEqual(['2026-03', 'SUGESTAO_ACEITA', 'CRITERIO_CARGA', 'SIM', '1000', 'LC 123/2006 art. 3º § 1º', 'UNIT unit-1', '', 'a']);
    expect(rows.some((row) => row.includes('99'))).toBe(false);
    expect(linhaMetaEconomia({ periodStart: '2026-03-01', periodEnd: '2026-03-31' }, [r], new Date('2026-04-01T00:00:00Z'))).toBe(
      '# kind=EXPORT_ECONOMIA_FISCAL; periodStart=2026-03-01; periodEnd=2026-03-31; aceitasCents=1000; medidaCents=0; proposed=1; rejected=0; expired=0; geradoEm=2026-04-01T00:00:00.000Z',
    );
  });
});
