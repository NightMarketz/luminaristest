/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-1) — `FiscalDocumentEmissionService`: item 4 (a view carrega janela e vínculos),
 * item 15 (pendências coerentes) e a criação do substituto (item 11: saleKey temporária, subst na DPS, mesmo caminho
 * da emissão).
 */
const mockSelection = {
  enabled: true,
  ambiente: 'producao',
  port: { name: 'manual', capabilities: { kinds: ['NFSE', 'NFE', 'NFCE'], numbersDps: true, consultar: false, cancelar: false, webhook: false, substituir: true, inutilizar: false }, emitir: jest.fn(async () => ({ status: 'PROCESSING', partnerRef: 'x', errors: [] })) },
};
jest.mock('../../dfe/selectDfeEmissor', () => ({ __esModule: true, selectDfeEmissor: () => mockSelection }));
jest.mock('../../../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({ getDynamicTableRepository: () => ({ findTableByInternalName: async () => null }) }),
}));

import { FiscalDocumentEmissionService } from '../FiscalDocumentEmissionService';
import { legalParamsSemente } from '@test/helpers/legalParams';

const SCOPE = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };

function row(over: Record<string, unknown> = {}) {
  return {
    id: 'orig', kind: 'NFSE', status: 'AUTHORIZED', saleId: 's', saleKey: 's', cTribNac: '060101', anchorEntryId: 'e', ambiente: 'producao',
    partner: 'manual', partnerRef: 'orig:1', serie: 1, numero: null, nNFSe: '41', chaveOuCodigo: '1'.repeat(50), dCompet: '2026-10-01',
    vServCents: 10000n, tpRetISSQN: 1, vIssCents: null, vIbsCents: null, vCbsCents: null, currentAttemptNo: 1, authorizedAt: null,
    cancelledAt: null, cancelMotivo: null, errorsJson: null, sourceDocumentId: null, xmlAttachmentId: null, pdfAttachmentId: null,
    nfseDhProc: new Date('2026-10-01T10:00:00-03:00'), substitutesDocumentId: null, substitutedByDocumentId: null, substMotivo: null,
    attempts: [], ...over,
  };
}

function make(rows: ReturnType<typeof row>[], prazos: { cancelPrazoDias: number | null; substPrazoDias: number | null } | null = { cancelPrazoDias: 1, substPrazoDias: 30 }) {
  const repo = {
    findById: async (_s: unknown, id: string) => rows.find((r) => r.id === id) ?? null,
    listBySale: async () => rows,
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
    createSent: jest.fn(async (_s: unknown, data: Record<string, unknown>) => ({ id: 'novo', ...data, attempts: [{ attemptNo: 1, payloadJson: data.payloadJson }] })),
    transition: jest.fn(),
    nextNumber: jest.fn(async () => 7n),
  };
  const svc = new FiscalDocumentEmissionService(
    repo as never,
    null as never,
    null as never,
    { get: async () => prazos } as never,
    null as never,
    { canReadFiscalDocument: () => true } as never,
    { append: jest.fn() } as never,
    legalParamsSemente,
    null as never,
  );
  return { svc, repo };
}

describe('item 4 — a view carrega a janela e os vínculos', () => {
  it('janela calculada do perfil + substitutesDocumentId/substitutedByDocumentId/substMotivo', async () => {
    const { svc } = make([row({ substitutedByDocumentId: 'subst' }), row({ id: 'subst', status: 'SENT', substitutesDocumentId: 'orig', substMotivo: '03', nfseDhProc: null })]);
    const v = await svc.getById(SCOPE as never, 'orig');
    expect(v.janela).toEqual({ cancelarAte: '2026-10-02T23:59:59-03:00', substituirAte: '2026-10-31T23:59:59-03:00', substituirTeto: '2028-10-01T23:59:59-03:00', fonte: 'perfil' });
    expect(v).toMatchObject({ substitutesDocumentId: null, substitutedByDocumentId: 'subst', substMotivo: null });
    const s = await svc.getById(SCOPE as never, 'subst');
    expect(s).toMatchObject({ substitutesDocumentId: 'orig', substMotivo: '03', janela: { cancelarAte: null, substituirTeto: null } });
  });

  it('sem perfil: fonte desconhecida, só o teto', async () => {
    const { svc } = make([row()], null);
    expect((await svc.getById(SCOPE as never, 'orig')).janela).toMatchObject({ cancelarAte: null, substituirAte: null, fonte: 'desconhecida' });
  });
});

describe('item 15 — pendências coerentes', () => {
  it('original substituída (CANCELLED + substituta viva no mesmo cTribNac) NÃO gera cancelled_without_replacement', async () => {
    const { svc } = make([
      row({ status: 'CANCELLED', saleKey: 'cancelled:orig:s', substitutedByDocumentId: 'subst' }),
      row({ id: 'subst', status: 'AUTHORIZED', substitutesDocumentId: 'orig' }),
    ]);
    expect((await svc.getById(SCOPE as never, 'orig')).pendencias).toEqual([]);
  });

  it('substituta REJECTED → substituicao_rejeitada na ORIGINAL (viva)', async () => {
    const { svc } = make([row(), row({ id: 'subst', status: 'REJECTED', substitutesDocumentId: 'orig' })]);
    expect((await svc.getById(SCOPE as never, 'orig')).pendencias).toEqual(['substituicao_rejeitada']);
  });

  it('substituta reenviada (SENT de novo) → a pendência sai', async () => {
    const { svc } = make([row(), row({ id: 'subst', status: 'SENT', substitutesDocumentId: 'orig' })]);
    expect((await svc.getById(SCOPE as never, 'orig')).pendencias).toEqual([]);
  });

  it('substituta REJECTED e original cancelada à mão → cancelled_without_replacement (REJECTED não substitui)', async () => {
    const { svc } = make([
      row({ status: 'CANCELLED', saleKey: 'cancelled:orig:s', cancelMotivo: 1 }),
      row({ id: 'subst', status: 'REJECTED', substitutesDocumentId: 'orig' }),
    ]);
    expect((await svc.getById(SCOPE as never, 'orig')).pendencias).toEqual(['cancelled_without_replacement']);
  });

  it('F-EVT-6 (a): original cancelada pelo emitente (cancelMotivo) e depois substituída → substituicao_sobre_cancelada', async () => {
    const { svc } = make([
      row({ status: 'CANCELLED', cancelMotivo: 1, substitutedByDocumentId: 'subst' }),
      row({ id: 'subst', status: 'AUTHORIZED', substitutesDocumentId: 'orig' }),
    ]);
    expect((await svc.getById(SCOPE as never, 'orig')).pendencias).toEqual(['substituicao_sobre_cancelada']);
  });
});

describe('item 11 — createSubstitute (mesmo caminho da emissão)', () => {
  const payload = {
    versao: '1.01' as const,
    infDPS: {
      id: 'DPS' + '0'.repeat(42), tpAmb: 1 as const, dhEmi: '2026-10-05T10:00:00-03:00', verAplic: 'x', serie: 1, nDPS: 1,
      dCompet: '2026-10-01', tpEmit: 1 as const, cLocEmi: '3550308',
      subst: { chSubstda: '1'.repeat(50), cMotivo: '03' as const },
      prest: { CNPJ: '11222333000181', regTrib: { opSimpNac: 1 as const, regEspTrib: 0 } },
      toma: { CPF: '11144477735', xNome: 'C' },
      serv: { locPrest: { cLocPrestacao: '3550308' }, cServ: { cTribNac: '060101', xDescServ: 'x' } },
      valores: {
        vServPrest: { vServ: '100.00' },
        trib: { tribMun: { tribISSQN: 1 as const, tpRetISSQN: 1 as const }, totTrib: { pTotTrib: { pTotTribFed: '0.00', pTotTribEst: '0.00', pTotTribMun: '0.00' } } },
      },
    },
  };

  it('saleKey temporária subst:<orig>:<sale>, vínculo e motivo gravados, ficha manual mantém o subst', async () => {
    const { svc, repo } = make([row()]);
    await svc.createSubstitute(SCOPE as never, row() as never, { payload, vServCents: 10000, cnpjEmitente: '11222333000181', partnerAccountRef: null, subst: { cMotivo: '03', xMotivo: null } });
    const data = repo.createSent.mock.calls[0][1] as Record<string, unknown>;
    expect(data).toMatchObject({ saleId: 's', saleKey: 'subst:orig:s', cTribNac: '060101', substitutesDocumentId: 'orig', substMotivo: '03', substReason: null, numero: null });
    expect(JSON.parse(data.payloadJson as string).infDPS.subst).toEqual({ chSubstda: '1'.repeat(50), cMotivo: '03' });
    expect(repo.nextNumber).not.toHaveBeenCalled(); // modo manual: o portal numera
  });

  it('review M1: original cancelada entre a guarda e o insert (relida DENTRO da tx) → 409, nenhuma substituta criada', async () => {
    const { svc, repo } = make([row()]);
    const fora = repo.findById;
    repo.findById = async (s: unknown, id: string, tx?: unknown) => (tx ? row({ status: 'CANCELLED' }) : fora(s, id)) as never;
    await expect(
      svc.createSubstitute(SCOPE as never, row() as never, { payload, vServCents: 10000, cnpjEmitente: '11222333000181', partnerAccountRef: null, subst: { cMotivo: '03', xMotivo: null } }),
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_STATUS_INVALIDO' });
    expect(repo.createSent).not.toHaveBeenCalled();
  });
});
