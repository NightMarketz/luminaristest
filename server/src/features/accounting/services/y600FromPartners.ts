import type { Partner } from 'generated/prisma';
import { ValidationError } from '../../../lib/errors';
import { ordenarY600, type Y600Candidate, type Y600Row } from '../../../lib/ecf';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IPartnerRepository } from '../repositories/IPartnerRepository';
import type { DirigenteEcfDto, SocioEcfDto } from '../dtos/SpedEcfDto';

/** O que a ECF lê do cadastro de sócios (IRRF-DISTRIBUICAO PR-1) — só a listagem. */
export type Y600PartnerReader = Pick<IPartnerRepository, 'list'>;

/**
 * REGRA_Y600_QUALIF (Erro, Manual ECF L12 p. 574): QUALIF aceito por residência × tipo de pessoa.
 * Brasil+PF {01,02,09..17}; Brasil+PJ {03,04}; exterior+PF {05,06,14}; exterior+PJ {07,08}.
 */
const QUALIF_POR_CASO: Record<'BR_PF' | 'BR_PJ' | 'EX_PF' | 'EX_PJ', readonly string[]> = {
  BR_PF: ['01', '02', '09', '10', '11', '12', '13', '14', '15', '16', '17'],
  BR_PJ: ['03', '04'],
  EX_PF: ['05', '06', '14'],
  EX_PJ: ['07', '08'],
};

/** QUALIF_REP_LEG para representado PJ (p. 573): só 01 (procurador) ou 06 (outro). */
const QUALIF_REP_LEG_PJ = ['01', '06'];

const nextDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * BE-INCR-ECF-Y600 itens 8–11 (+ ordem e limites do item 3) — UM lugar só, usado pelo Presumido e pelo Real
 * (item 13, F-Y600-1 → a). Cruza o complemento do request com as vigências do cadastro `Partner` e devolve as
 * linhas do Y600 já ordenadas. Toda incoerência é 400; nada do request é aceito e ignorado (item 9).
 *
 *  - Item 8: vigências vivas que cruzam o ano (`entradaEm ≤ DT_FIN` e `saidaEm` nulo ou `≥ DT_INI`).
 *  - Item 10 (F-Y600-4): uma ocorrência por vigência; `DT_ALT_SOC = entradaEm` (p. 571); `DT_FIM_SOC = saidaEm` só
 *    na saída de fato — `saidaEm` no ano e nenhuma vigência viva do mesmo `taxId` começando no dia seguinte (mudança
 *    de participação não é saída, p. 570 regra 2).
 *  - Item 11 (F-Y600-7): nenhuma ocorrência ⇒ 400 `ECF_Y600_SEM_SOCIOS`. Soma ≠ 100% não bloqueia (F-Y600-8).
 *  - Mensagens de erro citam `partnerId`, nunca nome nem CPF/CNPJ (PII).
 */
export async function montarY600(
  partners: Y600PartnerReader,
  scope: AccountingScope,
  year: number,
  socios: SocioEcfDto[],
  dirigentes: DirigenteEcfDto[],
): Promise<Y600Row[]> {
  const dtIni = `${year}-01-01`;
  const dtFin = `${year}-12-31`;
  const vivos = await partners.list(scope);
  const doAno = vivos.filter((p) => p.entradaEm <= dtFin && (p.saidaEm === null || p.saidaEm >= dtIni));
  const porId = new Map<string, Partner>(doAno.map((p) => [p.id, p]));

  // ── Item 9: complemento × cadastro ──
  const foraDoAno = socios.filter((s) => !porId.has(s.partnerId)).map((s) => s.partnerId);
  if (foraDoAno.length > 0) {
    throw new ValidationError(
      `Y600: socios com partnerId inexistente, apagado ou sem vigência em ${year}: ${foraDoAno.join(', ')}.`,
      { partnerIds: foraDoAno },
      'ECF_Y600_PARTNER_FORA_DO_ANO',
    );
  }
  const complementados = new Set(socios.map((s) => s.partnerId));
  const faltando = doAno.filter((p) => !complementados.has(p.id)).map((p) => p.id);
  if (faltando.length > 0) {
    throw new ValidationError(
      `Y600: toda vigência de sócio em ${year} precisa de complemento em socios (qualif e valores); faltam os partnerId: ${faltando.join(', ')}.`,
      { partnerIds: faltando },
      'ECF_Y600_COMPLEMENTO_FALTANDO',
    );
  }
  if (socios.length === 0 && dirigentes.length === 0) {
    throw new ValidationError(
      `Y600: a ECF de ${year} exige ao menos um sócio, titular ou dirigente (Manual ECF L12 p. 56, OC para FORMA_TRIB 1 a 7) — ` +
        'cadastre os sócios em /accounting/partners ou informe dirigentes.',
      null,
      'ECF_Y600_SEM_SOCIOS',
    );
  }

  const candidates: Y600Candidate[] = [];
  for (const s of socios) {
    const p = porId.get(s.partnerId)!;
    const tipo = p.tipoPessoa as 'PF' | 'PJ';
    if (p.residenteBrasil === (s.pais !== undefined)) {
      throw new ValidationError(
        p.residenteBrasil
          ? `Y600: o sócio ${p.id} é residente no Brasil (PAIS 105) — não informe pais.`
          : `Y600: o sócio ${p.id} não é residente no Brasil — informe pais (código da tabela de países do Sped, p. 571).`,
        { partnerId: p.id },
        'ECF_Y600_PAIS_INCOERENTE',
      );
    }
    const caso = `${p.residenteBrasil ? 'BR' : 'EX'}_${tipo}` as keyof typeof QUALIF_POR_CASO;
    if (!QUALIF_POR_CASO[caso].includes(s.qualif)) {
      throw new ValidationError(
        `Y600: QUALIF ${s.qualif} não vale para o sócio ${p.id} (${tipo}, ${p.residenteBrasil ? 'residente' : 'não residente'}); ` +
          `aceitos: ${QUALIF_POR_CASO[caso].join(', ')} (REGRA_Y600_QUALIF, Manual ECF L12 p. 574).`,
        { partnerId: p.id },
        'ECF_Y600_QUALIF_INCOERENTE',
      );
    }
    if (tipo === 'PJ' && s.representanteLegal && !QUALIF_REP_LEG_PJ.includes(s.representanteLegal.qualif)) {
      throw new ValidationError(
        `Y600: o representante legal do sócio PJ ${p.id} só aceita QUALIF_REP_LEG 01 ou 06 (Manual ECF L12 p. 573).`,
        { partnerId: p.id },
        'ECF_Y600_QUALIF_INCOERENTE',
      );
    }
    const saidaNoAno = p.saidaEm !== null && p.saidaEm <= dtFin;
    const sucessora =
      p.saidaEm !== null && vivos.some((o) => o.id !== p.id && o.taxId === p.taxId && o.entradaEm === nextDay(p.saidaEm!));
    candidates.push({
      vigenteNoFim: p.saidaEm === null || p.saidaEm >= dtFin,
      row: {
        dtAltSoc: p.entradaEm,
        dtFimSoc: saidaNoAno && !sucessora ? p.saidaEm! : undefined,
        pais: p.residenteBrasil ? '105' : s.pais!,
        indQualifSocio: tipo,
        cpfCnpj: p.residenteBrasil ? p.taxId : undefined,
        nome: p.nome,
        qualif: s.qualif,
        percCapTotBp: p.participacaoBp,
        percCapVotBp: s.percCapVotBp ?? p.participacaoBp,
        cpfRepLeg: s.representanteLegal?.cpf,
        qualifRepLeg: s.representanteLegal?.qualif,
        ...s.valores,
      },
    });
  }
  for (const d of dirigentes) {
    candidates.push({
      vigenteNoFim: d.dtFimSoc === undefined || d.dtFimSoc >= dtFin,
      row: {
        dtAltSoc: d.dtAltSoc,
        dtFimSoc: d.dtFimSoc,
        pais: '105',
        indQualifSocio: 'PF',
        cpfCnpj: d.cpf,
        nome: d.nome,
        qualif: d.qualif,
        percCapTotBp: 0,
        percCapVotBp: 0,
        cpfRepLeg: d.representanteLegal?.cpf,
        qualifRepLeg: d.representanteLegal?.qualif,
        ...d.valores,
      },
    });
  }

  try {
    return ordenarY600(candidates);
  } catch (e) {
    throw new ValidationError(e instanceof Error ? e.message : String(e), null, 'ECF_Y600_LIMITE');
  }
}
