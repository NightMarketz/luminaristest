/**
 * BE-INCR-PAYMENT-PROVIDER PR-3 (nó F5) — parser puro do relatório de liberações (P3-1, P3-2, P3-3; G2, G3, G8).
 * Fixture escrito a partir da descrição das colunas (M11); o BRIEF §9 item 4 manda trocá-lo pelo CSV real da sonda
 * de colunas antes do merge.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationError } from '../errors';
import { mpDecimalToCents, mpReleaseFeeCents, parseMpReleaseReport } from '../mpReleaseReport';

const HEADER =
  'DATE,SOURCE_ID,EXTERNAL_REFERENCE,RECORD_TYPE,DESCRIPTION,NET_CREDIT_AMOUNT,NET_DEBIT_AMOUNT,GROSS_AMOUNT,MP_FEE_AMOUNT,FINANCING_FEE_AMOUNT,SHIPPING_FEE_AMOUNT,TAXES_AMOUNT,COUPON_AMOUNT,BALANCE_AMOUNT,PAYMENT_METHOD';
const csv = (...rows: string[]) => Buffer.from([HEADER, ...rows].join('\n'));

describe('parseMpReleaseReport', () => {
  it('P3-1: uma linha por release; saldos das linhas de saldo (G2); total ignorado; rawJson com TODAS as colunas', () => {
    const out = parseMpReleaseReport(
      csv(
        '2026-10-01T00:00:00-03:00,,,initial_available_balance,,500.00,0.00,,,,,,,500.00,',
        '2026-10-01T10:00:00-03:00,PAY01AAA,charge-1,release,payment,97.00,0.00,100.00,-3.00,0.00,0.00,0.00,0.00,597.00,pix',
        '2026-10-01T11:00:00-03:00,PAY01BBB,,release,refund,0.00,20.00,-20.00,0.00,0.00,0.00,0.00,0.00,577.00,pix',
        ',,,total,,97.00,20.00,,,,,,,,',
        '2026-10-01T23:59:59-03:00,,,available_balance,,577.00,0.00,,,,,,,577.00,',
      ),
    );
    expect(out.openingBalanceCents).toBe(50000);
    expect(out.closingBalanceCents).toBe(57700);
    expect(out.table.headers).toEqual(['date', 'amountCents', 'description', 'externalRef', 'rawJson']);
    expect(out.table.rows).toHaveLength(2);
    expect(out.table.rows[0].slice(0, 4)).toEqual(['2026-10-01', '9700', 'payment', 'charge-1']);
    expect(out.table.rows[1].slice(0, 4)).toEqual(['2026-10-01', '-2000', 'refund', '']);
    const raw = JSON.parse(out.table.rows[0][4]);
    expect(Object.keys(raw)).toEqual(HEADER.split(','));
    expect(raw.SOURCE_ID).toBe('PAY01AAA');
    // G8: faixa tirada do arquivo (menor e maior DATE).
    expect(out.fromUtc).toBe('2026-10-01T03:00:00.000Z');
    expect(out.toUtc).toBe('2026-10-02T02:59:59.000Z');
  });

  it('P3-2: DATE lido como instante com offset e convertido ao dia de America/Sao_Paulo — 23:30-04:00 ⇒ dia seguinte', () => {
    const out = parseMpReleaseReport(csv('2026-10-01T23:30:00-04:00,PAY01X,c,release,payment,10.00,0.00,10.00,0.00,0.00,0.00,0.00,0.00,10.00,pix'));
    expect(out.table.rows[0][0]).toBe('2026-10-02');
  });

  it('P3-2: DATE sem offset ⇒ 400 (nunca lê como hora local)', () => {
    expect(() => parseMpReleaseReport(csv('2026-10-01T23:30:00,PAY01X,c,release,payment,10.00,0.00,10.00,0.00,0.00,0.00,0.00,0.00,10.00,pix'))).toThrow(
      /release_report_invalid/,
    );
  });

  it('P3-2 guarda: o parser não recorta string de data (nenhum slice(0, 10))', () => {
    const src = readFileSync(join(__dirname, '..', 'mpReleaseReport.ts'), 'utf8');
    expect(src).not.toMatch(/slice\(0,\s*10\)/);
  });

  it('P3-3: coluna obrigatória ausente ⇒ 400 release_report_missing_columns com a lista', () => {
    const buf = Buffer.from('DATE,SOURCE_ID,RECORD_TYPE\n2026-10-01T10:00:00-03:00,PAY01,release');
    let err: unknown;
    try {
      parseMpReleaseReport(buf);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).message).toMatch(/^release_report_missing_columns/);
    expect((err as ValidationError).details).toMatchObject({
      missingColumns: expect.arrayContaining(['EXTERNAL_REFERENCE', 'DESCRIPTION', 'GROSS_AMOUNT', 'TAXES_AMOUNT']),
    });
  });

  it('separador ";" e decimal com vírgula; campo entre aspas', () => {
    const buf = Buffer.from(
      [
        HEADER.replace(/,/g, ';'),
        '2026-10-01T10:00:00-03:00;PAY01Q;"ref;1";release;payment;225,96;0;269,00;-43,04;0;0;0;0;225,96;pix',
      ].join('\r\n'),
    );
    const out = parseMpReleaseReport(buf);
    expect(out.table.rows[0].slice(0, 4)).toEqual(['2026-10-01', '22596', 'payment', 'ref;1']);
  });

  it('RECORD_TYPE desconhecido ⇒ 400 (falha alta, nunca import silencioso)', () => {
    expect(() => parseMpReleaseReport(csv('2026-10-01T10:00:00-03:00,PAY01X,c,reserve_x,payment,1.00,0.00,1.00,0,0,0,0,0,1.00,pix'))).toThrow(
      /RECORD_TYPE 'reserve_x'/,
    );
  });
});

describe('mpReleaseFeeCents — G3 (NET = GROSS + Σ deduções negativas)', () => {
  it('exemplo da doc do MP (report-fields): 269,00 + (−43,04) = 225,96 ⇒ tarifa 4304', () => {
    expect(
      mpReleaseFeeCents({ GROSS_AMOUNT: '269.00', NET_CREDIT_AMOUNT: '225.96', NET_DEBIT_AMOUNT: '0', MP_FEE_AMOUNT: '-43.04', FINANCING_FEE_AMOUNT: '0', SHIPPING_FEE_AMOUNT: '0', TAXES_AMOUNT: '0' }),
    ).toEqual({ grossCents: 26900, feeCents: 4304 });
  });

  it('soma tarifas e impostos (TAXES_AMOUNT entra no feeCents até a resposta P3 do contador)', () => {
    expect(
      mpReleaseFeeCents({ GROSS_AMOUNT: '100.00', NET_CREDIT_AMOUNT: '96.00', NET_DEBIT_AMOUNT: '', MP_FEE_AMOUNT: '-3.00', FINANCING_FEE_AMOUNT: '', SHIPPING_FEE_AMOUNT: '', TAXES_AMOUNT: '-1.00' }),
    ).toEqual({ grossCents: 10000, feeCents: 400 });
  });

  it('linha que não bate (deduções positivas, ou soma diferente) ⇒ null (recusada)', () => {
    expect(
      mpReleaseFeeCents({ GROSS_AMOUNT: '269.00', NET_CREDIT_AMOUNT: '225.96', MP_FEE_AMOUNT: '43.04', FINANCING_FEE_AMOUNT: '0', SHIPPING_FEE_AMOUNT: '0', TAXES_AMOUNT: '0' }),
    ).toBeNull();
    expect(
      mpReleaseFeeCents({ GROSS_AMOUNT: '100.00', NET_CREDIT_AMOUNT: '97.00', MP_FEE_AMOUNT: '-2.00', FINANCING_FEE_AMOUNT: '0', SHIPPING_FEE_AMOUNT: '0', TAXES_AMOUNT: '0' }),
    ).toBeNull();
  });

  it('decimal por string, sem float', () => {
    expect(mpDecimalToCents('0.1')).toBe(10);
    expect(mpDecimalToCents('-43.04')).toBe(-4304);
    expect(mpDecimalToCents('1234567.89')).toBe(123456789);
    expect(() => mpDecimalToCents('1e3')).toThrow(/não é decimal/);
  });
});
