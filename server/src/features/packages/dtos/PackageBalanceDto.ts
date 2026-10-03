import { z } from 'zod';
import { isValidDateOnly } from '../../accounting/models/dates';

/**
 * PackageBalanceDto — prepaid-package balance inputs (Incremento G).
 *
 * Money is INTEGER CENTS. The credit/debit amounts come from internal callers (the
 * package-sale bridge and RegisterPaymentService), validated in the service against the
 * money boundary; only the read endpoint takes HTTP query input, gated here.
 */

/** @openapi
 * components:
 *   schemas:
 *     ListPackageBalancesQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId:     { type: string }
 *         customerId: { type: string }
 *         expiresOnOrBefore: { type: string, format: date, description: "BE-INCR-PACOTE-VALIDADE F-PV-11 a — só saldos com validade até esta data (YYYY-MM-DD real)" }
 */
export const ListPackageBalancesQuerySchema = z.object({
  // unitId is the second tenancy axis (Contract §2): security boundary is userId (auth),
  // unitId is a user-owned sub-partition supplied by the request.
  unitId: z.string().min(1),
  customerId: z.string().min(1).optional(),
  // BE-INCR-PACOTE-VALIDADE (item 16, F-PV-11 a): o operador lista o que vai vencer. Calendário real
  // (memória date-only-regex-nao-valida-calendario). Leitura sem .strict(): endurecer é achado fora de
  // escopo (BRIEF §8), para não quebrar quem chama hoje.
  expiresOnOrBefore: z.string().refine(isValidDateOnly, 'expiresOnOrBefore deve ser uma data real YYYY-MM-DD').optional(),
});

export type ListPackageBalancesQueryInput = z.infer<typeof ListPackageBalancesQuerySchema>;
