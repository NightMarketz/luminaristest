import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

import { apiClient } from '../../api/api-client';
import { notify } from '../../notifications/notify';
import { dfeAssinadorService } from '../dfeAssinador.service';

/** FE-INCR-NFCE-ASSINADOR FA-1 — caminhos com o unitId codificado, `null` passa como `null`, notify só no sucesso. */
describe('dfeAssinadorService (FA-1)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gerarCodigo faz POST no caminho da unidade e notifica no sucesso', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: { codigo: 'ABCD', expiraEm: '2026-11-07T12:10:00.000Z' } });
    await expect(dfeAssinadorService.gerarCodigo('u/1')).resolves.toEqual({ codigo: 'ABCD', expiraEm: '2026-11-07T12:10:00.000Z' });
    expect(apiClient.post).toHaveBeenCalledWith('/accounting/dfe-assinador/u%2F1/codigos', {});
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('gerarCodigo com erro não notifica', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ status: 403, error: 'Sem permissão' });
    await expect(dfeAssinadorService.gerarCodigo('u1')).rejects.toMatchObject({ status: 403 });
    expect(notify).not.toHaveBeenCalled();
  });

  it('getEstado devolve null quando o BE devolve null', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: null });
    await expect(dfeAssinadorService.getEstado('u 1')).resolves.toBeNull();
    expect(apiClient.get).toHaveBeenCalledWith('/accounting/dfe-assinador/u%201');
  });

  it('revogar faz DELETE e notifica', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);
    await dfeAssinadorService.revogar('u1');
    expect(apiClient.delete).toHaveBeenCalledWith('/accounting/dfe-assinador/u1');
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
