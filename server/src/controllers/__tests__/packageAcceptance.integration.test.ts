/**
 * FE-INCR-PACOTE-VALIDADE (F-JUR-4) — HTTP de ponta a ponta com SQLite real: o notice, o aceite append-only, a leitura
 * e o PDF do comprovante. O preset do salão é instalado por `POST /api/dashboard/create` (mesmo caminho do e2e do #483);
 * o puppeteer é trocado por um stub (o serializador tem teste próprio — aqui prova-se a ROTA e o cabeçalho).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { buildValidityNotice } from '@/features/packages/models/validityNotice';
import { scopeToday } from '@/features/accounting/models/dates';

import { FERIADOS_SEMENTE } from '@test/helpers/legalParams';
jest.mock('@/lib/pdf', () => ({ htmlToPdf: jest.fn(async (html: string) => Buffer.from(`%PDF-stub ${html}`)) }));

const app = makeApp();

let user: { id: string; username: string };
let intruder: { id: string; username: string };
let tables: Record<'sales' | 'saleItems' | 'packages' | 'customers' | 'units', string>;
let unitId: string;
let customerId: string;
let pkg30: string;
let pkgNoValidity: string;
const SALE_DATE = '2026-11-25'; // + 30 = 25/12 (feriado) → 26/12/2026

async function row(table: keyof typeof tables, data: Record<string, unknown>) {
  return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: data as never } });
}

async function packageSale(packageId: string, over: Record<string, unknown> = {}) {
  const sale = await row('sales', { status: 'Finalized', unitId, customerId, totalAmount: 250, currency: 'BRL', date: SALE_DATE, paymentStatus: 'Pending', ...over });
  await row('saleItems', { saleId: sale.id, type: 'Package', packageId, quantity: 1, unitPrice: 250 });
  return sale.id;
}

describe('package-acceptances (FE-INCR-PACOTE-VALIDADE)', () => {
  beforeAll(async () => {
    pushTestSchema();
    const u = await prisma.user.create({ data: { name: 'Bia', username: 'pa-int', email: 'pa-int@test.local', password: 'x', role: 'USER' } });
    user = { id: u.id, username: u.username };
    const i = await prisma.user.create({ data: { name: 'Intruso', username: 'pa-intruder', email: 'pa-intruder@test.local', password: 'x', role: 'USER' } });
    intruder = { id: i.id, username: i.username };
    const created = await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(created.status).toBe(201);
    const byName = async (n: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: user.id, internalName: n } })).id;
    tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), packages: await byName('packages'), customers: await byName('customers'), units: await byName('units') };
    // O intruso TAMBÉM instala o preset: o 404 que ele recebe vem do pertencimento da linha à tabela do tenant, não de "sem tabela".
    expect((await request(app).post('/api/dashboard/create').set(authHeader(intruder)).send({ suiteKey: 'beautySalon', unit: { name: 'Outra' } })).status).toBe(201);
    unitId = (await row('units', { name: 'Unidade Centro' })).id;
    customerId = (await row('customers', { name: 'Ana Souza' })).id;
    pkg30 = (await row('packages', { name: 'Pacote 10 escovas', price: 250, validityDays: 30 })).id;
    pkgNoValidity = (await row('packages', { name: 'Pacote livre', price: 100 })).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const notice = () => buildValidityNotice(SALE_DATE, 30, FERIADOS_SEMENTE)!;

  describe('GET /notice', () => {
    it('devolve o texto v1, a data com feriado e o hash', async () => {
      const res = await request(app).get('/api/package-acceptances/notice').query({ unitId, packageId: pkg30, saleDate: SALE_DATE }).set(authHeader(user));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ validityDays: 30, saleDate: SALE_DATE, expiresOn: '2026-12-26', textVersion: 'v1', text: notice().text, textSha256: notice().textSha256 });
    });

    it('pacote sem validade → campos nulos; pacote de outro tenant → 404; data impossível → 400; sem token → 401', async () => {
      const none = await request(app).get('/api/package-acceptances/notice').query({ unitId, packageId: pkgNoValidity, saleDate: SALE_DATE }).set(authHeader(user));
      expect(none.status).toBe(200);
      expect(none.body.data).toMatchObject({ validityDays: null, expiresOn: null, text: null, textSha256: null });

      const foreign = await request(app).get('/api/package-acceptances/notice').query({ unitId, packageId: pkg30, saleDate: SALE_DATE }).set(authHeader(intruder));
      expect(foreign.status).toBe(404);

      const bad = await request(app).get('/api/package-acceptances/notice').query({ unitId, packageId: pkg30, saleDate: '2026-02-30' }).set(authHeader(user));
      expect(bad.status).toBe(400);

      const anon = await request(app).get('/api/package-acceptances/notice').query({ unitId, packageId: pkg30, saleDate: SALE_DATE });
      expect(anon.status).toBe(401);
    });
  });

  describe('POST / GET (aceite append-only)', () => {
    let saleId: string;

    it('grava o aceite (201): quem, quando (servidor), texto mostrado e hash; GET devolve a linha', async () => {
      saleId = await packageSale(pkg30);
      const created = await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId, saleId, textVersion: 'v1', textSha256: notice().textSha256 });
      expect(created.status).toBe(201);
      expect(created.body.data).toMatchObject({
        saleId, customerId, packageId: pkg30, saleDate: SALE_DATE, validityDays: 30, expiresOn: '2026-12-26',
        textVersion: 'v1', textShown: notice().text, textSha256: notice().textSha256, acceptedByUserId: user.id, acceptedByLabel: 'Bia',
      });
      expect(new Date(created.body.data.acceptedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);

      const got = await request(app).get('/api/package-acceptances').query({ unitId, saleId }).set(authHeader(user));
      expect(got.status).toBe(200);
      expect(got.body.data).toMatchObject({ saleId, textShown: notice().text, acceptedByUserId: user.id, acceptedByLabel: 'Bia' });
    });

    it('2º aceite da mesma venda → 409 PACKAGE_ACCEPTANCE_EXISTS, e continua uma linha só', async () => {
      const again = await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId, saleId, textVersion: 'v1', textSha256: notice().textSha256 });
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('PACKAGE_ACCEPTANCE_EXISTS');
      expect(await prisma.packageValidityAcceptance.count({ where: { userId: user.id, saleId } })).toBe(1);
    });

    it('hash que não é o do servidor → 409 PACKAGE_NOTICE_CHANGED, nada gravado', async () => {
      const s = await packageSale(pkg30);
      const res = await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId, saleId: s, textVersion: 'v1', textSha256: 'c'.repeat(64) });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PACKAGE_NOTICE_CHANGED');
      expect(await prisma.packageValidityAcceptance.count({ where: { userId: user.id, saleId: s } })).toBe(0);
    });

    it('pacote sem validade → 400 PACKAGE_WITHOUT_VALIDITY; venda que não é de pacote → 400', async () => {
      const s = await packageSale(pkgNoValidity);
      const res = await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId, saleId: s, textVersion: 'v1', textSha256: 'c'.repeat(64) });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('PACKAGE_WITHOUT_VALIDITY');

      const svc = await row('sales', { status: 'Finalized', unitId, customerId, totalAmount: 80, currency: 'BRL', date: SALE_DATE, paymentStatus: 'Pending' });
      await row('saleItems', { saleId: svc.id, type: 'Service', serviceId: 'srv-1', quantity: 1, unitPrice: 80 });
      const notPkg = await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId, saleId: svc.id, textVersion: 'v1', textSha256: notice().textSha256 });
      expect(notPkg.status).toBe(400);
    });

    it('venda de outro tenant ou de outra unidade → 404; chave extra no body → 400; sem token → 401', async () => {
      const s = await packageSale(pkg30);
      const foreign = await request(app).post('/api/package-acceptances').set(authHeader(intruder)).send({ unitId, saleId: s, textVersion: 'v1', textSha256: notice().textSha256 });
      expect(foreign.status).toBe(404);
      const wrongUnit = await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId: 'outra-unidade', saleId: s, textVersion: 'v1', textSha256: notice().textSha256 });
      expect(wrongUnit.status).toBe(404);
      const extra = await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId, saleId: s, textVersion: 'v1', textSha256: notice().textSha256, textShown: 'forjado' });
      expect(extra.status).toBe(400);
      const anon = await request(app).post('/api/package-acceptances').send({ unitId, saleId: s, textVersion: 'v1', textSha256: notice().textSha256 });
      expect(anon.status).toBe(401);
    });

    it('não existe rota de alteração nem de remoção (é prova): PUT/PATCH/DELETE não casam', async () => {
      for (const method of ['put', 'patch', 'delete'] as const) {
        const res = await request(app)[method](`/api/package-acceptances/${saleId}`).query({ unitId }).set(authHeader(user));
        expect(res.status).toBe(404);
      }
      expect(await prisma.packageValidityAcceptance.count({ where: { userId: user.id, saleId } })).toBe(1);
    });

    it('GET de venda sem aceite → data null', async () => {
      const s = await packageSale(pkg30);
      const res = await request(app).get('/api/package-acceptances').query({ unitId, saleId: s }).set(authHeader(user));
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it('venda gravada pelo motor com a data em ISO (2026-11-25T00:00:00.000Z, como o POST do FE produz) aceita com o hash do notice', async () => {
      // Regressão do achado da verificação em produção: o DynamicTable normaliza `date` para ISO UTC; o serviço lia o dia
      // anterior em Brasília (24/11) e respondia 409 PACKAGE_NOTICE_CHANGED a um aceite legítimo.
      const s = await packageSale(pkg30, { date: `${SALE_DATE}T00:00:00.000Z` });
      const res = await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId, saleId: s, textVersion: 'v1', textSha256: notice().textSha256 });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ saleDate: SALE_DATE, expiresOn: '2026-12-26' });
    });

    it('a data de hoje não interfere: o aceite usa a data da VENDA (não "hoje")', async () => {
      const today = scopeToday({ timeZone: 'America/Sao_Paulo' });
      const s = await packageSale(pkg30, { date: today });
      const n = buildValidityNotice(today, 30, FERIADOS_SEMENTE)!;
      const res = await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId, saleId: s, textVersion: 'v1', textSha256: n.textSha256 });
      expect(res.status).toBe(201);
      expect(res.body.data.saleDate).toBe(today);
      expect(res.body.data.expiresOn).toBe(n.expiresOn);
    });
  });

  describe('GET /:saleId/receipt (PDF)', () => {
    it('200 application/pdf attachment; com aceite, a cláusula gravada e o aceite; sem aceite, a marca', async () => {
      const accepted = await packageSale(pkg30);
      await request(app).post('/api/package-acceptances').set(authHeader(user)).send({ unitId, saleId: accepted, textVersion: 'v1', textSha256: notice().textSha256 });
      const ok = await request(app).get(`/api/package-acceptances/${accepted}/receipt`).query({ unitId }).set(authHeader(user)).buffer(true).parse((r, cb) => { const c: Buffer[] = []; r.on('data', (d: Buffer) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); });
      expect(ok.status).toBe(200);
      expect(ok.headers['content-type']).toContain('application/pdf');
      expect(ok.headers['content-disposition']).toContain('attachment');
      const html = (ok.body as Buffer).toString();
      expect(html).toContain(notice().text);
      expect(html).toContain('Ana Souza');
      expect(html).toContain('Pacote 10 escovas');
      expect(html).toContain('Unidade Centro');
      expect(html).toContain('Bia');
      expect(html).not.toContain('ACEITE NÃO REGISTRADO');

      const bare = await packageSale(pkg30);
      const nok = await request(app).get(`/api/package-acceptances/${bare}/receipt`).query({ unitId }).set(authHeader(user)).buffer(true).parse((r, cb) => { const c: Buffer[] = []; r.on('data', (d: Buffer) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); });
      expect(nok.status).toBe(200);
      expect((nok.body as Buffer).toString()).toContain('ACEITE NÃO REGISTRADO');
    });

    it('404 fora do escopo (outro tenant, outra unidade); 400 venda que não é de pacote; 401 sem token', async () => {
      const s = await packageSale(pkg30);
      expect((await request(app).get(`/api/package-acceptances/${s}/receipt`).query({ unitId }).set(authHeader(intruder))).status).toBe(404);
      expect((await request(app).get(`/api/package-acceptances/${s}/receipt`).query({ unitId: 'outra' }).set(authHeader(user))).status).toBe(404);
      const svc = await row('sales', { status: 'Finalized', unitId, customerId, totalAmount: 80, currency: 'BRL', date: SALE_DATE, paymentStatus: 'Pending' });
      await row('saleItems', { saleId: svc.id, type: 'Service', serviceId: 'srv-1', quantity: 1, unitPrice: 80 });
      expect((await request(app).get(`/api/package-acceptances/${svc.id}/receipt`).query({ unitId }).set(authHeader(user))).status).toBe(400);
      expect((await request(app).get(`/api/package-acceptances/${s}/receipt`).query({ unitId })).status).toBe(401);
    });
  });
});
