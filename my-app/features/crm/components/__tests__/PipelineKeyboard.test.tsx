import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const i18nStable = { t: (_k: string, d?: string) => d ?? _k };
vi.mock('next-i18next', () => ({ useTranslation: () => i18nStable }));
vi.mock('../Lead360Modal', () => ({ Lead360Modal: () => null }));
vi.mock('../Opp360Modal', () => ({ Opp360Modal: () => null }));
vi.mock('../ProposalCaptureModal', () => ({ ProposalCaptureModal: () => null }));
vi.mock('../MeetingCaptureModal', () => ({ MeetingCaptureModal: () => null }));
vi.mock('../../../dashboard/components/shared/FloatingActionButton', () => ({ default: () => null }));

import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { usePipelineSensors } from '../../hooks/usePipelineSensors';
import { SortableLeadCard } from '../CrmPipelineBoard';
import { SortableOpportunityCard } from '../OppPipelineBoard';

function Harness({ children, ids }: { children: React.ReactNode; ids: string[] }) {
  const sensors = usePipelineSensors();
  return (
    <DndContext sensors={sensors}>
      <SortableContext items={ids}>{children}</SortableContext>
    </DndContext>
  );
}

// L-20261113-152229-8654: o card tinha role=button+tabIndex no wrapper do dnd-kit em volta de outro <button>
// (duas paradas de Tab) e não havia KeyboardSensor: pelo teclado não dava para pegar o card.
describe('Pipeline — teclado', () => {
  it('lead: uma só parada de Tab por card e Espaço pega o card pelo próprio botão', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Harness ids={['l1']}>
        <SortableLeadCard lead={{ id: 'l1', data: { leadName: 'Ana' } } as never} onClick={onClick} />
      </Harness>,
    );
    const tabbables = container.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
    expect(tabbables).toHaveLength(1);
    const btn = screen.getByRole('button', { name: /Ana/ });
    btn.focus();
    fireEvent.keyDown(btn, { code: 'Space', key: ' ' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('Enter continua abrindo o card (não inicia arrasto)', () => {
    const onClick = vi.fn();
    render(
      <Harness ids={['l1']}>
        <SortableLeadCard lead={{ id: 'l1', data: { leadName: 'Ana' } } as never} onClick={onClick} />
      </Harness>,
    );
    const btn = screen.getByRole('button', { name: /Ana/ });
    fireEvent.keyDown(btn, { code: 'Enter', key: 'Enter' });
    expect(btn.getAttribute('aria-pressed')).not.toBe('true');
  });

  it('oportunidade: uma só parada de Tab por card', () => {
    const { container } = render(
      <Harness ids={['o1']}>
        <SortableOpportunityCard opportunity={{ id: 'o1', data: { name: 'Neg' } } as never} ownerNames={new Map()} onClick={() => {}} />
      </Harness>,
    );
    expect(container.querySelectorAll('button, [tabindex]:not([tabindex="-1"])')).toHaveLength(1);
  });
});
