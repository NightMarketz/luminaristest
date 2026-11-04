import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../api/api-client';
import { accountingService } from '../accounting.service';
import { entryApprovalsService } from '../entryApprovals.service';
import { accountingReviewService } from '../accountingReview.service';

/**
 * TESTE-GUARDA — achado F-907-T do H2 (handoff 2026-11-02, C6): o `JournalEntryModal` mostra o erro da escrita
 * dentro dele, e o apiClient repetia o mesmo erro no toast global (fixed bottom-6 right-6, z-[9999]), que cobre o
 * botão "Postar" do rodapé do modal — o 2º clique caía no fundo e abria "alterações não salvas".
 *
 * As quatro escritas abaixo têm um chamador só, o próprio modal (direto ou pelo `submit` injetado do rascunho e do
 * acerto da revisão), então elas pedem `silent: true` ao apiClient. O toast de SUCESSO (`notify`) continua.
 */

vi.mock('../../api/api-client', () => ({
  apiClient: { post: vi.fn(), put: vi.fn() },
}));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const lines = [
  { accountCode: '1.1.1', debitCents: 100, creditCents: 0 },
  { accountCode: '3.1', debitCents: 0, creditCents: 100 },
];

function optionsOfLast(fn: typeof apiClient.post | typeof apiClient.put): unknown {
  const calls = vi.mocked(fn).mock.calls;
  return calls[calls.length - 1][2];
}

describe('escritas do JournalEntryModal não duplicam o erro no toast global', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} });
    vi.mocked(apiClient.put).mockResolvedValue({ success: true, data: {} });
  });

  it('postEntry (Postar direto no razão) pede silent', async () => {
    await accountingService.postEntry({ unitId: 'u1', date: '2026-10-15', description: 'x', lines } as never);
    expect(optionsOfLast(apiClient.post)).toEqual(expect.objectContaining({ silent: true }));
  });

  it('createDraft (rascunho, maker-checker) pede silent', async () => {
    await entryApprovalsService.createDraft({ unitId: 'u1', date: '2026-10-15', description: 'x', lines } as never);
    expect(optionsOfLast(apiClient.post)).toEqual(expect.objectContaining({ silent: true }));
  });

  it('updateDraft pede silent', async () => {
    await entryApprovalsService.updateDraft('e1', { date: '2026-10-15', description: 'x', lines } as never);
    expect(optionsOfLast(apiClient.put)).toEqual(expect.objectContaining({ silent: true }));
  });

  it('postAdjustment (acerto da revisão) pede silent', async () => {
    await accountingReviewService.postAdjustment('r1', 'f1', { unitId: 'u1', postingDate: '2026-10-15', description: 'x', lines } as never);
    expect(optionsOfLast(apiClient.post)).toEqual(expect.objectContaining({ silent: true }));
  });
});
