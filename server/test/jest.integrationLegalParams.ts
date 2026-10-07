/**
 * BE-INCR-LEGAL-PARAMS PR-2 (emenda §9 L-8) — integração: o DTO estático (LC 116, ISS máximo) lê o cache de parâmetros
 * legais de forma síncrona, e o boot (`server.ts`) o aquece antes do listen. Aqui o equivalente: antes de cada teste o
 * cache é recarregado do banco de teste (o `beforeAll` do arquivo já fez o `pushTestSchema`). Arquivo que não usa o
 * banco de teste (sem tabela) segue com o cache como estava.
 */
import prisma from '@/lib/prisma';
import { storePublished } from '@/features/legalParameters/services/legalParameterCache';

beforeEach(async () => {
  try {
    const publicadas = await prisma.legalParameter.findMany({ where: { status: 'PUBLISHED' } });
    for (const t of new Set(publicadas.map((l) => l.tabela))) storePublished(t, publicadas.filter((l) => l.tabela === t));
  } catch {
    // banco sem a tabela (arquivo com SQLite próprio): nada a aquecer
  }
});
