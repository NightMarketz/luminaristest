/**
 * BE-INCR-CONTA-CANONICA-PAPEL, PR-2 (lacunas L-20261121-040919-4e1f, L-20261121-034041-ad40 e a parte "nunca recebe" da
 * L-20261121-040921-13dd). A conta do plano padrão é reconhecida por código + natureza + nome (dono, 21/11: ad40
 * "Nome/natureza", 13dd "pelo papel/natureza"), não só pelo código:
 * - a conta do usuário que ocupa um código do plano padrão (caso real: dev.db, escopo C7, 4.7 "Perda na Baixa de
 *   Imobilizado C7") pode ser apagada, e o delete libera o código;
 * - o `ensureChartOfAccounts` não ressuscita a conta apagada do usuário: libera o código e cria a do plano padrão.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const CODIGO = '4.7'; // "Custo dos Serviços Prestados" (Expense), do plano padrão desde o #1296
const PADRAO = 'Custo dos Serviços Prestados';
const PERDA = 'Perda na Baixa de Imobilizado';

let dono: { id: string; username: string };

const listar = (unitId: string) => request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId });
const apagar = (unitId: string, id: string) =>
  request(app).delete(`/api/accounting/accounts/${id}`).set(authHeader(dono)).query({ unitId });
const vivaNoCodigo = (unitId: string) =>
  prisma.account.findFirst({ where: { userId: dono.id, unitId, code: CODIGO, deletedAt: null } });

/** Escopo legado: o usuário criou a 4.7 antes de ela entrar no plano padrão (o `create` direto pula a recusa do #1300). */
const contaDoUsuario = async (unitId: string, deletedAt: Date | null = null) => {
  await seedUnit({ userId: dono.id, id: unitId });
  return prisma.account.create({
    data: { userId: dono.id, unitId, code: CODIGO, name: PERDA, nature: 'Expense', acceptsEntries: true, deletedAt },
  });
};

describe('conta canônica pela identidade (lacunas 4e1f, ad40, 13dd)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'identidade', username: 'identidade-dono', email: 'identidade@test.local', password: 'x', role: 'USER' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('conta do usuário na 4.7, sem partidas: o DELETE passa, a "Perda" não volta e a 4.7 do plano padrão nasce (4e1f, 13dd)', async () => {
    const unitId = 'unit-ident-delete';
    const perda = await contaDoUsuario(unitId);
    expect((await listar(unitId)).status).toBe(200); // ensure: a do usuário fica no lugar
    expect((await vivaNoCodigo(unitId))?.id).toBe(perda.id);

    const r = await apagar(unitId, perda.id);
    expect(r.status).toBe(200);

    expect((await listar(unitId)).status).toBe(200); // ensure: o código está livre
    const viva = await vivaNoCodigo(unitId);
    expect(viva?.name).toBe(PADRAO);
    expect(viva?.id).not.toBe(perda.id);
    const apagada = await prisma.account.findUniqueOrThrow({ where: { id: perda.id } });
    expect(apagada.deletedAt).not.toBeNull();
    expect(apagada.code).toBe(`${CODIGO}#deleted#${perda.id}`);

    const evento = await prisma.auditEvent.findFirstOrThrow({ where: { unitId, eventType: 'account.deleted', targetId: perda.id } });
    expect(JSON.parse(evento.payload)).toMatchObject({ code: CODIGO }); // a trilha guarda o código original
  });

  it('conta do usuário apagada antes de o código virar padrão: o ensure não a ressuscita e cria a do plano padrão (ad40)', async () => {
    const unitId = 'unit-ident-legado';
    const perda = await contaDoUsuario(unitId, new Date('2026-11-01T00:00:00Z'));

    expect((await listar(unitId)).status).toBe(200);
    const viva = await vivaNoCodigo(unitId);
    expect(viva?.name).toBe(PADRAO);
    const apagada = await prisma.account.findUniqueOrThrow({ where: { id: perda.id } });
    expect(apagada.deletedAt).not.toBeNull();
    expect(apagada.code).toBe(`${CODIGO}#deleted#${perda.id}`);
  });

  it('a 4.7 do plano padrão continua sem poder ser apagada (409)', async () => {
    const unitId = 'unit-ident-padrao';
    await seedUnit({ userId: dono.id, id: unitId });
    expect((await listar(unitId)).status).toBe(200);
    const padrao = await vivaNoCodigo(unitId);
    expect(padrao?.name).toBe(PADRAO);
    expect((await apagar(unitId, padrao!.id)).status).toBe(409);
    expect((await vivaNoCodigo(unitId))?.id).toBe(padrao!.id);
  });

  it('conta do usuário na 4.7 com partida: o DELETE é 409 e o código fica com ela', async () => {
    const unitId = 'unit-ident-partida';
    const perda = await contaDoUsuario(unitId);
    const entry = await prisma.journalEntry.create({
      data: { userId: dono.id, unitId, date: new Date('2026-11-10'), description: 'baixa', status: 'Posted' },
    });
    await prisma.posting.create({ data: { userId: dono.id, unitId, entryId: entry.id, accountId: perda.id, debitCents: 100n } });

    expect((await apagar(unitId, perda.id)).status).toBe(409);
    const atual = await prisma.account.findUniqueOrThrow({ where: { id: perda.id } });
    expect(atual.deletedAt).toBeNull();
    expect(atual.code).toBe(CODIGO);
  });
});
