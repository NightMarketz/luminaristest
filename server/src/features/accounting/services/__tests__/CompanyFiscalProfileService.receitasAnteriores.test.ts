/**
 * Lacuna L-20261127-184105-7694 (dono, chat, 27/11/2026: "abre uma sessão para a lacuna 7694 do 144-E") — teste-guarda.
 *
 * Res. CGSN 140/2018 art. 144-D (incl. Res. CGSN 190/2026; efeitos imediatos pela Res. CGSN 196/2026 art. 4º, nova redação
 * do art. 9º I da 190, vigência 24/11/2026): quem tem a opção pelo Simples com efeitos em 01/01/2027 e, em 2026, não esteve
 * no regime (inciso I "a") informa previamente a receita bruta e a folha dos períodos anteriores, no módulo "Receitas
 * Anteriores à Opção" do PGDAS-D (§ 2º). Art. 144-E: competências 12/2025 a 11/2026 até 20/12/2026 (I); 12/2026 até
 * 20/01/2027 (II). Sem manifestação valem os pré-preenchidos da RFB, inclusive para a alíquota (p.ú.).
 * Oráculo: `pesquisas-legais/dp-tabelas-irrf-das-sst/docs/D24_rfb-92278-multivigente.txt` L2064–2076 e D10 L149–152.
 *
 * O caso é o inequívoco: perfil de 2026 PRESUMIDO, perfil de 2027 SIMPLES, consulta em 28/12/2026 (entre os dois prazos).
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILES, SIMPLES_SEED_FILES, SIMPLES_SEED_FILE_RECEITAS_ANTERIORES, legalParamsSeedRows } from '@test/helpers/legalParams';
import { ObrigacaoRegimeJson } from '../../../legalParameters/models/formatoLinha';
import { linhasEmVigor, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import type { AccountingScope } from '../../scope/AccountingScope';
import { CompanyFiscalProfileService } from '../CompanyFiscalProfileService';

const SEMENTE: LinhaLegal[] = linhasEmVigor(legalParamsSeedRows([...LEGAL_PARAMS_SEED_FILES, ...SIMPLES_SEED_FILES]));
const scope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' } as AccountingScope;

/** Linha do perfil como o Prisma a devolve: só o que o `toView` lê, com os opcionais nulos. */
const perfil = (ano: number, regime: string, over: Record<string, unknown> = {}) => ({
  anoCalendario: ano,
  regime,
  grandePorte: null,
  inativa: false,
  aporteInvestidorAnjo: false,
  livroCaixaSemEscrituracao: null,
  distribuicaoAcimaBase: null,
  declarante: null,
  ecdIndNire: null,
  contadorContactId: null,
  representanteLegalSignerId: null,
  regimeTravadoEm: null,
  formaApuracaoTravadaEm: null,
  inicioAtividadeEm: null,
  encerramentoAtividadeEm: null,
  simplesRegimeApuracao: 'COMPETENCIA',
  simplesExclusaoEfeitosEm: null,
  receitaTotalAnoAnteriorCents: null,
  updatedAt: new Date('2026-11-27T12:00:00.000Z'),
  ...over,
});

function servico(perfis: Record<number, ReturnType<typeof perfil>>): CompanyFiscalProfileService {
  const repo = { findByYear: async (_s: unknown, ano: number) => perfis[ano] ?? null };
  const politica = { canReadFiscalProfile: () => true, canManageFiscalProfile: () => true };
  const fotografia = async (tabelas: readonly string[]) => SEMENTE.filter((l) => tabelas.includes(l.tabela)) as never;
  const nenhum = { findById: async () => null };
  return new CompanyFiscalProfileService(repo as never, nenhum as never, nenhum as never, politica as never, {} as never, {} as never, {} as never, { countByOwnerYearPeriods: async () => [] }, { fotografia }, nenhum as never, {} as never);
}

/** Comparação por `string`: o tipo da obrigação ainda não conhece a chave nova (o guarda falha pela asserção, não pelo tsc). */
async function receitasAnteriores(perfis: Record<number, ReturnType<typeof perfil>>, ano: number) {
  const view = await servico(perfis).obligations(scope, ano);
  // Pré-condição do cenário: a matriz do Simples chegou ao resolvedor (vermelho por setup vazio não conta).
  expect(view.obrigacoes.map((o) => o.obrigacao)).toContain('PGDAS_D');
  return view.obrigacoes.find((o) => (o.obrigacao as string) === 'RECEITAS_ANTERIORES_OPCAO') as unknown as Record<string, unknown> | undefined;
}

describe('L-7694 — Receitas Anteriores à Opção no calendário (Res. CGSN 140 arts. 144-D e 144-E)', () => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date('2026-12-28T15:00:00.000Z'));
  });
  afterAll(() => jest.useRealTimers());

  it('Simples com efeitos em 01/01/2027 e Presumido em 2026 ⇒ RECEITAS_ANTERIORES_OPCAO obrigatória, competência 12/2026 até 20/01/2027 (art. 144-E II)', async () => {
    const o = await receitasAnteriores({ 2026: perfil(2026, 'PRESUMIDO'), 2027: perfil(2027, 'SIMPLES') }, 2027);
    expect(o).toMatchObject({
      status: 'OBRIGATORIA',
      entregas: expect.arrayContaining([
        expect.objectContaining({ competenciaDe: '2025-12', competenciaAte: '2026-11', prazo: '2026-12-20' }),
        expect.objectContaining({ competenciaDe: '2026-12', competenciaAte: '2026-12', prazo: '2027-01-20' }),
      ]),
    });
  });

  // ── Ramos do art. 144-D (correção da L-7694) ─────────────────────────────────────────────────────────────────────────
  it('sem perfil de 2026 ⇒ CONDICIONAL com a pergunta (falta o dado de entrada; nunca "não sujeito"), com os prazos', async () => {
    const o = await receitasAnteriores({ 2027: perfil(2027, 'SIMPLES') }, 2027);
    expect(o).toMatchObject({ status: 'CONDICIONAL', perguntaPendente: expect.stringMatching(/todo o ano de 2026/), entregas: expect.any(Array) });
  });

  it('Simples o ano inteiro de 2026 ⇒ NAO_SE_APLICA, sem prazos', async () => {
    const o = await receitasAnteriores({ 2026: perfil(2026, 'SIMPLES'), 2027: perfil(2027, 'SIMPLES') }, 2027);
    expect(o).toEqual({ obrigacao: 'RECEITAS_ANTERIORES_OPCAO', status: 'NAO_SE_APLICA', fonte: expect.stringMatching(/art\. 144-D/), faltantes: [] });
  });

  it('MEI em 2026 ⇒ OBRIGATORIA (inciso II: desenquadramento do Simei)', async () => {
    expect((await receitasAnteriores({ 2026: perfil(2026, 'MEI'), 2027: perfil(2027, 'SIMPLES') }, 2027))?.status).toBe('OBRIGATORIA');
  });

  it('Simples em 2026 com exclusão de efeitos no meio do ano ⇒ OBRIGATORIA (inciso I "b")', async () => {
    const o = await receitasAnteriores({ 2026: perfil(2026, 'SIMPLES', { simplesExclusaoEfeitosEm: '2026-07-01' }), 2027: perfil(2027, 'SIMPLES') }, 2027);
    expect(o?.status).toBe('OBRIGATORIA');
  });

  it('início de atividade em 2026 no Simples, nele até 31/12 ⇒ NAO_SE_APLICA (§ 1º)', async () => {
    const o = await receitasAnteriores({ 2026: perfil(2026, 'SIMPLES', { inicioAtividadeEm: '2026-05-10' }), 2027: perfil(2027, 'SIMPLES') }, 2027);
    expect(o?.status).toBe('NAO_SE_APLICA');
  });

  it('início de atividade em 2027 depois de 01/01 ⇒ NAO_SE_APLICA (opção não produz efeitos em 01/01/2027)', async () => {
    expect((await receitasAnteriores({ 2027: perfil(2027, 'SIMPLES', { inicioAtividadeEm: '2027-03-01' }) }, 2027))?.status).toBe('NAO_SE_APLICA');
  });

  it('inativa em 2027 vinda do Presumido ⇒ OBRIGATORIA (a norma não distingue a inativa: segueCondicoes)', async () => {
    expect((await receitasAnteriores({ 2026: perfil(2026, 'PRESUMIDO'), 2027: perfil(2027, 'SIMPLES', { inativa: true }) }, 2027))?.status).toBe('OBRIGATORIA');
  });

  it('perfil de 2026 (Simples) não recebe a obrigação: o ingresso é o de 01/01/2027', async () => {
    expect((await receitasAnteriores({ 2025: perfil(2025, 'PRESUMIDO'), 2026: perfil(2026, 'SIMPLES') }, 2026))?.status).toBe('NAO_SE_APLICA');
  });

  it('depois do último prazo (21/01/2027) a linha sai da matriz', async () => {
    jest.setSystemTime(new Date('2027-01-21T15:00:00.000Z'));
    try {
      const view = await servico({ 2026: perfil(2026, 'PRESUMIDO'), 2027: perfil(2027, 'SIMPLES') }).obligations(scope, 2027);
      expect(view.obrigacoes.map((o) => o.obrigacao)).not.toContain('RECEITAS_ANTERIORES_OPCAO');
    } finally {
      jest.setSystemTime(new Date('2026-12-28T15:00:00.000Z'));
    }
  });
});

describe('L-7694 — semente da linha', () => {
  const norm = (s: string) => s.replace(/\r\n/g, '\n');
  const raiz = path.resolve(__dirname, '../../../../..');
  it('o migration.sql carrega o texto do arquivo de dado, byte a byte, e só insere', () => {
    const mig = norm(fs.readFileSync(path.join(raiz, 'prisma/migrations/20261127190000_seed_receitas_anteriores_opcao/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(SIMPLES_SEED_FILE_RECEITAS_ANTERIORES, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });
  it('uma linha SIMPLES, vigente de 24/11/2026 (Res. CGSN 196 art. 4º) a 20/01/2027 (art. 144-E II), no formato da tabela', () => {
    const [l, ...resto] = legalParamsSeedRows(SIMPLES_SEED_FILE_RECEITAS_ANTERIORES);
    expect(resto).toEqual([]);
    expect([l.tabela, l.chave, l.discriminador, l.status, l.vigenteDesde, l.vigenteAte]).toEqual(['OBRIGACAO_REGIME', 'RECEITAS_ANTERIORES_OPCAO', 'SIMPLES', 'PUBLISHED', '2026-11-24', '2027-01-20']);
    expect(l.fonte).toMatch(/Res\. CGSN 196\/2026 art\. 4º/);
    expect(l.fonteSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(() => ObrigacaoRegimeJson.parse(JSON.parse(l.valorJson ?? ''))).not.toThrow();
  });
});
