/**
 * BE-INCR-DFE-EVENTOS (nó X11, item 14) — "Testável (integração, repositório real)": autorizar a substituta cancela a
 * original NA MESMA tx; depois, 1 documento vivo por (venda, cTribNac), a original CANCELLED com o vínculo e a
 * proveniência da original aposentada (a da substituta anexada). Repositório e tx reais em SQLite; upload/proveniência
 * são dublês (serviços vizinhos — mesmo desenho do `pendingAttachment.integration.test`), então "1 SourceDocument vivo"
 * é provado pelas chamadas attach (substituta) × retire (original).
 */
const mockPort = {
  name: 'null',
  capabilities: { numbersDps: false, consultar: true, cancelar: true, webhook: false, substituir: true },
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
import { Prisma } from 'generated/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { FiscalDocumentRepository, attemptRef } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalDocumentLifecycleService } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';

const DONO = 'u-dfe-subst';
const UNIT = 'unit-dfe-subst';
const scope = resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const repo = new FiscalDocumentRepository();
const attachSourceDocument = jest.fn(async () => ({ id: 'src-substituta' }));
const retireSourceDocument = jest.fn(async () => undefined);
const append = jest.fn();

const service = new FiscalDocumentLifecycleService(
  repo,
  { getById: jest.fn(async (_s: unknown, id: string) => ({ id })) } as never,
  { upload: jest.fn(async (_s: unknown, a: { fileName: string }) => ({ id: `att-${a.fileName}` })) } as never,
  { attachSourceDocument, retireSourceDocument } as never,
  { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true } as never,
  { append } as never,
);

const CH_ORIGINAL = '3'.repeat(50);
const CH_SUBST = '4'.repeat(50);

async function original(saleId: string) {
  const doc = await repo.createSent(scope, {
    kind: 'NFSE', saleId, cTribNac: '060101', anchorEntryId: 'entry-x', ambiente: 'producao', partner: 'null', serie: 1, numero: 1n,
    dCompet: '2026-10-01', vServCents: 10000n, tpRetISSQN: 1, payloadJson: '{"v":1}',
  });
  await repo.transition(scope, doc.id, {
    status: 'AUTHORIZED', partnerRef: attemptRef(doc.id, 1), chaveOuCodigo: CH_ORIGINAL + saleId.length, authorizedAt: new Date(),
    nfseDhProc: new Date('2026-10-01T10:00:00-03:00'), sourceDocumentId: `src-${saleId}`,
  });
  return doc;
}

async function substituta(orig: { id: string; saleId: string }) {
  return repo.createSent(scope, {
    kind: 'NFSE', saleId: orig.saleId, saleKey: `subst:${orig.id}:${orig.saleId}`, cTribNac: '060101', anchorEntryId: 'entry-x',
    ambiente: 'producao', partner: 'null', serie: 1, numero: 2n, dCompet: '2026-10-01', vServCents: 10000n, tpRetISSQN: 1,
    payloadJson: '{"v":2}', substitutesDocumentId: orig.id, substMotivo: '03', substReason: null,
  });
}

const vivos = (saleId: string) => prisma.fiscalDocument.count({ where: { userId: DONO, unitId: UNIT, saleId, cTribNac: '060101', status: { not: 'CANCELLED' }, deletedAt: null } });

describe('item 14 — substituição em SQLite real', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => jest.clearAllMocks());

  it('a saleKey temporária deixa a substituta coexistir com a original e o @@unique recusa um 2º substituto (F-EVT-3 a)', async () => {
    const orig = await original('sale-subst-0');
    await substituta(orig);
    expect(await vivos('sale-subst-0')).toBe(2); // original AUTHORIZED + substituta SENT, sem colisão
    await expect(substituta(orig)).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it('substituta autorizada → original CANCELLED com vínculo e saleKey renomeada, substituta assume o saleId, 1 vivo; proveniência trocada', async () => {
    const orig = await original('sale-subst-1');
    const subst = await substituta(orig);
    mockPort.consultar.mockResolvedValueOnce({
      status: 'AUTHORIZED', partnerRef: attemptRef(subst.id, 1), numero: '2', chaveOuCodigo: CH_SUBST, dhProc: '2026-10-05T09:00:00-03:00',
      xml: Buffer.from('<NFSe/>'), errors: [],
    });

    await service.consultarUm(scope, subst.id);

    const o = await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: orig.id } });
    const s = await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: subst.id } });
    expect(o).toMatchObject({ status: 'CANCELLED', saleKey: `cancelled:${orig.id}:sale-subst-1`, substitutedByDocumentId: subst.id, cancelMotivo: null });
    expect(o.cancelledAt?.toISOString()).toBe('2026-10-05T12:00:00.000Z'); // = nfseDhProc da substituta
    expect(s).toMatchObject({ status: 'AUTHORIZED', saleKey: 'sale-subst-1', substitutesDocumentId: orig.id });
    expect(s.nfseDhProc?.toISOString()).toBe('2026-10-05T12:00:00.000Z');
    expect(await vivos('sale-subst-1')).toBe(1);
    expect(retireSourceDocument).toHaveBeenCalledWith(scope, 'src-sale-subst-1', 'dfe_substituted:03');
    expect(attachSourceDocument).toHaveBeenCalledTimes(1); // a da substituta (pendência drenada inline)
    expect(append).toHaveBeenCalledWith(expect.anything(), scope, expect.objectContaining({ eventType: 'dfe.substituted' }));
  });

  it('F-EVT-6 (a): a original já está CANCELLED (cancelada pelo emitente durante a consulta) quando a substituta autoriza → a substituta autoriza e a original só ganha o vínculo, sem aposentar proveniência', async () => {
    const orig = await original('sale-subst-2');
    const subst = await substituta(orig);
    mockPort.consultar.mockImplementationOnce(async () => {
      await repo.transition(scope, orig.id, { status: 'CANCELLED', cancelledAt: new Date(), cancelMotivo: 1, saleKey: `cancelled:${orig.id}:sale-subst-2` });
      return { status: 'AUTHORIZED', partnerRef: attemptRef(subst.id, 1), numero: '2', chaveOuCodigo: CH_SUBST + 'x', errors: [] };
    });

    await service.consultarUm(scope, subst.id);

    const s = await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: subst.id } });
    const o = await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: orig.id } });
    expect(s).toMatchObject({ status: 'AUTHORIZED', saleKey: 'sale-subst-2' });
    expect(o).toMatchObject({ status: 'CANCELLED', cancelMotivo: 1, substitutedByDocumentId: subst.id });
    expect(retireSourceDocument).not.toHaveBeenCalledWith(scope, 'src-sale-subst-2', expect.anything());
    expect(await vivos('sale-subst-2')).toBe(1);
  });
});
