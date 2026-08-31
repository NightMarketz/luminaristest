/**
 * CONTRATO HTTP DO accountingController — app Express REAL sobre supertest + SQLite REAL,
 * sem mock de prisma e sem mock de serviço.
 *
 * Unidade 1 de 4 da subfila ratificada em `docs/audit/TRIAGEM-R1-R3.json`
 * (`r2_decision.ratified_subqueue`), órfã desde d11b4716 — e a única das quatro cujas invariantes
 * nomeadas são **dinheiro + inquilino + autoriza**. As três têm bloco próprio abaixo.
 *
 * POR QUE INTEGRAÇÃO, E POR QUE PELO APP INTEIRO. A suíte unit faz `jest.mock` de `lib/prisma`:
 * ela afirma o mock. Foi isso que deixou M3 (perna fora da tx) e M5 (filtro de inquilino) do AV-R3
 * sobreviverem SEM SEREM EXECUTADAS. E, no caso de um controller, mockar o serviço seria pior
 * ainda: as três invariantes daqui NÃO moram no corpo do handler —
 *   · o teto de centavos mora no DTO Zod, ANTES do serviço;
 *   · o inquilino mora em `resolveAccountingScope(user, …)`, onde `user` vem do TOKEN;
 *   · a autorização mora no `authMiddleware`, que roda ANTES do controller.
 * Testar o handler isolado teria zero chance de tocar qualquer uma. O objeto sob teste é a
 * cadeia `authMiddleware → rota → DTO → controller → serviço → Prisma` como produção a roda
 * (Contrato §2/§3 — a fiação, não a classe).
 *
 * CADA CASO NEGATIVO TEM O SEU CONTROLE. Um teste que espera 400/401/404 passa também quando o
 * endpoint está quebrado para todo mundo; o par positivo/negativo é o que separa "a guarda mordeu"
 * de "nada funciona aqui". E todo negativo de escrita confere a BASE, não só o status: recusar com
 * o número certo e gravar assim mesmo é o modo de falha que um teste de status não vê.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { MAX_CENTS } from '@/features/accounting/models/money';

const app = makeApp();

const UNIT = 'unit-acctctrl';
const UNIT_OUTRA = 'unit-acctctrl-outra';
const DATA = '2026-06-15';

/** Dono A e dono B — o vazamento entre inquilinos só existe com DOIS donos na mesma base. */
let donoA: { id: string; username: string };
let donoB: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

/** Período OPEN — o gate de posting roda duas vezes (preflight e dentro da tx). */
const abrirPeriodo = (userId: string, unitId: string) =>
  prisma.accountingPeriod.create({
    data: { userId, unitId, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: userId },
  });

/** Conta-folha do plano, criada direto na base (o teste arranja o estado, não o produz). */
const criarConta = (userId: string, unitId: string, code: string, nature: string) =>
  prisma.account.create({
    data: { userId, unitId, code, name: `Conta ${code}`, nature, acceptsEntries: true },
  });

/** Lançamento balanceado mínimo: D 4.1 despesa / C 1.1.1 banco, em centavos INTEIROS. */
const lancamento = (descricao: string, centavos: number, unitId: string = UNIT) => ({
  unitId,
  date: DATA,
  description: descricao,
  sourceType: 'manual',
  lines: [
    { accountCode: '4.1', debitCents: centavos, creditCents: 0 },
    { accountCode: '1.1.1', debitCents: 0, creditCents: centavos },
  ],
});

const post = (ator: { id: string; username: string } | null, body: object) => {
  const req = request(app).post('/api/accounting/post');
  return ator ? req.set(authHeader(ator)).send(body) : req.send(body);
};

/** Linhas do razão de um dono, contadas direto da base — a prova de que nada foi escrito. */
const contagemDe = async (userId: string, unitId: string = UNIT) => ({
  entries: await prisma.journalEntry.count({ where: { userId, unitId } }),
  postings: await prisma.posting.count({ where: { userId, unitId } }),
});

describe('accountingController — contrato HTTP em SQLite real (subfila ratificada, unidade 1/4)', () => {
  beforeAll(async () => {
    pushTestSchema();
    donoA = await criarUsuario('acctctrl-a');
    donoB = await criarUsuario('acctctrl-b');
    for (const dono of [donoA, donoB]) {
      for (const unidade of [UNIT, UNIT_OUTRA]) {
        await abrirPeriodo(dono.id, unidade);
        await criarConta(dono.id, unidade, '4.1', 'Expense');
        await criarConta(dono.id, unidade, '1.1.1', 'Asset');
      }
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════ controle do harness
  // Sem este caso, TODO negativo abaixo passaria por vacuidade: um endpoint que sempre devolve erro
  // e nunca escreve satisfaz de uma vez os 400, os 401, os 404 e todas as contagens "não escreveu".
  it('CONTROLE: POST /post autenticado grava o lançamento e as DUAS pernas, em centavos inteiros', async () => {
    const res = await post(donoA, lancamento('venda à vista', 12345));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Lido da BASE, não do corpo da resposta — é a persistência que está sob teste.
    const pernas = await prisma.posting.findMany({ where: { entryId: res.body.data.id } });
    expect(pernas).toHaveLength(2);
    expect(pernas.reduce((n, p) => n + Number(p.debitCents), 0)).toBe(12345);
    expect(pernas.reduce((n, p) => n + Number(p.creditCents), 0)).toBe(12345);
    expect(pernas.every((p) => Number.isInteger(Number(p.debitCents)) && Number.isInteger(Number(p.creditCents)))).toBe(true);
    expect(pernas.every((p) => p.userId === donoA.id && p.unitId === UNIT)).toBe(true);
  });

  // ══════════════════════════════════════════════════════════ DINHEIRO
  /**
   * O TETO ERA DE PERSISTÊNCIA (`Posting.debitCents` era `Int32` — acima de MAX_CENTS a escrita
   * falhava lá no fundo, no commit, como erro opaco). Pós BE-INCR-MONEY-BIGINT (F-W2B-1/F-W2B-2a)
   * a coluna é `BigInt` — sem teto de persistência — e MAX_CENTS virou teto de POLÍTICA de negócio,
   * mordendo na MESMA borda de antes (o DTO, ACC-HARDEN-POST-CENTS-001) para que o cliente continue
   * recebendo 400 com mensagem em vez de um valor sem controle nenhum.
   *
   * O controle no teto EXATO é o que impede a guarda de virar off-by-one: um `< MAX_CENTS` no lugar
   * de `<= MAX_CENTS` passaria num teste que só empurra o valor estourado.
   */
  it('dinheiro: centavos acima de MAX_CENTS são 400 na borda — e o razão não é tocado', async () => {
    const antes = await contagemDe(donoA.id);

    const res = await post(donoA, lancamento('estoura o Int32', MAX_CENTS + 1));

    expect(res.status).toBe(400); // 400 do DTO, NÃO 500 opaco do commit
    expect(JSON.stringify(res.body)).toContain('debitCents');
    expect(await contagemDe(donoA.id)).toEqual(antes); // nada escrito

    // Controle: no teto EXATO passa — a recusa acima é do limite, não do endpoint.
    const noTeto = await post(donoA, lancamento('exatamente no teto', MAX_CENTS));
    expect(noTeto.status).toBe(201);
    const pernas = await prisma.posting.findMany({ where: { entryId: noTeto.body.data.id } });
    expect(Math.max(...pernas.map((p) => Number(p.debitCents)))).toBe(MAX_CENTS);
  });

  /**
   * CENTAVOS SÃO INTEIROS — não é preciosismo de tipo, é a classe registrada
   * `dynamictable-money-and-uniqueness-limits`: dinheiro em float acumula erro que só aparece na
   * conciliação, meses depois. O DTO exige `.int()`; um `z.number()` sem `.int()` aceitaria 12.5 e
   * o SQLite arredondaria em silêncio.
   */
  it('dinheiro: centavos fracionários são 400 — e o razão não é tocado', async () => {
    const antes = await contagemDe(donoA.id);

    const res = await post(donoA, lancamento('centavo quebrado', 12.5));

    expect(res.status).toBe(400);
    expect(await contagemDe(donoA.id)).toEqual(antes);
  });

  /**
   * A PARTIDA DOBRADA em si: Σdébito === Σcrédito. É o invariante que define o razão — um
   * lançamento desbalanceado aceito envenena todo demonstrativo a jusante (balancete, BP, DRE),
   * e não há como descobrir depois qual dos dois lados era o certo.
   */
  it('dinheiro: lançamento desbalanceado é recusado — e o razão não é tocado', async () => {
    const antes = await contagemDe(donoA.id);

    const res = await post(donoA, {
      ...lancamento('desbalanceado', 1000),
      lines: [
        { accountCode: '4.1', debitCents: 1000, creditCents: 0 },
        { accountCode: '1.1.1', debitCents: 0, creditCents: 999 }, // falta 1 centavo
      ],
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500); // erro do cliente, não pane
    expect(await contagemDe(donoA.id)).toEqual(antes);
  });

  /** Cada perna move UM lado. Débito e crédito positivos na mesma perna é ambiguidade, não soma. */
  it('dinheiro: perna com débito E crédito positivos é 400', async () => {
    const antes = await contagemDe(donoA.id);

    const res = await post(donoA, {
      ...lancamento('dois lados', 1000),
      lines: [
        { accountCode: '4.1', debitCents: 1000, creditCents: 1000 },
        { accountCode: '1.1.1', debitCents: 0, creditCents: 1000 },
      ],
    });

    expect(res.status).toBe(400);
    expect(await contagemDe(donoA.id)).toEqual(antes);
  });

  // ══════════════════════════════════════════════════════════ INQUILINO
  /**
   * A FRONTEIRA DE SEGURANÇA É O TOKEN, e este é o caso que prova de qual lado ela está.
   * `resolveAccountingScope(user, parsed.data.unitId)` toma o `userId` de `user` (autenticado) e o
   * `unitId` do CORPO. Se algum dia o `userId` também viesse do corpo, o razão inteiro viraria
   * escrita livre — o cliente escolheria o dono. Aqui o corpo MENTE de propósito (userId/ownerUserId
   * do dono A num pedido do dono B) e a linha tem de nascer do dono B mesmo assim.
   */
  it('inquilino: userId no CORPO é ignorado — o dono da linha é o do token', async () => {
    const res = await post(donoB, {
      ...lancamento('corpo mentiroso', 4200),
      userId: donoA.id,
      ownerUserId: donoA.id,
    });

    expect(res.status).toBe(201);
    const entry = await prisma.journalEntry.findUnique({ where: { id: res.body.data.id } });
    expect(entry!.userId).toBe(donoB.id); // o token venceu o corpo
    expect(entry!.userId).not.toBe(donoA.id);
    const pernas = await prisma.posting.findMany({ where: { entryId: entry!.id } });
    expect(pernas.every((p) => p.userId === donoB.id)).toBe(true);
  });

  /**
   * Cabeçalhos `x-user-*` são o canal por onde o controller LÊ a identidade
   * (`getUserContextFromRequest`). Uma cópia chegando de fora é spoof, e o `authMiddleware` a
   * derruba antes do roteamento (RISK-SEC-AUTH-001). Aqui a cópia forjada aponta para o dono A
   * dentro de um pedido assinado pelo dono B: a linha tem de continuar sendo do B.
   *
   * LIMITE MEDIDO deste caso, declarado em vez de vendido como cobertura que ele não dá: desligar
   * o laço de strip de `INBOUND_IDENTITY_HEADERS` (auth.ts:102-104) deixa este teste VERDE. A
   * mutação foi aplicada e sobreviveu — e a razão é estrutural, não sorte: depois de verificar o
   * token o middleware REESCREVE `x-user-id` e `x-user-role` incondicionalmente (auth.ts:126-127),
   * então o spoof desses dois perde de qualquer jeito, e é só desses dois que este escopo depende.
   * O strip é defesa em profundidade para os CONDICIONAIS (`x-user-email`/`-name`/`-username`, que
   * só são reescritos se o payload os tiver) — e esses não entram no `AccountingScope`, logo não há
   * asserção honesta a fazer sobre eles aqui. A barreira deste caso é a outra: qualquer mudança que
   * faça o controller resolver identidade do PEDIDO em vez do token verificado.
   */
  it('inquilino: x-user-id forjado não sequestra o escopo — a linha continua do token', async () => {
    const res = await request(app)
      .post('/api/accounting/post')
      .set(authHeader(donoB))
      .set('x-user-id', donoA.id) // spoof: cópia inbound do header de autoridade
      .set('x-user-username', donoA.username)
      .set('x-user-role', 'ADMIN')
      .send(lancamento('header forjado', 5100));

    expect(res.status).toBe(201);
    const entry = await prisma.journalEntry.findUnique({ where: { id: res.body.data.id } });
    expect(entry!.userId).toBe(donoB.id);
    expect(entry!.userId).not.toBe(donoA.id);
  });

  /**
   * Leitura: o balancete do dono B não pode enxergar o razão do dono A. As DUAS metades do escopo
   * têm asserção — `userId` (fronteira de segurança) e `unitId` (sub-partição): um filtro que
   * casse só por `userId` passaria num teste de um eixo só.
   */
  it('inquilino: balancete e listagem só devolvem o próprio escopo (dono E unidade)', async () => {
    const criado = await post(donoA, lancamento('só do dono A', 3300));
    expect(criado.status).toBe(201);

    const doB = await request(app)
      .get('/api/accounting/entries')
      .set(authHeader(donoB))
      .query({ unitId: UNIT });
    expect(doB.status).toBe(200);
    expect(doB.body.data.entries.map((e: { id: string }) => e.id)).not.toContain(criado.body.data.id);

    // Mesmo dono, OUTRA unidade: a sub-partição também separa.
    const outraUnidade = await request(app)
      .get('/api/accounting/entries')
      .set(authHeader(donoA))
      .query({ unitId: UNIT_OUTRA });
    expect(outraUnidade.status).toBe(200);
    expect(outraUnidade.body.data.entries.map((e: { id: string }) => e.id)).not.toContain(criado.body.data.id);

    // Controle: o PRÓPRIO dono, na PRÓPRIA unidade, enxerga — os dois "not.toContain" acima não
    // estão medindo uma listagem quebrada para todo mundo.
    const doA = await request(app)
      .get('/api/accounting/entries')
      .set(authHeader(donoA))
      .query({ unitId: UNIT });
    expect(doA.body.data.entries.map((e: { id: string }) => e.id)).toContain(criado.body.data.id);
  });

  /**
   * ESCRITA cross-tenant, que é o dano maior da leitura: o dono B não estorna lançamento do dono A.
   * 404 e não 403 é deliberado (anti-enumeração — a resposta não confirma que o id existe).
   */
  it('inquilino: dono B não estorna lançamento do dono A — nada escrito de nenhum lado', async () => {
    const criado = await post(donoA, lancamento('do dono A, intocável', 7700));
    const antesB = await contagemDe(donoB.id);

    const res = await request(app)
      .post('/api/accounting/reverse')
      .set(authHeader(donoB))
      .send({ unitId: UNIT, lancamentoId: criado.body.data.id, reversalPostingDate: DATA, reason: 'cross-tenant' });

    expect(res.status).toBe(404);
    expect(await contagemDe(donoB.id)).toEqual(antesB); // nada para o B
    const original = await prisma.journalEntry.findUnique({ where: { id: criado.body.data.id } });
    expect(original!.reversedById).toBeNull(); // nem no razão do A
    expect(original!.status).toBe('Posted');

    // Controle: o PRÓPRIO dono estorna o mesmo lançamento — o 404 acima é da guarda, não de pane.
    const doDono = await request(app)
      .post('/api/accounting/reverse')
      .set(authHeader(donoA))
      .send({ unitId: UNIT, lancamentoId: criado.body.data.id, reversalPostingDate: DATA, reason: 'controle' });
    expect(doDono.status).toBe(200);
    expect((await prisma.journalEntry.findUnique({ where: { id: criado.body.data.id } }))!.reversedById).not.toBeNull();
  });

  // ══════════════════════════════════════════════════════════ AUTORIZA
  //
  // O QUE A MEDIÇÃO DESTE BLOCO ACHOU, e que vale mais do que um kill: nesta rota o fail-closed é
  // DUPLAMENTE guardado, e por isso NENHUMA mutação de uma linha o derruba. As duas foram tentadas:
  //   · pôr `/api/accounting` POST em `publicApiRoutes` (auth.ts:41) — os 4 casos seguem VERDES:
  //     o middleware libera, mas o controller ainda não tem identidade (os headers `x-user-*` foram
  //     derrubados) e o próprio `if (!user) throw new UnauthorizedError()` devolve o mesmo 401;
  //   · tirar esse `throw` do controller (accountingController.ts:32) — NÃO COMPILA: `tsc` recusa
  //     `UserContext | null` em `resolveAccountingScope(user, …)`. Ali a guarda é do TIPO, não do
  //     teste, e é por isso que ela não some numa refatoração distraída.
  // Logo: estes 4 casos são barreira do PAR (middleware + guarda do controller), não de cada metade.
  // Vender aqui um kill de mutação seria vitória declarada — o par só cai com as duas juntas.
  /**
   * FAIL-CLOSED: o `authMiddleware` é deny-by-default — montar a rota não concede acesso. O caso
   * confere as duas coisas que importam num 401 de escrita: o status E o razão intacto. Um 401 que
   * já escreveu não é uma recusa, é um vazamento com mensagem de erro.
   */
  it('autoriza: POST /post sem token é 401 e não escreve nada', async () => {
    const antes = await contagemDe(donoA.id);

    const res = await post(null, lancamento('sem token', 9900));

    expect(res.status).toBe(401);
    expect(await contagemDe(donoA.id)).toEqual(antes);
  });

  /** Token inválido não é "sem token": tem de cair no mesmo 401, nunca passar por não-verificável. */
  it('autoriza: token inválido é 401 (não 500, não 200)', async () => {
    const res = await request(app)
      .post('/api/accounting/post')
      .set('Authorization', 'Bearer nao-e-um-jwt-de-verdade')
      .send(lancamento('token furado', 9900));

    expect(res.status).toBe(401);
  });

  /**
   * O `x-user-*` forjado SEM token nenhum — a outra metade do caso de spoof acima. Lá havia token
   * válido e o header perdia; aqui não há token, e o header não pode virar credencial. Se o
   * middleware deixasse a cópia inbound passar, este pedido seria escrita autenticada como o dono A
   * feita por quem não tem conta.
   */
  it('autoriza: x-user-* forjado SEM token é 401 — header não é credencial', async () => {
    const antes = await contagemDe(donoA.id);

    const res = await request(app)
      .post('/api/accounting/post')
      .set('x-user-id', donoA.id)
      .set('x-user-username', donoA.username)
      .set('x-user-role', 'ADMIN')
      .send(lancamento('spoof puro', 8800));

    expect(res.status).toBe(401);
    expect(await contagemDe(donoA.id)).toEqual(antes);
  });

  /**
   * HEAD É DERIVADO DE GET pelo Express (classe registrada
   * `critical-auth-bypass-case-sensitive-guard`): uma regra chaveada por método que lê o verbo cru
   * vê `HEAD !== 'GET'` e para de valer em silêncio. O corpo vem vazio por definição do verbo, então
   * o STATUS é a única evidência que existe aqui.
   *
   * O QUE ESTE CASO É, MEDIDO: caracterização e guarda de regressão — NÃO a barreira da dobra
   * HEAD→GET. Trocar `routedMethod` por `return method` (auth.ts:76) deixa este teste VERDE; a
   * mutação foi aplicada e sobreviveu. A razão: `routedMethod` só decide `isPublic`/`isAdminOnly`, e
   * o mount de contabilidade não é público nem admin-only — HEAD aqui cai no MESMO deny-by-default
   * do GET com dobra ou sem ela. O raio de dano da dobra é `/api/users` (admin-only), não este
   * mount, e é lá que a barreira dela tem de morar.
   * O que este caso trava, então, é o futuro: no dia em que um GET de contabilidade entrar em
   * `publicApiRoutes`, o gêmeo HEAD não pode virar buraco sem alguém reprovar aqui.
   */
  it('autoriza: HEAD num relatório de razão sem token é 401, igual ao GET', async () => {
    const semToken = await request(app).head('/api/accounting/trial-balance').query({ unitId: UNIT });
    expect(semToken.status).toBe(401);

    // Controle nos dois eixos: o GET equivalente também é 401 (a regra vale para o par), e o
    // mesmo HEAD COM token é 200 — sem isto, um endpoint quebrado devolveria 401 para todo mundo.
    const getSemToken = await request(app).get('/api/accounting/trial-balance').query({ unitId: UNIT });
    expect(getSemToken.status).toBe(401);
    const comToken = await request(app)
      .head('/api/accounting/trial-balance')
      .set(authHeader(donoA))
      .query({ unitId: UNIT });
    expect(comToken.status).toBe(200);
  });
});
