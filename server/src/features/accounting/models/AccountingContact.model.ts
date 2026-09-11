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
 * **Máscara em todos os campos (decisão do dono 2026-09-10, cédula §6, F13).** A 1ª versão deixava
 * o `IND_CRC` sem máscara porque o manual da ECD não declara uma; o dono decidiu mascarar tudo, e a
 * fonte da máscara do número do CRC é OUTRA: o **Manual de Registro do Sistema CFC/CRCs** (CFC, 2ª
 * ed. 2009), formato `1UFXXXXXX/O-X` — categoria (1 = profissional), UF do conselho, 6 dígitos
 * sequenciais, `O` originário / `T` transferido, dígito verificador. As grafias usuais
 * (`SP-123456/O-1`, `1SP123456/O-1`, `CRC-SP 123456/O-1`) são aceitas e NORMALIZADAS para
 * `UF-NNNNNN/O-D`; a UF embutida no número é CRUZADA com `crcUf` (J930 campo 09) — divergência é
 * erro de digitação, exatamente o que a máscara existe para pegar. Grau: formato por resumo de
 * busca do manual do CFC, PDF não aberto nesta sessão (cédula §6).
 *
 * Campos que o J930 exige e que o cadastro ganhou para a "via barata" (F2): `cpf` (campo 03
 * `IDENT_CPF_CNPJ`, 11 dígitos com DV) e `phone` (campo 08 `FONE`, só dígitos). Com eles,
 * `contactToJ930Signer` monta o signatário `COD_ASSIN = 900` completo — é o que o controller de
 * geração SPED expande a partir de `signerContactIds`.
 */

/**
 * Comprimento máximo de `name`. Mora aqui, e não só no DTO, pela mesma razão do
 * `COUNTERPARTY_NAME_MAX_LENGTH`: se um segundo caminho de escrita aparecer (import, wizard), o
 * limite não pode divergir entre chamadores.
 */
export const ACCOUNTING_CONTACT_NAME_MAX_LENGTH = 150;

/** Teto defensivo do `IND_CRC` na ENTRADA (antes de normalizar) — limite de coluna, não regra. */
export const ACCOUNTING_CONTACT_CRC_NUMBER_MAX_LENGTH = 30;

/**
 * Número de registro no CRC no formato do CFC, já normalizado: `UF-NNNNNN/O-D`. Grupos: UF, 6
 * dígitos, categoria de registro (`O` originário, `T` transferido), dígito verificador.
 */
export const CRC_NUMBER_RE = /^([A-Z]{2})-(\d{6})\/([OT])-(\d)$/;

/**
 * Aceita as grafias usuais e devolve a forma canônica `UF-NNNNNN/O-D`, ou `null` se não casar:
 * `SP-123456/O-1` · `SP123456/O-1` · `1SP123456/O-1` (categoria profissional na frente) ·
 * `CRC-SP 123456/O-1` · `CRC/SP 123456/O-1` · minúsculas e espaços sobrando.
 */
export function normalizeCrcNumber(value: string): string | null {
  const flat = value.toUpperCase().replace(/\s+/g, '');
  const m = /^(?:CRC[-\/]?)?1?([A-Z]{2})-?(\d{6})\/([OT])-?(\d)$/.exec(flat);
  if (!m) return null;
  const [, uf, seq, cat, dv] = m;
  return `${uf}-${seq}/${cat}-${dv}`;
}

/** UF embutida num número de CRC já normalizado (`SP-123456/O-1` → `SP`). */
export function crcNumberUf(normalized: string): string | null {
  const m = CRC_NUMBER_RE.exec(normalized);
  return m ? m[1] : null;
}

/** J930 campo 08 `FONE` — só dígitos, 10 (fixo) ou 11 (móvel) com DDD. Tira a máscara usual. */
export function normalizePhone(value: string): string {
  return value.replace(/[\s()\-+.]/g, '');
}
export const PHONE_RE = /^\d{10,11}$/;

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

/**
 * A "via barata" (F2, cédula §6): o signatário J930 do contador, montado a partir do cadastro.
 * Shape idêntico ao `SignerSchema` de `SpedEcdDto` (e dos DTOs irmãos da ECF), para o controller de
 * geração expandir `signerContactIds` ANTES do `.strict()` — os serviços e DTOs de geração não
 * mudam. `codAssin = 900` e `identQualif = 'Contador'` são os valores que
 * `REGRA_OBRIGATORIO_ASSIN_CONTADOR` / `REGRA_TABELA_ASSINANTE_DESC` exigem do contabilista
 * (manual da ECD, p. 204); `indRespLegal = 'N'` porque o contador NUNCA é o responsável legal
 * (`REGRA_QUALIF_INV_RESP_LEGAL`: COD_ASSIN 900 com IND_RESP_LEGAL = S é erro).
 * Função PURA: o mesmo objeto sai na resposta de `confirmDelivery` (item 13, D7 — contato e
 * signatário lado a lado).
 */
export interface J930Signer {
  identNom: string;
  identCpfCnpj: string;
  identQualif: string;
  codAssin: string;
  indCrc: string;
  email: string;
  fone?: string;
  ufCrc: string;
  numSeqCrc?: string;
  dtCrc?: string;
  indRespLegal: 'N';
}

export function contactToJ930Signer(contact: {
  name: string;
  cpf: string;
  email: string;
  phone: string | null;
  crcNumber: string;
  crcUf: string;
  crcCertificate: string | null;
  crcCertificateValidUntil: Date | null;
}): J930Signer {
  return {
    identNom: contact.name,
    identCpfCnpj: contact.cpf,
    identQualif: 'Contador',
    codAssin: '900',
    indCrc: contact.crcNumber,
    email: contact.email,
    ...(contact.phone ? { fone: contact.phone } : {}),
    ufCrc: contact.crcUf,
    ...(contact.crcCertificate ? { numSeqCrc: contact.crcCertificate } : {}),
    ...(contact.crcCertificateValidUntil
      ? { dtCrc: contact.crcCertificateValidUntil.toISOString().slice(0, 10) }
      : {}),
    indRespLegal: 'N',
  };
}

/**
 * O signatário do registro **0930 da ECF** — shape DIFERENTE do J930 da ECD (mesma pessoa, outro
 * leiaute): `identQualif` é o CÓDIGO de 3 dígitos (não a descrição), não há `codAssin`/`ufCrc`/
 * `indRespLegal`, e `email` + `fone` são obrigatórios (`SpedEcfDto.SignerSchema`). Um contato sem
 * telefone não pode assinar a ECF pela via barata — o controller responde 400 nomeando o contato,
 * em vez de deixar o `.strict()` reclamar de um `fone` que o operador nunca digitou.
 */
export interface Ecf0930Signer {
  identNom: string;
  identCpfCnpj: string;
  identQualif: '900';
  indCrc: string;
  email: string;
  fone: string;
}

export function contactToEcf0930Signer(contact: {
  name: string;
  cpf: string;
  email: string;
  phone: string | null;
  crcNumber: string;
}): Ecf0930Signer | null {
  if (!contact.phone) return null;
  return {
    identNom: contact.name,
    identCpfCnpj: contact.cpf,
    identQualif: '900',
    indCrc: contact.crcNumber,
    email: contact.email,
    fone: contact.phone,
  };
}
