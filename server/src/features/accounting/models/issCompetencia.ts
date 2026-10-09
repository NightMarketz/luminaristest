import { z } from 'zod';

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
    municipioIbge: z.string().regex(/^\d{7}$/), // F-TC-1 (a): cLocPrestacao do payload enviado
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

/** Município da prestação na DPS persistida (F-TC-1 a): `infDPS.serv.locPrest.cLocPrestacao` (DpsPayloadDto [192]). */
export function municipioDoPayload(payloadJson: string): string | null {
  const p = JSON.parse(payloadJson) as { infDPS?: { serv?: { locPrest?: { cLocPrestacao?: unknown } } } };
  const v = p.infDPS?.serv?.locPrest?.cLocPrestacao;
  return typeof v === 'string' ? v : null;
}
