import type { NfeIbsCbs, NfeIbsCbsTot } from '../dtos/NfeIbsCbsDto';
import { parametroIbsCbsVigente, type ParametroIbsCbs } from './ibsCbsParams';
import { cClassTribIbsCbs, cstIbsCbs, type CClassTribIbsCbs, type CstIbsCbs } from './ibsCbsTabelas';

/**
 * BE-INCR-NFCE (nó X10a, item 20) — montagem PURA do grupo IBSCBS (UB12) do regime normal (CRT 3) a partir do
 * `ibsCbsCst`/`ibsCbsClassTrib` do perfil do produto, das tabelas do IT 2025.002 v1.70 (`ibsCbsTabelas.ts`) e das alíquotas
 * da tabela legal `IBS_CBS` (`ibsCbsParams.ts`). Decisão do dono (questionário de 27/10, "Schema todo; montagem só gRed"): a
 * montagem preenche o grupo base (`gIBSCBS` com `gIBSUF`, `gIBSMun`, `gCBS`) e o `gRed` (percentual da tabela de cClassTrib);
 * o cClassTrib cujo CST/indicador exige outro subgrupo (diferimento, monofásico, transferência de crédito, ajuste de
 * competência, ZFM, tributação regular, estorno, doação, redução de base) vira faltante nomeado com o dado que falta — o
 * schema (`NfeIbsCbsDto`) aceita e valida todos os subgrupos, mas o perfil não tem o dado para preenchê-los.
 * A nota CRT 3 continua sem sair: o ICMS do regime normal (ICMS00) não tem alíquota nem item no BRIEF (mesmo questionário,
 * "Só UB; CRT 3 segue recusado").
 */

/** A recusa nomeada da nota CRT 3 (questionário de 27/10): o IBS/CBS está montado, o ICMS00 não tem spec. */
export const CRT3_ICMS_SEM_SPEC =
  'regime normal (CRT 3): o ICMS do regime normal (ICMS00: modBC, vBC, pICMS, vICMS) não tem alíquota no perfil nem item no BRIEF — a nota não sai até essa fatia (o IBS/CBS do item 20 já é montado)';

/** Alíquotas vigentes, em percentual com 4 casas (3v2-4). */
export interface AliquotasIbsCbs {
  pIBSUF: string;
  pIBSMun: string;
  pCBS: string;
}

const pctDeBp = (bp: number): string => (bp / 100).toFixed(4);

/**
 * UB18/UB37/UB56 ("Preencher de acordo com a tabela de alíquotas do IBS e CBS") — da tabela legal `IBS_CBS`. Em 2026 não há
 * IBS municipal (LC 214 art. 343: só o estadual de 0,1%; UB37-10: "0% … 2025 e 2026") e a tabela legal não tem a linha
 * `ALIQUOTA_MUN` de 2026 ⇒ zero até 31/12/2026. Fora disso, sem linha PUBLISHED ⇒ `SemLinhaVigenteError` (400 nomeado).
 */
export function aliquotasIbsCbsVigentes(tabela: readonly ParametroIbsCbs[], data: string): AliquotasIbsCbs {
  const mun = data < '2027-01-01' && !tabela.some((p) => p.tributo === 'IBS' && p.chave === 'ALIQUOTA_MUN' && p.vigenteDesde <= data)
    ? 0
    : parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_MUN', data).aliquotaBp;
  return {
    pIBSUF: pctDeBp(parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_UF', data).aliquotaBp),
    pIBSMun: pctDeBp(mun),
    pCBS: pctDeBp(parametroIbsCbsVigente(tabela, 'CBS', 'ALIQUOTA', data).aliquotaBp),
  };
}

export type IbsCbsDoProduto = { cst: CstIbsCbs; cClassTrib: CClassTribIbsCbs } | { faltantes: string[] };

/**
 * Item 20 — o produto tem o que a montagem precisa? CST e cClassTrib no perfil, existentes e compatíveis (UB13-10, UB14-10,
 * UB14-20), permitidos no modelo (UB14-25), vigentes na data (dIniVig/dFimVig da tabela) e sem exigir subgrupo cujo dado o
 * perfil não carrega (decisão do dono de 27/10). Faltantes no formato do 400 agregado da emissão (`produto <ref>: …`).
 */
export function ibsCbsDoProduto(
  ref: string,
  perfil: { ibsCbsCst: string | null; ibsCbsClassTrib: string | null },
  mod: 55 | 65,
  data: string,
): IbsCbsDoProduto {
  const f = (s: string) => `produto ${ref}: ${s}`;
  if (!perfil.ibsCbsCst || !perfil.ibsCbsClassTrib) {
    return {
      faltantes: [
        ...(!perfil.ibsCbsCst ? [f('ibsCbsCst (CRT 3, UB13)')] : []),
        ...(!perfil.ibsCbsClassTrib ? [f('ibsCbsClassTrib (CRT 3, UB14)')] : []),
      ],
    };
  }
  const cst = cstIbsCbs(perfil.ibsCbsCst);
  const cc = cClassTribIbsCbs(perfil.ibsCbsClassTrib);
  if (!cst) return { faltantes: [f(`CST do IBS/CBS ${perfil.ibsCbsCst} inexistente na tabela de CST (UB13-10, rej. 1020)`)] };
  if (!cc) return { faltantes: [f(`cClassTrib ${perfil.ibsCbsClassTrib} inexistente na tabela de cClassTrib (UB14-10, rej. 1023)`)] };
  const faltantes: string[] = [];
  if (cc.cst !== cst.cst) faltantes.push(f(`cClassTrib ${cc.cClassTrib} incompatível com o CST ${cst.cst} (UB14-20, rej. 1024)`));
  if ((mod === 55 ? cc.indNFe : cc.indNFCe) === 0) faltantes.push(f(`cClassTrib ${cc.cClassTrib} não permitido no modelo ${mod} (UB14-25, rej. 1025)`));
  if (data < cc.dIniVig || (cc.dFimVig !== null && data > cc.dFimVig)) {
    faltantes.push(f(`cClassTrib ${cc.cClassTrib} fora da vigência (${cc.dIniVig}–${cc.dFimVig ?? '…'}, IT 2025.002 v1.70)`));
  }
  const semDado = (subgrupo: string) => faltantes.push(f(`cClassTrib ${cc.cClassTrib} exige ${subgrupo}, sem dado no perfil do produto (decisão do dono, 27/10)`));
  if (cst.ind_gDif === 1) semDado('o diferimento gDif (pDif — UB22-20)');
  if (cst.ind_gIBSCBSMono === 1) semDado('o grupo monofásico gIBSCBSMono (UB13-40)');
  if (cst.ind_gTransfCred === 1) semDado('a transferência de crédito gTransfCred (UB13-45)');
  if (cst.ind_gAjusteCompet === 1) semDado('o ajuste de competência gAjusteCompet (UB112-20)');
  if (cst.ind_gCredPresIBSZFM === 1) semDado('o crédito presumido da ZFM gCredPresIBSZFM (UB131-30)');
  if (cst.ind_RedutorBC === 1) semDado('a redução de base de cálculo (ind_RedutorBC)');
  if (cc.ind_gTribRegular === 1) semDado('a tributação regular gTribRegular (UB68-10)');
  if (cc.ind_gEstornoCred === 1 && mod === 55) semDado('o estorno de crédito gEstornoCred (UB116-20)');
  if (cc.tpDoacao === 1) semDado('o indicador de doação indDoacao (UB14a)');
  return faltantes.length ? { faltantes } : { cst, cClassTrib: cc };
}

/**
 * UB16-10 (composição da base; a própria NT marca a regra "Implementação Futura, aguardando orientação normativa"):
 * vBC = vProd − vDesc − vPIS − vCOFINS − vICMS (a montagem do Luminaris não tem vServ, frete, seguro, outros, II, ICMS-UF-destino,
 * FCP, ICMS monofásico, ISSQN nem IS), em centavos.
 */
export function baseIbsCbsCents(v: { vProdCents: number; vDescCents: number; vPisCents: number; vCofinsCents: number; vIcmsCents: number }): number {
  return v.vProdCents - v.vDescCents - v.vPisCents - v.vCofinsCents - v.vIcmsCents;
}

const moneyDe = (cents: number): string => {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`ibscbs_valor_invalido: ${cents}`);
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
};
const p10k = (p: string): number => Math.round(Number(p) * 10_000);
/** vBC × p% em centavos, meio-para-cima (p com 4 casas): inteiro, sem erro de ponto flutuante. */
const valorCents = (vBCCents: number, p: string): number => Math.floor((vBCCents * p10k(p) + 500_000) / 1_000_000);
/** UB28-10: pAliqEfet = p × (1 − pRedAliq/100), 4 casas, arredondada na última. */
const aliqEfet = (p: string, pRed: number): string => (Math.round(p10k(p) * (100 - pRed) / 100) / 10_000).toFixed(4);

/**
 * Item 20 — o grupo IBSCBS de um item. `ind_gIBSCBS = 0` (isenção, imunidade…) ⇒ só CST e cClassTrib (UB13-20). Senão o
 * `gIBSCBS` com as três esferas; `ind_gRed = 1` ⇒ `gRed` com o pRedIBS/pRedCBS da tabela (UB27-10) e a alíquota efetiva
 * (UB28-10); valor de cada esfera = vBC × alíquota (efetiva) (UB35-10, UB54-10, UB67-10); vIBS = vIBSUF + vIBSMun (UB54a-10).
 */
export function montarIbsCbsItem(produto: { cst: CstIbsCbs; cClassTrib: CClassTribIbsCbs }, vBCCents: number, aliq: AliquotasIbsCbs): NfeIbsCbs {
  const { cst, cClassTrib: cc } = produto;
  const base = { CST: cst.cst, cClassTrib: cc.cClassTrib };
  if (cst.ind_gIBSCBS === 0) return base;
  const esfera = (p: string, pRed: number) => {
    const gRed = cst.ind_gRed === 1 ? { pRedAliq: pRed.toFixed(4), pAliqEfet: aliqEfet(p, pRed) } : undefined;
    return { gRed, v: valorCents(vBCCents, gRed?.pAliqEfet ?? p) };
  };
  const uf = esfera(aliq.pIBSUF, cc.pRedIBS);
  const mun = esfera(aliq.pIBSMun, cc.pRedIBS);
  const cbs = esfera(aliq.pCBS, cc.pRedCBS);
  return {
    ...base,
    gIBSCBS: {
      vBC: moneyDe(vBCCents),
      gIBSUF: { pIBSUF: aliq.pIBSUF, ...(uf.gRed ? { gRed: uf.gRed } : {}), vIBSUF: moneyDe(uf.v) },
      gIBSMun: { pIBSMun: aliq.pIBSMun, ...(mun.gRed ? { gRed: mun.gRed } : {}), vIBSMun: moneyDe(mun.v) },
      vIBS: moneyDe(uf.v + mun.v),
      gCBS: { pCBS: aliq.pCBS, ...(cbs.gRed ? { gRed: cbs.gRed } : {}), vCBS: moneyDe(cbs.v) },
    },
  };
}

/** W34–W56b — totais do IBS/CBS pela soma dos itens montados (sem monofásico nem estorno: a montagem não os preenche). */
export function totaisIbsCbs(itens: readonly NfeIbsCbs[]): NfeIbsCbsTot {
  const soma = (f: (b: NonNullable<NfeIbsCbs['gIBSCBS']>) => string) =>
    itens.reduce((s, g) => s + (g.gIBSCBS ? Math.round(Number(f(g.gIBSCBS)) * 100) : 0), 0);
  const zero = '0.00';
  return {
    vBCIBSCBS: moneyDe(soma((b) => b.vBC)),
    gIBS: {
      gIBSUF: { vDif: zero, vDevTrib: zero, vIBSUF: moneyDe(soma((b) => b.gIBSUF.vIBSUF)) },
      gIBSMun: { vDif: zero, vDevTrib: zero, vIBSMun: moneyDe(soma((b) => b.gIBSMun.vIBSMun)) },
      vIBS: moneyDe(soma((b) => b.vIBS)),
      vCredPres: zero,
      vCredPresCondSus: zero,
    },
    gCBS: { vDif: zero, vDevTrib: zero, vCBS: moneyDe(soma((b) => b.gCBS.vCBS)), vCredPres: zero, vCredPresCondSus: zero },
  };
}
