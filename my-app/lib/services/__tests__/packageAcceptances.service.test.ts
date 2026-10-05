import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../api/api-client';
import { multipartStreamDownload } from '../multipart';
import { packageBalancesService } from '../packageBalances.service';
import { hasValidity, packageAcceptancesService, toAcceptanceInput, type ValidityNotice } from '../packageAcceptances.service';

/**
 * FE-INCR-PACOTE-VALIDADE — os clientes do aceite e do saldo. O body do aceite é .strict() no servidor: o teste asserta
 * o shape EXATO (só versão + hash do texto mostrado), e que o saldo expõe `expiresOn` date-only (item 7).
 */

vi.mock('../../api/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../multipart', () => ({
  multipartBaseUrl: () => 'http://api.test/api',
  multipartStreamDownload: vi.fn(async () => undefined),
}));

const NOTICE: ValidityNotice = {
  validityDays: 30,
  saleDate: '2026-11-25',
  expiresOn: '2026-12-26',
  textVersion: 'v1',
  text: 'VALIDADE DO PACOTE: ...',
  textSha256: 'a'.repeat(64),
};

beforeEach(() => vi.clearAllMocks());

describe('packageBalancesService (item 7)', () => {
  const raw = (over: Record<string, unknown>) => ({ id: 'b1', customerId: 'c1', packageId: 'p1', unitId: 'u1', balanceCents: '25000', ...over });

  it("expiresAt '2026-12-31T00:00:00.000Z' → expiresOn '2026-12-31' (date-only, sem Date local)", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { balances: [raw({ expiresAt: '2026-12-31T00:00:00.000Z' })] } });
    const [b] = await packageBalancesService.listBalances('u1', 'c1');
    expect(b.expiresOn).toBe('2026-12-31');
    expect(b.balanceCents).toBe(25000);
  });

  it('expiresAt null ou ausente → expiresOn null (sem validade)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { balances: [raw({ expiresAt: null }), raw({ id: 'b2' })] } });
    const rows = await packageBalancesService.listBalances('u1');
    expect(rows.map((r) => r.expiresOn)).toEqual([null, null]);
  });
});

describe('packageAcceptancesService', () => {
  it('getNotice: GET /package-acceptances/notice com unitId, packageId e saleDate', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: NOTICE });
    expect(await packageAcceptancesService.getNotice('u1', 'p1', '2026-11-25')).toEqual(NOTICE);
    const url = String(vi.mocked(apiClient.get).mock.calls[0][0]);
    expect(url.startsWith('/package-acceptances/notice?')).toBe(true);
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(Object.fromEntries(qs)).toEqual({ unitId: 'u1', packageId: 'p1', saleDate: '2026-11-25' });
  });

  it('create: POST /package-acceptances com o body EXATO (unitId, saleId, textVersion, textSha256) — nada de texto, data ou cliente', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: { id: 'acc-1' } });
    if (!hasValidity(NOTICE)) throw new Error('fixture');
    await packageAcceptancesService.create(toAcceptanceInput('u1', 's1', NOTICE));
    expect(apiClient.post).toHaveBeenCalledWith('/package-acceptances', { unitId: 'u1', saleId: 's1', textVersion: 'v1', textSha256: 'a'.repeat(64) });
    expect(Object.keys(vi.mocked(apiClient.post).mock.calls[0][1]).sort()).toEqual(['saleId', 'textSha256', 'textVersion', 'unitId']);
  });

  it('getBySale devolve a linha ou null', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ success: true, data: null });
    expect(await packageAcceptancesService.getBySale('u1', 's1')).toBeNull();
    const qs = new URLSearchParams(String(vi.mocked(apiClient.get).mock.calls[0][0]).split('?')[1]);
    expect(Object.fromEntries(qs)).toEqual({ unitId: 'u1', saleId: 's1' });
  });

  it('downloadReceipt chama a URL certa do PDF, pelo helper de GET binário compartilhado', async () => {
    await packageAcceptancesService.downloadReceipt('u 1', 's/1');
    expect(multipartStreamDownload).toHaveBeenCalledWith(
      'http://api.test/api/package-acceptances/s%2F1/receipt?unitId=u%201',
      'comprovante-pacote-s/1.pdf',
    );
  });
});

describe('hasValidity', () => {
  it('true só com texto, hash, data e prazo; pacote sem validade (tudo null) → false', () => {
    expect(hasValidity(NOTICE)).toBe(true);
    expect(hasValidity({ ...NOTICE, validityDays: null, expiresOn: null, text: null, textSha256: null })).toBe(false);
  });
});
