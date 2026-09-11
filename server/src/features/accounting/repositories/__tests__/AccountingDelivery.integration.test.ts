/**
 * CONTRATO do cadastro de contador + log de entrega — integração contra SQLite REAL, sem mock de
 * prisma (BE-INCR-CONTADOR-DELIVERY, itens 1, 2, 5, 10, 12).
 *
 * POR QUE INTEGRAÇÃO, E NÃO UNIT: as quatro invariantes daqui só existem com o banco de verdade —
 * `@@unique` de idempotência (mock nenhum levanta P2002), FK `onDelete: Restrict` (mock nenhum
 * recusa o delete), ausência DELIBERADA de unique no contato (1:N por escopo), e vazamento entre
 * inquilinos (que só aparece com DOIS donos na mesma base).
 *
 * CADA NEGATIVO TEM SEU CONTROLE: um teste que espera `null`/erro passa também quando tudo está
 * quebrado — o par positivo/negativo é o que separa "a guarda mordeu" de "nada funciona aqui".
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { AccountingContactRepository } from '@/features/accounting/repositories/AccountingContactRepository';
import { AccountingDeliveryRepository } from '@/features/accounting/repositories/AccountingDeliveryRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const UNIT = 'unit-cd';
const DONO_A = 'u-cd-a';
const DONO_B = 'u-cd-b';

const escopo = (userId: string, unitId: string = UNIT): AccountingScope =>
  resolveAccountingScope({ userId }, unitId);

const contactRepo = new AccountingContactRepository();
const deliveryRepo = new AccountingDeliveryRepository();

const criarContato = (userId: string, unitId: string, name: string) =>
  contactRepo.create({
    userId,
    unitId,
    name,
    email: `${name.replace(/\s+/g, '.').toLowerCase()}@exemplo.com.br`,
    crcNumber: 'SP-000001/O-1',
    crcUf: 'SP',
    crcCertificate: 'SP/2026/000001',
    crcCertificateValidUntil: new Date('2026-12-31T00:00:00.000Z'),
    createdById: userId,
  });

const criarJob = (userId: string, unitId: string, kind: string) =>
  prisma.accountingDataExchangeJob.create({
    data: {
      userId,
      unitId,
      direction: 'EXPORT',
      kind,
      status: 'EXPORTED',
      sha256: 'f'.repeat(64),
      storageKey: `k/${kind}-${Math.random()}`,
      requestedById: userId,
    },
  });

describe('AccountingContact + AccountingDeliveryLog — contrato em SQLite real', () => {
  beforeAll(async () => {
    pushTestSchema();
    for (const id of [DONO_A, DONO_B]) {
      await prisma.user.create({
        data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' },
      });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ controle do harness
  it('CONTROLE: create grava e findById devolve a linha dentro do próprio escopo', async () => {
    const criado = await criarContato(DONO_A, UNIT, 'Contabilidade Alfa');
    const lido = await contactRepo.findById(escopo(DONO_A), criado.id);
    expect(lido).not.toBeNull();
    expect(lido!.name).toBe('Contabilidade Alfa');
  });

  // ------------------------------------------------------------------ item 1 — 1:N por escopo
  it('DOIS contadores vivos no mesmo (userId, unitId) coexistem — não há unique que trave (F-CD5-a)', async () => {
    const primeiro = await criarContato(DONO_A, UNIT, 'Contabilidade Beta');
    const segundo = await criarContato(DONO_A, UNIT, 'Contabilidade Gama');

    expect(primeiro.id).not.toBe(segundo.id);
    const vivos = await contactRepo.findManyByUnit(escopo(DONO_A));
    expect(vivos.filter((c) => ['Contabilidade Beta', 'Contabilidade Gama'].includes(c.name))).toHaveLength(2);
  });

  // ------------------------------------------------------------------ itens 2/12 — inquilino
  it('contato do dono B NÃO é visível pelo escopo do dono A (findById → null)', async () => {
    const doB = await criarContato(DONO_B, UNIT, 'Contabilidade do B');

    expect(await contactRepo.findById(escopo(DONO_A), doB.id)).toBeNull();
    // Controle: o próprio dono enxerga — sem isto, o negativo acima passaria com o repo quebrado.
    expect(await contactRepo.findById(escopo(DONO_B), doB.id)).not.toBeNull();
  });

  it('soft-delete some da leitura viva (e o controle prova que sumiu por deletedAt, não por acaso)', async () => {
    const contato = await criarContato(DONO_A, UNIT, 'Contabilidade Delta');
    expect(await contactRepo.findById(escopo(DONO_A), contato.id)).not.toBeNull();

    await contactRepo.update(escopo(DONO_A), contato.id, { deletedAt: new Date() });
    expect(await contactRepo.findById(escopo(DONO_A), contato.id)).toBeNull();
    // A linha continua no banco — soft, não hard: a entrega histórica que a referencia segue íntegra.
    expect(await prisma.accountingContact.findUnique({ where: { id: contato.id } })).not.toBeNull();
  });

  // ------------------------------------------------------------------ item 10 — idempotência
  it('a MESMA tripla (ecdJobId, ecfJobId, contactId) só entra UMA vez — a 2ª é P2002', async () => {
    const contato = await criarContato(DONO_A, UNIT, 'Contabilidade Epsilon');
    const ecd = await criarJob(DONO_A, UNIT, 'EXPORT_SPED_ECD');
    const ecf = await criarJob(DONO_A, UNIT, 'EXPORT_SPED_ECF');
    const dados = {
      userId: DONO_A,
      unitId: UNIT,
      contactId: contato.id,
      ecdJobId: ecd.id,
      ecfJobId: ecf.id,
      year: 2026,
      manifestSha256Ecd: 'f'.repeat(64),
      manifestSha256Ecf: 'e'.repeat(64),
      status: 'SENT',
      attemptCount: 1,
      requestedById: DONO_A,
      sentAt: new Date(),
    };

    const primeira = await deliveryRepo.create(dados);
    await expect(deliveryRepo.create(dados)).rejects.toMatchObject({ code: 'P2002' });

    // O que o serviço devolve na corrida perdida: a linha VENCEDORA, uma só.
    const lida = await deliveryRepo.findByJobsAndContact(escopo(DONO_A), ecd.id, ecf.id, contato.id);
    expect(lida!.id).toBe(primeira.id);
    expect(
      await prisma.accountingDeliveryLog.count({ where: { ecdJobId: ecd.id, ecfJobId: ecf.id } }),
    ).toBe(1);
  });

  it('CONTROLE da idempotência: outro CONTATO com os mesmos jobs é uma entrega legítima', async () => {
    const contatoA = await criarContato(DONO_A, UNIT, 'Contabilidade Zeta');
    const contatoB = await criarContato(DONO_A, UNIT, 'Contabilidade Eta');
    const ecd = await criarJob(DONO_A, UNIT, 'EXPORT_SPED_ECD');
    const ecf = await criarJob(DONO_A, UNIT, 'EXPORT_SPED_ECF');
    const base = {
      userId: DONO_A,
      unitId: UNIT,
      ecdJobId: ecd.id,
      ecfJobId: ecf.id,
      year: 2026,
      manifestSha256Ecd: 'f'.repeat(64),
      manifestSha256Ecf: 'e'.repeat(64),
      status: 'SENT',
      attemptCount: 1,
      requestedById: DONO_A,
      sentAt: new Date(),
    };

    await deliveryRepo.create({ ...base, contactId: contatoA.id });
    await deliveryRepo.create({ ...base, contactId: contatoB.id });
    expect(
      await prisma.accountingDeliveryLog.count({ where: { ecdJobId: ecd.id, ecfJobId: ecf.id } }),
    ).toBe(2);
  });

  // ------------------------------------------------------------------ item 5 — FK Restrict
  /**
   * Guarda PREVENTIVA (gate 5 do parecer): hoje não existe caminho de hard-delete de
   * `AccountingDataExchangeJob` no código (`grep accountingDataExchangeJob.delete` = vazio), então
   * este teste não corrige bug vivo — ele impede que um caminho futuro apague o job de origem e
   * deixe o log de entrega apontando para o nada. Ao contrário do RESTRICT do `Counterparty` (que
   * nunca dispara, porque lá o arquivamento é soft), este PODE disparar de verdade.
   */
  it('apagar o JOB referenciado por uma entrega falha por FK (onDelete: Restrict)', async () => {
    const contato = await criarContato(DONO_A, UNIT, 'Contabilidade Theta');
    const ecd = await criarJob(DONO_A, UNIT, 'EXPORT_SPED_ECD');
    const ecf = await criarJob(DONO_A, UNIT, 'EXPORT_SPED_ECF');
    await deliveryRepo.create({
      userId: DONO_A,
      unitId: UNIT,
      contactId: contato.id,
      ecdJobId: ecd.id,
      ecfJobId: ecf.id,
      year: 2026,
      manifestSha256Ecd: 'f'.repeat(64),
      manifestSha256Ecf: 'e'.repeat(64),
      status: 'SENT',
      attemptCount: 1,
      requestedById: DONO_A,
      sentAt: new Date(),
    });

    await expect(
      prisma.accountingDataExchangeJob.delete({ where: { id: ecd.id } }),
    ).rejects.toThrow();
    // Controle: um job SEM entrega apagando normalmente prova que o erro acima é a FK, não uma
    // tabela travada por outro motivo.
    const solto = await criarJob(DONO_A, UNIT, 'EXPORT_SPED_ECD');
    await expect(
      prisma.accountingDataExchangeJob.delete({ where: { id: solto.id } }),
    ).resolves.toBeDefined();
  });

  it('apagar o CONTATO referenciado por uma entrega também falha por FK (Restrict)', async () => {
    const contato = await criarContato(DONO_A, UNIT, 'Contabilidade Iota');
    const ecd = await criarJob(DONO_A, UNIT, 'EXPORT_SPED_ECD');
    const ecf = await criarJob(DONO_A, UNIT, 'EXPORT_SPED_ECF');
    await deliveryRepo.create({
      userId: DONO_A,
      unitId: UNIT,
      contactId: contato.id,
      ecdJobId: ecd.id,
      ecfJobId: ecf.id,
      year: 2026,
      manifestSha256Ecd: 'f'.repeat(64),
      manifestSha256Ecf: 'e'.repeat(64),
      status: 'SENT',
      attemptCount: 1,
      requestedById: DONO_A,
      sentAt: new Date(),
    });

    await expect(prisma.accountingContact.delete({ where: { id: contato.id } })).rejects.toThrow();
    // É por isso que arquivar é SOFT: o caminho legítimo de "tirar de circulação" não colide com a FK.
    await expect(
      contactRepo.update(escopo(DONO_A), contato.id, { deletedAt: new Date() }),
    ).resolves.toBeDefined();
  });

  // ------------------------------------------------------------------ item 12 — entrega de outro escopo
  it('entrega do dono B não é legível pelo escopo do dono A', async () => {
    const contatoB = await criarContato(DONO_B, UNIT, 'Contabilidade Kappa');
    const ecd = await criarJob(DONO_B, UNIT, 'EXPORT_SPED_ECD');
    const ecf = await criarJob(DONO_B, UNIT, 'EXPORT_SPED_ECF');
    const entrega = await deliveryRepo.create({
      userId: DONO_B,
      unitId: UNIT,
      contactId: contatoB.id,
      ecdJobId: ecd.id,
      ecfJobId: ecf.id,
      year: 2026,
      manifestSha256Ecd: 'f'.repeat(64),
      manifestSha256Ecf: 'e'.repeat(64),
      status: 'SENT',
      attemptCount: 1,
      requestedById: DONO_B,
      sentAt: new Date(),
    });

    expect(await deliveryRepo.findById(escopo(DONO_A), entrega.id)).toBeNull();
    expect(await deliveryRepo.findById(escopo(DONO_B), entrega.id)).not.toBeNull();
  });
});
