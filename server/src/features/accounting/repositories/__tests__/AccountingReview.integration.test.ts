/**
 * CONTRATO da revisão profissional — integração contra SQLite REAL, sem mock de prisma
 * (BE-INCR-REVIEW-LAYER, itens 2, 5-chave, 11, 12-cross-tenant).
 *
 * POR QUE INTEGRAÇÃO: as invariantes daqui só existem com o banco de verdade — o `@@unique` do par
 * (P2002), o comportamento do SQLite com NULL no unique (a razão de o gate in-tx existir, F-C11-5),
 * a FK `onDelete: Restrict` ao User (item 11 — apagar o usuário NÃO apaga a trilha) e o vazamento
 * entre inquilinos (que só aparece com DOIS donos na mesma base).
 *
 * CADA NEGATIVO TEM SEU CONTROLE: o par positivo/negativo é o que separa "a guarda mordeu" de
 * "nada funciona aqui".
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { AccountingReviewRepository } from '@/features/accounting/repositories/AccountingReviewRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const UNIT = 'unit-rv';
const DONO_A = 'u-rv-a';
const DONO_B = 'u-rv-b';
const DONO_C = 'u-rv-c'; // só para o teste de FK Restrict — é apagado

const escopo = (userId: string, unitId: string = UNIT): AccountingScope =>
  resolveAccountingScope({ userId }, unitId);

const repo = new AccountingReviewRepository();

const criarJob = (userId: string, kind: string) =>
  prisma.accountingDataExchangeJob.create({
    data: {
      userId,
      unitId: UNIT,
      direction: 'EXPORT',
      kind,
      status: 'EXPORTED',
      sha256: 'f'.repeat(64),
      storageKey: `k/${kind}-${Math.random()}`,
      requestedById: userId,
      periodStart: new Date('2026-01-01T00:00:00.000Z'),
      periodEnd: new Date('2026-12-31T00:00:00.000Z'),
    },
  });

const abrir = (userId: string, ecdJobId: string | null, ecfJobId: string | null) =>
  repo.create({ userId, unitId: UNIT, year: 2026, ecdJobId, ecfJobId, status: 'OPEN', reviewerUserId: userId });

describe('AccountingReview — contrato em SQLite real', () => {
  beforeAll(async () => {
    pushTestSchema();
    for (const id of [DONO_A, DONO_B, DONO_C]) {
      await prisma.user.create({
        data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' },
      });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('CONTROLE: create grava e findById devolve a revisão com findings dentro do próprio escopo', async () => {
    const ecd = await criarJob(DONO_A, 'EXPORT_SPED_ECD');
    const r = await abrir(DONO_A, ecd.id, null);
    await repo.createFinding({
      reviewId: r.id, userId: DONO_A, unitId: UNIT, register: 'J150', locator: '1.1.1',
      description: 'saldo', severity: 'NOTE', createdById: DONO_A,
    });
    const lido = await repo.findById(escopo(DONO_A), r.id);
    expect(lido?.status).toBe('OPEN');
    expect(lido?.findings).toHaveLength(1);
  });

  it('revisão do dono A NÃO é visível pelo escopo do dono B (findById → null; controle acima prova que o id existe)', async () => {
    const ecd = await criarJob(DONO_A, 'EXPORT_SPED_ECD');
    const r = await abrir(DONO_A, ecd.id, null);
    expect(await repo.findById(escopo(DONO_B), r.id)).toBeNull();
    expect(await repo.findById(escopo(DONO_A), r.id)).not.toBeNull();
  });

  // ------------------------------------------------------------------ item 2 / F-C11-5
  it('o MESMO par cheio (ecdJobId, ecfJobId) só entra UMA vez — a 2ª é P2002', async () => {
    const ecd = await criarJob(DONO_A, 'EXPORT_SPED_ECD');
    const ecf = await criarJob(DONO_A, 'EXPORT_SPED_ECF');
    await abrir(DONO_A, ecd.id, ecf.id);
    await expect(abrir(DONO_A, ecd.id, ecf.id)).rejects.toMatchObject({ code: 'P2002' });
  });

  /**
   * A RAZÃO do gate in-tx (F-C11-5 a): o SQLite trata NULL como DISTINTO no unique, então duas
   * revisões (ecd, NULL) do mesmo job ENTRAM no banco sem P2002. Este teste documenta o furo que o
   * `@@unique` sozinho deixa — e prova que `findByJobs` (a leitura que o serviço roda dentro da tx)
   * enxerga a primeira antes de criar a segunda.
   */
  it('par com UM job só: o unique NÃO morde (NULL distinto) — findByJobs é quem enxerga a duplicata', async () => {
    const ecd = await criarJob(DONO_A, 'EXPORT_SPED_ECD');
    const primeira = await abrir(DONO_A, ecd.id, null);
    const vista = await repo.findByJobs(escopo(DONO_A), ecd.id, null);
    expect(vista?.id).toBe(primeira.id);
    // o banco deixa a 2ª entrar — por isso o serviço checa ANTES, dentro da tx
    await expect(abrir(DONO_A, ecd.id, null)).resolves.toBeDefined();
  });

  // ------------------------------------------------------------------ item 11 — trilha legal
  it('apagar o USUÁRIO com revisão falha por FK (onDelete: Restrict) — e o controle prova que sem revisão apaga', async () => {
    const ecd = await criarJob(DONO_C, 'EXPORT_SPED_ECD');
    const r = await abrir(DONO_C, ecd.id, null);
    await expect(prisma.user.delete({ where: { id: DONO_C } })).rejects.toThrow();
    expect(await repo.findById(escopo(DONO_C), r.id)).not.toBeNull();

    // CONTROLE: um usuário SEM revisão apaga normalmente (a guarda é da FK, não do harness)
    await prisma.user.create({
      data: { id: 'u-rv-tmp', name: 't', username: 'u-rv-tmp', email: 'tmp@test.local', password: 'x', role: 'USER' },
    });
    await expect(prisma.user.delete({ where: { id: 'u-rv-tmp' } })).resolves.toBeDefined();
  });

  it('apagar o JOB referenciado por uma revisão falha por FK (onDelete: Restrict)', async () => {
    const ecd = await criarJob(DONO_A, 'EXPORT_SPED_ECD');
    await abrir(DONO_A, ecd.id, null);
    await expect(prisma.accountingDataExchangeJob.delete({ where: { id: ecd.id } })).rejects.toThrow();
  });

  it('o repositório NÃO expõe delete (item 11: sem DELETE de revisão nem de achado)', () => {
    const proto = Object.getOwnPropertyNames(AccountingReviewRepository.prototype);
    expect(proto.filter((m) => /delete|remove|archive/i.test(m))).toEqual([]);
  });
});
