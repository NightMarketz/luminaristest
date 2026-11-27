/**
 * Onda 3.2, ressalva do #1363 (revisor 24/11/2026; dono, chat, 24/11/2026: tabela `MARCO_LEGAL`) — os literais de data que
 * sobraram fora da tabela viraram linhas:
 *   - `INICIO_OPCAO_IBS_CBS_DAS` (LC 214 art. 517 + 544 III) — trava do `upsert` e `ibsCbsNoDas` (antes: `ano < 2027`, `'2027-01'`);
 *   - `FIM_REGIME_CAIXA_SIMPLES` (Res. CGSN 190/2026 art. 9º II) — trava do caixa no `upsert` e no `copyFrom` (antes: `ano >= 2027`);
 *   - `INICIO_IBS_MUNICIPAL` (LC 214 arts. 343–344) — `aliquotasIbsCbsVigentes` (antes: `data < '2027-01-01'`).
 * PROVA da virada: mover SÓ a linha do marco muda o comportamento, sem tocar código; sem a linha, fail-closed.
 * O `SimplesApuracaoService` (`INICIO_CGSN190_MES_SEGUINTE`) fica fora de propósito (outro dispositivo da Res. CGSN 190).
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_IBS_CBS, LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL, LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL_V2, legalParamsSeedRows } from '@test/helpers/legalParams';
import { ValidationError } from '../../../../lib/errors';
import { ParametroLegalAusenteError, SemLinhaVigenteError, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import { UpsertCompanyFiscalProfileSchema } from '../../dtos/CompanyFiscalProfileDto';
import { tabelaIbsCbsDe } from '../../models/ibsCbsParams';
import { dataDoMarco } from '../../models/marcoLegal';
import { aliquotasIbsCbsVigentes } from '../../models/nfeIbsCbsMontagem';
import type { AccountingScope } from '../../models/AccountingScope';
import { CompanyFiscalProfileService, ibsCbsNoDas } from '../CompanyFiscalProfileService';

const SEMENTE: LinhaLegal[] = legalParamsSeedRows([LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL, LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL_V2]);
type Chave = 'INICIO_OPCAO_IBS_CBS_DAS' | 'FIM_REGIME_CAIXA_SIMPLES' | 'INICIO_IBS_MUNICIPAL';
/** A mesma fotografia com o `valorTexto` de UMA linha trocado — a "virada" é publicar linha, não editar código. */
const comMarco = (chave: Chave, data: string): LinhaLegal[] => SEMENTE.map((l) => (l.chave === chave ? { ...l, valorTexto: data } : l));
const semMarco = (chave: Chave): LinhaLegal[] => SEMENTE.filter((l) => l.chave !== chave);

const scope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' } as AccountingScope;
const ALCANCOU_O_REPO = 'REPO_ALCANCADO';
const porta = (nome: string) => () => {
  throw new Error(`${ALCANCOU_O_REPO}:${nome}`);
};

/** Serviço com a fotografia dada e repositórios que acusam quando são alcançados — "passou da trava" = chegou ao repo. */
function servico(linhas: readonly LinhaLegal[], origem?: Record<string, unknown>): CompanyFiscalProfileService {
  const repo = new Proxy(
    {
      runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
      findByYear: async (_s: unknown, ano: number) => (origem && ano === 2026 ? origem : null),
    } as Record<string, unknown>,
    { get: (alvo, nome: string) => alvo[nome] ?? porta(nome) },
  );
  const politica = { canManageFiscalProfile: () => true, canReadFiscalProfile: () => true };
  const fotografia = async (tabelas: readonly string[]) => linhas.filter((l) => tabelas.includes(l.tabela)) as never;
  return new CompanyFiscalProfileService(repo as never, {} as never, {} as never, politica as never, {} as never, {} as never, {} as never, { countByOwnerYearPeriods: async () => [] }, { fotografia }, {} as never, {} as never);
}
const PRAZOS = { simplesCaixaPrazoCartaoDebitoDias: 1, simplesCaixaPrazoCartaoCreditoDias: 30 };
const entrada = (over: Record<string, unknown>) => UpsertCompanyFiscalProfileSchema.parse({ unitId: 'unit-1', regime: 'SIMPLES', ...over });

describe('MARCO_LEGAL/INICIO_OPCAO_IBS_CBS_DAS — a trava da opção do IBS/CBS no upsert vem da linha', () => {
  it('semente (2027-01-01): perfil de 2026 com opção ⇒ 400; perfil de 2027 passa da trava', async () => {
    await expect(servico(SEMENTE).upsert(scope, 2026, entrada({ ibsCbsOpcaoS1: 'REGULAR' }))).rejects.toThrow(/só existe a partir de 2027 \(perfil de 2026\)/);
    await expect(servico(SEMENTE).upsert(scope, 2027, entrada({ ibsCbsOpcaoS2: 'REGULAR' }))).rejects.toThrow(ALCANCOU_O_REPO);
  });

  it('VIRADA: marco movido para 2028-01-01 ⇒ o perfil de 2027 passa a ser recusado, com o ano novo na mensagem', async () => {
    const r = servico(comMarco('INICIO_OPCAO_IBS_CBS_DAS', '2028-01-01')).upsert(scope, 2027, entrada({ ibsCbsOpcaoS1: 'REGULAR' }));
    await expect(r).rejects.toBeInstanceOf(ValidationError);
    await expect(servico(comMarco('INICIO_OPCAO_IBS_CBS_DAS', '2028-01-01')).upsert(scope, 2027, entrada({ ibsCbsOpcaoS1: 'REGULAR' }))).rejects.toThrow(/a partir de 2028 \(perfil de 2027\)/);
  });

  it('VIRADA no outro sentido: marco no meio de 2026 ⇒ o perfil de 2026 (que contém o marco) passa da trava', async () => {
    await expect(servico(comMarco('INICIO_OPCAO_IBS_CBS_DAS', '2026-07-01')).upsert(scope, 2026, entrada({ ibsCbsOpcaoS1: 'REGULAR' }))).rejects.toThrow(ALCANCOU_O_REPO);
  });

  it('sem a linha o upsert COM opção recusa (fail-closed); sem opção no payload a linha nem é lida', async () => {
    await expect(servico(semMarco('INICIO_OPCAO_IBS_CBS_DAS')).upsert(scope, 2027, entrada({ ibsCbsOpcaoS1: 'REGULAR' }))).rejects.toBeInstanceOf(ParametroLegalAusenteError);
    await expect(servico(semMarco('INICIO_OPCAO_IBS_CBS_DAS')).upsert(scope, 2026, entrada({}))).rejects.toThrow(ALCANCOU_O_REPO);
  });
});

describe('MARCO_LEGAL/FIM_REGIME_CAIXA_SIMPLES — a trava do regime de caixa vem da linha (upsert e copyFrom)', () => {
  const caixa = entrada({ simplesRegimeApuracao: 'CAIXA', ...PRAZOS });
  const origemCaixa = { regime: 'SIMPLES', simplesRegimeApuracao: 'CAIXA', jcpBaseContas: null, ...PRAZOS };

  it('semente (2027-01-01): upsert 2026 CAIXA passa; 2027 CAIXA ⇒ 400 citando a Res. CGSN 190; 2027 COMPETENCIA passa', async () => {
    await expect(servico(SEMENTE).upsert(scope, 2026, caixa)).rejects.toThrow(ALCANCOU_O_REPO);
    await expect(servico(SEMENTE).upsert(scope, 2027, caixa)).rejects.toThrow(/não existe a partir de 2027 \(perfil de 2027\).*Res\. CGSN 190\/2026/);
    await expect(servico(SEMENTE).upsert(scope, 2027, entrada({}))).rejects.toThrow(ALCANCOU_O_REPO);
  });

  it('VIRADA (upsert): marco movido para 2028-01-01 ⇒ 2027 CAIXA passa da trava; marco antecipado para 2026-01-01 ⇒ 2026 CAIXA é recusado', async () => {
    await expect(servico(comMarco('FIM_REGIME_CAIXA_SIMPLES', '2028-01-01')).upsert(scope, 2027, caixa)).rejects.toThrow(ALCANCOU_O_REPO);
    await expect(servico(comMarco('FIM_REGIME_CAIXA_SIMPLES', '2026-01-01')).upsert(scope, 2026, caixa)).rejects.toBeInstanceOf(ValidationError);
  });

  it('semente: copyFrom 2026→2027 de um perfil CAIXA ⇒ 400; 2026→2026 não é recusado pela trava', async () => {
    await expect(servico(SEMENTE, origemCaixa).copyFrom(scope, 2027, 2026)).rejects.toBeInstanceOf(ValidationError);
  });

  it('VIRADA (copyFrom): marco movido para 2028-01-01 ⇒ a cópia de um perfil CAIXA para 2027 passa da trava', async () => {
    await expect(servico(comMarco('FIM_REGIME_CAIXA_SIMPLES', '2028-01-01'), origemCaixa).copyFrom(scope, 2027, 2026)).rejects.toThrow(ALCANCOU_O_REPO);
  });

  it('sem a linha, CAIXA recusa (fail-closed) no upsert e no copyFrom; COMPETENCIA não lê a linha', async () => {
    await expect(servico(semMarco('FIM_REGIME_CAIXA_SIMPLES')).upsert(scope, 2026, caixa)).rejects.toBeInstanceOf(ParametroLegalAusenteError);
    await expect(servico(semMarco('FIM_REGIME_CAIXA_SIMPLES'), origemCaixa).copyFrom(scope, 2027, 2026)).rejects.toBeInstanceOf(ParametroLegalAusenteError);
    await expect(servico(semMarco('FIM_REGIME_CAIXA_SIMPLES')).upsert(scope, 2027, entrada({}))).rejects.toThrow(ALCANCOU_O_REPO);
  });
});

describe('ibsCbsNoDas — o 1º mês do IBS/CBS no DAS vem do marco INICIO_OPCAO_IBS_CBS_DAS', () => {
  const sem = { ibsCbsOpcaoS1: null, ibsCbsOpcaoS2: null };
  it('semente: 2026-12 fora, 2027-01 dentro; opção REGULAR no semestre tira', () => {
    expect([ibsCbsNoDas(sem, '2026-12', SEMENTE), ibsCbsNoDas(sem, '2027-01', SEMENTE)]).toEqual([false, true]);
    expect(ibsCbsNoDas({ ibsCbsOpcaoS1: 'REGULAR', ibsCbsOpcaoS2: null }, '2027-03', SEMENTE)).toBe(false);
  });
  it('VIRADA: marco em 2028-01-01 ⇒ 2027-06 deixa de entrar; marco em 2026-07-01 ⇒ 2026-08 passa a entrar', () => {
    expect(ibsCbsNoDas(sem, '2027-06', comMarco('INICIO_OPCAO_IBS_CBS_DAS', '2028-01-01'))).toBe(false);
    expect(ibsCbsNoDas(sem, '2026-08', comMarco('INICIO_OPCAO_IBS_CBS_DAS', '2026-07-01'))).toBe(true);
  });
  it('sem a linha recusa (PARAMETRO_LEGAL_AUSENTE), não devolve o literal antigo', () => {
    expect(() => ibsCbsNoDas(sem, '2027-06', semMarco('INICIO_OPCAO_IBS_CBS_DAS'))).toThrow(ParametroLegalAusenteError);
  });
});

describe('aliquotasIbsCbsVigentes — o fim do IBS municipal zero vem do marco INICIO_IBS_MUNICIPAL', () => {
  const tabela = tabelaIbsCbsDe(legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS));
  const DIA = '2026-10-27';
  it('semente: 2026 ⇒ IBS municipal 0% (art. 343), como o literal antigo', () => {
    expect(aliquotasIbsCbsVigentes(tabela, DIA, SEMENTE)).toEqual({ pIBSUF: '0.1000', pIBSMun: '0.0000', pCBS: '0.9000' });
  });
  it('VIRADA: marco antecipado para 2026-06-01 ⇒ o dia 2026-10-27 já pede a linha ALIQUOTA_MUN, que não existe (SemLinhaVigenteError), em vez de 0%', () => {
    expect(() => aliquotasIbsCbsVigentes(tabela, DIA, comMarco('INICIO_IBS_MUNICIPAL', '2026-06-01'))).toThrow(SemLinhaVigenteError);
  });
  it('sem a linha do marco recusa (PARAMETRO_LEGAL_AUSENTE)', () => {
    expect(() => aliquotasIbsCbsVigentes(tabela, DIA, semMarco('INICIO_IBS_MUNICIPAL'))).toThrow(ParametroLegalAusenteError);
  });
});

describe('semente v2 de MARCO_LEGAL — os 3 marcos valem o que os literais valiam, têm fonte e passam no formato', () => {
  const v2 = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL_V2);
  it('as 3 linhas são 2027-01-01 (o valor dos literais que saíram)', () => {
    expect(v2.map((l) => l.chave).sort()).toEqual(['FIM_REGIME_CAIXA_SIMPLES', 'INICIO_IBS_MUNICIPAL', 'INICIO_OPCAO_IBS_CBS_DAS']);
    for (const c of ['INICIO_OPCAO_IBS_CBS_DAS', 'FIM_REGIME_CAIXA_SIMPLES', 'INICIO_IBS_MUNICIPAL'] as const) expect(dataDoMarco(SEMENTE, c, '2026-06-01')).toBe('2027-01-01');
  });
  it('fonte cita norma e artigo; PUBLISHED; passa no formato da tabela', () => {
    const por = (c: string) => v2.find((l) => l.chave === c)!;
    expect(por('INICIO_OPCAO_IBS_CBS_DAS').fonte).toMatch(/LC 214\/2025 art\. 517.*art\. 544 III/);
    expect(por('FIM_REGIME_CAIXA_SIMPLES').fonte).toMatch(/Res\. CGSN 190\/2026.*art\. 9º II.*Res\. CGSN 196\/2026/);
    expect(por('INICIO_IBS_MUNICIPAL').fonte).toMatch(/LC 214\/2025 art\. 343.*art\. 344/);
    for (const l of v2) {
      expect(l.status).toBe('PUBLISHED');
      expect(erroDeFormato({ tabela: 'MARCO_LEGAL', chave: l.chave, discriminador: l.discriminador, valorTexto: l.valorTexto })).toBeNull();
    }
  });
  it('a migração carrega exatamente o texto da semente (teste-guarda de igualdade) e é só dado, sem DDL', () => {
    const norm = (t: string) => t.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.join(__dirname, '../../../../../prisma/migrations/20261124130000_legal_parameters_marco_legal_v2/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL_V2, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => !l.startsWith('--') && l.trim() !== '').every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters"'))).toBe(true);
  });
});
