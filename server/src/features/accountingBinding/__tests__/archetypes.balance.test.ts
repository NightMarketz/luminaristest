/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A, item 4 do BRIEF) — propriedade de balanceamento por
 * arquétipo: "balanceiam por construção (Σdebit==Σcredit simbólico)".
 *
 * O arquétipo não carrega valores numéricos (quem preenche é o binding, em runtime); a propriedade
 * verificável NESTE nível é SIMBÓLICA: o conjunto de slots que alimentam o lado devedor tem que
 * ser exatamente o mesmo conjunto de slots que alimentam o lado credor — nenhum arquétipo pode
 * declarar um débito de um total que o crédito não reparte de volta (e vice-versa). Isso espelha
 * `PostEntrySchema.lines.min(2)` (`PostingDto.ts:107`) e o desenho de cada mapper original: em
 * TODOS os 5 arquétipos do corpus, o débito e o(s) crédito(s) partem do MESMO slot de dinheiro
 * (`amount` em 4 deles, `costCents` no CMV) — a linha de crédito extra do split de receita por
 * natureza reparte o mesmo `amount`, nunca introduz um total próprio.
 */
import { ACCOUNT_ROLES, type LancamentoArchetype } from '../models/types';
import { archetypeCatalog } from '../archetypes/catalog';

const lancamentoArchetypes = archetypeCatalog
  .all()
  .filter((a): a is LancamentoArchetype => a.kind === 'postEntry');

describe('Arquétipos classe 1 (postEntry) — balanceamento por construção', () => {
  it('o catálogo real tem os 5 arquétipos classe-1 do corpus', () => {
    expect(lancamentoArchetypes).toHaveLength(5);
  });

  it.each(lancamentoArchetypes.map((a) => [a.name, a] as const))(
    '%s: tem ao menos 2 linhas, ao menos 1 débito e 1 crédito (espelha PostEntrySchema.lines.min(2))',
    (_name, archetype) => {
      expect(archetype.lines.length).toBeGreaterThanOrEqual(2);
      const debitLines = archetype.lines.filter((l) => l.side === 'debit');
      const creditLines = archetype.lines.filter((l) => l.side === 'credit');
      expect(debitLines.length).toBeGreaterThanOrEqual(1);
      expect(creditLines.length).toBeGreaterThanOrEqual(1);
    },
  );

  it.each(lancamentoArchetypes.map((a) => [a.name, a] as const))(
    '%s: todo role usado pelas linhas pertence à union AccountRole congelada (item 3 do BRIEF)',
    (_name, archetype) => {
      for (const line of archetype.lines) {
        expect(ACCOUNT_ROLES).toContain(line.role);
      }
    },
  );

  it.each(lancamentoArchetypes.map((a) => [a.name, a] as const))(
    '%s: todo amountSlot referenciado por uma linha corresponde a um slot declarado (sem referência órfã)',
    (_name, archetype) => {
      const slotNames = new Set(archetype.slots.map((s) => s.name));
      for (const line of archetype.lines) {
        expect(slotNames.has(line.amountSlot)).toBe(true);
      }
    },
  );

  it.each(lancamentoArchetypes.map((a) => [a.name, a] as const))(
    '%s: Σdebit==Σcredit SIMBÓLICO — o conjunto de slots do lado débito === o conjunto do lado crédito',
    (_name, archetype) => {
      const debitSlots = new Set(archetype.lines.filter((l) => l.side === 'debit').map((l) => l.amountSlot));
      const creditSlots = new Set(archetype.lines.filter((l) => l.side === 'credit').map((l) => l.amountSlot));
      expect([...debitSlots].sort()).toEqual([...creditSlots].sort());
    },
  );

  it.each(lancamentoArchetypes.map((a) => [a.name, a] as const))(
    '%s: só a linha marcada optional pode ser omitida — nenhuma linha obrigatória some do balanceamento',
    (_name, archetype) => {
      const requiredLines = archetype.lines.filter((l) => l.optional !== true);
      // Removendo TODAS as linhas opcionais, o resto ainda tem >=1 débito e >=1 crédito — o
      // arquétipo nunca depende de uma linha opcional para fechar o balanço mínimo.
      const requiredDebit = requiredLines.filter((l) => l.side === 'debit');
      const requiredCredit = requiredLines.filter((l) => l.side === 'credit');
      expect(requiredDebit.length).toBeGreaterThanOrEqual(1);
      expect(requiredCredit.length).toBeGreaterThanOrEqual(1);
    },
  );

  it('cada arquétipo tem exatamente os sourceType/roles esperados do corpus (grounding contra o dossiê)', () => {
    const byName = new Map(lancamentoArchetypes.map((a) => [a.name, a]));

    expect(byName.get('reconhecimento-receita')?.sourceType).toBe('sale.finalized');
    expect(byName.get('reconhecimento-receita')?.lines.map((l) => l.role)).toEqual([
      'controle-recebível',
      'receita-serviço',
      'receita-revenda',
    ]);

    expect(byName.get('liquidacao')?.sourceType).toBe('sale.settled');
    expect(byName.get('liquidacao')?.lines.map((l) => l.role)).toEqual([
      'caixa-por-metodo',
      'controle-recebível',
    ]);

    expect(byName.get('estorno-origem')?.sourceType).toBe('sale.returned');
    expect(byName.get('estorno-origem')?.lines.map((l) => l.role)).toEqual([
      'contra-receita',
      'controle-recebível',
    ]);

    expect(byName.get('passivo-performance')?.sourceType).toBe('sale.package.sold');
    expect(byName.get('passivo-performance')?.lines.map((l) => l.role)).toEqual([
      'controle-recebível',
      'passivo-diferido',
    ]);

    expect(byName.get('cmv')?.sourceType).toBe('sale.cogs');
    expect(byName.get('cmv')?.lines.map((l) => l.role)).toEqual([
      'custo-mercadoria-vendida',
      'estoque',
    ]);
  });

  it('o slot moneyCentsExact (cmv) é distinto do slot moneyReais (amount) dos demais 4 arquétipos', () => {
    const cogs = lancamentoArchetypes.find((a) => a.name === 'cmv')!;
    expect(cogs.slots.some((s) => s.type === 'moneyCentsExact' && s.name === 'costCents')).toBe(true);
    expect(cogs.slots.some((s) => s.name === 'amount')).toBe(false);

    const others = lancamentoArchetypes.filter((a) => a.name !== 'cmv');
    for (const archetype of others) {
      expect(archetype.slots.some((s) => s.type === 'moneyReais' && s.name === 'amount')).toBe(true);
    }
  });

  it('somente reconhecimento-receita declara o slot revenueByNatureReais (split por natureza)', () => {
    const withSplit = lancamentoArchetypes.filter((a) =>
      a.slots.some((s) => s.type === 'revenueByNatureReais'),
    );
    expect(withSplit.map((a) => a.name)).toEqual(['reconhecimento-receita']);
  });

  it('todo arquétipo classe-1 declara o slot opcional de dimensão (emenda 2, ADR §11)', () => {
    for (const archetype of lancamentoArchetypes) {
      expect(archetype.slots.some((s) => s.name === 'dimension' && s.type === 'string')).toBe(true);
      expect(archetype.invariants).toContain('dimension-slot-optional');
    }
  });
});
