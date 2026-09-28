/**
 * BE-INCR-DFE-MANUAL — PR-3: retorno manual (item 11), rejeição manual (12), cancelamento manual (13) e o status
 * AUTHORIZED_DIVERGENT (F-MAN-2 c / F-MAN-2b b). Usa o leitor, o verificador de assinatura e a releitura REAIS (sem
 * mock): a NFS-e fictícia é assinada com a chave de teste. Só o repositório/anexos/proveniência são dublês.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { FiscalDocumentLifecycleService, isValidResultTransition } from '../FiscalDocumentLifecycleService';
import type { AccountingScope } from '../../scope/AccountingScope';
import { signNfseForTest } from '@test/helpers/nfeSignature';

const SCOPE: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

const RAW = readFileSync(join(__dirname, '../../../../lib/__tests__/fixtures/nfse/nfse-autorizada-web.SYNTHETIC.xml'), 'utf8');
const XML_OK = Buffer.from(signNfseForTest(RAW));
const CHAVE = '35503082211222333000181000000000004226091234567890';

/** A DPS que o Luminaris gravou na tentativa 1 (modo manual: sem id/serie/nDPS) — igual à da fixture. */
function dpsEnviada(over: { vServ?: string; prestCnpj?: string } = {}) {
  return {
    versao: '1.01',
    infDPS: {
      tpAmb: 1,
      dhEmi: '2026-09-15T17:30:00.000Z',
      verAplic: 'luminaris-1.0',
      dCompet: '2026-09-15',
      tpEmit: 1,
      cLocEmi: '3550308',
      prest: { CNPJ: over.prestCnpj ?? '11222333000181', regTrib: { opSimpNac: 1, regEspTrib: 0 } },
      toma: { CPF: '12345678909', xNome: 'CLIENTE FICTICIA' },
      serv: { locPrest: { cLocPrestacao: '3550308' }, cServ: { cTribNac: '060101', xDescServ: 'Corte e escova', cNBS: '126021000' } },
      valores: {
        vServPrest: { vServ: over.vServ ?? '150.00' },
        vDescCondIncond: { vDescIncond: '15.00' },
        trib: {
          tribMun: { tribISSQN: 1, tpRetISSQN: 1 },
          totTrib: { pTotTrib: { pTotTribFed: '4.00', pTotTribEst: '0.00', pTotTribMun: '5.00' } },
        },
      },
    },
  };
}

function manualDoc(over: Record<string, unknown> = {}, payload = dpsEnviada()) {
  return {
    id: 'doc-m',
    userId: 'u1',
    unitId: 'unit-1',
    kind: 'NFSE',
    status: 'SENT',
    saleId: 'sale-1',
    saleKey: 'sale-1',
    cTribNac: '060101',
    anchorEntryId: 'entry-1',
    ambiente: 'producao',
    partner: 'manual',
    partnerRef: 'doc-m:1',
    serie: 1,
    numero: null,
    nNFSe: null,
    chaveOuCodigo: null,
    dCompet: '2026-09-15',
    vServCents: 13500n,
    currentAttemptNo: 1,
    sourceDocumentId: null,
    createdAt: new Date('2026-09-15T17:00:00Z'), // antes do dhProc da fixture (14:32 -03:00 = 17:32Z)
    attempts: [{ attemptNo: 1, ref: 'doc-m:1', payloadJson: JSON.stringify(payload), sentAt: new Date(), resultStatus: null, resultJson: null }],
    ...over,
  };
}

function makeService(doc: ReturnType<typeof manualDoc>, opts: { outroComChave?: { id: string } | null } = {}) {
  const repo = {
    findById: jest.fn(async () => doc),
    findByChaveOuCodigo: jest.fn(async () => opts.outroComChave ?? null),
    transition: jest.fn(async () => doc),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };
  const emissionService = { getById: jest.fn(async () => ({ id: doc.id, status: 'x', pendencias: [] })) };
  const documentAttachmentService = { upload: jest.fn(async (_s: unknown, a: { fileName: string }) => ({ id: `att-${a.fileName}` })) };
  const postingService = { attachSourceDocument: jest.fn(async () => ({ id: 'src-1' })), retireSourceDocument: jest.fn(async () => undefined) };
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
  return { service, repo, documentAttachmentService, postingService, auditService };
}

const transitionData = (repo: { transition: jest.Mock }) => repo.transition.mock.calls[0][2] as Record<string, unknown>;

describe('retornoManual — item 11', () => {
  it('XML igual à DPS enviada → AUTHORIZED, série/número/chave do XML, guarda de status na escrita, releitura IGUAL auditada', async () => {
    const { service, repo, documentAttachmentService, postingService, auditService } = makeService(manualDoc());
    const view = await service.retornoManual(SCOPE, 'doc-m', XML_OK);
    expect(view.releitura).toEqual({ status: 'IGUAL', divergencias: [] });
    const t = transitionData(repo);
    expect(t).toMatchObject({ status: 'AUTHORIZED', serie: 70001, numero: 15n, nNFSe: '42', chaveOuCodigo: CHAVE, whenStatusIn: ['SENT', 'PROCESSING'] });
    expect(JSON.parse((t.attemptResult as { resultJson: string }).resultJson).releitura.status).toBe('IGUAL');
    expect(documentAttachmentService.upload).toHaveBeenCalledTimes(1); // só o XML (sem PDF)
    expect(postingService.attachSourceDocument).toHaveBeenCalledTimes(1);
    expect(auditService.append).toHaveBeenCalledWith(
      expect.anything(),
      SCOPE,
      expect.objectContaining({
        eventType: 'dfe.manual_result',
        payload: { documentId: 'doc-m', attemptNo: '1', releitura: 'IGUAL', nDivergencias: '0' },
      }),
    );
  });

  it('com PDF: anexa XML e DANFSe', async () => {
    const { service, documentAttachmentService } = makeService(manualDoc());
    await service.retornoManual(SCOPE, 'doc-m', XML_OK, Buffer.from('%PDF-1.4 fake'));
    expect(documentAttachmentService.upload).toHaveBeenCalledTimes(2);
  });

  it('divergência de CONTEÚDO (valor digitado errado no portal) → AUTHORIZED_DIVERGENT, a nota existe e é registrada (F-MAN-2 c)', async () => {
    const { service, repo, postingService } = makeService(manualDoc({}, dpsEnviada({ vServ: '160.00' })));
    const view = await service.retornoManual(SCOPE, 'doc-m', XML_OK);
    expect(view.releitura.status).toBe('DIVERGENTE');
    expect(view.releitura.divergencias).toEqual([{ campo: 'vServ', grupo: 'conteudo', tipo: 'diferente', enviado: '16000', autorizado: '15000' }]);
    expect(transitionData(repo).status).toBe('AUTHORIZED_DIVERGENT');
    expect(postingService.attachSourceDocument).toHaveBeenCalledTimes(1); // o razão aponta para a nota que o fisco vê
  });

  const semEscrita = (s: ReturnType<typeof makeService>) => {
    expect(s.repo.transition).not.toHaveBeenCalled();
    expect(s.documentAttachmentService.upload).not.toHaveBeenCalled();
    expect(s.postingService.attachSourceDocument).not.toHaveBeenCalled();
  };

  it('identidade (i): prestador do XML ≠ prestador da DPS enviada → 422, nada escrito', async () => {
    const s = makeService(manualDoc({}, dpsEnviada({ prestCnpj: '11444777000161' })));
    await expect(s.service.retornoManual(SCOPE, 'doc-m', XML_OK)).rejects.toMatchObject({ statusCode: 422, errorCode: 'DFE_IDENTIDADE_DIVERGENTE' });
    semEscrita(s);
  });

  it('identidade (ii): a chave já está em OUTRO documento → 422 antes de qualquer anexo', async () => {
    const s = makeService(manualDoc(), { outroComChave: { id: 'doc-outro' } });
    await expect(s.service.retornoManual(SCOPE, 'doc-m', XML_OK)).rejects.toMatchObject({ statusCode: 422, errorCode: 'DFE_IDENTIDADE_DIVERGENTE' });
    semEscrita(s);
  });

  it('identidade (iii): nota processada ANTES de o documento existir → 422', async () => {
    const s = makeService(manualDoc({ createdAt: new Date('2026-09-16T00:00:00Z') }));
    await expect(s.service.retornoManual(SCOPE, 'doc-m', XML_OK)).rejects.toThrow(/antes de o documento existir/);
    semEscrita(s);
  });

  it('identidade (iii): dhProc que não é data-hora real (mês 13) → 422, nada escrito (GAP-MAP #405 dhProc)', async () => {
    const xmlMes13 = Buffer.from(signNfseForTest(RAW.replace('<dhProc>2026-09-15T14:32:10-03:00</dhProc>', '<dhProc>2026-13-01T14:32:10-03:00</dhProc>')));
    const s = makeService(manualDoc());
    await expect(s.service.retornoManual(SCOPE, 'doc-m', xmlMes13)).rejects.toMatchObject({ statusCode: 422, message: expect.stringMatching(/dhProc/) });
    semEscrita(s);
  });

  it('identidade (iv): nota emitida por API de terceiro (procEmi=1) não é da ficha → 422', async () => {
    const xmlApi = Buffer.from(signNfseForTest(RAW.replace('<procEmi>2</procEmi>', '<procEmi>1</procEmi>')));
    const s = makeService(manualDoc());
    await expect(s.service.retornoManual(SCOPE, 'doc-m', xmlApi)).rejects.toThrow(/não é nota emitida no portal/);
    semEscrita(s);
  });

  it('identidade (v): nota de produção restrita (infDPS/tpAmb=2) num documento de produção → 422, nada escrito (GAP-MAP #405 tpAmb)', async () => {
    const xmlRestrita = Buffer.from(signNfseForTest(RAW.replace('<tpAmb>1</tpAmb>', '<tpAmb>2</tpAmb>')));
    const s = makeService(manualDoc({ ambiente: 'producao' }));
    await expect(s.service.retornoManual(SCOPE, 'doc-m', xmlRestrita)).rejects.toMatchObject({
      statusCode: 422,
      errorCode: 'DFE_IDENTIDADE_DIVERGENTE',
      message: expect.stringMatching(/ambiente/),
    });
    semEscrita(s);
  });

  it('XML sem assinatura → 422 NFSE_INVALIDA (F-MAN-1 a)', async () => {
    const s = makeService(manualDoc());
    await expect(s.service.retornoManual(SCOPE, 'doc-m', Buffer.from(RAW))).rejects.toMatchObject({ statusCode: 422, errorCode: 'NFSE_INVALIDA' });
    semEscrita(s);
  });

  it('documento que não é do modo manual → 409; documento já autorizado → 409', async () => {
    await expect(makeService(manualDoc({ partner: 'null' })).service.retornoManual(SCOPE, 'doc-m', XML_OK)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'DFE_NAO_MANUAL',
    });
    await expect(makeService(manualDoc({ status: 'AUTHORIZED' })).service.retornoManual(SCOPE, 'doc-m', XML_OK)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'DFE_STATUS_INVALIDO',
    });
  });

  it('corrida: outro pedido mudou o status antes da escrita → 409 (nunca 500)', async () => {
    const s = makeService(manualDoc());
    s.repo.transition.mockRejectedValueOnce(new Error('fiscal_document_status_changed: doc-m'));
    await expect(s.service.retornoManual(SCOPE, 'doc-m', XML_OK)).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_STATUS_INVALIDO' });
  });
});

describe('rejeicaoManual — item 12', () => {
  it('grava REJECTED com os erros do portal, com a guarda de status na escrita', async () => {
    const { service, repo } = makeService(manualDoc());
    await service.rejeicaoManual(SCOPE, 'doc-m', [{ code: 'E0312', message: 'código de serviço não aceito pelo município' }]);
    expect(transitionData(repo)).toMatchObject({ status: 'REJECTED', whenStatusIn: ['SENT', 'PROCESSING'] });
  });
});

describe('cancelamentoManual — item 13 (F-MAN-5 a) e F-MAN-2b (b)', () => {
  const evento = (chNFSe: string, cMotivo: string) =>
    Buffer.from(
      '<?xml version="1.0" encoding="UTF-8"?><evento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">' +
        `<infEvento Id="EVT${'1'.repeat(59)}"><verAplic>SefinNac</verAplic><ambGer>2</ambGer><nSeqEvento>001</nSeqEvento>` +
        '<dhProc>2026-09-16T10:00:00-03:00</dhProc><nDFSe>88</nDFSe><pedRegEvento versao="1.01">' +
        `<infPedReg Id="PRE${'2'.repeat(56)}"><tpAmb>1</tpAmb><verAplic>EmissorWeb</verAplic>` +
        '<dhEvento>2026-09-16T09:59:00-03:00</dhEvento><CNPJAutor>11222333000181</CNPJAutor>' +
        `<chNFSe>${chNFSe}</chNFSe><e101101><xDesc>Cancelamento de NFS-e</xDesc><cMotivo>${cMotivo}</cMotivo>` +
        '<xMotivo>valor digitado errado no portal</xMotivo></e101101></infPedReg></pedRegEvento></infEvento></evento>',
    );
  const autorizado = (status = 'AUTHORIZED') => manualDoc({ status, chaveOuCodigo: CHAVE, sourceDocumentId: 'src-1' });

  it('evento da chave deste documento → CANCELLED com o texto do XML, proveniência aposentada', async () => {
    const { service, repo, postingService } = makeService(autorizado());
    await service.cancelamentoManual(SCOPE, 'doc-m', { cMotivo: 1, xMotivo: 'texto digitado na tela ignorado' }, evento(CHAVE, '1'));
    expect(transitionData(repo)).toMatchObject({
      status: 'CANCELLED',
      cancelMotivo: 1,
      cancelReason: 'valor digitado errado no portal',
      whenStatusIn: ['AUTHORIZED', 'AUTHORIZED_DIVERGENT'],
    });
    expect(postingService.retireSourceDocument).toHaveBeenCalledWith(SCOPE, 'src-1', 'dfe_cancelled:1');
  });

  it('F-MAN-2b (b): AUTHORIZED_DIVERGENT sai cancelando', async () => {
    const { service, repo } = makeService(autorizado('AUTHORIZED_DIVERGENT'));
    await service.cancelamentoManual(SCOPE, 'doc-m', { cMotivo: 1, xMotivo: 'valor digitado errado no portal' }, evento(CHAVE, '1'));
    expect(transitionData(repo).status).toBe('CANCELLED');
  });

  it('evento de OUTRA NFS-e → 422, nada escrito', async () => {
    const { service, repo } = makeService(autorizado());
    await expect(service.cancelamentoManual(SCOPE, 'doc-m', { cMotivo: 1, xMotivo: 'x'.repeat(20) }, evento('9'.repeat(50), '1'))).rejects.toMatchObject({
      statusCode: 422,
      errorCode: 'DFE_EVENTO_DIVERGENTE',
    });
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it('cMotivo do corpo ≠ cMotivo do evento → 422 (parâmetro aceito e ignorado é bug)', async () => {
    const { service, repo } = makeService(autorizado());
    await expect(service.cancelamentoManual(SCOPE, 'doc-m', { cMotivo: 2, xMotivo: 'x'.repeat(20) }, evento(CHAVE, '1'))).rejects.toMatchObject({
      statusCode: 422,
      errorCode: 'DFE_EVENTO_DIVERGENTE',
    });
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it('documento ainda SENT → 409', async () => {
    const { service } = makeService(manualDoc());
    await expect(service.cancelamentoManual(SCOPE, 'doc-m', { cMotivo: 1, xMotivo: 'x'.repeat(20) }, evento(CHAVE, '1'))).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('F-MAN-2 (c) + F-MAN-2b (b) — tabela de transições', () => {
  it('AUTHORIZED_DIVERGENT é terminal para resultado de porta (nenhuma volta para AUTHORIZED)', () => {
    for (const to of ['AUTHORIZED', 'REJECTED', 'PROCESSING', 'CANCELLED'] as const) {
      expect(isValidResultTransition('AUTHORIZED_DIVERGENT', to)).toBe(false);
    }
  });
});
