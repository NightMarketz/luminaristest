import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * L-20261113-152230-fcb2: a senha inicial (criar) e a "redefinir senha" (editar) sem autoComplete="new-password" deixam
 * o navegador preencher a senha do próprio admin no usuário criado/alterado. Guarda: todo input type=password nessas
 * duas telas declara autoComplete="new-password".
 */
const app = path.resolve(__dirname, '../..');

describe.each(['pages/users/create.tsx', 'pages/users/edit/[id].tsx'])('%s', (file) => {
  it('o campo de senha nova tem autoComplete="new-password"', () => {
    const src = fs.readFileSync(path.join(app, file), 'utf8');
    const inputs = [...src.matchAll(/<input[^>]*?type="password"[^>]*?\/?>/g)].map((m) => m[0]);
    const named = inputs.filter((i) => /name="password"/.test(i));
    expect(named.length).toBeGreaterThan(0);
    for (const i of named) expect(i).toMatch(/autoComplete="new-password"/);
  });
});
