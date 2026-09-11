/**
 * auditCanonical — pure canonicalization functions, tested in isolation.
 * No Prisma, no tx, no side effects.
 */
import {
  canonicalizeAuditPayload,
  buildAuditCanonicalTuple,
  hashAuditCanonical,
  GENESIS_HASH,
  AuditTupleInput,
} from '../auditCanonical';

describe('canonicalizeAuditPayload', () => {
  it('keeps only allowlisted keys for entry.posted', () => {
    const result = canonicalizeAuditPayload('entry.posted', {
      sourceType: 'manual',
      description: 'Venda',
      sumDebitCents: '10000',
      lineCount: '2',
      password: 'secret',    // must be dropped
      requestBody: '{}',     // must be dropped
    });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({
      description: 'Venda',
      lineCount: '2',
      sourceType: 'manual',
      sumDebitCents: '10000',
    });
    expect(parsed).not.toHaveProperty('password');
    expect(parsed).not.toHaveProperty('requestBody');
  });

  it('keeps only allowlisted keys for entry.reversed', () => {
    const result = canonicalizeAuditPayload('entry.reversed', {
      originalId: 'entry-1',
      reversalId: 'rev-1',
      reason: 'erro',
      token: 'abc',
    });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ originalId: 'entry-1', reason: 'erro', reversalId: 'rev-1' });
    expect(parsed).not.toHaveProperty('token');
  });

  it('converts BigInt to string', () => {
    const result = canonicalizeAuditPayload('entry.posted', {
      sourceType: 'manual',
      description: 'Test',
      sumDebitCents: BigInt(5000),
      lineCount: '2',
    });
    const parsed = JSON.parse(result);
    expect(typeof parsed.sumDebitCents).toBe('string');
    expect(parsed.sumDebitCents).toBe('5000');
  });

  it('omits undefined and null values', () => {
    const result = canonicalizeAuditPayload('entry.reversed', {
      originalId: 'entry-1',
      reversalId: 'rev-1',
      reason: undefined,
    });
    const parsed = JSON.parse(result);
    expect(parsed).not.toHaveProperty('reason');
    expect(parsed).toHaveProperty('originalId');
  });

  it('produces stable key order (sorted)', () => {
    const r1 = canonicalizeAuditPayload('entry.reversed', { reversalId: 'r1', originalId: 'e1' });
    const r2 = canonicalizeAuditPayload('entry.reversed', { originalId: 'e1', reversalId: 'r1' });
    expect(r1).toBe(r2);
    // First key must be originalId (alphabetically before reversalId)
    expect(Object.keys(JSON.parse(r1))[0]).toBe('originalId');
  });

  it('throws for unknown eventType', () => {
    expect(() => canonicalizeAuditPayload('unknown.event', {})).toThrow();
  });

  it('handles period.soft_closed with all fields', () => {
    const result = canonicalizeAuditPayload('period.soft_closed', {
      year: 2026,
      month: 6,
      fromStatus: 'OPEN',
      toStatus: 'SOFT_CLOSED',
      reason: 'Fim do mês',
    });
    const parsed = JSON.parse(result);
    expect(parsed.year).toBe('2026');
    expect(parsed.month).toBe('6');
    expect(parsed.fromStatus).toBe('OPEN');
    expect(parsed.reason).toBe('Fim do mês');
  });

  // BE-INCR-9 / 9B — referential mapping events must be allowlisted so the in-tx audit
  // (ACC-019) of set/batch/copy/unset survives canonicalization instead of throwing
  // "unknown eventType" and rolling back the write. Keys mirror the service payloads.
  it('keeps only allowlisted keys for referential.mapping.set (batch/copy reuse this event)', () => {
    const result = canonicalizeAuditPayload('referential.mapping.set', {
      accountId: 'acc-cash',
      referentialCode: '1.01.01',
      mappingVersion: '2025',
      // non-allowlisted provenance/PII must be dropped
      label: 'Caixa (referencial)',
      secret: 'drop-me',
    });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({
      accountId: 'acc-cash',
      referentialCode: '1.01.01',
      mappingVersion: '2025',
    });
  });

  it('keeps only allowlisted keys for referential.mapping.unset', () => {
    const result = canonicalizeAuditPayload('referential.mapping.unset', {
      accountId: 'acc-cash',
      referentialCode: '1.01.01',
      mappingVersion: '2025',
    });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({
      accountId: 'acc-cash',
      referentialCode: '1.01.01',
      mappingVersion: '2025',
    });
  });
});

describe('buildAuditCanonicalTuple + hashAuditCanonical', () => {
  const baseInput: AuditTupleInput = {
    eventId:          'evt-1',
    scopeUserId:      'u1',
    unitId:           'unit-1',
    seq:              1n,
    actorUserId:      'u1',
    actorType:        'USER',
    eventType:        'entry.posted',
    targetType:       'journal_entry',
    targetId:         'entry-1',
    payloadCanonical: '{"description":"Test","lineCount":"2","sourceType":"manual","sumDebitCents":"10000"}',
    createdAtISO:     '2026-06-27T14:00:00.000Z',
    prevHash:         GENESIS_HASH,
  };

  it('produces a deterministic hash for the same input', () => {
    const tuple1 = buildAuditCanonicalTuple(baseInput);
    const tuple2 = buildAuditCanonicalTuple(baseInput);
    expect(hashAuditCanonical(tuple1)).toBe(hashAuditCanonical(tuple2));
  });

  it('hash changes when any field changes', () => {
    const tuple = buildAuditCanonicalTuple(baseInput);
    const hash1 = hashAuditCanonical(tuple);

    const tupleModified = buildAuditCanonicalTuple({ ...baseInput, targetId: 'entry-2' });
    const hash2 = hashAuditCanonical(tupleModified);

    expect(hash1).not.toBe(hash2);
  });

  it('tuple string includes "audit.v1" version marker', () => {
    const tuple = buildAuditCanonicalTuple(baseInput);
    expect(tuple).toContain('"audit.v1"');
  });

  it('seq is serialized as string inside the tuple (not BigInt)', () => {
    const tuple = buildAuditCanonicalTuple(baseInput);
    const parsed = JSON.parse(tuple);
    expect(typeof parsed.seq).toBe('string');
    expect(parsed.seq).toBe('1');
  });

  it('prevHash is included inside the tuple (not concatenated outside)', () => {
    const tuple = buildAuditCanonicalTuple(baseInput);
    expect(tuple).toContain(GENESIS_HASH);
  });

  it('hash is 64 hex chars (sha256)', () => {
    const tuple = buildAuditCanonicalTuple(baseInput);
    const hash = hashAuditCanonical(tuple);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('genesis hash is 64 zeroes', () => {
    expect(GENESIS_HASH).toHaveLength(64);
    expect(GENESIS_HASH).toMatch(/^0{64}$/);
  });
});

// BE-INCR-RECONCILE-PENDING (nó C7, Fork 4-a) — teste-guarda de PII no MESMO PR que introduz o
// eventType (memória `accounting-audit-allowlist-guards`): nenhum campo do item de ORIGEM
// (nome de cliente/fornecedor, reasonDetail livre) sobrevive à canonicalização, mesmo que o
// chamador passe algo a mais por engano.
it('keeps only allowlisted keys for reconcile_pending.rescanned — drops reasonDetail/PII-shaped extras', () => {
  const result = canonicalizeAuditPayload('reconcile_pending.rescanned', {
    pendingId: 'rpi-1',
    sourceType: 'sale.finalized',
    outcome: 'resolved',
    // non-allowlisted — origin-item PII / free-text error message must be dropped
    reasonDetail: 'Cliente João da Silva — período fechado',
    customerName: 'João da Silva',
    sourceId: 'sale-42',
    secret: 'drop-me',
  });
  const parsed = JSON.parse(result);
  expect(parsed).toEqual({
    outcome: 'resolved',
    pendingId: 'rpi-1',
    sourceType: 'sale.finalized',
  });
});

// BE-INCR-CONTADOR-DELIVERY (item 14, D5) — teste-guarda de PII no MESMO PR que introduz os
// eventTypes (memória `accounting-audit-allowlist-guards`; review F12: o precedente da casa é o
// caso acima, no nível do CANONICALIZADOR, não só do serviço). Nome e e-mail do contador são PII
// de terceiro numa trilha append-only: mesmo que um caller futuro os passe por engano, eles NÃO
// sobrevivem à canonicalização em nenhum dos 5 eventos.
describe('contact.* / delivery.* — PII do contador nunca sobrevive à canonicalização', () => {
  const PII = { name: 'Contabilidade Silva', email: 'silva@exemplo.com.br', contactName: 'Silva' };

  it('contact.registered mantém contactId + registro profissional e derruba nome/e-mail', () => {
    const parsed = JSON.parse(
      canonicalizeAuditPayload('contact.registered', {
        contactId: 'c-1', crcNumber: 'SP-1/O-1', crcUf: 'SP', ...PII,
      }),
    );
    expect(parsed).toEqual({ contactId: 'c-1', crcNumber: 'SP-1/O-1', crcUf: 'SP' });
  });

  it.each([
    ['contact.archived', { contactId: 'c-1' }],
    ['delivery.package_built', {
      deliveryId: 'd-1', ecdJobId: 'j-ecd', ecfJobId: 'j-ecf', year: 2026,
      sha256Ecd: 'a'.repeat(64), sha256Ecf: 'b'.repeat(64),
    }],
    ['delivery.sent', { deliveryId: 'd-1', contactId: 'c-1', attemptCount: 1 }],
    ['delivery.failed', { deliveryId: 'd-1', contactId: 'c-1', attemptCount: 2, reason: 'caixa cheia' }],
  ])('%s derruba nome/e-mail passados a mais', (eventType, allowed) => {
    const out = canonicalizeAuditPayload(eventType, { ...allowed, ...PII });
    expect(out).not.toContain('Contabilidade Silva');
    expect(out).not.toContain('silva@exemplo.com.br');
    // e o que a allowlist autoriza continua lá (String() para os numéricos, como o canonicalizador faz)
    for (const [k, v] of Object.entries(allowed)) expect(JSON.parse(out)[k]).toBe(String(v));
  });
});
