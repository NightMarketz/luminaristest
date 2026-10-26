/**
 * EFICIENCIA-FISCAL PR-1 itens 4 e 10 (BRIEF BE-INCR-EFICIENCIA-FISCAL §3/§4.2; ADR-INCR-EFICIENCIA-FISCAL D2, D6, §3, §13)
 * — guarda fiscal PURA dos itens de uma venda. A fronteira do lícito é invariante (D2): nenhum código aqui tem flag de
 * tenant, só a severidade do piso sob o critério proporcional (F-EF-14 a, `severidadePisoProporcional`).
 *
 * Severidades:
 *  - BLOCK (fronteira, I-1): ITEM_ACIMA_DO_CATALOGO, PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO, RATEIO_NAO_FECHA;
 *  - ITEM_ABAIXO_DO_PISO / COMBO_ABAIXO_DO_CUSTO: BLOCK sob CARGA (D6, I-3), a política sob PROPORCIONAL (F-EF-14 a: WARN —
 *    a promoção real com nota emitida não pode ser barrada; a não emissão é ela mesma infração, LC 214 art. 13 I "a");
 *  - WARN: SEM_CUSTO (D6), KIT_SEM_PRINCIPAL (item 10), DESCONTO_FORA_DO_DOCUMENTO e DESCONTO_CONDICIONAL_COMO_INCONDICIONAL.
 * O piso é critério interno de defesa do tenant, não preço mínimo do fisco (ADR §12) — o texto da violação diz isso.
 */
import type { CriterioAlocacao } from './discountAllocation';

export const VIOLATION_CODES = [
  'ITEM_ABAIXO_DO_PISO',
  'COMBO_ABAIXO_DO_CUSTO',
  'ITEM_ACIMA_DO_CATALOGO',
  'PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO',
  'DESCONTO_FORA_DO_DOCUMENTO',
  'DESCONTO_CONDICIONAL_COMO_INCONDICIONAL',
  'RATEIO_NAO_FECHA',
  'KIT_SEM_PRINCIPAL',
  'SEM_CUSTO',
  'ORDEM_DE_CARGA_INDETERMINADA',
  'CRITERIO_CARGA_EXIGE_CONTADOR',
] as const;
export type ViolationCode = (typeof VIOLATION_CODES)[number];
export type Severity = 'BLOCK' | 'WARN';

export interface Violation {
  code: ViolationCode;
  itemRef: string | null;
  severity: Severity;
  legalBasis: string;
  detail: string;
}

/** Base legal por código — texto do ADR §3 (L1–L17), nunca digitado livre na resposta. */
export const LEGAL_BASIS: Record<ViolationCode, string> = {
  ITEM_ABAIXO_DO_PISO: 'CTN art. 148; LC 214 art. 13 I "b"; LC 87 art. 13 I (L1, L6, L17)',
  COMBO_ABAIXO_DO_CUSTO: 'CTN art. 148; LC 214 art. 13 I "b"; LC 87 art. 13 I (L1, L6, L17)',
  ITEM_ACIMA_DO_CATALOGO: 'CTN arts. 148 e 149 VII; Lei 8.137 art. 1º II e IV (L1, L3, L4)',
  PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO: 'CTN art. 148; Lei 8.137 art. 1º II; LC 214 art. 12 § 3º (L1, L4, L7)',
  DESCONTO_FORA_DO_DOCUMENTO: 'LC 214 art. 12 § 2º III e § 3º; LC 123 art. 3º § 1º (L7, L8)',
  DESCONTO_CONDICIONAL_COMO_INCONDICIONAL: 'LC 87 art. 13 § 1º II "a"; LC 214 art. 12 § 3º (L7, L17)',
  RATEIO_NAO_FECHA: 'LC 214 art. 7º caput e art. 12 § 3º (L5, L7)',
  KIT_SEM_PRINCIPAL: 'LC 214 art. 7º II e § 2º (L14)',
  SEM_CUSTO: 'CTN art. 148; LC 214 art. 13 I "b" (L1, L6)',
  ORDEM_DE_CARGA_INDETERMINADA: 'ADR-INCR-EFICIENCIA-FISCAL D5 (sem dado para ordenar a carga ⇒ proporcional)',
  CRITERIO_CARGA_EXIGE_CONTADOR: 'D-2026-10-21-TRIAGEM-CONTADOR-F1 (CARGA só com aceite do contador); F-EF-3 a',
};

export const violation = (code: ViolationCode, itemRef: string | null, severity: Severity, detail: string): Violation => ({
  code,
  itemRef,
  severity,
  legalBasis: LEGAL_BASIS[code],
  detail,
});

export type NaturezaItem = 'SERVICO' | 'REVENDA' | 'PACOTE';
export type PisoServico = 'CUSTO_INFORMADO' | 'CATALOGO_MINIMO' | 'SEM_DESCONTO_ALEM_DO_PROPORCIONAL';

/**
 * Piso da LINHA do item (F-EF-1 a; D6): produto = custo médio unitário na venda × quantidade; serviço = custo informado com
 * evidência → preço mínimo publicado → nenhum, a partir do ponto da cadeia que a política escolhe; pacote fora da alocação.
 */
export function pisoPorItem(
  item: { natureza: NaturezaItem; quantity: number; custoSnapshotCents: bigint | null },
  politica: { pisoServico: PisoServico },
  custoServico: { custoCents: bigint | null; catalogoMinimoCents: bigint | null } | null,
): bigint | null {
  const linha = (unit: bigint) => BigInt(Math.round(Number(unit) * item.quantity));
  if (item.natureza === 'PACOTE') return null;
  if (item.natureza === 'REVENDA') return item.custoSnapshotCents === null ? null : linha(item.custoSnapshotCents);
  if (politica.pisoServico === 'SEM_DESCONTO_ALEM_DO_PROPORCIONAL' || !custoServico) return null;
  if (politica.pisoServico === 'CUSTO_INFORMADO' && custoServico.custoCents !== null) return linha(custoServico.custoCents);
  return custoServico.catalogoMinimoCents === null ? null : linha(custoServico.catalogoMinimoCents);
}

export interface ItemVendido {
  itemRef: string;
  natureza: NaturezaItem;
  unitPriceCents: bigint;
  catalogUnitPriceCents: bigint | null;
  /** Desconto do item: o destacado na venda ou, no legado (só cabeçalho), o alocado pelo fiscal-check. */
  discountCents: bigint;
  quantity: number;
  /** Piso da linha (`pisoPorItem`). */
  pisoCents: bigint | null;
}

export interface CabecalhoVenda {
  discountCents: bigint;
  discountKind: 'UNCONDITIONAL' | 'CONDITIONAL' | null;
  /** true quando o desconto veio por item na venda (destacável no documento); false = só no cabeçalho (legado). */
  descontoItemizado: boolean;
}

const line = (unit: bigint, qty: number) => BigInt(Math.round(Number(unit) * qty));

export function verificarItens(
  itens: readonly ItemVendido[],
  politica: { criterio: CriterioAlocacao; severidadePisoProporcional: Severity },
  cabecalho: CabecalhoVenda,
): Violation[] {
  const out: Violation[] = [];
  const sevPiso: Severity = politica.criterio === 'CARGA_TRIBUTARIA' ? 'BLOCK' : politica.severidadePisoProporcional;
  const temDesconto = cabecalho.discountCents > 0n;
  const alocaveis = itens.filter((i) => i.natureza !== 'PACOTE');

  for (const i of itens) {
    if (i.catalogUnitPriceCents !== null && i.unitPriceCents > i.catalogUnitPriceCents) {
      out.push(violation('ITEM_ACIMA_DO_CATALOGO', i.itemRef, 'BLOCK', `preço ${i.unitPriceCents} > catálogo ${i.catalogUnitPriceCents} (centavos)`));
    } else if (i.catalogUnitPriceCents !== null && i.unitPriceCents < i.catalogUnitPriceCents) {
      out.push(
        violation('PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO', i.itemRef, 'BLOCK', `preço ${i.unitPriceCents} < catálogo ${i.catalogUnitPriceCents}: o desconto vai em discountCents`),
      );
    }
  }

  if (cabecalho.descontoItemizado) {
    const soma = itens.reduce((s, i) => s + i.discountCents, 0n);
    const diff = soma - cabecalho.discountCents;
    if (diff > 1n || diff < -1n) {
      out.push(violation('RATEIO_NAO_FECHA', null, 'BLOCK', `Σ itens ${soma} ≠ desconto da venda ${cabecalho.discountCents} (centavos)`));
    }
  }

  if (temDesconto) {
    for (const i of alocaveis) {
      const preco = i.catalogUnitPriceCents ?? i.unitPriceCents;
      if (i.pisoCents === null) {
        out.push(violation('SEM_CUSTO', i.itemRef, 'WARN', 'item sem custo registrado: não recebe desconto além da cota proporcional (D6)'));
      } else if (line(preco, i.quantity) - i.discountCents < i.pisoCents) {
        out.push(
          violation(
            'ITEM_ABAIXO_DO_PISO',
            i.itemRef,
            sevPiso,
            `líquido ${line(preco, i.quantity) - i.discountCents} < piso ${i.pisoCents} (centavos) — critério interno de defesa, não preço mínimo do fisco`,
          ),
        );
      }
    }
    if (alocaveis.length > 0 && alocaveis.every((i) => i.pisoCents !== null)) {
      const liquido = alocaveis.reduce((s, i) => s + line(i.catalogUnitPriceCents ?? i.unitPriceCents, i.quantity), 0n) - cabecalho.discountCents;
      const pisos = alocaveis.reduce((s, i) => s + (i.pisoCents ?? 0n), 0n);
      if (liquido < pisos) {
        out.push(violation('COMBO_ABAIXO_DO_CUSTO', null, sevPiso, `combo ${liquido} < Σ pisos ${pisos} (centavos)`));
      }
    }
    if (cabecalho.discountKind !== 'CONDITIONAL' && !cabecalho.descontoItemizado) {
      // Legado (só cabeçalho, com ou sem discountKind — dono, 26/10): segue como hoje, sem destaque no documento.
      out.push(
        violation(
          'DESCONTO_FORA_DO_DOCUMENTO',
          null,
          'WARN',
          cabecalho.discountKind === null
            ? 'desconto só no cabeçalho e sem discountKind: sem destaque por item, o documento não o traz como incondicional'
            : 'desconto só no cabeçalho: sem destaque por item, o documento não o traz como incondicional',
        ),
      );
    }
    if (cabecalho.discountKind === 'CONDITIONAL' && cabecalho.descontoItemizado) {
      out.push(
        violation('DESCONTO_CONDICIONAL_COMO_INCONDICIONAL', null, 'WARN', 'desconto condicional lançado por item: não é destacado como incondicional nem abate a base'),
      );
    }
  }
  return out;
}

/** Item 10 (F-EF-4 c): kit com itens de naturezas diferentes e sem `principalItem` ⇒ aviso. */
export function verificarKits(itens: ReadonlyArray<{ itemRef: string; natureza: NaturezaItem; kitRef: string | null; principalItem: boolean }>): Violation[] {
  const kits = new Map<string, Array<(typeof itens)[number]>>();
  for (const i of itens) {
    if (!i.kitRef) continue;
    kits.set(i.kitRef, [...(kits.get(i.kitRef) ?? []), i]);
  }
  const out: Violation[] = [];
  for (const [kit, membros] of [...kits.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const naturezas = new Set(membros.map((m) => m.natureza));
    if (naturezas.size > 1 && !membros.some((m) => m.principalItem)) {
      out.push(violation('KIT_SEM_PRINCIPAL', null, 'WARN', `kit '${kit}' com naturezas ${[...naturezas].sort().join('/')} sem item principal marcado`));
    }
  }
  return out;
}
