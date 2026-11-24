/**
 * X10a EMENDA-4 AL-PR-3 — PROVA DE PONTA A PONTA do assinador local no composition root (régua A6; o pedido da Onda 5).
 *
 * Banco SQLite real, fila `DfeSignerTask` real, rotas HTTP reais do assinador (pareamento, long-poll, resultado) e SEFAZ
 * falsa com mTLS. O único falso é o CAIXA: um laço que faz o poll pela HTTP, reconfere e assina com a chave de teste e
 * transmite à SEFAZ falsa (`test/helpers/fakeAssinadorLocal.ts`) — sem `jest.fn` no caminho da fila.
 *
 *  - WIRING: `getFactory()` liga o transporte do assinador local (`ligarTransporteAssinadorLocal`); sem ele, a seleção
 *    `sefaz` + `local` ficaria desabilitada. O teste falha se a chamada sair do factory (falsificado, ver o PR).
 *  - Emissão NFC-e ⇒ tarefas `ASSINAR` e `TRANSMITIR` gravadas ⇒ resultado do caixa ⇒ `AUTHORIZED`.
 *  - Assinador mudo ⇒ `ASSINADOR_INDISPONIVEL` e a tarefa `EXPIRED` (nada vai à SEFAZ); mudo na transmissão ENTREGUE ⇒
 *    `sefaz_timeout` (a nota fica SENT e a consulta reconsulta a mesma chave), nunca outra chave.
 *  - Assinador fora do ar / sem dispositivo ⇒ motivo nomeado no pré-voo (a nota espera / 400 com o faltante).
 *  - Tarefa vencida não fica órfã (processo caiu com a espera em memória): o próximo poll a vence e apaga o payload.
 */
import { generateKeyPairSync } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { DfeSignerCodigoViewSchema, DfeSignerTarefasRespostaSchema, type DfeSignerResultadoBody } from '@/features/accounting/dtos/DfeSignerDto';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { selectDfeEmissor } from '@/features/accounting/dfe/selectDfeEmissor';
import { DFE_ASSINADOR_SEM_DISPOSITIVO, transporteAssinadorLocal } from '@/features/accounting/dfe/local/assinadorLocalRuntime';
import { DfeTransporteIndisponivelError, isFalhaDeComunicacao } from '@/features/accounting/dfe/DfeEmissorPort';
import { SefazNfeEmissor } from '@/features/accounting/dfe/sefaz/SefazNfeEmissor';
import { SefazTransporteError } from '@/features/accounting/dfe/sefaz/SefazSoapClient';
import { AssinaturaRemotaError } from '@/features/accounting/dfe/AssinadorRemotoPort';
import { PscAssinador } from '@/features/accounting/dfe/psc/PscAssinador';
import { DfeAssinaturaResolver, motivoAguardaAssinatura } from '@/features/accounting/services/DfeAssinaturaResolver';
import { FALTANTE_ASSINADOR_LOCAL } from '@/features/accounting/models/DfeSigner.model';
import { inputNfce } from '@/features/accounting/models/__tests__/nfeMontagem.fixture';
import { montarNfe, numerarNfe } from '@/features/accounting/models/nfeMontagem';
import type { NfePayload } from '@/features/accounting/dtos/NfePayloadDto';
import type { DfeCallContext } from '@/features/accounting/dfe/DfeEmissorPort';
import type { NovaTarefaAssinador } from '@/features/accounting/dfe/local/AssinadorLocal';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { makeTestCert } from '@test/helpers/nfeSignature';
import { FakeSefaz, makeTlsPki } from '@test/helpers/fakeSefaz';
import { caixaFalso, derB64, thumbprintDe, type CaixaFalso } from '@test/helpers/fakeAssinadorLocal';

const app = makeApp();
const CNPJ = '11222333000181'; // o emitente de `inputNfce()`
const TAREFAS = '/api/dfe-assinador/v1/tarefas';
const pki = makeTlsPki();
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
const certPem = makeTestCert({ cnpj: CNPJ, responsavelCpf: '52998224725' }, key);
const THUMB = thumbprintDe(certPem);

let dono: { id: string; username: string };
let unitId: string;
let unitSemCaixa: string;
let token: string;
let seq = 1;
const sefaz = new FakeSefaz(pki);
let caixa: CaixaFalso;

const poll = (q: Record<string, string> = {}) =>
  request(app)
    .get(TAREFAS)
    .query({ espera: '0', versaoAssinador: '1.0.0', tokenPresente: 'true', certThumbprintSha256: THUMB, ...q })
    .set('Authorization', `Bearer ${token}`);
const postarResultado = (id: string, body: DfeSignerResultadoBody) => request(app).post(`${TAREFAS}/${id}/resultado`).set('Authorization', `Bearer ${token}`).send(body);

/** O caixa falso em laço: long-poll pela HTTP → executa a tarefa → POST do resultado. `null` do `responder` = não responde. */
function ligarCaixa(responder?: (t: NovaTarefaAssinador) => Promise<DfeSignerResultadoBody | null>) {
  let ativo = true;
  const laco = (async () => {
    while (ativo) {
      const r = await poll({ espera: '1' });
      if (r.status !== 200) continue;
      for (const t of DfeSignerTarefasRespostaSchema.parse(r.body).tarefas) {
        const { id, expiraEm: _expiraEm, ...nova } = t;
        const res = responder ? await responder(nova as NovaTarefaAssinador) : await caixa.padrao(nova as NovaTarefaAssinador);
        if (res) await postarResultado(id, res);
      }
    }
  })();
  return async () => {
    ativo = false;
    await laco;
  };
}

const resolver = () => new DfeAssinaturaResolver({} as never, new PscAssinador(), undefined, getFactory().getDfeSignerTaskService());
const scopeDe = (u: string) => resolveAccountingScopeInternal({ userId: dono.id }, u);
const nova = (): NfePayload => {
  const n = 500 + seq++;
  return numerarNfe(montarNfe(inputNfce({ ambiente: 'homologacao' })), n, String(48151623 + n));
};
/** O adaptador `sefaz` como o `selectDfeEmissor` o monta (transporte ligado no factory), com os endpoints da SEFAZ falsa. */
const porta = () => new SefazNfeEmissor({ ambiente: 'homologacao', soap: transporteAssinadorLocal()!, assinador: 'local', endpoint: sefaz.endpoint });
async function emitir(payload: NfePayload, ctx: DfeCallContext) {
  return porta().emitir({ kind: 'NFCE', ref: `d:${payload.infNFe.ide.nNF}`, ambiente: 'homologacao', cnpjEmitente: CNPJ, partnerAccountRef: null, payload, ctx });
}
async function ctxDaUnidade(): Promise<DfeCallContext> {
  const r = await resolver().paraUnidade(scopeDe(unitId), porta());
  if (!r.ok || !r.assinatura) throw new Error(`pré-voo recusou: ${r.ok ? 'sem assinatura' : r.motivo}`);
  return { ambiente: 'homologacao', assinatura: r.assinatura };
}
const linhas = () => prisma.dfeSignerTask.findMany({ orderBy: { createdAt: 'asc' } });

describe('X10a EMENDA-4 AL-PR-3 — NFC-e pelo assinador local, fila real, composition root', () => {
  beforeAll(async () => {
    pushTestSchema();
    await sefaz.start();
    Object.assign(process.env, { DFE_PARTNER: 'sefaz', DFE_ASSINADOR: 'local', DFE_PARTNER_ENV: 'homologacao' });
    dono = await prisma.user.create({ data: { name: 'al3e', username: 'al3e-dono', email: 'al3e@test.local', password: 'x', role: 'USER' } });
    const units = await prisma.dynamicTable.create({ data: { userId: dono.id, name: 'Units', internalName: 'units', category: 'business', schema: { fields: [] } as never } });
    const unit = async (name: string, cnpj: string) => (await prisma.dynamicTableData.create({ data: { dynamicTableId: units.id, data: { name, cnpj } as never } })).id;
    unitId = await unit('Salão Centro', '11.222.333/0001-81');
    unitSemCaixa = await unit('Salão Sem Caixa', '99.888.777/0001-00');
    const c = await request(app).post(`/api/accounting/dfe-assinador/${unitId}/codigos`).set(authHeader(dono));
    const p = await request(app)
      .post('/api/dfe-assinador/v1/pareamento')
      .send({ codigo: DfeSignerCodigoViewSchema.parse(c.body.data).codigo, nomeDispositivo: 'Caixa 1', versaoAssinador: '1.0.0', certificadoDerB64: derB64(certPem) });
    expect(p.status).toBeLessThan(300);
    token = p.body.token as string;
    expect((await poll()).status).toBe(204); // o primeiro poll é o heartbeat: online, com token
    caixa = caixaFalso({ key, certPem, cnpj: CNPJ, tpAmb: '2', pki });
  }, 120000);

  afterAll(async () => {
    await sefaz.stop();
    for (const k of ['DFE_PARTNER', 'DFE_ASSINADOR', 'DFE_PARTNER_ENV', 'DFE_ASSINADOR_TIMEOUT_MS', 'DFE_TRANSMITIR_TIMEOUT_MS']) delete process.env[k];
    await prisma.$disconnect();
  });

  afterEach(async () => {
    Object.assign(sefaz.controle, { cStatAutorizacao: null, perderRespostaAutorizacao: false, atrasoMs: 0 });
    await prisma.dfeSignerDevice.updateMany({ data: { lastSeenAt: new Date(), tokenPresente: true } });
  });

  it('WIRING: o factory liga o transporte do assinador local; a seleção sefaz + local sai habilitada com o SefazNfeEmissor `local`', () => {
    getFactory(); // o composition root roda `ligarTransporteAssinadorLocal(...)` na montagem
    expect(transporteAssinadorLocal()).not.toBeNull();
    const sel = selectDfeEmissor(process.env, 'NFCE');
    expect(sel).toMatchObject({ enabled: true, assinador: 'local', ambiente: 'homologacao' });
    expect(sel.port).toBeInstanceOf(SefazNfeEmissor);
    expect((sel.port as SefazNfeEmissor).assinador).toBe('local');
  });

  it('WIRING: sem o transporte ligado a seleção fica desabilitada com o motivo nomeado; o transporte do boot nunca transmite sozinho', async () => {
    const sel = selectDfeEmissor(process.env, 'NFCE', { transporteLocal: null });
    expect(sel).toMatchObject({ enabled: false, reason: expect.stringContaining('assinador local não está ligado') });
    await expect(transporteAssinadorLocal()!.call('https://x.invalid', 'NFeAutorizacao4', '<x/>')).rejects.toThrow(DFE_ASSINADOR_SEM_DISPOSITIVO);
    // L-…580f: o erro é TIPADO (o polling do #1349 adia sem gastar tentativa) e NÃO é falha de comunicação com a SEFAZ (não liga contingência)
    const erro = await transporteAssinadorLocal()!.call('https://x.invalid', 'NFeAutorizacao4', '<x/>').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(DfeTransporteIndisponivelError);
    expect(isFalhaDeComunicacao(erro)).toBe(false);
    expect((erro as DfeTransporteIndisponivelError).code).toBe(DFE_ASSINADOR_SEM_DISPOSITIVO);
  });

  it('emissão NFC-e: ASSINAR e TRANSMITIR passam pela fila real, o caixa devolve, a SEFAZ autoriza ⇒ AUTHORIZED; payload apagado', async () => {
    const parar = ligarCaixa();
    try {
      const payload = nova();
      const chave = payload.infNFe.Id.slice(3);
      const r = await emitir(payload, await ctxDaUnidade());
      expect(r).toMatchObject({ status: 'AUTHORIZED', partnerRef: chave });
      expect(r.xml!.toString('utf8')).toContain('<protNFe');
      expect(sefaz.autorizadas.has(chave)).toBe(true);
      const rows = (await linhas()).filter((t) => t.status !== 'EXPIRED');
      expect(rows.map((t) => [t.tipo, t.status])).toEqual([['ASSINAR', 'DONE'], ['TRANSMITIR', 'DONE']]);
      for (const t of rows) expect(t).toMatchObject({ payload: null, resultHash: expect.stringMatching(/^[0-9a-f]{64}$/), unitId });
    } finally {
      await parar();
    }
  }, 30000);

  it('assinador mudo na ASSINATURA ⇒ ASSINADOR_INDISPONIVEL, a tarefa vence (EXPIRED, sem payload) e nada vai à SEFAZ', async () => {
    process.env.DFE_ASSINADOR_TIMEOUT_MS = '400';
    const antes = (await linhas()).length;
    const chamadas = sefaz.controle.chamadas.length;
    const ctx = await ctxDaUnidade();
    await expect(emitir(nova(), ctx)).rejects.toMatchObject({ name: 'AssinaturaRemotaError', code: 'ASSINADOR_INDISPONIVEL' });
    const novas = (await linhas()).slice(antes);
    expect(novas.map((t) => [t.tipo, t.status, t.payload])).toEqual([['ASSINAR', 'EXPIRED', null]]);
    expect(sefaz.controle.chamadas.length).toBe(chamadas);
    delete process.env.DFE_ASSINADOR_TIMEOUT_MS;
  }, 30000);

  it('assinador mudo na TRANSMISSÃO já entregue ⇒ sefaz_timeout (a nota fica SENT; consulta pela mesma chave), nunca ASSINADOR_INDISPONIVEL', async () => {
    process.env.DFE_TRANSMITIR_TIMEOUT_MS = '1000'; // piso do contrato §4.2; a espera é 1 s + folga de 5 s
    const parar = ligarCaixa(async (t) => (t.tipo === 'TRANSMITIR' ? null : caixa.padrao(t)));
    try {
      const antes = (await linhas()).length;
      const erro = await emitir(nova(), await ctxDaUnidade()).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(SefazTransporteError);
      expect(erro).not.toBeInstanceOf(AssinaturaRemotaError);
      expect(erro).toMatchObject({ code: 'sefaz_timeout' });
      const novas = (await linhas()).slice(antes);
      expect(novas.map((t) => [t.tipo, t.status])).toEqual([['ASSINAR', 'DONE'], ['TRANSMITIR', 'EXPIRED']]);
    } finally {
      await parar();
      delete process.env.DFE_TRANSMITIR_TIMEOUT_MS;
    }
  }, 40000);

  it('pré-voo: sem poll há mais de 90 s ⇒ ASSINADOR_FORA (a nota espera); sem dispositivo na unidade ⇒ 400 com o faltante `assinador local`', async () => {
    await prisma.dfeSignerDevice.updateMany({ data: { lastSeenAt: new Date(Date.now() - 10 * 60_000) } });
    const fora = await resolver().paraUnidade(scopeDe(unitId), porta());
    expect(fora).toMatchObject({ ok: false, motivo: 'ASSINADOR_FORA' });
    if (fora.ok) throw new Error('esperava o pré-voo recusar');
    expect(motivoAguardaAssinatura(fora.motivo)).toBe(true);
    await prisma.dfeSignerDevice.updateMany({ data: { tokenPresente: false, lastSeenAt: new Date() } });
    expect(await resolver().paraUnidade(scopeDe(unitId), porta())).toMatchObject({ ok: false, motivo: 'ASSINADOR_SEM_TOKEN' });
    await expect(resolver().exigir(scopeDe(unitSemCaixa), porta())).rejects.toMatchObject({
      message: expect.stringContaining('emissao_bloqueada'),
      details: { faltantes: [FALTANTE_ASSINADOR_LOCAL], motivo: 'ASSINADOR_AUSENTE' },
    });
  });

  it('tarefa vencida não fica órfã: o processo que esperava caiu (linhas abertas com prazo passado) ⇒ o próximo poll as vence e apaga o payload', async () => {
    const device = await prisma.dfeSignerDevice.findFirstOrThrow();
    const passado = new Date(Date.now() - 60_000);
    const base = { userId: dono.id, deviceId: device.id, unitId, payload: '{"tipo":"ASSINAR"}', expiresAt: passado };
    const pend = await prisma.dfeSignerTask.create({ data: { ...base, tipo: 'ASSINAR', status: 'PENDING' } });
    const entregue = await prisma.dfeSignerTask.create({ data: { ...base, tipo: 'TRANSMITIR', status: 'DELIVERED', leaseUntil: passado } });
    expect((await poll()).status).toBe(204); // vencida não é entregue
    for (const id of [pend.id, entregue.id]) {
      expect(await prisma.dfeSignerTask.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'EXPIRED', payload: null, leaseUntil: null });
    }
    expect((await postarResultado(entregue.id, { ok: false, code: 'REDE', message: 'tarde' })).status).toBe(409); // e o resultado tardio é recusado
    expect((await linhas()).filter((t) => t.status === 'PENDING' || t.status === 'DELIVERED')).toEqual([]);
  });
});
