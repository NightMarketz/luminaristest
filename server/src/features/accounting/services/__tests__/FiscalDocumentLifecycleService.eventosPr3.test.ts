/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-3) — item 20: análise fiscal do cancelamento (F-EVT-4 b). Status `CANCEL_ANALYSIS`
 * (`AUTHORIZED* → CANCEL_ANALYSIS → CANCELLED | AUTHORIZED*`), pedido por `cancelar { analiseFiscal: true }` (Guia do
 * Emissor Web v1.2 §5.3), desfecho e105104/e105105 pelo job de eventos (item 18) e, no modo manual, pelo XML do evento
 * (F-FE-DFE-9 a). Guarda E0068 no `substituir`. Decisões do dono de 07/11 (emenda do PR-3 no BRIEF).
 *
 * Contrato exercido pelo `NullEmissor` REAL (roteiro programado) e repositório em memória. Leitor e assinatura do XML
 * do evento são os REAIS (fixtures fictícias assinadas na hora com a chave de teste). O repositório real (A6: o job roda
 * e a 2ª leitura mostra o status novo) está no `.eventosPr3.integration.test.ts`.
 *
 * Régua do BRIEF: A2 (pedido de análise feito FORA do Luminaris: o e101103 chega sem pedido local; pedido em voo); A3
 * (uma falta por vez: cada guarda num caso); A4 (emitente da fixture própria — o registro de cenários do piloto não foi
 * executado); A5 (o XML real do portal é EXT; aqui, fixture).
 */
import { FiscalDocumentLifecycleService, AVISO_CANCEL_EM_ANDAMENTO } from '../FiscalDocumentLifecycleService';
import { NullEmissor } from '../../dfe/NullEmissor';
import type { AccountingScope } from '../../scope/AccountingScope';
import { signNfseEventoForTest } from '@test/helpers/nfeSignature';
import type { DfeCapabilities, DfeEmissorPort } from '../../dfe/DfeEmissorPort';

/** Troca o adaptador resolvido por documento num caso (o módulo real nos demais). */
let mockPortOverride: DfeEmissorPort | null = null;
jest.mock('../../dfe/resolveEmissor', () => {
  const actual = jest.requireActual('../../dfe/resolveEmissor');
  return { ...actual, resolveEmissorFor: (...a: unknown[]) => mockPortOverride ?? actual.resolveEmissorFor(...a) };
});

/** NullEmissor real com capacidades trocadas (o campo é readonly só no tipo). */
function nullCom(caps: Partial<DfeCapabilities>): NullEmissor {
  const p = new NullEmissor();
  (p as { capabilities: DfeCapabilities }).capabilities = { ...p.capabilities, ...caps };
  return p;
}

const SCOPE: AccountingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
const CHAVE = '35503082211222333000181000000000004126091234567890';
const AGORA = new Date('2026-11-07T15:00:00.000Z');
const ID = 'doc-interno-xyz';
const PEDIDO = { cMotivo: 1 as const, xMotivo: 'valor digitado errado na venda' };

function doc(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    userId: 'u1',
    unitId: 'unit-1',
    kind: 'NFSE',
    status: 'AUTHORIZED',
    saleId: 'sale-1',
    saleKey: 'sale-1',
    cTribNac: '060101',
    ambiente: 'producao',
    partner: 'null',
    partnerRef: `${ID}:1`,
    serie: 70001,
    numero: 15n as bigint | null,
    nNFSe: '41' as string | null,
    chaveOuCodigo: CHAVE as string | null,
    nfseDhProc: new Date('2026-10-01T13:00:00.000Z') as Date | null,
    cancelRequestedAt: null as Date | null,
    cancelMotivo: null as number | null,
    cancelReason: null as string | null,
    statusAntesAnalise: null as string | null,
    sourceDocumentId: 'src-1' as string | null,
    substitutesDocumentId: null as string | null,
    currentAttemptNo: 1,
    attempts: [{ attemptNo: 1, ref: `${ID}:1`, payloadJson: '{}', sentAt: new Date(), resultStatus: null, resultJson: null }],
    ...over,
  };
}
type Doc = ReturnType<typeof doc>;
/** A nota em análise como o `entrarEmAnalise` a deixa (pedido feito aqui, divergente antes). */
const emAnalise = (over: Record<string, unknown> = {}) =>
  doc({ status: 'CANCEL_ANALYSIS', statusAntesAnalise: 'AUTHORIZED_DIVERGENT', cancelMotivo: 1, cancelReason: PEDIDO.xMotivo, ...over });

function make(docs: Doc[]) {
  const byId: Record<string, Doc> = Object.fromEntries(docs.map((d) => [d.id, d]));
  const repo = {
    listParaEventos: jest.fn(async (_desde: Date, _limit: number, partners: readonly string[]) => Object.values(byId).filter((d) => partners.includes(d.partner))),
    findById: jest.fn(async (_s: unknown, id: string) => byId[id] ?? null),
    findByChaveOuCodigo: jest.fn(async () => null),
    findSubstituteOf: jest.fn(async () => null),
    transition: jest.fn(async (_s: unknown, id: string, data: Record<string, unknown>) => {
      const cur = byId[id];
      const when = data.whenStatusIn as string[] | undefined;
      if (!cur || (when && !when.includes(cur.status))) throw new Error(`fiscal_document_status_changed: ${id}`);
      const { whenStatusIn: _w, attemptResult: _a, ...fields } = data;
      byId[id] = { ...cur, ...fields } as Doc;
      return byId[id];
    }),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true })),
  };
  const emissionService = {
    getById: jest.fn(async (_s: unknown, id: string) => ({ id, status: byId[id]?.status, pendencias: [], janela: { cancelarAte: null, substituirAte: null, substituirTeto: null, fonte: 'desconhecida' } })),
  };
  const attachments = { upload: jest.fn(async (_s: unknown, a: { fileName: string }) => ({ id: `att:${a.fileName}` })) };
  const postingService = { retireSourceDocument: jest.fn(async () => undefined) };
  const policy = { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true };
  const auditService = { append: jest.fn() };
  const service = new FiscalDocumentLifecycleService(
    repo as never,
    emissionService as never,
    attachments as never,
    postingService as never,
    policy as never,
    auditService as never,
    { findOverlapping: async () => [] } as never,
  );
  return { service, repo, attachments, postingService, auditService, byId };
}
const transitionsOf = (repo: { transition: jest.Mock }) => repo.transition.mock.calls.map((c) => c[2] as Record<string, unknown>);
const auditDe = (a: { append: jest.Mock }, eventType: string) => a.append.mock.calls.map((c) => c[2]).filter((e) => e.eventType === eventType);

const ENV_KEYS = ['DFE_PARTNER_NFSE', 'DFE_PARTNER_ENV_NFSE'] as const;
const saved: Record<string, string | undefined> = {};
beforeAll(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});
afterAll(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});
beforeEach(() => {
  process.env.DFE_PARTNER_NFSE = 'null';
  process.env.DFE_PARTNER_ENV_NFSE = 'producao';
  NullEmissor.limparRoteiro();
  mockPortOverride = null;
  jest.restoreAllMocks();
});

describe('item 20 — pedido de análise fiscal: cancelar { analiseFiscal: true }', () => {
  it('NullEmissor declara analiseFiscal e responde ANALYSIS_REQUESTED ao pedido (o cancelamento direto segue CANCELLED)', async () => {
    const port = new NullEmissor();
    expect(port.capabilities.analiseFiscal).toBe(true);
    expect(await port.cancelar('r', { kind: 'NFSE', ...PEDIDO, analiseFiscal: true })).toEqual({ status: 'ANALYSIS_REQUESTED', errors: [] });
    expect(await port.cancelar('r', { kind: 'NFSE', ...PEDIDO })).toEqual({ status: 'CANCELLED', errors: [] });
  });

  it('registrado → CANCEL_ANALYSIS com o status de antes, o motivo do pedido e audit dfe.cancel_analysis (e101103); proveniência intacta', async () => {
    const s = make([doc({ status: 'AUTHORIZED_DIVERGENT' })]);
    const cancelar = jest.spyOn(NullEmissor.prototype, 'cancelar');
    const r = await s.service.cancelar(SCOPE, ID, { ...PEDIDO, analiseFiscal: true });

    expect(cancelar).toHaveBeenCalledWith(`${ID}:1`, { kind: 'NFSE', ...PEDIDO, analiseFiscal: true });
    expect(r.status).toBe('CANCEL_ANALYSIS');
    expect(s.byId[ID]).toMatchObject({ status: 'CANCEL_ANALYSIS', statusAntesAnalise: 'AUTHORIZED_DIVERGENT', cancelMotivo: 1, cancelReason: PEDIDO.xMotivo, cancelRequestedAt: null, saleKey: 'sale-1' });
    expect(transitionsOf(s.repo)).toEqual([expect.objectContaining({ status: 'CANCEL_ANALYSIS', whenStatusIn: ['AUTHORIZED', 'AUTHORIZED_DIVERGENT'] })]);
    expect(auditDe(s.auditService, 'dfe.cancel_analysis')).toEqual([expect.objectContaining({ targetId: ID, payload: { documentId: ID, evento: 'e101103', cMotivo: '1' } })]);
    expect(auditDe(s.auditService, 'dfe.cancelled')).toEqual([]);
    expect(s.postingService.retireSourceDocument).not.toHaveBeenCalled();
  });

  it('sem a capacidade no adaptador → 409 DFE_ANALISE_NAO_SUPORTADA, sem chegar à porta', async () => {
    const s = make([doc()]);
    mockPortOverride = nullCom({ analiseFiscal: false });
    const cancelar = jest.spyOn(NullEmissor.prototype, 'cancelar');
    await expect(s.service.cancelar(SCOPE, ID, { ...PEDIDO, analiseFiscal: true })).rejects.toMatchObject({ errorCode: 'DFE_ANALISE_NAO_SUPORTADA', statusCode: 409 });
    expect(cancelar).not.toHaveBeenCalled();
    expect(transitionsOf(s.repo)).toEqual([]);
  });

  it('em voo (PROCESSING) → 202 do item 19: cancelRequestedAt gravado, a nota segue AUTHORIZED', async () => {
    const s = make([doc()]);
    NullEmissor.programarCancelamento(`${ID}:1`, { status: 'PROCESSING', errors: [] });
    const r = await s.service.cancelar(SCOPE, ID, { ...PEDIDO, analiseFiscal: true });
    expect(r.avisos).toContain(AVISO_CANCEL_EM_ANDAMENTO);
    expect(s.byId[ID].status).toBe('AUTHORIZED');
    expect(s.byId[ID].cancelRequestedAt).toBeInstanceOf(Date);
  });

  it('rejeitado (ex.: E0840, já há análise pendente no fisco) → 409 DFE_CANCEL_REJECTED com o código, nada escrito', async () => {
    const s = make([doc()]);
    NullEmissor.programarCancelamento(`${ID}:1`, { status: 'REJECTED', errors: [{ code: 'E0840', message: 'evento impeditivo' }] });
    await expect(s.service.cancelar(SCOPE, ID, { ...PEDIDO, analiseFiscal: true })).rejects.toMatchObject({
      errorCode: 'DFE_CANCEL_REJECTED',
      message: expect.stringMatching(/análise fiscal.*E0840/),
    });
    expect(transitionsOf(s.repo)).toEqual([]);
  });

  it.each([
    ['pedido de análise respondido CANCELLED', { analiseFiscal: true as const }, 'CANCELLED' as const],
    ['pedido de análise respondido OUT_OF_WINDOW', { analiseFiscal: true as const }, 'OUT_OF_WINDOW' as const],
    ['cancelamento direto respondido ANALYSIS_REQUESTED', {}, 'ANALYSIS_REQUESTED' as const],
  ])('contrato quebrado pelo adaptador (%s) → erro, nada escrito', async (_n, extra, status) => {
    const s = make([doc()]);
    NullEmissor.programarCancelamento(`${ID}:1`, { status, errors: [] });
    await expect(s.service.cancelar(SCOPE, ID, { ...PEDIDO, ...extra })).rejects.toThrow(/dfe_cancel_result_contrato/);
    expect(transitionsOf(s.repo)).toEqual([]);
  });

  it('OUT_OF_WINDOW do cancelamento direto (E0822) → a mensagem do 409 diz como pedir a análise (Guia §5.3)', async () => {
    const s = make([doc()]);
    NullEmissor.programarCancelamento(`${ID}:1`, { status: 'OUT_OF_WINDOW', errors: [{ code: 'E0822', message: 'fora do prazo' }] });
    await expect(s.service.cancelar(SCOPE, ID, PEDIDO)).rejects.toMatchObject({
      errorCode: 'DFE_CANCEL_OUT_OF_WINDOW',
      message: expect.stringContaining('analiseFiscal: true'),
    });
  });

  it('matriz [8]: com a análise pendente, cancelar (direto ou nova análise) é recusado sem chegar à porta', async () => {
    const s = make([emAnalise()]);
    const cancelar = jest.spyOn(NullEmissor.prototype, 'cancelar');
    await expect(s.service.cancelar(SCOPE, ID, PEDIDO)).rejects.toThrow(/análise fiscal do cancelamento está pendente/);
    await expect(s.service.cancelar(SCOPE, ID, { ...PEDIDO, analiseFiscal: true })).rejects.toThrow(/cancelamento_bloqueado/);
    expect(cancelar).not.toHaveBeenCalled();
  });
});

describe('item 20 — desfecho pelo job de eventos (item 18)', () => {
  it('A2: e101103 numa nota AUTHORIZED, sem pedido local (feito no portal) → CANCEL_ANALYSIS, motivo desconhecido', async () => {
    const s = make([doc()]);
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e101103', dhProc: '2026-11-03T10:00:00-03:00' }]);
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ consultadas: 1, emAnalise: 1, canceladas: 0, indeferidas: 0 });
    expect(s.byId[ID]).toMatchObject({ status: 'CANCEL_ANALYSIS', statusAntesAnalise: 'AUTHORIZED', cancelMotivo: null });
    expect(auditDe(s.auditService, 'dfe.cancel_analysis')).toEqual([expect.objectContaining({ payload: { documentId: ID, evento: 'e101103' } })]);
  });

  it('A2: pedido de análise em voo (cancelRequestedAt) — o e101103 conclui e tira a nota de voo', async () => {
    const s = make([doc({ cancelRequestedAt: new Date('2026-11-07T14:00:00.000Z') })]);
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e101103', dhProc: '2026-11-07T11:30:00-03:00' }]);
    await s.service.pollEventosOnce(AGORA);
    expect(s.byId[ID]).toMatchObject({ status: 'CANCEL_ANALYSIS', cancelRequestedAt: null });
  });

  it('e105104 (deferido) numa nota em análise → CANCELLED (cancelEvento e105104), com o motivo do pedido e a proveniência aposentada', async () => {
    const s = make([emAnalise()]);
    NullEmissor.programarEventos(CHAVE, [
      { tipo: 'e101103', dhProc: '2026-11-03T10:00:00-03:00' },
      { tipo: 'e105104', dhProc: '2026-11-06T16:00:00-03:00' },
    ]);
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ canceladas: 1, emAnalise: 0 });
    expect(s.byId[ID]).toMatchObject({
      status: 'CANCELLED',
      cancelEvento: 'e105104',
      cancelledAt: new Date('2026-11-06T19:00:00.000Z'),
      cancelMotivo: 1,
      cancelReason: PEDIDO.xMotivo,
      statusAntesAnalise: null,
      saleKey: `cancelled:${ID}:sale-1`,
    });
    expect(auditDe(s.auditService, 'dfe.cancelled')).toEqual([expect.objectContaining({ payload: { documentId: ID, cMotivo: '1', evento: 'e105104' } })]);
    expect(s.postingService.retireSourceDocument).toHaveBeenCalledWith(SCOPE, 'src-1', 'dfe_cancelled:1');
  });

  it('e105105 (indeferido) numa nota em análise → volta ao status de antes (AUTHORIZED_DIVERGENT), motivo limpo', async () => {
    const s = make([emAnalise()]);
    NullEmissor.programarEventos(CHAVE, [
      { tipo: 'e101103', dhProc: '2026-11-03T10:00:00-03:00' },
      { tipo: 'e105105', dhProc: '2026-11-06T16:00:00-03:00' },
    ]);
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ indeferidas: 1, canceladas: 0 });
    expect(s.byId[ID]).toMatchObject({ status: 'AUTHORIZED_DIVERGENT', statusAntesAnalise: null, cancelMotivo: null, cancelReason: null });
    expect(transitionsOf(s.repo)).toEqual([expect.objectContaining({ status: 'AUTHORIZED_DIVERGENT', whenStatusIn: ['CANCEL_ANALYSIS'] })]);
    expect(auditDe(s.auditService, 'dfe.cancel_analysis')).toEqual([expect.objectContaining({ payload: { documentId: ID, evento: 'e105105' } })]);
    expect(s.postingService.retireSourceDocument).not.toHaveBeenCalled();
  });

  it('análise indeferida e pedida de novo (e101103 → e105105 → e101103) numa nota AUTHORIZED → vale o último: CANCEL_ANALYSIS', async () => {
    const s = make([doc()]);
    NullEmissor.programarEventos(CHAVE, [
      { tipo: 'e101103', dhProc: '2026-11-07T08:00:00-03:00' },
      { tipo: 'e101103', dhProc: '2026-11-01T10:00:00-03:00' },
      { tipo: 'e105105', dhProc: '2026-11-03T10:00:00-03:00' },
    ]);
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ emAnalise: 1 });
    expect(s.byId[ID].status).toBe('CANCEL_ANALYSIS');
  });

  it('nota em análise e o fisco ainda sem resposta (só o e101103) → nada muda; a nota é tocada (rodízio Q3)', async () => {
    const s = make([emAnalise()]);
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e101103', dhProc: '2026-11-03T10:00:00-03:00' }]);
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ consultadas: 1, emAnalise: 0, indeferidas: 0, canceladas: 0 });
    expect(transitionsOf(s.repo)).toEqual([{ status: 'CANCEL_ANALYSIS', whenStatusIn: ['CANCEL_ANALYSIS'] }]);
  });
});

describe('item 11 — guarda E0068 no substituir', () => {
  it('nota em CANCEL_ANALYSIS → 409 DFE_STATUS_INVALIDO citando E0068, nada escrito', async () => {
    process.env.DFE_PARTNER_NFSE = 'manual'; // o ManualEmissor declara substituir (item 16)
    const s = make([emAnalise({ partner: 'manual' })]);
    await expect(s.service.substituir(SCOPE, ID, { cMotivo: '01' })).rejects.toMatchObject({ errorCode: 'DFE_STATUS_INVALIDO', message: expect.stringContaining('E0068') });
    expect(s.repo.findSubstituteOf).not.toHaveBeenCalled();
    expect(transitionsOf(s.repo)).toEqual([]);
  });
});

describe('item 20 — modo manual (F-FE-DFE-9 a: o XML do evento é a prova)', () => {
  const xml = (grupo: string, chNFSe = CHAVE) =>
    Buffer.from(
      signNfseEventoForTest(
        '<?xml version="1.0" encoding="UTF-8"?><evento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">' +
          `<infEvento Id="EVT${'1'.repeat(59)}"><verAplic>SefinNac</verAplic><ambGer>2</ambGer><nSeqEvento>001</nSeqEvento>` +
          '<dhProc>2026-11-06T16:00:00-03:00</dhProc><nDFSe>88</nDFSe><pedRegEvento versao="1.01">' +
          `<infPedReg Id="PRE${'2'.repeat(56)}"><tpAmb>1</tpAmb><verAplic>SefinNac</verAplic>` +
          `<dhEvento>2026-11-06T15:59:00-03:00</dhEvento><CNPJAutor>11222333000181</CNPJAutor><chNFSe>${chNFSe}</chNFSe>` +
          `${grupo}</infPedReg></pedRegEvento></infEvento></evento>`,
      ),
    );
  const e101103 = (cMotivo = '1') =>
    xml(`<e101103><xDesc>Solicitação de Análise Fiscal para Cancelamento de NFS-e</xDesc><cMotivo>${cMotivo}</cMotivo><xMotivo>${PEDIDO.xMotivo}</xMotivo></e101103>`);
  const resposta = (tipo: 'e105104' | 'e105105', cMotivo = '1') =>
    xml(
      `<${tipo}><xDesc>${tipo === 'e105104' ? 'Cancelamento de NFS-e Deferido por Análise Fiscal' : 'Cancelamento de NFS-e Indeferido por Análise Fiscal'}</xDesc>` +
        `<CPFAgTrib>12345678909</CPFAgTrib><nProcAdm>2026000123</nProcAdm><cMotivo>${cMotivo}</cMotivo><xMotivo>parecer do fiscal municipal</xMotivo></${tipo}>`,
    );
  const manual = (over: Record<string, unknown> = {}) => doc({ partner: 'manual', ...over });

  it('e101103 numa nota AUTHORIZED → CANCEL_ANALYSIS com o motivo do XML; o XML vira anexo (sem tocar cancelEventAttachmentId)', async () => {
    const s = make([manual()]);
    await s.service.cancelamentoManual(SCOPE, ID, PEDIDO, e101103());
    expect(s.byId[ID]).toMatchObject({ status: 'CANCEL_ANALYSIS', statusAntesAnalise: 'AUTHORIZED', cancelMotivo: 1, cancelReason: PEDIDO.xMotivo });
    expect(s.attachments.upload).toHaveBeenCalledWith(SCOPE, expect.objectContaining({ fileName: `${ID}.evento-101103.xml`, targetType: 'FISCAL_DOCUMENT' }));
    expect(transitionsOf(s.repo).some((t) => 'cancelEventAttachmentId' in t)).toBe(false);
  });

  it('e105104 numa nota em análise → CANCELLED (e105104), motivo do pedido, cancelledAt = dhProc; o anexo vai para cancelEventAttachmentId', async () => {
    const s = make([emAnalise({ partner: 'manual' })]);
    await s.service.cancelamentoManual(SCOPE, ID, PEDIDO, resposta('e105104'));
    expect(s.byId[ID]).toMatchObject({
      status: 'CANCELLED',
      cancelEvento: 'e105104',
      cancelMotivo: 1,
      cancelReason: PEDIDO.xMotivo,
      cancelledAt: new Date('2026-11-06T19:00:00.000Z'),
      cancelEventAttachmentId: `att:${ID}.evento-105104.xml`,
    });
  });

  it('e105105 numa nota em análise → volta a AUTHORIZED_DIVERGENT; audit com o cMotivo da resposta, sem o CPF do fiscal', async () => {
    const s = make([emAnalise({ partner: 'manual' })]);
    await s.service.cancelamentoManual(SCOPE, ID, PEDIDO, resposta('e105105', '2'));
    expect(s.byId[ID]).toMatchObject({ status: 'AUTHORIZED_DIVERGENT', statusAntesAnalise: null, cancelMotivo: null });
    const audit = auditDe(s.auditService, 'dfe.cancel_analysis');
    expect(audit).toEqual([expect.objectContaining({ payload: { documentId: ID, evento: 'e105105', cMotivo: '2' } })]);
    expect(JSON.stringify(s.auditService.append.mock.calls)).not.toContain('12345678909');
    expect(JSON.stringify(transitionsOf(s.repo))).not.toContain('12345678909');
  });

  it('homologação: a transição acontece e nenhum anexo é criado', async () => {
    const s = make([manual({ ambiente: 'homologacao' })]);
    await s.service.cancelamentoManual(SCOPE, ID, PEDIDO, e101103());
    expect(s.byId[ID].status).toBe('CANCEL_ANALYSIS');
    expect(s.attachments.upload).not.toHaveBeenCalled();
  });

  // A3 — uma falta por vez.
  it('e105104 numa nota AUTHORIZED (sem análise pendente) → 409 DFE_STATUS_INVALIDO, nada escrito', async () => {
    const s = make([manual()]);
    await expect(s.service.cancelamentoManual(SCOPE, ID, PEDIDO, resposta('e105104'))).rejects.toMatchObject({ errorCode: 'DFE_STATUS_INVALIDO', statusCode: 409 });
    expect(transitionsOf(s.repo)).toEqual([]);
  });

  it('e101103 numa nota já em análise → 409 DFE_STATUS_INVALIDO, nada escrito', async () => {
    const s = make([emAnalise({ partner: 'manual' })]);
    await expect(s.service.cancelamentoManual(SCOPE, ID, PEDIDO, e101103())).rejects.toMatchObject({ errorCode: 'DFE_STATUS_INVALIDO' });
    expect(transitionsOf(s.repo)).toEqual([]);
  });

  it('e101101 numa nota em análise (matriz [8]) → 409 DFE_STATUS_INVALIDO', async () => {
    const s = make([emAnalise({ partner: 'manual' })]);
    const e101101 = xml(`<e101101><xDesc>Cancelamento de NFS-e</xDesc><cMotivo>1</cMotivo><xMotivo>${PEDIDO.xMotivo}</xMotivo></e101101>`);
    await expect(s.service.cancelamentoManual(SCOPE, ID, PEDIDO, e101101)).rejects.toMatchObject({ errorCode: 'DFE_STATUS_INVALIDO' });
  });

  it('e101103 com cMotivo diferente do corpo → 422 DFE_EVENTO_DIVERGENTE', async () => {
    const s = make([manual()]);
    await expect(s.service.cancelamentoManual(SCOPE, ID, PEDIDO, e101103('2'))).rejects.toMatchObject({ errorCode: 'DFE_EVENTO_DIVERGENTE', statusCode: 422 });
    expect(transitionsOf(s.repo)).toEqual([]);
  });

  it('e105105 com cMotivo do corpo diferente do motivo do PEDIDO gravado → 422 DFE_EVENTO_DIVERGENTE', async () => {
    const s = make([emAnalise({ partner: 'manual', cancelMotivo: 9 })]);
    await expect(s.service.cancelamentoManual(SCOPE, ID, PEDIDO, resposta('e105105'))).rejects.toMatchObject({
      errorCode: 'DFE_EVENTO_DIVERGENTE',
      message: expect.stringContaining('pedido de análise fiscal (9)'),
    });
    expect(transitionsOf(s.repo)).toEqual([]);
  });

  it('evento de outra NFS-e → 422 DFE_EVENTO_DIVERGENTE', async () => {
    const s = make([emAnalise({ partner: 'manual' })]);
    const outra = xml('<e105104><xDesc>Cancelamento de NFS-e Deferido por Análise Fiscal</xDesc><CPFAgTrib>12345678909</CPFAgTrib><cMotivo>1</cMotivo><xMotivo>parecer do fiscal municipal</xMotivo></e105104>', '9'.repeat(50));
    await expect(s.service.cancelamentoManual(SCOPE, ID, PEDIDO, outra)).rejects.toMatchObject({ errorCode: 'DFE_EVENTO_DIVERGENTE' });
  });
});
