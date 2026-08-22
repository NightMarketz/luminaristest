/**
 * `AccountRole` — congelamento da union (BE-INCR-BINDING-PRESS Fase 0, item 3 do BRIEF, F-BP-3a
 * ratificada). Prova DOIS ângulos que um `tsc` sozinho não fecha:
 *
 *  1. `ACCOUNT_ROLES` (o array em runtime) é EXATAMENTE os 9 papéis do
 *     `P1-DOSSIER-arquetipos.md:298-307` — sem duplicata, sem papel a mais/a menos. Um `tsc` limpo
 *     não pega um array desalinhado do type (o array é só `readonly AccountRole[]`, aceitaria um
 *     subconjunto sem erro de tipo).
 *  2. Exaustividade type-level: a função `assertExhaustiveAccountRole` abaixo só compila se o
 *     `switch` cobrir TODO membro da union — adicionar um papel ao type sem atualizar este arquivo
 *     quebra `tsc --noEmit` (o gate do BRIEF), não silenciosamente.
 *
 * O que este arquivo NÃO cobre (fica para o Corpo A, itens 4/5 do BRIEF, que ainda não existem
 * nesta Fase 0): "todo `role` usado pelos arquétipos do catálogo pertence à union" — essa checagem
 * precisa do catálogo real de arquétipos, que é trabalho paralelo POSTERIOR a esta fase.
 */
import { ACCOUNT_ROLES, type AccountRole } from '../types';

describe('ACCOUNT_ROLES — congelamento F-BP-3(a)', () => {
  it('tem exatamente os 9 papéis do dossiê, sem duplicata', () => {
    const expected = [
      'controle-recebível',
      'receita-serviço',
      'receita-revenda',
      'caixa-por-metodo',
      'contra-receita',
      'passivo-diferido',
      'passivo-adiantamento',
      'custo-mercadoria-vendida',
      'estoque',
    ];
    expect(ACCOUNT_ROLES).toHaveLength(9);
    expect(new Set(ACCOUNT_ROLES).size).toBe(9); // sem duplicata
    expect([...ACCOUNT_ROLES].sort()).toEqual([...expected].sort());
  });
});

/** Exaustividade em tempo de compilação: se `AccountRole` ganhar um membro novo sem entrar aqui,
 *  o `default` abaixo deixa de ser inalcançável e `tsc --noEmit` reprova no `never`. */
function assertExhaustiveAccountRole(role: AccountRole): void {
  switch (role) {
    case 'controle-recebível':
    case 'receita-serviço':
    case 'receita-revenda':
    case 'caixa-por-metodo':
    case 'contra-receita':
    case 'passivo-diferido':
    case 'passivo-adiantamento':
    case 'custo-mercadoria-vendida':
    case 'estoque':
      return;
    default: {
      const _exhaustive: never = role;
      throw new Error(`AccountRole não coberto: ${String(_exhaustive)}`);
    }
  }
}

describe('AccountRole — exaustividade type-level', () => {
  it('todo valor de ACCOUNT_ROLES passa pelo switch exaustivo sem cair no default', () => {
    for (const role of ACCOUNT_ROLES) {
      expect(() => assertExhaustiveAccountRole(role)).not.toThrow();
    }
  });
});
