/**
 * BRD F-63.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-63) — só a metade "calendário" (instrução da orquestração:
 * o teto de valor é política, não defeito).
 *
 * `dateOnly` (`lib/nfe.ts`) conferia só o formato `^\d{4}-\d{2}-\d{2}` e fatiava os 10 primeiros caracteres:
 * `dhEmi` = 2026-02-30 passava e virava a data contábil de uma nota recebida. Comportamento esperado: data fora
 * do calendário é rejeitada com `ValidationError` que nomeia o campo, como o `isValidDateOnly` faz nas DTOs.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseNfe } from '../nfe';
import { ValidationError } from '../errors';
import { signNfeForTest } from '@test/helpers/nfeSignature';
import { LEGAIS_SEMENTE } from '@test/helpers/legalParams';

const PURCHASE = readFileSync(join(__dirname, 'fixtures', 'nfe', 'purchase-multi-item.SYNTHETIC.xml'), 'utf8');

describe('BRD F-63.1 — data da NF-e recebida conferida contra o calendário', () => {
  it('BRD F-63.1 dhEmi 2025-02-30 ⇒ ValidationError que nomeia ide/dhEmi', () => {
    const xml = signNfeForTest(PURCHASE.replace('<dhEmi>2025-07-10T09:30:00-03:00</dhEmi>', '<dhEmi>2025-02-30T09:30:00-03:00</dhEmi>'));
    let err: unknown;
    try {
      parseNfe(xml, LEGAIS_SEMENTE);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as Error).message).toMatch(/ide\/dhEmi/);
  });

  it('BRD F-63.1 controle: dhEmi real (assinado de novo) ⇒ aceita', () => {
    const xml = signNfeForTest(PURCHASE);
    expect(parseNfe(xml, LEGAIS_SEMENTE).ide.dhEmiDate).toBe('2025-07-10');
  });
});
