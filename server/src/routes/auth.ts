import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login } from '../controllers/authController';
import { me, logout } from '@/controllers/authUtilityController';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 1 minute before trying again.' },
});

// §3.4 #17 (dono, 2026-10-22): cadastro com limiter próprio, no padrão do login. Conta também as
// respostas de sucesso — no cadastro o abuso é justamente a conta criada.
const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-up attempts. Please wait 1 minute before trying again.' },
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', me);
router.post('/logout', logout);

export default router;

