/**
 * BE-INCR-AUDIT-FREETEXT-MASK — barreira REAL do masker, no mesmo padrão do #255/#258
 * (`PayableReceivableAuditAllowlist.integration.test.ts`): chama `AuditService.append()` DIRETO,
 * contra o banco de integração, e afirma sobre o `AuditEvent` PERSISTIDO.
 *
 * O que este arquivo prova, que a suíte pura do masker não alcança:
 *   1. o masker está de fato PLUGADO no choke-point (não só implementado);
 *   2. a leitura de contraparte acontece dentro da tx do append e enxerga a linha recém-criada;
 *   3. o hash é computado sobre o valor JÁ mascarado — `verifyAuditChain` continua `ok`, ou seja,
 *      o mascaramento não quebra a cadeia (ADR-INCR2 Q2: append-only, não há conserto depois).
 *
 * O comportamento fino do matching (fronteira de palavra, acento, nome mais longo, preservação do
 * texto original) tem suíte própria e pura em `audit/__tests__/auditFreeTextMask.test.ts`.
 */
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { CounterpartyRepository } from '@/features/accounting/repositories/CounterpartyRepository';
import { PostingRepository } from '@/features/accounting/repositories/PostingRepository';
import { normalizeCounterpartyName } from '@/features/accounting/models/Counterparty.model';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const UNIT = 'unit-freetext-mask';
const DONO = 'u-freetext-mask';
const NOME_FORNECEDOR = 'Padaria Conceição Ltda';

const escopo = (): AccountingScope => resolveAccountingScope({ userId: DONO }, UNIT);

const counterpartyRepo = new CounterpartyRepository();
const postingRepo = new PostingRepository();

let counterpartyId: string;

describe('AuditService.append — masker de nome de terceiro em campo livre (BE-INCR-AUDIT-FREETEXT-MASK)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' },
    });
    const counterparty = await counterpartyRepo.create({
      userId: DONO,
      unitId: UNIT,
      type: 'SUPPLIER',
      name: NOME_FORNECEDOR,
      nameNormalized: normalizeCounterpartyName(NOME_FORNECEDOR),
      ref: null,
      createdById: DONO,
    });
    counterpartyId = counterparty.id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const lerPayload = async (eventType: string, targetId: string): Promise<Record<string, unknown>> => {
    const evento = await prisma.auditEvent.findFirst({
      where: { scopeUserId: DONO, unitId: UNIT, eventType, targetId },
    });
    expect(evento).not.toBeNull();
    return JSON.parse(evento!.payload) as Record<string, unknown>;
  };

  it('mascara o nome do fornecedor digitado à mão no `reason` de payable.cancelled', async () => {
    const targetId = randomUUID();
    await postingRepo.runTransaction((tx) =>
      getFactory().getAuditService().append(tx, escopo(), {
        actorUserId: DONO,
        eventType: 'payable.cancelled',
        targetType: 'payable',
        targetId,
        // O operador digitou o nome do fornecedor no campo livre — nenhum produtor injetou isto.
        payload: { payableId: targetId, reversalEntryId: 'rev-1', reason: 'Padaria Conceição Ltda cobrou em duplicidade' },
      }),
    );

    const payload = await lerPayload('payable.cancelled', targetId);
    expect(payload.reason).toBe(`[counterparty:${counterpartyId}] cobrou em duplicidade`);
    expect(payload.reason).not.toContain('Conceição');
  });

  it('mascara também o `description` de um post MANUAL (entry.posted — o canal sem boundary até aqui)', async () => {
    const targetId = randomUUID();
    await postingRepo.runTransaction((tx) =>
      getFactory().getAuditService().append(tx, escopo(), {
        actorUserId: DONO,
        eventType: 'entry.posted',
        targetType: 'journal_entry',
        targetId,
        payload: {
          sourceType: 'manual',
          description: 'Ajuste referente à PADARIA CONCEIÇÃO LTDA',
          sumDebitCents: '10000',
          lineCount: '2',
        },
      }),
    );

    const payload = await lerPayload('entry.posted', targetId);
    expect(payload.description).toBe(`Ajuste referente à [counterparty:${counterpartyId}]`);
  });

  it('preserva o texto do operador quando nenhum nome conhecido aparece', async () => {
    const targetId = randomUUID();
    const textoOriginal = 'Estorno por ERRO de digitação — competência 06/2026';
    await postingRepo.runTransaction((tx) =>
      getFactory().getAuditService().append(tx, escopo(), {
        actorUserId: DONO,
        eventType: 'entry.reversed',
        targetType: 'journal_entry',
        targetId,
        payload: { originalId: 'entry-x', reversalId: targetId, reason: textoOriginal },
      }),
    );

    const payload = await lerPayload('entry.reversed', targetId);
    expect(payload.reason).toBe(textoOriginal);
  });

  it('a cadeia continua íntegra depois dos appends mascarados (hash sobre o valor já mascarado)', async () => {
    const resultado = await getFactory().getAuditService().verifyAuditChain(escopo());
    expect(resultado.ok).toBe(true);
    expect(resultado.checkedEvents).toBeGreaterThanOrEqual(3);
  });
});
