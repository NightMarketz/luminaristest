# BRIEF — BE-INCR-DFE-MANUAL (emissão manual sem parceiro + releitura do XML autorizado) — nó DFE-MANUAL

> Produzido em `sessao-planejamento` (2026-09-27), nó [`DFE-MANUAL`](../plano/nos/DFE-MANUAL.md), Fases A–B do
> [`PLANO-EMISSAO-FISCAL-2026-09-27.md`](PLANO-EMISSAO-FISCAL-2026-09-27.md). Executa as decisões 4 e 5 de
> [`D-2026-09-26-EMISSAO-FISCAL-BYOK`](../plano/decisoes/D-2026-09-26-EMISSAO-FISCAL-BYOK.md) e a emenda §11 do
> [`ADR-INCR-DFE-EMISSAO-PARCEIRO.md`](../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md).
> **Este documento NÃO escreve código** — checklist + contratos esboçados. **Forks F-MAN-1..5: ✅ RATIFICADOS
> 2026-09-27** (F-MAN-1 e F-MAN-2 contra a recomendação — registro e efeitos no fim da §5); **sub-fork F-MAN-2b → (b) 27/09.** A `sessao-feature` só abre com "executa" do dono; PR-0 (transcrição) ✅ 27/09.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** `DFE-MANUAL` — transformar o `FileEmissor` (X10b, BRIEF `BE-INCR-DFE` item 12: a "válvula"
  do ADR §6) num **modo manual** usável: o cliente sem parceiro emite a NFS-e no portal público a partir de uma
  ficha e devolve o **XML autorizado** ao Luminaris, que o **relê** e compara com a DPS enviada. A **releitura** é
  peça compartilhada: o adaptador da Focus ([`X10i`](../plano/nos/X10i.md)) a reusa.
- **Autorização (ORCH-006):** dono em chat, 2026-09-27: *"Certo, planeje com granularidade e atualize a documentação
  com nossas decisões do fiscal"*, respondendo à proposta de 26/09 cuja frase de gatilho era *"planeja a releitura +
  modo manual"*. **Cobre:** este BRIEF (backend) e o registro das decisões. **Não cobre:** código ("executa"), a tela
  (`FE-INCR-DFE`, nó vizinho — BRIEF próprio), o adaptador da Focus (`X10i` — BRIEF só depois de D5, ADR §10
  F-DFE-4), NFC-e e roteamento por tipo (`X10a`, dúvida D-2), import de compra via "NF-e recebidas" (F-PLAN-3).
- **Insumos lidos nesta sessão (arquivo:linha):**
  - `features/accounting/dfe/FileEmissor.ts` (inteiro): grava `payload` em `DFE_FILE_DIR/<ambiente>/<kind>/<ref>.json`;
    `consultar` lê `<ref>.result.json` e devolve só `status/numero/serie/nNFSe/chaveOuCodigo/valores/errors`
    (**descarta `xml`/`pdf`**); `cancelar` devolve sempre `REJECTED` `file_cancel_manual`; `capabilities =
    { numbersDps: false, consultar: true, cancelar: true, webhook: false }`.
  - `dfe/DfeEmissorPort.ts:14-80` (`DfeKind = 'NFSE' | 'NFE'`, `EmitirInput`, `EmissaoResult` com `xml?`/`pdf?:
    Buffer`, `CancelResult`, porta); `dfe/selectDfeEmissor.ts:23-42` (seleção **só por env**; `partner ∈ {null, file}`).
  - `services/FiscalDocumentEmissionService.ts:174-252` (`emit`: consome a sequência quando `!numbersDps` e grava
    `nDPS` no payload, `:188-194`; `DpsPayloadSchema.parse` antes de persistir, `:195`; `createSent` + audit
    `dfe.emitted` na tx; `porta.emitir` pós-commit, `:232-250`); `:689-724` (`toView` **não** expõe o payload).
  - `services/FiscalDocumentLifecycleService.ts:31-34` (transições `SENT|PROCESSING → AUTHORIZED|REJECTED|PROCESSING`);
    `:64-80` `consultarUm` e `:88-122` `pollPendingOnce` usam `selectDfeEmissor(process.env)` e **ignoram
    `doc.partner`**; o job **não** olha `capabilities.consultar`; `:195-248` `cancelar` (ramo `CANCELLED`: tx com
    `saleKey` renomeada + audit `dfe.cancelled`, depois `retireSourceDocument`); `:262-290` webhook (compara o `:partner`
    com o adaptador do env); `:292-414` `applyResult` (`AUTHORIZED` exige `partnerRef` + número + `chaveOuCodigo`; em
    `producao` faz upload do XML/PDF e `attachSourceDocument` **antes** da tx de transição; a checagem
    `isValidResultTransition` roda **fora** da tx, sobre o `doc` lido antes — não li se `repo.transition` re-checa).
  - `prisma/schema.prisma` `FiscalDocument` (`partner`, `partnerRef`, `serie Int`, `numero BigInt?` = nDPS nosso,
    `nNFSe`, `chaveOuCodigo`, `xmlAttachmentId`, `pdfAttachmentId`, `sourceDocumentId`, `errorsJson`, `deletedAt`;
    **sem** índice único em `chaveOuCodigo`) e `FiscalDocumentAttempt` (`ref @unique`, `payloadJson`, `resultJson`
    "retorno bruto SEM PII").
  - `dtos/DpsPayloadDto.ts:17-133` (`id` `^DPS\d{42}$`, `serie` 1–49999 [106] E0010, `nDPS` ≥ 1 — tudo `.strict()`);
    `dtos/FiscalDocumentDto.ts` (`CancelFiscalDocumentSchema`, `FiscalDocumentActionBodySchema`); `routes/dfe.ts`
    (8 rotas + webhook); `controllers/nfeController.ts:47` (`nfeUpload = makeUploadMiddleware(NFE_MIME_TYPES, 'file',
    MAX_NFE_SIZE_BYTES, false)` — molde de upload de XML); `audit/auditCanonical.ts:158-163` (`dfe.emitted`,
    `dfe.authorized`, `dfe.rejected`, `dfe.cancelled`).
  - [`BE-INCR-DFE-brief.md`](BE-INCR-DFE-brief.md) §1 (transcrição das linhas [102]+ do Anexo I — a **DPS**; E0010 =
    faixa de série **00001–49999 "aplicativo próprio"**; `nNFSe` [8] gerado pela Sefin Nacional) e itens 12, 18, 24–30.
  - `lib/nfeSignature.ts` + `server/test/helpers/nfeSignature.ts` (#403 — infraestrutura XMLDSig, só relevante ao F-MAN-1).
  - **Guia do Emissor Público Nacional Web v1.2** (gov.br, `guia-emissorpubliconacionalweb_snnfse-ern-v12.pdf`,
    104 p., sha256 `85982d1ee76b695abde6511da36a22cd048b984521d25493db3c4783936aa6c1`, lido 27/09 por extração de
    texto): login (p. 8–13), os 4 passos da emissão com a tabela de campos (p. 19–65), série/número da DPS (p. 20–21),
    "Baixar o XML da NFS-e" (p. 65), cancelamento (p. 79–81).
- **Nós vizinhos:** consome [`X10b`](../plano/nos/X10b.md) (porta, `FiscalDocument`, montagem da DPS — fato consumado,
  não se reescreve). É consumido por [`FE-INCR-DFE`](../plano/nos/FE-INCR-DFE.md) (ficha + upload + releitura na tela),
  [`X10i`](../plano/nos/X10i.md) (Focus reusa a releitura e a seleção por documento) e pelo runbook humano H2-DFE-MANUAL
  (Fase D do plano).

## Definição de pronto

Igual ao formulário: checklist numerado + contratos esboçados + forks listados, **não** decididos.

---

## 0. Decisões do dono que este BRIEF consome (transcritas — não são forks)

- **D-MAN-1** — existe um modo sem parceiro para quem não quer pagar a Focus; é **só NFS-e** (o portal público não
  emite NFC-e/NF-e). Dono 26/09, *"E se eu quiser uma versão facil de copy e cola pra quem não quer gastar com focus?"*,
  plano aprovado 27/09.
- **D-MAN-2** — a precisão vem da **releitura por nota** (XML autorizado × DPS enviada), não da digitação.
- **D-MAN-3** — nada de API direta com o governo (decisão 2 da nota): o modo manual usa o **portal web**, com o login
  do próprio cliente; o Luminaris não guarda credencial nem certificado.

## 1. O que o código faz hoje e o que muda (lido nesta sessão — grau: verificado, salvo indicação)

| Hoje (`FileEmissor`, X10b) | Consequência | Este BRIEF |
|---|---|---|
| A DPS vai para um arquivo em disco | A pessoa precisa abrir JSON cru; e o nome do arquivo contém `:` (`<docId>:<n>.json`), que no Windows vira fluxo alternativo do NTFS (**inferido, não testado**) | A DPS já está em `FiscalDocumentAttempt.payloadJson`; a tela lê de lá (item 14). Sem disco (F-MAN-3) |
| O retorno é um `.result.json` escrito à mão | Digitação do retorno; **XML e PDF nunca chegam** (`consultar` os descarta) | Retorno = **upload do XML autorizado**; número, chave e valores saem dele (item 11) |
| `cancelar` sempre `REJECTED` | Nota cancelada no portal fica `AUTHORIZED` no Luminaris para sempre | Cancelamento manual registrado (item 13) |
| Consome a sequência local e grava `nDPS` | O portal gera série e número da DPS sozinho por padrão (Guia do Emissor Web v1.2, p. 20): o número do Luminaris não bate com nenhuma DPS real | F-MAN-4 |
| Sem conferência do que foi emitido | Erro de digitação passa em silêncio | Releitura campo a campo (itens 2–6) |
| `consultar`/job/cancelar/webhook usam o adaptador do **env** | Com dois modos convivendo, documento é consultado pelo adaptador errado | Adaptador **do documento** (item 9) |
| Job consulta todo `SENT/PROCESSING` | Documento manual seria "consultado" a cada 2 min para sempre | Job pula adaptador sem `consultar` (item 10) |

## 2. Transcrição — ✅ FEITA 27/09 (PR-0): [`TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md`](fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md)

A releitura lê o XML da **NFS-e autorizada**, não a DPS. O BRIEF do X10b transcreveu só a DPS (linhas [102]+ da aba
`LEIAUTE DPS_NFS-e`). Falta, do **mesmo** Anexo I v1.01 (corpus `nfse-anexo-i`, sha256 `de5bc492959e`) e dos XSD
(`nfse-xsd`, sha256 `e7935cbd9470`):

1. As linhas **[1]–[101]** (grupo `infNFSe`: número da NFS-e, identificador/chave de acesso, data de processamento,
   valores apurados de ISS, e **se/como a DPS vem embutida**), com caminho, OCOR, TAM e RN.
2. O texto inteiro da **RN E0010** (faixas de série da DPS por tipo de aplicativo emissor) — base do F-MAN-4.
3. A estrutura do XML do **evento de cancelamento** `e101101` devolvido pelo portal (Anexo II + XSD de eventos) —
   base do F-MAN-5.

**Os binários não estão no git** (`fontes-oficiais/LEIA-ME.md`: "PDF, XLSX, ZIP… não fica"). Rebaixar exige
`node scripts/baixar-fontes-oficiais.mjs` — **download de gov.br, com permissão do dono** — e conferir o sha256 no
`MANIFEST.md`. **Feito em 27/09** (bytes e sha256 iguais ao manifesto). Resultado principal: a DPS vem **embutida**
na NFS-e em `NFSe/infNFSe/DPS`, então a releitura compara DPS com DPS pelos mesmos caminhos do BRIEF X10b §1; a
transcrição traz o mapa dos 13 campos (§3 dela), a E0010 (§5), a assinatura (§6), o evento (§7) e 3 divergências
planilha × XSD (§8).

---

## 3. Checklist de comportamentos

Tags: **[direto]** implementável sem fork; **[cond:F-MAN-n]** pausa até o fork; **[pendente-insumo]** só com o
insumo da §2. Cada item nomeia o teste que o exercita.

### Fase 0 — Insumo (docs, antes de qualquer código)

1. ✅ **[feito 27/09]** Transcrição [`TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md`](fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md)
   com os 3 blocos da §2, cada linha com a referência da planilha/XSD e o sha256 da fonte conferido com o `MANIFEST`.
   Critério: todo campo que os itens 2–3 leem tem linha citada.

### Fase A — Releitura (bibliotecas puras, sem Prisma — compartilhadas com o X10i)

2. **[direto]** `lib/nfse.ts` → `parseNfseAutorizada(xml)` **pura**: rejeita `<!DOCTYPE` (mesmo guarda
   XXE do `parseNfe`), XML mal-formado e documento sem o grupo `infNFSe`; extrai os campos do contrato `ParsedNfse`
   (§4), pelos caminhos da transcrição (§1–§3 dela; namespace `http://www.sped.fazenda.gov.br/nfse`; `@Id` é
   **atributo**). Dinheiro por **aritmética de string**: exportar e reusar o `moneyToCents` do `lib/nfe.ts` sem mudar
   comportamento — **não** re-inlinar a técnica (memória `reuse-criterion-blind-to-reinlined-technique`). Datas por
   reslice, nunca `new Date()` para data-only. Testável: fixture NFS-e fictícia de leiaute completo (montada da
   transcrição, mesma técnica da NF-e do E9) → todos os campos; `DOCTYPE` → rejeita; truncado → rejeita.
3. **[direto após 2]** `lib/nfseReadback.ts` → `compareNfseWithDps(enviada, autorizada)` **pura**, sobre uma lista
   **fechada** de campos (§4 `CampoComparado`), em dois grupos:
   - **identidade** — CNPJ do prestador; a nota não pode ser anterior ao documento (item 11 iii);
   - **conteúdo** — tomador (CPF/CNPJ), `cTribNac`, `cNBS`, local da prestação, `dCompet`, `vServ`, descontos,
     `tpRetISSQN`, `pAliq` (quando enviada), `IBSCBS` CST/`cClassTrib` (quando enviado).
   Normalização **declarada e fechada** (máscara, zeros à esquerda, `"0.00"` = ausente onde o leiaute diz), nunca
   comparação aproximada; centavos com tolerância **zero** (F-DFE-11: Σ nota = razão). Série, número e id da DPS
   **não** entram (F-MAN-4). Testável: nota igual → `[]`; cada campo mutado → exatamente 1 divergência
   `{ campo, grupo }`; campo ausente no XML → divergência `ausente` (nunca silêncio).
4. **[cond:F-MAN-1]** Autenticidade do XML enviado pelo usuário (assinatura XMLDSig da NFS-e).
5. **[direto]** Registro da releitura em `FiscalDocumentAttempt.resultJson` (coluna existente) como
   `{ releitura: { status: 'IGUAL' | 'DIVERGENTE', divergencias: [{ campo, grupo, enviado?, autorizado? }] } }`.
   **Sem PII:** para `toma.doc` grava só o nome do campo, nunca o CPF/CNPJ (a coluna é "retorno bruto SEM PII").
   Testável: divergência de CPF → o `resultJson` não contém o CPF (grep na string).
6. **[cond:F-MAN-2]** O que uma divergência de **conteúdo** faz com o documento.

### Fase B — Modo manual (adaptador, seleção por documento, rotas)

7. **[cond:F-MAN-3]** Adaptador do modo manual: `emitir` **não** grava disco (a DPS está no banco) e devolve
   `PROCESSING` com `partnerRef = ref`; `capabilities = { numbersDps: <F-MAN-4>, consultar: false, cancelar: false,
   webhook: false }`; `consultar`/`cancelar` lançam `ValidationError('dfe_manual: …')` (nunca inventam resultado).
   Testável: `emitir` não toca o `fs` (spy); documento fica `SENT`.
8. **[cond:F-MAN-4]** Numeração da DPS no modo manual.
9. **[direto]** **Adaptador por documento:** registro `resolveEmissor(name)` na factory; `consultarUm`,
   `pollPendingOnce`, `cancelar` e o retorno manual usam o adaptador de `doc.partner`; o env escolhe só o adaptador
   das **novas** emissões. Adaptador do documento ausente no registro ⇒ `ValidationError('dfe_adapter_unknown: …')`
   (skip+log no job, classe `erro-especifico-para-skip-em-job`). O webhook fica como está (é do X10i).
   Testável: documento criado com `partner=manual` e env trocado para `null` → o job **não** chama o `NullEmissor`.
10. **[direto]** Documento cujo adaptador não consulta (`capabilities.consultar === false`): o job o conta como
    `skipped` sem escrita; `POST …/:id/consultar` devolve 409 `dfe_consulta_manual` ("registre o retorno pelo XML").
    Testável: documento manual `SENT` há 3 min → `summary.skipped = 1`, zero `transition`.
11. **[cond:F-MAN-2 ✅ c]** **Retorno manual — autorização:** `POST /api/nfe/dfe/documents/:id/retorno-manual`
    (multipart: `file` = XML da NFS-e autorizada, `pdf?` = DANFSe opcional; `unitId` no corpo), com o mesmo molde de
    upload do `nfeUpload` (mime de XML, teto de tamanho, magic-bytes desligado; PDF com o seu próprio mime). Ordem:
    1. policy `canEmitFiscalDocument`; documento no escopo com `partner` = modo manual e status `SENT|PROCESSING`;
    2. `parseNfseAutorizada` → `compareNfseWithDps` contra a DPS da **tentativa corrente**;
    3. **guardas de identidade, sempre duras (422, nada escrito):** (i) CNPJ do prestador = CNPJ da unidade;
       (ii) a chave da nota não está em outro `FiscalDocument` do mesmo usuário (checagem **dentro** da tx — sem
       índice novo: fluxo manual, baixa concorrência; `ponytail:` índice único em `(userId, chaveOuCodigo)` quando o
       X10i trouxer webhook concorrente, atenção à classe `unique-de-idempotencia-x-soft-delete`); (iii) a data/hora
       de processamento da nota é **posterior** ao `createdAt` do documento (nota emitida antes da ficha existir não é
       desta ficha); (iv) **origem**: `infNFSe/ambGer = 2` (Sefin Nacional) e `infNFSe/procEmi ∈ {2, 3}` (Web ou App
       do fisco) — transcrição §2, linhas [15] e [17]; nota emitida por API de terceiro (`procEmi = 1`) ou por sistema
       municipal (`ambGer = 1`) não saiu desta ficha;
    4. divergência de **conteúdo** → F-MAN-2;
    5. autorização pelo **mesmo** caminho do `applyResult` (um `EmissaoResult` montado do XML: `partnerRef` = ref da
       tentativa, `nNFSe`, `chaveOuCodigo`, série/número da DPS do XML, valores de ISS do XML, `xml` = o buffer,
       `pdf?`) → em `producao`: anexos + `SourceDocument` (ADR §9.2 item 5); em `homologacao`: nada anexado;
    6. status re-checado **dentro** da tx de transição (classe `authoritative-gate-inside-tx`): segundo upload da
       mesma nota ⇒ 409 `dfe_status_invalido`, sem 2º `SourceDocument`.
    Testável: upload válido → `AUTHORIZED` + 1 `SourceDocument` + `xmlAttachmentId` (em `producao`-de-teste por env
    fake, não `NODE_ENV`); 2º upload → 409 e contagem de `SourceDocument` inalterada; XML com CNPJ de outro prestador
    → 422; XML com data anterior ao documento → 422; nota com 1 campo divergente → comportamento do F-MAN-2.
12. **[direto]** **Retorno manual — rejeição:** `POST …/:id/rejeicao-manual { unitId, errors: [{ code, message }] }`
    → `REJECTED` pelo caminho existente (`errorsJson` + audit `dfe.rejected`); o reenvio existente (`POST …/reenviar`)
    cria a tentativa n+1 com a DPS **remontada** (perfil/venda corrigidos). Uso: o portal recusou os dados e é preciso
    corrigir o cadastro antes de tentar de novo. Testável: rejeição → `REJECTED`; reenviar → tentativa 2 com `ref`
    novo e a tentativa 1 intacta (assere a **segunda** leitura — classe `comentario-de-teste-afirma-o-que-nao-assere`).
13. **[cond:F-MAN-5 ✅ a]** **Cancelamento manual:** `POST …/:id/cancelamento-manual` (`unitId`,
    `cMotivo` 1|2|9, `xMotivo` 15–255 — reusa `CancelFiscalDocumentSchema`; + `file?` conforme F-MAN-5) → só de
    `AUTHORIZED` e só para documento do modo manual → **o mesmo ramo `CANCELLED` do `cancelar`** (tx com `saleKey`
    renomeada + audit `dfe.cancelled`, depois `retireSourceDocument`), **sem** chamar a porta. Policy
    `canCancelFiscalDocument`. Não toca venda nem razão. Testável: `AUTHORIZED` → `CANCELLED`, `SourceDocument`
    aposentado, contagem de lançamentos antes/depois igual.
14. **[direto]** **Dados da ficha:** `GET …/documents/:id/ficha?unitId=` devolve a DPS da tentativa corrente
    (`payloadJson` como objeto) + `status` + `currentAttemptNo`. **Só dados crus:** máscara, vírgula decimal e ordem
    das etapas do portal são da tela (`FE-INCR-DFE`). Policy `canReadFiscalDocument`. Testável: documento `SENT` →
    payload da tentativa corrente; documento de outro escopo → não encontrado.
15. **[direto]** Audit: `dfe.manual_result` no allowlist `auditCanonical.ts` **na mesma mudança**, com
    `['documentId', 'attemptNo', 'releitura', 'nDivergencias']` (`releitura` ∈ `IGUAL|DIVERGENTE`; nomes de campo
    divergentes **não** entram — ficam no `resultJson`). Autorização/rejeição/cancelamento manuais reusam
    `dfe.authorized`/`dfe.rejected`/`dfe.cancelled` como estão. Testável: guarda de cobertura do allowlist verde.
16. **[direto]** Rotas em 2 toques (`routes/dfe.ts` + `docs.paths.ts`); DTOs Zod `.strict()` (§4); snapshot de shape
    dos DTOs; guarda de contagem de paths do OpenAPI (**+4**: `retorno-manual`, `rejeicao-manual`,
    `cancelamento-manual`, `ficha`); `tsc` limpo.
17. **[cond:F-MAN-3]** Saída do caminho em disco: some o `.result.json`, e com ele o nome de arquivo com `:`. Se o
    F-MAN-3 mantiver o adaptador de disco, o nome do arquivo passa a usar um separador válido no Windows (`_`) — com
    teste que roda no Windows local **e** no CI Linux (classe `gate-predicate-environment`).

### Fase C — Prova (gate humano, sem sessão de agente — Fase D do plano)

18. Runbook `RUNBOOK-H2-DFE-MANUAL.md` em branco (formato `RUNBOOK-FORMAT`): uma NFS-e emitida pela ficha com releitura
    `IGUAL` e uma com erro de digitação proposital que a releitura aponta. **O agente prepara em branco; evidência,
    desfecho e assinatura são do dono.** Depende da tela (`FE-INCR-DFE`).

---

## 4. Contratos esboçados

```ts
// lib/nfse.ts — PURA (sem Prisma, sem tx). Caminhos: transcrição §1–§3 (ns http://www.sped.fazenda.gov.br/nfse).
export interface ParsedNfse {
  nNFSe: string;                 // número da NFS-e (Sefin Nacional — BRIEF X10b §1, [8])
  chaveAcesso: string;           // infNFSe/@Id sem o literal "NFS" — TSChaveNFSe [0-9]{50}
  ambGer: 1 | 2;                 // infNFSe/ambGer [15] — guarda de origem (iv)
  procEmi: 1 | 2 | 3 | null;     // infNFSe/procEmi [17] — guarda de origem (iv)
  cStat: '100' | '102' | '103' | '107'; // infNFSe/cStat [18]
  emitDoc: string;               // infNFSe/emit/CNPJ|CPF [22]/[23]
  dhProc: string;                // infNFSe/dhProc [19], TSDateTimeUTC com fuso — guarda (iii), compara instantes
  valores: {                     // infNFSe/valores: vBC [41], pAliqAplic [42], vISSQN [43], vLiq [45]
    baseIssCents?: string; aliqIssBp?: number; vIssCents?: string; vLiqCents?: string;
  };
  dps: {                         // infNFSe/DPS/infDPS — embutida (1-1); caminhos de cada campo: transcrição §3
    serie: string; nDPS: string; dCompet: string; // AAAA-MM-DD
    prestCnpj: string;
    toma: { tipo: 'CPF' | 'CNPJ'; valor: string } | null;
    cTribNac: string; cNBS?: string; cLocPrestacao: string;
    vServCents: string; vDescIncondCents?: string; vDescCondCents?: string;
    tpRetISSQN: 1 | 2; pAliqBp?: number;
    ibsCbs?: { cst: string; cClassTrib: string };
  };
}
export function parseNfseAutorizada(xml: string | Buffer): ParsedNfse; // ValidationError('nfse_…') em falha

// lib/nfseReadback.ts — PURA
export type CampoComparado =
  | 'prest.CNPJ'                                   // identidade
  | 'toma.doc' | 'cTribNac' | 'cNBS' | 'cLocPrestacao' | 'dCompet' | 'vServ'
  | 'vDescIncond' | 'vDescCond' | 'tpRetISSQN' | 'pAliq' | 'IBSCBS.CST' | 'IBSCBS.cClassTrib'; // conteúdo
export interface Divergencia {
  campo: CampoComparado;
  grupo: 'identidade' | 'conteudo';
  tipo: 'diferente' | 'ausente';
  enviado: string | null;        // null quando o campo é PII (toma.doc) — nunca persiste o valor
  autorizado: string | null;
}
export function compareNfseWithDps(enviada: DpsPayload, autorizada: ParsedNfse): Divergencia[];

// Persistido em FiscalDocumentAttempt.resultJson (SEM PII)
type ReleituraJson = { releitura: { status: 'IGUAL' | 'DIVERGENTE'; divergencias: Array<Omit<Divergencia, 'enviado' | 'autorizado'> & { enviado?: string; autorizado?: string }> } };

// Porta — adaptador do modo manual (nome e env: F-MAN-3)
const MANUAL_CAPABILITIES: DfeCapabilities = { numbersDps: /* F-MAN-4 */ true, consultar: false, cancelar: false, webhook: false };
export function resolveEmissor(name: string): DfeEmissorPort | null; // por documento (item 9)
// selectDfeEmissor(env) continua escolhendo o adaptador das NOVAS emissões
```

```ts
// dtos/FiscalDocumentDto.ts — entradas novas (multipart: o arquivo vem pelo multer, o corpo pelo Zod)
export const RetornoManualBodySchema = z.object({ unitId: z.string().min(1) }).strict(); // + file (XML), pdf?
export const RejeicaoManualSchema = z.object({
  unitId: z.string().min(1),
  errors: z.array(z.object({ code: z.string().min(1).max(20), message: z.string().min(1).max(500) }).strict()).min(1).max(20),
}).strict();
// cancelamento-manual: reusa CancelFiscalDocumentSchema (unitId, cMotivo 1|2|9, xMotivo 15–255) + file? (F-MAN-5)
// ficha: FiscalDocumentParamsSchema + FiscalDocumentScopeQuerySchema (existentes)
```

**Saídas:** `retorno-manual` 200 → `FiscalDocumentView` + `releitura`; 409 `dfe_status_invalido`; 422
`dfe_identidade_divergente` (itens 11 i–iii, com a lista de divergências **sem valores de PII**); o destino de uma
divergência de conteúdo é o F-MAN-2. `ficha` 200 → `{ documentId, status, currentAttemptNo, payload: DpsPayload }`.

---

## 5. Forks — RATIFICAÇÃO PENDENTE

### F-MAN-1 — Conferir a assinatura do XML que o usuário envia?

- **(a)** Sim: verificar a XMLDSig da NFS-e com a infraestrutura do #403 (`xml-crypto`). Regra (transcrição §6):
  E1630 integridade + E1634 certificado com OtherName de CNPJ ou CPF; o titular **não** é amarrado ao prestador (quem
  assina é a Sefin Nacional, cujo CNPJ não consta no corpus); cadeia ICP (E1632) = F-SIG-3 (c).
- **(b)** Não no MVP: quem envia é o próprio contribuinte, sobre a própria nota; a releitura garante que o conteúdo
  bate com o que o Luminaris mandou, e a chave fica gravada e consultável no ADN. Nó futuro junto com a cadeia
  ICP (F-SIG-3 c).
- **Recomendação: (b).** O risco que a assinatura cobre (XML forjado) é o usuário enganando a si mesmo; o risco real
  (digitação errada) é o que a releitura pega. **PENDENTE.**

### F-MAN-2 — Divergência de conteúdo: o que acontece com o documento?

- **(a)** Bloqueia: 422 com as divergências, documento continua `SENT`; a pessoa cancela a nota errada no portal e
  emite de novo.
- **(b)** Registra a realidade: `AUTHORIZED` com a releitura `DIVERGENTE` gravada e a pendência
  `releitura_divergente` na lista do documento (mesmo mecanismo de `sale_cancelled_with_live_document`); a tela exige
  ação (cancelar e reemitir, ou aceitar com justificativa).
- **(c)** Status novo `AUTHORIZED_DIVERGENT` na máquina de estados.
- **Recomendação: (b).** A nota **existe** no ambiente nacional, emitida pelo CNPJ do cliente, quer o Luminaris a
  aceite ou não. Esconder uma nota autorizada é pior que mostrá-la com defeito: (a) deixa o razão sem a nota que o
  fisco vê, e o PNCT (D7) cobra correção com prazo. (c) espalha um estado novo por toda a máquina sem ganho sobre
  a pendência. **PENDENTE.**

### F-MAN-3 — Nome e compatibilidade do adaptador

- **(a)** Renomear `FileEmissor` → `ManualEmissor`, `DFE_PARTNER=manual`; `file` deixa de existir (nenhuma instalação
  em produção — M2 aberto).
- **(b)** Manter o nome `FileEmissor`/`file` e só mudar o comportamento.
- **(c)** Adaptador novo ao lado; `FileEmissor` continua (disco, uso por linha de comando).
- **Recomendação: (a).** Depois da mudança o adaptador não grava arquivo nenhum, e o nome `file` passaria a mentir.
  (c) mantém vivo o caminho com o nome de arquivo inválido no Windows. **PENDENTE.**

### F-MAN-4 — Quem numera a DPS no modo manual?

- **(a)** O portal numera: `numbersDps: true`, a sequência local **não** é consumida, a ficha **não** mostra série nem
  número, e série/número voltam do XML no retorno (gravados em `serie`/`numero`). O `DpsPayloadSchema` ganha uma
  variante do modo manual sem `id`/`serie`/`nDPS` (hoje os três são obrigatórios).
- **(b)** O Luminaris numera e a pessoa marca a opção "informar a DPS" no portal e digita série e número.
- **Recomendação: (a).** **Verificado no Guia do Emissor Público Nacional Web v1.2 (p. 20–21):** série e número da
  DPS "em geral, … são gerados automaticamente pelo sistema"; existe a opção de informá-los à mão, e aí a série "deve
  ser um número entre 80.000 e 89.999" (regra "Faixas de utilização da série da DPS", Anexo IV do ADN — fora do
  corpus). A série do Luminaris (1–49999, "aplicativo próprio", E0010) não vale no portal. (b) exigiria uma série
  própria do modo manual dentro de 80.000–89.999 e duas digitações a mais por nota, sem ganho: a releitura já traz
  série e número de volta pelo XML. **PENDENTE.**

### F-MAN-5 — Que prova o cancelamento manual exige?

- **(a)** O XML do evento de cancelamento baixado do portal: parse + guarda de que o evento é da chave deste documento.
- **(b)** Só a declaração do operador (motivo + texto).
- **(c)** (a) em `producao`, (b) em `homologacao`.
- **Recomendação: (a).** O cancelamento aposenta a proveniência no razão (`retireSourceDocument`); mexer no razão por
  declaração é o que a casa evita ("agente não substitui oráculo" vale também para operador sem prova). Custo: depende
  da transcrição do evento (item 1). **PENDENTE.**

### RATIFICAÇÃO — 2026-09-27 (dono, questionário: *"ratifica os forks"*)

| Fork | Decisão | Contra a recomendação? | Efeito no checklist |
|---|---|---|---|
| **F-MAN-1** | **(a) conferir a assinatura já** | **SIM** | Item 4 vira **[direto]**: verificação XMLDSig do XML enviado com `lib/nfeSignature.ts` (reuso, sem dependência nova) pela regra E1630 + E1634 (transcrição §6) — certificado com OtherName de CNPJ/CPF, **sem** amarrar o titular ao prestador (quem assina é a Sefin Nacional); a regra "CNPJ-raiz = emitente" do SIG-NFE não se aplica — mesmo desenho do caso NFA-e `procEmi=1` do #403. Assinatura inválida ou ausente ⇒ 422, nada escrito (mesma regra do F-SIG-1 a) |
| **F-MAN-2** | **(c) status novo `AUTHORIZED_DIVERGENT`** | **SIM** | Ver "Efeitos do F-MAN-2 (c)" abaixo |
| F-MAN-3 | (a) `ManualEmissor`, `DFE_PARTNER=manual`; `file` some | não | itens 7 e 17: sem caminho em disco, some o nome com `:` |
| F-MAN-4 | (a) o portal numera | não | item 8: `numbersDps: true`; variante do `DpsPayloadSchema` sem `id`/`serie`/`nDPS`; série e número gravados a partir do XML |
| F-MAN-5 | (a) XML do evento | não | item 13 exige `file` com o evento de cancelamento da chave deste documento |

**Efeitos do F-MAN-2 (c)** — a `sessao-feature` implementa exatamente isto (e nada além):

1. `FiscalDocument.status` aceita `AUTHORIZED_DIVERGENT` (coluna `String`: sem migração; atualizar o comentário do schema).
2. Transições: `SENT|PROCESSING → AUTHORIZED_DIVERGENT` **só** pelo retorno com releitura `DIVERGENTE` (manual agora; Focus
   no X10i); `AUTHORIZED_DIVERGENT → CANCELLED` pelo cancelamento manual (item 13) e pelo `cancelar` do parceiro. O teste
   da tabela de transições cobre o estado novo nos dois sentidos.
3. Em `producao` o documento `AUTHORIZED_DIVERGENT` **anexa XML e `SourceDocument` como o `AUTHORIZED`**: a nota existe no
   ambiente nacional, e o razão tem de apontar para ela.
4. Pendência derivada `releitura_divergente` na lista do documento; guardas que hoje olham `AUTHORIZED` (venda cancelada
   com documento vivo, `@@unique` pela `saleKey`, cancelamento) passam a olhar `AUTHORIZED | AUTHORIZED_DIVERGENT` —
   varrer os `status === 'AUTHORIZED'` do módulo e listar cada um no PR.
5. Audit: reusa `dfe.manual_result` (`releitura = DIVERGENTE`).
6. **Sub-fork F-MAN-2b — ✅ RATIFICADO (b) 27/09 (dono: "só cancelando"):** existe saída `AUTHORIZED_DIVERGENT → AUTHORIZED` ("aceitar a divergência com
   justificativa")? **(a)** sim, com justificativa 15–255 + audit + policy de cancelar; **(b)** não — só cancelando e
   reemitindo. Recomendação: **(b)** — a divergência é fato da nota emitida; "aceitar" esconde erro que o PNCT cobra.

## 6. Pendente de validação externa (fonte citada, grau declarado)

| # | Regra | Fonte | Grau | Quem fecha |
|---|---|---|---|---|
| p1 | Faixas de série da DPS: 1–49999 "aplicativo próprio" (E0010); **80.000–89.999 quando digitada no emissor web** | Anexo I E0010 (BRIEF X10b §1) + Guia do Emissor Web v1.2, p. 21 (que cita o Anexo IV do ADN) | verificado (o Anexo IV em si não está no corpus) | — |
| p2 | O portal aceita login por CPF/CNPJ e senha, sem certificado (também por certificado ou gov.br) | Guia do Emissor Web v1.2, p. 8, 12 e 13 | **verificado** | — |
| p3 | O portal tem ambiente de teste (produção restrita) para emissão manual | o gov.br publica uma versão do mesmo guia na pasta `producao-restrita` (v1.2.1) | secundária (indício pelo caminho do arquivo) | abrir a versão de produção restrita do guia |
| p4 | Prazo de cancelamento é do município (RN E0822) | Anexo II (BRIEF X10b p9) | verificado | — (a tela mostra o erro do portal) |
| p5 | Quem assina o XML da NFS-e | Anexo I RN E1630/E1634/E1638 + Anexo II (transcrição §6–§7): o sistema gerador (Sefin Nacional); E1638 (certificado do município) só vale para NFS-e municipal compartilhada | verificado a regra; **o CNPJ da Sefin não consta no corpus** | — (o verificador não precisa dele) |

## 7. Insumos ausentes

- **I-1** — ✅ **resolvido 27/09**: corpus rebaixado com permissão do dono (hashes iguais ao manifesto) e transcrito.
- **I-2** — ~~prints das telas do portal~~ **substituído em 27/09** pelo Guia oficial do Emissor Público Nacional
  Web v1.2 (104 p., com as telas e a tabela de campos de cada passo). Prints do dono só se o portal ao vivo divergir
  do guia.
- **I-3** — ~~FAQ gov.br v1.1~~ dispensável: o guia fechou p2 e deu a base do F-MAN-4.

## 8. Achados fora de escopo

1. **`applyResult` (X10b) faz upload e `attachSourceDocument` antes da tx de transição**, e a checagem de transição
   roda fora da tx. Com dois caminhos concorrentes (webhook + poll, no X10i) pode sobrar `DocumentAttachment` órfão;
   `attachSourceDocument` é idempotente por `externalRef`, então não duplica proveniência. O retorno manual (item 11)
   re-checa dentro da tx, mas herda a ordem do upload. Não planejado aqui.
2. **O webhook compara o `:partner` com o adaptador do env** — mesmo tema do item 9, deixado para o X10i (o modo
   manual não tem webhook).
3. **NFC-e não existe na porta** (`DfeKind = 'NFSE' | 'NFE'`). O salão que vende no balcão precisa dela, e ela é
   obrigatória desde 03/08/2026 para o regime normal (Ato Conjunto 4, art. 1º II). Fork F-PLAN-2 do plano ([`X10a`](../plano/nos/X10a.md)).
4. **A nota fictícia de NF-e de compra** (`purchase-full-layout.SYNTHETIC.xml`, 26/09) é a ponte do E9, não deste nó.
5. **`pAliq` do `DpsPayloadSchema` (X10b) aceita 2 dígitos inteiros** (`\d{1,2}\.\d{2}`); o XSD usa `TSDec1V2`
   = `0|[0-9](\.[0-9]{2})?` — "10.00" passa no schema e o governo recusa (transcrição §8, divergência 3). Não corrigido
   aqui.

## 9. Plano de execução por fatias (para a `sessao-feature`)

| PR | Itens | Depende de |
|---|---|---|
| PR-0 (docs) | 1 — transcrição | I-1 (permissão de download) |
| PR-1 (libs puras) | 2, 3, 5 | PR-0 |
| PR-2 (adaptador + seleção por documento + job) | 7, 8, 9, 10, 17 | F-MAN-3, F-MAN-4 |
| PR-3 (rotas manuais + guardas + audit + OpenAPI) | 4, 6, 11–16 | PR-1, PR-2, F-MAN-1, F-MAN-2, F-MAN-5 |

PR-2 não depende da transcrição e pode andar em paralelo com PR-0/PR-1 depois dos forks F-MAN-3/4.

### PR-0 em passos (docs, sem código de aplicação — autorização: dono 27/09 *"pode baixar"* + *"planejar com granularidade o que vc vai fazer"*)

| # | Passo | Saída | Critério de pronto |
|---|---|---|---|
| 0.0 | ✅ Baixar `nfse-anexo-i`, `nfse-anexo-ii`, `nfse-xsd` com `--so=<id>` e **restaurar o `MANIFEST.md`** (o `--so` reescreve o manifesto só com o item) | binários locais (fora do git) | bytes e sha256 iguais ao manifesto: `de5bc492959e`, `5abe83d7e510`, `e7935cbd9470` — conferido 27/09 |
| 0.1 | ✅ Extrair as abas por script descartável (scratchpad; `unzip` do xlsx + leitura do XML das planilhas): Anexo I `LEIAUTE DPS_NFS-e` linhas 1–101 e `RN DPS_NFS-e` (E0010 + as RNs citadas nessas linhas); Anexo II `TIPO EVENTOS DE NFSe`, `LEIAUTE EVENTO_PED.REG.EVENTO` e `RN EVENTO_PED.REG.EVENTO` (só `e101101`) | texto bruto no scratchpad | nº de linhas extraídas = nº de linhas da aba |
| 0.2 | ✅ Ler o XSD 1.01: `NFSe_v1.01.xsd`, `tiposComplexos_v1.01.xsd` (grupo `infNFSe` e a DPS embutida), `evento_v1.01.xsd` + `tiposEventos_v1.01.xsd` | nomes de tag, hierarquia, ocorrência, onde fica a `Signature` | todo campo da planilha achado no XSD ou listado como divergência |
| 0.3 | ✅ Cruzar planilha × XSD | seção "divergências" | **XSD vence para nome e estrutura; planilha vence para regra de negócio** — cada divergência registrada, nenhuma resolvida de memória |
| 0.4 | ✅ Quem assina a NFS-e (p5, exigido pelo F-MAN-1): procurar na RN e na documentação do XSD; se não estiver, baixar `nfse-manual-adn`/`nfse-manual-emissor` (mesma permissão) e restaurar o manifesto de novo | resposta com fonte | fonte citada, ou "não consta no corpus" declarado |
| 0.5 | ✅ Escrever `fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md` | a transcrição: (a) tabela campo → caminho → OCOR → TAM → RN, com aba:linha ou xsd:elemento; (b) **mapa dos 13 `CampoComparado` para as tags reais**; (c) E0010 com as faixas; (d) evento `e101101`; (e) assinatura; (f) sha256 das 3 fontes | cada campo dos itens 2, 3, 4, 11 e 13 tem linha citada |
| 0.6 | ✅ Patch no BRIEF: item 1 ✅; §4 troca "papel" por nome de tag; p5 resolvido; tira `[pendente-insumo:1]` dos itens 2, 11 e 13 | BRIEF atualizado | nenhum "(transcrição)" sobrando no contrato |
| 0.7 | ✅ Conferências: links dos docs novos, `node scripts/plano-vault.mjs check`, `git status` sem binário do corpus | — | check 0; nenhum `.xlsx`/`.zip` staged |

Fora do PR-0: a fixture NFS-e fictícia (é do PR-1) e qualquer código.

## 10. Gates de envio [OPS-001]

1. **Objetivo, não a letra:** o objetivo é emitir NFS-e sem parceiro com precisão **conferida**, e a §3 entrega isso
   pela releitura (itens 2–6, 11), não por "ficha bonita".
2. **Grau:** a §1 é verificada por leitura, salvo o `:` no Windows (inferido); a base do F-MAN-4 e o p2 foram
   verificados no guia oficial do emissor web (27/09); o p3 é secundário.
3. **Caso adversarial tentado:** "e se a pessoa subir o XML de outra nota?" — sem as guardas de identidade o F-MAN-2 (b)
   autorizaria a nota errada; daí as guardas duras 11 i–iii, que não dependem de fork.
4. **Checagem que falharia se eu estivesse errado:** o teste do item 9 (documento manual com env trocado não chama o
   `NullEmissor`) falha no código de hoje — é o que prova que a seleção por env é o problema.
5. **Risco principal:** a transcrição (item 1) está feita, mas foi validada contra o leiaute, não contra um XML real
   de NFS-e — o primeiro XML de verdade (H2-DFE-MANUAL) é o oráculo; e o F-MAN-2 (c) espalha um estado novo pelo
   módulo, o que pede a varredura do item "Efeitos" antes do PR-3.
