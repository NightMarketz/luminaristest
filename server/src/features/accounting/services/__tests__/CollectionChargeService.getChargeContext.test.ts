/**
 * Onda 4 / 4.2b — a LIGAÇÃO do serviço à política de rede do MP (dono, 24/11/2026): o mesmo `getCharge` tem política
 * diferente no webhook (1 tentativa: o MP espera 22 s) e no job/recheck (2 tentativas, 35 s). O provider decide a política
 * pelo contexto que recebe; é o serviço que garante o contexto certo em cada caminho — estes testes o travam com uma
 * porta falsa que registra os argumentos de `getCharge`.
 */
import { CollectionChargeService } from '../CollectionChargeService';
import { CollectionProviderError, type CollectionProviderPort } from '../../ports/CollectionProviderPort';

jest.mock('../../../../lib/secretBox', () => ({ ...jest.requireActual('../../../../lib/secretBox'), loadKeyring: jest.fn(() => ({})) }));

const account = { id: 'pa1', provider: 'MERCADO_PAGO', status: 'ACTIVE' };
const charge = {
  id: 'ch1', unitId: 'u1', receivableId: 'r1', paymentAccountId: 'pa1', kind: 'PIX', amountCents: 5000n, status: 'PENDING',
  providerRef: 'ORD1', providerPaymentRef: null, providerStatus: 'action_required', providerStatusDetail: 'waiting_payment',
  paidAt: null, failReason: null, instrumentJson: null, payerSnapshotJson: '{}', expiresAt: new Date('2026-12-01T00:00:00Z'),
  createdAt: new Date('2026-11-01T00:00:00Z'), updatedAt: new Date('2026-11-01T00:00:00Z'),
};
const real = { providerStatus: 'action_required', providerStatusDetail: 'waiting_payment', providerRef: 'ORD1' };

function montar(opts: { cancelFalha?: CollectionProviderError } = {}) {
  const getCharge = jest.fn(async (..._args: unknown[]) => real);
  const port = {
    name: 'MERCADO_PAGO',
    getCharge,
    cancelCharge: jest.fn(async () => {
      throw opts.cancelFalha ?? new Error('não usado');
    }),
    verifyWebhook: jest.fn(() => ({ ok: true as const, resourceRef: 'ORD1' })),
  } as unknown as CollectionProviderPort;
  const repo = {
    findByProviderRefAnyScope: jest.fn(async () => charge),
    findById: jest.fn(async () => charge),
    findByIdAnyScope: jest.fn(async () => charge),
    findPollable: jest.fn(async () => [charge]),
  };
  const paymentAccountRepo = { findByIdAnyScope: jest.fn(async () => account) };
  const policy = { canManageReceivable: () => true };
  const service = new CollectionChargeService(
    repo as never, paymentAccountRepo as never, null as never, null as never, null as never, policy as never, () => port,
  );
  const interno = service as unknown as { resolve: unknown; applyProviderResult: unknown };
  interno.resolve = () => ({ id: 'pa1', credentialSource: 'OWN', credential: { accessToken: 't', webhookSecret: 's' } });
  interno.applyProviderResult = async () => charge;
  return { service, getCharge };
}

describe('CollectionChargeService — contexto de rede passado ao getCharge', () => {
  it("webhook: re-consulta com o contexto 'webhook' (1 tentativa, cabe nos 22 s do MP)", async () => {
    const { service, getCharge } = montar();
    await expect(service.webhookReceived('MERCADO_PAGO', 'pa1', {}, {})).resolves.toEqual({ status: 200 });
    expect(getCharge).toHaveBeenCalledTimes(1);
    expect(getCharge.mock.calls[0]).toEqual([expect.anything(), 'ORD1', 'webhook']);
  });

  it("job (pollPending): re-consulta SEM contexto 'webhook' (padrão 'job' = 2 tentativas, 35 s)", async () => {
    const { service, getCharge } = montar();
    await service.pollPending();
    expect(getCharge).toHaveBeenCalledTimes(1);
    expect([undefined, 'job']).toContain(getCharge.mock.calls[0][2]);
  });

  it("recheck do cancel (409 ⇒ relê a ordem): SEM contexto 'webhook'", async () => {
    const { service, getCharge } = montar({ cancelFalha: new CollectionProviderError('409', 409) });
    await service.cancel({ unitId: 'u1', actorUserId: 'a' } as never, 'ch1');
    expect(getCharge).toHaveBeenCalledTimes(1);
    expect([undefined, 'job']).toContain(getCharge.mock.calls[0][2]);
  });
});
