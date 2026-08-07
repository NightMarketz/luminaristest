/**
 * CONTRATO DO ReferentialMappingRepository — integração contra SQLite REAL, sem mock de prisma.
 *
 * Unidade 4 de 4 da subfila ratificada em `docs/audit/TRIAGEM-R1-R3.json`
 * (`r2_decision.ratified_subqueue`), órfã desde d11b4716.
 *
 * POR QUE INTEGRAÇÃO. A suíte unit faz `jest.mock` de `lib/prisma` e afirma o mock; foi isso que
 * deixou M3 (perna fora da tx) e M5 (filtro de inquilino) do AV-R3 sobreviverem SEM SEREM
 * EXECUTADAS. Rollback só existe com tx de verdade; vazamento entre inquilinos só existe com DOIS
 * donos na mesma base.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * UMA CORREÇÃO DE ROTULAGEM, MEDIDA NO SCHEMA — leia antes de procurar aqui o caso que não existe.
 *
 * A subfila rotula esta unidade com as mesmas três invariantes das outras duas:
 * **tx + inquilino + softdelete**. As duas primeiras são reais e têm caso próprio abaixo. A
 * terceira NÃO se aplica a esta tabela, e isso é decisão de projeto, não lacuna:
 *   · `model ReferentialMapping` (prisma/schema.prisma) não tem coluna `deletedAt`;
 *   · `IReferentialMappingRepository` declara "No soft-delete (D5) — unset is a real delete;
 *     the change trail lives in AuditEvent";
 *   · `deleteByAccountVersion` é `deleteMany`, não um update de `deletedAt`.
 * O rótulo veio do classificador do AV-R2, que casa por forma de símbolo, não por schema.
 * Escrever aqui um caso de soft-delete da própria linha seria inventar um contrato que o código
 * não tem — o erro exato que o item 4 da triagem já pagou uma vez.
 *
 * O que este arquivo faz no lugar, e que é a leitura FORTE do mesmo risco:
 *   (a) trava a característica em si — o unset é delete DE VERDADE, e é justamente por isso que a
 *       classe registrada `unique-de-idempotencia-x-soft-delete` não morde aqui: sem tumba, a
 *       `@@unique` fica livre e unset→re-set funciona em vez de morrer em P2002. Se alguém
 *       "melhorar" isto para soft-delete sem mexer no upsert, é este caso que reprova — e a
 *       reprovação é a mensagem, porque esse é exatamente o P2002 da classe;
 *   (b) trava o soft-delete que esta unidade REALMENTE consome: a liveness da CONTA, re-checada
 *       DENTRO da tx (ACC-011). `applySet` relê a conta com o handle da tx e `AccountRepository
 *       .findById` filtra `deletedAt: null` — mapear conta arquivada tem de falhar.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * CATÁLOGO RFB AUSENTE DE PROPÓSITO. Sem `ReferentialAccount` importado para a versão,
 * `resolveDestinationLabel` devolve null e vale o comportamento de string livre do INCR-9 (I052 —
 * nunca inventar o leiaute). É o caminho que exercita o repositório sem arrastar a Track B junto.
 *
 * CADA CASO NEGATIVO TEM O SEU CONTROLE. Um teste que espera `null`/0/erro passa também quando
 * tudo está quebrado; o par positivo/negativo é o que separa "a guarda mordeu" de "nada funciona".
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { ReferentialMappingRepository } from '@/features/accounting/repositories/ReferentialMappingRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { NotFoundError } from '@/lib/errors';

const UNIT = 'unit-refmap';
const UNIT_OUTRA = 'unit-refmap-outra';
const DONO_A = 'u-refmap-a';
const DONO_B = 'u-refmap-b';
const V2025 = '2025';
const V2026 = '2026';

const escopo = (userId: string, unitId: string = UNIT): AccountingScope =>
  resolveAccountingScope({ userId }, unitId);

const repo = new ReferentialMappingRepository();

/** Conta-folha (acceptsEntries) — o único destino válido de mapeamento. */
let contaSeq = 0;
const criarConta = (userId: string, unitId: string, opts: { acceptsEntries?: boolean } = {}) =>
  prisma.account.create({
    data: {
      userId,
      unitId,
      code: `4.${(contaSeq += 1)}`,
      name: `Conta ${contaSeq}`,
      nature: 'Expense',
      acceptsEntries: opts.acceptsEntries ?? true,
    },
  });

const mapear = (
  scope: AccountingScope,
  accountId: string,
  referentialCode: string,
  mappingVersion = V2025,
) =>
  repo.upsert(scope, {
    accountId,
    referentialCode,
    label: `Referencial ${referentialCode}`,
    mappingVersion,
    createdById: scope.actorUserId,
  });

describe('ReferentialMappingRepository — contrato em SQLite real (subfila ratificada, unidade 4/4)', () => {
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
  it('CONTROLE: upsert grava e as leituras devolvem a linha dentro do próprio escopo', async () => {
    const conta = await criarConta(DONO_A, UNIT);
    const criado = await mapear(escopo(DONO_A), conta.id, '1.01.01.01.00');

    const lido = await repo.findByAccountAndVersion(escopo(DONO_A), conta.id, V2025);
    expect(lido).not.toBeNull();
    expect(lido!.id).toBe(criado.id);
    expect(lido!.referentialCode).toBe('1.01.01.01.00');
    expect(lido!.userId).toBe(DONO_A);
    expect(lido!.unitId).toBe(UNIT);
  });

  /**
   * IDEMPOTÊNCIA pela `@@unique([userId, unitId, accountId, mappingVersion])`: re-setar a mesma
   * conta/versão ATUALIZA no lugar (código e rótulo novos, mesma identidade) em vez de duplicar ou
   * colidir. E a versão faz parte da chave: 2026 é linha nova, não sobrescreve 2025 — é o que
   * sustenta o `copyVersion` ("herança de ano") não destruir o de-para do ano anterior.
   */
  it('CONTROLE: re-set atualiza no lugar (mesma identidade) e outra versão é linha NOVA', async () => {
    const conta = await criarConta(DONO_A, UNIT);
    const primeiro = await mapear(escopo(DONO_A), conta.id, '1.01.01.01.00');
    const resetado = await mapear(escopo(DONO_A), conta.id, '1.02.02.02.00');

    expect(resetado.id).toBe(primeiro.id); // update-in-place, não linha nova
    expect(resetado.referentialCode).toBe('1.02.02.02.00');

    const outraVersao = await mapear(escopo(DONO_A), conta.id, '9.99.99.99.99', V2026);
    expect(outraVersao.id).not.toBe(primeiro.id);
    // A versão anterior sobreviveu intacta — as duas coexistem.
    expect(
      (await repo.findByAccountAndVersion(escopo(DONO_A), conta.id, V2025))!.referentialCode,
    ).toBe('1.02.02.02.00');
  });

  // ------------------------------------------------------------------ inquilino (leitura)
  /**
   * As DUAS metades do escopo, em caso separado: `userId` é a fronteira de segurança, `unitId` é a
   * sub-partição. Um filtro que casse só por `userId` passaria num teste de um eixo só.
   */
  it('inquilino: findByAccountAndVersion não alcança outro dono NEM outra unidade — com controle', async () => {
    const conta = await criarConta(DONO_A, UNIT);
    await mapear(escopo(DONO_A), conta.id, '3.01.00.00.00');

    expect(await repo.findByAccountAndVersion(escopo(DONO_B), conta.id, V2025)).toBeNull();
    expect(await repo.findByAccountAndVersion(escopo(DONO_A, UNIT_OUTRA), conta.id, V2025)).toBeNull();
    // Controle: sem ele, uma leitura quebrada para todo mundo satisfaria os dois toBeNull acima.
    expect(await repo.findByAccountAndVersion(escopo(DONO_A), conta.id, V2025)).not.toBeNull();
  });

  it('inquilino: findManyByVersion devolve só o próprio escopo, com o do vizinho na base', async () => {
    const contaA = await criarConta(DONO_A, UNIT);
    const contaB = await criarConta(DONO_B, UNIT);
    const contaOutraUnidade = await criarConta(DONO_A, UNIT_OUTRA);
    await mapear(escopo(DONO_A), contaA.id, '5.01.00.00.00');
    await mapear(escopo(DONO_B), contaB.id, '5.02.00.00.00');
    await mapear(escopo(DONO_A, UNIT_OUTRA), contaOutraUnidade.id, '5.03.00.00.00');

    const deA = await repo.findManyByVersion(escopo(DONO_A), V2025);
    expect(deA.every((m) => m.userId === DONO_A && m.unitId === UNIT)).toBe(true);
    const codigos = deA.map((m) => m.referentialCode);
    expect(codigos).toContain('5.01.00.00.00');
    expect(codigos).not.toContain('5.02.00.00.00'); // outro dono
    expect(codigos).not.toContain('5.03.00.00.00'); // outra unidade

    // Não-vacuidade: as três linhas EXISTEM na base — é o filtro que as separa.
    expect(await prisma.referentialMapping.count({ where: { mappingVersion: V2025 } })).toBeGreaterThanOrEqual(3);
  });

  /**
   * `findManyByVersion` é o universo do relatório de cobertura (`coverage`), que é o GATE de prontidão
   * para ECD. Vazamento aqui não é só leitura indevida: o de-para do vizinho contaria como cobertura
   * própria e o operador declararia pronto para ECD um plano que não está mapeado.
   */
  it('inquilino: a cobertura do dono B não conta o de-para do dono A como seu', async () => {
    const service = getFactory().getReferentialMappingService();
    const contaB = await criarConta(DONO_B, UNIT);
    const contaA = await criarConta(DONO_A, UNIT);
    await mapear(escopo(DONO_A), contaA.id, '7.07.00.00.00', V2026);

    const cobertura = await service.coverage(escopo(DONO_B), V2026);
    // A conta do B está sem mapeamento na versão — o de-para do A não pode preenchê-la.
    expect(cobertura.unmappedAccounts.map((u) => u.accountId)).toContain(contaB.id);
    expect(cobertura.ready).toBe(false);
    // Controle: mapeada pelo PRÓPRIO dono, a mesma conta sai da lista de pendências.
    await mapear(escopo(DONO_B), contaB.id, '7.08.00.00.00', V2026);
    const depois = await service.coverage(escopo(DONO_B), V2026);
    expect(depois.unmappedAccounts.map((u) => u.accountId)).not.toContain(contaB.id);
  });

  // ------------------------------------------------------------------ inquilino (escrita)
  /**
   * O DANO MAIOR da unidade, e a razão de a escrita ter caso próprio: `deleteByAccountVersion` monta
   * o where a partir de `accountingScopeWhere` por conta própria — segunda cópia do filtro, segundo
   * sítio onde ele pode sumir sozinho. Sem ele, o dono B APAGA o de-para do dono A: destrutivo,
   * silencioso (deleteMany não erra com 0 linhas) e sem tumba para recuperar, porque aqui o delete é
   * de verdade. A `@@unique` não protege nada disto — ela é chave, não filtro de leitura.
   */
  it('inquilino: delete de outro dono não apaga nada — a linha do dono original sobrevive', async () => {
    const conta = await criarConta(DONO_A, UNIT);
    const doA = await mapear(escopo(DONO_A), conta.id, '2.01.00.00.00');

    expect(await repo.deleteByAccountVersion(escopo(DONO_B), conta.id, V2025)).toBe(0);
    expect(await repo.deleteByAccountVersion(escopo(DONO_A, UNIT_OUTRA), conta.id, V2025)).toBe(0);
    expect(await prisma.referentialMapping.findUnique({ where: { id: doA.id } })).not.toBeNull();

    // Controle: o MESMO delete, pelo dono certo, apaga — o 0 acima é da guarda, não de pane.
    expect(await repo.deleteByAccountVersion(escopo(DONO_A), conta.id, V2025)).toBe(1);
    expect(await prisma.referentialMapping.findUnique({ where: { id: doA.id } })).toBeNull();
  });

  /**
   * O upsert cross-tenant tem forma DIFERENTE do delete e por isso caso próprio: o escopo entra na
   * própria chave composta, então o dono B não sequestra a linha do A — ele cria uma linha no
   * PRÓPRIO escopo. O invariante a travar é que a linha do A não é tocada; a asserção é sobre a
   * linha alheia, não sobre o retorno.
   */
  it('inquilino: upsert do dono B cria linha do B e NÃO sobrescreve a do dono A', async () => {
    const conta = await criarConta(DONO_A, UNIT);
    const doA = await mapear(escopo(DONO_A), conta.id, '6.01.00.00.00');

    const doB = await mapear(escopo(DONO_B), conta.id, 'CODIGO-DO-B');

    expect(doB.id).not.toBe(doA.id);
    expect(doB.userId).toBe(DONO_B);
    const aDepois = await prisma.referentialMapping.findUnique({ where: { id: doA.id } });
    expect(aDepois!.referentialCode).toBe('6.01.00.00.00');
    expect(aDepois!.userId).toBe(DONO_A);
  });

  // ------------------------------------------------------------------ tx
  /**
   * ATOMICIDADE REAL — a classe `tx-nao-propagado-ao-repo` registrada na memória do projeto. Se
   * `upsert`/`deleteByAccountVersion` ignorarem o handle recebido e usarem o cliente ambiente
   * (`prisma` em vez de `tx ?? prisma`), a escrita sobrevive ao rollback: tx aparente.
   *
   * LIMITE MEDIDO, declarado em vez de vendido como precisão que o caso não tem: com a tx segurando
   * o lock de escrita da base real, a escrita fora da tx normalmente TRAVA contra esse lock e o caso
   * reprova por erro/timeout, não pela contagem de linhas. As duas saídas reprovam — o que este
   * teste NÃO promete é *qual* das duas você vai ver.
   */
  it('tx: rollback de runTransaction não deixa mapeamento órfão — com controle de commit', async () => {
    const conta = await criarConta(DONO_A, UNIT);
    const antes = await prisma.referentialMapping.count({ where: { userId: DONO_A, unitId: UNIT } });

    await expect(
      repo.runTransaction(async (tx) => {
        await repo.upsert(
          escopo(DONO_A),
          {
            accountId: conta.id,
            referentialCode: 'VAI-ABORTAR',
            label: 'x',
            mappingVersion: V2025,
            createdById: DONO_A,
          },
          tx,
        );
        throw new Error('aborta a tx DEPOIS da escrita');
      }),
    ).rejects.toThrow('aborta a tx DEPOIS da escrita');

    expect(await prisma.referentialMapping.count({ where: { userId: DONO_A, unitId: UNIT } })).toBe(antes);
    expect(await prisma.referentialMapping.findFirst({ where: { referentialCode: 'VAI-ABORTAR' } })).toBeNull();

    // Controle: a MESMA escrita, comitando, persiste. Sem ele, um upsert quebrado (que nunca grava)
    // satisfaria a contagem acima e o teste chamaria pane de atomicidade.
    const comitado = await repo.runTransaction((tx) =>
      repo.upsert(
        escopo(DONO_A),
        {
          accountId: conta.id,
          referentialCode: 'VAI-COMITAR',
          label: 'x',
          mappingVersion: V2025,
          createdById: DONO_A,
        },
        tx,
      ),
    );
    expect(await prisma.referentialMapping.findUnique({ where: { id: comitado.id } })).not.toBeNull();
  });

  /**
   * O outro lado da propagação: a LEITURA feita com o handle da tx enxerga a escrita ainda não
   * comitada. Não é detalhe: `copyVersion` lê a versão de origem com o `tx` e `unsetMapping` relê o
   * existente com o `tx` antes de apagar. Se a leitura ignorasse o handle, os dois decidiriam sobre
   * o estado velho — que é o gate-fora-da-tx registrado em server/CLAUDE.md §5.
   */
  it('tx: leitura com o handle da tx enxerga a escrita in-tx', async () => {
    const conta = await criarConta(DONO_A, UNIT);

    const { porPar, porVersao } = await repo.runTransaction(async (tx) => {
      await repo.upsert(
        escopo(DONO_A),
        {
          accountId: conta.id,
          referentialCode: 'IN-TX',
          label: 'x',
          mappingVersion: V2026,
          createdById: DONO_A,
        },
        tx,
      );
      return {
        porPar: await repo.findByAccountAndVersion(escopo(DONO_A), conta.id, V2026, tx),
        porVersao: await repo.findManyByVersion(escopo(DONO_A), V2026, tx),
      };
    });

    expect(porPar!.referentialCode).toBe('IN-TX');
    expect(porVersao.map((m) => m.referentialCode)).toContain('IN-TX');
  });

  /**
   * A composição que o serviço promete (ACC-011 + ACC-019) rodando pelo FACTORY, não pela classe à
   * mão (Contrato §2/§3 — a fiação é o que produção executa): `batchSet` roda os itens numa ÚNICA
   * tx, então um item ruim desfaz o lote inteiro — inclusive os mapeamentos dos itens BONS que já
   * tinham sido escritos, e inclusive a auditoria deles.
   */
  it('tx: batchSet é tudo-ou-nada — item ruim desfaz os bons E a auditoria do lote', async () => {
    const service = getFactory().getReferentialMappingService();
    const scope = escopo(DONO_A);
    const boa = await criarConta(DONO_A, UNIT);
    const sintetica = await criarConta(DONO_A, UNIT, { acceptsEntries: false }); // recusada pelo gate
    const eventosAntes = await prisma.auditEvent.count({ where: { scopeUserId: DONO_A, unitId: UNIT } });

    await expect(
      service.batchSet(scope, {
        unitId: UNIT,
        mappingVersion: V2026,
        items: [
          { accountId: boa.id, referentialCode: '8.01.00.00.00', label: 'boa' },
          { accountId: sintetica.id, referentialCode: '8.02.00.00.00', label: 'sintética' },
        ],
      }),
    ).rejects.toThrow();

    // O item BOM vinha ANTES do ruim no laço — se a tx não fosse real, ele teria sobrevivido.
    expect(await repo.findByAccountAndVersion(scope, boa.id, V2026)).toBeNull();
    expect(await prisma.auditEvent.count({ where: { scopeUserId: DONO_A, unitId: UNIT } })).toBe(eventosAntes);

    // Controle: o MESMO lote, só com o item bom, comita — a reprovação acima é do gate, não de pane.
    const ok = await service.batchSet(scope, {
      unitId: UNIT,
      mappingVersion: V2026,
      items: [{ accountId: boa.id, referentialCode: '8.01.00.00.00', label: 'boa' }],
    });
    expect(ok).toHaveLength(1);
    expect(await repo.findByAccountAndVersion(scope, boa.id, V2026)).not.toBeNull();
  });

  // ------------------------------------------------------------------ "softdelete" (ver o cabeçalho)
  /**
   * (a) CARACTERIZAÇÃO, não aspiração: o unset é delete DE VERDADE — a linha SAI da base, não ganha
   * `deletedAt`. É por isso que a classe registrada `unique-de-idempotencia-x-soft-delete` não morde
   * aqui: sem tumba ocupando a `@@unique`, unset→re-set do MESMO par (conta, versão) funciona em vez
   * de morrer em P2002. Quem trocar isto por soft-delete sem mexer no upsert reprova este caso — e a
   * reprovação é a mensagem certa, porque esse é exatamente o P2002 da classe.
   */
  it('sem soft-delete (D5): unset APAGA a linha e o re-set do mesmo par volta a funcionar', async () => {
    const service = getFactory().getReferentialMappingService();
    const scope = escopo(DONO_A);
    const conta = await criarConta(DONO_A, UNIT);

    const criado = await service.setMapping(scope, {
      unitId: UNIT,
      accountId: conta.id,
      referentialCode: '1.09.00.00.00',
      label: 'antes',
      mappingVersion: V2025,
    });
    await service.unsetMapping(scope, { unitId: UNIT, accountId: conta.id, mappingVersion: V2025 });

    // Delete de VERDADE: a linha não está na base nem por id (uma tumba passaria por findUnique).
    expect(await prisma.referentialMapping.findUnique({ where: { id: criado.id } })).toBeNull();

    // E a chave ficou LIVRE — este re-set é o P2002 que não acontece.
    const recriado = await service.setMapping(scope, {
      unitId: UNIT,
      accountId: conta.id,
      referentialCode: '1.09.00.00.00',
      label: 'depois',
      mappingVersion: V2025,
    });
    expect(recriado.id).not.toBe(criado.id);

    // A trilha é onde o histórico sobrevive ao delete (D5) — os três eventos, em ordem.
    const eventos = await prisma.auditEvent.findMany({
      where: { scopeUserId: DONO_A, unitId: UNIT, targetId: { in: [criado.id, recriado.id] } },
      orderBy: { seq: 'asc' },
    });
    expect(eventos.map((e) => e.eventType)).toEqual([
      'referential.mapping.set',
      'referential.mapping.unset',
      'referential.mapping.set',
    ]);
  });

  /**
   * (b) O soft-delete que esta unidade REALMENTE consome: a liveness da CONTA, re-checada DENTRO da
   * tx (ACC-011). `applySet` relê a conta com o handle da tx e `AccountRepository.findById` filtra
   * `deletedAt: null` — mapear conta arquivada tem de virar NotFound. Sem isso, o de-para aponta
   * para conta que saiu do plano e a cobertura declara pronto para ECD um plano furado.
   *
   * Conta de OUTRO DONO cai no mesmo NotFound de propósito (anti-enumeração): a mensagem não
   * distingue "não existe" de "não é sua".
   */
  it('softdelete da CONTA: mapear conta arquivada (ou alheia) é NotFound — gate re-checado in-tx', async () => {
    const service = getFactory().getReferentialMappingService();
    const scope = escopo(DONO_A);
    const conta = await criarConta(DONO_A, UNIT);
    const doOutro = await criarConta(DONO_B, UNIT);

    // Controle primeiro: viva, a MESMA conta mapeia sem drama.
    await service.setMapping(scope, {
      unitId: UNIT,
      accountId: conta.id,
      referentialCode: '1.10.00.00.00',
      label: 'viva',
      mappingVersion: V2026,
    });

    await prisma.account.update({ where: { id: conta.id }, data: { deletedAt: new Date() } });

    await expect(
      service.setMapping(scope, {
        unitId: UNIT,
        accountId: conta.id,
        referentialCode: '1.11.00.00.00',
        label: 'arquivada',
        mappingVersion: V2026,
      }),
    ).rejects.toThrow(NotFoundError);

    await expect(
      service.setMapping(scope, {
        unitId: UNIT,
        accountId: doOutro.id,
        referentialCode: '1.12.00.00.00',
        label: 'alheia',
        mappingVersion: V2026,
      }),
    ).rejects.toThrow(NotFoundError);

    // O mapeamento antigo continua com o código da época — a recusa não reescreveu nada.
    expect(
      (await repo.findByAccountAndVersion(scope, conta.id, V2026))!.referentialCode,
    ).toBe('1.10.00.00.00');
  });
});
