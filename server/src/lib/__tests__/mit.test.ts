/**
 * BE-INCR-MIT-EXPORT (nó X9) PR-1 — itens 1–9. Oráculo = leiaute JSON de importação do MIT 1.0 (pp. 5–10) e
 * ADR-INCR-DCTFWEB-MIT §13, LIDOS: um verde aqui prova o leiaute lido, não o aceito pelo MIT (P-6 do ADR).
 */
import { createHash } from 'crypto';
import {
  anosDoPa,
  apuracoesDoPa,
  montarArquivoMit,
  AVISOS_MIT_FIXOS,
  AVISO_MIT_EMAIL_OMITIDO,
  AVISO_MIT_CNPJ_ALFANUMERICO,
  AVISO_MIT_SEM_PIS_COFINS,
  type ApuracaoParaMit,
  type EntradaMit,
  type MitDebito,
} from '../mit';
import { MitNadaAExportarError } from '../errors';
import { tabelaApuracaoSemente } from '@test/helpers/legalParams';

const ap = (o: Partial<ApuracaoParaMit> & Pick<ApuracaoParaMit, 'id' | 'tributo' | 'codigoReceita'>): ApuracaoParaMit => ({
  anoCalendario: 2026,
  periodo: 'T01',
  modo: 'PRESUMIDO',
  aPagarCents: 0n,
  diferencaPostergadaCents: 0n,
  ...o,
});
const IRPJ = (o: Partial<ApuracaoParaMit> = {}) => ap({ id: 'irpj', tributo: 'IRPJ', codigoReceita: '208901', aPagarCents: 123456n, ...o });
const CSLL = (o: Partial<ApuracaoParaMit> = {}) => ap({ id: 'csll', tributo: 'CSLL', codigoReceita: '237201', aPagarCents: 65432n, ...o });

const entrada = (o: Partial<EntradaMit> = {}): EntradaMit => ({
  ano: 2026,
  mes: 3,
  perfil: { cnpj: '12345678000195', regime: 'PRESUMIDO', forma: 'TRIMESTRAL' },
  responsavel: { cpf: '52998224725', phone: '11987654321', email: 'contador@escritorio.com' },
  apuracoes: [IRPJ(), CSLL()],
  tabela: tabelaApuracaoSemente(), // BE-INCR-LEGAL-PARAMS PR-2: CODIGO_RECEITA da semente
  ...o,
});
const arquivo = (o: Partial<EntradaMit> = {}) => JSON.parse(montarArquivoMit(entrada(o)).conteudo);
const debitos = (o: Partial<EntradaMit> = {}) => {
  const d = arquivo(o).Debitos;
  // `BalancoLucroReal` (Real anual, PR-4) é booleano, não grupo de débitos.
  return Object.entries(d)
    .filter(([, g]) => typeof g === 'object')
    .flatMap(([grupo, g]) => (g as { ListaDebitos: MitDebito[] }).ListaDebitos.map((x) => ({ grupo, ...x })));
};

describe('item 1 — apuracoesDoPa (D2/D4; invariantes 5 e 6)', () => {
  const linha = (periodo: string, o: Partial<{ status: string; deletedAt: Date | null; anoCalendario: number }> = {}) => ({
    periodo,
    status: 'CONFIRMED',
    deletedAt: null as Date | null,
    anoCalendario: 2026,
    ...o,
  });

  it.each([
    [3, 'T01'],
    [6, 'T02'],
    [9, 'T03'],
    [12, 'T04'],
  ])('mês %i ⇒ só o %s do ano (T0q ⇒ PA 3q)', (mes, periodo) => {
    const linhas = ['T01', 'T02', 'T03', 'T04'].map((p) => linha(p));
    expect(apuracoesDoPa(linhas, 2026, mes).map((l) => l.periodo)).toEqual([periodo]);
  });

  it('mês 1 ou 2 de um ano só trimestral ⇒ vazio (invariante 6)', () => {
    const linhas = ['T01', 'T02', 'T03', 'T04'].map((p) => linha(p));
    expect(apuracoesDoPa(linhas, 2026, 1)).toEqual([]);
    expect(apuracoesDoPa(linhas, 2026, 2)).toEqual([]);
  });

  it('SUPERSEDED, deletada e outro ano nunca entram (invariante 5)', () => {
    const linhas = [
      linha('T01', { status: 'SUPERSEDED' }),
      linha('T01', { deletedAt: new Date() }),
      linha('T01', { anoCalendario: 2025 }),
      linha('T01'),
    ];
    expect(apuracoesDoPa(linhas, 2026, 3)).toEqual([linha('T01')]);
  });

  it('PR-4: A0m do ano Y ⇒ PA (Y, m); A00 de Y ⇒ PA (Y+1, 3); M0m ainda não entra (PR-3)', () => {
    const linhas = [linha('A03'), linha('A04'), linha('A00', { anoCalendario: 2025 }), linha('A00'), linha('M03'), linha('A03', { anoCalendario: 2025 })];
    expect(apuracoesDoPa(linhas, 2026, 3)).toEqual([linha('A03'), linha('A00', { anoCalendario: 2025 })]);
    expect(apuracoesDoPa(linhas, 2026, 4)).toEqual([linha('A04')]);
    expect(apuracoesDoPa(linhas, 2027, 3)).toEqual([linha('A00')]);
    expect(apuracoesDoPa(linhas, 2026, 12)).toEqual([]);
  });

  it('A00 SUPERSEDED/deletado nunca entra; anosDoPa lê Y−1 só em março', () => {
    expect(apuracoesDoPa([linha('A00', { anoCalendario: 2025, status: 'SUPERSEDED' }), linha('A00', { anoCalendario: 2025, deletedAt: new Date() })], 2026, 3)).toEqual([]);
    expect(anosDoPa(2026, 3)).toEqual([2026, 2025]);
    expect(anosDoPa(2026, 4)).toEqual([2026]);
  });
});

describe('item 2 — grupos na ordem do leiaute e IdDebito contínuo (invariante 1)', () => {
  it('Irpj antes de Csll mesmo com a CSLL primeiro na entrada; IdDebito 1..n na apuração inteira', () => {
    const d = debitos({ apuracoes: [CSLL(), IRPJ()] });
    expect(d.map((x) => [x.grupo, x.IdDebito])).toEqual([
      ['Irpj', 1],
      ['Csll', 2],
    ]);
    expect(Object.keys(arquivo({ apuracoes: [CSLL(), IRPJ()] }).Debitos)).toEqual(['Irpj', 'Csll']);
  });

  it('dentro do grupo, ordem estável por (ano, período, código): sha independe da ordem de entrada', () => {
    const a = [IRPJ({ id: 'a', codigoReceita: '337301' }), IRPJ({ id: 'b', codigoReceita: '022001' }), CSLL()];
    const real = { cnpj: '12345678000195', regime: 'REAL' as const, forma: 'TRIMESTRAL' as const };
    const s1 = montarArquivoMit(entrada({ perfil: real, apuracoes: a }));
    const s2 = montarArquivoMit(entrada({ perfil: real, apuracoes: [...a].reverse() }));
    expect(s1.sha256).toBe(s2.sha256);
    expect(JSON.parse(s1.conteudo).Debitos.Irpj.ListaDebitos.map((x: { CodigoDebito: string }) => x.CodigoDebito)).toEqual(['022001', '337301']);
  });

  it('grupo sem débito é omitido (só IRPJ a pagar ⇒ sem Csll)', () => {
    expect(Object.keys(arquivo({ apuracoes: [IRPJ(), CSLL({ aPagarCents: 0n })] }).Debitos)).toEqual(['Irpj']);
  });
});

describe('item 3 — débito por linha (D6; invariantes 2 e 3)', () => {
  it.each([
    [1n, 0.01],
    [10n, 0.1],
    [115n, 1.15],
    [100000n, 1000],
  ])('aPagarCents %s ⇒ ValorDebito %s', (cents, valor) => {
    expect(debitos({ apuracoes: [IRPJ({ aPagarCents: cents })] })[0].ValorDebito).toBe(valor);
  });

  it('CodigoDebito é String de 6 dígitos; nenhum número do texto JSON tem mais de 2 casas', () => {
    const { conteudo } = montarArquivoMit(entrada({ apuracoes: [IRPJ({ aPagarCents: 1999999n }), CSLL({ aPagarCents: 7n })] }));
    expect(conteudo).toContain('"CodigoDebito":"208901"');
    expect(conteudo).toContain('"CodigoDebito":"237201"');
    expect(conteudo).not.toMatch(/\d\.\d{3,}/);
  });

  it('aPagarCents = 0 ⇒ sem débito daquela linha', () => {
    expect(debitos({ apuracoes: [IRPJ({ aPagarCents: 0n }), CSLL()] }).map((x) => x.CodigoDebito)).toEqual(['237201']);
  });

  it('16% no Presumido (#560): trimestre do excesso ⇒ 208901 e 208902 em sequência no grupo Irpj', () => {
    const d = debitos({ apuracoes: [CSLL(), IRPJ({ aPagarCents: 50000n, diferencaPostergadaCents: 1234n })] });
    expect(d.map((x) => [x.grupo, x.IdDebito, x.CodigoDebito, x.ValorDebito])).toEqual([
      ['Irpj', 1, '208901', 500],
      ['Irpj', 2, '208902', 12.34],
      ['Csll', 3, '237201', 654.32],
    ]);
  });

  it('16% no Presumido: trimestre sem excesso ⇒ só 208901', () => {
    expect(debitos({ apuracoes: [IRPJ()] }).map((x) => x.CodigoDebito)).toEqual(['208901']);
  });

  it('diferença postergada em outro código ⇒ erro de programa (Error, não 4xx)', () => {
    let erro: unknown;
    try {
      montarArquivoMit(entrada({ apuracoes: [CSLL({ diferencaPostergadaCents: 1n })] }));
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(Error);
    expect(erro).not.toBeInstanceOf(MitNadaAExportarError);
    expect((erro as Error).message).toMatch(/invariante do X7/);
  });
});

describe('item 4 — nada a exportar ⇒ 422 (D7; leiaute p. 5)', () => {
  it('todas as confirmadas com aPagar = 0 ⇒ 422 "nenhum débito"', () => {
    const run = () => montarArquivoMit(entrada({ apuracoes: [IRPJ({ aPagarCents: 0n }), CSLL({ aPagarCents: 0n })] }));
    expect(run).toThrow(MitNadaAExportarError);
    expect(run).toThrow(/Nenhum débito a exportar neste mês/);
    try {
      run();
    } catch (e) {
      expect((e as MitNadaAExportarError).statusCode).toBe(422);
    }
  });

  it('PA sem nenhuma confirmada ⇒ 422 "nada a exportar" (mês 1/2 de ano trimestral cai aqui)', () => {
    expect(() => montarArquivoMit(entrada({ mes: 1, apuracoes: [] }))).toThrow(/Nada a exportar neste mês/);
  });
});

describe('item 5 — Dados Iniciais (F-X9-4 b; invariante 4)', () => {
  it('PRESUMIDO ⇒ TributacaoLucro 3, RegimePisCofins 2; SemMovimento sempre false', () => {
    expect(arquivo().DadosIniciais).toMatchObject({ SemMovimento: false, QualificacaoPj: 1, TributacaoLucro: 3, VariacoesMonetarias: 1, RegimePisCofins: 2 });
  });

  it('REAL + TRIMESTRAL ⇒ TributacaoLucro 2, RegimePisCofins 1', () => {
    const real = { cnpj: '12345678000195', regime: 'REAL' as const, forma: 'TRIMESTRAL' as const };
    const a = [IRPJ({ codigoReceita: '022001', modo: 'REAL_TRIMESTRAL' }), CSLL({ codigoReceita: '601201', modo: 'REAL_TRIMESTRAL' })];
    expect(arquivo({ perfil: real, apuracoes: a }).DadosIniciais).toMatchObject({ SemMovimento: false, TributacaoLucro: 2, RegimePisCofins: 1 });
  });

  it('REAL + ANUAL ⇒ TributacaoLucro 1, RegimePisCofins 1 (PR-4)', () => {
    expect(arquivo({ perfil: REAL_ANUAL, mes: 4, apuracoes: [EST({ periodo: 'A04' })] }).DadosIniciais).toMatchObject({ TributacaoLucro: 1, RegimePisCofins: 1 });
  });
});

// PR-4 (item 19) — Real anual: A0m/A00, BalancoLucroReal (item 6), diferença postergada e AnoDebito (item 3).
const REAL_ANUAL = { cnpj: '12345678000195', regime: 'REAL' as const, forma: 'ANUAL' as const };
const EST = (o: Partial<ApuracaoParaMit> = {}) =>
  ap({ id: 'irpj-est', tributo: 'IRPJ', codigoReceita: '236201', periodo: 'A03', modo: 'ESTIMATIVA_RECEITA', aPagarCents: 30000n, ...o });
const EST_CSLL = (o: Partial<ApuracaoParaMit> = {}) =>
  ap({ id: 'csll-est', tributo: 'CSLL', codigoReceita: '248401', periodo: 'A03', modo: 'ESTIMATIVA_RECEITA', aPagarCents: 10800n, ...o });

describe('item 19 — Real anual (Fase B do X7)', () => {
  it('(a) A03 por balancete com redução ⇒ BalancoLucroReal true + 236201/248401; BalancoLucroReal é a 1ª chave de Debitos', () => {
    const a = [EST({ modo: 'BALANCETE_SUSPENSAO_REDUCAO' }), EST_CSLL({ modo: 'BALANCETE_SUSPENSAO_REDUCAO' })];
    const arq = arquivo({ perfil: REAL_ANUAL, apuracoes: a });
    expect(Object.keys(arq.Debitos)).toEqual(['BalancoLucroReal', 'Irpj', 'Csll']);
    expect(arq.Debitos.BalancoLucroReal).toBe(true);
    expect(debitos({ perfil: REAL_ANUAL, apuracoes: a }).map((x) => [x.IdDebito, x.CodigoDebito])).toEqual([
      [1, '236201'],
      [2, '248401'],
    ]);
  });

  it('estimativa por receita ⇒ BalancoLucroReal false', () => {
    expect(arquivo({ perfil: REAL_ANUAL, apuracoes: [EST(), EST_CSLL()] }).Debitos.BalancoLucroReal).toBe(false);
  });

  it('(b) A04 em suspensão (devido 0) como único ⇒ 422 "nenhum débito" (item 4)', () => {
    const a = [EST({ periodo: 'A04', modo: 'BALANCETE_SUSPENSAO_REDUCAO', aPagarCents: 0n }), EST_CSLL({ periodo: 'A04', modo: 'BALANCETE_SUSPENSAO_REDUCAO', aPagarCents: 0n })];
    expect(() => montarArquivoMit(entrada({ perfil: REAL_ANUAL, mes: 4, apuracoes: a }))).toThrow(/Nenhum débito a exportar neste mês/);
  });

  it('(c) março de Y+1 com A00 de Y ⇒ débito 243001 com AnoDebito Y (e A03 de Y+1 sem AnoDebito)', () => {
    const a = [
      ap({ id: 'irpj-aj', tributo: 'IRPJ', codigoReceita: '243001', anoCalendario: 2025, periodo: 'A00', modo: 'AJUSTE_ANUAL', aPagarCents: 99900n }),
      ap({ id: 'csll-aj', tributo: 'CSLL', codigoReceita: '677301', anoCalendario: 2025, periodo: 'A00', modo: 'AJUSTE_ANUAL', aPagarCents: 500n }),
      EST(),
    ];
    const s = montarArquivoMit(entrada({ perfil: REAL_ANUAL, apuracoes: a }));
    expect(s.conteudo).toContain('{"IdDebito":1,"CodigoDebito":"243001","AnoDebito":2025,"ValorDebito":999}');
    expect(debitos({ perfil: REAL_ANUAL, apuracoes: a }).map((x) => [x.IdDebito, x.CodigoDebito, x.AnoDebito])).toEqual([
      [1, '243001', 2025],
      [2, '236201', undefined],
      [3, '677301', 2025],
    ]);
  });

  it('F-MIT-2 (a): sem linha IRPJ A0m confirmada no PA (só o A00 do ano anterior) ⇒ 422', () => {
    const a = [ap({ id: 'irpj-aj', tributo: 'IRPJ', codigoReceita: '243001', anoCalendario: 2025, periodo: 'A00', modo: 'AJUSTE_ANUAL', aPagarCents: 100n })];
    const run = () => montarArquivoMit(entrada({ perfil: REAL_ANUAL, apuracoes: a }));
    expect(run).toThrow(MitNadaAExportarError);
    expect(run).toThrow(/Confirme a estimativa ou o balancete do mês no X7 antes de exportar/);
  });

  it.each([
    ['236201', '236202'],
    ['599301', '599302'],
  ])('(d) mês do excesso do 16%%: %s e %s em sequência no grupo Irpj', (cod, dif) => {
    const a = [EST_CSLL(), EST({ codigoReceita: cod, aPagarCents: 50000n, diferencaPostergadaCents: 1234n })];
    expect(debitos({ perfil: REAL_ANUAL, apuracoes: a }).map((x) => [x.grupo, x.IdDebito, x.CodigoDebito, x.ValorDebito])).toEqual([
      ['Irpj', 1, cod, 500],
      ['Irpj', 2, dif, 12.34],
      ['Csll', 3, '248401', 108],
    ]);
  });
});

describe('item 7 — responsável = contador (F-X9-3 a)', () => {
  const resp = (r: EntradaMit['responsavel']) => montarArquivoMit(entrada({ responsavel: r }));

  it('CPF + telefone (DDD 2 + número) + e-mail; RegistroCrc nunca', () => {
    expect(JSON.parse(resp({ cpf: '52998224725', phone: '11987654321', email: 'a@b.co' }).conteudo).DadosIniciais.ResponsavelApuracao).toEqual({
      CpfResponsavel: '52998224725',
      TelResponsavel: { Ddd: '11', NumTelefone: '987654321' },
      EmailResponsavel: 'a@b.co',
    });
    expect(resp({ cpf: '52998224725', phone: '1133334444' }).conteudo).toContain('"TelResponsavel":{"Ddd":"11","NumTelefone":"33334444"}');
  });

  it('telefone fora de 10–11 dígitos ⇒ omitido', () => {
    expect(JSON.parse(resp({ cpf: '52998224725', phone: '987654321', email: 'a@b.co' }).conteudo).DadosIniciais.ResponsavelApuracao).not.toHaveProperty('TelResponsavel');
  });

  it.each([
    ['ausente', null],
    ['curto (4)', 'a@bc'],
    ['longo (41)', `${'x'.repeat(31)}@empresa.c`],
  ])('e-mail %s ⇒ omitido com aviso', (_caso, email) => {
    const s = resp({ cpf: '52998224725', phone: null, email });
    expect(JSON.parse(s.conteudo).DadosIniciais.ResponsavelApuracao).toEqual({ CpfResponsavel: '52998224725' });
    expect(s.avisos).toContain(AVISO_MIT_EMAIL_OMITIDO);
  });

  it('e-mail de 40 caracteres ⇒ mantido, sem aviso', () => {
    const email = `${'x'.repeat(30)}@empresa.c`;
    expect(email).toHaveLength(40);
    const s = resp({ cpf: '52998224725', email });
    expect(JSON.parse(s.conteudo).DadosIniciais.ResponsavelApuracao.EmailResponsavel).toBe(email);
    expect(s.avisos).not.toContain(AVISO_MIT_EMAIL_OMITIDO);
  });
});

describe('item 8 — nome, conteúdo e hash (invariante 8)', () => {
  it('nome = raiz 8 + -MIT- + AAAAMM + .json; conteúdo sem espaços; sha256 do texto UTF-8', () => {
    const s = montarArquivoMit(entrada());
    expect(s.nomeArquivo).toBe('12345678-MIT-202603.json');
    expect(s.conteudo).toBe(JSON.stringify(JSON.parse(s.conteudo)));
    expect(s.sha256).toBe(createHash('sha256').update(s.conteudo, 'utf8').digest('hex'));
    expect(s.apuracaoIds).toEqual(['irpj', 'csll']);
  });

  it('arquivo de ouro Presumido T01 (texto exato)', () => {
    expect(montarArquivoMit(entrada()).conteudo).toBe(
      '{"PeriodoApuracao":{"MesApuracao":3,"AnoApuracao":2026},' +
        '"DadosIniciais":{"SemMovimento":false,"QualificacaoPj":1,"TributacaoLucro":3,"VariacoesMonetarias":1,"RegimePisCofins":2,' +
        '"ResponsavelApuracao":{"CpfResponsavel":"52998224725","TelResponsavel":{"Ddd":"11","NumTelefone":"987654321"},"EmailResponsavel":"contador@escritorio.com"}},' +
        '"Debitos":{"Irpj":{"ListaDebitos":[{"IdDebito":1,"CodigoDebito":"208901","ValorDebito":1234.56}]},' +
        '"Csll":{"ListaDebitos":[{"IdDebito":2,"CodigoDebito":"237201","ValorDebito":654.32}]}}}',
    );
  });

  it('raiz com letra ⇒ aviso de CNPJ alfanumérico; dezembro ⇒ AAAA12', () => {
    const s = montarArquivoMit(entrada({ mes: 12, perfil: { cnpj: '12ABC34501DE35', regime: 'PRESUMIDO', forma: 'TRIMESTRAL' }, apuracoes: [IRPJ({ periodo: 'T04' })] }));
    expect(s.nomeArquivo).toBe('12ABC345-MIT-202612.json');
    expect(s.avisos).toContain(AVISO_MIT_CNPJ_ALFANUMERICO);
    expect(montarArquivoMit(entrada()).avisos).not.toContain(AVISO_MIT_CNPJ_ALFANUMERICO);
  });
});

describe('item 9 — avisos (invariante 11)', () => {
  it('os 4 fixos em todo sucesso, por igualdade, + "PIS/Cofins não incluídos" antes do PR-3', () => {
    expect(montarArquivoMit(entrada()).avisos).toEqual([...AVISOS_MIT_FIXOS, AVISO_MIT_SEM_PIS_COFINS]);
    expect(AVISOS_MIT_FIXOS).toEqual([
      'O arquivo traz só os débitos que o Luminaris apurou; inclua os demais no MIT antes de encerrar.',
      'Importado sobre uma apuração já encerrada, ele vira retificador e substitui a apuração inteira.',
      'Mês com extinção, fusão, cisão ou incorporação: não importe este arquivo.',
      'Confira os Dados Iniciais no MIT.',
    ]);
  });
});
