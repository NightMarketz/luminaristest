/**
 * BE-INCR-EFICIENCIA-FISCAL PR-2 (nó EFICIENCIA-FISCAL, BRIEF itens 11–12; ADR D7, I-8/I-9) — a segregação do Simples
 * (LC 123 art. 18 § 4º-A I; Res. CGSN 140 art. 25 §§ 6º–8º) DERIVADA da NCM do produto, nunca digitada. Pura: recebe a
 * fotografia de `legal_parameters` e devolve os tributos que saem do DAS para a receita do item.
 *
 * - Monofásico: `PIS_COFINS_MONOFASICO_NCM` (prefixo, `exceto`) → `SEGREGACAO_EXCLUI.monofasico`. No dia seguinte ao fim da
 *   tabela `PIS_COFINS` (hoje 2026-12-31 ⇒ 2027-01-01) a Lei 10.147 está revogada (LC 214 art. 542 XI) e a repartição do
 *   Simples não tem PIS/COFINS: sem exclusão (I-9). Onda 3.2 #5 (dono, chat, 24/11/2026): o fim vem da linha `PIS_COFINS`
 *   (`vigenteAte` + 1 dia), não de literal — reverte, nesse ponto, a decisão 3 de D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO
 *   ("tratado na função, sem mexer nas linhas"). As linhas de `PIS_COFINS_MONOFASICO_NCM` seguem sem fim (a importação de
 *   NF-e (X6) as lê). Sem linha de `PIS_COFINS` com NCM monofásica ⇒ `ParametroLegalAusenteError` (fail-closed).
 * - ICMS-ST: `ICMS_ST_NCM_UF` (chave = prefixo de NCM, discriminador = IBGE da UF da unidade) → `SEGREGACAO_EXCLUI.icmsSt`.
 *   Só linha PUBLISHED exclui; sem ela o ICMS fica no DAS (decisão 2 da mesma cédula: erra para mais imposto).
 */
import { z } from 'zod';
import { diaSeguinteAoFimDeVigencia, linhasEmVigor, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import { findMonofasicoRule, normalizeNcm, type MonofasicoNcmRule } from './pisCofinsMonofasicoNcm';
import { SEGREGACAO_EXCLUI, type TributoSimples } from './simplesCalc';

/**
 * LC 214 art. 542 XI — a Lei 10.147/2000 fica revogada a partir deste dia: o seguinte ao último `vigenteAte` de `PIS_COFINS`.
 * Fail-closed (ressalva do #1357, dono 24/11): linha `PIS_COFINS` em vigor sem `vigenteAte` ⇒ erro (`FimDeVigenciaNaoPublicadoError`), nunca `null`/"sem fim". `linhas` carrega `PIS_COFINS`.
 */
export function fimMonofasicoPisCofins(linhas: readonly LinhaLegal[], dataConsultada: string): string {
  return diaSeguinteAoFimDeVigencia(linhas, 'PIS_COFINS', null, dataConsultada);
}

/** `valorJson` de uma linha `ICMS_ST_NCM_UF`: os itens e CEST do anexo do Conv. ICMS 142/2018 que a NCM cobre. */
export const IcmsStNcmJsonSchema = z
  .object({
    anexo: z.string().regex(/^[IVXL]+$/),
    itens: z.array(z.string().regex(/^\d+\.\d+$/)).min(1),
    cest: z.array(z.string().regex(/^\d{2}\.\d{3}\.\d{2}$/)).min(1),
  })
  .strict();

/** As linhas em vigor (PUBLISHED, não substituídas) de uma tabela na data, sem exigir que a tabela exista. */
function vigentesNaData(linhas: readonly LinhaLegal[], tabela: string, data: string): LinhaLegal[] {
  return linhasEmVigor(linhas).filter((l) => l.tabela === tabela && l.vigenteDesde <= data && (l.vigenteAte === null || data <= l.vigenteAte));
}

function regrasMonofasico(linhas: readonly LinhaLegal[], data: string): MonofasicoNcmRule[] {
  return vigentesNaData(linhas, 'PIS_COFINS_MONOFASICO_NCM', data)
    .map((l) => ({ l, j: JSON.parse(l.valorJson ?? '{}') as { ordem: number; exceto?: string[] } }))
    .sort((a, b) => a.j.ordem - b.j.ordem)
    .map(({ l, j }) => (j.exceto ? { prefixo: l.chave, exceto: j.exceto, fonte: l.fonte } : { prefixo: l.chave, fonte: l.fonte }));
}

/** A linha PUBLISHED de ICMS-ST que casa a NCM na UF (IBGE, 2 dígitos) na data, ou null. */
export function icmsStDaNcm(ncm8: string, cUf: string, data: string, linhas: readonly LinhaLegal[]): LinhaLegal | null {
  return vigentesNaData(linhas, 'ICMS_ST_NCM_UF', data).find((l) => l.discriminador === cUf && ncm8.startsWith(l.chave)) ?? null;
}

/**
 * Item 12 — os tributos que saem do DAS para a receita de revenda do produto. NCM ausente ou inválida ⇒ `[]` (o aviso
 * `SEM_NCM` é da apuração); UF desconhecida ⇒ sem ICMS-ST.
 */
export function segregacaoPorNcm(ncm: string | null | undefined, cUf: string | null, data: string, linhas: readonly LinhaLegal[]): TributoSimples[] {
  const ncm8 = normalizeNcm(ncm);
  if (!ncm8) return [];
  const out: TributoSimples[] = [];
  if (findMonofasicoRule(ncm8, regrasMonofasico(linhas, data))) {
    const fim = fimMonofasicoPisCofins(linhas, data); // só lido com NCM monofásica: NCM fora da tabela não depende da PIS_COFINS
    if (data < fim) out.push(...SEGREGACAO_EXCLUI.monofasico);
  }
  if (cUf && icmsStDaNcm(ncm8, cUf, data, linhas)) out.push(...SEGREGACAO_EXCLUI.icmsSt);
  return out;
}
