const mockPort = {
  name: 'null',
  capabilities: { kinds: ['NFSE', 'NFE', 'NFCE'], numbersDps: false, consultar: true, cancelar: true, webhook: false, substituir: false, inutilizar: true },
  emitir: jest.fn(async () => ({ status: 'PROCESSING', partnerRef: 'x', errors: [] })),
  consultar: jest.fn(),
  cancelar: jest.fn(),
  verifyWebhook: jest.fn(),
};
jest.mock('../../dfe/selectDfeEmissor', () => ({
  __esModule: true,
  selectDfeEmissor: () => ({ enabled: true, ambiente: 'producao', port: mockPort }),
}));

import { FiscalDocumentLifecycleService } from '../FiscalDocumentLifecycleService';
import { NfePayloadSchema } from '../../dtos/NfePayloadDto';
import { montarNfe } from '../../models/nfeMontagem';
import { inputNfce } from '../../models/__tests__/nfeMontagem.fixture';
import { isValidNfeChave } from '../../../../lib/cnpj';
import type { AccountingScope } from '../../scope/AccountingScope';

/**
 * BE-INCR-NFCE (nó X10a, PR-4; EMENDA-3 F-NFCE-E3-2 a) — o reenvio da NF-e/NFC-e rejeitada reusa o número do DOCUMENTO
 * (MOC VG §5.1.6: a rejeitada é descartada e pode ser retransmitida). Dono, 26/10: cNF sorteado de novo; número com pedido
 * de inutilização ⇒ reenvio recusado. Herdado do PR-3: antes o reenvio caía em `nfe_reenvio_nao_implementado`.
 */
const SCOPE: AccountingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };

const docRejeitado = (over: Record<string, unknown> = {}) => ({
  id: 'doc-65',
  userId: 'u1',
  unitId: 'unit-1',
  kind: 'NFCE',
  status: 'REJECTED',
  saleId: 'sale-1',
  saleKey: 'sale-1',
  cTribNac: '',
  ambiente: 'producao',
  partner: 'null',
  serie: 3,
  numero: 7n,
  vServCents: 11998n,
  currentAttemptNo: 1,
  substitutesDocumentId: null,
  attempts: [],
  ...over,
});

function montar(opts: { doc?: ReturnType<typeof docRejeitado>; inutilizacoes?: Array<{ status: string }>; serieNoPerfil?: number } = {}) {
  const doc = opts.doc ?? docRejeitado();
  const repo = {
    findById: jest.fn(async () => doc),
    appendAttempt: jest.fn(async () => ({})),
    transition: jest.fn(async () => doc),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };
  // A remontagem devolve a nota SEM numeração, com a série ATUAL do perfil (pode ter mudado desde a emissão).
  const semNumero = montarNfe(inputNfce({ serie: opts.serieNoPerfil ?? 3, dhEmi: '2026-11-02T10:00:00-03:00' }));
  const emissionService = {
    reassembleNfeForReenvio: jest.fn(async () => ({ vServCents: 11998, payload: semNumero, cnpjEmitente: '11222333000181', partnerAccountRef: null })),
    reassembleGroupForReenvio: jest.fn(),
    getById: jest.fn(async (_s: unknown, id: string) => ({ id })),
  };
  const voidRepo = { findOverlapping: jest.fn(async () => opts.inutilizacoes ?? []) };
  const service = new FiscalDocumentLifecycleService(
    repo as never,
    emissionService as never,
    {} as never,
    {} as never,
    { canEmitFiscalDocument: () => true } as never,
    { append: jest.fn() } as never,
    voidRepo as never,
  );
  return { service, repo, emissionService, voidRepo };
}

const payloadDaTentativa = (repo: { appendAttempt: jest.Mock }) => JSON.parse((repo.appendAttempt.mock.calls[0][1] as { payloadJson: string }).payloadJson);

beforeEach(() => jest.clearAllMocks());

describe('BE-INCR-NFCE PR-4 — reenvio da NF-e/NFC-e rejeitada (E3-2 a)', () => {
  it('reusa série e nNF do documento; cNF novo; chave recalculada com o dhEmi do reenvio (AAMM 2611); tentativa 2 e porta chamada', async () => {
    const { service, repo, emissionService } = montar();
    await service.reenviar(SCOPE, 'doc-65');
    expect(emissionService.reassembleNfeForReenvio).toHaveBeenCalledWith(SCOPE, 'sale-1', 'NFCE', 'producao');
    expect(emissionService.reassembleGroupForReenvio).not.toHaveBeenCalled();
    const payload = NfePayloadSchema.parse(payloadDaTentativa(repo));
    expect(payload.infNFe.ide).toMatchObject({ nNF: 7, serie: 3, dhEmi: '2026-11-02T10:00:00-03:00' });
    expect(payload.infNFe.ide.cNF).toMatch(/^\d{8}$/);
    expect(payload.infNFe.Id.slice(3, 9)).toBe('352611'); // cUF + AAMM do dhEmi do reenvio
    expect(payload.infNFe.Id.slice(23, 37)).toBe('65003000000007'); // mod 65 + série 003 + nNF 7 (VG Tabela 2-1)
    expect(isValidNfeChave(payload.infNFe.Id.slice(3))).toBe(true);
    expect(repo.appendAttempt).toHaveBeenCalledWith(SCOPE, expect.objectContaining({ documentId: 'doc-65', attemptNo: 2 }), {});
    expect(mockPort.emitir).toHaveBeenCalledWith(expect.objectContaining({ kind: 'NFCE', ref: 'doc-65:2', ambiente: 'producao' }));
  });

  it('dono 26/10 — o cNF é sorteado de novo a cada reenvio (dois reenvios ⇒ cNF diferentes, mesmo nNF)', async () => {
    const a = montar();
    await a.service.reenviar(SCOPE, 'doc-65');
    const b = montar();
    await b.service.reenviar(SCOPE, 'doc-65');
    const [pa, pb] = [payloadDaTentativa(a.repo), payloadDaTentativa(b.repo)];
    expect([pa.infNFe.ide.nNF, pb.infNFe.ide.nNF]).toEqual([7, 7]);
    expect(pa.infNFe.ide.cNF).not.toBe(pb.infNFe.ide.cNF); // 1 chance em 10^8 de falso vermelho
  });

  it('série do perfil mudou desde a emissão ⇒ o reenvio sai com a série do DOCUMENTO (o número é da série dele)', async () => {
    const { service, repo } = montar({ serieNoPerfil: 9 });
    await service.reenviar(SCOPE, 'doc-65');
    expect(payloadDaTentativa(repo).infNFe.ide.serie).toBe(3);
  });

  it('número com pedido de inutilização (HOMOLOGATED ou REQUESTED) ⇒ 409 DFE_NUMERO_INUTILIZADO, nada gravado nem enviado', async () => {
    for (const status of ['HOMOLOGATED', 'REQUESTED']) {
      const { service, repo, voidRepo } = montar({ inutilizacoes: [{ status }] });
      await expect(service.reenviar(SCOPE, 'doc-65')).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_NUMERO_INUTILIZADO' });
      expect(voidRepo.findOverlapping).toHaveBeenCalledWith(SCOPE, { kind: 'NFCE', ambiente: 'producao', serie: 3, nIni: 7n, nFin: 7n }, ['REQUESTED', 'HOMOLOGATED']);
      expect(repo.appendAttempt).not.toHaveBeenCalled();
    }
    expect(mockPort.emitir).not.toHaveBeenCalled();
  });

  it('NF-e 55 pelo mesmo caminho (kind do documento), sem o guarda nfe_reenvio_nao_implementado', async () => {
    const { service, emissionService } = montar({ doc: docRejeitado({ kind: 'NFE' }) });
    await service.reenviar(SCOPE, 'doc-65').catch(() => undefined); // a remontagem falsa é de NFC-e; importa o roteamento
    expect(emissionService.reassembleNfeForReenvio).toHaveBeenCalledWith(SCOPE, 'sale-1', 'NFE', 'producao');
  });
});
