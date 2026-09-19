# CADEIA-A — Trecho A (núcleo contábil em código: C12 → C8)

> **Elo A-00, 2026-09-18.** Registro citável (ORCH-006) das decisões tomadas na abertura do Trecho A,
> sessão interativa com o dono. Trecho 0 (X10b) já fechou fora desta cadeia (PR-1 #348, PR-2 #349,
> PR-3 #350, todos MERGED em `origin/main`, confirmado 2026-09-18 via `git merge-base --is-ancestor` +
> `gh pr view`).

## 1. Forks do plano granular do C8 — RATIFICADOS 2026-09-18

Fonte: `BE-INCR-FIXED-ASSETS-execution-plan.md §1`. Apresentados via `AskUserQuestion` com contexto
(opções + recomendação + custo de errar, regra §57 do CLAUDE.md).

| Fork | Pergunta | Opção escolhida pelo dono | Recomendação do agente | Nota |
|---|---|---|---|---|
| **F-FA14** | Uma migração para todo o C8 no PR-1, ou uma por PR? | **(b) Uma migração por PR** — PR-1 cria as 3 tabelas + seed; PR-4 ganha 2ª migração aditiva (colunas do job de retificação) | (a) única no PR-1 | **Achado do plano (Passo 28, PR-5):** sob (b), a coluna `sourceItemRef` (rascunho de ativo por NF-e) também vira migração aditiva própria no PR-5 — ou seja, (b) implica **3** migrações no total (PR-1, PR-4, PR-5), não 2. Cada PR com migração roda seu próprio `smoke:migration` e S6 vacuoso. |
| **F-FA15** | Quem cria `GET /api/accounting/data-exchange/jobs` (lista, hoje inexistente)? | **(a) Quem mergear primeiro cria; o segundo só estende** — shape único `{ unitId, direction?, kind?, status?, year?, page, limit } → { items, total, page, limit }`, policy `canRead` | (a) — mesma opção | Se o `FE-INCR-REVIEW` mergear antes do C8 PR-4, o PR-4 só estende (`supersedesJobId`/`supersededByJobId`); shape já fixado nos dois BRIEFs para não divergir. |

## 2. Achado — nó "C9" já não existe separado do C8

**Verificado nesta sessão** (leitura de `docs/adr/ADR-INCR-FIXED-ASSETS.md` e
`docs/accounting/BE-INCR-FIXED-ASSETS-brief.md`, 2026-09-18): o `ADR-INCR-FIXED-ASSETS` (2026-09-15)
absorveu o item "retificação de ECD/ECF" do master map §5 (*"traz junto o item retificação de
ECD/ECF"*) por consequência (2) do F-Z0. O BRIEF do C8 se autotitula *"imobilizado + depreciação +
**retificação versionada ECD/ECF**"* e implementa isso inteiro no **Bloco G / PR-4** do plano granular
(Passos 18–25: `supersedesJobId`, J801/J932, dispensa, gate no pacote, lista de jobs).

O `GRAFO-DEPENDENCIAS-2026-09-14.md` ainda lista `C9 ["C9 Retificação ECD/ECF VERSIONADA"]:::blocked`
como nó separado — mas esse grafo é **um dia anterior** ao ADR que absorveu o item; o ADR/BRIEF
(ratificados, mais recentes) são a fonte que vale. **Não existe mais "BRIEF do C9" para autorizar
separadamente** — pedir essa frase seria abrir planejamento para algo já planejado dentro do C8.

Pergunta feita ao dono: *"você concorda que 'executa C8' já cobre a retificação versionada ECD/ECF
(não precisa de um terceiro 'autoriza BRIEF C9' separado), ou você quer que eu trate isso como uma
divergência a devolver pro dono via questionário antes de seguir?"*
Resposta do dono (2026-09-18): **"Pode seguir"** — confirma a leitura: C9 fica absorvido no C8, sem
elo próprio.

**Correção pendente (fora do escopo desta sessão, item para higiene de fila):** `GRAFO-DEPENDENCIAS-2026-09-14.md`
e qualquer outro doc que ainda trate C9 como nó `blocked` independente estão desatualizados frente ao
ADR/BRIEF do C8 e devem ser corrigidos num fold futuro do master map.

## 3. Ordem dos elos do Trecho A

Corrigida frente ao enunciado original de A-00 (que assumia C9 como nó separado com BRIEF próprio —
achado §2 acima invalida essa premissa):

```
A-01 C12 (máscaras de identidade no SPED)
   │  write-set: SpedEcdDto.ts, SpedEcfDto.ts, SpedEcfRealDto.ts + 2 model files novos
   │  sem migração, sem rota, sem factory.ts — pode rodar em PARALELO ao C8 PR-1..PR-3
   ▼
A-04 C8 (imobilizado + depreciação + retificação versionada ECD/ECF, absorve o antigo "C9")
   │  PR-1 (schema+seed) → PR-2 (classes+ativos) → PR-3 (depreciação+reconcile+Parte B)
   │  → PR-4 (retificação versionada — Bloco G) → PR-5 (NF-e modo 4)
   │  PR-4 ⇄ PR-5 permutáveis (write-sets disjuntos entre si)
   │
   │  ⚠️ DEPENDÊNCIA NOVA (achada nesta sessão, não estava no enunciado original;
   │  confirmada por leitura direta do código-fonte, não só do texto dos planos):
   │  A-01 (C12) deve MERGEAR antes do C8 abrir o PR-4. Não é só "mesmo arquivo" —
   │  é o MESMO símbolo Zod reusado: `SpedEcdDto.ts:74` exporta `SignerSchema`
   │  ({identQualif, indCrc, ...}) que é exatamente o que C12 (F-C12-1/F-C12-3)
   │  vai alterar (identQualif derivado do código; indCrc com máscara CFC). O
   │  execution-plan do C8, Passo 19, cita textualmente "signers: SignerSchema[]
   │  (reuso :74)" para o `verificationTerm` do PR-4 — ou seja, PR-4 CONSOME o
   │  mesmo tipo que C12 muda. Se PR-4 nascer antes de C12, ele é escrito/revisado
   │  contra o shape ANTIGO de SignerSchema e herda a mudança de C12 sem que
   │  ninguém tenha revisado se a máscara de identidade também deveria valer para
   │  os signatários do Termo de Verificação. Mesmo acoplamento, mais fraco (mesmo
   │  arquivo, símbolos diferentes — `DeclarantSchema` × `SignerSchema`), existe em
   │  `SpedEcfDto.ts`/`SpedEcfRealDto.ts` (`SpedEcfRealDto.ts:2` importa
   │  `DeclarantSchema, SignerSchema, refineEcfSigners` de `SpedEcfDto.ts` — "o MESMO
   │  objeto", comentário do próprio arquivo). Sem overlap nenhum com PR-1/2/3/5.
   │  Se C12 atrasar, C8 pode fazer PR-5 antes do PR-4 (permutáveis) para não
   │  ficar parado — mas o PR-4 em si não deve abrir antes de C12 mergear.
   ▼
A-23 fold (consolidação do Trecho A no master map)
```

**Nada abaixo desta linha roda sem esta linha.**

## 4. Pendente — HANDOFF

As frases literais **"executa C12"** e **"executa C8"** (que agora inclui, explicitamente, a
retificação versionada ECD/ECF ex-"C9") ainda não foram dadas pelo dono. Sem elas, **A-01 não abre**
— este documento fecha o planejamento e a ratificação dos forks, não autoriza código.

```json
{"elo":"A-00","status":"STOP","aguarda":"frases literais 'executa C12' e 'executa C8' (C8 já inclui a retificação ECD/ECF ex-C9)"}
```
