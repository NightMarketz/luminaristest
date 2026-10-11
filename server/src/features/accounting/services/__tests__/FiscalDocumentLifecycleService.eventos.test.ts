/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-1) — comportamentos do `FiscalDocumentLifecycleService`: item 1 (nfseDhProc), 5
 * (aviso de janela no cancelar), 6 (contrato do OUT_OF_WINDOW), 7 (prova do cancelamento manual), 11 (guardas da
 * substituição), 13 (identidade do subst no retorno manual), 14 (substituta autorizada cancela a original — unidade;
 * o repositório real está no `.eventos.integration.test.ts`) e 16 (capacidade). Leitor/assinatura/releitura REAIS.
 */
const mockPort = {
  name: 'manual',
  capabilities: { numbersDps: true, consultar: false, cancelar: false, webhook: false, substituir: true },
  emitir: jest.fn(),
  consultar: jest.fn(),
  cancelar: jest.fn(),
  verifyWebhook: jest.fn(),
};
const mockSelection: { enabled: boolean; ambiente: string | null; port: typeof mockPort } = { enabled: true, ambiente: 'producao', port: mockPort };
jest.mock('../../dfe/selectDfeEmissor', () => ({ __esModule: true, selectDfeEmissor: () => mockSelection }));
jest.mock('../../dfe/resolveEmissor', () => ({ __esModule: true, resolveEmissorFor: () => mockPort }));

import { readFileSync } from 'fs';
import { join } from 'path';
import { Prisma } from 'generated/prisma';
import { FiscalDocumentLifecycleService } from '../FiscalDocumentLifecycleService';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { CancelResult } from '../../dfe/DfeEmissorPort';
import { signNfseEventoForTest, signNfseForTest } from '@test/helpers/nfeSignature';

const SCOPE: AccountingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
const RAW = readFileSync(join(__dirname, '../../../../lib/__tests__/fixtures/nfse/nfse-autorizada-web.SYNTHETIC.xml'), 'utf8');
const CHAVE_XML = '35503082211222333000181000000000004226091234567890'; // a chave da fixture (a substituta)
const CHAVE_ORIGINAL = '35503082211222333000181000000000004126091234567890';
const xmlCom = (subst?: string) =>
  Buffer.from(signNfseForTest(subst ? RAW.replace('<cLocEmi>3550308</cLocEmi>', `<cLocEmi>3550308</cLocEmi>${subst}`) : RAW));
const SUBST_OK = `<subst><chSubstda>${CHAVE_ORIGINAL}</chSubstda><cMotivo>03</cMotivo></subst>`;

/** DPS enviada (modo manual) igual à da fixture — opSimpNac 1. */
function dps(over: { opSimpNac?: 1 | 3; vServ?: string } = {}) {
  return {
    versao: '1.01',
    infDPS: {
      tpAmb: 1,
      dhEmi: '2026-09-15T17:30:00.000Z',
      verAplic: 'luminaris-1.0',
      dCompet: '2026-09-15',
      tpEmit: 1,
      cLocEmi: '3550308',
      prest: { CNPJ: '11222333000181', regTrib: { opSimpNac: over.opSimpNac ?? 1, regEspTrib: 0 } },
      toma: { CPF: '12345678909', xNome: 'CLIENTE FICTICIA' },
      serv: { locPrest: { cLocPrestacao: '3550308' }, cServ: { cTribNac: '060101', xDescServ: 'Corte e escova', cNBS: '126021000' } },
      valores: {
        vServPrest: { vServ: over.vServ ?? '150.00' },
        vDescCondIncond: { vDescIncond: '15.00' },
        trib: { tribMun: { tribISSQN: 1, tpRetISSQN: 1 }, totTrib: { pTotTrib: { pTotTribFed: '4.00', pTotTribEst: '0.00', pTotTribMun: '5.00' } } },
      },
    },
  };
}

type Doc = ReturnType<typeof doc>;
function doc(over: Record<string, unknown> = {}, payload: unknown = dps()) {
  return {
    id: 'orig',
    userId: 'u1',
    unitId: 'unit-1',
    kind: 'NFSE',
    status: 'AUTHORIZED',
    saleId: 'sale-1',
    saleKey: 'sale-1',
    cTribNac: '060101',
    anchorEntryId: 'entry-1',
    ambiente: 'producao',
    partner: 'manual',
    partnerRef: 'orig:1',
    serie: 70001,
    numero: 15n,
    nNFSe: '41',
    chaveOuCodigo: CHAVE_ORIGINAL as string | null,
    dCompet: '2026-09-15',
    vServCents: 13500n,
    currentAttemptNo: 1,
    sourceDocumentId: 'src-orig' as string | null,
    cancelMotivo: null as number | null,
    substitutesDocumentId: null as string | null,
    substMotivo: null as string | null,
    createdAt: new Date('2026-09-15T17:00:00Z'),
    attempts: [{ attemptNo: 1, ref: 'x:1', payloadJson: JSON.stringify(payload), sentAt: new Date(), resultStatus: null, resultJson: null }],
    ...over,
  };
}
const substituta = (over: Record<string, unknown> = {}) =>
  doc({ id: 'subst', status: 'SENT', saleKey: 'subst:orig:sale-1', chaveOuCodigo: null, nNFSe: null, numero: null, sourceDocumentId: null, substitutesDocumentId: 'orig', substMotivo: '03', ...over });

const JANELA = (over: Record<string, string | null> = {}) => ({
  cancelarAte: null,
  substituirAte: null,
  substituirTeto: '2099-01-01T23:59:59-03:00',
  fonte: 'perfil',
  ...over,
});

function make(docs: Doc[], opts: { janela?: ReturnType<typeof JANELA>; policy?: Partial<Record<string, () => boolean>> } = {}) {
  const byId: Record<string, Doc> = Object.fromEntries(docs.map((d) => [d.id, d]));
  const repo = {
    findById: jest.fn(async (_s: unknown, id: string) => byId[id] ?? null),
    findByChaveOuCodigo: jest.fn(async () => null),
    findSubstituteOf: jest.fn(async (_s: unknown, id: string) => Object.values(byId).find((d) => d.substitutesDocumentId === id) ?? null),
    transition: jest.fn(async (_s: unknown, id: string, data: { status: string }) => {
      if (byId[id]) byId[id] = { ...byId[id], status: data.status };
      return byId[id];
    }),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true })),
    createPendingAttachment: jest.fn(async () => null),
    markPendingStep: jest.fn(),
    markPendingDone: jest.fn(),
    appendAttempt: jest.fn(async () => ({})),
  };
  const emissionService = {
    getById: jest.fn(async (_s: unknown, id: string) => ({ id, status: byId[id]?.status, pendencias: [], janela: opts.janela ?? JANELA() })),
    reassembleGroupForReenvio: jest.fn(async () => ({ vServCents: 13500, payload: { ...dps(), infDPS: { ...dps().infDPS, id: 'DPS' + '0'.repeat(42), serie: 1, nDPS: 1 } }, cnpjEmitente: '11222333000181', partnerAccountRef: null })),
    createSubstitute: jest.fn(async () => ({ id: 'novo', attempts: [] })),
  };
  const documentAttachmentService = { upload: jest.fn(async (_s: unknown, a: { fileName: string }) => ({ id: `att:${a.fileName}` })) };
  const postingService = { attachSourceDocument: jest.fn(async () => ({ id: 'src-new' })), retireSourceDocument: jest.fn(async () => undefined) };
  const policy = { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true, canReadFiscalDocument: () => true, ...opts.policy };
  const auditService = { append: jest.fn() };
  const service = new FiscalDocumentLifecycleService(repo as never, emissionService as never, documentAttachmentService as never, postingService as never, policy as never, auditService as never);
  return { service, repo, emissionService, documentAttachmentService, postingService, auditService, byId };
}
const transitionsOf = (repo: { transition: jest.Mock }, id: string) =>
  repo.transition.mock.calls.filter((c) => c[1] === id).map((c) => c[2] as Record<string, unknown>);

beforeEach(() => {
  jest.clearAllMocks();
  mockSelection.enabled = true;
  mockSelection.ambiente = 'producao';
  mockPort.name = 'manual';
  mockPort.capabilities = { numbersDps: true, consultar: false, cancelar: false, webhook: false, substituir: true };
});

describe('item 1 — nfseDhProc', () => {
  it('retorno manual grava o dhProc da nota (2026-09-15T14:32:10-03:00), não o instante do upload', async () => {
    const s = make([doc({ id: 'd', status: 'SENT', chaveOuCodigo: null, sourceDocumentId: null })]);
    await s.service.retornoManual(SCOPE, 'd', xmlCom());
    expect(transitionsOf(s.repo, 'd')[0].nfseDhProc).toEqual(new Date('2026-09-15T14:32:10-03:00'));
  });

  it('por máquina: EmissaoResult.dhProc vira nfseDhProc; ausente ⇒ null', async () => {
    mockPort.name = 'null';
    mockPort.capabilities = { numbersDps: false, consultar: true, cancelar: true, webhook: false, substituir: true };
    const s = make([doc({ id: 'd', status: 'SENT', partner: 'null', ambiente: 'producao' })]);
    mockPort.consultar.mockResolvedValueOnce({ status: 'AUTHORIZED', partnerRef: 'd:1', numero: '15', chaveOuCodigo: 'K', dhProc: '2026-10-01T10:00:00-03:00', errors: [] });
    await s.service.consultarUm(SCOPE, 'd');
    expect(transitionsOf(s.repo, 'd')[0].nfseDhProc).toEqual(new Date('2026-10-01T10:00:00-03:00'));
  });
});

describe('itens 5 e 6 — cancelamento por máquina com a janela e contrato do OUT_OF_WINDOW', () => {
  beforeEach(() => {
    mockPort.name = 'null';
    mockPort.capabilities = { numbersDps: false, consultar: true, cancelar: true, webhook: false, substituir: true };
  });
  const maquina = () => doc({ partner: 'null' });

  it('item 5: perfil com 1 dia, nota de 3 dias, porta devolve CANCELLED → 200 com aviso (o fisco decide)', async () => {
    const s = make([maquina()], { janela: JANELA({ cancelarAte: '2026-09-16T23:59:59-03:00' }) });
    mockPort.cancelar.mockResolvedValueOnce({ status: 'CANCELLED', errors: [] });
    const r = await s.service.cancelar(SCOPE, 'orig', { cMotivo: 1, xMotivo: 'erro na emissao da nota' });
    expect(r.avisos).toEqual(['fora_da_janela_configurada']);
    expect(mockPort.cancelar).toHaveBeenCalledTimes(1);
    expect(transitionsOf(s.repo, 'orig')[0].status).toBe('CANCELLED');
  });

  it('item 5: dentro da janela ou sem prazo → sem aviso', async () => {
    const s = make([maquina()], { janela: JANELA({ cancelarAte: '2099-01-01T23:59:59-03:00' }) });
    mockPort.cancelar.mockResolvedValueOnce({ status: 'CANCELLED', errors: [] });
    expect((await s.service.cancelar(SCOPE, 'orig', { cMotivo: 1, xMotivo: 'erro na emissao da nota' })).avisos).toEqual([]);
  });

  /** Fixture de adaptador (item 6): traduz a lista de erros do fisco pela regra do JSDoc de `CancelResult`. */
  const traduzCancelamento = (errors: Array<{ code: string; message: string }>): CancelResult =>
    errors.some((e) => e.code === 'E0822') ? { status: 'OUT_OF_WINDOW', errors } : { status: 'REJECTED', errors };

  it('item 6: rejeição E0822 → 409 DFE_CANCEL_OUT_OF_WINDOW, nada escrito', async () => {
    const s = make([maquina()]);
    mockPort.cancelar.mockResolvedValueOnce(traduzCancelamento([{ code: 'E0822', message: 'fora do prazo' }]));
    await expect(s.service.cancelar(SCOPE, 'orig', { cMotivo: 1, xMotivo: 'erro na emissao da nota' })).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_CANCEL_OUT_OF_WINDOW' });
    expect(s.repo.transition).not.toHaveBeenCalled();
  });

  it.each(['E0823', 'E0824', 'E0827', 'E0840'])('item 6: rejeição %s → 409 DFE_CANCEL_REJECTED com o código na mensagem', async (code) => {
    const s = make([maquina()]);
    mockPort.cancelar.mockResolvedValueOnce(traduzCancelamento([{ code, message: 'regra do município' }]));
    await expect(s.service.cancelar(SCOPE, 'orig', { cMotivo: 1, xMotivo: 'erro na emissao da nota' })).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'DFE_CANCEL_REJECTED',
      message: expect.stringContaining(code),
    });
  });
});

describe('item 7 — cancelamento manual guarda a prova', () => {
  const evento = () =>
    Buffer.from(
      signNfseEventoForTest(
        '<?xml version="1.0" encoding="UTF-8"?><evento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">' +
          `<infEvento Id="EVT${'1'.repeat(59)}"><verAplic>SefinNac</verAplic><ambGer>2</ambGer><nSeqEvento>001</nSeqEvento>` +
          '<dhProc>2026-09-16T10:00:00-03:00</dhProc><nDFSe>88</nDFSe><pedRegEvento versao="1.01">' +
          `<infPedReg Id="PRE${'2'.repeat(56)}"><tpAmb>1</tpAmb><verAplic>EmissorWeb</verAplic>` +
          '<dhEvento>2026-09-16T09:59:00-03:00</dhEvento><CNPJAutor>11222333000181</CNPJAutor>' +
          `<chNFSe>${CHAVE_ORIGINAL}</chNFSe><e101101><xDesc>Cancelamento de NFS-e</xDesc><cMotivo>1</cMotivo>` +
          '<xMotivo>valor digitado errado no portal</xMotivo></e101101></infPedReg></pedRegEvento></infEvento></evento>',
      ),
    );

  it('produção: anexo <id>.evento-101101.xml criado DEPOIS do CANCELLED e o id gravado; cancelledAt = dhProc do evento', async () => {
    const s = make([doc()]);
    await s.service.cancelamentoManual(SCOPE, 'orig', { cMotivo: 1, xMotivo: 'valor digitado errado no portal' }, evento());
    const [cancel, anexo] = transitionsOf(s.repo, 'orig');
    expect(cancel).toMatchObject({ status: 'CANCELLED', cancelledAt: new Date('2026-09-16T10:00:00-03:00') });
    expect(s.documentAttachmentService.upload).toHaveBeenCalledWith(SCOPE, expect.objectContaining({ targetType: 'FISCAL_DOCUMENT', targetId: 'orig', fileName: 'orig.evento-101101.xml' }));
    expect(anexo).toMatchObject({ status: 'CANCELLED', whenStatusIn: ['CANCELLED'], cancelEventAttachmentId: 'att:orig.evento-101101.xml' });
  });

  it('homologação: nenhum anexo', async () => {
    const s = make([doc({ ambiente: 'homologacao' })]);
    await s.service.cancelamentoManual(SCOPE, 'orig', { cMotivo: 1, xMotivo: 'valor digitado errado no portal' }, evento());
    expect(s.documentAttachmentService.upload).not.toHaveBeenCalled();
    expect(transitionsOf(s.repo, 'orig')).toHaveLength(1);
  });

  it('falha no anexo deixa CANCELLED sem anexo (não propaga)', async () => {
    const s = make([doc()]);
    s.documentAttachmentService.upload.mockRejectedValueOnce(new Error('disco cheio'));
    await expect(s.service.cancelamentoManual(SCOPE, 'orig', { cMotivo: 1, xMotivo: 'valor digitado errado no portal' }, evento())).resolves.toBeDefined();
    expect(transitionsOf(s.repo, 'orig')).toHaveLength(1);
  });
});

describe('itens 11, 12 e 16 — pedir a substituição', () => {
  const pedido = { cMotivo: '03' as const };

  it('feliz: cria o substituto com subst { chSubstda = chave da original, cMotivo } no payload; 201 sem aviso', async () => {
    const s = make([doc()]);
    const r = await s.service.substituir(SCOPE, 'orig', pedido);
    expect(s.emissionService.createSubstitute).toHaveBeenCalledTimes(1);
    const [, original, args] = s.emissionService.createSubstitute.mock.calls[0] as unknown as [unknown, { id: string }, { payload: { infDPS: { subst: unknown } }; subst: unknown }];
    expect(original.id).toBe('orig');
    expect(args.payload.infDPS.subst).toEqual({ chSubstda: CHAVE_ORIGINAL, cMotivo: '03' });
    expect(args.subst).toEqual({ cMotivo: '03', xMotivo: null });
    expect(r.avisos).toEqual([]);
    expect(s.repo.transition).not.toHaveBeenCalled(); // a original só cai quando a substituta autorizar (item 14)
  });

  const semEscrita = (s: ReturnType<typeof make>) => expect(s.emissionService.createSubstitute).not.toHaveBeenCalled();

  it('E0046: original não autorizada → 409 DFE_STATUS_INVALIDO', async () => {
    const s = make([doc({ status: 'CANCELLED' })]);
    await expect(s.service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_STATUS_INVALIDO' });
    semEscrita(s);
  });

  it('um substituto por original → 409 DFE_SUBSTITUICAO_EXISTENTE', async () => {
    const s = make([doc(), substituta({ status: 'REJECTED' })]);
    await expect(s.service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_SUBSTITUICAO_EXISTENTE' });
    semEscrita(s);
  });

  it('corrida (P2002 na saleKey temporária) → 409 DFE_SUBSTITUICAO_EXISTENTE', async () => {
    const s = make([doc()]);
    s.emissionService.createSubstitute.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' }));
    await expect(s.service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_SUBSTITUICAO_EXISTENTE' });
  });

  it('Anexo I [114]: depois do teto de 2 anos → 409 DFE_SUBST_FORA_DO_TETO', async () => {
    const s = make([doc()], { janela: JANELA({ substituirTeto: '2020-01-01T23:59:59-03:00' }) });
    await expect(s.service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_SUBST_FORA_DO_TETO' });
    semEscrita(s);
  });

  it('E0050: fora de substituirAte com cMotivo 03 → aviso; com 01/02 (Simples) → sem aviso', async () => {
    const janela = JANELA({ substituirAte: '2020-01-01T23:59:59-03:00' });
    expect((await make([doc()], { janela }).service.substituir(SCOPE, 'orig', pedido)).avisos).toEqual(['fora_da_janela_configurada']);
    expect((await make([doc()], { janela }).service.substituir(SCOPE, 'orig', { cMotivo: '01' })).avisos).toEqual([]);
    expect((await make([doc()], { janela }).service.substituir(SCOPE, 'orig', { cMotivo: '02' })).avisos).toEqual([]);
  });

  it('item 12: Simples com valor alterado na remontagem → 422 SUBSTITUICAO_BLOQUEADA citando E0061', async () => {
    const s = make([doc({}, dps({ opSimpNac: 3 }))]);
    s.emissionService.reassembleGroupForReenvio.mockResolvedValueOnce({
      vServCents: 16000,
      payload: { ...dps({ opSimpNac: 3, vServ: '160.00' }), infDPS: { ...dps({ opSimpNac: 3, vServ: '160.00' }).infDPS, id: 'DPS' + '0'.repeat(42), serie: 1, nDPS: 1 } },
      cnpjEmitente: '11222333000181',
      partnerAccountRef: null,
    });
    await expect(s.service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 422, errorCode: 'SUBSTITUICAO_BLOQUEADA', message: expect.stringContaining('E0061') });
    semEscrita(s);
  });

  it('item 16 / §7: adaptador sem `substituir` ou documento NF-e → 409 DFE_SUBST_NAO_SUPORTADA', async () => {
    mockPort.capabilities = { ...mockPort.capabilities, substituir: false };
    await expect(make([doc()]).service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_SUBST_NAO_SUPORTADA' });
    mockPort.capabilities = { ...mockPort.capabilities, substituir: true };
    await expect(make([doc({ kind: 'NFE' })]).service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_SUBST_NAO_SUPORTADA' });
  });

  it('policy: exige emitir E cancelar', async () => {
    await expect(make([doc()], { policy: { canCancelFiscalDocument: () => false } }).service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 403 });
    await expect(make([doc()], { policy: { canEmitFiscalDocument: () => false } }).service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lacuna registrada: nota de saldo vencido (saleKey ≠ saleId) → 409 sem escrita', async () => {
    const s = make([doc({ saleKey: 'expiry:bal-1:2026-09-30' })]);
    await expect(s.service.substituir(SCOPE, 'orig', pedido)).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_SUBST_NAO_SUPORTADA' });
    semEscrita(s);
  });
});

describe('review B1 — reenviar a substituta REJECTED recoloca o subst', () => {
  const payloadDaTentativa2 = (repo: { appendAttempt: jest.Mock }) =>
    JSON.parse((repo.appendAttempt.mock.calls[0][1] as { payloadJson: string }).payloadJson) as { infDPS: { subst?: unknown } };

  it('manual: payloadJson da tentativa 2 traz subst { chave da original, substMotivo }', async () => {
    const s = make([doc(), substituta({ status: 'REJECTED' })]);
    await s.service.reenviar(SCOPE, 'subst');
    expect(payloadDaTentativa2(s.repo as never).infDPS.subst).toEqual({ chSubstda: CHAVE_ORIGINAL, cMotivo: '03' });
  });

  it('máquina: idem, com xMotivo do pedido', async () => {
    mockPort.name = 'null';
    mockPort.capabilities = { numbersDps: false, consultar: true, cancelar: true, webhook: false, substituir: true };
    const s = make([doc({ partner: 'null' }), substituta({ status: 'REJECTED', partner: 'null', numero: 9n, substMotivo: '99', substReason: 'valor do servico corrigido' })]);
    await s.service.reenviar(SCOPE, 'subst');
    expect(payloadDaTentativa2(s.repo as never).infDPS.subst).toEqual({ chSubstda: CHAVE_ORIGINAL, cMotivo: '99', xMotivo: 'valor do servico corrigido' });
  });
});

describe('item 13 — retorno manual: identidade do subst (os 4 cruzamentos)', () => {
  it('substituto + nota com o subst certo → autoriza', async () => {
    const s = make([doc(), substituta()]);
    await s.service.retornoManual(SCOPE, 'subst', xmlCom(SUBST_OK));
    expect(transitionsOf(s.repo, 'subst').at(-1)?.status).toBe('AUTHORIZED');
  });

  it.each([
    ['substituto + nota SEM subst', substituta(), xmlCom()],
    ['substituto + nota que substitui OUTRA chave', substituta(), xmlCom(`<subst><chSubstda>${'9'.repeat(50)}</chSubstda><cMotivo>03</cMotivo></subst>`)],
    ['substituto + cMotivo diferente do pedido', substituta(), xmlCom(`<subst><chSubstda>${CHAVE_ORIGINAL}</chSubstda><cMotivo>04</cMotivo></subst>`)],
    ['documento comum + nota COM subst ("use a substituição")', doc({ id: 'subst', status: 'SENT', chaveOuCodigo: null }), xmlCom(SUBST_OK)],
  ])('%s → 422 DFE_IDENTIDADE_DIVERGENTE, nada escrito', async (_caso, alvo, xml) => {
    const s = make([doc(), alvo as Doc]);
    await expect(s.service.retornoManual(SCOPE, 'subst', xml)).rejects.toMatchObject({ statusCode: 422, errorCode: 'DFE_IDENTIDADE_DIVERGENTE' });
    expect(s.repo.transition).not.toHaveBeenCalled();
  });
});

describe('item 14 — autorizar a substituta cancela a original na mesma tx (unidade)', () => {
  it('original AUTHORIZED → CANCELLED (saleKey renomeada, vínculo, cancelledAt = dhProc da substituta), substituta assume o saleId, audit dfe.substituted, proveniência da original aposentada', async () => {
    const s = make([doc(), substituta()]);
    await s.service.retornoManual(SCOPE, 'subst', xmlCom(SUBST_OK));
    const [orig] = transitionsOf(s.repo, 'orig');
    expect(orig).toMatchObject({
      status: 'CANCELLED',
      saleKey: 'cancelled:orig:sale-1',
      substitutedByDocumentId: 'subst',
      cancelledAt: new Date('2026-09-15T14:32:10-03:00'),
      whenStatusIn: ['AUTHORIZED', 'AUTHORIZED_DIVERGENT'],
    });
    // ordem dentro da tx: a original libera a saleKey antes de a substituta assumir o saleId (@@unique)
    const ordem = s.repo.transition.mock.calls.map((c) => c[1]);
    expect(ordem.indexOf('orig')).toBeLessThan(ordem.indexOf('subst'));
    expect(transitionsOf(s.repo, 'subst')[0]).toMatchObject({ status: 'AUTHORIZED', saleKey: 'sale-1' });
    expect(s.repo.transition.mock.calls.filter((c) => c[1] === 'orig' || c[1] === 'subst').slice(0, 2).every((c) => c[3])).toBe(true); // tx propagado
    expect(s.auditService.append).toHaveBeenCalledWith(
      expect.anything(),
      SCOPE,
      expect.objectContaining({ eventType: 'dfe.substituted', payload: { documentId: 'orig', substituteDocumentId: 'subst', cMotivo: '03' } }),
    );
    expect(s.postingService.retireSourceDocument).toHaveBeenCalledWith(SCOPE, 'src-orig', 'dfe_substituted:03');
  });

  it('F-EVT-6 (a): original já CANCELLED → substituta autoriza; a original só ganha o vínculo, nada aposentado', async () => {
    const s = make([doc({ status: 'CANCELLED', saleKey: 'cancelled:orig:sale-1', cancelMotivo: 1 }), substituta()]);
    await s.service.retornoManual(SCOPE, 'subst', xmlCom(SUBST_OK));
    expect(transitionsOf(s.repo, 'orig')).toEqual([{ status: 'CANCELLED', substitutedByDocumentId: 'subst', whenStatusIn: ['CANCELLED'] }]);
    expect(transitionsOf(s.repo, 'subst')[0].status).toBe('AUTHORIZED');
    expect(s.postingService.retireSourceDocument).not.toHaveBeenCalled();
  });

  it('substituta REJECTED → original intocada', async () => {
    const s = make([doc(), substituta()]);
    await s.service.rejeicaoManual(SCOPE, 'subst', [{ code: 'E0050', message: 'fora do prazo do município' }]);
    expect(transitionsOf(s.repo, 'orig')).toEqual([]);
    expect(s.postingService.retireSourceDocument).not.toHaveBeenCalled();
  });
});
