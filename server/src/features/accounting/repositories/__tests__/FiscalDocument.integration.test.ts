/**
 * BE-INCR-DFE PR-1 (nó X10b) — contrato dos repositórios NOVOS em SQLite real (o serviço da emissão
 * chega no PR-2; aqui prova-se o que o schema promete — memória repositorios-de-contabilidade-nao-sao-
 * exercitados: repo falso não prova @@unique nem rename-on-cancel):
 *   item 3  — um documento VIVO por (venda, kind, cTribNac) [F-DFE-16 b]; após CANCELLED (rename-on-cancel
 *             de saleKey) uma nova emissão para a mesma chave é permitida;
 *   item 4  — FiscalDocumentSequence consecutiva por (escopo, kind, serie), consumida dentro da tx;
 *   F-DFE-10 a — tentativa n+1 tem ref distinto; a tentativa 1 fica intacta (assere a SEGUNDA leitura);
 *   item 2  — ServiceFiscalProfile: delete → re-create NÃO dá P2002 (rename-on-delete);
 *   tenancy — escopo B não enxerga documento do escopo A.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { FiscalDocumentRepository, attemptRef } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { ServiceFiscalProfileRepository, deletedServiceRef } from '@/features/accounting/repositories/ServiceFiscalProfileRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { CreateSentFiscalDocumentData } from '@/features/accounting/repositories/IFiscalDocumentRepository';

const UNIT = 'unit-dfe';
const DONO_A = 'u-dfe-a';
const DONO_B = 'u-dfe-b';
const escopo = (userId: string, unitId: string = UNIT): AccountingScope => resolveAccountingScope({ userId }, unitId);

const docRepo = new FiscalDocumentRepository();
const svcRepo = new ServiceFiscalProfileRepository();

const sent = (saleId: string, over: Partial<CreateSentFiscalDocumentData> = {}): CreateSentFiscalDocumentData => ({
  kind: 'NFSE',
  saleId,
  cTribNac: '060101',
  anchorEntryId: 'entry-x',
  ambiente: 'homologacao',
  partner: 'null',
  serie: 1,
  numero: 1n,
  dCompet: '2026-09-17',
  vServCents: 15000n,
  tpRetISSQN: 1,
  payloadJson: '{"v":1}',
  ...over,
});

describe('FiscalDocument + ServiceFiscalProfile — contrato em SQLite real (BE-INCR-DFE PR-1)', () => {
  beforeAll(async () => {
    pushTestSchema();
    for (const id of [DONO_A, DONO_B]) {
      await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' } });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('CONTROLE: createSent grava documento SENT + tentativa 1 com ref <id>:1', async () => {
    const doc = await docRepo.createSent(escopo(DONO_A), sent('sale-ctrl'));
    expect(doc.status).toBe('SENT');
    expect(doc.saleKey).toBe('sale-ctrl');
    expect(doc.attempts).toHaveLength(1);
    expect(doc.attempts[0].ref).toBe(attemptRef(doc.id, 1));
    expect(doc.attempts[0].payloadJson).toBe('{"v":1}');
  });

  it('item 3 / F-DFE-16 b: 2ª emissão VIVA para a mesma (venda, kind, cTribNac) morre em P2002; outro cTribNac na mesma venda passa', async () => {
    await docRepo.createSent(escopo(DONO_A), sent('sale-uq'));
    await expect(docRepo.createSent(escopo(DONO_A), sent('sale-uq'))).rejects.toMatchObject({ code: 'P2002' });
    // N DPS por venda: outro código de serviço é outro documento vivo
    const outro = await docRepo.createSent(escopo(DONO_A), sent('sale-uq', { cTribNac: '060201' }));
    expect(outro.cTribNac).toBe('060201');
    const vivos = await docRepo.findLiveBySale(escopo(DONO_A), 'sale-uq');
    expect(vivos.map((d) => d.cTribNac).sort()).toEqual(['060101', '060201']);
  });

  it('item 3: após CANCELLED (rename-on-cancel de saleKey) a mesma chave volta a aceitar um documento vivo', async () => {
    const doc = await docRepo.createSent(escopo(DONO_A), sent('sale-cancel'));
    await docRepo.transition(escopo(DONO_A), doc.id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelMotivo: 1,
      cancelReason: 'erro na emissão — teste de contrato',
      saleKey: `cancelled:${doc.id}:sale-cancel`,
    });
    expect(await docRepo.findLiveBySale(escopo(DONO_A), 'sale-cancel')).toHaveLength(0);
    const novo = await docRepo.createSent(escopo(DONO_A), sent('sale-cancel'));
    expect(novo.id).not.toBe(doc.id);
    // o cancelado continua no banco (histórico), com a chave renomeada
    const cancelado = await prisma.fiscalDocument.findUnique({ where: { id: doc.id } });
    expect(cancelado?.saleKey).toBe(`cancelled:${doc.id}:sale-cancel`);
  });

  it('item 4: nextNumber é consecutivo por (escopo, kind, serie) e independente entre séries/kinds', async () => {
    const n1 = await docRepo.runTransaction((tx) => docRepo.nextNumber(escopo(DONO_A), 'NFSE', 7, tx));
    const n2 = await docRepo.runTransaction((tx) => docRepo.nextNumber(escopo(DONO_A), 'NFSE', 7, tx));
    const outraSerie = await docRepo.runTransaction((tx) => docRepo.nextNumber(escopo(DONO_A), 'NFSE', 8, tx));
    const outroKind = await docRepo.runTransaction((tx) => docRepo.nextNumber(escopo(DONO_A), 'NFE', 7, tx));
    expect([n1, n2]).toEqual([1n, 2n]);
    expect(outraSerie).toBe(1n);
    expect(outroKind).toBe(1n);
  });

  it('F-DFE-10 a: appendAttempt cria ref distinto e a tentativa 1 permanece byte-a-byte (segunda leitura)', async () => {
    const doc = await docRepo.createSent(escopo(DONO_A), sent('sale-retry'));
    const a2 = await docRepo.appendAttempt(escopo(DONO_A), { documentId: doc.id, attemptNo: 2, payloadJson: '{"v":2}' });
    expect(a2.ref).toBe(attemptRef(doc.id, 2));
    expect(a2.ref).not.toBe(doc.attempts[0].ref);
    await docRepo.transition(escopo(DONO_A), doc.id, { status: 'SENT', currentAttemptNo: 2, attemptResult: { attemptNo: 2, resultStatus: 'PROCESSING', resultJson: null } });
    const relido = await docRepo.findById(escopo(DONO_A), doc.id);
    expect(relido?.attempts.map((a) => [a.attemptNo, a.payloadJson])).toEqual([[1, '{"v":1}'], [2, '{"v":2}']]);
    expect(relido?.currentAttemptNo).toBe(2);
  });

  it('tenancy: documento do dono A não é visível pelo dono B (e o controle prova que A enxerga)', async () => {
    const doc = await docRepo.createSent(escopo(DONO_A), sent('sale-tenant'));
    expect(await docRepo.findById(escopo(DONO_B), doc.id)).toBeNull();
    expect(await docRepo.findById(escopo(DONO_A), doc.id)).not.toBeNull();
    expect(await docRepo.findAttemptById(escopo(DONO_B), doc.attempts[0].id)).toBeNull();
    expect(await docRepo.findAttemptById(escopo(DONO_A), doc.attempts[0].id)).not.toBeNull();
  });

  it('item 2: ServiceFiscalProfile delete → re-create não dá P2002 (rename-on-delete libera a chave)', async () => {
    const primeiro = await svcRepo.upsert(escopo(DONO_A), 'svc-corte', { cTribNac: '060101', cIndOp: '030101' });
    expect(await svcRepo.softDelete(escopo(DONO_A), 'svc-corte')).toBe(1);
    expect(await svcRepo.findByServiceRef(escopo(DONO_A), 'svc-corte')).toBeNull();
    const segundo = await svcRepo.upsert(escopo(DONO_A), 'svc-corte', { cTribNac: '060201', cIndOp: '030101' });
    expect(segundo.id).not.toBe(primeiro.id);
    expect(segundo.cTribNac).toBe('060201');
    const apagado = await prisma.serviceFiscalProfile.findUnique({ where: { id: primeiro.id } });
    expect(apagado?.serviceRef).toBe(deletedServiceRef(primeiro.id, 'svc-corte'));
    expect(apagado?.deletedAt).not.toBeNull();
  });
});
