/**
 * IDEMPOTÊNCIA do `PostingService.attachSourceDocument` — integração contra SQLite REAL, sem mock.
 *
 * BE-INCR-PROVENANCE-ATTACH (NFE-X), item 14 do §4.3 do BRIEF. F-PA2→(a), ratificado 2026-08-28.
 *
 * POR QUE ESTE ARQUIVO EXISTE — e por que os 5 unitários irmãos NÃO bastam. A suíte unit do
 * `PostingService` injeta `sourceProvenanceRepo` FALSO cujo `findSourcesByEntry` devolve `[]`
 * SEMPRE: ele não acumula estado. Lá, o caso "idempotente" PRÉ-SEMEIA um vínculo e chama UMA
 * vez — exercita o RAMO do curto-circuito, não a SEQUÊNCIA. Contra aquele fake, duas chamadas
 * reais criariam DOIS SourceDocuments e nenhuma asserção unitária falharia.
 * Este é o único teste do incremento que fica vermelho se a idempotência quebrar.
 *
 * ESCOPO DELIBERADO — só o caso SEQUENCIAL. O caso CONCORRENTE (dois anexos simultâneos da
 * mesma chave) segue ABERTO por decisão: falta `@@unique(journalEntryId, externalRef)`, e o dono
 * ratificou F-D4→(b) "dívida declarada" em 2026-08-28. Provar concorrência aqui seria fabricar
 * cobertura para uma dívida que ele decidiu manter — e, no Windows, o SQLite serializa e o teste
 * passaria por acidente de plataforma (memória `windows-serializa-sqlite-ci-linux-nao`).
 *
 * DESVIO DECLARADO do BRIEF: o §4.3 item 14 mandou acrescentar o caso em
 * `repositories/__tests__/SourceProvenance.integration.test.ts`. Não é possível — aquele arquivo
 * usa um `PrismaClient` DEDICADO (`new PrismaClient({datasources:…})`), enquanto os repositórios
 * concretos falam pelo singleton `@/lib/prisma`. Chamar o serviço de lá gravaria noutro banco que
 * não o do fixture. Este arquivo usa o padrão `pushTestSchema` + singleton, o mesmo do
 * `SubledgerFilters.integration.test.ts`, que é o precedente da casa para exercitar repo real.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers/db';
import { PostingService } from '@/features/accounting/services/PostingService';
import { AuditService } from '@/features/accounting/services/AuditService';
import { AccountRepository } from '@/features/accounting/repositories/AccountRepository';
import { JournalEntryRepository } from '@/features/accounting/repositories/JournalEntryRepository';
import { PostingRepository } from '@/features/accounting/repositories/PostingRepository';
import { AccountingPeriodRepository } from '@/features/accounting/repositories/AccountingPeriodRepository';
import { SourceProvenanceRepository } from '@/features/accounting/repositories/SourceProvenanceRepository';
import { DimensionRepository } from '@/features/accounting/repositories/DimensionRepository';
import { AuditRepository } from '@/features/accounting/repositories/AuditRepository';
import { AccountingPolicy } from '@/features/accounting/policies/AccountingPolicy';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const OWNER = 'u-prov-idem';
const UNIT = 'unit-prov-idem';
const ENTRY_ID = 'entry-prov-idem-1';
const CHAVE = '35260812345678000199550010000000011000000017';

let svc: PostingService;
let scope: AccountingScope;

/** Monta o serviço com repositórios REAIS, na mesma ordem do `factory.ts:487-496`. */
function buildRealService(): PostingService {
  const postingRepo = new PostingRepository();
  return new PostingService(
    new AccountRepository(),
    new JournalEntryRepository(),
    postingRepo,
    new AccountingPolicy(),
    new AccountingPeriodRepository(),
    new AuditService(new AuditRepository(), postingRepo, new AccountingPolicy()),
    new SourceProvenanceRepository(),
    new DimensionRepository(),
  );
}

/** Semeia um lançamento JÁ POSTADO — o alvo do anexo. Nenhum valor é escrito por este teste. */
async function seedPostedEntry(): Promise<void> {
  await prisma.user.create({
    data: { id: OWNER, name: 'Prov Idem', username: 'providem', email: 'providem@test.local', password: 'x', role: 'USER' },
  });
  await prisma.journalEntry.create({
    data: {
      id: ENTRY_ID,
      userId: OWNER,
      unitId: UNIT,
      date: new Date('2026-06-20'),
      description: 'Venda de teste já postada',
      sourceType: 'sale.finalized',
      sourceId: 'sale-idem-1',
      status: 'Posted',
    },
  });
}

describe('attachSourceDocument — idempotência pela externalRef, SQLite real', () => {
  beforeAll(() => {
    pushTestSchema();
    svc = buildRealService();
    scope = resolveAccountingScope({ userId: OWNER }, UNIT);
  }, 120000);

  /**
   * Limpeza LOCAL das tabelas de contabilidade.
   *
   * O `resetDb()` do helper compartilhado NÃO cobre nenhuma delas — ele limpa DynamicTable,
   * chat, documentos e `user`, e só. Sem esta limpeza os `SourceDocument`/`AuditEvent` de um caso
   * vazam para o seguinte e as contagens deixam de significar o que afirmam (visto na prática:
   * a cadeia de auditoria chegou a `seq 7` num arquivo de 6 casos).
   *
   * Não altero o `resetDb` — é helper compartilhado por outras suítes e mexer nele é tocar
   * vizinho. Ordem FK-safe: filhos antes dos pais. `auditEvent` não tem FK para `user`
   * (trilha é evidência, não cascateia — ACC-020), por isso precisa de delete explícito.
   */
  afterEach(async () => {
    await prisma.journalEntrySource.deleteMany();
    await prisma.sourceDocument.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.journalEntry.deleteMany();
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('CONTROLE — o primeiro anexo cria exatamente UM SourceDocument e UM vínculo', async () => {
    await seedPostedEntry();

    const first = await svc.attachSourceDocument(scope, ENTRY_ID, {
      externalRef: CHAVE,
      documentDate: '2026-06-20',
      description: 'NF-e 1/1',
    });

    expect(first.externalRef).toBe(CHAVE);
    // Espelha o sourceType do lançamento-alvo (convenção D5) — não foi passado na chamada.
    expect(first.sourceType).toBe('sale.finalized');
    await expect(prisma.sourceDocument.count({ where: { userId: OWNER, unitId: UNIT } })).resolves.toBe(1);
    await expect(prisma.journalEntrySource.count({ where: { journalEntryId: ENTRY_ID } })).resolves.toBe(1);
  });

  it('DUAS chamadas com a MESMA externalRef criam UM SourceDocument só — e devolvem o mesmo id', async () => {
    await seedPostedEntry();
    const doc = { externalRef: CHAVE, documentDate: '2026-06-20', description: 'NF-e 1/1' };

    const first = await svc.attachSourceDocument(scope, ENTRY_ID, doc);
    const second = await svc.attachSourceDocument(scope, ENTRY_ID, doc);

    // É ESTA asserção que o unitário não alcança: o fake dele nunca devolveria o vínculo criado
    // na primeira chamada, então lá as duas chamadas produziriam ids diferentes sem ninguém notar.
    expect(second.id).toBe(first.id);
    await expect(prisma.sourceDocument.count({ where: { userId: OWNER, unitId: UNIT } })).resolves.toBe(1);
    await expect(prisma.journalEntrySource.count({ where: { journalEntryId: ENTRY_ID } })).resolves.toBe(1);
  });

  it('NEGATIVO — externalRef DIFERENTE no mesmo lançamento cria um segundo documento (o gate é a chave, não o lançamento)', async () => {
    await seedPostedEntry();

    await svc.attachSourceDocument(scope, ENTRY_ID, { externalRef: CHAVE });
    await svc.attachSourceDocument(scope, ENTRY_ID, { externalRef: CHAVE.replace(/7$/, '8') });

    // Sem este par, o teste acima passaria também se o método simplesmente nunca criasse o segundo.
    await expect(prisma.sourceDocument.count({ where: { userId: OWNER, unitId: UNIT } })).resolves.toBe(2);
    await expect(prisma.journalEntrySource.count({ where: { journalEntryId: ENTRY_ID } })).resolves.toBe(2);
  });

  it('sem externalRef não há chave para deduplicar — dois anexos criam dois documentos', async () => {
    await seedPostedEntry();

    await svc.attachSourceDocument(scope, ENTRY_ID, { description: 'sem chave' });
    await svc.attachSourceDocument(scope, ENTRY_ID, { description: 'sem chave' });

    await expect(prisma.sourceDocument.count({ where: { userId: OWNER, unitId: UNIT } })).resolves.toBe(2);
  });

  it('a auditoria entra na MESMA tx do anexo — um evento entry.source_recorded por documento criado', async () => {
    await seedPostedEntry();
    const doc = { externalRef: CHAVE };

    await svc.attachSourceDocument(scope, ENTRY_ID, doc);
    await svc.attachSourceDocument(scope, ENTRY_ID, doc); // curto-circuito: não audita de novo

    // AuditEvent chaveia o dono por `scopeUserId` (não `userId`, como as demais tabelas do módulo).
    const events = await prisma.auditEvent.findMany({
      where: { scopeUserId: OWNER, unitId: UNIT, eventType: 'entry.source_recorded' },
    });
    expect(events).toHaveLength(1);
    expect(events[0].targetId).toBe(ENTRY_ID);
  });

  it('listSourceDocuments devolve o vínculo com o documento resolvido', async () => {
    await seedPostedEntry();
    await svc.attachSourceDocument(scope, ENTRY_ID, { externalRef: CHAVE, description: 'NF-e 1/1' });

    const links = await svc.listSourceDocuments(scope, ENTRY_ID);

    expect(links).toHaveLength(1);
    expect(links[0].sourceDocument.externalRef).toBe(CHAVE);
  });
});
