/**
 * X10a EMENDA-4 AL-PR-3 (AL-5, AL-6, AL-7, AL-12, AL-14; F-AL-2 a; L-AL-1, L-AL-6) — a fila servidor → assinador local
 * pela pilha real (régua A6): o assinador pareia pela rota dele, faz o long-poll com o heartbeat na query e devolve o
 * resultado; do outro lado, a fila do serviço (a mesma que os adaptadores usam) espera o resultado em memória. Banco
 * real, rotas reais, certificado de teste em software.
 */
import { createHash } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { DfeSignerCodigoViewSchema, DfeSignerTarefasRespostaSchema, DfeSignerViewSchema, type DfeSignerResultadoBody } from '@/features/accounting/dtos/DfeSignerDto';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { makeTestCert } from '@test/helpers/nfeSignature';
import { DFE_SIGNER_LEASE_MS } from '@/features/accounting/models/DfeSigner.model';

const app = makeApp();
const derB64 = (pem: string) => pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
const CERT = derB64(makeTestCert({ cnpj: '11444777000161', responsavelCpf: '52998224725' }));
const THUMB = createHash('sha256').update(Buffer.from(CERT, 'base64')).digest('hex');
const TAREFAS = '/api/dfe-assinador/v1/tarefas';
const CONTEUDO = { alvo: 'infNFe' as const, elementoXml: '<infNFe/>', signedInfoC14nB64: 'eA==', chave: '3'.repeat(44), tpAmb: '2' as const };

let dono: { id: string; username: string };
let centro: string;
let filial: string;
let token: string;

const poll = (q: Partial<Record<'espera' | 'versaoAssinador' | 'tokenPresente' | 'certThumbprintSha256', string>> = {}, t = token) =>
  request(app)
    .get(TAREFAS)
    .query({ espera: '0', versaoAssinador: '1.0.0', tokenPresente: 'true', certThumbprintSha256: THUMB, ...q })
    .set('Authorization', `Bearer ${t}`);
const resultado = (id: string, body: DfeSignerResultadoBody, t = token) =>
  request(app).post(`${TAREFAS}/${id}/resultado`).set('Authorization', `Bearer ${t}`).send(body);
const heartbeat = (id: string, t = token) => request(app).post(`${TAREFAS}/${id}/heartbeat`).set('Authorization', `Bearer ${t}`);
const ASSINADO: DfeSignerResultadoBody = { ok: true, tipo: 'ASSINAR', signatureValueB64: 'c2lnbmF0dXJl', certificadoDerB64: CERT };

async function parear(unitId: string, bearer?: string): Promise<string | undefined> {
  const c = await request(app).post(`/api/accounting/dfe-assinador/${unitId}/codigos`).set(authHeader(dono));
  const req = request(app).post('/api/dfe-assinador/v1/pareamento');
  if (bearer) req.set('Authorization', `Bearer ${bearer}`);
  const r = await req.send({ codigo: DfeSignerCodigoViewSchema.parse(c.body.data).codigo, nomeDispositivo: 'Caixa 1', versaoAssinador: '1.0.0', certificadoDerB64: CERT });
  expect(r.status).toBeLessThan(300);
  return r.body.token as string | undefined;
}
async function fila(unitId = centro) {
  const device = (await getFactory().getDfeSignerService().autenticarDispositivo(token))!;
  return getFactory().getDfeSignerTaskService().fila(device, resolveAccountingScopeInternal({ userId: dono.id }, unitId));
}
const deviceRow = async () => prisma.dfeSignerDevice.findFirstOrThrow({ where: { tokenHash: createHash('sha256').update(token).digest('hex') } });

describe('X10a EMENDA-4 AL-PR-3 — fila do assinador local pela HTTP', () => {
  const retomadas: string[] = [];

  beforeAll(async () => {
    pushTestSchema();
    process.env.DFE_PARTNER_ENV = 'homologacao';
    dono = await prisma.user.create({ data: { name: 'al3', username: 'al3-dono', email: 'al3@test.local', password: 'x', role: 'USER' } });
    const units = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Units', internalName: 'units', category: 'business', schema: { fields: [] } as never },
    });
    const unit = async (name: string, cnpj: string) => (await prisma.dynamicTableData.create({ data: { dynamicTableId: units.id, data: { name, cnpj } as never } })).id;
    centro = await unit('Centro', '11.444.777/0001-61');
    filial = await unit('Filial Norte', '11.444.777/0002-42');
    token = (await parear(centro))!;
    await parear(filial, token); // L-AL-2: o mesmo dispositivo serve as duas unidades
    getFactory().getDfeSignerTaskService().setOnRetomada(async (scope) => {
      retomadas.push(scope.unitId);
    });
  }, 120000);

  afterAll(async () => {
    getFactory().getDfeSignerTaskService().setOnRetomada(null);
    delete process.env.DFE_PARTNER_ENV;
    await prisma.$disconnect();
  });

  it('AL-14: o primeiro poll depois da queda dispara a retomada das unidades do dispositivo uma vez só (dois polls juntos)', async () => {
    retomadas.length = 0;
    const [a, b] = await Promise.all([poll(), poll()]);
    expect([a.status, b.status]).toEqual([204, 204]);
    await new Promise((r) => setImmediate(r));
    expect(retomadas.sort()).toEqual([centro, filial].sort());
    await poll();
    expect(retomadas).toHaveLength(2); // assinador no ar: o poll seguinte não retoma de novo
  });

  it('AL-12: o poll é o heartbeat — a view fica online, com a versão e o token; L-AL-6: outro certificado = sem token', async () => {
    await poll({ versaoAssinador: '1.2.3' });
    let v = DfeSignerViewSchema.parse((await request(app).get(`/api/accounting/dfe-assinador/${centro}`).set(authHeader(dono))).body.data);
    expect(v).toMatchObject({ online: true, tokenPresente: true, versaoAssinador: '1.2.3' });
    retomadas.length = 0;
    await poll({ certThumbprintSha256: 'f'.repeat(64) });
    v = DfeSignerViewSchema.parse((await request(app).get(`/api/accounting/dfe-assinador/${centro}`).set(authHeader(dono))).body.data);
    expect(v.tokenPresente).toBe(false);
    await poll(); // o certificado certo volta ⇒ retoma (estava sem token)
    await new Promise((r) => setImmediate(r));
    expect(retomadas.length).toBe(2);
  });

  it('AL-7: sem tarefa ⇒ 204 depois da espera; query inválida ⇒ 400 (tokenPresente "false" nunca vira true)', async () => {
    const t0 = Date.now();
    expect((await poll({ espera: '1' })).status).toBe(204);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(900);
    expect((await poll({ espera: '26' })).status).toBe(400);
    expect((await poll({ tokenPresente: 'sim' })).status).toBe(400);
    await poll({ tokenPresente: 'false' });
    expect((await deviceRow()).tokenPresente).toBe(false);
    await poll();
  });

  it('AL-7 + AL-6: com tarefa ⇒ o long-poll responde na hora; o resultado volta em memória e só o hash fica no banco (L-AL-1)', async () => {
    const espera = poll({ espera: '25' });
    const t0 = Date.now();
    const pendente = (await fila()).executar({ tipo: 'ASSINAR', algoritmo: 'rsa-sha1', digestB64: 'aGFzaA==', conteudo: CONTEUDO }, 10_000);
    const r = await espera;
    expect(Date.now() - t0).toBeLessThan(5_000);
    expect(r.status).toBe(200);
    const [tarefa] = DfeSignerTarefasRespostaSchema.parse(r.body).tarefas;
    expect(tarefa).toMatchObject({ tipo: 'ASSINAR', digestB64: 'aGFzaA==', conteudo: CONTEUDO });
    expect((await resultado(tarefa.id, ASSINADO)).body.data).toEqual({ idempotente: false });
    expect(await pendente).toEqual(ASSINADO);
    const row = await prisma.dfeSignerTask.findUniqueOrThrow({ where: { id: tarefa.id } });
    expect(row).toMatchObject({ status: 'DONE', payload: null, resultHash: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(JSON.stringify(row)).not.toContain(CERT.slice(0, 40));
  });

  it('AL-6: resultado duplicado ⇒ 200 sem efeito; com conteúdo diferente ⇒ 409; de outro tipo ⇒ 400', async () => {
    const pendente = (await fila()).executar({ tipo: 'ASSINAR', algoritmo: 'rsa-sha1', digestB64: 'aGFzaA==', conteudo: CONTEUDO }, 10_000);
    const [tarefa] = DfeSignerTarefasRespostaSchema.parse((await poll({ espera: '5' })).body).tarefas;
    expect((await resultado(tarefa.id, { ok: true, tipo: 'TRANSMITIR', httpStatus: 200, corpoB64: '' })).status).toBe(400);
    expect((await resultado(tarefa.id, ASSINADO)).status).toBe(200);
    await pendente;
    const dup = await resultado(tarefa.id, ASSINADO);
    expect([dup.status, dup.body.data]).toEqual([200, { idempotente: true }]);
    const outro = await resultado(tarefa.id, { ok: false, code: 'PIN_CANCELADO', message: 'cancelado' });
    expect([outro.status, outro.body.errorCode ?? outro.body.code ?? outro.body.error]).toEqual([409, expect.anything()]);
    expect(JSON.stringify(outro.body)).toContain('dfe_signer_resultado_conflitante');
  });

  it('AL-6: tarefa entregue sem resultado e sem heartbeat volta a ser entregue depois do lease (30 s); antes dele, não', async () => {
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'performance', 'hrtime'] });
    try {
      const pendente = (await fila()).executar({ tipo: 'ASSINAR', algoritmo: 'rsa-sha1', digestB64: 'aGFzaA==', conteudo: CONTEUDO }, 120_000);
      const [primeira] = DfeSignerTarefasRespostaSchema.parse((await poll({ espera: '5' })).body).tarefas;
      jest.setSystemTime(Date.now() + DFE_SIGNER_LEASE_MS - 1_000);
      expect((await poll()).status).toBe(204); // lease vivo: não reentrega
      jest.setSystemTime(Date.now() + 2_000); // passou do lease, sem heartbeat
      const [reentregue] = DfeSignerTarefasRespostaSchema.parse((await poll()).body).tarefas;
      expect(reentregue.id).toBe(primeira.id);
      expect((await resultado(primeira.id, ASSINADO)).status).toBe(200);
      await pendente;
    } finally {
      jest.useRealTimers();
    }
  });

  it('heartbeat: com heartbeat a cada 20 s (lease de 30 s) a tarefa não é reentregue, e cada heartbeat renova o lease', async () => {
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'performance', 'hrtime'] });
    try {
      const pendente = (await fila()).executar({ tipo: 'ASSINAR', algoritmo: 'rsa-sha1', digestB64: 'aGFzaA==', conteudo: CONTEUDO }, 120_000);
      const [tarefa] = DfeSignerTarefasRespostaSchema.parse((await poll({ espera: '5' })).body).tarefas;
      for (let i = 0; i < 3; i++) {
        jest.setSystemTime(Date.now() + 20_000);
        expect((await heartbeat(tarefa.id)).status).toBe(200);
        expect((await poll()).status).toBe(204); // renovada: não reentrega
      }
      expect((await resultado(tarefa.id, ASSINADO)).status).toBe(200);
      await pendente;
    } finally {
      jest.useRealTimers();
    }
  });

  it('heartbeat: tarefa de outro dispositivo ⇒ 404; o dispositivo dono continua renovando', async () => {
    const pendente = (await fila()).executar({ tipo: 'ASSINAR', algoritmo: 'rsa-sha1', digestB64: 'aGFzaA==', conteudo: CONTEUDO }, 10_000);
    const [tarefa] = DfeSignerTarefasRespostaSchema.parse((await poll({ espera: '5' })).body).tarefas;
    const outroToken = await parear(filial); // o outro caixa só tira o vínculo da filial; o do centro segue com o token antigo
    const r = await heartbeat(tarefa.id, outroToken!);
    expect(r.status).toBe(404);
    expect(JSON.stringify(r.body)).toContain('dfe_signer_tarefa_nao_encontrada');
    expect((await heartbeat(tarefa.id)).status).toBe(200);
    await resultado(tarefa.id, ASSINADO);
    await pendente;
  });

  it('heartbeat: tarefa expirada não é renovada (409 dfe_signer_tarefa_vencida) nem entregue de novo', async () => {
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'performance', 'hrtime'] });
    try {
      const pendente = (await fila()).executar({ tipo: 'ASSINAR', algoritmo: 'rsa-sha1', digestB64: 'aGFzaA==', conteudo: CONTEUDO }, 1_000);
      const [tarefa] = DfeSignerTarefasRespostaSchema.parse((await poll({ espera: '5' })).body).tarefas;
      jest.setSystemTime(Date.now() + 2_000); // passou do prazo da tarefa; o lease ainda estaria vivo
      const r = await heartbeat(tarefa.id);
      expect(r.status).toBe(409);
      expect(JSON.stringify(r.body)).toContain('dfe_signer_tarefa_vencida');
      expect((await poll()).status).toBe(204);
      expect(await pendente).toBe('ENTREGUE');
    } finally {
      jest.useRealTimers();
    }
  });

  it('AL-9 (defeito): TRANSMITIR em andamento não é reentregue antes do próprio prazo — 10,5 s depois do envio, o poll ainda devolve 204', async () => {
    // Só o relógio do `Date` anda; os timers reais seguem para o HTTP e para a espera do resultado.
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'performance', 'hrtime'] });
    try {
      const pendente = (await fila()).executar(
        { tipo: 'TRANSMITIR', url: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/x.asmx', servico: 'NFeStatusServico4', envelopeB64: 'PHgvPg==', timeoutMs: 30_000 },
        35_000,
      );
      const [tarefa] = DfeSignerTarefasRespostaSchema.parse((await poll({ espera: '5' })).body).tarefas;
      jest.setSystemTime(Date.now() + 10_500); // o lease antigo era de 10 s
      expect((await poll()).status).toBe(204);
      expect((await resultado(tarefa.id, { ok: true, tipo: 'TRANSMITIR', httpStatus: 200, corpoB64: '' })).status).toBe(200);
      expect(await pendente).toEqual({ ok: true, tipo: 'TRANSMITIR', httpStatus: 200, corpoB64: '' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('AL-6: sem resultado no prazo ⇒ a fila devolve null, a tarefa vence e o resultado atrasado é 409', async () => {
    const r = await (await fila()).executar({ tipo: 'TRANSMITIR', url: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/x.asmx', servico: 'NFeStatusServico4', envelopeB64: 'PHgvPg==', timeoutMs: 1_000 }, 300);
    expect(r).toBe('NAO_ENTREGUE'); // ninguém a pegou: vence sem efeito
    const vencida = await prisma.dfeSignerTask.findFirstOrThrow({ where: { tipo: 'TRANSMITIR' }, orderBy: { createdAt: 'desc' } });
    expect(vencida).toMatchObject({ status: 'EXPIRED', payload: null });
    expect((await poll()).status).toBe(204); // vencida não é entregue
    const atrasado = await resultado(vencida.id, { ok: true, tipo: 'TRANSMITIR', httpStatus: 200, corpoB64: '' });
    expect(atrasado.status).toBe(409);
    expect(JSON.stringify(atrasado.body)).toContain('dfe_signer_tarefa_vencida');
  });

  it('AL-5: sem Bearer, token desconhecido ⇒ 401; tarefa de outro dispositivo ⇒ 404', async () => {
    expect((await request(app).get(TAREFAS).query({ espera: '0' })).status).toBe(401);
    expect((await poll({}, 'x'.repeat(43))).status).toBe(401);
    expect((await resultado('qualquer', ASSINADO, 'y'.repeat(43))).status).toBe(401);
    expect((await resultado('nao-existe', ASSINADO)).status).toBe(404);
  });
});
