/**
 * BE-INCR-DFE-ANEXO-PENDENTE (BRIEF item 10, "1 integração SQLite real") — repositório real: a pendência nasce na tx da
 * autorização (coluna Bytes, F-PA-1 a), sobrevive à falha do anexo, é drenada pela varredura (bytes zerados) e a
 * recusa da tx não deixa pendência. Upload e proveniência são dublês (serviços vizinhos; o que se prova aqui é o
 * repositório + a tx).
 */
const mockPort = {
  name: 'null',
  capabilities: { numbersDps: false, consultar: true, cancelar: true, webhook: false },
  emitir: jest.fn(),
  consultar: jest.fn(),
  cancelar: jest.fn(),
  verifyWebhook: jest.fn(),
};
jest.mock('@/features/accounting/dfe/selectDfeEmissor', () => ({
  __esModule: true,
  selectDfeEmissor: () => ({ enabled: true, ambiente: 'producao', port: mockPort }),
}));

import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { FiscalDocumentRepository, attemptRef } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalDocumentLifecycleService } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { EmissaoResult } from '@/features/accounting/dfe/DfeEmissorPort';

const DONO = 'u-dfe-pend';
const UNIT = 'unit-dfe-pend';
const scope = resolveAccountingScope({ userId: DONO }, UNIT);
const repo = new FiscalDocumentRepository();
const upload = jest.fn(async (_s: unknown, a: { fileName: string }) => ({ id: `att-${a.fileName}` }));
const attachSourceDocument = jest.fn(async () => ({ id: 'src-real' }));

const service = new FiscalDocumentLifecycleService(
  repo,
  { getById: jest.fn(async (_s: unknown, id: string) => ({ id })) } as never,
  { upload } as never,
  { attachSourceDocument, retireSourceDocument: jest.fn() } as never,
  { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true } as never,
  { append: jest.fn() } as never,
);

async function pendente(saleId: string) {
  return repo.createSent(scope, {
    kind: 'NFSE',
    saleId,
    cTribNac: '060101',
    anchorEntryId: 'entry-x',
    ambiente: 'producao',
    partner: 'null',
    serie: 1,
    numero: 1n,
    dCompet: '2026-10-09',
    vServCents: 10000n,
    tpRetISSQN: 1,
    payloadJson: '{"v":1}',
  });
}

const auth = (docId: string, chave: string): EmissaoResult => ({
  status: 'AUTHORIZED',
  partnerRef: attemptRef(docId, 1),
  numero: '1',
  chaveOuCodigo: chave,
  xml: Buffer.from(`<NFSe chave="${chave}"/>`),
  errors: [],
});

describe('DFE-ANEXO-PENDENTE — pendência em SQLite real', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('falha do upload inline → AUTHORIZED + pendência PENDING com os bytes; a varredura drena → ids no documento, bytes zerados, DONE', async () => {
    const doc = await pendente('sale-pend-1');
    mockPort.consultar.mockResolvedValueOnce(auth(doc.id, 'CHAVE-P1'));
    upload.mockRejectedValueOnce(new Error('ENOSPC'));

    await service.consultarUm(scope, doc.id);

    const depoisDaAutorizacao = await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: doc.id } });
    expect(depoisDaAutorizacao).toMatchObject({ status: 'AUTHORIZED', xmlAttachmentId: null, sourceDocumentId: null });
    const p1 = await prisma.fiscalDocumentPendingAttachment.findUniqueOrThrow({ where: { documentId: doc.id } });
    expect(p1).toMatchObject({ status: 'PENDING', userId: DONO, unitId: UNIT, xmlAttachmentId: null });
    expect(Buffer.from(p1.xmlBytes!).toString()).toBe('<NFSe chave="CHAVE-P1"/>');

    const summary = await service.drainPendingAttachmentsOnce();
    expect(summary).toMatchObject({ done: 1, failed: 0 });

    const final = await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: doc.id } });
    expect(final).toMatchObject({ status: 'AUTHORIZED', xmlAttachmentId: `att-${doc.id}.xml`, sourceDocumentId: 'src-real' });
    const p2 = await prisma.fiscalDocumentPendingAttachment.findUniqueOrThrow({ where: { documentId: doc.id } });
    expect(p2).toMatchObject({ status: 'DONE', xmlBytes: null, pdfBytes: null, xmlAttachmentId: `att-${doc.id}.xml`, sourceDocumentId: 'src-real' });
  });

  it('recusa da tx de autorização (cancelado durante a consulta) → nenhuma pendência gravada', async () => {
    const doc = await pendente('sale-pend-2');
    mockPort.consultar.mockImplementationOnce(async (): Promise<EmissaoResult> => {
      await repo.transition(scope, doc.id, { status: 'CANCELLED', cancelledAt: new Date(), saleKey: `cancelled:${doc.id}:sale-pend-2` });
      return auth(doc.id, 'CHAVE-P2');
    });

    await service.consultarUm(scope, doc.id).catch(() => undefined);

    expect(await prisma.fiscalDocumentPendingAttachment.count({ where: { documentId: doc.id } })).toBe(0);
  });

  it('backfill: documento autorizado sem anexo e sem pendência é reconsultado; rodar 2× deixa uma pendência só', async () => {
    const doc = await pendente('sale-pend-3');
    await repo.transition(scope, doc.id, { status: 'AUTHORIZED', partnerRef: attemptRef(doc.id, 1), chaveOuCodigo: 'CHAVE-P3', authorizedAt: new Date() });
    mockPort.consultar.mockResolvedValue(auth(doc.id, 'CHAVE-P3'));
    upload.mockRejectedValue(new Error('disco'));

    await service.drainPendingAttachmentsOnce();
    await service.drainPendingAttachmentsOnce();

    expect(await prisma.fiscalDocumentPendingAttachment.count({ where: { documentId: doc.id } })).toBe(1);
    mockPort.consultar.mockReset();
    upload.mockReset();
    upload.mockImplementation(async (_s: unknown, a: { fileName: string }) => ({ id: `att-${a.fileName}` }));
  });
});
