/**
 * atomicUntil: —
 *   nenhum postEntry aqui: cada reconfirmação é a `confirmarPeloSistema` do X7/X8, que carrega o próprio cabeçalho
 *   atomicUntil (commit 1 = confirmação; provisão best-effort depois). Este serviço só ORDENA as chamadas.
 */
import type { LegalParameter, LegalParameterRecalcJob, TaxAssessment } from 'generated/prisma';
import logger from '../../../lib/logger';
import { resolveAccountingScope, type AccountingScope } from '../scope/AccountingScope';
import type { ITaxAssessmentRepository } from '../repositories/ITaxAssessmentRepository';
import type { IMitExportRepository } from '../repositories/IMitExportRepository';
import type { ILegalParameterRepository } from '../../legalParameters/repositories/ILegalParameterRepository';
import type { ILegalParameterRecalcJobRepository, RecalcResumo } from '../../legalParameters/repositories/ILegalParameterRecalcJobRepository';
import { chaveCronologica, janelaDoPeriodo } from '../models/janelaApuracao';
import type { RecalculoView, TaxAssessmentService } from './TaxAssessmentService';
import type { PisCofinsAssessmentService } from './PisCofinsAssessmentService';

type Familia = 'X7' | 'X8';
const TRIBUTOS: Record<Familia, readonly string[]> = { X7: ['IRPJ', 'CSLL'], X8: ['PIS', 'COFINS'] };

/** Item 10 — o autor das reconfirmações automáticas (dono 07/10: "Ator PLATFORM"). */
export const ATOR_PLATAFORMA = 'PLATFORM';

/** Item 10 (dono 07/10: "Entrou num arquivo MIT") — a substituída já tinha ido para o MIT/DCTFWeb. */
export const AVISO_VALOR_MUDOU_APOS_ENTREGA =
  'Valor mudou depois da entrega: um parâmetro legal retroativo mudou esta apuração e a anterior já estava num arquivo MIT gerado — confira a declaração retificadora e a guia complementar (o sistema não emite sozinho).';

/** Item 10 (dono 07/10: "Gravar a entrada; antigas viram aviso") — o job não tem com que reconfirmar. */
export const avisoReconfirme = (motivo: string): string => `Parâmetro legal mudou — reconfirme esta apuração (${motivo}).`;

/**
 * Item 10 — quais famílias de apuração uma tabela alimenta. CODIGO_RECEITA se divide pela chave (PIS/COFINS ⇒ X8).
 * As demais tabelas não entram em nenhuma apuração confirmada (são lidas na hora: NF-e, LC 116, SPED…).
 */
export function familiasDaLinha(linha: Pick<LegalParameter, 'tabela' | 'chave'>): Familia[] {
  switch (linha.tabela) {
    case 'TAX_ASSESSMENT':
    case 'CSLL_ALIQUOTA':
      return ['X7'];
    case 'PIS_COFINS':
      return ['X8'];
    case 'CODIGO_RECEITA':
      return ['PIS', 'COFINS'].includes(linha.chave) ? ['X8'] : ['X7'];
    default:
      return [];
  }
}

const mesmosValores = (rec: RecalculoView, linhas: TaxAssessment[]): boolean =>
  linhas.every((l) => {
    const r = rec.linhas[l.tributo];
    return (
      !!r &&
      r.baseCents === l.baseCents &&
      r.devidoCents === l.devidoCents &&
      r.aPagarCents === l.aPagarCents &&
      r.saldoNegativoCents === l.saldoNegativoCents &&
      r.diferencaPostergadaCents === l.diferencaPostergadaCents
    );
  });

/** "M06/2026" | "T03" (o X7 devolve só o período, o ano é o da confirmação). */
function periodoDaCascata(familia: Familia, anoBase: number, s: string): { ano: number; periodo: string } {
  if (familia === 'X8') {
    const [periodo, ano] = s.split('/');
    return { ano: Number(ano), periodo };
  }
  return { ano: anoBase, periodo: s };
}

/**
 * BE-INCR-LEGAL-PARAMS PR-4 (nó LEGAL-PARAMS; BRIEF §3 item 10; emenda §9 L-3 e L-17..L-24, dono 07/10) — o recálculo
 * automático das apurações CONFIRMED quando uma linha de lei é publicada ou revogada com vigência que as alcança.
 *
 * - Fila: `legal_parameter_recalc_jobs` (publicar/revogar grava PENDING na mesma tx); `processarPendentes` roda no
 *   agendador, nunca na requisição — publicar não falha por um período fechado de um cliente.
 * - Detecção ("Recalcula e só reconfirma se mudar"): cada apuração viva no alcance é recalculada com a tabela de hoje;
 *   só vira versão nova se base/devido/a pagar/saldo/diferença mudarem. 2ª execução ⇒ nada novo.
 * - Reconfirmação: a do X7/X8 (`confirmarPeloSistema`), autor PLATFORM, com a entrada que o usuário gravou; a cascata
 *   derruba os posteriores e o job os reconfirma em ordem ("Job reconfirma em ordem"). Período fechado ⇒ a confirmação
 *   fica e a provisão fica pendente (o mecanismo do X7 item 15, sem padrão novo).
 * - Sem entrada gravada (apuração anterior ao PR-4) ou falha da reconfirmação ⇒ aviso visível "reconfirme".
 * - Substituída que entrou em arquivo MIT ⇒ aviso "valor mudou depois da entrega" na nova (o sistema não emite guia).
 */
export class TaxAssessmentRecalcService {
  constructor(
    private readonly jobs: ILegalParameterRecalcJobRepository,
    private readonly legalRepo: Pick<ILegalParameterRepository, 'findById'>,
    private readonly taxRepo: ITaxAssessmentRepository,
    private readonly mitRepo: Pick<IMitExportRepository, 'findByYear'>,
    private readonly x7: Pick<TaxAssessmentService, 'recalcularPeloSistema' | 'confirmarPeloSistema'>,
    private readonly x8: Pick<PisCofinsAssessmentService, 'recalcularPeloSistema' | 'confirmarPeloSistema'>,
  ) {}

  /** O que o agendador chama: processa os jobs PENDING mais antigos. Um job que estoura fica PENDING para a próxima. */
  async processarPendentes(limite = 20): Promise<{ jobs: number; falhas: number } & RecalcResumo> {
    const total = { jobs: 0, falhas: 0, reconfirmadas: 0, avisos: 0, inalteradas: 0 };
    for (const job of await this.jobs.findPending(limite)) {
      total.jobs += 1;
      try {
        const r = await this.processar(job);
        await this.jobs.markDone(job.id, r, new Date());
        total.reconfirmadas += r.reconfirmadas;
        total.avisos += r.avisos;
        total.inalteradas += r.inalteradas;
      } catch (error) {
        total.falhas += 1;
        await this.jobs.markFailedAttempt(job.id, error instanceof Error ? error.message : String(error));
      }
    }
    return total;
  }

  private async processar(job: LegalParameterRecalcJob): Promise<RecalcResumo> {
    const resumo: RecalcResumo = { reconfirmadas: 0, avisos: 0, inalteradas: 0 };
    const linha = await this.legalRepo.findById(job.legalParameterId);
    if (!linha) return resumo;
    const ate = linha.vigenteAte ?? '9999-12-31';
    const motivo = `${job.evento === 'PUBLISHED' ? 'publicada' : 'revogada'} a linha ${linha.tabela}/${linha.chave} de ${linha.vigenteDesde}`;

    for (const familia of familiasDaLinha(linha)) {
      const vivas = (await this.taxRepo.findConfirmedByTributos(TRIBUTOS[familia])).filter((r) => {
        const j = janelaDoPeriodo(r.anoCalendario, r.periodo);
        return j.de <= ate && j.ate >= linha.vigenteDesde;
      });
      // X7 encadeia dentro do ano (a cascata é anual); X8 encadeia mês a mês através dos anos (saldo credor).
      const grupos = new Map<string, { owner: string; periodos: Map<number, { ano: number; periodo: string }> }>();
      for (const r of vivas) {
        const k = familia === 'X7' ? `${r.userId}|${r.anoCalendario}` : r.userId;
        const g = grupos.get(k) ?? { owner: r.userId, periodos: new Map() };
        g.periodos.set(chaveCronologica(r.anoCalendario, r.periodo), { ano: r.anoCalendario, periodo: r.periodo });
        grupos.set(k, g);
      }
      for (const g of grupos.values()) {
        const ordem = [...g.periodos.entries()].sort(([a], [b]) => a - b).map(([, p]) => p);
        await this.processarGrupo(familia, g.owner, ordem, motivo, resumo);
      }
    }
    return resumo;
  }

  /** Um grupo encadeado, do período mais antigo ao mais novo. Uma falha para o grupo (os seguintes dependem dele). */
  private async processarGrupo(familia: Familia, owner: string, periodos: { ano: number; periodo: string }[], motivo: string, resumo: RecalcResumo): Promise<void> {
    for (const { ano, periodo } of periodos) {
      const vivas = (await this.taxRepo.findConfirmedByYear(owner, ano)).filter((r) => r.periodo === periodo && TRIBUTOS[familia].includes(r.tributo));
      if (vivas.length === 0) continue; // já refeito pela cascata de um período anterior
      if (vivas.every((r) => r.avisoParametroLegal?.startsWith('Parâmetro legal mudou'))) continue; // já avisado, nada a refazer
      const entrada = vivas[0].entradaInformada;
      if (entrada === null) {
        await this.avisar(owner, vivas, avisoReconfirme(`${motivo}; apuração anterior à gravação da entrada`), resumo);
        continue;
      }
      const scope = this.escopoDaPlataforma(owner, vivas[0].unitId);
      const input = { ...(entrada as Record<string, unknown>), unitId: vivas[0].unitId, anoCalendario: ano, periodo };
      try {
        const rec = await this.recalcular(familia, scope, input);
        if (vivas.every((r) => r.parametrosSha256 === rec.parametros.sha256) || mesmosValores(rec, vivas)) {
          resumo.inalteradas += 1;
          continue;
        }
        const reconfirmar = await this.confirmar(familia, scope, input, rec, vivas.map((r) => r.id), await this.avisoDeEntrega(owner, vivas));
        resumo.reconfirmadas += 1;
        if (!(await this.reconfirmarCascata(familia, owner, ano, reconfirmar, motivo, resumo))) return;
      } catch (error) {
        logger.warn('legal-params recalc: reconfirmação automática falhou — aviso na apuração', { owner, ano, periodo, error });
        await this.avisar(owner, vivas, avisoReconfirme(`${motivo}; reconfirmação automática falhou: ${error instanceof Error ? error.message : String(error)}`), resumo);
        return;
      }
    }
  }

  /** Os períodos que a cascata derrubou, em ordem. Devolve `false` se parou (o resto ganhou aviso). */
  private async reconfirmarCascata(familia: Familia, owner: string, anoBase: number, reconfirmar: string[], motivo: string, resumo: RecalcResumo): Promise<boolean> {
    const fila = reconfirmar.map((s) => periodoDaCascata(familia, anoBase, s)).sort((a, b) => chaveCronologica(a.ano, a.periodo) - chaveCronologica(b.ano, b.periodo));
    for (let i = 0; i < fila.length; i++) {
      const { ano, periodo } = fila[i];
      const caidas = (await Promise.all(TRIBUTOS[familia].map((t) => this.taxRepo.findLatestSuperseded(owner, ano, t, periodo)))).filter((r): r is TaxAssessment => r !== null);
      const entrada = caidas[0]?.entradaInformada ?? null;
      try {
        if (caidas.length === 0 || entrada === null) throw new Error('período derrubado pela cascata sem a entrada gravada');
        const scope = this.escopoDaPlataforma(owner, caidas[0].unitId);
        const input = { ...(entrada as Record<string, unknown>), unitId: caidas[0].unitId, anoCalendario: ano, periodo };
        const rec = await this.recalcular(familia, scope, input);
        await this.confirmar(familia, scope, input, rec, [], await this.avisoDeEntrega(owner, caidas));
        resumo.reconfirmadas += 1;
      } catch (error) {
        // Parou a cadeia: este e os seguintes ficam SUPERSEDED, com o aviso (o usuário reconfirma na ordem).
        for (const resto of fila.slice(i)) {
          const r = (await Promise.all(TRIBUTOS[familia].map((t) => this.taxRepo.findLatestSuperseded(owner, resto.ano, t, resto.periodo)))).filter((x): x is TaxAssessment => x !== null);
          await this.avisar(owner, r, avisoReconfirme(`${motivo}; caiu em cascata e não foi refeita: ${error instanceof Error ? error.message : String(error)}`), resumo);
        }
        return false;
      }
    }
    return true;
  }

  private async recalcular(familia: Familia, scope: AccountingScope, input: Record<string, unknown>): Promise<RecalculoView> {
    return familia === 'X7'
      ? this.x7.recalcularPeloSistema(scope, input as never)
      : this.x8.recalcularPeloSistema(scope, input as never);
  }

  /** Confirma com o CAS do a pagar recalculado; devolve os períodos que a cascata derrubou. */
  private async confirmar(familia: Familia, scope: AccountingScope, input: Record<string, unknown>, rec: RecalculoView, supersedesIds: string[], aviso: string | null): Promise<string[]> {
    const expectedAPagarCents = Object.fromEntries(TRIBUTOS[familia].map((t) => [t, rec.linhas[t].aPagarCents.toString()]));
    const pedido = { ...input, expectedAPagarCents, ...(supersedesIds.length > 0 ? { supersedesIds } : {}) };
    const r = familia === 'X7' ? await this.x7.confirmarPeloSistema(scope, pedido as never, aviso) : await this.x8.confirmarPeloSistema(scope, pedido as never, aviso);
    return r.reconfirmar;
  }

  /** Item 10 (dono 07/10: "Entrou num arquivo MIT") — alguma das substituídas está num MIT gerado (PA do ano ou do seguinte). */
  private async avisoDeEntrega(owner: string, substituidas: TaxAssessment[]): Promise<string | null> {
    const anos = [...new Set(substituidas.flatMap((r) => [r.anoCalendario, r.anoCalendario + 1]))];
    const ids = new Set(substituidas.map((r) => r.id));
    for (const ano of anos) {
      for (const mit of await this.mitRepo.findByYear(owner, ano)) {
        if (Array.isArray(mit.apuracaoIds) && mit.apuracaoIds.some((id) => typeof id === 'string' && ids.has(id))) return AVISO_VALOR_MUDOU_APOS_ENTREGA;
      }
    }
    return null;
  }

  private async avisar(owner: string, linhas: TaxAssessment[], aviso: string, resumo: RecalcResumo): Promise<void> {
    for (const l of linhas) await this.taxRepo.setAvisoParametroLegal(owner, l.id, aviso);
    if (linhas.length > 0) resumo.avisos += 1;
  }

  /** O escopo da reconfirmação: a PJ e a unidade da linha, autor PLATFORM (dono 07/10). */
  private escopoDaPlataforma(owner: string, unitId: string): AccountingScope {
    return { ...resolveAccountingScope({ userId: owner }, unitId), actorUserId: ATOR_PLATAFORMA };
  }
}
