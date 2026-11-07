/**
 * ragReindexCli — BE-INCR-RAG-DOCUMENTOS RAG-PR-A item 10. Refaz o embedding de todo trecho sem carimbo ou com carimbo
 * diferente do atual (troca de modelo; saída do índice externo antigo).
 *
 * Run:
 *   npm run rag:reindex [-- --user <id>]
 */
import prisma from '../lib/prisma';
import { getFactory } from '../lib/factory';
import { ChunkReindexService } from '../features/documents/services/ChunkReindexService';

function readFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

/** Devolve o código de saída. Nunca chama `process.exit` (testável). */
export async function ragReindex(argv: string[], service?: Pick<ChunkReindexService, 'reindex'>): Promise<number> {
  const userId = readFlag(argv, '--user');
  if (argv.includes('--user') && !userId) {
    console.error('erro: --user exige o id do usuário.');
    return 2;
  }
  const f = getFactory();
  const svc = service ?? new ChunkReindexService(f.getChunkRepository(), f.getChunkVectorRepository(), f.getUserEmbedder());
  const { users, reindexed } = await svc.reindex({ userId });
  console.log(`rag:reindex — ${reindexed} trecho(s) reindexado(s) em ${users} usuário(s).`);
  return 0;
}

if (require.main === module) {
  ragReindex(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .finally(() => prisma.$disconnect());
}
