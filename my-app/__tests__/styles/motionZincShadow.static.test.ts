import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// L-20261113-152234-6a68 (guardas estáticas: leitura de fonte, não CSS computado)
describe('movimento, zinc e classe dinâmica', () => {
  it('globals.css respeita prefers-reduced-motion', () => {
    const css = read('styles/globals.css');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
  it('subscription.tsx não monta shadow-${...} dinamicamente (o Tailwind a remove no build)', () => {
    expect(read('pages/users/subscription.tsx')).not.toMatch(/shadow-\$\{/);
  });
  it.each([
    'components/ui/feedback/Toast.tsx',
    'components/floating-chat/FloatingChatWindow.tsx',
    'components/widgets/chat/components/ChatMessageInput.tsx',
    'components/widgets/chat/components/ChatMessageList.tsx',
    'components/widgets/chat/components/DocumentChatWidget.tsx',
    'components/widgets/generic-chat/components/GenericChatWidget.tsx',
    'features/dashboard/category-views/finance/components/analytics/charts/SpeedometerChart.tsx',
  ])('%s usa neutral-*, não zinc-*', (f) => {
    expect(read(f)).not.toMatch(/zinc-/);
  });
});
