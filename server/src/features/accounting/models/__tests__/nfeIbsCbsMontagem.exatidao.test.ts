import { NfeIbsCbsSchema } from '../../dtos/NfeIbsCbsDto';
import { montarIbsCbsItem, totaisIbsCbs, type AliquotasIbsCbs } from '../nfeIbsCbsMontagem';
import type { CClassTribIbsCbs, CstIbsCbs } from '../ibsCbsTabelas';

/**
 * Onda 2.3 (auditoria de 24/11/2026) — a montagem do IBS/CBS escala texto decimal (alíquota 4 casas, valor 2 casas) para
 * inteiro. Aqui a saída de `montarIbsCbsItem`/`totaisIbsCbs` é comparada com um ORÁCULO em BigInt sobre o domínio inteiro da
 * tabela de cClassTrib (pRed ∈ {0,30,40,50,60,70,80,100}) × alíquotas × vBC (incluindo fronteiras de meio centavo).
 * Regra de parada da onda: diferença NO domínio da tabela ⇒ é arredondamento legal, não refatoração (registrar e parar).
 */

/** Meio-para-cima de n/d (n ≥ 0), em BigInt — a regra que a montagem documenta ("meio-para-cima, 4 casas"). */
const meioParaCima = (n: bigint, d: bigint): bigint => (2n * n + d) / (2n * d);
/** "0.1000" → 1000n (4 casas exatas por texto, sem passar por float). */
const bp4 = (s: string): bigint => {
  const [i, f = ''] = s.split('.');
  return BigInt(i) * 10_000n + BigInt(f.padEnd(4, '0').slice(0, 4));
};
const reais = (c: bigint): string => `${c / 100n}.${String(c % 100n).padStart(2, '0')}`;
/** "12.34" → 1234n (texto de 2 casas, sem float). */
const centavosDe = (s: string): bigint => BigInt(s.replace('.', ''));
const aliqEfetOraculo = (p: string, pRed: number): string => {
  const e = meioParaCima(bp4(p) * (1_000_000n - BigInt(Math.round(pRed * 10_000))), 1_000_000n);
  return `${e / 10_000n}.${String(e % 10_000n).padStart(4, '0')}`;
};
const valorOraculo = (vBC: bigint, p: string): bigint => meioParaCima(vBC * bp4(p), 1_000_000n);

const CST = (ind_gRed: 0 | 1): CstIbsCbs => ({ cst: ind_gRed ? '200' : '000', ind_gIBSCBS: 1, ind_gRed } as unknown as CstIbsCbs);
const CC = (pRed: number): CClassTribIbsCbs => ({ cClassTrib: '000001', pRedIBS: pRed, pRedCBS: pRed } as unknown as CClassTribIbsCbs);

const P_RED = [0, 30, 40, 50, 60, 70, 80, 100];
// 2026 (UF 0,1%; Mun 0%; CBS 0,9%), 2027/28 (UF 0,05%; Mun 0,05%) e alíquotas quebradas para apertar o arredondamento.
const ALIQUOTAS: AliquotasIbsCbs[] = [
  { pIBSUF: '0.1000', pIBSMun: '0.0000', pCBS: '0.9000' },
  { pIBSUF: '0.0500', pIBSMun: '0.0500', pCBS: '8.8000' },
  { pIBSUF: '0.0125', pIBSMun: '0.0375', pCBS: '0.8765' },
  { pIBSUF: '17.5000', pIBSMun: '0.0001', pCBS: '8.8000' },
];
// vBC: 0..1500 inteiro + múltiplos redondos + fronteiras de meio centavo (vBC × alíquota terminando em ,5) + valores altos.
const VBCS: number[] = [
  ...Array.from({ length: 1501 }, (_, i) => i),
  ...[9_999, 10_000, 99_999, 100_000, 123_456, 999_999, 1_000_000, 12_345_678, 2_147_483_647],
  ...[1, 3, 5, 7, 9, 11, 13, 15, 17, 19].map((k) => k * 10_000 + 5_000),
];

describe('montarIbsCbsItem — exato sobre o domínio da tabela (oráculo BigInt)', () => {
  it('nenhuma diferença: pRed da tabela × alíquotas × vBC (gRed e sem gRed)', () => {
    const difs: string[] = [];
    for (const ind of [0, 1] as const) {
      for (const pRed of ind ? P_RED : [0]) {
        for (const aliq of ALIQUOTAS) {
          for (const vBC of VBCS) {
            const g = montarIbsCbsItem({ cst: CST(ind), cClassTrib: CC(pRed) }, vBC, aliq).gIBSCBS!;
            const pEf = (p: string) => (ind ? aliqEfetOraculo(p, pRed) : p);
            const esperado = {
              uf: reais(valorOraculo(BigInt(vBC), pEf(aliq.pIBSUF))),
              mun: reais(valorOraculo(BigInt(vBC), pEf(aliq.pIBSMun))),
              cbs: reais(valorOraculo(BigInt(vBC), pEf(aliq.pCBS))),
            };
            const obtido = { uf: g.gIBSUF.vIBSUF, mun: g.gIBSMun.vIBSMun, cbs: g.gCBS.vCBS };
            if (ind && g.gIBSUF.gRed!.pAliqEfet !== aliqEfetOraculo(aliq.pIBSUF, pRed)) difs.push(`pAliqEfet UF ind=${ind} pRed=${pRed} p=${aliq.pIBSUF}`);
            if (JSON.stringify(esperado) !== JSON.stringify(obtido)) difs.push(`vBC=${vBC} pRed=${pRed} ind=${ind} ${aliq.pIBSUF}/${aliq.pIBSMun}/${aliq.pCBS}: ${JSON.stringify(obtido)} ≠ ${JSON.stringify(esperado)}`);
            if (g.vIBS !== reais(centavosDe(g.gIBSUF.vIBSUF) + centavosDe(g.gIBSMun.vIBSMun))) difs.push(`vIBS vBC=${vBC}`);
          }
        }
      }
    }
    expect(difs).toEqual([]);
  });

  it('o validador (NfeIbsCbsSchema) aceita o que a montagem emite, com e sem gRed (a montagem não rejeita a própria nota)', () => {
    for (const ind of [0, 1] as const) {
      for (const pRed of ind ? [30, 60, 100] : [0]) {
        for (const vBC of [1, 5_999, 100_000, 123_457]) {
          const g = montarIbsCbsItem({ cst: CST(ind), cClassTrib: CC(pRed) }, vBC, ALIQUOTAS[0]);
          expect(NfeIbsCbsSchema.safeParse({ ...g, CST: ind ? '200' : '000' }).success).toBe(true);
        }
      }
    }
  });
});

describe('totaisIbsCbs — soma exata dos textos de 2 casas', () => {
  it('Σ dos itens bate o oráculo de centavos (valores que o float do ×100 erraria: 0,29, 1,13, 4,35, 8,2…)', () => {
    const textos = ['0.29', '1.13', '4.35', '8.20', '0.57', '2.01', '19.99', '1000000.07', '0.01', '0.00'];
    const itens = textos.map((t) => ({
      CST: '000',
      cClassTrib: '000001',
      gIBSCBS: { vBC: t, gIBSUF: { pIBSUF: '0.1000', vIBSUF: t }, gIBSMun: { pIBSMun: '0.0000', vIBSMun: t }, vIBS: t, gCBS: { pCBS: '0.9000', vCBS: t } },
    })) as never;
    const soma = textos.reduce((s, t) => s + BigInt(t.replace('.', '')), 0n);
    const t = totaisIbsCbs(itens);
    expect(t.vBCIBSCBS).toBe(reais(soma));
    expect(t.gIBS?.gIBSUF.vIBSUF).toBe(reais(soma));
    expect(t.gIBS?.vIBS).toBe(reais(soma));
    expect(t.gCBS?.vCBS).toBe(reais(soma));
  });
});
