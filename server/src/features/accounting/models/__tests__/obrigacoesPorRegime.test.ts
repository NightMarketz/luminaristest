/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF itens 2–4, §4.2). Uma asserção por linha da matriz, com a fonte no
 * nome do teste, e um teste por ramo do resolvedor. Oráculo = texto das IN no corpus
 * (`docs/accounting/fontes-oficiais/IN-RFB-2003-2021-ECD.txt` art. 3º; `…2004-2021-ECF.txt` art. 1º) e
 * LC 123/2006 art. 18-A §1º (MEI é optante do Simples).
 */
import { OBRIGACOES_POR_REGIME, resolverObrigacoes } from '../obrigacoesPorRegime';
import type { CondicoesPerfil } from '../obrigacoesPorRegime';
import { REGIMES_EMPRESA, regimeUnidadeEsperado } from '../regimeEmpresa';

const NENHUMA: CondicoesPerfil = { aporteInvestidorAnjo: false, livroCaixaSemEscrituracao: false, distribuicaoAcimaBase: false };
const status = (regime: (typeof REGIMES_EMPRESA)[number], condicoes: Partial<CondicoesPerfil> = {}, inativa = false) =>
  Object.fromEntries(resolverObrigacoes({ regime, inativa, condicoes: { ...NENHUMA, ...condicoes } }).map((o) => [o.obrigacao, o]));

describe('regimeEmpresa (item 2)', () => {
  it('MEI e SIMPLES → unidade SIMPLES; PRESUMIDO e REAL → o próprio (LC 123 art. 18-A §1º)', () => {
    expect(REGIMES_EMPRESA.map(regimeUnidadeEsperado)).toEqual(['SIMPLES', 'SIMPLES', 'PRESUMIDO', 'REAL']);
  });
});

describe('matriz ECD/ECF × 4 regimes (item 3) — só linhas com fonte verificada', () => {
  it('tem exatamente 8 linhas (ECD e ECF para MEI, SIMPLES, PRESUMIDO, REAL), cada uma com fonte e vigência', () => {
    expect(OBRIGACOES_POR_REGIME).toHaveLength(8);
    for (const r of REGIMES_EMPRESA) {
      expect(OBRIGACOES_POR_REGIME.filter((l) => l.regime === r).map((l) => l.obrigacao).sort()).toEqual(['ECD', 'ECF']);
    }
    for (const l of OBRIGACOES_POR_REGIME) {
      expect(l.fonte).toMatch(/IN RFB 2\.00[34]\/2021/);
      expect(l.vigenteDesde).toBe('2021-01-18');
    }
  });

  it.each([
    ['ECD', 'REAL', 'OBRIGATORIA', 'IN 2.003 art. 3º caput'],
    ['ECD', 'PRESUMIDO', 'OBRIGATORIA', 'IN 2.003 art. 3º caput (sem livro caixa)'],
    ['ECD', 'SIMPLES', 'FACULTATIVA', 'IN 2.003 art. 3º §1º I + §6º'],
    ['ECD', 'MEI', 'FACULTATIVA', 'IN 2.003 art. 3º §1º I + §6º + LC 123 art. 18-A §1º'],
    ['ECF', 'REAL', 'OBRIGATORIA', 'IN 2.004 art. 1º caput e §2º'],
    ['ECF', 'PRESUMIDO', 'OBRIGATORIA', 'IN 2.004 art. 1º caput'],
    ['ECF', 'SIMPLES', 'NAO_SE_APLICA', 'IN 2.004 art. 1º §1º I'],
    ['ECF', 'MEI', 'NAO_SE_APLICA', 'IN 2.004 art. 1º §1º I + LC 123 art. 18-A §1º'],
  ] as const)('%s × %s, condições todas "não" → %s (%s)', (obrigacao, regime, esperado, _fonte) => {
    expect(status(regime)[obrigacao].status).toBe(esperado);
  });
});

describe('resolvedor (item 4) — precedência IN 2.003 art. 3º §§1º–3º e 6º', () => {
  it('inativa → NAO_SE_APLICA nas duas, qualquer regime (IN 2.003 art. 3º §1º III; IN 2.004 art. 1º §1º III)', () => {
    for (const r of REGIMES_EMPRESA) {
      const s = status(r, { aporteInvestidorAnjo: true }, true);
      expect(s.ECD).toMatchObject({ status: 'NAO_SE_APLICA', fonte: 'IN RFB 2.003/2021 art. 3º §1º III' });
      expect(s.ECF).toMatchObject({ status: 'NAO_SE_APLICA', fonte: 'IN RFB 2.004/2021 art. 1º §1º III' });
    }
  });

  it('PRESUMIDO com livro caixa → ECD FACULTATIVA (§1º V + §6º)', () => {
    expect(status('PRESUMIDO', { livroCaixaSemEscrituracao: true }).ECD.status).toBe('FACULTATIVA');
  });

  it('PRESUMIDO com livro caixa E aporte → OBRIGATORIA (§2º vence a dispensa do §1º V)', () => {
    expect(status('PRESUMIDO', { livroCaixaSemEscrituracao: true, aporteInvestidorAnjo: true }).ECD).toMatchObject({
      status: 'OBRIGATORIA',
      fonte: 'IN RFB 2.003/2021 art. 3º §2º',
    });
  });

  it('PRESUMIDO com livro caixa E distribuição acima da base → OBRIGATORIA (§3º vence a dispensa)', () => {
    expect(status('PRESUMIDO', { livroCaixaSemEscrituracao: true, distribuicaoAcimaBase: true }).ECD).toMatchObject({
      status: 'OBRIGATORIA',
      fonte: 'IN RFB 2.003/2021 art. 3º §3º',
    });
  });

  it('SIMPLES com aporte de investidor-anjo → ECD OBRIGATORIA (§2º); ECF segue NAO_SE_APLICA', () => {
    const s = status('SIMPLES', { aporteInvestidorAnjo: true });
    expect(s.ECD.status).toBe('OBRIGATORIA');
    expect(s.ECF.status).toBe('NAO_SE_APLICA');
  });

  it('SIMPLES com aporte sem resposta → ECD CONDICIONAL com a pergunta do §2º', () => {
    expect(status('SIMPLES', { aporteInvestidorAnjo: null }).ECD).toMatchObject({
      status: 'CONDICIONAL',
      perguntaPendente: expect.stringMatching(/investidor-anjo/),
    });
  });

  it('PRESUMIDO com aporte pendente e livro caixa "sim" → CONDICIONAL (a resposta do aporte muda o resultado)', () => {
    expect(status('PRESUMIDO', { aporteInvestidorAnjo: null, livroCaixaSemEscrituracao: true }).ECD).toMatchObject({
      status: 'CONDICIONAL',
      perguntaPendente: expect.stringMatching(/investidor-anjo/),
    });
  });

  it('PRESUMIDO com aporte pendente e distribuição "sim" → OBRIGATORIA (aporte OU distribuição — a pendência não muda nada)', () => {
    expect(status('PRESUMIDO', { aporteInvestidorAnjo: null, distribuicaoAcimaBase: true }).ECD.status).toBe('OBRIGATORIA');
  });

  it('PRESUMIDO com livro caixa pendente e o resto "não" → CONDICIONAL com a pergunta do art. 45 da Lei 8.981', () => {
    expect(status('PRESUMIDO', { livroCaixaSemEscrituracao: null }).ECD).toMatchObject({
      status: 'CONDICIONAL',
      perguntaPendente: expect.stringMatching(/8\.981/),
    });
  });

  it('MEI não tem condição de aporte (§2º fala em ME/EPP — sem fonte para o MEI, BRIEF §5 item 2)', () => {
    expect(status('MEI', { aporteInvestidorAnjo: true }).ECD.status).toBe('FACULTATIVA');
  });
});
