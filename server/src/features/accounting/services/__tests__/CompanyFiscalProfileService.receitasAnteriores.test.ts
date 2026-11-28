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
import { LEGAL_PARAMS_SEED_FILES, SIMPLES_SEED_FILES, legalParamsSeedRows } from '@test/helpers/legalParams';
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
});
