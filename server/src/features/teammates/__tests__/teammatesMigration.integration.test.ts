/**
 * BE-INCR-TEAMMATES PR-0, itens 1 e 2 — a migração `20261106120000_teammates_pr0` contra SQLite real, lida do disco.
 *   • item 1: aplicada sobre um banco com propostas antigas, toda linha antiga lê `kind = 'TABLE_ROW'`;
 *   • item 2: reaplicada sobre si mesma não falha (prólogo defensivo; memória migracao-sqlite-nao-e-transacional).
 * O estado pré-migração é o prefixo estrito do histórico (molde de CounterpartyIdentityNormalization).
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyMigrations, MIGRATIONS_DIR } from '@test/helpers/migrations';
import { PrismaClient } from 'generated/prisma';

const TARGET = '20261106120000_teammates_pr0';

function preMigrationDirs(): string[] {
  const todas = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((d) => fs.existsSync(path.join(MIGRATIONS_DIR, d, 'migration.sql')))
    .sort();
  const idx = todas.indexOf(TARGET);
  expect(idx).toBeGreaterThanOrEqual(0);
  return todas.slice(0, idx);
}

const SEED_OLD_PROPOSALS = `
PRAGMA foreign_keys=OFF;
INSERT INTO "action_proposals" ("id","userId","action","tableId","tableName","tableLabel","data","status","createdAt","updatedAt")
VALUES ('p1','u1','CREATE','t1','clientes','Clientes','{"nome":"Ana"}','PENDING','2026-10-01 10:00:00','2026-10-01 10:00:00'),
       ('p2','u1','DELETE','t1','clientes','Clientes','{"id":"r9"}','EXECUTED','2026-10-02 10:00:00','2026-10-02 10:00:00');
`;

describe(`migração ${TARGET}`, () => {
  const db = path.join(os.tmpdir(), `teammates-pr0-${process.pid}-${Date.now()}.db`);
  const seedFile = `${db}.seed.sql`;
  let client: PrismaClient | undefined;

  beforeAll(() => {
    applyMigrations(db, preMigrationDirs());
    fs.writeFileSync(seedFile, SEED_OLD_PROPOSALS);
    // applyMigrations lê de MIGRATIONS_DIR; a semente vai pelo mesmo CLI, num arquivo à parte.
    execSync(`npx prisma db execute --file "${seedFile}" --url "file:${db}"`, {
      cwd: path.resolve(MIGRATIONS_DIR, '../..'),
      stdio: 'pipe',
    });
  }, 180000);

  afterAll(async () => {
    await client?.$disconnect();
    for (const f of [db, `${db}-journal`, seedFile]) fs.rmSync(f, { force: true, maxRetries: 10, retryDelay: 200 }); // Windows: o engine solta o arquivo com atraso
  });

  it('item 1 — propostas antigas leem kind = TABLE_ROW, campos da emenda NULL, dados preservados', async () => {
    applyMigrations(db, [TARGET]);
    client = new PrismaClient({ datasourceUrl: `file:${db}` });
    const rows = await client.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'SELECT id, kind, payload, teammateId, channelMessageId, expiresAt, status, data FROM action_proposals ORDER BY id',
    );
    expect(rows).toEqual([
      { id: 'p1', kind: 'TABLE_ROW', payload: null, teammateId: null, channelMessageId: null, expiresAt: null, status: 'PENDING', data: { nome: 'Ana' } },
      { id: 'p2', kind: 'TABLE_ROW', payload: null, teammateId: null, channelMessageId: null, expiresAt: null, status: 'EXECUTED', data: { id: 'r9' } },
    ]);
    await client.$disconnect();
    client = undefined;
  }, 60000);

  it('item 2 — reaplicar a migração não falha e as tabelas novas seguem no lugar', async () => {
    expect(() => applyMigrations(db, [TARGET])).not.toThrow();
    client = new PrismaClient({ datasourceUrl: `file:${db}` });
    const tables = await client.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('teammates','llm_credentials','agent_turns','teammate_routines','mcp_servers','agent_channels','agent_channel_members','agent_channel_messages','new_action_proposals') ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual([
      'agent_channel_members', 'agent_channel_messages', 'agent_channels', 'agent_turns',
      'llm_credentials', 'mcp_servers', 'teammate_routines', 'teammates',
    ]);
    const idx = await client.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'llm_credentials_userId_provider_key'",
    );
    expect(idx).toHaveLength(1); // @@unique([userId, provider]) — rename-on-delete no PR-1
    const kinds =await client.$queryRawUnsafe<Array<{ kind: string }>>('SELECT kind FROM action_proposals ORDER BY id');
    expect(kinds.map((k) => k.kind)).toEqual(['TABLE_ROW', 'TABLE_ROW']);
  }, 60000);
});
