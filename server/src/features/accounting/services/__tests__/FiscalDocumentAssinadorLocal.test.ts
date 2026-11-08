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
import { caixaFalso, thumbprintDe, type CaixaFalso } from '../../../../../test/helpers/fakeAssinadorLocal';
import { legalParamsSemente } from '@test/helpers/legalParams';
import { SefazNfeEmissor } from '../../dfe/sefaz/SefazNfeEmissor';
import { selectDfeEmissor } from '../../dfe/selectDfeEmissor';
import { resolveEmissorFor } from '../../dfe/resolveEmissor';
import { FiscalDocumentEmissionService } from '../FiscalDocumentEmissionService';
import { FiscalDocumentLifecycleService } from '../FiscalDocumentLifecycleService';
import { DfeAssinaturaResolver } from '../DfeAssinaturaResolver';
import { FALTANTE_ASSINADOR_LOCAL } from '../../models/DfeSigner.model';
import type { AssinadorLocalDaUnidade } from '../DfeSignerTaskService';
import type { DfeSignerDeviceWithUnits } from '../../repositories/IDfeSignerRepository';
import type { AccountingScope } from '../../scope/AccountingScope';

/**
 * X10a EMENDA-4 AL-PR-3 — o assinador local ligado aos serviços de emissão e de ciclo: AL-2 (a porta `assinador: 'local'`
 * faz o resolvedor escolher o assinador do caixa — o `DfeSelection.assinador` tem consumidor), AL-13 (pré-voo: sem
 * assinador ⇒ 400 `assinador local`; fora do ar ou sem token ⇒ PENDING_SIGNATURE sem número; queda no meio ⇒
 * PENDING_SIGNATURE com o número, sem contingência) e AL-14 (o assinador volta ⇒ a pendente sai, uma autorização).
 * Adaptador `sefaz` real, SEFAZ falsa com mTLS, caixa falso em processo (`test/helpers/fakeAssinadorLocal.ts`); a fila é
 * um stub do `DfeSignerTaskService.paraUnidade` (a fila real e o HTTP estão no `dfeSignerTarefas.integration.test.ts`).
 * Prefixo (mocks, cenário e repositório em memória) copiado do `FiscalDocumentPsc.test.ts`.
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
const device = {
  id: 'dev-1', userId: 'u1', nome: 'Caixa 1', tokenHash: 'h', certCnpj: CNPJ, certCnpjRaiz: CNPJ.slice(0, 8), certThumbprint: thumbprintDe(certPem),
  certNotAfter: '2048-01-01', ambiente: 'homologacao', versaoAssinador: '1.0.0', tokenPresente: true, lastSeenAt: new Date(), createdAt: new Date(),
  updatedAt: new Date(), deletedAt: null, units: [],
} as unknown as DfeSignerDeviceWithUnits;

describe('X10a EMENDA-4 AL-PR-3 — assinador local nos serviços de emissão e ciclo', () => {
  const OLD_ENV = process.env;
  const sefaz = new FakeSefaz(pki);
  let emissor: SefazNfeEmissor;
  let repo: MemRepo;
  let audit: { append: jest.Mock };
  let caixa: CaixaFalso;
  let estado: () => AssinadorLocalDaUnidade;
  let local: { paraUnidade: jest.Mock; timeoutAssinaturaMs: () => number; timeoutTransmissaoMs: () => number };
  let emission: FiscalDocumentEmissionService;
  let lifecycle: FiscalDocumentLifecycleService;
  const vivo = (): AssinadorLocalDaUnidade => ({ ok: true, device, fila: caixa });

  beforeAll(async () => {
    await sefaz.start();
    // O transporte do adaptador nunca é usado: com o assinador local, tudo sai pelo caixa (ctx.assinatura.transporte).
    emissor = new SefazNfeEmissor({
      ambiente: 'homologacao',
      assinador: 'local',
      endpoint: sefaz.endpoint,
      soap: { call: () => Promise.reject(new Error('transporte do servidor não deveria ser chamado')) },
    });
    (selectDfeEmissor as jest.Mock).mockImplementation(() => ({ enabled: true, port: emissor, ambiente: 'homologacao', assinador: 'local' }));
    (resolveEmissorFor as jest.Mock).mockImplementation(() => emissor);
  });
  afterAll(async () => {
    await sefaz.stop();
    process.env = OLD_ENV;
  });

  beforeEach(() => {
    process.env = { ...OLD_ENV, NODE_ENV: 'test' };
    Object.assign(sefaz.controle, { cStatAutorizacao: null, perderRespostaAutorizacao: false, cStatEvento: null, cStatInutilizacao: null, atrasoMs: 0, recusarQrV3: false });
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => TABLES[name] ?? null);
    existsByIdInTable.mockResolvedValue(true);
    findRowsByFieldValue.mockResolvedValue([{ id: 'item-1', data: { productId: 'prod-1', type: 'Product', quantity: 2, unitPrice: 30 } }]);
    findDataById.mockImplementation(async (id: string) => {
      if (id.startsWith('sale-')) return { id, data: { status: 'Finalized', customerId: 'cust-1', paymentMethod: 'Pix', date: '2026-10-29' } };
      if (id === 'cust-1') return { id, data: { name: 'Maria Cliente', taxId: '11144477735' } };
      if (id === 'unit-1') return { id, data: { cnpj: CNPJ } };
      if (id.startsWith('prod-')) return { id, data: { name: 'Produto ' + id } };
      return null;
    });
    caixa = caixaFalso({ key, certPem, cnpj: CNPJ, tpAmb: '2', pki });
    estado = vivo;
    local = { paraUnidade: jest.fn(async () => estado()), timeoutAssinaturaMs: () => 2_000, timeoutTransmissaoMs: () => 2_000 };
    repo = new MemRepo();
    audit = { append: jest.fn() };
    const pscNaoUsado = {
      resolveForEmission: jest.fn(async () => {
        throw new Error('o PSC não deveria ser consultado');
      }),
      registrarConsumo: jest.fn(),
    };
    const resolver = new DfeAssinaturaResolver(pscNaoUsado, { name: 'psc', assinarHash: jest.fn() }, { resolveForEmission: jest.fn(async () => null) }, local);
    const policy = { canEmitFiscalDocument: () => true, canReadFiscalDocument: () => true, canCancelFiscalDocument: () => true };
    emission = new FiscalDocumentEmissionService(
      repo as never,
      { findByCode: jest.fn(async (_s: unknown, code: string) => ({ id: 'acc-' + code, code })) } as never,
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
    emission.setResultApplier((s, d, r) => lifecycle.aplicarResultadoDoEnvio(s, d, r));
  });

  const autorizacoes = (desde: number) => sefaz.controle.chamadas.slice(desde).filter((c) => c.servico === 'NFeAutorizacao4').length;

  it('AL-2 + AL-8 + AL-9: a porta local faz o resolvedor usar o assinador do caixa — assina e transmite por ele; o PSC não é consultado', async () => {
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'AUTHORIZED', numero: '1' });
    expect(caixa.tarefas.map((t) => t.tipo)).toEqual(['ASSINAR', 'TRANSMITIR']);
    expect(local.paraUnidade).toHaveBeenCalledWith(SCOPE);
  });

  it.each(['ASSINADOR_AUSENTE', 'ASSINADOR_CERTIFICADO_VENCIDO'] as const)('AL-13: %s ⇒ 400 com o faltante "assinador local"; nenhum número, nada gravado', async (motivo) => {
    estado = () => ({ ok: false, motivo, device: null, fila: null });
    await expect(emission.emit(SCOPE, 'sale-1', 'NFCE')).rejects.toMatchObject({ details: { faltantes: [FALTANTE_ASSINADOR_LOCAL], motivo } });
    expect(repo.nextNumber).not.toHaveBeenCalled();
    expect(repo.docs.size).toBe(0);
  });

  it.each(['ASSINADOR_FORA', 'ASSINADOR_SEM_TOKEN'] as const)('AL-13 (F-FEAS-3 a): %s ⇒ a nota nasce PENDING_SIGNATURE sem número; nada vai à SEFAZ', async (motivo) => {
    estado = () => ({ ok: false, motivo, device, fila: caixa });
    const antes = sefaz.controle.chamadas.length;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view.status).toBe('PENDING_SIGNATURE');
    expect(view.numero ?? null).toBeNull();
    expect(repo.nextNumber).not.toHaveBeenCalled();
    expect(sefaz.controle.chamadas.length).toBe(antes);
    expect(caixa.tarefas).toHaveLength(0);
  });

  it('AL-13 (F-AL-6 a): o assinador cai no meio ⇒ PENDING_SIGNATURE com o número, sem contingência; nada foi à SEFAZ', async () => {
    caixa.responder = async () => 'ENTREGUE';
    const antes = sefaz.controle.chamadas.length;
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'PENDING_SIGNATURE', numero: '1' });
    expect(view.errors).toEqual([expect.objectContaining({ code: 'assinador_indisponivel' })]);
    expect(sefaz.controle.chamadas.length).toBe(antes);
  });

  it('AL-14: a nota pendente sai quando o assinador volta (o gancho da retomada) — uma autorização, sem número a mais', async () => {
    estado = () => ({ ok: false, motivo: 'ASSINADOR_FORA', device, fila: caixa });
    const [pendente] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(pendente.status).toBe('PENDING_SIGNATURE');
    estado = vivo;
    const antes = sefaz.controle.chamadas.length;
    expect(await lifecycle.enviarPendentesDaUnidade(SCOPE)).toEqual({ enviadas: 1, falhas: 0 });
    expect(await lifecycle.enviarPendentesDaUnidade(SCOPE)).toEqual({ enviadas: 0, falhas: 0 }); // a segunda retomada não reenvia
    expect(autorizacoes(antes)).toBe(1);
    expect(await emission.getById(SCOPE, pendente.id)).toMatchObject({ status: 'AUTHORIZED', numero: '1' });
    expect(repo.nextNumber).toHaveBeenCalledTimes(1);
  });

  it('AL-6 + AL-9 (defeito): TRANSMITIR entregue ao caixa sem resultado ⇒ timeout da SEFAZ (SENT, mesma chave); a retomada não gera segunda chave', async () => {
    const desde = sefaz.controle.chamadas.length;
    let perdeu = false;
    caixa.responder = async (t) => {
      if (t.tipo === 'TRANSMITIR' && !perdeu) {
        perdeu = true;
        await caixa.padrao(t); // a SEFAZ recebe e autoriza; o resultado se perde no caminho até o servidor
        return 'ENTREGUE'; // silêncio: a tarefa foi entregue e não voltou resultado
      }
      return caixa.padrao(t);
    };
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view).toMatchObject({ status: 'SENT', numero: '1' });
    expect(await lifecycle.enviarPendentesDaUnidade(SCOPE)).toEqual({ enviadas: 0, falhas: 0 });
    expect(repo.nextNumber).toHaveBeenCalledTimes(1);
    expect(autorizacoes(desde)).toBe(1);
  });

  it('AL-14: o reenviar manual também aceita a PENDING_SIGNATURE do assinador local', async () => {
    caixa.responder = async () => 'ENTREGUE';
    const [view] = await emission.emit(SCOPE, 'sale-1', 'NFCE');
    expect(view.status).toBe('PENDING_SIGNATURE');
    caixa.responder = undefined;
    expect(await lifecycle.reenviar(SCOPE, view.id)).toMatchObject({ status: 'AUTHORIZED', numero: '1' });
  });
});
