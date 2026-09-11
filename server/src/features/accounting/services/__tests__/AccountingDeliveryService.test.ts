/**
 * AccountingDeliveryService — entrega do pacote ECD/ECF ao contador (BE-INCR-CONTADOR-DELIVERY,
 * itens 6-13). Unit: repos e auditoria são dublês.
 *
 * O que este arquivo prova, e que nenhum snapshot de shape alcança: o GATE DOS 12 MESES roda dentro
 * da tx, o `sha256` do manifesto vem do JOB (nunca de recomputação), a idempotência devolve UMA
 * linha, e nome/e-mail do contador não entram na trilha.
 */
import { Prisma } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { AccountingDeliveryService } from '@/features/accounting/services/AccountingDeliveryService';
import type { IAccountingDeliveryRepository } from '@/features/accounting/repositories/IAccountingDeliveryRepository';
import type { IAccountingContactRepository } from '@/features/accounting/repositories/IAccountingContactRepository';
import type { IDataExchangeRepository } from '@/features/accounting/repositories/IDataExchangeRepository';
import type { IAccountingPeriodRepository } from '@/features/accounting/repositories/IAccountingPeriodRepository';
import type { IAccountingPolicy } from '@/features/accounting/policies/IAccountingPolicy';
import type { AuditService } from '@/features/accounting/services/AuditService';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import {
  DELIVERY_PACKAGE_BUILT,
  DELIVERY_SENT,
} from '@/features/accounting/models/AccountingDelivery.model';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');
const YEAR = 2026;
const SHA_ECD = 'a'.repeat(64);
const SHA_ECF = 'b'.repeat(64);

const contact = {
  id: 'contact-1',
  userId: 'dono-a',
  unitId: 'unit-1',
  name: 'Contabilidade Silva',
  email: 'silva@exemplo.com.br',
  cpf: '52998224725',
  phone: '11999998888',
  crcNumber: 'SP-123456/O-1',
  crcUf: 'SP',
  crcCertificate: 'SP/2026/000123',
  crcCertificateValidUntil: new Date('2026-12-31T00:00:00.000Z'),
  createdById: 'dono-a',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const PERIOD = { start: new Date('2026-01-01T00:00:00.000Z'), end: new Date('2026-12-31T00:00:00.000Z') };

const job = (
  id: string,
  kind: string,
  sha256: string | null,
  status = 'EXPORTED',
  period: { start: Date | null; end: Date | null } = PERIOD,
) => ({
  id,
  userId: 'dono-a',
  unitId: 'unit-1',
  direction: 'EXPORT',
  kind,
  status,
  originalName: `${kind.toLowerCase()}.txt`,
  mimeType: 'text/plain',
  sizeBytes: 10,
  sha256,
  storageKey: `k/${id}`,
  totalRows: 0,
  validRows: 0,
  invalidRows: 0,
  committedRows: 0,
  requestedById: 'dono-a',
  committedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  committedAt: null,
  periodStart: period.start,
  periodEnd: period.end,
});

const deliveryRow = {
  id: 'delivery-1',
  userId: 'dono-a',
  unitId: 'unit-1',
  contactId: 'contact-1',
  ecdJobId: 'job-ecd',
  ecfJobId: 'job-ecf',
  periodStart: PERIOD.start,
  periodEnd: PERIOD.end,
  manifestSha256Ecd: SHA_ECD,
  manifestSha256Ecf: SHA_ECF,
  status: 'SENT',
  attemptCount: 1,
  requestedById: 'dono-a',
  sentAt: new Date(),
  failedAt: null as Date | null,
  failureReason: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

interface Opts {
  canManage?: boolean;
  canRead?: boolean;
  openMonths?: number[]; // meses NÃO hard-closed
  missingMonths?: number[]; // meses sem período semeado
  contactFound?: typeof contact | null;
  ecdJob?: ReturnType<typeof job> | null;
  ecfJob?: ReturnType<typeof job> | null;
  existing?: typeof deliveryRow | null;
  deliveryFound?: typeof deliveryRow | null;
  createThrowsP2002?: boolean;
}

function build(opts: Opts = {}) {
  const auditAppend = jest.fn(async (..._args: unknown[]) => undefined);
  const create = jest.fn(async () => {
    if (opts.createThrowsP2002) {
      throw new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      });
    }
    return deliveryRow;
  });
  const update = jest.fn(async () => ({ ...deliveryRow, status: 'QUEUED', attemptCount: 2 }));
  const findByJobsAndContact = jest.fn(async () => opts.existing ?? null);
  const findDeliveryById = jest.fn(async () =>
    opts.deliveryFound === undefined ? deliveryRow : opts.deliveryFound,
  );
  const runTransaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true }));
  const findJobById = jest.fn(async (_s: unknown, id: string, ..._rest: unknown[]) => {
    if (id === 'job-ecd') return opts.ecdJob === undefined ? job('job-ecd', 'EXPORT_SPED_ECD', SHA_ECD) : opts.ecdJob;
    if (id === 'job-ecf') return opts.ecfJob === undefined ? job('job-ecf', 'EXPORT_SPED_ECF', SHA_ECF) : opts.ecfJob;
    return null;
  });
  const findByYearMonth = jest.fn(async (_s: unknown, year: number, month: number, ..._rest: unknown[]) => {
    if (opts.missingMonths?.includes(month)) return null;
    const status = opts.openMonths?.includes(month) ? 'OPEN' : 'HARD_CLOSED';
    return { id: `p-${year}-${month}`, year, month, status };
  });

  const deliveryRepo = {
    create,
    findById: findDeliveryById,
    findByJobsAndContact,
    update,
    runTransaction,
  } as unknown as IAccountingDeliveryRepository;
  const contactRepo = {
    findById: jest.fn(async () => (opts.contactFound === undefined ? contact : opts.contactFound)),
  } as unknown as IAccountingContactRepository;
  const dataExchangeRepo = { findJobById } as unknown as IDataExchangeRepository;
  const periodRepo = { findByYearMonth } as unknown as IAccountingPeriodRepository;
  const policy = {
    canManageAccountingContact: () => opts.canManage ?? true,
    canReadAccountingContact: () => opts.canRead ?? true,
  } as unknown as IAccountingPolicy;
  const audit = { append: auditAppend } as unknown as AuditService;

  return {
    service: new AccountingDeliveryService(
      deliveryRepo,
      contactRepo,
      dataExchangeRepo,
      periodRepo,
      audit,
      policy,
    ),
    create,
    update,
    findByYearMonth,
    findByJobsAndContact,
    auditAppend,
  };
}

const buildDto = { unitId: 'unit-1', ecdJobId: 'job-ecd', ecfJobId: 'job-ecf' };
const confirmDto = { ...buildDto, contactId: 'contact-1', confirmed: true as const };

describe('AccountingDeliveryService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ------------------------------------------------------------------ policy-first
  it('canManage=false lança ForbiddenError ANTES de resolver job ou período', async () => {
    const { service, findByYearMonth } = build({ canManage: false });
    await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(ForbiddenError);
    await expect(service.confirmDelivery(scope, confirmDto)).rejects.toThrow(ForbiddenError);
    expect(findByYearMonth).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------ item 7 — gate de período
  describe('gate dos 12 meses (F-CD7-a) — par vermelho→verde', () => {
    it('VERDE: 12/12 HARD_CLOSED deixa o preflight passar', async () => {
      const { service, findByYearMonth } = build();
      const manifest = await service.buildDeliveryPackage(scope, buildDto);
      expect(manifest.period).toEqual({ start: '2026-01-01', end: '2026-12-31' });
      expect(findByYearMonth).toHaveBeenCalledTimes(12);
    });

    it('VERMELHO: 11 HARD_CLOSED + 1 OPEN bloqueia e NOMEIA o mês aberto', async () => {
      const { service } = build({ openMonths: [7] });
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(ValidationError);
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(/1 de 12 meses/);
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(/2026-07/);
    });

    it('mês NÃO SEMEADO conta como não fechado (ausência não é fechamento)', async () => {
      const { service } = build({ missingMonths: [12] });
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(ValidationError);
    });

    it('só dezembro fechado NÃO basta — o ano inteiro é o escopo da ECD/ECF', async () => {
      const { service } = build({ openMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(/11 de 12 meses/);
    });

    // ---------------------------------------------------------------- F3 → Fork Novo A → (b)
    // "12 meses seguidos sempre, ou período selecionado": o gate itera os meses DO JOB. Um job de
    // situação especial (maio..dezembro) checa 8 meses, não 12 — e nenhum `year` digitado entra.
    it('período selecionado no job (maio..dez) checa exatamente os 8 meses cobertos', async () => {
      const special = { start: new Date('2026-05-01T00:00:00.000Z'), end: new Date('2026-12-31T00:00:00.000Z') };
      const { service, findByYearMonth } = build({
        ecdJob: job('job-ecd', 'EXPORT_SPED_ECD', SHA_ECD, 'EXPORTED', special),
        ecfJob: job('job-ecf', 'EXPORT_SPED_ECF', SHA_ECF, 'EXPORTED', special),
      });
      const manifest = await service.buildDeliveryPackage(scope, buildDto);
      expect(manifest.period).toEqual({ start: '2026-05-01', end: '2026-12-31' });
      expect(findByYearMonth).toHaveBeenCalledTimes(8);
      expect(findByYearMonth.mock.calls.map((c) => c[2])).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
    });

    // O furo F3 fechado na origem: jobs de 2025 NÃO viram pacote de 2026, porque não existe mais
    // ano digitado — e ECD/ECF de períodos diferentes são recusados antes de qualquer gate.
    it('ECD e ECF de períodos DIFERENTES são 400 antes do gate (o furo F3, fechado na origem)', async () => {
      const p2025 = { start: new Date('2025-01-01T00:00:00.000Z'), end: new Date('2025-12-31T00:00:00.000Z') };
      const { service, findByYearMonth } = build({
        ecdJob: job('job-ecd', 'EXPORT_SPED_ECD', SHA_ECD, 'EXPORTED', p2025),
      });
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(/mesmo período/);
      expect(findByYearMonth).not.toHaveBeenCalled();
    });

    // Review achado 3 (mutação M1): apagar a comparação de `periodEnd` sobrevivia — o caso "mesmo
    // início, fim diferente" não existia.
    it('ECD e ECF com o MESMO início e fins diferentes também são 400', async () => {
      const shorter = { start: PERIOD.start, end: new Date('2026-06-30T00:00:00.000Z') };
      const { service } = build({
        ecfJob: job('job-ecf', 'EXPORT_SPED_ECF', SHA_ECF, 'EXPORTED', shorter),
      });
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(/mesmo período/);
    });

    it('job SEM período gravado (gerado antes da migração) é 400 — o sistema não sabe o que ele cobre', async () => {
      const { service } = build({
        ecfJob: job('job-ecf', 'EXPORT_SPED_ECF', SHA_ECF, 'EXPORTED', { start: null, end: null }),
      });
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(/não tem período/);
    });

    // Esta é a diferença entre um preflight e uma garantia: sem a re-checagem in-tx, reabrir um mês
    // entre o build e o confirm passaria despercebido (TOCTOU).
    it('a checagem AUTORITATIVA roda DENTRO da tx (o repo de período recebe o handle da tx)', async () => {
      const { service, findByYearMonth } = build();
      await service.confirmDelivery(scope, confirmDto);
      expect(findByYearMonth).toHaveBeenCalledTimes(12);
      for (const call of findByYearMonth.mock.calls) {
        expect(call[3]).toEqual({ tx: true });
      }
    });
  });

  // ------------------------------------------------------------------ item 8 — manifesto
  describe('manifesto', () => {
    it('lê o sha256 do JOB e nunca recomputa do disco (F-CD6-a)', async () => {
      const { service } = build();
      const manifest = await service.buildDeliveryPackage(scope, buildDto);
      expect(manifest.files).toEqual([
        { kind: 'ECD', jobId: 'job-ecd', sha256: SHA_ECD },
        { kind: 'ECF', jobId: 'job-ecf', sha256: SHA_ECF },
      ]);
    });

    it('o preflight NÃO expõe contactId (o destinatário só existe na confirmação)', async () => {
      const { service } = build();
      const manifest = await service.buildDeliveryPackage(scope, buildDto);
      expect(manifest).not.toHaveProperty('contactId');
      expect(manifest.scope).toEqual({ unitId: 'unit-1', ledgerCode: scope.ledgerCode });
    });

    it('job sem sha256 é 400 — manifesto não promete integridade que não tem', async () => {
      const { service } = build({ ecdJob: job('job-ecd', 'EXPORT_SPED_ECD', null) });
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(/sha256/);
    });

    it('job que não é ECD/ECF é recusado (não se entrega balancete como escrituração)', async () => {
      const { service } = build({ ecdJob: job('job-ecd', 'EXPORT_TRIAL_BALANCE', SHA_ECD) });
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(/não é uma ECD/);
    });

    it('aceita a ECF de Lucro Real (rota irmã) tanto quanto a de Presumido', async () => {
      const { service } = build({ ecfJob: job('job-ecf', 'EXPORT_SPED_ECF_REAL', SHA_ECF) });
      await expect(service.buildDeliveryPackage(scope, buildDto)).resolves.toBeDefined();
    });

    it('job ainda não EXPORTED é recusado (o arquivo não existe)', async () => {
      const { service } = build({ ecfJob: job('job-ecf', 'EXPORT_SPED_ECF', SHA_ECF, 'PROCESSING') });
      await expect(service.buildDeliveryPackage(scope, buildDto)).rejects.toThrow(/EXPORTED/);
    });
  });

  // ------------------------------------------------------------------ itens 9/13/14 — confirmação
  describe('confirmDelivery', () => {
    it('cria a entrega SENT e devolve contato + manifesto lado a lado (D7)', async () => {
      const { service, create } = build();
      const result = await service.confirmDelivery(scope, confirmDto);

      expect(create).toHaveBeenCalledTimes(1);
      const [data] = create.mock.calls[0] as unknown as [Record<string, unknown>];
      expect(data.status).toBe('SENT');
      expect(data.manifestSha256Ecd).toBe(SHA_ECD);
      expect(data.periodStart).toEqual(PERIOD.start);
      expect(data.periodEnd).toEqual(PERIOD.end);
      expect(result.contact).toEqual({
        name: 'Contabilidade Silva',
        crcNumber: 'SP-123456/O-1',
        crcUf: 'SP',
      });
      expect(result.manifest.contactId).toBe('contact-1');
      // D7 / F2 — o signatário J930 que o MESMO contato pré-preenche, lado a lado com o contato
      expect(result.signer).toEqual({
        identNom: 'Contabilidade Silva',
        identCpfCnpj: '52998224725',
        identQualif: 'Contador',
        codAssin: '900',
        indCrc: 'SP-123456/O-1',
        email: 'silva@exemplo.com.br',
        fone: '11999998888',
        ufCrc: 'SP',
        numSeqCrc: 'SP/2026/000123',
        dtCrc: '2026-12-31',
        indRespLegal: 'N',
      });
      // A semântica de SENT viaja com a resposta — um leitor futuro não pode achar que o servidor
      // confirmou entrega (F-CD1-a: não existe transporte aqui).
      expect(result.statusMeaning).toMatch(/operador confirmou/);
    });

    it('emite package_built + sent na MESMA tx, sem nome/e-mail do contador (D5)', async () => {
      const { service, auditAppend } = build();
      await service.confirmDelivery(scope, confirmDto);

      expect(auditAppend).toHaveBeenCalledTimes(2);
      const events = auditAppend.mock.calls.map(
        (c) => c[2] as unknown as { eventType: string; payload: Record<string, unknown> },
      );
      expect(events.map((e) => e.eventType)).toEqual([DELIVERY_PACKAGE_BUILT, DELIVERY_SENT]);
      for (const call of auditAppend.mock.calls) expect(call[0]).toEqual({ tx: true });

      const serialized = JSON.stringify(events.map((e) => e.payload));
      expect(serialized).not.toContain('Contabilidade Silva');
      expect(serialized).not.toContain('silva@exemplo.com.br');
      expect(events[1].payload.contactId).toBe('contact-1');
    });

    it('idempotente: uma entrega já SENT volta como está, sem nova linha e sem novo evento', async () => {
      const { service, create, update, auditAppend } = build({ existing: deliveryRow });
      const result = await service.confirmDelivery(scope, confirmDto);

      expect(result.deliveryId).toBe('delivery-1');
      expect(create).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(auditAppend).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------- review F4 (mutação M1)
    // Guarda contra a mutação `if (existing.status === 'SENT' || true) return existing;` que
    // sobrevivia à suíte: o fixture `existing` era sempre SENT, então o ramo QUEUED→SENT nunca rodava.
    it('reusa uma linha QUEUED promovendo-a a SENT (update + 2 eventos), sem criar segunda linha', async () => {
      const { service, create, update, auditAppend } = build({
        existing: { ...deliveryRow, status: 'QUEUED', attemptCount: 0 },
      });
      const result = await service.confirmDelivery(scope, confirmDto);

      expect(create).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledTimes(1);
      const [, id, data] = update.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>];
      expect(id).toBe('delivery-1');
      expect(data).toMatchObject({ status: 'SENT', attemptCount: 1 });
      expect(auditAppend).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('QUEUED'); // valor do dublê de update — o que importa é a chamada acima
    });

    // ---------------------------------------------------------------- review F5
    // O ramo P2002 devolvia a vencedora CRUA: se ela estivesse QUEUED, a resposta dizia
    // `status: 'QUEUED'` junto de `statusMeaning: 'o operador confirmou…'` — contradição na mesma
    // resposta, e sem evento na trilha. A vencedora tem de passar pelo MESMO caminho de promoção.
    it('P2002 com vencedora QUEUED promove a vencedora a SENT em vez de devolvê-la crua', async () => {
      const { service, findByJobsAndContact, update, auditAppend } = build({ createThrowsP2002: true });
      findByJobsAndContact
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce({ ...deliveryRow, status: 'QUEUED', attemptCount: 0 } as never);

      await service.confirmDelivery(scope, confirmDto);

      expect(update).toHaveBeenCalledTimes(1);
      const [, , data] = update.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>];
      expect(data).toMatchObject({ status: 'SENT' });
      expect(auditAppend).toHaveBeenCalledTimes(2);
    });

    it('P2002 na corrida devolve a linha VENCEDORA — nunca uma segunda entrega', async () => {
      const { service, findByJobsAndContact } = build({ createThrowsP2002: true });
      // 1ª leitura (preflight da idempotência) não acha; a 2ª, após o P2002, acha a vencedora.
      findByJobsAndContact
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce(deliveryRow as never);

      const result = await service.confirmDelivery(scope, confirmDto);
      expect(result.deliveryId).toBe('delivery-1');
      expect(findByJobsAndContact).toHaveBeenCalledTimes(2);
    });

    it('contato de outro escopo vira NotFoundError (nunca vaza nome/e-mail alheio)', async () => {
      const { service } = build({ contactFound: null });
      await expect(service.confirmDelivery(scope, confirmDto)).rejects.toThrow(NotFoundError);
    });

    it('job de outro escopo vira NotFoundError, não ForbiddenError', async () => {
      const { service } = build({ ecdJob: null });
      await expect(service.confirmDelivery(scope, confirmDto)).rejects.toThrow(NotFoundError);
      await expect(service.confirmDelivery(scope, confirmDto)).rejects.not.toThrow(ForbiddenError);
    });
  });

  // ------------------------------------------------------------------ item 11 — retry
  describe('retryDelivery', () => {
    const retryDto = { unitId: 'unit-1', deliveryId: 'delivery-1' };

    it('FAILED → QUEUED sobre a linha existente, incrementando attemptCount', async () => {
      const { service, update } = build({
        deliveryFound: { ...deliveryRow, status: 'FAILED', attemptCount: 1 },
      });
      await service.retryDelivery(scope, 'delivery-1', retryDto);

      const [, id, data] = update.mock.calls[0] as unknown as [
        unknown,
        string,
        Record<string, unknown>,
      ];
      expect(id).toBe('delivery-1');
      expect(data).toEqual({ status: 'QUEUED', attemptCount: 2, failedAt: null, failureReason: null });
    });

    it('retry de uma entrega SENT é 400 — reenvio não é este comando (fora de escopo do BRIEF)', async () => {
      const { service, update } = build({ deliveryFound: { ...deliveryRow, status: 'SENT' } });
      await expect(service.retryDelivery(scope, 'delivery-1', retryDto)).rejects.toThrow(
        ValidationError,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('entrega de outro escopo vira NotFoundError', async () => {
      const { service } = build({ deliveryFound: null });
      await expect(service.retryDelivery(scope, 'delivery-1', retryDto)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
