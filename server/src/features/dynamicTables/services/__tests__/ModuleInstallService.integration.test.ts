/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS item 15: "ligar depois" por categoria. O `ModuleInstallService` já é genérico
 * (chave atômica do registro); o que se prova é que os submódulos de VENDAS instalam a própria tabela e restauram,
 * pelo sync aditivo, a relação opcional de `saleItems` descartada na criação (E5).
 * Tenant sem um catálogo: suíte `crmModule` + VENDAS com um catálogo só (PES-0/VEN-0 entram implícitos, F-MB-1/6).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
let n = 0;
const novoAdmin = () => {
  n += 1;
  return prisma.user
    .create({ data: { name: `mb-${n}`, username: `mb-user-${n}`, email: `mb-${n}@test.local`, password: 'x', role: 'ADMIN' } })
    .then((u) => ({ id: u.id, username: u.username, role: u.role }));
};
type Who = { id: string; username: string; role?: string };
const criar = (who: Who, modules: string[]) =>
  request(app).post('/api/dashboard/create').set(authHeader(who as never)).send({ suiteKey: 'crmModule', unit: { name: 'M' }, modules });
const instalar = (who: Who, moduleKey: string) =>
  request(app).post('/api/dashboard/modules/install').set(authHeader(who as never)).send({ moduleKey });
const tabela = (userId: string, internalName: string) => prisma.dynamicTable.findFirst({ where: { userId, internalName } });
const campos = async (userId: string, internalName: string) =>
  ((await tabela(userId, internalName))!.schema as unknown as { fields: { name: string; relation?: { targetTable: string } }[] }).fields;

describe('item 15 — ModuleInstallService por categoria (VENDAS)', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('instala VEN-PAC depois: tenant sem pacotes ganha `packages` e saleItems.packageId aponta para a tabela real', async () => {
    const u = await novoAdmin();
    const r = await criar(u, ['VEN-SERV']);
    expect(r.status).toBe(201);
    expect(r.body.data.modules.installed).toEqual(['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3', 'PES-0', 'VEN-0', 'VEN-SERV']);
    expect(await tabela(u.id, 'packages')).toBeNull();
    expect((await campos(u.id, 'saleItems')).map((f) => f.name)).not.toContain('packageId');

    const i = await instalar(u, 'VEN-PAC');
    expect(i.status).toBe(200);
    expect(i.body.data).toMatchObject({ status: 'installed', tables: ['packages'] });
    expect(i.body.data.synced).toContain('saleItems');

    const packages = (await tabela(u.id, 'packages'))!;
    expect((await campos(u.id, 'saleItems')).find((f) => f.name === 'packageId')?.relation?.targetTable).toBe(packages.id);
    // catálogo ainda ausente segue fora (relação opcional sem alvo não é restaurada)
    expect((await campos(u.id, 'saleItems')).map((f) => f.name)).not.toContain('productId');

    expect((await instalar(u, 'VEN-PAC')).body.data).toEqual({ status: 'already-installed', tables: ['packages'], synced: [] });
  });

  it('instala VEN-SERV depois: tenant só com Pacotes ganha `services` e saleItems.serviceId volta', async () => {
    const u = await novoAdmin();
    const r = await criar(u, ['VEN-PAC']);
    expect(r.status).toBe(201);
    expect((await campos(u.id, 'saleItems')).map((f) => f.name)).not.toContain('serviceId');

    const i = await instalar(u, 'VEN-SERV');
    expect(i.status).toBe(200);
    expect(i.body.data).toMatchObject({ status: 'installed', tables: ['services'] });
    const services = (await tabela(u.id, 'services'))!;
    expect((await campos(u.id, 'saleItems')).find((f) => f.name === 'serviceId')?.relation?.targetTable).toBe(services.id);
  });

  it('dependência: VEN-COM num tenant sem VENDAS → 400 nomeando VEN-0, nada instalado', async () => {
    const u = await novoAdmin();
    expect((await request(app).post('/api/dashboard/create').set(authHeader(u as never)).send({ suiteKey: 'crmModule', unit: { name: 'M' } })).status).toBe(201);
    const i = await instalar(u, 'VEN-COM');
    expect(i.status).toBe(400);
    expect(i.body.details).toEqual({ module: 'VEN-COM', missingModule: 'VEN-0' });
    expect(await tabela(u.id, 'commissions')).toBeNull();
  });

  it("grupo 'VENDAS' no create expande para os 5 módulos (item 7)", async () => {
    const u = await novoAdmin();
    const r = await criar(u, ['VENDAS']);
    expect(r.status).toBe(201);
    expect(r.body.data.modules.installed).toEqual([
      'CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3', 'PES-0', 'VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM',
    ]);
  });
});
