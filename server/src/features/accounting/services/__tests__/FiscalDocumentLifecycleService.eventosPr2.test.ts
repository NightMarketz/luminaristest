/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-2) — item 18 (job de eventos) e item 19 (cancelamento em voo), com o contrato
 * exercido pelo `NullEmissor` REAL (env `DFE_PARTNER_NFSE=null`, roteiro programado por evento) e repositório em memória.
 * O repositório real (A6: o job roda e a 2ª leitura mostra CANCELLED) está no `.eventosPr2.integration.test.ts`.
 *
 * Régua de testes do BRIEF: A2 (nota cancelada FORA do Luminaris, sem pedido local; nota com `cancelRequestedAt`) e A3
 * (evento desconhecido e evento fora do teto, cada um num caso, com a nota nomeada por número e série, nunca por id).
 * A4: o registro de cenários do piloto (PILOTO-DFE) não foi executado — o emitente vem da fixture própria abaixo.
 */
import { FiscalDocumentLifecycleService, AVISO_CANCEL_EM_ANDAMENTO } from '../FiscalDocumentLifecycleService';
import { NullEmissor } from '../../dfe/NullEmissor';
import type { EventoNfse } from '../../dfe/DfeEmissorPort';
import type { AccountingScope } from '../../scope/AccountingScope';

const SCOPE: AccountingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
const CHAVE = '35503082211222333000181000000000004126091234567890';
const CHAVE_SUBST = '35503082211222333000181000000000004226091234567890';
const AGORA = new Date('2026-11-07T15:00:00.000Z');
const NOME = 'NFS-e nº 41 (DPS série 70001 nº 15)';

function doc(over: Record<string, unknown> = {}) {
  return {
    id: 'doc-interno-xyz',
    userId: 'u1',
    unitId: 'unit-1',
    kind: 'NFSE',
    status: 'AUTHORIZED',
    saleId: 'sale-1',
    saleKey: 'sale-1',
    cTribNac: '060101',
    ambiente: 'producao',
    partner: 'null',
    partnerRef: 'doc-interno-xyz:1',
    serie: 70001,
    numero: 15n as bigint | null,
    nNFSe: '41' as string | null,
    chaveOuCodigo: CHAVE as string | null,
    nfseDhProc: new Date('2026-10-01T13:00:00.000Z') as Date | null,
    cancelRequestedAt: null as Date | null,
    sourceDocumentId: 'src-1' as string | null,
    substitutesDocumentId: null as string | null,
    currentAttemptNo: 1,
    attempts: [{ attemptNo: 1, ref: 'doc-interno-xyz:1', payloadJson: '{}', sentAt: new Date(), resultStatus: null, resultJson: null }],
    ...over,
  };
}
type Doc = ReturnType<typeof doc>;

function make(docs: Doc[], opts: { conhecida?: Doc | null; substituto?: Doc | null } = {}) {
  const byId: Record<string, Doc> = Object.fromEntries(docs.map((d) => [d.id, d]));
  const repo = {
    listParaEventos: jest.fn(async (_desde: Date, _limit: number, partners: readonly string[]) => Object.values(byId).filter((d) => partners.includes(d.partner))),
    findById: jest.fn(async (_s: unknown, id: string) => byId[id] ?? null),
    findByChaveOuCodigo: jest.fn(async () => opts.conhecida ?? null),
    findSubstituteOf: jest.fn(async () => opts.substituto ?? null),
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
  const postingService = { retireSourceDocument: jest.fn(async () => undefined) };
  const policy = { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true };
  const auditService = { append: jest.fn() };
  const service = new FiscalDocumentLifecycleService(repo as never, emissionService as never, {} as never, postingService as never, policy as never, auditService as never, { findOverlapping: async () => [] } as never);
  return { service, repo, postingService, auditService, byId };
}
const transitionsOf = (repo: { transition: jest.Mock }) => repo.transition.mock.calls.map((c) => c[2] as Record<string, unknown>);
const cancelou = (repo: { transition: jest.Mock }) => transitionsOf(repo).filter((t) => t.status === 'CANCELLED');

const ENV_KEYS = ['DFE_PARTNER_NFSE', 'DFE_PARTNER_ENV_NFSE', 'DFE_PARTNER_NFE', 'DFE_PARTNER_ENV_NFE'] as const;
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
  process.env.DFE_PARTNER_NFE = 'null';
  process.env.DFE_PARTNER_ENV_NFE = 'producao';
  NullEmissor.limparRoteiro();
  jest.restoreAllMocks();
});

describe('NullEmissor — contrato do consultarEventos (item 18)', () => {
  it('declara a capacidade e devolve o roteiro da chave (vazio sem roteiro)', async () => {
    const port = new NullEmissor();
    expect(port.capabilities.consultarEventos).toBe(true);
    expect(await port.consultarEventos(CHAVE)).toEqual([]);
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e101101', dhProc: '2026-11-01T10:00:00-03:00' }]);
    expect(await new NullEmissor().consultarEventos(CHAVE)).toEqual([{ tipo: 'e101101', dhProc: '2026-11-01T10:00:00-03:00' }]);
  });
});

describe('item 18 — eventos vistos de fora (A2: cancelada fora do Luminaris, sem pedido local)', () => {
  it.each(['e101101', 'e305101', 'e105104'] as const)('%s → CANCELLED como fato do fisco, sem chamar cancelar', async (tipo) => {
    const s = make([doc()]);
    const cancelar = jest.spyOn(NullEmissor.prototype, 'cancelar');
    NullEmissor.programarEventos(CHAVE, [{ tipo, dhProc: '2026-11-02T09:15:00-03:00' }]);

    const r = await s.service.pollEventosOnce(AGORA);

    expect(r).toMatchObject({ consultadas: 1, canceladas: 1, substituidasFora: 0, ignorados: 0, failed: 0 });
    expect(cancelar).not.toHaveBeenCalled();
    expect(cancelou(s.repo)).toEqual([
      expect.objectContaining({ cancelledAt: new Date('2026-11-02T12:15:00.000Z'), cancelEvento: tipo, cancelMotivo: null, saleKey: 'cancelled:doc-interno-xyz:sale-1', whenStatusIn: ['AUTHORIZED', 'AUTHORIZED_DIVERGENT'] }),
    ]);
    expect(s.auditService.append).toHaveBeenCalledWith(expect.anything(), SCOPE, expect.objectContaining({ eventType: 'dfe.cancelled', payload: { documentId: 'doc-interno-xyz', evento: tipo } }));
    expect(s.postingService.retireSourceDocument).toHaveBeenCalledWith(SCOPE, 'src-1', `dfe_cancelled:${tipo}`);
  });

  it('e105102 com chSubstituta desconhecida → CANCELLED marcado e105102 (a view acusa substituida_fora_do_luminaris)', async () => {
    const s = make([doc()]);
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e105102', dhProc: '2026-11-03T10:00:00-03:00', chSubstituta: CHAVE_SUBST, cMotivo: '01' }]);
    const r = await s.service.pollEventosOnce(AGORA);
    expect(r).toMatchObject({ canceladas: 1, substituidasFora: 1 });
    expect(cancelou(s.repo)).toEqual([expect.objectContaining({ cancelEvento: 'e105102', cancelledAt: new Date('2026-11-03T13:00:00.000Z') })]);
    expect(s.byId['doc-interno-xyz'].status).toBe('CANCELLED');
  });

  it('e105102 com a substituta conhecida aqui (chave) → nada muda: a autorização dela cancela a original (item 14)', async () => {
    const s = make([doc()], { conhecida: doc({ id: 'subst', chaveOuCodigo: CHAVE_SUBST }) });
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e105102', dhProc: '2026-11-03T10:00:00-03:00', chSubstituta: CHAVE_SUBST, cMotivo: '03' }]);
    const r = await s.service.pollEventosOnce(AGORA);
    expect(r).toMatchObject({ consultadas: 1, canceladas: 0, substituidasFora: 0 });
    expect(cancelou(s.repo)).toEqual([]);
  });

  it('e105102 com o substituto desta original ainda pendente (sem chave) → nada muda', async () => {
    const s = make([doc()], { substituto: doc({ id: 'subst', status: 'SENT', chaveOuCodigo: null, substitutesDocumentId: 'doc-interno-xyz' }) });
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e105102', dhProc: '2026-11-03T10:00:00-03:00', chSubstituta: CHAVE_SUBST, cMotivo: '03' }]);
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ canceladas: 0 });
    expect(cancelou(s.repo)).toEqual([]);
  });

  it('e101103 / e105105 (PR-3, F-EVT-4 b) são conhecidos e sem efeito; a nota é tocada e vai para o fim do rodízio (Q3)', async () => {
    const s = make([doc()]);
    NullEmissor.programarEventos(CHAVE, [
      { tipo: 'e101103', dhProc: '2026-11-03T10:00:00-03:00' },
      { tipo: 'e105105', dhProc: '2026-11-04T10:00:00-03:00' },
    ]);
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ consultadas: 1, canceladas: 0, ignorados: 0 });
    expect(transitionsOf(s.repo)).toEqual([{ status: 'AUTHORIZED', whenStatusIn: ['AUTHORIZED'] }]);
  });

  it('vários eventos que cancelam: vale o primeiro por dhProc', async () => {
    const s = make([doc()]);
    NullEmissor.programarEventos(CHAVE, [
      { tipo: 'e305101', dhProc: '2026-11-05T10:00:00-03:00' },
      { tipo: 'e101101', dhProc: '2026-11-02T10:00:00-03:00' },
    ]);
    await s.service.pollEventosOnce(AGORA);
    expect(cancelou(s.repo)).toEqual([expect.objectContaining({ cancelEvento: 'e101101' })]);
  });

  it('consulta só os adaptadores que declaram consultarEventos (o modo manual fica fora da fila)', async () => {
    const s = make([doc(), doc({ id: 'manual-1', partner: 'manual' })]);
    await s.service.pollEventosOnce(AGORA);
    expect(s.repo.listParaEventos).toHaveBeenCalledWith(expect.any(Date), 50, ['null']);
  });

  it('falha da porta = failed (alerta), e a nota é tocada para não travar o rodízio', async () => {
    const s = make([doc()]);
    jest.spyOn(NullEmissor.prototype, 'consultarEventos').mockRejectedValue(new Error('ECONNRESET'));
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ failed: 1, consultadas: 0 });
    expect(transitionsOf(s.repo)).toEqual([{ status: 'AUTHORIZED', whenStatusIn: ['AUTHORIZED'] }]);
  });
});

describe('A3 — uma falta por vez, nomeando a nota por número e série', () => {
  it('evento desconhecido → ignorado, com aviso que nomeia a nota (nunca o id)', async () => {
    const s = make([doc()]);
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e999999', dhProc: '2026-11-02T10:00:00-03:00' } as unknown as EventoNfse]);
    const r = await s.service.pollEventosOnce(AGORA);
    expect(r).toMatchObject({ consultadas: 1, ignorados: 1, canceladas: 0 });
    expect(r.avisos).toEqual([`${NOME}: evento desconhecido (e999999) — ignorado.`]);
    expect(r.avisos.join(' ')).not.toContain('doc-interno-xyz');
    expect(cancelou(s.repo)).toEqual([]);
  });

  it('evento depois do teto de 2 anos → ignorado, com aviso que nomeia a nota', async () => {
    const s = make([doc()]);
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e101101', dhProc: '2028-10-03T10:00:00-03:00' }]);
    const r = await s.service.pollEventosOnce(AGORA);
    expect(r).toMatchObject({ ignorados: 1, canceladas: 0 });
    expect(r.avisos).toEqual([`${NOME}: evento e101101 de 2028-10-03T10:00:00-03:00 depois do teto de 2 anos (2028-10-01T23:59:59-03:00) — ignorado.`]);
    expect(cancelou(s.repo)).toEqual([]);
  });

  it('nota com nfseDhProc fora do teto não é consultada', async () => {
    const s = make([doc({ nfseDhProc: new Date('2024-11-01T13:00:00.000Z') })]);
    const consultar = jest.spyOn(NullEmissor.prototype, 'consultarEventos');
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ consultadas: 0, skipped: 1 });
    expect(consultar).not.toHaveBeenCalled();
  });
});

describe('item 19 — cancelamento em voo', () => {
  const corpo = { cMotivo: 1 as const, xMotivo: 'valor digitado errado na venda' };

  it('a porta devolve PROCESSING (NFS-e) → grava cancelRequestedAt, aviso cancelamento_em_andamento, nada cancelado', async () => {
    const s = make([doc()]);
    NullEmissor.programarCancelamento('doc-interno-xyz:1', { status: 'PROCESSING', errors: [] });
    const antes = Date.now();
    const r = await s.service.cancelar(SCOPE, 'doc-interno-xyz', corpo);
    expect(r.avisos).toContain(AVISO_CANCEL_EM_ANDAMENTO);
    expect(cancelou(s.repo)).toEqual([]);
    const pedido = s.byId['doc-interno-xyz'].cancelRequestedAt as Date;
    expect(pedido.getTime()).toBeGreaterThanOrEqual(antes);
    expect(s.byId['doc-interno-xyz'].status).toBe('AUTHORIZED');
  });

  it('2º pedido com cancelRequestedAt há menos de 24 h → 409 DFE_CANCEL_EM_ANDAMENTO, sem chegar à porta', async () => {
    const s = make([doc({ cancelRequestedAt: new Date(Date.now() - 60 * 60 * 1000) })]);
    const cancelar = jest.spyOn(NullEmissor.prototype, 'cancelar');
    await expect(s.service.cancelar(SCOPE, 'doc-interno-xyz', corpo)).rejects.toMatchObject({ errorCode: 'DFE_CANCEL_EM_ANDAMENTO', statusCode: 409 });
    await expect(s.service.cancelar(SCOPE, 'doc-interno-xyz', corpo)).rejects.toThrow(NOME);
    expect(cancelar).not.toHaveBeenCalled();
    expect(transitionsOf(s.repo)).toEqual([]);
  });

  it('Q1: pedido em voo há mais de 24 h não segura o novo; resposta definitiva (REJECTED) tira a nota de voo', async () => {
    const s = make([doc({ cancelRequestedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) })]);
    NullEmissor.programarCancelamento('doc-interno-xyz:1', { status: 'REJECTED', errors: [{ code: 'E0840', message: 'evento impeditivo' }] });
    await expect(s.service.cancelar(SCOPE, 'doc-interno-xyz', corpo)).rejects.toMatchObject({ errorCode: 'DFE_CANCEL_REJECTED' });
    expect(s.byId['doc-interno-xyz'].cancelRequestedAt).toBeNull();
  });

  it('NF-e/NFC-e fora do X11 (BRIEF §7): PROCESSING segue 409 DFE_CANCEL_PROCESSING, sem escrita', async () => {
    const s = make([doc({ kind: 'NFE', cTribNac: '' })]);
    NullEmissor.programarCancelamento('doc-interno-xyz:1', { status: 'PROCESSING', errors: [] });
    await expect(s.service.cancelar(SCOPE, 'doc-interno-xyz', { xJust: 'cancelamento pedido pelo cliente' })).rejects.toMatchObject({ errorCode: 'DFE_CANCEL_PROCESSING' });
    expect(transitionsOf(s.repo)).toEqual([]);
  });

  it('cancelamento direto (CANCELLED) da NFS-e grava o evento e101101 (Q2)', async () => {
    const s = make([doc()]);
    await s.service.cancelar(SCOPE, 'doc-interno-xyz', corpo);
    expect(cancelou(s.repo)).toEqual([expect.objectContaining({ cancelEvento: 'e101101', cancelMotivo: 1 })]);
  });

  it('A2: nota com cancelRequestedAt — o job vê o e101101 e conclui o cancelamento', async () => {
    const s = make([doc({ cancelRequestedAt: new Date('2026-11-07T14:00:00.000Z') })]);
    NullEmissor.programarEventos(CHAVE, [{ tipo: 'e101101', dhProc: '2026-11-07T11:30:00-03:00' }]);
    expect(await s.service.pollEventosOnce(AGORA)).toMatchObject({ canceladas: 1 });
    expect(s.byId['doc-interno-xyz']).toMatchObject({ status: 'CANCELLED', cancelEvento: 'e101101', cancelledAt: new Date('2026-11-07T14:30:00.000Z') });
  });
});
