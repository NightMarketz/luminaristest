import { linhaLegalVigente, SemLinhaVigenteError, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import { linhasEmCacheSincrono } from '../../legalParameters/services/legalParameterCache';
import { hojeDateOnly } from '../../legalParameters/models/hoje';

/**
 * BE-INCR-LEGAL-PARAMS PR-2 (item 22) — alíquota máxima do ISS (tabela `ISS_LIMITE`, chave `ALIQUOTA_MAX_BP`; leiaute
 * DPS pAliq [312], RN E0595 — "não é permitido alíquota superior a 5%"). Só o máximo.
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

/**
 * ISS-TRANSICAO-IBS PR-2 item 10 (F-ISS-4 a) — alíquota mínima do ISS por vigência (tabela `ISS_LIMITE`, chave
 * `ALIQUOTA_MIN_BP`): 200 de 2025 a 2028 (LC 116 art. 8º-A caput) e 180/160/140/120 de 2029 a 2032 (P-ISS-1 → leitura b:
 * ADCT art. 128 caput I–IV, EC 132/2023, fixa "as alíquotas" do ISS em 9/10…6/10 — fold de 30/10,
 * D-2026-10-30-TRIAGEM-CONTADOR). Sem linha PUBLISHED na data (só DRAFT, ou nenhuma) ⇒ `SemLinhaVigenteError` (400
 * nomeado com a data), nunca o 2% de antes.
 */
export function issAliquotaMinBp(linhas: readonly LinhaLegal[], data: string): number {
  const l = linhaLegalVigente(linhas, 'ISS_LIMITE', 'ALIQUOTA_MIN_BP', data);
  if (l?.valorInt == null) throw new SemLinhaVigenteError('ISS_LIMITE', data, 'ALIQUOTA_MIN_BP');
  return l.valorInt;
}
