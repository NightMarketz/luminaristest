import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CatalogCombobox } from '../CatalogCombobox';

/**
 * CatalogCombobox (Fork F-FE-3 → a): search by código OR descrição from 2 chars (accent-insensitive),
 * keyboard ↑↓⏎, aria combobox/listbox/option, and text outside the catalog = inline error + value cleared.
 */
const options = [
  { codigo: '6', descricao: 'Provisões ou perdas estimadas não dedutíveis', tag: 'A' },
  { codigo: '7', descricao: 'Custos não dedutíveis', tag: 'A' },
  { codigo: '61', descricao: 'Compensação de prejuízos fiscais', tag: 'P' },
];

describe('CatalogCombobox', () => {
  beforeEach(() => cleanup());

  it('lists everything on focus, filters by description (accent-insensitive) from 2 chars, shows codigo · descrição · TAG', () => {
    const onChange = vi.fn();
    render(<CatalogCombobox options={options} value="" onChange={onChange} ariaLabel="Código" />);
    const input = screen.getByRole('combobox', { name: 'Código' });
    fireEvent.focus(input);
    expect(screen.getAllByRole('option')).toHaveLength(3);

    fireEvent.change(input, { target: { value: 'p' } }); // 1 char → still the whole list
    expect(screen.getAllByRole('option')).toHaveLength(3);

    fireEvent.change(input, { target: { value: 'provisoes' } });
    const opts = screen.getAllByRole('option');
    expect(opts).toHaveLength(1);
    expect(opts[0]).toHaveTextContent('6');
    expect(opts[0]).toHaveTextContent('Provisões ou perdas estimadas não dedutíveis');
    expect(opts[0]).toHaveTextContent('A');
  });

  it('filters by código too and selects with ↓ + Enter; the input mirrors the selection', () => {
    const onChange = vi.fn();
    const { rerender } = render(<CatalogCombobox options={options} value="" onChange={onChange} ariaLabel="Código" />);
    const input = screen.getByRole('combobox', { name: 'Código' });
    fireEvent.change(input, { target: { value: '61' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', screen.getByRole('option').id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('61');

    rerender(<CatalogCombobox options={options} value="61" onChange={onChange} ariaLabel="Código" />);
    expect(input).toHaveValue('61 · Compensação de prejuízos fiscais · P');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('mouse pick calls onChange with the codigo', () => {
    const onChange = vi.fn();
    render(<CatalogCombobox options={options} value="" onChange={onChange} ariaLabel="Código" />);
    fireEvent.focus(screen.getByRole('combobox', { name: 'Código' }));
    fireEvent.mouseDown(screen.getByRole('option', { name: /Custos não dedutíveis/ }));
    expect(onChange).toHaveBeenCalledWith('7');
  });

  it('text outside the catalog: blur clears the value and shows the inline error (item 7)', () => {
    const onChange = vi.fn();
    render(<CatalogCombobox options={options} value="7" onChange={onChange} ariaLabel="Código" />);
    const input = screen.getByRole('combobox', { name: 'Código' });
    fireEvent.change(input, { target: { value: '999' } });
    expect(screen.getByText('Nenhuma linha do catálogo corresponde.')).toBeInTheDocument();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.getByRole('alert')).toHaveTextContent('Código fora do catálogo');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('an exact código typed then blurred selects it without opening the list', () => {
    const onChange = vi.fn();
    render(<CatalogCombobox options={options} value="" onChange={onChange} ariaLabel="Código" />);
    const input = screen.getByRole('combobox', { name: 'Código' });
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('7');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

/** Controlled parent — propagates `onChange` back into `value`, the way the modals do. */
function Controlled({ initial }: { initial: string }) {
  const [value, setValue] = React.useState(initial);
  // `.map` on every render: the same fresh-identity `options` the modals pass.
  return <CatalogCombobox options={options.map((o) => ({ ...o }))} value={value} onChange={setValue} ariaLabel="Código" />;
}

describe('CatalogCombobox under a controlled parent (value round-trips)', () => {
  beforeEach(() => cleanup());

  it('item 7 with a prior selection: text outside the catalog keeps the typed text + inline error after the parent clears the value', () => {
    render(<Controlled initial="7" />);
    const input = screen.getByRole('combobox', { name: 'Código' });
    expect(input).toHaveValue('7 · Custos não dedutíveis · A');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('999'); // NOT blanked by the mirror effect
    expect(screen.getByRole('alert')).toHaveTextContent('Código fora do catálogo');
    // a later valid pick recovers normally
    fireEvent.change(input, { target: { value: '61' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('61 · Compensação de prejuízos fiscais · P');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('value outside the options (edit while the catalog loads): garbage + blur, then an external valid set is NOT swallowed', () => {
    function Harness() {
      const [value, setValue] = React.useState('999');
      return (
        <>
          <CatalogCombobox options={options} value={value} onChange={setValue} ariaLabel="Código" />
          <button type="button" onClick={() => setValue('61')}>set61</button>
        </>
      );
    }
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Código' });
    fireEvent.change(input, { target: { value: 'zzz' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByText('set61'));
    expect(input).toHaveValue('61 · Compensação de prejuízos fiscais · P');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('first ↓ on a closed list opens it on option 0; Enter picks option 0', () => {
    render(<Controlled initial="" />);
    const input = screen.getByRole('combobox', { name: 'Código' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('id', input.getAttribute('aria-activedescendant')!);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('6 · Provisões ou perdas estimadas não dedutíveis · A');
  });
});
