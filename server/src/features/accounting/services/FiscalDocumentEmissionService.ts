import type { FiscalDocument } from 'generated/prisma';
import { Prisma } from 'generated/prisma';
import { ForbiddenError, PackageExpiryNfsePendingError, ValidationError } from '../../../lib/errors';
import { getFactory } from '../../../lib/factory';
import logger from '../../../lib/logger';
import { isValidCnpj, stripCnpjMask } from '../../../lib/cnpj';
import { isValidCpf, stripCpfMask } from '../../../lib/cpf';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { FiscalProfileService } from './FiscalProfileService';
import type { ServiceFiscalProfileService, ServiceFiscalProfileView } from './ServiceFiscalProfileService';
import type { AuditService } from './AuditService';
import { attemptRef } from '../repositories/FiscalDocumentRepository';
import { AUTHORIZED_STATUSES } from '../repositories/IFiscalDocumentRepository';
import type {
  FiscalDocumentKind,
  FiscalDocumentStatus,
  FiscalDocumentWithAttempts,
  IFiscalDocumentRepository,
} from '../repositories/IFiscalDocumentRepository';
import { loadSalePackageInfo, loadSaleServiceLines } from '../sync/bridges/saleItems';
import type { SaleServiceLine } from '../sync/bridges/saleItems';
import { SERVICE_REVENUE_ACCOUNT } from '../sync/mappers/revenueSplit';
import { splitCents } from '../dfe/splitCents';
import { DpsManualPayloadSchema, DpsPayloadSchema, toManualDps } from '../dtos/DpsPayloadDto';
import type { DpsManualPayload, DpsPayload } from '../dtos/DpsPayloadDto';
import { selectDfeEmissor } from '../dfe/selectDfeEmissor';
import { assertTpAmb, tpAmbFor } from '../dfe/DfeEmissorPort';
import type { DfeAmbiente, DfeEmissorPort } from '../dfe/DfeEmissorPort';
import { scopeToday } from '../models/dates';
import { IND_OP_DEFAULT_SALAO } from '../models/indOp';
import { RECEITA_NAO_USO_CODE } from '../fixtures/ChartOfAccountsFixture';
import { expiryCompetence, parseExpiryMovementKey } from '../../packages/models/validity';
import { centsFromDb } from '../models/money';
import { findLc116 } from '../models/lc116ListaNacional';
import type { ReleituraJson } from '../../../lib/nfseReadback';

export const DFE_EMITTED_EVENT = 'dfe.emitted';

const PACKAGE_RECEIVABLE_ACCOUNT = '1.1.2'; // A Receber (item 21 — débito do lançamento sale.package.sold)
const DPS_VERAPLIC = 'luminaris-1.0';

/** Grupo de linhas de serviço da venda, uma por `cTribNac` (F-DFE-16 b — a DPS é mono-serviço). */
interface ServiceLineGroup {
  cTribNac: string;
  lines: SaleServiceLine[];
  profile: ServiceFiscalProfileView;
}

export interface PreviewResult {
  ok: boolean;
  faltantes: string[];
  competenciaAlerta: boolean;
  payloads: DpsPayload[];
  tieOut: { vServCents: string; ledgerCents: string; matches: boolean };
}

export interface FiscalDocumentView {
  id: string;
  kind: string;
  status: string;
  saleId: string;
  cTribNac: string;
  anchorEntryId: string;
  ambiente: string;
  partner: string;
  partnerRef: string | null;
  serie: number;
  numero: string | null;
  nNFSe: string | null;
  chaveOuCodigo: string | null;
  dCompet: string;
  vServCents: string;
  tpRetISSQN: number;
  vIssCents: string | null;
  vIbsCents: string | null;
  vCbsCents: string | null;
  currentAttemptNo: number;
  authorizedAt: string | null;
  cancelledAt: string | null;
  errors: Array<{ code: string; message: string }>;
  sourceDocumentId: string | null;
  attempts: Array<{ attemptNo: number; ref: string; sentAt: string; resultStatus: string | null }>;
  /** BE-INCR-DFE (item 30) — pendências que exigem ação humana; nunca resolvidas automaticamente. */
  pendencias: string[];
  /** FE-INCR-DFE PR-1 (item 10) — ids dos anexos (só existem em produção); `null` em homologação. */
  xmlAttachmentId: string | null;
  pdfAttachmentId: string | null;
  /** FE-INCR-DFE PR-1 (item 10) — releitura da tentativa corrente (retorno manual); `null` sem retorno ou sem releitura. Sem PII (toReleituraJson). */
  releitura: ReleituraJson['releitura'] | null;
}

/** `resultJson` nulo, inválido ou sem `releitura` ⇒ `null` (nunca lança — a view não pode quebrar por dado legado). */
function readReleitura(resultJson: string | null | undefined): ReleituraJson['releitura'] | null {
  if (!resultJson) return null;
  try {
    const parsed = JSON.parse(resultJson) as { releitura?: ReleituraJson['releitura'] } | null;
    return parsed?.releitura ?? null;
  } catch {
    return null;
  }
}

function centsToMoneyString(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

function bpToPctString(bp: number): string {
  return (bp / 100).toFixed(2);
}

/** [102]: "DPS" + cMun7 + tpInsc1 + insc14 + serie5 + nDPS15 (42 dígitos após o prefixo); tpInsc 2 = CNPJ (1 = CPF). */
function buildDpsId(cMun: string, cnpj: string, serie: number, nDPS: number): string {
  return `DPS${cMun}2${cnpj.padStart(14, '0')}${String(serie).padStart(5, '0')}${String(nDPS).padStart(15, '0')}`;
}

/**
 * BE-INCR-DFE (nó X10b, BRIEF Fase B+C, itens 10-23) — porta+adaptadores e montagem/envio da DPS
 * (NFS-e). Autorização citável: `docs/accounting/BE-INCR-DFE-brief.md` §4 "RATIFICAÇÃO — 2026-09-17"
 * (F-DFE-12..19). Fase E (NF-e 55) é [pendente-insumo] — `kind='NFE'` recusa loud.
 *
 * Fronteira Fase C / Fase D (item 20 vs item 24): este serviço cria o documento em `SENT` + tentativa 1
 * numa tx, audita `dfe.emitted` IN-TX, e chama `porta.emitir` PÓS-COMMIT. O RESULTADO dessa chamada
 * síncrona não é aplicado aqui — `transition()` (item 24, máquina de estados) é escopo do PR-3; só a
 * FALHA de rede é gravada (mesmo status SENT, `errorsJson` via o primitivo `repo.transition`, sem
 * decisão de máquina de estados — é uma atualização de MESMO estado). Um resultado imediato bem-
 * sucedido (ex.: NullEmissor) fica para o job de polling (item 27, PR-3) aplicar.
 */
export class FiscalDocumentEmissionService {
  constructor(
    private readonly repo: IFiscalDocumentRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly journalEntryRepo: IJournalEntryRepository,
    private readonly fiscalProfileService: FiscalProfileService,
    private readonly serviceFiscalProfileService: ServiceFiscalProfileService,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  /** GET /api/nfe/dfe/status (item 13). */
  getStatus(): { enabled: boolean; partner: string | null; ambiente: DfeAmbiente | null; reason?: string; capabilities?: DfeEmissorPort['capabilities'] } {
    const selection = selectDfeEmissor(process.env);
    return {
      enabled: selection.enabled,
      partner: selection.enabled ? selection.port.name : null,
      ambiente: selection.ambiente,
      reason: selection.reason,
      capabilities: selection.enabled ? selection.port.capabilities : undefined,
    };
  }

  /** POST /api/nfe/dfe/preview (item 23) — roda as pré-condições e a montagem SEM persistir nem chamar a porta. */
  async preview(scope: AccountingScope, saleId: string, kind: FiscalDocumentKind): Promise<PreviewResult> {
    if (!this.policy.canEmitFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para emitir documento fiscal.');
    }
    try {
      const assembly = await this.assemble(scope, saleId, kind, selectDfeEmissor(process.env).ambiente);
      const totalServiceCents = assembly.groups.reduce((sum, g) => sum + g.vServCents, 0);
      return {
        ok: true,
        faltantes: [],
        competenciaAlerta: assembly.competenciaAlerta,
        payloads: assembly.groups.map((g) => g.payload),
        tieOut: {
          vServCents: String(totalServiceCents),
          ledgerCents: String(assembly.ledgerCents),
          matches: totalServiceCents === assembly.ledgerCents,
        },
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        const faltantes = Array.isArray((error.details as { faltantes?: string[] } | null)?.faltantes)
          ? ((error.details as { faltantes: string[] }).faltantes)
          : [error.message];
        return {
          ok: false,
          faltantes,
          competenciaAlerta: false,
          payloads: [],
          tieOut: { vServCents: '0', ledgerCents: '0', matches: false },
        };
      }
      throw error;
    }
  }

  /**
   * POST /api/nfe/dfe/documents (itens 14-21) — emite UM `FiscalDocument` por `cTribNac` distinto
   * entre as linhas de serviço da venda (F-DFE-16 b). Todas as pré-condições são checadas ANTES de
   * qualquer tx/porta ser tocada (item 14 — 400 agregado com a lista completa).
   */
  async emit(scope: AccountingScope, saleId: string, kind: FiscalDocumentKind): Promise<FiscalDocumentView[]> {
    if (!this.policy.canEmitFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para emitir documento fiscal.');
    }
    const selection = selectDfeEmissor(process.env);
    const assembly = await this.assemble(scope, saleId, kind, selection.ambiente);
    if (!selection.enabled) {
      throw new ValidationError(`dfe_disabled: ${selection.reason}`, { faltantes: [selection.reason ?? 'porta desabilitada'] });
    }

    const created: FiscalDocumentWithAttempts[] = [];
    for (const group of assembly.groups) {
      created.push(await this.createAndSend(scope, selection, kind, { ...assembly, saleId, group }));
    }
    return created.map((d) => this.toView(d));
  }

  /**
   * BE-INCR-PACOTE-VALIDADE (§5.2 itens 14a e 9.5; F-PV-9 b, 9b a, 9c b, 9d a) — a NFS-e do saldo de pacote
   * VENCIDO, emitida pelo passe do job (não pelo operador), só quando o perfil da unidade é
   * `pacoteFatoGerador = 'CONSUMO'` (em `VENDA` a nota já saiu cheia na venda — P11). Âncora = o lançamento
   * `('sale.package.expired', movementKey)`; `saleId` = a venda de origem mais recente do saldo; `saleKey` =
   * `movementKey` (uma nota por vencimento); `dCompet` = `expiresOn + 1` (F-PV-5 a); `vServCents` = o valor
   * vencido, com tie-out exato contra o crédito 3.4.
   *
   * Desfechos: `not_applicable` (sem perfil, ou perfil ≠ CONSUMO), `exists` (já há documento com este
   * `saleKey` — inclusive em corrida, P2002), `emitted`. Faltante (perfil sem `pacoteCTribNac`, cliente sem
   * CPF/CNPJ, porta desabilitada…) → `PackageExpiryNfsePendingError` com o motivo nomeado: o vencimento e o
   * lançamento FICAM, a nota é efeito posterior, não gate. Risco declarado no BRIEF (PE-4): sem o
   * `pacoteCTribNac` que o contador põe no perfil, nada sai — é o ponto de controle.
   *
   * L1 (dono, 03/10 — letra do §5.2): o re-drive procura documento por `saleKey`; o cancelamento renomeia o
   * `saleKey` (`FiscalDocumentLifecycleService`), então uma nota de vencido CANCELADA é reemitida no tick seguinte.
   */
  async emitPackageExpiry(scope: AccountingScope, movementKey: string): Promise<'emitted' | 'exists' | 'not_applicable'> {
    if (!this.policy.canEmitFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para emitir documento fiscal.');
    }
    const fiscalProfile = await this.fiscalProfileService.get(scope);
    if (!fiscalProfile || fiscalProfile.pacoteFatoGerador !== 'CONSUMO') return 'not_applicable';
    if (await this.repo.findBySaleKey(scope, movementKey, 'NFSE')) return 'exists';

    const selection = selectDfeEmissor(process.env);
    let assembly: Awaited<ReturnType<FiscalDocumentEmissionService['assembleExpiry']>>;
    try {
      assembly = await this.assembleExpiry(scope, movementKey, selection.ambiente);
    } catch (error) {
      if (error instanceof ValidationError) {
        const faltantes = (error.details as { faltantes?: string[] } | null)?.faltantes;
        throw new PackageExpiryNfsePendingError(movementKey, Array.isArray(faltantes) ? faltantes : [error.message]);
      }
      throw error;
    }
    try {
      await this.createAndSend(scope, selection, 'NFSE', assembly);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'exists';
      throw error;
    }
    return 'emitted';
  }

  /**
   * Cria o documento em SENT + tentativa 1 + `dfe.emitted` numa tx e chama a porta PÓS-COMMIT (extraído do
   * laço de `emit`, sem mudança de comportamento, para servir também a `emitPackageExpiry`).
   */
  private async createAndSend(
    scope: AccountingScope,
    selection: ReturnType<typeof selectDfeEmissor>,
    kind: FiscalDocumentKind,
    args: {
      saleId: string;
      saleKey?: string;
      group: { cTribNac: string; vServCents: number; payload: DpsPayload };
      anchorEntryId: string;
      serie: number;
      dCompet: string;
      tpRetISSQN: number;
      cnpjEmitente: string;
      partnerAccountRef: string | null;
    },
  ): Promise<FiscalDocumentWithAttempts> {
    const { group } = args;
    const doc = await this.repo.runTransaction(async (tx) => {
      let numero: bigint | null = null;
      if (!selection.port.capabilities.numbersDps) {
        numero = await this.repo.nextNumber(scope, kind, args.serie, tx);
      }
      let payload: DpsPayload | DpsManualPayload;
      if (selection.port.capabilities.numbersDps) {
        // BE-INCR-DFE-MANUAL (item 8, F-MAN-4 a): quem numera é o adaptador/portal — a DPS sai SEM id/serie/nDPS.
        payload = DpsManualPayloadSchema.parse(toManualDps(group.payload));
      } else {
        const numerada = { ...group.payload };
        if (numero != null) {
          numerada.infDPS = { ...numerada.infDPS, nDPS: Number(numero) };
        }
        payload = DpsPayloadSchema.parse(numerada); // valida ANTES de persistir (payload inválido = bug nosso, não 400)
      }
      assertTpAmb(payload, selection.ambiente as DfeAmbiente);
      const createdDoc = await this.repo.createSent(
        scope,
        {
          kind,
          saleId: args.saleId,
          ...(args.saleKey ? { saleKey: args.saleKey } : {}),
          cTribNac: group.cTribNac,
          anchorEntryId: args.anchorEntryId,
          ambiente: selection.ambiente as DfeAmbiente,
          partner: selection.port.name,
          serie: args.serie,
          numero,
          dCompet: args.dCompet,
          vServCents: BigInt(group.vServCents),
          tpRetISSQN: args.tpRetISSQN,
          payloadJson: JSON.stringify(payload),
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: DFE_EMITTED_EVENT,
        targetType: 'fiscal_document',
        targetId: createdDoc.id,
        payload: {
          documentId: createdDoc.id,
          kind,
          attemptNo: 1,
          ref: attemptRef(createdDoc.id, 1),
          vServCents: String(group.vServCents),
          ambiente: selection.ambiente ?? '',
        },
      });
      return createdDoc;
    });

    // Pós-commit (mesma regra do AccountingSyncPort): chama a porta fora da tx. Resultado imediato
    // NÃO é aplicado aqui (item 24 é PR-3) — só a FALHA de rede é gravada (mesmo status SENT).
    try {
      await selection.port.emitir({
        kind,
        ref: attemptRef(doc.id, 1),
        ambiente: selection.ambiente as DfeAmbiente,
        cnpjEmitente: args.cnpjEmitente,
        partnerAccountRef: args.partnerAccountRef,
        payload: JSON.parse(doc.attempts[0].payloadJson),
      });
    } catch (emitError) {
      const message = emitError instanceof Error ? emitError.message : String(emitError);
      logger.error('DfeEmissorPort.emitir falhou — documento fica SENT, sem tentativa 2 automática', {
        documentId: doc.id,
        error: message,
      });
      await this.repo.transition(scope, doc.id, { status: 'SENT', errorsJson: JSON.stringify([{ code: 'dfe_emitir_failed', message }]) });
    }
    return doc;
  }

  /**
   * GET /api/nfe/dfe/documents?unitId&saleId?&status?&pendencias? (item 38). Exige pelo menos um
   * de `saleId`/`status` — o repositório não expõe um "listar tudo" e um dump sem filtro não está
   * no contrato do BRIEF. `pendencias=true` (item 30) filtra por CIMA de um dos dois, nunca
   * sozinho — não vira um "listar tudo com pendência" que o repositório não sabe fazer.
   * `status` some `saleId`: filtra a lista da venda em memória (a lista de uma venda é sempre
   * pequena — N documentos, um por `cTribNac`); sem `saleId`, delega a `listByStatus`.
   */
  async list(scope: AccountingScope, filter: { saleId?: string; status?: FiscalDocumentStatus; pendencias?: boolean }): Promise<FiscalDocumentView[]> {
    if (!this.policy.canReadFiscalDocument(scope)) throw new ForbiddenError('Você não tem permissão para ler documentos fiscais.');
    let views: FiscalDocumentView[];
    if (filter.saleId) {
      const rows = await this.repo.listBySale(scope, filter.saleId);
      const target = filter.status ? rows.filter((r) => r.status === filter.status) : rows;
      // `rows` (não filtrado) já é o conjunto de irmãos completo desta venda — evita um 2º round-trip.
      views = await this.attachPendencias(scope, target, new Map([[filter.saleId, rows]]));
    } else if (filter.status) {
      const rows = await this.repo.listByStatus(scope, filter.status);
      views = await this.attachPendencias(scope, rows.map((r) => ({ ...r, attempts: [] })));
    } else {
      throw new ValidationError('Informe ao menos um filtro: saleId ou status.', { faltantes: ['saleId ou status'] });
    }
    return filter.pendencias ? views.filter((v) => v.pendencias.length > 0) : views;
  }

  /**
   * GET …/documents/:id/ficha (BE-INCR-DFE-MANUAL item 14) — a DPS da tentativa corrente, CRUA (sem máscara, vírgula
   * decimal ou ordem das etapas do portal: isso é da tela, FE-INCR-DFE). Contém dado do tomador: só com
   * `canReadFiscalDocument`, nunca em audit.
   */
  async ficha(scope: AccountingScope, id: string): Promise<{ documentId: string; status: string; currentAttemptNo: number; payload: unknown }> {
    if (!this.policy.canReadFiscalDocument(scope)) throw new ForbiddenError('Você não tem permissão para ler documentos fiscais.');
    const doc = await this.repo.findById(scope, id);
    if (!doc) throw new ValidationError(`Documento fiscal '${id}' não encontrado.`, null);
    const attempt = doc.attempts.find((a) => a.attemptNo === doc.currentAttemptNo);
    if (!attempt) throw new Error(`fiscal_document_attempt_not_found: ${doc.id}:${doc.currentAttemptNo}`);
    return { documentId: doc.id, status: doc.status, currentAttemptNo: doc.currentAttemptNo, payload: JSON.parse(attempt.payloadJson) };
  }

  async getById(scope: AccountingScope, id: string): Promise<FiscalDocumentView> {
    if (!this.policy.canReadFiscalDocument(scope)) throw new ForbiddenError('Você não tem permissão para ler documentos fiscais.');
    const row = await this.repo.findById(scope, id);
    if (!row) throw new ValidationError(`Documento fiscal '${id}' não encontrado.`, null);
    const [view] = await this.attachPendencias(scope, [row]);
    return view;
  }

  /**
   * BE-INCR-DFE (item 30) — pendências que exigem ação humana: venda cancelada/devolvida com
   * documento AUTHORIZED ainda vivo (`sale_cancelled_with_live_document`), ou documento CANCELLED
   * sem substituto vivo no mesmo `cTribNac` (`cancelled_without_replacement`). Nada é resolvido
   * automaticamente — só sinalizado (item 30: "nada automático").
   */
  private async attachPendencias(
    scope: AccountingScope,
    docs: FiscalDocumentWithAttempts[],
    siblingsSeed?: Map<string, FiscalDocument[]>,
  ): Promise<FiscalDocumentView[]> {
    const dynamicTableRepo = getFactory().getDynamicTableRepository();
    const salesTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'sales');
    const saleStatusCache = new Map<string, string | undefined>();
    const siblingsCache = new Map<string, FiscalDocument[]>(siblingsSeed ?? []);
    const views: FiscalDocumentView[] = [];
    for (const doc of docs) {
      if (!saleStatusCache.has(doc.saleId)) {
        const row = salesTable ? await dynamicTableRepo.findDataById(doc.saleId) : null;
        saleStatusCache.set(doc.saleId, (row?.data as Record<string, unknown> | undefined)?.status as string | undefined);
      }
      if (!siblingsCache.has(doc.saleId)) {
        siblingsCache.set(doc.saleId, await this.repo.listBySale(scope, doc.saleId));
      }
      const saleStatus = saleStatusCache.get(doc.saleId);
      const siblings = siblingsCache.get(doc.saleId)!;
      const pendencias: string[] = [];
      // BE-INCR-DFE-MANUAL F-MAN-2 (c): a nota divergente também é nota viva no ambiente nacional.
      if ((saleStatus === 'Cancelled' || saleStatus === 'Returned') && AUTHORIZED_STATUSES.includes(doc.status as FiscalDocumentStatus)) {
        pendencias.push('sale_cancelled_with_live_document');
      }
      // F-MAN-2 (c) efeito 4 + F-MAN-2b (b): a releitura achou divergência — só sai cancelando e reemitindo.
      if (doc.status === 'AUTHORIZED_DIVERGENT') {
        pendencias.push('releitura_divergente');
      }
      if (doc.status === 'CANCELLED') {
        const hasReplacement = siblings.some((d) => d.id !== doc.id && d.cTribNac === doc.cTribNac && d.status !== 'CANCELLED');
        if (!hasReplacement) pendencias.push('cancelled_without_replacement');
      }
      views.push(this.toView(doc, pendencias));
    }
    return views;
  }

  /**
   * BE-INCR-DFE (nó X10b, PR-3, item 26) — remonta o payload de UM grupo (`cTribNac`) já existente,
   * para o reenvio de um documento `REJECTED`. Roda as MESMAS pré-condições da emissão original
   * ("payload remontado (perfil/venda corrigidos)" — se o operador corrigiu o perfil fiscal ou a
   * venda desde a rejeição, a remontagem reflete a correção). É `FiscalDocumentLifecycleService`
   * (PR-3) quem chama isto e decide o que fazer com o resultado (nova tentativa, não um novo
   * documento) — este serviço só sabe montar payload, nunca decide sobre `status`/tentativas.
   */
  async reassembleGroupForReenvio(
    scope: AccountingScope,
    saleId: string,
    kind: FiscalDocumentKind,
    cTribNac: string,
    ambiente: DfeAmbiente,
    saleKey?: string,
  ): Promise<{ vServCents: number; payload: DpsPayload; cnpjEmitente: string; partnerAccountRef: string | null }> {
    // BE-INCR-PACOTE-VALIDADE (L2, dono 03/10): a nota de saldo vencido (saleKey = chave do movimento) remonta
    // pelo vencimento, nunca pela venda de origem (que é 100% pacote e recusaria em CONSUMO).
    if (saleKey && parseExpiryMovementKey(saleKey)) {
      const expiry = await this.assembleExpiry(scope, saleKey, ambiente);
      if (expiry.group.cTribNac !== cTribNac) {
        throw new ValidationError(
          `emissao_bloqueada: o cTribNac do pacote no perfil mudou desde a emissão original ('${cTribNac}' → '${expiry.group.cTribNac}').`,
          { faltantes: [`cTribNac '${cTribNac}' ausente na remontagem`] },
        );
      }
      return { ...expiry.group, cnpjEmitente: expiry.cnpjEmitente, partnerAccountRef: expiry.partnerAccountRef };
    }
    const assembly = await this.assemble(scope, saleId, kind, ambiente, true);
    const group = assembly.groups.find((g) => g.cTribNac === cTribNac);
    if (!group) {
      throw new ValidationError(
        `emissao_bloqueada: grupo cTribNac '${cTribNac}' não existe mais na montagem atual da venda (linhas de serviço mudaram desde a emissão original?).`,
        { faltantes: [`cTribNac '${cTribNac}' ausente na remontagem`] },
      );
    }
    return { ...group, cnpjEmitente: assembly.cnpjEmitente, partnerAccountRef: assembly.partnerAccountRef };
  }

  // ---- Montagem interna (itens 14-19) — compartilhada por preview e emit ----

  private async assemble(
    scope: AccountingScope,
    saleId: string,
    kind: FiscalDocumentKind,
    ambiente: DfeAmbiente | null,
    reenvio = false,
  ): Promise<{
    groups: Array<{ cTribNac: string; vServCents: number; payload: DpsPayload }>;
    ledgerCents: number;
    anchorEntryId: string;
    serie: number;
    dCompet: string;
    tpRetISSQN: number;
    cnpjEmitente: string;
    partnerAccountRef: string | null;
    competenciaAlerta: boolean;
  }> {
    if (kind === 'NFE') {
      throw new ValidationError('nfe_nao_implementada: NF-e 55 é Fase E, [pendente-insumo] (F-DFE-13 a) — fora desta fatia.', {
        faltantes: ['Fase E (NF-e 55) ainda não implementada'],
      });
    }

    const faltantes: string[] = [];

    // (i) venda existe e está Finalized; (ii) kind ≠ Empty, all-Package só se pacoteFatoGerador='VENDA'.
    const dynamicTableRepo = getFactory().getDynamicTableRepository();
    const salesTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'sales');
    const saleRow = salesTable ? await dynamicTableRepo.findDataById(saleId) : null;
    const validSale = saleRow && salesTable && (await dynamicTableRepo.existsByIdInTable(saleId, salesTable.id));
    const saleData = (validSale ? saleRow!.data : {}) as Record<string, unknown>;
    if (!validSale) {
      faltantes.push(`venda '${saleId}' não encontrada neste escopo`);
    } else if (saleData.status !== 'Finalized') {
      faltantes.push(`venda '${saleId}' não está Finalizada (status atual: ${String(saleData.status ?? '?')})`);
    }

    const saleInfo = validSale ? await loadSalePackageInfo(scope.ownerUserId, saleId) : null;
    let pacoteVenda = false;
    if (saleInfo?.kind === 'Empty') {
      faltantes.push('venda sem itens');
    }

    // (iii) perfil da unidade completo.
    const fiscalProfile = await this.fiscalProfileService.get(scope);
    if (!fiscalProfile) {
      faltantes.push('perfil fiscal da unidade não cadastrado (PUT /api/accounting/fiscal-profile)');
    } else if (!fiscalProfile.emissao.completo) {
      faltantes.push(...fiscalProfile.emissao.faltantes.map((f) => `perfil fiscal da unidade: falta '${f}'`));
    }

    let anchorSourceType: 'sale.finalized' | 'sale.package.sold' = 'sale.finalized';
    if (saleInfo?.kind === 'Package') {
      if (fiscalProfile?.pacoteFatoGerador !== 'VENDA') {
        faltantes.push("venda 100% pacote: emissão só com FiscalProfile.pacoteFatoGerador = 'VENDA' (pacote emite no consumo por padrão)");
      } else {
        // BE-INCR-PACOTE-VALIDADE 13a (F-PV-9b a, confirmado na 2ª rodada de 02/10): o cTribNac do pacote vem
        // do perfil fiscal da unidade (`pacoteCTribNac`, do contador). Sem ele, a recusa continua — nomeada.
        faltantes.push(...this.pacoteCodigoFaltantes(fiscalProfile));
        pacoteVenda = true;
        anchorSourceType = 'sale.package.sold';
      }
    }

    // (iv) linhas de serviço da venda + ServiceFiscalProfile de cada uma.
    const serviceLines = validSale && !pacoteVenda ? await loadSaleServiceLines(scope.ownerUserId, saleId) : [];
    if (!pacoteVenda && validSale && saleInfo?.kind !== 'Empty' && serviceLines.length === 0 && kind === 'NFSE') {
      faltantes.push('venda sem linhas de serviço (nenhum item Service) — NFS-e exige ao menos uma');
    }
    const profileByServiceRef = new Map<string, ServiceFiscalProfileView>();
    for (const line of serviceLines) {
      if (profileByServiceRef.has(line.serviceRef)) continue;
      try {
        const profile = await this.serviceFiscalProfileService.get(scope, line.serviceRef);
        profileByServiceRef.set(line.serviceRef, profile);
        if (fiscalProfile?.ibsCbsInformar && !profile.cNBS) {
          faltantes.push(`serviço '${line.serviceRef}': falta cNBS (obrigatório com ibsCbsInformar, E0322)`);
        }
        if (!findLc116(profile.cTribNac)) {
          faltantes.push(`serviço '${line.serviceRef}': cTribNac '${profile.cTribNac}' não consta da lista nacional (LC 116)`);
        }
      } catch {
        faltantes.push(`serviço '${line.serviceRef}' sem perfil fiscal (PUT /api/accounting/service-fiscal-profiles/${line.serviceRef})`);
      }
    }

    // (v) tomador: customerId obrigatório com taxId válido por DV (F-DFE-7 b).
    let tomador: { cnpj?: string; cpf?: string; xNome: string } | null = null;
    const customerId = typeof saleData.customerId === 'string' ? saleData.customerId : '';
    if (validSale) {
      if (!customerId) {
        faltantes.push('venda sem cliente vinculado — vincule um cliente ou cadastre o documento do cliente (F-DFE-7 b)');
      } else {
        const customersTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'customers');
        const customerRow = customersTable ? await dynamicTableRepo.findDataById(customerId) : null;
        const customerData = (customerRow?.data ?? {}) as Record<string, unknown>;
        const rawTaxId = String(customerData.taxId ?? '');
        const classification = this.classifyTaxId(rawTaxId);
        if (!classification) {
          faltantes.push(`cliente '${customerId}': taxId ausente ou inválido por dígito verificador`);
        } else {
          tomador = {
            ...classification,
            xNome: String(customerData.name ?? saleData.simpleCustomerName ?? ''),
          };
        }
      }
    }
    if (fiscalProfile?.issRetidoTomadorPj) {
      // F-DFE-14 (b não coberto): a retenção com endereço do tomador precisa do Anexo A
      // (UF, nome normalizado) -> IBGE, ainda não transcrito no corpus deste BRIEF — LACUNA DE SPEC.
      faltantes.push(
        'issRetidoTomadorPj=true exige toma/end (Anexo A UF->IBGE) — lacuna de spec, não implementado nesta fatia (F-DFE-14)',
      );
    }

    // (vi) nenhum documento vivo para (venda, kind, cTribNac) — checado por grupo abaixo.
    const liveDocs = validSale && !reenvio ? await this.repo.findLiveBySale(scope, saleId, kind) : [];

    // (vii) emissaoForaDoMes = BLOQUEAR e competência cruzou o mês.
    const dCompet = typeof saleData.date === 'string' ? saleData.date.slice(0, 10) : '';
    const today = scopeToday(scope);
    const competenciaCruzouMes = Boolean(dCompet) && dCompet.slice(0, 7) !== today.slice(0, 7);
    if (fiscalProfile?.emissaoForaDoMes === 'BLOQUEAR' && competenciaCruzouMes) {
      faltantes.push(`competência ${dCompet} fora do mês corrente (${today.slice(0, 7)}) e emissaoForaDoMes=BLOQUEAR`);
    }

    // (viii) porta habilitada.
    const selection = selectDfeEmissor(process.env);
    if (!selection.enabled) {
      faltantes.push(selection.reason ?? 'porta de emissão desabilitada');
    }

    // Emitente: CNPJ da unidade (preset `units`, F-DFE-17 a — já validado por DV/alfanumérico).
    const unitsTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'units');
    const unitRow = unitsTable ? await dynamicTableRepo.findDataById(scope.unitId) : null;
    const unitCnpjRaw = String((unitRow?.data as Record<string, unknown> | undefined)?.cnpj ?? '');
    const unitCnpj = stripCnpjMask(unitCnpjRaw).toUpperCase();
    if (!unitCnpj || !isValidCnpj(unitCnpj)) {
      faltantes.push("CNPJ da unidade ausente ou inválido (cadastre em 'units')");
    }

    if (faltantes.length > 0) {
      throw new ValidationError(`emissao_bloqueada: ${faltantes.length} pendência(s) — ver 'faltantes'.`, { faltantes });
    }
    if (ambiente === null) {
      // null só com a porta desabilitada, e aí (viii) já agregou o faltante acima: buildPayload nunca vê null.
      throw new Error('dfe_tpamb_invariant: montagem sem ambiente com a porta habilitada.');
    }

    // ---- Montagem (a partir daqui todas as pré-condições passaram) ----
    const anchor = await this.journalEntryRepo.findBySource(scope, anchorSourceType, saleId);
    if (!anchor) {
      throw new ValidationError(`emissao_bloqueada: lançamento âncora '${anchorSourceType}' não encontrado para a venda '${saleId}'.`, {
        faltantes: [`lançamento âncora '${anchorSourceType}' ausente — a venda não foi contabilizada ainda`],
      });
    }
    const ledgerCents = pacoteVenda
      ? await this.sumPostings(scope, anchor.postings, PACKAGE_RECEIVABLE_ACCOUNT, 'debit')
      : await this.sumPostings(scope, anchor.postings, SERVICE_REVENUE_ACCOUNT, 'credit');

    // Agrupa as linhas de serviço por cTribNac (F-DFE-16 b — a DPS é mono-serviço).
    const groupsMap = new Map<string, ServiceLineGroup>();
    const linesForGrouping = pacoteVenda
      ? [{ serviceRef: '', description: String(saleData.description ?? 'Pacote'), quantity: 1, unitPrice: ledgerCents / 100 }]
      : serviceLines;
    for (const line of linesForGrouping) {
      const profile = pacoteVenda ? this.pacoteServiceProfile(fiscalProfile!) : profileByServiceRef.get(line.serviceRef)!;
      const cTribNac = profile.cTribNac;
      const existing = groupsMap.get(cTribNac);
      if (existing) {
        existing.lines.push(line);
      } else {
        groupsMap.set(cTribNac, { cTribNac, lines: [line], profile });
      }
    }

    // (vi) revisitado por grupo: nenhum documento vivo já emitido para essa (venda, kind, cTribNac).
    for (const cTribNac of groupsMap.keys()) {
      const clash = liveDocs.find((d) => d.cTribNac === cTribNac);
      if (clash) {
        throw new ValidationError(`emissao_bloqueada: já existe documento vivo (status ${clash.status}) para esta venda/kind/cTribNac.`, {
          faltantes: [`documento vivo já existe para cTribNac '${cTribNac}' (id ${clash.id})`],
        });
      }
    }

    // F-DFE-16 (b): "ordem determinística por cTribNac" — ordena por VALOR, não por ordem de
    // inserção no Map (que seguiria a ordem de retorno do repositório de linhas de venda).
    const orderedGroups = [...groupsMap.values()].sort((a, b) => a.cTribNac.localeCompare(b.cTribNac));
    const weights = orderedGroups.map((g) => g.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
    const shares = splitCents(ledgerCents, weights);

    const fp = fiscalProfile!;
    const groups = orderedGroups.map((g, i) => {
      const vServCents = shares[i];
      const xDescServ = g.lines.map((l) => `${l.quantity}x ${l.description || l.serviceRef}`).join('; ').slice(0, 1000) || 'Serviço';
      const payload = this.buildPayload({
        fp,
        cnpjEmitente: unitCnpj,
        group: g,
        vServCents,
        xDescServ,
        dCompet,
        tomador,
        ambiente,
      });
      return { cTribNac: g.cTribNac, vServCents, payload };
    });

    return {
      groups,
      ledgerCents,
      anchorEntryId: anchor.id,
      serie: fp.dpsSerie,
      dCompet,
      tpRetISSQN: fp.issRetidoTomadorPj ? 2 : 1,
      cnpjEmitente: unitCnpj,
      partnerAccountRef: fp.partnerAccountRef,
      competenciaAlerta: competenciaCruzouMes,
    };
  }

  /**
   * BE-INCR-PACOTE-VALIDADE (13a/14a) — o "perfil de serviço" do pacote, que não tem serviço ligado: códigos do
   * perfil fiscal da UNIDADE (`pacoteCTribNac`/`pacoteCNBS`, do contador) e `cIndOp` = o padrão do salão
   * `030101` (L8, dono 03/10 — o mesmo do caminho pacote VENDA; pendente do contador junto com o PE-5).
   */
  private pacoteServiceProfile(fp: { pacoteCTribNac: string | null; pacoteCNBS: string | null }): ServiceFiscalProfileView {
    return {
      serviceRef: '',
      cTribNac: fp.pacoteCTribNac ?? '',
      cTribNacDescricao: '',
      cTribMun: null,
      cNBS: fp.pacoteCNBS,
      cIndOp: IND_OP_DEFAULT_SALAO,
      cLocPrestacao: null,
      xDescServ: null,
      updatedAt: '',
    };
  }

  /** Faltantes dos códigos do pacote no perfil (13a): `pacoteCTribNac` sempre; `pacoteCNBS` com ibsCbsInformar (E0322). */
  private pacoteCodigoFaltantes(fp: { pacoteCTribNac: string | null; pacoteCNBS: string | null; ibsCbsInformar: boolean }): string[] {
    const faltantes: string[] = [];
    if (!fp.pacoteCTribNac) {
      faltantes.push("perfil fiscal da unidade: falta 'pacoteCTribNac' (cTribNac do pacote — do contador)");
    } else if (!findLc116(fp.pacoteCTribNac)) {
      faltantes.push(`perfil fiscal da unidade: pacoteCTribNac '${fp.pacoteCTribNac}' não consta da lista nacional (LC 116)`);
    }
    if (fp.ibsCbsInformar && !fp.pacoteCNBS) {
      faltantes.push("perfil fiscal da unidade: falta 'pacoteCNBS' (obrigatório com ibsCbsInformar, E0322)");
    }
    return faltantes;
  }

  /**
   * BE-INCR-PACOTE-VALIDADE (§5.2 item 14a) — monta a DPS da NFS-e do saldo vencido a partir do que está
   * persistido (movimento `expiry`, lançamento âncora, perfil, cliente, unidade). Mesmas pré-condições de
   * perfil/tomador/emitente/porta da emissão de venda; faltante → `ValidationError` com `faltantes` (o mesmo
   * contrato de `assemble`, que o reenvio já entende). Não confere se o documento já existe: isso é de quem chama.
   */
  private async assembleExpiry(
    scope: AccountingScope,
    movementKey: string,
    ambiente: DfeAmbiente | null,
  ): Promise<{
    saleId: string;
    saleKey: string;
    group: { cTribNac: string; vServCents: number; payload: DpsPayload };
    anchorEntryId: string;
    serie: number;
    dCompet: string;
    tpRetISSQN: number;
    cnpjEmitente: string;
    partnerAccountRef: string | null;
  }> {
    const parsed = parseExpiryMovementKey(movementKey);
    if (!parsed) throw new Error(`assembleExpiry: chave de vencimento inválida '${movementKey}'.`);
    const faltantes: string[] = [];

    const fiscalProfile = await this.fiscalProfileService.get(scope);
    if (!fiscalProfile) {
      faltantes.push('perfil fiscal da unidade não cadastrado (PUT /api/accounting/fiscal-profile)');
    } else {
      if (!fiscalProfile.emissao.completo) {
        faltantes.push(...fiscalProfile.emissao.faltantes.map((f) => `perfil fiscal da unidade: falta '${f}'`));
      }
      faltantes.push(...this.pacoteCodigoFaltantes(fiscalProfile));
    }

    const context = await getFactory().getPackageBalanceService().getExpiryContext(scope, movementKey);
    if (!context) throw new Error(`assembleExpiry: movimento de vencimento '${movementKey}' não existe.`);
    if (!context.originSaleId) faltantes.push('saldo sem crédito de origem — sem venda para ancorar a nota');

    // Tomador: o cliente do saldo, com CPF/CNPJ válido por DV (F-DFE-7 b).
    const dynamicTableRepo = getFactory().getDynamicTableRepository();
    const customersTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'customers');
    const customerRow =
      customersTable && (await dynamicTableRepo.existsByIdInTable(context.customerId, customersTable.id))
        ? await dynamicTableRepo.findDataById(context.customerId)
        : null;
    const customerData = (customerRow?.data ?? {}) as Record<string, unknown>;
    const taxId = this.classifyTaxId(String(customerData.taxId ?? ''));
    if (!taxId) faltantes.push(`cliente '${context.customerId}': taxId ausente ou inválido por dígito verificador`);
    const tomador = taxId ? { ...taxId, xNome: String(customerData.name ?? '') } : null;

    if (fiscalProfile?.issRetidoTomadorPj) {
      faltantes.push(
        'issRetidoTomadorPj=true exige toma/end (Anexo A UF->IBGE) — lacuna de spec, não implementado nesta fatia (F-DFE-14)',
      );
    }

    const dCompet = expiryCompetence(parsed.expiresOn);
    const today = scopeToday(scope);
    if (fiscalProfile?.emissaoForaDoMes === 'BLOQUEAR' && dCompet.slice(0, 7) !== today.slice(0, 7)) {
      faltantes.push(`competência ${dCompet} fora do mês corrente (${today.slice(0, 7)}) e emissaoForaDoMes=BLOQUEAR`);
    }

    const selection = selectDfeEmissor(process.env);
    if (!selection.enabled) faltantes.push(selection.reason ?? 'porta de emissão desabilitada');

    const unitsTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'units');
    const unitRow = unitsTable ? await dynamicTableRepo.findDataById(scope.unitId) : null;
    const unitCnpj = stripCnpjMask(String((unitRow?.data as Record<string, unknown> | undefined)?.cnpj ?? '')).toUpperCase();
    if (!unitCnpj || !isValidCnpj(unitCnpj)) faltantes.push("CNPJ da unidade ausente ou inválido (cadastre em 'units')");

    const anchor = await this.journalEntryRepo.findBySource(scope, 'sale.package.expired', movementKey);
    if (!anchor) faltantes.push("lançamento âncora 'sale.package.expired' ausente — o vencimento não foi contabilizado ainda");

    if (faltantes.length > 0) {
      throw new ValidationError(`emissao_bloqueada: ${faltantes.length} pendência(s) — ver 'faltantes'.`, { faltantes });
    }
    if (ambiente === null) throw new Error('dfe_tpamb_invariant: montagem sem ambiente com a porta habilitada.');

    // Tie-out exato (§5.2 14a): o valor da nota É o vencido, e tem de bater com o crédito 3.4 do lançamento.
    const ledgerCents = await this.sumPostings(scope, anchor!.postings, RECEITA_NAO_USO_CODE, 'credit');
    if (ledgerCents !== context.releasedCents) {
      throw new Error(
        `assembleExpiry: tie-out quebrado — vencido ${context.releasedCents} × crédito 3.4 ${ledgerCents} (${movementKey}).`,
      );
    }

    // L7 (dono, 03/10): "Pacote <nome no catálogo> — saldo não utilizado, vencido em <expiresOn>".
    const packagesTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'packages');
    const packageRow =
      packagesTable && (await dynamicTableRepo.existsByIdInTable(context.packageId, packagesTable.id))
        ? await dynamicTableRepo.findDataById(context.packageId)
        : null;
    const packageName = String((packageRow?.data as Record<string, unknown> | undefined)?.name ?? '').trim();
    const xDescServ = `${packageName ? `Pacote ${packageName}` : 'Pacote'} — saldo não utilizado, vencido em ${parsed.expiresOn}`;

    const fp = fiscalProfile!;
    const profile = this.pacoteServiceProfile(fp);
    const payload = this.buildPayload({
      fp,
      cnpjEmitente: unitCnpj,
      group: { cTribNac: profile.cTribNac, lines: [], profile },
      vServCents: context.releasedCents,
      xDescServ,
      dCompet,
      tomador,
      ambiente,
    });
    return {
      saleId: context.originSaleId!,
      saleKey: movementKey,
      group: { cTribNac: profile.cTribNac, vServCents: context.releasedCents, payload },
      anchorEntryId: anchor!.id,
      serie: fp.dpsSerie,
      dCompet,
      tpRetISSQN: fp.issRetidoTomadorPj ? 2 : 1,
      cnpjEmitente: unitCnpj,
      partnerAccountRef: fp.partnerAccountRef,
    };
  }

  private buildPayload(args: {
    fp: NonNullable<Awaited<ReturnType<FiscalProfileService['get']>>>;
    cnpjEmitente: string;
    group: ServiceLineGroup;
    vServCents: number;
    xDescServ: string;
    dCompet: string;
    tomador: { cnpj?: string; cpf?: string; xNome: string } | null;
    ambiente: DfeAmbiente;
  }): DpsPayload {
    const { fp, group, vServCents, xDescServ, dCompet, tomador } = args;
    const dhEmi = new Date().toISOString();
    const isSimples = fp.regimeTributario === 'SIMPLES';
    return {
      versao: '1.01',
      infDPS: {
        id: buildDpsId(fp.codMun ?? '0000000', args.cnpjEmitente, fp.dpsSerie, 0), // nDPS real é injetado após nextNumber()
        tpAmb: tpAmbFor(args.ambiente),
        dhEmi,
        verAplic: DPS_VERAPLIC,
        serie: fp.dpsSerie,
        nDPS: 1,
        dCompet,
        tpEmit: 1,
        cLocEmi: fp.codMun ?? '0000000',
        prest: {
          CNPJ: args.cnpjEmitente,
          regTrib: {
            opSimpNac: isSimples ? 3 : 1,
            ...(isSimples && fp.regApTribSN ? { regApTribSN: fp.regApTribSN } : {}),
            regEspTrib: fp.regEspTrib,
          },
        },
        toma: tomador
          ? {
              ...(tomador.cnpj ? { CNPJ: tomador.cnpj } : {}),
              ...(tomador.cpf ? { CPF: tomador.cpf } : {}),
              xNome: tomador.xNome || 'Consumidor',
            }
          : { xNome: 'Consumidor' },
        serv: {
          locPrest: { cLocPrestacao: group.profile.cLocPrestacao ?? fp.codMun ?? '0000000' },
          cServ: {
            cTribNac: group.cTribNac,
            ...(group.profile.cTribMun ? { cTribMun: group.profile.cTribMun } : {}),
            xDescServ,
            ...(group.profile.cNBS ? { cNBS: group.profile.cNBS } : {}),
          },
        },
        valores: {
          vServPrest: { vServ: centsToMoneyString(vServCents) },
          trib: {
            tribMun: {
              tribISSQN: 1,
              tpRetISSQN: fp.issRetidoTomadorPj ? 2 : 1,
              ...(fp.issAliquotaBp ? { pAliq: bpToPctString(fp.issAliquotaBp) } : {}),
            },
            totTrib: isSimples
              ? { pTotTribSN: bpToPctString(fp.pTotTribSNCent ?? 0) }
              : {
                  pTotTrib: {
                    pTotTribFed: bpToPctString(fp.pTotTribFedCent ?? 0),
                    pTotTribEst: bpToPctString(fp.pTotTribEstCent ?? 0),
                    pTotTribMun: bpToPctString(fp.pTotTribMunCent ?? 0),
                  },
                },
          },
        },
        ...(fp.ibsCbsInformar && fp.ibsCbsCst && fp.ibsCbsClassTrib
          ? {
              IBSCBS: {
                finNFSe: 0,
                cIndOp: group.profile.cIndOp,
                indDest: 0,
                valores: { trib: { gIBSCBS: { CST: fp.ibsCbsCst, cClassTrib: fp.ibsCbsClassTrib } } },
              },
            }
          : {}),
      },
    } as DpsPayload;
  }

  private classifyTaxId(raw: string): { cnpj?: string; cpf?: string } | null {
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length === 11 && isValidCpf(stripCpfMask(raw))) {
      return { cpf: stripCpfMask(raw) };
    }
    const cnpjCandidate = stripCnpjMask(raw).toUpperCase();
    if (cnpjCandidate.length === 14 && isValidCnpj(cnpjCandidate)) {
      return { cnpj: cnpjCandidate };
    }
    return null;
  }

  private async sumPostings(
    scope: AccountingScope,
    postings: Array<{ accountId: string; debitCents: bigint; creditCents: bigint }>,
    accountCode: string,
    side: 'debit' | 'credit',
  ): Promise<number> {
    const account = await this.accountRepo.findByCode(scope, accountCode);
    if (!account) return 0;
    return postings
      .filter((p) => p.accountId === account.id)
      .reduce((sum, p) => sum + centsFromDb(side === 'debit' ? p.debitCents : p.creditCents), 0);
  }

  private toView(doc: FiscalDocumentWithAttempts, pendencias: string[] = []): FiscalDocumentView {
    return {
      id: doc.id,
      kind: doc.kind,
      status: doc.status,
      saleId: doc.saleId,
      cTribNac: doc.cTribNac,
      anchorEntryId: doc.anchorEntryId,
      ambiente: doc.ambiente,
      partner: doc.partner,
      partnerRef: doc.partnerRef,
      serie: doc.serie,
      numero: doc.numero == null ? null : String(doc.numero),
      nNFSe: doc.nNFSe,
      chaveOuCodigo: doc.chaveOuCodigo,
      dCompet: doc.dCompet,
      vServCents: String(doc.vServCents),
      tpRetISSQN: doc.tpRetISSQN,
      vIssCents: doc.vIssCents == null ? null : String(doc.vIssCents),
      vIbsCents: doc.vIbsCents == null ? null : String(doc.vIbsCents),
      vCbsCents: doc.vCbsCents == null ? null : String(doc.vCbsCents),
      currentAttemptNo: doc.currentAttemptNo,
      authorizedAt: doc.authorizedAt ? doc.authorizedAt.toISOString() : null,
      cancelledAt: doc.cancelledAt ? doc.cancelledAt.toISOString() : null,
      errors: doc.errorsJson ? JSON.parse(doc.errorsJson) : [],
      sourceDocumentId: doc.sourceDocumentId,
      attempts: doc.attempts.map((a) => ({
        attemptNo: a.attemptNo,
        ref: a.ref,
        sentAt: a.sentAt.toISOString(),
        resultStatus: a.resultStatus,
      })),
      pendencias,
      xmlAttachmentId: doc.xmlAttachmentId ?? null,
      pdfAttachmentId: doc.pdfAttachmentId ?? null,
      releitura: readReleitura(doc.attempts.find((a) => a.attemptNo === doc.currentAttemptNo)?.resultJson),
    };
  }
}
