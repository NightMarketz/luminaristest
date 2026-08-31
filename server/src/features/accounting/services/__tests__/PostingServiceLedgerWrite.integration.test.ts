/**
 * CAMINHO DE ESCRITA DO RAZÃO — teste de integração contra SQLite REAL, sem mock de prisma.
 *
 * Barreira do achado `caminho-de-escrita-do-razao-sem-cobertura-de-integracao`
 * (docs/audit/TRIAGEM-R1-R3.json item 4 · AV-R3 F1 · dano 4 · bloqueia_primeiro_cliente),
 * o de MAIOR dano da fila e o único cujo conserto era um arquivo novo.
 *
 * O QUE O ACHADO MEDIU, e o que este arquivo muda:
 *   `grep -rln PostingService src --include=*.integration.test.ts | wc -l` devolvia **0** — 31
 *   arquivos de integração e nenhum instanciava o serviço que escreve no razão. A suíte unit
 *   existe e é grande (PostingService.test.ts, 1352 linhas), mas faz `jest.mock` de lib/prisma:
 *   ela afirma o MOCK. Foi por isso que duas mutações do AV-R3 sobreviveram **sem sequer serem
 *   executadas** — as duas de isolamento e atomicidade, que são as duas classes de bug mais
 *   registradas neste projeto:
 *     · M3 — `PostingRepository.ts:20`, perna do lançamento escrita FORA da transação
 *     · M5 — `JournalEntryRepository.ts:49`, filtro de inquilino removido do findById
 *   Nenhum mock alcança as duas: uma só aparece quando existe rollback de verdade, a outra só
 *   quando existem DOIS donos na mesma base. Daí a camada ser integração, e não unit reforçada.
 *
 * SERVIÇO VEM DO FACTORY, não do `new`. O achado é sobre o caminho de escrita como ele roda em
 * produção; instanciar a classe à mão testaria a classe e não a fiação (Contrato §2/§3).
 *
 * CADA CASO NEGATIVO TEM O SEU CONTROLE. Um teste que espera erro passa por qualquer erro,
 * inclusive por harness quebrado — o par positivo/negativo é o que separa "a guarda mordeu" de
 * "nada funciona aqui".
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { JournalEntryRepository } from '@/features/accounting/repositories/JournalEntryRepository';
import { NotFoundError } from '@/lib/errors';

const UNIT = 'unit-ledger-write';
const DONO_A = 'u-ledger-a';
const DONO_B = 'u-ledger-b';
const DATA = '2026-06-15';

const scopeDe = (userId: string): AccountingScope => resolveAccountingScope({ userId }, UNIT);
const posting = () => getFactory().getPostingService();

/** Lançamento balanceado mínimo: D 4.1 despesa / C 1.1.1 banco, em centavos inteiros. */
const lancamento = (descricao: string, centavos: number) => ({
  unitId: UNIT,
  date: DATA,
  description: descricao,
  sourceType: 'manual',
  lines: [
    { accountCode: '4.1', debitCents: centavos, creditCents: 0 },
    { accountCode: '1.1.1', debitCents: 0, creditCents: centavos },
  ],
});

/** O período tem de existir e estar OPEN — o gate roda duas vezes (preflight e dentro da tx). */
async function abrirPeriodo(userId: string): Promise<void> {
  await prisma.accountingPeriod.create({
    data: { userId, unitId: UNIT, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: userId },
  });
}

/** Linhas do razão que pertencem a um dono, contadas direto da base. */
const contagemDe = async (userId: string) => ({
  entries: await prisma.journalEntry.count({ where: { userId, unitId: UNIT } }),
  postings: await prisma.posting.count({ where: { userId, unitId: UNIT } }),
});

describe('PostingService — caminho de escrita do razão em SQLite real (AV-R3 F1)', () => {
  beforeAll(async () => {
    pushTestSchema();
    for (const id of [DONO_A, DONO_B]) {
      await prisma.user.create({
        data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' },
      });
      await abrirPeriodo(id);
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------- controle do harness
  // Sem este caso, os dois negativos abaixo passariam por vacuidade: um serviço que sempre
  // explode satisfaz "espera erro" e deixa zero linha na base, que é o que eles asseram.
  it('CONTROLE: postEntry pelo factory grava o lançamento e as DUAS pernas, em centavos inteiros', async () => {
    const entry = await posting().postEntry(scopeDe(DONO_A), lancamento('venda à vista', 12345));

    expect(entry.postings).toHaveLength(2);
    const somaDebito = entry.postings.reduce((n, p) => n + Number(p.debitCents), 0);
    const somaCredito = entry.postings.reduce((n, p) => n + Number(p.creditCents), 0);
    expect(somaDebito).toBe(12345);
    expect(somaCredito).toBe(12345);

    // Lido de volta da BASE, não do retorno do serviço — é a persistência que está sob teste.
    const naBase = await prisma.posting.findMany({ where: { entryId: entry.id } });
    expect(naBase).toHaveLength(2);
    // debitCents/creditCents are BigInt columns (BE-INCR-MONEY-BIGINT) — a bigint can never carry a
    // fractional part, but the check still round-trips through `number` here to prove the value is
    // ALSO representable without precision loss (well under Number.MAX_SAFE_INTEGER for this amount).
    expect(naBase.every((p) => Number.isInteger(Number(p.debitCents)) && Number.isInteger(Number(p.creditCents)))).toBe(true);
  });

  // ---------------------------------------------------------------- M3 · atomicidade
  /**
   * A tx precisa abortar DEPOIS que as pernas já foram escritas — é essa janela, e só ela, que
   * distingue `(tx ?? prisma)` de `prisma` em PostingRepository.create.
   *
   * O gatilho é a própria trilha de auditoria: AuditService.append insere com
   * `seq = head.nextSeq` e o schema tem `@@unique([scopeUserId, unitId, seq])`. Plantar um
   * evento nesse seq SEM avançar o head faz o append colidir (P2002) — e o append roda depois
   * do laço de pernas. O invariante que isso trava é real e não é artifício: se a trilha
   * append-only não consegue registrar o lançamento, o lançamento NÃO pode sobreviver.
   */
  it('M3: tx que aborta depois das pernas não deixa perna órfã — atomicidade real', async () => {
    const scope = scopeDe(DONO_A);
    const antes = await contagemDe(DONO_A);

    const head = await prisma.auditChainHead.findUnique({
      where: { scopeUserId_unitId: { scopeUserId: DONO_A, unitId: UNIT } },
    });
    expect(head).not.toBeNull(); // o controle acima já postou, então a cadeia existe
    const invasor = await prisma.auditEvent.create({
      data: {
        scopeUserId: DONO_A,
        unitId: UNIT,
        seq: head!.nextSeq, // exatamente o seq que o próximo append vai tentar usar
        actorUserId: DONO_A,
        eventType: 'test.seq_squatter',
        targetType: 'test',
        targetId: 'colisao-proposital',
        payload: '{}',
        prevHash: 'squatter-prev',
        hash: 'squatter-hash-unico',
        createdAt: new Date(),
      },
    });

    try {
      await expect(posting().postEntry(scope, lancamento('vai abortar', 5000))).rejects.toThrow();

      const depois = await contagemDe(DONO_A);
      // A perna é o que M3 tira da transação: se ela sobreviver ao rollback, o razão fica com
      // uma linha sem lançamento — dinheiro contabilizado que nenhum documento explica.
      expect(depois.postings).toBe(antes.postings);
      expect(depois.entries).toBe(antes.entries);
      // E o rollback foi INTEIRO: o head da cadeia de auditoria também não avançou.
      const headDepois = await prisma.auditChainHead.findUnique({
        where: { scopeUserId_unitId: { scopeUserId: DONO_A, unitId: UNIT } },
      });
      expect(headDepois!.nextSeq).toBe(head!.nextSeq);
    } finally {
      // O invasor tem de sair mesmo se a asserção falhar: enquanto ele ocupa o seq, TODO post
      // seguinte deste dono colide, e os casos de baixo reprovariam por contaminação em vez de
      // por defeito próprio. Foi o que aconteceu na primeira execução.
      await prisma.auditEvent.delete({ where: { id: invasor.id } });
    }
  });

  // ---------------------------------------------------------------- M5 · isolamento
  /**
   * O SÍTIO DO M5, medido em vez de suposto.
   *
   * `JournalEntryRepository.findById` é o gate de inquilino que o código declara AUTORITATIVO —
   * `DocumentAttachmentService.ts:92` chama exatamente esta função e o comentário lá diz, com
   * todas as letras, que a FK só prova que o lançamento EXISTE, não que ele é deste inquilino.
   * Nada depois disso reescopa o anexo: ele é gravado com o `userId` de quem pediu. Removido o
   * filtro, o dono B pendura evidência no lançamento do dono A.
   *
   * DESCOBERTA DESTA RODADA, que o AV-R3 não podia ter (ele nunca executou a linha): a mesma
   * mutação NÃO é observável através de `reverseEntry` — lá um segundo gate escopado a jusante
   * (o update de status do original) devolve NotFound e derruba a tx inteira. Por isso o kill do
   * M5 mora aqui, no contrato do repositório, e não no caso de estorno abaixo: o caso de estorno
   * passa com a mutação aplicada, e chamá-lo de barreira do M5 seria vitória declarada.
   */
  it('M5: findById do razão é filtrado por dono — o gate que o anexo trata como autoritativo', async () => {
    const doA = await posting().postEntry(scopeDe(DONO_A), lancamento('só do dono A', 3300));
    const repo = new JournalEntryRepository();

    expect(await repo.findById(scopeDe(DONO_B), doA.id)).toBeNull();
    // Controle: sem ele, um findById quebrado para todo mundo satisfaria o toBeNull acima.
    expect(await repo.findById(scopeDe(DONO_A), doA.id)).not.toBeNull();
  });

  /**
   * Invariante de ponta a ponta, complementar ao caso acima: o dono B não escreve no razão do
   * dono A. Isto sobrevive à mutação M5 (ver o comentário acima) — está aqui porque a
   * propriedade importa por si, não como prova de mordida.
   */
  it('dono B não estorna lançamento do dono A — nada escrito de nenhum lado', async () => {
    const doA = await posting().postEntry(scopeDe(DONO_A), lancamento('lançamento do dono A', 7700));
    const antesB = await contagemDe(DONO_B);

    await expect(
      posting().reverseEntry(scopeDe(DONO_B), {
        unitId: UNIT,
        lancamentoId: doA.id,
        reversalPostingDate: DATA,
        reason: 'tentativa cross-tenant',
      }),
    ).rejects.toThrow(NotFoundError);

    // Nada escrito de nenhum dos dois lados: nem estorno para B, nem estorno no razão de A.
    expect(await contagemDe(DONO_B)).toEqual(antesB);
    const original = await prisma.journalEntry.findUnique({ where: { id: doA.id } });
    expect(original!.reversedById).toBeNull();
    expect(original!.status).toBe('Posted');
  });

  // Controle do caso acima: sem ele, `rejects.toThrow(NotFoundError)` passaria também se
  // reverseEntry estivesse quebrado para TODO mundo — e o teste de isolamento estaria medindo
  // uma pane geral com nome de guarda de inquilino.
  it('CONTROLE: o próprio dono A estorna o mesmo lançamento com sucesso', async () => {
    const doA = await posting().postEntry(scopeDe(DONO_A), lancamento('para estornar', 4400));

    const { reversal } = await posting().reverseEntry(scopeDe(DONO_A), {
      unitId: UNIT,
      lancamentoId: doA.id,
      reversalPostingDate: DATA,
      reason: 'controle',
    });

    expect(reversal.postings).toHaveLength(2);
    // O estorno espelha invertido: o débito de 4400 vira crédito de 4400.
    expect(reversal.postings.reduce((n, p) => n + Number(p.creditCents), 0)).toBe(4400);
    expect(reversal.userId).toBe(DONO_A);
    const original = await prisma.journalEntry.findUnique({ where: { id: doA.id } });
    expect(original!.reversedById).toBe(reversal.id);
  });
});
