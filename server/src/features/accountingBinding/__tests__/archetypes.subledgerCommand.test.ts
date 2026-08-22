/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A, item 5 do BRIEF) — arquétipo classe 2
 * `criacao-titulo-receber`: "segunda emissão do mesmo comando converge sem duplicar (asserção na
 * SEGUNDA chamada — lição `comentario-de-teste-afirma-o-que-nao-assere`)".
 *
 * Cada teste abaixo SIMULA duas emissões do comando: a primeira contra um subledger vazio, a
 * segunda contra o subledger já atualizado pelo efeito (hipotético) da primeira — e a asserção que
 * prova convergência mora SEMPRE na segunda chamada, nunca só na primeira (a primeira sozinha só
 * prova que o classificador funciona, não que ele CONVERGE numa reemissão).
 */
import {
  classifySubledgerIdempotency,
  type SubledgerRecordRow,
} from '../archetypes/SubledgerCreateReceivableArchetype';
import { archetypeCatalog } from '../archetypes/catalog';

const DOC = 'CRM-opp-123';

describe('criacao-titulo-receber — guard 1: chave de negócio por documentNumber', () => {
  it('primeira emissão (subledger vazio) classifica not_booked — seguro criar', () => {
    const outcome = classifySubledgerIdempotency([], DOC);
    expect(outcome.kind).toBe('not_booked');
  });

  it('SEGUNDA emissão do mesmo comando, após a primeira ter criado a linha, converge para already_booked (não duplica)', () => {
    // 1ª emissão: subledger vazio → not_booked (a chamadora criaria a linha aqui, fora deste teste).
    const firstOutcome = classifySubledgerIdempotency([], DOC);
    expect(firstOutcome.kind).toBe('not_booked');

    // Efeito simulado da 1ª emissão: uma linha viva agora existe sob a mesma chave.
    const rowsAfterFirstCreate: SubledgerRecordRow[] = [
      { id: 'rec-1', documentNumber: DOC, deletedAt: null, cancelledById: null },
    ];

    // 2ª emissão do MESMO comando — a asserção que prova "converge sem duplicar" está AQUI.
    const secondOutcome = classifySubledgerIdempotency(rowsAfterFirstCreate, DOC);
    expect(secondOutcome.kind).toBe('already_booked');
  });
});

describe('criacao-titulo-receber — guard 2: lookup tombstone-aware', () => {
  it('tombstone ESTRITO (deleted:<seg>:<doc>) sem cancelledById é RETRYABLE — segunda emissão pode recriar', () => {
    const machineCompensatedTombstone: SubledgerRecordRow[] = [
      {
        id: 'rec-1',
        documentNumber: `deleted:abc123:${DOC}`,
        deletedAt: new Date('2026-01-01'),
        cancelledById: null, // compensação de máquina — sem ator humano
      },
    ];
    const outcome = classifySubledgerIdempotency(machineCompensatedTombstone, DOC);
    expect(outcome.kind).toBe('not_booked'); // retryable — não bloqueia a reemissão
  });

  it('documentNumber que só COINCIDE de terminar com o sufixo (não é tombstone estrito) não bloqueia', () => {
    // Um documentNumber MANUAL que por acaso termina com ":<DOC>" mas não começa com "deleted:"
    // não deve ser confundido com um tombstone real (CrmReceivableBridge.ts:212-216, review L3).
    const lookAlike: SubledgerRecordRow[] = [
      { id: 'rec-1', documentNumber: `manual:${DOC}`, deletedAt: new Date('2026-01-01'), cancelledById: 'user-1' },
    ];
    const outcome = classifySubledgerIdempotency(lookAlike, DOC);
    expect(outcome.kind).toBe('not_booked');
  });

  it('tombstone com segmento vazio (deleted::<doc>) não é estrito — não bloqueia', () => {
    const malformedTombstone: SubledgerRecordRow[] = [
      { id: 'rec-1', documentNumber: `deleted::${DOC}`, deletedAt: new Date('2026-01-01'), cancelledById: 'user-1' },
    ];
    const outcome = classifySubledgerIdempotency(malformedTombstone, DOC);
    expect(outcome.kind).toBe('not_booked');
  });
});

describe('criacao-titulo-receber — guard 3: cancelado nunca ressuscita', () => {
  it('tombstone estrito COM cancelledById (cancelamento humano) permanece already_booked para sempre', () => {
    const humanCancelledTombstone: SubledgerRecordRow[] = [
      {
        id: 'rec-1',
        documentNumber: `deleted:abc123:${DOC}`,
        deletedAt: new Date('2026-01-01'),
        cancelledById: 'user-42',
      },
    ];
    const outcome = classifySubledgerIdempotency(humanCancelledTombstone, DOC);
    expect(outcome.kind).toBe('already_booked');
  });

  it('SEGUNDA emissão após cancelamento humano continua bloqueada — nunca ressuscita', () => {
    // 1ª leitura: já cancelado por humano.
    const rows: SubledgerRecordRow[] = [
      {
        id: 'rec-1',
        documentNumber: `deleted:abc123:${DOC}`,
        deletedAt: new Date('2026-01-01'),
        cancelledById: 'user-42',
      },
    ];
    const firstOutcome = classifySubledgerIdempotency(rows, DOC);
    expect(firstOutcome.kind).toBe('already_booked');

    // 2ª emissão (o mesmo snapshot, simulando um retry imediato) — a asserção na SEGUNDA chamada
    // é o que prova que a cerca é estável, não um artefato de estado transiente.
    const secondOutcome = classifySubledgerIdempotency(rows, DOC);
    expect(secondOutcome.kind).toBe('already_booked');
  });
});

describe('criacao-titulo-receber — convergência de corrida (twins vivos sob a mesma chave)', () => {
  it('duas linhas VIVAS sob a mesma chave convergem para a de menor id, marcando a outra para cancelar', () => {
    const twins: SubledgerRecordRow[] = [
      { id: 'rec-9', documentNumber: DOC, deletedAt: null, cancelledById: null },
      { id: 'rec-2', documentNumber: DOC, deletedAt: null, cancelledById: null },
    ];
    const outcome = classifySubledgerIdempotency(twins, DOC);
    expect(outcome).toEqual({
      kind: 'converge_twins',
      survivorId: 'rec-2',
      twinIdsToCancel: ['rec-9'],
    });
  });

  it('SEGUNDA emissão após o convergimento (só o sobrevivente restou) classifica already_booked — não duplica de novo', () => {
    const twins: SubledgerRecordRow[] = [
      { id: 'rec-9', documentNumber: DOC, deletedAt: null, cancelledById: null },
      { id: 'rec-2', documentNumber: DOC, deletedAt: null, cancelledById: null },
    ];
    const firstOutcome = classifySubledgerIdempotency(twins, DOC);
    expect(firstOutcome.kind).toBe('converge_twins');

    // Efeito simulado da convergência: só o sobrevivente (rec-2) continua vivo.
    const rowsAfterConvergence: SubledgerRecordRow[] = [
      { id: 'rec-2', documentNumber: DOC, deletedAt: null, cancelledById: null },
      { id: 'rec-9', documentNumber: `deleted:x:${DOC}`, deletedAt: new Date(), cancelledById: 'system-sweep' },
    ];
    const secondOutcome = classifySubledgerIdempotency(rowsAfterConvergence, DOC);
    expect(secondOutcome.kind).toBe('already_booked'); // convergiu — não duplica numa 3ª emissão
  });
});

describe('criacao-titulo-receber — shape do arquétipo no catálogo', () => {
  it('está registrado no catálogo sob a chave subledger_command com os slots do dossiê §3', () => {
    const archetype = archetypeCatalog.get('subledger_command');
    expect(archetype?.kind).toBe('createSubledgerRecord');
    if (archetype?.kind !== 'createSubledgerRecord') throw new Error('unreachable');

    expect(archetype.name).toBe('criacao-titulo-receber');
    expect(archetype.idempotencyKey).toBe('documentNumber');
    expect(archetype.targetSubledger).toBe('receivable');

    const slotNames = archetype.slots.map((s) => s.name);
    expect(slotNames).toEqual(
      expect.arrayContaining(['amount', 'occurredAt', 'label', 'accountRef', 'dimension']),
    );
  });
});
