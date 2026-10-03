/**
 * SEED-MY — integração (item 11 do BRIEF): seed sobre o `test-integration.db` real (sem mock de
 * Prisma, `ApplicationFactory.getInstance()` real) + tie-out, e a 2ª execução NÃO duplica (item 2 —
 * a assertiva é sobre a SEGUNDA chamada). "Hoje" é injetado (2026-03-10) — nunca o relógio real
 * (memória `teste-de-hoje-quebra-em-janela-utc`).
 *
 * BE-INCR-SEED-UNIDADE-E-ENV (itens 9–13, ERRATA): o tenant nasce com o salão inteiro e a unidade real, criados pelo
 * `SystemProvisioningService`; o razão fica sob o `unitId` GERADO (linha de `units`), não mais sob o literal
 * `seed-unit-*` — `--unit-id` virou o NOME da unidade. Tenant que já tem tabelas reaproveita a unidade de mesmo nome e
 * RECUSA se ela não existe; por isso os testes de "boot real" e `--years 2026` (outro nome de unidade sobre os mesmos
 * usuários) começam de um banco limpo (`resetDb`) — e a "queda no fechamento" roda logo depois do 1º teste, que lhe dá o estado.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import { SEED_TENANTS, seedTenant, tieOutPasses, type SeedAccountingArgs } from '../seedAccountingFixtureCli';
import { runCli as runActivateCli } from '../activateAccountingBindingCli';
import { scopeToday } from '@/features/accounting/models/dates';

const TODAY = '2026-03-10';
const ARGS: SeedAccountingArgs = { years: [2025, 2026], tenant: 'salon', seed: 1, unitId: 'seed-unit', iHaveABackup: true };

const tabelasDe = (userId: string) => prisma.dynamicTable.count({ where: { userId } });
const unidadesDe = async (userId: string) => {
  const t = await prisma.dynamicTable.findFirst({ where: { userId, internalName: 'units' } });
  return t ? prisma.dynamicTableData.findMany({ where: { dynamicTableId: t.id } }) : [];
};
const funisDe = async (userId: string) => {
  const t = await prisma.dynamicTable.findFirst({ where: { userId, internalName: 'leadPipelines' } });
  return t ? prisma.dynamicTableData.findMany({ where: { dynamicTableId: t.id } }) : [];
};

describe('seedAccountingFixtureCli (integração)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await resetDb();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('semeia os 2 tenants, fecha 2025, abre 2026 até hoje, e a 2ª execução não duplica — nem cria 2ª unidade nem tabelas', async () => {
    const services = ApplicationFactory.getInstance().services;

    const first = [];
    for (const [i, t] of SEED_TENANTS.entries()) first.push(await seedTenant(services, ARGS, i, t, 'senha-de-teste', TODAY));

    expect(tieOutPasses(first)).toBe(true);
    for (const r of first) {
      expect(r.closedYears).toEqual([2025]);
      expect(r.entriesCreated).toBeGreaterThan(0);
      expect(r.payablesCreated).toBe(2 * 15); // 12 meses de 2025 + jan..mar/2026
      expect(r.receivablesCreated).toBe(2 * 15);
    }

    const [presumido, real] = first;
    // uma unidade por tenant (boot aborta com dois bindings do salão na mesma unidade), agora uma linha REAL de `units`
    expect(presumido.unitId).not.toBe(real.unitId);
    for (const [r, nome] of [[presumido, 'seed-unit-presumido'], [real, 'seed-unit-real']] as const) {
      const unidades = await unidadesDe(r.userId);
      expect(unidades).toHaveLength(1);
      expect(unidades[0].id).toBe(r.unitId);
      expect(unidades[0].data).toMatchObject({ name: nome });
      // o plugin de `units` rodou (só roda no caminho de escrita normal): funil padrão de CRM existe
      expect((await funisDe(r.userId)).map((p) => (p.data as { name: string }).name)).toContain('Pipeline Padrão');
      // e TODO o razão está sob esse id
      expect(await prisma.journalEntry.count({ where: { userId: r.userId, unitId: { not: r.unitId } } })).toBe(0);
      expect(await prisma.journalEntry.count({ where: { userId: r.userId, unitId: r.unitId } })).toBeGreaterThan(0);
    }

    const periods2025 = await prisma.accountingPeriod.findMany({ where: { userId: real.userId, unitId: real.unitId, year: 2025 } });
    expect(periods2025).toHaveLength(12);
    expect(periods2025.every((p) => p.status === 'HARD_CLOSED')).toBe(true);

    const periods2026 = await prisma.accountingPeriod.findMany({ where: { userId: real.userId, unitId: real.unitId, year: 2026 }, orderBy: { month: 'asc' } });
    expect(periods2026.filter((p) => p.status === 'OPEN').map((p) => p.month)).toEqual([1, 2, 3]);
    expect(periods2026.filter((p) => p.month > 3).every((p) => p.status === 'FUTURE')).toBe(true);

    const closing = await prisma.journalEntry.findMany({ where: { userId: real.userId, sourceType: 'closing' } });
    expect(closing.map((e) => e.sourceId)).toEqual(['2025']);

    const profiles = await prisma.fiscalProfile.findMany({ where: { unitId: { in: [presumido.unitId, real.unitId] } } });
    expect(Object.fromEntries(profiles.map((p) => [p.userId, p.regimeTributario]))).toEqual({ [presumido.userId]: 'PRESUMIDO', [real.userId]: 'REAL' });

    // F-P4 (item 9): o seed passa o regime ao `provision` ⇒ nasce o perfil fiscal da EMPRESA do ano corrente (fuso do escopo)
    const anoAgora = Number(scopeToday({ timeZone: 'America/Sao_Paulo' }).slice(0, 4));
    const empresa = await prisma.companyFiscalProfile.findMany({ where: { userId: { in: [presumido.userId, real.userId] } } });
    expect(Object.fromEntries(empresa.map((p) => [p.userId, [p.regime, p.anoCalendario]]))).toEqual({
      [presumido.userId]: ['PRESUMIDO', anoAgora],
      [real.userId]: ['REAL', anoAgora],
    });

    const countsBefore = await Promise.all([prisma.journalEntry.count(), prisma.payable.count(), prisma.receivable.count(), prisma.user.count()]);
    const tablesBefore = await Promise.all(first.map((r) => tabelasDe(r.userId)));

    // 2ª execução — a assertiva que importa (item 2).
    const second = [];
    for (const [i, t] of SEED_TENANTS.entries()) second.push(await seedTenant(services, ARGS, i, t, 'senha-de-teste', TODAY));

    const countsAfter = await Promise.all([prisma.journalEntry.count(), prisma.payable.count(), prisma.receivable.count(), prisma.user.count()]);
    expect(countsAfter).toEqual(countsBefore);
    expect(await Promise.all(second.map((r) => tabelasDe(r.userId)))).toEqual(tablesBefore);
    for (const [k, r] of second.entries()) {
      expect(r.unitId).toBe(first[k].unitId); // reaproveitou a unidade de mesmo nome
      expect(await unidadesDe(r.userId)).toHaveLength(1);
      expect(r.entriesCreated).toBe(0);
      expect(r.payablesCreated).toBe(0);
      expect(r.receivablesCreated).toBe(0);
    }
    expect(tieOutPasses(second)).toBe(true);
  }, 300_000);

  it('tenant que já tem tabelas mas NENHUMA unidade com o nome pedido ⇒ recusa nomeada, sem instalar de novo', async () => {
    const services = ApplicationFactory.getInstance().services;
    const real = await prisma.user.findUniqueOrThrow({ where: { username: 'seed-real' } });
    const tablesBefore = await tabelasDe(real.id);

    await expect(seedTenant(services, { ...ARGS, unitId: 'outro-nome' }, 1, SEED_TENANTS[1], undefined, TODAY)).rejects.toThrow(
      /recusado: seed-real já tem tabelas, mas nenhuma unidade chamada 'outro-nome-real'/,
    );
    expect(await tabelasDe(real.id)).toBe(tablesBefore);
    expect(await unidadesDe(real.id)).toHaveLength(1);
  }, 120_000);

  it('queda no meio do fechamento de 2025: a re-execução completa o hard close sem lançar nem duplicar', async () => {
    const services = ApplicationFactory.getInstance().services;
    const real = await prisma.user.findUniqueOrThrow({ where: { username: 'seed-real' } });
    const [unidade] = await unidadesDe(real.id);
    // Simula a queda: jul..dez ficaram SOFT_CLOSED (o loop de hard close não chegou lá).
    await prisma.accountingPeriod.updateMany({ where: { userId: real.id, unitId: unidade.id, year: 2025, month: { gte: 7 } }, data: { status: 'SOFT_CLOSED' } });
    const before = await prisma.journalEntry.count({ where: { userId: real.id } });

    const r = await seedTenant(services, ARGS, 1, SEED_TENANTS[1], undefined, TODAY);

    expect(r.unitId).toBe(unidade.id);
    expect(r.entriesCreated).toBe(0);
    expect(await prisma.journalEntry.count({ where: { userId: real.id } })).toBe(before);
    const periods = await prisma.accountingPeriod.findMany({ where: { userId: real.id, unitId: unidade.id, year: 2025 } });
    expect(periods.every((p) => p.status === 'HARD_CLOSED')).toBe(true);
    expect(tieOutPasses([r])).toBe(true);
  }, 300_000);

  it('boot real: com o binding do salão ativo nos DOIS tenants, o alimentador de bindings sobe (sem colisão de unidade)', async () => {
    await resetDb(); // outro nome de unidade sobre os mesmos usuários seria recusado (item 10)
    const services = ApplicationFactory.getInstance().services;
    const boot = { ...ARGS, unitId: 'boot' };
    const reports = [];
    // "hoje" REAL aqui (exceção consciente): o dry-run do compilador de binding exige o mês corrente do relógio
    // OPEN — é o validador que lê o relógio, no mesmo fuso de scopeToday.
    const realToday = scopeToday({ timeZone: 'America/Sao_Paulo' });
    for (const [i, t] of SEED_TENANTS.entries()) reports.push(await seedTenant(services, { ...boot, years: [Number(realToday.slice(0, 4))] }, i, t, undefined, realToday));
    for (const r of reports) expect(await runActivateCli(['--owner-user-id', r.userId, '--unit-id', r.unitId])).toBe(0);
    // O MESMO passo que server.ts roda antes do app.listen() — com a unidade compartilhada ele rejeitava
    // com "Dois mappers registrados para o evento 'sale.finalized'" (boot real no dev.db, 24/09).
    await expect(ApplicationFactory.getInstance().initializeAccountingSyncFromBindings()).resolves.toBeUndefined();
  }, 300_000);

  it('`--years 2026` sozinho depois de 2025 reconhece em janeiro o pacote vendido em dezembro', async () => {
    await resetDb(); // idem: a unidade deste teste tem outro nome
    const services = ApplicationFactory.getInstance().services;
    const unit = { ...ARGS, unitId: 'seed-unit-b' };
    await seedTenant(services, { ...unit, years: [2025] }, 0, SEED_TENANTS[0], undefined, TODAY);
    const r = await seedTenant(services, { ...unit, years: [2026] }, 0, SEED_TENANTS[0], undefined, TODAY);

    const presumido = await prisma.user.findUniqueOrThrow({ where: { username: 'seed-presumido' } });
    const consumo = await prisma.journalEntry.findFirst({ where: { userId: presumido.id, unitId: r.unitId, sourceType: 'seed', sourceId: '2026-01-pacote-consumo' } });
    expect(consumo).not.toBeNull();
  }, 300_000);
});
