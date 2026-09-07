import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useSalesWizard } from '../useSalesWizard';

// O hook só usa o FinanceService no submit — mocado para o mount não puxar a cadeia do
// api-client real.
vi.mock('../../../services/FinanceService', () => ({
  FinanceService: vi.fn(),
}));

// ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
// `createInitialState` (useSalesWizard.ts:58) deriva o default da DATA DA VENDA via
// `toISOString().substring(0, 10)` (UTC): entre 21h-00h BRT o dia UTC já virou e a venda
// default nasce datada do "amanhã" do escopo — write-path que atravessa a ponte
// venda→contabilidade (Increment C): a receita é reconhecida no dia errado, em silêncio.
// Comportamento correto (fork-agnóstico): o default afirma o HOJE do escopo — ou vazio,
// se a correção delegar o default. Determinismo (armadilha
// teste-de-hoje-quebra-em-janela-utc): instante FIXADO com fake timers dentro da janela
// que morde — 2026-09-01T02:30Z = 23:30 BRT de 2026-08-31 — independe da máquina/fuso.
describe('useSalesWizard — default de data (classe date-only UTC shift)', () => {
  afterEach(() => cleanup());

  it('guarda: default da data da venda na janela 21h-00h BRT é o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      const { result } = renderHook(() => useSalesWizard());
      expect(
        ['', '2026-08-31'],
        'default de state.date às 23:30 BRT de 2026-08-31 deve afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC: a venda default nasce datada do dia errado e a ponte contábil reconhece a receita no dia errado',
      ).toContain(result.current.state.date);
    } finally {
      vi.useRealTimers();
    }
  });
});
