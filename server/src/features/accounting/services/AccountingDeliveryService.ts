import { Prisma } from 'generated/prisma';
import type { AccountingContact, AccountingDataExchangeJob, AccountingDeliveryLog } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import {
  buildDeliveryManifest,
  DELIVERY_PACKAGE_BUILT,
  DELIVERY_SENT,
  monthsCovered,
  toDateOnly,
  type DeliveryManifest,
} from '../models/AccountingDelivery.model';
import { contactToJ930Signer, type J930Signer } from '../models/AccountingContact.model';
import type {
  BuildDeliveryPackageInput,
  ConfirmDeliveryInput,
  RetryDeliveryInput,
} from '../dtos/AccountingDeliveryDto';
import type { IAccountingDeliveryRepository } from '../repositories/IAccountingDeliveryRepository';
import type { IAccountingContactRepository } from '../repositories/IAccountingContactRepository';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';
import type { IAccountingPeriodRepository } from '../repositories/IAccountingPeriodRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';

/** O job da ECD tem um kind só; a ECF tem dois (Presumido e Lucro Real, rotas irmãs). */
const ECD_JOB_KIND = 'EXPORT_SPED_ECD';
const ECF_JOB_KINDS = ['EXPORT_SPED_ECF', 'EXPORT_SPED_ECF_REAL'];
const EXPORTED = 'EXPORTED';
const HARD_CLOSED = 'HARD_CLOSED';

/** Preview do manifesto no preflight: tudo menos o destinatário, que só existe na confirmação. */
export type DeliveryManifestPreview = Omit<DeliveryManifest, 'contactId'>;

/** Retorno de `confirmDelivery` — D7: contato e manifesto lado a lado. */
export interface ConfirmDeliveryResult {
  deliveryId: string;
  status: string;
  /**
   * Semântica de `status: 'SENT'` (F-CD1-a, zero-dependência): **o operador confirmou que
   * despachou o pacote**. NÃO é confirmação de entrega pelo servidor — não existe transporte aqui.
   */
  statusMeaning: string;
  contact: { name: string; crcNumber: string; crcUf: string };
  /**
   * D7 / item 13: o signatário J930 que o MESMO contato pré-preenche na geração (a "via barata",
   * cédula 10/09 §6 F2) — contato e signatário lado a lado, sem parser do arquivo.
   */
  signer: J930Signer;
  manifest: DeliveryManifest;
}

/** Jobs já resolvidos e provados compatíveis: mesmo período nos dois. */
interface ResolvedPair {
  ecd: AccountingDataExchangeJob;
  ecf: AccountingDataExchangeJob;
  period: { start: Date; end: Date };
}

/**
 * AccountingDeliveryService — monta e registra a entrega do pacote ECD/ECF ao contador
 * (BE-INCR-CONTADOR-DELIVERY, itens 4-13). FIRST-CLASS PRISMA.
 *
 * O que o pacote É (F-CD3-a/F-CD4-a): os dois `.txt` já gerados (referenciados por FK ao job de
 * origem) + um manifesto com os dois `sha256`. O que ele NÃO é: cópia de arquivo, zip novo, PDF de
 * resumo, nem canal de envio — **quem envia é o dono** (F-CD1-a: zero credencial no servidor).
 *
 * Invariantes provadas aqui:
 * - **Gate de período dentro da tx** (F-CD7-a + server/CLAUDE.md gate 5): os 12 meses do ano têm de
 *   estar `HARD_CLOSED`. O preflight de `buildDeliveryPackage` é conveniência; a checagem
 *   AUTORITATIVA roda DENTRO do `runTransaction` de `confirmDelivery`, com `tx` propagado ao repo —
 *   sem isso, reabrir um mês entre o preflight e a confirmação passaria despercebido (TOCTOU).
 * - **`sha256` vem do job, nunca do disco** (F-CD6-a/ACC-CD-3): este serviço não abre arquivo.
 * - **Idempotência** (item 10): a chave é `[ecdJobId, ecfJobId, contactId]` com `@@unique` no
 *   banco. Duas confirmações concorrentes produzem UMA linha — a perdedora trata P2002 como
 *   caminho normal e relê a linha vencedora.
 * - **Cross-tenant** (item 12): contato/jobs/entrega de outro escopo → `NotFoundError`.
 */
export class AccountingDeliveryService {
  constructor(
    private readonly deliveryRepo: IAccountingDeliveryRepository,
    private readonly contactRepo: IAccountingContactRepository,
    private readonly dataExchangeRepo: IDataExchangeRepository,
    private readonly periodRepo: IAccountingPeriodRepository,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  // ── Preflight ──────────────────────────────────────────────────────────────
  /**
   * Preflight do pacote: resolve os dois jobs no escopo, exige que sejam ECD/ECF `EXPORTED` com
   * `sha256` gravado, roda o gate dos 12 meses e devolve o manifesto SEM destinatário. Não
   * persiste nada e não emite auditoria — nada aconteceu ainda.
   */
  async buildDeliveryPackage(
    scope: AccountingScope,
    dto: BuildDeliveryPackageInput,
  ): Promise<DeliveryManifestPreview> {
    if (!this.policy.canManageAccountingContact(scope)) {
      throw new ForbiddenError('Você não tem permissão para montar entregas ao contador.');
    }
    const { ecd, ecf, period } = await this.resolveJobs(scope, dto.ecdJobId, dto.ecfJobId);
    await this.assertPeriodHardClosed(scope, period);

    const full = buildDeliveryManifest({
      scope,
      period,
      contactId: '',
      ecd: { jobId: ecd.id, sha256: ecd.sha256 as string },
      ecf: { jobId: ecf.id, sha256: ecf.sha256 as string },
      generatedAt: new Date(),
    });
    const { contactId: _omitted, ...preview } = full;
    return preview;
  }

  // ── Confirmação ────────────────────────────────────────────────────────────
  /**
   * Registra a entrega. Comando explícito (D6: `confirmed: true` é literal no DTO), no padrão
   * comando+CAS do maker-checker — nunca um `PATCH status`.
   *
   * Reusa a linha existente da mesma chave de idempotência: `QUEUED` avança para `SENT`, `SENT`
   * volta como está (segunda confirmação não duplica nem re-emite evento).
   */
  async confirmDelivery(
    scope: AccountingScope,
    dto: ConfirmDeliveryInput,
  ): Promise<ConfirmDeliveryResult> {
    if (!this.policy.canManageAccountingContact(scope)) {
      throw new ForbiddenError('Você não tem permissão para confirmar entregas ao contador.');
    }
    const contact = await this.requireContact(scope, dto.contactId);
    const { ecd, ecf, period } = await this.resolveJobs(scope, dto.ecdJobId, dto.ecfJobId);

    const { userId, unitId } = accountingScopeWhere(scope);
    const manifest = buildDeliveryManifest({
      scope,
      period,
      contactId: contact.id,
      ecd: { jobId: ecd.id, sha256: ecd.sha256 as string },
      ecf: { jobId: ecf.id, sha256: ecf.sha256 as string },
      generatedAt: new Date(),
    });

    const delivery = await this.deliveryRepo.runTransaction(async (tx) => {
      // GATE AUTORITATIVO — re-checado DENTRO da tx com `tx` propagado ao repo. O preflight do
      // buildDeliveryPackage não fecha o TOCTOU: um mês reaberto no meio do caminho passaria.
      await this.assertPeriodHardClosed(scope, period, tx);

      const existing = await this.deliveryRepo.findByJobsAndContact(
        scope,
        ecd.id,
        ecf.id,
        contact.id,
        tx,
      );
      if (existing) return this.markSent(scope, existing, manifest, tx);

      try {
        const created = await this.deliveryRepo.create(
          {
            userId,
            unitId,
            contactId: contact.id,
            ecdJobId: ecd.id,
            ecfJobId: ecf.id,
            periodStart: period.start,
            periodEnd: period.end,
            manifestSha256Ecd: manifest.files[0].sha256,
            manifestSha256Ecf: manifest.files[1].sha256,
            status: 'SENT',
            attemptCount: 1,
            requestedById: scope.actorUserId,
            sentAt: new Date(),
          },
          tx,
        );
        await this.appendDeliveryEvents(scope, created, manifest, tx);
        return created;
      } catch (error) {
        // P2002 na chave [ecdJobId, ecfJobId, contactId]: outra confirmação concorrente venceu a
        // corrida. Isso é caminho NORMAL da idempotência, não erro — relê a linha vencedora e
        // devolve UMA entrega, nunca uma segunda linha.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const winner = await this.deliveryRepo.findByJobsAndContact(
            scope,
            ecd.id,
            ecf.id,
            contact.id,
            tx,
          );
          // Review F5: a vencedora passa pelo MESMO caminho de promoção da linha pré-existente —
          // devolvê-la crua responderia `status: 'QUEUED'` junto de "o operador confirmou…".
          if (winner) return this.markSent(scope, winner, manifest, tx);
        }
        throw error;
      }
    });

    return {
      deliveryId: delivery.id,
      status: delivery.status,
      statusMeaning:
        'SENT = o operador confirmou que despachou o pacote; o servidor não envia nem confirma recebimento.',
      contact: { name: contact.name, crcNumber: contact.crcNumber, crcUf: contact.crcUf },
      signer: contactToJ930Signer(contact),
      manifest,
    };
  }

  // ── Retry ──────────────────────────────────────────────────────────────────
  /**
   * `FAILED → QUEUED` sobre a linha EXISTENTE (item 11) — nunca cria uma segunda linha para o
   * mesmo par de jobs. Reenvio de uma entrega já `SENT` **não é coberto** por este comando (o
   * BRIEF registra isso em "Achados fora de escopo"): pedir retry de `SENT` é 400, não um segundo
   * envio silencioso.
   */
  async retryDelivery(
    scope: AccountingScope,
    id: string,
    _dto: RetryDeliveryInput,
  ): Promise<AccountingDeliveryLog> {
    if (!this.policy.canManageAccountingContact(scope)) {
      throw new ForbiddenError('Você não tem permissão para reprocessar entregas ao contador.');
    }
    const delivery = await this.requireDelivery(scope, id);
    if (delivery.status !== 'FAILED') {
      throw new ValidationError(
        `Só uma entrega com status FAILED pode ser reprocessada (esta está em ${delivery.status}).`,
      );
    }
    return this.deliveryRepo.update(scope, id, {
      status: 'QUEUED',
      attemptCount: delivery.attemptCount + 1,
      failedAt: null,
      failureReason: null,
    });
  }

  // ── Read ───────────────────────────────────────────────────────────────────
  async getDelivery(scope: AccountingScope, id: string): Promise<AccountingDeliveryLog> {
    if (!this.policy.canReadAccountingContact(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler entregas ao contador.');
    }
    return this.requireDelivery(scope, id);
  }

  // ── Internals ──────────────────────────────────────────────────────────────
  private async requireContact(scope: AccountingScope, id: string): Promise<AccountingContact> {
    const contact = await this.contactRepo.findById(scope, id);
    if (!contact) throw new NotFoundError(`Contador '${id}' não foi encontrado.`);
    return contact;
  }

  private async requireDelivery(
    scope: AccountingScope,
    id: string,
  ): Promise<AccountingDeliveryLog> {
    const delivery = await this.deliveryRepo.findById(scope, id);
    if (!delivery) throw new NotFoundError(`Entrega '${id}' não foi encontrada.`);
    return delivery;
  }

  /**
   * Resolve os dois jobs PELO ESCOPO (cross-tenant → `NotFoundError`, nunca `ForbiddenError` —
   * mesmo padrão de `DataExchangeExportService.getArtifactForDownload`) e prova que servem de
   * pacote: kind correto, `EXPORTED`, `sha256` gravado, **período persistido e IGUAL nos dois**.
   * Um job sem `sha256` não pode entrar num manifesto que promete integridade — é 400, nunca hash
   * vazio no log. Um job sem período (gerado antes da migração `job_period_covered`) é 400: o
   * sistema não sabe o que ele cobre, e dizer "pronto para assinar" seria chute. ECD e ECF de
   * períodos diferentes é 400: é o furo F3 do review (arquivos de 2025 rotulados 2026) fechado na
   * origem — a entrega nunca mais depende de um ano digitado (Fork Novo A → b).
   */
  private async resolveJobs(
    scope: AccountingScope,
    ecdJobId: string,
    ecfJobId: string,
  ): Promise<ResolvedPair> {
    const ecd = await this.dataExchangeRepo.findJobById(scope, ecdJobId);
    if (!ecd) throw new NotFoundError(`Job da ECD '${ecdJobId}' não foi encontrado.`);
    const ecf = await this.dataExchangeRepo.findJobById(scope, ecfJobId);
    if (!ecf) throw new NotFoundError(`Job da ECF '${ecfJobId}' não foi encontrado.`);

    if (ecd.kind !== ECD_JOB_KIND) {
      throw new ValidationError(`O job '${ecdJobId}' não é uma ECD (kind=${ecd.kind}).`);
    }
    if (!ECF_JOB_KINDS.includes(ecf.kind)) {
      throw new ValidationError(`O job '${ecfJobId}' não é uma ECF (kind=${ecf.kind}).`);
    }
    for (const job of [ecd, ecf]) {
      if (job.status !== EXPORTED) {
        throw new ValidationError(
          `O job '${job.id}' não está EXPORTED (status=${job.status}) — o arquivo ainda não existe.`,
        );
      }
      if (!job.sha256) {
        throw new ValidationError(
          `O job '${job.id}' não tem sha256 gravado — sem ele o manifesto não prova integridade.`,
        );
      }
      if (!job.periodStart || !job.periodEnd) {
        throw new ValidationError(
          `O job '${job.id}' não tem período gravado (gerado antes da migração de período) — ` +
            'regere o arquivo para entregá-lo.',
        );
      }
    }
    const ecdStart = ecd.periodStart as Date;
    const ecdEnd = ecd.periodEnd as Date;
    const ecfStart = ecf.periodStart as Date;
    const ecfEnd = ecf.periodEnd as Date;
    if (ecdStart.getTime() !== ecfStart.getTime() || ecdEnd.getTime() !== ecfEnd.getTime()) {
      throw new ValidationError(
        `ECD cobre ${toDateOnly(ecdStart)}..${toDateOnly(ecdEnd)} e ECF cobre ` +
          `${toDateOnly(ecfStart)}..${toDateOnly(ecfEnd)} — o pacote exige o mesmo período nos dois.`,
      );
    }
    return { ecd, ecf, period: { start: ecdStart, end: ecdEnd } };
  }

  /**
   * F-CD7-a: TODOS os meses que o arquivo cobre têm de estar `HARD_CLOSED` — "12 meses seguidos
   * sempre, ou período selecionado" (cédula 10/09 §6, F3). Para o exercício-calendário são os 12;
   * para uma situação especial, os meses do período do job. Um lançamento em qualquer mês ainda
   * `OPEN`/`SOFT_CLOSED` mudaria o resultado que o contador assinaria. Mês não semeado conta como
   * NÃO fechado.
   */
  private async assertPeriodHardClosed(
    scope: AccountingScope,
    period: { start: Date; end: Date },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const months = monthsCovered(period.start, period.end);
    const open: string[] = [];
    for (const { year, month } of months) {
      const row = await this.periodRepo.findByYearMonth(scope, year, month, tx);
      if (!row || row.status !== HARD_CLOSED) open.push(`${year}-${String(month).padStart(2, '0')}`);
    }
    if (open.length > 0) {
      throw new ValidationError(
        `O pacote de ${toDateOnly(period.start)}..${toDateOnly(period.end)} não está pronto para ` +
          `assinar: ${open.length} de ${months.length} meses não estão HARD_CLOSED (${open.join(', ')}). ` +
          'Feche o período inteiro antes de entregar ao contador.',
      );
    }
  }

  /** `QUEUED → SENT` (ou `SENT → SENT`, sem novo evento) sobre a linha existente. */
  private async markSent(
    scope: AccountingScope,
    existing: AccountingDeliveryLog,
    manifest: DeliveryManifest,
    tx: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryLog> {
    if (existing.status === 'SENT') return existing;
    const sent = await this.deliveryRepo.update(
      scope,
      existing.id,
      { status: 'SENT', sentAt: new Date(), attemptCount: existing.attemptCount + 1 },
      tx,
    );
    await this.appendDeliveryEvents(scope, sent, manifest, tx);
    return sent;
  }

  /**
   * Os dois eventos da confirmação, na MESMA tx da escrita (T8). Payloads id-only + hash: nome e
   * e-mail do contador NUNCA entram na trilha (D5) — só `contactId`.
   */
  private async appendDeliveryEvents(
    scope: AccountingScope,
    delivery: AccountingDeliveryLog,
    manifest: DeliveryManifest,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType: DELIVERY_PACKAGE_BUILT,
      targetType: 'accounting_delivery',
      targetId: delivery.id,
      payload: {
        deliveryId: delivery.id,
        ecdJobId: delivery.ecdJobId,
        ecfJobId: delivery.ecfJobId,
        periodStart: toDateOnly(delivery.periodStart),
        periodEnd: toDateOnly(delivery.periodEnd),
        sha256Ecd: manifest.files[0].sha256,
        sha256Ecf: manifest.files[1].sha256,
      },
    });
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType: DELIVERY_SENT,
      targetType: 'accounting_delivery',
      targetId: delivery.id,
      payload: {
        deliveryId: delivery.id,
        contactId: delivery.contactId,
        attemptCount: delivery.attemptCount,
      },
    });
  }
}
