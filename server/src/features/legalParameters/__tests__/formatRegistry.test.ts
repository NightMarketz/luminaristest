/**
 * BE-INCR-PAIS-NA-BORDA-F3 itens 1, 2 e 7 (contrato do registro) — registro de brinquedo, sem tabela real: a plataforma
 * aplica o envelope de mensagem (F-F3-7 a), recusa composição inválida, roda a checagem entre tabelas em cada data de
 * corte da vigência (F-F3-5 a, F-F3-8 a) e o gancho de fim obrigatório (F-F3-6 a).
 */
import type { LinhaLegal } from '../models/legalParameter';
import {
  LegalParameterFormatRegistryError,
  createFormatRegistry,
  type LegalParameterFormatRegistration,
} from '../models/formatRegistry';

const reg = (r: Partial<LegalParameterFormatRegistration> & { table: string }): LegalParameterFormatRegistration => ({
  domain: 'toy',
  country: 'zz',
  value: 'int',
  check: () => null,
  ...r,
});

let seq = 0;
const linha = (o: Partial<LinhaLegal> & Pick<LinhaLegal, 'tabela' | 'chave' | 'vigenteDesde'>): LinhaLegal => ({
  id: `l${++seq}`,
  discriminador: null,
  valorInt: null,
  valorTexto: null,
  valorJson: null,
  fonte: 'teste',
  vigenteAte: null,
  status: 'PUBLISHED',
  supersedesId: null,
  ...o,
});

describe('formatRegistry — envelope de mensagem (item 1)', () => {
  const r = createFormatRegistry([
    reg({ table: 'T', value: 'int', check: (l) => (l.chave === 'X' ? null : 'chave X') }),
    reg({ table: 'M', value: (l) => (l.chave === 'TXT' ? 'text' : 'json') }),
  ]);

  it('valor ausente dá o texto de hoje do formatoLinha', () => {
    expect(r.formatError({ tabela: 'T', chave: 'X', valorTexto: 'a' })).toBe('T: o valor desta tabela é valorInt.');
    expect(r.formatError({ tabela: 'M', chave: 'TXT', valorJson: {} })).toBe('M: o valor desta tabela é valorTexto.');
    expect(r.formatError({ tabela: 'M', chave: 'J', valorTexto: 'a' })).toBe('M: o valor desta tabela é valorJson.');
  });

  it('erro da regra vem como <T>/<chave>: <erro>.', () => {
    expect(r.formatError({ tabela: 'T', chave: 'Y', valorInt: 1 })).toBe('T/Y: chave X.');
    expect(r.formatError({ tabela: 'T', chave: 'X', valorInt: 1 })).toBeNull();
  });

  it('tabela não registrada dá erro nomeado, nunca null', () => {
    expect(r.formatError({ tabela: 'NAO_EXISTE', chave: 'X', valorInt: 1 })).toBe('NAO_EXISTE: tabela sem formato registrado.');
    expect(r.has('NAO_EXISTE')).toBe(false);
  });

  it('tables() lista domínio, país e tipo do valor (mixed quando é função)', () => {
    expect(r.tables()).toEqual([
      { table: 'T', domain: 'toy', country: 'zz', value: 'int' },
      { table: 'M', domain: 'toy', country: 'zz', value: 'mixed' },
    ]);
  });
});

describe('createFormatRegistry — composição validada (item 2)', () => {
  it.each([
    ['tabela duplicada', [reg({ table: 'A' }), reg({ table: 'A', domain: 'outro' })], /registrada duas vezes/],
    ['requires órfão', [reg({ table: 'B', requires: ['A'] })], /requires aponta para A/],
    ['country fora do ISO', [reg({ table: 'A', country: 'BR' })], /country "BR"/],
    ['domain vazio', [reg({ table: 'A', domain: ' ' })], /domain vazio/],
  ])('%s ⇒ LegalParameterFormatRegistryError', (_nome, regs, msg) => {
    expect(() => createFormatRegistry(regs)).toThrow(LegalParameterFormatRegistryError);
    expect(() => createFormatRegistry(regs)).toThrow(msg);
  });
});

describe('checagem entre tabelas (item 7; F-F3-5 a, F-F3-8 a)', () => {
  // B.valorInt tem de estar entre MIN e MAX de A, em toda a vigência da linha de B.
  const r = createFormatRegistry([
    reg({ table: 'A' }),
    reg({
      table: 'B',
      requires: ['A'],
      checkAgainst: (l, ctx) => {
        const a = ctx.rowsInForce('A');
        const min = a.find((x) => x.chave === 'MIN')?.valorInt;
        const max = a.find((x) => x.chave === 'MAX')?.valorInt;
        if (min == null || max == null) return 'sem limites de A em vigor';
        return (l.valorInt ?? 0) >= min && (l.valorInt ?? 0) <= max ? null : `fora de ${min}..${max}`;
      },
    }),
  ]);
  const deps = (rows: LinhaLegal[]) => ({ rowsOf: (t: string) => rows.filter((x) => x.tabela === t) });

  const limites2026 = [
    linha({ tabela: 'A', chave: 'MIN', valorInt: 5, vigenteDesde: '2026-01-01', vigenteAte: '2026-03-31' }),
    linha({ tabela: 'A', chave: 'MAX', valorInt: 20, vigenteDesde: '2026-01-01' }),
    // o limite muda no meio do ano
    linha({ tabela: 'A', chave: 'MIN', valorInt: 10, vigenteDesde: '2026-04-01' }),
  ];

  it('passa quando vale em todas as datas de corte', () => {
    expect(r.formatError({ tabela: 'B', chave: 'X', valorInt: 12, vigenteDesde: '2026-01-01', vigenteAte: '2026-12-31' }, deps(limites2026))).toBeNull();
  });

  it('reprova se um limite que muda no meio da vigência a deixa de fora (F-F3-5 a, não só no vigenteDesde)', () => {
    expect(r.formatError({ tabela: 'B', chave: 'X', valorInt: 7, vigenteDesde: '2026-01-01', vigenteAte: '2026-12-31' }, deps(limites2026))).toBe(
      'B/X: fora de 10..20 (em 2026-04-01).',
    );
  });

  it('a mesma linha com vigência só no 1º trimestre passa (o corte fora do intervalo não conta)', () => {
    expect(r.formatError({ tabela: 'B', chave: 'X', valorInt: 7, vigenteDesde: '2026-01-01', vigenteAte: '2026-03-31' }, deps(limites2026))).toBeNull();
  });

  it('dependência ausente em vigenteDesde reprova', () => {
    expect(r.formatError({ tabela: 'B', chave: 'X', valorInt: 12, vigenteDesde: '2025-06-01', vigenteAte: null }, deps(limites2026))).toBe(
      'B/X: sem limites de A em vigor (em 2025-06-01).',
    );
  });

  it('linha revogada ou substituída de A não conta (linhasEmVigor)', () => {
    const max = linha({ tabela: 'A', chave: 'MAX', valorInt: 20, vigenteDesde: '2026-01-01' });
    const rows = [
      linha({ tabela: 'A', chave: 'MIN', valorInt: 5, vigenteDesde: '2026-01-01' }),
      max,
      linha({ tabela: 'A', chave: 'MAX', valorInt: 8, vigenteDesde: '2026-01-01', supersedesId: max.id }),
      linha({ tabela: 'A', chave: 'MIN', valorInt: 0, vigenteDesde: '2026-01-01', status: 'REVOKED' }),
    ];
    expect(r.formatError({ tabela: 'B', chave: 'X', valorInt: 12, vigenteDesde: '2026-01-01' }, deps(rows))).toBe('B/X: fora de 5..8 (em 2026-01-01).');
  });

  it('sem deps ou sem vigenteDesde, a checagem cruzada não roda (paridade dos testes de linha)', () => {
    expect(r.formatError({ tabela: 'B', chave: 'X', valorInt: 999, vigenteDesde: '2026-01-01' })).toBeNull();
    expect(r.formatError({ tabela: 'B', chave: 'X', valorInt: 999 }, deps(limites2026))).toBeNull();
    expect(r.requiredTables('B')).toEqual(['A']);
    expect(r.requiredTables('A')).toEqual([]);
  });

  it('ler tabela fora de requires é erro de programação', () => {
    const errado = createFormatRegistry([reg({ table: 'A' }), reg({ table: 'C' }), reg({ table: 'B', requires: ['A'], checkAgainst: (_l, ctx) => (ctx.rowsInForce('C').length ? null : 'x') })]);
    expect(() => errado.formatError({ tabela: 'B', chave: 'X', valorInt: 1, vigenteDesde: '2026-01-01' }, deps([]))).toThrow(/fora de requires/);
  });
});

describe('fim obrigatório (F-F3-6 a)', () => {
  const r = createFormatRegistry([reg({ table: 'F', endRequired: (l) => l.chave === 'FIM' }), reg({ table: 'G' })]);

  it('a linha marcada exige vigenteAte; as outras não', () => {
    expect(r.endRequiredError({ tabela: 'F', chave: 'FIM', vigenteAte: null })).toBe(
      'F/FIM: vigenteAte é obrigatório — a apuração lê o fim da lei desta linha; sem ele a publicação derrubaria o cálculo de toda a plataforma.',
    );
    expect(r.endRequiredError({ tabela: 'F', chave: 'FIM', vigenteAte: '2026-12-31' })).toBeNull();
    expect(r.endRequiredError({ tabela: 'F', chave: 'OUTRA', vigenteAte: null })).toBeNull();
    expect(r.endRequiredError({ tabela: 'G', chave: 'FIM', vigenteAte: null })).toBeNull();
  });
});
