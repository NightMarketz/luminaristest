import { ValidationError } from '../../../lib/errors';
import { isValidCnpj } from '../../../lib/cnpj';
import type { BeneficiarioPJ, PagamentoPJ, ValorRetido } from '../../../lib/reinf';
import type { LinhaLegal } from '../../legalParameters/models/legalParameter';
import type { WithholdingLineForReinf } from '../dtos/WithholdingDto';
import { codigoReceitaRetencao, discriminadorDoCodigo, naturezaRendimentoVigente } from './retencaoParams';

/**
 * BE-INCR-EFD-REINF PR-1 (BRIEF itens 1, 6, 7, 8, 14; invariantes 1, 3, 4, 6) — das linhas da porta de retenções (§5.1)
 * aos beneficiários do R-4020 e ao relatório de conferência. PURO: as tabelas chegam pela fotografia de `legal_parameters`
 * (`NATUREZA_RENDIMENTO`, `RETENCAO_CODIGO`, `RETENCAO`), que são do RETENCOES-FONTE (emenda 22/10 item 1).
 */

/** Tributos que vão ao R-4020 (invariante 4). INSS = R-2010 (PR-2); ISS não é Reinf. */
export const TRIBUTOS_R4020 = ['IRRF', 'CSLL', 'COFINS', 'PIS'] as const;
const CSRF = new Set(['CSLL', 'COFINS', 'PIS']);

/** Avisos do relatório que o PR-1 emite (pacote de lacunas, dono 26/10, ponto 4). */
export const AVISO_PF_FORA_DA_REINF = 'PF_SERVICO_FORA_DA_REINF';
export const AVISO_R2010_NAO_GERADO = 'R2010_AINDA_NAO_GERADO';

export interface LinhaRelatorio {
  evento: 'R-4020';
  beneficiario: string; // mascarado
  natRend: string;
  dtFG: string;
  tributo: string;
  brutoCents: string;
  baseCents: string;
  retidoCents: string;
  codigoReceita: string | null;
  vencimentoDarf: string | null;
}

export interface MontagemR4020 {
  beneficiarios: BeneficiarioPJ[];
  /** As linhas declaradas (invariante 4). */
  linhasR4020: WithholdingLineForReinf[];
  /** Há fato da Reinf na competência (invariante 1; dispensa e ISS não contam). */
  temFato: boolean;
  avisos: string[];
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
  const avisos: string[] = [];
  const declaraveis = linhas.filter((l) => l.dispensa === null && l.tributo !== 'ISS');
  const temFato = declaraveis.length > 0;

  const pf = declaraveis.filter((l) => l.beneficiario.kind === 'CPF' && l.tributo !== 'INSS');
  if (pf.length > 0) avisos.push(`${AVISO_PF_FORA_DA_REINF}: ${pf.length} retenção(ões) de pessoa física — declarar fora do sistema (R-4010 de PF por serviço espera o nó de pessoal).`);
  const inss = declaraveis.filter((l) => l.tributo === 'INSS');
  if (inss.length > 0) avisos.push(`${AVISO_R2010_NAO_GERADO}: ${inss.length} retenção(ões) de INSS 11% — o R-2010 entra no PR-2 do nó.`);

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
