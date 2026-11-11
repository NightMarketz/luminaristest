/**
 * BRD F-65.1 (GAP-MAP, faixa 1 de 2026-11-10; fichas BRD-65 e BRD-67 do inventário de estruturas implícitas).
 *
 * `parseTable` é o leitor único de planilha do extrato bancário (`ReconciliationService`), da importação
 * contábil (`DataExchangeImportService`) e do catálogo referencial (`ReferentialCatalogService`). Um
 * XLSX corrompido fazia o erro cru do `exceljs` subir sem tipo, e `handleApiError` respondia 500
 * genérico; o CSV inválido, no mesmo fluxo, responde 400. Arquivo ruim é erro do cliente: o leitor
 * deve recusá-lo com `ValidationError` (→ 400).
 */
import { parseTable } from '../spreadsheet';
import { ValidationError } from '../errors';

describe('BRD F-65.1 — XLSX corrompido é erro do cliente', () => {
  it.each([
    ['bytes que não são ZIP', Buffer.from('isto não é uma planilha', 'utf8')],
    ['ZIP truncado', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00])],
  ])('BRD F-65.1: %s → ValidationError (400), não erro cru (500)', async (_nome, buffer) => {
    await expect(parseTable(buffer, 'xlsx')).rejects.toBeInstanceOf(ValidationError);
  });
});
