/**
 * X10a PR-7 (EMENDA-PSC E-2..E-6, E-9; F-PSC-2..5 a) — contrato HTTP ponta a ponta da credencial do PSC por unidade,
 * contra um PSC FALSO local (http, porta 0, só no teste: /oauth/token e /oauth/certificate-discovery). Nada transmite a
 * PSC real. NF-e/NFC-e: o CNPJ do certificado confere com a unidade pela RAIZ (F-SIG-3 b / rej. 213).
 */
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { Role } from '@/features/users/models/User.model';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { loadKeyring, open } from '@/lib/secretBox';
import { DFE_PSC_KEYRING } from '@/features/accounting/models/PscCredential.model';
import { PscCredentialViewSchema, PscProviderViewSchema } from '@/features/accounting/dtos/PscCredentialDto';
import { PscCredentialService } from '@/features/accounting/services/PscCredentialService';
import { PscCredentialRepository } from '@/features/accounting/repositories/PscCredentialRepository';
import { PscProviderRepository } from '@/features/accounting/repositories/PscProviderRepository';
import { AccountingPolicy } from '@/features/accounting/policies/AccountingPolicy';
import { resolveUnitCnpjFromUnits } from '@/features/accounting/services/unitCnpj';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { makeTestCert } from '@test/helpers/nfeSignature';

const app = makeApp();
const CNPJ = '11444777000161';
const MESMA_RAIZ_FILIAL = '11444777000242';
const OUTRA_RAIZ = '12345678000195';
const TOKEN = 'tok-FIXTURE-psc-4471';
const SECRET = 'segredo-FIXTURE-oauth-8812';
const BASE = '/api/accounting/psc-credentials';
const PADMIN = { id: 'psc-padmin', username: 'psc-padmin', role: 'PLATFORM_ADMIN' as Role };

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let unitId: string;
let providerId: string;
let server: http.Server;
let baseUrl: string;
let certPem = '';
let tokenRequests: URLSearchParams[] = [];

function withKey() {
  process.env.DFE_PSC_KEYS = process.env.DFE_PSC_KEYS ?? `1:${randomBytes(32).toString('base64')}`;
  process.env.DFE_PSC_KEY_ACTIVE = '1';
}
function withoutKey() {
  delete process.env.DFE_PSC_KEYS;
  delete process.env.DFE_PSC_KEY_ACTIVE;
}
const live = () => prisma.pscCredential.findMany({ where: { userId: dono.id, deletedAt: null } });
const payloadOf = (p: unknown) => (typeof p === 'string' ? JSON.parse(p) : p) as Record<string, unknown>;
const scope = () => resolveAccountingScopeInternal({ userId: dono.id }, unitId);

async function authorize(provider = providerId) {
  return request(app).post(`${BASE}/${unitId}/authorize`).set(authHeader(dono)).send({ pscProviderId: provider, escopo: ['NFE', 'NFCE'] });
}
async function stateOf(provider = providerId): Promise<string> {
  const r = await authorize(provider);
  expect(r.status).toBe(200);
  return new URL(r.body.data.authorizationUrl).searchParams.get('state')!;
}
const callback = (q: Record<string, string>) => request(app).get(`${BASE}/callback`).query(q);

describe('X10a PR-7 — credencial do PSC por unidade', () => {
  beforeAll(async () => {
    pushTestSchema();
    process.env.DFE_PSC_REDIRECT_URI = 'https://app.luminaris.test/psc/retorno';
    server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/v0/oauth/token') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          tokenRequests.push(new URLSearchParams(body));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ access_token: TOKEN, token_type: 'Bearer', expires_in: 7200, authorized_identification_type: 'CNPJ', authorized_identification: CNPJ }));
        });
        return;
      }
      if (req.method === 'GET' && req.url === '/v0/oauth/certificate-discovery' && req.headers.authorization === `Bearer ${TOKEN}`) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'S', certificates: [{ alias: 'CERT:1', certificate: certPem }] }));
        return;
      }
      res.statusCode = 404;
      res.end('{}');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v0/`;

    dono = await prisma.user.create({ data: { name: 'psc', username: 'psc-dono', email: 'psc@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'psc2', username: 'psc-outro', email: 'psc2@test.local', password: 'x', role: 'USER' } });
    const units = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Units', internalName: 'units', category: 'business', schema: { fields: [] } as never },
    });
    unitId = (await prisma.dynamicTableData.create({ data: { dynamicTableId: units.id, data: { name: 'Centro', cnpj: '11.444.777/0001-61' } as never } })).id;
  }, 120000);

  afterAll(async () => {
    withoutKey();
    delete process.env.DFE_PSC_REDIRECT_URI;
    await new Promise((r) => server.close(r));
    await prisma.$disconnect();
  });

  it('E-3: sem DFE_PSC_KEYS ⇒ 503 dfe_psc_key_missing, nenhuma linha (provider e autorização)', async () => {
    withoutKey();
    const p = await request(app).post('/api/accounting/psc-providers').set(authHeader(PADMIN))
      .send({ nome: 'PSC', baseUrl: 'https://psc.example/v0/', clientId: 'c', clientSecret: SECRET, algoritmos: ['rsa-sha1'] });
    expect(p.status).toBe(503);
    expect(JSON.stringify(p.body)).toContain('dfe_psc_key_missing');
    const a = await authorize('qualquer');
    expect(a.status).toBe(503);
    expect(await prisma.pscProvider.count()).toBe(0);
    expect(await prisma.pscAuthorization.count()).toBe(0);
  });

  it('E-2: cadastro só PLATFORM_ADMIN; https obrigatório na API; segredo nunca volta; audit da allowlist', async () => {
    withKey();
    const body = { nome: 'PSC Teste', baseUrl: 'https://psc.example/v0/', clientId: 'lum-app', clientSecret: SECRET, cotaAnual: 10, algoritmos: ['rsa-sha1'] };
    expect((await request(app).post('/api/accounting/psc-providers').set(authHeader(dono)).send(body)).status).toBe(403);
    expect((await request(app).get('/api/accounting/psc-providers').set(authHeader(dono))).status).toBe(403);
    expect((await request(app).post('/api/accounting/psc-providers').set(authHeader(PADMIN)).send({ ...body, baseUrl: 'http://psc.example/' })).status).toBe(400);
    const r = await request(app).post('/api/accounting/psc-providers').set(authHeader(PADMIN)).send(body);
    expect(r.status).toBe(201);
    const view = PscProviderViewSchema.parse(r.body.data);
    expect(view.temClientSecret).toBe(true);
    expect(JSON.stringify(r.body)).not.toContain(SECRET);
    const row = await prisma.pscProvider.findUniqueOrThrow({ where: { id: view.id } });
    expect(open(row.clientSecretCipher!, row.id, row.keyVersion!, loadKeyring(process.env, DFE_PSC_KEYRING))).toBe(SECRET);
    const [ev] = await prisma.auditEvent.findMany({ where: { eventType: 'psc_provider.set' } });
    expect(Object.keys(payloadOf(ev.payload)).sort()).toEqual(['nome', 'pscProviderId']);
    // O PSC falso é http (loopback do teste): entra pelo service, abaixo do DTO que exige https.
    const fake = await getFactory().getPscProviderService().create(
      { userId: PADMIN.id, role: 'PLATFORM_ADMIN' },
      { nome: 'PSC Falso', baseUrl, clientId: 'lum-app', clientSecret: SECRET, cotaAnual: 10, algoritmos: ['rsa-sha1'], habilitadoEm: null },
    );
    providerId = fake.id;
  });

  it('E-4: PSC não habilitado ⇒ 422 psc_nao_homologado (authorize)', async () => {
    const r = await authorize();
    expect(r.status).toBe(422);
    expect(JSON.stringify(r.body)).toContain('psc_nao_homologado');
    const p = await request(app).patch(`/api/accounting/psc-providers/${providerId}`).set(authHeader(PADMIN)).send({ habilitadoEm: new Date().toISOString() });
    expect(p.status).toBe(200);
  });

  it('E-4: authorize devolve a URL do DOC-ICP-17.01 §6.4.5.1.1 com PKCE S256 e login_hint = CNPJ', async () => {
    const r = await authorize();
    expect(r.status).toBe(200);
    const u = new URL(r.body.data.authorizationUrl);
    expect(u.origin + u.pathname).toBe(`${baseUrl}oauth/authorize`);
    expect(Object.fromEntries(u.searchParams)).toMatchObject({
      response_type: 'code',
      client_id: 'lum-app',
      redirect_uri: 'https://app.luminaris.test/psc/retorno',
      scope: 'signature_session',
      code_challenge_method: 'S256',
      login_hint: CNPJ,
    });
    expect(u.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('E-4: state adulterado ⇒ 400; certificado de outra raiz ⇒ 422', async () => {
    const state = await stateOf();
    const tampered = state.slice(0, -2) + (state.endsWith('AA') ? 'BB' : 'AA');
    const bad = await callback({ code: 'c1', state: tampered });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toContain('psc_state_invalido');

    certPem = makeTestCert({ cnpj: OUTRA_RAIZ });
    const r = await callback({ code: 'c1', state: await stateOf() });
    expect(r.status).toBe(422);
    expect(JSON.stringify(r.body)).toContain('psc_certificado_nao_e_da_unidade');
    expect(await live()).toHaveLength(0);
  });

  it('E-4: user_denied ⇒ 400 psc_autorizacao_negada', async () => {
    const r = await callback({ error: 'user_denied', state: await stateOf() });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('psc_autorizacao_negada');
  });

  it('E-4/E-5: fluxo feliz (filial da mesma raiz) ⇒ view sem segredo, token cifrado com AAD = id, PKCE conferível, audit; state reusado ⇒ 400', async () => {
    certPem = makeTestCert({ cnpj: MESMA_RAIZ_FILIAL });
    const hook = jest.fn(async () => undefined);
    getFactory().getPscCredentialService().setOnAuthorized(hook);
    tokenRequests = [];
    const state = await stateOf();
    const r = await callback({ code: 'code-ok', state });
    expect(r.status).toBe(200);
    const view = PscCredentialViewSchema.parse(r.body.data);
    expect(view).toMatchObject({ unitId, psc: 'PSC Falso', titularCnpj: MESMA_RAIZ_FILIAL, certNotAfter: '2049-12-31', consumoNoAno: 0, cotaAnual: 10 });
    expect(JSON.stringify(r.body)).not.toContain(TOKEN);
    expect(hook).toHaveBeenCalledTimes(1);
    getFactory().getPscCredentialService().setOnAuthorized(async () => undefined);

    const [tr] = tokenRequests;
    expect(Object.fromEntries(tr)).toMatchObject({ grant_type: 'authorization_code', client_id: 'lum-app', client_secret: SECRET, code: 'code-ok' });
    expect(tr.get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const [row] = await live();
    const keyring = loadKeyring(process.env, DFE_PSC_KEYRING);
    expect(open(row.accessTokenCiphertext!, row.id, row.keyVersion!, keyring)).toBe(TOKEN);
    expect(() => open(row.accessTokenCiphertext!, 'outra-linha', row.keyVersion!, keyring)).toThrow();
    const [ev] = await prisma.auditEvent.findMany({ where: { eventType: 'psc_credential.authorized' } });
    expect(Object.keys(payloadOf(ev.payload)).sort()).toEqual(['certNotAfter', 'pscProviderId', 'unitId']);

    const again = await callback({ code: 'code-ok', state });
    expect(again.status).toBe(400);
    expect(JSON.stringify(again.body)).toContain('psc_state_invalido');
  });

  it('E-5: GET devolve a view; outro usuário não lê (404)', async () => {
    const r = await request(app).get(`${BASE}/${unitId}`).set(authHeader(dono));
    expect(r.status).toBe(200);
    PscCredentialViewSchema.parse(r.body.data);
    expect((await request(app).get(`${BASE}/${unitId}`).set(authHeader(outro))).status).toBe(404);
  });

  it('F-PSC-5 a: resolveForEmission com relógio — ok; token vencido ⇒ TOKEN_EXPIRADO; certificado vencido ⇒ CERTIFICADO_VENCIDO; avisos', async () => {
    const [row] = await live();
    const svcAt = (iso: string) =>
      new PscCredentialService(new PscCredentialRepository(), new PscProviderRepository(), getFactory().getAuditService(), new AccountingPolicy(), resolveUnitCnpjFromUnits, {
        now: () => new Date(iso),
      });
    const ok = await svcAt(new Date(row.tokenExpiraEm.getTime() - 2 * 3_600_000).toISOString()).resolveForEmission(scope());
    expect(ok.ok && ok.credencial.accessToken).toBe(TOKEN);
    expect(ok.ok && ok.credencial.escopo).toEqual(['NFE', 'NFCE']);
    expect(await svcAt(new Date(row.tokenExpiraEm.getTime() + 1000).toISOString()).resolveForEmission(scope())).toEqual({ ok: false, motivo: 'TOKEN_EXPIRADO' });
    expect(await svcAt('2050-01-02T12:00:00Z').resolveForEmission(scope())).toEqual({ ok: false, motivo: 'CERTIFICADO_VENCIDO' });

    const perto = await svcAt('2049-12-11T12:00:00Z').get(scope());
    expect(perto.avisos).toEqual(expect.arrayContaining(['certificado_vence_em_20_dias', 'sessao_psc_vence_em_menos_de_1h']));
  });

  it('F-PSC-4 a / E-9: consumo ≥ 80% da cota ⇒ aviso; ano novo zera o contador', async () => {
    const svc = getFactory().getPscCredentialService();
    await svc.registrarConsumo(scope(), 7);
    expect((await svc.get(scope())).avisos).not.toContain('cota_psc_acima_de_80');
    await svc.registrarConsumo(scope(), 1);
    const v = await svc.get(scope());
    expect(v.consumoNoAno).toBe(8);
    expect(v.avisos).toContain('cota_psc_acima_de_80');
    const [row] = await live();
    await prisma.pscCredential.update({ where: { id: row.id }, data: { consumoAno: row.consumoAno - 1 } });
    await svc.registrarConsumo(scope(), 2);
    expect((await svc.get(scope())).consumoNoAno).toBe(2);
  });

  it('E-5: DELETE ⇒ 204, ciphertext zerado, audit sem segredo; GET ⇒ 404; sem keyring o callback é 503 sem efeito', async () => {
    const [row] = await live();
    expect((await request(app).delete(`${BASE}/${unitId}`).set(authHeader(dono))).status).toBe(204);
    const gone = await prisma.pscCredential.findUniqueOrThrow({ where: { id: row.id } });
    expect(gone.deletedAt).not.toBeNull();
    expect(gone.accessTokenCiphertext).toBeNull();
    const [ev] = await prisma.auditEvent.findMany({ where: { eventType: 'psc_credential.removed' } });
    expect(Object.keys(payloadOf(ev.payload)).sort()).toEqual(['certNotAfter', 'pscProviderId', 'unitId']);
    expect((await request(app).get(`${BASE}/${unitId}`).set(authHeader(dono))).status).toBe(404);

    const state = await stateOf();
    const keys = process.env.DFE_PSC_KEYS;
    withoutKey();
    const r = await callback({ code: 'x', state });
    expect(r.status).toBe(503);
    expect(await live()).toHaveLength(0);
    process.env.DFE_PSC_KEYS = keys;
    withKey();
  });
});
