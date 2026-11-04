/**
 * Parâmetros legais da folha — BE-INCR-DP-F0-F1 item 26 (PR-2). Leitor tipado e puro sobre a fotografia do
 * `LegalParameterService`: é o insumo legal do snapshot do cálculo do F2 (F-DP-8).
 *
 * Reusa o que já tem dono (item 25, `_REUSE-CRITERION`): IRRF pela `tabelaIrrfPfDe` (RETENCOES-FONTE), encargos pela
 * `encargosFolhaDe` (EFICIENCIA-FISCAL) e o salário mínimo do X14. Só a tabela progressiva do INSS do empregado é nova
 * (EC 103/2019 art. 28 I–IV e § 1º). Tabela ausente na data ⇒ `ParametroLegalAusenteError` (F-PR4-7): o leitor nunca cai
 * na tabela de outro ano.
 */
import { exigirLinhaVigente, linhasEmVigor, ParametroLegalAusenteError, type LegalParameterTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import { InssEmpregadoFaixaJson } from '../../legalParameters/models/formatoLinha';
import { tabelaIrrfPfDe, type FaixaIrrfPf, type TabelaIrrfPf } from '../../accounting/models/retencaoParams';
import { encargosFolhaDe } from '../../accounting/models/taxSimulation';

/** As tabelas que o leitor consome — o que o serviço pede à `fotografia`. */
export const TABELAS_PARAMETROS_FOLHA = ['INSS_EMPREGADO', 'ENCARGO_FOLHA', 'SALARIO_MINIMO', 'IRRF_PF_MENSAL'] as const satisfies readonly LegalParameterTabela[];

/** Faixa do INSS do empregado. `ateCents: null` = até o teto do RGPS (`tetoRgpsCents`), EC 103 art. 28 IV. */
export interface FaixaInss {
  ateCents: bigint | null;
  aliquotaBp: number;
}

export interface ParametrosFolha {
  inssEmpregado: FaixaInss[];
  tetoRgpsCents: bigint;
  fgtsBp: number;
  fgtsAprendizBp: number;
  ciSeguradoBp: number;
  patronalBp: number;
  salarioMinimoCents: bigint;
  irrf: {
    faixas: FaixaIrrfPf[];
    /** `null` antes de 2026-01-01 (Lei 9.250 art. 3º-A, incl. Lei 15.270/2025). */
    reducaoArt3A: TabelaIrrfPf['reducao'];
    dependenteCents: bigint;
    descontoSimplificadoBp: number;
  };
}

/** Faixas do INSS vigentes na `data`, ordenadas por FAIXA_n; contíguas (FAIXA_1..n sem buraco, limites crescentes) e só a última sem limite. */
function faixasInss(fotografia: readonly LinhaLegal[], data: string): FaixaInss[] {
  const porChave = new Map<string, LinhaLegal>();
  for (const l of linhasEmVigor(fotografia)) {
    if (l.tabela !== 'INSS_EMPREGADO' || l.vigenteDesde > data || (l.vigenteAte !== null && data > l.vigenteAte)) continue;
    const atual = porChave.get(l.chave);
    if (!atual || l.vigenteDesde > atual.vigenteDesde) porChave.set(l.chave, l);
  }
  if (porChave.size === 0) throw new ParametroLegalAusenteError('INSS_EMPREGADO', data);
  const numero = (chave: string) => Number(/^FAIXA_(\d)$/.exec(chave)?.[1] ?? NaN);
  const linhas = [...porChave.values()].sort((a, b) => numero(a.chave) - numero(b.chave));
  const faixas = linhas.map((l, i) => {
    if (numero(l.chave) !== i + 1) throw new Error(`parametrosFolha: INSS_EMPREGADO em ${data} sem FAIXA_${i + 1} (faixas não contíguas).`);
    const f = InssEmpregadoFaixaJson.parse(JSON.parse(l.valorJson ?? 'null'));
    return { ateCents: f.ateCents === null ? null : BigInt(f.ateCents), aliquotaBp: f.aliquotaBp };
  });
  faixas.forEach((f, i) => {
    const ultima = i === faixas.length - 1;
    if (ultima !== (f.ateCents === null)) throw new Error(`parametrosFolha: INSS_EMPREGADO em ${data}: só a última faixa vai até o teto (ateCents null).`);
    const anterior = i > 0 ? faixas[i - 1].ateCents : null;
    if (f.ateCents !== null && anterior !== null && f.ateCents <= anterior) throw new Error(`parametrosFolha: INSS_EMPREGADO em ${data}: limites das faixas fora de ordem.`);
  });
  return faixas;
}

export function parametrosFolha(fotografia: readonly LinhaLegal[], data: string): ParametrosFolha {
  const inssEmpregado = faixasInss(fotografia, data);
  const encargos = encargosFolhaDe(fotografia, data);
  if (encargos.tetoRgpsCents === null) throw new ParametroLegalAusenteError('ENCARGO_FOLHA', data, 'TETO_RGPS_CENTS');
  const irrf = tabelaIrrfPfDe(fotografia, data);
  if (!irrf) throw new ParametroLegalAusenteError('IRRF_PF_MENSAL', data);
  const inteiro = (tabela: LegalParameterTabela, chave: string): number => {
    const v = exigirLinhaVigente(fotografia, tabela, chave, data).valorInt;
    if (v === null) throw new ParametroLegalAusenteError(tabela, data, chave);
    return v;
  };
  return {
    inssEmpregado,
    tetoRgpsCents: encargos.tetoRgpsCents,
    fgtsBp: encargos.fgtsBp,
    fgtsAprendizBp: inteiro('ENCARGO_FOLHA', 'FGTS_APRENDIZ_BP'),
    ciSeguradoBp: encargos.ciSeguradoBp,
    patronalBp: encargos.patronalBp,
    salarioMinimoCents: BigInt(inteiro('SALARIO_MINIMO', 'NACIONAL')),
    irrf: {
      faixas: irrf.faixas,
      reducaoArt3A: irrf.reducao,
      dependenteCents: irrf.dependenteCents,
      descontoSimplificadoBp: inteiro('IRRF_PF_MENSAL', 'DESCONTO_SIMPLIFICADO_BP'),
    },
  };
}
