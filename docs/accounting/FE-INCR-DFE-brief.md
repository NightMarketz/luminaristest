# BRIEF — FE-INCR-DFE (tela da emissão manual de NFS-e: perfil fiscal, ficha espelho do portal, retorno pelo XML, rejeição/reenvio, cancelamento) — nó FE-INCR-DFE

> **Estado: BRIEF pronto.** Os 5 forks de 29/09 estão transcritos como **decididos** (§0). Os forks novos
> F-FE-DFE-6..9 estão em **RATIFICAÇÃO PENDENTE** (§4). Produzido por `sessao-planejamento` em 2026-09-29 contra
> `origin/main` **`9dd690b3`** (#438) e a nota de decisão do PR #440 (branch `claude/docs-decisoes-2026-09-29`,
> `b5398c87`). Não contém código de aplicação. **Implementação exige "executa" do dono** (ORCH-006) e, na fila,
> vem **depois do [`SEED-UNITS`](../plano/nos/SEED-UNITS.md)** (decisão 2 de 29/09).
>
> **A verdade em duas linhas:** são 3 PRs — PR-0 telas de perfil fiscal (unidade + serviço), PR-1 um toque pequeno
> no BE (a releitura **já é gravada**, só não é exposta), PR-2 a tela de emissão. **Risco principal:**
> o Guia do Emissor Web v1.2 diz que os eventos só saem em **HTML** (p. 80); se o portal ao vivo confirmar isso, o
> cancelamento manual (F-MAN-5 a, que exige o XML do evento) fica inutilizável pela tela — fork F-FE-DFE-9.

---

## 0. Contexto fixo (não rediscutir)

- **Item a planejar:** nó [`FE-INCR-DFE`](../plano/nos/FE-INCR-DFE.md) = Fase C (passos C.1–C.6) de
  [`PLANO-EMISSAO-FISCAL-2026-09-27.md`](PLANO-EMISSAO-FISCAL-2026-09-27.md) §"Fase C — Tela". C.1 é este BRIEF.
- **Autorização (ORCH-006):**
  - dono em chat, 27/09: *"Certo, planeje com granularidade e atualize a documentação com nossas decisões do
    fiscal"* — campo `autorizacao` do nó: *"plano (Fase C); o BRIEF abre depois dos forks F-MAN; sem 'executa'"*.
    Os forks F-MAN-1..5 + 2b foram ratificados em 27/09 ([`BE-INCR-DFE-MANUAL-brief.md`](BE-INCR-DFE-MANUAL-brief.md)
    §5 "RATIFICAÇÃO"), então a condição está cumprida.
  - dono, 29/09, decisão 11 de [`D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE`](../plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md)
    (PR #440): *"Abrir com os 5 decididos"*. Decisão 2: *"Régua e cliente juntos"* — FE-INCR-DFE entra **logo depois
    do SEED-UNITS**.
  - **Cobre:** este BRIEF, incluindo o PR-0 (FE de perfil fiscal) e o PR-1 (toque no BE), porque a decisão 11 os pôs
    dentro. **Não cobre:** código (falta "executa") nem ratificar os forks novos.
- **Por que agora (fato do cliente, decisão 29/09 §"Fatos do 1º cliente"):** o 1º cliente é **Simples Nacional em
  São Paulo capital, com IE**. Para ele a NFS-e sai pelo Emissor Nacional (obrigatório e exclusivo desde 01/11/2026,
  Res. CGSN 191/2026 — dossiê §0). Esta tela é o caminho legal da NFS-e desse cliente.

### Forks já decididos (transcritos — não são forks deste BRIEF)

| # | Decisão (dono, 29/09, decisão 11 — nomes do dossiê §5) | Efeito aqui |
|---|---|---|
| F-FE-DFE-1 | **PR-0** com as telas de perfil fiscal da unidade (`/api/accounting/fiscal-profile`) e de serviço (`/service-fiscal-profiles`) | §2 PR-0, itens 1–9 |
| F-FE-DFE-2 | **Toque pequeno no BE**: releitura legível depois de recarregar + ids do XML/PDF na `FiscalDocumentView` | §2 PR-1, itens 10–13 (a releitura já é persistida — fato F2) |
| F-FE-DFE-3 | Botão **"Emitir NFS-e" no `SaleDetailPanel`** (`my-app/features/dashboard/category-views/finance/components/sales/`) | item 15 |
| F-FE-DFE-4 | Upload por **`input type="file"`** no padrão do `NfePanel.tsx` + `postMultipart` (sem componente de arrastar) | itens 21, 23 |
| F-FE-DFE-5 | **Ambiente derivado de `FiscalDocumentView.ambiente`**, com aviso se divergir de `GET /api/nfe/dfe/status` | item 18 |

### Contrato do BE (fato consumado — lido nesta sessão em `9dd690b3`)

Rotas em `server/src/routes/dfe.ts:32-47` (montadas em `/api/nfe/dfe`) e `server/src/routes/accounting.ts:318-324`:

```text
GET    /api/nfe/dfe/status                               → { enabled, partner, ambiente, reason?, capabilities? }   (EmissionService.ts:124-133)
POST   /api/nfe/dfe/preview        { unitId, saleId, kind }  → PreviewResult (200 mesmo com pendência: ok=false + faltantes)
POST   /api/nfe/dfe/documents      { unitId, saleId, kind }  → FiscalDocumentView[]  (um por cTribNac — F-DFE-16 b)
GET    /api/nfe/dfe/documents?unitId&saleId|status&pendencias → FiscalDocumentView[]
GET    /api/nfe/dfe/documents/:id?unitId                  → FiscalDocumentView
POST   /api/nfe/dfe/documents/:id/reenviar   { unitId }   → FiscalDocumentView (tentativa n+1, DPS remontada)
GET    /api/nfe/dfe/documents/:id/ficha?unitId            → { documentId, status, currentAttemptNo, payload }   (item 14 do DFE-MANUAL)
POST   /api/nfe/dfe/documents/:id/retorno-manual  multipart file(XML) + pdf? + unitId → FiscalDocumentView & { releitura }
POST   /api/nfe/dfe/documents/:id/rejeicao-manual { unitId, errors[1..20] } → FiscalDocumentView
POST   /api/nfe/dfe/documents/:id/cancelamento-manual multipart file(XML e101101) + unitId + cMotivo + xMotivo → FiscalDocumentView
GET    /api/accounting/fiscal-profile?unitId              → FiscalProfileView | 404 fiscal_profile_missing
PUT    /api/accounting/fiscal-profile                     UpsertFiscalProfileInput → FiscalProfileView
GET    /api/accounting/service-fiscal-profiles?unitId     → ServiceFiscalProfileView[]
GET|PUT|DELETE /api/accounting/service-fiscal-profiles/:serviceRef
GET    /api/accounting/attachments/:id?unitId             → binário (download de anexo)   (accounting.ts:192)
```

Erros nomeados que a tela trata (`FiscalDocumentLifecycleService.ts:357-494`): 409 `DFE_STATUS_INVALIDO`,
409 `DFE_NAO_MANUAL`, 422 `NFSE_INVALIDA`, 422 `DFE_IDENTIDADE_DIVERGENTE`, 422 `NFSE_EVENTO_INVALIDO`, 422
`DFE_EVENTO_DIVERGENTE`; 403 das policies (`canEmit/canRead/canCancelFiscalDocument`). O envelope de erro traz `code`
(`AppError.errorCode`) e, em `ValidationError`, `details` (`server/src/lib/apiUtils.ts:38-42`).

---

## 1. Fatos verificados nesta sessão (grau)

| # | Fato | Grau / evidência |
|---|---|---|
| F1 | Não existe FE para `/nfe/dfe`, `fiscal-profile` nem `service-fiscal-profiles` | **verificado**: `grep -rn "fiscal-profile\|nfe/dfe" my-app/{lib,features,pages}` = 0 |
| F2 | **A releitura já é persistida.** `applyResult` grava `{ errors, valores, releitura }` em `FiscalDocumentAttempt.resultJson` (`FiscalDocumentLifecycleService.ts:531-535`), e o repositório escreve esse campo na tentativa (`FiscalDocumentRepository.ts:119-123`). **Corrige a premissa do pedido** ("persistir a releitura"): o que falta é **expor** | **verificado** por leitura; o teste de serviço assere o argumento (`FiscalDocumentLifecycleService.manual.test.ts:111`), mas com repositório falso — memória `repositorios-de-contabilidade-nao-sao-exercitados`. O item 12 fecha isso com teste de integração |
| F3 | `FiscalDocumentView` (`FiscalDocumentEmissionService.ts:55-83`) não expõe `resultJson`, `releitura`, `xmlAttachmentId`, `pdfAttachmentId`. As colunas existem (`schema.prisma:1495-1496, 1523`) | verificado |
| F4 | `emit` devolve **uma lista** (um documento por `cTribNac`, `EmissionService.ts:176-262`). `preview` devolve 200 com `ok=false` e `faltantes: string[]` em pt-BR vindos do BE (`:136-169`) | verificado |
| F5 | Anexo só existe em `producao` (`Lifecycle.ts:642`): em homologação `xmlAttachmentId`/`pdfAttachmentId` ficam sempre `null` | verificado |
| F6 | Falha de anexo **depois** da autorização devolve 500 com o documento já `AUTHORIZED` (GAP-MAP linha "resíduo do `applyResult`", `[ABERTO]`; BRIEF [`BE-INCR-DFE-ANEXO-PENDENTE`](BE-INCR-DFE-ANEXO-PENDENTE-brief.md), falta "executa") | verificado por leitura (`Lifecycle.ts:633-683`) |
| F7 | Download de anexo: `GET /api/accounting/attachments/:id?unitId` é genérico por id+escopo (`DocumentAttachmentService.ts:195-205`), vale para `FISCAL_DOCUMENT`. No FE, a técnica de download binário é `reconStreamDownload` (`my-app/lib/services/accounting.service.ts:626`, privada, usada por `downloadReceipt` `:1029`) | verificado |
| F8 | Cancelamento manual lê só o evento `e101101` (`server/src/lib/nfseEvento.ts:49-50`) e exige assinatura (GAP-MAP evento, `[FECHADO 2026-09-28]`). O `xMotivo` do corpo é validado (15–255) e **descartado**: grava-se o do XML (`Lifecycle.ts:477`) | verificado (o descarte vira achado §7-A1) |
| F9 | `PUT /fiscal-profile` é **substituição total com defaults Zod** (`FiscalProfileDto.ts`: `dpsSerie` default 1, `emissaoForaDoMes` default `AVISAR`, `pacoteFatoGerador` default `CONSUMO`…). Campo omitido volta ao default (classe da memória `zod4-partial-aplica-default-reseta-campo`). Todo PUT marca `d1fConfirmado = true` (`FiscalProfileService.ts:109,152`) | verificado |
| F10 | `SIMPLES` exige `icmsContribuinte=false` e `pisCofinsRegime=SIMPLES` (`FiscalProfileDto.ts` superRefine). Para o 1º cliente (Simples com IE) isso está no GAP-MAP e o conserto é do BRIEF do [[X10a]] (decisão 5 de 29/09). **A tela segue o BE como está** | verificado |
| F11 | `ServiceFiscalProfile`: `serviceRef` = id da linha da tabela `services`; `cTribNac` 6 dígitos ∈ lista nacional (`ServiceFiscalProfileDto.ts:19`), `cNBS` 9 dígitos, `cIndOp` com default do salão; a view traz `cTribNacDescricao` (`ServiceFiscalProfileService.ts:13-24`). Não há rota que liste LC 116/NBS | verificado |
| F12 | `sale.unitId` aponta para a tabela `units` (`RelationPresets.ts:16-22`), que é o `unitId` do escopo contábil (`EmissionService.ts:519-521` lê o CNPJ de `units` por `scope.unitId`) | verificado o preset; o uso pela tabela `sales` é **inferido** (mesmo campo compartilhado) |
| F13 | `SaleDetailPanel.tsx` (270 l.) usa `gray-*`/`rounded-xl` legados e o namespace `finance_view`. `NfePanel.tsx:258` usa `input type=file` escondido + botão; `postMultipart` compartilhado em `lib/services/multipart.ts:52` | verificado |
| F14 | O OpenAPI descreve a `FiscalDocumentView` só por texto (`docs.paths.ts:5311-5381`): o PR-1 não muda path nem schema | verificado |
| F15 | O `my-app` **não** tem `zod` no `package.json`. Tipos de resposta ficam fora do contrato gerado (D11 de [`PLANO-FE-CONTRACT-TYPES-2026-09-28.md`](PLANO-FE-CONTRACT-TYPES-2026-09-28.md) §3); corpos de escrita usam os `.gen.ts` (`FiscalDocumentDto.gen.ts`, `FiscalProfileDto.gen.ts`, `ServiceFiscalProfileDto.gen.ts`, `DpsPayloadDto.gen.ts` — existem) | verificado |
| F16 | O `payload` da ficha foi validado por `DpsManualPayloadSchema` antes de persistir (`EmissionService.ts:196`) — o FE pode tipá-lo com `DpsManualPayloadInput` (gerado) | verificado |

### Fatos do Guia do Emissor Público Nacional Web v1.2 (fonte da ficha)

Arquivo local `docs/accounting/fontes-oficiais/NFSe-Guia-Emissor-Publico-Nacional-Web-v1.2.pdf` (gitignored),
**sha256 `85982d1ee76b…`, 4.849.267 bytes = MANIFEST** (`nfse-guia-emissor-web`). Lido nesta sessão, p. 7–104.

| # | Fato | Página |
|---|---|---|
| G1 | Endereço do emissor: `https://www.nfse.gov.br/EmissorNacional` | p. 8 |
| G2 | A **Emissão Completa** vale para todos os contribuintes, em 4 passos: **Pessoas, Serviço, Valores, Emitir NFS-e** | p. 17, 19–65 |
| G3 | Série e número da DPS são gerados pelo sistema; a caixa "informar a DPS" é opcional e, marcada, exige série 80.000–89.999 (base do F-MAN-4 a) | p. 20–21 |
| G4 | Hoje só o **Prestador** emite (Tomador/Intermediário "em versão futura") | p. 21 |
| G5 | Código de Tributação Nacional: combo, "digitar pelo menos 3 caracteres do Código"; exibido no formato `99.01.01 - descrição` | p. 35, 38 |
| G6 | Município do local da prestação: combo, "digitar pelo menos 3 caracteres do **nome** do município" | p. 34–35 |
| G7 | Tomador no Brasil: CPF/CNPJ, IM, Nome e **CEP/endereço marcados "Obrigatório"** na tabela do guia | p. 25–26 |
| G8 | Com tributos apurados pelo Simples, a tributação federal "já estará preenchida e não pode ser alterada" | p. 58 |
| G9 | Depois de gerar: "Baixar o XML da NFS-e" e "Baixar o DANFSe" | p. 65, 84 |
| G10 | **"Os eventos estão disponíveis somente no formato HTML"** na visualização da nota | **p. 80** |
| G11 | "Substituir NFS-e" gera um **Evento de Cancelamento por Substituição** (não o `e101101`) | p. 81 |
| G12 | Cancelamento: tela com Motivo (combo) + Justificativa | p. 83–84 |
| G13 | Contradição interna: "Emissão Simplificada… apenas para quem é MEI" (p. 17) × "Contribuintes MEI **ou do Simples Nacional**" (p. 66) | p. 17 × 66 |

---

## 2. Checklist de comportamentos — por PR

Ordem: **PR-0 → PR-1 → PR-2**, serial. PR-0 e PR-1 não dependem um do outro; o PR-2 depende dos dois. Todos depois do
merge do SEED-UNITS (decisão 2). Cada item é testável isoladamente; `[direto]` = sem fork; `[F-…]` = depende do fork.

### PR-0 — Perfil fiscal da unidade e dos serviços (F-FE-DFE-1)

1. **[direto]** `my-app/lib/services/fiscalProfile.service.ts` (`frontend-api-service-generator`): `getUnitProfile(unitId)`
   → `FiscalProfileView | null` (o 404 `fiscal_profile_missing` vira `null`; outro erro propaga);
   `putUnitProfile(body: UpsertFiscalProfileInput)`; `listServiceProfiles(unitId)`; `putServiceProfile(serviceRef,
   body: UpsertServiceFiscalProfileInput)`; `deleteServiceProfile(serviceRef, unitId)`. Paths `'/accounting/…'`
   (o `apiClient` já prefixa `/api`). Respostas tipadas à mão (§3.1), com `// espelha <arquivo>:<linha>`.
   Testável: URL e corpo exatos por método; 404 → `null`; 500 → rejeita.
2. **[F-FE-DFE-6]** Local das telas: aba nova **"Perfil fiscal"** no `AccountingView` (`Tab` + `TABS[]` +
   `view.tabs.perfilFiscal`), com `FiscalProfilePanel` (unidade) em cima e `ServiceFiscalProfilesPanel` embaixo,
   recebendo o `unitId` do seletor da Contabilidade. `section rounded-2xl border-neutral-800 bg-neutral-900/60 p-5`.
   Testável: a aba renderiza os dois painéis com o `unitId` do seletor.
3. **[direto]** Formulário da unidade, **todos os campos de `UpsertFiscalProfileInput`** (o PUT é total — F9 — e a
   decisão 11 fala do perfil da unidade, não de metade dele), em grupos:
   - *Regime*: `regimeTributario`, `pisCofinsRegime`, `icmsContribuinte`. Com `SIMPLES`, `icmsContribuinte` fica
     `false` e desabilitado e `pisCofinsRegime` fica `SIMPLES` — espelho do superRefine (F10), com a nota "regra
     atual do sistema; revisão no X10a".
   - *Emitente da NFS-e*: `codMun` (IBGE 7), `inscricaoMunicipal`, `cnae`, `regEspTrib` (0–9), `regApTribSN`
     (1–3, só `SIMPLES`), `dpsSerie` (com a nota "no modo manual o portal numera — G3").
   - *ISS*: `issAliquotaBp` digitado em % com 2 casas; `issRetidoTomadorPj` (marcado ⇒ aviso "a emissão recusa hoje:
     falta o endereço do tomador — F-DFE-14").
   - *Tributos aproximados*: `pTotTribSNCent` (só `SIMPLES`) ou `pTotTrib{Fed,Est,Mun}Cent` (só regime normal), em %.
   - *IBS/CBS*: `ibsCbsInformar`, `ibsCbsCst`, `ibsCbsClassTrib` (cClassTrib começa pelo CST — RN E0959, validado no BE).
   - *Emissão*: `emissaoForaDoMes`, `pacoteFatoGerador`, `partnerAccountRef`.
   - *Custo de compra (X6)*: `pisCofinsCredit*` (o `IncludesIpi` fica `false` e desabilitado — regra fixa do DTO) e as
     contas `icmsRecuperavelAccountId`/`pisCofinsRecuperavelAccountId` num `<select>` de contas analíticas de Ativo
     (precedente de forma: `CreatePayableModal.tsx:389-399`, valor = **id**, nunca código).
   Testável: `SIMPLES` desabilita `icmsContribuinte`; trocar para `PRESUMIDO` esconde `pTotTribSNCent` e mostra os três.
4. **[direto]** Conversões em inteiro, sem float: `"2,00"` → `issAliquotaBp: 200`; `"15,5"` → `pTot…Cent: 1550`;
   vazio → `null`; o caminho inverso formata com vírgula. Testável: tabela de 6 casos, ida e volta.
5. **[direto]** Salvar: corpo montado por `toUpsertFiscalProfile(form): UpsertFiscalProfileInput` (regra do mapper,
   `PLANO-FE-CONTRACT-TYPES` §9: função com retorno declarado, sem spread de rascunho, sem `as`). O formulário é
   **hidratado do GET** e o PUT devolve **todo** campo, inclusive os que a tela não mudou. 400 do Zod → `resolveError`
   (humaniza o flatten por campo). Depois do PUT, a tela usa a view devolvida. Testável: GET com `dpsSerie: 7` e
   `emissaoForaDoMes: 'BLOQUEAR'` → PUT sem mexer → corpo leva `7` e `'BLOQUEAR'` (mordida da classe "default reseta").
6. **[direto]** Estado de emissão do perfil: badge com `emissao.completo`; lista `emissao.faltantes` (nomes de campo
   do BE, traduzidos por mapa fechado com fallback para o nome cru); aviso com `emissao.pendingExternalValidation`
   ("valores do contador ainda não confirmados — D1f"). Perfil ausente (GET `null`) → formulário vazio + aviso "sem
   perfil, nenhuma venda emite". Testável: fixture com `faltantes: ['codMun']` mostra o rótulo; `null` mostra o aviso.
7. **[direto]** Perfis de serviço (`ServiceFiscalProfilesPanel`): lista os serviços do tenant lidos da DynamicTable
   `services` (mesma técnica de `loadFinalizedSales`/`loadProductOptions` do `NfePanel.tsx:83`; `// ponytail: limit=500,
   paginar quando um tenant passar disso`) cruzados com `listServiceProfiles`. Por linha: nome do serviço, `cTribNac` +
   `cTribNacDescricao`, `cNBS`, `cIndOp`, badge "sem perfil". Editar abre `components/ui/Modal` com `cTribNac` (aceita
   `01.07.01` colado e tira os pontos), `cTribMun`, `cNBS`, `cIndOp` (vazio ⇒ omitido ⇒ default do BE), `cLocPrestacao`
   (IBGE 7), `xDescServ`; PUT por `toUpsertServiceFiscalProfile(form)`. Excluir pede confirmação (`useConfirmModal`).
   O 400 "cTribNac fora da lista nacional" aparece íntegro. Testável: serviço sem perfil mostra o badge; `01.07.01` →
   corpo `cTribNac: '010701'`; excluir chama `DELETE …/:serviceRef?unitId=`.
8. **[direto]** i18n: chaves `fiscalProfile.*` em `public/locales/{pt,en}/accounting.json` no mesmo PR (paridade =
   gate do `skill-audit wiring`). Testes vitest em `features/accounting/components/__tests__/` com
   `(globalThis as unknown as { React: typeof React }).React = React;` e `vi.mock` com caminho relativo ao teste.
9. **[direto]** Gates: `cd my-app && npx tsc --noEmit` **e** `npm run test:types` (o `tsc` cru exclui testes — memória
   `tsc-noemit-my-app-exclui-testes`), `npm run build` (tela atrás de `withAuth`), `neutral-*`/`rounded-2xl`. Seção em
   branco em `RUNBOOK-H2-BROWSER-SIGNOFF.md` ("Perfil fiscal"): o agente cria, o dono preenche.

### PR-1 — Toque no BE (F-FE-DFE-2)

10. **[direto]** `FiscalDocumentView` ganha três campos: `xmlAttachmentId: string | null`, `pdfAttachmentId: string |
    null` (das colunas) e `releitura: ReleituraJson['releitura'] | null`, lida do `resultJson` da **tentativa corrente**
    (`JSON.parse` guardado: `resultJson` nulo, inválido ou sem `releitura` ⇒ `null`). **Nenhuma escrita muda** (F2).
    Não muda DTO Zod (resposta não é Zod ⇒ sem snapshot), path nem OpenAPI (F14). Testável (unitário, `toView`):
    tentativa com releitura `DIVERGENTE` → `view.releitura.status === 'DIVERGENTE'`; sem `resultJson` → `null`; ids
    repassados.
11. **[direto]** `retornoManual` passa a devolver `this.emissionService.getById(...)` direto: a releitura vem da view.
    Some o `& { releitura }` do tipo de retorno (`Lifecycle.ts:356, 424`) — uma fonte só, mesma chave na resposta.
    Testável: a resposta do upload traz `releitura` igual à do `GET /documents/:id` seguinte.
12. **[direto]** **Teste de integração** (`npm run test:integration`, memória `integration-suite-precisa-de-runinband`)
    que passa pelo repositório real: retorno manual com XML de fixture → `GET /documents/:id` → `releitura.status` e,
    em `producao` de teste (env fake, não `NODE_ENV`), `xmlAttachmentId` não nulo. É a checagem que falharia se a
    premissa F2 estivesse errada.
13. **[direto]** Sem PII: a divergência de `toma.doc` sai **sem** `enviado`/`autorizado` (`toReleituraJson` já descarta
    `null` — `nfseReadback.ts:113-121`). Testável: releitura com `toma.doc` divergente → a view não contém o documento
    do tomador em nenhum campo. `cd server && npx tsc --noEmit`; suíte unit verde.

### PR-2 — Tela da emissão manual (C.2–C.6)

14. **[direto]** `my-app/lib/services/dfe.service.ts`: `getStatus()`, `preview(body: PreviewFiscalDocumentInput)`,
    `emit(body: EmitFiscalDocumentInput)`, `listBySale(unitId, saleId)`, `get(id, unitId)`, `ficha(id, unitId)`,
    `reenviar(id, body: FiscalDocumentActionBodyInput)`, `rejeicaoManual(id, body: RejeicaoManualInput)` (erros montados
    com `nonEmpty()`), `retornoManual(id, unitId, xml: File, pdf?: File)` e `cancelamentoManual(id, fields:
    CancelamentoManualInput, xml: File)` via `postMultipart` (`lib/services/multipart.ts`). Download:
    `accountingService.downloadDocumentAttachment(id, unitId, fileName)` **ao lado** de `downloadReceipt`, reusando
    `reconStreamDownload` no mesmo arquivo (sem 2ª cópia da técnica). Testável: URL, corpo e campos do `FormData`
    exatos (`file`, `pdf`, `unitId`, `cMotivo` como texto, `xMotivo`).
15. **[direto, F-FE-DFE-3]** **Botão "Emitir NFS-e" no `SaleDetailPanel`**, ao lado de Finalizar/Pagar: visível com a
    venda `Finalized` e `status.enabled`. Clique → `preview` → `Modal`:
    - `ok=false` ⇒ lista `faltantes` **íntegros** (texto do BE, F4) e nenhum `emit`;
    - `ok=true` ⇒ mostra quantos documentos saem (`payloads.length`, um por código de serviço), o total
      (`tieOut.vServCents`), aviso se `tieOut.matches=false` e aviso de competência fora do mês (`competenciaAlerta`);
      "Confirmar" → `emit` → abre a ficha do 1º documento.
    O componente novo mora em `features/accounting/components/dfe/` e só é **montado** no painel (o painel legado não
    é reescrito — T6). Testável: `ok=false` não chama `emit`; `ok=true` + confirmar chama `emit` com `{ unitId:
    sale.unitId, saleId, kind: 'NFSE' }`; venda não finalizada não mostra o botão.
16. **[direto]** **Seção "Documentos fiscais"** no mesmo painel (`listBySale`), um cartão por documento: status (mapa
    fechado: `SENT` "aguardando retorno do portal" · `PROCESSING` · `AUTHORIZED` · `AUTHORIZED_DIVERGENT` "autorizada
    com divergência" · `REJECTED` · `CANCELLED`), `cTribNac`, valor (`formatCents`), `nNFSe`/chave, badge de ambiente e
    as `pendencias` (mapa fechado: `releitura_divergente`, `sale_cancelled_with_live_document`,
    `cancelled_without_replacement`). Ações por status, **só com `partner === 'manual'`**:

    | Status | Ações |
    |---|---|
    | `SENT` / `PROCESSING` | Ficha · Registrar retorno (XML) · Registrar rejeição |
    | `REJECTED` | Reenviar → ficha da tentativa nova |
    | `AUTHORIZED` | Baixar XML / Baixar DANFSe (se houver id) · Cancelar |
    | `AUTHORIZED_DIVERGENT` | idem, e a pendência diz que **só sai cancelando** (F-MAN-2b b) |
    | `CANCELLED` | nenhuma (sem substituto: "emita de novo pelo botão") |

    Documento de outro parceiro: só o status, com "emissão automática pelo parceiro". Testável: fixture com os 6
    status mostra as ações certas; `partner: 'null'` não mostra ação manual.
17. **[direto]** **Regra de erro (dossiê §5):** depois de **qualquer** erro de comando (retorno, rejeição, reenvio,
    cancelamento), a tela relê `GET /documents/:id` e desenha o que voltou, sem supor o estado. Caso F6 (500 com o
    documento `AUTHORIZED`, em produção, sem `xmlAttachmentId`) ⇒ aviso "nota autorizada, mas o XML não foi guardado;
    guarde o arquivo — a correção automática vem com o BE-INCR-DFE-ANEXO-PENDENTE". Testável: upload → 500 → o GET
    seguinte devolve `AUTHORIZED` → a tela mostra o aviso e o status autorizado, não "erro".
18. **[direto, F-FE-DFE-5]** **Ambiente:** a ficha mostra o ambiente de `FiscalDocumentView.ambiente` ("Produção" /
    "Homologação"); se divergir de `status.ambiente`, faixa âmbar "o servidor está em X, este documento é de Y — emita
    no ambiente do documento". Link do portal só em produção (G1); em homologação, texto sem link (PV-7). Testável:
    view `homologacao` + status `producao` → faixa aparece.
19. **[direto]** **Ficha espelho (C.3)** em `components/ui/Modal` (`maxWidth` largo, rolagem), dados de `GET …/ficha`
    tipados com `DpsManualPayloadInput` (F16). Quatro seções **na ordem do portal** (G2), cada campo com o **rótulo do
    portal**, o valor **no formato do portal** e um botão de copiar (`navigator.clipboard?.writeText`, precedente
    `DeliveryPanel.tsx:478`; sem clipboard ⇒ o valor fica selecionável). Campos sem valor a copiar viram instrução
    ("marque Prestador", "não marque 'informar a DPS'"). Campo que a releitura confere (tipo `CampoComparado`,
    `nfseReadback.ts:13-26`) leva a marca "conferido na volta". Mapa completo em §3.4. Testável: fixture de DPS do
    Simples → as 4 seções na ordem; `pTotTribSN` aparece e `pTotTrib` não; copiar `vServ` escreve `1234,56`.
20. **[direto]** `features/accounting/lib/portalFormat.ts`, funções puras, uma por formato: data `AAAA-MM-DD` →
    `DD/MM/AAAA`; valor `"1234.56"` → `"1234,56"`; percentual `"2.00"` → `"2,00"`; CPF/CNPJ só dígitos; `cTribNac`
    `"010701"` → `"01.07.01"` (G5). O separador de milhar é uma **constante única**, desligada por padrão (`//
    ponytail: ligar se o runbook mostrar que o portal exige milhar — PV-2`). Testável: tabela de casos por função,
    incluindo `0.5` → `"0,50"`, negativo recusado e `1000000.00` → `"1000000,00"`.
21. **[direto, F-FE-DFE-4]** **Retorno (C.4):** na ficha e no cartão, `input type="file" accept=".xml,text/xml,
    application/xml"` escondido + botão (padrão `NfePanel.tsx:258`), e um 2º input opcional para o DANFSe (PDF).
    Envio → mostra a releitura: `IGUAL` (verde) ou `DIVERGENTE` com tabela campo | enviado | autorizado; campo de PII
    sem valor ⇒ "— (dado pessoal, não exibido)". 422 `DFE_IDENTIDADE_DIVERGENTE` ⇒ mensagem íntegra (ela lista os
    campos) e o documento continua `SENT`. **Depois de recarregar**, a releitura vem de `view.releitura` (PR-1).
    Testável: 200 `DIVERGENTE` → tabela com 1 linha; recarregar → mesma tabela vinda do GET; 422 → mensagem, status
    inalterado.
22. **[direto]** **Rejeição e reenvio (C.5a):** formulário com 1–20 linhas `{ code ≤20, message ≤500 }` ("copie o
    código e a mensagem que o portal mostrou") → `rejeicao-manual` → `REJECTED`. Depois, "Reenviar" (`POST
    …/reenviar`) cria a tentativa n+1 com a DPS **remontada**; a tela orienta "corrija o perfil fiscal ou a venda antes
    de reenviar" e abre a ficha nova. Testável: submit vazio bloqueado; corpo com `errors` não vazio; reenviar → ficha
    com `currentAttemptNo` 2.
23. **[direto, F-FE-DFE-9 fica sobre ele]** **Cancelamento manual (C.5b):** `Modal` vermelho com `cMotivo` (`1` erro na
    emissão · `2` serviço não prestado · `9` outros — transcrição do evento §7, linha 129), `xMotivo` 15–255 com
    contador ("use o mesmo motivo e texto que você digitou no portal"), e o XML do evento obrigatório. Instrução fixa:
    **no portal use "Cancelar", não "Substituir"** (G11: a substituição gera outro evento, que o Luminaris não lê).
    422 `DFE_EVENTO_DIVERGENTE` ⇒ mensagem íntegra. Testável: sem arquivo o botão fica desabilitado; `cMotivo` vai
    como texto no `FormData`; 422 mostra a mensagem.
24. **[direto]** **Downloads:** "Baixar XML" / "Baixar DANFSe" só com id não nulo (em homologação nunca aparecem — F5),
    nome `nfse-<nNFSe ou id>.xml|.pdf`. Testável: `xmlAttachmentId: null` ⇒ sem botão.
25. **[direto]** **Erros e permissões:** `resolveErrorWithCode` (`features/accounting/lib/resolveError.ts:26`); 403
    mostrado íntegro; nada escondido por papel do usuário (a policy é do BE). 409 `DFE_STATUS_INVALIDO` ⇒ relê o
    documento (item 17).
26. **[direto]** **i18n:** `dfe.*` em `accounting.json` e `sales.emitNfse` em `finance_view.json`, pt e en, no mesmo PR.
    Status, pendências e motivos por mapa fechado, com teste de que toda chave dos enums tem tradução. Os `faltantes`
    do preview e as mensagens 4xx são texto do BE em pt-BR e aparecem assim também em en (limite declarado, precedente
    `resolveError`).
27. **[direto]** **Testes vitest** (shim `React` global, `vi.mock` relativo ao teste; esperar o **DOM**, não a chamada
    — memória `handler-async-closure-stale-x-waitfor-tohavebeencalled`): `dfe.service`, `portalFormat`,
    `EmitNfseButton`, `FiscalDocumentsSection`, `FichaModal`, `RetornoManualForm`, `CancelamentoManualModal`.
28. **[direto]** **Gates do FE (C.6):** `npx tsc --noEmit`, `npm run test:types`, `npm run build` e verificação contra o
    build de produção (tela atrás de `withAuth`), com o server do commit exato (`stale-dev-server-serves-old-code`) e
    `DFE_PARTNER=manual`. `neutral-*`/`rounded-2xl` no código novo.
29. **[direto]** **`docs/accounting/RUNBOOK-H2-DFE-MANUAL.md` em branco** (formato
    [`RUNBOOK-FORMAT`](../operating-manual/RUNBOOK-FORMAT.md); é o item 18 do BRIEF DFE-MANUAL), escrito no PR-2 porque
    os passos nomeiam elementos da tela. Conteúdo mínimo em §5. **O agente escreve em branco; evidência colada,
    desfecho e assinatura são do dono.** Runbook sem assinatura é nulo.

---

## 3. Contratos esboçados

> **Notação.** Os esboços estão em Zod porque é a forma da casa para contrato. **Ninguém faz parse deles em
> runtime:** a resposta do BE não é Zod e o `my-app` não tem `zod` (F15). A materialização no FE é `interface` TS
> espelhada à mão com `// espelha <arquivo>:<linha>` (D11); os **corpos de escrita** usam os tipos gerados, nunca
> espelho.

### 3.1 Respostas (materializar como `interface` no service FE)

```ts
// espelha server/src/lib/nfseReadback.ts:13-26 e :106-111
const CampoComparado = z.enum(['prest.CNPJ', 'toma.doc', 'cTribNac', 'cNBS', 'cLocPrestacao', 'dCompet', 'vServ',
  'vDescIncond', 'vDescCond', 'tpRetISSQN', 'pAliq', 'IBSCBS.CST', 'IBSCBS.cClassTrib']);
const Releitura = z.object({
  status: z.enum(['IGUAL', 'DIVERGENTE']),
  divergencias: z.array(z.object({
    campo: CampoComparado,
    grupo: z.enum(['identidade', 'conteudo']),
    tipo: z.enum(['diferente', 'ausente']),
    enviado: z.string().optional(),     // ausente quando o campo é PII (toma.doc)
    autorizado: z.string().optional(),
  })),
});

// espelha FiscalDocumentEmissionService.ts:55-83 + PR-1 (item 10)
const FiscalDocumentStatus = z.enum(['SENT', 'PROCESSING', 'AUTHORIZED', 'AUTHORIZED_DIVERGENT', 'REJECTED', 'CANCELLED']);
const FiscalDocumentView = z.object({
  id: z.string(), kind: z.enum(['NFSE', 'NFE']), status: FiscalDocumentStatus, saleId: z.string(),
  cTribNac: z.string(), anchorEntryId: z.string(),
  ambiente: z.enum(['homologacao', 'producao']), partner: z.string(),      // 'manual' | 'null' | 'disabled' (dfe/*Emissor.ts)
  partnerRef: z.string().nullable(), serie: z.number(), numero: z.string().nullable(),
  nNFSe: z.string().nullable(), chaveOuCodigo: z.string().nullable(),
  dCompet: z.string(),                                                       // AAAA-MM-DD (date-only: sem new Date())
  vServCents: z.string(), tpRetISSQN: z.number(),
  vIssCents: z.string().nullable(), vIbsCents: z.string().nullable(), vCbsCents: z.string().nullable(),
  currentAttemptNo: z.number(), authorizedAt: z.string().nullable(), cancelledAt: z.string().nullable(),
  errors: z.array(z.object({ code: z.string(), message: z.string() })),
  sourceDocumentId: z.string().nullable(),
  attempts: z.array(z.object({ attemptNo: z.number(), ref: z.string(), sentAt: z.string(), resultStatus: z.string().nullable() })),
  pendencias: z.array(z.enum(['releitura_divergente', 'sale_cancelled_with_live_document', 'cancelled_without_replacement'])),
  // PR-1 (novos)
  xmlAttachmentId: z.string().nullable(),
  pdfAttachmentId: z.string().nullable(),
  releitura: Releitura.nullable(),                                           // null: sem retorno manual, ou lista por status
});

// espelha EmissionService.ts:47-53 (preview) e :124-133 (status)
const PreviewResult = z.object({
  ok: z.boolean(), faltantes: z.array(z.string()), competenciaAlerta: z.boolean(),
  payloads: z.array(z.unknown()),                                            // a tela usa só .length
  tieOut: z.object({ vServCents: z.string(), ledgerCents: z.string(), matches: z.boolean() }),
});
const DfeStatus = z.object({
  enabled: z.boolean(), partner: z.string().nullable(), ambiente: z.enum(['homologacao', 'producao']).nullable(),
  reason: z.string().optional(),
  capabilities: z.object({ numbersDps: z.boolean(), consultar: z.boolean(), cancelar: z.boolean(), webhook: z.boolean() }).optional(),
});

// espelha EmissionService.ts:294-301 — payload validado por DpsManualPayloadSchema antes de persistir (F16)
const Ficha = z.object({ documentId: z.string(), status: FiscalDocumentStatus, currentAttemptNo: z.number(),
  payload: /* DpsManualPayloadInput (gerado) */ z.unknown() });

// espelha FiscalProfileService.ts:43-69 (+ CostRegime, lib/nfeCost.ts:28-34) e ServiceFiscalProfileService.ts:13-24 (PR-0)
const FiscalProfileView = UpsertFiscalProfileBody.omit({ unitId: true }).extend({   // campos do corpo, já com defaults
  unitId: z.string(), d1fConfirmado: z.boolean(), updatedAt: z.string(),
  emissao: z.object({ completo: z.boolean(), faltantes: z.array(z.string()), pendingExternalValidation: z.array(z.string()) }),
});
const ServiceFiscalProfileView = z.object({ serviceRef: z.string(), cTribNac: z.string(), cTribNacDescricao: z.string(),
  cTribMun: z.string().nullable(), cNBS: z.string().nullable(), cIndOp: z.string(), cLocPrestacao: z.string().nullable(),
  xDescServ: z.string().nullable(), updatedAt: z.string() });
```

### 3.2 Corpos de escrita (tipos gerados — nunca espelho)

| Chamada | Tipo | Observação |
|---|---|---|
| `preview` / `emit` | `PreviewFiscalDocumentInput` / `EmitFiscalDocumentInput` | `kind: 'NFSE'` |
| `reenviar` | `FiscalDocumentActionBodyInput` | só `unitId` |
| `rejeicao-manual` | `RejeicaoManualInput` | `errors` é `[T, ...T[]]` ⇒ `nonEmpty()` |
| `retorno-manual` (multipart) | `Pick<RetornoManualBodyInput, 'unitId'>` + `File` | campos `file`, `pdf?` |
| `cancelamento-manual` (multipart) | `CancelamentoManualInput` + `File` | `cMotivo` vai como texto; o controller converte (`fiscalDocumentController.ts:234-238`) |
| `PUT fiscal-profile` | `UpsertFiscalProfileInput` | mapper `toUpsertFiscalProfile`, corpo **completo** (F9) |
| `PUT service-fiscal-profiles/:serviceRef` | `UpsertServiceFiscalProfileInput` | mapper `toUpsertServiceFiscalProfile` |

### 3.3 BE — PR-1 (TypeScript, não Zod: a view é interface)

```ts
// FiscalDocumentEmissionService.ts — FiscalDocumentView ganha:
xmlAttachmentId: string | null;
pdfAttachmentId: string | null;
releitura: ReleituraJson['releitura'] | null;
// toView: tentativa corrente → resultJson → JSON.parse guardado → .releitura ?? null
// FiscalDocumentLifecycleService.retornoManual: Promise<FiscalDocumentView>  (sai o "& { releitura }")
```

### 3.4 Mapa da ficha: DPS → portal (Guia v1.2)

✓ = conferido pela releitura. "Instrução" = não há valor a copiar; a ficha diz o que marcar.

| Passo (guia) | Rótulo no portal | Origem na DPS (`infDPS.…`) | Formato copiado | ✓ | Página |
|---|---|---|---|---|---|
| 1 Pessoas | Data de Competência | `dCompet` | `DD/MM/AAAA` | ✓ | 20 |
| 1 | "Informar a DPS" | — | instrução: **não marcar** (F-MAN-4 a) | | 20–21 |
| 1 | Emitente da NFS-e | `tpEmit = 1` | instrução: **Prestador** | | 21–22 |
| 1 | CPF/CNPJ do emitente | `prest.CNPJ` | 14 dígitos — conferência (vem do cadastro RFB) | ✓ | 22 |
| 1 | Município do emitente | `cLocEmi` | conferência (preenchido pelo portal) | | 22 |
| 1 | Opção no Simples Nacional | `prest.regTrib.opSimpNac` | conferência (`1` não optante · `3` ME/EPP) | | 22–23 |
| 1 | Regime de Apuração Tributária pelo SN | `prest.regTrib.regApTribSN` | rótulo do [141] (PV-9) | | 23 |
| 1 | Tomador do Serviço | `toma` | instrução: **Brasil** | | 24–25 |
| 1 | CPF/CNPJ do tomador | `toma.CPF` \| `toma.CNPJ` | só dígitos | ✓ | 25 |
| 1 | Nome/Razão Social | `toma.xNome` | texto (o portal recupera do cadastro) | | 25 |
| 1 | Endereço do tomador | — (a DPS não leva) | F-FE-DFE-8 / PV-3 | | 25–26 |
| 1 | Intermediário | — | instrução: **não informado** | | 28–29 |
| 2 Serviço | Local da prestação — País / Município | `serv.locPrest.cLocPrestacao` | F-FE-DFE-7 / PV-4 | ✓ | 34–35 |
| 2 | Código de Tributação Nacional | `serv.cServ.cTribNac` | `01.07.01` (G5) | ✓ | 35, 38 |
| 2 | Código Complementar do Município | `serv.cServ.cTribMun` | como está (se houver) | | 35, 39 |
| 2 | Imunidade, exportação ou não incidência? | — | instrução: **Não** (operação tributável) | | 35–36 |
| 2 | Descrição do Serviço | `serv.cServ.xDescServ` | texto integral | | 39 |
| 2 | Item da NBS | `serv.cServ.cNBS` | código (se houver; PV-2) | ✓ | 39–40 |
| 2 | Código interno do contribuinte | — | PV-8 | | 40 |
| 3 Valores | Valor do Serviço prestado | `valores.vServPrest.vServ` | `1234,56` | ✓ | 48–49 |
| 3 | Desconto incondicionado / condicionado | `valores.vDescCondIncond.*` | `1234,56` (se houver) | ✓ | 49 |
| 3 | Tributação do ISSQN | `valores.trib.tribMun.tribISSQN = 1` | instrução: **Operação tributável** | | 50 |
| 3 | Regime Especial de Tributação | `prest.regTrib.regEspTrib` | rótulo do [142] (PV-9) | | 50 |
| 3 | Exigibilidade suspensa? | — | instrução: **Não** | | 51 |
| 3 | Retenção do ISSQN | `valores.trib.tribMun.tpRetISSQN` | `1` ⇒ **Não** · `2` ⇒ **Sim, retido pelo tomador** | ✓ | 52 |
| 3 | Benefício municipal / dedução | — | instrução: **Não** | | 53–55 |
| 3 | Alíquota | `valores.trib.tribMun.pAliq` | `2,00` — conferência (o portal pode calcular) | ✓ | 57–58 |
| 3 | Tributação federal | — | Simples: instrução "já preenchida" (G8); regime normal: não informar PIS/COFINS | | 58–61 |
| 3 | Valor aproximado dos tributos | `valores.trib.totTrib.pTotTribSN` \| `pTotTrib.{Fed,Est,Mun}` | `12,34` (%) — PV-5 | | 61–62 |
| 3 | IBS/CBS (só se o grupo existir) | `IBSCBS.valores.trib.gIBSCBS.{CST,cClassTrib}` | como está — PV-10 | ✓ | — |
| 4 Emitir | Resumo + "Emitir NFS-e" | — | instrução: conferir; depois **Baixar XML** (e DANFSe) e enviar aqui | | 62–65 |

---

## 4. Forks — RATIFICAÇÃO PENDENTE

### F-FE-DFE-6 — Onde vivem as telas de perfil fiscal (PR-0)

- **(a)** Aba nova "Perfil fiscal" no `AccountingView`, com unidade e serviços.
- **(b)** Dentro da aba "NF-e", abaixo das importações.
- **(c)** Dentro de "Compliance", junto com Lalur/SPED/revisão.
- **Recomendação: (a).** O perfil serve à NF-e de compra (X6) **e** à NFS-e de venda; em (b) a configuração some
  dentro de uma aba de importação, e "Compliance" já tem 5 painéis empilhados (`AccountingView.tsx:357-365`).
  Delegável. **PENDENTE.**

### F-FE-DFE-7 — Município do local da prestação sem tabela IBGE → nome

O portal busca o município pelo **nome** (G6); o Luminaris só tem o código IBGE (`cLocPrestacao`) e não há tabela de
nomes no repositório (`git ls-files | grep -i "ibge\|municip"` = 0).

- **(a)** A ficha mostra o código e, quando `cLocPrestacao === cLocEmi`, a instrução "o mesmo município do emitente".
- **(b)** Transcrever o Anexo A (municípios IBGE; `nfse-anexo-a` no MANIFEST) numa lista estática e mostrar o nome.
- **(c)** Campo "nome do município" no perfil fiscal da unidade.
- **Recomendação: (a).** O salão presta no próprio município, e o 1º cliente está em SP capital. (b) é insumo novo
  (5.570 linhas) para um caso que o 1º cliente não tem; (c) duplica dado que o portal já sabe. Reabrir se o runbook
  (PV-4) mostrar que a busca não aceita o código. **PENDENTE.**

### F-FE-DFE-8 — Endereço do tomador

O guia marca CEP e endereço como "Obrigatório" para "Tomador no Brasil" (G7). A DPS do Luminaris não leva `toma/end`
(`EmissionService.ts:651-657`), e a releitura não compara endereço.

- **(a)** A ficha mostra só o que a DPS tem; o operador digita o endereço no portal a partir do próprio cadastro.
- **(b)** A rota `ficha` passa a devolver o endereço do cliente (tabela `customers`) — mais um toque no BE, com PII.
- **(c)** A DPS passa a levar `toma/end` — muda o X10b e depende do Anexo A UF → IBGE (a lacuna F-DFE-14).
- **Recomendação: (a) até o runbook medir (PV-3).** A obrigatoriedade na tabela do guia conflita com o leiaute
  (`toma/end` 0-1 no Anexo I); só o portal ao vivo decide. Se o portal exigir, (b) é o passo seguinte, e (c) só entra
  com o F-DFE-14. **PENDENTE.**

### F-FE-DFE-9 — Cancelamento manual se o portal não entregar o XML do evento

O guia v1.2 diz que os eventos vinculados à nota "estão disponíveis somente no formato HTML" (G10, p. 80). O
F-MAN-5 (a), ratificado em 27/09, exige o XML do evento `e101101` assinado (F8). O fork é do **dono** porque reabre
uma decisão ratificada; este BRIEF só o registra.

- **(a)** Manter o F-MAN-5 (a). O PR-2 constrói o C.5b com o upload obrigatório, e o runbook (PV-1) mede se o portal
  entrega o XML. Se não entregar, o dono reabre o F-MAN-5 com o resultado na mão.
- **(b)** Reabrir o F-MAN-5 agora, para (c) do BRIEF DFE-MANUAL: XML em produção, declaração em homologação.
- **(c)** Obter o evento pela API do ADN (consulta por chave, com certificado) — é trabalho do X10i, e o 1º cliente
  pode não ter certificado A1.
- **Recomendação: (a).** O guia pode estar defasado em relação ao portal. Verificar custa um passo do runbook, e
  construir contra o contrato atual não gera retrabalho: se o dono mudar, o arquivo só deixa de ser obrigatório.
  **Custo de (a) se o guia estiver certo:** até a reabertura, o cliente cancela no portal e o documento fica
  `AUTHORIZED` no Luminaris, com proveniência viva no razão. **PENDENTE.**

---

## 5. Pendências de validação externa (fonte citada, grau declarado)

Todas fecham no **`RUNBOOK-H2-DFE-MANUAL`** (item 29), executado e assinado pelo dono. O agente prepara o runbook em
branco com um passo por pendência; não preenche evidência, não marca desfecho, não assina.

| # | O que medir | Fonte e grau | Efeito se der errado |
|---|---|---|---|
| PV-1 | O portal entrega o **XML do evento** de cancelamento? | Guia p. 80: só HTML — **verificado no guia**, não visto ao vivo | F-FE-DFE-9 volta ao dono |
| PV-2 | Formato aceito ao colar: data `DD/MM/AAAA`, valor sem milhar, CPF/CNPJ só dígitos, `cTribNac` com pontos, NBS | Guia dá o tipo ("Data", "Valor", "Numérico") sem máscara — **inferido** | ajustar `portalFormat.ts` (a constante do milhar é o botão de calibração) |
| PV-3 | "Tomador no Brasil" exige CEP e endereço? | Guia p. 25 "Obrigatório" × Anexo I `toma/end` 0-1 — **conflito entre fontes** | F-FE-DFE-8 → (b) |
| PV-4 | A busca do município aceita o código IBGE? | Guia p. 34: "3 caracteres do nome" — **verificado** que pede nome; código não testado | F-FE-DFE-7 → (b) ou (c) |
| PV-5 | Como o portal pede o `pTotTribSN` do Simples | Guia p. 61–62 mostra Federal/Estadual/Municipal; a configuração da p. 16–17 está em imagem — **não verificado**. A releitura não compara `totTrib` | só a instrução da ficha muda; o valor do IBPT é do contador (D1f) |
| PV-6 | A "Emissão Simplificada" aparece para o Simples? | Guia p. 17 × p. 66 (G13) — **contradição** | nenhum: a ficha espelha a Completa, que vale para todos (p. 17) |
| PV-7 | URL e existência da homologação ("produção restrita") | BRIEF DFE-MANUAL §6 p3 — **secundária** | enquanto aberto, a ficha não linka homologação |
| PV-8 | "Código interno do contribuinte" é obrigatório? | Guia p. 40 marca "Obrigatório"; a DPS não tem o campo — **não verificado** | instrução na ficha (ex.: usar o id da venda) |
| PV-9 | Rótulos dos combos de `regApTribSN` [141] e `regEspTrib` [142] | Leiaute (Anexo I) no corpus; rótulos do portal não constam do guia — **inferido** | só texto da ficha |
| PV-10 | Onde o portal pede CST/cClassTrib do IBS/CBS | Não aparece nas tabelas das p. 48–62 — **não verificado**. Não afeta o 1º cliente (Simples: IBS/CBS só em 2027 — decisão 29/09 §"Fatos") | instrução da ficha |

### Conteúdo mínimo do runbook (o agente escreve em branco no PR-2)

1. Pré-condições com evidência a colar: `DFE_PARTNER=manual` e o ambiente; perfil fiscal completo (`emissao.completo`);
   serviço com perfil; cliente com CPF/CNPJ válido; venda finalizada e contabilizada.
2. Nota 1: emitir pela tela → ficha → portal → baixar o XML → enviar → releitura **IGUAL** (print da tela + chave).
3. Nota 2: erro de digitação proposital num campo ✓ (ex.: valor) → releitura **DIVERGENTE** apontando o campo.
4. Um passo por PV-1..PV-10, com "o que o portal mostrou" colado.
5. Rejeição: o portal recusa → rejeição registrada → reenvio → ficha da tentativa 2.
6. Cancelamento da nota 2 pelo portal ("Cancelar", não "Substituir") → XML do evento (PV-1) → documento `CANCELLED`.
7. Desfecho em 3 estados e assinatura: **do dono**.

---

## 6. Insumos ausentes

- **IA-1** — Tabela IBGE → nome do município (Anexo A). Baixado no corpus (`nfse-anexo-a`), sem transcrição. Só é
  necessário se o F-FE-DFE-7 for para (b).
- **IA-2** — Prints do portal ao vivo. Pela política do passo 0.6, só se o portal divergir do guia; o runbook os coleta.
- Nenhum insumo falta para escrever PR-0, PR-1 e PR-2 com as recomendações.

---

## 7. Achados fora de escopo (não planejados aqui)

1. **A1 — `xMotivo` do cancelamento manual é aceito e descartado.** O corpo exige 15–255 caracteres, mas o texto
   gravado é o do XML (`Lifecycle.ts:477`). É a classe `param-aceito-e-ignorado-e-bug`. A tela pede o texto e orienta a
   repetir o do portal. O conserto (tirar o campo do DTO, ou 422 se divergir) é do BE; candidato ao GAP-MAP.
2. **A2 — Substituição de NFS-e (G11) não é lida:** o parser só aceita `e101101` (`nfseEvento.ts:49-50`). A tela
   orienta "Cancelar". Suportar a substituição é frente nova.
3. **A3 — Seletor de código de serviço por lista (LC 116 / NBS / IndOp):** não há rota. O PR-0 usa texto e a validação
   do BE, que devolve a descrição depois de salvar.
4. **A4 — `SaleDetailPanel` com `gray-*`/`rounded-xl`:** o PR-2 só monta os componentes novos; não reescreve o legado.
5. **A5 — Lista global de NFS-e pendentes de retorno** (`GET /documents?status=SENT`): a porta de entrada é a venda.
   Uma lista por status é frente própria, se o uso pedir.
6. **A6 — `issRetidoTomadorPj=true` e pacote `VENDA` bloqueiam a emissão** (lacunas F-DFE-14 e item 21 do X10b): a
   tela mostra o faltante do BE, não resolve.
7. **A7 — `ServiceFiscalProfile` por `serviceRef` lido com `limit=500`:** mesmo teto da técnica do `NfePanel` (memória
   `crm-shared-table-loader-fetch-all`).
8. **A8 — Entregar a nota ao tomador (e-mail ou WhatsApp) não está planejado** (registro de 02/10). A tela só
   oferece "Baixar XML" e "Baixar DANFSe" (item 24), e só em produção (F5); o servidor não tem transporte de
   e-mail. Fork **F-COB-1**, pendente do dono, em [`MAPA-COBERTURA-EMISSAO-2026-10-02.md`](MAPA-COBERTURA-EMISSAO-2026-10-02.md) §3.1. A recomendação de lá acrescenta um passo ao
   runbook do item 29: conferir se o portal envia a nota ao tomador.

---

## 8. Plano de execução por fatias (para a `sessao-feature`)

| PR | Itens | Toca | Depende de | Pronto quando |
|---|---|---|---|---|
| **PR-0** | 1–9 | `my-app` (service, 2 painéis, aba, i18n, testes) + seção do RUNBOOK-H2 | SEED-UNITS em `main`; "executa"; F-FE-DFE-6 | gates do item 9 verdes, CI verde |
| **PR-1** | 10–13 | `server` (`toView`, `retornoManual`, teste unit + integração) | "executa" | `tsc` + unit + integração verdes na CI Linux (memória `windows-serializa-sqlite-ci-linux-nao`) |
| **PR-2** | 14–29 | `my-app` (service, botão, seção, ficha, formulários, i18n, testes) + `RUNBOOK-H2-DFE-MANUAL.md` | PR-0 e PR-1 em `main`; F-FE-DFE-7/8/9 | gates do item 28 verdes; runbook em branco commitado |
| **Gate** | — | humano | PR-2 | runbook assinado pelo dono (Fase D do plano) |

Fold depois de cada merge: nota do nó (`estado`, `prs`) + `node scripts/plano-vault.mjs index` e `check`.

---

## 9. Gates de envio [OPS-001]

1. **Objetivo:** a frase das duas primeiras linhas do cabeçalho diz o que a tela faz, em que ordem entra e o que
   pode impedi-la de funcionar (PV-1 / F-FE-DFE-9).
2. **Grau:** §1 e §5 marcam verificado / inferido / conflito em cada fato; os de portal ao vivo estão todos como não
   verificados.
3. **Caso adversarial tentado:** "a releitura precisa ser persistida" (premissa do pedido) — li o serviço **e** o
   repositório e ela já é gravada (F2); o item 12 é o teste que falharia se eu tivesse lido errado. Segundo caso:
   "o cancelamento manual funciona pelo portal web" — o guia diz o contrário (G10), e isso virou o F-FE-DFE-9 em vez de
   ser tratado como resolvido.
4. **Checagem que teria falhado:** o teste de integração do item 12 (releitura lida do banco depois do upload) e o
   passo PV-1 do runbook.
5. **Duas primeiras linhas:** entregam os 3 PRs e o risco principal.

**Vieses meus (T8):** (i) as recomendações dos 4 forks novos são minhas, e três delas escolhem "não fazer agora" —
viés de minimalismo; o dono pediu completude (memória `dono-quer-completude-nao-mvp`), por isso cada uma diz o que a
reabre. (ii) Os formatos de §3.4 vêm do guia, não do portal; a tela pode precisar de ajuste depois do runbook. (iii)
Li o guia por extração de texto: as imagens das telas (p. 16–17 e partes da p. 58–62) não foram vistas, e é daí que
vêm as PV-5 e PV-9.
