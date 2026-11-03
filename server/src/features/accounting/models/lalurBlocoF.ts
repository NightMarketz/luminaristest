/**
 * Aritmética PURA do Bloco F (C8 emenda 3.2, E16/E21b; BE-INCR-FIXED-ASSETS-EMENDA-3-2-brief.md §2 Parte 3). Sem I/O:
 * o `LalurService` lê os ativos pelo `IFixedAssetReader` e chama daqui.
 *
 * Leitura das contas (BRIEF §0.1, grau "inferido com 3 fontes oficiais concordantes" — L2 IN 1.700 art. 124 §§ 4º-5º,
 * L3 Tabelas Dinâmicas L12 `PARTEB_PARTEA`, L4 tabela de sinais do Manual): `1071` = saldo nascido de ADIÇÃO
 * (contábil > fiscal, devedor, excluído depois); `2210` = saldo nascido de EXCLUSÃO (contábil < fiscal, credor,
 * adicionado depois). Tabela do E16, por bem:
 *
 *   contábil > fiscal (constitui)          → 86 adição   / 1071
 *   contábil acabou, fiscal segue (realiza) → 161 exclusão / 1071
 *   contábil < fiscal (constitui)          → 161 exclusão / 2210
 *   fiscal atingiu o custo (§ 5º, realiza)  → 86 adição   / 2210
 *   baixa com saldo 2210                   → 91.01 adição / 2210
 *   baixa com saldo 1071                   → 161 exclusão / 1071
 *
 * "Realiza" e "constitui" saem do saldo do BEM (`priorDiffCents`): a diferença do período primeiro consome o saldo do
 * lado oposto e só o excedente constitui o outro — um bem pode cruzar o zero no período, e aí a mesma linha leva as
 * duas contas (E21b, F-EM-14 → a).
 */

export type BlocoFCodigo = '86' | '161' | '91.01';
export type BlocoFConta = '1071' | '2210';
export const BLOCO_F_CODIGOS: readonly BlocoFCodigo[] = ['86', '161', '91.01'];
export const BLOCO_F_CONTAS: readonly BlocoFConta[] = ['1071', '2210'];

export interface BlocoFMove {
  assetId: string;
  codigo: BlocoFCodigo;
  conta: BlocoFConta;
  valorCents: bigint; // > 0
}

export interface BlocoFInput {
  assetId: string;
  fiscalQuotaCents: bigint;
  bookQuotaCents: bigint;
  priorDiffCents: bigint;
  disposedInPeriod: boolean;
}

/** Movimentos de UM bem no período. Diferença 0 e sem baixa com saldo ⇒ lista vazia (E20). */
export function blocoFMoves(a: BlocoFInput): BlocoFMove[] {
  const out: BlocoFMove[] = [];
  const push = (codigo: BlocoFCodigo, conta: BlocoFConta, v: bigint) => {
    if (v > 0n) out.push({ assetId: a.assetId, codigo, conta, valorCents: v });
  };
  const d = a.fiscalQuotaCents - a.bookQuotaCents;
  const prior = a.priorDiffCents;
  if (d > 0n) {
    // fiscal > contábil ⇒ exclusão 161: primeiro realiza o 1071 do bem, o resto constitui 2210
    const realiza = prior < 0n ? (d < -prior ? d : -prior) : 0n;
    push('161', '1071', realiza);
    push('161', '2210', d - realiza);
  } else if (d < 0n) {
    // contábil > fiscal ⇒ adição 86: primeiro realiza o 2210 do bem (§ 5º), o resto constitui 1071
    const a86 = -d;
    const realiza = prior > 0n ? (a86 < prior ? a86 : prior) : 0n;
    push('86', '2210', realiza);
    push('86', '1071', a86 - realiza);
  }
  if (a.disposedInPeriod) {
    const restante = prior + d;
    if (restante > 0n) push('91.01', '2210', restante);
    else if (restante < 0n) push('161', '1071', -restante);
  }
  return out;
}
