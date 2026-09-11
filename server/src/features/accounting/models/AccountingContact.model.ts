/**
 * AccountingContact domain constants (contador destinatário do pacote ECD/ECF —
 * BE-INCR-CONTADOR-DELIVERY / ADR-CONTADOR-DELIVERY D4). Small const file in the style of
 * `Counterparty.model.ts`: the Prisma row type (`AccountingContact`) comes from `generated/prisma`;
 * this file owns the length limits, the audit event keys and o contrato do CRC.
 *
 * A contact is a catalog IDENTITY (nome + e-mail + registro profissional) that the delivery log
 * points at by FK. It carries NO money and NO dates of its own. `name`/`email` are third-party PII:
 * they live in this row and NEVER in an audit payload (D5).
 *
 * ── O CRC não é um campo, são quatro ──────────────────────────────────────────────────────────
 * FONTE: **Manual de Orientação do Leiaute 9 da ECD** (Anexo ao Ato Declaratório Executivo Cofis
 * nº 01/2026, atualização de janeiro de 2026), **registro J930 — Signatários da Escrituração**,
 * campos 06, 09, 10 e 11 (p. 199-201) e as respectivas regras de validação (p. 204-205).
 * Disponível em <http://sped.rfb.gov.br/arquivo/show/7990>.
 *
 * O cadastro espelha 1:1 o que o J930 exige do signatário `COD_ASSIN = 900` (Contador ou
 * Contabilista), porque é ele que o pré-preenchimento (F-CD8-a) vai alimentar:
 *
 * | Campo do J930      | Aqui                       | O que o manual EXIGE                          |
 * |--------------------|----------------------------|-----------------------------------------------|
 * | 06 `IND_CRC`       | `crcNumber`                | Número de inscrição no CRC. Tipo C, **sem tamanho e sem formato declarados** |
 * | 09 `UF_CRC`        | `crcUf`                    | C(002), validado contra a Tabela de UF (`REGRA_TABELA_UF`) |
 * | 10 `NUM_SEQ_CRC`   | `crcCertificate`           | Certidão de Regularidade Profissional no formato **UF/AAAA/NÚMERO** (`REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC`) |
 * | 11 `DT_CRC`        | `crcCertificateValidUntil` | Data de validade da certidão. N(008) no arquivo; date-only aqui |
 *
 * **Onde há máscara, ela é a do manual; onde não há, não invento uma.** `IND_CRC` é o caso honesto:
 * o manual não fixa formato, então o cadastro normaliza (caixa alta, sem espaço) e exige presença —
 * inventar `UF-NNNNNN/O-N` rejeitaria inscrição legítima em silêncio, que é o oposto do pedido
 * "não deixar erro passar". O que o PVA de fato recusa — UF fora da tabela e certidão fora do
 * formato — está validado aqui, na entrada, em vez de virar aviso no validador oficial.
 */

/**
 * Comprimento máximo de `name`. Mora aqui, e não só no DTO, pela mesma razão do
 * `COUNTERPARTY_NAME_MAX_LENGTH`: se um segundo caminho de escrita aparecer (import, wizard), o
 * limite não pode divergir entre chamadores.
 */
export const ACCOUNTING_CONTACT_NAME_MAX_LENGTH = 150;

/** Teto defensivo do `IND_CRC` — o manual não declara tamanho; isto é limite de coluna, não regra. */
export const ACCOUNTING_CONTACT_CRC_NUMBER_MAX_LENGTH = 20;

/**
 * Tabela de Unidades da Federação do SPED (`REGRA_TABELA_UF`, J930 campo 09). As 26 UFs + DF; não
 * inclui `EX`/exterior — o CRC é expedido por conselho regional, que existe só em UF.
 */
export const UF_CODES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE',
  'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;
export type UfCode = (typeof UF_CODES)[number];

/**
 * Formato da Certidão de Regularidade Profissional (`NUM_SEQ_CRC`, J930 campo 10):
 * **UF/AAAA/NÚMERO**. A regra do manual verifica três coisas — UF na tabela, `yyyy` sendo um ano, e
 * a presença do número. O regex cobre a forma; `isValidCrcCertificate` fecha a parte da tabela de
 * UF, que regex nenhum decide.
 */
export const CRC_CERTIFICATE_RE = /^([A-Z]{2})\/(\d{4})\/(\d{1,10})$/;

/**
 * Normaliza o número de inscrição (`IND_CRC`): caixa alta e sem espaço/hífen sobrando nas pontas.
 * NÃO remove pontuação interna — sem formato oficial, mexer no miolo do valor seria adivinhação.
 */
export function normalizeCrcNumber(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Normaliza a certidão para a forma comparável do manual (caixa alta, sem espaços). */
export function normalizeCrcCertificate(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * `REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC` implementada na entrada: forma UF/AAAA/NÚMERO **e** UF
 * existente na tabela. Recebe o valor já normalizado. O manual diz só "yyyy corresponde ao ano" —
 * 4 dígitos; piso ou teto de ano seriam regra inventada (review F9), e um validador com relógio
 * dentro muda de veredito com a data da máquina.
 */
export function isValidCrcCertificate(value: string): boolean {
  const match = CRC_CERTIFICATE_RE.exec(value);
  if (!match) return false;
  const [, uf] = match;
  return (UF_CODES as readonly string[]).includes(uf);
}

/**
 * Audit event keys do cadastro. Registrar e arquivar são as únicas mutações COM evento nesta fase —
 * a allowlist de `auditCanonical.ts` (item 14 do BRIEF) lista exatamente estas duas.
 *
 * Ausência deliberada e NOMEADA: `updateContact` (item 3) não emite evento porque o BRIEF não o
 * listou na allowlist, e `canonicalizeAuditPayload` LANÇA para eventType desconhecido — emitir um
 * `contact.updated` não especificado quebraria o gate em runtime. Registrado como lacuna de spec no
 * relatório da sessão, não resolvido por conta própria.
 */
export const ACCOUNTING_CONTACT_REGISTERED = 'contact.registered';
export const ACCOUNTING_CONTACT_ARCHIVED = 'contact.archived';
