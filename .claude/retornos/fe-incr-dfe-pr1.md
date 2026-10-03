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

### Lacunas de spec e pontos a conhecer
> **Destino: GAP-MAP** (`docs/operating-manual/GAP-MAP.md`). Os pontos 1 (Nível 3) e 4 (Nível 4) viraram linha lá; 2, 3 e 5 não são lacuna (verificação pendente na CI, ajuste de teste, custo) e ficam só aqui.
Lacunas de spec que bloqueiam o PR-1: **nenhuma**. Pontos a conhecer (não bloqueiam; o 1 e o 2 pedem atenção do PR-2 / da próxima sessão):
1. **Reenvio zera a releitura.** Depois de `reenviar` a tentativa corrente muda e `releitura` volta a `null` (literal na spec, item 10: "tentativa corrente"). O BRIEF não diz se a tela do PR-2 deve mostrar a releitura de uma tentativa anterior; se quiser, é decisão do dono — o PR-2 não deve presumir.
2. **CI Linux é o teste final.** Tudo foi rodado no Windows (SQLite serializa aqui, não na CI); o BRIEF §8 exige CI Linux verde.
3. **Asserts trocados no teste existente.** Os 2 asserts de `FiscalDocumentLifecycleService.manual.test.ts` que liam `view.releitura` passaram a ler o `resultJson` da transição (consequência do item 11; o repo ali é falso).
4. **Rodadas concorrentes de `test:integration` colidem no SQLite** (`no such table`, 149 falhas espúrias). Só a rodada única vale (94 suítes / 795 ✓).
5. **Custo não medido** nesta sessão.

### Achados fora de escopo
nenhum.

### Linha de fold pós-merge
id: FE-INCR-DFE · estado: planned (PR-0 e PR-2 pendentes) · estado_detalhe: "+ PR-1 (itens 10–13) mergeado" · prs: [479]
