/**
 * BE-INCR-ESCALA-BASE item 21 — inventário da escala antes do PR-2 (SOMENTE LEITURA: nenhum write).
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/scheduling-inventory.ts
 * (aponta para o banco do `DATABASE_URL`; rode sobre uma cópia do banco real).
 */
import prisma from '../lib/prisma';
import { inventoryOf, type InventoryCounts, type InventoryRow } from '../features/scheduling/models/inventory';

async function liveRows(userId: string, internalName: string): Promise<InventoryRow[]> {
  const table = await prisma.dynamicTable.findFirst({ where: { userId, internalName }, select: { id: true } });
  if (!table) return [];
  const rows = await prisma.dynamicTableData.findMany({ where: { dynamicTableId: table.id, deletedAt: null }, select: { id: true, data: true } });
  return rows.map((r) => ({ id: r.id, data: (r.data ?? {}) as Record<string, unknown> }));
}

export type InstanceInventory = { userId: string; employees: number; appointments: number } & InventoryCounts;

export async function runInventory(): Promise<InstanceInventory[]> {
  const owners = await prisma.dynamicTable.findMany({ where: { internalName: 'employees' }, select: { userId: true }, distinct: ['userId'] });
  const out: InstanceInventory[] = [];
  for (const { userId } of owners) {
    const employees = await liveRows(userId, 'employees');
    const appointments = await liveRows(userId, 'appointments');
    out.push({ userId, employees: employees.length, appointments: appointments.length, ...inventoryOf(employees, appointments) });
  }
  return out;
}

if (require.main === module) {
  runInventory()
    .then((rows) => {
      const total = rows.reduce(
        (acc, r) => {
          for (const k of Object.keys(acc) as Array<keyof typeof acc>) acc[k] += r[k];
          return acc;
        },
        { employees: 0, appointments: 0, employeesWithWorkSchedule: 0, inactiveDaysWithHours: 0, employeesWithScheduleWithoutUnit: 0, crossUnitOverlappingPairs: 0, appointmentsWithoutProfessional: 0 },
      );
      process.stdout.write(`${JSON.stringify({ instances: rows.length, total, perInstance: rows }, null, 2)}\n`);
    })
    .catch((e) => {
      process.stderr.write(`${String(e)}\n`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
