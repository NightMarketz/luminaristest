import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import { SpedEcdRequestSchema } from '../features/accounting/dtos/SpedEcdDto';
import { SpedEcfRequestSchema } from '../features/accounting/dtos/SpedEcfDto';
import { SpedEcfRealRequestSchema } from '../features/accounting/dtos/SpedEcfRealDto';
import {
  contactToEcf0930Signer,
  contactToJ930Signer,
} from '../features/accounting/models/AccountingContact.model';
import type { UserContext } from '../lib/authUtils';
import { ValidationError } from '../lib/errors';

/**
 * A "via barata" do F-CD8-a (BE-INCR-CONTADOR-DELIVERY, cédula 10/09 §6 F2 — "crie a via
 * barata"): o caller que monta o `SignerSchema` é ESTE controller, e é aqui — nunca nos serviços
 * ou DTOs de geração, que seguem intocados (item 15 do BRIEF) — que `signerContactIds` vira
 * signatários J930 do cadastro de contadores, ANTES do `.strict()` ver o corpo.
 *
 * Contrato: `signerContactIds: string[]` opcional no corpo; cada id é resolvido PELO ESCOPO
 * (cross-tenant → 404, nunca 403); o signatário resultante — J930 para a ECD, 0930 para a ECF, que
 * têm shapes diferentes — é ANEXADO a `signers`
 * (o corpo pode trazer os demais signatários — o responsável legal, por exemplo — à mão). A chave
 * `signerContactIds` é removida para o `.strict()` não a recusar. Sem `unitId` string no corpo não
 * há escopo para resolver: deixa passar e o DTO reprova o corpo com 400, como sempre.
 */
async function expandSignerContacts(
  body: unknown,
  user: UserContext,
  target: 'ecd' | 'ecf',
): Promise<unknown> {
  if (!body || typeof body !== 'object') return body;
  const raw = body as Record<string, unknown>;
  const ids = raw.signerContactIds;
  if (ids === undefined) return body;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || id.length === 0)) {
    return body; // formato errado: o `.strict()` do DTO recusa a chave desconhecida com 400
  }
  if (typeof raw.unitId !== 'string' || raw.unitId.length === 0) return body;
  const scope = resolveAccountingScope(user, raw.unitId);
  const contacts = getFactory().getAccountingContactService();
  const fromContacts = [];
  for (const id of ids as string[]) {
    const contact = await contacts.requireContact(scope, id);
    if (target === 'ecd') {
      fromContacts.push(contactToJ930Signer(contact));
    } else {
      // 0930 da ECF exige FONE; sem telefone no cadastro o contato não assina a ECF por esta via.
      const signer = contactToEcf0930Signer(contact);
      if (!signer) {
        throw new ValidationError(
          `O contador '${id}' não tem telefone no cadastro — o registro 0930 da ECF exige FONE.`,
        );
      }
      fromContacts.push(signer);
    }
  }
  const { signerContactIds: _consumed, ...rest } = raw;
  const existing = Array.isArray(rest.signers) ? rest.signers : [];
  return { ...rest, signers: [...existing, ...fromContacts] };
}

/**
 * POST /api/accounting/sped/ecd/generate — generate the SPED ECD (.txt) for a
 * year. Returns the export job summary; the artifact downloads via the existing
 * data-exchange job route (GET /data-exchange/jobs/:jobId/download). A coverage
 * gap surfaces as a 400 ValidationError with `unmappedAccounts` (D5).
 */
export const generateSpedEcd = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = SpedEcdRequestSchema.safeParse(await expandSignerContacts(req.body, user, 'ecd'));
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getSpedGenerationService().generate(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/accounting/sped/ecf/generate — generate the SPED ECF (.txt) for a
 * year (Lucro Presumido MVP). Returns the export job summary; the artifact
 * downloads via the existing data-exchange job route. A Revenue account with
 * movement outside {3.1, 3.3} surfaces as a 400 ValidationError with
 * `unmappedRevenueAccounts` (D6 corrigido — gate de exaustividade da receita).
 */
export const generateSpedEcf = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = SpedEcfRequestSchema.safeParse(await expandSignerContacts(req.body, user, 'ecf'));
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getSpedEcfGenerationService().generate(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/accounting/sped/ecf/real/generate — generate the SPED ECF (.txt) for a
 * year in Lucro REAL (esqueleto, ADR-INCR-SPED-ECF-FASE3; Fork 1→(b) rota dedicada).
 * Returns the export job summary (kind EXPORT_SPED_ECF_REAL); the artifact downloads
 * via the existing data-exchange job route. `fiscal.formaTrib`/`formaTribPer` are
 * REQUIRED (no server default — the regime code is never guessed); Blocks L/M/N are
 * emitted as empty markers until Forks 2/3/4 are ratified. No revenue exhaustiveness
 * gate (the Real base is the whole income statement, BRIEF item 10).
 */
export const generateSpedEcfReal = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = SpedEcfRealRequestSchema.safeParse(await expandSignerContacts(req.body, user, 'ecf'));
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getSpedEcfRealGenerationService().generate(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
