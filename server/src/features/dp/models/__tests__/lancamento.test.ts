/**
 * BE-INCR-DP-F2 PR-1 itens 16–19 — unidade do lançamento por rubrica, validação (`DP_LANCAMENTO_INVALIDO` com o campo),
 * formato do `JornadaApuradaItem` e a precedência MANUAL × MODULO com registro de teste (todo opcional hoje é
 * `disponivel: false`).
 */
import { ValidationError } from '../../../../lib/errors';
import { DpPortResolver, type DpPortImplementations } from '../../ports/DpPortResolver';
import type { JornadaApuradaItem, JornadaApuradaPort } from '../../ports/JornadaApuradaPort';
import { CompetenciaSchema } from '../competencia';
import { LANCAMENTO_UNIDADE, RUBRICAS_DE_JORNADA, assertLancamentoValido, conflitosComPonto, type DadosLancamento } from '../lancamento';
import { DP_MODULE_REGISTRY, type DpModuleRegistry } from '../moduleRegistry';
import { DP_RUBRICAS } from '../rubricas/catalogo';

const c = (s: string) => CompetenciaSchema.parse(s);
const VINCULO = { categoria: '101', dataInicio: '2026-02-10', dataTermino: '2026-06-05' };
const base: DadosLancamento = { rubrica: 'HORA_EXTRA_50', competencia: c('2026-03'), quantidadeMin: 120, valorCents: null };

function erro(fn: () => void): { reason?: unknown; campo?: unknown } {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ValidationError);
    expect((e as ValidationError & { errorCode: string }).errorCode).toBe('DP_LANCAMENTO_INVALIDO');
    return (e as ValidationError).details as { reason?: unknown; campo?: unknown };
  }
  throw new Error('não lançou');
}

describe('item 16 — unidade do lançamento', () => {
  it('toda rubrica INFORMADO do catálogo tem unidade, e só elas', () => {
    expect(Object.keys(LANCAMENTO_UNIDADE).sort()).toEqual(DP_RUBRICAS.filter((r) => r.calculo === 'INFORMADO').map((r) => r.codigo).sort());
    expect(LANCAMENTO_UNIDADE.COMISSAO).toBe('VALOR');
    for (const r of RUBRICAS_DE_JORNADA) expect(LANCAMENTO_UNIDADE[r]).toBe('MINUTOS');
  });
});

describe('item 17 — validação do lançamento', () => {
  it('aceita HE em minutos e comissão em centavos dentro do vínculo', () => {
    expect(() => assertLancamentoValido(base, VINCULO)).not.toThrow();
    expect(() => assertLancamentoValido({ ...base, rubrica: 'COMISSAO', quantidadeMin: null, valorCents: 150000n }, VINCULO)).not.toThrow();
  });

  it('competência que só toca o vínculo num dia ainda vale (fevereiro e junho)', () => {
    expect(() => assertLancamentoValido({ ...base, competencia: c('2026-02') }, VINCULO)).not.toThrow();
    expect(() => assertLancamentoValido({ ...base, competencia: c('2026-06') }, VINCULO)).not.toThrow();
  });

  it.each([
    ['rubrica inexistente', { rubrica: 'BONUS_X' }, 'rubrica'],
    ['rubrica LEGAL', { rubrica: 'INSS_SEGURADO' }, 'rubrica'],
    ['rubrica CONTRATUAL', { rubrica: 'SALARIO_BASE' }, 'rubrica'],
    ['competência antes do vínculo', { competencia: c('2026-01') }, 'competencia'],
    ['competência depois do término', { competencia: c('2026-07') }, 'competencia'],
    ['HE em centavos', { quantidadeMin: null, valorCents: 1000n }, 'valorCents'],
    ['HE com os dois', { valorCents: 1000n }, 'valorCents'],
    ['HE sem quantidade', { quantidadeMin: null }, 'quantidadeMin'],
    ['HE zero', { quantidadeMin: 0 }, 'quantidadeMin'],
    ['comissão em minutos', { rubrica: 'COMISSAO' }, 'quantidadeMin'],
  ])('%s ⇒ 400 DP_LANCAMENTO_INVALIDO no campo', (_n, patch, campo) => {
    expect(erro(() => assertLancamentoValido({ ...base, ...patch } as DadosLancamento, VINCULO))).toEqual({ reason: 'DP_LANCAMENTO_INVALIDO', campo });
  });

  it('rubrica que não se aplica à categoria (HE no aprendiz 103, CLT art. 432)', () => {
    expect(erro(() => assertLancamentoValido(base, { ...VINCULO, categoria: '103' })).campo).toBe('rubrica');
    expect(() => assertLancamentoValido({ ...base, rubrica: 'FALTAS' }, { ...VINCULO, categoria: '103' })).not.toThrow();
    expect(erro(() => assertLancamentoValido({ ...base, rubrica: 'FALTAS' }, { ...VINCULO, categoria: '723' })).campo).toBe('rubrica');
  });

  it('vínculo sem término aceita competência futura', () => {
    expect(() => assertLancamentoValido({ ...base, competencia: c('2030-01') }, { ...VINCULO, dataTermino: null })).not.toThrow();
  });
});

describe('itens 18–19 — formato do item do ponto e precedência MANUAL × MODULO', () => {
  const REG: DpModuleRegistry = { ...DP_MODULE_REGISTRY, 'DP-PONTO': { ...DP_MODULE_REGISTRY['DP-PONTO'], disponivel: true } };
  const itens: JornadaApuradaItem[] = [{ rubrica: 'HORA_EXTRA_50', quantidadeMin: 90, data: '2026-03-10' }];
  const ponto: JornadaApuradaPort = { apurar: async () => ({ origem: 'MODULO', itens }) };
  const impls: DpPortImplementations = new Map([['DP-PONTO', { JORNADA_APURADA: ponto }]]);
  const ativoEmMarco = async (_o: string, comp: string) => (comp === '2026-03' ? (['DP-PONTO'] as const) : []);
  const manuais = [
    { id: 'l1', rubrica: 'HORA_EXTRA_50', origem: 'MANUAL' as const },
    { id: 'l2', rubrica: 'COMISSAO', origem: 'MANUAL' as const },
    { id: 'l3', rubrica: 'FALTAS', origem: 'MANUAL' as const },
    { id: 'l4', rubrica: 'ADICIONAL_NOTURNO', origem: 'MODULO' as const },
  ];
  const apurar = async (comp: string) => {
    const portas = await new DpPortResolver(impls, ativoEmMarco, REG).resolver('u', c(comp));
    return portas.JORNADA_APURADA.apurar('u', 'v1', c(comp));
  };

  it('DP-PONTO ativo com itens ⇒ cada MANUAL de jornada vira pendência bloqueante (nunca soma)', async () => {
    const p = conflitosComPonto('v1', c('2026-03'), manuais, await apurar('2026-03'));
    expect(p.map((x) => [x.codigo, x.bloqueante, x.dado])).toEqual([
      ['LANCAMENTO_DUPLICADO_COM_PONTO', true, 'HORA_EXTRA_50 (lançamento l1)'],
      ['LANCAMENTO_DUPLICADO_COM_PONTO', true, 'FALTAS (lançamento l3)'],
    ]);
  });

  it('DP-PONTO desligado (adaptador nulo) ⇒ sem pendência; o manual vale', async () => {
    const nulo = await apurar('2026-04');
    expect(nulo.origem).toBe('NULO');
    expect(conflitosComPonto('v1', c('2026-04'), manuais, nulo)).toEqual([]);
  });

  it('DP-PONTO ativo sem itens ⇒ sem pendência', () => {
    expect(conflitosComPonto('v1', c('2026-03'), manuais, { origem: 'MODULO', itens: [] })).toEqual([]);
  });
});
