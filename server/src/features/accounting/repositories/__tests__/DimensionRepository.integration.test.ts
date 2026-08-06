/**
 * CONTRATO DO DimensionRepository — integração contra SQLite REAL, sem mock de prisma.
 *
 * Unidade 3 de 4 da subfila ratificada em `docs/audit/TRIAGEM-R1-R3.json`
 * (`r2_decision.ratified_subqueue`), órfã desde d11b4716. Invariantes nomeadas: **tx + inquilino +
 * softdelete** — as três com caso próprio abaixo, e cada negativo com o seu controle positivo.
 *
 * POR QUE INTEGRAÇÃO. A suíte unit faz `jest.mock` de `lib/prisma` e afirma o mock; foi isso que
 * deixou M3 (perna fora da tx) e M5 (filtro de inquilino) do AV-R3 sobreviverem SEM SEREM EXECUTADAS.
 * Rollback e vazamento entre inquilinos não existem sem base real e sem dois donos nela.
 *
 * TRÊS SUPERFÍCIES, NÃO UMA. O repositório governa definições (eixos), valores (nós do eixo) e a
 * ponte posting↔valor. Cada uma repete o `accountingScopeWhere` por conta própria — são três cópias
 * do filtro, logo três sítios onde ele pode sumir sozinho, e a ponte é a que ninguém olha.
 *
 * ASSIMETRIA MEDIDA, NÃO SUPOSTA (ver o caso `softdelete: ...ponto a ponto`): `findDefinitionById` e
 * `findValueById` NÃO filtram `deletedAt` — o filtro vive nas listagens e nas contagens. Isso é
 * deliberado e o serviço depende disso (`archiveDefinition`/`archiveValue` leem por id e devolvem a
 * linha arquivada para serem idempotentes); um teste que exigisse `null` ali estaria inventando um
 * contrato que o código não tem.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { DimensionRepository } from '@/features/accounting/repositories/DimensionRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import {
  DIMENSION_DEFINITION_ARCHIVED,
  DIMENSION_DEFINITION_CREATED,
} from '@/features/accounting/models/Dimension.model';

const UNIT = 'unit-dimrepo';
const UNIT_OUTRA = 'unit-dimrepo-outra';
const DONO_A = 'u-dimrepo-a';
const DONO_B = 'u-dimrepo-b';

const escopo = (userId: string, unitId: string = UNIT): AccountingScope =>
  resolveAccountingScope({ userId }, unitId);

const repo = new DimensionRepository();

const criarEixo = (userId: string, unitId: string, code: string) =>
  repo.createDefinition({ userId, unitId, code, name: `Eixo ${code}`, status: 'ACTIVE', createdById: userId });

const criarValor = (userId: string, unitId: string, definitionId: string, code: string, parentId: string | null = null) =>
  repo.createValue({ userId, unitId, definitionId, code, name: `Valor ${code}`, parentId, status: 'ACTIVE', createdById: userId });

/** Marca a linha como arquivada por fora do repositório — o teste arranja o estado, não o produz. */
const arquivarDefinicaoNaBase = (id: string) =>
  prisma.dimensionDefinition.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: new Date() } });
const arquivarValorNaBase = (id: string) =>
  prisma.dimensionValue.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: new Date() } });

/** Uma perna de lançamento real (conta + lançamento + partida) para a ponte pendurar. */
async function criarPerna(userId: string, unitId: string, sufixo: string): Promise<string> {
  const conta = await prisma.account.create({
    data: { userId, unitId, code: `4.${sufixo}`, name: 'Despesas', nature: 'Expense', acceptsEntries: true },
  });
  const lancamento = await prisma.journalEntry.create({
    data: { userId, unitId, date: new Date('2026-06-15T00:00:00.000Z'), description: `perna ${sufixo}`, status: 'Posted' },
  });
  const partida = await prisma.posting.create({
    data: { userId, unitId, entryId: lancamento.id, accountId: conta.id, debitCents: 1000, creditCents: 0 },
  });
  return partida.id;
}

describe('DimensionRepository — contrato em SQLite real (subfila ratificada, unidade 3/4)', () => {
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
  // Sem este caso, TODO negativo abaixo passaria por vacuidade: um repositório que nunca escreve e
  // sempre devolve null/0/[] satisfaz de uma vez `toBeNull`, `toBe(0)`, `toHaveLength(0)` e `rejects`.
  it('CONTROLE: createDefinition/createValue gravam e as leituras por id devolvem no próprio escopo', async () => {
    const eixo = await criarEixo(DONO_A, UNIT, 'CONTROLE');
    const valor = await criarValor(DONO_A, UNIT, eixo.id, 'V1');

    expect((await repo.findDefinitionById(escopo(DONO_A), eixo.id))!.code).toBe('CONTROLE');
    expect((await repo.findValueById(escopo(DONO_A), valor.id))!.definitionId).toBe(eixo.id);
    expect(await repo.countActiveValues(escopo(DONO_A), eixo.id)).toBe(1);
  });

  // ------------------------------------------------------------------ inquilino
  /**
   * As DUAS metades do escopo, em caso separado: `userId` é a fronteira de segurança, `unitId` é a
   * sub-partição. Um filtro que casse só por `userId` passaria num teste de um eixo só.
   */
  it('inquilino: leituras por id não alcançam outro dono NEM outra unidade — com controle positivo', async () => {
    const eixo = await criarEixo(DONO_A, UNIT, 'SO_DE_A');
    const valor = await criarValor(DONO_A, UNIT, eixo.id, 'V_A');

    expect(await repo.findDefinitionById(escopo(DONO_B), eixo.id)).toBeNull();
    expect(await repo.findDefinitionById(escopo(DONO_A, UNIT_OUTRA), eixo.id)).toBeNull();
    expect(await repo.findValueById(escopo(DONO_B), valor.id)).toBeNull();
    expect(await repo.findValueById(escopo(DONO_A, UNIT_OUTRA), valor.id)).toBeNull();
    // Controle: sem ele, leituras quebradas para todo mundo satisfariam os quatro toBeNull acima.
    expect(await repo.findDefinitionById(escopo(DONO_A), eixo.id)).not.toBeNull();
    expect(await repo.findValueById(escopo(DONO_A), valor.id)).not.toBeNull();
  });

  it('inquilino: listagens e contagens só enxergam o próprio escopo, com o do vizinho na base', async () => {
    const eixoA = await criarEixo(DONO_A, UNIT, 'LISTA_A');
    const eixoB = await criarEixo(DONO_B, UNIT, 'LISTA_B');
    await criarValor(DONO_A, UNIT, eixoA.id, 'VA1');
    await criarValor(DONO_B, UNIT, eixoB.id, 'VB1');

    const defsDeA = await repo.findManyDefinitions(escopo(DONO_A), { includeArchived: true });
    expect(defsDeA.every((d) => d.userId === DONO_A && d.unitId === UNIT)).toBe(true);
    expect(defsDeA.map((d) => d.code)).toContain('LISTA_A');
    expect(defsDeA.map((d) => d.code)).not.toContain('LISTA_B');

    const valoresDeA = await repo.findManyValues(escopo(DONO_A), { includeArchived: true });
    expect(valoresDeA.every((v) => v.userId === DONO_A)).toBe(true);

    // A contagem é o gate de arquivamento do serviço: sob escopo alheio ela tem de ver ZERO, senão
    // o dono B bloqueia (ou libera) o arquivamento de um eixo do dono A.
    expect(await repo.countActiveValues(escopo(DONO_B), eixoA.id)).toBe(0);
    expect(await repo.countActiveValues(escopo(DONO_A), eixoA.id)).toBe(1); // controle

    // Não-vacuidade: as linhas do vizinho EXISTEM — é o filtro que as separa.
    expect(await prisma.dimensionDefinition.count()).toBeGreaterThanOrEqual(2);
  });

  /**
   * ESCRITA cross-tenant: `updateDefinition`/`updateValue` montam o próprio where a partir de
   * `accountingScopeWhere` em vez de reusar as leituras — segunda cópia do filtro, segundo sítio de
   * falha, e o dano maior dos dois (arquivar o eixo alheio some com a etiquetagem dele).
   */
  it('inquilino: update de outro dono não escreve — e a linha do dono original fica intacta', async () => {
    const eixo = await criarEixo(DONO_A, UNIT, 'INTOCAVEL');
    const valor = await criarValor(DONO_A, UNIT, eixo.id, 'V_INTOCAVEL');

    await expect(
      repo.updateDefinition(escopo(DONO_B), eixo.id, { status: 'ARCHIVED', deletedAt: new Date() }),
    ).rejects.toThrow();
    await expect(
      repo.updateValue(escopo(DONO_B), valor.id, { status: 'ARCHIVED', deletedAt: new Date() }),
    ).rejects.toThrow();

    expect((await prisma.dimensionDefinition.findUnique({ where: { id: eixo.id } }))!.status).toBe('ACTIVE');
    expect((await prisma.dimensionValue.findUnique({ where: { id: valor.id } }))!.status).toBe('ACTIVE');
    // Controle: o MESMO update, pelo dono certo, funciona — o rejects acima é da guarda, não de pane.
    expect((await repo.updateDefinition(escopo(DONO_A), eixo.id, { name: 'renomeado por A' })).name).toBe('renomeado por A');
  });

  /**
   * A PONTE posting↔valor é a superfície que ninguém olha: ela é escrita dentro da tx do
   * `postEntry` e lida pelos relatórios por dimensão. Sem filtro de escopo, o relatório do dono B
   * soma as etiquetas das pernas do dono A — vazamento de dado financeiro por via de metadado.
   */
  it('inquilino: findPostingDimensions da ponte não devolve etiqueta de outro dono', async () => {
    const eixoA = await criarEixo(DONO_A, UNIT, 'PONTE_A');
    const valorA = await criarValor(DONO_A, UNIT, eixoA.id, 'VP_A');
    const partidaA = await criarPerna(DONO_A, UNIT, 'ponte-a');
    await repo.createPostingDimension({
      userId: DONO_A, unitId: UNIT, postingId: partidaA, definitionId: eixoA.id, valueId: valorA.id,
    });

    expect(await repo.findPostingDimensions(escopo(DONO_B), partidaA)).toHaveLength(0);
    expect(await repo.findPostingDimensions(escopo(DONO_A, UNIT_OUTRA), partidaA)).toHaveLength(0);
    // Controle: sem ele, uma leitura quebrada para todo mundo satisfaria os dois toHaveLength(0).
    expect(await repo.findPostingDimensions(escopo(DONO_A), partidaA)).toHaveLength(1);
  });

  // ------------------------------------------------------------------ tx
  /**
   * ATOMICIDADE REAL — a classe `tx-nao-propagado-ao-repo` registrada na memória do projeto. Se
   * `createDefinition`/`createValue` ignorarem o handle recebido e escreverem pelo cliente ambiente
   * (`prisma` em vez de `tx ?? prisma`), as linhas sobrevivem ao rollback: tx aparente.
   *
   * LIMITE MEDIDO, declarado em vez de vendido como precisão que o caso não tem: com a tx segurando
   * o lock de escrita da base real, a escrita fora da tx normalmente TRAVA contra esse lock e o caso
   * reprova por erro/timeout (medido: ~5000 ms), não pela contagem de linhas. As duas saídas
   * reprovam — o que este teste NÃO promete é *qual* das duas você vai ver.
   */
  it('tx: rollback de runTransaction não deixa eixo nem valor órfão — com controle de commit', async () => {
    const defsAntes = await prisma.dimensionDefinition.count({ where: { userId: DONO_A, unitId: UNIT } });
    const valoresAntes = await prisma.dimensionValue.count({ where: { userId: DONO_A, unitId: UNIT } });

    await expect(
      repo.runTransaction(async (tx) => {
        const eixo = await repo.createDefinition(
          { userId: DONO_A, unitId: UNIT, code: 'VAI_ABORTAR', name: 'x', status: 'ACTIVE', createdById: DONO_A },
          tx,
        );
        await repo.createValue(
          { userId: DONO_A, unitId: UNIT, definitionId: eixo.id, code: 'VAL_ABORTA', name: 'x', parentId: null, status: 'ACTIVE', createdById: DONO_A },
          tx,
        );
        throw new Error('aborta a tx DEPOIS das duas escritas');
      }),
    ).rejects.toThrow('aborta a tx DEPOIS das duas escritas');

    expect(await prisma.dimensionDefinition.count({ where: { userId: DONO_A, unitId: UNIT } })).toBe(defsAntes);
    expect(await prisma.dimensionValue.count({ where: { userId: DONO_A, unitId: UNIT } })).toBe(valoresAntes);
    expect(await prisma.dimensionDefinition.findFirst({ where: { code: 'VAI_ABORTAR' } })).toBeNull();

    // Controle: a MESMA escrita, comitando, persiste. Sem ele, um create quebrado (que nunca grava)
    // satisfaria as contagens acima e o teste chamaria pane de atomicidade.
    const comitado = await repo.runTransaction((tx) =>
      repo.createDefinition(
        { userId: DONO_A, unitId: UNIT, code: 'VAI_COMITAR', name: 'x', status: 'ACTIVE', createdById: DONO_A },
        tx,
      ),
    );
    expect(await prisma.dimensionDefinition.findUnique({ where: { id: comitado.id } })).not.toBeNull();
  });

  /**
   * O outro lado da propagação: leituras e CONTAGENS feitas com o handle da tx enxergam a escrita
   * ainda não comitada. É o que sustentaria mover o gate de arquivamento para dentro da tx (o
   * caminho de upgrade que `DimensionService.archiveDefinition` deixa anotado): se `countActiveValues`
   * ignorasse o `tx`, o gate contaria o estado velho e decidiria sobre ele.
   */
  it('tx: leitura e contagem com o handle da tx enxergam a escrita in-tx', async () => {
    const { visto, contagem } = await repo.runTransaction(async (tx) => {
      const eixo = await repo.createDefinition(
        { userId: DONO_A, unitId: UNIT, code: 'IN_TX', name: 'x', status: 'ACTIVE', createdById: DONO_A },
        tx,
      );
      await repo.createValue(
        { userId: DONO_A, unitId: UNIT, definitionId: eixo.id, code: 'V_IN_TX', name: 'x', parentId: null, status: 'ACTIVE', createdById: DONO_A },
        tx,
      );
      return {
        visto: await repo.findDefinitionById(escopo(DONO_A), eixo.id, tx),
        contagem: await repo.countActiveValues(escopo(DONO_A), eixo.id, tx),
      };
    });
    expect(visto!.code).toBe('IN_TX');
    expect(contagem).toBe(1);
  });

  // ------------------------------------------------------------------ softdelete
  it('softdelete: arquivado some das listagens padrão e das contagens, e volta com includeArchived', async () => {
    const eixo = await criarEixo(DONO_A, UNIT, 'ARQUIVAVEL');
    const ativo = await criarValor(DONO_A, UNIT, eixo.id, 'ATIVO');
    const arquivado = await criarValor(DONO_A, UNIT, eixo.id, 'ARQUIVADO');
    const filho = await criarValor(DONO_A, UNIT, eixo.id, 'FILHO', ativo.id);

    expect(await repo.countActiveValues(escopo(DONO_A), eixo.id)).toBe(3); // controle: antes
    expect(await repo.countActiveChildren(escopo(DONO_A), ativo.id)).toBe(1); // controle: antes

    await arquivarValorNaBase(arquivado.id);
    await arquivarValorNaBase(filho.id);

    // As contagens são os GATES de arquivamento do serviço: se elas enxergarem linha arquivada, o
    // operador nunca consegue esvaziar um eixo — o eixo fica preso pelos próprios fantasmas.
    expect(await repo.countActiveValues(escopo(DONO_A), eixo.id)).toBe(1);
    expect(await repo.countActiveChildren(escopo(DONO_A), ativo.id)).toBe(0);

    const padrao = await repo.findManyValues(escopo(DONO_A), { definitionId: eixo.id, includeArchived: false });
    expect(padrao.map((v) => v.code)).toEqual(['ATIVO']);
    // Controle: as linhas continuam NA BASE — é o filtro que as esconde, não um delete de verdade.
    const comArquivados = await repo.findManyValues(escopo(DONO_A), { definitionId: eixo.id, includeArchived: true });
    expect(comArquivados.map((v) => v.code).sort()).toEqual(['ARQUIVADO', 'ATIVO', 'FILHO']);

    await arquivarDefinicaoNaBase(eixo.id);
    const eixosPadrao = await repo.findManyDefinitions(escopo(DONO_A), { includeArchived: false });
    expect(eixosPadrao.map((d) => d.code)).not.toContain('ARQUIVAVEL');
    const eixosTodos = await repo.findManyDefinitions(escopo(DONO_A), { includeArchived: true });
    expect(eixosTodos.map((d) => d.code)).toContain('ARQUIVAVEL');
  });

  /**
   * CARACTERIZAÇÃO, não aspiração: a leitura PONTO A PONTO enxerga a linha arquivada de propósito, e
   * o serviço depende disso — `archiveDefinition`/`archiveValue` leem por id e devolvem a linha
   * arquivada para serem idempotentes; `createValue` lê o eixo por id justamente para recusar valor
   * novo em eixo arquivado. Se alguém "consertar" isto acrescentando `deletedAt: null` às leituras
   * por id, é este caso que reprova — e a idempotência do arquivamento vira 404.
   */
  it('softdelete: leitura por id ENXERGA o arquivado (o filtro vive na listagem) — e o serviço conta com isso', async () => {
    const service = getFactory().getDimensionService();
    const scope = escopo(DONO_A);

    const eixo = await service.createDefinition(scope, { unitId: UNIT, code: 'IDEMPOTENTE', name: 'Eixo' });
    const arquivado = await service.archiveDefinition(scope, eixo.id, { unitId: UNIT });
    expect(arquivado.deletedAt).not.toBeNull();

    // A leitura por id ainda alcança: é o que faz o segundo arquivamento ser no-op em vez de 404.
    expect(await repo.findDefinitionById(scope, eixo.id)).not.toBeNull();
    const denovo = await service.archiveDefinition(scope, eixo.id, { unitId: UNIT });
    expect(denovo.id).toBe(eixo.id);
    expect(denovo.status).toBe('ARCHIVED');

    // E a auditoria registra UM arquivamento, não dois — a segunda chamada não escreveu nada.
    const eventos = await prisma.auditEvent.findMany({
      where: { scopeUserId: DONO_A, unitId: UNIT, targetId: eixo.id },
      orderBy: { seq: 'asc' },
    });
    expect(eventos.map((e) => e.eventType)).toEqual([
      DIMENSION_DEFINITION_CREATED,
      DIMENSION_DEFINITION_ARCHIVED,
    ]);
  });
});
