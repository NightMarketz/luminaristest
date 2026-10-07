/**
 * grantPlatformAdminCli — BE-INCR-LEGAL-PARAMS PR-1 (F-LP-2 b; emenda §9 L-2: *"Comando de terminal"*). Único caminho
 * para um usuário receber `PLATFORM_ADMIN`, o papel que publica coeficientes de lei para todos os clientes. Não há
 * rota na API, e o enum `Role` do domínio (que o DTO de usuário valida) NÃO tem esse valor — um `ADMIN` não promove
 * ninguém pela tela.
 *
 * Idempotente: usuário já `PLATFORM_ADMIN` ⇒ no-op (sai 0). O papel entra no JWT do próximo login.
 *
 * Run:
 *   npm run grant:platform-admin -- --email <email>
 */
import { Role as PrismaRole } from 'generated/prisma';
import prisma from '../lib/prisma';
import { UserRepository } from '../features/users/repositories/UserRepository';
import type { IUserRepository } from '../features/users/repositories/IUserRepository';

export const PLATFORM_ADMIN = PrismaRole.PLATFORM_ADMIN;

function readFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

/** Concede o papel; devolve o código de saída. Nunca chama `process.exit` (testável). */
export async function grantPlatformAdmin(argv: string[], users: Pick<IUserRepository, 'getUserByEmail' | 'updateUser'> = new UserRepository()): Promise<number> {
  const email = readFlag(argv, '--email');
  if (!email) {
    console.error('erro: --email é obrigatório (e-mail de um usuário JÁ EXISTENTE).');
    return 2;
  }
  const user = await users.getUserByEmail(email);
  if (!user) {
    console.error(`erro: nenhum usuário com e-mail ${email}.`);
    return 1;
  }
  if (String(user.role) === PLATFORM_ADMIN) {
    console.log(`${email} já é ${PLATFORM_ADMIN} — nada a fazer.`);
    return 0;
  }
  // O enum do Prisma tem o valor; o do domínio não (de propósito, ver o cabeçalho).
  await users.updateUser(user.id, { role: PLATFORM_ADMIN });
  console.log(`${email}: ${String(user.role)} → ${PLATFORM_ADMIN} (vale a partir do próximo login).`);
  return 0;
}

if (require.main === module) {
  grantPlatformAdmin(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .finally(() => prisma.$disconnect());
}
