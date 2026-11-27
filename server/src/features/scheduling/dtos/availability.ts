/**
 * BE-INCR-ESCALA-BASE §3.4 (itens 31–33) — DTOs de leitura da escala: disponibilidade e horário livre.
 *
 * A janela máxima de 31 dias não é refine daqui: o serviço recusa com `RANGE_TOO_LARGE` (código da §3.4), e o refine do
 * Zod sairia como erro genérico de validação. Aqui ficam o formato, `to > from`, o alvo único do `availability`, e a
 * duração do `free-slots` (`serviceId` ou `durationMinutes`; com os dois, vale o `durationMinutes` informado). O
 * `free-slots` aceita profissional e recurso juntos (item 32: o horário em que os dois estão livres).
 */
import { z } from 'zod';
import { instant } from './rows';

const id = z.string().min(1);
export const MAX_RANGE_DAYS = 31;

const toAfterFrom = (q: { from: string; to: string }) => Date.parse(q.to) > Date.parse(q.from);
const TO_AFTER_FROM = { message: '`to` must be after `from`', path: ['to'] };

const availabilityBase = z
  .object({
    unitId: id,
    employeeId: id.optional(),
    resourceId: id.optional(),
    from: instant,
    to: instant,
  })
  .strict();

export const AvailabilityQuerySchema = availabilityBase
  .refine(toAfterFrom, TO_AFTER_FROM)
  .refine((q) => (q.employeeId ? 1 : 0) + (q.resourceId ? 1 : 0) === 1, {
    message: 'exactly one target: employeeId or resourceId',
    path: ['employeeId'],
  });

export const FreeSlotsQuerySchema = availabilityBase
  .extend({
    serviceId: id.optional(),
    durationMinutes: z.coerce.number().int().min(5).max(1440).optional(),
    stepMinutes: z.coerce.number().int().min(5).max(120).default(15),
  })
  .strict()
  .refine(toAfterFrom, TO_AFTER_FROM)
  .refine((q) => q.serviceId !== undefined || q.durationMinutes !== undefined, {
    message: 'durationMinutes is required without serviceId',
    path: ['durationMinutes'],
  });

const intervalOut = z.object({ startAt: z.string(), endAt: z.string() }).strict();

export const AvailabilityResponseSchema = z
  .object({
    /** F-ESC-15 (a): alvo sem padrão vivo não tem restrição, e a janela inteira volta como disponível. */
    unrestricted: z.boolean(),
    intervals: z.array(intervalOut),
  })
  .strict();

export const FreeSlotsResponseSchema = z
  .object({
    slots: z.array(
      z.object({ employeeId: z.string().nullable(), resourceId: z.string().nullable(), startAt: z.string(), endAt: z.string() }).strict(),
    ),
  })
  .strict();

export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;
export type FreeSlotsQuery = z.infer<typeof FreeSlotsQuerySchema>;
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;
export type FreeSlotsResponse = z.infer<typeof FreeSlotsResponseSchema>;
