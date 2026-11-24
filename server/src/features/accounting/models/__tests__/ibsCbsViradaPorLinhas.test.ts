/**
 * Onda 3.2 / fatia 3 (auditoria fiscal 24/11/2026; itens #6, #8, #9 da nota de classificação) — a virada de 2026-12-31 para
 * 2027-01-01 acontece TROCANDO LINHAS, sem tocar em código: o início da apuração/crédito de IBS/CBS é a linha
 * `OBRIGACAO_REGIME/IBS_CBS_APURACAO` (regime regular), o fim do PIS/Cofins é a ausência de linha `PIS_COFINS` vigente.
 * Cada teste fixa o mesmo código/mesma entrada e desloca só `vigenteDesde`/`vigenteAte` das linhas da semente.
 */
import { fotografiaSemente } from '@test/helpers/legalParams';
import { ParametroLegalAusenteError, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { creditoIbsCbsEntrada, type ItemEntradaIbsCbs } from '../ibsCbsCredito';
import { antesDoInicioDaApuracaoIbsCbs, exigirInicioApuracaoIbsCbs, inicioApuracaoIbsCbs } from '../ibsCbsParams';
import { exigirLinhaPisCofinsVigente, parametrosDoMes } from '../pisCofinsCalc';
import { tabelaPisCofinsDe } from '../pisCofinsParams';
import { PisCofinsPreviewSchema } from '../../dtos/PisCofinsDto';

const REGULARES = ['PRESUMIDO', 'REAL'];
const marcos = (): LinhaLegal[] => fotografiaSemente(['OBRIGACAO_REGIME']);
/** Desloca o marco das linhas de regime regular (as de Simples/MEI ficam como estão). */
const comMarcoEm = (desde: string): LinhaLegal[] =>
  marcos().map((l) => (l.chave === 'IBS_CBS_APURACAO' && REGULARES.includes(l.discriminador ?? '') ? { ...l, vigenteDesde: desde } : l));

const itens: ItemEntradaIbsCbs[] = [{ nItem: 1, ncm: '33049990', ibsCbs: { vIBSCents: 10n, vCBSCents: 880n } }];
const credito = (linhas: readonly LinhaLegal[], dataEmissao: string) => creditoIbsCbsEntrada({ dataEmissao, regimeRegular: true, itens, linhas });

describe('#6 — início do crédito de IBS/CBS = linha OBRIGACAO_REGIME/IBS_CBS_APURACAO', () => {
  it('a semente publica o marco em 2027-01-01 e a função o lê (LC 214 arts. 41 § 1º e 45 § 6º)', () => {
    expect(inicioApuracaoIbsCbs(marcos())).toBe('2027-01-01');
    expect(credito(marcos(), '2026-12-31')).toMatchObject({ ibsCents: 0, cbsCents: 0 });
    expect(credito(marcos(), '2027-01-01')).toMatchObject({ ibsCents: 10, cbsCents: 880 });
  });

  it('VIRADA: adiar o marco para 2027-03-01 tira o crédito de uma nota de 2027-02-10 — mesmo código, só a linha', () => {
    expect(credito(marcos(), '2027-02-10').cbsCents).toBe(880);
    expect(credito(comMarcoEm('2027-03-01'), '2027-02-10')).toMatchObject({ ibsCents: 0, cbsCents: 0, avisos: [] });
    expect(credito(comMarcoEm('2027-03-01'), '2027-03-01').cbsCents).toBe(880);
  });

  it('VIRADA: antecipar o marco para 2026-07-01 dá crédito a uma nota de 2026-12-31', () => {
    expect(credito(marcos(), '2026-12-31').cbsCents).toBe(0);
    expect(credito(comMarcoEm('2026-07-01'), '2026-12-31').cbsCents).toBe(880);
  });

  it('a linha do Simples/MEI (NAO_SE_APLICA) não define o início — só o regime regular', () => {
    const soSimples = marcos().filter((l) => !REGULARES.includes(l.discriminador ?? ''));
    expect(soSimples.length).toBeGreaterThan(0);
    expect(inicioApuracaoIbsCbs(soSimples)).toBeNull();
    const antecipaSimples = marcos().map((l) => (REGULARES.includes(l.discriminador ?? '') ? l : { ...l, vigenteDesde: '2020-01-01' }));
    expect(inicioApuracaoIbsCbs(antecipaSimples)).toBe('2027-01-01');
  });

  it('rascunho não define marco; linha substituída cede à substituta (só `linhasEmVigor`)', () => {
    const real = marcos().find((l) => l.chave === 'IBS_CBS_APURACAO' && l.discriminador === 'REAL')!;
    const draft: LinhaLegal = { ...real, id: 'rascunho', status: 'DRAFT', vigenteDesde: '2026-01-01' };
    expect(inicioApuracaoIbsCbs([...marcos(), draft])).toBe('2027-01-01');
    const substituta: LinhaLegal = { ...real, id: 'nova', vigenteDesde: '2028-01-01', supersedesId: real.id };
    const soReal = marcos().filter((l) => l.chave === 'IBS_CBS_APURACAO' && l.discriminador === 'REAL');
    expect(inicioApuracaoIbsCbs([...soReal, substituta])).toBe('2028-01-01');
  });

  it('sem linha do marco ⇒ fail-closed: nenhum crédito + aviso (nunca o 2027 em código); a recusa nomeia a tabela', () => {
    const r = credito([], '2027-02-10');
    expect(r).toMatchObject({ ibsCents: 0, cbsCents: 0 });
    expect(r.avisos[0]).toMatch(/OBRIGACAO_REGIME\/IBS_CBS_APURACAO.*sem linha publicada/);
    expect(() => exigirInicioApuracaoIbsCbs([], '2027-02-10')).toThrow(ParametroLegalAusenteError);
  });

  it('regime fora do regular nem consulta o marco (sem aviso quando o optante do Simples não tem linha)', () => {
    expect(creditoIbsCbsEntrada({ dataEmissao: '2027-02-10', regimeRegular: false, itens, linhas: [] })).toMatchObject({ ibsCents: 0, avisos: [] });
  });
});

describe('#8 — competência de IBS/CBS antes do início da apuração (400 do serviço, não do DTO)', () => {
  it('semente: 2026-12 recusa, 2027-01 passa; o mês do marco é o primeiro apurável', () => {
    expect(antesDoInicioDaApuracaoIbsCbs(marcos(), '2026-12')).toBe(true);
    expect(antesDoInicioDaApuracaoIbsCbs(marcos(), '2027-01')).toBe(false);
  });

  it('VIRADA: marco em 2027-03-01 ⇒ 2027-01 e 2027-02 recusam; marco em 2026-07-01 ⇒ 2026-12 passa', () => {
    expect(antesDoInicioDaApuracaoIbsCbs(comMarcoEm('2027-03-01'), '2027-02')).toBe(true);
    expect(antesDoInicioDaApuracaoIbsCbs(comMarcoEm('2027-03-01'), '2027-03')).toBe(false);
    expect(antesDoInicioDaApuracaoIbsCbs(comMarcoEm('2026-07-01'), '2026-12')).toBe(false);
  });

  it('sem linha do marco ⇒ 400 PARAMETRO_LEGAL_AUSENTE (fail-closed), não "passa"', () => {
    expect(() => antesDoInicioDaApuracaoIbsCbs([], '2027-05')).toThrow(ParametroLegalAusenteError);
  });
});

describe('#9 — fim do PIS/Cofins = ausência de linha PIS_COFINS vigente (não `max(2026)` no DTO)', () => {
  const base = { unitId: 'u1', periodo: 'M03' };
  const linhasPis = (): LinhaLegal[] => fotografiaSemente(['PIS_COFINS', 'CODIGO_RECEITA']);
  const estendidoAte2027 = (): LinhaLegal[] => linhasPis().map((l) => (l.vigenteAte === '2026-12-31' ? { ...l, vigenteAte: '2027-12-31' } : l));

  it('o schema do DTO não recusa mais 2027 (a recusa é do serviço, pelas linhas)', () => {
    expect(PisCofinsPreviewSchema.safeParse({ ...base, anoCalendario: 2027 }).success).toBe(true);
    expect(PisCofinsPreviewSchema.safeParse({ ...base, anoCalendario: 2024 }).success).toBe(false); // o piso (2025) segue no DTO
  });

  it('semente: 2026 apura, 2027 ⇒ 400 nomeado da revogação, citando a `fonte` da linha', () => {
    const tabela = tabelaPisCofinsDe(linhasPis());
    expect(parametrosDoMes(tabela, 2026, 'M03', 'CUMULATIVO').PIS).toBeDefined();
    expect(() => parametrosDoMes(tabela, 2027, 'M03', 'CUMULATIVO')).toThrow(/PIS\/Cofins revogados a partir de 2027-01 \(fonte da linha: IN RFB 2\.121\/2022/);
  });

  it('VIRADA: estender o vigenteAte das linhas para 2027-12-31 faz 2027 apurar — mesmo código, só a linha', () => {
    const tabela = tabelaPisCofinsDe(estendidoAte2027());
    expect(parametrosDoMes(tabela, 2027, 'M03', 'CUMULATIVO').PIS).toBeDefined();
    expect(() => parametrosDoMes(tabela, 2028, 'M03', 'CUMULATIVO')).toThrow(/revogados/);
  });

  it('VIRADA da MENSAGEM: o mês/ano da revogação sai do `vigenteAte` da linha, não de "2027-01" em código', () => {
    const msg = (linhas: readonly LinhaLegal[], ano: number) => {
      try {
        parametrosDoMes(tabelaPisCofinsDe(linhas), ano, 'M03', 'CUMULATIVO');
      } catch (e) {
        return (e as Error).message;
      }
      return null;
    };
    expect(msg(linhasPis(), 2027)).toMatch(/revogados a partir de 2027-01 \(/);
    expect(msg(estendidoAte2027(), 2028)).toMatch(/revogados a partir de 2028-01 \(/);
    expect(msg(estendidoAte2027(), 2028)).not.toMatch(/2027-01/);
    // fim no meio do mês ⇒ a data exata (dia seguinte), não um mês inteiro inventado
    const meio = linhasPis().map((l) => (l.vigenteAte === '2026-12-31' ? { ...l, vigenteAte: '2027-02-14' } : l));
    expect(msg(meio, 2027)).toMatch(/revogados a partir de 2027-02-15 \(/);
  });

  it('a CITAÇÃO da mensagem sai do campo `fonte` da linha que marca o fim — não de "LC 214/2025 art. 542" em código (ressalva do #1361)', () => {
    const msg = (linhas: readonly LinhaLegal[], ano: number) => {
      try {
        parametrosDoMes(tabelaPisCofinsDe(linhas), ano, 'M03', 'CUMULATIVO');
      } catch (e) {
        return (e as Error).message;
      }
      return null;
    };
    const FONTE_NOVA = 'Fonte de teste X — art. 999 (linha publicada pelo dono)';
    const comFonte = linhasPis().map((l) => ({ ...l, fonte: FONTE_NOVA }));
    expect(msg(comFonte, 2027)).toContain(FONTE_NOVA);
    expect(msg(comFonte, 2027)).not.toContain('art. 542');
    // estendida até 2027-12-31 com outra fonte: a mensagem de 2028 cita a fonte da linha estendida, não a da revogação original
    const estendida = comFonte.map((l) => (l.vigenteAte === '2026-12-31' ? { ...l, vigenteAte: '2027-12-31', fonte: 'Fonte da linha estendida — art. 1' } : l));
    expect(msg(estendida, 2028)).toContain('Fonte da linha estendida — art. 1');
    expect(msg(estendida, 2028)).not.toMatch(/art\. 542|art\. 544/);
  });

  it('sem NENHUMA linha vencida (tabela vazia) a mensagem não afirma revogação: diz que falta a linha', () => {
    expect(() => parametrosDoMes([], 2027, 'M03', 'CUMULATIVO')).toThrow(/sem linha PIS_COFINS vigente em 2027-03-31/);
  });

  it('exigirLinhaPisCofinsVigente (antes do perfil, sem modalidade): semente aceita 2026 e recusa 2027; estender a linha move a recusa', () => {
    const tabela = tabelaPisCofinsDe(linhasPis());
    expect(() => exigirLinhaPisCofinsVigente(tabela, 2026, 'M12')).not.toThrow();
    expect(() => exigirLinhaPisCofinsVigente(tabela, 2027, 'M01')).toThrow(/revogados a partir de 2027-01 \(fonte da linha: IN RFB 2\.121\/2022/);
    const estendida = tabelaPisCofinsDe(estendidoAte2027());
    expect(() => exigirLinhaPisCofinsVigente(estendida, 2027, 'M12')).not.toThrow();
    expect(() => exigirLinhaPisCofinsVigente(estendida, 2028, 'M01')).toThrow(/revogados a partir de 2028-01/);
  });
});
