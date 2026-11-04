/**
 * BE-INCR-DP-F0-F1 itens 16 e 17 (PR-1) — porta JORNADA_APURADA com adaptador nulo e o resolvedor por competência.
 */
import { CompetenciaSchema } from '../../models/competencia';
import { DP_MODULE_REGISTRY, type DpModuleRegistry } from '../../models/moduleRegistry';
import { DpPortResolver, type DpPortImplementations } from '../DpPortResolver';
import { NullJornadaApurada, type JornadaApuradaPort } from '../JornadaApuradaPort';

const c = (s: string) => CompetenciaSchema.parse(s);
const REG: DpModuleRegistry = { ...DP_MODULE_REGISTRY, 'DP-PONTO': { ...DP_MODULE_REGISTRY['DP-PONTO'], disponivel: true } };
const real: JornadaApuradaPort = { apurar: async () => ({ origem: 'MODULO', itens: [] }) };
// DP-PONTO ativo de 2027-03 em diante.
const ativos = async (_o: string, comp: string) => (comp >= '2027-03' ? (['DP-PONTO'] as const) : []);

describe('item 16 — NullJornadaApurada', () => {
  it('devolve NULO, sem itens, com o motivo da competência', async () => {
    expect(await new NullJornadaApurada().apurar('u', 'v', c('2027-02'))).toEqual({
      origem: 'NULO',
      motivo: 'DP-PONTO desligado na competência 2027-02',
      itens: [],
    });
  });
});

describe('item 17 — DpPortResolver', () => {
  const impls: DpPortImplementations = new Map([['DP-PONTO', { JORNADA_APURADA: real }]]);

  it('ativo em 2027-03 com implementação ⇒ a implementação real', async () => {
    const portas = await new DpPortResolver(impls, ativos, REG).resolver('u', c('2027-03'));
    expect(portas.JORNADA_APURADA).toBe(real);
  });

  it('em 2027-02 (desligado) ⇒ adaptador nulo com o motivo', async () => {
    const portas = await new DpPortResolver(impls, ativos, REG).resolver('u', c('2027-02'));
    expect(await portas.JORNADA_APURADA.apurar('u', 'v', c('2027-02'))).toEqual({
      origem: 'NULO',
      motivo: 'DP-PONTO desligado na competência 2027-02',
      itens: [],
    });
  });

  it('ativo mas sem implementação ⇒ nulo com outro motivo', async () => {
    const portas = await new DpPortResolver(new Map(), ativos, REG).resolver('u', c('2027-03'));
    expect(await portas.JORNADA_APURADA.apurar('u', 'v', c('2027-03'))).toMatchObject({
      origem: 'NULO',
      motivo: 'DP-PONTO ativo na competência 2027-03, sem implementação de JORNADA_APURADA',
    });
  });

  it('módulo ativo que não declara a porta não a provê', async () => {
    const semProvides: DpModuleRegistry = { ...REG, 'DP-PONTO': { ...REG['DP-PONTO'], provides: [] } };
    const portas = await new DpPortResolver(impls, ativos, semProvides).resolver('u', c('2027-03'));
    expect((await portas.JORNADA_APURADA.apurar('u', 'v', c('2027-03'))).origem).toBe('NULO');
  });
});
