import type { Request, Response } from 'express';
import { getFactory } from '@/lib/factory';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';

export async function me(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Unauthorized' });
    // Through the service (canView → self is allowed); throws NotFoundError → 404 if the user is gone.
    const user = await getFactory().getUserService().getUserById(ctx.userId, ctx);
    return res.json({ success: true, data: user });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function logout(req: Request, res: Response) {
  try {
    // §3.4 #3 — bump the token version so this JWT (and every older one) stops validating.
    const ctx = getUserContextFromRequest(req);
    if (ctx) await getFactory().getUserService().revokeTokens(ctx.userId);
    res.clearCookie('auth_token', { path: '/', sameSite: 'lax' });
    res.clearCookie('auth_token', { path: '/', sameSite: 'lax', httpOnly: true });
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
}
