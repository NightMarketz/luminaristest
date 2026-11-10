/**
 * BRD F-62.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-62 do inventário de estruturas implícitas).
 *
 * O 415 de tipo de arquivo recusado (`handleUploadError` em `lib/uploadSecurity.ts`) tinha texto fixo,
 * "Allowed: PDF, PNG, JPEG, DOCX, XLSX, CSV, TXT.", para toda rota — errado para o certificado (`.pfx`/`.p12`)
 * e para o XML de NF-e/NFS-e: a mensagem mandava enviar um tipo que seria recusado. Comportamento esperado: a
 * mensagem é montada da allowlist do chamador.
 */
import express from 'express';
import request from 'supertest';
import { makeUploadFieldsMiddleware, makeUploadMiddleware } from '../uploadSecurity';

function appWith(mw: express.RequestHandler) {
  const app = express();
  app.post('/up', mw, (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

const CERT = new Set(['application/x-pkcs12', 'application/pkcs12', 'application/octet-stream']);
const XML = new Set(['text/xml', 'application/xml', 'text/plain', 'application/octet-stream']);

describe('BRD F-62.1 — 415 lista os tipos da allowlist do chamador', () => {
  it('BRD F-62.1 certificado: PNG recusado ⇒ mensagem cita PFX/P12, não PDF', async () => {
    const res = await request(appWith(makeUploadMiddleware(CERT, 'file', 1024 * 1024)))
      .post('/up')
      .attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
    expect(res.body.error).toMatch(/PFX|P12/);
    expect(res.body.error).not.toMatch(/PDF/);
  });

  it('BRD F-62.1 vários campos (XML): PDF no campo XML ⇒ mensagem cita XML, não DOCX', async () => {
    const mw = makeUploadFieldsMiddleware([{ name: 'file', allowedTypes: XML }], 1024 * 1024);
    const res = await request(appWith(mw))
      .post('/up')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(415);
    expect(res.body.error).toMatch(/XML/);
    expect(res.body.error).not.toMatch(/DOCX/);
  });
});
