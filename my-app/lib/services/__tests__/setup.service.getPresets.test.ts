import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetupService } from '../setup.service';

/** L-20261111-204322-37cb: a lista de presets pede o idioma da UI ao servidor. */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const ok = { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify({ data: [] }) } as unknown as Response;

describe('SetupService.getPresets', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(ok);
  });
  const url = () => String(vi.mocked(globalThis.fetch).mock.calls[0][0]);

  it('com locale: manda ?locale=', async () => {
    await SetupService.getPresets('en');
    expect(url()).toMatch(/\/dashboard\/presets\?locale=en$/);
  });

  it('sem locale: a URL de antes', async () => {
    await SetupService.getPresets();
    expect(url()).toMatch(/\/dashboard\/presets$/);
  });
});
