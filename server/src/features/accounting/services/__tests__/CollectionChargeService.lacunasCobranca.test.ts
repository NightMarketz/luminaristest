/**
 * Teste-guarda das lacunas L-20261124-193621-d0ed (423 do MP) e L-20261124-052121-bff7 (CNPJ alfanumérico no
 * pré-preenchimento do pagador), ambas em `CollectionChargeService.ts`.
 *
 * d0ed — `send()`: a doc do MP lista 423 `resource_locked` ("Idempotency key locked, retry later") na criação da ordem.
 * É transitório: FAILED soltaria o índice de uma-viva-por-título e a próxima cobrança nasceria com id (e chave) nova,
 * podendo duplicar a ordem no MP. Esperado: a cobrança fica CREATING (o job reenvia com a MESMA `id:attempt`).
 *
 * bff7 — `payerSuggestion()`: o `taxId` da contraparte ia verbatim para `identification.number`; CNPJ alfanumérico
 * (`12ABC34501DE35`) não passa no `PayerSchema` numérico ⇒ 400 na cobrança. Esperado, enquanto o MP não confirmar o
 * alfanumérico (lacuna 437a, gate externo): o pré-preenchimento omite `identification`.
 */
import { CollectionProviderError } from '../../ports/CollectionProviderPort';
import { CollectionChargeService } from '../CollectionChargeService';

const nulo = null as never;

function charge() {
  return {
    id: 'ch-1',
    userId: 'u-1',
    unitId: 'unit-1',
    receivableId: 'rec-1',
    paymentAccountId: 'acc-1',
    kind: 'PIX',
    amountCents: 1000n,
    attempt: 1,
    status: 'CREATING',
    payerSnapshotJson: JSON.stringify({ firstName: 'A', lastName: 'B', email: 'a@b.com', identification: { type: 'CPF', number: '52998224725' } }),
  };
}

function montarSend(httpStatus: number) {
  const casStatus = jest.fn(async () => 1);
  const repo = {
    findCompanyName: async () => null,
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
    casStatus,
    findByIdAnyScope: async () => charge(),
  };
  const receivableRepo = { findById: async () => ({ documentNumber: 'T-1' }) };
  const paymentAccountRepo = { markCredentialInvalid: jest.fn(), updateStatus: jest.fn() };
  const auditService = { append: jest.fn(async () => undefined) };
  const createCharge = jest.fn(async () => {
    throw new CollectionProviderError('Idempotency key locked. Please retry after some time', httpStatus, 'resource_locked');
  });
  const service = new CollectionChargeService(
    repo as never,
    paymentAccountRepo as never,
    receivableRepo as never,
    nulo,
    auditService as never,
    nulo,
    () => ({ createCharge }) as never,
  );
  (service as unknown as { resolve: () => unknown }).resolve = () => ({ id: 'acc-1', credentialSource: 'OWN', credential: {} });
  const send = (service as unknown as { send: (...a: unknown[]) => Promise<unknown> }).send.bind(service);
  return { send, casStatus, createCharge };
}

describe('CollectionChargeService.send — 423 resource_locked do MP é transitório (L-20261124-193621-d0ed)', () => {
  it('423 ⇒ não grava FAILED; a cobrança segue CREATING para o re-drive com a mesma chave', async () => {
    const { send, casStatus, createCharge } = montarSend(423);
    await expect(send(charge(), { id: 'acc-1', provider: 'MERCADO_PAGO' }, nulo, 'PT30M')).rejects.toBeDefined();
    expect(createCharge).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ idempotencyKey: 'ch-1:1' }));
    const paraFailed = casStatus.mock.calls.filter((c: unknown[]) => (c[2] as { status?: string })?.status === 'FAILED');
    expect(paraFailed).toHaveLength(0);
  });

  it('controle: 400 continua definitivo ⇒ FAILED', async () => {
    const { send, casStatus } = montarSend(400);
    await send(charge(), { id: 'acc-1', provider: 'MERCADO_PAGO' }, nulo, 'PT30M');
    expect(casStatus).toHaveBeenCalledWith('ch-1', 'CREATING', expect.objectContaining({ status: 'FAILED' }), expect.anything());
  });
});

function montarSugestao(taxId: string | null) {
  const repo = { findLastByCounterparty: async () => null };
  const receivableRepo = { findById: async () => ({ id: 'rec-1', counterpartyId: 'cp-1' }) };
  const counterpartyRepo = { findById: async () => ({ id: 'cp-1', taxId }) };
  const policy = { canManageReceivable: () => true };
  const service = new CollectionChargeService(
    repo as never,
    nulo,
    receivableRepo as never,
    counterpartyRepo as never,
    nulo,
    policy as never,
    () => nulo,
  );
  return service.payerSuggestion({ userId: 'u-1', unitId: 'unit-1' } as never, 'rec-1');
}

describe('CollectionChargeService.payerSuggestion — taxId fora do PayerSchema não vai ao pré-preenchimento (L-20261124-052121-bff7)', () => {
  it('CNPJ alfanumérico ⇒ omite identification (em vez de mandar valor que dá 400)', async () => {
    await expect(montarSugestao('12ABC34501DE35')).resolves.toEqual({});
  });

  it('controle: CNPJ numérico (14 dígitos) segue pré-preenchido', async () => {
    await expect(montarSugestao('11222333000181')).resolves.toEqual({ identification: { number: '11222333000181' } });
  });

  it('controle: CPF (11 dígitos) segue pré-preenchido', async () => {
    await expect(montarSugestao('52998224725')).resolves.toEqual({ identification: { number: '52998224725' } });
  });
});
