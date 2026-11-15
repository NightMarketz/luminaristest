import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const state = vi.hoisted(() => ({ pathname: '/dashboard', isOpen: true }));
const i18nStable = vi.hoisted(() => ({ t: (k: string) => k }));
vi.mock('next-i18next', () => ({ useTranslation: () => i18nStable }));
vi.mock('next/router', () => ({ useRouter: () => ({ pathname: state.pathname }) }));
vi.mock('../FloatingChatProvider', () => ({
  useFloatingChat: () => ({ isOpen: state.isOpen, toggle: () => {}, close: () => {}, position: { x: 20, y: 100 }, updatePosition: () => {} }),
}));
vi.mock('../../widgets/generic-chat/components/GenericChatWidget', () => ({ default: () => <textarea aria-label="msg" /> }));

import { FloatingChatBubble } from '../FloatingChatBubble';
import { FloatingChatWindow } from '../FloatingChatWindow';

// L-20261113-153617-bc3c: a 375 px a janela ia de x=20 a x=400 (fora da tela), o foco ficava no body e
// a bolha cobria o "Enviar" da Entrevista com IA.
describe('Chat flutuante em tela estreita', () => {
  beforeEach(() => { state.pathname = '/dashboard'; state.isOpen = true; (window as unknown as { innerWidth: number }).innerWidth = 375; });

  it('a janela cabe na tela (left + width <= innerWidth)', async () => {
    render(<FloatingChatWindow />);
    const dlg = await screen.findByRole('dialog');
    const left = parseFloat(dlg.style.left);
    const width = parseFloat(dlg.style.width);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + width).toBeLessThanOrEqual(375);
  });

  it('ao abrir, o foco entra na janela', async () => {
    render(<FloatingChatWindow />);
    const dlg = await screen.findByRole('dialog');
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(dlg.contains(document.activeElement)).toBe(true);
  });

  it('a bolha some na tela de setup (cobria o Enviar da entrevista)', () => {
    state.isOpen = false;
    state.pathname = '/dashboard/setup';
    const { container } = render(<FloatingChatBubble />);
    expect(container).toBeEmptyDOMElement();
  });
});
