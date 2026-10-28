/**
 * EFICIENCIA-FISCAL PR-1 item 2 (BRIEF BE-INCR-EFICIENCIA-FISCAL §3; ADR-INCR-EFICIENCIA-FISCAL D4.1, I-1, I-4) — guarda
 * ARITMÉTICA do desconto no finalize da venda, só com dado da própria tabela (zero serviço Prisma — CLAUDE.md §STOP, I-12).
 * Piso, rateio fiscal e as invariantes de custo ficam fora do motor, no SaleFiscalGuardService (D4.2).
 *
 * Regras (cada uma um 400 com `errorCode` nomeado):
 *  - (i)   desconto destacado por item ⇒ `discountKind` obrigatório (F-EF-9 a) — DESCONTO_SEM_TIPO. Desconto só no
 *          cabeçalho (legado; o wizard de hoje) passa sem ele e segue como hoje — sem destaque, peso bruto — com aviso
 *          no fiscal-check (dono, AskUserQuestion 26/10/2026: "Só no desconto por item");
 *  - (ii)  desconto itemizado ⇒ Σ item.discountCents = round(discountAmount × 100) ± 1 — RATEIO_NAO_FECHA;
 *  - (iii) 0 ≤ discountCents ≤ quantity × catálogo × 100 — DESCONTO_ITEM_FORA_DA_FAIXA;
 *  - (iv)  com `catalogUnitPrice`, unitPrice = catálogo (o desconto vai em `discountCents`, nunca no preço — I-1):
 *          acima ⇒ ITEM_ACIMA_DO_CATALOGO, abaixo ⇒ PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO. "Acima" é checado em todos
 *          os itens antes de "abaixo": a transferência de valor entre itens (I-1) é recusada pelo item que subiu.
 * Legado (sem `catalogUnitPrice`, API): catálogo := unitPrice; desconto só no cabeçalho (Σ itens = 0) passa por (i) e o
 * rateio fica com o fiscal-check (BRIEF §7 item 6).
 */
import { ValidationError } from '../../../../../lib/errors';
import { reaisToCents as toCents, saleLineQuantity as quantityOf, toNum as num } from '../../../../../lib/saleLine';

export interface SaleItemForDiscount {
  id?: string;
  data?: Record<string, unknown> | null;
}

const hasValue = (v: unknown): boolean => v !== undefined && v !== null && v !== '';

export function assertSaleDiscountItemization(header: Record<string, unknown>, items: readonly SaleItemForDiscount[]): void {
  const datas: Array<Record<string, unknown>> = items.map((it) => ({ ...(it.data ?? {}), id: it.id ?? it.data?.id }));
  const headerCents = toCents(header.discountAmount);
  const itemCents = datas.map((d) => (hasValue(d.discountCents) ? Math.round(num(d.discountCents)) : 0));
  const itemizado = itemCents.some((c) => c !== 0);

  if (itemizado && !hasValue(header.discountKind)) {
    throw new ValidationError(
      'DESCONTO_SEM_TIPO: desconto destacado por item exige discountKind (UNCONDITIONAL ou CONDITIONAL) — F-EF-9 a; LC 214 art. 12 § 3º.',
      { code: 'DESCONTO_SEM_TIPO' },
      'DESCONTO_SEM_TIPO',
    );
  }

  datas.forEach((d, i) => {
    const catalogCents = toCents(hasValue(d.catalogUnitPrice) ? d.catalogUnitPrice : d.unitPrice);
    const max = Math.round(quantityOf(d) * catalogCents);
    if (itemCents[i] < 0 || itemCents[i] > max) {
      throw new ValidationError(
        `DESCONTO_ITEM_FORA_DA_FAIXA: o desconto do item (${itemCents[i]} centavos) deve ficar entre 0 e quantidade × preço de catálogo (${max}).`,
        { code: 'DESCONTO_ITEM_FORA_DA_FAIXA', itemRef: String(d.id ?? i) },
        'DESCONTO_ITEM_FORA_DA_FAIXA',
      );
    }
  });

  if (itemizado) {
    const soma = itemCents.reduce((s, c) => s + c, 0);
    if (Math.abs(soma - headerCents) > 1) {
      throw new ValidationError(
        `RATEIO_NAO_FECHA: Σ dos descontos dos itens (${soma} centavos) ≠ desconto da venda (${headerCents} centavos).`,
        { code: 'RATEIO_NAO_FECHA' },
        'RATEIO_NAO_FECHA',
      );
    }
  }

  const comCatalogo = datas.filter((d) => hasValue(d.catalogUnitPrice));
  const acima = comCatalogo.find((d) => toCents(d.unitPrice) > toCents(d.catalogUnitPrice));
  if (acima) {
    throw new ValidationError(
      'ITEM_ACIMA_DO_CATALOGO: preço do item acima do preço de catálogo — CTN art. 148; Lei 8.137 art. 1º II/IV (I-1).',
      { code: 'ITEM_ACIMA_DO_CATALOGO', itemRef: String(acima.id ?? '') },
      'ITEM_ACIMA_DO_CATALOGO',
    );
  }
  const abaixo = comCatalogo.find((d) => toCents(d.unitPrice) < toCents(d.catalogUnitPrice));
  if (abaixo) {
    throw new ValidationError(
      'PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO: o preço do item fica no catálogo e o desconto vai em discountCents — LC 214 art. 12 § 3º (I-1).',
      { code: 'PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO', itemRef: String(abaixo.id ?? '') },
      'PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO',
    );
  }
}

/**
 * Item 6 / I-4b — a escrita isSystem só do custo é aceita uma vez: com o custo já gravado ⇒ 400 CUSTO_JA_GRAVADO (o guard
 * relê e usa o gravado). Junto com a fila por item do SaleFiscalGuardService, fecha a dupla gravação concorrente.
 */
export function assertCostSnapshotNotYetRecorded(before: Record<string, unknown> | null | undefined): void {
  if (before && hasValue(before.custoSnapshotCents)) {
    throw new ValidationError('CUSTO_JA_GRAVADO: o custo do item na venda já foi gravado e não é recalculado (I-4b).', { code: 'CUSTO_JA_GRAVADO' }, 'CUSTO_JA_GRAVADO');
  }
}

/** Só o SaleFiscalGuardService (isSystem) grava o custo, e só ele — nenhuma outra coluna muda nessa escrita. */
export function isCostSnapshotOnlyWrite(before: Record<string, unknown> | null | undefined, after: Record<string, unknown> | null | undefined): boolean {
  if (!before || !after) return false;
  const changed = Object.keys(after).filter((k) => k !== 'id' && JSON.stringify(after[k]) !== JSON.stringify(before[k]));
  return changed.length > 0 && changed.every((k) => k === 'custoSnapshotCents');
}
