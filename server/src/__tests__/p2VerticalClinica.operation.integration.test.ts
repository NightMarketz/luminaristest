/**
 * BE-INCR-P2-VERTICAL-CLINICA — Bloco III, comportamento 8 (subconjunto automatável pelo agente).
 *
 * "A operação de um ano-calendário da clínica é postada, fechada e exportada" tem, no BRIEF, um
 * oráculo de integração ponta-a-ponta — mas fechar o exercício inteiro e exportar a ECD depende de
 * uma sequência inteira de gates de PERÍODO/EXERCÍCIO já cobertos por suíte própria
 * (`ExerciseClosingService.test.ts`) e de PVA humano (RUNBOOK-H3-P2-CLINICA.md, passos 4-6 —
 * fechar cada período tocado, `closeExercise`, gerar+importar a ECD no validador oficial). Este
 * arquivo prova o que É automatável e específico deste incremento: que `CLINIC_BINDING_V1`, uma
 * vez `Active` no banco (via `AccountingBindingFeederService`, o MESMO caminho que o boot real
 * usa), faz a operação da clínica POSTAR corretamente através dos 5 arquétipos — nunca através dos
 * mappers hardcoded `Sale*Mapper` do vertical 1 (a prova de que é o BINDING da clínica, não um
 * acaso de reuso de tabela, que produz o lançamento).
 *
 * Mesmo padrão de `factory.initializeAccountingSyncFromBindings.integration.test.ts` (SQLite real,
 * sem mock de Prisma, `ApplicationFactory.getInstance()` real) — a diferença é o sectorKey
 * (`aestheticClinic`) e a cobertura dos 5 arquétipos, não só 1.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import { CLINIC_BINDING_V1 } from '@/features/accountingBinding/fixtures/clinicBinding';
import type { AccountingEvent } from '@/features/accounting/sync/AccountingSyncPort';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const DONO = 'u-clinic-op';
const UNIT = 'unit-clinic-op';
const YEAR = 2026;
const MONTH = 3;
const OCCURRED_AT = `${YEAR}-${String(MONTH).padStart(2, '0')}-15T00:00:00.000Z`;

const scope: AccountingScope = {
  ownerUserId: DONO,
  actorUserId: DONO,
  unitId: UNIT,
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

/** Os mesmos 10 códigos que CLINIC_BINDING_V1 referencia (F-P2-8a — nenhuma conta nova por papel). */
const CLINIC_CHART = [
  { code: '1.1.1', name: 'Banco', nature: 'Asset' },
  { code: '1.1.2', name: 'A Receber', nature: 'Asset' },
  { code: '1.1.3', name: 'Caixa', nature: 'Asset' },
  { code: '1.1.4', name: 'A Receber Cartão', nature: 'Asset' },
  { code: '1.1.6', name: 'Estoques', nature: 'Asset' },
  { code: '2.1.1', name: 'Pacotes Pré-pagos', nature: 'Liability' },
  { code: '3.1', name: 'Receita de Serviços', nature: 'Revenue' },
  { code: '3.2', name: 'Devoluções de Vendas', nature: 'Revenue' },
  { code: '3.3', name: 'Receita de Revenda', nature: 'Revenue' },
  { code: '4.2', name: 'CMV', nature: 'Expense' },
];

async function findEntryWithPostings(sourceType: string, sourceId: string) {
  const entry = await prisma.journalEntry.findFirst({
    where: { userId: DONO, unitId: UNIT, sourceType, sourceId },
    include: { postings: { include: { account: true } } },
  });
  return entry;
}

function sumCents(postings: { debitCents: bigint; creditCents: bigint }[]) {
  return postings.reduce(
    (acc, p) => ({ debit: acc.debit + p.debitCents, credit: acc.credit + p.creditCents }),
    { debit: 0n, credit: 0n },
  );
}

describe('Operação da clínica via CLINIC_BINDING_V1 Active — comportamento 8 (subconjunto automatável)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' },
    });
    for (const acc of CLINIC_CHART) {
      await prisma.account.create({
        data: { userId: DONO, unitId: UNIT, code: acc.code, name: acc.name, nature: acc.nature, acceptsEntries: true },
      });
    }
    await prisma.accountingPeriod.create({
      data: { userId: DONO, unitId: UNIT, year: YEAR, month: MONTH, status: 'OPEN', openedAt: new Date() },
    });
    // O binding da clínica nasce Active diretamente (mesmo padrão do teste-irmão do feeder,
    // `factory.initializeAccountingSyncFromBindings.integration.test.ts`) — comportamentos 4-6
    // (compilação/gate de cobertura/CLI) já têm suíte própria; este arquivo testa o CONSUMO do
    // binding uma vez Active, não a ativação em si.
    await prisma.accountingBinding.create({
      data: {
        userId: DONO,
        unitId: UNIT,
        sectorKey: CLINIC_BINDING_V1.sectorKey,
        bindingVersion: 1,
        compiledAt: new Date(),
        compiledFromHash: 'sha256:teste-clinic-operation',
        payload: JSON.stringify(CLINIC_BINDING_V1),
        status: 'Active',
        createdById: DONO,
      },
    });

    const factory = ApplicationFactory.getInstance();
    await factory.initializeAccountingSyncFromBindings();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sale.finalized (serviço + revenda) — reconhecimento de receita, D 1.1.2 / C 3.1+3.3, balanceado', async () => {
    const sync = ApplicationFactory.getInstance().getAccountingSyncService();
    const event: AccountingEvent = {
      sourceType: 'sale.finalized',
      sourceId: 'clinic-sale-1',
      unitId: UNIT,
      amount: 500,
      currency: 'BRL',
      occurredAt: OCCURRED_AT,
      label: 'Atendimento clínica — venda 1',
      revenueByNature: { serviceReais: 400, productReais: 100 },
    };

    const result = await sync.sync(scope, event);
    expect(result.entryId).toBeDefined();

    const entry = await findEntryWithPostings('sale.finalized', 'clinic-sale-1');
    expect(entry).toBeDefined();
    expect(entry!.description).toContain('clínica'); // descriptionTemplate setorial (não "salão")

    const codes = entry!.postings.map((p) => p.account.code).sort();
    expect(codes).toEqual(['1.1.2', '3.1', '3.3']);
    const totals = sumCents(entry!.postings);
    expect(totals.debit).toBe(50000n); // R$500,00
    expect(totals.debit).toBe(totals.credit); // balanceado
  });

  it('sale.settled (Pix) — liquidação, D caixa-por-metodo / C controle-recebível', async () => {
    const sync = ApplicationFactory.getInstance().getAccountingSyncService();
    const event: AccountingEvent = {
      sourceType: 'sale.settled',
      sourceId: 'clinic-sale-1',
      unitId: UNIT,
      amount: 500,
      currency: 'BRL',
      occurredAt: OCCURRED_AT,
      label: 'Liquidação clínica — venda 1',
      paymentMethod: 'Pix',
    };

    await sync.sync(scope, event);
    const entry = await findEntryWithPostings('sale.settled', 'clinic-sale-1');
    expect(entry).toBeDefined();

    const codes = entry!.postings.map((p) => p.account.code).sort();
    expect(codes).toEqual(['1.1.1', '1.1.2']); // Pix → Banco (1.1.1) / controle-recebível (1.1.2)
    const totals = sumCents(entry!.postings);
    expect(totals.debit).toBe(50000n);
    expect(totals.debit).toBe(totals.credit);
  });

  it('sale.returned (devolução parcial) — D contra-receita / C controle-recebível', async () => {
    const sync = ApplicationFactory.getInstance().getAccountingSyncService();
    const event: AccountingEvent = {
      sourceType: 'sale.returned',
      sourceId: 'clinic-sale-2',
      unitId: UNIT,
      amount: 100,
      currency: 'BRL',
      occurredAt: OCCURRED_AT,
      label: 'Devolução clínica — venda 2',
    };

    await sync.sync(scope, event);
    const entry = await findEntryWithPostings('sale.returned', 'clinic-sale-2');
    expect(entry).toBeDefined();

    const codes = entry!.postings.map((p) => p.account.code).sort();
    expect(codes).toEqual(['1.1.2', '3.2']);
    const totals = sumCents(entry!.postings);
    expect(totals.debit).toBe(10000n);
    expect(totals.debit).toBe(totals.credit);
  });

  it('sale.package.sold (pacote pré-pago) — D controle-recebível / C passivo-diferido', async () => {
    const sync = ApplicationFactory.getInstance().getAccountingSyncService();
    const event: AccountingEvent = {
      sourceType: 'sale.package.sold',
      sourceId: 'clinic-package-1',
      unitId: UNIT,
      amount: 300,
      currency: 'BRL',
      occurredAt: OCCURRED_AT,
      label: 'Pacote pré-pago clínica — 1',
    };

    await sync.sync(scope, event);
    const entry = await findEntryWithPostings('sale.package.sold', 'clinic-package-1');
    expect(entry).toBeDefined();

    const codes = entry!.postings.map((p) => p.account.code).sort();
    expect(codes).toEqual(['1.1.2', '2.1.1']);
    const totals = sumCents(entry!.postings);
    expect(totals.debit).toBe(30000n);
    expect(totals.debit).toBe(totals.credit);
  });

  it('sale.cogs (revenda de cosmético) — D CMV / C estoque, F-P2-8a exercita o 5º arquétipo', async () => {
    const sync = ApplicationFactory.getInstance().getAccountingSyncService();
    const event: AccountingEvent = {
      sourceType: 'sale.cogs',
      sourceId: 'clinic-sale-1',
      unitId: UNIT,
      amount: 0,
      currency: 'BRL',
      occurredAt: OCCURRED_AT,
      label: 'CMV clínica — venda 1',
      costCents: 8000,
    };

    await sync.sync(scope, event);
    const entry = await findEntryWithPostings('sale.cogs', 'clinic-sale-1');
    expect(entry).toBeDefined();

    const codes = entry!.postings.map((p) => p.account.code).sort();
    expect(codes).toEqual(['1.1.6', '4.2']);
    const totals = sumCents(entry!.postings);
    expect(totals.debit).toBe(8000n);
    expect(totals.debit).toBe(totals.credit);
  });

  it('os 5 arquétipos do binding da clínica postaram — nenhum ficou de fora silenciosamente (o risco do comportamento 5, confirmado end-to-end)', async () => {
    const sourceTypes = ['sale.finalized', 'sale.settled', 'sale.returned', 'sale.package.sold', 'sale.cogs'];
    const entries = await prisma.journalEntry.findMany({ where: { userId: DONO, unitId: UNIT, sourceType: { in: sourceTypes } } });
    expect(new Set(entries.map((e) => e.sourceType))).toEqual(new Set(sourceTypes));
  });
});
