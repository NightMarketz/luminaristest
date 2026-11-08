/**
 * BE-INCR-DP-F2 PR-1 item 78 — INSS com outra empresa (IN RFB 2.110/2022 arts. 36 e 49 § 2º II): nó por ordem (antes,
 * depois, antes acima do teto, contribuinte individual antes).
 */
import { provaIncoerente } from '../calcNode';
import { inssEmpregado } from '../encargos';
import { inssComOutrasFontes, type OutraRemuneracaoNoMes } from '../outrasRemuneracoes';
import { params, regras } from './fotografias';

const p = params();
const r = regras();
const sozinho = (base: bigint, ja = 0n) => inssEmpregado(base, p.inssEmpregado, p.tetoRgpsCents, ja, r.arredondamentoInss).valor;
const com = (base: bigint, outras: OutraRemuneracaoNoMes[]) => inssComOutrasFontes(base, outras, p.inssEmpregado, p.tetoRgpsCents, r.arredondamentoInss);
const emp = (remuneracaoCents: bigint, ordem: 'ANTES' | 'DEPOIS'): OutraRemuneracaoNoMes => ({ remuneracaoCents, ordem, categoriaOutraFonte: 'EMPREGADO' });

describe('DP-F2 item 78 — teto com outro emprego', () => {
  it('sem outra fonte: o INSS do vínculo sozinho', () => {
    expect(com(300000n, []).valor).toBe(sozinho(300000n));
  });

  it('ANTES desta empresa: continua as faixas de A — INSS(A + daqui) − INSS(A)', () => {
    const c = com(300000n, [emp(300000n, 'ANTES')]);
    expect(c.valor).toBe(sozinho(600000n) - sozinho(300000n));
    expect(c.valor).toBe(sozinho(300000n, 300000n));
    expect(c.valor).toBeGreaterThan(sozinho(300000n)); // as faixas de cima têm alíquota maior
    expect(provaIncoerente(c.prova)).toEqual([]);
  });

  it('DEPOIS desta empresa: não entra na conta daqui (esta desconta desde a faixa 1)', () => {
    const c = com(300000n, [emp(500000n, 'DEPOIS')]);
    expect(c.valor).toBe(sozinho(300000n));
    expect(c.prova.filhos.map((f) => f.rotulo)).toContain('1 fonte(s) DEPOIS desta empresa: fora da conta daqui');
  });

  it('ANTES já no teto (ou acima): a contribuição daqui é zero, nunca negativa', () => {
    expect(com(300000n, [emp(p.tetoRgpsCents, 'ANTES')]).valor).toBe(0n);
    expect(com(300000n, [emp(p.tetoRgpsCents + 100000n, 'ANTES')]).valor).toBe(0n);
  });

  it('contribuinte individual ANTES: conta só para o teto, não para as faixas', () => {
    const ci: OutraRemuneracaoNoMes = { remuneracaoCents: 700000n, ordem: 'ANTES', categoriaOutraFonte: 'CONTRIBUINTE_INDIVIDUAL' };
    const resto = p.tetoRgpsCents - 700000n;
    const c = com(300000n, [ci]);
    expect(c.valor).toBe(sozinho(resto)); // base daqui limitada ao que falta do teto, faixas desde a 1
    expect(c.valor).not.toBe(sozinho(300000n, 700000n)); // não continua as faixas a partir do CI
    expect(provaIncoerente(c.prova)).toEqual([]);
  });

  it('a contribuicaoCents informada não entra na regra (o tipo nem a recebe)', () => {
    const comCampoExtra = { ...emp(300000n, 'ANTES'), contribuicaoCents: 999999n } as OutraRemuneracaoNoMes;
    expect(com(300000n, [comCampoExtra]).valor).toBe(com(300000n, [emp(300000n, 'ANTES')]).valor);
  });
});
