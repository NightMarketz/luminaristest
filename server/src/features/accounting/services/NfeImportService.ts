import { ForbiddenError, ValidationError } from '../../../lib/errors';
import { parseNfe } from '../../../lib/nfe';
import type { NfeItem, NfeTotais, ParsedNfe } from '../../../lib/nfe';
import { MAX_CENTS } from '../models/money';
import type { CreatePayableInput } from '../dtos/PayableDto';
import type { ImportNfePurchaseInput } from '../dtos/NfeDto';
import type { PayableService } from './PayableService';
import type { AuditService } from './AuditService';
import type { ICounterpartyRepository } from '../repositories/ICounterpartyRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';
import type { Payable } from 'generated/prisma';

/**
 * NfeImportService — fiscal NF-e de COMPRA (BE-INCR-NFE / A2). Integration service (Contract §2.1 / T10):
 * it lives OUTSIDE the DynamicTable plugin engine and it NEVER posts to the ledger directly. It (1) parses
 * the XML through the PURE `lib/nfe.ts`, (2) computes the acquisition cost (D3) and rateia it across the
 * note items, and (3) drives ONE `PayableService.createPayable` for the WHOLE note (F-NFE7→a: 1 nota = 1
 * passivo total, débito 1.1.6 Estoques / crédito 2.1.2). The per-SKU StockMovement INBOUNDs are driven by
 * `createPayable` itself (it owns the AP→estoque bridge / inventoryService), keyed on `sourceId=payableId`
 * with each item's rateio share — so this service needs no inventory dep and all money still flows through
 * the proved `createPayable` path (NUNCA `postEntry` direto).
 *
 * Invariants:
 * - Cost D3 (F-NFE6): `vProd − vDesc + vFrete + vOutro + vIPI + vST` from the note totals; ICMS próprio
 *   (`vICMS`) is NOT subtracted (MVP = tenant não-contribuinte, molde salão — the ALTO risk named in the
 *   plan §6 / ADR §6.1; the tie-out validates DISTRIBUTION, not regime).
 * - Rateio (Gate 1, ACC-014/T4): each item's share is `floor(total × vProd_item / Σ vProd)`, with the
 *   rounding residue absorbed by the LAST line → `Σ shares === custoTotalCents`. Integer-cent arithmetic
 *   only; no float boundary is crossed.
 * - Idempotency (Gate 2, T7): the business key is `documentNumber = chaveAcesso` (the 44-digit access key —
 *   the HUMAN externalRef, NEVER a `sourceId`). A re-import trips the `Payable` @@unique and `createPayable`
 *   rejects loud — so the note can never mint a second passivo/estoque. The rejection is NOT swallowed
 *   (erro-especifico-para-skip discipline: a broad catch would hide a real bug).
 * - Counterparty (D6): the emitente is NEVER auto-created. If the operator confirmed a `counterpartyId`, it
 *   is re-scoped here and must be a live SUPPLIER of this unit; absent, the payable keeps only the
 *   `supplierName` snapshot (mirrors ordinary payables). A `cStat`/`mod`/`tpAmb` failure is rejected inside
 *   `parseNfe` (D5) before any of this runs.
 * - Item→produto (D6): EVERY note item must carry an operator mapping `cProd → productRef`; an unmapped
 *   item rejects loud (never a silent skip, never an auto-created product).
 */
export class NfeImportService {
  constructor(
    private readonly payableService: PayableService,
    private readonly counterpartyRepo: ICounterpartyRepository,
    private readonly policy: IAccountingPolicy,
    // Held for the `nfe.purchase_imported` domain event wired in Fase B (B-4 owns the audit canonical
    // allowlist). The MONEY trail is already append-only audited by the reused createPayable
    // (`payable.created`) and receiveStock (`inventory.received`) — this service adds no ledger write of
    // its own, so it emits no canonical event in this slice (mirrors the optional-pre-wiring precedent
    // PayableService.inventoryService).
    private readonly auditService: AuditService,
  ) {}

  /**
   * Import a purchase NF-e: parse → cost D3 → rateio → ONE createPayable (multi-item) carrying the total
   * liability + N StockMovement INBOUND (driven inside createPayable, sourceId=payableId). Returns the
   * created `Payable`. Rejects loud on any gate failure (unauthorized cStat, unmapped item, unconfirmed
   * counterparty, MAX_CENTS overflow, re-import).
   */
  async importPurchase(
    scope: AccountingScope,
    xml: string | Buffer,
    dto: ImportNfePurchaseInput,
  ): Promise<Payable> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para importar notas de compra.');
    }

    // Parse (PURE) — rejects loud on cStat∉{100,150}, mod≠55, homologação, DTD/XXE, chave mismatch (D5).
    const nfe = parseNfe(xml);

    // Counterparty D6 — NEVER auto-create the emitente. If the operator confirmed a counterpartyId,
    // re-scope it (defense-in-depth; createPayable re-scopes again) and require a live SUPPLIER. Absent,
    // the payable keeps only the supplierName snapshot.
    const counterpartyId = await this.resolveConfirmedCounterparty(scope, dto.counterpartyId);

    const supplierName = this.resolveSupplierName(nfe);

    // Item→produto D6 — every note item needs an operator mapping cProd→productRef. Build the lookup and
    // reject the whole import if any item is unmapped (loud, never a silent skip).
    const mappingByCProd = new Map(dto.itemMappings.map((m) => [m.cProd, m.productRef]));

    // Cost D3 (F-NFE6) + rateio. The per-item shares sum EXACTLY to custoTotalCents (residue on last).
    const custoTotalCents = this.acquisitionCost(nfe.totais);
    if (custoTotalCents <= 0) {
      throw new ValidationError('NF-e de compra com custo de aquisição não positivo — rejeitada.');
    }
    if (custoTotalCents > MAX_CENTS) {
      throw new ValidationError(
        `NF-e de compra excede o teto de centavos suportado (${custoTotalCents} > ${MAX_CENTS}).`,
      );
    }
    const inventoryItems = this.allocate(nfe.itens, custoTotalCents, mappingByCProd);

    const issueDate = nfe.ide.dhEmiDate; // YYYY-MM-DD (reslice literal from the parser)

    // ONE createPayable for the whole note (F-NFE7→a). documentNumber = chaveAcesso (the human externalRef
    // AND the @@unique business key → idempotency; a re-import trips P2002 and createPayable rejects loud).
    const input: CreatePayableInput = {
      unitId: scope.unitId,
      supplierName,
      counterpartyId: counterpartyId ?? undefined,
      documentNumber: nfe.chaveAcesso,
      description: this.purchaseDescription(nfe, supplierName),
      issueDate,
      dueDate: dto.dueDate ?? issueDate,
      amountCents: custoTotalCents,
      inventoryMultiItem: true,
      inventoryItems,
    };

    return this.payableService.createPayable(scope, input);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Cost D3 (F-NFE6): `vProd − vDesc + vFrete + vOutro + vIPI + vST` (integer cents; ICMS próprio NOT
   *  subtracted — the named ALTO risk). Ties out to `vNF` for a fully-taxed não-contribuinte note. */
  private acquisitionCost(t: NfeTotais): number {
    return t.vProdCents - t.vDescCents + t.vFreteCents + t.vOutroCents + t.vIPICents + t.vSTCents;
  }

  /**
   * Rateia `custoTotalCents` across the note items proportional to each item's `vProdCents`, with the
   * rounding residue on the LAST line so `Σ shares === custoTotalCents` (Gate 1). Floor for all-but-last
   * keeps every share ≤ its proportional value, so the last (residue) line is always ≥ 0. Every item must
   * have an operator mapping (D6) — an unmapped `cProd` rejects loud.
   */
  private allocate(
    itens: NfeItem[],
    custoTotalCents: number,
    mappingByCProd: Map<string, string>,
  ): NonNullable<CreatePayableInput['inventoryItems']> {
    const totalWeight = itens.reduce((acc, it) => acc + it.vProdCents, 0);
    if (totalWeight <= 0) {
      throw new ValidationError('NF-e de compra sem valor de produtos (Σ vProd = 0) — rejeitada.');
    }

    let allocated = 0;
    const lastIdx = itens.length - 1;
    return itens.map((it, idx) => {
      const productRef = mappingByCProd.get(it.cProd);
      if (!productRef) {
        throw new ValidationError(
          `Item '${it.cProd}' (${it.xProd}) não tem mapeamento de produto confirmado (D6) — rejeitado.`,
        );
      }
      const share = idx === lastIdx
        ? custoTotalCents - allocated
        : Math.floor((custoTotalCents * it.vProdCents) / totalWeight);
      allocated += share;
      return {
        productRef,
        qty: this.qComToUnits(it.qCom, it.cProd),
        valueCents: share,
        description: it.xProd,
      };
    });
  }

  /**
   * `qCom` has VARIABLE decimals (0-4). The inventory subledger holds INTEGER units (fractional units are
   * out of MVP). Convert by STRING inspection (never `Number()×…`): a non-zero fractional part rejects loud
   * rather than silently truncating a real fraction.
   */
  private qComToUnits(qCom: string, cProd: string): number {
    const s = qCom.trim();
    const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
    if (!m) {
      throw new ValidationError(`NF-e inválida: quantidade '${qCom}' do item '${cProd}' mal-formada.`);
    }
    if (m[2] && /[^0]/.test(m[2])) {
      throw new ValidationError(
        `Quantidade fracionária ('${qCom}') do item '${cProd}' não é suportada no MVP (apenas unidades inteiras).`,
      );
    }
    const units = Number(m[1]);
    if (units <= 0) {
      throw new ValidationError(`NF-e inválida: quantidade '${qCom}' do item '${cProd}' deve ser positiva.`);
    }
    return units;
  }

  /** Emitente display snapshot (never auto-creates a Counterparty). Prefers xNome, falls back to CNPJ/CPF. */
  private resolveSupplierName(nfe: ParsedNfe): string {
    const name = nfe.emit.nome ?? nfe.emit.cnpj ?? nfe.emit.cpf;
    if (!name) {
      throw new ValidationError('NF-e inválida: emitente sem nome/CNPJ/CPF — não é possível identificar o fornecedor.');
    }
    return name;
  }

  /** D6: re-scope an operator-confirmed counterpartyId and require a live SUPPLIER of this unit; a
   *  cross-tenant / archived / non-supplier id rejects loud. Absent → no link (supplierName snapshot only). */
  private async resolveConfirmedCounterparty(
    scope: AccountingScope,
    counterpartyId: string | undefined,
  ): Promise<string | null> {
    if (!counterpartyId) return null;
    const counterparty = await this.counterpartyRepo.findById(scope, counterpartyId);
    if (!counterparty) {
      throw new ValidationError('Contraparte (emitente) informada não existe nesta unidade.');
    }
    if (counterparty.type !== 'SUPPLIER') {
      throw new ValidationError('A contraparte de uma NF-e de compra deve ser um fornecedor (SUPPLIER).');
    }
    return counterparty.id;
  }

  private purchaseDescription(nfe: ParsedNfe, supplierName: string): string {
    return `NF-e compra ${nfe.ide.serie}-${nfe.ide.numero} — ${supplierName}`;
  }
}
