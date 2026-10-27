/**
 * BE-INCR-NFCE (nó X10a, itens 8 e 11) — regras puras da emissão de NF-e 55 / NFC-e 65 que dependem só dos perfis.
 * Fonte: `docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26.md` (MOC 7.0 Anexo I).
 */

/** C21 — 1 = Simples Nacional; 3 = Regime Normal. O CRT 2 (excesso de sublimite) é pendência do contador (BRIEF §6). */
export type Crt = 1 | 3;

/** Item 8 (F-NFCE-2 b): o CRT é DERIVADO do regime do perfil da unidade — nunca digitado. */
export function crtDoRegime(regimeTributario: string): Crt {
  if (regimeTributario === 'SIMPLES') return 1;
  if (regimeTributario === 'PRESUMIDO' || regimeTributario === 'REAL') return 3;
  throw new Error(`crt_regime_desconhecido: ${regimeTributario}`);
}

/** I08-150 (rej. 725), sem o 5.933 (serviço conjugado com ISSQN — a montagem só leva produto, item 13). */
export const NFCE_CFOP = ['5101', '5102', '5103', '5104', '5115', '5405', '5656', '5667'] as const;

export interface PerfilProdutoParaEmissao {
  productRef: string;
  cfopPadrao: string;
  csosn: string | null;
  cstIcms: string | null;
}

/**
 * Item 11 — pré-condição por item da venda: todo produto tem perfil fiscal; na NFC-e o CFOP está na lista I08-150;
 * CRT 1 exige CSOSN (N12a) e CRT 3 exige CST do ICMS (N12) — cada um só no seu regime. Devolve os faltantes no formato
 * do 400 agregado da emissão (`produto <ref>: …`); vazio = nada falta.
 */
export function faltantesDosItens(
  kind: 'NFE' | 'NFCE',
  crt: Crt,
  productRefs: readonly string[],
  perfis: readonly PerfilProdutoParaEmissao[],
): string[] {
  const porRef = new Map(perfis.map((p) => [p.productRef, p]));
  const faltantes: string[] = [];
  for (const ref of [...new Set(productRefs)]) {
    const perfil = porRef.get(ref);
    if (!perfil) {
      faltantes.push(`produto ${ref}: perfil fiscal`);
      continue;
    }
    if (kind === 'NFCE' && !(NFCE_CFOP as readonly string[]).includes(perfil.cfopPadrao)) {
      faltantes.push(`produto ${ref}: CFOP ${perfil.cfopPadrao} não aceito na NFC-e (I08-150, rej. 725)`);
    }
    if (crt === 1 && !perfil.csosn) faltantes.push(`produto ${ref}: csosn (CRT 1, N12a)`);
    if (crt === 3 && !perfil.cstIcms) faltantes.push(`produto ${ref}: cstIcms (CRT 3, N12)`);
  }
  return faltantes;
}
