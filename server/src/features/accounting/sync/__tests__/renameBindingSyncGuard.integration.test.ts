/**
 * GUARDA F-RN-4 — um `AccountingBinding` `Active` persistido com `eventKey` antigo (`salon.*`)
 * enquanto o código emite o novo (`sale.*`) faz TODO evento do vertical 1 cair no ramo "sem
 * mapper" da ponte (ADR-RN §1/§3 item 9; BRIEF §3 comportamento 9; F-RN-4 → (a) atômico —
 * BRIEF §6: "código + recompilação/reativação do binding no MESMO incremento... a correção
 * verifica explicitamente se há binding Active com eventKey antigo, não assume que não há").
 * Sessão de instrumentação (I2) — teste-guarda apenas; zero mudança em código de aplicação.
 *
 * RETRABALHO (review independente, achado 2 + achado próprio mais profundo, ver abaixo):
 *
 * A versão anterior registrava um mapper FAKE, escrito à mão (`staleMapper('salon.sale.
 * finalized')`), passado direto ao construtor de `AccountingSyncService`, e afirmava que um
 * evento `'sale.finalized'` deveria resolver. Dois problemas, o 2º mais sério que o apontado
 * pela review:
 *   1. (achado da review) `map()` lançava incondicionalmente — mesmo que o lookup do mapper
 *      tivesse sucesso, a chamada explodiria.
 *   2. (achado próprio, mais fundo) a CHAVE do mapper (`'salon.sale.finalized'`) era um literal
 *      de teste, sem NENHUMA ligação com código de produção — nenhuma correção de aplicação,
 *      por melhor que fosse, poderia jamais alterar uma string que só existe dentro do próprio
 *      arquivo de teste. A asserção `resolves.toBeDefined()` era estruturalmente insatisfazível,
 *      não só pelo `.map()`.
 *
 * O que corrige os dois de uma vez: `AccountingSyncService` (o comportamento de "sem mapper →
 * ValidationError") está CORRETO por desenho e não deveria mudar — quem precisa mudar é a
 * FIAÇÃO, upstream. Este arquivo passou a exercitar essa fiação de verdade: `ApplicationFactory.
 * initializeAccountingSyncFromBindings()` (mesmo caminho de boot de produção, BE-INCR-BINDING-
 * FEEDER) contra um `AccountingBinding` `Active` REAL, persistido no SQLite compartilhado de
 * teste (`test-integration.db`, mesmo padrão de `lib/__tests__/factory.
 * initializeAccountingSyncFromBindings.integration.test.ts`). Por isso o arquivo virou
 * `.integration.test.ts` — DESVIO do basename reservado (`renameBindingSyncGuard.test.ts`),
 * necessário porque `ApplicationFactory`/`AccountingBindingRepository` são hardwired ao Prisma
 * singleton global (`lib/prisma.ts`), que o `jest.setupEnv.ts` aponta SEMPRE para o
 * `test-integration.db` compartilhado — não há como isolar isto num banco privado sem reimplementar
 * a fiação real, o que anularia o propósito do teste. Rodar com `--runInBand`
 * (`npm run test:integration`) é obrigatório, como qualquer outro arquivo desta família.
 *
 * FRONTEIRA §2.1 RESPEITADA: este arquivo não importa `features/accountingBinding` — a linha
 * `Active` é semeada com um payload `AccountingBindingV1` montado À MÃO (copiado POR VALOR do
 * `eventBinding` `salon.sale.finalized`/`revenue_recognition` de `fixtures/salonBinding.ts`,
 * nunca importado) e `compiledFromHash` é um literal de teste (mesmo padrão do precedente,
 * `'sha256:teste-...'`) — `AccountingBindingFeederService`/`archetypeCatalog` continuam sendo
 * resolvidos DENTRO de `lib/factory.ts` (fora de `features/accounting`, permitido), não aqui.
 *
 * O MECANISMO DE "vira verde pelo fix certo": a lacuna é que NADA reescreve o `payload` de um
 * `AccountingBinding` `Active` já persistido quando o vocabulário do código muda. Este teste
 * semeia a linha `Active` ainda `salon.*` e, ANTES de chamar o boot real, procura em
 * `prisma/migrations/` uma pasta mais nova que o corte desta sessão cujo SQL reescreva
 * `accounting_bindings.payload` — se a correção a tiver escrito, aplica via `$executeRawUnsafe`
 * (não via `prisma migrate deploy` de novo — a mesma armadilha de ordenação do achado 1: se o
 * `beforeAll`/deploy inicial já tivesse essa migração, ela rodaria ANTES desta linha existir).
 * Hoje não existe migração nenhuma → a linha permanece `salon.*` → o boot real monta um mapper
 * com `sourceType: 'salon.sale.finalized'` → o evento pós-rename (`sale.finalized`) não acha
 * mapper → `ValidationError`, a razão exata do achado do BRIEF.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingEvent } from '../AccountingSyncPort';
import type { AccountingScope } from '../../scope/AccountingScope';
import * as path from 'path';
import * as fs from 'fs';

const DONO = 'u-rn-binding';
const UNIT = 'unit-rn-binding';

const SERVER_ROOT = path.join(__dirname, '../../../../../');
const MIGRATIONS_DIR = path.join(SERVER_ROOT, 'prisma', 'migrations');
// Última pasta de migração que existe no repo nesta sessão de instrumentação (2026-08-25) — mesmo
// corte de `renameDataMigrationGuard.test.ts`, mesma razão (ver header lá).
const INSTRUMENTATION_CUTOFF = '20260821090000_accounting_binding';

/** O `eventBinding` `salon.sale.finalized`/`revenue_recognition` de `fixtures/salonBinding.ts`,
 *  copiado POR VALOR (não importado — fronteira §2.1, ver header). Shape mínimo que
 *  `AccountingBindingV1Schema` exige, já validado em produção (é o mesmo dado do golden test). */
const STALE_EVENT_BINDING = {
  eventKey: 'salon.sale.finalized',
  archetypeKey: 'revenue_recognition',
  descriptionTemplate: 'Receita salão — Venda {sourceId}',
  fieldSlots: [
    { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
    { slotName: 'revenueByNature', sourceField: 'event.revenueByNature', transform: 'identity' },
    { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
  ],
  roleSlots: [
    { role: 'controle-recebível', accountCode: '1.1.2' },
    { role: 'receita-serviço', accountCode: '3.1' },
    { role: 'receita-revenda', accountCode: '3.3' },
  ],
};

/** Mesmo helper de `renameDataMigrationGuard.test.ts` (duplicado de propósito — arquivos-guarda
 *  ficam self-contained neste projeto). Acha o SQL de uma futura migração que reescreva o
 *  `payload` do binding, sem aplicá-la via `prisma migrate deploy`. */
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

async function applyIfPresent(mustMention: RegExp): Promise<boolean> {
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
    await prisma.$executeRawUnsafe(statement);
  }
  return true;
}

describe('Guarda F-RN-4 — binding Active com eventKey antigo trava TODO evento pós-rename (boot real, SQLite compartilhado)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' },
    });
    await prisma.accountingPeriod.create({
      data: { userId: DONO, unitId: UNIT, year: 2026, month: 8, status: 'OPEN', openedAt: new Date(), openedById: DONO },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('a ponte emitindo sale.finalized (pós-rename) contra um binding Active ainda salon.* deveria sincronizar via o boot real, mas o dispatch lança ValidationError', async () => {
    // A linha Active "hoje" — exatamente o que `activateAccountingBindingCli.ts` persistiria se
    // rodado neste instante (nenhum dado inventado, ver STALE_EVENT_BINDING acima).
    await prisma.accountingBinding.create({
      data: {
        userId: DONO,
        unitId: UNIT,
        sectorKey: 'beautySalon',
        bindingVersion: 1,
        compiledAt: new Date('2026-08-21T00:00:00.000Z'),
        compiledFromHash: 'sha256:teste-rn-binding-stale',
        payload: JSON.stringify({
          sectorKey: 'beautySalon',
          bindingVersion: 1,
          compiledAt: '2026-08-21T00:00:00.000Z',
          compiledFromHash: 'sha256:teste-rn-binding-stale',
          eventBindings: [STALE_EVENT_BINDING],
        }),
        status: 'Active',
        createdById: DONO,
      },
    });

    // Ponto de extensão da correção: se F-RN-4 já tiver landado como uma migração que reescreve
    // `accounting_bindings.payload`, ela roda AQUI, contra a linha que acabou de ser semeada —
    // nunca via um segundo `prisma migrate deploy` (armadilha de ordenação, ver header).
    await applyIfPresent(/salon\.(sale|package)\./);

    // Boot real de produção — MESMO caminho que `server.ts` usa antes de `app.listen()`.
    const factory = ApplicationFactory.getInstance();
    await factory.initializeAccountingSyncFromBindings();
    const sync = factory.getAccountingSyncService();

    const scope: AccountingScope = {
      ownerUserId: DONO,
      actorUserId: DONO,
      unitId: UNIT,
      ledgerCode: 'DEFAULT',
      baseCurrencyCode: 'BRL',
      timeZone: 'America/Sao_Paulo',
    };

    // O literal que a ponte EMITIRÁ pós-correção (F-RN-2 → (b)) — string de teste, não uma
    // mudança em AccountingSyncPort.ts (o union de produção ainda não a inclui, de propósito).
    const eventPosRename = {
      sourceType: 'sale.finalized',
      sourceId: 'sale-rn-binding-1',
      unitId: UNIT,
      amount: 1000,
      currency: 'BRL',
      occurredAt: '2026-08-25T00:00:00.000Z',
      label: 'Venda sale-rn-binding-1',
    } as unknown as AccountingEvent;

    // Comportamento correto esperado (F-RN-4 → atômico): o binding Active teria sido
    // recompilado/reativado JUNTO com o código (aqui, via a migração que `applyIfPresent`
    // aplicaria acima), então o dispatch deveria suceder — nenhum evento do vertical 1 deveria
    // cair no ramo "sem mapper" só porque o binding do banco ficou para trás.
    await expect(sync.sync(scope, eventPosRename)).resolves.toBeDefined();
  }, 60000);
});
