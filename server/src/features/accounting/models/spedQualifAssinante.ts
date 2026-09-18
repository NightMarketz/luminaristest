/**
 * Tabelas de Qualificação do Assinante — J930 (ECD) e 0930 (ECF). Transcritas campo a campo dos
 * manuais oficiais (BE-INCR-SPED-IDENTITY-MASKS, nó C12); fecha PVA-5
 * (`ADR-INCR-SPED-ECD-file-generation.md` l.179). Duas consts, nunca uma compartilhada
 * (F-C12-2 → a): as tabelas têm dono e data de atualização diferentes (Cofis 01/2026 × 02/2026) e a
 * transcrição (§3) confirma que NÃO são idênticas.
 *
 * Fonte (grau verificado — leitura direta dos PDFs do corpus local):
 * `Manual-ECD-Leiaute-9.pdf` (sha256 12 `bc63f0a893ce`) pp. 201-202 ·
 * `Manual-ECF-Leiaute-12.pdf` (sha256 12 `7216ec2bd62d`) p. 105 — ambos conferidos em
 * `docs/accounting/BE-INCR-SPED-IDENTITY-MASKS-transcription-J930-0930.md` §1.2/§2.2.
 *
 * Inconsistência do manual (registrada, não corrigida): o exemplo 9 (p. 200) cita o código `305`
 * para "Interventor"; a tabela (p. 202) lista Interventor = `315` e não tem `305`. A TABELA
 * prevalece — `305` não é uma chave válida.
 */

/** J930 campo 05 (COD_ASSIN) — Manual ECD L9 pp. 201-202, 19 códigos. */
export const SPED_ECD_QUALIF_ASSINANTE = {
  '001': 'Pessoa Jurídica (e-CNPJ ou e-PJ)',
  '203': 'Diretor',
  '204': 'Conselheiro de Administração',
  '205': 'Administrador',
  '206': 'Administrador do Grupo',
  '207': 'Administrador de Sociedade Filiada',
  '220': 'Administrador Judicial – Pessoa Física',
  '222': 'Administrador Judicial – Pessoa Jurídica - Profissional Responsável',
  '223': 'Administrador Judicial/Gestor',
  '226': 'Gestor Judicial',
  '309': 'Procurador',
  '312': 'Inventariante',
  '313': 'Liquidante',
  '315': 'Interventor',
  '401': 'Titular – Pessoa Física - EIRELI',
  '801': 'Empresário',
  '900': 'Contador/Contabilista',
  '940': 'Auditor Independente',
  '999': 'Outros',
} as const;

export type SpedEcdQualifAssinanteCode = keyof typeof SPED_ECD_QUALIF_ASSINANTE;

/** Chaves da tabela ECD, na forma de tupla não-vazia que `z.enum` exige. */
export const SPED_ECD_QUALIF_ASSINANTE_CODES = Object.keys(SPED_ECD_QUALIF_ASSINANTE) as [
  SpedEcdQualifAssinanteCode,
  ...SpedEcdQualifAssinanteCode[],
];

/**
 * F-C12-5 → (i): exceção de EMISSÃO do campo 04 (IDENT_QUALIF) para `900`. A tabela transcrita
 * imprime "Contador/Contabilista" (fiel ao manual); `REGRA_TABELA_ASSINANTE_DESC` (p. 202) exige que
 * a descrição corresponda a "Contador" OU "Contabilista", e o exemplo oficial (p. 203) escreve
 * `CONTADOR`. A const permanece transcrição literal; só esta linha diverge na emissão — os outros 18
 * códigos emitem a descrição da tabela sem alteração. O PVA (H1 2ª passada) é o oráculo desta escolha.
 */
export function ecdIdentQualifParaEmissao(codAssin: SpedEcdQualifAssinanteCode): string {
  return codAssin === '900' ? 'Contador' : SPED_ECD_QUALIF_ASSINANTE[codAssin];
}

/**
 * 0930 campo 4 (IDENT_QUALIF) — Manual ECF L12 p. 105, 17 códigos únicos. `900` ocorre em duas
 * linhas do manual ("Contador", "Contabilista"); mesmo código, uma chave só — no 0930 o campo é o
 * CÓDIGO, a descrição nunca vai ao arquivo, então aqui é só documental.
 */
export const SPED_ECF_QUALIF_ASSINANTE = {
  '203': 'Diretor',
  '204': 'Conselheiro de Administração',
  '205': 'Administrador',
  '206': 'Administrador do Grupo',
  '207': 'Administrador de Sociedade Filiada',
  '220': 'Administrador Judicial – Pessoa Física',
  '222': 'Administrador Judicial – Pessoa Jurídica - Profissional Responsável',
  '223': 'Administrador Judicial/Gestor',
  '226': 'Gestor Judicial',
  '309': 'Procurador',
  '312': 'Inventariante',
  '313': 'Liquidante',
  '315': 'Interventor',
  '401': 'Titular Pessoa Física – Sociedade Limitada Unipessoal (SLU)',
  '801': 'Empresário',
  '900': 'Contador/Contabilista',
  '999': 'Outros',
} as const;

export type SpedEcfQualifAssinanteCode = keyof typeof SPED_ECF_QUALIF_ASSINANTE;

/** Chaves da tabela ECF, na forma de tupla não-vazia que `z.enum` exige. */
export const SPED_ECF_QUALIF_ASSINANTE_CODES = Object.keys(SPED_ECF_QUALIF_ASSINANTE) as [
  SpedEcfQualifAssinanteCode,
  ...SpedEcfQualifAssinanteCode[],
];
