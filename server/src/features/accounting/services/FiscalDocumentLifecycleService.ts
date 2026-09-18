import type { FiscalDocument } from 'generated/prisma';
import { AppError, ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { attemptRef } from '../repositories/FiscalDocumentRepository';
import type { FiscalDocumentKind, FiscalDocumentStatus, FiscalDocumentWithAttempts, IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { DocumentAttachmentService } from './DocumentAttachmentService';
import type { PostingService } from './PostingService';
import type { FiscalDocumentEmissionService, FiscalDocumentView } from './FiscalDocumentEmissionService';
import { selectDfeEmissor } from '../dfe/selectDfeEmissor';
import type { DfeAmbiente, EmissaoResult } from '../dfe/DfeEmissorPort';
import { DpsPayloadSchema } from '../dtos/DpsPayloadDto';
import { resolveAccountingScope } from '../scope/AccountingScope';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * BE-INCR-DFE (nó X10b, BRIEF Fase D, itens 24-30) — o que acontece a um `FiscalDocument` DEPOIS
 * do `SENT` (Fase C / `FiscalDocumentEmissionService`, PR-2): a máquina de transições, a
 * proveniência quando autorizado (F-DFE-18/19), o reenvio de rejeitado, o cancelamento e o job
 * de polling. Autorização citável: BRIEF §4 "RATIFICAÇÃO — 2026-09-17" (F-DFE-12..19).
 *
 * Depende de `FiscalDocumentEmissionService` para MONTAGEM (reenvio remonta o payload) e LEITURA
 * (toda operação devolve a view atualizada via `getById`, nunca duplica `toView`).
 */

/** Item 24 — única tabela de transições válidas a partir de um RESULTADO da porta (nunca aceita
 *  SENT/PROCESSING pulando direto pra CANCELLED — isso só acontece via `cancelar()`, a partir de
 *  AUTHORIZED, com seu próprio guard). Mutation target: se alguém adicionar 'CANCELLED' aqui, o
 *  teste da tabela de transições tem que acusar. */
const VALID_RESULT_TRANSITIONS: Partial<Record<FiscalDocumentStatus, FiscalDocumentStatus[]>> = {
  SENT: ['AUTHORIZED', 'REJECTED', 'PROCESSING'],
  PROCESSING: ['AUTHORIZED', 'REJECTED', 'PROCESSING'],
};

export function isValidResultTransition(from: FiscalDocumentStatus, to: FiscalDocumentStatus): boolean {
  return (VALID_RESULT_TRANSITIONS[from] ?? []).includes(to);
}

/** Erro de código próprio (dfe_*) que o job de polling faz skip+log — nunca a classe base
 *  (memória `erro-especifico-para-skip-em-job`). Qualquer outro erro é um alerta (`failed`). */
function isDfeSkippableError(error: unknown): boolean {
  return error instanceof AppError && error.message.startsWith('dfe_');
}

export interface PollSummary {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
}

export class FiscalDocumentLifecycleService {
  constructor(
    private readonly repo: IFiscalDocumentRepository,
    private readonly emissionService: FiscalDocumentEmissionService,
    private readonly documentAttachmentService: DocumentAttachmentService,
    private readonly postingService: PostingService,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  /** POST /api/nfe/dfe/documents/:id/consultar (item 27, tela) — re-consulta UM documento. */
  async consultarUm(scope: AccountingScope, documentId: string): Promise<FiscalDocumentView> {
    if (!this.policy.canEmitFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para consultar documento fiscal.');
    }
    const doc = await this.repo.findById(scope, documentId);
    if (!doc) throw new ValidationError(`Documento fiscal '${documentId}' não encontrado.`, null);
    if (doc.status !== 'SENT' && doc.status !== 'PROCESSING') {
      return this.emissionService.getById(scope, documentId); // terminal — nada a consultar
    }
    const selection = selectDfeEmissor(process.env);
    if (!selection.enabled) {
      throw new ValidationError(`dfe_disabled: ${selection.reason}`, { faltantes: [selection.reason ?? 'porta desabilitada'] });
    }
    const result = await selection.port.consultar(doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo));
    await this.applyResult(scope, doc, result);
    return this.emissionService.getById(scope, documentId);
  }

  /**
   * Job `dfe_poll_pending` (item 27, JOB-005, Prisma-direto) — varre `SENT|PROCESSING` mais
   * velhos que `olderThan`, reconstrói o escopo de cada documento (mesmo padrão de
   * `accountingSyncReconcile.job.ts`: `resolveAccountingScope({userId: doc.userId}, doc.unitId)`)
   * e aplica o resultado. Erro de código próprio `dfe_*` = skip+log; qualquer outro = alerta.
   */
  async pollPendingOnce(olderThan: Date): Promise<PollSummary> {
    const pending = await this.repo.listPending(olderThan);
    const summary: PollSummary = { total: pending.length, updated: 0, skipped: 0, failed: 0 };
    const selection = selectDfeEmissor(process.env);
    if (!selection.enabled) {
      // Porta desabilitada globalmente — não é erro de nenhum documento individual, só não há o
      // que consultar. Skip silencioso em nível de lote (o `status` endpoint já avisa disso).
      summary.skipped = pending.length;
      return summary;
    }
    for (const doc of pending) {
      const scope = resolveAccountingScope({ userId: doc.userId }, doc.unitId);
      try {
        const result = await selection.port.consultar(doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo));
        await this.applyResult(scope, doc, result);
        summary.updated++;
      } catch (error) {
        if (isDfeSkippableError(error)) {
          logger.warn('dfe_poll_pending: skip (erro de código próprio)', {
            documentId: doc.id,
            error: error instanceof Error ? error.message : String(error),
          });
          summary.skipped++;
        } else {
          logger.error('dfe_poll_pending: falha ao consultar documento — alerta', {
            documentId: doc.id,
            error: error instanceof Error ? error.message : String(error),
          });
          summary.failed++;
        }
      }
    }
    return summary;
  }

  /**
   * POST /api/nfe/dfe/documents/:id/reenviar (item 26) — só de `REJECTED`. Cria tentativa n+1 com
   * `ref` novo, payload REMONTADO (perfil/venda corrigidos); a tentativa n permanece intacta —
   * `appendAttempt` cria uma linha NOVA, nunca sobrescreve a anterior (garantia do repositório).
   */
  async reenviar(scope: AccountingScope, documentId: string): Promise<FiscalDocumentView> {
    if (!this.policy.canEmitFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para reenviar documento fiscal.');
    }
    const doc = await this.repo.findById(scope, documentId);
    if (!doc) throw new ValidationError(`Documento fiscal '${documentId}' não encontrado.`, null);
    if (doc.status !== 'REJECTED') {
      throw new ValidationError(`reenvio_bloqueado: só é possível reenviar um documento REJECTED (status atual: ${doc.status}).`, {
        faltantes: [`status atual é ${doc.status}, esperado REJECTED`],
      });
    }
    const selection = selectDfeEmissor(process.env);
    if (!selection.enabled) {
      throw new ValidationError(`dfe_disabled: ${selection.reason}`, { faltantes: [selection.reason ?? 'porta desabilitada'] });
    }

    const reassembled = await this.emissionService.reassembleGroupForReenvio(
      scope,
      doc.saleId,
      doc.kind as FiscalDocumentKind,
      doc.cTribNac,
    );
    // A numeração NÃO é reconsumida no reenvio — é a MESMA DPS, uma nova tentativa de envio dela.
    const payload = doc.numero != null
      ? { ...reassembled.payload, infDPS: { ...reassembled.payload.infDPS, nDPS: Number(doc.numero) } }
      : reassembled.payload;
    DpsPayloadSchema.parse(payload);

    const nextAttemptNo = doc.currentAttemptNo + 1;
    const ref = attemptRef(doc.id, nextAttemptNo);
    await this.repo.runTransaction(async (tx) => {
      await this.repo.appendAttempt(scope, { documentId: doc.id, attemptNo: nextAttemptNo, payloadJson: JSON.stringify(payload) }, tx);
      await this.repo.transition(scope, doc.id, { status: 'SENT', currentAttemptNo: nextAttemptNo, errorsJson: null }, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'dfe.emitted',
        targetType: 'fiscal_document',
        targetId: doc.id,
        payload: { documentId: doc.id, kind: doc.kind, attemptNo: nextAttemptNo, ref, vServCents: String(doc.vServCents), ambiente: doc.ambiente },
      });
    });

    // Pós-commit, mesma regra do ciclo SENT original (item 20): falha de rede grava errorsJson,
    // sem tentativa automática n+2.
    try {
      await selection.port.emitir({
        kind: doc.kind as FiscalDocumentKind,
        ref,
        ambiente: doc.ambiente as DfeAmbiente,
        cnpjEmitente: reassembled.cnpjEmitente,
        partnerAccountRef: reassembled.partnerAccountRef,
        payload,
      });
    } catch (emitError) {
      const message = emitError instanceof Error ? emitError.message : String(emitError);
      logger.error('DfeEmissorPort.emitir falhou no reenvio — documento fica SENT', { documentId: doc.id, error: message });
      await this.repo.transition(scope, doc.id, { status: 'SENT', errorsJson: JSON.stringify([{ code: 'dfe_reenvio_failed', message }]) });
    }

    return this.emissionService.getById(scope, documentId);
  }

  /**
   * POST /api/nfe/dfe/documents/:id/cancelar (item 29) — só de `AUTHORIZED`. Nunca toca a venda
   * nem o razão (ADR §7 item 5) — só o documento fiscal e, se autorizado em produção, a
   * proveniência que ele havia anexado (F-DFE-18, soft-delete, sem apagar lançamento nenhum).
   */
  async cancelar(scope: AccountingScope, documentId: string, input: { cMotivo: 1 | 2 | 9; xMotivo: string }): Promise<FiscalDocumentView> {
    if (!this.policy.canCancelFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para cancelar documento fiscal.');
    }
    const doc = await this.repo.findById(scope, documentId);
    if (!doc) throw new ValidationError(`Documento fiscal '${documentId}' não encontrado.`, null);
    if (doc.status !== 'AUTHORIZED') {
      throw new ValidationError(`cancelamento_bloqueado: só é possível cancelar um documento AUTHORIZED (status atual: ${doc.status}).`, {
        faltantes: [`status atual é ${doc.status}, esperado AUTHORIZED`],
      });
    }
    const selection = selectDfeEmissor(process.env);
    if (!selection.enabled) {
      throw new ValidationError(`dfe_disabled: ${selection.reason}`, { faltantes: [selection.reason ?? 'porta desabilitada'] });
    }

    const partnerRef = doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo);
    const result = await selection.port.cancelar(partnerRef, input);

    if (result.status === 'OUT_OF_WINDOW') {
      throw new ConflictError('prazo do município (E0822): fora da janela de cancelamento.', 'DFE_CANCEL_OUT_OF_WINDOW');
    }
    if (result.status === 'REJECTED') {
      const detail = result.errors.map((e) => e.message).join('; ') || 'sem detalhe do parceiro';
      throw new ConflictError(`Cancelamento rejeitado pelo parceiro: ${detail}`, 'DFE_CANCEL_REJECTED');
    }
    if (result.status === 'PROCESSING') {
      // Não citado explicitamente no item 29 (só CANCELLED/OUT_OF_WINDOW/REJECTED) — inalcançável
      // com Null (sempre CANCELLED) e File (sempre REJECTED); tratado como "ainda não decidido".
      throw new ConflictError('Cancelamento ainda em processamento no parceiro — consulte novamente mais tarde.', 'DFE_CANCEL_PROCESSING');
    }

    // CANCELLED
    await this.repo.runTransaction(async (tx) => {
      await this.repo.transition(scope, doc.id, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelMotivo: input.cMotivo,
        cancelReason: input.xMotivo,
        saleKey: `cancelled:${doc.id}:${doc.saleId}`, // rename-on-cancel libera o @@unique (F-DFE-16 b)
      }, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'dfe.cancelled',
        targetType: 'fiscal_document',
        targetId: doc.id,
        payload: { documentId: doc.id, cMotivo: String(input.cMotivo) },
      });
    });

    if (doc.sourceDocumentId) {
      await this.postingService.retireSourceDocument(scope, doc.sourceDocumentId, `dfe_cancelled:${input.cMotivo}`);
    }

    return this.emissionService.getById(scope, documentId);
  }

  /**
   * POST /api/nfe/dfe/webhook/:partner (item 28, F-DFE-12) — corpo bruto. Inválido (assinatura,
   * adaptador sem webhook, ou `:partner` diferente do parceiro habilitado) ⇒ 401 SEM EFEITO
   * (0 escrita). Válido ⇒ "acorda" a re-consulta do `partnerRef` — o corpo do webhook NUNCA
   * transiciona estado sozinho, só reusa a mesma `applyResult` que o poll job usa.
   *
   * Nenhum adaptador deste BRIEF (Null/File) declara `capabilities.webhook` — item 28 é testável
   * hoje só pelo caminho 401 (o próprio texto do BRIEF: "Null/File ⇒ 401 sempre"). O caminho
   * "válido" fica sem cobertura de integração até existir um parceiro real com webhook.
   */
  async webhookReceived(partner: string, headers: Record<string, string | undefined>, rawBody: Buffer): Promise<{ status: number }> {
    const selection = selectDfeEmissor(process.env);
    if (!selection.enabled || selection.port.name !== partner || !selection.port.capabilities.webhook) {
      return { status: 401 };
    }
    const verification = selection.port.verifyWebhook(headers, rawBody);
    if (!verification.ok) {
      return { status: 401 };
    }
    const doc = await this.repo.findByPartnerRef(verification.partnerRef);
    if (!doc) {
      // partnerRef válido mas sem documento vivo correspondente — nada a acordar; ainda 200 (o
      // parceiro não deve reenviar o mesmo webhook por isso).
      return { status: 200 };
    }
    const scope = resolveAccountingScope({ userId: doc.userId }, doc.unitId);
    try {
      const result = await selection.port.consultar(verification.partnerRef);
      await this.applyResult(scope, doc, result);
    } catch (error) {
      logger.error('webhook DFE: falha ao re-consultar — deixado para o poll job', {
        documentId: doc.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { status: 200 };
  }

  // ---- Item 24 (transição) + 25 (autorização/proveniência) + parte do 26 (rejeição) ----

  private async applyResult(scope: AccountingScope, doc: FiscalDocument, result: EmissaoResult): Promise<void> {
    if (!isValidResultTransition(doc.status as FiscalDocumentStatus, result.status)) {
      throw new Error(`invalid_transition: ${doc.status} -> ${result.status}`);
    }
    const attemptResult = {
      attemptNo: doc.currentAttemptNo,
      resultStatus: result.status,
      resultJson: JSON.stringify({ errors: result.errors, valores: result.valores }),
    };

    if (result.status === 'PROCESSING') {
      await this.repo.transition(scope, doc.id, { status: 'PROCESSING', attemptResult });
      return;
    }

    if (result.status === 'REJECTED') {
      await this.repo.runTransaction(async (tx) => {
        await this.repo.transition(scope, doc.id, { status: 'REJECTED', errorsJson: JSON.stringify(result.errors), attemptResult }, tx);
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: 'dfe.rejected',
          targetType: 'fiscal_document',
          targetId: doc.id,
          // JSON.stringify explícito — canonicalizeAuditPayload faz String(v) em cada valor, e
          // String(array) junta por vírgula sem colchetes (perde a forma); serializar aqui mantém
          // a lista legível e parseável de volta.
          payload: { documentId: doc.id, attemptNo: doc.currentAttemptNo, errorCodes: JSON.stringify(result.errors.map((e) => e.code)) },
        });
      });
      return;
    }

    // AUTHORIZED (item 25). O "número" do ADR D3 iv já está satisfeito por `doc.numero` quando a
    // numeração é LOCAL (capabilities.numbersDps === false, item 18) — o parceiro não precisa
    // ecoar de volta o que ele nunca atribuiu. Achado real da revisão independente do PR-3:
    // NullEmissor.consultar() nunca devolve numero/nNFSe (só emitir() ecoa, e aquele resultado
    // imediato é descartado por design, item 20/24) — sem este fallback, NENHUM documento chega a
    // AUTHORIZED pelo adaptador de referência do próprio BRIEF.
    if (!result.partnerRef || !(result.numero || result.nNFSe || doc.numero != null) || !result.chaveOuCodigo) {
      throw new ValidationError(
        'dfe_authorized_incompleto: retorno do parceiro não trouxe partnerRef + número + chaveOuCodigo (ADR D3 iv).',
      );
    }

    let xmlAttachmentId: string | null = null;
    let pdfAttachmentId: string | null = null;
    let sourceDocumentId: string | null = null;

    // Em produção: (1) XML/PDF -> DocumentAttachment; (2) attachSourceDocument (0 lançamentos
    // novos, idempotente por externalRef). Em homologação: grava o documento, NÃO anexa nada
    // (ADR §9.2 item 5).
    if (doc.ambiente === 'producao') {
      if (result.xml) {
        const att = await this.documentAttachmentService.upload(scope, {
          targetType: 'FISCAL_DOCUMENT',
          targetId: doc.id,
          fileName: `${doc.id}.xml`,
          mimeType: 'application/xml',
          buffer: result.xml,
        });
        xmlAttachmentId = att.id;
      }
      if (result.pdf) {
        const att = await this.documentAttachmentService.upload(scope, {
          targetType: 'FISCAL_DOCUMENT',
          targetId: doc.id,
          fileName: `${doc.id}.pdf`,
          mimeType: 'application/pdf',
          buffer: result.pdf,
        });
        pdfAttachmentId = att.id;
      }
      const sourceDoc = await this.postingService.attachSourceDocument(scope, doc.anchorEntryId, {
        sourceType: 'dfe.nfse',
        externalRef: result.chaveOuCodigo,
        documentDate: doc.dCompet,
        description: `NFS-e ${result.nNFSe ?? result.numero}`,
        attachmentId: xmlAttachmentId ?? pdfAttachmentId ?? null,
        // sem PII — só o retorno estrutural do parceiro, nunca dados do tomador (§1.12).
        rawJson: JSON.stringify({ status: result.status, partnerRef: result.partnerRef, numero: result.numero, nNFSe: result.nNFSe, chaveOuCodigo: result.chaveOuCodigo, valores: result.valores }),
      });
      sourceDocumentId = sourceDoc.id;
    }

    await this.repo.runTransaction(async (tx) => {
      await this.repo.transition(
        scope,
        doc.id,
        {
          status: 'AUTHORIZED',
          partnerRef: result.partnerRef,
          nNFSe: result.nNFSe ?? null,
          chaveOuCodigo: result.chaveOuCodigo,
          numero: result.numero ? BigInt(result.numero) : undefined,
          baseIssCents: result.valores?.baseIssCents != null ? BigInt(result.valores.baseIssCents) : undefined,
          aliqIssBp: result.valores?.aliqIssBp,
          vIssCents: result.valores?.vIssCents != null ? BigInt(result.valores.vIssCents) : undefined,
          vIbsCents: result.valores?.vIbsCents != null ? BigInt(result.valores.vIbsCents) : undefined,
          vCbsCents: result.valores?.vCbsCents != null ? BigInt(result.valores.vCbsCents) : undefined,
          authorizedAt: new Date(),
          xmlAttachmentId,
          pdfAttachmentId,
          sourceDocumentId,
          attemptResult,
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'dfe.authorized',
        targetType: 'fiscal_document',
        targetId: doc.id,
        payload: {
          documentId: doc.id,
          partnerRef: result.partnerRef ?? '',
          nNFSe: result.nNFSe ?? '',
          chaveOuCodigo: result.chaveOuCodigo ?? '',
          sourceDocumentId: sourceDocumentId ?? '',
        },
      });
    });
  }
}
