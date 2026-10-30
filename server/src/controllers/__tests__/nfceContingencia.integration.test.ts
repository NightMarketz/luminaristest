/**
 * X10a PR-9 (BE-INCR-NFCE-EMENDA-1 E-9; D-2026-10-29-X10A-PR7-9-FORKS decisões 4, 6 e 8) — contrato HTTP da contingência
 * off-line da NFC-e por unidade e ambiente e o repositório Prisma real (estado e nota normal órfã): uma linha por
 * (unidade, ambiente), audit da allowlist sem o xJust, a saída AUTO que não derruba a MANUAL e tenancy.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { NfceContingenciaViewSchema } from '@/features/accounting/dtos/NfceContingenciaDto';
import { NfceContingenciaRepository } from '@/features/accounting/repositories/NfceContingenciaRepository';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/nfce-contingencia';
const XJUST = 'Queda do link de internet da loja desde as 10h';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let unitId: string;
const payloadOf = (p: unknown) => (typeof p === 'string' ? JSON.parse(p) : p) as Record<string, unknown>;

describe('X10a PR-9 — contingência off-line da NFC-e por unidade', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'cont', username: 'cont-dono', email: 'cont@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'cont2', username: 'cont-outro', email: 'cont2@test.local', password: 'x', role: 'USER' } });
    const units = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Units', internalName: 'units', category: 'business', schema: { fields: [] } as never },
    });
    unitId = (await prisma.dynamicTableData.create({ data: { dynamicTableId: units.id, data: { name: 'Centro', cnpj: '11.444.777/0001-61' } as never } })).id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('DTO: ligar sem xJust, xJust curto, xJust ao desligar ou campo extra ⇒ 400', async () => {
    for (const body of [
      { ambiente: 'homologacao', ativa: true },
      { ambiente: 'homologacao', ativa: true, xJust: 'curto' },
      { ambiente: 'homologacao', ativa: false, xJust: XJUST },
      { ambiente: 'homologacao', ativa: true, xJust: XJUST, extra: 1 },
    ]) {
      expect((await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send(body)).status).toBe(400);
    }
    expect(await prisma.nfceContingencia.count()).toBe(0);
  });

  it('GET sem linha ⇒ os dois ambientes desligados', async () => {
    const r = await request(app).get(`${BASE}/${unitId}`).set(authHeader(dono));
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual([
      { unitId, ambiente: 'homologacao', ativa: false, origem: null, dhCont: null, xJust: null },
      { unitId, ambiente: 'producao', ativa: false, origem: null, dhCont: null, xJust: null },
    ]);
  });

  it('PUT liga (MANUAL, dhCont, xJust); audit dfe.contingency_entered sem o xJust; a saída AUTO não a derruba; PUT desliga ⇒ contingency_left', async () => {
    const r = await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send({ ambiente: 'homologacao', ativa: true, xJust: XJUST });
    expect(r.status).toBe(200);
    expect(NfceContingenciaViewSchema.parse(r.body.data)).toMatchObject({ unitId, ambiente: 'homologacao', ativa: true, origem: 'MANUAL', xJust: XJUST });
    const [ev] = await prisma.auditEvent.findMany({ where: { eventType: 'dfe.contingency_entered' } });
    expect(Object.keys(payloadOf(ev.payload)).sort()).toEqual(['ambiente', 'dhCont', 'origem', 'unitId']);
    expect(JSON.stringify(ev.payload)).not.toContain(XJUST);

    const repo = new NfceContingenciaRepository();
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, unitId);
    expect(await repo.desligar(scope, 'homologacao', 'AUTO')).toBe(false); // decisão 8: a saída automática não tira a manual
    expect((await repo.findEstado(scope, 'homologacao'))?.ativa).toBe(true);

    const off = await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send({ ambiente: 'homologacao', ativa: false });
    expect(off.body.data).toMatchObject({ ativa: false, dhCont: null, xJust: null });
    expect(await prisma.auditEvent.count({ where: { eventType: 'dfe.contingency_left' } })).toBe(1);
    expect(await prisma.nfceContingencia.count({ where: { userId: dono.id } })).toBe(1); // uma linha por (unidade, ambiente)
  });

  it('repositório real: AUTO sai pelo desligar(AUTO); órfã PENDING listada só depois de olderThan, atualizada e achada pelo documento', async () => {
    const repo = new NfceContingenciaRepository();
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, unitId);
    await repo.ligar(scope, 'producao', { origem: 'AUTO', dhCont: new Date(), xJust: 'Falha de comunicacao com a SEFAZ' });
    expect(await repo.desligar(scope, 'producao', 'AUTO')).toBe(true);
    expect(await repo.desligar(scope, 'producao', 'AUTO')).toBe(false);

    const chave = `35261011444777000161650030000000011${'12345678'}0`;
    const orfa = await repo.createOrfa(scope, { documentId: 'doc-x', ambiente: 'homologacao', serie: 3, numero: 1n, chave });
    expect(orfa).toMatchObject({ status: 'PENDING', tentativas: 0, numero: 1n });
    expect(await repo.listOrfasPendentes(new Date(orfa.createdAt.getTime() - 1), 10)).toHaveLength(0);
    expect((await repo.listOrfasPendentes(new Date(Date.now() + 1000), 10)).map((o) => o.id)).toEqual([orfa.id]);
    await repo.updateOrfa(orfa.id, { status: 'FAILED', tentativas: 1, ultimoErro: '501 fora do prazo' });
    expect(await repo.listOrfasPendentes(new Date(Date.now() + 1000), 10)).toHaveLength(0);
    expect(await repo.listOrfasDosDocumentos(scope, ['doc-x'])).toEqual([expect.objectContaining({ status: 'FAILED', ultimoErro: '501 fora do prazo' })]);
    const alheio = resolveAccountingScopeInternal({ userId: outro.id }, unitId);
    expect(await repo.listOrfasDosDocumentos(alheio, ['doc-x'])).toHaveLength(0);
  });

  it('revisão F (órfãs): a que espera é tocada e vai para o fim do rodízio — não toma o teto das outras', async () => {
    const repo = new NfceContingenciaRepository();
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, unitId);
    const chave = (n: number) => `352610114447770001616500300000000${n}9${'12345678'}0`;
    const a = await repo.createOrfa(scope, { documentId: 'doc-r1', ambiente: 'homologacao', serie: 3, numero: 11n, chave: chave(11) });
    await new Promise((r) => setTimeout(r, 15));
    const b = await repo.createOrfa(scope, { documentId: 'doc-r2', ambiente: 'homologacao', serie: 3, numero: 12n, chave: chave(12) });
    const futuro = new Date(Date.now() + 1000);
    expect((await repo.listOrfasPendentes(futuro, 1)).map((o) => o.id)).toEqual([a.id]);
    await new Promise((r) => setTimeout(r, 15));
    await repo.updateOrfa(a.id, { tentativas: 1 }); // o job tocou a que espera
    expect((await repo.listOrfasPendentes(futuro, 1)).map((o) => o.id)).toEqual([b.id]);
  });

  it('tenancy: outro usuário não lê nem liga a contingência desta unidade', async () => {
    expect((await request(app).get(`${BASE}/${unitId}`).set(authHeader(outro))).status).toBeGreaterThanOrEqual(403);
    expect((await request(app).put(`${BASE}/${unitId}`).set(authHeader(outro)).send({ ambiente: 'homologacao', ativa: true, xJust: XJUST })).status).toBeGreaterThanOrEqual(403);
    expect(await prisma.nfceContingencia.count({ where: { userId: outro.id } })).toBe(0);
  });
});
