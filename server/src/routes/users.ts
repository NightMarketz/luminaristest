import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getUsers, getUserById, createUser, updateUser, deleteUser, updateMyPreferences } from '../controllers/userController';

const router = Router();

// §3.4 #17 (dono, 2026-10-22): cadastro com limiter próprio, no padrão do login. Conta também as
// respostas de sucesso — no cadastro o abuso é justamente a conta criada.
const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-up attempts. Please wait 1 minute before trying again.' },
});

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', registerLimiter, createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/me/preferences', updateMyPreferences);

export default router;
