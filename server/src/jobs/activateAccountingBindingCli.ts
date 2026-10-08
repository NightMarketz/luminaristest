/**
 * activateAccountingBindingCli — ALIAS do `installSectorKitCli` desde o BE-INCR-KIT-SETOR PR-2 (item 16, emenda
 * E-4): mesmos argumentos (`--sector-key` = `--kit-key`) e mesmos códigos de saída; por baixo, instala
 * o KIT do setor (o binding é o passo de compile da instalação). Histórico abaixo.
 *
 * BE-INCR-BINDING-FEEDER (Fatia B, F-FEEDER-6 → migração de dado
 * via compilador REAL). Não é seed direto (rejeitado no ADR-INCR-BINDING-FEEDER.md §7): chama
 * `BindingCompileService.compile()` de verdade — o MESMO caminho que `POST /accounting-binding/compile`
 * usa (`ApplicationFactory.getAccountingBindingCompileService(scope)`) — contra o plano de contas
 * REAL do tenant lido do banco, produzindo uma linha `Active` que passou pelo validador (Corpo B),
 * nunca um snapshot de fixture bypassando-o.
 *
 * Pré-condição dura (ADR-INCR-BINDING-FEEDER.md §8): chart de contas do tenant → binding compilado
 * → boot do processo. Este script é o passo do MEIO — falha claro se o chart (passo 1) ainda não
 * existe, nunca inventa/semeia contas por conta própria.
 *
 * IDEMPOTÊNCIA (exigência do BRIEF/Fatia B — rodar duas vezes não pode duplicar nem derrubar):
 * `BindingCompileService.compile()` NÃO é idempotente por si — cada chamada nasce uma linha NOVA
 * com `bindingVersion = max()+1` (invariante 4 do ADR-P1, documentado no header da própria
 * classe). Este script adiciona o pré-check que falta: se já existe uma linha `Active` para
 * (userId,unitId,sectorKey), a 2ª chamada é um NO-OP (loga e sai 0), nunca uma segunda versão.
 *
 * Run (dev/CI, via ts-node — wrapper padrão `scripts/activate-salon-binding.mjs`):
 *   npx ts-node -r tsconfig-paths/register src/jobs/activateAccountingBindingCli.ts \
 *     --owner-user-id <id> --unit-id <id> [--actor-user-id <id>] [--sector-key beautySalon]
 *
 * Este script NÃO é chamado por Dockerfile CMD/ENTRYPOINT nem por boot — mesma proibição de
 * `scripts/migrate-deploy.mjs` (ADR-M2 decisão 4): invocado explicitamente por humano ou pela
 * etapa dedicada de migração do pipeline, DEPOIS que o chart de contas já existe no alvo.
 */
import { DEFAULT_SECTOR_KEY } from '../features/accountingBinding/fixtures/sectorBindingRegistry';
import { runInstall } from './installSectorKitCli';

export interface ActivateBindingArgs {
  ownerUserId: string;
  actorUserId: string;
  unitId: string;
  sectorKey: string;
}

// Registry de setores: desde o PR-2 do kit, o `KIT_REGISTRY` (`features/sectorKits/registry.ts`), lido pelo
// `installSectorKitCli` — o `SECTOR_BINDING_REGISTRY` é derivado dele (PR-1).

/** Lê `--flag valor` de um array argv — mesma convenção de `scripts/migrate-deploy.mjs`. */
function readFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

export function parseArgs(argv: string[]): ActivateBindingArgs {
  const ownerUserId = readFlag(argv, '--owner-user-id');
  const unitId = readFlag(argv, '--unit-id');
  if (!ownerUserId) {
    throw new Error(
      "--owner-user-id é obrigatório (id de um User JÁ EXISTENTE no banco alvo — AccountingBinding.userId " +
        'tem FK real para users; não há usuário padrão a adivinhar).',
    );
  }
  if (!unitId) {
    throw new Error('--unit-id é obrigatório (a unidade de negócio — AccountingScope.unitId — a ativar o binding).');
  }
  return {
    ownerUserId,
    unitId,
    actorUserId: readFlag(argv, '--actor-user-id') || ownerUserId,
    sectorKey: readFlag(argv, '--sector-key') || DEFAULT_SECTOR_KEY,
  };
}

/**
 * Fluxo completo: lê os argumentos de sempre e delega ao `installSectorKitCli` (`runInstall`), que mantém o
 * lookup do setor antes do banco, o pré-check de idempotência, a pré-condição dura do plano de contas e o
 * compile pelo `BindingCompileService` real. Nunca chama `process.exit` (testável).
 */
export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  let args: ActivateBindingArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  return runInstall({ ownerUserId: args.ownerUserId, actorUserId: args.actorUserId, unitId: args.unitId, kitKey: args.sectorKey });
}

// Only self-execute when run directly (not when imported by a test) — mesmo padrão de
// accountingSyncReconcileCli.ts.
if (require.main === module) {
  void runCli().then((code) => process.exit(code));
}
