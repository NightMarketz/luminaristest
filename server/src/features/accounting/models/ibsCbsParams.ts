/**
 * IBS-CBS-2027 PR-1 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 1–2; ADR-INCR-IBS-CBS-2027 D2) — alíquotas
 * de IBS/CBS como DADO versionado, no molde de `pisCofinsParams.ts`. As linhas moram em `legal_parameters` (tabela
 * `IBS_CBS`; chave = tributo, discriminador = ALIQUOTA | ALIQUOTA_UF | ALIQUOTA_MUN, `valorInt` = bp): 2026 CBS 0,9%
 * (LC 214 art. 346) e IBS estadual 0,1% (art. 343); 2027–2028 IBS 0,05% + 0,05% (art. 344); CBS 2027–2028 = referência
 * − 0,1 p.p. (art. 347), linha DRAFT sem valor até a resolução do Senado (art. 349 I). Sem linha PUBLISHED vigente ⇒
 * `SemLinhaVigenteError` (400) com mensagem nomeada.
 */
import { SemLinhaVigenteError, linhasEmVigor, type LinhaLegal } from '../../legalParameters/models/legalParameter';

export type TributoConsumo = 'IBS' | 'CBS';
export type ChaveIbsCbs = 'ALIQUOTA' | 'ALIQUOTA_UF' | 'ALIQUOTA_MUN';

export interface ParametroIbsCbs {
  tributo: TributoConsumo;
  chave: ChaveIbsCbs;
  aliquotaBp: number;
  fonte: string;
  vigenteDesde: string; // YYYY-MM-DD
  vigenteAte: string | null; // YYYY-MM-DD inclusive; null = sem fim publicado
}

/** Mensagem do 400 quando a CBS de 2027+ ainda não tem linha publicada (a referência é resolução do Senado). */
export const CBS_REFERENCIA_NAO_PUBLICADA = 'alíquota de referência da CBS de 2027 ainda não publicada (LC 214 art. 349 I)';

/** Fotografia das linhas `IBS_CBS` em vigor (só PUBLISHED, sem as substituídas — L-7); a linha DRAFT da CBS 2027 fica fora. */
export function tabelaIbsCbsDe(linhas: readonly LinhaLegal[]): readonly ParametroIbsCbs[] {
  return linhasEmVigor(linhas)
    .filter((l) => l.tabela === 'IBS_CBS')
    .map((l) => {
      if (l.valorInt === null || (l.chave !== 'IBS' && l.chave !== 'CBS')) throw new Error(`ibsCbsParams: linha ${l.id} (${l.chave}/${l.discriminador ?? '∅'}) fora do formato de IBS_CBS`);
      return { tributo: l.chave, chave: l.discriminador as ChaveIbsCbs, aliquotaBp: l.valorInt, fonte: l.fonte, vigenteDesde: l.vigenteDesde, vigenteAte: l.vigenteAte };
    });
}

/**
 * IBS-CBS-2027 PR-3 (dono 22/10): taxa de referência PROVISÓRIA da CBS (tabela `IBS_CBS_PROVISORIA`, só PUBLISHED) — sem fonte
 * oficial; só a prévia da apuração a usa quando a linha oficial falta (art. 349 I). Mesmo formato de `ParametroIbsCbs`.
 */
export function tabelaProvisoriaCbsDe(linhas: readonly LinhaLegal[]): readonly ParametroIbsCbs[] {
  return linhasEmVigor(linhas)
    .filter((l) => l.tabela === 'IBS_CBS_PROVISORIA' && l.chave === 'CBS' && l.discriminador === 'ALIQUOTA' && l.valorInt !== null)
    .map((l) => ({ tributo: 'CBS' as const, chave: 'ALIQUOTA' as const, aliquotaBp: l.valorInt!, fonte: l.fonte, vigenteDesde: l.vigenteDesde, vigenteAte: l.vigenteAte }));
}

/** Linha vigente em `data` (date-only), a de `vigenteDesde` mais recente; sem linha ⇒ `SemLinhaVigenteError` (400). */
export function parametroIbsCbsVigente(tabela: readonly ParametroIbsCbs[], tributo: TributoConsumo, chave: ChaveIbsCbs, data: string): ParametroIbsCbs {
  let melhor: ParametroIbsCbs | undefined;
  for (const p of tabela) {
    if (p.tributo !== tributo || p.chave !== chave || p.vigenteDesde > data || (p.vigenteAte !== null && data > p.vigenteAte)) continue;
    if (!melhor || p.vigenteDesde > melhor.vigenteDesde) melhor = p;
  }
  if (!melhor) {
    const erro = new SemLinhaVigenteError('IBS_CBS', data, `${tributo}/${chave}`);
    if (tributo === 'CBS' && data >= '2027-01-01') erro.message = `${erro.message} — ${CBS_REFERENCIA_NAO_PUBLICADA}.`;
    throw erro;
  }
  return melhor;
}
