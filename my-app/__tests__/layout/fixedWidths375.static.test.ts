import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// L-20261113-152226-1171: larguras fixas quebravam a 375 px. Guarda ESTÁTICA (leitura de fonte): o layout real a
// 375 px não foi verificado em navegador.
describe('larguras fixas a 375 px', () => {
  it('painéis da entrevista não passam da tela', () => {
    expect(read('features/interview/components/LeftSidebar/index.tsx')).not.toContain("width: '400px'");
    expect(read('features/interview/components/RightSidebar/index.tsx')).not.toContain('w-[400px]');
    const setup = read('features/interview/components/AiInterviewSetup/index.tsx');
    expect(setup).not.toContain("'405px'");
    expect(setup).not.toContain("'505px'");
  });
  it('Toast e KanbanFilterBar sem min-w fixo em telas estreitas', () => {
    expect(read('components/ui/feedback/Toast.tsx')).not.toMatch(/(?<![:\w-])min-w-\[350px\]/);
    expect(read('features/dashboard/category-views/kanban/KanbanFilterBar.tsx')).not.toMatch(/(?<![:\w-])min-w-\[420px\]/);
  });
  it('sidebar do dashboard recolhe em tela estreita; header do GenericTabbedView quebra linha', () => {
    expect(read('features/dashboard/DashboardSidebar.tsx')).toContain('matchMedia');
    expect(read('features/dashboard/category-views/shared/components/CategoryHeader.tsx')).toContain('flex-wrap');
  });
});
