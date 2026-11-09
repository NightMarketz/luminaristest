/**
 * Tabela de transições declarada (PRE-ADR-LIFECYCLE-TRANSITIONS) — a forma ÚNICA de escrever o grafo de
 * um ciclo de vida de `status` no lado Prisma. Mesma forma do `ILifecycleRule.transitions` do motor de
 * DynamicTable (`{ de: [para...] }`) e do `VALID_RESULT_TRANSITIONS` do DF-e, agora tipada.
 *
 * NÃO é motor (ADR-DOMAIN-MOTOR rejeitado): sem fase, sem fila, sem efeito colateral, sem I/O. A transição
 * continua EXECUTADA pelo CAS do repositório (`updateMany where status in sourcesOf(tabela, para)`), que é
 * o que garante a corrida; a tabela só declara o que é legal, num lugar que tsc, teste e agente leem.
 *
 * Convenção:
 *  - todo estado é chave (o `satisfies TransitionTable<S>` reprova estado esquecido ou digitado errado);
 *  - estado terminal = lista vazia;
 *  - X → X só vale se constar. Nada de "mesmo status é sempre ok": o PATCH de `PaymentAccount` recusa o mesmo
 *    status com 409 (dono, 03/10). Recálculo que devolve o mesmo status é um no-op que o chamador pula antes.
 */
import { ValidationError } from './errors';

export type TransitionTable<S extends string> = Readonly<Record<S, readonly S[]>>;

export function canTransition<S extends string>(table: TransitionTable<S>, from: S, to: S): boolean {
  return table[from].includes(to);
}

/** Estados de onde `to` é alcançável num passo — o `status: { in: [...] }` do CAS do repositório. */
export function sourcesOf<S extends string>(table: TransitionTable<S>, to: S): S[] {
  return (Object.keys(table) as S[]).filter((from) => table[from].includes(to));
}

export function terminalStates<S extends string>(table: TransitionTable<S>): S[] {
  return (Object.keys(table) as S[]).filter((s) => table[s].length === 0);
}

/** Guarda para escrita NÃO condicional (recálculo de status fora de CAS): recusa a transição ilegal com 400. */
export function assertTransition<S extends string>(table: TransitionTable<S>, from: S, to: S, label: string): void {
  if (!canTransition(table, from, to)) {
    throw new ValidationError(`${label}: transição de status inválida (${from} → ${to}).`);
  }
}
