# BRIEF — PILOTO-DFE (seed de cenário + testes pela pilha real + runbook DFE-MANUAL só com o EXT)

> Produzido em `sessao-planejamento` (2026-11-04). Item 1 da §7 ("Ordem de ataque proposta") de
> `docs/operating-manual/INVENTARIO-TESTES-RUNBOOKS-2026-11-04.md` (PR draft NightMarketz/luminaristest#1065, branch
> `claude/inventario-testes-runbooks`, ainda fora de `main`). **Este documento NÃO escreve código.** Traz o checklist,
> os contratos esboçados e os forks F-PIL-1..9. O **F-PIL-1 foi ratificado pelo questionário do dono de 04/11**
> ([D-2026-11-04-PILOTO-DFE-SEED](../plano/decisoes/D-2026-11-04-PILOTO-DFE-SEED.md)); **F-PIL-2..9 seguem com RATIFICAÇÃO PENDENTE**. A `sessao-feature` só abre com
> "executa" do dono, depois dos forks.
>
> **Emenda de 04/11 (régua de testes, PR #1075).** O dono respondeu no questionário do #1075
> ([D-2026-11-04-APRENDIZADOS-TESTES](../plano/decisoes/D-2026-11-04-APRENDIZADOS-TESTES.md)): Q2 *"1–2 na branch, 3 vira
> b3 (Recomendado)"* e Q3 *"Amarrar + F-PIL-2 (b) (Recomendado)"*. Por isso esta emenda faz três coisas. Fixa a data de
> referência do item 7 e o modo de cópia do item 13, os dois pela régua A8. Registra o **F-PIL-2 → (b)** como ratificado.
> E acrescenta a opção **b3** ao F-PIL-5, que continua pendente. Nada mais mudou.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** o piloto do inventário no runbook `docs/accounting/RUNBOOK-H2-DFE-MANUAL.md`. Ele tem quatro
  partes: (i) um seed de cenário DFE, idempotente e em banco descartável; (ii) testes de integração da emissão manual
  com banco real; (iii) um teste de tela do modal "Emitir NFS-e" e da ficha; (iv) a reescrita do runbook só com os
  passos EXT, mais o achado DFE-1, que segue instrumentação → correção.
- **Autorização (ORCH-006):** clique do dono no cartão "BRIEF do piloto DFE: seed de cenário + testes", proposto pela
  sessão do inventário em 04/11. O escopo do cartão é **só o BRIEF, sem código**: o BRIEF sai num PR draft próprio.
  A direção vem do dono no chat de 04/11, citada no `PESQUISA-TESTES-2026-11-04.md` §7.1 (PR #1064): *"todos esses
  runbooks foram considerados humanos e manuais e estavam travando um monte de tarefas, sendo que na realidade eles eram
  inúteis"*. **Cobre:** este BRIEF. **Não cobre:** código, a emenda do `RUNBOOK-FORMAT`, os seeds dos outros 13
  runbooks, nem o IMO-1 (item 2 da §7, que tem sessão própria).
  **Questionário do dono (chat, 04/11), respostas literais** repassadas pela sessão "Playwright: screenshot, CLI e
  DevTools" (local_7680184c) e pela sessão do DFE-MANUAL, em adendo a esta:
  - banco do seed: *"Descartável (Recomendado)"*, uma cópia do banco-modelo da integração, criada a cada execução e
    jogada fora, sem tocar o dev.db real;
  - escopo: *"Piloto no DFE-MANUAL (Recomendado)"*, com seed do DFE (unidade com CNPJ, cliente com CPF, serviço com NBS,
    perfil fiscal completo), testes do caminho feliz e runbook reescrito só com o portal;
  - fluxo: *"BRIEF primeiro (Recomendado)"*: o BRIEF diz o formato do seed, onde vive, o comando e os forks; o dono
    ratifica, e o executa roda depois;
  - quem faz: *"Sessão do DFE-MANUAL (Recomendado)"*, por handoff a esta sessão.

  **Limite:** planejar, não codar. Registro: [D-2026-11-04-PILOTO-DFE-SEED](../plano/decisoes/D-2026-11-04-PILOTO-DFE-SEED.md) e campo `autorizacao` da nota
  [FE-INCR-DFE](../plano/nos/FE-INCR-DFE.md). A delegação de 02/11 ([D-2026-11-02-DELEGACAO-DONO](../plano/decisoes/D-2026-11-02-DELEGACAO-DONO.md)) cobre as cédulas que estavam pendentes
  **em 02/11** e não alcança os forks novos deste BRIEF.
- **Insumos lidos nesta sessão (grau: verificado, salvo indicação):**
  - Execução de 04/11 do runbook (`72315294` em `claude/c7-runbooks-irmaos-4759d6`). Desfecho **BLOQUEADO** em P4/P5/P6
    (unidade sem CNPJ, serviço sem cNBS, cliente sem CPF, perfil sem tributos aproximados est./mun. nem CST/cClassTrib)
    e em P7 (Emissor Nacional). O preview respondeu 200 com `ok:false` e 3 pendências, duas delas com **id interno**
    (achado DFE-1). P8 e P9 não foram exercitados; a correção é a do #549, segundo o git log (inferido).
  - `server/src/features/accounting/services/FiscalDocumentEmissionService.ts`. `assemble` (`:738–884`) junta as
    pendências: `:816` serviço sem cNBS (`serviço '${line.serviceRef}'`), `:819` cTribNac fora da LC 116, `:822` serviço
    sem perfil, `:839` cliente sem taxId (`cliente '${customerId}'`), `:879` CNPJ da unidade ("cadastre em 'units'").
    O mesmo texto se repete em `:1117` (NF-e), `:1278` e `:1299` (vencimento de pacote). Fora isso: `preview` em `:264`,
    `tieOut` em `:83`/`:280`, `ficha` em `:604`.
  - `server/src/features/accounting/services/FiscalProfileService.ts:174–201`: a regra de `emissao.completo`
    (`codMun`, `pTotTribFed/Est/MunCent` ou `pTotTribSNCent` conforme o regime, `ibsCbsCst`/`ibsCbsClassTrib` quando
    `ibsCbsInformar`, ramo MEI).
  - `server/src/jobs/seedAccountingFixtureCli.ts`: tenants `seed-presumido`/`seed-real` (`:97`); `ensureUser` (`:236`)
    nunca reescreve senha; `ensureTenantUnit` (`:259`) instala pelo `SystemProvisioningService` e recusa a 2ª
    instalação; o perfil fiscal sai **só com regime** (`:414–417`); a recusa de ambiente (`:129–137`) aceita **qualquer**
    `file:`, inclusive o dev.db real; a escrita exige `--i-have-a-backup` (`:62`); o binding não é semeado (`:461`).
  - `server/src/routes/dfe.ts:36–58`: `preview`, `documents`, `ficha`, `retorno-manual`, `rejeicao-manual`,
    `cancelamento-manual` e `reenviar` existem.
  - Testes existentes: `FiscalDocument.retornoManual.integration.test.ts` usa repositório real e serviço montado à mão,
    com **dublês** de policy, anexo e auditoria, documento criado por `repo.createSent` e sem venda nem preview.
    `FiscalDocumentEmissionService.test.ts:526` assere o texto "taxId ausente ou inválido" com dublês.
    Fixture `server/src/lib/__tests__/fixtures/nfse/nfse-autorizada-web.SYNTHETIC.xml`; helpers `signNfseForTest` e
    `signNfseEventoForTest` em `server/test/helpers/nfeSignature.ts:137/:142`. **Não há teste HTTP de
    `/api/nfe/dfe/preview` nem de `/documents`** (grep por `nfe/dfe` nos `*.integration.test.ts` só acha o
    `danfe.integration.test.ts`).
  - Molde de venda contabilizada pela ponte real: `eficienciaFiscalPr4.integration.test.ts:31–39/:55–64`. A suíte é
    instalada por `POST /api/dashboard/create`, a unidade com `cnpj` entra em `units`, a linha `sales` com
    `status:'Finalized'` e o `saleItems` `type:'Service'` são gravados, e por fim roda `maybeSyncSaleFinalized(...)`.
    A ponte (`SaleSalesAccountingBridge.ts`) é chamada pelo `dynamicTablesController.ts:130/:160`, não pelo serviço.
    Não vi checagem de binding nas primeiras 30 linhas da ponte (inferido).
  - `server/test/helpers/templateDb.ts:26`: banco-modelo = `db push` + parâmetros legais (`LEGAL_PARAMS_SEEDS`), copiado
    por `pushTestSchema()`. `server/src/config/env.ts:16`: o `.env` **sobrescreve** o ambiente fora de teste (memória
    `env-override-defeats-db-flag`).
  - `server/eslint.config.mjs:75–76`: `no-console` vale em `src/**`, menos `src/jobs/*Cli.ts`.
  - Runner de tela `scripts/runbook-tela.mjs` (PR #1064, fora de `main`). As ops são `login … click type fillLabel
    setVal key eval waitText assertAbsent … shot text`. **Não há op de upload de arquivo.** A senha vem de
    `SEED_ACCOUNTING_PASSWORD` do `server/.env`, e o runner sai com 1 no primeiro `[ERRO]`.
  - BRIEFs `BE-INCR-DFE-MANUAL-brief.md` (itens 11–14, §4) e `FE-INCR-DFE-brief.md` (fato consumado: nós `DFE-MANUAL`
    e `FE-INCR-DFE` estão `done`). cNBS de cabeleireiro: `1.2602.10.00` (`BE-INCR-DFE-brief.md:120`, Anexo B
    `LISTA.NBS_v2.0` l.1202).
- **Nós vizinhos:** consome `DFE-MANUAL`, `FE-INCR-DFE` (rotas, ficha, releitura) e o runner do #1064. É consumido pelo
  item 3 da §7 do inventário (seeds dos outros runbooks AUTO, que copiam o molde deste) e pelo gate H2
  (`docs/plano/gates/H2.md`), que deixa de esperar o DFE-MANUAL inteiro e passa a esperar só os passos EXT.

## Definição de pronto

Igual ao formulário: checklist numerado, contratos esboçados e forks **listados**, não decididos.

---

## 1. Checklist de comportamentos

Cada item diz se é **[direto]** (sem fork) ou **[cond:F-PIL-n]**. "Testável" é a asserção que prova o item.

### Fase A — Seed de cenário DFE (sessão de feature)

1. **[cond:F-PIL-2]** **Módulo do cenário**, uma função pura de orquestração, **sem `console`**:
   `seedDfeManualScenario(services, opts) → DfeScenarioReport` (§2.1). Ela escreve pelos **serviços** (DynamicTable,
   `FiscalProfileService.upsert`, `ServiceFiscalProfileService.upsert`, ponte `maybeSyncSaleFinalized`) e **nunca**
   por `prisma.*` no razão, o mesmo invariante do `seedAccountingFixtureCli.ts:5–8`. Fonte: memória
   `sintetico-nao-cobre-formato-de-dado-real` (SQL cru não grava como o ORM).
2. **[direto]** **Tenant**: usuário `cenario-dfe` (senha de `SEED_ACCOUNTING_PASSWORD`, nunca reescrita), suíte
   `beautySalon` instalada pelo `SystemProvisioningService` e unidade `cenario-dfe-matriz`. **Reusa** `ensureUser` e
   `ensureTenantUnit`, extraídos do `seedAccountingFixtureCli.ts` para um módulo comum sem mudar o comportamento.
   Testável: a 2ª execução no mesmo banco devolve `unidade:'existente'` e não instala a suíte de novo.
3. **[direto]** **Unidade emitente**: `units.data.cnpj = opts.cnpj`, padrão `11222333000181`, o fictício de DV válido
   que a fixture SYNTHETIC e os testes já usam. Testável: `isValidCnpj` verdadeiro; o preview não traz a pendência de
   CNPJ.
4. **[direto]** **Cliente** "Cliente Cenário DFE" com `taxId = 12345678909` (CPF de teste de DV válido, o mesmo da
   fixture SYNTHETIC). Idempotência pelo `taxId`.
5. **[direto]** **Serviço** "Corte Cenário DFE" no catálogo, com perfil fiscal de serviço `cTribNac = '060101'` (o que
   os testes usam; grupo 6 da LC 116, `BE-INCR-DFE-brief.md` 5a) e `cNBS = '126021000'` (= `1.2602.10.00`,
   cabeleireiros, `BE-INCR-DFE-brief.md:120`). Idempotência pelo nome do serviço. **São valores de teste:** os códigos
   reais da empresa do dono são do contador (§4).
6. **[cond:F-PIL-8]** **Perfil fiscal completo** pela `FiscalProfileService.upsert`: `codMun = opts.codMun` (padrão
   `3550308`), alíquota de ISS, tributos aproximados conforme o regime (`pTotTribFed/Est/MunCent`, ou `pTotTribSNCent`
   no Simples ME/EPP), `ibsCbsInformar` com `ibsCbsCst = '000'` e `ibsCbsClassTrib = '000001'`. O par é coerente com a
   RN E0959 (prefixo do cClassTrib = CST, `D-2026-10-21-LACUNAS-IBS-CBS-PR1.md` L1) e é o mesmo que a execução de 04/11
   aplicou e desfez. Testável: `emissao.completo === true` e `faltantes === []` na resposta do upsert.
7. **[direto]** **Vendas prontas** (`opts.vendas`, padrão 3): cada uma `Finalized`, com um item `Service` do serviço do
   item 5, cliente do item 4 e **data `opts.refDate`** (padrão literal, por exemplo `2026-03-15`; nunca a data
   corrente, emenda 04/11, régua A8) no fuso do escopo. O teste passa a mesma data, então a competência da DPS e o
   `dCompet` do item 15 não mudam com o mês e não caem na janela UTC das 00:00–03:00. A linha é gravada pela `DynamicTableService` (o motor
   grava `date` como ISO UTC: memória `motor-grava-date-como-iso-utc-scopeday-recua-um-dia`; é o formato real que o
   L-PR2-1 quebrava) e contabilizada pela `maybeSyncSaleFinalized`. Testável: existe lançamento âncora
   `sale.finalized` para cada `saleId`. A falta dele faz o seed falhar com mensagem nomeada, sem silêncio.
8. **[direto]** **Venda pendente** (uma): cliente "Cliente Sem Documento" (sem `taxId`) e serviço "Escova Sem NBS"
   (perfil com `cTribNac` válido e **sem** `cNBS`). É o ramo de pendência do modal (passo 1 do runbook) e o insumo do
   teste de tela do DFE-1.
9. **[direto]** **Autoconferência do seed** (o falsificador do próprio seed): no fim, o seed chama
   `FiscalDocumentEmissionService.preview` na 1ª venda pronta e na venda pendente e grava o resultado no relatório.
   Pronta: `ok:true`, `payloads.length === 1`, `tieOut.matches === true`. Pendente: `ok:false`, com as duas pendências.
   Se a pronta não der `ok:true`, o CLI sai com 1.
10. **[direto]** **Idempotência**: cada entidade é procurada pela chave natural (username, nome da unidade, `taxId`,
    nome do serviço). A venda é procurada por (cliente, serviço, data, total, `Finalized`) **e** pela existência da
    âncora. Rodar duas vezes no mesmo banco não duplica nada: o relatório marca `existente`. Testável: contagem de
    `dynamicTableData` de `sales` e de `journalEntry` antes e depois da 2ª execução é igual.
11. **[direto]** **Relatório impresso** (§2.1): o que criou, o que já existia, os ids, o resultado da autoconferência
    e a lista **`externo`** (o que o seed não põe de pé: certificado/login do Emissor Nacional, CNPJ real do emitente
    com o município do certificado, códigos reais do contador, e-mail do tomador, empresa MEI real). Cada linha diz quem
    põe de pé.
12. **[cond:F-PIL-2 / F-PIL-3]** **CLI** `server/src/jobs/seedScenarioCli.ts` (padrão `*Cli.ts`, isento do
    `no-console`), via `npm run db:seed:scenario -- --scenario dfe-manual [--regime …] [--cnpj …] [--cod-mun …]`.
    `runCli` devolve o código de saída e nunca chama `process.exit`, como o irmão. Ele recusa (código 1, mensagem
    nomeada):
    (a) `NODE_ENV=production`;
    (b) `DATABASE_URL` que não seja `file:`;
    (c) **caminho resolvido do banco fora da pasta de cenários** (F-PIL-3) ou igual ao dev.db real
    (`server/prisma/prisma/dev.db`, memória `dev-db-real-path-is-nested`);
    (d) `--scenario` desconhecido.
    Testável: os quatro casos de recusa num teste de unidade do `runCli`, que é puro como o
    `assertSafeEnvironment`. O de **(c) roda na condição que falha**: um `DATABASE_URL` apontando o dev.db real tem de
    sair 1 (memória `gate-predicate-environment-class`).
13. **[direto, F-PIL-1 ✅] + [cond:F-PIL-3]** **Criação do banco descartável**: a cada execução, um comando copia o
    banco-modelo da integração (`templateDb()`: schema + parâmetros legais, sem os quais o `lc116()` volta vazio) para
    `server/prisma/scenarios/dfe-manual.db`, que já é ignorado pelo `*.db` do `server/.gitignore`. O comando também
    imprime como subir server e app sobre ele. Só depois roda o item 12. **No fim, o banco é jogado fora**: o comando
    `--drop` trunca o arquivo, sem apagar, pelo mesmo motivo de EBUSY do `pushTestSchema`. A forma de apontar o banco
    é o F-PIL-3. **Cópia consistente (emenda 04/11, régua A8):** o modelo é copiado **fechado**, sem conexão aberta
    sobre ele, ou pela API de backup do SQLite. Copiar um arquivo SQLite aberto pode corromper a cópia. Testável: a
    cópia passa em `PRAGMA integrity_check` antes do item 12.

### Fase B — Testes de integração com banco real (sessão de feature; o DFE-1 é instrumentação → correção)

Um arquivo novo, `server/src/features/accounting/__tests__/dfeManualPiloto.integration.test.ts` (nome a confirmar
pela sessão de feature). Ele roda **pela HTTP** (`makeApp` + `authHeader`, rotas reais, policy, auditoria e
repositórios reais) sobre o `test-integration.db`, com o cenário montado pelo **mesmo** `seedDfeManualScenario` do
item 1 (F-PIL-2). Assim o teste prova o seed, e o seed não apodrece. `DFE_PARTNER=manual` e
`DFE_PARTNER_ENV=homologacao` entram no `process.env` do teste e são restaurados no `afterAll`. Rodar local:
`npx jest <caminho> --runInBand` (um arquivo, regra do dono de 03/11).

14. **[direto]** **Preview pronto + tie-out**: `POST /api/nfe/dfe/preview {unitId, saleId, kind:'NFSE'}` → 200,
    `ok:true`, `payloads.length === 1`, `tieOut.vServCents === tieOut.ledgerCents` igual ao total da venda em centavos,
    `matches:true`.
15. **[direto]** **"Confirmar" → ficha tentativa 1** (P8): `POST /api/nfe/dfe/documents` → **200** (não
    `400 VALIDATION_ERROR` em `infDPS.dCompet`). Depois, `GET …/documents/:id/ficha?unitId=` → `status` `SENT` ou
    `PROCESSING`, `currentAttemptNo === 1` e `payload.infDPS.dCompet` casando `^\d{4}-\d{2}-\d{2}$`. É a guarda do
    L-PR2-1 sobre a venda **gravada pelo motor**, não por SQL.
16. **[direto]** **Retorno com releitura IGUAL**: um builder de teste monta o XML da NFS-e autorizada **a partir do
    `payload` da ficha** (§2.2). O `dhProc` é posterior ao `createdAt`, o `emit/CNPJ` é o da unidade e
    `ambGer=2`/`procEmi=2`. O XML é assinado por `signNfseForTest`. Depois, `POST …/:id/retorno-manual` (multipart
    `file`) → 200 com `releitura.status:'IGUAL'`, e o `GET …/documents/:id` seguinte dá `AUTHORIZED` com a mesma
    releitura (assere a **segunda** leitura: memória `comentario-de-teste-afirma-o-que-nao-assere`).
17. **[direto]** **Retorno com releitura DIVERGENTE**: 2ª venda, mesmo builder com `vServ` alterado → 200,
    `releitura.status:'DIVERGENTE'` e a divergência `{campo:'vServ', grupo:'conteudo'}`. O estado do documento segue o
    F-MAN-2 já ratificado (c/2b → b, `BE-INCR-DFE-MANUAL-brief.md` §5): o teste assere o que o código faz hoje e cita a
    linha.
18. **[direto]** **Rejeição e reenvio** (P9): 3ª venda, `POST …/rejeicao-manual {unitId, errors:[{code, message}]}` →
    `REJECTED`. A causa é corrigida (troca de um campo do perfil que entra na DPS, por exemplo a alíquota de ISS) e
    `POST …/reenviar` → **200**, não `emissao_bloqueada … documento vivo (status REJECTED)`. A `ficha` dá
    `currentAttemptNo === 2` com o valor corrigido no `payload`, e a tentativa 1 continua lá, intacta (leitura do banco
    depois do reenvio).
19. **[direto]** **Cancelamento**: o documento `AUTHORIZED` do item 16 recebe `POST …/cancelamento-manual` (multipart:
    `unitId`, `cMotivo`, `xMotivo` de 15 a 255 caracteres, `file` = XML do evento assinado por `signNfseEventoForTest`)
    → `CANCELLED`. A contagem de `journalEntry` do escopo é a mesma antes e depois (o cancelamento não toca o razão,
    item 13 do BRIEF manual).
20. **[direto]** **Uma falta por vez (CNPJ, perfil)**: sobre o cenário completo, remove **um** dado e chama o preview →
    `ok:false` com **exatamente uma** pendência, depois restaura o dado. (a) `units.data.cnpj` vazio → a pendência de
    CNPJ; (b) perfil fiscal com um campo de emissão nulo (`pTotTribMunCent`, por exemplo) → `perfil fiscal da unidade:
    falta 'pTotTribMunCent'`. Os dois passam hoje (no (a), o texto da pendência é o do F-PIL-5).
21. **[cond:F-PIL-5] [instrumentação → correção]** **DFE-1, teste-guarda**: (a) serviço sem `cNBS` → a pendência
    contém o **nome** do serviço ("Corte Cenário DFE") e **não** contém o `serviceRef`; (b) cliente sem `taxId` → a
    pendência contém o **nome** do cliente e **não** contém o `customerId`; (c) CNPJ ausente → a pendência nomeia a
    unidade e onde cadastrar, e **não** cita a tabela `'units'`. Hoje (a), (b) e (c) reprovam pelo motivo certo, o id
    ou a tabela no texto (verificado na execução de 04/11). O teste sai num **PR vermelho de propósito, não mergear**
    (molde #1053), pela `sessao-instrumentacao`.
22. **[cond:F-PIL-5]** **DFE-1, correção mínima** (`sessao-correcao`): `assemble` resolve o nome do serviço (catálogo)
    e o do cliente (que já lê em `:835–837`) e os põe na mensagem. Se o nome estiver vazio, cai para o id. A
    abrangência (só `:816/:839/:879` ou também `:819/:822/:1117/:1278/:1299`) é o F-PIL-5 b. O teste de unidade
    `FiscalDocumentEmissionService.test.ts:526` continua verde (ele casa só "taxId ausente ou inválido").

### Fase C — Teste de tela (sessão de feature, depois do #1064 em `main` e da correção do item 22)

23. **[direto]** **Op de upload no runner**: `scripts/runbook-tela.mjs` ganha `upload {sel, file}` (Puppeteer
    `elementHandle.uploadFile`), com o arquivo relativo ao roteiro. Sem ela, "Registrar retorno" não roda pela tela.
24. **[cond:F-PIL-4]** **Roteiro do ramo de pendência**: `docs/accounting/runbook-roteiros/dfe-manual-pendencia.json`
    (pasta a confirmar). Ele faz login como `cenario-dfe`, abre a venda pendente e clica em "Emitir NFS-e". O
    `waitText` exige o nome "Cliente Sem Documento" e "Escova Sem NBS", e o `assertAbsent` exige que não haja
    "Confirmar". Print, texto e Network vão para `runbook-evidence/PILOTO-DFE-<data>/`.
25. **[cond:F-PIL-4]** **Roteiro do ramo feliz**: abre a 1ª venda pronta e clica em "Emitir NFS-e". O `waitText`
    procura "Documentos a emitir: 1" e o total. Depois clica em "Confirmar", e o `waitText` procura "Ficha para o
    Emissor Nacional — tentativa 1" e as 4 seções. O `upload` do XML-fixture do item 16 (gerado e salvo por um passo do
    teste ou do seed, F-PIL-6) é seguido de "Registrar retorno", e o `waitText` procura a faixa "Releitura: a nota
    autorizada é igual ao que foi enviado". Por fim, `reload` e `waitText` do cartão "Autorizada".
26. **[direto]** **Ambiente do teste de tela**: build de produção (`withAuth`, `CLAUDE.md` raiz) em `127.0.0.1:3100` e
    server em `:4100` **sobre o banco do item 13**, nunca o dev.db. O runner pega a vaga pesada (`heavy-slot.cjs`).
    No fim, derruba server e app pelo PID (lição da execução de 04/11: o `TaskStop` deixou node de pé).

### Fase D — Runbook reescrito (docs; mesma sessão da Fase C ou à parte)

27. **[cond:F-PIL-7]** **Reescrita do `RUNBOOK-H2-DFE-MANUAL.md`**, só com o EXT (§2.3). A seção "Execução 2026-11-04"
    fica como histórico, sem edição. Cada passo removido vira uma linha "coberto por `<teste>:<linha>`". A tabela de
    pré-condições ganha a coluna **"quem põe de pé"** (seed `dfe-manual` / dono / contador / portal), com aplicação
    **local** neste runbook enquanto a emenda geral do `RUNBOOK-FORMAT` não sai (F-PIL-7).
28. **[direto]** **Saída do EXT vira fixture**: o XML autorizado de homologação, a mensagem de rejeição e o XML do
    evento de cancelamento, colhidos pelo dono, entram como fixture versionada em
    `server/src/lib/__tests__/fixtures/nfse/` (sufixo `.HOMOLOGACAO.xml`). Um teste de integração os relê
    (`parseNfseAutorizada` + `retorno-manual`) contra um cenário semeado com o CNPJ e o município reais (F-PIL-9).
    O XML real **não é alterado** (a assinatura quebraria). Esse item só roda quando o EXT tiver acontecido.
29. **[direto]** **Rastreio**: as linhas do inventário (§3 DFE-MANUAL, §4 item 3) e da nota `FE-INCR-DFE` /
    `docs/plano/gates/H2.md` ficam para o **fold do dono** (memória `cerimonia-por-risco-ops006`: o fold vai no PR do
    trabalho, sob OK).

---

## 2. Contratos esboçados

### 2.1 Seed de cenário (TypeScript + Zod, `.strict()`)

```ts
// server/src/jobs/scenarios/dfeManualScenario.ts — sem console; o CLI imprime
export const DfeScenarioOptionsSchema = z.object({
  regime: z.enum(['PRESUMIDO', 'SIMPLES']).default('PRESUMIDO'),        // F-PIL-8
  cnpj: z.string().regex(/^\d{14}$/).default('11222333000181'),           // fictício, DV válido (fixture SYNTHETIC)
  codMun: z.string().regex(/^\d{7}$/).default('3550308'),                 // IBGE de São Paulo
  vendas: z.number().int().min(1).max(10).default(3),
}).strict();

const Estado = z.enum(['criado', 'existente']);
export const DfeScenarioReportSchema = z.object({
  scenario: z.literal('dfe-manual'),
  username: z.literal('cenario-dfe'),
  userId: z.string(),
  unitId: z.string(),
  criados: z.object({
    tenant: Estado, unidade: Estado, cliente: Estado, servico: Estado,
    perfilFiscal: z.object({ completo: z.boolean(), faltantes: z.array(z.string()) }),
    vendas: z.array(z.object({ saleId: z.string(), totalCents: z.string(), anchorEntryId: z.string(), estado: Estado })),
    vendaPendente: z.object({ saleId: z.string(), estado: Estado }),
  }).strict(),
  autoconferencia: z.object({                                             // item 9
    pronta: z.object({ ok: z.boolean(), documentos: z.number().int(), tieOutMatches: z.boolean() }),
    pendente: z.object({ ok: z.boolean(), faltantes: z.array(z.string()) }),
  }).strict(),
  externo: z.array(z.object({                                             // item 11
    oQue: z.string(),
    quemPoeDePe: z.enum(['dono', 'contador', 'portal']),
    passoDoRunbook: z.string(),                                            // 'E1'…'E7' (§2.3)
  }).strict()),
}).strict();

export async function seedDfeManualScenario(services: Services, opts: DfeScenarioOptions): Promise<DfeScenarioReport>;
```

```ts
// server/src/jobs/seedScenarioCli.ts
export const SeedScenarioArgsSchema = z.object({
  scenario: z.enum(['dfe-manual']),                                        // registro: os próximos cenários entram aqui
  regime: DfeScenarioOptionsSchema.shape.regime,
  cnpj: DfeScenarioOptionsSchema.shape.cnpj,
  codMun: DfeScenarioOptionsSchema.shape.codMun,
}).strict();
export function assertScenarioDatabase(env: NodeJS.ProcessEnv, serverDir: string): string; // devolve o caminho; F-PIL-3
export async function runCli(argv?: string[], env?: NodeJS.ProcessEnv): Promise<number>;   // 0 | 1, sem process.exit
```

### 2.2 Builders de teste (só em `server/test/helpers/`)

```ts
// server/test/helpers/nfseFromDps.ts
export function buildNfseAutorizadaFromDps(
  dps: DpsPayload,
  o?: { dhProc?: string; nNFSe?: string; override?: Partial<{ vServ: string }> },
): string;                         // XML não assinado; o teste chama signNfseForTest
export function buildNfseEventoCancelamento(chave: string, o: { cMotivo: 1 | 2 | 9; xMotivo: string; dhEvento?: string }): string;
```
Os caminhos XML saem da transcrição `fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md`. O
molde é a fixture SYNTHETIC; a sessão de feature lê o template inline de `FiscalDocumentLifecycleService.manual.test.ts`
e de `nfseEventosX11.test.ts` antes de escrever outro.

### 2.3 Runbook reescrito — só o EXT

| Passo | O quê | Quem põe de pé | Saída → fixture/registro | Substitui (antigo) |
|---|---|---|---|---|
| Pré | `seed dfe-manual --cnpj <do certificado> --cod-mun <do CNPJ>` num banco descartável; server/app sobre ele | agente (comando) com dado do dono | relatório do seed colado | P1–P6, P8, P9 |
| Pré | acesso ao Emissor Nacional (homologação = produção restrita) com o certificado/login do emitente | **dono** | — | P7 |
| E1 | emitir 1 NFS-e pela ficha no portal, baixar XML + DANFSe, registrar o retorno | dono | XML autorizado → `…HOMOLOGACAO.xml` (item 28) | 2 |
| E2 | PV-1..PV-10, uma linha por pendência, com o print ou o texto do portal | dono | registro no runbook; calibra `portalFormat.ts` | 4 |
| E3 | provocar 1 rejeição no portal e copiar código e mensagem | dono | `{code, message}` → fixture JSON do item 18 | 5 (o 6, reenvio, é AUTO: item 18) |
| E4 | cancelar a nota de E1 no portal e baixar o **XML do evento** (PV-1) | dono | XML do evento → fixture (item 28); sem XML, BLOQUEADO e F-FE-DFE-9 reaberto | 7 |
| E5 | o portal envia a nota ao tomador? (F-MCE-1 a) | dono | print | 8 |
| E6 | download em produção (`DFE_PARTNER_ENV=producao`): só se o dono decidir emitir com valor fiscal | **dono (decisão)** | os dois arquivos | 9 (o anexo em produção-de-teste já é AUTO: `FiscalDocument.retornoManual.integration.test.ts:85`, inferido pelo título) |
| E7 | MEI real (F-XP-4 → b) | dono, quando houver MEI | resposta do retorno manual (`cStat 107`) | 10 |

Os passos 1 (modal) e 3 (divergência proposital) **saem**. O 1 vira os itens 14, 20–22 e 24–25; o 3 vira o item 17 (a
releitura DIVERGENTE não depende do portal, só de um XML com um campo diferente). Estimativa do inventário: cerca de
60 min, uma vez.

---

## 3. Forks — RATIFICAÇÃO PENDENTE

### F-PIL-1 — Onde o seed roda: banco descartável × dev.db real
- **(a)** Só em banco descartável (`server/prisma/scenarios/<cenário>.db`). O CLI recusa o dev.db real.
- **(b)** No dev.db real, com `--i-have-a-backup`, como o `seedAccountingFixtureCli`.
- **(c)** Os dois, com a recusa do (a) desligável por flag.
- Recomendação: (a). A execução de 04/11 alterou e desfez o perfil do dev.db real, e o backup virou rito.
- Status: **✅ RATIFICADO (a), dono, questionário no chat, 04/11:** *"Descartável (Recomendado)"*: uma cópia do
  banco-modelo da integração, criada a cada execução e jogada fora, sem tocar o dev.db real
  ([D-2026-11-04-PILOTO-DFE-SEED](../plano/decisoes/D-2026-11-04-PILOTO-DFE-SEED.md)). Efeitos: o item 13 copia o `templateDb()` a cada execução, e por isso a opção
  (b) do F-PIL-3 (`migrate deploy`) cai. A idempotência do item 10 continua valendo para a reexecução dentro da mesma
  execução, por exemplo depois de uma queda no meio.

### F-PIL-2 — Onde vive o seed
- **(a)** Flag `--scenario dfe` no `seedAccountingFixtureCli.ts`, ao lado do `:414`. O custo: herda o multi-exercício,
  o `--i-have-a-backup` e os dois tenants fixos, e o arquivo já tem 482 linhas.
- **(b)** Módulo `server/src/jobs/scenarios/dfeManualScenario.ts` + CLI genérico `seedScenarioCli.ts` com registro de
  cenários. `ensureUser`/`ensureTenantUnit` são extraídos para um módulo comum, e os **testes de integração chamam o
  mesmo módulo** (item 1).
- **(c)** Só um helper de teste (`server/test/helpers/scenarios/`), sem CLI. Não serve ao teste de tela nem ao EXT.
- **Recomendação: (b).** O `:414` continua só com o regime, porque o multi-exercício é outro cenário. O módulo
  compartilhado faz o teste provar o seed, e os próximos 13 seeds do inventário entram no registro.
- Status: **✅ RATIFICADO (b)**, dono, chat, 04/11, questionário do #1075, Q3: *"Amarrar + F-PIL-2 (b) (Recomendado)"*
  ([D-2026-11-04-APRENDIZADOS-TESTES](../plano/decisoes/D-2026-11-04-APRENDIZADOS-TESTES.md)). Efeito fora deste BRIEF:
  DFE-ADN-EMISSOR, DFE-ADN-EMENDA-ASSINADOR-LOCAL, DFE-EVENTOS e NFCE-EMENDA-4 estendem o cenário `dfe-manual` do registro,
  em vez de fixture própria.

### F-PIL-3 — Como apontar o banco descartável, dado que o `.env` sobrescreve o ambiente (`env.ts:16`)
- **(a)** Guarda por caminho: o CLI lê o `DATABASE_URL` já resolvido e recusa tudo que não esteja em
  `server/prisma/scenarios/`. O operador aponta o `server/.env` **da worktree** para o cenário, como fez a execução de
  04/11, e um script `scripts/seed-scenario.mjs --fresh` cria o banco copiando o `templateDb()` (schema + parâmetros
  legais, sem os quais o `lc116()` volta vazio) e imprime a linha do `.env`.
- ~~**(b)** O mesmo (a), mas o script cria o banco com `prisma migrate deploy` + os SQL de parâmetros legais.~~
  Caiu com o F-PIL-1 ✅ ("cópia do banco-modelo da integração"). Se o I-2 mostrar que o server não sobe sobre o
  modelo, isso volta ao dono como fork novo.
- **(c)** Variável nova que desliga o `override` no `env.ts`. Toca o boot de tudo e pede ADR (memória
  `env-override-defeats-db-flag`).
- **Recomendação: (a)**, com uma pergunta aberta: o server de produção sobe sobre um banco de `db push`? Se o boot
  reclamar, a questão volta ao dono (insumo ausente I-2). O runner de tela segue sob a TELA-LOCK da pasta de notas do
  grupo.
- Status: **RATIFICAÇÃO PENDENTE.**

### F-PIL-4 — O teste de tela entra no CI?
- **(a)** Não. Os roteiros JSON ficam versionados e rodam localmente pelo `runbook-tela.mjs`, sob comando, com a
  evidência em `runbook-evidence/`. A prova automática é a integração (Fase B).
- **(b)** Sim. Seria Playwright Test no CI sobre o seed, aparato novo (`PESQUISA-TESTES` §8.1: a regra ⛔ é ambígua
  para e2e).
- **Recomendação: (a).** A regra de negócio fica provada na Fase B; a tela só prova a ligação. A decisão sobre e2e no
  CI é geral, não deste piloto.
- Status: **RATIFICAÇÃO PENDENTE.**

### F-PIL-5 — DFE-1: forma e abrangência da mensagem
- **a. Forma.** (a1) `serviço 'Corte Cenário DFE': falta cNBS …`, com o id só se o nome vier vazio. (a2) nome + id
  entre parênteses. (a3) estruturar `faltantes` como `{codigo, rotulo}`, o que muda o contrato do preview e a tela.
  **Recomendação: (a1).** O operador precisa do nome, o id não lhe diz nada, e o contrato `string[]` fica como está.
  Para o CNPJ: `CNPJ da unidade '<nome>' ausente ou inválido — cadastre no cadastro da unidade`. O nome exato da tela
  é o insumo I-3.
- **b. Abrangência.** (b1) só `:816`, `:839` e `:879` (o que a tela mostrou). (b2) todas as ocorrências do mesmo
  texto: `:819`, `:822`, `:1117`, `:1278`, `:1299`. **Recomendação: (b2).** É a mesma classe (memória
  `idempotency-class-fix-discipline`: varredura de classe), e o teste-guarda do item 21 ganha um caso por site.
  **(b3), emenda 04/11:** a b2 mais `:897–898` (`… lançamento âncora … para a venda '${saleId}'`) e `:925–926`
  (`documento vivo já existe … (id ${clash.id})`). As duas também levam id interno ao cliente e não estavam na lista
  (verificado por leitura de `FiscalDocumentEmissionService.ts` em `origin/main` 66f2d5d97). Se a b3 for escolhida, o
  item 21 ganha mais dois casos. **Recomendação passa a (b3)**, pelo mesmo motivo da b2: fechar a classe inteira no serviço.
  A varredura das outras classes de serviço fica no `FIX-MENSAGENS-ID-INTERNO` (nó FIX-TESTES).
- **c. Perfil.** A pendência do perfil traz a **chave técnica** (`falta 'pTotTribMunCent'`), não id interno. Ela fica
  fora do DFE-1 e vai para "Achados fora de escopo". **Recomendação:** fora.
- Status: **RATIFICAÇÃO PENDENTE.**

### F-PIL-6 — De onde o roteiro de tela tira o XML para o upload
- **(a)** O seed grava `server/prisma/scenarios/dfe-manual.nfse-<saleId>.xml`, assinado pelo helper de teste
  (importa `server/test/helpers` de `src/jobs`, uma dependência de teste em código de job).
- **(b)** Um script de teste à parte (`npx jest … -t gera-xml`) escreve o arquivo depois do "Confirmar" da tela, a
  partir da ficha.
- **(c)** O roteiro chama `retorno-manual` pela API (`eval` + `fetch`) e confere só o cartão na tela; o upload pela
  tela fica fora.
- **Recomendação: (b).** O XML precisa da DPS da tentativa criada **pela tela** (o `dhProc` tem de ser posterior ao
  `createdAt` do documento), então não dá para gerá-lo antes, como no (a). E (c) deixa de provar o input de arquivo.
- Status: **RATIFICAÇÃO PENDENTE.**

### F-PIL-7 — Emenda do `RUNBOOK-FORMAT` (coluna "quem põe de pé" + régua EXT/OPS/AUTO + esperado do ramo de erro)
- **(a)** Emenda geral **antes** do piloto.
- **(b)** O piloto aplica a coluna **só** neste runbook, e a emenda geral sai depois, com o resultado do piloto
  (item 4 da §7 do inventário).
- **(c)** Sem coluna: a pré-condição só cita o comando do seed.
- **Recomendação: (b).** Mede o formato num caso real antes de mudar a regra de 19 runbooks.
- Status: **RATIFICAÇÃO PENDENTE.**

### F-PIL-8 — Regime(s) do cenário
- **(a)** Só PRESUMIDO (`opSimpNac 1`), o caso que a execução de 04/11 levou até o preview.
- **(b)** PRESUMIDO por padrão e `--regime SIMPLES` (ME/EPP, `pTotTribSNCent`). O 1º cliente é Simples em SP
  (nota `FE-INCR-DFE`, 29/09), então o XML real do EXT virá do Simples, e o teste do item 28 precisa do cenário
  correspondente.
- **(c)** (b) + MEI.
- **Recomendação: (b).** O MEI fica no passo E7, quando houver MEI real. A distinção Simples × IBS/CBS em 2026 é regra
  de domínio: a sessão de feature lê o ramo do `FiscalProfileService.ts:174–201` e não presume nada.
- Status: **RATIFICAÇÃO PENDENTE.**

### F-PIL-9 — Acesso de homologação ao Emissor Nacional (pergunta, sem recomendação)
- **Pergunta ao dono:** quando haverá acesso à **produção restrita** do Emissor Nacional, com qual certificado e de qual
  CNPJ? Os passos E1–E5 e o item 28 esperam por isso. Sub-pergunta: o XML real que vira fixture traz o CNPJ do
  emitente. O tomador será o CPF de teste. Pode ser versionado como está (o CNPJ é dado público de cadastro; alterar o
  XML quebra a assinatura)?
- Status: **RATIFICAÇÃO PENDENTE.**

---

## 4. Pendente de validação externa

- **PV-1..PV-10** do `BE-INCR-DFE-MANUAL-brief.md` §5 e do `FE-INCR-DFE-brief.md` §5: continuam no runbook (passo E2).
  O piloto não decide nada sobre elas.
- **Códigos reais da empresa do dono** (cTribNac, cNBS, CST e cClassTrib, tributos aproximados): são do contador. Os
  valores do seed são **de teste** e não valem como parametrização fiscal (memória `cclasstrib-psc-payouts-27-10`).
- Formato real do XML autorizado de homologação e do XML do evento: só o EXT mostra. Até lá, o builder do item 16 segue
  a transcrição e a fixture SYNTHETIC.

## 5. Insumos ausentes (não varridos — a sessão de feature lê)

- **I-1** Campo livre da tabela `sales` que poderia servir de chave do cenário. O item 10 dispensa esse campo usando
  (cliente, serviço, data, total) + âncora.
- **I-2** Se o server de produção (`node dist/server.js`) sobe sobre um banco de `db push`, sem a tabela de migrações
  (F-PIL-3).
- **I-3** Nome da tela onde se cadastra o CNPJ da unidade, para o texto do F-PIL-5 a.
- **I-4** Se `maybeSyncSaleFinalized` exige binding ativo em algum ramo. Inferido que não; o item 7 falha com mensagem
  nomeada se faltar a âncora.
- **I-5** Ordem de bootstrap do período contábil: o lançamento da venda pede período OPEN no mês. O
  `eficienciaFiscalPr4` cria o período à mão (`:63`), e o `seed-clinic-tenant.mjs:8–12` registra a ordem dura
  (chart → período → …).

## 6. Achados fora de escopo (não planejados)

- A pendência do perfil fiscal cita a chave técnica (`pTotTribMunCent`), não o rótulo da tela (F-PIL-5 c).
- O dev.db real (`seed-presumido`) tem o serviço "Corte H2" com `cTribNac 010701` (informática), incoerente com o
  salão. É dado do dono, registrado na execução de 04/11.
- O `assertSafeEnvironment` do `seedAccountingFixtureCli.ts:129` aceita qualquer `file:`, inclusive o dev.db real. É
  intencional lá (o H1 roda no dev.db), mas não serve de molde para o cenário.
- Os outros 13 seeds do inventário (§7 item 3), o IMO-1 e o LLM falso do wizard.

## 7. Plano por fatias (para as sessões de execução)

| PR | Sessão | Itens | Depende de | Gate |
|---|---|---|---|---|
| PR-1 | `sessao-feature` | 1–13 (seed + CLI) e 14–20 (integração verde) | F-PIL-2/3/8 (F-PIL-1 ✅) | `tsc` (app e `test:types`), `npx jest <cli.test> --selectProjects unit`, o arquivo de integração com `--runInBand`, `check:arch` |
| PR-2 | `sessao-instrumentacao` | 21 (vermelho de propósito, não mergear) | PR-1 em `main`, F-PIL-5 | o teste reprova pelo id/tabela no texto |
| PR-3 | `sessao-correcao` | 22 | PR-2 | o teste do PR-2 fica verde; `FiscalDocumentEmissionService.test.ts` segue verde |
| PR-4 | `sessao-feature` | 23–27, 29 | #1064 e PR-3 em `main`, F-PIL-4/6/7 | o runner sai 0 nos dois roteiros, sobre o banco descartável, em build de produção |
| PR-5 | `sessao-feature` | 28 | EXT feito (F-PIL-9) | releitura do XML real IGUAL |

Se a integração do PR-1 achar bug (por exemplo, o P8 ou o P9 regredirem), a sessão **para**, registra o achado e ele
segue instrumentação → correção. Não se conserta dentro do PR-1.

## 8. Gates de envio [OPS-001]

1. **Objetivo:** tirar do runbook o que a máquina prova e deixar ao dono só o portal. O destino está na §2.3: o que o
   dono ainda faz são E1–E7, e o resto vira teste.
2. **Graus:** marcados em "Insumos lidos" (verificado/inferido) e nos insumos ausentes.
3. **Caso adversarial tentado:** "o seed com CNPJ fictício serve ao EXT?" **Não serve.** O Emissor Nacional exige o
   CNPJ do certificado e o município do CNPJ (RN E0041, passo 10 do runbook). Daí os `--cnpj`/`--cod-mun` e a
   pré-condição do EXT na §2.3. Outro: "o teste de retorno do item 16 cabe com a fixture SYNTHETIC atual?" Também não:
   ela tem `dhProc` de 15/09, e a guarda (iii) recusa nota anterior ao documento. O teste existente contorna isso
   reescrevendo o `createdAt`. Daí o builder a partir da DPS (§2.2).
4. **Checagem que falharia se eu estivesse errado:** a autoconferência do seed (item 9) e a recusa do dev.db real
   provada na condição que falha (item 12 c). Os itens 21 (a)–(c) reprovam hoje pelo motivo registrado na execução de
   04/11.
5. **Duas primeiras linhas:** o BRIEF é do piloto e não ratifica nada por conta própria. O F-PIL-1 (banco
   descartável) foi ratificado pelo questionário do dono. Restam 8 forks pendentes, e o acesso à homologação (F-PIL-9)
   é o bloqueio principal da parte EXT.
