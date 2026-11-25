import { vi } from 'vitest';
import type { accountingBindingService } from '../../../lib/services/accountingBinding.service';
import type { accountingKitService } from '../../../lib/services/accountingKit.service';

/**
 * Mock compartilhado dos dois serviços que a `AccountingView` lê no mount (L-20261121-153450-3829): `useUnitKit` chama
 * `accountingKitService.getKit` e a faixa de ativação (`useUnitAccountingActivation`) chama
 * `accountingBindingService.listActive`. Sem mock, cada render faz rede real e a rejeição pode chegar depois do teardown
 * do jsdom. Padrão: unidade sem kit e sem binding ativo. Uso, no arquivo de teste:
 *
 *   vi.mock('../../../lib/services/accountingKit.service', async () => (await import('./accountingViewServiceMocks')).accountingKitServiceMock());
 */
export const accountingKitServiceMock = () => ({
  accountingKitService: {
    getKit: vi.fn(async () => null),
    listPending: vi.fn(async () => []),
  } satisfies Partial<typeof accountingKitService>,
});

export const accountingBindingServiceMock = () => ({
  accountingBindingService: {
    listActive: vi.fn(async () => []),
    activateDefault: vi.fn(),
  } satisfies Partial<Record<keyof typeof accountingBindingService, unknown>>,
});
