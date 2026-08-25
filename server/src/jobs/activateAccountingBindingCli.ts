/**
 * activateAccountingBindingCli — BE-INCR-BINDING-FEEDER (Fatia B, F-FEEDER-6 → migração de dado
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
import { ApplicationFactory } from '../lib/factory';
import prisma from '../lib/prisma';
import { SALON_BINDING_V1, SALON_OPERATIONAL_SCHEMA_SNAPSHOT } from '../features/accountingBinding/fixtures/salonBinding';
import type { BindingScope } from '../features/accountingBinding/repositories/IAccountingBindingRepository';

export interface ActivateBindingArgs {
  ownerUserId: string;
  actorUserId: string;
  unitId: string;
  sectorKey: string;
}

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
    sectorKey: readFlag(argv, '--sector-key') || SALON_BINDING_V1.sectorKey,
  };
}

/**
 * Fluxo completo. Nunca chama `process.exit` (testável) — devolve o código de saída pretendido.
 * Sempre desconecta o Prisma no `finally`, mesmo padrão de `accountingSyncReconcileCli.ts`.
 */
export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  let args: ActivateBindingArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const scope: BindingScope = { ownerUserId: args.ownerUserId, actorUserId: args.actorUserId, unitId: args.unitId };

  try {
    // Idempotência (pré-check que compile() não faz sozinho — ver header).
    // ponytail: este pré-check e o compile() abaixo são duas idas ao banco, sem tx compartilhada —
    // é TOCTOU. Sob corrida (dois operadores rodando o CLI ao mesmo tempo), ambos passam aqui e
    // ambos compilam; o dado NÃO corrompe, porque compile()/activateAtomically re-lê o
    // `currentMax` DENTRO da própria tx e supersede atomicamente, e o SQLite serializa as duas —
    // sobra exatamente UMA linha Active. O que se perde é a promessa de NO-OP: nasce uma
    // bindingVersion extra, imediatamente supersedida, com o par de eventos de auditoria junto.
    // Teto conhecido e aceito: este é um passo de deploy operado por uma pessoa, não um endpoint.
    // Upgrade path se virar problema: mover o pré-check para dentro da tx do compile(), via
    // método novo do repositório. O teste só cobre o caso sequencial — não exercita concorrência.
    const existing = await prisma.accountingBinding.findFirst({
      where: { userId: scope.ownerUserId, unitId: scope.unitId, sectorKey: args.sectorKey, status: 'Active', deletedAt: null },
    });
    if (existing) {
      console.log(
        `JÁ ATIVO: binding '${args.sectorKey}' (unidade '${scope.unitId}') já é Active — versão ` +
          `${existing.bindingVersion}, id ${existing.id}. Nada a fazer (idempotente).`,
      );
      return 0;
    }

    // Pré-condição dura (ADR §8): chart de contas TEM de existir antes do binding.
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
    const chart = chartRows.map((a) => ({ code: a.code, nature: a.nature, acceptsEntries: a.acceptsEntries }));

    // O MESMO caminho que POST /accounting-binding/compile usa — validador real, nunca bypass.
    const compileService = ApplicationFactory.getInstance().getAccountingBindingCompileService(scope);
    const result = await compileService.compile(scope, {
      sectorKey: args.sectorKey,
      operationalSchema: SALON_OPERATIONAL_SCHEMA_SNAPSHOT,
      chart,
      eventBindings: SALON_BINDING_V1.eventBindings,
    });

    if (result.status !== 'Active') {
      console.error(
        `FALHOU: binding compilou como '${result.status}' (não Active) — bloqueante(s) do validador: ` +
          JSON.stringify(result.validation.blocking),
      );
      return 1;
    }

    console.log(
      `OK: binding '${args.sectorKey}' ativado — unidade '${scope.unitId}', versão ` +
        `${result.binding.bindingVersion}, id ${result.binding.id}.`,
    );
    return 0;
  } catch (error) {
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    await prisma.$disconnect().catch(() => {
      /* best-effort disconnect */
    });
  }
}

// Only self-execute when run directly (not when imported by a test) — mesmo padrão de
// accountingSyncReconcileCli.ts.
if (require.main === module) {
  void runCli().then((code) => process.exit(code));
}
