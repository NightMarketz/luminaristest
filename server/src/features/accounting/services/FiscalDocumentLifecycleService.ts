import type { FiscalDocument, FiscalDocumentPendingAttachment } from 'generated/prisma';
import { Prisma } from 'generated/prisma';
import { SubstituicaoBloqueadaError } from '../../../lib/errors';
import { foraDaJanela } from '../models/janelaEventos';
import { invariantesSubstituicao } from '../models/substituicaoInvariantes';
import type { DpsManualPayload, DpsPayload, SubstMotivo } from '../dtos/DpsPayloadDto';
import { NfePayloadSchema, NfePayloadSemNumeracaoSchema } from '../dtos/NfePayloadDto';
import type { NfePayload, NfePayloadSemNumeracao } from '../dtos/NfePayloadDto';
import type { ContingenciaTickSummary } from '../dtos/NfceContingenciaDto';
import { gerarCnf, numerarNfe } from '../models/nfeMontagem';
import { emContingencia, suplDoXml } from '../models/nfceContingencia';
import type { IFiscalNumberVoidRepository } from '../repositories/IFiscalNumberVoidRepository';
import { OCCUPYING_VOID_STATUSES } from '../repositories/IFiscalNumberVoidRepository';
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
import { AUTHORIZED_STATUSES, FISCAL_DOCUMENT_KINDS } from '../repositories/IFiscalDocumentRepository';
import type { FiscalDocumentKind, FiscalDocumentStatus, FiscalDocumentWithAttempts, IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { DocumentAttachmentService } from './DocumentAttachmentService';
import type { PostingService } from './PostingService';
import type { FiscalDocumentEmissionService, FiscalDocumentView } from './FiscalDocumentEmissionService';
import { selectDfeEmissor } from '../dfe/selectDfeEmissor';
import { resolveEmissorFor } from '../dfe/resolveEmissor';
import { ambienteFromTpAmb, assertTpAmb, tpAmbFor } from '../dfe/DfeEmissorPort';
import type { CancelInput, CancelResult, DfeAmbiente, DfeCallContext, DfeEmissorPort, EmissaoResult } from '../dfe/DfeEmissorPort';
import { AssinaturaRemotaError, isSessaoPscVencida } from '../dfe/AssinadorRemotoPort';
import { bloqueioSessaoPsc } from './DfeAssinaturaResolver';
import { enviarTentativa, type DfeContingenciaHandler } from './dfeEnvio';
import { DpsManualPayloadSchema, DpsPayloadSchema, toManualDps } from '../dtos/DpsPayloadDto';
import { resolveAccountingScopeInternal } from '../scope/resolveAccountingScopeInternal';
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
  // X10a PR-9 (decisão 7): o job transmite a NFC-e off-line e o retorno da SEFAZ é aplicado daqui.
  CONTINGENCY: ['AUTHORIZED', 'REJECTED', 'PROCESSING'],
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
/**
 * De onde um RESULTADO da porta pode chegar: os pendentes ou — só para o documento que está nela — a NFC-e off-line que o
 * job transmitiu (X10a PR-9). A guarda de quem não está em contingência fica exatamente a de antes.
 */
function guardaDoResultado(doc: FiscalDocument): readonly FiscalDocumentStatus[] {
  return doc.status === 'CONTINGENCY' ? ['CONTINGENCY'] : PENDING_STATUSES;
}
/** Item 26 + decisão 5 de D-2026-10-29-X10A-PR7-9-FORKS: o `reenviar` aceita a rejeitada e a que espera a assinatura. */
const REENVIAVEIS: readonly FiscalDocumentStatus[] = ['REJECTED', 'PENDING_SIGNATURE'];

/**
 * F-ADN-8 a na SEFAZ (D-2026-10-29-X10A-PR7-9-FORKS decisão 2): a consulta pela chave que devolve 217 ("NF-e não consta
 * na base de dados da SEFAZ", `[WS-CSTAT]`) N vezes, cada uma pelo menos um espaço depois da anterior, vira `REJECTED`
 * com `dfe_nao_recebida` — a rejeitada libera o `reenviar` com o MESMO número (MOC 7.0 VG §5.1.6); nunca reenvio
 * automático. N e o espaço são constantes (a recomendação do F-ADN-8 ratificada); o espaço é a cadência do polling.
 */
export const DFE_NAO_RECEBIDA = 'dfe_nao_recebida';
export const NAO_CONSTA_MAX_CONSULTAS = 5;
export const NAO_CONSTA_ESPACO_MS = 120_000;
const NAO_CONSTA_CODES = new Set(['217']);

/** A chave de 44 dígitos do `infNFe/@Id` ("NFe" + chave) do payload da tentativa; `null` na DPS ou sem numeração. */
function chaveDaTentativa(payloadJson: string): string | null {
  try {
    const id = (JSON.parse(payloadJson) as { infNFe?: { Id?: unknown } }).infNFe?.Id;
    return typeof id === 'string' && /^NFe\d{44}$/.test(id) ? id.slice(3) : null;
  } catch {
    return null;
  }
}

function isNaoConsta(result: EmissaoResult): boolean {
  return result.status === 'PROCESSING' && result.errors.some((e) => NAO_CONSTA_CODES.has(e.code));
}

export interface NaoConstaContagem {
  naoConsta: number;
  naoConstaEm: string;
}

/**
 * Conta a consulta "não consta" no `resultJson` da tentativa corrente (`naoConsta`, `naoConstaEm`). Consulta antes do
 * espaço não soma (o operador clicando "consultar" cinco vezes não rejeita a nota). Na N-ésima ⇒ `REJECTED`.
 */
export function naoRecebida(
  resultJsonAnterior: string | null,
  result: EmissaoResult,
  agora: Date,
): { result: EmissaoResult; naoConsta?: NaoConstaContagem } {
  if (!isNaoConsta(result)) return { result };
  let previo: Partial<NaoConstaContagem> = {};
  try {
    previo = resultJsonAnterior ? (JSON.parse(resultJsonAnterior) as Partial<NaoConstaContagem>) : {};
  } catch {
    previo = {}; // resultJson legado/ilegível: a contagem recomeça (nunca rejeita por dado ruim)
  }
  const n = typeof previo.naoConsta === 'number' ? previo.naoConsta : 0;
  const ultima = previo.naoConstaEm ? Date.parse(previo.naoConstaEm) : Number.NaN;
  const espacada = n === 0 || Number.isNaN(ultima) || agora.getTime() - ultima >= NAO_CONSTA_ESPACO_MS;
  const naoConsta: NaoConstaContagem = espacada
    ? { naoConsta: n + 1, naoConstaEm: agora.toISOString() }
    : { naoConsta: n, naoConstaEm: previo.naoConstaEm as string };
  if (naoConsta.naoConsta < NAO_CONSTA_MAX_CONSULTAS) return { result, naoConsta };
  return {
    result: {
      status: 'REJECTED',
      partnerRef: result.partnerRef,
      errors: [
        {
          code: DFE_NAO_RECEBIDA,
          message: `a SEFAZ não achou a nota (217) em ${NAO_CONSTA_MAX_CONSULTAS} consultas espaçadas — reenvie com o mesmo número`,
        },
      ],
    },
    naoConsta,
  };
}

/** BE-INCR-DFE-EVENTOS itens 5 e 11 (F-EVT-1 a): fora da janela configurada — aviso na resposta, nunca bloqueio. */
export const AVISO_FORA_DA_JANELA = 'fora_da_janela_configurada';

/**
 * BE-INCR-NFCE (nó X10a, item 27) — o corpo do cancelamento tem a forma do tipo do documento (`CancelInput`, item 7):
 * NFS-e = e101101 (`cMotivo`/`xMotivo`); NF-e/NFC-e = 110111 (`xJust`). Forma trocada ⇒ 400.
 */
export function cancelInputDoTipo(
  kind: FiscalDocumentKind,
  input: { cMotivo: 1 | 2 | 9; xMotivo: string } | { xJust: string },
): CancelInput {
  if (kind === 'NFSE') {
    if ('cMotivo' in input) return { kind, cMotivo: input.cMotivo, xMotivo: input.xMotivo };
    throw new ValidationError('dfe_cancel_corpo_do_tipo: o cancelamento de NFS-e pede cMotivo e xMotivo (e101101), não xJust.', null);
  }
  if ('xJust' in input) return { kind, xJust: input.xJust };
  throw new ValidationError(`dfe_cancel_corpo_do_tipo: o cancelamento de ${kind} pede xJust (evento 110111), não cMotivo/xMotivo.`, null);
}

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
  /** X10a PR-9 (decisões 6 e 7) — transmissão das NFC-e off-line, prazo e órfãs no mesmo tick. */
  contingencia?: ContingenciaTickSummary;
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
    /** BE-INCR-NFCE (nó X10a, PR-4; EMENDA-3 E3-2 a): o reenvio da NF-e/NFC-e recusa número com pedido de inutilização. */
    private readonly voidRepo: Pick<IFiscalNumberVoidRepository, 'findOverlapping'>,
  ) {}

  private contingencia: DfeContingenciaHandler | null = null;

  /** X10a PR-9 (decisão 4) — liga a contingência off-line ao reenvio (late-bound na factory, como na emissão). */
  setContingenciaHandler(fn: DfeContingenciaHandler | null): void {
    this.contingencia = fn;
  }

  /**
   * F-ADN-5 a (D-2026-10-29-X10A-PR7-9-FORKS decisão 1): o resultado síncrono do envio passa pelo MESMO `applyResult` —
   * a factory liga isto em `FiscalDocumentEmissionService.setResultApplier`.
   */
  aplicarResultadoDoEnvio(scope: AccountingScope, doc: FiscalDocument, result: EmissaoResult): Promise<void> {
    return this.applyResult(scope, doc, result);
  }

  /**
   * X10a PR-7 (E-12) — contexto da chamada ao adaptador que assina pelo PSC: a credencial da unidade do DOCUMENTO (o
   * escopo já é o dele) e o payload da tentativa corrente (o `consultar` remonta o `nfeProc`, E-8). Adaptador sem
   * `assinaturaRemota` ⇒ `undefined` (a chamada segue sem contexto, como antes). `exigir` ⇒ sem assinatura viva é 400
   * (`sessão do PSC`); sem `exigir`, a consulta segue sem assinatura e autoriza pelo protocolo, sem o XML.
   */
  private async ctxDe(scope: AccountingScope, doc: FiscalDocumentWithAttempts, port: DfeEmissorPort, exigir: boolean): Promise<DfeCallContext | undefined> {
    if (!port.capabilities.assinaturaRemota) return undefined;
    const a = await this.emissionService.assinaturaDaUnidade(scope, port);
    if (!a.ok && exigir) throw bloqueioSessaoPsc(a.motivo);
    // X10a PR-8: o CSC da NFC-e acompanha o contexto (o reenvio pode cair no QR Code v2).
    const csc = await this.emissionService.cscDaUnidade(scope, port, doc.kind as FiscalDocumentKind, doc.ambiente as DfeAmbiente);
    return {
      ambiente: doc.ambiente as DfeAmbiente,
      ...(a.ok && a.assinatura ? { assinatura: a.assinatura } : {}),
      payload: JSON.parse(this.currentAttempt(doc).payloadJson) as unknown,
      ...(csc ? { csc } : {}),
    };
  }

  /** Consulta pela porta do documento, com o contexto do PSC quando o adaptador o pede, e aplica o resultado (E-8, F-ADN-8 a). */
  private async consultarEAplicar(scope: AccountingScope, doc: FiscalDocument, port: DfeEmissorPort): Promise<void> {
    const full = port.capabilities.assinaturaRemota ? await this.comTentativas(scope, doc) : null;
    // E-5/E-8: no emissor próprio o partnerRef é a chave montada localmente — o documento ainda SENT (resposta perdida)
    // não a tem gravada, e a consulta pela chave "não depende de resposta anterior": vem do payload da tentativa.
    const ref = doc.partnerRef ?? (full ? chaveDaTentativa(this.currentAttempt(full).payloadJson) : null) ?? attemptRef(doc.id, doc.currentAttemptNo);
    const ctx = full ? await this.ctxDe(scope, full, port, false) : undefined;
    const result = ctx ? await port.consultar(ref, ctx) : await port.consultar(ref);
    if (!isNaoConsta(result)) {
      await this.applyResult(scope, doc, result);
      return;
    }
    const anterior = this.currentAttempt(full ?? (await this.comTentativas(scope, doc))).resultJson;
    const { result: decidido, naoConsta } = naoRecebida(anterior, result, new Date());
    await this.applyResult(scope, doc, decidido, undefined, naoConsta);
  }

  private async comTentativas(scope: AccountingScope, doc: FiscalDocument): Promise<FiscalDocumentWithAttempts> {
    if ('attempts' in doc) return doc as FiscalDocumentWithAttempts;
    const full = await this.repo.findById(scope, doc.id);
    if (!full) throw new Error(`fiscal_document_not_found: ${doc.id}`);
    return full;
  }

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
    await this.consultarEAplicar(scope, doc, port);
    return this.emissionService.getById(scope, documentId);
  }

  /**
   * Job `dfe_poll_pending` (item 27, JOB-005, Prisma-direto) — varre `SENT|PROCESSING` mais
   * velhos que `olderThan`, reconstrói o escopo de cada documento (mesmo padrão de
   * `accountingSyncReconcile.job.ts`: `resolveAccountingScopeInternal({userId: doc.userId}, doc.unitId)`)
   * e aplica o resultado. Erro de código próprio `dfe_*` = skip+log; qualquer outro = alerta.
   */
  async pollPendingOnce(olderThan: Date): Promise<PollSummary> {
    const pending = await this.repo.listPending(olderThan);
    const summary: PollSummary = { total: pending.length, updated: 0, skipped: 0, failed: 0 };
    for (const doc of pending) {
      // Porta desabilitada para o TIPO do documento (BE-INCR-NFCE item 5) — não é erro do documento, só não há o que
      // consultar. Skip silencioso (o `status` endpoint já avisa disso, por tipo).
      if (!selectDfeEmissor(process.env, doc.kind as FiscalDocumentKind).enabled) {
        summary.skipped++;
        continue;
      }
      const scope = resolveAccountingScopeInternal({ userId: doc.userId }, doc.unitId);
      try {
        // BE-INCR-DFE-MANUAL (itens 9 e 10): o adaptador é o do DOCUMENTO; o que não consulta (modo manual) é pulado.
        const port = resolveEmissorFor(doc.partner, doc.kind as FiscalDocumentKind);
        if (!port.capabilities.consultar) {
          summary.skipped++;
          continue;
        }
        await this.consultarEAplicar(scope, doc, port);
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
    if (!REENVIAVEIS.includes(doc.status as FiscalDocumentStatus)) {
      throw new ValidationError(`reenvio_bloqueado: só é possível reenviar um documento REJECTED ou PENDING_SIGNATURE (status atual: ${doc.status}).`, {
        faltantes: [`status atual é ${doc.status}, esperado REJECTED ou PENDING_SIGNATURE`],
      });
    }
    await this.enviarDeNovo(scope, doc);
    return this.emissionService.getById(scope, documentId);
  }

  /**
   * Decisão 5 de D-2026-10-29-X10A-PR7-9-FORKS — o gancho do callback OAuth (`PscCredentialService.setOnAuthorized`):
   * envia as `PENDING_SIGNATURE` da unidade recém-reautorizada, na ordem de criação (quem espera sem número o recebe
   * nessa ordem — nenhum salto). Falha de uma nota não para as outras: ela fica como está e o operador vê na lista.
   */
  async enviarPendentesDaUnidade(scope: AccountingScope): Promise<{ enviadas: number; falhas: number }> {
    const pendentes = (await this.repo.listByStatus(scope, 'PENDING_SIGNATURE')).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let enviadas = 0;
    let falhas = 0;
    for (const p of pendentes) {
      try {
        const doc = await this.repo.findById(scope, p.id);
        if (!doc || doc.status !== 'PENDING_SIGNATURE') continue;
        await this.enviarDeNovo(scope, doc);
        enviadas++;
      } catch (error) {
        falhas++;
        logger.warn('dfe_pending_signature: envio da pendente falhou depois da reautorização — fica para o reenviar', {
          documentId: p.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { enviadas, falhas };
  }

  /**
   * Corpo do reenvio (REJECTED e PENDING_SIGNATURE), sem a policy — quem chama já a checou (rota) ou é o callback OAuth da
   * própria unidade. A nota que esperava a assinatura SEM número consome o número AQUI, na tx do envio (E-13: nada é
   * consumido antes de a nota poder sair).
   */
  private async enviarDeNovo(scope: AccountingScope, doc: FiscalDocumentWithAttempts): Promise<void> {
    const port = this.portFor(doc);
    // BE-INCR-DFE-TPAMB (F-AMB-2 a): a porta do env aponta para o ambiente do env; documento de outro ambiente
    // não sai por ela (uma nota de teste sairia como produção). O operador cancela e emite de novo.
    const envSelection = selectDfeEmissor(process.env, doc.kind as FiscalDocumentKind);
    if (envSelection.port.name === doc.partner && envSelection.ambiente !== doc.ambiente) {
      throw new ValidationError('reenvio_bloqueado: ambiente_divergente', {
        faltantes: [`documento em ${doc.ambiente}, emissão configurada em ${envSelection.ambiente ?? 'nenhum'}`],
      });
    }

    // E-6 (F-PSC-5 a): sem assinatura viva (inclusive token ainda vencido) o reenvio é 400 e o documento não muda.
    const assinatura = port.capabilities.assinaturaRemota ? await this.ctxDe(scope, doc, port, true) : undefined;

    const remontado = doc.kind === 'NFSE' ? await this.reenvioDps(scope, doc, port) : await this.reenvioNfe(scope, doc, port);
    const { cnpjEmitente, partnerAccountRef } = remontado;
    let payload: DpsPayload | DpsManualPayload | NfePayload | NfePayloadSemNumeracao = remontado.payload;
    const numerarAgora = doc.kind !== 'NFSE' && doc.numero == null && !port.capabilities.numbersDps;

    const nextAttemptNo = doc.currentAttemptNo + 1;
    const ref = attemptRef(doc.id, nextAttemptNo);
    let numero: bigint | undefined;
    await raceToConflict(() =>
      this.repo.runTransaction(async (tx) => {
        if (numerarAgora) {
          numero = await this.repo.nextNumber(scope, doc.kind as FiscalDocumentKind, doc.ambiente as DfeAmbiente, doc.serie, tx);
          payload = NfePayloadSchema.parse(numerarNfe(payload as NfePayloadSemNumeracao, Number(numero), gerarCnf(Number(numero))));
        }
        await this.repo.appendAttempt(scope, { documentId: doc.id, attemptNo: nextAttemptNo, payloadJson: JSON.stringify(payload) }, tx);
        await this.repo.transition(
          scope,
          doc.id,
          {
            status: 'SENT',
            currentAttemptNo: nextAttemptNo,
            errorsJson: null,
            ...(numero !== undefined ? { numero } : {}),
            ...(doc.contingenciaSuplJson ? { contingenciaSuplJson: null } : {}), // X10a PR-9: a chave nova invalida o QR off-line
            whenStatusIn: [doc.status as FiscalDocumentStatus], // o callback e a rota podem disputar a mesma pendente
          },
          tx,
        );
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: 'dfe.emitted',
          targetType: 'fiscal_document',
          targetId: doc.id,
          payload: { documentId: doc.id, kind: doc.kind, attemptNo: nextAttemptNo, ref, vServCents: String(doc.vServCents), ambiente: doc.ambiente },
        });
      }),
    );

    // Pós-commit, mesma regra do ciclo SENT original (item 20): falha de rede grava errorsJson, sem tentativa automática
    // n+2; sessão do PSC vencida ⇒ PENDING_SIGNATURE; resultado síncrono aplicado pelo applyResult (F-ADN-5 a).
    await enviarTentativa(
      this.repo,
      (s, d, r) => this.applyResult(s, d, r),
      scope,
      { ...doc, status: 'SENT', currentAttemptNo: nextAttemptNo, numero: numero ?? doc.numero },
      port,
      {
        kind: doc.kind as FiscalDocumentKind,
        ref,
        ambiente: doc.ambiente as DfeAmbiente,
        cnpjEmitente,
        partnerAccountRef,
        payload,
        ...(assinatura ? { ctx: { ...assinatura, payload } } : {}),
      },
      'dfe_reenvio_failed',
      this.contingencia,
    );
  }

  /** Reenvio da NFS-e: DPS remontada com o MESMO nDPS (a numeração não é reconsumida). Extraído do `reenviar` sem mudança. */
  private async reenvioDps(
    scope: AccountingScope,
    doc: FiscalDocumentWithAttempts,
    port: DfeEmissorPort,
  ): Promise<{ payload: DpsPayload | DpsManualPayload; cnpjEmitente: string; partnerAccountRef: string | null }> {
      const reassembled = await this.emissionService.reassembleGroupForReenvio(
        scope,
        doc.saleId,
        doc.kind as FiscalDocumentKind,
        doc.cTribNac,
        doc.ambiente as DfeAmbiente,
        doc.saleKey, // BE-INCR-PACOTE-VALIDADE (L2, dono 03/10): nota de saldo vencido remonta pelo vencimento
      );
      // BE-INCR-DFE-EVENTOS (review B1): a remontagem não conhece o `subst` — a substituta reenviada tem de continuar
      // substituindo a original (chave da original + substMotivo/substReason; E0078 validado pelo DpsSubstSchema abaixo).
      if (doc.substitutesDocumentId) {
        const original = await this.repo.findById(scope, doc.substitutesDocumentId);
        reassembled.payload = {
          ...reassembled.payload,
          infDPS: {
            ...reassembled.payload.infDPS,
            subst: {
              chSubstda: original?.chaveOuCodigo ?? '',
              cMotivo: doc.substMotivo as SubstMotivo,
              ...(doc.substReason ? { xMotivo: doc.substReason } : {}),
            },
          },
        };
      }
      // A numeração NÃO é reconsumida no reenvio — é a MESMA DPS, uma nova tentativa de envio dela.
      const payload = port.capabilities.numbersDps
        ? DpsManualPayloadSchema.parse(toManualDps(reassembled.payload)) // F-MAN-4 a: o portal numera
        : DpsPayloadSchema.parse(
            doc.numero != null
              ? { ...reassembled.payload, infDPS: { ...reassembled.payload.infDPS, nDPS: Number(doc.numero) } }
              : reassembled.payload,
          );

      assertTpAmb(payload, doc.ambiente as DfeAmbiente);
    return { payload, cnpjEmitente: reassembled.cnpjEmitente, partnerAccountRef: reassembled.partnerAccountRef };
  }

  /**
   * BE-INCR-NFCE (nó X10a, PR-4; EMENDA-3 F-NFCE-E3-2 a) — reenvio da NF-e/NFC-e rejeitada com o número AMARRADO ao
   * documento: mesma série e mesmo nNF (a rejeitada é descartada e "pode ser corrigida e novamente transmitida", MOC VG
   * §5.1.6). O cNF é sorteado de novo e a chave recalculada com o `dhEmi` do reenvio (dono, 26/10: "Sortear novo"). Número
   * com pedido de inutilização REQUESTED/HOMOLOGATED ⇒ 409 `DFE_NUMERO_INUTILIZADO` (dono, 26/10: depois de inutilizar o
   * número de uma rejeitada, o reenvio dela é recusado).
   */
  private async reenvioNfe(
    scope: AccountingScope,
    doc: FiscalDocumentWithAttempts,
    port: DfeEmissorPort,
  ): Promise<{ payload: NfePayload | NfePayloadSemNumeracao; cnpjEmitente: string; partnerAccountRef: string | null }> {
    const kind = doc.kind as 'NFE' | 'NFCE';
    const ambiente = doc.ambiente as DfeAmbiente;
    if (doc.numero != null) {
      const faixa = { kind, ambiente, serie: doc.serie, nIni: doc.numero, nFin: doc.numero };
      const inutilizacoes = await this.voidRepo.findOverlapping(scope, faixa, OCCUPYING_VOID_STATUSES);
      if (inutilizacoes.length > 0) {
        throw new ConflictError(
          `reenvio_bloqueado: o número ${doc.numero} da série ${doc.serie} tem pedido de inutilização (${inutilizacoes[0].status}).`,
          'DFE_NUMERO_INUTILIZADO',
        );
      }
    }
    const reassembled = await this.emissionService.reassembleNfeForReenvio(scope, doc.saleId, kind, ambiente);
    const { infNFe } = reassembled.payload;
    let semNumero: NfePayloadSemNumeracao = { ...reassembled.payload, infNFe: { ...infNFe, ide: { ...infNFe.ide, serie: doc.serie } } };
    // X10a PR-9 (decisão 10): a NFC-e de contingência rejeitada volta com o mesmo número e série e cNF novo, e continua de
    // contingência — tpEmis=9, dhCont/xJust e o dhEmi da emissão off-line (Anexo IV p. 11: "gerar novamente o arquivo com
    // a mesma numeração e série"). Manter o dhEmi segura o 110112 da órfã (5P31-20 rej. 914: substituta > 2 h da original).
    const corrente = doc.attempts.find((a) => a.attemptNo === doc.currentAttemptNo);
    const anterior = corrente ? (JSON.parse(corrente.payloadJson) as { infNFe?: { ide?: Record<string, unknown> } }).infNFe?.ide : undefined;
    if (anterior?.tpEmis === 9 && typeof anterior.dhEmi === 'string' && typeof anterior.dhCont === 'string' && typeof anterior.xJust === 'string') {
      semNumero = emContingencia(semNumero, { dhEmi: anterior.dhEmi, dhCont: anterior.dhCont, xJust: anterior.xJust });
    }
    const payload =
      !port.capabilities.numbersDps && doc.numero != null
        ? NfePayloadSchema.parse(numerarNfe(semNumero, Number(doc.numero), gerarCnf(Number(doc.numero))))
        : NfePayloadSemNumeracaoSchema.parse(semNumero);
    if (payload.infNFe.ide.tpAmb !== tpAmbFor(ambiente)) {
      throw new Error(`dfe_tpamb_invariant: NF-e com tpAmb=${payload.infNFe.ide.tpAmb} num documento de ${ambiente}.`);
    }
    return { payload, cnpjEmitente: reassembled.cnpjEmitente, partnerAccountRef: reassembled.partnerAccountRef };
  }

  /**
   * POST /api/nfe/dfe/documents/:id/cancelar (item 29) — só de `AUTHORIZED`. Nunca toca a venda
   * nem o razão (ADR §7 item 5) — só o documento fiscal e, se autorizado em produção, a
   * proveniência que ele havia anexado (F-DFE-18, soft-delete, sem apagar lançamento nenhum).
   *
   * BE-INCR-NFCE (nó X10a, item 27): a NF-e/NFC-e cancela pelo 110111 com `xJust`; a NFS-e segue com `cMotivo`/`xMotivo`.
   * O corpo da outra forma é 400 (`dfe_cancel_corpo_do_tipo`) — parâmetro aceito e ignorado é bug.
   */
  async cancelar(
    scope: AccountingScope,
    documentId: string,
    input: { cMotivo: 1 | 2 | 9; xMotivo: string } | { xJust: string },
  ): Promise<FiscalDocumentView & { avisos: string[] }> {
    if (!this.policy.canCancelFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para cancelar documento fiscal.');
    }
    const doc = await this.repo.findById(scope, documentId);
    if (!doc) throw new ValidationError(`Documento fiscal '${documentId}' não encontrado.`, null);
    const cancelInput = cancelInputDoTipo(doc.kind as FiscalDocumentKind, input);
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

    // BE-INCR-DFE-EVENTOS item 5 (F-EVT-1 a): fora da janela CONFIGURADA a operação segue para a porta e só avisa —
    // quem recusa é o fisco (E0822 → OUT_OF_WINDOW, item 6). O prazo é parâmetro do município (Anexo II RN E0822 [28]).
    const { janela } = await this.emissionService.getById(scope, documentId);
    // BE-INCR-NFCE item 27 (F-NFCE-10 a): a mesma política na NF-e/NFC-e, com a janela do ramo 55/65 (24 h / 30 min).
    const avisos = foraDaJanela(janela.cancelarAte, new Date()) ? [AVISO_FORA_DA_JANELA] : [];

    const partnerRef = doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo);
    // E-6 / E-7: o 110111 é assinado pelo PSC — sem assinatura viva é 400 antes de qualquer chamada ao fisco.
    const ctx = await this.ctxDe(scope, doc, port, true);
    let result: CancelResult;
    try {
      result = ctx ? await port.cancelar(partnerRef, cancelInput, ctx) : await port.cancelar(partnerRef, cancelInput);
    } catch (error) {
      if (isSessaoPscVencida(error)) throw bloqueioSessaoPsc((error as AssinaturaRemotaError).code as 'CREDENCIAL_EXPIRADA' | 'CREDENCIAL_REVOGADA');
      throw error;
    }

    if (result.status === 'OUT_OF_WINDOW') {
      throw new ConflictError(
        cancelInput.kind === 'NFSE'
          ? 'prazo do município (E0822): fora da janela de cancelamento.'
          : 'prazo de cancelamento (501): o fisco recusou o cancelamento fora do prazo.',
        'DFE_CANCEL_OUT_OF_WINDOW',
      );
    }
    if (result.status === 'REJECTED') {
      // item 6: o código do fisco (E0823/E0824/E0827/E0840…) vai na mensagem, não só o texto.
      const detail = result.errors.map((e) => `${e.code}: ${e.message}`).join('; ') || 'sem detalhe do parceiro';
      throw new ConflictError(`Cancelamento rejeitado pelo parceiro: ${detail}`, 'DFE_CANCEL_REJECTED');
    }
    if (result.status === 'PROCESSING') {
      // Não citado explicitamente no item 29 (só CANCELLED/OUT_OF_WINDOW/REJECTED) — inalcançável
      // com Null (sempre CANCELLED) e File (sempre REJECTED); tratado como "ainda não decidido".
      throw new ConflictError('Cancelamento ainda em processamento no parceiro — consulte novamente mais tarde.', 'DFE_CANCEL_PROCESSING');
    }

    // CANCELLED
    await raceToConflict(() =>
      cancelInput.kind === 'NFSE'
        ? this.markCancelled(scope, doc, cancelInput.cMotivo, cancelInput.xMotivo)
        : this.markCancelled(scope, doc, null, cancelInput.xJust),
    );
    return { ...(await this.emissionService.getById(scope, documentId)), avisos };
  }

  /**
   * Ramo CANCELLED (item 29), compartilhado com o cancelamento manual (BE-INCR-DFE-MANUAL item 13). Status re-checado
   * DENTRO da escrita (`whenStatusIn`). Nunca toca venda nem razão; só aposenta a proveniência.
   * `cancelledAt`: no manual, o `dhProc` do evento (BE-INCR-DFE-EVENTOS item 7); por máquina, o instante do registro.
   * NF-e/NFC-e (BE-INCR-NFCE item 27): `cMotivo` null — o 110111 não tem código de motivo, só o `xJust` (em `cancelReason`).
   */
  private async markCancelled(
    scope: AccountingScope,
    doc: FiscalDocument,
    cMotivo: 1 | 2 | 9 | null,
    xMotivo: string,
    cancelledAt: Date = new Date(),
  ): Promise<void> {
    await this.repo.runTransaction(async (tx) => {
      await this.repo.transition(scope, doc.id, {
        status: 'CANCELLED',
        cancelledAt,
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
        payload: cMotivo == null ? { documentId: doc.id } : { documentId: doc.id, cMotivo: String(cMotivo) },
      });
    });

    if (doc.sourceDocumentId) {
      await this.postingService.retireSourceDocument(scope, doc.sourceDocumentId, `dfe_cancelled:${cMotivo ?? '110111'}`);
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
    // BE-INCR-NFCE item 5: a seleção é por tipo — vale a do primeiro tipo cujo adaptador habilitado é este parceiro.
    const selection = FISCAL_DOCUMENT_KINDS.map((kind) => selectDfeEmissor(process.env, kind)).find(
      (sel) => sel.enabled && sel.port.name === partner,
    );
    if (!selection || !selection.port.capabilities.webhook) {
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
    const scope = resolveAccountingScopeInternal({ userId: doc.userId }, doc.unitId);
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
    // BE-INCR-DFE-EVENTOS item 13 (fecha L9): (i) o documento substituto exige a nota que substitui a original pedida,
    // pelo motivo pedido (Anexo I [114]/[115]); (ii) o documento comum exige `subst` AUSENTE.
    if (doc.substitutesDocumentId) {
      const original = await this.repo.findById(scope, doc.substitutesDocumentId);
      const subst = nota.dps.subst;
      if (!subst || !original?.chaveOuCodigo || subst.chSubstda !== original.chaveOuCodigo) {
        identidade.push('subst: a nota não substitui a original deste pedido (chSubstda ≠ chave da original)');
      } else if (subst.cMotivo !== doc.substMotivo) {
        identidade.push(`subst: cMotivo da nota (${subst.cMotivo}) ≠ o pedido (${doc.substMotivo ?? 'ausente'})`);
      }
    } else if (nota.dps.subst) {
      identidade.push('subst: a nota do portal substituiu outra — use a substituição');
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
        dhProc: nota.dhProc, // BE-INCR-DFE-EVENTOS item 1: o instante fiscal, não o do upload
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
    // BE-INCR-DFE-EVENTOS item 7: `cancelledAt` = o instante do fisco (infEvento/dhProc), não a hora do upload.
    await raceToConflict(() => this.markCancelled(scope, doc, evento.cMotivo, evento.xMotivo, new Date(evento.dhProc)));

    // Item 7: a prova (XML do e101101) vira anexo DEPOIS da tx do CANCELLED — mesma ordem "transição antes, anexo
    // depois" do GAP-MAP `applyResult` (28/09). Só em produção (ADR §9.2 item 5). Falha aqui deixa o documento
    // CANCELLED sem anexo (log), nunca desfaz o cancelamento.
    if (doc.ambiente === 'producao') {
      try {
        const att = await this.documentAttachmentService.upload(scope, {
          targetType: 'FISCAL_DOCUMENT',
          targetId: doc.id,
          fileName: `${doc.id}.evento-101101.xml`,
          mimeType: 'application/xml',
          buffer: eventoXml,
        });
        await this.repo.transition(scope, doc.id, { status: 'CANCELLED', whenStatusIn: ['CANCELLED'], cancelEventAttachmentId: att.id });
      } catch (error) {
        logger.warn('dfe_cancelamento_manual: anexo do XML do evento falhou — documento CANCELLED sem a prova anexada', {
          documentId: doc.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return this.emissionService.getById(scope, documentId);
  }

  /**
   * POST …/documents/:id/substituir (BE-INCR-DFE-EVENTOS, nó X11, item 11). Substituir = emitir uma DPS NOVA com o grupo
   * `infDPS/subst` apontando a chave da original (Guia do Emissor Web v1.2 §5.2; Anexo II [27]–[29]); o `e105102` é
   * gerado pelo sistema quando a substituta é autorizada — o emitente não o envia (Anexo II [3]).
   *
   * Guardas, TODAS antes de qualquer escrita, cada uma com a RN que espelha:
   * - NF-e não tem substituição neste sentido (BRIEF §7) e o adaptador tem de declarar `substituir` (item 16) → 409
   *   `DFE_SUBST_NAO_SUPORTADA`;
   * - status ∈ AUTHORIZED | AUTHORIZED_DIVERGENT (E0046, Anexo I [172]: cancelada não substitui) → 409 `DFE_STATUS_INVALIDO`;
   * - um substituto por original (o rejeitado sai por `reenviar`) → 409 `DFE_SUBSTITUICAO_EXISTENTE`;
   * - agora ≤ `substituirTeto` (Anexo I [114], 2 anos) → 409 `DFE_SUBST_FORA_DO_TETO`;
   * - fora de `substituirAte` e `cMotivo ∉ {01, 02}` (E0050 [173], exceção do Simples) → só aviso (F-EVT-1 a);
   * - E0068 (análise fiscal pendente, [179]) — coberto pela guarda de status: o status `CANCEL_ANALYSIS` só nasce no
   *   PR-3 (F-EVT-4 b);
   * - invariantes nível 2 (E0060/E0061, item 12) → 422 `SUBSTITUICAO_BLOQUEADA`.
   * Policy: `canEmitFiscalDocument` E `canCancelFiscalDocument` (emite uma nota e cancela outra).
   */
  async substituir(
    scope: AccountingScope,
    documentId: string,
    input: { cMotivo: SubstMotivo; xMotivo?: string },
  ): Promise<FiscalDocumentView & { avisos: string[] }> {
    if (!this.policy.canEmitFiscalDocument(scope) || !this.policy.canCancelFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para substituir documento fiscal (emitir e cancelar).');
    }
    const doc = await this.repo.findById(scope, documentId);
    if (!doc) throw new ValidationError(`Documento fiscal '${documentId}' não encontrado.`, null);
    const selection = selectDfeEmissor(process.env, 'NFSE');
    if (doc.kind !== 'NFSE' || !selection.port.capabilities.substituir) {
      throw new ConflictError(
        `dfe_subst_nao_suportada: ${doc.kind !== 'NFSE' ? 'só NFS-e tem substituição (BRIEF §7)' : `o adaptador '${selection.port.name}' não substitui`}.`,
        'DFE_SUBST_NAO_SUPORTADA',
      );
    }
    if (!AUTHORIZED_STATUSES.includes(doc.status as FiscalDocumentStatus)) {
      throw new ConflictError(
        `dfe_status_invalido: só documento autorizado é substituído (E0046 — status atual ${doc.status}).`,
        'DFE_STATUS_INVALIDO',
      );
    }
    if (await this.repo.findSubstituteOf(scope, doc.id)) {
      throw new ConflictError('dfe_substituicao_existente: esta nota já tem um documento substituto.', 'DFE_SUBSTITUICAO_EXISTENTE');
    }
    // LACUNA DE SPEC (registrada no retorno dfe-eventos-pr1): o item 14 diz "substituta assume saleKey = saleId"; a nota
    // de saldo VENCIDO tem saleKey = chave do movimento (BE-INCR-PACOTE-VALIDADE) e o re-drive procura por ela. A spec não
    // cobre o caso — recusa sem escrita até o dono decidir.
    if (doc.saleKey !== doc.saleId) {
      throw new ConflictError(
        'dfe_subst_nao_suportada: substituição de NFS-e de saldo de pacote vencido não está coberta pela spec (lacuna registrada).',
        'DFE_SUBST_NAO_SUPORTADA',
      );
    }
    // LACUNA DE SPEC (registrada): a substituta sai pela porta do env; a spec não diz o que fazer quando o ambiente do
    // env difere do da original (E0065 é do fisco). Recusa sem escrita, como o reenvio (F-AMB-2 a).
    if (selection.ambiente !== doc.ambiente) {
      throw new ValidationError('substituicao_bloqueada: ambiente_divergente', {
        faltantes: [`documento em ${doc.ambiente}, emissão configurada em ${selection.ambiente ?? 'nenhum'}`],
      });
    }

    const { janela } = await this.emissionService.getById(scope, documentId);
    const agora = new Date();
    if (foraDaJanela(janela.substituirTeto, agora)) {
      throw new ConflictError(
        `dfe_subst_fora_do_teto: o prazo máximo de substituição é 2 anos (Anexo I [114]) — teto ${janela.substituirTeto}.`,
        'DFE_SUBST_FORA_DO_TETO',
      );
    }
    const avisos = foraDaJanela(janela.substituirAte, agora) && input.cMotivo !== '01' && input.cMotivo !== '02' ? [AVISO_FORA_DA_JANELA] : [];

    // Mesmo caminho do reenvio: venda + perfil ATUAIS (item 11).
    const reassembled = await this.emissionService.reassembleGroupForReenvio(
      scope,
      doc.saleId,
      doc.kind as FiscalDocumentKind,
      doc.cTribNac,
      doc.ambiente as DfeAmbiente,
      doc.saleKey,
    );
    const faltantes = invariantesSubstituicao(JSON.parse(this.currentAttempt(doc).payloadJson), reassembled.payload);
    if (faltantes.length) throw new SubstituicaoBloqueadaError(faltantes);

    const payload: DpsPayload = {
      ...reassembled.payload,
      infDPS: {
        ...reassembled.payload.infDPS,
        subst: { chSubstda: doc.chaveOuCodigo ?? '', cMotivo: input.cMotivo, ...(input.xMotivo ? { xMotivo: input.xMotivo } : {}) },
      },
    };
    let created: FiscalDocumentWithAttempts;
    try {
      created = await this.emissionService.createSubstitute(scope, doc, {
        payload,
        vServCents: reassembled.vServCents,
        cnpjEmitente: reassembled.cnpjEmitente,
        partnerAccountRef: reassembled.partnerAccountRef,
        subst: { cMotivo: input.cMotivo, xMotivo: input.xMotivo ?? null },
      });
    } catch (e) {
      // Corrida de dois pedidos: o @@unique da saleKey temporária `subst:<id>:<saleId>` fecha (F-EVT-3 a).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictError('dfe_substituicao_existente: esta nota já tem um documento substituto.', 'DFE_SUBSTITUICAO_EXISTENTE');
      }
      throw e;
    }
    return { ...(await this.emissionService.getById(scope, created.id)), avisos };
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
    const kind = doc.kind as FiscalDocumentKind;
    const selection = selectDfeEmissor(process.env, kind);
    if (!selection.enabled) {
      throw new ValidationError(`dfe_disabled: ${selection.reason}`, { faltantes: [selection.reason ?? 'porta desabilitada'] });
    }
    return resolveEmissorFor(doc.partner, kind);
  }

  /**
   * Mesma regra do `reenviar` (F-AMB-2 a), para consultar/cancelar: a porta do env fala com o host/token do ambiente
   * do env (Focus: um host e um token por ambiente — `token_producao`/`token_homologacao`), então documento de outro
   * ambiente não passa por ela.
   */
  private assertAmbienteDoDocumento(doc: FiscalDocument): void {
    const selection = selectDfeEmissor(process.env, doc.kind as FiscalDocumentKind);
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
    /** F-ADN-8 a — contagem das consultas "não consta", guardada na tentativa corrente. */
    naoConsta?: NaoConstaContagem,
  ): Promise<void> {
    if (!isValidResultTransition(doc.status as FiscalDocumentStatus, result.status)) {
      throw new Error(`invalid_transition: ${doc.status} -> ${result.status}`);
    }
    const attemptResult = {
      attemptNo: doc.currentAttemptNo,
      resultStatus: result.status,
      resultJson: JSON.stringify({ errors: result.errors, valores: result.valores, ...(manual?.releitura ?? {}), ...(naoConsta ?? {}) }),
    };

    if (result.status === 'PROCESSING') {
      await this.repo.transition(scope, doc.id, { status: 'PROCESSING', attemptResult, whenStatusIn: guardaDoResultado(doc) });
      return;
    }

    if (result.status === 'REJECTED') {
      await this.repo.runTransaction(async (tx) => {
        await this.repo.transition(
          scope,
          doc.id,
          { status: 'REJECTED', errorsJson: JSON.stringify(result.errors), attemptResult, whenStatusIn: guardaDoResultado(doc) },
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
    const suplAutorizado = doc.kind === 'NFCE' && result.xml ? suplDoXml(result.xml.toString('utf8')) : null;
    const chaveOuCodigo = result.chaveOuCodigo;
    const nfseDhProc = result.dhProc ? new Date(result.dhProc) : null;
    let originalSourceARetirar = null as string | null; // atribuída dentro da tx (o `as` evita o estreitamento para null)
    const pending = await this.repo.runTransaction(async (tx) => {
      if (manual?.insideTx) await manual.insideTx(tx);
      // BE-INCR-DFE-EVENTOS item 14 (F-EVT-3 a, F-EVT-6 a): a substituta autorizada cancela a original NA MESMA tx (o
      // fisco gerou o e105102 — Anexo II [3], Guia §5.2). Status da original lido DENTRO da tx (gate autoritativo).
      // Ordem: a original libera a saleKey ANTES de a substituta assumir o saleId (@@unique).
      if (doc.substitutesDocumentId) {
        const original = await this.repo.findById(scope, doc.substitutesDocumentId, tx);
        if (!original) throw new Error(`fiscal_document_not_found: ${doc.substitutesDocumentId}`);
        if (AUTHORIZED_STATUSES.includes(original.status as FiscalDocumentStatus)) {
          await this.repo.transition(
            scope,
            original.id,
            {
              status: 'CANCELLED',
              cancelledAt: nfseDhProc ?? new Date(),
              saleKey: `cancelled:${original.id}:${original.saleId}`,
              substitutedByDocumentId: doc.id,
              whenStatusIn: AUTHORIZED_STATUSES,
            },
            tx,
          );
          originalSourceARetirar = original.sourceDocumentId;
        } else {
          // F-EVT-6 (a): o fato do fisco vence — a original fica como está, só ganha o vínculo; a view acusa
          // `substituicao_sobre_cancelada`.
          await this.repo.transition(
            scope,
            original.id,
            { status: original.status as FiscalDocumentStatus, substitutedByDocumentId: doc.id, whenStatusIn: [original.status as FiscalDocumentStatus] },
            tx,
          );
        }
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: 'dfe.substituted',
          targetType: 'fiscal_document',
          targetId: original.id,
          payload: { documentId: original.id, substituteDocumentId: doc.id, cMotivo: doc.substMotivo ?? '' },
        });
      }
      await this.repo.transition(
        scope,
        doc.id,
        {
          status: divergente ? 'AUTHORIZED_DIVERGENT' : 'AUTHORIZED',
          ...(manual?.serie !== undefined ? { serie: manual.serie } : {}),
          // X10a PR-9 (revisão A): na NFC-e de contingência o DANFE passa a mostrar o QR do XML autorizado — o v2 do recuo
          // na 407 ou a chave nova do reenvio da rejeitada —, não o montado na emissão off-line.
          ...(suplAutorizado ? { contingenciaSuplJson: JSON.stringify(suplAutorizado) } : {}),
          whenStatusIn: guardaDoResultado(doc),
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
          nfseDhProc, // BE-INCR-DFE-EVENTOS item 1
          ...(doc.substitutesDocumentId ? { saleKey: doc.saleId } : {}), // item 14 (F-EVT-3 a)
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

    // BE-INCR-DFE-EVENTOS item 14: depois da tx, aposenta a proveniência da original cancelada pela substituição (a da
    // substituta segue o caminho já existente abaixo). Falha não propaga — a substituição está commitada.
    if (originalSourceARetirar) {
      try {
        await this.postingService.retireSourceDocument(scope, originalSourceARetirar, `dfe_substituted:${doc.substMotivo ?? ''}`);
      } catch (error) {
        logger.error('dfe_substituted: falha ao aposentar a proveniência da original — ação manual', {
          documentId: doc.substitutesDocumentId,
          sourceDocumentId: originalSourceARetirar,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

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
    const scope = resolveAccountingScopeInternal({ userId: pending.userId }, pending.unitId);
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
   * documentos são reconsultados em todo tick. Dono 2026-10-13: o tick percorre TODOS os candidatos, página a página —
   * os pulados não escondem os demais.
   */
  private async backfillPendingAttachments(limit: number): Promise<void> {
    let cursor: string | null = null;
    do {
      const page = await this.repo.listAttachmentBackfillCandidates(limit, cursor);
      cursor = page.nextCursor;
      for (const doc of page.candidates) {
        try {
          const selection = selectDfeEmissor(process.env, doc.kind as FiscalDocumentKind);
          if (!selection.enabled) {
            logger.warn('dfe_pending_attachment_backfill: skip — porta desabilitada', { documentId: doc.id });
            continue;
          }
          const port = resolveEmissorFor(doc.partner, doc.kind as FiscalDocumentKind);
          if (!port.capabilities.consultar) {
            logger.warn('dfe_pending_attachment_backfill: skip — modo manual, sem de onde tirar o XML', { documentId: doc.id });
            continue;
          }
          if (selection.port.name === doc.partner && selection.ambiente !== doc.ambiente) {
            // F-AMB-2 a: a porta do env fala com o ambiente do env.
            logger.warn('dfe_pending_attachment_backfill: skip — ambiente divergente', { documentId: doc.id });
            continue;
          }
          const scope = resolveAccountingScopeInternal({ userId: doc.userId }, doc.unitId);
          // X10a PR-7 (E-8): na NF-e o XML só existe remontando a nota assinada — o contexto vem da unidade do documento.
          const ctx = port.capabilities.assinaturaRemota ? await this.ctxDe(scope, await this.comTentativas(scope, doc), port, false) : undefined;
          const partnerRef = doc.partnerRef ?? attemptRef(doc.id, doc.currentAttemptNo);
          const result = ctx ? await port.consultar(partnerRef, ctx) : await port.consultar(partnerRef);
          if (!result.xml) {
            logger.warn('dfe_pending_attachment_backfill: skip — retorno sem XML', { documentId: doc.id });
            continue;
          }
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
    } while (cursor);
  }
}
