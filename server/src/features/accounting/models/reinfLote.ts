import { z } from 'zod';
import type { InterestOnEquityAllocation, InterestOnEquityCalculation, Partner, ProfitDistributionEvent } from 'generated/prisma';
import { ValidationError } from '../../../lib/errors';
import { isValidCnpj } from '../../../lib/cnpj';
import { isValidCpf } from '../../../lib/cpf';
import type { BeneficiarioPF, BeneficiarioPJ, PagamentoPF, PagamentoPJ, PrestadorR2010, ValorRetido } from '../../../lib/reinf';
import type { LinhaLegal } from '../../legalParameters/models/legalParameter';
import type { WithholdingLineForReinf } from '../dtos/WithholdingDto';
import type { ReinfAviso } from '../dtos/ReinfDto';
import { codigoReceitaRetencao, discriminadorDoCodigo, naturezaRendimentoVigente } from './retencaoParams';

/**
 * BE-INCR-EFD-REINF PR-1 (BRIEF itens 1, 6, 7, 8, 14; invariantes 1, 3, 4, 6) — das linhas da porta de retenções (§5.1)
 * aos beneficiários do R-4020 e ao relatório de conferência. PURO: as tabelas chegam pela fotografia de `legal_parameters`
 * (`NATUREZA_RENDIMENTO`, `RETENCAO_CODIGO`, `RETENCAO`), que são do RETENCOES-FONTE (emenda 22/10 item 1).
 */

/** Tributos que vão ao R-4020 (invariante 4). INSS = R-2010 (PR-2); ISS não é Reinf. */
export const TRIBUTOS_R4020 = ['IRRF', 'CSLL', 'COFINS', 'PIS'] as const;
const CSRF = new Set(['CSLL', 'COFINS', 'PIS']);

/** Avisos do relatório (PR-1: pacote de lacunas, dono 26/10, ponto 4; item 19). */
export const AVISO_PF_FORA_DA_REINF = 'PF_SERVICO_FORA_DA_REINF';
/** PR-2 (lacuna A, dono 27/10): dividendo a sócio PJ não tem natureza na tabela do R-4020 — fica fora, P-REINF-10. */
export const AVISO_DIVIDENDO_PJ_FORA_DA_REINF = 'DIVIDENDO_PJ_FORA_DA_REINF';
/** PR-3 (item 23; lacuna D, dono 28/10): enquanto a P-REINF-2 estiver aberta, a natureza do perfil não foi conferida pelo contador. */
export const AVISO_NATUREZA_NAO_CONFERIDA = 'NATUREZA_NAO_CONFERIDA';

export interface LinhaRelatorio {
  evento: 'R-4020' | 'R-4010' | 'R-2010';
  beneficiario: string; // mascarado
  natRend: string | null; // null no R-2010 (não tem natureza do rendimento)
  dtFG: string;
  tributo: string;
  brutoCents: string;
  baseCents: string;
  retidoCents: string;
  codigoReceita: string | null;
  vencimentoDarf: string | null;
  /** PR-3 (item 21; lacuna B, dono 28/10): a linha é de um R-4010 só de isenção 12 ⇒ prazo trimestral (§ 3º). Interno: não vai ao DTO. */
  trimestral?: true;
}

export interface MontagemR4020 {
  beneficiarios: BeneficiarioPJ[];
  /** As linhas declaradas (invariante 4). */
  linhasR4020: WithholdingLineForReinf[];
  /** Há fato da Reinf na competência (invariante 1; dispensa e ISS não contam). */
  temFato: boolean;
  avisos: ReinfAviso[];
  relatorio: LinhaRelatorio[];
  totaisPorCodigo: { codigoReceita: string | null; totalCents: string }[];
}

// Item 14 — `**.***.***/0001-**`: só a ordem do estabelecimento fica à vista.
export function mascararCnpj(cnpj: string): string {
  return `**.***.***/${cnpj.slice(8, 12)}-**`;
}

/** Item 1 — o código de receita derivado das tabelas (só serve ao relatório: o XML não leva código, L2). */
export function codigoReceitaDerivado(tabelas: readonly LinhaLegal[], l: Pick<WithholdingLineForReinf, 'tributo' | 'natRend' | 'dataFatoGerador'>, kind: 'CPF' | 'CNPJ'): string | null {
  return codigoReceitaRetencao(tabelas, { tributo: l.tributo, natRend: l.natRend, beneficiarioKind: kind, data: l.dataFatoGerador }).codigo;
}

const soma = (a: ValorRetido | undefined, base: bigint, valor: bigint): ValorRetido => ({ baseCents: (a?.baseCents ?? 0n) + base, valorCents: (a?.valorCents ?? 0n) + valor });

/**
 * Itens 6–7 — monta os beneficiários do R-4020. Recusas (400 nomeado, antes de montar qualquer evento):
 * - beneficiário sem `taxId` ou com CNPJ de DV inválido ⇒ `REINF_BENEFICIARIO_CNPJ_INVALIDO` (item 7, PRE-ADR D8; sem `taxId`:
 *   dono 26/10, "nenhuma retenção some calada");
 * - `natRend` nulo ou fora da `NATUREZA_RENDIMENTO` PUBLISHED na data ⇒ `NATUREZA_RENDIMENTO_SEM_MAPA` (item 1, E2).
 *
 * Agrupamento (L2, L7): um beneficiário por CNPJ (a PJ é centralizada, F-REINF-11 a — o mesmo fornecedor em duas unidades é
 * um só evento); `idePgto` por `natRend`; `infoPgto` por `dtFG`, separando IR (bruto do documento) e CSRF (bruto da parcela).
 * Os dois no mesmo dia com o mesmo bruto viram uma `infoPgto`; com brutos diferentes, duas (dono 26/10). A CSRF vai agregada
 * quando o discriminador do código é `AGREGADO` (F-REINF-8 a: "decide pelo código da linha"), senão separada por tributo.
 */
export function montarR4020(
  linhas: readonly WithholdingLineForReinf[],
  tabelas: readonly LinhaLegal[],
  vencimentoPorTitulo: ReadonlyMap<string, string>,
): MontagemR4020 {
  const avisos: ReinfAviso[] = [];
  const declaraveis = linhas.filter((l) => l.dispensa === null && l.tributo !== 'ISS');
  const temFato = declaraveis.length > 0;

  const pf = declaraveis.filter((l) => l.beneficiario.kind === 'CPF' && l.tributo !== 'INSS');
  if (pf.length > 0) {
    avisos.push({ codigo: AVISO_PF_FORA_DA_REINF, quantidade: pf.length, detalhe: `${pf.length} retenção(ões) de pessoa física — declarar fora do sistema (R-4010 de PF por serviço espera o nó de pessoal).` });
  }

  const r4020 = declaraveis.filter((l) => (TRIBUTOS_R4020 as readonly string[]).includes(l.tributo) && l.beneficiario.kind !== 'CPF');
  for (const l of r4020) {
    if (l.beneficiario.kind !== 'CNPJ' || !l.beneficiario.taxId || !isValidCnpj(l.beneficiario.taxId)) {
      throw new ValidationError(
        `O fornecedor de uma retenção da competência não tem CNPJ válido: corrija o cadastro antes de gerar a Reinf.`,
        { counterpartyId: l.beneficiario.counterpartyId, withholdingId: l.id },
        'REINF_BENEFICIARIO_CNPJ_INVALIDO',
      );
    }
    if (!l.natRend || !naturezaRendimentoVigente(tabelas, l.natRend, l.dataFatoGerador)) {
      throw new ValidationError(
        `A retenção não tem natureza do rendimento publicada na Tabela 01 da Reinf: confira o perfil de retenção do fornecedor.`,
        { natRend: l.natRend, withholdingId: l.id },
        'NATUREZA_RENDIMENTO_SEM_MAPA',
      );
    }
  }

  const porCnpj = new Map<string, WithholdingLineForReinf[]>();
  for (const l of r4020) porCnpj.set(l.beneficiario.taxId!, [...(porCnpj.get(l.beneficiario.taxId!) ?? []), l]);

  const relatorio: LinhaRelatorio[] = [];
  const beneficiarios: BeneficiarioPJ[] = [...porCnpj.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cnpj, ls]) => {
      const porNatureza: Record<string, PagamentoPJ[]> = {};
      const naturezas = [...new Set(ls.map((l) => l.natRend!))].sort();
      for (const nat of naturezas) {
        const daNat = ls.filter((l) => l.natRend === nat);
        const pagamentos: PagamentoPJ[] = [];
        for (const dtFG of [...new Set(daNat.map((l) => l.dataFatoGerador))].sort()) {
          const doDia = daNat.filter((l) => l.dataFatoGerador === dtFG);
          const irs = doDia.filter((l) => l.tributo === 'IRRF');
          const csrf = doDia.filter((l) => CSRF.has(l.tributo));
          const pIr = irs.length ? pagamentoIr(dtFG, irs) : null;
          const pCsrf = csrf.length ? pagamentoCsrf(dtFG, csrf, tabelas) : null;
          if (pIr && pCsrf && pIr.vlrBrutoCents === pCsrf.vlrBrutoCents) pagamentos.push({ ...pCsrf, ir: pIr.ir, origemIds: [...pIr.origemIds, ...pCsrf.origemIds] });
          else pagamentos.push(...[pIr, pCsrf].filter((p): p is PagamentoPJ => p !== null));
        }
        porNatureza[nat] = pagamentos;
      }
      for (const l of ls) {
        relatorio.push({
          evento: 'R-4020',
          beneficiario: mascararCnpj(cnpj),
          natRend: l.natRend!,
          dtFG: l.dataFatoGerador,
          tributo: l.tributo,
          brutoCents: l.brutoCents,
          baseCents: l.baseCents,
          retidoCents: l.amountCents,
          codigoReceita: codigoReceitaDerivado(tabelas, l, 'CNPJ'),
          vencimentoDarf: l.taxPayableId ? vencimentoPorTitulo.get(l.taxPayableId) ?? null : null,
        });
      }
      const refs = [...new Set(ls.map((l) => l.beneficiario.counterpartyId))].sort();
      return { cnpj, nome: ls[0].beneficiario.nome, ref: refs.join(','), porNatureza };
    });

  const totais = new Map<string | null, bigint>();
  for (const r of relatorio) totais.set(r.codigoReceita, (totais.get(r.codigoReceita) ?? 0n) + BigInt(r.retidoCents));
  return {
    beneficiarios,
    linhasR4020: r4020,
    temFato,
    avisos,
    relatorio,
    totaisPorCodigo: [...totais.entries()].map(([codigoReceita, t]) => ({ codigoReceita, totalCents: t.toString() })),
  };
}

/** IR no reconhecimento: bruto = Σ bruto dos documentos do dia (L7). */
function pagamentoIr(dtFG: string, irs: readonly WithholdingLineForReinf[]): PagamentoPJ {
  let ir: ValorRetido | undefined;
  let bruto = 0n;
  for (const l of irs) {
    bruto += BigInt(l.brutoCents);
    ir = soma(ir, BigInt(l.baseCents), BigInt(l.amountCents));
  }
  return { dtFG, vlrBrutoCents: bruto, ir, origemIds: irs.map((l) => l.id) };
}

/**
 * CSRF na baixa: as linhas da mesma baixa (`originSettlementId`) dividem bruto e base — contam uma vez por baixa; o retido
 * é a soma das três (agregado) ou de cada tributo (separado).
 */
function pagamentoCsrf(dtFG: string, csrf: readonly WithholdingLineForReinf[], tabelas: readonly LinhaLegal[]): PagamentoPJ {
  const p: PagamentoPJ = { dtFG, vlrBrutoCents: 0n, origemIds: csrf.map((l) => l.id) };
  const porBaixa = new Map<string, WithholdingLineForReinf[]>();
  for (const l of csrf) {
    const k = l.originSettlementId ?? l.settlementId ?? l.id;
    porBaixa.set(k, [...(porBaixa.get(k) ?? []), l]);
  }
  for (const ls of porBaixa.values()) {
    p.vlrBrutoCents += BigInt(ls[0].brutoCents);
    const agregadas = ls.filter((l) => discriminadorDoCodigo(tabelas, l.tributo, 'CNPJ', l.dataFatoGerador) === 'AGREGADO');
    if (agregadas.length) {
      p.agregado = soma(p.agregado, BigInt(agregadas[0].baseCents), agregadas.reduce((s, l) => s + BigInt(l.amountCents), 0n));
    }
    for (const l of ls.filter((x) => !agregadas.includes(x))) {
      const k = l.tributo === 'CSLL' ? 'csll' : l.tributo === 'COFINS' ? 'cofins' : 'pis';
      p[k] = soma(p[k], BigInt(l.baseCents), BigInt(l.amountCents));
    }
  }
  return p;
}

// ─── PR-2 — R-4010 (itens 15–16) e R-2010 (item 17) ──────────────────────────────────────────────────────────────────

/**
 * Contrato de entrada E4 (BRIEF §5.1, confirmado contra o código do IRRF-DISTRIBUICAO em `main`): um dividendo `POSTED`
 * (`ProfitDistributionEvent`) com o tipo do sócio. Centavos como string (padrão do repo).
 */
export const DividendoParaReinfSchema = z
  .object({
    id: z.string(),
    partnerId: z.string(),
    taxId: z.string(),
    tipoPessoa: z.enum(['PF', 'PJ']),
    dataEvento: z.string(),
    brutoCents: z.string(),
    irrfCents: z.string(),
    origemLucro: z.enum(['CORRENTE', 'TRANSICAO']),
  })
  .strict();
export type DividendoParaReinf = z.infer<typeof DividendoParaReinfSchema>;

/** E4 — a parte de um sócio num JCP `POSTED` (`InterestOnEquityAllocation`); `dtFG` = `dataCredito` do cálculo. */
export const JcpParaReinfSchema = z
  .object({
    id: z.string(), // id da alocação
    partnerId: z.string(),
    taxId: z.string(),
    tipoPessoa: z.enum(['PF', 'PJ']),
    dataCredito: z.string(),
    brutoCents: z.string(),
    irrfCents: z.string(),
  })
  .strict();
export type JcpParaReinf = z.infer<typeof JcpParaReinfSchema>;

type SocioReinf = Pick<Partner, 'id' | 'tipoPessoa' | 'taxId'>;

/**
 * O JCP guarda só o `partnerId`; o CPF/CNPJ vem do cadastro vivo do sócio. Sócio removido (soft-delete) com JCP na
 * competência ⇒ 400 nomeado: nenhum fato some calado (lacuna aberta no PR-2, sem decisão do dono).
 */
function socioDe(socios: ReadonlyMap<string, SocioReinf>, partnerId: string, origemId: string): SocioReinf {
  const s = socios.get(partnerId);
  if (!s) throw new ValidationError('Um JCP da competência é de sócio removido do cadastro: a Reinf precisa do CPF/CNPJ dele.', { partnerId, origemId }, 'REINF_SOCIO_REMOVIDO');
  return s;
}

/** O `tipoPessoa` do sócio é derivado do tamanho do `taxId` (`Partner`, IRRF-DISTRIBUICAO PR-1); o evento guarda o `taxId`. */
export function dividendoParaReinf(e: ProfitDistributionEvent): DividendoParaReinf {
  return DividendoParaReinfSchema.parse({
    id: e.id,
    partnerId: e.partnerId,
    taxId: e.taxId,
    tipoPessoa: e.taxId.length === 14 ? 'PJ' : 'PF',
    dataEvento: e.dataEvento,
    brutoCents: e.brutoCents.toString(),
    irrfCents: e.irrfCents.toString(),
    origemLucro: e.origemLucro,
  });
}

export function jcpParaReinf(c: Pick<InterestOnEquityCalculation, 'dataCredito'>, a: InterestOnEquityAllocation, socios: ReadonlyMap<string, SocioReinf>): JcpParaReinf {
  const s = socioDe(socios, a.partnerId, a.id);
  return JcpParaReinfSchema.parse({
    id: a.id,
    partnerId: a.partnerId,
    taxId: s.taxId,
    tipoPessoa: s.tipoPessoa,
    dataCredito: c.dataCredito,
    brutoCents: a.brutoCents.toString(),
    irrfCents: a.irrfCents.toString(),
  });
}

/** Natureza dos dividendos (Tabela 01: "Lucro e Dividendo") e do JCP ("Juros sobre o Capital Próprio") [D02]. */
export const NAT_DIVIDENDOS = '12001';
export const NAT_JCP = '12016';
/** NT 02/2026 [D04]: tipo de isenção 12 = dividendos do § 3º do art. 6º-A da Lei 9.250 (lucro da transição). */
export const TP_ISENCAO_TRANSICAO = 12;

// Item 14 estendido ao R-4010 (lacuna D, dono 27/10): `***.NNN.NNN-**` — só os 6 dígitos do meio à vista.
export function mascararCpf(cpf: string): string {
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

export interface MontagemR4010 {
  beneficiariosPF: BeneficiarioPF[];
  /** JCP a sócio PJ: vai ao R-4020 na 12016 (item 16), juntado aos fornecedores pelo CNPJ. */
  beneficiariosPJ: BeneficiarioPJ[];
  avisos: ReinfAviso[];
  relatorio: LinhaRelatorio[];
}

function somaOpt(x?: bigint, y?: bigint): bigint | undefined {
  return x === undefined && y === undefined ? undefined : (x ?? 0n) + (y ?? 0n);
}

/** Vários fatos do mesmo CPF, natureza e dia viram uma `infoPgto` (soma por campo). */
function somaPF(a: PagamentoPF | undefined, b: PagamentoPF): PagamentoPF {
  if (!a) return b;
  const trib = somaOpt(a.vlrRendTribCents, b.vlrRendTribCents);
  const ir = somaOpt(a.vlrIRCents, b.vlrIRCents);
  const isento = somaOpt(a.isencao?.valorCents, b.isencao?.valorCents);
  return {
    dtFG: a.dtFG,
    vlrRendBrutoCents: a.vlrRendBrutoCents + b.vlrRendBrutoCents,
    ...(trib !== undefined ? { vlrRendTribCents: trib } : {}),
    ...(ir !== undefined ? { vlrIRCents: ir } : {}),
    ...(isento !== undefined ? { isencao: { tpIsencao: TP_ISENCAO_TRANSICAO, valorCents: isento } } : {}),
    origemIds: [...a.origemIds, ...b.origemIds],
  };
}

/**
 * Itens 15–16 (F-REINF-4 a; L6) — dividendos e JCP `POSTED` da competência para o R-4010 (sócio PF) e o R-4020 (JCP a sócio
 * PJ). Um evento por CPF; `idePgto` 12001 (dividendos) e 12016 (JCP); `infoPgto` por `dtFG` (fatos do mesmo dia somam).
 * - Dividendo CORRENTE: no mês em que o CPF cruzou o limite (houve IR no mês), `vlrRendTrib` = bruto em todo evento e
 *   `vlrIR` onde houve retenção (lacuna B, dono 27/10); no mês sem IR, só `vlrRendBruto` (MOU item 9, até P-REINF-6).
 * - Dividendo TRANSICAO (art. 6º-A § 3º): `rendIsento` com `tpIsencao` 12 (NT 02/2026 [D04]).
 * - JCP: `vlrRendTrib` = bruto, `vlrIR` = o IRRF da alocação (código 5706-02).
 * - Dividendo a sócio PJ: fora, com aviso (lacuna A, dono 27/10).
 * CPF/CNPJ com DV inválido ⇒ 400 nomeado com o `partnerId` (invariante 3).
 */
export function montarR4010(dividendos: readonly DividendoParaReinf[], jcps: readonly JcpParaReinf[], tabelas: readonly LinhaLegal[]): MontagemR4010 {
  const avisos: ReinfAviso[] = [];
  const divPj = dividendos.filter((d) => d.tipoPessoa === 'PJ');
  if (divPj.length > 0) {
    avisos.push({ codigo: AVISO_DIVIDENDO_PJ_FORA_DA_REINF, quantidade: divPj.length, detalhe: `${divPj.length} distribuição(ões) de lucros a sócio PJ — fora da Reinf até o contador responder (P-REINF-10).` });
  }
  const divPf = dividendos.filter((d) => d.tipoPessoa === 'PF');

  for (const x of [...divPf, ...jcps]) {
    const pf = x.tipoPessoa === 'PF';
    if (!(pf ? isValidCpf(x.taxId) : isValidCnpj(x.taxId))) {
      throw new ValidationError(
        `O sócio de uma distribuição da competência não tem ${pf ? 'CPF' : 'CNPJ'} válido: corrija o cadastro antes de gerar a Reinf.`,
        { partnerId: x.partnerId },
        pf ? 'REINF_BENEFICIARIO_CPF_INVALIDO' : 'REINF_BENEFICIARIO_CNPJ_INVALIDO',
      );
    }
  }

  const porCpf = new Map<string, { refs: Set<string>; porNat: Map<string, Map<string, PagamentoPF>> }>();
  const add = (cpf: string, ref: string, nat: string, p: PagamentoPF) => {
    const b = porCpf.get(cpf) ?? { refs: new Set<string>(), porNat: new Map<string, Map<string, PagamentoPF>>() };
    b.refs.add(ref);
    const porDia = b.porNat.get(nat) ?? new Map<string, PagamentoPF>();
    porDia.set(p.dtFG, somaPF(porDia.get(p.dtFG), p));
    b.porNat.set(nat, porDia);
    porCpf.set(cpf, b);
  };
  const relatorio: LinhaRelatorio[] = [];
  const linha = (evento: 'R-4010' | 'R-4020', kind: 'CPF' | 'CNPJ', taxId: string, nat: string, dtFG: string, bruto: string, base: bigint, retido: string): LinhaRelatorio => ({
    evento,
    beneficiario: kind === 'CPF' ? mascararCpf(taxId) : mascararCnpj(taxId),
    natRend: nat,
    dtFG,
    tributo: 'IRRF',
    brutoCents: bruto,
    baseCents: base.toString(),
    retidoCents: retido,
    codigoReceita: codigoReceitaRetencao(tabelas, { tributo: 'IRRF', natRend: nat, beneficiarioKind: kind, data: dtFG }).codigo,
    vencimentoDarf: null,
  });

  const cpfDaLinha: (string | null)[] = []; // paralelo a `relatorio`: o CPF do evento de cada linha (PR-3, item 21)
  const cruzou = new Set(divPf.filter((d) => BigInt(d.irrfCents) > 0n).map((d) => d.taxId));
  for (const d of divPf) {
    const bruto = BigInt(d.brutoCents);
    const ir = BigInt(d.irrfCents);
    const transicao = d.origemLucro === 'TRANSICAO';
    const trib = !transicao && cruzou.has(d.taxId) ? bruto : undefined;
    add(d.taxId, d.partnerId, NAT_DIVIDENDOS, {
      dtFG: d.dataEvento,
      vlrRendBrutoCents: bruto,
      ...(trib !== undefined ? { vlrRendTribCents: trib } : {}),
      ...(ir > 0n ? { vlrIRCents: ir } : {}),
      ...(transicao ? { isencao: { tpIsencao: TP_ISENCAO_TRANSICAO, valorCents: bruto } } : {}),
      origemIds: [d.id],
    });
    relatorio.push(linha('R-4010', 'CPF', d.taxId, NAT_DIVIDENDOS, d.dataEvento, d.brutoCents, trib ?? 0n, d.irrfCents));
    cpfDaLinha.push(d.taxId);
  }

  const porCnpj = new Map<string, BeneficiarioPJ>();
  for (const j of jcps) {
    const bruto = BigInt(j.brutoCents);
    const ir = BigInt(j.irrfCents);
    if (j.tipoPessoa === 'PF') {
      add(j.taxId, j.partnerId, NAT_JCP, { dtFG: j.dataCredito, vlrRendBrutoCents: bruto, vlrRendTribCents: bruto, ...(ir > 0n ? { vlrIRCents: ir } : {}), origemIds: [j.id] });
      relatorio.push(linha('R-4010', 'CPF', j.taxId, NAT_JCP, j.dataCredito, j.brutoCents, bruto, j.irrfCents));
      cpfDaLinha.push(j.taxId);
    } else {
      const b = porCnpj.get(j.taxId) ?? { cnpj: j.taxId, nome: '', ref: j.partnerId, porNatureza: { [NAT_JCP]: [] } };
      b.porNatureza[NAT_JCP].push({ dtFG: j.dataCredito, vlrBrutoCents: bruto, ir: { baseCents: bruto, valorCents: ir }, origemIds: [j.id] });
      porCnpj.set(j.taxId, b);
      relatorio.push(linha('R-4020', 'CNPJ', j.taxId, NAT_JCP, j.dataCredito, j.brutoCents, bruto, j.irrfCents));
      cpfDaLinha.push(null);
    }
  }

  const beneficiariosPF: BeneficiarioPF[] = [...porCpf.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cpf, b]) => ({
      cpf,
      nome: '',
      ref: [...b.refs].sort().join(','),
      porNatureza: Object.fromEntries([...b.porNat.entries()].map(([nat, porDia]) => [nat, [...porDia.values()]])),
    }));
  const soIsentos = new Set(beneficiariosPF.filter(r4010SoIsentos).map((b) => b.cpf));
  const relatorioComPrazo = relatorio.map((l, i): LinhaRelatorio => (soIsentos.has(cpfDaLinha[i] ?? '') ? { ...l, trimestral: true } : l));
  return { beneficiariosPF, beneficiariosPJ: [...porCnpj.values()], avisos, relatorio: relatorioComPrazo };
}

/**
 * PR-3 (item 21; lacuna B, dono 28/10) — o R-4010 tem o prazo trimestral do § 3º do art. 6º da IN 2.043 ("lucros e dividendos,
 * quando isentos de retenção") só quando TODA `infoPgto` é dividendo inteiramente isento pela isenção 12 (TRANSICAO), sem IR.
 * Dividendo ≤ R$ 50 mil sem retenção fica no mensal até a P-REINF-6.
 */
export function r4010SoIsentos(b: BeneficiarioPF): boolean {
  const nats = Object.keys(b.porNatureza);
  return (
    nats.length === 1 &&
    nats[0] === NAT_DIVIDENDOS &&
    b.porNatureza[NAT_DIVIDENDOS].every((p) => p.isencao?.tpIsencao === TP_ISENCAO_TRANSICAO && p.isencao.valorCents === p.vlrRendBrutoCents && !p.vlrIRCents && p.vlrRendTribCents === undefined)
  );
}

/** Um R-4020 por CNPJ (invariante 6): o JCP a sócio PJ entra no evento do fornecedor de mesmo CNPJ, se houver. */
export function juntarBeneficiariosPJ(a: readonly BeneficiarioPJ[], b: readonly BeneficiarioPJ[]): BeneficiarioPJ[] {
  const m = new Map<string, BeneficiarioPJ>();
  for (const x of [...a, ...b]) {
    const atual = m.get(x.cnpj);
    if (!atual) {
      m.set(x.cnpj, { ...x, porNatureza: Object.fromEntries(Object.entries(x.porNatureza).map(([k, v]) => [k, [...v]])) });
      continue;
    }
    for (const [nat, ps] of Object.entries(x.porNatureza)) atual.porNatureza[nat] = [...(atual.porNatureza[nat] ?? []), ...ps];
    atual.ref = [...new Set([...atual.ref.split(','), ...x.ref.split(',')])].sort().join(',');
  }
  return [...m.values()].sort((x, y) => x.cnpj.localeCompare(y.cnpj));
}

export interface MontagemR2010 {
  prestadores: PrestadorR2010[];
  /** As linhas declaradas (invariante 13). */
  linhasR2010: WithholdingLineForReinf[];
  relatorio: LinhaRelatorio[];
}

/**
 * Item 17 — linhas `MADE` `ACTIVE` `tributo = INSS` ao R-2010 (invariante 13; o ISS nunca entra). Um prestador por CNPJ; NF =
 * título (`payableId`), `vlrBruto` = bruto da linha de INSS, uma `infoTpServ` por `tpServico` (lacuna C, dono 27/10). Recusas
 * (400 nomeado com o id da linha, sem inventar valor): prestador sem CNPJ válido ⇒ `REINF_PRESTADOR_CNPJ_INVALIDO`; série,
 * número da NF, `tpServico` ou `cprb` nulos ⇒ `REINF_R2010_CAMPO_AUSENTE` com os campos; `indCPRB` diferente entre NFs do
 * mesmo prestador ⇒ `REINF_R2010_CPRB_DIVERGENTE`.
 */
export function montarR2010(linhas: readonly WithholdingLineForReinf[]): MontagemR2010 {
  const inss = linhas.filter((l) => l.tributo === 'INSS' && l.dispensa === null);
  for (const l of inss) {
    if (l.beneficiario.kind !== 'CNPJ' || !l.beneficiario.taxId || !isValidCnpj(l.beneficiario.taxId)) {
      throw new ValidationError(
        'O prestador de uma retenção de INSS da competência não tem CNPJ válido: corrija o cadastro antes de gerar a Reinf.',
        { counterpartyId: l.beneficiario.counterpartyId, withholdingId: l.id },
        'REINF_PRESTADOR_CNPJ_INVALIDO',
      );
    }
    const faltando = [
      l.titulo.documentoSerie === null ? 'serie' : null,
      l.titulo.documentNumber === null ? 'numDocto' : null,
      l.inss?.tpServico == null ? 'tpServico' : null,
      l.inss?.cprb == null ? 'indCPRB' : null,
    ].filter((x): x is string => x !== null);
    if (faltando.length > 0) {
      throw new ValidationError(
        `A retenção de INSS não tem ${faltando.join(', ')}: complete a nota (série/número) ou o perfil de retenção do prestador (tipo de serviço, CPRB).`,
        { withholdingId: l.id, campos: faltando },
        'REINF_R2010_CAMPO_AUSENTE',
      );
    }
  }

  const porCnpj = new Map<string, WithholdingLineForReinf[]>();
  for (const l of inss) porCnpj.set(l.beneficiario.taxId!, [...(porCnpj.get(l.beneficiario.taxId!) ?? []), l]);

  const relatorio: LinhaRelatorio[] = [];
  const prestadores: PrestadorR2010[] = [...porCnpj.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cnpj, ls]) => {
      if (new Set(ls.map((l) => l.inss!.cprb)).size > 1) {
        throw new ValidationError(
          'O prestador tem notas com e sem CPRB no mesmo mês; o R-2010 informa um só indicador por prestador. Confira o perfil de retenção.',
          { counterpartyId: ls[0].beneficiario.counterpartyId },
          'REINF_R2010_CPRB_DIVERGENTE',
        );
      }
      const porTitulo = new Map<string, WithholdingLineForReinf[]>();
      for (const l of ls) porTitulo.set(l.titulo.payableId, [...(porTitulo.get(l.titulo.payableId) ?? []), l]);
      const nfs = [...porTitulo.values()].map((doc) => {
        const tipos = new Map<string, { tpServico: string; baseCents: bigint; retencaoCents: bigint }>();
        for (const l of doc) {
          const tp = l.inss!.tpServico!;
          const t = tipos.get(tp) ?? { tpServico: tp, baseCents: 0n, retencaoCents: 0n };
          t.baseCents += BigInt(l.baseCents);
          t.retencaoCents += BigInt(l.amountCents);
          tipos.set(tp, t);
        }
        return {
          serie: doc[0].titulo.documentoSerie!,
          numDocto: doc[0].titulo.documentNumber!,
          dtEmissaoNF: doc[0].titulo.issueDate,
          vlrBrutoCents: BigInt(doc[0].brutoCents),
          tiposServico: [...tipos.values()],
          origemIds: doc.map((l) => l.id),
        };
      });
      for (const l of ls) {
        relatorio.push({
          evento: 'R-2010',
          beneficiario: mascararCnpj(cnpj),
          natRend: null,
          dtFG: l.dataFatoGerador,
          tributo: 'INSS',
          brutoCents: l.brutoCents,
          baseCents: l.baseCents,
          retidoCents: l.amountCents,
          codigoReceita: l.codigoReceita,
          vencimentoDarf: null,
        });
      }
      const refs = [...new Set(ls.map((l) => l.beneficiario.counterpartyId))].sort();
      const prestador: PrestadorR2010 = { cnpj, ref: refs.join(','), indCPRB: ls[0].inss!.cprb ? 1 : 0, nfs };
      return prestador;
    });
  return { prestadores, linhasR2010: inss, relatorio };
}

/** Item 14 — Σ do retido por código derivado, sobre todas as linhas do relatório (invariante 4 por código). */
export function totaisPorCodigo(linhas: readonly LinhaRelatorio[]): { codigoReceita: string | null; totalCents: string }[] {
  const totais = new Map<string | null, bigint>();
  for (const r of linhas) totais.set(r.codigoReceita, (totais.get(r.codigoReceita) ?? 0n) + BigInt(r.retidoCents));
  return [...totais.entries()].map(([codigoReceita, t]) => ({ codigoReceita, totalCents: t.toString() }));
}
