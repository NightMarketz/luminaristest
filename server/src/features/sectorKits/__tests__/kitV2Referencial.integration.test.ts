/**
 * BE-INCR-H1-REFERENCIAL-3-4 PR-2 (item 11; F-HR-1 a, F-HR-2 a) — o kit PUBLICADO do salão, instalado pelo registro
 * real, deixa a cobertura referencial 2025 pronta em Presumido e em Real: a ECD da unidade nova nasce sem o 400
 * `unmappedAccounts` que parou o H1 no P5. Sem regime de ECD (Simples) o passo 7 não escreve nada (F-HR-2 a).
 * BE-INCR-PLANO-4-NIVEIS: o plano instalado é o de 4 níveis, e um kit do plano de 3 níveis (v1–v5) não cabe nele; o
 * teste passa a prender a v6, que cobre todas as folhas (canônico + conteúdo fiscal + emenda 3.3).
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import { BEAUTY_SALON_KIT_V6 } from '@/features/sectorKits/kits/beautySalon/kit.v6';

// Literais: a fronteira do sectorKits não importa de features/accounting (importBoundary.test). Mesmos de REFERENCIAL_PLANO_PADRAO.
const REFERENCIAL_PLANO_PADRAO_CODIGOS = ['2.01.01.17.13.10', '2.01.01.17.12.10', '2.01.01.09.01', '2.03.01.01.01', '2.03.02.03.01', '3.01.01.09.01.04', '2.01.01.09.28'];
const UNIT = 'unit-kit-v2';
const TODAY = new Date().toISOString().slice(0, 10);
let ownerId: string;

const scope = (): BindingScope => ({ ownerUserId: ownerId, actorUserId: ownerId, unitId: UNIT });
const where = () => ({ userId: ownerId, unitId: UNIT });

async function preparar(regime: 'PRESUMIDO' | 'REAL' | 'SIMPLES') {
  await resetDb();
  ownerId = (await prisma.user.create({ data: { name: 'kitv2', username: 'kit-v2-dono', email: 'kitv2@test.local', password: 'x', role: 'USER' } })).id;
  // catálogo 2025: os códigos do kit, analíticos (o passo 7 exige catálogo carregado; o serviço revalida o código)
  // + o referencial das folhas do plano padrão que o kit não traz (IRRF-DISTRIBUICAO PR-1 item 6, `ensureCanonicalMappings`).
  const codigos = [...new Set([...BEAUTY_SALON_KIT_V6.referential.flatMap((b) => b.entries.map((e) => e.referentialCode)), ...REFERENCIAL_PLANO_PADRAO_CODIGOS])];
  for (const code of codigos) await prisma.referentialAccount.create({ data: { layoutVersion: '2025', code, name: code, isAnalytic: true } });
  await prisma.fiscalProfile.create({
    // A v6 preenche o perfil fiscal (passo 3), que valida o regime: o Simples exige pisCofinsRegime SIMPLES e sem ICMS.
    data: {
      ...where(),
      regimeTributario: regime,
      pisCofinsRegime: regime === 'REAL' ? 'NAO_CUMULATIVO' : regime === 'SIMPLES' ? 'SIMPLES' : 'CUMULATIVO',
      ...(regime === 'SIMPLES' ? { icmsContribuinte: false } : {}),
      d1fConfirmado: false,
    },
  });
}

const instalar = () =>
  ApplicationFactory.getInstance()
    // a v6 (BE-INCR-PLANO-4-NIVEIS) é a versão vigente; o registro fica preso nela
    .getKitInstallService(scope(), () => [BEAUTY_SALON_KIT_V6])
    .install(scope(), { kitKey: 'beautySalon', ano: 2025, installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: TODAY });

/** Cobertura como o gate da ECD conta (`ReferentialMappingService.coverage`): folhas vivas sem mapeamento 2025. A fronteira
 * do sectorKits não deixa importar o serviço de `features/accounting`, então a conta é refeita no banco. */
async function cobertura() {
  const folhas = await prisma.account.findMany({ where: { ...where(), acceptsEntries: true, deletedAt: null }, select: { id: true, code: true } });
  const mapeadas = new Set((await prisma.referentialMapping.findMany({ where: { ...where(), mappingVersion: '2025' }, select: { accountId: true } })).map((m) => m.accountId));
  return { folhas: folhas.length, faltam: folhas.filter((f) => !mapeadas.has(f.id)).map((f) => f.code) };
}

describe('kit vigente do salão (v6) — referencial 2025 (BE-INCR-H1-REFERENCIAL-3-4 PR-2; BE-INCR-PLANO-4-NIVEIS)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());

  it.each(['PRESUMIDO', 'REAL'] as const)('%s: instalação da v6 publicada ⇒ todas as folhas cobertas, 3.4 → 3.01.01.01.01.98', async (regime) => {
    await preparar(regime);
    await expect(instalar()).resolves.toMatchObject({ status: 'INSTALLED' });
    const c = await cobertura();
    // 32 folhas do canônico (15 + as 9 da emenda 3.3 + as 6 do IRRF-DISTRIBUICAO + IBS/CBS a recolher do IBS-CBS-2027 PR-2,
    // mapeadas fora do kit) + as 8 do conteúdo
    // fiscal, todas mapeadas.
    expect(c).toEqual({ folhas: 40, faltam: [] });
    const conta34 = await prisma.account.findFirstOrThrow({ where: { ...where(), code: '3.4' } });
    const m = await prisma.referentialMapping.findFirstOrThrow({ where: { ...where(), accountId: conta34.id, mappingVersion: '2025' } });
    expect(m.referentialCode).toBe('3.01.01.01.01.98');
  });

  it('SIMPLES (F-HR-2 a): sem bloco do regime, o passo 7 não grava mapeamento', async () => {
    await preparar('SIMPLES');
    await expect(instalar()).resolves.toMatchObject({ status: 'INSTALLED' });
    expect(await prisma.referentialMapping.count({ where: where() })).toBe(0);
  });
});
