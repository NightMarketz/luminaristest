import type { FiscalDocument } from 'generated/prisma';
import { ForbiddenError, ValidationError } from '../../../lib/errors';
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
import { DpsPayloadSchema } from '../dtos/DpsPayloadDto';
import type { DpsPayload } from '../dtos/DpsPayloadDto';
import { selectDfeEmissor } from '../dfe/selectDfeEmissor';
import type { DfeAmbiente, DfeEmissorPort } from '../dfe/DfeEmissorPort';
import { scopeToday } from '../models/dates';
import { centsFromDb } from '../models/money';
import { findLc116 } from '../models/lc116ListaNacional';

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
}

function centsToMoneyString(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

function bpToPctString(bp: number): string {
  return (bp / 100).toFixed(2);
}

/** [102]: "DPS" + cMun7 + tpInsc1 + insc14 + serie5 + nDPS15 (42 dígitos após o prefixo). */
function buildDpsId(cMun: string, cnpj: string, serie: number, nDPS: number): string {
  return `DPS${cMun}1${cnpj.padStart(14, '0')}${String(serie).padStart(5, '0')}${String(nDPS).padStart(15, '0')}`;
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
      const assembly = await this.assemble(scope, saleId, kind);
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
    const assembly = await this.assemble(scope, saleId, kind);
    const selection = selectDfeEmissor(process.env);
    if (!selection.enabled) {
      throw new ValidationError(`dfe_disabled: ${selection.reason}`, { faltantes: [selection.reason ?? 'porta desabilitada'] });
    }

    const created: FiscalDocumentWithAttempts[] = [];
    for (const group of assembly.groups) {
      const doc = await this.repo.runTransaction(async (tx) => {
        let numero: bigint | null = null;
        if (!selection.port.capabilities.numbersDps) {
          numero = await this.repo.nextNumber(scope, kind, assembly.serie, tx);
        }
        const payload = { ...group.payload };
        if (numero != null) {
          payload.infDPS = { ...payload.infDPS, nDPS: Number(numero) };
        }
        DpsPayloadSchema.parse(payload); // valida ANTES de persistir (payload inválido = bug nosso, não 400)
        const createdDoc = await this.repo.createSent(
          scope,
          {
            kind,
            saleId,
            cTribNac: group.cTribNac,
            anchorEntryId: assembly.anchorEntryId,
            ambiente: selection.ambiente as DfeAmbiente,
            partner: selection.port.name,
            serie: assembly.serie,
            numero,
            dCompet: assembly.dCompet,
            vServCents: BigInt(group.vServCents),
            tpRetISSQN: assembly.tpRetISSQN,
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
          cnpjEmitente: assembly.cnpjEmitente,
          partnerAccountRef: assembly.partnerAccountRef,
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
      created.push(doc);
    }
    return created.map((d) => this.toView(d));
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
      if ((saleStatus === 'Cancelled' || saleStatus === 'Returned') && doc.status === 'AUTHORIZED') {
        pendencias.push('sale_cancelled_with_live_document');
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
  ): Promise<{ vServCents: number; payload: DpsPayload; cnpjEmitente: string; partnerAccountRef: string | null }> {
    const assembly = await this.assemble(scope, saleId, kind);
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
        // LACUNA DE SPEC: o BRIEF (item 21) não define qual cTribNac representa o pacote em si — só
        // diz de onde vem o valor (débito 1.1.2) e a descrição (nome do pacote). Sem um código real da
        // lista nacional, emitir inventaria um dado fiscal — recusa loud em vez de placeholder.
        faltantes.push(
          "pacote VENDA: BRIEF não define o cTribNac do pacote (item 21) — lacuna de spec, decisão do dono pendente",
        );
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
    const liveDocs = validSale ? await this.repo.findLiveBySale(scope, saleId, kind) : [];

    // (vii) emissaoForaDoMes = BLOQUEAR e competência cruzou o mês.
    const dCompet = typeof saleData.date === 'string' ? saleData.date : '';
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
      const profile = pacoteVenda
        ? ({ cTribNac: fiscalProfile!.regimeTributario === 'SIMPLES' ? '' : '', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null, xDescServ: null } as unknown as ServiceFiscalProfileView)
        : profileByServiceRef.get(line.serviceRef)!;
      const cTribNac = pacoteVenda ? this.packageCTribNac(fiscalProfile!) : profile.cTribNac;
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

  private packageCTribNac(fp: { regimeTributario: string }): string {
    void fp;
    // ponytail: pacote VENDA não tem serviço específico associado — usa uma chave própria,
    // válida como código de 6 dígitos formal só para o agrupamento interno (nunca vai à rede
    // sem que o operador cadastre um ServiceFiscalProfile real para o pacote — lacuna nomeada).
    return '000000';
  }

  private buildPayload(args: {
    fp: NonNullable<Awaited<ReturnType<FiscalProfileService['get']>>>;
    cnpjEmitente: string;
    group: ServiceLineGroup;
    vServCents: number;
    xDescServ: string;
    dCompet: string;
    tomador: { cnpj?: string; cpf?: string; xNome: string } | null;
  }): DpsPayload {
    const { fp, group, vServCents, xDescServ, dCompet, tomador } = args;
    const dhEmi = new Date().toISOString();
    const isSimples = fp.regimeTributario === 'SIMPLES';
    return {
      versao: '1.01',
      infDPS: {
        id: buildDpsId(fp.codMun ?? '0000000', args.cnpjEmitente, fp.dpsSerie, 0), // nDPS real é injetado após nextNumber()
        tpAmb: 1,
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
    };
  }
}
