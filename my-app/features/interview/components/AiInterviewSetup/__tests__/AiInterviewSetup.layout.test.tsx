import React, { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// W3 RUNBOOK-W3-ESCOLHA-CRIACAO passo 7 (FALHOU em 06/11): no card de altura fixa (h-[600px]), a lista
// "Módulos sugeridos" (W5 #728, ~433 px) não tinha teto e a ChatArea (flex-grow overflow-y-auto) encolhia até
// o próprio padding (32 px) — a mensagem do servidor no ambíguo ("Não entendi sua escolha…") e a proposta da
// IA no passo 1 sumiam, e os botões e o campo transbordavam a borda.
//
// O jsdom não faz layout, então este guarda afirma o CONTRATO de layout que impede o esmagamento:
//   (1) a área de mensagens tem piso de altura (min-h-*), não encolhe a zero;
//   (2) a lista de módulos tem teto (max-h-*), rola por dentro (overflow-y-auto) e é ela que cede (min-h-0).
// A prova de tela (alturas medidas no Chromium em build de produção) está na reexecução do runbook.
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }) }));

import ChatArea from '../ChatArea';
import ModuleChecklist from '../ModuleChecklist';
import type { InterviewModuleOption } from '../../../types/InterviewTypes';

const classesOf = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

describe('W3 passo 7 — card da entrevista não esmaga a área de mensagens', () => {
  it('ChatArea tem piso de altura: a mensagem do servidor continua visível com a lista de módulos aberta', () => {
    render(
      <ChatArea
        messages={[{ sender: 'ai', text: 'Não entendi sua escolha.' }]}
        isLoading={false}
        chatEndRef={createRef<HTMLDivElement>()}
      />,
    );
    const area = screen.getByText('Não entendi sua escolha.').closest('.overflow-y-auto');
    expect(area).not.toBeNull();
    expect(classesOf(area!).some((c) => /^min-h-(?!0$)/.test(c))).toBe(true);
  });

  it('ModuleChecklist tem teto e rola por dentro: é a lista que cede altura no card fixo', () => {
    const options: InterviewModuleOption[] = Array.from({ length: 12 }, (_, i) => ({
      key: `CRM-${i}` as InterviewModuleOption['key'],
      name: { pt: `Módulo ${i}`, en: `Module ${i}` },
      dependsOn: [],
      locked: false,
      suggested: true,
    }));
    render(<ModuleChecklist options={options} selected={[]} disabled={false} onToggle={() => {}} />);
    const fieldset = screen.getByRole('group');
    const cls = classesOf(fieldset);
    expect(cls.some((c) => /^max-h-/.test(c))).toBe(true);
    expect(cls).toContain('overflow-y-auto');
    expect(cls).toContain('min-h-0');
  });
});
