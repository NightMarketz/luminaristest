import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QualifAssinanteSelect } from '../QualifAssinanteSelect';

/** FE-INCR-SPED-SIGNERS item 2: renderiza as opções recebidas ("código — descrição") e emite SÓ o código; sem texto livre. */
const options = [
  { code: '205', description: 'Administrador' },
  { code: '900', description: 'Contador/Contabilista' },
];

describe('QualifAssinanteSelect', () => {
  beforeEach(() => cleanup());

  it('lista as opções recebidas e emite só o código escolhido', () => {
    const onChange = vi.fn();
    render(<QualifAssinanteSelect layout="ECD" options={options} value="" onChange={onChange} placeholder="Cód. (900=contador)" />);
    const input = screen.getByPlaceholderText('Cód. (900=contador)');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'conta' } });
    const opt = screen.getByRole('option', { name: /900.*Contador\/Contabilista/ });
    fireEvent.mouseDown(opt);
    fireEvent.click(opt);
    expect(onChange).toHaveBeenLastCalledWith('900');
  });

  it('texto fora da tabela não vira valor (sem texto livre)', () => {
    const onChange = vi.fn();
    render(<QualifAssinanteSelect layout="ECF" options={options} value="205" onChange={onChange} placeholder="Qualif. (900=contador)" />);
    const input = screen.getByPlaceholderText('Qualif. (900=contador)');
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(onChange).not.toHaveBeenCalledWith('123');
  });
});
