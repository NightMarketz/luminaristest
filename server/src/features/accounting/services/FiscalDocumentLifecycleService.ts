import type { FiscalDocument, FiscalDocumentPendingAttachment } from 'generated/prisma';
import {
  PendingAttachmentDrainSummarySchema,
  PendingAttachmentResultSchema,
  type PendingAttachmentDrainSummary,
} from '../dtos/FiscalDocumentPendingAttachmentDto';
import { AppError, ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import { parseNfseAutorizada, type ParsedNfse } from '../../../lib/nfse';
import { parseEventoCancelamento } from '../../../lib/nfseEvento';
import { compareNfseWithDps, toReleituraJson, type DpsEnviada, type ReleituraJson } from '../../../lib/nfseReadback';
import logger from '../../../lib/logger';
import { attemptRef } from '../repositories/FiscalDocumentRepository';
import { AUTHORIZED_STATUSES } from '../repositories/IFiscalDocumentRepository';
import type { FiscalDocumentKind, FiscalDocumentStatus, FiscalDocumentWithAttempts, IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { DocumentAttachmentService } from './DocumentAttachmentService';
import type { PostingService } from './PostingService';
import type { FiscalDocumentEmissionService, FiscalDocumentView } from './FiscalDocumentEmissionService';
import { selectDfeEmissor } from '../dfe/selectDfeEmissor';
import { resolveEmissorFor } from '../dfe/resolveEmissor';
import { ambienteFromTpAmb, assertTpAmb } from '../dfe/DfeEmissorPort';
import type { DfeAmbiente, DfeEmissorPort, EmissaoResult } from '../dfe/DfeEmissorPort';
import { DpsManualPayloadSchema, DpsPayloadSchema, toManualDps } from '../dtos/DpsPayloadDto';
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

const PENDING_STATUSES: readonly FiscalDocumentStatus[] = ['SENT', 'PROCESSING'];

/** A guarda `whenStatusIn` do repositório perdeu a corrida (outro pedido mudou o status antes) ⇒ 409, nunca 500. */
async function raceToConflict<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('fiscal_document_status_changed')) {
      throw new ConflictError('dfe_status_invalido: o documento mudou de status durante a operação.', 'DFE_STATUS_INVALIDO');
    }
    throw e;
  }
}

export interface PollSummary {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
  /** BE-INCR-DFE-ANEXO-PENDENTE item 7 — resultado da varredura de pendências de anexo no mesmo tick. */
  attachments?: PendingAttachmentDrainSummary;
}

// BE-INCR-DFE-ANEXO-PENDENTE F-PA-6 (a): teto de 10 tentativas, backoff exponencial de 2 min até 1 h.
export const PENDING_MAX_ATTEMPTS = 10;
const PENDING_BACKOFF_BASE_MS = 120_000;
const PENDING_BACKOFF_MAX_MS = 3_600_000;
const PENDING_LAST_ERROR_MAX = 500;
const PENDING_DRAIN_LIMIT = 50;

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
    const port = this.portFor(doc);
    this.assertAmbienteDoDocumento(doc);
    if (!port.capabilities.consultar) {
      throw new ConflictError(
        'dfe_consulta_manual: documento do modo manual — registre o retorno pelo upload do XML da NFS-e autorizada.',
        'DFE_CONSULTA_MANUAL',
      );
    }
    const result = await port.consultar(doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo));
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
        // BE-INCR-DFE-MANUAL (itens 9 e 10): o adaptador é o do DOCUMENTO; o que não consulta (modo manual) é pulado.
        const port = resolveEmissorFor(doc.partner);
        if (!port.capabilities.consultar) {
          summary.skipped++;
          continue;
        }
        const result = await port.consultar(doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo));
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
    const port = this.portFor(doc);
    // BE-INCR-DFE-TPAMB (F-AMB-2 a): a porta do env aponta para o ambiente do env; documento de outro ambiente
    // não sai por ela (uma nota de teste sairia como produção). O operador cancela e emite de novo.
    const envSelection = selectDfeEmissor(process.env);
    if (envSelection.port.name === doc.partner && envSelection.ambiente !== doc.ambiente) {
      throw new ValidationError('reenvio_bloqueado: ambiente_divergente', {
        faltantes: [`documento em ${doc.ambiente}, emissão configurada em ${envSelection.ambiente ?? 'nenhum'}`],
      });
    }

    const reassembled = await this.emissionService.reassembleGroupForReenvio(
      scope,
      doc.saleId,
      doc.kind as FiscalDocumentKind,
      doc.cTribNac,
      doc.ambiente as DfeAmbiente,
      doc.saleKey, // BE-INCR-PACOTE-VALIDADE (L2, dono 03/10): nota de saldo vencido remonta pelo vencimento
    );
    // A numeração NÃO é reconsumida no reenvio — é a MESMA DPS, uma nova tentativa de envio dela.
    const payload = port.capabilities.numbersDps
      ? DpsManualPayloadSchema.parse(toManualDps(reassembled.payload)) // F-MAN-4 a: o portal numera
      : DpsPayloadSchema.parse(
          doc.numero != null
            ? { ...reassembled.payload, infDPS: { ...reassembled.payload.infDPS, nDPS: Number(doc.numero) } }
            : reassembled.payload,
        );

    assertTpAmb(payload, doc.ambiente as DfeAmbiente);

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
      await port.emitir({
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
    if (!AUTHORIZED_STATUSES.includes(doc.status as FiscalDocumentStatus)) {
      throw new ValidationError(`cancelamento_bloqueado: só é possível cancelar um documento AUTHORIZED (status atual: ${doc.status}).`, {
        faltantes: [`status atual é ${doc.status}, esperado AUTHORIZED`],
      });
    }
    const port = this.portFor(doc);
    this.assertAmbienteDoDocumento(doc);
    if (!port.capabilities.cancelar) {
      throw new ConflictError(
        'dfe_cancelamento_manual: documento do modo manual — registre o cancelamento com o XML do evento (cancelamento-manual).',
        'DFE_CANCEL_MANUAL',
      );
    }

    const partnerRef = doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo);
    const result = await port.cancelar(partnerRef, input);

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
    await raceToConflict(() => this.markCancelled(scope, doc, input.cMotivo, input.xMotivo));
    return this.emissionService.getById(scope, documentId);
  }

  /**
   * Ramo CANCELLED (item 29), compartilhado com o cancelamento manual (BE-INCR-DFE-MANUAL item 13). Status re-checado
   * DENTRO da escrita (`whenStatusIn`). Nunca toca venda nem razão; só aposenta a proveniência.
   */
  private async markCancelled(scope: AccountingScope, doc: FiscalDocument, cMotivo: 1 | 2 | 9, xMotivo: string): Promise<void> {
    await this.repo.runTransaction(async (tx) => {
      await this.repo.transition(scope, doc.id, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelMotivo: cMotivo,
        cancelReason: xMotivo,
        saleKey: `cancelled:${doc.id}:${doc.saleId}`, // rename-on-cancel libera o @@unique (F-DFE-16 b)
        whenStatusIn: AUTHORIZED_STATUSES,
      }, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'dfe.cancelled',
        targetType: 'fiscal_document',
        targetId: doc.id,
        payload: { documentId: doc.id, cMotivo: String(cMotivo) },
      });
    });

    if (doc.sourceDocumentId) {
      await this.postingService.retireSourceDocument(scope, doc.sourceDocumentId, `dfe_cancelled:${cMotivo}`);
    }
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

  // ---- BE-INCR-DFE-MANUAL — retorno manual (itens 11–13) ----

  /**
   * POST …/documents/:id/retorno-manual (item 11). O XML da NFS-e autorizada que a pessoa baixou do portal é lido
   * (`parseNfseAutorizada`: assinatura E1630/E1634 primeiro — F-MAN-1 a), relido contra a DPS da tentativa corrente
   * (`compareNfseWithDps`) e autoriza o documento pelo MESMO caminho do `applyResult`. Guardas de identidade DURAS (422,
   * nada escrito): (i) prestador = o da DPS enviada; (ii) a chave não está em outro documento (dentro da tx); (iii) a nota
   * não é anterior ao documento; (iv) origem = portal (ambGer 2, procEmi 2|3). Divergência de CONTEÚDO ⇒
   * `AUTHORIZED_DIVERGENT` (F-MAN-2 c), que só sai cancelando (F-MAN-2b b).
   */
  async retornoManual(
    scope: AccountingScope,
    documentId: string,
    xml: Buffer,
    pdf?: Buffer,
  ): Promise<FiscalDocumentView> {
    if (!this.policy.canEmitFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para registrar o retorno de documento fiscal.');
    }
    const doc = await this.manualDoc(scope, documentId, PENDING_STATUSES);

    let nota: ParsedNfse;
    try {
      nota = parseNfseAutorizada(xml);
    } catch (e) {
      if (e instanceof ValidationError) throw new AppError(e.message, 422, 'NFSE_INVALIDA');
      throw e;
    }

    const enviada = JSON.parse(this.currentAttempt(doc).payloadJson) as DpsEnviada;
    const divergencias = compareNfseWithDps(enviada, nota);
    const identidade = divergencias.filter((d) => d.grupo === 'identidade').map((d) => `${d.campo}: ${d.tipo}`);
    if (Date.parse(nota.dhProc) < doc.createdAt.getTime()) {
      identidade.push('dhProc: a nota foi processada antes de o documento existir no Luminaris');
    }
    if (nota.ambGer !== '2' || !(nota.procEmi === '2' || nota.procEmi === '3')) {
      identidade.push(`origem: ambGer=${nota.ambGer}, procEmi=${nota.procEmi ?? 'ausente'} — não é nota emitida no portal público`);
    }
    const ambienteNota = ambienteFromTpAmb(nota.tpAmb);
    if (ambienteNota !== doc.ambiente) {
      identidade.push(`ambiente: nota de ${ambienteNota} (tpAmb=${nota.tpAmb}), documento de ${doc.ambiente}`);
    }
    if (identidade.length) {
      throw new AppError(`dfe_identidade_divergente: ${identidade.join('; ')}`, 422, 'DFE_IDENTIDADE_DIVERGENTE');
    }

    // Pré-checagem ANTES dos efeitos (anexo/proveniência acontecem antes da tx no applyResult — memória
    // efeito-irreversivel-antes-do-gate-autoritativo); a checagem autoritativa é a de dentro da tx (insideTx).
    const jaUsada = await this.repo.findByChaveOuCodigo(scope, nota.chaveAcesso);
    if (jaUsada && jaUsada.id !== doc.id) {
      throw new AppError(`dfe_identidade_divergente: chave já registrada no documento ${jaUsada.id}`, 422, 'DFE_IDENTIDADE_DIVERGENTE');
    }

    const releitura = toReleituraJson(divergencias);
    await raceToConflict(() => this.applyResult(
      scope,
      doc,
      {
        status: 'AUTHORIZED',
        partnerRef: doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo),
        numero: nota.dps.nDPS,
        nNFSe: nota.nNFSe,
        chaveOuCodigo: nota.chaveAcesso,
        valores: {
          baseIssCents: nota.valores.baseIssCents,
          aliqIssBp: nota.valores.aliqIssBp,
          vIssCents: nota.valores.vIssCents,
        },
        xml,
        ...(pdf ? { pdf } : {}),
        errors: [],
      },
      {
        releitura,
        serie: Number(nota.dps.serie),
        insideTx: async (tx) => {
          const outro = await this.repo.findByChaveOuCodigo(scope, nota.chaveAcesso, tx);
          if (outro && outro.id !== doc.id) {
            throw new AppError(`dfe_identidade_divergente: chave já registrada no documento ${outro.id}`, 422, 'DFE_IDENTIDADE_DIVERGENTE');
          }
        },
      },
    ));
    return this.emissionService.getById(scope, documentId);
  }

  /**
   * POST …/documents/:id/rejeicao-manual (item 12) — o portal recusou os dados: grava REJECTED com os erros que ele
   * mostrou; o reenvio existente (`reenviar`) remonta a DPS com o cadastro corrigido.
   */
  async rejeicaoManual(scope: AccountingScope, documentId: string, errors: Array<{ code: string; message: string }>): Promise<FiscalDocumentView> {
    if (!this.policy.canEmitFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para registrar o retorno de documento fiscal.');
    }
    const doc = await this.manualDoc(scope, documentId, PENDING_STATUSES);
    await raceToConflict(() => this.applyResult(
      scope,
      doc,
      { status: 'REJECTED', partnerRef: doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo), errors },
      {},
    ));
    return this.emissionService.getById(scope, documentId);
  }

  /**
   * POST …/documents/:id/cancelamento-manual (item 13, F-MAN-5 a) — exige o XML do evento `e101101` que o portal
   * devolveu: o `chNFSe` tem de ser a chave deste documento e o `cMotivo` do corpo tem de ser o do XML (parâmetro
   * aceito e ignorado é bug); o texto gravado é o `xMotivo` do XML. Mesmo ramo CANCELLED do `cancelar`.
   */
  async cancelamentoManual(
    scope: AccountingScope,
    documentId: string,
    input: { cMotivo: 1 | 2 | 9; xMotivo: string },
    eventoXml: Buffer,
  ): Promise<FiscalDocumentView> {
    if (!this.policy.canCancelFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para cancelar documento fiscal.');
    }
    const doc = await this.manualDoc(scope, documentId, AUTHORIZED_STATUSES);
    let evento;
    try {
      evento = parseEventoCancelamento(eventoXml);
    } catch (e) {
      if (e instanceof ValidationError) throw new AppError(e.message, 422, 'NFSE_EVENTO_INVALIDO');
      throw e;
    }
    if (evento.chNFSe !== doc.chaveOuCodigo) {
      throw new AppError('dfe_evento_divergente: o evento cancela outra NFS-e (chNFSe ≠ chave deste documento).', 422, 'DFE_EVENTO_DIVERGENTE');
    }
    if (evento.cMotivo !== input.cMotivo) {
      throw new AppError(
        `dfe_evento_divergente: cMotivo informado (${input.cMotivo}) difere do cMotivo do evento (${evento.cMotivo}).`,
        422,
        'DFE_EVENTO_DIVERGENTE',
      );
    }
    await raceToConflict(() => this.markCancelled(scope, doc, evento.cMotivo, evento.xMotivo));
    return this.emissionService.getById(scope, documentId);
  }

  /** Documento do modo manual, no escopo, num dos status esperados — senão 404/409 nomeados. */
  private async manualDoc(scope: AccountingScope, documentId: string, esperados: readonly FiscalDocumentStatus[]): Promise<FiscalDocumentWithAttempts> {
    const doc = await this.repo.findById(scope, documentId);
    if (!doc) throw new ValidationError(`Documento fiscal '${documentId}' não encontrado.`, null);
    if (doc.partner !== 'manual') {
      throw new ConflictError('dfe_nao_manual: só documentos do modo manual recebem retorno manual.', 'DFE_NAO_MANUAL');
    }
    if (!esperados.includes(doc.status as FiscalDocumentStatus)) {
      throw new ConflictError(
        `dfe_status_invalido: status atual ${doc.status}, esperado ${esperados.join(' | ')}.`,
        'DFE_STATUS_INVALIDO',
      );
    }
    return doc;
  }

  private currentAttempt(doc: FiscalDocumentWithAttempts) {
    const attempt = doc.attempts.find((a) => a.attemptNo === doc.currentAttemptNo);
    if (!attempt) throw new Error(`fiscal_document_attempt_not_found: ${doc.id}:${doc.currentAttemptNo}`);
    return attempt;
  }

  /**
   * BE-INCR-DFE-MANUAL (item 9): o adaptador do DOCUMENTO. A porta desabilitada no env continua bloqueando toda
   * operação por máquina (mesmo contrato do X10b: "desabilitada com aviso, nunca em silêncio").
   */
  private portFor(doc: FiscalDocument): DfeEmissorPort {
    const selection = selectDfeEmissor(process.env);
    if (!selection.enabled) {
      throw new ValidationError(`dfe_disabled: ${selection.reason}`, { faltantes: [selection.reason ?? 'porta desabilitada'] });
    }
    return resolveEmissorFor(doc.partner);
  }

  /**
   * Mesma regra do `reenviar` (F-AMB-2 a), para consultar/cancelar: a porta do env fala com o host/token do ambiente
   * do env (Focus: um host e um token por ambiente — `token_producao`/`token_homologacao`), então documento de outro
   * ambiente não passa por ela.
   */
  private assertAmbienteDoDocumento(doc: FiscalDocument): void {
    const selection = selectDfeEmissor(process.env);
    if (selection.port.name === doc.partner && selection.ambiente !== doc.ambiente) {
      throw new ValidationError('dfe_ambiente_divergente', {
        faltantes: [`documento em ${doc.ambiente}, emissão configurada em ${selection.ambiente ?? 'nenhum'}`],
      });
    }
  }

  // ---- Item 24 (transição) + 25 (autorização/proveniência) + parte do 26 (rejeição) ----

  /**
   * `manual` (BE-INCR-DFE-MANUAL): presente só no retorno manual — liga a guarda de status DENTRO da escrita, grava a
   * releitura (item 5) e a série do XML (F-MAN-4 a), roda `insideTx` na tx da autorização e decide
   * AUTHORIZED × AUTHORIZED_DIVERGENT (F-MAN-2 c).
   */
  private async applyResult(
    scope: AccountingScope,
    doc: FiscalDocument,
    result: EmissaoResult,
    manual?: { releitura?: ReleituraJson; serie?: number; insideTx?: (tx: Parameters<Parameters<IFiscalDocumentRepository['runTransaction']>[0]>[0]) => Promise<void> },
  ): Promise<void> {
    if (!isValidResultTransition(doc.status as FiscalDocumentStatus, result.status)) {
      throw new Error(`invalid_transition: ${doc.status} -> ${result.status}`);
    }
    const attemptResult = {
      attemptNo: doc.currentAttemptNo,
      resultStatus: result.status,
      resultJson: JSON.stringify({ errors: result.errors, valores: result.valores, ...(manual?.releitura ?? {}) }),
    };

    if (result.status === 'PROCESSING') {
      await this.repo.transition(scope, doc.id, { status: 'PROCESSING', attemptResult, whenStatusIn: PENDING_STATUSES });
      return;
    }

    if (result.status === 'REJECTED') {
      await this.repo.runTransaction(async (tx) => {
        await this.repo.transition(
          scope,
          doc.id,
          { status: 'REJECTED', errorsJson: JSON.stringify(result.errors), attemptResult, whenStatusIn: PENDING_STATUSES },
          tx,
        );
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

    const divergente = manual?.releitura?.releitura.status === 'DIVERGENTE';
    const chaveOuCodigo = result.chaveOuCodigo;
    const pending = await this.repo.runTransaction(async (tx) => {
      if (manual?.insideTx) await manual.insideTx(tx);
      await this.repo.transition(
        scope,
        doc.id,
        {
          status: divergente ? 'AUTHORIZED_DIVERGENT' : 'AUTHORIZED',
          ...(manual?.serie !== undefined ? { serie: manual.serie } : {}),
          whenStatusIn: PENDING_STATUSES,
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
          xmlAttachmentId: null,
          pdfAttachmentId: null,
          sourceDocumentId: null,
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
          // proveniência só existe DEPOIS da autorização (GAP-MAP applyResult); o vínculo fica no audit do attachSourceDocument.
          sourceDocumentId: '',
        },
      });
      if (manual?.releitura) {
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: 'dfe.manual_result',
          targetType: 'fiscal_document',
          targetId: doc.id,
          payload: {
            documentId: doc.id,
            attemptNo: String(doc.currentAttemptNo),
            releitura: manual.releitura.releitura.status,
            nDivergencias: String(manual.releitura.releitura.divergencias.length),
          },
        });
      }
      // BE-INCR-DFE-ANEXO-PENDENTE item 3: em produção a pendência (com os bytes, F-PA-1 a) nasce NA MESMA tx da
      // autorização — recusa da tx não deixa pendência. Em homologação nada é anexado (ADR §9.2 item 5).
      if (doc.ambiente !== 'producao') return null;
      return this.repo.createPendingAttachment(
        scope,
        {
          documentId: doc.id,
          xmlBytes: result.xml ?? null,
          pdfBytes: result.pdf ?? null,
          resultJson: JSON.stringify(
            PendingAttachmentResultSchema.parse({
              chaveOuCodigo,
              nNFSe: result.nNFSe ?? null,
              numero: result.numero ?? null,
              valores: result.valores ?? null,
            }),
          ),
        },
        tx,
      );
    });

    // BE-INCR-DFE-ANEXO-PENDENTE item 4 (F-PA-4 a): caminho rápido inline. Falha NÃO propaga — a autorização está
    // commitada e a pendência (gravada na tx acima) fica para a varredura do DfePollScheduler.
    if (pending) {
      try {
        await this.drainOne(pending);
      } catch (error) {
        logger.warn('dfe_authorized: anexo/proveniência falhou depois da autorização — pendência fica para a varredura', {
          documentId: doc.id,
          pendingAttachmentId: pending.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // ---- BE-INCR-DFE-ANEXO-PENDENTE (BRIEF itens 5–8 e 11) ----

  /**
   * Item 5 (F-PA-3 a) — drena UMA pendência, idempotente por passo: cada upload só roda se o id do passo ainda é null
   * na pendência, e o id é gravado na pendência antes do passo seguinte (o `upload` não deduplica). A janela que sobra
   * (upload commitou e a gravação do id falhou) gera no máximo um anexo duplicado, nunca uma perda (BRIEF F-PA-3).
   * Item 6 (F-PA-5 c): documento que já não está autorizado ganha o anexo e a proveniência, que é aposentada em seguida
   * (o mesmo ramo do #420 para o cancelamento entre as duas escritas). Em todos os casos a pendência termina DONE.
   */
  private async drainOne(pending: FiscalDocumentPendingAttachment): Promise<void> {
    const scope = resolveAccountingScope({ userId: pending.userId }, pending.unitId);
    const doc = await this.repo.findById(scope, pending.documentId);
    if (!doc) throw new Error(`fiscal_document_not_found: ${pending.documentId}`);
    const result = PendingAttachmentResultSchema.parse(JSON.parse(pending.resultJson));

    let xmlAttachmentId = pending.xmlAttachmentId;
    let pdfAttachmentId = pending.pdfAttachmentId;
    let sourceDocumentId = pending.sourceDocumentId;

    if (pending.xmlBytes && !xmlAttachmentId) {
      const att = await this.documentAttachmentService.upload(scope, {
        targetType: 'FISCAL_DOCUMENT',
        targetId: doc.id,
        fileName: `${doc.id}.xml`,
        mimeType: 'application/xml',
        buffer: Buffer.from(pending.xmlBytes),
      });
      xmlAttachmentId = att.id;
      await this.repo.markPendingStep(pending.id, { xmlAttachmentId });
    }
    if (pending.pdfBytes && !pdfAttachmentId) {
      const att = await this.documentAttachmentService.upload(scope, {
        targetType: 'FISCAL_DOCUMENT',
        targetId: doc.id,
        fileName: `${doc.id}.pdf`,
        mimeType: 'application/pdf',
        buffer: Buffer.from(pending.pdfBytes),
      });
      pdfAttachmentId = att.id;
      await this.repo.markPendingStep(pending.id, { pdfAttachmentId });
    }
    if (!sourceDocumentId) {
      // attachSourceDocument já é idempotente por externalRef (0 lançamentos novos); o id gravado evita recriar uma
      // proveniência que o ramo F-PA-5 c já aposentou.
      const sourceDoc = await this.postingService.attachSourceDocument(scope, doc.anchorEntryId, {
        sourceType: 'dfe.nfse',
        externalRef: result.chaveOuCodigo,
        documentDate: doc.dCompet,
        description: `NFS-e ${result.nNFSe ?? result.numero}`,
        attachmentId: xmlAttachmentId ?? pdfAttachmentId ?? null,
        // sem PII — só o retorno estrutural do parceiro, nunca dados do tomador (§1.12).
        rawJson: JSON.stringify({
          status: 'AUTHORIZED',
          partnerRef: doc.partnerRef,
          numero: result.numero ?? undefined,
          nNFSe: result.nNFSe ?? undefined,
          chaveOuCodigo: result.chaveOuCodigo,
          valores: result.valores ?? undefined,
        }),
      });
      sourceDocumentId = sourceDoc.id;
      await this.repo.markPendingStep(pending.id, { sourceDocumentId });
    }

    const atual = doc.status as FiscalDocumentStatus;
    let aposentar = !AUTHORIZED_STATUSES.includes(atual);
    if (!aposentar) {
      try {
        // Guarda na 2ª escrita (#420): um cancelamento no meio não pode deixar a proveniência viva num documento cancelado.
        await this.repo.transition(scope, doc.id, { status: atual, whenStatusIn: [atual], xmlAttachmentId, pdfAttachmentId, sourceDocumentId });
      } catch (e) {
        if (!(e instanceof Error && e.message.startsWith('fiscal_document_status_changed'))) throw e;
        aposentar = true;
      }
    }
    if (aposentar) {
      await this.postingService.retireSourceDocument(scope, sourceDocumentId, 'dfe_status_changed');
      logger.warn('dfe_authorized: status mudou antes de gravar anexos — proveniência aposentada', { documentId: doc.id });
    }
    await this.repo.markPendingDone(pending.id);
  }

  /**
   * Item 7 (F-PA-2 a) — varredura chamada pelo MESMO tick do `DfePollScheduler`, depois do `pollPendingOnce`. Antes de
   * drenar, procura candidatos do backfill por reconsulta (item 11, F-PA-8 b: em todo tick). Item 8 (F-PA-6 a): falha
   * ⇒ `attempts++`, backoff exponencial de 2 min até 1 h, `lastError` truncado a 500; no teto (10) ⇒ FAILED +
   * `logger.error` (os bytes ficam, para reprocesso manual).
   */
  async drainPendingAttachmentsOnce(limit = PENDING_DRAIN_LIMIT): Promise<PendingAttachmentDrainSummary> {
    await this.backfillPendingAttachments(limit);
    const due = await this.repo.listDuePendingAttachments(new Date(), limit);
    const summary: PendingAttachmentDrainSummary = { total: due.length, done: 0, failed: 0, discarded: 0 };
    for (const pending of due) {
      try {
        await this.drainOne(pending);
        summary.done++;
      } catch (error) {
        summary.failed++;
        const message = (error instanceof Error ? error.message : String(error)).slice(0, PENDING_LAST_ERROR_MAX);
        const attempts = pending.attempts + 1;
        if (attempts >= PENDING_MAX_ATTEMPTS) {
          await this.repo.markPendingStep(pending.id, { attempts, lastError: message, status: 'FAILED' });
          logger.error('dfe_pending_attachment: teto de tentativas — pendência FAILED (reprocesso manual)', {
            pendingAttachmentId: pending.id,
            documentId: pending.documentId,
            attempts,
            error: message,
          });
        } else {
          const delay = Math.min(PENDING_BACKOFF_BASE_MS * 2 ** (attempts - 1), PENDING_BACKOFF_MAX_MS);
          await this.repo.markPendingStep(pending.id, { attempts, lastError: message, nextAttemptAt: new Date(Date.now() + delay) });
          logger.warn('dfe_pending_attachment: falha — nova tentativa com backoff', {
            pendingAttachmentId: pending.id,
            documentId: pending.documentId,
            attempts,
            error: message,
          });
        }
      }
    }
    return PendingAttachmentDrainSummarySchema.parse(summary);
  }

  /**
   * Item 11 (F-PA-7 b, F-PA-8 b) — documento autorizado em produção sem anexo, sem proveniência e sem pendência: reconsulta
   * o parceiro e, se o retorno trouxer XML, cria a pendência (PENDING) para a varredura drenar. Modo manual ou retorno
   * sem XML: skip + `logger.warn` com o `documentId` (lista para ação humana). Custo declarado no BRIEF: esses
   * documentos são reconsultados em todo tick.
   */
  private async backfillPendingAttachments(limit: number): Promise<void> {
    const candidates = await this.repo.listAttachmentBackfillCandidates(limit);
    if (!candidates.length) return;
    const selection = selectDfeEmissor(process.env);
    for (const doc of candidates) {
      try {
        if (!selection.enabled) {
          logger.warn('dfe_pending_attachment_backfill: skip — porta desabilitada', { documentId: doc.id });
          continue;
        }
        const port = resolveEmissorFor(doc.partner);
        if (!port.capabilities.consultar) {
          logger.warn('dfe_pending_attachment_backfill: skip — modo manual, sem de onde tirar o XML', { documentId: doc.id });
          continue;
        }
        if (selection.port.name === doc.partner && selection.ambiente !== doc.ambiente) {
          // F-AMB-2 a: a porta do env fala com o ambiente do env.
          logger.warn('dfe_pending_attachment_backfill: skip — ambiente divergente', { documentId: doc.id });
          continue;
        }
        const result = await port.consultar(doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo));
        if (!result.xml) {
          logger.warn('dfe_pending_attachment_backfill: skip — retorno sem XML', { documentId: doc.id });
          continue;
        }
        const scope = resolveAccountingScope({ userId: doc.userId }, doc.unitId);
        await this.repo.createPendingAttachment(scope, {
          documentId: doc.id,
          xmlBytes: result.xml,
          pdfBytes: result.pdf ?? null,
          resultJson: JSON.stringify(
            PendingAttachmentResultSchema.parse({
              chaveOuCodigo: doc.chaveOuCodigo ?? result.chaveOuCodigo,
              nNFSe: doc.nNFSe ?? result.nNFSe ?? null,
              numero: doc.numero != null ? String(doc.numero) : (result.numero ?? null),
              valores: result.valores ?? null,
            }),
          ),
        });
      } catch (error) {
        logger.error('dfe_pending_attachment_backfill: falha ao reconsultar documento — alerta', {
          documentId: doc.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
