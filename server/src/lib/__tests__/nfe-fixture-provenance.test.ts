import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Trava de merge do F0-3 (BE-INCR-NFE). Enquanto qualquer fixture de NF-e carregar o marcador
 * SYNTHETIC-FIXTURE-NOT-REAL, este teste FALHA — e como `Server – typecheck & test` é check
 * obrigatório na branch protection do main, o merge fica travado. Trocar o fixture sintético pela
 * NF-e 4.00 real anonimizada (e remover o marcador) faz o teste passar. Ver fixtures/nfe/README.md.
 *
 * ponytail: o teste é a trava — sem workflow/label extra. Some sozinho quando a nota real chega.
 */
const FIXTURE_DIR = join(__dirname, 'fixtures', 'nfe');
const SENTINEL = 'SYNTHETIC-FIXTURE-NOT-REAL';

const xmlFiles = () =>
  readdirSync(FIXTURE_DIR).filter((f) => f.toLowerCase().endsWith('.xml'));

describe('NF-e fixture provenance (F0-3 merge gate)', () => {
  it('tem ao menos um fixture de compra e um de venda', () => {
    const files = xmlFiles().map((f) => f.toLowerCase());
    expect(files.some((f) => f.includes('purchase') || f.includes('compra'))).toBe(true);
    expect(files.some((f) => f.includes('sale') || f.includes('venda'))).toBe(true);
  });

  // F-I8 (cédula 2026-09-03): trava REBAIXADA a dívida declarada — Bloco A item E9. Reverter para `it()` no
  // mesmo PR que trocar *.SYNTHETIC.xml pela NF-e 4.00 real anonimizada. O sentinel continua nos fixtures.
  it.todo('nenhum fixture é sintético (troque pela NF-e real p/ destravar o merge) — F-I8 / Bloco A E9');
});
