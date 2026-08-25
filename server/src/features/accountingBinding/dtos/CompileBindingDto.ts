import { z } from 'zod';
import { EventBindingSchema } from './AccountingBindingDto';
import { ACCOUNTING_BINDING_STATUSES } from '../models/accountingBindingStatus';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1) — DTOs de REQUISIÇÃO das 3 rotas do módulo
 * (Corpo C, item 15 do BRIEF, metade "sem registro"): `POST /accounting-binding/compile`,
 * `POST /accounting-binding/validate`, `GET /accounting-binding`. `.strict()` em todo nível,
 * mesmo padrão de `AccountingBindingDto.ts`.
 *
 * `eventBindings` reaproveita `EventBindingSchema` (mesmo arquivo do binding compilado, Fase 0) —
 * a requisição já carrega `roleSlots[].accountCode` LITERAL (F-P1-5a: "escolhas papel→conta" já
 * feitas por quem chama; o compilador não resolve papel→conta, só VALIDA o que foi escolhido
 * contra o plano de contas via o port injetado — ver `services/BindingCompileService.ts`).
 *
 * Papel com sub-chave (`caixa-por-metodo`, `SaleSettledMapper.ts:36-42`): o `role` da linha
 * carrega a sub-chave embutida como `"<papel>:<subChave>"` (ex.: `'caixa-por-metodo:Pix'`) — o
 * campo `role` de `RoleSlotSchema` já é string livre (não um enum fechado no nível Zod; o
 * catálogo de 9 papéis do BRIEF item 3 é fechado em `models/types.ts`, não aqui), então este é
 * o encaixe mais simples dentro do shape JÁ COMMITADO pela Fase 0 (`AccountingBindingDto.ts`) sem
 * tocar nele — decisão local deste arquivo, documentada aqui para quem ler `fixtures/saleBinding.ts`
 * (mesma convenção) e para o Corpo D consumir sem surpresa.
 */

/** Snapshot mínimo de uma conta do plano — insumo do hash de staleness (`compiledFromHash`), NÃO a
 *  fonte de verdade da validação (essa é sempre o `ChartLookupPort` injetado, lido ao vivo). */
export const ChartAccountSnapshotSchema = z
  .object({
    code: z.string().min(1, 'code é obrigatório.'),
    nature: z.string().min(1, 'nature é obrigatório.'),
    acceptsEntries: z.boolean(),
  })
  .strict();
export type ChartAccountSnapshot = z.infer<typeof ChartAccountSnapshotSchema>;

/** Corpo comum de `/compile` e `/validate` — o candidato de binding antes de ganhar
 *  `bindingVersion`/`compiledAt`/`compiledFromHash` (o service os calcula, nunca o cliente). */
export const CompileBindingRequestSchema = z
  .object({
    unitId: z.string().min(1, 'unitId é obrigatório.'),
    sectorKey: z.string().min(1, 'sectorKey é obrigatório.'),
    /** Schema operacional do preset instalado (canonicalizado para o hash de staleness). */
    operationalSchema: z.record(z.string(), z.unknown()),
    /** Snapshot do plano de contas usado nesta compilação (idem — insumo do hash). */
    chart: z.array(ChartAccountSnapshotSchema).min(1, 'chart precisa de ao menos 1 conta.'),
    eventBindings: z.array(EventBindingSchema).min(1, 'eventBindings precisa de ao menos 1 entrada.'),
  })
  .strict();
export type CompileBindingRequest = z.infer<typeof CompileBindingRequestSchema>;

/** `/validate` roda a MESMA validação de `/compile`, só não persiste — mesmo corpo de entrada. */
export const ValidateBindingRequestSchema = CompileBindingRequestSchema;
export type ValidateBindingRequest = CompileBindingRequest;

/** Query string de `GET /accounting-binding` — lista por escopo, com filtros opcionais. */
export const ListBindingsQuerySchema = z
  .object({
    unitId: z.string().min(1, 'unitId é obrigatório.'),
    sectorKey: z.string().min(1).optional(),
    status: z.enum(ACCOUNTING_BINDING_STATUSES).optional(),
  })
  .strict();
export type ListBindingsQuery = z.infer<typeof ListBindingsQuerySchema>;
