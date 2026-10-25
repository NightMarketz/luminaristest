import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Teste-guarda — achado fora de escopo do #884 (FIX-FE-DASHBOARD, 24/10): ao sair o botão "Contact support" do setup e
 * o aviso de dependência do Controle Total, três chaves de `common.json` en/pt ficaram sem nenhum leitor no código.
 * Dono, chat, 2026-10-24: "Aborda as questões fora do escopo".
 * Esperado: chave desta lista que nenhum arquivo do app cita não existe nos locales.
 */
const APP = path.resolve(__dirname, '../../..');
const KEYS = ['onboardingNeedHelp', 'onboardingContactSupport', 'onboardingTotalControlConfirmDeselect'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('common.json sem chave órfã do setup', () => {
  it('chave sem leitor no código não está em locales/{en,pt}/common.json', () => {
    const src = ['pages', 'features', 'lib', 'components'].flatMap((d) => walk(path.join(APP, d))).map((f) => readFileSync(f, 'utf8')).join('\n');
    const orfas = ['en', 'pt'].flatMap((lng) => {
      const json = JSON.parse(readFileSync(path.join(APP, `public/locales/${lng}/common.json`), 'utf8')) as Record<string, unknown>;
      return KEYS.filter((k) => !src.includes(k) && k in json).map((k) => `${lng}:${k}`);
    });
    expect(orfas).toEqual([]);
  });
});
