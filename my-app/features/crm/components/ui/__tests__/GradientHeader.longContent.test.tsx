import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

(globalThis as unknown as { React: typeof React }).React = React;

import { GradientHeader } from '../GradientHeader';

/**
 * L-20261113-153617-95aa: nome longo era cortado na borda do card (truncate, sem title) e o e-mail longo da ficha do
 * lead invadia a coluna do telefone. jsdom não mede layout; a guarda trava as classes que resolvem: título com title
 * (valor completo acessível) e quebra por overflow-wrap:anywhere, e células da ficha com min-w-0.
 */
afterEach(() => cleanup());

describe('conteúdo longo na ficha do lead', () => {
  it('o h1 expõe o nome completo em title e não usa truncate', () => {
    const nome = 'Maria Fernanda de Albuquerque Cavalcanti Montenegro Sobrinho Neto';
    render(<GradientHeader title={nome} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAttribute('title', nome);
    expect(h1.className).not.toMatch(/\btruncate\b/);
    expect(h1.className).toMatch(/overflow-wrap:anywhere/);
  });

  it('as células de contato da ficha têm min-w-0 e quebram o valor', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../../../../pages/crm/leads/[id].tsx'), 'utf8');
    const dl = src.slice(src.indexOf('<dl className="grid'), src.indexOf('</dl>'));
    expect((dl.match(/<div className="min-w-0">/g) ?? []).length).toBe(3);
    expect(dl).toMatch(/overflow-wrap:anywhere/);
  });
});
