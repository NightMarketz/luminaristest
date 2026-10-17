import { Prisma } from 'generated/prisma';
import type { FieldEquals } from '../models/DynamicTable.model';

/**
 * WHERE de `findDataByFieldEquals` (BRIEF BE-INCR-CHAT-AGENT §2.2), compartilhado pelos dois
 * repositórios. Igualdade TIPADA: caminho e valor sempre parâmetro ligado; a classe de
 * armazenamento do `json_extract` separa "1" (TEXT) de 1 (INTEGER), e `json_type` separa o
 * booleano JSON do número (o `json_extract` devolve 1/0 para true/false).
 * `name` precisa vir validado contra o schema da tabela (o serviço garante).
 */
export function fieldEqualsWhere(tableId: string, filters: FieldEquals[]): Prisma.Sql {
  const where: Prisma.Sql[] = [
    Prisma.sql`"dynamicTableId" = ${tableId}`,
    Prisma.sql`"deletedAt" IS NULL`,
  ];
  for (const { name, value } of filters) {
    const path = `$.${name}`;
    if (value === null) {
      where.push(Prisma.sql`json_extract(data, ${path}) IS NULL`);
    } else if (typeof value === 'boolean') {
      where.push(Prisma.sql`json_type(data, ${path}) = ${value ? 'true' : 'false'}`);
    } else if (typeof value === 'number') {
      where.push(Prisma.sql`json_type(data, ${path}) IN ('integer', 'real') AND json_extract(data, ${path}) = ${value}`);
    } else {
      where.push(Prisma.sql`json_type(data, ${path}) = 'text' AND json_extract(data, ${path}) = ${value}`);
    }
  }
  return Prisma.join(where, ' AND ');
}
