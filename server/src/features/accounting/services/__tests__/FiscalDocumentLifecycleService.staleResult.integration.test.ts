/**
 * GAP-MAP "DF-e — resultado automático gravado sem guarda de status" — testes-guarda (sessao-instrumentacao, 07/10).
 *
 * `applyResult` só passa `whenStatusIn` no retorno manual; consulta, job e webhook gravam com o status LIDO ANTES da
 * chamada de rede. Aqui a porta muda o documento no banco DURANTE `consultar()` (o que um webhook ou um cancelamento
 * concorrente faria) e devolve um resultado velho. Serviço e repositório reais em SQLite — o repo falso do
 * LifecycleService.test não implementa `whenStatusIn` e não prova a guarda.
 *
 * Assere só o estado final no banco: se a correção recusa (409) ou ignora o resultado velho é decisão da correção.
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
  selectDfeEmissor: () => ({ enabled: true, ambiente: 'homologacao', port: mockPort }),
}));

import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { FiscalDocumentRepository, attemptRef } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalDocumentLifecycleService } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { EmissaoResult } from '@/features/accounting/dfe/DfeEmissorPort';

const DONO = 'u-dfe-stale';
const UNIT = 'unit-dfe-stale';
const scope = resolveAccountingScope({ userId: DONO }, UNIT);
const repo = new FiscalDocumentRepository();

const service = new FiscalDocumentLifecycleService(
  repo,
  { getById: jest.fn(async (_s: unknown, id: string) => ({ id })) } as never,
  { upload: jest.fn(async () => ({ id: 'att' })) } as never,
  { attachSourceDocument: jest.fn(async () => ({ id: 'src' })), retireSourceDocument: jest.fn() } as never,
  { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true } as never,
  { append: jest.fn() } as never,
);

async function pendente(saleId: string) {
  const doc = await repo.createSent(scope, {
    kind: 'NFSE',
    saleId,
    cTribNac: '060101',
    anchorEntryId: 'entry-x',
    ambiente: 'homologacao',
    partner: 'null',
    serie: 1,
    numero: 1n,
    dCompet: '2026-10-07',
    vServCents: 10000n,
    tpRetISSQN: 1,
    payloadJson: '{"v":1}',
  });
  await repo.transition(scope, doc.id, { status: 'PROCESSING' });
  return doc;
}

const status = async (id: string) => (await prisma.fiscalDocument.findUnique({ where: { id } }))?.status;

describe('GAP-MAP — resultado automático velho não sobrescreve o status gravado durante a consulta', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('autorizado durante a consulta + resultado velho PROCESSING → continua AUTHORIZED', async () => {
    const doc = await pendente('sale-stale-proc');
    mockPort.consultar.mockImplementationOnce(async (): Promise<EmissaoResult> => {
      await repo.transition(scope, doc.id, { status: 'AUTHORIZED', partnerRef: attemptRef(doc.id, 1), chaveOuCodigo: 'CHAVE-1', authorizedAt: new Date() });
      return { status: 'PROCESSING', partnerRef: attemptRef(doc.id, 1), errors: [] };
    });

    await service.consultarUm(scope, doc.id).catch(() => undefined);

    expect(await status(doc.id)).toBe('AUTHORIZED');
  });

  it('cancelado durante a consulta + resultado velho AUTHORIZED → continua CANCELLED', async () => {
    const doc = await pendente('sale-stale-auth');
    mockPort.consultar.mockImplementationOnce(async (): Promise<EmissaoResult> => {
      await repo.transition(scope, doc.id, { status: 'CANCELLED', cancelledAt: new Date(), saleKey: `cancelled:${doc.id}:sale-stale-auth` });
      return { status: 'AUTHORIZED', partnerRef: attemptRef(doc.id, 1), numero: '1', chaveOuCodigo: 'CHAVE-2', errors: [] };
    });

    await service.consultarUm(scope, doc.id).catch(() => undefined);

    expect(await status(doc.id)).toBe('CANCELLED');
  });
});
