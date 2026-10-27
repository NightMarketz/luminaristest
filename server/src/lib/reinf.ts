/**
 * BE-INCR-EFD-REINF PR-1 (nó EFD-REINF; BRIEF itens 2–6, 9, 10, 12; §5.3) e PR-2 (itens 15, 17, 18) — serializer PURO da EFD-Reinf, leiaute 2.1.2b,
 * XSD v2.1.2 "CNPJ alfanumérico" (pacote [D06] do dossiê pesquisas-legais/verif-2026-10-22-efd-reinf-brief, cópia em
 * `lib/reinf/xsd/`). Molde `lib/ecf.ts`: sem Prisma, sem relógio implícito (o cabeçalho traz `agora`), sem `features/`.
 *
 * O XML sai SEM assinatura (F-REINF-1 a + F-REINF-6 a): o XSD exige `ds:Signature` em todo evento, então o teste assina
 * com a chave de teste e valida no XSD oficial; quem assina de verdade é o PR-4 (F-REINF-2 a). Valores em centavos
 * (`bigint`), formatados `[0-9]{1,12},[0-9]{2}`; datas date-only.
 */
import { createHash } from 'crypto';

// ─── Item 3 — cobertura dos 23 tipos de evento do pacote XSD (L1) ────────────────────────────────────────────────────

export type ReinfEvento = 'R-1000' | 'R-2010' | 'R-2098' | 'R-2099' | 'R-4010' | 'R-4020' | 'R-4099' | 'R-9000';

/** Gerados hoje: PR-1 (R-1000, R-4020, R-4099) e PR-2 (R-4010, R-2010, R-2099) do F-REINF-3 a. */
export const EVENTOS_SUPORTADOS: readonly ReinfEvento[] = ['R-1000', 'R-2010', 'R-2099', 'R-4010', 'R-4020', 'R-4099'];

/**
 * Previstos no BRIEF e ainda não gerados: cada um sai daqui para `EVENTOS_SUPORTADOS` no PR que o implementa (§3).
 * Ao fim do PR-4 este conjunto fica vazio (invariante 2: suportado, não aplicável ou retorno).
 */
export const EVENTOS_PLANEJADOS: Readonly<Record<string, string>> = {
  'R-2098': 'PR-4 (F-REINF-10 a: reabertura da série R-2000)',
  'R-9000': 'PR-4 (item 27: exclusão, só com transmissão)',
};

/** Os demais, com a razão (leiaute 2.1.2b [L01] sumário; PRE-ADR D1 corrigido pela L1). */
export const EVENTOS_NAO_APLICAVEIS: Readonly<Record<string, string>> = {
  'R-1050': 'Tabela de entidades ligadas: o tenant não declara FCI/SCP (indFciScp nunca informado no R-4020)',
  'R-1070': 'Tabela de processos: sem processo administrativo/judicial cadastrado (infoProcRet/infoProcJud fora)',
  'R-2020': 'Retenção de INSS sofrida como prestador de cessão de mão de obra: é a Reinf do cliente, não do tenant',
  'R-2030': 'Recursos recebidos por associação desportiva: fora do perfil (salão/clínica)',
  'R-2040': 'Recursos repassados a associação desportiva: fora do perfil',
  'R-2050': 'Comercialização da produção rural: fora do perfil',
  'R-2055': 'Aquisição de produção rural: fora do perfil',
  'R-2060': 'CPRB: fora do escopo do nó (PRE-ADR D1)',
  'R-3010': 'Receita de espetáculo desportivo: fora do perfil',
  'R-4040': 'Pagamento a beneficiário não identificado: o tenant sempre identifica o beneficiário',
  'R-4080': 'Retenção no recebimento: retenção sofrida, fora do nó (PRE-ADR D1)',
};

/** Arquivos de retorno do Fisco: lidos (PR-4), nunca gerados. */
export const EVENTOS_RETORNO = ['R-9001', 'R-9005', 'R-9011', 'R-9015'] as const;

// ─── Tipos (§5.3) ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ContribuinteR1000 {
  cnpjRaiz: string; // 8 posições (L5)
  classTrib: string; // Tabela 08 — Simples = perfil (lacuna B), MEI 04, demais 99
  indEscrituracao: 0 | 1;
  contato: { nome: string; cpf: string; foneFixo?: string; foneCel?: string; email?: string };
  softHouse?: { cnpj: string; nmRazao: string; nmCont: string; telefone?: string; email?: string }; // F-REINF-12 a
}

export interface ValorRetido {
  baseCents: bigint;
  valorCents: bigint;
}

/** Uma `infoPgto` (L2, L7). */
export interface PagamentoPJ {
  dtFG: string;
  vlrBrutoCents: bigint;
  ir?: ValorRetido;
  agregado?: ValorRetido; // F-REINF-8 a
  csll?: ValorRetido;
  cofins?: ValorRetido;
  pis?: ValorRetido;
  origemIds: string[];
}

export interface BeneficiarioPJ {
  cnpj: string;
  nome: string;
  ref: string; // counterpartyId — o que vai para o ReinfBatch (nunca o CNPJ)
  porNatureza: Record<string, PagamentoPJ[]>;
}

/** PR-2 (item 15) — uma `infoPgto` do R-4010. `isencao` = `rendIsento` (dividendo da transição: `tpIsencao` 12, NT 02/2026). */
export interface PagamentoPF {
  dtFG: string;
  vlrRendBrutoCents: bigint;
  vlrRendTribCents?: bigint;
  vlrIRCents?: bigint;
  isencao?: { tpIsencao: number; valorCents: bigint };
  origemIds: string[];
}

export interface BeneficiarioPF {
  cpf: string;
  nome: string;
  ref: string; // partnerId — o que vai para o ReinfBatch (nunca o CPF)
  porNatureza: Record<string, PagamentoPF[]>;
}

/** PR-2 (item 17) — uma NF do R-2010 (lacuna C, dono 27/10: NF = título; uma `infoTpServ` por `tpServico`). */
export interface NfServicoTomado {
  serie: string;
  numDocto: string;
  dtEmissaoNF: string;
  vlrBrutoCents: bigint;
  tiposServico: { tpServico: string; baseCents: bigint; retencaoCents: bigint }[];
  origemIds: string[];
}

export interface PrestadorR2010 {
  cnpj: string;
  ref: string; // counterpartyId
  indCPRB: 0 | 1;
  nfs: NfServicoTomado[];
}

export interface RespInf {
  nome: string;
  cpf: string;
  telefone?: string;
  email?: string;
}

export interface CabecalhoEvento {
  tpAmb: 1 | 2;
  verProc: string;
  agora: string; // AAAAMMDDHHMMSS
  seq: number;
}

/** Item 12 (F-REINF-2 a) — a porta de transmissão; o adaptador webservice é do PR-4. */
export interface ReinfTransmissorPort {
  enviarLote(xmlAssinado: string): Promise<{ protocolo: string }>;
  consultar(protocolo: string): Promise<{ status: 'EM_PROCESSAMENTO' | 'ACEITO' | 'REJEITADO'; recibos: { idEvento: string; nrRecibo?: string; erros?: string[] }[] }>;
}

/**
 * Item 12 — mapeamento puro do retorno da consulta para o status do `ReinfBatch` (molde X7 D11): em processamento não
 * muda nada; o lote só é ACEITO se todo evento tiver recibo.
 */
export function statusDoLoteNaConsulta(c: Awaited<ReturnType<ReinfTransmissorPort['consultar']>>): 'ACEITO' | 'REJEITADO' | null {
  if (c.status === 'EM_PROCESSAMENTO') return null;
  if (c.status === 'REJEITADO') return 'REJEITADO';
  return c.recibos.every((r) => !!r.nrRecibo && !r.erros?.length) ? 'ACEITO' : 'REJEITADO';
}

// ─── Item 2 — base ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * `tpAmb` "vindo da configuração" (item 2): env `REINF_TP_AMB` — `1` produção (padrão), `2` produção restrita (pacote de
 * lacunas, dono 26/10, ponto 5). Valor fora disso é erro de configuração, não de quem chamou.
 */
export function tpAmbReinf(env: Readonly<Record<string, string | undefined>>): 1 | 2 {
  const v = env.REINF_TP_AMB;
  if (v === undefined || v === '' || v === '1') return 1;
  if (v === '2') return 2;
  throw new Error(`REINF_TP_AMB inválido: '${v}' (esperado 1 ou 2)`);
}

const NS = (evt: string) => `http://www.reinf.esocial.gov.br/schemas/${evt}/v2_01_02`;
export const NS_LOTE = 'http://www.reinf.esocial.gov.br/schemas/envioLoteEventosAssincrono/v1_00_00';
/** O lote assíncrono aceita até 50 eventos (`envioLoteEventosAssincrono-v1_00_00.xsd`, `sequence maxOccurs="50"`). */
export const MAX_EVENTOS_LOTE = 50;

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const el = (tag: string, v: string | number) => `<${tag}>${escapeXml(String(v))}</${tag}>`;
const opt = (tag: string, v: string | number | undefined | null) => (v === undefined || v === null || v === '' ? '' : el(tag, v));

/** Centavos → `NNN,NN` (tipo dos valores do XSD). Negativo é bug de quem chamou. */
export function valorReinf(cents: bigint): string {
  if (cents < 0n) throw new Error(`valor negativo na Reinf: ${cents}`);
  const s = cents.toString().padStart(3, '0');
  return `${s.slice(0, -2)},${s.slice(-2)}`;
}

/** Raiz do CNPJ (L5): 8 primeiras posições. */
export function cnpjRaiz(cnpj: string): string {
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) throw new Error(`CNPJ inválido para a Reinf: '${cnpj}'`);
  return cnpj.slice(0, 8);
}

/**
 * L8 — `REGRA_VALIDA_ID_EVENTO` (Anexo II): `ID` + `tpInsc` (1) + inscrição com 14 posições (a raiz completada com zeros à
 * direita) + `AAAAMMDDHHMMSS` + sequencial de 5 = 36 caracteres; XSD `I{1}D{1}[0-9]{1}[0-9A-Z]{12}[0-9]{21}`.
 */
export function idEvento(raiz: string, agora: string, seq: number): string {
  if (!/^[0-9A-Z]{8}$/.test(raiz)) throw new Error(`raiz do CNPJ inválida: '${raiz}'`);
  if (!/^\d{14}$/.test(agora)) throw new Error(`agora inválido (AAAAMMDDHHMMSS): '${agora}'`);
  if (!Number.isInteger(seq) || seq < 1 || seq > 99999) throw new Error(`sequencial fora de 1..99999: ${seq}`);
  return `ID1${raiz.padEnd(14, '0')}${agora}${String(seq).padStart(5, '0')}`;
}

/** `ideContri`: tpInsc 1, nrInsc = raiz de 8 (L5). */
export function ideContri(raiz: string): string {
  return `<ideContri>${el('tpInsc', 1)}${el('nrInsc', raiz)}</ideContri>`;
}

function ideEventoPeriodico(h: CabecalhoEvento, perApur: string, retifica?: string): string {
  return (
    '<ideEvento>' +
    el('indRetif', retifica ? 2 : 1) +
    opt('nrRecibo', retifica) +
    el('perApur', perApur) +
    el('tpAmb', h.tpAmb) +
    el('procEmi', 1) +
    el('verProc', h.verProc) +
    '</ideEvento>'
  );
}

export interface EventoGerado {
  tipo: ReinfEvento;
  id: string;
  xml: string;
  sha256: string;
}

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

function evento(tipo: ReinfEvento, ns: string, raiz: string, id: string, corpo: string): EventoGerado {
  const xml = `<Reinf xmlns="${NS(ns)}"><${raiz} id="${id}">${corpo}</${raiz}></Reinf>`;
  return { tipo, id, xml, sha256: sha256(xml) };
}

// ─── Item 4 — R-1000 ─────────────────────────────────────────────────────────────────────────────────────────────────

function infoCadastro(c: ContribuinteR1000): string {
  const sh = c.softHouse
    ? '<softHouse>' + el('cnpjSoftHouse', c.softHouse.cnpj) + el('nmRazao', c.softHouse.nmRazao) + el('nmCont', c.softHouse.nmCont) + opt('telefone', c.softHouse.telefone) + opt('email', c.softHouse.email) + '</softHouse>'
    : '';
  return (
    '<infoCadastro>' +
    el('classTrib', c.classTrib) +
    el('indEscrituracao', c.indEscrituracao) +
    el('indDesoneracao', 0) +
    el('indAcordoIsenMulta', 0) +
    '<contato>' +
    el('nmCtt', c.contato.nome) +
    el('cpfCtt', c.contato.cpf) +
    opt('foneFixo', c.contato.foneFixo) +
    opt('foneCel', c.contato.foneCel) +
    opt('email', c.contato.email) +
    '</contato>' +
    sh +
    '</infoCadastro>'
  );
}

/**
 * Lacuna D (dono 26/10, pacote A) — hash do CADASTRO do R-1000 (sem id nem hora): é o que decide `inclusao` × `alteracao`
 * entre lotes, porque o sha256 do evento muda a cada geração.
 */
export function conteudoSha256R1000(c: ContribuinteR1000): string {
  return sha256(infoCadastro(c));
}

export function buildR1000(h: CabecalhoEvento, c: ContribuinteR1000, op: 'inclusao' | 'alteracao', iniValid: string): EventoGerado {
  const id = idEvento(c.cnpjRaiz, h.agora, h.seq);
  const corpo =
    '<ideEvento>' + el('tpAmb', h.tpAmb) + el('procEmi', 1) + el('verProc', h.verProc) + '</ideEvento>' +
    ideContri(c.cnpjRaiz) +
    `<infoContri><${op}><idePeriodo>${el('iniValid', iniValid)}</idePeriodo>${infoCadastro(c)}</${op}></infoContri>`;
  return evento('R-1000', 'evtInfoContribuinte', 'evtInfoContri', id, corpo);
}

// ─── Item 6 — R-4020 ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Limites do XSD R-4020 (L2): `idePgto` 1..100 por beneficiário; `infoPgto` 1..999 por natureza. */
export const MAX_NATUREZAS_R4020 = 100;
export const MAX_PAGAMENTOS_POR_NATUREZA = 999;

export class ReinfLimiteXsdError extends Error {
  constructor(
    message: string,
    readonly code: 'REINF_NATUREZAS_ACIMA_DO_LIMITE' | 'REINF_PAGAMENTOS_ACIMA_DO_LIMITE' | 'REINF_EVENTOS_ACIMA_DO_LIMITE' | 'REINF_TIPOS_SERVICO_ACIMA_DO_LIMITE',
    readonly ref: string,
  ) {
    super(message);
  }
}

const par = (tagBase: string, tagValor: string, v?: ValorRetido) => (v ? el(tagBase, valorReinf(v.baseCents)) + el(tagValor, valorReinf(v.valorCents)) : '');

function infoPgto(p: PagamentoPJ): string {
  const ret = par('vlrBaseIR', 'vlrIR', p.ir) + par('vlrBaseAgreg', 'vlrAgreg', p.agregado) + par('vlrBaseCSLL', 'vlrCSLL', p.csll) + par('vlrBaseCofins', 'vlrCofins', p.cofins) + par('vlrBasePP', 'vlrPP', p.pis);
  return '<infoPgto>' + el('dtFG', p.dtFG) + el('vlrBruto', valorReinf(p.vlrBrutoCents)) + (ret ? `<retencoes>${ret}</retencoes>` : '') + '</infoPgto>';
}

/** `idePgto` por `natRend` (≤ 100) e `infoPgto` por `dtFG` (≤ 999), em ordem — quebra comum do R-4020 e do R-4010 (L2). */
function idePgtoPorNatureza<P extends { dtFG: string }>(porNatureza: Record<string, P[]>, ref: string, render: (p: P) => string): string {
  const naturezas = Object.keys(porNatureza).sort();
  if (naturezas.length > MAX_NATUREZAS_R4020) {
    throw new ReinfLimiteXsdError(`O beneficiário tem ${naturezas.length} naturezas de rendimento no mês; o evento aceita ${MAX_NATUREZAS_R4020}.`, 'REINF_NATUREZAS_ACIMA_DO_LIMITE', ref);
  }
  return naturezas
    .map((nat) => {
      const pgtos = [...porNatureza[nat]].sort((x, y) => x.dtFG.localeCompare(y.dtFG));
      if (pgtos.length > MAX_PAGAMENTOS_POR_NATUREZA) {
        throw new ReinfLimiteXsdError(`O beneficiário tem ${pgtos.length} pagamentos na natureza ${nat}; o evento aceita ${MAX_PAGAMENTOS_POR_NATUREZA}.`, 'REINF_PAGAMENTOS_ACIMA_DO_LIMITE', ref);
      }
      return '<idePgto>' + el('natRend', nat) + pgtos.map(render).join('') + '</idePgto>';
    })
    .join('');
}

/** Um evento por beneficiário × estabelecimento (L2); `idePgto` por `natRend`, `infoPgto` por `dtFG`, em ordem. */
export function buildR4020(h: CabecalhoEvento, c: ContribuinteR1000, estabCnpj: string, b: BeneficiarioPJ, perApur: string, retifica?: string): EventoGerado {
  const idePgto = idePgtoPorNatureza(b.porNatureza, b.ref, infoPgto);
  const id = idEvento(c.cnpjRaiz, h.agora, h.seq);
  const corpo =
    ideEventoPeriodico(h, perApur, retifica) +
    ideContri(c.cnpjRaiz) +
    '<ideEstab>' + el('tpInscEstab', 1) + el('nrInscEstab', estabCnpj) + '<ideBenef>' + el('cnpjBenef', b.cnpj) + idePgto + '</ideBenef></ideEstab>';
  return evento('R-4020', 'evt4020PagtoBeneficiarioPJ', 'evtRetPJ', id, corpo);
}

// ─── PR-2 item 15 — R-4010 ───────────────────────────────────────────────────────────────────────────────────────────

function infoPgtoPF(p: PagamentoPF): string {
  const isento = p.isencao ? '<rendIsento>' + el('tpIsencao', p.isencao.tpIsencao) + el('vlrIsento', valorReinf(p.isencao.valorCents)) + '</rendIsento>' : '';
  return (
    '<infoPgto>' +
    el('dtFG', p.dtFG) +
    el('vlrRendBruto', valorReinf(p.vlrRendBrutoCents)) +
    (p.vlrRendTribCents !== undefined ? el('vlrRendTrib', valorReinf(p.vlrRendTribCents)) : '') +
    (p.vlrIRCents !== undefined ? el('vlrIR', valorReinf(p.vlrIRCents)) : '') +
    isento +
    '</infoPgto>'
  );
}

/**
 * Item 15 — um evento por CPF × estabelecimento (mesma quebra do R-4020, L2): `idePgto` por `natRend`, `infoPgto` por
 * `dtFG`, com `vlrRendBruto`, `vlrRendTrib`, `vlrIR` e `rendIsento`. Sem `ideDep`/`detDed`: o R-4010 de PF por serviço
 * (que os exige) é lacuna até o nó de pessoal (item 19).
 */
export function buildR4010(h: CabecalhoEvento, c: ContribuinteR1000, estabCnpj: string, b: BeneficiarioPF, perApur: string, retifica?: string): EventoGerado {
  const idePgto = idePgtoPorNatureza(b.porNatureza, b.ref, infoPgtoPF);
  const id = idEvento(c.cnpjRaiz, h.agora, h.seq);
  const corpo =
    ideEventoPeriodico(h, perApur, retifica) +
    ideContri(c.cnpjRaiz) +
    '<ideEstab>' + el('tpInscEstab', 1) + el('nrInscEstab', estabCnpj) + '<ideBenef>' + el('cpfBenef', b.cpf) + idePgto + '</ideBenef></ideEstab>';
  return evento('R-4010', 'evt4010PagtoBeneficiarioPF', 'evtRetPF', id, corpo);
}

// ─── PR-2 item 17 — R-2010 ───────────────────────────────────────────────────────────────────────────────────────────

/** XSD R-2010: `infoTpServ` 1..9 por NF. */
export const MAX_TIPOS_SERVICO_POR_NF = 9;

/**
 * Item 17 — um evento por prestador (CNPJ) no estabelecimento centralizado (F-REINF-11 a), `indObra = 0` (não é obra):
 * totais do prestador (Σ das NFs) e `nfs[]` com `infoTpServ[]` (Tabela 06 [L01]). Só a retenção principal (11%): adicional,
 * não retido e processo ficam fora (o RETENCOES-FONTE não os grava).
 */
export function buildR2010(h: CabecalhoEvento, c: ContribuinteR1000, estabCnpj: string, p: PrestadorR2010, perApur: string, retifica?: string): EventoGerado {
  let bruto = 0n;
  let base = 0n;
  let ret = 0n;
  const nfs = [...p.nfs]
    .sort((x, y) => x.dtEmissaoNF.localeCompare(y.dtEmissaoNF) || x.numDocto.localeCompare(y.numDocto))
    .map((nf) => {
      if (nf.tiposServico.length > MAX_TIPOS_SERVICO_POR_NF) {
        throw new ReinfLimiteXsdError(`A NF ${nf.numDocto} tem ${nf.tiposServico.length} tipos de serviço; o R-2010 aceita ${MAX_TIPOS_SERVICO_POR_NF}.`, 'REINF_TIPOS_SERVICO_ACIMA_DO_LIMITE', p.ref);
      }
      bruto += nf.vlrBrutoCents;
      const tps = [...nf.tiposServico].sort((x, y) => x.tpServico.localeCompare(y.tpServico));
      for (const t of tps) {
        base += t.baseCents;
        ret += t.retencaoCents;
      }
      return (
        '<nfs>' +
        el('serie', nf.serie) +
        el('numDocto', nf.numDocto) +
        el('dtEmissaoNF', nf.dtEmissaoNF) +
        el('vlrBruto', valorReinf(nf.vlrBrutoCents)) +
        tps.map((t) => '<infoTpServ>' + el('tpServico', t.tpServico) + el('vlrBaseRet', valorReinf(t.baseCents)) + el('vlrRetencao', valorReinf(t.retencaoCents)) + '</infoTpServ>').join('') +
        '</nfs>'
      );
    })
    .join('');
  const id = idEvento(c.cnpjRaiz, h.agora, h.seq);
  const corpo =
    ideEventoPeriodico(h, perApur, retifica) +
    ideContri(c.cnpjRaiz) +
    '<infoServTom><ideEstabObra>' +
    el('tpInscEstab', 1) +
    el('nrInscEstab', estabCnpj) +
    el('indObra', 0) +
    '<idePrestServ>' +
    el('cnpjPrestador', p.cnpj) +
    el('vlrTotalBruto', valorReinf(bruto)) +
    el('vlrTotalBaseRet', valorReinf(base)) +
    el('vlrTotalRetPrinc', valorReinf(ret)) +
    el('indCPRB', p.indCPRB) +
    nfs +
    '</idePrestServ></ideEstabObra></infoServTom>';
  return evento('R-2010', 'evtTomadorServicos', 'evtServTom', id, corpo);
}

// ─── PR-2 item 18 — R-2099 ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * Item 18 — fechamento da série R-2000 com os 7 indicadores `S/N` do `infoFech`: `evtServTm = S` quando há R-2010; os
 * demais `N` (os eventos deles não se aplicam, item 3). Sai só com R-2010 no lote (lacuna C, ponto 4, dono 27/10).
 */
export function buildR2099(h: CabecalhoEvento, c: ContribuinteR1000, perApur: string, flags: { servTomados: boolean }, respInf?: RespInf): EventoGerado {
  const id = idEvento(c.cnpjRaiz, h.agora, h.seq);
  const sn = (b: boolean) => (b ? 'S' : 'N');
  const corpo =
    '<ideEvento>' + el('perApur', perApur) + el('tpAmb', h.tpAmb) + el('procEmi', 1) + el('verProc', h.verProc) + '</ideEvento>' +
    ideContri(c.cnpjRaiz) +
    ideRespInf(respInf) +
    '<infoFech>' +
    el('evtServTm', sn(flags.servTomados)) +
    el('evtServPr', 'N') +
    el('evtAssDespRec', 'N') +
    el('evtAssDespRep', 'N') +
    el('evtComProd', 'N') +
    el('evtCPRB', 'N') +
    el('evtAquis', 'N') +
    '</infoFech>';
  return evento('R-2099', 'evtFechamento', 'evtFechaEvPer', id, corpo);
}

// ─── Item 9 — R-4099 ─────────────────────────────────────────────────────────────────────────────────────────────────

const ideRespInf = (r?: RespInf) => (r ? '<ideRespInf>' + el('nmResp', r.nome) + el('cpfResp', r.cpf) + opt('telefone', r.telefone) + opt('email', r.email) + '</ideRespInf>' : '');

/** `fechRet`: 0 = fechamento, 1 = reabertura (leiaute 2.1.2b, R-4099 campo 18). */
export function buildR4099(h: CabecalhoEvento, c: ContribuinteR1000, perApur: string, fechRet: 'FECHAMENTO' | 'REABERTURA', respInf?: RespInf): EventoGerado {
  const id = idEvento(c.cnpjRaiz, h.agora, h.seq);
  const resp = ideRespInf(respInf);
  const corpo =
    '<ideEvento>' + el('perApur', perApur) + el('tpAmb', h.tpAmb) + el('procEmi', 1) + el('verProc', h.verProc) + '</ideEvento>' +
    ideContri(c.cnpjRaiz) +
    resp +
    `<infoFech>${el('fechRet', fechRet === 'FECHAMENTO' ? 0 : 1)}</infoFech>`;
  return evento('R-4099', 'evt4099FechamentoDirf', 'evtFech', id, corpo);
}

// ─── Item 10 — lote ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * O envelope `Reinf/envioLoteEventos` (`envioLoteEventosAssincrono-v1_00_00.xsd`) — o mesmo que o PR-4 enviará. A ordem
 * é a de quem chamou (R-1000 → periódicos → fechamento). Mais de 50 eventos ⇒ erro nomeado (pacote da lacuna, dono 26/10).
 */
export function serializeLote(raiz: string, eventos: readonly EventoGerado[]): { xml: string; sha256: string } {
  if (eventos.length > MAX_EVENTOS_LOTE) {
    throw new ReinfLimiteXsdError(`O lote teria ${eventos.length} eventos; o envio aceita ${MAX_EVENTOS_LOTE}.`, 'REINF_EVENTOS_ACIMA_DO_LIMITE', raiz);
  }
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?><Reinf xmlns="${NS_LOTE}"><envioLoteEventos>` +
    `<ideContribuinte>${el('tpInsc', 1)}${el('nrInsc', raiz)}</ideContribuinte><eventos>` +
    eventos.map((e) => `<evento Id="${e.id}">${e.xml}</evento>`).join('') +
    '</eventos></envioLoteEventos></Reinf>';
  return { xml, sha256: sha256(xml) };
}

// ─── selfCheck (molde lib/ecf.ts) ────────────────────────────────────────────────────────────────────────────────────

export function __selfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`reinf selfCheck: ${msg}`);
  };
  const id = idEvento('12345678', '20260415103000', 1);
  assert(id === 'ID1123456780000002026041510300000001', 'id do evento');
  assert(id.length === 36, 'id com 36');
  assert(valorReinf(0n) === '0,00' && valorReinf(5n) === '0,05' && valorReinf(123456n) === '1234,56', 'valor');
  assert(cnpjRaiz('11222333000181') === '11222333', 'raiz');
  assert(escapeXml(`a&b<c>"'`) === 'a&amp;b&lt;c&gt;&quot;&apos;', 'escape');
  const todos = [...EVENTOS_SUPORTADOS, ...Object.keys(EVENTOS_PLANEJADOS), ...Object.keys(EVENTOS_NAO_APLICAVEIS), ...EVENTOS_RETORNO];
  assert(todos.length === 23 && new Set(todos).size === 23, '23 tipos, cada um num conjunto');
  const c: ContribuinteR1000 = { cnpjRaiz: '11222333', classTrib: '99', indEscrituracao: 1, contato: { nome: 'CONTADOR', cpf: '52998224725' } };
  const h: CabecalhoEvento = { tpAmb: 2, verProc: 'selfCheck', agora: '20260415103000', seq: 1 };
  assert(buildR4099(h, c, '2026-03', 'FECHAMENTO').sha256 === buildR4099(h, c, '2026-03', 'FECHAMENTO').sha256, 'determinismo');
}
