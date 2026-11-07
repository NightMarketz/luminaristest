# `src/lib` — Cross-cutting building blocks

Shared, framework-level code used across features. Feature business logic does **not** live here — it
lives in `src/features/*`. This folder holds dependency injection, error handling, auth primitives,
logging and the external-service clients (OpenAI) and the local vector index (sqlite-vec).

> High-level overview in [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) §5–§6. This README is the
> file-level map.

## Contents

| File / dir | Role |
|---|---|
| `factory.ts` | **`ApplicationFactory`** singleton (Service Locator / DI). Builds the dependency graph once — repositories → policies → services — and exposes `getXService()` getters. `getFactory()` is the entry point. Adding a feature = register its repo/policy/service here. |
| `errors.ts` | Custom error classes: `AppError` (base, `statusCode` + `errorCode`) and `NotFoundError` (404), `ForbiddenError` (403), `UnauthorizedError` (401), `ValidationError` (400), `ConflictError` (409), `ServiceError` (500). The domain **throws** these; never returns HTTP directly. |
| `apiUtils.ts` | **`handleApiError(err, res)`** — central translator: maps `AppError`/`ZodError`/Prisma `P2002` to `{ code, message }` + status. Controllers call it in their `catch`. |
| `jwt.ts` | `generateToken` / `verifyToken` / `getAuthToken`. **Fail-closed secret:** `JWT_SECRET` is required in production (the app refuses to start without it); dev/test use a clearly-named insecure fallback. |
| `authUtils.ts` | `getUserContextFromRequest(req)` — reads the `x-user-*` headers injected by `authMiddleware` into a typed `UserContext`. Also re-exports the `UserContext` type. |
| `logger.ts` | `logger.info/warn/error/debug(message, context)` — structured JSON output. Use it, never `console`. |
| `prisma.ts` | `PrismaClient` **singleton** (global cache in dev) — avoids exhausting the connection pool. The only place the client is constructed. |
| `monitoring.ts` | Hooks/config for performance & error monitoring. |
| `openai/OpenAIService.ts` | Wrapper around the OpenAI API (text analysis, structured extraction, chat completions); centralizes API-key use, retries and error handling. |
| `vector/` | Vector index (sqlite-vec, own SQLite file) and embeddings — see below. |
| `embedding/` | `EmbeddingProvider` port, OpenAI adapter @768, `InstanceEmbeddingKeyResolver`, `UserEmbedder` (BE-INCR-RAG-DOCUMENTOS §2.3). |

### `vector/`

| File | Role |
|---|---|
| `sqliteVec.ts` | `VecIndex`: opens `VECTOR_DB_PATH` (default `vectors.db` next to the `DATABASE_URL` file) with `better-sqlite3` + `sqlite-vec` and creates `chunk_vec` idempotently. `getVecIndex()` runs at **bootstrap** in `server.ts`, never on import. Prisma never opens this file. |
| `embedding.ts` | `EmbeddingOpenAIService` — turns text chunks into embedding vectors via OpenAI. |
| `chunking.ts` | Splits long text into smaller chunks before embedding (token-limit safety). |

## Conventions

- **DI over imports:** resolve services via `getFactory()`, don't `new` them in controllers.
- **Typed errors only:** throw an `AppError` subclass; let `handleApiError` map it. Never leak
  `error.message` to clients for unexpected errors.
- **`logger`, not `console`.** Structured context as the second argument.
- **No external connections on import:** external-infra init (e.g. the vector index) runs at bootstrap, not as an
  import side effect — keeps the module graph testable.
