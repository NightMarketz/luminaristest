import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import { makeUploadMiddleware } from '../lib/uploadSecurity';
import {
  ImportNfePurchaseSchema,
  ImportNfeSaleSchema,
} from '../features/accounting/dtos/NfeDto';

/**
 * NF-e fiscal ingestion HTTP edge (BE-INCR-NFE / B-1). Thin controller, mirroring the bank-statement
 * import: auth → multipart file → Zod safeParse of the JSON fields → resolve scope → delegate →
 * handleApiError (which maps ValidationError/ForbiddenError/NotFoundError to their real status, so a
 * domain rejection is never a generic 500).
 *
 * Two commands, both write-side:
 * - purchase: parses the note, values it (D3 + rateio) and drives ONE createPayable + N stock inbounds.
 * - sale:     crosses the note with an ALREADY-POSTED sale and attaches provenance. Posts NOTHING.
 */

/**
 * NF-e is XML, i.e. TEXT. Browsers label it `text/xml` or `application/xml`; a `.xml` picked from a
 * file input frequently arrives as `text/plain` or `application/octet-stream`.
 */
const NFE_MIME_TYPES = new Set([
  'text/xml',
  'application/xml',
  'text/plain',
  'application/octet-stream',
]);

/** Same cap as the other import routes (untrusted external XML — bound the buffer, O-3 / §6). */
const MAX_NFE_SIZE_BYTES = Number(process.env.MAX_IMPORT_SIZE_BYTES) || 10 * 1024 * 1024;

/**
 * Multer middleware for the single `file` field (memory storage, XML allowlist, size cap).
 *
 * Magic bytes are DELIBERATELY OFF (decision O-3, plan §7): XML has no binary signature, and the
 * shared `validateMagicBytes` demands a ZIP/PDF signature for `application/octet-stream` — enabling it
 * would reject a legitimate nota fiscal uploaded by any browser that labels it octet-stream. This is
 * the same exception already taken for OFX/CNAB. The real guards for this route are the MIME
 * allowlist, the size cap, and `parseNfe` itself (which rejects DTD/XXE and any non-NF-e document).
 */
export const nfeUpload = makeUploadMiddleware(NFE_MIME_TYPES, 'file', MAX_NFE_SIZE_BYTES, false);

/** Read the uploaded `file` field, or null when absent. */
function uploadedFile(req: Request): Express.Multer.File | null {
  return (req as Request & { file?: Express.Multer.File }).file ?? null;
}

/**
 * `itemMappings` is an ARRAY, and multipart fields are flat strings — so the client sends it as a
 * JSON string. Decoded here (loud on malformed JSON) BEFORE Zod, so the DTO still validates the real
 * shape. An already-structured body (JSON client / test) passes through untouched.
 */
function decodeItemMappings(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  return JSON.parse(raw);
}

/**
 * POST /api/nfe/purchase — multipart import of a purchase NF-e (XML + operator confirmations).
 * Returns the created Payable (201). Rejects loud on cStat, unmapped item, unconfirmed counterparty
 * or re-import (the chave de acesso is the @@unique business key).
 */
export const importNfePurchase = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const file = uploadedFile(req);
    if (!file) {
      return res.status(400).json({ success: false, error: 'File is required (field name: file)' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    let candidate: Record<string, unknown>;
    try {
      candidate = { ...body, itemMappings: decodeItemMappings(body.itemMappings) };
    } catch {
      return res.status(400).json({
        success: false,
        error: 'itemMappings deve ser um JSON válido (array de { cProd, productRef }).',
      });
    }

    const parsed = ImportNfePurchaseSchema.safeParse(candidate);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory()
      .getNfeImportService()
      .importPurchase(scope, file.buffer, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/nfe/sale — cross a sale NF-e with the ALREADY-POSTED sale anchored by `saleId` (F-NFE8).
 * Attaches provenance and returns the divergence report (200). Posts NOTHING; an orphan note 404s.
 */
export const reconcileNfeSale = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const file = uploadedFile(req);
    if (!file) {
      return res.status(400).json({ success: false, error: 'File is required (field name: file)' });
    }

    const parsed = ImportNfeSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory()
      .getNfeSaleReconciliationService()
      .reconcileSale(scope, { saleId: parsed.data.saleId, xml: file.buffer });
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
