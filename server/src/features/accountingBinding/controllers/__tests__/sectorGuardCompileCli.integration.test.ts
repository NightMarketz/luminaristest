/**
 * TESTE-GUARDA (sessao-instrumentacao, 2026-10-14) — lacuna do GAP-MAP "2º setor Active pelo POST /compile e pelo CLI".
 * VERMELHO de propósito até a sessão de correção (`it.failing`: a CI fica verde enquanto a lacuna existe; o conserto
 * troca para `it`); NÃO conserta nada. Motivo da falha, medido com `it` em 2026-10-14: a asserção final recebe
 * `recarga: "AccountingEventMapperCollisionError: Dois mappers registrados para o evento 'sale.finalized' na unidade …"`
 * e dois setores Active (`aestheticClinic`, `beautySalon`); as premissas (um setor ⇒ recarga 'ok') passam.
 *
 * O LAC-B PR-0 (#680) pôs a guarda de setor único por unidade (409 BINDING_SECTOR_CONFLICT, re-checada na tx do `begin`
 * do kit) só em `POST /accounting-binding/activate-default`. Os outros dois caminhos que ativam binding ficaram de fora
 * por decisão do dono (F-I4-4 → a; BRIEF da tela §8; EMENDA-1 §6):
 *   - `POST /accounting-binding/compile` chama `BindingCompileService.compile()` direto, sem olhar outro setor;
 *   - o CLI (`activateAccountingBindingCli` → `installSectorKitCli.runInstall`) chama `install()` SEM `exclusiveSector`.
 *     O "um kit por unidade" (item 9) o segura quando a unidade tem `KitInstallation`; a unidade cujo salão foi
 *     ativado pelo `/compile` (ou legada) não tem, e o CLI grava o 2º setor.
 * Salão e clínica emitem os MESMOS 6 eventKey (`sale.finalized`…`sale.package.expired`). Dois `Active` na unidade ⇒
 * `initializeAccountingSyncFromBindings()` (boot e `runtime/mapperReload.ts`) lança
 * `AccountingEventMapperCollisionError`: o boot de TODOS os tenants cai, e todo activate-default seguinte volta
 * `Draft ACCOUNTING_SYNC_RELOAD_FAILED`.
 *
 * Comportamento correto esperado (o que a asserção final afirma): depois de pedir o 2º setor por esses caminhos, a
 * unidade segue com UM setor Active e o registro de mappers recarrega sem erro. A asserção não escolhe o desenho do
 * conserto (recusar com 409, como o activate-default, é o precedente — a escolha é da sessão de correção/dono).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { SECTOR_BINDING_REGISTRY } from '@/features/accountingBinding/fixtures/sectorBindingRegistry';
import { runCli } from '@/jobs/activateAccountingBindingCli';

const app = makeApp();
const UNIT_COMPILE = 'unit-guarda-compile';
const UNIT_CLI = 'unit-guarda-cli';

let dono: { id: string; username: string };

/** Mesmo relógio do dry-run do validador (UTC) — o mês que o compile exige aberto. */
const hoje = () => {
  const [year, month] = new Date().toISOString().slice(0, 10).split('-').map(Number);
  return { year, month };
};

const perfilFiscal = (unitId: string) =>
  prisma.fiscalProfile.create({
    data: { userId: dono.id, unitId, regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false },
  });

/** `POST /compile` com o binding padrão do setor e o plano de contas REAL da unidade (o que um cliente da API manda). */
async function compilar(unitId: string, sectorKey: string) {
  const entry = SECTOR_BINDING_REGISTRY[sectorKey];
  const chart = (await prisma.account.findMany({ where: { userId: dono.id, unitId, deletedAt: null } })).map((a) => ({
    code: a.code,
    nature: a.nature,
    acceptsEntries: a.acceptsEntries,
  }));
  return request(app)
    .post('/api/accounting-binding/compile')
    .set(authHeader(dono))
    .send({ unitId, sectorKey, operationalSchema: entry.operationalSchema, chart, eventBindings: entry.binding.eventBindings });
}

const setoresAtivos = async (unitId: string) =>
  (await prisma.accountingBinding.findMany({ where: { userId: dono.id, unitId, status: 'Active', deletedAt: null } }))
    .map((b) => b.sectorKey)
    .sort();

/** A recarga do boot/runtime: 'ok' ou o nome + mensagem do erro (é isto que a falha tem de mostrar). */
const recarga = () =>
  ApplicationFactory.getInstance()
    .initializeAccountingSyncFromBindings()
    .then(
      () => 'ok',
      (e: Error) => `${e.constructor.name}: ${e.message}`,
    );

describe('GUARDA — 2º setor Active na mesma unidade pelo POST /compile e pelo CLI (sem guarda de setor nem recarga)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'guarda', username: 'lacb-guarda-compile-cli', email: 'lacb-guarda@test.local', password: 'x', role: 'USER' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.failing('POST /compile: salão Active (activate-default) + clínica pelo /compile ⇒ a unidade segue com UM setor e a recarga não colide', async () => {
    await perfilFiscal(UNIT_COMPILE);
    const salao = await request(app)
      .post('/api/accounting-binding/activate-default')
      .set(authHeader(dono))
      .send({ unitId: UNIT_COMPILE, installChartIfEmpty: true, openCurrentPeriodIfMissing: true });
    expect(salao.status).toBe(200);
    expect(salao.body.data.status).toBe('Active');
    expect(await recarga()).toBe('ok'); // premissa: com um setor só, o registro monta

    try {
      await compilar(UNIT_COMPILE, 'aestheticClinic');
      expect({ setores: await setoresAtivos(UNIT_COMPILE), recarga: await recarga() }).toEqual({
        setores: [expect.any(String)],
        recarga: 'ok',
      });
    } finally {
      // Isola o caso seguinte: a colisão desta unidade derrubaria a recarga (global) do caso do CLI.
      await prisma.accountingBinding.updateMany({ where: { userId: dono.id, unitId: UNIT_COMPILE }, data: { deletedAt: new Date() } });
    }
  });

  it.failing('CLI: salão Active pelo /compile (unidade sem KitInstallation) + clínica pelo CLI ⇒ a unidade segue com UM setor e a recarga não colide', async () => {
    await ApplicationFactory.getInstance()
      .getPostingService()
      // Escopo literal (mesmo shape do `resolveAccountingScope`): importar de features/accounting fura o importBoundary.test.ts.
      .ensureChartOfAccounts({
        ownerUserId: dono.id,
        actorUserId: dono.id,
        unitId: UNIT_CLI,
        ledgerCode: 'DEFAULT',
        baseCurrencyCode: 'BRL',
        timeZone: 'America/Sao_Paulo',
      });
    const { year, month } = hoje();
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT_CLI, year, month, status: 'OPEN', openedAt: new Date() } });
    await perfilFiscal(UNIT_CLI);

    const salao = await compilar(UNIT_CLI, 'beautySalon');
    expect(salao.status).toBe(200);
    expect(salao.body.data.binding.status).toBe('Active');
    expect(await prisma.kitInstallation.count({ where: { userId: dono.id, unitId: UNIT_CLI } })).toBe(0);
    expect(await recarga()).toBe('ok'); // premissa: com um setor só, o registro monta

    await runCli(['--owner-user-id', dono.id, '--unit-id', UNIT_CLI, '--sector-key', 'aestheticClinic']);

    expect({ setores: await setoresAtivos(UNIT_CLI), recarga: await recarga() }).toEqual({
      setores: [expect.any(String)],
      recarga: 'ok',
    });
  });
});
