/**
 * atomicUntil boundary test — Contrato `[AC-2.3-2]` (ADR-DOMAIN-MOTOR-rejected §2.1/§2.4, PASSO-13).
 *
 * População calculada aqui, sem registro a manter: todo `.ts` de `features/<x>/services` e de
 * `features/<x>/paises/<cc>/services` (G3 do ADR-PAIS-NA-BORDA §3, 25/11: serviço movido para a borda
 * não sai do gate) (fora de `__tests__`) que chama `.postEntry(`, exceto o próprio `PostingService` (que É o commit 1). Cada
 * um declara a fronteira de atomicidade no PRIMEIRO JSDoc do arquivo, com as 5 linhas fixas.
 */
import fs from 'node:fs';
import path from 'node:path';

const FEATURES = path.resolve(__dirname, '../..');
const MARKERS = ['atomicUntil:', 'commit 1 — razão', 'commit 2 —', 'reconcile —', 'fora da tx —'];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

/** `services/` do domínio e de cada `paises/<cc>/services/` dele. */
function serviceDirs(dominio: string): string[] {
  const base = path.join(FEATURES, dominio);
  const paises = path.join(base, 'paises');
  const daBorda = fs.existsSync(paises)
    ? fs
        .readdirSync(paises, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => path.join(paises, e.name, 'services'))
    : [];
  return [path.join(base, 'services'), ...daBorda].filter((d) => fs.existsSync(d));
}

const population = fs
  .readdirSync(FEATURES, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => serviceDirs(d.name))
  .flatMap((dir) => walk(dir))
  .filter((f) => path.basename(f) !== 'PostingService.ts')
  .filter((f) => /\.postEntry\(/.test(fs.readFileSync(f, 'utf8')));

describe('atomicUntil boundary [AC-2.3-2]', () => {
  it('a população não é vazia (o predicado mecânico ainda acha os chamadores)', () => {
    expect(population.length).toBeGreaterThan(0);
  });

  it('todo chamador de .postEntry( fora do PostingService abre o arquivo com o cabeçalho atomicUntil', () => {
    const offenders = population
      .map((f) => {
        const firstJsDoc = /\/\*\*[\s\S]*?\*\//.exec(fs.readFileSync(f, 'utf8'))?.[0] ?? '';
        const missing = MARKERS.filter((m) => !firstJsDoc.includes(m));
        return missing.length ? `${path.relative(FEATURES, f)} — falta: ${missing.join(', ')}` : null;
      })
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });
});
