import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  AccountingContactScopeQuerySchema,
  RegisterContactSchema,
  UpdateContactSchema,
} from '../features/accounting/dtos/AccountingContactDto';

/**
 * Cadastro do contador (BE-INCR-CONTADOR-DELIVERY) — borda HTTP. Controllers finos: auth → Zod
 * safeParse → resolve escopo → delega → handleApiError. Um contato é metadado (sem dinheiro), então
 * estes endpoints nunca postam no razão.
 */

/** GET /api/accounting/contacts?unitId= — o catálogo vivo do escopo. */
export const listAccountingContacts = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = AccountingContactScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getAccountingContactService().listContacts(scope);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/contacts — cadastra um contador. */
export const registerAccountingContact = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = RegisterContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getAccountingContactService().registerContact(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * PATCH /api/accounting/contacts/:id — edita nome/e-mail/CRC.
 *
 * O `contactId` do corpo TEM de bater com o `:id` do path. Divergência é 400, nunca "usa um e
 * ignora o outro": param aceito-e-ignorado é bug silencioso conhecido deste repo (o caller acha
 * que editou A e editou B).
 */
export const updateAccountingContact = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UpdateContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    if (parsed.data.contactId !== req.params.id) {
      return res.status(400).json({
        success: false,
        error: `contactId do corpo ('${parsed.data.contactId}') diverge do :id da rota ('${req.params.id}').`,
      });
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory()
      .getAccountingContactService()
      .updateContact(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/accounting/contacts/:id?unitId= — arquiva (soft-delete; nunca hard-delete). */
export const archiveAccountingContact = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = AccountingContactScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getAccountingContactService().archiveContact(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
