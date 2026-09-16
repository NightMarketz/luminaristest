/**
 * Contratos de entrada da revisão profissional (BE-INCR-REVIEW-LAYER, nó C11) — materializados
 * ANTES da lógica (sessão de feature, passo 2). O que o snapshot de shape NÃO cobre e este arquivo
 * cobre: o refine "pelo menos um job", a união discriminada de resolução (NO_ACTION exige nota),
 * a máscara CFC do CRC (reuso do #305, item 9) e o `.strict()` de cada comando.
 */
import {
  AddFindingSchema,
  AdjustmentEntrySchema,
  OpenReviewSchema,
  RejectReviewSchema,
  ReplaceReviewJobsSchema,
  ResolveFindingSchema,
  SignOffReviewSchema,
} from '../AccountingReviewDto';

describe('OpenReviewSchema (item 1)', () => {
  it('aceita só ECD, só ECF ou os dois', () => {
    expect(OpenReviewSchema.safeParse({ unitId: 'u', year: 2026, ecdJobId: 'a' }).success).toBe(true);
    expect(OpenReviewSchema.safeParse({ unitId: 'u', year: 2026, ecfJobId: 'b' }).success).toBe(true);
    expect(OpenReviewSchema.safeParse({ unitId: 'u', year: 2026, ecdJobId: 'a', ecfJobId: 'b' }).success).toBe(true);
  });

  it('sem job nenhum é 400 (refine), não uma revisão vazia', () => {
    const r = OpenReviewSchema.safeParse({ unitId: 'u', year: 2026 });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('ecdJobId ou ecfJobId');
  });

  it('chave desconhecida é recusada (.strict())', () => {
    expect(OpenReviewSchema.safeParse({ unitId: 'u', year: 2026, ecdJobId: 'a', status: 'SIGNED_OFF' }).success).toBe(false);
  });
});

describe('AddFindingSchema (item 3)', () => {
  it('register fora do enum fechado é 400', () => {
    expect(AddFindingSchema.safeParse({ unitId: 'u', register: 'X999', locator: 'l', description: 'd', severity: 'NOTE' }).success).toBe(false);
  });

  it('locator > 200 e description > 1000 são 400', () => {
    expect(AddFindingSchema.safeParse({ unitId: 'u', register: 'J150', locator: 'x'.repeat(201), description: 'd', severity: 'NOTE' }).success).toBe(false);
    expect(AddFindingSchema.safeParse({ unitId: 'u', register: 'J150', locator: 'l', description: 'x'.repeat(1001), severity: 'BLOCKER' }).success).toBe(false);
  });
});

describe('ResolveFindingSchema (itens 4 e 7)', () => {
  it('DATA_EDIT exige targetType do enum + targetId', () => {
    expect(ResolveFindingSchema.safeParse({ unitId: 'u', resolution: 'DATA_EDIT', targetType: 'account', targetId: 'acc-1' }).success).toBe(true);
    expect(ResolveFindingSchema.safeParse({ unitId: 'u', resolution: 'DATA_EDIT', targetType: 'sped_file', targetId: 'x' }).success).toBe(false);
    expect(ResolveFindingSchema.safeParse({ unitId: 'u', resolution: 'DATA_EDIT', targetType: 'account' }).success).toBe(false);
  });

  it('NO_ACTION sem resolutionNote é 400 (achado descartado sem justificativa)', () => {
    expect(ResolveFindingSchema.safeParse({ unitId: 'u', resolution: 'NO_ACTION' }).success).toBe(false);
    expect(ResolveFindingSchema.safeParse({ unitId: 'u', resolution: 'NO_ACTION', resolutionNote: 'duplicado do achado 2' }).success).toBe(true);
  });

  it('ADJUSTMENT_ENTRY não entra por /resolve — tem rota própria (/adjustment)', () => {
    expect(ResolveFindingSchema.safeParse({ unitId: 'u', resolution: 'ADJUSTMENT_ENTRY' }).success).toBe(false);
  });
});

describe('AdjustmentEntrySchema (item 5) — espelha PostEntryInput', () => {
  const line = (accountCode: string, debitCents: number, creditCents: number) => ({ accountCode, debitCents, creditCents });

  it('aceita corpo mínimo com 2 partidas', () => {
    const r = AdjustmentEntrySchema.safeParse({
      unitId: 'u', postingDate: '2026-03-15', description: 'acerto', lines: [line('1.1.1', 100, 0), line('3.1', 0, 100)],
    });
    expect(r.success).toBe(true);
  });

  it('data de calendário inválida (2026-02-30) é 400 — isValidDateOnly, não só regex', () => {
    const r = AdjustmentEntrySchema.safeParse({
      unitId: 'u', postingDate: '2026-02-30', description: 'acerto', lines: [line('1.1.1', 100, 0), line('3.1', 0, 100)],
    });
    expect(r.success).toBe(false);
  });

  it('partida com os dois lados positivos é 400 (regra da linha canônica)', () => {
    const r = AdjustmentEntrySchema.safeParse({
      unitId: 'u', postingDate: '2026-03-15', description: 'acerto', lines: [line('1.1.1', 100, 100), line('3.1', 0, 100)],
    });
    expect(r.success).toBe(false);
  });
});

describe('SignOffReviewSchema (item 9) — CRC pelo canônico do #305', () => {
  const base = { unitId: 'u', reviewerName: 'Maria Contadora', statement: 'Revisei e atesto.' };

  it('normaliza grafias usuais para UF-NNNNNN/O-D', () => {
    const r = SignOffReviewSchema.safeParse({ ...base, reviewerCrc: 'crc-sp 123456/o-1' });
    expect(r.success).toBe(true);
    expect(r.data?.reviewerCrc).toBe('SP-123456/O-1');
  });

  it('CRC fora da máscara é 400 nomeado', () => {
    const r = SignOffReviewSchema.safeParse({ ...base, reviewerCrc: '123456' });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('UF-NNNNNN/O-D');
  });

  it('nome < 3 e statement vazio são 400', () => {
    expect(SignOffReviewSchema.safeParse({ ...base, reviewerName: 'Jo', reviewerCrc: 'SP-123456/O-1' }).success).toBe(false);
    expect(SignOffReviewSchema.safeParse({ ...base, statement: '', reviewerCrc: 'SP-123456/O-1' }).success).toBe(false);
  });
});

describe('RejectReviewSchema / ReplaceReviewJobsSchema', () => {
  it('rejeição exige reason', () => {
    expect(RejectReviewSchema.safeParse({ unitId: 'u' }).success).toBe(false);
    expect(RejectReviewSchema.safeParse({ unitId: 'u', reason: 'saldo não bate' }).success).toBe(true);
  });

  it('troca de jobs exige pelo menos um job e recusa chave extra', () => {
    expect(ReplaceReviewJobsSchema.safeParse({ unitId: 'u' }).success).toBe(false);
    expect(ReplaceReviewJobsSchema.safeParse({ unitId: 'u', ecdJobId: 'novo' }).success).toBe(true);
    expect(ReplaceReviewJobsSchema.safeParse({ unitId: 'u', ecdJobId: 'novo', status: 'OPEN' }).success).toBe(false);
  });
});
