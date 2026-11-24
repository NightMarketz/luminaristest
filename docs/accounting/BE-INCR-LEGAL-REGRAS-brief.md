# BE-INCR-LEGAL-REGRAS — BRIEF: motor de leis da plataforma (a forma da regra legal também vira dado)

**Estado:** BRIEF escrito em 14/11/2026 pela `sessao-planejamento`. **Forks: RATIFICAÇÃO PENDENTE** (§5). Não é `executa`.
**Nó:** [[LEGAL-REGRAS]] (plataforma; continuação do [[LEGAL-PARAMS]]). **Decisão que o abre:** [[D-2026-11-14-MOTOR-DE-LEIS]].
**Escopo:** backend. O editor de regra no front é nó vizinho (`FE-INCR-*`, §8).
**Revisão independente (15/11):** [`docs/adr/revisoes/REVIEW-pais-na-borda-e-motor-de-leis-2026-11-15.md`](../adr/revisoes/REVIEW-pais-na-borda-e-motor-de-leis-2026-11-15.md)
— **incorporada em 15/11.** O BRIEF passa a ter um fork anterior a todos, **F-ML-0** (§0.2): construir este motor, ou
adotar a alternativa sem motor (variantes de código por vigência). **Enquanto F-ML-0 não for decidido, os itens ML-1..27 e
os demais forks ficam suspensos.** O ML-15 foi reescrito e o §5.1 traz a posição da revisão fork a fork.
**Substitui** o rascunho `BE-INCR-DP-MOTOR-LEIS-brief.md` desta mesma data (nunca commitado), que punha o motor dentro do DP.

## 0. Autorização e o que este BRIEF muda

**Autorização (dono, chat, 14/11/2026), em ordem:**
1. *"Basta construir aqui tbm um motor em que vc encaixa as leis e pode modificar apenas as leis e o comportamento vai se
   modificando com mais facilidade"* (sobre o DP).
2. *"Acho que podemos abstrair e criar um motor de leis para o projeto todo, não?"*
3. *"Sim, reescreve"* (resposta a "Reescrevo o BRIEF como motor de leis da plataforma, com nó próprio?").

Antes, o princípio de 06/11: *"uma mudança em escala ou em leis não pode mudar de fato alguma coisa além de fórmulas pra
nós"* ([[D-2026-11-06-DP-BRIEF-F2]]).

**Cobre exatamente o item?** Cobre o BRIEF e o nó do motor **de plataforma**. **Não cobre:** o `executa` (forks da §5
ratificados + `executa` do dono, D-2026-10-28-FLUXO-AUTONOMO); a migração de cálculo fiscal que já roda (cada uma é
decisão própria, F-ML-11); o editor no front.

**O que isto reabre.** F-DP-5 / F-PES-9 (a) (dono, 02/11 e 12/10: *"Código + CCT como dado"*; fórmula interpretada seria
*"irmão do rejeitado R-motor-regras"*) e o limite declarado no BRIEF do F2 §0.1 (*"lei que traga uma regra de forma nova
ainda pede PR de código com teste. Tirar esse limite seria reabrir o F-DP-5, e isso é fork à parte"*). A forma da regra
passa a ser dado publicado com vigência; o código guarda só as **primitivas**.

**O que não reabre (fronteiras do motor, ML-23):**
- [[R-motor-regras]]: motor que **gera lançamento**. Aqui a saída é valor + prova; quem lança no razão é código revisado.
- [[R-motor-dominio]] (`docs/adr/ADR-DOMAIN-MOTOR-rejected.md`, lido): ciclo de vida por fases, workflow em DAG, registry
  de plugins, AuditLog central, fila. O motor de leis não tem nenhum deles: é função pura que devolve valor, sem ordem de
  passos, sem transação, sem fila própria (F-ML-3). Aquele ADR só se reabre pelos gatilhos do seu §3; **este BRIEF não o
  reabre**, e o ADR do ML-23 tem de dizer isso com todas as letras. Um argumento de lá vale aqui e está no F-ML-11:
  *"Migração 'por incidente' para um engine deixa metade do sistema em cada regime indefinidamente"*.
- Fronteira DynamicTable × Prisma (`ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`): o motor é só para regra
  que **a lei** desenha. Não é motor de regra do usuário, não entra no `DynamicTableService`, em `RuleContext` nem em plugin.
- Leiautes e serializers (SPED, ECD/ECF, XML de NF-e/NFS-e, XSD do eSocial e da Reinf): são estrutura, não fórmula.
- SQLite, `AccountingScope`, centavos `bigint`, vigência por data de efeito, snapshot do que foi usado.

## 0.2 Antes de tudo: motor × variantes por vigência (F-ML-0 — RATIFICAÇÃO PENDENTE)

A revisão independente (finding 1) pôs a pergunta que decide este BRIEF: **o motor muda onde a lei é escrita, não quem a
escreve.** Fatos conferidos no código: só `PLATFORM_ADMIN` propõe e publica (`LegalParameterPolicy.ts:13`); não existe tela
de edição; o `write_set` do nó prevê carga em SQL (`legal_parameters_lei_regra_v1.sql`). Com isso, mudar uma regra seguiria
sendo um PR revisado, agora em JSON e **sem a checagem de tipos do `tsc`**. E o `ADR-PERSISTENCE-BOUNDARY…md` (linha 27)
lista *"regra legal codificada com tipo em compilação"* como propriedade do núcleo que a lei desenha.

No repositório há **três** mudanças de **forma** trazidas por lei, todas com data de efeito conhecida: a janela do RBT12
(LC 214), o divisor da EC 141 e a licença-paternidade (Lei 15.371). O que já é só número está em `LegalParameter`.

| | **(a) Motor de leis** (este BRIEF) | **(b) Variantes de código por vigência** (alternativa A1 da revisão) |
|---|---|---|
| O que é | Regra como árvore de expressão em `LEI_REGRA`, interpretada | Um ajudante `porVigencia([{ desde, impl, fonte }, …])` escolhe a função TypeScript tipada pela data de efeito e registra no snapshot qual rodou |
| Mudar a forma de uma regra | Publicar uma linha (API), sem deploy — **se** alguém escrever o JSON certo | PR com a função nova e a data; deploy |
| Checagem | Zod + exemplos escritos por quem escreve a regra | `tsc` + testes + exemplos |
| Regimes de cálculo | Dois, sem prazo (código × regra), até migrar tudo | Um só |
| Custo | 6 PRs, ADR, vocabulário por domínio, registro de recálculo que hoje não existe | Cerca de um PR pequeno |
| Prova de qual lei valeu | id da linha no snapshot | nome da variante e `fonte` no snapshot |
| Atende "modificar apenas as leis" | Sim para fórmula; não para algoritmo, rubrica nova e leiaute | Não: toda mudança de forma é código. Atende "a lei muda num lugar só, com data" |

**Recomendação revista (15/11): (b) agora; (a) só se a resposta à pergunta abaixo for "uma pessoa publica, sem PR".**
Motivo: com três casos conhecidos e quem escreve sendo um agente num PR, (b) entrega a vigência e a rastreabilidade com um
regime só e com tipos. O motor passa a valer a pena quando existir quem publique regra sem deploy (contador ou
administrador numa tela ou pela API) **e** um oráculo que não seja o próprio autor da regra. (b) não fecha a porta: uma
variante pode, no futuro, ser "interpretar a regra publicada".

**Pergunta que só o dono responde:** em 2027, quem escreve uma mudança de regra — um agente num PR, ou uma pessoa
publicando pela API ou por uma tela, sem deploy?

## 1. O que existe (fato consumado a respeitar)

| Peça | Onde | Grau | Papel neste BRIEF |
|---|---|---|---|
| `LegalParameter`: 46 tabelas; `valorInt/Texto/Json`, `fonte`, `fonteSha256`, vigência date-only, `DRAFT→PUBLISHED→REVOKED`, `supersedesId` | `features/legalParameters/models/legalParameter.ts` | lido | **Hospeda** a regra (F-ML-2) |
| Formato por tabela: `REGRAS`, `exigirFormato`, validado no `propose` **e** no `publish` | `legalParameters/models/formatoLinha.ts`; `LegalParameterService.ts:210-296` | lido | Onde entra a validação estática da regra |
| Rotas `GET /`, `GET /vigente`, `GET /recalc-jobs`, `POST /` (propor), `POST /:id/publish`, `POST /:id/revoke` em `/api/legal-parameters`; policy `exigirGestao` | `routes/legalParameters.ts:17-22`; `routes/index.ts:83` | lido | Reuso integral; só `simular` é rota nova |
| Auditoria `legal_parameter.proposed/published/revoked` na corrente `PLATFORM` | `LegalParameterService.ts` | lido | Reuso; nenhum `eventType` novo |
| Fila de recálculo na mesma tx do `publish` (`recalcJobs.create(id, 'PUBLISHED', tx)`) | `LegalParameterService.ts:290` | lido (o processador da fila **não** foi lido) | A regra publicada entra na mesma fila (ML-15) |
| Leitor "ausente ⇒ erro, nunca padrão": `exigirLinhaVigente`, `ParametroLegalAusenteError` | `legalParameter.ts` | lido | Resolução por data |
| DP: `FOLHA_REGRA` (25 números), `DP_CATEGORIA_ENCARGO`, 18 calculadoras puras `{valor, prova}`, `CalcNode` | `features/dp/models/regrasFolha.ts`, `folha/*.ts`, `folha/calcNode.ts`, `folha/rubricaCalculo.ts` | lido | Primeiro domínio a adotar |
| Fiscal: `janelaRbt12` escolhe entre LC 123 art. 18 §1º e LC 214 art. 517 por `INICIO_LC214 = '2027-01'` em código | `features/accounting/models/simplesCalc.ts:185-200` | lido | Exemplo fiscal de forma em código (lacuna `L-20261114-214052-b25f`) |
| Outros consumidores de linha legal: 47 arquivos em `features/accounting` (16 em `models/`, 31 em `services/`), 3 em `lib/` (`sped.ts`, `nfe.ts`, `ecf.ts`), 2 em `features/packages` | grep de `linhaLegalVigente\|exigirLinhaVigente\|linhasVigentesDaTabela\|fotografia(` | **localizado, não lido** | Candidatos a adoção futura (F-ML-11); nenhum é migrado por este BRIEF |
| Spec externa §6: `Expr` e "grafo de rubricas" | `docs/dp/SPEC-DP-2026-10-31-katz.md` | lido | Insumo, não ADR |

## 2. Checklist de comportamentos (cada um testável isoladamente)

Convenções: dinheiro em centavos `bigint`; frações exatas `{num, den}` em `bigint`; taxas em bp; datas date-only;
**nenhum arredondamento fora de `arredonda`**; nenhum `number` fracionário.

**A. Núcleo (função pura, sem Prisma, sem conhecer domínio)**
- **ML-1.** `Expr` é união fechada (§3.1), validada por Zod `.strict()`; tipo desconhecido ⇒ erro com o tipo e o caminho.
- **ML-2.** Valores tipados: `cents`, `fracao`, `int`, `bool`, `data`, `texto`. Tipos incompatíveis ⇒ erro na **publicação**.
- **ML-3.** `avaliar(expr, contexto) → { valor, prova }`; a prova tem um nó por operação e por função, com `fonte`
  (`LP:<id>` da regra e `urn#artigo` da citação). Formato da prova: o `CalcNode` do DP, **movido** para o núcleo (o DP
  passa a importá-lo de lá; sem mudança de forma).
- **ML-4.** Funções **fechadas**, cada uma uma primitiva TS com teste: `min`, `max`, `arredonda(modo)`,
  `faixasProgressivas(base, tabela)`, `proporcional(num, den)`, `diasEntre`, `mesesInteirosEntre`, `somaMeses`, `avos`.
  Função fora da lista ⇒ recusa. **Primitiva nova é PR de código** (F-ML-8).
- **ML-5.** Limites duros: profundidade ≤ 32, nós ≤ 256, sem laço, sem recursão, sem `eval`, sem relógio (a data de
  referência vem do contexto). Estouro ⇒ recusa na publicação.
- **ML-6.** Determinismo: mesma regra + mesmo contexto ⇒ mesmo valor **e** mesma prova (propriedade, `fast-check`).
- **ML-7.** `param(tabela, chave, disc?)` lê `LegalParameter` na data de referência; ausente ⇒
  `ParametroLegalAusenteError`.
- **ML-8.** `regra(chave)` referencia outra regra **do mesmo domínio e de ordem menor**; senão, recusa. Sem grafo.

**B. Vocabulário por domínio (a abstração)**
- **ML-9.** Registro `DOMINIOS_DE_REGRA`: cada domínio declara `{ chave, variaveis: Record<VarNome, Tipo>, descricao }` em
  código, no próprio domínio, e o núcleo só conhece a interface. A regra declara o seu `dominio`.
- **ML-10.** Variável fora do vocabulário do domínio da regra ⇒ recusa na publicação (`EXPR_VAR_FORA_DO_VOCABULARIO`).
- **ML-11.** Cada domínio fornece `montarContexto(entrada do domínio) → Record<VarNome, Valor>`; o núcleo **não** lê
  snapshot, apuração nem banco. Variável declarada e não entregue pelo contexto ⇒ erro nomeando a variável.
- **ML-12.** Domínio inicial: `folha` (DP). Um domínio novo entra com vocabulário + `montarContexto` + pelo menos uma
  regra com equivalência (ML-20); não há domínio "genérico".

**C. Armazenamento e ciclo de vida (reuso do `LegalParameter`)**
- **ML-13.** Tabela nova `LEI_REGRA` em `LEGAL_PARAMETER_TABELAS` e em `TABELAS_MIGRADAS`; regra de formato em
  `formatoLinha.ts` (§3.2). `propose` e `publish` já chamam `exigirFormato`: a validação estática (ML-1, 2, 4, 5, 8, 10 e
  citação completa) entra por aí, sem rota nova.
- **ML-14.** No `publish`, dentro da tx e depois do formato: **todos os exemplos da regra avaliam ao esperado** contra as
  linhas publicadas (F-ML-6). Falha ⇒ 400 `LEI_EXEMPLO_FALHOU` com esperado × obtido; nada é publicado.
- **ML-15 (reescrito em 15/11; a versão anterior estava errada).** O `publish` enfileira um job para **toda** linha
  (`LegalParameterService.ts:290`), e o processador que existe (`accounting/services/TaxAssessmentRecalcService.ts`) é
  fiscal: `familiasDaLinha` devolve `[]` para tabela que não conhece e o job é marcado como concluído. Logo, sem mudança,
  uma `LEI_REGRA` publicada seria **consumida em silêncio** e nenhum recálculo de folha rodaria. Duas saídas, a decidir
  (F-ML-14): (a) a fila ganha um registro por domínio, e o processador sai de `features/accounting` para a plataforma;
  (b) `LEI_REGRA` não entra na fila: publicar regra não recalcula nada sozinho, e o recálculo é ação explícita do domínio
  (coerente com F-ML-10). Em qualquer das duas, teste que prova que um job de `LEI_REGRA` **não** é dado como concluído
  sem ter rodado.
- **ML-16.** Resolução por data com `exigirLinhaVigente`; revogar a substituta devolve a anterior (L-7 existente; teste
  novo para `LEI_REGRA`).
- **ML-17.** Auditoria pelos eventos `legal_parameter.*` que já existem. O payload não carrega a `Expr` (pode ser
  grande): carrega `fonteSha256` e o sha do `valorJson`; teste de allowlist cobre o campo novo.
- **ML-18.** Quem calcula guarda os ids das linhas `LEI_REGRA` usadas junto do que já guarda (snapshot por apuração do
  LEGAL-PARAMS; snapshot da folha no DP). Publicar regra com vigência posterior **não muda** um cálculo antigo
  reexecutado (teste por domínio).

**D. Adoção (por domínio, um cálculo por vez)**
- **ML-19.** Cada domínio ganha um mapa "resultado → regra **ou** função em código"; resultado sem nenhuma das duas não
  compila. No DP, é o `RUBRICA_CALCULO` (`folha/rubricaCalculo.ts`) com a alternativa `regra: <chave>`.
- **ML-20.** Antes de trocar uma função por regra: teste de **equivalência** por propriedade (função em código × regra
  interpretada, ≥ 1 000 casos com `fast-check`) e, depois da troca, teste com **duas** fotografias de regras (a vigente e
  uma alterada) exigindo resultados diferentes.
- **ML-21.** Ordem no DP: `horaExtra`, `adicionalNoturno`, `dsrSobreVariaveis`, `descontoFaltas`, `afastamentoEmpresa`,
  `adiantamento`, `salarioFamilia`, `complementoMinimo`; por último `inssEmpregado` e `irrfMensal` (`faixasProgressivas`).
- **ML-22.** Regras novas do F3 nascem como `LEI_REGRA` (licença-paternidade 10/15/20 dias por data de efeito, Lei
  15.371 art. 11; aviso prévio proporcional; intervalo suprimido — [[D-2026-11-14-DP-ESCOPO-LACUNAS-2]]). **O conteúdo
  legal de cada uma passa por `VERIFICACAO-LEGAL.md` antes de publicar** (§6).

**E. Fronteiras e superfície**
- **ML-23.** ADR curto `docs/adr/ADR-MOTOR-DE-LEIS.md` com as fronteiras do §0 e regra nova no `check:arch` (com
  baseline antes/depois e prova por plantio, como manda o `ADR-ARCH-BOUNDARIES.md` §5): o núcleo
  (`features/legalParameters/models/regra/**`) não importa Prisma, serviço, repositório nem outra feature; e nenhum
  arquivo de `features/dynamicTables/**` importa o núcleo.
- **ML-24.** Rota nova única: `POST /api/legal-parameters/regras/simular` — avalia uma regra (inclusive DRAFT) contra
  entradas informadas e devolve valor + prova, **sem gravar**; `exigirGestao`. Propor, publicar, revogar, listar e
  vigente usam as rotas existentes.
- **ML-25.** Erros de publicação saem como **lista**, cada um com código estável e caminho na árvore (`/args/1/args/0`).
- **ML-27.** *(só se F-ML-13 (a))* Jurisdição como dado: `LeiRegraJson.jurisdicao` (ISO 3166-1 alfa-2), **hoje só `'BR'`
  é aceito**; o registro de domínio é chaveado por `(jurisdicao, chave)`; o núcleo não tem literal de país nem de moeda, e
  o valor monetário é "unidade mínima" com o expoente vindo do contexto (teste: a mesma regra avaliada com expoente 2 e
  com expoente 0 arredonda certo nos dois). Nenhum pacote de outro país é construído.
- **ML-26.** Gates do diff: snapshot de DTO, paridade i18n pt/en das mensagens, OpenAPI (o `BASELINE` de path-count está
  congelado: a rota nova entra pela via que as rotas `/api/dp/*` usaram), `check:arch`, classificação da tabela nova no
  que o LEGAL-PARAMS exigir (`linhasPublicadasForaDoFormato`).

## 3. Contratos (esboço materializável)

### 3.1 `Expr` e avaliação

```ts
type Tipo = 'cents' | 'fracao' | 'int' | 'bool' | 'data' | 'texto';

type Expr =
  | { k: 'lit'; tipo: Tipo; v: string }                         // sempre string; o interpretador parseia
  | { k: 'var'; nome: string }                                  // validado contra o vocabulário do domínio
  | { k: 'param'; tabela: LegalParameterTabela; chave: string; disc?: string; campo: 'int' | 'texto' | 'json' }
  | { k: 'regra'; chave: string }                               // mesmo domínio, ordem menor
  | { k: 'op'; op: '+' | '-' | '*' | '/' | '<' | '<=' | '==' | '>=' | '>' | 'e' | 'ou' | 'nao'; args: Expr[] }
  | { k: 'se'; cond: Expr; entao: Expr; senao: Expr }
  | { k: 'fn'; fn: FnNome; args: Expr[] };                      // FnNome = lista fechada do ML-4

interface Contexto { dataRef: string; vars: Record<string, Valor>; fotografia: readonly LinhaLegal[] }
declare function avaliar(expr: Expr, ctx: Contexto): { valor: Valor; prova: CalcNode };   // pura
```

### 3.2 `LEI_REGRA` — `valorJson` de uma linha de `LegalParameter`

```ts
interface LeiRegraJson {
  schemaVersao: 1;
  dominio: string;                         // chave de DOMINIOS_DE_REGRA ('folha', …)
  resultado: { nome: string; tipo: Tipo }; // o que a regra devolve; o domínio liga ao seu mapa (ML-19)
  ordem: number;                           // inteiro; ML-8
  expr: Expr;
  citacao: { urn: string; artigo: string; trechoSha256: string; versaoTexto: string };   // acervo ctresb/leis ou oficial
  exemplos: { dataRef: string; entradas: Record<string, string>; esperado: string; nota?: string }[];   // ≥ 1
}
// linha: tabela 'LEI_REGRA'; chave = código da regra ('PATERNIDADE_DIAS'); discriminador = domínio;
// vigenteDesde/vigenteAte e status vêm da linha; `fonte` = urn#artigo; `fonteSha256` = sha do trecho citado.
```

### 3.3 Registro de domínio

```ts
interface DominioDeRegra<E> {
  chave: string;
  variaveis: Record<string, Tipo>;
  montarContexto(entrada: E): Record<string, Valor>;
  recalcular?(regraId: string): Promise<{ afetadas: number }>;   // chamado pelo processador da fila (ML-15)
}
```

### 3.4 Códigos de erro

`EXPR_TIPO_DESCONHECIDO`, `EXPR_TIPO_INCOMPATIVEL`, `EXPR_VAR_FORA_DO_VOCABULARIO`, `EXPR_FN_FORA_DA_LISTA`,
`EXPR_LIMITE_EXCEDIDO`, `EXPR_REGRA_ORDEM_INVALIDA`, `LEI_DOMINIO_DESCONHECIDO`, `LEI_CITACAO_INCOMPLETA`,
`LEI_SEM_EXEMPLO`, `LEI_EXEMPLO_FALHOU`.

## 4. Divisão em PRs (proposta; um PR por bloco, merge na ordem, pilha máxima 2)

| PR | Conteúdo | Itens | Muda comportamento? |
|---|---|---|---|
| **PR-0** | ADR + regra do `check:arch`; núcleo: tipos, `Expr`, valores exatos, interpretador, primitivas, `CalcNode` movido | ML-1..8, 23 | Não (função pura, sem rota) |
| **PR-1** | Registro de domínio e vocabulário; `LEI_REGRA` (tabela, formato, exemplos no `publish`, auditoria) | ML-9..14, 16, 17 | Sim: tabela nova no enum; gate novo no `publish` |
| **PR-2** | Rota `simular`, erros em lista, DTO, OpenAPI, i18n | ML-24..26 | Sim: rota nova |
| **PR-3** | Fila de recálculo para `LEI_REGRA` e ids de regra no que cada cálculo guarda | ML-15, 18 | Não até haver regra publicada |
| **PR-4** | DP adota: vocabulário `folha`, mapa rubrica↔regra, migração com equivalência | ML-12, 19..21 | Não (equivalência provada) |
| **PR-5** | Primeiras leis como regra (F3 do DP) | ML-22 | Sim: linhas novas |

**Relação com o que está em curso:** PR-0 a PR-2 não dependem do F2 do DP. O vocabulário `folha` (PR-4) e o ML-18 no DP
dependem do snapshot do F2 (PR-3 **dele**, ainda não feito). Nada aqui para o `executa` do F2.

## 5. Forks — RATIFICAÇÃO PENDENTE (nenhum se auto-ratifica)

| Fork | Caminhos | Recomendação e justificativa | Status |
|---|---|---|---|
| **F-ML-1** Linguagem | (a) AST fechada em JSON; (b) texto com parser próprio que compila para a AST; (c) texto com sandbox/`eval` | **(a)**. Sem `eval`, validável por Zod, prova nasce da árvore. (b) pode vir depois como açúcar; (c) reabre `eval` | PENDENTE |
| **F-ML-2** Onde guardar | (a) `LegalParameter`, tabela `LEI_REGRA`; (b) model Prisma novo | **(a)**. Reuso integral de vigência, fonte, sha, ciclo, rotas, policy, auditoria e fila de recálculo (§1) | PENDENTE |
| **F-ML-3** Ordem de avaliação | (a) inteiro `ordem`, sem grafo; (b) grafo com ordenação topológica (spec §6) | **(a)**. [[R-motor-dominio]] rejeitou DAG; ciclo fica impossível por construção | PENDENTE |
| **F-ML-4** O que mais vira dado no DP | (a) só a regra de valor; catálogo de rubricas (natureza e incidência) segue em código; (b) a rubrica também é dado | **(a) agora, (b) como fase seguinte**. Com (a), lei que cria rubrica **nova** ainda pede PR; "modificar apenas as leis" só se cumpre por inteiro com (b) | PENDENTE |
| **F-ML-5** Ordem frente ao F2 do DP | (a) F2 PR-3..PR-6 seguem; motor em paralelo; migração depois; (b) parar o F2 e refatorar; (c) só F3 em diante usa regra | **(a)**. O `executa` do F2 vale; a equivalência (ML-20) permite migrar sem risco | PENDENTE |
| **F-ML-6** Exemplos obrigatórios | (a) ≥ 1 exemplo e todos passam no `publish`; (b) opcional | **(a)**. É o oráculo de uma regra transcrita de lei; sem ele, "mudar só a lei" é mudar sem teste | PENDENTE |
| **F-ML-7** Quem publica | (a) o papel que já publica `LegalParameter` (`exigirGestao`); (b) papel novo com passo do contador | **(a)**. Mesmo risco, mesma policy; o contador valida o conteúdo fora do sistema (runbook) | PENDENTE |
| **F-ML-8** Limite que sobra | (a) aceitar que primitiva nova pede PR; (b) linguagem Turing-completa | **(a)**. (b) é o `eval` rejeitado. Algoritmo que não é fórmula (segregação do Simples, fator R, rateio) fica como primitiva em código, parametrizada por dado | PENDENTE |
| **F-ML-9** Onde mora o núcleo | (a) `features/legalParameters/models/regra/`; (b) `lib/` | **(a)**. Fica ao lado do dado que hospeda a regra; todo consumidor já importa `legalParameters`, então não nasce aresta nova. `lib/` é para serializer puro (regra F1) | PENDENTE |
| **F-ML-10** Retroativo | (a) cálculo antigo reexecuta com as regras **da época**; recálculo com regra nova é ação explícita (a fila) e gera diferença | **(a)**. É o que o LEGAL-PARAMS já faz com números | PENDENTE |
| **F-ML-11** Adoção fora do DP | (a) por gatilho: um cálculo fiscal só vira regra quando a lei o muda ou quando nasce novo, com equivalência; (b) migrar tudo o que lê `LegalParameter`; (c) só o DP, para sempre | **(a)**, com o custo dito: a apuração fiscal já roda e depende de validação humana (PVA, contador), e reescrever em massa cria risco onde o oráculo é o gargalo. **Contra (a):** é a "migração por incidente" que o `ADR-DOMAIN-MOTOR-rejected.md` §2 apontou como defeito — dois regimes de cálculo (função em código × regra) convivendo sem prazo, e agente copiando o vizinho errado. Mitigação no desenho: o mapa do ML-19 torna o regime de cada resultado explícito e checado na compilação. Se o dono preferir um regime só, o caminho é (b) com prazo, ou (c). Medida que falta para decidir melhor: quantas mudanças de **forma** (não de número) a lei trouxe; no repositório achei três (`janelaRbt12`/LC 214, divisor da EC 141, Lei 15.371). Primeiro candidato: `janelaRbt12` (`simplesCalc.ts:185`) | PENDENTE |
| **F-ML-12** ADR antes do código | (a) ADR curto dentro do PR-0 (ML-23); (b) PRE-ADR em sessão separada antes do BRIEF valer; (c) sem ADR, só este BRIEF e a decisão | **(a)**. A mudança toca fronteira (reverte F-PES-9, encosta em R-motor-regras e no `ADR-DOMAIN-MOTOR-rejected.md`, que exige "ADR novo" para qualquer reabertura): merece ADR que diga por que **não** é aquele motor, e o `check:arch` dá a guarda estática. (b) é o rito do DP (3 sessões); o dono já decidiu a direção em chat | PENDENTE |
| **F-ML-13** Jurisdição (dono, chat, 14/11: *"conseguiriamos fazer algo como ter um motor para o brasil, um para os EUA, um para Japão, um para Taiwan?"*) | (a) um motor só, com a jurisdição como **dado** da regra e do registro de domínio desde o PR-1, aceitando só `'BR'`, e sem supor 2 casas decimais no núcleo (ML-27); (b) nada agora, tratar quando houver segundo país; (c) um motor por país | **(a)**. É a "lei preventiva (custo zero hoje)" da fase P-i18n do plano (`docs/SDD-LUMINARIS.md` §IV.1: *"jurisdição entra como dado (fixture/slot), jamais como branch no núcleo"*; cuidado já listado lá: *"minor-unit awareness — centavos assumem 2 decimais (JPY=0, BHD=3)"*), aplicada ao motor antes de ele nascer com `'BR'` implícito. **Não** antecipa a P-i18n: o gatilho dela continua *"primeiro tenant não-BR real — nunca por completude de mapa"*, e aceitar outro valor reabre T9 (BRL-only), que pede ADR e sinal do dono. (c) duplica o núcleo, que não tem nada de país | PENDENTE |

### 5.1 Posição da revisão independente e recomendação revista (15/11)

Vale só se F-ML-0 for (a). Os forks não listados aqui tiveram a concordância da revisão sem ressalva.

| Fork | Revisão | Recomendação depois da revisão |
|---|---|---|
| **F-ML-0** (novo) | Propõe (b), variantes por vigência | **(b) agora**; (a) condicionado a quem escreve a regra (§0.2) |
| **F-ML-4** | Discorda de (b), rubrica como dado de plataforma | **Só (a).** Retiro "(b) como fase seguinte": convenção coletiva e rubrica da empresa variam **por cliente** (`DpConvencaoParametro`), e `LEI_REGRA` é só de plataforma; rubrica como dado de plataforma não cobre o que mais muda (finding 6) |
| **F-ML-6** | Concorda, com ressalva: exemplo obrigatório **não** é checagem independente, porque quem escreve a regra escreve o exemplo | Mantém (a) e acrescenta: regra nova só publica com exemplo conferido por outra pessoa ou pelo contador (runbook); sem isso o exemplo prova coerência, não correção |
| **F-ML-9** | Não sabe dizer | Mantém (a), sem convicção nova: a plataforma `legalParameters` hoje importa a contabilidade (lacuna `L-20261114-222614-0d37`), o que enfraquece o argumento "todo mundo já importa" |
| **F-ML-11** | Discorda de (a): dentro de uma mesma apuração do Simples, um passo viraria dado e o resto ficaria em código | **(c), só o DP**, enquanto valer (a) em F-ML-0. A adoção fiscal por gatilho cria regime duplo dentro de um mesmo cálculo |
| **F-ML-12** | Concorda, com condição: o ADR tem de estar **aceito antes** do merge do PR-0 | Mantém (a) com a condição. O ADR responde a dois pontos: o argumento do dono de 02/11 (fórmula interpretada como "irmão do R-motor-regras") e a linha 27 do ADR de persistência ("tipo em compilação") |
| **F-ML-13** | Campo de jurisdição: ok. Generalizar a unidade mínima da moeda: não sabe dizer | Mantém a jurisdição como dado; **retira** do ML-27 a parte do expoente da moeda (fica para a P-i18n) |
| **F-ML-14** (novo) | Finding 2 | Ver ML-15: recomendo (b), `LEI_REGRA` fora da fila, por ser o que não exige registro novo |

## 6. Pendências de validação externa (não entram no checklist como decididas)

- **Conteúdo legal de cada regra:** `VERIFICACAO-LEGAL.md` e, no que for interpretação (Súmulas, divisor, fração de
  mês), contador por runbook. O motor garante **fidelidade à regra publicada**, não a **correção da regra**.
- Itens "a ler no BRIEF" de [[D-2026-11-14-DP-ESCOPO-LACUNAS-2]] (Lei 12.506/2011; CLT 142, 10, 448, 71 §4º, 244) e o
  regulamento do salário-paternidade.
- Equivalência de cálculo fiscal migrado (F-ML-11) não dispensa a validação no PVA quando o cálculo alimenta SPED/ECF.

## 7. Insumos ausentes

- **Processador da fila de recálculo — lido em 15/11, e o ML-15 como escrito está ERRADO.** O processador é
  `features/accounting/services/TaxAssessmentRecalcService.ts`: código fiscal, com um `switch` fixo sobre tabelas
  fiscais (`familiasDaLinha`, `:39-55`; `default: return []`) e que marca todo job como concluído (`:103-118`). Um job de
  `LEI_REGRA` seria consumido em silêncio e o recálculo da folha nunca rodaria. Não há ponto de extensão por tabela nem
  por domínio. O ML-15 precisa ser reescrito: ou a fila ganha um registro por domínio (o que o §0 diz que o motor não tem),
  ou a regra publicada não entra nessa fila. Achado da revisão independente (finding 2), conferido no código.
- **Vocabulário `folha`:** depende do snapshot do PR-3 do F2 do DP (não existe). O PR-4 daqui só fecha depois dele.
- **Os 47 consumidores fiscais** foram localizados por grep e não lidos (só `simplesCalc.ts:180-200`). Quanto de cada um
  é fórmula e quanto é algoritmo não está medido; por isso F-ML-11 (a) e nenhuma promessa de migração.

## 8. Achados fora de escopo (não planejados)

- Editor e visualizador de regra no front; fluxo de proposta pelo contador (`FE-INCR-*`).
- Gerar a `Expr` a partir do texto da lei por modelo de linguagem: açúcar possível sobre F-ML-1 (b); a publicação
  continuaria exigindo exemplos e validação humana.
- Rubrica como dado (F-ML-4 b) e tabela de natureza/incidência por rubrica.
- Migração de `simplesCalc`, `withholdingCalc`, `taxSimulation` e demais cálculos fiscais: cada uma é nó/decisão própria
  (lacuna `L-20261114-214052-b25f` registra o primeiro candidato).
- Mudança de leiaute por Nota Técnica (eSocial, Reinf, SPED) continua código.
- **Variação por cliente fica fora do motor** (revisão, finding 6): valores de convenção coletiva
  (`DpConvencaoParametro`) e rubricas próprias da empresa são por cliente; `LEI_REGRA` é de plataforma. "Modificar apenas
  as leis" não cobre CCT nem rubrica da empresa. Se o dono quiser cobrir, é frente própria.
- **A plataforma conhece os domínios** (lacuna `L-20261114-222614-0d37`): `legalParameters/models/formatoLinha.ts` importa 7
  modelos de `features/accounting` e define os formatos do DP. O núcleo do motor (ML-23) não pode herdar isso; o
  registro por domínio (ML-9) é o molde para inverter também o formato das tabelas, mas essa inversão não é deste BRIEF.
- Acoplamentos vizinhos achados em 14/11 e registrados na caixa: primitivas de plataforma dentro de `features/accounting`
  (`L-…-b556`), núcleo do razão sem guarda no `check:arch` (`L-…-0a7b`), 11 constantes e 23 comparações de vigência em
  código fiscal (`L-…-675c`).
- **Outros países** (EUA, Japão, Taiwan…): o motor só cobre a camada de fórmula. Cada país pede o seu pacote de
  localização (plano de contas, ano fiscal, vocabulário dos demonstrativos, moeda) e o seu pacote de compliance
  (documentos e obrigações acessórias, com validador próprio), além de fonte oficial de lei e de quem valide. É a fase
  P-i18n do plano (GATILHO: primeiro tenant não-BR real); nada disso é planejado aqui.

**Publicação (24/11):** escrito em 14–15/11 na worktree `claude/personal-dept-coverage-c7fea7` e publicado em 24/11 sem mudar o conteúdo, só com esta nota. Os forks do país na borda (F-PB-1..9) foram ratificados em 24/11 (`docs/plano/decisoes/D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA.md`, PR #1331), e a regra reescrita está em `docs/adr/ADR-PAIS-NA-BORDA.md` (PR da sessão de planejamento de 24/11, branch `claude/adr-pais-na-borda-emendas`). Lacuna de origem: `L-20261124-032018-f96d`.
