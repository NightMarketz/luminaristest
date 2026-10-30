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
import { X509Certificate, verify as verifyRsa } from 'node:crypto';
import { FiscalDocumentLifecycleService } from '../FiscalDocumentLifecycleService';
import { NfceContingenciaService } from '../NfceContingenciaService';
import { XJUST_ENTRADA_AUTOMATICA } from '../../models/nfceContingencia';
import { NfePayloadSchema } from '../../dtos/NfePayloadDto';
import { FiscalNumberVoidService } from '../FiscalNumberVoidService';
import { DfeAssinaturaResolver } from '../DfeAssinaturaResolver';
import type { ResolveForEmissionResult } from '../PscCredentialService';
import type { AccountingScope } from '../../scope/AccountingScope';

/**
 * X10a PR-9 — contingência off-line da NFC-e (BE-INCR-NFCE-EMENDA-1 E-9, F-NFCE-E1-5 b; D-2026-10-29-X10A-PR7-9-FORKS
 * decisões 4, 6, 7, 8, 9 e 10). Mesmo arnês do FiscalDocumentPsc.test.ts: adaptador `sefaz` real contra a SEFAZ falsa
 * (HTTPS + mTLS local; `foraDoAr` derruba a conexão antes de processar) e o PSC falso.
 *
 * (Cabeçalho herdado do arnês do PR-7:) a credencial do PSC ligada aos serviços (EMENDA-PSC E-6, E-12, E-13; F-PSC-5 a, F-PSC-6 a) e as decisões
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
  listContingencia = async () => [...this.docs.values()].filter((d) => d.status === 'CONTINGENCY').map(this.full);
  listContingenciaNaoAutorizada = async (_desde: Date) =>
    [...this.docs.values()]
      .filter((d) => d.kind === 'NFCE' && ['CONTINGENCY', 'SENT', 'PROCESSING', 'REJECTED', 'PENDING_SIGNATURE'].includes(d.status))
      .filter((d) => (this.attempts.get(d.id) ?? []).some((a) => a.payloadJson.includes('"tpEmis":9')))
      .map(this.full);
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

type Estado = { id: string; ambiente: string; ativa: boolean; origem: string; dhCont: Date; xJust: string };
type Orfa = { id: string; documentId: string; ambiente: string; serie: number; numero: bigint; chave: string; status: string; voidId: string | null; tentativas: number; ultimoErro: string | null; createdAt: Date; userId: string; unitId: string };

/** Repositório em memória da contingência, com a mesma guarda do `desligar` real (só se ativa e da origem pedida). */
class MemCont {
  estados = new Map<string, Estado>();
  orfas: Orfa[] = [];
  runTransaction = async <T,>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({});
  findEstado = async (_s: unknown, amb: string) => this.estados.get(amb) ?? null;
  ligar = async (_s: unknown, amb: string, d: { origem: string; dhCont: Date; xJust: string }) => {
    const r = { id: `c-${amb}`, ambiente: amb, ativa: true, ...d };
    this.estados.set(amb, r);
    return r;
  };
  desligar = async (_s: unknown, amb: string, so?: string) => {
    const r = this.estados.get(amb);
    if (!r || !r.ativa || (so && r.origem !== so)) return false;
    r.ativa = false;
    return true;
  };
  createOrfa = async (_s: unknown, d: Omit<Orfa, 'id' | 'status' | 'voidId' | 'tentativas' | 'ultimoErro' | 'createdAt' | 'userId' | 'unitId'>) => {
    const o: Orfa = { id: `o-${this.orfas.length + 1}`, userId: 'u1', unitId: 'unit-1', ...d, status: 'PENDING', voidId: null, tentativas: 0, ultimoErro: null, createdAt: new Date() };
    this.orfas.push(o);
    return o;
  };
  listOrfasPendentes = async (olderThan: Date) => this.orfas.filter((o) => o.status === 'PENDING' && o.createdAt < olderThan);
  listOrfasDosDocumentos = async (_s: unknown, ids: readonly string[]) => this.orfas.filter((o) => ids.includes(o.documentId));
  updateOrfa = async (id: string, patch: Partial<Orfa>) => Object.assign(this.orfas.find((o) => o.id === id)!, patch);
}

describe('X10a PR-9 — contingência off-line da NFC-e', () => {
  const OLD_ENV = process.env;
  const sefaz = new FakeSefaz(pki);
  const psc = new FakePscServer({ key, certPem, titularCnpj: CNPJ });
  let emissor: SefazNfeEmissor;
  let baseUrl: string;
  let sessao: ResolveForEmissionResult;
  let repo: MemRepo;
  let audit: { append: jest.Mock };
  let pscStub: { resolveForEmission: jest.Mock; registrarConsumo: jest.Mock };
  let cscStub: { resolveForEmission: jest.Mock };
  let emission: FiscalDocumentEmissionService;
  let lifecycle: FiscalDocumentLifecycleService;
  let cont: MemCont;
  let contingencia: NfceContingenciaService;
  let voidService: { inutilizarOrfa: jest.Mock };
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
    Object.assign(sefaz.controle, { cStatAutorizacao: null, perderRespostaAutorizacao: false, cStatEvento: null, cStatInutilizacao: null, atrasoMs: 0, recusarQrV3: false, foraDoAr: false });
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
    cscStub = { resolveForEmission: jest.fn(async () => null) };
    const resolver = new DfeAssinaturaResolver(pscStub, new PscAssinador(3_000), cscStub);
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
    // A fiação da factory do PR-9: a emissão e o reenvio acionam a contingência; o retorno da transmissão sai pelo applyResult.
    cont = new MemCont();
    voidService = { inutilizarOrfa: jest.fn(async () => ({ id: 'void-1', status: 'HOMOLOGATED', errors: [] })) };
    contingencia = new NfceContingenciaService(cont as never, repo as never, emission, voidService as never, policy as never, audit as never, legalParamsSemente);
    emission.setContingencia(contingencia);
    lifecycle.setContingenciaHandler(emission.contingenciaHandler());
    contingencia.setResultApplier((s, d, r) => lifecycle.aplicarResultadoDoEnvio(s, d, r));
  });
  afterEach(() => jest.useRealTimers());

  const eventos = () => audit.append.mock.calls.map((c) => (c[2] as { eventType: string }).eventType);
  const autorizacoes = (desde = 0) => sefaz.controle.chamadas.slice(desde).filter((c) => c.servico === 'NFeAutorizacao4').length;
  type Ide = { tpEmis: number; nNF: number; cNF: string; dhEmi: string; dhCont?: string; xJust?: string };
  const payloadDe = (id: string, attemptNo?: number) => {
    const list = repo.attempts.get(id)!;
    const a = attemptNo ? list.find((t) => t.attemptNo === attemptNo)! : list.at(-1)!;
    return JSON.parse(a.payloadJson) as { infNFe: { Id: string; ide: Ide } };
  };
  const FUTURO = () => new Date(Date.now() + 60_000); // as órfãs criadas no teste já são "mais velhas" que isto
  const PASSADO = () => new Date(Date.now() - 60_000); // nenhuma órfã é processada

  it('decisão 4: SEFAZ fora ⇒ a venda sai off-line na hora — unidade AUTO, número novo tpEmis=9, nota normal órfã, QR v3 off-line assinado', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'CONTINGENCY', numero: '2', currentAttemptNo: 2, errors: [] });
    const normal = payloadDe(view.id, 1);
    const offline = payloadDe(view.id, 2);
    expect(normal.infNFe.ide).toMatchObject({ tpEmis: 1, nNF: 1 });
    expect(offline.infNFe.ide).toMatchObject({ tpEmis: 9, nNF: 2, xJust: XJUST_ENTRADA_AUTOMATICA, dhCont: expect.any(String) });
    expect(offline.infNFe.Id.slice(3)[34]).toBe('9'); // a chave carrega o tpEmis (posição 35)
    expect(offline.infNFe.ide.dhCont! <= offline.infNFe.ide.dhEmi).toBe(true);
    expect(cont.estados.get('homologacao')).toMatchObject({ ativa: true, origem: 'AUTO' });
    expect(eventos()).toEqual(['dfe.emitted', 'dfe.contingency_entered']);
    expect(cont.orfas).toEqual([expect.objectContaining({ documentId: view.id, numero: 1n, serie: 3, chave: normal.infNFe.Id.slice(3), status: 'PENDING' })]);

    // E-9 + F-NFCE-E1-6 b: o DANFE sai antes da autorização — QR v3 off-line com a assinatura RSA-SHA1 dos parâmetros 1–7.
    const qr = view.contingencia!.qrCode!;
    expect(qr).toMatch(/\?p=\d{44}\|3\|2\|29\|60\.00\|2\|11144477735\|[A-Za-z0-9+/=]+$/);
    const params = qr.slice(qr.indexOf('?p=') + 3).split('|');
    expect(params[0]).toBe(offline.infNFe.Id.slice(3));
    expect(verifyRsa('sha1', Buffer.from(params.slice(0, 7).join('|')), new X509Certificate(certPem).publicKey, Buffer.from(params[7], 'base64'))).toBe(true);
    expect(view.contingencia).toMatchObject({ dhCont: offline.infNFe.ide.dhCont, prazoTransmissao: '2026-10-31T02:59:59.000Z', urlChave: expect.any(String) });
  });

  it('contrato do payload: tpEmis=9 sem dhCont/xJust ⇒ 557; tpEmis=1 com eles ⇒ 556 (Anexo I B28-10/20)', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    const offline = payloadDe(view.id, 2);
    const { dhCont: _d, xJust: _x, ...semCont } = offline.infNFe.ide;
    const comIde = (ide: object) => ({ ...offline, infNFe: { ...offline.infNFe, ide } });
    expect(JSON.stringify(NfePayloadSchema.safeParse(comIde(semCont)).error?.issues)).toContain('557');
    expect(JSON.stringify(NfePayloadSchema.safeParse(comIde({ ...offline.infNFe.ide, tpEmis: 1 })).error?.issues)).toContain('556');
  });

  it('decisão 4: rejeição (704) nunca liga a contingência', async () => {
    sefaz.controle.cStatAutorizacao = '704';
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'REJECTED', numero: '1', contingencia: null });
    expect(cont.estados.size).toBe(0);
    expect(cont.orfas).toHaveLength(0);
  });

  it('decisão 8: com a unidade em contingência, a venda seguinte sai off-line direto — nada vai à SEFAZ, sem órfã', async () => {
    sefaz.controle.foraDoAr = true;
    await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.foraDoAr = false;
    const antes = sefaz.controle.chamadas.length;
    const [segunda] = await emission.emit(SCOPE, 'sale-2', 'NFCE');
    expect(segunda).toMatchObject({ status: 'CONTINGENCY', numero: '3', currentAttemptNo: 1 });
    expect(payloadDe(segunda.id).infNFe.ide).toMatchObject({ tpEmis: 9, xJust: XJUST_ENTRADA_AUTOMATICA });
    expect(autorizacoes(antes)).toBe(0);
    expect(cont.orfas).toHaveLength(1);
    expect(segunda.contingencia!.qrCode).toMatch(/\|3\|2\|/);
  });

  it('decisões 7 e 8: o tick transmite quando a SEFAZ volta ⇒ AUTHORIZED pelo applyResult (QR conferido pela SEFAZ); a entrada AUTO sai sozinha', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.foraDoAr = false;
    const s = await contingencia.tick(PASSADO());
    expect(s).toMatchObject({ transmitidas: 1, saidasAutomaticas: 1, semComunicacao: 0, failed: 0 });
    const doc = await emission.getById(SCOPE, view.id);
    expect(doc).toMatchObject({ status: 'AUTHORIZED', numero: '2', chaveOuCodigo: payloadDe(view.id).infNFe.Id.slice(3) });
    expect(cont.estados.get('homologacao')!.ativa).toBe(false);
    expect(eventos()).toEqual(['dfe.emitted', 'dfe.contingency_entered', 'dfe.authorized', 'dfe.contingency_left']);
  });

  it('decisões 7 e 9: SEFAZ ainda fora ⇒ fica CONTINGENCY; faltando ≤ 4 h do fim do 1º dia útil seguinte vira alerta, depois do fim, vencida', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE'); // qui 29/10 12:00 (Brasília) ⇒ prazo sex 30/10 23:59:59
    expect(await contingencia.tick(PASSADO())).toMatchObject({ semComunicacao: 1, pertoDoPrazo: 0, vencidas: 0 });
    jest.setSystemTime(new Date('2026-10-30T23:00:00Z')); // sex 20:00 — 3h59m59s antes
    expect(await contingencia.tick(PASSADO())).toMatchObject({ semComunicacao: 1, pertoDoPrazo: 1, vencidas: 0 });
    jest.setSystemTime(new Date('2026-10-31T03:30:00Z')); // sáb 00:30 — vencido
    expect(await contingencia.tick(PASSADO())).toMatchObject({ semComunicacao: 1, pertoDoPrazo: 0, vencidas: 1 });
    expect((await emission.getById(SCOPE, view.id)).status).toBe('CONTINGENCY');
  });

  it('decisão 6: a normal chegou e foi autorizada (resposta perdida) ⇒ depois da de contingência autorizada, 110112 apontando-a ⇒ CANCELLED_SUBST', async () => {
    sefaz.controle.perderRespostaAutorizacao = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view.status).toBe('CONTINGENCY');
    sefaz.controle.perderRespostaAutorizacao = false;
    const antes = sefaz.controle.chamadas.length;
    expect(await contingencia.tick(FUTURO())).toMatchObject({ transmitidas: 1, orfasResolvidas: 1, orfasFalharam: 0 });
    const evento = sefaz.controle.chamadas.slice(antes).find((c) => c.servico === 'NFeRecepcaoEvento4')!.corpo;
    const substituta = payloadDe(view.id).infNFe.Id.slice(3);
    expect(evento).toContain('<tpEvento>110112</tpEvento>');
    expect(evento).toContain('<descEvento>Cancelamento por substituicao</descEvento>');
    expect(evento).toContain(`<chNFe>${cont.orfas[0].chave}</chNFe>`);
    expect(evento).toContain(`<chNFeRef>${substituta}</chNFeRef>`);
    expect(evento).toMatch(/<cOrgaoAutor>35<\/cOrgaoAutor><tpAutor>1<\/tpAutor>/);
    expect(cont.orfas[0]).toMatchObject({ status: 'CANCELLED_SUBST' });
    expect(voidService.inutilizarOrfa).not.toHaveBeenCalled();
  });

  it('decisão 6: a de contingência ainda não autorizada ⇒ a órfã espera (o 110112 sem a substituta na base daria 912)', async () => {
    sefaz.controle.perderRespostaAutorizacao = true;
    await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.perderRespostaAutorizacao = false;
    sefaz.controle.cStatAutorizacao = '704'; // a de contingência volta rejeitada
    const antes = sefaz.controle.chamadas.length;
    expect(await contingencia.tick(FUTURO())).toMatchObject({ orfasResolvidas: 0, orfasFalharam: 0 });
    expect(sefaz.controle.chamadas.slice(antes).some((c) => c.servico === 'NFeRecepcaoEvento4')).toBe(false);
    expect(cont.orfas[0].status).toBe('PENDING');
  });

  it('decisão 6: a normal não chegou (217) ⇒ pedido de inutilização do número dela', async () => {
    sefaz.controle.foraDoAr = true;
    await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.foraDoAr = false;
    expect(await contingencia.tick(FUTURO())).toMatchObject({ transmitidas: 1, orfasResolvidas: 1 });
    expect(voidService.inutilizarOrfa).toHaveBeenCalledWith(SCOPE, expect.objectContaining({ kind: 'NFCE', ambiente: 'homologacao', serie: 3, numero: 1n }));
    expect(cont.orfas[0]).toMatchObject({ status: 'VOID_REQUESTED', voidId: 'void-1' });
  });

  it('decisão 6: o 110112 recusado vira pendência visível no documento (contingencia_orfa_falhou)', async () => {
    sefaz.controle.perderRespostaAutorizacao = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.perderRespostaAutorizacao = false;
    await contingencia.tick(PASSADO()); // a de contingência sai autorizada
    sefaz.controle.cStatEvento = '501';
    expect(await contingencia.tick(FUTURO())).toMatchObject({ orfasFalharam: 1 });
    expect(cont.orfas[0]).toMatchObject({ status: 'FAILED', ultimoErro: expect.stringContaining('501') });
    expect((await emission.getById(SCOPE, view.id)).pendencias).toContain('contingencia_orfa_falhou');
  });

  it('decisão 10: a de contingência rejeitada volta com o mesmo número e série e cNF novo, ainda tpEmis=9 com o dhEmi/dhCont da off-line', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.foraDoAr = false;
    sefaz.controle.cStatAutorizacao = '704';
    await contingencia.tick(PASSADO());
    expect((await emission.getById(SCOPE, view.id)).status).toBe('REJECTED');
    sefaz.controle.cStatAutorizacao = null;
    jest.setSystemTime(new Date('2026-10-29T16:00:00Z'));
    const reenviado = await lifecycle.reenviar(SCOPE, view.id);
    expect(reenviado).toMatchObject({ status: 'AUTHORIZED', numero: '2', serie: 3, currentAttemptNo: 3 });
    const [off, novo] = [payloadDe(view.id, 2).infNFe.ide, payloadDe(view.id, 3).infNFe.ide];
    expect(novo).toMatchObject({ tpEmis: 9, nNF: 2, dhEmi: off.dhEmi, dhCont: off.dhCont, xJust: off.xJust });
    expect(novo.cNF).not.toBe(off.cNF);
  });

  it('o reenvio da de contingência que pega a SEFAZ fora volta a CONTINGENCY (o job a transmite), não fica SENT', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.foraDoAr = false;
    sefaz.controle.cStatAutorizacao = '704';
    await contingencia.tick(PASSADO());
    sefaz.controle.cStatAutorizacao = null;
    sefaz.controle.foraDoAr = true;
    expect(await lifecycle.reenviar(SCOPE, view.id)).toMatchObject({ status: 'CONTINGENCY', numero: '2' });
    expect(cont.orfas).toHaveLength(1); // nenhuma órfã nova: a nota já era de contingência
  });

  it('E1-4 c na contingência: a UF recusa a v3 (407) e há CSC ⇒ a transmissão sai com o v2 off-line (dia, vNF, DigestValue)', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.foraDoAr = false;
    sefaz.controle.recusarQrV3 = true;
    cscStub.resolveForEmission.mockResolvedValue({ id: '2', csc: 'A1B2C3D4E5F6G7H8I9J0' });
    try {
      expect(await contingencia.tick(PASSADO())).toMatchObject({ transmitidas: 1 });
      expect((await emission.getById(SCOPE, view.id)).status).toBe('AUTHORIZED');
      expect(sefaz.controle.chamadas.at(-1)!.corpo).toMatch(/\|2\|2\|29\|60\.00\|[0-9a-f]{56}\|2\|[0-9A-F]{40}<\/qrCode>/);
    } finally {
      sefaz.controle.recusarQrV3 = false;
    }
  });

  it('revisão A: a UF recusa a v3 (407) na transmissão ⇒ o QR que o BE entrega para o DANFE passa a ser o v2 do XML autorizado', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view.contingencia!.qrCode).toMatch(/\|3\|2\|/);
    sefaz.controle.foraDoAr = false;
    sefaz.controle.recusarQrV3 = true;
    cscStub.resolveForEmission.mockResolvedValue({ id: '2', csc: 'A1B2C3D4E5F6G7H8I9J0' });
    try {
      await contingencia.tick(PASSADO());
      const enviado = /<qrCode>([^<]+)<\/qrCode>/.exec(sefaz.controle.chamadas.at(-1)!.corpo)![1].replace(/&amp;/g, '&');
      const doc = await emission.getById(SCOPE, view.id);
      expect(doc.status).toBe('AUTHORIZED');
      expect(doc.contingencia!.qrCode).toBe(enviado);
      expect(doc.contingencia!.qrCode).toMatch(/\|2\|2\|29\|60\.00\|[0-9a-f]{56}\|2\|[0-9A-F]{40}$/);
    } finally {
      sefaz.controle.recusarQrV3 = false;
    }
  });

  it('revisão D: a de contingência que volta rejeitada segue no alerta de prazo (o prazo legal continua correndo)', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.foraDoAr = false;
    sefaz.controle.cStatAutorizacao = '704';
    await contingencia.tick(PASSADO());
    expect((await emission.getById(SCOPE, view.id)).status).toBe('REJECTED');
    jest.setSystemTime(new Date('2026-10-30T23:00:00Z')); // sex 20:00 (Brasília) — 3h59m59s antes do fim
    expect(await contingencia.tick(PASSADO())).toMatchObject({ transmitidas: 0, pertoDoPrazo: 1 });
    jest.setSystemTime(new Date('2026-10-31T03:30:00Z'));
    expect(await contingencia.tick(PASSADO())).toMatchObject({ vencidas: 1 });
  });

  it('revisão B (F-AMB-2 a): documento de outro ambiente que o da emissão configurada não é transmitido pelo tick', async () => {
    sefaz.controle.foraDoAr = true;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    sefaz.controle.foraDoAr = false;
    (selectDfeEmissor as jest.Mock).mockImplementation(() => ({ enabled: true, port: emissor, ambiente: 'producao' }));
    try {
      const antes = sefaz.controle.chamadas.length;
      expect(await contingencia.tick(PASSADO())).toMatchObject({ transmitidas: 0, failed: 1 });
      expect(autorizacoes(antes)).toBe(0);
      expect((await emission.getById(SCOPE, view.id)).status).toBe('CONTINGENCY');
    } finally {
      (selectDfeEmissor as jest.Mock).mockImplementation(() => ({ enabled: true, port: emissor, ambiente: 'homologacao' }));
    }
  });

  it('decisões 4 e 8: o operador liga (com xJust) ⇒ a venda sai off-line com o xJust dele; a SEFAZ voltar não tira a manual; desligar ⇒ contingency_left', async () => {
    const xJust = 'Queda do link de internet da loja desde as 10h';
    expect(await contingencia.definir(SCOPE, { ambiente: 'homologacao', ativa: true, xJust })).toMatchObject({ ativa: true, origem: 'MANUAL', xJust });
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'CONTINGENCY', numero: '1' });
    expect(payloadDe(view.id).infNFe.ide).toMatchObject({ tpEmis: 9, xJust });
    expect(cont.orfas).toHaveLength(0);
    expect(await contingencia.tick(PASSADO())).toMatchObject({ transmitidas: 1, saidasAutomaticas: 0 });
    expect(cont.estados.get('homologacao')!.ativa).toBe(true);
    await contingencia.definir(SCOPE, { ambiente: 'homologacao', ativa: false });
    expect(await contingencia.listar(SCOPE)).toEqual(expect.arrayContaining([expect.objectContaining({ ambiente: 'homologacao', ativa: false })]));
    expect(eventos().filter((e) => e.startsWith('dfe.contingency'))).toEqual(['dfe.contingency_entered', 'dfe.contingency_left']);
  });

  it('PSC fora na emissão off-line ⇒ a venda fica CONTINGENCY sem QR Code; o tick gera o QR antes de transmitir', async () => {
    await contingencia.definir(SCOPE, { ambiente: 'homologacao', ativa: true, xJust: 'Queda do link de internet da loja desde as 10h' });
    psc.controle.statusAssinatura = 500;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'CONTINGENCY', contingencia: { qrCode: null } });
    psc.controle.statusAssinatura = null;
    expect(await contingencia.tick(PASSADO())).toMatchObject({ transmitidas: 1 });
    const doc = await emission.getById(SCOPE, view.id);
    expect(doc).toMatchObject({ status: 'AUTHORIZED', contingencia: { qrCode: expect.stringMatching(/\|3\|2\|/) } });
  });
});
