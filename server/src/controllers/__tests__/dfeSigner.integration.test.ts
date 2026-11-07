/**
 * X10a EMENDA-4 AL-PR-2 (AL-3, AL-4, AL-5, AL-12, AL-16; F-AL-3 a; D-2026-11-07-X10A-EMENDA-4-LACUNAS L-AL-2, L-AL-3) —
 * contrato HTTP ponta a ponta do pareamento do assinador local, pela pilha real (régua A6): rota de usuário gera o
 * código; a rota do assinador (sem JWT) troca o código pelo token de dispositivo; a view e a revogação voltam pela rota
 * de usuário. O certificado é de teste em software (`makeTestCert`), nunca ICP-Brasil.
 */
import { createHash } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { DfeSignerPareamentoRespostaSchema, DfeSignerViewSchema, DfeSignerCodigoViewSchema } from '@/features/accounting/dtos/DfeSignerDto';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { makeTestCert } from '@test/helpers/nfeSignature';

const app = makeApp();
const USER = '/api/accounting/dfe-assinador';
const DEVICE = '/api/dfe-assinador/v1/pareamento';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let centro: string; // 11444777/0001-61
let filial: string; // 11444777/0002-42 (mesma raiz)
let outraRaiz: string; // 12345678/0001-95

const derB64 = (pem: string) => pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
const CERT = derB64(makeTestCert({ cnpj: '11444777000161', responsavelCpf: '52998224725' }));
const CERT_FILIAL = derB64(makeTestCert({ cnpj: '11444777000242', notAfter: '2048-01-01' }));
const CERT_OUTRA_RAIZ = derB64(makeTestCert({ cnpj: '12345678000195' }));
const CERT_VENCIDO = derB64(makeTestCert({ cnpj: '11444777000161', notBefore: '2019-01-01', notAfter: '2021-01-01' }));
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const payloadOf = (p: unknown) => (typeof p === 'string' ? JSON.parse(p) : p) as Record<string, unknown>;

async function codigo(unitId: string): Promise<string> {
  const r = await request(app).post(`${USER}/${unitId}/codigos`).set(authHeader(dono));
  expect(r.status).toBe(201);
  return DfeSignerCodigoViewSchema.parse(r.body.data).codigo;
}
function parear(body: { codigo: string; cert?: string; nome?: string }, token?: string) {
  const req = request(app).post(DEVICE);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send({ codigo: body.codigo, nomeDispositivo: body.nome ?? 'Caixa 1', versaoAssinador: '1.0.0', certificadoDerB64: body.cert ?? CERT });
}
const view = (unitId: string) => request(app).get(`${USER}/${unitId}`).set(authHeader(dono));

describe('X10a EMENDA-4 AL-PR-2 — pareamento do assinador local', () => {
  beforeAll(async () => {
    pushTestSchema();
    process.env.DFE_PARTNER_ENV = 'homologacao';
    dono = await prisma.user.create({ data: { name: 'al', username: 'al-dono', email: 'al@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'al2', username: 'al-outro', email: 'al2@test.local', password: 'x', role: 'USER' } });
    const units = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Units', internalName: 'units', category: 'business', schema: { fields: [] } as never },
    });
    const unit = async (name: string, cnpj: string) =>
      (await prisma.dynamicTableData.create({ data: { dynamicTableId: units.id, data: { name, cnpj } as never } })).id;
    centro = await unit('Centro', '11.444.777/0001-61');
    filial = await unit('Filial Norte', '11.444.777/0002-42');
    outraRaiz = await unit('Loja Outra Raiz', '12.345.678/0001-95');
  }, 120000);

  afterAll(async () => {
    delete process.env.DFE_PARTNER_ENV;
    await prisma.$disconnect();
  });

  it('AL-3: código de 12 caracteres sem ambíguos, TTL 10 min, só o hash no banco; outro dono não gera', async () => {
    const r = await request(app).post(`${USER}/${centro}/codigos`).set(authHeader(dono));
    expect(r.status).toBe(201);
    const { codigo: c, expiraEm } = DfeSignerCodigoViewSchema.parse(r.body.data);
    expect(c).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{12}$/);
    const ttl = Date.parse(expiraEm) - Date.now();
    expect(ttl).toBeGreaterThan(9 * 60_000);
    expect(ttl).toBeLessThanOrEqual(10 * 60_000);
    const row = await prisma.dfeSignerPairingCode.findUniqueOrThrow({ where: { codeHash: sha256(c) } });
    expect(JSON.stringify(row)).not.toContain(c);
    const alheio = await request(app).post(`${USER}/${centro}/codigos`).set(authHeader(outro));
    expect(alheio.status).toBeGreaterThanOrEqual(400);
  });

  it('AL-3: certificado de outra raiz e certificado vencido ⇒ 400 nomeado, com a unidade e o caixa pelo nome', async () => {
    const raiz = await parear({ codigo: await codigo(centro), cert: CERT_OUTRA_RAIZ, nome: 'Caixa Balcão' });
    expect(raiz.status).toBe(400);
    expect(JSON.stringify(raiz.body)).toContain('dfe_signer_cnpj_divergente');
    expect(JSON.stringify(raiz.body)).toContain('Centro');
    expect(JSON.stringify(raiz.body)).toContain('Caixa Balcão');
    const vencido = await parear({ codigo: await codigo(centro), cert: CERT_VENCIDO });
    expect(vencido.status).toBe(400);
    expect(JSON.stringify(vencido.body)).toContain('dfe_signer_certificado_vencido');
    expect(await prisma.dfeSignerDevice.count()).toBe(0);
  });

  it('AL-3: caminho feliz devolve o token uma vez e grava só o hash; o código não vale de novo; vencido ⇒ 400', async () => {
    const c = await codigo(centro);
    const r = await parear({ codigo: c });
    expect(r.status).toBe(201);
    const resp = DfeSignerPareamentoRespostaSchema.parse(r.body);
    expect(resp.token).toHaveLength(43);
    expect(resp.ambiente).toBe('homologacao');
    expect(resp.unidades).toEqual([{ unitId: centro, cnpj: '11444777000161' }]);
    const device = await prisma.dfeSignerDevice.findUniqueOrThrow({ where: { id: resp.dispositivoId } });
    expect(device.tokenHash).toBe(sha256(resp.token!));
    expect(JSON.stringify(device)).not.toContain(resp.token!);
    expect(device.certCnpj).toBe('11444777000161');
    expect(device.certCnpjRaiz).toBe('11444777');
    expect(device.certThumbprint).toBe(createHash('sha256').update(Buffer.from(CERT, 'base64')).digest('hex'));
    // AL-16: a trilha leva só raiz, validade e impressão digital — nunca o certificado, o CPF do responsável nem o token.
    const [ev] = await prisma.auditEvent.findMany({ where: { eventType: 'dfe_signer.paired' } });
    expect(Object.keys(payloadOf(ev.payload)).sort()).toEqual(['certCnpjRaiz', 'certNotAfter', 'certThumbprint', 'dispositivoId', 'unitId', 'vinculo']);
    expect(JSON.stringify(payloadOf(ev.payload))).not.toContain('52998224725');

    const reuso = await parear({ codigo: c });
    expect(reuso.status).toBe(400);
    expect(JSON.stringify(reuso.body)).toContain('dfe_signer_codigo_invalido');
    const velho = await codigo(centro);
    await prisma.dfeSignerPairingCode.update({ where: { codeHash: sha256(velho) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expirado = await parear({ codigo: velho }, resp.token);
    expect(expirado.status).toBe(400);
    expect(JSON.stringify(expirado.body)).toContain('dfe_signer_codigo_invalido');
  });

  it('AL-5: token desconhecido ⇒ 401; token de dispositivo numa rota de usuário ⇒ 401', async () => {
    const desconhecido = await parear({ codigo: await codigo(centro) }, 'x'.repeat(43));
    expect(desconhecido.status).toBe(401);
    const [device] = await prisma.dfeSignerDevice.findMany({ where: { deletedAt: null } });
    const tokenFalso = 'A'.repeat(43);
    await prisma.dfeSignerDevice.update({ where: { id: device.id }, data: { tokenHash: sha256(tokenFalso) } });
    const naRotaDeUsuario = await request(app).get(`${USER}/${centro}`).set('Authorization', `Bearer ${tokenFalso}`);
    expect(naRotaDeUsuario.status).toBe(401);
  });

  it('L-AL-2: o mesmo dispositivo serve a filial (código novo + Bearer + mesmo certificado) — sem token novo', async () => {
    const tokenFalso = 'A'.repeat(43); // o hash gravado no teste anterior
    const outroCert = await parear({ codigo: await codigo(filial), cert: CERT_FILIAL }, tokenFalso);
    expect(outroCert.status).toBe(400);
    expect(JSON.stringify(outroCert.body)).toContain('dfe_signer_certificado_divergente');
    const raiz = await parear({ codigo: await codigo(outraRaiz) }, tokenFalso);
    expect(raiz.status).toBe(400);
    expect(JSON.stringify(raiz.body)).toContain('dfe_signer_cnpj_divergente');

    const r = await parear({ codigo: await codigo(filial) }, tokenFalso);
    expect(r.status).toBe(200);
    const resp = DfeSignerPareamentoRespostaSchema.parse(r.body);
    expect(resp.token).toBeUndefined();
    expect(resp.unidades.map((u) => u.unitId).sort()).toEqual([centro, filial].sort());
    expect(await prisma.dfeSignerDevice.count({ where: { deletedAt: null } })).toBe(1);
  });

  it('AL-12: a view traz o estado sem segredo e as outras unidades pelo nome; unidade sem assinador ⇒ null', async () => {
    const r = await view(centro);
    expect(r.status).toBe(200);
    const v = DfeSignerViewSchema.parse(r.body.data);
    expect(v).toMatchObject({ nome: 'Caixa 1', online: false, lastSeenAt: null, tokenPresente: false, certCnpjRaiz: '11444777', ambiente: 'homologacao', versaoMinima: '1.0.0' });
    expect(v.diasParaVencer).toBeGreaterThan(365);
    expect(v.outrasUnidades).toEqual([{ unitId: filial, nome: 'Filial Norte' }]);
    const device = await prisma.dfeSignerDevice.findUniqueOrThrow({ where: { id: v.dispositivoId } });
    expect(JSON.stringify(r.body)).not.toContain(device.tokenHash);
    expect(JSON.stringify(r.body)).not.toContain(CERT.slice(0, 60));
    const vazia = await view(outraRaiz);
    expect(vazia.status).toBe(200);
    expect(vazia.body.data).toBeNull();
  });

  it('L-AL-3: revogar tira só o vínculo da unidade; o último vínculo revoga o dispositivo (token 401)', async () => {
    const tokenFalso = 'A'.repeat(43);
    expect((await request(app).delete(`${USER}/${centro}`).set(authHeader(dono))).status).toBe(204);
    expect((await view(centro)).body.data).toBeNull();
    const naFilial = DfeSignerViewSchema.parse((await view(filial)).body.data);
    expect(naFilial.outrasUnidades).toEqual([]);
    // o token segue valendo: o dispositivo ainda serve a filial
    expect((await parear({ codigo: await codigo(filial) }, tokenFalso)).status).toBe(200);
    const [rev] = await prisma.auditEvent.findMany({ where: { eventType: 'dfe_signer.revoked' } });
    expect(payloadOf(rev.payload)).toMatchObject({ unitId: centro, motivo: 'revogado', dispositivoRevogado: 'false' });

    expect((await request(app).delete(`${USER}/${filial}`).set(authHeader(dono))).status).toBe(204);
    expect((await request(app).delete(`${USER}/${filial}`).set(authHeader(dono))).status).toBe(404);
    expect((await parear({ codigo: await codigo(filial) }, tokenFalso)).status).toBe(401);
  });

  it('AL-4: parear de novo na unidade revoga o assinador anterior na mesma tx (o token antigo dá 401)', async () => {
    const primeiro = DfeSignerPareamentoRespostaSchema.parse((await parear({ codigo: await codigo(centro), nome: 'Caixa A' })).body);
    const segundo = await parear({ codigo: await codigo(centro), nome: 'Caixa B' });
    expect(segundo.status).toBe(201);
    expect(DfeSignerViewSchema.parse((await view(centro)).body.data).nome).toBe('Caixa B');
    expect((await parear({ codigo: await codigo(centro) }, primeiro.token)).status).toBe(401);
    const subst = await prisma.auditEvent.findMany({ where: { eventType: 'dfe_signer.revoked' } });
    expect(subst.map((e) => payloadOf(e.payload).motivo)).toContain('substituido');
  });

  it('sem o ambiente da emissão configurado ⇒ 503 nomeado, nenhum dispositivo novo', async () => {
    const antes = await prisma.dfeSignerDevice.count();
    delete process.env.DFE_PARTNER_ENV;
    const r = await parear({ codigo: await codigo(centro) });
    process.env.DFE_PARTNER_ENV = 'homologacao';
    expect(r.status).toBe(503);
    expect(JSON.stringify(r.body)).toContain('dfe_signer_ambiente_nao_configurado');
    expect(await prisma.dfeSignerDevice.count()).toBe(antes);
  });

  it('AL-3: o mesmo código em 4 pareamentos simultâneos vale uma vez só (consumo atômico dentro da tx)', async () => {
    const antes = await prisma.dfeSignerDevice.count();
    const c = await codigo(filial);
    const rs = await Promise.all([1, 2, 3, 4].map((i) => parear({ codigo: c, nome: `Caixa ${i}` })));
    expect(rs.map((r) => r.status).sort()).toEqual([201, 400, 400, 400]);
    expect(await prisma.dfeSignerDevice.count()).toBe(antes + 1);
  });

  it('L-AL-2: o Bearer de um dispositivo de outro dono não vincula a unidade dele (código inválido, nada muda)', async () => {
    const mine = DfeSignerPareamentoRespostaSchema.parse((await parear({ codigo: await codigo(filial), nome: 'Caixa do dono' })).body);
    const units = await prisma.dynamicTable.create({
      data: { userId: outro.id, name: 'Units', internalName: 'units', category: 'business', schema: { fields: [] } as never },
    });
    const lojaDoOutro = (await prisma.dynamicTableData.create({ data: { dynamicTableId: units.id, data: { name: 'Loja do Outro', cnpj: '11.444.777/0001-61' } as never } })).id;
    const c = await request(app).post(`${USER}/${lojaDoOutro}/codigos`).set(authHeader(outro));
    expect(c.status).toBe(201);
    const r = await parear({ codigo: c.body.data.codigo }, mine.token);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('dfe_signer_codigo_invalido');
    expect(await prisma.dfeSignerDeviceUnit.count({ where: { unitId: lojaDoOutro } })).toBe(0);
  });

  it('o código digitado com hífens e minúsculas é o mesmo código', async () => {
    const c = await codigo(outraRaiz);
    const digitado = `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`.toLowerCase();
    const r = await parear({ codigo: digitado, cert: CERT_OUTRA_RAIZ });
    expect(r.status).toBe(201);
  });
});
