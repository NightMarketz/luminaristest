/**
 * Local memory of NF-e item mappings (FE-INCR-NFE, F-FENFE-4 → c): `(emitter document, cProd) → productRef`,
 * remembered after a successful import and offered as "lembrado" on the next note of the same emitter.
 * Per-browser convenience only (localStorage): never authoritative, never auto-submitted, every access in
 * try/catch (private windows, blocked storage, corrupt JSON all degrade to "nothing remembered").
 */
export const NFE_MAPPING_MEMORY_KEY = 'luminaris.nfe.mapping.v1';

type MemoryMap = Record<string, Record<string, string>>;

function read(): MemoryMap {
  try {
    const raw = window.localStorage.getItem(NFE_MAPPING_MEMORY_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as MemoryMap) : {};
  } catch {
    return {};
  }
}

function write(map: MemoryMap): void {
  try {
    window.localStorage.setItem(NFE_MAPPING_MEMORY_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — memory is a convenience, never an error */
  }
}

/** Mappings remembered for this emitter (`{}` when none or storage unavailable). */
export function recallNfeMappings(emitDoc: string): Record<string, string> {
  if (!emitDoc) return {};
  const found = read()[emitDoc];
  return found && typeof found === 'object' ? { ...found } : {};
}

/** Merge the confirmed mappings of a successful import into the emitter's memory. */
export function rememberNfeMappings(emitDoc: string, mappings: Array<{ cProd: string; productRef: string }>): void {
  if (!emitDoc || mappings.length === 0) return;
  const map = read();
  const current = { ...(map[emitDoc] ?? {}) };
  for (const m of mappings) if (m.cProd && m.productRef) current[m.cProd] = m.productRef;
  map[emitDoc] = current;
  write(map);
}

/** Drop one remembered mapping ("esquecer" on the row). */
export function forgetNfeMapping(emitDoc: string, cProd: string): void {
  if (!emitDoc) return;
  const map = read();
  if (!map[emitDoc]) return;
  delete map[emitDoc][cProd];
  if (Object.keys(map[emitDoc]).length === 0) delete map[emitDoc];
  write(map);
}
