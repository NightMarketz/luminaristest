/**
 * Integration test: the BRIEF-W2-A migration (`nameNormalized` + `taxId`, F1(b)) against a REAL SQLite
 * database. No mocks. Molde de `CounterpartyBackfill.integration.test.ts`: constrói o schema PRÉ-migração
 * (todas as migrações exceto a última — a nossa, que por ser a mais recente é simplesmente a omitida),
 * semeia linhas via SQL cru no formato da tabela ANTIGA (a `counterparties` do client gerado já tem
 * `nameNormalized`/`taxId`, então o client tipado não consegue mais encenar o estado pré-migração), e
 * aplica o `migration.sql` LIDO DO DISCO — nunca espelhado — provando:
 *   • F-W2A-5  ABORT em colisão de nameNormalized entre linhas VIVAS do mesmo (userId,unitId,type);
 *   • comp. 6  backfill correto de nameNormalized (trim + fold + colapso) em linha viva E arquivada;
 *   • comp. 3  taxId nasce NULL para toda linha pré-existente (não há dado histórico para popular);
 *   • o novo `@@unique([userId,unitId,type,nameNormalized])` está de fato em vigor pós-migração.
 *
 * A base PRÉ-migração é montada UMA VEZ (32 subprocessos `npx prisma db execute`, caro — memória do
 * gate irmão `CounterpartyBackfill.integration.test.ts`: "60s era margem zero" mesmo para UMA
 * construção) e COPIADA para cada cenário, no molde de `smoke-gate-incr-counterparty.mjs` — nunca
 * reconstruída por cenário.
 */
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { copyFileSync } from 'fs';
import { PrismaClient } from 'generated/prisma';

const SERVER_ROOT = path.join(__dirname, '../../../../../');
const MIGRATIONS_DIR = path.join(SERVER_ROOT, 'prisma', 'migrations');

/** A migração sob teste — a MAIS RECENTE do diretório (verificado no beforeAll, não hardcoded às cegas). */
const TARGET_MIGRATION = '20260830160349_counterparty_identity_normalization';

function readTargetMigrationSql(): string {
  const file = path.join(MIGRATIONS_DIR, TARGET_MIGRATION, 'migration.sql');
  return fs.readFileSync(file, 'utf8');
}

/**
 * Monta um dev.db novo aplicando toda migração ANTERIOR a `TARGET_MIGRATION` (o estado
 * pré-BRIEF-W2-A) — um PREFIXO da lista ordenada, não "tudo exceto o nome exato do alvo".
 *
 * BE-INCR-MONEY-BIGINT (F-W2B-1, PR seguinte a este no pipeline W2) adicionou uma migração NOVA
 * DEPOIS de `TARGET_MIGRATION` no diretório — a versão anterior deste harness comparava por nome
 * exato (`d !== TARGET_MIGRATION`) e por isso passaria a aplicar TAMBÉM essa migração futura (ela
 * não é === TARGET_MIGRATION), contaminando o estado "pré-migração" com colunas que não existiam
 * quando BRIEF-W2-A foi escrito — e o guard-rail original (`todas[todas.length-1] === TARGET_MIGRATION`)
 * capturava exatamente isso, mas de um jeito que quebra para QUALQUER migração futura, não só uma
 * incorreta. Fatiar pelo ÍNDICE de `TARGET_MIGRATION` (prefixo estrito) preserva a garantia real —
 * "aplicar" é sempre todo o histórico ANTES do alvo, nunca depois — sem exigir que o alvo continue
 * sendo o mais recente do repositório.
 */
function buildPreMigrationDb(dbPath: string): void {
  const todas = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((d) => fs.existsSync(path.join(MIGRATIONS_DIR, d, 'migration.sql')))
    .sort();
  const targetIdx = todas.indexOf(TARGET_MIGRATION);
  expect(targetIdx).toBeGreaterThanOrEqual(0); // TARGET_MIGRATION existe no diretório
  const aplicar = todas.slice(0, targetIdx); // prefixo estrito — nunca inclui o alvo nem nada depois dele
  expect(aplicar).not.toContain(TARGET_MIGRATION);
  for (const dir of aplicar) {
    execSync(
      `npx prisma db execute --file "${path.join(MIGRATIONS_DIR, dir, 'migration.sql')}" --url "file:${dbPath}"`,
      { cwd: SERVER_ROOT, env: { ...process.env }, stdio: 'pipe' },
    );
  }
}

function cleanupDbFiles(dbPath: string): void {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try { fs.unlinkSync(`${dbPath}${suffix}`); } catch { /* ignore */ }
  }
}

/**
 * Aplica a migração-alvo via `prisma db execute --file` (o MESMO mecanismo de `buildPreMigrationDb`) —
 * NÃO via `$executeRawUnsafe(migrationSql)`. `$executeRawUnsafe` roda UM statement por chamada (é
 * exatamente por isso que `CounterpartyBackfill.integration.test.ts` fatia o backfill num loop
 * statement-a-statement); um arquivo inteiro com trigger + rebuild multi-statement precisa do CLI, não
 * do client. Lança (via execSync) se a migração abortar — a mensagem do RAISE vai no stdout/stderr.
 */
function applyTargetMigration(dbPath: string): void {
  execSync(
    `npx prisma db execute --file "${path.join(MIGRATIONS_DIR, TARGET_MIGRATION, 'migration.sql')}" --url "file:${dbPath}"`,
    { cwd: SERVER_ROOT, env: { ...process.env }, stdio: 'pipe' },
  );
}

/** Semeia uma `counterparty` no formato PRÉ-migração (sem nameNormalized/taxId) via SQL cru. */
function seedLegacyCounterparty(
  db: PrismaClient,
  row: { id: string; userId: string; unitId: string; type: string; name: string; deletedAt?: number | null },
): Promise<unknown> {
  const now = Date.now();
  return db.$executeRawUnsafe(
    `INSERT INTO "counterparties" ("id","userId","unitId","type","name","ref","createdById","createdAt","updatedAt","deletedAt")
     VALUES (?,?,?,?,?,NULL,NULL,?,?,?)`,
    row.id, row.userId, row.unitId, row.type, row.name, now, now, row.deletedAt ?? null,
  );
}

describe('BRIEF-W2-A migration (nameNormalized + taxId) — real SQLite DB (F-W2A-5 / comp. 3 / comp. 6)', () => {
  let migrationSql: string;
  let basePath: string;

  beforeAll(() => {
    migrationSql = readTargetMigrationSql();
    // Controle do harness — a migração não é um espelho aqui dentro; se o arquivo mudar de forma a
    // ponto de perder estas âncoras, o teste falha alto por isso, não por um efeito colateral obscuro.
    expect(migrationSql).toContain('_w2a_assert_collision');
    expect(migrationSql).toContain('RAISE(ABORT');
    expect(migrationSql).toContain('nameNormalized');

    basePath = path.join(os.tmpdir(), `cp-w2a-base-${Date.now()}.db`);
    buildPreMigrationDb(basePath);
  }, 180000);

  afterAll(() => cleanupDbFiles(basePath));

  describe('F-W2A-5 — colisão nas linhas VIVAS aborta a migração', () => {
    let dbPath: string;

    beforeAll(async () => {
      dbPath = `${basePath}.collision.db`;
      copyFileSync(basePath, dbPath);
      const db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      await db.user.create({
        data: { id: 'u-w2a-c', name: 'u', username: 'u-w2a-c', email: 'u-w2a-c@test.local', password: 'x', role: 'USER' },
      });
      // Duas linhas VIVAS no MESMO (userId,unitId,type) cujo nome só difere por trim/caixa — colidem
      // em nameNormalized apos o fold, exatamente o caso que F-W2A-5 manda abortar.
      await seedLegacyCounterparty(db, { id: 'cp-c1', userId: 'u-w2a-c', unitId: 'unit-1', type: 'SUPPLIER', name: ' Padaria X' });
      await seedLegacyCounterparty(db, { id: 'cp-c2', userId: 'u-w2a-c', unitId: 'unit-1', type: 'SUPPLIER', name: 'padaria x' });
      await db.$disconnect();
    }, 30000);

    afterAll(() => cleanupDbFiles(dbPath));

    it('a migração LANÇA (ABORT via trigger) e não toca a tabela — não sufixa nem escolhe uma vencedora em silêncio', async () => {
      let stderr = '';
      let threw = false;
      try {
        applyTargetMigration(dbPath);
      } catch (e) {
        threw = true;
        stderr = String((e as { stderr?: Buffer | string })?.stderr ?? e);
      }
      expect(threw).toBe(true);
      expect(stderr).toMatch(/BRIEF-W2-A \(F-W2A-5\)/);

      // A tabela não foi (re)construída pelo rebuild — ainda no formato ANTIGO (sem nameNormalized).
      const db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      const cols = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("counterparties")`);
      expect(cols.map((c) => c.name)).not.toContain('nameNormalized');
      await db.$disconnect();
    }, 30000);
  });

  describe('caminho feliz — sem colisão, backfill correto e taxId nulo', () => {
    let dbPath: string;
    const ID_VIVA = 'cp-h1';
    const ID_TOMBA = 'cp-h2';
    const ID_DISTINTA = 'cp-h3';

    beforeAll(async () => {
      dbPath = `${basePath}.happy.db`;
      copyFileSync(basePath, dbPath);
      const db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      await db.user.create({
        data: { id: 'u-w2a-h', name: 'u', username: 'u-w2a-h', email: 'u-w2a-h@test.local', password: 'x', role: 'USER' },
      });
      // Linha viva com espaçamento/caixa a normalizar.
      await seedLegacyCounterparty(db, { id: ID_VIVA, userId: 'u-w2a-h', unitId: 'unit-1', type: 'SUPPLIER', name: '  Padaria   X  ' });
      // Linha ARQUIVADA (já mangled pelo SEC-A1-4 antigo) — precisa normalizar o valor mangled também.
      await seedLegacyCounterparty(db, {
        id: ID_TOMBA, userId: 'u-w2a-h', unitId: 'unit-1', type: 'SUPPLIER',
        name: `deleted:${ID_TOMBA}:Padaria Z`, deletedAt: Date.now(),
      });
      // Linha viva DISTINTA — controle negativo (não pode colidir nem se fundir com nada acima).
      await seedLegacyCounterparty(db, { id: ID_DISTINTA, userId: 'u-w2a-h', unitId: 'unit-1', type: 'SUPPLIER', name: 'Padaria Y' });
      await db.$disconnect();

      applyTargetMigration(dbPath); // não deve lançar
    }, 30000);

    afterAll(() => cleanupDbFiles(dbPath));

    it('comp. 6 — nameNormalized backfillado corretamente (trim + fold + colapso) em linha viva', async () => {
      const db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      const viva = await db.counterparty.findUnique({ where: { id: ID_VIVA } });
      expect(viva!.name).toBe('  Padaria   X  '); // display preservado intacto
      expect(viva!.nameNormalized).toBe('padaria x');
      await db.$disconnect();
    });

    it('comp. 6 — a linha ARQUIVADA também tem nameNormalized backfillado, a partir do nome MANGLED', async () => {
      const db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      const tumba = await db.counterparty.findUnique({ where: { id: ID_TOMBA } });
      expect(tumba!.name).toBe(`deleted:${ID_TOMBA}:Padaria Z`);
      expect(tumba!.nameNormalized).toBe(`deleted:${ID_TOMBA}:padaria z`.toLowerCase());
      await db.$disconnect();
    });

    it('comp. 3 — taxId nasce NULL para toda linha pré-existente (sem dado histórico p/ backfill)', async () => {
      const db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      const rows = await db.counterparty.findMany({ where: { userId: 'u-w2a-h' } });
      expect(rows.length).toBeGreaterThanOrEqual(3);
      expect(rows.every((r) => r.taxId === null)).toBe(true);
      await db.$disconnect();
    });

    it('linha DISTINTA não se funde com nada — preservação de identidades genuinamente diferentes', async () => {
      const db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      const distinta = await db.counterparty.findUnique({ where: { id: ID_DISTINTA } });
      expect(distinta!.nameNormalized).toBe('padaria y');
      const total = await db.counterparty.count({ where: { userId: 'u-w2a-h' } });
      expect(total).toBe(3); // nenhuma linha foi fundida/perdida no rebuild
      await db.$disconnect();
    });

    it('o novo @@unique([userId,unitId,type,nameNormalized]) está em vigor — um insert duplicado FALHA', async () => {
      const db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      await expect(
        db.$executeRawUnsafe(
          `INSERT INTO "counterparties" ("id","userId","unitId","type","name","nameNormalized","ref","taxId","createdById","createdAt","updatedAt","deletedAt")
           VALUES ('cp-dup','u-w2a-h','unit-1','SUPPLIER','PADARIA X','padaria x',NULL,NULL,NULL,?,?,NULL)`,
          Date.now(), Date.now(),
        ),
      ).rejects.toThrow(/UNIQUE constraint failed/);
      await db.$disconnect();
    });
  });
});
