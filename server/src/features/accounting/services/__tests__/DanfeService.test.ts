/**
 * NFE-DANFE-IBSCBS PR-3, itens 17 e 18 (`docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md`). Repositórios falsos só com
 * `findById` (qualquer escrita quebraria: o serviço não grava nada, F-DANFE-5 a); o XML lido é o fixture SINTÉTICO de
 * leiaute completo do PR-1, servido pelo `resolveReadPath` trocado; o puppeteer é trocado (o render tem teste próprio).
 */
import { join } from 'path';
import { DanfeService } from '../DanfeService';
import { AppError, ForbiddenError, NotFoundError } from '../../../../lib/errors';
import { htmlToPdf } from '../../../../lib/pdf';
import { readDanfeModel } from '../../../../lib/danfe/danfeModel';
import { DANFE_PDF_MARGIN, renderDanfeHtml } from '../../../../lib/danfe/danfeHtml';
import { readFileSync } from 'fs';
import { LEGAIS_SEMENTE } from '@test/helpers/legalParams';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { IAccountingPolicy } from '../../policies/IAccountingPolicy';
import type { FiscalDocumentWithAttempts, IFiscalDocumentRepository } from '../../repositories/IFiscalDocumentRepository';
import type { IDocumentAttachmentRepository } from '../../repositories/IDocumentAttachmentRepository';

const FIXTURE = join(__dirname, '..', '..', '..', '..', 'lib', '__tests__', 'fixtures', 'nfe', 'purchase-full-layout.SYNTHETIC.xml');

jest.mock('../../../../lib/pdf', () => ({ htmlToPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')) }));
jest.mock('../../../../lib/attachmentStorage', () => ({ resolveReadPath: jest.fn(() => FIXTURE) }));
const mockedHtmlToPdf = htmlToPdf as jest.Mock;

const scope: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

const ESPERADO = readDanfeModel(readFileSync(FIXTURE), LEGAIS_SEMENTE);

function makeDoc(over: Record<string, unknown> = {}): FiscalDocumentWithAttempts {
  return {
    id: 'fd-1',
    userId: 'u1',
    unitId: 'unit-1',
    kind: 'NFE',
    status: 'AUTHORIZED',
    chaveOuCodigo: ESPERADO.chave,
    vServCents: 12345n,
    xmlAttachmentId: 'att-xml',
    attempts: [],
    ...over,
  } as unknown as FiscalDocumentWithAttempts;
}

function build(opts: { canRead?: boolean; doc?: FiscalDocumentWithAttempts | null; attachment?: boolean } = {}) {
  const docs = { findById: jest.fn().mockResolvedValue(opts.doc === undefined ? makeDoc() : opts.doc) };
  const atts = {
    findById: jest.fn().mockResolvedValue(opts.attachment === false ? null : { id: 'att-xml', storageKey: 'u1/FISCAL_DOCUMENT/fd-1/x_fd-1.xml' }),
  };
  const policy = { canReadFiscalDocument: jest.fn().mockReturnValue(opts.canRead ?? true) };
  const legalParams = { fotografia: jest.fn().mockResolvedValue(LEGAIS_SEMENTE) };
  const service = new DanfeService(
    docs as unknown as IFiscalDocumentRepository,
    atts as unknown as IDocumentAttachmentRepository,
    policy as unknown as IAccountingPolicy,
    legalParams,
  );
  return { service, docs, atts, legalParams };
}

async function codigo(p: Promise<unknown>): Promise<{ status: number; code: string }> {
  try {
    await p;
  } catch (e) {
    const err = e as AppError;
    return { status: err.statusCode, code: err.errorCode };
  }
  throw new Error('esperava erro');
}

beforeEach(() => mockedHtmlToPdf.mockClear());

describe('DanfeService.gerar — item 17', () => {
  it.each(['AUTHORIZED', 'AUTHORIZED_DIVERGENT'])('%s ⇒ PDF do XML anexado, danfe-<chave>.pdf, margem do DANFE', async (status) => {
    const { service, docs, atts, legalParams } = build({ doc: makeDoc({ status }) });
    const out = await service.gerar(scope, 'fd-1');
    expect(out).toEqual({ buffer: Buffer.from('%PDF-1.4 fake'), fileName: `danfe-${ESPERADO.chave}.pdf`, mimeType: 'application/pdf' });
    expect(docs.findById).toHaveBeenCalledWith(scope, 'fd-1');
    expect(atts.findById).toHaveBeenCalledWith(scope, 'att-xml');
    expect(legalParams.fotografia).toHaveBeenCalledWith(['NFE_CSTAT_AUTORIZADA']);
    expect(mockedHtmlToPdf).toHaveBeenCalledWith(renderDanfeHtml(ESPERADO), { margin: DANFE_PDF_MARGIN });
  });

  it('sem permissão de leitura fiscal ⇒ ForbiddenError, sem ler o documento', async () => {
    const { service, docs } = build({ canRead: false });
    await expect(service.gerar(scope, 'fd-1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(docs.findById).not.toHaveBeenCalled();
  });

  it('id de outro tenant (o repositório com escopo não acha) ⇒ NotFoundError', async () => {
    const { service } = build({ doc: null });
    await expect(service.gerar(scope, 'fd-alheio')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('kind NFSE ⇒ 422 DANFE_SO_NFE; kind NFCE ⇒ 422 DANFE_NFCE_NO_FE (F-NFCE-E1-6 b)', async () => {
    expect(await codigo(build({ doc: makeDoc({ kind: 'NFSE' }) }).service.gerar(scope, 'fd-1'))).toEqual({ status: 422, code: 'DANFE_SO_NFE' });
    expect(await codigo(build({ doc: makeDoc({ kind: 'NFCE' }) }).service.gerar(scope, 'fd-1'))).toEqual({ status: 422, code: 'DANFE_NFCE_NO_FE' });
    expect(mockedHtmlToPdf).not.toHaveBeenCalled();
  });

  it.each(['REJECTED', 'SENT', 'PROCESSING', 'CANCELLED'])('status %s ⇒ 409 DANFE_DOCUMENTO_NAO_AUTORIZADO (I10)', async (status) => {
    const { service, atts } = build({ doc: makeDoc({ status }) });
    expect(await codigo(service.gerar(scope, 'fd-1'))).toEqual({ status: 409, code: 'DANFE_DOCUMENTO_NAO_AUTORIZADO' });
    expect(atts.findById).not.toHaveBeenCalled();
  });

  it('sem xmlAttachmentId ⇒ 409 DANFE_SEM_XML; anexo apagado ⇒ o mesmo 409', async () => {
    expect(await codigo(build({ doc: makeDoc({ xmlAttachmentId: null }) }).service.gerar(scope, 'fd-1'))).toEqual({ status: 409, code: 'DANFE_SEM_XML' });
    expect(await codigo(build({ attachment: false }).service.gerar(scope, 'fd-1'))).toEqual({ status: 409, code: 'DANFE_SEM_XML' });
    expect(mockedHtmlToPdf).not.toHaveBeenCalled();
  });
});

describe('DanfeService.gerar — item 18 (I1: o DANFE sai só do XML)', () => {
  it('vServCents, chave e número alterados no FiscalDocument ⇒ HTML idêntico', async () => {
    await build().service.gerar(scope, 'fd-1');
    const adulterado = makeDoc({ vServCents: 99999999n, chaveOuCodigo: '0'.repeat(44), numero: 777n, vIbsCents: 1n, vCbsCents: 2n });
    await build({ doc: adulterado }).service.gerar(scope, 'fd-1');
    const [[htmlA], [htmlB]] = mockedHtmlToPdf.mock.calls as [string, unknown][];
    expect(htmlB).toBe(htmlA);
    expect(htmlA).not.toContain('999.999,99');
  });
});
