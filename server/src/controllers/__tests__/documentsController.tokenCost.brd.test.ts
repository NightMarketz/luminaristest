/**
 * BRD F-66.2 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-66 do inventário de estruturas implícitas).
 *
 * `computeTokenCost` passava ao extrator `data.buffer.slice(0, data.byteLength)`: o `ArrayBuffer` de base
 * a partir do byte 0, ignorando `byteOffset`. Um `Buffer` que é fatia de um pool (o caso comum de
 * buffers pequenos do Node) mandava ao extrator bytes de outro trecho. O esperado: o extrator recebe
 * exatamente os bytes do arquivo enviado.
 */
const extractText = jest.fn(async (_ab: ArrayBuffer, _mime: string) => 'texto');
jest.mock('@/features/documents/services/DocumentProcessingService', () => ({
  DocumentProcessingService: jest.fn().mockImplementation(() => ({ extractText })),
}));
jest.mock('@/lib/authUtils', () => ({ getUserContextFromRequest: () => ({ userId: 'u1', id: 'u1' }) }));
jest.mock('@/lib/factory', () => ({ getFactory: () => ({}) }));

import type { Request, Response } from 'express';
import { computeTokenCost } from '../documentsController';

function mockRes() {
  const res: { status: jest.Mock; json: jest.Mock } = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('BRD F-66.2 — custo de tokens lê os bytes do arquivo, não do pool', () => {
  it('BRD F-66.2: Buffer com byteOffset ≠ 0 chega ao extrator com os próprios bytes', async () => {
    const pool = Buffer.from('LIXO-DO-POOL|%PDF-1.4 conteudo do arquivo|MAIS-LIXO', 'latin1');
    const start = pool.indexOf('%PDF');
    const fileBytes = pool.subarray(start, pool.indexOf('|', start));
    expect(fileBytes.byteOffset).toBeGreaterThan(0);

    const req = { file: { buffer: fileBytes, mimetype: 'application/pdf', size: fileBytes.length, originalname: 'a.pdf' } } as unknown as Request;
    await computeTokenCost(req, mockRes() as unknown as Response);

    expect(extractText).toHaveBeenCalledTimes(1);
    const received = Buffer.from(extractText.mock.calls[0][0]).toString('latin1');
    expect(received).toBe('%PDF-1.4 conteudo do arquivo');
  });
});
