/**
 * Lacuna 84ad (ressalva do #1361; dono, chat, 24/11/2026: "republicar as 4 linhas PIS_COFINS com a fonte da LC 214").
 * As quatro linhas semeadas (`lp1-pc-*`) citavam só a IN RFB 2.121/2022 (a alíquota); com a mensagem de 2027 lendo a `fonte`
 * da linha, o 400 apontava a IN como se ela revogasse. A correção é DADO: quatro linhas novas (`lp-pc-lc214-*`) que substituem
 * as antigas (L-7), mesma alíquota/código/vigência, `fonte` com a LC 214 art. 542 e o efeito do art. 544 III. Sem campo novo,
 * sem DDL, sem editar a migração já aplicada (`20261007150000`).
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE, LEGAL_PARAMS_SEED_FILE_PIS_COFINS_FONTE, legalParamsSeedRows } from '@test/helpers/legalParams';
import { createFormatRegistry, type LinhaParaFormato } from '../models/formatRegistry';
import { ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS } from '../../accounting/paises/br/legalParameters';
import { DP_BR_LEGAL_PARAMETER_FORMATS } from '../../dp/paises/br/legalParameters';
import { linhasEmVigor } from '../models/legalParameter';

// PAIS-NA-BORDA-F3 item 8: a mesma regra de antes, agora declarada pela borda (contabilidade BR + DP BR).
const erroDeFormato = createFormatRegistry([...ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS, ...DP_BR_LEGAL_PARAMETER_FORMATS]).formatError;

const MIGRATION = path.resolve(__dirname, '../../../../prisma/migrations/20261125120000_legal_parameters_pis_cofins_fonte_lc214/migration.sql');
const norm = (s: string) => s.replace(/\r\n/g, '\n');

describe('lacuna 84ad — PIS_COFINS republicado com a fonte da LC 214', () => {
  const novas = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_PIS_COFINS_FONTE);
  const antigas = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE).filter((r) => r.tabela === 'PIS_COFINS');

  it('o migration.sql carrega o texto de prisma/data/legal_parameters_pis_cofins_fonte_v1.sql, byte a byte, e só insere', () => {
    const mig = norm(fs.readFileSync(MIGRATION, 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_PIS_COFINS_FONTE, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('4 linhas, cada uma substitui uma lp1-pc-* e só muda a fonte (e a prova dela): alíquota, código, vigência e status iguais', () => {
    expect(antigas).toHaveLength(4);
    expect(novas).toHaveLength(4);
    for (const n of novas) {
      const a = antigas.find((x) => x.id === n.supersedesId);
      expect(a).toBeDefined();
      expect([n.tabela, n.chave, n.discriminador, n.valorInt, n.vigenteDesde, n.vigenteAte, n.status]).toEqual([a!.tabela, a!.chave, a!.discriminador, a!.valorInt, a!.vigenteDesde, a!.vigenteAte, a!.status]);
      expect(n.fonte.startsWith(a!.fonte)).toBe(true); // a fonte da IN/leis da alíquota continua; a LC 214 é acrescentada
      expect(n.fonte).toContain('LC 214/2025 art. 542');
      expect(n.fonte).toContain('art. 544 III');
      expect(n.fonteUrl).toBe('https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm');
      expect(n.fonteSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(erroDeFormato({ ...n, valorJson: undefined } as LinhaParaFormato)).toBeNull();
    }
    expect(new Set(novas.map((n) => n.supersedesId)).size).toBe(4); // uma substituta por linha antiga
  });

  it('em vigor ficam as 4 novas e nenhuma das antigas (a fotografia do serviço não mostra a substituída)', () => {
    const emVigor = linhasEmVigor([...antigas, ...novas]);
    expect(emVigor.map((l) => l.id).sort()).toEqual(novas.map((n) => n.id).sort());
  });
});
