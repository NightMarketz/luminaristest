import { describe, it, expect, vi } from 'vitest';
import { detectarTabelaSocios, ordenarTabelasSocios, tabelasDaLista } from '../defisSocios';

/** PR-D item 14 — sócio = linha de tabela à escolha (D-2026-10-16-FE-SIMPLES-PR-D-LACUNAS); o BE guarda só o id. */
const T = tabelasDaLista([
  { id: 'x', internalName: 'products', name: 'Produtos' },
  { id: 'e', internalName: 'employees', name: 'Funcionários' },
  { id: 'c', internalName: 'crmContacts', displayName: 'Contatos' },
  { internalName: 'semId' },
]);

describe('defisSocios', () => {
  it('tabelasDaLista ignora entrada sem id e prefere displayName', () => {
    expect(T.map((t) => [t.id, t.nome])).toEqual([['x', 'Produtos'], ['e', 'Funcionários'], ['c', 'Contatos']]);
    expect(tabelasDaLista(null)).toEqual([]);
  });

  it('ordena tabelas de pessoas primeiro (crmContacts antes de employees), o resto na ordem do BE', () => {
    expect(ordenarTabelasSocios(T).map((t) => t.id)).toEqual(['c', 'e', 'x']);
  });

  it('acha a primeira tabela que contém TODOS os ids; tabela com erro é pulada', async () => {
    const carregar = vi.fn(async (id: string) => {
      if (id === 'c') throw new Error('sem acesso');
      if (id === 'e') return [{ id: 's1', rotulo: 'Ana' }];
      return [{ id: 's1', rotulo: 'Ana' }, { id: 's2', rotulo: 'Bia' }];
    });
    const r = await detectarTabelaSocios(['s1', 's2'], T, carregar);
    expect(r?.tabela.id).toBe('x');
    expect(r?.rotulos).toEqual({ s1: 'Ana', s2: 'Bia' });
    expect(carregar.mock.calls.map((c) => c[0])).toEqual(['c', 'e', 'x']);
  });

  it('sem ids não carrega nada; nenhuma tabela com todos ⇒ null', async () => {
    const carregar = vi.fn(async () => [] as Array<{ id: string; rotulo: string }>);
    expect(await detectarTabelaSocios([], T, carregar)).toBeNull();
    expect(carregar).not.toHaveBeenCalled();
    expect(await detectarTabelaSocios(['zz'], T, carregar)).toBeNull();
  });
});
