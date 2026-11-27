import type { TaxAssessment } from 'generated/prisma';
import { MemoriaCalculoSchema, valorLinha } from './taxAssessmentCalc';
import { PROVISAO_AJUSTE_ANUAL } from './taxAssessmentCalcAnual';
import { MODO_PIS_COFINS } from './pisCofinsCalc';

/**
 * Provisão de tributo da apuração (IRPJ/CSLL/PIS/Cofins): o que a linha provisiona, o que consome de crédito e quando a
 * provisão está pendente. Funções PURAS sobre a linha da apuração — moradas aqui (e não no `TaxAssessmentService`) para que o
 * núcleo do razão não importe o serviço fiscal (Onda 1.2, regra C1 do `ADR-ARCH-BOUNDARIES`): o encerramento do exercício
 * consulta a pendência pela porta `ClosingGuard`, e o adaptador BR (`paises/br/adapters/TaxProvisionClosingGuard`) é quem lê isto.
 * `TaxAssessmentService` reexporta tudo, então nenhum importador antigo muda.
 */

export type LinhaProvisao = Pick<TaxAssessment, 'periodo' | 'devidoCents' | 'diferencaPostergadaCents' | 'memoria'>;

/**
 * Item 15 da Fase A + item 16 da Fase B (F-TB-3 a) — o que a linha provisiona, com sinal: trimestre e mês A0m = devido +
 * diferença postergada (só no IRPJ do mês do excesso); `A00` = devido anual − o que os meses provisionaram, lido da
 * memória confirmada (`PROVISAO_AJUSTE_ANUAL`): > 0 ⇒ D despesa / C a recolher; < 0 ⇒ D saldo negativo / C despesa.
 */
export function valorProvisao(row: LinhaProvisao): bigint {
  if (row.periodo === 'A00') return valorLinha(MemoriaCalculoSchema.parse(row.memoria), PROVISAO_AJUSTE_ANUAL, row.periodo);
  return row.devidoCents + row.diferencaPostergadaCents;
}

export type LinhaPisCofins = Pick<TaxAssessment, 'modo' | 'periodo' | 'devidoCents' | 'memoria'>;

/** O que a provisão de PIS/COFINS do mês reconhece e baixa no "a recuperar" (BRIEF X8 item 17 + L-1..L-5). */
export interface ConsumoPisCofins {
  /** L-5: outros créditos do mês (art. 3º III–IX, informados) — entram no "a recuperar" (D a recuperar / C redutora). */
  outrosDoMes: bigint;
  /** L-1 (a): crédito da NF-e do mês consumido (a NF-e consome primeiro). */
  nfe: bigint;
  /** L-4 (a): outros créditos do mês consumidos, depois da NF-e. */
  outros: bigint;
  /** L-2: saldo credor anterior consumido, por último. */
  saldoAnterior: bigint;
  /** Retenções (dono 06/10): as sofridas no mês (`RETENCAO_n`) — entram no "retido a compensar" (nos 2 regimes). */
  retencoesDoMes: bigint;
  /** Retenções abatidas do que sobrou do débito depois dos créditos; o excedente fica no "retido a compensar". */
  retencoes: bigint;
}

const minB = (a: bigint, b: bigint): bigint => (a < b ? a : b);
const CREDITO_NFE_CODIGOS = ['CREDITO_NFE', 'CREDITO_NFE_DERIVADO'];

/**
 * BRIEF X8 item 17 com as decisões do dono de 06/10 ([[D-2026-10-06-X8-PR3-LACUNAS]]), só no não cumulativo (no
 * cumulativo tudo é 0 — sem crédito, EMENDA §7 leitura 5):
 *  - L-5 (reabre em parte o F-PCB-3 a; prática citando ADI SRF 3/2007): os outros créditos do mês entram no "a
 *    recuperar" — D PIS/COFINS a recuperar / C redutora de despesa (`pisCofinsCreditoOutrosAccountId`), nunca receita;
 *  - consumo contra o débito na ordem da memória (L-1 a, L-4 a): NF-e do mês → outros do mês → saldo anterior (L-2);
 *    parcial ⇒ só o usado; mês sem débito ⇒ nada consumido.
 */
export function consumoPisCofins(row: LinhaPisCofins): ConsumoPisCofins {
  const zero: ConsumoPisCofins = { outrosDoMes: 0n, nfe: 0n, outros: 0n, saldoAnterior: 0n, retencoesDoMes: 0n, retencoes: 0n };
  const ehPisCofins = row.modo === MODO_PIS_COFINS.NAO_CUMULATIVO || row.modo === MODO_PIS_COFINS.CUMULATIVO;
  if (!ehPisCofins) return zero;
  const memoria = MemoriaCalculoSchema.parse(row.memoria);
  const soma = (pred: (codigo: string) => boolean) => memoria.filter((m) => pred(m.codigo)).reduce((s, m) => s + BigInt(m.valorCents), 0n);
  const retencoesDoMes = soma((c) => /^RETENCAO_\d+$/.test(c));
  let restante = row.devidoCents;
  let c = zero;
  if (row.modo === MODO_PIS_COFINS.NAO_CUMULATIVO) {
    const nfeMes = soma((c) => CREDITO_NFE_CODIGOS.includes(c));
    const outrosDoMes = soma((c) => c.startsWith('CREDITO_') && !CREDITO_NFE_CODIGOS.includes(c));
    const saldo = soma((c) => c === 'SALDO_CREDOR_ANTERIOR');
    const nfe = minB(nfeMes, restante);
    restante -= nfe;
    const outros = minB(outrosDoMes, restante);
    restante -= outros;
    const saldoAnterior = minB(saldo, restante);
    restante -= saldoAnterior;
    c = { ...c, outrosDoMes, nfe, outros, saldoAnterior };
  }
  // A ordem da função pura (`apurarPisCofinsMensal`): a pagar = max(0, débito − créditos − retenções).
  return { ...c, retencoesDoMes, retencoes: minB(retencoesDoMes, restante) };
}

/** L-1 (a): crédito da NF-e do mês consumido. */
export const creditoNfeAproveitado = (row: LinhaPisCofins): bigint => consumoPisCofins(row).nfe;
/** L-2: saldo credor anterior consumido no mês. */
export const saldoAnteriorAproveitado = (row: LinhaPisCofins): bigint => consumoPisCofins(row).saldoAnterior;

/**
 * Decisão do dono 04/10 (lacuna L-C do PR-3 da Fase A), generalizada na Fase B: pendente ⇔ CONFIRMED ∧ valor da provisão
 * ≠ 0 ∧ sem lançamento. Valor 0 (suspensão do balancete, ajuste igual aos meses) não tem o que provisionar (o `postEntry`
 * recusa lançamento zerado) e não bloqueia o encerramento. X8 PR-3 (L-5): um mês de PIS/COFINS sem débito mas com outros
 * créditos tem o que lançar (o reconhecimento no "a recuperar") — senão o saldo credor que eles geram seria baixado
 * depois sem nunca ter entrado no ativo.
 */
export function provisaoPendente(row: LinhaProvisao & Pick<TaxAssessment, 'status' | 'provisaoEntryId' | 'modo'>): boolean {
  if (row.status !== 'CONFIRMED' || row.provisaoEntryId !== null) return false;
  if (valorProvisao(row) !== 0n) return true;
  const c = consumoPisCofins(row);
  return c.outrosDoMes > 0n || c.retencoesDoMes > 0n; // dono 06/10: retenção sem débito também é reconhecida
}
