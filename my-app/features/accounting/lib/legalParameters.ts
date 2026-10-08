import type { LegalParameter, ProposeLegalParameterInput } from '../../../lib/services/legalParameters.service';

/**
 * FE-INCR-LEGAL-PARAMS — helpers puros da aba "Parâmetros legais" (itens 4, 5 e 7 do BRIEF). A regra de formato por
 * tabela é do BE (`formatoLinha.ts`, 400 com mensagem); aqui só presença e sintaxe.
 */

/** As tabelas do enum do BE, na ordem do contrato gerado (filtro e proposta). */
export const LEGAL_PARAMETER_TABELAS = [
  'TAX_ASSESSMENT', 'CSLL_ALIQUOTA', 'CODIGO_RECEITA', 'PIS_COFINS', 'PIS_COFINS_MONOFASICO_NCM', 'CST_PIS_COFINS',
  'CFOP_IMOBILIZADO', 'NFE_CSTAT_AUTORIZADA', 'OBRIGACAO_REGIME', 'LC116_SERVICO', 'ISS_LIMITE', 'DEPRECIACAO_ANEXO_III',
  'LEIAUTE_SPED', 'FERIADO_NACIONAL', 'SIMPLES_ANEXO_FAIXA', 'SIMPLES_ANEXO_REPARTICAO', 'SIMPLES_TETO_ISS',
  'SIMPLES_ENQUADRAMENTO', 'SIMPLES_LIMITE', 'SIMEI_VALOR', 'SALARIO_MINIMO',
] as const satisfies readonly ProposeLegalParameterInput['tabela'][];

export type Situacao = 'RASCUNHO' | 'EM_VIGOR' | 'SUBSTITUIDA' | 'REVOGADA';

/** Item 4 — L-7: PUBLISHED apontada por outra PUBLISHED em `supersedesId` saiu do lookup. */
export function situacaoDe(linha: LegalParameter, todas: readonly LegalParameter[]): Situacao {
  if (linha.status === 'DRAFT') return 'RASCUNHO';
  if (linha.status === 'REVOKED') return 'REVOGADA';
  return todas.some((o) => o.status === 'PUBLISHED' && o.supersedesId === linha.id) ? 'SUBSTITUIDA' : 'EM_VIGOR';
}

const mesmaLinhaLogica = (a: LegalParameter, b: LegalParameter) =>
  a.tabela === b.tabela && a.chave === b.chave && a.discriminador === b.discriminador;

/** Item 5 (F-FE-LP-3 a) — a cadeia de versões: mesma tabela/chave/discriminador, por vigência e criação. */
export function cadeiaDe(linha: LegalParameter, todas: readonly LegalParameter[]): LegalParameter[] {
  return todas
    .filter((o) => mesmaLinhaLogica(o, linha))
    .sort((a, b) => (a.vigenteDesde === b.vigenteDesde ? a.createdAt.localeCompare(b.createdAt) : a.vigenteDesde.localeCompare(b.vigenteDesde)));
}

/** O valor como texto curto para a lista (JSON resumido a `max` caracteres). */
export function valorResumo(l: Pick<LegalParameter, 'valorInt' | 'valorTexto' | 'valorJson'>, max = 60): string {
  if (l.valorInt !== null) return String(l.valorInt);
  if (l.valorTexto !== null) return l.valorTexto;
  if (l.valorJson === null || l.valorJson === undefined) return '—';
  const s = JSON.stringify(l.valorJson);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export type TipoValor = 'int' | 'texto' | 'json';

export interface PropostaForm {
  tabela: ProposeLegalParameterInput['tabela'];
  chave: string;
  discriminador: string;
  tipoValor: TipoValor;
  valor: string;
  fonte: string;
  fonteUrl: string;
  fonteSha256: string;
  vigenteDesde: string;
  vigenteAte: string;
  supersedesId: string;
  motivo: string;
}

export const propostaVazia = (): PropostaForm => ({
  tabela: 'TAX_ASSESSMENT', chave: '', discriminador: '', tipoValor: 'int', valor: '', fonte: '', fonteUrl: '', fonteSha256: '',
  vigenteDesde: '', vigenteAte: '', supersedesId: '', motivo: '',
});

/** "Nova versão" (item 6): mesma linha lógica, mesmo tipo de valor, `supersedesId` = a linha de origem. */
export function propostaDeNovaVersao(l: LegalParameter): PropostaForm {
  const tipoValor: TipoValor = l.valorInt !== null ? 'int' : l.valorTexto !== null ? 'texto' : 'json';
  const valor = tipoValor === 'int' ? String(l.valorInt) : tipoValor === 'texto' ? (l.valorTexto ?? '') : JSON.stringify(l.valorJson, null, 2);
  return {
    ...propostaVazia(),
    // ponytail: a linha veio do BE, cuja `tabela` é sempre do enum (o DTO recusa outra).
    tabela: l.tabela as ProposeLegalParameterInput['tabela'],
    chave: l.chave,
    discriminador: l.discriminador ?? '',
    tipoValor,
    valor,
    fonte: l.fonte,
    fonteUrl: l.fonteUrl ?? '',
    fonteSha256: l.fonteSha256 ?? '',
    supersedesId: l.id,
  };
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Item 7 — presença e sintaxe; devolve o sufixo de `legalParams.error.*` ou `null`. */
export function validarProposta(f: PropostaForm): string | null {
  if (!f.chave.trim()) return 'chaveRequired';
  if (!f.valor.trim()) return 'valorRequired';
  // Review: acima de 2^53 o Number() arredondaria em silêncio e o BE aceitaria o número errado.
  if (f.tipoValor === 'int' && (!/^-?\d+$/.test(f.valor.trim()) || !Number.isSafeInteger(Number(f.valor.trim())))) return 'valorIntInvalid';
  if (f.tipoValor === 'texto' && f.valor.trim().length > 64) return 'valorTextoLongo'; // limite do DTO do BE
  if (f.tipoValor === 'json') {
    try {
      // Review: `null` passaria no "exatamente um valor" do BE e gravaria uma linha sem valor.
      if (JSON.parse(f.valor) === null) return 'valorJsonInvalid';
    } catch {
      return 'valorJsonInvalid';
    }
  }
  if (!f.fonte.trim()) return 'fonteRequired';
  if (!DATA.test(f.vigenteDesde)) return 'vigenteDesdeInvalid';
  if (f.vigenteAte && !DATA.test(f.vigenteAte)) return 'vigenteAteInvalid';
  if (f.vigenteAte && f.vigenteAte < f.vigenteDesde) return 'vigenciaInvertida';
  if (!f.motivo.trim()) return 'motivoRequired';
  return null;
}

/** Item 7 — o corpo da proposta: exatamente um valor (o BE recusa dois), opcionais vazios fora. */
export function paraProposta(f: PropostaForm): ProposeLegalParameterInput {
  const opcional = (s: string) => (s.trim() ? s.trim() : undefined);
  return {
    tabela: f.tabela,
    chave: f.chave.trim(),
    discriminador: opcional(f.discriminador),
    ...(f.tipoValor === 'int' ? { valorInt: Number(f.valor.trim()) } : f.tipoValor === 'texto' ? { valorTexto: f.valor.trim() } : { valorJson: JSON.parse(f.valor) as unknown }),
    fonte: f.fonte.trim(),
    fonteUrl: opcional(f.fonteUrl),
    fonteSha256: opcional(f.fonteSha256),
    vigenteDesde: f.vigenteDesde,
    vigenteAte: opcional(f.vigenteAte),
    supersedesId: opcional(f.supersedesId),
    motivo: f.motivo.trim(),
  };
}
