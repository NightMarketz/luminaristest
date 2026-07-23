import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { parseNfe } from '../../../lib/nfe';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { PostingService } from './PostingService';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * NfeSaleReconciliationService — NF-e de VENDA × venda de salão já lançada (BE-INCR-NFE, A3 / D2b).
 *
 * Intenção (T1): NÃO relançar a venda. A receita + CMV já foram postados pela ponte de salão
 * ('salon.sale.finalized'); esta fatia apenas CRUZA a NF-e fiscal com o lançamento existente,
 * anexa a proveniência (chave de acesso) e RETORNA um relatório de divergência. É o único caminho
 * do módulo que toca um lançamento já postado — por isso ele NUNCA posta (0 lançamentos novos):
 * se postasse, duplicaria receita + CMV (risco ALTO nomeado no plano §6).
 *
 * Fronteira (§2.1 / T10): o parser (`lib/nfe.ts`) é biblioteca PURA; a escrita de proveniência
 * pertence ao dono do seam (`PostingService.attachSourceDocument`, O-1). Este serviço NÃO injeta
 * `ISourceProvenanceRepository` — mantém um dono só para a escrita de proveniência.
 *
 * F-NFE8 → (a): a âncora é o `saleId` EXPLÍCITO do operador (o XML não o carrega). Uma NF-e de
 * venda sem lançamento correspondente → rejeita LOUD (nunca escolhe a venda sozinha).
 */

/** O sourceType da receita da venda de salão — a chave de negócio da âncora (D2b). */
const SALE_SOURCE_TYPE = 'salon.sale.finalized';

/** Entrada do serviço: `saleId` (validado por `ImportNfeSaleSchema` em `dtos/NfeDto.ts`, F-NFE8) +
 *  o XML cru da NF-e. */
export interface NfeSaleReconciliationInput {
  saleId: string;
  xml: string | Buffer;
}

/**
 * Relatório de reconciliação (SEM lançamento). Carrega os totais de ambos os lados, o resultado
 * do tie-out (`totalMatches`) e as divergências em linguagem humana para o operador decidir.
 */
export interface NfeSaleReconciliationReport {
  /** A âncora foi encontrada e a proveniência anexada (sempre true — órfã rejeita antes). */
  matched: true;
  saleId: string;
  /** Lançamento de receita já postado ao qual a NF-e foi vinculada. */
  journalEntryId: string;
  /** Chave de acesso da NF-e (44 díg.) — o externalRef HUMANO da proveniência (T7). */
  chaveAcesso: string;
  /** SourceDocument anexado pelo seam O-1 (exatamente 1 por (lançamento, chave)). */
  sourceDocumentId: string;
  /** Total da NF-e (vNF, centavos Int). */
  nfeTotalCents: number;
  /** Total lançado da venda (Σ débito do lançamento de receita, centavos Int). */
  saleTotalCents: number;
  /** Nº de itens na NF-e (informativo — o lançamento não guarda itens). */
  nfeItemCount: number;
  /** true quando `nfeTotalCents === saleTotalCents`. */
  totalMatches: boolean;
  /** `nfeTotalCents - saleTotalCents` (com sinal). 0 quando casa. */
  differenceCents: number;
  /** Divergências em texto para o operador. Vazio quando tudo casa. */
  divergences: string[];
}

export class NfeSaleReconciliationService {
  constructor(
    private readonly journalEntryRepo: IJournalEntryRepository,
    private readonly postingService: PostingService,
    private readonly policy: IAccountingPolicy,
    // Emite `nfe.sale_matched` (B-4). Este serviço não escreve nada próprio — a proveniência é
    // gravada (e auditada como `entry.source_recorded`) DENTRO da tx do dono do seam — então o
    // evento do cruzamento é anexado em tx própria logo depois.
    private readonly auditService: AuditService,
  ) {}

  /**
   * Cruza a NF-e de venda com a venda já lançada (ancorada por `saleId`), anexa a proveniência e
   * retorna o relatório de divergência. NUNCA posta. Órfã (sem lançamento) → `NotFoundError`.
   */
  async reconcileSale(
    scope: AccountingScope,
    input: NfeSaleReconciliationInput,
  ): Promise<NfeSaleReconciliationReport> {
    if (!this.policy.canReconcile(scope)) {
      throw new ForbiddenError('Você não tem permissão para reconciliar NF-e de venda.');
    }

    // Parser PURO — rejeita loud (cStat != 100/150, modelo != 55, homologação, DTD/XXE, chave).
    // Nenhuma regra de negócio aqui: só normalização (T3/T10).
    const nfe = parseNfe(input.xml);

    // ÂNCORA (F-NFE8 → (a)) — a venda tem de estar lançada; o operador fornece o saleId. Casar por
    // valor/data seria heurística que anexa à venda errada num salão com vendas repetidas no dia.
    const anchor = await this.journalEntryRepo.findBySource(scope, SALE_SOURCE_TYPE, input.saleId);
    if (!anchor) {
      throw new NotFoundError(
        `NF-e de venda órfã: nenhuma venda lançada para saleId '${input.saleId}' ` +
          `(${SALE_SOURCE_TYPE}). Informe a venda correspondente.`,
      );
    }

    // Total lançado da venda = Σ débito do lançamento de receita (balanceado ⇒ == Σ crédito).
    const saleTotalCents = anchor.postings.reduce((acc, p) => acc + p.debitCents, 0);
    const nfeTotalCents = nfe.totais.vNFCents;
    const differenceCents = nfeTotalCents - saleTotalCents;
    const totalMatches = differenceCents === 0;

    const divergences: string[] = [];
    if (!totalMatches) {
      // SINALIZA, não bloqueia (D2b): a divergência é um alerta para o humano, não um post.
      divergences.push(
        `Total da NF-e (${nfeTotalCents} centavos) diverge do total lançado da venda ` +
          `(${saleTotalCents} centavos): diferença de ${differenceCents} centavos.`,
      );
    }

    // Anexa a proveniência ao lançamento JÁ postado — via o dono do seam (O-1). A chave de acesso
    // é o externalRef HUMANO (T7), nunca um sourceId. NUNCA chama postEntry ⇒ 0 lançamentos novos.
    // Anexa mesmo com divergência: a nota fica vinculada à venda que o operador escolheu, e a
    // discrepância viaja no relatório para conferência.
    const sourceDocument = await this.postingService.attachSourceDocument(scope, anchor.id, {
      sourceType: anchor.sourceType,
      externalRef: nfe.chaveAcesso,
      documentDate: nfe.ide.dhEmiDate,
      description: `NF-e ${nfe.ide.numero}/${nfe.ide.serie}`,
    });

    // Evento do cruzamento (B-4). Só ids + centavos-como-string. A chave de acesso não se repete AQUI
    // porque seria cópia redundante — e não porque fique fora do trilho: o `attachSourceDocument` acima
    // já a gravou na MESMA cadeia como `entry.source_recorded.externalRef` (allowlistado), além de
    // `SourceDocument.externalRef`. Se a chave for um dia classificada como PII de terceiro (dígitos
    // 7-20 = CNPJ do emitente), é aquele evento — não esta lista — que precisa mudar.
    await this.auditService.appendInOwnTransaction(scope, {
      actorUserId: scope.actorUserId,
      eventType:   'nfe.sale_matched',
      targetType:  'journal_entry',
      targetId:    anchor.id,
      payload: {
        saleId:           input.saleId,
        journalEntryId:   anchor.id,
        sourceDocumentId: sourceDocument.id,
        nfeTotalCents:    String(nfeTotalCents),
        saleTotalCents:   String(saleTotalCents),
        differenceCents:  String(differenceCents),
        totalMatches:     String(totalMatches),
      },
    });

    // Log operacional: SEM a chave de acesso. Ela é o dado que este mesmo arquivo trata como sensível
    // (dígitos 7-20 = CNPJ do emitente) e o log de aplicação não é o trilho imutável — sai do texto
    // corrido e permanece resolvível por `sourceDocumentId` → `SourceDocument.externalRef`.
    logger.info('NF-e de venda reconciliada (sem lançamento)', {
      saleId: input.saleId,
      journalEntryId: anchor.id,
      sourceDocumentId: sourceDocument.id,
      totalMatches,
      differenceCents,
    });

    return {
      matched: true,
      saleId: input.saleId,
      journalEntryId: anchor.id,
      chaveAcesso: nfe.chaveAcesso,
      sourceDocumentId: sourceDocument.id,
      nfeTotalCents,
      saleTotalCents,
      nfeItemCount: nfe.itens.length,
      totalMatches,
      differenceCents,
      divergences,
    };
  }
}
