import { Router } from 'express';
import {
  listTables,
  getTable,
  getTableData,
  createTableData,
  updateTableData,
  deleteTableData,
  batchDeleteTableData,
  resolveRelations,
  syncPreset,
  installTableFromPreset,
} from '@/controllers/dynamicTablesController';
import {
  listRowVersions,
  getRowVersion,
  diffRowVersion,
  restoreRowVersion,
  listSchemaVersions,
  getSchemaVersion,
  diffSchemaVersion,
} from '@/controllers/dynamicTableVersionsController';

const router = Router();

// /api/dynamic-tables
router.get('/', listTables);
router.post('/lookup', resolveRelations);
// Admin-only: additively evolve an installed table's schema from its preset module.
// Declared before the /:tableId param routes so it is not captured as a table id.
router.post('/sync-preset', syncPreset);
// Admin-only: install ONE new table from its preset into an already-installed tenant.
// Declared before the /:tableId param routes so 'install-table' is not captured as a table id.
router.post('/install-table', installTableFromPreset);

// /api/dynamic-tables/:tableId
router.get('/:tableId', getTable);

// /api/dynamic-tables/:tableId/data
router.get('/:tableId/data', getTableData);
router.post('/:tableId/data', createTableData);

// Bulk soft-delete. Declared BEFORE /:tableId/data/:dataId so 'batch-delete'
// is not captured as a dataId param.
router.post('/:tableId/data/batch-delete', batchDeleteTableData);

// /api/dynamic-tables/:tableId/data/:dataId
router.put('/:tableId/data/:dataId', updateTableData);
router.delete('/:tableId/data/:dataId', deleteTableData);

// BE-INCR-DT-VERSION-LEDGER — ledger de versões da linha e do schema
router.get('/:tableId/data/:dataId/versions', listRowVersions);
router.get('/:tableId/data/:dataId/versions/:version', getRowVersion);
router.get('/:tableId/data/:dataId/versions/:version/diff', diffRowVersion);
router.post('/:tableId/data/:dataId/versions/:version/restore', restoreRowVersion);
router.get('/:tableId/schema-versions', listSchemaVersions);
router.get('/:tableId/schema-versions/:version', getSchemaVersion);
router.get('/:tableId/schema-versions/:version/diff', diffSchemaVersion);

export default router;
