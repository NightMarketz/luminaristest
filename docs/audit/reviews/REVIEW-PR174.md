# Revisão independente — PR #174

| campo | valor |
|---|---|
| revisor | agente revisor independente (não escreveu nenhum artefato deste PR nem dos seis que ele revisa) |
| data | 2026-08-08 |
| head revisado | `aa6bd77576f2831686532e82a62ff576a4245ae2` (detached) |
| base | `main` · merge de `origin/main` (`30d28d86`) em `dc387d60` |
| worktree de medição | `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rev-174` |
| estado do worktree ao fim | `git status --porcelain` **vazio**, `find -name "*.bak"` **vazio**, zero commit, zero `git add` |

---

## DECISÃO: **MERGEAR**

**Motivo, em uma frase:** os dois arquivos de teste que este PR acrescenta mordem invariantes reais
(três mutações minhas, três mortes discriminantes de 1 em 8), a escrituração declara a própria fração
em vez de fechar o item (`status_closes_item: false`, `gate` e `due` intactos), o merge não perdeu nada
de `origin/main`, e tudo o que eu derrubei é sobre o **vocabulário do razão**, não sobre código —
nenhum achado meu corrompe dinheiro, razão ou tenancy, e nenhum é motivo para segurar o diff.

## Veredito

**`revisado_com_ressalva`** — e faço questão de dizer **de que tipo**, porque é exatamente o que a
seção seguinte mede: eu **NÃO reprovaria** este PR. A minha ressalva é da espécie do #168 e do #170
("achei defeitos, não seguro o merge"), não da espécie do #167/#169/#171/#173 ("eu reprovaria e só não
reprovo porque me proibiram de consertar"). Que o razão não consiga distinguir estas duas coisas é o
meu achado principal.

`revisado_pass` seria errado: um achado material caiu (§7, achado A) e ele muda como as seis linhas
emendadas devem ser lidas.

---

## 4. A distribuição 6/6 — a minha análise

**Ela é propriedade do VOCABULÁRIO cruzado com o ENCARGO, não dos seis PRs. Com o encargo que os seis
revisores receberam, `revisado_com_ressalva` era o único valor admissível para todos os seis, e o
placar carrega quase nenhuma informação.**

A derivação é mecânica e falsificável por uma linha. `scripts/review-ledger-check.mjs:43-48` tem uma
lista fechada de **quatro** valores:

```
revisado_pass · revisado_com_ressalva · revisado_reprovado_e_corrigido · sem_revisao_independente
```

Sob o encargo dos seis ("estou proibido de corrigir"):

- `revisado_reprovado_e_corrigido` é **estruturalmente inalcançável** — o nome exige um conserto que o
  encargo proíbe;
- `sem_revisao_independente` é inaplicável — houve revisão, e o `[RL5]` proíbe `reviewer`/`artifact`
  nessa linha;
- sobram **dois**: `revisado_pass` e `revisado_com_ressalva`.

E `revisado_pass` só seria admissível para uma revisão com **zero** achado não corrigido. As seis
listaram, somadas, **35** (5 · 5 · 6 · 5 · 5 · 9 — recontado por mim nos seis arquivos, e bate com o
total que o AV-R8 publica). Logo o resultado era determinado antes de qualquer medição.

**Isso não é conjectura sobre a cabeça dos revisores: quatro dos seis escrevem a coação na cara.**

| revisão | o que o próprio texto diz |
|---|---|
| **#167** | *"Eu reprovaria a frase … mas não corrigi nada, conforme a instrução, **e por isso** o veredito é `revisado_com_ressalva` **e não** `revisado_reprovado_e_corrigido`"* |
| **#169** | *"Eu **reprovaria** a alegação de suficiência do controle … **Por proibição de corrigir**, fica `revisado_com_ressalva`"* |
| **#171** | *"Eu reprovaria a escrituração da medição … estou **PROIBIDO de corrigir** … **Por isso** o veredito é `revisado_com_ressalva`"* |
| **#173** | *"**eu reprovaria o PR como está** … Eu manteria o item **aberto**"* |
| #168 | *"Se pudesse reprovar, **não reprovaria**"* |
| #170 | *"Se eu pudesse reprovar, **não** reprovaria"* |

**A consequência, que é o achado:** o rótulo `revisado_com_ressalva` funde dois estados materialmente
diferentes — **"revisado, seguiria"** (2 de 6) e **"o revisor REPROVARIA e o defeito segue de pé"**
(4 de 6) — e nenhum campo, nenhum gate e nenhuma linha de saída os separa. O `review-ledger-check`
imprime `Distribuição: revisado_com_ressalva=6`, e esses seis não querem dizer a mesma coisa. Quem
usar o razão para decidir o que consertar não tem como saber que quatro deles são reprovações
desarmadas.

**Nenhum dos seis deveria ter sido outro valor.** Confiro, porque a acusação óbvia seria de rótulo
frouxo: `pass` está errado para os seis (todos listam achado não corrigido, inclusive o #170, que
achou um erro de tipo **novo** introduzido pelo próprio PR); `reprovado_e_corrigido` está errado para
os seis (ninguém corrigiu nada). **O defeito não é a rotulagem — é o vocabulário.** Os revisores
escreveram o melhor valor disponível.

**E o que me faz emitir isto como ressalva e não como nota de rodapé:** o reflexo de desconfiar de
distribuição uniforme **existe neste PR, aplicado duas vezes, e nunca aqui**. No mesmo conjunto de
commits:

- `TRIAGEM-AV-R8.json:52` (`distribution_analysis`) dedica um parágrafo inteiro ao 9/1 dos portões,
  nomeia as quatro rodadas anteriores (7/7, 5/5, 5/5, 5/5) e **mede** que a uniformidade é propriedade
  do mapa;
- `gates_summary.note` volta a dizer que "os dez falsificadores rodaram e os dez confirmaram — quarta
  vez consecutiva", e manda para `own_bias_named`.

Busca minha por qualquer tratamento equivalente da distribuição de **vereditos**: `grep -rn
"6 de 6\|seis de seis\|6/6"` em `docs/audit/` devolve **dois** hits, e os dois são de outro assunto
(um `6/6 verde` de topologia no `CONTINUACAO.md`, o `Generating static pages (6/6)` do build no
REVIEW-PR170). **Zero.** O autor tem o reflexo, escreveu-o duas vezes no mesmo PR, e não o virou para
o número que este PR produziu.

> **Falsificador de uma linha (o meu):** ler `VERDICTS` em `scripts/review-ledger-check.mjs`. Se a
> lista contiver qualquer valor com o sentido de *"reprovado e NÃO corrigido"*, a minha derivação cai
> e o 6/6 volta a carregar informação. Ela não contém.
> **Segundo falsificador:** se qualquer uma das seis revisões tivesse zero achado não corrigido,
> `revisado_pass` teria sido alcançável e não usado, e o 6/6 seria escolha. Nenhuma tem.

---

## 5. O que reexecutei

Todas as execuções de jest: `cd server && timeout <N> env OPENAI_API_KEY=ci-dummy-openai-key npx jest
--selectProjects integration --runInBand --forceExit --cacheDirectory ".../jestcache-rev174" [alvo]`,
salvo as duas linhas do F10, que **de propósito** correm sem `--forceExit`. **Exit reportado é sempre
o do wrapper.** Nenhuma execução caiu na armadilha 1 (`Test Suites: falhou` com `Tests: 0`) exceto uma,
que eu **descartei como INVÁLIDA** e refiz — está declarada em §6.

| # | o que | árvore | wrapper | saída |
|---|---|---|---|---|
| **R0** | **suíte de integração INTEIRA** | limpa | **0** | `Test Suites: 38 passed, 38 total` · `Tests: 406 passed, 406 total` · **283,6 s** |
| **R1** | só os 2 arquivos novos — **CONTROLE-VERDE das minhas mutações** | limpa | **0** | `2 passed` · `8 passed, 8 total` · 18,7 s |
| **G0** | `node scripts/bancada-gate.mjs` | limpa | **0** | 9 relatórios `auditoria/1.1`, 5 triagens / 31 itens, 22 avisos, isenção B18 = `AV-R2.json:ReferentialMapping` |
| **G0′** | `node scripts/review-ledger-check.mjs --pr 174` | limpa | **0** | `7 PR(s)` · `revisado_com_ressalva=6 · sem_revisao_independente=1` · `7 declarado(s) / 227 merge(s)` |
| **T** | `npx tsc --noEmit` (server) | limpa | **0** | — |
| **CI** | `gh pr checks 174` | — | — | **5 jobs × 2 runs, todos `pass`**, inclusive `Server – typecheck & test` 9m25s |

**R0 é a reprodução independente do número que o `status_evidence` do rank 9 publica** (38 suítes /
406 testes). Bate exatamente, e é o controle que impede a leitura barata "os arquivos novos derrubaram
a suíte alheia" — os dois chamam `pushTestSchema()`, que apaga o `test-integration.db` inteiro.

**Recontagem aritmética por caminho próprio** (contei nos arquivos, não rodei o comando do autor):

| declarado no PR | meu comando | resultado |
|---|---|---|
| 55 rotas no mount | `grep -oE "router\.(get\|post\|put\|patch\|delete)\('[^']*'" src/routes/accounting.ts \| sort -u \| wc -l` | **55** (e 55 linhas totais — nenhuma duplicata inflando) |
| 29 de escrita / 26 de leitura | contagem por método | **23 post + 4 delete + 1 patch + 1 put = 29** · **26 get** — confere |
| 23 handlers no controller | `grep -cE "^export (const\|async function)"` | **23** — confere |

**Merge — nada de `origin/main` se perdeu além da duplicata.** Medido lado a lado nos três refs
(`origin/main`, `dc387d60^1`, `dc387d60`): os dois lados carregavam **os mesmos seis PRs**
(167, 170, 168, 169, 171, 173); a resolução ficou com a linha da branch nos seis; as seis declarações
originais estão preservadas **verbatim** dentro do `note`. Nenhum PR de `main` sumiu — não havia PR
exclusivo de `main` para sumir. Todos os sete `commit` declarados (`333a5e26`, `9e675679`, `9a3ef0c5`,
`a9f0ebc6`, `13f3c6a5`, `fe27cc22`, `dc387d60`) **existem e são ancestrais** de `aa6bd775`, conferido
com `git cat-file -e` + `git merge-base --is-ancestor`.

---

## 6. Minhas próprias mutações

Protocolo em todas: `cp arquivo arquivo.bak` → mutar **por índice de linha em Node** (nunca
`String.replace`, armadilha 6) → `git diff --numstat` provando qual linha mudou → rodar → restaurar do
`.bak` → `numstat` **vazio** → `rm .bak`. Uma por vez, `--runInBand` (armadilha 9). O harness **aborta
com exit próprio se o numstat vier vazio**, para que "verde" nunca seja indistinguível de "a mutação
não aplicou" (armadilha 3). Nenhum `git checkout` de arquivo rastreado.

| # | mutação | de quem | numstat | wrapper | resultado |
|---|---|---|---|---|---|
| **M1** | `AccountRepository.softDelete:67` — `data: { deletedAt: new Date() }` → `data: { deletedAt: null }` (o soft-delete vira **no-op**) | **minha — eixo novo** | `1 1` | **1** | **MATA 1 de 8**, discriminante. `Received: null` na asserção `deletedAt).not.toBeNull()`. **O soft-delete (Contrato §2) É medido pela barreira** |
| **M2** | `PostingService.ts:704` — `eventType: 'account.deleted'` → `'account.deleted_MUTANTE'` | **minha** | `1 1` | **1** | **MATA 1 de 8**, mas por `500` — a cadeia de auditoria tem lista fechada de `eventType` e recusa. Kill real, mecanismo errado para o que eu queria medir → refeita em **M3** |
| **M3** | `PostingService.ts:706` — `targetId: accountId` → `'ALVO-MUTANTE'` (eventType permanece válido) | **minha — eixo novo** | `1 1` | **1** | **MATA 1 de 8**. `Expected: 1, Received: 0` — a asserção que morre é **a contagem de `auditEvent`**. **A trilha de auditoria É medida pela barreira** |
| **M4** | `PeriodService.ts:149` — `if (period.status === 'HARD_CLOSED')` → `if (false)` | minha | `1 1` | **1** | **INVÁLIDA, descartada.** `Test Suites: 2 failed` com **`Tests: 0 total`** — erro de TS, não mordida. Armadilha 1. Refeita como M4b |
| **M4b** | `PeriodService.ts:149+154` — guarda terminal reescrita para `=== 'FUTURE'` + segunda guarda aceitando `HARD_CLOSED`: **um período HARD_CLOSED passa a ser reabrível** | **minha — eixo novo** | `2 2` · **`tsc` exit 0** | **0** | **SOBREVIVE 8/8.** Não-vacuidade **provada**: a mesma mutação mata o projeto `unit` (`Tests: 2 failed`). → **achado D** |
| **M5** | `accountingController.ts:194` (`deleteAccount`) — `resolveAccountingScope(user, …)` → dono trocado por literal | reexecução da classe do **implementador**, com diagnóstico de qual asserção morre | `1 1` | **1** | **MATA 1 de 8**, mapeamento 1:1. `Expected: 200, Received: 404` — **é o CONTROLE POSITIVO** (o dono apagando a própria conta). Confirma a correção do orquestrador |
| **G1** | `REVIEW-LEDGER.jsonl` — apagar o campo `note` inteiro da linha emendada do PR 167 | **minha — eixo novo** | `1 1` | **0** | **FUGA.** `OK: 7 PR(s)…`, exit 0 → **achado B** |
| **G2** | *CONTROLE-VERMELHO* — `reviewer := implementer` na mesma linha | minha | `1 1` | **1** | `[RL4] reviewer === implementer` — **o harness enxerga**; a fuga do G1 não é cegueira |
| **GB1** | `AV-R2.json` — apagar `+softdelete` da linha do centerpiece **E** a chave `label_defects_registered` juntas | reexecução do achado do revisor do #173, **na árvore já mergeada** | `2 14` | **0** | **FUGA ainda viva pós-merge.** A linha de isenção do B18 vai a `(0): nenhuma` em silêncio. A emenda do #173 é **honesta** ao declarar que a alegação central caiu |
| **F10-1** | *CONTROLE* — árvore limpa, `accountingController.integration.test.ts` **SEM `--forceExit`** | minha | — | **0** | `13 passed, 13 total`, `did not exit` = **0 de 1** |
| **F10-2** | *CONDIÇÃO* — regra pública `{ path: '/api/accounting', method: 'POST', match: 'prefix' }` acrescentada a `auth.ts`, **SEM `--forceExit`** | minha (reprodução do par) | `1 0` | **124** (teto de 300 s) | `Tests: 8 failed, 5 passed, 13 total` **impresso**, depois `did not exit` = **1** → confirma o **F10** e, de quebra, o **F4** |

---

## 7. Alegações que caíram

**A · A distribuição 6/6 não é propriedade dos seis PRs — é propriedade do vocabulário cruzado com o
encargo, e é a única distribuição deste PR que ninguém examinou.** Derivação, evidência textual dos
quatro revisores coagidos e os dois falsificadores estão na §4. *Grau: verificado (lista fechada lida
no script; contagem de achados recontada nos seis arquivos; busca por declaração de suspeita = 0).*

**B · A "FORMA DA EMENDA" — a preservação verbatim da declaração original — não é barrada por gate
nenhum.** As seis linhas emendadas repetem, palavra por palavra, que *"a declaração original vai
preservada verbatim acima"*. Medido (G1): apagar o `note` **inteiro** da linha emendada do PR 167 sai
**exit 0** — o `[RL5]` só exige `note` para `sem_revisao_independente`, e para veredito `revisado_*` o
campo é opcional. Controle-vermelho no mesmo comando (G2) reprova com `[RL4]`, então não é harness
cego. **Consequência para este PR:** a única coisa que segura a declaração original é convenção; uma
emenda futura pode apagá-la e o razão fica verde. A defesa do próprio PR — *"o histórico completo está
no git"* — é verdadeira e é justamente o que reduz o razão a índice em vez de registro.
> *Falsificador:* rodar `review-ledger-check` com o `note` removido de uma linha `revisado_*`; se
> reprovar, o achado é falso.

**C · O razão não tem como dizer "parcialmente revisado", e por isso a linha do #174 tem de contrabandear
a verdade em prosa.** O `[RL5]` **proíbe** `reviewer`/`artifact` numa linha `sem_revisao_independente`,
e não existe valor intermediário. Este PR **teve** revisão independente de uma parte
(`REVIEW-BARREIRA-F6.md`), e o único lugar onde isso cabe é o texto livre do `note`. Mesma raiz do
achado A: o vocabulário é grosso demais para os estados que esta bancada de fato produz. Duas
instâncias no mesmo arquivo → é classe, não caso.
> *Falsificador:* achar na lista fechada um valor que signifique revisão parcial, ou uma regra que
> permita `artifact` sem `reviewer`. Não há.

**D · A barreira nova não alcança a máquina de estados de período — inclusive a invariante terminal que
o cabeçalho do próprio arquivo nomeia.** M4b torna um período `HARD_CLOSED` **reabrível**, com `tsc`
exit 0 e numstat `2 2`, e os 8 casos novos ficam **verdes**. O cabeçalho de
`accountingController.periods.integration.test.ts` escreve *"HARD_CLOSED é TERMINAL: nenhuma transição
o desfaz"* — a frase está lá, a asserção não. **Reduzo o alcance do achado, porque a honestidade
custa:** o risco de produção **não** está descoberto — o projeto `unit` mata a mesma mutação
(`Tests: 2 failed`), o que ao mesmo tempo prova que ela não é vacuosa. O defeito é de **escopo
declarado**, não de rede ausente.
> *Falsificador:* aplicar M4b e mostrar qualquer um dos 8 casos novos reprovando.

**E · O viés nº 2 do revisor da barreira F6 está errado num eixo e é insanável no outro.** Ele declara
não ter medido três classes; eu medi duas:
- *"remoção da auditoria dentro da tx"* — **CAI**: M3 mostra que a trilha **é** medida, e pela
  asserção de auditoria em si (`Expected: 1, Received: 0`), não por acidente. A barreira é mais forte
  do que o próprio revisor lhe creditou.
- *"nenhum dos 8 casos morreria se a `policy` fosse removida"* — **cai por outro motivo, e o motivo é
  mais interessante que o achado**: `server/src/features/accounting/policies/AccountingPolicy.ts` tem
  **vinte** métodos e **todos** são `return !!scope.actorUserId`. Atrás do `authMiddleware`
  (deny-by-default), isso é sempre verdadeiro. Afrouxar a policy é **mutação vacuosa** — armadilha 3 —
  e nenhum teste do mundo pode fechar essa lacuna, porque não há guarda para medir. O revisor nomeou
  uma dívida de cobertura onde existe uma guarda tautológica.
> *Falsificador:* achar um método de `AccountingPolicy.ts` cuja condição não seja `!!scope.actorUserId`.

---

## 8. Alegações que sobreviveram

**(2) O recorte da barreira do dano 4 é honesto — não é "fechar item pela metade com nome bonito".**
Ataquei a hipótese e ela não passou. O item **não é declarado fechado**: `status_closes_item: false`,
`gate: bloqueia_primeiro_cliente` e `due: 2026-08-31` **intactos**, e o próprio valor de `status`
carrega a palavra `no_recorte`. A fração está declarada em três lugares independentes (os dois
cabeçalhos e o `status_evidence`) e eu **a recontei pelo meu caminho**: 55 rotas, 29 de escrita,
23 handlers — tudo bate. O `suggested_barrier` pede um arquivo por grupo de handlers de escrita **do
mount**, e o `status_evidence` diz literalmente que *"19 das 29 rotas de escrita do mount seguem com
zero alcance"* e que **é por isso** que `gate` e `due` ficam intactos. É um item **encostado**, escrito
como item encostado. Fica de pé o limite que o próprio campo declara: `status` não é lido por gate
nenhum — confirmei (`grep -c "\.status\b" scripts/bancada-gate.mjs` = **0**), e o mesmo vale para
`items[].review` (= **0**). Convenção, e declarada como tal.

**(3) A emenda no lugar é a única forma que o contrato admite.** O `[RL2]` reprova PR duplicado
(reproduzido: duas linhas para o mesmo PR → exit 1), então append não é opção. As alternativas
plausíveis não são melhores: campo novo violaria "nenhum campo novo foi criado"; arquivo separado
sairia do alcance do gate. E a resolução do merge não descartou nada de `main` além da duplicata
(§5). **O que fica é o achado B**, que é sobre a preservação não ser barrada, não sobre a forma.

**(4) A entrada do próprio #174 é honesta, e é mais do que modéstia — ela é carga útil.** Ela não se
limita a dizer "não houve revisão": nomeia **qual** parte teve (`REVIEW-BARREIRA-F6.md`), nomeia que a
revisão **corrigiu** a leitura do implementador, nomeia que AV-R8 e TRIAGEM-AV-R8 não têm revisor, e
nomeia o ponto fraco que eu deveria atacar (*"eu escolhi o recorte … e também escrevi o registro que
declara esse recorte suficiente"*). Procurei contradição no PR e não achei: os seis `REVIEW-PR*.md`
são sobre outros PRs, e o `[RL5]` proíbe registrar `reviewer`/`artifact` nessa linha de qualquer
forma — a prosa era o único lugar disponível (achado C).

**(5) AV-R8 e TRIAGEM-AV-R8 não afirmam mais do que mediram, nos pontos que eu escolhi atacar.**
Escolhi dois, os mais frágeis:
- **A "instância viva" do F1** (o `fe27cc22` não-ancestral). Medi: em `aa6bd775` ele **é** ancestral —
  a instância evaporou com o merge. Mas o `verification_note` do rank 2 **já prevê isso por escrito**:
  *"a instância viva vale para a linha de história em que o razão vive hoje e **evapora no dia em que
  esta linha for fundida com origin/main**"*. Previsão publicada antes, medida por mim depois. Não é
  over-claim.
- **A aritmética do "35 achados novos"**. Recontei nos seis arquivos: 5 (A1–A5) · 5 (N1–N5) · 6 · 5
  (N1, N1b, N2, N3, N4) · 5 (RV171-F1–F5) · 9 (N1–N9) = **35**. Fecha.
- Bônus a favor: o `new_findings_raised` da triagem **denuncia o próprio relatório de origem** (duas
  citações de linha erradas por um, ambas no único achado não executado; 18 acertos como controle) e
  **não conserta** — que é a disciplina certa.

**(6) As duas correções do orquestrador sobre os próprios agentes estão certas, e as duas custaram a
ele.** Reexecutei as duas por caminho próprio:
- **`RV171-F5` / F10** — par completo, meu harness, sem `--forceExit`: **controle** (árvore limpa)
  wrapper `0`, `13 passed`, `did not exit` **0 de 1**; **condição** (regra `match:'prefix'`) wrapper
  **124** no teto de 300 s, com `Tests: 8 failed, 5 passed, 13 total` **já impresso** e `did not exit`
  **1**. As duas linhas divergem → o `refuted` que o emissor da AV-R8 publicou estava errado e o
  orquestrador acertou ao derrubá-lo. *De quebra, isto reconfirma o F4:* `prefix` mata 8 de 13, logo o
  `exact` que o autor do #171 escreveu era **vacuoso**.
- **A matriz 8/8** — M5 reproduz a mutação do implementador em `deleteAccount` e mede **qual asserção
  morre**: `Expected: 200, Received: 404`, isto é o **controle positivo** (o dono operando o próprio
  recurso). O 8/8 mede **alcance**, não inquilino. O orquestrador acertou.

**Resposta direta a "se ele errou ali, errou em favor de quem?":** ele não errou, e as duas correções
foram **contra o próprio interesse** — uma retirou a manchete mais vistosa que a rodada podia ter
("o revisor errou"), a outra rebaixou o placar do próprio implementador de "prova de inquilino" para
"prova de alcance". Esse é o sinal mais forte a favor deste PR que eu encontrei, e ele é medido, não
lido.

**Os testes novos são bons e não recomendo mexer neles.** `createApp()` de produção, JWT real, zero
`jest.mock` de prisma, unidade **compartilhada** entre os dois donos (o recorte afiado), linha gêmea do
dono B em cada caso de período, controle positivo na mesma rota e método em todos os negativos, e cada
negativo conferindo o **banco** e não só o status. M1, M3 e M5 confirmam que ele morde por três eixos
distintos com mapeamento 1:1.

---

## 9. Achados novos (com falsificador, **NÃO corrigidos**)

Os cinco estão detalhados em §7 — repito só o par achado/falsificador, para quem for triar:

| # | achado | falsificador de uma linha |
|---|---|---|
| **A** | O 6/6 é determinado pelo vocabulário × encargo; `revisado_com_ressalva` funde "seguiria" (2) com "reprovaria" (4), e nenhum gate os separa | achar em `VERDICTS` (`review-ledger-check.mjs:43-48`) um valor com sentido de *reprovado e não corrigido* |
| **B** | A preservação verbatim da declaração original não é barrada: apagar o `note` de uma linha `revisado_*` sai exit 0 | rodar o gate com o `note` removido de uma linha `revisado_*`; se reprovar, o achado é falso |
| **C** | O razão não sabe dizer "parcialmente revisado"; `[RL5]` proíbe `artifact` sem revisão plena, e o #174 tem de usar prosa | achar valor de revisão parcial na lista fechada, ou regra que permita `artifact` sem `reviewer` |
| **D** | A barreira nova não alcança a máquina de estados de período (M4b sobrevive 8/8; morto só pelo `unit`) | aplicar M4b e mostrar qualquer um dos 8 casos novos reprovando |
| **E** | `AccountingPolicy` é tautológica nos 20 métodos → o viés nº 2 do revisor do F6 nomeia uma lacuna que nenhum teste pode fechar; e a trilha de auditoria, que ele deu por não medida, **é** medida (M3) | achar um método de `AccountingPolicy.ts` com condição diferente de `!!scope.actorUserId` |

Nenhum dos cinco é motivo para segurar o merge: nenhum é bug de produção, nenhum toca dinheiro, razão
ou tenancy, e os cinco são exatamente a matéria que esta bancada emite → tria → conserta numa passagem
seguinte. **A, B e C pertencem à mesma classe** — *o vocabulário do razão é grosso demais para os
estados que a bancada produz* — e cabem numa emenda só.

---

## 10. O que ficou FORA desta revisão

- **Os seis `REVIEW-PR*.md` foram julgados por LEITURA.** Não reexecutei nenhum dos falsificadores
  próprios dos seis revisores. O meu veredito sobre eles é sobre a **coerência entre texto e rótulo**,
  que é o que a alegação (1) pedia — não sobre a verdade de cada achado deles.
- **Dois dos dez falsificadores da AV-R8** (o F10 e o do F6, via M5). Os outros oito ficam herdados.
- **Zero frontend.** Não exercitei `my-app` em nenhum ponto; tudo do #170 (retry do 409, dimensões na
  edição, os 5 erros de `test:types`) continua não verificado por mim.
- **Nenhuma mutação minha rodou contra a suíte INTEIRA** — as seis correram só contra os 2 arquivos
  novos. Logo **não medi kill colateral**: se M1/M3/M4b/M5 também matassem ou salvassem testes de
  serviço ou unidade, eu não veria (salvo o `unit -t reopen` que rodei de propósito para M4b).
- **Não julguei os portões nem os ranks da TRIAGEM-AV-R8**, exceto rank 9 e rank 2.
- **Não rodei o `unit` completo nem `test:leaks`.**
- **`createAccount` e `seedYear`**: confirmei por leitura, e não por mutação, a leitura do revisor do
  F6 de que não há mutação de um ponto que os mate pela invariante de inquilino — e acrescento a razão
  estrutural: os dois são operações de **criação**, onde não existe recurso alheio a endereçar, então
  a única entrada de inquilino é o escopo, e mutá-lo derruba o controle antes da asserção. Não é
  lacuna de teste; é limite do operador de mutação.

## 11. Meus vieses, nomeados

1. **Fui apontado para o 6/6 como "A MAIS SUSPEITA" e encontrei exatamente uma explicação para ele.**
   Um revisor que acha precisamente o que foi mandado achar deveria desconfiar de si. Mitigação: o
   achado A não é interpretação — é a leitura de uma lista fechada de quatro strings num script, mais
   a citação literal de quatro revisores dizendo a coação com todas as letras. Qualquer um refaz em
   trinta segundos. Contrapeso honesto: **a conclusão que eu tirei dele é minha** — o autor poderia ter
   escrito a mesma análise e chamado o 6/6 de informativo mesmo assim.
2. **Texto que declara a própria fraqueza compra credibilidade barata, e eu senti o efeito.** Este PR
   pré-declara quase tudo o que eu iria atacar (o recorte, a falta de revisor, o `status` não lido por
   gate, o limite da instância viva). O risco é eu confundir *"ele já disse"* com *"então está
   resolvido"*. Compensação: medi o que ele declarou em vez de aceitar — R0, as contagens de rota, o
   par do F10, a leitura da mordida — e três dessas medições poderiam ter derrubado o PR. Nenhuma
   derrubou, e é por isso que a decisão é MERGEAR.
3. **Rodei a suíte inteira uma vez só e limpa.** Se houvesse não-determinismo entre suítes (o
   `pushTestSchema()` é destrutivo), uma execução verde não o pegaria. `--runInBand` reduz, não elimina.
4. **A minha ressalva é da espécie que eu mesmo acuso de não ser distinguível.** Eu escrevo
   `revisado_com_ressalva` dizendo "não reprovaria" — exatamente como #168 e #170 — e o razão vai
   registrar a minha linha ao lado das quatro reprovações desarmadas, sem diferença visível. **O meu
   próprio veredito é a sétima instância do achado A**, e é assim que ele deve ser lido. Não corrigi
   o vocabulário: achado não triado não se conserta.
5. **Eu não tenho revisor.** Esta revisão é a sétima da série e a única sobre o conjunto, e ninguém a
   confrontou. As minhas seis mutações têm controle verde antes e depois e restauração conferida por
   numstat vazio — controle não é revisão.

---

**Estado do worktree ao fim, confirmado:** `git status --porcelain` em
`C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rev-174` devolve **vazio**; `git diff --numstat`
**vazio**; `find . -name "*.bak"` fora de `node_modules` **vazio**; `node scripts/bancada-gate.mjs`
exit **0** e `node scripts/review-ledger-check.mjs --pr 174` exit **0** ao fim, como no início. Nenhum
arquivo rastreado alterado, nenhum `git add`, nenhum commit, nenhum push, nenhum merge. Único arquivo
que escrevi fora de `rev-174` foi este relatório.
