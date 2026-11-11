import type { Request, Response } from 'express';

/**
 * BRD F-66.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-66 do inventário de estruturas implícitas).
 *
 * `computeTokenCost` (`POST /documents/token-cost`) não conferia a assinatura de bytes, como o `uploadDocument`
 * confere, e o erro do extrator de texto (arquivo corrompido) caía no `handleApiError` como 500.
 * Comportamento esperado: (a) conteúdo que não bate com o tipo declarado ⇒ 415 sem chamar o extrator;
 * (b) arquivo do tipo certo que o extrator não lê ⇒ 4xx de validação, não 500.
 */
jest.mock('@/lib/authUtils', () => ({
  __esModule: true,
  getUserContextFromRequest: () => ({ id: 'u1', userId: 'u1' }),
}));

import { computeTokenCost } from '../documentsController';
import { DocumentProcessingService } from '@/features/documents/services/DocumentProcessingService';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn(() => res) as unknown as Response['status'];
  res.json = jest.fn(() => res) as unknown as Response['json'];
  return res;
}

const reqWith = (buffer: Buffer, mimetype: string) =>
  ({ file: { buffer, mimetype, originalname: 'x', size: buffer.length } }) as unknown as Request;

describe('BRD F-66.1 — custo de tokens confere bytes e converte o erro do extrator', () => {
  afterEach(() => jest.restoreAllMocks());

  it('BRD F-66.1 PDF declarado com bytes que não são PDF ⇒ 415, extrator não roda', async () => {
    const spy = jest.spyOn(DocumentProcessingService.prototype, 'extractText');
    const res = mockRes();
    await computeTokenCost(reqWith(Buffer.from('isto nao e pdf'), 'application/pdf'), res);
    expect(res.status).toHaveBeenCalledWith(415);
    expect(spy).not.toHaveBeenCalled();
  });

  it('BRD F-66.1 PDF com assinatura certa e corpo ilegível ⇒ 4xx de validação, não 500', async () => {
    jest.spyOn(DocumentProcessingService.prototype, 'extractText').mockRejectedValueOnce(new Error('Invalid PDF structure'));
    const res = mockRes();
    await computeTokenCost(reqWith(Buffer.from('%PDF-1.4 lixo'), 'application/pdf'), res);
    const status = (res.status as jest.Mock).mock.calls[0][0];
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });

  it('BRD F-66.1 controle: CSV ⇒ 200 com a contagem', async () => {
    const res = mockRes();
    await computeTokenCost(reqWith(Buffer.from('a,b\n1,2'), 'text/csv'), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
