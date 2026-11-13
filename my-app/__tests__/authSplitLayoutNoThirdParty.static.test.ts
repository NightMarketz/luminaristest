import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * L-20261113-152231-8419: login e cadastro carregavam imagens do pravatar.cc a cada visita (request externo com o IP do
 * visitante, em tela pública, sem width/height). Guarda: nenhum arquivo de layout/páginas de auth cita host externo de imagem.
 */
const app = path.resolve(__dirname, '..');
const files = ['components/layout/AuthSplitLayout.tsx', 'pages/users/login.tsx', 'pages/users/register.tsx', 'pages/users/signup.tsx'];

describe('telas públicas de autenticação', () => {
  it.each(files.filter((f) => fs.existsSync(path.join(app, f))))('%s não usa imagem de terceiro', (f) => {
    const src = fs.readFileSync(path.join(app, f), 'utf8');
    expect(src).not.toMatch(/pravatar\.cc/);
    expect(src).not.toMatch(/<img[^>]+src=\{?[`'"]https?:\/\//);
  });
});
