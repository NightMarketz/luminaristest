# BRIEF — BE-INCR-SIMULACAO-CENARIO PR-0: emenda à D8 e contrato do cenário informado (sem lógica)

> Nó [`SIMULACAO-CENARIO`](../plano/nos/SIMULACAO-CENARIO.md). Insumo principal:
> [`PRE-ADR-SIMULACAO-COMPLETA-12-MESES.md`](../adr/PRE-ADR-SIMULACAO-COMPLETA-12-MESES.md) (RATIFICADO, dono, 21/11/2026,
> F-SIM-1..8). Escrito pela `sessao-planejamento` contra `origin/main` `43719baaf`, em 2026-11-21.
> Graus: **V** = lido nesta sessão no código ou no documento; **I** = inferido; **L** = localizado, corpo não lido.

## TLDR (2 linhas)

O PR-0 faz três coisas: emenda a D8 do `ADR-INCR-EFICIENCIA-FISCAL` (o simulador aceita o razão **ou** um cenário
informado, e o caminho do cenário não grava nada, nem sugestão); materializa o contrato do cenário em Zod `.strict()`, em
`server/src/features/accounting/dtos/CenarioSimulacaoDto.ts`; e atualiza o snapshot de shape e o `.gen.ts`. Não tem rota,
serviço, cálculo nem tela.

**Risco principal:** o PR-0 congela no snapshot a forma que o FE e os PR-1..6 vão consumir. O esboço do PRE-ADR §5 tem
sete pontos em que ele não fecha com o motor ou com regra já ratificada (§5, F-SIM-9..15, todos **RATIFICAÇÃO
PENDENTE**). O mais caro é o **F-SIM-9**: o esboço põe contagem, dias e pontos-base dentro de `Valor.cents`. Este PR só
recebe `executa` depois que os sete estiverem respondidos.

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** PR-0 do nó `SIMULACAO-CENARIO` (nota criada nesta sessão, `docs/plano/nos/SIMULACAO-CENARIO.md`),
  pela sequência do PRE-ADR §6, linha PR-0.
- **Autorização:** dono, chat, 2026-11-21: *"Autorizo"*, em resposta a *"Autoriza a nota do nó e o BRIEF do PR-0 numa
  sessão nova?"*. Repassada pela sessão de origem.
  - **Passo 1 (cobertura):** a autorização cobre exatamente a nota do nó e este BRIEF. Não cobre código, edição do artefato
    do simulador, commit, branch nem PR, nem os BRIEFs do PR-1 ao PR-6. O texto da emenda à D8 está redigido aqui (§3.1)
    para o PR-0 aplicar; **o ADR não foi editado nesta sessão**.
- **Insumos (fato consumado):**
  - PRE-ADR `PRE-ADR-SIMULACAO-COMPLETA-12-MESES.md`: §1 fatos, §2 com os forks F-SIM-1..8 ratificados, §3 checklist
    candidato, §4 pendências, §5 esboço do contrato, §6 sequência, §10 write-set (V);
  - `docs/adr/ADR-INCR-EFICIENCIA-FISCAL.md`: D8 (linhas 222–225), D10 (linhas 231–234), I-5 (linhas 561–562) (V);
  - `server/src/features/accounting/dtos/TaxSimulationDto.ts`: convenção dos DTOs de simulação (V);
  - `server/src/features/accounting/models/taxSimulation.ts`: `EntradaRegime`, `MesRegimeEntrada`, `simularRegimeAno` (V);
  - `server/src/features/accounting/models/simplesCalc.ts:56-108`: `MesReceitaSchema`, `AtividadeInputSchema`,
    `ApuracaoInputSchema` (V);
  - `server/src/features/accounting/services/TaxSimulationService.ts:190-286, 451-463`: como o razão vira `EntradaRegime`
    e os padrões de `perfilSimulado` (V);
  - `server/src/features/accounting/models/taxAssessmentCalc.ts:327-338`: `PerfilApuracaoPresumido` (V);
  - `server/src/features/sectorKits/kits/beautySalon/kit.v6.ts` e `server/src/features/sectorKits/kits/_shared/catalogoServicosFiscais.ts`:
    o kit traz só códigos (`cTribNac`, `cNBS`, sinônimos, fonte), sem nenhum valor de mercado (V);
  - `server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts:1-36`: como o gate descobre e serializa os DTOs (V);
  - `server/src/features/accounting/models/dates.ts:17` (`isValidDateOnly`) e `server/src/features/accounting/models/money.ts:20`
    (`MAX_CENTS`) (V, só a assinatura).
- **Nós vizinhos:**
  - plano: depende de [`EFICIENCIA-FISCAL`](../plano/nos/EFICIENCIA-FISCAL.md) (dono da D8 que este PR emenda; `inflight`) e de
    [`LEGAL-PARAMS`](../plano/nos/LEGAL-PARAMS.md) (`LinhaLegal` com vigência; `done`);
  - código (consumidos pelos PR-1..6, não pelo PR-0): X14 (`simplesCalc.apurar`, `fatorR`, `rbt12`), X7
    (`taxAssessmentCalc*`), `pisCofinsCalc`, DP (`dp/models/folha/`, L), kit setorial;
  - consome este PR: o PR-1 do nó (motor de 12 meses) e o `FE-INCR` da tela do cenário (tipos em
    `my-app/types/contracts/accounting/CenarioSimulacaoDto.gen.ts`).

**Fronteira (STOP do CLAUDE.md):** o cenário não é tabela que o usuário desenha nem núcleo que a lei grava: é entrada de
uma requisição sem estado (F-SIM-2 a). Nada de DynamicTable, nada de model Prisma. O DTO mora em `features/accounting/dtos`,
ao lado do `TaxSimulationDto`, e não importa serviço, repositório nem Prisma.

---

## 1. Decisões ratificadas que este BRIEF aplica

| Fork (PRE-ADR §2) | Resposta do dono, 21/11 | Efeito no PR-0 |
|---|---|---|
| F-SIM-1 c | motor do produto; página como protótipo e oráculo | emenda à D8 (§3.1); o contrato é do produto |
| F-SIM-2 a | não guarda por ora | o DTO é só de requisição/resposta; a emenda diz "não grava nada" |
| F-SIM-3 c | entrada em camadas | `tipico` + `sazonalidade` (camada 1), `meses` (camada 2), `eventos` (camada 3) |
| F-SIM-4 b | 2027, com 2026 como histórico | 2026 entra em `abertura.receitaMesesAnteriores`; o ano simulado é F-SIM-12 |
| F-SIM-5 b | núcleo neutro, SP primeiro | o contrato aceita qualquer município; a recusa de município sem regra é do motor (`disponivel: false`), não do DTO |
| F-SIM-6 a + b | padrão por pesquisa e kit setorial | todo número que pode nascer de padrão carrega proveniência; forma da fonte é F-SIM-10 |
| F-SIM-7 a | faixa | `faixa` no valor e `faixaCargaCents` na saída |
| F-SIM-8 | congelar a página depois da rodada | a ficha da página congelada vira fixture quando existir (§7, insumo ausente) |

---

## 2. Rastreio: o que o motor lê e de onde o cenário tira

O PR-0 não calcula nada, mas o contrato tem de conter tudo de que o PR-1 vai precisar para montar a entrada das funções
puras que já existem. Esta tabela parte dos tipos lidos (`EntradaRegime`, `MesRegimeEntrada`, `ApuracaoInputSchema`,
`AtividadeInputSchema`, `PerfilApuracaoPresumido`) e diz a origem de cada campo no `CenarioEntrada`. **Campo sem origem
no esboço do PRE-ADR vira item do checklist (§3) ou fork (§5).**

| Campo que o motor lê | Onde é lido | Origem no cenário | Estado |
|---|---|---|---|
| `ano` | `EntradaRegime` | `perfil.ano` | no esboço; valor aceito é F-SIM-12 |
| `meses[].servicoCents` / `revendaCents` | `MesRegimeEntrada` | `meses[].receitaServico` / `receitaRevenda`; senão `tipico` × preço × sazonalidade (derivação do PR-1/PR-5) | no esboço |
| `meses[].naoUsoCents` | `MesRegimeEntrada`; base do Presumido e do ISS | **não tem origem no esboço** | **item 6** (campo `receitaNaoUso` no mês e no típico) |
| `atividadesSimples[].natureza` | `AtividadeInputSchema` (`SERVICO`, `REVENDA`, `LOCACAO_MOVEL`, `PARCERIA_GESTAO`) | `SERVICO` ← `cadastros.servicos`; `REVENDA` ← `cadastros.produtos`; `PARCERIA_GESTAO` ← profissional com `vinculo = PARCEIRO`; `LOCACAO_MOVEL` não tem origem | `LOCACAO_MOVEL` fica fora do PR-0 (§8); o motor avisa |
| `atividadesSimples[].cTribNac` | `AtividadeInputSchema`, regex `^\d{6}$` | `cadastros.servicos[].cTribNac` | esboço aceita qualquer string ⇒ **item 5** (mesma regex) |
| `atividadesSimples[].parcelas[].excluir` | segregação (monofásico, ST) | derivado da NCM de `cadastros.produtos[].ncm` pelo motor, nunca informado | esboço aceita qualquer string na NCM ⇒ **item 5** (`^\d{8}$`) |
| `atividadesSimples[].beneficioIss` | benefício municipal de ISS | parâmetro do município (borda), nunca do cenário | fora do contrato; o motor lê de `LinhaLegal` |
| `receitaSimplesCents` (receita − cota do parceiro) | `MesRegimeEntrada` | receita − Σ cota dos `PARCEIRO`; a cota sai de `equipe[].comissaoBp` | **item 4**: o JSDoc fixa que, para `PARCEIRO`, `comissaoBp` é a cota-parte (Lei 12.592 art. 1º-A, já citada pelo produto em `simplesCalc.ts:30`) |
| `folhaCents` | `MesRegimeEntrada`, fator r, CPP | derivado de `cadastros.equipe` e `eventos` (PR-2) | no esboço |
| `historicoAnterior` (RBT12) | `EntradaRegime` | `abertura.receitaMesesAnteriores` (receita e folha) | no esboço |
| `inicioAtividade` (competência) | `EntradaRegime`, `ApuracaoInputSchema` | derivada de `perfil.apuracao.inicioAtividadeEm` (`slice(0, 7)`), como o serviço já faz (`TaxSimulationService.ts:275`) | **item 3**: o esboço tinha só a competência; o motor do Real também lê a data |
| `perfil.ecfIndAliqCsll`, `ecfIndRecReceita`, `lc224AcrescimoSuspenso`, `lc224LiminarReferencia`, `inicioAtividadeEm`, `encerramentoAtividadeEm`, `prestadoraExclusivaServicos`, `declaraNaoProfissaoRegulamentada` (os 8 de `PerfilApuracaoPresumido`) + `lucroRealObrigatorio` | `PerfilApuracaoPresumido` + `lucroRealObrigatorio`; `cenarioReal` repassa `inicioAtividadeEm` (`taxSimulation.ts:340`) | **não têm origem no esboço** | **item 3** (`perfil.apuracao`, com os padrões que `perfilSimulado` já usa, `TaxSimulationService.ts:451-463`) |
| `issAliquotaBp` | `EntradaRegime`; `null` ⇒ Presumido e Real indisponíveis | **não tem origem no esboço** | **item 3** (`perfil.issAliquotaBp`; `null` ⇒ o motor usa o máximo da LC 116 art. 8º II com aviso, como `TaxSimulationService.ts:190-194`) |
| `resultadoAntesPorTrimestre` | `apurarRealTrimestral` | derivado dos movimentos do cenário (PR-1 simplificado; PR-4 pela DRE em memória) | não é campo: o cenário traz os movimentos, nunca o resultado pronto |
| `linhasParteA`, `parteBFechada` | `apurarRealTrimestral` | `meses[].lalur` e a entrada de simulação do item 9 do PRE-ADR §3 (PR-1) | `lalur` no esboço; a entrada de simulação é do PR-1 |
| prejuízo fiscal e base negativa | item 7 do PRE-ADR §3 | `abertura.prejuizoFiscal`, `abertura.baseNegativaCsll` | no esboço |
| `saldoAnterior` de PIS/Cofins | `apurarPisCofinsMensal` | `abertura.saldoCredor.pis/cofins` | no esboço; o que vale em 2027 está em §6 (pendente) |
| `outrosCreditos`, `creditosNfe` | `apurarPisCofinsMensal`; crédito de CBS/IBS | `despesas[].daCredito`, `meses[].compras` | no esboço (PR-3) |
| `retencoes`, `deducoes` | PIS/Cofins, Presumido e Real | **não têm origem** | fora do PR-0 (§8); o motor avisa "sem retenções e sem deduções" |
| `sublimiteCents`, `linhas`, tabelas, `encargos` | `EntradaRegime` | `LinhaLegal` vigente no servidor | **nunca no cenário** (item 7): número de lei vive com vigência (`LEGAL-PARAMS`) |

---

## 3. Checklist numerado (cada item = ≥ 1 teste ou uma checagem de diff)

Caminhos relativos à raiz do repo. Onde o item depende de fork pendente, o fork está citado; o esboço da §4 segue a
recomendação de cada fork, e muda se o dono escolher outro caminho.

### 3.1 Emenda à D8 (doc)

1. **Aplicar a emenda em `docs/adr/ADR-INCR-EFICIENCIA-FISCAL.md`.** O texto de hoje (linhas 222–225, V):

   > **D8 — Simuladores são funções puras sobre o razão/subrazão, com `parametrosSha256`:** fator r (12 meses do
   > `SimplesHistoricoMensal` + folha-alvo informada), regime (Simples × Presumido × Real sobre os 12 meses reais; 2027 com
   > CBS/IBS pela tabela do `IBS-CBS-2027`, linha `DRAFT` ⇒ aviso), remuneração do sócio (pró-labore × dividendos × JCP
   > reusando o cálculo do `IRRF-DISTRIBUICAO`). Nenhum simulador grava apuração; grava **sugestão** (D3).

   Entra como parágrafo novo logo depois dele, sem reescrever o original (texto ratificado não se reescreve):

   > **D8 — emenda de 2026-11-21** (`PRE-ADR-SIMULACAO-COMPLETA-12-MESES`, F-SIM-1 c e F-SIM-2 a; nó `SIMULACAO-CENARIO`):
   > a entrada de um simulador é o razão/subrazão da unidade **ou** um cenário informado pelo usuário
   > (`CenarioEntradaSchema`, em `dtos/CenarioSimulacaoDto.ts`). O cenário roda as mesmas funções puras (`simplesCalc`,
   > `taxAssessmentCalc*`, `pisCofinsCalc`, `dp/models/folha`), com os parâmetros de `LinhaLegal` vigentes; o cenário nunca
   > traz número de lei (alíquota de tributo, faixa, limite, teto, presunção ou tabela). O que é dado da empresa e não da lei,
   > como a alíquota de ISS que o município aplica a ela, pode vir no cenário, com proveniência. O caminho do cenário não lê o razão da unidade e **não grava nada**: nem
   > apuração, nem folha, nem lançamento, nem `TaxOptimizationSuggestion`, nem o próprio cenário. Os simuladores sobre o
   > razão continuam como estão (gravam sugestão, D3). O motor do cenário pertence ao nó `SIMULACAO-CENARIO`, não a este.

   E a I-5 (linhas 561–562, V: *"toda resposta de simulação de fator r carrega o aviso de folha real; `folhaAlvoCents`
   nunca é persistido como histórico."*) ganha, também como frase nova:

   > **I-5 — emenda de 2026-11-21:** nenhum dado de um cenário informado (D8, emenda) é persistido; a requisição do cenário
   > não abre transação de escrita.

   **Prova no PR-0:** diff do ADR só com essas duas inserções (`git diff --stat` e leitura do diff). O teste que prova
   "não abre transação de escrita" é do PR-1, que tem serviço; o PR-0 só fixa a regra.

### 3.2 Contrato (Zod, sem lógica de cálculo)

2. **Criar `server/src/features/accounting/dtos/CenarioSimulacaoDto.ts`** com `CenarioEntradaSchema` e `CenarioSaidaSchema`
   (§4), `.strict()` em todo objeto, e `versao: z.literal(1)`. Exporta também os tipos (`z.infer`) e as constantes de enum
   (`ORIGENS_VALOR`, `REGIMES_CENARIO`, `VINCULOS`, `MOTIVOS_DEMISSAO`, `NATUREZAS_RETIRADA`, `TIPOS_EVENTO`), no molde de
   `REGIMES_SIMULADOS` em `TaxSimulationDto.ts:57`. **Teste:** chave desconhecida em qualquer nível ⇒ erro do Zod
   (um caso por nível: raiz, `perfil`, `abertura`, `cadastros`, `tipico`, `meses[]`, cada variante de `eventos[]`).
3. **`perfil.apuracao` e `perfil.issAliquotaBp`** (não estão no esboço; §2). `apuracao` traz os 8 campos de
   `PerfilApuracaoPresumido` (`taxAssessmentCalc.ts:327-338`) + `lucroRealObrigatorio`, 9 ao todo, todos obrigatórios. A
   data `inicioAtividadeEm` substitui o `perfil.inicioAtividade` do esboço; a competência sai dela por `slice(0, 7)`, como em
   `TaxSimulationService.ts:275`. Os campos têm os mesmos domínios do model
   `CompanyFiscalProfile` (`server/prisma/schema.prisma:1929-1930`: `ecfIndAliqCsll ∈ {'1', '4'}`, `ecfIndRecReceita ∈ {'1', '2'}`;
   datas por `isValidDateOnly`). O JSDoc cita
   os padrões de `perfilSimulado` (`TaxSimulationService.ts:451-463`) como o padrão que a tela oferece. `issAliquotaBp` é
   valor com proveniência em pontos-base (F-SIM-9), `nullable`. **Teste:** cenário sem `apuracao` ⇒ erro; `ecfIndAliqCsll`
   fora do domínio ⇒ erro; `issAliquotaBp = null` aceito.
4. **Cadastros.** `equipe[].vinculo ∈ {CLT, PARCEIRO, SOCIO}`; JSDoc fixa que, com `PARCEIRO`, `comissaoBp` é a cota-parte
   do profissional-parceiro. Ids únicos por lista. **Teste:** id repetido em `equipe`, `servicos` ou `produtos` ⇒ erro
   nomeado (`superRefine`, mensagem com o id).
5. **Formatos de código** (o esboço aceita qualquer string): `perfil` da jurisdição BR com `uf` no enum das 27 UFs,
   `municipioIbge` `^\d{7}$`, `cnae` `^\d{7}$` (F-SIM-13); `servicos[].cTribNac` `^\d{6}$` (a regex de
   `AtividadeInputSchema`, `simplesCalc.ts:71-74`); `produtos[].ncm` `^\d{8}$`. **Teste:** um caso inválido por campo.
6. **`receitaNaoUso`** no mês (camada 2, opcional) e no típico (camada 1, obrigatório, valor em centavos com proveniência),
   porque `MesRegimeEntrada.naoUsoCents` entra na base do Presumido e do ISS e não tinha origem. **Teste:** parse com e sem
   o campo no mês.
7. **O cenário não carrega número de lei.** Nenhum campo de alíquota de tributo, faixa do Simples, sublimite, teto do RGPS,
   presunção ou tabela. O que é da empresa e não da lei fica no cenário (alíquota de ISS do município informada pelo
   usuário, FAP quando o PR-2 chegar). **Teste:** percorre todas as chaves do `CenarioEntradaSchema` (via `z.toJSONSchema`,
   em profundidade) e reprova chave cujo nome contenha, sem distinguir maiúsculas, um destes termos: `aliquota`, `sublimite`,
   `limite`, `teto`, `presuncao`, `anexo`, `reparticao`, `partilha`, `fatorR`, `tabela`. Exceções literais no teste:
   `issAliquotaBp` (dado da empresa). A chave `faixa` não está na lista: é a faixa de proveniência de todo valor (F-SIM-7).
8. **Proveniência (F-SIM-6, F-SIM-7, F-SIM-10).** Regras do valor, em `superRefine`, com teste próprio porque `.refine`
   não aparece no snapshot (`dtoShapeSnapshot.test.ts:31-34`):
   - `origem = PADRAO` ⇒ `fonte` obrigatória; `fonte.tipo = MERCADO` ⇒ `dataReferencia` e `faixa` obrigatórias (F-SIM-6:
     "fonte citável, data e faixa");
   - `faixa = [min, max]` ⇒ `min ≤ valor ≤ max`;
   - `origem = REAL` ⇒ `fonte` opcional (o documento importado chega no PR-6).
   **Teste:** um caso por regra, aceitando e reprovando.
9. **Dinheiro (F-SIM-11).** Centavos como string de inteiro, não negativo e até `MAX_CENTS` (`money.ts:20`), salvo os campos
   que o domínio permite negativos (`abertura.caixa`). **Teste:** `"-1"` reprovado fora do caixa e aceito nele; `MAX_CENTS + 1`
   reprovado; `"1.5"` e `"abc"` reprovados.
10. **Datas e competências.** Toda data de `eventos[]` e `abertura.tributosAPagar[].vencimento` passa por `isValidDateOnly`
    (memória do projeto: regex não valida calendário, `2027-02-30` rola para março). Toda competência de `meses[]` e toda data
    de evento estão dentro de `perfil.ano`; `meses[].competencia` sem repetição; `receitaMesesAnteriores[].competencia`
    anterior a `perfil.ano`, sem repetição. **Teste:** `2027-02-30` reprovado; evento em `2028-01-05` com ano 2027 reprovado;
    competência repetida reprovada.
11. **Referências cruzadas.** `eventos[].pessoaId` ∈ `equipe[].id`; `RETIRADA_SOCIO.socioId` ∈ `equipe[]` com
    `vinculo = SOCIO`; `servicos[].profissionalId` ∈ `equipe[].id` ou `null`; chaves de `tipico.atendimentosPorServico` ⊂
    `servicos[].id`; chaves de `tipico.vendasPorProduto` ⊂ `produtos[].id`. **Teste:** um caso órfão por referência, com o id
    na mensagem.
12. **Soma fechada.** `tipico.formasPagamento` soma 10 000 bp. Somar diferente reprova, em vez de o motor renormalizar em
    silêncio (memória do projeto "param aceito e ignorado é bug"). **Teste:** 9 999 bp reprovado; 10 001 reprovado. A regra
    da sazonalidade depende do F-SIM-15 e entra neste item quando ele for respondido.
13. **Saída.** `CenarioSaidaSchema` pelo PRE-ADR §5.2, com: `regime` no enum `REGIMES_CENARIO` (não `z.string()`);
    `meses` com `.length(12)`; `parametrosSha256` `^[0-9a-f]{64}$`; `proveniencia` em bp com soma 10 000 (refine, com teste);
    centavos com sinal só onde o resultado pode ser negativo (`resultadoCents`, `saldoCents`, `efeitoCents`), como
    `signedCents` em `TaxSimulationDto.ts:13`. **Teste:** parse de uma saída mínima válida e reprovação de `meses` com 11.
14. **Fixture mínima.** `server/src/features/accounting/dtos/__tests__/fixtures/cenarioSalaoMinimo.ts`: salão com 1 sócio,
    1 CLT, 1 parceiro, 2 serviços, 1 produto, sem `meses` nem `eventos`, todos os valores com `origem = ESTIMADO` (nenhum número
    de mercado entra sem fonte, F-SIM-6). **Teste:** parse sem erro. A ficha da página congelada entra quando existir (§7).

### 3.3 Gates e fronteira do PR

15. **Snapshot de shape e tipos gerados.** `UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot`
    atualiza `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json` e gera
    `my-app/types/contracts/accounting/CenarioSimulacaoDto.gen.ts`. **Armadilha do Windows** (memória do projeto "UPDATE do
    snapshot reordena"): o UPDATE pode reordenar todos os domínios; reverter o churn e manter só a entrada nova de
    `CenarioSimulacaoDto.ts`. **Prova:** o diff do JSON só tem a chave nova; rodar o teste sem `UPDATE` sai verde.
16. **Testes do DTO** em `server/src/features/accounting/dtos/__tests__/CenarioSimulacaoDto.test.ts`, com escopo:
    `npx jest server/src/features/accounting/dtos/__tests__/CenarioSimulacaoDto.test.ts --selectProjects unit` (caminho antes da flag).
17. **`tsc` limpo** nos dois lados (`cd server && npx tsc --noEmit`; `cd my-app && npx tsc --noEmit`) e **`npm run check:arch`**
    sem violação nova (o DTO não importa serviço, repositório nem Prisma).
18. **Nada além do write-set.** Sem rota, controller, serviço, factory, `docs.paths.ts`, `openapi.json`, i18n nem `auditCanonical.ts`:
    o contrato ainda não é exposto, então nenhum desses gates muda. **Prova:** `git diff --stat origin/main` lista só os
    arquivos da §9.1.
19. **Fold no próprio PR.** `node scripts/plano-vault.mjs fold SIMULACAO-CENARIO --pr <n>` (o estado continua `planned`, porque o
    PR-1..6 seguem abertos) e `node scripts/plano-vault.mjs check` saindo 0.

---

## 4. Contratos esboçados (forma materializável; segue a recomendação dos forks da §5)

```ts
// server/src/features/accounting/dtos/CenarioSimulacaoDto.ts — esboço; a forma final depende de F-SIM-9..15.
import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { MAX_CENTS } from '../models/money';

export const ORIGENS_VALOR = ['PADRAO', 'ESTIMADO', 'REAL'] as const;           // F-SIM-6, PRE-ADR §5.1 (não reabrir)
export const TIPOS_FONTE = ['MERCADO', 'LEI', 'CONVENCAO', 'KIT', 'DOCUMENTO'] as const; // F-SIM-10 (b)

const competencia = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const dataReal = z.string().refine(isValidDateOnly, 'data real YYYY-MM-DD');
const centsNaoNeg = z.string().regex(/^\d+$/).refine((s) => BigInt(s) <= BigInt(MAX_CENTS), 'acima de MAX_CENTS'); // F-SIM-11 (b)
const centsComSinal = z.string().regex(/^-?\d+$/);                                                                   // só caixa de abertura

const FonteSchema = z.object({
  tipo: z.enum(TIPOS_FONTE),
  referencia: z.string().min(1),                 // "LC 116 art. 8º II", "CCT SP006651/2026 cl. 5ª", "pesquisa <slug> [Dnn]"
  dataReferencia: dataReal.nullable(),           // obrigatória com tipo = MERCADO (refine, item 8)
}).strict();

// F-SIM-9 (b): uma família de primitivos, a unidade fixa pelo contrato e visível no snapshot.
const valorDe = <T extends z.ZodTypeAny>(valor: T) => z.object({
  valor,
  origem: z.enum(ORIGENS_VALOR),
  fonte: FonteSchema.nullable(),                 // obrigatória com origem = PADRAO (refine, item 8)
  faixa: z.tuple([valor, valor]).nullable(),     // F-SIM-7 a
}).strict();
export const ValorCentsSchema = valorDe(centsNaoNeg);
export const ValorCentsComSinalSchema = valorDe(centsComSinal);
export const ValorBpSchema = valorDe(z.number().int().min(0).max(10_000));
export const ValorQtdSchema = valorDe(z.number().int().min(0));
export const ValorDiasSchema = valorDe(z.number().int().min(0).max(366));

export const REGIMES_CENARIO = ['SIMPLES', 'SIMPLES_IBS_CBS_REGULAR', 'PRESUMIDO', 'REAL_TRIMESTRAL', 'REAL_ESTIMATIVA', 'REAL_BALANCETE'] as const;
export const VINCULOS = ['CLT', 'PARCEIRO', 'SOCIO'] as const;
const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'] as const;

// F-SIM-13 (b): o país é discriminador; só o ramo BR existe na versão 1.
const JurisdicaoBrSchema = z.object({
  pais: z.literal('BR'),
  uf: z.enum(UFS),
  municipioIbge: z.string().regex(/^\d{7}$/),
  cnae: z.string().regex(/^\d{7}$/),
}).strict();

const PerfilApuracaoSchema = z.object({          // item 3: os campos de PerfilApuracaoPresumido + lucroRealObrigatorio
  ecfIndAliqCsll: z.enum(['1', '4']).nullable(),  // '1' = 9%, '4' = 15% (schema.prisma:1929)
  ecfIndRecReceita: z.enum(['1', '2']).nullable(), // '1' caixa, '2' competência (schema.prisma:1930)
  lc224AcrescimoSuspenso: z.boolean(),
  lc224LiminarReferencia: z.string().nullable(),
  inicioAtividadeEm: dataReal.nullable(),         // a competência de início sai daqui (slice(0, 7))
  encerramentoAtividadeEm: dataReal.nullable(),
  prestadoraExclusivaServicos: z.boolean(),
  declaraNaoProfissaoRegulamentada: z.boolean(),
  lucroRealObrigatorio: z.boolean().nullable(),
}).strict();

const PerfilSchema = z.object({
  jurisdicao: z.discriminatedUnion('pais', [JurisdicaoBrSchema]),
  regimes: z.array(z.enum(REGIMES_CENARIO)).min(1),
  ano: z.literal(2027),                            // F-SIM-12 (a)
  apuracao: PerfilApuracaoSchema,
  issAliquotaBp: ValorBpSchema.nullable(),         // null ⇒ máximo da LC 116 art. 8º II, com aviso (motor)
}).strict();

const ItemImobilizado = z.object({ nome: z.string().min(1), custo: ValorCentsSchema, aquisicao: competencia, vidaUtilMeses: ValorQtdSchema }).strict();
const Divida = z.object({ saldo: ValorCentsSchema, taxaMensalBp: ValorBpSchema, parcelas: z.number().int().min(1) }).strict();

const AberturaSchema = z.object({
  caixa: ValorCentsComSinalSchema,
  aReceber: ValorCentsSchema, estoque: ValorCentsSchema,
  imobilizado: z.array(ItemImobilizado),
  dividas: z.array(Divida),
  tributosAPagar: z.array(z.object({ tributo: z.string().min(1), valor: ValorCentsSchema, vencimento: dataReal }).strict()),
  prejuizoFiscal: ValorCentsSchema, baseNegativaCsll: ValorCentsSchema,
  saldoCredor: z.object({ pis: ValorCentsSchema, cofins: ValorCentsSchema, icms: ValorCentsSchema, cbs: ValorCentsSchema, ibs: ValorCentsSchema }).strict(),
  receitaMesesAnteriores: z.array(z.object({ competencia, receita: ValorCentsSchema, folha: ValorCentsSchema }).strict()).max(24),
}).strict();

const CadastrosSchema = z.object({
  equipe: z.array(z.object({
    id: z.string().min(1), funcao: z.string().min(1), vinculo: z.enum(VINCULOS),
    salario: ValorCentsSchema,
    comissaoBp: ValorBpSchema,                    // PARCEIRO ⇒ cota-parte do profissional (item 4)
    admissao: competencia, cnpj: z.boolean().nullable(),
  }).strict()),
  servicos: z.array(z.object({ id: z.string().min(1), cTribNac: z.string().regex(/^\d{6}$/), preco: ValorCentsSchema, insumoPorAtendimento: ValorCentsSchema, profissionalId: z.string().nullable() }).strict()),
  produtos: z.array(z.object({ id: z.string().min(1), ncm: z.string().regex(/^\d{8}$/), preco: ValorCentsSchema, custo: ValorCentsSchema }).strict()),
}).strict();

const Despesa = z.object({ nome: z.string().min(1), valor: ValorCentsSchema, daCredito: z.boolean() }).strict();

const TipicoSchema = z.object({                    // camada 1 (F-SIM-3 c)
  atendimentosPorServico: z.record(z.string(), ValorQtdSchema),
  vendasPorProduto: z.record(z.string(), ValorQtdSchema),
  receitaNaoUso: ValorCentsSchema,                 // item 6
  despesas: z.array(Despesa),
  formasPagamento: z.object({ pix: ValorBpSchema, dinheiro: ValorBpSchema, debito: ValorBpSchema, credito: ValorBpSchema, creditoParcelado: ValorBpSchema }).strict(), // soma 10 000 (item 12)
  prazoRecebimentoDias: z.object({ debito: ValorDiasSchema, credito: ValorDiasSchema, creditoParcelado: ValorDiasSchema }).strict(),
  taxaCartaoBp: ValorBpSchema,
}).strict();

// F-SIM-15 (b): fator livre sobre o mês típico, um valor com proveniência por mês (10 000 bp = 1,0×).
export const ValorFatorBpSchema = valorDe(z.number().int().min(0).max(50_000));
const SazonalidadeSchema = z.array(ValorFatorBpSchema).length(12);   // camada 1; índice 0 = janeiro

const MesSchema = z.object({                       // camada 2: só o que o usuário abriu
  competencia,
  receitaServico: ValorCentsSchema.optional(), receitaRevenda: ValorCentsSchema.optional(), receitaNaoUso: ValorCentsSchema.optional(),
  compras: z.object({ insumo: ValorCentsSchema, revenda: ValorCentsSchema, usoConsumo: ValorCentsSchema }).partial().strict().optional(),
  despesas: z.array(Despesa).optional(),
  lalur: z.array(z.object({ codigo: z.string().min(1), tipo: z.enum(['A', 'E']), valor: ValorCentsSchema, soIrpj: z.boolean() }).strict()).optional(),
}).strict();

const EventoSchema = z.discriminatedUnion('tipo', [   // camada 3; datas por dataReal e dentro do ano (item 10)
  z.object({ tipo: z.literal('ADMISSAO'), data: dataReal, pessoaId: z.string() }).strict(),
  z.object({ tipo: z.literal('DEMISSAO'), data: dataReal, pessoaId: z.string(), motivo: z.enum(['SEM_JUSTA_CAUSA', 'PEDIDO', 'JUSTA_CAUSA', 'ACORDO']) }).strict(),
  z.object({ tipo: z.literal('FERIAS'), inicio: dataReal, dias: z.number().int().min(1).max(30), pessoaId: z.string() }).strict(),
  z.object({ tipo: z.literal('COMPRA_IMOBILIZADO'), data: dataReal, nome: z.string().min(1), custo: ValorCentsSchema, vidaUtilMeses: ValorQtdSchema }).strict(),
  z.object({ tipo: z.literal('EMPRESTIMO'), data: dataReal, valor: ValorCentsSchema, taxaMensalBp: ValorBpSchema, parcelas: z.number().int().min(1) }).strict(),
  z.object({ tipo: z.literal('RETIRADA_SOCIO'), data: dataReal, socioId: z.string(), valor: ValorCentsSchema, natureza: z.enum(['PRO_LABORE', 'DIVIDENDO']) }).strict(),
]);

export const CenarioEntradaSchema = z.object({
  versao: z.literal(1),
  perfil: PerfilSchema, abertura: AberturaSchema, cadastros: CadastrosSchema,
  tipico: TipicoSchema, sazonalidade: SazonalidadeSchema.nullable(),
  meses: z.array(MesSchema).max(12),
  eventos: z.array(EventoSchema),
}).strict().superRefine(/* itens 4, 8, 10, 11, 12 — cada regra com teste próprio */);
export type CenarioEntrada = z.infer<typeof CenarioEntradaSchema>;

// ---- saída (PRE-ADR §5.2 com as mudanças do item 13) ----
const cents = z.string().regex(/^\d+$/);          // como TaxSimulationDto.ts:12
const signedCents = z.string().regex(/^-?\d+$/);  // como TaxSimulationDto.ts:13
const bp = z.number().int().min(0).max(10_000);

export const LinhaTributoCenarioSchema = z.object({
  tributo: z.string(), periodo: z.string(),       // 'YYYY-MM' (mensal) ou 'YYYY-Tn' (trimestral) ou 'YYYY' (anual)
  baseCents: cents, devidoCents: cents, vencimento: dataReal, fonte: z.string(),
}).strict();

const SaldosTransportadosSchema = z.object({
  pis: cents, cofins: cents, icms: cents, cbs: cents, ibs: cents, prejuizoFiscal: cents, baseNegativa: cents,
}).strict();

const MesSaidaSchema = z.object({
  competencia, receitaCents: cents, tributos: z.array(LinhaTributoCenarioSchema), folhaCents: cents,
  resultadoCents: signedCents,
  caixa: z.object({ entradasCents: cents, saidasCents: cents, saldoCents: signedCents }).strict(),
  saldosTransportados: SaldosTransportadosSchema,
}).strict();

const LinhaContaSchema = z.object({ conta: z.string(), cents: signedCents }).strict();

const RegimeSaidaSchema = z.object({
  regime: z.enum(REGIMES_CENARIO),
  disponivel: z.boolean(), motivoIndisponivel: z.string().nullable(),
  meses: z.array(MesSaidaSchema).length(12),
  ano: z.object({
    cargaCents: cents, faixaCargaCents: z.tuple([cents, cents]).nullable(),
    dre: z.array(LinhaContaSchema), balanco: z.array(LinhaContaSchema),
  }).strict(),
}).strict();

export const CenarioSaidaSchema = z.object({
  ano: z.number().int(),
  regimes: z.array(RegimeSaidaSchema),
  proveniencia: z.object({ padraoBp: bp, estimadoBp: bp, realBp: bp }).strict(),   // soma 10 000 (refine, item 13)
  sensibilidade: z.array(z.object({ campo: z.string(), efeitoCents: signedCents }).strict()),
  obrigacoes: z.array(z.object({ data: dataReal, obrigacao: z.string(), fonte: z.string() }).strict()),
  avisos: z.array(z.string()),
  parametrosSha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict().superRefine(/* soma da proveniência */);
export type CenarioSaida = z.infer<typeof CenarioSaidaSchema>;
```

**Rota (não é deste PR; registro para o PR-1):** o cenário chega no corpo, então a rota é `POST`. A casa usa `POST …/sugestao`
para o gêmeo que grava (`server/src/routes/accounting.ts:490-495`); a rota do cenário não grava nada, e o nome precisa deixar
isso claro (ex.: `POST /accounting/simulacoes/cenario/calcular`). A escolha é do BRIEF do PR-1.

---

## 5. FORKS NOVOS — RATIFICAÇÃO PENDENTE

Nenhum reabre F-SIM-1..8. Todos são pontos em que o esboço do PRE-ADR §5 não fecha com o código lido ou com regra já
ratificada, e o PR-0 congela a resposta no snapshot.

### F-SIM-9 — Unidade do `Valor` (o mais caro)
O esboço usa um único `Valor` com `cents`, mas põe nele contagem (`atendimentosPorServico`, `vendasPorProduto`),
pontos-base (`formasPagamento`, `taxaCartaoBp`) e dias (`prazoRecebimentoDias`). E deixa sem proveniência números que nascem
de padrão (`comissaoBp`, `taxaMensalBp`, `vidaUtilMeses`, `sazonalidadeBp`).

| Caminho | O que é | O que deixa aberto |
|---|---|---|
| (a) `Valor` único com campo `unidade` (`CENTS`, `BP`, `QTD`, `DIAS`) e `valor` em string | um primitivo só | a unidade vem do payload: `formasPagamento.pix` com `unidade = CENTS` passa no tipo e quebra no motor; o snapshot não mostra a unidade de cada campo |
| **(b) família tipada** (`ValorCents`, `ValorCentsComSinal`, `ValorBp`, `ValorQtd`, `ValorDias`), gerada por `valorDe(...)` | a unidade é do contrato, visível no snapshot e no `.gen.ts` | cinco nomes a mais no snapshot |
| (c) manter o esboço | `cents` para tudo | contagem e bp viram "centavos" no tipo gerado; o FE e o motor convertem por convenção não escrita |

**Recomendação: (b).** É a única em que o tipo diz a unidade, e o gate de snapshot passa a proteger isso.

### F-SIM-10 — Forma da `fonte`
F-SIM-6 pede "fonte citável, data e faixa"; o esboço tem `fonte: string | null` e não tem data.

| Caminho | O que é |
|---|---|
| (a) string livre | não carrega a data; o motor não distingue fonte de mercado de fonte de lei |
| **(b) objeto `{ tipo, referencia, dataReferencia }`**, com `tipo ∈ {MERCADO, LEI, CONVENCAO, KIT, DOCUMENTO}` | a data é obrigatória quando `tipo = MERCADO` (refine) |
| (c) id de um catálogo de padrões do kit, resolvido no servidor | exige o catálogo com valores no kit, que hoje só traz códigos (`catalogoServicosFiscais.ts`); trava o PR-0 no PR-5 |

**Recomendação: (b).** Cumpre F-SIM-6 sem esperar o catálogo; o PR-5 pode acrescentar um `padraoId` opcional depois.

### F-SIM-11 — Sinal e teto do dinheiro de entrada
O esboço aceita `-?\d+` em todo valor e não tem teto. A casa tem dois tetos diferentes:
- o simulador irmão usa `centsIn` não negativo até `Number.MAX_SAFE_INTEGER` (`TaxSimulationDto.ts:11`);
- `MAX_CENTS = 2_147_483_647` (R$ 21.474.836,47; `money.ts:20`) é o teto de política que o dono ratificou em 31/08 como guarda
  contra erro de digitação, aplicado nos DTOs que lançam (memória do projeto "MAX_CENTS é política").

| Caminho | O que é |
|---|---|
| (a) como o esboço | todo valor aceita negativo, sem teto |
| **(b) não negativo e até `MAX_CENTS`**, com sinal só onde o domínio permite (caixa de abertura) | guarda de digitação num formulário em que o usuário digita muito; (I) nenhum campo do cenário (valor de um mês, de um item ou de um saldo) passa de R$ 21 milhões numa empresa até o limite da EPP |
| (b') não negativo e até `Number.MAX_SAFE_INTEGER`, sinal só no caixa | mesma convenção do `TaxSimulationDto` |
| (c) número JS | perde precisão acima de 2^53 e foge da convenção de centavos em string |

**Recomendação: (b).** Se o dono preferir uniformidade com o simulador irmão, (b') muda só o `refine`.

### F-SIM-12 — Ano aceito pelo contrato
F-SIM-4 b diz "2027, com 2026 como histórico". O oráculo de hoje (exemplos 2 e 8 do manual do PGDAS-D) é de 2026.

| Caminho | O que é | O que deixa aberto |
|---|---|---|
| **(a) `ano: z.literal(2027)`** | o que F-SIM-4 b diz | o oráculo de 2026 roda contra `simplesCalc.apurar` direto (a mesma função pura que o cenário chama), não pelo cenário inteiro |
| (b) 2026 ou 2027, com 2026 só para regressão | o cenário inteiro roda contra o oráculo de 2026 e contra a página | alarga F-SIM-4 b: precisa de resposta explícita do dono |
| (c) faixa 2027–2033 desde já | antecipa F-SIM-4 c | campo aceito sem motor (2028+ sem tabela) |

**Recomendação: (a).** É a leitura literal do que foi ratificado; ampliar o ano é mudança aditiva (`z.union` de literais)
quando a etapa própria do F-SIM-4 c chegar.

### F-SIM-13 — País na borda no contrato
O esboço põe `uf`, `municipioIbge` e `cnae` soltos no `perfil`. F-SIM-5 b manda município, UF, convenção e setor para a
borda, e a regra do dono de 15/11 ("o país fica na borda, sempre") vale para código novo. O `PRE-ADR-PAIS-NA-BORDA` (F-PB-1..6)
ainda não foi ratificado e não está nesta worktree.

| Caminho | O que é |
|---|---|
| (a) como o esboço | campos do Brasil no centro do perfil |
| **(b) `perfil.jurisdicao` discriminada por `pais`**, só com o ramo `BR` (`uf`, `municipioIbge`, `cnae`) na versão 1 | outro país vira ramo novo, sem quebrar a versão 1. Os códigos por item (`cTribNac`, `ncm`, `CLT`) ficam com o nome atual até o PRE-ADR-PAIS-NA-BORDA decidir; aí `versao: 2` |
| (c) esperar o PRE-ADR-PAIS-NA-BORDA | o PR-0 fica parado |

**Recomendação: (b),** como versão incremental da estrutural: o discriminador entra agora, que é barato, e o resto segue a
decisão do PRE-ADR-PAIS-NA-BORDA.

### F-SIM-14 — Campo do contrato sem motor
O PR-0 congela o §5 inteiro, mas eventos de folha (PR-2), compras com crédito (PR-3), caixa (PR-4) e proveniência na saída
(PR-5) só ganham motor depois. Campo aceito e ignorado é bug pela regra da casa (memória "param aceito e ignorado").

| Caminho | O que é |
|---|---|
| **(a) contrato §5 inteiro no PR-0**; até o PR que dá motor ao campo, campo preenchido ⇒ 400 nomeado (`CAMPO_SEM_MOTOR`, com o caminho do campo) no serviço do PR-1 | o FE tipa uma vez; a regra fica no serviço, não no DTO |
| (b) o contrato cresce por PR | cada PR muda o snapshot e o `.gen.ts`; o FE só começa no fim |
| (c) contrato inteiro, campo sem motor aceito com aviso | é o "aceito e ignorado" |

**Recomendação: (a).** Campos que nem o §5 tem (FAP, FPAS, convenção, ICMS por UF) entram nos PRs deles como opcionais, que é
mudança aditiva na versão 1.

### F-SIM-15 — O que a sazonalidade quer dizer
O esboço tem `sazonalidadeBp: int[12] | null`, sem regra de soma e sem proveniência, embora a sazonalidade seja padrão de
mercado (PRE-ADR §7) e F-SIM-6/F-SIM-7 peçam fonte, data e faixa. O bloco "Meses do ano" da página (`x.meses.sv/rv`) não foi
lido nesta sessão.

| Caminho | O que é | O que deixa aberto |
|---|---|---|
| (a) fator relativo à média do ano: 12 fatores com soma 120 000 bp | o `tipico` é a média do ano; o ano fecha em 12 × típico | o usuário não diz "dezembro é 1,8× um mês comum" sem mexer nos outros 11; soma errada reprova |
| **(b) fator livre sobre o mês típico** (12 fatores, cada um com origem, fonte e faixa; teto por fator, ex. 50 000 bp) | o `tipico` é "um mês comum"; o mês k = típico × fator k; o ano é o que der | sem soma para conferir; o usuário pode inflar o ano sem perceber (a tela mostra o total) |
| (c) participação de cada mês no ano (soma 10 000 bp) + receita anual | o usuário informa o ano e a distribuição | troca a pergunta do típico pela do ano, contra a camada 1 do F-SIM-3 c ("mês típico + sazonalidade") |

**Recomendação: (b).** É a leitura direta de "mês típico + sazonalidade" do F-SIM-3 c, não pede renormalização, e cada fator
carrega a própria proveniência como qualquer padrão. Ler o bloco "Meses do ano" da página antes de ratificar (§7).

---

## 6. Pendente de validação externa (não entra como regra decidida)

O PR-0 só dá forma a estes campos; o que eles valem é do motor, e o motor depende de norma não lida (PRE-ADR §4):

- `REGIMES_CENARIO` inclui `SIMPLES_IBS_CBS_REGULAR`: a opção pelo regime regular em 2027 tem prazos divergentes (lacuna
  `7064`, com o dono) e a partilha do Anexo XX está em aberto (`a3a5`).
- `abertura.saldoCredor.pis/cofins`: o que acontece com o saldo depois da extinção em 01/01/2027 (LC 214 art. 542; regra de
  transição não lida).
- `abertura.saldoCredor.cbs/ibs`: compensação e ressarcimento (LC 214), não lidos.
- `REAL_ESTIMATIVA` e `REAL_BALANCETE`: `taxAssessmentCalcAnual.ts` localizado, não lido (L).
- Eventos `FERIAS`, `DEMISSAO`: terço de férias, estabilidades na rescisão (`883f`) e os demais itens de folha do PRE-ADR §4.

## 7. Insumos ausentes

- **Ficha da página congelada.** F-SIM-8 congela a página **depois** da rodada de texto em curso; a versão congelada ainda
  não existe. O item 14 usa uma fixture mínima; a ficha vira fixture de regressão no PR que a receber.
- **Bloco "Meses do ano" da página** (`x.meses.sv/rv`): não lido; insumo do F-SIM-15.
- **Valores de mercado** (insumo por serviço, taxa de cartão, mix de pagamento, sazonalidade, comissão): nenhum pesquisado
  (PRE-ADR §7). O PR-0 não precisa deles; a fixture usa `ESTIMADO`.
- **Valores no kit:** `catalogoServicosFiscais.ts` traz só códigos. Os padrões do kit (F-SIM-6 b) pedem uma versão nova do
  kit (`kit.v7.ts`; o v6 diz "nunca edite este arquivo"). É do PR-5.
- **Corpo de `dp/models/folha/` e de `taxAssessmentCalcAnual.ts`:** não lidos. Ler antes do BRIEF do PR-1 e do PR-2 (PRE-ADR §7).

## 8. Achados fora de escopo (registrados na caixa)

- **`LOCACAO_MOVEL`, retenções e deduções sem origem no cenário** (§2): o motor do PR-1 precisa avisar. É lacuna de spec do
  PR-1, na caixa.
- **Status do `ADR-INCR-EFICIENCIA-FISCAL` desatualizado:** o cabeçalho (linha 18) diz "Proposed — RATIFICAÇÃO PENDENTE" e a §8
  "FORKS — RATIFICAÇÃO PENDENTE", mas F-EF-1..13 foram ratificados em 21/10 (`D-2026-10-21-FORKS-EFICIENCIA-FISCAL`) e o nó está
  `inflight`. O PR-0 edita o mesmo arquivo; corrigir o cabeçalho é fora do escopo da emenda. Na caixa.
- **Ratificação dos F-SIM sem cédula em `docs/plano/decisoes/`:** a decisão de 21/11 vive só no PRE-ADR, ainda não commitado.
  Na caixa.

Ids na caixa (todos com `--pai L-20261121-181921-ea2b`): `L-20261121-194911-ffd3` (origem ausente no cenário),
`L-20261121-194911-d4b1` (status do ADR), `L-20261121-194913-57da` (cédula dos F-SIM).

## 9. Write-set

### 9.1 PR-0

- **Editar:** `docs/adr/ADR-INCR-EFICIENCIA-FISCAL.md` (emenda D8 e I-5); `docs/plano/nos/SIMULACAO-CENARIO.md` (fold).
- **Criar:** `server/src/features/accounting/dtos/CenarioSimulacaoDto.ts`;
  `server/src/features/accounting/dtos/__tests__/CenarioSimulacaoDto.test.ts`;
  `server/src/features/accounting/dtos/__tests__/fixtures/cenarioSalaoMinimo.ts`.
- **Registros (PAR-001, derivados):** `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json` e
  `my-app/types/contracts/accounting/CenarioSimulacaoDto.gen.ts`. Em 21/11, o PR aberto #1146 edita o mesmo
  `accounting/dtos/__tests__/__dto-shapes__.json` (o #1133 edita o de `teammates`): conferir com `node scripts/paralelo.mjs plano SIMULACAO-CENARIO` antes de abrir a sessão.

### 9.2 Nó inteiro (rascunho do PRE-ADR §10, para a nota)

- **Editar:** `server/src/features/accounting/models/taxSimulation.ts`.
- **Criar:** `server/src/features/accounting/models/cenarioSimulacao*.ts`, `server/src/features/accounting/services/CenarioSimulacaoService.ts`,
  `server/src/controllers/cenarioSimulacaoController.ts`, testes ao lado.
- **Registros:** `server/src/lib/factory.ts`, `server/src/routes/accounting.ts`, `server/src/routes/docs/accounting.tax-simulation.paths.ts`,
  `server/src/routes/docs.paths.ts`, `server/public/openapi.json`.
- Os BRIEFs do PR-1..6 refinam esta lista.
- Conferência com `node scripts/paralelo.mjs sugerir SIMULACAO-CENARIO` (21/11): o rascunho também listou arquivos que este
  BRIEF só cita como insumo lido (`dates.ts`, `money.ts`, `simplesCalc.ts`, `taxAssessmentCalc.ts`, `taxAssessmentCalcAnual.ts`,
  `TaxSimulationService.ts`, `TaxSimulationDto.ts`, `dtoShapeSnapshot.test.ts`, `schema.prisma`, `auditCanonical.ts`, o kit). Eles
  ficaram fora do `write_set` da nota, porque nenhum PR previsto os edita. Se o BRIEF do PR-1 decidir mexer em `taxAssessmentCalc.ts`
  (entrada de LALUR simulado, item 9 do PRE-ADR §3), ele acrescenta o arquivo.

## 10. Invariantes que o PR-0 prova

1. Todo objeto do contrato é `.strict()` (item 2).
2. Nenhum campo de número de lei (item 7).
3. `origem = PADRAO` sempre com fonte; fonte de mercado sempre com data e faixa (item 8).
4. Valor dentro da própria faixa (item 8).
5. Toda data é real e cai no ano simulado (item 10).
6. Nenhuma referência órfã (item 11).
7. Somas fechadas, sem renormalização (item 12).
8. O PR não toca rota, serviço, factory, openapi, i18n nem auditoria (item 18).
