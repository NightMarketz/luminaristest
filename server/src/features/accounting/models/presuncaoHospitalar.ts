import { atividadeDoServico, type RequisitoHospitalar } from './taxAssessmentParams';

/**
 * EFICIENCIA-FISCAL PR-5 (BRIEF itens 26 e 27; D-2026-10-28-EFICIENCIA-FISCAL-PR5-EXECUCAO, lacuna 1) — repartição PURA da
 * receita de serviço por atividade de presunção, a partir da subrazão por serviço (`ReceitaFiscalLinha.serviceRef`).
 * "No caso de atividades diversificadas será aplicado o percentual correspondente a cada atividade" (Lei 9.249/1995 art. 15
 * § 2º). Cada linha é avaliada na data do fato (`dia`, I-14). Linha sem `serviceRef` (anterior ao PR-5) fica a 32 %.
 * O teto na 3.1 do razão é do cálculo (`hospitalarComTeto`), que tem a receita do razão.
 */

export interface LinhaServicoReceita {
  dia: string; // YYYY-MM-DD
  serviceRef: string | null;
  receitaCents: bigint; // com sinal (cancelamento/devolução negativos)
  cotaProfissionalCents: bigint; // fora da receita bruta (Lei 12.592 art. 1º-A § 5º)
}

export interface PerfilServicoPresuncao {
  serviceRef: string;
  finalidade: string | null;
  elegivelHospitalar: boolean;
}

export interface ChecklistHospitalarEmpresa {
  sociedadeEmpresaria: boolean;
  alvaraSanitarioValidoAte: string | null;
}

export interface ServicoRepartido {
  serviceRef: string;
  hospitalarCents: bigint;
  servicoCents: bigint;
  faltando: RequisitoHospitalar[]; // só de serviço marcado como elegível; vazio = nada faltou
}

export const HOSPITALAR_REQUISITO_AUSENTE = 'HOSPITALAR_REQUISITO_AUSENTE';

export function repartirReceitaHospitalar(
  linhas: readonly LinhaServicoReceita[],
  perfis: readonly PerfilServicoPresuncao[],
  empresa: ChecklistHospitalarEmpresa,
): { hospitalarCents: bigint; porServico: ServicoRepartido[]; avisos: string[] } {
  const perfilDe = new Map(perfis.map((p) => [p.serviceRef, p]));
  const acc = new Map<string, ServicoRepartido>();
  for (const l of linhas) {
    if (l.serviceRef === null) continue;
    const r = acc.get(l.serviceRef) ?? { serviceRef: l.serviceRef, hospitalarCents: 0n, servicoCents: 0n, faltando: [] };
    const liquida = l.receitaCents - l.cotaProfissionalCents;
    const a = atividadeDoServico(perfilDe.get(l.serviceRef) ?? null, empresa, l.dia);
    if (a.atividade === 'HOSPITALAR') r.hospitalarCents += liquida;
    else r.servicoCents += liquida;
    for (const f of a.faltando) if (!r.faltando.includes(f)) r.faltando.push(f);
    acc.set(l.serviceRef, r);
  }
  const porServico = [...acc.values()].sort((x, y) => x.serviceRef.localeCompare(y.serviceRef));
  let hospitalarCents = 0n;
  const avisos: string[] = [];
  for (const s of porServico) {
    if (s.hospitalarCents > 0n) hospitalarCents += s.hospitalarCents;
    if (s.faltando.length > 0 && s.servicoCents > 0n) {
      avisos.push(
        `${HOSPITALAR_REQUISITO_AUSENTE}: serviço ${s.serviceRef} marcado como hospitalar foi a 32 % em parte do período — faltou ${s.faltando.join(', ')} (Lei 9.249/1995 art. 15 § 1º III "a").`,
      );
    }
  }
  return { hospitalarCents, porServico, avisos };
}
