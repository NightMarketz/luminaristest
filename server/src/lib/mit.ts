import { createHash } from 'crypto';
import type { TaxAssessment } from 'generated/prisma';
import type { TabelaApuracao } from '../features/accounting/models/taxAssessmentParams';
import { MitNadaAExportarError } from './errors';

/**
 * BE-INCR-MIT-EXPORT (nó X9, BRIEF itens 1–9; ADR-INCR-DCTFWEB-MIT D2–D8, §13) — arquivo JSON de importação do MIT
 * (leiaute 1.0, retificado em 20/02/2025) a partir das apurações de IRPJ/CSLL confirmadas. Função pura (molde
 * `ecf.ts`/`ecfReal.ts`): sem model, sem I/O, sem Prisma — o serviço do PR-2 lê o perfil, o contador e as apurações
 * e chama `montarArquivoMit`.
 *
 * Escopo do PR-1 (F-MIT-1 a): só o trimestral (`T01..T04`, Presumido e Real trimestral). `A00..A12` (Fase B do X7)
 * entram no PR-4 e `M01..M12` (PIS/Cofins, X8) no PR-3; até lá, `apuracoesDoPa` não os seleciona.
 *
 * O formato só tem oráculo externo (P-6 do ADR): os testes provam o leiaute LIDO, não o leiaute ACEITO pelo MIT.
 */

/** Subconjunto do leiaute 1.0 que o X9 emite (D7, D8, D9: sem SemMovimento=true, sem eventos, sem IRRF). */
export type MitDebito = { IdDebito: number; CodigoDebito: string; AnoDebito?: number; ValorDebito: number };
export type MitGrupo = { ListaDebitos: MitDebito[] };
export type MitArquivo = {
  PeriodoApuracao: { MesApuracao: number; AnoApuracao: number };
  DadosIniciais: {
    SemMovimento: false;
    QualificacaoPj: 1;
    TributacaoLucro: 1 | 2 | 3;
    VariacoesMonetarias: 1;
    RegimePisCofins: 1 | 2;
    ResponsavelApuracao: {
      CpfResponsavel: string; // PII (D12) — nunca em auditoria/log/MitExport
      TelResponsavel?: { Ddd: string; NumTelefone: string };
      EmailResponsavel?: string;
    }; // RegistroCrc omitido (F-X9-3 a)
  };
  // a ordem de inserção das chaves É a ordem do leiaute (pp. 5–6) — JSON.stringify a preserva
  Debitos: { BalancoLucroReal?: boolean; Irpj?: MitGrupo; Csll?: MitGrupo; PisPasep?: MitGrupo; Cofins?: MitGrupo };
};

/** Porta EnvioMit (D11) — reusa os tipos do C1 (X7). */
export type ApuracaoParaMit = Pick<
  TaxAssessment,
  'id' | 'anoCalendario' | 'tributo' | 'periodo' | 'modo' | 'codigoReceita' | 'aPagarCents' | 'diferencaPostergadaCents'
>;
export type EntradaMit = {
  ano: number;
  mes: number;
  perfil: { cnpj: string; regime: 'PRESUMIDO' | 'REAL'; forma: 'TRIMESTRAL' | 'ANUAL' }; // do ano do PA
  responsavel: { cpf: string; phone?: string | null; email?: string | null };
  apuracoes: ApuracaoParaMit[]; // já filtradas por apuracoesDoPa
  /** BE-INCR-LEGAL-PARAMS PR-2 (F-LP-4 a): fotografia com a tabela `CODIGO_RECEITA` (o serviço monta). */
  tabela: Pick<TabelaApuracao, 'codigoReceita'>;
};
export type SaidaMit = { nomeArquivo: string; conteudo: string; sha256: string; avisos: string[]; apuracaoIds: string[] };

/** Item 9 (F-X9-1 a, D8, F-X9-4 b) — em todo retorno de sucesso (invariante 11). */
export const AVISOS_MIT_FIXOS: readonly string[] = [
  'O arquivo traz só os débitos que o Luminaris apurou; inclua os demais no MIT antes de encerrar.',
  'Importado sobre uma apuração já encerrada, ele vira retificador e substitui a apuração inteira.',
  'Mês com extinção, fusão, cisão ou incorporação: não importe este arquivo.',
  'Confira os Dados Iniciais no MIT.',
];
/** Item 7 — texto decidido pelo dono em 06/10 (lacuna do PR-1). Vale também quando o contador não tem e-mail. */
export const AVISO_MIT_EMAIL_OMITIDO = 'E-mail do contador omitido: o MIT aceita de 5 a 40 caracteres; informe-o no MIT se quiser.';
/** Item 8 (P-1 do ADR). */
export const AVISO_MIT_CNPJ_ALFANUMERICO = 'CNPJ alfanumérico: aceitação pelo MIT não confirmada';
/** Item 9 — sai no PR-3 (item 18), quando o X8 entra no arquivo. */
export const AVISO_MIT_SEM_PIS_COFINS = 'PIS/Cofins não incluídos: o X8 não está ativo';

const TRIMESTRE = /^T0([1-4])$/;

/**
 * Item 1 (D2/D3/D4) — as apurações que entram no PA (ano, mês). Usada pelo POST e pelo cálculo de defasagem
 * (item 11), para que os dois nunca divirjam. Só `CONFIRMED` com `deletedAt` nulo (invariante 5). `T0q` do ano Y ⇒
 * PA (Y, 3q) (D4; grau I, P-4 do ADR): pedir o mês 1 ou 2 de um ano só trimestral devolve vazio (invariante 6).
 */
export function apuracoesDoPa<T extends Pick<TaxAssessment, 'anoCalendario' | 'periodo' | 'status' | 'deletedAt'>>(
  linhas: T[],
  ano: number,
  mes: number,
): T[] {
  return linhas.filter((l) => {
    if (l.status !== 'CONFIRMED' || l.deletedAt !== null || l.anoCalendario !== ano) return false;
    const t = TRIMESTRE.exec(l.periodo);
    return t !== null && Number(t[1]) * 3 === mes;
  });
}

/** Invariante 3 — centavos ⇒ reais com até 2 casas (1 ⇒ 0.01, 10 ⇒ 0.1, 115 ⇒ 1.15). */
const valorDebito = (cents: bigint): number => Number(cents) / 100;

/**
 * Item 3 — segundo débito da diferença postergada do 16% (IN 1.700 art. 215 §§ 10–13). PR-1: só o Presumido
 * (`208901` ⇒ `208902`, correção 06/10 / #560; P-M5: o `2089-02` não foi conferido na tabela do MIT). O
 * `236201`/`599301` da Fase B entra no PR-4; até lá, outro código com diferença > 0 é invariante quebrada no X7.
 */
function codigoDiferencaPostergada(t: EntradaMit['tabela'], data: string): Readonly<Record<string, string>> {
  return { [t.codigoReceita('IRPJ_PRESUMIDO', data).codigo]: t.codigoReceita('IRPJ_PRESUMIDO_DIFERENCA_POSTERGADA_16', data).codigo };
}

/** Item 2 (D5) — grupo de `Debitos` por tributo, na ordem do leiaute 1.0 (pp. 5–6). */
const GRUPOS = [
  ['IRPJ', 'Irpj'],
  ['CSLL', 'Csll'],
] as const;

const porChave = (a: ApuracaoParaMit, b: ApuracaoParaMit): number =>
  a.anoCalendario - b.anoCalendario || a.periodo.localeCompare(b.periodo) || a.codigoReceita.localeCompare(b.codigoReceita);

/**
 * Itens 2–9 — monta o arquivo do PA. Recusas (422, `MitNadaAExportarError`): Real anual (antes do PR-4), PA sem
 * apuração confirmada (D7) e PA só com débitos zero (leiaute p. 5: *"ao menos um débito"*).
 */
export function montarArquivoMit(e: EntradaMit): SaidaMit {
  // Item 5: TributacaoLucro = 1 só no PR-4.
  if (e.perfil.regime === 'REAL' && e.perfil.forma === 'ANUAL') {
    throw new MitNadaAExportarError('Real anual chega com a Fase B do X7.');
  }
  if (e.apuracoes.length === 0) throw new MitNadaAExportarError('Nada a exportar neste mês: não há apuração confirmada no período.');

  const tributosConhecidos = new Set<string>(GRUPOS.map(([t]) => t));
  for (const a of e.apuracoes) {
    if (!tributosConhecidos.has(a.tributo)) throw new Error(`montarArquivoMit: tributo fora do PR-1 (${a.tributo}, apuração ${a.id})`);
  }

  // PR-2: os códigos vêm da tabela de plataforma, vigentes no último dia do PA.
  const CODIGO_DIFERENCA_POSTERGADA = codigoDiferencaPostergada(e.tabela, new Date(Date.UTC(e.ano, e.mes, 0)).toISOString().slice(0, 10));
  // Itens 2–3: IdDebito contínuo na apuração inteira, não por grupo (invariante 1).
  let id = 0;
  const debitos: MitArquivo['Debitos'] = {};
  for (const [tributo, grupo] of GRUPOS) {
    const lista: MitDebito[] = [];
    for (const a of e.apuracoes.filter((x) => x.tributo === tributo).sort(porChave)) {
      if (a.aPagarCents > 0n) lista.push({ IdDebito: ++id, CodigoDebito: a.codigoReceita, ValorDebito: valorDebito(a.aPagarCents) });
      if (a.diferencaPostergadaCents > 0n) {
        const codigo = CODIGO_DIFERENCA_POSTERGADA[a.codigoReceita];
        if (!codigo) {
          throw new Error(`montarArquivoMit: diferença postergada em código ${a.codigoReceita} (apuração ${a.id}) — invariante do X7 quebrada`);
        }
        lista.push({ IdDebito: ++id, CodigoDebito: codigo, ValorDebito: valorDebito(a.diferencaPostergadaCents) });
      }
    }
    if (lista.length > 0) debitos[grupo] = { ListaDebitos: lista };
  }
  // Item 4: o leiaute exige ao menos um débito e o D7 proíbe SemMovimento = true.
  if (id === 0) throw new MitNadaAExportarError('Nenhum débito a exportar neste mês.');

  const avisos = [...AVISOS_MIT_FIXOS];

  // Item 7 (F-X9-3 a): só o CPF é obrigatório; RegistroCrc sempre omitido.
  const responsavel: MitArquivo['DadosIniciais']['ResponsavelApuracao'] = { CpfResponsavel: e.responsavel.cpf };
  const phone = e.responsavel.phone ?? '';
  if (/^\d{10,11}$/.test(phone)) responsavel.TelResponsavel = { Ddd: phone.slice(0, 2), NumTelefone: phone.slice(2) };
  const email = e.responsavel.email ?? '';
  if (email.length >= 5 && email.length <= 40) responsavel.EmailResponsavel = email;
  else avisos.push(AVISO_MIT_EMAIL_OMITIDO);

  const arquivo: MitArquivo = {
    PeriodoApuracao: { MesApuracao: e.mes, AnoApuracao: e.ano },
    DadosIniciais: {
      SemMovimento: false,
      QualificacaoPj: 1,
      // Item 5 (F-X9-4 b): PRESUMIDO ⇒ 3, REAL + TRIMESTRAL ⇒ 2.
      TributacaoLucro: e.perfil.regime === 'PRESUMIDO' ? 3 : 2,
      VariacoesMonetarias: 1,
      RegimePisCofins: e.perfil.regime === 'PRESUMIDO' ? 2 : 1,
      ResponsavelApuracao: responsavel,
    },
    Debitos: debitos,
  };

  // Item 8: nome `<raiz 8>-MIT-<AAAAMM>.json` (leiaute p. 10); conteúdo sem espaços; sha256 do texto em UTF-8.
  const raiz = e.perfil.cnpj.slice(0, 8);
  if (/[A-Za-z]/.test(raiz)) avisos.push(AVISO_MIT_CNPJ_ALFANUMERICO);
  avisos.push(AVISO_MIT_SEM_PIS_COFINS);
  const conteudo = JSON.stringify(arquivo);
  return {
    nomeArquivo: `${raiz}-MIT-${e.ano}${String(e.mes).padStart(2, '0')}.json`,
    conteudo,
    sha256: createHash('sha256').update(conteudo, 'utf8').digest('hex'),
    avisos,
    apuracaoIds: e.apuracoes.map((a) => a.id),
  };
}
