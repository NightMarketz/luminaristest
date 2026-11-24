import { ValidationError } from '../../../lib/errors';
import { diaSeguinteAoFimDeVigencia, inicioDeVigencia, linhaLegalVigente, SemLinhaVigenteError, type LinhaLegal } from '../../legalParameters/models/legalParameter';

/**
 * ISS-TRANSICAO-IBS PR-1 (BRIEF `docs/accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md` item 3) — fator de redução do ISS
 * na transição para o IBS (tabela `ISS_TRANSICAO`, chave `FATOR_REDUCAO_BP`). Puro, no molde de `issLimite.ts`.
 * Fontes (Planalto compilado em 24/10, dossiê `pesquisas-legais/iss-transicao-ibs-pr1` [D03]): LC 116 art. 8º-B I–IV,
 * incluído pela LC 214 art. 508 (10/20/30/40% de 2029 a 2032 sobre a alíquota municipal de 31/12/2028); LC 116 revogada a
 * partir de 01/01/2033 (LC 214 art. 543 IV; art. 544 V). Quem aplica o fator é o PR-2 (F-ISS-1), não este arquivo.
 */
export function inicioTransicaoIss(linhas: readonly LinhaLegal[], dataConsultada: string): string {
  return inicioDeVigencia(linhas, 'ISS_TRANSICAO', 'FATOR_REDUCAO_BP', dataConsultada);
}

/**
 * Onda 3.2 (#3 e #4; dono, chat, 24/11/2026) — as datas de corte do ISS NÃO são literais: o início da transição é o menor
 * `vigenteDesde` de `ISS_TRANSICAO` (LC 116 art. 8º-B, linhas 2029–2032) e o fim do ISS é o dia seguinte ao maior
 * `vigenteAte` de `ISS_LIMITE/ALIQUOTA_MAX_BP` (LC 214 art. 543 IV: 2032-12-31 ⇒ 2033-01-01). Virar o ano é publicar linha.
 * Sem linha ⇒ `ParametroLegalAusenteError` (fail-closed); linha sem `vigenteAte` ⇒ `null` (sem fim publicado).
 */
export function fimIss(linhas: readonly LinhaLegal[], dataConsultada: string): string | null {
  return diaSeguinteAoFimDeVigencia(linhas, 'ISS_LIMITE', 'ALIQUOTA_MAX_BP', dataConsultada);
}

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

/** `linhas` = fotografia que contém `ISS_LIMITE` (o fim vem da linha, não de literal). */
export function issExtinto(linhas: readonly LinhaLegal[], data: string): boolean {
  const fim = fimIss(linhas, data);
  return fim !== null && data >= fim;
}

/**
 * PUT do perfil fiscal com alíquota de ISS (ISS-TRANSICAO-IBS PR-1 item 4; F-ISS-5 a): o fim do ISS vem da `ISS_LIMITE`, e o
 * DTO estático não decide sobre ele (Onda 3.2 #4) — a checagem é do serviço, com a mesma mensagem nomeada.
 */
export function exigirIssNaoExtinto(linhas: readonly LinhaLegal[], hoje: string): void {
  if (issExtinto(linhas, hoje)) throw new IssExtintoError(hoje);
}

/**
 * 0 antes do início da transição; a linha vigente na transição; sem linha publicada nesse intervalo ⇒ `SemLinhaVigenteError`,
 * nunca 0. `linhas` carrega `ISS_TRANSICAO` e `ISS_LIMITE` (início e fim vêm das linhas).
 */
export function fatorReducaoIssBp(linhas: readonly LinhaLegal[], data: string): number {
  if (issExtinto(linhas, data)) throw new IssExtintoError(data);
  if (data < inicioTransicaoIss(linhas, data)) return 0;
  const l = linhaLegalVigente(linhas, 'ISS_TRANSICAO', 'FATOR_REDUCAO_BP', data);
  if (l?.valorInt == null) throw new SemLinhaVigenteError('ISS_TRANSICAO', data, 'FATOR_REDUCAO_BP');
  return l.valorInt;
}

/**
 * ISS-TRANSICAO-IBS PR-2 item 8 (F-ISS-1 a) — alíquota do regime normal na DPS: `issAliquotaBp × (10000 − fator) / 10000`,
 * com `issAliquotaBp` = a alíquota municipal de 31/12/2028 (LC 116 art. 8º-B caput, L1). Devolve bp inteiro, com o meio
 * bp para cima (dono, chat, 06/11/2026: "Meio para cima" — achado A1 do revisor do #1111), em aritmética inteira; o
 * `pAliq` sai com 2 casas exatas pelo `bpToPctString`. Não vale no Simples (o % efetivo do Anexo já cai pela tabela —
 * aplicar aqui reduziria duas vezes).
 */
export function issAliquotaNaTransicaoBp(issAliquotaBp: number, fatorBp: number): number {
  return Math.floor((issAliquotaBp * (10000 - fatorBp) + 5000) / 10000);
}
