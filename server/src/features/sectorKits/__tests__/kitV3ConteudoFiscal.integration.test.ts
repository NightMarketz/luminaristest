/**
 * BE-INCR-KIT-SETOR-EMENDA-1, PR-K2 (itens 5, 6 e 8; F-KE-1 a, F-KE-2 a, F-PCB-1R a — dono, 13/10) — o kit v3 PUBLICADO
 * do salão e da clínica, instalado pelo registro real:
 *  - item 5: cria as 8 contas de imposto e mapeia todas as folhas no referencial 2025 (23/23: nenhuma folha ativa sem
 *    mapeamento, F7) em Presumido e em Real;
 *  - item 6: preenche as contas do perfil fiscal (PIS/COFINS → deduções 3.6.1/3.6.2, aceitas pelo validador do #649) e
 *    NÃO sobrescreve o campo que o usuário já escolheu.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import { BEAUTY_SALON_KIT_V4 } from '@/features/sectorKits/kits/beautySalon/kit.v4';
import { AESTHETIC_CLINIC_KIT_V4 } from '@/features/sectorKits/kits/aestheticClinic/kit.v4';
import { CANONICAL_ACCOUNTS } from '@/features/accounting/fixtures/ChartOfAccountsFixture';

const UNIT = 'unit-kit-v3';
const TODAY = new Date().toISOString().slice(0, 10);
let ownerId: string;

const scope = (): BindingScope => ({ ownerUserId: ownerId, actorUserId: ownerId, unitId: UNIT });
const where = () => ({ userId: ownerId, unitId: UNIT });
// `install(kitKey)` instala a versão VIGENTE: desde a emenda 3.3 (PR-1) é a v4, que herda todo o conteúdo fiscal do v3.
const KITS = [BEAUTY_SALON_KIT_V4, AESTHETIC_CLINIC_KIT_V4];
const T = 60000; // resetDb + instalação dos 7 passos passa de 5 s no Windows

async function preparar(regime: 'PRESUMIDO' | 'REAL', perfil: Record<string, unknown> = {}) {
  await resetDb();
  ownerId = (await prisma.user.create({ data: { name: 'kitv3', username: 'kit-v3-dono', email: 'kitv3@test.local', password: 'x', role: 'USER' } })).id;
  const codigos = [...new Set(KITS.flatMap((k) => k.referential.flatMap((b) => b.entries.map((e) => e.referentialCode))))];
  for (const code of codigos) await prisma.referentialAccount.create({ data: { layoutVersion: '2025', code, name: code, isAnalytic: true } });
  await prisma.fiscalProfile.create({
    data: { ...where(), regimeTributario: regime, pisCofinsRegime: regime === 'REAL' ? 'NAO_CUMULATIVO' : 'CUMULATIVO', d1fConfirmado: false, ...perfil },
  });
}

const instalar = (kitKey: string) =>
  ApplicationFactory.getInstance()
    .getKitInstallService(scope())
    .install(scope(), { kitKey, ano: 2025, installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: TODAY });

/** Mesma conta do gate da ECD que o `kitV2Referencial` refaz no banco (a fronteira não deixa importar o serviço). */
async function cobertura() {
  const folhas = await prisma.account.findMany({ where: { ...where(), acceptsEntries: true, deletedAt: null }, select: { id: true, code: true } });
  const mapeadas = new Set((await prisma.referentialMapping.findMany({ where: { ...where(), mappingVersion: '2025' }, select: { accountId: true } })).map((m) => m.accountId));
  return { folhas: folhas.length, faltam: folhas.filter((f) => !mapeadas.has(f.id)).map((f) => f.code) };
}

const codigo = async (id: string | null) => (id ? (await prisma.account.findUniqueOrThrow({ where: { id } })).code : null);

describe('kit v3 — conteúdo fiscal (BE-INCR-KIT-SETOR-EMENDA-1 PR-K2)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());

  describe.each(KITS.map((k) => k.kitKey))('%s', (kitKey) => {
    it.each(['PRESUMIDO', 'REAL'] as const)('%s: 8 contas de imposto, cobertura 2025 completa e perfil fiscal preenchido (itens 5–6)', async (regime) => {
      await preparar(regime);
      await expect(instalar(kitKey)).resolves.toMatchObject({ status: 'INSTALLED', kit: { kitKey, kitVersion: 4 } });

      const novas = await prisma.account.findMany({
        where: { ...where(), code: { in: ['2.1.3', '2.1.4', '2.1.5', '2.1.6', '3.6.1', '3.6.2', '4.5.1', '4.5.2'] } },
        select: { code: true, nature: true },
        orderBy: { code: 'asc' },
      });
      expect(novas.map((a) => `${a.code}:${a.nature}`)).toEqual([
        '2.1.3:Liability', '2.1.4:Liability', '2.1.5:Liability', '2.1.6:Liability',
        '3.6.1:Revenue', '3.6.2:Revenue', '4.5.1:Expense', '4.5.2:Expense',
      ]);
      // 23 do v3 + as 9 folhas da emenda 3.3, que o v4 mapeia (F-HR-4 a).
      expect(await cobertura()).toEqual({ folhas: 32, faltam: [] });

      const p = await prisma.fiscalProfile.findFirstOrThrow({ where: where() });
      expect({
        irpjRecolher: await codigo(p.irpjRecolherAccountId),
        csllRecolher: await codigo(p.csllRecolherAccountId),
        pisRecolher: await codigo(p.pisRecolherAccountId),
        cofinsRecolher: await codigo(p.cofinsRecolherAccountId),
        irpjDespesa: await codigo(p.irpjDespesaAccountId),
        csllDespesa: await codigo(p.csllDespesaAccountId),
        pisDespesa: await codigo(p.pisDespesaAccountId),
        cofinsDespesa: await codigo(p.cofinsDespesaAccountId),
      }).toEqual({
        irpjRecolher: '2.1.3', csllRecolher: '2.1.4', pisRecolher: '2.1.5', cofinsRecolher: '2.1.6',
        irpjDespesa: '4.5.1', csllDespesa: '4.5.2', pisDespesa: '3.6.1', cofinsDespesa: '3.6.2',
      });
    }, T);
  });

  it('item 6 (F13): campo do perfil já escolhido pelo usuário não é sobrescrito; os nulos são preenchidos', async () => {
    await preparar('PRESUMIDO');
    // plano já existente (o passo 1 só instala o canônico em plano vazio) + a conta que o usuário escolheu
    for (const c of CANONICAL_ACCOUNTS) await prisma.account.create({ data: { ...where(), ...c } });
    const escolhida = (await prisma.account.create({ data: { ...where(), code: '2.1.9', name: 'PIS a recolher (do usuário)', nature: 'Liability', acceptsEntries: true } })).id;
    await prisma.fiscalProfile.update({ where: { userId_unitId: where() }, data: { pisRecolherAccountId: escolhida } });

    await expect(instalar('beautySalon')).resolves.toMatchObject({ status: 'INSTALLED' });
    const p = await prisma.fiscalProfile.findFirstOrThrow({ where: where() });
    expect(p.pisRecolherAccountId).toBe(escolhida);
    expect(await codigo(p.cofinsRecolherAccountId)).toBe('2.1.6');
  }, T);
});
