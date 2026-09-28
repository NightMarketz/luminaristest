import type { FiscalDocument } from 'generated/prisma';
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
    const port = this.portFor(doc);
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
  ): Promise<FiscalDocumentView & { releitura: ReleituraJson['releitura'] }> {
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
    return { ...(await this.emissionService.getById(scope, documentId)), releitura: releitura.releitura };
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
      await this.repo.transition(scope, doc.id, { status: 'PROCESSING', attemptResult });
      return;
    }

    if (result.status === 'REJECTED') {
      await this.repo.runTransaction(async (tx) => {
        await this.repo.transition(
          scope,
          doc.id,
          { status: 'REJECTED', errorsJson: JSON.stringify(result.errors), attemptResult, ...(manual ? { whenStatusIn: PENDING_STATUSES } : {}) },
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
    await this.repo.runTransaction(async (tx) => {
      if (manual?.insideTx) await manual.insideTx(tx);
      await this.repo.transition(
        scope,
        doc.id,
        {
          status: divergente ? 'AUTHORIZED_DIVERGENT' : 'AUTHORIZED',
          ...(manual?.serie !== undefined ? { serie: manual.serie } : {}),
          ...(manual ? { whenStatusIn: PENDING_STATUSES } : {}),
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
    });

    let xmlAttachmentId: string | null = null;
    let pdfAttachmentId: string | null = null;
    let sourceDocumentId: string | null = null;

    // Em produção: (1) XML/PDF -> DocumentAttachment; (2) attachSourceDocument (0 lançamentos
    // novos, idempotente por externalRef). Em homologação: grava o documento, NÃO anexa nada
    // (ADR §9.2 item 5). Só DEPOIS da tx de autorização (GAP-MAP applyResult, fork do dono 28/09):
    // guarda recusada não deixa anexo nem proveniência. Falha aqui deixa AUTHORIZED sem anexo —
    // reexecutável (attachSourceDocument é idempotente por externalRef).
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
      const autorizado = divergente ? 'AUTHORIZED_DIVERGENT' : 'AUTHORIZED';
      try {
        // Guarda na 2ª escrita: um cancelamento entre as duas escritas já aposentou a proveniência que conhecia (nenhuma);
        // esta não pode ficar viva num documento cancelado.
        await this.repo.transition(scope, doc.id, { status: autorizado, whenStatusIn: [autorizado], xmlAttachmentId, pdfAttachmentId, sourceDocumentId });
      } catch (e) {
        if (!(e instanceof Error && e.message.startsWith('fiscal_document_status_changed'))) throw e;
        await this.postingService.retireSourceDocument(scope, sourceDocumentId, 'dfe_status_changed');
        logger.warn('dfe_authorized: status mudou antes de gravar anexos — proveniência aposentada', { documentId: doc.id });
      }
    }
  }
}
