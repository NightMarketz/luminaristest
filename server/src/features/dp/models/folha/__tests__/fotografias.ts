/**
 * Fotografias de teste das calculadoras do F2 (PR-0): a real (as cargas versionadas) e uma alterada, para o teste de
 * cada calculadora rodar com as duas e esperar resultados diferentes (§0.1 do BRIEF, "como se garante").
 */
import { LEGAL_PARAMS_SEED_FILES, SIMPLES_SEED_FILES, legalParamsSeedRows } from '@test/helpers/legalParams';
import type { LinhaLegal } from '../../../../legalParameters/models/legalParameter';
import { parametrosFolha } from '../../parametrosFolha';
import { regrasFolha } from '../../regrasFolha';

export const REAL: readonly LinhaLegal[] = legalParamsSeedRows([...LEGAL_PARAMS_SEED_FILES, ...SIMPLES_SEED_FILES]);

/** A fotografia real com o valor de linhas `FOLHA_REGRA`/`DP_CATEGORIA_ENCARGO` trocado (por chave). */
export function alterada(troca: Record<string, number | string | object>, base: readonly LinhaLegal[] = REAL): LinhaLegal[] {
  return base.map((l) => {
    if (!(l.tabela === 'FOLHA_REGRA' || l.tabela === 'DP_CATEGORIA_ENCARGO') || !(l.chave in troca)) return l;
    const v = troca[l.chave];
    if (typeof v === 'number') return { ...l, valorInt: v };
    if (typeof v === 'string') return { ...l, valorTexto: v };
    return { ...l, valorJson: JSON.stringify(v) };
  });
}

export const MARCO = '2026-03-15';
export const regras = (foto: readonly LinhaLegal[] = REAL, data = MARCO) => regrasFolha(foto, data);
export const params = (foto: readonly LinhaLegal[] = REAL, data = MARCO) => parametrosFolha(foto, data);
