/**
 * BE-INCR-KIT-SETOR PR-6 — vocabulário de evento aberto (itens 49–50).
 *
 * Item 49: um kit de fixture (`testKit`, não publicado) declara `service.subscription.billed` → `revenue_recognition`;
 * ele compila, ativa e lança pelo caminho de produção (install → feeder → AccountingSyncService), sem tocar
 * `features/accounting`. Item 50: o lançamento grava a versão do binding que o interpretou (dono, chat, 13/10:
 * "Gravar a versão") e o rastro devolve {evento, arquétipo, bindingVersion, journalEntryId}.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import { AccountingSyncService } from '@/features/accounting/sync/AccountingSyncService';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import { SectorKitV1Schema, type SectorKitV1 } from '@/features/sectorKits/dtos/SectorKitDto';
import { BEAUTY_SALON_KIT_V1 } from '@/features/sectorKits/kits/beautySalon/kit.v1';
import { declaredEventKeys } from '@/features/sectorKits/registry';

const UNIT = 'unit-evento-aberto';
const TODAY = new Date().toISOString().slice(0, 10);
const EVENT_KEY = 'service.subscription.billed';

const saleFinalized = BEAUTY_SALON_KIT_V1.binding.eventBindings.find((b) => b.eventKey === 'sale.finalized')!;
const TEST_KIT: SectorKitV1 = SectorKitV1Schema.parse({
  ...BEAUTY_SALON_KIT_V1,
  kitKey: 'testKit',
  label: 'Kit de teste — assinatura de serviço',
  changelog: ['kit de teste (não publicado): um evento novo, fora do vocabulário sale.*'],
  binding: {
    ...BEAUTY_SALON_KIT_V1.binding,
    sectorKey: 'testKit',
    eventBindings: [{ ...saleFinalized, eventKey: EVENT_KEY, descriptionTemplate: 'Assinatura — {sourceId}' }],
  },
  operationalSchema: { [EVENT_KEY]: BEAUTY_SALON_KIT_V1.operationalSchema['sale.finalized'] },
});

let ownerId: string;
const scope = (): BindingScope => ({ ownerUserId: ownerId, actorUserId: ownerId, unitId: UNIT });
const accountingScope = (): AccountingScope => ({
  ...scope(),
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
});
const factory = () => ApplicationFactory.getInstance();

async function syncComMappersDoBanco() {
  const regs = await factory().getAccountingBindingFeederService().buildActiveMapperRegistrations();
  return new AccountingSyncService(factory().getPostingService(), regs, {
    declaredEventKeys: declaredEventKeys({ testKit: [TEST_KIT] }),
  });
}

const evento = (sourceId: string) => ({
  sourceType: EVENT_KEY,
  sourceId,
  unitId: UNIT,
  amount: 150,
  currency: 'BRL',
  occurredAt: TODAY,
  label: 'Assinatura mensal',
});

describe('PR-6 — kit novo com evento novo (integração)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());

  beforeEach(async () => {
    await resetDb();
    ownerId = (
      await prisma.user.create({ data: { name: 'ev', username: 'evento-aberto', email: 'ev@test.local', password: 'x', role: 'USER' } })
    ).id;
    await prisma.fiscalProfile.create({
      data: { userId: ownerId, unitId: UNIT, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false },
    });
    await expect(
      factory()
        .getKitInstallService(scope(), () => [TEST_KIT])
        .install(scope(), { kitKey: 'testKit', ano: Number(TODAY.slice(0, 4)), installChartIfEmpty: true, openCurrentPeriodIfMissing: true, today: TODAY }),
    ).resolves.toMatchObject({ status: 'INSTALLED' });
  });

  it('item 49: compila, ativa e lança service.subscription.billed (D 1.1.2 / C 3.1)', async () => {
    const binding = await prisma.accountingBinding.findFirstOrThrow({ where: { userId: ownerId, unitId: UNIT } });
    expect(binding).toMatchObject({ sectorKey: 'testKit', status: 'Active', bindingVersion: 1 });

    const sync = await syncComMappersDoBanco();
    const { entryId } = await sync.sync(accountingScope(), evento('assin-1'));

    const entry = await prisma.journalEntry.findUniqueOrThrow({ where: { id: entryId }, include: { postings: { include: { account: true } } } });
    expect(entry).toMatchObject({ sourceType: EVENT_KEY, sourceId: 'assin-1', status: 'Posted', description: 'Assinatura — assin-1' });
    const pernas = entry.postings.map((p) => [p.account.code, p.debitCents, p.creditCents]).sort();
    expect(pernas).toEqual([
      ['1.1.2', 15000n, 0n],
      ['3.1', 0n, 15000n],
    ]);
  });

  it('item 50: o lançamento grava o binding e o rastro devolve evento → arquétipo → versão → lançamento', async () => {
    const binding = await prisma.accountingBinding.findFirstOrThrow({ where: { userId: ownerId, unitId: UNIT, status: 'Active' } });
    const { entryId } = await (await syncComMappersDoBanco()).sync(accountingScope(), evento('assin-2'));

    expect(await prisma.journalEntry.findUniqueOrThrow({ where: { id: entryId } })).toMatchObject({
      bindingId: binding.id,
      bindingVersion: binding.bindingVersion,
    });
    await expect(factory().getKitTraceService(scope()).trace(scope(), EVENT_KEY, 'assin-2')).resolves.toEqual({
      eventKey: EVENT_KEY,
      archetypeKey: 'revenue_recognition',
      bindingVersion: 1,
      journalEntryId: entryId,
    });
  });

  it('item 50: lançamento sem binding (manual) ⇒ arquétipo e versão null; evento inexistente ⇒ 404', async () => {
    const manual = await factory().getPostingService().postEntry(accountingScope(), {
      unitId: UNIT,
      date: TODAY,
      description: 'manual',
      sourceType: 'manual',
      sourceId: 'm-1',
      lines: [
        { accountCode: '1.1.2', debitCents: 100, creditCents: 0 },
        { accountCode: '3.1', debitCents: 0, creditCents: 100 },
      ],
    } as never);
    await expect(factory().getKitTraceService(scope()).trace(scope(), 'manual', 'm-1')).resolves.toEqual({
      eventKey: 'manual',
      archetypeKey: null,
      bindingVersion: null,
      journalEntryId: manual.id,
    });
    await expect(factory().getKitTraceService(scope()).trace(scope(), EVENT_KEY, 'nao-existe')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('item 47: chave que nenhum kit declara ⇒ UNKNOWN_EVENT_KEY; declarada sem binding na unidade ⇒ NO_MAPPER_FOR_UNIT', async () => {
    const sync = await syncComMappersDoBanco();
    await expect(sync.sync(accountingScope(), { ...evento('x'), sourceType: 'service.unknown.thing' })).rejects.toMatchObject({
      errorCode: 'UNKNOWN_EVENT_KEY',
    });
    await expect(sync.sync(accountingScope(), { ...evento('y'), unitId: 'outra-unidade' })).rejects.toMatchObject({
      errorCode: 'NO_MAPPER_FOR_UNIT',
    });
  });
});
