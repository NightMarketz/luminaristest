/**
 * Onda 0 — os dois parâmetros que DRIBLAVAM o DTO.
 *
 * Classe do defeito: o controller rodava `safeParse` num schema que não declarava o
 * parâmetro, e logo depois lia `req.query.<param>` cru. O parâmetro era usado, estava
 * publicado no contrato OpenAPI, e mesmo assim nunca passava pela fronteira:
 *
 *  - `GET /accounting/ledger` → `accountCode` (OBRIGATÓRIO na rota) validado por um `if`
 *    solto em `accountingController.ts`, fora do `ReportQuerySchema`.
 *  - `GET /accounting/data-exchange/jobs/:id/rows` → `status` chegava ao serviço como
 *    string crua, sem o enum de 4 valores que o `docs.paths.ts` anuncia.
 *
 * Estes testes são a barreira: cada um falha se o parâmetro voltar a sair do DTO.
 * Todo caso negativo vem com o controle positivo — teste que espera falha passa por
 * qualquer falha, inclusive por payload base quebrado.
 */
import { LedgerQuerySchema, ReportQuerySchema } from '../PostingDto';
import { JobRowsQuerySchema, JobScopeQuerySchema } from '../DataExchangeDto';
import { ROW_STATUSES } from '../../models/DataExchange.model';

describe('LedgerQuerySchema — accountCode é obrigatório DENTRO do DTO', () => {
  const valid = { unitId: 'unit-1', accountCode: '1.1.1' };

  it('accepts a query com accountCode (CONTROLE)', () => {
    expect(LedgerQuerySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a AUSÊNCIA de accountCode — antes isto passava no parse e caía num if solto', () => {
    const parsed = LedgerQuerySchema.safeParse({ unitId: 'unit-1' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path[0] === 'accountCode')).toBe(true);
    }
  });

  it('rejects accountCode vazio, preservando a mensagem que o if solto dava', () => {
    const parsed = LedgerQuerySchema.safeParse({ ...valid, accountCode: '' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.message === 'accountCode é obrigatório.')).toBe(true);
    }
  });

  it('o ReportQuerySchema base SEGUE sem accountCode — é ele que serve o trial-balance', () => {
    // A prova de que a correção é um schema NOVO e não um alargamento do compartilhado:
    // /trial-balance não exige accountCode e não pode ter passado a exigir.
    expect(ReportQuerySchema.safeParse({ unitId: 'unit-1' }).success).toBe(true);
    expect('accountCode' in ReportQuerySchema.shape).toBe(false);
  });

  it('mantém unitId obrigatório e from/to opcionais (o escopo herdado não mudou)', () => {
    expect(LedgerQuerySchema.safeParse({ accountCode: '1.1.1' }).success).toBe(false);
    expect(LedgerQuerySchema.safeParse({ ...valid, from: '2026-01-01', to: '2026-12-31' }).success).toBe(true);
  });
});

describe('JobRowsQuerySchema — status validado pelo enum, não string crua', () => {
  const valid = { unitId: 'unit-1' };

  it('accepts a query sem status (o filtro é opcional — CONTROLE)', () => {
    const parsed = JobRowsQuerySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.status).toBeUndefined();
  });

  it('accepts os quatro status do contrato', () => {
    for (const status of ROW_STATUSES) {
      expect(JobRowsQuerySchema.safeParse({ ...valid, status }).success).toBe(true);
    }
  });

  it('rejects status fora do enum — antes ia cru para o serviço', () => {
    for (const bad of ['valid', 'PENDENTE', 'DROP TABLE', '']) {
      expect(JobRowsQuerySchema.safeParse({ ...valid, status: bad }).success).toBe(false);
    }
  });

  it('a const que alimenta o enum é a do contrato publicado (4 valores, nesta ordem)', () => {
    // O enum do DTO e o tipo RowStatus derivam da MESMA const, então não podem divergir por
    // construção — o que resta verificar é o CONTEÚDO dela contra o que o OpenAPI anuncia.
    // (Uma asserção sobre o interno do Zod foi tentada aqui e removida: quebrava a compilação
    // da suíte inteira sob mutação, mascarando os casos de runtime acima, que já mordem.)
    expect([...ROW_STATUSES]).toEqual(['VALID', 'INVALID', 'COMMITTED', 'SKIPPED']);
  });

  it('o JobScopeQuerySchema base segue só com unitId — serve as outras duas rotas do job', () => {
    expect(JobScopeQuerySchema.safeParse(valid).success).toBe(true);
    expect('status' in JobScopeQuerySchema.shape).toBe(false);
  });
});
