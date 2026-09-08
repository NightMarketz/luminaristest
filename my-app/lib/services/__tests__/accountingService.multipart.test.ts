import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountingService } from '../accounting.service';

/**
 * FE-INCR-NFE V1 — guarda do movimento dos helpers multipart para `lib/services/multipart.ts`:
 * `importBankStatement` continua enviando EXATAMENTE os mesmos campos (obrigatórios + opcionais só quando
 * dados), o Bearer do cookie, nenhum Content-Type manual, e o erro `{ ...body, status }`.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const file = new File(['a;b'], 'extrato.ofx', { type: 'text/plain' });

function lastCall(): { url: string; init: RequestInit; form: FormData } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init, form: init.body as FormData };
}

describe('accountingService.importBankStatement (multipart helpers movidos)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('envia file + unitId + glAccountId + periodStart + periodEnd e os opcionais só quando informados', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, data: { created: true, lineCount: 3 } }),
    } as unknown as Response);
    const out = await accountingService.importBankStatement(
      { unitId: 'u1', glAccountId: 'gl1', periodStart: '2026-09-01', periodEnd: '2026-09-30', statementRef: 'ref', openingBalanceCents: 100, closingBalanceCents: 200 },
      file,
    );
    expect(out).toEqual({ created: true, lineCount: 3 });
    const { url, init, form } = lastCall();
    expect(url).toMatch(/\/accounting\/reconciliation\/statements$/);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(Array.from(form.keys()).sort()).toEqual(
      ['closingBalanceCents', 'file', 'glAccountId', 'openingBalanceCents', 'periodEnd', 'periodStart', 'statementRef', 'unitId'],
    );
    expect(form.get('openingBalanceCents')).toBe('100');

    await accountingService.importBankStatement({ unitId: 'u1', glAccountId: 'gl1', periodStart: '2026-09-01', periodEnd: '2026-09-30' }, file);
    expect(Array.from(lastCall().form.keys()).sort()).toEqual(['file', 'glAccountId', 'periodEnd', 'periodStart', 'unitId']);
  });

  it('não-2xx lança o corpo do servidor com status (o que resolveError lê)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ success: false, error: 'Extrato inválido.' }),
    } as unknown as Response);
    await expect(
      accountingService.importBankStatement({ unitId: 'u1', glAccountId: 'gl1', periodStart: '2026-09-01', periodEnd: '2026-09-30' }, file),
    ).rejects.toMatchObject({ status: 400, error: 'Extrato inválido.' });
  });
});
