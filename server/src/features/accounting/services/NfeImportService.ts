import { ForbiddenError, ValidationError } from '../../../lib/errors';
import { parseNfe } from '../../../lib/nfe';
import type { NfeItem, NfeTotais, ParsedNfe } from '../../../lib/nfe';
import { MAX_CENTS } from '../models/money';
import type { CreatePayableInput } from '../dtos/PayableDto';
import type { ImportNfePurchaseInput } from '../dtos/NfeDto';
import type { PayableService } from './PayableService';
import type { FiscalProfileService } from './FiscalProfileService';
import { acquisitionCost, type AcquisitionCost } from '../../../lib/nfeCost';
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
 * - Cost D3 (F-NFE6): `vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vST` from the note totals; ICMS
 *   próprio (`vICMS`) is NOT subtracted (MVP = tenant não-contribuinte, molde salão — the ALTO risk named
 *   in the plan §6 / ADR §6.1; the tie-out validates DISTRIBUTION, not regime).
 * - Rateio (Gate 1, ACC-014/T4): each item's share is `floor(total × vProd_item / Σ vProd)`, with the
 *   rounding residue absorbed by the LAST line → `Σ shares === custoTotalCents`. Integer-cent arithmetic
 *   only; no float boundary is crossed — the `total × vProd_item` PRODUCT is computed in `BigInt`
 *   (`Number` multiplication of two large cent values can exceed 2^53 and silently lose precision).
 * - `indTot` (MOC I17b, layout transcription §I17b): a line with `indTot === '0'` does NOT compose the
 *   note total (`vNF`), so it carries NO acquisition cost — it is excluded from the rateio WEIGHT and
 *   from the stock entry, and REPORTED back in `ignoredItems` (never a silent drop).
 * - Idempotency (Gate 2, T7): the business key is `documentNumber = chaveAcesso` (the 44-digit access key —
 *   the HUMAN externalRef, NEVER a `sourceId`). A re-import trips the `Payable` @@unique and `createPayable`
 *   rejects loud — so the note can never mint a second passivo/estoque. The rejection is NOT swallowed
 *   (erro-especifico-para-skip discipline: a broad catch would hide a real bug).
 * - Counterparty (D6): the emitente is NEVER auto-created. If the operator confirmed a `counterpartyId`, it
 *   is re-scoped here and must be a live SUPPLIER of this unit; absent, the payable keeps only the
 *   `supplierName` snapshot (mirrors ordinary payables). A `cStat`/`mod`/`tpAmb` failure is rejected inside
 *   `parseNfe` (D5) before any of this runs.
 * - Item→produto (D6): EVERY COSTED note item must carry an operator mapping `cProd → productRef`; an
 *   unmapped item rejects loud (never a silent skip, never an auto-created product). Lines excluded by
 *   `indTot='0'` never reach the subledger, so they need no mapping.
 */
/**
 * A note line the import DID NOT cost/receive. Today the only reason is `indTot === '0'` (the line does
 * not compose the note total, MOC I17b). Reported back to the operator so an ignored line is a VISIBLE
 * decision, never a silent drop (param-aceito-e-ignorado-e-bug).
 */
export interface NfeIgnoredItem {
  nItem: number;
  cProd: string;
  xProd: string;
  reason: 'indTot-0';
}

/** CFOPs de entrada de imobilizado (compra para o ativo imobilizado — dentro e fora do estado). Um
 *  item com um destes CFOPs NUNCA compõe o rateio de estoque (BE-INCR-FIXED-ASSETS PR-5 / F-FA12 →
 *  a; ADR §F-FA3 (b)) — sai para `fixedAssetItems` mesmo que o operador não tenha mapeado nada
 *  (mapeamento ausente/errado rejeita loud, nunca cai em silêncio no estoque). */
const FIXED_ASSET_CFOPS = new Set(['1551', '2551']);

/** Result of a purchase import: the created liability + the lines that were deliberately ignored. */
export interface NfePurchaseImportResult {
  payable: Payable;
  ignoredItems: NfeIgnoredItem[];
}

export class NfeImportService {
  constructor(
    private readonly payableService: PayableService,
    private readonly counterpartyRepo: ICounterpartyRepository,
    private readonly policy: IAccountingPolicy,
    private readonly fiscalProfile: FiscalProfileService,
  ) {}

  /**
   * Import a purchase NF-e: parse → cost D3 → rateio → ONE createPayable (multi-item) carrying the total
   * liability + N StockMovement INBOUND (driven inside createPayable, sourceId=payableId). Returns the
   * created `Payable` PLUS the lines that did not compose the note total (`indTot='0'`) and were
   * therefore neither costed nor received. Rejects loud on any gate failure (unauthorized cStat,
   * unmapped item, unconfirmed counterparty, MAX_CENTS overflow, re-import).
   */
  async importPurchase(
    scope: AccountingScope,
    xml: string | Buffer,
    dto: ImportNfePurchaseInput,
  ): Promise<NfePurchaseImportResult> {
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

    // Item→produto D6 — every note item needs an operator mapping cProd→productRef (estoque) OU
    // cProd→classId (imobilizado, PR-5). Build both lookups and reject the whole import if any item
    // is unmapped or mapped to the wrong shape for its CFOP (loud, never a silent skip/misroute).
    const productRefByCProd = new Map(
      dto.itemMappings.filter((m) => m.productRef != null).map((m) => [m.cProd, m.productRef!]),
    );
    const classIdByCProd = new Map(
      dto.itemMappings.filter((m) => m.classId != null).map((m) => [m.cProd, m.classId!]),
    );

    // X6: custo POR REGIME (BRIEF itens 6–11 + EMENDA 2026-09-15). Sem perfil fiscal → 400 (F-X6-6 a).
    // `amountCents` = custo BRUTO (o que se deve ao fornecedor, F-X6-8 a); o estoque recebe o LÍQUIDO;
    // a diferença nasce como crédito a recuperar no MESMO entry (recoverableTaxLines).
    const regime = await this.fiscalProfile.requireCostRegime(scope);
    const costed = nfe.itens.filter((it) => it.indTot !== '0');
    const custo = acquisitionCost(nfe, costed, regime);
    const custoTotalCents = custo.custoBrutoCents;
    if (custoTotalCents <= 0) {
      throw new ValidationError('NF-e de compra com custo de aquisição não positivo — rejeitada.');
    }
    if (custoTotalCents > MAX_CENTS) {
      throw new ValidationError(
        `NF-e de compra excede o teto de centavos suportado (${custoTotalCents} > ${MAX_CENTS}).`,
      );
    }
    const recoverableTaxLines = this.recoverableLines(custo, regime);
    const { inventoryItems, fixedAssetItems, ignoredItems } = this.allocate(
      nfe.itens,
      custo,
      productRefByCProd,
      classIdByCProd,
    );

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
      // F-FA12 → a (nota mista): uma NF-e 100% CFOP 1551/2551 tem `inventoryItems=[]` — o modo 3
      // (multi-item) fica de pé só pelo `fixedAssetItems` (o DTO aceita "ao menos um dos dois").
      ...(inventoryItems.length > 0 ? { inventoryItems } : {}),
      ...(fixedAssetItems.length > 0 ? { fixedAssetItems } : {}),
      ...(recoverableTaxLines.length > 0 ? { recoverableTaxLines } : {}),
    };

    const payable = await this.payableService.createPayable(scope, input);

    // Sem evento `nfe.*` próprio (decisão A / T8): auditoria é IN-TX, e este serviço de integração não
    // possui transação própria para anexar um evento. A ingestão fiscal já está no trilho imutável,
    // gravada IN-TX pela escrita que de fato ocorreu — `payable.created` (dentro de createPayable),
    // `inventory.received` por item, e a chave de acesso como `entry.source_recorded.externalRef` (o
    // externalRef HUMANO). Um evento em 2ª tx poderia falhar DEPOIS do dinheiro commitar → `Payable`
    // sem evento e sem reemissão possível (bate no @@unique no reimport). O que se perde é só o
    // `itemCount` informativo, recuperável do próprio `Payable`.
    return { payable, ignoredItems };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Cost D3 (F-NFE6): `vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vST` (integer cents; ICMS próprio
   *  NOT subtracted — the named ALTO risk). `vSeg` (seguro) É custo de aquisição e compõe o `vNF` (decisão
   *  E): sem ele, uma nota com seguro criaria passivo MENOR que a nota e o pagamento full-balance quitaria
   *  a menos. Ties out to `vNF` for a fully-taxed não-contribuinte note. */
  /**
   * X6 F-X6-8 (a): créditos a recuperar → linhas do mesmo entry, em contas do `FiscalProfile`. Crédito > 0
   * sem conta configurada → 400 nomeado (os códigos são do contador, BRIEF §5) — nunca conta inventada.
   */
  private recoverableLines(
    custo: AcquisitionCost,
    regime: { icmsRecuperavelAccountId: string | null; pisCofinsRecuperavelAccountId: string | null },
  ): NonNullable<CreatePayableInput['recoverableTaxLines']> {
    const lines: NonNullable<CreatePayableInput['recoverableTaxLines']> = [];
    if (custo.creditoIcmsCents > 0) {
      if (!regime.icmsRecuperavelAccountId) {
        throw new ValidationError(
          `recoverable_account_not_configured: a nota gera ${custo.creditoIcmsCents} centavos de crédito de ICMS e o perfil fiscal não tem icmsRecuperavelAccountId (PUT /api/accounting/fiscal-profile — código é do contador).`,
        );
      }
      lines.push({ accountId: regime.icmsRecuperavelAccountId, amountCents: custo.creditoIcmsCents, kind: 'ICMS' });
    }
    if (custo.creditoPisCofinsCents > 0) {
      if (!regime.pisCofinsRecuperavelAccountId) {
        throw new ValidationError(
          `recoverable_account_not_configured: a nota gera ${custo.creditoPisCofinsCents} centavos de crédito de PIS/COFINS e o perfil fiscal não tem pisCofinsRecuperavelAccountId (PUT /api/accounting/fiscal-profile — código é do contador).`,
        );
      }
      lines.push({ accountId: regime.pisCofinsRecuperavelAccountId, amountCents: custo.creditoPisCofinsCents, kind: 'PIS_COFINS' });
    }
    return lines;
  }

  /**
   * Rateia `custoTotalCents` across the note items proportional to each item's `vProdCents`, with the
   * rounding residue on the LAST line so `Σ shares === custoTotalCents` (Gate 1). Floor for all-but-last
   * keeps every share ≤ its proportional value, so the last (residue) line is always ≥ 0. Every costed
   * item must have an operator mapping (D6) — an unmapped `cProd` rejects loud.
   *
   * `indTot === '0'` (MOC I17b) marks a line that does NOT compose the note total: it has no share of the
   * acquisition cost, so it is excluded from the WEIGHT and from the stock entry, and returned in
   * `ignoredItems` for the operator (an ignored line is reported, never silently dropped). Such a line
   * needs no cProd→productRef mapping — it never reaches the subledger.
   *
   * The rateio stays PER NOTE LINE (that is what ties Σ shares to the note total); the per-SKU
   * AGGREGATION of duplicate `productRef`s happens at the stock step (`PayableService`), where the
   * INBOUNDs are driven.
   *
   * The `custoTotalCents × vProd_item` product is computed in `BigInt`: both factors are cents and their
   * `Number` product can exceed `Number.MAX_SAFE_INTEGER` (e.g. 2e9 × 1e9), which would silently drift.
   * BigInt division truncates toward zero — identical to `Math.floor` for these non-negative values.
   *
   * **3rd output (BE-INCR-FIXED-ASSETS PR-5, F-FA12 → a):** a costed item whose CFOP is in
   * `FIXED_ASSET_CFOPS` (1551/2551) NEVER joins the stock rateio weight — it routes to
   * `fixedAssetItems` instead, keyed by the operator's `classId` mapping. The CFOP is the single
   * source of truth for the branch (execution-plan Passo 26/adversarial): a 1551 item mapped with
   * `productRef` rejects loud (would silently misroute the machine into estoque/CMV — the exact
   * `param-aceito-e-ignorado-e-bug` class the ADR names), and a non-1551 item mapped with `classId`
   * rejects loud too (the inverse misroute).
   */
  private allocate(
    itens: NfeItem[],
    custo: AcquisitionCost,
    productRefByCProd: Map<string, string>,
    classIdByCProd: Map<string, string>,
  ): {
    inventoryItems: NonNullable<CreatePayableInput['inventoryItems']>;
    fixedAssetItems: NonNullable<CreatePayableInput['fixedAssetItems']>;
    ignoredItems: NfeIgnoredItem[];
  } {
    const ignoredItems: NfeIgnoredItem[] = itens
      .filter((it) => it.indTot === '0')
      .map((it) => ({ nItem: it.nItem, cProd: it.cProd, xProd: it.xProd, reason: 'indTot-0' as const }));

    const costed = itens.filter((it) => it.indTot !== '0');
    if (costed.length === 0) {
      throw new ValidationError(
        'NF-e de compra sem nenhum item que componha o total (todos com indTot=0) — rejeitada.',
      );
    }

    const totalWeight = costed.reduce((acc, it) => acc + it.vProdCents, 0);
    if (totalWeight <= 0) {
      throw new ValidationError('NF-e de compra sem valor de produtos (Σ vProd = 0) — rejeitada.');
    }
    // X6: a parcela de cada item já vem do `acquisitionCost` (rateio do BRUTO por vProd, resíduo na última,
    // menos os créditos DO PRÓPRIO item) — Σ custoLiquido === custoEstoqueCents (item 9). A MESMA fórmula
    // D3 vale para o item de imobilizado (ADR F-FA3 b: "custo do rascunho usa a mesma fórmula D3").
    const liquidoByItem = new Map(custo.itens.map((c) => [c.nItem, c.custoLiquidoCents]));
    const inventoryItems: NonNullable<CreatePayableInput['inventoryItems']> = [];
    const fixedAssetItems: NonNullable<CreatePayableInput['fixedAssetItems']> = [];

    for (const it of costed) {
      const isFixedAsset = FIXED_ASSET_CFOPS.has(it.cfop);
      const share = liquidoByItem.get(it.nItem);
      if (share === undefined) {
        throw new ValidationError(`Item ${it.nItem} ('${it.cProd}') sem custo calculado — rejeitado.`);
      }

      if (isFixedAsset) {
        const productRef = productRefByCProd.get(it.cProd);
        if (productRef) {
          throw new ValidationError(
            `Item '${it.cProd}' (${it.xProd}) tem CFOP ${it.cfop} (imobilizado) mas foi mapeado com productRef — use classId (a nota não pode virar estoque em silêncio).`,
          );
        }
        const classId = classIdByCProd.get(it.cProd);
        if (!classId) {
          throw new ValidationError(
            `Item '${it.cProd}' (${it.xProd}) tem CFOP ${it.cfop} (imobilizado) e não tem classId confirmado (F-FA12) — rejeitado.`,
          );
        }
        fixedAssetItems.push({
          classId,
          cProd: it.cProd,
          costCents: share,
          ncm: it.ncm || undefined,
          qty: this.qComToUnits(it.qCom, it.cProd),
        });
        continue;
      }

      const classId = classIdByCProd.get(it.cProd);
      if (classId) {
        throw new ValidationError(
          `Item '${it.cProd}' (${it.xProd}) tem CFOP ${it.cfop} (não é imobilizado) mas foi mapeado com classId — use productRef.`,
        );
      }
      const productRef = productRefByCProd.get(it.cProd);
      if (!productRef) {
        throw new ValidationError(
          `Item '${it.cProd}' (${it.xProd}) não tem mapeamento de produto confirmado (D6) — rejeitado.`,
        );
      }
      inventoryItems.push({
        productRef,
        qty: this.qComToUnits(it.qCom, it.cProd),
        valueCents: share,
        description: it.xProd,
      });
    }

    return { inventoryItems, fixedAssetItems, ignoredItems };
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
