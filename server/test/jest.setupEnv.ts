import { join } from 'path';
import { tmpdir } from 'os';

// Runs as a Jest `setupFiles` entry — BEFORE the module graph (and thus `lib/prisma`) loads.
// Points the Prisma singleton at an isolated SQLite test database so integration tests never
// touch the dev DB. The relative `file:` URL resolves against the schema.prisma directory
// (server/prisma) for both the Prisma CLI and the generated client, so they always agree.
process.env.DATABASE_URL = 'file:./test-integration.db';
process.env.NODE_ENV = 'test';
// lib/jwt fail-closes on secrets shorter than 32 chars — keep this dummy long enough.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-0123456789abcdef0123456789';
// RAG-PR-A: o índice de vetores (sqlite-vec) é um arquivo SQLite próprio. Cada arquivo de teste ganha o seu, para
// nenhuma suíte compartilhar vetores com outra (instrução do dono, 2026-11-06).
process.env.VECTOR_DB_PATH = join(tmpdir(), `luminaris-vec-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
// O construtor de OpenAIService aborta sem chave, e worktree não tem server/.env. Chave fictícia como a do CI
// (ci.yml: OPENAI_API_KEY: ci-dummy-openai-key); nunca sobrescreve uma chave já definida.
process.env.OPENAI_API_KEY ??= 'ci-dummy-openai-key';
