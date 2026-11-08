/**
 * CONTRATO HTTP do cadastro de contador + entrega ao contador (BE-INCR-CONTADOR-DELIVERY) — app
 * Express REAL sobre supertest + SQLite REAL (molde: `spedController.ecfReal.integration.test.ts`).
 *
 * Nasceu do review independente de 2026-09-10 (achados F7 e F1): as 8 rotas não tinham NENHUM teste
 * de nível HTTP — os guards de divergência `:id × body` (a defesa contra a classe
 * `param-aceito-e-ignorado`) podiam ser apagados sem que a suíte notasse, e o rate limit por escopo
 * do item 20 do BRIEF simplesmente não existia. As invariantes daqui moram na FIAÇÃO (auth
 * deny-by-default → limiter → rota → DTO → controller), não no corpo do handler — por isso
 * integração, não unit. Cada negativo carrega o seu controle positivo.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-contact-http';

let dono: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

const contatoBody = (over: Record<string, unknown> = {}) => ({
  unitId: UNIT,
  name: 'Contabilidade HTTP',
  email: 'http@exemplo.com.br',
  cpf: '529.982.247-25',
  crcNumber: 'SP-000777/O-1',
  crcUf: 'SP',
  ...over,
});

describe('/api/accounting/contacts + /delivery — contrato HTTP', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('contact-http-a');
    for (const id of [UNIT, `${UNIT}-rl`, `${UNIT}-rl-2`, `${UNIT}-rl-nan`, `${UNIT}-alheio`, `${UNIT}-arquivado`]) {
      await seedUnit({ userId: dono.id, id });
    }
    // ECF 3C (item 11): a geração da ECF Real exige os 4 trimestres da Parte B fechados (sem contas — C1).
    for (const quarter of ['T01', 'T02', 'T03', 'T04']) {
      const r = await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId: UNIT, year: 2025, quarter });
      expect(r.status).toBe(200);
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ deny-by-default
  it('sem Bearer, as rotas novas respondem 401 (nascem protegidas)', async () => {
    expect((await request(app).get('/api/accounting/contacts').query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).post('/api/accounting/contacts').send(contatoBody())).status).toBe(401);
    expect((await request(app).post('/api/accounting/delivery/build').send({})).status).toBe(401);
  });

  // ------------------------------------------------------------------ controle positivo
  it('CONTROLE: POST /contacts cria (201) e GET /contacts lista a linha', async () => {
    const created = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send(contatoBody());
    expect(created.status).toBe(201);
    expect(created.body.data.crcUf).toBe('SP');

    const listed = await request(app).get('/api/accounting/contacts').set(authHeader(dono)).query({ unitId: UNIT });
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((c: { id: string }) => c.id === created.body.data.id)).toBe(true);
  });

  it('.strict() vira 400 de verdade na borda (chave desconhecida no corpo)', async () => {
    const res = await request(app)
      .post('/api/accounting/contacts')
      .set(authHeader(dono))
      .send(contatoBody({ crc: 'campo-antigo' }));
    expect(res.status).toBe(400);
  });

  // ------------------------------------------------------------------ review F7 — guards :id × body
  it('PATCH /contacts/:id com contactId do corpo DIVERGENTE do :id é 400 — nunca um dos dois ignorado', async () => {
    const created = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send(contatoBody());
    const id = created.body.data.id as string;

    const divergente = await request(app)
      .patch(`/api/accounting/contacts/${id}`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, contactId: 'outro-id', email: 'novo@exemplo.com.br' });
    expect(divergente.status).toBe(400);
    expect(String(divergente.body.error)).toMatch(/diverge/);

    // controle: com os dois iguais, o PATCH escreve
    const ok = await request(app)
      .patch(`/api/accounting/contacts/${id}`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, contactId: id, email: 'novo@exemplo.com.br' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.email).toBe('novo@exemplo.com.br');
  });

  it('POST /delivery/:id/retry com deliveryId divergente do :id é 400 antes de tocar o serviço', async () => {
    const res = await request(app)
      .post('/api/accounting/delivery/qualquer-id/retry')
      .set(authHeader(dono))
      .send({ unitId: UNIT, deliveryId: 'outro-id' });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/diverge/);
  });

  // ------------------------------------------------------------------ F2 — a "via barata" (cédula 10/09 §6)
  /**
   * `signerContactIds` no corpo da geração SPED vira signatário J930 do cadastro, ANTES do
   * `.strict()`. Prova de ponta a ponta no esqueleto da ECF Lucro Real (o único gerador que roda
   * sobre banco vazio): o arquivo gerado carrega a linha J930 do contador com o CRC do cadastro, e
   * o job gravou o período (F3 → Fork Novo A → b) — sem `year` digitado em lugar nenhum da entrega.
   */
  const ecfRealBody = (over: Record<string, unknown> = {}) => ({
    unitId: UNIT,
    year: 2025,
    declarant: {
      cnpj: '11222333000181', nome: 'INDUSTRIA TESTE LTDA', codNat: '2062', cnaeFiscal: '9602501',
      endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'DF', codMun: '5300108',
      cep: '70000000', email: 'industria@teste.com',
    },
    fiscal: { formaTrib: '1', formaTribPer: 'RRRR' },
    signers: [
      { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
    ],
    // BE-INCR-ECF-Y600: o Y600 exige ≥ 1 ocorrência (item 11); sem sócio cadastrado, um dirigente transiente (item 5).
    socios: [],
    dirigentes: [{ nome: 'DIRETORA', cpf: '52998224725', qualif: '10', dtAltSoc: '2020-01-01', valores: { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 } }],
    ...over,
  });

  it('signerContactIds expande o contador do cadastro no 0930 da ECF gerada, e o job grava o período', async () => {
    const created = await request(app)
      .post('/api/accounting/contacts')
      .set(authHeader(dono))
      .send(contatoBody({ phone: '(61) 3333-4444' }));
    const contactId = created.body.data.id as string;

    const gen = await request(app)
      .post('/api/accounting/sped/ecf/real/generate')
      .set(authHeader(dono))
      .send(ecfRealBody({ signerContactIds: [contactId] }));
    expect(gen.status).toBe(201);

    const job = await prisma.accountingDataExchangeJob.findUnique({ where: { id: gen.body.data.id } });
    expect(job?.periodStart?.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(job?.periodEnd?.toISOString()).toBe('2025-12-31T00:00:00.000Z');

    const file = await request(app)
      .get(`/api/accounting/data-exchange/jobs/${gen.body.data.id}/download`)
      .query({ unitId: UNIT })
      .set(authHeader(dono));
    expect(file.status).toBe(200);
    // ECF = registro 0930 (a ECD usa o J930 — shapes diferentes, mesmo contato)
    const r0930 = String(file.text).split(/\r?\n/).filter((l) => l.startsWith('|0930|'));
    expect(r0930.some((l) => l.includes('SP-000777/O-1') && l.includes('|900|'))).toBe(true);
  });

  /**
   * O J930 da ECD — shape diferente do 0930 (descrição + codAssin + ufCrc + numSeqCrc + dtCrc +
   * indRespLegal). O review de 2026-09-10 (B-iv) derrubou a justificativa "a ECD exige mapeamento
   * referencial em banco vazio" — ele gerou uma ECD e deu 201. Sem este teste, trocar o mapper do
   * ramo ECD pelo da ECF sobrevivia à suíte (mutação M9c).
   */
  const ecdBody = (over: Record<string, unknown> = {}) => ({
    unitId: UNIT,
    mappingVersion: 'RFB-2024',
    year: 2026,
    declarant: {
      nome: 'Salão Luminaris ME', cnpj: '12345678000199', uf: 'SP', codMun: '3550308',
      indNire: '0', indGrandePorte: '0',
    },
    book: { numOrd: '1', natLivr: 'Livro Diário', dtExSocial: '2026-12-31' },
    // C12: IDENT_QUALIF (campo 04) não existe mais no DTO — é derivado de codAssin; CPF com DV
    // válido (item 5, '55566677788' tinha DV inválido e só passava por ser regex de forma).
    signers: [
      { identNom: 'Sócio', identCpfCnpj: '55566677720', codAssin: '309', indRespLegal: 'S' },
    ],
    ...over,
  });

  it('signerContactIds expande o contador no J930 da ECD gerada (shape da ECD, não o 0930)', async () => {
    const created = await request(app)
      .post('/api/accounting/contacts')
      .set(authHeader(dono))
      .send(contatoBody({ phone: '(61) 3333-4444', crcCertificate: 'SP/2026/000123', crcCertificateValidUntil: '2026-12-31' }));
    const contactId = created.body.data.id as string;

    const gen = await request(app)
      .post('/api/accounting/sped/ecd/generate')
      .set(authHeader(dono))
      .send(ecdBody({ signerContactIds: [contactId] }));
    expect(gen.status).toBe(201);
    // o período do job vem exposto na resposta (review achado 10) — é o que diz que ele é entregável
    expect(gen.body.data.periodStart).toBe('2026-01-01');
    expect(gen.body.data.periodEnd).toBe('2026-12-31');

    const file = await request(app)
      .get(`/api/accounting/data-exchange/jobs/${gen.body.data.id}/download`)
      .query({ unitId: UNIT })
      .set(authHeader(dono));
    expect(file.status).toBe(200);
    const j930 = String(file.text).split(/\r?\n/).filter((l) => l.startsWith('|J930|'));
    const contador = j930.find((l) => l.includes('SP-000777/O-1'));
    expect(contador).toBeDefined();
    // campos que só o J930 tem: descrição 'Contador', codAssin 900, UF do CRC, certidão, validade DDMMAAAA, resp. legal N
    expect(contador).toContain('|Contador|900|');
    expect(contador).toContain('|SP|SP/2026/000123|31122026|N|');
  });

  // Review-delta M12: sem o dedupe, [id, id] + 1 sócio estoura o `.max(2)` da ECF (400). Com ele, 201.
  it('signerContactIds duplicado vira UM signatário (a ECF aceita no máximo 2)', async () => {
    const created = await request(app)
      .post('/api/accounting/contacts')
      .set(authHeader(dono))
      .send(contatoBody({ phone: '(61) 3333-4444' }));
    const id = created.body.data.id as string;
    const gen = await request(app)
      .post('/api/accounting/sped/ecf/real/generate')
      .set(authHeader(dono))
      .send(ecfRealBody({ signerContactIds: [id, id] }));
    expect(gen.status).toBe(201);
  });

  it('signerContactIds malformado é 400 (o .strict() recusa a chave que o controller não consumiu)', async () => {
    for (const bad of ['abc', [1, 2], [''], { a: 1 }, null]) {
      const res = await request(app)
        .post('/api/accounting/sped/ecf/real/generate')
        .set(authHeader(dono))
        .send(ecfRealBody({ signerContactIds: bad }));
      expect(res.status).toBe(400);
    }
  });

  it('signerContactIds com contato inexistente/alheio é 404 (escopo), e sem contador nenhum é 400 (controle)', async () => {
    const notFound = await request(app)
      .post('/api/accounting/sped/ecf/real/generate')
      .set(authHeader(dono))
      .send(ecfRealBody({ signerContactIds: ['nao-existe'] }));
    expect(notFound.status).toBe(404);

    // 0930 exige FONE: contato SEM telefone não assina a ECF pela via barata — 400 nomeando o contato
    const semFone = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send(contatoBody());
    const semFoneRes = await request(app)
      .post('/api/accounting/sped/ecf/real/generate')
      .set(authHeader(dono))
      .send(ecfRealBody({ signerContactIds: [semFone.body.data.id] }));
    expect(semFoneRes.status).toBe(400);
    expect(String(semFoneRes.body.message)).toMatch(/telefone/); // handleApiError: { code, message }

    // controle: sem signerContactIds e sem contador nos signers, o DTO reprova (REGRA_OBRIGATORIO_ASSIN_CONTADOR)
    const noContador = await request(app)
      .post('/api/accounting/sped/ecf/real/generate')
      .set(authHeader(dono))
      .send(ecfRealBody());
    expect(noContador.status).toBe(400);
  });

  // F-17-1 (H2 passo 17, handoff 2026-11-02 §C6): o 400 do "contador sem telefone" mostrava o id do
  // contato — o operador não sabe qual cadastro corrigir. A mensagem nomeia o contato pelo NOME.
  it('contador sem telefone: o 400 da ECF nomeia o contato pelo nome, não pelo id (F-17-1)', async () => {
    const semFone = await request(app)
      .post('/api/accounting/contacts')
      .set(authHeader(dono))
      .send(contatoBody({ name: 'Escritorio Sem Fone F171' }));
    const semFoneId = semFone.body.data.id as string;
    const res = await request(app)
      .post('/api/accounting/sped/ecf/real/generate')
      .set(authHeader(dono))
      .send(ecfRealBody({ signerContactIds: [semFoneId] }));
    expect(res.status).toBe(400);
    const message = String(res.body.message);
    expect(message).toMatch(/telefone/);
    expect(message).not.toContain(semFoneId);
    expect(message).toContain('Escritorio Sem Fone F171');

    // controle: o mesmo cadastro com telefone gera a ECF normalmente
    const comFone = await request(app)
      .post('/api/accounting/contacts')
      .set(authHeader(dono))
      .send(contatoBody({ name: 'Escritorio Com Fone F171', phone: '(61) 3333-4444' }));
    const gen = await request(app)
      .post('/api/accounting/sped/ecf/real/generate')
      .set(authHeader(dono))
      .send(ecfRealBody({ signerContactIds: [comFone.body.data.id] }));
    expect(gen.status).toBe(201);
  });

  // ------------------------------------------------------------------ review F1 — item 20 do BRIEF
  /**
   * Rate limit POR ESCOPO no comando `confirmDelivery`. O limiter global de `app.ts` é por IP e
   * frouxo de propósito (5000/15min); este é o freio do comando que escreve no log de entrega. O
   * teto é lido do ambiente A CADA REQUISIÇÃO (`DELIVERY_CONFIRM_RATE_LIMIT`), o que permite
   * apertá-lo aqui sem reconstruir o app. Corpo inválido de propósito: o limiter conta a
   * requisição ANTES do DTO — é o que impede o loop de custar 12 leituras de período por chamada.
   */
  it('POST /delivery/confirm devolve 429 na (N+1)-ésima chamada do mesmo escopo dentro da janela', async () => {
    process.env.DELIVERY_CONFIRM_RATE_LIMIT = '3';
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 4; i += 1) {
        const res = await request(app)
          .post('/api/accounting/delivery/confirm')
          .set(authHeader(dono))
          .send({ unitId: `${UNIT}-rl` });
        statuses.push(res.status);
      }
      // 3 passam pelo limiter (e caem no DTO, 400); a 4ª é barrada pelo limiter (429).
      expect(statuses.slice(0, 3)).toEqual([400, 400, 400]);
      expect(statuses[3]).toBe(429);

      // Review-delta M6b: chave constante ('GLOBAL') passava no caso acima. A cota é POR ESCOPO —
      // outro ator no mesmo unitId e o mesmo ator em outro unitId ainda têm cota inteira.
      const outroAtor: { id: string; username: string } = await criarUsuario('contact-http-b');
      const doOutroAtor = await request(app)
        .post('/api/accounting/delivery/confirm')
        .set(authHeader(outroAtor))
        .send({ unitId: `${UNIT}-rl` });
      expect(doOutroAtor.status).toBe(400);
      const outraUnidade = await request(app)
        .post('/api/accounting/delivery/confirm')
        .set(authHeader(dono))
        .send({ unitId: `${UNIT}-rl-2` });
      expect(outraUnidade.status).toBe(400);
    } finally {
      delete process.env.DELIVERY_CONFIRM_RATE_LIMIT;
    }
  });

  // Review-delta obs. 1: env inválido cai no padrão (60), nunca em "sem limite".
  it('DELIVERY_CONFIRM_RATE_LIMIT inválido NÃO desliga o limiter (cai no padrão)', async () => {
    process.env.DELIVERY_CONFIRM_RATE_LIMIT = 'abc';
    try {
      const res = await request(app)
        .post('/api/accounting/delivery/confirm')
        .set(authHeader(dono))
        .send({ unitId: `${UNIT}-rl-nan` });
      expect(res.status).toBe(400);
      expect(Number(res.headers['ratelimit-limit'])).toBe(60);
    } finally {
      delete process.env.DELIVERY_CONFIRM_RATE_LIMIT;
    }
  });

  // ------------------------------------------------------------------ C6b PR-3, Passo 13 — perfil de pacote
  /**
   * GET/PUT /api/accounting/delivery/profile (F-C6b-2 a). Registrado ANTES de /delivery/:id (senão
   * "profile" casaria como :id) — este bloco prova que a rota estática realmente resolve para o
   * handler certo, não para GET /delivery/:id com id="profile".
   */
  describe('/delivery/profile — perfil de pacote sugerido', () => {
    it('GET devolve kinds: [] quando o contato nunca teve perfil salvo (nunca 404)', async () => {
      const created = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send(contatoBody());
      const contactId = created.body.data.id as string;

      const res = await request(app)
        .get('/api/accounting/delivery/profile')
        .set(authHeader(dono))
        .query({ unitId: UNIT, contactId });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ kinds: [] });
    });

    it('PUT grava e GET lê de volta o mesmo perfil', async () => {
      const created = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send(contatoBody());
      const contactId = created.body.data.id as string;
      const kinds = ['EXPORT_TRIAL_BALANCE', 'EXPORT_GENERAL_LEDGER'];

      const put = await request(app)
        .put('/api/accounting/delivery/profile')
        .set(authHeader(dono))
        .query({ unitId: UNIT, contactId })
        .send({ kinds });
      expect(put.status).toBe(200);
      expect(put.body.data).toEqual({ kinds });

      const get = await request(app)
        .get('/api/accounting/delivery/profile')
        .set(authHeader(dono))
        .query({ unitId: UNIT, contactId });
      expect(get.body.data).toEqual({ kinds });
    });

    it('PUT com kind fora do enum entregável é 400 (SPED não é perfil de extra)', async () => {
      const created = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send(contatoBody());
      const contactId = created.body.data.id as string;

      const res = await request(app)
        .put('/api/accounting/delivery/profile')
        .set(authHeader(dono))
        .query({ unitId: UNIT, contactId })
        .send({ kinds: ['EXPORT_SPED_ECD'] });
      expect(res.status).toBe(400);
    });

    it('PUT/.GET em contato de OUTRO escopo (ou arquivado) é 404, nunca 403 (D8/ACC-CD-4)', async () => {
      const outroAtor: { id: string; username: string } = await criarUsuario('contact-http-profile-b');
      await seedUnit({ userId: outroAtor.id, id: `${UNIT}-alheio-b` });
      const alheio = await request(app).post('/api/accounting/contacts').set(authHeader(outroAtor)).send(contatoBody({ unitId: `${UNIT}-alheio-b` }));
      const alheioId = alheio.body.data.id as string;

      const getAlheio = await request(app)
        .get('/api/accounting/delivery/profile')
        .set(authHeader(dono))
        .query({ unitId: `${UNIT}-alheio`, contactId: alheioId });
      expect(getAlheio.status).toBe(404);

      const putAlheio = await request(app)
        .put('/api/accounting/delivery/profile')
        .set(authHeader(dono))
        .query({ unitId: `${UNIT}-alheio`, contactId: alheioId })
        .send({ kinds: [] });
      expect(putAlheio.status).toBe(404);

      // Contato arquivado do PRÓPRIO dono também é 404 (leitura de linha viva, mesma regra do resto do serviço).
      const proprio = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send(contatoBody({ unitId: `${UNIT}-arquivado` }));
      const proprioId = proprio.body.data.id as string;
      const arquivar = await request(app).delete(`/api/accounting/contacts/${proprioId}`).set(authHeader(dono)).query({ unitId: `${UNIT}-arquivado` });
      expect(arquivar.status).toBe(200);
      const getArquivado = await request(app)
        .get('/api/accounting/delivery/profile')
        .set(authHeader(dono))
        .query({ unitId: `${UNIT}-arquivado`, contactId: proprioId });
      expect(getArquivado.status).toBe(404);
    });
  });
});

// ── FIX-MENSAGENS-ID-INTERNO lote 3 (FIX-TESTES item 5; F-MSG-1 a, F-MSG-2 a1) ───────────────────────────────────────────
// Rótulos ratificados pelo dono (chat, 05/11, regra 5): job = "<tipo> de dd/mm/aaaa a dd/mm/aaaa" (sem período: "<tipo> gerada em
// dd/mm/aaaa"); revisão = "revisão do exercício <ano>"; contato = o nome; entrega = "entrega de dd/mm/aaaa a dd/mm/aaaa".
// Eco do id do pedido sem registro achado FICA; id de job/revisão/contato JÁ carregado é nomeado pelo rótulo.
// Fixtures por `prisma.*` (montar uma ECD/ECF reais não é o que estas mensagens testam; mesmo atalho do `deliveryList`).
describe('FIX-MENSAGENS-ID-INTERNO lote 3 — entrega: a mensagem nomeia o job, a revisão e a entrega, nunca pelo cuid', () => {
  const UNIT = 'unit-delivery-msg';
  let donoMsg: { id: string; username: string };
  let contato: { id: string };

  /** Status certo, a mensagem contém o rótulo e não contém nenhum dos cuids. A `msg` vai no objeto para o diff mostrá-la. */
  const nomeiaSemId = (res: request.Response, status: number, rotulo: string, ...ids: string[]) => {
    const msg = String(res.body.message);
    expect({ status: res.status, nomeiaRotulo: msg.includes(rotulo), cuidNaMensagem: ids.filter((id) => msg.includes(id)), msg }).toEqual({
      status,
      nomeiaRotulo: true,
      cuidNaMensagem: [],
      msg,
    });
  };
  const dmy = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  const ANO = { start: new Date(Date.UTC(2026, 0, 1)), end: new Date(Date.UTC(2026, 11, 31)) };
  const criarJob = (kind: string, over: Record<string, unknown> = {}) =>
    prisma.accountingDataExchangeJob.create({
      data: {
        userId: donoMsg.id,
        unitId: UNIT,
        direction: 'EXPORT',
        kind,
        status: 'EXPORTED',
        requestedById: donoMsg.id,
        sha256: 'd'.repeat(64),
        periodStart: ANO.start,
        periodEnd: ANO.end,
        ...over,
      },
    });
  const par = async (ecdOver: Record<string, unknown> = {}, ecfOver: Record<string, unknown> = {}) => ({
    ecd: await criarJob('EXPORT_SPED_ECD', ecdOver),
    ecf: await criarJob('EXPORT_SPED_ECF', ecfOver),
  });
  const revisao = (ecdJobId: string, ecfJobId: string, status: 'OPEN' | 'SIGNED_OFF' | 'REJECTED') =>
    prisma.accountingReview.create({
      data: { userId: donoMsg.id, unitId: UNIT, year: 2026, ecdJobId, ecfJobId, status, reviewerUserId: donoMsg.id, closeReason: status === 'REJECTED' ? 'saldo errado' : null },
    });
  const build = (ecdJobId: string, ecfJobId: string, extraJobIds: string[] = []) =>
    request(app).post('/api/accounting/delivery/build').set(authHeader(donoMsg)).send({ unitId: UNIT, ecdJobId, ecfJobId, extraJobIds });
  const confirm = (ecdJobId: string, ecfJobId: string, extraJobIds: string[] = []) =>
    request(app).post('/api/accounting/delivery/confirm').set(authHeader(donoMsg)).send({ unitId: UNIT, ecdJobId, ecfJobId, contactId: contato.id, confirmed: true, extraJobIds });
  /** Par com revisão assinada: o único jeito de chegar nos extras. */
  const parAssinado = async () => {
    const p = await par();
    await revisao(p.ecd.id, p.ecf.id, 'SIGNED_OFF');
    return p;
  };

  beforeAll(async () => {
    pushTestSchema();
    donoMsg = await prisma.user.create({ data: { name: 'delivery-msg', username: 'delivery-msg', email: 'delivery-msg@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: donoMsg.id, id: UNIT });
    for (let month = 1; month <= 12; month++) {
      await prisma.accountingPeriod.create({ data: { userId: donoMsg.id, unitId: UNIT, year: 2026, month, status: 'HARD_CLOSED', openedAt: new Date() } });
    }
    contato = await prisma.accountingContact.create({
      data: { userId: donoMsg.id, unitId: UNIT, name: 'Contadora Msg', email: 'c@x.com', cpf: '52998224725', crcNumber: 'SP-000777/O-1', crcUf: 'SP' },
    });
  }, 120000);

  it('AccountingDeliveryService:355 — ECD substituta sem ECF retificadora (400) nomeia o job por tipo + período, não o cuid', async () => {
    const { ecd, ecf } = await par({ ecfRectificationRequired: true });
    nomeiaSemId(await build(ecd.id, ecf.id), 400, 'ECD de 01/01/2026 a 31/12/2026', ecd.id);
  });

  it('AccountingDeliveryService:372 — job que não é ECD (400) nomeia o job por tipo + período, não o cuid', async () => {
    const p = await par();
    nomeiaSemId(await build(p.ecf.id, p.ecf.id), 400, 'ECF de 01/01/2026 a 31/12/2026', p.ecf.id);
  });

  it('AccountingDeliveryService:375 — job que não é ECF (400) nomeia o job por tipo + período, não o cuid', async () => {
    const p = await par();
    nomeiaSemId(await build(p.ecd.id, p.ecd.id), 400, 'ECD de 01/01/2026 a 31/12/2026', p.ecd.id);
  });

  it('AccountingDeliveryService:380 — job que não está EXPORTED (400) nomeia o job por tipo + período, não o cuid', async () => {
    const { ecd, ecf } = await par({ status: 'FAILED' });
    nomeiaSemId(await build(ecd.id, ecf.id), 400, 'ECD de 01/01/2026 a 31/12/2026', ecd.id);
  });

  it('AccountingDeliveryService:385 — job sem sha256 gravado (400) nomeia o job por tipo + período, não o cuid', async () => {
    const { ecd, ecf } = await par({}, { sha256: null });
    nomeiaSemId(await build(ecd.id, ecf.id), 400, 'ECF de 01/01/2026 a 31/12/2026', ecf.id);
  });

  it('AccountingDeliveryService:390 — job sem período gravado (400) nomeia o job pela data de geração, não o cuid', async () => {
    const { ecd, ecf } = await par({ periodStart: null, periodEnd: null });
    nomeiaSemId(await build(ecd.id, ecf.id), 400, `ECD gerada em ${dmy(ecd.createdAt)}`, ecd.id);
  });

  it('AccountingReviewService:493 — par com revisão REJEITADA (409) nomeia a revisão do exercício, não o cuid', async () => {
    const { ecd, ecf } = await par();
    const r = await revisao(ecd.id, ecf.id, 'REJECTED');
    const res = await build(ecd.id, ecf.id);
    expect(res.body.code).toBe('REVIEW_REJECTED');
    nomeiaSemId(res, 409, 'revisão do exercício 2026', r.id, ecd.id, ecf.id);
  });

  it('AccountingReviewService:499 — par com revisão ainda OPEN (409) nomeia a revisão do exercício, não o cuid', async () => {
    const { ecd, ecf } = await par();
    const r = await revisao(ecd.id, ecf.id, 'OPEN');
    const res = await build(ecd.id, ecf.id);
    expect(res.body.code).toBe('REVIEW_REQUIRED');
    nomeiaSemId(res, 409, 'revisão do exercício 2026', r.id, ecd.id, ecf.id);
  });

  it('AccountingDeliveryService:443 — extra que não está EXPORTED (400) nomeia o extra por tipo + período, não o cuid', async () => {
    const { ecd, ecf } = await parAssinado();
    const extra = await criarJob('EXPORT_TRIAL_BALANCE', { status: 'FAILED' });
    nomeiaSemId(await build(ecd.id, ecf.id, [extra.id]), 400, 'TRIAL_BALANCE de 01/01/2026 a 31/12/2026', extra.id);
  });

  it('AccountingDeliveryService:447 — extra sem sha256 gravado (400) nomeia o extra por tipo + período, não o cuid', async () => {
    const { ecd, ecf } = await parAssinado();
    const extra = await criarJob('EXPORT_TRIAL_BALANCE', { sha256: null });
    nomeiaSemId(await build(ecd.id, ecf.id, [extra.id]), 400, 'TRIAL_BALANCE de 01/01/2026 a 31/12/2026', extra.id);
  });

  it('AccountingDeliveryService:451 — extra de tipo não entregável (400) nomeia o extra por tipo + período, não o cuid', async () => {
    const { ecd, ecf } = await parAssinado();
    const extra = await criarJob('EXPORT_SPED_ECD');
    nomeiaSemId(await build(ecd.id, ecf.id, [extra.id]), 400, 'ECD de 01/01/2026 a 31/12/2026', extra.id);
  });

  it('AccountingDeliveryService:457 — extra sem período gravado (400) nomeia o extra pela data de geração, não o cuid', async () => {
    const { ecd, ecf } = await parAssinado();
    const extra = await criarJob('EXPORT_TRIAL_BALANCE', { periodStart: null, periodEnd: null });
    nomeiaSemId(await build(ecd.id, ecf.id, [extra.id]), 400, `TRIAL_BALANCE gerada em ${dmy(extra.createdAt)}`, extra.id);
  });

  it('AccountingDeliveryService:471 — dois extras do mesmo tipo com períodos que se cruzam (400) nomeia o 2º extra, não o cuid', async () => {
    const { ecd, ecf } = await parAssinado();
    const periodo = { periodStart: new Date(Date.UTC(2026, 0, 1)), periodEnd: new Date(Date.UTC(2026, 2, 31)) };
    const a = await criarJob('EXPORT_TRIAL_BALANCE', periodo);
    const b = await criarJob('EXPORT_TRIAL_BALANCE', { periodStart: new Date(Date.UTC(2026, 1, 1)), periodEnd: new Date(Date.UTC(2026, 3, 30)) });
    const res = await build(ecd.id, ecf.id, [a.id, b.id]);
    expect(res.body.code).toBe('DUPLICATE_KIND');
    nomeiaSemId(res, 400, 'TRIAL_BALANCE de 01/02/2026 a 30/04/2026', a.id, b.id);
  });

  it('AccountingDeliveryService:480 — extra fora do período do pacote (400) nomeia o extra por tipo + período, não o cuid', async () => {
    const { ecd, ecf } = await parAssinado();
    const extra = await criarJob('EXPORT_TRIAL_BALANCE', { periodStart: new Date(Date.UTC(2025, 0, 1)), periodEnd: new Date(Date.UTC(2025, 5, 30)) });
    const res = await build(ecd.id, ecf.id, [extra.id]);
    expect(res.body.code).toBe('EXTRA_PERIOD_OUT_OF_RANGE');
    nomeiaSemId(res, 400, 'TRIAL_BALANCE de 01/01/2025 a 30/06/2025', extra.id);
  });

  it('AccountingDeliveryService:512 — reentrega com outro conjunto de extras (409) nomeia os jobs, o contador e a entrega, não os cuids', async () => {
    const { ecd, ecf } = await parAssinado();
    const extra = await criarJob('EXPORT_TRIAL_BALANCE');
    const primeira = await confirm(ecd.id, ecf.id);
    expect(primeira.status).toBe(201);
    const res = await confirm(ecd.id, ecf.id, [extra.id]);
    expect(res.body.code).toBe('PACKAGE_ALREADY_DELIVERED');
    nomeiaSemId(res, 409, 'Contadora Msg', ecd.id, ecf.id, contato.id, primeira.body.data.deliveryId);
  });
});
