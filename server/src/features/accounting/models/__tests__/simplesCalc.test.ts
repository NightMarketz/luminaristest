/**
 * BE-INCR-SIMPLES-NACIONAL PR-1 (nó X14, BRIEF itens 4–9) — cálculo puro contra as linhas REAIS da semente (o mesmo
 * arquivo que a migração carrega). Os valores esperados são aritmética sobre a lei, não oráculo: o oráculo é o DAS do
 * portal (gate humano X14-DAS).
 */
import { SIMPLES_SEED_FILES, legalParamsSeedRows } from '@test/helpers/legalParams';
import { AtividadeSemAnexoError, SimplesRegraNaoRegulamentadaError } from '../../../../lib/errors';
import { SEGREGACAO_EXCLUI, apurar, apurarSimei, janelaRbt12, rbt12, type ApuracaoInput, type MesReceita } from '../simplesCalc';

const LINHAS = legalParamsSeedRows(SIMPLES_SEED_FILES);

const somaMeses = (comp: string, d: number) => {
  const [a, m] = comp.split('-').map(Number);
  const t = a * 12 + m - 1 + d;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
/** 13 meses antes do PA com a mesma receita (cobre as duas janelas). */
const historico = (comp: string, receitaMesCents: number, folhaMesCents: number | null = null): MesReceita[] =>
  Array.from({ length: 13 }, (_, k) => ({ competencia: somaMeses(comp, -(k + 1)), receitaBrutaCents: receitaMesCents, folhaCents: folhaMesCents }));

const base = (comp: string, over: Partial<ApuracaoInput> = {}): ApuracaoInput => ({
  competencia: comp,
  historico: historico(comp, 5_000_000), // R$ 50.000/mês → RBT12 R$ 600.000
  inicioAtividade: null,
  receitaPaCents: 0,
  folhaPaCents: 0,
  sublimiteExcedido: false,
  atividades: [],
  ...over,
});
const servico = (cents: number, excluir: string[] = []) => ({ natureza: 'SERVICO' as const, cTribNac: '060101', parcelas: [{ receitaCents: cents, excluir: excluir as never }] });
const revenda = (parcelas: Array<{ receitaCents: number; excluir: readonly string[] }>) => ({ natureza: 'REVENDA' as const, cTribNac: null, parcelas: parcelas as never });

describe('item 9 — exemplo numérico do PRE-ADR §7 (RBT12 R$ 600.000)', () => {
  it('2026: serviço R$ 50.000 no Anexo III, 3ª faixa → 10,56% = R$ 5.280,00, repartido por tributo', () => {
    const r = apurar(base('2026-06', { atividades: [servico(5_000_000)] }), LINHAS);
    expect(r.rbt12Cents).toBe(60_000_000);
    const a = r.atividades[0];
    expect([a.anexo, a.faixa, a.aliquotaNominal, a.parcelaDeduzirCents, a.aliquotaEfetiva]).toEqual(['III', 3, '13.50', 1_764_000, '10.5600']);
    expect(a.tributos).toEqual({ IRPJ: 21_120, CSLL: 18_480, COFINS: 72_019, PIS: 15_629, CPP: 229_152, ISS: 171_600 });
    expect(r.totalCalculadoCents).toBe(528_000);
  });

  it('2027: CBS + IBS substituem COFINS + PIS (876,48 nos dois casos); o total não muda', () => {
    const a = apurar(base('2027-06', { atividades: [servico(5_000_000)] }), LINHAS).atividades[0];
    expect(a.tributos).toEqual({ IRPJ: 21_120, CSLL: 18_480, CBS: 86_645, IBS: 1_003, CPP: 229_152, ISS: 171_600 });
    expect(86_645 + 1_003).toBe(72_019 + 15_629);
  });

  it('revenda R$ 5.000 (Anexo I, 7,19%): R$ 359,50 sem segregar; R$ 303,78 com monofásico em 2026; R$ 359,50 em 2027', () => {
    const sem = apurar(base('2026-06', { atividades: [revenda([{ receitaCents: 500_000, excluir: [] }])] }), LINHAS);
    expect([sem.atividades[0].aliquotaEfetiva, sem.totalCalculadoCents]).toEqual(['7.1900', 35_950]);
    const mono = apurar(base('2026-06', { atividades: [revenda([{ receitaCents: 500_000, excluir: SEGREGACAO_EXCLUI.monofasico }])] }), LINHAS);
    expect(mono.totalCalculadoCents).toBe(30_378);
    expect(mono.atividades[0].tributos.PIS).toBeUndefined();
    expect(mono.atividades[0].tributos.COFINS).toBeUndefined();
    const em2027 = apurar(base('2027-06', { atividades: [revenda([{ receitaCents: 500_000, excluir: SEGREGACAO_EXCLUI.monofasico }])] }), LINHAS);
    expect(em2027.totalCalculadoCents).toBe(35_950);
  });

  it('§ 1º-B II: o centavo do arredondamento vai para o tributo de maior percentual (CPP), não some', () => {
    // Por tributo isolado: 19,77 + 12,58 + 45,80 + 9,92 + 150,99 + 120,43 = 359,49 ≠ 359,50.
    const t = apurar(base('2026-06', { atividades: [revenda([{ receitaCents: 500_000, excluir: [] }])] }), LINHAS).atividades[0].tributos;
    expect(t).toEqual({ IRPJ: 1_977, CSLL: 1_258, COFINS: 4_580, PIS: 992, CPP: 15_100, ICMS: 12_043 });
  });
});

describe('item 5 — RBT12', () => {
  it('janela: até 2026, os 12 meses anteriores ao PA; a partir de 2027, os 12 antecedentes ao mês anterior', () => {
    expect(janelaRbt12('2026-12')).toEqual({ de: '2025-12', ate: '2026-11', regra: 'LC123-art18-§1' });
    expect(janelaRbt12('2027-01')).toEqual({ de: '2025-12', ate: '2026-11', regra: 'LC214-art517' });
    expect(janelaRbt12('2027-03')).toEqual({ de: '2026-02', ate: '2027-01', regra: 'LC214-art517' });
  });

  it('o mês fora da janela não entra (2027: o mês anterior ao PA fica de fora)', () => {
    const h = historico('2027-03', 100_000);
    h.find((m) => m.competencia === '2027-02')!.receitaBrutaCents = 99_999_999;
    expect(rbt12(h, '2027-03', null, 0).cents).toBe(1_200_000);
  });

  it('meses ausentes são listados (o alerta RBT12_INCOMPLETO é do PR-2)', () => {
    const h = historico('2026-06', 100_000).filter((m) => m.competencia !== '2026-01');
    expect(rbt12(h, '2026-06', null, 0).mesesFaltantes).toEqual(['2026-01']);
  });

  it('início de atividade: 1º mês = receita do PA × 12; depois, média dos meses anteriores × 12 (Res. 140 art. 22 §§ 2º–3º)', () => {
    expect(rbt12([], '2026-03', '2026-03', 400_000)).toMatchObject({ cents: 4_800_000, metodo: 'INICIO_PRIMEIRO_MES' });
    const h = [{ competencia: '2026-03', receitaBrutaCents: 100_000 }, { competencia: '2026-04', receitaBrutaCents: 200_001 }];
    expect(rbt12(h, '2026-05', '2026-03', 0)).toMatchObject({ cents: 1_800_006, metodo: 'INICIO_MEDIA' });
  });

  it('início de atividade a partir de 2027: regra não regulamentada → recusa (não inventa)', () => {
    expect(() => rbt12([], '2027-03', '2027-02', 400_000)).toThrow(SimplesRegraNaoRegulamentadaError);
  });

  it('RBT12 zero conta como R$ 1,00 só para a alíquota (Res. 140 art. 21 p.ú.) — 1ª faixa, alíquota efetiva = nominal', () => {
    const r = apurar(base('2026-06', { historico: historico('2026-06', 0), atividades: [servico(100_000)] }), LINHAS);
    expect([r.rbt12Cents, r.atividades[0].faixa, r.atividades[0].aliquotaEfetiva]).toEqual([0, 1, '6.0000']);
  });
});

describe('item 4 — enquadramento', () => {
  it('serviço de beleza 060201 → Anexo III sem fator R; locação de bem móvel → III sem ISS', () => {
    const r = apurar(base('2026-06', { atividades: [{ natureza: 'SERVICO', cTribNac: '060201', parcelas: [{ receitaCents: 100_000, excluir: [] }] }, { natureza: 'LOCACAO_MOVEL', cTribNac: null, parcelas: [{ receitaCents: 100_000, excluir: [] }] }] }), LINHAS);
    expect(r.atividades.map((a) => [a.anexo, a.fatorR])).toEqual([['III', null], ['III', null]]);
    expect(r.atividades[1].tributos.ISS).toBeUndefined();
    expect(r.atividades[1].tributos.CPP).toBe(r.atividades[0].tributos.CPP);
  });

  it('atividade sem linha de enquadramento → ATIVIDADE_SEM_ANEXO (422)', () => {
    const e = (() => {
      try {
        apurar(base('2026-06', { atividades: [{ natureza: 'SERVICO', cTribNac: '010101', parcelas: [{ receitaCents: 1, excluir: [] }] }] }), LINHAS);
      } catch (x) {
        return x;
      }
      return undefined;
    })();
    expect(e).toBeInstanceOf(AtividadeSemAnexoError);
    expect(e).toMatchObject({ statusCode: 422, errorCode: 'ATIVIDADE_SEM_ANEXO' });
  });
});

describe('item 7 — fator R (Res. 140 art. 26)', () => {
  const comFatorR = LINHAS.map((l) => (l.id === 'sn1-enq-servico-060101' ? { ...l, valorJson: JSON.stringify({ anexo: 'V', fatorR: true, semIss: false }) } : l));
  it('folha/receita ≥ 0,28 → Anexo III; abaixo → Anexo V', () => {
    const iii = apurar(base('2026-06', { historico: historico('2026-06', 5_000_000, 1_400_000), atividades: [servico(100_000)] }), comFatorR).atividades[0];
    expect([iii.anexo, iii.fatorR]).toEqual(['III', '0.2800']);
    const v = apurar(base('2026-06', { historico: historico('2026-06', 5_000_000, 1_399_999), atividades: [servico(100_000)] }), comFatorR).atividades[0];
    expect([v.anexo, v.faixa]).toEqual(['V', 3]);
  });

  it('casos de zero (§ 7º): sem folha → 0,01 (Anexo V); folha sem receita → 0,28 (Anexo III)', () => {
    expect(apurar(base('2026-06', { historico: historico('2026-06', 5_000_000, 0), atividades: [servico(100_000)] }), comFatorR).atividades[0].fatorR).toBe('0.0100');
    expect(apurar(base('2026-06', { historico: historico('2026-06', 0, 100), atividades: [servico(100_000)] }), comFatorR).atividades[0].anexo).toBe('III');
  });

  it('mês de início (§ 6º): r = folha do PA / receita do PA', () => {
    const a = apurar(base('2026-06', { historico: [], inicioAtividade: '2026-06', receitaPaCents: 100_000, folhaPaCents: 30_000, atividades: [servico(100_000)] }), comFatorR).atividades[0];
    expect([a.anexo, a.fatorR]).toEqual(['III', '0.3000']);
  });
});

describe('item 6 — teto do ISS, 6ª faixa, sublimite', () => {
  it('5ª faixa do Anexo III acima de 14,92537%: ISS = 5% e o excesso vai pela tabela da nota (RBT12 R$ 3,6 mi → 17,51%)', () => {
    const a = apurar(base('2026-06', { historico: historico('2026-06', 30_000_000), atividades: [servico(10_000_000)] }), LINHAS).atividades[0];
    expect([a.faixa, a.aliquotaEfetiva]).toEqual([5, '17.5100']);
    // (17,51% − 5%) × 6,02% / 5,26% / 19,28% / 4,18% / 65,26%; total 17.510,00, resíduo de −0,01 no CPP.
    expect(a.tributos).toEqual({ ISS: 500_000, IRPJ: 75_310, CSLL: 65_803, COFINS: 241_193, PIS: 52_292, CPP: 816_402 });
  });

  it('locação de bem móvel na 5ª faixa: a parcela do ISS é deduzida, não transferida aos federais (review PR-3, achado 6)', () => {
    const r = apurar(base('2026-06', { historico: historico('2026-06', 30_000_000), atividades: [{ natureza: 'LOCACAO_MOVEL', cTribNac: null, parcelas: [{ receitaCents: 100_000, excluir: [] }] }] }), LINHAS);
    // 1.000 × 17,51% × (1 − 33,5% do ISS) = 116,44.
    expect([r.atividades[0].tributos.ISS, r.totalCalculadoCents]).toEqual([undefined, 11_644]);
  });

  it('abaixo do limiar o teto não age (3ª faixa: ISS 3,432%)', () => {
    const a = apurar(base('2026-06', { atividades: [servico(100_000)] }), LINHAS).atividades[0];
    expect(a.tributos.ISS).toBe(3_432);
  });

  it('6ª faixa sem sublimite excedido: federais pela 6ª, ICMS pela 5ª faixa (Res. 140 art. 21 III "b")', () => {
    // RBT12 R$ 4,2 mi; Anexo I 6ª: (4,2mi × 19% − 378.000)/4,2mi = 10%; 5ª: (4,2mi × 14,3% − 87.300)/4,2mi = 12,22142…%.
    const a = apurar(base('2026-06', { historico: historico('2026-06', 35_000_000), atividades: [revenda([{ receitaCents: 1_000_000, excluir: [] }])] }), LINHAS).atividades[0];
    expect([a.faixa, a.aliquotaEfetiva]).toEqual([6, '10.0000']);
    expect(a.tributos).toMatchObject({ IRPJ: 13_500, CSLL: 10_000, COFINS: 28_270, PIS: 6_130, ICMS: 40_942 });
  });

  it('sublimite excedido: ICMS/ISS fora do DAS (até 2026) e também o IBS a partir de 2027 (art. 13-A)', () => {
    const a26 = apurar(base('2026-06', { sublimiteExcedido: true, atividades: [servico(100_000)] }), LINHAS).atividades[0];
    expect(a26.tributos.ISS).toBeUndefined();
    const a27 = apurar(base('2027-06', { sublimiteExcedido: true, atividades: [servico(100_000)] }), LINHAS).atividades[0];
    expect([a27.tributos.ISS, a27.tributos.IBS, a27.tributos.CBS]).toEqual([undefined, undefined, 1_733]);
  });

  it('teto do ISS excedido na 6ª faixa (X14 PR-3): ISS = 5% e o excesso vai aos federais da 6ª, na proporção da repartição dela (art. 21 III "a")', () => {
    // RBT12 R$ 4,2 mi, Anexo III 2026: 6ª = 17,5714…%; ISS pela 5ª = 18,0086…% × 33,5% = 6,0329% → excesso 1,0329%.
    const a = apurar(base('2026-06', { historico: historico('2026-06', 35_000_000), atividades: [servico(100_000)] }), LINHAS).atividades[0];
    expect(a.faixa).toBe(6);
    // Total 236,04 (resíduo de −0,01 no IRPJ, o maior percentual — § 1º-B II).
    expect(a.tributos).toEqual({ ISS: 5_000, IRPJ: 6_511, CSLL: 2_791, COFINS: 2_982, PIS: 646, CPP: 5_674 });
  });
});

describe('item 8 — segregação (§ 4º-A, § 12)', () => {
  it('ISS retido sai do DAS; ISS devido a outro município continua no DAS (§ 4º-A V)', () => {
    const ret = apurar(base('2026-06', { atividades: [servico(100_000, [...SEGREGACAO_EXCLUI.issRetido])] }), LINHAS).atividades[0];
    expect(ret.tributos.ISS).toBeUndefined();
    const outro = apurar(base('2026-06', { atividades: [servico(100_000, [...SEGREGACAO_EXCLUI.issOutroMunicipio])] }), LINHAS).atividades[0];
    expect(outro.tributos.ISS).toBe(3_432);
  });

  it('parcelas somam por tributo: metade com ICMS-ST, metade sem', () => {
    const a = apurar(base('2026-06', { atividades: [revenda([{ receitaCents: 250_000, excluir: SEGREGACAO_EXCLUI.icmsSt }, { receitaCents: 250_000, excluir: [] }])] }), LINHAS).atividades[0];
    expect(a.receitaCents).toBe(500_000);
    expect(a.tributos.ICMS).toBe(6_022); // 2.500 × 7,19% × 33,5% = 60,21625 → 60,22 (só a parcela sem ST)
  });

  it('a apuração devolve as linhas da tabela que usou (id + fonte + vigência)', () => {
    const r = apurar(base('2026-06', { atividades: [servico(100_000)] }), LINHAS);
    expect(r.tabela.map((t) => t.legalParameterId).sort()).toEqual(
      ['sn1-enq-servico-060101', 'sn1-teto-iii-2018-01-01', 'sn1-rep-iii-2018-01-01-f3', ...[1, 2, 3, 4, 5, 6].map((f) => `sn1-faixa-iii-2018-01-01-f${f}`)].sort(),
    );
  });
});

describe('X14 PR-4 item 29 — percentual efetivo por tributo (ISS para a retenção)', () => {
  it('2026, RBT12 R$ 600.000, Anexo III 3ª faixa: ISS = 10,56% × 32,50% = 3,4320% (R$ 1.716,00 sobre R$ 50.000)', () => {
    const a = apurar(base('2026-06', { atividades: [servico(5_000_000)] }), LINHAS).atividades[0];
    expect(a.percentuais.ISS).toBe('3.4320');
    expect(a.tributos.ISS).toBe(171_600);
    const soma = Object.values(a.percentuais).reduce((s, v) => s + Number(v), 0);
    expect(soma.toFixed(4)).toBe(a.aliquotaEfetiva);
  });
});

const COMUM = { transportadorCargas: false };
const TAC = { transportadorCargas: true };
const AMBOS = { contribuinteIcms: true, contribuinteIss: true };

describe('X14 PR-4 item 25 — SIMEI (Res. CGSN 140 art. 101)', () => {
  it('2026: 5% de R$ 1.621,00 (Decreto 12.797/2025) = R$ 81,05 + R$ 1 ICMS + R$ 5 ISS = R$ 87,05', () => {
    const r = apurarSimei('2026-03', { contribuinteIcms: true, contribuinteIss: true }, LINHAS, COMUM);
    expect(r.salarioMinimoCents).toBe(162_100);
    expect(r.tributos).toEqual({ CPP: 8_105, ICMS: 100, ISS: 500 });
    expect(r.totalCalculadoCents).toBe(8_705);
    expect(r.tabela.map((t) => t.legalParameterId).sort()).toEqual(['sn1-simei-cpp-pct', 'sn1-simei-icms', 'sn1-simei-iss', 'sn3-salmin-2026']);
  });
  it('2025: salário de R$ 1.518,00 → CPP R$ 75,90; só ISS (serviço) → R$ 80,90', () => {
    const r = apurarSimei('2025-12', { contribuinteIcms: false, contribuinteIss: true }, LINHAS, COMUM);
    expect(r.tributos).toEqual({ CPP: 7_590, ISS: 500 });
    expect(r.totalCalculadoCents).toBe(8_090);
  });
  it('sem salário mínimo vigente (2023) ⇒ erro explícito, nunca zero', () => {
    expect(() => apurarSimei('2023-06', { contribuinteIcms: false, contribuinteIss: true }, LINHAS, COMUM)).toThrow(/SALARIO_MINIMO/);
  });
});

describe('SIMEI-TAC-12 itens 2-3 — CPP de 12% do transportador (Res. CGSN 140 art. 101 I "c"; LC 123 art. 18-F III)', () => {
  it('item 2, tabela 2026-05: comum = 8105; TAC = 19452 (12% de R$ 1.621); TAC + ICMS + ISS = 20052', () => {
    const comum = apurarSimei('2026-05', { contribuinteIcms: false, contribuinteIss: false }, LINHAS, COMUM);
    const tac = apurarSimei('2026-05', { contribuinteIcms: false, contribuinteIss: false }, LINHAS, TAC);
    const tacAmbos = apurarSimei('2026-05', AMBOS, LINHAS, TAC);
    expect([comum.totalCalculadoCents, tac.totalCalculadoCents, tacAmbos.totalCalculadoCents]).toEqual([8_105, 19_452, 20_052]);
    expect([comum.cppAliquotaBp, tac.cppAliquotaBp, comum.transportadorCargas, tac.transportadorCargas]).toEqual([500, 1_200, false, true]);
    expect(tac.tabela.map((t) => t.legalParameterId)).toContain('sn5-simei-cpp-tac-pct');
    expect(tac.tabela.map((t) => t.legalParameterId)).not.toContain('sn1-simei-cpp-pct');
  });
  it('item 3 (F-TAC-4 a): TAC em 03/2022 ⇒ 5% (sem linha CPP_TAC_PCT vigente), em 04/2022 ⇒ 12% — nunca erro', () => {
    // A semente não tem salário mínimo antes de 2024 (BRIEF §7): linha de FIXTURE, valor sintético (não é o SM de 2022).
    const sm2022 = { ...LINHAS.find((l) => l.id === 'sn3-salmin-2024')!, id: 'fixture-salmin-2022', valorInt: 100_000, vigenteDesde: '2022-01-01', vigenteAte: '2022-12-31' };
    const linhas = [...LINHAS, sm2022];
    const marco = apurarSimei('2022-03', { contribuinteIcms: false, contribuinteIss: false }, linhas, TAC);
    const abril = apurarSimei('2022-04', { contribuinteIcms: false, contribuinteIss: false }, linhas, TAC);
    expect([marco.cppAliquotaBp, marco.tributos.CPP, marco.transportadorCargas]).toEqual([500, 5_000, true]);
    expect([abril.cppAliquotaBp, abril.tributos.CPP]).toEqual([1_200, 12_000]);
  });
});

describe('SIMEI-TAC-12 §9.5 itens 11-12 — Anexo VII da LC 123 (LC 214 arts. 517, 518, 520; F-TAC-7/F-TAC-8 a)', () => {
  it('2026-12: sem CBS/IBS (tributosMilesimos vazio), R$ 1 + R$ 5 como hoje', () => {
    const r = apurarSimei('2026-12', AMBOS, LINHAS, COMUM);
    expect([r.tributos, r.tributosMilesimos, r.totalCalculadoCents]).toEqual([{ CPP: 8_105, ICMS: 100, ISS: 500 }, {}, 8_705]);
  });
  it('2027-01: CBS R$ 0,994 + IBS R$ 0,006 em milésimos; total = CPP + R$ 7,00; TAC soma o mesmo fixo (L9-7)', () => {
    const comum = apurarSimei('2027-01', AMBOS, LINHAS, COMUM);
    const tac = apurarSimei('2027-01', AMBOS, LINHAS, TAC);
    expect([comum.tributos, comum.tributosMilesimos, comum.totalCalculadoCents]).toEqual([{ CPP: 8_105, ICMS: 100, ISS: 500 }, { CBS: 994, IBS: 6 }, 8_805]);
    expect(tac.totalCalculadoCents).toBe(19_452 + 700);
  });
  it('F-TAC-8 (a): CBS/IBS em todo DAS do MEI; ICMS/ISS só se contribuinte — 2027 sem ICMS nem ISS = CPP + R$ 1,00', () => {
    const r = apurarSimei('2027-06', { contribuinteIcms: false, contribuinteIss: false }, LINHAS, COMUM);
    expect([r.tributos, r.tributosMilesimos, r.totalCalculadoCents]).toEqual([{ CPP: 8_105 }, { CBS: 994, IBS: 6 }, 8_205]);
  });
  it('item 12: por ano, a soma das parcelas (contribuinte dos dois) fecha com o TOTAL do Anexo VII', () => {
    const totais: Array<[string, number]> = [['2027-01', 700], ['2028-12', 700], ['2029-01', 660], ['2030-01', 620], ['2031-01', 580], ['2032-12', 540], ['2033-01', 300], ['2040-01', 300]];
    for (const [comp, fixo] of totais) expect([comp, apurarSimei(comp, AMBOS, LINHAS, COMUM).totalCalculadoCents - 8_105]).toEqual([comp, fixo]);
  });
  it('2029: ICMS R$ 0,90 / ISS R$ 4,50 / CBS R$ 1,00 / IBS R$ 0,20 (linhas do ano, não as de 2018)', () => {
    const r = apurarSimei('2029-07', AMBOS, LINHAS, COMUM);
    expect([r.tributos, r.tributosMilesimos]).toEqual([{ CPP: 8_105, ICMS: 90, ISS: 450 }, { CBS: 1_000, IBS: 200 }]);
    expect(r.tabela.map((t) => t.legalParameterId)).not.toContain('sn1-simei-icms');
  });
  it('2033 (LC 214 art. 518): ICMS/ISS saem do DAS — parcela 0 fora de `tributos`, a linha de fim na memória', () => {
    const r = apurarSimei('2033-01', AMBOS, LINHAS, COMUM);
    expect([r.tributos, r.tributosMilesimos, r.totalCalculadoCents]).toEqual([{ CPP: 8_105 }, { CBS: 1_000, IBS: 2_000 }, 8_405]);
    expect(r.tabela.map((t) => t.legalParameterId)).toEqual(expect.arrayContaining(['sn5-simei-icms-2033', 'sn5-simei-iss-2033']));
  });
  it('F-TAC-7 (a): só o total arredonda (half-up) — fixture com milésimos que não fecham centavo', () => {
    const torto = LINHAS.map((l) => (l.id === 'sn5-simei-ibs-2027' ? { ...l, valorInt: 11 } : l)); // 994 + 11 = 1005 milésimos
    const r = apurarSimei('2027-01', { contribuinteIcms: false, contribuinteIss: false }, torto, COMUM);
    expect([r.tributosMilesimos, r.totalCalculadoCents]).toEqual([{ CBS: 994, IBS: 11 }, 8_105 + 101]);
  });
});

describe('F-PR4-8 (a), dono 10/10 — teto do ISS ausente', () => {
  const semTeto = LINHAS.filter((l) => l.tabela !== 'SIMPLES_TETO_ISS');
  const enq = (anexo: string) =>
    semTeto.map((l) => (l.id === 'sn1-enq-servico-060101' ? { ...l, valorJson: JSON.stringify({ anexo, fatorR: false, semIss: false }) } : l));

  it('Anexo III antes de 2033 sem SIMPLES_TETO_ISS ⇒ PARAMETRO_LEGAL_AUSENTE', () => {
    expect(() => apurar(base('2026-06', { atividades: [servico(100_000)] }), semTeto)).toThrow(
      expect.objectContaining({ name: 'ParametroLegalAusenteError', errorCode: 'PARAMETRO_LEGAL_AUSENTE' }),
    );
  });

  it('Anexo IV antes de 2033 sem SIMPLES_TETO_ISS ⇒ PARAMETRO_LEGAL_AUSENTE', () => {
    expect(() => apurar(base('2032-06', { atividades: [servico(100_000)] }), enq('IV'))).toThrow(
      expect.objectContaining({ errorCode: 'PARAMETRO_LEGAL_AUSENTE' }),
    );
  });

  it('Anexo V sem a linha: segue (a falta é a própria lei)', () => {
    expect(apurar(base('2026-06', { atividades: [servico(100_000)] }), enq('V')).atividades[0].anexo).toBe('V');
  });

  it('2033 em diante sem a linha: segue', () => {
    expect(() => apurar(base('2033-06', { atividades: [servico(100_000)] }), semTeto)).not.toThrow();
    // A repartição real de 2033 já não tem ISS (o ramo nem chega ao teto). Linha SINTÉTICA com ISS para exercer o
    // corte de data em si: sem o `data < 2033-01-01`, esta chamada lançaria.
    const comIss2033 = semTeto.map((l) =>
      l.tabela === 'SIMPLES_ANEXO_REPARTICAO' && l.vigenteDesde === '2033-01-01' && l.chave === 'III'
        ? { ...l, valorJson: JSON.stringify({ ...JSON.parse(l.valorJson ?? '{}'), ISS: 100 }) }
        : l,
    );
    expect(apurar(base('2033-06', { atividades: [servico(100_000)] }), comIss2033).atividades[0].tributos.ISS).toBeDefined();
  });

  it('com a linha da semente, Anexo III 2026 não muda (guarda de regressão)', () => {
    expect(apurar(base('2026-06', { atividades: [servico(100_000)] }), LINHAS).atividades[0].tributos.ISS).toBe(3_432);
  });
});
