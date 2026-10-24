import { ConflictError, ValidationError } from '../../../lib/errors';
import { ParametroLegalAusenteError, linhaLegalVigente, parametrosUsados, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import {
  NATUREZAS_IRRF_ALIQUOTA,
  TRIBUTOS_CSRF,
  codigoReceitaRetencao,
  divHalfUp,
  impostoPelaTabela,
  reducaoArt3A,
  tabelaIrrfPfDe,
  type NaturezaServico,
  type RegimeContraparte,
  type TributoRetencao,
} from './retencaoParams';

/**
 * BE-INCR-RETENCOES-FONTE PR-2 (BRIEF itens 10, 11 e 17; §5.2) — cálculo PURO das retenções feitas. Sem I/O: o serviço passa
 * o perfil, os regimes e a fotografia das tabelas (`RETENCAO`, `RETENCAO_CODIGO`, `IRRF_PF_MENSAL`). Cada regra cita o artigo.
 */

export type EventoRetencao = 'RECOGNITION' | 'SETTLEMENT';
export type Dispensa = 'MINIMO_R10' | 'OPTANTE_SIMPLES' | 'COOPERATIVA';

export const AVISO_RETENCAO = {
  /** ADR D5: contraparte PJ sem perfil — nenhuma linha. */
  SEM_PERFIL_RETENCAO: 'SEM_PERFIL_RETENCAO',
  /** Item 10: optante sem a declaração anexada ⇒ retém o IRRF (IN RFB 765/2007 não lida; leitura segura). */
  SEM_DECLARACAO_OPTANTE: 'SEM_DECLARACAO_OPTANTE',
  /** Item 10: contraparte sem regime ⇒ tratada como não optante. */
  SEM_REGIME_BENEFICIARIO: 'SEM_REGIME_BENEFICIARIO',
} as const;

export interface PerfilParaCalculo {
  naturezaServico: NaturezaServico;
  natRend: string | null;
  irrf: boolean;
  csrf: boolean;
  inss: boolean;
  inssCprb: boolean | null;
  issRetido: boolean;
  issAliquotaBp: number | null;
}

/** Item 11 — o que o pagamento informa e o que o mês já tem para o mesmo CPF (F-RET-17 a: os pagamentos do mês somam). */
export interface EntradaPf {
  rendimentoMesAntesCents: bigint;
  retidoMesAntesCents: bigint;
  dependentes: number;
  previdenciaCents: bigint;
  pensaoCents: bigint;
}

export interface EntradaRetencao {
  event: EventoRetencao;
  /** Bruto do título (RECOGNITION) ou da parcela (SETTLEMENT). */
  brutoCents: bigint;
  /** Date-only escrito (memória "Date ISO UTC → scopeDay −1"). */
  dataFatoGerador: string;
  regimePagador: 'MEI' | 'SIMPLES' | 'PRESUMIDO' | 'REAL';
  beneficiario: { regime: RegimeContraparte | null; temDeclaracaoOptante: boolean; taxIdKind: 'CPF' | 'CNPJ' | null };
  perfil: PerfilParaCalculo | null;
  pf?: EntradaPf;
  tabela: readonly LinhaLegal[];
}

/** Item 11 — memória do R-4010 (`ideDep`/`detDed`) gravada em `TaxWithholding.pfDetalhe`. */
export interface DetalhePf {
  dependentes: number;
  deducaoDependentesCents: bigint;
  previdenciaCents: bigint;
  pensaoCents: bigint;
  descontoSimplificadoCents: bigint;
  reducaoArt3ACents: bigint;
  retidoAntesNoMesCents: bigint;
}

export interface LinhaRetencao {
  tributo: TributoRetencao;
  baseCents: bigint;
  aliquotaBp: number | null;
  amountCents: bigint;
  dispensa: Dispensa | null;
  codigoReceita: string | null;
  fonte: string;
  pf: DetalhePf | null;
}

export interface ResultadoRetencao {
  linhas: LinhaRetencao[];
  avisos: string[];
  parametrosIds: string[];
  parametrosSha256: string;
}

const OPTANTES: readonly string[] = ['SIMPLES', 'MEI'];
const TABELAS_DO_CALCULO = ['RETENCAO', 'RETENCAO_CODIGO', 'IRRF_PF_MENSAL'];

const aplicar = (baseCents: bigint, bp: number) => divHalfUp(baseCents * BigInt(bp), 10_000n);

function minimo(tabela: readonly LinhaLegal[], disc: string, data: string): bigint | null {
  const l = linhaLegalVigente(tabela, 'RETENCAO', 'MINIMO', data, disc);
  return l?.valorInt ? BigInt(l.valorInt) : null;
}

/**
 * Item 11 (F-RET-17 a) — IRRF de PF pela tabela mensal sobre o total do mês ao mesmo CPF, menos o já retido no mês:
 * base = rendimento do mês − max(deduções do art. 4º, desconto simplificado do § 2º) [Lei 9.250]; imposto pela faixa
 * [Lei 11.482 art. 1º XII]; menos a redução do art. 3º-A [Lei 9.250]; menos o retido antes no mês. ≤ R$ 10 ⇒ dispensa
 * (RIR/2018 art. 785 I). As deduções vêm do pagamento (não há cadastro de dependentes neste nó).
 */
export function calcularIrrfPf(
  rendimentoCents: bigint,
  pf: EntradaPf,
  tabela: readonly LinhaLegal[],
  data: string,
): { amountCents: bigint; baseCents: bigint; dispensa: Dispensa | null; pf: DetalhePf; fontes: string[] } {
  const t = tabelaIrrfPfDe(tabela, data);
  if (!t) throw new ParametroLegalAusenteError('IRRF_PF_MENSAL', data);
  const totalMes = pf.rendimentoMesAntesCents + rendimentoCents;
  const deducaoDependentesCents = BigInt(pf.dependentes) * t.dependenteCents;
  const deducoes = deducaoDependentesCents + pf.previdenciaCents + pf.pensaoCents;
  const usaSimplificado = t.descontoSimplificadoCents > deducoes;
  const desconto = usaSimplificado ? t.descontoSimplificadoCents : deducoes;
  const baseCents = totalMes > desconto ? totalMes - desconto : 0n;
  const imposto = impostoPelaTabela(baseCents, t);
  const reducao = reducaoArt3A(totalMes, imposto, t);
  const devido = imposto - reducao;
  const aReter = devido > pf.retidoMesAntesCents ? devido - pf.retidoMesAntesCents : 0n;
  const min = minimo(tabela, 'IRRF_PF', data);
  const dispensa: Dispensa | null = aReter > 0n && min !== null && aReter <= min ? 'MINIMO_R10' : null;
  return {
    amountCents: dispensa ? 0n : aReter,
    baseCents,
    dispensa,
    pf: {
      dependentes: pf.dependentes,
      deducaoDependentesCents: usaSimplificado ? 0n : deducaoDependentesCents,
      previdenciaCents: usaSimplificado ? 0n : pf.previdenciaCents,
      pensaoCents: usaSimplificado ? 0n : pf.pensaoCents,
      descontoSimplificadoCents: usaSimplificado ? t.descontoSimplificadoCents : 0n,
      reducaoArt3ACents: reducao,
      retidoAntesNoMesCents: pf.retidoMesAntesCents,
    },
    fontes: ['Lei 11.482/2007 art. 1º XII', 'Lei 9.250/1995 arts. 3º-A e 4º'],
  };
}

/**
 * Item 10 — as retenções de UM evento. Regras (cada uma com o artigo):
 * - beneficiário `EXTERIOR` ⇒ 400 (remessa ao exterior fora deste nó);
 * - sem perfil ⇒ nenhuma linha; contraparte PJ ⇒ aviso `SEM_PERFIL_RETENCAO` (ADR D5);
 * - RECOGNITION: IRRF (RIR/2018 arts. 714/716/718; PF art. 685), INSS 11% sobre o bruto da NF (Lei 8.212 art. 31) e ISS
 *   pela alíquota informada (LC 116 art. 6º);
 * - SETTLEMENT: CSRF por tributo vigente na data (Lei 10.833 art. 30; só CSLL desde 2027 — LC 214 art. 509);
 * - pagador `SIMPLES`/`MEI` ⇒ sem CSRF (Lei 10.833 art. 30 § 2º), com IRRF pelo perfil (P-RET-1, triagem 21/10);
 * - beneficiário `SIMPLES`/`MEI` ⇒ sem CSRF (art. 32 III); sem IRRF só com a declaração de optante;
 * - `COOPERATIVA` ⇒ só CSLL (art. 32 parágrafo único);
 * - mínimo: CSRF ≤ R$ 10 por pagamento ⇒ dispensa (art. 31 § 3º); IRRF ≤ R$ 10 dispensado só para beneficiário
 *   Real/Presumido/Arbitrado/PF (RIR/2018 art. 785) — optante/sem regime retém qualquer valor > 0.
 */
export function calcularRetencoes(e: EntradaRetencao): ResultadoRetencao {
  const { ids, sha256 } = parametrosUsados(
    e.tabela.filter((l) => TABELAS_DO_CALCULO.includes(l.tabela)),
    e.dataFatoGerador,
    e.dataFatoGerador,
  );
  const avisos: string[] = [];
  const linhas: LinhaRetencao[] = [];
  const out = (): ResultadoRetencao => ({ linhas, avisos: [...new Set(avisos)], parametrosIds: ids, parametrosSha256: sha256 });
  const regime = e.beneficiario.regime;
  if (regime === 'EXTERIOR') {
    throw new ValidationError('Remessa ao exterior está fora deste nó (RETENCOES-FONTE): contraparte EXTERIOR não tem retenção calculada aqui.', null, 'RETENCAO_EXTERIOR_FORA_DO_NO');
  }
  const p = e.perfil;
  if (!p) {
    if (regime !== 'PF' && e.beneficiario.taxIdKind !== 'CPF') avisos.push(AVISO_RETENCAO.SEM_PERFIL_RETENCAO);
    return out();
  }
  if (regime === null) avisos.push(AVISO_RETENCAO.SEM_REGIME_BENEFICIARIO);
  const data = e.dataFatoGerador;
  const optante = regime !== null && OPTANTES.includes(regime);
  const codigo = (tributo: TributoRetencao) => {
    const c = codigoReceitaRetencao(e.tabela, { tributo, natRend: p.natRend, beneficiarioKind: e.beneficiario.taxIdKind, data });
    if (c.aviso) avisos.push(c.aviso);
    return c.codigo;
  };

  if (e.event === 'RECOGNITION') {
    if (p.irrf) linhas.push(irrf(e, p, optante, codigo, avisos));
    if (p.inss && regime !== 'PF') {
      const disc = p.inssCprb ? 'CPRB' : 'CESSAO_MAO_DE_OBRA';
      const l = linhaLegalVigente(e.tabela, 'RETENCAO', 'INSS', data, disc);
      if (!l || l.valorInt === null) throw new ParametroLegalAusenteError('RETENCAO', data, `INSS/${disc}`);
      linhas.push({ tributo: 'INSS', baseCents: e.brutoCents, aliquotaBp: l.valorInt, amountCents: aplicar(e.brutoCents, l.valorInt), dispensa: null, codigoReceita: codigo('INSS'), fonte: l.fonte, pf: null });
    }
    if (p.issRetido) {
      if (p.issAliquotaBp === null) throw new ValidationError('Perfil com ISS retido sem issAliquotaBp.');
      linhas.push({ tributo: 'ISS', baseCents: e.brutoCents, aliquotaBp: p.issAliquotaBp, amountCents: aplicar(e.brutoCents, p.issAliquotaBp), dispensa: null, codigoReceita: null, fonte: 'LC 116/2003 art. 6º + lei municipal (alíquota do perfil)', pf: null });
    }
    return out();
  }

  // SETTLEMENT — CSRF
  if (!p.csrf || OPTANTES.includes(e.regimePagador) || optante) return out();
  const tributos = regime === 'COOPERATIVA' ? (['CSLL'] as const) : TRIBUTOS_CSRF;
  const csrf: LinhaRetencao[] = [];
  for (const t of tributos) {
    const l = linhaLegalVigente(e.tabela, 'RETENCAO', 'CSRF', data, t);
    if (!l || l.valorInt === null) continue; // desde 2027 só a CSLL tem linha (invariante 1)
    csrf.push({ tributo: t, baseCents: e.brutoCents, aliquotaBp: l.valorInt, amountCents: aplicar(e.brutoCents, l.valorInt), dispensa: null, codigoReceita: codigo(t), fonte: l.fonte, pf: null });
  }
  const total = csrf.reduce((s, l) => s + l.amountCents, 0n);
  const min = minimo(e.tabela, 'CSRF', data);
  if (min !== null && total <= min) for (const l of csrf) Object.assign(l, { amountCents: 0n, dispensa: 'MINIMO_R10' as Dispensa });
  linhas.push(...csrf);
  return out();
}

function irrf(
  e: EntradaRetencao,
  p: PerfilParaCalculo,
  optante: boolean,
  codigo: (t: TributoRetencao) => string | null,
  avisos: string[],
): LinhaRetencao {
  const data = e.dataFatoGerador;
  const regime = e.beneficiario.regime;
  if (regime === 'PF' || e.beneficiario.taxIdKind === 'CPF') {
    const r = calcularIrrfPf(e.brutoCents, e.pf ?? { rendimentoMesAntesCents: 0n, retidoMesAntesCents: 0n, dependentes: 0, previdenciaCents: 0n, pensaoCents: 0n }, e.tabela, data);
    return { tributo: 'IRRF', baseCents: r.baseCents, aliquotaBp: null, amountCents: r.amountCents, dispensa: r.dispensa, codigoReceita: codigo('IRRF'), fonte: r.fontes.join('; '), pf: r.pf };
  }
  const natureza = p.naturezaServico as string;
  if (!(NATUREZAS_IRRF_ALIQUOTA as readonly string[]).includes(natureza)) {
    throw new ValidationError(`Perfil com IRRF na natureza ${natureza}, que não tem alíquota de IRRF de PJ (RIR/2018 arts. 714, 716 e 718).`, null, 'IRRF_SEM_ALIQUOTA_PARA_NATUREZA');
  }
  const l = linhaLegalVigente(e.tabela, 'RETENCAO', 'IRRF', data, natureza);
  if (!l || l.valorInt === null) throw new ParametroLegalAusenteError('RETENCAO', data, `IRRF/${natureza}`);
  const base = { tributo: 'IRRF' as const, baseCents: e.brutoCents, aliquotaBp: l.valorInt, codigoReceita: codigo('IRRF'), fonte: l.fonte, pf: null };
  if (optante) {
    if (e.beneficiario.temDeclaracaoOptante) return { ...base, amountCents: 0n, dispensa: 'OPTANTE_SIMPLES' };
    avisos.push(AVISO_RETENCAO.SEM_DECLARACAO_OPTANTE);
  }
  const valor = aplicar(e.brutoCents, l.valorInt);
  const min = regime ? minimo(e.tabela, `IRRF_${regime}`, data) : null;
  if (valor > 0n && min !== null && valor <= min) return { ...base, amountCents: 0n, dispensa: 'MINIMO_R10' };
  return { ...base, amountCents: valor, dispensa: null };
}

/** Item 17 — CSRF de um bruto pelas alíquotas por tributo (HALF_UP por tributo, como `calcularRetencoes`). */
export function csrfDoBruto(brutoCents: bigint, aliquotasBp: readonly number[]): bigint {
  return aliquotasBp.reduce((s, bp) => s + aplicar(brutoCents, bp), 0n);
}

/**
 * Item 17 (F-RET-4 a) + item 18 — o bruto `g` da parcela a partir do PAGO em caixa: `g − csrf(g) = pago`. Preferências:
 * 1. o saldo restante, quando ele fecha (a última parcela absorve o centavo do arredondamento — invariante 3);
 * 2. o MAIOR `g` com CSRF acima do mínimo que fecha (dono, chat, 2026-10-24: "Maior bruto que fecha" — o BRIEF dizia o
 *    menor, mas o exemplo dele, 4 parcelas de R$ 250 com R$ 11,63, só fecha com o maior: R$ 238,37 fecha com 249,99 e 250,00);
 * 3. sem CSRF retida (CSRF de `pago` ≤ mínimo, art. 31 § 3º) ⇒ `g = pago`.
 * Nenhum fecha ⇒ 409 `BRUTO_DA_PARCELA_SEM_SOLUCAO`.
 */
export function brutoDaParcela(pagoCents: bigint, aliquotasBp: readonly number[], restanteCents: bigint, minimoCents: bigint | null): bigint {
  const retido = (g: bigint) => csrfDoBruto(g, aliquotasBp);
  const acimaDoMinimo = (g: bigint) => minimoCents === null || retido(g) > minimoCents;
  if (restanteCents > 0n && acimaDoMinimo(restanteCents) && restanteCents - retido(restanteCents) === pagoCents) return restanteCents;
  const somaBp = BigInt(aliquotasBp.reduce((s, bp) => s + bp, 0));
  if (somaBp > 0n && somaBp < 10_000n) {
    const estimado = (pagoCents * 10_000n) / (10_000n - somaBp);
    for (let g = estimado + 2n; g >= estimado - 2n; g--) {
      if (g > pagoCents && acimaDoMinimo(g) && g - retido(g) === pagoCents) return g;
    }
  }
  if (!acimaDoMinimo(pagoCents)) return pagoCents;
  throw new ConflictError(
    `BRUTO_DA_PARCELA_SEM_SOLUCAO: nenhum bruto fecha o pago de ${pagoCents} centavos com a CSRF por tributo (${aliquotasBp.join('+')} bp) — informe o valor pago que corresponde a um bruto.`,
    'BRUTO_DA_PARCELA_SEM_SOLUCAO',
  );
}
