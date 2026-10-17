/**
 * migratePlano4NiveisCli — BE-INCR-PLANO-4-NIVEIS, PR-2 (itens 8–11 do BRIEF; ADR-PLANO-CONTAS-4-NIVEIS). MIGRAÇÃO DE
 * DADO, não de schema: leva o plano de contas de uma unidade do canônico de 3 níveis ao de 4 (L8 do RUNBOOK-H1 — o PVA
 * da ECD exige analítica de ativo/passivo/PL no nível ≥ 4; Manual da ECD L9 maio/2026 p. 120).
 *
 * Ordem (F-L8-4 a, dono 13/10): roda ANTES de subir o código novo. Se o servidor novo subisse primeiro, o
 * `ensureChartOfAccounts` (create-if-missing por código) criaria a analítica nova VAZIA ao lado da antiga com saldo.
 *
 * Por unidade, numa transação (item 8):
 *   (a) renomeia NO LUGAR, por id, cada analítica do de-para `RENOMEACAO_CANONICA_L8` (lançamentos, de-para referencial e
 *       subrazões apontam para o id e ficam intactos);
 *   (b) cria as sintéticas do canônico de 4 níveis que faltam (o código antigo pode voltar como sintética, F-L8-3 a);
 *   (b') o mesmo para o conteúdo fiscal dos kits v3–v5 (#652): as 4 contas a recolher vão para o grupo tributário pelo
 *       `RENOMEACAO_FISCAL_L8` (F-L8-10 a, dono 15/10), e as sintéticas `2.1.3`/`3.6`/`4.5` são criadas onde a unidade
 *       tem filhas delas (F-L8-11 a);
 *   (c) Σ débito e Σ crédito por accountId iguais antes e depois — senão desfaz a unidade inteira.
 * Conta patrimonial PERSONALIZADA (fora do canônico) não é tocada, só listada (F-L8-5 a, item 10).
 * ANTES da tx (F-L8-12 a, dono 15/10): kit instalado abaixo do v5 (o último do plano de 3 níveis) passa pelo
 * `KitUpgradeService` real até o v5 (dry-run + apply), para a unidade receber o conteúdo das versões do meio (contas de
 * imposto e perfil-padrão do v3, catálogo do v4, referencial da emenda 3.3 do v5). Forward ou conflito no dry-run: a
 * unidade falha e nada é renomeado — exceto o conflito `referential_year_frozen` (F-L8-13 a, dono 15/10): o de-para de
 * ano congelado (mês HARD_CLOSED ou ECF transmitida) fica como pendência do kit, e o RUNBOOK-H1 o grava à mão. O upgrade comita sozinho; se a renomeação falhar depois, a unidade fica no v5 do
 * plano de 3 níveis (estado consistente) e a 2ª rodada continua dali.
 * Depois da tx (item 9): se o binding Active ainda usa código antigo, recompila com o binding da versão vigente do kit
 * (o compile supersede o Active atomicamente) e a instalação do kit passa do v5 à versão vigente (F-L8-7R).
 *
 * Idempotente: rodar de novo encontra tudo migrado e não escreve nada.
 *
 * Run (servidor PARADO; alvo = o DATABASE_URL que o processo enxerga depois do `.env`):
 *   npx ts-node -r tsconfig-paths/register src/jobs/migratePlano4NiveisCli.ts --all
 *   npx ts-node -r tsconfig-paths/register src/jobs/migratePlano4NiveisCli.ts --owner-user-id <id> --unit-id <id>
 * Exit: 0 ok · 1 falha de pré-condição ou divergência (unidade desfeita) · 2 argumentos inválidos.
 * Não é chamado por boot, Dockerfile nem start (ADR-M2 decisão 4).
 */
import type { PrismaClient } from '../../generated/prisma';
import prisma from '../lib/prisma';
import { ApplicationFactory } from '../lib/factory';
import {
  CANONICAL_ACCOUNTS,
  CANONICAL_ACCOUNTS_PRE_L8,
  NIVEL_MINIMO_ANALITICA_PATRIMONIAL,
  PATRIMONIAL_NATURES,
  RENOMEACAO_CANONICA_L8,
  type AccountNature,
} from '../features/accounting/fixtures/ChartOfAccountsFixture';
import { KIT_REGISTRY, latestKit } from '../features/sectorKits/registry';
import { RENOMEACAO_FISCAL_L8, SINTETICAS_FISCAIS_L8 } from '../features/sectorKits/kits/_shared/conteudoFiscalCanonico';
import { SECTOR_BINDING_REGISTRY } from '../features/accountingBinding/fixtures/sectorBindingRegistry';
import type { BindingScope } from '../features/accountingBinding/repositories/IAccountingBindingRepository';
import type { CompileBindingInput, CompileBindingResult } from '../features/accountingBinding/services/BindingCompileService';
import type { KitUpgradeOutcome } from '../features/sectorKits/services/KitUpgradeService';
import { ULTIMA_VERSAO_KIT_PRE_L8 } from '../features/sectorKits/models/kitUpgradeTypes';

/** Salão e clínica: a v5 é a última do plano de 3 níveis — a constante mora no `sectorKits` (guarda do upgrade). */
export { ULTIMA_VERSAO_KIT_PRE_L8 };

export interface RelatorioMigracaoUnidade {
  ownerUserId: string;
  unitId: string;
  criadas: string[];
  renomeadas: { de: string; para: string }[];
  personalizadasNaoTocadas: { code: string; name: string }[];
  bindingRecompilado: { de: number; para: number } | null;
  /** F-L8-12 (a): upgrade real do kit até o v5 antes de renomear; null se já estava no v5 (ou acima, ou sem kit). */
  kitPreparado: { kitKey: string; de: number; para: number; pendenciasAnoCongelado: string[] } | null;
  kitAtualizado: { kitKey: string; de: number; para: number } | null;
  saldoAntesDepoisIgual: boolean;
}

/** O compile real (`BindingCompileService.compile`) — injetado para o teste e para a CLI usar o da factory. */
export type CompileFn = (scope: BindingScope, input: CompileBindingInput) => Promise<CompileBindingResult>;

/** O upgrade real (`KitUpgradeService.upgrade`) com o registro preso no v5 — injetado como o compile. */
export type UpgradeAteV5Fn = (scope: BindingScope, mode: 'DRY_RUN' | 'APPLY', deployId: string) => Promise<KitUpgradeOutcome>;

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

const CODIGOS_ANTIGOS = new Set(RENOMEACAO_CANONICA_L8.map((r) => r.de));
const PRE_L8 = new Map(CANONICAL_ACCOUNTS_PRE_L8.map((a) => [a.code, a]));

async function saldosPorConta(tx: Tx, ids: string[]): Promise<Map<string, string>> {
  const rows = await tx.posting.groupBy({ by: ['accountId'], where: { accountId: { in: ids } }, _sum: { debitCents: true, creditCents: true } });
  return new Map(rows.map((r) => [r.accountId, `${r._sum.debitCents ?? 0n}/${r._sum.creditCents ?? 0n}`]));
}

/** Itens 8 e 10: a parte de plano de contas, numa transação; lança (e desfaz) em conflito ou divergência de saldo. */
async function migrarPlano(db: PrismaClient, ownerUserId: string, unitId: string) {
  return db.$transaction(async (tx) => {
    const where = { userId: ownerUserId, unitId };
    const todas = await tx.account.findMany({ where });
    const vivas = todas.filter((a) => a.deletedAt === null);
    const ocupado = (code: string) => todas.find((a) => a.code === code);
    const antes = await saldosPorConta(tx, vivas.map((a) => a.id));

    const renomeadas: { de: string; para: string }[] = [];
    for (const { de, para } of RENOMEACAO_CANONICA_L8) {
      const conta = vivas.find((a) => a.code === de);
      // Ausente, ou já é a sintética nova (rodada anterior), ou não é a analítica canônica de antes: nada a renomear.
      if (!conta || !conta.acceptsEntries || conta.nature !== PRE_L8.get(de)?.nature) continue;
      if (ocupado(para)) {
        throw new Error(`conflito: a unidade já tem uma conta '${para}' (viva ou excluída) — não renomeia '${de}'.`);
      }
      await tx.account.update({ where: { id: conta.id }, data: { code: para } });
      conta.code = para;
      renomeadas.push({ de, para });
    }

    // (b') conteúdo fiscal do kit: só a analítica Liability que o kit criou com o código antigo.
    for (const { de, para } of RENOMEACAO_FISCAL_L8) {
      const conta = vivas.find((a) => a.code === de);
      if (!conta || !conta.acceptsEntries || conta.nature !== 'Liability') continue;
      if (ocupado(para)) {
        throw new Error(`conflito: a unidade já tem uma conta '${para}' (viva ou excluída) — não renomeia '${de}'.`);
      }
      await tx.account.update({ where: { id: conta.id }, data: { code: para } });
      conta.code = para;
      renomeadas.push({ de, para });
    }

    const criadas: string[] = [];
    const comFilha = (code: string) => vivas.some((a) => a.code.startsWith(`${code}.`));
    const sinteticasFiscais = SINTETICAS_FISCAIS_L8.filter((s) => comFilha(s.code));
    for (const s of [...CANONICAL_ACCOUNTS.filter((a) => !a.acceptsEntries), ...sinteticasFiscais]) {
      const existente = todas.find((a) => a.code === s.code);
      if (existente && existente.deletedAt === null) continue;
      if (existente) throw new Error(`conflito: a sintética '${s.code}' existe excluída nesta unidade — não recria.`);
      await tx.account.create({ data: { ...where, code: s.code, name: s.name, nature: s.nature, acceptsEntries: false } });
      criadas.push(s.code);
    }

    const depois = await saldosPorConta(tx, vivas.map((a) => a.id));
    const igual = antes.size === depois.size && [...antes].every(([id, v]) => depois.get(id) === v);
    if (!igual) throw new Error('divergência: Σ débito/crédito por conta mudou na migração — unidade desfeita.');

    const personalizadas = vivas
      .filter(
        (a) =>
          a.acceptsEntries &&
          PATRIMONIAL_NATURES.includes(a.nature as AccountNature) &&
          a.code.split('.').length < NIVEL_MINIMO_ANALITICA_PATRIMONIAL,
      )
      .map((a) => ({ code: a.code, name: a.name }));

    return { renomeadas, criadas, personalizadas, saldoAntesDepoisIgual: igual };
  });
}

/** Bindings Active da unidade que ainda usam algum código antigo do de-para (os que o item 9 recompila). */
async function bindingsComCodigoAntigo(db: PrismaClient, unidade: { userId: string; unitId: string }) {
  const ativos = await db.accountingBinding.findMany({ where: { ...unidade, status: 'Active', deletedAt: null } });
  return ativos.filter((ativo) => {
    const payload = JSON.parse(ativo.payload) as { eventBindings: { roleSlots: { accountCode: string }[] }[] };
    return payload.eventBindings.some((eb) => eb.roleSlots.some((r) => CODIGOS_ANTIGOS.has(r.accountCode)));
  });
}

/** Item 9: binding Active com código antigo → recompila com o binding vigente; instalação do kit → versão vigente. */
async function migrarBinding(db: PrismaClient, scope: BindingScope, compile: CompileFn) {
  const unidade = { userId: scope.ownerUserId, unitId: scope.unitId };
  const instalacao = await db.kitInstallation.findFirst({ where: { ...unidade, deletedAt: null } });

  let bindingRecompilado: RelatorioMigracaoUnidade['bindingRecompilado'] = null;
  for (const ativo of await bindingsComCodigoAntigo(db, unidade)) {
    const entry = SECTOR_BINDING_REGISTRY[ativo.sectorKey];
    if (!entry) throw new Error(`binding Active do setor '${ativo.sectorKey}' sem binding vigente no registro — não recompila.`);
    const chart = await db.account.findMany({ where: { ...unidade, deletedAt: null } });
    const result = await compile(scope, {
      sectorKey: ativo.sectorKey,
      operationalSchema: entry.operationalSchema,
      chart: chart.map((a) => ({ code: a.code, nature: a.nature as AccountNature, acceptsEntries: a.acceptsEntries })),
      eventBindings: entry.binding.eventBindings,
    });
    if (result.status !== 'Active') {
      throw new Error(
        `o binding '${ativo.sectorKey}' recompilou como '${result.status}' — bloqueantes: ${JSON.stringify(result.validation.blocking)}`,
      );
    }
    bindingRecompilado = { de: ativo.bindingVersion, para: result.binding.bindingVersion };
  }

  let kitAtualizado: RelatorioMigracaoUnidade['kitAtualizado'] = null;
  const vigente = instalacao ? latestKit(instalacao.kitKey) : undefined;
  if (instalacao && vigente && instalacao.kitVersion < vigente.kitVersion) {
    // Só o v5 tem o mesmo conteúdo do v6 (a v6 é o v5 com os códigos novos): pular de versão mais baixa perderia conteúdo.
    if (instalacao.kitVersion !== ULTIMA_VERSAO_KIT_PRE_L8) {
      throw new Error(`o kit '${instalacao.kitKey}' está no v${instalacao.kitVersion}; só o v${ULTIMA_VERSAO_KIT_PRE_L8} passa ao v${vigente.kitVersion}.`);
    }
    await db.kitInstallation.update({ where: { id: instalacao.id }, data: { kitVersion: vigente.kitVersion } });
    kitAtualizado = { kitKey: instalacao.kitKey, de: instalacao.kitVersion, para: vigente.kitVersion };
  }
  return { bindingRecompilado, kitAtualizado };
}

/** F-L8-12 (a): leva o kit ao v5 pelo upgrade real antes de renomear. Forward/conflito ⇒ lança sem aplicar nada. */
async function prepararKit(db: PrismaClient, scope: BindingScope, upgrade: UpgradeAteV5Fn, hoje: string) {
  const instalacao = await db.kitInstallation.findFirst({ where: { userId: scope.ownerUserId, unitId: scope.unitId, deletedAt: null } });
  if (!instalacao || instalacao.kitVersion >= ULTIMA_VERSAO_KIT_PRE_L8) return null;
  const deployId = `migrate-plano-4-niveis-${hoje}`;
  const dry = await upgrade(scope, 'DRY_RUN', deployId);
  if (dry.status === 'UP_TO_DATE') return null;
  // F-L8-13 (a): de-para de ano congelado não bloqueia — vira pendência do kit; o resto do conflito para a unidade.
  const anoCongelado = dry.report.conflict.filter((c) => c.reason === 'referential_year_frozen').map((c) => c.itemKey);
  const forward = dry.run.counts.forward;
  const conflicts = dry.run.counts.conflicts - anoCongelado.length;
  if (forward > 0 || conflicts > 0) {
    throw new Error(
      `o upgrade do kit até o v${ULTIMA_VERSAO_KIT_PRE_L8} tem ${forward} forward e ${conflicts} conflito(s) — resolva pelo ` +
        'upgradeSectorKitsCli/pendências e rode de novo; nada foi alterado.',
    );
  }
  const applied = await upgrade(scope, 'APPLY', deployId);
  if (applied.status !== 'APPLIED' || applied.run.toVersion !== ULTIMA_VERSAO_KIT_PRE_L8) {
    throw new Error(`o upgrade do kit até o v${ULTIMA_VERSAO_KIT_PRE_L8} terminou '${applied.status}' — nada foi renomeado.`);
  }
  return { kitKey: instalacao.kitKey, de: instalacao.kitVersion, para: ULTIMA_VERSAO_KIT_PRE_L8, pendenciasAnoCongelado: anoCongelado };
}

export async function migrarUnidade(
  db: PrismaClient,
  scope: BindingScope,
  compile: CompileFn,
  upgrade: UpgradeAteV5Fn,
  hoje: string = new Date().toISOString().slice(0, 10),
): Promise<RelatorioMigracaoUnidade> {
  // Pré-condição ANTES de renomear (nunca plano migrado com binding velho): o recompile do binding faz o dry-run de
  // cada evento, que exige o período corrente aberto — o mesmo bloqueio do `activate-default`.
  const unidade = { userId: scope.ownerUserId, unitId: scope.unitId };
  if ((await bindingsComCodigoAntigo(db, unidade)).length > 0) {
    const [year, month] = hoje.split('-').map(Number);
    const periodo = await db.accountingPeriod.findFirst({ where: { ...unidade, year, month } });
    if (periodo?.status !== 'OPEN') {
      throw new Error(
        `pré-condição: o período ${hoje.slice(0, 7)} da unidade precisa estar aberto (hoje: ${periodo?.status ?? 'inexistente'}) — ` +
          'o binding é recompilado com dry-run de lançamento. Abra o período e rode de novo; nada foi alterado.',
      );
    }
  }
  const kitPreparado = await prepararKit(db, scope, upgrade, hoje);
  const plano = await migrarPlano(db, scope.ownerUserId, scope.unitId);
  const binding = await migrarBinding(db, scope, compile);
  return {
    ownerUserId: scope.ownerUserId,
    unitId: scope.unitId,
    criadas: plano.criadas,
    renomeadas: plano.renomeadas,
    personalizadasNaoTocadas: plano.personalizadas,
    bindingRecompilado: binding.bindingRecompilado,
    kitPreparado,
    kitAtualizado: binding.kitAtualizado,
    saldoAntesDepoisIgual: plano.saldoAntesDepoisIgual,
  };
}

/** Unidades com plano de contas: todo par (dono, unidade) que tenha ao menos uma conta viva. */
async function unidadesComPlano(db: PrismaClient): Promise<{ userId: string; unitId: string }[]> {
  return db.account.findMany({ where: { deletedAt: null }, select: { userId: true, unitId: true }, distinct: ['userId', 'unitId'] });
}

function readFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

export async function runCli(argv: string[] = process.argv.slice(2), db: PrismaClient = prisma): Promise<number> {
  const all = argv.includes('--all');
  const ownerUserId = readFlag(argv, '--owner-user-id');
  const unitId = readFlag(argv, '--unit-id');
  if (!all && !(ownerUserId && unitId)) {
    console.error('uso: --all | --owner-user-id <id> --unit-id <id>');
    return 2;
  }
  void KIT_REGISTRY; // o registro precisa estar carregado (kit v6) antes de recompilar
  const dbList = (await db.$queryRawUnsafe('PRAGMA database_list')) as { file: string }[];
  console.log(`banco: ${dbList.map((d) => d.file).filter(Boolean).join(', ')}`);

  const alvos = all ? await unidadesComPlano(db) : [{ userId: ownerUserId!, unitId: unitId! }];
  let falhas = 0;
  for (const alvo of alvos) {
    const scope: BindingScope = { ownerUserId: alvo.userId, actorUserId: alvo.userId, unitId: alvo.unitId };
    try {
      const compile: CompileFn = (s, input) => ApplicationFactory.getInstance().getAccountingBindingCompileService(s).compile(s, input);
      const upgrade: UpgradeAteV5Fn = (s, mode, deployId) =>
        ApplicationFactory.getInstance()
          .getKitUpgradeService(s, (k) => KIT_REGISTRY[k]?.filter((v) => v.kitVersion <= ULTIMA_VERSAO_KIT_PRE_L8))
          .upgrade(s, { mode, deployId, actor: 'migratePlano4NiveisCli' });
      const rel = await migrarUnidade(db, scope, compile, upgrade);
      console.log(`OK ${JSON.stringify(rel)}`);
    } catch (error) {
      falhas++;
      console.error(`FALHOU unidade ${alvo.unitId} (dono ${alvo.userId}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return falhas === 0 ? 0 : 1;
}

if (require.main === module) {
  runCli()
    .then((code) => {
      process.exitCode = code;
    })
    .finally(() => prisma.$disconnect().catch(() => undefined));
}
