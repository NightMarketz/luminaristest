/**
 * BE-INCR-DFE-ADN-EMISSOR (nó X10i) PR-1 — contrato HTTP ponta a ponta do certificado fiscal da unidade:
 * item 3 (linha por unidade, soft-delete com rename, AAD = id), item 4 (keyring DFE_CERT_KEYS, falha fechada),
 * item 5 (PFX em memória; senha, chave×certificado, CNPJ, validade ⇒ 422 nomeado; senha fora do log),
 * item 6 (view sem segredo, DELETE zera o ciphertext, audit na allowlist). F-ADN-11 a: 14 dígitos.
 */
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { loadKeyring, open } from '@/lib/secretBox';
import { DFE_CERT_KEYRING } from '@/features/accounting/models/FiscalCertificate.model';
import { FiscalCertificateViewSchema } from '@/features/accounting/dtos/FiscalCertificateDto';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { makeTestPfx } from '@test/helpers/fiscalCertificate';

const app = makeApp();
const CNPJ = '11444777000161';
const OUTRO_CNPJ = '12345678000195';
const SENHA = 'senha-FIXTURE-pfx-9137';
const BASE = '/api/accounting/fiscal-certificates';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let unitId: string;
let pfxOk: Buffer;

const put = (pfx: Buffer, senha = SENHA, who = dono, unit = unitId) =>
  request(app).put(`${BASE}/${unit}`).set(authHeader(who)).field('senha', senha).attach('file', pfx, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
const live = () => prisma.fiscalCertificate.findMany({ where: { userId: dono.id, deletedAt: null } });
const payloadOf = (p: unknown) => (typeof p === 'string' ? JSON.parse(p) : p) as Record<string, unknown>;
const eventos = (eventType: string) => prisma.auditEvent.findMany({ where: { eventType }, orderBy: { seq: 'asc' } });

function withKey() {
  process.env.DFE_CERT_KEYS = `1:${randomBytes(32).toString('base64')}`;
  process.env.DFE_CERT_KEY_ACTIVE = '1';
}
function withoutKey() {
  delete process.env.DFE_CERT_KEYS;
  delete process.env.DFE_CERT_KEY_ACTIVE;
}

describe('X10i PR-1 — certificado fiscal por unidade', () => {
  const logged: string[] = [];
  const spies: jest.SpyInstance[] = [];

  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'adn', username: 'adn-dono', email: 'adn@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'adn2', username: 'adn-outro', email: 'adn2@test.local', password: 'x', role: 'USER' } });
    const units = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Units', internalName: 'units', category: 'business', schema: { fields: [] } as never },
    });
    unitId = (await prisma.dynamicTableData.create({ data: { dynamicTableId: units.id, data: { name: 'Centro', cnpj: '11.444.777/0001-61' } as never } })).id;
    pfxOk = makeTestPfx({ cnpj: CNPJ, password: SENHA });
    for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      spies.push(jest.spyOn(console, m).mockImplementation((...args: unknown[]) => { logged.push(JSON.stringify(args)); }));
    }
  }, 120000);

  afterAll(async () => {
    spies.forEach((s) => s.mockRestore());
    withoutKey();
    await prisma.$disconnect();
  });

  it('item 4: sem keyring ⇒ 503 dfe_cert_key_missing e nenhuma linha', async () => {
    withoutKey();
    const r = await put(pfxOk);
    expect(r.status).toBe(503);
    expect(JSON.stringify(r.body)).toContain('dfe_cert_key_missing');
    expect(await prisma.fiscalCertificate.count()).toBe(0);
  });

  it('item 5: PFX com o CNPJ da unidade ⇒ 200, view sem segredo, cifra com AAD = id, audit da allowlist', async () => {
    withKey();
    const r = await put(pfxOk);
    expect(r.status).toBe(200);
    const view = FiscalCertificateViewSchema.parse(r.body.data); // .strict(): nenhuma chave a mais
    expect(view).toMatchObject({ unitId, cnpjCertificado: CNPJ, notBefore: '2020-01-01', notAfter: '2049-12-31' });
    expect(view.diasParaVencer).toBeGreaterThan(0);

    const [row] = await live();
    const keyring = loadKeyring(process.env, DFE_CERT_KEYRING);
    expect(open(row.keyCiphertext!, row.id, row.keyVersion!, keyring)).toContain('-----BEGIN PRIVATE KEY-----');
    expect(() => open(row.keyCiphertext!, 'outra-linha', row.keyVersion!, keyring)).toThrow();

    const [ev] = await eventos('fiscal_certificate.set');
    expect(Object.keys(payloadOf(ev.payload)).sort()).toEqual(['fingerprintSha256', 'notAfter', 'unitId']);
    expect(logged.join('\n')).not.toContain(SENHA);
    expect(JSON.stringify(r.body)).not.toContain(SENHA);
  });

  it.each([
    ['senha errada', () => put(pfxOk, 'outra-senha'), 'certificado_senha_invalida'],
    ['arquivo que não é PKCS#12', () => put(Buffer.from('não é pfx')), 'certificado_ilegivel'],
    ['CNPJ de outra unidade', () => put(makeTestPfx({ cnpj: OUTRO_CNPJ, password: SENHA })), 'certificado_cnpj_divergente'],
    ['certificado vencido', () => put(makeTestPfx({ cnpj: CNPJ, password: SENHA, notAfter: '2021-01-01' })), 'certificado_vencido'],
    ['chave de outro par', () => put(makeTestPfx({ cnpj: CNPJ, password: SENHA, mismatchKey: true })), 'certificado_chave_nao_corresponde'],
    ['sem CNPJ no OtherName', () => put(makeTestPfx({ password: SENHA })), 'certificado_sem_cnpj'],
  ])('item 5: %s ⇒ 422 nomeado, nada gravado', async (_nome, call, code) => {
    withKey();
    const before = await prisma.fiscalCertificate.count();
    const r = await call();
    expect(r.status).toBe(422);
    expect(JSON.stringify(r.body)).toContain(code);
    expect(await prisma.fiscalCertificate.count()).toBe(before);
  });

  it('item 6: GET devolve a view; outro usuário não enxerga (404)', async () => {
    const r = await request(app).get(`${BASE}/${unitId}`).set(authHeader(dono));
    expect(r.status).toBe(200);
    FiscalCertificateViewSchema.parse(r.body.data);
    expect((await request(app).get(`${BASE}/${unitId}`).set(authHeader(outro))).status).toBe(404);
  });

  it('item 3: trocar o certificado apaga (soft) a linha viva e cria outra', async () => {
    withKey();
    const before = await live();
    expect((await put(makeTestPfx({ cnpj: CNPJ, password: SENHA }))).status).toBe(200);
    const after = await live();
    expect(after).toHaveLength(1);
    expect(after[0].id).not.toBe(before[0].id);
    const old = await prisma.fiscalCertificate.findUniqueOrThrow({ where: { id: before[0].id } });
    expect(old.deletedAt).not.toBeNull();
    expect(old.keyCiphertext).toBeNull();
  });

  it('item 6: DELETE ⇒ 204, ciphertext zerado na mesma tx, audit sem segredo; GET ⇒ 404; novo upload volta a valer', async () => {
    const [row] = await live();
    const r = await request(app).delete(`${BASE}/${unitId}`).set(authHeader(dono));
    expect(r.status).toBe(204);
    const gone = await prisma.fiscalCertificate.findUniqueOrThrow({ where: { id: row.id } });
    expect(gone.deletedAt).not.toBeNull();
    expect(gone.keyCiphertext).toBeNull();
    expect(gone.certCiphertext).toBeNull();
    const [ev] = await eventos('fiscal_certificate.removed');
    expect(Object.keys(payloadOf(ev.payload)).sort()).toEqual(['fingerprintSha256', 'notAfter', 'unitId']);
    expect((await request(app).get(`${BASE}/${unitId}`).set(authHeader(dono))).status).toBe(404);
    expect((await request(app).delete(`${BASE}/${unitId}`).set(authHeader(dono))).status).toBe(404);
    withKey();
    expect((await put(pfxOk)).status).toBe(200);
  });
});
