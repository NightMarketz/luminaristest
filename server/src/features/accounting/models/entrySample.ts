import { createHash } from 'node:crypto';

/**
 * Amostragem determinística de lançamentos por conta (C6b PR-2 Passo 9, F-C6b-5/8 a —
 * `EXPORT_ENTRY_SAMPLE`, BRIEF item 10). PURA: nenhum acesso a banco/relógio; a mesma
 * entrada + a mesma `seed` produzem sempre a mesma amostra, em qualquer processo.
 *
 * Uma "linha amostrável" é UMA PERNA (leg/posting) de um lançamento, já resolvida ao
 * `accountCode` — não o lançamento inteiro. "Conta com movimento" (F-C6b-5 a) é trivial
 * por construção: toda conta que aparece em ≥1 item de `legs` já tem movimento na janela
 * que o chamador usou para montar `legs` (a janela em si é responsabilidade do service,
 * via `IJournalEntryRepository.findManyForExport`).
 */
export interface SampleableLeg {
  accountCode: string;
  entryId: string;
  entryNumber: number | null;
  date: Date;
  description: string;
  sourceType: string;
  sourceId: string | null;
  debitCents: number;
  creditCents: number;
}

/**
 * Chave de ranking (F-C6b-8 a): `sha256(seed|accountCode|entryId)`, hex. Determinística e
 * sem estado — nenhum PRNG a semear, reproduzível por qualquer um com uma planilha e um
 * terminal (a MESMA razão que rejeitou o PRNG semeado, caminho (b) do fork).
 */
function rankKey(seed: string, accountCode: string, entryId: string): string {
  return createHash('sha256').update(`${seed}|${accountCode}|${entryId}`).digest('hex');
}

/**
 * Agrupa `legs` por `accountCode` (ordem de agrupamento = ordem de primeira aparição em
 * `legs`, mas isso é só a ordem do RESULTADO — a SELEÇÃO dentro de cada grupo depende só
 * do hash), ordena cada grupo por `rankKey` (ordem lexicográfica do hex) e devolve os
 * `perAccount` primeiros de cada grupo. `n` por conta (F-C6b-5 a) — resultado e
 * patrimonial não são amostrados em separado: cada conta já tem UMA natureza, então "n
 * por conta" já cobre as duas populações sem lógica extra.
 */
export function sampleEntries(
  legs: SampleableLeg[],
  opts: { perAccount: number; seed: string },
): SampleableLeg[] {
  const byAccount = new Map<string, SampleableLeg[]>();
  for (const leg of legs) {
    const bucket = byAccount.get(leg.accountCode);
    if (bucket) bucket.push(leg);
    else byAccount.set(leg.accountCode, [leg]);
  }

  const result: SampleableLeg[] = [];
  for (const group of byAccount.values()) {
    const ranked = [...group].sort((a, b) => {
      const ha = rankKey(opts.seed, a.accountCode, a.entryId);
      const hb = rankKey(opts.seed, b.accountCode, b.entryId);
      return ha < hb ? -1 : ha > hb ? 1 : 0;
    });
    result.push(...ranked.slice(0, opts.perAccount));
  }
  return result;
}
