# PLANO GRANULAR — Onda 1 de FE (fechamento de contábil/financeiro/fiscal pelo lado da tela)

> Produzido por **sessão de planejamento** em 28/09/2026. Não tem código de aplicação. Cada PR ainda exige um
> "executa" do dono (ORCH-006).
>
> **EMENDA 28/09 (tarde) — o que mudou depois da primeira versão:**
> - **Forks todos decididos**, sob a delegação do dono (*"pode decidir tudo"*, chat 28/09), registrados em
>   `docs/plano/decisoes/D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE.md`. Ficaram na recomendada, **exceto**
>   F-FE-SG-2 → **(d)** (§5.3).
> - **PR-0 absorvido.** A sessão paralela da varredura FE×DTO fez o **FE-FIX-SPED-ECD-SIGNERS**, que contém o PR-0.
>   O diff do PR-0 deste worktree foi descartado (F-A2 → a do `PLANO-PENDENCIAS-FE-DTO-2026-09-28.md`). O F2 está
>   **confirmado** (sonda do schema do servidor: `unrecognized_keys: ["identQualif"]`).
> - **F4 estava errado:** o F-C12-4 **está** implementado, como `signerContactIds` no `spedController`
>   (`expandSignerContacts`, antes do `.strict()`), e não como `signers[].contactId`.
> - **A ordem de execução agora é a sequência mestre** do `PLANO-FE-CONTRACT-TYPES-2026-09-28.md` §4, que intercala
>   estes PRs com o contrato gerado (os FE novos nascem tipados). A tabela do §2 fica como histórico de dependências.

## 0. Cabeçalho

- **Autorização:** o dono escreveu em chat, em 28/09/2026, *"Planeja com granularidade"* sobre a lista de 5 itens
  (LALUR-PR2, SPED-SIGNERS, GET-DATA-EXCHANGE-JOBS + REVIEW, DELIVERY, BANK-SETTLEMENT). Isso cobre **planejar**.
  Não cobre implementar nem ratificar fork.
- **Divergência de escopo (passo 1 da sessão):** a autorização cobre **menos** do que alguns itens pedem, e em
  alguns casos o item já não existe como descrito.
  - `GET-DATA-EXCHANGE-JOBS` **já existe em `main`**: foi criado pelo C8 PR-4 (#368 `89d0c6a5`) e está em
    `server/src/routes/accounting.ts:205`, com `ListDataExchangeJobsQuerySchema` em `DataExchangeDto.ts:176` no
    shape do F-FA15. O nó está desatualizado e **não tem trabalho a planejar**, só fold (§7).
  - Quatro dos cinco itens **já têm BRIEF** (17/09 e 12/09). Por isso este documento **não os reescreve**. Ele faz
    três coisas: (a) fatia cada um em PRs e passos, (b) consolida os forks pendentes num questionário só e
    (c) detalha o que os BRIEFs deixaram de fora de propósito:
    - o item 13 do FE-LALUR, com condição `[cond:3C]` já cumprida;
    - o SPED-SIGNERS, que não tem BRIEF próprio.
- **Base:** `origin/main` = `b385040e`, buscado nesta sessão.

## 1. Fatos verificados nesta sessão (lendo o código, sem executar)

| # | Fato | Evidência |
|---|---|---|
| F1 | A lista de jobs existe, com shape `{unitId, direction?, kind?, status?, year?, page, limit}` e `.strict()` | `DataExchangeDto.ts:170-187`, `accounting.ts:205`, #368 |
| F2 | **Provável regressão em `main`:** o signatário ECD do FE sempre envia `identQualif` (`emptyEcdSigner` inicializa com `''`, e o editor tem input livre em `SpedGenerationPanel.tsx:388`). Desde o C12 (#353), o `SignerSchema` do J930 é `.strict()` e **não aceita** `identQualif` (F-C12-1 → a, `SpedEcdDto.ts:129-151`). Se isso se confirmar, **gerar a ECD pela tela devolve 400 `unrecognized_keys`**. | leitura dos dois arquivos; **não executado** — grau: inferido |
| F3 | Em `SpedGenerationPanel.tsx:389`, `codAssin` (ECD) e `identQualif` (ECF) seguem como input livre. O BE fecha os dois em enum (`SPED_ECD_QUALIF_ASSINANTE_CODES` e `SPED_ECF_QUALIF_ASSINANTE_CODES`, `models/spedQualifAssinante.ts:44/88`). Não há rota que sirva essas tabelas. | grep em `routes/` vazio para `qualif` fora do `docs.paths` |
| F4 | ~~`contactId` **não aparece** nos DTOs de geração~~ **CORRIGIDO (28/09, tarde):** o F-C12-4 está implementado como `signerContactIds: string[]`, consumido por `spedController.expandSignerContacts` **antes** do `.strict()` (por isso não aparece no DTO) | leitura de `spedController.ts:78-155` |
| F5 | O BE do 3C está todo em `main`: `GET/POST/PATCH /lalur/parte-b/movements`, `POST /parte-b/close`, `POST /parte-b/reopen` e `GET /parte-b/balances` (`routes/lalur.ts:40-46`). A resposta do diagnóstico é `LalurParteBBalancesDiagnostic` (`LalurService.ts:75-109`), com `periods[].accounts[]`, `divergences[]` e `warnings[]` (X4-14). | leitura |
| F6 | `LalurPanel.tsx` (465 linhas) não tem nada de movimentos, fechamento ou diagnóstico. O `lalur.service.ts` do FE só cobre entries, parte-b e catalog. | grep |
| F7 | `GET /delivery` (lista) **não existe**. Só existem `build`, `confirm`, `profile`, `:id/retry` e `:id` (`accounting.ts:285-293`). `contacts` CRUD existe (`:281-284`). | leitura |
| F8 | `JournalEntryModal.tsx` existe, e é o candidato de reuso do F-FE-RV-4 (a) | `ls` |

## 2. Sequência de PRs (ordem proposta)

A ordem foi escolhida por dois critérios: primeiro o que destrava gate humano, depois o menor raio de colisão.
Todos os PRs são de FE, exceto os 4 toques de BE marcados com **[BE]**.

| Ordem | PR | Sessão | Tamanho | Depende de | Destrava |
|---|---|---|---|---|---|
| 0 | ~~**PR-0 — signatário ECD sem `identQualif`** (F2)~~ **absorvido pelo FE-FIX-SPED-ECD-SIGNERS** (sessão da varredura) | — | — | — | o FE-FIX destrava o **H1** (a ECD sai pela tela) |
| 1 | **LALUR-PR2** — M410, fechar/reabrir trimestre e diagnóstico | `sessao-feature` | M | — | **H1b** (2P-2/2P-3 pela tela) |
| 2 | **SPED-SIGNERS** — [BE] rota da tabela + combobox | `sessao-feature` (depois dos forks F-FE-SG) | S | PR-0 | geração SPED sem código digitado |
| 3 | **REVIEW** — seção de revisão na Compliance | `sessao-feature` | M | forks F-FE-RV | — |
| 4 | **DELIVERY** — [BE] `GET /delivery` + contatos + pacote + histórico | `sessao-feature` | L | REVIEW (a ordem da seção), forks F-FE-DL | — |
| 5 | **BANK-SETTLEMENT** — 3ª sub-aba da Conciliação | `sessao-feature` | M | forks F-FE-BS | — |

O PR 5 é independente dos PRs 1–4 e pode correr em paralelo, desde que em worktree própria (PAR-001). Os PRs 3 e 4
tocam o mesmo `AccountingView`/Compliance e o mesmo `accounting.json`, então correm **em série**.

**Gates comuns a todo PR (entram no checklist, não ficam a critério do implementador):**

1. `cd my-app && npx tsc --noEmit` limpo. Com toque de BE, também `cd server && npx tsc --noEmit`.
2. Paridade i18n pt/en no mesmo PR (`skill-audit wiring`).
3. Vitest com shim `globalThis.React` no arquivo de teste e sem `waitFor(toHaveBeenCalled)` sobre handler async.
4. `neutral-*`, `rounded-2xl`, `<table>` + `Modal` + `StandardPagination` (canônico contábil, F-FE-2 → a,
   12/09); date-only via `scopeToday`/`formatDate` e nenhum `toISOString()` novo.
5. Com toque de BE: cadeia Route→Controller→Service→Repo, DTO `.strict()` com snapshot de shape,
   `docs.paths.ts` + BASELINE do path-count +1, `npm run openapi` e allowlist do `auditCanonical.ts` se nascer
   eventType.
6. `npm run build` do my-app (tela atrás de `withAuth`) e exercício no browser contra cópia do `dev.db` real, com o
   server no commit exato. **Sign-off de browser = humano (H2)**: a linha do runbook nasce em branco.
7. CI verde + "merge" do dono (D17 da decisão de 28/09; nenhum revisor novo sob o CLAUDE.md §⛔).
8. **Nasce tipado:** o corpo enviado ao servidor usa o tipo gerado `@/types/contracts/**.gen.ts` e a regra do mapper
   (`PLANO-FE-CONTRACT-TYPES-2026-09-28.md` §9). Espelho à mão de body é proibido a partir do contrato PR-1.

---

## 3. PR-0 — signatário ECD (regressão F2) — **SUPERADO (28/09, tarde)**

> Executado neste worktree (instrumentação → correção, vitest 60/319) e depois **descartado com backup**, porque o
> FE-FIX-SPED-ECD-SIGNERS da sessão paralela contém tudo isto e mais (CRC/UF/e-mail/fone do contador, mapper
> `toEcdSignerPayload`, 2 guardas). O roteiro abaixo fica como registro.

Este PR não é feature: é lacuna. Por isso roda em duas sessões, instrumentação e depois correção. Aqui só fica
o roteiro.

1. **Instrumentação:** teste vitest de `SpedGenerationPanel` (ou do service `sped.service.ts`) que assere que o body
   de `generateEcd` **não contém** `identQualif` em `signers[]`. Ele deve falhar em `main` pelo motivo certo, e
   deve rodar vermelho antes da correção.
2. **Correção mínima:** tirar `identQualif` do `EcdSigner` (`sped.service.ts:35`), do `emptyEcdSigner` e do input da
   linha 388. Descrição e código ficam só em `codAssin` até o PR 2.
3. **Checagem de que F2 é real (feita antes do passo 1):** POST `/api/accounting/sped/ecd` com um signer contendo
   `identQualif: ''` num server local. Se voltar 200, F2 é falso e o PR-0 morre, com o registro do motivo.

## 4. LALUR-PR2 — detalhe do item 13 do FE-INCR-LALUR (a condição `[cond:3C]` foi cumprida: #316)

**Contrato (fato consumado, F5):** `CreateLalurParteBMovementSchema`, `UpdateLalurParteBMovementSchema`,
`ListLalurParteBMovementsQuerySchema`, `LalurParteBPeriodSchema`, `LalurParteBBalancesQuerySchema`
(`LalurDto.ts:337-414`), mais o `LalurParteBBalancesDiagnostic`.

### 4.1 Checklist

1. **[direto]** `lalur.service.ts` ganha 7 funções: `listMovements`, `createMovement`, `updateMovement`,
   `archiveMovement`, `closeParteB`, `reopenParteB` e `getParteBBalances`. Os tipos espelham os DTOs:
   `indicador: 'CR'|'DB'|'PF'|'BC'`, `indLanAnt: 'S'|'N'` e valores do diagnóstico em **string** (BigInt). Teste: a URL
   e o body de cada função.
2. **[direto]** Sub-seção **"Movimentos da Parte B (M410)"** no `LalurPanel`, embaixo da Parte B. Tem tabela
   (trimestre, conta `codCtaB`, indicador, valor `formatCents`, contrapartida, histórico truncado, `indLanAnt`,
   origem user/system e ações) e filtros exercício/trimestre/conta (`parteBId`).
3. **[direto]** Modal de criar movimento:
   - A conta Parte B vem de um select das contas vivas.
   - Indicador `PF`/`BC` **não renderiza** a contrapartida (REGRA_NAO_PREENCHER_CTP, Manual p.269, `LalurDto.ts:312`).
   - Com `CR`/`DB`, a contrapartida é um select filtrado pelo **mesmo tributo** da conta (REGRA_MESMO_TRIBUTO) e
     exclui a própria conta.
   - `historico` tem 1–500 caracteres e bloqueia `|` antes do submit.
   - Teste: matriz indicador × presença da chave `contrapartidaId` no body.
4. **[direto]** Editar: só `valorCents/indicador/contrapartidaId/historico/indLanAnt/processos`. Ano, trimestre e
   conta ficam read-only, com a nota "arquive e recrie". Movimento `origem='system'` (PF/BC derivado) **não abre**
   edição de valor/indicador, só arquivar (descrição do `UpdateLalurParteBMovementInput`).
5. **[fork F-FE-L2-1]** Processos M415 (`processos[]`): editor no modal ou fora desta tela.
6. **[direto]** Faixa **"Fechamento do trimestre"**: 4 chips T01..T04 com o estado fechado/aberto e `closedAt`, lidos
   do `periods[]` do diagnóstico.
   - "Fechar Tn" só fica habilitado se Tn-1 estiver fechado (ou se Tn = T01). "Reabrir Tn" só fica habilitado se
     nenhum Tk>n estiver fechado. É a ordem limpa do `LalurParteBPeriodSchema`.
   - O BE também recusa. A tela **não é a autoridade**: mostra o 400 íntegro se o estado local estiver velho.
   - Os dois botões pedem confirmação e explicam o efeito: "fechar materializa o M500 e deriva PF/BC; reabrir
     apaga a materialização".
7. **[direto]** Tabela **"Diagnóstico de saldos"** por trimestre e conta: `sdIni/vlA/vlB/sdFim`, materializado ×
   recomputado, linha em vermelho quando `divergent`, e a lista `divergences[]` no topo.
8. **[direto]** Bloco **"Avisos"** com `warnings[]` (`M312_MISSING_FOR_PARTIAL_ADJUSTMENT`). É aviso, **nunca** erro
   (X4-14: "a igualdade exata só o PVA fecha"), e tem link para filtrar o ajuste (`entryId`) na Parte A.
9. **[direto]** Recarregar o diagnóstico depois de create, update, archive, close e reopen.
10. **[direto]** 403 (`canManageLalur`) esconde criar, editar, arquivar, fechar e reabrir, e mantém a leitura.
11. **[direto]** i18n `lalur.movements.*`, `lalur.closing.*` e `lalur.diagnostic.*` em pt e en.
12. **[direto]** Em `RUNBOOK-H1-PVA.md`, na 2ª passada, os passos 2P-2/2P-3 **ganham a menção** "pode ser feito pela
    tela". É só texto em branco, e o agente não preenche evidência. **Ou** isso fica para o fold, se o dono preferir
    não tocar o runbook neste PR.

### 4.2 Forks deste PR

| Fork | Pergunta | (a) | (b) | Recomendação |
|---|---|---|---|---|
| **F-FE-L2-1** | Editor de processos M415 | Lista inline no modal (add/remove linhas `LalurProcessoSchema`) | Fora: a tela manda `processos` ausente e o M415 vai por API | **(a)**: sem ele, um movimento com processo judicial não sai pela tela e o 2P força curl |
| **F-FE-L2-2** | Onde fica o diagnóstico | Sub-seção sempre visível, abaixo dos movimentos | Modal "Ver diagnóstico" | **(a)**: divergência e aviso têm que ser vistos sem clique extra |

## 5. SPED-SIGNERS — BRIEF (não existia: o C12 §6.3 só registrou como "fora de escopo")

**Item:** combobox de qualificação do signatário (J930 `codAssin`, 0930 `identQualif`) em `SpedGenerationPanel`
(ECD e ECF) e `SpedEcfRealPanel` (que reusa `EcfSignersEditor`).
**Contrato do BE (fato):** as consts `SPED_ECD_QUALIF_ASSINANTE` e `SPED_ECF_QUALIF_ASSINANTE`. As tabelas são
diferentes (F-C12-2 → a), e `'900'` = Contador nas duas.

### 5.1 Checklist

1. **[fork F-FE-SG-1] [BE]** A fonte da tabela para o FE.
2. **[direto]** Componente `QualifAssinanteSelect` com `layout: 'ECD'|'ECF'`. Mostra "código — descrição", tem busca
   por substring e não tem texto livre. Teste: renderiza as opções recebidas e emite só o código.
3. **[direto]** A linha 389 (ECD `codAssin`) e o `EcfSignersEditor` (`identQualif`) trocam o `<input>` pelo select.
   `validateEcdSigners`/`validateEcfSigners` continuam a checar a regra do `'900'` sobre o código.
4. ~~**[direto]** Com `'900'` escolhido, a linha exige CRC, e-mail, fone e UF do CRC~~ **FEITO no FE-FIX-SPED-ECD-SIGNERS**
   (`ecdContadorCrc`). **Delta que o FE-FIX deixa para este PR** (`PLANO-PENDENCIAS-FE-DTO` §B1): a linha ECD vira
   `grid sm:grid-cols-4` com 8 controles; o guarda "J930 no contrato do SignerSchema" preenche pelo placeholder
   `Cód. (900=contador)`, e o combobox tem de manter um seletor equivalente ou atualizar o guarda **no mesmo PR**;
   `toEcdSignerPayload` continua dono do shape.
5. **[F-FE-SG-2 → (d), decidido 28/09 sob delegação]** Select opcional **"Contador do cadastro"** (`GET /contacts`) que
   acrescenta o id em `signerContactIds` no corpo. O servidor expande o contato no signatário J930/0930
   (`spedController.expandSignerContacts`, F-C12-4 implementado). A linha manual continua para quem não cadastrou o
   contador. Tipo do corpo: `SpedEcdRequestInput & { signerContactIds?: string[] }` (regra D9 do plano de
   contrato). Teste: escolher um contato → payload com `signerContactIds: [id]` e sem linha manual duplicada. A ECF
   exige fone no cadastro, e o 400 do servidor ("não tem telefone") é mostrado íntegro.
6. **[direto]** i18n `sped.qualif.*` pt/en. As **descrições** vêm do BE (texto do manual) e **não** são traduzidas.

### 5.2 Contrato esboçado (se F-FE-SG-1 → a)

```ts
// GET /api/accounting/sped/qualif-assinante?unitId=&layout=ECD|ECF
// query: z.object({ unitId: z.string().min(1), layout: z.enum(['ECD','ECF']) })  // query schemas não são .strict() (padrão LalurCatalogQuerySchema)
// 200: { success: true, data: Array<{ code: string /* ^\d{3}$ */; description: string }> }
// policy: a mesma de leitura do SPED; sem eventType (leitura) ⇒ sem toque no auditCanonical
```

### 5.3 Forks

| Fork | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-FE-SG-1** | De onde vem a tabela | Rota nova `GET /sped/qualif-assinante` (1 dono, path-count +1) | Copiar a const para o FE | Embutir no bundle via script de build que lê o server | **(a)**: é o mesmo objeto com dois donos em (b), o que dá drift (critério de reuso); (c) cria acoplamento de build que não existe hoje. Precedente: `GET /lalur/catalog` (F-FE-1 a) |
| **F-FE-SG-2** | Pré-preencher pelo contato | Select opcional "a partir do contato", que copia nome/CPF/CRC/e-mail/fone para a linha (FE puro, via `GET /contacts`) | ~~Esperar o `contactId` no DTO de geração (F-C12-4 a), que **não está em main** (F4)~~ premissa falsa (F4 corrigido) | Nenhum pré-preenchimento | ~~(c) neste PR~~ **DECIDIDO 28/09 sob delegação → (d) nova: enviar `signerContactIds`** (a via do F-C12-4 que já existe no servidor). Uma máscara só, a do BE, sem duplicar o mapeamento no FE (o motivo que descartava a (a)) |

## 6. REVIEW, DELIVERY e BANK-SETTLEMENT — fatiamento (os BRIEFs valem, e aqui só entram os passos)

### 6.1 FE-INCR-REVIEW (BRIEF `FE-INCR-REVIEW-brief.md`, checklist §1)

- **F-FE-RV-1 perdeu o objeto:** a lista já existe (F1). A opção (a) passa a ser "consumir a rota existente", sem
  toque no BE. **Proposta:** registrar como *superado pelo #368* em vez de perguntar. Isso é fold, e o dono confirma
  no questionário.
- Os passos de PR seguem a ordem do §1 do BRIEF: serviço → abrir revisão → detalhe e achados → regerar, sign-off e
  rejeição → permissões e i18n. É um PR só.
- Forks que continuam pendentes: **F-FE-RV-2** (seção × aba), **F-FE-RV-3** (409 íntegro × aviso preventivo) e
  **F-FE-RV-4** (reusar `JournalEntryModal` × formulário próprio).

### 6.2 FE-INCR-DELIVERY (BRIEF `FE-INCR-DELIVERY-brief.md`)

Proposta de fatiamento, que é decisão do dono (fork F-FE-DL-5 abaixo):

1. **PR-D1 [BE]:** `GET /api/accounting/delivery` (lista paginada, `canReadAccountingContact`). Já nasce com
   `items[]`, o que resolve o achado §6.6 do BRIEF. A cadeia completa entra: DTO strict, snapshot, docs.paths e
   BASELINE +1.
2. **PR-D2 [FE]:** as sub-seções contatos, montar pacote, confirmar despacho e histórico/retry.

Forks pendentes: **F-FE-DL-1..4** e o novo abaixo.

| Fork | Pergunta | (a) | (b) | Recomendação |
|---|---|---|---|---|
| **F-FE-DL-5** | Fatiar o BE da lista num PR próprio | PR-D1 (BE) → PR-D2 (FE) | Um PR só, como nos irmãos (LALUR F-FE-1) | **(a)**: o PR-D2 já é L, e juntar o BE deixa o review misturar camadas. Contra-argumento: o dono vetou fatiar o C11 "por menor PR", mas ali o objeto era um só |

**Pré-requisito prático** (achado §6.2 do BRIEF, **fora deste plano**): o `ImportExportPanel` não tem período nem
os 2 kinds novos. Sem isso, o "pacote ampliado" pela tela só leva o núcleo. Precisa de autorização própria
(`FE-INCR-DATA-EXCHANGE-PERIOD`).

### 6.3 FE-INCR-BANK-SETTLEMENT (BRIEF `FE-INCR-BANK-SETTLEMENT-brief.md`)

- É um PR só, na ordem do §1 do BRIEF: serviço → varredura → lista → comandos → permissões e i18n.
- Forks pendentes: **F-FE-BS-1..4**.
- **Insumo ausente** que o BRIEF já registrou: a view não tem `updatedAt`, e é preciso decidir o `retry` de
  `CONFIRMING`. Isso vira o fork **F-FE-BS-5**: (a) o `retry` fica sempre visível e o 400 do BE explica
  (**recomendada**, zero BE) × (b) o BE ganha `updatedAt` na view, 1 campo sem migração, o que exige citação de
  crescimento do F7.
- A autorização do nó diz **"só BRIEF"**: a execução precisa de "executa" explícito.

## 7. Fold do vault — **FEITO no PR-DOCS de 28/09** (7 notas, mais o nó `FE-CONTRACT-TYPES` e a nota de decisão)

- `GET-DATA-EXCHANGE-JOBS` → `done`, com evidência #368 `89d0c6a5` (F1).
- `FE-INCR-SPED-SIGNERS`: o `estado_detalhe` troca de "espera merge do BE" para "BRIEF em
  PLANO-ONDA1-FE-2026-09-28 §5; forks F-FE-SG-1/2 pendentes", com `estado` → `planned`.
- `FE-INCR-LALUR-PR2`: a seção Docs ganha a linha deste §4.
- `FE-INCR-REVIEW`: F-FE-RV-1 fica superado pelo #368.

## 8. Pendências de validação externa

- Nenhuma nova de domínio. As tabelas de qualificação e as regras do M410/M500 já estão transcritas no BE, com
  página citada. **Contas de encargo** do BANK-SETTLEMENT seguem com o contador (#331 item 6, D1).
- Sign-off de browser das 5 telas = **H2 (humano)**. O agente só acrescenta linhas em branco ao runbook.

## 9. Insumos ausentes

- ~~F4~~ **Resolvido:** F-C12-4 implementado como `signerContactIds` (ver §1 F4).
- ~~F2 não foi executado~~ **Resolvido:** sonda do schema do servidor em 28/09 → `unrecognized_keys: ["identQualif"]`.

## 10. Achados fora de escopo (não planejados)

1. `FE-INCR-DATA-EXCHANGE-PERIOD`: período + 2 kinds no `ImportExportPanel`. É pré-requisito prático do pacote
   ampliado (§6.2).
2. `FE-INCR-SETTINGS`: tela de `AccountingScopeSettings`, com contas de encargo e depreciação. O BANK-SETTLEMENT
   e o C8 só apontam o path.
3. `FE-INCR-FIXED-ASSETS`: o BE do C8 está **todo** em `main` (5/5 PRs, nota `C8`), e o nó passou a `planned` no
   fold de 28/09. Continua **sem autorização** para planejar. A fatia NF-e `classId` (`PLANO-PENDENCIAS-FE-DTO`
   §B2) tem forks decididos (F-B2-1/2 → a).
4. A aba Compliance chega a 5 seções depois de REVIEW e DELIVERY. Uma aba "SPED" que absorva geração, revisão e
   entrega seria fork futuro (já registrado no F-FE-DL-2).

## 11. Forks — **DECIDIDOS em 28/09 sob delegação do dono** ("pode decidir tudo")

| Fork | Decisão |
|---|---|
| F-FE-L2-1 · F-FE-L2-2 | a · a |
| F-FE-SG-1 · F-FE-SG-2 | a · **(d) `signerContactIds`** |
| F-FE-RV-1 · RV-2 · RV-3 · RV-4 | superado (#368) · a · a · a |
| F-FE-DL-1 · DL-2 · DL-3 · DL-4 · DL-5 | a · a · a · a · a |
| F-FE-BS-1 · BS-2 · BS-3 · BS-4 · BS-5 | a · a · a · a · a |

Registro: `docs/plano/decisoes/D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE.md`. Falta só o "executa" de cada PR, na
ordem da sequência mestre.
