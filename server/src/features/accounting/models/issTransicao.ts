import { ValidationError } from '../../../lib/errors';
import { linhaLegalVigente, SemLinhaVigenteError, type LinhaLegal } from '../../legalParameters/models/legalParameter';

/**
 * ISS-TRANSICAO-IBS PR-1 (BRIEF `docs/accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md` item 3) — fator de redução do ISS
 * na transição para o IBS (tabela `ISS_TRANSICAO`, chave `FATOR_REDUCAO_BP`). Puro, no molde de `issLimite.ts`.
 * Fontes (Planalto compilado em 24/10, dossiê `pesquisas-legais/iss-transicao-ibs-pr1` [D03]): LC 116 art. 8º-B I–IV,
 * incluído pela LC 214 art. 508 (10/20/30/40% de 2029 a 2032 sobre a alíquota municipal de 31/12/2028); LC 116 revogada a
 * partir de 01/01/2033 (LC 214 art. 543 IV; art. 544 V). Quem aplica o fator é o PR-2 (F-ISS-1), não este arquivo.
 */
export const INICIO_TRANSICAO_ISS = '2029-01-01';
export const FIM_ISS = '2033-01-01';

/** Item 4 (F-ISS-5 a) — a mensagem do 400 do perfil fiscal e do erro abaixo. */
export const ISS_EXTINTO_MENSAGEM = 'ISS extinto a partir de 01/01/2033 (LC 214 art. 543 IV): deixe a alíquota de ISS em branco';

/** 400 nomeado — fato gerador de 2033 em diante não tem ISS (só IBS). */
export class IssExtintoError extends ValidationError {
  constructor(data: string) {
    super(`${ISS_EXTINTO_MENSAGEM} (data ${data}).`, null, 'ISS_EXTINTO');
    Object.setPrototypeOf(this, IssExtintoError.prototype); // ValidationError fixa o próprio protótipo
    this.name = 'IssExtintoError';
  }
}

export function issExtinto(data: string): boolean {
  return data >= FIM_ISS;
}

/** 0 antes de 2029; a linha vigente de 2029 a 2032; sem linha publicada nesse intervalo ⇒ `SemLinhaVigenteError`, nunca 0. */
export function fatorReducaoIssBp(linhas: readonly LinhaLegal[], data: string): number {
  if (issExtinto(data)) throw new IssExtintoError(data);
  if (data < INICIO_TRANSICAO_ISS) return 0;
  const l = linhaLegalVigente(linhas, 'ISS_TRANSICAO', 'FATOR_REDUCAO_BP', data);
  if (l?.valorInt == null) throw new SemLinhaVigenteError('ISS_TRANSICAO', data, 'FATOR_REDUCAO_BP');
  return l.valorInt;
}
