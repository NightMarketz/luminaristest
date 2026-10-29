/**
 * X10a PR-8 (BE-INCR-NFCE-EMENDA-1 §4; D-2026-10-29-X10A-PR7-9-FORKS decisão 3) — contrato HTTP do CSC da NFC-e por unidade
 * e ambiente: cifrado com DFE_PSC_KEYS (AAD = id), uma linha viva por ambiente, view sem o CSC, audit da allowlist,
 * policy do perfil fiscal e falha fechada sem keyring.
 */
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { loadKeyring, open } from '@/lib/secretBox';
import { DFE_PSC_KEYRING } from '@/features/accounting/models/PscCredential.model';
import { NfceCscViewSchema } from '@/features/accounting/dtos/NfceCscDto';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/nfce-cscs';
const CSC = 'A1B2C3D4E5F6G7H8I9J0K1L2';
const CSC_NOVO = 'Z9Y8X7W6V5U4T3S2R1Q0';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let unitId: string;

function withKey() {
  process.env.DFE_PSC_KEYS = process.env.DFE_PSC_KEYS ?? `1:${randomBytes(32).toString('base64')}`;
  process.env.DFE_PSC_KEY_ACTIVE = '1';
}
function withoutKey() {
  delete process.env.DFE_PSC_KEYS;
  delete process.env.DFE_PSC_KEY_ACTIVE;
}
const payloadOf = (p: unknown) => (typeof p === 'string' ? JSON.parse(p) : p) as Record<string, unknown>;

describe('X10a PR-8 — CSC da NFC-e por unidade', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'csc', username: 'csc-dono', email: 'csc@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'csc2', username: 'csc-outro', email: 'csc2@test.local', password: 'x', role: 'USER' } });
    const units = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Units', internalName: 'units', category: 'business', schema: { fields: [] } as never },
    });
    unitId = (await prisma.dynamicTableData.create({ data: { dynamicTableId: units.id, data: { name: 'Centro', cnpj: '11.444.777/0001-61' } as never } })).id;
  }, 120000);

  afterAll(async () => {
    withoutKey();
    await prisma.$disconnect();
  });

  it('sem DFE_PSC_KEYS ⇒ 503 dfe_psc_key_missing, nenhuma linha', async () => {
    withoutKey();
    const r = await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send({ ambiente: 'homologacao', cscId: '000001', csc: CSC });
    expect(r.status).toBe(503);
    expect(JSON.stringify(r.body)).toContain('dfe_psc_key_missing');
    expect(await prisma.nfceCsc.count()).toBe(0);
  });

  it('DTO: CSC fora de 16–36 alfanuméricos ou idCSC com letra ⇒ 400; corpo com campo extra ⇒ 400', async () => {
    withKey();
    for (const body of [
      { ambiente: 'homologacao', cscId: '1', csc: 'curto' },
      { ambiente: 'homologacao', cscId: 'A1', csc: CSC },
      { ambiente: 'homologacao', cscId: '1', csc: CSC, extra: 1 },
    ]) {
      expect((await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send(body)).status).toBe(400);
    }
  });

  it('PUT grava cifrado (AAD = id); a view nunca traz o CSC; audit nfce_csc.set só com unitId/ambiente/cscId', async () => {
    withKey();
    const r = await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send({ ambiente: 'homologacao', cscId: '000001', csc: CSC });
    expect(r.status).toBe(200);
    expect(NfceCscViewSchema.parse(r.body.data)).toMatchObject({ unitId, ambiente: 'homologacao', cscId: '000001' });
    expect(JSON.stringify(r.body)).not.toContain(CSC);
    const row = await prisma.nfceCsc.findFirstOrThrow({ where: { userId: dono.id, deletedAt: null } });
    expect(Buffer.from(row.cscCiphertext!).toString('utf8')).not.toContain(CSC);
    expect(open(row.cscCiphertext!, row.id, row.keyVersion!, loadKeyring(process.env, DFE_PSC_KEYRING))).toBe(CSC);
    const [ev] = await prisma.auditEvent.findMany({ where: { eventType: 'nfce_csc.set' } });
    expect(Object.keys(payloadOf(ev.payload)).sort()).toEqual(['ambiente', 'cscId', 'unitId']);
    expect(JSON.stringify(ev.payload)).not.toContain(CSC);
  });

  it('PUT de novo no mesmo ambiente troca: uma linha viva, a anterior apagada com o ciphertext zerado; a emissão lê a nova', async () => {
    withKey();
    expect((await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send({ ambiente: 'homologacao', cscId: '2', csc: CSC_NOVO })).status).toBe(200);
    expect((await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send({ ambiente: 'producao', cscId: '1', csc: CSC })).status).toBe(200);
    const vivas = await prisma.nfceCsc.findMany({ where: { userId: dono.id, deletedAt: null }, orderBy: { ambiente: 'asc' } });
    expect(vivas.map((v) => [v.ambiente, v.cscId])).toEqual([['homologacao', '2'], ['producao', '1']]);
    const apagada = await prisma.nfceCsc.findFirstOrThrow({ where: { userId: dono.id, cscId: '000001' } });
    expect(apagada.deletedAt).not.toBeNull();
    expect(apagada.cscCiphertext).toBeNull();
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, unitId);
    expect(await getFactory().getNfceCscService().resolveForEmission(scope, 'homologacao')).toEqual({ id: '2', csc: CSC_NOVO });
    const lista = await request(app).get(`${BASE}/${unitId}`).set(authHeader(dono));
    expect(lista.status).toBe(200);
    expect(lista.body.data.map((v: { ambiente: string }) => v.ambiente)).toEqual(['homologacao', 'producao']);
    expect(JSON.stringify(lista.body)).not.toMatch(new RegExp(`${CSC}|${CSC_NOVO}`));
  });

  it('tenancy: outro usuário não lê nem grava o CSC desta unidade', async () => {
    withKey();
    expect((await request(app).get(`${BASE}/${unitId}`).set(authHeader(outro))).status).toBeGreaterThanOrEqual(403);
    expect((await request(app).put(`${BASE}/${unitId}`).set(authHeader(outro)).send({ ambiente: 'homologacao', cscId: '9', csc: CSC })).status).toBeGreaterThanOrEqual(403);
    expect(await prisma.nfceCsc.count({ where: { userId: outro.id } })).toBe(0);
  });

  it('DELETE ?ambiente= ⇒ 204, audit nfce_csc.removed, a emissão deixa de achar; o 2º DELETE ⇒ 404; sem ambiente ⇒ 400', async () => {
    withKey();
    expect((await request(app).delete(`${BASE}/${unitId}`).set(authHeader(dono))).status).toBe(400);
    expect((await request(app).delete(`${BASE}/${unitId}`).query({ ambiente: 'homologacao' }).set(authHeader(dono))).status).toBe(204);
    expect(await prisma.auditEvent.count({ where: { eventType: 'nfce_csc.removed' } })).toBe(1);
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, unitId);
    expect(await getFactory().getNfceCscService().resolveForEmission(scope, 'homologacao')).toBeNull();
    expect((await request(app).delete(`${BASE}/${unitId}`).query({ ambiente: 'homologacao' }).set(authHeader(dono))).status).toBe(404);
  });
});
