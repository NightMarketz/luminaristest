import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// W5 FE-INCR-W5-MODULES item 15 (BRIEF BE-INCR-PRESET-KB-SINGLE-SOURCE §2).
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }) }));

import ModuleChecklist from '../ModuleChecklist';
import { toggleModuleSelection } from '../../../setup/moduleSelection';
import type { InterviewModuleOption, ModuleKey } from '../../../types/InterviewTypes';

const opt = (key: ModuleKey, pt: string, locked: boolean, dependsOn: ModuleKey[] = ['CRM-0']): InterviewModuleOption => ({
  key,
  name: { pt, en: `${pt}-en` },
  dependsOn,
  locked,
  suggested: true,
});

// Fixture do sim/não latente (F-W5-4): suíte sem CRM-0 → nada travado.
const SEM_CRM0: InterviewModuleOption[] = [
  opt('CRM-0', 'Funil', false, []),
  opt('CRM-1', 'Propostas', false),
  opt('CRM-2A', 'Contas', false),
  opt('CRM-2B', 'Contatos', false),
  opt('CRM-3', 'Oportunidades', false),
];
const SALAO: InterviewModuleOption[] = [opt('CRM-0', 'Funil', true, []), opt('CRM-1', 'Propostas', true), opt('CRM-3', 'Oportunidades', false)];

function Harness({ options, initial }: { options: InterviewModuleOption[]; initial: ModuleKey[] }) {
  const [selected, setSelected] = useState<ModuleKey[]>(initial);
  return (
    <ModuleChecklist
      options={options}
      selected={selected}
      disabled={false}
      onToggle={(k) => setSelected((prev) => toggleModuleSelection(options, prev, k))}
    />
  );
}

const box = (name: string) => screen.getByRole('checkbox', { name: new RegExp(name) }) as HTMLInputElement;

describe('ModuleChecklist (W5 FE item 15)', () => {
  it('desmarcar CRM-0 (locked: false) desmarca CRM-1..3; marcar CRM-3 de novo traz CRM-0', () => {
    render(<Harness options={SEM_CRM0} initial={['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3']} />);
    fireEvent.click(box('Funil'));
    for (const n of ['Funil', 'Propostas', 'Contas', 'Contatos', 'Oportunidades']) expect(box(n).checked).toBe(false);

    fireEvent.click(box('Oportunidades'));
    expect(box('Oportunidades').checked).toBe(true);
    expect(box('Funil').checked).toBe(true);
    expect(box('Propostas').checked).toBe(false);
  });

  it('travado aparece marcado e desabilitado; clicar não desmarca', () => {
    render(<Harness options={SALAO} initial={['CRM-0', 'CRM-1']} />);
    expect(box('Funil')).toBeChecked();
    expect(box('Funil')).toBeDisabled();
    fireEvent.click(box('Funil'));
    expect(box('Funil')).toBeChecked();
    expect(box('Oportunidades')).not.toBeChecked();
    expect(box('Oportunidades')).toBeEnabled();
  });

  it('nome pelo locale e textos de UI por chave i18n', () => {
    render(<Harness options={SALAO} initial={['CRM-0', 'CRM-1']} />);
    expect(screen.getByText('Propostas')).toBeInTheDocument();
    expect(screen.queryByText('Propostas-en')).toBeNull();
    expect(screen.getByText('interviewModulesTitle')).toBeInTheDocument();
  });

  it('toggleModuleSelection: travado não muda; resultado na ordem das opções', () => {
    expect(toggleModuleSelection(SALAO, ['CRM-0', 'CRM-1'], 'CRM-0')).toEqual(['CRM-0', 'CRM-1']);
    expect(toggleModuleSelection(SALAO, ['CRM-1', 'CRM-0'], 'CRM-3')).toEqual(['CRM-0', 'CRM-1', 'CRM-3']);
  });
});
