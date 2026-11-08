# Testing — Luminaris Server

How the backend is tested: philosophy, tools, structure, conventions, and how to write/run tests.
Living document — update it in the same PR that changes the testing strategy or infra.

> For the app architecture itself, see [`ARCHITECTURE.md`](./ARCHITECTURE.md). The **mandatory
> per-feature** test standard is in [`src/features/FEATURE_TEMPLATE.md`](./src/features/FEATURE_TEMPLATE.md) §10.
> **Which tests to run for a given change** (server, front, scripts, screen, runbooks) is in
> [`docs/operating-manual/TESTES.md`](../docs/operating-manual/TESTES.md).

---

## 1. Philosophy

We test **behavior and contracts, prioritized by risk** — we do not chase a uniform coverage %.
Three principles:

1. **Observable behavior, not implementation.** Tests hit the public API (service / route), so an
   internal refactor that preserves behavior does not break the tests.
2. **Depth by risk.** Two axes are "if this breaks, it's a catastrophe" and get **exhaustive**
   coverage: (a) **Tier-0** — multi-tenant isolation (a user must never read/write another's data);
   (b) **governance that affects money/integrity** (e.g. `noOverlap`, `immutableAfter`,
   `deleteConstraints`). The rest is covered proportionally.
3. **Tests are part of the PR contract.** No feature is "gold" without the minimum test set (§5).

Coverage is a **hole-detector**, not a quality meter: the real bar is *does every README invariant
have a test that fails if the invariant breaks?*

---

## 2. Tools

| Tool | Role |
|---|---|
| **Jest** (`jest@30`) | test runner, assertions, coverage, watch, projects |
| **@swc/jest** | transpiles TypeScript on the fly (no prior build, no type-check — types are gated by `tsc --noEmit -p tsconfig.test.json`) |
| **supertest** | fires real HTTP requests against the Express app (contract layer) |
| **Prisma + SQLite** | a **real**, isolated database per run (`test-integration.db`) for integration tests |
| **`@types/jest`, `@types/supertest`** | types for the Jest globals and supertest |

We do not mock the database: integration tests run against real SQLite (a copy of a template DB
built once per schema hash, see §5), because a fake repository "lies" — it misses transaction errors, constraints, and the real Prisma
path. Mocks are reserved for expensive/unavailable external dependencies (OpenAI, Qdrant) when needed.

---

## 3. The pyramid (mapped onto the architecture layers)

Each app layer has the test type with the best return:

| Layer | Test type | What it covers | Touches DB? |
|---|---|---|---|
| **Policy** (`policies/`) | **pure unit** (`*.spec.ts`) | authorization matrix (role × target × null) | no |
| **DTO** (`dtos/`) Zod | **pure unit** | boundary rejection/coercion | no |
| **pure lib/utils** | **pure unit** | pure functions (cpf/cnpj, dates) | no |
| **Service + governance + plugins** | **integration** (`*.integration.test.ts`) | Tier-0, business rules, transactions, typed errors | **yes** |
| **Repository** | (covered via the service) | — | (yes) |
| **Controller + routes + middleware** | **HTTP/contract** (`*.integration.test.ts` + supertest) | 401/403/400, `{success,data}` envelope, error→status, secret leakage | **yes** |

```
        ╱ E2E/Smoke ╲          (future) 1 critical end-to-end flow
      ╱─────────────╲
     ╱  HTTP/contract ╲        supertest: authz + DTO + error→HTTP
    ╱─────────────────╲
   ╱ Service integration ╲ ⭐   the bulk of the value: Tier-0, governance, transactions
  ╱─────────────────────╲
 ╱ Unit (policy/dto/util) ╲    wide base, runs in milliseconds
╱───────────────────────────╲
```

---

## 4. File structure

```
server/
├── jest.config.js              # 2 projects (unit / integration) + coverage + ESM transform
├── tsconfig.test.json          # TS config for tests only (rootDir ., allowJs, @test/* alias)
├── src/
│   ├── app.ts                  # createApp(): builds the Express app WITHOUT listen → used by supertest
│   ├── server.ts               # bootstrap: imports app, listen(), external-infra init (Qdrant)
│   └── features/<f>/**/__tests__/   # tests co-located next to the code they cover
│       ├── *.spec.ts                #   pure unit (no DB)
│       └── *.integration.test.ts    #   integration (DB/HTTP)
└── test/
    ├── jest.setupEnv.ts        # setupFiles: points DATABASE_URL at the test DB, NODE_ENV=test
    └── helpers/                # shared infra (importable via @test/helpers)
        ├── db.ts               #   pushTestSchema · resetDb · disconnectDb
        ├── auth.ts             #   signToken · authHeader · ctxFor (real JWT, same secret as the app)
        ├── seed.ts             #   seedUser (inserts via Prisma, returns the generated cuid)
        ├── app.ts              #   makeApp (instantiates the real app for supertest)
        └── index.ts            #   barrel
```

**Co-location:** tests live in `__tests__/` next to the code, not in a parallel `tests/` tree. Easier
to find a file's test and keeps the context together.

---

## 5. Conventions

### Suffixes (decide which *project* a test runs in)
- **`*.spec.ts`** → **pure unit**, no database. Runs in the `unit` project (fast, parallel, watch).
- **`*.integration.test.ts`** → touches **DB or HTTP**. Runs in the `integration` project (serial, isolated DB).
- A bare `*.test.ts` (without `.integration`) is also treated as unit — used by some `analytics` tests.
  For any new test that touches infra, **use `.integration.test.ts`**.

### Test database
- A single SQLite file (`prisma/test-integration.db`), pointed at by `test/jest.setupEnv.ts`.
- **Template DB:** `test/helpers/templateDb.ts` runs `prisma db push` + the SQL seeds **once per schema
  hash** (warmed in `test/jest.integrationGlobalSetup.ts`, which also takes a heavy-work slot). Each file's
  `pushTestSchema()` then only truncates the `.db`/`-wal`/`-shm` and copies the template (milliseconds;
  truncate, not delete, because of EBUSY on Windows).
- Locally, run integration **one file at a time with `--runInBand`**. In CI it runs in 4 shards on
  separate runners (separate SQLite each).
- Each file: `pushTestSchema()` in `beforeAll`, `resetDb()` in `afterEach`, `disconnectDb()` in `afterAll`.
  `resetDb()` also restores the seeded legal parameters and reloads their cache.
- It is git-ignored.

### Minimum set per CRUD feature (four levels)
1. **Policy unit** — `policies/__tests__/<Entity>Policy.spec.ts`. Ref.:
   [`UserPolicy.spec.ts`](./src/features/users/policies/__tests__/UserPolicy.spec.ts).
2. **DTO unit** — `dtos/__tests__/<Entity>Dto.spec.ts`. Ref.:
   [`UserDto.spec.ts`](./src/features/users/dtos/__tests__/UserDto.spec.ts).
3. **Service integration** — `services/__tests__/<Entity>Service.integration.test.ts` (Tier-0 +
   business rules). Ref.:
   [`UserService.integration.test.ts`](./src/features/users/services/__tests__/UserService.integration.test.ts).
4. **HTTP/contract** — `controllers/__tests__/<feature>.routes.integration.test.ts`. Ref.:
   [`users.routes.integration.test.ts`](./src/controllers/__tests__/users.routes.integration.test.ts).

> **Non-CRUD features** (analytics, reports, chat, interview) have no Policy/Repository (see
> `ARCHITECTURE.md` §9), so they use a subset: DTO unit + computation tests + HTTP contract.

---

## 6. How to run

**Locally, always scoped** (owner, 2026-11-03: the full suite is too heavy for the machine). The full
suite is blocked outside CI unless `FULL_SUITE=1` (`scripts/test-scope-guard.cjs`). The path goes
**before** `--selectProjects`, or Jest swallows it and runs everything.

```bash
npx jest src/features/users --selectProjects unit                 # unit, one folder or file
npx jest src/controllers/__tests__/users.routes.integration.test.ts --selectProjects integration --runInBand
npm run test:changed                                              # unit tests related to the diff vs origin/main (NOT integration)
npm run test:watch                                                # unit in watch mode
```

**CI** does not call these scripts. It runs `npx jest --selectProjects <unit|integration> --shard=N/M
--detectOpenHandles --coverage` in 7 shards (3 unit + 4 integration) and sums coverage in a separate job
(`scripts/coverage-gate.js`). `npm test` / `npm run test:integration` (4 sequential shards with 8 GB heap)
reproduce the full run locally only with `FULL_SUITE=1`.

Mutation testing (Stryker, unit project only, never in CI): `npm run test:mutation` (only the lines changed
vs origin/main), `npm run test:mutation:slices` (the full run, in budgeted slices).

---

## 7. Test helpers (`@test/helpers`)

```ts
import { makeApp, seedUser, authHeader, ctxFor, pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
```

| Helper | Use |
|---|---|
| `makeApp()` | instantiates the **real** Express app (same middleware/routes/errors as prod) for supertest |
| `seedUser({ username, role?, email?, name? })` | creates a user directly via Prisma; returns the row (with generated cuid `id`) |
| `signToken(actor)` / `authHeader(actor)` | real JWT (same secret/Bearer the middleware verifies); `authHeader` returns `{ Authorization }` |
| `ctxFor(actor)` | builds a `UserContext` as the controller would resolve it — to test the service directly |
| `pushTestSchema()` | copies the template DB over the test DB (call in `beforeAll`) |
| `resetDb()` | deletes all rows in FK order and restores the seeded legal parameters (call in `afterEach`) |
| `applyMigrations(dbPath, dirs)` (`test/helpers/migrations.ts`) | applies real migrations in one spawn, for tests of a migration itself |
| `fakeSefaz`, `nfeSignature`, `fiscalCertificate`, `reinfXsd`, `legalParams`, `ecfPresumidoOraculo` | domain fakes and fixtures (files in `test/helpers/`) |
| `disconnectDb()` | closes the Prisma connection (call in `afterAll`) |

### Skeleton of an HTTP test

```ts
import request from 'supertest';
import { Role } from '@/features/users/models/User.model';
import { makeApp, pushTestSchema, resetDb, disconnectDb, seedUser, authHeader } from '@test/helpers';

const app = makeApp();
beforeAll(() => { pushTestSchema(); }, 120000);
afterEach(async () => { await resetDb(); });
afterAll(async () => { await disconnectDb(); });

it('403 for a USER on an admin-only route', async () => {
  const u = await seedUser({ username: 'bob', role: Role.USER });
  const res = await request(app).get('/api/users').set(authHeader({ id: u.id, username: u.username, role: Role.USER }));
  expect(res.status).toBe(403);
});
```

---

## 8. Coverage (anti-regression ratchet)

`jest.config.js` sets `coverageThreshold.global` **just below the current baseline** (50% statements /
36% branches / 46% functions / 51% lines on 2026-11-04). CI enforces it on the **sum** of the 7 shards
(job `server-coverage`, `scripts/coverage-gate.js`); a single shard is partial by definition. As new
features get tests, **raise those numbers** to lock the gain.

Reports: terminal summary + `coverage/lcov-report/index.html` (git-ignored).

---

## 9. Why tests are NOT enough for "production-ready"

Tests are **necessary, not sufficient**. They prove the intended behavior works; they do not cover
the unforeseen or the operational. Before production, beyond tests, you still need:

- **Security:** `npm audit`, rate limiting, upload limits, secrets, `security-review` per feature.
- **SQLite → PostgreSQL migration:** SQLite hides races/constraints that Postgres exposes (partial
  unique index, TOCTOU, `P2025` mapping). See `REVIEW_BACKLOG.md` §3.
- **Observability:** error tracking, a health check that probes dependencies, metrics.
- **External-dependency resilience:** timeout/retry/degradation for OpenAI and Qdrant.
- **CI as a gate:** run `npm test` + `tsc --noEmit` + coverage on every PR, blocking merge.

---

## 10. Infra notes (recorded decisions)

- **`app.ts` split from `server.ts`:** `createApp()` builds the app without `listen()`, so supertest
  tests the **same** production app without starting a server or holding a port.
- **Infra init at bootstrap, not on import:** Qdrant initialization is called in `server.ts` (in
  `listen`), never as an `import` side effect. Importing the app (routes → factory → vector repos)
  must not open an external connection — required for tests and good coupling hygiene.
- **ESM-only deps** (`uuid` v13, `@qdrant/js-client-rest`) ship no CommonJS build; Jest's
  `transformIgnorePatterns` lets only those packages through to @swc/jest.
- **The production build excludes tests:** `tsconfig.json` excludes `__tests__/`, `*.test.ts`,
  `*.spec.ts` — `dist/` ships no test code.
