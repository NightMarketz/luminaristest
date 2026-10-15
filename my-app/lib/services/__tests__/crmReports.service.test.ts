import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrmReportsService } from '../crmReports.service';

/**
 * crmReports.service — FE-INCR-CRM-REPORT-BUILDER PR-A (BRIEF §3): URL, método e corpo de cada rota do BE do CRM-RB.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function okResponse(data?: unknown): Response {
  return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) } as unknown as Response;
}
function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}

const spec = { source: 'leads' as const, measures: [{ type: 'count' as const }] as [{ type: 'count' }] };

describe('CrmReportsService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({}));
  });

  it('list/get: GET na coleção e no id codificado', async () => {
    await CrmReportsService.list();
    expect(lastCall().url).toMatch(/\/crm\/reports$/);
    expect(lastCall().init.method).toBe('GET');
    await CrmReportsService.get('r/1');
    expect(lastCall().url).toMatch(/\/crm\/reports\/r%2F1$/);
  });

  it('create: POST com o corpo do contrato; update: PUT só com o patch', async () => {
    await CrmReportsService.create({ name: 'Funil', kind: 'chart', chartType: 'bar', spec });
    expect(lastCall().init.method).toBe('POST');
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ name: 'Funil', kind: 'chart', chartType: 'bar', spec });
    await CrmReportsService.update('r1', { name: 'Novo' });
    expect(lastCall().url).toMatch(/\/crm\/reports\/r1$/);
    expect(lastCall().init.method).toBe('PUT');
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ name: 'Novo' });
  });

  it('templates (PR-C, item 19): GET /crm/reports/templates', async () => {
    await CrmReportsService.templates();
    expect(lastCall().url).toMatch(/\/crm\/reports\/templates$/);
    expect(lastCall().init.method).toBe('GET');
  });

  it('remove: DELETE no id', async () => {
    await CrmReportsService.remove('r1');
    expect(lastCall().url).toMatch(/\/crm\/reports\/r1$/);
    expect(lastCall().init.method).toBe('DELETE');
  });

  it('preview: POST /run com spec + timeZone; run salvo: POST /:id/run com timeZone', async () => {
    await CrmReportsService.preview({ spec, timeZone: 'America/Sao_Paulo' });
    expect(lastCall().url).toMatch(/\/crm\/reports\/run$/);
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ spec, timeZone: 'America/Sao_Paulo' });
    await CrmReportsService.run('r1', { timeZone: 'UTC' });
    expect(lastCall().url).toMatch(/\/crm\/reports\/r1\/run$/);
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ timeZone: 'UTC' });
  });
});
