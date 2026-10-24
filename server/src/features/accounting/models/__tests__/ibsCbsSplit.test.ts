/**
 * IBS-CBS-2027 PR-4 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 19–20 + EMENDA PR-4, dono 22/10) — o
 * contrato `split` do confirm do F7, a regra pura do fechamento do saldo e a linha `SPLIT_EXTINCAO_n` da apuração.
 */
import { BankSettlementSplitSchema, ConfirmBankSettlementSchema } from '../../dtos/BankSettlementDto';
import { MemoriaIbsCbsSchema } from '../../dtos/IbsCbsAssessmentDto';
import { competenciaPadraoDoSplit, diferencaDoSplit } from '../BankSettlement.model';
import { apurarIbsCbsMes, type IbsCbsDocumento } from '../ibsCbsCompetencia';

const doc: IbsCbsDocumento = { fiscalDocumentId: 'fd1', dataEmissaoLocal: '2027-03-10', status: 'AUTHORIZED', ibsCents: 10n, cbsCents: 900n, baseCents: null, cClassTrib: null, natureza: 'SERVICO' };

describe('item 19a — contrato do split no confirm', () => {
  it('aceita IBS e CBS separados, competência opcional; sem split o confirm é o de sempre', () => {
    expect(ConfirmBankSettlementSchema.parse({ unitId: 'u', method: 'Pix' })).toEqual({ unitId: 'u', method: 'Pix' });
    expect(ConfirmBankSettlementSchema.parse({ unitId: 'u', method: 'Pix', split: { ibsCents: 100, cbsCents: 900, competencia: '2027-01' } }).split).toEqual({
      ibsCents: 100,
      cbsCents: 900,
      competencia: '2027-01',
    });
    expect(BankSettlementSplitSchema.parse({ ibsCents: 0, cbsCents: 900 })).toEqual({ ibsCents: 0, cbsCents: 900 });
  });

  it.each([
    ['soma zero', { ibsCents: 0, cbsCents: 0 }],
    ['valor negativo', { ibsCents: -1, cbsCents: 900 }],
    ['centavo fracionado', { ibsCents: 1.5, cbsCents: 900 }],
    ['competência antes de 2027 (F-IBS-7 b)', { ibsCents: 1, cbsCents: 9, competencia: '2026-12' }],
    ['competência fora do formato', { ibsCents: 1, cbsCents: 9, competencia: '2027-13' }],
    ['um total só (dono 22/10: dois valores)', { totalCents: 1000 }],
    ['campo extra', { ibsCents: 1, cbsCents: 9, tarifa: 1 }],
  ])('recusa %s', (_n, split) => {
    expect(BankSettlementSplitSchema.safeParse(split).success).toBe(false);
  });
});

describe('item 19a — regra pura: linha + tarifa + split = saldo', () => {
  it('fecha exato ⇒ 0; sobra ou excesso ⇒ a diferença com sinal', () => {
    expect(diferencaDoSplit(9_000, 10_000, { ibsCents: 100, cbsCents: 900 })).toBe(0);
    expect(diferencaDoSplit(9_000, 10_000, { ibsCents: 100, cbsCents: 800 })).toBe(100);
    expect(diferencaDoSplit(9_500, 10_000, { ibsCents: 100, cbsCents: 900 })).toBe(-500);
  });

  it('competência padrão = mês da linha do extrato (dia escrito)', () => {
    expect(competenciaPadraoDoSplit('2027-01-31')).toBe('2027-01');
  });
});

describe('item 20 — SPLIT_EXTINCAO_n na apuração', () => {
  const base = { ano: 2027, mes: 3, tributo: 'CBS' as const, tabela: [], documentos: [doc], vendasSemDocumento: [] };

  it('uma linha por recibo, em ordem de liquidação; saldo continua débitos − créditos (§10.3)', () => {
    const r = apurarIbsCbsMes({
      ...base,
      splits: [
        { receiptId: 'r2', receivableId: 't2', receivedAt: '2027-04-02', amountCents: 300n },
        { receiptId: 'r1', receivableId: 't1', receivedAt: '2027-03-20', amountCents: 200n },
      ],
    });
    const splits = r.memoria.filter((l) => l.codigo.startsWith('SPLIT_EXTINCAO'));
    expect(splits.map((l) => [l.codigo, l.valorCents])).toEqual([['SPLIT_EXTINCAO_1', '200'], ['SPLIT_EXTINCAO_2', '300']]);
    expect(r.splitCents).toBe(500n);
    expect(r.saldoCents).toBe(900n);
    expect(r.memoria.find((l) => l.codigo === 'SALDO')?.valorCents).toBe('900');
    // O schema da memória (persistida na confirmação) aceita o sufixo _n.
    expect(MemoriaIbsCbsSchema.safeParse(r.memoria).success).toBe(true);
  });

  it('sem split, nenhuma linha nova', () => {
    const r = apurarIbsCbsMes(base);
    expect(r.memoria.some((l) => l.codigo.startsWith('SPLIT_EXTINCAO'))).toBe(false);
    expect(r.splitCents).toBe(0n);
  });
});
