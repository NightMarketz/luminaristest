/**
 * ERRO-CRU-AO-CLIENTE (GAP-MAP, dono 2026-11-04) — `translateProviderError` embrulhava QUALQUER erro desconhecido
 * num `AppError(error.message, 500)`, e o `handleApiError` repassa a mensagem de todo `AppError` ao cliente.
 * Erro que não é nosso (banco, rede, bug) fica só no log.
 */
import { AppError } from '../../../../lib/errors';
import { CollectionChargeService } from '../CollectionChargeService';

type Translate = (account: unknown, error: unknown, chargeId?: string) => Promise<AppError>;

function translate(): Translate {
  const nulo = null as never;
  const service = new CollectionChargeService(nulo, nulo, nulo, nulo, nulo, nulo, () => nulo);
  const fn = (service as unknown as { translateProviderError: Translate }).translateProviderError;
  return fn.bind(service);
}

describe('CollectionChargeService.translateProviderError — erro cru não chega ao cliente', () => {
  it('erro desconhecido ⇒ AppError 500 sem o texto interno', async () => {
    const interno = 'Invalid `prisma.collectionCharge.update()` invocation: Unique constraint failed on the fields: (`externalId`)';
    const err = await translate()({ id: 'acc-1' }, new Error(interno));
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(500);
    expect(err.message).not.toContain('prisma');
    expect(err.message).not.toContain('Unique constraint');
  });

  it('AppError nosso passa intacto (a mensagem é de domínio)', async () => {
    const nosso = new AppError('Conta de pagamento inativa.', 409, 'PAYMENT_ACCOUNT_INACTIVE');
    await expect(translate()({ id: 'acc-1' }, nosso)).resolves.toBe(nosso);
  });
});
