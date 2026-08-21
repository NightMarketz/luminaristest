> **INSUMO DE PLANEJAMENTO (dossiê/parecer técnico)** — não é BRIEF nem ADR; forks pendentes de ratificação humana (ORCH-006). Gerado por agente em 2026-08-21.

# Dossiê técnico — Validador Determinístico (fatia F-P1-6 da Prensa P1)

**Origem:** `docs/adr/ADR-P1-binding-press.md` §3 item 3 ("Validador determinístico pré-ativação") e §6
fork **F-P1-6** ("Escopo mínimo do validador determinístico"). Este dossiê aprofunda a fatia do
validador — não decide o fork, não ratifica escopo, não implica que a implementação pode começar
(a pré-condição de entrada do ADR-P1 §9 — Parte A + PVA verde — segue aberta).

Escopo deste documento: (a) checklist estrutural completa com evidência de onde cada checagem vive
hoje; (b) design do dry-run/simulação; (c) taxonomia de erros e contrato de saída; (d) onde o veredito
do validador se encaixa no princípio PROPOSED do chat agent. Todo claim sobre código é citação
`arquivo:linha` verificada por leitura real nesta sessão (2026-08-21).

---

## 0. O que já existe vs. o que este dossiê propõe

**Verificado por grep** (`dryRun|dry-run|validateOnly|ROLLBACK_SENTINEL` em `server/src`, 0 resultados)
e por leitura: **nenhum validador determinístico, nenhum dry-run, nenhum conceito de "binding" ou
"papel de conta" existe hoje no código.** O que existe são os precedentes que o validador deve imitar:

- `AccountRepository`/`PostingService.resolveLeafAccount` — existência + folha de uma conta, hoje
  chamado a partir de literais hardcoded no mapper (não de um binding).
- `ReferentialMappingService.applySet`/`resolveDestinationLabel` — o único lugar do código que já
  valida "conta existe + é folha + está viva" **e** "código de destino existe num catálogo versionado
  + é folha do catálogo", com gate re-checado dentro da tx (ACC-011). É o precedente mais próximo do
  que o validador da Prensa precisa fazer para papel→conta.
- `LuminarisAgentService` — o único fluxo PROPOSED→confirmação que existe hoje, mas para linhas de
  `DynamicTable`, não para lançamentos contábeis.

Tudo que este dossiê descreve como "checagem N" ou "contrato de saída" é **proposta de design**, salvo
quando explicitamente marcado como código existente com citação.

---

## 1. (a) Checklist estrutural completa (F-P1-6a)

Convenção de grau: **[código hoje]** = a checagem (ou seu análogo direto) já roda em produção, citado;
**[proposto]** = não existe, desenhado por analogia com um precedente citado.

| # | Checagem | Onde a informação vive HOJE (citação) | Grau | Mensagem de erro proposta |
|---|---|---|---|---|
| 1 | **Arquétipo existe** — o `archetypeId` do binding resolve a um item do catálogo fixo em código | Catálogo não existe ainda; o corpus de 5 arquétipos está implícito em 5 classes de mapper (`ADR-P1-binding-press.md:36-44`, tabela de evidência). Precedente de "catálogo fechado validado contra enum": `ReferentialAccount.isAnalytic` lido de coluna, nunca inferido (master map linha 266, Track B). | proposto | `"Arquétipo '{id}' não existe no catálogo da prensa (v{engineVersion})."` |
| 2 | **Todo slot obrigatório do arquétipo está preenchido no binding** | Precedente de "completude de shape antes de aceitar": `PostEntrySchema` recusa entrada sem `debitCents`/`creditCents`/`accountCode` por linha (`server/src/features/accounting/dtos/PostingDto.ts:52-64`) e o refine que barra linha com D>0 e C>0 simultâneos (`PostingDto.ts:68-69`). O validador aplica o mesmo princípio um nível acima: slot do arquétipo, não campo de DTO. | proposto | `"Slot obrigatório '{slotName}' do arquétipo '{archetypeId}' não foi preenchido no binding."` |
| 3 | **Conta existe** (código resolve a uma linha na tabela `accounts` do tenant) | `AccountRepository.findByCode` (`AccountRepository.ts:17-25`) e `findById` (`:46-54`) — ambos filtram `deletedAt: null` e escopo (`accountingScopeWhere`). Consumido hoje por `PostingService.resolveLeafAccount` (`PostingService.ts:147-158`, lança `ValidationError` se `!account`) e por `ReferentialMappingService.applySet` (`ReferentialMappingService.ts:180-184`, `NotFoundError` anti-enumeração). | **[código hoje]** (a checagem em si; o consumo pelo validador é proposto) | `"Conta '{accountCode}' referenciada no slot '{slotName}' não existe no plano de contas."` |
| 4 | **Conta aceita lançamento** (`acceptsEntries === true`, é folha) | `PostingService.resolveLeafAccount` (`PostingService.ts:152-156`): `if (account.acceptsEntries === false) throw ValidationError(...)`. Mesmo gate em `ReferentialMappingService.applySet` (`ReferentialMappingService.ts:185-189`). | **[código hoje]** | `"Conta '{accountCode}' é sintética (não aceita partidas); o slot '{slotName}' exige conta-folha."` |
| 5 | **Conta ativa** (não soft-deleted no momento da validação) | `findByCode`/`findById` já filtram `deletedAt: null` (`AccountRepository.ts:23,52`) — uma conta soft-deleted simplesmente não é encontrada, cai na checagem #3. O padrão de RE-checar isso especificamente dentro de uma tx de escrita (não o caso do validador, que é leitura) é `ACC-011`, citado em `ReferentialMappingService.ts:178-184` e `IAccountRepository.ts:46-47`. | **[código hoje]** (via #3; sem tabela própria porque soft-delete e "não existe" colapsam na mesma query) | mesma mensagem de #3 (indistinguível de propósito — anti-enumeração, mesmo padrão de `ReferentialMappingService.ts:182-183`) |
| 6 | **Natureza compatível com o papel** (ex.: papel "receita a creditar" só aceita `Account.nature === 'Revenue'`) | **GAP confirmado por leitura.** `Account.nature` existe e é tipado (`ChartOfAccountsFixture.ts:11,16`, enum `AccountNature`), mas **nenhum service hoje valida nature contra o papel/slot** — `resolveLeafAccount` (`PostingService.ts:147-158`) não olha `nature`; o mapper apenas hardcoda o código certo (`SalonSaleFinalizedMapper.ts:22` `DEBIT_ACCOUNT = '1.1.2'`, uma conta `Asset` fixa por escrita no código-fonte, não por checagem em runtime). Esta é a checagem que a Prensa **introduz** — sem ela, um binding mal-configurado poderia creditar receita numa conta `Liability` e nada acusaria até o BP/DRE saírem tortos. | **proposto — é o gap central que o validador fecha** | `"Conta '{accountCode}' (natureza {nature}) não é compatível com o papel '{role}' do slot '{slotName}' (esperado: {allowedNatures})."` |
| 7 | **Sem slot órfão** (binding não referencia um slot que o arquétipo não declara) | Sem precedente direto de "chave desconhecida rejeitada" no domínio de binding; o padrão geral do projeto é DTO `.strict()` (citado em `ReferentialMappingService.ts` comentário de `sourceDocument?` `.strict()`, INCR-8, master map linha 264) — Zod `.strict()` rejeita chave extra. O validador aplica o mesmo princípio no nível do dado do binding: `Object.keys(binding.slots)` deve ser subconjunto EXATO de `archetype.slotNames`. | proposto | `"Binding referencia o slot '{slotName}', que não existe no arquétipo '{archetypeId}'."` |
| 8 | **Versão de binding íntegra** (campo de versão presente, formato válido, e — se já ativo — mudança só entra por recompilação, nunca edição in-place) | Precedente direto: `ReferentialMapping` tem `mappingVersion` string livre, versões **coexistem** via `@@unique([...,mappingVersion])` (master map linha 266, fork D1/D2 do INCR-9). O invariante 4 do ADR-P1 (`ADR-P1-binding-press.md:73-74`) exige o mesmo padrão para o binding: "customização de campo bound = RE-COMPILAR... nunca edição manual do artefato". | proposto (padrão emprestado de INCR-9, código do binding em si não existe) | `"Versão de binding '{version}' inválida ou binding já ativo nesta versão — recompile para gerar v{n+1}."` |
| 9 | **Resolução papel→conta é determinística** (F-P1-5 ainda em aberto — ver §1.1 abaixo) | Depende do fork F-P1-5 (`ADR-P1-binding-press.md:112`). Analisado por opção em §1.1. | proposto, condicional ao fork | ver §1.1 |

### 1.1 Checagem #9 por opção do fork F-P1-5 (papel→conta) — análise sem ratificar

O ADR não decide F-P1-5; este dossiê não decide por ele. As duas opções mudam O QUE o validador
precisa checar:

- **Opção (a) — `accountCode` literal resolvido na compilação.** O binding já carrega o código
  final; o validador roda as checagens #3–#6 **uma vez, na compilação**, contra o `accountCode`
  gravado. Precisa também checar que, se o chart mudar depois (conta arquivada), existe **gatilho de
  recompilação** — sem isso a checagem #9 vira uma foto velha. Não há precedente de "gatilho de
  recompilação por mudança de dependência" no código hoje; seria um novo mecanismo (ex.: hook em
  `AccountRepository.softDelete`, `AccountRepository.ts:63-69`, que hoje não notifica ninguém).
- **Opção (b) — binding carrega o papel; intérprete resolve papel→conta a cada evento.** O validador
  não pode checar um `accountCode` fixo (não existe) — precisa checar que **existe uma entrada de
  lookup papel→conta para o tenant**, e então rodar #3–#6 contra o resultado desse lookup no momento
  da validação. Mais barato de manter em dia (não precisa gatilho de recompilação), mas desloca a
  checagem #6 (natureza) para **toda vez que o intérprete roda em produção** — o que o ADR chama de
  "lookup, não branch" (`ADR-P1-binding-press.md:112`), mas ainda é trabalho de leitura de conta a
  cada postagem, ausente do `resolveLeafAccount` atual.

Nenhuma das duas está implementada; a recomendação não-vinculante do ADR é (a) (`ADR-P1-binding-press.md:112`).

---

## 2. (b) Design do dry-run (F-P1-6b)

### 2.1 O que `runTransaction` permite hoje — verificado

```
public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
```
(`server/src/features/accounting/repositories/PostingRepository.ts:140-142`)

É um wrapper fino sobre `prisma.$transaction` — **sem modo validate-only, sem flag de rollback
deliberado.** `PostingService.postEntry` chama `this.postingRepo.runTransaction(async (tx) => {...
return {...created, postings}; })` e **retorna depois que a tx já commitou** (`PostingService.ts:251-373`).

**Achado estrutural (verificado por leitura, não por memória):** por isso, "chamar `postEntry` sem
modificação e desfazer depois" **não é possível** — quando `postEntry()` retorna, a escrita já está
commitada no SQLite. Não existe um envelope externo que intercepte antes do commit, porque o commit
acontece DENTRO da própria chamada. Qualquer dry-run real precisa ou (i) abrir sua própria transação e
forçar rollback deliberado dentro dela, reusando a MESMA lógica de validação que `postEntry` roda, ou
(ii) parar antes de abrir uma transação, reusando só a fatia de checagens que já roda pré-tx.

### 2.2 O que já roda pré-tx em `postEntry` (reuso possível sem tocar em transação)

Lendo `PostingService.ts:165-249`, boa parte da validação do lançamento **já acontece antes de abrir a
transação**: gate de policy (`:166-168`), preflight de período (`:172`, `assertPeriodOpen`, fora da tx —
`:77-83`), guarda de centavos inteiros + teto `MAX_CENTS` (`:184-199`), invariante de balanceamento
Σdébito=Σcrédito (`:201-206`), e a resolução de cada linha via `resolveLeafAccount` (`:234-247`, que já
cobre as checagens #3/#4 deste dossiê). Só o que é **re-checado dentro da tx por ser mutável entre o
preflight e o commit** fica de fora: `assertPeriodOpenTx` (`:253`, TOCTOU de período) e o gate de
dimensão obrigatória no commit (`:255-277`).

Isso importa para o fork: uma simulação que só reusa a fatia pré-tx (sem abrir transação nenhuma) já
fecha as checagens estruturais #3, #4, #6 (se estendida) e o balanceamento — é bem mais barata que abrir
e reverter uma tx real, e não exige tocar `PostingService.ts`. O que ela **não** fecha é justamente o
TOCTOU de período/dimensão — mas isso é aceitável **por desenho**, não por descuido: o validador roda
no momento da compilação do binding, não no momento de cada postagem real; a proteção TOCTOU continua
sendo a responsabilidade do `postEntry` real quando o binding compilado é efetivamente executado em
produção (T6 permanece intocado — o intérprete de runtime chama o `postEntry` real, com seu próprio gate
in-tx, sempre).

### 2.3 Duas opções de design, avaliadas contra o não-objetivo do ADR-P1 §8

O ADR-P1 lista como não-objetivo: **"Não toca `PostingService`/`PeriodService`/`AuditService`/repos do
ledger (núcleo imutável)"** (`ADR-P1-binding-press.md:126`).

- **Opção A — Reuso read-only das validações pré-tx (sem transação nenhuma).** Um serviço novo
  (`BindingValidatorService`, fora de `features/accounting`, no pipeline de geração — conforme
  invariante 6 do ADR, `ADR-P1-binding-press.md:81-82`) compila 1 `PostEntryInput` sintético a partir
  do binding + dados de exemplo, e chama as MESMAS validações que `postEntry` roda pré-tx — não por
  importar `PostingService` e invocar um método novo nele, mas por **duplicar deliberadamente** a
  lógica já pública via `AccountRepository`/regras de centavos/balanceamento (todas leitura pura, sem
  tx). Não abre transação nenhuma ⇒ zero mudança em `PostingService.ts`/`PostingRepository.ts` ⇒
  compatível com o não-objetivo §8 ao pé da letra. Custo: cobre uma fatia menor que "exercitar o
  caminho real" (não fecha o TOCTOU de período/dimensão — ver §2.2, aceitável pelos motivos ali).
- **Opção B — Simulação com rollback deliberado dentro de uma tx real.** Exigiria expor de
  `PostingService` uma variante interna reusável tanto pelo `postEntry` real quanto por um caminho de
  simulação (ex.: extrair o corpo de `:251-373` para um método privado parametrizado por
  `{ commit: boolean }`, ou o validador abre sua própria `prisma.$transaction` e roda uma cópia da
  lógica interna terminando em `throw` deliberado — capturado pelo chamador como sucesso). Qualquer
  uma das duas formas **toca `PostingService.ts`** (refatoração do método ou exposição de uma
  superfície nova nele) — o que colide literalmente com o não-objetivo §8. A recomendação do ADR para
  F-P1-6 é a opção (b) — simulação —, mas o próprio ADR não reconcilia isso com seu §8; **esta é uma
  tensão de design que o dono precisa resolver, não algo que este dossiê decide.**

**Conclusão sem decidir o fork:** se F-P1-6 for ratificado como (b) — simulação —, o §8 do ADR
("não toca PostingService") precisa ser lido como "não muda o COMPORTAMENTO/contrato público de
`postEntry`", não como "nenhuma linha do arquivo muda" — senão as duas cláusulas do próprio ADR se
contradizem. Isso é exatamente o tipo de caso que a política de raciocínio T3 do projeto pede para
declarar explicitamente (regra se aplica primeiro a quem a propõe).

---

## 3. (c) Taxonomia de erros e contrato de saída

### 3.1 Bloqueante vs. aviso

**Bloqueante** (binding não ativa enquanto existir 1 item): checagens #1–#9 da §1 falhando —
arquétipo desconhecido, slot vazio, slot órfão, conta inexistente/não-folha/inativa, **natureza
incompatível com o papel** (nunca é aviso — corromperia BP/DRE estruturalmente, mesma classe de dano
que o Motor de Regras rejeitado no master map §4 tentava evitar sem validação), versão de binding
malformada ou tentativa de editar em vez de recompilar.

**Aviso** (binding ativa, mas o validador sinaliza para revisão humana): situações onde o precedente
de `ReferentialMappingService.resolveDestinationLabel` já estabelece o padrão de tolerância
condicional — "catálogo não carregado → cai para comportamento livre, sem rejeitar" (`ReferentialMappingService.ts:236-238,257-264`).
Por analogia, propostas de aviso (não têm precedente 1:1 porque o binding em si não existe; são
inferidas do mesmo princípio de tolerância graduada):
- Conta-alvo do slot nunca recebeu lançamento até agora (recém-criada / zerada) — informativo, não
  estrutural.
- Simulação (se F-P1-6b) produz magnitude de centavos fora da faixa típica do arquétipo — heurística
  de sanidade, não invariante.

### 3.2 Contrato de saída proposto

```ts
interface BindingValidationIssue {
  code: 'ARCHETYPE_UNKNOWN' | 'SLOT_UNFILLED' | 'SLOT_ORPHAN' | 'ACCOUNT_NOT_FOUND'
      | 'ACCOUNT_NOT_LEAF' | 'ACCOUNT_INACTIVE' | 'NATURE_MISMATCH' | 'VERSION_INVALID'
      | 'ROLE_LOOKUP_MISSING'; // só sob fork F-P1-5(b)
  slot?: string;
  accountCode?: string;
  message: string; // PT-BR, mesmo estilo de ValidationError já usado em todo o domínio
                    // (ex. PostingService.ts:150-157, ReferentialMappingService.ts:186-189)
}

interface BindingValidationResult {
  ok: boolean;              // true ⇔ blocking.length === 0
  blocking: BindingValidationIssue[];
  warnings: BindingValidationIssue[];
  simulatedEntry?: { lines: { accountCode: string; debitCents: number; creditCents: number }[] };
  // presente só se F-P1-6b for ratificado
}
```

O estilo de mensagem (string PT-BR completa, sem código de erro exposto ao usuário final) espelha o
padrão já usado em todo `ValidationError`/`NotFoundError` do domínio contábil (import consistente em
`PostingService.ts:1`, `ReferentialMappingService.ts:2`) — o validador não inventa um novo vocabulário
de erro, estende o existente.

---

## 4. (d) Onde o veredito do validador se encaixa no princípio PROPOSED

### 4.1 O que existe hoje é de `DynamicTable`, não de binding contábil — verificado

O único fluxo PROPOSED→confirmação implementado é `LuminarisAgentService` (`server/src/features/chat/services/LuminarisAgentService.ts`):
o agente chama `request_record_creation`/`request_record_update`, que grava um `ActionProposal` com
`status: 'PENDING'` e devolve `{ status: 'PROPOSED', proposalId }` (`:141-179`); a UI mostra um modal;
a confirmação do usuário chama `executeProposal(user, proposalId)`, que lê o `ActionProposal` e só
então escreve de fato via `dynamicTableService.createTableData`/`updateTableData` (`:189-223`).

**Ponto verificado que muda a analogia:** `executeProposal` **não roda nenhuma validação semântica
própria antes de escrever** — ele confia inteiramente na validação que `createTableData` já faz
(`DynamicTableService.ts:561`, `validateDataAgainstSchema` + `validateAdvancedRules`, chamadas DEPOIS
da confirmação, na hora de gravar). Ou seja: no fluxo de `DynamicTable`, o dado só é semanticamente
validado no momento da escrita, não no momento da proposta — um LLM poderia propor um valor de campo
inválido e o modal de confirmação mostraria isso sem avisar, falhando só quando o usuário confirma.

### 4.2 Onde o validador do binding se diferencia — e por quê isso é intencional

O ADR-P1 invariante 3 (`ADR-P1-binding-press.md:72`) pede o oposto do que `DynamicTable` faz hoje:
"binding proposto pela IA passa por validador determinístico **antes de ativar**" — ou seja, o gate
tem que rodar **entre a proposta e a exibição/confirmação**, não só na escrita final. Isso é coerente
com o motivo do domínio: um binding mal-configurado, se ativado, começa a postar lançamentos reais
todo santo dia — o custo de deixar passar até a "escrita final" (a primeira postagem de produção) é
ordens de grandeza maior que deixar passar um campo de `DynamicTable` até o clique de confirmação.

**Desenho proposto (por analogia, não é código existente):**

1. A entrevista/engine de geração (`features/interview/*` — hoje sem hook de binding; ver
   `interview/InterviewService`, `interview/CustomizationService`) produz um binding candidato.
2. O binding candidato é persistido com um status análogo a `ActionProposal.PENDING` — mas a
   analogia para no nome do campo; o schema em si é do fork F-P1-2 (JSON no `SystemPreset` vs. tabela
   própria), não decidido.
3. **Aqui, diferente do fluxo `DynamicTable`, o validador determinístico (F-P1-6) roda ANTES de
   qualquer confirmação humana ser solicitada** — não é um passo opcional de UI, é um gate de código
   que roda sempre, sem IA (invariante 3 do ADR).
4. Se `blocking.length > 0`: o binding não é oferecido para confirmação — ou volta para a IA
   corrigir os slots, ou escala para revisão humana com a lista de `BindingValidationIssue[]` (§3.2)
   como texto explicativo, no mesmo estilo de mensagem PT-BR já usado no domínio.
5. Se `ok === true` (avisos tolerados): só então o binding é oferecido para confirmação — o passo
   equivalente ao clique do modal em `LuminarisAgentService.executeProposal`, mas aqui o clique
   confirma um artefato JÁ deterministicamente validado, não um dado cru de IA.
6. A ativação em si (troca de mapper à mão pelo binding compilado, F-P1-3) seria o evento que grava o
   binding como versão ativa — mesma disciplina de "nunca edição manual, sempre recompilar"
   (invariante 4).

**Nada dos passos 1, 2, 4, 6 acima existe em código hoje** — são inferência de design a partir do
ADR + do único precedente de propose/confirm que o repo tem. O passo 3 é o próprio objeto deste
dossiê (§1–§3) e também não existe.

---

## 5. Resumo dos gaps confirmados por leitura (não por memória)

1. Não existe catálogo de arquétipos em código — só 5 classes de mapper com lógica hardcoded (checagem #1).
2. Não existe checagem de natureza-por-papel em lugar nenhum do domínio contábil hoje (checagem #6) —
   é o gap mais sério, porque sua ausência é silenciosa (nada quebra até o BP/DRE saírem errados).
3. `runTransaction` não tem modo dry-run/validate-only (verificado por grep negativo + leitura de
   `PostingRepository.ts:140-142`).
4. `postEntry` commita internamente antes de retornar — um "wrap e desfaz" externo sem tocar
   `PostingService.ts` **não é estruturalmente possível** (achado de leitura, §2.1).
5. O ADR-P1 tem uma tensão não resolvida entre recomendar F-P1-6(b) (simulação) e o não-objetivo §8
   ("não toca PostingService") — sinalizado em §2.3, não resolvido aqui.
6. Não existe hook de binding em `features/interview/*` — o encaixe do §4 é inferência sobre um
   fluxo que ainda não tem nenhuma linha de código.
