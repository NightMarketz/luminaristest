import { Router } from 'express';
import {
  getLalurCatalog,
  listLalurEntries,
  createLalurEntry,
  updateLalurEntry,
  archiveLalurEntry,
  listLalurParteB,
  createLalurParteB,
  updateLalurParteB,
  archiveLalurParteB,
} from '../controllers/lalurController';

/**
 * e-Lalur / e-Lacs — ajustes da Parte A + contas da Parte B (BE-INCR-SPED-ECF-FASE3B item 11).
 * Mounted at `/api/lalur` (routes/index.ts). 2-touch registration: the mount plus the OpenAPI doc
 * blocks in docs.paths.ts (do NOT write the literal jsdoc-openapi tag in this prose — the generator
 * globs routes/ and would spread the comment string into the spec). Static segments (`/catalog`, `/entries`,
 * `/parte-b`) precede any `:id` so they are never captured as ids.
 */
const router = Router();

// Catálogo do Leiaute 12 (read-only, global) — FE-INCR-LALUR Fork F-FE-1→a
router.get('/catalog', getLalurCatalog);

// Parte A (M300/M350) + linhas E do Bloco N
router.get('/entries', listLalurEntries);
router.post('/entries', createLalurEntry);
router.patch('/entries/:id', updateLalurEntry);
router.post('/entries/:id/archive', archiveLalurEntry);

// Parte B (M010)
router.get('/parte-b', listLalurParteB);
router.post('/parte-b', createLalurParteB);
router.patch('/parte-b/:id', updateLalurParteB);
router.post('/parte-b/:id/archive', archiveLalurParteB);

export default router;
