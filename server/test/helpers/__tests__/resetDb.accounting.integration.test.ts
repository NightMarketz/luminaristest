/**
 * TESTE-GUARDA F-Q3 — `resetDb()` não limpa nenhuma das ~29 tabelas de contabilidade.
 *
 * Pipeline S2 (instrumentador), `docs/accounting/PROXIMOS-PASSOS-2026-08-28.md` §4, linha S2.
 * Autorização citável do dono (2026-08-28): "Ratifico F-Q4(a), F-Q2(a) e F-Q3(a); execute o
 * pipeline do §4." — fork F-Q3, §3 do mesmo doc: custo "Alto e crescente — todo teste de
 * integração contábil novo nasce com a armadilha".
 *
 * A LACUNA, lida direto em `server/test/helpers/db.ts:31-43`: `resetDb()` faz `deleteMany()` em
 * 11 tabelas (dynamicTableData, dynamicTable, dashboardLayout, chatMessage, chatInstance,
 * structuredData, chunk, document, actionProposal, knowledgeGraph, user) e ZERO das tabelas do
 * módulo de contabilidade (`server/prisma/schema.prisma`, modelos a partir de `AccountingPeriod`
 * até `AccountingBinding`). Sintoma já observado por outra suíte (comentário em
 * `ProvenanceAttachIdempotency.integration.test.ts:90-101`): sem limpeza manual local, o estado
 * contábil vaza de um arquivo de teste para o outro sob `--runInBand`.
 *
 * ESCOLHA DAS DUAS TABELAS DA ASSERÇÃO — não é arbitrária, evita falso-negativo por cascade:
 *   - `AuditChainHead`: zero FK (scopeUserId/unitId são strings soltas, comentário no schema
 *     "No FK cascade... deleting a user must NOT erase the trail"). Não pode ser limpa de
 *     carona pelo `user.deleteMany()` que o `resetDb()` já faz.
 *   - `AccountingPeriod`: também `userId`/`unitId` são strings soltas SEM `@relation` a `User`
 *     (ao contrário de `Account`/`JournalEntry`, cujo `userId` tem `onDelete: Cascade` — usar uma
 *     dessas aqui mascararia a lacuna, porque cascatear a partir do `user.deleteMany()` já
 *     limparia a linha e a asserção passaria por acidente, não pelo `resetDb()` ter corrigido
 *     nada).
 * Ambas dispensam qualquer linha em `User`: nenhuma FK real é violada ao semeá-las direto.
 *
 * DEFINIÇÃO DE PRONTO: este teste deve FALHAR hoje, na asserção final de sobrevivência — não por
 * erro de import, FK ou setup. Extensão para as demais ~27 tabelas é trabalho do S3 (correção de
 * `resetDb()`), não desta sessão.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers/db';

const SCOPE_USER = 'u-resetdb-guard-fq3';
const UNIT = 'unit-resetdb-guard-fq3';

describe('resetDb() — guarda de vazamento de tabelas de contabilidade (F-Q3)', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    // Limpeza manual — não confiar no próprio `resetDb()` (é o sujeito sob teste) para não
    // vazar estado desta suíte para as próximas quando rodada dentro de `--runInBand`.
    await prisma.accountingPeriod.deleteMany({ where: { userId: SCOPE_USER, unitId: UNIT } });
    await prisma.auditChainHead.deleteMany({ where: { scopeUserId: SCOPE_USER, unitId: UNIT } });
    await disconnectDb();
  });

  it('NÃO limpa AuditChainHead nem AccountingPeriod — sobrevivem ao resetDb()', async () => {
    await prisma.auditChainHead.create({
      data: { scopeUserId: SCOPE_USER, unitId: UNIT, nextSeq: 1n, headHash: '0'.repeat(64) },
    });
    await prisma.accountingPeriod.create({
      data: { userId: SCOPE_USER, unitId: UNIT, year: 2026, month: 8, status: 'OPEN' },
    });

    // Controle — confirma que o seed acima realmente gravou, antes de chamar o sujeito sob teste.
    await expect(
      prisma.auditChainHead.count({ where: { scopeUserId: SCOPE_USER, unitId: UNIT } }),
    ).resolves.toBe(1);
    await expect(
      prisma.accountingPeriod.count({ where: { userId: SCOPE_USER, unitId: UNIT } }),
    ).resolves.toBe(1);

    await resetDb();

    const survivingHeads = await prisma.auditChainHead.count({
      where: { scopeUserId: SCOPE_USER, unitId: UNIT },
    });
    const survivingPeriods = await prisma.accountingPeriod.count({
      where: { userId: SCOPE_USER, unitId: UNIT },
    });

    // Esta é a asserção que hoje FALHA: resetDb() não toca em nenhuma das duas tabelas, então
    // survivingHeads/survivingPeriods chegam aqui como 1, não 0.
    expect({ survivingHeads, survivingPeriods }).toEqual(
      { survivingHeads: 0, survivingPeriods: 0 },
    );
  });
});
