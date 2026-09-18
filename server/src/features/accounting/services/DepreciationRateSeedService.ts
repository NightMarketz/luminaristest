import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { IDepreciationRateRepository } from '../repositories/IDepreciationRateRepository';
import anexoFixture from '../fixtures/anexo-iii-in-1700-2017.json';

interface AnexoFixtureRow {
  ncm: string | null;
  sourceRow: number | null;
  description: string;
  lifeYears: number;
  annualRateBp: number;
  source: string;
  justification?: string;
}

const FIXTURE_ROWS = (anexoFixture as { rows: AnexoFixtureRow[] }).rows;
const FIXTURE_SHA256 = (anexoFixture as { sha256: string }).sha256;

/**
 * Semeia a tabela de taxas do Anexo III (BE-INCR-FIXED-ASSETS, nó C8, item 3) — LAZY: a 1ª leitura
 * de `GET /depreciation-rates` do escopo chama `seed`, que semeia se ainda não semeou (escopos
 * antigos ganham a tabela sem migração de dado, S6 do smoke não reprova backfill; T0 do teste de
 * integração não cresce 222 inserts por rodada). Idempotente: a 2ª chamada é 0 inserts, verificado
 * por `hasAnexoSeed` ANTES do `createMany` (não depende de `skipDuplicates`, sem suporte no SQLite).
 */
export class DepreciationRateSeedService {
  constructor(private readonly rateRepo: IDepreciationRateRepository) {}

  async seed(scope: AccountingScope): Promise<void> {
    if (await this.rateRepo.hasAnexoSeed(scope)) return;
    const { userId, unitId } = accountingScopeWhere(scope);
    await this.rateRepo.createMany(
      FIXTURE_ROWS.map((row) => ({
        userId,
        unitId,
        ncm: row.ncm,
        sourceRow: row.sourceRow,
        description: row.description,
        lifeYears: row.lifeYears,
        annualRateBp: row.annualRateBp,
        source: row.source,
        sourceUrl: 'https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/81268/visao/multivigente',
        sourceSha256: FIXTURE_SHA256,
        justification: row.justification ?? null,
        createdById: null,
      })),
    );
  }
}
