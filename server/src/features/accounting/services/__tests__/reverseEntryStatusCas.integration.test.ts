/**
 * SM F-16.1 (auditoria de estruturas implícitas, faixa 4 — corrida) — o estorno lê o status do
 * lançamento FORA da tx e, dentro dela, grava `Reversed` sem status no `where`.
 *
 * A janela: `reverseEntry` lê o original (`findById`), confere `status === 'Posted'` e só depois
 * abre a tx. Se, nesse intervalo, a conciliação (`ReconciliationRepository.updateEntryStatus`,
 * CAS Posted→Reconciled) vence, o estorno grava `Reversed` por cima de `Reconciled` e a linha do
 * extrato fica MATCHED apontando para um lançamento estornado.
 *
 * DETERMINÍSTICO, sem concorrência real (o SQLite no Windows serializa — a corrida nunca morde
 * local): o spy de `findById` devolve a leitura verdadeira (`Posted`) e, ANTES de devolvê-la,
 * muda a linha na base para `Reconciled` — exatamente o estado que a conciliação concorrente
 * deixaria. A guarda pré-tx passa (viu `Posted`); só uma escrita com status no `where` percebe.
 *
 * Esperado: o estorno recusa com `ConflictError` (409) e não escreve nada — o original segue
 * `Reconciled`, sem `reversedById`, e nenhum lançamento de estorno existe.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { JournalEntryRepository } from '@/features/accounting/repositories/JournalEntryRepository';
import { ConflictError } from '@/lib/errors';

const UNIT = 'unit-f16-1';
const DONO = 'u-f16-1';
const DATA = '2026-06-15';

const scope = (): AccountingScope => resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const posting = () => getFactory().getPostingService();

const lancamento = (descricao: string, centavos: number) => ({
  unitId: UNIT,
  date: DATA,
  description: descricao,
  sourceType: 'manual',
  lines: [
    { accountCode: '4.1', debitCents: centavos, creditCents: 0 },
    { accountCode: '1.1.1.01', debitCents: 0, creditCents: centavos },
  ],
});

const estorno = (lancamentoId: string) => ({
  unitId: UNIT,
  lancamentoId,
  reversalPostingDate: DATA,
  reason: 'F-16.1',
});

describe('reverseEntry — CAS do status do original dentro da tx (SM F-16.1)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' },
    });
    await prisma.accountingPeriod.create({
      data: { userId: DONO, unitId: UNIT, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: DONO },
    });
  }, 120000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Sem este controle, o caso abaixo passaria com um reverseEntry quebrado para todo mundo.
  it('CONTROLE: sem mudança concorrente, o estorno de um Posted grava Reversed e o vínculo', async () => {
    const entry = await posting().postEntry(scope(), lancamento('controle', 5000));

    const { reversal } = await posting().reverseEntry(scope(), estorno(entry.id));

    const original = await prisma.journalEntry.findUnique({ where: { id: entry.id } });
    expect(original!.status).toBe('Reversed');
    expect(original!.reversedById).toBe(reversal.id);
  });

  it('conciliação entre a leitura e a tx: o estorno recusa (409) e não grava Reversed sobre Reconciled', async () => {
    const entry = await posting().postEntry(scope(), lancamento('conciliado na janela', 6100));

    // A leitura pré-tx do original devolve o que a base tinha (Posted); antes de devolver, a
    // "conciliação concorrente" vence e grava Reconciled. Só a PRIMEIRA leitura do id é tocada.
    const realFindById = JournalEntryRepository.prototype.findById;
    let tocado = false;
    jest
      .spyOn(JournalEntryRepository.prototype, 'findById')
      .mockImplementation(async function (this: JournalEntryRepository, ...args) {
        const lido = await realFindById.apply(this, args);
        if (!tocado && args[1] === entry.id) {
          tocado = true;
          await prisma.journalEntry.update({ where: { id: entry.id }, data: { status: 'Reconciled' } });
        }
        return lido;
      });

    await expect(posting().reverseEntry(scope(), estorno(entry.id))).rejects.toBeInstanceOf(ConflictError);

    expect(tocado).toBe(true);
    const original = await prisma.journalEntry.findUnique({ where: { id: entry.id } });
    expect({ status: original!.status, reversedById: original!.reversedById }).toEqual({
      status: 'Reconciled',
      reversedById: null,
    });
    expect(
      await prisma.journalEntry.count({ where: { userId: DONO, unitId: UNIT, sourceType: 'reversal', sourceId: entry.id } }),
    ).toBe(0);
  });
});
