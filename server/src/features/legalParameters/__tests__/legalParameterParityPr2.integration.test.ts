/**
 * BE-INCR-LEGAL-PARAMS PR-2 — teste de PARIDADE do item 6 para as tabelas do PR-2: o lookup antigo (as tabelas em
 * código, CONGELADAS em `__fixtures__/tabelas-antigas-pr2.json`, geradas dos módulos de `origin/main` b4757575 antes de
 * saírem) e o novo (banco semeado pela migração → serviço → fotografia → adaptador) devolvem o mesmo valor E a mesma
 * fonte em toda chave, nas datas apuráveis de 2025–2027. Antes de 2025-01-01 as tabelas sem vigência em código não têm
 * linha (emenda §9 L-10): o lookup novo é erro explícito, nunca lista vazia — asserido aqui como borda.
 */
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import antigas from './__fixtures__/tabelas-antigas-pr2.json';
import { SemLinhaVigenteError, type LegalParameterTabela, type LinhaLegal } from '../models/legalParameter';
import { tabelaApuracaoDe } from '@/features/accounting/models/taxAssessmentParams';
import { razaoCreditoPisCofins, tabelaPisCofinsDe } from '@/features/accounting/models/pisCofinsParams';
import { findMonofasicoRule, tabelaPisCofinsItemDe, type MonofasicoNcmRule } from '@/features/accounting/models/pisCofinsMonofasicoNcm';
import { cfopsImobilizadoDe } from '@/features/accounting/models/itemDestination';
import { matrizObrigacoesDe } from '@/features/accounting/models/obrigacoesPorRegime';
import { listaLc116De } from '@/features/accounting/models/lc116ListaNacional';
import { issAliquotaMaxBp } from '@/features/accounting/models/issLimite';
import { resolveEcdCodVerLc } from '@/lib/sped';
import { resolveEcfCodVer } from '@/lib/ecf';
import { isNationalHoliday } from '@/features/packages/models/validity';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '@/features/accounting/models/dates';
import type { NomeCodigoReceita } from '../models/formatoLinha';

const fimDoMes = (ano: number, m: number): string => new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);
/** Datas apuráveis (o 1º ano apurável é 2025): fim de cada mês 2025–2027 + o 1º dia da vigência L-10. */
const DATAS = ['2025-01-01', ...[2025, 2026, 2027].flatMap((a) => Array.from({ length: 12 }, (_, i) => fimDoMes(a, i + 1)))];
const VESPERA = '2024-12-31';

let fot: LinhaLegal[];
const tabelas = async (ts: LegalParameterTabela[]) => getFactory().getLegalParameterService().fotografia(ts);

describe('BE-INCR-LEGAL-PARAMS PR-2 item 6 — paridade tabela em código × banco', () => {
  // Síncrono à parte: o build a frio do banco-modelo (db push) bloqueia o loop por mais de 5 s e, dentro do hook
  // async, estourava o timeout quando esta suíte é a primeira do shard (molde de legalParameterParity).
  beforeAll(() => pushTestSchema());
  beforeAll(async () => {
    await resetDb();
    fot = await tabelas(['CODIGO_RECEITA', 'PIS_COFINS', 'PIS_COFINS_MONOFASICO_NCM', 'CST_PIS_COFINS', 'CFOP_IMOBILIZADO', 'NFE_CSTAT_AUTORIZADA', 'OBRIGACAO_REGIME', 'LC116_SERVICO', 'ISS_LIMITE', 'LEIAUTE_SPED', 'FERIADO_NACIONAL']);
  });
  afterAll(() => disconnectDb());

  it('CODIGO_RECEITA (itens 9/14): IRPJ/CSLL com mesmo código e fonte em toda data; PIS/Cofins presos à vigência da alíquota', () => {
    const t = tabelaApuracaoDe(fot);
    for (const [nome, codigo] of Object.entries(antigas.CODIGOS_RECEITA)) {
      for (const d of DATAS) expect([nome, d, t.codigoReceita(nome as NomeCodigoReceita, d)]).toEqual([nome, d, { codigo, fonte: antigas.CODIGOS_RECEITA_FONTE }]);
      expect(() => t.codigoReceita(nome as NomeCodigoReceita, VESPERA)).toThrow(SemLinhaVigenteError);
    }
    const pc = tabelaPisCofinsDe(fot);
    for (const [k, codigo] of Object.entries(antigas.CODIGOS_RECEITA_PIS_COFINS)) {
      const [tributo, modalidade] = k.split('|');
      expect(pc.find((p) => p.tributo === tributo && p.modalidade === modalidade)?.codigoReceita).toBe(codigo);
    }
  });

  it('item 13 — razão do crédito (PIS_CREDIT_BP/COFINS_CREDIT_BP) = PIS_COFINS não cumulativo em toda data até a revogação', () => {
    for (const d of DATAS.filter((x) => x <= '2026-12-31')) {
      expect(razaoCreditoPisCofins(fot, d)).toEqual({ pisBp: antigas.PIS_CREDIT_BP, cofinsBp: antigas.COFINS_CREDIT_BP });
    }
  });

  it('PIS_COFINS_MONOFASICO_NCM + CST_PIS_COFINS (itens 15–16): mesma regra (fonte) para todo NCM de borda de cada prefixo, na mesma ordem', () => {
    const velhas = antigas.PIS_COFINS_MONOFASICO_NCM as MonofasicoNcmRule[];
    const ncms = new Set<string>();
    for (const r of velhas) {
      ncms.add(r.prefixo.padEnd(8, '0'));
      ncms.add(r.prefixo.padEnd(8, '9'));
      for (const ex of r.exceto ?? []) ncms.add(ex);
    }
    for (const d of DATAS) {
      const t = tabelaPisCofinsItemDe(fot, d);
      expect(t.regras).toEqual(velhas);
      for (const ncm of ncms) expect([ncm, findMonofasicoRule(ncm, t.regras)?.fonte]).toEqual([ncm, findMonofasicoRule(ncm, velhas)?.fonte]);
      expect([[...t.cstSemCredito].sort(), [...t.cstTributado].sort()]).toEqual([antigas.CST_SEM_CREDITO, antigas.CST_TRIBUTADO]);
    }
    expect(() => tabelaPisCofinsItemDe(fot, VESPERA)).toThrow(SemLinhaVigenteError);
  });

  it('CFOP_IMOBILIZADO e NFE_CSTAT_AUTORIZADA (itens 17–18): mesmos conjuntos em toda data', () => {
    for (const d of DATAS) {
      expect([...cfopsImobilizadoDe(fot, d)].sort()).toEqual(antigas.FIXED_ASSET_CFOPS);
      expect(fot.filter((l) => l.tabela === 'NFE_CSTAT_AUTORIZADA' && l.vigenteDesde <= d).map((l) => l.chave).sort()).toEqual(antigas.AUTHORIZED_CSTAT);
    }
    expect(() => cfopsImobilizadoDe(fot, VESPERA)).toThrow(SemLinhaVigenteError);
  });

  it('OBRIGACAO_REGIME (item 20): a matriz inteira, na mesma ordem, com a vigência do código', () => {
    // X14 PR-3 (item 22) acrescentou PGDAS_D/DEFIS/LIVRO_CAIXA/DASN_SIMEI com fonte própria: a paridade é das linhas copiadas.
    const copiadas = new Set(['ECD', 'ECF', 'DCTFWEB']);
    for (const d of DATAS) expect(matrizObrigacoesDe(fot, d).filter((l) => copiadas.has(l.obrigacao))).toEqual(antigas.OBRIGACOES_POR_REGIME);
  });

  it('LC116_SERVICO (item 21): a lista inteira (código, linha, descrição, li, grupo), na mesma ordem', () => {
    for (const d of DATAS) expect([...listaLc116De(fot, d).values()]).toEqual(antigas.LC116_LISTA_NACIONAL);
    expect(antigas.LC116_LISTA_NACIONAL).toHaveLength(337);
  });

  it('ISS_LIMITE e LEIAUTE_SPED (itens 22, 24–25): 500 bp; ECD 9.00; ECF 2025 = 0012 e ano sem linha segue erro', () => {
    for (const d of DATAS) {
      expect(issAliquotaMaxBp(fot, d)).toBe(antigas.ISS_MAX_BP);
      expect(resolveEcdCodVerLc(fot, d)).toBe(antigas.SPED_LAYOUT_VERSION);
    }
    for (const ano of [2024, 2025, 2026, 2027]) {
      const velho = (antigas.ECF_COD_VER_BY_YEAR as Record<string, string>)[String(ano)];
      if (velho) expect(resolveEcfCodVer(ano, fot)).toBe(velho);
      else expect(() => resolveEcfCodVer(ano, fot)).toThrow(/ECF_COD_VER desconhecido/);
    }
  });

  it('FERIADO_NACIONAL (item 26): mesmo resultado que a função em código (lista fixa + 20/11 desde 2024 + eleição) em TODO dia de 2025–2027', () => {
    // A função antiga, congelada (git show b4757575:server/src/features/packages/models/validity.ts).
    const eleicao = (d: string): boolean => {
      const [y, m, dd] = d.split('-').map(Number);
      return y % 2 === 0 && m === 10 && new Date(Date.UTC(y, m - 1, dd)).getUTCDay() === 0 && (dd <= 7 || dd >= 25);
    };
    const velho = (d: string): boolean =>
      antigas.FIXED_NATIONAL_HOLIDAYS.includes(d.slice(5)) || (d.slice(5) === '11-20' && Number(d.slice(0, 4)) >= antigas.ZUMBI_FROM_YEAR) || eleicao(d);
    const feriados = fot.filter((l) => l.tabela === 'FERIADO_NACIONAL');
    let dias = 0;
    for (let n = dayNumberFromDateOnly('2025-01-01'); n <= dayNumberFromDateOnly('2027-12-31'); n++, dias++) {
      const d = dateOnlyFromDayNumber(n);
      expect([d, isNationalHoliday(d, feriados)]).toEqual([d, velho(d)]);
    }
    expect(dias).toBe(365 * 3);
  });
});
