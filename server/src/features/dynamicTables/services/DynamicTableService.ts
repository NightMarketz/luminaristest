import type { UserContext } from '../../../lib/authUtils';
import { IDynamicTableRepository } from '../repositories/IDynamicTableRepository';
import { IDynamicTablePolicy } from '../policies/IDynamicTablePolicy';
import { CreateDynamicTableDtoType, UpdateDynamicTableDtoType, CreateDynamicTableDataDtoType, UpdateDynamicTableDataDtoType, UpdateDynamicTableSchemaDtoType } from '../dtos/DynamicTable.dto';
import { IDynamicTable, IDynamicTableData, ITableSchema, ISchemaField, FieldEquals } from '../models/DynamicTable.model';
import { DynamicTableCategory } from '../models/TableCategories';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { globalRuleRegistry } from '../rules/RuleRegistry';
import type { RuleContext } from '../rules/RuleTypes';
import { withVersionContext, ruleContextOf, type VersionWriteContext } from '../repositories/versionLedger';
import type { Prisma } from 'generated/prisma';
import type { PresetTableDefinition } from '../presets';
import { SchemaValidator } from '../validation/SchemaValidator';
import { GovernanceEngine } from '../validation/GovernanceEngine';

/**
 * Fila de escrita por tabela, usada só pelas tabelas que declaram `noOverlap`.
 *
 * O gate autoritativo dentro da tx só morde se a transação perdedora ABRIR depois que a vencedora
 * COMMITOU — senão cada uma re-conta no próprio snapshot, todas leem 0, e as escritas colidem no
 * lock do SQLite (o perdedor recebe um erro cru de banco em vez de "esse horário já está ocupado").
 * Serializar a tx aqui transforma a corrida numa fila: a segunda re-conta já enxergando a primeira.
 *
 * ponytail: trava in-process, não distribuída — o teto é UM processo Node por arquivo SQLite, que é
 * exatamente o desenho atual deste projeto. Se algum dia houver mais de um processo escrevendo o
 * mesmo banco, isto deixa de bastar: o upgrade é constraint de exclusão no banco (Postgres
 * `EXCLUDE USING gist`) ou um lock consultivo, não uma trava maior aqui.
 */
const tableWriteQueue = new Map<string, Promise<unknown>>();

function withTableWriteLock<T>(tableId: string, fn: () => Promise<T>): Promise<T> {
  const previous = tableWriteQueue.get(tableId) ?? Promise.resolve();
  // `then(fn, fn)` — a fila anda mesmo quando o pedido anterior rejeita (ValidationError é o
  // desfecho ESPERADO do perdedor; não pode travar quem vem atrás).
  const run = previous.then(fn, fn);
  const settled = run.catch(() => undefined);
  tableWriteQueue.set(tableId, settled);
  // Não deixa o Map crescer por tabela já drenada.
  void settled.then(() => {
    if (tableWriteQueue.get(tableId) === settled) tableWriteQueue.delete(tableId);
  });
  return run;
}

/**
 * Converte o valor de um filtro de busca para o tipo declarado do campo (F-DT-1 → b,
 * docs/accounting/DT-SERVICE-I11-I7-REVISAO-brief.md §4). `null` passa direto. Tipos sem regra clara
 * (`date`, `datetime`, `relation`, `json`) mantêm o valor como veio.
 */
function coerceFilterValue(type: ISchemaField['type'], name: string, value: FieldEquals['value']): FieldEquals['value'] {
  if (value === null) return null;
  switch (type) {
    case 'number': {
      if (typeof value === 'number') return value;
      const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
      if (Number.isFinite(n)) return n;
      break;
    }
    case 'string':
    case 'select':
    case 'textarea':
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return String(value);
      break;
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      break;
    default:
      return value;
  }
  throw new ValidationError(`Valor de filtro inválido no campo '${name}': esperado ${FILTER_TYPE_LABEL[type]}.`);
}

const FILTER_TYPE_LABEL: Record<string, string> = {
  number: 'número', string: 'texto', select: 'texto (uma das opções)', textarea: 'texto', boolean: 'booleano (true/false)',
};

const PRESET_TABLE_KEY_PREFIX = '@@PRESET_TABLE_KEY::';

function errorContext(err: unknown): { error: string } {
  return { error: err instanceof Error ? err.message : String(err) };
}

/**
 * Orquestrador do motor DynamicTable: autorização (policy) + transação + ordem de execução. A validação
 * de schema (`SchemaValidator`), as regras declarativas (`GovernanceEngine`) e os plugins (`RuleRegistry`)
 * são colaboradores — o service não tem cópia deles. Nunca toca o Prisma: a transação é um seam do
 * repositório (`runInTransaction` / `withTransaction`), o único lugar que conhece o client.
 */
export class DynamicTableService {
  private repository: IDynamicTableRepository;
  private policy: IDynamicTablePolicy;

  constructor(
    repository: IDynamicTableRepository,
    policy: IDynamicTablePolicy,
    private readonly schemaValidator: SchemaValidator = new SchemaValidator(),
    private readonly governance: GovernanceEngine = new GovernanceEngine(),
  ) {
    this.repository = repository;
    this.policy = policy;
    // Plugins are registered centrally in the RuleRegistry
  }

  // --- Private Core Logic Methods ---

  /** O repositório ligado à tx do chamador (`options.tx`), ou o de estado commitado. */
  private repoFor(tx?: Prisma.TransactionClient): IDynamicTableRepository {
    return tx ? this.repository.withTransaction(tx) : this.repository;
  }

  /**
   * Validates that every relation column in the given schema has a `targetTable` that
   * (a) exists in the database and (b) is owned by `userId`.
   * Throws a ValidationError on the first violation found.
   * Columns whose `targetTable` is a preset marker (@@PRESET_TABLE_KEY::...) are skipped.
   */
  private async validateRelationTargetOwnership(userId: string, schema: ITableSchema, repo: IDynamicTableRepository = this.repository): Promise<void> {
    if (!Array.isArray(schema?.fields)) return;
    for (const field of schema.fields) {
      if (field.type !== 'relation' || !field.relation?.targetTable) continue;
      const targetId = field.relation.targetTable;
      if (typeof targetId === 'string' && targetId.startsWith(PRESET_TABLE_KEY_PREFIX)) continue;
      const targetTable = await repo.findTableById(targetId);
      if (!targetTable) {
        throw new ValidationError(
          `Relação inválida no campo '${field.label || field.name}': tabela alvo '${targetId}' não existe.`
        );
      }
      if (targetTable.userId !== userId) {
        throw new ValidationError(
          `Relação inválida no campo '${field.label || field.name}': tabela alvo '${targetId}' não pertence a este usuário.`
        );
      }
      if ((targetTable.schema as unknown as ITableSchema)?.ui?.presentation === 'system') {
        throw new ValidationError(
          `Relação inválida no campo '${field.label || field.name}': não é permitido referenciar tabelas de sistema.`
        );
      }
    }
  }

  private assertNoDuplicateFieldNames(schema: { fields: Array<{ name: string }> }): void {
    const fieldNames = schema.fields.map(field => field.name.trim().toLowerCase());
    if (new Set(fieldNames).size !== fieldNames.length) {
      throw new ValidationError('O esquema da tabela não pode conter nomes de campos duplicados.');
    }
  }

  private async _createTable(userId: string, data: CreateDynamicTableDtoType): Promise<IDynamicTable> {
    this.assertNoDuplicateFieldNames(data.schema);

    // Validação estrutural do schema: compila o Zod para detectar inconsistências cedo
    // (mesmo que a primeira passagem de presets persista sem relações)
    this.schemaValidator.buildZodSchema(data.schema as unknown as ITableSchema);

    // Validate that every relation column's targetTable exists and belongs to this user.
    await this.validateRelationTargetOwnership(userId, data.schema as unknown as ITableSchema);

    return this.repository.createTable(userId, data);
  }

  private async _updateTable(tableId: string, data: UpdateDynamicTableDtoType): Promise<IDynamicTable> {
    return this.repository.updateTable(tableId, data);
  }

  private async _deleteTable(tableId: string): Promise<void> {
    const tableToDelete = await this.repository.findTableById(tableId);
    if (!tableToDelete) throw new NotFoundError('Table not found.');

    // Impede excluir tabela que é referenciada por outras (escopado ao dono da tabela)
    const refs = await this.repository.findTablesReferencingTableId(tableId, tableToDelete.userId);
    if (refs.length > 0) {
      const refNames = refs.map(r => r.name).join(', ');
      throw new ValidationError(`Não é possível excluir a tabela. Ela é referenciada por: ${refNames}`);
    }
    await this.repository.deleteTable(tableId);

    // Flag any relation columns in OTHER tables that pointed to the now-deleted tableId.
    // This is a best-effort sweep: we load all tables for the owner and mark stale refs.
    await this.markBrokenRelationColumns(tableToDelete.userId, tableId).catch(err =>
      logger.error('Error marking broken relation columns after table deletion', { tableId, ...errorContext(err) })
    );
  }

  /**
   * After a table is deleted, scan all surviving tables owned by the same user and set
   * `relation.broken = true` on every column whose `targetTable` matches the deleted tableId.
   * This prevents silent data corruption: the schema remains intact but callers can detect
   * and surface the broken reference to users.
   */
  private async markBrokenRelationColumns(userId: string, deletedTableId: string): Promise<void> {
    const allTables = await this.repository.findTablesByUserId(userId);
    for (const table of allTables) {
      const schema = table.schema as unknown as ITableSchema;
      if (!schema?.fields) continue;

      let dirty = false;
      for (const field of schema.fields) {
        if (
          field.type === 'relation' &&
          field.relation?.targetTable === deletedTableId &&
          !field.relation?.broken
        ) {
          if (field.relation) field.relation.broken = true;
          dirty = true;
        }
      }

      if (dirty) {
        await this.repository.updateTableSchema(table.id, { schema }).catch(err =>
          logger.error('Error persisting broken-relation flag', { tableId: table.id, ...errorContext(err) })
        );
      }
    }
  }

  /**
   * Resolve preset relation markers (@@PRESET_TABLE_KEY::...) to concrete table IDs
   * using the provided presetKey→tableId map. Returns a deep-cloned schema.
   */
  private resolvePresetRelations(schema: ITableSchema, presetKeyToTableIdMap: Map<string, string>): ITableSchema {
    const resolved: ITableSchema = JSON.parse(JSON.stringify(schema));
    if (!Array.isArray(resolved.fields)) return resolved;
    for (const field of resolved.fields) {
      if (field.type === 'relation' && field.relation?.targetTable) {
        const tgt = field.relation.targetTable as unknown as string;
        if (typeof tgt === 'string' && tgt.startsWith(PRESET_TABLE_KEY_PREFIX)) {
          const targetKey = tgt.replace(PRESET_TABLE_KEY_PREFIX, '');
          const targetId = presetKeyToTableIdMap.get(targetKey);
          if (!targetId) {
            throw new ValidationError(`Não foi possível resolver a relação do campo '${field.name}' para a tabela '${targetKey}'.`);
          }
          if (field.relation) field.relation.targetTable = String(targetId);
        }
      }
    }
    return resolved;
  }

  // --- System-Facing Methods (Bypass Policy) ---

  /**
   * Creates a table as a system process, bypassing user policies.
   * This should only be called by trusted, internal server processes.
   * @param userId The ID of the user to associate the table with.
   * @param data The data for the new table.
   */
  public async createTableAsSystem(userId: string, data: CreateDynamicTableDtoType): Promise<IDynamicTable> {
    return this._createTable(userId, data);
  }

  /**
   * Updates a table's schema as a system process, bypassing user policies.
   * @param tableId The ID of the table to update.
   * @param data The new schema data.
   */
  public async updateTableSchemaAsSystem(tableId: string, data: UpdateDynamicTableSchemaDtoType, revalidateMode: 'full' | 'partial' | 'none' = 'full'): Promise<IDynamicTable> {
    const tableExists = await this.repository.findTableById(tableId);
    if (!tableExists) {
      throw new NotFoundError('Table not found.');
    }
    // 1) Validar nomes duplicados e schema DTO completo
    this.assertNoDuplicateFieldNames(data.schema);
    // 2) Validar schema via buildZodSchema
    this.schemaValidator.buildZodSchema(data.schema);
    // 2.1) Verify that relation columns point to existing tables owned by the same user.
    // Preset markers are not permitted in updateTableSchema operations.
    for (const field of data.schema.fields) {
      if (field.type === 'relation' && field.relation?.targetTable) {
        const target = field.relation.targetTable;
        if (typeof target === 'string' && target.startsWith(PRESET_TABLE_KEY_PREFIX)) {
          throw new ValidationError(`Relação inválida em schema update: marcador de preset não é permitido nesta operação (${field.name}).`);
        }
      }
    }
    await this.validateRelationTargetOwnership(tableExists.userId, data.schema);
    // 3) Revalidar dados existentes contra o novo schema e bloquear se inválidos.
    // - 'full' (default): valida cada linha por completo (obrigatórios presentes + valores válidos).
    // - 'partial': valida só os VALORES PRESENTES (não exige obrigatórios) — útil quando há dados stale.
    // - 'none': pula a revalidação por linha. Usado APENAS por callers que provam que a mudança é
    //   puramente aditiva (superset: nenhum campo/opção removido, nenhum obrigatório novo) — uma mudança
    //   aditiva nunca invalida um valor já presente, então não deve ser bloqueada por dados pré-existentes
    //   malformados (ex.: seed com obrigatório nulo) alheios à mudança. Ver PresetSyncService.
    if (revalidateMode !== 'none') {
      const existingData = await this.repository.findAllDataByTableId(tableId);
      for (const row of existingData) {
        try {
          this.schemaValidator.validateDataAgainstSchema(row.data as Record<string, unknown>, data.schema as unknown as ITableSchema, revalidateMode === 'partial');
        } catch {
          throw new ValidationError('Schema update would invalidate existing data. Aborting update.', { dataId: row.id });
        }
      }
    }
    return this.repository.updateTableSchema(tableId, data);
  }

  public async updateTableAsSystem(tableId: string, data: UpdateDynamicTableDtoType): Promise<IDynamicTable> {
    const tableExists = await this.repository.findTableById(tableId);
    if (!tableExists) {
      throw new NotFoundError('Table not found.');
    }
    return this._updateTable(tableId, data);
  }

  /**
   * Installs a suite of tables from a preset as a system process.
   * Resolves relationships between tables during creation.
   *
   * This function is one-shot: the caller (dashboardController) checks whether the user
   * already has tables and returns 403 if so, preventing double-installation.
   * The entire 3-pass write runs in a single repository transaction so that any
   * failure mid-install rolls back ALL partial table creation automatically — the ERP
   * is never left in a half-installed state. The input `preset` is never mutated.
   *
   * @param userId The ID of the user to associate the tables with.
   * @param preset The preset object containing table definitions.
   */
  public async installPresetAsSystem(userId: string, preset: { tables: Record<string, { name: string; category: DynamicTableCategory; schema: ITableSchema }> }) {
    // ── Pre-flight validation (pure in-memory — no DB writes) ──────────────────
    // Working copy: optional relation fields into unselected modules are dropped HERE, never on the
    // caller's (possibly shared) preset object.
    const tables: Record<string, PresetTableDefinition> = { ...preset.tables };
    const tableKeys = Object.keys(tables);
    // Nova validação baseada em metadados de preset (requires/excludes/capabilities)
    // Recolhe capacidades fornecidas e requeridas e também coerções entre tabelas
    const provides = new Set<string>();
    const requires = new Map<string, string[]>();
    const requiresTables = new Map<string, string[]>();
    const excludesTables = new Map<string, string[]>();

    for (const key of tableKeys) {
      const def: PresetTableDefinition = tables[key];
      const meta = def?.meta || {};
      (meta.providesCapabilities || []).forEach((c: string) => provides.add(c));
      if (Array.isArray(meta.requiresCapabilities) && meta.requiresCapabilities.length > 0) {
        requires.set(key, meta.requiresCapabilities);
      }
      if (Array.isArray(meta.requiresTables) && meta.requiresTables.length > 0) {
        requiresTables.set(key, meta.requiresTables);
      }
      if (Array.isArray(meta.excludesTables) && meta.excludesTables.length > 0) {
        excludesTables.set(key, meta.excludesTables);
      }
    }

    // Checa capacidades requeridas
    for (const [key, reqCaps] of requires.entries()) {
      const missing = reqCaps.filter(c => !provides.has(c));
      if (missing.length > 0) {
        throw new ValidationError(`Preset inválido: a tabela '${key}' requer capacidades ausentes: ${missing.join(', ')}`);
      }
    }

    // Checa requiresTables
    for (const [key, reqTables] of requiresTables.entries()) {
      const missing = reqTables.filter(tk => !tables[tk]);
      if (missing.length > 0) {
        throw new ValidationError(`Preset inválido: a tabela '${key}' requer as tabelas: ${missing.join(', ')}`);
      }
    }

    // Checa excludesTables
    for (const [key, exclTables] of excludesTables.entries()) {
      const conflicts = exclTables.filter(tk => !!tables[tk]);
      if (conflicts.length > 0) {
        throw new ValidationError(`Preset inválido: a tabela '${key}' não pode coexistir com: ${conflicts.join(', ')}`);
      }
    }
    for (const key of tableKeys) {
      let tableDef = tables[key];
      if (!tableDef?.schema || !Array.isArray(tableDef.schema.fields)) {
        throw new ValidationError(`Tabela do preset inválida: '${key}' sem schema.fields`);
      }

      // Drop OPTIONAL relation fields whose preset target table wasn't selected (e.g.
      // leads.accountId → crmAccounts installed without the CRM module). A required
      // relation into a missing table is still a hard preset error below.
      const filteredFields = tableDef.schema.fields.filter(field => {
        if (field.type === 'relation' && field.relation?.targetTable && !field.required) {
          const target = field.relation.targetTable;
          if (typeof target === 'string' && target.startsWith(PRESET_TABLE_KEY_PREFIX)) {
            const targetKey = target.replace(PRESET_TABLE_KEY_PREFIX, '');
            if (!tables[targetKey]) return false;
          }
        }
        return true;
      });
      if (filteredFields.length !== tableDef.schema.fields.length) {
        // Reassign in the working copy — never mutate the shared preset module singleton's schema.
        tableDef = { ...tableDef, schema: { ...tableDef.schema, fields: filteredFields } };
        tables[key] = tableDef;
      }

      // Validate field name uniqueness (CPU-only — no DB access)
      const fieldNames = tableDef.schema.fields.map(f => f.name.trim().toLowerCase());
      if (new Set(fieldNames).size !== fieldNames.length) {
        throw new ValidationError(`Tabela do preset inválida: '${key}' contém nomes de campos duplicados.`);
      }
      for (const field of tableDef.schema.fields) {
        if (field.type === 'relation' && field.relation?.targetTable) {
          const target = field.relation.targetTable;
          if (!target.startsWith(PRESET_TABLE_KEY_PREFIX)) {
            throw new ValidationError(`Relação inválida em '${key}.${field.name}': targetTable precisa referenciar uma tabela do preset via @@PRESET_TABLE_KEY::targetKey`);
          }
          const targetKey = target.replace(PRESET_TABLE_KEY_PREFIX, '');
          if (!tables[targetKey]) {
            throw new ValidationError(`Relação inválida em '${key}.${field.name}': tabela alvo '${targetKey}' não existe no preset.`);
          }
        }
      }
    }

    // Resolve variant schemas before entering the transaction. Dynamic imports must not
    // run inside a SQLite transaction to avoid holding the connection lock during I/O.
    const hasStock = provides.has('inventory.stock');
    const hasServices = provides.has('services.catalog');
    const saleItemsKey = tableKeys.find(k => k === 'saleItems');
    let variantSchema: ITableSchema | null = null;
    if (saleItemsKey) {
      try {
        const { saleItemsProductsOnlyModule } = await import('../presets/modules/finance/SalesItemsProductsOnly');
        const { saleItemsServicesOnlyModule } = await import('../presets/modules/finance/SalesItemsServicesOnly');
        const { saleItemsMixedModule } = await import('../presets/modules/finance/SalesItemsMixed');
        if (hasStock && hasServices) variantSchema = saleItemsMixedModule.schema;
        else if (hasStock) variantSchema = saleItemsProductsOnlyModule.schema;
        else variantSchema = saleItemsServicesOnlyModule.schema;
      } catch (err) {
        logger.warn('installPresetAsSystem: saleItems variant unavailable — keeping the preset default schema', { userId, ...errorContext(err) });
      }
    }

    // ── Transactional 3-pass install ───────────────────────────────────────────
    // All DB writes go through the tx-bound repo so that a failure at any point causes a
    // full rollback — the ERP is never left in a half-installed state.
    await this.repository.runInTransaction(async (txRepo, tx) => {
      const presetKeyToTableIdMap = new Map<string, string>();
      const createdTables: { id: string; presetKey: string; originalSchema: ITableSchema }[] = [];

      // Pass 1: Create all tables with partial schemas (relation fields stripped).
      // Relations reference other tables by ID which are not yet known at this point.
      for (const presetKey of tableKeys) {
        const tableDefinition = tables[presetKey];
        const tempSchema: ITableSchema = {
          ...tableDefinition.schema,
          fields: tableDefinition.schema.fields.filter(f => f.type !== 'relation'),
        };

        const newTable = await txRepo.createTable(userId, {
          name: tableDefinition.name,
          category: tableDefinition.category,
          schema: tempSchema,
          internalName: presetKey,
        });

        presetKeyToTableIdMap.set(presetKey, newTable.id);
        createdTables.push({
          id: newTable.id,
          presetKey: presetKey,
          originalSchema: tableDefinition.schema,
        });
      }

      // Pass 2: Update every table with its full schema, resolving @@PRESET_TABLE_KEY::
      // markers to the concrete table IDs assigned in Pass 1.
      for (const table of createdTables) {
        const resolvedSchema = this.resolvePresetRelations(table.originalSchema, presetKeyToTableIdMap);
        await txRepo.updateTableSchema(table.id, { schema: resolvedSchema });
      }

      // Pass 3: Swap saleItems schema for the variant that matches the preset's
      // capabilities (products-only / services-only / mixed).
      if (saleItemsKey && variantSchema) {
        const saleItemsTableId = presetKeyToTableIdMap.get('saleItems');
        if (saleItemsTableId) {
          const resolvedVariantSchema = this.resolvePresetRelations(variantSchema, presetKeyToTableIdMap);
          await txRepo.updateTableSchema(saleItemsTableId, { schema: resolvedVariantSchema });
        }
      }

      // T0 do time-to-first-ECD (P2 comportamento 11; ADR-P2 EMENDA 2026-09-14 R7, F-I2-1 → a): o marco
      // nasce NA MESMA tx do install — se o install reverte, o T0 reverte junto. Única escrita liberada
      // pela exceção nominal da prova zero-diff (`proveP2ZeroDiffCli.SYMBOL_ALLOWLIST`); não cresça isto.
      // F-I7-3 (BE-INCR-RESET-CONSISTENTE item 6): preserva o 1º T0 — reinstalar depois do reset não o sobrescreve.
      await tx.user.updateMany({ where: { id: userId, onboardingCompletedAt: null }, data: { onboardingCompletedAt: new Date() } });
    }, {
      // Preset installs can involve many tables; allow up to 30 s before timing out.
      timeout: 30000,
    });

    return { message: 'Preset installed successfully' };
  }

  public async deleteTableAsSystem(tableId: string): Promise<void> {
    const tableExists = await this.repository.findTableById(tableId);
    if (!tableExists) {
      throw new NotFoundError('Table not found.');
    }
    await this._deleteTable(tableId);
  }

  // --- User-Facing Methods (Policy-Enforced) ---

  /**
   * [USER-FACING] Attempts to create a table. This action is blocked by policy
   * for all users and will always throw a ForbiddenError.
   */
  async createTable(user: UserContext, data: CreateDynamicTableDtoType) {
    if (!this.policy.canCreate(user)) {
      throw new ForbiddenError('You do not have permission to create tables.');
    }
    // This part is now unreachable for regular users but kept for architectural integrity.
    return this._createTable(user.userId, data);
  }

  async getTableById(user: UserContext, tableId: string) {
    let table = await this.repository.findTableById(tableId);

    // If not found by ID, try finding by Name (slug) as a fallback for the AI Agent
    if (!table) {
      table = await this.repository.findTableByName(user.userId, tableId);
    }

    if (!table) throw new NotFoundError('Table not found.');
    if (!this.policy.canView(user, table)) {
      throw new ForbiddenError('You do not have permission to view this table.');
    }
    return table;
  }

  async getTablesForUser(userId: string) {
    return this.repository.findTablesByUserId(userId);
  }

  /**
   * [USER-FACING] Attempts to update a table. This action is blocked by policy
   * for all users and will always throw a ForbiddenError.
   */
  async updateTable(user: UserContext, tableId: string, data: UpdateDynamicTableDtoType) {
    const table = await this.getTableById(user, tableId); // Re-uses permission check
    if (!this.policy.canUpdate(user, table)) {
      throw new ForbiddenError('You do not have permission to update this table.');
    }
    // This part is now unreachable for regular users.
    return this._updateTable(tableId, data);
  }

  /**
   * [USER-FACING] Attempts to delete a table. This action is blocked by policy
   * for all users and will always throw a ForbiddenError.
   */
  async deleteTable(user: UserContext, tableId: string) {
    const table = await this.getTableById(user, tableId); // Re-uses permission check
    if (!this.policy.canDelete(user, table)) {
      throw new ForbiddenError('You do not have permission to delete this table.');
    }
    // This part is now unreachable for regular users.
    await this._deleteTable(tableId);
  }

  async createTableData(user: UserContext, tableId: string, dataDto: CreateDynamicTableDataDtoType, options?: { isSystem?: boolean; tx?: Prisma.TransactionClient }) {
    const table = await this.getTableById(user, tableId);
    if (!this.policy.canManageData(user, table)) {
      throw new ForbiddenError('You do not have permission to add data to this table.');
    }
    const schema = table.schema as unknown as ITableSchema;
    // When composing an atomic multi-write (options.tx), run validations against the SAME
    // tx-bound repo so a write can validate against rows created earlier in the same tx
    // (e.g. CRM lead conversion: contact references an account created moments ago in-tx).
    // When no tx is supplied, fall back to the committed-state repository (default behavior).
    const validationRepo = this.repoFor(options?.tx);
    // Guard: ensure every relation column's targetTable exists and belongs to this user.
    // This prevents a malicious client from probing or inserting data into cross-user tables.
    await this.validateRelationTargetOwnership(table.userId, schema, validationRepo);
    // isSystem is derived from the call context only — never from the client payload.
    // Strip __isSystem from the data before validation to ensure it is never stored.
    const isSystem = !!(options?.isSystem);
    const sanitizedData = { ...(dataDto.data as Record<string, unknown>) };
    delete sanitizedData.__isSystem;
    // BE-INCR-DT-VERSION-LEDGER (F-DTV-1 a): a escrita pedida é DIRECT; o que os plugins escrevem é RULE.
    const versionCtx: VersionWriteContext = { actorUserId: user.userId, origin: 'DIRECT' };
    const ruleCtx = ruleContextOf(versionCtx);
    const validatedData = this.schemaValidator.validateDataAgainstSchema(sanitizedData, schema);
    await this.governance.validateAdvancedRules(table, validatedData, validationRepo);
    await this.governance.enforceNoOverlap(table, schema, validatedData, isSystem, validationRepo);
    // Rules: beforeCreate (validation-focused; runs outside transaction to avoid long locks)
    await this.runRules({ userId: table.userId, table, schema, operation: 'create', before: null, after: validatedData, repository: withVersionContext(validationRepo, ruleCtx), isSystem }, 'beforeCreate');

    // Wrap the main write + afterCreate side-effects in a single transaction so that
    // a plugin failure (e.g. SalesPlugin stock update) rolls back the record creation.
    const writeCreate = async (repo: IDynamicTableRepository) => {
      const txRepo = withVersionContext(repo, versionCtx);
      // Gate autoritativo dentro da tx — padrão da casa `authoritative-gate-inside-tx`, o mesmo que o
      // razão usa ao postar um lançamento. (O serviço do razão não é nomeado aqui de propósito: o guard
      // de fronteira §2.1 proíbe o token dentro do motor, inclusive em comentário.)
      // A checagem lá em cima é PREFLIGHT (falha cedo, mensagem amigável) e é read-then-write: N pedidos
      // que leiam antes do primeiro commit leem todos count=0. Não existe exclusion-constraint no SQLite,
      // então a última palavra tem de ser esta re-contagem com o repo tx-bound, logo antes do insert.
      await this.governance.enforceNoOverlap(table, schema, validatedData, isSystem, txRepo);
      await this.governance.validateAdvancedRules(table, validatedData, txRepo);
      const record = await txRepo.createData(tableId, validatedData);
      // Include created id in 'after' context so plugins can reference the new entry
      const afterWithId = { ...validatedData, id: record.id };
      await this.runRules({ userId: table.userId, table, schema, operation: 'create', before: null, after: afterWithId, repository: withVersionContext(txRepo, ruleCtx), isSystem }, 'afterCreate');
      return record;
    };
    // Reuse the caller's transaction when composing an atomic multi-write (options.tx); otherwise open our own.
    const created = options?.tx
      ? await writeCreate(validationRepo)
      : await this.runSerializedIfNoOverlap(table, isSystem, () => this.repository.runInTransaction(repo => writeCreate(repo)));

    return created;
  }

  /**
   * Run a callback inside a single repository transaction. Pass the provided `tx`
   * into createTableData/updateTableData via `options.tx` so multiple writes
   * compose atomically (all-or-nothing) — used by orchestration services to
   * avoid app-level compensation.
   *
   * TX-AWARE VALIDATIONS: when `options.tx` is supplied, the create/update
   * VALIDATIONS (relation existence/ownership, advanced rules — uniqueness,
   * relation targets, compositeUnique — overlap, and beforeX plugins) run against
   * the SAME tx-bound repository. Composed writes CAN therefore reference rows
   * created earlier in the same transaction: e.g. CRM lead conversion creates an
   * account and then a contact whose relation field points at that just-created
   * account — the relation-existence check now sees the in-tx account and passes.
   * Without `options.tx`, validations run against committed state via
   * `this.repository` (unchanged default behavior).
   */
  public async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.repository.runInTransaction((_repo, tx) => fn(tx));
  }

  public async getTableData(user: UserContext, tableId: string, page: number = 1, limit: number = 50): Promise<{ data: IDynamicTableData[]; total: number; page: number; limit: number; totalPages: number }> {
    await this.getTableById(user, tableId);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const safePage = Math.max(1, page);
    const { data, total } = await this.repository.findDataByTableId(tableId, safePage, safeLimit);
    return { data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  /** Internal unbounded fetch — used by analytics and AI services that need all rows. */
  public async getAllTableData(user: UserContext, tableId: string): Promise<IDynamicTableData[]> {
    await this.getTableById(user, tableId);
    return this.repository.findAllDataByTableId(tableId);
  }

  public async *getTableDataStream(user: UserContext, tableId: string, batchSize: number = 1000) {
    await this.getTableById(user, tableId);
    yield* this.repository.findDataBatchStreamByTableId(tableId, batchSize);
  }

  /**
   * Busca por igualdade exata em campos do schema, empurrada para o SQL (BRIEF BE-INCR-CHAT-AGENT
   * §2.2, F-I11-2 → b). As chaves de `filters` vêm de fora (o LLM do agente): toda chave tem de ser
   * campo do schema e todo valor escalar, senão ValidationError. `limit` preso em 1..50.
   * F-DT-1 → (b) (dono, questionário, 2026-10-16): antes de comparar, o valor é convertido para o tipo
   * declarado do campo (`coerceFilterValue`) — o modelo errar o tipo vira acerto ou ValidationError, nunca
   * "zero linhas" silencioso. A comparação no SQL continua tipada.
   */
  public async searchTableData(
    user: UserContext,
    tableId: string,
    filters: Record<string, unknown> | undefined,
    limit: number = 10,
  ): Promise<{ rows: IDynamicTableData[]; total: number; limit: number }> {
    const table = await this.getTableById(user, tableId);
    const fields = table.schema?.fields ?? [];
    const fieldNames = fields.map(f => f.name);
    const equals: FieldEquals[] = [];
    for (const [name, value] of Object.entries(filters ?? {})) {
      const field = fields.find(f => f.name === name);
      if (!field) {
        throw new ValidationError(`Campo de filtro inválido: '${name}'. Campos válidos: ${fieldNames.join(', ')}.`);
      }
      const scalar = value === null || typeof value === 'string' || typeof value === 'boolean'
        || (typeof value === 'number' && Number.isFinite(value));
      if (!scalar) {
        throw new ValidationError(`Valor de filtro inválido no campo '${name}': use texto, número, booleano ou null.`);
      }
      equals.push({ name, value: coerceFilterValue(field.type, name, value as FieldEquals['value']) });
    }
    const safeLimit = Math.min(Math.max(1, Math.trunc(limit) || 1), 50);
    const { rows, total } = await this.repository.findDataByFieldEquals(table.id, equals, safeLimit);
    return { rows, total, limit: safeLimit };
  }

  public async getTableDataByIds(user: UserContext, tableId: string, recordIds: string[]) {
    await this.getTableById(user, tableId);
    // Find records and ensure they belong to the requested table for security
    const records = await this.repository.findDataByIds(recordIds);
    return records.filter(row => row.dynamicTableId === tableId);
  }

  async resolveRelations(user: UserContext, lookups: { tableId: string, recordIds: string[], displayField?: string }[]) {
    const results: Record<string, Record<string, string>> = {};

    for (const lookup of lookups) {
      if (!lookup.recordIds || lookup.recordIds.length === 0) continue;

      try {
        const table = await this.getTableById(user, lookup.tableId);
        // Tier-0 (fork fix, T0.1): findDataByIds resolves rows by id globally, so we MUST restrict
        // the result to the authorized table. Otherwise a caller could pass their own (authorized)
        // tableId plus recordIds belonging to another tenant's table and read back display labels.
        const data = (await this.repository.findDataByIds(lookup.recordIds))
          .filter(row => row.dynamicTableId === lookup.tableId);

        let displayField = lookup.displayField;
        if (!displayField) {
          const schema = table.schema as unknown as ITableSchema;
          if (schema?.defaultDisplayField) {
            displayField = schema.defaultDisplayField;
          } else {
            const nameField = schema?.fields?.find(f => /name|title|nome|titulo|fantasyName|companyName/i.test(f.name));
            displayField = nameField ? nameField.name : undefined;
          }
        }

        const tableResults: Record<string, string> = {};
        for (const row of data) {
          const rowData = row.data as Record<string, unknown>;
          if (displayField && rowData[displayField] !== undefined) {
            tableResults[row.id] = String(rowData[displayField]);
          } else {
            // Fallback: pick the first string field, or just return ID
            const firstStringKey = Object.keys(rowData).find(k => typeof rowData[k] === 'string');
            tableResults[row.id] = firstStringKey ? String(rowData[firstStringKey]) : String(row.id);
          }
        }

        results[lookup.tableId] = tableResults;
      } catch (error) {
        // Se falhar (ex: sem permissão), ignora e continua
        logger.warn('Failed to resolve relations for table', { tableId: lookup.tableId, ...errorContext(error) });
      }
    }

    return results;
  }

  /**
   * `options.restoredFromVersion` (BE-INCR-DT-VERSION-LEDGER item 14): só o restore passa — a versão que esta
   * escrita grava vira `RESTORE` apontando para a versão de origem. Plugins seguem gravando `RULE`.
   */
  async updateTableData(user: UserContext, dataId: string, dataDto: UpdateDynamicTableDataDtoType, options?: { isSystem?: boolean; tx?: Prisma.TransactionClient; restoredFromVersion?: number }) {
    const table = await this.findTableForData(user, dataId);
    if (!this.policy.canManageData(user, table)) {
      throw new ForbiddenError('You do not have permission to update data in this table.');
    }
    // When composing an atomic multi-write (options.tx), run validations against the SAME
    // tx-bound repo so this update can validate against rows created earlier in the same tx
    // (e.g. lead conversion's lead update references a contact created moments ago in-tx).
    // When no tx is supplied, fall back to the committed-state repository (default behavior).
    const validationRepo = this.repoFor(options?.tx);
    const schema = table.schema as unknown as ITableSchema;
    // Guard: ensure every relation column's targetTable exists and belongs to this user.
    await this.validateRelationTargetOwnership(table.userId, schema, validationRepo);
    // isSystem is derived from the call context only — never from the client payload.
    // Strip __isSystem from the data before validation to ensure it is never stored.
    const isSystem = !!(options?.isSystem);
    const incoming = { ...(dataDto.data as Record<string, unknown>) };
    delete incoming.__isSystem;
    const versionCtx: VersionWriteContext = { actorUserId: user.userId, origin: 'DIRECT', restoredFromVersion: options?.restoredFromVersion };
    const ruleCtx = ruleContextOf(versionCtx);

    // --- Guard 1: readOnly fields ---
    if (!isSystem) this.governance.assertReadOnly(schema, incoming);

    const validatedData = this.schemaValidator.validateDataAgainstSchema(incoming, schema, true);
    const existingData = await this.repository.findDataById(dataId);
    if (!existingData) throw new NotFoundError('Data entry not found.');

    const currentData = existingData.data as Record<string, unknown>;
    const mergedData: Record<string, unknown> = { ...currentData, ...validatedData };

    // --- Guard 2: immutableAfter rules · Guard 3: lifecycle transitions (status state machine) ---
    if (!isSystem) {
      this.governance.assertImmutableAfter(schema, currentData, incoming);
      this.governance.assertLifecycle(schema, currentData, mergedData);
    }

    await this.governance.validateAdvancedRules(table, mergedData, validationRepo, dataId);
    await this.governance.enforceNoOverlap(table, schema, mergedData, isSystem, validationRepo, dataId);

    // Rules: beforeUpdate runs outside the transaction (validation-focused, avoids long locks).
    // afterWithId is intentionally mutable: plugins that write to ctx.after (e.g. GoalsPlugin,
    // LeadsPlugin computing derived fields) will have their changes persisted because we extract
    // the clean data object from afterWithId (minus id) before calling updateData.
    const beforeWithId = { ...currentData, id: dataId };
    const afterWithId = { ...mergedData, id: dataId };
    await this.runRules({ userId: table.userId, table, schema, operation: 'update', before: beforeWithId, after: afterWithId, repository: withVersionContext(validationRepo, ruleCtx), isSystem }, 'beforeUpdate');

    // Wrap the main write + afterUpdate side-effects in a single transaction so that
    // a plugin failure (e.g. SalesPlugin stock/commission update) rolls back the record update.
    const writeUpdate = async (repo: IDynamicTableRepository) => {
      const txRepo = withVersionContext(repo, versionCtx);
      // Gate autoritativo dentro da tx — mesmo motivo do createTableData: a checagem acima é
      // preflight; a re-contagem tx-bound (com excludeId, para a linha não colidir consigo mesma)
      // é o que fecha a janela read-then-write de um reagendamento concorrente.
      await this.governance.enforceNoOverlap(table, schema, mergedData, isSystem, txRepo, dataId);
      await this.governance.validateAdvancedRules(table, mergedData, txRepo, dataId);
      // Extract the (possibly mutated) data from afterWithId, stripping the synthetic id field.
      const { id: _afterId, ...persistedData } = afterWithId;
      const record = await txRepo.updateData(dataId, persistedData);
      await this.runRules({ userId: table.userId, table, schema, operation: 'update', before: beforeWithId, after: afterWithId, repository: withVersionContext(txRepo, ruleCtx), isSystem }, 'afterUpdate');
      return record;
    };
    // Reuse the caller's transaction when composing an atomic multi-write (options.tx); otherwise open our own.
    const updated = options?.tx
      ? await writeUpdate(validationRepo)
      : await this.runSerializedIfNoOverlap(table, isSystem, () => this.repository.runInTransaction(repo => writeUpdate(repo)));

    return updated;
  }

  /**
   * Regras de delete de UMA linha, compartilhadas pelo delete individual e pelo lote: immutableAfter
   * scope:'all' na linha, deleteConstraints (RESTRICT/RESTRICT_IF_AGGREGATE lançam) e, para CASCADE,
   * a imutabilidade de cada filha. Devolve as filhas que o CASCADE deve apagar. Roda SEMPRE com o
   * repositório da tx do delete (GAP-MAP 8 TOCTOU, 2026-10-19): a linha que a guarda lê é a que o
   * soft delete vai escrever, no mesmo snapshot.
   */
  private async checkDeleteRules(table: IDynamicTable, dataId: string, repo: IDynamicTableRepository): Promise<{ tableId: string, dataId: string }[]> {
    const parentSchema = table.schema as unknown as ITableSchema;
    const constraints = parentSchema.deleteConstraints || [];
    const cascadeIds: { tableId: string, dataId: string }[] = [];

    // GAP-MAP 8, fork (a) (dono 2026-09-26): a linha que immutableAfter scope:'all' torna imutável
    // no update também não pode ser apagada. Regras de lista de campos seguem permitindo o delete.
    const target = await repo.findDataById(dataId);
    this.governance.assertNotImmutableForDelete(parentSchema, target?.data as Record<string, unknown> | undefined);

    // Verify references to this record in other tables (relation fields)
    const allTables = await repo.findTablesByUserId(table.userId);
    for (const t of allTables) {
      const schema = t.schema as unknown as ITableSchema;
      if (!schema?.fields) continue;

      // Only process tables that have relation fields pointing to the current table
      const relationFields = schema.fields.filter(
        f => f.type === 'relation' && f.relation?.targetTable === table.id
      );
      if (relationFields.length === 0) continue;

      // Query only rows that actually reference this dataId — no full table scan
      const referencingRows: IDynamicTableData[] = [];
      for (const field of relationFields) {
        const rows = await repo.findRowsReferencingId(t.id, field.name, dataId);
        for (const row of rows) {
          if (!referencingRows.find(r => r.id === row.id)) referencingRows.push(row);
        }
      }
      if (referencingRows.length === 0) continue;

      const tableConstraints = constraints.filter(c => {
        const rawTarget = c.targetTable.replace(PRESET_TABLE_KEY_PREFIX, '');
        return rawTarget === t.internalName || rawTarget === t.id;
      });

      if (tableConstraints.length === 0) {
        // Default behavior: RESTRICT
        throw new ValidationError(`Cannot delete the record. It is referenced by data in table '${t.name}'.`);
      }

      for (const constraint of tableConstraints) {
        if (constraint.type === 'IGNORE') continue;
        if (constraint.type === 'RESTRICT') {
          throw new ValidationError(constraint.errorMessage ?? `Cannot delete the record referenced by '${t.name}'.`);
        }
        if (constraint.type === 'RESTRICT_IF_AGGREGATE' && constraint.aggregate) {
          let aggregateValue = 0;
          for (const row of referencingRows) {
            const val = Number((row.data as Record<string, unknown>)?.[constraint.aggregate.field]) || 0;
            aggregateValue += val;
          }
          let shouldRestrict = false;
          switch (constraint.aggregate.operator) {
            case 'gt': shouldRestrict = aggregateValue > constraint.aggregate.value; break;
            case 'lt': shouldRestrict = aggregateValue < constraint.aggregate.value; break;
            case 'eq': shouldRestrict = aggregateValue === constraint.aggregate.value; break;
            case 'neq': shouldRestrict = aggregateValue !== constraint.aggregate.value; break;
          }
          if (shouldRestrict) {
            throw new ValidationError(constraint.errorMessage ?? `Restrict condition failed for table '${t.name}'.`);
          }
        }
        if (constraint.type === 'CASCADE') {
          for (const row of referencingRows) {
            // ...nem apagada por CASCADE do pai (mesma decisão).
            this.governance.assertNotImmutableForDelete(schema, row.data as Record<string, unknown>);
            cascadeIds.push({ tableId: t.id, dataId: row.id });
          }
        }
      }
    }
    return cascadeIds;
  }

  async deleteTableData(user: UserContext, dataId: string) {
    const table = await this.findTableForData(user, dataId);
    if (!this.policy.canManageData(user, table)) {
      throw new ForbiddenError('You do not have permission to delete data from this table.');
    }
    const schema = table.schema as unknown as ITableSchema;

    // The delete rules, beforeDelete, the soft delete, the cascade and afterDelete all run in ONE
    // transaction with the tx-bound repository: a failure rolls everything back, and the row the
    // guards read is the row the delete writes (no read-outside/write-inside window).
    const versionCtx: VersionWriteContext = { actorUserId: user.userId, origin: 'DIRECT' };
    await this.repository.runInTransaction(async (repo) => {
      const txRepo = withVersionContext(repo, versionCtx);
      const ruleRepo = withVersionContext(txRepo, ruleContextOf(versionCtx));
      const cascadeIds = await this.checkDeleteRules(table, dataId, txRepo);
      const existing = await txRepo.findDataById(dataId);
      const before = (existing?.data ?? null) as Record<string, unknown> | null;
      await this.runRules({ userId: table.userId, table, schema, operation: 'delete', before, after: null, repository: ruleRepo }, 'beforeDelete');

      await txRepo.deleteData(dataId);

      // Execute cascade soft deletes (within the same transaction)
      for (const cascade of cascadeIds) {
        await txRepo.deleteData(cascade.dataId);
      }

      await this.runRules({ userId: table.userId, table, schema, operation: 'delete', before, after: null, repository: ruleRepo }, 'afterDelete');
    });

  }

  /**
   * Atomically soft-deletes multiple rows of a single table. Every id must resolve
   * to a row that belongs to `tableId` AND to a table the caller can manage; any id
   * that is missing, in another table, or cross-tenant throws NotFoundError so the
   * entire transaction rolls back (all-or-nothing). The size cap (200) is enforced
   * by the controller. Returns the count deleted.
   *
   * Applies, per row, the same rules as deleteTableData (checkDeleteRules: immutableAfter,
   * RESTRICT, CASCADE + child immutability; beforeDelete/afterDelete hooks), all inside the
   * shared transaction: every row is checked before any hook or write, and beforeDelete runs
   * with the tx repository, so a refused row leaves no delete and no hook effect behind.
   *
   * @param user - Authenticated user context
   * @param tableId - The table all ids must belong to
   * @param ids - Row ids to delete (1..200, validated upstream)
   * @returns { deleted } — number of rows soft-deleted
   */
  async deleteTableDataBatch(
    user: UserContext,
    tableId: string,
    ids: string[]
  ): Promise<{ deleted: number }> {
    // Resolve + authorize the target table once (canManageData) before opening the tx.
    const table = await this.getTableById(user, tableId);
    if (!this.policy.canManageData(user, table)) {
      throw new ForbiddenError('You do not have permission to delete data from this table.');
    }
    const schema = table.schema as unknown as ITableSchema;

    // Dedupe to avoid double-counting / redundant writes within the batch.
    const uniqueIds = Array.from(new Set(ids));

    let deleted = 0;
    const versionCtx: VersionWriteContext = { actorUserId: user.userId, origin: 'DIRECT' };
    await this.repository.runInTransaction(async (repo) => {
      const txRepo = withVersionContext(repo, versionCtx);
      const ruleRepo = withVersionContext(txRepo, ruleContextOf(versionCtx));
      const cascadeIds = new Set<string>();
      for (const dataId of uniqueIds) {
        // Resolve the row's parent table inside the tx. A missing/soft-deleted row,
        // a row in another table, or a row owned by another user is reported as
        // NotFound (no cross-tenant enumeration leak) → rolls back the whole batch.
        const rowTable = await txRepo.findTableByDataId(dataId);
        if (!rowTable || rowTable.id !== tableId || rowTable.userId !== table.userId) {
          throw new NotFoundError('One or more rows do not exist in the requested table.');
        }
        for (const c of await this.checkDeleteRules(table, dataId, txRepo)) cascadeIds.add(c.dataId);
      }
      const befores = new Map<string, Record<string, unknown> | null>();
      for (const dataId of uniqueIds) {
        const before = ((await txRepo.findDataById(dataId))?.data ?? null) as Record<string, unknown> | null;
        befores.set(dataId, before);
        await this.runRules({ userId: table.userId, table, schema, operation: 'delete', before, after: null, repository: ruleRepo }, 'beforeDelete');
      }
      for (const dataId of uniqueIds) {
        await txRepo.deleteData(dataId);
        deleted++;
      }
      for (const cascadeId of cascadeIds) {
        await txRepo.deleteData(cascadeId);
      }
      for (const dataId of uniqueIds) {
        await this.runRules({ userId: table.userId, table, schema, operation: 'delete', before: befores.get(dataId) ?? null, after: null, repository: ruleRepo }, 'afterDelete');
      }
    });

    return { deleted };
  }

  public async deleteAllTablesForUser(userId: string): Promise<void> {
    const tables = await this.repository.findTablesByUserId(userId);
    if (tables.length === 0) return;

    // 1) Purga todos os dados primeiro para quebrar quaisquer dependências por conteúdo
    await this.repository.deleteAllDataByUserId(userId);

    // 2) Agora podemos remover as tabelas sem nos preocupar com ciclos de referências por dados
    // Ainda assim, removemos direto pelo repositório para evitar a checagem de referential integrity entre schemas
    await this.repository.deleteTablesByUserId(userId);
  }

  private async findTableForData(user: UserContext, dataId: string): Promise<IDynamicTable> {
    const table = await this.repository.findTableByDataId(dataId);
    if (!table) throw new NotFoundError('The requested data entry or its parent table does not exist.');
    if (!this.policy.canView(user, table)) {
      throw new ForbiddenError('You do not have permission to access data in this table.');
    }
    return table;
  }

  private async runRules(ctx: RuleContext, phase: 'beforeCreate' | 'afterCreate' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete') {
    const plugins = globalRuleRegistry.getApplicable(ctx);
    for (const p of plugins) {
      const fn = p[phase];
      if (typeof fn === 'function') {
        await fn.call(p, ctx);
      }
    }
  }

  /**
   * Enfileira a transação de escrita quando a tabela declara `noOverlap`, `unique` ou
   * `compositeUnique`, para que o gate autoritativo in-tx tenha o que enxergar: a tx do perdedor só
   * abre depois do commit do vencedor. Fora desse caso (tabela sem regra, ou escrita de sistema sem
   * unicidade — que `enforceNoOverlap` ignora) a escrita segue direto, sem custo nenhum.
   */
  private runSerializedIfNoOverlap<T>(table: IDynamicTable, isSystem: boolean, write: () => Promise<T>): Promise<T> {
    const schema = table.schema as unknown as ITableSchema;
    // `unique`/`compositeUnique` valem também para escrita de sistema (validateAdvancedRules não a isenta).
    const hasUnique = (schema?.compositeUnique ?? []).length > 0 || (schema?.fields ?? []).some(f => f.unique);
    const hasNoOverlap = !isSystem && (schema?.noOverlap ?? []).length > 0;
    if (!hasUnique && !hasNoOverlap) return write();
    return withTableWriteLock(table.id, write);
  }
}
