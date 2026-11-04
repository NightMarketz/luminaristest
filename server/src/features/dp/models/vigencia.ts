/**
 * Vigência do DP — BE-INCR-DP-F0-F1 itens 3 e 4 (PR-0).
 *
 * Só data de efeito (F-DP-8 → b, dono, 02/11): sem `registradoEm`/`substituidaEm`; correção de dado já registrado é
 * alteração auditada, e o cálculo antigo se reproduz pelo snapshot gravado (F2). Intervalos inclusivos nas duas pontas,
 * no molde do `LegalParameter` (`vigenteDesde`/`vigenteAte` date-only; `null` = sem fim). A sobreposição real é checada
 * no serviço, dentro da tx; estas funções são o predicado puro que o gate usa.
 */
import { z } from 'zod';
import { ConflictError } from '../../../lib/errors';
import { isValidDateOnly } from '../../accounting/models/dates';
import { CompetenciaSchema, type Competencia } from './competencia';

export const DateOnlySchema = z.string().refine(isValidDateOnly, 'data inválida (YYYY-MM-DD)');

export const VigenciaSchema = z
  .object({ vigenteDesde: DateOnlySchema, vigenteAte: DateOnlySchema.nullable() })
  .strict()
  .refine((v) => v.vigenteAte === null || v.vigenteAte >= v.vigenteDesde, 'vigenteAte < vigenteDesde');
export type Vigencia = { vigenteDesde: string; vigenteAte: string | null };

export const VigenciaCompetenciaSchema = z
  .object({ competenciaInicio: CompetenciaSchema, competenciaFim: CompetenciaSchema.nullable() })
  .strict()
  .refine((v) => v.competenciaFim === null || v.competenciaFim >= v.competenciaInicio, 'competenciaFim < competenciaInicio');
export type VigenciaCompetencia = { competenciaInicio: Competencia; competenciaFim: Competencia | null };

/**
 * Duas versões cobrem a mesma data — o gate na tx deveria ter impedido. 409 com o código `DP_VERSAO_SOBREPOSTA`
 * (§3.6 do BRIEF).
 */
export class VigenciaSobrepostaError extends ConflictError {
  constructor(public readonly data: string, public readonly quantas: number) {
    super(`${quantas} versões vigentes em ${data}; a vigência não pode se sobrepor.`, 'DP_VERSAO_SOBREPOSTA');
    Object.setPrototypeOf(this, VigenciaSobrepostaError.prototype);
  }
}

export function vigenteEm(v: Vigencia, data: string): boolean {
  return v.vigenteDesde <= data && (v.vigenteAte === null || data <= v.vigenteAte);
}

export function sobrepoe(a: Vigencia, b: Vigencia): boolean {
  return (a.vigenteAte === null || b.vigenteDesde <= a.vigenteAte) && (b.vigenteAte === null || a.vigenteDesde <= b.vigenteAte);
}

export function semSobreposicao(vs: readonly Vigencia[]): boolean {
  for (let i = 0; i < vs.length; i++) {
    for (let j = i + 1; j < vs.length; j++) if (sobrepoe(vs[i], vs[j])) return false;
  }
  return true;
}

/**
 * A única versão que cobre `data`; `null` se nenhuma cobre; `VigenciaSobrepostaError` se mais de uma cobre.
 */
export function versaoVigente<T extends Vigencia>(vs: readonly T[], data: string): T | null {
  const cobrem = vs.filter((v) => vigenteEm(v, data));
  if (cobrem.length > 1) throw new VigenciaSobrepostaError(data, cobrem.length);
  return cobrem[0] ?? null;
}

export function ativaEm(v: VigenciaCompetencia, c: Competencia): boolean {
  return v.competenciaInicio <= c && (v.competenciaFim === null || c <= v.competenciaFim);
}

export function sobrepoeCompetencia(a: VigenciaCompetencia, b: VigenciaCompetencia): boolean {
  return (
    (a.competenciaFim === null || b.competenciaInicio <= a.competenciaFim) &&
    (b.competenciaFim === null || a.competenciaInicio <= b.competenciaFim)
  );
}
