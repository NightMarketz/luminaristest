// Verificação end-to-end SEM mockar selectDfeEmissor — usa o NullEmissor de verdade (não uma
// forma inventada por mim). Prova o achado real da revisão independente do PR #350: sem o
// fallback pra doc.numero em applyResult(), NENHUM documento chegava a AUTHORIZED por este
// adaptador, porque NullEmissor.consultar() nunca ecoa numero/nNFSe.
import { FiscalDocumentLifecycleService } from '../FiscalDocumentLifecycleService';
import type { AccountingScope } from '../../scope/AccountingScope';

const SCOPE: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

describe('FiscalDocumentLifecycleService + NullEmissor real (sem mock de selectDfeEmissor)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('um documento SENT com numero já atribuído localmente chega a AUTHORIZED via consultarUm', async () => {
    const doc = {
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
      numero: 7n, // atribuído localmente no ciclo SENT (numbersDps=false) — NullEmissor não o ecoa de volta
      currentAttemptNo: 1,
      dCompet: '2026-09-01',
      vServCents: 10000n,
    };
    const repo = {
      findById: jest.fn(async () => ({ ...doc, attempts: [] })),
      transition: jest.fn(async () => doc),
      runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
    };
    const emissionService = { getById: jest.fn(async () => ({ id: 'doc-1', status: 'AUTHORIZED', pendencias: [] })) };
    const documentAttachmentService = { upload: jest.fn() };
    const postingService = { attachSourceDocument: jest.fn(), retireSourceDocument: jest.fn() };
    const policy = { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true, canReadFiscalDocument: () => true };
    const auditService = { append: jest.fn() };

    const service = new FiscalDocumentLifecycleService(
      repo as never,
      emissionService as never,
      documentAttachmentService as never,
      postingService as never,
      policy as never,
      auditService as never,
    );

    await service.consultarUm(SCOPE, 'doc-1');

    // NullEmissor (real) NUNCA devolve numero/nNFSe em consultar() — se applyResult() ainda
    // exigisse isso sem o fallback pra doc.numero, este teste falharia com dfe_authorized_incompleto.
    expect(repo.transition).toHaveBeenCalledWith(
      SCOPE,
      'doc-1',
      expect.objectContaining({ status: 'AUTHORIZED', chaveOuCodigo: expect.stringMatching(/^NULL/) }),
      expect.anything(),
    );
  });
});
