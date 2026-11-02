// --- Mock do repositório de DynamicTable que a montagem lê pela factory (mesmo padrão do FiscalDocumentEmissionService.nfce.test.ts) ---
const findTableByInternalName = jest.fn();
const findDataById = jest.fn();
const existsByIdInTable = jest.fn();
const findRowsByFieldValue = jest.fn();

jest.mock('../../../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getDynamicTableRepository: () => ({ findTableByInternalName, findDataById, existsByIdInTable, findRowsByFieldValue }),
  }),
}));
// O adaptador `sefaz` de verdade, apontado para a SEFAZ falsa (a seleção real exige o pfx do transmissor em disco).
jest.mock('../../dfe/selectDfeEmissor', () => ({ __esModule: true, selectDfeEmissor: jest.fn() }));
jest.mock('../../dfe/resolveEmissor', () => ({ __esModule: true, resolveEmissorFor: jest.fn() }));

import { generateKeyPairSync } from 'node:crypto';
import { FakeSefaz, makeTlsPki } from '../../../../../test/helpers/fakeSefaz';
import { makeTestCert } from '../../../../../test/helpers/nfeSignature';
import { legalParamsSemente } from '@test/helpers/legalParams';
import { FakePscServer } from '../../dfe/psc/FakePscServer';
import { PscAssinador } from '../../dfe/psc/PscAssinador';
import { SefazSoapClient } from '../../dfe/sefaz/SefazSoapClient';
import { SefazNfeEmissor } from '../../dfe/sefaz/SefazNfeEmissor';
import { selectDfeEmissor } from '../../dfe/selectDfeEmissor';
import { resolveEmissorFor } from '../../dfe/resolveEmissor';
import { FiscalDocumentEmissionService } from '../FiscalDocumentEmissionService';
import { DFE_NAO_RECEBIDA, FiscalDocumentLifecycleService, NAO_CONSTA_ESPACO_MS, NAO_CONSTA_MAX_CONSULTAS, naoRecebida } from '../FiscalDocumentLifecycleService';
import { FiscalNumberVoidService } from '../FiscalNumberVoidService';
import { DfeAssinaturaResolver, FALTANTE_SESSAO_PSC } from '../DfeAssinaturaResolver';
import type { ResolveForEmissionResult } from '../PscCredentialService';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { EmissaoResult } from '../../dfe/DfeEmissorPort';

/**
 * X10a PR-7 — a credencial do PSC ligada aos serviços (EMENDA-PSC E-6, E-12, E-13; F-PSC-5 a, F-PSC-6 a) e as decisões
 * de D-2026-10-29-X10A-PR7-9-FORKS: 1 (F-ADN-5 a, resultado síncrono pelo applyResult), 2 (F-ADN-8 a, 217 ⇒
 * dfe_nao_recebida) e 5 (saída de PENDING_SIGNATURE pelo callback e pelo reenviar). Adaptador `sefaz` real contra a SEFAZ
 * falsa (HTTPS + mTLS local) e o PSC falso; repositório em memória com a mesma guarda `whenStatusIn` do real.
 */
const SCOPE: AccountingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
const CNPJ = '11222333000181';
const TABLES: Record<string, { id: string }> = {
  sales: { id: 'tbl-sales' },
  customers: { id: 'tbl-customers' },
  units: { id: 'tbl-units' },
  saleItems: { id: 'tbl-items' },
  products: { id: 'tbl-products' },
};

const perfil = {
  unitId: 'unit-1', regimeTributario: 'SIMPLES', codMun: '3550308', inscricaoEstadual: '111222333444', razaoSocial: 'Salao Exemplo Ltda',
  enderLogradouro: 'Rua Exemplo', enderNumero: '100', enderComplemento: null, enderBairro: 'Centro', enderMunicipio: 'Sao Paulo', enderCep: '01001000',
  nfeSerie: 1, nfceSerie: 3, dpsSerie: 1, partnerAccountRef: null, icmsContribuinte: false, pisCofinsRegime: 'SIMPLES',
  emissao: { completo: true, faltantes: [], pendingExternalValidation: [] },
};
const perfilProduto = {
  productRef: 'prod-1', ncm: '33051000', cest: null, origem: 0, cfopPadrao: '5102', csosn: '102', cstIcms: null, uCom: 'UN', cEan: 'SEM GTIN',
  cstPis: '49', cstCofins: '49', ibsCbsCst: null, ibsCbsClassTrib: null, xProd: null, updatedAt: '2026-10-26T00:00:00.000Z',
};

type Row = Record<string, unknown> & { id: string; status: string; currentAttemptNo: number; createdAt: Date };
type Attempt = { attemptNo: number; ref: string; payloadJson: string; resultStatus: string | null; resultJson: string | null; sentAt: Date };

/** Repositório em memória: só o que emissão + ciclo usam, com a guarda `whenStatusIn` do `FiscalDocumentRepository`. */
class MemRepo {
  docs = new Map<string, Row>();
  attempts = new Map<string, Attempt[]>();
  seq = 0n;
  private n = 0;
  runTransaction = async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({});
  nextNumber = jest.fn(async () => ++this.seq);
  private full = (d: Row) => ({ ...d, attempts: (this.attempts.get(d.id) ?? []).map((a) => ({ ...a })) });
  findById = async (_s: unknown, id: string) => (this.docs.has(id) ? this.full(this.docs.get(id)!) : null);
  findLiveBySale = async (_s: unknown, saleId: string, kind?: string) =>
    [...this.docs.values()].filter((d) => d.saleId === saleId && d.status !== 'CANCELLED' && (!kind || d.kind === kind));
  listBySale = async (_s: unknown, saleId: string) => [...this.docs.values()].filter((d) => d.saleId === saleId).map(this.full);
  listByStatus = async (_s: unknown, status: string) => [...this.docs.values()].filter((d) => d.status === status);
  listPending = async () => [...this.docs.values()].filter((d) => d.status === 'SENT' || d.status === 'PROCESSING');
  createPendingAttachment = jest.fn();
  createSent = async (_s: unknown, data: Record<string, unknown>) => {
    const { payloadJson, initialStatus, ...doc } = data;
    const id = `doc-${++this.n}`;
    this.docs.set(id, {
      id, userId: 'u1', unitId: 'unit-1', ...doc, saleKey: (doc.saleKey as string) ?? doc.saleId, status: (initialStatus as string) ?? 'SENT',
      currentAttemptNo: 1, partnerRef: null, nNFSe: null, chaveOuCodigo: null, errorsJson: null, authorizedAt: null, cancelledAt: null,
      sourceDocumentId: null, substitutesDocumentId: null, substitutedByDocumentId: null, substMotivo: null, nfseDhProc: null,
      vIssCents: null, vIbsCents: null, vCbsCents: null, xmlAttachmentId: null, pdfAttachmentId: null, createdAt: new Date(Date.now() + this.n),
    });
    this.attempts.set(id, [{ attemptNo: 1, ref: `${id}:1`, payloadJson: payloadJson as string, resultStatus: null, resultJson: null, sentAt: new Date() }]);
    return this.full(this.docs.get(id)!);
  };
  appendAttempt = async (_s: unknown, a: { documentId: string; attemptNo: number; payloadJson: string }) => {
    const row = { attemptNo: a.attemptNo, ref: `${a.documentId}:${a.attemptNo}`, payloadJson: a.payloadJson, resultStatus: null, resultJson: null, sentAt: new Date() };
    this.attempts.get(a.documentId)!.push(row);
    return row;
  };
  transition = jest.fn(async (_s: unknown, id: string, data: Record<string, unknown>) => {
    const { attemptResult, whenStatusIn, ...fields } = data as { attemptResult?: { attemptNo: number; resultStatus: string; resultJson: string }; whenStatusIn?: string[] };
    const d = this.docs.get(id);
    if (!d) throw new Error(`fiscal_document_not_found: ${id}`);
    if (whenStatusIn && !whenStatusIn.includes(d.status)) throw new Error(`fiscal_document_status_changed: ${id}`);
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) d[k] = v;
    if (attemptResult) Object.assign(this.attempts.get(id)!.find((a) => a.attemptNo === attemptResult.attemptNo)!, attemptResult);
    return { ...d };
  });
}

const pki = makeTlsPki();
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
const certPem = makeTestCert({ cnpj: CNPJ }, key);

describe('X10a PR-7 — credencial do PSC nos serviços de emissão, ciclo e inutilização', () => {
  const OLD_ENV = process.env;
  const sefaz = new FakeSefaz(pki);
  const psc = new FakePscServer({ key, certPem, titularCnpj: CNPJ });
  let emissor: SefazNfeEmissor;
  let baseUrl: string;
  let sessao: ResolveForEmissionResult;
  let repo: MemRepo;
  let audit: { append: jest.Mock };
  let pscStub: { resolveForEmission: jest.Mock; registrarConsumo: jest.Mock };
  let emission: FiscalDocumentEmissionService;
  let lifecycle: FiscalDocumentLifecycleService;
  let agora = new Date('2026-10-29T15:00:00Z');

  const sessaoViva = (): ResolveForEmissionResult => ({
    ok: true,
    credencial: { pscProviderId: 'psc-1', baseUrl, accessToken: psc.emitirToken(), titularCnpj: CNPJ, certificadoPem: certPem, escopo: ['NFE', 'NFCE'] },
    provider: { baseUrl, nome: 'PSC falso' },
  });

  beforeAll(async () => {
    await sefaz.start();
    baseUrl = await psc.start();
    const soap = new SefazSoapClient({ transporte: { pfx: pki.clientPfx, passphrase: pki.passphrase, ca: pki.caPem }, responseTimeoutMs: 3_000 });
    emissor = new SefazNfeEmissor({ ambiente: 'homologacao', soap, endpoint: sefaz.endpoint });
    (selectDfeEmissor as jest.Mock).mockImplementation(() => ({ enabled: true, port: emissor, ambiente: 'homologacao' }));
    (resolveEmissorFor as jest.Mock).mockImplementation(() => emissor);
  });
  afterAll(async () => {
    await sefaz.stop();
    await psc.stop();
    process.env = OLD_ENV;
  });

  beforeEach(() => {
    process.env = { ...OLD_ENV, NODE_ENV: 'test' };
    agora = new Date('2026-10-29T15:00:00Z');
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] }).setSystemTime(agora);
    Object.assign(sefaz.controle, { cStatAutorizacao: null, perderRespostaAutorizacao: false, cStatEvento: null, cStatInutilizacao: null, atrasoMs: 0 });
    Object.assign(psc.controle, { statusAssinatura: null, atrasoAssinaturaMs: 0 });
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => TABLES[name] ?? null);
    existsByIdInTable.mockResolvedValue(true);
    findRowsByFieldValue.mockResolvedValue([{ id: 'item-1', data: { productId: 'prod-1', type: 'Product', quantity: 2, unitPrice: 30 } }]);
    findDataById.mockImplementation(async (id: string) => {
      if (id.startsWith('sale-')) return { id, data: { status: 'Finalized', customerId: 'cust-1', paymentMethod: 'Pix', date: '2026-10-29' } };
      if (id === 'cust-1') return { id, data: { name: 'Maria Cliente', taxId: '11144477735' } };
      if (id === 'unit-1') return { id, data: { cnpj: CNPJ } };
      if (id.startsWith('prod-')) return { id, data: { name: `Produto ${id}` } };
      return null;
    });

    sessao = sessaoViva();
    repo = new MemRepo();
    audit = { append: jest.fn() };
    pscStub = { resolveForEmission: jest.fn(async () => sessao), registrarConsumo: jest.fn(async () => undefined) };
    const resolver = new DfeAssinaturaResolver(pscStub, new PscAssinador(3_000));
    const policy = { canEmitFiscalDocument: () => true, canReadFiscalDocument: () => true, canCancelFiscalDocument: () => true };
    emission = new FiscalDocumentEmissionService(
      repo as never,
      { findByCode: jest.fn(async (_s: unknown, code: string) => ({ id: `acc-${code}`, code })) } as never,
      { findBySource: jest.fn().mockResolvedValue({ id: 'entry-1', postings: [{ accountId: 'acc-3.3', debitCents: 0n, creditCents: 6000n }] }) } as never,
      { get: jest.fn().mockResolvedValue(perfil) } as never,
      { get: jest.fn() } as never,
      policy as never,
      audit as never,
      legalParamsSemente,
      { list: jest.fn().mockResolvedValue([perfilProduto]) } as never,
      undefined,
      resolver,
    );
    lifecycle = new FiscalDocumentLifecycleService(
      repo as never,
      emission,
      { upload: jest.fn() } as never,
      { attachSourceDocument: jest.fn(), retireSourceDocument: jest.fn() } as never,
      policy as never,
      audit as never,
      { findOverlapping: async () => [] } as never,
    );
    // A fiação da factory (lib/factory.ts): F-ADN-5 a e o gancho do callback OAuth (decisão 5).
    emission.setResultApplier((s, d, r) => lifecycle.aplicarResultadoDoEnvio(s, d, r));
  });
  afterEach(() => jest.useRealTimers());

  const eventos = () => audit.append.mock.calls.map((c) => (c[2] as { eventType: string }).eventType);
  const servicosSefaz = (desde: number) => sefaz.controle.chamadas.slice(desde).map((c) => c.servico);

  it('E-6 (F-PSC-5 a): sem credencial ⇒ 400 com o faltante "sessão do PSC"; nenhum número consumido, nada gravado', async () => {
    sessao = { ok: false, motivo: 'SEM_CREDENCIAL' };
    await expect(emission.emit(SCOPE, 'sale-1', 'NFCE')).rejects.toMatchObject({ details: { faltantes: [FALTANTE_SESSAO_PSC], motivo: 'SEM_CREDENCIAL' } });
    expect(repo.nextNumber).not.toHaveBeenCalled();
    expect(repo.docs.size).toBe(0);
  });

  it('E-6: certificado vencido ⇒ 400, mesmo contrato', async () => {
    sessao = { ok: false, motivo: 'CERTIFICADO_VENCIDO' };
    await expect(emission.emit(SCOPE, 'sale-1', 'NFCE')).rejects.toMatchObject({ details: { faltantes: [FALTANTE_SESSAO_PSC] } });
    expect(repo.nextNumber).not.toHaveBeenCalled();
  });

  it('F-ADN-5 a: cStat 100 no envio síncrono ⇒ AUTHORIZED na criação, pelo applyResult (chave, dfe.authorized); a assinatura soma no contador', async () => {
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'AUTHORIZED', numero: '1', partnerRef: expect.stringMatching(/^\d{44}$/) });
    expect(view.chaveOuCodigo).toBe(view.partnerRef);
    expect(eventos()).toEqual(['dfe.emitted', 'dfe.authorized']);
    expect(pscStub.registrarConsumo).toHaveBeenCalledWith(SCOPE, 1);
    expect(pscStub.resolveForEmission).toHaveBeenCalledWith(SCOPE); // a unidade do documento é a do escopo
  });

  it('F-ADN-5 a: rejeição síncrona ⇒ REJECTED com o cStat; o reenviar sai com o MESMO número', async () => {
    sefaz.controle.cStatAutorizacao = '704';
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'REJECTED', numero: '1', errors: [{ code: '704' }] });
    sefaz.controle.cStatAutorizacao = null;
    const reenviado = await lifecycle.reenviar(SCOPE, view.id);
    expect(reenviado).toMatchObject({ status: 'AUTHORIZED', numero: '1', currentAttemptNo: 2 });
    expect(repo.nextNumber).toHaveBeenCalledTimes(1);
  });

  it('E-13 (F-PSC-6 a): token vence entre duas vendas ⇒ a 2ª fica PENDING_SIGNATURE sem número, nada vai à SEFAZ; nenhum número pulado', async () => {
    const [primeira] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(primeira).toMatchObject({ status: 'AUTHORIZED', numero: '1' });
    sessao = { ok: false, motivo: 'TOKEN_EXPIRADO' };
    const antes = sefaz.controle.chamadas.length;
    const [segunda] = await emission.emit(SCOPE, 'sale-2', 'NFCE');
    expect(segunda).toMatchObject({ status: 'PENDING_SIGNATURE', numero: null });
    expect(repo.nextNumber).toHaveBeenCalledTimes(1);
    expect(servicosSefaz(antes)).toEqual([]);
    expect(eventos().filter((e) => e === 'dfe.emitted')).toHaveLength(1); // dfe.emitted registra o ENVIO

    // decisão 5: o reenviar com o token ainda vencido é 400 e não mexe na nota
    await expect(lifecycle.reenviar(SCOPE, segunda.id)).rejects.toMatchObject({ details: { faltantes: [FALTANTE_SESSAO_PSC] } });
    expect(repo.docs.get(segunda.id)!.status).toBe('PENDING_SIGNATURE');

    // decisão 5: reautorizou ⇒ o gancho do callback envia a pendente; o número nasce agora, o seguinte da sequência
    sessao = sessaoViva();
    expect(await lifecycle.enviarPendentesDaUnidade(SCOPE)).toEqual({ enviadas: 1, falhas: 0 });
    expect(await emission.getById(SCOPE, segunda.id)).toMatchObject({ status: 'AUTHORIZED', numero: '2', currentAttemptNo: 2 });
    expect(repo.nextNumber).toHaveBeenCalledTimes(2);
  });

  it('F-PSC-6 a: o PSC recusa a assinatura no envio (401 ⇒ CREDENCIAL_EXPIRADA) ⇒ PENDING_SIGNATURE mantendo o número; o reenviar sai com ele', async () => {
    psc.controle.statusAssinatura = 401;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'PENDING_SIGNATURE', numero: '1', errors: [{ code: 'psc_sessao_vencida' }] });
    psc.controle.statusAssinatura = null;
    const reenviado = await lifecycle.reenviar(SCOPE, view.id);
    expect(reenviado).toMatchObject({ status: 'AUTHORIZED', numero: '1' });
    expect(repo.nextNumber).toHaveBeenCalledTimes(1);
  });

  it('F-ADN-8 a: a nota nunca chegou (217) ⇒ só consultas espaçadas contam; na N-ésima vira REJECTED dfe_nao_recebida e o reenvio usa o MESMO número', async () => {
    psc.controle.statusAssinatura = 500; // PSC fora: falha do envio (não é sessão) ⇒ SENT, nada foi à SEFAZ
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'SENT', numero: '1', errors: [{ code: 'dfe_emitir_failed' }] });
    psc.controle.statusAssinatura = null;

    expect((await lifecycle.consultarUm(SCOPE, view.id)).status).toBe('PROCESSING');
    expect((await lifecycle.consultarUm(SCOPE, view.id)).status).toBe('PROCESSING'); // sem espaço: não soma
    for (let i = 2; i < NAO_CONSTA_MAX_CONSULTAS; i++) {
      agora = new Date(agora.getTime() + NAO_CONSTA_ESPACO_MS);
      jest.setSystemTime(agora);
      expect((await lifecycle.consultarUm(SCOPE, view.id)).status).toBe('PROCESSING');
    }
    agora = new Date(agora.getTime() + NAO_CONSTA_ESPACO_MS);
    jest.setSystemTime(agora);
    expect(await lifecycle.consultarUm(SCOPE, view.id)).toMatchObject({ status: 'REJECTED', errors: [{ code: DFE_NAO_RECEBIDA }] });
    expect(eventos()).toContain('dfe.rejected');

    expect(await lifecycle.reenviar(SCOPE, view.id)).toMatchObject({ status: 'AUTHORIZED', numero: '1' });
  });

  it('E-8 + E-12: resposta perdida ⇒ SENT; o polling consulta com a credencial da unidade do documento e o payload da tentativa ⇒ AUTHORIZED, sem reenviar', async () => {
    sefaz.controle.perderRespostaAutorizacao = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view.status).toBe('SENT');
    sefaz.controle.perderRespostaAutorizacao = false;
    const consultar = jest.spyOn(emissor, 'consultar');
    const antes = sefaz.controle.chamadas.length;
    expect(await lifecycle.pollPendingOnce(new Date())).toMatchObject({ updated: 1, failed: 0 });
    expect(repo.docs.get(view.id)!.status).toBe('AUTHORIZED');
    expect(servicosSefaz(antes)).toEqual(['NFeConsultaProtocolo4']);
    const ctx = consultar.mock.calls[0][1]!;
    expect(ctx.assinatura?.credencial.titularCnpj).toBe(CNPJ);
    expect(JSON.stringify(ctx.payload)).toBe(repo.attempts.get(view.id)![0].payloadJson);
    consultar.mockRestore();
  });

  it('cancelar (E-7): assina o 110111 pelo PSC ⇒ CANCELLED; sem credencial ⇒ 400 "sessão do PSC" e nada vai à SEFAZ', async () => {
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sessao = { ok: false, motivo: 'SEM_CREDENCIAL' };
    const antes = sefaz.controle.chamadas.length;
    await expect(lifecycle.cancelar(SCOPE, view.id, { xJust: 'Cancelamento de teste pelo operador' })).rejects.toMatchObject({ details: { faltantes: [FALTANTE_SESSAO_PSC] } });
    expect(servicosSefaz(antes)).toEqual([]);
    sessao = sessaoViva();
    expect(await lifecycle.cancelar(SCOPE, view.id, { xJust: 'Cancelamento de teste pelo operador' })).toMatchObject({ status: 'CANCELLED' });
  });

  it('inutilizar (E-6): passa a UF do emitente (codMun do perfil ⇒ SP, cUF 35) e a credencial; sem credencial ⇒ 400 antes de gravar o pedido', async () => {
    const voidRepo = {
      runTransaction: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({}),
      findOverlapping: async () => [],
      create: jest.fn(async (_s: unknown, d: Record<string, unknown>) => ({ id: 'void-1', status: 'REQUESTED', nProt: null, errorsJson: null, ...d })),
      applyResult: jest.fn(async (_s: unknown, _id: string, p: Record<string, unknown>) => ({ id: 'void-1', kind: 'NFCE', ambiente: 'homologacao', serie: 3, nIni: 5n, nFin: 6n, ano: 2026, partner: 'sefaz', nProt: null, errorsJson: null, ...p })),
    };
    const docRepo = { listSequences: async () => [{ ambiente: 'homologacao', serie: 3, last: 9n }], listNumbered: async () => [] };
    const make = () =>
      new FiscalNumberVoidService(
        docRepo as never,
        voidRepo as never,
        { get: async () => perfil } as never,
        { canCancelFiscalDocument: () => true } as never,
        audit as never,
        legalParamsSemente,
        new DfeAssinaturaResolver(pscStub, new PscAssinador(3_000)),
      );
    sessao = { ok: false, motivo: 'SEM_CREDENCIAL' };
    await expect(make().inutilizar(SCOPE, { kind: 'NFCE', serie: 3, nIni: 5, nFin: 6, xJust: 'Falha de sistema na numeracao' })).rejects.toMatchObject({ details: { faltantes: [FALTANTE_SESSAO_PSC] } });
    expect(voidRepo.create).not.toHaveBeenCalled();

    sessao = sessaoViva();
    const inutilizar = jest.spyOn(emissor, 'inutilizar');
    expect(await make().inutilizar(SCOPE, { kind: 'NFCE', serie: 3, nIni: 5, nFin: 6, xJust: 'Falha de sistema na numeracao' })).toMatchObject({ status: 'HOMOLOGATED' });
    expect(inutilizar.mock.calls[0][0]).toMatchObject({ uf: 'SP', ctx: { ambiente: 'homologacao', assinatura: expect.anything() } });
    expect(sefaz.controle.chamadas.at(-1)!.corpo).toContain(`Id="ID3526${CNPJ}65003000000005000000006"`);
    inutilizar.mockRestore();
  });
});

describe('naoRecebida (F-ADN-8 a) — contagem pura', () => {
  const proc = (code: string): EmissaoResult => ({ status: 'PROCESSING', partnerRef: 'k', errors: [{ code, message: 'x' }] });
  const t0 = new Date('2026-10-29T12:00:00Z');

  it('outro código ⇒ não conta', () => {
    expect(naoRecebida(null, proc('999'), t0)).toEqual({ result: proc('999') });
  });
  it('resultJson ilegível ⇒ a contagem recomeça (nunca rejeita por dado ruim)', () => {
    expect(naoRecebida('{', proc('217'), t0).naoConsta).toEqual({ naoConsta: 1, naoConstaEm: t0.toISOString() });
  });
  it(`a ${NAO_CONSTA_MAX_CONSULTAS}ª espaçada ⇒ REJECTED ${DFE_NAO_RECEBIDA}`, () => {
    const prev = JSON.stringify({ naoConsta: NAO_CONSTA_MAX_CONSULTAS - 1, naoConstaEm: t0.toISOString() });
    const cedo = naoRecebida(prev, proc('217'), new Date(t0.getTime() + NAO_CONSTA_ESPACO_MS - 1));
    expect(cedo.result.status).toBe('PROCESSING');
    const r = naoRecebida(prev, proc('217'), new Date(t0.getTime() + NAO_CONSTA_ESPACO_MS));
    expect(r.result).toMatchObject({ status: 'REJECTED', errors: [{ code: DFE_NAO_RECEBIDA }] });
  });
});
