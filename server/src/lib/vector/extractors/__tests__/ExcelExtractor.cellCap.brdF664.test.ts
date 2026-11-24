/**
 * BRD F-66.4 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-66) — metade XLSX.
 *
 * A extração de texto de documento (`extractTextFromExcel`, `extractSheetsFromExcel`) não tinha o teto de células
 * que o import de planilha (`lib/spreadsheet.ts`, `MAX_IMPORT_CELLS`) já aplica: uma planilha pequena comprimida
 * pode declarar uma grade enorme e a extração percorre tudo em memória. Comportamento esperado: grade acima do
 * mesmo teto ⇒ `ValidationError` antes de percorrer as linhas.
 */
import ExcelJS from 'exceljs';
import { extractSheetsFromExcel, extractTextFromExcel } from '../ExcelExtractor';
import { ValidationError } from '../../../errors';

async function xlsx(cells: Record<string, string>): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('a');
  for (const [addr, v] of Object.entries(cells)) ws.getCell(addr).value = v;
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

describe('BRD F-66.4 — teto de células na extração de XLSX', () => {
  // 1_000_001 linhas × 3 colunas = 3.000.003 células declaradas (> 2.000.000); arquivo de ~6 KB.
  const ENORME = { A1: 'x', C1000001: 'y' };

  it('BRD F-66.4 extractTextFromExcel: grade acima do teto ⇒ ValidationError', async () => {
    await expect(extractTextFromExcel(await xlsx(ENORME))).rejects.toBeInstanceOf(ValidationError);
  });

  it('BRD F-66.4 extractSheetsFromExcel: grade acima do teto ⇒ ValidationError', async () => {
    await expect(extractSheetsFromExcel(await xlsx(ENORME))).rejects.toBeInstanceOf(ValidationError);
  });

  it('BRD F-66.4 controle: planilha pequena ⇒ texto', async () => {
    await expect(extractTextFromExcel(await xlsx({ A1: 'olá', B1: 'mundo' }))).resolves.toContain('olá');
  });
});
