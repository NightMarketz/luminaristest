import { ValidationError } from '../../../lib/errors';
import { linha, maxZero, type MemoriaLinha } from './taxAssessmentCalc';
import { mulBp } from './taxAssessmentParams';
import { fimDoMes } from './taxAssessmentCalcAnual';
import {
  PIS_COFINS_REVOGACAO_FONTE,
  parametroPisCofinsVigente,
  type CreditoPisCofinsNota,
  type ModalidadePisCofins,
  type ParametroPisCofins,
  type TributoPisCofins,
} from './pisCofinsParams';

/**
 * BE-INCR-PIS-COFINS (nó X8, BRIEF itens 7, 8, 10, 11; ADR D3/D4/D7/D8) — função PURA `(entrada, tabela vigente) →
 * memória` da apuração MENSAL de PIS e Cofins. Sem I/O: quem lê razão, NF-e do mês, perfis e a apuração confirmada
 * do mês anterior é o `PisCofinsAssessmentService`. Erros de entrada = `ValidationError` (400).
 *
 * Toda linha da memória guarda o valor já arredondado (half-up, a função única do X7 — F-TA-2 a / ADR D8).
 */

/** ADR D1 / BRIEF §2: `M01..M12` — vocabulário próprio, distinto do `A01..A12` do IRPJ/CSLL anual do X7. */
export const PERIODOS_PIS_COFINS = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12'] as const;
export type PeriodoPisCofins = (typeof PERIODOS_PIS_COFINS)[number];
export const TRIBUTOS_PIS_COFINS: readonly TributoPisCofins[] = ['PIS', 'COFINS'];
export const isPeriodoPisCofins = (p: string): p is PeriodoPisCofins => (PERIODOS_PIS_COFINS as readonly string[]).includes(p);
export const mesDoPeriodo = (p: PeriodoPisCofins): number => Number(p.slice(1));
export const periodoDoMes = (m: number): PeriodoPisCofins => `M${String(m).padStart(2, '0')}` as PeriodoPisCofins;

/** BRIEF item 12: `modo` gravado no `TaxAssessment`. */
export const MODO_PIS_COFINS: Record<ModalidadePisCofins, string> = {
  CUMULATIVO: 'PIS_COFINS_CUMULATIVO',
  NAO_CUMULATIVO: 'PIS_COFINS_NAO_CUMULATIVO',
};

export type TipoAjusteBase = 'ALIQUOTA_ZERO_REVENDA' | 'COTA_PARTE_PARCEIRO';
export type IncisoCredito = 'III_ENERGIA' | 'IV_ALUGUEL_PJ' | 'V_ARRENDAMENTO' | 'VI_VII_DEPRECIACAO' | 'IX_FRETE_VENDA';

/** Inciso do art. 3º da Lei 10.833/2003 citado na memória (F-X8-8 a). */
const INCISO_LEI: Record<IncisoCredito, string> = {
  III_ENERGIA: 'III',
  IV_ALUGUEL_PJ: 'IV',
  V_ARRENDAMENTO: 'V',
  VI_VII_DEPRECIACAO: 'VI/VII',
  IX_FRETE_VENDA: 'IX',
};

export interface AjusteBaseInformado {
  tipo: TipoAjusteBase;
  valorCents: string;
  documento?: string;
}
export interface OutroCreditoInformado {
  inciso: IncisoCredito;
  baseCents: string;
  documento?: string;
}
export interface RetencaoInformada {
  tributo: TributoPisCofins;
  valorCents: string;
  documento?: string;
}

/** Item 11 (F-PCB-2 a): de onde veio o saldo credor do mês anterior. */
export type OrigemSaldoAnterior =
  | { tipo: 'LIDO'; periodo: string; ano: number; PIS: bigint; COFINS: bigint }
  | { tipo: 'INFORMADO'; PIS: bigint; COFINS: bigint }
  | { tipo: 'NENHUM' };

export interface EntradaPisCofins {
  ano: number;
  periodo: PeriodoPisCofins;
  modalidade: ModalidadePisCofins;
  /** Item 7 — `receitaBrutaPorAtividade` do mês (o gate de exaustividade do X7 já rodou, sem mudança — F-PCB-1 b). */
  receitaServicoCents: bigint;
  receitaRevendaCents: bigint;
  ajustesBase: AjusteBaseInformado[];
  outrosCreditos: OutroCreditoInformado[];
  retencoes: RetencaoInformada[];
  /** Item 6 — notas do mês (só `NAO_CUMULATIVO`; no cumulativo o chamador passa `[]`). */
  creditosNfe: CreditoPisCofinsNota[];
  saldoAnterior: OrigemSaldoAnterior;
}

export interface ResultadoPisCofins {
  tributo: TributoPisCofins;
  modo: string;
  codigoReceita: string;
  baseCents: bigint;
  /** Débito do mês. */
  devidoCents: bigint;
  /** Créditos (NF-e + outros + saldo anterior) + retenções do tributo. */
  deducoesCents: bigint;
  aPagarCents: bigint;
  /** ADR §6: no `TaxAssessment`, `saldoNegativoCents` é o saldo credor a transportar (D4). */
  saldoNegativoCents: bigint;
  memoria: MemoriaLinha[];
  tabelaVersao: string;
}

/** Versão da tabela `pisCofinsParams.ts` gravada em cada apuração (molde `TAX_ASSESSMENT_TABELA_VERSAO`). */
export const PIS_COFINS_TABELA_VERSAO = 'pis-cofins-2026-10-06';

const F_BASE: Record<ModalidadePisCofins, string> = {
  CUMULATIVO: 'IN RFB 2.121/2022 arts. 25 II § 2º e 122; Lei 9.718/1998 art. 3º',
  NAO_CUMULATIVO: 'IN RFB 2.121/2022 arts. 25 I e 145; Leis 10.637/2002 e 10.833/2003 art. 1º',
};
const F_ALIQ_ZERO = 'Lei 10.147/2000 art. 2º; IN RFB 2.121/2022 art. 487';
const F_COTA_PARTE = 'Lei 12.592/2012 art. 1º-A § 5º';
const F_CREDITO_NFE = 'Lei 10.833/2003 art. 3º I e II, § 1º I (Lei 10.637/2002 art. 3º no PIS) — NF-e do mês pelo issueDate (P-3)';
const F_DERIVADO = 'F-X8-7 (a): nota anterior à gravação separada — PIS × Cofins derivados de amountCents por 165:760';
const F_SALDO = 'Lei 10.833/2003 art. 3º § 4º (Lei 10.637/2002 art. 3º § 4º no PIS)';
const F_RETENCAO = 'IN RFB 2.121/2022 art. 120; ADR-INCR-PIS-COFINS D7';
const F_EXCEDENTE = 'F-TA-9 (a), por analogia — compensação/restituição fora do sistema';

/**
 * ADR D2 / F-X8-3 (a): o regime da PJ no ano decide a modalidade — `PRESUMIDO` ⇒ cumulativo (IN 2.121 art. 122),
 * `REAL` ⇒ não cumulativo (art. 145). `SIMPLES`/`MEI` ⇒ 400 (recolhido no DAS).
 */
export function modalidadeDoRegime(regime: string): ModalidadePisCofins {
  if (regime === 'SIMPLES' || regime === 'MEI') {
    throw new ValidationError(`regime ${regime}: PIS/Cofins são recolhidos no DAS — sem apuração mensal própria (ADR-INCR-PIS-COFINS D2).`);
  }
  if (regime === 'PRESUMIDO') return 'CUMULATIVO';
  if (regime === 'REAL') return 'NAO_CUMULATIVO';
  throw new ValidationError(`regime '${regime}' sem apuração de PIS/Cofins.`);
}

/** Item 3 / ADR D9: linha vigente no último dia do mês; sem linha ⇒ 400 (revogação a partir de 2027-01). */
export function parametrosDoMes(ano: number, periodo: PeriodoPisCofins, modalidade: ModalidadePisCofins): Record<TributoPisCofins, ParametroPisCofins> {
  const data = fimDoMes(ano, mesDoPeriodo(periodo));
  const pis = parametroPisCofinsVigente('PIS', modalidade, data);
  const cofins = parametroPisCofinsVigente('COFINS', modalidade, data);
  if (!pis || !cofins) {
    throw new ValidationError(`${periodo}/${ano}: PIS/Cofins revogados a partir de 2027-01 (${PIS_COFINS_REVOGACAO_FONTE}) — CBS é da onda 3.`);
  }
  return { PIS: pis, COFINS: cofins };
}

/**
 * Item 7 (F-X8-5 a / F-X8-6 a): Σ `ALIQUOTA_ZERO_REVENDA` ≤ revenda do mês e Σ `COTA_PARTE_PARCEIRO` ≤ serviço do mês,
 * senão 400 nomeando o tipo; `COTA_PARTE_PARCEIRO` sem `documento` ⇒ 400 (Lei 12.592 art. 1º-A § 8º; P-6).
 */
function validarAjustes(e: EntradaPisCofins): void {
  let zero = 0n;
  let cota = 0n;
  for (const a of e.ajustesBase) {
    if (a.tipo === 'COTA_PARTE_PARCEIRO') {
      if (!a.documento) throw new ValidationError('COTA_PARTE_PARCEIRO: informe o contrato de parceria em documento (Lei 12.592/2012 art. 1º-A § 8º).');
      cota += BigInt(a.valorCents);
    } else zero += BigInt(a.valorCents);
  }
  if (zero > e.receitaRevendaCents) {
    throw new ValidationError(`ALIQUOTA_ZERO_REVENDA: ${zero} centavos acima da receita de revenda do mês (${e.receitaRevendaCents} centavos).`);
  }
  if (cota > e.receitaServicoCents) {
    throw new ValidationError(`COTA_PARTE_PARCEIRO: ${cota} centavos acima da receita de serviço do mês (${e.receitaServicoCents} centavos).`);
  }
}

/**
 * Itens 7, 8, 10, 11 — PIS e Cofins do mês, juntos (D1). Por tributo:
 *  - base = serviço + revenda − Σ ajustes; débito = arred(base × alíquota);
 *  - crédito (só não cumulativo) = NF-e do mês + Σ outros × alíquota + saldo credor anterior;
 *  - a pagar = max(0, débito − crédito − retenções); saldo credor = max(0, crédito − débito); retenção acima do devido
 *    depois do crédito ⇒ a pagar 0 e o excedente na memória (F-TA-9 a, por analogia — fora do sistema).
 * Cumulativo com `outrosCreditos` ou com saldo credor anterior INFORMADO > 0 ⇒ 400 ("cumulativo não tem crédito").
 */
export function apurarPisCofinsMensal(e: EntradaPisCofins): Record<TributoPisCofins, ResultadoPisCofins> {
  const params = parametrosDoMes(e.ano, e.periodo, e.modalidade);
  const naoCumulativo = e.modalidade === 'NAO_CUMULATIVO';
  if (!naoCumulativo) {
    if (e.outrosCreditos.length > 0) throw new ValidationError('outrosCreditos: o cumulativo não tem crédito (IN RFB 2.121/2022 art. 122; BRIEF X8 item 8).');
    if (e.saldoAnterior.tipo === 'INFORMADO' && (e.saldoAnterior.PIS > 0n || e.saldoAnterior.COFINS > 0n)) {
      throw new ValidationError('saldoCredorAnterior: o cumulativo não tem crédito (IN RFB 2.121/2022 art. 122; BRIEF X8 item 8).');
    }
  }
  validarAjustes(e);

  const out = {} as Record<TributoPisCofins, ResultadoPisCofins>;
  for (const t of ['PIS', 'COFINS'] as const) {
    const p = params[t];
    const memoria: MemoriaLinha[] = [
      linha('RECEITA_SERVICO', 'Receita bruta de serviço do mês (conta 3.1)', e.receitaServicoCents, F_BASE[e.modalidade]),
      linha('RECEITA_REVENDA', 'Receita bruta de revenda do mês (conta 3.3)', e.receitaRevendaCents, F_BASE[e.modalidade]),
    ];
    let ajustes = 0n;
    let nZero = 0;
    let nCota = 0;
    for (const a of e.ajustesBase) {
      const v = BigInt(a.valorCents);
      ajustes += v;
      const doc = a.documento ? ` — ${a.documento}` : '';
      if (a.tipo === 'ALIQUOTA_ZERO_REVENDA') {
        nZero += 1;
        memoria.push(linha(`AJUSTE_ALIQUOTA_ZERO_${nZero}`, `Revenda com alíquota zero (base 0; CST 06 na EFD)${doc}`, v, F_ALIQ_ZERO));
      } else {
        nCota += 1;
        memoria.push(linha(`AJUSTE_COTA_PARTE_${nCota}`, `Cota-parte do profissional-parceiro (fora da receita bruta)${doc}`, v, F_COTA_PARTE));
      }
    }
    const base = e.receitaServicoCents + e.receitaRevendaCents - ajustes;
    const debito = mulBp(base, p.aliquotaBp);
    memoria.push(
      linha('BASE', 'Base de cálculo (receita − ajustes)', base, F_BASE[e.modalidade]),
      linha('DEBITO', `Base × ${p.aliquotaBp / 100}%`, debito, p.fonte),
    );

    let credito = 0n;
    if (naoCumulativo) {
      const parte = (n: CreditoPisCofinsNota): bigint => BigInt(t === 'PIS' ? n.pisCents : n.cofinsCents);
      const gravadas = e.creditosNfe.filter((n) => !n.derivado);
      const derivadas = e.creditosNfe.filter((n) => n.derivado);
      const cNfe = gravadas.reduce((s, n) => s + parte(n), 0n);
      const cDer = derivadas.reduce((s, n) => s + parte(n), 0n);
      memoria.push(linha('CREDITO_NFE', `Crédito das NF-e de compra do mês (${gravadas.length} nota(s))`, cNfe, F_CREDITO_NFE));
      if (derivadas.length > 0) {
        memoria.push(linha('CREDITO_NFE_DERIVADO', `Crédito das NF-e do mês com parcelas derivadas (${derivadas.length} nota(s))`, cDer, `${F_CREDITO_NFE}; ${F_DERIVADO}`));
      }
      credito += cNfe + cDer;
      const nInciso: Partial<Record<IncisoCredito, number>> = {};
      for (const o of e.outrosCreditos) {
        const k = (nInciso[o.inciso] ?? 0) + 1;
        nInciso[o.inciso] = k;
        const v = mulBp(BigInt(o.baseCents), p.aliquotaBp);
        credito += v;
        memoria.push(
          linha(
            `CREDITO_${o.inciso}_${k}`,
            `Base ${o.baseCents} centavos × ${p.aliquotaBp / 100}%${o.documento ? ` — ${o.documento}` : ''}`,
            v,
            `Lei 10.833/2003 art. 3º ${INCISO_LEI[o.inciso]}`,
          ),
        );
      }
      const s = e.saldoAnterior;
      if (s.tipo !== 'NENHUM') {
        const v = s[t];
        credito += v;
        const desc = s.tipo === 'LIDO' ? `Saldo credor de ${s.periodo}/${s.ano} (apuração confirmada)` : 'Saldo credor anterior informado pelo operador (1º mês apurado no sistema — F-PCB-2 a)';
        memoria.push(linha('SALDO_CREDOR_ANTERIOR', desc, v, F_SALDO));
      }
    }

    let retencoes = 0n;
    e.retencoes
      .filter((r) => r.tributo === t)
      .forEach((r, i) => {
        const v = BigInt(r.valorCents);
        retencoes += v;
        memoria.push(linha(`RETENCAO_${i + 1}`, `Retenção sofrida${r.documento ? ` — ${r.documento}` : ''}`, v, F_RETENCAO));
      });

    const aposCredito = maxZero(debito - credito);
    const saldoCredor = maxZero(credito - debito);
    const aPagar = maxZero(aposCredito - retencoes);
    const excedente = maxZero(retencoes - aposCredito);
    memoria.push(linha('A_PAGAR', 'Valor a pagar', aPagar, `código de receita ${p.codigoReceita}; ${p.fonte}`));
    if (excedente > 0n) memoria.push(linha('RETENCAO_EXCEDENTE', 'Retenções acima do devido depois do crédito — compensação fora do sistema', excedente, F_EXCEDENTE));
    if (naoCumulativo) memoria.push(linha('SALDO_CREDOR', 'Crédito acima do débito — transportado ao mês seguinte', saldoCredor, F_SALDO));

    out[t] = {
      tributo: t,
      modo: MODO_PIS_COFINS[e.modalidade],
      codigoReceita: p.codigoReceita,
      baseCents: base,
      devidoCents: debito,
      deducoesCents: credito + retencoes,
      aPagarCents: aPagar,
      saldoNegativoCents: saldoCredor,
      memoria,
      tabelaVersao: PIS_COFINS_TABELA_VERSAO,
    };
  }
  return out;
}
