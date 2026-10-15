import type { AccountingBindingV1 } from '../dtos/AccountingBindingDto';
import { AccountingBindingV1Schema } from '../dtos/AccountingBindingDto';
import type { ChartAccountSnapshot } from '../dtos/CompileBindingDto';
import { computeCompiledFromHash } from '../services/BindingCompileService';
import { codigoPosL8 } from '../../accounting/fixtures/ChartOfAccountsFixture';

/**
 * BE-INCR-PLANO-4-NIVEIS (L8; F-L8-7 a — dono, 13/10): o binding V1 publicado (embutido nos kits v1/v2, congelados
 * por sha256) não se edita; o V2 é DERIVADO dele pelo de-para `RENOMEACAO_CANONICA_L8` — mesmos eventos, arquétipos,
 * slots e papéis, só o `accountCode` (e o chart do hash) no plano de 4 níveis. Uma fonte: o de-para do fixture.
 */
export function bindingPosL8(
  v1: AccountingBindingV1,
  chartV1: ReadonlyArray<ChartAccountSnapshot>,
  operationalSchema: Record<string, unknown>,
  compiledAt: string,
): AccountingBindingV1 {
  const chart = chartV1.map((c) => ({ ...c, code: codigoPosL8(c.code) }));
  return AccountingBindingV1Schema.parse({
    ...v1,
    bindingVersion: 2,
    compiledAt,
    compiledFromHash: computeCompiledFromHash(operationalSchema, chart),
    eventBindings: v1.eventBindings.map((eb) => ({
      ...eb,
      roleSlots: eb.roleSlots.map((r) => ({ ...r, accountCode: codigoPosL8(r.accountCode) })),
    })),
  });
}
