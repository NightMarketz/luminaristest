/**
 * BE-INCR-SEED-UNIDADE-E-ENV item 14 (F-S2 → a) — `npm run db:seed` lê o `.env` e o AMBIENTE EXPORTADO VENCE o arquivo
 * (sem `override`; E7/E10). Roda `prisma/seed.ts` como processo filho com `cwd` temporário que contém um `.env`, contra
 * bancos SQLite TEMPORÁRIOS — nunca o `dev.db`. É a única forma de provar o carregamento do `.env` (o `import 'dotenv/config'`
 * lê o `cwd` do processo, não o do jest).
 */
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PrismaClient } from 'generated/prisma';

const SERVER_DIR = path.resolve(__dirname, '../../..');
const SEED = path.join(SERVER_DIR, 'prisma', 'seed.ts');
const TS_NODE = path.join(SERVER_DIR, 'node_modules', 'ts-node', 'dist', 'bin.js');
const ADMIN_EMAIL = 'seed-env@test.local';

const fileUrl = (p: string): string => `file:${p.replace(/\\/g, '/')}`;
const adminRows = async (dbFile: string): Promise<number> => {
  const client = new PrismaClient({ datasourceUrl: fileUrl(dbFile) });
  try {
    return await client.user.count({ where: { email: ADMIN_EMAIL } });
  } finally {
    await client.$disconnect();
  }
};

describe('prisma/seed.ts lê o .env (item 14)', () => {
  let tmp: string;
  let dbEnvFile: string; // o banco que o `.env` aponta
  let dbExportedFile: string; // o banco que o ambiente exporta

  const runSeed = (env: Record<string, string>) =>
    spawnSync(process.execPath, [TS_NODE, SEED], {
      cwd: tmp,
      encoding: 'utf-8',
      // env mínimo e explícito: NÃO herda o DATABASE_URL do jest (test-integration.db).
      env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '', TS_NODE_TRANSPILE_ONLY: '1', SEED_ADMIN_PASSWORD: 'senha-de-teste', SEED_ADMIN_EMAIL: ADMIN_EMAIL, ...env },
    });

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-dotenv-'));
    dbEnvFile = path.join(tmp, 'from-dotenv.db');
    dbExportedFile = path.join(tmp, 'from-export.db');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: fileUrl(dbEnvFile) }, stdio: 'ignore' });
    fs.copyFileSync(dbEnvFile, dbExportedFile); // schema vazio idêntico
    fs.writeFileSync(path.join(tmp, '.env'), `DATABASE_URL=${fileUrl(dbEnvFile)}\n`);
  }, 180_000);

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('(i) sem DATABASE_URL no ambiente, o seed usa o do .env e imprime "Admin user created/updated"', async () => {
    const r = runSeed({});
    expect(r.stderr).not.toMatch(/Environment variable not found/);
    expect(r.stdout).toMatch(/Admin user created\/updated/);
    expect(r.status).toBe(0);
    expect(await adminRows(dbEnvFile)).toBe(1);
  }, 120_000);

  it('(ii) com DATABASE_URL exportado para outro banco, o EXPORTADO vence — a linha vai para ele, não para o do .env', async () => {
    // o banco do .env já tem o admin do caso (i); apaga para provar que o caso (ii) não o recria lá
    const client = new PrismaClient({ datasourceUrl: fileUrl(dbEnvFile) });
    await client.user.deleteMany({ where: { email: ADMIN_EMAIL } });
    await client.$disconnect();

    const r = runSeed({ DATABASE_URL: fileUrl(dbExportedFile) });
    expect(r.stdout).toMatch(/Admin user created\/updated/);
    expect(r.status).toBe(0);
    expect(await adminRows(dbExportedFile)).toBe(1);
    expect(await adminRows(dbEnvFile)).toBe(0);
  }, 120_000);
});
