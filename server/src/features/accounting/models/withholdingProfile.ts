import type { NaturezaServico } from './retencaoParams';

/**
 * BE-INCR-RETENCOES-FONTE PR-1 (BRIEF item 6, §5.1) — regras PURAS do perfil de retenção. O serviço lê a contraparte e a
 * fotografia da `NATUREZA_RENDIMENTO` e chama estas funções dentro da tx.
 */
export interface PerfilRetencaoDados {
  naturezaServico: NaturezaServico;
  natRend: string | null;
  irrf: boolean;
  csrf: boolean;
  inss: boolean;
  inssTpServico: string | null;
  inssCprb: boolean | null;
  issRetido: boolean;
  issCodMun: string | null;
  issAliquotaBp: number | null;
  issVencimentoDia: number | null;
  fonte: string;
  vigenteDesde: string;
  vigenteAte: string | null;
}

/** Avisos do perfil (não bloqueiam a gravação). */
export const AVISO_PERFIL_RETENCAO = {
  /** `natRend` só existe em linha DRAFT da `NATUREZA_RENDIMENTO` (item 6: "DRAFT aceito, com aviso"). */
  NATUREZA_RENDIMENTO_DRAFT: 'NATUREZA_RENDIMENTO_DRAFT',
} as const;

/**
 * Item 6 — campos obrigatórios por flag e a regra da contraparte PF. `regimeContraparte` = `Counterparty.regimeTributario`.
 * Erro em português ou `null`. A existência do `natRend` na tabela é do serviço (precisa da fotografia).
 * - `issRetido` ⇒ `issCodMun` e `issAliquotaBp` (lei municipal informada; LC 116 art. 6º);
 * - `inss` ⇒ `inssTpServico` (Tabela 06 da Reinf, R-2010; F-RET-16 a);
 * - `irrf` ou `csrf` ⇒ `natRend` (o código de receita depende dele, item 2);
 * - contraparte `PF` só aceita `irrf` (CSRF, INSS 11% e ISS retido são de PJ; F-RET-7 b / F-RET-17 a).
 */
export function erroDoPerfilRetencao(p: PerfilRetencaoDados, regimeContraparte: string | null): string | null {
  if (p.fonte.trim().length < 3) return 'fonte = enquadramento citado (ex.: "RIR/2018 art. 714 § 1º XX").';
  if (p.vigenteAte !== null && p.vigenteAte < p.vigenteDesde) return 'vigenteAte não pode ser anterior a vigenteDesde.';
  if (p.issRetido && (p.issCodMun === null || p.issAliquotaBp === null)) return 'issRetido exige issCodMun (IBGE, 7 dígitos) e issAliquotaBp.';
  if (p.inss && p.inssTpServico === null) return 'inss exige inssTpServico (9 dígitos, Tabela 06 da EFD-Reinf).';
  if ((p.irrf || p.csrf) && p.natRend === null) return 'irrf ou csrf exige natRend (5 dígitos, Tabela 01 da EFD-Reinf).';
  if (regimeContraparte === 'PF' && (p.csrf || p.inss || p.issRetido)) {
    return 'Contraparte PF só aceita irrf: CSRF, INSS 11% e ISS retido são retenções de pessoa jurídica.';
  }
  return null;
}

/** Duas vigências `[desde, ate]` (ate `null` = em aberto) que se cruzam. */
export function vigenciasDoPerfilSeSobrepoem(
  a: { vigenteDesde: string; vigenteAte: string | null },
  b: { vigenteDesde: string; vigenteAte: string | null },
): boolean {
  return (a.vigenteAte === null || b.vigenteDesde <= a.vigenteAte) && (b.vigenteAte === null || a.vigenteDesde <= b.vigenteAte);
}
