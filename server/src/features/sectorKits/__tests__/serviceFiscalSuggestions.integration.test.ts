/**
 * BE-INCR-KIT-SETOR-EMENDA-1, PR-K3 (7d–7f) — contrato HTTP da sugestão fiscal por serviço: app Express REAL + SQLite real.
 *  - 7e: GET lista os serviços da tabela `services` do DONO sem perfil fiscal NESTA unidade, com a sugestão da camada 1;
 *  - 7f: POST /preview sugere para um nome;
 *  - 7d: nenhum dos dois grava perfil fiscal de serviço (o `upsert` nunca é chamado, a contagem não muda);
 *  - L3: unidade sem kit ⇒ 400 UNIDADE_SEM_KIT.
 * A IA (`?ia=1`) fica fora: com a chave de CI ela iria à rede; a camada 2 está coberta no teste unitário do serviço.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';

const app = makeApp();
const URL = '/api/service-fiscal-suggestions';
const UNIT = 'unit-k3';
let dono: { id: string; username: string };
let ids: Record<string, string>;

describe('sugestão fiscal por serviço (KIT-SETOR PR-K3)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'k3', username: 'k3-dono', email: 'k3@test.local', password: 'x', role: 'USER' } });
    await prisma.kitInstallation.create({
      data: { userId: dono.id, unitId: UNIT, kitKey: 'beautySalon', kitVersion: 4, status: 'INSTALLED', steps: '{"lastCompletedStep":7,"warnings":[]}' },
    });
    const tabela = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Services', internalName: 'services', category: 'services', schema: { fields: [] } },
    });
    ids = {};
    for (const name of ['Escova progressiva', 'Design de sobrancelha', 'Consultoria de imagem']) {
      ids[name] = (await prisma.dynamicTableData.create({ data: { dynamicTableId: tabela.id, data: { name } } })).id;
    }
    // a escova já tem perfil fiscal NESTA unidade ⇒ sai da varredura
    await prisma.serviceFiscalProfile.create({ data: { userId: dono.id, unitId: UNIT, serviceRef: ids['Escova progressiva'], cTribNac: '060101' } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('7e: GET lista só os serviços sem perfil na unidade, com a sugestão da camada 1 — e não grava nada (7d)', async () => {
    const upsert = jest.spyOn(ApplicationFactory.getInstance().getServiceFiscalProfileService(), 'upsert');
    const res = await request(app).get(URL).query({ unitId: UNIT }).set(authHeader(dono));
    expect(res.status).toBe(200);
    const porNome = Object.fromEntries(
      (res.body.data as Array<{ serviceRef: string; nome: string; sugestoes: Array<{ cTribNac: string; origem: string }> }>).map((p) => [p.nome, p]),
    );
    expect(Object.keys(porNome).sort()).toEqual(['Consultoria de imagem', 'Design de sobrancelha']);
    expect(porNome['Design de sobrancelha']).toMatchObject({ serviceRef: ids['Design de sobrancelha'], sugestoes: [{ cTribNac: '060201', origem: 'dicionario' }] });
    expect(porNome['Consultoria de imagem'].sugestoes).toEqual([]);
    expect(upsert).not.toHaveBeenCalled();
    expect(await prisma.serviceFiscalProfile.count({ where: { userId: dono.id } })).toBe(1);
    upsert.mockRestore();
  });

  it('7f: POST /preview sugere para o nome digitado', async () => {
    const res = await request(app).post(`${URL}/preview`).set(authHeader(dono)).send({ unitId: UNIT, nome: 'Drenagem linfática' });
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ key: 'massagem', cTribNac: '060301', cNBS: '126023000', origem: 'dicionario', termo: 'drenagem linfatica' });
    expect(await prisma.serviceFiscalProfile.count({ where: { userId: dono.id } })).toBe(1);
  });

  it('L3: unidade sem kit ⇒ 400 UNIDADE_SEM_KIT; ia fora de 0/1 e body sem nome ⇒ 400', async () => {
    const semKit = await request(app).get(URL).query({ unitId: 'unit-sem-kit' }).set(authHeader(dono));
    expect(semKit.status).toBe(400);
    expect(JSON.stringify(semKit.body)).toContain('UNIDADE_SEM_KIT');
    expect((await request(app).get(URL).query({ unitId: UNIT, ia: 'true' }).set(authHeader(dono))).status).toBe(400);
    expect((await request(app).post(`${URL}/preview`).set(authHeader(dono)).send({ unitId: UNIT })).status).toBe(400);
  });

  it('401 sem token', async () => {
    expect((await request(app).get(URL).query({ unitId: UNIT })).status).toBe(401);
  });
});
