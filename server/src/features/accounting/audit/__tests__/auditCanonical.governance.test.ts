/**
 * BE-INCR-ACCOUNTANT-GOVERNANCE (BRIEF itens 16 e 17i): contrato da allowlist dos eventos novos, e a prova de
 * que acrescentar `assignmentId` à allowlist NÃO muda o hash de evento gravado antes (o evento antigo não tem
 * a chave, e `canonicalizeAuditPayload` pula ausente). Os hashes abaixo foram calculados no código de
 * `origin/main` d6530790, ANTES da mudança da allowlist, com a mesma tupla.
 */
import {
  PAYLOAD_ALLOWLIST,
  buildAuditCanonicalTuple,
  canonicalizeAuditPayload,
  hashAuditCanonical,
  GENESIS_HASH,
} from '../auditCanonical';

const PINNED_BEFORE: Array<[string, Record<string, unknown>, string]> = [
  ['period.reopened', { year: 2026, month: 3, fromStatus: 'SOFT_CLOSED', toStatus: 'OPEN', reason: 'ajuste' },
    '2bf42039858e7b01e3391d12ca2b645cdcb6158a766344f0c126e0c8ec0b9bb8'],
  ['period.opened', { year: 2026, month: 3, fromStatus: 'FUTURE', toStatus: 'OPEN' },
    '2c7aa22ceec9c2eb54057a6c44b7ba56b30afed6dfe1673fd7ca8232b3ecdc05'],
  ['review.signed_off', { reviewId: 'rv-1', reviewerName: 'Fulano', reviewerCrc: 'SP-123456/O-1' },
    'e4741cc980ca1ce13402b8ebac5e4b1e5fd0ef0041f176ec18fde3c4c9e115ef'],
  ['review.rejected', { reviewId: 'rv-1', reason: 'inconsistente' },
    '26d03f6e1a929f5343bfd9d7f41d53ccd00d854af2e64ef798d556b997389e4a'],
];

function hashOf(eventType: string, payload: Record<string, unknown>): string {
  const payloadCanonical = canonicalizeAuditPayload(eventType, payload);
  return hashAuditCanonical(buildAuditCanonicalTuple({
    eventId: 'evt-1', scopeUserId: 'owner-1', unitId: 'unit-1', seq: 1n, actorUserId: 'owner-1', actorType: 'USER',
    eventType, targetType: 'x', targetId: 'id-1', payloadCanonical, createdAtISO: '2026-10-03T00:00:00.000Z',
    prevHash: GENESIS_HASH,
  }));
}

describe('auditCanonical — governança do contador', () => {
  it.each(PINNED_BEFORE)('%s: evento gravado antes da mudança mantém o hash', (eventType, payload, pinned) => {
    expect(hashOf(eventType, payload)).toBe(pinned);
  });

  it('o mesmo evento COM assignmentId tem hash diferente (a chave entra no canônico)', () => {
    const [eventType, payload, pinned] = PINNED_BEFORE[0];
    expect(hashOf(eventType, { ...payload, assignmentId: 'asg-1' })).not.toBe(pinned);
  });

  it('allowlist dos 3 eventos novos — nunca e-mail, nome ou CPF (D5)', () => {
    expect(PAYLOAD_ALLOWLIST['accountant_assignment.invited']).toEqual(['assignmentId', 'accountingContactId', 'crcNumber', 'crcUf']);
    expect(PAYLOAD_ALLOWLIST['accountant_assignment.accepted']).toEqual(['assignmentId', 'supersededAssignmentId']);
    expect(PAYLOAD_ALLOWLIST['accountant_assignment.ended']).toEqual(['assignmentId', 'fromStatus', 'endedBy', 'reason']);
    for (const t of ['invited', 'accepted', 'ended']) {
      const keys = PAYLOAD_ALLOWLIST[`accountant_assignment.${t}`];
      for (const pii of ['email', 'accountantEmail', 'ownerEmail', 'name', 'cpf']) expect(keys).not.toContain(pii);
    }
  });

  it('assignmentId entra em period.opened/reopened e review.signed_off/rejected', () => {
    for (const t of ['period.opened', 'period.reopened', 'review.signed_off', 'review.rejected']) {
      expect(PAYLOAD_ALLOWLIST[t]).toContain('assignmentId');
    }
  });
});
