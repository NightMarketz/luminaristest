/**
 * BE-INCR-TEAMMATES PR-1 — item 8 + ressalva da emenda de 30/10 (F-RAG-5b): nenhuma chave de IA da plataforma no
 * caminho do teammate. Cobre `lib/llm/**` e `features/teammates/**`; NÃO cobre `lib/embedding/**` (o
 * `EmbeddingKeyResolver` do RAG pode ler a `OPENAI_API_KEY` da instância, que é do cliente — ADR-M2 (3)).
 *
 * Reprova, em arquivo de produção do escopo: leitura de `OPENAI_API_KEY`; import do `OpenAIService` (o construtor dele
 * lê a chave da instância); import direto de `lib/embedding/**` (o runner só chega lá pela ferramenta).
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../..');
const SCOPE = ['lib/llm', 'features/teammates'];

const RULES: Array<{ label: string; re: RegExp }> = [
  { label: 'lê OPENAI_API_KEY', re: /OPENAI_API_KEY/ },
  { label: 'importa OpenAIService', re: /from\s+['"][^'"]*openai\/OpenAIService['"]/ },
  { label: 'importa lib/embedding direto', re: /from\s+['"][^'"]*lib\/embedding[^'"]*['"]/ },
];

/** Arquivos (caminho relativo a src/, com `/`) × conteúdo → violações. Puro, para o teste provar o falsificador. */
export function findPlatformKeyViolations(files: Array<{ rel: string; content: string }>): string[] {
  const out: string[] = [];
  for (const f of files) {
    const inScope = SCOPE.some((s) => f.rel === s || f.rel.startsWith(`${s}/`));
    if (!inScope || /__tests__\//.test(f.rel) || !/\.ts$/.test(f.rel)) continue;
    for (const r of RULES) if (r.re.test(f.content)) out.push(`${f.rel}: ${r.label}`);
  }
  return out;
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

function realFiles(): Array<{ rel: string; content: string }> {
  return SCOPE.flatMap((s) => walk(path.join(SRC, s))).map((full) => ({
    rel: path.relative(SRC, full).split(path.sep).join('/'),
    content: fs.readFileSync(full, 'utf8'),
  }));
}

describe('item 8 — caminho do teammate não lê chave de IA da plataforma', () => {
  it('o código real de lib/llm/** e features/teammates/** está limpo (e o escopo não é vazio)', () => {
    const files = realFiles();
    expect(files.some((f) => f.rel.startsWith('lib/llm/') && !f.rel.includes('__tests__'))).toBe(true);
    expect(files.some((f) => f.rel.startsWith('features/teammates/services/'))).toBe(true);
    expect(findPlatformKeyViolations(files)).toEqual([]);
  });

  it('falsificador: leitura de prova de OPENAI_API_KEY no runner → vermelho', () => {
    const probe = { rel: 'features/teammates/services/TeammateRunner.ts', content: 'const k = process.env.OPENAI_API_KEY;' };
    expect(findPlatformKeyViolations([...realFiles(), probe])).toEqual([
      'features/teammates/services/TeammateRunner.ts: lê OPENAI_API_KEY',
    ]);
    const viaSdk = { rel: 'lib/llm/OpenAiLlmProvider.ts', content: "import { OpenAIService } from '../openai/OpenAIService';" };
    expect(findPlatformKeyViolations([viaSdk])).toEqual(['lib/llm/OpenAiLlmProvider.ts: importa OpenAIService']);
    const embed = { rel: 'features/teammates/services/TeammateRunner.ts', content: "import { x } from '../../../lib/embedding/EmbeddingKeyResolver';" };
    expect(findPlatformKeyViolations([embed])).toEqual(['features/teammates/services/TeammateRunner.ts: importa lib/embedding direto']);
  });

  it('ressalva F-RAG-5b: a leitura que mora em lib/embedding/** continua verde', () => {
    const resolver = { rel: 'lib/embedding/EmbeddingKeyResolver.ts', content: 'return process.env.OPENAI_API_KEY;' };
    expect(findPlatformKeyViolations([...realFiles(), resolver])).toEqual([]);
  });
});
