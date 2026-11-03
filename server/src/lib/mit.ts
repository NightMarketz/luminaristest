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
 * Escopo (F-MIT-1 a): o trimestral (`T01..T04`, Presumido e Real trimestral, PR-1), o PIS/Cofins mensal (`M01..M12`,
 * X8, PR-3 — item 18) e o Real anual (`A00..A12`, Fase B do X7, PR-4 — item 19).
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

const TRIMESTRE = /^T0([1-4])$/;
const MES_ANUAL = /^A(0[1-9]|1[0-2])$/;
const MES_PIS_COFINS = /^M(0[1-9]|1[0-2])$/;
const AJUSTE_ANUAL = 'A00';

/** Item 1 — anos que o leitor do PA (ano, mês) tem de ler: o ano Y e, em março, também Y−1 (o `A00` de Y−1). */
export const anosDoPa = (ano: number, mes: number): number[] => (mes === 3 ? [ano, ano - 1] : [ano]);

/**
 * Item 1 (D2/D3/D4) — as apurações que entram no PA (ano, mês). Usada pelo POST e pelo cálculo de defasagem
 * (item 11), para que os dois nunca divirjam. Só `CONFIRMED` com `deletedAt` nulo (invariante 5). `T0q` do ano Y ⇒
 * PA (Y, 3q) (D4; grau I, P-4 do ADR): pedir o mês 1 ou 2 de um ano só trimestral devolve vazio (invariante 6).
 * PR-4 (item 19): `A0m` do ano Y ⇒ PA (Y, m); `A00` do ano Y ⇒ PA (Y+1, 3) (Manual do MIT §4.1; leiaute p. 8).
 * PR-3 (item 18): `M0m` do ano Y (PIS/COFINS, X8) ⇒ PA (Y, m).
 */
export function apuracoesDoPa<T extends Pick<TaxAssessment, 'anoCalendario' | 'periodo' | 'status' | 'deletedAt'>>(
  linhas: T[],
  ano: number,
  mes: number,
): T[] {
  return linhas.filter((l) => {
    if (l.status !== 'CONFIRMED' || l.deletedAt !== null) return false;
    if (l.periodo === AJUSTE_ANUAL) return mes === 3 && l.anoCalendario === ano - 1;
    if (l.anoCalendario !== ano) return false;
    const t = TRIMESTRE.exec(l.periodo);
    if (t !== null) return Number(t[1]) * 3 === mes;
    const m = MES_ANUAL.exec(l.periodo) ?? MES_PIS_COFINS.exec(l.periodo);
    return m !== null && Number(m[1]) === mes;
  });
}

/** Invariante 3 — centavos ⇒ reais com até 2 casas (1 ⇒ 0.01, 10 ⇒ 0.1, 115 ⇒ 1.15). */
const valorDebito = (cents: bigint): number => Number(cents) / 100;

/**
 * Item 3 — segundo débito da diferença postergada do 16%. Presumido (PR-1, IN 1.700 art. 215 §§ 10–13): `208901` ⇒
 * `208902` (correção 06/10 / #560; P-M5: o `2089-02` não foi conferido na tabela do MIT). Real anual (PR-4, B-3/B-9;
 * IN 1.700 art. 33 § 8º): `236201` ⇒ `236202` (obrigada) e `599301` ⇒ `599302` (optante) — Manual do MIT §10.1, itens
 * 17 e 42. Outro código com diferença > 0 é invariante quebrada no X7.
 */
function codigoDiferencaPostergada(t: EntradaMit['tabela'], data: string): Readonly<Record<string, string>> {
  const c = (nome: Parameters<EntradaMit['tabela']['codigoReceita']>[0]) => t.codigoReceita(nome, data).codigo;
  return {
    [c('IRPJ_PRESUMIDO')]: c('IRPJ_PRESUMIDO_DIFERENCA_POSTERGADA_16'),
    [c('IRPJ_ESTIMATIVA_OBRIGADA')]: c('IRPJ_DIFERENCA_POSTERGADA_16_OBRIGADA'),
    [c('IRPJ_ESTIMATIVA_OPTANTE')]: c('IRPJ_DIFERENCA_POSTERGADA_16_OPTANTE'),
  };
}

/**
 * Item 2 (D5) — grupo de `Debitos` por tributo, na ordem do leiaute 1.0 (pp. 5–6). PR-3 (item 18; ADR-X8 D10/D12):
 * `PisPasep` e `Cofins`, com o `aPagarCents` como débito — o `saldoNegativoCents` do X8 é saldo credor, nunca débito
 * (P-12), e por isso não é lido aqui.
 */
const GRUPOS = [
  ['IRPJ', 'Irpj'],
  ['CSLL', 'Csll'],
  ['PIS', 'PisPasep'],
  ['COFINS', 'Cofins'],
] as const;

const porChave = (a: ApuracaoParaMit, b: ApuracaoParaMit): number =>
  a.anoCalendario - b.anoCalendario || a.periodo.localeCompare(b.periodo) || a.codigoReceita.localeCompare(b.codigoReceita);

/**
 * Itens 2–9 e 19 — monta o arquivo do PA. Recusas (422, `MitNadaAExportarError`): PA sem apuração confirmada (D7),
 * Real anual sem estimativa/balancete do mês confirmado (item 6, F-MIT-2 a) e PA só com débitos zero (leiaute p. 5:
 * *"ao menos um débito"*).
 */
export function montarArquivoMit(e: EntradaMit): SaidaMit {
  if (e.apuracoes.length === 0) throw new MitNadaAExportarError('Nada a exportar neste mês: não há apuração confirmada no período.');

  // Item 5: PRESUMIDO ⇒ 3, REAL + TRIMESTRAL ⇒ 2, REAL + ANUAL ⇒ 1 (PR-4).
  const tributacaoLucro = e.perfil.regime === 'PRESUMIDO' ? 3 : e.perfil.forma === 'ANUAL' ? 1 : 2;

  // Item 6 (F-MIT-2 a): com TributacaoLucro = 1, `BalancoLucroReal` é obrigatório (leiaute p. 5) e é uma declaração —
  // sai do modo da linha IRPJ `A0m` do PA; sem ela, 422 (não se afirma o que o sistema não sabe).
  let balancoLucroReal: boolean | undefined;
  if (tributacaoLucro === 1) {
    const mesDoPa = `A${String(e.mes).padStart(2, '0')}`;
    const irpjDoMes = e.apuracoes.find((a) => a.tributo === 'IRPJ' && a.anoCalendario === e.ano && a.periodo === mesDoPa);
    if (!irpjDoMes) throw new MitNadaAExportarError('Confirme a estimativa ou o balancete do mês no X7 antes de exportar.');
    balancoLucroReal = irpjDoMes.modo === 'BALANCETE_SUSPENSAO_REDUCAO';
  }

  const tributosConhecidos = new Set<string>(GRUPOS.map(([t]) => t));
  for (const a of e.apuracoes) {
    if (!tributosConhecidos.has(a.tributo)) throw new Error(`montarArquivoMit: tributo fora do arquivo do MIT (${a.tributo}, apuração ${a.id})`);
  }

  // PR-2: os códigos vêm da tabela de plataforma, vigentes no último dia do PA.
  const CODIGO_DIFERENCA_POSTERGADA = codigoDiferencaPostergada(e.tabela, new Date(Date.UTC(e.ano, e.mes, 0)).toISOString().slice(0, 10));
  // Itens 2–3: IdDebito contínuo na apuração inteira, não por grupo (invariante 1).
  let id = 0;
  const debitos: MitArquivo['Debitos'] = {};
  if (balancoLucroReal !== undefined) debitos.BalancoLucroReal = balancoLucroReal; // 1º da ordem do leiaute (pp. 5–6)
  for (const [tributo, grupo] of GRUPOS) {
    const lista: MitDebito[] = [];
    for (const a of e.apuracoes.filter((x) => x.tributo === tributo).sort(porChave)) {
      if (a.aPagarCents > 0n) {
        // Item 3 (PR-4): o débito do ajuste anual (`A00`) leva o ano a que se refere (leiaute p. 8; Manual §4.1).
        const anoDebito = a.periodo === AJUSTE_ANUAL ? { AnoDebito: a.anoCalendario } : {};
        lista.push({ IdDebito: ++id, CodigoDebito: a.codigoReceita, ...anoDebito, ValorDebito: valorDebito(a.aPagarCents) });
      }
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
      TributacaoLucro: tributacaoLucro, // item 5 (F-X9-4 b)
      VariacoesMonetarias: 1,
      RegimePisCofins: e.perfil.regime === 'PRESUMIDO' ? 2 : 1,
      ResponsavelApuracao: responsavel,
    },
    Debitos: debitos,
  };

  // Item 8: nome `<raiz 8>-MIT-<AAAAMM>.json` (leiaute p. 10); conteúdo sem espaços; sha256 do texto em UTF-8.
  const raiz = e.perfil.cnpj.slice(0, 8);
  if (/[A-Za-z]/.test(raiz)) avisos.push(AVISO_MIT_CNPJ_ALFANUMERICO);
  const conteudo = JSON.stringify(arquivo);
  return {
    nomeArquivo: `${raiz}-MIT-${e.ano}${String(e.mes).padStart(2, '0')}.json`,
    conteudo,
    sha256: createHash('sha256').update(conteudo, 'utf8').digest('hex'),
    avisos,
    apuracaoIds: e.apuracoes.map((a) => a.id),
  };
}
