/**
 * GUARDA F-RN-3 — dado persistido sob o vocabulário `salon.*` precisa estar MIGRADO para
 * `sale.*` junto da correção (ADR-RN §5, BRIEF §6 F-RN-3 → (b) "script de migração de dado").
 * Sessão de instrumentação (I2) — este arquivo é SÓ o teste-guarda; zero mudança em código de
 * aplicação, zero script de migração (isso é `sessao-correcao`, ADR-RN §7 passo 4).
 *
 * O RISCO NOMEADO NÃO É "contar prefixos" — é DUPLICATA silenciosa (ADR-RN §5, invariante T7,
 * classe `idempotency-class-fix-discipline` da memória do projeto):
 * `JournalEntry.@@unique([userId,unitId,sourceType,sourceId])` e
 * `StockMovement.@@unique([inventoryItemId,kind,sourceType,sourceId])` chaveiam por `sourceType`
 * LITERAL. Uma linha histórica sob `sourceType='salon.*'` e uma nova sob `sourceType='sale.*'`
 * para o MESMO fato de negócio (mesmo `sourceId`) NÃO colidem no índice — o schema deixa as duas
 * conviverem. Sem migração, o primeiro reconcile/replay pós-rename cria uma SEGUNDA linha para
 * um fato já lançado: no JournalEntry isso é um lançamento contábil duplicado; no StockMovement
 * é pior — o índice não bloqueando o create é a mesma barreira que `InventoryService.
 * recordSaleCogs` usa via `findMovementBySource` (`InventoryService.ts:235`, também filtra por
 * `sourceType` exato) para decidir "já processei esta linha, não decremento de novo" — se as
 * duas falham em achar a linha histórica, a baixa roda de novo (consequência INFERIDA da mesma
 * causa, não exercitada por este teste, que fica só no nível do schema).
 *
 * Harness: SQLite privado e efêmero via `prisma migrate deploy` — mesmo padrão de
 * `repositories/__tests__/InventoryCogs.integration.test.ts` (o par positivo/negativo do
 * @@unique de StockMovement ali, linhas 90-100, cria DUAS linhas com o MESMO `sourceType` e
 * prova que a segunda é rejeitada — P2002. Este arquivo é o espelho NEGATIVO: MESMO `sourceId`,
 * `sourceType` DIFERENTE, e a criação que deveria ser barrada não é). Não usa o
 * `test-integration.db` compartilhado — corre sob qualquer jest project, sem precisar de
 * `--runInBand`.
 *
 * DEFINIÇÃO DE PRONTO (por caso): a asserção final é sobre a CONTAGEM pós-migração esperada (1
 * linha por fato de negócio) ou sobre a REJEIÇÃO do índice — nunca sobre setup. Hoje as duas
 * falham pela ausência do script de F-RN-3, nunca por erro de fixture.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { PrismaClient } from 'generated/prisma';

const SERVER_ROOT = path.join(__dirname, '../../../../../');
const USER_ID = 'u-rn-data';
const UNIT = 'unit-rn-data';

describe('Guarda F-RN-3 — dado persistido sob salon.* precisa estar migrado para sale.* (sem duplicar)', () => {
  let db: PrismaClient;
  let dbPath: string;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `rn-data-migration-${Date.now()}.db`);
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

  it('JournalEntry: uma linha histórica salon.sale.finalized + o mesmo fato re-emitido sob sale.finalized produzem DUAS linhas, não uma (migração ausente)', async () => {
    const SOURCE_ID = 'sale-hist-1';

    // Linha histórica — exatamente como está HOJE no dev.db (pré-rename), nunca deployado
    // (ADR-RN §5/§6 F-RN-3: "hoje só em dev.db, nunca deployado").
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

    // O MESMO fato de negócio, re-emitido sob o vocabulário pós-rename (F-RN-2 → (b):
    // 'sale.finalized'). Simula o replay/reconcile que roda depois que as pontes trocam de
    // vocabulário — literal de teste, não mudança em AccountingSyncPort.ts.
    await db.journalEntry.create({
      data: {
        userId: USER_ID,
        unitId: UNIT,
        date: new Date('2026-06-15'),
        description: 'Receita salão — Venda sale-hist-1',
        status: 'Posted',
        sourceType: 'sale.finalized',
        sourceId: SOURCE_ID,
      },
    });

    // Migrado corretamente, as duas escritas acima resolveriam para 1 linha por fato de negócio
    // (a segunda encontraria a primeira já sob o vocabulário novo e não criaria nada, ou a
    // primeira já teria sido reescrita). O comportamento correto esperado é 1 linha.
    const rows = await db.journalEntry.findMany({
      where: { userId: USER_ID, unitId: UNIT, sourceId: SOURCE_ID },
    });
    expect(rows).toHaveLength(1);
  }, 30000);

  it('StockMovement: uma baixa histórica salon.sale.cogs + a mesma baixa sob sale.cogs NÃO é rejeitada pelo @@unique', async () => {
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

    // Baixa histórica — mesmo sourceId/item que a re-tentativa pós-rename abaixo usará.
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

    // Pós-rename (F-RN-2 → (b): 'sale.cogs'), a MESMA baixa não é reconhecida como duplicata
    // pelo índice — o schema não migra dado sozinho. Assere o que uma migração completa deveria
    // impedir: este create deveria ser barrado (P2002), como o par positivo de
    // InventoryCogs.integration.test.ts:90-100 prova para o MESMO sourceType.
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
