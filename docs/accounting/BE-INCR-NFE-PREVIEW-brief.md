# BRIEF — BE-INCR-NFE-PREVIEW (`POST /api/nfe/preview`: dry-run do parser para a tela montar o `itemMappings`)

> Produzido por **sessão de planejamento**, 2026-09-07, sobre `origin/main` `a940b702`. **Rodada 2a**
> do [PLANO-SDD-SEQUENCIAL-2026-09-07.md](PLANO-SDD-SEQUENCIAL-2026-09-07.md) (emenda 2026-09-07).
> Não contém código de aplicação, não ratifica fork. Todo fork abaixo está **RATIFICAÇÃO PENDENTE**.

## Cabeçalho

- **Item a planejar:** endpoint `POST /api/nfe/preview` — recebe o XML da NF-e (multipart, mesmo
  campo `file` e mesmo multer dos dois endpoints existentes), roda **só** o `parseNfe` puro e devolve o
  resumo da nota (cabeçalho, emitente/destinatário, itens com `indTot`, totais, protocolo) **sem
  escrever nada**. É o contrato que a rodada 2b (`FE-INCR-NFE`, aba "NF-e") consome para montar o
  `itemMappings` obrigatório do `POST /api/nfe/purchase` e para mostrar a nota antes de ancorar a venda.
- **Autorização (ORCH-006):** fork **F-FENFE-1 → (b)** do [FE-INCR-NFE-brief.md](FE-INCR-NFE-brief.md),
  ratificado pelo dono em 2026-09-07 (`AskUserQuestion`): *"Endpoint novo POST /api/nfe/preview (vira
  BE-INCR)"* — contra a recomendação de parse no cliente. Plano, rodada **2a**, gatilho *"planeja o
  NFE-PREVIEW"*. Cobertura: exatamente um endpoint read-only de parse; **não** cobre valoração (D3),
  idempotência ou qualquer escrita (ver forks/achados).
- **Fatos verificados nesta sessão (código, não memória):**
  - `server/src/routes/nfe.ts` monta `/purchase` e `/sale` com `nfeUpload` (multer memória, MIME
    `text/xml|application/xml|text/plain|application/octet-stream`, teto `MAX_IMPORT_SIZE_BYTES` ou
    10 MB, magic-bytes **desligado** por decisão O-3) — `nfeController.ts:27-44`. O registro é em
    **2 toques** (`routes/index.ts:23,72` já existem; um endpoint novo só acrescenta a linha no router).
  - `parseNfe(xml)` (`lib/nfe.ts`) é **puro**: devolve `ParsedNfe` (`:79-86`) com `chaveAcesso`, `ide`
    (`numero, serie, dhEmiDate, tpNF, natOp, mod`), `emit`/`dest` (`cnpj?, cpf?, nome?, ie?`), `itens[]`
    (`nItem, cProd, cEAN, xProd, ncm, cfop, uCom, qCom, vUnComStr, vProdCents, vDescCents, indTot`),
    `totais` (9 campos em **cents `number`**), `protocolo` (`cStat, chNFe, nProt, dhRecbtoDate`). Rejeita
    com `ValidationError` (400 via `handleApiError`) tudo o que o import rejeita: DTD, modelo ≠ 55,
    homologação, `cStat` ∉ {100,150}, chave inválida (BE-INCR-CNPJ-ALFA, PR #280), sem item.
  - **Não há policy dedicada de NF-e** (`IAccountingPolicy.ts:11-69`): o import usa
    `canManagePayable` (`NfeImportService.ts:83`), a venda usa `canReconcile`
    (`NfeSaleReconciliationService.ts:80`).
  - Fábrica: `factory.ts:372-373` (tipos), `:772-781` (construção; o import recebe `payableService`,
    `counterparty` repo e `policies.accounting`; a venda recebe `journalEntry` repo, `postingService`,
    policy), `:931-933` (getters).
  - Guard de path-count: `src/__tests__/openapi-paths.test.ts:46-47` — `BASELINE = 146` com o
    comentário histórico "+2 (BE-INCR-NFE…) 144 → 146"; um path novo exige **147** e a linha de
    histórico. OpenAPI dos paths de NF-e vive em `docs.paths.ts:3069-3115` (não em jsdoc na rota).
  - Snapshot de shape: **export novo em `dtos/` REPROVA até entrar no `__dto-shapes__.json`**
    (`dtoShapeSnapshot.test.ts:14-16`); regeneração com `UPDATE_DTO_SNAPSHOT=1`.
  - Não existe teste de controller para NF-e (`src/controllers/__tests__/` sem `nfe`); o precedente
    de teste HTTP real é `accountingController.integration.test.ts` (supertest).
  - Zero evento de auditoria nos dois serviços de NF-e para leitura; o allowlist do `auditCanonical.ts`
    só acende com **eventType novo** — um endpoint que não escreve não emite nada.
- **Divergência memória/docs × código:** nenhuma.

## Insumos existentes

| Insumo | Caminho | O que fixa |
|---|---|---|
| Multer + controller | `controllers/nfeController.ts:27-44,53-63,70-105` | reuso integral de `nfeUpload`, `uploadedFile`, `handleApiError`, `resolveAccountingScope` |
| Parser puro | `lib/nfe.ts:79-86` (`ParsedNfe`), `:230-330` (`parseNfe`) | o **único** produtor do preview |
| DTO irmão | `dtos/NfeDto.ts` | `.strict()`, `unitId`, padrão `@openapi components` |
| Policy | `policies/IAccountingPolicy.ts:23,32,35` | `canReconcile`, `canManagePayable`, `canReadPayable` (fork F-PREV-2) |
| Fábrica | `lib/factory.ts:372-373,772-781,931-933` | onde o serviço novo entra |
| OpenAPI | `routes/docs.paths.ts:3069-3115`, `__tests__/openapi-paths.test.ts:46-47` | path + baseline |
| Golden ref de serviço parse+policy sem escrita | `services/NfeSaleReconciliationService.ts:64-90` | `policy` no construtor, `parseNfe` primeiro, sem tx |
| Golden ref de teste HTTP | `controllers/__tests__/accountingController.integration.test.ts` | supertest (fork F-PREV-4) |
| Consumidor | `FE-INCR-NFE-brief.md` §Contratos (`NfeSummary`) e §Forks (F-FENFE-1 b, F-FENFE-2 a) | campos que a tela usa: chave, número/série, emissão, emitente (nome+doc), vNF, itens (`nItem, cProd, xProd, cEAN, qCom, uCom, vProd, indTot`) |

## Contratos a materializar (esboço)

```
POST /api/nfe/preview   multipart/form-data   Bearer JWT
  file:   XML (obrigatório; ≤ 10 MB; mesma allowlist MIME do import)
  unitId: string
  200 → { success: true, data: NfePreview }
  400 ValidationError (mesmas mensagens do import: DTD, modelo, homologação, cStat, chave, itens) · 400 Zod · 401 · 403 policy
```

```ts
// dtos/NfeDto.ts — entrada
export const PreviewNfeSchema = z.object({ unitId: z.string().min(1) }).strict();
export type PreviewNfeInput = z.infer<typeof PreviewNfeSchema>;

// dtos/NfeDto.ts — SAÍDA materializada (contrato que a 2b consome; entra no snapshot como export)
const centsInt = z.number().int().nonnegative();
export const NfePreviewSchema = z.object({
  chaveAcesso: z.string().regex(NFE_CHAVE_REGEX),            // lib/cnpj.ts (PR #280)
  ide: z.object({ numero: z.string(), serie: z.string(), dhEmiDate: z.string(), tpNF: z.string(), natOp: z.string(), mod: z.string() }).strict(),
  emit: z.object({ cnpj: z.string().optional(), cpf: z.string().optional(), nome: z.string().optional(), ie: z.string().optional() }).strict(),
  dest: z.object({ cnpj: z.string().optional(), cpf: z.string().optional(), nome: z.string().optional(), ie: z.string().optional() }).strict(),
  itens: z.array(z.object({
    nItem: z.number().int().positive(), cProd: z.string(), cEAN: z.string(), xProd: z.string(), ncm: z.string(), cfop: z.string(),
    uCom: z.string(), qCom: z.string(), vUnComStr: z.string(), vProdCents: centsInt, vDescCents: centsInt, indTot: z.enum(['0', '1']),
  }).strict()).min(1),
  totais: z.object({ vProdCents: centsInt, vDescCents: centsInt, vFreteCents: centsInt, vSegCents: centsInt, vOutroCents: centsInt, vIPICents: centsInt, vSTCents: centsInt, vICMSCents: centsInt, vNFCents: centsInt }).strict(),
  protocolo: z.object({ cStat: z.string(), nProt: z.string(), dhRecbtoDate: z.string() }).strict(),
}).strict();
export type NfePreview = z.infer<typeof NfePreviewSchema>;
```

O `NfePreview` é o `ParsedNfe` **menos** `protocolo.chNFe` (redundante com `chaveAcesso`, já conferido
igual pelo parser) — fork F-PREV-1 decide se é espelho integral ou subconjunto.

## Checklist numerado de comportamentos (cada um testável)

1. **`PreviewNfeSchema`** (`.strict()`, só `unitId`) + teste: campo extra ⇒ falha; `unitId` vazio ⇒
   falha. **Direto.**
2. **`NfePreviewSchema`** (saída, `.strict()` em todo nível) + teste de contrato: o `ParsedNfe` dos
   dois fixtures sintéticos e da variante alfanumérica (`nfe.test.ts`, PR #280) **passa** pelo schema
   após o mapeamento; um objeto com campo a mais falha. Entra no `__dto-shapes__.json`
   (`UPDATE_DTO_SNAPSHOT=1`, diff = só as 2 exportações novas). **Fork F-PREV-1** (espelho integral ×
   subconjunto).
3. **`NfePreviewService.preview(scope, xml)`** — construtor recebe **só** `IAccountingPolicy`; gate de
   policy primeiro; depois `parseNfe(xml)`; devolve `toNfePreview(parsed)`; **nenhum** repositório,
   `runTransaction`, `PostingService` ou logger de auditoria. Teste: o construtor não aceita repo
   (tipo), e um `jest.spyOn` sobre `parseNfe` confirma exatamente 1 chamada. **Fork F-PREV-2** (qual
   policy). **Fork F-PREV-3** (indicador de "já importada").
4. Erros do parser **propagam inalterados** (`ValidationError` → 400 pelo `handleApiError`): teste com
   `cStat` mutado para 110 ⇒ 400 com a mesma mensagem do import; DTD ⇒ 400; chave com `cDV` errado ⇒
   400 (mensagem de PR #280). **Direto.**
5. `403` quando a policy nega (`ForbiddenError`, mensagem própria: "Você não tem permissão para
   pré-visualizar NF-e."). **Direto.**
6. **Controller `previewNfe`** espelha `importNfePurchase`: 401 sem usuário, 400 `File is required
   (field name: file)` sem arquivo, 400 `parsed.error.flatten()` em Zod, `resolveAccountingScope(user,
   unitId)`, `res.json({ success: true, data })` com **200** (não 201 — nada foi criado). **Direto.**
7. **Rota** `router.post('/preview', nfeUpload, previewNfe)` em `routes/nfe.ts`; jsdoc da rota **não**
   ganha tag `@openapi` (a prosa do arquivo avisa que o gerador varreria a string). **Direto.**
8. **Fábrica**: tipo em `:372`, construção `nfePreview: new NfePreviewService(this.policies.accounting)`
   ao lado das duas de NF-e, getter `getNfePreviewService`. **Direto.**
9. **OpenAPI**: bloco `/api/nfe/preview` em `docs.paths.ts` logo após `/api/nfe/sale` (multipart,
   `file` + `unitId`, 200 com `$ref` ao schema `NfePreview` declarado no `@openapi components` do DTO);
   `BASELINE` 146 → **147** com linha de histórico "+1 (BE-INCR-NFE-PREVIEW)"; `npm run docs:generate`
   regenera `openapi.json` (147 paths, 174 operações). **Direto — gate.**
10. **Auditoria**: nenhum `eventType` novo; teste negativo: o serviço não importa `auditCanonical` nem
    `AuditService` (asserção por leitura do módulo, como os testes de fronteira já fazem). **Direto.**
11. **Teste HTTP** do endpoint. **Fork F-PREV-4** (supertest × só unit).
12. **Tamanho/MIME**: nada novo — `nfeUpload` compartilhado; teste só documenta que o middleware é o
    mesmo objeto (`nfeUpload` importado, não um segundo `makeUploadMiddleware`). **Direto — reuso.**
13. `tsc` limpo; suíte `nfe*` + `NfeDto` + snapshot + `openapi-paths` verdes; sem migração ⇒ sem
    smoke-migration-gate. **Direto — gate.**

## Forks — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação + justificativa | Custo de errar |
|---|---|---|---|
| **F-PREV-1 — forma da saída** | (a) espelho integral do `ParsedNfe` (menos `chNFe` redundante), materializado em `NfePreviewSchema` · (b) subconjunto curado só com os campos que a 2b usa hoje (`NfeSummary` do FE-brief: ~14 campos) | **(a).** Uma fonte de verdade e zero mapeamento seletivo; a tela ignora o que não usa; quando o parser ganhar IBS/CBS (2027) o preview já carrega. (b) exige emenda de contrato a cada campo novo na tela. Ressalva registrada: o `dest.cpf` da NF-e de venda (consumidor) viaja na resposta — é o mesmo dado que o operador vê no XML; LGPD fino continua diferido (master map §5 item 14) | baixo |
| **F-PREV-2 — policy** | (a) `canManagePayable(scope) \|\| canReconcile(scope)` (quem pode importar **ou** cruzar pode pré-visualizar) · (b) `canReadPayable` · (c) só autenticação | **(a).** Preview é o passo 1 dos dois fluxos de escrita; a permissão de ver a nota deve ser exatamente a de agir sobre ela, senão um perfil só-leitura consegue "ensaiar" o import. (c) contraria o padrão da casa (toda rota de accounting passa por policy) | (c) abre leitura de dado fiscal a qualquer autenticado |
| **F-PREV-3 — indicador "já importada"** | (a) não — o import já rejeita duplicata loud ("Já existe uma conta a pagar…") · (b) `alreadyImported: boolean` consultando `Payable` por `documentNumber = chaveAcesso` (exige repo no serviço e método novo `findByDocumentNumber`) | **(a).** Mantém o serviço puro (parse + policy) e o incremento **P**; (b) transforma o dry-run num caminho de leitura com repositório e muda o construtor. Registrado em Achados: se o operador mapear 30 itens e só então descobrir a duplicata, o custo é dele — item próprio com evidência de uso | baixo agora; UX pior em nota duplicada |
| **F-PREV-4 — teste HTTP** | (a) 1 suíte supertest com 3 casos (200 com fixture; 400 sem `file`; 400 Zod sem `unitId`) · (b) só unit (serviço + controller com `req` falso) | **(a).** É a única rota de NF-e cuja fronteira multipart a 2b vai consumir às cegas, e não existe teste HTTP para `/purchase` e `/sale` — 3 casos custam pouco e fixam o contrato que o FE precisa. Precedente: `accountingController.integration.test.ts` | (b) deixa o contrato multipart provado só por leitura |

## Pendente de validação externa

- Nenhuma regra fiscal nova: o preview devolve **o que o parser entendeu**; a dívida do XML real
  (F-I2/E9) vale igual para ele.

## Insumos ausentes

- Nenhum.

## Achados fora de escopo (registrados, não planejados)

1. **`alreadyImported`** (F-PREV-3 b) e, na mesma linha, "venda já ancorada" para a NF-e de venda —
   item próprio quando houver uso real.
2. **`/purchase` e `/sale` sem teste HTTP** — se F-PREV-4 → (a), a mesma suíte pode ganhar os dois
   depois (não neste item).
3. **`dest.cpf` na resposta** (LGPD fino, master map §5 item 14) — diferido por decisão anterior.

## Risco principal e vieses (T8)

- **Risco principal:** o preview passa a ser um **segundo caminho** que chama `parseNfe`; qualquer
  regra que um dia entre no `NfeImportService` *antes* do parse (não existe hoje) teria de entrar nos
  dois. Mitigação: o serviço de preview não faz nada além de policy + parse, por construção (comportamento 3).
- **Viés desta sessão:** recomendo o mínimo (F-PREV-3 a) porque o incremento nasceu como pré-requisito
  de tela, não como feature; quem pesar a experiência do operador acima do tamanho do diff escolhe (b).
