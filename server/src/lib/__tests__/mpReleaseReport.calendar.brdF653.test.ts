/**
 * BRD F-65.3 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-65 do inventário de estruturas implícitas).
 *
 * `instantOf` (`lib/mpReleaseReport.ts`) aceitava qualquer string que o `new Date` entende com offset:
 * `2026-02-30T10:00:00-03:00` rolava para 2026-03-02 e a linha do relatório do provedor entrava no dia errado.
 * Comportamento esperado: data impossível no DATE ⇒ 400 `release_report_invalid` (como `isValidDateOnly`).
 */
import { parseMpReleaseReport } from '../mpReleaseReport';

const HEADER =
  'DATE,SOURCE_ID,EXTERNAL_REFERENCE,RECORD_TYPE,DESCRIPTION,NET_CREDIT_AMOUNT,NET_DEBIT_AMOUNT,GROSS_AMOUNT,MP_FEE_AMOUNT,FINANCING_FEE_AMOUNT,SHIPPING_FEE_AMOUNT,TAXES_AMOUNT,COUPON_AMOUNT,BALANCE_AMOUNT,PAYMENT_METHOD';
const csv = (...rows: string[]) => Buffer.from([HEADER, ...rows].join('\n'));
const release = (date: string) => `${date},PAY01X,c,release,payment,10.00,0.00,10.00,0.00,0.00,0.00,0.00,0.00,10.00,pix`;

describe('BRD F-65.3 — DATE do relatório conferido contra o calendário', () => {
  it.each(['2026-02-30T10:00:00-03:00', '2026-04-31T10:00:00-03:00', '2025-02-29T10:00:00Z'])(
    'BRD F-65.3 %s ⇒ release_report_invalid',
    (date) => {
      expect(() => parseMpReleaseReport(csv(release(date)))).toThrow(/release_report_invalid/);
    },
  );

  it('BRD F-65.3 controle: 2024-02-29 (bissexto) ⇒ aceita', () => {
    expect(parseMpReleaseReport(csv(release('2024-02-29T10:00:00-03:00'))).table.rows[0][0]).toBe('2024-02-29');
  });
});
