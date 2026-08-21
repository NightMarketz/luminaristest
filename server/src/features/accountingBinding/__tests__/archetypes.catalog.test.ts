/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A) — catálogo fechado (item 4/5 do BRIEF, teste
 * explicitamente pedido: "catálogo fechado (chave desconhecida → undefined)").
 */
import { archetypeCatalog } from '../archetypes/catalog';

describe('ArchetypeCatalog — fechado', () => {
  it('devolve undefined para uma chave desconhecida (nunca lança, nunca inventa)', () => {
    expect(archetypeCatalog.get('nao-existe')).toBeUndefined();
    expect(archetypeCatalog.get('')).toBeUndefined();
    expect(archetypeCatalog.get('revenue-recognition')).toBeUndefined(); // hífen != underscore
  });

  it('resolve exatamente as 6 chaves do ArchetypeKeySchema (5 classe-1 + 1 classe-2)', () => {
    const expectedKeys = [
      'revenue_recognition',
      'settlement',
      'reversal',
      'performance_liability',
      'cogs',
      'subledger_command',
    ];
    for (const key of expectedKeys) {
      expect(archetypeCatalog.get(key)).toBeDefined();
      expect(archetypeCatalog.get(key)?.name).toEqual(expect.any(String));
    }
  });

  it('all() devolve exatamente 6 arquétipos — 5 de kind postEntry, 1 de kind createSubledgerRecord', () => {
    const all = archetypeCatalog.all();
    expect(all).toHaveLength(6);

    const postEntryCount = all.filter((a) => a.kind === 'postEntry').length;
    const subledgerCount = all.filter((a) => a.kind === 'createSubledgerRecord').length;
    expect(postEntryCount).toBe(5);
    expect(subledgerCount).toBe(1);
  });

  it('all() não tem chave/nome duplicado — nenhum item colide com outro no lookup', () => {
    const all = archetypeCatalog.all();
    const names = all.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('get() é idempotente e all() é estável entre chamadas (catálogo é dado estático)', () => {
    const first = archetypeCatalog.get('revenue_recognition');
    const second = archetypeCatalog.get('revenue_recognition');
    expect(first).toBe(second); // mesma referência — não reconstrói a cada get()
    expect(archetypeCatalog.all()).toHaveLength(archetypeCatalog.all().length);
  });

  it('o arquétipo classe-2 resolve pela chave subledger_command com o shape esperado', () => {
    const commandArchetype = archetypeCatalog.get('subledger_command');
    expect(commandArchetype?.kind).toBe('createSubledgerRecord');
    if (commandArchetype?.kind === 'createSubledgerRecord') {
      expect(commandArchetype.targetSubledger).toBe('receivable');
      expect(commandArchetype.idempotencyKey).toBe('documentNumber');
    }
  });
});
