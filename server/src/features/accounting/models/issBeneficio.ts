/**
 * BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI, bloco 1 (BRIEF §3 itens 2-3, §5.0 F-PI-2) — regra pura do benefício municipal de
 * ISS sobre o percentual efetivo do ISS da faixa do Simples. Sem banco, sem relógio.
 *
 * - O benefício é redução do percentual efetivo do ISS das tabelas (Res. CGSN 140 art. 32 § 1º); isenção ⇒ 0.
 * - Piso: o benefício não pode resultar em percentual menor que 2% (art. 31 p.ú.; LC 116 art. 8º-A § 1º), exceto
 *   subitens 7.02, 7.05 e 16.01 da lista da LC 116.
 * - F-PI-2 (dono, 10/10, contra a recomendação): piso ABSOLUTO — `max(reduzido, 2%)` mesmo acima do % puro da tabela
 *   (tabela 1,92% + isenção ⇒ 2%); quem chama sinaliza com o alerta BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO.
 * - Redução de 0 bp na faixa = sem benefício nessa faixa (é como o usuário "desmarca" o benefício naquela faixa, F-PI-2).
 */
export type BeneficioIssCalculo = { tipo: 'ISENCAO' | 'REDUCAO_PERCENTUAL'; reducaoBpPorFaixa: number[] | null };

/** 2% em bp (LC 116 art. 8º-A caput; Res. CGSN 140 art. 31 p.ú.). */
export const PISO_ISS_BP = 200;
/** Subitens sem piso (LC 116 art. 8º-A § 1º; Res. CGSN 140 art. 31 p.ú.) — item+subitem = 4 primeiros dígitos do cTribNac. */
export const SUBITENS_SEM_PISO = ['0702', '0705', '1601'] as const;

export const excecaoPisoIss = (cTribNac: string | null): boolean => cTribNac !== null && (SUBITENS_SEM_PISO as readonly string[]).includes(cTribNac.slice(0, 4));

/** Redução em bp aplicável à faixa (1..6); `null` = sem benefício na faixa. */
export function reducaoBpDaFaixa(beneficio: BeneficioIssCalculo, faixa: number): number | null {
  if (beneficio.tipo === 'ISENCAO') return 10000;
  const r = beneficio.reducaoBpPorFaixa;
  if (!r || r.length === 0) return null;
  const v = r.length === 1 ? r[0] : r[faixa - 1];
  return v === undefined || v === 0 ? null : v;
}

/** Contrato §4 do BRIEF. `issTabelaBp` = % efetivo do ISS da faixa, em bp (pode ter fração). */
export function issComBeneficio(i: { issTabelaBp: number; faixa: number; cTribNac: string; beneficio: BeneficioIssCalculo | null }): {
  issAplicadoBp: number;
  pisoAplicado: boolean;
  excecaoPiso: boolean;
} {
  const excecaoPiso = excecaoPisoIss(i.cTribNac);
  const reducao = i.beneficio ? reducaoBpDaFaixa(i.beneficio, i.faixa) : null;
  if (reducao === null) return { issAplicadoBp: i.issTabelaBp, pisoAplicado: false, excecaoPiso };
  const reduzido = (i.issTabelaBp * (10000 - reducao)) / 10000;
  if (excecaoPiso || reduzido >= PISO_ISS_BP) return { issAplicadoBp: reduzido, pisoAplicado: false, excecaoPiso };
  return { issAplicadoBp: PISO_ISS_BP, pisoAplicado: true, excecaoPiso };
}

/** Linha cadastrada (forma mínima que a seleção lê). */
export interface BeneficioCadastrado {
  id: string;
  codMun: string;
  cTribNacPrefixos: string[];
  tipo: 'ISENCAO' | 'REDUCAO_PERCENTUAL' | 'VALOR_FIXO';
  reducaoBpPorFaixa: number[] | null;
  legislacao: string;
  vigenteDesde: string;
  vigenteAte: string | null;
}
type Alcance = Pick<BeneficioCadastrado, 'codMun' | 'cTribNacPrefixos' | 'vigenteDesde' | 'vigenteAte'>;

const alcanca = (prefixos: readonly string[], cTribNac: string): boolean => prefixos.length === 0 || prefixos.some((p) => cTribNac.startsWith(p));

/**
 * O benefício do Município `codMun` vigente em `data` (YYYY-MM-DD) que alcança o serviço `cTribNac` (art. 32 II).
 * A sobreposição é barrada na escrita (`sobrepoe`), então há no máximo um.
 */
export function beneficioDaAtividade<T extends Alcance>(beneficios: readonly T[], i: { codMun: string | null; cTribNac: string | null; data: string }): T | null {
  const { codMun, cTribNac, data } = i;
  if (codMun === null || cTribNac === null) return null;
  return beneficios.find((b) => b.codMun === codMun && b.vigenteDesde <= data && (b.vigenteAte === null || b.vigenteAte >= data) && alcanca(b.cTribNacPrefixos, cTribNac)) ?? null;
}

/** Dois benefícios do mesmo Município com vigência e serviços em comum (a seleção deixaria de ser única). */
export function sobrepoe(a: Alcance, b: Alcance): boolean {
  if (a.codMun !== b.codMun) return false;
  if (a.vigenteDesde > (b.vigenteAte ?? '9999-12-31') || b.vigenteDesde > (a.vigenteAte ?? '9999-12-31')) return false;
  if (a.cTribNacPrefixos.length === 0 || b.cTribNacPrefixos.length === 0) return true;
  return a.cTribNacPrefixos.some((p) => b.cTribNacPrefixos.some((r) => p.startsWith(r) || r.startsWith(p)));
}
