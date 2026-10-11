/**
 * BE-INCR-H1-REFERENCIAL-3-4 PR-2 (item 11; F-HR-1 a, F-HR-2 a) — o kit v2 PUBLICADO do salão, instalado pelo registro
 * real, deixa a cobertura referencial 2025 pronta (15/15) em Presumido e em Real: a ECD da unidade nova nasce sem o 400
 * `unmappedAccounts` que parou o H1 no P5. Sem regime de ECD (Simples) o passo 7 não escreve nada (F-HR-2 a).
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import { BEAUTY_SALON_KIT_V2 } from '@/features/sectorKits/kits/beautySalon/kit.v2';

const UNIT = 'unit-kit-v2';
const TODAY = new Date().toISOString().slice(0, 10);
let ownerId: string;

const scope = (): BindingScope => ({ ownerUserId: ownerId, actorUserId: ownerId, unitId: UNIT });
const where = () => ({ userId: ownerId, unitId: UNIT });

async function preparar(regime: 'PRESUMIDO' | 'REAL' | 'SIMPLES') {
  await resetDb();
  ownerId = (await prisma.user.create({ data: { name: 'kitv2', username: 'kit-v2-dono', email: 'kitv2@test.local', password: 'x', role: 'USER' } })).id;
  // catálogo 2025: os códigos do kit, analíticos (o passo 7 exige catálogo carregado; o serviço revalida o código)
  const codigos = [...new Set(BEAUTY_SALON_KIT_V2.referential.flatMap((b) => b.entries.map((e) => e.referentialCode)))];
  for (const code of codigos) await prisma.referentialAccount.create({ data: { layoutVersion: '2025', code, name: code, isAnalytic: true } });
  await prisma.fiscalProfile.create({
    data: { ...where(), regimeTributario: regime, pisCofinsRegime: regime === 'REAL' ? 'NAO_CUMULATIVO' : 'CUMULATIVO', d1fConfirmado: false },
  });
}

const instalar = () =>
  ApplicationFactory.getInstance()
    .getKitInstallService(scope())
    .install(scope(), { kitKey: 'beautySalon', ano: 2025, installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: TODAY });

/** Cobertura como o gate da ECD conta (`ReferentialMappingService.coverage`): folhas vivas sem mapeamento 2025. A fronteira
 * do sectorKits não deixa importar o serviço de `features/accounting`, então a conta é refeita no banco. */
async function cobertura() {
  const folhas = await prisma.account.findMany({ where: { ...where(), acceptsEntries: true, deletedAt: null }, select: { id: true, code: true } });
  const mapeadas = new Set((await prisma.referentialMapping.findMany({ where: { ...where(), mappingVersion: '2025' }, select: { accountId: true } })).map((m) => m.accountId));
  return { folhas: folhas.length, faltam: folhas.filter((f) => !mapeadas.has(f.id)).map((f) => f.code) };
}

describe('kit v2 do salão — referencial 2025 (BE-INCR-H1-REFERENCIAL-3-4 PR-2)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());

  it.each(['PRESUMIDO', 'REAL'] as const)('%s: instalação do registro real ⇒ cobertura 2025 15/15, 3.4 → 3.01.01.01.01.98', async (regime) => {
    await preparar(regime);
    await expect(instalar()).resolves.toMatchObject({ status: 'INSTALLED' });
    const c = await cobertura();
    expect(c).toEqual({ folhas: 15, faltam: [] });
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
