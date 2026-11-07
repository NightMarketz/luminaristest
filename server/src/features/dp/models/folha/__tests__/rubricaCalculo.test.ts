/**
 * BE-INCR-DP-F2 PR-2 item 24 — mapa rubrica → calculadora: toda rubrica do catálogo tem calculadora (sem órfã), toda
 * calculadora nomeada existe, e as que o PR-4 ainda escreve estão numa lista fechada.
 */
import { DP_RUBRICAS } from '../../rubricas/catalogo';
import { CALCULADORAS_A_IMPLEMENTAR, CALCULADORAS_PR0, RUBRICA_CALCULO } from '../rubricaCalculo';

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

  it('toda calculadora nomeada existe: função do PR-0 ou forma pendente com o item do BRIEF', () => {
    for (const nome of nomes(RUBRICA_CALCULO)) {
      const fn = (CALCULADORAS_PR0 as Record<string, unknown>)[nome];
      const pendente = (CALCULADORAS_A_IMPLEMENTAR as Record<string, string>)[nome];
      expect([nome, typeof fn === 'function' || /^item \d+/.test(pendente ?? '')]).toEqual([nome, true]);
      expect([nome, fn !== undefined && pendente !== undefined]).toEqual([nome, false]); // nunca nas duas listas
    }
  });

  it('as pendentes são só as que o BRIEF põe no PR-4 (ou no F-DPF-7), e todas são usadas', () => {
    expect(CALCULADORAS_A_IMPLEMENTAR).toEqual({
      salarioHorista: 'item 37',
      valorInformado: 'item 38',
      descontoFaltas: 'item 36',
      dsrPerdido: 'item 36',
      adiantamento: 'item 42',
      descontoAdiantamento: 'item 43',
      salarioFamilia: 'item 15 / F-DPF-7',
    });
    const usadas = new Set(nomes(RUBRICA_CALCULO));
    expect([...Object.keys(CALCULADORAS_PR0), ...Object.keys(CALCULADORAS_A_IMPLEMENTAR)].filter((n) => !usadas.has(n))).toEqual([]);
  });

  it('as rubricas de jornada informada usam a calculadora de jornada; as derivadas, a do PR-0 ou a pendente do item 36/43', () => {
    expect(RUBRICA_CALCULO.HORA_EXTRA_100).toEqual(['horaExtra']); // o adicional de repouso é a linha HE_REPOUSO_ADICIONAL_BP
    expect(RUBRICA_CALCULO.DSR_VARIAVEIS).toEqual(['dsrSobreVariaveis']);
    expect(RUBRICA_CALCULO.COMPLEMENTO_PISO).toEqual(['complementoMinimo', 'pisoProporcional']);
  });
});
