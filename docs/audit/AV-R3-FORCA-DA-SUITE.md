# AV-R3 · Força da Suíte — mutação executada

**A suíte tem 1.850 testes verdes e matou 2 de 7 mutações. O caminho de escrita do razão —
o núcleo contábil do produto — não é exercitado por nenhum teste de integração: `PostingService`
não é instanciado por nenhum dos 31 arquivos, e o único que parece postar define um helper
local que grava direto no Prisma, contornando o serviço inteiro.** Remover o filtro de
inquilino de uma consulta do razão e tirar a perna do lançamento de dentro da transação
passaram os dois sem uma única falha.

> `mutation_score = 2/7 = 0,286.` A rodada R1 declarou este número **não medido** e travou o
> AV-03 no teto 1. Com `npm ci` feito, ele está medido. Este relatório substitui aquela lacuna.

---

## Recorte e execução

| | |
|---|---|
| Commit | `643d2eb` · árvore de `server/src` limpa antes e depois |
| Dependências | `npm ci` no `server` — 781 pacotes, 18 s |
| Baseline | **154 suítes · 1.850 testes · verde** (123 unit / 1.506 · 31 integração / 344) |
| Tempo | unit 42 s · integração 167 s |
| Mutações aplicadas | 7 · nenhuma sobreviveu à execução (árvore revertida, `git status` limpo) |
| `my-app` | **não medido** — `npm ci` não foi executado no frontend |

---

## Peça central · placar de mutação

| Mutação | Sítio | Invariante que quebra | Suíte reagiu? | Teste que pegou | Veredito |
|---|---|---|---|---|---|
| **M1** remover gate de período de dentro da tx | `PostingService.ts:253` | período fechado entre o preflight e o commit (TOCTOU) | **sim, unit** | `PostingService › period gate › postEntry TOCTOU: preflight passes (OPEN) but authoritative tx-gate fails (period closed between checks) — no write` | **morta** |
| **M4** `Σdébito !== Σcrédito` → `<` | `PostingService.ts:204` | balanceamento exato em centavos inteiros | **sim, unit** | `postEntry › rejects an unbalanced entry (Σdebit !== Σcredit)` **e** `INCR-2 audit wiring › no audit when balance check fails (no tx opened)` | **morta** |
| **M2** teto `MAX_CENTS` → `MAX_CENTS + 1` | `InventoryDto.ts:22` | teto Int32 de persistência na fronteira | não | — | **sobreviveu** |
| **M3** perna do lançamento sai da transação | `PostingRepository.ts:20` | atomicidade — `tx` propagado a toda escrita | não | — | **sobreviveu, sem ser executada** |
| **M5** filtro de inquilino removido | `JournalEntryRepository.ts:49` | isolamento entre donos | não | — | **sobreviveu, sem ser executada** |
| **M6** `canManage` → `false` em `createAccount` | `PostingService.ts:628` | autorização de escrita no plano de contas | não | — | **sobreviveu, com a linha executada** |
| **M7** `refine(isValidDateOnly)` removido | `aging.dto.ts:35` | data-only real, não só regex | não | — | **sobreviveu** |

**Mortas 2 de 7 aplicadas.** As duas mortes vieram do mesmo arquivo de teste
(`PostingService.test.ts`) e cobrem exatamente os dois invariantes que este repositório
documentou com mais cuidado: o gate autoritativo dentro da transação e o balanceamento exato.
Onde há registro escrito, há teste. Onde não há, não há.

---

## Achados

### F1 · O caminho de escrita do razão não tem cobertura de integração
**Dano 4 · exposição já exposta · confiança alta (execução) · reversível**

M3 e M5 sobreviveram, e a razão não é asserção fraca — é que **as linhas nunca executam**.

Provado por três vias independentes:

1. **Sonda de alcance.** Um `throw` na linha 20 de `PostingRepository` (a escrita da perna) não
   disparou uma única vez nos 344 testes de integração; 31 suítes passaram, zero erros de
   compilação. Idem para `JournalEntryRepository.findById:48`.
2. **Estática.** `grep -rln "PostingService" --include=*.integration.test.ts` devolve **vazio**.
   Nenhum teste de integração instancia o serviço.
3. **Reconciliação do contraexemplo.** `PostingDimension.integration.test.ts` menciona
   `postEntry` — mas na linha 76 ele define um **helper local com esse nome** que grava via
   `db.posting.create` direto, contornando serviço e repositório.

Os alvos não são código morto: `postingRepo.create` é a escrita usada por `postEntry`
(`PostingService.ts:300`) e `journalEntryRepo.findById` é chamado por cinco serviços reais —
`AccountingReportService`, `DocumentAttachmentService` e `EntryApprovalService` em três pontos.

**O que isso significa:** o razão é testado só na camada unit, com `lib/prisma` mockado
(`PostingService.test.ts:33`). Um teste que mocka o Prisma não pode falhar quando a escrita
sai da transação nem quando o filtro de inquilino some da cláusula `where` — porque não há
cláusula `where` de verdade para observar. **A suíte está afirmando o mock.**

**Impacto:** as duas classes de bug que este repositório mais registrou — `tx` não propagado e
vazamento entre inquilinos — não têm rede no caminho contábil.

**Falsificador estático — executado, confirmou:**
```bash
cd server && grep -rln "PostingService\|getPostingService" src --include=*.integration.test.ts | wc -l
```
Saída: `0`.

**Demonstração (3 s):** o comando acima devolve zero enquanto `grep -rn "postingRepo.create" src/features/accounting/services/PostingService.ts` mostra a escrita real.

**Barreira proposta:** `teste_de_fronteira` — um teste de integração que poste um lançamento
pelo `PostingService` real contra o SQLite de teste e afirme duas coisas: que o rollback
desfaz a perna junto com o cabeçalho, e que a leitura por id de outro dono devolve `null`.

---

### F2 · O gate de autorização de `createAccount` é coberto e não é afirmado
**Dano 3 · exposição já exposta · confiança alta (execução) · reversível**

M6 trocou `if (!this.policy.canManage(scope))` por `if (false)` — permissão sempre concedida —
e os 1.850 testes ficaram verdes.

Aqui a explicação é o oposto de F1: o método **é** exercitado. `PostingService.test.ts:783`
tem um bloco `describe('createAccount audit')`. Os testes chamam `createAccount`, verificam a
trilha de auditoria e **nunca verificam que um chamador sem permissão é recusado**. O caminho
feliz está coberto; a guarda, não.

Distinção que importa para a correção: F1 pede teste novo de integração; F2 pede **uma
asserção a mais num teste que já existe**.

**Falsificador estático — executado, confirmou:** `grep -rn "createAccount" src --include=*.test.ts`
devolve o bloco de auditoria e nenhuma asserção de `ForbiddenError`.

**Barreira:** `teste_de_permissao` — o teste que falha se a guarda for reaberta.

---

### F3 · A fronteira de DTO quase não é testada
**Dano 2 · exposição após-deploy · confiança alta (execução) · reversível**

M2 e M7 sobreviveram pelo mesmo motivo estrutural: **4 dos 21 DTOs contábeis têm teste
próprio** (`PayableDto`, `PostingDto`, `ReceivableDto`, `ReconciliationDto`).

- **M2** — `totalValueCents` é afirmado em três testes, todos em serviço ou repositório.
  Nenhum atravessa o `InventoryDto`, que é onde o teto `MAX_CENTS` vive. O teto pode subir de
  um sem ninguém notar.
- **M7** — `isValidDateOnly` aparece em um teste, e é de reconciliação. A **ligação** da função
  no `aging.dto` não é tocada por nada: o ajudante é testado, a fiação do ajudante não.
  Removida a `refine`, `2026-02-30` volta a passar pela fronteira.

`InventoryDto` e `aging.dto` estão os dois na lista de 110 unidades do **AV-R2** que nenhum
teste nomeia. Este achado é o AV-R2 confirmado por execução: a lacuna enumerada lá mata
mutação aqui.

**Barreira:** `teste_de_fronteira` — DTO se testa pelo que **recusa**.

---

## Convenções · não são achados

| Alegação | Por que não é achado | Vira achado se… |
|---|---|---|
| "Cobertura mínima de X%" | nenhuma cobertura foi medida nesta rodada, e o instrumento a rebaixa a sinal secundário por desenho | …um percentual alto conviver com mutação sobrevivente medida — que é exatamente o que 2/7 sugere e ninguém confirmou |
| "Teste unitário deve mockar o repositório" | o mock não é o defeito; a ausência do par de integração é | …existir o teste de integração e ainda assim a mutação sobreviver |

---

## Placar

| Dimensão | Nível | Teto | Justificativa |
|---|---|---|---|
| T1 força | **1** | 4 | 2 de 7; as mortes concentradas num arquivo |
| T2 sobreviventes | **0** | 4 | 5 sobreviventes, 2 deles sem sequer executar |
| T3 asserção real | 3 | 4 | 0 testes sem asserção, 0 `skip`/`todo`, 47 asserções fracas em 3.798 (1,2%) |
| T4 fronteira coberta | **1** | 4 | 4 de 21 DTOs contábeis |
| T5 cobertura | — | — | não medida por desenho |
| T6 determinismo | 3 | 4 | 1.850 testes, zero instáveis em três execuções completas |

Escala: 0 nada morre · 1 mutações centrais sobrevivem · 2 as centrais morrem · 3 todas morrem
com teste nomeado · 4 gate reprova o build quando uma sobrevive.

---

## Não medido

| Medição | Motivo | Consequência |
|---|---|---|
| `my-app` | `npm ci` não rodado no frontend | vitest, 20 arquivos de teste: força desconhecida |
| Cobertura de linha | fora do escopo do instrumento | nenhum percentual foi produzido nem citado |
| Alcance de M2 e M7 por sonda | resolvido estaticamente | a sonda de `throw` quebra a compilação nesses sítios; o alcance saiu de quem-chama-quem |
| Mutações além das 7 | orçamento | 7 de um espaço grande; o placar é amostra dirigida a invariante, não estimativa estatística |

---

## Três movimentos mais baratos

1. **Um teste de integração que poste pelo `PostingService` real** — fecha F1, que é o maior
   dano, e dá rede às duas classes de bug mais registradas do projeto.
2. **Uma asserção de `ForbiddenError` no bloco `createAccount audit` que já existe** — fecha
   F2 com uma linha.
3. **Teste de rejeição para `InventoryDto` e `aging.dto`** — os dois DTOs cujas mutações
   sobreviveram, e ambos já estavam na lista do AV-R2.

---

## Inquérito

1. **Quantos dos 344 testes de integração passam por algum serviço de contabilidade?**
   Pela sonda, o de posting é zero. *Onde a resposta existiria: repetindo a sonda serviço a
   serviço — que é trabalho de uma rodada inteira do AV-03.*
2. **Se o `PostingService.test.ts` mocka o Prisma, o que exatamente as 1.352 linhas dele
   provam?** *Onde existiria: em nenhum lugar — é a pergunta que M3 e M5 levantam.*
3. **As duas mutações que morreram estavam documentadas em ADR. As cinco que sobreviveram,
   não. Isso é coincidência?** *Onde existiria: cruzando `docs/adr/` com o placar — não feito.*

---

## Auto-verificação

| Checagem | Resultado |
|---|---|
| Cobertura citada como garantia? | Não — nenhum percentual produzido |
| Mutação no placar que não foi aplicada de fato? | Nenhuma — `git diff --numstat` conferido em cada uma |
| Mutação sobrevivente que não virou achado? | Nenhuma — as 5 estão em F1, F2 e F3 |
| Suíte declarada verde sem execução? | Não — baseline e cada mutação executadas |
| Árvore ficou suja? | Não — `git status` de `server/src` limpo ao fim |
| Sobrevivente distinguido entre "não executa" e "asserção fraca"? | Sim — F1 e F2 são achados diferentes por essa razão |

### Duas armadilhas do instrumento, disparadas nesta rodada

1. **Mutação que não compila parece mutação morta.** A sonda de alcance de M6 inseriu um
   `throw` que tornou código seguinte inalcançável e **quebrou o narrowing de tipo num `catch`
   24 linhas adiante** (`error is of type 'unknown'`, linha 652). Resultado: 20 suítes de
   integração falharam ao *carregar*. Lidas de relance, seriam 20 mortes. A leitura correta é
   `Test Suites: falhou` com `Tests: 0 failed` = **suíte não rodou, resultado inválido**.
   A variante `if (true)` reproduziu o mesmo defeito.
2. **`perl -0pi` reescreveu as quebras de linha de um arquivo inteiro.** M7 saiu como diff de
   79 linhas para uma mutação de uma. Refeita com `sed '35d'` — 1 linha. O resultado da
   primeira passada foi descartado.

As duas viraram emenda no AV-03 (§3, *Armadilha da mutação que não compila*), com a regra de
conferir `git diff --numstat` por mutação e de nunca contar morte sem `Tests: N failed`.

**Esta rodada não foi revisada por agente separado** — mesma limitação do R1 e do R2.
