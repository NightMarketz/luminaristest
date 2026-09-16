/**
 * BE-INCR-NFE-COST-REGIME (nó X6) — custo de aquisição D3 da NF-e de compra POR REGIME do tenant.
 * Função PURA (sem I/O): a `sessao-feature` de 2026-09-15 sobre o BRIEF de 11/09 + EMENDA 2026-09-15.
 *
 * Fontes (corpus `docs/accounting/fontes-oficiais/`, MANIFEST 2026-09-15):
 *  - RIR/2018 (Decreto 9.580/2018) art. 301 §1º/§3º: o custo de aquisição compreende transporte e seguro
 *    e os tributos devidos na aquisição; os IMPOSTOS RECUPERÁVEIS por crédito não integram o custo
 *    (`Decreto-9580-2018-RIR.html`). Item 7/8 do BRIEF: ICMS próprio sai do custo só para o contribuinte
 *    (F-X6-2 a, por item); ICMS-ST nunca sai (§4 f2).
 *  - Lei 10.637/2002 art. 2º/3º (PIS 1,65%) e Lei 10.833/2003 art. 2º/3º (COFINS 7,6%): crédito na
 *    aquisição de bens para revenda, só no regime NÃO-CUMULATIVO (item 10, F-X6-3 b).
 *  - Lei 10.833/2003 art. 3º §2º II: sem crédito em bem sujeito a alíquota zero/monofásico (item 11).
 *  - Lei 14.592/2023 art. 6º: ICMS fora da base do crédito (flag `pisCofinsCreditExcludesIcms`, default true).
 *  - IN RFB 2.121/2022 art. 170 (IPI na base — contestada) e ADI SRF 15/2007 (fornecedor do Simples):
 *    [NC] fora do corpus → flags com default CONSERVADOR (sem crédito), cédula 14/09.
 *  - LC 123/2006 art. 23: Simples Nacional não apura crédito (regime `SIMPLES` = crédito 0).
 *
 * Invariante (item 9): Σ custo_item === custoEstoqueCents em qualquer ramo (resíduo na última linha, BigInt).
 */
import type { NfeItem, NfeTotais, ParsedNfe } from './nfe';
import { classifyPisCofinsItem } from '../features/accounting/models/pisCofinsMonofasicoNcm';

export const PIS_CREDIT_BP = 165; // 1,65% — Lei 10.637/2002 art. 2º
export const COFINS_CREDIT_BP = 760; // 7,6% — Lei 10.833/2003 art. 2º

export interface CostRegime {
  icmsContribuinte: boolean;
  pisCofinsRegime: 'SIMPLES' | 'CUMULATIVO' | 'NAO_CUMULATIVO';
  pisCofinsCreditExcludesIcms: boolean;
  pisCofinsCreditIncludesIpi: boolean;
  pisCofinsCreditFromSimplesSupplier: boolean;
}

export interface ItemCost {
  nItem: number;
  cProd: string;
  /** Parcela do custo BRUTO da nota (rateio por vProd, resíduo na última). */
  custoBrutoCents: number;
  creditoIcmsCents: number;
  creditoPisCofinsCents: number;
  basePisCofinsCents: number;
  /** custoBruto − créditos — o que valoriza o estoque (1.1.6). */
  custoLiquidoCents: number;
  classe: 'MONOFASICO' | 'TRIBUTADO' | 'UNKNOWN' | 'SEM_REGIME';
}

export interface AcquisitionCost {
  /** Custo bruto da nota = vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vST (o que se deve ao fornecedor; F-X6-8 a). */
  custoBrutoCents: number;
  /** Valoriza o estoque: bruto − créditos (item 7/8/10). */
  custoEstoqueCents: number;
  creditoIcmsCents: number;
  creditoPisCofinsCents: number;
  /** Σ das bases pós-exceções — o número que o contador confere (regra (j)). */
  baseCreditoPisCofinsCents: number;
  regimeAplicado: 'NAO_CONTRIBUINTE' | 'CONTRIBUINTE_ICMS';
  pisCofinsAplicado: 'SEM_CREDITO' | 'NAO_CUMULATIVO';
  warnings: string[];
  itens: ItemCost[];
}

/** Custo bruto (item 7): a fórmula que existia, sobre os totais W. */
export function custoBrutoCents(t: NfeTotais): number {
  return t.vProdCents - t.vDescCents + t.vFreteCents + t.vSegCents + t.vOutroCents + t.vIPICents + t.vSTCents;
}

/** Rateio proporcional a `vProd` com resíduo na ÚLTIMA linha (mesma técnica do `allocate` do import). */
export function rateio(total: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (totalWeight <= 0) return weights.map((_, i) => (i === weights.length - 1 ? total : 0));
  const tw = BigInt(totalWeight);
  const tb = BigInt(total);
  let allocated = 0;
  return weights.map((w, i) => {
    if (i === weights.length - 1) return total - allocated;
    const share = Number((tb * BigInt(w)) / tw);
    allocated += share;
    return share;
  });
}

function bp(value: number, basisPoints: number): number {
  return Math.round((value * basisPoints) / 10000);
}

/**
 * Custo por regime. Só os itens que compõem o total (`indTot !== '0'`) entram — o chamador já filtrou.
 * `emitCrt` = `emit/CRT` da nota ('1' = Simples Nacional).
 */
export function acquisitionCost(nfe: Pick<ParsedNfe, 'totais' | 'emit'>, itens: NfeItem[], regime: CostRegime): AcquisitionCost {
  const warnings: string[] = [];
  const bruto = custoBrutoCents(nfe.totais);
  if (bruto !== nfe.totais.vNFCents) {
    warnings.push(`custo bruto (${bruto}) ≠ vNF (${nfe.totais.vNFCents}) — a nota tem parcelas fora da fórmula D3 (vII/vIPIDevol/vICMSDeson?)`);
  }
  const pesos = itens.map((it) => it.vProdCents);
  const brutoPorItem = rateio(bruto, pesos);
  // Base do crédito por item (item 10): desconto/frete/seguro/outro do ITEM (I13/I15/I16/I17) mais o que a
  // nota só informa no CABEÇALHO (W08/W09/W10/W17) rateado por vProd — "rateados" na EMENDA.
  const headerRest = (total: number, itemSum: number) => rateio(Math.max(0, total - itemSum), pesos);
  const descRest = headerRest(nfe.totais.vDescCents, itens.reduce((a, it) => a + it.vDescCents, 0));
  const freteRest = headerRest(nfe.totais.vFreteCents, itens.reduce((a, it) => a + it.vFreteCents, 0));
  const segRest = headerRest(nfe.totais.vSegCents, itens.reduce((a, it) => a + it.vSegCents, 0));
  const outroRest = headerRest(nfe.totais.vOutroCents, itens.reduce((a, it) => a + it.vOutroCents, 0));

  const regimeAplicado = regime.icmsContribuinte ? 'CONTRIBUINTE_ICMS' : 'NAO_CONTRIBUINTE';
  const supplierSimples = nfe.emit.crt === '1' || nfe.emit.crt === '4';
  const pisCofinsAtivo = regime.pisCofinsRegime === 'NAO_CUMULATIVO' && (!supplierSimples || regime.pisCofinsCreditFromSimplesSupplier);
  if (regime.pisCofinsRegime === 'NAO_CUMULATIVO' && supplierSimples && !regime.pisCofinsCreditFromSimplesSupplier) {
    warnings.push(`emitente no Simples Nacional (CRT=${nfe.emit.crt}) e crédito em compra do Simples não habilitado (default conservador) — crédito de PIS/COFINS = 0 nesta nota`);
  }

  const out: ItemCost[] = itens.map((it, i) => {
    const custoBruto = brutoPorItem[i];
    // Item 8 (F-X6-2 a): ICMS próprio do ITEM sai do custo do contribuinte; ST nunca.
    const creditoIcms = regime.icmsContribuinte ? it.vICMSCents : 0;

    let classe: ItemCost['classe'] = 'SEM_REGIME';
    let base = 0;
    let creditoPisCofins = 0;
    if (pisCofinsAtivo) {
      const c = classifyPisCofinsItem({ ncm: it.ncm, cstPis: it.cstPis, cstCofins: it.cstCofins });
      classe = c.classe;
      if (c.classe === 'TRIBUTADO') {
        // base_item = vProd − vDesc + frete/seg/outro do item; − ICMS (Lei 14.592) ; + IPI (flag)
        base =
          it.vProdCents - it.vDescCents - descRest[i] + it.vFreteCents + freteRest[i] + it.vSegCents + segRest[i] + it.vOutroCents + outroRest[i];
        if (regime.pisCofinsCreditExcludesIcms) base -= it.vICMSCents;
        if (regime.pisCofinsCreditIncludesIpi) base += it.vIPICents;
        if (base < 0) base = 0;
        creditoPisCofins = bp(base, PIS_CREDIT_BP) + bp(base, COFINS_CREDIT_BP);
      } else if (c.classe === 'UNKNOWN') {
        warnings.push(`item ${it.nItem} (${it.cProd}): sem crédito de PIS/COFINS — ${c.motivo}`);
      }
    }
    const custoLiquido = custoBruto - creditoIcms - creditoPisCofins;
    return { nItem: it.nItem, cProd: it.cProd, custoBrutoCents: custoBruto, creditoIcmsCents: creditoIcms, creditoPisCofinsCents: creditoPisCofins, basePisCofinsCents: base, custoLiquidoCents: custoLiquido, classe };
  });

  const creditoIcmsCents = out.reduce((a, it) => a + it.creditoIcmsCents, 0);
  const creditoPisCofinsCents = out.reduce((a, it) => a + it.creditoPisCofinsCents, 0);
  const baseCreditoPisCofinsCents = out.reduce((a, it) => a + it.basePisCofinsCents, 0);
  return {
    custoBrutoCents: bruto,
    custoEstoqueCents: bruto - creditoIcmsCents - creditoPisCofinsCents,
    creditoIcmsCents,
    creditoPisCofinsCents,
    baseCreditoPisCofinsCents,
    regimeAplicado,
    pisCofinsAplicado: pisCofinsAtivo ? 'NAO_CUMULATIVO' : 'SEM_CREDITO',
    warnings,
    itens: out,
  };
}
