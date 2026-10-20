/**
 * O service nunca toca o Prisma nem instancia repositório: a transação é o seam do repositório
 * (`runInTransaction` / `withTransaction`) — Contrato §2 (R4 factory, R1 cadeia), memória
 * `orchestration-service-tx-repo-smell`. Correção de arquitetura 2026-10-19 (autorização do dono em chat).
 *
 * Dois testes-guarda, provados VERMELHOS antes da correção (sonda no estilo antigo, mock do prisma + do
 * `TransactionalDynamicTableRepository`):
 *   P3 `deleteTableData` lia as regras de delete (`findDataById`, `findTablesByUserId`, `findRowsReferencingId`)
 *      pelo repo RAIZ, fora da tx (GAP-MAP 8 TOCTOU, #390) — "Expected number of calls: 0 / Received: 1";
 *   P4 `compositeUnique` fazia varredura completa (`findAllDataByTableId`) em vez da contagem indexada
 *      `countByCompositeFieldValues` (dívida declarada em validation-and-governance.md §3) — idem.
 */
import { DynamicTableService } from '../DynamicTableService';
import type { IDynamicTableRepository } from '../../repositories/IDynamicTableRepository';
import type { IDynamicTablePolicy } from '../../policies/IDynamicTablePolicy';
import type { UserContext } from '../../../../lib/authUtils';
import { globalRuleRegistry } from '../../rules/RuleRegistry';

const user = { id: 'u1', userId: 'u1', role: 'USER' } as unknown as UserContext;
const policy = { canView: () => true, canManageData: () => true } as unknown as IDynamicTablePolicy;
const table = {
  id: 'tbl-1', userId: 'u1', name: 'T', category: 'other', internalName: null,
  schema: {
    fields: [
      { name: 'a', label: 'a', type: 'string', required: false },
      { name: 'b', label: 'b', type: 'string', required: false },
    ],
    compositeUnique: [{ fields: ['a', 'b'] }],
  },
};

/** Um repo raiz e um repo "da tx", distintos, para saber de qual lado cada leitura saiu. */
function build() {
  const txRepo = {
    findDataById: jest.fn(async () => ({ id: 'row-1', dynamicTableId: 'tbl-1', data: {} })),
    findTablesByUserId: jest.fn(async () => []),
    findRowsReferencingId: jest.fn(async () => []),
    deleteData: jest.fn(async () => {}),
    createData: jest.fn(async (_t: string, data: Record<string, unknown>) => ({ id: 'new', dynamicTableId: 'tbl-1', data })),
    countByFieldValue: jest.fn(async () => 0),
    countByCompositeFieldValues: jest.fn(async () => 0),
    countOverlaps: jest.fn(async () => 0),
    findAllDataByTableId: jest.fn(async () => []),
    existsByIdInTable: jest.fn(async () => true),
    findTableById: jest.fn(async () => null),
  };
  const root = {
    findTableById: jest.fn(async () => table),
    findTableByDataId: jest.fn(async () => table),
    findDataById: jest.fn(async () => ({ id: 'row-1', dynamicTableId: 'tbl-1', data: {} })),
    findTablesByUserId: jest.fn(async () => []),
    findRowsReferencingId: jest.fn(async () => []),
    findAllDataByTableId: jest.fn(async () => []),
    countByCompositeFieldValues: jest.fn(async () => 0),
    countByFieldValue: jest.fn(async () => 0),
    countOverlaps: jest.fn(async () => 0),
    existsByIdInTable: jest.fn(async () => true),
    withTransaction: jest.fn(() => txRepo),
    runInTransaction: jest.fn(async (fn: (repo: unknown, tx: unknown) => Promise<unknown>) => fn(txRepo, { __fakeTx: true })),
  };
  const svc = new DynamicTableService(root as unknown as IDynamicTableRepository, policy);
  return { svc, root, txRepo };
}

describe('DynamicTableService — a transação é o seam do repositório', () => {
  let savedPlugins: unknown[];
  beforeEach(() => {
    jest.clearAllMocks();
    savedPlugins = (globalRuleRegistry as unknown as { plugins: unknown[] }).plugins.slice();
    (globalRuleRegistry as unknown as { plugins: unknown[] }).plugins = [];
  });
  afterEach(() => { (globalRuleRegistry as unknown as { plugins: unknown[] }).plugins = savedPlugins; });

  it('P3: deleteTableData lê as regras de delete pelo repo da tx — nenhuma leitura de regra pelo repo raiz', async () => {
    const { svc, root, txRepo } = build();
    await svc.deleteTableData(user, 'row-1');
    expect(root.runInTransaction).toHaveBeenCalledTimes(1);
    expect(root.findTablesByUserId).not.toHaveBeenCalled();
    expect(root.findDataById).not.toHaveBeenCalled();
    expect(txRepo.findTablesByUserId).toHaveBeenCalledWith('u1');
    expect(txRepo.findDataById).toHaveBeenCalledWith('row-1');
    expect(txRepo.deleteData).toHaveBeenCalledWith('row-1');
  });

  it('P4: compositeUnique usa countByCompositeFieldValues (indexado) no preflight E no gate in-tx; nunca varredura', async () => {
    const { svc, root, txRepo } = build();
    await svc.createTableData(user, 'tbl-1', { data: { a: '1', b: '2' } });
    expect(root.findAllDataByTableId).not.toHaveBeenCalled();
    expect(txRepo.findAllDataByTableId).not.toHaveBeenCalled();
    expect(root.countByCompositeFieldValues).toHaveBeenCalledWith('tbl-1', [{ name: 'a', value: '1' }, { name: 'b', value: '2' }], undefined);
    expect(txRepo.countByCompositeFieldValues).toHaveBeenCalledWith('tbl-1', [{ name: 'a', value: '1' }, { name: 'b', value: '2' }], undefined);
  });

  it('o lock de escrita por tabela arma a tx pelo repositório (compositeUnique) — runInTransaction é o único abridor', async () => {
    const { svc, root, txRepo } = build();
    await svc.createTableData(user, 'tbl-1', { data: { a: 'x', b: 'y' } });
    expect(root.runInTransaction).toHaveBeenCalledTimes(1);
    expect(txRepo.createData).toHaveBeenCalledTimes(1);
  });

  it('runInTransaction(fn) público entrega o tx do repositório e options.tx reusa-o via withTransaction', async () => {
    const { svc, root, txRepo } = build();
    await svc.runInTransaction(async tx => {
      await svc.createTableData(user, 'tbl-1', { data: { a: '1', b: '2' } }, { tx });
    });
    expect(root.runInTransaction).toHaveBeenCalledTimes(1);
    expect(root.withTransaction).toHaveBeenCalledWith({ __fakeTx: true });
    expect(txRepo.createData).toHaveBeenCalledTimes(1);
  });
});
