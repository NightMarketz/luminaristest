import type { UserContext } from '../../../lib/authUtils';
import { NotFoundError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { DynamicTableService } from '../../dynamicTables/services/DynamicTableService';
import type { IDynamicTableRepository } from '../../dynamicTables/repositories/IDynamicTableRepository';
import type { IDynamicTableWriteEffects } from '../../integration/services/IDynamicTableWriteEffects';
import type { IInventoryRepository } from '../../accounting/repositories/IInventoryRepository';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { TaxOptimizationService } from '../../accounting/services/TaxOptimizationService';
import { CRITERIO_CARGA_LEGAL_BASIS, naturezaDoItemDoKit } from '../../accounting/models/taxOptimization';
import { saleDayAsWritten } from '../../accounting/models/dates';
import { alocarDescontoFiscal, economiaPotencialCents, type ItemParaAlocacao } from '../models/discountAllocation';
import {
  pisoPorItem,
  verificarItens,
  verificarKits,
  violation,
  type ItemVendido,
  type NaturezaItem,
  type Violation,
} from '../models/fiscalGuard';
import type { FiscalCheckResponse } from '../dtos/FiscalCheckDto';
import { classifySaleItem, reaisToCents, saleLineQuantity, toNum as num } from '../../../lib/saleLine';

type Row = Record<string, unknown>;

interface ItemLido {
  itemRef: string;
  natureza: NaturezaItem;
  productRef: string | null;
  serviceRef: string | null;
  unitPriceCents: bigint;
  catalogUnitPriceCents: bigint | null;
  discountCents: bigint;
  quantity: number;
  custoSnapshotCents: bigint | null;
  kitRef: string | null;
  principalItem: boolean;
}

const has = (v: unknown) => v !== undefined && v !== null && v !== '';
const cents = (reais: unknown) => BigInt(reaisToCents(reais));

/** O classificador canônico (`models/saleLine`, o mesmo das pontes contábeis) na natureza fiscal do item. */
const NATUREZA: Record<string, NaturezaItem | null> = { Product: 'REVENDA', Service: 'SERVICO', Package: 'PACOTE', Unknown: null };
const naturezaDe = (d: Row): NaturezaItem | null => NATUREZA[classifySaleItem(d)];

/**
 * Fila por item da gravação do custo (I-4b): duas verificações concorrentes da mesma venda no processo esperam uma pela
 * outra; a segunda relê o item e usa o custo já gravado. O plugin recusa a 2ª escrita (CUSTO_JA_GRAVADO) como segunda linha.
 */
const snapshotQueue = new Map<string, Promise<unknown>>();
async function serializedPorItem<T>(itemId: string, fn: () => Promise<T>): Promise<T> {
  const anterior = snapshotQueue.get(itemId) ?? Promise.resolve();
  // A falha da anterior é de quem a esperou (já a recebeu); aqui ela só libera a vez da próxima.
  const atual = anterior.then(fn, fn);
  snapshotQueue.set(itemId, atual);
  try {
    return await atual;
  } finally {
    if (snapshotQueue.get(itemId) === atual) snapshotQueue.delete(itemId);
  }
}

export interface FiscalCheckOptions {
  /** Montagem da NFS-e: BLOCK vai para a trilha (`sale.fiscal_guard.blocked`). */
  forEmission?: boolean;
  /** Grava o custo do produto na venda finalizada (padrão true). A prévia da NFS-e passa false: ler não muda dado. */
  persistSnapshot?: boolean;
  /** Linha da venda já lida pelo chamador (montagem da NFS-e) — evita reler a venda. */
  sale?: Row;
}

/**
 * EFICIENCIA-FISCAL PR-1 itens 6, 8 e 10 (BRIEF BE-INCR-EFICIENCIA-FISCAL; ADR-INCR-EFICIENCIA-FISCAL D4.2, D5, D6) — guarda
 * fiscal da venda no seam Prisma-side de `features/sales` (molde RegisterPaymentService): lê a venda e os itens pelo
 * REPOSITÓRIO do DynamicTable (nunca pelo motor — §2.1), aplica o piso, a alocação e as invariantes puras e devolve o
 * `FiscalCheckResponse`. Chamada pelo `POST /api/sales/:id/fiscal-check` e, como pré-condição, pela montagem da NFS-e.
 *
 * - `custoSnapshotCents` do produto: custo médio do `InventoryItem` da unidade (totalValueCents / qtyOnHand), gravado na
 *   PRIMEIRA verificação depois do finalize por escrita `isSystem` só dessa coluna — nunca recalculado (I-4b).
 * - `cargaBp`: a carga por item (`cargaTributariaDoItem`) não está no PR-1 (depende da NCM do X10a); a porta
 *   `cargaDoItem` devolve null por padrão, todo item fica com carga indeterminada e a alocação por CARGA cai no
 *   proporcional com ORDEM_DE_CARGA_INDETERMINADA (D5).
 * - Item 8: com economia > 0 da carga sobre o proporcional, sugestão CRITERIO_CARGA por UNIDADE (nunca por venda) se há
 *   contador ACTIVE; sem ele, o número volta com o aviso CRITERIO_CARGA_EXIGE_CONTADOR e nada é gravado.
 */
export class SaleFiscalGuardService {
  constructor(
    private readonly dynamicTableService: Pick<DynamicTableService, 'updateTableData'>,
    private readonly repository: Pick<IDynamicTableRepository, 'findTableByInternalName' | 'findDataById' | 'findRowsByFieldValue'>,
    private readonly writeEffects: Pick<IDynamicTableWriteEffects, 'afterDataWrite'>,
    private readonly inventoryRepo: Pick<IInventoryRepository, 'findByProductRef'>,
    private readonly taxOptimization: Pick<
      TaxOptimizationService,
      'politicaVigente' | 'custosDeServicoVigentes' | 'hasActiveAccountant' | 'proposeSystem' | 'aceita' | 'auditGuardBlocked' | 'assertCanCheckSale'
    >,
    /**
     * Carga tributária do item na data (bp). O PR-1 não tem a fonte (`cargaTributariaDoItem` depende da NCM do X10a —
     * lacuna registrada): o padrão devolve null para todo item ⇒ ORDEM_DE_CARGA_INDETERMINADA (D5).
     */
    private readonly cargaDoItem: (item: { natureza: NaturezaItem; productRef: string | null; serviceRef: string | null }, dia: string) => number | null = () => null,
  ) {}

  /** Unidade da venda — o controller resolve o escopo por ela. NotFound para venda de outro dono. */
  async unitIdOfSale(ownerUserId: string, saleId: string): Promise<string> {
    const { sale } = await this.loadSale(ownerUserId, saleId);
    const unitId = sale.unitId;
    if (typeof unitId !== 'string' || !unitId) throw new NotFoundError(`Venda '${saleId}' sem unidade.`);
    return unitId;
  }

  /** Rota `POST /api/sales/:id/fiscal-check` (BRIEF §4.3: régua `canManageFiscalProfile`). */
  async checkSale(scope: AccountingScope, saleId: string): Promise<FiscalCheckResponse> {
    this.taxOptimization.assertCanCheckSale(scope);
    return this.check(scope, saleId);
  }

  async check(scope: AccountingScope, saleId: string, opts: FiscalCheckOptions = {}): Promise<FiscalCheckResponse> {
    const { sale, items: rows } = opts.sale ? { sale: opts.sale, items: await this.loadItems(scope.ownerUserId, saleId) } : await this.loadSale(scope.ownerUserId, saleId);
    if (sale.unitId !== scope.unitId) throw new NotFoundError(`Sale '${saleId}' não foi encontrada.`);
    const dia = saleDayAsWritten(scope, typeof sale.date === 'string' ? sale.date : undefined);
    const politica = await this.taxOptimization.politicaVigente(scope, dia);

    const itens = await this.readItems(scope, rows, sale.status === 'Finalized' && opts.persistSnapshot !== false);
    await this.applyKitTreatment(scope, saleId, itens, dia);

    const custos = await this.taxOptimization.custosDeServicoVigentes(
      scope,
      [...new Set(itens.map((i) => i.serviceRef).filter((r): r is string => r !== null))],
      dia,
    );
    const piso = new Map(
      itens.map((i) => {
        const c = i.serviceRef ? custos.get(i.serviceRef) : undefined;
        return [i.itemRef, pisoPorItem(i, politica, c ? { custoCents: c.custoCents, catalogoMinimoCents: c.catalogoMinimoCents } : null)] as const;
      }),
    );

    const headerCents = cents(sale.discountAmount);
    const itemizado = itens.some((i) => i.discountCents !== 0n);
    const discountKind = sale.discountKind === 'UNCONDITIONAL' || sale.discountKind === 'CONDITIONAL' ? sale.discountKind : null;

    const alocaveis = itens.filter((i) => i.natureza !== 'PACOTE');
    const paraAlocacao: ItemParaAlocacao[] = alocaveis.map((i) => ({
      itemRef: i.itemRef,
      catalogUnitPriceCents: i.catalogUnitPriceCents ?? i.unitPriceCents,
      quantity: i.quantity,
      pisoCents: piso.get(i.itemRef) ?? null,
      cargaBp: this.cargaDoItem(i, dia),
    }));
    const cargaDe = new Map(paraAlocacao.map((p) => [p.itemRef, p.cargaBp]));
    const prop = alocarDescontoFiscal(paraAlocacao, headerCents, 'PROPORCIONAL_CATALOGO');
    const carga = alocarDescontoFiscal(paraAlocacao, headerCents, 'CARGA_TRIBUTARIA');
    const aplicada = politica.criterioAlocacao === 'CARGA_TRIBUTARIA' ? carga : prop;
    const alocado = new Map(aplicada.porItem.map((p) => [p.itemRef, p.discountCents]));

    const vendidos: ItemVendido[] = itens.map((i) => ({
      itemRef: i.itemRef,
      natureza: i.natureza,
      unitPriceCents: i.unitPriceCents,
      catalogUnitPriceCents: i.catalogUnitPriceCents,
      discountCents: itemizado ? i.discountCents : (alocado.get(i.itemRef) ?? 0n),
      quantity: i.quantity,
      pisoCents: piso.get(i.itemRef) ?? null,
    }));
    const violations: Violation[] = [
      ...verificarItens(vendidos, { criterio: politica.criterioAlocacao, severidadePisoProporcional: politica.severidadePisoProporcional }, {
        discountCents: headerCents,
        discountKind,
        descontoItemizado: itemizado,
      }),
      ...verificarKits(itens),
    ];
    if (politica.criterioAlocacao === 'CARGA_TRIBUTARIA') {
      if (aplicada.avisos.includes('ORDEM_DE_CARGA_INDETERMINADA')) {
        violations.push(violation('ORDEM_DE_CARGA_INDETERMINADA', null, 'WARN', 'sem carga por item para ordenar: alocação proporcional'));
      }
      if (aplicada.excedenteCents > 0n && !violations.some((v) => v.code === 'COMBO_ABAIXO_DO_CUSTO')) {
        violations.push(violation('COMBO_ABAIXO_DO_CUSTO', null, 'BLOCK', `desconto excede Σ (catálogo − piso) em ${aplicada.excedenteCents} centavos`));
      }
    }

    // Item 8 — economia da carga sobre o proporcional; sugestão por UNIDADE só com contador ACTIVE.
    let suggestionId: string | null = null;
    const economia = headerCents > 0n ? economiaPotencialCents(paraAlocacao, carga, prop) : null;
    if (economia !== null && economia > 0n && politica.criterioAlocacao === 'PROPORCIONAL_CATALOGO') {
      if (await this.taxOptimization.hasActiveAccountant(scope)) {
        suggestionId = await this.taxOptimization.proposeSystem(scope, {
          practice: 'CRITERIO_CARGA',
          subjectType: 'UNIT',
          subjectId: scope.unitId,
          legalBasis: CRITERIO_CARGA_LEGAL_BASIS,
          estimatedSavingCents: economia,
          calc: { origem: 'fiscal-check', saleId, economiaPotencialCents: economia, carga: carga.porItem, proporcional: prop.porItem },
        });
      } else {
        violations.push(violation('CRITERIO_CARGA_EXIGE_CONTADOR', null, 'WARN', `economia potencial de ${economia} centavos exige o aceite do contador`));
      }
    }

    const ok = !violations.some((v) => v.severity === 'BLOCK');
    if (!ok && opts.forEmission) {
      await this.taxOptimization.auditGuardBlocked(scope, saleId, politica.criterioAlocacao, violations.filter((v) => v.severity === 'BLOCK').map((v) => v.code));
    }
    return {
      saleId,
      ok,
      criterio: aplicada.criterioAplicado,
      violations,
      alocacao: aplicada.porItem.map((p) => ({
        itemRef: p.itemRef,
        discountCents: p.discountCents,
        pisoCents: piso.get(p.itemRef) ?? null,
        cargaBp: cargaDe.get(p.itemRef) ?? null,
      })),
      economiaPotencialCents: economia,
      suggestionId,
    };
  }

  private async loadSale(ownerUserId: string, saleId: string): Promise<{ sale: Row; items: Array<{ id: string; data: Row }> }> {
    const salesTable = await this.repository.findTableByInternalName(ownerUserId, 'sales');
    const row = salesTable ? await this.repository.findDataById(saleId) : null;
    // findDataById não é escopado por dono: venda de outra tabela = inexistente (molde RegisterPaymentService).
    if (!salesTable || !row || row.dynamicTableId !== salesTable.id) throw new NotFoundError(`Sale '${saleId}' não foi encontrada.`);
    return { sale: (row.data ?? {}) as Row, items: await this.loadItems(ownerUserId, saleId) };
  }

  private async loadItems(ownerUserId: string, saleId: string): Promise<Array<{ id: string; data: Row }>> {
    const itemsTable = await this.repository.findTableByInternalName(ownerUserId, 'saleItems');
    const items = itemsTable ? await this.repository.findRowsByFieldValue(itemsTable.id, 'saleId', saleId) : [];
    return items.map((r) => ({ id: r.id, data: (r.data ?? {}) as Row }));
  }

  private async readItems(scope: AccountingScope, rows: Array<{ id: string; data: Row }>, gravarCusto: boolean): Promise<ItemLido[]> {
    const out: ItemLido[] = [];
    for (const r of [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
      const d = r.data;
      const natureza = naturezaDe(d);
      if (!natureza) continue;
      const productRef = d.productId ? String(d.productId) : null;
      let custo = has(d.custoSnapshotCents) ? BigInt(Math.round(num(d.custoSnapshotCents))) : null;
      if (custo === null && natureza === 'REVENDA' && productRef) {
        custo = await this.custoMedio(scope, productRef);
        if (custo !== null && gravarCusto) custo = await this.persistSnapshot(scope, r.id, custo);
      }
      out.push({
        itemRef: r.id,
        natureza,
        productRef,
        serviceRef: d.serviceId ? String(d.serviceId) : null,
        unitPriceCents: cents(d.unitPrice),
        catalogUnitPriceCents: has(d.catalogUnitPrice) ? cents(d.catalogUnitPrice) : null,
        discountCents: has(d.discountCents) ? BigInt(Math.round(num(d.discountCents))) : 0n,
        quantity: saleLineQuantity(d),
        custoSnapshotCents: custo,
        kitRef: has(d.kitRef) ? String(d.kitRef) : null,
        principalItem: d.principalItem === true,
      });
    }
    return out;
  }

  /** Custo médio unitário na unidade (média móvel do subrazão de estoque); sem saldo ⇒ indeterminado. */
  private async custoMedio(scope: AccountingScope, productRef: string): Promise<bigint | null> {
    const item = await this.inventoryRepo.findByProductRef(scope, productRef);
    if (!item || item.qtyOnHand <= 0) return null;
    return BigInt(Math.round(Number(item.totalValueCents) / item.qtyOnHand));
  }

  /**
   * I-4b: grava uma vez, só a coluna do custo, por escrita isSystem (o plugin libera só essa coluna em venda finalizada e
   * recusa a 2ª — CUSTO_JA_GRAVADO). Na fila do item: relê antes de gravar e, se outro já gravou, devolve o gravado.
   */
  private async persistSnapshot(scope: AccountingScope, itemId: string, custo: bigint): Promise<bigint> {
    const gravado = async (): Promise<bigint | null> => {
      const v = ((await this.repository.findDataById(itemId))?.data as Row | undefined)?.custoSnapshotCents;
      return has(v) ? BigInt(Math.round(num(v))) : null;
    };
    return serializedPorItem(itemId, async () => {
      const antes = await gravado();
      if (antes !== null) return antes;
      const owner = { userId: scope.ownerUserId, id: scope.ownerUserId } as UserContext;
      try {
        await this.dynamicTableService.updateTableData(owner, itemId, { data: { custoSnapshotCents: Number(custo) } }, { isSystem: true });
      } catch (e) {
        if ((e as { errorCode?: string }).errorCode !== 'CUSTO_JA_GRAVADO') throw e;
        return (await gravado()) ?? custo;
      }
      this.writeEffects.afterDataWrite(scope.ownerUserId);
      logger.info('Sale item cost snapshot recorded', { itemId });
      return custo;
    });
  }

  /** Item 10 / I-7: com PRINCIPAL_ACESSORIO aceita para o kit e data ≥ 2027, os acessórios seguem a natureza do principal. */
  private async applyKitTreatment(scope: AccountingScope, saleId: string, itens: ItemLido[], dia: string): Promise<void> {
    const kits = new Set(itens.map((i) => i.kitRef).filter((k): k is string => k !== null));
    for (const kit of kits) {
      const membros = itens.filter((i) => i.kitRef === kit);
      const principal = membros.find((m) => m.principalItem) ?? null;
      if (!principal) continue;
      const aceita = await this.taxOptimization.aceita(scope, { practice: 'PRINCIPAL_ACESSORIO', subjectType: 'SALE_KIT', subjectId: `${saleId}:${kit}` });
      for (const m of membros) m.natureza = naturezaDoItemDoKit(m.natureza, principal.natureza, aceita, dia);
    }
  }
}
