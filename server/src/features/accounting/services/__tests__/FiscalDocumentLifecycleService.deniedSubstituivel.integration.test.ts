/**
 * BE-INCR-DFE-DENIED-SUBSTITUIVEL PR-0 (lacunas 4eaa, db50, 4fb9; F-DEN-1..4 ratificados em (a), dono 25/11) — SQLite REAL,
 * serviço e repositório reais, só a porta é falsa.
 *   Bloco A (itens 1-4): a DENIED renomeia a `saleKey` (`denied:<id>:<saleId>`) e libera o @@unique; número/protocolo ficam.
 *   Bloco C (itens 9-13): 101/151 achados na consulta ⇒ CANCELLED (transição própria); 252/226/…/613 ⇒ o job desiste na 1ª
 *   rodada e o alerta não cai no skip `dfe_`; 217 e 108/109/656 seguem como estavam.
 * A premissa "o número da denegada fica consumido" é gate humano 9b9d — nada aqui a afirma nem a nega.
 */
const mockPort = {
  name: 'null',
  capabilities: { kinds: ['NFSE', 'NFE', 'NFCE'], numbersDps: false, consultar: true, cancelar: true, webhook: false },
  emitir: jest.fn(),
  consultar: jest.fn(),
  cancelar: jest.fn(),
  verifyWebhook: jest.fn(),
};
jest.mock('@/features/accounting/dfe/selectDfeEmissor', () => ({
  __esModule: true,
  selectDfeEmissor: () => ({ enabled: true, ambiente: 'homologacao', port: mockPort }),
}));

import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { FiscalDocumentRepository } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalDocumentLifecycleService, DfeConsultaInvalidaError, NAO_CONSTA_MAX_CONSULTAS } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { STATUS_QUE_OCUPAM_NUMERO } from '@/features/accounting/models/inutilizacao';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import type { EmissaoResult } from '@/features/accounting/dfe/DfeEmissorPort';

const DONO = 'u-dfe-den-subst';
const UNIT = 'unit-dfe-den-subst';
const scope = resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const repo = new FiscalDocumentRepository();
const append = jest.fn();
const retireSourceDocument = jest.fn();

const service = new FiscalDocumentLifecycleService(
  repo,
  { getById: jest.fn(async (_s: unknown, id: string) => ({ id })) } as never,
  { upload: jest.fn(async () => ({ id: 'att' })) } as never,
  { attachSourceDocument: jest.fn(async () => ({ id: 'src' })), retireSourceDocument } as never,
  { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true } as never,
  { append } as never,
  { findOverlapping: async () => [] } as never,
);

let seq = 0;
type Inicial = 'SENT' | 'PROCESSING' | 'CONTINGENCY' | 'AUTHORIZED';
async function nota(inicial: Inicial = 'PROCESSING', saleId?: string) {
  seq += 1;
  const doc = await repo.createSent(scope, {
    kind: 'NFCE',
    saleId: saleId ?? `sale-den-subst-${seq}`,
    cTribNac: '',
    anchorEntryId: 'entry-x',
    ambiente: 'homologacao',
    partner: 'null',
    serie: 1,
    numero: BigInt(1000 + seq),
    dCompet: '2026-11-25',
    vServCents: 10000n,
    tpRetISSQN: 1,
    payloadJson: '{"v":1}',
  });
  if (inicial !== 'SENT') await repo.transition(scope, doc.id, { status: inicial });
  return doc;
}
const row = (id: string) => prisma.fiscalDocument.findUniqueOrThrow({ where: { id } });
const HORA = 3_600_000;
let relogio = Date.now() + 10 * HORA;
const tick = () => {
  relogio += 2 * HORA;
  return service.pollPendingOnce(new Date(relogio));
};
const consultaDevolve = (id: string, r: (ref: string) => EmissaoResult) =>
  mockPort.consultar.mockImplementation(async (ref: string): Promise<EmissaoResult> => (ref.startsWith(id) ? r(ref) : { status: 'PROCESSING', partnerRef: ref, errors: [] }));
/** SENT/PROCESSING: o polling consulta; CONTINGENCY: quem aplica é o job da contingência (`aplicarResultadoDoEnvio`), não o polling. */
const aplicar = async (id: string, inicial: Inicial, r: EmissaoResult) => {
  if (inicial === 'CONTINGENCY') {
    await service.aplicarResultadoDoEnvio(scope, (await repo.findById(scope, id))!, r);
    return { failed: 0 };
  }
  consultaDevolve(id, () => r);
  return tick();
};
const chamadasDe = (id: string) => mockPort.consultar.mock.calls.filter((c) => String(c[0]).startsWith(id)).length;
const eventosDe = (id: string) => append.mock.calls.map((c) => c[2] as { eventType: string; targetId: string }).filter((e) => e.targetId === id).map((e) => e.eventType);

describe('DENIED substituível + consulta que termina (PR-0)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);
  beforeEach(() => {
    mockPort.consultar.mockReset();
    append.mockReset();
    retireSourceDocument.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Bloco A — a DENIED libera a saleKey', () => {
    it.each(['SENT', 'PROCESSING', 'CONTINGENCY'] as const)('item 1: %s → DENIED renomeia a saleKey; numero, chaveOuCodigo e errorsJson ficam', async (inicial) => {
      const d = await nota(inicial);
      const antes = await row(d.id);
      await aplicar(d.id, inicial, { status: 'DENIED', partnerRef: 'ref', errors: [{ code: '110', message: 'Uso Denegado' }] });
      const r = await row(d.id);
      expect(r.status).toBe('DENIED');
      expect(r.saleKey).toBe(`denied:${d.id}:${d.saleId}`);
      expect(r.saleId).toBe(d.saleId);
      expect(r.numero).toBe(antes.numero);
      expect(r.chaveOuCodigo).toBe(antes.chaveOuCodigo);
      expect(JSON.parse(r.errorsJson ?? '[]')).toEqual([{ code: '110', message: 'Uso Denegado' }]);
    });

    it('item 1: a REJEITADA NÃO renomeia (só a denegada) — a saleKey fica = saleId', async () => {
      const d = await nota();
      consultaDevolve(d.id, (ref) => ({ status: 'REJECTED', partnerRef: ref, errors: [{ code: '539', message: 'x' }] }));
      await tick();
      expect((await row(d.id)).saleKey).toBe(d.saleId);
    });

    it('item 2: com a denegada renomeada, a nota nova da mesma venda/kind NÃO dá P2002; antes do rename dava', async () => {
      const d = await nota();
      await expect(nota('PROCESSING', d.saleId)).rejects.toThrow(/Unique constraint/); // vermelho pelo motivo certo: saleKey ocupada
      consultaDevolve(d.id, (ref) => ({ status: 'DENIED', partnerRef: ref, errors: [{ code: '301', message: 'Uso Denegado' }] }));
      await tick();
      const nova = await nota('SENT', d.saleId);
      expect(nova.saleKey).toBe(d.saleId);
      expect(nova.id).not.toBe(d.id);
    });

    it('item 3: número e protocolo não somem — a denegada renomeada segue em listNumbered e DENIED segue em STATUS_QUE_OCUPAM_NUMERO', async () => {
      const d = await nota();
      consultaDevolve(d.id, (ref) => ({ status: 'DENIED', partnerRef: ref, errors: [{ code: '110', message: 'Uso Denegado' }] }));
      await tick();
      const numeradas = await repo.listNumbered(scope, 'NFCE');
      expect(numeradas.find((n) => n.id === d.id)).toMatchObject({ status: 'DENIED', numero: d.numero });
      expect(STATUS_QUE_OCUPAM_NUMERO).toContain('DENIED');
    });

    it('item 4: nenhum gate depende do prefixo — findLiveBySale decide pelo status, findBySaleKey pela chave inteira', async () => {
      const viva = await nota('SENT');
      await repo.transition(scope, viva.id, { status: 'SENT', saleKey: `cancelled:${viva.id}:${viva.saleId}` }); // prefixo de cancelada, status vivo
      expect((await repo.findLiveBySale(scope, viva.saleId, 'NFCE')).map((x) => x.id)).toContain(viva.id);
      expect((await repo.findBySaleKey(scope, `cancelled:${viva.id}:${viva.saleId}`, 'NFCE'))?.id).toBe(viva.id);
      expect(await repo.findBySaleKey(scope, viva.saleId, 'NFCE')).toBeNull();
    });
  });

  describe('Bloco C — cStat 101/151 na consulta (item 13)', () => {
    it.each([
      ['SENT', '101'],
      ['PROCESSING', '151'],
      ['CONTINGENCY', '101'],
    ] as const)('%s + cStat %s ⇒ CANCELLED por transição própria: saleKey renomeada, cancelEvento, cancelledAt, auditoria dfe.cancelled, sem retire', async (inicial, cStat) => {
      const d = await nota(inicial);
      const t = await aplicar(d.id, inicial, { status: 'CANCELLED_AT_FISCO', partnerRef: 'chave-44', errors: [{ code: cStat, message: 'Cancelamento homologado' }] });
      expect(t.failed).toBe(0);
      const r = await row(d.id);
      expect(r.status).toBe('CANCELLED');
      expect(r.saleKey).toBe(`cancelled:${d.id}:${d.saleId}`);
      expect(r.cancelEvento).toBe('consulta_101_151');
      expect(Math.abs(r.cancelledAt!.getTime() - Date.now())).toBeLessThan(60_000); // sem dhProc ⇒ now (retCancNFe não transcrito)
      expect(r.chaveOuCodigo).toBe('chave-44'); // partnerRef (a chave que a consulta devolveu)
      expect((await prisma.fiscalDocumentAttempt.findFirstOrThrow({ where: { documentId: d.id } })).resultStatus).toBe('CANCELLED_AT_FISCO');
      expect(eventosDe(d.id)).toEqual(['dfe.cancelled']);
      expect(retireSourceDocument).not.toHaveBeenCalled(); // nunca houve proveniência
      await tick();
      expect(chamadasDe(d.id)).toBe(inicial === 'CONTINGENCY' ? 0 : 1); // terminal: o polling não volta
      const nova = await nota('SENT', d.saleId); // a venda ficou livre para nota nova
      expect(nova.saleKey).toBe(d.saleId);
    });

    it('AUTHORIZED → CANCELLED_AT_FISCO é recusado (invalid_transition); a nota autorizada só cancela pelo cancelar()', async () => {
      const d = await nota('AUTHORIZED');
      mockPort.consultar.mockResolvedValue({ status: 'CANCELLED_AT_FISCO', partnerRef: 'x', errors: [{ code: '101', message: 'x' }] });
      await expect(service.aplicarResultadoDoEnvio(scope, (await repo.findById(scope, d.id))!, { status: 'CANCELLED_AT_FISCO', partnerRef: 'x', errors: [{ code: '101', message: 'x' }] })).rejects.toThrow(/invalid_transition: AUTHORIZED -> CANCELLED_AT_FISCO/);
      expect((await row(d.id)).status).toBe('AUTHORIZED');
    });
  });

  describe('Bloco C — consulta inválida (itens 10-11, F-DEN-2 a)', () => {
    it.each(['252', '226', '236', '526', '562', '561', '613'])(
      'cStat %s ⇒ 1ª rodada: pollGaveUpAt gravado, gaveUp conta, failed conta (NÃO skipped); o documento segue PROCESSING e sai da fila',
      async (cStat) => {
        const d = await nota();
        consultaDevolve(d.id, (ref) => ({ status: 'PROCESSING', partnerRef: ref, errors: [{ code: cStat, message: 'a SEFAZ disse isso' }] }));
        const t = await tick();
        expect(t.gaveUp).toBe(1);
        expect(t.gaveUpIds).toEqual([d.id]);
        expect(t.failed).toBe(1);
        expect(t.skipped).toBe(0);
        const r = await row(d.id);
        expect(r.status).toBe('PROCESSING');
        expect(r.pollGaveUpAt).not.toBeNull();
        expect(r.pollLastError).toContain(`dfe_consulta_invalida:${cStat}`);
        await tick();
        expect(chamadasDe(d.id)).toBe(1); // não repete para sempre
      },
    );

    it('consultarUm: 422 com o cStat/xMotivo da SEFAZ, sem afirmar motivo; não conta tentativa; a consulta manual segue valendo', async () => {
      const d = await nota();
      consultaDevolve(d.id, (ref) => ({ status: 'PROCESSING', partnerRef: ref, errors: [{ code: '252', message: 'texto da SEFAZ' }] }));
      const erro = await service.consultarUm(scope, d.id).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(DfeConsultaInvalidaError);
      expect(erro).toMatchObject({ statusCode: 422, cStat: '252', xMotivo: 'texto da SEFAZ' });
      expect((erro as Error).message).toContain('cStat 252: texto da SEFAZ');
      const r = await row(d.id);
      expect(r.pollAttempts).toBe(0);
      expect(r.pollGaveUpAt).toBeNull();
      await expect(service.consultarUm(scope, d.id)).rejects.toBeInstanceOf(DfeConsultaInvalidaError); // consulta de novo, não ficou travada
      expect(chamadasDe(d.id)).toBe(2);
    });

    it('217 CONTINUA pelo naoRecebida (1ª consulta conta, não desiste, não é consulta inválida)', async () => {
      const d = await nota();
      consultaDevolve(d.id, (ref) => ({ status: 'PROCESSING', partnerRef: ref, errors: [{ code: '217', message: 'não consta' }] }));
      const t = await tick();
      expect(t.gaveUp ?? 0).toBe(0);
      expect(t.failed).toBe(0);
      const r = await row(d.id);
      expect(r.status).toBe('PROCESSING');
      expect(r.pollGaveUpAt).toBeNull();
      expect(JSON.parse((await prisma.fiscalDocumentAttempt.findFirstOrThrow({ where: { documentId: d.id } })).resultJson ?? '{}').naoConsta).toBe(1);
      expect(NAO_CONSTA_MAX_CONSULTAS).toBeGreaterThan(1);
    });

    it.each(['108', '109', '656'])('cStat %s (serviço indisponível/consumo indevido) segue PROCESSING simples — não é terminal e o polling não desiste', async (cStat) => {
      const d = await nota();
      consultaDevolve(d.id, (ref) => ({ status: 'PROCESSING', partnerRef: ref, errors: [{ code: cStat, message: 'x' }] }));
      const t = await tick();
      expect(t.gaveUp ?? 0).toBe(0);
      expect(t.failed).toBe(0);
      expect((await row(d.id)).pollGaveUpAt).toBeNull();
    });
  });
});
