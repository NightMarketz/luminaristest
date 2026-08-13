import { buildSubledgerFilterWhere } from '../subledgerFilters';
import { PAYABLE_OUTSTANDING_STATUSES } from '../../models/Payable.model';
import { RECEIVABLE_OUTSTANDING_STATUSES } from '../../models/Receivable.model';
import type { Prisma } from 'generated/prisma';

/**
 * Unit da PURA `buildSubledgerFilterWhere` — cobre cada filtro isolado, a composição AND, e o
 * `overdue` com `today` injetado (sem relógio real). O ORÁCULO de regressão sobre SQLite real
 * (comportamento ponta-a-ponta, escopo, tombstone) é a suíte de integração já existente:
 * `repositories/__tests__/SubledgerFilters.integration.test.ts` (BE-INCR-SUBLEDGER-FILTERS §2,
 * 20 testes) — não duplicada aqui.
 */

const OPTS_AP = { openStatuses: PAYABLE_OUTSTANDING_STATUSES, today: '2026-08-13' };
const OPTS_AR = { openStatuses: RECEIVABLE_OUTSTANDING_STATUSES, today: '2026-08-13' };

function build(params: Parameters<typeof buildSubledgerFilterWhere>[0], opts = OPTS_AP) {
  return buildSubledgerFilterWhere<Prisma.PayableWhereInput>(params, opts);
}

describe('buildSubledgerFilterWhere', () => {
  it('sem nenhum parâmetro devolve array vazio', () => {
    expect(build({})).toEqual([]);
  });

  it('status isolado vira um bloco `{ status }`', () => {
    expect(build({ status: 'PAID' })).toEqual([{ status: 'PAID' }]);
  });

  it('counterpartyId isolado vira um bloco `{ counterpartyId }`', () => {
    expect(build({ counterpartyId: 'cp-1' })).toEqual([{ counterpartyId: 'cp-1' }]);
  });

  it('dueFrom isolado usa `gte` na meia-noite UTC do dia (F4)', () => {
    expect(build({ dueFrom: '2026-03-01' })).toEqual([
      { dueDate: { gte: '2026-03-01T00:00:00.000Z' } },
    ]);
  });

  it('dueTo isolado usa `lte` na meia-noite UTC do dia — faixa inclusiva (F4)', () => {
    expect(build({ dueTo: '2026-03-31' })).toEqual([
      { dueDate: { lte: '2026-03-31T00:00:00.000Z' } },
    ]);
  });

  it('dueFrom + dueTo viram DOIS blocos independentes (compõem em AND, não se mesclam)', () => {
    expect(build({ dueFrom: '2026-03-01', dueTo: '2026-03-31' })).toEqual([
      { dueDate: { gte: '2026-03-01T00:00:00.000Z' } },
      { dueDate: { lte: '2026-03-31T00:00:00.000Z' } },
    ]);
  });

  it('q vira um bloco `OR` sobre description e documentNumber (F2)', () => {
    expect(build({ q: 'Aluguel' })).toEqual([
      { OR: [{ description: { contains: 'Aluguel' } }, { documentNumber: { contains: 'Aluguel' } }] },
    ]);
  });

  it('combinação de todos os filtros gera um bloco por filtro, em ordem (AND por composição de array)', () => {
    const r = build({
      status: 'OPEN',
      counterpartyId: 'cp-1',
      dueFrom: '2026-03-01',
      dueTo: '2026-03-31',
      q: 'Aluguel',
    });
    expect(r).toEqual([
      { status: 'OPEN' },
      { counterpartyId: 'cp-1' },
      { dueDate: { gte: '2026-03-01T00:00:00.000Z' } },
      { dueDate: { lte: '2026-03-31T00:00:00.000Z' } },
      { OR: [{ description: { contains: 'Aluguel' } }, { documentNumber: { contains: 'Aluguel' } }] },
    ]);
  });

  describe('overdue — `today` injetado, função nunca calcula hoje', () => {
    it('overdue usa `<` (não `<=`) contra `today` — vencer hoje não é estar vencido', () => {
      const r = build({ overdue: true }, { openStatuses: PAYABLE_OUTSTANDING_STATUSES, today: '2026-08-13' });
      expect(r).toEqual([
        { dueDate: { lt: '2026-08-13T00:00:00.000Z' }, status: { in: ['OPEN', 'PAYING'] } },
      ]);
    });

    it('overdue ausente ou false não empurra nenhum bloco', () => {
      expect(build({})).toEqual([]);
      expect(build({ overdue: false })).toEqual([]);
    });

    it('`today` é usado EXATAMENTE o valor injetado — a função não lê o relógio real', () => {
      const passado = build({ overdue: true }, { openStatuses: PAYABLE_OUTSTANDING_STATUSES, today: '2000-01-01' });
      const futuro = build({ overdue: true }, { openStatuses: PAYABLE_OUTSTANDING_STATUSES, today: '2099-12-31' });
      expect(passado).toEqual([{ dueDate: { lt: '2000-01-01T00:00:00.000Z' }, status: { in: ['OPEN', 'PAYING'] } }]);
      expect(futuro).toEqual([{ dueDate: { lt: '2099-12-31T00:00:00.000Z' }, status: { in: ['OPEN', 'PAYING'] } }]);
    });

    it('F10 — overdue + status viram DOIS blocos independentes, nunca um spread que se sobrescreve', () => {
      const r = build({ overdue: true, status: 'PAID' });
      expect(r).toEqual([
        { status: 'PAID' },
        { dueDate: { lt: '2026-08-13T00:00:00.000Z' }, status: { in: ['OPEN', 'PAYING'] } },
      ]);
      // As duas chaves `status` sobrevivem em blocos separados — é o AND do chamador que produz o
      // conjunto vazio (nada pago está em aberto), não esta função.
    });

    it('F10 — overdue + dueTo viram DOIS blocos disputando `dueDate` sem se sobrescrever', () => {
      const r = build({ overdue: true, dueTo: '2026-03-01' });
      expect(r).toEqual([
        { dueDate: { lte: '2026-03-01T00:00:00.000Z' } },
        { dueDate: { lt: '2026-08-13T00:00:00.000Z' }, status: { in: ['OPEN', 'PAYING'] } },
      ]);
    });
  });

  describe('openStatuses por lado — AP e AR usam o próprio conjunto', () => {
    it('lado AP usa PAYABLE_OUTSTANDING_STATUSES (OPEN, PAYING)', () => {
      const r = buildSubledgerFilterWhere<Prisma.PayableWhereInput>({ overdue: true }, OPTS_AP);
      expect(r).toEqual([{ dueDate: { lt: '2026-08-13T00:00:00.000Z' }, status: { in: ['OPEN', 'PAYING'] } }]);
    });

    it('lado AR usa RECEIVABLE_OUTSTANDING_STATUSES (OPEN, RECEIVING)', () => {
      const r = buildSubledgerFilterWhere<Prisma.ReceivableWhereInput>({ overdue: true }, OPTS_AR);
      expect(r).toEqual([{ dueDate: { lt: '2026-08-13T00:00:00.000Z' }, status: { in: ['OPEN', 'RECEIVING'] } }]);
    });
  });
});
