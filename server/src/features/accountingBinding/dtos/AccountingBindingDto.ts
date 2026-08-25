import { z } from 'zod';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1) — DTO Zod `.strict()` do binding compilado
 * (`AccountingBindingV1`). Fonte: `docs/accounting/P1-DOSSIER-schema-binding.md` §a (anatomia,
 * linhas 59-134) — este arquivo materializa o esboço Zod de lá, já com os forks do ADR-P1
 * ratificados 2026-08-21:
 *
 *   - `archetypeKey`: enum FECHADO de 6 chaves — as 5 da classe 1 (`postEntry`) +
 *     `subledger_command` (F-P1-1b, ratificada: o corpus v1 cobre as DUAS classes de arquétipo).
 *   - `roleSlots[].accountCode`: OBRIGATÓRIO, nunca opcional (F-P1-5a, ratificada: papel→conta
 *     resolve na COMPILAÇÃO — o binding sempre carrega o código literal já validado contra o
 *     chart do tenant). O shape condicional que o dossiê desenhava para F-P1-5(b) colapsa: não
 *     existe `roleToAccount` de nível superior nesta v1 (aquele campo só fazia sentido sob (b)).
 *   - `fieldSlots[].transform`: enum FECHADO (`cents_from_reais` | `identity`) — NUNCA expressão
 *     livre. Isto não é um fork, é decorrência direta do invariante 5 do ADR-P1
 *     (`ADR-P1-binding-press.md:75-77`): uma string parseável/avaliável em runtime reabriria
 *     exatamente o `templateJson` rejeitado no master map §4.
 *
 * `.strict()` em TODO nível (não só no topo) — uma chave desconhecida em qualquer sub-objeto falha
 * loud, mesmo padrão do resto do domínio contábil (`PostingDto.ts` `sourceDocument`, INCR-8).
 */

/** As 5 chaves de arquétipo classe-1 (`postEntry`) + a chave classe-2 (`subledger_command`,
 *  F-P1-1b). Fechado — todo `archetypeKey` do binding tem que resolver a um item real do catálogo
 *  de código (`ArchetypeCatalog`, `models/types.ts`); a checagem #1 do validador (Corpo B) garante
 *  isso em runtime, este enum garante isso na FORMA. */
export const ArchetypeKeySchema = z.enum([
  'revenue_recognition',
  'settlement',
  'reversal',
  'performance_liability',
  'cogs',
  'subledger_command',
]);
export type ArchetypeKey = z.infer<typeof ArchetypeKeySchema>;

/** Transform do slot de campo — catálogo FECHADO do intérprete, nunca expressão livre (ver header). */
export const FieldSlotTransformSchema = z.enum(['cents_from_reais', 'identity']);
export type FieldSlotTransform = z.infer<typeof FieldSlotTransformSchema>;

/** Campo operacional (do preset instalado) → slot do arquétipo. */
export const FieldSlotSchema = z
  .object({
    slotName: z.string().min(1, 'slotName é obrigatório.'),
    sourceField: z.string().min(1, 'sourceField é obrigatório.'),
    transform: FieldSlotTransformSchema.default('identity'),
  })
  .strict();
export type FieldSlot = z.infer<typeof FieldSlotSchema>;

/** Papel → conta, resolvido na COMPILAÇÃO (F-P1-5a, ratificada): `accountCode` é sempre literal,
 *  nunca opcional — o compilador (Corpo C) já o validou contra o chart do tenant antes de gravar. */
export const RoleSlotSchema = z
  .object({
    role: z.string().min(1, 'role é obrigatório.'), // AccountRole real fechada em models/types.ts
    accountCode: z.string().min(1, 'accountCode é obrigatório (F-P1-5a: resolvido na compilação).'),
  })
  .strict();
export type RoleSlot = z.infer<typeof RoleSlotSchema>;

/** @openapi
 * components:
 *   schemas:
 *     AccountingBindingFieldSlot:
 *       type: object
 *       required: [slotName, sourceField]
 *       properties:
 *         slotName:    { type: string }
 *         sourceField: { type: string, description: "ex.: 'event.amount'" }
 *         transform:   { type: string, enum: [cents_from_reais, identity], default: identity }
 *     AccountingBindingRoleSlot:
 *       type: object
 *       required: [role, accountCode]
 *       properties:
 *         role:        { type: string, description: "AccountRole; papel com sub-chave usa 'papel:subChave' (ex.: caixa-por-metodo:Pix)" }
 *         accountCode: { type: string, description: "resolvido na compilação (F-P1-5a) — sempre literal" }
 *     AccountingBindingEventBinding:
 *       type: object
 *       required: [eventKey, archetypeKey, fieldSlots, roleSlots]
 *       properties:
 *         eventKey:           { type: string, description: "ex.: 'salon.sale.finalized' — mesma chave de AccountingEvent.sourceType" }
 *         archetypeKey:       { type: string, enum: [revenue_recognition, settlement, reversal, performance_liability, cogs, subledger_command] }
 *         fieldSlots:         { type: array, minItems: 1, items: { $ref: '#/components/schemas/AccountingBindingFieldSlot' } }
 *         roleSlots:          { type: array, minItems: 1, items: { $ref: '#/components/schemas/AccountingBindingRoleSlot' } }
 *         descriptionTemplate: { type: string, description: "texto setorial da descrição do lançamento, placeholder {sourceId} — opcional, default event.label" }
 */
/** Um evento do preset → 1 arquétipo, com seus slots de campo e de papel preenchidos. */
export const EventBindingSchema = z
  .object({
    eventKey: z.string().min(1, 'eventKey é obrigatório.'),
    archetypeKey: ArchetypeKeySchema,
    fieldSlots: z.array(FieldSlotSchema).min(1, 'fieldSlots precisa de ao menos 1 entrada.'),
    roleSlots: z.array(RoleSlotSchema).min(1, 'roleSlots precisa de ao menos 1 entrada.'),
    /**
     * Achado do golden test Fase 1 (BE-INCR-BINDING-PRESS, item 12 do BRIEF): os 5 mappers-à-mão de
     * produção NÃO usam `event.label` na descrição do lançamento — cada um monta uma string FIXA
     * própria do arquétipo, com um texto setorial embutido (ex.: `SaleSettledMapper.ts:94`,
     * `` `Liquidação salão — Venda ${event.sourceId}` ``). Esse texto é dado de SETOR (um vertical
     * de clínica não diria "salão"), não passthrough puro do evento (emenda 5 do ADR §11 cobre só
     * `sourceType`/`sourceId`) — então o único lugar coerente para ele é o binding compilado, não o
     * intérprete fixo (que teria que hardcodar texto de um setor específico, violando o invariante
     * 6 do ADR de rodar igual para qualquer vertical) nem o arquétipo em código (mesma razão).
     * Placeholder único suportado: `{sourceId}`. Opcional — ausente, o intérprete cai de volta a
     * `event.label` (mesmo comportamento de antes desta correção; nenhum binding existente quebra).
     */
    descriptionTemplate: z.string().min(1).optional(),
  })
  .strict();
export type EventBinding = z.infer<typeof EventBindingSchema>;

/** @openapi
 * components:
 *   schemas:
 *     AccountingBindingV1:
 *       type: object
 *       required: [sectorKey, bindingVersion, compiledAt, compiledFromHash, eventBindings]
 *       properties:
 *         sectorKey:        { type: string, description: "ex.: 'beautySalon' — casa com o preset instalado" }
 *         bindingVersion:   { type: integer, minimum: 1, description: "monotônico; incrementa a CADA recompilação (invariante 4)" }
 *         compiledAt:       { type: string, format: date-time }
 *         compiledFromHash: { type: string, description: "hash de (schema operacional + chart do tenant) na hora da compilação" }
 *         eventBindings:
 *           type: array
 *           minItems: 1
 *           items: { $ref: '#/components/schemas/AccountingBindingEventBinding' }
 */
export const AccountingBindingV1Schema = z
  .object({
    sectorKey: z.string().min(1, 'sectorKey é obrigatório.'),
    bindingVersion: z.number().int().positive('bindingVersion deve ser um inteiro positivo.'),
    compiledAt: z.string().datetime({ message: 'compiledAt deve ser um datetime ISO válido.' }),
    compiledFromHash: z.string().min(1, 'compiledFromHash é obrigatório.'),
    eventBindings: z.array(EventBindingSchema).min(1, 'eventBindings precisa de ao menos 1 entrada.'),
  })
  .strict();
export type AccountingBindingV1 = z.infer<typeof AccountingBindingV1Schema>;

/** Type guard, mesmo padrão de `isPostEntryInput` em `PostingDto.ts`. */
export function isAccountingBindingV1(obj: unknown): obj is AccountingBindingV1 {
  return AccountingBindingV1Schema.safeParse(obj).success;
}
