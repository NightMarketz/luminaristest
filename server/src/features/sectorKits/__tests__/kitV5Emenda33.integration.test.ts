/**
 * Emenda 3.3 (BE-INCR-ENCARGOS-DESCONTOS) PR-1 — F-HR-4 a (dono 11/10), "a próxima versão" (dono, 13/10; v4 já publicado pelo PR-K3): o kit v5 do
 * salão e da clínica mapeia as 9 folhas novas do canônico; instalação nova sai com a ECD pronta (32/32).
 *
 * (Base copiada do teste do v3.) BE-INCR-KIT-SETOR-EMENDA-1, PR-K2 (itens 5, 6 e 8; F-KE-1 a, F-KE-2 a, F-PCB-1R a — dono, 13/10) — o kit v3 PUBLICADO
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
import { BEAUTY_SALON_KIT_V5 } from '@/features/sectorKits/kits/beautySalon/kit.v5';
import { AESTHETIC_CLINIC_KIT_V5 } from '@/features/sectorKits/kits/aestheticClinic/kit.v5';
import { CANONICAL_ACCOUNTS_PRE_L8 } from '@/features/accounting/fixtures/ChartOfAccountsFixture';
import { KIT_REGISTRY } from '@/features/sectorKits/registry';

const UNIT = 'unit-kit-v5';
const TODAY = new Date().toISOString().slice(0, 10);
let ownerId: string;

const scope = (): BindingScope => ({ ownerUserId: ownerId, actorUserId: ownerId, unitId: UNIT });
const where = () => ({ userId: ownerId, unitId: UNIT });
const KITS = [BEAUTY_SALON_KIT_V5, AESTHETIC_CLINIC_KIT_V5];
const T = 60000; // resetDb + instalação dos 7 passos passa de 5 s no Windows

async function preparar(regime: 'PRESUMIDO' | 'REAL', perfil: Record<string, unknown> = {}) {
  await resetDb();
  ownerId = (await prisma.user.create({ data: { name: 'kitv5', username: 'kit-v5-dono', email: 'kitv5@test.local', password: 'x', role: 'USER' } })).id;
  const codigos = [...new Set(KITS.flatMap((k) => k.referential.flatMap((b) => b.entries.map((e) => e.referentialCode))))];
  for (const code of codigos) await prisma.referentialAccount.create({ data: { layoutVersion: '2025', code, name: code, isAnalytic: true } });
  await prisma.fiscalProfile.create({
    data: { ...where(), regimeTributario: regime, pisCofinsRegime: regime === 'REAL' ? 'NAO_CUMULATIVO' : 'CUMULATIVO', d1fConfirmado: false, ...perfil },
  });
  // BE-INCR-PLANO-4-NIVEIS (F-L8-9 a): o v5 é do plano de 3 níveis — a unidade nasce no plano da época.
  await prisma.account.createMany({ data: CANONICAL_ACCOUNTS_PRE_L8.map((a) => ({ ...where(), ...a })) });
}

const instalar = (kitKey: string) =>
  ApplicationFactory.getInstance()
    // a v6 (L8) é a vigente; este teste prende o registro no v5 publicado
    .getKitInstallService(scope(), (k) => KIT_REGISTRY[k]?.filter((v) => v.kitVersion <= 5))
    .install(scope(), { kitKey, ano: 2025, installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: TODAY });

/** Mesma conta do gate da ECD que o `kitV2Referencial` refaz no banco (a fronteira não deixa importar o serviço). */
async function cobertura() {
  const folhas = await prisma.account.findMany({ where: { ...where(), acceptsEntries: true, deletedAt: null }, select: { id: true, code: true } });
  const mapeadas = new Set((await prisma.referentialMapping.findMany({ where: { ...where(), mappingVersion: '2025' }, select: { accountId: true } })).map((m) => m.accountId));
  return { folhas: folhas.length, faltam: folhas.filter((f) => !mapeadas.has(f.id)).map((f) => f.code) };
}

const FOLHAS_EMENDA_3_3 = ['3.5.1', '3.5.2', '3.5.3', '4.3.1', '4.3.2', '4.3.3', '4.4.1', '4.4.2', '4.6'];

const codigo = async (id: string | null) => (id ? (await prisma.account.findUniqueOrThrow({ where: { id } })).code : null);

describe('kit v5 — referencial das 9 folhas da emenda 3.3 (F-HR-4 a)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());

  describe.each(KITS.map((k) => k.kitKey))('%s', (kitKey) => {
    it.each(['PRESUMIDO', 'REAL'] as const)('%s: conteúdo do v3 + cobertura 2025 32/32 com o referencial da PROPOSTA §1.2', async (regime) => {
      await preparar(regime);
      await expect(instalar(kitKey)).resolves.toMatchObject({ status: 'INSTALLED', kit: { kitKey, kitVersion: 5 } });

      const novas = await prisma.account.findMany({
        where: { ...where(), code: { in: ['2.1.3', '2.1.4', '2.1.5', '2.1.6', '3.6.1', '3.6.2', '4.5.1', '4.5.2'] } },
        select: { code: true, nature: true },
        orderBy: { code: 'asc' },
      });
      expect(novas.map((a) => `${a.code}:${a.nature}`)).toEqual([
        '2.1.3:Liability', '2.1.4:Liability', '2.1.5:Liability', '2.1.6:Liability',
        '3.6.1:Revenue', '3.6.2:Revenue', '4.5.1:Expense', '4.5.2:Expense',
      ]);
      expect(await cobertura()).toEqual({ folhas: 32, faltam: [] });
      const ref = await prisma.referentialMapping.findMany({
        where: { ...where(), mappingVersion: '2025', account: { code: { in: FOLHAS_EMENDA_3_3 } } },
        select: { referentialCode: true, account: { select: { code: true } } },
      });
      expect(Object.fromEntries(ref.map((r) => [r.account.code, r.referentialCode]))).toEqual({
        '3.5.1': '3.01.01.05.01.05', '3.5.2': '3.01.01.05.01.05', '3.5.3': '3.01.01.05.01.05',
        '4.3.1': '3.01.01.09.01.08', '4.3.2': '3.01.01.07.01.22', '4.3.3': '3.01.01.09.01.08',
        '4.4.1': '3.01.01.07.01.22', '4.4.2': '3.01.01.07.01.22', '4.6': '3.01.01.07.01.04',
      });

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
});
