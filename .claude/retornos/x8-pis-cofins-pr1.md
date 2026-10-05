# RETORNO — X8 PR-1 (BE-INCR-PIS-COFINS itens 1–6)

tarefa: executar o PR-1 do X8 (F-PCB-4 a) — autorização do dono 03/10/2026, "só esta fatia"
agente: sessão principal (sessao-feature), worktree x8-pr1-pis-cofins-fd9ed4, branch local `claude/x8-pis-cofins-pr1`
base: origin/main f487ec1f (05/10)
modelo: opus-5.5/low
perfil-previsto: opus-medio
rodadas-de-review: 1 — r1 (Agent isolado, opus, worktree própria): 3 achados (1 médio, 2 baixos) → 2 corrigidos, 1 declarado
custo: não medido nesta sessão
veredicto: PASS COM RESSALVAS (review independente r1) → 2 de 3 achados corrigidos; PR #521 aberto, NÃO mergear sem OK do dono

## Rodada 1 (03/10) — parado na pré-condição
O PR-1 da Fase A do X7 não estava em main (`origin/main` d6530790: só commits de docs do X7; nenhum `taxAssessment*` nem
função half-up em `server/src`).

## Rodada 2 (05/10, "Veja agora") — pré-condição OK, parado no item 5
- Pré-condição: X7 Fase A PR-1/2/3 em main (#478, #504, #509); `arred`/`mulBp` em `taxAssessmentParams.ts:113-134`.
- Nenhum PR do X8 aberto/mergeado antes desta sessão (`gh pr list --search "X8 OR PIS"`).

### Checklist
| Item | Estado |
|---|---|
| 1 refine PRESUMIDO+NAO_CUMULATIVO ⇒ 400 (`FiscalProfileDto.ts`) | código feito; **teste não escrito** |
| 1b `requireCostRegime` ⇒ 400 nomeado no par ilegal | código feito; **teste não escrito** |
| 2 4 contas da provisão (schema + migração ADD COLUMN + DTO + service + allowlist + `ACCOUNT_KEYS` da política) | código feito; **teste e snapshot não feitos** |
| 3 `models/pisCofinsParams.ts` (alíquotas importadas de `nfeCost.ts`, códigos DCTF, `vigenteAte 2026-12-31`) | código feito; **teste não escrito** |
| 4 arredondamento = `arred` do X7 | não começado (só é usado pelo item 6) |
| 5 crédito PIS × Cofins separado na importação | código feito — **quebra teste do X6 ⇒ PARADA** |
| 6 leitura do crédito do mês (repo) | não começado |

Tudo num commit local `0b07c84d` (WIP, **não publicado**). `npx tsc --noEmit` (server) → exit 0.

### A parada (verificado)
`npx jest --selectProjects unit` → 4 falhas: 3 snapshots de DTO (gate esperado, `UPDATE_DTO_SNAPSHOT=1`) e
**`NfeImportService.test.ts:419` "item 10/11 (F-X6-3 b)"** — o teste do X6 faz `toEqual` exato da linha a recuperar:

```
    Object {
      "accountId": "acc-pc",
      "amountCents": 784,
+     "baseCents": 8473,
+     "cofinsCents": 644,
      "kind": "PIS_COFINS",
+     "pisCents": 140,
    },
```

O item 5 manda gravar `baseCents/pisCents/cofinsCents` **na linha** `PIS_COFINS`; o teste do X6 afirma que a linha tem só
3 campos. Os dois não cabem juntos. O BRIEF (item 5) e o pedido mandam parar se um teste do X6 precisar mudar.
A aritmética bate: 140 + 644 = 784 (invariante do item 5).

Varri os demais: nenhum outro teste do X6/ITEM-DESTINATION compara a linha (`nfeController.purchase.regime` só usa
`toBeTruthy`; `NfePreviewService.test` soma `amountCents` por `kind`).

### Lacunas de spec
1. **Item 5 × "testes do X6 sem edição"** — contradição dentro do BRIEF. Caminhos (decisão do dono):
   - (a) autorizar a edição **só** desse `toEqual` (acrescentar os 3 campos esperados; o entry e o `amountCents` não mudam);
   - (b) gravar as parcelas fora da linha (outra coluna/JSON) — muda o contrato §2 do BRIEF (emenda);
   - (c) tirar o item 5 do PR-1 (todo mês sem ele vira nota `DERIVADO` no item 6, que é o custo citado no F-PCB-4).
2. **Item 6, forma da saída** (registro, não bloqueante por si): o BRIEF não fixa o shape do retorno da função de repo.
   Proposta para quando destravar: uma linha por `Payable` `{payableId, documentNumber, issueDate, baseCents|null,
   pisCents, cofinsCents, derivado}` — o PR-2 monta a memória `CREDITO_NFE`/`_DERIVADO` dela.

### Achados fora de escopo
- `FiscalProfileService.assertExpenseAccount` responde "insumo vai para despesa na entrada" para qualquer conta Expense
  (já era assim para IRPJ/CSLL do X7); a mensagem fica errada para PIS/Cofins. Não mexi.

### Fold (quando o PR existir)
`X8 · estado: blocked → planned (PR-1 em review) · prs: +#<n>` — **não aplicado**; o campo `autorizacao` da nota ainda
não registra o "executa" de 03/10 (ver rodada 1: registro junto com o PR).

### Gates de envio OPS-001
- Caso adversarial: "o `toEqual` talvez ignore campos extras" → rodado: falha com o diff acima.
- Checagem que falharia se eu estivesse errado: o próprio teste `item 10/11` — vermelho com o item 5; verde em main é suposto (o teste está em main), não rodado aqui.

## Rodada 3 (05/10) — dono: "(a) — autorizo editar só esse teste; segue o PR-1"
- Única edição em teste existente: `NfeImportService.test.ts` "item 10/11" — a linha esperada ganha
  `baseCents: 8473, pisCents: 140, cofinsCents: 644`.
- Itens 4 e 6 implementados (`separarCreditoPisCofins` em `pisCofinsParams.ts` com o `arred` do X7;
  `PayableRepository.findPisCofinsCredits`). Forma da saída do item 6 = a proposta da lacuna 2 (uma linha por nota).
- Testes novos: `pisCofinsParams.test.ts` (itens 3, 4, 6 puro), `PisCofinsPr1Dto.test.ts` (itens 1 e 5 no Zod),
  `nfeCost.pisCofinsSplit.test.ts` (item 5 puro), `pisCofinsPr1.integration.test.ts` (1, 1b, 2, 5, 6 ponta a ponta).
- Vault: `autorizacao` do X8 registra o "executa" de 03/10 e a edição autorizada de 05/10; `plano-vault.mjs check` íntegro.

### Checks executados (verificado)
- `server: npx tsc --noEmit` → 0
- `server: npm run test:unit` → 278/278 suítes, 3923 passed (3 skipped, 1 todo)
- `server: npm run test:integration` → 108/108 suítes, 896/896
- `my-app: npx tsc --noEmit` → 0; `npm run test:types` sem erro
- `UPDATE_DTO_SNAPSHOT=1` → só o snapshot de accounting + 3 `.gen.ts` do FE mudaram (os 16 de outras features eram só EOL; descartados)
- `npm run smoke:migration -- --db <dev.db real>` → OK, 5 migrações pendentes aplicadas na cópia sem perda
- `dev.db` real (read-only): perfis = PRESUMIDO/CUMULATIVO e REAL/NAO_CUMULATIVO — nenhum com o par ilegal (o 1b não trava ninguém hoje)

### Caso adversarial
- Rateio derivado: 37 centavos ⇒ PIS 7 (truncar daria 6) — prova que é o `arred`, não piso; soma = amount em 7 valores.
- Item 6 exclui cancelada, apagada, fora do mês (30/06, 01/08), outra unidade e nota só com ICMS (teste de integração).
- Meia unidade exata no 165:925 é impossível (66a ≡ 185 mod 370 sem solução) — o teste não finge cobrir esse ramo.

### Achados fora de escopo (acréscimo)
- `docs.paths.ts` do PUT do perfil fiscal não lista `insumoExpenseAccountId` nem as contas do X7; segui o precedente
  (as 4 do X8 também não entram). Defasagem do OpenAPI vale para os três nós.

## Review independente r1 (Agent isolado, opus, worktree própria, sobre 0481f913)
Veredito: **PASS COM RESSALVAS**. 7 invariantes conferidos (verificados por execução/leitura), incluindo
`prisma migrate diff` sem drift e derivação 165:760 sem violação em 0..199.999.
1. **Média — corrigido.** `findPisCofinsCredits` lia só a 1ª linha `PIS_COFINS`; o DTO aceita 2 num POST manual ⇒
   crédito subcontado (500 em vez de 800). Agora soma todas (como o `payable.created`). Teste novo no item 6:
   **vermelho** com o código de 0481f913 (`amountCents` 500 ≠ 800), verde com a correção.
2. **Baixa — corrigido.** Título do teste em `nfeCost.pisCofinsSplit.test.ts` dizia cobrir "fornecedor do Simples"
   sem exercitar; título passou a afirmar só o que o laço cobre.
3. **Baixa — declarado, sem mudança.** `vigenteDesde '2022-12-15'` (data do ato da IN 2.121) sem artigo de vigência
   relido; não afeta 2025–2026 (as leis das alíquotas são anteriores). Oráculo = contador.

Pós-correção: `server tsc` 0 · `test:unit` 278/278 (3923) · `pisCofinsPr1.integration` 5/5. Suíte de integração
completa NÃO re-rodada depois da correção (a mudança é só no método novo do item 6 e no seu teste).

### Riscos e vieses
- A aritmética está provada contra a tabela do BRIEF, não contra a lei; códigos DCTF e contas = contador (P-1, P-5).
- Viés próprio: tendi a tratar o shape do item 6 como detalhe — ele foi decidido por mim (lacuna 2, registrada); o PR-2
  pode precisar de outro formato.
