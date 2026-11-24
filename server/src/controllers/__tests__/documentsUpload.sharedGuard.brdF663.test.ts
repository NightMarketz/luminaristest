import type { Request, Response } from 'express';

/**
 * BRD F-66.3 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-66 do inventário de estruturas implícitas).
 *
 * `documentsController` tinha cópia própria do multer e da conferência de bytes, com regra diferente da comum
 * (`lib/uploadSecurity.ts`) para `application/octet-stream`: a cópia exigia ZIP; a comum aceita ZIP ou PDF (o
 * navegador manda octet-stream para PDF também). Comportamento esperado: o upload de documento usa a mesma
 * conferência das demais rotas — PDF real declarado como octet-stream não é recusado; bytes sem assinatura são.
 */
const createDocument = jest.fn(async () => ({ id: 'doc1' }));

jest.mock('@/lib/authUtils', () => ({
  __esModule: true,
  getUserContextFromRequest: () => ({ id: 'u1', userId: 'u1' }),
}));
jest.mock('@/lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({ getDocumentService: () => ({ createDocument }) }),
}));

import { uploadDocument } from '../documentsController';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn(() => res) as unknown as Response['status'];
  res.json = jest.fn(() => res) as unknown as Response['json'];
  return res;
}

const reqWith = (buffer: Buffer, mimetype: string, originalname: string) =>
  ({ file: { buffer, mimetype, originalname, size: buffer.length }, body: {} }) as unknown as Request;

describe('BRD F-66.3 — upload de documento usa a conferência de bytes comum', () => {
  beforeEach(() => createDocument.mockClear());

  it('BRD F-66.3 PDF real enviado como octet-stream ⇒ aceito (regra comum: ZIP ou PDF)', async () => {
    const res = mockRes();
    await uploadDocument(reqWith(Buffer.from('%PDF-1.4 conteudo'), 'application/octet-stream', 'nota.pdf'), res);
    expect(res.status).not.toHaveBeenCalledWith(415);
    expect(createDocument).toHaveBeenCalledTimes(1);
  });

  it('BRD F-66.3 controle: octet-stream sem assinatura conhecida ⇒ 415', async () => {
    const res = mockRes();
    await uploadDocument(reqWith(Buffer.from('lixo qualquer'), 'application/octet-stream', 'x.pdf'), res);
    expect(res.status).toHaveBeenCalledWith(415);
    expect(createDocument).not.toHaveBeenCalled();
  });
});
