/**
 * FIX-TESTES item 5, lote 4 (BRIEF `docs/accounting/FIX-MENSAGENS-ID-INTERNO-brief.md`, item 5; inventário
 * `docs/operating-manual/MENSAGENS-ID-INTERNO-2026-11-05.md`). A mensagem que o operador lê nomeia o registro pelo rótulo
 * (F-MSG-2 a1), nunca pelo cuid de um registro que ele vê pelo número/nome ou não mandou (F-MSG-1 a). Um caso por site
 * "corrigir" do lote 4 fora do imobilizado (os 2 do `DepreciationService` estão em `fixedAssetController.integration.test.ts`).
 *
 * Rótulos (dono, chat, 05/11, lote 3): lançamento contábil = nº + data + descrição. Item de estoque = a `description` que o
 * subrazão guarda (snapshot do nome do produto), com o `productRef` só se ela estiver vazia.
 *
 * Estorno e conciliação vão pela HTTP (`handleApiError`). O CMV não tem rota: a mensagem do `recordSaleCogs` chega à tela
 * pelo `reasonDetail` da pendência de reconciliação (`accountingSyncReconcile.job.ts`, passada `sale.cogs`, mostrado no
 * `ReconcilePendingPanel`), que é o `error.message` sem mudança. Por isso o guarda chama o serviço da fábrica real, com
 * repositório e SQLite reais, e asserta o `message` do erro.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { InventoryRepository } from '@/features/accounting/repositories/InventoryRepository';

const app = makeApp();
type U = { id: string; username: string };

const criarDono = (tag: string): Promise<U> =>
  prisma.user.create({ data: { name: tag, username: tag, email: `${tag}@test.local`, password: 'x', role: 'USER' } });

const abrirPeriodo = (u: U, unitId: string, year: number, month: number) =>
  prisma.accountingPeriod.create({ data: { userId: u.id, unitId, year, month, status: 'OPEN', openedAt: new Date(), openedById: u.id } });

async function lancar(u: U, unitId: string, date: string, description: string, cents: number) {
  const res = await request(app)
    .post('/api/accounting/post')
    .set(authHeader(u))
    .send({
      unitId,
      date,
      description,
      lines: [
        { accountCode: '1.1.1.01', debitCents: cents, creditCents: 0 },
        { accountCode: '3.1', debitCents: 0, creditCents: cents },
      ],
    });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

/** Status certo, a mensagem contém o rótulo e não contém nenhum dos ids. A `msg` vai no objeto para o diff mostrá-la. */
function nomeiaSemId(status: number | undefined, message: unknown, esperado: { status?: number; rotulo: string }, ...ids: string[]) {
  const msg = String(message);
  expect({ status, nomeiaRotulo: msg.includes(esperado.rotulo), idNaMensagem: ids.filter((id) => msg.includes(id)), msg }).toEqual({
    status: esperado.status,
    nomeiaRotulo: true,
    idNaMensagem: [],
    msg,
  });
}

/** O rótulo do lançamento como a tela o mostra: nº + data + descrição. */
async function rotuloLancamento(entryId: string) {
  const e = await prisma.journalEntry.findUniqueOrThrow({ where: { id: entryId } });
  expect(e.entryNumber).not.toBeNull();
  return `lançamento nº ${e.entryNumber} de 15/06/2026 — ${e.description}`;
}

describe('FIX-MENSAGENS-ID-INTERNO lote 4 — estorno, conciliação e CMV nomeiam pelo rótulo, nunca pelo cuid', () => {
  let dono: U;

  beforeAll(async () => {
    pushTestSchema();
    dono = await criarDono('msg-l4');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('PostingService:628 — estornar lançamento com partidas desbalanceadas (400) nomeia o lançamento', async () => {
    const unitId = 'unit-msg-l4-estorno';
    await seedUnit({ userId: dono.id, id: unitId });
    await abrirPeriodo(dono, unitId, 2026, 6);
    const entryId = await lancar(dono, unitId, '2026-06-15', 'Venda balcão junho', 15000);
    // Estado que a HTTP não produz (o post recusa desbalanceado): uma perna corrompida por fora.
    const perna = await prisma.posting.findFirstOrThrow({ where: { entryId, debitCents: { gt: 0n } } });
    await prisma.posting.update({ where: { id: perna.id }, data: { debitCents: 14000n } });

    const res = await request(app)
      .post('/api/accounting/reverse')
      .set(authHeader(dono))
      .send({ unitId, lancamentoId: entryId, reversalPostingDate: '2026-06-20', reason: 'teste da mensagem' });
    nomeiaSemId(res.status, res.body.message, { status: 400, rotulo: await rotuloLancamento(entryId) }, entryId);
  });

  it('ReconciliationService:422 — conciliar posting de lançamento que não está Posted (400) nomeia o lançamento', async () => {
    const unitId = 'unit-msg-l4-recon';
    await seedUnit({ userId: dono.id, id: unitId });
    await abrirPeriodo(dono, unitId, 2026, 6);
    const entryId = await lancar(dono, unitId, '2026-06-15', 'PIX recebido cliente', 15000);
    const banco = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId, code: '1.1.1.01' } });
    const csv = Buffer.from('date,amountCents,description,externalRef\n2026-06-15,15000,PIX recebido,tx-1\n', 'utf8');
    const imp = await request(app)
      .post('/api/accounting/reconciliation/statements')
      .set(authHeader(dono))
      .field('unitId', unitId)
      .field('glAccountId', banco.id)
      .field('periodStart', '2026-06-01')
      .field('periodEnd', '2026-06-30')
      .attach('file', csv, { filename: 'extrato.csv', contentType: 'text/csv' });
    expect(imp.status).toBe(201);
    const statementId = (imp.body.data.statement?.id ?? imp.body.data.id) as string;
    const line = await prisma.bankStatementLine.findFirstOrThrow({ where: { statementId } });
    const posting = await prisma.posting.findFirstOrThrow({ where: { entryId, accountId: banco.id } });
    // Estado que a tela alcança por outra via (lançamento estornado entre a busca de candidatos e o vínculo).
    await prisma.journalEntry.update({ where: { id: entryId }, data: { status: 'Reversed' } });

    const res = await request(app)
      .post('/api/accounting/reconciliation/matches')
      .set(authHeader(dono))
      .send({ unitId, statementLineId: line.id, postingIds: [posting.id] });
    nomeiaSemId(res.status, res.body.message, { status: 400, rotulo: await rotuloLancamento(entryId) }, entryId, posting.id);
  });

  describe('InventoryService.recordSaleCogs (texto do reasonDetail da pendência sale.cogs)', () => {
    const unitId = 'unit-msg-l4-estoque';
    const scope = () => resolveAccountingScopeInternal({ userId: dono.id }, unitId);
    const productRef = 'cmw4msgprodutoref0000000001';
    const baixar = async (saleId: string) => {
      try {
        await getFactory().getInventoryService().recordSaleCogs(scope(), { saleId, unitId, occurredAt: new Date('2026-06-15T12:00:00Z'), lines: [{ productRef, qty: 2 }] });
        return undefined;
      } catch (e) {
        return e as Error;
      }
    };

    beforeAll(async () => {
      await seedUnit({ userId: dono.id, id: unitId });
      await prisma.inventoryItem.create({
        data: { userId: dono.id, unitId, productRef, description: 'Shampoo 300ml', qtyOnHand: 1, totalValueCents: 1000n },
      });
    });

    it('InventoryService:252 — estoque menor que a quantidade nomeia o produto pela descrição', async () => {
      const erro = await baixar('cmw4msgvenda000000000000001');
      nomeiaSemId((erro as { statusCode?: number } | undefined)?.statusCode, erro?.message, { status: 400, rotulo: 'Shampoo 300ml' }, productRef);
    });

    it('InventoryService:261 — baixa que perde o CAS do estoque nomeia o produto pela descrição', async () => {
      await prisma.inventoryItem.updateMany({ where: { userId: dono.id, unitId, productRef }, data: { qtyOnHand: 5, totalValueCents: 5000n } });
      const spy = jest.spyOn(InventoryRepository.prototype, 'decrementForCogs').mockResolvedValue(0);
      try {
        const erro = await baixar('cmw4msgvenda000000000000002');
        nomeiaSemId((erro as { statusCode?: number } | undefined)?.statusCode, erro?.message, { status: 400, rotulo: 'Shampoo 300ml' }, productRef);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
