/**
 * CONTRATO DO CounterpartyRepository — integração contra SQLite REAL, sem mock de prisma.
 *
 * Unidade 2 de 4 da subfila ratificada em `docs/audit/TRIAGEM-R1-R3.json`
 * (`r2_decision.ratified_subqueue`), órfã desde d11b4716. Invariantes nomeadas na linha da peça
 * central do AV-R2: **tx + inquilino + softdelete** — as três têm caso próprio abaixo.
 *
 * POR QUE INTEGRAÇÃO, E NÃO UNIT. A suíte unit faz `jest.mock` de `lib/prisma`: ela afirma o mock.
 * Foi exatamente isso que deixou as mutações M3 (perna escrita fora da tx) e M5 (filtro de inquilino)
 * do AV-R3 sobreviverem SEM SEREM EXECUTADAS. Nenhuma das três invariantes daqui é alcançável por
 * mock: rollback só existe com tx de verdade, vazamento entre inquilinos só existe com DOIS donos na
 * mesma base, e tumba de soft-delete sob `@@unique` só existe com a constraint do SQLite ligada.
 *
 * O QUE NÃO ESTÁ AQUI. Este arquivo prova o CONTRATO DO REPOSITÓRIO. A camada HTTP
 * (`counterpartyController`) e a política ficam fora — a subfila trata o controller como unidade
 * separada (unidade 1).
 *
 * CADA CASO NEGATIVO TEM O SEU CONTROLE. Um teste que espera `null`/erro passa também quando tudo
 * está quebrado; o par positivo/negativo é o que separa "a guarda mordeu" de "nada funciona aqui".
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { CounterpartyRepository } from '@/features/accounting/repositories/CounterpartyRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { deletedCounterpartyName } from '@/features/accounting/models/Counterparty.model';

const UNIT = 'unit-cp';
const UNIT_OUTRA = 'unit-cp-outra';
const DONO_A = 'u-cp-a';
const DONO_B = 'u-cp-b';

const escopo = (userId: string, unitId: string = UNIT): AccountingScope =>
  resolveAccountingScope({ userId }, unitId);

const repo = new CounterpartyRepository();

/** Cria direto pelo repositório (sem passar pela regra de negócio) e devolve a linha. */
const criar = (userId: string, unitId: string, name: string, type = 'SUPPLIER') =>
  repo.create({ userId, unitId, type, name, ref: null, createdById: userId });

describe('CounterpartyRepository — contrato em SQLite real (subfila ratificada, unidade 2/4)', () => {
  beforeAll(async () => {
    pushTestSchema();
    for (const id of [DONO_A, DONO_B]) {
      await prisma.user.create({
        data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' },
      });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ controle do harness
  // Sem este caso, TODO negativo abaixo passaria por vacuidade: um repositório que nunca escreve
  // e sempre devolve null satisfaz `toBeNull()`, `rejects` e `toHaveLength(0)` de uma vez.
  it('CONTROLE: create grava e findById devolve a linha dentro do próprio escopo', async () => {
    const criada = await criar(DONO_A, UNIT, 'ACME Distribuidora');

    const lida = await repo.findById(escopo(DONO_A), criada.id);
    expect(lida).not.toBeNull();
    expect(lida!.name).toBe('ACME Distribuidora');
    expect(lida!.userId).toBe(DONO_A);
    expect(lida!.unitId).toBe(UNIT);
  });

  // ------------------------------------------------------------------ inquilino (leitura)
  /**
   * `findById` é o resolvedor ESCOPADO que os caminhos de criação de AP/AR chamam para re-escopar um
   * `counterpartyId` vindo do corpo da requisição (SEC-A1-1) — o DTO não conhece o escopo, então é
   * este filtro, e só ele, que prova que a contraparte é deste inquilino. Removido
   * `accountingScopeWhere(scope)`, o dono B pendura o próprio título a pagar na contraparte do dono A.
   *
   * As DUAS metades do escopo têm caso próprio: `userId` (a fronteira de segurança) e `unitId`
   * (a sub-partição). Um filtro que casse só por `userId` passaria num teste de um eixo só.
   */
  it('inquilino: findById não alcança linha de outro dono NEM de outra unidade — com controle positivo', async () => {
    const doA = await criar(DONO_A, UNIT, 'Fornecedor Exclusivo de A');

    expect(await repo.findById(escopo(DONO_B), doA.id)).toBeNull(); // outro userId
    expect(await repo.findById(escopo(DONO_A, UNIT_OUTRA), doA.id)).toBeNull(); // outra unidade
    // Controle: sem ele, um findById quebrado para todo mundo satisfaria os dois toBeNull acima.
    expect(await repo.findById(escopo(DONO_A), doA.id)).not.toBeNull();
  });

  it('inquilino: findManyByUnit devolve só o próprio escopo, com o do vizinho presente na base', async () => {
    await criar(DONO_A, UNIT, 'Lista A');
    await criar(DONO_B, UNIT, 'Lista B');
    await criar(DONO_A, UNIT_OUTRA, 'Lista A outra unidade');

    const deA = await repo.findManyByUnit(escopo(DONO_A), { includeArchived: true });
    expect(deA.every((c) => c.userId === DONO_A && c.unitId === UNIT)).toBe(true);
    expect(deA.map((c) => c.name)).toContain('Lista A');
    expect(deA.map((c) => c.name)).not.toContain('Lista B');
    expect(deA.map((c) => c.name)).not.toContain('Lista A outra unidade');
    // Controle de não-vacuidade: as três linhas EXISTEM na base — o filtro é que as separa.
    expect(await prisma.counterparty.count()).toBeGreaterThanOrEqual(3);
  });

  // ------------------------------------------------------------------ inquilino (escrita)
  /**
   * O caso de leitura acima não cobre a ESCRITA: `update` monta o próprio where a partir de
   * `accountingScopeWhere` em vez de reusar o findById. É uma segunda cópia do filtro, e por isso um
   * segundo sítio onde ele pode sumir sozinho — a escrita cross-tenant é o dano maior dos dois.
   */
  it('inquilino: update de outro dono não escreve — e a linha do dono original fica intacta', async () => {
    const doA = await criar(DONO_A, UNIT, 'Intocável de A');

    await expect(
      repo.update(escopo(DONO_B), doA.id, { name: 'sequestrada por B' }),
    ).rejects.toThrow();

    const naBase = await prisma.counterparty.findUnique({ where: { id: doA.id } });
    expect(naBase!.name).toBe('Intocável de A');
    // Controle: o MESMO update, pelo dono certo, funciona — o rejects acima é da guarda, não de pane.
    const renomeada = await repo.update(escopo(DONO_A), doA.id, { name: 'renomeada por A' });
    expect(renomeada.name).toBe('renomeada por A');
  });

  // ------------------------------------------------------------------ tx
  /**
   * ATOMICIDADE REAL — a classe `tx-nao-propagado-ao-repo` registrada na memória do projeto.
   * `runTransaction` abre a tx; se `create` ignorar o handle recebido e escrever pelo cliente
   * ambiente (`prisma` em vez de `tx ?? prisma`), a linha sobrevive ao rollback: tx aparente.
   *
   * LIMITE MEDIDO DESTE CASO, declarado em vez de vendido como precisão que ele não tem: em base
   * real com a tx segurando o lock de escrita, a perna escrita FORA da tx normalmente não vaza em
   * silêncio — ela TRAVA contra o lock da própria transação e o caso reprova por erro/timeout, não
   * pela contagem de linhas. As duas saídas reprovam, que é o que a barreira precisa garantir; o
   * que este teste NÃO promete é *qual* das duas você vai ver.
   */
  it('tx: rollback de runTransaction não deixa contraparte órfã — com controle de commit', async () => {
    const antes = await prisma.counterparty.count({ where: { userId: DONO_A, unitId: UNIT } });

    await expect(
      repo.runTransaction(async (tx) => {
        await repo.create(
          { userId: DONO_A, unitId: UNIT, type: 'SUPPLIER', name: 'Vai Abortar', ref: null, createdById: DONO_A },
          tx,
        );
        throw new Error('aborta a tx DEPOIS da escrita');
      }),
    ).rejects.toThrow('aborta a tx DEPOIS da escrita');

    expect(await prisma.counterparty.count({ where: { userId: DONO_A, unitId: UNIT } })).toBe(antes);
    expect(await prisma.counterparty.findFirst({ where: { name: 'Vai Abortar' } })).toBeNull();

    // Controle: a MESMA escrita, com a tx completando, persiste. Sem ele, um create quebrado
    // (que nunca grava nada) satisfaria a contagem acima e o teste chamaria pane de atomicidade.
    const comitada = await repo.runTransaction((tx) =>
      repo.create(
        { userId: DONO_A, unitId: UNIT, type: 'SUPPLIER', name: 'Vai Comitar', ref: null, createdById: DONO_A },
        tx,
      ),
    );
    expect(await prisma.counterparty.findUnique({ where: { id: comitada.id } })).not.toBeNull();
  });

  /**
   * O outro lado da propagação: a LEITURA feita com o handle da tx enxerga a escrita ainda não
   * comitada. É o que sustenta o gate re-checado dentro do `runTransaction` (server/CLAUDE.md §5):
   * se `findById` ignorasse o `tx`, o gate leria o estado velho e decidiria sobre ele.
   */
  it('tx: findById com o handle da tx enxerga a escrita in-tx (gate dentro da tx é legível)', async () => {
    const visto = await repo.runTransaction(async (tx) => {
      const criada = await repo.create(
        { userId: DONO_A, unitId: UNIT, type: 'CUSTOMER', name: 'Visível In-Tx', ref: null, createdById: DONO_A },
        tx,
      );
      return repo.findById(escopo(DONO_A), criada.id, tx);
    });
    expect(visto).not.toBeNull();
    expect(visto!.name).toBe('Visível In-Tx');
  });

  // ------------------------------------------------------------------ softdelete
  it('softdelete: linha arquivada some de findById e da listagem padrão, e volta com includeArchived', async () => {
    const arquivada = await criar(DONO_A, UNIT, 'Arquivada Sumida');
    await prisma.counterparty.update({ where: { id: arquivada.id }, data: { deletedAt: new Date() } });

    expect(await repo.findById(escopo(DONO_A), arquivada.id)).toBeNull();

    const padrao = await repo.findManyByUnit(escopo(DONO_A), { includeArchived: false });
    expect(padrao.map((c) => c.id)).not.toContain(arquivada.id);
    // Controle: a linha continua NA BASE — é o filtro que a esconde, não um delete de verdade.
    const comArquivadas = await repo.findManyByUnit(escopo(DONO_A), { includeArchived: true });
    expect(comArquivadas.map((c) => c.id)).toContain(arquivada.id);
  });

  /**
   * `@@unique([userId, unitId, type, name])` COBRE A LINHA SOFT-DELETADA — classe de bug registrada
   * (`unique-de-idempotencia-x-soft-delete`): arquivar sem liberar a chave transforma
   * arquivar→recriar-com-o-mesmo-nome em P2002. Duas metades, e a primeira é o controle da segunda:
   *   (a) arquivar SÓ com deletedAt deixa a chave ocupada — o re-create colide de verdade;
   *   (b) o arquivamento do serviço renomeia na MESMA tx (SEC-A1-4) e por isso libera a chave.
   * Sem (a), (b) passaria mesmo que o unique não cobrisse tumbas — e o teste estaria provando nada.
   */
  it('softdelete × @@unique: tumba ocupa a chave (a) e a renomeação do arquivamento a libera (b)', async () => {
    // (a) tumba SEM renomear → o nome continua ocupado
    const tumba = await criar(DONO_A, UNIT, 'Chave Disputada', 'CUSTOMER');
    await prisma.counterparty.update({ where: { id: tumba.id }, data: { deletedAt: new Date() } });
    await expect(criar(DONO_A, UNIT, 'Chave Disputada', 'CUSTOMER')).rejects.toMatchObject({ code: 'P2002' });

    // (b) arquivamento de verdade, pelo serviço: deletedAt + rename-on-key na mesma tx
    await prisma.counterparty.update({
      where: { id: tumba.id },
      data: { name: deletedCounterpartyName(tumba.id, 'Chave Disputada') },
    });
    const recriada = await criar(DONO_A, UNIT, 'Chave Disputada', 'CUSTOMER');
    expect(recriada.id).not.toBe(tumba.id);
    expect(recriada.deletedAt).toBeNull();
  });

  /**
   * Costura fim-a-fim das três invariantes de uma vez, pelo serviço vindo do FACTORY (Contrato §2/§3
   * — a fiação, não a classe à mão): arquivar renomeia + marca deletedAt + grava a auditoria NA MESMA
   * tx, e o nome volta a ser usável. É o caminho que a produção roda.
   */
  it('serviço pelo factory: archive libera o nome e a trilha de auditoria vai junto, na mesma tx', async () => {
    const service = getFactory().getCounterpartyService();
    const scope = escopo(DONO_A);

    const criada = await service.createCounterparty(scope, { unitId: UNIT, type: 'SUPPLIER', name: 'Ciclo Completo' });
    const arquivada = await service.archiveCounterparty(scope, criada.id, { unitId: UNIT });

    expect(arquivada.deletedAt).not.toBeNull();
    expect(arquivada.name).toBe(deletedCounterpartyName(criada.id, 'Ciclo Completo'));

    // O nome original está livre: recriar não colide (era o P2002 da classe registrada).
    const recriada = await service.createCounterparty(scope, { unitId: UNIT, type: 'SUPPLIER', name: 'Ciclo Completo' });
    expect(recriada.id).not.toBe(criada.id);

    // A trilha registra os dois eventos do ciclo — auditoria e escrita comitaram juntas (T8).
    const eventos = await prisma.auditEvent.findMany({
      where: { scopeUserId: DONO_A, unitId: UNIT, targetId: criada.id },
      orderBy: { seq: 'asc' },
    });
    expect(eventos.map((e) => e.eventType)).toEqual(['counterparty.created', 'counterparty.archived']);
  });
});
