# PLANO — pendências do FE-FIX-SPED-ECD-SIGNERS e itens fora de escopo da varredura FE×DTO (28/09)

> Produzido por **sessão de planejamento** em 28/09/2026. Sem código de aplicação. **Nenhum fork ratificado** — todos
> em RATIFICAÇÃO PENDENTE. Cada item de código exige "executa" próprio (ORCH-006).

## 0. Cabeçalho

- **Autorização (chat, 28/09/2026):** *"Planeje as pendencias e o que esta fora do escopo"* — sobre as pendências e a
  seção "Fora de escopo" do relatório de fechamento do `FE-FIX-SPED-ECD-SIGNERS` e da varredura FE×DTO do mesmo dia.
  Cobre **planejar**; não cobre executar, commitar nem ratificar fork.
- **Divergências de escopo (passo 1):**
  - **H2 é gate humano** — não há sessão de agente; o plano só prepara o texto em branco do runbook (§A3).
  - **Codegen de contrato é aparato novo** — vetado enquanto o Bloco A tiver oráculo externo aberto (CLAUDE.md §⛔,
    4 de 4). Fica registrado (§B8), não planejado.
  - **`FE-INCR-SPED-SIGNERS` já tem BRIEF** (§5 do `PLANO-ONDA1-FE-2026-09-28.md`, não commitado, worktree
    `ecstatic-haibt-11235f`) — regra 1: não reescrevo; listo só o delta que o fix de hoje causou (§B1).
  - **`FE-INCR-FIXED-ASSETS` é maior que o item autorizado** (o item é só o mapeamento `classId` da NF-e) — planejo a
    fatia e deixo o nó inteiro como fork (§B2).
  - Os nós `FE-INCR-SPED-SIGNERS`, `FE-INCR-FIXED-ASSETS` e `H2` têm `autorizacao` **vazio** no vault: este plano não
    os roteia; cada um precisa da linha de autorização antes da sessão de execução.
- **Base:** `origin/main` = `7ce5fdd2`. Branch de trabalho: `claude/fe-dto-asymmetry-scan-fb5c0a` (worktree
  `sig-nfe-xmldsig-verification-5dd1b9`), **não commitada** — 6 arquivos + 2 docs.

## 1. Fatos novos desta sessão

| # | Fato | Evidência | Grau |
|---|---|---|---|
| N1 | O H1 gera a ECD **pela tela** (Contabilidade → Compliance) — o fix de hoje está no caminho crítico do H1 | `RUNBOOK-H1-PVA.md:149-152` | lido |
| N2 | `RUNBOOK-H1-PVA.md` §P6 (J930, `:205-223`) está **velho desde o C12**: diz `identQualif` "obrigatório" e `indCrc` "opcional (o DTO da ECD não exige CRC nem do signatário contador)". O dono coletaria com o contador o dado errado e deixaria de coletar CRC/UF/e-mail/fone | leitura × `SpedEcdDto.ts:135-210` | lido |
| N3 | **Conversão de lead (CRM) é 400 com qualquer "Porte" ou "Papel" digitado:** `LeadConvertModal.tsx:157,187` são `<input type="text">`; `ConvertLeadSchema` exige enum em inglês (`Micro…Enterprise`, `Decision Maker…User`). Só passa com o campo vazio | sonda `ConvertLeadSchema.safeParse`: `size:'Pequena'` → `invalid_value` em `account.size`; `role:'Decisor'` → `invalid_value` em `contact.role`; vazios omitidos → OK | verificado |
| N4 | NF-e com item CFOP 1551/2551: o FE manda `productRef` para **todo** item costeado (`NfePanel.tsx:211`); o BE exige `classId` nesses itens → 400. Não há `classId` em nenhum ponto do FE | `NfeDto.ts:24-47`; grep | lido |
| N5 | `C8` está `done`; o bloqueio de `FE-INCR-FIXED-ASSETS` ("espera merge do BE") está velho. Rota `GET /api/accounting/fixed-asset-classes` existe | `docs/plano/nos/C8.md`, `routes/accounting.ts:340` | lido |
| N6 | `FE-INCR-SPED-SIGNERS` diz "texto de 17/09 ainda diz 'espera merge do BE'" — o BE (C12) está em `main` desde #353 | nota do nó | lido |

## 2. Pendências (A)

### A1 — Commit, PR e merge do `FE-FIX-SPED-ECD-SIGNERS`

Checklist:
1. **[fork F-A1]** Forma dos commits.
2. **[direto]** Conteúdo: `sped.service.ts`, `SpedGenerationPanel.tsx`, teste, locales pt/en, GAP-MAP (linha nova N3),
   `FE-FIX-SPED-ECD-SIGNERS-brief.md`, este plano. Mensagem termina com o `Co-Authored-By` da sessão.
3. **[direto]** Corpo do PR cola as evidências já produzidas: saída vermelha dos 2 guardas (antes), 60/322 verde,
   `tsc`/`test:types`/build, sonda G-4 OK, e a linha "H2 pendente — humano".
4. **[direto]** CI verde antes do merge. Review: o `revisor-independente` **não é despachado** sob a moratória
   (definição do agente) — review = dono + CI.
5. **[direto]** Merge só com "merge" do dono (squash, padrão da casa).
6. **[direto]** Fold pós-merge (`docs/plano/README.md` §Fold): linha de evidência em `FE-INCR-SPED-SIGNERS`
   ("item 4 do SPED-SIGNERS absorvido pelo #<PR>") — não muda `estado`.

### A2 — Worktree paralelo `ecstatic-haibt-11235f` (conflito)

Fato: aquele worktree tem, **não commitados**, o PR-0 (remove `identQualif` de 3 arquivos + 1 teste), a linha do
GAP-MAP N3 da face 1 e o `PLANO-ONDA1-FE-2026-09-28.md`. O PR-0 é subconjunto do A1 e a linha do GAP-MAP colide com a
que o A1 adiciona.

Checklist (executado **por aquela sessão ou pelo dono**, nunca por esta — regra 1 e F-4 só autorizou ler):
1. **[fork F-A2]** Destino do PR-0 e da linha do GAP-MAP de lá.
2. **[direto]** `PLANO-ONDA1` §2 linha 0: PR-0 → "absorvido por FE-FIX-SPED-ECD-SIGNERS"; a coluna "Destrava: H1"
   passa para o A1 (N1).
3. **[direto]** `PLANO-ONDA1` §5.1 item 4 (CRC/e-mail/fone/UF obrigatórios no 900) → "feito no FE-FIX"; o SPED-SIGNERS
   fica com os itens 1–3, 5, 6.
4. **[direto]** `PLANO-ONDA1` §3 passo 3 ("se voltar 200, F2 é falso") → resolvido: sonda de 28/09 deu 400.

### A3 — H2: linha em branco no runbook (gate humano)

Agente prepara; **não** preenche evidência, não marca desfecho, não assina (`RUNBOOK-FORMAT.md`).

1. **[direto]** Seção nova em `RUNBOOK-H2-BROWSER-SIGNOFF.md` "ECD pela tela — signatários J930 (FE-FIX-SPED-ECD-SIGNERS)",
   em branco, depois do merge do A1:
   - pré-condições: server e app no **commit do merge**, build de produção, cópia do `dev.db` real (`server/prisma/prisma/dev.db`);
   - passos: (1) Compliance → Gerar SPED ECD; (2) 2 signatários: contador `900` com CPF 11, CRC `UF-NNNNNN/O-D`, UF do
     CRC, e-mail, fone + não-contador responsável legal; (3) gerar; (4) repetir com contador sem CRC → a tela recusa
     antes do envio;
   - evidência a colar: resposta do `POST /api/accounting/sped/ecd/generate` (status + corpo) e a 1ª linha do `.txt`
     baixado (`|0000|…`); print da mensagem local do passo 4;
   - desfecho em 3 estados + assinatura.
2. **[fork F-A3]** Em qual runbook a linha mora.

### A4 — `RUNBOOK-H1-PVA.md` §P6 J930 velho (N2)

1. **[direto]** Tabela J930 (`:205-223`) reescrita pelo contrato vigente: sem `identQualif`; `codAssin` fechado na Tabela
   de Qualificação do Assinante; com `900`: CPF 11 + `indCrc` (`UF-NNNNNN/O-D`) + `ufCrc` (= UF do CRC) + `email` +
   `fone` obrigatórios; exatamente 1 responsável legal, que nunca é o `900`. Origem: `SpedEcdDto.ts:128-210`
   (REGRA_OBRIGATORIO_CONTADOR, Manual ECD L9 p. 202 citado no DTO).
2. **[direto]** A nota "[CORREÇÃO 2026-09-01]" (`:155-158`) ganha uma emenda datada — não se apaga texto de runbook.
3. **[direto]** Classificação 🏢/📗: CRC/UF do CRC/e-mail/fone do contador = 📗 (do contador).
É texto de preparação do runbook (permitido ao agente), não evidência. Sessão: nenhuma das 5 — edição de doc sob
autorização do dono; recomenda-se no mesmo PR do A1 (F-A1).

## 3. Fora de escopo (B)

### B1 — `FE-INCR-SPED-SIGNERS` (combobox de qualificação) — delta, não BRIEF novo

BRIEF vigente: `PLANO-ONDA1-FE-2026-09-28.md` §5 (itens 1–6, forks F-FE-SG-1/2 pendentes) + `BE-INCR-SPED-IDENTITY-MASKS-brief.md` §6 item 3.
Delta causado pelo A1:
1. Item 4 **feito** (CRC/e-mail/fone/UF do CRC na linha ECD, `ecdContadorCrc`).
2. A linha ECD agora é `grid sm:grid-cols-4` com 8 controles; o combobox troca o `<input>` de `codAssin` (placeholder
   `Cód. (900=contador)`) — o guarda `J930 no contrato do SignerSchema (GAP-MAP N3)` preenche por esse placeholder:
   o SPED-SIGNERS tem de manter um seletor equivalente ou atualizar o guarda **no mesmo PR**.
3. `toEcdSignerPayload` continua dono do shape do payload — o combobox só muda a origem do `codAssin`.
4. O nó precisa de: `autorizacao` preenchida + `estado_detalhe` atualizado (N6). Ordem recomendada: depois do A1.

### B2 — NF-e com item de imobilizado (CFOP 1551/2551) sem `classId` no FE (N4)

Comportamento ausente (nunca existiu no FE) → `sessao-planejamento` → `sessao-feature`, não correção.

Checklist da fatia (se F-B2-1 → a, vira seção do BRIEF do `FE-INCR-FIXED-ASSETS`):
1. **[fork F-B2-2]** Como o FE sabe que o item é de imobilizado.
2. **[direto]** Por item costeado: se imobilizado → `<select>` de classe (`GET /api/accounting/fixed-asset-classes?unitId=`);
   senão → `<select>` de produto (hoje). `allMapped` exige o mapeamento do tipo certo por item.
3. **[direto]** `itemMappings` = `{ cProd, classId }` **XOR** `{ cProd, productRef }` (o BE recusa os dois ou nenhum).
4. **[direto]** Tipo `NfeItemMapping` vira união discriminada.
5. **[direto]** Sem classe cadastrada → estado vazio com link para o cadastro de classes (que é do `FE-INCR-FIXED-ASSETS`).
6. **[direto]** Teste vitest: NF-e com 1 item 1551 + 1 item comum → payload com um `classId` e um `productRef`.
7. **[direto]** Gates: `tsc`, vitest, paridade i18n, build, linha H2 em branco.

Contrato:
```ts
// BE — FATO (NfeDto.ts:30-47): itemMapping = { cProd, productRef? , classId? }.strict()
//   superRefine: exatamente um; classId ⇔ CFOP ∈ {1551, 2551}
// FE — my-app/lib/services/nfe.service.ts
export type NfeItemMapping =
  | { cProd: string; productRef: string }
  | { cProd: string; classId: string };
// Se F-B2-2 → a (BE expõe): NfePreviewSchema.itens[] ganha `isFixedAsset: boolean` (resposta; snapshot de shape do DTO)
```

### B3 — CRM: "Porte" e "Papel" livres × enum do BE (N3) — lacuna nova, 400 verificado

Não está no GAP-MAP. Caminho: registrar (F-B3-1) → `sessao-instrumentacao` → `sessao-correcao`.
1. **[fork F-B3-1]** Registrar no GAP-MAP N3.
2. **[fork F-B3-2]** Forma da correção.
3. **[direto, se F-B3-2 → a]** `LeadConvertModal.tsx:157,187` → `<select>` com opção vazia + os valores do enum
   (`ConvertLeadSchema`, `CrmPipelineDto.ts`), rótulos traduzidos pt/en; `ConvertLeadPayload` estreita `size`/`role`
   para união literal; vazio segue omitido (`trim()` já faz).
4. **[direto]** Guarda: vitest do modal — escolher Porte/Papel → payload leva o valor do enum; vermelho hoje por não
   haver `<select>` (mesma técnica do guarda do J930).
5. **[direto]** Gates: `tsc`, vitest, paridade i18n `crm`, build, linha H2 em branco.

### B4 — `addedFields` (`Record<string, unknown>` × registro de arrays) — só registro

Latente: a UI não adiciona campos (`TotalControlSetup.tsx:175`, "A UI ainda não adiciona campos") e manda `{}`, que o BE
aceita. Sem plano; vira item quando a UI de campos extras nascer.

### B5 — Exportações com período condicional (DataExchange `superRefine`) — insumo ausente

Não conferi se o `ExportKind` do FE oferece `EXPORT_BANK_RECONCILIATION`/`EXPORT_ENTRY_SAMPLE` sem mandar período.
Checagem de 1 grep quando o dono quiser; não planejado (regra 2).

### B6 — Método: `\.strict()` não pega `z.strictObject(...)`

Nota para qualquer varredura futura (o CRM usa a 2ª forma). **Sem artefato** (gate/script é aparato vetado).

### B7 — Serviços FE sem checagem D2 (auth, users, documents, dynamic-table, saved-views, chat, dashboard-layout)

BE sem `.strict()` nesses domínios → D1 impossível; D2 não conferido. Nova rodada exige nova exceção à moratória
(como a de 28/09). Não planejado.

### B8 — Codegen / contrato FE derivado do BE

Vetado agora (§⛔). Opções para um PRE-ADR **depois** da moratória: `z.infer` exportado de pacote compartilhado;
tipos gerados do `public/openapi.json` já commitado; ou sonda de contrato por par. Não planejado.

## 4. Forks — RATIFICAÇÃO PENDENTE

| Fork | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-A1** | Commits do A1 | 1 commit (fix + guarda + docs), evidência vermelha colada no PR | 2 commits reconstruídos (guarda+GAP-MAP `[INSTRUMENTADO]` → fix) | A1 + A4 no mesmo PR | **(c) com 1 commit por assunto**: A4 é o mesmo contrato e destrava o H1 junto; reconstruir o vermelho (b) exige reverter o fix no working tree só para commitar |
| **F-A2** | PR-0 e linha do GAP-MAP do worktree paralelo | Dono descarta o diff do PR-0 e a linha de lá; a sessão dona do `PLANO-ONDA1` aplica as emendas A2.2–A2.4 | Mergear o PR-0 primeiro e rebasear o A1 (conflito nas mesmas linhas) | Deixar como está | **(a)**: PR-0 é subconjunto estrito do A1 e, sozinho, não muda nada visível; (b) paga conflito por zero efeito; (c) deixa duas linhas do GAP-MAP para a mesma lacuna |
| **F-A3** | Onde mora a linha do H2 da ECD | `RUNBOOK-H2-BROWSER-SIGNOFF.md` (seção nova) | Dentro do `RUNBOOK-H1-PVA.md` passo 3 | — | **(a)**: H2 é sign-off de tela; H1 é PVA — o H1 já referencia a tela e herda o resultado |
| **F-B2-1** | Casa da fatia NF-e/`classId` | Seção do BRIEF do `FE-INCR-FIXED-ASSETS` (nó existente, `autorizacao` vazia) | Incremento próprio `FE-INCR-NFE-FIXED-ASSET-MAPPING` | — | **(a)**: sem tela de classes (que é do FIXED-ASSETS) o `<select>` nasce vazio — a fatia depende do nó |
| **F-B2-2** | Como o FE identifica item de imobilizado | BE expõe `isFixedAsset` no preview (1 dono da regra; mexe em DTO de resposta + snapshot) | FE espelha o conjunto `{1551, 2551}` | — | **(a)**: a regra CFOP→imobilizado já tem dono no BE (`NfeDto`); (b) é o mesmo objeto com dois donos — a classe que a varredura de hoje mediu. Precedente: F-FE-SG-1 → a |
| **F-B3-1** | Registrar a lacuna do CRM no GAP-MAP | Sim, linha N3 com a sonda de N3 | Não — vira item do CRM normal | — | **(a)**: é 400 verificado em tela viva, mesma classe (evolução assimétrica); sem linha não há instrumentação sob a moratória |
| **F-B3-2** | Forma da correção do CRM | `<select>` com os valores do enum e rótulos traduzidos | BE aceitar rótulos pt | Input livre + tradução no FE | **(a)**: o enum é contrato do BE (valores gravados em DynamicTable); (b) muda dado persistido; (c) é heurística de texto |

## 5. Pendente de validação externa

- Formato do CRC e REGRA_OBRIGATORIO_CONTADOR (A3/A4): verdade é o Manual ECD L9 p. 202 citado no DTO.
- ECD gerada pela tela aceita no PVA = **H1** (humano); sign-off de tela = **H2** (humano).
- CRC real do contador = dado externo (D1 em aberto); o ensaio usa declarante fictício (G-2).

## 6. Insumos ausentes

- `PLANO-ONDA1-FE-2026-09-28.md` e o PR-0 só existem sem commit em outro worktree — A2 e B1 citam por caminho, sem commit.
- B5 não conferido.

## 7. Achados fora de escopo (não planejados)

- `RUNBOOK-H1-PVA.md` §P6 da **ECF** (`:273-283`) diz `indCrc` "na prática obrigatório" — o `validateEcfSigners` e o BE
  exigem; conferir o texto junto do A4 se o dono quiser (não verificado aqui).
