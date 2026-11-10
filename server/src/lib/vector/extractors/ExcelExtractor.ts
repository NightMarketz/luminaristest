import ExcelJS from 'exceljs';
import { MAX_IMPORT_CELLS } from '../../spreadsheet';
import { ValidationError } from '../../errors';

/**
 * BRD F-66.4: o mesmo teto de células do import de planilha (`lib/spreadsheet.ts`), somado em todas as abas e
 * conferido antes de percorrer as linhas (uma planilha pequena comprimida pode declarar uma grade enorme).
 */
function assertWithinCellCap(workbook: ExcelJS.Workbook): void {
  const cells = workbook.worksheets.reduce((n, ws) => n + ws.rowCount * ws.columnCount, 0);
  if (cells > MAX_IMPORT_CELLS) {
    throw new ValidationError(`Planilha grande demais: ${cells} células passam do limite de ${MAX_IMPORT_CELLS}.`);
  }
}

/**
 * Represents a single sheet extracted from an Excel file
 */
export interface ExcelSheet {
  /** Name of the sheet/tab */
  name: string;
  /** Extracted text content from the sheet */
  content: string;
}

/**
 * Extracts text from an Excel file buffer (xlsx or xls)
 * Organizes multi-sheet data in a structured format for AI processing
 * @param buffer The Excel file as ArrayBuffer
 */
export async function extractTextFromExcel(buffer: ArrayBuffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assertWithinCellCap(workbook);
  
  const sheets = workbook.worksheets;
  const extractedText: string[] = [];

  // Check if we have multiple sheets
  if (sheets.length > 1) {
    // Multi-sheet format - organize data clearly for AI
    extractedText.push('=== MULTI-SHEET EXCEL FILE ===');
    extractedText.push(`Total sheets: ${sheets.length}`);
    extractedText.push('');

    sheets.forEach((worksheet, index) => {
      const sheetName = worksheet.name;
      const sheetData: string[] = [];
      
      extractedText.push(`=== SHEET ${index + 1}: ${sheetName} ===`);
      
      worksheet.eachRow((row) => {
        const rowText = (row.values as unknown[])
          .map((cell) => (cell != null ? cell.toString() : ''))
          .join('\t');
        if (rowText.trim() !== '') {
          sheetData.push(rowText);
        }
      });
      
      extractedText.push(sheetData.join('\n'));
      extractedText.push(''); // Empty line between sheets
    });
    
    extractedText.push('=== END OF MULTI-SHEET DATA ===');
  } else {
    // Single sheet format - keep original simple format
    const worksheet = sheets[0];
    worksheet.eachRow((row) => {
      const rowText = (row.values as unknown[])
        .map((cell) => (cell != null ? cell.toString() : ''))
        .join('\t');
      if (rowText.trim() !== '') {
        extractedText.push(rowText);
      }
    });
  }

  return extractedText.join('\n');
}

/**
 * Extracts each sheet from an Excel file as separate entities
 * @param buffer The Excel file as ArrayBuffer
 * @returns Array of sheets with their names and content
 */
export async function extractSheetsFromExcel(buffer: ArrayBuffer): Promise<ExcelSheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assertWithinCellCap(workbook);
  const sheets: ExcelSheet[] = [];
  
  workbook.eachSheet((worksheet) => {
    let sheetContent = '';
    worksheet.eachRow((row) => {
      const rowText = (row.values as unknown[])
        .map((cell) => (cell != null ? cell.toString() : ''))
        .join(' ');
      sheetContent += rowText + '\n';
    });
    
    sheets.push({
      name: worksheet.name,
      content: sheetContent.trim()
    });
  });
  
  return sheets;
}
