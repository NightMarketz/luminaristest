/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS — PR-0, item 0: fotografia de referência da instalação de salão e clínica.
 *
 * Pré-requisito dos testes de igualdade dos PR-1..5: nenhuma instalação de salão/clínica pode mudar de comportamento
 * quando o registro de módulos for generalizado. A fixture `fixtures/suite-payload-baseline.json` foi capturada ANTES
 * de qualquer mudança de registro e só pode ser alterada num PR que mude comportamento de propósito, com a
 * justificativa escrita no diff (BRIEF §10, risco principal).
 *
 * O que a fotografia guarda, por suíte × cenário (default; sem `campaigns`; sem `goals`; sem `commissions`):
 * Cenários: `rapido` (modo Rápido por `suiteKey`, sem remoções) e `default`/`sem-*` (Controle Total, `mode: 'custom'`).
 *  - `response`: `data.modules` e a lista de tabelas de negócio que o create devolve;
 *  - `installed`: as tabelas que o create REALMENTE gravou (controller → provisionamento → `installPresetAsSystem`),
 *    com `name`, `category` e `schema`; o id das relações é trocado pelo `internalName` do alvo (o id é aleatório).
 *    Isso inclui a variante de `saleItems` escolhida pelo instalador e as relações opcionais descartadas;
 *  - `locks`: `computeTableLocks` sobre o conjunto composto (default de módulos ∪ tabelas da suíte), com todas as
 *    tabelas mantidas. A trava vem de `meta`, que o create descarta antes de gravar; por isso esta parte compõe as
 *    tabelas com as mesmas funções públicas do controller (`resolveModuleSelection`, `composeModuleTables`).
 *
 * Regenerar (somente num PR que mude comportamento de propósito): `UPDATE_BASELINE=1 npx jest --selectProjects
 * integration --runInBand src/features/dynamicTables/presets/__tests__/suitePayloadBaseline.integration.test.ts`.
 */
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { CoreSystemPreset, tablePresetSuites } from '@/features/dynamicTables/presets';
import { composeModuleTables } from '@/features/dynamicTables/presets/modules/registry';
import { resolveModuleSelection } from '@/features/dynamicTables/presets/modules/moduleSelection';
import { computeTableLocks } from '@/features/dynamicTables/presets/removability';

const FIXTURE = path.join(__dirname, 'fixtures', 'suite-payload-baseline.json');
const SUITES = ['beautySalon', 'aestheticClinic'] as const;
const SCENARIOS: { name: string; removedTables: string[]; quick?: boolean }[] = [
  { name: 'rapido', removedTables: [], quick: true },
  { name: 'default', removedTables: [] },
  { name: 'sem-campaigns', removedTables: ['campaigns'] },
  { name: 'sem-goals', removedTables: ['goals'] },
  { name: 'sem-commissions', removedTables: ['commissions'] },
];

const app = makeApp();
let n = 0;
const novoUsuario = () => {
  n += 1;
  return prisma.user
    .create({ data: { name: `base-${n}`, username: `base-user-${n}`, email: `base-${n}@test.local`, password: 'x', role: 'USER' } })
    .then((u) => ({ id: u.id, username: u.username, role: u.role }));
};

const sortKeys = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, val]) => [k, sortKeys(val)]),
    );
  }
  return v;
};

async function snapshotInstalled(userId: string) {
  const rows = await prisma.dynamicTable.findMany({ where: { userId } });
  const nameById = new Map(rows.map((r) => [r.id, r.internalName ?? r.name]));
  let json = JSON.stringify(rows.map((r) => ({ internalName: r.internalName, name: r.name, category: r.category, schema: r.schema })));
  for (const [id, internalName] of nameById) json = json.split(id).join(`@@id:${internalName}`);
  const list = JSON.parse(json) as { internalName: string; name: string; category: string; schema: unknown }[];
  return Object.fromEntries(
    list.sort((a, b) => a.internalName.localeCompare(b.internalName)).map((t) => [t.internalName, sortKeys({ name: t.name, category: t.category, schema: t.schema })]),
  );
}

function snapshotLocks(suiteKey: string) {
  const suite = Object.values(tablePresetSuites).flatMap((c) => Object.values(c)).find((s) => s.key === suiteKey)!;
  const installed = resolveModuleSelection([], suite.modules ?? []);
  const tables = { ...CoreSystemPreset.tables, ...composeModuleTables(installed), ...suite.tables };
  return computeTableLocks(tables, new Set(Object.keys(tables)));
}

describe('PR-0 — fotografia da instalação de salão e clínica', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('o payload atual é igual à fotografia', async () => {
    const actual: Record<string, unknown> = {};
    for (const suiteKey of SUITES) {
      const perScenario: Record<string, unknown> = {};
      for (const sc of SCENARIOS) {
        const u = await novoUsuario();
        const r = await request(app)
          .post('/api/dashboard/create')
          .set(authHeader(u as never))
          .send(sc.quick ? { suiteKey, unit: { name: 'Matriz' } } : { mode: 'custom', presetKey: suiteKey, removedTables: sc.removedTables, unit: { name: 'Matriz' } });
        expect({ suiteKey, scenario: sc.name, status: r.status, body: r.status === 201 ? undefined : r.body }).toEqual({ suiteKey, scenario: sc.name, status: 201, body: undefined });
        perScenario[sc.name] = {
          response: { modules: r.body.data.modules, business: [...r.body.data.tables.business].sort() },
          installed: await snapshotInstalled(u.id),
        };
      }
      actual[suiteKey] = { scenarios: perScenario, locks: sortKeys(snapshotLocks(suiteKey)) };
    }

    if (process.env.UPDATE_BASELINE === '1') {
      fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
      fs.writeFileSync(FIXTURE, `${JSON.stringify(actual, null, 2)}\n`, 'utf8');
    }
    const baseline = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    expect(JSON.parse(JSON.stringify(actual))).toEqual(baseline);
  }, 180000);
});
