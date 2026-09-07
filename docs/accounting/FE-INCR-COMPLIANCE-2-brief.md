# BRIEF — FE-INCR-COMPLIANCE-2 (botão ECF Lucro Real + import do catálogo referencial, aba Compliance)

> Produzido por **sessão de planejamento**, 2026-09-07, sobre `origin/main` `d162cd4d` (PR #270
> mergeado). Não contém código de aplicação, não ratifica fork. Todo fork abaixo está
> **RATIFICAÇÃO PENDENTE** — decisão do dono, fora desta sessão (ORCH-006). Sem os forks ratificados
> a `sessao-feature` não abre.

## Cabeçalho

- **Item a planejar:** frontend de dois endpoints já em `main` sem consumidor FE: `POST
  /api/accounting/sped/ecf/real/generate` (ECF Lucro Real, esqueleto — PR #263 `6af66557`/`02fc802b`)
  e `POST /api/accounting/referential/catalog/import` (catálogo oficial RFB — BE-INCR-9B Track B).
  Ambos vivem na aba **Compliance** do painel contábil (`my-app/features/accounting/AccountingView.tsx:336-341`),
  que já monta `<CompliancePanel unitId={unitId} /><SpedGenerationPanel unitId={unitId} />` — este
  BRIEF estende os dois componentes existentes (ou um irmão do segundo — Fork F-COMP2-1), **não** cria
  aba nova.
- **Autorização (ORCH-006):**
  [CEDULA-DECISAO-2026-09-03-modulos.md](CEDULA-DECISAO-2026-09-03-modulos.md) §E linha X3: *"BRIEF
  **FE-INCR-COMPLIANCE-2**: botão ECF Lucro Real + import do catálogo na aba Compliance —
  `sessao-planejamento` — F-M2 (telas do já-existente)"*; F-M2 (linha 33) fixa o escopo máximo do
  fiscal. `ACCOUNTING-MASTER-MAP.md:498`: *"Telas do já-existente sem consumidor FE — ⏳ autorizado
  BRIEF 2026-09-03 (F-M2/F-M4)... `sped/ecf/real/generate` (0), `referential/catalog/import` (0).
  Dois BRIEFs: `FE-INCR-AUDIT-PROVENANCE` (contábil) e `FE-INCR-COMPLIANCE-2` (fiscal)."*
  `docs/accounting/PLANO-SDD-SEQUENCIAL-2026-09-07.md` rodada 4 (nó **X3**, `ready`, sem aresta de
  entrada — `GRAFO-DEPENDENCIAS-2026-09-07.md` linha 173/189) — gatilho *"planeja o lote FE de telas
  faltantes"*, disparado pelo dono em 2026-09-07: *"Pode disparar o plano em multi agent sonnet até
  finalizar"*. A autorização cobre **produzir este BRIEF** e nada além; a implementação é sessão
  própria, à parte.
- **Divergência de letra vs. objetivo (T1):** nenhuma. A letra ("botão ECF Lucro Real + import do
  catálogo na aba Compliance") e o objetivo coincidem — os dois consumidores caem exatamente nos
  componentes que já renderizam essa aba.
- **Fatos verificados nesta sessão (código, não memória):**
  - `my-app/lib/services/sped.service.ts` expõe `generateAndDownloadEcd`/`generateAndDownloadEcf`
    (Presumido) e **NENHUMA** função para `sped/ecf/real/generate` — grep confirma zero ocorrência de
    `Real`/`real` no arquivo.
  - `my-app/lib/services/referential.service.ts` expõe `getCoverage`/`getSkeleton`/`listMappings`/
    `batchSet`/`copyVersion`/`unset` — **nenhuma** função de import de catálogo; grep de
    `referential/catalog` em `my-app/**` retorna zero.
  - `server/src/controllers/spedController.ts:68-84` (`generateSpedEcfReal`) e
    `server/src/features/accounting/dtos/SpedEcfRealDto.ts`: `fiscal.formaTrib` tem **default `'1'`**
    no Zod (`.regex(/^\d$/).default('1')`); `fiscal.formaTribPer` é **obrigatório, sem default**
    (`.length(4)`); `fiscal.formaApur` é `z.enum(['T']).default('T')` — **só existe um valor aceito**
    (Fork 5 do ADR, ratificado). **Divergência de documentação, não de contrato:** o comentário do
    controller (`spedController.ts:63`) e o `docs.paths.ts:2381` ("FORMA_TRIB and FORMA_TRIB_PER are
    REQUIRED with no server default") dizem que `formaTrib` não tem default — o **DTO real** (fonte de
    verdade) diverge: `formaTrib` tem default `'1'`, só `formaTribPer` não tem. Registrado como achado,
    não como fork (o DTO manda).
  - `declarant: DeclarantSchema` e `signers: z.array(SignerSchema)...superRefine(refineEcfSigners)` no
    `SpedEcfRealRequestSchema` são **importados de `SpedEcfDto.ts`** — o MESMO objeto de domínio do
    Presumido, ainda vivo dos dois lados (critério de reuso, Etapa 1+2 fecham). Logo os tipos
    `EcfDeclarant`/`EcfSigner` e os componentes `EcfSignersEditor`/`validateEcfSigners` de
    `SpedGenerationPanel.tsx:48-58,398-448` são **reusáveis sem alteração** para o formulário Real.
  - `server/src/controllers/referentialCatalogController.ts:38-42`: import do catálogo é
    **admin-only** (`user.role !== 'ADMIN'` → 403), checado **antes** da policy
    (`canManageReferential`) e antes de qualquer leitura de arquivo — dois gates independentes.
  - `server/src/features/accounting/services/ReferentialCatalogService.import()` (linhas 73-119) é
    **all-or-nothing** (header/linha inválida rejeita o arquivo inteiro, nenhuma escrita parcial) e
    **idempotente** por `@@unique([layoutVersion, code])` (reimport = upsert). Formato aceito pelo
    parser (`server/src/lib/referentialCatalog.ts:39`): colunas **nomeadas** `code,name,isAnalytic,
    parentCode` (`parentCode` opcional) — **não** é o XLSX cru da RFB; o `RUNBOOK-X2-RFB-REFERENCIAL.md`
    já documenta a conversão humana (script ou mapeamento manual de colunas) como pré-requisito.
  - **Achado de maior risco silencioso (OPS-004):** `ReferentialMappingService.
    resolveDestinationLabel()` (linhas 231-262) **já valida** `referentialCode` contra o catálogo
    **quando ele existe** para a versão (D3/D9 do ADR-INCR9B, já mergeado) — rejeita código sintético
    ou ausente do catálogo com `ValidationError` pt-BR. Isso significa que **assim que o operador
    importar o 1º catálogo de uma versão**, a tela de Mapeamento **já existente**
    (`CompliancePanel.tsx`, seção "Mapeamento Referencial") passa a **rejeitar** códigos que antes eram
    aceitos livremente — comportamento do backend já em `main`, invisível até agora por falta de
    consumidor do import. A tela nova não precisa implementar essa validação (o servidor já faz), mas
    precisa **avisar** o operador que o efeito existe.
  - `resolveDestinationLabel` também **re-snapshota o `label`** a partir do catálogo quando o código
    existe — o campo "Rótulo" que o operador digita na seção de Mapeamento é **sobrescrito** pelo nome
    oficial após o import estar carregado. Não requer mudança de código na seção de Mapeamento (já
    existente, fora de escopo), só nota textual.
  - `dataExchangeService.importFile` (`my-app/lib/services/dataExchange.service.ts:116-130`) é a
    técnica multipart canônica (`fetch`+`FormData`, sem `Content-Type` manual, `authHeaders()` via
    cookie `auth_token`) — **3º site** a precisar dela depois de `accounting.service.ts:788-808`
    (OFX/CNAB) e `crm.service.ts:197-199` (já achado pelo BRIEF irmão `FE-INCR-NFE`, fork F-FENFE-7,
    ainda `RATIFICAÇÃO PENDENTE`).
  - `my-app/components/layout/Navbar.tsx:204` é o único precedente de role-gate por
    `user?.role === 'ADMIN'` no app, via `useAuth()` de `lib/context/AuthContext`. Nenhum componente
    de `features/accounting/` faz isso hoje.
  - `EXPORT_SPED_ECF_REAL` **não** entra em `ImportExportPanel.tsx`/`dataExchange.service.ts`
    (`ExportKind`) — o fluxo SPED usa rota dedicada + `dataExchangeService.downloadArtifact`, nunca o
    `exportReport` genérico. Nenhum outro arquivo FE precisa citar o `kind` novo.
  - `accounting.json` pt/en: **847 = 847** chaves (medido nesta sessão) — gate a manter. Chaves de erro
    de signatário (`sped.error.ecfSignerCount|ecfContador|ecfContadorCrc|signersIncomplete`) já
    existem e são **reusáveis sem chave nova** porque `validateEcfSigners` é a mesma função.
  - Testes: vitest, shim `globalThis.React`; `SpedGenerationPanel.test.tsx` e
    `CompliancePanel.test.tsx` já usam `vi.mock` sobre `sped.service`/`referential.service`
    respectivamente — os mocks precisam **crescer** (nova função), não recriar o padrão.
- **Divergência memória/docs × código:** nenhuma. `accounting-ecf-fase3-lucro-real` (memória) e a
  linha do master map batem com `main`; o achado novo (resolveDestinationLabel já valida) não estava
  registrado em nenhum doc consultado — é achado desta sessão, não erro de registro anterior.

## Insumos existentes (lidos nesta sessão)

| Insumo | Caminho | O que fixa |
|---|---|---|
| Rota + controller ECF Real | `server/src/routes/accounting.ts:133`, `server/src/controllers/spedController.ts:60-84` | rota dedicada (Fork 1→b do ADR), 201/400/401/403 |
| DTO ECF Real | `server/src/features/accounting/dtos/SpedEcfRealDto.ts` | `formaTrib` default `'1'`, `formaTribPer` obrigatório, `formaApur` fixo `'T'`, reuso de `DeclarantSchema`/`SignerSchema` |
| OpenAPI | `server/src/routes/docs.paths.ts:2341-2398` | schema documentado (nota: diverge do DTO real em "required", ver achados) |
| ADR | `docs/adr/ADR-INCR-SPED-ECF-FASE3-lucro-real.md` | Forks 1/5 ratificados, 2/3/4 pendentes; blocos L/M/N vazios até então — a tela NÃO pode prometer conteúdo |
| Golden ref — formulário ECF Presumido | `my-app/features/accounting/components/SpedGenerationPanel.tsx` | `Field`, `inputClass`, `UF_CODES`, `EcfSignersEditor`, `validateEcfSigners`, `emptyEcfSigner` — todos reusáveis |
| Golden ref — service SPED | `my-app/lib/services/sped.service.ts` | padrão "só campos obrigatórios são enviados" + `dataExchangeService.downloadArtifact` |
| Rota + controller catálogo | `server/src/routes/accounting.ts:146`, `server/src/controllers/referentialCatalogController.ts` | admin-only (403 antes da policy), multipart `file`, `unitId`+`layoutVersion` |
| DTO catálogo | `server/src/features/accounting/dtos/ReferentialCatalogDto.ts` | `unitId` = `idLike` (`^[A-Za-z0-9_-]+$`), `layoutVersion` string livre ≤32 |
| Service catálogo | `server/src/features/accounting/services/ReferentialCatalogService.ts` | all-or-nothing, idempotente, retorna `{layoutVersion,totalRows,imported,analyticCount,syntheticCount}` |
| Parser do arquivo | `server/src/lib/referentialCatalog.ts:39` | colunas nomeadas `code,name,isAnalytic,parentCode` — não é o XLSX oficial cru |
| ADR catálogo | `docs/adr/ADR-INCR9B-referential-catalog-seed.md` (D1/D3/D4/D9), `docs/adr/ADR-INCR9-referential-chart-mapping.md` | D1 guarda-corpo (nunca placeholder); D9 label auto-preenchido; catálogo é global, sem tenancy |
| Runbook do gate humano | `docs/accounting/RUNBOOK-X2-RFB-REFERENCIAL.md` | já antecipa (2026-08-17) "na UI isso corresponde ao upload... na aba Compliance"; passos 1/2 hoje descrevem só `curl`/script |
| Efeito colateral já mergeado | `server/src/features/accounting/services/ReferentialMappingService.ts:231-262` | validação de destino já ativa quando o catálogo existe (D3/D9) — risco silencioso a nomear na tela |
| Golden ref — upload multipart | `dataExchangeService.importFile` (`dataExchange.service.ts:116-130`) | técnica a clonar (fetch+FormData, sem Content-Type, `authHeaders()`) |
| Golden ref — role-gate | `Navbar.tsx:204` (`useAuth` + `user?.role === 'ADMIN'`) | único precedente no app |
| Reuso canônico | `Modal`, `resolveError`, `formatCents`, `useAccountingT`, `notify` | obrigatórios (my-app/CLAUDE.md §1) — `Modal` não é necessário aqui (nenhum fluxo pede diálogo modal; as duas seções são inline, como as demais da aba) |

## Backend real (contrato extraído do código)

```
POST /api/accounting/sped/ecf/real/generate   application/json   Bearer JWT
  unitId:    string
  year:      integer, 2015..2100
  declarant: DeclarantSchema (idêntico ao ECF Presumido — cnpj,nome,codNat,cnaeFiscal,endereco,
             num?,compl?,bairro,uf,codMun,cep,numTel?,email)
  fiscal:    { formaTrib?: '\d' (default '1'), formaTribPer: 4 chars (OBRIGATÓRIO, sem default),
               formaApur?: 'T' (default 'T', único valor aceito),
               indAliqCsll?: '1'|'4' (default '1'), indRecReceita?: '1'|'2' (default '2') }
  signers:   SignerSchema[] (1..2) — mesma regra refineEcfSigners do Presumido (≥1 contador
             IDENT_QUALIF='900' com CPF 11 dígitos + indCrc; ≥1 não-contador)
  201 → { success: true, data: DataExchangeJob (kind: EXPORT_SPED_ECF_REAL) }
  400 Zod/ValidationError · 401 · 403

POST /api/accounting/referential/catalog/import   multipart/form-data   Bearer JWT   ADMIN-ONLY
  file:          CSV/XLSX (obrigatório; ≤10 MB; colunas NOMEADAS code,name,isAnalytic,parentCode?)
  unitId:        string (^[A-Za-z0-9_-]+$ — só resolve o escopo de autorização; catálogo é GLOBAL)
  layoutVersion: string ≤32 (ex. "2025" — recomendação D7: igual ao mappingVersion do Mapeamento)
  201 → { success: true, data: { layoutVersion, totalRows, imported, analyticCount, syntheticCount } }
  400 (header/linha inválida, catálogo vazio) · 401 · 403 (role≠ADMIN OU !canManageReferential)

GET /api/accounting/data-exchange/jobs/:jobId/download   (já em uso por generateAndDownloadEcd/Ecf)
  — reusado sem mudança para baixar o .txt do ECF Real
```

## Contratos a materializar no FE (esboço)

```ts
// my-app/lib/services/sped.service.ts (estender — novos exports; nada existente muda)
export interface EcfRealFiscal {
  formaTrib?: string;      // opcional — servidor default '1'; ver Fork F-COMP2-2
  formaTribPer: string;    // OBRIGATÓRIO, 4 caracteres — sem default no servidor
  indAliqCsll: '1' | '4';
}
export interface GenerateEcfRealPayload {
  unitId: string;
  year: number;
  declarant: EcfDeclarant;  // REUSO — mesmo tipo do Presumido (DeclarantSchema idêntico)
  fiscal: EcfRealFiscal;    // indRecReceita hardcoded '2' no payload, como o Presumido já faz
  signers: EcfSigner[];     // REUSO — mesmo tipo do Presumido (SignerSchema + refineEcfSigners)
}
// generateAndDownloadEcfReal(payload): Promise<DataExchangeJob>
//   POST /accounting/sped/ecf/real/generate → downloadArtifact(job.id, unitId,
//   job.fileName ?? `sped-ecf-real-${year}.txt`) — mesmo padrão de generateAndDownloadEcf

// my-app/lib/services/referential.service.ts (estender — novo export)
export interface ReferentialCatalogImportResult {
  layoutVersion: string; totalRows: number; imported: number;
  analyticCount: number; syntheticCount: number;
}
// importCatalog(unitId: string, layoutVersion: string, file: File): Promise<ReferentialCatalogImportResult>
//   fetch + FormData({file, unitId, layoutVersion}), sem Content-Type manual, Authorization via
//   cookie auth_token — clone de dataExchangeService.importFile (Fork F-COMP2-7 decide ONDE
//   vivem os helpers authHeaders/baseUrl/parseError compartilhados)
```

Regra dura herdada do ADR (D1 do INCR9B + honestidade do ADR-FASE3): **a tela não infere, não
completa e não promete** nenhum valor fiscal — nem código RFB (D1), nem conteúdo de L/M/N (esqueleto).
Tudo que ela faz é coletar o que o DTO exige e mostrar o que o servidor devolve.

## Checklist numerado de comportamentos (cada um testável)

**A. Cliente de API**

1. `sped.service.ts`: nova `generateAndDownloadEcfReal` + tipos `EcfRealFiscal`/
   `GenerateEcfRealPayload` reusando `EcfDeclarant`/`EcfSigner` sem redefinir shape. Teste: o body
   POST capturado bate campo-a-campo com o DTO (nem um a mais — `.strict()`). **Direto.**
2. `formaTrib` é **opcional** no tipo TS; quando o operador não editar, **omitido** do payload
   (servidor supre `'1'`) — mesmo padrão que o cabeçalho de `sped.service.ts` já documenta para
   ECD/ECF. **Direto** (a decisão de EXIBIR o campo é a Fork F-COMP2-2).
3. `formaApur` **nunca** é enviado pelo cliente — só `'T'` existe no enum do servidor (Fork 5
   ratificado); é redundante e um valor divergente já falharia sozinho. **Direto.**
4. `referential.service.ts`: nova `importCatalog(unitId, layoutVersion, file)`, técnica clonada de
   `dataExchangeService.importFile`. Teste: `FormData` capturado tem exatamente `file`, `unitId`,
   `layoutVersion`; sem `Content-Type` manual. **Fork F-COMP2-7** (onde vivem os helpers
   compartilhados — mesma classe do F-FENFE-7 do BRIEF irmão `FE-INCR-NFE`).
5. `notify()` só em sucesso de mutação (padrão dos demais services). **Direto.**

**B. Tela — "Gerar SPED ECF (Lucro Real)"**

6. Nova seção com o mesmo padrão visual das seções ECD/ECF existentes (`rounded-2xl border
   border-neutral-800 bg-neutral-900/50 p-5`, `h2`+`p`, grid de campos). **Fork F-COMP2-1** decide o
   arquivo (mesmo `SpedGenerationPanel.tsx` vs. componente novo); o conteúdo do formulário é
   idêntico nos dois casos.
7. **Banner de honestidade, fixo e não-dispensável:** "Esqueleto — blocos L, M e N saem vazios;
   `HASH_ECF_ANTERIOR` sempre vazio; Forks 2, 3 e 4 do ADR ainda pendentes de ratificação e do
   Manual do Leiaute 12." Âncora textual: `docs/adr/ADR-INCR-SPED-ECF-FASE3-lucro-real.md` §4/§7.
   **Direto — gate de honestidade** (mesma classe do F-FENFE-1/17 do BRIEF irmão); só a FORMA do
   aviso (banner permanente vs. confirmação single-shot) é a **Fork F-COMP2-4**.
8. Campos: ano, declarante (10 campos + `UF_CODES`, **idênticos** ao formulário Presumido — mesmo
   `DeclarantSchema`), `formaTribPer` (`input maxLength=4`, sem validação de alfabeto — Manual não
   transcrito para o Real, PENDENTE §5 do ADR), alíquota CSLL (`select` 9%/15%, idêntico ao
   Presumido). `indRecReceita` hardcoded `'2'` no payload (não exposto), mesma escolha do Presumido.
   **Direto — reuso confirmado por import de schema no servidor.**
9. `formaTrib`: **Fork F-COMP2-2** decide se aparece como campo editável (default `'1'`
   pré-preenchido) ou fica oculto/fixo (servidor sempre supre `'1'` na ausência).
10. Signatários: reusa **literalmente** `EcfSignersEditor` + `validateEcfSigners` do formulário
    Presumido — mesmo `SignerSchema`+`refineEcfSigners` no servidor (verificado por import em
    `SpedEcfRealDto.ts`). **Direto quanto a REUSAR** (nunca duplicar a validação); a Fork F-COMP2-1
    decide só se precisa exportar os dois de `SpedGenerationPanel.tsx` (arquivo novo) ou não (mesmo
    arquivo).
11. Botão "Gerar e baixar ECF (Real)" chama `generateAndDownloadEcfReal`; erros 400 (Zod ou
    `ValidationError`) e 403 passam por `resolveError`. **Direto.**
12. A tela **não** reproduz um badge de "pronto"/cobertura antes de gerar — o Real, ao contrário do
    Presumido, **não tem** gate de exaustividade de receita (confirmado no comentário de
    `spedController.ts:60-67`: "There is no revenue exhaustiveness gate"). **Direto — evita inventar
    um gate que o servidor não tem.**

**C. Tela — "Catálogo Referencial Oficial (RFB)"**

13. Nova seção na `CompliancePanel.tsx`. **Fork F-COMP2-5** decide se o campo `layoutVersion` do
    import é independente ou pré-preenchido/sincronizado com o campo "Versão" já digitado na seção
    de Mapeamento acima (D7 do ADR-INCR9B: `mappingVersion == layoutVersion` é o default **a
    confirmar**, não garantido).
14. Campo `layoutVersion` (texto) + input de arquivo oculto (`accept=".csv,.xlsx"`), técnica clone
    de `ReconciliationPanel.tsx:362-400` (input hidden + botão + `e.target.value=''` para
    reselecionar). **Direto.**
15. Visibilidade da seção: **Fork F-COMP2-3** decide entre escondê-la para quem não é `ADMIN`
    (`useAuth().user?.role === 'ADMIN'`, precedente único `Navbar.tsx:204`) ou mostrá-la sempre e
    deixar o 403 aparecer via `resolveError`.
16. Sucesso (201): `notify` com o resumo (`imported`/`analyticCount`/`syntheticCount`) formatado.
    **Nenhum** refetch automático da cobertura/mapeamentos — o import **não** altera
    retroativamente `ReferentialMapping` já salvos (só valida a PRÓXIMA gravação — verificado em
    `ReferentialMappingService.resolveDestinationLabel`). **Direto — evita prometer um refresh que
    não existe.**
17. Erros tratados via `resolveError`, texto pt-BR do servidor tal como está: cabeçalho inválido
    (colunas faltantes), linha inválida (até 5 + contagem), catálogo vazio, 403 (role≠ADMIN ou
    policy). **Direto.**
18. Nota textual (ou tooltip) no formulário explicando que o arquivo esperado tem colunas
    **nomeadas** `code,name,isAnalytic,parentCode` — **não** é o XLSX oficial cru da RFB; linka o
    `RUNBOOK-X2-RFB-REFERENCIAL.md` como referência de conversão. **Direto — evita o operador subir
    o arquivo errado sem explicação.**
19. **Nota de risco silencioso, obrigatória no rodapé da seção** (texto, não código): "A partir do
    1º import de uma versão, toda gravação de mapeamento nessa versão passa a validar o código
    contra este catálogo — um código fora do catálogo ou sintético será rejeitado onde antes era
    aceito livremente." Documenta um comportamento do backend **já mergeado** (D3/D9), não desta
    mudança — mas fica invisível ao operador sem essa frase. **Direto — achado OPS-004.**

**D. i18n, gates e testes**

20. Chaves novas em `accounting.json`: `sped.ecfReal.*` (mirror de `sped.ecf.*`) e
    `compliance.catalog.*` (mirror de `compliance.mapping.*`/`compliance.copy.*`), pt/en na MESMA
    mudança; paridade 847 → N = N. Erros de signatário **reusam** `sped.error.ecfSignerCount|
    ecfContador|ecfContadorCrc|signersIncomplete` — **zero** chave nova ali (mesma função
    `validateEcfSigners`). **Direto — gate.**
21. `neutral-*` só, `rounded-2xl`, zero `any`; `tsc --noEmit` limpo em `my-app`. Zero mudança em
    `server/` ⇒ sem regeneração de `openapi.json`/`__dto-shapes__.json`. **Direto — gate.**
22. Tela de `/accounting` atrás de `withAuth` ⇒ verificação contra **build de produção**. **Direto —
    gate.**
23. Testes vitest (mínimo):
    - `SpedGenerationPanel.test.tsx`: mock de `generateAndDownloadEcfReal`; `formaTribPer` com
      comprimento ≠ 4 bloqueia no cliente (espelha `.length(4)` do Zod); banner de esqueleto sempre
      presente; payload chamado sem `formaApur`; reuso de `validateEcfSigners` cobre a validação de
      signatários (fiação, não regra nova).
    - `CompliancePanel.test.tsx`: mock de `importCatalog`; sucesso mostra `notify` com as
      contagens; erro 400/403 mostra a mensagem do servidor; seção visível/oculta conforme a Fork
      F-COMP2-3 ratificada.
24. **Verificação negativa registrada:** nenhuma classe `date-only-utc-shift` se aplica a este
    incremento — as únicas datas da aba Compliance (`dtExSocial` do ECD) já existem e não são
    tocadas por este BRIEF. Campo verificado e ausente, não ignorado (regra 4 do formulário). **Direto.**

## Forks — RATIFICAÇÃO PENDENTE (decisão do dono)

| Fork | Caminhos | Recomendação + justificativa | Custo de errar |
|---|---|---|---|
| **F-COMP2-1 — arquivo do formulário ECF Real** | (a) 3ª seção dentro de `SpedGenerationPanel.tsx` (reusa `Field`/`inputClass`/`UF_CODES`/`EcfSignersEditor`/`validateEcfSigners` sem exportar nada — tudo já no mesmo módulo) · (b) componente novo `SpedEcfRealPanel.tsx`, exportando os 5 helpers acima de `SpedGenerationPanel.tsx` (ou extraindo para um módulo compartilhado) | **(b).** Os Forks 2/3/4 do ADR (blocos L/M/N) vão **reabrir** esta seção assim que o Manual for transcrito — isolar em arquivo próprio mantém o `SpedGenerationPanel.tsx` do Presumido (já testado, já review independente) intocado durante esse churn futuro, mesmo custando 5 exports/uma extração agora. (a) é menos código hoje, mas amarra o próximo incremento (Fase 3 completa) ao mesmo arquivo do Presumido | (a): baixo agora, alto quando Forks 2/3/4 chegarem (arquivo cresce e mistura regimes); (b): ~15 linhas de export a mais, zero risco de regressão cruzada |
| **F-COMP2-2 — expor `formaTrib`** | (a) campo oculto — servidor sempre supre `'1'` · (b) campo editável, pré-preenchido `'1'`, mesmo padrão do `select` de alíquota CSLL do Presumido | **(b).** O próprio ADR frisa que "o caller ainda pode informar outro dígito; o servidor só supre a ausência" — esconder o campo tira do operador uma opção que o contrato deliberadamente mantém aberta, e o padrão visual (select/`input` com default) já existe no mesmo arquivo | (a): baixo, mas fecha uma porta que o backend deixou aberta; (b): 1 campo a mais, zero risco (Zod valida `\d` de qualquer forma) |
| **F-COMP2-3 — visibilidade do import de catálogo p/ não-ADMIN** | (a) esconder a seção quando `user?.role !== 'ADMIN'` (precedente `Navbar.tsx`) · (b) mostrar sempre, deixar o 403 falar via `resolveError` | **(a).** O backend bloqueia com 403 **antes** de qualquer outra checagem — mostrar o controle a quem nunca vai poder usá-lo é convite a clique-erro repetido; o precedente de role-gate já existe no app (`Navbar.tsx`), não é padrão novo | (a): usuário não-admin não descobre a existência da feature por essa tela (mitigável com texto "peça a um admin"); (b): fricção de erro garantido a cada tentativa |
| **F-COMP2-4 — forma do aviso de esqueleto (item 7)** | (a) banner permanente, sempre visível na seção · (b) modal/checkbox de confirmação "estou ciente" antes do 1º clique em gerar, uma vez por sessão | **(a).** É mais barato, nunca pode ser "dispensado sem ler" (checkbox de confirmação vira reflexo, não leitura), e o conteúdo do aviso é idêntico nos dois casos — só a fricção muda | (a): risco baixo de o operador ignorar (mesmo texto sempre visível); (b): fricção extra sem ganho de compreensão comprovado |
| **F-COMP2-5 — vínculo `layoutVersion` (import) × `mappingVersion` (Mapeamento)** | (a) campo independente, o operador digita os dois separadamente · (b) pré-preenche `layoutVersion` do import com o valor já digitado em "Versão" da seção de Mapeamento (editável, não travado) | **(b).** O D7 do ADR-INCR9B recomenda os dois iguais como default a confirmar; pré-preencher reduz o erro de digitar versões diferentes por acidente **sem travar** a exceção legítima (9B-3: ECD e ECF podem exigir referenciais distintos) | (a): risco de o operador importar num `layoutVersion` e mapear noutro sem perceber; (b): nenhum — é só um valor inicial editável |
| **F-COMP2-6 — onde entra o `formaTribPer`** | (a) `input type="text" maxLength=4`, sem máscara/validação de alfabeto (Manual do Real não transcrito) · (b) bloquear a geração até o Manual chegar (não expor o botão) | **(a).** O esqueleto já está autorizado e mergeado (Forks 1/5); recusar expor o campo contradiz a própria decisão do dono de fazer o esqueleto rodar antes do conteúdo completo. O 400 do servidor (se o valor for semanticamente errado) é o oráculo, não uma regra inventada aqui | (a): operador pode digitar um `formaTribPer` sem sentido fiscal e só descobrir no PVA (mesmo risco que o ADR já assume no esqueleto); (b): trava uma tela já autorizada sem base documental para a trava |
| **F-COMP2-7 — helpers multipart do catálogo** | (a) duplicar `authHeaders`/`baseUrl`/`parseError`/`streamDownload` dentro de `referential.service.ts` (3ª cópia da técnica, depois de `accounting.service.ts` e `crm.service.ts`) · (b) extrair para `lib/services/multipart.ts` compartilhado, consumido pelos 3 sites | **(b).** Mesma classe "técnica re-inlinada" que o BRIEF irmão `FE-INCR-NFE` já registrou como fork F-FENFE-7 (também `RATIFICAÇÃO PENDENTE`) — recomenda-se ratificar os dois **juntos** e na mesma direção, para não deixar 2 de 3 sites extraídos e 1 duplicado | (a): baixo custo agora, é o 3º clone que o revisor pega; (b): ~30 linhas de extração, zero duplicação — mas dessincroniza se F-FENFE-7 for ratificado na direção oposta |

## Pendente de validação externa

- **Manual do Leiaute 12, seções L/M/N do Real** (mesma pendência do ADR — Forks 2/3/4): esta tela
  não depende disso para existir (o esqueleto já está autorizado), mas os blocos continuam vazios
  até o Manual ser transcrito.
- **Alfabeto/semântica exata de `formaTribPer`** (4 posições, uma por trimestre): não verificado; a
  tela aceita qualquer 4 caracteres e deixa o servidor/PVA serem o oráculo (Fork F-COMP2-6).
- **Formato exato do arquivo oficial RFB** (9B-1/9B-4/9B-5 do ADR-INCR9B): a tela só aceita o formato
  JÁ CONVERTIDO (`code,name,isAnalytic,parentCode`); a conversão do arquivo oficial é o
  `RUNBOOK-X2-RFB-REFERENCIAL.md`, gate humano fora desta sessão.

## Insumos ausentes

- Nenhum que bloqueie o BRIEF.

## Achados fora de escopo (registrados, não planejados — ORCH-006)

1. **`GET /referential/catalog` (lookup/picker)** também tem 0 consumidor FE, mas **não foi nomeado**
   na autorização (só o `import` foi — cédula §E linha X3 e master map linha 498 citam
   especificamente `referential/catalog/import`). Transformar o campo "Código RFB" da seção de
   Mapeamento num autocomplete contra o catálogo é o follow-up natural, mas exige BRIEF/autorização
   própria — dimensionar aqui violaria a regra 5 do formulário de planejamento.
2. **`RUNBOOK-X2-RFB-REFERENCIAL.md` precisa de emenda de texto** quando esta tela for implementada:
   os Passos 1/2 hoje descrevem só `node server/scripts/rfb-referential-to-catalog.mjs` + `curl`/API
   pura; o runbook já antecipa (frase de 2026-08-17) "na UI isso corresponde ao upload... na aba
   Compliance" mas não tem o caminho de clique documentado como passo alternativo. Emenda de texto,
   **não** preenchimento de evidência/desfecho — mas ainda assim fora do escopo desta
   `sessao-planejamento` (regra 1: não edita spec/artefato de outro item; o runbook é gate humano,
   sem sessão de agente própria per CLAUDE.md). Registrado para o dono ou `luminaris-gate-copilot`
   decidir quando encaminhar.
3. **`crm.service.ts:197`** é o 3º site com a técnica multipart duplicada (ver F-COMP2-7) — fora
   deste item, mas reforça o caso de extração.
4. **F-COMP2-7 × F-FENFE-7** (BRIEF irmão `FE-INCR-NFE`) decidem a MESMA pergunta de arquitetura
   independentemente; se ratificados em direções diferentes, o código diverge entre os dois
   incrementos. Sinalizado para o dono considerar ratificar os dois juntos.

## Plano de paralelização (PAR-001..006) — lote com `FE-INCR-AUDIT-PROVENANCE` (C4/C5)

A rodada 4 do plano SDD roda este BRIEF em lote com `FE-INCR-AUDIT-PROVENANCE` (nó C4:
*"botão 'verificar cadeia' (`verify-chain`) + lista de documentos de origem no
`JournalEntriesPanel`"* — `CEDULA-DECISAO-2026-09-03-modulos.md:161`). Como aquele BRIEF ainda não
foi escrito nesta sessão (planejado em paralelo por outra sessão), seu write-set abaixo é
**inferido** da descrição do nó C4, não lido — grau **ASSUMIDO** até o BRIEF irmão existir; o resto
desta seção (o write-set DESTE BRIEF e a disjunção fora do choke point) é **verificado**.

**Write-set previsto — FE-INCR-COMPLIANCE-2 (este BRIEF):**
- `my-app/lib/services/sped.service.ts` (edita — novo export)
- `my-app/lib/services/referential.service.ts` (edita — novo export)
- `my-app/features/accounting/components/SpedGenerationPanel.tsx` **ou** `SpedEcfRealPanel.tsx` novo (Fork F-COMP2-1)
- `my-app/features/accounting/components/CompliancePanel.tsx` (edita)
- `my-app/features/accounting/components/__tests__/SpedGenerationPanel.test.tsx` (edita)
- `my-app/features/accounting/components/__tests__/CompliancePanel.test.tsx` (edita)
- `my-app/public/locales/{pt,en}/accounting.json` (edita — **choke point PAR-001**)

**Write-set inferido — FE-INCR-AUDIT-PROVENANCE (C4, ASSUMIDO):**
- `my-app/features/accounting/components/JournalEntriesPanel.tsx` (edita)
- `my-app/features/accounting/components/__tests__/JournalEntriesPanel.test.tsx` (edita)
- um service novo/estendido para `audit/verify-chain` + `journal-entries/:id/source-documents`
  (não identificado — provavelmente `accounting.service.ts` ou um `audit.service.ts` novo)
- `my-app/public/locales/{pt,en}/accounting.json` (edita — **mesmo choke point**)

**Prova de disjunção (verificado — grep sobre `origin/main` `d162cd4d`, não só grafo — CBM-001):**
zero cross-referência nos dois sentidos entre `JournalEntriesPanel.tsx` e
{`SpedGenerationPanel.tsx`, `CompliancePanel.tsx`, `sped.service.ts`, `referential.service.ts`} —
nenhum importa o outro, nenhum cita `verify-chain`/`source-documents`/`Sped`/`Compliance`/`referential`
cruzado. Fora do `accounting.json`, os dois write-sets **não se cruzam**.

**`accounting.json` é choke point PAR-001 — mesmo domínio (`accounting`), NÃO disjunto.** Por
PAR-001 ("i18n por domínio — disjunto entre domínios, **compartilhado dentro do mesmo domínio**") e
pelo caso-exemplo do próprio contrato ("dois KPIs no mesmo dashboard de `accounting` → ambos tocam
`accounting.json` → **serial**"), as chaves i18n dos dois BRIEFs **não** podem ser escritas em
paralelo no mesmo arquivo sem risco de conflito/overwrite silencioso de merge.

**Fatiamento proposto (PAR-003):**
1. **Fase 0 (schema) — não se aplica.** Nenhum dos dois BRIEFs muda `schema.prisma` (zero
   migração, os dois endpoints já existem em `main`).
2. **Fase A (corpos, paralela) — os dois BRIEFs constroem em worktrees separados TUDO exceto as
   chaves de `accounting.json`:** componentes, services, testes, e a **prosa i18n** (o texto
   pt/en de cada chave nova) fica pronta e **staged** (ex.: um bloco JSON candidato no PR/branch),
   mas a **escrita física** no arquivo compartilhado é adiada para a Fase B. Cada branch roda
   `tsc`/testes localmente contra o `accounting.json` **atual** (sem as chaves do outro lote) —
   aceitável porque nenhum teste deste BRIEF depende de chave do C4 nem vice-versa (write-sets de
   código são disjuntos, só o arquivo de chaves é compartilhado).
3. **Fase B (registro, serial, integrador único):** aplica as duas deltas de `accounting.json` **uma
   de cada vez**, `tsc` verde entre cada (mede paridade 847→N a cada aplicação, não só no final) —
   evita que o merge dos dois PRs colida na mesma chave-pai ou produza uma paridade pt/en quebrada
   por interleaving.
4. **Review por branch, antes do merge** (independência já exigida por norma da casa) — cada BRIEF
   revisado isoladamente; a Fase B só roda depois que AMBOS os PASS existirem.

**Confirmação pendente:** o passo 2 acima assume que o BRIEF `FE-INCR-AUDIT-PROVENANCE` não toca
`AccountingView.tsx` (nenhuma aba nova — os dois botões do C4 vivem dentro do `JournalEntriesPanel`
já existente, conforme a descrição do nó). Este BRIEF também não toca `AccountingView.tsx` (a aba
Compliance já renderiza os dois componentes estendidos). Se o BRIEF irmão, quando escrito, divergir
disso, a lista de choke points cresce em 1 arquivo — reconferir antes de abrir os dois worktrees.

## Risco principal e vieses (T8)

- **Risco principal:** o achado do checklist item 19 — a partir do 1º import do catálogo, a seção
  de Mapeamento **já existente** (não tocada por este BRIEF) começa a **rejeitar** códigos que antes
  passavam livremente, e ninguém além desta nota textual avisa o operador disso. É um comportamento
  do backend já em `main` (D3/D9), não um bug deste incremento — mas ficar mudo sobre ele na tela
  seria o padrão exato de risco silencioso que o OPS-004 pede para nomear primeiro. Mitigação: item
  19 do checklist (nota obrigatória no rodapé da seção nova).
- **Viés desta sessão:** as recomendações favorecem **reuso máximo** (declarant/signers/
  `EcfSignersEditor`/`validateEcfSigners` sem duplicar) — isso é barato hoje, mas empurra a Fork
  F-COMP2-1 para "vale a pena isolar em arquivo próprio" justamente **porque** o reuso de hoje vira
  acoplamento quando os Forks 2/3/4 do ADR chegarem. Quem pesar "menos arquivos agora" acima de
  "menor blast radius no próximo incremento" escolhe F-COMP2-1→(a).
- **Viés de escopo:** a recomendação de F-COMP2-7 (extrair helper multipart compartilhado) empurra
  para fora deste incremento uma decisão que também pertence ao BRIEF irmão `FE-INCR-NFE`
  (F-FENFE-7) — resolvido nomeando a dependência (Achado 4), não decidindo por conta própria qual
  BRIEF "vence".
