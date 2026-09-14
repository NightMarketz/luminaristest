import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  ArchiveLalurSchema,
  CreateLalurEntrySchema,
  CreateLalurParteBAccountSchema,
  CreateLalurParteBMovementSchema,
  LalurParteBBalancesQuerySchema,
  LalurParteBPeriodSchema,
  ListLalurEntriesQuerySchema,
  ListLalurParteBMovementsQuerySchema,
  ListLalurParteBQuerySchema,
  UpdateLalurEntrySchema,
  UpdateLalurParteBAccountSchema,
  UpdateLalurParteBMovementSchema,
} from '../features/accounting/dtos/LalurDto';

/**
 * e-Lalur / e-Lacs HTTP edge (BE-INCR-SPED-ECF-FASE3B item 11, Fork 4→b). Thin controllers: auth →
 * Zod safeParse → resolve scope → delegate → handleApiError. Two aggregates: adjustment LINES
 * (Parte A M300/M350 + linhas E do Bloco N) and Parte B ACCOUNTS (M010). Archive is a COMMAND
 * (never a generic DELETE). These endpoints never post money — the ECF generator reads the store.
 * ECF 3C (ADR EMENDA 2026-09-12, 3ª): Parte B MOVEMENTS (M410), quarter CLOSE/REOPEN (materializes the
 * M500 — Fork N-1 a) and the BALANCES diagnostic (materialized × recomputed).
 */

// ── Entries ────────────────────────────────────────────────────────────────
/** GET /api/lalur/entries?unitId=&year=&quarter=&livro=&includeArchived= */
export const listLalurEntries = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ListLalurEntriesQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().listEntries(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/lalur/entries — register one adjustment line (validated against the L12 catalog). */
export const createLalurEntry = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CreateLalurEntrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().createEntry(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PATCH /api/lalur/entries/:id — partial update; the merged row is fully re-validated. */
export const updateLalurEntry = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UpdateLalurEntrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().updateEntry(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/lalur/entries/:id/archive — soft-archive (rename-on-key frees the code). */
export const archiveLalurEntry = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ArchiveLalurSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().archiveEntry(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

// ── Parte B ────────────────────────────────────────────────────────────────
/** GET /api/lalur/parte-b?unitId=&codTributo=&includeArchived= */
export const listLalurParteB = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ListLalurParteBQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().listParteB(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/lalur/parte-b — register an M010 account (codCtaB + codTributo). */
export const createLalurParteB = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CreateLalurParteBAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().createParteB(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PATCH /api/lalur/parte-b/:id — partial update (key fields immutable). */
export const updateLalurParteB = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UpdateLalurParteBAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().updateParteB(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/lalur/parte-b/:id/archive — soft-archive (live related lines must be archived first). */
export const archiveLalurParteB = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ArchiveLalurSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().archiveParteB(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

// ── Parte B — movimentos M410 (ECF 3C) ──────────────────────────────────────
/** GET /api/lalur/parte-b/movements?unitId=&year=&quarter=&parteBId=&includeArchived= */
export const listLalurMovements = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ListLalurParteBMovementsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().listMovements(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/lalur/parte-b/movements — register an M410 movement (codTributo derived from the account). */
export const createLalurMovement = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CreateLalurParteBMovementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().createMovement(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PATCH /api/lalur/parte-b/movements/:id — partial update (system PF/BC refuses value/indicador). */
export const updateLalurMovement = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UpdateLalurParteBMovementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().updateMovement(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/lalur/parte-b/movements/:id/archive — soft-archive (idempotent). */
export const archiveLalurMovement = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ArchiveLalurSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().archiveMovement(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

// ── Parte B — fechamento trimestral (Fork N-1 a) ────────────────────────────
/** POST /api/lalur/parte-b/close — materialize the M500 of the quarter and derive PF/BC. */
export const closeLalurParteB = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = LalurParteBPeriodSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().closeParteB(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/lalur/parte-b/reopen — drop the materialization of the quarter (no later quarter closed). */
export const reopenLalurParteB = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = LalurParteBPeriodSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().reopenParteB(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/lalur/parte-b/balances?unitId=&year= — materialized × recomputed diagnostic. */
export const getLalurParteBBalances = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = LalurParteBBalancesQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getLalurService().parteBBalances(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
