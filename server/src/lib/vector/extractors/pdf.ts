import pdfParse from 'pdf-parse';
import { ValidationError } from '../../errors';

/** BRD F-66.4 (decisão do dono, 10/11): PDF até 500 páginas; acima, 400 — nada é indexado pela metade. */
export const MAX_PDF_PAGES = 500;

/**
 * Extracts raw text from a PDF file buffer
 * @param buffer The PDF file as ArrayBuffer
 */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // `max` limita o texto extraído às primeiras páginas; `numpages` é o total do documento.
  const { text, numpages } = await pdfParse(Buffer.from(buffer), { max: MAX_PDF_PAGES });
  if (numpages > MAX_PDF_PAGES) {
    throw new ValidationError(`PDF grande demais: ${numpages} páginas passam do limite de ${MAX_PDF_PAGES}.`);
  }
  return text;
}
