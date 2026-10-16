/**
 * `DynamicTableService.searchTableData` contra SQLite real — BRIEF BE-INCR-CHAT-AGENT PR-2, item 10
 * (F-I11-2 → b: filtro no repositório). O que um mock não prova: a semântica de `json_extract` /
 * `json_type` do SQLite (string × número, booleano, null/ausente) e que a busca enxerga a tabela
 * inteira.
 *
 * Falsificador (item 10): a linha procurada está na posição 230 de 250 pela ordem `createdAt DESC`.
 * A leitura antiga da ferramenta (`getTableData(…, 1, 200)` + filtro em memória, F5) não a vê — o
 * próprio teste afirma isso antes de afirmar que a busca nova a encontra.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { Role } from '@/features/users/models/User.model';
import { ForbiddenError, ValidationError } from '@/lib/errors';
import type { UserContext } from '@/lib/authUtils';

const OWNER = 'u-search-owner';
const OTHER = 'u-search-other';

const SCHEMA = {
  fields: [
    { name: 'code', label: 'Código', type: 'string' },
    { name: 'qty', label: 'Qtd', type: 'number' },
    { name: 'active', label: 'Ativo', type: 'boolean' },
    { name: 'note', label: 'Obs', type: 'string' },
    { name: 'phone', label: 'Telefone', type: 'string', format: 'phone' },
    { name: 'price', label: 'Preço', type: 'number', numberFormat: 'currency' },
  ],
};

function ctxFor(userId: string): UserContext {
  return {
    id: userId, userId, name: 'u', username: userId, email: `${userId}@test.co`,
    userEmail: `${userId}@test.co`, role: Role.USER, userRole: Role.USER,
    createdAt: new Date(), updatedAt: new Date(),
  };
}

const service = new DynamicTableService(new DynamicTableRepository(), new DynamicTablePolicy());
let tableId: string;
let targetId: string;

beforeAll(() => pushTestSchema(), 120000);

beforeEach(async () => {
  for (const id of [OWNER, OTHER]) {
    await prisma.user.create({ data: { id, username: id, email: `${id}@test.co`, password: 'x', role: Role.USER } });
  }
  const t = await service.createTableAsSystem(OWNER, {
    name: 'Itens', category: 'inventory', internalName: 'search_items', schema: SCHEMA,
  } as never);
  tableId = t.id;

  // 250 linhas com createdAt crescente: i = 0 é a mais antiga. i = 20 fica na posição 230 por createdAt DESC.
  const base = Date.UTC(2026, 0, 1);
  await prisma.dynamicTableData.createMany({
    data: Array.from({ length: 250 }, (_, i) => ({
      dynamicTableId: tableId,
      createdAt: new Date(base + i * 1000),
      data: i === 20 ? { code: 'ALVO', qty: 7, active: true, phone: '1199999', price: 100 } : { code: `C${i}`, qty: i % 2, active: false, note: 'x' },
    })),
  });
  targetId = (await prisma.dynamicTableData.findFirstOrThrow({ where: { dynamicTableId: tableId, data: { equals: { code: 'ALVO', qty: 7, active: true, phone: '1199999', price: 100 } } } })).id;
}, 60000);

afterEach(() => resetDb());
afterAll(() => disconnectDb());

describe('searchTableData — busca no SQL, tabela inteira', () => {
  it('encontra a linha na posição 230 de 250 (a amostra de 200 de hoje não a vê)', async () => {
    const sample = await service.getTableData(ctxFor(OWNER), tableId, 1, 200);
    expect(sample.data.map(r => r.id)).not.toContain(targetId);

    const res = await service.searchTableData(ctxFor(OWNER), tableId, { code: 'ALVO' });

    expect(res.rows.map(r => r.id)).toEqual([targetId]);
    expect(res.total).toBe(1);
    expect(res.rows[0].data).toEqual({ code: 'ALVO', qty: 7, active: true, phone: '1199999', price: 100 });
  });

  // F-DT-1 → (b): o valor é convertido para o tipo declarado do campo; a comparação no SQL segue tipada.
  it('campo texto: número vira texto e acha (telefone 1199999 gravado como "1199999")', async () => {
    expect((await service.searchTableData(ctxFor(OWNER), tableId, { phone: 1199999 })).rows.map(r => r.id)).toEqual([targetId]);
  });

  it('campo money (number/currency): "100" vira 100 e acha; "abc" → ValidationError com o tipo esperado', async () => {
    expect((await service.searchTableData(ctxFor(OWNER), tableId, { price: '100' })).rows.map(r => r.id)).toEqual([targetId]);
    await expect(service.searchTableData(ctxFor(OWNER), tableId, { price: 'abc' }))
      .rejects.toThrow(new ValidationError("Valor de filtro inválido no campo 'price': esperado número."));
  });

  it('campo booleano: "true" vira true e acha; true não casa com o número 1; número em booleano → ValidationError', async () => {
    expect((await service.searchTableData(ctxFor(OWNER), tableId, { active: 'true' })).rows.map(r => r.id)).toEqual([targetId]);
    expect((await service.searchTableData(ctxFor(OWNER), tableId, { active: true })).total).toBe(1);
    await expect(service.searchTableData(ctxFor(OWNER), tableId, { active: 1 })).rejects.toBeInstanceOf(ValidationError);
    // qty é número: true não converte para número.
    await expect(service.searchTableData(ctxFor(OWNER), tableId, { qty: true })).rejects.toBeInstanceOf(ValidationError);
  });

  it('null casa com campo ausente ou nulo', async () => {
    await prisma.dynamicTableData.create({ data: { dynamicTableId: tableId, data: { code: 'NULO', note: null } } });
    const res = await service.searchTableData(ctxFor(OWNER), tableId, { note: null }, 50);
    // ALVO (sem `note`) + NULO (`note: null`).
    expect(res.total).toBe(2);
    expect(res.rows.map(r => (r.data as { code: string }).code).sort()).toEqual(['ALVO', 'NULO']);
  });

  it('linha soft-deleted fica fora', async () => {
    await prisma.dynamicTableData.update({ where: { id: targetId }, data: { deletedAt: new Date() } });
    expect((await service.searchTableData(ctxFor(OWNER), tableId, { code: 'ALVO' })).total).toBe(0);
  });

  it('tabela de outro usuário → ForbiddenError, como getTableById', async () => {
    await expect(service.searchTableData(ctxFor(OTHER), tableId, { code: 'ALVO' })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('chave fora do schema → ValidationError listando os campos válidos', async () => {
    await expect(service.searchTableData(ctxFor(OWNER), tableId, { codigo: 'ALVO' }))
      .rejects.toThrow(new ValidationError("Campo de filtro inválido: 'codigo'. Campos válidos: code, qty, active, note, phone, price."));
  });

  it('valor não escalar → ValidationError', async () => {
    await expect(service.searchTableData(ctxFor(OWNER), tableId, { code: { $ne: 'x' } })).rejects.toBeInstanceOf(ValidationError);
  });

  it('total conta além do limit; sem filtro = as mais recentes; limit preso em 1..50', async () => {
    const half = await service.searchTableData(ctxFor(OWNER), tableId, { qty: 0 }, 10);
    expect(half.rows).toHaveLength(10);
    expect(half.total).toBe(124); // i par, sem o ALVO (i = 20 tem qty 7)

    const all = await service.searchTableData(ctxFor(OWNER), tableId, undefined, 500);
    expect(all.limit).toBe(50);
    expect(all.rows).toHaveLength(50);
    expect(all.total).toBe(250);
    expect((all.rows[0].data as { code: string }).code).toBe('C249');
  });
});
