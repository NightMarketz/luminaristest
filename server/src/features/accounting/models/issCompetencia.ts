import { z } from 'zod';
import { findLc116, type ListaLc116 } from './lc116ListaNacional';

/**
 * X7 Fase C PR-2 — ISS por competência × município (ADR-INCR-TAX-ASSESSMENT F-X7-12 → a: *"relatório somente leitura
 * por competência e município, somando o ISS dos `FiscalDocument` autorizados, com o retido separado e sem guia"*).
 * BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-brief.md` itens 13, 15, 16, 19; forks F-TC-1 (a), F-TC-2 (a) e
 * F-TC-4 (a) ratificados em 06/10 (D-2026-10-06-X7-FASE-C-FORKS). Puro: sem I/O, sem `new Date`, sem alíquota.
 */

const centsStr = z.string().regex(/^\d+$/);

/** Contrato de saída (BRIEF C §2.2) + coluna `divergentes` do F-TC-4 (a). */
export const IssLinhaSchema = z
  .object({
    competencia: z.string().regex(/^\d{4}-\d{2}$/),
    municipioIbge: z.string().regex(/^\d{7}$/), // município do ISS (municipioDeIncidencia, LC 116 art. 3º)
    retido: z.boolean(), // tpRetISSQN === 2
    documentos: z.number().int().nonnegative(),
    documentosSemIss: z.number().int().nonnegative(), // F-TC-2 (a)
    divergentes: z.number().int().nonnegative(), // F-TC-4 (a)
    vServCents: centsStr,
    baseIssCents: centsStr,
    vIssCents: centsStr,
  })
  .strict();
export type IssLinha = z.infer<typeof IssLinhaSchema>;

/** Contrato de entrada (BRIEF C §2.2) + `divergente` (status `AUTHORIZED_DIVERGENT`, F-TC-4 a). */
export const IssDocInputSchema = z
  .object({
    dCompet: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    municipioIbge: z.string().regex(/^\d{7}$/),
    tpRetISSQN: z.union([z.literal(1), z.literal(2)]),
    vServCents: z.bigint(),
    baseIssCents: z.bigint().nullable(),
    vIssCents: z.bigint().nullable(),
    divergente: z.boolean(),
  })
  .strict();
export type IssDocInput = z.infer<typeof IssDocInputSchema>;

/** Colunas da planilha, na ordem de `IssLinha`. */
export const ISS_COLUMNS = [
  'competencia', 'municipioIbge', 'retido', 'documentos', 'documentosSemIss', 'divergentes',
  'vServCents', 'baseIssCents', 'vIssCents',
] as const;

/**
 * Item 13: agrupa por competência (`dCompet.slice(0, 7)`) × município × retido; soma `vServCents`, `baseIssCents`,
 * `vIssCents` (o que veio do retorno — item 19: nunca `aliqIssBp × base`); conta documentos. Item 15: retido e
 * próprio nunca caem na mesma linha. Item 16 (F-TC-2 a): `vIssCents` ausente soma 0 e conta em `documentosSemIss`.
 * Ordem: competência, município, próprio antes de retido.
 */
export function agregarIssPorCompetencia(docs: readonly IssDocInput[]): IssLinha[] {
  type Acc = { competencia: string; municipioIbge: string; retido: boolean; documentos: number; documentosSemIss: number; divergentes: number; vServ: bigint; base: bigint; iss: bigint };
  const grupos = new Map<string, Acc>();
  for (const raw of docs) {
    const d = IssDocInputSchema.parse(raw);
    const competencia = d.dCompet.slice(0, 7);
    const retido = d.tpRetISSQN === 2;
    const key = `${competencia}|${d.municipioIbge}|${retido ? 1 : 0}`;
    const g = grupos.get(key) ?? { competencia, municipioIbge: d.municipioIbge, retido, documentos: 0, documentosSemIss: 0, divergentes: 0, vServ: 0n, base: 0n, iss: 0n };
    g.documentos += 1;
    if (d.vIssCents === null) g.documentosSemIss += 1;
    if (d.divergente) g.divergentes += 1;
    g.vServ += d.vServCents;
    g.base += d.baseIssCents ?? 0n;
    g.iss += d.vIssCents ?? 0n;
    grupos.set(key, g);
  }
  return [...grupos.values()]
    .sort((a, b) => a.competencia.localeCompare(b.competencia) || a.municipioIbge.localeCompare(b.municipioIbge) || Number(a.retido) - Number(b.retido))
    .map((g) => IssLinhaSchema.parse({
      competencia: g.competencia, municipioIbge: g.municipioIbge, retido: g.retido, documentos: g.documentos,
      documentosSemIss: g.documentosSemIss, divergentes: g.divergentes,
      vServCents: g.vServ.toString(), baseIssCents: g.base.toString(), vIssCents: g.iss.toString(),
    }));
}

/** Municípios na DPS persistida: `infDPS.cLocEmi` (estabelecimento emissor, [107]) e `infDPS.serv.locPrest.cLocPrestacao` ([192]). */
export function locaisDoPayload(payloadJson: string): { cLocEmi: string | null; cLocPrestacao: string | null } {
  const p = JSON.parse(payloadJson) as { infDPS?: { cLocEmi?: unknown; serv?: { locPrest?: { cLocPrestacao?: unknown } } } };
  const emi = p.infDPS?.cLocEmi;
  const prest = p.infDPS?.serv?.locPrest?.cLocPrestacao;
  return { cLocEmi: typeof emi === 'string' ? emi : null, cLocPrestacao: typeof prest === 'string' ? prest : null };
}

/**
 * Município do ISS (LC 116 art. 3º caput): o do estabelecimento prestador, salvo os incisos I a XXV — a lista nacional
 * marca isso no `li` do `cTribNac`. EP ⇒ `cLocEmi`; LP ⇒ `cLocPrestacao`. ET (domicílio do tomador, que a DPS sem
 * endereço não traz), lista vazia ou código fora da lista ⇒ `cLocPrestacao`, como no F-TC-1 (a). Verificação legal
 * 17/10/2026 (pesquisas-legais/verif-2026-10-17-iss-nfse, DIVERGE 2).
 */
export function municipioDeIncidencia(
  doc: { cTribNac: string; cLocEmi: string | null; cLocPrestacao: string | null },
  lista: ListaLc116,
): string | null {
  const li = findLc116(doc.cTribNac, lista)?.li;
  return li?.length === 1 && li[0] === 'EP' ? doc.cLocEmi : doc.cLocPrestacao;
}
