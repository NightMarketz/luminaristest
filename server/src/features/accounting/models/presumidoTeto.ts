/**
 * PRESUMIDO-TETO-78MI (BRIEF `docs/accounting/BE-INCR-PRESUMIDO-TETO-78MI-brief.md` itens 1–3, 6–7; forks F-PT-1..7
 * ratificados em 22/10/2026) — o teto da opção pelo Lucro Presumido, como função pura sobre a receita total do ano
 * anterior (Y−1).
 *
 * Lei 9.718/1998 art. 13 caput (red. Lei 12.814/2013): pode optar quem teve em Y−1 receita **igual ou inferior** a
 * R$ 78.000.000,00, ou a R$ 6.500.000,00 × meses de atividade de Y−1 quando < 12; art. 14 I: acima disso, obrigada ao
 * Lucro Real. Dossiê `pesquisas-legais/presumido-teto-78mi` [D01] (acervo, compilado, sem alerta).
 *
 * Os valores vêm da tabela `TAX_ASSESSMENT` em reais (F-PT-7 a) e viram centavos aqui, em `bigint`: a soma de Y−1 passa
 * de 2³¹ centavos sem estourar (invariante 9).
 */
import { SemLinhaVigenteError } from '../../legalParameters/models/legalParameter';
import { linhaVigente, type TabelaApuracao } from './taxAssessmentParams';

export type SituacaoTeto = 'DENTRO' | 'EXCEDIDO' | 'NAO_CONFERIDO' | 'NAO_SE_APLICA';

export interface TetoPresumidoInput {
  ano: number; // Y (ano da opção)
  receitaRazaoCents: bigint | null; // item 4
  receitaDeclaradaCents: bigint | null; // item 5
  razaoValido: boolean; // false no caixa em Y−1 (item 7)
  mesesAtividadeAnterior: number | null; // item 3 (null ⇒ 12 + aviso)
  inicioAtividadeNoAno: boolean; // início em Y ⇒ NAO_SE_APLICA
  tabela: TabelaApuracao; // PRESUMIDO_TETO_ANO_REAIS / _MES_REAIS na data Y-01-01 (× 100n)
}

export interface TetoPresumidoResultado {
  situacao: SituacaoTeto;
  receitaUsadaCents: bigint | null;
  limiteCents: bigint | null;
  mesesConsiderados: number | null;
  fonte: 'RAZAO' | 'DECLARADA' | null;
  avisos: string[]; // textos com artigo citado
}

const LEI = 'Lei 9.718/1998 art. 13 caput e art. 14 I';

export const brl = (cents: bigint): string => {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const reais = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}R$ ${reais},${(abs % 100n).toString().padStart(2, '0')}`;
};

/** Item 1: o valor da linha vigente em `Y-01-01`, em centavos. Sem linha ⇒ `SemLinhaVigenteError` (F-PR4-7). */
export function tetoCents(tabela: TabelaApuracao, chave: 'PRESUMIDO_TETO_ANO_REAIS' | 'PRESUMIDO_TETO_MES_REAIS', ano: number): bigint {
  const data = `${ano}-01-01`;
  const linha = linhaVigente(tabela, chave, data);
  if (!linha) throw new SemLinhaVigenteError('TAX_ASSESSMENT', data, chave);
  return BigInt(linha.valor) * 100n;
}

/**
 * Item 3 (F-PT-4 a): meses de atividade de Y−1 pela data de início. Início em Y−1 ⇒ `13 − mês` (o mês de início conta
 * inteiro, como `SimplesApuracaoService`); início antes de Y−1 ⇒ 12; sem data ⇒ `null` (12 com aviso na função pura).
 * Início em Y ou depois não tem Y−1 — quem chama já marcou `inicioAtividadeNoAno`.
 */
export function mesesAtividadeAnterior(ano: number, inicioAtividadeEm: string | null): number | null {
  if (!inicioAtividadeEm) return null;
  const anoInicio = Number(inicioAtividadeEm.slice(0, 4));
  if (anoInicio < ano - 1) return 12;
  if (anoInicio === ano - 1) return 13 - Number(inicioAtividadeEm.slice(5, 7));
  return null;
}

/** Itens 2, 6 e 7 — a avaliação. `receita > limite` ⇒ `EXCEDIDO` (o caput admite **igual**). */
export function tetoPresumido(i: TetoPresumidoInput): TetoPresumidoResultado {
  const vazio = { receitaUsadaCents: null, limiteCents: null, mesesConsiderados: null, fonte: null } as const;
  if (i.inicioAtividadeNoAno) return { situacao: 'NAO_SE_APLICA', ...vazio, avisos: [] };

  const avisos: string[] = [];
  const anterior = i.ano - 1;
  // Item 7 (art. 13 § 2º): Y−1 no Presumido pelo caixa ⇒ o razão (competência) não é a medida da lei.
  const razao = i.razaoValido ? i.receitaRazaoCents : null;
  const declarada = i.receitaDeclaradaCents;
  if (razao === null && declarada === null) {
    const motivo = i.razaoValido
      ? `sem receita de ${anterior} no razão e sem a receita total de ${anterior} declarada no perfil`
      : `${anterior} foi apurado pelo regime de caixa no Presumido (Lei 9.718/1998 art. 13 § 2º) — o razão não serve de medida e a receita total de ${anterior} não foi declarada no perfil`;
    avisos.push(`teto do Lucro Presumido não conferido: ${motivo} (${LEI}).`);
    return { situacao: 'NAO_CONFERIDO', ...vazio, avisos };
  }

  // Item 6 (F-PT-2 c): o maior dos dois; divergência ⇒ aviso.
  let receita: bigint;
  let fonte: 'RAZAO' | 'DECLARADA';
  if (razao !== null && declarada !== null) {
    if (razao !== declarada) avisos.push(`receita de ${anterior} no razão (${brl(razao)}) difere da declarada (${brl(declarada)}) — usada a maior.`);
    [receita, fonte] = razao >= declarada ? [razao, 'RAZAO'] : [declarada, 'DECLARADA'];
  } else if (razao !== null) {
    [receita, fonte] = [razao, 'RAZAO'];
  } else {
    [receita, fonte] = [declarada as bigint, 'DECLARADA'];
  }

  // Item 3: < 12 meses ⇒ teto mensal × meses; senão (ou sem data) o anual.
  const meses = i.mesesAtividadeAnterior ?? 12;
  if (i.mesesAtividadeAnterior === null) avisos.push(`meses de atividade de ${anterior} não informados — usado o teto anual.`);
  const limite = meses < 12 ? tetoCents(i.tabela, 'PRESUMIDO_TETO_MES_REAIS', i.ano) * BigInt(meses) : tetoCents(i.tabela, 'PRESUMIDO_TETO_ANO_REAIS', i.ano);

  if (receita > limite) {
    avisos.push(
      `receita total de ${anterior} (${brl(receita)}) acima do teto do Lucro Presumido (${brl(limite)}${meses < 12 ? `, ${meses} meses de atividade` : ''}) — a empresa está obrigada ao Lucro Real em ${i.ano} (${LEI}).`,
    );
    return { situacao: 'EXCEDIDO', receitaUsadaCents: receita, limiteCents: limite, mesesConsiderados: meses, fonte, avisos };
  }
  return { situacao: 'DENTRO', receitaUsadaCents: receita, limiteCents: limite, mesesConsiderados: meses, fonte, avisos };
}
