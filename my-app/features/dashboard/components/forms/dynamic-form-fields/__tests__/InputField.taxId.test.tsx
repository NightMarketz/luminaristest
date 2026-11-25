import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import InputField from '../InputField';

/**
 * Onda 3.1 (CNPJ alfanumérico, IN RFB 2.229/2024) — o campo CPF/CNPJ dos formulários dinâmicos não pode apagar as letras
 * (`\D`): o servidor já aceita `[A-Z0-9]{12}[0-9]{2}` em `format: 'cnpj'` (ValidationUtils). CPF continua só dígitos.
 */
afterEach(cleanup);

function digitar(props: { name: string; format?: 'cpf' | 'cnpj'; label?: string }, texto: string) {
  cleanup();
  const onChange = vi.fn();
  render(<InputField type="text" value="" onChange={onChange} className="" {...props} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: texto } });
  return onChange;
}

describe('InputField — CPF/CNPJ (tax id)', () => {
  it('format cnpj: mantém as letras, põe em maiúsculas e aplica a máscara com as 14 posições', () => {
    const onChange = digitar({ name: 'cnpj', format: 'cnpj' }, '12abc34501de35');
    expect(onChange).toHaveBeenLastCalledWith('cnpj', '12.ABC.345/01DE-35');
  });

  it('format cnpj com CNPJ numérico: máscara numérica de sempre', () => {
    const onChange = digitar({ name: 'cnpj', format: 'cnpj' }, '11222333000181');
    expect(onChange).toHaveBeenLastCalledWith('cnpj', '11.222.333/0001-81');
  });

  it('campo genérico (name taxId): letras nas 12 primeiras posições ⇒ CNPJ alfanumérico; só dígitos até 11 ⇒ CPF', () => {
    expect(digitar({ name: 'taxId' }, '12ABC34501DE35')).toHaveBeenLastCalledWith('taxId', '12.ABC.345/01DE-35');
    expect(digitar({ name: 'taxId' }, '52998224725')).toHaveBeenLastCalledWith('taxId', '529.982.247-25');
  });

  it('format cpf: só dígitos (letras são descartadas), CPF mascarado', () => {
    expect(digitar({ name: 'cpf', format: 'cpf' }, 'ab529.982.247-25')).toHaveBeenLastCalledWith('cpf', '529.982.247-25');
  });

  it('campo que aceita CNPJ pede teclado de texto, não numérico (letras)', () => {
    digitar({ name: 'cnpj', format: 'cnpj' }, '');
    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'text');
  });
});
