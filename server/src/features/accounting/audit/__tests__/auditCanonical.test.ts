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
    // itemCount/kinds (C6b PR-3, Passo 12): pacote N-ário — número de itens + composição
    // (kinds vira string via canonicalização, mesmo padrão de todo valor não-string aqui).
    ['delivery.package_built', {
      deliveryId: 'd-1', ecdJobId: 'j-ecd', ecfJobId: 'j-ecf', periodStart: '2026-01-01',
      periodEnd: '2026-12-31', sha256Ecd: 'a'.repeat(64), sha256Ecf: 'b'.repeat(64),
      itemCount: '2', kinds: ['EXPORT_SPED_ECD', 'EXPORT_SPED_ECF'],
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

// BE-INCR-REVIEW-LAYER (nó C11, item 12) — teste-guarda de PII no MESMO PR que introduz os 6
// eventTypes (classe `accounting-audit-allowlist-guards`). `description` e `locator` do achado e
// `statement` do sign-off são texto livre digitado (nome de cliente, CPF, o que o profissional
// quiser escrever): mesmo passados por engano, NÃO sobrevivem à canonicalização.
describe('review.* — texto livre do achado/sign-off nunca sobrevive à canonicalização', () => {
  const FREE = { description: 'Cliente João da Silva CPF 529.982.247-25', locator: 'conta 1.1.2 João', statement: 'Atesto p/ João' };

  it.each([
    ['review.opened', { reviewId: 'r-1', ecdJobId: 'j-ecd', ecfJobId: 'j-ecf', year: 2026 }],
    ['review.finding_added', { reviewId: 'r-1', findingId: 'f-1', register: 'J150', severity: 'BLOCKER' }],
    ['review.finding_resolved', { reviewId: 'r-1', findingId: 'f-1', resolution: 'DATA_EDIT', targetType: 'account', targetId: 'acc-1' }],
    ['review.jobs_replaced', { reviewId: 'r-1', fromEcdJobId: 'j1', toEcdJobId: 'j2', fromEcfJobId: 'k1', toEcfJobId: 'k2' }],
    ['review.signed_off', { reviewId: 'r-1', reviewerName: 'Maria Contadora', reviewerCrc: 'SP-123456/O-1' }],
    ['review.rejected', { reviewId: 'r-1', reason: 'saldo não bate' }],
  ])('%s derruba description/locator/statement passados a mais', (eventType, allowed) => {
    const out = canonicalizeAuditPayload(eventType, { ...allowed, ...FREE });
    expect(out).not.toContain('João');
    expect(out).not.toContain('529.982.247-25');
    for (const [k, v] of Object.entries(allowed)) expect(JSON.parse(out)[k]).toBe(String(v));
  });
});

// BE-INCR-FIXED-ASSETS PR-1 (nó C8, item 2/3) — teste-guarda no MESMO PR que introduz os 2
// eventTypes (classe `accounting-audit-allowlist-guards`). `description`/`justification` são texto
// livre digitado (linhas CUSTOM); mesmo passados por engano, NÃO sobrevivem à canonicalização.
describe('depreciation_rate.* — texto livre da linha CUSTOM nunca sobrevive à canonicalização', () => {
  const FREE = { description: 'Torno CNC do fornecedor João', justification: 'Laudo técnico do João Perito' };

  it.each([
    ['depreciation_rate.created', { rateId: 'dr-1', source: 'CUSTOM', ncm: null, annualRateBp: 1000, lifeYears: 10 }],
    ['depreciation_rate.hidden', { rateId: 'dr-1', source: 'CUSTOM' }],
  ])('%s derruba description/justification passados a mais', (eventType, allowed) => {
    const out = canonicalizeAuditPayload(eventType, { ...allowed, ...FREE });
    expect(out).not.toContain('João');
    for (const [k, v] of Object.entries(allowed)) {
      if (v === null) expect(JSON.parse(out)[k]).toBeUndefined(); // null é OMITIDO, não vira "null"
      else expect(JSON.parse(out)[k]).toBe(String(v));
    }
  });
});

// BE-INCR-FIXED-ASSETS PR-2 (nó C8, itens 10/19) — teste-guarda no MESMO PR que introduz os 3
// eventTypes (classe `accounting-audit-allowlist-guards`). `description` do ativo é texto livre
// digitado pelo operador; mesmo passada por engano, NÃO sobrevive à canonicalização.
describe('fixed_asset.* — texto livre da descrição do ativo nunca sobrevive à canonicalização', () => {
  const FREE = { description: 'Torno CNC do fornecedor João da Silva' };

  it.each([
    ['fixed_asset.created', { assetId: 'fa-1' }],
    ['fixed_asset.activated', { assetId: 'fa-1', activatedAt: '2026-01-01', openingAccumulatedCents: '0' }],
    ['fixed_asset.disposed', { assetId: 'fa-1', entryId: 'je-1', gainLossCents: '-500' }],
  ])('%s derruba description passada a mais', (eventType, allowed) => {
    const out = canonicalizeAuditPayload(eventType, { ...allowed, ...FREE });
    expect(out).not.toContain('João');
    for (const [k, v] of Object.entries(allowed)) expect(JSON.parse(out)[k]).toBe(String(v));
  });
});

// BE-INCR-FIXED-ASSETS PR-3 (nó C8, item 17) — teste-guarda no MESMO PR que introduz o eventType
// (classe `accounting-audit-allowlist-guards`). `description` não faz parte do payload de
// `depreciation.posted`, mas a guarda prova que mesmo passada por engano não sobrevive.
describe('depreciation.posted — nenhum texto livre sobrevive à canonicalização', () => {
  it('derruba description passada a mais', () => {
    const allowed = { assetId: 'fa-1', yearMonth: '2026-01', quotaCents: '833', entryId: 'je-1' };
    const out = canonicalizeAuditPayload('depreciation.posted', { ...allowed, description: 'Torno CNC do fornecedor João da Silva' });
    expect(out).not.toContain('João');
    for (const [k, v] of Object.entries(allowed)) expect(JSON.parse(out)[k]).toBe(String(v));
  });
});

// BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 10) — teste-guarda de PII no MESMO PR que introduz os 5
// eventTypes (classe `accounting-audit-allowlist-guards`). Nome/CPF/e-mail/fone do signatário e o declarante da
// empresa (nome, CNPJ, e-mail) NÃO sobrevivem à canonicalização, mesmo passados por engano.
describe('company_signer.* / company_fiscal_profile.* — PII do signatário e do declarante nunca sobrevive', () => {
  const PII = {
    nome: 'Maria Sócia',
    cpf: '52998224725',
    email: 'maria@empresa.com.br',
    fone: '11987654321',
    declarante: 'Salão Bela LTDA',
    cnpj: '12345678000195',
    ecdNumOrd: '7',
    ecdNatLivr: 'DIARIO GERAL',
  };

  it.each([
    ['company_signer.created', { signerId: 's-1', qualifEcd: '203', qualifEcf: '203' }],
    ['company_signer.updated', { signerId: 's-1', qualifEcd: '205', qualifEcf: '205' }],
    ['company_signer.deleted', { signerId: 's-1' }],
    ['company_fiscal_profile.updated', { anoCalendario: '2026', regime: 'PRESUMIDO', grandePorte: 'false', representanteLegalSignerId: 's-1', copiadoDe: '2025' }],
    ['company_fiscal_profile.deleted', { anoCalendario: '2026' }],
  ])('%s derruba nome/CPF/e-mail/fone/declarante e mantém a allowlist', (eventType, allowed) => {
    const out = canonicalizeAuditPayload(eventType, { ...allowed, ...PII });
    for (const v of Object.values(PII)) expect(out).not.toContain(v);
    for (const [k, v] of Object.entries(allowed)) expect(JSON.parse(out)[k]).toBe(v);
  });
});
