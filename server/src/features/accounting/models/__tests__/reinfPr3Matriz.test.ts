/**
 * BE-INCR-EFD-REINF PR-3 (BRIEF item 20; invariante 11; PRE-ADR D7) — a matriz OBRIGACAO_REGIME ganha REINF. Puro, sem banco:
 * a semente é o mesmo texto da migração. Fonte: IN RFB 2.043/2021 arts. 3º I e VIII, § 1º I e 4º (Sijut, visão vigente, lida em
 * 28/10; cédula D-2026-10-28-EFD-REINF-PR3-LACUNAS).
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_REINF, legalParamsSeedRows } from '@test/helpers/legalParams';
import { matrizObrigacoesDe, ORDEM_OBRIGACOES, resolverObrigacoes } from '../obrigacoesPorRegime';
import { ObrigacaoRegimeJson } from '../../../legalParameters/models/formatoLinha';

const pr3 = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_REINF);
const todas = legalParamsSeedRows();
const REGIMES = ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL'] as const;
const condicoes = { aporteInvestidorAnjo: null, livroCaixaSemEscrituracao: null, distribuicaoAcimaBase: null };
const reinf = (regime: (typeof REGIMES)[number], data: string, inativa = false) =>
  resolverObrigacoes({ regime, inativa, condicoes }, matrizObrigacoesDe(todas, data)).find((o) => o.obrigacao === 'REINF');

describe('semente do EFD-REINF PR-3', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_reinf_v1.sql e só insere', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261028120000_legal_parameters_reinf_pr3/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_REINF, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
    expect(pr3.map((l) => [l.tabela, l.chave, l.discriminador, l.status, l.vigenteDesde])).toEqual(
      REGIMES.map((r) => ['OBRIGACAO_REGIME', 'REINF', r, 'PUBLISHED', '2025-01-01']),
    );
  });

  it('o valorJson de cada linha obedece ao formato da tabela', () => {
    for (const l of pr3) expect([l.id, ObrigacaoRegimeJson.safeParse(JSON.parse(l.valorJson ?? '')).success]).toEqual([l.id, true]);
  });
});

describe('item 20 — REINF na matriz', () => {
  it.each(REGIMES)('%s: CONDICIONAL com a pergunta do mês (arts. 3º I e VIII, § 1º I)', (regime) => {
    expect(reinf(regime, '2026-03-01')).toEqual({
      obrigacao: 'REINF',
      status: 'CONDICIONAL',
      fonte: expect.stringContaining('art. 3º I e VIII, § 1º I'),
      perguntaPendente: 'Houve retenção de IR/CSRF, pagamento de dividendos/JCP ou contratação de cessão de mão de obra no mês?',
    });
  });

  it.each(REGIMES)('%s inativa: NAO_SE_APLICA (art. 4º, sem fato ⇒ dispensada)', (regime) => {
    expect(reinf(regime, '2026-03-01', true)).toEqual({ obrigacao: 'REINF', status: 'NAO_SE_APLICA', fonte: expect.stringContaining('art. 4º') });
  });

  it('vigente desde os fatos de 01/01/2025 (§ 1º I): sem linha em 2024', () => {
    expect(reinf('REAL', '2024-12-31')).toBeUndefined();
    expect(reinf('REAL', '2025-01-01')?.status).toBe('CONDICIONAL');
  });

  it('vai no fim da ordem da matriz', () => {
    expect(ORDEM_OBRIGACOES[ORDEM_OBRIGACOES.length - 1]).toBe('REINF');
    const real = resolverObrigacoes({ regime: 'REAL', inativa: false, condicoes }, matrizObrigacoesDe(todas, '2027-01-01'));
    expect(real.map((o) => o.obrigacao).slice(-2)).toEqual(['IBS_CBS_APURACAO', 'REINF']);
  });
});
