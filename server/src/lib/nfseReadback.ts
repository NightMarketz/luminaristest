import { moneyToCents } from './nfe';
import type { ParsedNfse } from './nfse';

/**
 * BE-INCR-DFE-MANUAL (itens 3 e 5) — RELEITURA, PURA: compara a DPS que o Luminaris ENVIOU com a DPS como foi
 * AUTORIZADA (embutida no XML da NFS-e). Lista FECHADA de campos = transcrição §3
 * (`docs/accounting/fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md`). Normalização
 * declarada e sem aproximação: centavos com tolerância zero (F-DFE-11 a: Σ nota = razão), códigos por igualdade exata,
 * ausência de um lado só = divergência `ausente`. Série, número e Id da DPS NÃO entram (F-MAN-4 a: o portal numera).
 * Compartilhada: o retorno manual usa agora; o adaptador da Focus (X10i) reusa.
 */

export type CampoComparado =
  | 'prest.CNPJ'
  | 'toma.doc'
  | 'cTribNac'
  | 'cNBS'
  | 'cLocPrestacao'
  | 'dCompet'
  | 'vServ'
  | 'vDescIncond'
  | 'vDescCond'
  | 'tpRetISSQN'
  | 'pAliq'
  | 'IBSCBS.CST'
  | 'IBSCBS.cClassTrib';

export interface Divergencia {
  campo: CampoComparado;
  grupo: 'identidade' | 'conteudo';
  tipo: 'diferente' | 'ausente';
  /** null quando o campo é PII (toma.doc): o valor nunca sai desta função. */
  enviado: string | null;
  autorizado: string | null;
}

/** O que a releitura precisa da DPS enviada — satisfeito pela DPS completa e pela do modo manual (sem numeração). */
export interface DpsEnviada {
  infDPS: {
    dCompet: string;
    prest: { CNPJ: string };
    toma?: { CNPJ?: string; CPF?: string };
    serv: { locPrest: { cLocPrestacao: string }; cServ: { cTribNac: string; cNBS?: string } };
    valores: {
      vServPrest: { vServ: string };
      vDescCondIncond?: { vDescIncond?: string; vDescCond?: string };
      trib: { tribMun: { tpRetISSQN: number; pAliq?: string } };
    };
    IBSCBS?: { valores: { trib: { gIBSCBS: { CST: string; cClassTrib: string } } } };
  };
}

const centsOrZero = (v: string | undefined, campo: string): string => (v ? String(moneyToCents(v, campo)) : '0');

export function compareNfseWithDps(enviada: DpsEnviada, autorizada: ParsedNfse): Divergencia[] {
  const e = enviada.infDPS;
  const a = autorizada.dps;
  const out: Divergencia[] = [];
  const cmp = (
    campo: CampoComparado,
    grupo: Divergencia['grupo'],
    enviado: string | undefined | null,
    autorizado: string | undefined | null,
    pii = false,
  ) => {
    const x = enviado ?? null;
    const y = autorizado ?? null;
    if (x === y) return;
    out.push({
      campo,
      grupo,
      tipo: x === null || y === null ? 'ausente' : 'diferente',
      enviado: pii ? null : x,
      autorizado: pii ? null : y,
    });
  };

  cmp('prest.CNPJ', 'identidade', e.prest.CNPJ, a.prestCnpj);

  const tomaEnviado = e.toma?.CNPJ ? `CNPJ:${e.toma.CNPJ}` : e.toma?.CPF ? `CPF:${e.toma.CPF}` : null;
  const tomaAutorizado = a.toma ? `${a.toma.tipo}:${a.toma.valor}` : null;
  cmp('toma.doc', 'conteudo', tomaEnviado, tomaAutorizado, true);

  cmp('cTribNac', 'conteudo', e.serv.cServ.cTribNac, a.cTribNac);
  cmp('cNBS', 'conteudo', e.serv.cServ.cNBS, a.cNBS);
  cmp('cLocPrestacao', 'conteudo', e.serv.locPrest.cLocPrestacao, a.cLocPrestacao);
  cmp('dCompet', 'conteudo', e.dCompet, a.dCompet);
  cmp('vServ', 'conteudo', String(moneyToCents(e.valores.vServPrest.vServ, 'vServ')), a.vServCents);
  cmp('vDescIncond', 'conteudo', centsOrZero(e.valores.vDescCondIncond?.vDescIncond, 'vDescIncond'), a.vDescIncondCents ?? '0');
  cmp('vDescCond', 'conteudo', centsOrZero(e.valores.vDescCondIncond?.vDescCond, 'vDescCond'), a.vDescCondCents ?? '0');
  cmp('tpRetISSQN', 'conteudo', String(e.valores.trib.tribMun.tpRetISSQN), a.tpRetISSQN);
  // pAliq só é comparada quando o Luminaris a enviou (município não conveniado — RN E0617/E0618).
  if (e.valores.trib.tribMun.pAliq !== undefined) {
    cmp('pAliq', 'conteudo', String(moneyToCents(e.valores.trib.tribMun.pAliq, 'pAliq')), a.pAliqBp !== undefined ? String(a.pAliqBp) : null);
  }
  // IBS/CBS só quando o grupo foi enviado (ibsCbsInformar).
  const g = e.IBSCBS?.valores.trib.gIBSCBS;
  if (g) {
    cmp('IBSCBS.CST', 'conteudo', g.CST, a.ibsCbs?.cst);
    cmp('IBSCBS.cClassTrib', 'conteudo', g.cClassTrib, a.ibsCbs?.cClassTrib);
  }
  return out;
}

/** Item 5 — forma persistida em `FiscalDocumentAttempt.resultJson`: SEM PII (toma.doc só com o nome do campo). */
export interface ReleituraJson {
  releitura: {
    status: 'IGUAL' | 'DIVERGENTE';
    divergencias: Array<{ campo: CampoComparado; grupo: Divergencia['grupo']; tipo: Divergencia['tipo']; enviado?: string; autorizado?: string }>;
  };
}

export function toReleituraJson(divergencias: Divergencia[]): ReleituraJson {
  return {
    releitura: {
      status: divergencias.length ? 'DIVERGENTE' : 'IGUAL',
      divergencias: divergencias.map((d) => ({
        campo: d.campo,
        grupo: d.grupo,
        tipo: d.tipo,
        ...(d.enviado !== null ? { enviado: d.enviado } : {}),
        ...(d.autorizado !== null ? { autorizado: d.autorizado } : {}),
      })),
    },
  };
}
