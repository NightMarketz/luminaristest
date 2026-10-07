// BE-INCR-LEGAL-PARAMS PR-2 (emenda §9 L-8) — Jest `setupFiles`: aquece o cache de parâmetros legais com a SEMENTE da
// migração (prisma/data/legal_parameters_v*.sql), como o boot faz com o banco. O DTO estático (LC 116, ISS máximo) lê
// esse cache de forma síncrona; sem isto, todo teste unitário que valida o DTO cairia no "cache frio". Na integração,
// o resetDb() reaquece a partir do banco.
import type { LegalParameter } from 'generated/prisma';
import { storePublished } from '@/features/legalParameters/services/legalParameterCache';
import { legalParamsSeedRows } from '@test/helpers/legalParams';

const rows = legalParamsSeedRows() as unknown as LegalParameter[];
for (const t of new Set(rows.map((r) => r.tabela))) storePublished(t, rows.filter((r) => r.tabela === t));
