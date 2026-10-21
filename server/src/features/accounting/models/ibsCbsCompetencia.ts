import { z } from 'zod';
import type { MemoriaLinha } from './taxAssessmentCalc';
import { CBS_REFERENCIA_NAO_PUBLICADA, parametroIbsCbsVigente, type ParametroIbsCbs, type TributoConsumo } from './ibsCbsParams';
import { SemLinhaVigenteError } from '../../legalParameters/models/legalParameter';

/**
 * IBS-CBS-2027 PR-2 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6, 7, 11; ADR D3) — débito do mês por
 * DOCUMENTO autorizado, molde `issCompetencia.ts`. Puro: sem I/O, sem `new Date`.
 *  - Débito = o IBS/CBS que o documento declarou (LC 214 art. 60 § 1º — confissão; F-IBS-3 a), nunca alíquota × base.
 *  - Competência = o dia ESCRITO do documento (`dataEmissaoLocal`, date-only — memória "Date ISO UTC → scopeDay −1").
 *  - Documento sem o valor do tributo soma 0 e conta em `documentosSemGrupo` (invariante §10.2).
 *  - Conferência (item 7): base × alíquota vigente só como aviso `DIVERGENCIA_DOC_n`; sem base ⇒ `CONFERENCIA_SEM_BASE`
 *    (dono, 21/10, lacuna do PR-2: o `FiscalDocument` não guarda a base); sem alíquota publicada ⇒
 *    `CONFERENCIA_SEM_ALIQUOTA` (F-IBS-11 a). O débito nunca muda.
 */

const MEMORIA_FONTE_DEBITO = 'LC 214/2025 art. 60 § 1º (débito = documento autorizado; F-IBS-3 a)';

/** Contrato de entrada (BRIEF §4.2) + `kind`: o item 12 reparte o débito em serviço (NFS-e, 3.1) × mercadoria (NF-e, 3.3). */
export const IbsCbsDocumentoSchema = z
  .object({
    fiscalDocumentId: z.string(),
    kind: z.enum(['NFSE', 'NFE']),
    dataEmissaoLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // dia escrito, não ISO UTC
    status: z.enum(['AUTHORIZED', 'AUTHORIZED_DIVERGENT']),
    ibsCents: z.bigint().nullable(),
    cbsCents: z.bigint().nullable(),
    baseCents: z.bigint().nullable(),
    cClassTrib: z.string().regex(/^\d{6}$/).nullable(),
  })
  .strict();
export type IbsCbsDocumento = z.infer<typeof IbsCbsDocumentoSchema>;

/**
 * Códigos da memória do PR-2 (BRIEF §4.2, item 11; item 12 reescrito). `DEBITO_SERVICO`/`DEBITO_MERCADORIA` são os
 * subtotais que a reclassificação do item 12 lê; `CONFERENCIA_SEM_BASE` é da lacuna de 21/10. Os códigos do PR-3/PR-4
 * entram nos PRs deles.
 */
export const MemoriaLinhaIbsCbsKind = z.enum([
  'DEBITO_DOC', 'DEBITO_SERVICO', 'DEBITO_MERCADORIA', 'DIVERGENCIA_DOC', 'VENDA_SEM_DOCUMENTO', 'DOCUMENTOS_SEM_GRUPO',
  'CONFERENCIA_SEM_BASE', 'CONFERENCIA_SEM_ALIQUOTA', 'CREDITOS_NAO_IMPLEMENTADOS_PR3', 'RECEITA_BRUTA_ATE_APURACAO', 'SALDO',
]);
export type MemoriaLinhaIbsCbsKind = z.infer<typeof MemoriaLinhaIbsCbsKind>;

export interface CompetenciaIbsCbs {
  competencia: string; // YYYY-MM
  tributo: TributoConsumo;
  debitosCents: bigint;
  debitoServicoCents: bigint;
  debitoMercadoriaCents: bigint;
  documentos: number;
  documentosSemGrupo: number;
  /** Linhas `DEBITO_DOC_n`, `DIVERGENCIA_DOC_n` e os avisos da conferência — na ordem dos documentos. */
  memoria: MemoriaLinha[];
}

const valorDoTributo = (d: IbsCbsDocumento, t: TributoConsumo): bigint | null => (t === 'IBS' ? d.ibsCents : d.cbsCents);

/** Alíquota do tributo na data, em bp: IBS = UF + município (ADR D4); `null` quando a linha não está publicada. */
export function aliquotaBpNaData(tabela: readonly ParametroIbsCbs[], t: TributoConsumo, data: string): number | null {
  try {
    if (t === 'CBS') return parametroIbsCbsVigente(tabela, 'CBS', 'ALIQUOTA', data).aliquotaBp;
    return parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_UF', data).aliquotaBp + parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_MUN', data).aliquotaBp;
  } catch (e) {
    if (e instanceof SemLinhaVigenteError) return null;
    throw e;
  }
}

/** Arredondamento half-up de base × bp / 10 000 (centavos). */
const valorPelaTabela = (baseCents: bigint, bp: number): bigint => (baseCents * BigInt(bp) + 5000n) / 10000n;

/**
 * Item 6: agrupa por competência (`dataEmissaoLocal.slice(0, 7)`) × tributo, somando o valor DO DOCUMENTO. Item 7:
 * conferência por documento com valor > 0. Ordem: competência, IBS antes de CBS; documentos na ordem recebida.
 */
export function agregarIbsCbsPorCompetencia(docs: readonly IbsCbsDocumento[], tabela: readonly ParametroIbsCbs[]): CompetenciaIbsCbs[] {
  type Acc = CompetenciaIbsCbs & { semBase: number; semAliquota: number };
  const grupos = new Map<string, Acc>();
  for (const raw of docs) {
    const d = IbsCbsDocumentoSchema.parse(raw);
    const competencia = d.dataEmissaoLocal.slice(0, 7);
    for (const tributo of ['IBS', 'CBS'] as const) {
      const key = `${competencia}|${tributo}`;
      const g: Acc = grupos.get(key) ?? {
        competencia, tributo, debitosCents: 0n, debitoServicoCents: 0n, debitoMercadoriaCents: 0n,
        documentos: 0, documentosSemGrupo: 0, memoria: [], semBase: 0, semAliquota: 0,
      };
      g.documentos += 1;
      const v = valorDoTributo(d, tributo);
      if (v === null) {
        g.documentosSemGrupo += 1;
        grupos.set(key, g);
        continue;
      }
      g.debitosCents += v;
      if (d.kind === 'NFSE') g.debitoServicoCents += v;
      else g.debitoMercadoriaCents += v;
      const n = g.documentos;
      g.memoria.push({
        codigo: `DEBITO_DOC_${n}`,
        descricao: `${tributo} declarado no documento ${d.fiscalDocumentId} (${d.kind === 'NFSE' ? 'NFS-e, serviço' : 'NF-e, mercadoria'}) de ${d.dataEmissaoLocal}`,
        valorCents: v.toString(),
        fonte: MEMORIA_FONTE_DEBITO,
      });
      if (d.baseCents === null) {
        g.semBase += 1;
      } else {
        const bp = aliquotaBpNaData(tabela, tributo, d.dataEmissaoLocal);
        if (bp === null) {
          g.semAliquota += 1;
        } else {
          const esperado = valorPelaTabela(d.baseCents, bp);
          if (esperado !== v) {
            g.memoria.push({
              codigo: `DIVERGENCIA_DOC_${n}`,
              descricao: `documento ${d.fiscalDocumentId}: declarado ${v} ≠ base ${d.baseCents} × ${bp} bp = ${esperado} (aviso — o débito é o declarado)`,
              valorCents: (v - esperado).toString(),
              fonte: 'BRIEF IBS-CBS-2027 item 7 (conferência só como aviso; F-IBS-3 a)',
            });
          }
        }
      }
      grupos.set(key, g);
    }
  }
  return [...grupos.values()]
    .sort((a, b) => a.competencia.localeCompare(b.competencia) || a.tributo.localeCompare(b.tributo))
    .map(({ semBase, semAliquota, ...g }) => {
      const avisos: MemoriaLinha[] = [];
      if (semBase > 0) {
        avisos.push({
          codigo: 'CONFERENCIA_SEM_BASE',
          descricao: `${semBase} documento(s) sem base de ${g.tributo} gravada — conferência pulada (o débito é o declarado)`,
          valorCents: '0',
          fonte: 'BRIEF IBS-CBS-2027 item 7; lacuna do PR-2 ratificada 21/10',
        });
      }
      if (semAliquota > 0) {
        avisos.push({
          codigo: 'CONFERENCIA_SEM_ALIQUOTA',
          descricao: `${semAliquota} documento(s) sem alíquota de ${g.tributo} publicada na data — conferência pulada${g.tributo === 'CBS' ? ` (${CBS_REFERENCIA_NAO_PUBLICADA})` : ''}`,
          valorCents: '0',
          fonte: 'F-IBS-11 (a), ratificado 21/10',
        });
      }
      return { ...g, memoria: [...g.memoria, ...avisos] };
    });
}
