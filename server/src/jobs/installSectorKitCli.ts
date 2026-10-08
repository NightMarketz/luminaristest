/**
 * installSectorKitCli — BE-INCR-KIT-SETOR PR-2 (item 16). Instala o KIT de setor de uma unidade pelo
 * `KitInstallService` (os 7 passos com commit próprio e retomada), no molde do `activateAccountingBindingCli`,
 * que ele absorve: aquele vira alias deste, sem mudança de comportamento para quem o chama hoje (emenda E-4).
 *
 * Mesmas regras do CLI antigo (ADR-INCR-BINDING-FEEDER.md §8; ADR-M2 decisão 4):
 *   - kit desconhecido ⇒ exit 1 ANTES de qualquer acesso ao banco;
 *   - plano de contas vazio ⇒ exit 1 (pré-condição dura: este script nunca semeia contas) — e também nunca abre
 *     período: as duas flags do `activate-default` vão `false`;
 *   - idempotente: kit já instalado (ou binding Active de unidade sem `KitInstallation`) ⇒ exit 0 sem compilar;
 *     instalação `FAILED`/`INSTALLING` ⇒ retoma do primeiro passo não concluído;
 *   - compile `Draft` ou falha num passo ⇒ exit 1.
 *
 * Run (dev/CI, via ts-node):
 *   npx ts-node -r tsconfig-paths/register src/jobs/installSectorKitCli.ts \
 *     --owner-user-id <id> --unit-id <id> --kit-key beautySalon [--actor-user-id <id>]
 *
 * NÃO é chamado por Dockerfile CMD/ENTRYPOINT nem pelo boot: humano ou etapa de migração do pipeline, antes do
 * boot (o leitor do boot, F8, pega o binding Active que a instalação deixa).
 */
import { ApplicationFactory } from '../lib/factory';
import prisma from '../lib/prisma';
import { KIT_REGISTRY } from '../features/sectorKits/registry';
import { KitInstallStepFailedError } from '../features/sectorKits/models/kitInstallTypes';
import type { BindingScope } from '../features/accountingBinding/repositories/IAccountingBindingRepository';

export interface InstallSectorKitArgs {
  ownerUserId: string;
  actorUserId: string;
  unitId: string;
  kitKey: string;
}

/** Lê `--flag valor` de um array argv — mesma convenção de `scripts/migrate-deploy.mjs`. */
function readFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

export function parseArgs(argv: string[]): InstallSectorKitArgs {
  const ownerUserId = readFlag(argv, '--owner-user-id');
  const unitId = readFlag(argv, '--unit-id');
  const kitKey = readFlag(argv, '--kit-key');
  if (!ownerUserId) {
    throw new Error('--owner-user-id é obrigatório (id de um User JÁ EXISTENTE no banco alvo — não há usuário padrão a adivinhar).');
  }
  if (!unitId) throw new Error('--unit-id é obrigatório (a unidade de negócio — AccountingScope.unitId — onde instalar o kit).');
  if (!kitKey) throw new Error(`--kit-key é obrigatório. Kits conhecidos: ${Object.keys(KIT_REGISTRY).join(', ')}.`);
  return { ownerUserId, unitId, kitKey, actorUserId: readFlag(argv, '--actor-user-id') || ownerUserId };
}

/**
 * O fluxo, a partir de argumentos já lidos (o alias `activateAccountingBindingCli` entra por aqui). Nunca chama
 * `process.exit` (testável) — devolve o código de saída. Sempre desconecta o Prisma no `finally`.
 */
export async function runInstall(args: InstallSectorKitArgs): Promise<number> {
  const scope: BindingScope = { ownerUserId: args.ownerUserId, actorUserId: args.actorUserId, unitId: args.unitId };

  // Lookup ANTES de qualquer acesso a banco: um kit desconhecido nunca instala o de OUTRO setor.
  if (!KIT_REGISTRY[args.kitKey]) {
    console.error(
      `erro: setor '${args.kitKey}' não está registrado (KIT_REGISTRY). Setores conhecidos: ${Object.keys(KIT_REGISTRY).join(', ')}.`,
    );
    return 1;
  }

  try {
    const kitService = ApplicationFactory.getInstance().getKitInstallService(scope);

    // Idempotência. ponytail: pré-check e instalação são idas separadas ao banco (TOCTOU, o mesmo teto do CLI
    // antigo: passo de deploy operado por uma pessoa; o compile pula quando já há Active e supersede atomicamente).
    const installation = await kitService.findInstallation(scope);
    if (installation?.status === 'INSTALLED') {
      console.log(
        `JÁ INSTALADO: kit '${installation.kitKey}' v${installation.kitVersion} na unidade '${scope.unitId}'. Nada a fazer (idempotente).`,
      );
      return 0;
    }
    if (!installation) {
      const existing = await prisma.accountingBinding.findFirst({
        where: { userId: scope.ownerUserId, unitId: scope.unitId, sectorKey: args.kitKey, status: 'Active', deletedAt: null },
      });
      if (existing) {
        console.log(
          `JÁ ATIVO: binding '${args.kitKey}' (unidade '${scope.unitId}') já é Active — versão ` +
            `${existing.bindingVersion}, id ${existing.id}. Nada a fazer (idempotente).`,
        );
        return 0;
      }
    }

    // Pré-condição dura (ADR-INCR-BINDING-FEEDER §8): o plano de contas TEM de existir antes do binding.
    const chartRows = await prisma.account.findMany({
      where: { userId: scope.ownerUserId, unitId: scope.unitId, deletedAt: null },
    });
    if (chartRows.length === 0) {
      console.error(
        `FALHOU: nenhuma conta encontrada para userId='${scope.ownerUserId}' unitId='${scope.unitId}'. ` +
          'O plano de contas precisa existir ANTES deste script (ordem chart→binding→boot é pré-condição ' +
          'dura — docs/adr/ADR-INCR-BINDING-FEEDER.md §8). Rode a semente/onboarding do plano de contas ' +
          'primeiro, depois rode este script de novo.',
      );
      return 1;
    }

    const kit = await kitService.resolveKit(scope, args.kitKey);
    const issues = kit ? await kitService.preconditions(kit) : [];
    if (issues.length > 0) {
      console.error(`FALHOU: ${issues.map((i) => `${i.code} — ${i.message}`).join('; ')}`);
      return 1;
    }

    const today = new Date().toISOString().slice(0, 10);
    const outcome = await kitService.install(scope, {
      kitKey: args.kitKey,
      ano: Number(today.slice(0, 4)),
      installChartIfEmpty: false,
      openCurrentPeriodIfMissing: false,
      today,
    });

    if (outcome.status !== 'INSTALLED') {
      const result = outcome.compile;
      console.error(
        `FALHOU: binding compilou como '${result.status}' (não Active) — bloqueante(s) do validador: ` +
          `${JSON.stringify(result.validation.blocking)}; cobertura de evento ausente: ` +
          `${JSON.stringify(result.coverage.missing)}`,
      );
      return 1;
    }

    console.log(
      `OK: kit '${outcome.kit.kitKey}' v${outcome.kit.kitVersion} instalado — unidade '${scope.unitId}', binding versão ` +
        `${outcome.bindingVersion}.`,
    );
    return 0;
  } catch (error) {
    if (error instanceof KitInstallStepFailedError) {
      console.error(`FALHOU: ${error.message} (KIT_INSTALL_STEP_FAILED, passo ${error.step}; rode de novo para retomar).`);
      return 1;
    }
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    await prisma.$disconnect().catch(() => {
      /* best-effort disconnect */
    });
  }
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  let args: InstallSectorKitArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  return runInstall(args);
}

// Only self-execute when run directly (not when imported by a test).
if (require.main === module) {
  void runCli().then((code) => process.exit(code));
}
