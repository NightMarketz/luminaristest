# BRIEF — BE-INCR-SIMULACAO-CENARIO PR-0: emenda à D8 e contrato do cenário informado (sem lógica)

> Nó [`SIMULACAO-CENARIO`](../plano/nos/SIMULACAO-CENARIO.md). Insumo principal:
> [`PRE-ADR-SIMULACAO-COMPLETA-12-MESES.md`](../adr/PRE-ADR-SIMULACAO-COMPLETA-12-MESES.md) (RATIFICADO, dono, 21/11/2026,
> F-SIM-1..8). Escrito pela `sessao-planejamento` contra `origin/main` `43719baaf`, em 2026-11-21.
> Graus: **V** = lido nesta sessão no código ou no documento; **I** = inferido; **L** = localizado, corpo não lido.

## TLDR (2 linhas)

O PR-0 faz três coisas: emenda a D8 do `ADR-INCR-EFICIENCIA-FISCAL` (o simulador aceita o razão **ou** um cenário
informado, e o caminho do cenário não grava nada, nem sugestão); materializa o contrato do cenário em Zod `.strict()`. Desde a emenda de 24/11, o esqueleto fica no centro
(`server/src/features/accounting/dtos/ScenarioDto.ts`) e a extensão do Brasil em `paises/br/dtos/CenarioBrDto.ts`; e atualiza o snapshot de shape e o `.gen.ts`. Não tem rota,
serviço, cálculo nem tela.

**Risco principal:** o PR-0 congela no snapshot a forma que o FE e os PR-1..6 vão consumir. O esboço do PRE-ADR §5 tem
sete pontos em que ele não fecha com o motor ou com regra já ratificada (§5, F-SIM-9..15, todos **RATIFICAÇÃO
PENDENTE**). O mais caro é o **F-SIM-9**: o esboço põe contagem, dias e pontos-base dentro de `Valor.cents`. Este PR só
recebe `executa` depois que os sete estiverem respondidos.


> **Ratificação 24/11:** R1–R7 e F-PBA-1..7 ratificados, todos (a) ([[D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS]]). Os forks F-PBA citados abaixo
> já não travam nada; o PR-0 segue sem `executa`, com F-SIM-9..15 pendentes; o texto fica como registro do que dependia de cada um.
>
> **EMENDA PAÍS NA BORDA (24/11/2026)** — [`ADR-PAIS-NA-BORDA`](../adr/ADR-PAIS-NA-BORDA.md) (Proposed).
> - **Autorização:** dono, 24/11, questionário da sessão maestro. À pergunta sobre os BRIEFs ratificados, a resposta foi
>   **"Já nascem pela regra"** (D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA §6). Para a simulação completa, a resposta foi **"Planejar
>   já"**, e a §7 da mesma cédula diz que "o BRIEF do PR-0 também nasce pela regra". **Este PR-0 continua sem `executa`.**
> - **Divergência registrada** com a regra 1 da `sessao-planejamento` ("não edita spec existente"). A edição no lugar foi
>   mandada pela tarefa e pela §6/§7 da cédula.
> - **O que muda:**
>   - O contrato vira **dois arquivos**. O esqueleto do cenário é conceito universal (perfil, abertura, cadastros, mês
>     típico, sazonalidade, meses, eventos, valor com proveniência). Ele fica no centro, em inglês (F-PB-4 b; F-PBA-1 a).
>   - O que só existe no Brasil vai para a extensão do país, em português (F-PBA-2 a): UF, município IBGE, CNAE, regimes,
>     ECF, LC 224, `cTribNac`, NCM, CLT/parceiro, PIX, ISS, saldos de PIS/COFINS/ICMS/CBS/IBS, base negativa da CSLL e Lalur.
>   - A extensão compõe o schema que a rota BR usa. O centro não importa a borda (R3).
>   - É o ramo **(d)** do F-SIM-13, que segue **PENDENTE**. Checklist e §4 foram escritos nesse ramo, como a skill manda
>     para fork pendente. Se o dono escolher (b), volta o arquivo único `CenarioSimulacaoDto.ts` da versão de 21/11.
>
> | Antes (21/11) | Depois (24/11, ramo d do F-SIM-13) |
> |---|---|
> | `server/src/features/accounting/dtos/CenarioSimulacaoDto.ts` (um arquivo) | centro `server/src/features/accounting/dtos/ScenarioDto.ts` + extensão BR `server/src/features/accounting/paises/br/dtos/CenarioBrDto.ts` |
> | `CenarioEntradaSchema` / `CenarioSaidaSchema` | `makeScenarioInputSchema(ext)` / `makeScenarioOutputSchema(ext)` no centro; `CenarioSimulacaoBrSchema` / `CenarioSaidaBrSchema` na extensão BR |
> | `valorDe(...)`, `Valor*Schema` (`valor`, `origem`, `fonte`, `faixa`) | `valueOf(...)`, `Value*Schema` (`value`, `origin`, `source`, `range`); o tipo é `ValueWithSource<T>` |
> | `ORIGENS_VALOR` = `PADRAO`, `ESTIMADO`, `REAL` | `VALUE_ORIGINS` = `DEFAULT`, `ESTIMATED`, `ACTUAL` (o mesmo F-SIM-6, só o nome; [F-PBA-1]) |
> | `TIPOS_FONTE` = `MERCADO`, `LEI`, `CONVENCAO`, `KIT`, `DOCUMENTO` | `SOURCE_TYPES` = `MARKET`, `LAW`, `COLLECTIVE_AGREEMENT`, `KIT`, `DOCUMENT` |
> | `perfil`, `abertura`, `cadastros`, `tipico`, `sazonalidade`, `meses`, `eventos` | `profile`, `opening`, `registry`, `typical`, `seasonality`, `months`, `events` |
> | `perfil.jurisdicao` (`pais`, `uf`, `municipioIbge`, `cnae`), `perfil.regimes`, `perfil.apuracao`, `perfil.issAliquotaBp` | `profile.country` (centro, `'BR'`) + `profile.br` = `{ jurisdicao, regimes, apuracao, issAliquotaBp }` (extensão) |
> | `abertura.saldoCredor.{pis,cofins,icms,cbs,ibs}`, `prejuizoFiscal`, `baseNegativaCsll` | `opening.taxCredits` (registro por tributo, chaves do país), `opening.taxLossCarryforward` (centro); `opening.br.baseNegativaCsll` (extensão) |
> | `equipe[].vinculo`, `equipe[].cnpj`, `servicos[].cTribNac`, `produtos[].ncm` | `registry.team[].br.{vinculo, possuiCnpj}`, `registry.services[].br.cTribNac`, `registry.products[].br.ncm` |
> | `tipico.formasPagamento.{pix,…}`, `prazoRecebimentoDias.{…}`, `taxaCartaoBp`, `receitaNaoUso` | `typical.paymentMix` e `typical.settlementDays` (registro pelas formas que a extensão declara), `typical.cardFeeBp`; `typical.br.receitaNaoUso` |
> | `meses[].lalur`, `meses[].receitaNaoUso` | `months[].br.{lalur, receitaNaoUso}` |
> | `eventos[].tipo` = `ADMISSAO`, `DEMISSAO`, `FERIAS`, `COMPRA_IMOBILIZADO`, `EMPRESTIMO`, `RETIRADA_SOCIO` | `events[].kind` = `HIRE`, `TERMINATION`, `VACATION`, `FIXED_ASSET_PURCHASE`, `LOAN`, `OWNER_WITHDRAWAL`; o motivo da demissão vem da lista da extensão (`MOTIVOS_DEMISSAO`) |
> | `my-app/types/contracts/accounting/CenarioSimulacaoDto.gen.ts` | `my-app/types/contracts/accounting/ScenarioDto.gen.ts` (primitivos) e `my-app/types/contracts/accounting/paises/br/CenarioBrDto.gen.ts` (o contrato que a tela usa). O caminho exato é o que o G2 gerar (item 0) |
>
> - **Dependências novas do PR-0**, além dos F-SIM-9..15:
>   - F-PBA-1 (alcance do inglês: chave JSON e valor de enum);
>   - F-PBA-2 (português na extensão);
>   - F-PBA-5 (o `TaxSimulationService` e o motor do PR-1 consomem a extensão BR; o PR-0 não, mas o desenho conta com o
>     ramo a);
>   - F-SIM-13, que muda de recomendação.
> - **Pré-requisito: o item 0 da guarda** (ADR §3, ajuste G2 do `dtoShapeSnapshot.test.ts`). Hoje o snapshot descobre só
>   `src/features/<domínio>/dtos/` (`dtoShapeSnapshot.test.ts:10, 121–125`). Sem o G2, o `CenarioBrDto.ts` fica fora do gate em
>   silêncio. O item 0 entra no 1º PR de código emendado; se este PR-0 for o primeiro, ele o carrega.

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
    `my-app/types/contracts/accounting/paises/br/CenarioBrDto.gen.ts` desde a emenda de 24/11).

**Fronteira (STOP do CLAUDE.md):** o cenário não é tabela que o usuário desenha nem núcleo que a lei grava: é entrada de
uma requisição sem estado (F-SIM-2 a). Nada de DynamicTable, nada de model Prisma. O esqueleto mora em `features/accounting/dtos/ScenarioDto.ts` (centro)
e a extensão BR em `features/accounting/paises/br/dtos/CenarioBrDto.ts` (emenda de 24/11). Nenhum dos dois importa
serviço, repositório nem Prisma, e o centro não importa a extensão (R3 do ADR-PAIS-NA-BORDA).

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

> A coluna "Origem no cenário" usa os nomes de 21/11. Os nomes de hoje, no centro e na extensão BR, estão na tabela
> de→para da emenda de 24/11 (topo). O rastreio não muda: o mesmo campo existe, só com outro nome e outro arquivo.

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
   > (esqueleto `makeScenarioInputSchema` em `dtos/ScenarioDto.ts`, composto pela extensão do país;
   > no Brasil, `CenarioSimulacaoBrSchema` em `paises/br/dtos/CenarioBrDto.ts`). O cenário roda as mesmas funções puras (`simplesCalc`,
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

> Itens escritos no ramo **(d)** do F-SIM-13 (pendente) e no ramo recomendado de F-PBA-1/-2 (emenda de 24/11).

2. **Criar os dois arquivos do contrato** (§4), com `.strict()` em todo objeto e `version: z.literal(1)`:
   - **centro** `server/src/features/accounting/dtos/ScenarioDto.ts`, em inglês: os primitivos de proveniência
     (`VALUE_ORIGINS`, `SOURCE_TYPES`, `SourceSchema`, `valueOf`, `ValueCentsSchema`, `SignedValueCentsSchema`,
     `ValueBpSchema`, `ValueQtySchema`, `ValueDaysSchema`, `ValueFactorBpSchema`, o tipo `ValueWithSource<T>`), a interface
     `ScenarioCountryExtension` e as funções `makeScenarioInputSchema(ext)` e `makeScenarioOutputSchema(ext)`. **Não importa
     nada de `paises/`**;
   - **extensão BR** `server/src/features/accounting/paises/br/dtos/CenarioBrDto.ts`, em português: `extensaoBr`
     (jurisdição, `REGIMES_CENARIO`, `apuracao`, `issAliquotaBp`, `VINCULOS`, `possuiCnpj`, `cTribNac`, `ncm`,
     `FORMAS_PAGAMENTO`, `TRIBUTOS_COM_CREDITO`, `baseNegativaCsll`, `receitaNaoUso`, `lalur`, `MOTIVOS_DEMISSAO`) e os schemas
     compostos `CenarioSimulacaoBrSchema = makeScenarioInputSchema(extensaoBr)` e `CenarioSaidaBrSchema =
     makeScenarioOutputSchema(extensaoBr)`, com os tipos (`z.infer`).
   - O molde dos enums exportados é o de `REGIMES_SIMULADOS` em `TaxSimulationDto.ts:57`.
   - **Teste:** chave desconhecida em qualquer nível reprova no Zod. Um caso por nível do schema composto: raiz,
     `profile`, `profile.br`, `opening`, `opening.br`, `registry`, `typical`, `months[]`, `months[].br`, cada variante de
     `events[]`. Outro teste: o centro não importa a borda (`check:arch`, `P1`, item 17).
3. **`profile.br.apuracao` e `profile.br.issAliquotaBp`** (não estão no esboço; §2):
   - `apuracao` traz os 8 campos de `PerfilApuracaoPresumido` (`taxAssessmentCalc.ts:327-338`) + `lucroRealObrigatorio`,
     9 ao todo, todos obrigatórios;
   - a data `inicioAtividadeEm` substitui o `perfil.inicioAtividade` do esboço, e a competência sai dela por `slice(0, 7)`,
     como em `TaxSimulationService.ts:275`;
   - os domínios são os do model `CompanyFiscalProfile` (`server/prisma/schema.prisma:1929-1930`: `ecfIndAliqCsll ∈ {'1',
     '4'}`, `ecfIndRecReceita ∈ {'1', '2'}`), e as datas passam por `isValidDateOnly`;
   - o JSDoc cita os padrões de `perfilSimulado` (`TaxSimulationService.ts:451-463`) como o que a tela oferece;
   - `issAliquotaBp` é `ValueBpSchema.nullable()` (F-SIM-9).
   - **Teste:** cenário sem `apuracao` reprova; `ecfIndAliqCsll` fora do domínio reprova; `issAliquotaBp = null` passa.
4. **Cadastro** (`registry`):
   - `team[].br.vinculo ∈ {CLT, PARCEIRO, SOCIO}`;
   - o JSDoc da extensão fixa que, com `PARCEIRO`, o `commissionBp` do centro é a cota-parte do profissional-parceiro
     (Lei 12.592 art. 1º-A, já citada em `simplesCalc.ts:30`);
   - ids únicos por lista.
   - **Teste:** id repetido em `team`, `services` ou `products` reprova, com erro nomeado (`superRefine`, mensagem com o
     id). A regra de unicidade é do centro, e o teste roda no schema composto.
5. **Formatos de código**, na extensão BR (o esboço aceitava qualquer string):
   - `profile.br.jurisdicao`: `uf` no enum das 27 UFs, `municipioIbge` `^\d{7}$`, `cnae` `^\d{7}$` (F-SIM-13);
   - `registry.services[].br.cTribNac` `^\d{6}$` (a regex de `AtividadeInputSchema`, `simplesCalc.ts:71-74`);
   - `registry.products[].br.ncm` `^\d{8}$`.
   - **Teste:** um caso inválido por campo.
6. **`receitaNaoUso`**, na extensão BR: no mês (`months[].br.receitaNaoUso`, camada 2, opcional) e no típico
   (`typical.br.receitaNaoUso`, camada 1, obrigatório, centavos com proveniência). Fica na extensão porque
   `MesRegimeEntrada.naoUsoCents` entra na base do Presumido e do ISS (`taxSimulation.ts:223-225`), e o nome em inglês não
   foi lido em contexto que o defina. **Teste:** parse com e sem o campo no mês.
7. **O cenário não carrega número de lei.** Nenhum campo de alíquota de tributo, faixa do Simples, sublimite, teto do RGPS,
   presunção ou tabela. O que é da empresa e não da lei fica no cenário: a alíquota de ISS do município informada pelo
   usuário, e o FAP quando o PR-2 chegar.
   - **Teste:** percorre todas as chaves do `CenarioSimulacaoBrSchema` (via `z.toJSONSchema`, em profundidade).
   - Reprova a chave cujo nome contenha, sem distinguir maiúsculas, um dos termos: `aliquota`, `sublimite`, `limite`,
     `teto`, `presuncao`, `anexo`, `reparticao`, `partilha`, `fatorR`, `tabela`, `rate`, `cap`, `ceiling`, `bracket`,
     `table`, `limit`.
   - Exceção literal no teste: `issAliquotaBp` (dado da empresa, extensão BR).
   - `range` não está na lista: é a faixa de proveniência de todo valor (F-SIM-7). Por isso os juros de dívida e de
     empréstimo se chamam `monthlyInterestBp`, e não `monthlyRateBp`.
8. **Proveniência** (F-SIM-6, F-SIM-7, F-SIM-10). As regras do valor ficam no centro, num `superRefine` do `valueOf`. Têm
   teste próprio porque `.refine` não aparece no snapshot (`dtoShapeSnapshot.test.ts:31-34`):
   - `origin = DEFAULT` ⇒ `source` obrigatória;
   - `source.type = MARKET` ⇒ `referenceDate` e `range` obrigatórias (F-SIM-6: "fonte citável, data e faixa");
   - `range = [min, max]` ⇒ `min ≤ value ≤ max`;
   - `origin = ACTUAL` ⇒ `source` opcional (o documento importado chega no PR-6).
   - **Teste:** um caso por regra, aceitando e reprovando.
9. **Dinheiro (F-SIM-11).** Centavos como string de inteiro, não negativo e até `MAX_CENTS` (`money.ts:20`), salvo o campo
   que o domínio permite negativo (`opening.cash`). **Teste:** `"-1"` reprovado fora do caixa e aceito nele;
   `MAX_CENTS + 1` reprovado; `"1.5"` e `"abc"` reprovados.
10. **Datas e competências**, regras do centro:
    - toda data de `events[]` e `opening.taxesPayable[].dueDate` passa por `isValidDateOnly` (memória do projeto: regex não
      valida calendário, e `2027-02-30` rola para março);
    - toda competência de `months[]` e toda data de evento estão dentro de `profile.year`;
    - `months[].period` sem repetição;
    - `opening.priorMonths[].period` anterior a `profile.year`, sem repetição.
    - **Teste:** `2027-02-30` reprovado; evento em `2028-01-05` com ano 2027 reprovado; competência repetida reprovada.
11. **Referências cruzadas**, regras do centro:
    - `events[].personId` ∈ `registry.team[].id`;
    - `OWNER_WITHDRAWAL.ownerId` ∈ `team[]` com vínculo de sócio. A extensão declara qual vínculo é sócio:
      `vinculoSocio: 'SOCIO'`;
    - `registry.services[].professionalId` ∈ `team[].id` ou `null`;
    - as chaves de `typical.servicesPerType` estão contidas em `services[].id`;
    - as chaves de `typical.salesPerProduct` estão contidas em `products[].id`.
    - **Teste:** um caso órfão por referência, com o id na mensagem.
12. **Soma fechada.** `typical.paymentMix` soma 10 000 bp (as chaves são as `FORMAS_PAGAMENTO` da extensão BR). Somar
    diferente reprova, em vez de o motor renormalizar em silêncio (memória do projeto "param aceito e ignorado é bug").
    **Teste:** 9 999 bp e 10 001 bp reprovados. A regra da `seasonality` depende do F-SIM-15 e entra neste item quando ele
    for respondido.
13. **Saída**, pelo `CenarioSaidaBrSchema`, montado pelo PRE-ADR §5.2:
    - `regime` no enum `REGIMES_CENARIO` da extensão, não `z.string()`;
    - `months` com `.length(12)`;
    - `parametersSha256` `^[0-9a-f]{64}$`;
    - `provenance` em bp, com soma 10 000 (refine, com teste);
    - centavos com sinal só onde o resultado pode ser negativo (`resultCents`, `balanceCents`, `effectCents`), como
      `signedCents` em `TaxSimulationDto.ts:13`;
    - `incomeStatement` e `balanceSheet` no centro. O vocabulário `DRE`/`BP` é do país (PRE-ADR §2).
    - **Teste:** parse de uma saída mínima válida; `months` com 11 reprovado.
14. **Fixture mínima** `server/src/features/accounting/paises/br/dtos/__tests__/fixtures/cenarioSalaoMinimo.ts`. É um salão
    com 1 sócio, 1 CLT, 1 parceiro, 2 serviços, 1 produto, sem `months` nem `events`, e todos os valores com `origin =
    ESTIMATED`: nenhum número de mercado entra sem fonte (F-SIM-6). **Teste:** parse sem erro no `CenarioSimulacaoBrSchema`.
    A ficha da página congelada entra quando existir (§7).

### 3.3 Gates e fronteira do PR

15. **Snapshot de shape e tipos gerados**, já com o G2 da guarda (item 0):
    - `UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot` atualiza o
      `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json`;
    - a chave do centro é `accounting` (`ScenarioDto.ts`, só os primitivos exportados); a da borda é `accounting/paises/br`
      (`CenarioBrDto.ts`, com os dois schemas compostos);
    - o teste gera `my-app/types/contracts/accounting/ScenarioDto.gen.ts` e
      `my-app/types/contracts/accounting/paises/br/CenarioBrDto.gen.ts`, com os tipos `CenarioSimulacaoBr` e `CenarioSaidaBr`
      que a tela consome. Se o G2 nomear de outro jeito, vale o que ele gerar, dito no corpo do PR;
    - **armadilha do Windows** (memória do projeto "UPDATE do snapshot reordena"): o UPDATE pode reordenar todos os domínios.
      Reverta o churn e mantenha só as entradas novas.
    - **Prova:** o diff do JSON só tem as chaves novas, e rodar o teste sem `UPDATE` sai verde.
16. **Testes do DTO**, com escopo e o caminho antes da flag:
    - `server/src/features/accounting/dtos/__tests__/ScenarioDto.test.ts`, para as regras do centro (itens 8–11, contra uma
      extensão de teste mínima, sem o Brasil);
    - `server/src/features/accounting/paises/br/dtos/__tests__/CenarioBrDto.test.ts`, para os itens 2–7 e 12–14;
    - comando: `npx jest <caminho> --selectProjects unit`.
17. **`tsc` limpo** nos dois lados (`cd server && npx tsc --noEmit`; `cd my-app && npx tsc --noEmit`) e **`npm run
    check:arch`** sem violação nova:
    - nenhum dos DTOs importa serviço, repositório ou Prisma;
    - `ScenarioDto.ts` não importa `paises/` (`P1`), e um import plantado reprova;
    - a extensão BR importa o centro, o que é permitido.
18. **Nada além do write-set.** Sem rota, controller, serviço, factory, `docs.paths.ts`, `openapi.json`, i18n ou
    `auditCanonical.ts`: o contrato ainda não é exposto, então nenhum desses gates muda. **Prova:** `git diff --stat
    origin/main` lista só os arquivos da §9.1 (mais os do item 0, se ele vier neste PR).
19. **Fold no próprio PR.** `node scripts/plano-vault.mjs fold SIMULACAO-CENARIO --pr <n>` (o estado continua `planned`,
    porque o PR-1..6 seguem abertos) e `node scripts/plano-vault.mjs check` saindo 0.

---

## 4. Contratos esboçados (forma materializável; segue a recomendação dos forks da §5)

O esboço está no ramo **(d)** do F-SIM-13 (pendente). Em dois blocos: o centro, em inglês, e a extensão BR, em português.
Os refinamentos de 21/11 continuam os mesmos, só com outro nome e outro arquivo.

```ts
// server/src/features/accounting/dtos/ScenarioDto.ts — CENTRO. Não importa paises/ (R3). Forma final depende de F-SIM-9..15.
import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { MAX_CENTS } from '../models/money';

export const VALUE_ORIGINS = ['DEFAULT', 'ESTIMATED', 'ACTUAL'] as const;                       // F-SIM-6 (PADRAO/ESTIMADO/REAL)
export const SOURCE_TYPES = ['MARKET', 'LAW', 'COLLECTIVE_AGREEMENT', 'KIT', 'DOCUMENT'] as const; // F-SIM-10 (b)

export const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const realDate = z.string().refine(isValidDateOnly, 'real date YYYY-MM-DD');
const nonNegCents = z.string().regex(/^\d+$/).refine((s) => BigInt(s) <= BigInt(MAX_CENTS), 'above MAX_CENTS'); // F-SIM-11 (b)
const signedCentsIn = z.string().regex(/^-?\d+$/);                                                            // só opening.cash

export const SourceSchema = z.object({
  type: z.enum(SOURCE_TYPES),
  reference: z.string().min(1),                  // "LC 116 art. 8º II", "CCT SP006651/2026 cl. 5ª", "pesquisa <slug> [Dnn]"
  referenceDate: realDate.nullable(),            // obrigatória com type = MARKET (refine, item 8)
}).strict();

// F-SIM-9 (b): uma família de primitivos; a unidade é do contrato e aparece no snapshot.
export const valueOf = <T extends z.ZodTypeAny>(value: T) => z.object({
  value,
  origin: z.enum(VALUE_ORIGINS),
  source: SourceSchema.nullable(),               // obrigatória com origin = DEFAULT (refine, item 8)
  range: z.tuple([value, value]).nullable(),     // F-SIM-7 a
}).strict();
export type ValueWithSource<T> = { value: T; origin: (typeof VALUE_ORIGINS)[number]; source: z.infer<typeof SourceSchema> | null; range: [T, T] | null };
export const ValueCentsSchema = valueOf(nonNegCents);
export const SignedValueCentsSchema = valueOf(signedCentsIn);
export const ValueBpSchema = valueOf(z.number().int().min(0).max(10_000));
export const ValueQtySchema = valueOf(z.number().int().min(0));
export const ValueDaysSchema = valueOf(z.number().int().min(0).max(366));
export const ValueFactorBpSchema = valueOf(z.number().int().min(0).max(50_000));   // F-SIM-15 (b): 10 000 bp = 1,0×

/** O que um país acrescenta ao cenário. Cada `*` é um ZodRawShape que entra sob a chave `br` (ou a do país) do nível. */
export interface ScenarioCountryExtension {
  country: string;                                   // ISO 3166-1 alfa-2; só 'BR' existe (T9)
  regimes: readonly [string, ...string[]];
  paymentMethods: readonly [string, ...string[]];    // chaves de typical.paymentMix e typical.settlementDays
  creditTaxes: readonly [string, ...string[]];       // chaves de opening.taxCredits e do saldo transportado
  terminationReasons: readonly [string, ...string[]];
  ownerBond: string;                                  // o vínculo que é sócio (OWNER_WITHDRAWAL.ownerId)
  profile: z.ZodRawShape; opening: z.ZodRawShape; teamMember: z.ZodRawShape; service: z.ZodRawShape;
  product: z.ZodRawShape; typical: z.ZodRawShape; month: z.ZodRawShape; carriedBalances: z.ZodRawShape;
}

export function makeScenarioInputSchema<E extends ScenarioCountryExtension>(ext: E) {
  const br = <S extends z.ZodRawShape>(shape: S) => z.object(shape).strict(); // a chave do nível é o país em minúsculas
  const key = ext.country.toLowerCase();
  const FixedAsset = z.object({ name: z.string().min(1), cost: ValueCentsSchema, acquiredOn: period, usefulLifeMonths: ValueQtySchema }).strict();
  const Debt = z.object({ balance: ValueCentsSchema, monthlyInterestBp: ValueBpSchema, installments: z.number().int().min(1) }).strict();
  const Expense = z.object({ name: z.string().min(1), value: ValueCentsSchema, givesCredit: z.boolean() }).strict();
  const byMethod = <T extends z.ZodTypeAny>(v: T) => z.record(z.enum(ext.paymentMethods), v); // zod 4: chave de enum = todas obrigatórias

  const Profile = z.object({ country: z.literal(ext.country), year: z.literal(2027) /* F-SIM-12 (a) */, [key]: br(ext.profile) }).strict();
  const Opening = z.object({
    cash: SignedValueCentsSchema, receivables: ValueCentsSchema, inventory: ValueCentsSchema,
    fixedAssets: z.array(FixedAsset), debts: z.array(Debt),
    taxesPayable: z.array(z.object({ tax: z.string().min(1), value: ValueCentsSchema, dueDate: realDate }).strict()),
    taxLossCarryforward: ValueCentsSchema,
    taxCredits: z.record(z.enum(ext.creditTaxes), ValueCentsSchema),
    priorMonths: z.array(z.object({ period, revenue: ValueCentsSchema, payroll: ValueCentsSchema }).strict()).max(24),
    [key]: br(ext.opening),
  }).strict();
  const Registry = z.object({
    team: z.array(z.object({ id: z.string().min(1), role: z.string().min(1), salary: ValueCentsSchema,
      commissionBp: ValueBpSchema /* parceiro BR ⇒ cota-parte (item 4) */, hiredOn: period, [key]: br(ext.teamMember) }).strict()),
    services: z.array(z.object({ id: z.string().min(1), price: ValueCentsSchema, inputCostPerService: ValueCentsSchema,
      professionalId: z.string().nullable(), [key]: br(ext.service) }).strict()),
    products: z.array(z.object({ id: z.string().min(1), price: ValueCentsSchema, cost: ValueCentsSchema, [key]: br(ext.product) }).strict()),
  }).strict();
  const Typical = z.object({                        // camada 1 (F-SIM-3 c)
    servicesPerType: z.record(z.string(), ValueQtySchema),
    salesPerProduct: z.record(z.string(), ValueQtySchema),
    expenses: z.array(Expense),
    paymentMix: byMethod(ValueBpSchema),            // soma 10 000 (item 12)
    settlementDays: byMethod(ValueDaysSchema),
    cardFeeBp: ValueBpSchema,
    [key]: br(ext.typical),
  }).strict();
  const Month = z.object({                          // camada 2: só o que o usuário abriu
    period,
    serviceRevenue: ValueCentsSchema.optional(), resaleRevenue: ValueCentsSchema.optional(),
    purchases: z.object({ input: ValueCentsSchema, resale: ValueCentsSchema, consumables: ValueCentsSchema }).partial().strict().optional(),
    expenses: z.array(Expense).optional(),
    [key]: br(ext.month).optional(),
  }).strict();
  const Event = z.discriminatedUnion('kind', [     // camada 3; datas por realDate e dentro do ano (item 10)
    z.object({ kind: z.literal('HIRE'), date: realDate, personId: z.string() }).strict(),
    z.object({ kind: z.literal('TERMINATION'), date: realDate, personId: z.string(), reason: z.enum(ext.terminationReasons) }).strict(),
    z.object({ kind: z.literal('VACATION'), start: realDate, days: z.number().int().min(1).max(30), personId: z.string() }).strict(),
    z.object({ kind: z.literal('FIXED_ASSET_PURCHASE'), date: realDate, name: z.string().min(1), cost: ValueCentsSchema, usefulLifeMonths: ValueQtySchema }).strict(),
    z.object({ kind: z.literal('LOAN'), date: realDate, value: ValueCentsSchema, monthlyInterestBp: ValueBpSchema, installments: z.number().int().min(1) }).strict(),
    z.object({ kind: z.literal('OWNER_WITHDRAWAL'), date: realDate, ownerId: z.string(), value: ValueCentsSchema, nature: z.enum(['OWNER_PAY', 'DIVIDEND']) }).strict(),
  ]);
  return z.object({
    version: z.literal(1),
    profile: Profile, opening: Opening, registry: Registry, typical: Typical,
    seasonality: z.array(ValueFactorBpSchema).length(12).nullable(),   // índice 0 = janeiro (F-SIM-15)
    months: z.array(Month).max(12),
    events: z.array(Event),
  }).strict().superRefine(/* itens 4, 8, 10, 11, 12 — regras do centro, cada uma com teste próprio; usa ext.ownerBond */);
}

const cents = z.string().regex(/^\d+$/);          // como TaxSimulationDto.ts:12
const signedCents = z.string().regex(/^-?\d+$/);  // como TaxSimulationDto.ts:13
const bp = z.number().int().min(0).max(10_000);

export function makeScenarioOutputSchema<E extends ScenarioCountryExtension>(ext: E) {
  const key = ext.country.toLowerCase();
  const TaxLine = z.object({
    tax: z.string(), period: z.string(),          // 'YYYY-MM' (mensal), 'YYYY-Tn' (trimestral) ou 'YYYY' (anual)
    baseCents: cents, dueCents: cents, dueDate: realDate, source: z.string(),
  }).strict();
  const CarriedBalances = z.object({
    taxCredits: z.record(z.enum(ext.creditTaxes), cents), taxLossCarryforwardCents: cents,
    [key]: z.object(Object.fromEntries(Object.keys(ext.carriedBalances).map((k) => [k, cents]))).strict(),
  }).strict();
  const MonthOut = z.object({
    period, revenueCents: cents, taxes: z.array(TaxLine), payrollCents: cents, resultCents: signedCents,
    cash: z.object({ inflowCents: cents, outflowCents: cents, balanceCents: signedCents }).strict(),
    carriedBalances: CarriedBalances,
  }).strict();
  const AccountLine = z.object({ account: z.string(), cents: signedCents }).strict();
  const RegimeOut = z.object({
    regime: z.enum(ext.regimes),
    available: z.boolean(), unavailableReason: z.string().nullable(),
    months: z.array(MonthOut).length(12),
    year: z.object({
      taxBurdenCents: cents, taxBurdenRangeCents: z.tuple([cents, cents]).nullable(),
      incomeStatement: z.array(AccountLine), balanceSheet: z.array(AccountLine),
    }).strict(),
  }).strict();
  return z.object({
    year: z.number().int(),
    regimes: z.array(RegimeOut),
    provenance: z.object({ defaultBp: bp, estimatedBp: bp, actualBp: bp }).strict(),   // soma 10 000 (refine, item 13)
    sensitivity: z.array(z.object({ field: z.string(), effectCents: signedCents }).strict()),
    obligations: z.array(z.object({ date: realDate, obligation: z.string(), source: z.string() }).strict()),
    warnings: z.array(z.string()),
    parametersSha256: z.string().regex(/^[0-9a-f]{64}$/),
  }).strict().superRefine(/* soma da proveniência */);
}
```

```ts
// server/src/features/accounting/paises/br/dtos/CenarioBrDto.ts — EXTENSÃO BR (português, F-PBA-2 a). Importa o centro.
import { z } from 'zod';
import { makeScenarioInputSchema, makeScenarioOutputSchema, realDate, ValueBpSchema, ValueCentsSchema,
  type ScenarioCountryExtension } from '../../../dtos/ScenarioDto';

export const REGIMES_CENARIO = ['SIMPLES', 'SIMPLES_IBS_CBS_REGULAR', 'PRESUMIDO', 'REAL_TRIMESTRAL', 'REAL_ESTIMATIVA', 'REAL_BALANCETE'] as const;
export const VINCULOS = ['CLT', 'PARCEIRO', 'SOCIO'] as const;
export const MOTIVOS_DEMISSAO = ['SEM_JUSTA_CAUSA', 'PEDIDO', 'JUSTA_CAUSA', 'ACORDO'] as const;
export const FORMAS_PAGAMENTO = ['PIX', 'DINHEIRO', 'DEBITO', 'CREDITO', 'CREDITO_PARCELADO'] as const;
export const TRIBUTOS_COM_CREDITO = ['PIS', 'COFINS', 'ICMS', 'CBS', 'IBS'] as const;
const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'] as const;

const JurisdicaoBrSchema = z.object({               // F-SIM-13 (d); formatos do item 5
  uf: z.enum(UFS), municipioIbge: z.string().regex(/^\d{7}$/), cnae: z.string().regex(/^\d{7}$/),
}).strict();

const PerfilApuracaoSchema = z.object({             // item 3: os campos de PerfilApuracaoPresumido + lucroRealObrigatorio
  ecfIndAliqCsll: z.enum(['1', '4']).nullable(),     // '1' = 9%, '4' = 15% (schema.prisma:1929)
  ecfIndRecReceita: z.enum(['1', '2']).nullable(),   // '1' caixa, '2' competência (schema.prisma:1930)
  lc224AcrescimoSuspenso: z.boolean(),
  lc224LiminarReferencia: z.string().nullable(),
  inicioAtividadeEm: realDate.nullable(),            // a competência de início sai daqui (slice(0, 7))
  encerramentoAtividadeEm: realDate.nullable(),
  prestadoraExclusivaServicos: z.boolean(),
  declaraNaoProfissaoRegulamentada: z.boolean(),
  lucroRealObrigatorio: z.boolean().nullable(),
}).strict();

const LalurMes = z.object({ codigo: z.string().min(1), tipo: z.enum(['A', 'E']), valor: ValueCentsSchema, soIrpj: z.boolean() }).strict();

export const extensaoBr = {
  country: 'BR',
  regimes: REGIMES_CENARIO, paymentMethods: FORMAS_PAGAMENTO, creditTaxes: TRIBUTOS_COM_CREDITO,
  terminationReasons: MOTIVOS_DEMISSAO, ownerBond: 'SOCIO',
  profile: { jurisdicao: JurisdicaoBrSchema, regimes: z.array(z.enum(REGIMES_CENARIO)).min(1), apuracao: PerfilApuracaoSchema,
    issAliquotaBp: ValueBpSchema.nullable() /* dado da empresa; null ⇒ máximo da LC 116 art. 8º II com aviso (motor) */ },
  opening: { baseNegativaCsll: ValueCentsSchema },
  teamMember: { vinculo: z.enum(VINCULOS), possuiCnpj: z.boolean().nullable() /* PARCEIRO ⇒ commissionBp = cota-parte (Lei 12.592 art. 1º-A) */ },
  service: { cTribNac: z.string().regex(/^\d{6}$/) },
  product: { ncm: z.string().regex(/^\d{8}$/) },
  typical: { receitaNaoUso: ValueCentsSchema },                         // item 6
  month: { receitaNaoUso: ValueCentsSchema.optional(), lalur: z.array(LalurMes).optional() },
  carriedBalances: { baseNegativaCsll: true },
} as const satisfies ScenarioCountryExtension;

export const CenarioSimulacaoBrSchema = makeScenarioInputSchema(extensaoBr);
export type CenarioSimulacaoBr = z.infer<typeof CenarioSimulacaoBrSchema>;
export const CenarioSaidaBrSchema = makeScenarioOutputSchema(extensaoBr);
export type CenarioSaidaBr = z.infer<typeof CenarioSaidaBrSchema>;
```

> `carriedBalances` na extensão é um mapa de nomes (o centro só precisa das chaves para pôr centavos); a forma final se
> confere na execução, junto com o tipo de `ScenarioCountryExtension` (`carriedBalances: Record<string, true>`).

**Rota (não é deste PR; registro para o PR-1):** o cenário chega no corpo, então a rota é `POST`. A casa usa `POST …/sugestao`
para o gêmeo que grava (`server/src/routes/accounting.ts:490-495`). A rota do cenário não grava nada, e o nome precisa
deixar isso claro (ex.: `POST /accounting/simulacoes/cenario/calcular`, recurso legado BR das simulações). A escolha é do
BRIEF do PR-1, e valida pelo `CenarioSimulacaoBrSchema`.

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
O esboço do PRE-ADR põe `uf`, `municipioIbge` e `cnae` soltos no `perfil`. A F-SIM-5 b manda município, UF, convenção e
setor para a borda. **Evidência atualizada em 24/11:** o `PRE-ADR-PAIS-NA-BORDA` foi ratificado (F-PB-1 a: borda em
`features/<dominio>/paises/br/**`; F-PB-4 b: centro em inglês; D-2026-11-24 §1). A regra reescrita é o
`ADR-PAIS-NA-BORDA` (Proposed, R1–R7; forks F-PBA-1..7 pendentes). A R3 proíbe o DTO do centro importar a borda. Por isso
uma `discriminatedUnion` montada no centro com o ramo BR dentro dele não fecha mais com a regra.

| Caminho | O que é |
|---|---|
| (a) como o esboço | campos do Brasil no centro do perfil |
| (b) `perfil.jurisdicao` discriminada por `pais`, só com o ramo `BR` (`uf`, `municipioIbge`, `cnae`) na versão 1 | **versão anterior da recomendação (21/11).** Outro país vira ramo novo, sem quebrar a versão 1. Os códigos por item (`cTribNac`, `ncm`, `CLT`) ficam com o nome atual até o PRE-ADR-PAIS-NA-BORDA decidir; aí `versao: 2` |
| (c) esperar o PRE-ADR-PAIS-NA-BORDA | o PR-0 fica parado |
| **(d) esqueleto no centro + extensão do país** | O esqueleto do cenário é conceito universal: proveniência, abertura, cadastro, típico, sazonalidade, meses, eventos, saída e prejuízo a compensar (`taxLossCarryforward`). Ele fica em `server/src/features/accounting/dtos/ScenarioDto.ts`, em inglês, com `ScenarioCountryExtension`, `makeScenarioInputSchema(ext)` e `makeScenarioOutputSchema(ext)`. A extensão BR fica em `server/src/features/accounting/paises/br/dtos/CenarioBrDto.ts`, em português: jurisdição (`uf`, `municipioIbge`, `cnae`), `REGIMES_CENARIO`, `apuracao` (ECF e LC 224), `issAliquotaBp`, `cTribNac`, `ncm`, `VINCULOS`, `FORMAS_PAGAMENTO` (PIX), saldos de PIS/COFINS/ICMS/CBS/IBS, base negativa da CSLL, `receitaNaoUso` e Lalur. Ela compõe `CenarioSimulacaoBrSchema = makeScenarioInputSchema(extensaoBr)`, que a rota BR usa. O centro não importa a borda. Outro país traz a própria extensão sem tocar o centro. O FE tipa pelo `.gen.ts` da extensão |

**Recomendação: (d).** É a estrutural pela regra ratificada. O discriminador de (b) obrigaria o centro a conhecer cada
ramo de país, e (d) entrega o mesmo "outro país sem quebrar a versão 1" sem que o centro importe a borda.

O custo de (d): os nomes do contrato mudam de língua (F-PBA-1); o contrato vira dois arquivos com uma função de composição;
e o snapshot precisa do G2 da guarda (item 0) para enxergar a extensão.

(b) continua possível se o dono preferir um arquivo só. Nesse caso, o contrato inteiro fica na borda
(`paises/br/dtos/CenarioSimulacaoDto.ts`), porque o ramo BR não pode morar no centro.

O checklist (§3) e o esboço (§4) estão escritos em (d).

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
O esboço tem `sazonalidadeBp: int[12] | null` (no ramo d do F-SIM-13, `seasonality`), sem regra de soma e sem proveniência, embora a sazonalidade seja padrão de
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

Caminhos depois da emenda de 24/11, no ramo (d) do F-SIM-13. `BR` = `server/src/features/accounting/paises/br`.

### 9.1 PR-0

- **Editar:**
  - `docs/adr/ADR-INCR-EFICIENCIA-FISCAL.md` (emenda da D8 e da I-5);
  - `docs/plano/nos/SIMULACAO-CENARIO.md` (fold).
- **Criar:**
  - `server/src/features/accounting/dtos/ScenarioDto.ts` e `server/src/features/accounting/dtos/__tests__/ScenarioDto.test.ts`;
  - `BR/dtos/CenarioBrDto.ts`, `BR/dtos/__tests__/CenarioBrDto.test.ts` e `BR/dtos/__tests__/fixtures/cenarioSalaoMinimo.ts`.
- **Registros (PAR-001, derivados):**
  - `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json`, com as chaves `accounting` e `accounting/paises/br`;
  - `my-app/types/contracts/accounting/ScenarioDto.gen.ts` e `my-app/types/contracts/accounting/paises/br/CenarioBrDto.gen.ts`
    (nomes do G2).
  - Em 21/11, o PR aberto #1146 editava o mesmo `accounting/dtos/__tests__/__dto-shapes__.json`. Conferir com `node
    scripts/paralelo.mjs plano SIMULACAO-CENARIO` antes de abrir a sessão.
- **Item 0 da guarda**, só se este PR-0 for o 1º PR de código emendado: `server/.dependency-cruiser.cjs`,
  `docs/adr/ADR-ARCH-BOUNDARIES.md`, `server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts` e
  `server/src/features/accounting/__tests__/atomicUntil.boundary.test.ts`.

### 9.2 Nó inteiro (rascunho do PRE-ADR §10, para a nota)

Classificação pelas três perguntas do ADR §1:

- O motor de 12 meses que monta Simples, Presumido e Real, as regras de folha e o caixa por regime é **BR**:
  - `BR/models/cenarioSimulacao*.ts`;
  - `BR/services/CenarioSimulacaoService.ts` (sem `postEntry`, sem escrita);
  - testes ao lado.
- O controller fica em `server/src/controllers/cenarioSimulacaoController.ts`: é camada de aplicação, fala com a factory
  (F-PBA-3 a) e valida com o `CenarioSimulacaoBrSchema`.
- **Editar:** `server/src/features/accounting/models/taxSimulation.ts` (legado BR). Se o motor do PR-1 o chamar a partir da
  borda, a aresta vai da borda para o legado, e a `P1` não reprova. Se o `TaxSimulationService` (escopo `LEGADO_BR`, ADR §3.1)
  chamar o motor da borda, ele usa a entrada do escopo.
- **Centro (inglês):** só o que for universal e reusado, como agregados de caixa e de DRE em memória que não dependam de
  regime. Cada BRIEF do PR-1..6 diz, por arquivo novo, se é centro ou borda.
- **Registros:** `server/src/lib/factory.ts`, `server/src/routes/accounting.ts`,
  `server/src/routes/docs/accounting.tax-simulation.paths.ts`, `server/src/routes/docs.paths.ts`,
  `server/public/openapi.json` e `server/.dependency-cruiser.cjs` (escopo `LEGADO_BR`, se mudar).
- Os BRIEFs do PR-1..6 refinam esta lista.
- Conferência com `node scripts/paralelo.mjs sugerir SIMULACAO-CENARIO` (21/11): o rascunho também listou arquivos que este
  BRIEF só cita como insumo lido (`dates.ts`, `money.ts`, `simplesCalc.ts`, `taxAssessmentCalc.ts`, `taxAssessmentCalcAnual.ts`,
  `TaxSimulationService.ts`, `TaxSimulationDto.ts`, `dtoShapeSnapshot.test.ts`, `schema.prisma`, `auditCanonical.ts`, o kit).
  Eles ficaram fora do `write_set` da nota, porque nenhum PR previsto os edita (o `dtoShapeSnapshot.test.ts` só entra pelo
  item 0). Se o BRIEF do PR-1 decidir mexer em `taxAssessmentCalc.ts` (entrada de LALUR simulado, item 9 do PRE-ADR §3), ele
  acrescenta o arquivo.

## 10. Invariantes que o PR-0 prova

1. Todo objeto do contrato é `.strict()`, inclusive os níveis `br` da extensão (item 2).
2. Nenhum campo de número de lei, em português nem em inglês (item 7).
3. `origin = DEFAULT` sempre com fonte; fonte de mercado sempre com data e faixa (item 8).
4. Valor dentro da própria faixa (item 8).
5. Toda data é real e cai no ano simulado (item 10).
6. Nenhuma referência órfã (item 11).
7. Somas fechadas, sem renormalização (item 12).
8. O PR não toca rota, serviço, factory, openapi, i18n nem auditoria (item 18).
9. O centro (`ScenarioDto.ts`) não importa a extensão do país (`P1`, item 17).
