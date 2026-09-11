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
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

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
    fiscal: { formaTrib: '1', formaTribPer: 'XXXX' },
    signers: [
      { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
    ],
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
    signers: [
      { identNom: 'Sócio', identCpfCnpj: '55566677788', identQualif: 'Sócio', codAssin: '309', indRespLegal: 'S' },
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
});
