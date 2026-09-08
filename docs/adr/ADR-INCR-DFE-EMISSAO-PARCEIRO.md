# ADR-INCR-DFE-EMISSAO-PARCEIRO — Documento fiscal de saída (NFS-e nacional / NF-e) montado até a borda e entregue a um parceiro emissor por API

- **Data:** 2026-09-08
- **Status:** **Proposed — rodada 6 do `PLANO-SDD-SEQUENCIAL-2026-09-07.md` (só ADR + BRIEF agora; a
  implementação espera o parceiro contratado — dado externo D5).** Forks §5 **RATIFICAÇÃO PENDENTE**;
  **R4 já ratificado 2026-09-08** (credencial por tenant, BYOK — §3 D2). **NENHUM código escrito.**
- **Autores:** orquestrador (esta sessão) + parecer do `luminaris-accounting-architect` (a anexar como
  `PARECER-ARCHITECT-ADR-INCR-DFE-EMISSAO-PARCEIRO.md`, precedente dos ADRs #274/#276).
- **Autorização (ORCH-006):** cédula de módulos 2026-09-03 **F-M7 → (d)**, palavras do dono: *"chegar até
  a ponta da emissão para poder exportar e enviar a um parceiro emissor via API"*; master map §5 linha
  "Emissão de DF-e via parceiro emissor (API)" ⚫→⏳ "autorizado a abrir ADR"; cédula E.3 **X10**; plano
  rodada 6 (*"escreve o ADR da emissão via parceiro"*, dono 2026-09-07 "dispara a próxima sessão…").
- **Nó do master map:** §5 "Emissão de DF-e via parceiro emissor (API)"; §7.1 fiscal nó **13** (0/1).
  Grafo: **X10** (depende de X6b ✅ #280, **D5** parceiro + certificado, **R4** ✅). Gera **D7** (vigilância
  PNCT até 31/12/2026).
- **Supersedes:** none · **Related:** `ADR-INCR-NFE-fiscal-ingestion` (a NF-e **de entrada**; F-NFE3 já
  nomeou `FiscalDocument` como "a casa se a volumetria crescer" — este ADR é essa casa, para o documento
  **de saída**), `ADR-INCR8-source-document-provenance` (o retorno autorizado vira `SourceDocument`),
  `ADR-M2-deploy-topology` (BYOK por env, 1 instância por cliente — molde da credencial), `ADR-INCR-NFE
  §10`/cédula integração (lição F-I2: leiaute entendido ≠ leiaute real), `BE-INCR-CNPJ-ALFA` (#280: CNPJ
  alfanumérico no emitente/tomador), `ADR-INCR-SPED-ECF-FASE3` (F-M8: "atende Lucro Real trimestral" —
  mesma técnica de declarar restrição de qualificação, ver F-DFE-8).

## TLDR (2 linhas)

O Luminaris **não emite**: monta o documento fiscal de saída completo (DPS da NFS-e nacional; NF-e 55 de
venda na fase 2) a partir da venda finalizada e do **perfil fiscal** da unidade/serviço, e o entrega a um
**parceiro emissor** por HTTP através de uma **porta** (`DfeEmissorPort`) com adaptador por parceiro;
certificado, autorização, contingência e rejeição ficam no parceiro. O retorno autorizado vira
`SourceDocument` + anexo do lançamento da venda (reuso do seam NFE-X); nada é relançado.

## 1. Contexto e objetivo

1. **Prazo legal** — Ato Conjunto RFB/CGIBS nº 4/2026 (PDF oficial lido em 2026-09-07,
   `luminaris-gates\Ato_Conjunto_RFB_CGIBS_4_2026.pdf`): NF-e 55 obrigatória para fatos geradores desde
   **03/08/2026** (art. 1º I); para o sujeito passivo de IBS/CBS **não contribuinte de ICMS**, a NF-e começa
   em **01/12/2026** (§ 4º); **NFS-e** para serviços sujeitos ao ISS **não** enquadrados nas alíneas a–c:
   **01/10/2026** (III d) — é onde cai o salão (serviços de beleza, lista anexa à LC 116/2003, subitens 6.01/
   6.02 [fonte: secundária, confirmar no pedido ao contador]); **optantes do Simples Nacional: 01/01/2027**
   (§ 1º). Art. 2º prometeu o programa de conformidade → **Ato nº 5/2026, PNCT 2026** (cédula item 10):
   enquadramento automático, correção de inconsistências até 31/12/2026, contador indicado recebe as
   inconsistências.
2. **NFS-e nacional** — modelo unificado com **DPS** (Declaração de Prestação de Serviço) no lugar do RPS,
   **ADN** (Ambiente de Dados Nacional) como repositório, emissão pelo Emissor Nacional (web ou API) e
   grupos **IBS/CBS** (`cClassTrib`) no leiaute [fontes secundárias convergentes — TecnoSpeed, Notaas, CRC-MA
   (suspensão da API atual do DANFSe em 07/2026); **primária pendente**: manual de integração NFS-e nacional
   e NT 004 v2.00, a baixar como fez com o Manual ECF].
3. **O produto** (F-Z0, cédula de módulos): *"substituir completamente todo o processo manual de contabilidade
   … e enviar até a ponta para API de emissão de nota fiscal"*. A camada zero diz que a escrituração nasce
   aqui; a emissão do documento fiscal é a **ponta de saída** dessa cadeia. O dono descartou emitir
   diretamente (certificado A1/A3, série, contingência, rejeições = "outro produto dentro do produto") e
   escolheu **(d)**: montar até a borda e entregar a um parceiro.
4. **Objetivo deste ADR:** fixar (a) o modelo do documento de saída como entidade **Prisma first-class**,
   (b) a porta/adaptador do parceiro, (c) onde vive a credencial (R4), (d) como o resultado entra no razão,
   (e) os forks que o dono ratifica antes do BRIEF. **Não** escolhe o parceiro (dado externo D5).

## 2. Evidência de código (CBM-001 — confirmado por leitura em `origin/main` `af35bfc9`)

| Fato | Onde | Consequência |
|---|---|---|
| NF-e **de entrada** já existe: parser puro, import de compra, cruzamento de venda, preview | `server/src/routes/nfe.ts` (3 POSTs), `lib/nfe.ts`, `NfeImportService`, `NfeSaleReconciliationService`, `NfePreviewService` | a saída **não** reusa o parser (é o sentido inverso), mas reusa o **vocabulário** (`chaveAcesso`, `SourceDocument.externalRef`) e o seam de anexo |
| Seam de proveniência em lançamento já postado | `PostingService.attachSourceDocument` (NFE-X #228), usado por `NfeSaleReconciliationService.ts:64-100` | o documento **autorizado** entra no razão pelo mesmo caminho: 1 `SourceDocument` no lançamento `sale.finalized` da venda |
| `SourceDocument` (sourceType, externalRef, documentDate, attachmentId, rawJson) e `DocumentAttachment` (sha256, storageKey, mimeType) | `schema.prisma:761-783`, `:566-582` | XML/PDF devolvidos pelo parceiro cabem em `DocumentAttachment`; o `externalRef` humano = chave/número da NFS-e |
| Porta de integração já é padrão da casa | `sync/AccountingSyncPort.ts` (application-level port, invocada pós-commit por controller, nunca de dentro do motor DynamicTable) | `DfeEmissorPort` segue o mesmo desenho: interface + adaptadores, chamada de serviço/controller, jamais de plugin |
| **Não existe** `FiscalDocument`, nem SDK de parceiro, nem campo fiscal de serviço | grep `FiscalDocument|nfse|NFSe|DPS` em `server/src` → 0; `package.json` sem dep de emissor | tudo é novo; F-NFE3 do ADR-NFE já reservou o nome `FiscalDocument` |
| Dados da **unidade** (emitente) | preset `modules/core/UnitsModule.ts`: `name, cnpj, address, managerId, type` | **faltam** IM, CNAE, regime, código do município (IBGE), série/numeração — vão para o **perfil fiscal** (D5/F-DFE-6) |
| Dados do **serviço** | preset `modules/service/ServiceModule.ts`: `category` (+ campos base) | **faltam** item da lista LC 116, código NBS, alíquota ISS/retenção, `cClassTrib` IBS/CBS |
| Dados do **cliente/tomador** | `CustomerModule.ts` expõe métricas (`firstSaleAt…`); documento (CPF/CNPJ) e endereço **não confirmados** no preset | tomador é opcional na NFS-e para PF sem identificação [secundária]; se exigido, entra no perfil/cadastro — fork F-DFE-6 |
| Venda + itens | `SalesModule.ts` (`paymentTermDays, simpleCustomerName, revenueSource, paidAt, paymentReference, paidWithPackageId…`), `SalesItemsMixed.ts` (produto **ou** serviço por item) | a DPS nasce de `sale.status='Finalized'` + itens de serviço; itens de **produto** vão para a NF-e 55 (fase 2) |
| Ponte contábil da venda | `AccountingSyncPort.ts:118-121` (`sale.finalized` → receita) | a emissão **não** posta nada: receita já reconhecida; o documento é proveniência, não fato contábil novo (mesma regra do D2b do ADR-NFE) |
| BYOK por env, 1 instância por cliente | `ADR-M2` §3, `docker-compose.yml`, `OpenAIService.ts:99` | molde da credencial (D2): segredo por env da instância, sem KMS |
| CNPJ alfanumérico | `lib/cnpj.ts` (#280) | emitente e tomador validam pelo mesmo regex/DV; a chave de acesso da NF-e 55 de saída também |

## 3. As decisões fixadas (D1–D8)

### D1 — O Luminaris monta; o parceiro emite (F-M7 → d)
O sistema produz o documento **completo e validado localmente** (schema Zod do DPS/NF-e de saída
transcrito do manual — lição I052: nunca de memória) e o entrega ao parceiro. Certificado digital,
assinatura, comunicação com o Emissor Nacional/SEFAZ, contingência, numeração oficial, cancelamento junto
ao fisco e o DANFSe/DANFE ficam no parceiro. **Consequência:** o Luminaris nunca guarda certificado A1/A3.

### D2 — Credencial do parceiro: BYOK por tenant, **por env da instância** (R4 ✅ 2026-09-08)
Cada cliente contrata o parceiro e traz a própria chave. Como a topologia é **1 instância por cliente**
(ADR-M2), a chave vive em **env da instância** (`DFE_PARTNER=<adapter>`, `DFE_PARTNER_API_KEY`,
`DFE_PARTNER_ENV=producao|homologacao`), exatamente como `OPENAI_API_KEY` — zero migração, zero cifra em
repouso nova. Uma chave serve **N unidades** (CNPJs) da mesma instância: o adaptador envia o CNPJ do
emitente por documento (os parceiros do mercado aceitam N empresas sob uma conta) [secundária]. Sem chave ⇒
emissão **desabilitada com aviso** na tela; nunca falha em silêncio. Fork F-DFE-2 registra a alternativa
(tabela por unidade, cifrada).

### D3 — `FiscalDocument` é entidade **Prisma first-class** (§2.1: invariante fiscal)
```
FiscalDocument { id, userId, unitId, kind: NFSE|NFE, status: DRAFT|SENT|AUTHORIZED|REJECTED|CANCELLED,
  saleId (sourceId da venda), payloadJson (DPS/NF-e montada — snapshot imutável do que foi enviado),
  partner, partnerRef (id no parceiro), numero?, serie?, chaveOuCodigo? (NFS-e: código de verificação/
  chave ADN; NF-e: chave 44), authorizedAt?, cancelledAt?, cancelReason?, errorsJson?,
  xmlAttachmentId?, pdfAttachmentId?, sourceDocumentId? (após autorização), createdById, timestamps, deletedAt }
@@unique([userId, unitId, saleId, kind]) sobre documentos VIVOS (rename-on-cancel como Payable/Counterparty)
```
Invariantes: (i) um documento vivo por (venda, tipo); (ii) `payloadJson` nunca muda depois de `SENT`;
(iii) transição de status só por serviço, com policy; (iv) `AUTHORIZED` exige `partnerRef` + número; (v)
cancelamento fiscal **não** cancela a venda nem estorna nada (D7).

### D4 — Gatilho **manual** pela tela no MVP (fork F-DFE-3 recomenda; auto-emissão fica para depois)
Botão "Emitir NFS-e" na venda finalizada (e na aba NF-e/fiscal), nunca disparo automático no
`sale.finalized` do MVP: o PNCT tolera autorregularização, mas um disparo automático com perfil fiscal
incompleto produziria rejeição em massa. Pré-condições verificadas **antes** de enviar: venda `Finalized`,
perfil fiscal da unidade completo, todo item de serviço com código/`cClassTrib`, nenhum documento vivo
para a venda.

### D5 — Perfil fiscal **Prisma first-class**, apontando para as linhas DynamicTable
`FiscalProfile` (por `unitId`: IM, CNAE, regime tributário, `codMun` IBGE, `optanteSimples`, série/numeração
quando o parceiro exigir, `cClassTrib` padrão) e `ServiceFiscalProfile` (por `serviceRef` = id da linha
`services`: item LC 116, código NBS, alíquota ISS, `issRetido`, `cClassTrib`). É a mesma técnica de
`Counterparty.ref`/`Payable.inventoryProductRef` (referência escopada a linha, não FK). Dado fiscal é
invariante legal ⇒ **nunca** campo solto no preset (§2.1). Fork F-DFE-6 registra a alternativa.

### D6 — Porta `DfeEmissorPort` + adaptadores; resultado por **polling** no MVP
```ts
interface DfeEmissorPort {
  emitir(doc: FiscalDocumentPayload, ctx: { cnpjEmitente; ambiente; ref: FiscalDocument.id }): Promise<EmissaoResult>;
  consultar(partnerRef: string): Promise<EmissaoResult>;
  cancelar(partnerRef: string, motivo: string): Promise<CancelResult>;
}
type EmissaoResult = { status: 'PROCESSING'|'AUTHORIZED'|'REJECTED'; partnerRef; numero?; serie?; chaveOuCodigo?; xml?: Buffer; pdf?: Buffer; errors: Array<{ code; message }> };
```
Adaptadores: `NullEmissor` (dev/teste — devolve AUTHORIZED sintético, nunca em produção), `FileEmissor`
(grava o payload em disco para envio manual — cobre o dono sem parceiro contratado), `<Parceiro>Emissor`
(HTTP, um por parceiro escolhido). `ref` = nosso `FiscalDocument.id` como chave de idempotência no parceiro.
Resultado assíncrono por **polling** (`consultar`) acionado pela tela ou por job existente — **não** abre
inbox/outbox/webhook (T11: não-objetivo). Fork F-DFE-5.

### D7 — O documento autorizado vira proveniência; nunca fato contábil
`AUTHORIZED` ⇒ (1) XML/PDF em `DocumentAttachment`; (2) `SourceDocument{ sourceType:'dfe.nfse'|'dfe.nfe',
externalRef: número/chave, documentDate, attachmentId, rawJson }` anexado ao lançamento `sale.finalized`
via `attachSourceDocument` (seam NFE-X); (3) `FiscalDocument.sourceDocumentId` gravado. Zero lançamento
novo (receita já reconhecida — ADR-NFE D2b). `REJECTED` ⇒ erros do parceiro no documento, tela mostra,
operador corrige perfil/venda e reenvia (novo `SENT`, mesmo `ref`). `CANCELLED` fiscal ⇒ só o documento;
se a **venda** for cancelada depois de autorizada, a tela exige cancelar o documento (não automático).

### D8 — Escopo em duas ondas atrás da mesma porta (fork F-DFE-1)
**Onda 1 (prazo 01/10/2026): NFS-e nacional** para os itens de **serviço** da venda. **Onda 2 (01/12/2026,
não contribuinte de ICMS): NF-e 55 de venda** para itens de **produto** (revenda), reusando `lib/cnpj.ts`
para a chave e o vocabulário do ADR-NFE. Venda mista (serviço + produto) ⇒ dois documentos.
**Qualificação declarada (F-DFE-8, mesma técnica do F-M8):** tenant **optante do Simples** só entra em
01/01/2027 (Ato 4 § 1º) — o MVP atende regime normal (Lucro Real/Presumido); `FiscalProfile.optanteSimples`
apenas **bloqueia** a emissão com aviso até segunda ordem.

## 4. Fronteira e sequenciamento

- **§2.1:** `FiscalDocument`/`FiscalProfile` são Prisma; a emissão é chamada de **controller/serviço** a
  partir da venda (DynamicTable) — nunca de `RulePlugin`/`DynamicTableService`. A venda continua dona do
  ciclo comercial; o documento fiscal é subrazão fiscal apontando para ela por `saleId`.
- **Cadeia:** `Route → Controller → FiscalDocumentService → FiscalDocumentRepository/FiscalProfileRepository
  → Prisma` (+ `AccountingPolicy.canEmitFiscalDocument`), `DfeEmissorPort` injetado pela Factory (adapter
  escolhido por env), `PostingService.attachSourceDocument` para D7. DTOs Zod `.strict()`; soft-delete;
  audit events (`dfe.emitted`, `dfe.authorized`, `dfe.rejected`, `dfe.cancelled`) na allowlist na mesma
  mudança.
- **Ordem (plano rodada 6 → 12):** este ADR → parecer → ratificação F-DFE-1..8 → BRIEF `BE-INCR-DFE-NFSE`
  (perfil fiscal + `FiscalDocument` + porta + `FileEmissor`/`NullEmissor` + montagem da DPS) → **espera D5**
  (parceiro contratado) → BRIEF do adaptador do parceiro → FE (botão na venda + tela de documentos fiscais)
  → **H2-DFE** (gate humano: primeira NFS-e em homologação do parceiro, depois produção) → onda 2.
- **Dependências externas:** pedido ao contador itens **1b** (`cClassTrib`, IBS/CBS, DeRE) e o item novo
  **"item da lista LC 116 + alíquota de ISS por serviço do salão"**; manual de integração da NFS-e nacional;
  documentação do parceiro; Ato nº 5 (PNCT) PDF.

## 5. FORKS — RATIFICAÇÃO PENDENTE (dono, fork a fork)

| Fork | Caminhos | Recomendação + justificativa | Custo de errar |
|---|---|---|---|
| **F-DFE-1 — escopo do MVP** | (a) só NFS-e nacional (onda 1) · (b) NFS-e + NF-e 55 de venda no mesmo BRIEF · (c) só NF-e 55 | **(a).** É o prazo de 01/10; a NF-e 55 de saída tem prazo 01/12 e leiaute maior; a porta já nasce genérica (`kind`) e a onda 2 é BRIEF próprio | (b) atrasa a onda 1; (c) erra o prazo |
| **F-DFE-2 — onde vive a credencial (R4 = BYOK, ✅)** | (a) env da instância (`DFE_PARTNER_API_KEY`), 1 chave para N unidades · (b) tabela `FiscalCredential` por unidade, cifrada com chave de processo | **(a).** Molde do ADR-M2 (BYOK por env, 1 instância/cliente), zero migração e zero cifra nova; os parceiros aceitam N CNPJs por conta. (b) só quando um cliente tiver unidades em contas distintas do parceiro | baixo; (b) reabre "cifra em repouso" que o M2 não decidiu |
| **F-DFE-3 — gatilho** | (a) manual (botão na venda) · (b) automático no `sale.finalized` com perfil completo · (c) manual + lote "emitir pendentes do dia" | **(a).** Primeiro release imperfeito + PNCT: rejeição em massa automática é o pior cenário; (c) é a evolução natural depois do H2-DFE | (b) rejeições/duplicidade em massa |
| **F-DFE-4 — parceiro** | candidatos com API de NFS-e nacional **e** NF-e: Focus NFe, NFE.io, PlugNotas/TecnoSpeed, eNotas, Notaas [todos de fonte secundária, nenhum verificado]; critério da cédula D2 (iii): emite NFS-e nacional em **SP capital e RJ capital**, sandbox de homologação, preço por documento, suporte a IBS/CBS | **Sem recomendação — dado externo D5 do dono.** O ADR só exige: REST + JSON, sandbox, idempotência por `ref`, retorno com XML + PDF, cancelamento, e **cláusula de N CNPJs por conta** (F-DFE-2 a) | escolher sem sandbox = testar em produção |
| **F-DFE-5 — transporte do resultado** | (a) polling (`consultar`) pela tela/job · (b) webhook do parceiro (rota pública + assinatura) · (c) ambos | **(a).** Single-process, sem inbox/outbox (T11); webhook exige rota **pública** (allowlist deny-by-default) e verificação de assinatura — item próprio quando houver volume | (b) abre superfície pública sem necessidade |
| **F-DFE-6 — onde vive o dado fiscal da unidade/serviço** | (a) `FiscalProfile` + `ServiceFiscalProfile` Prisma apontando para as linhas (`ref`) · (b) campos novos nos presets `units`/`services` (DynamicTable) · (c) misto | **(a).** §2.1: invariante legal = Prisma; a tela de perfil fiscal é contábil, não do preset do setor; a prensa de binding não precisa saber de ISS | (b) viola a fronteira e espalha regra fiscal no motor |
| **F-DFE-7 — tomador (cliente) na NFS-e** | (a) opcional: PF sem documento emite sem tomador identificado · (b) exigir CPF/CNPJ do cliente para emitir | **(a) com aviso.** A NFS-e nacional aceita tomador não identificado [secundária — confirmar no manual]; (b) bloqueia o salão que vende a consumidor anônimo | (a) errado = rejeição do parceiro; corrige-se na 1ª nota |
| **F-DFE-8 — qualificação de regime** | (a) declarar "MVP atende regime normal; Simples só em 2027" (Ato 4 § 1º) e bloquear com aviso · (b) suportar Simples desde já (DAS/PGDAS não gerado — cédula 09-02 §2) | **(a).** Mesma técnica do F-M8; o regime-alvo é Lucro Real | baixo |

## 6. Riscos e vieses nomeados (T8)

- **Risco principal:** o leiaute da DPS/NFS-e nacional e os grupos IBS/CBS são conhecidos por **fontes
  secundárias**; a primária (manual de integração + NT 004 v2.00) não está no repo. Mitigação: o BRIEF
  transcreve o manual (lição I052) **antes** do schema Zod, e o H2-DFE em **homologação** do parceiro é o
  oráculo — nenhuma nota de produção antes dele.
- **Risco de prazo:** 01/10/2026 está a 23 dias; o parceiro (D5) é dado externo. O `FileEmissor` (D6) é a
  válvula: o documento montado e validado pode ser enviado manualmente pelo emissor web nacional enquanto
  o adaptador não existe.
- **Risco de responsabilidade:** com BYOK o emitente é o cliente; ainda assim o PNCT entrega inconsistências
  ao contador indicado — obrigação operacional humana (D7 do grafo), não do código.
- **Viés desta sessão:** recomendações favorecem o menor diff (env, polling, manual, só NFS-e); quem pesar
  automação e volume escolhe (b) em F-DFE-3/5 e aceita rota pública + fila.
- **Viés de contagem:** o nó 13 do fiscal vale 1 como os outros; é o maior item do módulo.

## 7. Checklist de invariantes que a implementação DEVE provar (BRIEF herda)

1. Um documento **vivo** por (venda, tipo); reenvio após rejeição reutiliza o `FiscalDocument` (novo
   `SENT`, mesmo `ref`), nunca cria um segundo.
2. `payloadJson` imutável após `SENT` (teste: update rejeitado).
3. Emissão sem perfil fiscal completo ⇒ 400 com a lista de campos faltantes; **nada** enviado.
4. `AUTHORIZED` ⇒ exatamente 1 `SourceDocument` + anexos; **0** lançamentos novos (contagem antes/depois).
5. Cancelamento fiscal não altera status da venda nem o razão.
6. Sem `DFE_PARTNER_API_KEY` ⇒ emissão desabilitada com aviso; `NullEmissor` recusa `NODE_ENV=production`.
7. CNPJ do emitente/tomador validado por `lib/cnpj.ts` (alfanumérico); tomador PF por CPF.
8. Eventos de audit na allowlist; policy `canEmitFiscalDocument` dentro do serviço.

## 8. Sinal humano — estado do gate

- **Ratificados:** F-M7 → (d) (2026-09-03); **R4 → BYOK por tenant** (2026-09-08).
- **Pendentes:** F-DFE-1..8 (§5); parecer do `luminaris-accounting-architect`; **D5** (contratar parceiro +
  certificado do cliente — dado externo); manual de integração da NFS-e nacional (download pelo dono ou pelo
  agente com permissão, como o Manual ECF); resposta do contador (itens 1b e o novo item de ISS por serviço).
- **O que este ADR NÃO autoriza:** código; escolha de parceiro; qualquer disparo automático; webhook público.
