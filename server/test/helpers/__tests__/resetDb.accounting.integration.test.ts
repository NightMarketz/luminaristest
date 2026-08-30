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
 * até `AccountingBinding`). Sintoma já observado por outra suíte: o bloco de limpeza manual local
 * que `ProvenanceAttachIdempotency.integration.test.ts` carregava — citado SEM faixa de linha de
 * propósito, porque esse bloco foi REMOVIDO depois que este `resetDb()` passou a cobrir essas
 * tabelas, e apontar linha para código que não existe mais é a classe de ponteiro morto
 * (`8c30f7c8`, a mesma que este PR conserta em `db.ts`). Sem aquela limpeza manual local, o
 * estado contábil vazava de um arquivo de teste para o outro sob `--runInBand`.
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
import fs from 'fs';
import path from 'path';
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

/**
 * GUARDA DERIVADA DO SCHEMA (pipeline S3, escopo ratificado) — enumera os models de
 * contabilidade a partir do `schema.prisma` (não de uma lista hardcoded aqui) e falha se
 * `resetDb()` não referenciar algum deles. Objetivo: tabela contábil nova sem limpeza vira
 * teste vermelho automático, sem exigir lembrar de atualizar este arquivo.
 *
 * DISCRIMINADOR ESCOLHIDO: o comentário de banner `// ── Accounting (deterministic
 * double-entry module) ──…` (schema.prisma:295) marca o INÍCIO da seção; como não existe
 * nenhum outro banner de MÓDULO (mesmo estilo `// ── …`) depois dele no arquivo — os sete
 * banners restantes (Bank reconciliation, Formal provenance, Prepaid packages, Dimensões,
 * Contraparte, Estoque, A Prensa) são sub-seções DENTRO do módulo de contabilidade — a seção
 * roda do banner até o FIM DO ARQUIVO. Isso é mais robusto que hardcodear "de AccountingPeriod
 * até AccountingBinding" por nome: um model novo ACRESCENTADO ao final do arquivo entra na
 * varredura automaticamente, sem precisar que ninguém saiba o nome do último model atual.
 * LIMITE conhecido e aceito: se um dia alguém inserir um banner de um módulo NÃO-contábil
 * depois da linha 295 (ainda antes do fim do arquivo), os models dali pra frente cairiam
 * (incorretamente) na lista de "contabilidade" — não há hoje essa seção, e o teste falharia
 * de forma ruidosa (não silenciosa) se isso acontecer, o que ainda cumpre o objetivo de pegar
 * tabela nova sem cobertura.
 */
describe('resetDb() cobre todo model de contabilidade do schema.prisma (guarda derivada, F-Q3)', () => {
  const SCHEMA_PATH = path.resolve(__dirname, '../../../prisma/schema.prisma');
  const DB_HELPER_PATH = path.resolve(__dirname, '../db.ts');

  function accountingModelNames(): string[] {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const bannerMatch = schema.match(/^\/\/ ── Accounting \(deterministic double-entry module\)/m);
    if (!bannerMatch || bannerMatch.index === undefined) {
      throw new Error(
        'Banner "// ── Accounting (deterministic double-entry module)" não encontrado em ' +
          'schema.prisma — discriminador da guarda quebrou; atualize esta busca.',
      );
    }
    const accountingSection = schema.slice(bannerMatch.index);
    const modelMatches = [...accountingSection.matchAll(/^model (\w+) \{/gm)];
    return modelMatches.map((m) => m[1]);
  }

  it('todo model de contabilidade do schema tem deleteMany() em resetDb()', () => {
    const models = accountingModelNames();
    // Sanidade do próprio discriminador — se isto falhar, a regex do banner ou o schema mudaram
    // de um jeito que quebra a premissa acima, não que falta cobertura no resetDb().
    expect(models.length).toBeGreaterThanOrEqual(29);

    const dbHelperSource = fs.readFileSync(DB_HELPER_PATH, 'utf8');
    const uncovered = models.filter((modelName) => {
      const clientPropertyName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      const deleteManyCall = new RegExp(`prisma\\.${clientPropertyName}\\.deleteMany\\(`);
      return !deleteManyCall.test(dbHelperSource);
    });

    expect(uncovered).toEqual([]);
  });
});
