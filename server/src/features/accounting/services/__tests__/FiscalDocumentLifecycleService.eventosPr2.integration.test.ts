/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-2) — régua A6: o job de eventos roda sobre o repositório REAL (SQLite) com o
 * `NullEmissor` REAL (env `DFE_PARTNER_NFSE=null`, roteiro programado), e a 2ª leitura do documento mostra `CANCELLED`.
 * Cobre também o item 19 ponta a ponta (PROCESSING grava `cancelRequestedAt`, o 2º pedido é 409, o job conclui) e a
 * fila do `listParaEventos` (em voo primeiro, só os adaptadores que consultam, teto de 2 anos, rodízio — Q3).
 * Upload/proveniência/auditoria são dublês (serviços vizinhos, mesmo desenho do `.eventos.integration.test`).
 * A4: o registro de cenários do piloto (PILOTO-DFE) não foi executado — o emitente vem de fixture própria.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { FiscalDocumentRepository, attemptRef } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalDocumentLifecycleService } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { NullEmissor } from '@/features/accounting/dfe/NullEmissor';

const DONO = 'u-dfe-eventos-pr2';
const UNIT = 'unit-dfe-eventos-pr2';
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
let seq = 0;
const chave = (n: number) => String(n).padStart(50, '7');

async function autorizada(over: { partner?: string; nfseDhProc?: Date; saleId?: string } = {}) {
  seq++;
  const saleId = over.saleId ?? `sale-ev-${seq}`;
  const doc = await repo.createSent(scope, {
    kind: 'NFSE', saleId, cTribNac: '060101', anchorEntryId: 'entry-x', ambiente: 'producao', partner: over.partner ?? 'null', serie: 70001,
    numero: BigInt(seq), dCompet: '2026-10-01', vServCents: 10000n, tpRetISSQN: 1, payloadJson: '{"v":1}',
  });
  await repo.transition(scope, doc.id, {
    status: 'AUTHORIZED', partnerRef: attemptRef(doc.id, 1), chaveOuCodigo: chave(seq), nNFSe: String(100 + seq), authorizedAt: new Date(),
    nfseDhProc: over.nfseDhProc ?? new Date('2026-10-01T10:00:00-03:00'), sourceDocumentId: `src-${saleId}`,
  });
  return (await repo.findById(scope, doc.id))!;
}

const ENV = { DFE_PARTNER_NFSE: process.env.DFE_PARTNER_NFSE, DFE_PARTNER_ENV_NFSE: process.env.DFE_PARTNER_ENV_NFSE };

describe('X11 PR-2 — job de eventos e cancelamento em voo em SQLite real', () => {
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
    // Cada caso começa com a fila vazia: as notas dos casos anteriores saem da consulta (soft-delete, como em produção).
    await prisma.fiscalDocument.updateMany({ where: { userId: DONO, deletedAt: null }, data: { deletedAt: new Date() } });
  });

  it('A6/A2: nota cancelada FORA do Luminaris — o job aplica o e101101 e a 2ª leitura mostra CANCELLED', async () => {
    const doc = await autorizada();
    NullEmissor.programarEventos(doc.chaveOuCodigo!, [{ tipo: 'e101101', dhProc: '2026-11-02T09:15:00-03:00' }]);

    expect(await service.pollEventosOnce(AGORA)).toMatchObject({ consultadas: 1, canceladas: 1, failed: 0 });

    const lida = await repo.findById(scope, doc.id);
    expect(lida).toMatchObject({ status: 'CANCELLED', cancelEvento: 'e101101', cancelMotivo: null, saleKey: `cancelled:${doc.id}:${doc.saleId}` });
    expect(lida!.cancelledAt!.toISOString()).toBe('2026-11-02T12:15:00.000Z');
    expect(retireSourceDocument).toHaveBeenCalledWith(scope, `src-${doc.saleId}`, 'dfe_cancelled:e101101');
    // A nota cancelada sai da fila: o tick seguinte não a consulta de novo.
    expect(await service.pollEventosOnce(AGORA)).toMatchObject({ consultadas: 0, canceladas: 0 });
  });

  it('e105102 com substituta desconhecida → CANCELLED com cancelEvento e105102, sem vínculo', async () => {
    const doc = await autorizada();
    NullEmissor.programarEventos(doc.chaveOuCodigo!, [{ tipo: 'e105102', dhProc: '2026-11-03T10:00:00-03:00', chSubstituta: '9'.repeat(50), cMotivo: '01' }]);
    expect(await service.pollEventosOnce(AGORA)).toMatchObject({ canceladas: 1, substituidasFora: 1 });
    expect(await repo.findById(scope, doc.id)).toMatchObject({ status: 'CANCELLED', cancelEvento: 'e105102', substitutedByDocumentId: null });
  });

  it('item 19 ponta a ponta: PROCESSING grava cancelRequestedAt, o 2º pedido é 409, o job vê o e101101 e conclui', async () => {
    const doc = await autorizada();
    NullEmissor.programarCancelamento(doc.partnerRef!, { status: 'PROCESSING', errors: [] });
    const corpo = { cMotivo: 2 as const, xMotivo: 'serviço não foi prestado ao cliente' };

    const r = await service.cancelar(scope, doc.id, corpo);
    expect(r.avisos).toContain('cancelamento_em_andamento');
    const emVoo = await repo.findById(scope, doc.id);
    expect(emVoo).toMatchObject({ status: 'AUTHORIZED' });
    expect(emVoo!.cancelRequestedAt).toBeInstanceOf(Date);

    await expect(service.cancelar(scope, doc.id, corpo)).rejects.toMatchObject({ errorCode: 'DFE_CANCEL_EM_ANDAMENTO', statusCode: 409 });

    NullEmissor.programarEventos(doc.chaveOuCodigo!, [{ tipo: 'e101101', dhProc: '2026-11-07T11:00:00-03:00' }]);
    expect(await service.pollEventosOnce(AGORA)).toMatchObject({ canceladas: 1 });
    expect(await repo.findById(scope, doc.id)).toMatchObject({ status: 'CANCELLED', cancelEvento: 'e101101' });
  });

  it('fila: em voo vem primeiro (fora do teto do rodízio); o modo manual e a nota fora dos 2 anos não entram', async () => {
    const a = await autorizada();
    const b = await autorizada();
    const emVoo = await autorizada();
    await repo.transition(scope, emVoo.id, { status: 'AUTHORIZED', cancelRequestedAt: new Date('2026-11-07T14:00:00.000Z') });
    await autorizada({ partner: 'manual' });
    await autorizada({ nfseDhProc: new Date('2024-10-01T10:00:00-03:00') });

    const desde = new Date('2024-11-06T15:00:00.000Z');
    const fila = await repo.listParaEventos(desde, 1, ['null']);
    expect(fila.map((d) => d.id)).toEqual([emVoo.id, a.id]); // em voo + 1 do rodízio (o mais antigo por updatedAt)
    void b;
  });

  it('Q3 rodízio: a nota consultada sem mudança é tocada e vai para o fim — o tick seguinte pega a outra', async () => {
    const a = await autorizada();
    const b = await autorizada();
    await service.pollEventosOnce(AGORA, 1);
    const consultar = jest.spyOn(NullEmissor.prototype, 'consultarEventos');
    await service.pollEventosOnce(AGORA, 1);
    expect(consultar).toHaveBeenCalledTimes(1);
    expect(consultar).toHaveBeenCalledWith(b.chaveOuCodigo);
    consultar.mockRestore();
    void a;
  });
});
