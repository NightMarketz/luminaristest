/**
 * BE-INCR-NFCE (nó X10a, item 20; F-NFCE-12b b) — tabelas de domínio do IBS/CBS que as regras do grupo UB consultam
 * (NT 2025.002 v1.52: "Consultar Tabela de Indicadores de CST", "…de cClassTrib", "…de Crédito Presumido"). Fonte: Portal
 * NF-e › Documentos › Diversos, IT 2025.002 v1.70 publicado em 01/10/2026, lido em 27/10/2026 pelo navegador:
 *  - `IT 2025.002 v.1.70 - cClassTrib.xlsx` sha256 bee3e106d24c06257d31105658679e97e2544dcc3ac61467fbe0ca4f78c6e850
 *    (abas "CST 2026-09-01" e "cClass 2026-09-01");
 *  - `IT 2025.002 v.1.70 - cCredPres.xlsx` sha256 5afee01483e532b342700f8c2786f95ba6cf91a4e23ceccfbeb34bf1afef9ee1 (aba "cCredPres").
 * Transcrição: `docs/accounting/fontes-oficiais/TRANSCRICAO-IT2025002-v170-tabelas-IBSCBS-2026-10-27.md` (as colunas usadas,
 * sem os textos de lei). Onda 3.2 fatia 5 (dono, 24/11/2026): as linhas saíram da const e moram em LegalParameter
 * (CST_IBS_CBS, CCLASSTRIB_IBS_CBS, CCREDPRES_IBS_CBS), geradas da TSV da transcrição por `scripts/gerar-carga-ibs-cbs-tabelas.mjs`
 * (sha256 dos três blocos conferido na geração); o teste `ibsCbsTabelasSeed.test.ts` reserializa o SEED e confere o mesmo sha256.
 * Datas da planilha (serial do Excel) convertidas para AAAA-MM-DD.
 */

import { z } from 'zod';
import { LinhaLegalIlegivelError, ParametroLegalAusenteError, linhasEmVigor, type LinhaLegal, type LegalParameterTabela } from '../../legalParameters/models/legalParameter';
import { linhasEmCacheSincrono } from '../../legalParameters/models/legalParameterCache';
import { hojeDateOnly } from '../../legalParameters/models/hoje';

export type Ind = 0 | 1;

/** Tabela de Indicadores de CST (aba "CST 2026-09-01"). */
export interface CstIbsCbs {
  cst: string;
  descricao: string;
  ind_gIBSCBS: Ind;
  ind_gIBSCBSMono: Ind;
  ind_gRed: Ind;
  ind_gDif: Ind;
  ind_gTransfCred: Ind;
  ind_gCredPresIBSZFM: Ind;
  ind_gAjusteCompet: Ind;
  ind_RedutorBC: Ind;
}

/** Tabela de cClassTrib (aba "cClass 2026-09-01") — só as colunas que a montagem e as regras do UB leem. */
export interface CClassTribIbsCbs {
  cst: string;
  cClassTrib: string;
  tipoAliquota: string;
  pRedIBS: number;
  pRedCBS: number;
  ind_gTribRegular: Ind;
  ind_gCredPresOper: Ind;
  ind_gMonoPadrao: Ind;
  ind_gMonoReten: Ind;
  ind_gMonoRet: Ind;
  ind_gpBioDiferenca: Ind;
  ind_gEstornoCred: Ind;
  tpRBSN: number;
  tpDoacao: number;
  dIniVig: string;
  dFimVig: string | null;
  indNFe: Ind;
  indNFCe: Ind;
}

/** Tabela de cCredPres (aba "cCredPres") — `null` onde a planilha deixa a célula vazia. */
export interface CCredPresIbsCbs {
  cCredPres: string;
  apropriaViaNf: Ind;
  apropriaViaEvento: Ind;
  indDeduzCredPres: Ind | null;
  ind_gCBSCredPres: Ind | null;
  ind_gIBSCredPres: Ind | null;
  cClassTribNotaReferenciada: string;
  dIniVigCBS: string | null;
  dFimVigCBS: string | null;
  dIniVigIBS: string | null;
  dFimVigIBS: string | null;
  indNFe: Ind;
  indNFCe: Ind;
}


// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Onda 3.2 fatia 5 (dono, 24/11/2026) — as mesmas tabelas como LegalParameter: CST_IBS_CBS, CCLASSTRIB_IBS_CBS e
// CCREDPRES_IBS_CBS (seed gerado da TSV por `scripts/gerar-carga-ibs-cbs-tabelas.mjs`). A leitura é PURA, parametrizada pela
// fotografia das três tabelas; sem linha de uma delas ⇒ `PARAMETRO_LEGAL_AUSENTE` (fail-closed, nunca "tudo inexistente").
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


export const TABELAS_IBS_CBS = ['CST_IBS_CBS', 'CCLASSTRIB_IBS_CBS', 'CCREDPRES_IBS_CBS'] as const satisfies readonly LegalParameterTabela[];

const IndJson = z.union([z.literal(0), z.literal(1)]);
const Ordem = z.number().int().min(1);
const DataJson = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** `valorJson` das linhas de CST_IBS_CBS (chave = CST de 3 dígitos). */
export const CstIbsCbsJson = z
  .object({
    ordem: Ordem, descricao: z.string().min(1), ind_gIBSCBS: IndJson, ind_gIBSCBSMono: IndJson, ind_gRed: IndJson, ind_gDif: IndJson,
    ind_gTransfCred: IndJson, ind_gCredPresIBSZFM: IndJson, ind_gAjusteCompet: IndJson, ind_RedutorBC: IndJson,
  })
  .strict();
/** `valorJson` das linhas de CCLASSTRIB_IBS_CBS (chave = cClassTrib de 6 dígitos; vigência da planilha = vigenteDesde/vigenteAte). */
export const CClassTribIbsCbsJson = z
  .object({
    ordem: Ordem, cst: z.string().regex(/^\d{3}$/), tipoAliquota: z.string().min(1), pRedIBS: z.number().min(0).max(100), pRedCBS: z.number().min(0).max(100),
    ind_gTribRegular: IndJson, ind_gCredPresOper: IndJson, ind_gMonoPadrao: IndJson, ind_gMonoReten: IndJson, ind_gMonoRet: IndJson,
    ind_gpBioDiferenca: IndJson, ind_gEstornoCred: IndJson, tpRBSN: z.number().int(), tpDoacao: z.number().int(), indNFe: IndJson, indNFCe: IndJson,
  })
  .strict();
/** `valorJson` das linhas de CCREDPRES_IBS_CBS (chave = cCredPres de 2 dígitos; as duas vigências, CBS e IBS, ficam aqui). */
export const CCredPresIbsCbsJson = z
  .object({
    ordem: Ordem, apropriaViaNf: IndJson, apropriaViaEvento: IndJson, indDeduzCredPres: IndJson.nullable(), ind_gCBSCredPres: IndJson.nullable(),
    ind_gIBSCredPres: IndJson.nullable(), cClassTribNotaReferenciada: z.string().min(1), dIniVigCBS: DataJson.nullable(), dFimVigCBS: DataJson.nullable(),
    dIniVigIBS: DataJson.nullable(), dFimVigIBS: DataJson.nullable(), indNFe: IndJson, indNFCe: IndJson,
  })
  .strict();

/** As três tabelas lidas da fotografia: em ordem da planilha (para reserializar a TSV) e indexadas por código. */
export interface TabelasIbsCbs {
  cst: readonly CstIbsCbs[];
  cClassTrib: readonly CClassTribIbsCbs[];
  cCredPres: readonly CCredPresIbsCbs[];
  /** cClassTrib → todas as versões (vigências) do código, da mais antiga para a mais nova. */
  readonly cClassTribPorCodigo: ReadonlyMap<string, readonly CClassTribIbsCbs[]>;
  readonly cstPorCodigo: ReadonlyMap<string, CstIbsCbs>;
  readonly cCredPresPorCodigo: ReadonlyMap<string, CCredPresIbsCbs>;
}

function lerJson<S extends z.ZodType>(schema: S, l: LinhaLegal): z.infer<S> & { ordem: number } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(l.valorJson ?? '');
  } catch {
    throw new LinhaLegalIlegivelError(l.id, l.tabela, l.chave);
  }
  const r = schema.safeParse(bruto);
  if (!r.success) throw new LinhaLegalIlegivelError(l.id, l.tabela, l.chave);
  return r.data as z.infer<S> & { ordem: number };
}

/**
 * Uma linha por código, escolhida PELA DATA (como a versão do cClassTrib): a que cobre `data` (a de `vigenteDesde` mais recente);
 * se nenhuma cobre, a última que já começou (vigência encerrada) e, só se todas começam depois, a que começa primeiro — o código
 * EXISTE, a vigência é outra regra. Assim uma linha publicada hoje com início em 2027 não passa a valer hoje. `supersedes` já
 * resolvido por `linhasEmVigor`.
 */
function porChaveNaData(linhas: readonly LinhaLegal[], tabela: string, data: string): LinhaLegal[] {
  const classe = (l: LinhaLegal): 0 | 1 | 2 => (l.vigenteDesde > data ? 2 : l.vigenteAte === null || data <= l.vigenteAte ? 0 : 1); // cobre | já encerrou | ainda não começou
  const melhor = (a: LinhaLegal, b: LinhaLegal): boolean => (classe(a) !== classe(b) ? classe(a) < classe(b) : classe(a) === 2 ? a.vigenteDesde < b.vigenteDesde : a.vigenteDesde > b.vigenteDesde);
  const porChave = new Map<string, LinhaLegal>();
  for (const l of linhasEmVigor(linhas)) {
    if (l.tabela !== tabela) continue;
    const atual = porChave.get(l.chave);
    if (!atual || melhor(l, atual)) porChave.set(l.chave, l);
  }
  return [...porChave.values()];
}

/**
 * A fotografia → as três tabelas. Falta tabela INTEIRA (carga incompleta) ⇒ `ParametroLegalAusenteError` (400
 * `PARAMETRO_LEGAL_AUSENTE`), nunca uma tabela vazia que recusaria todo CST/cClassTrib como "inexistente" em silêncio.
 * Ausência de UM código dentro de tabela existente continua sendo "inexistente" (rej. 1020/1023/1055).
 */
export function tabelasIbsCbsDe(linhas: readonly LinhaLegal[], data: string): TabelasIbsCbs {
  const cstLinhas = porChaveNaData(linhas, 'CST_IBS_CBS', data);
  const credLinhas = porChaveNaData(linhas, 'CCREDPRES_IBS_CBS', data);
  // cClassTrib guarda TODAS as versões do código: a virada de vigência é uma linha nova, não a troca da antiga.
  const classLinhas = linhasEmVigor(linhas).filter((l) => l.tabela === 'CCLASSTRIB_IBS_CBS');
  if (cstLinhas.length === 0) throw new ParametroLegalAusenteError('CST_IBS_CBS', data);
  if (classLinhas.length === 0) throw new ParametroLegalAusenteError('CCLASSTRIB_IBS_CBS', data);
  if (credLinhas.length === 0) throw new ParametroLegalAusenteError('CCREDPRES_IBS_CBS', data);

  const porOrdem = <T extends { ordem: number }>(xs: T[]): T[] => xs.sort((a, b) => a.ordem - b.ordem);
  const semOrdem = <T extends { ordem: number }>(xs: T[]): Omit<T, 'ordem'>[] => xs.map(({ ordem: _o, ...r }) => r);
  const cst = semOrdem(
    porOrdem(
      cstLinhas.map((l) => {
        const v = lerJson(CstIbsCbsJson, l);
        return { ...v, cst: l.chave };
      }),
    ),
  ) as CstIbsCbs[];
  const cClassTrib = semOrdem(
    porOrdem(
      classLinhas.map((l) => {
        const v = lerJson(CClassTribIbsCbsJson, l);
        return { ...v, cClassTrib: l.chave, dIniVig: l.vigenteDesde, dFimVig: l.vigenteAte };
      }),
    ),
  ) as CClassTribIbsCbs[];
  const cCredPres = semOrdem(
    porOrdem(
      credLinhas.map((l) => {
        const v = lerJson(CCredPresIbsCbsJson, l);
        return { ...v, cCredPres: l.chave };
      }),
    ),
  ) as CCredPresIbsCbs[];

  const versoes = new Map<string, CClassTribIbsCbs[]>();
  for (const c of cClassTrib) versoes.set(c.cClassTrib, [...(versoes.get(c.cClassTrib) ?? []), c]);
  for (const v of versoes.values()) v.sort((a, b) => a.dIniVig.localeCompare(b.dIniVig));
  return {
    cst,
    cClassTrib,
    cCredPres,
    cClassTribPorCodigo: versoes,
    cstPorCodigo: new Map(cst.map((c) => [c.cst, c])),
    cCredPresPorCodigo: new Map(cCredPres.map((c) => [c.cCredPres, c])),
  };
}

/**
 * Só para o DTO Zod estático (emenda §9 L-8, dono 07/10: "DTO lê o cache síncrono"): as tabelas do cache aquecido no boot.
 * Cache frio é defeito de inicialização (erro explícito de `linhasEmCacheSincrono`), tabela vazia é `PARAMETRO_LEGAL_AUSENTE`.
 */
export function tabelasIbsCbsDoCache(data: string = hojeDateOnly()): TabelasIbsCbs {
  return tabelasIbsCbsDe(TABELAS_IBS_CBS.flatMap((t) => linhasEmCacheSincrono(t)) as unknown as LinhaLegal[], data);
}

export const buscarCst = (t: TabelasIbsCbs, cst: string): CstIbsCbs | undefined => t.cstPorCodigo.get(cst);
export const buscarCCredPres = (t: TabelasIbsCbs, c: string): CCredPresIbsCbs | undefined => t.cCredPresPorCodigo.get(c);
/**
 * O cClassTrib do código: a versão vigente em `data`; se nenhuma cobre a data, a mais recente (o código EXISTE — a vigência
 * é outra regra, a da montagem, que dá a mensagem "fora da vigência"). Sem `data`, a mais recente.
 */
export function buscarCClassTrib(t: TabelasIbsCbs, codigo: string, data?: string): CClassTribIbsCbs | undefined {
  const v = t.cClassTribPorCodigo.get(codigo);
  if (!v || v.length === 0) return undefined;
  if (data) {
    for (let i = v.length - 1; i >= 0; i--) {
      const fim = v[i].dFimVig;
      if (data >= v[i].dIniVig && (fim === null || data <= fim)) return v[i];
    }
  }
  return v[v.length - 1];
}
