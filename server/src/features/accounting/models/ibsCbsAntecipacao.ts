/**
 * IBS-CBS-2027 PR-3 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 17–18; F-IBS-5 a) — antecipação do IBS/CBS
 * no pagamento do pacote pré-pago e o acerto no consumo. Puro: sem I/O, sem `new Date`. O razão NÃO muda (V7): o resultado
 * vira linhas da memória e débito da apuração.
 *
 * - Pagamento antes do fornecimento ⇒ antecipação na data de cada parcela: base = parcela paga; alíquota da data do
 *   documento ou do pagamento, o que vier primeiro (LC 214 art. 10 § 4º [D03]; Dec. 12.955 art. 11 § 5º [D04 do dossiê
 *   verif-2026-10-21-ibs-cbs-pr3]). Hipótese dos 5 dias (§ 7º) não aplicada.
 * - Venda de pacote com documento fiscal autorizado (pacoteFatoGerador VENDA): o documento é o "documento fiscal que
 *   corresponda ao pagamento" (§ 5º I a 2) e o débito dele já entra (DEBITO_DOC) — sem linha de antecipação a mais (dono 22/10).
 * - Alíquota de referência cheia + aviso `ANTECIPACAO_SEM_REDUCAO` (dono 21/10 e 22/10): a lei reduz a saúde em 60% (LC 214
 *   art. 130 [D03]) e o decreto manda a alíquota "aplicável à operação" [D04], mas o produto não tem a redução por serviço do
 *   pacote — lacuna registrada; a dedução no consumo devolve a diferença. CBS sem linha publicada: a prévia usa a taxa
 *   PROVISÓRIA (`IBS_CBS_PROVISORIA`, aviso `CBS_ALIQUOTA_PROVISORIA`) quando houver; sem ela, 400 nomeado (F-IBS-11).
 * - No fornecimento (§ 5º II [D04]; dono 22/10): consumo COM documento autorizado ⇒ a NFS-e do consumo entra cheia e a
 *   antecipação da porção é deduzida (`ACERTO_ART10_n` negativo, até o definitivo; o excedente ⇒ `PAGAMENTO_INDEVIDO_ART38_n`);
 *   consumo SEM documento ⇒ só a diferença de alíquota (a maior = débito; a menor = aviso). FIFO por cliente × pacote.
 *   Vencimento sem uso ou cancelamento ⇒ aviso das regras do cancelamento, sem débito (invariante §10.6).
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
  /** Vendas de consumo (movimento `debit`) do mês que têm documento fiscal autorizado — a nota declara o definitivo. */
  consumosComDocumento?: readonly string[];
  /** Taxa PROVISÓRIA da CBS (`tabelaProvisoriaCbsDe`), só para a prévia; ausente = sem fallback. */
  tabelaProvisoria?: readonly ParametroIbsCbs[];
}

export interface ResultadoAntecipacao {
  /** Antecipações + acertos do mês (somam ao débito da apuração; a dedução no consumo entra negativa). */
  debitosCents: bigint;
  memoria: MemoriaLinha[];
  /** Alguma alíquota veio da tabela PROVISÓRIA — a confirmação recusa (dono 22/10). */
  provisoria: boolean;
}

export const MEMORIA_ANTECIPACAO = {
  ANTECIPACAO_ART10: 'ANTECIPACAO_ART10',
  ANTECIPACAO_SEM_REDUCAO: 'ANTECIPACAO_SEM_REDUCAO',
  ACERTO_ART10: 'ACERTO_ART10',
  PAGAMENTO_INDEVIDO_ART38: 'PAGAMENTO_INDEVIDO_ART38',
  CBS_ALIQUOTA_PROVISORIA: 'CBS_ALIQUOTA_PROVISORIA',
} as const;

/** Aviso do texto do dono (22/10) quando a prévia usa a taxa provisória da CBS. */
export const CBS_RATE_PENDING_SENATE_RES = 'CBS_RATE_PENDING_SENATE_RES';
export const CBS_RATE_PENDING_MESSAGE = 'Alíquota definitiva da CBS para 2027 pendente de Resolução do Senado Federal. Cálculo efetuado com a taxa de referência provisória.';

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
  let provisoria = false;
  const aliquota = (data: string): number => {
    try {
      return aliquotaAntecipacaoBp(tabela, tributo, data);
    } catch (e) {
      const prov = tributo === 'CBS' && input.tabelaProvisoria && e instanceof SemLinhaVigenteError
        ? input.tabelaProvisoria.find((p) => p.vigenteDesde <= data && (p.vigenteAte === null || data <= p.vigenteAte))
        : undefined;
      if (!prov) throw e;
      provisoria = true;
      return prov.aliquotaBp;
    }
  };
  const comDocumento = new Set(input.consumosComDocumento ?? []);

  // Item 17 — antecipação na data de cada parcela paga no mês. Venda com documento autorizado: a nota é a antecipação.
  const pagamentos = input.pagamentos.filter((p) => doMes(p.pagoEm)).sort((a, b) => a.pagoEm.localeCompare(b.pagoEm) || a.saleId.localeCompare(b.saleId));
  let calculadas = 0;
  pagamentos.forEach((p, i) => {
    const codigo = `${MEMORIA_ANTECIPACAO.ANTECIPACAO_ART10}_${i + 1}`;
    if (p.dataDocumento !== null) {
      memoria.push({ codigo, descricao: `venda de pacote ${p.saleId} com documento fiscal autorizado em ${p.dataDocumento}: o débito do documento é a antecipação (sem linha a mais)`, valorCents: '0', fonte: 'Decreto 12.955/2026 art. 11 § 5º I a 2; dono 22/10' });
      return;
    }
    const bp = aliquota(p.pagoEm);
    const valor = aplicarBp(p.parcelaCents, bp);
    debitos += valor;
    calculadas += 1;
    memoria.push({ codigo, descricao: `${tributo} antecipado na venda de pacote ${p.saleId}: parcela ${p.parcelaCents} × ${bp} bp (alíquota de ${p.pagoEm})`, valorCents: valor.toString(), fonte: FONTE_ANTECIPACAO });
  });
  if (calculadas > 0) {
    memoria.push({ codigo: MEMORIA_ANTECIPACAO.ANTECIPACAO_SEM_REDUCAO, descricao: `antecipação pela alíquota de referência cheia de ${tributo}: a redução do serviço (ex.: saúde, 60% — LC 214 art. 130) não é aplicada porque o produto não tem a redução por serviço do pacote; a dedução no consumo corrige`, valorCents: '0', fonte: 'dono 21/10 e 22/10; Decreto 12.955 art. 11 § 5º I a 2 ("aplicáveis à operação")' });
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
        antecipado += aplicarBp(porcao, aliquota(c.dataAliquota));
        if (m.kind === 'debit') definitivo += aplicarBp(porcao, aliquota(m.dia));
      }
      if (antecipadoBase === 0n) continue;
      if (m.kind === 'expiry') {
        pushAcerto(`pacote vencido sem fornecimento (${s.customerId}/${s.packageId}, ${m.dia}): ${antecipado} de ${tributo} antecipado sobre ${antecipadoBase} — regras do cancelamento (Decreto 12.955 art. 11 § 6º → art. 57), sem débito e sem restituição automática`, 0n);
        continue;
      }
      if (comDocumento.has(m.saleId)) {
        // § 5º II (dono 22/10): a nota do consumo declara o definitivo inteiro; deduz-se o antecipado da porção (até o definitivo).
        const deducao = antecipado < definitivo ? antecipado : definitivo;
        debitos -= deducao;
        pushAcerto(`consumo de pacote em ${m.dia} com documento fiscal (venda ${m.saleId}): base ${antecipadoBase}; o documento declara o definitivo ${definitivo}, deduz-se o antecipado ${deducao}`, -deducao);
        if (antecipado > definitivo) {
          nIndevido += 1;
          memoria.push({ codigo: `${MEMORIA_ANTECIPACAO.PAGAMENTO_INDEVIDO_ART38}_${nIndevido}`, descricao: `consumo de pacote em ${m.dia} (venda ${m.saleId}): antecipado ${antecipado} > definitivo ${definitivo} — pagamento indevido (Decreto 12.955 art. 11 § 5º II c → arts. 38 e 491), sem restituição automática`, valorCents: (antecipado - definitivo).toString(), fonte: FONTE_ACERTO });
        }
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
  if (provisoria) {
    memoria.push({ codigo: MEMORIA_ANTECIPACAO.CBS_ALIQUOTA_PROVISORIA, descricao: CBS_RATE_PENDING_MESSAGE, valorCents: '0', fonte: 'IBS_CBS_PROVISORIA (sem fonte oficial; LC 214 art. 349 I) — dono 22/10: só a prévia' });
  }
  return { debitosCents: debitos, memoria, provisoria };
}
