import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

(globalThis as unknown as { React: typeof React }).React = React;
const i18nStable = { t: (_k: string, d?: string) => d ?? _k };
vi.mock('next-i18next', () => ({ useTranslation: () => i18nStable }));

import { SkipLink } from '../SkipLink';
import { GradientHeader } from '../../../features/crm/components/ui/GradientHeader';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', '..', p), 'utf8');

// L-20261113-152232-3eab
describe('landmarks e cabeçalhos', () => {
  it('SkipLink aponta para #main-content', () => {
    render(<SkipLink />);
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
  });
  it('GradientHeader as="h2" não cria um segundo h1 (modais 360)', () => {
    render(<GradientHeader title="Ana" as="h2" />);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Ana' })).toBeInTheDocument();
  });
  it('GradientHeader mantém h1 por padrão', () => {
    render(<GradientHeader title="Ana" />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  it.each([
    'pages/index.tsx', 'pages/dashboard/index.tsx', 'pages/dashboard/setup.tsx',
    'features/dashboard/category-views/shared/GenericTabbedView.tsx',
  ])('%s não aninha <main> dentro do <main> do _app', (f) => {
    expect(read(f)).not.toMatch(/<main[\s>]/);
  });
  it('_app: <main id="main-content">, SkipLink e padding igual à Navbar (64 px)', () => {
    const app = read('pages/_app.tsx');
    expect(app).toContain('id="main-content"');
    expect(app).toContain('<SkipLink');
    expect(app).not.toContain('pt-[60px]');
  });
  it('Lead360Modal e Opp360Modal usam GradientHeader as="h2"', () => {
    expect(read('features/crm/components/Lead360Modal.tsx')).toContain('as="h2"');
    expect(read('features/crm/components/Opp360Modal.tsx')).toContain('as="h2"');
  });
});
