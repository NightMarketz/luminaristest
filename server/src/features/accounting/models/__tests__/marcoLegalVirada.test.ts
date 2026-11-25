/**
 * Onda 3.2, fatia 4 (auditoria 24/11/2026; dono: tabela `MARCO_LEGAL`) — o marco "a redação da LC 214 sobre o RBT12 vale
 * desde 2027" deixou de ser o literal `INICIO_LC214` de `simplesCalc.ts`: é a linha `MARCO_LEGAL/INICIO_LC214_RBT12`
 * (valorTexto = 2027-01-01). PROVA: o cálculo do Simples (janela e valor do RBT12) muda trocando SÓ essa linha, sem tocar
 * código; sem a linha o cálculo recusa (fail-closed). O marco `PRINCIPAL_ACESSORIO_DESDE` (otimização) NÃO migra nesta
 * fatia: nenhum artigo da LC 214 fixa 2027 para o art. 7º (efeitos em 2026 pelo art. 544 VI) — ver `taxOptimization.ts`.
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL, SIMPLES_SEED_FILES, legalParamsSeedRows } from '@test/helpers/legalParams';
import { ParametroLegalAusenteError, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import { apurar, type ApuracaoInput, type MesReceita } from '../simplesCalc';
import { dataDoMarco, inicioLc214Competencia } from '../marcoLegal';

const SEMENTE: LinhaLegal[] = legalParamsSeedRows([...SIMPLES_SEED_FILES, LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL]);
/** A mesma fotografia, só com o `valorTexto` da linha do marco trocado — a "virada" é publicar linha, não editar código. */
const comMarco = (data: string): LinhaLegal[] => SEMENTE.map((l) => (l.tabela === 'MARCO_LEGAL' && l.chave === 'INICIO_LC214_RBT12' ? { ...l, valorTexto: data } : l));
const semMarco = (): LinhaLegal[] => SEMENTE.filter((l) => l.tabela !== 'MARCO_LEGAL');

/**
 * PA 2027-03, histórico de 2026-02 a 2027-02. O mês −13 (2026-02) vale R$ 10.000 e o mês −1 (2027-02) vale R$ 90.000, os
 * outros R$ 50.000 — assim as duas janelas dão RBT12 DIFERENTES (não só o rótulo da regra).
 */
const historico: MesReceita[] = [
  { competencia: '2026-02', receitaBrutaCents: 1_000_000, folhaCents: null },
  ...['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'].map((competencia) => ({ competencia, receitaBrutaCents: 5_000_000, folhaCents: null })),
  { competencia: '2027-02', receitaBrutaCents: 9_000_000, folhaCents: null },
];
const entrada = (over: Partial<ApuracaoInput> = {}): ApuracaoInput => ({
  competencia: '2027-03',
  historico,
  inicioAtividade: null,
  receitaPaCents: 0,
  folhaPaCents: 0,
  sublimiteExcedido: false,
  atividades: [{ natureza: 'SERVICO', cTribNac: '060101', parcelas: [{ receitaCents: 5_000_000, excluir: [] }] }],
  ...over,
});

describe('MARCO_LEGAL/INICIO_LC214_RBT12 — o marco do RBT12 da LC 214 vem da linha (Onda 3.2 fatia 4)', () => {
  it('a semente publica o marco em 2027-01-01 e o lookup devolve a data e a competência', () => {
    expect(dataDoMarco(SEMENTE, 'INICIO_LC214_RBT12', '2027-03-01')).toBe('2027-01-01');
    expect(inicioLc214Competencia(SEMENTE, '2027-03-01')).toBe('2027-01');
  });

  it('com a semente (2027-01) o PA 2027-03 usa a janela da LC 214 (2026-02..2027-01): RBT12 = R$ 560.000', () => {
    const r = apurar(entrada(), SEMENTE);
    expect(r.janelaRbt12).toEqual({ de: '2026-02', ate: '2027-01', regra: 'LC214-art517' });
    expect(r.rbt12Cents).toBe(56_000_000);
  });

  it('VIRADA por dado: marco movido para 2028-01 ⇒ o mesmo PA usa a janela antiga (2026-03..2027-02) e o RBT12 muda para R$ 640.000', () => {
    const r = apurar(entrada(), comMarco('2028-01-01'));
    expect(r.janelaRbt12).toEqual({ de: '2026-03', ate: '2027-02', regra: 'LC123-art18-§1' });
    expect(r.rbt12Cents).toBe(64_000_000);
  });

  it('VIRADA por dado no outro sentido: marco antecipado para 2026-12 ⇒ o PA 2026-12 já usa a janela da LC 214', () => {
    const h = historico.filter((m) => m.competencia < '2026-12');
    const sem = apurar(entrada({ competencia: '2026-12', historico: h }), SEMENTE);
    const com = apurar(entrada({ competencia: '2026-12', historico: h }), comMarco('2026-12-01'));
    expect(sem.janelaRbt12?.regra).toBe('LC123-art18-§1');
    expect(com.janelaRbt12).toEqual({ de: '2025-11', ate: '2026-10', regra: 'LC214-art517' });
  });

  it('proveniência: a linha do marco entra em `tabela` (→ tabelaVersao), e trocar o marco troca o id lido', () => {
    const marco = SEMENTE.find((l) => l.tabela === 'MARCO_LEGAL')!;
    expect(apurar(entrada(), SEMENTE).tabela.map((t) => t.legalParameterId)).toContain(marco.id);
    const nova: LinhaLegal = { ...marco, id: 'lp-marco-lc214-rbt12-v2', valorTexto: '2028-01-01', supersedesId: marco.id };
    const ids = apurar(entrada(), [...SEMENTE, nova]).tabela.map((t) => t.legalParameterId);
    expect(ids).toContain(nova.id);
    expect(ids).not.toContain(marco.id);
  });

  it('sem a linha do marco o cálculo recusa (fail-closed): PARAMETRO_LEGAL_AUSENTE, nunca um default em código', () => {
    expect(() => apurar(entrada(), semMarco())).toThrow(ParametroLegalAusenteError);
    expect(() => apurar(entrada(), semMarco())).toThrow(/MARCO_LEGAL\/INICIO_LC214_RBT12/);
  });

  it('linha DRAFT ou revogada não define marco (só `linhasEmVigor`)', () => {
    const rascunho = SEMENTE.map((l) => (l.tabela === 'MARCO_LEGAL' ? { ...l, status: 'DRAFT' } : l));
    expect(() => apurar(entrada(), rascunho)).toThrow(ParametroLegalAusenteError);
  });

  it('uma linha nova que SUBSTITUI a do marco vale no lugar dela (publicar = virar)', () => {
    const antiga = SEMENTE.find((l) => l.tabela === 'MARCO_LEGAL')!;
    const nova: LinhaLegal = { ...antiga, id: 'lp-marco-lc214-rbt12-v2', valorTexto: '2028-01-01', supersedesId: antiga.id };
    expect(inicioLc214Competencia([...SEMENTE, nova], '2027-03-01')).toBe('2028-01');
  });

  it('a migração carrega exatamente o texto da semente (teste-guarda de igualdade) e é só dado, sem DDL', () => {
    const norm = (t: string) => t.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.join(__dirname, '../../../../../prisma/migrations/20261124120000_legal_parameters_marco_legal/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => !l.startsWith('--') && l.trim() !== '').every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters"'))).toBe(true);
  });

  it('a linha da semente tem fonte (norma + artigo), URL oficial do Planalto e passa no formato', () => {
    const l = SEMENTE.find((x) => x.tabela === 'MARCO_LEGAL')!;
    expect(l.fonte).toMatch(/LC 214\/2025 art\. 517.*art\. 544 III/);
    expect(l.status).toBe('PUBLISHED');
    expect(erroDeFormato({ tabela: 'MARCO_LEGAL', chave: l.chave, discriminador: l.discriminador, valorTexto: l.valorTexto })).toBeNull();
  });

  it('o formato da linha só aceita marco conhecido, sem discriminador, com data de calendário válida', () => {
    const base = { tabela: 'MARCO_LEGAL' as const, chave: 'INICIO_LC214_RBT12', valorTexto: '2027-01-01' };
    expect(erroDeFormato(base)).toBeNull();
    expect(erroDeFormato({ ...base, chave: 'OUTRO_MARCO' })).not.toBeNull();
    expect(erroDeFormato({ ...base, discriminador: 'X' })).not.toBeNull();
    expect(erroDeFormato({ ...base, valorTexto: '2027-02-30' })).not.toBeNull();
    expect(erroDeFormato({ ...base, valorTexto: '2027-01' })).not.toBeNull();
  });

  it('o cálculo e o serviço não repetem a data do marco em literal (a fonte única é a linha)', () => {
    const lerCodigo = (rel: string) =>
      fs.readFileSync(path.join(__dirname, rel), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(lerCodigo('../simplesCalc.ts')).not.toMatch(/INICIO_LC214\b|['"]2027-01['"]/);
    // O 2% do mês seguinte (Res. CGSN 190/2026) é outro marco, com fonte própria, e segue em constante nomeada do serviço.
    expect(lerCodigo('../../services/SimplesApuracaoService.ts')).not.toMatch(/INICIO_LC214\b/);
  });
});
