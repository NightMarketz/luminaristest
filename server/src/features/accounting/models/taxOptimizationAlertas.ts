import type { AlertaSimples, ChecklistParceria } from '../dtos/SimplesDto';
import type { OutraParticipacao } from '../dtos/PartnerDto';

/**
 * EFICIENCIA-FISCAL PR-4 itens 19–21 (BRIEF BE-INCR-EFICIENCIA-FISCAL; ADR-INCR-EFICIENCIA-FISCAL L12, L13; decisões do dono em
 * D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO) — alertas PUROS da apuração do Simples: salão-parceiro, interdependência e
 * projeção dos limites. Só aviso (D1): nenhum entra nos BLOQUEANTES do DAS. Sem I/O, sem `new Date`.
 */

const reais = (c: bigint) => `R$ ${(Number(c) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

// ---- item 19: salão-parceiro (Lei 12.592 art. 1º-A §§ 4º, 5º e 8º; I-19: só dado declarado) ----

export interface ContratoParceria {
  id: string;
  profissionalContactId: string;
  homologadoEm: string;
  vigenteDesde: string;
  vigenteAte: string | null;
  deletedAt: Date | null;
  profissionalCnpj: string | null;
  checklistDeclarado: ChecklistParceria | null;
}

export interface LinhaComCota {
  dia: string;
  parceriaContratoId: string | null;
  cotaProfissionalCents: bigint;
}

const emEfeitoNoDia = (c: ContratoParceria, dia: string) =>
  c.deletedAt === null && c.homologadoEm <= dia && c.vigenteDesde <= dia && (c.vigenteAte === null || dia <= c.vigenteAte);

/** O contrato produz efeito em algum dia do mês (vigente e homologado até o fim dele)? */
export function contratoEmEfeitoNoMes(c: ContratoParceria, competencia: string): boolean {
  const inicio = `${competencia}-01`;
  const fim = `${competencia}-31`;
  const de = [c.vigenteDesde, c.homologadoEm, inicio].sort()[2];
  return c.deletedAt === null && de <= fim && (c.vigenteAte === null || de <= c.vigenteAte);
}

const ITENS_CHECKLIST: ReadonlyArray<[keyof ChecklistParceria, string]> = [
  ['clausulaLocacaoBemMovel', '% de locação de bem móvel'],
  ['clausulaCusteio', '% de custeio'],
  ['nfseEmitidaPeloParceiro', 'NFS-e emitida pelo parceiro'],
];

/**
 * Item 19:
 * - `PARCERIA_COTA_SEM_CONTRATO` (WARNING): linha do mês com cota fora da receita bruta cujo contrato foi removido, não estava
 *   vigente ou não estava homologado no dia (§ 8º: sem homologação o contrato não produz efeito);
 * - `PARCERIA_SEM_COTA` (INFO): contrato em efeito no mês sem nenhuma receita do mês com a cota dele;
 * - `PARCEIRO_SEM_CNPJ` (WARNING): contrato em efeito sem o CNPJ do profissional declarado;
 * - `PARCERIA_CHECKLIST_INCOMPLETO` (INFO): cláusula da P-EF-9 não declarada como SIM.
 */
export function alertasDeParceria(competencia: string, linhas: readonly LinhaComCota[], contratos: readonly ContratoParceria[]): AlertaSimples[] {
  const out: AlertaSimples[] = [];
  const porId = new Map(contratos.map((c) => [c.id, c]));
  let semContrato = 0n;
  let nSemContrato = 0;
  const comCota = new Set<string>();
  for (const l of linhas) {
    if (l.cotaProfissionalCents <= 0n) continue;
    const c = l.parceriaContratoId ? porId.get(l.parceriaContratoId) : undefined;
    if (c && emEfeitoNoDia(c, l.dia)) comCota.add(c.id);
    else {
      semContrato += l.cotaProfissionalCents;
      nSemContrato += 1;
    }
  }
  if (nSemContrato > 0) {
    out.push({
      severity: 'WARNING',
      codigo: 'PARCERIA_COTA_SEM_CONTRATO',
      detalhe: `${reais(semContrato)} de cota do profissional em ${nSemContrato} linha(s) sem contrato de parceria vigente e homologado no dia: a cota só sai da receita bruta com contrato escrito homologado (Lei 12.592 art. 1º-A §§ 5º e 8º)`,
    });
  }
  for (const c of [...contratos].filter((x) => contratoEmEfeitoNoMes(x, competencia)).sort((a, b) => a.id.localeCompare(b.id))) {
    const quem = `profissional ${c.profissionalContactId}`;
    if (!comCota.has(c.id)) {
      out.push({ severity: 'INFO', codigo: 'PARCERIA_SEM_COTA', detalhe: `contrato de parceria do ${quem} em efeito em ${competencia}, mas nenhuma receita do mês carrega a cota dele — confira o responsável nos itens de venda` });
    }
    if (!c.profissionalCnpj) {
      out.push({ severity: 'WARNING', codigo: 'PARCEIRO_SEM_CNPJ', detalhe: `contrato de parceria do ${quem} sem CNPJ do profissional declarado: a lei permite qualificá-lo como ME ou MEI (Lei 12.592 art. 1º-A § 7º), e sem CNPJ a NFS-e da cota dele fica sem emissor — confira com o contador (P-EF-9)` });
    }
    const pendentes = ITENS_CHECKLIST.filter(([k]) => c.checklistDeclarado?.[k] !== 'SIM').map(([, rotulo]) => rotulo);
    if (pendentes.length > 0) {
      out.push({ severity: 'INFO', codigo: 'PARCERIA_CHECKLIST_INCOMPLETO', detalhe: `contrato de parceria do ${quem}: cláusula não declarada — ${pendentes.join(', ')} (P-EF-9)` });
    }
  }
  return out;
}

// ---- item 21: projeção do ano (LC 123 art. 3º II, §§ 9º e 9º-A; art. 13-A; art. 20 § 1º-A) ----

/**
 * D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO #4 — receita do ano projetada: acumulado do ano até a competência ÷ meses
 * decorridos × meses do ano (de atividade, no ano de início). `null` se a competência é anterior ao início.
 */
export function receitaProjetadaDoAno(acumuladoAnoCents: bigint, competencia: string, inicioAtividade: string | null): bigint | null {
  const ano = competencia.slice(0, 4);
  const mes = Number(competencia.slice(5, 7));
  const mesInicio = inicioAtividade !== null && inicioAtividade.startsWith(`${ano}-`) ? Number(inicioAtividade.slice(5, 7)) : 1;
  const decorridos = mes - mesInicio + 1;
  if (decorridos <= 0) return null;
  return (acumuladoAnoCents * BigInt(13 - mesInicio)) / BigInt(decorridos);
}

/** Limiar do aviso antecipado (régua do produto, BRIEF item 21 — não é da lei). */
export const LIMIAR_PROJECAO_BP = 8000n;

export interface LimiteProjetado {
  codigo: 'PROJECAO_LIMITE_EPP' | 'PROJECAO_SUBLIMITE_ICMS_ISS';
  /** Limite do ano (já proporcional no ano de início — art. 3º § 10). */
  limiteCents: bigint;
}

/**
 * Item 21 — projeção ≥ 80% do limite e o acumulado ainda dentro dele (acima, o X14 já avisa `LIMITE_EPP_EXCEDIDO`/
 * `SUBLIMITE_ICMS_ISS`). O detalhe diz se o excesso projetado passa de 20%: acima, os efeitos vêm no mês seguinte ao excesso
 * (art. 3º § 9º; art. 20 § 1º); até 20%, em janeiro do ano seguinte (§ 9º-A; art. 20 § 1º-A).
 */
export function alertasDeProjecao(acumuladoAnoCents: bigint, projetadoCents: bigint | null, limites: readonly LimiteProjetado[]): AlertaSimples[] {
  if (projetadoCents === null) return [];
  const out: AlertaSimples[] = [];
  for (const l of limites) {
    if (l.limiteCents <= 0n || acumuladoAnoCents > l.limiteCents) continue;
    if (projetadoCents * 10000n < l.limiteCents * LIMIAR_PROJECAO_BP) continue;
    const pct = Number((projetadoCents * 1000n) / l.limiteCents) / 10;
    const base = l.codigo === 'PROJECAO_LIMITE_EPP' ? 'LC 123 art. 3º II, §§ 9º e 9º-A' : 'LC 123 art. 13-A; art. 20 §§ 1º e 1º-A';
    let efeito: string;
    if (projetadoCents <= l.limiteCents) efeito = 'dentro do limite';
    else if (projetadoCents * 10n > l.limiteCents * 12n) efeito = 'excesso projetado acima de 20%: os efeitos viriam no mês seguinte ao excesso';
    else efeito = 'excesso projetado de até 20%: os efeitos viriam em janeiro do ano seguinte';
    out.push({
      severity: 'WARNING',
      codigo: l.codigo,
      detalhe: `receita do ano projetada em ${reais(projetadoCents)} = ${pct.toLocaleString('pt-BR')}% do limite de ${reais(l.limiteCents)} (${efeito}) — ${base}`,
    });
  }
  return out;
}

// ---- item 20: interdependência (LC 123 art. 3º § 4º III, IV e V; L13) ----

export interface SocioComParticipacoes {
  id: string;
  nome: string;
  tipoPessoa: string;
  outrasParticipacoes: readonly OutraParticipacao[] | null;
}

/** Os incisos do § 4º que a participação aciona (a vedação ainda depende da receita bruta global). */
export function incisosDaParticipacao(socio: Pick<SocioComParticipacoes, 'tipoPessoa'>, p: OutraParticipacao): Array<'III' | 'IV' | 'V'> {
  const out: Array<'III' | 'IV' | 'V'> = [];
  if (socio.tipoPessoa === 'PF' && p.empresaNoSimples) out.push('III');
  if (!p.empresaNoSimples && p.participacaoBp > 1000) out.push('IV');
  if (p.administrador) out.push('V');
  return out;
}

/**
 * Item 20 — receita bruta global = receita do ano da empresa (projetada, a mesma do item 21) + a receita informada de cada outra
 * empresa que aciona um inciso (por CNPJ, uma vez). Acima do limite ⇒ `INTERDEPENDENCIA_SOCIO` (WARNING). Participação que
 * aciona inciso sem receita informada ⇒ `INTERDEPENDENCIA_RECEITA_NAO_INFORMADA` (INFO): a vedação não é afirmada sem o dado.
 */
export function alertasDeInterdependencia(socios: readonly SocioComParticipacoes[], receitaEmpresaAnoCents: bigint, limiteCents: bigint): AlertaSimples[] {
  const acionadas = new Map<string, { receita: bigint | null; incisos: Set<string>; socios: Set<string> }>();
  for (const s of socios) {
    for (const p of s.outrasParticipacoes ?? []) {
      const incisos = incisosDaParticipacao(s, p);
      if (incisos.length === 0) continue;
      const a = acionadas.get(p.cnpj) ?? { receita: null, incisos: new Set<string>(), socios: new Set<string>() };
      if (p.receitaBrutaAnualCents !== null && p.receitaBrutaAnualCents !== undefined) a.receita = BigInt(p.receitaBrutaAnualCents);
      incisos.forEach((i) => a.incisos.add(i));
      a.socios.add(s.nome);
      acionadas.set(p.cnpj, a);
    }
  }
  if (acionadas.size === 0) return [];
  const out: AlertaSimples[] = [];
  const semReceita = [...acionadas.entries()].filter(([, a]) => a.receita === null).map(([cnpj]) => cnpj).sort();
  if (semReceita.length > 0) {
    out.push({
      severity: 'INFO',
      codigo: 'INTERDEPENDENCIA_RECEITA_NAO_INFORMADA',
      detalhe: `informe a receita bruta anual de ${semReceita.join(', ')}: a participação do sócio aciona a LC 123 art. 3º § 4º, que só veda o Simples se a receita bruta global passar ${reais(limiteCents)}`,
    });
  }
  const global = [...acionadas.values()].reduce((t, a) => t + (a.receita ?? 0n), receitaEmpresaAnoCents);
  if (limiteCents > 0n && global > limiteCents) {
    const incisos = [...new Set([...acionadas.values()].flatMap((a) => [...a.incisos]))].sort();
    const nomes = [...new Set([...acionadas.values()].flatMap((a) => [...a.socios]))].sort();
    out.push({
      severity: 'WARNING',
      codigo: 'INTERDEPENDENCIA_SOCIO',
      detalhe: `receita bruta global de ${reais(global)} (empresa + participações informadas de ${nomes.join(', ')}) acima de ${reais(limiteCents)}: vedação ao Simples pela LC 123 art. 3º § 4º ${incisos.join(', ')}`,
    });
  }
  return out;
}
