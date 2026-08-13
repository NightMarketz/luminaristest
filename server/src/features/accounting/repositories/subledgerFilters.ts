import type { Prisma } from 'generated/prisma';

/**
 * Where-builder COMPARTILHADO da fatia de listagem/filtro dos subrazões AP×AR
 * (RC — dossiê ratificado 2026-08-13, ver `docs/adr/ADR-RC-SUBLEDGER-AP-AR-reuse-sanction.md`).
 *
 * Extração escopada: só a fatia de LISTAGEM é espelho literal (commit `ea91f406`, "AP e AR sao
 * espelho literal (F6)") — o bloco de filtro de `PayableRepository.findManyByUnit()` e
 * `ReceivableRepository.findManyByUnit()` era idêntico símbolo-a-símbolo após rename das duas
 * variáveis de domínio. A fatia de criação/liquidação (CAS 2-tx, estoque só em AP, ponte CRM só
 * em AR, pernas D/C invertidas) diverge em POSSE real e fica de fora — não é candidata a esta
 * função nem a nenhuma outra (ver os 5 pontos sancionados no ADR).
 *
 * REGRA DURA — função PURA: `today` entra SEMPRE por parâmetro. Esta função nunca instancia
 * relógio nem resolve "hoje" — o chamador (o repositório) continua resolvendo via
 * `scopeToday(scope)`, a mesma fonte do aging (F9 + ADR do fuso F-TZ1→(c)). Duas noções de hoje
 * discordando entre o filtro `overdue` e a tela de aging seria exatamente o bug que aquele ADR
 * fechou — não reabrir aqui.
 *
 * Datas de faixa (`dueFrom`/`dueTo`) e o corte de `overdue` são passados ao Prisma como STRING
 * ISO-8601 (`DateTimeFilter | Date | string` — o Prisma aceita os dois), não como `Date`
 * construído em código: preserva o valor exato gravado (meia-noite UTC do dia-calendário) sem
 * este arquivo precisar instanciar relógio nenhum.
 *
 * CLÁUSULA VIVA (ADR §"gatilhos de reversão"): toda extensão futura à fatia de listagem/filtro
 * entra por aqui, nunca re-inlinada num terceiro repositório. Se esta função algum dia precisar de
 * um `if (lado === 'AR')` por dentro, isso é o gatilho de reversão da extração — a divergência
 * sobe para os repositórios, não desce para cá.
 */

/** Parâmetros de filtro aceitos pelos dois `findManyByUnit()` (AP e AR). */
export interface SubledgerListFilterParams {
  status?: string;
  counterpartyId?: string;
  /** Data-only YYYY-MM-DD, faixa inclusiva nos dois extremos (F4). */
  dueFrom?: string;
  dueTo?: string;
  /** Substring em description OU documentNumber (F2). */
  q?: string;
  /** Vencido: `dueDate < today` E status em `openStatuses` (F1). Vencer HOJE não conta. */
  overdue?: boolean;
}

export interface SubledgerFilterOptions {
  /** Statuses "em aberto" do lado (AP: OPEN+PAYING; AR: OPEN+RECEIVING) — só usado pelo filtro `overdue`. */
  openStatuses: readonly string[];
  /** "Hoje" no fuso do escopo (`scopeToday(scope)`), resolvido pelo CHAMADOR — nunca por esta função. */
  today: string;
}

/**
 * Monta o array de blocos `AND` do `where` de listagem (BE-INCR-SUBLEDGER-FILTERS §2). Cada
 * filtro é um elemento PRÓPRIO do array — nunca um spread no objeto raiz — porque dois filtros
 * podem escrever a MESMA chave (`overdue` e `dueTo` disputam `dueDate`; `overdue` e `status`
 * disputam `status`) e por spread o último venceria em silêncio (F10). O chamador é responsável
 * por compor a base (escopo + `deletedAt: null`) FORA deste array — esta função só cobre filtro,
 * nunca a base (comportamento 6).
 */
export function buildSubledgerFilterWhere<
  W extends Prisma.PayableWhereInput | Prisma.ReceivableWhereInput,
>(params: SubledgerListFilterParams, { openStatuses, today }: SubledgerFilterOptions): W[] {
  const filtros: W[] = [];

  if (params.status) filtros.push({ status: params.status } as W);
  if (params.counterpartyId) filtros.push({ counterpartyId: params.counterpartyId } as W);

  // Faixa INCLUSIVA (F4): `dueDate` é gravado como MEIA-NOITE UTC da data-calendário, logo `lte`
  // no extremo inclui o próprio dia.
  if (params.dueFrom) {
    filtros.push({ dueDate: { gte: `${params.dueFrom}T00:00:00.000Z` } } as W);
  }
  if (params.dueTo) {
    filtros.push({ dueDate: { lte: `${params.dueTo}T00:00:00.000Z` } } as W);
  }

  // Vencido (F1): `dueDate < today` E status em aberto. `<` (não `<=`) espelha o aging, onde
  // `dueDate >= as_of` é "a vencer" e o atraso começa em 1 — vencer HOJE não é estar vencido.
  if (params.overdue) {
    filtros.push({
      dueDate: { lt: `${today}T00:00:00.000Z` },
      status: { in: [...openStatuses] },
    } as W);
  }

  // F2: description OU documentNumber. Tombstone de rename-on-delete nunca aparece porque
  // `deletedAt: null` fica na base, fora deste array (comportamento 6).
  if (params.q) {
    filtros.push({
      OR: [{ description: { contains: params.q } }, { documentNumber: { contains: params.q } }],
    } as W);
  }

  return filtros;
}
