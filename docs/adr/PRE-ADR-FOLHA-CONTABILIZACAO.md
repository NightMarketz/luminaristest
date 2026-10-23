# PRE-ADR-FOLHA-CONTABILIZACAO — Folha → contabilidade: fronteira com o software de folha, provisões, rateio por CC e comissão CLT × parceiro

- **Data:** 2026-10-22
- **Status:** **Proposed.** Os forks F-FOL-0..9 estão todos PENDENTES. Nenhum código autorizado, nenhum "executa".
- **Autorização (literal):** dono, chat, 2026-10-22: *"Autorizo só as de planejamento"*. Escopo: só planejamento, sem
  código, sem "executa", e nenhum fork se auto-ratifica. Esta é uma das quatro sessões de planejamento de lacuna
  abertas no mesmo dia; as outras tratam de fechamento contábil, venda e recebível, e devolução.
- **Autor:** `sessao-planejamento` (agente). Os forks são do dono.
- **Base:** `origin/main` = `672031c5` (fetch nesta sessão).
- **Dossiê legal:** [`pesquisas-legais/folha-contabil-2026-10-22/relatorio.md`](../../pesquisas-legais/folha-contabil-2026-10-22/relatorio.md)
  (D01–D11, com hash).

### Passo 1 da sessão: divergência que o dono precisa ver antes de tudo

O pedido descreve a folha como lacuna total, e de fato é: no código não existe nada. **No plano, porém, ela não está
em branco.**

| Fato | Onde | Grau |
|---|---|---|
| Já existe um PRE-ADR do domínio de pessoal, com 14 forks (F-PES-0..13) | [`docs/accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md`](../accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md) (10/10, #627) | V-repo |
| F-PES-0..13 foram **ratificados em lote pela recomendação**. O F-PES-0 (c), "por fases", ficou *"condicionado ao fato comercial"* | [`decisoes/D-2026-10-12-QUESTIONARIO-DONO.md:31`](../plano/decisoes/D-2026-10-12-QUESTIONARIO-DONO.md) | V-repo |
| Mesmo assim, **nenhum nó PES-\*** existe em `docs/plano/nos/`, e o diferido continua dizendo *"Autorização: falta"* | [`diferidos/M5-subrazoes-restantes.md`](../plano/diferidos/M5-subrazoes-restantes.md) (atualizado 23/09) | V-repo |
| A parte de retenções (PES-2) já foi materializada em outros nós: `RETENCOES-FONTE` e `EFD-REINF`. O D10 deles manda a PF, o pró-labore e o eSocial de volta "ao PRE-ADR de pessoal (PES-1/PES-4)" | [`ADR-INCR-RETENCOES-FONTE.md:166`](ADR-INCR-RETENCOES-FONTE.md) | V-repo |

**Consequência para este documento.** Ele **não reabre** F-PES-0..13 e **não** propõe um desenho concorrente. Faz para
o **PES-1** (importação + contabilização) o que o `RETENCOES-FONTE` fez para o PES-2: desce ao nível da folha → razão,
que o PRE-ADR de 10/10 deixou em uma linha (F-PES-10). Ficam cobertos três buracos que aquele texto não fechou:
**provisões de 13º e férias com encargos**, **rateio por centro de custo** e **comissão CLT × parceiro**.

Um achado de desenho torna isso necessário (§4.2). A fonte ratificada no F-PES-2 é o XML do eSocial, com resumo
digitado como fallback. **Ela não traz provisão nem centro de custo.** O eSocial registra remuneração devida e paga, não
a provisão contábil. A lotação tributária (S-1020) também não é centro de custo gerencial.

**O primeiro fork continua sendo do dono** (F-FOL-0): tirar a folha do diferido agora ou não. A ratificação de 12/10
escolheu a *estratégia*, mas deixou o *momento* preso a um fato comercial que ninguém registrou. Este PRE-ADR não decide
isso.

## TLDR

**Verdade:** a folha → contabilidade cabe numa ponte Prisma com o mesmo molde das que já existem: um lançamento por
competência e tipo, 2 commits, subrazão por trabalhador e tie-out. O CC usa o `PostingDimension`, que já existe. As
provisões de 13º e férias são funções puras sobre a base de cada trabalhador, com a lei citada (Lei 4.090 art. 1º § 1º;
CLT arts. 129–145; Lei 8.036 art. 15). A comissão do empregado CLT entra no razão **só pela folha** (CLT art. 457 § 1º),
e a do parceiro, **só pelo repasse** (Lei 12.592 art. 1º-A § 11).

**Risco principal:** nada disso serve sem o fato comercial que o PRE-ADR de 10/10 já pedia e que segue sem resposta. O
1º cliente tem empregado CLT? Quem faz a folha, e em qual software? O software dele entrega XML do eSocial ou arquivo de
integração contábil? Se a resposta for "nenhum CLT", F-FOL-0 (b) custa zero. Se for "4 CLT, folha na Domínio", o
caminho barato muda (F-FOL-1 b).

---

## 1. Objetivo (sob a letra)

A letra é "PRE-ADR da folha e da integração folha → contabilidade". O objetivo é **o contador só revisar e assinar a
parte de pessoal de um salão com empregado CLT**, o que exige:

1. despesa de pessoal, encargos e provisões no razão, **por competência**, sem lançamento manual;
2. a despesa repartida por **centro de custo**, para a DRE gerencial por unidade ou profissional;
3. os saldos de obrigação (salários, INSS, IRRF, FGTS a recolher; provisões) **batendo** com o que o eSocial, o FGTS
   Digital e a DCTFWeb dizem que é devido;
4. a **comissão** calculada na venda chegando à folha do empregado CLT, e só à dele. A do parceiro vai para repasse.

**Fora:** cálculo de holerite, transmissão do eSocial, CCT, SST e rescisão calculada. Isso é a fase 2 (F-PES-0 c, PES-4)
e não é replanejado aqui. Também fica fora a retenção de PJ/PF no contas a pagar, que é do `RETENCOES-FONTE`.

## 2. Evidência

Graus: **V-fonte** (lido na fonte primária nesta sessão), **V-repo** (lido no repo nesta sessão), **V-adr** (verificado
por ADR anterior e não relido), **V-busca** (resumo de busca sobre página oficial do fornecedor, sem abrir a página),
**I** (inferido), **NV** (não verificado).

### 2.1 Código (fato consumado)

| Fato | Onde | Grau |
|---|---|---|
| `esocial`/`fgts` em `server/src`: **0 arquivos** | `grep -ril` em 22/10 | V-repo |
| Comissão nasce no plugin de venda: uma linha `commissions` por item com `responsibleEmployeeId` e `commission > 0`, quando a venda vai a `Finalized`; é cancelada se a venda sai de `Finalized` e a comissão ainda está `Pending` | `server/src/features/dynamicTables/rules/plugins/sales/commissions.ts:20-62` | V-repo |
| A comissão não liga com nada fora do preset: não gera AP nem lançamento | PROPOSTA-COMPLEMENTO §1.2 linha 123 (`TESOURARIA`); PRE-ADR de pessoal §13.3 | V-repo |
| O preset `employees` (DynamicTable) tem cargo, `serviceCommission`, `productCommission` e `monthlyCost`. **Não tem tipo de vínculo** (CLT, parceiro, sócio) | `presets/modules/core/EmployeesModule.ts:12-55` | V-repo |
| Centro de custo já existe como eixo: `DimensionDefinition` (`code` ex. `COST_CENTER`), `DimensionValue` hierárquico (só folha analítica recebe tag) e `PostingDimension` com **no máximo um valor por eixo por perna** (`@@unique([postingId, definitionId])`) | `server/prisma/schema.prisma:1293-1363` | V-repo |
| O plano de contas não tem conta de pessoal: salários, encargos, INSS/FGTS/IRRF a recolher e provisões | `fixtures/ChartOfAccountsFixture.ts` (grep `salári\|encargo\|férias\|fgts` = 0) | V-repo |
| O fator R usa `SimplesHistoricoMensal.folhaCents`, que é digitado "até a folha da onda 4 existir" | `schema.prisma:2903-2912` | V-repo |
| A DCTFWeb do X9 nunca declara "sem movimento", porque o Luminaris não enxerga eSocial nem Reinf (D7) | `ADR-INCR-DCTFWEB-MIT.md:145` | V-repo |
| Ponte contábil: 2 commits, cabeçalho `atomicUntil`, tie-out subrazão × razão | Contrato §2.3 `[AC-2.3-1/2]` (citado no PRE-ADR de pessoal F-PES-10) | V-adr |

### 2.2 Plano

| Fato | Onde | Grau |
|---|---|---|
| Folha ⚫ diferida, "autorização: falta" | `diferidos/M5-subrazoes-restantes.md` | V-repo |
| F-PES-0..13 ratificados em lote em 12/10. O F-PES-0 ficou condicionado ao fato comercial | `D-2026-10-12-QUESTIONARIO-DONO.md:31` | V-repo |
| A proposta `PROVISOES-AGENDADAS` (F3) cobre *"férias/13º enquanto folha é ⚫"* por job de DRAFT | `PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md:236` | V-repo |
| A proposta `RATEIO-DIMENSOES` (F3) cobre o rateio genérico de despesa indireta por CC | idem `:235` | V-repo |
| "Espera a folha: comissão de empregado CLT" | idem `:327` | V-repo |

### 2.3 Mercado (o que os concorrentes fazem)

| Produto | O que faz | Fonte | Grau |
|---|---|---|---|
| **Domínio** (Thomson Reuters) | Integração Folha → Contábil por centro de custo, com três critérios de rateio: **proporcional ao cálculo da folha** (dias trabalhados por CC), **sem separador conforme o cálculo** e **percentual fixo na conta da Contabilidade**. O usuário configura rubricas e contas, incluindo provisão de férias, em "Configurar Integração" | suporte oficial: [solução 813](https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=813), [798](https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=798), [812](https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=812) | V-busca |
| **Alterdata** | Integração DP × Contábil: cada rubrica vinculada a um "lançamento automático" (histórico padrão + contas). A origem é `WCONT` ou "OUTROS SISTEMAS" (exporta para contábil de terceiros). O lançamento usa a **data de pagamento**. **Férias e rescisão nunca são aglutinadas**. Há uma aba "Rateio por Centro de Custo" por funcionário | ajuda oficial: [DP × Contábil completo](https://ajuda.alterdata.com.br/dpbase/integracao-dp-x-contabil-completo-37257874.html), [Central Integração](https://ajuda.alterdata.com.br/dpbase/como-utilizar-a-central-integracao-317392614.html) | V-busca |

**Lição:** os dois tratam a integração como **mapa rubrica → conta**, com rateio por CC **no trabalhador**. Os dois
separam férias, rescisão e 13º do lançamento mensal. É o que os F-FOL-2/3/5 recomendam. A Domínio e a Alterdata têm
folha própria, então nos dois a integração lê holerite calculado na casa. A diferença para nós é a fonte (§4.2).

## 3. A norma (acervo `ctresb/leis`, lida em 22/10/2026)

Todas as fontes, com hash e link, estão no dossiê. Para as cópias que o acervo marcou como "original", a fonte oficial
foi conferida.

| [D] | Regra | Norma | Grau |
|---|---|---|---|
| D02 | FGTS: depósito **até o dia 20** de **8%** da remuneração paga ou devida no mês anterior, **incluídas as parcelas dos arts. 457 e 458 da CLT e o 13º** | Lei 8.036/1990, art. 15 (red. Lei 14.438/2022). [acervo](https://github.com/ctresb/leis/blob/ccdcc898b79c13be701c7841b195174e1898ccf8/federal/leis-ordinarias/1990/lei-8036-1990-05-11.md) · [oficial](https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-05-11;8036) | V-fonte |
| D02 | Folha e FGTS declarados por **escrituração digital**; a declaração é **confissão de débito** | Lei 8.036, art. 17-A caput e § 1º | V-fonte |
| D10/D11 | A escrituração do art. 17-A é feita pelo **eSocial + FGTS Digital** (art. 11). A **GFD é paga só por Pix** (art. 27). O FGTS **não passa pela DCTFWeb** | Portaria MTE 240/2024, arts. 11 e 27. [acervo](https://github.com/ctresb/leis/blob/8e43c11fade9f61fef46935d2f0af9b45641d906/reguladores/mte/portarias/2024/portaria-mte-n-240-de-29-de-fevereiro-de-2024-546047596.md) · [oficial](https://www.in.gov.br/web/dou/-/portaria-mte-n-240-de-29-de-fevereiro-de-2024-546047596) (DOU deu 403; a [página de legislação do FGTS Digital](https://www.gov.br/trabalho-e-emprego/pt-br/servicos/empregador/fgtsdigital/legislacao), lida em 22/10, não lista alteração da 240) | V-fonte |
| D06 | Patronal: **20%** sobre as remunerações pagas, devidas ou creditadas a empregados | Lei 8.212/1991, art. 22 I. [acervo](https://github.com/ctresb/leis/blob/9b29f44078e25755cfaf358456dd815043075924/federal/leis-ordinarias/1991/lei-8212-1991-07-24.md) · [oficial](https://normas.leg.br/?urn=urn:lex:br:federal:lei:1991-07-24;8212) | V-fonte |
| — | No Simples **fora do Anexo IV**, não há CPP, GILRAT nem Terceiros sobre a folha: a CPP está no DAS | MOS S-1.3, cap. III (S-2500 2.4.5), lido no PRE-ADR de pessoal §4 | V-adr |
| D06 | Contribuições descontadas e patronais recolhidas **até o dia 20** do mês seguinte à competência | Lei 8.212, art. 30 I "b" | V-fonte |
| D03 | 13º = **1/12 da remuneração de dezembro por mês de serviço**; fração ≥ 15 dias conta como mês | Lei 4.090/1962, art. 1º §§ 1º–2º. [acervo](https://github.com/ctresb/leis/blob/20775c2cef862b096ea72544740d35e0653b3849/federal/leis-ordinarias/1962/lei-4090-1962-07-13.md) · [oficial](https://normas.leg.br/?urn=urn:lex:br:federal:lei:1962-07-13;4090) | V-fonte |
| D04/D08 | 13º pago **até 20/12**, com adiantamento de metade **entre fevereiro e novembro** | Lei 4.749/1965, arts. 1º–2º. Acervo "original", conferido no [Planalto](https://www.planalto.gov.br/ccivil_03/leis/l4749.htm) | V-fonte |
| D05 | Férias anuais remuneradas (arts. 129–130), pela remuneração da data da concessão (art. 142), pagas **até 2 dias antes** do gozo (art. 145); o terço vem da CF art. 7º XVII (*Vide* no próprio texto) | CLT (DL 5.452/1943). [acervo](https://github.com/ctresb/leis/blob/f3db126e93c366f938bd927bbf184a8fcf64b2ea/federal/decretos-lei/1943/del-5452-1943-05-01.md) · [oficial](https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1943-05-01;5452) | V-fonte |
| D05 | **Comissão paga pelo empregador integra o salário** | CLT, art. 457 § 1º (red. Lei 13.467/2017) | V-fonte |
| D05 | Comissão **só é exigível depois de ultimada a transação**; em prestações sucessivas, **proporcional à liquidação** (§ 1º); a saída do empregado não tira o direito (§ 2º) | CLT, art. 466 | V-fonte |
| D01 | O salão retém a cota-parte e **os tributos e contribuições do parceiro** sobre a cota dele (§ 3º); o parceiro **não tem vínculo** enquanto durar a parceria (§ 11); o **vínculo se configura** sem contrato formalizado (art. 1º-C I) | Lei 12.592/2012, art. 1º-A §§ 3º e 11 e art. 1º-C (red. Lei 13.352/2016). [acervo](https://github.com/ctresb/leis/blob/a31cf3cd12073c7b195933a53e733b85c00cfe02/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md) · [oficial](https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-18;12592) | V-fonte |
| D07/D09 | eSocial instituído como escrituração unificada das obrigações fiscais, previdenciárias e trabalhistas | Decreto 8.373/2014, arts. 1º–2º. Acervo "original", conferido no [Planalto](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/decreto/d8373.htm) | V-fonte |
| — | Fechamento da folha no eSocial com o **S-1299 até o dia 15**; o S-1299 totaliza as bases que a DCTFWeb consome. O FGTS não depende do S-1299. **Não há importação de arquivo** no eSocial | MOS S-1.3 §§ 8.1 e 10.3, lido no PRE-ADR de pessoal §4 | V-adr |
| — | A DCTFWeb nasce do eSocial, da EFD-Reinf e do MIT (art. 5º I–II), com prazo no art. 6º | IN RFB 2.237/2024, lida no ADR do X9 em 02/10. **Não está no acervo** | V-adr |

**Norma contábil da provisão** (NBC TG 33 / NBC TG 1000 seção 28 / ITG 1000): **não está no acervo** e não foi lida.
O regime de competência das provisões fica como pergunta ao contador (P-FOL-3). Não entra como regra decidida.

## 4. Fronteira: o que fica no Luminaris e o que fica no software de folha

### 4.1 O que já está decidido (não rediscutir)

- Estratégia por fases: fase 1 = integração, fase 2 = motor com gatilho (F-PES-0 c, 12/10, condicionada ao fato).
- Fonte da fase 1: XML do eSocial, com resumo digitado como fallback (F-PES-2 c+a).
- Contabilização: um lançamento por competência e lote, com subrazão por trabalhador (F-PES-10 a).
- Models candidatos `Trabalhador`, `FolhaCompetencia`, `FolhaLinhaTrabalhador`, `EsocialEventoRegistro` (PRE-ADR de
  pessoal §7), todos Prisma first-class: `PayrollEntry` é proibida em DynamicTable pelo Contrato §2.1
  `[AC-2.1-B1..B3]` e pelo ADR de fronteira de persistência (lei desenha igual para todos + atomicidade multi-tabela).

### 4.2 O buraco que a fonte ratificada deixa

| Informação | Vem no XML do eSocial? | Vem no resumo digitado? | Consequência |
|---|---|---|---|
| Remuneração por rubrica e trabalhador (S-1200), pagamento (S-1210), bases (S-5001/5003), totais (S-5011) | Sim (I: estrutura do MOS; XSD não baixado) | Só o total | Lançamento mensal OK |
| **Provisão de 13º e férias** | **Não**: o eSocial registra o devido e o pago, não a provisão contábil | Se o contador digitar | Precisa de cálculo próprio ou de outra fonte |
| **Centro de custo gerencial** | **Não**: a lotação tributária (S-1020) é previdenciária, não gerencial (I) | Não | Precisa do cadastro trabalhador × CC no Luminaris |
| **Contas contábeis** | Não | Não | Precisa do mapa natureza → conta no perfil ou no kit |
| FGTS devido | Na base do S-5003 (I) | Se digitado | Conferência contra a GFD (F-FOL-7) |

### 4.3 As opções de fronteira — **F-FOL-1** (RATIFICAÇÃO PENDENTE)

| Opção | O que fica no Luminaris | O que fica no software de folha | Custo de construir | Custo de operar | Risco |
|---|---|---|---|---|---|
| **(a) eSocial + cálculo contábil próprio** | Importa o XML (F-PES-2), **calcula as provisões** (funções puras, §5), **rateia por CC** pelo cadastro e **mapeia contas** | Holerite, eSocial, FGTS Digital | Médio: parser XSD do S-1.3 + 3 funções puras + ponte. 1 parser serve a todos os contadores | Baixo, se o contador entregar o XML (L-PES-6 aberto) | A provisão do Luminaris pode divergir da do contador. Por isso a conferência (P-FOL-3) |
| **(b) Arquivo de integração contábil do fornecedor** | Importa o "lote contábil" que a Domínio ou a Alterdata exportam para "outros sistemas", com provisão e CC já calculados | Holerite, provisão, rateio, eSocial | Alto e crescente: **um parser por fornecedor**, leiaute proprietário e sem versão pública | Mínimo para o contador que já configura a integração | Contraria o F-PES-2 (b), rejeitado em 12/10: precisa de re-ratificação. O dado chega sem o recibo do governo |
| **(c) Lançamento digitado com anexo** | Uma tela "lançamento da folha" por competência (totais por natureza e CC) + PDF | Tudo | Mínimo | Alto: o contador continua fazendo o trabalho, agora em outro lugar | Não cumpre o objetivo (§1). É o que já se faz hoje fora do sistema |
| **(d) Folha própria (fase 2 adiantada)** | Tudo | Nada | O maior do produto: PRE-ADR de pessoal §8, linha (a) | Baixo para o contador, alto para o Luminaris (oráculo mensal externo) | Já decidido como fase 2 com gatilho (F-PES-0 c). Adiantar exige o dono mudar a decisão de 12/10 |

**Recomendação: (a), com (c) como fallback explícito** quando o XML não vier (alerta `FOLHA_DIGITADA`, que já está no
F-PES-2). Os motivos:

1. É a única opção que respeita as duas decisões de 12/10 (F-PES-0 c e F-PES-2 c) sem pedir re-ratificação.
2. As provisões são aritmética de lei, com a fonte citada (§5). São o mesmo tipo de função pura que o `fatorR()` e a
   depreciação do C8.
3. O CC no trabalhador é o modelo dos dois concorrentes (§2.3).

**Caso adversarial tentado:** *"o contador do 1º cliente usa a Domínio, já tem a integração contábil configurada e não
quer baixar XML"*. Nesse caso (b) é mais barato **para aquele cliente**, e (a) obriga o contador a mudar o processo. Se
o P-FOL-1 confirmar esse cenário, (b) **limitado a um fornecedor** vira candidato, e o dono decide se vale reabrir o
F-PES-2. Por isso a recomendação depende do fato, como o F-PES-0.

**Viés declarado:** (a) reusa padrões que o autor conhece (função pura, 2 commits, `PostingDimension`). O contrapeso é
que (b) foi descrito com o custo real de operar, que é o menor de todos para um contador já integrado.

## 5. Provisões de 13º e férias com encargos

Comportamento proposto (direto, com fonte), condicionado ao F-FOL-3:

- **13º:** a cada competência, `provisao13 = remuneracaoBase / 12` por trabalhador ativo com ≥ 15 dias no mês (Lei 4.090,
  art. 1º §§ 1º–2º [D03]). O adiantamento (fev–nov) e o saldo (até 20/12) **baixam** a provisão (Lei 4.749, arts. 1º–2º
  [D04/D08]). A diferença por reajuste ou comissão variável é ajustada em dezembro.
- **Férias:** `provisaoFerias = (remuneracaoBase / 12) × (1 + 1/3)` por mês aquisitivo (CLT, arts. 129–130 e 142 [D05];
  o terço vem da CF art. 7º XVII, que o próprio texto da CLT indica com *Vide*, e **a CF não foi lida nesta sessão**). O
  pagamento das férias (até 2 dias antes, art. 145) baixa a provisão.
- **Encargos sobre a provisão:**
  - FGTS 8% sobre 13º e férias (Lei 8.036, art. 15 [D02], que inclui o 13º e as parcelas do art. 457);
  - patronal 20% + RAT + Terceiros **só** fora do Simples ou no Anexo IV (Lei 8.212, art. 22 I [D06]; MOS cap. III,
    V-adr). O regime vem do `FiscalProfile`, com parâmetro por regime (F-PES-13 a, ratificado).
- **Remuneração base:** salário fixo **mais a média das comissões** (CLT, art. 457 § 1º [D05]). **Qual média** (12
  meses? 6?) é regra de cálculo trabalhista que não foi lida → P-FOL-4. Não entra no checklist até ter fonte.
- **Parâmetros:** alíquotas em `LegalParameter` (já versionado, com fonte e `vigenteDesde`), nunca constante solta
  (memória `tabela-transcrita-de-lei-conferir-redacao-vigente`).

**Colisão com a proposta `PROVISOES-AGENDADAS`** (sessão de fechamento, F3): ela cobre férias e 13º *"enquanto folha é
⚫"*, com valor agendado e sem base por trabalhador. Fronteira proposta no **F-FOL-4**.

## 6. Rateio por centro de custo

- O eixo é o `COST_CENTER`, que já existe (`DimensionDefinition`). Valor só em folha analítica (D3 do INCR-DIM).
- O `PostingDimension` aceita **um valor por eixo por perna**. Logo, a despesa de um trabalhador em 2 CCs vira **2
  pernas**, como já diz o comentário do schema: *"split the line"*. Isso é direto, não é fork.
- O critério de rateio é o **F-FOL-5**.
- A ponte da folha marca a perna **na própria ponte**. **Não** chama o motor genérico `RATEIO-DIMENSOES`: a folha sabe
  o CC do trabalhador, e um motor de rateio por cima seria um caminho paralelo (`R-motor-regras`).

## 7. Comissão CLT × comissão de parceiro

| | Empregado CLT | Profissional-parceiro |
|---|---|---|
| Natureza | **Salário** (CLT, art. 457 § 1º [D05]) | Cota-parte do parceiro, **sem vínculo** (Lei 12.592, art. 1º-A § 11 [D01]) |
| Quando é devida | Ultimada a transação (CLT, art. 466 [D05]); venda parcelada → ambiguidade A-1 (§11) | Pelo contrato de parceria |
| Encargos | Entra na base do FGTS (Lei 8.036, art. 15 [D02]), da patronal (Lei 8.212, art. 22 I [D06]), do 13º e das férias | O salão retém os tributos do parceiro (§ 3º [D01]). Quais tributos é a L-PES-1/2, aberta desde 10/10 |
| Caminho no Luminaris | linha `commissions` → **relatório "variáveis para a folha"** → software de folha → volta no XML (S-1200) → razão pela ponte da folha | linha `commissions` → repasse/AP com retenção (`TESOURARIA`/PES-3) |
| Lança na venda? | **Não** (F-FOL-6) | Não, quem lança é o repasse |

**Pré-requisito que hoje não existe:** saber o vínculo do profissional. O preset `employees` não tem esse campo (§2.1).
Classificação de vínculo é dado que a lei desenha (CLT × Lei 12.592 × sócio cat. 723). Pelo ADR de fronteira de
persistência, fica no `Trabalhador.tipo` (Prisma, já previsto no PRE-ADR de pessoal §7), ligado à linha do preset por
`dynamicRowRef` (`*Ref` sem FK, com guarda declarada; ADR de fronteira §4). O plugin de comissão **continua sem saber
do vínculo**. Quem separa é o serviço de aplicação que gera o relatório e o repasse (`[AC-2.1-B1]`: nunca injetar
serviço Prisma no motor).

**Guarda de risco trabalhista:** profissional marcado como parceiro sem `SalaoParceriaContrato` homologado acende o
alerta `PARCERIA_SEM_HOMOLOGACAO_RISCO_VINCULO`, já previsto no F-PES-6 (Lei 12.592, art. 1º-C I [D01]).

## 8. Esboço de contratos (forma materializável, **sem schema final**)

Além dos models do PRE-ADR de pessoal §7 (que este documento não repete):

```prisma
// Rateio do trabalhador por CC (F-FOL-5 a). Soma das linhas vigentes = 10000 bp (gate no service).
model TrabalhadorRateioCentroCusto {
  id               String    @id @default(cuid())
  userId           String    // AccountingScope.ownerUserId
  unitId           String
  trabalhadorId    String    // FK Trabalhador
  dimensionValueId String    // FK DimensionValue (eixo COST_CENTER, folha analítica)
  bp               Int       // 1..10000
  vigenteDesde     String    // YYYY-MM
  vigenteAte       String?   // YYYY-MM
  deletedAt        DateTime?
  @@index([userId, unitId, trabalhadorId])
}

// Provisão por trabalhador × competência × tipo (F-FOL-3 a). Subrazão da provisão; tie-out × contas de provisão.
model ProvisaoTrabalhista {
  id                 String   @id @default(cuid())
  userId             String
  unitId             String
  trabalhadorId      String
  competencia        String   // YYYY-MM
  tipo               String   // DECIMO_TERCEIRO | FERIAS
  baseCents          BigInt   // remuneração base (fixo + média variável — P-FOL-4)
  provisaoCents      BigInt
  fgtsCents          BigInt
  patronalCents      BigInt   // 0 no Simples fora do Anexo IV
  baixaCents         BigInt   @default(0) // adiantamento/saldo/férias pagas
  origem             String   // CALCULADA | DIGITADA (override com alerta)
  legalParamVersion  String   // versão do LegalParameter usada
  postingEntryId     String?
  @@unique([userId, unitId, trabalhadorId, competencia, tipo])
}

// Mapa natureza → conta (F-FOL-8). Mesmo padrão do withholdingAccountMap do RETENCOES-FONTE.
// payrollAccountMap: { SALARIOS, COMISSOES, HORAS_EXTRAS, FERIAS, DECIMO_TERCEIRO, FGTS_DESPESA, INSS_PATRONAL,
//   SALARIOS_A_PAGAR, INSS_A_RECOLHER, IRRF_A_RECOLHER, FGTS_A_RECOLHER, PROVISAO_FERIAS, PROVISAO_13,
//   PROVISAO_ENCARGOS } → accountId (folha analítica, natureza conferida no service)
```

```ts
// Entrada do fallback digitado (F-PES-2 a), com CC e tipo (F-FOL-2).
const FolhaResumoDigitadoDto = z.object({
  competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  tipo: z.enum(['MENSAL', 'FERIAS', 'RESCISAO', 'DECIMO_TERCEIRO']),
  linhas: z.array(z.object({
    natureza: z.enum(['SALARIOS', 'COMISSOES', 'HORAS_EXTRAS', 'FERIAS', 'DECIMO_TERCEIRO',
      'INSS_SEGURADO', 'IRRF', 'FGTS', 'INSS_PATRONAL', 'OUTROS_DESCONTOS']),
    dimensionValueId: z.string().min(1).optional(), // CC; ausente = rateio pelo cadastro
    valorCents: z.string().regex(/^\d+$/),          // BigInt em string
  }).strict()).min(1),
  sourceDocumentId: z.string().min(1),               // PDF da folha obrigatório
}).strict();

// Saída da ponte (sourceType por tipo — F-FOL-2 a), idempotente pelo @@unique do razão.
type FolhaPostingResult = {
  folhaCompetenciaId: string;
  sourceType: 'payroll.mensal' | 'payroll.ferias' | 'payroll.rescisao' | 'payroll.13' | 'payroll.provisao';
  journalEntryId: string;
  legsPorCentroCusto: Array<{ dimensionValueId: string; debitCents: string }>;
  tieOut: { subrazaoCents: string; razaoCents: string; ok: boolean };
};
```

## 9. Forks — todos RATIFICAÇÃO PENDENTE

### F-FOL-0 — Tirar a folha do diferido agora? (do dono; **sem recomendação**, por instrução da sessão de origem)

| Caminho | O que acontece | Custo de fazer | Custo de não fazer |
|---|---|---|---|
| **(a) Reabrir agora** | Nasce a nota `nos/PES-1` (id do F-PES-1 a), o diferido ganha "folha → PES-1" e este PRE-ADR vira insumo do BRIEF `BE-INCR-FOLHA-IMPORT` | Uma sessão de planejamento (BRIEF) + ~4 PRs de backend (PRE-ADR de pessoal §8) + FE. Disputa a fila com F1/F2, que estão andando | — |
| **(b) Manter ⚫ até o fato comercial** | Nada muda. O `PROVISOES-AGENDADAS` cobre férias e 13º com valor agendado. O fator R segue com `folhaCents` digitado | Zero | O contador continua lançando a folha à mão. O fator R segue sem a base legal da Res. CGSN 140 art. 26 § 2º I (PRE-ADR de pessoal TLDR 1). A comissão CLT continua sem caminho até o razão. A lacuna do comparativo (Domínio, Alterdata, Xero e QuickBooks têm) persiste |
| **(c) Reabrir só o planejamento** | Nasce `nos/PES-1` com `estado: planned` e autorização "só BRIEF"; código só com "executa" e o fato comercial em mãos | Uma sessão (BRIEF), sem código | Igual a (b) até o "executa"; o BRIEF já fica pronto quando o fato chegar |

O que decide é o fato P-FOL-1, o mesmo do F-PES-0 de 10/10. **Viés declarado:** a sessão de origem me pediu para não
recomendar. A tabela mostra os três custos, sem pesar.

### F-FOL-1 — Fronteira com o software de folha
Opções e custos em §4.3. **Recomendação: (a)** eSocial + cálculo contábil próprio, com (c) como fallback.

### F-FOL-2 — Granularidade do lançamento
- (a) **Um lançamento por competência × tipo** (`MENSAL`, `FERIAS`, `RESCISAO`, `DECIMO_TERCEIRO`, `PROVISAO`), cada
  um com `sourceType` próprio.
- (b) Um lançamento por competência com tudo junto.

**Recomendação: (a).** É o que a Alterdata força (férias e rescisão nunca aglutinadas) e o que o fórum da Domínio pede
(§2.3). Estornar uma rescisão não pode estornar a folha mensal (`[T5]`, estorno por lançamento). Ainda vale o F-PES-10
(a): um lançamento por lote, não um por trabalhador.

### F-FOL-3 — Provisões de 13º e férias
- (a) **Calculadas pelo Luminaris** a cada competência (§5), com override digitado (`origem = DIGITADA` + alerta).
- (b) Só digitadas pelo contador.
- (c) Sem provisão: reconhece no pagamento.

**Recomendação: (a).** (c) quebra a competência no BP mensal. (b) devolve o trabalho ao contador. A divergência do (a)
contra a provisão do contador é medida no gate humano (§10).

### F-FOL-4 — Fronteira com `PROVISOES-AGENDADAS` (sessão de fechamento)
- (a) Férias e 13º são **do PES-1** quando o tenant tem folha importada. O `PROVISOES-AGENDADAS` só os cobre para
  tenant sem PES-1 ativo, e a ponte da folha **recusa** competência que já tenha provisão agendada de férias ou 13º (400
  nomeado), para não provisionar em dobro.
- (b) Tudo no `PROVISOES-AGENDADAS`, que lê a base da folha.
- (c) Tudo no PES-1, e o `PROVISOES-AGENDADAS` não trata férias e 13º.

**Recomendação: (a).** A provisão de pessoal tem base por trabalhador e baixa pelo pagamento. Não é agenda. (b) põe
lógica de folha num job genérico. (c) deixa sem cobertura o tenant que não importa folha. A decisão precisa casar com a
do PRE-ADR de fechamento (nota deixada para a sessão irmã).

### F-FOL-5 — Critério de rateio por CC
- (a) **Percentual fixo por trabalhador, com vigência** (`TrabalhadorRateioCentroCusto`), soma = 100%.
- (b) Proporcional a dias ou horas por CC (agenda).
- (c) Proporcional à receita ou aos serviços que o profissional executou por CC.

**Recomendação: (a)**, com (b) e (c) registrados para depois. (a) é o padrão das duas referências (§2.3) e não depende
de dado operacional. (b) depende de a agenda ser confiável como ponto, e não é. (c) mistura despesa com receita. Num
salão, (c) é o que o dono gerencial quer ver, mas é relatório (DRE por CC), não lançamento.

### F-FOL-6 — Comissão CLT no razão
- (a) **Só pela folha importada.** O Luminaris gera o relatório "variáveis para a folha" por empregado CLT e competência
  e, na importação, **concilia** o total de comissões das linhas `commissions` com a rubrica de comissão do S-1200.
  Divergência ⇒ alerta.
- (b) Provisiona na venda (D despesa de comissão, C comissões a pagar), e a folha importada baixa a provisão.

**Recomendação: (a).** Comissão e folha costumam cair na mesma competência, então (b) adiciona um lançamento e um risco
de dobra sem ganho de competência. Se a ambiguidade A-1 (venda parcelada) for resolvida pela leitura 2, (b) volta a
ser candidato.

### F-FOL-7 — Conferências com o governo
- (a) Três conferências por competência, todas com alerta e sem bloqueio:
  - totalizador do eSocial (S-5011) × provisões de INSS e IRRF (já é o F-PES-12 a);
  - **GFD do FGTS Digital** (valor + PDF digitados) × FGTS a recolher (Portaria 240, art. 27 [D10]: a GFD não passa
    pela DCTFWeb);
  - comissões (F-FOL-6).
- (b) Só a do F-PES-12.

**Recomendação: (a).** Sem a do FGTS, a obrigação que mais gera passivo trabalhista (confissão de débito, Lei 8.036,
art. 17-A § 1º [D02]) fica sem conferência.

### F-FOL-8 — Contas de pessoal
- (a) **Contas no kit do setor** (KIT-SETOR, como o `2.1.x IRRF a Recolher` do F-E7-1) **+** `payrollAccountMap` no
  perfil para o contador trocar.
- (b) Só no perfil, e o contador cria tudo.

**Recomendação: (a).** É o precedente das retenções (D-2026-10-12 F-E7-1), e o plano de hoje não tem nenhuma conta de
pessoal (§2.1). A estrutura exata é a P-FOL-5.

### F-FOL-9 — Id e lugar na régua (só se F-FOL-0 ≠ b)
- (a) `PES-1` (id já ratificado no F-PES-1 a), na seção F3 (contábil) da régua F, com aresta para o `FECHAMENTO-ASSISTIDO`
  (item do checklist: "folha da competência contabilizada e conferida").
- (b) `PES-1` fora da régua F, na onda 4 do destino.

**Recomendação: (a).** A folha é o que falta para o contador "só assinar" (§1), e o fechamento assistido precisa dela
como item. **Não editei `FILA-ORDEM.md` nem o GAP-MAP**: a ordem é do dono.

## 10. Checklist candidato do BRIEF `BE-INCR-FOLHA-IMPORT` (só se F-FOL-0 ≠ b; o BRIEF nasce em sessão própria)

1. `Trabalhador` com `tipo` (vínculo) e `dynamicRowRef` para o preset `employees`, com guarda de órfão declarada.
2. `TrabalhadorRateioCentroCusto` com o gate "soma = 10000 bp por vigência" (F-FOL-5).
3. `payrollAccountMap` no perfil + contas no kit (F-FOL-8).
4. Fallback digitado `FolhaResumoDigitadoDto` com `SourceDocument` obrigatório (§8).
5. Importação do XML S-1200/S-1210/S-5001/S-5003/S-5011, com idempotência por `nrRecibo` (F-PES-2; espera L-PES-6 e os
   XSD).
6. Funções puras `provisao13`, `provisaoFerias` e `encargosProvisao`, com `LegalParameter` versionado (§5; espera
   P-FOL-3/4).
7. Ponte por tipo (F-FOL-2): 2 commits, `atomicUntil`, pernas por CC com `PostingDimension`, tie-out.
8. Relatório "variáveis para a folha" + conciliação de comissões (F-FOL-6).
9. Conferências S-5011 e GFD (F-FOL-7).
10. Recusa de provisão em dobro com `PROVISOES-AGENDADAS` (F-FOL-4).
11. Gates do diff: snapshot de shape dos DTOs, allowlist do `auditCanonical.ts` (**CPF e remuneração nunca no
    payload**), path-count do openapi, paridade i18n.
12. **Gate humano** (RUNBOOK-FORMAT, o agente prepara em branco): para N competências reais, colar a folha e a
    provisão do contador, o S-5011, a GFD e a DCTFWeb ao lado do razão do Luminaris. Desfecho em 3 estados, assinado
    pelo dono.

## 11. Ambiguidades legais (do dono, ou do contador/advogado)

**A-1 — Comissão em venda paga no cartão parcelado** (CLT, art. 466 § 1º [D05]).
- Leitura 1: a transação com o cliente acaba na venda, e o parcelamento é com a adquirente. A comissão inteira vale no
  mês da venda. É o que o plugin faz hoje (materializa em `Finalized`).
- Leitura 2: venda parcelada é "transação por prestações sucessivas", e a comissão é proporcional a cada parcela
  liquidada.
- Implica: o F-FOL-6 e a competência da comissão na folha. A leitura 1 parece a mais segura para o fluxo atual, mas
  não achei fonte que a confirme.
- **Pergunta exata** (advogado trabalhista ou contador): *"A comissão do empregado sobre serviço pago pelo cliente no
  cartão de crédito parcelado é devida inteira na folha do mês da venda ou proporcional a cada parcela que o salão
  recebe da adquirente?"*

**A-2 — DSR sobre comissão.** Não foi lido (Lei 605/1949 e a jurisprudência do TST não estão no dossiê). Afeta a base
da provisão. Vai para o contador como P-FOL-4.

## 12. Perguntas ao contador (pacote via `luminaris-contador-liaison`; quem envia é o dono)

- **P-FOL-1 (decide F-FOL-0 e F-FOL-1):** o 1º cliente tem empregado CLT? Quantos? Quem faz a folha e em qual software
  (Domínio, Alterdata, outro)? O software exporta arquivo de integração contábil? Você consegue entregar, por
  competência, os XML do eSocial (S-1200, S-1210, S-5001, S-5003, S-5011)? (= L-PES-6)
- **P-FOL-2:** que centros de custo você quer ver (unidade, profissional, tipo de serviço)? Com que critério reparte o
  salário de quem atende em mais de um?
- **P-FOL-3:** como provisiona férias e 13º hoje? Todo mês ou só no balanço? Com FGTS e INSS? Qual norma segue (NBC TG
  1000 seção 28, ITG 1000, outra)?
- **P-FOL-4:** que base usa para a provisão de quem ganha comissão: média de quantos meses? Inclui DSR sobre comissão?
- **P-FOL-5:** qual a estrutura de contas de pessoal que você quer no plano (salários, comissões, férias, 13º, FGTS,
  INSS, IRRF, provisões e encargos sobre provisões)? Separa por CC no razão ou só no gerencial?
- **P-FOL-6:** a GFD do FGTS Digital e o recibo do S-1299 chegam até você todo mês? Você aceitaria anexá-los no
  Luminaris para a conferência?
- **P-FOL-7:** a pergunta da A-1 (comissão no parcelado).
- Em aberto desde 10/10 e repetidas por bloquearem o §7: **L-PES-1/2** (o que o salão retém do parceiro PF e do
  MEI/ME) e **L-PES-8** (parceria sem homologação gera vínculo desde o início?).

## 13. Pendente de validação externa (não entra em checklist sem fonte ou resposta)

- Base da provisão com comissão variável (P-FOL-4, A-2).
- Norma CFC da provisão (P-FOL-3): fora do acervo.
- Competência da comissão no parcelado (A-1).
- Disponibilidade do XML do eSocial (L-PES-6 / P-FOL-1).
- Terço de férias: CF art. 7º XVII, não lida nesta sessão (só o *Vide* na CLT).

## 14. Insumos ausentes

- XSD S-1.3 de S-1200/S-1210/S-5001/S-5003/S-5011 e a Tabela 03 (natureza das rubricas), já ausentes em 10/10.
- IN RFB 2.237/2024 fora do acervo (V-adr pelo X9).
- Leiaute do arquivo de integração contábil da Domínio e da Alterdata (só se F-FOL-1 → b).
- Prazo de recolhimento do IRRF sobre salários: não lido.

## 15. Achados fora de escopo (registrados, não planejados)

1. **O diferido `M5-subrazoes-restantes` está desatualizado** em relação à decisão de 12/10: ainda diz "autorização:
   falta" e não aponta o PRE-ADR de pessoal. Corrigir é fold do plano, e não fiz.
2. **O preset `employees` não tem tipo de vínculo.** A UI de venda não distingue CLT de parceiro (§7).
3. **A comissão `Paid` não tem origem.** O `CommissionsPlugin` só carimba `paidAt`, e não se sabe se o pagamento foi
   pela folha ou pelo repasse.
4. **O `docs/adr/INDEX.md` não ganhou linha** para este PRE-ADR, para não colidir com as 3 sessões paralelas. Entra na
   ratificação.

## 16. Riscos e vieses

- **A recomendação de fronteira (a) depende de um download não verificado** (L-PES-6). Sem o XML, a fase 1 cai no
  digitado. O CC ainda funciona pelo cadastro, mas a conciliação de comissão por empregado perde a fonte.
- **Fonte de mercado em grau V-busca:** os resumos de busca dos help centers da Domínio e da Alterdata não foram
  abertos página a página. Servem de pista de desenho, não de requisito.
- **Viés do autor:** preferir o que reusa padrão da casa e tem menos código agora. O contrapeso é a opção (b) do F-FOL-1
  descrita com o menor custo operacional, e o F-FOL-0 sem recomendação.
- **Teste que derrubaria este documento:** se o P-FOL-1 disser "nenhum empregado CLT no 1º cliente", o §5 inteiro (que
  é o maior valor deste PRE-ADR) não tem cliente para servir. Aí F-FOL-0 (b) vira o caminho natural.
