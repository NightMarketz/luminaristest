import { createHash } from 'crypto';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../features/accounting/models/dates';
import type { TributoConsumo, VencimentoIbsCbs } from '../features/accounting/models/ibsCbsParams';
import type { MemoriaLinha } from '../features/accounting/models/taxAssessmentCalc';
import { fimDoMes } from '../features/accounting/models/taxAssessmentCalcAnual';
import { isHoliday, type Feriados } from '../features/packages/models/validity';

/**
 * IBS-CBS-2027 PR-5 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 22–23; ADR-INCR-IBS-CBS-2027 D6) — resumo do
 * saldo a recolher de UMA apuração mensal (um tributo) e a porta de envio. Puro: sem I/O, sem Prisma, sem `new Date` (molde
 * `mit.ts`). O Luminaris não emite guia nem transmite a apuração (art. 45 § 6º da LC 214): a porta `EnvioApuracaoIbsCbs` é
 * nomeada e NÃO tem adaptador (R5 — Integra Contador/Serpro adiado).
 */

/** Avisos do resumo (dono, 23/10). O texto vai depois do código: "CODIGO: mensagem". */
export const AVISO_RESUMO_IBS_CBS = {
  /** IBS: regulamento do CG-IBS não localizado (P-IBS-5) — linha `IBS_CBS/IBS/VENCIMENTO` em DRAFT. */
  VENCIMENTO_NAO_PUBLICADO: 'VENCIMENTO_NAO_PUBLICADO',
  /** Unidade sem `codMun`: o último dia útil considera só os feriados nacionais. */
  VENCIMENTO_SEM_MUNICIPIO: 'VENCIMENTO_SEM_MUNICIPIO',
  /** saldo (débitos − créditos) < 0: nada a recolher, saldo credor do período. */
  SALDO_CREDOR: 'SALDO_CREDOR',
  /** split extinto > saldo: nada a recolher; o excesso volta ao contribuinte (Dec. 12.955 art. 27 § 1º). */
  SPLIT_EXCEDENTE: 'SPLIT_EXCEDENTE',
  /** O job de recálculo do LEGAL-PARAMS marcou a apuração (item 24). */
  PARAMETRO_LEGAL: 'PARAMETRO_LEGAL',
} as const;

export interface ApuracaoParaResumo {
  id: string;
  tributo: TributoConsumo;
  anoCalendario: number;
  mes: number;
  saldoCents: bigint;
  memoria: readonly MemoriaLinha[];
  avisoParametroLegal: string | null;
}

export interface EntradaResumoIbsCbs {
  apuracao: ApuracaoParaResumo;
  /** Regra da linha `IBS_CBS/<tributo>/VENCIMENTO` vigente na competência; `null` = sem linha publicada. */
  vencimento: VencimentoIbsCbs | null;
  feriados: Feriados;
  /** IBGE de 7 dígitos do município da unidade (`FiscalProfile.codMun`), no lugar do domicílio da matriz (dono, 23/10). */
  codMun: string | null;
}

export interface ResumoIbsCbs {
  id: string;
  tributo: TributoConsumo;
  anoCalendario: number;
  mes: number;
  saldoARecolherCents: bigint;
  vencimento: string | null;
  avisos: string[];
  memoria: MemoriaLinha[];
}

const SPLIT = /^SPLIT_EXTINCAO_\d+$/;

/** Domingo = 0, sábado = 6 (Date.getUTCDay sobre o número do dia UTC). */
const diaDaSemana = (dayNumber: number): number => new Date(dayNumber * 86_400_000).getUTCDay();

/**
 * Decreto 12.955/2026 art. 45 (Planalto compilado, 23/10; dossiê verif-2026-10-23-ibs-cbs-vencimento [D02]): o último dia útil
 * do mês seguinte ao da competência. Não útil = sábado, domingo e feriado nacional, estadual ou municipal (parágrafo único;
 * tabelas `FERIADO_NACIONAL`/`FERIADO_LOCAL`, a mesma regra de `isHoliday` dos pacotes).
 */
export function ultimoDiaUtilDoMesSeguinte(ano: number, mes: number, feriados: Feriados, codMun: string | null): string {
  const [a, m] = mes === 12 ? [ano + 1, 1] : [ano, mes + 1];
  let dia = dayNumberFromDateOnly(fimDoMes(a, m));
  while (diaDaSemana(dia) === 0 || diaDaSemana(dia) === 6 || isHoliday(dateOnlyFromDayNumber(dia), feriados, codMun)) dia -= 1;
  return dateOnlyFromDayNumber(dia);
}

/**
 * Item 22 — saldo a recolher = `saldoCents` − Σ `SPLIT_EXTINCAO_n` (Dec. 12.955 art. 44 § 3º), nunca negativo: ≤ 0 ⇒ 0 com aviso
 * `SALDO_CREDOR` ou `SPLIT_EXCEDENTE` (dono, 23/10). Vencimento pela regra da linha; sem linha publicada ⇒ `null` + aviso
 * (não 400).
 */
export function resumoIbsCbs(e: EntradaResumoIbsCbs): ResumoIbsCbs {
  const a = e.apuracao;
  const split = a.memoria.filter((l) => SPLIT.test(l.codigo)).reduce((s, l) => s + BigInt(l.valorCents), 0n);
  const liquido = a.saldoCents - split;
  const avisos: string[] = [];
  if (a.saldoCents < 0n) {
    avisos.push(`${AVISO_RESUMO_IBS_CBS.SALDO_CREDOR}: saldo credor de ${-a.saldoCents} centavos no período — nada a recolher (LC 214/2025 art. 45).`);
  } else if (liquido < 0n) {
    avisos.push(`${AVISO_RESUMO_IBS_CBS.SPLIT_EXCEDENTE}: split extinto (${split}) maior que o saldo (${a.saldoCents}) — nada a recolher; o excesso de ${-liquido} centavos volta ao contribuinte (Decreto 12.955/2026 art. 27 § 1º).`);
  }
  let vencimento: string | null = null;
  if (!e.vencimento) {
    avisos.push(`${AVISO_RESUMO_IBS_CBS.VENCIMENTO_NAO_PUBLICADO}: vencimento do ${a.tributo} ainda não publicado (regulamento do CG-IBS não localizado — P-IBS-5).`);
  } else {
    vencimento = ultimoDiaUtilDoMesSeguinte(a.anoCalendario, a.mes, e.feriados, e.codMun);
    if (e.codMun === null) avisos.push(`${AVISO_RESUMO_IBS_CBS.VENCIMENTO_SEM_MUNICIPIO}: unidade sem município no perfil fiscal — o vencimento considera só os feriados nacionais.`);
  }
  if (a.avisoParametroLegal) avisos.push(`${AVISO_RESUMO_IBS_CBS.PARAMETRO_LEGAL}: ${a.avisoParametroLegal}`);
  return {
    id: a.id,
    tributo: a.tributo,
    anoCalendario: a.anoCalendario,
    mes: a.mes,
    saldoARecolherCents: liquido > 0n ? liquido : 0n,
    vencimento,
    avisos,
    memoria: [...a.memoria],
  };
}

/** Item 23 — o que a porta entrega a um transmissor (adaptador nenhum, R5). Centavos em string inteira. */
export interface EnvioIbsCbs {
  apuracaoId: string;
  tributo: TributoConsumo;
  periodo: string; // AAAA-MM
  saldoARecolherCents: string;
  vencimento: string | null;
  /** sha256 do JSON canônico acima — o transmissor futuro prova o que recebeu. */
  sha256: string;
}

/** Porta de envio da apuração (LC 214 art. 45 § 6º). Nenhuma implementação neste nó (R5). */
export interface EnvioApuracaoIbsCbs {
  enviar(envio: EnvioIbsCbs): Promise<{ protocolo: string }>;
}

/** Item 23 — função pura que monta o envio a partir do resumo. */
export function montarEnvioApuracaoIbsCbs(r: ResumoIbsCbs): EnvioIbsCbs {
  const corpo = {
    apuracaoId: r.id,
    tributo: r.tributo,
    periodo: `${r.anoCalendario}-${String(r.mes).padStart(2, '0')}`,
    saldoARecolherCents: r.saldoARecolherCents.toString(),
    vencimento: r.vencimento,
  };
  return { ...corpo, sha256: createHash('sha256').update(JSON.stringify(corpo)).digest('hex') };
}
