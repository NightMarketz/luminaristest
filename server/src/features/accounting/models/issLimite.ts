import { linhaLegalVigente, SemLinhaVigenteError, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import { linhasEmCacheSincrono } from '../../legalParameters/services/legalParameterCache';
import { hojeDateOnly } from '../../legalParameters/models/hoje';

/**
 * BE-INCR-LEGAL-PARAMS PR-2 (item 22) — alíquota máxima do ISS (tabela `ISS_LIMITE`, chave `ALIQUOTA_MAX_BP`; leiaute
 * DPS pAliq [312], RN E0595 — "não é permitido alíquota superior a 5%"). Só o máximo: o mínimo de 2% (LC 116 art. 8º-A)
 * é a D-4, pendência de contador.
 */
export function issAliquotaMaxBp(linhas: readonly LinhaLegal[], data: string): number {
  const l = linhaLegalVigente(linhas, 'ISS_LIMITE', 'ALIQUOTA_MAX_BP', data);
  if (l?.valorInt == null) throw new SemLinhaVigenteError('ISS_LIMITE', data, 'ALIQUOTA_MAX_BP');
  return l.valorInt;
}

/** Emenda §9 L-8 — para o DTO Zod estático: o máximo vigente hoje, lido do cache síncrono (aquecido no boot). */
export function issAliquotaMaxBpDoCache(hoje: string = hojeDateOnly()): number {
  return issAliquotaMaxBp(linhasEmCacheSincrono('ISS_LIMITE'), hoje);
}
