/**
 * CONTRATO HTTP do PLANO DE CONTAS — app Express REAL sobre supertest + SQLite REAL,
 * sem mock de prisma e sem mock de serviço. Irmão de `accountingController.integration.test.ts`,
 * mesmo molde, outro grupo de handlers.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * O QUE ESTE ARQUIVO COBRE — 3 rotas de escrita, 3 handlers, 1 invariante: INQUILINO.
 *   · POST   /api/accounting/accounts                        → createAccount
 *   · DELETE /api/accounting/accounts/:id                    → deleteAccount
 *   · PATCH  /api/accounting/accounts/:id/requires-dimension → setAccountRequiresDimension
 *
 * FRAÇÃO DA SUPERFÍCIE, declarada porque o número importa mais do que a palavra "fechado"
 * (AV-R8 F6, `instrument_feedback`: "barreira que fecha item de fila precisa declarar a fração
 * da superfície que ela cobre"):
 *   · o mount `/api/accounting` registra 55 rotas (29 de escrita, 26 de leitura);
 *   · `accountingController.ts` exporta 23 handlers, dos quais 10 são de escrita;
 *   · ANTES desta barreira, 4 das 55 rotas tinham teste que sobe o app (7%), todas no arquivo irmão;
 *   · este arquivo acrescenta 3; o irmão de períodos acrescenta 5; a união vai a 12/55 (22%),
 *     e a escrita do PRÓPRIO controller vai de 2/10 para 10/10 handlers.
 *
 * O QUE ESTE ARQUIVO **NÃO** COBRE — dito aqui para que ninguém leia o verde como cobertura
 * que ele não dá:
 *   · as 43 rotas restantes do mount continuam sem teste que suba o app — em especial as 19
 *     rotas de escrita dos OUTROS controllers montados aqui (anexos, conciliação, data-exchange,
 *     de-para/catálogo referencial, SPED/encerramento). Isso é trabalho de outro achado.
 *   · os 13 handlers de LEITURA deste controller (relatórios, listagens, recibo).
 *   · autenticação (401 sem token / token furado / spoof de `x-user-*`): já é barreira do arquivo
 *     irmão sobre `POST /post`, e o `authMiddleware` é deny-by-default para o mount inteiro —
 *     não se re-litiga aqui.
 *   · regras de negócio do delete que NÃO são de inquilino (conta canônica → 409, conta com
 *     partidas → 409). A perna medida pelo achado é a troca de DONO, e é essa que este arquivo trava.
 *
 * A PERNA QUE ESTE ARQUIVO TRAVA, e por que ela não é autenticação. O `authMiddleware` já devolve
 * 401 para pedido sem token — isso nunca foi o buraco. O buraco é um usuário AUTENTICADO operando
 * sobre recurso de OUTRO dono: `resolveAccountingScope(user, unitId)` é o único ponto onde o dono
 * entra, e nenhum teste que subisse o app alcançava estes três handlers. Trocar o dono ali por um
 * literal atravessava os 398 testes de integração sem uma reprovação (AV-R8 F6).
 *
 * MORDIDA MEDIDA (mutação incondicional — dono do escopo trocado por um literal no sítio do
 * `resolveAccountingScope` DESTE handler, nunca dependente de input de teste, revertida de `.bak`
 * com `git diff --numstat` vazio nas duas pontas). Controle = estes 3 casos verdes sem mutação:
 *   · createAccount               (accountingController.ts:174) → 1 de 3 morre
 *   · deleteAccount               (accountingController.ts:194) → 1 de 3 morre
 *   · setAccountRequiresDimension (accountingController.ts:216) → 1 de 3 morre
 * Cada mutação mata EXATAMENTE o caso do seu handler — não há kill por acaso, e nenhum caso
 * depende do handler do vizinho.
 *
 * CADA CASO NEGATIVO TEM O SEU CONTROLE, e todo negativo de escrita confere a BASE, não só o
 * status: recusar com o número certo e gravar assim mesmo é o modo de falha que um teste de
 * status não vê. E "nada escrito" é conferido dos DOIS lados — a linha do dono A e a trilha de
 * auditoria dos dois donos.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

/** UNIDADE COMPARTILHADA de propósito: o `unitId` vem do cliente, então o teste mais afiado é o
 *  que dá aos dois donos a MESMA unidade — a separação tem de vir do `userId` do token, não de
 *  uma sub-partição diferente que esconderia um filtro de um eixo só. */
const UNIT = 'unit-acct-coa';

let donoA: { id: string; username: string };
let donoB: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

/** Conta-folha NÃO canônica (9.x não existe no ChartOfAccountsFixture), criada direto na base:
 *  o teste ARRANJA o estado, não o produz pelo handler que está sob teste. */
const arranjarConta = (userId: string, code: string, extra: { requiresDimension?: boolean } = {}) =>
  prisma.account.create({
    data: {
      userId,
      unitId: UNIT,
      code,
      name: `Conta ${code}`,
      nature: 'Expense',
      acceptsEntries: true,
      requiresDimension: extra.requiresDimension ?? false,
    },
  });

/** Foto do que existe de um dono — a prova de que a recusa não escreveu nada em lugar nenhum. */
const fotoDe = async (userId: string) => ({
  contasVivas: await prisma.account.count({ where: { userId, unitId: UNIT, deletedAt: null } }),
  contasApagadas: await prisma.account.count({
    where: { userId, unitId: UNIT, deletedAt: { not: null } },
  }),
  auditoria: await prisma.auditEvent.count({ where: { scopeUserId: userId, unitId: UNIT } }),
});

describe('accountingController — plano de contas: fronteira de inquilino nas 3 rotas de escrita', () => {
  beforeAll(async () => {
    pushTestSchema();
    donoA = await criarUsuario('acct-coa-a');
    donoB = await criarUsuario('acct-coa-b');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════ POST /accounts — createAccount
  /**
   * Em `createAccount` não existe "recurso do outro dono para operar": criar é sempre linha nova.
   * A perna de inquilino aqui é a MESMA que o arquivo irmão prova em `POST /post` — quem é o dono
   * da linha que nasce. O corpo MENTE de propósito (`userId`/`ownerUserId` do dono A num pedido
   * assinado pelo dono B) e a conta tem de nascer do B. O `CreateAccountSchema` não é `.strict()`,
   * então esses campos são descartados em silêncio: é exatamente por isso que a asserção olha a
   * BASE, e não a resposta.
   *
   * O segundo eixo — e o que faz deste um caso de inquilino de verdade — é o CÓDIGO REPETIDO na
   * MESMA unidade: `@@unique([userId, unitId, code])` só separa os dois donos enquanto o `userId`
   * for o do token. Com o dono trocado, a segunda criação colide com a primeira (409) ou sobrescreve
   * o plano do vizinho.
   */
  it('inquilino: conta do dono B nasce do TOKEN, não do corpo — e a homônima do dono A fica intacta', async () => {
    // Controle: o dono A cria a sua conta 9.9.1 e ela é dele.
    const doA = await request(app)
      .post('/api/accounting/accounts')
      .set(authHeader(donoA))
      .send({ unitId: UNIT, code: '9.9.1', name: 'Despesa do dono A', nature: 'Expense' });
    expect(doA.status).toBe(201);
    const contaA = await prisma.account.findUnique({ where: { id: doA.body.data.account.id } });
    expect(contaA!.userId).toBe(donoA.id);
    expect(contaA!.unitId).toBe(UNIT);

    // Inquilino: o dono B cria o MESMO código na MESMA unidade, mentindo o dono no corpo.
    const doB = await request(app)
      .post('/api/accounting/accounts')
      .set(authHeader(donoB))
      .send({
        unitId: UNIT,
        code: '9.9.1',
        name: 'Despesa do dono B',
        nature: 'Expense',
        userId: donoA.id, // mentira deliberada
        ownerUserId: donoA.id, // mentira deliberada
      });

    expect(doB.status).toBe(201);
    const contaB = await prisma.account.findUnique({ where: { id: doB.body.data.account.id } });
    expect(contaB!.userId).toBe(donoB.id); // o token venceu o corpo
    expect(contaB!.userId).not.toBe(donoA.id);

    // Nada tocado do lado do A: a conta dele continua sendo dele, com o nome dele, e é única.
    const aindaDoA = await prisma.account.findUnique({ where: { id: contaA!.id } });
    expect(aindaDoA!.userId).toBe(donoA.id);
    expect(aindaDoA!.name).toBe('Despesa do dono A');
    expect(aindaDoA!.deletedAt).toBeNull();
    expect(await prisma.account.count({ where: { userId: donoA.id, unitId: UNIT, code: '9.9.1' } })).toBe(1);
  });

  // ══════════════════════════════════════════════════ DELETE /accounts/:id — deleteAccount
  /**
   * A OPERAÇÃO MAIS DESTRUTIVA DO MOUNT, e a que o achado mediu: com o dono trocado por um literal
   * em `accountingController.ts:194`, apagar conta do plano de OUTRO inquilino atravessava os 398
   * testes de integração sem uma reprovação.
   *
   * 404 e não 403 é deliberado (anti-enumeração — a resposta não confirma que o id existe), e é o
   * mesmo contrato que o arquivo irmão trava em `POST /reverse`.
   */
  it('inquilino: dono B não apaga conta do dono A — 404 e nada apagado de nenhum lado', async () => {
    const conta = await arranjarConta(donoA.id, '9.9.2');
    const antesA = await fotoDe(donoA.id);
    const antesB = await fotoDe(donoB.id);

    const res = await request(app)
      .delete(`/api/accounting/accounts/${conta.id}`)
      .set(authHeader(donoB))
      .query({ unitId: UNIT });

    expect(res.status).toBe(404);
    // A base, não o status: a conta do A continua VIVA e nada foi escrito em nenhuma das trilhas.
    expect((await prisma.account.findUnique({ where: { id: conta.id } }))!.deletedAt).toBeNull();
    expect(await fotoDe(donoA.id)).toEqual(antesA);
    expect(await fotoDe(donoB.id)).toEqual(antesB);

    // Controle: o PRÓPRIO dono apaga a MESMA conta — o 404 acima é da guarda, não de pane.
    const doDono = await request(app)
      .delete(`/api/accounting/accounts/${conta.id}`)
      .set(authHeader(donoA))
      .query({ unitId: UNIT });
    expect(doDono.status).toBe(200);
    expect((await prisma.account.findUnique({ where: { id: conta.id } }))!.deletedAt).not.toBeNull();
    // Soft-delete, nunca hard-delete (Contrato §2): a linha continua na base.
    expect(
      await prisma.auditEvent.count({
        where: { scopeUserId: donoA.id, unitId: UNIT, eventType: 'account.deleted', targetId: conta.id },
      }),
    ).toBe(1);
    // E a trilha do B segue intocada: a auditoria do delete é do dono, não do último que tentou.
    expect(await fotoDe(donoB.id)).toEqual(antesB);
  });

  // ═══════════════════════════════════ PATCH /accounts/:id/requires-dimension — setAccountRequiresDimension
  /**
   * `requiresDimension` decide se toda partida àquela conta EXIGE etiqueta de dimensão. Um dono que
   * consiga DESLIGAR a flag na conta do vizinho abre exatamente a evasão que o flag existe para
   * fechar — e o inverso (ligar) trava o razão do vizinho. Por isso a asserção confere o VALOR da
   * flag na base, não só o status.
   */
  it('inquilino: dono B não muda requiresDimension de conta do dono A — 404 e a flag não se move', async () => {
    const conta = await arranjarConta(donoA.id, '9.9.3', { requiresDimension: false });
    const antesA = await fotoDe(donoA.id);
    const antesB = await fotoDe(donoB.id);

    const res = await request(app)
      .patch(`/api/accounting/accounts/${conta.id}/requires-dimension`)
      .set(authHeader(donoB))
      .send({ unitId: UNIT, requiresDimension: true });

    expect(res.status).toBe(404);
    expect((await prisma.account.findUnique({ where: { id: conta.id } }))!.requiresDimension).toBe(false);
    expect(await fotoDe(donoA.id)).toEqual(antesA);
    expect(await fotoDe(donoB.id)).toEqual(antesB);

    // Controle: o PRÓPRIO dono liga a flag na MESMA conta — a recusa acima é da guarda de inquilino.
    const doDono = await request(app)
      .patch(`/api/accounting/accounts/${conta.id}/requires-dimension`)
      .set(authHeader(donoA))
      .send({ unitId: UNIT, requiresDimension: true });
    expect(doDono.status).toBe(200);
    expect((await prisma.account.findUnique({ where: { id: conta.id } }))!.requiresDimension).toBe(true);
    expect(
      await prisma.auditEvent.count({
        where: {
          scopeUserId: donoA.id,
          unitId: UNIT,
          eventType: 'account.requires_dimension_changed',
          targetId: conta.id,
        },
      }),
    ).toBe(1);
    expect(await fotoDe(donoB.id)).toEqual(antesB);
  });
});
