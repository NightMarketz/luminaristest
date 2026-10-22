/**
 * IBS-CBS-2027 PR-3 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 17–18; F-IBS-5 a) — antecipação do IBS/CBS
 * no pagamento do pacote pré-pago e o acerto no consumo. Puro: sem I/O, sem `new Date`. O razão NÃO muda (V7): o resultado
 * vira linhas da memória e débito da apuração.
 *
 * - Pagamento antes do fornecimento ⇒ antecipação na data de cada parcela: base = parcela paga; alíquota da data do
 *   documento ou do pagamento, o que vier primeiro (LC 214 art. 10 § 4º [D03]; Dec. 12.955 art. 11 § 5º [D04 do dossiê
 *   verif-2026-10-21-ibs-cbs-pr3]). Hipótese dos 5 dias (§ 7º) não aplicada.
 * - Alíquota de referência cheia + aviso `ANTECIPACAO_SEM_REDUCAO` (dono 21/10): a tabela não tem as reduções por
 *   `cClassTrib`. Sem linha publicada ⇒ 400 nomeado (F-IBS-11: a antecipação precisa da alíquota).
 * - Acerto no consumo, literal do item 18 (dono 21/10): base = total do fornecimento; valor definitivo − antecipado da
 *   mesma porção (FIFO por cliente × pacote): a maior ⇒ débito (`ACERTO_ART10_n`); a menor ⇒ aviso
 *   `PAGAMENTO_INDEVIDO_ART38_n`, sem restituição automática. Vencimento sem uso ou cancelamento ⇒ aviso das regras do
 *   cancelamento, sem débito (invariante §10.6).
 */
import { SemLinhaVigenteError } from '../../legalParameters/models/legalParameter';
import { parametroIbsCbsVigente, type ParametroIbsCbs, type TributoConsumo } from './ibsCbsParams';
import type { MemoriaLinha } from './taxAssessmentCalc';

/** Pagamento (liquidação) de uma venda de pacote no mês. `dataDocumento` = documento fiscal autorizado da venda, se houver. */
export interface PagamentoPacote {
  saleId: string;
  pagoEm: string;
  dataDocumento: string | null;
  parcelaCents: bigint;
}

/** Movimento do saldo de pacote (`PackageBalanceMovement`), com o dia escrito no fuso do escopo. */
export interface MovimentoPacote {
  id: string;
  saleId: string;
  kind: 'credit' | 'debit' | 'expiry';
  deltaCents: bigint;
  dia: string;
  /** Instante ISO — só ordena os movimentos do mesmo dia. */
  instante: string;
}

export interface SaldoPacote {
  customerId: string;
  packageId: string;
  /** Todos os movimentos do par até o fim do mês apurado. */
  movimentos: readonly MovimentoPacote[];
}

export interface AntecipacaoInput {
  ano: number;
  mes: number;
  tributo: TributoConsumo;
  tabela: readonly ParametroIbsCbs[];
  pagamentos: readonly PagamentoPacote[];
  saldos: readonly SaldoPacote[];
  /** Dia em que cada venda de pacote (crédito do saldo) foi paga e o dia do documento dela; ausente = não paga. */
  pagamentoDaVenda: Readonly<Record<string, { pagoEm: string; dataDocumento: string | null }>>;
  /** Vendas de pacote cujo lançamento de origem foi estornado no mês (cancelamento). */
  cancelamentos: readonly { saleId: string; dia: string }[];
}

export interface ResultadoAntecipacao {
  /** Antecipações + acertos a maior do mês (somam ao débito da apuração). */
  debitosCents: bigint;
  memoria: MemoriaLinha[];
}

export const MEMORIA_ANTECIPACAO = {
  ANTECIPACAO_ART10: 'ANTECIPACAO_ART10',
  ANTECIPACAO_SEM_REDUCAO: 'ANTECIPACAO_SEM_REDUCAO',
  ACERTO_ART10: 'ACERTO_ART10',
  PAGAMENTO_INDEVIDO_ART38: 'PAGAMENTO_INDEVIDO_ART38',
} as const;

export const IBS_CBS_ANTECIPACAO_SEM_ALIQUOTA = 'IBS_CBS_ANTECIPACAO_SEM_ALIQUOTA';
const FONTE_ANTECIPACAO = 'LC 214/2025 art. 10 § 4º; Decreto 12.955/2026 art. 11 § 5º (F-IBS-5 a)';
const FONTE_ACERTO = 'LC 214/2025 art. 10 § 4º; Decreto 12.955/2026 art. 11 § 5º II e § 6º (BRIEF item 18)';

/** base × bp / 10000, meio para cima (mesma regra da conferência do PR-2). */
const aplicarBp = (baseCents: bigint, bp: number): bigint => (baseCents * BigInt(bp) + 5000n) / 10000n;

/** Alíquota total do tributo na data (IBS = UF + Mun; CBS = ALIQUOTA). Sem linha ⇒ 400 nomeado da antecipação. */
export function aliquotaAntecipacaoBp(tabela: readonly ParametroIbsCbs[], tributo: TributoConsumo, data: string): number {
  try {
    if (tributo === 'CBS') return parametroIbsCbsVigente(tabela, 'CBS', 'ALIQUOTA', data).aliquotaBp;
    return parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_UF', data).aliquotaBp + parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_MUN', data).aliquotaBp;
  } catch (e) {
    if (!(e instanceof SemLinhaVigenteError)) throw e;
    const erro = new SemLinhaVigenteError('IBS_CBS', data, tributo, IBS_CBS_ANTECIPACAO_SEM_ALIQUOTA);
    erro.message = `antecipação do pacote pré-pago (LC 214 art. 10 § 4º) precisa da alíquota de ${tributo} em ${data} — ${e.message}`;
    throw erro;
  }
}

const menorData = (a: string, b: string | null): string => (b !== null && b < a ? b : a);

/** Itens 17–18 de um tributo no mês. */
export function antecipacaoIbsCbsMes(input: AntecipacaoInput): ResultadoAntecipacao {
  const { tributo, tabela } = input;
  const competencia = `${input.ano}-${String(input.mes).padStart(2, '0')}`;
  const doMes = (dia: string) => dia.slice(0, 7) === competencia;
  const memoria: MemoriaLinha[] = [];
  let debitos = 0n;

  // Item 17 — antecipação na data de cada parcela paga no mês.
  const pagamentos = input.pagamentos.filter((p) => doMes(p.pagoEm)).sort((a, b) => a.pagoEm.localeCompare(b.pagoEm) || a.saleId.localeCompare(b.saleId));
  pagamentos.forEach((p, i) => {
    const data = menorData(p.pagoEm, p.dataDocumento);
    const bp = aliquotaAntecipacaoBp(tabela, tributo, data);
    const valor = aplicarBp(p.parcelaCents, bp);
    debitos += valor;
    memoria.push({ codigo: `${MEMORIA_ANTECIPACAO.ANTECIPACAO_ART10}_${i + 1}`, descricao: `${tributo} antecipado na venda de pacote ${p.saleId}: parcela ${p.parcelaCents} × ${bp} bp (alíquota de ${data})`, valorCents: valor.toString(), fonte: FONTE_ANTECIPACAO });
  });
  if (pagamentos.length > 0) {
    memoria.push({ codigo: MEMORIA_ANTECIPACAO.ANTECIPACAO_SEM_REDUCAO, descricao: `antecipação pela alíquota de referência cheia de ${tributo}: reduções por cClassTrib não aplicadas (P-IBS-2/P-IBS-3); o acerto no consumo corrige`, valorCents: '0', fonte: 'dono 21/10 (lacuna da alíquota da antecipação)' });
  }

  // Item 18 — acerto no fornecimento (FIFO por cliente × pacote).
  let nAcerto = 0;
  let nIndevido = 0;
  const pushAcerto = (descricao: string, valor: bigint) => {
    nAcerto += 1;
    memoria.push({ codigo: `${MEMORIA_ANTECIPACAO.ACERTO_ART10}_${nAcerto}`, descricao, valorCents: valor.toString(), fonte: FONTE_ACERTO });
  };
  const saldos = [...input.saldos].sort((a, b) => a.customerId.localeCompare(b.customerId) || a.packageId.localeCompare(b.packageId));
  for (const s of saldos) {
    const fila: { saleId: string; restante: bigint; pagoEm: string | null; dataAliquota: string | null }[] = [];
    const movs = [...s.movimentos].sort((a, b) => a.dia.localeCompare(b.dia) || a.instante.localeCompare(b.instante) || a.id.localeCompare(b.id));
    for (const m of movs) {
      if (m.kind === 'credit') {
        const pg = input.pagamentoDaVenda[m.saleId];
        fila.push({ saleId: m.saleId, restante: m.deltaCents, pagoEm: pg?.pagoEm ?? null, dataAliquota: pg ? menorData(pg.pagoEm, pg.dataDocumento) : null });
        continue;
      }
      let falta = m.deltaCents;
      let definitivo = 0n;
      let antecipado = 0n;
      let antecipadoBase = 0n;
      while (falta > 0n && fila.length > 0) {
        const c = fila[0];
        const porcao = c.restante < falta ? c.restante : falta;
        c.restante -= porcao;
        falta -= porcao;
        if (c.restante === 0n) fila.shift();
        // Só a porção paga ANTES do fornecimento foi antecipada (art. 10 § 4º).
        if (!doMes(m.dia) || c.pagoEm === null || c.pagoEm > m.dia || c.dataAliquota === null) continue;
        antecipadoBase += porcao;
        antecipado += aplicarBp(porcao, aliquotaAntecipacaoBp(tabela, tributo, c.dataAliquota));
        if (m.kind === 'debit') definitivo += aplicarBp(porcao, aliquotaAntecipacaoBp(tabela, tributo, m.dia));
      }
      if (antecipadoBase === 0n) continue;
      if (m.kind === 'expiry') {
        pushAcerto(`pacote vencido sem fornecimento (${s.customerId}/${s.packageId}, ${m.dia}): ${antecipado} de ${tributo} antecipado sobre ${antecipadoBase} — regras do cancelamento (Decreto 12.955 art. 11 § 6º → art. 57), sem débito e sem restituição automática`, 0n);
        continue;
      }
      const diferenca = definitivo - antecipado;
      if (diferenca >= 0n) {
        debitos += diferenca;
        pushAcerto(`consumo de pacote em ${m.dia} (venda ${m.saleId}): base ${antecipadoBase}, definitivo ${definitivo} − antecipado ${antecipado}`, diferenca);
      } else {
        nIndevido += 1;
        memoria.push({ codigo: `${MEMORIA_ANTECIPACAO.PAGAMENTO_INDEVIDO_ART38}_${nIndevido}`, descricao: `consumo de pacote em ${m.dia} (venda ${m.saleId}): antecipado ${antecipado} > definitivo ${definitivo} — pagamento indevido (Decreto 12.955 art. 11 § 5º II c → arts. 38 e 491), sem restituição automática`, valorCents: (-diferenca).toString(), fonte: FONTE_ACERTO });
      }
    }
  }
  for (const c of [...input.cancelamentos].filter((x) => doMes(x.dia)).sort((a, b) => a.dia.localeCompare(b.dia) || a.saleId.localeCompare(b.saleId))) {
    pushAcerto(`venda de pacote ${c.saleId} cancelada em ${c.dia}: regras do cancelamento (Decreto 12.955 art. 11 § 6º → art. 57), sem lançamento`, 0n);
  }
  return { debitosCents: debitos, memoria };
}
