/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1) — contrato de saída do validador determinístico
 * (F-P1-6). Fonte: `docs/accounting/P1-DOSSIER-validador.md` §3.2 (linhas 170-190) — este arquivo
 * materializa o contrato de lá, verbatim.
 *
 * Bloqueante vs. aviso (§3.1 do dossiê): TODA checagem #1-#9 (`P1-DOSSIER-validador.md` §1)
 * falhando é BLOQUEANTE — arquétipo desconhecido, slot vazio/órfão, conta inexistente/não-folha/
 * inativa, natureza incompatível com o papel (nunca é aviso: corromperia BP/DRE estruturalmente),
 * versão malformada. F-BP-2(b) (ratificada) eleva este contrato a criticidade máxima do
 * incremento: o validador é o ÚNICO gate entre compilação e o caminho do dinheiro (auto-ativação
 * pós-PASS, sem checkpoint humano) — `blocking.length === 0` é literalmente a condição de
 * ativação, não só uma sinalização de UI.
 *
 * `ROLE_LOOKUP_MISSING` está listado no dossiê como código específico de F-P1-5(b) (papel
 * resolvido em runtime). Como F-P1-5(a) foi a opção RATIFICADA (papel→conta resolvido na
 * compilação, `roleSlots[].accountCode` sempre literal — ver `AccountingBindingDto.ts`), este
 * código fica DORMENTE nesta fase: nenhum produtor do validador (Corpo B) deveria emiti-lo hoje.
 * Mantido no union por fidelidade ao contrato documentado (nada aqui decide reabrir F-P1-5) — se
 * um dia F-P1-5(b) for revisitado, o código já existe sem precisar de migração de shape.
 */

/** Código de issue — fechado, mesmo estilo de enum de erro já usado no domínio contábil. */
export type BindingValidationIssueCode =
  | 'ARCHETYPE_UNKNOWN'
  | 'SLOT_UNFILLED'
  | 'SLOT_ORPHAN'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_NOT_LEAF'
  | 'ACCOUNT_INACTIVE'
  | 'NATURE_MISMATCH'
  | 'VERSION_INVALID'
  | 'ROLE_LOOKUP_MISSING' // dormente sob F-P1-5(a) ratificada — ver header
  /** Simulação dry-run (F-P1-6b1) — `interpret()` ou `PostingValidatePort.validateOnly()` rejeitou o
   *  lançamento sintético do eventBinding. Só emitido para arquétipos `postEntry` (classe-2 não tem
   *  `validateOnly` de subledger) e só quando o eventBinding não carrega NENHUM outro bloqueante
   *  estrutural — ver `BindingValidationService.validateEventBinding`. */
  | 'DRY_RUN_FAILED';

export interface BindingValidationIssue {
  code: BindingValidationIssueCode;
  slot?: string;
  accountCode?: string;
  /** PT-BR, mesmo estilo de mensagem já usado em `ValidationError`/`NotFoundError` do domínio
   *  (ex. `PostingService.ts:150-157`, `ReferentialMappingService.ts:186-189`) — o validador não
   *  inventa vocabulário de erro novo, estende o existente. */
  message: string;
}

/**
 * Linha simulada de um lançamento sintético — presente só quando a simulação dry-run (F-P1-6b1,
 * modo validate-only do `postEntry`) roda de fato. Consumível pelo compilador (Corpo C, item 9 do
 * BRIEF) e pelo futuro fluxo PROPOSED da entrevista (fora de escopo desta fase — ver Insumos
 * ausentes do BRIEF).
 */
export interface SimulatedEntryLine {
  accountCode: string;
  debitCents: number;
  creditCents: number;
}

export interface BindingValidationResult {
  /** true ⇔ blocking.length === 0. Sob F-BP-2(b), este campo é literalmente o gate de ativação. */
  ok: boolean;
  blocking: BindingValidationIssue[];
  warnings: BindingValidationIssue[];
  /** Presente só se a simulação (F-P1-6b1) rodou e produziu um lançamento sintético. */
  simulatedEntry?: { lines: SimulatedEntryLine[] };
}
