# AV-R5 · Força da Suíte — `my-app` (frontend), mutação executada

**A suíte do frontend tem 122 testes verdes e matou 4 de 7 mutações. As três que sobreviveram
são as de segurança: o filtro de inquilino de uma chamada de API e a guarda de papel do
`withAuth` sobreviveram SEM SEQUER SEREM EXECUTADAS — nenhum dos 122 testes atravessa a
camada de adaptadores (`lib/services/`, 17 arquivos, zero teste próprio) nem renderiza a HOC
que protege 20 páginas.** O que morreu foi dinheiro e data: `parseBrl`, `formatCents`,
`formatDateNumericBR` e a paginação `fetchAllRows` reagiram na primeira mutação.

> `mutation_score = 4/7 = 0,571.` As rodadas R1–R3 declararam este número **não medido** para
> o `my-app` e o AV-R3 registrou a lacuna em `NM1`. Com `npm ci` feito no frontend, ele está
> medido. Este relatório substitui aquela lacuna — e só ela: o `server` continua valendo 2/7
> pelo AV-R3, e os dois números NÃO se somam nem se comparam como se fossem a mesma suíte.

---

## Recorte e execução

| | |
|---|---|
| Commit | `ca33c745` · worktree `bold-khayyam-023b84`, árvore limpa antes e depois |
| Recorte | `my-app/` — o `server` está fora (medido no AV-R3) |
| Dependências | `npm ci` no `my-app` — **689 pacotes, 18 s** (primeira vez nesta linha de trabalho) |
| Baseline | **26 arquivos de teste · 122 testes · VERDE · 8,58 s** |
| Runner | vitest 3.2 (`jsdom`, `globals: true`), não jest |
| Tipos | `npx tsc --noEmit` sai 0 na árvore limpa |
| Mutações | 7 aplicadas, uma por invariante · 3 sondas de alcance · árvore revertida de `.bak` |
| Build de produção | **não rodado** — `next build` fora do orçamento (ver Não medido) |

Baseline cru, colado:

```
 Test Files  26 passed (26)
      Tests  122 passed (122)
   Start at  23:48:35
   Duration  8.58s (transform 2.46s, setup 8.66s, collect 20.66s, tests 5.60s, environment 63.01s, prepare 5.07s)
```

---

## Peça central · placar de mutação

| Mutação | Sítio | Invariante que quebra | Suíte reagiu? | Teste que pegou | Veredito |
|---|---|---|---|---|---|
| **M1** `new Date(value + 'T00:00:00')` → `new Date(value)` | `features/dashboard/shared/utils/formatters.ts:103` | data-only não desloca um dia em UTC-3 | **sim, 3 testes** | `formatDateNumericBR › renders a date-only ISO string as the SAME calendar day (no UTC shift)`; `formatDateBR › no longer shifts a date-only ISO back a day`; `finance formatDateBR › renders a date-only ISO as dd/mm/aaaa without the UTC shift` | **morta** |
| **M2** `/\.\d{1,2}$/` → `/\.\d{1,3}$/` | `features/accounting/lib/parseBrl.ts:17` | ponto sem vírgula é separador de milhar — nunca decimal de 3 casas | **sim, 1 teste** | `parseBrl → integer cents › parseBrl("1.000") === 100000` | **morta** |
| **M3** `isBalanced = totalDebit > 0 && totalDebit === totalCredit` → `totalDebit > 0` | `features/accounting/components/JournalEntryModal.tsx:102` | lançamento só sai balanceado | não | — | **sobreviveu, COM A LINHA EXECUTADA** |
| **M4** `buildQuery({ unitId })` → `buildQuery({})` | `lib/services/accounting.service.ts:527` | isolamento por inquilino na chamada de API | não | — | **sobreviveu, SEM SER EXECUTADA** |
| **M5** guarda de papel do render → `if (false)` | `lib/hoc/withAuth.tsx:99` | usuário sem o papel exigido não vê a tela | não | — | **sobreviveu, SEM SER EXECUTADA** |
| **M6** `page <= lastPage` → `page < lastPage` | `lib/dynamicTableFetch.ts:23` | busca TODAS as páginas — KPI não trunca | **sim, 1 teste** | `fetchAllRows › acumula linhas paginando até totalPages` | **morta** |
| **M7** `cents / 100` → `cents / 10` | `features/accounting/lib/formatCents.ts:3` | centavos inteiros renderizados na escala certa | **sim, 10 testes / 8 arquivos** | `TrialBalanceTable › renders each account row and the totals footer with formatted money`; `BalanceSheetPanel › renders the BP sections…`; `DFCPanel › formats string-cents money (parseInt path, not "NaN")` (+7) | **morta** |

**Mortas 4 de 7 aplicadas · `mutation_score = 0,571`.** Nenhuma mutação foi descartada por não
compilar, e nenhuma morte foi contada sem `Tests: N failed` com N > 0 e o nome do teste.
Cada mutação foi conferida com `git diff --numstat` antes de rodar: **as sete deram `1 1`.**

O corte é limpo e não é acaso de amostra: **morreu tudo que tem função pura com teste de
unidade próprio** (data, moeda, paginação) e **sobreviveu tudo que exige montar componente ou
atravessar a camada de serviço** (balanceamento no modal, filtro de inquilino, guarda de papel).

---

## Sobreviventes — por que cada um sobreviveu

O instrumento exige distinguir "a linha não executa" de "executa e ninguém afirma". As três
foram sondadas com um `throw` no próprio sítio, e a leitura foi feita pelo par (Suítes, Testes):

| Sonda | Resultado | Leitura |
|---|---|---|
| `PROBE-M3` em `JournalEntryModal.tsx:102` | `Test Files 1 failed · Tests 2 failed` | **executa** nos dois testes do modal — falta asserção, não teste |
| `PROBE-M4` em `accounting.service.ts:527` | `Test Files 26 passed · Tests 122 passed` | **não executa** em nenhum dos 122 testes |
| `PROBE-M5` em `withAuth.tsx:99` | `Test Files 26 passed · Tests 122 passed` | **não executa** em nenhum dos 122 testes |

Nenhuma sonda quebrou carregamento: as três compilaram e as duas silenciosas mantiveram
26 suítes verdes — não é o caso da armadilha `Suites falhou + Tests: 0 failed`.

---

## Achados

### F1 · A camada de adaptadores de API não é executada por teste nenhum
**Dano 4 · exposição já exposta · confiança alta (execução) · reversível**

M4 tirou `unitId` da query de `getAccounts` e os 122 testes ficaram verdes. A sonda mostra por
quê: a linha **nunca roda**. E não é um adaptador esquecido —

- `lib/services/` tem **17 arquivos `*.service.ts` e nenhum diretório `__tests__`**;
- **18 dos 26 arquivos de teste fazem `vi.mock` de um serviço** — o adaptador é substituído,
  nunca exercitado;
- no corpus inteiro há **3 ocorrências de `toHaveBeenCalledWith`** para **219 `expect(`**: o
  mock é afirmado por ter sido chamado ou pelo que devolve, quase nunca pelo que recebeu;
- os 39 `unitId=` que aparecem nos testes são **props JSX**, não asserção sobre query string
  (conferido: `grep unitId= | grep -v 'unitId="'` volta vazio).

`getAccounts` não é código morto: sete pontos o chamam (`AccountingView`, `LedgerPanel`,
`ChartOfAccountsPanel`, `ReconciliationPanel`, os dois painéis de AP/AR).

**O que isso significa:** a construção da query — o único lugar do frontend onde o escopo de
inquilino é montado — pode ser apagada sem uma linha vermelha.

### F2 · 20 páginas atrás de `withAuth` e zero teste toca a HOC
**Dano 3 · exposição já exposta · confiança alta (execução) · reversível**

M5 forçou a guarda de papel do caminho de render a conceder (`if (false)`) e a suíte ficou
verde; a sonda confirma que a linha não executa. `grep -rln withAuth pages/` devolve **20
arquivos**; `grep -rl withAuth --include=*.test.*` devolve **0**.

**Checagem adversarial que ENFRAQUECEU o achado, e ela fica no relatório:** a guarda do
`withAuth` é do cliente. A barreira autoritativa de autorização é a policy do backend — e essa
tem teste (o AV-R3 mediu o oposto no `createAccount`: coberta, mas não afirmada). Então o dano
aqui é de superfície exposta e de regressão silenciosa numa HOC que 20 telas herdam, não de
vazamento autoritativo. Por isso 3, não 4.

### F3 · A guarda de balanceamento do modal executa e ninguém a afirma
**Dano 2 · exposição após deploy · confiança alta (execução) · reversível**

`isBalanced` pode virar `totalDebit > 0` e os 122 testes seguem verdes, embora a linha rode nos
dois testes do `JournalEntryModal`. `grep -rn "isBalanced|desequilibr|unbalanced"` no corpus de
teste devolve **0** — os dois testes do modal cobrem só o seletor de dimensão.

**Enfraquecido de propósito:** o `PostingService` do backend rejeita lançamento desequilibrado, e
o AV-R3 mediu isso (a mutação M4 de lá morreu). Um desequilíbrio aqui vira um 400 do backend, não
lançamento torto no razão. É falta de asserção — custo de fechar: uma linha num teste que já existe.

---

## Placar

| Dimensão | Nível | Teto | Justificativa |
|---|---|---|---|
| **T1 força** | **1** / 3 | 3 sem dado de produção | 4 de 7; as duas centrais de segurança (isolamento, autorização) sobreviveram |
| **T2 sobreviventes** | **1** / 3 | idem | 3 sobreviventes, 2 sem sequer executar |
| **T3 asserção real** | **2** / 3 | idem | 0 testes sem `expect`, 0 `skip`/`todo`, 0 asserções fracas clássicas — mas 81 `toBeInTheDocument` contra 3 `toHaveBeenCalledWith`: afirma-se o que apareceu na tela, não o que foi enviado |
| **T4 fronteira coberta** | **1** / 3 | idem | 0 de 17 adaptadores de serviço com teste próprio; 4 de 7 helpers de `features/*/lib` |
| **T6 determinismo** | **3** / 3 | idem | 3 execuções completas na árvore limpa, 122/122 idênticas, zero instáveis |

T5 (cobertura) não entra: **não foi medida, por desenho do instrumento.** Nenhum percentual de
cobertura é produzido nem citado como garantia neste relatório.

---

## Não medido

| | O quê | Por quê | Consequência |
|---|---|---|---|
| NM1 | cobertura de linha | fora do escopo do AV-03 por desenho | nenhum percentual produzido nem citado |
| NM2 | `next build` de produção | orçamento; `reduced_capabilities.build = false` | as telas atrás de `withAuth` não foram verificadas contra build de produção, como o `my-app/CLAUDE.md` exige |
| NM3 | mutações além das 7 | orçamento | o placar é **amostra dirigida a invariante**, nunca estimativa estatística |
| NM4 | o gêmeo não-delegado de data-only (`features/crm/lib/dates.ts`) | um invariante, um sítio por rodada | não se sabe se a segunda implementação do mesmo invariante é defendida |
| NM5 | `server` | fora do recorte | continua valendo o 2/7 do AV-R3 |

---

## Três movimentos mais baratos

1. **Um teste do adaptador que afirme a query string com `unitId`** (fecha F1) — esforço baixo;
   é o maior dano da rodada e o único lugar do frontend onde o escopo de inquilino é montado.
2. **Um teste de render do `withAuth` com papel insuficiente** (fecha F2) — esforço baixo;
   a HOC não tem nenhum teste hoje, e 20 telas a herdam.
3. **Uma asserção de desequilíbrio no `JournalEntryModal.test.tsx` que já existe** (fecha F3) —
   esforço trivial; a linha já executa nos dois testes.

Nada foi corrigido: **AV-00 bloco 9 proíbe corrigir o não triado**, e nada nesta rodada foi triado.

---

## Inquérito

1. **Quantos dos 122 testes atravessam algum adaptador de API real?** Pela sonda em `getAccounts`
   a resposta é zero para esse; se for zero em geral, a suíte do frontend testa componentes contra
   mocks e nunca a costura com o backend.
2. **O gêmeo não-delegado de data-only (`crm/lib/dates.ts`) sobrevive à mutação que matou o
   canônico?** É a classe de bug que este repositório já viu voltar por re-inlining.
3. **`server` 2/7 e `my-app` 4/7 — a diferença é força de suíte ou tamanho do alvo?** As duas
   frações vêm de amostras dirigidas diferentes e **não são comparáveis** como estão.

---

## Auto-verificação

1. **Citei cobertura como garantia?** Não — T5 fica fora e NM1 declara a ausência.
2. **Placar tem mutação não aplicada de fato?** Não — as 7 têm `git diff --numstat` = `1 1`.
3. **Sobrevivente que não virou achado?** Nenhum — M3→F3, M4→F1, M5→F2.
4. **Suíte declarada verde sem execução?** Não — baseline e 2 repetições colados/contados.
5. **Árvore suja?** Não — `git status` do recorte vazio, zero `.bak` remanescente, revertido
   por cópia (nunca `git checkout --`).
6. **Contei morte sem `Tests: N failed`?** Não — as 4 mortes trazem N > 0 e o nome do teste.
7. **Revisão independente?** **Não houve** — como nas rodadas anteriores, o AV-00 §9.4 rejeita
   PASS emitido por quem executou. Estes são candidatos verificados por execução, não triados.

### Viés próprio, nomeado

Escolhi os sete sítios sabendo quais classes de bug este projeto já registrou. Isso enviesa
para invariantes com história — é o que o instrumento pede (sítio sai do invariante), mas
significa que **um invariante que ninguém nomeou ainda não foi testado por esta rodada**. O
4/7 mede a defesa do que o repositório diz proteger, não do que ele deveria.
