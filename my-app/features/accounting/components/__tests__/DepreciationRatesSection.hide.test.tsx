import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, within } from '@testing-library/react';
import { DepreciationRatesSection } from '../DepreciationRatesSection';
import { fixedAssetsService, type DepreciationRate } from '../../../../lib/services/fixedAssets.service';

/**
 * IMO-U1 (L-14): só taxa CUSTOM se oculta — o servidor responde 404 para linha do Anexo III
 * (`DepreciationRateService.hideRate`). A tela não pode oferecer "Ocultar" em linha `ANEXO_III_*`.
 */
vi.mock('../../../../lib/services/fixedAssets.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/fixedAssets.service')>();
  return { ...actual, fixedAssetsService: { listRates: vi.fn(), createRate: vi.fn(), hideRate: vi.fn() } };
});

const rate = (over: Partial<DepreciationRate>): DepreciationRate => ({
  id: 'r1', unitId: 'u1', ncm: null, description: 'Taxa', lifeYears: 10, annualRateBp: 1000,
  source: 'CUSTOM', sourceUrl: null, justification: null, hiddenAt: null, ...over,
} as DepreciationRate);

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('DepreciationRatesSection — Ocultar só em taxa CUSTOM', () => {
  it('não oferece "Ocultar" em linha ANEXO_III_*, mas oferece na CUSTOM', async () => {
    vi.mocked(fixedAssetsService.listRates).mockResolvedValue([
      rate({ id: 'lp3-dep-anexo-100', description: 'Linha do Anexo', source: 'ANEXO_III_IN_1700_2017' }),
      rate({ id: 'lp3-dep-anexo-101', description: 'Linha nota 1', source: 'ANEXO_III_NOTA_1' }),
      rate({ id: 'lp3-dep-anexo-102', description: 'Linha nota 2', source: 'ANEXO_III_NOTA_2' }),
      rate({ id: 'c1', description: 'Taxa própria', source: 'CUSTOM' }),
    ]);
    render(<DepreciationRatesSection unitId="u1" />);
    const custom = (await screen.findByText('Taxa própria')).closest('tr') as HTMLElement;
    expect(within(custom).getByRole('button', { name: /ocultar/i })).toBeTruthy();
    for (const d of ['Linha do Anexo', 'Linha nota 1', 'Linha nota 2']) {
      const tr = screen.getByText(d).closest('tr') as HTMLElement;
      expect(within(tr).queryByRole('button', { name: /ocultar/i }), d).toBeNull();
    }
  });
});
