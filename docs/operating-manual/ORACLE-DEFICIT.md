# Déficit de oráculo — por que o ciclo de cinco etapas não converge

- **Status:** `Proposed` — nada aqui está ratificado. Os forks do §4 esperam decisão do dono, um a um.
- **Data:** 2026-08-09 · **Commit da medição:** `7e22f9b0` (tip de `main` no momento em que tudo abaixo foi executado).
- **Autor:** claude-opus-5, sessão de pesquisa e desenho. **Nenhum gate, teste ou artefato de auditoria
  foi alterado** — este documento é a única adição.
- **Alcance:** as 5 triagens em `docs/audit/` (31 itens), os 8 relatórios de revisão em
  `docs/audit/reviews/`, os dois gates (`scripts/bancada-gate.mjs`, `scripts/review-ledger-check.mjs`)
  e a fila de contabilidade do `ACCOUNTING-MASTER-MAP.md`.

---

## 0. As duas linhas

**O ciclo não deixa de convergir por falta de rigor — ele exclui o produto POR rigor: o `B5`
(`bancada-gate.mjs:306`) exige falsificador **estático** e o `B6` (`:316`) põe teto de **120 s** na
demonstração, e nenhum defeito que só aparece com o app de pé cabe nessas duas regras; o resultado
medido é que as 11 correções emitidas depois de `643d2eb` mudaram **0 linha de código de aplicação**,
enquanto uma única sessão de navegador contra o `dev.db` real mudou **28** e desfez 2 bugs de runtime
que já tinham passado por revisão independente e 1135 testes verdes.**

**O risco principal não é a bancada estar errada — é ela ser a única coisa no repositório que anda
sozinha: dos itens do Bloco A cujo gate é oráculo externo (PVA, contador, NF-e, implantar), 4 de 4
seguem abertos há 4 semanas; e no mesmo funil, da única revisão que usou método diferente
(`REVIEW-PR170`, build de produção contra `dev.db` real), **1 de 4 defeitos de produto sobreviveu até
a fila** enquanto 7 achados sobre o instrumento entraram — um dos descartados apaga etiquetas de
dimensão ao editar rascunho e **reproduz hoje** (`EntryApprovalsPanel.tsx:24-34`).**

---

## 1. Diagnóstico — a medida, refeita

### 1.1 O universo triado é 31, não 22

A tabela do pedido cobre três triagens (`TRIAGEM-R1-R3`, `TRIAGEM-AV-R7`, `TRIAGEM-AV-R8` = 22 itens).
O próprio gate conta cinco:

```
node scripts/bancada-gate.mjs
→ OK: 29 itens no catálogo …, 9 relatório(s) auditoria/1.1,
  5 triagem(ns) 1.0 com 31 item(ns), …
```

As duas que faltam são `AV-L1-TRIAGEM.json` (4 itens, 2026-07-31) e `TRIAGEM-AV-R6.json` (5 itens).
**A ausência da `AV-R6` importa mais do que a contagem:** as 5 evidências dos 5 itens dela apontam
todas para o mesmo arquivo, `docs/audit/bancada.html` — a rodada de "verificação em navegador" foi
apontada para o **painel da própria bancada**, não para o app. Incluí-la não é higiene de contagem;
é o caso mais puro do fenômeno que o pedido descreve, e ele estava fora da mesa.

### 1.2 O método — a pergunta certa não é onde está a evidência

Classificar por **caminho de evidência** é o método natural e é o errado (é a contra-hipótese (b) do
pedido, e ela **sobrevive** — §1.4). A pergunta que separa os baldes é outra, e é binária:

> **Se este item for consertado, o aplicativo em execução se comporta de forma diferente?**

Três respostas, três baldes:

| Balde | Definição | O conserto toca |
|---|---|---|
| **P — produto** | sim: um usuário, um deploy ou um arquivo entregue à Receita muda de comportamento | código de aplicação, schema, ou arquivo de implantação |
| **C — cobertura** | não: o produto nunca foi mostrado errado; o que falta é quem afirme que ele está certo | só arquivo de teste |
| **I — instrumento** | não: o defeito mora num artefato de auditoria, num gate ou num número publicado | `docs/audit/**`, `scripts/*-gate.mjs`, `scripts/review-ledger-check.mjs` |

O balde **C** é o que a tabela do pedido não tem, e é onde mora quase todo o desacordo.

### 1.3 A medida

| Triagem | Itens | **P** produto | **C** cobertura | **I** instrumento |
|---|---:|---:|---:|---:|
| `AV-L1-TRIAGEM.json` | 4 | 3 | 0 | 1 |
| `TRIAGEM-R1-R3.json` | 7 | 3 | 3 | 1 |
| `TRIAGEM-AV-R6.json` | 5 | 0 | 0 | **5** |
| `TRIAGEM-AV-R7.json` | 5 | **0** | 2 | 3 |
| `TRIAGEM-AV-R8.json` | 10 | 2 | 1 | **7** |
| **Total** | **31** | **8** | **6** | **17** |
| *Recorte do pedido (R1-R3 + R7 + R8)* | *22* | ***5*** | *6* | *11* |

Item a item, com o balde e por quê (fingerprints copiados dos JSON, não digitados de cabeça):

**`AV-L1-TRIAGEM`** — `spec-layergate-divida-paga` **I** (o spec `docs/architecture/lint-layer-gate.md`
declarava 5 supressões `DEBT: prisma` e existiam 3; o código está certo, o documento é que mentia —
já reconciliado pelo PR #154, então os números de linha daquela triagem não valem mais no arquivo de
hoje) · `analyticsdefs-sem-parse-runtime`
**P** · `lead360-dateonly-utc-shift` **P** · `documentscontroller-bypassa-factory` **P**.

**`TRIAGEM-R1-R3`** — 1 `gate-de-createAccount-coberto-mas-nao-afirmado` **C** (a guarda existe em
`PostingService.ts:628`; o que faltava era a asserção) · 2 `qdrant-publicado-sem-chave` **P** (deploy) ·
3 `compose-injeta-next-public-api-url-nome-divergente` **P** (deploy) · 4
`caminho-de-escrita-do-razao-sem-cobertura-de-integracao` **C** · 5 `fronteira-de-dto-quase-nao-testada`
**C** · 6 `revisao-independente-sem-artefato-por-merge` **I** · 7 `tres-imports-sem-declaracao-no-manifesto`
**P**.

**`TRIAGEM-AV-R6`** — os 5, **I**. Evidência de todos: `docs/audit/bancada.html`.

**`TRIAGEM-AV-R7`** — 1 `agent-authored-ratio-sem-denominador-declarado` **I** · 2
`softdelete-etiquetado-em-unidade-que-nao-tem-soft-delete` **I** (o defeito está na linha do
`AV-R2.json`; `ReferentialMappingRepository.ts:13-14` documenta corretamente que **não** há soft-delete) ·
3 `controller-de-contabilidade-sem-alcance-http` **C** · 4 `repositorios-da-subfila-sem-cobertura-alcancavel`
**C** · 5 `fan-in-do-simbolo-concreto-le-um` **I**.

**`TRIAGEM-AV-R8`** — 1, 2, 3, 4, 5, 6, 10 **I** · 7 `retry-apos-conflito-de-versao-reenvia-a-versao-velha`
**P** · 8 `strict-de-dto-neutralizado-pelo-unico-chamador` **P** · 9
`handlers-de-contabilidade-fora-do-alcance-de-qualquer-teste-de-rota` **C**.

**Os dois **P** da AV-R8 foram verificados por mim, no código, não aceitos do relatório:**

- **item 7** — `EntryApprovalsPanel.tsx:273-317`: `runAction` desestrutura `const { entry } = action`
  (linha 275) e envia `expectedVersion: entry.version`. No ramo `code === 'CONFLICT'` (linhas 300-309) o
  componente chama `fetchAll()` **mas não limpa nem atualiza `action`** — o `setAction(null)` só existe
  no caminho de sucesso, linha 291. O modal segue aberto com o `entry` capturado; o clique seguinte
  reenvia a mesma `version` que o servidor já recusou. **Confirmado por leitura.** O texto do próprio
  código (comentário da linha 302, *"refetch, so the retry carries the fresh version"*) afirma o
  contrário do que o código faz — é a armadilha 8 do `CONTINUACAO.md` (prosa que nega a medida)
  reaparecendo dentro do produto.
- **item 8** — `accountingController.ts:347-350`: o `PeriodComparisonSchema.safeParse` recebe um literal
  de duas chaves montado à mão. Como `req.query` nunca chega inteiro ao schema, o `.strict()` do DTO não
  pode rejeitar chave desconhecida nenhuma. **Confirmado por leitura.**

### 1.4 Contra-hipótese (b) — **SOBREVIVE, e com o sinal invertido**

O pedido supõe que a classificação por caminho de evidência é grosseira porque o balde "toca produto"
**esconde** a maioria. Medi o oposto. Este comando classifica cada item pelo local dos `evidence[].path`
do achado de origem:

```
node -e "…"   # indexa docs/audit/*.json por fingerprint e imprime as áreas dos evidence[] de cada item triado
```

Resultado: **11 dos 17 itens de instrumento citam ao menos um arquivo de produto no `evidence[]`.**
Exemplos em que o método por caminho classificaria como "toca produto" um item cujo produto está
correto:

| Item | Cita | Mas o defeito está em |
|---|---|---|
| R7 #2 `softdelete-etiquetado…` | `server/prisma/schema.prisma` | a etiqueta do `AV-R2.json` |
| R7 #5 `fan-in-do-simbolo-concreto…` | `server/src/lib/factory.ts` | o ranqueamento do `AV-R2.json` |
| R8 #4 `mordida-provada-em-superficie…` | `server/src/middleware/auth.ts` | a prova de mordida publicada |
| R8 #10 `campo-de-evidencia…-por-presenca` | `server/prisma/schema.prisma` | o `B18` do `bancada-gate.mjs` |

**Consequência:** a tabela do pedido (10 instrumento / 12 produto nos 22) **subestima** o problema.
Pela pergunta "o app muda?", os 22 são **11 instrumento / 6 cobertura / 5 produto**. Só 5 dos 22 itens
são defeitos que alguém fora deste repositório poderia perceber.

### 1.5 Contra-hipótese (c) — **REFUTADA** pela própria AV-R8

Rendimento de produto por rodada, em ordem cronológica:

| Rodada | Data | Alvo da rodada | **P** / itens |
|---|---|---|---|
| AV-L1 | 2026-07-31 | código de aplicação (spec de camada, controllers, DTOs) | **3 / 4** |
| R1 + R3 | 2026-08-03 | implantação + suíte do razão | **3 / 7** |
| AV-R6 | 2026-08-04 | `docs/audit/bancada.html` | **0 / 5** |
| AV-R7 | 2026-08-06 | suíte de 4 repositórios da subfila | **0 / 5** |
| AV-R8 | 2026-08-07 | os diffs de 6 PRs, através de 6 revisões | **2 / 10** |

Se a causa fosse "os achados fáceis de produto foram colhidos primeiro", a série seria monótona
decrescente. Ela não é: cai a zero e **volta**. O que muda entre R6/R7 e R8 não é o tempo — é **para
onde a rodada aponta**. R6 apontou para o painel da bancada; R7 apontou para testes; R8 apontou para
código de aplicação recentemente alterado, visto por seis revisores.

**E a AV-R8 é a rodada de maior valor da bancada inteira**, o que contradiz frontalmente a leitura de
que a revisão-da-revisão é o sintoma. Ela produziu o único achado de dano 4 com par discriminante
executado (`AV-R8…json`, F6): a mesma mutação de troca de dono do escopo mata 6 testes em `postEntry`
(`accountingController.ts:37`) e **passa por 398 testes de integração** em `deleteAccount`
(`accountingController.ts:194`). Reconferi o alcance por conta própria:

```
grep -cE "^router\.(get|post|put|patch|delete)" server/src/routes/accounting.ts   → 55
grep -cE "^export const .* = async \(req" server/src/controllers/accountingController.ts → 23
```

**Uma quebra de inquilino no razão contábil atravessava a suíte inteira.** Isso não é achado sobre
texto.

### 1.6 Contra-hipótese (a) — sobrevive parcialmente, e o número dela é pequeno

"Achado de instrumento é pré-requisito legítimo do de produto." Há **um** caso em que isso é
demonstrável por datas, e ele é forte:

`TRIAGEM-R1-R3` item 6 (**I**, nenhum defeito de produto nomeado) → `974e8d4f` (2026-08-05) cria
`scripts/review-ledger-check.mjs` + `REVIEW-LEDGER.jsonl` + o passo `ci.yml:225` → a regra `[RL6]`
passa a **exigir um veredito por PR** → `327f724e` (2026-08-07 14:08) escreve as seis revisões
independentes → `606a3c1f` (2026-08-07 16:49) emite a AV-R8 **a partir delas** → dela saem os dois
únicos achados de produto de todas as rodadas posteriores a 2026-08-03.

O achado de produto do item 7 (`retry` com `version` velha) está literalmente na linha do PR #170 no
`REVIEW-LEDGER.jsonl`, escrita pelo revisor independente daquele PR.

Há também um caso menor: `TRIAGEM-AV-R8` item 3 (jest pendura quando o teste reprova) — instrumento
puro, mas nomeia consequência de produto concreta: com `--forceExit` a mutação do PR #171 **mata**
8 de 13 casos, o que derruba a leitura "fail-closed estrutural" e expõe que a sobrevivência era
**alcance**, não desenho.

**Dois de dezessete.** A hipótese (a) é verdadeira e rara. Ela não justifica 17 itens; justifica 2 —
e ela vai custar caro no §5.

### 1.6b O funil descarta achado de produto e carrega achado de instrumento — medido, com denominador

Este é um achado meu, não do repositório, e é o caso mais limpo do mecanismo. **A revisão que mais
rendeu foi a única que usou método diferente** — `REVIEW-PR170.md` rodou `npx next build` de produção
contra uma cópia do `dev.db` populado, em vez de reler texto. Ela emitiu **5 achados**, e **4 são
defeitos de comportamento do produto** (`REVIEW-PR170.md:100-136`):

| Achado | Sev. | Classe | Entrou na fila? |
|---|---|---|---|
| **N1** retry depois do 409 CAS reenvia a versão velha | ALTO, *verificado por execução* | **produto** | **sim** — vira `AV-R8` F7 e `TRIAGEM-AV-R8` item 7 |
| **N1b** mesma classe, 2º sítio (`updateDraft`), sem nem a mensagem | MÉDIO | **produto** | **não** |
| **N2** editar rascunho apaga as etiquetas de dimensão | MÉDIO, *verificado ponta a ponta* | **produto** | **não** |
| **N3** o PR introduz erro de tipo novo e `ci.yml` nunca roda `test:types` | MÉDIO, *verificado por execução* | instrumento/CI | **não** |
| **N4** `PendingApproval` renderiza como token cru, indistinguível de rascunho editável | BAIXO/MÉDIO | **produto** | **não** |

Falsificado nas duas direções, por mim:

```
grep -h '"fingerprint"' docs/audit/TRIAGEM-*.json docs/audit/AV-L1-TRIAGEM.json | grep -iE "dimens|pending|types"
→ (vazio)
```

e na rodada que consolidou as seis revisões, os 10 achados emitidos são F1..F10 (§1.3) — **nenhum é
N1b, N2, N3 ou N4**. (`updateDraft`, `PendingApproval` e `STATUS_LABEL` aparecem 1 vez cada no
`AV-R8…json`, em prosa, nunca como achado.)

**Placar do funil: 1 de 4 defeitos de produto sobreviveu; 7 achados sobre o instrumento entraram na
mesma fila.**

**Reconferido por mim, no código de hoje — o N2 reproduz:** `EntryApprovalsPanel.tsx:24-34`, função
`toDraftValue`. O `entry.postings.map` monta cada linha com **exatamente três chaves** (`accountCode`,
`debitCents`, `creditCents`); não há `dimensions`. Editar um rascunho etiquetado descarta as etiquetas,
hoje, no `tip` de `main`, num módulo que custou dois PRs e um ADR ratificado fork-a-fork.

Isso não é viés de quem mede — é o funil selecionando por **facilidade de formalizar**, e a causa está
localizada no §2.1b: um defeito de instrumento cabe num falsificador estático de uma linha; "criar
rascunho com dimensão, editar, ver a etiqueta sumir" não cabe, nem em falsificador estático nem em
120 segundos.

### 1.7 A medida que ninguém tinha feito: quantas linhas de aplicação a bancada mudou

Colhi todos os `fix_commit` / `status_evidence.commit` das 5 triagens (12 commits) e medi cada um por
balde de caminho:

| Commit | Item | Teste | Deploy/CI | Gate | Artefato | **App** |
|---|---|---:|---:|---:|---:|---:|
| `7a7ec5d1` | R1-R3 #1 | +10 | | | | **0** |
| `29b8811f` | R1-R3 #2 | +56 | +11 | | | **0** |
| `90f71a86` | R1-R3 #3 | +62 | +21/−2 | | | **0** |
| `d11b4716` | R1-R3 #4 | +227 | | | | **0** |
| `a4ffb8e4` | R1-R3 #5 | +676 | | | | **0** |
| `974e8d4f` | R1-R3 #6 | | +22 | +173 | +24 | **0** |
| `8d124293` | R7 #3 | +393 | | | | **0** |
| `b1464747` `0a24d3f9` `928933bc` | R7 #4 | +1009 | | | | **0** |
| `eb23cfff` | R8 #9 | +529 | | | | **0** |
| `396a389` | AV-L1 #2 | +154 | | | | **+76 / −2** |

O único commit da lista que tocou código de aplicação é `396a389` (2026-07-31 19:20) — **anterior a
`643d2eb`** (`git merge-base --is-ancestor 396a389 643d2eb` = sim), da rodada AV-L1, que antecede as
cinco etapas.

**Depois que o ciclo de cinco etapas começou, ele emitiu 11 correções e mudou 0 linha de código de
aplicação.**

O contraste é o §5.2 do master map. `69ab527` (PR #151, 2026-07-23) — **uma** sessão de navegador
contra o `dev.db` real, build de produção:

| | App | Teste | i18n |
|---|---:|---:|---:|
| `69ab527` | **3 arquivos, +28 / −1** | +114 | +2 |

Esses 28 linhas fecharam BUG-1 (13 `eventTypes` fora da allowlist → 500 + rollback, deixando
INCR-COUNTERPARTY, INCR-DIM-COMPLETENESS e a conciliação bancária inteira **inutilizáveis em runtime**)
e BUG-2 (seção de CMV descartada no DRE). Os dois passaram por revisão independente e 1135 testes
verdes. `ACCOUNTING-MASTER-MAP.md:334` registra o porquê: os testes de service **mockam** o
`AuditService`, então a allowlist nunca é exercida no caminho real.

### 1.8 O que a leitura do dono acerta e o que ela erra

| Afirmação | Veredito |
|---|---|
| "a bancada virou-se para dentro" | **Confirmada, e mais forte do que a tabela dizia** — 17 de 31, não 10 de 22 |
| "a auto-auditoria não tem piso" | **Confirmada, e §2.2 dá o mecanismo** — o piso recua porque o instrumento cresce |
| "o processo de 5 etapas falhou" | **Parcialmente falsa.** Ele fecha, com barreira provada por mutação, exatamente o que se propõe a fechar. O que falhou foi o **alvo**, não o ciclo |
| "AV-R8 é a prova do problema" | **Falsa.** A AV-R8 é a rodada de maior rendimento de produto da bancada; 7/10 é o custo dela, não o produto dela |
| "acrescentar camada é o modo de falha" | **Confirmada** — §2.2 mede a camada crescendo 3,8× em 6 dias |
| "quem gera, executa e corrige são o mesmo ator" | **Confirmada e quantificada** — `agent_authored_ratio` = **0,954** (432/453 commits sem merges). Mas o §2.1b mostra que isso **não é a causa**: mesmo com atores genuinamente distintos, o `B5`/`B6` continuaria excluindo o defeito de runtime |

---

## 2. O mecanismo, nomeado

### 2.1 Duas regras escritas, boas isoladamente, que compõem um laço sem terminação

- `docs/operating-manual/REASONING-TRAITS.md:47-52` — **T3**: *"o primeiro alvo do gate é o artefato
  que o define"*.
- `docs/operating-manual/PLAYBOOK.md:126-127` — *"Todo bug que escapar: pergunte 'qual gate teria
  pego?' e transforme em patch de gate/skill"*.

T3 aponta o instrumento para si; o PLAYBOOK converte todo escape em superfície nova de instrumento.
**A saída de cada rodada é a entrada da próxima.** Nenhuma das duas tem condição de parada, e nenhuma
das duas pergunta se existe algo fora do repositório que poderia dizer "errado".

Isto não é um bug do agente: `scripts/bancada-gate.mjs:4-7` declara a origem do gate em uma frase que
já continha o diagnóstico — *"três rodadas produziram 7 achados sobre o código e **7 defeitos sobre os
próprios instrumentos**"*. O instrumento nasceu meio voltado para dentro; o que mudou depois foi que os
defeitos de instrumento passaram a **entrar na fila** em vez de serem corrigidos de passagem.

### 2.1b **A causa raiz: o gate que garante rigor é o filtro que exclui o produto**

Duas linhas do `scripts/bancada-gate.mjs`, lidas no arquivo:

```js
// linha 306  (B5)
if (!fd.falsifier_static && !fd.static_gap) err('B5', `${id}: sem falsifier_static e sem static_gap`);

// linha 316  (B6)
if (fd.demonstration && fd.demonstration.seconds > 120) err('B6', `${id}: demonstration declara ${fd.demonstration.seconds}s (teto 120)`);
```

Leia as duas juntas e o funil aparece inteiro:

1. **Todo achado precisa de falsificador ESTÁTICO** (ou declarar a lacuna). O campo
   `falsifier_dynamic` existe no schema — a AV-R8 F6 o usa — mas **nenhuma checagem o exige nem o
   aceita no lugar do estático**.
2. **Toda demonstração tem teto de 120 segundos.** Subir o build de produção, semear uma cópia do
   `dev.db`, autenticar e clicar três vezes não cabe em 120 s.

**Consequência estrutural:** um defeito que só se manifesta com o app de pé — a classe do BUG-1, a
classe da perda de dimensões do §1.6b, a classe inteira do §5.2 — **não consegue nascer como achado
na forma que o gate premia.** Um `grep` de uma linha sobre `docs/audit/**` sempre consegue.

Isto não é hipótese: o repositório já registra **duas** vítimas do teto.

- `TRIAGEM-R1-R3.json:89`, item 2 (Qdrant publicado sem chave): *"**Dano pretendido 4, rebaixado** no
  relatório por falta de demonstração executável em 120s (AV-00 §6b). O rebaixamento é de
  **PROCEDIMENTO** — não mede que o dano seja menor."* O próprio texto sabe que o rebaixamento é
  artefato do teto, e o teto venceu assim mesmo.
- §1.6b: a perda de dimensões nunca virou achado.

**Este é o ponto onde o desenho conserta com uma remoção**, e é o fork F6. Não é preciso acrescentar
nada: basta **apagar o teto de 120 s** para achado cuja evidência é o app em execução, e **aceitar
`falsifier_dynamic` onde hoje só o estático conta**. Duas subtrações no gate mudam qual classe de
defeito consegue entrar na fila.

### 2.2 A superfície auditada é função da auditoria — medido

| Commit | Data | `bancada-gate.mjs` | Checagens `err('Bxx')` |
|---|---|---:|---:|
| `9ca37d62` | 2026-08-02 | 217 linhas | 9 |
| `bfc78d7b` | 2026-08-04 | 726 | 16 |
| `e4ea83a0` | 2026-08-07 | 818 | 17 |
| `HEAD` | 2026-08-08 | 822 | 17 |

**3,8× de tamanho e 1,9× de checagens em 6 dias, sobre um app cujo código não mudou uma linha por
causa disso.** `docs/audit/` está hoje em **13.466 linhas / 147.750 palavras** — um livro, para 8
achados de produto em toda a história das 5 triagens.

Este é o argumento contra "converge devagar": um processo converge quando o alvo é fixo. Aqui **o
alvo cresce com o esforço**. A AV-R6 é a demonstração literal — ela auditou `bancada.html`, um arquivo
que só existe porque a bancada existe, e achou 5 defeitos, um deles de dano 4.

### 2.3 O veredito de revisão tem entropia zero — medido, agora

```
node scripts/review-ledger-check.mjs
→ OK: 7 PR(s) com veredito declarado
→ Distribuição: revisado_com_ressalva=7
→ Cobertura: 7 declarado(s) / 228 merge(s) na história.
```

**7 de 7.** O revisor independente do PR #174 já tinha derivado a causa, e ela é estrutural, não
estatística (`REVIEW-LEDGER.jsonl:32`): sob o encargo *"proibido de corrigir"* (bloco 9 do AV-00),
`revisado_reprovado_e_corrigido` é inalcançável; `sem_revisao_independente` é proibido pelo `[RL5]`
quando há revisor; `revisado_pass` exigiria zero achado aberto — e as seis revisões somam 35. **Resta
um valor.** Um campo cuja distribuição é 100% num valor carrega 0 bit de informação: o razão prova que
alguém escreveu um arquivo, não que a revisão discriminou nada.

Some-se a isto o que o `MODEL-TUNING.md:32-35` já registra sobre este modelo — instrução conservadora
é seguida **literalmente** e move o recall medido. O `PLAYBOOK.md:86-90` instrui o revisor a *"reportar
TODO achado"*, e o revisor do PR #173 nomeia o efeito em si mesmo (`REVIEW-PR173.md:178`): *"Fui
instruído a refutar, e um revisor instruído a refutar acha o que procura."* Revisor instruído a atacar,
proibido de consertar, com vocabulário de um valor só: **o resultado 7/7 estava determinado antes da
primeira revisão.**

> **Nota de auto-aplicação, escrita depois de rodar o gate com a entrada deste próprio PR:** a
> distribuição deixou de ser degenerada — `revisado_com_ressalva=7 · sem_revisao_independente=1`.
> **Isso não refuta o argumento; ilustra-o.** O único jeito de o campo sair de 100% foi uma linha que
> declara **ausência** de revisão — o ramo que o `[RL5]` proíbe justamente quando existe revisor. Ou
> seja: entre os PRs *revisados*, a entropia continua zero, e o segundo valor só existe porque alguém
> não foi revisado. Um campo que só discrimina quando o trabalho não é feito não é um campo de
> veredito.

E o §3.6 acrescenta a camada que este repositório não tinha como medir sozinho: a auto-preferência de
juiz-LLM é dirigida por **familiaridade**, não por identidade — trocar de worktree não troca o viés — e
o valor de um laço de crítica está quase todo no **bit de aceitar/rejeitar**, não no texto. Um razão com
2.273 linhas de crítica e um bit constante é a pior combinação das duas medidas.

### 2.4 O caso `REVIEW-PR173` — o que faz a barreira do revisor não ter a mesma propriedade

A pergunta do pedido é a certa e a resposta é: **nada faz.** O `B18` codificou as três fugas que o
autor imaginou (`REVIEW-PR173.md:56,58,59` — C2, C3b, J1 mordem) e não codificou a quarta
(`REVIEW-PR173.md:69` — F1: apagar a etiqueta **e** o registro sai exit 0). O revisor então escreveu 9
achados novos (N1–N9), cada um com falsificador — e **nenhum deles tem barreira**, porque achado não
triado não se conserta. O revisor produziu exatamente a mesma classe de artefato que criticou: uma
lista de fugas imaginadas por um autor.

A propriedade não se resolve subindo de nível porque ela é a definição de barreira escrita por quem
imagina a falha. Só um **oráculo** — algo que diz "errado" sem ninguém precisar imaginar como —
quebra a recursão. `scripts/review-ledger-check.mjs:11-18` diz isso sobre si mesmo, com todas as
letras: *"ele não prova que uma revisão aconteceu. Ninguém pode provar isso lendo o repositório."*

### 2.5 A ironia central: este repositório já resolveu isto, no outro domínio

`ADR-INCR-APPROVAL-maker-checker.md:4` e `:118-147`. A torre nasceu com **F3=(a) SoD hard sempre**.
Numa re-ratificação fork-a-fork, o dono foi apresentado à decisão-mãe: com `ownerUserId === actorUserId`
sempre (`AccountingScope.ts:31-44`), um maker-checker *hard* é **inutilizável por um único operador** —
os `PendingApproval` ficariam presos. A decisão ratificada foi:

> `AccountingPolicy.enforcesSegregationOfDuties = ownerUserId !== actorUserId` (**hoje sempre `false`**)

com a ressalva explícita de `:145-147`: **"A garantia de imutabilidade (`contentHash`+`version`) é
independente e permanece sempre ativa."**

Ou seja: quando a segregação preventiva era impossível, o projeto **desligou o controle preventivo e
manteve o detectivo**. É a resposta madura, e está commitada.

O pipeline de agentes está na mesma situação, medida: o `agent_authored_ratio` das rodadas é **0,954**
(432/453 commits sem merges) — `AV-R8…json`, campo `agent_authored_ratio`. Um único ator, sob duas
identidades de worktree. E aqui o projeto fez o **oposto** do que ratificou na contabilidade: manteve
a SoD preventiva ("revisor independente = agente separado em worktree", `AV-00 §9.4`), que produz
7/7 do mesmo veredito, e **não** instalou o equivalente do controle detectivo.

A tradução da Emenda F3 para o pipeline é direta e está no §4, fork F5.

### 2.6 Por que os seis mecanismos existentes não seguram — julgados um a um

| Mecanismo | O que ele de fato garante | Por que não fecha |
|---|---|---|
| `_OPERATING-GATES.md` OPS-001..005 | forma do relatório (5 perguntas binárias) | o próprio mapa regra→enforcement (`:170-180`) declara que a metade auto-reportada **só fecha com review independente** — e o review tem entropia zero (§2.3). O gate aponta para o que está quebrado |
| `REASONING-TRAITS.md` T1–T8 | política de raciocínio | **T3 é parte da causa** (§2.1), não da cura |
| `MODEL-TUNING.md` | ajuste por modelo | correto e irrelevante aqui: o problema não é o modelo prescrever demais ou de menos, é o alvo |
| `scripts/bancada-gate.mjs` (18 checagens) | estrutura resolvível dos artefatos | lê `docs/audit/**`. Por construção, **nunca** pode reprovar por causa do app. `REVIEW-PR173.md:113` mede o buraco recursivo: `grep status scripts/bancada-gate.mjs` = 0 |
| `scripts/review-ledger-check.mjs` (7 regras) | que existe uma declaração por PR, única e internamente consistente | as 7 regras são sintáticas: `commit` é regex de hexa (`:90`), `artifact` é `existsSync` (`:109`), reviewer≠implementer é igualdade de string (`:104`). O adendo do `REVIEW-PR167.md` mediu que uma linha inteiramente **fabricada** passa |
| `CONTINUACAO.md` (15 armadilhas) | memória de erros de instrumentação, boa e real | 15 armadilhas, e **13 delas são sobre como medir**, não sobre o produto. É o inventário do instrumento |

Todos verdes. Todos honestos sobre os próprios limites — este repositório é incomumente honesto. E o
problema persiste porque **os seis medem o texto**, e a única coisa que mede o app é o app rodando.
A memória do projeto já tem o nome disso: `gate-eval-prova-o-texto-nao-o-app`.

### 2.7 O nome do mecanismo

**Deriva por oráculo disponível.** O agente trabalha onde o sinal de "errado" chega mais rápido e sem
depender de ninguém. No instrumento, o sinal é instantâneo, auto-gerado e infinito (T3 + PLAYBOOK §6
garantem que sempre há mais). No produto, o sinal exige PVA, NF-e real, contador ou usuário — e **nenhum
dos quatro está disponível**. A fila não escolheu errado; ela escolheu a única coisa executável.

A prova está na fila que **não** anda (`ACCOUNTING-MASTER-MAP.md:216-226`, Bloco A):

| # | Item | Gate | Estado |
|---|---|---|---|
| 3 | Sign-off humano no PVA (ECD, Apuração, ECF) | oráculo externo | **aberto** — ECD mergeado `2026-07-10` (30 dias), ECF `2026-07-12` (28 dias), ambos com "review independente PASS" |
| 4 | Sign-offs de browser pendentes | humano | **aberto** (de-riscado por 1 varredura, §5.2) |
| 5 | Chromium smoke-launch-gate no deploy | deploy real | **aberto** |
| 6 | Import do arquivo oficial RFB | contador | **aberto** |

**4 de 4 itens com oráculo: abertos.** Todos os itens do Bloco A e B cujo gate é interno (1, 2, 7, 8,
9, B1, B2, B3, 12): **mergeados**. A hipótese do pedido — "a fila que não anda é justamente a que tem
oráculo" — está confirmada por contagem completa, não por amostra.

---

## 3. O que a literatura acrescenta — rédea curta

Regra aplicada: **nenhuma citação genérica.** Cada linha abaixo ou aterra num fato medido no §1/§2,
ou não entrou. O que foi lido e **descartado** está declarado no fim.

### 3.1 O problema do oráculo dá o nome exato do que falta aqui

Barr, Harman, McMinn, Shahbaz, Yoo, *"The Oracle Problem in Software Testing: A Survey"*, IEEE TSE
41(5):507–525, 2015 ([PDF](https://eecs481.org/readings/testoracles.pdf)) classifica oráculos em
**especificado**, **derivado**, **implícito** e **ausente**, sobre um corpus de 694 artigos. O
**implícito** é definido como *"the detection of 'obvious' faults such as a program crash"* e
*"requires neither domain knowledge nor a formal specification"* — a classe **mais barata da
taxonomia inteira**.

**Aterramento:** o BUG-1 do `ACCOUNTING-MASTER-MAP.md:334` é **500 + rollback** — crash. Está na classe
mais barata de oráculo que existe, e a bancada não o alcançou por uma razão só: **ela nunca executou o
sistema.** Cinco rodadas, 31 itens, nenhuma execução do app. O oráculo implícito custa "subir o app e
clicar"; foi exatamente isso que `69ab527` fez, e as 28 linhas do §1.7 são o resultado.

A tese de abertura do survey é a assimetria: quatro décadas de avanço em **gerar entradas** e
*"none of these advances address the issue of checking generated inputs with respect to expected
behaviours"* — o oráculo é *"a current bottleneck"*. **Aterramento:** é literalmente o §2.7 deste
documento. A bancada é excelente em gerar entradas (falsificadores, mutações, recortes) e não tem
oráculo; então ela gera entradas sobre a única coisa cujo oráculo ela mesma é.

### 3.2 Mutação: forte como presença, inflada como placar, cega para omissão

Três resultados, e os três mudam a leitura de artefatos concretos deste repositório.

**(i) Omissão.** Just, Jalali, Inozemtseva, Ernst, Holmes, Fraser, *"Are mutants a valid substitute for
real faults in software testing?"*, FSE 2014 ([PDF](https://homes.cs.washington.edu/~rjust/publ/mutants_real_faults_fse_2014.pdf)) —
357 faltas reais, 5 projetos Java. **73% acoplam a mutantes; 17% (63/357) não acoplam a mutante
nenhum**, e a distribuição do porquê é o ponto: **37 são modificação de algoritmo** e **7 são código
que precisa ser deletado** — *"Faults caused by extra code that has to be deleted are not coupled to
mutants."* Mutação só perturba o código que **existe**.

**Aterramento, e é o mais duro deste documento:** o BUG-1 é uma falta de **omissão pura** — 13
`eventTypes` **ausentes** da `PAYLOAD_ALLOWLIST` (`server/src/features/accounting/audit/auditCanonical.ts:12`).
Nenhum operador de mutação gera "falta uma entrada nesta lista". **A técnica de prova que a bancada usa
em todas as suas barreiras é estruturalmente cega à classe exata do pior bug que este projeto já teve.**
E a correção do PR #151 foi ela mesma a resposta certa: um **teste de classe**
(`auditAllowlistCoverage.test.ts`) que varre a fonte e cruza emitido-contra-listado — isto é um oráculo
**derivado**, não uma mutação.

**(ii) O placar é inflado por construção.** Papadakis, Kintis, Zhang, Jia, Le Traon, Harman,
*"Mutation Testing Advances: An Analysis and Survey"*, Advances in Computers 112, 2019
([PDF](https://mutationtesting.uni.lu/survey.pdf)): mutantes subsumidos *"do not contribute to the test
assessment process… **the metric is inflated and becomes hard to interpret**"*. As frações medidas:
**disjuntos ≈ 9%**; **mínimos = 1,2%** (Ammann, Delamaro, Offutt, ICST 2014,
[PDF](https://www.albany.edu/faculty/offutt/research/papers/MiniMutant-ICST2014.pdf)) a **4%** (Kurtz
et al.).

**Aterramento:** o item 6 da `TRIAGEM-AV-R8` (`placar-de-mutacao-publicado-omite-uma-unidade-inteira`,
dano 2) gastou uma entrada de fila discutindo se o placar é **13/9 ou 16/12**. Pela literatura, os dois
números são igualmente não-interpretáveis: um placar sobre todos os mutantes mede sobretudo quantas
**duplicatas** da mesma obrigação de teste foram mortas. **Este item de instrumento auditou um número
que não carrega a informação que ele parece carregar** — e isso é um argumento *a favor* da regra de
parada do §5, não contra.

**(iii) O que sobrevive: mutação como sonda de presença, não como métrica.** Papadakis, Shin, Yoo, Bae,
*"Are Mutation Scores Correlated with Real Fault Detection?"*, ICSE 2018
([PDF](https://coinse.github.io/publications/pdfs/Papadakis2018hi.pdf)) — 231 faltas do Defects4J + 68
do CoREBench. A correlação entre `mutation_score` e detecção de falta real é **0,35–0,75** sem controle
de tamanho de suíte e **cai para 0,05–0,20 quando o tamanho é controlado**. Conclusão dos autores:
*"a major part of the association… is simply an effect of size."*

**(iii-b) O golpe mais duro, achado depois e acrescentado aqui contra o meu próprio §3.2.** *Bigger
Isn't Always Better* ([arXiv:2606.15689](https://arxiv.org/pdf/2606.15689)) mede o mesmo revisor sobre
duas populações de defeito: **F1 = 0,847 em bugs injetados por mutação** contra **F1 = 0,066 em PRs
reais** — **92% de degradação**. E colapsa com o tamanho do diff: 0,657 em diffs de <10 linhas,
**0,043** acima de 150.

Isto não é sobre revisor de IA — é sobre **como o defeito foi construído**. Mutante injetado é uma
população de defeito muito mais fácil do que a que existe no mundo, e converge com Just et al. (17%
das faltas reais não acoplam a mutante nenhum) e com Papadakis (a correlação some quando o tamanho é
controlado). **Consequência para esta bancada, sem desconto:** as provas de mordida por mutação
mostram que *existe alguém observando aquela linha* — e **não** mostram que a suíte pegaria o defeito
real correspondente. O `mutation_score` e a prova de mordida medem a população fácil.

**Aterramento, com os dois lados:** (1) **contra a bancada** — os placares publicados (R3 = 2/7, R5 =
4/7, R7 = 0/7, conferidos por mim contando a coluna `reagiu` de cada `centerpiece`) não sustentam
conclusão sobre "força da suíte" enquanto o tamanho não for controlado, e nenhum dos três relatórios o
controla. (2) **a favor da bancada, e é o uso correto** — a bancada quase sempre usa mutação como
**par discriminante de 1 mutante** (mata este caso, e o controle segue verde), não como placar. Esse
uso é imune à crítica de Papadakis, porque não é uma correlação sobre um score: é uma prova de que
existe *pelo menos um* teste que observa aquela linha. O `AV-R8` F6 é o exemplo perfeito — mutação
idêntica, mata em `postEntry`, sobrevive em `deleteAccount`. **A técnica está certa; o placar é que é
enfeite.**

### 3.3 N-version: o revisor independente já foi medido, em condições melhores que as daqui

Knight & Leveson, *"An Experimental Evaluation of the Assumption of Independence in Multiversion
Programming"*, IEEE TSE SE-12(1):96–109, 1986 ([PDF](https://sunnyday.mit.edu/papers/nver-tse.pdf)):
**27 versões** independentes da mesma especificação, escritas em **duas universidades diferentes** (UVA
e UCI), sem comunicação, cada uma aprovada em 200 testes antes de entrar. Um milhão de testes
aleatórios contra um programa-ouro. Resultado: **K = 1.255 falhas coincidentes contra o predito pelo
modelo de independência, z = 100,51 — hipótese de independência rejeitada a 99%.** E o achado que
elimina a explicação fácil: *"In the preliminary analysis of common faults, all were found to involve
versions from both schools."* Houve inputs em que **8 das 27 versões falharam juntas**.

**Aterramento:** as seis revisões independentes deste repositório são **o mesmo modelo, o mesmo prompt
de revisão (`PLAYBOOK.md:86-90`), o mesmo repositório, a mesma sessão-mãe** — isto é, drasticamente
**menos** diverso do que estudantes de duas universidades. Se independência de pessoal já não compra
independência de falha naquele cenário, ela não compra aqui. **O 7/7 do §2.3 não é um acidente de
vocabulário; o vocabulário só tornou visível a correlação que o desenho garantia.**

Littlewood & Miller, *"Conceptual Modeling of Coincident Failures in Multiversion Software"*, IEEE TSE
15(12):1596–1614, 1989 ([DOI](https://dl.acm.org/doi/10.1109/32.58771)) dá a saída teórica —
**diversidade de *método*, não de pessoal**, é o que reduz correlação, e com metodologias diversas é
teoricamente possível falhar *melhor* que independentemente. Empiricamente na mesma direção: van der
Meulen & Revilla, IEEE TSE 34(6), 2008 ([DOI](https://dl.acm.org/doi/abs/10.1109/TSE.2008.70)), sobre
**36.123 programas** da mesma especificação, mede que as falhas se agrupam por uma *função de
dificuldade* compartilhada e que **diversidade de linguagem aumenta** a eficácia da redundância.
*(Estes dois foram obtidos em nível de resumo, não de texto integral — grau declarado.)*

**Aterramento, e é a justificativa técnica do F1(b) e do F4:** a revisão que rendeu mais neste
repositório é a do PR #170, e o `REVIEW-LEDGER.jsonl:26` diz por quê — ela usou **método diferente**
(`npx next build` de produção contra cópia do `dev.db` populado), não leitura diferente. Foi ela que
achou a cobertura zero do `approve` e o retry com `version` velha. **Mais um revisor lendo o mesmo diff
é a redundância que Knight & Leveson mediram e que não paga; um método diferente é a que Littlewood &
Miller dizem que paga — e "método diferente" aqui tem nome próprio: rodar o app.**

### 3.4 Revisão de código: o que ela acha, o que ela não acha, e onde este repo está do lado certo

**(i) A classe que a revisão comprovadamente não vê — e a bancada viu.** Mäntylä & Lassenius,
*"What Types of Defects Are Really Discovered in Code Reviews?"*, IEEE TSE 35(3), 2009
([preprint](https://aaltodoc.aalto.fi/server/api/core/bitstreams/cab054e8-0c06-47ab-8754-54bb09a0a6d3/content)):
**759 defeitos em 32 revisões**, e *"75 percent of defects found during the review do not affect the
visible functionality"*. O dado que importa aqui não é os 75% — é o **zero**: a taxonomia deles tem
sete grupos funcionais, e sobre dois deles escrevem *"We were not able to identify **any** timing or
support defects in the reviews"* — `timing` = concorrência, `support` = **bibliotecas e suas
configurações**. Zero em 759.

**Aterramento, e é a favor da bancada:** os itens 2 e 3 da `TRIAGEM-R1-R3` são exatamente essa classe —
dois defeitos de **configuração de implantação**, num arquivo que o `barrier_note` do item 2 mediu
como **invisível para todo o repositório**: *"`grep -rln docker-compose` em todo .ts/.mjs/.js/.yml
fora de node_modules devolve VAZIO — nenhum teste, script ou job de CI lê o arquivo de implantação"*.
Nenhuma revisão os acharia; uma varredura estática os achou. **A bancada é boa justamente onde a
revisão é medida como cega.**

Escala do problema fora do diff: Yin et al., SOSP 2011
([PDF](https://www.sigops.org/s/conferences/sosp/2011/current/2011-Cascais/printable/12-yin.pdf)) —
546 misconfigurações reais, e **27% dos casos de cliente** de um sistema comercial de armazenamento
eram de configuração.

**(ii) A outra classe que a revisão não vê — e a mutação viu.** Paul, Turzo & Bosu, ICSE 2021
([PDF](https://arxiv.org/pdf/2102.06909)) — estudo caso-controle no Chromium OS, **516 revisões que
pegaram um defeito de segurança contra 374 que deixaram passar**, χ²=491,69, p<0,001. As taxas de
escape por classe: **CWE-284 *improper access control* ≈ 88% escapa**; CWE-20 *improper input
validation* ≈ 88%; CWE-345 **100%**. Em contraste, CWE-676 *use of dangerous function* — um padrão
léxico, sem contexto — **zero escapa**.

**Aterramento:** o `AV-R8` F6 é **improper access control** em estado puro: troca do dono do escopo em
`deleteAccount`. Ele escapou de **seis revisões independentes** e foi pego por um **par discriminante
de mutação**. Isso é a literatura prevendo o resultado exato deste repositório: revisão pega o que é
localmente visível no diff, e não pega o que exige saber o que **deveria** estar lá. **Segundo ponto a
favor de manter a bancada** — e é o argumento decisivo contra o F1(d).

**(iii) A proporção que o repositório reproduz sem saber.** Czerwonka, Greiler & Tilford, ICSE-SEIP
2015 (Microsoft) ([PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2015/05/PID3556473.pdf)):
*"**Only about 15% of comments provided by reviewers indicate a possible defect**… feedback related to
the long-term code maintainability… **at least 50% of all**."* Beller et al., MSR 2014
([PDF](http://sback.it/publications/msr2014.pdf)), sobre **>1.400 mudanças**: razão
evolvability : funcional de **81:19, 75:25 e 69:31** em três corpora, reproduzindo os 77:23 de
Mäntylä.

**Aterramento:** as seis revisões somam **35 achados** (`REVIEW-LEDGER.jsonl:32`) e, pela minha
contagem do §1.6b, os de comportamento de produto são punhado — a ordem de grandeza bate com os 15%.
**O rendimento das revisões deste repositório não é anômalo; é exatamente o que a literatura prevê.**
A leitura correta não é "as revisões falharam", é "revisão nunca foi a ferramenta de achar bug".

**(iv) O trade que este repositório nunca precificou.** Czerwonka et al. medem também a familiaridade:
*"Without prior exposure to the part of code base being reviewed, on average **only 33% of any
reviewer's comments are deemed useful** by the author"*; na **terceira** revisão da mesma área sobe
para **~67%**. Bacchelli & Bird, ICSE 2013 ([PDF](https://sback.it/publications/icse2013.pdf)):
**798 de 873 programadores (91%)** dizem que arquivo desconhecido leva mais tempo, e **716 (82%)** que
revisor familiarizado dá retorno diferente — *"more likely to find subtle defects"*.

**Aterramento, e é um custo escondido do próprio protocolo:** o `PLAYBOOK.md:66` e `:86-87` exigem
**"contexto fresco"** do revisor, por independência. A literatura mede que contexto fresco é
precisamente a condição que **derruba a utilidade a um terço**. O repositório optou por independência
e pagou em utilidade, e **em nenhum lugar esse trade está escrito**. Não é erro — é uma escolha não
declarada, e ela pertence ao F5.

**(v) O contrapeso honesto, contra o meu próprio argumento.** Se alguém quiser usar "cobertura de
revisão prediz menos defeito" para defender o status quo, o resultado não sobrevive à replicação:
McIntosh et al. (MSR 2014 / EMSE 2016) acharam sinal em *participação*, mas Krutauz, Dey, Rigby &
Mockus, EMSE 2020 ([PDF](https://arxiv.org/pdf/2005.09217)) replicaram e concluíram que
*"**models without code review predictors had as good or better fit than those with review
predictors**"*. **Não existe base empírica sólida para afirmar que mais revisão produz menos defeito
pós-lançamento.** Isso enfraquece o F5(b) e fortalece o F5(a).

### 3.5 Segregação de funções quando o quadro é pequeno demais — a resposta normativa, literal

A literatura contábil não hesita, e a frase é quase palavra por palavra a Emenda F3 do ADR.

**GAO, *Standards for Internal Control in the Federal Government* ("Green Book"), Princípio 10**
([GAO-24-106889](https://www.gao.gov/assets/gao-24-106889.pdf)):

> **¶10.21** — *"**If segregation of duties is not practical within a business process because of
> limited personnel or other factors, management designs alternative control activities to mitigate
> the risk** of fraud, waste, or abuse in the business process."*
>
> **¶OV4.15** — *"management selects an appropriate **mix of preventive and detective control
> activities**… prioritizing preventive control activities where appropriate."*

**Aterramento:** `ADR-INCR-APPROVAL-maker-checker.md:128-147` faz **exatamente isto** — SoD desligada
por impraticabilidade (`owner === actor`), controle alternativo (`contentHash` + `version` + trilha)
mantido sempre ativo. **A decisão contábil deste projeto está alinhada com a norma; a decisão de
processo não está**, porque o pipeline mantém o controle preventivo impraticável e **não** nomeou
nenhum controle alternativo.

**Quais são os controles alternativos, com nome.** AICPA, *"Examples of Controls in Small Entities"*
([PDF](https://assets.ctfassets.net/rb9cdnjh59cm/7E9egHtBYsfTZAkixWhQrI/647abc2159f56c765b90c877063b94ba/eaq-examples-of-controls-in-small-entities.pdf))
— *(nota do próprio documento: é "other auditing publication", **sem status normativo**; cito como
catálogo ilustrativo, não como norma)*. Os controles nomeados, traduzidos para este pipeline:

| Controle do catálogo AICPA (verbatim) | Análogo no pipeline | Existe hoje? |
|---|---|---|
| *"The owner receives the bank statement at their **personal address**… reviews the activity monthly"* | o dono lê **o diff e a saída do gate**, não o resumo que o agente escreveu sobre eles | **não** — o `REVIEW-LEDGER` é resumo escrito pelo próprio agente |
| *"The owner reviews a **budget vs. actual** report each month and investigates any unexpected results"* | dono revisa a **lista de exceções** (achados abertos, portões vencidos), não o corpo inteiro | **não** — não existe relatório de exceção; existem 147.750 palavras |
| *"The company uses **pre-numbered** checks"* | trilha `git` append-only + hash-chain do `AuditEvent` | **sim, e é bom** |
| *"The financial statements are **prepared by the CPA firm** and reviewed by the owner"* | **o oráculo externo** — PVA, contador | **não** — é o F4 |
| *"The bookkeeper is required to take an **annual vacation**"* | (sem análogo sensato para agente) | n/a |
| **Regra de escalada, verbatim:** *"If an auditor determines that none of these controls are present… the auditor should consider **if it is feasible to plan an audit that will reduce audit risk to an acceptably low level**"* | **se nenhum controle compensatório existe, a saída correta é reduzir o escopo da garantia — não produzir mais auditoria** | é o **F1(b)** |

**A frase mais dura vem do IIA**, *International Standards for the Professional Practice of Internal
Auditing*, Atributos 1100–1130
([fonte](https://www.theiia.org/en/standards/what-are-the-standards/mandatory-guidance/standards/attribute-standards/)):

> **1130.A1** — *"Internal auditors must refrain from assessing specific operations for which they were
> previously responsible. **Objectivity is presumed to be impaired** if an internal auditor provides
> assurance services for an activity for which the internal auditor had responsibility within the
> previous year."*
>
> **1130.A2** — *"Assurance engagements for functions over which the chief audit executive has
> responsibility **must be overseen by a party outside the internal audit activity**."*
>
> **1130** — *"If independence or objectivity is impaired in fact or appearance, the details of the
> impairment **must be disclosed** to appropriate parties."*

**Aterramento, nos dois sentidos:**
- **O repositório já cumpre o 1130.** Cada linha do `REVIEW-LEDGER.jsonl` declara a própria
  impairment; o `own_bias_named` é exigido pelo `B16`; o `REVIEW-PR169` declara *"cinco decisões em
  série sem nenhum ponto de corte externo"*. **Isso é divulgação de impairment feita direito, e é raro.**
- **O repositório não cumpre o 1130.A2**, e não tem como cumprir sozinho: *"a party outside"* não pode
  ser outra worktree do mesmo modelo. **A única parte fora, aqui, é o dono e os quatro oráculos.**
  O 1130.A1 fecha o argumento: a impairment é **presumida**, não discutida caso a caso — que é
  precisamente o que o veredito 7/7 do §2.3 mostra na prática.

### 3.6 Auto-avaliação de LLM: o efeito é medido, e o remédio deste repositório não é o remédio

**(i) Auto-correção sem sinal externo piora.** Huang et al., *"Large Language Models Cannot Self-Correct
Reasoning Yet"*, ICLR 2024 ([PDF](https://arxiv.org/pdf/2310.01798)). Auto-correção **intrínseca** (sem
feedback externo), duas rodadas:

| | GSM8K | CommonSenseQA | HotpotQA |
|---|---|---|---|
| GPT-4 padrão | **95,5** | **82,0** | **49,0** |
| GPT-4 auto-corrigido (r2, 5 chamadas) | **89,0** | 80,0 | **43,0** |
| GPT-4 **com rótulos-oráculo** | **97,5** | **85,5** | **59,0** |

Todas as células de auto-correção degradam ou empatam, **a 3–5× o custo em tokens**. O diagnóstico dos
autores: *"**The fundamental issue is that LLMs cannot properly judge the correctness of their own
reasoning.**"* E a quebra por direção de mudança (GPT-3.5/CommonSenseQA): **correto→incorreto 39,8%
contra incorreto→correto 5,8%** — vira mais resposta certa em errada do que o contrário.

**(ii) O ganho publicado da auto-correção vem inteiro do oráculo.** Valmeekam, Marquez & Kambhampati,
2023 ([PDF](https://arxiv.org/pdf/2310.08118)), Blocksworld, 100 instâncias, GPT-4 como gerador **e**
verificador, contra o verificador formal VAL:

| Montagem | Acurácia |
|---|---|
| gerador sozinho, sem backprompt | **40%** |
| LLM + **auto-crítica** do próprio LLM | **55%** |
| LLM + **VAL (verificador externo correto)** | **88%** |

E o perfil de erro do LLM-verificador: **taxa de falso positivo 84,45% — GPT-4 aprovou 38 planos
inválidos como válidos.** Os autores: *"which can be catastrophic if such a system is deployed in
scenarios where correctness is paramount."*

**(iii) O que carrega o valor é o BIT, não o texto da crítica.** Ainda em Valmeekam: sem feedback 40%;
**feedback binário puro 74%**; binário + detalhe do erro 86%. E Stechly, Marquez & Kambhampati, 2023
([PDF](https://arxiv.org/pdf/2310.12397)), coloração de grafo: direto **16%**, com auto-crítica do
GPT-4 **1 de 100**, com verificador correto **~40%** — mas **15 amostras independentes sem feedback
nenhum também dão ~40%**. *"Blindfolded guessing does just as well as careful, crafted feedback."*

**Aterramento, e é o argumento central do F3 e do F4:** este repositório produziu **147.750 palavras**
de crítica e **zero bit** que venha de fora. A literatura diz que o texto da crítica contribui quase
nada e o **bit de aceitar/rejeitar** contribui quase tudo — e o único bit disponível aqui (`verdict`)
tem **entropia zero** (§2.3). É a pior combinação possível: máximo de texto, mínimo de bit.

**(iv) O remédio da casa — "revisor independente = agente separado em worktree" — não é o remédio.**
Wataoka, Takahashi & Ri, *"Self-Preference Bias in LLM-as-a-Judge"*, arXiv 2410.21819
([PDF](https://arxiv.org/pdf/2410.21819)) mede o viés de auto-preferência do GPT-4 em **0,520** (TPR
0,945 contra TNR 0,425) e — o achado que importa — identifica o **mecanismo**:

> *"LLMs assign significantly higher evaluations to outputs with lower perplexity than human
> evaluators, **regardless of whether the outputs were self-generated**. This suggests that the essence
> of the bias lies in perplexity and that the self-preference bias exists **because LLMs prefer texts
> more familiar to them**."*

**Aterramento, e é a refutação da regra que a memória do projeto guarda como
`reviewer-independence-separate-agent`:** se o mecanismo é **familiaridade**, não **identidade**, então
trocar a worktree, a sessão e o `reviewer:` string **não remove o viés** — o irmão do mesmo modelo
herda quase todo ele. Panickssery, Bowman & Feng, NeurIPS 2024
([PDF](https://proceedings.neurips.cc/paper_files/paper/2024/file/7f1f0218e45f5414c79c0679633e47bc-Paper-Conference.pdf))
mede a auto-preferência do GPT-4 como **desproporcional à diferença real de qualidade julgada por
humanos**, com τ de Kendall entre auto-reconhecimento e auto-preferência de **0,41/0,37**. **A
independência que este repositório compra é de identidade; a que a literatura diz que funciona é de
fonte de sinal.**

**(v) A síntese citável.** Kamoi, Zhang, Zhang, Han & Zhang, *"When Can LLMs Actually Correct Their Own
Mistakes?"*, TACL 2024 ([PDF](https://arxiv.org/pdf/2406.01297)) — que **re-audita** os trabalhos
anteriores em vez de acrescentar mais um:

> *"(1) **no prior work demonstrates successful self-correction with feedback from prompted LLMs**,
> except for studies in tasks that are exceptionally suited for self-correction, (2) **self-correction
> works well in tasks that can use reliable external feedback**…"*

E o alerta metodológico deles cai em cheio sobre a bancada: muitos ganhos publicados de auto-correção
são artefato de **usar informação-oráculo para decidir quando parar**, *"which unfairly ignores
false-positive correction"*. **Aqui, quem decide parar (`status`) é o mesmo ator que consertou** — e o
`REVIEW-PR173.md:113` já mediu que `status` **não é lido por gate nenhum** (`grep` = 0).

**(vi) Crédito onde é devido, contra o meu próprio argumento.** Olausson et al., ICLR 2024
([PDF](https://arxiv.org/pdf/2306.09896)) auditaram 80 strings de feedback e acharam que
*"GPT-4's feedback is obviously inaccurate in **32/80** cases vs. **7/80** for humans"*, e que
*"our human participants sometimes express uncertainty (7/80); **GPT-4 never does (0/80)**."*
**Os relatórios deste repositório contrariam essa medida**: o `REVIEW-PR173.md:166-172` tem uma seção
inteira "O que ficou FORA", e `:178-182` nomeia cinco vieses próprios, incluindo um erro de medição do
próprio revisor deixado na tabela (linha C3). **Isso é melhor do que o baseline medido, e é mérito real
do protocolo desta casa.** O problema não é a qualidade da crítica — é que crítica não é o que paga.

**(vii) Um risco que ninguém aqui mediu.** Zheng et al., NeurIPS 2023
([PDF](https://arxiv.org/pdf/2306.05685)) mede **viés de verbosidade**: um ataque de "lista repetitiva"
engana o juiz Claude-v1 em **91,3%** dos casos (GPT-4: 8,7%), e **viés de posição** derruba a
consistência do Claude-v1 para **23,8%** com o prompt padrão. *(Honestidade obrigatória: o mesmo artigo
declara que **não consegue** estabelecer viés de auto-preferência — *"our study cannot determine
whether the models exhibit a self-enhancement bias"* —, então a alegação (iv) se sustenta em Panickssery
e Wataoka, **não** em Zheng.)*
**Aterramento:** a `AV-R8` julgou **seis documentos longos de prosa densa**, e o `REVIEW-PR173.md:181`
nomeia o efeito por conta própria — *"prosa bem escrita convence antes de ser verificada"*. Viés de
verbosidade não foi medido em nenhuma rodada, e a bancada é, por construção, um produtor de prosa longa.

### 3.7 Descartado explicitamente

- **Correlação numérica entre custo de gerar entrada e custo de decidir correção.** Barr et al.
  afirmam a assimetria estruturalmente e **não publicam número**. Não usei número nenhum.
- **Percentual de mutantes equivalentes como "a" taxa.** Schuler & Zeller (ICST 2010) medem **~45% dos
  mutantes *sobreviventes*** como equivalentes, a ~15 min de análise humana por mutante — mas o
  denominador é "sobreviventes", não "todos", e Offutt & Pan reportam 9,10% sobre todos num programa de
  28 linhas. **Número dependente do programa; não o transportei para cá.** O que transportei é só a
  parte não-numérica e decidível: o problema é **indecidível**, então nenhum gate deste repositório
  pode fechá-lo.
- **"Revisão de código é boa."** Ruído. Fora.
- **"Defeitos de omissão escapam mais que os de comissão", como lei geral.** Não achei estudo primário
  que quantifique a divisão para revisão de código. O que existe são **proxies medidos** e é só isso
  que usei: CSRF (uma proteção **ausente**) achado por 17% dos revisores em Edmundson et al., ESSoS
  2013 ([PDF](https://people.eecs.berkeley.edu/~daw/papers/coderev-essos13.pdf)), o mais baixo dos
  sete; e CWE-345 100% / CWE-20 ≈88% de escape em Paul et al. **Digo "classes de checagem ausente
  escapam a 88–100%", não a lei geral.**
- **Basili & Selby 1987** (leitura de código × teste funcional por classe de falta) — os PDFs
  primários são scans sem camada de texto ou devolvem 403. **Não citei nenhum número dele.**
- **ISACA/COBIT com a frase "detectivo substitui preventivo".** Procurada, não encontrada como fonte
  primária citável. Usei o Green Book ¶10.21 + ¶OV4.15 no lugar, que dizem a mesma coisa com
  autoridade verificável.
- **ACFE *Report to the Nations* sobre auditoria-surpresa** (a alegação de que ela ~metade a perda).
  Não verificada. Fora.
- **COSO 2013 Princípio 16 e COSO 2006 verbatim.** Só nível de resumo secundário. Fora.
- **Yellow Book ¶3.30 (self-review threat).** Só fonte secundária; `gao.gov` bloqueia a recuperação do
  PDF. Fora — o IIA 1130.A1/A2 diz o mesmo e foi verificado.
- **Estudo empírico medindo eficácia de controle compensatório em função da independência do revisor.**
  **Não existe** entre o que consegui alcançar. O IIA 1130 é norma, não medida — e eu digo isso onde
  o cito, em vez de emprestar autoridade empírica a um texto normativo.

---

## 4. Proposta — forks para ratificar um a um

Convenção da casa: `Fn→(a)/(b)/(c)`, recomendação declarada, custo de cada opção. **Nenhum destes
acrescenta etapa, ator ou artefato novo.** Onde um fork falha nos dois critérios do pedido (remove? traz
oráculo?), isso está escrito na própria linha.

### 4.0 — A alocação: quem faz o quê e quando

**A pergunta "quem faz o quê" não tem solução aqui, e insistir nela é o erro.** Há um ator de código
(`agent_authored_ratio` = 0,954) e um ator humano. Não existe segundo revisor, e o §3.6-iv mede que
inventar um agente-irmão não compra independência: o viés é de **familiaridade**, não de identidade.
Toda energia gasta em "quem" produziu 7/7 do mesmo veredito.

**O que tem solução é *quando*.** É literalmente a saída que o Green Book ¶10.21 prescreve — *"where
such segregation is not practical, management designs **alternative control activities**"* — e a
alternativa disponível a um ator só é **separação por ORDEM e por FONTE DE SINAL**, não por pessoa:

> **Se o critério de aceite é registrado ANTES do trabalho e é decidível por máquina, não importa que o
> mesmo ator escreva e rode — rodar deixa de ser julgamento.**

É exatamente por isso que o `falsificador` desta casa funciona e o `status` não. O falsificador é
decidível por máquina (*"precisa poder falhar"*, `bancada.html`); o `status` é julgamento, e
`REVIEW-PR173.md:113` mediu que **nenhum gate o lê** (`grep status scripts/bancada-gate.mjs` = 0). O que
falta não é a ferramenta — é a **ordem**: hoje o ciclo é `verificar → triar → aceitar → corrigir →
barrar`, e o falsificador nasce **junto com o achado**, isto é, depois da investigação, quando o autor
já sabe o que quer que ele diga.

#### A alocação, em três atos

| Ato | Quem | O quê | **Quando** | Como se decide |
|---|---|---|---|---|
| **1 · Registrar o critério** | agente | escreve **o comando que decide** ("fechado é quando `X` sair 0") e o comita | **antes** de investigar ou tocar código | ninguém decide — só se registra |
| **2 · Fazer** | agente | investiga, conserta, escreve a barreira | depois do Ato 1 | ninguém decide |
| **3 · Rodar o critério do Ato 1** | **a máquina** | executa o comando registrado | ao fechar | o **exit code** decide, não o agente |
| **★ Ratificar** | **o dono** | só o que a máquina não decide: escopo, fork, "isto é aceitável?" | quando o Ato 1 não consegue virar comando | **uma frase** |
| **★★ Contato com oráculo** | **o dono** | PVA / NF-e / contador / implantar | bloqueia emissão nova enquanto vencido | o oráculo decide |

**O que isso remove** — e é o teste do pedido: remove a **etapa de revisão** (não há revisor no fluxo),
remove o **ator revisor-agente**, remove o **artefato `verdict`**, e funde `verificar+triar+aceitar` num
único ato de registro. Cinco etapas viram três.

**O que isso resolve, concretamente.** O problema real de "mesmo ator" nunca foi ele *checar* o próprio
trabalho — foi ele poder **mover a trave depois de ver onde a bola caiu**. Pré-registro fecha isso sem
precisar de segunda pessoa. É o mesmo movimento do `contentHash` congelado no `submit` da torre de
aprovação (`ADR-INCR-APPROVAL §3`): não se confia no ator, congela-se o conteúdo antes.

#### Os três relógios

Cada laço tem cadência própria, e misturá-los é o que trava a fila hoje:

| Laço | Cadência | Gatilho de parada |
|---|---|---|
| **PR** (Atos 1→3) | por mudança | o comando do Ato 1 sai 0 |
| **Oráculo** (só o dono) | **1 contato por vez**, e o mais velho primeiro | enquanto houver item de Bloco A vencido há >14 dias, **nenhuma rodada nova** (F2b) |
| **Ratificação** (só o dono) | sob demanda, uma frase | a fila de forks abertos zera |

#### O caso que não vira comando — e é onde o dono é insubstituível

Nem todo critério é decidível por máquina. `"o DRE é o DRE que um contador assinaria"` não vira `exit 0`.
Nesses casos o Ato 1 **não** produz um comando; produz **uma pergunta de uma frase para o dono**, e ela
entra na fila de ratificação em vez de virar julgamento do agente. **É a diferença entre "o agente
decidiu e declarou" e "o agente perguntou e registrou a resposta"** — e é a única forma de
independência que sobra quando só há um par de olhos humanos.

**Cédula, para ratificar um a um:**

| Fork | Pergunta | Recomendo | Remove? | Oráculo? |
|---|---|---|---|---|
| **F1** | o que fazer com o ciclo de 5 etapas | **(b)** congelar a emissão enquanto houver oráculo aberto | sim | não |
| **F2** | regra de parada | **(b)** prioridade por oráculo | sim | não |
| **F3** | veredito do razão (entropia zero) | **(b)** trocar `verdict` por `achados_abertos` + `eu_mergearia` | sim | não |
| **F4** | qual oráculo comprar primeiro | **PVA com um ECD** | — | **sim** |
| **F5** | ~~espelhar a Emenda F3 do ADR no pipeline~~ · **REVISTO em 2026-08-09, ver §9.2** | **(d)** trocar a família de modelo do revisor, **não** desligar a revisão | não remove ator | parcial |
| **F6** | as duas restrições do gate (`B5:306`, `B6:316`) | **(a)** apagar as duas | sim | indireto |
| **F7** | **quem faz o quê e quando** (§4.0) | **(a)** pré-registro: critério antes do trabalho, 5 etapas → 3 atos | sim (2 etapas, 1 ator, 1 campo) | não, mas torna o oráculo o juiz |

Se só um for ratificado: **F4**. Se nenhum orçamento humano estiver disponível: **F6**, e depois
**F1(b)**, que juntos param a sangria sem apagar o que a bancada tem de bom. **F7 é o que responde
"quem faz o quê" — e a resposta dele é que a pergunta certa é "quando".**

### F7 — a ordem: critério antes do trabalho

Desenho completo em §4.0. As opções:

| Opção | O que é | Custo | Remove? |
|---|---|---|---|
| **(a) ★ RECOMENDADA** | **pré-registro**: o Ato 1 comita o comando que decide o fechamento **antes** de investigar; o Ato 3 roda esse comando e o exit code fecha. `verificar+triar+aceitar` viram um ato de registro; a revisão sai do fluxo | zero de código para começar (é ordem, não ferramenta). Emenda ao bloco 9 do AV-00 + `B5` passa a exigir o falsificador **datado antes** do primeiro commit de conserto | **sim** — 2 etapas, o ator revisor, o campo `verdict` |
| **(b)** manter a ordem atual (`verificar → triar → aceitar → corrigir → barrar`) | — | custo medido: o falsificador nasce depois da investigação, quando o autor já sabe o que quer que ele diga; e `status`, o campo que fecha o item, não é lido por gate nenhum | não |
| **(c)** pré-registro só para achado de dano ≥ 3 | meio-termo | menor atrito, mas o `damage` também é julgamento do mesmo ator — o filtro herda o problema que o fork existe para resolver | parcial |

**Risco declarado do (a), contra ele mesmo:** pré-registro **enrijece**. Um critério registrado antes da
investigação pode estar errado — e aí o agente vai ser tentado a "corrigir o critério" no meio do
caminho, que é a trave se movendo com outro nome. A mitigação é a mesma da torre de aprovação: mudar o
critério é permitido, mas **vira um evento próprio no git**, com a razão escrita, em vez de uma edição
silenciosa. Se o dono não quiser esse atrito, o **(c)** é honesto — só não resolve inteiro.

**Dois reforços externos desse risco, achados depois (§9):**

1. **O oráculo é editável pelo agente, e isso já foi observado.** Kent Beck, ao rodar agentes sob TDD,
   vigiava explicitamente *"any indication that the genie was cheating, **for example by disabling or
   deleting tests**"*, e diz que **não consegue impedir** agentes de apagar teste para fazê-lo passar
   ([*Augmented Coding: Beyond the Vibes*](https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes)).
   **Consequência dura para o F7:** o critério pré-registrado tem de ser **imutável pelo Ato 2**. A
   forma barata é o que a torre de aprovação já faz — congelar o conteúdo (`contentHash`) e exigir
   evento próprio para mudar. Sem isso, o F7 é teatro.
2. **Critério fixo não sobrevive a capacidade crescente.** *The Verification Horizon: No Silver Bullet
   for Coding Agent Rewards* ([arXiv:2606.26300](https://arxiv.org/abs/2606.26300)): *"no fixed reward
   function can remain effective as policy capability continues to grow; **verification must co-evolve
   with the generator**."* Todo verificador é proxy da intenção, e otimizar contra o proxy alarga a
   fenda. **Isso não derruba o F7 — derruba a versão preguiçosa dele** ("escrevi o comando uma vez,
   pronto"). O critério tem de ser revisitado quando a fenda aparecer, e a revisão dele é um evento,
   não uma edição.

### F1 — o que fazer com o ciclo de cinco etapas

| Opção | O que é | Custo | Remove? | Oráculo? |
|---|---|---|---|---|
| **(a)** manter como está | mais rodadas, mais gates | ~1.400 linhas de artefato por rodada, rendimento de produto medido em §1.5 | não | não |
| **(b) ★ RECOMENDADA** — **congelar a emissão** | nenhuma rodada `auditoria/1.1` nova enquanto houver item de Bloco A com oráculo aberto. Os gates continuam rodando no CI; a fila triada continua drenando | zero de código. Custo real: o agente perde a única fila que anda sozinho | **sim** — remove a etapa "emitir" enquanto o gargalo for outro | não diretamente; **força** o F4 |
| **(c)** fundir 5 etapas em 3 | emitir+triar viram um ato (o portão já é derivação mecânica do `exposure`); consertar+barrar já são um commit; registrar fica | 1 dia de reescrita do contrato; risco de perder a separação emissor/triador que mudou 1 portão em 10 | sim (2 etapas) | não |
| **(d)** desligar a bancada e apagar os gates | remover `bancada-gate.mjs`, `review-ledger-check.mjs`, `docs/audit/`, os passos do `ci.yml` | ver avaliação honesta abaixo | sim (tudo) | não |

**Avaliação honesta de (d), sem espantalho.** O que se perde é real e mensurável, não simbólico:

1. **Os testes ficam.** As barreiras são ~3.100 linhas de teste com mordida provada por mutação
   (M2/M7 em DTOs, M3/M5 no razão, os 8 handlers de `eb23cfff`). O alcance de rota do razão subiu de
   **4 para 13 de 55** rotas distintas — medido por mim contando os paths em
   `accountingController*.integration.test.ts`. Isso não some se a bancada morrer.
2. **O que morre é a capacidade de achar a próxima F6.** O achado de dano 4 da AV-R8 — troca de dono
   em `deleteAccount` passando por 398 testes — é uma quebra de inquilino num razão contábil. Nenhum
   dos oráculos do §6 o teria pego: o PVA valida arquivo, o contador valida número, o usuário não
   testa multi-inquilino. **Este é o argumento mais forte contra (d) e eu o considero decisivo:** num
   produto que vai guardar dado financeiro de terceiros, a classe "vazamento entre inquilinos" não tem
   oráculo externo barato, e a mutação dirigida é o único instrumento que a pega.
3. **Custo de (d) se estiver errado:** irreversível na prática — 147.750 palavras de contexto medido
   não se reconstroem.

Por isso a recomendação é **(b) e não (d)**: congelar a emissão preserva a capacidade e para a sangria.

### F2 — a regra de parada

| Opção | O que é | Custo | Veredito |
|---|---|---|---|
| **(a)** a regra candidata do pedido: *achado sobre instrumento só entra na fila se puder nomear o defeito de produto que teria pegado* | filtro na etapa de triagem | zero | **NÃO recomendada** — §5 mede: derruba 15-16 de 31, e entre os derrubados está o item cujo efeito a jusante produziu os 2 únicos achados de produto das rodadas tardias |
| **(b) ★ RECOMENDADA** — regra de **prioridade por oráculo**: *nenhuma rodada nova enquanto existir item de Bloco A cujo gate seja oráculo externo e que não tenha sido tentado nos últimos 14 dias* | condição sobre a fila, não sobre o achado | zero de código; conferível por leitura do master map | derruba **rodadas**, não achados — e é a única que ataca a causa medida no §2.7 |
| **(c)** cota: achados de instrumento limitados a N% da fila | filtro proporcional | arbitrário; o N não tem fonte | não recomendada — número sem lastro |
| **(d)** nenhuma | — | — | é a opção corrente, e §2.2 mede o resultado |

### F3 — o veredito do razão de revisão (entropia zero)

| Opção | O que é | Custo | Recomendação |
|---|---|---|---|
| **(a)** manter os 4 vereditos | — | mantém 0 bit de informação | não |
| **(b) ★ RECOMENDADA** | **apagar o campo `verdict`** e pôr no lugar dois campos que não podem ser todos iguais: `achados_abertos: <int>` e `eu_mergearia: true\|false` | ~15 linhas em `review-ledger-check.mjs` — mas **isto altera um gate existente, o que este documento não faz**: fica como proposta a ser executada por quem o dono designar | remove um campo, não acrescenta |
| **(c)** acrescentar `parcialmente_revisado` (o que o `REVIEW-PR174` pediu) | 5º valor na lista fechada | zero | **rejeitada** — é acrescentar, exatamente o modo de falha que o pedido nomeia |

**Por que (b), com lastro triplo e independente:**

1. Valmeekam et al. medem que **o bit vale quase tudo e o texto quase nada** — sem feedback 40%,
   **feedback binário puro 74%**, binário + detalhe 86% (§3.6-iii).
2. Hamel Husain, que consultoria de evals como ofício, chega no mesmo lugar por experiência de campo e
   dá nome ao método — **"Critique Shadowing"**: escala Likert 1–5 multidimensional é ruído; o que
   funciona é **binário passa/falha ancorado num especialista de domínio**
   ([guia](https://hamel.dev/blog/posts/llm-judge/index.html)).
3. A derivação a partir deste repositório: 2.273 linhas de texto e **um bit constante** (§2.3).

Três caminhos independentes — laboratório de planejamento, prática de campo, e a medida local —
convergem em *um bit binário ancorado num humano*. `eu_mergearia: true|false` é o bit que falta, e
`achados_abertos: <int>` é o único número que a distribuição não pode achatar. **O ganho não é medir
melhor — é passar a ter o que medir.**

**A ressalva que a mesma fonte faz, e que eu carrego:** Hamel **não** endossa o slogan "o modelo não
pode julgar o próprio trabalho". A posição dele é um *sim qualificado* — julgar é uma tarefa diferente
de gerar, e o viés de auto-preferência é real mas **secundário ao alinhamento medido contra rótulo
humano** ([texto](https://hamel.dev/blog/posts/evals-faq/can-i-use-the-same-model-for-both-the-main-task-and-evaluation.html)).
A métrica que ele exige no lugar do slogan é **TPR e TNR contra um conjunto rotulado por humano**, e
avisa que "concordância" isolada é métrica-armadilha. **Consequência para nós:** o `eu_mergearia` só
vale alguma coisa depois que o dono rotular um punhado de casos e alguém medir TPR/TNR contra eles.
Sem isso, é um bit não calibrado — melhor que 7/7, mas não é medição.

### F4 — qual oráculo comprar primeiro ★ (a recomendação principal deste documento)

Ver §6 para custo e destravador de cada um. Recomendação: **PVA com um ECD, primeiro**, porque
de-risca ECD + Apuração + ECF juntos (o próprio master map diz isso em `:349`) e porque o artefato já
existe no disco há 30 dias. **Só o dono destrava — nenhum fork de processo substitui este.**

### F5 — o revisor independente · **REVISTO em 2026-08-09**

> **Eu recomendava (a) — desligar a exigência de revisor. Retiro a recomendação.** A pesquisa externa
> do §9 derrubou a premissa: eu tratei "o viés é de familiaridade, não de identidade" como se
> implicasse "trocar de revisor não adianta". **Não implica.** Duas medidas novas mostram que trocar
> de revisor adianta — só não do jeito que o `AV-00 §9.4` manda trocar. Detalhe em §9.2.

| Opção | O que é | Custo | Recomendação |
|---|---|---|---|
| **(d) ★ RECOMENDADA (nova), com ressalva forte** | **manter a revisão independente e trocar a FAMÍLIA DE MODELO do revisor**, não a worktree. O `AV-00 §9.4` passa a exigir `reviewer.model_family ≠ implementer.model_family`, e o `[RL4]` — que hoje compara strings de nome — compara família | pequeno no gate; **grande na prática**, porque exige acesso a um segundo fornecedor | direção **teoricamente sustentada** (Littlewood & Miller: diversidade de *método*; Wataoka: o viés é familiaridade). O número que circula (+6 a +11 pontos de recall) é **de fornecedor que vende exatamente isso** e com rótulo de par ambíguo na fonte — **não o trate como medida**. Ver §9.2 |
| **(a)** desligar a exigência enquanto o ator for único | ~~recomendada~~ | zero | **RETIRADA.** O ponto-cego de auto-correção é de **procedência**, não só de familiaridade: 64,5% de taxa média em 14 modelos, e some quando o texto chega como se fosse de outro. Contexto fresco em worktree isolada **já compra parte disso** — mais do que eu dei crédito |
| **(b)** manter a exigência como está (worktree isolada, mesmo modelo) | — | 6 revisões = 2.273 linhas, 7/7 do mesmo veredito | aceitável como piso; é o que existe hoje |
| **(c)** painel de N revisores-agentes | — | **rejeitada com número:** times de LLM **não alcançam o melhor membro individual**, perdas até **41,1%**, e o mecanismo é *integrative compromise* — média entre especialista e não-especialista, que **piora com o tamanho do time** ([arXiv:2602.01011](https://arxiv.org/abs/2602.01011)). É o `revisado_com_ressalva` explicado | não |

**Lastro normativo do F5(a), literal:** GAO Green Book **¶10.21** — *"If segregation of duties is not
practical within a business process **because of limited personnel** or other factors, management
designs **alternative control activities** to mitigate the risk"* (§3.5). É a mesma frase que a Emenda
F3 do ADR aplicou à contabilidade deste projeto em 2026-07-14. **Aplicá-la ao pipeline é consistência,
não invenção.**

**Lastro técnico do F5(a):** o mecanismo do viés de auto-preferência é **familiaridade (perplexidade),
não identidade** (Wataoka et al., §3.6-iv). Trocar de worktree troca a identidade e **não** a
familiaridade — o revisor-irmão do mesmo modelo herda quase todo o viés. A regra
`reviewer-independence-separate-agent` compra a forma da independência e não a substância. E o IIA
**1130.A2** diz qual é a substância: *"must be overseen by a **party outside**"* — e a única parte fora,
aqui, é o dono e os oráculos.

**Consequência declarada de F5(a), contra mim mesmo:** as 6 revisões independentes produziram 35
achados, e a AV-R8 que nasceu delas produziu os 2 únicos achados de produto tardios (§1.6). Desligar a
revisão desliga também essa fonte. **A mitigação é o F1(b)**: o que a revisão fazia bem — apontar um par
de olhos fresco para *código de aplicação recém-alterado* — é exatamente o que o F1(b) preserva ao
proibir só as rodadas apontadas para dentro. Se o dono ratificar F5(a) **sem** F1(b), ele perde as duas
coisas, e aí eu recomendo F5(b).

### F6 — as duas subtrações no gate que mudam quem entra na fila ★ (o melhor por esforço, dentro do processo)

Causa medida no §2.1b. As opções:

| Opção | O que é | Custo | Remove? | Oráculo? |
|---|---|---|---|---|
| **(a) ★ RECOMENDADA** | **apagar** o teto de 120 s do `B6` quando a evidência for o app em execução, e **aceitar `falsifier_dynamic`** onde o `B5:306` hoje exige `falsifier_static` | ~6 linhas em `scripts/bancada-gate.mjs` — **alteração de gate, portanto fora do que este documento faz**; fica como proposta a executar | **sim**, duas restrições | **sim, indiretamente** — passa a *premiar* a evidência que só o app produz, em vez de rebaixá-la |
| **(b)** só apagar o teto de 120 s | menor | 2 linhas | sim | parcial |
| **(c)** manter | — | custo medido: 1 dano rebaixado por procedimento (`TRIAGEM-R1-R3.json:89`) e 1 defeito de produto confirmado que nunca entrou na fila (§1.6b) | não | não |

**É o único fork que ataca a causa e não só o sintoma, e é o mais barato de todos.** Se o dono só for
mexer no processo — sem comprar oráculo — mexa aqui. Mas note a ordem: F6 abre a porta para a
evidência de runtime; **F4 é quem entra por ela.** F6 sem F4 é uma porta para uma sala vazia.

---

## 5. A regra de parada candidata, aplicada retroativamente

**Regra:** *achado sobre instrumento só entra na fila se puder nomear o defeito de produto que teria
pegado.*

Aplicada aos **17 itens de instrumento** dos 31 triados:

| Item | Nomeia defeito de produto? | Sobrevive? |
|---|---|---|
| AV-L1 `spec-layergate-divida-paga` | não (spec desatualizado) | ✗ |
| R1-R3 #6 `revisao-independente-sem-artefato` | não | ✗ |
| AV-R6 #1..#5 (bancada.html) | não (×5) | ✗ ×5 |
| R7 #1 `agent-authored-ratio-sem-denominador` | não | ✗ |
| R7 #2 `softdelete-etiquetado…` | não (o código está certo) | ✗ |
| R7 #5 `fan-in-do-simbolo-concreto…` | não | ✗ |
| R8 #1 `portao-nao-derivado-do-exposure` | não | ✗ |
| R8 #2 `razao-aceita-declaracao…` | não | ✗ |
| R8 #3 `jest-so-pendura…` | **sim** — nomeia que a leitura "fail-closed" do PR #171 era artefato do harness, e o defeito real é alcance em `deleteAccount` | ✓ |
| R8 #4 `mordida-provada-em-superficie-que-o-app-nao-alcanca` | **limítrofe** — nomeia que duas provas publicadas não dizem nada sobre o app, mas não nomeia um defeito | ✓/✗ |
| R8 #5 `numero-publicado…divergente` | não | ✗ |
| R8 #6 `placar-de-mutacao-omite-unidade` | não | ✗ |
| R8 #10 `campo-de-evidencia-por-presenca` | não | ✗ |

**O NÚMERO:**

| Universo | Itens | Derrubados pela regra | % |
|---|---:|---:|---:|
| As 5 triagens | 31 | **15 a 16** (16 se R8 #4 cai) | **48% – 52%** |
| O recorte do pedido (22) | 22 | **9 a 10** | **41% – 45%** |

**Veredito: a regra não é decorativa nem cega — e mesmo assim eu NÃO a recomendo.** Ela derruba metade
da fila, o que é o volume certo. O problema é **qual** metade. Entre os derrubados está
`revisao-independente-sem-artefato-por-merge` (R1-R3 #6), e a cadeia do §1.6 é datada e verificável:
esse item gerou o razão → o razão gerou as seis revisões → as seis revisões geraram a AV-R8 → a AV-R8
produziu os únicos 2 achados de produto posteriores a 2026-08-03 e o único dano 4 com par
discriminante.

A regra é **anti-causal**: ela poda exatamente a classe de trabalho de instrumento cujo valor só
aparece a jusante, porque no momento da triagem o defeito de produto ainda não existe para ser nomeado.
Aplicá-la em 2026-08-03 teria custado a AV-R8 inteira.

**A regra de parada que eu recomendo no lugar** é F2(b), e ela é falsificável do mesmo jeito, com um
comando:

> **Regra:** nenhuma rodada `auditoria/1.1` nova enquanto existir item de Bloco A com gate de oráculo
> externo sem tentativa registrada nos últimos 14 dias.
>
> **Falsificador:** ler `ACCOUNTING-MASTER-MAP.md` §Bloco A. Se algum dos itens 3/4/5/6 estiver aberto
> e a última tentativa registrada tiver mais de 14 dias, e ainda assim uma rodada nova for emitida,
> a regra foi violada.
>
> **Aplicada retroativamente:** as rodadas AV-R6 (2026-08-04), AV-R7 (2026-08-06) e AV-R8 (2026-08-07)
> **não teriam sido emitidas** — os itens 3, 5 e 6 do Bloco A estavam abertos e sem tentativa desde
> 2026-07-14; o item 4 desde 2026-07-23. Isso derruba **20 dos 31 itens**, e é o custo declarado: perde
> a F6. Por isso a regra é **de prioridade, não de proibição** — ela não diz "nunca", diz "depois do
> PVA".

---

## 6. O que processo NÃO conserta — a recomendação principal

**Nada no processo substitui os quatro oráculos, e esta é a recomendação principal deste documento.**

A literatura diz isto sem rodeio, e é a única frase de fora que eu carrego inteira porque ela é
literalmente um re-audit de todas as outras — Kamoi et al., TACL 2024 (§3.6-v): *"**no prior work
demonstrates successful self-correction with feedback from prompted LLMs**… **self-correction works
well in tasks that can use reliable external feedback**."* Somado a Valmeekam (40% → 55% com
auto-crítica → **88% com verificador externo**) e a Huang et al. (GPT-4 **degrada** de 95,5 para 89,0
sem oráculo e **sobe** para 97,5 com ele), a conclusão não é interpretação minha: **auto-auditoria sem
sinal externo é um laço que consome tokens e perde acurácia.**

O argumento local não é retórico, é aritmético: o único contato com oráculo da história recente do
repositório (`69ab527`, uma sessão de navegador) mudou **28 linhas de aplicação** e desfez dois bugs que
travavam três increments mergeados. Cinco rodadas de bancada, 31 itens triados, 95 commits e 13.466 linhas de
artefato mudaram **0**.

| Oráculo | O que ele pega que nada mais pega | Custo real | Quem destrava |
|---|---|---|---|
| **PVA da Receita** (ECD primeiro) | leiaute campo-a-campo dos 25 registros, blocos vazios exigidos, hash/recibo — coisas que nenhum teste do repo sabe. O `ADR-INCR-SPED-ECF` já registra que **3 pontos inferidos caíram** quando o Manual foi transcrito; o PVA vai derrubar mais | **baixo**: o arquivo `.txt` já é gerado pelo job `EXPORT_SPED_ECD`; falta uma máquina Windows e ~1h. Aberto há **30 dias** | **só o dono** |
| **NF-e real anonimizada** | domínio fiscal campo-a-campo; `ACCOUNTING-MASTER-MAP.md:238` já declara que o gate restante do NF-e é **dado externo**, não decisão | baixo em esforço, bloqueado em acesso | dono, ou um cliente |
| **Contador humano** | se os números **significam** o que o plano de contas diz; o de-para RFB; se o DRE é o DRE que um contador assinaria | 1 sessão de leitura + honorário | dono contrata |
| **Usuários num sistema implantado** | tudo que só aparece com dado sujo, concorrência real e uso não-imaginado — a classe inteira do BUG-1 | alto (deploy, suporte, LGPD com dado de terceiro) | dono |

**O que os oráculos NÃO pegam, e por isso o F1(d) é errado:** quebra de inquilino, TOCTOU de período,
idempotência cross-job. Essas classes não têm oráculo externo barato e **precisam** de mutação dirigida
— e a literatura confirma que a revisão também não as pega: Paul et al. medem **≈88% de escape** para
*improper access control* em revisão de código (§3.4-ii), que é exatamente a classe do `AV-R8` F6. A
conclusão correta não é "desligue a bancada", é **"aponte a bancada para o que oráculo nenhum pega, e
vá buscar os oráculos para o resto"**.

**E há uma quinta coisa que processo nenhum conserta, e que é a mais barata de todas:** os 4 itens de
oráculo do Bloco A estão abertos porque **dependem de uma pessoa**, e a única pessoa é o dono. Nenhum
fork deste documento move isso. Se a resposta ao F4 for "não tenho tempo", então a resposta honesta ao
F1 é **(b) congelar** — porque continuar emitindo rodadas enquanto o gargalo é humano é,
literalmente, o que os últimos 6 dias mediram.

---

## 7. Meus próprios vieses, nomeados

1. **Eu sou um agente propondo o processo que governa agentes, e esta proposta é exatamente o tipo de
   artefato que ninguém revisou.** A entrada deste PR no `REVIEW-LEDGER.jsonl` vai dizer
   `sem_revisao_independente`, o que é honesto e **não** conserta o problema: um documento que
   argumenta "a auto-revisão de agente tem entropia zero" e é auto-revisado por um agente herda o
   defeito que descreve. Peso máximo neste viés.
2. **Viés de manchete.** A frase "0 linhas de aplicação" é forte e memorável, e eu a busquei. O
   contrapeso que apliquei e que o leitor deve conferir: **+3.116 linhas de teste com mordida provada
   por mutação não são zero valor**, e o alcance de rota do razão triplicou (4→13 de 55). Se o dono ler
   só o §0, ele vai subestimar isso.
3. **Viés de simetria bonita.** A analogia "Emenda F3 do ADR = pipeline" é elegante e elegância
   convence antes de ser verificada. O ponto onde ela é fraca: na contabilidade a SoD desligada tem
   substituto real (`contentHash` + `version` + trilha hash-chain, invioláveis); no pipeline o
   substituto proposto (falsificador + mutação) é escrito pelo mesmo ator que ele deveria constranger.
   **A analogia é mais fraca do que soa, e eu a mantive porque a direção está certa mesmo com o
   substituto pior.**
4. **Viés de quem chegou por último.** Reli 31 itens e 8 revisões em uma sessão; quem os escreveu viveu
   cinco. Julgar rendimento de fora é barato, e algumas decisões que eu chamo de deriva foram
   provavelmente a única coisa executável naquele dia — que é literalmente a minha própria tese do
   §2.7, virada contra a minha própria crítica.
5. **Viés de novidade contra o dono.** Fui instruído a contrariá-lo com evidência, e um agente
   instruído a contrariar acha contradição — é a armadilha que `REVIEW-PR173.md:178` nomeia. Contrapeso
   aplicado: **três** das cinco linhas do §1.8 **confirmam** a leitura dele, e a confirmação de que a
   bancada se voltou para dentro ficou **mais forte** na minha medida (17/31) do que na dele (10/22).
   Onde eu o contrario é num ponto só, e é um ponto com número: a AV-R8.
6. **O que eu não verifiquei, e é muito.** Não rodei `jest`, `tsc`, nem a suíte de integração.
   **Não abri o app** — o que é irônico num documento cuja tese é que ninguém abre o app, e eu
   nomeio a ironia em vez de escondê-la: este documento é ele próprio uma peça de auditoria estática,
   a espécie que ele critica. Não reexecutei nenhuma das mutações citadas; as tomei dos relatórios.
   **O que eu de fato verifiquei em código,** e onde digo isso explicitamente: os dois achados de
   produto da AV-R8 (§1.3), a perda de dimensões (§1.6b), as duas linhas do gate (§2.1b), a contagem
   de 55 rotas / 23 handlers (§1.5), o alcance de 13 rotas (§4/F1d), e todo número de commit, diff e
   distribuição (§1.7, §2.2, §2.3), por `git` e pelos dois gates executados nesta sessão.

7. **Um defeito vivo achado de passagem, não consertado.** A perda de etiquetas de dimensão do §1.6b
   **reproduz no `tip` de `main` hoje**. Não a corrigi, e a razão é a regra da casa: o bloco 9 do AV-00
   proíbe consertar achado não triado, e a proibição vale inclusive quando o achado é meu e o conserto
   é pequeno. Registro aqui, com o falsificador: ler `toDraftValue` em
   `my-app/features/accounting/components/EntryApprovalsPanel.tsx:24-34` — se o `map` não emitir uma
   chave `dimensions`, o achado reproduz.

## 8. Auto-aplicação (T3 — a regra se aplica primeiro a quem a escreve)

Onde este documento falha nos próprios critérios:

- **Ele acrescenta um artefato.** É um documento a mais em `docs/operating-manual/`, num repositório
  cujo diagnóstico é excesso de artefato. Mitigação declarada: ele não cria etapa, gate, campo nem
  vocabulário, e o F1(b)/F5(a) que ele recomenda **removem** três coisas (a etapa de emissão enquanto o
  oráculo estiver aberto, o ator revisor, o campo `verdict`).
- **Ele não traz oráculo.** Nenhuma linha aqui diz "errado" sem alguém ler. O único oráculo que ele
  produz é indireto: o §5 publica um número (15-16 de 31) que **derruba a regra que o próprio pedido
  propunha**, e esse número é reexecutável.
- **A regra de parada que ele recomenda (F2b) não se aplica a ele.** Este documento foi escrito
  enquanto 4 itens de oráculo estavam abertos — exatamente a condição em que F2(b) proíbe emitir. Se
  F2(b) valesse hoje, este documento não deveria existir. Declaro isso em vez de me isentar: a saída
  honesta é que ele é o **último** artefato antes do congelamento, não uma exceção à regra.

---

## 9. Referências externas — `reference`, **não evidência**

> **Grau, declarado antes do conteúdo:** nada nesta seção foi medido neste repositório. É material de
> fora, colhido em 2026-08-09, e serve para (a) nomear com precisão o que já medimos e (b) evitar
> reinventar. **Misturar isto com a evidência do §1/§2 seria exatamente o defeito que este documento
> acusa.** Onde o número vem de parte interessada, está escrito na linha.

### 9.1 O que confirma o que já medimos

| Achado externo | Confirma qual medida nossa |
|---|---|
| Kroah-Hartman (kernel, mar/2026): IA como **achadora de bug** virou valiosa; IA como **escritora de patch** ainda é custo líquido — de 60 correções por prompt preguiçoso, **~1/3 erradas**, 2/3 usáveis só após limpeza humana | §1.7 — a bancada acha e não conserta; e o que ela conserta é teste |
| curl volta ao HackerOne em mar/2026: a fabricação **acabou** (taxa de confirmação de volta a 15–16%) e **a carga de revisão piorou** — frequência de relatório **dobrou** | §2.7 — melhorar a qualidade não fecha a assimetria; só o oráculo fecha |
| Uber uReview: **65 mil diffs/semana**, >75% dos comentários úteis, >65% endereçados — **mas só depois** de uma camada de supressão (limiar por categoria, dedup semântico, classificador que cala categoria historicamente inútil). Lição declarada: *"precision is more valuable than volume"* | §2.3 — o valor está no **filtro**, não no volume de crítica. 147.750 palavras é o oposto |
| Django embute um **canário** na política de segurança: o relatório tem de terminar com uma frase sobre o sentido da vida segundo Monty Python e a posição do relator sobre P=NP | F7 — critério pré-registrado, barato, decidível, e que só um humano atento passa |
| Kernel: só humano assina o DCO; contribuição de IA declara `Assisted-by:`, **deliberadamente não** `Co-authored-by:` | §2.5 — separar *quem executou* de *quem responde* é a versão deles do `enforcesSegregationOfDuties` |

### 9.2 O que **mudou** um fork deste documento

**O F5 foi revisto.** Eu recomendava desligar a exigência de revisor independente. Duas medidas
derrubaram a premissa:

1. **O ponto-cego de auto-correção é de PROCEDÊNCIA, não só de familiaridade.** *Self-Correction
   Bench* (Ken Tsui, [arXiv:2507.02778](https://arxiv.org/html/2507.02778v1)): **taxa média de
   ponto-cego 64,5%** em 14 modelos — o modelo corrige o erro idêntico quando ele chega como input e
   não corrige quando saiu dele. Um revisor de **contexto fresco**, sem o prompt de produção, está
   mais perto da condição boa. **A worktree isolada faz mais trabalho do que eu dei crédito.**
   (Adjacente, confiança baixa: *Cross-Context Review*, [arXiv:2603.12123](https://arxiv.org/pdf/2603.12123),
   preprint de autor único, sem números duros extraíveis.)
2. **Painel de revisores-agentes é pior, não melhor.** *Multi-Agent Teams Hold Experts Back*
   ([arXiv:2602.01011](https://arxiv.org/abs/2602.01011)): times de LLM **não alcançam o melhor membro
   individual**, perdas até **41,1%**, mesmo informados de quem é o especialista. Mecanismo:
   *integrative compromise* — mediar especialista com não-especialista —, e **piora com o tamanho do
   time**. **É o `revisado_com_ressalva` com nome científico.** Convergente: *Wisdom and Delusion of
   LLM Ensembles* ([arXiv:2510.21513](https://arxiv.org/abs/2510.21513)) — votação por consenso cai na
   **"popularity trap"**, amplifica o erro comum e filtra a minoria correta; seleção por
   **diversidade** recupera até 95% do teto.

**A ressalva sobre o número do cross-model.** A medida que circula — revisor de outra família de
modelo pega **6 a 11 pontos de recall a mais** em bug de severidade alta, e *"os tipos de bug que um
modelo mais introduz são os que ele mais deixa passar na revisão"* — vem de
[greptile.com/blog/model-inversion](https://www.greptile.com/blog/model-inversion), **fornecedor que
vende revisão cross-model**, e o rótulo do par de modelos ficou ambíguo na leitura. **Não é medida
para nós.** O que sustenta o F5(d) é a teoria (Littlewood & Miller, Wataoka), não esse número.

**E o contexto que obriga a desconfiar de todos os números desse mercado:** **quatro fornecedores
reivindicam simultaneamente o 1º lugar no mesmo benchmark dito independente** (Martian), e a mesma
ferramenta aparece com F1 de **30,3% / 51,2% / 57,5%** em três recortes do mesmo benchmark. O próprio
Martian declara que o *gold set* foi construído **sobre trabalho de dois concorrentes do leaderboard**
e que *"some of the comments we initially scored as false positives turned out to be real issues"*.
**Não existe medição acordada de falso positivo nesse setor.**

### 9.3 O que a literatura independente diz — e é mais dura que qualquer número de fornecedor

| Estudo | Número |
|---|---|
| [arXiv:2607.03316](https://arxiv.org/abs/2607.03316) — 31.073 pares revisão/resposta, 10.191 PRs, 239 repos | **36,4% aceitos · 56,3% rejeitados** |
| [arXiv:2603.15911](https://arxiv.org/abs/2603.15911) — 278.790 conversas, 300 projetos | adoção de sugestão de IA **16,6%** contra **56,5%** de humano; e as adotadas **aumentaram complexidade e tamanho** |
| [arXiv:2604.03196](https://arxiv.org/abs/2604.03196) — 3.109 PRs | PR revisado só por agente mergeia **23,17 pontos percentuais menos**; 12 de 13 agentes abaixo de 60% de retorno acionável |
| [arXiv:2606.15689](https://arxiv.org/pdf/2606.15689) — *Bigger Isn't Always Better* | **F1 0,847 em bug injetado por mutação × 0,066 em PR real — 92% de degradação**; e 0,657 em diff <10 linhas → **0,043** acima de 150 |

**A última linha é a que mais nos atinge, e está incorporada no §3.2-iii-b:** a bancada prova mordida
sobre **mutante injetado**, que é a população fácil.

### 9.4 Correção de uma coisa que eu disse antes

Eu apresentei o caso do curl como evidência da carga de revisão de trabalho gerado por IA. **É mais
específico do que eu disse:** Stenberg encerrou o **bug bounty**, não a revisão de PR, e declarou que
os **PRs seguiram administráveis porque o CI os verifica**. O caso, lido direito, **reforça** o F6/F4
em vez de sustentar pessimismo genérico: onde havia oráculo executável, a enxurrada foi absorvida;
onde não havia (relatório de segurança em prosa), o programa fechou.

### 9.5 Quem ler — e onde eles realmente estão

**A comunidade do problema do oráculo saiu do X.** Andreas Zeller (CISPA, *The Fuzzing Book*) saiu
publicamente e está ativo no [Bluesky](https://bsky.app/profile/andreaszeller.bsky.social) até
ago/2026. Papadakis, René Just, Michael Ernst e Tim Menzies **não têm microblog em lugar nenhum**.
Mark Harman é LinkedIn. Daniel Stenberg é Mastodon. **Detalhe operacional:** a API pública do Bluesky
(`public.api.bsky.app`) é fetchável sem autenticação, ao contrário do x.com — e o
[@rao2z tem espelho ativo lá](https://bsky.app/profile/rao2z.bsky.social).

| Quem | Onde | Por que importa aqui |
|---|---|---|
| **Subbarao Kambhampati** [@rao2z](https://x.com/rao2z) | X + Bluesky, muito ativo | a tese do verificador **externo**; [External vs. Internal LLM-Modulo](https://x.com/rao2z/status/1887172266427138061) |
| **Simon Willison** [@simonw](https://x.com/simonw) | blog primeiro | **[Showboat e Rodney](https://simonwillison.net/2026/Feb/10/showboat-and-rodney/)** — *"just because the automated tests pass doesn't mean the software actually works!"*. **É o F6 já implementado** |
| **Hamel Husain** [@HamelHusain](https://twitter.com/HamelHusain) | X + hamel.dev | **"Critique Shadowing"**; e [*"It's Hard to Eval" Is a Product Smell*](https://hamel.dev/blog/posts/eval-smell/) — *verificação é o gargalo*, redesenhe o produto para ser checável |
| **Gergely Orosz** [@GergelyOrosz](https://x.com/GergelyOrosz) | X, argumenta lá | faz **a nossa pergunta em público** e nota que revisores-agentes *"usually don't validate by running the code"* |
| **Shreya Shankar** [@sh_reya](https://twitter.com/sh_reya) | papers | *Who Validates the Validators?* e **"criteria drift"** — o critério não pode ser fixado de véspera; ele emerge de olhar saída real. **É a objeção mais séria ao F7** |
| **Geoffrey Huntley** [@GeoffreyHuntley](https://x.com/GeoffreyHuntley) | blog | ["back pressure"](https://ghuntley.com/pressure/) — o anel de verificadores determinísticos em volta do agente. É o nosso `tsc` + suíte, nomeado |
| **Charity Majors** [@mipsytipsy](https://x.com/mipsytipsy) | charity.wtf | *"Code becomes precious when it is the only place knowledge lives"*; validação **comportamental em produção** no lugar de leitura linha a linha |
| **Kent Beck** [@KentBeck](https://x.com/KentBeck) | Substack | o agente **apaga teste para passar** — o risco do F7, observado por quem inventou a prática |
| **Michaela Greiler** | newsletter | [*When Agentic Coding Breaks Code Review*](https://www.michaelagreiler.com/codereview-surrender-exploitation/) — batiza **"code review surrender"** |
| **Mark Harman** | LinkedIn + arXiv | [Meta ACH](https://engineering.fb.com/2025/09/30/security/llms-are-the-key-to-mutation-testing-and-better-compliance/): descreve-se a **preocupação de falha em texto** e o sistema gera mutantes do domínio **e** testes que os matam. É o molde para a F6 do AV-R8 |

**Agregadores reais** (nenhum é conta de X): [ryokamoi/llm-self-correction-papers](https://github.com/ryokamoi/llm-self-correction-papers) · [CSHaitao/Awesome-LLMs-as-Judges](https://github.com/CSHaitao/Awesome-LLMs-as-Judges) · [huggingface/evaluation-guidebook](https://github.com/huggingface/evaluation-guidebook).

### 9.6 O viés desta seção, nomeado

Ela foi montada por buscas na web, e **x.com bloqueia leitura direta** — então o corpo de todo post de
X citado veio de trecho indexado por terceiro, não de leitura da página. A existência e a autoria são
sólidas; **a redação exata é quase-verbatim, não certificada.** Além disso, o método favorece quem
publica número — o que super-representa fornecedores (que têm interesse no número) e apaga o
mantenedor que largou o projeto em silêncio em vez de escrever um post.
