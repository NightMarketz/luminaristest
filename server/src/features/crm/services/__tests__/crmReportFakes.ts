/**
 * Fakes do motor para os testes do CrmReportService (BE-INCR-CRM-REPORT-BUILDER PR-2). Tabelas em memória por dono;
 * `getTableDataStream` registra cada lote pedido (prova do E2: nada de lote depois do estouro do teto).
 */
import type { PtaxRate } from 'generated/prisma';
import { Role } from '../../../users/models/User.model';
import type { UserContext } from '../../../../types/UserContext';
import type { IDynamicTable, ISchemaField } from '../../../dynamicTables/models/DynamicTable.model';
import type { DynamicTableService } from '../../../dynamicTables/services/DynamicTableService';
import type { IDynamicTableRepository } from '../../../dynamicTables/repositories/IDynamicTableRepository';
import type { ICrmReportDefinitionRepository } from '../../repositories/ICrmReportDefinitionRepository';
import type { ICrmReportDefinition } from '../../models/CrmReportDefinition.model';
import type { IPtaxRateRepository } from '../../../fx/repositories/IPtaxRateRepository';
import type { PtaxClosingQuote, PtaxCurrency } from '../../../fx/models/ptax';
import { CrmReportService } from '../CrmReportService';
import { CrmReportDefinitionPolicy } from '../../policies/CrmReportDefinitionPolicy';

export const user = (id: string, role: Role = Role.USER): UserContext =>
  ({ userId: id, id, role, name: id, username: id, email: `${id}@x`, createdAt: new Date(), updatedAt: new Date(), userRole: role, userEmail: `${id}@x` }) as UserContext;

export interface FakeRow {
  id: string;
  data: Record<string, unknown>;
  createdAt?: Date;
}

const f = (name: string, type: ISchemaField['type'], extra: Partial<ISchemaField> = {}): ISchemaField => ({ name, label: name, type, ...extra }) as ISchemaField;

export const SCHEMAS: Record<string, ISchemaField[]> = {
  leads: [
    f('leadName', 'string'),
    f('source', 'string'),
    f('status', 'select'),
    f('stageId', 'relation', { relation: { targetTable: '@@PRESET_TABLE_KEY::leadStages' } }),
    f('latestProposalAmount', 'number', { numberFormat: 'currency' }),
    f('latestProposalCurrency', 'select'),
    f('latestProposalEtaClose', 'date'),
    f('lastContactAt', 'datetime'),
    f('bantBudget', 'select'),
  ],
  crmOpportunities: [
    f('title', 'string'),
    f('leadId', 'relation', { relation: { targetTable: '@@PRESET_TABLE_KEY::leads' } }),
    f('amount', 'number', { numberFormat: 'currency' }),
    f('currency', 'select'),
    f('status', 'select'),
    f('estimatedCloseDate', 'date'),
    f('closedAt', 'datetime'),
  ],
  leadStages: [f('name', 'string'), f('order', 'number')],
  leadProposals: [f('status', 'select'), f('amount', 'number', { numberFormat: 'currency' }), f('currency', 'select')],
  leadActivities: [f('type', 'select')],
  crmAccounts: [f('name', 'string'), f('revenue', 'number', { numberFormat: 'currency' })],
  crmContacts: [f('name', 'string')],
};

export class FakeEngine {
  tables = new Map<string, IDynamicTable>(); // id → table
  rows = new Map<string, FakeRow[]>(); // tableId → rows
  /** Cada lote pedido: [tableId, batchSize, índice do lote]. */
  batches: Array<[string, number, number]> = [];

  addTable(ownerId: string, internalName: string, rows: FakeRow[], fields: ISchemaField[] = SCHEMAS[internalName]): IDynamicTable {
    const id = `${ownerId}-${internalName}`;
    const table = { id, userId: ownerId, name: internalName, internalName, category: 'crm', schema: { fields }, createdAt: new Date(), updatedAt: new Date() } as unknown as IDynamicTable;
    this.tables.set(id, table);
    this.rows.set(id, rows);
    return table;
  }

  service(): DynamicTableService {
    const self = this;
    return {
      async *getTableDataStream(_u: UserContext, tableId: string, batchSize = 1000) {
        const all = self.rows.get(tableId) ?? [];
        for (let i = 0, n = 0; i < all.length; i += batchSize, n++) {
          self.batches.push([tableId, batchSize, n]);
          yield all.slice(i, i + batchSize).map((r) => ({
            id: r.id, dynamicTableId: tableId, data: r.data, createdAt: r.createdAt ?? new Date('2026-01-15T12:00:00Z'), updatedAt: new Date('2026-01-15T12:00:00Z'), deletedAt: null,
          }));
        }
      },
    } as unknown as DynamicTableService;
  }

  repository(): IDynamicTableRepository {
    const self = this;
    return {
      async findTableByInternalName(userId: string, internalName: string) {
        return [...self.tables.values()].find((t) => t.userId === userId && t.internalName === internalName) ?? null;
      },
      async findTableById(id: string) {
        return self.tables.get(id) ?? null;
      },
    } as unknown as IDynamicTableRepository;
  }
}

export class FakeReportRepo implements ICrmReportDefinitionRepository {
  items = new Map<string, ICrmReportDefinition & { deletedAt?: Date }>();
  private seq = 0;
  async findManyByUser(userId: string) {
    return [...this.items.values()].filter((r) => r.userId === userId && !r.deletedAt);
  }
  async findManyAll() {
    return [...this.items.values()].filter((r) => !r.deletedAt);
  }
  async findById(id: string) {
    const r = this.items.get(id);
    return r && !r.deletedAt ? r : null;
  }
  async create(data: Parameters<ICrmReportDefinitionRepository['create']>[0]) {
    const id = `r${++this.seq}`;
    const row = { id, description: null, createdAt: new Date(), updatedAt: new Date(), ...data } as ICrmReportDefinition;
    this.items.set(id, row);
    return row;
  }
  async update(id: string, patch: Parameters<ICrmReportDefinitionRepository['update']>[1]) {
    const row = { ...this.items.get(id)!, ...patch };
    this.items.set(id, row);
    return row;
  }
  async softDelete(id: string) {
    this.items.get(id)!.deletedAt = new Date();
  }
  async softDeleteByUserId(userId: string) {
    for (const r of this.items.values()) if (r.userId === userId && !r.deletedAt) r.deletedAt = new Date();
  }
}

export class FakePtaxRepo implements IPtaxRateRepository {
  rates: Array<{ currency: PtaxCurrency; rateDate: string; sellRateE5: number }> = [];
  async upsertClosing(_q: PtaxClosingQuote): Promise<PtaxRate> {
    throw new Error('not used');
  }
  async findLatestOnOrBefore(currency: PtaxCurrency, date: string): Promise<PtaxRate | null> {
    const hit = this.rates.filter((r) => r.currency === currency && r.rateDate <= date).sort((a, b) => b.rateDate.localeCompare(a.rateDate))[0];
    return hit
      ? ({ id: 'x', currency, rateDate: new Date(`${hit.rateDate}T00:00:00.000Z`), buyRateE5: hit.sellRateE5 - 60, sellRateE5: hit.sellRateE5, quotedAt: new Date(), source: 'BCB_PTAX_FECHAMENTO', fetchedAt: new Date() } as PtaxRate)
      : null;
  }
  async findLatestDate(): Promise<string | null> {
    return null;
  }
}

/** Monta o serviço com os fakes; `now` default = segunda 28/09/2026 15h de Brasília. */
export function makeService(engine: FakeEngine, now: Date = new Date('2026-09-28T18:00:00Z')) {
  const reports = new FakeReportRepo();
  const ptax = new FakePtaxRepo();
  const service = new CrmReportService(engine.service(), engine.repository(), reports, new CrmReportDefinitionPolicy(), ptax, () => now);
  return { service, reports, ptax };
}
