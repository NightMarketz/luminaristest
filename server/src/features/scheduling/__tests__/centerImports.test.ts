import fs from 'fs';
import path from 'path';

/**
 * BE-INCR-ESCALA-BASE item 9 — o centro da escala não importa `paises/` (ADR-PAIS-NA-BORDA R3) e `models/` não importa
 * Prisma nem serviço. A regra R3 ainda não está no `check:arch` desta base (o ADR a prevê); até lá, este teste a cobre
 * para `features/scheduling/**`.
 */
const ROOT = path.resolve(__dirname, '..');

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : filesUnder(p);
    return e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') ? [p] : [];
  });
}

function importsOf(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  return [...src.matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
    (m) => m[1] ?? m[2] ?? m[3],
  );
}

const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');

describe('scheduling: fronteira do centro (item 9)', () => {
  const files = filesUnder(ROOT);

  it('há arquivos do centro para conferir', () => {
    expect(files.some((f) => rel(f).startsWith('models/'))).toBe(true);
  });

  it('nenhum arquivo fora de paises/ importa paises/', () => {
    const bad = files
      .filter((f) => !rel(f).startsWith('paises/'))
      .flatMap((f) => importsOf(f).filter((i) => /(^|\/)paises\//.test(i)).map((i) => `${rel(f)} → ${i}`));
    expect(bad).toEqual([]);
  });

  it('models/ não importa Prisma, repositório nem serviço', () => {
    const bad = files
      .filter((f) => rel(f).startsWith('models/'))
      .flatMap((f) => importsOf(f).filter((i) => /lib\/prisma|generated\/prisma|@prisma\/client|\/repositories\/|\/services\//.test(i)).map((i) => `${rel(f)} → ${i}`));
    expect(bad).toEqual([]);
  });
});
