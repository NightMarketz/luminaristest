import { z } from 'zod';
import { SemLinhaVigenteError } from '../../legalParameters/models/legalParameter';
import { parametroIbsCbsVigente, type ParametroIbsCbs, type TributoConsumo } from './ibsCbsParams';
import type { MemoriaLinha } from './taxAssessmentCalc';

/**
 * IBS-CBS-2027 PR-2 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6, 7, 9 e 11; molde `issCompetencia.ts`).
 * Débito = soma do IBS/CBS **destacado no documento** autorizado (LC 214 art. 60 § 1º [D08]; F-IBS-3 a). A conferência
 * pela tabela só gera aviso e nunca muda o débito (item 7). Créditos = 0 no PR-2 (item 9, `CREDITOS_NAO_IMPLEMENTADOS_PR3`).
 * Puro: sem I/O, sem `new Date`.
 */

/** Contrato de entrada (BRIEF §4.2). `dataEmissaoLocal` é o dia ESCRITO do documento, não ISO UTC. */
export const IbsCbsDocumentoSchema = z
  .object({
    fiscalDocumentId: z.string(),
    dataEmissaoLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['AUTHORIZED', 'AUTHORIZED_DIVERGENT']),
    ibsCents: z.bigint().nullable(),
    cbsCents: z.bigint().nullable(),
    baseCents: z.bigint().nullable(),
    cClassTrib: z.string().regex(/^\d{6}$/).nullable(),
  })
  .strict();
export type IbsCbsDocumento = z.infer<typeof IbsCbsDocumentoSchema>;

/** Códigos da memória (BRIEF §4.2 `MemoriaLinhaIbsCbsKind`) que o PR-2 emite. `_n` = sufixo por documento. */
export const MEMORIA_IBS_CBS = {
  DEBITO_DOC: 'DEBITO_DOC',
  DIVERGENCIA_DOC: 'DIVERGENCIA_DOC',
  VENDA_SEM_DOCUMENTO: 'VENDA_SEM_DOCUMENTO',
  DOCUMENTOS_SEM_GRUPO: 'DOCUMENTOS_SEM_GRUPO',
  CREDITOS_NAO_IMPLEMENTADOS_PR3: 'CREDITOS_NAO_IMPLEMENTADOS_PR3',
  CONFERENCIA_SEM_ALIQUOTA: 'CONFERENCIA_SEM_ALIQUOTA',
  /** Item 12 fora do PR até o #794 (dono, 21/10, sessão-mãe): a confirmação grava sem provisão e declara isso. */
  PROVISAO_PENDENTE_ITEM_12: 'PROVISAO_PENDENTE_ITEM_12',
  SALDO: 'SALDO',
} as const;

/** Item 6: competência = `YYYY-MM` do dia escrito. */
export const competenciaDe = (dataEmissaoLocal: string): string => dataEmissaoLocal.slice(0, 7);

export interface IbsCbsCompetenciaLinha {
  competencia: string;
  tributo: TributoConsumo;
  documentos: number;
  documentosSemGrupo: number;
  debitosCents: bigint;
}

const valorDo = (d: IbsCbsDocumento, t: TributoConsumo): bigint | null => (t === 'IBS' ? d.ibsCents : d.cbsCents);

/**
 * Item 6: agrupa por competência × tributo e soma o valor do documento. Documento sem o grupo do tributo soma 0 e conta
 * em `documentosSemGrupo` (ADR §13.2). Quem chama já filtrou cancelados (o schema só aceita os 2 status vivos).
 */
export function agregarIbsCbsPorCompetencia(docs: readonly IbsCbsDocumento[]): IbsCbsCompetenciaLinha[] {
  const grupos = new Map<string, IbsCbsCompetenciaLinha>();
  for (const raw of docs) {
    const d = IbsCbsDocumentoSchema.parse(raw);
    const competencia = competenciaDe(d.dataEmissaoLocal);
    for (const tributo of ['IBS', 'CBS'] as const) {
      const key = `${competencia}|${tributo}`;
      const g = grupos.get(key) ?? { competencia, tributo, documentos: 0, documentosSemGrupo: 0, debitosCents: 0n };
      const v = valorDo(d, tributo);
      g.documentos += 1;
      if (v === null) g.documentosSemGrupo += 1;
      g.debitosCents += v ?? 0n;
      grupos.set(key, g);
    }
  }
  return [...grupos.values()].sort((a, b) => a.competencia.localeCompare(b.competencia) || a.tributo.localeCompare(b.tributo));
}

export interface ApuracaoIbsCbsInput {
  ano: number;
  mes: number;
  tributo: TributoConsumo;
  /** Fotografia `IBS_CBS` PUBLISHED (PR-1). */
  tabela: readonly ParametroIbsCbs[];
  documentos: readonly IbsCbsDocumento[];
  /** Ids das vendas finalizadas no mês sem documento autorizado (item 7, aviso). */
  vendasSemDocumento: readonly string[];
}

export interface ResultadoIbsCbs {
  tributo: TributoConsumo;
  debitosCents: bigint;
  creditosCents: bigint;
  saldoCents: bigint;
  documentosSemGrupo: number;
  memoria: MemoriaLinha[];
}

const FONTE_DEBITO = 'LC 214/2025 art. 60 § 1º (valor destacado no documento; F-IBS-3 a)';

/** Alíquota de conferência em bp: IBS = UF + Mun (ADR D4, os dois bp na memória); CBS = ALIQUOTA. `null` sem linha publicada. */
function aliquotasDoMes(tabela: readonly ParametroIbsCbs[], tributo: TributoConsumo, data: string): { totalBp: number; descricao: string } | null {
  try {
    if (tributo === 'CBS') {
      const p = parametroIbsCbsVigente(tabela, 'CBS', 'ALIQUOTA', data);
      return { totalBp: p.aliquotaBp, descricao: `CBS ${p.aliquotaBp} bp` };
    }
    const uf = parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_UF', data);
    const mun = parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_MUN', data);
    return { totalBp: uf.aliquotaBp + mun.aliquotaBp, descricao: `IBS UF ${uf.aliquotaBp} bp + Mun ${mun.aliquotaBp} bp` };
  } catch (e) {
    if (e instanceof SemLinhaVigenteError) return null; // F-IBS-11 (a): conferência pulada com aviso
    throw e;
  }
}

/** base × bp / 10000, meio para cima. */
const aplicarBp = (baseCents: bigint, bp: number): bigint => (baseCents * BigInt(bp) + 5000n) / 10000n;

/**
 * Itens 6, 7, 9 e 11 — débito, conferência (aviso), créditos 0 e saldo de um tributo no mês. Documentos de outra
 * competência são ignorados (o filtro de data é responsabilidade do chamador, aqui só se garante).
 */
export function apurarIbsCbsMes(input: ApuracaoIbsCbsInput): ResultadoIbsCbs {
  const { ano, mes, tributo } = input;
  const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
  const docs = input.documentos
    .map((d) => IbsCbsDocumentoSchema.parse(d))
    .filter((d) => competenciaDe(d.dataEmissaoLocal) === competencia)
    .sort((a, b) => a.dataEmissaoLocal.localeCompare(b.dataEmissaoLocal) || a.fiscalDocumentId.localeCompare(b.fiscalDocumentId));
  const memoria: MemoriaLinha[] = [];
  const aliq = aliquotasDoMes(input.tabela, tributo, `${competencia}-01`);
  let debitos = 0n;
  let semGrupo = 0;
  docs.forEach((d, i) => {
    const n = i + 1;
    const v = valorDo(d, tributo);
    if (v === null) semGrupo += 1;
    debitos += v ?? 0n;
    memoria.push({ codigo: `${MEMORIA_IBS_CBS.DEBITO_DOC}_${n}`, descricao: `${tributo} do documento ${d.fiscalDocumentId} (${d.dataEmissaoLocal})`, valorCents: (v ?? 0n).toString(), fonte: FONTE_DEBITO });
    if (aliq && d.baseCents !== null) {
      const esperado = aplicarBp(d.baseCents, aliq.totalBp);
      if (esperado !== (v ?? 0n)) {
        memoria.push({
          codigo: `${MEMORIA_IBS_CBS.DIVERGENCIA_DOC}_${n}`,
          descricao: `conferência: base ${d.baseCents} × ${aliq.descricao} = ${esperado}; o débito segue o documento`,
          valorCents: ((v ?? 0n) - esperado).toString(),
          fonte: 'BRIEF IBS-CBS-2027 item 7 (aviso; nunca muda o débito)',
        });
      }
    }
  });
  if (!aliq) {
    memoria.push({ codigo: MEMORIA_IBS_CBS.CONFERENCIA_SEM_ALIQUOTA, descricao: `sem alíquota ${tributo} publicada em ${competencia}: conferência pulada`, valorCents: '0', fonte: 'F-IBS-11 (a); LC 214/2025 art. 349 I' });
  }
  if (semGrupo > 0) {
    memoria.push({ codigo: MEMORIA_IBS_CBS.DOCUMENTOS_SEM_GRUPO, descricao: `${semGrupo} documento(s) sem o grupo ${tributo}: somam 0`, valorCents: '0', fonte: 'ADR-INCR-IBS-CBS-2027 §13.2' });
  }
  for (const saleId of input.vendasSemDocumento) {
    memoria.push({ codigo: MEMORIA_IBS_CBS.VENDA_SEM_DOCUMENTO, descricao: `venda ${saleId} finalizada em ${competencia} sem documento fiscal autorizado`, valorCents: '0', fonte: 'ADR-INCR-IBS-CBS-2027 F-IBS-3 (a)' });
  }
  memoria.push({ codigo: MEMORIA_IBS_CBS.CREDITOS_NAO_IMPLEMENTADOS_PR3, descricao: 'créditos ainda não implementados (PR-3): 0', valorCents: '0', fonte: 'BRIEF IBS-CBS-2027 item 9' });
  memoria.push({
    codigo: MEMORIA_IBS_CBS.PROVISAO_PENDENTE_ITEM_12,
    descricao: 'reclassificação receita → passivo (item 12) ainda não implementada: nenhum lançamento é feito na confirmação',
    valorCents: '0',
    fonte: 'dono, 2026-10-21 (item 12 aguarda o PR #794)',
  });
  const saldo = debitos; // créditos APROPRIADO = 0 no PR-2 (art. 45 [D08])
  memoria.push({ codigo: MEMORIA_IBS_CBS.SALDO, descricao: `saldo = débitos − créditos${aliq ? ` (${aliq.descricao})` : ''}`, valorCents: saldo.toString(), fonte: 'LC 214/2025 art. 45' });
  return { tributo, debitosCents: debitos, creditosCents: 0n, saldoCents: saldo, documentosSemGrupo: semGrupo, memoria };
}
