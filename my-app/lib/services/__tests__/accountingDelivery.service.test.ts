import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountingDeliveryService } from '../accountingDelivery.service';
import { accountingContactsService } from '../accountingContacts.service';
import { notify } from '../../notifications/notify';

/**
 * FE-INCR-DELIVERY item 1: URLs e bodies exatos de contatos e entrega. `confirm` leva `confirmed: true`
 * literal; `retry` manda `{ unitId, deliveryId: id }` (o BE exige igualdade); `setProfile` manda só `{ kinds }`.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const ok = (data: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as unknown as Response;
function last(): { url: string; method: string; body: unknown } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined };
}

describe('accountingContactsService + accountingDeliveryService', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(ok({ kinds: [], items: [] }));
  });

  it('contatos: register POST, update PATCH com contactId = :id e null que limpa, archive DELETE com unitId', async () => {
    await accountingContactsService.registerContact({ unitId: 'u1', name: 'Ana', email: 'a@x.com', cpf: '52998224725', crcNumber: 'SP-123456/O-1', crcUf: 'SP' });
    expect(last()).toMatchObject({ method: 'POST', body: { unitId: 'u1', name: 'Ana', crcUf: 'SP' } });
    await accountingContactsService.updateContact('c1', { unitId: 'u1', contactId: 'c1', phone: null, crcCertificate: null });
    expect(last()).toEqual({ url: expect.stringMatching(/\/accounting\/contacts\/c1$/), method: 'PATCH', body: { unitId: 'u1', contactId: 'c1', phone: null, crcCertificate: null } });
    await accountingContactsService.archiveContact('c1', 'u1');
    expect(last()).toMatchObject({ url: expect.stringMatching(/\/accounting\/contacts\/c1\?unitId=u1$/), method: 'DELETE' });
  });

  it('perfil: GET e PUT na query unitId/contactId; o PUT manda só { kinds }', async () => {
    await accountingDeliveryService.getProfile('u1', 'c1');
    expect(last().url).toMatch(/\/accounting\/delivery\/profile\?unitId=u1&contactId=c1$/);
    await accountingDeliveryService.setProfile('u1', 'c1', ['EXPORT_TRIAL_BALANCE']);
    expect(last()).toMatchObject({ method: 'PUT', body: { kinds: ['EXPORT_TRIAL_BALANCE'] } });
  });

  it('build e confirm: bodies exatos; confirm leva confirmed: true', async () => {
    await accountingDeliveryService.build({ unitId: 'u1', ecdJobId: 'e', ecfJobId: 'f', extraJobIds: ['x'] });
    expect(last()).toEqual({ url: expect.stringMatching(/\/delivery\/build$/), method: 'POST', body: { unitId: 'u1', ecdJobId: 'e', ecfJobId: 'f', extraJobIds: ['x'] } });
    await accountingDeliveryService.confirm({ unitId: 'u1', ecdJobId: 'e', ecfJobId: 'f', contactId: 'c1', confirmed: true, extraJobIds: [] });
    expect(last().body).toMatchObject({ confirmed: true, contactId: 'c1' });
  });

  it('list na query; retry manda deliveryId igual ao :id', async () => {
    await accountingDeliveryService.list('u1', { status: 'FAILED', year: 2025 });
    expect(last().url).toMatch(/\/accounting\/delivery\?unitId=u1&status=FAILED&year=2025$/);
    await accountingDeliveryService.retry('d 1', 'u1');
    expect(last()).toEqual({ url: expect.stringMatching(/\/delivery\/d%201\/retry$/), method: 'POST', body: { unitId: 'u1', deliveryId: 'd 1' } });
  });
});
