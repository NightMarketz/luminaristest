/**
 * BE-INCR-DP-F0-F1 itens 8, 9, 10 e 11 (PR-1) — registro dos submódulos, invariantes, consistência com a regra D1 do
 * check:arch e resolução da ativação.
 */
import path from 'path';
import {
  assertDpRegistryInvariants,
  DP_MODULE_KEYS,
  DP_MODULE_REGISTRY,
  dpModuleDefSchema,
  resolveDpModuleActivation,
  type DpModuleDef,
  type DpModuleKey,
  type DpModuleRegistry,
} from '../moduleRegistry';
import { AppError } from '../../../../lib/errors';

const def = (key: DpModuleKey, extra: Partial<DpModuleDef> = {}): DpModuleDef => ({
  key,
  name: { pt: key, en: key },
  aiDescription: key,
  dependsOn: [],
  requiresOneOf: [],
  featureDir: `dp${key.replace(/[^A-Z]/g, '')}`,
  provides: [],
  disponivel: true,
  ...extra,
});
const fixture = (over: Partial<Record<DpModuleKey, Partial<DpModuleDef>>>): DpModuleRegistry =>
  Object.fromEntries(DP_MODULE_KEYS.map((k) => [k, def(k, over[k])])) as DpModuleRegistry;

describe('item 8 — registro', () => {
  it('cada entrada passa no dpModuleDefSchema (.strict) e a chave bate com a posição', () => {
    for (const [k, d] of Object.entries(DP_MODULE_REGISTRY)) {
      expect(dpModuleDefSchema.parse(d)).toEqual(d);
      expect(d.key).toBe(k);
    }
    expect(dpModuleDefSchema.safeParse({ ...DP_MODULE_REGISTRY['DP-PONTO'], category: 'dp' }).success).toBe(false);
    expect(dpModuleDefSchema.safeParse({ ...DP_MODULE_REGISTRY['DP-PONTO'], featureDir: 'ponto' }).success).toBe(false);
  });

  it('snapshot das chaves, featureDir e provides (spec §2; F-DPB-2)', () => {
    expect(Object.values(DP_MODULE_REGISTRY).map((d) => [d.key, d.featureDir, d.provides, d.dependsOn, d.disponivel])).toEqual([
      ['DP-PONTO', 'dpPonto', ['JORNADA_APURADA'], [], false],
      ['DP-PAG', 'dpPagamentos', [], [], false],
      ['DP-BEN', 'dpBeneficios', [], [], false],
      ['DP-ADM', 'dpAdmissao', [], [], false],
      ['DP-APP', 'dpApp', [], [], false],
      ['DP-DES', 'dpDesempenho', [], [], false],
      ['DP-GED', 'dpDocumentos', [], [], false],
      ['DP-CAT', 'dpCategorias', [], [], false],
      ['DP-BI', 'dpIndicadores', [], [], false],
    ]);
  });
});

describe('item 9 — invariantes', () => {
  it('o registro real passa', () => {
    expect(() => assertDpRegistryInvariants(DP_MODULE_REGISTRY)).not.toThrow();
  });

  it('ciclo (inclusive via requiresOneOf) ⇒ erro nomeado com o caminho', () => {
    const ciclo = fixture({ 'DP-PAG': { dependsOn: ['DP-BEN'] }, 'DP-BEN': { requiresOneOf: [['DP-PAG', 'DP-BI']] } });
    expect(() => assertDpRegistryInvariants(ciclo)).toThrow(/ciclo de dependência DP-PAG → DP-BEN → DP-PAG/);
  });

  it('chave citada fora do registro, featureDir duplicado e porta com dois provedores ⇒ erro', () => {
    const fora = { ...fixture({}), 'DP-PAG': def('DP-PAG', { dependsOn: ['DP-XX' as DpModuleKey] }) };
    expect(() => assertDpRegistryInvariants(fora)).toThrow(/cita 'DP-XX'/);
    expect(() => assertDpRegistryInvariants(fixture({ 'DP-BEN': { featureDir: 'dpDPPAG' } }))).toThrow(/featureDir duplicado/);
    const duasPortas = fixture({ 'DP-PONTO': { provides: ['JORNADA_APURADA'] }, 'DP-APP': { provides: ['JORNADA_APURADA'] } });
    expect(() => assertDpRegistryInvariants(duasPortas)).toThrow(/JORNADA_APURADA' é provida por 'DP-PONTO' e por 'DP-APP'/);
  });
});

describe('item 10 — registro × regra D1 do check:arch', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cruiser = require(path.resolve(__dirname, '../../../../../.dependency-cruiser.cjs')) as {
    forbidden: { name: string; from: { path: string }; to: { path: string } }[];
  };
  const d1 = cruiser.forbidden.find((r) => r.name === 'D1-dp-core-not-optional');

  it('a D1 existe, parte do núcleo e casa a pasta de todo featureDir', () => {
    expect(d1).toBeDefined();
    const from = new RegExp(d1!.from.path);
    const to = new RegExp(d1!.to.path);
    expect(from.test('src/features/dp/models/x.ts')).toBe(true);
    for (const d of Object.values(DP_MODULE_REGISTRY)) expect(to.test(`src/features/${d.featureDir}/x.ts`)).toBe(true);
    expect(to.test('src/features/dp/x.ts')).toBe(false);
  });
});

describe('item 11 — resolveDpModuleActivation', () => {
  const reg = fixture({
    'DP-APP': { dependsOn: ['DP-PONTO', 'DP-BEN'] },
    'DP-BI': { requiresOneOf: [['DP-PAG', 'DP-GED']] },
    'DP-CAT': { disponivel: false },
  });
  const erro = (fn: () => unknown): { status: number; code: string; details?: unknown } => {
    try {
      fn();
    } catch (e) {
      const err = e as AppError & { details?: unknown };
      return { status: err.statusCode, code: err.errorCode, details: err.details };
    }
    throw new Error('não lançou');
  };

  it.each<[string, DpModuleKey, DpModuleKey[], number | null, string | null]>([
    ['sem dependência', 'DP-PONTO', [], null, null],
    ['dependências todas ativas', 'DP-APP', ['DP-PONTO', 'DP-BEN'], null, null],
    ['uma dependência faltando', 'DP-APP', ['DP-PONTO'], 400, 'DP_MODULE_MISSING_DEPENDENCY'],
    ['grupo requiresOneOf vazio', 'DP-BI', ['DP-PONTO'], 400, 'DP_MODULE_REQUIRES_ONE_OF'],
    ['grupo requiresOneOf com um ativo', 'DP-BI', ['DP-GED'], null, null],
    ['indisponível', 'DP-CAT', [], 409, 'DP_MODULE_UNAVAILABLE'],
  ])('%s', (_caso, pedido, ativos, status, code) => {
    if (status === null) {
      expect(resolveDpModuleActivation(pedido, ativos, reg).key).toBe(pedido);
    } else {
      expect(erro(() => resolveDpModuleActivation(pedido, ativos, reg))).toMatchObject({ status, code });
    }
  });

  it('dependência faltante lista TODOS os faltantes no detalhe (spec §3 regra 2)', () => {
    expect(erro(() => resolveDpModuleActivation('DP-APP', [], reg)).details).toMatchObject({
      reason: 'DP_MODULE_MISSING_DEPENDENCY',
      missingModules: ['DP-PONTO', 'DP-BEN'],
    });
  });

  it('o registro real recusa todos com DP_MODULE_UNAVAILABLE (nenhum opcional implementado no F0)', () => {
    for (const k of DP_MODULE_KEYS) expect(erro(() => resolveDpModuleActivation(k, [])).code).toBe('DP_MODULE_UNAVAILABLE');
  });
});
