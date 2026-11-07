/**
 * BE-INCR-DP-F2 PR-2 item 24 — mapa rubrica → calculadora: toda rubrica do catálogo tem calculadora (sem órfã) e toda
 * calculadora nomeada é uma função real (dono, chat, 2026-11-07: "Escrever agora").
 */
import { DP_RUBRICAS } from '../../rubricas/catalogo';
import { CALCULADORAS, RUBRICA_CALCULO } from '../rubricaCalculo';

const nomes = (m: Record<string, readonly string[]>) => Object.values(m).flat();

describe('DP-F2 item 24 — mapa rubrica → calculadora', () => {
  it('as chaves do mapa são exatamente os códigos do catálogo, na mesma ordem (rubrica sem calculadora reprova)', () => {
    expect(Object.keys(RUBRICA_CALCULO)).toEqual(DP_RUBRICAS.map((r) => r.codigo));
    for (const [codigo, calcs] of Object.entries(RUBRICA_CALCULO)) expect([codigo, calcs.length > 0]).toEqual([codigo, true]);
  });

  it('a checagem morde: catálogo com uma rubrica a mais acusa a órfã', () => {
    const catalogo = [...DP_RUBRICAS.map((r) => r.codigo as string), 'RUBRICA_NOVA'];
    expect(catalogo.filter((c) => !(c in RUBRICA_CALCULO))).toEqual(['RUBRICA_NOVA']);
  });

  it('toda calculadora nomeada é função; toda calculadora da lista é usada', () => {
    for (const nome of nomes(RUBRICA_CALCULO)) expect([nome, typeof (CALCULADORAS as Record<string, unknown>)[nome]]).toEqual([nome, 'function']);
    const usadas = new Set(nomes(RUBRICA_CALCULO));
    expect(Object.keys(CALCULADORAS).filter((n) => !usadas.has(n))).toEqual([]);
  });

  it('as escritas no PR-2 ligam as rubricas do item 23', () => {
    expect([RUBRICA_CALCULO.FALTAS, RUBRICA_CALCULO.DSR_PERDIDO, RUBRICA_CALCULO.AFASTAMENTO_EMPRESA_15D, RUBRICA_CALCULO.ADIANTAMENTO, RUBRICA_CALCULO.DESCONTO_ADIANTAMENTO, RUBRICA_CALCULO.SALARIO_FAMILIA]).toEqual([
      ['descontoFaltas'],
      ['dsrPerdido'],
      ['afastamentoEmpresa'],
      ['adiantamento'],
      ['descontoAdiantamento'],
      ['salarioFamilia'],
    ]);
    expect(RUBRICA_CALCULO.COMPLEMENTO_PISO).toEqual(['complementoMinimo', 'pisoProporcional']);
  });
});
