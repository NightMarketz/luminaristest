// Mock da SELEÇÃO da porta — controle total sobre emitir/consultar/cancelar por teste, sem
// depender das particularidades de NullEmissor/FileEmissor (mesmo espírito do mock de
// getFactory() em FiscalDocumentEmissionService.test.ts: isola o que este arquivo testa).
const mockPort = {
  name: 'null',
  capabilities: { numbersDps: false, consultar: true, cancelar: true, webhook: false },
  emitir: jest.fn(),
  consultar: jest.fn(),
  cancelar: jest.fn(),
  verifyWebhook: jest.fn(),
};
const mockSelection: { enabled: boolean; ambiente: string | null; reason?: string; port: typeof mockPort } = {
  enabled: true,
  ambiente: 'homologacao',
  port: mockPort,
};
jest.mock('../../dfe/selectDfeEmissor', () => ({
  __esModule: true,
  selectDfeEmissor: () => mockSelection,
}));

import { ConflictError, ValidationError } from '../../../../lib/errors';
import { FiscalDocumentLifecycleService, isValidResultTransition } from '../FiscalDocumentLifecycleService';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { CancelResult, EmissaoResult } from '../../dfe/DfeEmissorPort';

const SCOPE: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

function baseDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc-1',
    userId: 'u1',
    unitId: 'unit-1',
    kind: 'NFSE',
    status: 'SENT',
    saleId: 'sale-1',
    saleKey: 'sale-1',
    cTribNac: '060101',
    anchorEntryId: 'entry-1',
    ambiente: 'homologacao',
    partner: 'null',
    partnerRef: 'doc-1:1',
    serie: 1,
    numero: 1n,
    nNFSe: null,
    chaveOuCodigo: null,
    dCompet: '2026-09-01',
    vServCents: 10000n,
    vDescIncondCents: 0n,
    baseIssCents: null,
    aliqIssBp: null,
    vIssCents: null,
    tpRetISSQN: 1,
    vIbsCents: null,
    vCbsCents: null,
    currentAttemptNo: 1,
    authorizedAt: null,
    cancelledAt: null,
    cancelMotivo: null,
    cancelReason: null,
    errorsJson: null,
    xmlAttachmentId: null,
    pdfAttachmentId: null,
    sourceDocumentId: null,
    createdById: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

const REASSEMBLED_PAYLOAD = {
  versao: '1.01' as const,
  infDPS: {
    id: 'DPS' + '0'.repeat(42),
    tpAmb: 1 as const,
    dhEmi: new Date().toISOString(),
    verAplic: 'x',
    serie: 1,
    nDPS: 1,
    dCompet: '2026-09-01',
    tpEmit: 1 as const,
    cLocEmi: '3550308',
    prest: { CNPJ: '11222333000181', regTrib: { opSimpNac: 1 as const, regEspTrib: 0 } },
    toma: { CPF: '11144477735', xNome: 'Consumidor' },
    serv: { locPrest: { cLocPrestacao: '3550308' }, cServ: { cTribNac: '060101', xDescServ: 'x' } },
    valores: {
      vServPrest: { vServ: '100.00' },
      trib: { tribMun: { tribISSQN: 1 as const, tpRetISSQN: 1 as const }, totTrib: { pTotTrib: { pTotTribFed: '0.00', pTotTribEst: '0.00', pTotTribMun: '0.00' } } },
    },
  },
};

function makeService(opts: { docs?: Record<string, ReturnType<typeof baseDoc>> } = {}) {
  const docsById = opts.docs ?? { 'doc-1': baseDoc() };
  const repo = {
    findById: jest.fn(async (_scope: unknown, id: string) => (docsById[id] ? { ...docsById[id], attempts: [] } : null)),
    findByPartnerRef: jest.fn(async (ref: string) => Object.values(docsById).find((d) => d.partnerRef === ref) ?? null),
    listPending: jest.fn(async () => Object.values(docsById).filter((d) => d.status === 'SENT' || d.status === 'PROCESSING')),
    transition: jest.fn(async () => baseDoc()),
    appendAttempt: jest.fn(async () => ({ id: 'att-2', documentId: 'doc-1', attemptNo: 2, ref: 'doc-1:2', payloadJson: '{}', sentAt: new Date(), resultStatus: null, resultJson: null })),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };
  const emissionService = {
    getById: jest.fn(async (_scope: unknown, id: string) => ({ id, status: docsById[id]?.status ?? 'UNKNOWN', pendencias: [] })),
    reassembleGroupForReenvio: jest.fn(async () => ({
      vServCents: 10000,
      payload: REASSEMBLED_PAYLOAD,
      cnpjEmitente: '11222333000181',
      partnerAccountRef: null,
    })),
  };
  const documentAttachmentService = { upload: jest.fn(async () => ({ id: 'att-1' })) };
  const postingService = {
    attachSourceDocument: jest.fn(async () => ({ id: 'srcdoc-1' })),
    retireSourceDocument: jest.fn(async () => undefined),
  };
  const policy = {
    canEmitFiscalDocument: () => true,
    canCancelFiscalDocument: () => true,
    canReadFiscalDocument: () => true,
  };
  const auditService = { append: jest.fn() };

  const service = new FiscalDocumentLifecycleService(
    repo as never,
    emissionService as never,
    documentAttachmentService as never,
    postingService as never,
    policy as never,
    auditService as never,
  );
  return { service, repo, emissionService, documentAttachmentService, postingService, policy, auditService, docsById };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSelection.enabled = true;
  mockSelection.ambiente = 'homologacao';
  mockSelection.reason = undefined;
  mockPort.name = 'null';
  mockPort.capabilities = { numbersDps: false, consultar: true, cancelar: true, webhook: false };
});

describe('isValidResultTransition — item 24, tabela pura (mutation target)', () => {
  it('SENT/PROCESSING aceitam AUTHORIZED, REJECTED, PROCESSING', () => {
    for (const from of ['SENT', 'PROCESSING'] as const) {
      expect(isValidResultTransition(from, 'AUTHORIZED')).toBe(true);
      expect(isValidResultTransition(from, 'REJECTED')).toBe(true);
      expect(isValidResultTransition(from, 'PROCESSING')).toBe(true);
    }
  });

  it('MUTATION TARGET: SENT -> CANCELLED nunca é uma transição válida via resultado da porta', () => {
    expect(isValidResultTransition('SENT', 'CANCELLED')).toBe(false);
  });

  it('estados terminais (AUTHORIZED/REJECTED/CANCELLED) não aceitam nenhuma transição de resultado', () => {
    for (const from of ['AUTHORIZED', 'REJECTED', 'CANCELLED'] as const) {
      for (const to of ['SENT', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED'] as const) {
        expect(isValidResultTransition(from, to)).toBe(false);
      }
    }
  });
});

describe('FiscalDocumentLifecycleService — consultarUm (itens 24-25)', () => {
  it('documento terminal: NÃO toca a porta, devolve a view atual', async () => {
    const { service, emissionService } = makeService({ docs: { 'doc-1': baseDoc({ status: 'AUTHORIZED' }) } });
    await service.consultarUm(SCOPE, 'doc-1');
    expect(mockPort.consultar).not.toHaveBeenCalled();
    expect(emissionService.getById).toHaveBeenCalledWith(SCOPE, 'doc-1');
  });

  it('AUTHORIZED em producao: cria attachment XML+PDF, anexa proveniência (0 lançamentos), grava dfe.authorized', async () => {
    const { service, repo, documentAttachmentService, postingService, auditService } = makeService({
      docs: { 'doc-1': baseDoc({ ambiente: 'producao' }) },
    });
    const result: EmissaoResult = {
      status: 'AUTHORIZED',
      partnerRef: 'ref-1',
      numero: '123',
      nNFSe: 'NF123',
      chaveOuCodigo: 'CHAVE-XYZ',
      xml: Buffer.from('<xml/>'),
      pdf: Buffer.from('%PDF'),
      errors: [],
    };
    mockPort.consultar.mockResolvedValueOnce(result);

    await service.consultarUm(SCOPE, 'doc-1');

    expect(documentAttachmentService.upload).toHaveBeenCalledTimes(2); // xml + pdf
    expect(postingService.attachSourceDocument).toHaveBeenCalledWith(
      SCOPE,
      'entry-1',
      expect.objectContaining({ externalRef: 'CHAVE-XYZ', sourceType: 'dfe.nfse' }),
    );
    expect(repo.transition).toHaveBeenCalledWith(
      SCOPE,
      'doc-1',
      expect.objectContaining({ status: 'AUTHORIZED', chaveOuCodigo: 'CHAVE-XYZ', sourceDocumentId: 'srcdoc-1' }),
      expect.anything(),
    );
    expect(auditService.append).toHaveBeenCalledWith(
      expect.anything(),
      SCOPE,
      expect.objectContaining({ eventType: 'dfe.authorized' }),
    );
  });

  it('AUTHORIZED em homologacao: NÃO anexa attachment nem proveniência (ADR §9.2 item 5)', async () => {
    const { service, repo, documentAttachmentService, postingService } = makeService({
      docs: { 'doc-1': baseDoc({ ambiente: 'homologacao' }) },
    });
    mockPort.consultar.mockResolvedValueOnce({ status: 'AUTHORIZED', partnerRef: 'ref-1', numero: '123', chaveOuCodigo: 'CHAVE-XYZ', errors: [] } as EmissaoResult);
    await service.consultarUm(SCOPE, 'doc-1');
    expect(documentAttachmentService.upload).not.toHaveBeenCalled();
    expect(postingService.attachSourceDocument).not.toHaveBeenCalled();
    expect(repo.transition).toHaveBeenCalledWith(SCOPE, 'doc-1', expect.objectContaining({ status: 'AUTHORIZED', sourceDocumentId: null }), expect.anything());
  });

  it('AUTHORIZED sem chaveOuCodigo no retorno -> lança (ADR D3 iv), nunca transiciona', async () => {
    const { service, repo } = makeService();
    mockPort.consultar.mockResolvedValueOnce({ status: 'AUTHORIZED', partnerRef: 'ref-1', numero: '123', errors: [] } as EmissaoResult);
    await expect(service.consultarUm(SCOPE, 'doc-1')).rejects.toThrow(/dfe_authorized_incompleto/);
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it('REJECTED: grava errorsJson e audita dfe.rejected com errorCodes', async () => {
    const { service, repo, auditService } = makeService();
    const result: EmissaoResult = { status: 'REJECTED', partnerRef: 'ref-1', errors: [{ code: 'E123', message: 'CNPJ inválido' }] };
    mockPort.consultar.mockResolvedValueOnce(result);
    await service.consultarUm(SCOPE, 'doc-1');
    expect(repo.transition).toHaveBeenCalledWith(SCOPE, 'doc-1', expect.objectContaining({ status: 'REJECTED', errorsJson: JSON.stringify(result.errors) }), expect.anything());
    expect(auditService.append).toHaveBeenCalledWith(expect.anything(), SCOPE, expect.objectContaining({ eventType: 'dfe.rejected', payload: expect.objectContaining({ errorCodes: JSON.stringify(['E123']) }) }));
  });

  it('porta desabilitada -> 400 nomeado, porta nunca chamada', async () => {
    mockSelection.enabled = false;
    mockSelection.reason = 'DFE_PARTNER não configurado';
    const { service, repo } = makeService();
    await expect(service.consultarUm(SCOPE, 'doc-1')).rejects.toThrow(/dfe_disabled/);
    expect(repo.transition).not.toHaveBeenCalled();
  });
});

describe('FiscalDocumentLifecycleService — reenviar (item 26)', () => {
  it('só de REJECTED — outro status bloqueia sem tocar a porta', async () => {
    const { service, repo } = makeService({ docs: { 'doc-1': baseDoc({ status: 'SENT' }) } });
    await expect(service.reenviar(SCOPE, 'doc-1')).rejects.toThrow(/reenvio_bloqueado/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
    expect(mockPort.emitir).not.toHaveBeenCalled();
  });

  it('de REJECTED: cria tentativa n+1 com a numeração ORIGINAL, volta pra SENT, chama a porta de novo', async () => {
    const { service, repo } = makeService({ docs: { 'doc-1': baseDoc({ status: 'REJECTED', currentAttemptNo: 1, numero: 42n }) } });
    mockPort.emitir.mockResolvedValueOnce({ status: 'PROCESSING', partnerRef: 'doc-1:2', errors: [] });

    await service.reenviar(SCOPE, 'doc-1');

    expect(repo.appendAttempt).toHaveBeenCalledWith(SCOPE, expect.objectContaining({ documentId: 'doc-1', attemptNo: 2 }), expect.anything());
    expect(repo.transition).toHaveBeenCalledWith(SCOPE, 'doc-1', expect.objectContaining({ status: 'SENT', currentAttemptNo: 2, errorsJson: null }), expect.anything());
    const appendAttemptCalls = repo.appendAttempt.mock.calls as unknown as Array<[unknown, { payloadJson: string }]>;
    const sentPayload = JSON.parse(appendAttemptCalls[0][1].payloadJson);
    expect(sentPayload.infDPS.nDPS).toBe(42); // numeração original, não reconsumida
    expect(mockPort.emitir).toHaveBeenCalledWith(expect.objectContaining({ ref: 'doc-1:2' }));
  });

  it('falha de rede no reenvio: grava errorsJson, mantém SENT, sem tentativa n+2 automática', async () => {
    const { service, repo } = makeService({ docs: { 'doc-1': baseDoc({ status: 'REJECTED', currentAttemptNo: 1, numero: 42n }) } });
    mockPort.emitir.mockRejectedValueOnce(new Error('timeout de rede'));
    await service.reenviar(SCOPE, 'doc-1');
    expect(repo.appendAttempt).toHaveBeenCalledTimes(1); // só a tentativa 2 — nenhuma 3ª automática
    const transitionCalls = repo.transition.mock.calls as unknown as Array<[unknown, unknown, Record<string, unknown>]>;
    const lastTransitionCall = transitionCalls[transitionCalls.length - 1];
    expect(lastTransitionCall[2]).toEqual(expect.objectContaining({ status: 'SENT', errorsJson: expect.stringContaining('dfe_reenvio_failed') }));
  });
});

describe('FiscalDocumentLifecycleService — cancelar (item 29)', () => {
  it('só de AUTHORIZED — outro status bloqueia sem tocar a porta', async () => {
    const { service, repo } = makeService({ docs: { 'doc-1': baseDoc({ status: 'SENT' }) } });
    await expect(service.cancelar(SCOPE, 'doc-1', { cMotivo: 1, xMotivo: 'x'.repeat(20) })).rejects.toThrow(/cancelamento_bloqueado/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
    expect(mockPort.cancelar).not.toHaveBeenCalled();
  });

  it('CANCELLED: transiciona, audita dfe.cancelled, retira a proveniência — nunca toca venda/razão', async () => {
    const { service, repo, postingService, auditService } = makeService({
      docs: { 'doc-1': baseDoc({ status: 'AUTHORIZED', sourceDocumentId: 'srcdoc-1' }) },
    });
    mockPort.cancelar.mockResolvedValueOnce({ status: 'CANCELLED', errors: [] } as CancelResult);
    await service.cancelar(SCOPE, 'doc-1', { cMotivo: 2, xMotivo: 'serviço não prestado xxxx' });
    expect(repo.transition).toHaveBeenCalledWith(SCOPE, 'doc-1', expect.objectContaining({ status: 'CANCELLED', cancelMotivo: 2, saleKey: 'cancelled:doc-1:sale-1' }), expect.anything());
    expect(auditService.append).toHaveBeenCalledWith(expect.anything(), SCOPE, expect.objectContaining({ eventType: 'dfe.cancelled', payload: { documentId: 'doc-1', cMotivo: '2' } }));
    expect(postingService.retireSourceDocument).toHaveBeenCalledWith(SCOPE, 'srcdoc-1', expect.stringContaining('dfe_cancelled'));
  });

  it('OUT_OF_WINDOW -> 409 (E0822), documento NÃO transiciona', async () => {
    const { service, repo } = makeService({ docs: { 'doc-1': baseDoc({ status: 'AUTHORIZED' }) } });
    mockPort.cancelar.mockResolvedValueOnce({ status: 'OUT_OF_WINDOW', errors: [] } as CancelResult);
    await expect(service.cancelar(SCOPE, 'doc-1', { cMotivo: 1, xMotivo: 'x'.repeat(20) })).rejects.toThrow(ConflictError);
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it('REJECTED pelo parceiro -> 409, documento NÃO transiciona', async () => {
    const { service, repo } = makeService({ docs: { 'doc-1': baseDoc({ status: 'AUTHORIZED' }) } });
    mockPort.cancelar.mockResolvedValueOnce({ status: 'REJECTED', errors: [{ code: 'X', message: 'negado' }] } as CancelResult);
    await expect(service.cancelar(SCOPE, 'doc-1', { cMotivo: 1, xMotivo: 'x'.repeat(20) })).rejects.toThrow(ConflictError);
    expect(repo.transition).not.toHaveBeenCalled();
  });
});

describe('FiscalDocumentLifecycleService — pollPendingOnce (item 27, skip+log vs alerta)', () => {
  it('erro de código próprio dfe_* -> skip+log (não conta como failed)', async () => {
    const { service } = makeService({ docs: { 'doc-1': baseDoc({ status: 'SENT' }) } });
    mockPort.consultar.mockRejectedValueOnce(new ValidationError('dfe_algum_erro_de_dominio'));
    const summary = await service.pollPendingOnce(new Date());
    expect(summary.skipped).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it('erro genérico (não dfe_*) -> conta como failed (alerta)', async () => {
    const { service } = makeService({ docs: { 'doc-1': baseDoc({ status: 'SENT' }) } });
    mockPort.consultar.mockRejectedValueOnce(new Error('erro de infraestrutura, não é dfe_*'));
    const summary = await service.pollPendingOnce(new Date());
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(0);
  });

  it('sucesso: aplica o resultado e conta como updated', async () => {
    const { service, repo } = makeService({ docs: { 'doc-1': baseDoc({ status: 'SENT' }) } });
    mockPort.consultar.mockResolvedValueOnce({ status: 'PROCESSING', partnerRef: 'doc-1:1', errors: [] } as EmissaoResult);
    const summary = await service.pollPendingOnce(new Date());
    expect(summary.updated).toBe(1);
    expect(repo.transition).toHaveBeenCalledWith(SCOPE, 'doc-1', expect.objectContaining({ status: 'PROCESSING' }));
  });

  it('porta desabilitada globalmente -> skip em lote, nenhum documento tocado', async () => {
    mockSelection.enabled = false;
    const { service } = makeService({ docs: { 'doc-1': baseDoc({ status: 'SENT' }) } });
    const summary = await service.pollPendingOnce(new Date());
    expect(summary.skipped).toBe(1);
    expect(mockPort.consultar).not.toHaveBeenCalled();
  });
});

describe('FiscalDocumentLifecycleService — webhookReceived (item 28)', () => {
  it('adaptador sem capabilities.webhook -> 401 sempre, 0 escrita (Null/File deste BRIEF)', async () => {
    mockPort.capabilities = { numbersDps: false, consultar: true, cancelar: true, webhook: false };
    const { service, repo } = makeService();
    const result = await service.webhookReceived('null', {}, Buffer.from('{}'));
    expect(result.status).toBe(401);
    expect(repo.transition).not.toHaveBeenCalled();
    expect(repo.runTransaction).not.toHaveBeenCalled();
    expect(mockPort.verifyWebhook).not.toHaveBeenCalled(); // nem chega a verificar — capability já reprova
  });

  it("':partner' diferente do parceiro habilitado -> 401", async () => {
    const { service } = makeService();
    const result = await service.webhookReceived('outro-parceiro', {}, Buffer.from('{}'));
    expect(result.status).toBe(401);
  });

  it('assinatura inválida (mesmo com capability) -> 401, 0 escrita', async () => {
    mockPort.capabilities = { numbersDps: false, consultar: true, cancelar: true, webhook: true };
    mockPort.verifyWebhook.mockReturnValueOnce({ ok: false });
    const { service, repo } = makeService();
    const result = await service.webhookReceived('null', {}, Buffer.from('{}'));
    expect(result.status).toBe(401);
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it('assinatura válida: acorda a re-consulta do partnerRef, nunca transiciona pelo corpo diretamente', async () => {
    mockPort.capabilities = { numbersDps: false, consultar: true, cancelar: true, webhook: true };
    mockPort.verifyWebhook.mockReturnValueOnce({ ok: true, partnerRef: 'doc-1:1' });
    mockPort.consultar.mockResolvedValueOnce({ status: 'PROCESSING', partnerRef: 'doc-1:1', errors: [] } as EmissaoResult);
    const { service, repo } = makeService({ docs: { 'doc-1': baseDoc({ status: 'SENT', partnerRef: 'doc-1:1' }) } });
    const result = await service.webhookReceived('null', {}, Buffer.from('{}'));
    expect(result.status).toBe(200);
    expect(mockPort.consultar).toHaveBeenCalledWith('doc-1:1');
    expect(repo.transition).toHaveBeenCalledWith(SCOPE, 'doc-1', expect.objectContaining({ status: 'PROCESSING' }));
  });
});
