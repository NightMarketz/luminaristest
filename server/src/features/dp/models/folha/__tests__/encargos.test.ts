/**
 * BE-INCR-DP-F2 PR-0 itens 5–8 — INSS do empregado (progressivo, teto, já tributado antes, modo da linha
 * `ARREDONDAMENTO_INSS`), INSS do contribuinte individual, FGTS pela categoria e o adaptador do IRRF (reuso do G3, tabela
 * da data de pagamento).
 */
import { calcularIrrfPf } from '../../../../accounting/models/withholdingCalc';
import { provaIncoerente } from '../calcNode';
import { fgtsDaCategoria, inssContribuinteIndividual, inssEmpregado, irrfMensal } from '../encargos';
import { alterada, params, regras } from './fotografias';

const p = params();
const r = regras();
const totalNoMeio = { ...r.arredondamentoInss, valor: 'MEIO_PARA_CIMA_NO_TOTAL' as const };
const inss = (base: bigint, ja = 0n, modo = r.arredondamentoInss) => inssEmpregado(base, p.inssEmpregado, p.tetoRgpsCents, ja, modo);

describe('DP-F2 item 5 — INSS do empregado', () => {
  it('R$ 3.000,00 em 2026: 248,58 truncando por faixa (MOS do S-5001, valor inicial) e 248,60 no total', () => {
    expect(inss(300000n).valor).toBe(24858n);
    expect(inss(300000n, 0n, totalNoMeio).valor).toBe(24860n);
  });

  it('prova com um filho por faixa; os filhos somam o total nos dois modos (o ajuste do total aparece como filho)', () => {
    const t = inss(300000n);
    expect(t.prova.filhos.filter((f) => f.soma)).toHaveLength(3);
    expect(provaIncoerente(t.prova)).toEqual([]);
    const m = inss(300000n, 0n, totalNoMeio);
    expect(m.prova.filhos.at(-1)?.rotulo).toBe('Ajuste do arredondamento no total');
    expect(provaIncoerente(m.prova)).toEqual([]);
  });

  it('base acima do teto contribui só até o teto', () => {
    expect(inss(p.tetoRgpsCents * 2n).valor).toBe(inss(p.tetoRgpsCents).valor);
  });

  it('com A já tributado antes: INSS(min(A + base, teto)) − INSS(min(A, teto)), nunca negativo; A ≥ teto ⇒ zero', () => {
    const a = 200000n;
    expect(inss(100000n, a).valor).toBe(inss(300000n).valor - inss(a).valor);
    expect(inss(100000n, p.tetoRgpsCents).valor).toBe(0n);
    expect(inss(500000n, p.tetoRgpsCents - 100000n).valor).toBe(inss(p.tetoRgpsCents).valor - inss(p.tetoRgpsCents - 100000n).valor);
    expect(provaIncoerente(inss(100000n, a).prova)).toEqual([]);
  });

  it('faixa alterada na fotografia muda o valor', () => {
    const outra = params(
      alterada({}).map((l) => (l.tabela === 'INSS_EMPREGADO' && l.chave === 'FAIXA_1' ? { ...l, valorJson: JSON.stringify({ ...JSON.parse(l.valorJson ?? '{}'), aliquotaBp: 800 }) } : l)),
    );
    expect(inssEmpregado(300000n, outra.inssEmpregado, outra.tetoRgpsCents, 0n, r.arredondamentoInss).valor).not.toBe(inss(300000n).valor);
  });
});

describe('DP-F2 item 6 — INSS do contribuinte individual', () => {
  it('11% do pró-labore até o teto, descontado o já contribuído', () => {
    expect(inssContribuinteIndividual(500000n, p.ciSeguradoBp, p.tetoRgpsCents, 0n, r.arredondamento).valor).toBe(55000n);
    const teto = inssContribuinteIndividual(p.tetoRgpsCents * 3n, p.ciSeguradoBp, p.tetoRgpsCents, 0n, r.arredondamento).valor;
    expect(inssContribuinteIndividual(p.tetoRgpsCents * 3n, p.ciSeguradoBp, p.tetoRgpsCents, p.tetoRgpsCents, r.arredondamento).valor).toBe(0n);
    expect(teto).toBe((p.tetoRgpsCents * BigInt(p.ciSeguradoBp) * 2n + 10_000n) / 20_000n);
  });
});

describe('DP-F2 item 7 — FGTS pela categoria (DP_CATEGORIA_ENCARGO)', () => {
  it('101 recolhe 8%, 103 recolhe 2%, 901 e 723 não calculam', () => {
    const enc = r.encargoPorCategoria;
    expect(fgtsDaCategoria(300000n, enc['101'], p, r.arredondamento)?.valor).toBe(24000n);
    expect(fgtsDaCategoria(300000n, enc['103'], p, r.arredondamento)?.valor).toBe(6000n);
    expect(fgtsDaCategoria(300000n, enc['901'], p, r.arredondamento)).toBeNull();
    expect(fgtsDaCategoria(300000n, enc['723'], p, r.arredondamento)).toBeNull();
    expect(fgtsDaCategoria(300000n, enc['103'], p, r.arredondamento)?.prova.filhos.at(-1)?.fonte).toBe('LP:dp-encargo-103-2000');
  });

  it('a linha da categoria alterada muda o FGTS sem código', () => {
    const alt = regras(alterada({ '103': { inss: 'EMPREGADO', fgtsChave: 'FGTS_BP', irrf: true } }));
    expect(fgtsDaCategoria(300000n, alt.encargoPorCategoria['103'], p, alt.arredondamento)?.valor).toBe(24000n);
  });
});

describe('DP-F2 item 8 — IRRF mensal (reusa calcularIrrfPf)', () => {
  const foto = alterada({});
  const entrada = { baseIrrfCents: 800000n, inssCents: 90000n, dependentes: 1, rendimentoMesAntesCents: 0n, retidoMesAntesCents: 0n, dataPagamento: '2026-04-05' };

  it('é o mesmo número do G3, com pensão 0 e o INSS como previdência', () => {
    const g3 = calcularIrrfPf(800000n, { rendimentoMesAntesCents: 0n, retidoMesAntesCents: 0n, dependentes: 1, previdenciaCents: 90000n, pensaoCents: 0n }, foto, '2026-04-05');
    const c = irrfMensal(entrada, foto);
    expect(c.valor).toBe(g3.amountCents);
    expect(c.valor).toBeGreaterThan(0n);
  });

  it('a tabela é a da data de pagamento: o mesmo rendimento pago em 12/2025 e em 01/2026 dá IRRF diferente (redução do art. 3º-A)', () => {
    const e = { ...entrada, baseIrrfCents: 450000n, inssCents: 0n, dependentes: 0 };
    expect(irrfMensal({ ...e, dataPagamento: '2025-12-20' }, foto).valor).toBeGreaterThan(0n);
    expect(irrfMensal({ ...e, dataPagamento: '2026-01-05' }, foto).valor).toBe(0n);
  });

  it('o que a mesma fonte já pagou e reteve no mês entra na soma (Lei 7.713 art. 7º § 1º)', () => {
    const so = irrfMensal(entrada, foto).valor;
    const depois = irrfMensal({ ...entrada, rendimentoMesAntesCents: 200000n, retidoMesAntesCents: 0n }, foto).valor;
    expect(depois).toBeGreaterThan(so);
  });
});
