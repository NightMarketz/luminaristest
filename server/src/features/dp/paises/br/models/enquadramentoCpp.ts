import { linhaLegalVigente, type LinhaLegal } from '../../../../legalParameters/models/legalParameter';
import { formatCnpj } from '../../../../../lib/cnpj';

/**
 * BE-INCR-DP-PONTE-RAZAO PR-P1 item 9 — o enquadramento da CPP de um estabelecimento na data, lido das linhas por CNPJ
 * que o admin publica (item 7; F-PNT-3 b): grau do RAT e FAP pelo CNPJ do estabelecimento, FPAS pela raiz (IN RFB 2.110
 * art. 91). Leitor puro sobre a fotografia de `LegalParameter`.
 *
 * Linha que falta ⇒ pendência **bloqueante** `ENQUADRAMENTO_CPP_AUSENTE`, com o CNPJ formatado e a tabela. Quem decide se
 * a pendência vale é o chamador: só quando o regime da competência exige CPP fora do DAS (item 10, `regimeCpp` ≠ `NO_DAS`).
 * No Simples sem Anexo IV o chamador nem pergunta.
 */

/** As tabelas que o leitor consome — o que o chamador pede à `fotografia`. */
export const TABELAS_ENQUADRAMENTO_CPP = ['RAT_GRAU_ESTABELECIMENTO', 'FAP_ESTABELECIMENTO', 'FPAS_EMPRESA'] as const;
export type TabelaEnquadramentoCpp = (typeof TABELAS_ENQUADRAMENTO_CPP)[number];

export interface PendenciaEnquadramentoCpp {
  codigo: 'ENQUADRAMENTO_CPP_AUSENTE';
  bloqueante: true;
  tabela: TabelaEnquadramentoCpp;
  /** CNPJ do estabelecimento (sem máscara), como veio. */
  cnpj: string;
  /** Rótulo visível, ex.: "FAP_ESTABELECIMENTO de 12.ABC.345/01DE-35 em 2026-03". */
  dado: string;
  mensagem: string;
}

export interface EnquadramentoCpp {
  ratGrau: 1 | 2 | 3 | null;
  fapX10000: number | null;
  fpas: string | null;
  /** Vazio ⇔ os três vieram. */
  pendencias: PendenciaEnquadramentoCpp[];
}

const MENSAGEM: Record<TabelaEnquadramentoCpp, string> = {
  RAT_GRAU_ESTABELECIMENTO: 'grau de risco do RAT do estabelecimento não publicado (Dec. 3.048 art. 202 §§ 3º e 5º)',
  FAP_ESTABELECIMENTO: 'FAP do estabelecimento não publicado para o ano (Dec. 3.048 art. 202-A)',
  FPAS_EMPRESA: 'FPAS da empresa não publicado (IN RFB 2.110 art. 91)',
};

const ehGrau = (n: number | null | undefined): n is 1 | 2 | 3 => n === 1 || n === 2 || n === 3;

/** Item 9 — `{ ratGrau, fapX10000, fpas }` vigentes na `data` (YYYY-MM-DD) e a pendência de cada um que falta. */
export function enquadramentoNaCompetencia(fotografia: readonly LinhaLegal[], cnpjEstabelecimento: string, data: string): EnquadramentoCpp {
  const grau = linhaLegalVigente(fotografia, 'RAT_GRAU_ESTABELECIMENTO', cnpjEstabelecimento, data)?.valorInt;
  const fap = linhaLegalVigente(fotografia, 'FAP_ESTABELECIMENTO', cnpjEstabelecimento, data)?.valorInt;
  const fpas = linhaLegalVigente(fotografia, 'FPAS_EMPRESA', cnpjEstabelecimento.slice(0, 8), data)?.valorTexto;

  const faltam: TabelaEnquadramentoCpp[] = [];
  if (!ehGrau(grau)) faltam.push('RAT_GRAU_ESTABELECIMENTO');
  if (fap === undefined || fap === null) faltam.push('FAP_ESTABELECIMENTO');
  if (fpas === undefined || fpas === null) faltam.push('FPAS_EMPRESA');

  const doc = formatCnpj(cnpjEstabelecimento);
  const competencia = data.slice(0, 7);
  return {
    ratGrau: ehGrau(grau) ? grau : null,
    fapX10000: fap ?? null,
    fpas: fpas ?? null,
    pendencias: faltam.map((tabela) => ({
      codigo: 'ENQUADRAMENTO_CPP_AUSENTE',
      bloqueante: true,
      tabela,
      cnpj: cnpjEstabelecimento,
      dado: `${tabela} de ${doc} em ${competencia}`,
      mensagem: `${MENSAGEM[tabela]}: ${tabela} de ${doc} em ${competencia}. O contador pede e o admin da plataforma publica em /legal-parameters.`,
    })),
  };
}
