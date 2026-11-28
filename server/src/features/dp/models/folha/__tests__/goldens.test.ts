/**
 * BE-INCR-DP-F2 itens 46 e 47 (PR-4) — goldens do motor: cada arquivo de `__goldens__/` traz as entradas mínimas, a
 * conta escrita à mão e os esperados por rubrica, base e total em centavos (A7), com `conferidoPor: null` e `dataRef`
 * literal (A8). O teste prova regressão, não folha: até o contador conferir (BRIEF §5), `conferidoPor` fica nulo.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { calcularFolha, type ResultadoVinculo } from '../motor';
import { provaIncoerente } from '../calcNode';
import { snapshotDe, type EntradasCenario } from './cenarios';

interface Esperado {
  linhas: Record<string, string>;
  bases: { cp: string; irrf: string; fgts: string };
  totais: { proventos: string; descontos: string; liquido: string };
  pendencias: string[];
}
interface Golden {
  cenario: string;
  dataRef: string;
  conferidoPor: string | null;
  fonte: string;
  entradas: EntradasCenario;
  conta: string[];
  esperado: Record<string, Esperado>;
}

const DIR = join(__dirname, '..', '__goldens__');
const GOLDENS: Array<[string, Golden]> = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => [f, JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Golden]);

const comoEsperado = (r: ResultadoVinculo): Esperado => ({
  linhas: Object.fromEntries(r.linhas.map((l) => [l.rubrica, l.valorCents.toString()])),
  bases: { cp: r.bases.cp.toString(), irrf: r.bases.irrf.toString(), fgts: r.bases.fgts.toString() },
  totais: { proventos: r.totais.proventos.toString(), descontos: r.totais.descontos.toString(), liquido: r.totais.liquido.toString() },
  pendencias: r.pendencias.filter((p) => p.bloqueante).map((p) => p.codigo),
});

describe('DP-F2 item 46 — goldens do motor (conta à mão, conferência do contador pendente)', () => {
  it('o catálogo tem os cenários do item 46 e o de troca de regra do item 47, todos sem conferência e com dataRef literal', () => {
    expect(GOLDENS.length).toBeGreaterThanOrEqual(15);
    for (const [f, g] of GOLDENS) {
      expect([f, g.conferidoPor, /^\d{4}-\d{2}-\d{2}$/.test(g.dataRef), g.conta.length > 0]).toEqual([f, null, true, true]);
    }
  });

  it.each(GOLDENS)('%s', (_f, g) => {
    const r = calcularFolha(snapshotDe(g.entradas));
    const obtido = Object.fromEntries(r.resultados.map((x) => [x.vinculoId, comoEsperado(x)]));
    expect(obtido).toEqual(g.esperado);
    for (const x of r.resultados) expect([x.vinculoId, provaIncoerente(x.prova)]).toEqual([x.vinculoId, []]);
  });

  it('item 47 — a mesma entrada com outra fotografia de regras muda o resultado sem mudar código', () => {
    const real = GOLDENS.find(([f]) => f.startsWith('g12a'))![1];
    const alt = GOLDENS.find(([f]) => f.startsWith('g12b'))![1];
    expect(alt.entradas.vinculos).toEqual(real.entradas.vinculos);
    const a = calcularFolha(snapshotDe(real.entradas));
    const b = calcularFolha(snapshotDe(alt.entradas));
    expect(a.resultadoSha256).not.toBe(b.resultadoSha256);
    expect(b.resultados.find((x) => x.vinculoId === 't40')!.linhas.find((l) => l.rubrica === 'HORA_EXTRA_50')!.valorCents).toBe(24000n);
  });
});
