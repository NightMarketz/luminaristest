/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-3) — régua A6: a análise fiscal do cancelamento (item 20) sobre o repositório REAL
 * (SQLite, coluna `statusAntesAnalise` da migração 20261107170000) com o `NullEmissor` REAL (roteiro programado). O job
 * de eventos roda e a 2ª leitura do documento mostra o status novo: `CANCEL_ANALYSIS`, depois `CANCELLED` (e105104) ou o
 * status de antes (e105105). Prova também a decisão do dono de 07/11 ("Apuração"): a nota em análise segue nos
 * buscadores de nota válida (soma do Simples, vendas com documento autorizado) e na fila do job.
 * Upload/proveniência/auditoria são dublês (serviços vizinhos, mesmo desenho do `.eventosPr2.integration.test`).
 * A4: o registro de cenários do piloto (PILOTO-DFE) não foi executado — o emitente vem de fixture própria.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { FiscalDocumentRepository, attemptRef } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalDocumentLifecycleService } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { NullEmissor } from '@/features/accounting/dfe/NullEmissor';

const DONO = 'u-dfe-eventos-pr3';
const UNIT = 'unit-dfe-eventos-pr3';
const scope = resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const repo = new FiscalDocumentRepository();
const retireSourceDocument = jest.fn(async () => undefined);
const append = jest.fn();
const service = new FiscalDocumentLifecycleService(
  repo,
  { getById: jest.fn(async (_s: unknown, id: string) => ({ id, janela: { cancelarAte: null, substituirAte: null, substituirTeto: null, fonte: 'desconhecida' } })) } as never,
  {} as never,
  { retireSourceDocument } as never,
  { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true } as never,
  { append } as never,
  { findOverlapping: async () => [] } as never,
);

const AGORA = new Date('2026-11-07T15:00:00.000Z');
const PEDIDO = { cMotivo: 2 as const, xMotivo: 'serviço não foi prestado ao cliente' };
let seq = 0;
const chave = (n: number) => String(n).padStart(50, '8');

async function autorizada(status: 'AUTHORIZED' | 'AUTHORIZED_DIVERGENT' = 'AUTHORIZED') {
  seq++;
  const saleId = `sale-pr3-${seq}`;
  const doc = await repo.createSent(scope, {
    kind: 'NFSE', saleId, cTribNac: '060101', anchorEntryId: 'entry-x', ambiente: 'producao', partner: 'null', serie: 70001,
    numero: BigInt(seq), dCompet: '2026-10-01', vServCents: 10000n, tpRetISSQN: 1, payloadJson: '{"v":1}',
  });
  await repo.transition(scope, doc.id, {
    status, partnerRef: attemptRef(doc.id, 1), chaveOuCodigo: chave(seq), nNFSe: String(200 + seq), authorizedAt: new Date(),
    nfseDhProc: new Date('2026-10-01T10:00:00-03:00'), sourceDocumentId: `src-${saleId}`,
  });
  return (await repo.findById(scope, doc.id))!;
}

const ENV = { DFE_PARTNER_NFSE: process.env.DFE_PARTNER_NFSE, DFE_PARTNER_ENV_NFSE: process.env.DFE_PARTNER_ENV_NFSE };

describe('X11 PR-3 — análise fiscal do cancelamento em SQLite real', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    for (const [k, v] of Object.entries(ENV)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    process.env.DFE_PARTNER_NFSE = 'null';
    process.env.DFE_PARTNER_ENV_NFSE = 'producao';
    NullEmissor.limparRoteiro();
    jest.clearAllMocks();
    await prisma.fiscalDocument.updateMany({ where: { userId: DONO, deletedAt: null }, data: { deletedAt: new Date() } });
  });

  it('A6: pedido aqui (analiseFiscal) → CANCEL_ANALYSIS gravado; o job vê o e105104 e a 2ª leitura mostra CANCELLED com o motivo do pedido', async () => {
    const doc = await autorizada();

    const r = await service.cancelar(scope, doc.id, { ...PEDIDO, analiseFiscal: true });
    expect(r.avisos).toEqual([]);
    expect(await repo.findById(scope, doc.id)).toMatchObject({ status: 'CANCEL_ANALYSIS', statusAntesAnalise: 'AUTHORIZED', cancelMotivo: 2, cancelReason: PEDIDO.xMotivo, saleKey: doc.saleId });
    expect(retireSourceDocument).not.toHaveBeenCalled();

    // Decisão "Apuração": a nota em análise segue válida nos buscadores de nota viva.
    expect(await repo.somaNfseAutorizadaNaCompetencia(scope, '2026-10')).toBe(10000n);
    expect(await repo.saleIdsWithAuthorizedDocument(scope, [doc.saleId])).toEqual([doc.saleId]);

    NullEmissor.programarEventos(doc.chaveOuCodigo!, [
      { tipo: 'e101103', dhProc: '2026-11-03T10:00:00-03:00' },
      { tipo: 'e105104', dhProc: '2026-11-06T16:00:00-03:00' },
    ]);
    expect(await service.pollEventosOnce(AGORA)).toMatchObject({ consultadas: 1, canceladas: 1, failed: 0 });

    const lida = await repo.findById(scope, doc.id);
    expect(lida).toMatchObject({ status: 'CANCELLED', cancelEvento: 'e105104', cancelMotivo: 2, statusAntesAnalise: null, saleKey: `cancelled:${doc.id}:${doc.saleId}` });
    expect(lida!.cancelledAt!.toISOString()).toBe('2026-11-06T19:00:00.000Z');
    expect(retireSourceDocument).toHaveBeenCalledWith(scope, `src-${doc.saleId}`, 'dfe_cancelled:2');
    expect(await repo.somaNfseAutorizadaNaCompetencia(scope, '2026-10')).toBe(0n);
  });

  it('A6/A2: pedido feito no portal (só o e101103 chega) numa nota divergente → CANCEL_ANALYSIS; o e105105 a devolve a AUTHORIZED_DIVERGENT', async () => {
    const doc = await autorizada('AUTHORIZED_DIVERGENT');
    NullEmissor.programarEventos(doc.chaveOuCodigo!, [{ tipo: 'e101103', dhProc: '2026-11-03T10:00:00-03:00' }]);

    expect(await service.pollEventosOnce(AGORA)).toMatchObject({ emAnalise: 1 });
    expect(await repo.findById(scope, doc.id)).toMatchObject({ status: 'CANCEL_ANALYSIS', statusAntesAnalise: 'AUTHORIZED_DIVERGENT', cancelMotivo: null });

    // A nota em análise continua na fila do job (listParaEventos filtra as notas válidas).
    expect((await repo.listParaEventos(new Date('2024-11-06T15:00:00.000Z'), 50, ['null'])).map((d) => d.id)).toEqual([doc.id]);

    NullEmissor.programarEventos(doc.chaveOuCodigo!, [
      { tipo: 'e101103', dhProc: '2026-11-03T10:00:00-03:00' },
      { tipo: 'e105105', dhProc: '2026-11-06T16:00:00-03:00' },
    ]);
    expect(await service.pollEventosOnce(AGORA)).toMatchObject({ indeferidas: 1, canceladas: 0 });
    expect(await repo.findById(scope, doc.id)).toMatchObject({ status: 'AUTHORIZED_DIVERGENT', statusAntesAnalise: null, cancelMotivo: null, cancelReason: null });
  });
});
