import { normalizeCounterpartyName } from '../models/Counterparty.model';

/**
 * BE-INCR-AUDIT-FREETEXT-MASK — mascaramento de nome de terceiro em campo de TEXTO LIVRE, aplicado
 * ANTES da canonicalização (e portanto antes do hash — a chain é append-only, ADR-INCR2 Q2: o que
 * entra aqui não pode ser corrigido depois).
 *
 * Distinção que motiva este módulo (BRIEF, achado de 2026-09-09): `PAYLOAD_ALLOWLIST`
 * (`auditCanonical.ts`) decide quais CHAVES sobrevivem; ela nunca olhou o VALOR. Os produtores que
 * CONSTROEM a descrição a partir do cadastro (`PayableService.recognitionDescription`) já resolvem o
 * seu caso com `auditDescription` — mas o campo digitado à mão pelo operador (`reason`/`description`
 * vindos do DTO) chega intacto à trilha. Este módulo cobre esse caso, para todo eventType de uma vez,
 * no choke-point (`AuditService.append`) em vez de produtor a produtor.
 *
 * LIMITE DECLARADO (Fork C, ratificado 2026-09-10) — isto é MELHOR-ESFORÇO, não filtro completo,
 * e erra nas DUAS direções:
 *
 * - **Falso negativo (deixa passar):** abreviação ("J. Silva" por "João Silva"), erro de digitação,
 *   apelido, nome de terceiro que nunca foi cadastrado como contraparte, pessoa física fora do
 *   catálogo, nome escrito com acentuação decomposta (NFD) ou apóstrofo tipográfico. Nenhum teste
 *   prova "ausência de PII" — isso é logicamente impossível para texto livre.
 * - **Falso positivo (mascara demais):** o nome cadastrado pode COLIDIR com texto legítimo, e a
 *   troca é irreversível na trilha append-only. Casos reais medidos em review: contraparte "24" →
 *   `"vencimento 24/09"` vira `"vencimento [counterparty:…]/09"`; contraparte "ACME" →
 *   `"contato acme@x.com"` vira `"contato [counterparty:…]@x.com"`; contraparte "NF 123" →
 *   `"Contas a pagar — NF 123"` vira `"Contas a pagar — [counterparty:…]"` (o trecho "NF 123", não
 *   a frase toda). A fronteira de palavra evita o intra-palavra ("Sol" não pega "solicitado"), não
 *   a colisão de palavra inteira.
 *
 * FORA DE ESCOPO (Fork A(b) cobre só `description`/`reason`): outros campos digitados pelo operador
 * seguem sem mascaramento — `account.created.name` (plano de contas analítico por fornecedor,
 * "2.1.2.01 — Fornecedor ACME Ltda", é prática comum), `dimension.definition_created.name`,
 * `dimension.value_created.name`, `entry.source_recorded.externalRef`, `counterparty.created.ref`.
 * Residual nomeado, não esquecido: ampliar exige nova ratificação.
 */

/**
 * Quais chaves, por eventType, passam pelo masker. Chave ausente daqui nunca é tocada — os campos
 * id-only (`payableId`, `supplierRef`, `contentHash`…) não são texto livre e não têm o que mascarar.
 *
 * INVARIANTE (provada por teste de contrato em `__tests__/auditFreeTextMask.test.ts`): toda chave
 * listada aqui TEM de existir na entrada correspondente de `PAYLOAD_ALLOWLIST` — mascarar uma chave
 * que a canonicalização descarta em seguida seria código morto, e um typo aqui passaria despercebido.
 *
 * Escopo = Fork A(b), ratificado: todo `description`/`reason` livre que sobrevive à canonicalização,
 * incluindo o post MANUAL (`entry.posted`), que hoje é o único canal sem boundary nenhum.
 */
export const MASKABLE_FREE_TEXT_KEYS: Record<string, readonly string[]> = {
  'entry.posted':       ['description'], // manual e automático; o auditDescription do AP/AR continua atuando antes
  'entry.drafted':      ['description'],
  'entry.draft_updated': ['description'],
  'entry.reversed':     ['reason'],
  'entry.rejected':     ['reason'],
  'period.soft_closed': ['reason'],
  'period.hard_closed': ['reason'],
  'period.reopened':    ['reason'],
  'payable.cancelled':            ['reason'],
  'payable.settlement_cancelled': ['reason'],
  'receivable.cancelled':         ['reason'],
  'receivable.settlement_cancelled': ['reason'],
  'reconciliation.unmatched':     ['reason'],
  // BE-INCR-CONTADOR-DELIVERY: `failureReason` é texto livre do operador — mesma classe de
  // `reason` dos demais. Sem esta linha o teste de contrato reprova (toda chave `reason`
  // allowlistada precisa de mascaramento declarado).
  //
  // LIMITE MEDIDO (review de dependência, 2026-09-10) — esta entrada compra MENOS do que parece:
  // o masker resolve nomes a partir do catálogo `Counterparty` (`AuditService` monta a lista com
  // `counterpartyRepo.findManyByUnit`), e o PII de terceiro DESTE incremento mora em
  // `AccountingContact.name/email`, que não está naquele catálogo. Ou seja: o nome do contador
  // digitado à mão em `failureReason` entra EM CLARO na trilha append-only. Estender o masker ao
  // cadastro de contadores é mudança no `AuditService` — nó vizinho, fora da spec deste incremento
  // (regra 3 da sessão de feature), registrada como lacuna de spec no relatório. Atenuante atual:
  // nenhum comando produz `FAILED` hoje, então este evento é inalcançável em produção.
  'delivery.failed':              ['reason'],
};

/** O que o masker precisa de cada contraparte: a identidade opaca e o nome já normalizado. */
export interface MaskableCounterparty {
  id: string;
  nameNormalized: string;
}

/** Escapa metacaractere de regex — nome de contraparte é texto livre do usuário ("Pão & Cia (Matriz)"). */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fragmento de padrão de UM nome: tokens literais separados por `\s+` (`nameNormalized` já colapsou
 * o espaço; o texto original pode ter dois espaços ou uma quebra de linha no meio do nome).
 */
function namePatternSource(nameNormalized: string): string {
  return nameNormalized.split(' ').filter(Boolean).map(escapeRegExp).join('\\s+');
}

/**
 * Teto de tokens por regex. O V8 recusa expressão acima de 65.535 nós — com nome de 4 palavras isso
 * estoura em ~21.8k contrapartes (medido em review independente, 2026-09-10), e o `SyntaxError`
 * seria lançado DENTRO da tx do append: com catálogo grande, nenhuma escrita contábil commitaria.
 * `Counterparty` é cunhada implicitamente a cada AP/AR (SEC-A1-5), então o catálogo cresce sozinho —
 * não dá para tratar esse N como hipotético. Daí o fatiamento; 4.000 fica ordens de grandeza abaixo
 * do limite mesmo com nome patologicamente longo.
 */
const MAX_TOKENS_PER_PATTERN = 4000;

interface KnownName {
  id: string;
  normalized: string;
  tokenCount: number;
}

/** Um trecho casado no texto ORIGINAL: intervalo + a contraparte que o explica. */
interface Hit {
  start: number;
  end: number;
  id: string;
}

/** Palavras presentes no texto, em caixa baixa — base do pré-filtro do catálogo. */
function textTokenSet(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of text.matchAll(/[\p{L}\p{N}]+/gu)) tokens.add(match[0].toLowerCase());
  return tokens;
}

/**
 * Chave do pré-filtro: o PRIMEIRO run de letra/dígito do nome — exatamente o mesmo tokenizador que
 * `textTokenSet` aplica ao texto. `null` só quando o nome não tem nenhum alfanumérico; aí o
 * pré-filtro não sabe decidir e a contraparte entra sempre.
 *
 * Tem de ser o MESMO tokenizador dos dois lados, senão o pré-filtro descarta contraparte que
 * casaria. Regressão real (review independente, 2026-09-10): a versão anterior pegava a primeira
 * palavra separada por espaço e REMOVIA a pontuação de dentro dela — "m&m ltda" virava a chave
 * "mm", enquanto o texto "M&M Ltda" produz os tokens {m, ltda}; "mm" nunca casava e a contraparte
 * era descartada antes de qualquer regex, com o nome idêntico ao cadastro passando batido para a
 * trilha imutável. Mesmo defeito para "R.C.", "D'Ávila", "Ana-Maria", "AT&T".
 *
 * Por que a chave nova não gera falso negativo: dentro de um casamento, o caractere imediatamente
 * antes do primeiro run alfanumérico do nome é sempre não-alfanumérico — pelo lookbehind
 * `(?<![\p{L}\p{N}])` quando o nome COMEÇA por esse run, ou pela própria pontuação literal do
 * padrão quando o nome começa com pontuação ("&cia" → run "cia", precedido do "&" casado). Nos dois
 * ramos o run aparece no texto como token maximal completo, e portanto está em `textTokenSet`.
 */
function firstTokenKey(nameNormalized: string): string | null {
  const firstRun = nameNormalized.match(/[\p{L}\p{N}]+/u);
  // `toLowerCase` explícito: esta função roda ANTES da normalização defensiva (o pré-filtro precisa
  // ser barato o bastante para varrer o catálogo inteiro), então ela recebe o campo cru do banco.
  // `nameNormalized` deveria já vir em caixa baixa; se um dia vier com maiúscula, a chave tem de
  // casar mesmo assim — `textTokenSet` também aplica `toLowerCase`, e os dois lados precisam
  // concordar (foi a discordância entre os dois tokenizadores que causou a regressão anterior).
  return firstRun ? firstRun[0].toLowerCase() : null;
}

/** Fatia a lista em blocos cujo total de tokens cabe folgado num regex. */
function chunkByTokenBudget(names: readonly KnownName[]): KnownName[][] {
  const chunks: KnownName[][] = [];
  let current: KnownName[] = [];
  let budget = 0;
  for (const name of names) {
    if (current.length > 0 && budget + name.tokenCount > MAX_TOKENS_PER_PATTERN) {
      chunks.push(current);
      current = [];
      budget = 0;
    }
    current.push(name);
    budget += name.tokenCount;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/**
 * Constrói a saída a partir dos trechos casados, sobre o texto ORIGINAL. Resolve sobreposição de
 * forma global (não por bloco): no mesmo início vence o mais longo — é o que mantém "ACME Ltda"
 * ganhando de "ACME" mesmo quando os dois caem em blocos diferentes.
 */
function applyHits(text: string, hits: readonly Hit[]): string {
  if (hits.length === 0) return text;

  const ordered = [...hits].sort((a, b) => a.start - b.start || b.end - a.end);
  let out = '';
  let cursor = 0;
  for (const hit of ordered) {
    if (hit.start < cursor) continue; // já coberto por um trecho anterior (mais longo ou anterior)
    out += text.slice(cursor, hit.start) + `[counterparty:${hit.id}]`;
    cursor = hit.end;
  }
  return out + text.slice(cursor);
}

/**
 * Substitui, no texto livre, cada ocorrência do nome de uma contraparte conhecida por uma referência
 * OPACA ao id (`[counterparty:<id>]`, Fork E(b)) — mesmo espírito do id-only que o resto do
 * `PAYLOAD_ALLOWLIST` já usa: a trilha continua correlacionável, sem carregar o nome em claro.
 *
 * Decisões do dono (emenda de 2026-09-10 ao BRIEF), ambas visíveis no regex abaixo:
 *
 * 1. **Preserva o texto original** — a normalização serve só para CASAR; a substituição acontece no
 *    texto como o operador escreveu (flag `i`), em vez de devolver a versão em caixa baixa.
 * 2. **Fronteira de palavra** — "Sol" não mascara "solicitado". O lookaround usa `\p{L}\p{N}` em vez
 *    de `\b`: `\b` é ASCII-only em JS e quebraria justamente os nomes acentuados ("José",
 *    "Conceição"), que aqui são o caso comum. Pontuação segue contando como fronteira: "(ACME)" casa.
 *
 * COLETA-E-APLICA, nunca `replace` encadeado. Com um `replace` por nome, o placeholder recém-inserido
 * volta a ser texto candidato na iteração seguinte: com "ACME" e "ACME Ltda" cadastradas,
 * `[counterparty:cp_acme]` era re-mascarado para `[counterparty:cp_[counterparty:cp_curto]]` (o id
 * contém o nome). Aqui todo casamento é procurado no texto ORIGINAL e a saída é construída uma vez
 * só, no fim — o que foi inserido nunca é re-examinado, e isso continua valendo com o texto fatiado
 * em vários blocos de regex.
 *
 * CUSTO: o pré-filtro pelo primeiro run alfanumérico roda ANTES de normalizar e ordenar, então nem a
 * compilação de regex nem a materialização/ordenação da lista escalam com o catálogo — só os
 * sobreviventes (na prática, unidades) pagam custo por nome. O que resta linear é a varredura do
 * pré-filtro: uma regex por nome, barata mas NÃO gratuita — cada candidato aloca o array do `match`
 * e, em nome acentuado, a string em caixa baixa; medido isolado, esse tokenizador responde por
 * ~1,4 ms dos 2,8 ms no catálogo de 50k.
 * Medido em review independente (texto sem nenhum casamento, 20 repetições após aquecimento):
 * 100 nomes ≈ 0,01 ms · 10k ≈ 0,74 ms · 50k ≈ 2,75 ms — cerca de 5× mais barato que a ordem
 * anterior (filtrar depois de normalizar+ordenar) na MESMA máquina. Número relativo, não absoluto:
 * serve para dimensionar, não como SLA.
 * O custo que domina hoje NÃO é este: é a leitura de `findManyByUnit` que o `AuditService` faz por
 * append (uma query por lançamento nos laços de import/reconcile). Reduzir isso é o Fork F(b)
 * (cache), registrado como residual no BRIEF — não foi feito aqui, e a medida acima é justamente o
 * que mostra que o gargalo está na query, não no masker.
 * O fatiamento (`MAX_TOKENS_PER_PATTERN`) é o backstop para o caso patológico em que milhares de
 * nomes compartilham o primeiro run.
 *
 * Função PURA: recebe a lista já resolvida, não consulta banco (o `AuditService` resolve dentro da
 * mesma tx do append). Ver LIMITE DECLARADO no topo do arquivo.
 */
export function maskThirdPartyNames(
  text: string,
  counterparties: ReadonlyArray<MaskableCounterparty>,
): string {
  const present = textTokenSet(text);

  // Pré-filtro ANTES de normalizar/ordenar: o descarte é uma regex barata sobre o campo que o banco
  // já devolve normalizado, então o catálogo inteiro nunca é materializado nem ordenado. Só os
  // sobreviventes (na prática, unidades) pagam o custo por nome.
  const candidates: KnownName[] = counterparties
    .filter((counterparty) => {
      const key = firstTokenKey(counterparty.nameNormalized);
      return key === null || present.has(key);
    })
    .map((counterparty) => {
      const normalized = normalizeCounterpartyName(counterparty.nameNormalized);
      return {
        id: counterparty.id,
        normalized,
        tokenCount: normalized.split(' ').filter(Boolean).length,
      };
    })
    .filter((counterparty) => counterparty.normalized.length > 0)
    // Estável no V8: nomes de mesmo comprimento preservam a ordem de entrada (que
    // `findManyByUnit` já devolve determinística, por type+name) — duas contrapartes homônimas de
    // tipos diferentes resolvem sempre para a mesma, não alternam entre execuções.
    .sort((a, b) => b.normalized.length - a.normalized.length);

  if (candidates.length === 0) return text;

  const hits: Hit[] = [];
  for (const chunk of chunkByTokenBudget(candidates)) {
    const alternation = chunk.map((counterparty) => namePatternSource(counterparty.normalized)).join('|');
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternation})(?![\\p{L}\\p{N}])`, 'giu');
    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined) continue;
      // O trecho casado, normalizado, volta a ser exatamente uma das chaves conhecidas.
      const key = normalizeCounterpartyName(match[0]);
      const hit = chunk.find((counterparty) => counterparty.normalized === key);
      if (hit) hits.push({ start: match.index, end: match.index + match[0].length, id: hit.id });
    }
  }
  return applyHits(text, hits);
}
