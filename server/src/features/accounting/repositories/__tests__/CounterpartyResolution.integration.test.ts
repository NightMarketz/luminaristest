/**
 * CONTRATO DE `resolveOrCreateCounterpartyId` — integração contra SQLite REAL, sem mock de prisma.
 *
 * BE-INCR-COUNTERPARTY-NOTNULL (SEC-A1-5), forks F-NN1(a)/F-NN2(a)/F-NN3/F-NN4(a)/F-NN5(b)
 * ratificados 2026-08-14. Cobre os comportamentos 3, 4, 5, 6, 7 e 8 do BRIEF.
 *
 * POR QUE INTEGRAÇÃO, E NÃO UNIT. A suíte de serviço injeta repositório FALSO (memória
 * `repositorios-de-contabilidade-nao-sao-exercitados`): ela afirma o mock. Três das invariantes desta
 * função são INALCANÇÁVEIS por mock —
 *   • dedupe por escopo só falha com DOIS donos na mesma base;
 *   • "nome arquivado não ressuscita" só existe com o `@@unique` do SQLite ligado e o rename-on-delete
 *     de verdade gravado;
 *   • atomicidade (ACC-012) só existe com rollback de tx real — um mock de `runTransaction` que só
 *     chama `fn({})` NUNCA desfaz nada, então o teste de rollback passaria com a implementação errada.
 *
 * AUDITORIA. O `auditService` daqui é no-op de propósito: a emissão de `counterparty.created` na MESMA
 * tx é afirmada nas suítes de serviço (AP e AR). Aqui o alvo é a resolução da identidade.
 *
 * CADA NEGATIVO TEM O SEU CONTROLE — um teste que espera `rejects`/`null` também passa quando tudo
 * está quebrado; o par positivo/negativo separa "a guarda mordeu" de "nada funciona aqui".
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { CounterpartyRepository } from '@/features/accounting/repositories/CounterpartyRepository';
import { resolveOrCreateCounterpartyId } from '@/features/accounting/services/counterpartyResolution';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { deletedCounterpartyName } from '@/features/accounting/models/Counterparty.model';
import { ValidationError } from '@/lib/errors';

const UNIT = 'unit-cpr';
const DONO_A = 'u-cpr-a';
const DONO_B = 'u-cpr-b';
const MSG_TIPO = 'A contraparte de uma conta a pagar deve ser um fornecedor (SUPPLIER).';

const escopo = (userId: string, unitId: string = UNIT): AccountingScope =>
  resolveAccountingScope({ userId }, unitId);

const repo = new CounterpartyRepository();
const deps = {
  counterpartyRepo: repo,
  auditService: { append: async () => undefined } as never,
  // Policy permissiva: a guarda de autorização da cunhagem tem caso próprio nas suítes de AP e AR
  // (achado C). Aqui o alvo é a resolução da identidade contra SQLite real.
  policy: { canManageCounterparty: () => true } as never,
};

/** Resolve dentro de uma tx real — é assim que os dois serviços chamam (dentro da tx1 da linha). */
const resolverEmTx = (
  scope: AccountingScope,
  name: string,
  explicitId?: string,
  type: 'SUPPLIER' | 'CUSTOMER' = 'SUPPLIER',
) =>
  repo.runTransaction((tx) =>
    resolveOrCreateCounterpartyId(deps, scope, type, explicitId, name, MSG_TIPO, tx),
  );

describe('resolveOrCreateCounterpartyId — contrato em SQLite real (SEC-A1-5)', () => {
  beforeAll(async () => {
    pushTestSchema();
    for (const id of [DONO_A, DONO_B]) {
      await prisma.user.create({
        data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' },
      });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.counterparty.deleteMany({ where: { userId: { in: [DONO_A, DONO_B] } } });
    await prisma.user.deleteMany({ where: { id: { in: [DONO_A, DONO_B] } } });
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ controle do harness
  it('CONTROLE: sem contraparte no catálogo, cunha uma nova e devolve um id gravado', async () => {
    const id = await resolverEmTx(escopo(DONO_A), 'ACME Ltda');

    expect(id).toEqual(expect.any(String));
    const gravada = await prisma.counterparty.findUnique({ where: { id } });
    expect(gravada).toMatchObject({
      userId: DONO_A,
      unitId: UNIT,
      type: 'SUPPLIER',
      name: 'ACME Ltda',
      ref: null,
      deletedAt: null,
    });
  });

  // ------------------------------------------------------------------ comp. 3 — reuso
  it('reusa a contraparte existente do mesmo nome em vez de duplicar', async () => {
    const primeiro = await resolverEmTx(escopo(DONO_A), 'Reuso SA');
    const segundo = await resolverEmTx(escopo(DONO_A), 'Reuso SA');

    expect(segundo).toBe(primeiro);
    const quantas = await prisma.counterparty.count({
      where: { userId: DONO_A, unitId: UNIT, type: 'SUPPLIER', name: 'Reuso SA' },
    });
    expect(quantas).toBe(1);
  });

  it('não confunde SUPPLIER com CUSTOMER de mesmo nome — o tipo faz parte da identidade', async () => {
    const fornecedor = await resolverEmTx(escopo(DONO_A), 'Ambivalente', undefined, 'SUPPLIER');
    const cliente = await resolverEmTx(escopo(DONO_A), 'Ambivalente', undefined, 'CUSTOMER');

    expect(cliente).not.toBe(fornecedor);
  });

  // ------------------------------------------------------------------ comp. 4 — SEC-A1-2
  it('dois donos com o MESMO nome recebem identidades distintas (SEC-A1-2, sem colapso)', async () => {
    const doA = await resolverEmTx(escopo(DONO_A), 'ACME');
    const doB = await resolverEmTx(escopo(DONO_B), 'ACME');

    expect(doB).not.toBe(doA);
    const [linhaA, linhaB] = await Promise.all([
      prisma.counterparty.findUnique({ where: { id: doA } }),
      prisma.counterparty.findUnique({ where: { id: doB } }),
    ]);
    expect(linhaA!.userId).toBe(DONO_A);
    expect(linhaB!.userId).toBe(DONO_B);
  });

  it('a mesma dupla (dono, nome) em OUTRA unidade também é identidade própria', async () => {
    const naUnidade = await resolverEmTx(escopo(DONO_A, UNIT), 'Multi-unidade');
    const noutra = await resolverEmTx(escopo(DONO_A, 'unit-cpr-2'), 'Multi-unidade');

    expect(noutra).not.toBe(naUnidade);
  });

  // ------------------------------------------------------------------ comp. 6 — SEC-A1-4
  it('nome ARQUIVADO não é ressuscitado: cunha identidade nova e a tumba fica arquivada', async () => {
    const original = await resolverEmTx(escopo(DONO_A), 'Arquivavel');
    // Arquivamento = soft-delete + rename-on-key, exatamente como CounterpartyService.archive.
    await prisma.counterparty.update({
      where: { id: original },
      data: { deletedAt: new Date(), name: deletedCounterpartyName(original, 'Arquivavel') },
    });

    const novo = await resolverEmTx(escopo(DONO_A), 'Arquivavel');

    expect(novo).not.toBe(original);
    const [tumba, viva] = await Promise.all([
      prisma.counterparty.findUnique({ where: { id: original } }),
      prisma.counterparty.findUnique({ where: { id: novo } }),
    ]);
    expect(tumba!.deletedAt).not.toBeNull();
    expect(tumba!.name).toBe(deletedCounterpartyName(original, 'Arquivavel'));
    expect(viva).toMatchObject({ name: 'Arquivavel', deletedAt: null });
  });

  // ------------------------------------------------------------------ comp. 5 — SEC-A1-1
  it('CONTROLE: um id explícito do PRÓPRIO escopo é aceito e devolvido sem cunhar nada', async () => {
    const meu = await resolverEmTx(escopo(DONO_A), 'Explicito');
    const antes = await prisma.counterparty.count({ where: { userId: DONO_A } });

    const resolvido = await resolverEmTx(escopo(DONO_A), 'nome-ignorado', meu);

    expect(resolvido).toBe(meu);
    expect(await prisma.counterparty.count({ where: { userId: DONO_A } })).toBe(antes);
  });

  it('rejeita um counterpartyId de OUTRO escopo (IDOR #1) — e não cunha nada no lugar', async () => {
    const doOutro = await resolverEmTx(escopo(DONO_B), 'Alheia');
    const antes = await prisma.counterparty.count({ where: { userId: DONO_A } });

    await expect(resolverEmTx(escopo(DONO_A), 'Alheia', doOutro)).rejects.toBeInstanceOf(ValidationError);
    // O fallback por nome NÃO pode ter rodado: id inválido é erro, nunca "cunha uma qualquer".
    expect(await prisma.counterparty.count({ where: { userId: DONO_A } })).toBe(antes);
  });

  it('rejeita um id do escopo certo mas do TIPO errado (CUSTOMER num payable)', async () => {
    const cliente = await resolverEmTx(escopo(DONO_A), 'So Cliente', undefined, 'CUSTOMER');

    await expect(resolverEmTx(escopo(DONO_A), 'So Cliente', cliente, 'SUPPLIER')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejeita um id ARQUIVADO (findById lê só linha viva)', async () => {
    const id = await resolverEmTx(escopo(DONO_A), 'Arquivada Explicita');
    await prisma.counterparty.update({
      where: { id },
      data: { deletedAt: new Date(), name: deletedCounterpartyName(id, 'Arquivada Explicita') },
    });

    await expect(resolverEmTx(escopo(DONO_A), 'qualquer', id)).rejects.toBeInstanceOf(ValidationError);
  });

  // ------------------------------------------------------------------ comp. 7 — ACC-012
  it('a cunhagem é ATÔMICA com a tx do chamador: rollback não deixa contraparte órfã', async () => {
    const nome = 'Orfa Potencial';

    await expect(
      repo.runTransaction(async (tx) => {
        await resolveOrCreateCounterpartyId(deps, escopo(DONO_A), 'SUPPLIER', undefined, nome, MSG_TIPO, tx);
        // Simula a falha do resto da tx1 (create do payable / audit) DEPOIS da cunhagem.
        throw new Error('falha depois da cunhagem');
      }),
    ).rejects.toThrow('falha depois da cunhagem');

    const sobrou = await prisma.counterparty.findFirst({
      where: { userId: DONO_A, unitId: UNIT, type: 'SUPPLIER', name: nome },
    });
    expect(sobrou).toBeNull();
  });

  // ------------------------------------------------------------------ comp. 8 — corrida
  it('adota a vencedora quando a chave única já foi tomada entre o findByName e o create (P2002)', async () => {
    const nome = 'Corredora';
    // Encena o intervalo da corrida: a linha nasce por FORA, depois que um findByName teria dado miss.
    const vencedora = await prisma.counterparty.create({
      data: { userId: DONO_A, unitId: UNIT, type: 'SUPPLIER', name: nome, ref: null, createdById: DONO_A },
    });

    // Força o caminho do P2002: um repo cujo primeiro findByName MENTE dizendo que não achou nada,
    // como faria o snapshot de quem leu antes da vencedora commitar. O create real então bate na
    // constraint, e o re-read (2ª chamada, verdadeira) tem de devolver a vencedora.
    let primeira = true;
    const repoComMiss = Object.create(repo) as CounterpartyRepository;
    repoComMiss.findByName = async (...args: Parameters<CounterpartyRepository['findByName']>) => {
      if (primeira) {
        primeira = false;
        return null;
      }
      return repo.findByName(...args);
    };

    const id = await repo.runTransaction((tx) =>
      resolveOrCreateCounterpartyId(
        { counterpartyRepo: repoComMiss, auditService: deps.auditService, policy: deps.policy },
        escopo(DONO_A),
        'SUPPLIER',
        undefined,
        nome,
        MSG_TIPO,
        tx,
      ),
    );

    expect(id).toBe(vencedora.id); // adotou a vencedora — nenhum P2002 vazou para o chamador
    expect(
      await prisma.counterparty.count({ where: { userId: DONO_A, unitId: UNIT, type: 'SUPPLIER', name: nome } }),
    ).toBe(1);
  });
});
