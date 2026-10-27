const findTableByInternalName = jest.fn(async (_u: string, name: string) => (name === 'units' ? { id: 'tbl-units' } : null));
const findDataById = jest.fn(async (id: string) => ({ id, data: { cnpj: '11222333000181' } }));
jest.mock('@/lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({ getDynamicTableRepository: () => ({ findTableByInternalName, findDataById }) }),
}));

import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { legalParamsSemente } from '@test/helpers/legalParams';
import { FiscalDocumentRepository } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalNumberVoidRepository } from '@/features/accounting/repositories/FiscalNumberVoidRepository';
import { FiscalNumberVoidService } from '@/features/accounting/services/FiscalNumberVoidService';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { CreateSentFiscalDocumentData } from '@/features/accounting/repositories/IFiscalDocumentRepository';

/**
 * BE-INCR-NFCE (nó X10a, PR-4) em SQLite real (`--runInBand`):
 *   item 23 — sequência por (escopo, kind, ambiente, serie): homologação e produção numeram de 1, cada uma; a NFS-e ('')
 *             não se mistura; consumo concorrente não repete número;
 *   item 24 — inutilização com os repositórios reais (guarda 241 e 256/563 lidas DENTRO da tx; NullEmissor ⇒ HOMOLOGATED
 *             + `dfe.number_voided` na trilha);
 *   item 25 — 1..5 com o 3 rejeitado ⇒ pendência [3]; depois de homologada, a lista esvazia.
 */
const DONO = 'u-inut';
const UNIT = 'unit-inut';
const scope: AccountingScope = resolveAccountingScopeInternal({ userId: DONO }, UNIT);

const docRepo = new FiscalDocumentRepository();
const voidRepo = new FiscalNumberVoidRepository();

const sent = (n: bigint, over: Partial<CreateSentFiscalDocumentData> = {}): CreateSentFiscalDocumentData => ({
  kind: 'NFCE',
  saleId: `sale-${n}`,
  cTribNac: '',
  anchorEntryId: 'entry-x',
  ambiente: 'homologacao',
  partner: 'null',
  serie: 1,
  numero: n,
  dCompet: '2026-10-26',
  vServCents: 1000n,
  tpRetISSQN: 1,
  payloadJson: '{}',
  ...over,
});

function service() {
  const audit = { append: jest.fn(async (tx: { auditEvent?: unknown } | undefined, _s: unknown, e: { eventType: string }) => e) };
  const svc = new FiscalNumberVoidService(
    docRepo,
    voidRepo,
    { get: async () => ({ codMun: '3550308', partnerAccountRef: null }) } as never,
    { canCancelFiscalDocument: () => true, canReadFiscalDocument: () => true } as never,
    audit as never,
    legalParamsSemente,
  );
  return { svc, audit };
}

describe('BE-INCR-NFCE PR-4 — numeração e inutilização em SQLite real', () => {
  const OLD_ENV = process.env;
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);
  beforeEach(() => {
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
  });
  afterAll(async () => {
    process.env = OLD_ENV;
    await prisma.$disconnect();
  });

  it('item 23: homologação e produção numeram de 1 independentemente; NFS-e ("") à parte', async () => {
    const next = (ambiente: 'homologacao' | 'producao' | '', kind: 'NFE' | 'NFSE' = 'NFE') =>
      docRepo.runTransaction((tx) => docRepo.nextNumber(scope, kind, ambiente, 5, tx));
    expect([await next('homologacao'), await next('homologacao')]).toEqual([1n, 2n]);
    expect(await next('producao')).toBe(1n);
    expect(await next('', 'NFSE')).toBe(1n);
    const seqs = await docRepo.listSequences(scope, 'NFE');
    expect(seqs.map((s) => `${s.ambiente}/${s.serie}/${s.last}`)).toEqual(['homologacao/5/2', 'producao/5/1']);
  });

  it('item 23: 10 consumos concorrentes na mesma (kind, ambiente, série) não repetem número (1..10)', async () => {
    const numeros = await Promise.all(
      Array.from({ length: 10 }, () => docRepo.runTransaction((tx) => docRepo.nextNumber(scope, 'NFE', 'producao', 9, tx))),
    );
    expect(numeros.map(Number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('itens 24–25: 1..5 com o 3 rejeitado ⇒ pendência [3]; guarda 241 no 4; inutiliza o 3 ⇒ HOMOLOGATED, trilha e lista vazia', async () => {
    for (let i = 0; i < 5; i++) await docRepo.runTransaction((tx) => docRepo.nextNumber(scope, 'NFCE', 'homologacao', 1, tx));
    for (const n of [1n, 2n, 3n, 4n, 5n]) {
      const doc = await docRepo.createSent(scope, sent(n));
      if (n === 3n) await docRepo.transition(scope, doc.id, { status: 'REJECTED' });
      else await docRepo.transition(scope, doc.id, { status: 'AUTHORIZED' });
    }
    const { svc, audit } = service();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-10-26T15:00:00Z'));
    try {
      expect((await svc.pendentes(scope, 'NFCE')).map((l) => `${l.ambiente}/${l.serie}/${l.numero}/${l.status}`)).toEqual(['homologacao/1/3/REJECTED']);

      await expect(svc.inutilizar(scope, { kind: 'NFCE', serie: 1, nIni: 3, nFin: 4, xJust: 'nota rejeitada e abandonada' })).rejects.toMatchObject({
        errorCode: 'INUT_NUMERO_USADO',
      });
      const view = await svc.inutilizar(scope, { kind: 'NFCE', serie: 1, nIni: 3, nFin: 3, xJust: 'nota rejeitada e abandonada' });
      expect(view).toMatchObject({ status: 'HOMOLOGATED', nIni: '3', nFin: '3', ambiente: 'homologacao' });
      expect(audit.append).toHaveBeenCalledWith(expect.anything(), scope, expect.objectContaining({ eventType: 'dfe.number_voided' }));
      expect(await svc.pendentes(scope, 'NFCE')).toEqual([]);

      // a mesma faixa de novo ⇒ rej. 256 (já inutilizada), lida no banco
      await expect(svc.inutilizar(scope, { kind: 'NFCE', serie: 1, nIni: 3, nFin: 3, xJust: 'nota rejeitada e abandonada' })).rejects.toMatchObject({
        errorCode: 'INUT_FAIXA_JA_PEDIDA',
      });
      const linhas = await prisma.fiscalNumberVoid.findMany({ where: { userId: DONO, unitId: UNIT } });
      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({ kind: 'NFCE', ambiente: 'homologacao', serie: 1, nIni: 3n, nFin: 3n, ano: 2026, status: 'HOMOLOGATED', partner: 'null' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('findOverlapping: cruza nas bordas e ignora REJECTED, outra série e outro ambiente', async () => {
    const base = { kind: 'NFE' as const, ambiente: 'producao' as const, serie: 2, ano: 2026, xJust: 'x'.repeat(15), partner: 'null' };
    const a = await voidRepo.create(scope, { ...base, nIni: 10n, nFin: 20n });
    const r = await voidRepo.create(scope, { ...base, nIni: 30n, nFin: 40n });
    await voidRepo.applyResult(scope, r.id, { status: 'REJECTED' });
    await voidRepo.create(scope, { ...base, serie: 3, nIni: 10n, nFin: 20n });
    await voidRepo.create(scope, { ...base, ambiente: 'homologacao', nIni: 10n, nFin: 20n });
    const q = (nIni: bigint, nFin: bigint) =>
      voidRepo.findOverlapping(scope, { kind: 'NFE', ambiente: 'producao', serie: 2, nIni, nFin }, ['REQUESTED', 'HOMOLOGATED']).then((x) => x.map((v) => v.id));
    expect(await q(20n, 25n)).toEqual([a.id]);
    expect(await q(1n, 10n)).toEqual([a.id]);
    expect(await q(21n, 29n)).toEqual([]);
    expect(await q(35n, 35n)).toEqual([]);
  });
});
