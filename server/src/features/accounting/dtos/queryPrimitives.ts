import { z } from 'zod';

/**
 * Primitivas de DTO de QUERY — o que muda quando o valor vem de `req.query`.
 *
 * Todo valor de query chega STRING. `z.coerce.boolean()` é armadilha nessa posição porque
 * delega ao `Boolean(v)` do JS: `Boolean("false") === true`, então `?flag=false` liga a flag.
 * Só a AUSÊNCIA do parâmetro produzia `false` — o oposto do contrato que o nome sugere.
 *
 * Este helper é a promoção do padrão que o `ReferentialCatalogDto` já usava certo
 * (`analyticOnly`): união fechada na entrada + transform explícito na saída. Fica canônico
 * aqui porque a técnica estava re-inlinada, e revisor pega clone de símbolo inteiro, não
 * técnica re-inlinada.
 */

/**
 * Booleano de query-string: aceita o booleano de verdade (body JSON) e as strings `"true"` /
 * `"false"` (query-string), e SEMPRE devolve booleano — ausente vira `false`. Qualquer outra
 * string é 400, não um `true` silencioso.
 */
export const queryBoolean = () =>
  z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true');
