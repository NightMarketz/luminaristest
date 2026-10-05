# RETORNO — X7 Fase B PR-2 (e-Lalur anual, item 12)

tarefa: executar o PR-2 da Fase B do X7 (F-TB-8 a) — BE-INCR-TAX-ASSESSMENT-B-brief.md §3.1, item 12 + testes 26 a, 26 g + regressão do e-Lalur trimestral; PR-3/PR-4 fora; `ANUAL` segue NÃO selecionável (F-TB-8.1: só no PR-4)
autorizacao: dono, chat, 05/10/2026 — "Executa o PR-2 da Fase B do X7 (dono, 05/10/2026) — sessao-feature. Spec = BRIEF da Fase B + F-TB-1..8; só o PR-2 (e-Lalur anual), PR-3/PR-4 fora. … Entrega = PR + review independente; sem merge sem meu OK." (ainda NÃO registrada no `autorizacao` de docs/plano/nos/X7.md — entra no fold)
agente: sessão principal (sessao-feature), worktree x7-fase-b-pr2-5919d1, branch claude/x7-fase-b-pr2-5919d1; review por Agent isolado (worktree própria)
base: f487ec1f (origin/main, 05/10)
modelo: opus-5.5

### Decisões do dono tomadas nesta sessão (questionário, 05/10 — antes de qualquer código)
Das lacunas 1–6 do PR-1, **1, 2 e 3 são do PR-3** e **4** (`A00` = ano cheio) só fixa a janela do M312 no `A00`; não tocam o PR-2. **5 e 6 tocam**, e a leitura do código achou mais duas:
1. **Sem perfil × período × forma** (nova): a letra "T0x só em TRIMESTRAL" + suítes trimestrais sem `CompanyFiscalProfile` ⇒ conflito com "regressão sem editar asserções". → **(a)** forma efetiva `ANUAL` ⇒ só `A00..A12`; qualquer outro caso (TRIMESTRAL, forma nula, regime sem forma, **ano sem perfil**) ⇒ só `T01..T04`. A continuidade usa a mesma regra para N−1.
2. **`n620`/`n660` × catálogo ausente** (nova; item 12 no PR-2, abas no PR-4/item 22, insumo §5.1). → **(b), CONTRA a recomendação (a: adiar)**: os livros entram agora no enum, com as regras de período, e **todo write neles é 400** "catálogo das abas N620/N660 ainda não transcrito" até o PR-4. `GET /lalur/catalog?livro=n620` devolve `[]`.
3. **`A0m` antes do início de atividade** (lacuna 5 do PR-1). → **(a)** 400 no e-Lalur (linha da Parte A em `A0m` com m < mês de `inicioAtividadeEm` no ano). `T0x` segue sem checagem.
4. **Teto da compensação P em `A0m`** (lacuna 6 do PR-1). → **(a)** por mês: saldo de abertura do ano (`openingBalances`) − Σ das `P` do **próprio** `A0m` ≥ 0; as linhas A/E do `A0m` não movem o teto; meses não somam (art. 50 I).

### Checklist (BRIEF B §1 item 12 + §3.1 PR-2)
| # | Comportamento | Status | Teste |
|---|---|---|---|
| 12.1 | `LALUR_PERIODOS` = `T01..T04, A00, A01..A12`; os 5 schemas de `LalurDto.ts` usam; coluna `quarter` com comentário de herança | ✅ | LalurDto.test (A00 aceito, A13 recusado); snapshot |
| 12.2 | Período × forma do perfil efetivo do ano (decisão 1), lido **dentro da tx** em create/update de linha e movimento, close e reopen | ✅ | parteB.test "período × forma" (+ `findByYear(scope, 2025, TX)`); anual.integration |
| 12.3 | Movimento da Parte B em `A01..A12` ⇒ 400 (art. 50 II) | ✅ | **26 (a)** unit + integração |
| 12.4 | `closeParteB` em ANUAL fecha só `A00`; `A0m` ⇒ 400; resultado do `A00` = DRE do ano | ✅ | parteB.test "fecha só o A00"; integração (BC 1.000 derivado do razão anual) |
| 12.5 | `chainYear`/`recomputeYear`/`diagnoseYear` iteram `periodosParteB(forma)`; linhas de `A0m` não movem a Parte B | ✅ | idem (diagnóstico = `['A00']`, 0 divergência) |
| 12.6 | Continuidade entre exercícios com formas diferentes (T04/A00 → T01/A00), em abertura, close e reopen | ✅ | parteB.test "continuidade 2024 ANUAL → 2025 TRIM → 2026 ANUAL" + "Feche o A00 de 2025" |
| 12.7 | Ramo `A0m` explícito em `assertCompensacaoCabe` (decisão 4) | ✅ | **26 (g)** unit (create/update, rollback, continuidade da abertura) + integração |
| 12.8 | M312 por `periodoBounds` (`A0m` = período em curso) | ✅ | integração: fevereiro entra em `A03`, abril ⇒ 400 |
| 12.9 | Livros `n620`/`n660` só em `A01..A12`; `n630`/`n670` nunca em `A0m`; `n620`/`n660` ⇒ 400 de catálogo (decisão 2) | ✅ | parteB.test "livros do Bloco N"; integração |
| 12.10 | `A0m` antes do início de atividade ⇒ 400 (decisão 3) | ✅ | parteB.test "A0m antes do mês de início" |
| reg | Suítes do e-Lalur trimestral verdes | ✅ | lalurController(.m312Warning).integration, parteB.test e lalurParteBBalances.test sem edição de asserção; **exceção:** LalurDto.test assertava `quarter: 'A00'` ⇒ 400, que é o shape que o item 12 manda mudar — virou `A13` ⇒ 400 + `A00` aceito |
| 25 | Snapshot dos 5 schemas; enums `quarter`/`livro` em `docs.paths.ts` e JSDoc; +0 paths | ✅ | dtoShapeSnapshot (diff só LalurDto + `.gen.ts` do FE); openapi 244 paths antes e depois |

### Diff resumido
- `models/Lalur.model.ts`: `LALUR_PERIODOS`, `LalurForma`, `periodosParteB`, `periodoDaForma`, `isLalurMes/isLalurQuarter`; livros `n620`/`n660` + `isLivroSemCatalogo` (`findLinha`/`linhasDoLivro` sem aba ⇒ undefined/`[]`).
- `services/LalurService.ts`: dep nova `LalurProfileReader` (`ICompanyFiscalProfileRepository.findByYear`, via factory); `formaDoAno` (usa `formaEfetiva` do X13), `assertPeriodoDoAno` (em-tx), `assertLivroNoPeriodo`, `assertSemParteBNoBalancete`, `assertParteBFechaNoPeriodo`, `primeiroPeriodoFechado`; abertura/close/reopen/diagnóstico/warnings na forma do ano; ramo `A0m` do teto; M312 e aviso X4-14 por `periodoBounds`.
- `services/lalurParteBBalances.ts`: `chainYear(…, order = LALUR_QUARTERS)`.
- `SpedEcfRealGenerationService.ts`: 1 cast de tipo do `livro` (n620/n660 não chegam lá: `resolveLinha` recusa). A ECF anual é do PR-4.
- `dtos/LalurDto.ts`, `routes/docs.paths.ts`, `public/openapi.json`, snapshot + `my-app/types/contracts/accounting/LalurDto.gen.ts`.
- Testes: +10 unit no `LalurService.parteB.test.ts` (o `build()` ganhou o stub do perfil — construção, não asserção), +6 em `lalurController.anual.integration.test.ts` (perfil ANUAL semeado pelo Prisma).

### Lacunas de spec
- Nenhuma aberta: as 4 que tocavam o PR-2 foram decididas pelo dono acima.
- Registro (não bloqueia): o gate período × forma vale também em `updateEntry`/`updateMovement`/`reopenParteB` (letra "senão 400"); `archive*` fica livre para limpeza. Linha órfã só nasceria com troca de forma com e-Lalur preenchido, que o item 2 (PR-4) recusa.

### Achados fora de escopo
- `npm run docs:generate` + `UPDATE_DTO_SNAPSHOT=1` reescrevem os `__dto-shapes__.json` das outras features só em fim de linha (LF×CRLF, `core.autocrlf=true`); ficaram fora do commit.

### Checks executados
- `cd server && npx tsc --noEmit` → 0; `cd my-app && npx tsc --noEmit` → 0
- `npm run test:unit` → 275 suítes, 3921 passed
- `jest --selectProjects integration --runInBand lalurController` → 3 suítes, 27/27
- `npm run test:integration` → (preencher)
- openapi: 244 paths antes e depois

### Fold pronto (pós-merge, não aplicado)
`id: X7` · `estado: inflight` · `estado_detalhe: + "05/10: Fase B PR-2 (item 12, e-Lalur anual: A00..A12, período × forma, Parte B só no A00, continuidade entre formas, teto da compensação em A0m, M312 por periodoBounds, n620/n660 recusados até o catálogo do PR-4) mergeado no #<n>; ANUAL segue não selecionável. Decisões do dono 05/10: sem perfil ⇒ trimestral; n620/n660 entram com write 400 (contra a recomendação); A0m antes do início ⇒ 400; teto = abertura − P do próprio mês. Próximo: PR-3 (lacuna 1 do PR-1 bloqueia)"` · `prs: + "#<n>"` · `autorizacao: + "dono, 2026-10-05: 'Executa o PR-2 da Fase B do X7 … sessao-feature' (PR-3/PR-4 fora)"`
