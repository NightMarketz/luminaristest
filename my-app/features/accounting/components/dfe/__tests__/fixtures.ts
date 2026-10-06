import type { FichaView, FiscalDocumentView } from '../../../../../lib/services/dfe.service';
import type { DpsManualPayloadInput } from '@/types/contracts/accounting/DpsPayloadDto.gen';

export const doc = (over: Partial<FiscalDocumentView> = {}): FiscalDocumentView => ({
  id: 'd1',
  kind: 'NFSE',
  status: 'SENT',
  saleId: 's1',
  cTribNac: '060101',
  anchorEntryId: 'je1',
  ambiente: 'homologacao',
  partner: 'manual',
  partnerRef: null,
  serie: 1,
  numero: null,
  nNFSe: null,
  chaveOuCodigo: null,
  dCompet: '2026-10-06',
  vServCents: '123456',
  tpRetISSQN: 1,
  vIssCents: null,
  vIbsCents: null,
  vCbsCents: null,
  currentAttemptNo: 1,
  authorizedAt: null,
  cancelledAt: null,
  errors: [],
  sourceDocumentId: null,
  attempts: [{ attemptNo: 1, ref: 'r1', sentAt: '2026-10-06T12:00:00.000Z', resultStatus: null }],
  pendencias: [],
  xmlAttachmentId: null,
  pdfAttachmentId: null,
  releitura: null,
  ...over,
});

/** DPS do Simples (opSimpNac 3, pTotTribSN) — o 1º cliente. */
export const simplesPayload = (): DpsManualPayloadInput => ({
  versao: '1.01',
  infDPS: {
    tpAmb: 2,
    dhEmi: '2026-10-06T12:00:00-03:00',
    verAplic: 'luminaris-1',
    dCompet: '2026-10-06',
    tpEmit: 1,
    cLocEmi: '3550308',
    prest: { CNPJ: '12345678000195', regTrib: { opSimpNac: 3, regApTribSN: 1, regEspTrib: 0 } },
    toma: { CPF: '12345678909', xNome: 'Maria Cliente' },
    serv: {
      locPrest: { cLocPrestacao: '3550308' },
      cServ: { cTribNac: '060101', xDescServ: 'Corte de cabelo', cNBS: '123456789' },
    },
    valores: {
      vServPrest: { vServ: '1234.56' },
      trib: { tribMun: { tribISSQN: 1, tpRetISSQN: 1 }, totTrib: { pTotTribSN: '6.00' } },
    },
  },
});

export const ficha = (over: Partial<FichaView> = {}): FichaView => ({
  documentId: 'd1',
  status: 'SENT',
  currentAttemptNo: 1,
  payload: simplesPayload(),
  ...over,
});
