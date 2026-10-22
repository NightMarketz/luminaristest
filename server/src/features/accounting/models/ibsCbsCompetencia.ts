import { z } from 'zod';
import { SemLinhaVigenteError } from '../../legalParameters/models/legalParameter';
import { parametroIbsCbsVigente, type ParametroIbsCbs, type TributoConsumo } from './ibsCbsParams';
import type { MemoriaLinha } from './taxAssessmentCalc';
import type { IbsCbsCreditoNota } from './ibsCbsCredito';
import type { ResultadoAntecipacao } from './ibsCbsAntecipacao';

/**
 * IBS-CBS-2027 PR-2 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6, 7, 9 e 11; molde `issCompetencia.ts`).
 * Débito = soma do IBS/CBS **destacado no documento** autorizado (LC 214 art. 60 § 1º [D08]; F-IBS-3 a). A conferência
 * pela tabela só gera aviso e nunca muda o débito (item 7). PR-3 (itens 16–18): créditos `APROPRIADO` no mês somam
 * (art. 45), `PENDENTE` e uso/consumo só aparecem na memória; a antecipação do pacote soma ao débito (art. 10 § 4º).
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
    /** Item 12: a perna da reclassificação — NFS-e = serviço (`receita-serviço`), NF-e = mercadoria (`receita-revenda`). */
    natureza: z.enum(['SERVICO', 'MERCADORIA']),
  })
  .strict();
export type IbsCbsDocumento = z.infer<typeof IbsCbsDocumentoSchema>;

/** Códigos da memória (BRIEF §4.2 `MemoriaLinhaIbsCbsKind`) que o PR-2 emite. `_n` = sufixo por documento. */
export const MEMORIA_IBS_CBS = {
  DEBITO_DOC: 'DEBITO_DOC',
  DIVERGENCIA_DOC: 'DIVERGENCIA_DOC',
  VENDA_SEM_DOCUMENTO: 'VENDA_SEM_DOCUMENTO',
  DOCUMENTOS_SEM_GRUPO: 'DOCUMENTOS_SEM_GRUPO',
  /** PR-3 (item 16): crédito APROPRIADO no mês (soma), PENDENTE (não soma — §10.3) e uso/consumo pessoal (art. 57, fora). */
  CREDITO_ENTRADA: 'CREDITO_ENTRADA',
  CREDITO_NAO_APROPRIADO: 'CREDITO_NAO_APROPRIADO',
  USO_CONSUMO_PESSOAL: 'USO_CONSUMO_PESSOAL',
  CONFERENCIA_SEM_ALIQUOTA: 'CONFERENCIA_SEM_ALIQUOTA',
  /** Item 7 (dono 21/10): documento sem a base de IBS/CBS ⇒ conferência pulada com aviso; o débito não muda (F-IBS-3). */
  CONFERENCIA_SEM_BASE: 'CONFERENCIA_SEM_BASE',
  /** Item 12: quanto do débito sai de cada receita (serviço × mercadoria) na reclassificação mensal. */
  RECLASSIFICACAO_SERVICO: 'RECLASSIFICACAO_SERVICO',
  RECLASSIFICACAO_REVENDA: 'RECLASSIFICACAO_REVENDA',
  /** Item 12 (F-IBS-14 a): o balancete intramensal mostra a receita bruta até a apuração do mês. */
  RECEITA_BRUTA_ATE_APURACAO: 'RECEITA_BRUTA_ATE_APURACAO',
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
  /** PR-3 (item 16): linhas de crédito das notas de entrada até o fim do mês (todas as do tributo e de outro — filtra aqui). */
  creditos?: readonly IbsCbsCreditoNota[];
  /** PR-3 (itens 17–18): antecipação e acerto do pacote já calculados para o tributo/mês (`antecipacaoIbsCbsMes`). */
  antecipacao?: ResultadoAntecipacao;
}

export interface ResultadoIbsCbs {
  tributo: TributoConsumo;
  /** Documentos + antecipações + acertos a maior (ADR §7: "Σ documentos autorizados + antecipações"). */
  debitosCents: bigint;
  /** Item 12: só a parte dos documentos — a que a reclassificação tira da receita (a antecipação não muda o razão, V7). */
  documentosCents: bigint;
  creditosCents: bigint;
  saldoCents: bigint;
  /** Item 12: o débito repartido pela natureza do documento (soma = `debitosCents`). */
  servicoCents: bigint;
  revendaCents: bigint;
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
  let servico = 0n;
  let semGrupo = 0;
  let semBase = 0;
  docs.forEach((d, i) => {
    const n = i + 1;
    const v = valorDo(d, tributo);
    if (v === null) semGrupo += 1;
    debitos += v ?? 0n;
    if (d.natureza === 'SERVICO') servico += v ?? 0n;
    memoria.push({ codigo: `${MEMORIA_IBS_CBS.DEBITO_DOC}_${n}`, descricao: `${tributo} do documento ${d.fiscalDocumentId} (${d.dataEmissaoLocal})`, valorCents: (v ?? 0n).toString(), fonte: FONTE_DEBITO });
    if (aliq && d.baseCents === null) semBase += 1;
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
  if (semBase > 0) {
    memoria.push({ codigo: MEMORIA_IBS_CBS.CONFERENCIA_SEM_BASE, descricao: `${semBase} documento(s) sem a base de ${tributo}: conferência pulada; o débito segue o documento`, valorCents: '0', fonte: 'BRIEF IBS-CBS-2027 item 7; dono 21/10' });
  }
  if (semGrupo > 0) {
    memoria.push({ codigo: MEMORIA_IBS_CBS.DOCUMENTOS_SEM_GRUPO, descricao: `${semGrupo} documento(s) sem o grupo ${tributo}: somam 0`, valorCents: '0', fonte: 'ADR-INCR-IBS-CBS-2027 §13.2' });
  }
  for (const saleId of input.vendasSemDocumento) {
    memoria.push({ codigo: MEMORIA_IBS_CBS.VENDA_SEM_DOCUMENTO, descricao: `venda ${saleId} finalizada em ${competencia} sem documento fiscal autorizado`, valorCents: '0', fonte: 'ADR-INCR-IBS-CBS-2027 F-IBS-3 (a)' });
  }
  const documentos = debitos;
  if (input.antecipacao) {
    memoria.push(...input.antecipacao.memoria);
    debitos += input.antecipacao.debitosCents;
  }
  const creditos = creditosDoMes(memoria, tributo, competencia, `${competencia}-31`, input.creditos ?? []);
  const revenda = documentos - servico;
  const FONTE_RECLASS = 'F-IBS-8 (c) — IBS/CBS fora do resultado; BRIEF IBS-CBS-2027 item 12';
  memoria.push({ codigo: MEMORIA_IBS_CBS.RECLASSIFICACAO_SERVICO, descricao: `D receita de serviços / C ${tributo} a recolher (NFS-e do mês)`, valorCents: servico.toString(), fonte: FONTE_RECLASS });
  memoria.push({ codigo: MEMORIA_IBS_CBS.RECLASSIFICACAO_REVENDA, descricao: `D receita de revenda / C ${tributo} a recolher (NF-e do mês)`, valorCents: revenda.toString(), fonte: FONTE_RECLASS });
  memoria.push({
    codigo: MEMORIA_IBS_CBS.RECEITA_BRUTA_ATE_APURACAO,
    descricao: `até a apuração de ${competencia}, o balancete mostra a receita bruta com o ${tributo} dentro; a reclassificação é lançada no último dia do mês`,
    valorCents: '0',
    fonte: 'F-IBS-14 (a), ratificado 21/10',
  });
  const saldo = debitos - creditos; // art. 45 [D08]; negativo = saldo credor
  memoria.push({ codigo: MEMORIA_IBS_CBS.SALDO, descricao: `saldo = débitos − créditos${aliq ? ` (${aliq.descricao})` : ''}`, valorCents: saldo.toString(), fonte: 'LC 214/2025 art. 45' });
  return { tributo, debitosCents: debitos, documentosCents: documentos, creditosCents: creditos, saldoCents: saldo, servicoCents: servico, revendaCents: revenda, documentosSemGrupo: semGrupo, memoria };
}

const FONTE_CREDITO = 'LC 214/2025 art. 47 (crédito na extinção; § 1º I segregado por tributo); F-IBS-4 a';

/**
 * Item 16 — créditos do tributo no mês. Soma só `APROPRIADO` com `apropriadoEm` no mês (`CREDITO_ENTRADA_n`); o que no fim
 * do mês ainda estava pendente (status PENDENTE, ou apropriado depois) vira `CREDITO_NAO_APROPRIADO_n` e **nunca** soma
 * (invariante §10.3); nota do mês com item de uso/consumo pessoal ⇒ `USO_CONSUMO_PESSOAL_n` (art. 57, fora do crédito).
 */
function creditosDoMes(memoria: MemoriaLinha[], tributo: TributoConsumo, competencia: string, fimDoMes: string, notas: readonly IbsCbsCreditoNota[]): bigint {
  const doTributo = notas.filter((c) => c.tributo === tributo).sort((a, b) => a.issueDate.localeCompare(b.issueDate) || a.payableId.localeCompare(b.payableId));
  const rotulo = (c: IbsCbsCreditoNota) => `nota ${c.documentNumber ?? c.payableId} (${c.issueDate})`;
  let total = 0n;
  let nE = 0;
  let nP = 0;
  let nU = 0;
  for (const c of doTributo) {
    if (c.amountCents > 0n && c.status === 'APROPRIADO' && c.apropriadoEm !== null && competenciaDe(c.apropriadoEm) === competencia) {
      total += c.amountCents;
      memoria.push({ codigo: `${MEMORIA_IBS_CBS.CREDITO_ENTRADA}_${++nE}`, descricao: `crédito de ${tributo} apropriado em ${c.apropriadoEm}: ${rotulo(c)}`, valorCents: c.amountCents.toString(), fonte: FONTE_CREDITO });
    } else if (c.amountCents > 0n && c.issueDate <= fimDoMes && (c.status === 'PENDENTE' || (c.apropriadoEm !== null && c.apropriadoEm > fimDoMes))) {
      memoria.push({ codigo: `${MEMORIA_IBS_CBS.CREDITO_NAO_APROPRIADO}_${++nP}`, descricao: `crédito de ${tributo} pendente de extinção (não soma): ${rotulo(c)}`, valorCents: c.amountCents.toString(), fonte: FONTE_CREDITO });
    }
    if (c.usoConsumoCents > 0n && competenciaDe(c.issueDate) === competencia) {
      memoria.push({ codigo: `${MEMORIA_IBS_CBS.USO_CONSUMO_PESSOAL}_${++nU}`, descricao: `${tributo} de item de uso ou consumo pessoal, sem crédito (custo do item): ${rotulo(c)}`, valorCents: c.usoConsumoCents.toString(), fonte: 'LC 214/2025 art. 57; lista IBS_CBS_USO_CONSUMO (P-IBS-2)' });
    }
  }
  return total;
}
