/**
 * FE-INCR-DFE PR-1 (item 10) — `toView` expõe `xmlAttachmentId`, `pdfAttachmentId` e `releitura` (tentativa CORRENTE).
 * `resultJson` nulo, inválido ou sem `releitura` ⇒ `null`.
 */
import { FiscalDocumentEmissionService } from '../FiscalDocumentEmissionService';

const SCOPE = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };

jest.mock('../../../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({ getDynamicTableRepository: () => ({ findTableByInternalName: async () => null }) }),
}));

const RELEITURA = { status: 'DIVERGENTE', divergencias: [{ campo: 'vServ', grupo: 'conteudo', tipo: 'diferente', enviado: '16000', autorizado: '15000' }] };

function attempt(attemptNo: number, resultJson: string | null) {
  return { attemptNo, ref: `d:${attemptNo}`, sentAt: new Date('2026-09-15T17:00:00Z'), resultStatus: null, resultJson };
}

async function view(over: Record<string, unknown>, attempts: ReturnType<typeof attempt>[]) {
  const doc = {
    id: 'd', kind: 'NFSE', status: 'AUTHORIZED_DIVERGENT', saleId: 's', cTribNac: '060101', anchorEntryId: 'e', ambiente: 'producao',
    partner: 'manual', partnerRef: 'd:1', serie: 1, numero: null, nNFSe: null, chaveOuCodigo: null, dCompet: '2026-09-15',
    vServCents: 15000n, tpRetISSQN: 1, vIssCents: null, vIbsCents: null, vCbsCents: null, currentAttemptNo: 1, authorizedAt: null,
    cancelledAt: null, errorsJson: null, sourceDocumentId: null, xmlAttachmentId: null, pdfAttachmentId: null, attempts, ...over,
  };
  const repo = { findById: async () => doc, listBySale: async () => [doc] };
  const svc = new FiscalDocumentEmissionService(repo as never, null as never, null as never, null as never, null as never, { canReadFiscalDocument: () => true } as never, null as never);
  return svc.getById(SCOPE as never, 'd');
}

describe('FiscalDocumentView — campos do PR-1 (item 10)', () => {
  it('releitura DIVERGENTE da tentativa corrente e ids de anexo repassados', async () => {
    const v = await view({ xmlAttachmentId: 'ax', pdfAttachmentId: 'ap' }, [attempt(1, JSON.stringify({ errors: [], releitura: RELEITURA }))]);
    expect(v.releitura?.status).toBe('DIVERGENTE');
    expect(v.releitura?.divergencias).toHaveLength(1);
    expect(v.xmlAttachmentId).toBe('ax');
    expect(v.pdfAttachmentId).toBe('ap');
  });

  it('sem resultJson, JSON inválido ou sem chave releitura ⇒ null (nunca lança)', async () => {
    expect((await view({}, [attempt(1, null)])).releitura).toBeNull();
    expect((await view({}, [attempt(1, '{nao-e-json')])).releitura).toBeNull();
    expect((await view({}, [attempt(1, JSON.stringify({ errors: [] }))])).releitura).toBeNull();
    expect((await view({}, [attempt(1, null)])).xmlAttachmentId).toBeNull();
  });

  it('usa a tentativa CORRENTE, não a primeira', async () => {
    const v = await view({ currentAttemptNo: 2 }, [attempt(1, JSON.stringify({ releitura: RELEITURA })), attempt(2, null)]);
    expect(v.releitura).toBeNull();
  });
});
