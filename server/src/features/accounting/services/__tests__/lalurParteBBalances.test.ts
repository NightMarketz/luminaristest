/**
 * Aritmética pura do M500 (BRIEF 3C item 7; ADR EMENDA 2026-09-12 (3ª) D-P3.1/D-P3.2). Tabela de 4
 * trimestres com adição, exclusão, compensação e transferência entre contas fecha em `sdFim`; a
 * propriedade Σ_contas(vlB com contrapartida) = 0 por período; sha256 independe da ordem de leitura.
 */
import { balancesSha256, chainYear, computeQuarter, parteASign, parteBSign, signed, toMagnitude } from '../lalurParteBBalances';

const PF = 'pf'; // conta de prejuízo (D-natured)
const PROV = 'prov'; // provisão indedutível (adição agora, exclusão depois)
const DEP = 'dep'; // depreciação acelerada (exclusão agora, adição depois — saldo C legítimo)
const IDS = [PF, PROV, DEP];

describe('convenção de sinal (D=+, C=−)', () => {
  it('signed/toMagnitude são inversas; zero sai C (INFERIDO — D-P3.1)', () => {
    expect(signed(100n, 'D')).toBe(100n);
    expect(signed(100n, 'C')).toBe(-100n);
    expect(toMagnitude(250n)).toEqual({ cents: 250n, ind: 'D' });
    expect(toMagnitude(-250n)).toEqual({ cents: 250n, ind: 'C' });
    expect(toMagnitude(0n)).toEqual({ cents: 0n, ind: 'C' });
  });
  it('REGRA_PEA (p.250): A/L debitam (+), E/P creditam (−); M410: DB/PF/BC (+), CR (−)', () => {
    expect([parteASign('A'), parteASign('L'), parteASign('E'), parteASign('P')]).toEqual([1n, 1n, -1n, -1n]);
    expect([parteBSign('DB'), parteBSign('PF'), parteBSign('BC'), parteBSign('CR')]).toEqual([1n, 1n, 1n, -1n]);
  });
});

describe('computeQuarter — um período', () => {
  it('adição debita, exclusão credita, compensação credita a conta de prejuízo; transferência espelha na contrapartida (Σ=0)', () => {
    const sdIni = new Map([[PF, 500_000n], [PROV, 0n], [DEP, 0n]]);
    const q = computeQuarter(
      IDS,
      sdIni,
      [
        { parteBId: PROV, tipoLanc: 'A', valorCents: 120_000n }, // provisão adicionada → D
        { parteBId: DEP, tipoLanc: 'E', valorCents: 30_000n }, // exclusão → C
        { parteBId: PF, tipoLanc: 'P', valorCents: 200_000n }, // compensa 2.000 do prejuízo
      ],
      [
        { parteBId: PROV, contrapartidaId: DEP, indicador: 'DB', valorCents: 10_000n }, // transfere 100 de DEP para PROV
        { parteBId: PF, contrapartidaId: null, indicador: 'PF', valorCents: 50_000n }, // prejuízo do período (sistema)
      ],
    );
    expect(q.get(PF)).toEqual({ parteBId: PF, sdIni: 500_000n, vlA: -200_000n, vlB: 50_000n, sdFim: 350_000n });
    expect(q.get(PROV)).toEqual({ parteBId: PROV, sdIni: 0n, vlA: 120_000n, vlB: 10_000n, sdFim: 130_000n });
    expect(q.get(DEP)).toEqual({ parteBId: DEP, sdIni: 0n, vlA: -30_000n, vlB: -10_000n, sdFim: -40_000n });
    // propriedade: movimentos COM contrapartida somam zero entre as contas
    const comCtp = q.get(PROV)!.vlB + q.get(DEP)!.vlB; // só a transferência toca as duas
    expect(comCtp).toBe(0n);
  });
  it('PF/BC nunca espelha (sem contrapartida por regra); conta fora do conjunto é ignorada', () => {
    const q = computeQuarter([PF], new Map(), [], [{ parteBId: PF, contrapartidaId: PROV, indicador: 'PF', valorCents: 1n }, { parteBId: 'ghost', contrapartidaId: null, indicador: 'DB', valorCents: 9n }]);
    expect(q.get(PF)!.vlB).toBe(1n);
    expect(q.has('ghost')).toBe(false);
  });
});

describe('chainYear — 4 trimestres (p.271: saldo final transportado para o inicial do seguinte)', () => {
  it('tabela: abertura 5.000 D; T01 compensa 2.000; T02 PF 1.000; T03 transferência; T04 compensa tudo → sdFim T04 = 0', () => {
    const opening = new Map([[PF, 500_000n], [PROV, 0n], [DEP, 0n]]);
    const out = chainYear(IDS, opening, [
      { quarter: 'T01', movesA: [{ parteBId: PF, tipoLanc: 'P', valorCents: 200_000n }], movesB: [] },
      { quarter: 'T02', movesA: [], movesB: [{ parteBId: PF, contrapartidaId: null, indicador: 'PF', valorCents: 100_000n }] },
      { quarter: 'T03', movesA: [{ parteBId: PROV, tipoLanc: 'A', valorCents: 70_000n }], movesB: [{ parteBId: PROV, contrapartidaId: DEP, indicador: 'CR', valorCents: 20_000n }] },
      { quarter: 'T04', movesA: [{ parteBId: PF, tipoLanc: 'P', valorCents: 400_000n }, { parteBId: PROV, tipoLanc: 'E', valorCents: 50_000n }], movesB: [] },
    ]);
    const pf = ['T01', 'T02', 'T03', 'T04'].map((q) => out.get(q as 'T01')!.get(PF)!);
    expect(pf.map((b) => [b.sdIni, b.sdFim])).toEqual([[500_000n, 300_000n], [300_000n, 400_000n], [400_000n, 400_000n], [400_000n, 0n]]);
    const prov = out.get('T04')!.get(PROV)!;
    expect(prov).toEqual({ parteBId: PROV, sdIni: 50_000n, vlA: -50_000n, vlB: 0n, sdFim: 0n }); // T03: +70.000 A, −20.000 CR = 50.000
    expect(out.get('T03')!.get(DEP)!.vlB).toBe(20_000n); // espelho da CR de PROV
  });
  it('exercício parcialmente fechado: para no primeiro trimestre ausente (T03 sem T02 ⇒ só T01)', () => {
    const out = chainYear([PF], new Map([[PF, 1n]]), [
      { quarter: 'T01', movesA: [], movesB: [] },
      { quarter: 'T03', movesA: [], movesB: [] },
    ]);
    expect([...out.keys()]).toEqual(['T01']);
  });
});

describe('balancesSha256', () => {
  const rows = [
    { codCtaB: 'B', codTributo: 'I', b: { parteBId: 'b', sdIni: 1n, vlA: 2n, vlB: 3n, sdFim: 6n } },
    { codCtaB: 'A', codTributo: 'C', b: { parteBId: 'a', sdIni: 0n, vlA: 0n, vlB: 0n, sdFim: 0n } },
  ];
  it('independe da ordem de entrada e muda com qualquer valor', () => {
    const h1 = balancesSha256(rows);
    const h2 = balancesSha256([rows[1], rows[0]]);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(balancesSha256([rows[0], { ...rows[1], b: { ...rows[1].b, sdFim: 1n } }])).not.toBe(h1);
  });
});
