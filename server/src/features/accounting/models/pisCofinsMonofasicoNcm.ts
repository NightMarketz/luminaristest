/**
 * BE-INCR-NFE-COST-REGIME (nó X6) — F-X6-7 → (a) (ratificado 2026-09-15): tabela de NCM sob regime
 * MONOFÁSICO / alíquota zero de PIS/COFINS, transcrita das LEIS no corpus (`docs/accounting/fontes-oficiais/`,
 * MANIFEST 2026-09-15), com artigo citado por entrada. Serve à regra do item 11 (EMENDA 2026-09-15): item
 * cujo NCM casa aqui NÃO gera crédito de PIS/COFINS na aquisição (Lei 10.833/2003 art. 3º §2º II —
 * `Lei-10833-2003-COFINS.html`), mesmo que a nota do fornecedor traga CST tributado.
 *
 * Forma: cada entrada é um PREFIXO de dígitos do NCM (posição `30.04` → `3004`; item `3002.10.1` →
 * `3002101`; código `3401.11.90` → `34011190`), casado por `startsWith` sobre o NCM de 8 dígitos da nota
 * (`prod/NCM`). `exceto` lista códigos EXATOS excluídos pela própria lei. "Ex 01/03/05" (exceções da TIPI
 * dentro de um código) NÃO são avaliáveis pelo NCM — conservador: o código inteiro conta como monofásico
 * (sem crédito), nunca o contrário.
 *
 * Bebidas frias: Lei 13.097/2015 art. 14 (transcrição `TRANSCRICAO-monofasico-bebidas-combustiveis-2026-09-25.md`,
 * chaves `L13097-art14-I..IV`) — sem crédito pela leitura do VAREJISTA (arts. 28+29); o crédito pelo valor da
 * nota do não-varejista (art. 30) NÃO é modelado (conservador = sem crédito).
 * Combustíveis: a Lei 9.718/1998 art. 4º nomeia PRODUTOS, não NCM. A correspondência produto → NCM vem da
 * **Tabela 4.3.10 da EFD-Contribuições v1.25** (corpus `tabela-4310-efd`; transcrição §B.1, chaves `T4310-NNN`),
 * só com as linhas de "Término de Escrituração" VAZIO — a encerrada 3824.90.29 (biodiesel até 31/12/2011) fica de
 * fora de propósito. `2710.11.59` (gasolina pré-2012) também está fora, mas por outro motivo: ela existe no `.doc`
 * da RFB e **não** no texto do corpus, que o `antiword` extrai sem essa linha (ver §B.1 da transcrição). `2208.90.00 Ex 01` (álcool dentro de código de bebida) NÃO entra: aqui
 * o conservador é o inverso do usual — marcar a posição inteira classificaria bebida comum como sem crédito.
 *
 * Guarda: `__tests__/pisCofinsMonofasicoNcm.test.ts` assere que toda `fonte` cita lei+artigo do MANIFEST
 * e que nenhum prefixo é vazio/não-numérico — desde o BE-INCR-LEGAL-PARAMS PR-2, sobre as linhas da semente.
 */
import { linhasVigentesDaTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';

export interface MonofasicoNcmRule {
  /** Prefixo de dígitos do NCM (sem pontos). */
  prefixo: string;
  /** Códigos exatos (8 dígitos) que a lei EXCLUI da posição. */
  exceto?: readonly string[];
  fonte: string;
}

/**
 * BE-INCR-LEGAL-PARAMS PR-2 (itens 15–16) — a tabela de NCM e as listas de CST moram em `legal_parameters`
 * (`PIS_COFINS_MONOFASICO_NCM`, `CST_PIS_COFINS`), cópia byte a byte com a mesma `fonte`. `ordem` (valorJson) preserva
 * a ordem da tabela em código: a 1ª regra que casa decide a fonte (há prefixos que se sobrepõem, ex. 8431 × 84314100).
 * D-6 (CST 03) é pendência de contador, não corrigida.
 */
export interface TabelaPisCofinsItem {
  regras: readonly MonofasicoNcmRule[];
  /** CST de PIS/COFINS de SAÍDA do fornecedor que já declaram "sem crédito" na aquisição (item 11, regra dura; §4 f9 [NC]). */
  cstSemCredito: ReadonlySet<string>;
  /**
   * CST tributado na saída do fornecedor que habilita o crédito com NCM fora da tabela. O 02 ("alíquota
   * diferenciada", saída típica do monofásico) credita pela alíquota básica COM alerta — posição do contador
   * (TRIAGEM-RESPOSTA-CONTADOR-2026-09-23 item 8).
   */
  cstTributado: ReadonlySet<string>;
}

/** Fotografia → tabela do item, vigente na data do fato (emissão da NF-e). */
export function tabelaPisCofinsItemDe(linhas: readonly LinhaLegal[], data: string): TabelaPisCofinsItem {
  const regras = linhasVigentesDaTabela(linhas, 'PIS_COFINS_MONOFASICO_NCM', data)
    .map((l) => ({ l, j: JSON.parse(l.valorJson ?? '{}') as { ordem: number; exceto?: string[] } }))
    .sort((a, b) => a.j.ordem - b.j.ordem)
    .map(({ l, j }): MonofasicoNcmRule => (j.exceto ? { prefixo: l.chave, exceto: j.exceto, fonte: l.fonte } : { prefixo: l.chave, fonte: l.fonte }));
  const cst = linhasVigentesDaTabela(linhas, 'CST_PIS_COFINS', data);
  const de = (classe: string) => new Set(cst.filter((l) => l.valorTexto === classe).map((l) => l.chave));
  return { regras, cstSemCredito: de('SEM_CREDITO'), cstTributado: de('TRIBUTADO') };
}

export type PisCofinsItemClass = 'MONOFASICO' | 'TRIBUTADO' | 'UNKNOWN';

/** Normaliza `prod/NCM` (I05) para 8 dígitos; NCM vazio/inválido → null (→ UNKNOWN). */
export function normalizeNcm(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

/** A regra que casa o NCM (prefixo, respeitando `exceto`), ou null. */
export function findMonofasicoRule(ncm8: string, regras: readonly MonofasicoNcmRule[]): MonofasicoNcmRule | null {
  for (const rule of regras) {
    if (ncm8.startsWith(rule.prefixo) && !(rule.exceto ?? []).includes(ncm8)) return rule;
  }
  return null;
}

/** `{04..09}` para uma sequência contígua, `{01,02}` caso contrário — o texto do motivo segue a tabela. */
function rotuloCst(cst: ReadonlySet<string>): string {
  const xs = [...cst].sort();
  const contigua = xs.length > 2 && xs.every((x, k) => k === 0 || Number(x) === Number(xs[k - 1]) + 1);
  return contigua ? `{${xs[0]}..${xs[xs.length - 1]}}` : `{${xs.join(',')}}`;
}

/**
 * Classificação do item para o crédito (item 11 + triagem do contador P5): o NCM decide — NCM na tabela →
 * MONOFASICO qualquer que seja o CST; CST 04 (monofásico) com NCM fora da tabela → TRIBUTADO + `alerta` de CST
 * divergente (F-PC-2 a: só no `warnings` da importação). CST 05..09 da nota seguem mandando (sem crédito); sem
 * CST ou CST fora dos alfabetos → UNKNOWN (default conservador = sem crédito + warning).
 */
export function classifyPisCofinsItem(input: { ncm: string | null | undefined; cstPis: string | null; cstCofins: string | null }, t: TabelaPisCofinsItem): {
  classe: PisCofinsItemClass;
  motivo: string;
  alerta?: string;
} {
  const cst = input.cstPis ?? input.cstCofins;
  const ncm8 = normalizeNcm(input.ncm);
  const rule = ncm8 ? findMonofasicoRule(ncm8, t.regras) : null;
  if (rule) return { classe: 'MONOFASICO', motivo: `NCM ${ncm8} — ${rule.fonte}` };
  if (cst === '04' && ncm8) {
    return { classe: 'TRIBUTADO', motivo: `NCM ${ncm8} fora da tabela monofásica`, alerta: `CST 04 (monofásico) diverge do NCM ${ncm8}, fora da tabela monofásica — o NCM decide: crédito calculado` };
  }
  if (cst && t.cstSemCredito.has(cst)) return { classe: 'MONOFASICO', motivo: `CST ${cst} na nota` };
  if (cst && t.cstTributado.has(cst) && ncm8) {
    const motivo = `CST ${cst}, NCM ${ncm8} fora da tabela monofásica`;
    return cst === '02'
      ? { classe: 'TRIBUTADO', motivo, alerta: `CST 02 (alíquota diferenciada) com NCM ${ncm8} fora da tabela monofásica — crédito pela alíquota básica; confira o produto` }
      : { classe: 'TRIBUTADO', motivo };
  }
  return {
    classe: 'UNKNOWN',
    motivo: !cst ? 'item sem grupo PIS/COFINS (CST ausente)' : !ncm8 ? 'NCM ausente ou inválido' : `CST ${cst} fora de ${rotuloCst(t.cstTributado)} e de ${rotuloCst(t.cstSemCredito)}`,
  };
}
