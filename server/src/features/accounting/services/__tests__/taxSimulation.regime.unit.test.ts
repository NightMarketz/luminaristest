/**
 * Guarda de comportamento (refatoração sem mudança — hardcode fiscal #3/#15 de 06/11/2026) do `TaxSimulationService.regime`:
 * (a) alerta SUBLIMITE_80 na fronteira de 80% do sublimite (79,99% não alerta; 80% alerta; acima do sublimite vira EXCEDIDO);
 * (b) alíquota de ISS fora do Simples: da tabela ISS_LIMITE quando há linha vigente, e 500 bp (LC 116 art. 8º II) com o mesmo
 * aviso quando a tabela não tem linha. Os simuladores puros e a receita do razão são trocados por stubs: o que se prova é o
 * que o serviço decide, não a aritmética dos cenários (essa tem suíte própria em models/__tests__/taxSimulation.test.ts).
 */
import { ISS_ALIQUOTA_MAX_FALLBACK_BP, LIMIAR_ALERTA_SUBLIMITE_PCT, TaxSimulationService } from '../TaxSimulationService';
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import type { EntradaRegime } from '../../models/taxSimulation';
import { simularRegimeAno } from '../../models/taxSimulation';

jest.mock('../receitaBrutaPorAtividade', () => ({ receitaBrutaPorAtividade: jest.fn(async () => ({ servicoCents: 0, revendaCents: 0, naoUsoCents: 0 })) }));
jest.mock('../SpedEcfGenerationService', () => ({ quarterWindows: () => [] }));
jest.mock('../../models/taxSimulation', () => {
  const real = jest.requireActual('../../models/taxSimulation');
  return { ...real, simularRegimeAno: jest.fn(), encargosFolhaDe: jest.fn(() => ({})) };
});

const SUBLIMITE = 360_000_000; // centavos (R$ 3,6 mi)
const ANO = 2027; // ano > 2026 : sem projeção 2027, uma única chamada ao simulador

const linha = (tabela: string, chave: string, valorInt: number): LinhaLegal => ({
  id: `${tabela}-${chave}`,
  tabela,
  chave,
  discriminador: null,
  valorInt,
  valorTexto: null,
  valorJson: null,
  fonte: 'teste',
  vigenteDesde: '2020-01-01',
  vigenteAte: null,
  status: 'PUBLISHED',
  supersedesId: null,
});

function montar(linhas: LinhaLegal[], receitaCents: bigint, issAliquotaBp: number | null = null) {
  const sim = simularRegimeAno as jest.MockedFunction<typeof simularRegimeAno>;
  sim.mockReset();
  sim.mockReturnValue({ ano: ANO, receitaBrutaCents: receitaCents, cenarios: [], melhor: null, avisos: [] } as never);
  const service = new TaxSimulationService(
    { entradaParaSimulacao: jest.fn() } as never,
    { findByYear: jest.fn(async () => null) },
    { findByScope: jest.fn(async () => (issAliquotaBp === null ? null : { issAliquotaBp })) } as never,
    {} as never,
    {} as never,
    { findByCompetencia: jest.fn(async () => []), somaPorCompetencia: jest.fn(async () => new Map()) },
    { findHistorico: jest.fn(async () => []) },
    { resultadoAntesIrpjCsll: jest.fn(async () => 0) } as never,
    {} as never,
    {} as never,
    { fotografia: jest.fn(async () => linhas) } as never,
    {} as never,
    { canReadTaxAssessment: jest.fn(() => true) } as never,
  );
  const scope = { userId: 'u', unitId: 'unit' } as never;
  const entradaDoSimulador = () => (sim.mock.calls[0]![0] as EntradaRegime);
  return { run: () => service.regime(scope, { ano: ANO } as never), entradaDoSimulador };
}

describe('TaxSimulationService.regime — alerta de 80% do sublimite', () => {
  it('as constantes nomeadas mantêm os valores de antes da extração', () => {
    expect([LIMIAR_ALERTA_SUBLIMITE_PCT, ISS_ALIQUOTA_MAX_FALLBACK_BP]).toEqual([80, 500]);
  });

  const linhas = [linha('SIMPLES_LIMITE', 'SUBLIMITE', SUBLIMITE), linha('SIMPLES_LIMITE', 'EPP', 480_000_000)];
  const codigos = async (receita: bigint) => (await montar(linhas, receita).run()).alertas.map((a) => a.codigo);

  it('79,99% do sublimite ⇒ sem alerta de sublimite', async () => {
    const r = BigInt(SUBLIMITE) * 7999n / 10000n;
    expect(await codigos(r)).toEqual(['JANELA_OPCAO']);
  });

  it('exatamente 80% ⇒ SUBLIMITE_80', async () => {
    expect(await codigos(BigInt(SUBLIMITE) * 8n / 10n)).toEqual(['SUBLIMITE_80', 'JANELA_OPCAO']);
  });

  it('acima do sublimite ⇒ SUBLIMITE_EXCEDIDO (não o de 80%)', async () => {
    expect(await codigos(BigInt(SUBLIMITE) + 1n)).toEqual(['SUBLIMITE_EXCEDIDO', 'JANELA_OPCAO']);
  });

  it('sem linha de sublimite ⇒ nenhum alerta de sublimite', async () => {
    expect((await montar([], BigInt(SUBLIMITE)).run()).alertas.map((a) => a.codigo)).toEqual(['JANELA_OPCAO']);
  });
});

describe('TaxSimulationService.regime — alíquota de ISS fora do Simples', () => {
  const avisoIss = (avisos: string[]) => avisos.find((a) => a.startsWith('ISS fora do Simples pela alíquota máxima'));

  it('com linha vigente em ISS_LIMITE: usa o valor da tabela', async () => {
    const m = montar([linha('ISS_LIMITE', 'ALIQUOTA_MAX_BP', 400)], 0n);
    const v = await m.run();
    expect(m.entradaDoSimulador().issAliquotaBp).toBe(400);
    expect(avisoIss(v.avisos)).toMatch(/^ISS fora do Simples pela alíquota máxima \(4% — LC 116\/2003 art\. 8º II\)/);
  });

  it('sem linha vigente e sem alíquota no perfil: NÃO inventa 5% — entrega null ao simulador e avisa que o ISS não foi conferido', async () => {
    const m = montar([], 0n);
    const v = await m.run();
    expect(m.entradaDoSimulador().issAliquotaBp).toBeNull();
    expect(avisoIss(v.avisos)).toBeUndefined(); // nada de "pela alíquota máxima (5%)"
    expect(v.avisos.join(' | ')).toMatch(/ISS_LIMITE\/ALIQUOTA_MAX_BP sem linha vigente em 2027-12-31/);
  });

  it('perfil fiscal com alíquota própria: não consulta o teto nem avisa', async () => {
    const m = montar([], 0n, 300);
    const v = await m.run();
    expect(m.entradaDoSimulador().issAliquotaBp).toBe(300);
    expect(avisoIss(v.avisos)).toBeUndefined();
  });
});
