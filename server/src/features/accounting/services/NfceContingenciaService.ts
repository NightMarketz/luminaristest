import type { FiscalDocument, NfceContingencia, NfceContingenciaOrfa, Prisma } from 'generated/prisma';
import { AppError, ForbiddenError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { NfePayloadSchema, type NfePayload, type NfePayloadSemNumeracao } from '../dtos/NfePayloadDto';
import {
  ContingenciaTickSummarySchema,
  NfceContingenciaViewSchema,
  type ContingenciaTickSummary,
  type NfceContingenciaView,
  type PutNfceContingenciaInput,
} from '../dtos/NfceContingenciaDto';
import {
  XJUST_CANCEL_SUBST,
  XJUST_ENTRADA_AUTOMATICA,
  XJUST_INUT_ORFA,
  alertaDePrazo,
  emContingencia,
  prazoTransmissao,
  semNumeracao,
} from '../models/nfceContingencia';
import { dhEmiNoFuso, gerarCnf, numerarNfe } from '../models/nfeMontagem';
import { attemptRef } from '../repositories/FiscalDocumentRepository';
import { AUTHORIZED_STATUSES } from '../repositories/IFiscalDocumentRepository';
import type { FiscalDocumentKind, FiscalDocumentStatus, FiscalDocumentWithAttempts, IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { INfceContingenciaRepository, OrigemContingencia } from '../repositories/INfceContingenciaRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AssinaturaDaUnidade } from './DfeAssinaturaResolver';
import type { FiscalNumberVoidService } from './FiscalNumberVoidService';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { DfeResultApplier } from './dfeEnvio';
import { isFalhaDeComunicacao, type DfeAmbiente, type DfeCallContext, type DfeEmissorPort, type EmitirInput, type NfceSupl } from '../dfe/DfeEmissorPort';
import { resolveEmissorFor } from '../dfe/resolveEmissor';
import { selectDfeEmissor } from '../dfe/selectDfeEmissor';
import { resolveAccountingScopeInternal } from '../scope/resolveAccountingScopeInternal';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';

export const DFE_CONTINGENCY_ENTERED = 'dfe.contingency_entered';
export const DFE_CONTINGENCY_LEFT = 'dfe.contingency_left';

const AMBIENTES: readonly DfeAmbiente[] = ['homologacao', 'producao'];
const TICK_LIMIT = 50;
const ALERTA_LIMIT = 200;

type Tx = Prisma.TransactionClient;

/**
 * NfceContingenciaService — contingência off-line da NFC-e (X10a PR-9; BE-INCR-NFCE-EMENDA-1 E-9, F-NFCE-E1-5 b ratificado
 * em 13/10 com a L-NFCE-2: Port. SRE 40/2024 art. 6º + Aj. SINIEF 19/16 cl. 11ª). Respostas do dono em
 * D-2026-10-29-X10A-PR7-9-FORKS: decisões 4 (gatilho automático + manual), 6 (nota normal órfã), 7 (job transmite + alerta),
 * 8 (saída), 9 (alerta faltando 4 h) e 10 (reenvio da rejeitada). FIRST-CLASS PRISMA (documento fiscal, §2.1).
 *
 * - Estado por (unidade, ambiente): `definir` é a rota do operador (MANUAL); `aoFalharComunicacao` é a entrada AUTO. A
 *   saída AUTO só derruba a entrada AUTO (decisão 8). `dfe.contingency_entered/left` na tx da mudança (EMENDA-1 item 26).
 * - Com a unidade em contingência, a venda nova nasce `CONTINGENCY` (`paraContingencia`) sem tentar a SEFAZ.
 * - A falha de COMUNICAÇÃO no envio de uma NFC-e normal (nunca a rejeição) re-emite a venda off-line com número novo e
 *   guarda a nota normal como órfã (Anexo IV pp. 8 e 11).
 * - `tick` (no `dfe_poll_pending`): transmite as `CONTINGENCY` enquanto a SEFAZ responder (resultado pelo `applyResult`),
 *   alerta as que estão perto do prazo ou vencidas e resolve as órfãs (consulta ⇒ 110112 ou inutilização).
 */
export class NfceContingenciaService {
  private applier: DfeResultApplier | null = null;

  constructor(
    private readonly repo: INfceContingenciaRepository,
    private readonly docRepo: IFiscalDocumentRepository,
    /** A `FiscalDocumentEmissionService` (assinatura e CSC da unidade) — estrutural, para não fechar ciclo de import. */
    private readonly emission: {
      assinaturaDaUnidade(scope: AccountingScope, port: DfeEmissorPort): Promise<AssinaturaDaUnidade>;
      cscDaUnidade(scope: AccountingScope, port: DfeEmissorPort, kind: FiscalDocumentKind, ambiente: DfeAmbiente): Promise<{ id: string; csc: string } | undefined>;
    },
    private readonly voidService: Pick<FiscalNumberVoidService, 'inutilizarOrfa'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Liga o `applyResult` do ciclo (late-bound na factory, como o da emissão). */
  setResultApplier(fn: DfeResultApplier): void {
    this.applier = fn;
  }

  // ---- Rota do operador ----

  /** GET /api/accounting/nfce-contingencia/:unitId — o estado nos dois ambientes (sem linha ⇒ desligada). */
  async listar(scope: AccountingScope): Promise<NfceContingenciaView[]> {
    if (!this.policy.canReadFiscalDocument(scope)) throw new ForbiddenError('Você não tem permissão para ler documentos fiscais.');
    const views: NfceContingenciaView[] = [];
    for (const ambiente of AMBIENTES) views.push(this.toView(scope, ambiente, await this.repo.findEstado(scope, ambiente)));
    return views;
  }

  /**
   * PUT /api/accounting/nfce-contingencia/:unitId — o operador liga (com o xJust) ou desliga (decisão 4). Ligar por cima de
   * uma entrada AUTO a torna MANUAL (deixa de sair sozinha) e mantém o `dhCont` da entrada.
   */
  async definir(scope: AccountingScope, input: PutNfceContingenciaInput): Promise<NfceContingenciaView> {
    if (!this.policy.canEmitFiscalDocument(scope)) throw new ForbiddenError('Você não tem permissão para emitir documento fiscal.');
    const row = await this.repo.runTransaction(async (tx) => {
      const atual = await this.repo.findEstado(scope, input.ambiente, tx);
      if (input.ativa) {
        const dhCont = atual?.ativa && atual.dhCont ? atual.dhCont : this.now();
        return this.ligar(scope, input.ambiente, 'MANUAL', dhCont, input.xJust as string, tx);
      }
      if (await this.repo.desligar(scope, input.ambiente, undefined, tx)) {
        await this.auditar(tx, scope, DFE_CONTINGENCY_LEFT, { ambiente: input.ambiente, origem: 'MANUAL' });
      }
      return this.repo.findEstado(scope, input.ambiente, tx);
    });
    return this.toView(scope, input.ambiente, row);
  }

  // ---- Emissão ----

  /** A unidade está em contingência no ambiente? ⇒ a NFC-e nova sai off-line direto (decisão 8). */
  async estadoAtivo(scope: AccountingScope, ambiente: DfeAmbiente, tx?: Tx): Promise<NfceContingencia | null> {
    const row = await this.repo.findEstado(scope, ambiente, tx);
    return row?.ativa && row.dhCont && row.xJust ? row : null;
  }

  /** A NFC-e da venda nova em contingência (tpEmis=9, dhCont/xJust da entrada vigente, dhEmi = agora). */
  paraContingencia(scope: AccountingScope, estado: NfceContingencia, semNumero: NfePayloadSemNumeracao): NfePayloadSemNumeracao {
    return emContingencia(semNumero, {
      dhEmi: dhEmiNoFuso(this.now(), scope.timeZone),
      dhCont: dhEmiNoFuso(estado.dhCont as Date, scope.timeZone),
      xJust: estado.xJust as string,
    });
  }

  /**
   * Decisão 4 — a NFC-e normal não chegou à SEFAZ por falha de comunicação (`DfeTransporteError`): na mesma tx, a unidade
   * entra em contingência AUTO (se não estava), a venda ganha a tentativa n+1 off-line com NÚMERO NOVO (Anexo IV p. 8) e
   * `CONTINGENCY`, e a nota normal vira órfã (decisão 6). Pós-commit: o `infNFeSupl` do DANFE (`gerarSupl`).
   */
  async aoFalharComunicacao(scope: AccountingScope, doc: FiscalDocument, port: DfeEmissorPort, input: EmitirInput): Promise<void> {
    const normal = NfePayloadSchema.parse(input.payload);
    const ambiente = doc.ambiente as DfeAmbiente;
    const nextAttemptNo = doc.currentAttemptNo + 1;
    const offline = await this.docRepo.runTransaction(async (tx) => {
      let estado = await this.estadoAtivo(scope, ambiente, tx);
      if (!estado) estado = await this.ligar(scope, ambiente, 'AUTO', this.now(), XJUST_ENTRADA_AUTOMATICA, tx);
      const numero = await this.docRepo.nextNumber(scope, doc.kind as FiscalDocumentKind, ambiente, doc.serie, tx);
      const payload = NfePayloadSchema.parse(numerarNfe(this.paraContingencia(scope, estado, semNumeracao(normal)), Number(numero), gerarCnf(Number(numero))));
      await this.docRepo.appendAttempt(scope, { documentId: doc.id, attemptNo: nextAttemptNo, payloadJson: JSON.stringify(payload) }, tx);
      await this.docRepo.transition(
        scope,
        doc.id,
        { status: 'CONTINGENCY', numero, currentAttemptNo: nextAttemptNo, errorsJson: null, contingenciaSuplJson: null, whenStatusIn: ['SENT'] },
        tx,
      );
      await this.repo.createOrfa(
        scope,
        { documentId: doc.id, ambiente, serie: normal.infNFe.ide.serie, numero: BigInt(normal.infNFe.ide.nNF), chave: normal.infNFe.Id.slice(3) },
        tx,
      );
      return payload;
    });
    logger.warn('dfe_contingencia: falha de comunicação com a SEFAZ — a NFC-e saiu em contingência off-line com número novo', {
      documentId: doc.id,
      unitId: doc.unitId,
    });
    if (input.ctx) await this.gerarSupl(scope, doc.id, port, offline, { ...input.ctx, payload: offline });
  }

  /**
   * O QR Code/urlChave da nota off-line (F-NFCE-E1-6 b), gravado no documento. Falha (PSC fora, sessão vencida) não
   * derruba a venda: o DANFE espera e o tick tenta de novo antes de transmitir.
   */
  async gerarSupl(scope: AccountingScope, documentId: string, port: DfeEmissorPort, payload: NfePayload, ctx: DfeCallContext): Promise<NfceSupl | null> {
    if (!port.montarContingencia) return null;
    try {
      const supl = await port.montarContingencia(payload, ctx, 3);
      await this.docRepo.transition(scope, documentId, { status: 'CONTINGENCY', contingenciaSuplJson: JSON.stringify(supl), whenStatusIn: ['CONTINGENCY'] });
      return supl;
    } catch (error) {
      logger.warn('dfe_contingencia_supl: o QR Code da NFC-e off-line não saiu — o job tenta de novo', {
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  // ---- Job (tick do dfe_poll_pending) ----

  /** Decisões 6 e 7 — transmite as `CONTINGENCY`, alerta o prazo e resolve as órfãs mais velhas que `olderThan`. */
  async tick(olderThan: Date): Promise<ContingenciaTickSummary> {
    const s: ContingenciaTickSummary = {
      transmitidas: 0, semComunicacao: 0, pertoDoPrazo: 0, vencidas: 0, saidasAutomaticas: 0, orfasResolvidas: 0, orfasFalharam: 0, failed: 0,
    };
    for (const doc of await this.docRepo.listContingencia(TICK_LIMIT)) {
      await this.transmitirUma(doc, s);
    }
    for (const orfa of await this.repo.listOrfasPendentes(olderThan, TICK_LIMIT)) {
      await this.resolverOrfa(orfa, s);
    }
    // Revisão D: o prazo corre para toda NFC-e de contingência ainda não autorizada — inclusive a rejeitada ou à espera
    // de resposta depois da transmissão —, não só para a que segue `CONTINGENCY`.
    const feriados = await this.legalParams.fotografia(['FERIADO_NACIONAL']);
    for (const doc of await this.docRepo.listContingenciaNaoAutorizada(ALERTA_LIMIT)) {
      this.conferirPrazo(doc, feriados, s);
    }
    return ContingenciaTickSummarySchema.parse(s);
  }

  private async transmitirUma(doc: FiscalDocument, s: ContingenciaTickSummary): Promise<void> {
    const scope = resolveAccountingScopeInternal({ userId: doc.userId }, doc.unitId);
    try {
      const full = await this.comTentativas(scope, doc);
      const payload = NfePayloadSchema.parse(JSON.parse(this.tentativaCorrente(full).payloadJson));
      const port = resolveEmissorFor(doc.partner, doc.kind as FiscalDocumentKind);
      if (!port.capabilities.contingenciaOffline) return;
      if (this.ambienteDivergente(doc)) {
        s.failed++;
        await this.adiar(scope, doc.id);
        return;
      }
      const ctx = await this.ctxDe(scope, full, port, payload);
      if (!ctx?.assinatura) {
        logger.warn('dfe_contingencia_transmissao: sem sessão do PSC — a NFC-e off-line espera a reautorização', { documentId: doc.id });
        s.failed++;
        await this.adiar(scope, doc.id);
        return;
      }
      if (!full.contingenciaSuplJson) await this.gerarSupl(scope, doc.id, port, payload, ctx);
      let result;
      try {
        result = await port.emitir({
          kind: doc.kind as FiscalDocumentKind,
          ref: attemptRef(doc.id, doc.currentAttemptNo),
          ambiente: doc.ambiente as DfeAmbiente,
          cnpjEmitente: payload.infNFe.emit.CNPJ,
          partnerAccountRef: null,
          payload,
          ctx,
        });
      } catch (error) {
        if (!isFalhaDeComunicacao(error)) throw error;
        s.semComunicacao++; // a SEFAZ segue fora: a nota fica CONTINGENCY e o próximo tick tenta de novo
        await this.adiar(scope, doc.id);
        return;
      }
      if (!this.applier) throw new Error('dfe_contingencia_sem_applier: a factory não ligou o applyResult');
      await this.applier(scope, full, result);
      s.transmitidas++;
      if (await this.sairAutomatico(scope, doc.ambiente as DfeAmbiente)) s.saidasAutomaticas++;
    } catch (error) {
      s.failed++;
      logger.error('dfe_contingencia_transmissao: falha ao transmitir a NFC-e off-line — alerta', {
        documentId: doc.id,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.adiar(scope, doc.id);
    }
  }

  /**
   * Revisão F — a nota que ficou `CONTINGENCY` neste tick é tocada (`updatedAt`) e vai para o fim do rodízio. Se ela mudou
   * de status no meio (o operador reenviou, a SEFAZ respondeu), não há o que adiar.
   */
  private async adiar(scope: AccountingScope, documentId: string): Promise<void> {
    try {
      await this.docRepo.transition(scope, documentId, { status: 'CONTINGENCY', whenStatusIn: ['CONTINGENCY'] });
    } catch (error) {
      logger.warn('dfe_contingencia: a nota saiu de CONTINGENCY durante o tick — nada a adiar', {
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Revisão B (F-AMB-2 a, como o `reenviar`): a porta do env aponta para o ambiente do env; documento de outro ambiente não
   * sai por ela (uma nota de homologação sairia como produção). Fica parado, e o prazo segue alertando.
   */
  private ambienteDivergente(doc: FiscalDocument): boolean {
    const env = selectDfeEmissor(process.env, doc.kind as FiscalDocumentKind);
    if (env.port.name !== doc.partner || env.ambiente === doc.ambiente) return false;
    logger.warn('dfe_contingencia: documento de outro ambiente que o da emissão configurada — não transmite', {
      documentId: doc.id,
      ambienteDocumento: doc.ambiente,
      ambienteEmissao: env.ambiente ?? 'nenhum',
    });
    return true;
  }

  /** Decisão 9 — NFC-e de contingência sem autorização faltando ≤ 4 h (ou depois) do fim do prazo vira alerta. */
  private conferirPrazo(doc: FiscalDocumentWithAttempts, feriados: Awaited<ReturnType<LegalParameterService['fotografia']>>, s: ContingenciaTickSummary): void {
    const corrente = doc.attempts.find((a) => a.attemptNo === doc.currentAttemptNo);
    let ide: { tpEmis?: unknown; dhEmi?: unknown } | undefined;
    try {
      ide = corrente ? (JSON.parse(corrente.payloadJson) as { infNFe?: { ide?: { tpEmis?: unknown; dhEmi?: unknown } } }).infNFe?.ide : undefined;
    } catch {
      ide = undefined;
    }
    if (ide?.tpEmis !== 9 || typeof ide.dhEmi !== 'string') return;
    const documentId = doc.id;
    const prazo = prazoTransmissao(ide.dhEmi, feriados);
    const alerta = alertaDePrazo(this.now(), prazo);
    if (!alerta) return;
    if (alerta === 'PERTO') s.pertoDoPrazo++;
    else s.vencidas++;
    logger.error('dfe_contingencia_prazo: NFC-e de contingência sem autorização perto do prazo ou vencida — ação humana', {
      documentId,
      unitId: doc.unitId,
      status: doc.status,
      alerta,
      prazo: prazo.toISOString(),
    });
  }

  /**
   * Decisão 6 (Anexo IV p. 11) — a nota normal órfã: consulta a chave; autorizada ⇒ 110112 apontando a de contingência
   * (depois que ela for autorizada — rej. 912 sem a substituta na base); 217 ⇒ pedido de inutilização do número (em SP
   * depois de 01/11, a SEFAZ decide — E3-1 c); rejeição do evento/pedido ⇒ FAILED (pendência no documento).
   */
  private async resolverOrfa(orfa: NfceContingenciaOrfa, s: ContingenciaTickSummary): Promise<void> {
    const scope = resolveAccountingScopeInternal({ userId: orfa.userId }, orfa.unitId);
    try {
      const doc = await this.docRepo.findById(scope, orfa.documentId);
      if (!doc) throw new Error(`fiscal_document_not_found: ${orfa.documentId}`);
      const port = resolveEmissorFor(doc.partner, doc.kind as FiscalDocumentKind);
      if (!port.cancelarPorSubstituicao) return;
      if (this.ambienteDivergente(doc)) {
        await this.repo.updateOrfa(orfa.id, { tentativas: orfa.tentativas + 1 }); // rodízio
        return;
      }
      let consulta;
      try {
        consulta = await port.consultar(orfa.chave, { ambiente: orfa.ambiente as DfeAmbiente });
      } catch (error) {
        if (!isFalhaDeComunicacao(error)) throw error;
        await this.repo.updateOrfa(orfa.id, { tentativas: orfa.tentativas + 1, ultimoErro: (error as Error).message.slice(0, 500) });
        return;
      }
      await this.sairAutomatico(scope, orfa.ambiente as DfeAmbiente);
      if (consulta.status === 'AUTHORIZED') {
        // A substituta tem de existir na SEFAZ (5P31-10 rej. 912): espera a de contingência sair autorizada.
        if (!AUTHORIZED_STATUSES.includes(doc.status as FiscalDocumentStatus) || !doc.chaveOuCodigo) {
          await this.repo.updateOrfa(orfa.id, { tentativas: orfa.tentativas + 1 }); // rodízio: vai para o fim da fila
          return;
        }
        const ctx = await this.ctxDe(scope, doc, port, null);
        if (!ctx?.assinatura) {
          await this.repo.updateOrfa(orfa.id, { tentativas: orfa.tentativas + 1 }); // sem sessão do PSC: próximo tick
          return;
        }
        const r = await port.cancelarPorSubstituicao(orfa.chave, { chNFeRef: doc.chaveOuCodigo, xJust: XJUST_CANCEL_SUBST }, ctx);
        if (r.status === 'CANCELLED') {
          await this.repo.updateOrfa(orfa.id, { status: 'CANCELLED_SUBST', tentativas: orfa.tentativas + 1, ultimoErro: null });
          s.orfasResolvidas++;
        } else if (r.status !== 'PROCESSING') {
          await this.falhou(orfa, `110112 ${r.status}: ${r.errors.map((e) => `${e.code} ${e.message}`).join('; ')}`, s);
        }
        return;
      }
      if (consulta.status === 'PROCESSING' && consulta.errors.some((e) => e.code === '217')) {
        const pedido = await this.voidService.inutilizarOrfa(scope, {
          kind: 'NFCE',
          ambiente: orfa.ambiente as DfeAmbiente,
          serie: orfa.serie,
          numero: orfa.numero,
          xJust: XJUST_INUT_ORFA,
        });
        if (pedido.status === 'REJECTED') {
          await this.falhou(orfa, `inutilização rejeitada: ${pedido.errors.map((e) => `${e.code} ${e.message}`).join('; ')}`, s, pedido.id);
          return;
        }
        await this.repo.updateOrfa(orfa.id, { status: 'VOID_REQUESTED', voidId: pedido.id, tentativas: orfa.tentativas + 1, ultimoErro: null });
        s.orfasResolvidas++;
        return;
      }
      await this.repo.updateOrfa(orfa.id, { tentativas: orfa.tentativas + 1, ultimoErro: consulta.errors.map((e) => `${e.code} ${e.message}`).join('; ').slice(0, 500) || null });
    } catch (error) {
      if (error instanceof AppError) {
        // Guarda nomeada (ex.: inutilização bloqueada pela faixa) — decisão do fisco/regra, não do job: pendência visível.
        await this.falhou(orfa, error.message, s);
        return;
      }
      s.failed++;
      logger.error('dfe_contingencia_orfa: falha ao resolver a NFC-e normal órfã — alerta', {
        orfaId: orfa.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Para a view: as órfãs FAILED de cada documento viram a pendência `contingencia_orfa_falhou`. */
  async pendenciasDe(scope: AccountingScope, documentIds: readonly string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    for (const o of await this.repo.listOrfasDosDocumentos(scope, documentIds)) {
      if (o.status === 'FAILED') out.set(o.documentId, ['contingencia_orfa_falhou']);
    }
    return out;
  }

  // ---- internos ----

  private async falhou(orfa: NfceContingenciaOrfa, motivo: string, s: ContingenciaTickSummary, voidId?: string): Promise<void> {
    await this.repo.updateOrfa(orfa.id, { status: 'FAILED', tentativas: orfa.tentativas + 1, ultimoErro: motivo.slice(0, 500), ...(voidId ? { voidId } : {}) });
    s.orfasFalharam++;
    logger.error('dfe_contingencia_orfa: a NFC-e normal órfã não foi cancelada nem inutilizada — ação humana', { orfaId: orfa.id, documentId: orfa.documentId });
  }

  /** Decisão 8 — a SEFAZ respondeu: a entrada AUTO sai sozinha; a MANUAL fica. */
  private async sairAutomatico(scope: AccountingScope, ambiente: DfeAmbiente): Promise<boolean> {
    return this.repo.runTransaction(async (tx) => {
      const saiu = await this.repo.desligar(scope, ambiente, 'AUTO', tx);
      if (saiu) await this.auditar(tx, scope, DFE_CONTINGENCY_LEFT, { ambiente, origem: 'AUTO' });
      return saiu;
    });
  }

  private async ligar(scope: AccountingScope, ambiente: DfeAmbiente, origem: OrigemContingencia, dhCont: Date, xJust: string, tx: Tx): Promise<NfceContingencia> {
    const row = await this.repo.ligar(scope, ambiente, { origem, dhCont, xJust }, tx);
    await this.auditar(tx, scope, DFE_CONTINGENCY_ENTERED, { ambiente, origem, dhCont: dhCont.toISOString() });
    return row;
  }

  private auditar(tx: Tx, scope: AccountingScope, eventType: string, payload: { ambiente: string; origem: OrigemContingencia; dhCont?: string }): Promise<void> {
    const { unitId } = accountingScopeWhere(scope);
    return this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'nfce_contingencia',
      targetId: `${unitId}:${payload.ambiente}`,
      payload: { unitId, ...payload },
    });
  }

  private async ctxDe(scope: AccountingScope, doc: FiscalDocument, port: DfeEmissorPort, payload: NfePayload | null): Promise<DfeCallContext | undefined> {
    const a = await this.emission.assinaturaDaUnidade(scope, port);
    if (!a.ok || !a.assinatura) return undefined;
    const csc = await this.emission.cscDaUnidade(scope, port, doc.kind as FiscalDocumentKind, doc.ambiente as DfeAmbiente);
    return { ambiente: doc.ambiente as DfeAmbiente, assinatura: a.assinatura, ...(payload ? { payload } : {}), ...(csc ? { csc } : {}) };
  }

  private async comTentativas(scope: AccountingScope, doc: FiscalDocument): Promise<FiscalDocumentWithAttempts> {
    const full = await this.docRepo.findById(scope, doc.id);
    if (!full) throw new Error(`fiscal_document_not_found: ${doc.id}`);
    return full;
  }

  private tentativaCorrente(doc: FiscalDocumentWithAttempts) {
    const a = doc.attempts.find((t) => t.attemptNo === doc.currentAttemptNo);
    if (!a) throw new Error(`fiscal_document_attempt_not_found: ${doc.id}:${doc.currentAttemptNo}`);
    return a;
  }

  private toView(scope: AccountingScope, ambiente: DfeAmbiente, row: NfceContingencia | null): NfceContingenciaView {
    return NfceContingenciaViewSchema.parse({
      unitId: accountingScopeWhere(scope).unitId,
      ambiente,
      ativa: row?.ativa ?? false,
      origem: (row?.origem as OrigemContingencia | null | undefined) ?? null,
      dhCont: row?.ativa && row.dhCont ? row.dhCont.toISOString() : null,
      xJust: row?.ativa ? (row.xJust ?? null) : null,
    });
  }
}
