/**
 * NFE-DANFE-IBSCBS PR-3, itens 19 e 20 (`docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md`) — HTTP de ponta a ponta com
 * SQLite real: `GET /api/nfe/dfe/documents/:id/danfe`. O `FiscalDocument` NFE é semeado (o emissor do X10a PR-7 ainda não
 * produz NF-e 55) e o XML anexado é o fixture SINTÉTICO de leiaute completo, gravado pelo `attachmentStorage` de verdade.
 * O puppeteer é trocado por um stub (o render e o `htmlToPdf` têm teste próprio — aqui prova-se a rota, o cabeçalho e o
 * wiring).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import * as storage from '@/lib/attachmentStorage';
import { DanfeService } from '@/features/accounting/services/DanfeService';
import { AccountingPolicy } from '@/features/accounting/policies/AccountingPolicy';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

jest.mock('@/lib/pdf', () => ({ htmlToPdf: jest.fn(async (html: string) => Buffer.from(`%PDF-stub ${html.length}`)) }));

const app = makeApp();
const UNIT = 'unit-danfe';
const UNIT_INTRUSO = 'unit-danfe-intruso';
const XML = readFileSync(join(__dirname, '../../lib/__tests__/fixtures/nfe/purchase-full-layout.SYNTHETIC.xml'));
const CHAVE = /<chNFe>(\d{44})<\/chNFe>/.exec(XML.toString('utf8'))![1];

let dono: { id: string; username: string };
let intruso: { id: string; username: string };
let docId: string;

const danfe = (user: { id: string; username: string } | null, id: string, unitId = UNIT) => {
  const req = request(app).get(`/api/nfe/dfe/documents/${id}/danfe`).query({ unitId });
  return user ? req.set(authHeader(user)) : req;
};

describe('GET /api/nfe/dfe/documents/:id/danfe (NFE-DANFE-IBSCBS PR-3)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'danfe', username: 'danfe-dono', email: 'danfe@test.local', password: 'x', role: 'USER' } });
    intruso = await prisma.user.create({ data: { name: 'intruso', username: 'danfe-intruso', email: 'danfe-i@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: intruso.id, id: UNIT_INTRUSO });
    const doc = await prisma.fiscalDocument.create({
      data: {
        userId: dono.id, unitId: UNIT, kind: 'NFE', status: 'AUTHORIZED', saleId: 'sale-danfe', saleKey: 'sale-danfe',
        anchorEntryId: 'je-danfe', ambiente: 'producao', partner: 'sefaz', serie: 1, numero: 2n, chaveOuCodigo: CHAVE,
        dCompet: '2025-07-15', vServCents: 1n,
      },
    });
    docId = doc.id;
    const { storageKey, sanitizedName } = await storage.saveFile(dono.id, 'FISCAL_DOCUMENT', doc.id, `${doc.id}.xml`, XML);
    const att = await prisma.documentAttachment.create({
      data: {
        userId: dono.id, unitId: UNIT, targetType: 'FISCAL_DOCUMENT', targetId: doc.id, fileName: sanitizedName,
        mimeType: 'application/xml', fileSize: XML.length, sha256: '0'.repeat(64), storageKey, uploadedById: dono.id,
      },
    });
    await prisma.fiscalDocument.update({ where: { id: doc.id }, data: { xmlAttachmentId: att.id } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 20: o factory resolve o DanfeService', () => {
    expect(getFactory().getDanfeService()).toBeInstanceOf(DanfeService);
  });

  it('200 application/pdf, %PDF e attachment danfe-<chave>.pdf; nada é gravado', async () => {
    const antes = await prisma.documentAttachment.count();
    const res = await danfe(dono, docId).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/pdf/);
    expect(res.headers['content-disposition']).toBe(`attachment; filename="danfe-${CHAVE}.pdf"`);
    expect((res.body as Buffer).subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(await prisma.documentAttachment.count()).toBe(antes);
    expect((await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: docId } })).pdfAttachmentId).toBeNull();
  });

  it('sem token ⇒ 401', async () => {
    expect((await danfe(null, docId)).status).toBe(401);
  });

  it('policy de leitura fiscal negada ⇒ 403', async () => {
    const spy = jest.spyOn(AccountingPolicy.prototype, 'canReadFiscalDocument').mockReturnValue(false);
    try {
      expect((await danfe(dono, docId)).status).toBe(403);
    } finally {
      spy.mockRestore();
    }
  });

  it('documento de outro tenant ⇒ 404; param extra/ausente na query ⇒ 400', async () => {
    expect((await danfe(intruso, docId, UNIT_INTRUSO)).status).toBe(404);
    expect((await request(app).get(`/api/nfe/dfe/documents/${docId}/danfe`).set(authHeader(dono))).status).toBe(400);
  });
});
