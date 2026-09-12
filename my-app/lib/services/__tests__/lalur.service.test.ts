import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lalurService } from '../lalur.service';
import { notify } from '../../notifications/notify';

/**
 * lalur.service — FE-INCR-LALUR §2.1: the wire matches `LalurDto.ts` (all body schemas are `.strict()`),
 * `includeArchived` is `'true'` or ABSENT (never `'false'` — `queryBoolean` on the server), archive is a
 * POST command with `{ unitId }`, the catalog is `GET /lalur/catalog` with exactly one of livro/aba,
 * `null` in a PATCH travels as JSON null (the DTO is `nullable`), and only mutations notify.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function okResponse(data: unknown): Response {
  return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) } as unknown as Response;
}

function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}

describe('lalurService', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse([]));
  });

  it('listEntries: year/quarter/livro in the query; includeArchived only when true, never "false"', async () => {
    await lalurService.listEntries({ unitId: 'u1', year: 2025, quarter: 'T02', livro: 'lacs', includeArchived: false });
    expect(lastCall().url).toMatch(/\/lalur\/entries\?unitId=u1&year=2025&quarter=T02&livro=lacs$/);
    expect(lastCall().init.method).toBe('GET');

    await lalurService.listEntries({ unitId: 'u1', year: 2025, includeArchived: true });
    expect(lastCall().url).toMatch(/includeArchived=true$/);
    expect(notify).not.toHaveBeenCalled();
  });

  it('listParteB: codTributo optional; includeArchived omitted when false', async () => {
    await lalurService.listParteB({ unitId: 'u1', codTributo: 'I', includeArchived: false });
    expect(lastCall().url).toMatch(/\/lalur\/parte-b\?unitId=u1&codTributo=I$/);
  });

  it('createEntry: POST /lalur/entries with the exact body; notifies', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ id: 'e1' }));
    const body = { unitId: 'u1', year: 2025, quarter: 'T01' as const, livro: 'lalur' as const, codigo: '7', valorCents: 123456, indRelacao: '4' as const, histLancamento: 'x' };
    const out = await lalurService.createEntry(body);
    expect(out).toEqual({ id: 'e1' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/lalur\/entries$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(body);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('updateEntry: PATCH /lalur/entries/:id — explicit null survives serialization (clears Parte B/conta/histórico)', async () => {
    await lalurService.updateEntry('e 1', { unitId: 'u1', valorCents: 10, indRelacao: '4', parteBId: null, accountId: null, histLancamento: 'h' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/lalur\/entries\/e%201$/);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ unitId: 'u1', valorCents: 10, indRelacao: '4', parteBId: null, accountId: null, histLancamento: 'h' });
  });

  it('archiveEntry / archiveParteB: POST …/archive with { unitId } only (a COMMAND, never DELETE)', async () => {
    await lalurService.archiveEntry('e1', 'u1');
    expect(lastCall().url).toMatch(/\/lalur\/entries\/e1\/archive$/);
    expect(lastCall().init.method).toBe('POST');
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ unitId: 'u1' });

    await lalurService.archiveParteB('b1', 'u1');
    expect(lastCall().url).toMatch(/\/lalur\/parte-b\/b1\/archive$/);
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ unitId: 'u1' });
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('createParteB / updateParteB: bodies mirror the M010 DTO; dtLimite null clears on PATCH', async () => {
    const create = { unitId: 'u1', codCtaB: 'PF-2024', descricao: 'Prejuízo', dtCriacao: '2024-12-31', codPbRfb: '1000', codTributo: 'I' as const, saldoIniCents: 500000, indSaldoIni: 'D' as const };
    await lalurService.createParteB(create);
    expect(lastCall().url).toMatch(/\/lalur\/parte-b$/);
    expect(JSON.parse(lastCall().init.body as string)).toEqual(create);

    await lalurService.updateParteB('b1', { unitId: 'u1', dtLimite: null, cnpjSitEsp: null });
    expect(lastCall().url).toMatch(/\/lalur\/parte-b\/b1$/);
    expect(lastCall().init.method).toBe('PATCH');
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ unitId: 'u1', dtLimite: null, cnpjSitEsp: null });
  });

  it('getCatalog / getParteBPadrao: GET /lalur/catalog with livro XOR aba=PARTEB_PADRAO, year always, tributo/q optional; unwraps rows', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ rows: [{ codigo: '7', descricao: 'Custos', tipo: 'E', tipoLanc: 'A', vigencia: { de: null, ate: null } }] }));
    const rows = await lalurService.getCatalog('u1', 'lalur', 2025, 'cus');
    expect(rows).toHaveLength(1);
    expect(lastCall().url).toMatch(/\/lalur\/catalog\?unitId=u1&livro=lalur&year=2025&q=cus$/);

    await lalurService.getParteBPadrao('u1', 'C');
    expect(lastCall().url).toMatch(/\/lalur\/catalog\?unitId=u1&aba=PARTEB_PADRAO&tributo=C$/);
    expect(lastCall().url).not.toMatch(/year=/);
    expect(lastCall().url).not.toMatch(/livro=/);
    expect(notify).not.toHaveBeenCalled();
  });
});
