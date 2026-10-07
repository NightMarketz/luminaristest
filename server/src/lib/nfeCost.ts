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
 *  - IPI fora da base do crédito como regra FIXA (STJ Tema 1.373; triagem do contador P1, 23/09) — a flag
 *    `pisCofinsCreditIncludesIpi` não é lida aqui e o DTO só aceita `false`.
 *  - ADI SRF 15/2007 (fornecedor do Simples): [NC] fora do corpus → flag com default CONSERVADOR (sem
 *    crédito), cédula 14/09; F-PC-1 → (b) em 25/09 mantém o default.
 *  - LC 123/2006 art. 23: Simples Nacional não apura crédito (regime `SIMPLES` = crédito 0).
 *
 * Invariante (item 9): Σ custo_item === custoEstoqueCents em qualquer ramo (resíduo na última linha, BigInt).
 *
 * ITEM-DESTINATION (BRIEF itens 4–8, `docs/accounting/BE-INCR-ITEM-DESTINATION-brief.md`): `destinos`
 * opcional por `nItem`; ausente ⇒ tudo REVENDA e a saída é idêntica à de antes (item 4).
 *  - INSUMO_SERVICO: ICMS fica no custo (item 5 — contador P4 "ICMS uso e consumo"; RIR/2018 art. 301 §3º:
 *    só o recuperável sai; a não-recuperabilidade é a pendência P-2 [NC], default conservador);
 *    PIS/COFINS de item TRIBUTADO credita igual à revenda (item 6 — Leis 10.637/10.833 art. 3º II, I);
 *    MONOFÁSICO não credita, com warning — F-ID-4 na etapa (c) até a transcrição da P-1 (item 7).
 *  - IMOBILIZADO (EMENDA 29/09 item 21): mesmo ramo de crédito da REVENDA — a emenda muda a rota, não o
 *    crédito (decisão do dono, 02/10).
 */
import type { NfeItem, NfeTotais, ParsedNfe } from './nfe';
import { classifyPisCofinsItem, tabelaPisCofinsItemDe } from '../features/accounting/models/pisCofinsMonofasicoNcm';
import { razaoCreditoPisCofins } from '../features/accounting/models/pisCofinsParams';
import type { LinhaLegal } from '../features/legalParameters/models/legalParameter';
import type { ItemDestination } from '../features/accounting/models/itemDestination';

/**
 * BE-INCR-LEGAL-PARAMS PR-2 (item 13; F-LP-4 a) — as alíquotas do crédito (PIS 1,65% / COFINS 7,6%, tabela
 * `PIS_COFINS` NAO_CUMULATIVO), a tabela de NCM monofásico e as listas de CST vêm da fotografia `legais` que o serviço
 * monta, vigentes na emissão da nota (`dhEmi`). Só são lidas quando há crédito a calcular (regime não cumulativo).
 */
export const TABELAS_LEGAIS_NFE = ['NFE_CSTAT_AUTORIZADA', 'CFOP_IMOBILIZADO', 'CST_PIS_COFINS', 'PIS_COFINS_MONOFASICO_NCM', 'PIS_COFINS'] as const;

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
  /** X8 item 5 (F-X8-7 a): as duas parcelas de `creditoPisCofinsCents` (= pis + cofins, exato). */
  creditoPisCents: number;
  creditoCofinsCents: number;
  basePisCofinsCents: number;
  /** custoBruto − créditos — o que valoriza o estoque (1.1.6). */
  custoLiquidoCents: number;
  classe: 'MONOFASICO' | 'TRIBUTADO' | 'UNKNOWN' | 'SEM_REGIME';
  destination: ItemDestination;
}

export interface AcquisitionCost {
  /** Custo bruto da nota = vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vST (o que se deve ao fornecedor; F-X6-8 a). */
  custoBrutoCents: number;
  /** Valoriza o estoque: bruto − créditos (item 7/8/10). */
  custoEstoqueCents: number;
  /** ITEM-DESTINATION item 14: Σ custoLiquido dos itens INSUMO_SERVICO (subconjunto de custoEstoqueCents). */
  custoInsumoCents: number;
  creditoIcmsCents: number;
  creditoPisCofinsCents: number;
  /** X8 item 5 (F-X8-7 a): Σ por item de bp(base, pisBp) e bp(base, cofinsBp) (tabela PIS_COFINS) — somados, exatamente `creditoPisCofinsCents`. */
  creditoPisCents: number;
  creditoCofinsCents: number;
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
export function acquisitionCost(
  nfe: Pick<ParsedNfe, 'totais' | 'emit' | 'ide'>,
  itens: NfeItem[],
  regime: CostRegime,
  destinos: ReadonlyMap<number, ItemDestination> | undefined,
  legais: readonly LinhaLegal[],
): AcquisitionCost {
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

  const razao = pisCofinsAtivo ? razaoCreditoPisCofins(legais, nfe.ide.dhEmiDate) : null;
  const tabelaItem = pisCofinsAtivo ? tabelaPisCofinsItemDe(legais, nfe.ide.dhEmiDate) : null;
  const out: ItemCost[] = itens.map((it, i) => {
    const custoBruto = brutoPorItem[i];
    const destination = destinos?.get(it.nItem) ?? 'REVENDA';
    const insumo = destination === 'INSUMO_SERVICO';
    // Item 8 (F-X6-2 a): ICMS próprio do ITEM sai do custo do contribuinte; ST nunca. ITEM-DESTINATION item 5:
    // no insumo do serviço o ICMS não é recuperável (P-2) — fica no custo.
    const creditoIcms = regime.icmsContribuinte && !insumo ? it.vICMSCents : 0;

    let classe: ItemCost['classe'] = 'SEM_REGIME';
    let base = 0;
    let creditoPis = 0;
    let creditoCofins = 0;
    if (razao && tabelaItem) {
      const c = classifyPisCofinsItem({ ncm: it.ncm, cstPis: it.cstPis, cstCofins: it.cstCofins }, tabelaItem);
      classe = c.classe;
      if (c.classe === 'TRIBUTADO') {
        // base_item = vProd − vDesc + frete/seg/outro do item; − ICMS (Lei 14.592); IPI nunca (P1)
        base =
          it.vProdCents - it.vDescCents - descRest[i] + it.vFreteCents + freteRest[i] + it.vSegCents + segRest[i] + it.vOutroCents + outroRest[i];
        if (regime.pisCofinsCreditExcludesIcms) base -= it.vICMSCents;
        if (base < 0) base = 0;
        creditoPis = bp(base, razao.pisBp);
        creditoCofins = bp(base, razao.cofinsBp);
        if (c.alerta) warnings.push(`item ${it.nItem} (${it.cProd}): ${c.alerta}`);
      } else if (c.classe === 'UNKNOWN') {
        warnings.push(`item ${it.nItem} (${it.cProd}): sem crédito de PIS/COFINS — ${c.motivo}`);
      } else if (insumo) {
        // ITEM-DESTINATION item 7, F-ID-4 etapa (c): até a P-1 (IN RFB 2.121 art. 160 I / SC 4.024/2021) entrar
        // no corpus, o insumo monofásico não credita em nenhum CST — o comportamento de hoje, agora visível.
        warnings.push(`item ${it.nItem} (${it.cProd}): insumo monofásico (${c.motivo}) — sem crédito de PIS/COFINS até a validação da pendência P-1 (posição da RFB × contador)`);
      }
    }
    const creditoPisCofins = creditoPis + creditoCofins;
    const custoLiquido = custoBruto - creditoIcms - creditoPisCofins;
    return { nItem: it.nItem, cProd: it.cProd, custoBrutoCents: custoBruto, creditoIcmsCents: creditoIcms, creditoPisCofinsCents: creditoPisCofins, creditoPisCents: creditoPis, creditoCofinsCents: creditoCofins, basePisCofinsCents: base, custoLiquidoCents: custoLiquido, classe, destination };
  });

  const creditoIcmsCents = out.reduce((a, it) => a + it.creditoIcmsCents, 0);
  const creditoPisCofinsCents = out.reduce((a, it) => a + it.creditoPisCofinsCents, 0);
  const creditoPisCents = out.reduce((a, it) => a + it.creditoPisCents, 0);
  const creditoCofinsCents = out.reduce((a, it) => a + it.creditoCofinsCents, 0);
  const baseCreditoPisCofinsCents = out.reduce((a, it) => a + it.basePisCofinsCents, 0);
  return {
    custoBrutoCents: bruto,
    custoEstoqueCents: bruto - creditoIcmsCents - creditoPisCofinsCents,
    custoInsumoCents: out.filter((it) => it.destination === 'INSUMO_SERVICO').reduce((a, it) => a + it.custoLiquidoCents, 0),
    creditoIcmsCents,
    creditoPisCofinsCents,
    creditoPisCents,
    creditoCofinsCents,
    baseCreditoPisCofinsCents,
    regimeAplicado,
    pisCofinsAplicado: pisCofinsAtivo ? 'NAO_CUMULATIVO' : 'SEM_CREDITO',
    warnings,
    itens: out,
  };
}
