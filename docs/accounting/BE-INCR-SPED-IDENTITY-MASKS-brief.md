# BRIEF — BE-INCR-SPED-IDENTITY-MASKS (nó C12 · máscaras de identidade na geração SPED)

> **Estado: BRIEF pronto. ✅ 4 forks RATIFICADOS 2026-09-16 (dono, via `AskUserQuestion`; registro em
> `CEDULA-DECISAO-2026-09-16-forks-c11-c12-c6b-c8-seed.md`): F-C12-1..4 → (a), todos na recomendação.** Falta a
> transcrição obrigatória do §5 (J930 ECD L9 + 0930 ECF L12 — **os dois PDFs estão no disco**, conferir sha256)
> antes da `sessao-feature`, que ainda exige "executa" do dono (ORCH-006). Escrito em `sessao-planejamento`
> (2026-09-14, passo 4 de `PROXIMOS-PASSOS-2026-09-14.md`).

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó **C12** do `GRAFO-DEPENDENCIAS-2026-09-11.md` (§1 linha C12; §4 fila item 6):
  *"Máscaras de identidade **na geração SPED**: `IDENT_QUALIF`/`COD_ASSIN` (J930) vira **enum do manual**;
  CPF/CNPJ/UF com máscara."*
- **Autorização:** `CEDULA-DECISAO-2026-09-10-entrevista.md` resposta **3** (*"Nada aproximado — tudo com
  máscara para não deixar erro passar"* → *"Todo campo de identidade (CPF, CNPJ, CRC, código de
  qualificação J930) valida por máscara/enum do manual, não por `string`"*) e §5 *"Fica aberto, fora
  desta branch: o código de qualificação do signatário (`IDENT_QUALIF`/`COD_ASSIN`) na geração do SPED
  continua `string` livre; virar enum do manual é o nó 'endurecimento dos campos de identidade'"*.
  Sessão autorizada por `PROXIMOS-PASSOS-2026-09-14.md` passo 4. **Cobre o BRIEF; não cobre
  implementação.**
- **Insumos existentes (lidos nesta sessão):**
  - `server/src/features/accounting/dtos/SpedEcdDto.ts:27-32` — `cnpj` (forma canônica alfanumérica,
    `CNPJ_REGEX`, BE-INCR-CNPJ-ALFA, só formato F-CNPJ-2 → a) e `cpfOrCnpj` (`CPF_OR_CNPJ_REGEX`, **sem
    DV** para CPF); `:33-56` `DeclarantSchema` (0000: `cnpj`, `uf: z.enum(UF_CODES)`, `codMun` 7 dígitos);
    `:72-88` `SignerSchema` J930 — `identQualif: z.string().min(1)` (descrição livre, campo 04),
    `codAssin: /^\d{3}$/` (campo 05, **sem tabela**), `indCrc`/`numSeqCrc`/`dtCrc` **sem máscara**,
    `ufCrc` enum ✅; `:105-124` refine (1 resp. legal; ≥1 `900` e ≥1 não-900 — REGRA_OBRIGATORIO_ASSIN_CONTADOR p.200).
  - `server/src/features/accounting/dtos/SpedEcfDto.ts:62-90` — 0930: `identQualif: /^\d{3}$/`
    ("tabela SPEDECF_QUALIF_ASSINANTE, '900' = Contador; quando 900 ⇒ CPF 11 dígitos e IND_CRC
    obrigatórios", Manual ECF pp. 103-106), `refineEcfSigners` **exportado e reusado pelo DTO Real**.
  - `server/src/lib/cpf.ts` (`isValidCpf`, `stripCpfMask` — **com DV**), `server/src/lib/cnpj.ts`
    (`CNPJ_REGEX`, `isValidCnpj`), `server/src/features/accounting/models/AccountingContact.model.ts`
    (`CRC_NUMBER_RE = /^([A-Z]{2})-(\d{6})\/([OT])-(\d)$/`, `normalizeCrcNumber`, `crcNumberUf`,
    `CRC_CERTIFICATE_RE = /^([A-Z]{2})\/(\d{4})\/(\d{1,10})$/` (l.100), `isValidCrcCertificate`, `UF_CODES`,
    **`contactToJ930Signer` / `contactToEcf0930Signer`** — F-CD8-a já materializada como função pura).
  - `docs/accounting/CEDULA-DECISAO-2026-09-10-entrevista.md` §5 — tabela J930 06/09/10/11 ↔ campos do
    contato (#305), fonte **Manual ECD Leiaute 9 pp. 199-205** (ADE Cofis 01/2026,
    `sped.rfb.gov.br/arquivo/show/7990`); `IND_CRC`: *"o manual não declara formato"* → #305 adotou o
    formato CFC `UF-NNNNNN/O-D` para o **contato**; ECD/ECF DTOs ainda não.
  - `docs/adr/ADR-INCR-SPED-ECD-file-generation.md` l.179 — PVA-5 (J930 qualificação) "RESOLVIDO
    (parcial)": campo 04 descrição + campo 05 código; tabela é do declarante — **é o que C12 fecha**.
  - `docs/accounting/fontes-oficiais/MANIFEST.md` — `manual-ecd-l9` e `manual-ecf-l12` estão no
    manifesto (sha256 registrado) mas **os PDFs não estão no disco desta sessão** (só os 3 `.txt` das INs);
    repor com `node scripts/baixar-fontes-oficiais.mjs` — ver §5.
- **Nós vizinhos:** consome geração SPED ✅ (ECD #62 · ECF #78 · ECF Real #263) e #305 (máscaras do
  contato + `contactTo*Signer`). Consumido por H1 2ª passada
  (o PVA é o oráculo destas máscaras — gate humano, `RUNBOOK-H1-PVA.md`). FE (`FE-INCR-SPED-*`) fora.

---

## 1. O que o nó é

Endurecer, **só nos DTOs de geração** (ECD `SpedEcdRequestSchema`, ECF `SpedEcfRequestSchema` e Real), os
campos de identidade que hoje passam como `string`/regex de forma: (i) código de qualificação do
assinante vira **enum transcrito do manual**; (ii) CPF ganha **DV** (reuso `isValidCpf`); (iii) campos de
CRC do J930 ganham as **mesmas máscaras** do contato (#305); (iv) descrição do assinante (campo 04) deixa
de ser input livre. Nada de tabela nova, rota nova ou migração: é DTO + const + testes de contrato.
**Não é:** validação semântica que só o PVA faz (DV de CNPJ segue F-CNPJ-2 → a: não duplicar), nem
máscara de campos **não-identidade** do 0000 (`ie`, `im`, `nire` — §6).

## 2. Checklist de comportamentos

1. **Tabela de qualificação transcrita** — `server/src/features/accounting/models/spedQualifAssinante.ts`:
   `SPED_ECD_QUALIF_ASSINANTE = { '900': 'Contador', … } as const` transcrita **campo a campo** do Manual
   ECD L9, registro J930 campo 05 (pp. 199-201), com cabeçalho citando página e sha256 do manifesto
   (precedente `BE-INCR-SPED-ECF-layout-transcription.md`). Idem `SPED_ECF_QUALIF_ASSINANTE` (Manual ECF
   L12, 0930, pp. 103-106) — F-C12-2 decide se é a mesma const. Teste-guarda: `'900' → 'Contador'`
   presente nas duas; todo código `^\d{3}$`; sem duplicata; tabela não vazia.
2. **ECD J930 `codAssin: z.enum(keys(SPED_ECD_QUALIF_ASSINANTE))`** — string fora da tabela → 400 com a
   mensagem nomeando o campo e a fonte. Teste: um código **ausente da tabela transcrita** (escolhido na `sessao-feature` lendo o manual — nenhum código além de `900` se escreve de memória, §4.1) → 400; `'900'` → ok.
3. **ECD J930 campo 04 (`identQualif`)** — **se F-C12-1 → (a)**: derivado do código, o DTO **não aceita** o
   campo (strict → `unrecognized_keys`) e o gerador escreve `SPED_ECD_QUALIF_ASSINANTE[codAssin]`; **se (b)**:
   input cruzado com a tabela (400 se diverge).
   Teste de snapshot da linha `|J930|…|` para `codAssin='900'`.
4. **ECF 0930 `identQualif: z.enum(keys(SPED_ECF_QUALIF_ASSINANTE))`** — mesmo teste do item 2; o
   `refineEcfSigners` continua o único refine (reuso, sem clone no DTO Real).
5. **CPF com DV** nos signatários (ECD J930 campo 03 quando 11 dígitos; ECF 0930 idem):
   `identCpfCnpj` = `CPF_REGEX ∧ isValidCpf` **ou** `CNPJ_REGEX` (CNPJ segue só formato, F-CNPJ-2 → a).
   Teste: `'11111111111'` (DV inválido) → 400; CPF válido → ok; CNPJ alfanumérico → ok.
6. **`codAssin='900'`/`identQualif='900'` ⇒ CPF (pessoa física) e `indCrc` obrigatórios** — regra já
   escrita para a ECF (comentário `SpedEcfDto.ts:63-66`, Manual ECF pp. 103-106); estender à ECD **só se
   o Manual ECD L9 p. 200 disser o mesmo** (transcrição, §5) — senão fica em §4.
7. **CRC do J930 com as máscaras de #305**: `indCrc` → `normalizeCrcNumber` + `CRC_NUMBER_RE` (F-C12-3
   decide, porque o manual não declara formato); `ufCrc` enum ✅ (já) **e cruzado** com a UF do
   `indCrc` (`crcNumberUf`); `numSeqCrc` → `CRC_CERTIFICATE_RE` + `isValidCrcCertificate`; `dtCrc` já é
   `dateOnly` (`isValidDateOnly`, não regex — classe `date-only-regex-nao-valida-calendario`).
   Teste: `indCrc='SP-123456/O-1'` + `ufCrc='RJ'` → 400 "UF do CRC não bate".
8. **Pré-preenchimento pelo contato** (F-C12-4): `signers[]` aceita `{ contactId }` **no lugar** dos 11
   campos; o serviço resolve via `AccountingContactRepository.findById(scope, id)` (404 cross-tenant) e
   `contactToJ930Signer`/`contactToEcf0930Signer` (já existem); o signatário resolvido passa pelo
   **mesmo** `SignerSchema` (uma validação, não duas). Teste: contato arquivado → 400 nomeado.
9. **Mensagens de erro nomeiam campo + registro + fonte** (`"J930.COD_ASSIN fora da tabela do Manual ECD
   L9 (pp. 199-201)"`) — é o que "não deixar erro passar" quer dizer na prática: o erro aparece **antes**
   do PVA, com endereço.
10. **Gates mecânicos**: snapshot de shape dos DTOs regenerado (3 DTOs mudam); `npm run docs:generate`
    diff vazio (paths inalterados; schemas de componente mudam → openapi.json regenerado); paridade i18n
    **não** acende (BE only); `auditCanonical` **não** acende (sem evento novo); review independente.

## 3. Forks — RATIFICAÇÃO PENDENTE

| # | Pergunta | Caminhos | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-C12-1** | Campo 04 `IDENT_QUALIF` (descrição) na ECD | (a) **derivado** do código pela tabela — o DTO rejeita o campo · (b) input livre **cruzado** com a tabela (400 se diverge) · (c) input livre como hoje | **(a)** — uma fonte, zero divergência possível; (b) mantém compat de payload ao custo de um refine; (c) é o que a resposta 3 vetou |
| **F-C12-2** | Uma tabela ou duas (ECD J930 × ECF 0930) | (a) duas consts, transcritas cada uma do seu manual, num só arquivo · (b) uma const compartilhada se a transcrição provar identidade | **(a)** — as tabelas têm dono diferente (Cofis 01/2026 × 02/2026) e mudam em datas diferentes; (b) só se provado igual, e aí vira alias, não clone |
| **F-C12-3** | Formato de `IND_CRC` no J930 | (a) mesma máscara CFC do contato (`UF-NNNNNN/O-D`, #305) — coerente com F-CD8 (o contato **é** a fonte do signatário) · (b) normalizar caixa/trim sem máscara (o manual não declara formato — cédula 10/09 §5) | **(a)** — se o contato já exige a máscara, aceitar outro formato no DTO de geração é a divergência que a resposta 3 proíbe; risco nomeado: inscrição legítima fora do padrão CFC seria rejeitada — mitigação: mensagem com o formato esperado |
| **F-C12-4** | `signers[].contactId` no DTO de geração | (a) sim, resolvido no serviço pelo repositório de contatos (`contactTo*Signer`) · (b) não — pré-preenchimento é do FE | **(a)** — F-CD8 (a) ratificado diz "fonte do signatário no próximo DTO de geração" e a função já existe; (b) duplica no FE a máscara que o BE já tem |

## 4. Pendente de validação externa

1. **Conteúdo das tabelas de qualificação** (itens 1, 2, 4): só entram por transcrição do manual com
   página citada — **nenhum código além de `900 = Contador`** (já citado no ADR-ECD l.179 e no DTO ECF)
   pode ser escrito de memória. Sem o PDF no disco, a `sessao-feature` **pausa no item 1**.
2. **Item 6 na ECD** — confirmar no Manual ECD L9 p. 200 se `COD_ASSIN=900` exige CPF e `IND_CRC` (a
   ECF diz; a ECD tem de ser lida).
3. **O PVA é o único oráculo** destas máscaras (`accounting-gargalo-is-human-validation`): verde de teste
   de contrato prova que o DTO rejeita o que a tabela rejeita, não que o PVA aceita o que o DTO aceita.
   Runbook H1 2ª passada (`RUNBOOK-H1-PVA.md`) continua o fecho.

## 5. Insumos ausentes

1. **PDFs `Manual-ECD-Leiaute-9.pdf` e `Manual-ECF-Leiaute-12.pdf` não estão no disco** — só no
   manifesto (sha256 `bc63f0a893ce`, `7216ec2bd62d`). Repor com `node scripts/baixar-fontes-oficiais.mjs`
   **antes** da `sessao-feature` e conferir o sha256 (manual reeditado = BRIEF a reconferir).

## 6. Achados fora de escopo

1. Campos não-identidade do 0000 (`ie`, `im`, `nire`, `numOrd`) seguem `string` — o manual declara
   formatos parciais; endurecer é incremento próprio se o PVA morder.
2. DV de CNPJ na fronteira — decidido **não** (F-CNPJ-2 → a, BE-INCR-CNPJ-ALFA); não reabrir aqui.
3. FE: combobox de qualificação (tabela vinda de `GET /sped/qualif-assinante`?) — rota nova = fora deste
   BRIEF; se o dono quiser, é `FE-INCR-SPED-SIGNERS` + 1 path.

## 7. Gates de envio do PR de implementação

`cd server && npx tsc --noEmit && npm run test:integration` · snapshot de shape regenerado (diff legível
por DTO) · `npm run docs:generate` + guard de path-count (inalterado) · review independente PASS · OPS-001
com adversarial nomeado (sugestão: `codAssin='900'` com CNPJ de 14 posições → 400; `contactId` de outro
tenant → 404, nunca 403).
