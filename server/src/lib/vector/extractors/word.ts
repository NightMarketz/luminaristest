import mammoth from 'mammoth';
import { ValidationError } from '../../errors';

/** BRD F-66.4 (decisão do dono, 10/11): DOCX até 2.000.000 de caracteres extraídos; acima, 400. */
export const MAX_WORD_CHARS = 2_000_000;

/**
 * Extracts raw text from a Word (.docx) file buffer
 * @param buffer The Word file as ArrayBuffer
 */
export async function extractTextFromWord(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  if (result.value.length > MAX_WORD_CHARS) {
    throw new ValidationError(
      `Documento grande demais: ${result.value.length} caracteres passam do limite de ${MAX_WORD_CHARS}.`,
    );
  }
  return result.value;
}
