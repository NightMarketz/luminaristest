/**
 * BE-INCR-MIT-EXPORT (nó X9) PR-1 — itens 1–9. Oráculo = leiaute JSON de importação do MIT 1.0 (pp. 5–10) e
 * ADR-INCR-DCTFWEB-MIT §13, LIDOS: um verde aqui prova o leiaute lido, não o aceito pelo MIT (P-6 do ADR).
 */
import { createHash } from 'crypto';
import {
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
  ...o,
});
const arquivo = (o: Partial<EntradaMit> = {}) => JSON.parse(montarArquivoMit(entrada(o)).conteudo);
const debitos = (o: Partial<EntradaMit> = {}) => {
  const d = arquivo(o).Debitos;
  return Object.entries(d).flatMap(([grupo, g]) => (g as { ListaDebitos: MitDebito[] }).ListaDebitos.map((x) => ({ grupo, ...x })));
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

  it('A0m/A00/M0m ainda não entram no PR-1 (PR-3/PR-4)', () => {
    expect(apuracoesDoPa([linha('A03'), linha('A00', { anoCalendario: 2025 }), linha('M03')], 2026, 3)).toEqual([]);
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

  it('REAL + ANUAL ⇒ 422 até o PR-4', () => {
    expect(() => montarArquivoMit(entrada({ perfil: { cnpj: '12345678000195', regime: 'REAL', forma: 'ANUAL' } }))).toThrow(
      /Real anual chega com a Fase B do X7/,
    );
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
