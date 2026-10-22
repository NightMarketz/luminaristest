/**
 * BE-INCR-PLANO-4-NIVEIS, PR-2 (itens 8–10 do BRIEF) contra o `test-integration.db` real: um tenant no plano canônico
 * de 3 níveis (o de antes da L8), com lançamentos, binding Active V1 e kit v2 instalado, migra para o de 4 níveis.
 * Compile do binding = o `BindingCompileService` real da factory (o mesmo da CLI), nunca um dublê; o upgrade do kit até
 * o v5 (F-L8-12 a) = o `KitUpgradeService` real, com o registro preso no v5 como na CLI.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import {
  CANONICAL_ACCOUNTS,
  REFERENCIAL_PLANO_PADRAO,
  CANONICAL_ACCOUNTS_PRE_L8,
  RENOMEACAO_CANONICA_L8,
} from '@/features/accounting/fixtures/ChartOfAccountsFixture';
import { SALE_BINDING_V1 } from '@/features/accountingBinding/fixtures/saleBinding';
import { CONTAS_FISCAIS, CONTAS_FISCAIS_V2, RENOMEACAO_FISCAL_L8 } from '@/features/sectorKits/kits/_shared/conteudoFiscalCanonico';
import { KIT_REGISTRY } from '@/features/sectorKits/registry';
import { migrarUnidade, ULTIMA_VERSAO_KIT_PRE_L8, type CompileFn, type UpgradeAteV5Fn } from '../migratePlano4NiveisCli';

const UNIT = 'unit-l8';
let n = 0;
const compile: CompileFn = (s, input) => ApplicationFactory.getInstance().getAccountingBindingCompileService(s).compile(s, input);
const upgrade: UpgradeAteV5Fn = (s, mode, deployId) =>
  ApplicationFactory.getInstance()
    .getKitUpgradeService(s, (k) => KIT_REGISTRY[k]?.filter((v) => v.kitVersion <= ULTIMA_VERSAO_KIT_PRE_L8))
    .upgrade(s, { mode, deployId, actor: 'teste' });
const migrar = (scope: Parameters<typeof migrarUnidade>[1]) => migrarUnidade(prisma, scope, compile, upgrade);
const PRE_L8_COM_FISCAIS = [...CANONICAL_ACCOUNTS_PRE_L8, ...CONTAS_FISCAIS].map((a) => a.code).sort();

async function tenantNoPlanoAntigo(extras: { code: string; name: string; nature: string; acceptsEntries: boolean }[] = []) {
  n += 1;
  const u = await prisma.user.create({ data: { name: `l8-${n}`, username: `l8-${n}`, email: `l8-${n}@test.local`, password: 'x', role: 'USER' } });
  const ids: Record<string, string> = {};
  for (const a of [...CANONICAL_ACCOUNTS_PRE_L8, ...extras]) {
    const row = await prisma.account.create({ data: { userId: u.id, unitId: UNIT, code: a.code, name: a.name, nature: a.nature, acceptsEntries: a.acceptsEntries } });
    ids[a.code] = row.id;
  }
  // Venda e liquidação: D A Receber / C Receita; D Banco / C A Receber; D Pacotes / C 3.4.
  const lancar = async (desc: string, d: string, c: string, cents: bigint) => {
    const e = await prisma.journalEntry.create({ data: { userId: u.id, unitId: UNIT, date: new Date('2026-01-15T00:00:00Z'), description: desc, status: 'Posted' } });
    await prisma.posting.createMany({
      data: [
        { userId: u.id, unitId: UNIT, entryId: e.id, accountId: ids[d], debitCents: cents, creditCents: 0n },
        { userId: u.id, unitId: UNIT, entryId: e.id, accountId: ids[c], debitCents: 0n, creditCents: cents },
      ],
    });
  };
  await lancar('venda', '1.1.2', '3.1', 50000n);
  await lancar('recebimento', '1.1.1', '1.1.2', 30000n);
  await lancar('pacote vencido', '2.1.1', '3.4', 7000n);
  await prisma.accountingBinding.create({
    data: {
      userId: u.id, unitId: UNIT, sectorKey: 'beautySalon', bindingVersion: 1, compiledAt: new Date('2026-08-21T00:00:00Z'),
      compiledFromHash: SALE_BINDING_V1.compiledFromHash, payload: JSON.stringify(SALE_BINDING_V1), status: 'Active',
    },
  });
  // Período corrente aberto: o recompile do binding faz dry-run de lançamento (pré-condição da migração).
  const hoje = new Date();
  await prisma.accountingPeriod.create({ data: { userId: u.id, unitId: UNIT, year: hoje.getUTCFullYear(), month: hoje.getUTCMonth() + 1, status: 'OPEN' } });
  await prisma.kitInstallation.create({
    data: { userId: u.id, unitId: UNIT, kitKey: 'beautySalon', kitVersion: 2, status: 'INSTALLED', steps: '{"lastCompletedStep":7,"warnings":[]}' },
  });
  // O upgrade até o v5 preenche o perfil fiscal (o v3 exige perfil na unidade, E-5).
  await prisma.fiscalProfile.create({ data: { userId: u.id, unitId: UNIT, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false } });
  return { userId: u.id, ids, scope: { ownerUserId: u.id, actorUserId: u.id, unitId: UNIT } };
}

const saldo = async (accountId: string) => {
  const r = await prisma.posting.aggregate({ where: { accountId }, _sum: { debitCents: true, creditCents: true } });
  return `${r._sum.debitCents}/${r._sum.creditCents}`;
};

// Folhas novas do plano padrão criadas DEPOIS da L8 (IRRF-DISTRIBUICAO PR-1 item 6): não são renomeação, a migração não as
// cria — nascem no próximo `ensureChartOfAccounts` (create-if-missing). As sintéticas delas a migração cria (item b).
const FOLHAS_POS_L8 = new Set(REFERENCIAL_PLANO_PADRAO.map((e) => e.accountCode));

describe('migratePlano4NiveisCli (integração)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await resetDb();
    // Catálogo 2025 com os códigos do v5 (o passo do referencial no upgrade revalida o código).
    const v5 = KIT_REGISTRY.beautySalon.find((k) => k.kitVersion === ULTIMA_VERSAO_KIT_PRE_L8)!;
    for (const code of new Set(v5.referential.flatMap((b) => b.entries.map((e) => e.referentialCode)))) {
      await prisma.referentialAccount.create({ data: { layoutVersion: '2025', code, name: code, isAnalytic: true } });
    }
  }, 120000);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('kit v2: upgrade real até o v5, renomeia por id, cria as sintéticas, preserva o saldo, recompila o binding e leva o kit à v6', async () => {
    const t = await tenantNoPlanoAntigo();
    const antes = await Promise.all(['1.1.1', '1.1.2', '2.1.1'].map((c) => saldo(t.ids[c])));

    const rel = await migrar(t.scope);

    // F-L8-12 (a): o conteúdo do v3–v5 chega antes da renomeação, então as contas fiscais também são renomeadas.
    expect(rel.kitPreparado).toEqual({ kitKey: 'beautySalon', de: 2, para: 5, pendenciasAnoCongelado: [] });
    expect(rel.renomeadas).toEqual([...RENOMEACAO_CANONICA_L8, ...RENOMEACAO_FISCAL_L8].map((r) => ({ de: r.de, para: r.para })));
    expect(rel.saldoAntesDepoisIgual).toBe(true);
    // Mesmo id, código novo, saldo igual.
    const banco = await prisma.account.findUniqueOrThrow({ where: { id: t.ids['1.1.1'] } });
    expect(banco.code).toBe('1.1.1.01');
    expect(await Promise.all(['1.1.1', '1.1.2', '2.1.1'].map((c) => saldo(t.ids[c])))).toEqual(antes);
    // O plano vivo é exatamente o canônico de 4 níveis (sem conta nova vazia ao lado da antiga).
    const vivo = await prisma.account.findMany({ where: { userId: t.userId, unitId: UNIT, deletedAt: null }, orderBy: { code: 'asc' } });
    expect(vivo.map((a) => `${a.code}:${a.acceptsEntries}`).sort()).toEqual(
      [...CANONICAL_ACCOUNTS.filter((a) => !FOLHAS_POS_L8.has(a.code)), ...CONTAS_FISCAIS_V2].map((a) => `${a.code}:${a.acceptsEntries}`).sort(),
    );
    // O perfil fiscal recebeu as contas-padrão do v3 (campo nulo) e segue nelas depois da renomeação.
    const perfil = await prisma.fiscalProfile.findFirstOrThrow({ where: { userId: t.userId, unitId: UNIT } });
    expect((await prisma.account.findUniqueOrThrow({ where: { id: perfil.pisRecolherAccountId! } })).code).toBe('2.1.3.03');
    // Binding: o V1 vira Superseded; o Active usa os códigos novos.
    expect(rel.bindingRecompilado).toEqual({ de: 1, para: 2 });
    const ativo = await prisma.accountingBinding.findFirstOrThrow({ where: { userId: t.userId, unitId: UNIT, status: 'Active' } });
    expect(ativo.payload).toContain('"1.1.2.01"');
    expect(ativo.payload).not.toMatch(/"accountCode":"1\.1\.2"/);
    expect(await prisma.accountingBinding.count({ where: { userId: t.userId, unitId: UNIT, status: 'Superseded' } })).toBe(1);
    expect(rel.kitAtualizado).toEqual({ kitKey: 'beautySalon', de: 5, para: 6 });
  });

  it('kit v5 (conteúdo fiscal do #652): a recolher vai para 2.1.3.01–.04, nascem 2.1.3/3.6/4.5, o perfil fiscal segue nas mesmas contas', async () => {
    const t = await tenantNoPlanoAntigo([...CONTAS_FISCAIS]);
    await prisma.kitInstallation.updateMany({ where: { userId: t.userId }, data: { kitVersion: 5 } });
    await prisma.fiscalProfile.updateMany({
      where: { userId: t.userId, unitId: UNIT },
      data: {
        irpjRecolherAccountId: t.ids['2.1.3'], csllRecolherAccountId: t.ids['2.1.4'],
        pisRecolherAccountId: t.ids['2.1.5'], cofinsRecolherAccountId: t.ids['2.1.6'],
        irpjDespesaAccountId: t.ids['4.5.1'], pisDespesaAccountId: t.ids['3.6.1'],
      },
    });
    // Apuração do PIS: D 3.6.1 / C 2.1.5.
    const e = await prisma.journalEntry.create({ data: { userId: t.userId, unitId: UNIT, date: new Date('2026-01-31T00:00:00Z'), description: 'pis', status: 'Posted' } });
    await prisma.posting.createMany({
      data: [
        { userId: t.userId, unitId: UNIT, entryId: e.id, accountId: t.ids['3.6.1'], debitCents: 3250n, creditCents: 0n },
        { userId: t.userId, unitId: UNIT, entryId: e.id, accountId: t.ids['2.1.5'], debitCents: 0n, creditCents: 3250n },
      ],
    });
    const antes = await saldo(t.ids['2.1.5']);

    const rel = await migrar(t.scope);

    expect(rel.renomeadas).toEqual([...RENOMEACAO_CANONICA_L8, ...RENOMEACAO_FISCAL_L8].map((r) => ({ de: r.de, para: r.para })));
    expect(rel.criadas).toEqual(expect.arrayContaining(['2.1.3', '3.6', '4.5']));
    expect(rel.saldoAntesDepoisIgual).toBe(true);
    expect((await prisma.account.findUniqueOrThrow({ where: { id: t.ids['2.1.5'] } })).code).toBe('2.1.3.03');
    expect(await saldo(t.ids['2.1.5'])).toBe(antes);
    // Perfil fiscal aponta por id: as mesmas contas, agora com o código novo.
    const perfil = await prisma.fiscalProfile.findFirstOrThrow({ where: { userId: t.userId, unitId: UNIT } });
    expect([perfil.irpjRecolherAccountId, perfil.pisRecolherAccountId]).toEqual([t.ids['2.1.3'], t.ids['2.1.5']]);
    // O plano vivo é o canônico de 4 níveis + a extensão fiscal da v6, nada mais.
    const vivo = await prisma.account.findMany({ where: { userId: t.userId, unitId: UNIT, deletedAt: null } });
    const esperado = [...CANONICAL_ACCOUNTS.filter((a) => !FOLHAS_POS_L8.has(a.code)), ...CONTAS_FISCAIS_V2].map((a) => `${a.code}:${a.acceptsEntries}`).sort();
    expect(vivo.map((a) => `${a.code}:${a.acceptsEntries}`).sort()).toEqual(esperado);
    expect(rel.personalizadasNaoTocadas).toEqual([]);
    expect(rel.kitPreparado).toBeNull();
    expect(rel.kitAtualizado).toEqual({ kitKey: 'beautySalon', de: 5, para: 6 });

    const again = await migrar(t.scope);
    expect(again).toMatchObject({ renomeadas: [], criadas: [], bindingRecompilado: null, kitAtualizado: null });
  });

  it('F-L8-12 (a): forward ou conflito no dry-run do upgrade ⇒ recusa sem aplicar e sem renomear', async () => {
    const t = await tenantNoPlanoAntigo();
    const chamadas: string[] = [];
    const comConflito: UpgradeAteV5Fn = async (s, mode, deployId) => {
      chamadas.push(mode);
      const out = await upgrade(s, mode, deployId);
      if (out.status === 'UP_TO_DATE') return out;
      // Um conflito que NÃO é de ano congelado (a exceção do F-L8-13 não o alcança).
      const outro = { reason: 'account_changed_in_use' as const, itemKey: 'account:2.1.3', kitValue: null, tenantValue: null };
      return {
        ...out,
        run: { ...out.run, counts: { ...out.run.counts, conflicts: out.run.counts.conflicts + 1 } },
        report: { ...out.report, conflict: [...out.report.conflict, outro] },
      };
    };

    await expect(migrarUnidade(prisma, t.scope, compile, comConflito)).rejects.toThrow(/1 conflito\(s\)[\s\S]*nada foi alterado/);

    expect(chamadas).toEqual(['DRY_RUN']);
    const codes = (await prisma.account.findMany({ where: { userId: t.userId, deletedAt: null } })).map((a) => a.code).sort();
    expect(codes).toEqual(CANONICAL_ACCOUNTS_PRE_L8.map((a) => a.code).sort());
    expect((await prisma.kitInstallation.findFirstOrThrow({ where: { userId: t.userId } })).kitVersion).toBe(2);
  });

  it('F-L8-13 (a): 2025 congelado (mês HARD_CLOSED) ⇒ o de-para de 2025 vira pendência do kit e a unidade migra', async () => {
    const t = await tenantNoPlanoAntigo();
    await prisma.accountingPeriod.create({ data: { userId: t.userId, unitId: UNIT, year: 2025, month: 12, status: 'HARD_CLOSED' } });
    // O upgrade só olha os anos que o tenant já mapeou: um de-para de 2025 existente põe 2025 no diff.
    await prisma.referentialMapping.create({
      data: { userId: t.userId, unitId: UNIT, accountId: t.ids['3.1'], referentialCode: '3.01.01.01.01.01', label: 'Receita de serviços', mappingVersion: '2025' },
    });

    const rel = await migrar(t.scope);

    expect(rel.kitPreparado?.para).toBe(5);
    expect(rel.kitPreparado!.pendenciasAnoCongelado.length).toBeGreaterThan(0);
    expect(rel.kitPreparado!.pendenciasAnoCongelado.every((k) => k.startsWith('referential:2025:'))).toBe(true);
    const pend = await prisma.kitUpgradePending.findMany({ where: { userId: t.userId, unitId: UNIT } });
    expect(pend.map((p) => p.itemKey).sort()).toEqual([...rel.kitPreparado!.pendenciasAnoCongelado].sort());
    expect(rel.kitAtualizado).toEqual({ kitKey: 'beautySalon', de: 5, para: 6 });
    expect((await prisma.account.findFirstOrThrow({ where: { userId: t.userId, unitId: UNIT, code: '2.1.3.01' } })).acceptsEntries).toBe(true);
  });

  it('rodar de novo não escreve nada (idempotente)', async () => {
    const t = await tenantNoPlanoAntigo();
    await migrar(t.scope);
    const contas = await prisma.account.count({ where: { userId: t.userId } });
    const bindings = await prisma.accountingBinding.count({ where: { userId: t.userId } });

    const rel = await migrar(t.scope);

    expect(rel).toMatchObject({ renomeadas: [], criadas: [], bindingRecompilado: null, kitPreparado: null, kitAtualizado: null });
    expect(await prisma.account.count({ where: { userId: t.userId } })).toBe(contas);
    expect(await prisma.accountingBinding.count({ where: { userId: t.userId } })).toBe(bindings);
  });

  it('conta patrimonial personalizada não é renomeada, só listada (F-L8-5 a)', async () => {
    const t = await tenantNoPlanoAntigo([{ code: '1.1.7', name: 'Adiantamento a Sócio', nature: 'Asset', acceptsEntries: true }]);
    const rel = await migrar(t.scope);
    expect(rel.personalizadasNaoTocadas).toEqual([{ code: '1.1.7', name: 'Adiantamento a Sócio' }]);
    expect((await prisma.account.findUniqueOrThrow({ where: { id: t.ids['1.1.7'] } })).code).toBe('1.1.7');
  });

  it('período corrente fechado: recusa ANTES de renomear (nada muda)', async () => {
    const t = await tenantNoPlanoAntigo();
    await prisma.accountingPeriod.updateMany({ where: { userId: t.userId }, data: { status: 'SOFT_CLOSED' } });
    await expect(migrar(t.scope)).rejects.toThrow(/pré-condição: o período .* precisa estar aberto/);
    const codes = (await prisma.account.findMany({ where: { userId: t.userId, deletedAt: null } })).map((a) => a.code).sort();
    expect(codes).toEqual(CANONICAL_ACCOUNTS_PRE_L8.map((a) => a.code).sort());
  });

  it('conflito de código desfaz a unidade inteira (nenhuma renomeação parcial)', async () => {
    // Uma conta '2.3.1.01' excluída ocupa o código de destino (o @@unique vale para a linha excluída também).
    const t = await tenantNoPlanoAntigo([{ code: '2.3.1.01', name: 'Antiga', nature: 'Equity', acceptsEntries: true }]);
    await prisma.account.update({ where: { id: t.ids['2.3.1.01'] }, data: { deletedAt: new Date() } });

    await expect(migrar(t.scope)).rejects.toThrow(/conflito: a unidade já tem uma conta '2.3.1.01'/);

    // O upgrade até o v5 comita sozinho (estado consistente do plano de 3 níveis); a renomeação não deixa nada parcial.
    const codes = (await prisma.account.findMany({ where: { userId: t.userId, deletedAt: null } })).map((a) => a.code).sort();
    expect(codes).toEqual(PRE_L8_COM_FISCAIS);
    expect((await prisma.kitInstallation.findFirstOrThrow({ where: { userId: t.userId } })).kitVersion).toBe(5);
  });
});
