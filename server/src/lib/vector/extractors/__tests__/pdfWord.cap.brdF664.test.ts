/**
 * BRD F-66.4 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-66) — metade PDF/DOCX.
 *
 * Decisão do dono (questionário de 10/11): PDF até 500 páginas, DOCX até 2.000.000 de caracteres de texto extraído;
 * acima do teto, recusar com 400 (nada é indexado pela metade). Comportamento esperado: `extractTextFromPDF` e
 * `extractTextFromWord` lançam `ValidationError` com o limite na mensagem quando o arquivo passa do teto.
 * As bibliotecas são simuladas: o que se prova é a regra do teto, não o parser.
 */
const pdfParse = jest.fn();
const extractRawText = jest.fn();
jest.mock('pdf-parse', () => ({ __esModule: true, default: (...a: unknown[]) => pdfParse(...a) }));
jest.mock('mammoth', () => ({ __esModule: true, default: { extractRawText: (...a: unknown[]) => extractRawText(...a) } }));

import { extractTextFromPDF } from '../pdf';
import { extractTextFromWord } from '../word';
import { ValidationError } from '../../../errors';

const buf = new ArrayBuffer(4);

describe('BRD F-66.4 — teto de páginas (PDF) e de caracteres (DOCX)', () => {
  it('BRD F-66.4 PDF com 501 páginas ⇒ ValidationError citando 500', async () => {
    pdfParse.mockResolvedValueOnce({ text: 'x', numpages: 501 });
    const err = await extractTextFromPDF(buf).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as Error).message).toMatch(/500/);
  });

  it('BRD F-66.4 PDF com 500 páginas ⇒ texto', async () => {
    pdfParse.mockResolvedValueOnce({ text: 'ok', numpages: 500 });
    await expect(extractTextFromPDF(buf)).resolves.toBe('ok');
  });

  it('BRD F-66.4 DOCX com 2.000.001 caracteres ⇒ ValidationError', async () => {
    extractRawText.mockResolvedValueOnce({ value: 'a'.repeat(2_000_001) });
    await expect(extractTextFromWord(buf)).rejects.toBeInstanceOf(ValidationError);
  });

  it('BRD F-66.4 DOCX com 2.000.000 caracteres ⇒ texto', async () => {
    extractRawText.mockResolvedValueOnce({ value: 'a'.repeat(2_000_000) });
    await expect(extractTextFromWord(buf)).resolves.toHaveLength(2_000_000);
  });
});
