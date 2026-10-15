/**
 * upgradeSectorKitsCli — BE-INCR-KIT-SETOR PR-4 (item 34; F-KS-5 → b + R2). Atualiza o kit de toda unidade cuja
 * `KitInstallation.kitVersion` está atrás da última versão publicada, pelo `KitUpgradeService`.
 *
 *   --dry-run (padrão)  calcula o diff e grava `KitUpgradeRun(DRY_RUN)`; nenhuma escrita de domínio;
 *   --apply             exige o DRY_RUN da mesma (unidade, from→to) no mesmo `--deploy-id`; aplica (a)+(b) e cria as
 *                       pendências de (c);
 *   --deploy-id <id>    obrigatório: amarra o apply ao dry-run do mesmo deploy;
 *   --actor-user-id     opcional: quem fica como ator na auditoria (padrão: o dono de cada unidade).
 *
 * O erro de uma unidade não para as outras; o código de saída é ≠ 0 se alguma falhar, para o pipeline ver. Roda no
 * passo de migração do deploy, ANTES do boot (F10): o leitor do boot (F8) já pega os bindings novos.
 *
 * Run (dev/CI, via ts-node):
 *   npx ts-node -r tsconfig-paths/register src/jobs/upgradeSectorKitsCli.ts --deploy-id <id> [--apply]
 */
import { ApplicationFactory } from '../lib/factory';
import prisma from '../lib/prisma';
import type { BindingScope } from '../features/accountingBinding/repositories/IAccountingBindingRepository';
import { KitInstallationRepository } from '../features/sectorKits/repositories/KitInstallationRepository';
import { DEPLOY_CLI_ACTOR, type KitUpgradeMode } from '../features/sectorKits/models/kitUpgradeTypes';
import { KIT_REGISTRY, latestKit } from '../features/sectorKits/registry';

export interface UpgradeSectorKitsArgs {
  mode: KitUpgradeMode;
  deployId: string;
  actorUserId?: string;
}

const KNOWN_FLAGS = new Set(['--dry-run', '--apply', '--deploy-id', '--actor-user-id']);

export function parseArgs(argv: string[]): UpgradeSectorKitsArgs {
  for (const arg of argv) {
    if (arg.startsWith('--') && !KNOWN_FLAGS.has(arg)) throw new Error(`flag desconhecida: ${arg}`);
  }
  if (argv.includes('--dry-run') && argv.includes('--apply')) throw new Error('use --dry-run OU --apply, não os dois.');
  const flag = (name: string) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const deployId = flag('--deploy-id');
  if (!deployId || deployId.startsWith('--')) throw new Error('--deploy-id é obrigatório (identifica o deploy: o --apply só roda sobre o dry-run do mesmo deploy).');
  const actorUserId = flag('--actor-user-id');
  return { mode: argv.includes('--apply') ? 'APPLY' : 'DRY_RUN', deployId, actorUserId };
}

/** O fluxo, a partir de argumentos já lidos. Nunca chama `process.exit` (testável): devolve o código de saída. */
export async function runUpgrade(args: UpgradeSectorKitsArgs): Promise<number> {
  try {
    const candidates = (await new KitInstallationRepository().findAllInstalled()).filter((row) => {
      const latest = KIT_REGISTRY[row.kitKey] ? latestKit(row.kitKey) : undefined;
      return latest !== undefined && row.kitVersion < latest.kitVersion;
    });
    if (candidates.length === 0) {
      console.log('NADA A FAZER: toda instalação de kit já está na última versão.');
      return 0;
    }

    let failures = 0;
    for (const row of candidates) {
      const scope: BindingScope = { ownerUserId: row.userId, actorUserId: args.actorUserId ?? row.userId, unitId: row.unitId };
      const label = `${row.kitKey} unidade '${row.unitId}' (dono ${row.userId})`;
      try {
        const out = await ApplicationFactory.getInstance()
          .getKitUpgradeService(scope)
          .upgrade(scope, { mode: args.mode, deployId: args.deployId, actor: DEPLOY_CLI_ACTOR });
        if (out.status === 'UP_TO_DATE') {
          console.log(`${label}: já na v${out.kitVersion}.`);
          continue;
        }
        const { additive, forward, conflicts } = out.run.counts;
        console.log(
          `${label}: ${out.status} v${out.run.fromVersion}→v${out.run.toVersion} — aditivos ${additive}, forward ${forward}, pendências ${conflicts}` +
            (out.report.notices.length > 0 ? `, avisos ${out.report.notices.length}` : ''),
        );
        if (out.status === 'FAILED') {
          failures++;
          for (const r of out.report.results.filter((x) => x.outcome === 'failed')) console.error(`  falhou ${r.itemKey}: ${r.error}`);
        }
      } catch (error) {
        failures++;
        console.error(`${label}: FALHOU — ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const status = failures === 0 ? (args.mode === 'APPLY' ? 'APPLIED' : 'PLANNED') : failures === candidates.length ? 'FAILED' : 'PARTIAL';
    console.log(`RESUMO ${args.mode} deploy '${args.deployId}': ${status} — ${candidates.length - failures}/${candidates.length} unidade(s) ok.`);
    return failures === 0 ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  let args: UpgradeSectorKitsArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
  runUpgrade(args).then((code) => process.exit(code));
}
