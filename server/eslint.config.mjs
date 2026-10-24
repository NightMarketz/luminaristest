// @ts-check
// Luminaris server — LAYER-GATE lint.
//
// Escopo deliberadamente mínimo: este config NÃO adota o ruleset recomendado do
// typescript-eslint (o backend nunca foi lintado; ligá-lo vermelharia o CI com
// centenas de findings fora do escopo desta fatia). Ele liga SÓ as regras de
// CAMADA mecanizáveis do contrato (.claude/skills/_ARCHITECTURE-CONTRACT.md §2),
// transformando convenção em gate determinístico. Spec: docs/architecture/lint-layer-gate.md
//
// Pagamento de dívida e ampliação do ruleset são fatias próprias — não aqui.

import tseslint from 'typescript-eslint';

/**
 * R1 — Singleton Prisma confinado a Repository.
 * Repository é a única camada com acesso a `prisma.*` (contrato §2). Controllers
 * e Services orquestram via repository. `import type` de `generated/prisma` (tipos)
 * NÃO é alvo — só o singleton de acesso a dados (`lib/prisma`, default export).
 */
const PRISMA_SINGLETON = {
  group: ['@/lib/prisma', '**/lib/prisma', '*/lib/prisma'],
  message:
    'Layer boundary (contrato §2): só Repository importa o singleton Prisma. ' +
    'Mover este acesso para um Repository — controllers/services não falam com Prisma direto.',
};

/**
 * R1b — Service não conhece Express.
 * Service é regra de negócio pura: sem req/res/Express (contrato §2). HTTP fica no Controller.
 */
const EXPRESS = {
  name: 'express',
  message: 'Layer boundary (contrato §2): Service não importa Express (sem req/res). HTTP fica no Controller.',
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'generated/**', 'node_modules/**', 'coverage/**', '**/*.js', '**/*.mjs'],
  },
  // Parser TS para todo o src, sem regras de base (slice = só camada).
  // O plugin @typescript-eslint é REGISTRADO mas suas regras ficam TODAS off:
  // o codebase já tem `// eslint-disable @typescript-eslint/no-explicit-any` espalhados;
  // sem o plugin registrado o eslint 9 erraria "rule not found" nessas diretivas.
  // reportUnusedDisableDirectives=off: diretivas de regras que esta fatia não habilita
  // (no-var, no-control-regex…) não são problema desta fatia.
  {
    files: ['src/**/*.ts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { sourceType: 'module' },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {},
  },
  // Controllers: proibido importar o singleton Prisma (Express é legítimo aqui).
  {
    files: ['src/controllers/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [PRISMA_SINGLETON] }],
    },
  },
  // Services: proibido Prisma singleton + Express.
  {
    files: ['src/**/services/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [PRISMA_SINGLETON], paths: [EXPRESS] }],
    },
  },
  // Nó OBS, item 9 (F-OBS-8, dono 2026-10-23): log de produção passa pelo logger (contexto + redação +
  // arquivo de erro). Fora: CLIs e scripts (saída de terminal), config/env.ts (roda antes do logger) e
  // o próprio sink.
  {
    files: ['src/**/*.ts'],
    ignores: ['src/jobs/*Cli.ts', 'src/scripts/**', 'src/config/env.ts', 'src/lib/logger.ts'],
    rules: { 'no-console': 'error' },
  },
  // ADR-OBSERVABILIDADE OBS-R8 (F-OBS-13 a, dono 2026-10-23): nenhum `catch` silencioso. Um `catch {}` vazio
  // (comentário conta como corpo) e um `.catch(...)` cuja arrow devolve undefined/null/literal sem chamar nada
  // reprovam. Quem engole de propósito — o erro é tratado por outro caminho — leva supressão marcada
  // (`-- SANCTIONED: <por quê>`) e entrada no bloco debt-ledger de docs/architecture/lint-layer-gate.md.
  // Fora, pela exceção do OBS-R1: CLIs e scripts.
  {
    files: ['src/**/*.ts'],
    ignores: ['src/jobs/*Cli.ts', 'src/scripts/**'],
    rules: {
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-restricted-syntax': [
        'error',
        ...[
          "ArrowFunctionExpression[body.type='Literal']",
          "ArrowFunctionExpression[body.type='Identifier'][body.name='undefined']",
          "ArrowFunctionExpression[body.type='UnaryExpression'][body.operator='void']",
          "ArrowFunctionExpression[body.type='BlockStatement'][body.body.length=0]",
        ].map((arrow) => ({
          selector: `CallExpression[callee.property.name='catch'] > ${arrow}.arguments`,
          message:
            'OBS-R8 (ADR-OBSERVABILIDADE): `.catch` silencioso. Registre com logger.warn({ error }) ou acima; se o erro ' +
            'é tratado por outro caminho, suprima com `-- SANCTIONED: <por quê>` e declare no bloco debt-ledger.',
        })),
      ],
    },
  },
  // Testes não são camada de produção — fora do gate.
  {
    files: ['src/**/__tests__/**/*.ts', 'src/**/*.test.ts'],
    rules: { 'no-restricted-imports': 'off', 'no-console': 'off', 'no-empty': 'off', 'no-restricted-syntax': 'off' },
  },
);
