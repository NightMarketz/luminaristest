/**
 * EmployeesPlugin
 *
 * Validates employee records for operational readiness: e-mail presence (format/unique are covered by schema/service).
 *
 * BE-INCR-ESCALA-BASE item 23 (F-ESC-12): the legacy `workSchedule` is no longer read here. The availability lives in the
 * scheduling tables (`schedules`/`scheduleShifts`), and the unit stays optional, as the field already is (BRIEF §6 item 4:
 * the item-21 inventory found no employee with a schedule and without a unit).
 */
import type { RulePlugin, RuleContext } from '../RuleTypes';
import { ValidationError } from '../../../../lib/errors';
import { tableMatches } from '../shared/tableFinder';

async function validateEmployee(_ctx: RuleContext, after: Record<string, unknown>) {
  // Email obrigatório, formato validado pelo schema, e unicidade já checada no serviço.
  const email = String(after?.email || '').trim();
  if (!email) {
    throw new ValidationError('E-mail é obrigatório.', { email: ['E-mail é obrigatório.'] });
  }
}

const SCHEMA_KEYS = {
  EMPLOYEES: 'employees',
};

export const EmployeesPlugin: RulePlugin = {
  name: 'EmployeesPlugin',
  supports(ctx) {
    return tableMatches(ctx.table, { categories: ['people'], internalNames: [SCHEMA_KEYS.EMPLOYEES], names: ['Employees', 'employees', 'Funcionários'] });
  },
  async beforeCreate(ctx) { await validateEmployee(ctx, ctx.after ?? {}); },
  async beforeUpdate(ctx) { await validateEmployee(ctx, ctx.after ?? {}); },
};


