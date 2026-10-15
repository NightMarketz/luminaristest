/**
 * BE-INCR-SOURCE-DOCUMENT-UPLOAD (BRIEF itens 1–5, 8, 10–11; F-SD-1..11 ratificados 15/10) — POST
 * /api/accounting/source-documents ponta a ponta: multipart, allowlist F-SD-6 (b), SD + anexo SOURCE_DOCUMENT na mesma
 * tx, auditoria `source_document.uploaded`, compensação TX-001 e download pelo GET /attachments/:id. Os consumidores
 * (PUT do DAS e do histórico) estão em simplesApuracao/simplesEntradas.integration.test.ts.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import * as storage from '@/lib/attachmentStorage';
import { AuditService } from '@/features/accounting/services/AuditService';
import { canonicalizeAuditPayload } from '@/features/accounting/audit/auditCanonical';

const app = makeApp();
let user: { id: string; username: string };
const UNIT = 'unit-sd-upload';
const OUTRA = 'unit-sd-outra';
const PDF = Buffer.from('%PDF-1.4\n% DAS de teste\n%%EOF\n');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

const upload = (fields: Record<string, string>, file?: { buf: Buffer; name: string; type: string }) => {
  let r = request(app).post('/api/accounting/source-documents').set(authHeader(user));
  for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
  return file ? r.attach('file', file.buf, { filename: file.name, contentType: file.type }) : r;
};
const pdf = { buf: PDF, name: 'das-2026-06.pdf', type: 'application/pdf' };

beforeAll(() => pushTestSchema());
beforeAll(async () => {
  const u = await prisma.user.create({ data: { name: 'sdup', username: 'sdup', email: 'sdup@test.local', password: 'x', role: 'USER' } });
  user = { id: u.id, username: u.username };
});
afterAll(() => prisma.$disconnect());

describe('POST /api/accounting/source-documents', () => {
  it('PDF válido → 201 com sha256 do servidor; SD aponta o anexo SOURCE_DOCUMENT; auditoria com o payload exato da allowlist', async () => {
    const r = await upload({ unitId: UNIT, sourceType: 'tax.simples.das', externalRef: '07202617000000001', documentDate: '2026-07-20' }, pdf);
    expect(r.status).toBe(201);
    const v = r.body.data;
    const sha = createHash('sha256').update(PDF).digest('hex');
    expect(v).toMatchObject({ sourceType: 'tax.simples.das', externalRef: '07202617000000001', documentDate: '2026-07-20', description: null });
    expect(v.attachment).toEqual({ id: expect.any(String), fileName: expect.any(String), mimeType: 'application/pdf', fileSize: PDF.length, sha256: sha });
    expect(v).not.toHaveProperty('unitId');
    expect(v.attachment).not.toHaveProperty('storageKey');

    const sd = await prisma.sourceDocument.findUniqueOrThrow({ where: { id: v.id } });
    expect(sd).toMatchObject({ userId: user.id, unitId: UNIT, attachmentId: v.attachment.id, createdById: user.id, deletedAt: null });
    const att = await prisma.documentAttachment.findUniqueOrThrow({ where: { id: v.attachment.id } });
    expect(att).toMatchObject({ targetType: 'SOURCE_DOCUMENT', targetId: v.id, sha256: sha, unitId: UNIT });

    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { eventType: 'source_document.uploaded', targetId: v.id } });
    const payload = { sourceDocumentId: v.id, attachmentId: v.attachment.id, sourceType: 'tax.simples.das', mimeType: 'application/pdf', sizeBytes: String(PDF.length), sha256: sha };
    expect(JSON.parse(ev.payload)).toEqual(payload);
    // A allowlist não deixa passar o nome do arquivo nem a referência humana (texto livre).
    expect(JSON.parse(canonicalizeAuditPayload('source_document.uploaded', { ...payload, fileName: 'x.pdf', externalRef: 'y' }))).toEqual(payload);
  });

  it('download do anexo pelo GET /attachments/:id devolve os mesmos bytes', async () => {
    const r = await upload({ unitId: UNIT, sourceType: 'tax.simples.historico' }, { buf: PNG, name: 'extrato.png', type: 'image/png' });
    expect(r.status).toBe(201);
    const d = await request(app)
      .get(`/api/accounting/attachments/${r.body.data.attachment.id}?unitId=${UNIT}`)
      .set(authHeader(user))
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(d.status).toBe(200);
    expect(Buffer.compare(d.body as Buffer, PNG)).toBe(0);
    // Escopo: a outra unidade não enxerga o anexo.
    expect((await request(app).get(`/api/accounting/attachments/${r.body.data.attachment.id}?unitId=${OUTRA}`).set(authHeader(user))).status).toBe(404);
  });

  it('sem file = 400; MIME fora da allowlist F-SD-6 b (DOCX, octet-stream) = 415; PDF falsificado = 415', async () => {
    const antes = await prisma.sourceDocument.count();
    expect((await upload({ unitId: UNIT, sourceType: 'tax.simples.das' })).status).toBe(400);
    const docx = await upload({ unitId: UNIT, sourceType: 'tax.simples.das' }, { buf: Buffer.from([0x50, 0x4b, 0x03, 0x04]), name: 'x.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    expect(docx.status).toBe(415);
    expect((await upload({ unitId: UNIT, sourceType: 'tax.simples.das' }, { buf: PDF, name: 'x.bin', type: 'application/octet-stream' })).status).toBe(415);
    expect((await upload({ unitId: UNIT, sourceType: 'tax.simples.das' }, { buf: Buffer.from('não é pdf'), name: 'x.pdf', type: 'application/pdf' })).status).toBe(415);
    expect(await prisma.sourceDocument.count()).toBe(antes);
  });

  it('sourceType fora da lista = 400; campo desconhecido = 400; data irreal = 400', async () => {
    expect((await upload({ unitId: UNIT, sourceType: 'bank.statement' }, pdf)).status).toBe(400);
    expect((await upload({ unitId: UNIT, sourceType: 'tax.simples.das', attachmentId: 'x' }, pdf)).status).toBe(400);
    expect((await upload({ unitId: UNIT, sourceType: 'tax.simples.das', documentDate: '2026-02-30' }, pdf)).status).toBe(400);
  });

  it('sem autenticação = 401', async () => {
    const r = await request(app).post('/api/accounting/source-documents').field('unitId', UNIT).field('sourceType', 'tax.simples.das').attach('file', PDF, { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(401);
  });

  it('TX-001: falha forçada na tx não deixa arquivo no disco, nem SD, nem anexo (compensação)', async () => {
    // Arquivos do escopo em disco (ATTACHMENTS_DIR/<user>/<unit>/<sd>/…) antes e depois: a compensação apaga o órfão.
    const arquivos = () => {
      const dir = storage.resolveReadPath(`${user.id}/${UNIT}`);
      return existsSync(dir) ? readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).length : 0;
    };
    const append = jest.spyOn(AuditService.prototype, 'append').mockRejectedValueOnce(new Error('falha forçada na auditoria'));
    const [sds, atts, files] = [await prisma.sourceDocument.count(), await prisma.documentAttachment.count(), arquivos()];
    const r = await upload({ unitId: UNIT, sourceType: 'tax.simples.das' }, pdf);
    const chamadas = append.mock.calls.length;
    append.mockRestore();
    expect(r.status).toBe(500);
    expect(chamadas).toBe(1);
    expect(arquivos()).toBe(files);
    expect([await prisma.sourceDocument.count(), await prisma.documentAttachment.count()]).toEqual([sds, atts]);
  });
});
