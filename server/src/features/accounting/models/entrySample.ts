import { createHash } from 'node:crypto';

/**
 * Amostragem determinística de lançamentos por conta (C6b PR-2 Passo 9, F-C6b-5/8 a —
 * `EXPORT_ENTRY_SAMPLE`, BRIEF item 10). PURA: nenhum acesso a banco/relógio; a mesma
 * entrada + a mesma `seed` produzem sempre a mesma amostra, em qualquer processo.
 *
 * Uma "linha amostrável" ENTRA como UMA PERNA (leg/posting) de um lançamento, já resolvida ao
 * `accountCode`, mas a amostragem em si é por LANÇAMENTO: um lançamento com 2 pernas na MESMA
 * conta (ex.: dois débitos separados na mesma conta bancária) é agregado numa única linha
 * ANTES do rank (review #338 F2 — ALTO: sem isso, `['E1','E1']` provado, o mesmo lançamento
 * entrava 2× e `perAccount` contava pernas, não lançamentos, ao contrário do BRIEF item 10).
 * "Conta com movimento" (F-C6b-5 a) é trivial por construção: toda conta que aparece em ≥1
 * item de `legs` já tem movimento na janela que o chamador usou para montar `legs` (a janela
 * em si é responsabilidade do service, via `IJournalEntryRepository.findManyForExport`).
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
 * Agrega as pernas do MESMO lançamento na MESMA conta numa única linha — soma
 * `debitCents`/`creditCents`, mantém os demais campos da PRIMEIRA perna vista (são
 * idênticos entre pernas do mesmo lançamento: `date`/`description`/`sourceType`/`sourceId`/
 * `entryNumber` vêm do lançamento, não da perna). Ordem de saída = ordem de primeira
 * aparição de cada par `(accountCode, entryId)` em `legs`.
 *
 * Mapa ANINHADO (`accountCode -> entryId -> leg`), não uma chave de string concatenada: sem
 * delimitador a escolher, sem risco de colisão se `accountCode`/`entryId` algum dia contiver
 * o caractere separador.
 */
function dedupeByEntryAndAccount(legs: SampleableLeg[]): SampleableLeg[] {
  const byAccount = new Map<string, Map<string, SampleableLeg>>();
  const order: SampleableLeg[] = [];
  for (const leg of legs) {
    let byEntry = byAccount.get(leg.accountCode);
    if (!byEntry) {
      byEntry = new Map<string, SampleableLeg>();
      byAccount.set(leg.accountCode, byEntry);
    }
    const existing = byEntry.get(leg.entryId);
    if (existing) {
      existing.debitCents += leg.debitCents;
      existing.creditCents += leg.creditCents;
    } else {
      const clone: SampleableLeg = { ...leg };
      byEntry.set(leg.entryId, clone);
      order.push(clone);
    }
  }
  return order;
}

/**
 * Deduplica pernas do mesmo lançamento+conta (acima), agrupa por `accountCode` (ordem de
 * agrupamento = ordem de primeira aparição, mas isso é só a ordem do RESULTADO — a SELEÇÃO
 * dentro de cada grupo depende só do hash), ordena cada grupo por `rankKey` (ordem
 * lexicográfica do hex) e devolve os `perAccount` primeiros de cada grupo — agora `perAccount`
 * lançamentos DISTINTOS, não pernas. `n` por conta (F-C6b-5 a) — resultado e patrimonial não
 * são amostrados em separado: cada conta já tem UMA natureza, então "n por conta" já cobre as
 * duas populações sem lógica extra.
 */
export function sampleEntries(
  legs: SampleableLeg[],
  opts: { perAccount: number; seed: string },
): SampleableLeg[] {
  const deduped = dedupeByEntryAndAccount(legs);

  const byAccount = new Map<string, SampleableLeg[]>();
  for (const leg of deduped) {
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
