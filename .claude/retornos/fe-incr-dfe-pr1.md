# RETORNO — FE-INCR-DFE PR-1 (itens 10–13, toque no BE)

tarefa: expor `releitura`, `xmlAttachmentId`, `pdfAttachmentId` na `FiscalDocumentView`; `retornoManual` devolve `getById`; teste unit + integração. PR-0 e PR-2 fora.
autorizacao: dono em chat, 03/10/2026: "Executa o PR-1 do FE-INCR-DFE" (registrada no campo `autorizacao` de docs/plano/nos/FE-INCR-DFE.md)
sessao: sessao-feature · branch `claude/fe-incr-dfe-pr1` de origin/main `d6530790` · PR https://github.com/NightMarketz/luminaristest/pull/479 (aberto, NÃO mergeado)
modelo: claude-sonnet-5-5
perfil-previsto: sonnet-medio
custo: não medido nesta sessão (sem acesso ao contador de custo); tempo de relógio dominado pela suíte de integração completa (~3 rodadas, ver abaixo)
rodadas-de-review: 1 — agente `revisor-independente`, Opus, worktree isolada → PASS, 0 achados de corretude
veredicto: PASSOU (aguarda OK do dono para merge)

### Checklist
- 10 view + `readReleitura` guardado, tentativa corrente — feito (unit `FiscalDocumentEmissionService.view.test.ts`)
- 11 `retornoManual` → `getById` — feito
- 12 integração com repositório real — feito (`FiscalDocument.retornoManual.integration.test.ts`)
- 13 sem PII — feito (CPF do tomador ausente de `JSON.stringify(view)`)

### PROVA
- `cd server && npx tsc --noEmit` → exit 0
- `npm run test:unit` → 255 suítes, 3507 passed
- `npm run test:integration` (rodada única, limpa) → 94 suítes, 795 passed
- mutação minha: `releitura: null` em toView → integração 3/4 vermelhos; revisor: removeu gravação de `resultJson` no repo → 3/4 vermelhos; trocou tentativa corrente por `attempts[0]` → unit 1/3 vermelho
- `node scripts/plano-vault.mjs check` → vault íntegro

### Lacunas de spec
nenhuma.

### Achados fora de escopo
- Os 2 asserts de `FiscalDocumentLifecycleService.manual.test.ts` que liam `view.releitura` passaram a ler o `resultJson` da transição (consequência do item 11, o repo ali é falso).
- Depois de um reenvio a tentativa corrente muda e `releitura` volta a `null` (literal na spec: "tentativa corrente"); o PR-2 deve saber disso.
- Operacional: 2 rodadas concorrentes de `test:integration` no mesmo worktree colidem no SQLite (`no such table`, 149 falhas espúrias); só a rodada única vale. A CI Linux ainda é o teste final (memória windows-serializa-sqlite-ci-linux-nao).

### Linha de fold pós-merge
id: FE-INCR-DFE · estado: planned (PR-0 e PR-2 pendentes) · estado_detalhe: "+ PR-1 (itens 10–13) mergeado" · prs: [479]
