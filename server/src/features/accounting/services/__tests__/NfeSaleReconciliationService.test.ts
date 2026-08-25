/**
 * NfeSaleReconciliationService — NF-e de VENDA × venda já lançada (BE-INCR-NFE, A3 / D2b).
 *
 * Gate 3 DURO (plano §3.3): uma venda já lançada NUNCA é re-postada — `postEntry` jamais é
 * chamado (senão duplica receita + CMV); exatamente 1 `SourceDocument` é anexado via o seam O-1
 * (`PostingService.attachSourceDocument`); NF-e órfã (sem lançamento) rejeita LOUD; divergência de
 * total SINALIZA no relatório sem postar.
 *
 * O que é mockado: o parser puro (`lib/nfe`) é substituído por um `ParsedNfe` controlado — a
 * mecânica do parser é provada em `nfe.test.ts`, aqui isolamos a LÓGICA de reconciliação. O
 * `journalEntryRepo`, a `PostingService` (dona do seam) e a `policy` são os colaboradores injetados.
 */
import { ForbiddenError, NotFoundError } from '../../../../lib/errors';
import { NfeSaleReconciliationService } from '../NfeSaleReconciliationService';
import type { ParsedNfe } from '../../../../lib/nfe';
import type { AccountingScope } from '../../scope/AccountingScope';

jest.mock('../../../../lib/nfe', () => ({ __esModule: true, parseNfe: jest.fn() }));
jest.mock('../../../../lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import logger from '../../../../lib/logger';
import { parseNfe } from '../../../../lib/nfe';
const parseNfeMock = parseNfe as jest.MockedFunction<typeof parseNfe>;

const scope: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

/** ParsedNfe mínimo com totais controláveis. vNF em centavos = totalCents. */
function makeParsedNfe(over: { vNFCents?: number; itemCount?: number; chave?: string } = {}): ParsedNfe {
  const itemCount = over.itemCount ?? 2;
  const itens = Array.from({ length: itemCount }, (_, i) => ({
    nItem: i + 1,
    cProd: `SKU-${i + 1}`,
    cEAN: '',
    xProd: `Produto ${i + 1}`,
    ncm: '00000000',
    cfop: '5102',
    uCom: 'UN',
    qCom: '1',
    vUnComStr: '50.00',
    vProdCents: 5000,
    vDescCents: 0,
    indTot: '1',
  }));
  return {
    chaveAcesso: over.chave ?? '35240600000000000000550010000000011000000017',
    ide: { numero: '1', serie: '1', dhEmiDate: '2026-06-20', tpNF: '1', natOp: 'Venda', mod: '55' },
    emit: { cnpj: '00000000000191', nome: 'Salão' },
    dest: { cpf: '00000000000', nome: 'Cliente' },
    itens,
    totais: {
      vProdCents: over.vNFCents ?? 10000,
      vDescCents: 0,
      vFreteCents: 0,
      vSegCents: 0,
      vOutroCents: 0,
      vIPICents: 0,
      vSTCents: 0,
      vICMSCents: 0,
      vNFCents: over.vNFCents ?? 10000,
    },
    protocolo: {
      cStat: '100',
      chNFe: over.chave ?? '35240600000000000000550010000000011000000017',
      nProt: '135240000000000',
      dhRecbtoDate: '2026-06-20',
    },
  };
}

/** Lançamento de receita já postado: débito 1.1.5 (A Receber) 100,00 / crédito 3.1. */
function anchorEntry(totalCents = 10000) {
  return {
    id: 'entry-sale-1',
    sourceType: 'salon.sale.finalized',
    postings: [
      { id: 'p1', accountId: 'acc-1.1.5', debitCents: totalCents, creditCents: 0 },
      { id: 'p2', accountId: 'acc-3.1', debitCents: 0, creditCents: totalCents },
    ],
  };
}

function build(
  over: { journalEntryRepo?: any; postingService?: any; policy?: any } = {},
) {
  const journalEntryRepo = {
    findBySource: jest.fn(async () => anchorEntry()),
    ...over.journalEntryRepo,
  };
  const postingService = {
    postEntry: jest.fn(async () => { throw new Error('postEntry must NEVER be called by the sale reconciliation'); }),
    attachSourceDocument: jest.fn(async () => ({ id: 'srcdoc-42' })),
    ...over.postingService,
  };
  const policy = {
    canReconcile: jest.fn(() => true),
    ...over.policy,
  };
  const svc = new NfeSaleReconciliationService(
    journalEntryRepo as any,
    postingService as any,
    policy as any,
  );
  return { svc, journalEntryRepo, postingService, policy };
}

describe('NfeSaleReconciliationService.reconcileSale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    parseNfeMock.mockReturnValue(makeParsedNfe());
  });

  it('GATE 3 — venda já lançada: postEntry NUNCA chamado, exatamente 1 SourceDocument anexado', async () => {
    const { svc, postingService, journalEntryRepo } = build();

    const report = await svc.reconcileSale(scope, { saleId: 'sale-1', xml: '<xml/>' });

    // O gate central: nenhum lançamento novo.
    expect(postingService.postEntry).not.toHaveBeenCalled();
    // Exatamente uma anexação de proveniência.
    expect(postingService.attachSourceDocument).toHaveBeenCalledTimes(1);
    expect(journalEntryRepo.findBySource).toHaveBeenCalledWith(scope, 'salon.sale.finalized', 'sale-1');
    // A chave de acesso vira o externalRef HUMANO (T7), e a data do fato é o dhEmi (reslice).
    expect(postingService.attachSourceDocument).toHaveBeenCalledWith(
      scope,
      'entry-sale-1',
      expect.objectContaining({
        sourceType: 'salon.sale.finalized',
        externalRef: '35240600000000000000550010000000011000000017',
        documentDate: '2026-06-20',
      }),
    );
    expect(report.matched).toBe(true);
    expect(report.journalEntryId).toBe('entry-sale-1');
    expect(report.sourceDocumentId).toBe('srcdoc-42');
    expect(report.totalMatches).toBe(true);
    expect(report.divergences).toHaveLength(0);
  });

  it('NF-e órfã (sem venda lançada) → rejeita LOUD; nada é anexado nem postado', async () => {
    const { svc, postingService } = build({
      journalEntryRepo: { findBySource: jest.fn(async () => null) },
    });

    await expect(svc.reconcileSale(scope, { saleId: 'sale-x', xml: '<xml/>' })).rejects.toThrow(
      NotFoundError,
    );
    expect(postingService.attachSourceDocument).not.toHaveBeenCalled();
    expect(postingService.postEntry).not.toHaveBeenCalled();
  });

  it('divergência de total → SINALIZA no relatório, ainda anexa, mas NÃO posta', async () => {
    // NF-e total = 120,00; venda lançada = 100,00 → diferença de 2000 centavos.
    parseNfeMock.mockReturnValue(makeParsedNfe({ vNFCents: 12000 }));
    const { svc, postingService } = build({
      journalEntryRepo: { findBySource: jest.fn(async () => anchorEntry(10000)) },
    });

    const report = await svc.reconcileSale(scope, { saleId: 'sale-1', xml: '<xml/>' });

    expect(report.totalMatches).toBe(false);
    expect(report.nfeTotalCents).toBe(12000);
    expect(report.saleTotalCents).toBe(10000);
    expect(report.differenceCents).toBe(2000);
    expect(report.divergences).toHaveLength(1);
    expect(report.divergences[0]).toMatch(/diverge/);
    // Sinaliza sem postar: proveniência anexada, zero lançamentos novos.
    expect(postingService.attachSourceDocument).toHaveBeenCalledTimes(1);
    expect(postingService.postEntry).not.toHaveBeenCalled();
  });

  it('reporta o nº de itens da NF-e (informativo)', async () => {
    parseNfeMock.mockReturnValue(makeParsedNfe({ itemCount: 3, vNFCents: 15000 }));
    const { svc } = build({
      journalEntryRepo: { findBySource: jest.fn(async () => anchorEntry(15000)) },
    });
    const report = await svc.reconcileSale(scope, { saleId: 'sale-1', xml: '<xml/>' });
    expect(report.nfeItemCount).toBe(3);
  });

  // H — a chave de acesso é tratada como sensível NESTE arquivo; o log de aplicação (texto corrido,
  // sem retenção controlada) não é lugar para ela.
  it('NÃO loga a chave de acesso — mantém apenas ids úteis', async () => {
    const { svc } = build();
    await svc.reconcileSale(scope, { saleId: 'sale-1', xml: '<xml/>' });

    const infoCalls = (logger.info as jest.Mock).mock.calls;
    expect(infoCalls.length).toBeGreaterThan(0);
    expect(JSON.stringify(infoCalls)).not.toContain('35240600000000000000550010000000011000000017');
    // Os ids que tornam o log útil continuam lá (a nota segue resolvível pelo SourceDocument).
    expect(infoCalls.some(([, meta]) =>
      meta?.saleId === 'sale-1' &&
      meta?.journalEntryId === 'entry-sale-1' &&
      meta?.sourceDocumentId === 'srcdoc-42',
    )).toBe(true);
  });

  it('policy nega → ForbiddenError, sem tocar repo/seam', async () => {
    const { svc, journalEntryRepo, postingService } = build({
      policy: { canReconcile: jest.fn(() => false) },
    });
    await expect(svc.reconcileSale(scope, { saleId: 'sale-1', xml: '<xml/>' })).rejects.toThrow(
      ForbiddenError,
    );
    expect(journalEntryRepo.findBySource).not.toHaveBeenCalled();
    expect(postingService.attachSourceDocument).not.toHaveBeenCalled();
  });
});
