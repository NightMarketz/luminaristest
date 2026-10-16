/**
 * DEFIS — de qual tabela vem o sócio (D-2026-10-16-FE-SIMPLES-PR-D-LACUNAS, "tabela à escolha"). O BE guarda só o
 * `contactId` (`SimplesDefisSocioSchema`), sem a tabela; ao reabrir, a tela procura a tabela que contém todos os ids
 * gravados, nas tabelas de pessoas primeiro.
 */

export interface TabelaSocios {
  id: string;
  internalName: string;
  nome: string;
}

/** Tabelas de pessoa dos presets, na ordem de preferência; as demais vêm depois, na ordem do BE. */
const PREFERIDAS = ['crmContacts', 'clients', 'customers', 'contacts', 'employees'];

export function ordenarTabelasSocios(tabelas: readonly TabelaSocios[]): TabelaSocios[] {
  const rank = (t: TabelaSocios) => {
    const i = PREFERIDAS.indexOf(t.internalName);
    return i === -1 ? PREFERIDAS.length : i;
  };
  return tabelas.map((t, i) => ({ t, i })).sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i).map(({ t }) => t);
}

/** Lê a lista crua de `GET /dynamic-tables` sem confiar no shape. */
export function tabelasDaLista(lista: unknown): TabelaSocios[] {
  if (!Array.isArray(lista)) return [];
  const out: TabelaSocios[] = [];
  for (const m of lista) {
    if (!m || typeof m !== 'object') continue;
    const o = m as { id?: unknown; internalName?: unknown; name?: unknown; displayName?: unknown };
    if (o.id == null) continue;
    const internalName = typeof o.internalName === 'string' ? o.internalName : '';
    const nome = typeof o.displayName === 'string' ? o.displayName : typeof o.name === 'string' ? o.name : internalName || String(o.id);
    out.push({ id: String(o.id), internalName, nome });
  }
  return out;
}

/**
 * A primeira tabela (na ordem de `ordenarTabelasSocios`) cujas linhas contêm todos os `ids`; devolve também o rótulo de
 * cada linha. Tabela que falha ao carregar é pulada. Sem ids ⇒ `null` (nada a detectar).
 */
export async function detectarTabelaSocios(
  ids: readonly string[],
  tabelas: readonly TabelaSocios[],
  carregar: (tableId: string) => Promise<Array<{ id: string; rotulo: string }>>,
): Promise<{ tabela: TabelaSocios; rotulos: Record<string, string> } | null> {
  if (ids.length === 0) return null;
  for (const t of ordenarTabelasSocios(tabelas)) {
    let linhas: Array<{ id: string; rotulo: string }>;
    try {
      linhas = await carregar(t.id);
    } catch {
      continue;
    }
    const rotulos = Object.fromEntries(linhas.map((l) => [l.id, l.rotulo]));
    if (ids.every((id) => id in rotulos)) return { tabela: t, rotulos };
  }
  return null;
}
