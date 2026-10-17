/**
 * BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 11) — lote do PR-2 (`/api/accounting`). Uma rota de leitura
 * (`GET /accounts`, que semeia o plano — F-I6-10) e uma de escrita (`POST /accounts`) contra o guard do
 * `AccountingScopeResolver`:
 *   string livre → 404 UNIT_NOT_FOUND · unidade de outro dono → 404 · unidade apagada → leitura 200 / escrita 409
 *   UNIT_DELETED · unidade viva → como antes.
 * E depois de todo 404/409 nenhuma linha contábil nova sob o `unitId` (contagem de `accounts`/`journal_entries`) —
 * prova de que o escopo paralelo não nasce. A unidade viva é o controle positivo: sem ela os zeros passariam por
 * vacuidade.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, resetDb, disconnectDb, seedUser, seedUnit, authHeader } from '@test/helpers';

const app = makeApp();

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

async function dono(username: string) {
  const u = await seedUser({ username });
  return { user: u, auth: authHeader({ id: u.id, username: u.username }) };
}

const linhasContabeis = async (unitId: string) => ({
  accounts: await prisma.account.count({ where: { unitId } }),
  entries: await prisma.journalEntry.count({ where: { unitId } }),
});

const novaConta = (unitId: string) => ({ code: '9.9.1', name: 'Conta guard', nature: 'Expense', unitId });

describe('I6 guard — /api/accounting (PR-2)', () => {
  it('unidade viva: GET /accounts semeia e lista (200); POST /accounts cria (201)', async () => {
    const a = await dono('guard-a');
    await seedUnit({ userId: a.user.id, id: 'unit-guard-viva' });
    const ler = await request(app).get('/api/accounting/accounts?unitId=unit-guard-viva').set(a.auth);
    expect(ler.status).toBe(200);
    expect(ler.body.data.accounts.length).toBeGreaterThan(0);
    // Grupo-pai da conta nova, arranjado direto na base (o teste é do guard, não do plano).
    await prisma.account.create({
      data: { userId: a.user.id, unitId: 'unit-guard-viva', code: '9.9', name: 'Grupo 9.9', nature: 'Expense', acceptsEntries: false },
    });
    const gravar = await request(app).post('/api/accounting/accounts').set(a.auth).send(novaConta('unit-guard-viva'));
    expect(gravar.status).toBe(201);
    expect((await linhasContabeis('unit-guard-viva')).accounts).toBeGreaterThan(0);
  });

  it('string livre: leitura e escrita → 404 UNIT_NOT_FOUND, nenhuma linha contábil nasce', async () => {
    const a = await dono('guard-a');
    await seedUnit({ userId: a.user.id, id: 'unit-guard-viva' });
    const ler = await request(app).get('/api/accounting/accounts?unitId=qualquer-coisa').set(a.auth);
    expect(ler.status).toBe(404);
    expect(ler.body.code).toBe('UNIT_NOT_FOUND');
    const gravar = await request(app).post('/api/accounting/accounts').set(a.auth).send(novaConta('qualquer-coisa'));
    expect(gravar.status).toBe(404);
    expect(gravar.body.code).toBe('UNIT_NOT_FOUND');
    expect(await linhasContabeis('qualquer-coisa')).toEqual({ accounts: 0, entries: 0 });
  });

  it('unidade de outro dono: leitura e escrita → 404 UNIT_NOT_FOUND, nada nasce sob ela', async () => {
    const a = await dono('guard-a');
    const b = await dono('guard-b');
    await seedUnit({ userId: b.user.id, id: 'unit-guard-do-b' });
    const ler = await request(app).get('/api/accounting/accounts?unitId=unit-guard-do-b').set(a.auth);
    expect(ler.status).toBe(404);
    expect(ler.body.code).toBe('UNIT_NOT_FOUND');
    const gravar = await request(app).post('/api/accounting/accounts').set(a.auth).send(novaConta('unit-guard-do-b'));
    expect(gravar.status).toBe(404);
    expect(gravar.body.code).toBe('UNIT_NOT_FOUND');
    expect(await linhasContabeis('unit-guard-do-b')).toEqual({ accounts: 0, entries: 0 });
  });

  it('unidade apagada: leitura 200 sem semear o plano (F-I6-10); escrita 409 UNIT_DELETED', async () => {
    const a = await dono('guard-a');
    await seedUnit({ userId: a.user.id, id: 'unit-guard-apagada', deleted: true });
    const ler = await request(app).get('/api/accounting/accounts?unitId=unit-guard-apagada').set(a.auth);
    expect(ler.status).toBe(200);
    expect(ler.body.data.accounts).toEqual([]);
    const gravar = await request(app).post('/api/accounting/accounts').set(a.auth).send(novaConta('unit-guard-apagada'));
    expect(gravar.status).toBe(409);
    expect(gravar.body.code).toBe('UNIT_DELETED');
    expect(await linhasContabeis('unit-guard-apagada')).toEqual({ accounts: 0, entries: 0 });
  });

  // L-I6-2 (dono, questionário, 2026-10-16: "Leitura nas 3"): os 3 GETs que gravam só trilha de auditoria são 'read' —
  // em unidade apagada respondem 200 e a trilha segue sendo gravada.
  it('unidade apagada: verify-chain, download do anexo e download do job de exportação → 200 (trilha de auditoria gravada)', async () => {
    const a = await dono('guard-a');
    await seedUnit({ userId: a.user.id, id: 'unit-guard-trilha' });
    const PDF = Buffer.from('%PDF-1.4\n% guard\n%%EOF\n');
    const doc = await request(app)
      .post('/api/accounting/source-documents')
      .set(a.auth)
      .field('unitId', 'unit-guard-trilha')
      .field('sourceType', 'tax.simples.historico')
      .attach('file', PDF, { filename: 'guard.pdf', contentType: 'application/pdf' });
    expect(doc.status).toBe(201);
    const exp = await request(app)
      .post('/api/accounting/data-exchange/exports')
      .set(a.auth)
      .send({ kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-guard-trilha' });
    expect(exp.status).toBe(201);
    // A unidade é apagada DEPOIS de o anexo e o job existirem.
    await prisma.dynamicTableData.update({ where: { id: 'unit-guard-trilha' }, data: { deletedAt: new Date() } });

    const flags = { a: process.env.AUDIT_DOWNLOAD_ATTACHMENTS, d: process.env.AUDIT_DATA_EXCHANGE_DOWNLOADS };
    process.env.AUDIT_DOWNLOAD_ATTACHMENTS = 'true';
    process.env.AUDIT_DATA_EXCHANGE_DOWNLOADS = 'true';
    try {
      const chain = await request(app).get('/api/accounting/audit/verify-chain').query({ unitId: 'unit-guard-trilha' }).set(a.auth);
      expect(chain.status).toBe(200);
      const anexo = await request(app)
        .get(`/api/accounting/attachments/${doc.body.data.attachment.id}`)
        .query({ unitId: 'unit-guard-trilha' })
        .set(a.auth);
      expect(anexo.status).toBe(200);
      const arquivo = await request(app)
        .get(`/api/accounting/data-exchange/jobs/${exp.body.data.id}/download`)
        .query({ unitId: 'unit-guard-trilha' })
        .set(a.auth);
      expect(arquivo.status).toBe(200);
    } finally {
      process.env.AUDIT_DOWNLOAD_ATTACHMENTS = flags.a;
      process.env.AUDIT_DATA_EXCHANGE_DOWNLOADS = flags.d;
      if (flags.a === undefined) delete process.env.AUDIT_DOWNLOAD_ATTACHMENTS;
      if (flags.d === undefined) delete process.env.AUDIT_DATA_EXCHANGE_DOWNLOADS;
    }
    const trilha = (eventType: string) => prisma.auditEvent.count({ where: { unitId: 'unit-guard-trilha', eventType } });
    expect(await trilha('attachment.downloaded')).toBe(1);
    expect(await trilha('data_exchange.artifact_downloaded')).toBe(1);
  });
});
