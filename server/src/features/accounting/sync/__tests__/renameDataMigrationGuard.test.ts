/**
 * GUARDA F-RN-3 — dado persistido sob o vocabulário `salon.*` precisa estar MIGRADO para
 * `sale.*` junto da correção (ADR-RN §5, BRIEF §6 F-RN-3 → (b) "script de migração de dado").
 * Sessão de instrumentação (I2) — este arquivo é SÓ o teste-guarda; zero mudança em código de
 * aplicação, zero script de migração (isso é `sessao-correcao`, ADR-RN §7 passo 4).
 *
 * RETRABALHO (review independente, achado 1): a versão anterior chamava `prisma migrate deploy`
 * no `beforeAll`, ANTES de semear a linha histórica. Uma migração de dado one-time (o artefato
 * que F-RN-3 → (b) produz) só toca linhas que já existem NO MOMENTO em que ela roda — se o
 * `beforeAll` já tivesse aplicado essa migração (contra um banco vazio, sem a linha histórica),
 * uma correção ESCRITA CORRETAMENTE jamais teria a chance de reescrever nada, e a guarda ficaria
 * vermelha PARA SEMPRE, mesmo com o fix certo — comentário-de-teste-afirma-o-que-não-assere
 * (a definição de pronto exige o oposto: vira verde pelo fix certo).
 *
 * ESTRUTURA CORRIGIDA: (1) `prisma migrate deploy` cria só o schema de HOJE (nenhuma migração de
 * rename existe ainda no repo — é exatamente essa ausência que a lacuna nomeia); (2) semeia a
 * linha histórica `salon.*`; (3) procura, em `prisma/migrations/`, uma pasta MAIS NOVA que o
 * corte desta sessão (`INSTRUMENTATION_CUTOFF`) cujo `migration.sql` mexa no vocabulário do
 * rename — se a correção já a tiver escrito, aplica o SQL via `$executeRawUnsafe` (NÃO via
 * `prisma migrate deploy` de novo — essa migração já estaria marcada como aplicada desde o passo
 * 1 quando a correção rodar o `beforeAll` num banco fresco, então rodar deploy outra vez seria
 * NO-OP; aplicar o SQL cru ignora esse rastreamento e reescreve o que estiver na base agora,
 * exatamente como o script real faria contra `dev.db`); (4) assere que a linha foi reescrita E
 * que uma reemissão pós-rename agora colide no @@unique (idempotência restaurada).
 *
 * O RISCO NOMEADO NÃO É "contar prefixos" — é DUPLICATA silenciosa (ADR-RN §5, invariante T7,
 * classe `idempotency-class-fix-discipline` da memória do projeto):
 * `JournalEntry.@@unique([userId,unitId,sourceType,sourceId])` e
 * `StockMovement.@@unique([inventoryItemId,kind,sourceType,sourceId])` chaveiam por `sourceType`
 * LITERAL. Uma linha histórica sob `sourceType='salon.*'` e uma nova sob `sourceType='sale.*'`
 * para o MESMO fato de negócio (mesmo `sourceId`) NÃO colidem no índice — o schema deixa as duas
 * conviverem, a menos que a linha histórica seja reescrita.
 *
 * Harness: SQLite privado e efêmero via `prisma migrate deploy` — mesmo padrão de
 * `repositories/__tests__/InventoryCogs.integration.test.ts`. Não usa o `test-integration.db`
 * compartilhado — corre sob qualquer jest project, sem precisar de `--runInBand`.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { PrismaClient } from 'generated/prisma';

const SERVER_ROOT = path.join(__dirname, '../../../../../');
const USER_ID = 'u-rn-data';
const UNIT = 'unit-rn-data';

const MIGRATIONS_DIR = path.join(SERVER_ROOT, 'prisma', 'migrations');
// Última pasta de migração que existe no repo nesta sessão de instrumentação (2026-08-25). Uma
// migração de dado do rename, quando a correção a escrever, nasce com um nome de pasta
// (timestamp-prefixado) POSTERIOR a este — nunca igual, nunca anterior.
const INSTRUMENTATION_CUTOFF = '20260821090000_accounting_binding';

/** Acha o `migration.sql` de uma futura migração de rename já escrita pela correção (pasta com
 *  nome > `INSTRUMENTATION_CUTOFF` cujo conteúdo cita o vocabulário do rename). `null` hoje —
 *  nenhuma existe. NÃO aplica via `prisma migrate deploy` (ver header, comentário do retrabalho)
 *  — só localiza o texto; quem aplica é `applyIfPresent`, via SQL cru. */
function findFutureRenameMigrationSql(mustMention: RegExp): string | null {
  if (!fs.existsSync(MIGRATIONS_DIR)) return null;
  const folders = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name > INSTRUMENTATION_CUTOFF && fs.statSync(path.join(MIGRATIONS_DIR, name)).isDirectory())
    .sort();
  for (const folder of folders) {
    const sqlPath = path.join(MIGRATIONS_DIR, folder, 'migration.sql');
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, 'utf8');
    if (mustMention.test(sql)) return sql;
  }
  return null;
}

/** Aplica (via SQL cru, statement a statement) o `migration.sql` encontrado — se nenhum bater,
 *  devolve `false` sem tocar o banco (o estado "hoje", sem migração). Comentários `-- ...` são
 *  descartados antes de fatiar por `;` (migrações do Prisma para SQLite trazem esse cabeçalho). */
async function applyIfPresent(db: PrismaClient, mustMention: RegExp): Promise<boolean> {
  const sql = findFutureRenameMigrationSql(mustMention);
  if (!sql) return false;
  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.$executeRawUnsafe(statement);
  }
  return true;
}

describe('Guarda F-RN-3 — dado persistido sob salon.* precisa estar migrado para sale.* (sem duplicar)', () => {
  let db: PrismaClient;
  let dbPath: string;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `rn-data-migration-${Date.now()}.db`);
    // Só o schema de HOJE — nenhuma migração de rename existe ainda no repo (ver header).
    execSync('npx prisma migrate deploy', {
      cwd: SERVER_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    });
    db = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}?socket_timeout=60&connection_limit=1` } },
    });
    await db.user.create({
      data: {
        id: USER_ID,
        name: 'RN Data User',
        username: 'rndatauser',
        email: 'rn-data@test.local',
        password: 'x',
        role: 'USER',
      },
    });
  }, 60000);

  afterAll(async () => {
    await db.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(dbPath + suffix);
      } catch {
        /* best-effort cleanup */
      }
    }
  });

  it('JournalEntry: a linha histórica salon.sale.finalized é reescrita para sale.finalized, e uma reemissão pós-rename passa a colidir no @@unique', async () => {
    const SOURCE_ID = 'sale-hist-1';

    // Linha histórica — exatamente como está HOJE no dev.db (pré-rename), nunca deployado
    // (ADR-RN §5/§6 F-RN-3: "hoje só em dev.db, nunca deployado"). Semeada DEPOIS do deploy de
    // schema, então uma migração futura de dado (que rodaria DEPOIS deste ponto em produção,
    // contra um banco que JÁ tem esta linha) tem a chance real de tocá-la.
    await db.journalEntry.create({
      data: {
        userId: USER_ID,
        unitId: UNIT,
        date: new Date('2026-06-15'),
        description: 'Receita salão — Venda sale-hist-1',
        status: 'Posted',
        sourceType: 'salon.sale.finalized',
        sourceId: SOURCE_ID,
      },
    });

    await applyIfPresent(db, /salon\.(sale|package)\./);

    // Comportamento correto esperado: a migração reescreveu a linha. Hoje ela não existe, então
    // esta asserção falha pela ausência da migração (a razão da lacuna) — não por setup: a linha
    // existe, só não foi tocada.
    // findMany + toHaveLength(1): a migração deve reescrever EM LUGAR — um fix errado que
    // inserisse uma linha sale.* nova deixaria a salon.* órfã e seria pego aqui (e findFirst
    // sem orderBy dependeria da ordem do banco; achado da review independente).
    const rows = await db.journalEntry.findMany({ where: { userId: USER_ID, unitId: UNIT, sourceId: SOURCE_ID } });
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceType).toBe('sale.finalized');

    // Com a linha já sob o vocabulário novo, uma reemissão do MESMO fato sob 'sale.finalized'
    // deve colidir no índice de idempotência — a prova de que a migração não criou uma segunda
    // identidade para o mesmo fato de negócio.
    await expect(
      db.journalEntry.create({
        data: {
          userId: USER_ID,
          unitId: UNIT,
          date: new Date('2026-06-15'),
          description: 'Receita salão — Venda sale-hist-1',
          status: 'Posted',
          sourceType: 'sale.finalized',
          sourceId: SOURCE_ID,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  }, 30000);

  it('StockMovement: a baixa histórica salon.sale.cogs é reescrita para sale.cogs, e uma reemissão pós-rename passa a colidir no @@unique', async () => {
    const ITEM_ID = 'it-rn-data';
    const SOURCE_ID = 'sale-hist-2';

    await db.inventoryItem.create({
      data: {
        id: ITEM_ID,
        userId: USER_ID,
        unitId: UNIT,
        productRef: 'sku-rn-data',
        qtyOnHand: 10,
        totalValueCents: 1000,
        status: 'ACTIVE',
      },
    });

    await db.stockMovement.create({
      data: {
        inventoryItemId: ITEM_ID,
        kind: 'COGS',
        qtyDelta: -1,
        valueCentsDelta: -100,
        occurredAt: new Date('2026-06-15'),
        sourceType: 'salon.sale.cogs',
        sourceId: SOURCE_ID,
      },
    });

    await applyIfPresent(db, /salon\.(sale|package)\./);

    // Mesma disciplina do bloco JournalEntry: reescrita em-lugar, sem linha órfã.
    const rows = await db.stockMovement.findMany({ where: { inventoryItemId: ITEM_ID, sourceId: SOURCE_ID } });
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceType).toBe('sale.cogs');

    await expect(
      db.stockMovement.create({
        data: {
          inventoryItemId: ITEM_ID,
          kind: 'COGS',
          qtyDelta: -1,
          valueCentsDelta: -100,
          occurredAt: new Date('2026-06-15'),
          sourceType: 'sale.cogs',
          sourceId: SOURCE_ID,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  }, 30000);
});
