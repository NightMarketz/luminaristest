/**
 * GAP-MAP N3 — `addedFields` do Controle Total não vaza para o preset compartilhado.
 * `handleCustomCreation` fazia `tableSchema.fields.push(...)` direto no schema do singleton `BeautySalonPreset`
 * (módulo carregado uma vez por processo). O campo extra do tenant A passava a ser instalado no tenant B pelo
 * modo Rápido, no mesmo processo. Cada create precisa de um usuário novo (guarda one-shot → 403).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import BeautySalonPreset from '@/features/dynamicTables/presets/systems/BeautySalonPreset';

const app = makeApp();
let n = 0;
const novoUsuario = () => {
  n += 1;
  return prisma.user
    .create({ data: { name: `addf-${n}`, username: `addf-user-${n}`, email: `addf-${n}@test.local`, password: 'x', role: 'USER' } })
    .then((u) => ({ id: u.id, username: u.username }));
};
const camposDeCustomers = async (who: { id: string; username: string }) => {
  const r = await request(app).get('/api/dynamic-tables').set(authHeader(who));
  const customers = (r.body.data ?? []).find((t: { internalName: string }) => t.internalName === 'customers');
  return (customers?.schema?.fields ?? []).map((f: { name: string }) => f.name) as string[];
};
const tenantACriaComCampoExtra = async (campo: string) => {
  const a = await novoUsuario();
  const r = await request(app)
    .post('/api/dashboard/create')
    .set(authHeader(a))
    .send({
      mode: 'custom',
      presetKey: 'beautySalon',
      removedTables: [],
      unit: { name: 'U' },
      addedFields: { customers: [{ name: campo, label: 'Campo A', type: 'string', required: false }] },
    });
  expect({ status: r.status, body: r.body }).toMatchObject({ status: 201 });
  return a;
};

describe('addedFields do Controle Total não vaza entre tenants', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('tenant A (custom + addedFields) recebe o campo, e o schema do preset compartilhado não cresce', async () => {
    const tamanhoAntes = BeautySalonPreset.tables.customers?.schema?.fields.length;
    const a = await tenantACriaComCampoExtra('campoDoTenantA1');
    // controle positivo: o campo chega ao tenant A (o caminho de addedFields rodou)
    expect(await camposDeCustomers(a)).toContain('campoDoTenantA1');
    expect(BeautySalonPreset.tables.customers?.schema?.fields.length).toBe(tamanhoAntes);
  });

  it('tenant B (quick) depois do tenant A não instala o campo do tenant A', async () => {
    await tenantACriaComCampoExtra('campoDoTenantA2');
    const b = await novoUsuario();
    const rb = await request(app)
      .post('/api/dashboard/create')
      .set(authHeader(b))
      .send({ mode: 'quick', suiteKey: 'beautySalon', unit: { name: 'U' } });
    expect(rb.status).toBe(201);
    expect(await camposDeCustomers(b)).not.toContain('campoDoTenantA2');
  });
});
