import type { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getFactory } from '../lib/factory';
import { logger } from '../lib/logger';
import type { DfeSignerDeviceWithUnits } from '../features/accounting/repositories/IDfeSignerRepository';

/**
 * X10a EMENDA-4 AL-5 — autenticação das rotas do assinador local (`/api/dfe-assinador/v1/*`). Não é sessão de usuário:
 * essas rotas estão em `publicApiRoutes` (o JWT não se aplica) e a prova é `Authorization: Bearer <token de
 * dispositivo>`. O token é comparado pelo sha256 (índice único; o banco nunca vê o token), e o hash de 64 hex não deixa
 * diferença de tempo útil entre tokens parecidos. Token revogado ou desconhecido ⇒ 401 sem dizer qual.
 */
export type RequestComDispositivo = Request & { dfeSignerDevice?: DfeSignerDeviceWithUnits };

const NAO_AUTORIZADO = { success: false, error: 'Unauthorized' } as const;

function bearerOf(req: Request): string | null | undefined {
  const h = req.headers.authorization;
  if (h === undefined) return undefined;
  const m = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(h);
  return m ? m[1] : null;
}

async function autenticar(req: RequestComDispositivo, res: Response, next: NextFunction, obrigatorio: boolean) {
  try {
    const token = bearerOf(req);
    if (token === undefined && !obrigatorio) return next();
    const device = token ? await getFactory().getDfeSignerService().autenticarDispositivo(token) : null;
    if (!device) {
      logger.event('warn', 'auth.denied', 'dfe_signer: token de dispositivo recusado', { method: req.method, route: req.baseUrl + req.path });
      return res.status(401).json(NAO_AUTORIZADO);
    }
    req.dfeSignerDevice = device;
    return next();
  } catch (error) {
    return next(error);
  }
}

/** Bearer obrigatório (tarefas e resultado, AL-PR-3). */
export const requireDfeSignerDevice = (req: Request, res: Response, next: NextFunction) =>
  autenticar(req as RequestComDispositivo, res, next, true);

/**
 * Bearer opcional (pareamento): ausente ⇒ dispositivo novo; presente ⇒ tem de ser válido (L-AL-2: o 2º vínculo do
 * mesmo dispositivo), senão 401.
 */
export const optionalDfeSignerDevice = (req: Request, res: Response, next: NextFunction) =>
  autenticar(req as RequestComDispositivo, res, next, false);

/**
 * Limite de taxa por dispositivo (AL-5). Depois da autenticação a chave é o dispositivo; sem ele (pareamento novo), o
 * IP — o código de 12 caracteres de 31 símbolos não se adivinha, mas o limite corta a tentativa em massa.
 * Inválido ou ≤ 0 no env cai no padrão, nunca em "sem limite" (mesma régua do `deliveryConfirmLimiter`).
 */
export const dfeSignerDeviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: () => {
    const n = Number(process.env.DFE_SIGNER_RATE_LIMIT);
    return Number.isFinite(n) && n > 0 ? n : 120;
  },
  keyGenerator: (req) => {
    const device = (req as RequestComDispositivo).dfeSignerDevice;
    return device ? `dev:${device.id}` : `ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});
