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

type VigenciaBase = Pick<Partner, 'id' | 'taxId' | 'entradaEm' | 'saidaEm'>;

/** Uma vigência do cadastro que o Y600 do ano exige, com o que dela vai para o arquivo além do cadastro. */
export interface VigenciaDoAno<P extends VigenciaBase = Partner> {
  partner: P;
  /** Ordem do item 3 do BRIEF do BE: vigente em 31/12 vem antes de quem saiu no ano. */
  vigenteNoFim: boolean;
  /** DT_FIM_SOC: `saidaEm` só na saída de fato no ano; mudança de participação (sucessora no dia seguinte) dá null. */
  dtFimSoc: string | null;
}

/**
 * BE-INCR-ECF-Y600 itens 8 e 10 — a seleção das vigências do ano num lugar só (FE-INCR-ECF-Y600 item 1, F-FE-Y600-1 → b):
 * o `montarY600` e a rota de leitura `GET /sped/ecf/y600/vigencias` chamam esta função, então a tela mostra exatamente
 * o conjunto que o gerador exige.
 *  - Item 8: vigências vivas que cruzam o ano (`entradaEm ≤ DT_FIN` e `saidaEm` nulo ou `≥ DT_INI`).
 *  - Item 10 (F-Y600-4): `DT_FIM_SOC = saidaEm` só na saída de fato — `saidaEm` no ano e nenhuma vigência viva do mesmo
 *    `taxId` começando no dia seguinte (mudança de participação não é saída, p. 570 regra 2).
 * `vivos` já vem sem as apagadas (o repositório filtra o soft-delete).
 */
export function selecionarVigenciasDoAno<P extends VigenciaBase>(vivos: readonly P[], year: number): Array<VigenciaDoAno<P>> {
  const dtIni = `${year}-01-01`;
  const dtFin = `${year}-12-31`;
  return vivos
    .filter((p) => p.entradaEm <= dtFin && (p.saidaEm === null || p.saidaEm >= dtIni))
    .map((p) => {
      const saidaNoAno = p.saidaEm !== null && p.saidaEm <= dtFin;
      const sucessora =
        p.saidaEm !== null && vivos.some((o) => o.id !== p.id && o.taxId === p.taxId && o.entradaEm === nextDay(p.saidaEm!));
      return {
        partner: p,
        vigenteNoFim: p.saidaEm === null || p.saidaEm >= dtFin,
        dtFimSoc: saidaNoAno && !sucessora ? p.saidaEm : null,
      };
    });
}

/**
 * BE-INCR-ECF-Y600 itens 8–11 (+ ordem e limites do item 3) — UM lugar só, usado pelo Presumido e pelo Real
 * (item 13, F-Y600-1 → a). Cruza o complemento do request com as vigências do cadastro `Partner` e devolve as
 * linhas do Y600 já ordenadas. Toda incoerência é 400; nada do request é aceito e ignorado (item 9).
 *
 *  - Itens 8 e 10: as vigências do ano e o DT_FIM_SOC saem de `selecionarVigenciasDoAno` (o mesmo cálculo da rota de
 *    leitura da tela); uma ocorrência por vigência, `DT_ALT_SOC = entradaEm` (p. 571).
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
  const doAno = selecionarVigenciasDoAno(await partners.list(scope), year);
  const porId = new Map<string, VigenciaDoAno>(doAno.map((v) => [v.partner.id, v]));

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
  const faltando = doAno.filter((v) => !complementados.has(v.partner.id)).map((v) => v.partner.id);
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
    const { partner: p, vigenteNoFim, dtFimSoc } = porId.get(s.partnerId)!;
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
    candidates.push({
      vigenteNoFim,
      row: {
        dtAltSoc: p.entradaEm,
        dtFimSoc: dtFimSoc ?? undefined,
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
  const dtFin = `${year}-12-31`;
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
