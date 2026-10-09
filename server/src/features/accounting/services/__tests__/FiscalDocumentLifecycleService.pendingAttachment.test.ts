/**
 * BE-INCR-DFE-ANEXO-PENDENTE (BRIEF docs/accounting/BE-INCR-DFE-ANEXO-PENDENTE-brief.md, itens 3–11) — pendência de anexo
 * e proveniência da NFS-e autorizada em produção. Repositório dublê com estado (pendência e documento em memória); a
 * prova em SQLite real está em FiscalDocumentLifecycleService.pendingAttachment.integration.test.ts.
 */
const mockPort = {
  name: 'focus',
  capabilities: { numbersDps: false, consultar: true, cancelar: true, webhook: false },
  emitir: jest.fn(),
  consultar: jest.fn(),
  cancelar: jest.fn(),
  verifyWebhook: jest.fn(),
};
const mockManualPort = { ...mockPort, name: 'manual', capabilities: { numbersDps: true, consultar: false, cancelar: false, webhook: false } };
const mockSelection = { enabled: true, ambiente: 'producao' as string | null, port: mockPort };
jest.mock('../../dfe/selectDfeEmissor', () => ({ __esModule: true, selectDfeEmissor: () => mockSelection }));
jest.mock('../../dfe/resolveEmissor', () => ({
  __esModule: true,
  resolveEmissorFor: (partner: string) => (partner === 'manual' ? mockManualPort : mockPort),
}));
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
jest.mock('../../../../lib/logger', () => ({ __esModule: true, default: mockLogger }));

import { FiscalDocumentLifecycleService, PENDING_MAX_ATTEMPTS } from '../FiscalDocumentLifecycleService';
import { PendingAttachmentResultSchema, PendingAttachmentDrainSummarySchema } from '../../dtos/FiscalDocumentPendingAttachmentDto';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { EmissaoResult } from '../../dfe/DfeEmissorPort';

const SCOPE: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

type Doc = Record<string, unknown> & { id: string; status: string; ambiente: string; partner: string };
type Pending = {
  id: string;
  userId: string;
  unitId: string;
  documentId: string;
  status: string;
  xmlBytes: Buffer | null;
  pdfBytes: Buffer | null;
  xmlAttachmentId: string | null;
  pdfAttachmentId: string | null;
  sourceDocumentId: string | null;
  resultJson: string;
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
};

function baseDoc(over: Partial<Doc> = {}): Doc {
  return {
    id: 'doc-1',
    userId: 'u1',
    unitId: 'unit-1',
    kind: 'NFSE',
    status: 'SENT',
    saleId: 'sale-1',
    anchorEntryId: 'entry-1',
    ambiente: 'producao',
    partner: 'focus',
    partnerRef: 'doc-1:1',
    numero: 1n,
    nNFSe: null,
    chaveOuCodigo: null,
    dCompet: '2026-10-01',
    currentAttemptNo: 1,
    xmlAttachmentId: null,
    pdfAttachmentId: null,
    sourceDocumentId: null,
    ...over,
  };
}

const AUTH: EmissaoResult = {
  status: 'AUTHORIZED',
  partnerRef: 'doc-1:1',
  numero: '1',
  nNFSe: 'NF1',
  chaveOuCodigo: 'CHAVE-1',
  valores: { vIssCents: '500', aliqIssBp: 500 },
  xml: Buffer.from('<NFSe/>'),
  pdf: Buffer.from('%PDF'),
  errors: [],
};

function harness(docs: Doc[] = [baseDoc()]) {
  const docsById = new Map(docs.map((d) => [d.id, { ...d }]));
  const pendings = new Map<string, Pending>();
  let seq = 0;
  let attSeq = 0;
  const repo = {
    findById: jest.fn(async (_s: unknown, id: string) => {
      const d = docsById.get(id);
      return d ? { ...d, attempts: [] } : null;
    }),
    transition: jest.fn(async (_s: unknown, id: string, data: Record<string, unknown> & { status: string; whenStatusIn?: string[] }) => {
      const d = docsById.get(id)!;
      if (data.whenStatusIn && !data.whenStatusIn.includes(d.status)) throw new Error(`fiscal_document_status_changed: ${id}`);
      const { whenStatusIn: _w, attemptResult: _a, ...fields } = data;
      docsById.set(id, { ...d, ...fields });
      return docsById.get(id);
    }),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true })),
    createPendingAttachment: jest.fn(async (_s: unknown, data: { documentId: string; xmlBytes: Buffer | null; pdfBytes: Buffer | null; resultJson: string }) => {
      if ([...pendings.values()].some((p) => p.documentId === data.documentId)) throw new Error('P2002 documentId');
      const p: Pending = {
        id: `pend-${++seq}`,
        userId: 'u1',
        unitId: 'unit-1',
        status: 'PENDING',
        xmlAttachmentId: null,
        pdfAttachmentId: null,
        sourceDocumentId: null,
        attempts: 0,
        nextAttemptAt: new Date(0),
        lastError: null,
        ...data,
      };
      pendings.set(p.id, p);
      return { ...p };
    }),
    listDuePendingAttachments: jest.fn(async (now: Date) =>
      [...pendings.values()].filter((p) => p.status === 'PENDING' && p.nextAttemptAt <= now).map((p) => ({ ...p }))),
    markPendingStep: jest.fn(async (id: string, patch: Partial<Pending>) => {
      pendings.set(id, { ...pendings.get(id)!, ...patch });
    }),
    markPendingDone: jest.fn(async (id: string) => {
      pendings.set(id, { ...pendings.get(id)!, status: 'DONE', xmlBytes: null, pdfBytes: null, lastError: null });
    }),
    listAttachmentBackfillCandidates: jest.fn(async () =>
      [...docsById.values()].filter(
        (d) =>
          (d.status === 'AUTHORIZED' || d.status === 'AUTHORIZED_DIVERGENT') &&
          d.ambiente === 'producao' &&
          d.xmlAttachmentId == null &&
          d.sourceDocumentId == null &&
          ![...pendings.values()].some((p) => p.documentId === d.id),
      )),
  };
  const documentAttachmentService = { upload: jest.fn(async (_s: unknown, a: { fileName: string }) => ({ id: `att-${++attSeq}-${a.fileName}` })) };
  const postingService = {
    attachSourceDocument: jest.fn(async () => ({ id: 'src-1' })),
    retireSourceDocument: jest.fn(async () => undefined),
  };
  const auditService = { append: jest.fn() };
  const service = new FiscalDocumentLifecycleService(
    repo as never,
    { getById: jest.fn(async (_s: unknown, id: string) => ({ id })) } as never,
    documentAttachmentService as never,
    postingService as never,
    { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true } as never,
    auditService as never,
  );
  const onlyPending = () => [...pendings.values()];
  return { service, repo, docsById, pendings, onlyPending, documentAttachmentService, postingService };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSelection.enabled = true;
  mockSelection.ambiente = 'producao';
});

describe('contratos (Zod .strict()) — BRIEF §4', () => {
  it('resultJson aceita o retorno estrutural e recusa chave extra (sem PII entrando por engano)', () => {
    expect(PendingAttachmentResultSchema.parse({ chaveOuCodigo: 'C', nNFSe: null, numero: '1', valores: null })).toBeTruthy();
    expect(() => PendingAttachmentResultSchema.parse({ chaveOuCodigo: 'C', nNFSe: null, numero: '1', valores: null, tomadorCpf: 'x' })).toThrow();
    expect(() => PendingAttachmentResultSchema.parse({ chaveOuCodigo: '', nNFSe: null, numero: null, valores: null })).toThrow();
  });
  it('resumo da varredura tem total/done/failed/discarded e nada mais', () => {
    expect(() => PendingAttachmentDrainSummarySchema.parse({ total: 0, done: 0, failed: 0, discarded: 0, extra: 1 })).toThrow();
  });
});

describe('item 3 — pendência nasce na tx da autorização', () => {
  it('produção: pendência criada com o tx da autorização, bytes do XML e do PDF e resultJson validado', async () => {
    const h = harness();
    mockPort.consultar.mockResolvedValueOnce(AUTH);
    await h.service.consultarUm(SCOPE, 'doc-1');
    expect(h.repo.createPendingAttachment).toHaveBeenCalledWith(
      SCOPE,
      expect.objectContaining({ documentId: 'doc-1', xmlBytes: AUTH.xml, pdfBytes: AUTH.pdf }),
      { tx: true },
    );
    const resultJson = JSON.parse(h.repo.createPendingAttachment.mock.calls[0][1].resultJson);
    expect(resultJson).toEqual({ chaveOuCodigo: 'CHAVE-1', nNFSe: 'NF1', numero: '1', valores: { vIssCents: '500', aliqIssBp: 500 } });
  });

  it('recusa na tx (status mudou antes da escrita) → 0 pendências, 0 anexos (guarda do #420)', async () => {
    const h = harness();
    mockPort.consultar.mockImplementationOnce(async () => {
      h.docsById.set('doc-1', { ...h.docsById.get('doc-1')!, status: 'CANCELLED' });
      return AUTH;
    });
    await expect(h.service.consultarUm(SCOPE, 'doc-1')).rejects.toThrow(/fiscal_document_status_changed/);
    expect(h.onlyPending()).toHaveLength(0);
    expect(h.documentAttachmentService.upload).not.toHaveBeenCalled();
  });

  it('homologação → sem pendência e sem anexo (ADR §9.2 item 5)', async () => {
    mockSelection.ambiente = 'homologacao';
    const h = harness([baseDoc({ ambiente: 'homologacao' })]);
    mockPort.consultar.mockResolvedValueOnce(AUTH);
    await h.service.consultarUm(SCOPE, 'doc-1');
    expect(h.repo.createPendingAttachment).not.toHaveBeenCalled();
    expect(h.documentAttachmentService.upload).not.toHaveBeenCalled();
  });
});

describe('itens 4–5 — caminho rápido inline e drenagem por passo', () => {
  it('caminho feliz: anexos + proveniência inline, documento com ids, pendência DONE e bytes zerados', async () => {
    const h = harness();
    mockPort.consultar.mockResolvedValueOnce(AUTH);
    await h.service.consultarUm(SCOPE, 'doc-1');
    const doc = h.docsById.get('doc-1')!;
    expect(doc).toMatchObject({ status: 'AUTHORIZED', xmlAttachmentId: 'att-1-doc-1.xml', pdfAttachmentId: 'att-2-doc-1.pdf', sourceDocumentId: 'src-1' });
    expect(h.onlyPending()[0]).toMatchObject({ status: 'DONE', xmlBytes: null, pdfBytes: null });
  });

  it('falha no upload inline → NÃO propaga; documento AUTHORIZED, pendência PENDING com os bytes', async () => {
    const h = harness();
    mockPort.consultar.mockResolvedValueOnce(AUTH);
    h.documentAttachmentService.upload.mockRejectedValueOnce(new Error('ENOSPC'));
    await expect(h.service.consultarUm(SCOPE, 'doc-1')).resolves.toBeDefined();
    expect(h.docsById.get('doc-1')).toMatchObject({ status: 'AUTHORIZED', xmlAttachmentId: null, sourceDocumentId: null });
    const p = h.onlyPending()[0];
    expect(p.status).toBe('PENDING');
    expect(p.xmlBytes?.toString()).toBe('<NFSe/>');
    expect(p.pdfBytes?.toString()).toBe('%PDF');
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/pendência fica para a varredura/), expect.objectContaining({ documentId: 'doc-1' }));
  });

  it('a varredura drena a pendência deixada pela falha → ids gravados no documento, bytes zerados, DONE', async () => {
    const h = harness();
    mockPort.consultar.mockResolvedValueOnce(AUTH);
    h.documentAttachmentService.upload.mockRejectedValueOnce(new Error('ENOSPC'));
    await h.service.consultarUm(SCOPE, 'doc-1');

    const summary = await h.service.drainPendingAttachmentsOnce();
    expect(summary).toEqual({ total: 1, done: 1, failed: 0, discarded: 0 });
    expect(h.docsById.get('doc-1')).toMatchObject({ status: 'AUTHORIZED', xmlAttachmentId: expect.stringMatching(/xml$/), pdfAttachmentId: expect.stringMatching(/pdf$/), sourceDocumentId: 'src-1' });
    expect(h.onlyPending()[0]).toMatchObject({ status: 'DONE', xmlBytes: null, pdfBytes: null });
  });

  it('F-PA-3: retentativa depois de falha ENTRE o upload do XML e o passo seguinte não sobe o XML de novo', async () => {
    const h = harness();
    mockPort.consultar.mockResolvedValueOnce(AUTH);
    // inline: XML sobe e o id é gravado; o upload do PDF falha.
    h.documentAttachmentService.upload
      .mockImplementationOnce(async () => ({ id: 'att-xml' }))
      .mockRejectedValueOnce(new Error('disco'));
    await h.service.consultarUm(SCOPE, 'doc-1');
    expect(h.onlyPending()[0]).toMatchObject({ status: 'PENDING', xmlAttachmentId: 'att-xml', pdfAttachmentId: null });

    await h.service.drainPendingAttachmentsOnce();
    const xmlUploads = h.documentAttachmentService.upload.mock.calls.filter((c) => (c[1] as { fileName: string }).fileName.endsWith('.xml'));
    expect(xmlUploads).toHaveLength(1); // sem o progresso por passo, seriam 2 anexos XML
    expect(h.docsById.get('doc-1')).toMatchObject({ xmlAttachmentId: 'att-xml', sourceDocumentId: 'src-1' });
  });

  it('item 6 (F-PA-5 c): cancelado antes da drenagem → XML anexado, proveniência criada e aposentada, DONE', async () => {
    const h = harness();
    mockPort.consultar.mockResolvedValueOnce(AUTH);
    h.documentAttachmentService.upload.mockRejectedValueOnce(new Error('ENOSPC'));
    await h.service.consultarUm(SCOPE, 'doc-1');
    h.docsById.set('doc-1', { ...h.docsById.get('doc-1')!, status: 'CANCELLED' });

    const summary = await h.service.drainPendingAttachmentsOnce();
    expect(summary.done).toBe(1);
    expect(h.documentAttachmentService.upload).toHaveBeenCalledWith(SCOPE, expect.objectContaining({ fileName: 'doc-1.xml', targetType: 'FISCAL_DOCUMENT' }));
    expect(h.postingService.attachSourceDocument).toHaveBeenCalledWith(SCOPE, 'entry-1', expect.objectContaining({ externalRef: 'CHAVE-1' }));
    expect(h.postingService.retireSourceDocument).toHaveBeenCalledWith(SCOPE, 'src-1', 'dfe_status_changed');
    expect(h.onlyPending()[0].status).toBe('DONE');
  });
});

describe('item 8 (F-PA-6 a) — backoff e teto', () => {
  it('falha na varredura → attempts++, nextAttemptAt com backoff de 2 min, lastError truncado a 500', async () => {
    const h = harness();
    mockPort.consultar.mockResolvedValueOnce(AUTH);
    h.documentAttachmentService.upload.mockRejectedValueOnce(new Error('x'));
    await h.service.consultarUm(SCOPE, 'doc-1');
    h.documentAttachmentService.upload.mockRejectedValueOnce(new Error('y'.repeat(900)));
    const antes = Date.now();
    const summary = await h.service.drainPendingAttachmentsOnce();
    expect(summary).toEqual({ total: 1, done: 0, failed: 1, discarded: 0 });
    const p = h.onlyPending()[0];
    expect(p.attempts).toBe(1);
    expect(p.lastError).toHaveLength(500);
    expect(p.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(antes + 120_000);
    expect(p.status).toBe('PENDING');
  });

  it('teto: a 10ª falha → FAILED + logger.error, bytes preservados para reprocesso manual', async () => {
    const h = harness();
    mockPort.consultar.mockResolvedValueOnce(AUTH);
    h.documentAttachmentService.upload.mockRejectedValueOnce(new Error('x'));
    await h.service.consultarUm(SCOPE, 'doc-1');
    const id = h.onlyPending()[0].id;
    h.pendings.set(id, { ...h.pendings.get(id)!, attempts: PENDING_MAX_ATTEMPTS - 1 });
    h.documentAttachmentService.upload.mockRejectedValueOnce(new Error('disco cheio'));
    await h.service.drainPendingAttachmentsOnce();
    const p = h.pendings.get(id)!;
    expect(p).toMatchObject({ status: 'FAILED', attempts: PENDING_MAX_ATTEMPTS });
    expect(p.xmlBytes).not.toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/teto de tentativas/), expect.objectContaining({ documentId: 'doc-1' }));
  });
});

describe('item 11 (F-PA-7 b, F-PA-8 b) — backfill por reconsulta em todo tick', () => {
  const antigo = (over: Partial<Doc> = {}) => baseDoc({ status: 'AUTHORIZED', chaveOuCodigo: 'CHAVE-OLD', nNFSe: 'NF9', numero: 9n, ...over });

  it('reconsulta com XML → pendência criada e drenada no mesmo tick', async () => {
    const h = harness([antigo()]);
    mockPort.consultar.mockResolvedValueOnce({ ...AUTH, pdf: undefined });
    const summary = await h.service.drainPendingAttachmentsOnce();
    expect(mockPort.consultar).toHaveBeenCalledWith('doc-1:1');
    expect(JSON.parse(h.repo.createPendingAttachment.mock.calls[0][1].resultJson)).toMatchObject({ chaveOuCodigo: 'CHAVE-OLD', nNFSe: 'NF9', numero: '9' });
    expect(summary.done).toBe(1);
    expect(h.docsById.get('doc-1')).toMatchObject({ xmlAttachmentId: expect.stringMatching(/xml$/), sourceDocumentId: 'src-1' });
  });

  it('modo manual → skip nomeado com o documentId, sem reconsulta e sem pendência', async () => {
    const h = harness([antigo({ partner: 'manual' })]);
    await h.service.drainPendingAttachmentsOnce();
    expect(mockManualPort.consultar).not.toHaveBeenCalled();
    expect(h.onlyPending()).toHaveLength(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/modo manual/), { documentId: 'doc-1' });
  });

  it('retorno sem XML → skip nomeado, sem pendência (e repete no próximo tick — custo declarado)', async () => {
    const h = harness([antigo()]);
    mockPort.consultar.mockResolvedValue({ ...AUTH, xml: undefined, pdf: undefined });
    await h.service.drainPendingAttachmentsOnce();
    await h.service.drainPendingAttachmentsOnce();
    expect(h.onlyPending()).toHaveLength(0);
    expect(mockPort.consultar).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/retorno sem XML/), { documentId: 'doc-1' });
    mockPort.consultar.mockReset();
  });

  it('rodar 2× com a 1ª drenagem falhando → uma pendência só', async () => {
    const h = harness([antigo()]);
    mockPort.consultar.mockResolvedValue(AUTH);
    h.documentAttachmentService.upload.mockRejectedValue(new Error('disco'));
    await h.service.drainPendingAttachmentsOnce();
    await h.service.drainPendingAttachmentsOnce();
    expect(h.onlyPending()).toHaveLength(1);
    expect(h.repo.createPendingAttachment).toHaveBeenCalledTimes(1);
    mockPort.consultar.mockReset();
    h.documentAttachmentService.upload.mockReset();
  });
});
