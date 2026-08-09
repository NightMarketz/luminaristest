/**
 * CONTRATO HTTP dos PERÍODOS CONTÁBEIS — app Express REAL sobre supertest + SQLite REAL,
 * sem mock de prisma e sem mock de serviço. Irmão de `accountingController.integration.test.ts`,
 * mesmo molde, outro grupo de handlers.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * O QUE ESTE ARQUIVO COBRE — 5 rotas de escrita, 5 handlers, 1 invariante: INQUILINO.
 *   · POST /api/accounting/:unitId/periods/seed-year → seedYear
 *   · POST /api/accounting/periods/:id/open          → openPeriod
 *   · POST /api/accounting/periods/:id/soft-close    → softClosePeriod
 *   · POST /api/accounting/periods/:id/hard-close    → hardClosePeriod
 *   · POST /api/accounting/periods/:id/reopen        → reopenPeriod
 *
 * FRAÇÃO DA SUPERFÍCIE, declarada porque o número importa mais do que a palavra "fechado"
 * (AV-R8 F6, `instrument_feedback`: "barreira que fecha item de fila precisa declarar a fração
 * da superfície que ela cobre"):
 *   · o mount `/api/accounting` registra 55 rotas (29 de escrita, 26 de leitura);
 *   · `accountingController.ts` exporta 23 handlers, dos quais 10 são de escrita;
 *   · ANTES desta barreira, 4 das 55 rotas tinham teste que sobe o app (7%), todas no arquivo irmão;
 *   · este arquivo acrescenta 5; o irmão do plano de contas acrescenta 3; a união vai a 12/55 (22%),
 *     e a escrita do PRÓPRIO controller vai de 2/10 para 10/10 handlers.
 *
 * O QUE ESTE ARQUIVO **NÃO** COBRE:
 *   · as 43 rotas restantes do mount — em especial as 19 rotas de escrita dos OUTROS controllers
 *     montados aqui (anexos, conciliação, data-exchange, de-para/catálogo referencial,
 *     SPED/encerramento). Trabalho de outro achado.
 *   · os 13 handlers de LEITURA deste controller, `GET /:unitId/periods` (listPeriods) incluído.
 *   · autenticação (401): barreira do arquivo irmão sobre `POST /post`; o `authMiddleware` é
 *     deny-by-default para o mount inteiro e não se re-litiga aqui.
 *   · a MÁQUINA DE ESTADOS em si — que HARD_CLOSED é terminal, que soft-close exige OPEN, que
 *     reopen recusa HARD_CLOSED. Essas transições ilegais têm cobertura de serviço; o que faltava,
 *     e o que este arquivo traz, é a perna de DONO pelo caminho HTTP.
 *   · o gate de posting contra período fechado (mora em PostingService, não aqui).
 *
 * A PERNA QUE ESTE ARQUIVO TRAVA. Não é autenticação: o `authMiddleware` já devolve 401 sem token.
 * É um usuário AUTENTICADO transicionando período de OUTRO dono. `resolveAccountingScope(user,
 * unitId)` é o único ponto onde o dono entra, e nenhum teste que subisse o app alcançava estes
 * cinco handlers (AV-R8 F6: 55 rotas registradas, 4 exercitadas).
 *
 * POR QUE OS DOIS DONOS TÊM PERÍODOS DO MESMO ANO/MÊS NA MESMA UNIDADE. `setStatus` grava por
 * `@@unique([userId, unitId, year, month])` — a chave de escrita NÃO é o id, é o ano/mês dentro do
 * escopo. Se o escopo escorregar, a escrita pousa na linha homônima do vizinho sem erro nenhum.
 * Por isso cada caso confere o estado dos DOIS donos: sem a linha gêmea do B, um vazamento de
 * escopo não teria onde aparecer.
 *
 * A RECUSA AQUI É 400, NÃO 404 — e isso é caracterização, não aprovação. `PeriodService` lança
 * `ValidationError('Período ... não encontrado.')` quando o `findById` escopado não acha; o plano
 * de contas, na mesma situação, lança `NotFoundError` (404). A divergência é do produto, está
 * registrada aqui, e NÃO foi consertada — consertar achado não triado é proibido pelo bloco 9 do
 * AV-00. O que importa para a barreira é idêntico nos dois: a operação é recusada e nada é escrito.
 *
 * MORDIDA MEDIDA (mutação incondicional — dono do escopo trocado por um literal no sítio do
 * `resolveAccountingScope` DESTE handler, nunca dependente de input de teste, revertida de `.bak`
 * com `git diff --numstat` vazio nas duas pontas). Controle = estes 5 casos verdes sem mutação:
 *   · seedYear         (accountingController.ts:500) → 1 de 5 morre
 *   · openPeriod       (accountingController.ts:528) → 1 de 5 morre
 *   · softClosePeriod  (accountingController.ts:558) → 1 de 5 morre
 *   · hardClosePeriod  (accountingController.ts:588) → 1 de 5 morre
 *   · reopenPeriod     (accountingController.ts:618) → 1 de 5 morre
 * Cada mutação mata EXATAMENTE o caso do seu handler.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

/** UNIDADE COMPARTILHADA de propósito — a separação tem de vir do `userId` do token, não de uma
 *  sub-partição diferente que esconderia um filtro de um eixo só. */
const UNIT = 'unit-acct-per';
/** Ano dos períodos ARRANJADOS (um mês por transição, para os casos não dependerem da ordem). */
const ANO = 2027;
/** Ano exercitado pelo `seedYear` — separado do acima para o seed não mexer no arranjo. */
const ANO_SEED = 2028;

let donoA: { id: string; username: string };
let donoB: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

type Status = 'FUTURE' | 'OPEN' | 'SOFT_CLOSED' | 'HARD_CLOSED';

/** O teste ARRANJA o estado direto na base — não o produz pelo handler que está sob teste. */
const arranjarPeriodo = (userId: string, month: number, status: Status) =>
  prisma.accountingPeriod.create({
    data: { userId, unitId: UNIT, year: ANO, month, status },
  });

/** Foto do que existe de um dono — a prova de que a recusa não escreveu nada em lugar nenhum. */
const fotoDe = async (userId: string) => ({
  periodos: await prisma.accountingPeriod.count({ where: { userId, unitId: UNIT } }),
  transicoes: await prisma.accountingPeriodTransition.count({ where: { userId, unitId: UNIT } }),
  auditoria: await prisma.auditEvent.count({ where: { scopeUserId: userId, unitId: UNIT } }),
});

const statusDe = async (id: string) =>
  (await prisma.accountingPeriod.findUnique({ where: { id } }))!.status;

describe('accountingController — períodos: fronteira de inquilino nas 5 rotas de escrita', () => {
  beforeAll(async () => {
    pushTestSchema();
    donoA = await criarUsuario('acct-per-a');
    donoB = await criarUsuario('acct-per-b');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════ POST /:unitId/periods/seed-year — seedYear
  /**
   * `seedYear` faz 12 upserts por `@@unique([userId, unitId, year, month])`. Com o dono do escopo
   * trocado, o seed do dono B pousa nas linhas do dono A — e como `update: {}` é vazio, o dano não
   * é sobrescrever: é o dono B NÃO GANHAR período nenhum e passar a operar sobre o razão do A.
   * Por isso as duas asserções: o B tem 12 linhas SUAS, e as 12 do A continuam sendo 12 com o
   * status que tinham (inclusive o mês que já estava OPEN, que um upsert desatento reabriria).
   */
  it('inquilino: seed-year do dono B cria os períodos DO B — os 12 do dono A não se movem', async () => {
    // Controle: o dono A semeia o ano e ganha 12 períodos FUTURE, todos dele.
    const doA = await request(app)
      .post(`/api/accounting/${UNIT}/periods/seed-year`)
      .set(authHeader(donoA))
      .send({ year: ANO_SEED });
    expect(doA.status).toBe(201);
    const doAnoA = await prisma.accountingPeriod.findMany({
      where: { userId: donoA.id, unitId: UNIT, year: ANO_SEED },
    });
    expect(doAnoA).toHaveLength(12);
    expect(doAnoA.every((p) => p.userId === donoA.id && p.status === 'FUTURE')).toBe(true);

    // O dono A abre um mês: é a linha que um seed alheio com escopo escorregado apagaria de vista.
    const junhoDoA = doAnoA.find((p) => p.month === 6)!;
    await prisma.accountingPeriod.update({ where: { id: junhoDoA.id }, data: { status: 'OPEN' } });

    // Inquilino: o dono B semeia o MESMO ano na MESMA unidade.
    const doB = await request(app)
      .post(`/api/accounting/${UNIT}/periods/seed-year`)
      .set(authHeader(donoB))
      .send({ year: ANO_SEED });

    expect(doB.status).toBe(201);
    const doAnoB = await prisma.accountingPeriod.findMany({
      where: { userId: donoB.id, unitId: UNIT, year: ANO_SEED },
    });
    expect(doAnoB).toHaveLength(12); // o B ganhou os SEUS, não os do A
    expect(doAnoB.every((p) => p.userId === donoB.id && p.status === 'FUTURE')).toBe(true);
    expect(doAnoB.map((p) => p.id).some((id) => doAnoA.map((q) => q.id).includes(id))).toBe(false);

    // E o lado do A: ainda 12, e o mês aberto continua aberto.
    expect(
      await prisma.accountingPeriod.count({ where: { userId: donoA.id, unitId: UNIT, year: ANO_SEED } }),
    ).toBe(12);
    expect(await statusDe(junhoDoA.id)).toBe('OPEN');
  });

  // ══════════════════════════════════════════ POST /periods/:id/open — openPeriod
  it('inquilino: dono B não abre período do dono A — recusa e nenhum dos dois lados muda', async () => {
    const doA = await arranjarPeriodo(donoA.id, 1, 'FUTURE');
    const doB = await arranjarPeriodo(donoB.id, 1, 'FUTURE'); // linha gêmea: onde um vazamento apareceria
    const antesA = await fotoDe(donoA.id);
    const antesB = await fotoDe(donoB.id);

    const res = await request(app)
      .post(`/api/accounting/periods/${doA.id}/open`)
      .set(authHeader(donoB))
      .send({ unitId: UNIT });

    expect(res.status).toBe(400); // ValidationError escopado — ver nota sobre 400×404 no cabeçalho
    expect(await statusDe(doA.id)).toBe('FUTURE'); // o período do A não abriu
    expect(await statusDe(doB.id)).toBe('FUTURE'); // nem o gêmeo do B foi aberto por tabela
    expect(await fotoDe(donoA.id)).toEqual(antesA);
    expect(await fotoDe(donoB.id)).toEqual(antesB);

    // Controle: o PRÓPRIO dono abre o MESMO período — a recusa acima é da guarda, não de pane.
    const doDono = await request(app)
      .post(`/api/accounting/periods/${doA.id}/open`)
      .set(authHeader(donoA))
      .send({ unitId: UNIT });
    expect(doDono.status).toBe(200);
    expect(await statusDe(doA.id)).toBe('OPEN');
    expect(await statusDe(doB.id)).toBe('FUTURE'); // a transição do A não encostou no gêmeo do B
    expect(
      await prisma.accountingPeriodTransition.count({ where: { userId: donoA.id, periodId: doA.id, toStatus: 'OPEN' } }),
    ).toBe(1);
    expect(await fotoDe(donoB.id)).toEqual(antesB);
  });

  // ══════════════════════════════════════════ POST /periods/:id/soft-close — softClosePeriod
  it('inquilino: dono B não fecha (soft) período do dono A — recusa e nenhum dos dois lados muda', async () => {
    const doA = await arranjarPeriodo(donoA.id, 2, 'OPEN');
    const doB = await arranjarPeriodo(donoB.id, 2, 'OPEN');
    const antesA = await fotoDe(donoA.id);
    const antesB = await fotoDe(donoB.id);

    const res = await request(app)
      .post(`/api/accounting/periods/${doA.id}/soft-close`)
      .set(authHeader(donoB))
      .send({ unitId: UNIT, reason: 'cross-tenant' });

    expect(res.status).toBe(400);
    expect(await statusDe(doA.id)).toBe('OPEN');
    expect(await statusDe(doB.id)).toBe('OPEN');
    expect(await fotoDe(donoA.id)).toEqual(antesA);
    expect(await fotoDe(donoB.id)).toEqual(antesB);

    // Controle: o PRÓPRIO dono fecha o MESMO período.
    const doDono = await request(app)
      .post(`/api/accounting/periods/${doA.id}/soft-close`)
      .set(authHeader(donoA))
      .send({ unitId: UNIT, reason: 'controle' });
    expect(doDono.status).toBe(200);
    expect(await statusDe(doA.id)).toBe('SOFT_CLOSED');
    expect(await statusDe(doB.id)).toBe('OPEN');
    expect(await fotoDe(donoB.id)).toEqual(antesB);
  });

  // ══════════════════════════════════════════ POST /periods/:id/reopen — reopenPeriod
  /**
   * NOTA DE CARACTERIZAÇÃO, não conserto: `ReopenPeriodSchema` é `.strict()` e EXIGE `periodId` no
   * corpo, mas o handler usa `req.params.id` e descarta o do corpo. Este caso manda o `periodId`
   * porque sem ele o DTO devolve 400 e o teste mediria o Zod em vez da guarda de inquilino — o que
   * seria uma passagem vacuosa. Fica registrado como observação; consertar produção aqui é proibido.
   */
  it('inquilino: dono B não reabre período do dono A — recusa e nenhum dos dois lados muda', async () => {
    const doA = await arranjarPeriodo(donoA.id, 3, 'SOFT_CLOSED');
    const doB = await arranjarPeriodo(donoB.id, 3, 'SOFT_CLOSED');
    const antesA = await fotoDe(donoA.id);
    const antesB = await fotoDe(donoB.id);

    const res = await request(app)
      .post(`/api/accounting/periods/${doA.id}/reopen`)
      .set(authHeader(donoB))
      .send({ unitId: UNIT, periodId: doA.id, reason: 'cross-tenant' });

    expect(res.status).toBe(400);
    expect(await statusDe(doA.id)).toBe('SOFT_CLOSED');
    expect(await statusDe(doB.id)).toBe('SOFT_CLOSED');
    expect(await fotoDe(donoA.id)).toEqual(antesA);
    expect(await fotoDe(donoB.id)).toEqual(antesB);

    // Controle: o PRÓPRIO dono reabre o MESMO período.
    const doDono = await request(app)
      .post(`/api/accounting/periods/${doA.id}/reopen`)
      .set(authHeader(donoA))
      .send({ unitId: UNIT, periodId: doA.id, reason: 'controle' });
    expect(doDono.status).toBe(200);
    expect(await statusDe(doA.id)).toBe('OPEN');
    expect(await statusDe(doB.id)).toBe('SOFT_CLOSED');
    expect(await fotoDe(donoB.id)).toEqual(antesB);
  });

  // ══════════════════════════════════════════ POST /periods/:id/hard-close — hardClosePeriod
  /**
   * HARD_CLOSED é TERMINAL: nenhuma transição o desfaz. Um dono que consiga fechar
   * definitivamente o período do vizinho trava o razão dele para sempre — é a transição mais
   * destrutiva do grupo, e a única cujo dano não tem caminho de volta pelo produto.
   */
  it('inquilino: dono B não fecha DEFINITIVAMENTE período do dono A — recusa e nenhum dos dois lados muda', async () => {
    const doA = await arranjarPeriodo(donoA.id, 4, 'OPEN');
    const doB = await arranjarPeriodo(donoB.id, 4, 'OPEN');
    const antesA = await fotoDe(donoA.id);
    const antesB = await fotoDe(donoB.id);

    const res = await request(app)
      .post(`/api/accounting/periods/${doA.id}/hard-close`)
      .set(authHeader(donoB))
      .send({ unitId: UNIT, reason: 'cross-tenant' });

    expect(res.status).toBe(400);
    expect(await statusDe(doA.id)).toBe('OPEN');
    expect(await statusDe(doB.id)).toBe('OPEN');
    expect(await fotoDe(donoA.id)).toEqual(antesA);
    expect(await fotoDe(donoB.id)).toEqual(antesB);

    // Controle: o PRÓPRIO dono fecha o MESMO período — e só o dele.
    const doDono = await request(app)
      .post(`/api/accounting/periods/${doA.id}/hard-close`)
      .set(authHeader(donoA))
      .send({ unitId: UNIT, reason: 'controle' });
    expect(doDono.status).toBe(200);
    expect(await statusDe(doA.id)).toBe('HARD_CLOSED');
    expect(await statusDe(doB.id)).toBe('OPEN');
    expect(await fotoDe(donoB.id)).toEqual(antesB);
  });
});
