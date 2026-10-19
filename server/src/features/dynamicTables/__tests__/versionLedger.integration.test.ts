/**
 * BE-INCR-DT-VERSION-LEDGER (D-2026-10-17; F-DTV-1..7 a; lacunas L1–L5 do dono, 2026-10-17) — banco real.
 *
 * Escrita (itens 1–8): toda escrita de linha/schema nos DOIS repositórios grava exatamente uma versão na mesma tx;
 * BASELINE preguiçoso; ator/origem; cascade com a linha, a tabela e a conta (LGPD art. 16 caput / art. 18 VI).
 * Leitura/restore (itens 10–17) pela API real (supertest), com o envelope `{ success, data }`.
 *
 * Run via `npm run test:integration`.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import {
  makeApp, pushTestSchema, resetDb, disconnectDb, seedUser, seedDynamicTable, seedDynamicTableData, authHeader, ctxFor,
} from '@test/helpers';
import { Role } from '@/features/users/models/User.model';
import { DynamicTableRepository } from '../repositories/DynamicTableRepository';
import { globalRuleRegistry } from '../rules/RuleRegistry';
import type { RuleContext } from '../rules/RuleTypes';
import { purgeOldDeletedRecords } from '../../../jobs/PurgeDeletedRecords';
import { SYSTEM_VERSION_CONTEXT, updateDataVersioned } from '../repositories/versionLedger';
import {
  RowVersionDetailDto, RowVersionDiffDto, RowVersionListDto, SchemaVersionDetailDto, SchemaVersionDiffDto,
  SchemaVersionListDto,
} from '../dtos/DynamicTableVersion.dto';

const app = makeApp();

const NOTES_SCHEMA = {
  fields: [
    { name: 'title', label: 'Título', type: 'string', required: true },
    { name: 'note', label: 'Nota', type: 'string', required: false },
    { name: 'score', label: 'Pontos', type: 'number', required: false, readOnly: true },
  ],
};

// Plugin de teste (item 6): toda criação/edição na tabela `__dtv_main` incrementa o contador em `__dtv_counter`.
const COUNTER_PLUGIN = {
  name: 'DtvCounterTestPlugin',
  supports: (ctx: RuleContext) => ctx.table.internalName === '__dtv_main',
  async afterCreate(ctx: RuleContext) { await bump(ctx); },
  async afterUpdate(ctx: RuleContext) { await bump(ctx); },
};
async function bump(ctx: RuleContext) {
  const counterTable = await ctx.repository.findTableByInternalName(ctx.userId, '__dtv_counter');
  if (!counterTable) return;
  const { data } = await ctx.repository.findDataByTableId(counterTable.id, 1, 1);
  const row = data[0];
  if (!row) return;
  const n = Number((row.data as Record<string, unknown>).n ?? 0) + 1;
  await ctx.repository.updateData(row.id, { n });
}
globalRuleRegistry.register(COUNTER_PLUGIN);

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

async function versionsOf(dataId: string) {
  return prisma.dynamicTableRowVersion.findMany({ where: { dataId }, orderBy: { version: 'asc' } });
}

async function owner(username = 'owner') {
  const u = await seedUser({ username });
  return { user: u, ctx: ctxFor({ id: u.id, username: u.username }), auth: authHeader({ id: u.id, username: u.username }) };
}

describe('escrita — itens 2–4 (os dois repositórios)', () => {
  // Varredura de classe (memória idempotency-class-fix-discipline): método de escrita novo sem caso aqui reprova.
  const WRITE_METHODS_EXPECTED = [
    'createData', 'createTable', 'deleteAllDataByUserId', 'deleteData', 'deleteTable', 'deleteTablesByUserId',
    'updateData', 'updateTable', 'updateTableSchema',
  ];
  // Um só repositório (2026-10-19): o tx-bound é o MESMO código, ligado ao tx por `withTransaction`.
  it('DynamicTableRepository: o conjunto de métodos de escrita é o coberto por esta suíte', () => {
    const writes = Object.getOwnPropertyNames(DynamicTableRepository.prototype).filter(m => /^(create|update|delete)/.test(m)).sort();
    expect(writes).toEqual(WRITE_METHODS_EXPECTED);
  });

  const repos: Array<[string, (fn: (repo: DynamicTableRepository) => Promise<void>) => Promise<void>]> = [
    ['sem tx (abre a própria $transaction)', async fn => fn(new DynamicTableRepository())],
    ['tx do chamador', async fn => prisma.$transaction(async tx => fn(new DynamicTableRepository().withTransaction(tx)))],
  ];

  it.each(repos)('%s: create → v1 CREATE; update → v2 UPDATE; delete → v3 DELETE; schema v1 → v2', async (_label, run) => {
    const { user } = await owner();
    let tableId = '';
    let dataId = '';
    await run(async repo => {
      const t = await repo.createTable(user.id, { name: 'Notas', category: 'people', schema: NOTES_SCHEMA as never });
      tableId = t.id;
      const row = await repo.createData(tableId, { title: 'a' });
      dataId = row.id;
      await repo.updateData(dataId, { title: 'b' });
      await repo.updateTable(tableId, { name: 'Notas 2' }); // item 3: renomear não versiona
      await repo.updateTableSchema(tableId, { schema: { fields: [...NOTES_SCHEMA.fields, { name: 'x', label: 'X', type: 'string' }] } as never });
      await repo.deleteData(dataId);
    });

    const rows = await versionsOf(dataId);
    expect(rows.map(v => [v.version, v.op])).toEqual([[1, 'CREATE'], [2, 'UPDATE'], [3, 'DELETE']]);
    expect(rows.map(v => (v.data as Record<string, unknown>).title)).toEqual(['a', 'b', 'b']);
    expect(rows.map(v => v.schemaVersion)).toEqual([1, 1, 2]);
    expect(rows.every(v => v.origin === 'SYSTEM' && v.actorUserId === null)).toBe(true);

    const schemas = await prisma.dynamicTableSchemaVersion.findMany({ where: { dynamicTableId: tableId }, orderBy: { version: 'asc' } });
    expect(schemas.map(s => [s.version, s.op])).toEqual([[1, 'CREATE'], [2, 'UPDATE']]);
    const table = await prisma.dynamicTable.findUniqueOrThrow({ where: { id: tableId } });
    expect(table.schemaVersion).toBe(2);
  });

  it('item 4: duas escritas na mesma tx → v2 e v3', async () => {
    const { user } = await owner();
    const t = await seedDynamicTable({ userId: user.id, schema: NOTES_SCHEMA });
    const repo = new DynamicTableRepository();
    const row = await repo.createData(t.id, { title: 'a' });
    await prisma.$transaction(async tx => {
      const txRepo = repo.withTransaction(tx);
      await txRepo.updateData(row.id, { title: 'b' });
      await txRepo.updateData(row.id, { title: 'c' });
    });
    expect((await versionsOf(row.id)).map(v => v.version)).toEqual([1, 2, 3]);
  });

  it('item 4: colisão de número de versão → P2002 e a escrita da linha volta junto (mesma tx)', async () => {
    const { user } = await owner();
    const t = await seedDynamicTable({ userId: user.id, schema: NOTES_SCHEMA });
    const row = await new DynamicTableRepository().createData(t.id, { title: 'a' });
    // Leitura de `max` defasada (o que um escritor concorrente veria): o próximo número calculado é 1, que já existe.
    await expect(prisma.$transaction(async tx => {
      const stale = new Proxy(tx, {
        get(target, prop, recv) {
          if (prop === 'dynamicTableRowVersion') {
            const real = target.dynamicTableRowVersion;
            // Só a leitura de max (a que ordena) fica defasada; o check do BASELINE enxerga a v1 e a linha É atualizada.
            return new Proxy(real, {
              get: (r, k) => (k === 'findFirst'
                ? async (args: { orderBy?: unknown }) => (args?.orderBy ? null : r.findFirst(args as never))
                : Reflect.get(r, k)),
            });
          }
          return Reflect.get(target, prop, recv);
        },
      });
      await updateDataVersioned(stale, row.id, { title: 'nunca' }, SYSTEM_VERSION_CONTEXT);
    })).rejects.toMatchObject({ code: 'P2002' });
    const after = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: row.id } });
    expect((after.data as Record<string, unknown>).title).toBe('a');
    expect((await versionsOf(row.id)).map(v => v.version)).toEqual([1]);
  });
});

describe('item 7 — BASELINE preguiçoso (F-DTV-3 a)', () => {
  it('linha e tabela anteriores ao ledger ganham BASELINE com o estado anterior antes da 1ª escrita', async () => {
    const { user } = await owner();
    const t = await seedDynamicTable({ userId: user.id, schema: NOTES_SCHEMA }); // sem versão (direto no Prisma)
    const row = await seedDynamicTableData({ dynamicTableId: t.id, data: { title: 'antigo' } });
    const repo = new DynamicTableRepository();

    await repo.updateData(row.id, { title: 'novo' });
    const rows = await versionsOf(row.id);
    expect(rows.map(v => [v.version, v.op, (v.data as Record<string, unknown>).title]))
      .toEqual([[1, 'BASELINE', 'antigo'], [2, 'UPDATE', 'novo']]);
    expect(rows[0].origin).toBe('SYSTEM');
    expect(rows[0].actorUserId).toBeNull();

    await repo.updateTableSchema(t.id, { schema: { fields: [NOTES_SCHEMA.fields[0]] } as never });
    const schemas = await prisma.dynamicTableSchemaVersion.findMany({ where: { dynamicTableId: t.id }, orderBy: { version: 'asc' } });
    expect(schemas.map(s => [s.version, s.op, (s.schema as { fields: unknown[] }).fields.length]))
      .toEqual([[1, 'BASELINE', 3], [2, 'UPDATE', 1]]);
  });

  it('soft-delete de linha anterior ao ledger: BASELINE e depois DELETE', async () => {
    const { user } = await owner();
    const t = await seedDynamicTable({ userId: user.id, schema: NOTES_SCHEMA });
    const row = await seedDynamicTableData({ dynamicTableId: t.id, data: { title: 'antigo' } });
    await new DynamicTableRepository().deleteData(row.id);
    expect((await versionsOf(row.id)).map(v => v.op)).toEqual(['BASELINE', 'DELETE']);
  });
});

describe('item 6 — ator e origem (F-DTV-1 a)', () => {
  it('criar pela API: a linha pedida é DIRECT; o que o plugin escreve é RULE; mesmo ator', async () => {
    const { user, auth } = await owner();
    const main = await seedDynamicTable({ userId: user.id, internalName: '__dtv_main', schema: NOTES_SCHEMA });
    const counter = await seedDynamicTable({
      userId: user.id, internalName: '__dtv_counter', name: 'Contador',
      schema: { fields: [{ name: 'n', label: 'N', type: 'number', required: false }] },
    });
    const counterRow = await seedDynamicTableData({ dynamicTableId: counter.id, data: { n: 0 } });

    const res = await request(app).post(`/api/dynamic-tables/${main.id}/data`).set(auth).send({ data: { title: 'x' } });
    expect(res.status).toBe(201);
    const created = (await versionsOf(res.body.data.id));
    expect(created.map(v => [v.op, v.origin, v.actorUserId])).toEqual([['CREATE', 'DIRECT', user.id]]);

    const counterVersions = await versionsOf(counterRow.id);
    expect(counterVersions.map(v => [v.op, v.origin, v.actorUserId])).toEqual([
      ['BASELINE', 'SYSTEM', null],
      ['UPDATE', 'RULE', user.id],
    ]);
  });

  it('apagar pela API grava DELETE DIRECT com o ator', async () => {
    const { user, auth } = await owner();
    const t = await seedDynamicTable({ userId: user.id, schema: NOTES_SCHEMA });
    const row = await seedDynamicTableData({ dynamicTableId: t.id, data: { title: 'x' } });
    const res = await request(app).delete(`/api/dynamic-tables/${t.id}/data/${row.id}`).set(auth);
    expect(res.status).toBeLessThan(300);
    expect((await versionsOf(row.id)).map(v => [v.op, v.origin, v.actorUserId]))
      .toEqual([['BASELINE', 'SYSTEM', null], ['DELETE', 'DIRECT', user.id]]);
  });
});

describe('item 8 — as versões seguem o ciclo de vida da linha (F-DTV-4 a, LGPD art. 16 caput / art. 18 VI)', () => {
  async function tableWithVersionedRow(userId: string, deletedAt?: Date) {
    const repo = new DynamicTableRepository();
    const t = await repo.createTable(userId, { name: 'Notas', category: 'people', schema: NOTES_SCHEMA as never });
    const row = await repo.createData(t.id, { title: 'a' });
    await repo.updateData(row.id, { title: 'b' });
    if (deletedAt) await prisma.dynamicTableData.update({ where: { id: row.id }, data: { deletedAt } });
    return { t, row };
  }

  it('soft-delete NÃO apaga versões', async () => {
    const { user } = await owner();
    const { row } = await tableWithVersionedRow(user.id);
    await new DynamicTableRepository().deleteData(row.id);
    expect(await prisma.dynamicTableRowVersion.count({ where: { dataId: row.id } })).toBe(3);
  });

  it('purga de 90 dias leva as versões da linha purgada (e só dela)', async () => {
    const { user } = await owner();
    const old = await tableWithVersionedRow(user.id, new Date(Date.now() - 100 * 24 * 60 * 60 * 1000));
    const live = await tableWithVersionedRow(user.id);
    await purgeOldDeletedRecords();
    expect(await prisma.dynamicTableData.count({ where: { id: old.row.id } })).toBe(0);
    expect(await prisma.dynamicTableRowVersion.count({ where: { dataId: old.row.id } })).toBe(0);
    expect(await prisma.dynamicTableRowVersion.count({ where: { dataId: live.row.id } })).toBe(2);
  });

  it('deleteTable leva versões de linha e de schema', async () => {
    const { user } = await owner();
    const { t } = await tableWithVersionedRow(user.id);
    await new DynamicTableRepository().deleteTable(t.id);
    expect(await prisma.dynamicTableRowVersion.count({ where: { dynamicTableId: t.id } })).toBe(0);
    expect(await prisma.dynamicTableSchemaVersion.count({ where: { dynamicTableId: t.id } })).toBe(0);
  });

  it('exclusão da conta (deleteAllDataByUserId + deleteTablesByUserId) não deixa versão órfã', async () => {
    const { user } = await owner();
    const other = await seedUser({ username: 'other' });
    await tableWithVersionedRow(user.id);
    const keep = await tableWithVersionedRow(other.id);
    const repo = new DynamicTableRepository();
    await repo.deleteAllDataByUserId(user.id);
    await repo.deleteTablesByUserId(user.id);
    expect(await prisma.dynamicTableRowVersion.count()).toBe(2);
    expect(await prisma.dynamicTableRowVersion.count({ where: { dataId: keep.row.id } })).toBe(2);
    expect(await prisma.dynamicTableSchemaVersion.count()).toBe(1);
  });
});

describe('API — leitura (itens 10–13)', () => {
  async function rowWithHistory() {
    const o = await owner();
    const t = await seedDynamicTable({ userId: o.user.id, schema: NOTES_SCHEMA });
    const svc = getFactory().getDynamicTableService();
    const row = await svc.createTableData(o.ctx, t.id, { data: { title: 'v1', note: 'n1' } });
    await svc.updateTableData(o.ctx, row.id, { data: { title: 'v2' } });
    await svc.updateTableData(o.ctx, row.id, { data: { note: 'n3' } });
    return { ...o, t, row };
  }

  it('lista as versões, mais nova primeiro, sem `data`; paginação', async () => {
    const { t, row, auth } = await rowWithHistory();
    const res = await request(app).get(`/api/dynamic-tables/${t.id}/data/${row.id}/versions?page=1&limit=2`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { success: _s, ...body } = res.body;
    const parsed = RowVersionListDto.parse(body);
    expect(parsed.total).toBe(3);
    expect(parsed.data.map(v => v.version)).toEqual([3, 2]);
    expect(res.body.data[0]).not.toHaveProperty('data');
  });

  it('linha de outro dono ou de outra tabela → 404; limit > 200 → 400', async () => {
    const { t, row, auth } = await rowWithHistory();
    const stranger = await owner('stranger');
    expect((await request(app).get(`/api/dynamic-tables/${t.id}/data/${row.id}/versions`).set(stranger.auth)).status).toBe(404);
    const otherTable = await seedDynamicTable({ userId: stranger.user.id, schema: NOTES_SCHEMA });
    expect((await request(app).get(`/api/dynamic-tables/${otherTable.id}/data/${row.id}/versions`).set(auth)).status).toBe(404);
    expect((await request(app).get(`/api/dynamic-tables/${t.id}/data/${row.id}/versions?limit=201`).set(auth)).status).toBe(400);
  });

  it('linha soft-deletada continua listando o histórico', async () => {
    const { t, row, ctx, auth } = await rowWithHistory();
    await getFactory().getDynamicTableService().deleteTableData(ctx, row.id);
    const res = await request(app).get(`/api/dynamic-tables/${t.id}/data/${row.id}/versions`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data[0].op).toBe('DELETE');
  });

  it('detalhe traz o snapshot e o schema da época; versão inexistente → 404', async () => {
    const { t, row, auth } = await rowWithHistory();
    const res = await request(app).get(`/api/dynamic-tables/${t.id}/data/${row.id}/versions/1`).set(auth);
    expect(res.status).toBe(200);
    const detail = RowVersionDetailDto.parse(res.body.data);
    expect(detail.data).toEqual({ title: 'v1', note: 'n1' });
    expect((detail.schema as { fields: unknown[] }).fields).toHaveLength(3);
    expect((await request(app).get(`/api/dynamic-tables/${t.id}/data/${row.id}/versions/9`).set(auth)).status).toBe(404);
  });

  it('diff: default = anterior; against=n; against=current; v1 contra vazio', async () => {
    const { t, row, auth } = await rowWithHistory();
    const base = `/api/dynamic-tables/${t.id}/data/${row.id}/versions`;

    const d2 = RowVersionDiffDto.parse((await request(app).get(`${base}/2/diff`).set(auth)).body.data);
    expect(d2).toEqual({ from: 1, to: 2, changes: [{ field: 'title', label: 'Título', kind: 'changed', before: 'v1', after: 'v2' }] });

    const d3vs1 = RowVersionDiffDto.parse((await request(app).get(`${base}/3/diff?against=1`).set(auth)).body.data);
    expect(d3vs1.changes.map(c => c.field)).toEqual(['title', 'note']);

    const dCur = RowVersionDiffDto.parse((await request(app).get(`${base}/1/diff?against=current`).set(auth)).body.data);
    expect(dCur.to).toBe('current');
    expect(dCur.changes.map(c => [c.field, c.before, c.after])).toEqual([['title', 'v1', 'v2'], ['note', 'n1', 'n3']]);

    const d1 = RowVersionDiffDto.parse((await request(app).get(`${base}/1/diff`).set(auth)).body.data);
    expect(d1.from).toBeNull();
    expect(d1.changes.every(c => c.kind === 'added')).toBe(true);
  });

  it('schema: lista, detalhe e diff (L3); não existe restore de schema (F-DTV-6 a)', async () => {
    const o = await owner();
    const svc = getFactory().getDynamicTableService();
    const t = await svc.createTableAsSystem(o.user.id, { name: 'Notas', category: 'people', schema: NOTES_SCHEMA as never });
    await svc.updateTableSchemaAsSystem(t.id, {
      schema: { fields: [...NOTES_SCHEMA.fields.map(f => (f.name === 'note' ? { ...f, label: 'Observação' } : f)), { name: 'tag', label: 'Etiqueta', type: 'string' }] } as never,
    });
    const base = `/api/dynamic-tables/${t.id}/schema-versions`;

    const list = SchemaVersionListDto.parse((({ success: _s, ...b }) => b)((await request(app).get(base).set(o.auth)).body));
    expect(list.data.map(v => [v.version, v.op])).toEqual([[2, 'UPDATE'], [1, 'CREATE']]);

    const detail = SchemaVersionDetailDto.parse((await request(app).get(`${base}/1`).set(o.auth)).body.data);
    expect((detail.schema as { fields: unknown[] }).fields).toHaveLength(3);

    const diff = SchemaVersionDiffDto.parse((await request(app).get(`${base}/2/diff`).set(o.auth)).body.data);
    expect(diff.changes.map(c => [c.field, c.kind])).toEqual([['note', 'changed'], ['tag', 'added']]);

    expect((await request(app).post(`${base}/1/restore`).set(o.auth)).status).toBe(404);
  });
});

describe('API — restaurar (itens 14–17; L1, L2, L5)', () => {
  it('restaura a v1 depois de 2 edições → v4 RESTORE apontando para a v1; plugins rodam (RULE)', async () => {
    const o = await owner();
    const main = await seedDynamicTable({ userId: o.user.id, internalName: '__dtv_main', schema: NOTES_SCHEMA });
    const counter = await seedDynamicTable({
      userId: o.user.id, internalName: '__dtv_counter', name: 'Contador',
      schema: { fields: [{ name: 'n', label: 'N', type: 'number', required: false }] },
    });
    const counterRow = await seedDynamicTableData({ dynamicTableId: counter.id, data: { n: 0 } });
    const svc = getFactory().getDynamicTableService();
    const row = await svc.createTableData(o.ctx, main.id, { data: { title: 'v1', note: 'n1' } });
    await svc.updateTableData(o.ctx, row.id, { data: { title: 'v2' } });
    await svc.updateTableData(o.ctx, row.id, { data: { note: 'n3' } });

    const res = await request(app).post(`/api/dynamic-tables/${main.id}/data/${row.id}/versions/1/restore`).set(o.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.data).toMatchObject({ title: 'v1', note: 'n1' });

    const v = await versionsOf(row.id);
    expect(v.map(x => [x.version, x.op, x.restoredFromVersion, x.origin])).toEqual([
      [1, 'CREATE', null, 'DIRECT'], [2, 'UPDATE', null, 'DIRECT'], [3, 'UPDATE', null, 'DIRECT'], [4, 'RESTORE', 1, 'DIRECT'],
    ]);
    const counterOps = (await versionsOf(counterRow.id)).map(x => [x.op, x.origin, x.restoredFromVersion]);
    expect(counterOps[counterOps.length - 1]).toEqual(['UPDATE', 'RULE', null]); // plugin rodou, sem RESTORE
    expect(counterOps).toHaveLength(5); // BASELINE + 4 escritas na main (create, 2 updates, restore)
  });

  it('L1 merge: campo que a versão não tinha fica com o valor atual', async () => {
    const o = await owner();
    const t = await seedDynamicTable({ userId: o.user.id, schema: NOTES_SCHEMA });
    const svc = getFactory().getDynamicTableService();
    const row = await svc.createTableData(o.ctx, t.id, { data: { title: 'v1' } });
    await svc.updateTableData(o.ctx, row.id, { data: { title: 'v2', note: 'depois' } });
    const res = await request(app).post(`/api/dynamic-tables/${t.id}/data/${row.id}/versions/1/restore`).set(o.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.data).toMatchObject({ title: 'v1', note: 'depois' });
  });

  it('L2: campo readOnly do snapshot sai (sem 400) e mantém o valor atual', async () => {
    const o = await owner();
    const t = await seedDynamicTable({ userId: o.user.id, schema: NOTES_SCHEMA });
    const row = await seedDynamicTableData({ dynamicTableId: t.id, data: { title: 'v1', score: 10 } });
    const svc = getFactory().getDynamicTableService();
    await svc.updateTableData(o.ctx, row.id, { data: { title: 'v2' } });
    await svc.updateTableData(o.ctx, row.id, { data: { score: 99 } }, { isSystem: true });
    const res = await request(app).post(`/api/dynamic-tables/${t.id}/data/${row.id}/versions/1/restore`).set(o.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.data).toMatchObject({ title: 'v1', score: 99 });
  });

  it('linha apagada → 409 ROW_DELETED (F-DTV-5 a); nada gravado', async () => {
    const o = await owner();
    const t = await seedDynamicTable({ userId: o.user.id, schema: NOTES_SCHEMA });
    const svc = getFactory().getDynamicTableService();
    const row = await svc.createTableData(o.ctx, t.id, { data: { title: 'v1' } });
    await svc.deleteTableData(o.ctx, row.id);
    const before = await prisma.dynamicTableRowVersion.count({ where: { dataId: row.id } });
    const res = await request(app).post(`/api/dynamic-tables/${t.id}/data/${row.id}/versions/1/restore`).set(o.auth);
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain('ROW_DELETED');
    expect(await prisma.dynamicTableRowVersion.count({ where: { dataId: row.id } })).toBe(before);
  });

  it('snapshot que não passa no schema atual → 400 e nada gravado', async () => {
    const o = await owner();
    const svc = getFactory().getDynamicTableService();
    const t = await svc.createTableAsSystem(o.user.id, { name: 'Notas', category: 'people', schema: NOTES_SCHEMA as never });
    const row = await svc.createTableData(o.ctx, t.id, { data: { title: 'longo demais' } });
    await svc.updateTableData(o.ctx, row.id, { data: { title: 'ok' } });
    await svc.updateTableSchemaAsSystem(t.id, {
      schema: { fields: NOTES_SCHEMA.fields.map(f => (f.name === 'title' ? { ...f, validation: { maxLength: 5 } } : f)) } as never,
    }, 'none');
    const before = await prisma.dynamicTableRowVersion.count({ where: { dataId: row.id } });
    const res = await request(app).post(`/api/dynamic-tables/${t.id}/data/${row.id}/versions/1/restore`).set(o.auth);
    expect(res.status).toBe(400);
    expect(await prisma.dynamicTableRowVersion.count({ where: { dataId: row.id } })).toBe(before);
    const current = await prisma.dynamicTableData.findUniqueOrThrow({ where: { id: row.id } });
    expect((current.data as Record<string, unknown>).title).toBe('ok');
  });

  it('ADMIN vê o histórico de outro dono, mas não restaura (canManageData) → 403', async () => {
    const o = await owner();
    const admin = await seedUser({ username: 'admin', role: Role.ADMIN });
    const adminAuth = authHeader({ id: admin.id, username: admin.username, role: Role.ADMIN });
    const t = await seedDynamicTable({ userId: o.user.id, schema: NOTES_SCHEMA });
    const svc = getFactory().getDynamicTableService();
    const row = await svc.createTableData(o.ctx, t.id, { data: { title: 'v1' } });
    expect((await request(app).get(`/api/dynamic-tables/${t.id}/data/${row.id}/versions`).set(adminAuth)).status).toBe(200);
    expect((await request(app).post(`/api/dynamic-tables/${t.id}/data/${row.id}/versions/1/restore`).set(adminAuth)).status).toBe(403);
  });
});
