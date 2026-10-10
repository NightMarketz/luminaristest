# PROPOSTA de códigos referenciais RFB e de contas, por delegação (D-1), 10/10/2026

> **Verdade e risco, antes de tudo.** São 42 contas propostas, todas com código **analítico (tipo A)** conferido na tabela
> oficial e **igual no Presumido (P100A/P150A) e no Real (L100A/L300A)**. Para a 3.4, a proposta é `3.01.01.01.01.98` "Outras
> Receitas da Atividade Geral". **Risco principal:** mapear a 3.4 destrava **só o gate da ECD** do H1/P5. A ECF Presumido
> continua recusando movimento na 3.4 (gate de exaustividade da receita, `SpedEcfGenerationService.ts:44-46`). Além disso,
> o gate da ECD exige mapeamento de **toda** folha ativa, não só da movimentada (`ReferentialMappingService.ts:326`). Por
> isso, as 9 folhas do E1/E26 da emenda 3.3 têm de ser mapeadas **no mesmo PR que as criar**. Sem isso, a ECD volta a dar 400
> em todos os escopos.

## 0. Cabeçalho

- **Autorização:** dono, chat, 10/10, questionário. D-1: *"Sim, proponha"*. O agente propõe os códigos referenciais e as
  contas pelo catálogo, como delegação do contador (*"o contador disse que o resto é vc que decide"*). Gate da ECD:
  *"Manter o gate e mapear"* (`TRIAGEM-RESPOSTA-CONTADOR-2026-10-10.md` §5).
- **Caráter:** é **só proposta em documento**. Nada foi aplicado em código, kit, seed ou banco, e nada foi commitado.
  O registro é *"delegação do contador via dono, 10/10"* (triagem §3, D-1). O contador pode revisar quando quiser
  (triagem §4). Revisão dele vira validação, não bloqueio.
- **Fonte:** `RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx`, baixada de `http://sped.rfb.gov.br/arquivo/download/8002` em
  10/10/2026. Tamanho de 1.724.077 bytes. **sha256 `366b8d9030a04e9f6203b6ae29ace49d3ffa3fa0c1f5a7a18b0c967b9a5a3cac`**,
  que confere com o prefixo `366b8d9030a0` do `fontes-oficiais/MANIFEST.md:17` (**verificado**). Abas lidas: L100A e
  L300A (PJ em geral, Lucro Real), P100A e P150A (PJ em geral, Lucro Presumido), PARTEB_PADRAO e PARTEB_PARTEA.
- **Conferência com o catálogo do sistema (verificado, script `python -I` + openpyxl):**
  - L100A + L300A têm 732 + 391 = **1.123** linhas, todas presentes em `sectorKits/__tests__/fixtures/referential-catalog-2025.json`.
    Nenhuma sobra de um lado ou de outro, e o tipo A/S bate nas 1.123.
  - P100A + P150A têm 1.120 linhas. Só 5 códigos existem no P e não no L, e 8 no L e não no P. **Nenhum deles foi usado**
    nesta proposta.
  - Nenhum código proposto tem DT_FIM preenchido.
- **Mapeamento que já existe** (dev.db real, `server/prisma/prisma/dev.db`, lido em modo `ro`, **verificado**): são 56
  linhas, 14 folhas × 4 unidades (incluindo `seed-unit-presumido` e `seed-unit-real`), versão `2025`, **o mesmo código para
  Presumido e Real**. Não remapeio nada disto:

  | Conta | Código atual |
  |---|---|
  | 1.1.1 | 1.01.01.02.01 |
  | 1.1.2, 1.1.4, 1.1.5 | 1.01.02.02.01 |
  | 1.1.3 | 1.01.01.01.01 |
  | 1.1.6 | 1.01.03.01.01 |
  | 2.1.1 | 2.01.01.05.01 |
  | 2.1.2 | 2.01.01.03.01 |
  | 2.3.1 | 2.03.04.01.01 |
  | 3.1 | 3.01.01.01.01.06 |
  | 3.2 | 3.01.01.01.02.01 |
  | 3.3 | 3.01.01.01.01.05 |
  | 4.1 | 3.01.01.09.01.99 |
  | 4.2 | 3.01.01.03.01.02 |

  A única folha canônica de hoje **sem** mapeamento é a **3.4**.

**Legenda de grau:**
- **V**: o código, o tipo A e a descrição foram lidos na tabela (L e P).
- **I**: a escolha entre vizinhos é inferência minha, a partir da coluna ORIENTAÇÕES da própria aba.

"Igual" na coluna Real quer dizer mesmo código e mesma descrição no L300A/L100A, conferido por script.

## 1. Tabela por conta

### 1.1 Plano canônico de hoje (`ChartOfAccountsFixture.ts`)

| Conta | Nome | Presumido: código + descrição | Real | Justificativa | Alternativa | Grau | Risco |
|---|---|---|---|---|---|---|---|
| **3.4** | Receita de Pacotes Não Utilizados | `3.01.01.01.01.98` Outras Receitas da Atividade Geral | igual | Ver §3: é receita da atividade (DL 1.598 art. 12 IV), e não preço de serviço prestado (art. 12 II). A ORIENTAÇÃO da linha descreve *"demais receitas auferida em decorrência da atividade fim da companhia, esporádica ou recorrentes não especificadas nas demais contas de receita"* | `.01.01.06` (serviços); `3.01.01.05.01.99` (outras receitas operacionais); `3.01.01.01.02.64` (CPC 47, direitos não exercidos) | V código · I escolha | Médio. Ver §3 |

### 1.2 Folhas canônicas da emenda 3.3 (E1/E26, F-ENC-1 (a) e F-ENC-11 (a) ratificados em 09/10; ainda não estão no fixture)

| Conta | Nome | Presumido: código + descrição | Real | Justificativa | Alternativa | Grau | Risco |
|---|---|---|---|---|---|---|---|
| 3.5.1 | Juros de Mora Recebidos | `3.01.01.05.01.05` Outras Receitas Financeiras | igual | A ORIENTAÇÃO cita *"juros, descontos"*. Não existe linha de juros de mora de cliente | `.05.01.32` "Juros Auferidos com Outros Ativos Financeiros Mensurados Pelo Custo Amortizado": é juro efetivo de instrumento financeiro, não encargo moratório | V · I | Baixo |
| 3.5.2 | Multas de Mora Recebidas | `3.01.01.05.01.05` Outras Receitas Financeiras | igual | A multa de mora é encargo do atraso, da mesma natureza do juro de mora (triagem, item 6) | `.05.01.24` "Multas e Outras Vantagens Recebidas": a ORIENTAÇÃO restringe a *"indenização em virtude de rescisão contratual"* (Lei 9.430 art. 70 §3º II) | V · I | Baixo. Se o contador chamar a multa de "vantagem", troca só o código |
| 3.5.3 | Descontos Financeiros Obtidos | `3.01.01.05.01.05` Outras Receitas Financeiras | igual | É desconto **condicional** (pagamento antecipado), e a ORIENTAÇÃO cita *"descontos"* | — (desconto incondicional obtido reduz o custo e não tem conta; ver §1.3) | V | Baixo |
| 4.3.1 | Juros de Mora Pagos | `3.01.01.09.01.08` (-) Outras Despesas Financeiras | igual | A ORIENTAÇÃO é *"despesas relativas a juros, não incluídas nas contas específicas"* | `.09.01.25` "(-) Despesas Incorridas em Outros Passivos Financeiros Mensurados Pelo Custo Amortizado": é instrumento financeiro, não fornecedor em atraso | V · I | Baixo |
| 4.3.2 | Multas de Mora Pagas | `3.01.01.07.01.22` (-) Multas | igual | Ver §6: existe linha própria de multas. A ORIENTAÇÃO separa a multa compensatória/de mora (dedutível) da punitiva dentro da **mesma** linha | `.09.01.08` (-) Outras Despesas Financeiras | V · I | Médio. A DRE interna põe a 4.3 em `financialResult` (F-ENC-9 a), e a ECF mostra a multa em despesa operacional. Só apresentação: o resultado não muda |
| 4.3.3 | Descontos Financeiros Concedidos | `3.01.01.09.01.08` (-) Outras Despesas Financeiras | igual | Desconto condicional é despesa financeira e não reduz a receita bruta (IN 1.700 arts. 26 e 215 só deduzem o **incondicional**) | `3.01.01.01.02.02` (-) Descontos Incondicionais: errado para o condicional, porque reduziria a base do Presumido | V · I | Baixo |
| 4.4.1 | Multas Fiscais Punitivas (de Ofício) | `3.01.01.07.01.22` (-) Multas | igual | A ORIENTAÇÃO diz *"São totalmente indedutíveis […] as multas impostas por infrações fiscais de que resulte falta ou insuficiência de pagamento"*. A adição sai pelo M300 8.60 (emenda E16) | — | V | Baixo |
| 4.4.2 | Multas de Natureza Não Tributária | `3.01.01.07.01.22` (-) Multas | igual | Mesma ORIENTAÇÃO: *"multas de trânsito, por exemplo"* | — | V | Baixo. O CSLL 8.65 segue em aberto (emenda §6.3) |
| 4.5 | Tarifas Bancárias e de Intermediação | `3.01.01.07.01.04` (-) Outros Serviços Prestados por Pessoa Física ou Jurídica | igual | A tarifa é serviço de PJ (banco ou intermediador), despesa operacional dedutível, fora do resultado financeiro (diretriz L9 de 09/10). É a linha analítica que nomeia serviço de PJ | `.09.01.99` (-) Outras Despesas Operacionais (genérica); `.09.01.21` Corretagem e Emolumentos (mercado de valores) | V · I | Baixo. A sugestão do dono "3.01.01.07 / 3.02.01.07" (emenda §6.8) não serve: `3.01.01.07` é **sintética**, e `3.02.01.07` **não existe** (o grupo 3.02 é provisão de IRPJ/CSLL) |

### 1.3 Contas que o plano ainda não tem (II-3 g/h)

| Conta (sugerida) | Nome | Presumido | Real | Justificativa | Alternativa | Grau | Risco |
|---|---|---|---|---|---|---|---|
| 3.8 (nova, só quando o bridge de venda apresentar o bruto) | (-) Descontos Incondicionais Concedidos | `3.01.01.01.02.02` (-) Descontos Incondicionais e Abatimentos | igual | A ORIENTAÇÃO é literal: *"descontos incondicionais e abatimentos concedidos"* | — | V | Nenhum hoje: a receita entra líquida (emenda S22), e a conta não existe |
| — | Descontos incondicionais **obtidos** | **sem proposta** | — | Pela lei, reduzem o custo de aquisição (`NfeImportService`: custo = vProd − vDesc), e não são receita. Não há conta a mapear | — | — | — |

### 1.4 Imobilizado (C8). As contas são do tenant (`FixedAssetClass.costAccountId` e `accumulatedDepreciationAccountId`; `AccountingScopeSettings`). Códigos internos são sugestão para `chartExtension`

| Conta (sugerida) | Nome | Presumido | Real | Justificativa | Alternativa | Grau | Risco |
|---|---|---|---|---|---|---|---|
| 1.2 (sintética) | Imobilizado | — (sintética, sem I051) | — | — | — | — | — |
| 1.2.1 | Móveis e Utensílios | `1.02.03.01.07` Móveis, Utensílios e Instalações Comerciais | igual | Cadeiras, bancadas, espelhos e instalação do salão | — | V | Baixo |
| 1.2.2 | Máquinas e Equipamentos | `1.02.03.01.06` Máquinas, Equipamentos e Instalações Industriais | igual | É a única linha analítica de máquinas e equipamentos. O "Industriais" qualifica as instalações | `1.02.03.01.28` Outras Imobilizações por Aquisição | V · I | Baixo |
| 1.2.3 | Equipamentos de Informática | `1.02.03.01.06` Máquinas, Equipamentos e Instalações Industriais | igual | Não há linha de informática. Equipamento é o vizinho mais específico | `1.02.03.01.28` | V · I | Baixo |
| 1.2.4 | Benfeitorias em Imóveis de Terceiros | `1.02.03.01.05` Benfeitorias em Imóveis de Terceiros | igual | Literal (salão em imóvel alugado) | — | V | Baixo |
| 1.2.5 | Veículos | `1.02.03.01.08` Veículos | igual | Literal | — | V | Baixo |
| 1.2.6 | Edifícios e Construções | `1.02.03.01.02` Edifícios e Construções | igual | Literal | — | V | Baixo |
| 1.2.7 | Terrenos (`depreciable = false`) | `1.02.03.01.01` Terrenos | igual | Literal | — | V | Baixo |
| 1.2.9.1 | (-) Depreciação Acumulada | `1.02.03.01.30` (-) Depreciação Acumulada - Imobilizado | igual | Uma só linha analítica para todas as classes. O I051 aceita N:1 | `1.02.03.05.30` (outras): só para "outros imobilizados" | V | Baixo |
| 1.2.9.2 | (-) Amortização Acumulada (benfeitorias) | `1.02.03.01.31` (-) Amortização Acumulada - Imobilizado | igual | **Já fechado em 02/10** (F-EM-7). Aqui só reafirmo | — | V | — |
| 4.7.1 | Despesa de Depreciação (`depreciationExpenseAccountId`) | `3.01.01.07.01.23` (-) Encargos de Depreciação | igual | Linha literal | `3.01.01.03.01.03` (-) Custo dos Serviços Prestados: a ORIENTAÇÃO da `.23` exclui bens *"aplicados diretamente na produção"*, e cadeira e secador são usados no serviço | V · I | Médio: se o contador quiser custo, troca só o código. Há uma conta só por escopo, então não dá para dividir por bem |
| 4.7.2 | Despesa de Amortização (por classe, F-EM-7 b) | `3.01.01.07.01.24` (-) Encargos de Amortização | igual | **Já fechado em 02/10** | — | V | — |
| 3.7 | Ganho na Baixa de Imobilizado (`disposalGainAccountId`) | `3.01.01.11.01.02` Receitas de Alienações de Bens e Direitos do Ativo Não Circulante Investimentos, Imobilizado e Intangível | igual | O referencial não tem linha de "ganho" líquido: separa receita de alienação e valor contábil. Esta é a perna positiva | — | V · I | **Médio.** (i) Lançamos o ganho **líquido** na linha de receita **bruta** de alienação: o saldo do L300 sai menor que a receita real, e o PVA não confere isso. (ii) A conta é `Revenue`: no Presumido ela cai no gate de exaustividade da ECF (só aceita 3.1/3.3), e o ganho de capital entra em 100% (art. 25 II). Fica para o BRIEF da ECF |
| 4.7.3 | Perda na Baixa de Imobilizado (`disposalLossAccountId`) | `3.01.01.11.01.05` (-) Valor Contábil dos Bens e Direitos do Ativo Não Circulante Investimentos, Intangível e Imobilizado Alienados | igual | É a perna negativa do mesmo par | `.09.01.99` (genérica) | V · I | Médio, pelo mesmo (i) da linha 3.7 |

### 1.5 Tributos: provisões e créditos (X7, X8, X14). Os FKs ficam no `FiscalProfile` da unidade; os códigos internos são sugestão

| Conta (sugerida) | Nome (FK) | Presumido | Real | Justificativa | Alternativa | Grau | Risco |
|---|---|---|---|---|---|---|---|
| 4.9.1 | IRPJ, despesa (`irpjDespesa`) | `3.02.01.01.01.02` (-) Provisão para Imposto de Renda - Pessoa Jurídica (Atividade Geral e Rural) | igual | Literal | — | V | Baixo |
| 4.9.2 | CSLL, despesa (`csllDespesa`) | `3.02.01.01.01.01` (-) Provisão para Contribuição Social sobre o Lucro Líquido (Atividade Geral) | igual | Literal | — | V | Baixo |
| 2.1.3 | IRPJ a Recolher (`irpjRecolher`) | `2.01.01.09.13` IRPJ a Recolher – Circulante | igual | O X7 lança o apurado do trimestre ou da estimativa, que é obrigação determinada e não estimada | `2.01.01.15.01` Provisão para o Imposto de Renda | V · I | Baixo |
| 2.1.4 | CSLL a Recolher (`csllRecolher`) | `2.01.01.09.14` CSLL a Recolher – Circulante | igual | Idem | `2.01.01.15.02` | V · I | Baixo |
| 4.8.1 | PIS, despesa (`pisDespesa`) | `3.01.01.01.02.05` (-) PIS/PASEP Sobre Receita Bruta | igual | A ORIENTAÇÃO é PIS *"apurado sobre a receita de vendas"*, que é a base do X8 (faturamento). A `.07.01.14` é para PIS *"sobre as demais receitas operacionais"* | `3.01.01.07.01.14` (-) PIS/PASEP | V · I | **Médio.** (i) A conta interna é `Expense` (F-PCB-1 b): a DRE interna mostra o PIS em despesa e a ECF em dedução. O resultado não muda, e o F-PCB-1 **não** é revertido (a natureza e o gate da ECF ficam iguais). (ii) No Real com receita financeira (0,65%), uma conta só mistura as duas bases. Se surgir, abrir uma conta irmã na `.07.01.14` |
| 4.8.2 | COFINS, despesa (`cofinsDespesa`) | `3.01.01.01.02.04` (-) COFINS Sobre Receita Bruta | igual | Idem | `3.01.01.07.01.15` (-) COFINS | V · I | Idem 4.8.1 |
| 2.1.5 | PIS a Recolher | `2.01.01.09.04` PIS a Recolher – Circulante | igual | Literal | — | V | Baixo |
| 2.1.6 | COFINS a Recolher | `2.01.01.09.05` COFINS a Recolher – Circulante | igual | Literal | — | V | Baixo |
| 3.6 | (-) Simples Nacional (DAS), dedução (`simplesDasDeducao`, F-SN-10 a) | `3.01.01.01.02.09` (-) Demais Impostos e Contribuições Incidentes sobre Vendas e Serviços | igual | A ORIENTAÇÃO fala de tributos *"que guardem proporcionalidade com o preço e sejam considerados redutores das receitas"*. O DAS é % da receita. II-5 (c): a CPP fica dentro, sem partição (F-SN-10 a, regra silente nº 2) | `.01.02.06` (-) ISS: só uma parte do DAS | V · I | Baixo: o Simples não entrega ECF, e a ECD é facultativa. Só serve ao gate (*"manter o gate e mapear"*) |
| 2.1.7 | Simples Nacional a Recolher (`simplesRecolher`) | `2.01.01.09.28` Outros Tributos a Recolher – Circulante | igual | Não há linha de DAS. O DAS é sobretudo federal | `2.01.01.09.08` Tributos Municipais: errado | V · I | Baixo |
| 1.1.7 (sintética) | Tributos a Recuperar e a Compensar | — | — | — | — | — | — |
| 1.1.7.1 | ICMS a Recuperar (`icmsRecuperavel`) | `1.01.02.03.02` ICMS a Recuperar | igual | Literal | — | V | Baixo |
| 1.1.7.2 | PIS/COFINS a Recuperar (`pisCofinsRecuperavel`) | `1.01.02.03.40` Outros Impostos e Contribuições a Recuperar | igual | A conta junta PIS e COFINS, e o referencial separa (`.03.03` e `.03.05`). Mapear em um dos dois distorce o outro. A linha "outros" é analítica e correta | Dividir em 2 contas → `.03.03` + `.03.05` (exige 2 FKs, ou seja, código) | V · I | Baixo. Recomendo dividir quando houver crédito real (Real não cumulativo) |
| 1.1.7.3 | PIS/COFINS Retidos a Compensar (`pisCofinsRetidoCompensar`) | `1.01.02.04.40` Outros Tributos a Compensar | igual | Mesmo motivo: o referencial separa `.04.07` e `.04.09` | Dividir → `.04.07` + `.04.09` | V · I | Baixo |
| 1.1.7.4 | (-) Retenções de PIS/COFINS a Conciliar (`pisCofinsRetencaoConciliar`) | `1.01.02.04.40` Outros Tributos a Compensar | igual | É a redutora da 1.1.7.3 até a compensação. Na mesma linha, as duas se anulam e o BP não infla | `1.01.02.09.10` Demais Créditos a Receber | I | Médio: depende do fluxo do X8 PR-3, que não reli linha a linha |
| 1.1.7.5 | IRPJ Saldo Negativo (`irpjSaldoNegativo`, P-B8) | `1.01.02.04.03` IRPJ Saldo Negativo | igual | Literal | `.04.02` IRPJ Recolhido por Estimativa (é outro estado do crédito) | V | Baixo |
| 1.1.7.6 | CSLL Saldo Negativo (`csllSaldoNegativo`, P-B8) | `1.01.02.04.06` CSLL Saldo Negativo | igual | Literal | `.04.05` | V | Baixo |
| 4.6 | Custo dos Serviços: insumos (`insumoExpense`, F-ID-5 a) | `3.01.01.03.01.03` (-) Custo dos Serviços Prestados | igual | Insumo aplicado no serviço é custo. A ORIENTAÇÃO é *"gastos que compõem o custo total da prestação de serviço"* | `.09.01.99` (onde está a 4.1) | V · I | Baixo |
| 4.8.3 | (-) Créditos de PIS/COFINS: outros (`pisCofinsCreditoOutros`) | **sem proposta** | — | É redutora de despesa e junta PIS e COFINS. Não há linha "outros" entre as deduções (a `.02.09` é de tributo sobre venda, com sinal oposto). Qualquer código distorce | Dividir em 2 contas → `.02.05` / `.02.04` como redutoras | — | Fica para o X8 dividir. Hoje nenhum escopo a configura (dev.db) |

### 1.6 II-7, Mercado Pago (`PaymentAccount.glAccountId`, F5 P1)

| Conta (sugerida) | Nome | Presumido | Real | Justificativa | Alternativa | Grau | Risco |
|---|---|---|---|---|---|---|---|
| 1.1.8 | Saldo em Instituição de Pagamento: Mercado Pago | `1.01.01.99.01` Outras Disponibilidades | igual | A `PaymentAccount` registra o liberado (`mp_release`), que é disponível. A ORIENTAÇÃO da `.02.01` exige *"instituições financeiras"*, e o MP opera como instituição de pagamento | `1.01.01.02.01` Bancos Conta Movimento; "a liberar" → `1.01.02.02.01` (como a 1.1.4) | I | Médio. Se o contador separar "a liberar" e "disponível" (II-7 a), viram 2 contas |

**Contagem: 42 contas propostas** (§1.1: 1 · §1.2: 9 · §1.3: 1 · §1.4: 13 · §1.5: 17 · §1.6: 1). As sintéticas (1.2,
1.2.9, 1.1.7 e os grupos 3.5/4.3/4.4 do E1) não entram na conta, porque o I051 é só para analíticas. Duas linhas (1.2.9.2 e
4.7.2) só reafirmam o que foi fechado em 02/10.

**Sem proposta (3):**
- descontos incondicionais obtidos (não há conta, por lei);
- `pisCofinsCreditoOutros` (mistura dois tributos, e não há linha neutra);
- contas legadas ou de teste fora do canônico no dev.db (`1.1.5 Poupança`, `1.4.1 Estoque de Produtos`, `3.1 Receita de
  Vendas`, `9.9.9-F`), que são de tenants pré-baseline e não do plano.

## 2. PARTEB_PADRAO (II-4, M010.COD_PB_RFB)

A validação do sistema confere com a fonte (**V**):
- `LalurDto.ts:239` aceita `codPbRfb` de até 6 caracteres;
- a existência por tributo é checada no serviço (`LalurService` → `findParteBPadrao`, `Lalur.model.ts:223`);
- a aba em código (`fixtures/ecf-l12-linhas.json`) tem **126** linhas, que são as 126 da aba oficial;
- os códigos abaixo existem nas duas, com o tributo indicado.

| Tipo de conta da Parte B | COD_PB_RFB | Descrição oficial | Tributo | Por quê | Alternativa | Grau |
|---|---|---|---|---|---|---|
| Prejuízo fiscal | `1000` | Prejuízo Fiscal Operacional - Atividade Geral | I | Já é o default do sistema (`TRIBUTO_PREJUIZO_COD_PB_RFB`, `Lalur.model.ts:112`) | `1001` Não Operacional (só se houver) | V |
| Base negativa da CSLL | `1003` | Base de Cálculo Negativa da CSLL - Atividade Geral | C | Idem | `1004` Atividade Rural: não se aplica | V |
| Diferença de depreciação (`depreciationParteBAccountId`, C8 item 24) | **`2210`** | Depreciação - Diferença entre as Depreciações Contábil e Fiscal | A | O caso default do C8 é fiscal > contábil (taxa contábil menor ou residual > 0 → **exclusão** primeiro). Pela PARTEB_PARTEA, a `2210` se relaciona com o M300 **86** (adição), o **161** (exclusão) **e o 91.01** (*"alienação ou baixa de ativo"*). Cobre os dois sentidos e a baixa (item 23) com **uma** conta, e o setting só tem um FK | `1071` (mesma descrição; relaciona com 86, 161 e 260, mas **não** com o 91.01) | V · I |
| Adição temporária (provisões não dedutíveis) | `1005` | Provisões ou Perdas Estimadas Não Dedutíveis | A | É a adição temporária mais comum (provisão que reverte depois) | `1900` Outras Adições | V · I |
| Adição temporária sem linha própria | `1900` | Outras Adições | A | Genérica analítica, para o resto | — | V |
| Exclusão temporária sem linha própria | `2900` | Outras Exclusões | A | Idem | — | V |
| (só se a 3.4 seguir o B46 proporcional no contábil) | `3080` | CPC 47 - Ajustes de Receita Bruta | A | Hoje **não** se aplica: a decisão 18 reconhece no vencimento (2º ramo do B46), igual ao fiscal, então não há diferença temporária | — | V · I |

## 3. A conta 3.4 em detalhe (II-2): o que destrava

**Por que `3.01.01.01.01.98`, e não o vizinho:**
1. **Não `.01.01.06` (serviços).** A ORIENTAÇÃO dela é *"receita decorrente dos serviços prestados"*. No pacote vencido não
   houve prestação: é o caso que o `PESQUISA-LEGAL-PACOTE-VALIDADE-2026-09-29.md` (PE-2) separa como art. 12 **IV**
   (*"receitas da atividade ou objeto principal"*), e não art. 12 **II** (*"preço da prestação de serviços"*).
2. **Não `3.01.01.05.01.99` (outras receitas operacionais).** A ORIENTAÇÃO restringe a *"recuperações de despesas
   operacionais de períodos de apuração anteriores, tais como prêmios de seguros, FGTS, ressarcimento de desfalques"*. O
   pacote vencido não é recuperação. Além disso, fica fora da receita bruta, o que contradiz:
   - a leitura da PE-2, que trata o vencido como receita da atividade;
   - o D-2 ratificado, que trata o vencido como receita no Simples (LC 123 art. 3º §1º, *"demais receitas da atividade ou
     objeto principal"*) e mantém a NFS-e com ISS no vencimento.
3. **Não `3.01.01.01.02.64` (CPC 47, direitos não exercidos).** É linha **redutora** (dedução da receita bruta) para ajuste de
   adoção ou alteração de critério (*"procedimentos contábeis decorrentes da alteração ou adoção de novos métodos"*). Não é a
   receita da quebra em si.
4. **`.01.01.98` é a linha analítica do art. 12 IV.** A ORIENTAÇÃO diz *"demais receitas auferida em decorrência da atividade
   fim da companhia, esporádica ou recorrentes não especificadas nas demais contas de receita"*. Fica dentro da RECEITA BRUTA
   (`3.01.01.01.01`), que é a mesma linha da DRE das receitas 3.1/3.3. Existe igual no P150A e no L300A.

**Linha da DRE (II-2):** Receita Bruta → Outras Receitas da Atividade Geral. No J150 interno, a 3.4 segue onde o
`StatementMappingFixture` a pôr, porque esta proposta não mexe na DRE.

**O que destrava (verificado no código, não executado):**
- **H1/P5, ECD.** O 400 `unmappedAccounts` vem do gate de cobertura (`SpedGenerationService.ts:148-154` →
  `ReferentialMappingService.coverage`). O gate cai quando a 3.4 tiver `ReferentialMapping` versão `2025` em cada escopo
  com a folha ativa. No dev.db, **2** escopos têm a 3.4.
- **Não destrava a ECF Presumido.** Se houver movimento na 3.4 no ano, o gate de exaustividade (só 3.1/3.3,
  `SpedEcfGenerationService.ts:44-46`) continua dando 400. O gate não lê o referencial. Para tirar esse bloqueio é preciso
  decidir a presunção da 3.4 no P200/P400. A recomendação que segue do código escolhido é **32% sobre receita bruta**
  (art. 12 IV → Lei 9.249 art. 15 §1º III a). O III-3 (a) continua **não confirmado** pelo contador. Isso é código, com
  "executa" do dono, e não faz parte desta proposta.
- **Tensão nomeada com o critério de delegação** (*"na dúvida, o que não reduz imposto"*): no Presumido, receita bruta
  (presunção de 32%) gera **menos** IRPJ/CSLL que "demais receitas" (100%, art. 25 II), mas **gera** PIS/Cofins cumulativo,
  que "demais receitas" não geraria. Nenhuma das duas é conservadora em todos os tributos. O que decidiu foi a natureza da
  receita (art. 12 IV, pesquisa PE-2 e D-2), não a carga. Se o dono preferir art. 25 II, o código vira
  `3.01.01.05.01.99`. **Isso é fork do dono, não decisão minha.**

**Consequência obrigatória da emenda 3.3** (verificado em `ReferentialMappingService.ts:326`): o gate conta **toda folha
ativa** (`acceptsEntries`), movimentada ou não. O E1 cria 8 folhas em todo escopo via `ensureChartOfAccounts`, e o E26 cria
a 4.5. Se o PR-1 da emenda entrar sem o mapeamento da §1.2, a ECD volta a dar 400 em todos os escopos, inclusive no H1.

## 4. Onde aplicar depois (não aplicado)

1. **Folhas canônicas de hoje e da emenda 3.3 (3.4, 3.5.x, 4.3.x, 4.4.x, 4.5).** Kit **v2** (`kits/beautySalon/kit.v2.ts`;
   o `kit.v1.ts` é publicado e não se edita). Dois blocos `referential`, `{ regime: 'PRESUMIDO', mappingVersion: '2025',
   entries }` e `{ regime: 'REAL', … }`, com os mesmos códigos.
   - O gate `kitReferentialCatalog.test.ts` já confere existência e tipo A no catálogo 2025.
   - Para as folhas da emenda, o kit v2 só valida depois que o E1 as puser no fixture (`SectorKitDto.ts:137`: a conta tem
     de existir no canônico ou na extensão).
   - Mesmo PR do E1, ou o seguinte antes do merge (§3).
2. **Escopos que já existem** (dev.db: 4 unidades com mapeamento, 2 com a 3.4). Pela tela ou pela API:
   `PUT /api/accounting/referential/mappings` (uma), ou `POST /api/accounting/referential/mappings/batch` com o esqueleto
   de `GET /referential/skeleton` (rotas em `routes/accounting.ts:273-279`).
   - É o caminho do H1/P5: o dono aplica a 3.4 no `seed-unit-presumido` e roda de novo o P5.
   - O serviço revalida o código (analítico) e grava o rótulo a partir do catálogo.
3. **Contas configuráveis (§1.4, §1.5, §1.6).** Kit v2:
   - `chartExtension`: códigos internos sugeridos, sem colisão com o canônico nem com os códigos reservados nos BRIEFs
     (grep em `docs/accounting` e `server/src`);
   - `roleDefaults.scopeSettings` / `roleDefaults.fiscalProfile` por código;
   - `referential.entries`.

   **Lacuna de schema:** `roleDefaults.fiscalProfile` (`SectorKitDto.ts:34-47`) não tem as chaves `simples*`,
   `*SaldoNegativo`, `pisCofinsRetido*`, `pisCofinsRetencaoConciliar` nem `pisCofinsCreditoOutros`. Essas precisam de
   código (BRIEF do kit v2) ou de configuração pela tela.
4. **PARTEB_PADRAO.** Pela tela do e-Lalur (`POST` de conta M010, `CreateLalurParteBAccountSchema`) com `codPbRfb` da §2.
   Depois, `depreciationParteBAccountId` aponta para a conta `2210` criada.
5. **Proveniência.** Cada aplicação leva `label` = descrição oficial (o serviço já faz isso) e, no PR, a referência
   *"delegação do contador via dono, 10/10, PROPOSTA-REFERENCIAL-D1"*.

## 5. O que fica aberto

- **III-3 (a), presunção da 3.4 no Presumido.** Fork do dono antes de mexer no gate da ECF (§3).
- **Contador:** revisão, se ele quiser (triagem §4). Os pontos mais sensíveis são:
  - 4.3.2 (multa de mora como despesa operacional);
  - 4.7.1 (depreciação como despesa ou como custo);
  - 3.7/4.7.3 (líquido em linha bruta);
  - 4.8.1/4.8.2 (dedução na ECF × despesa interna).
- **Dividir as contas combinadas de PIS/COFINS** (1.1.7.2, 1.1.7.3, 4.8.3): só quando o X8 rodar com crédito real.

## 6. Caso adversarial (uma escolha que troquei depois de olhar o vizinho)

**4.3.2 Multas de Mora Pagas.**
- **Primeira escolha:** `3.01.01.09.01.08` (-) Outras Despesas Financeiras, porque a conta interna mora no grupo 4.3
  (Despesas Financeiras, `financialResult`) e eu segui o grupo.
- **Por que troquei:** ao ler a ORIENTAÇÃO do vizinho, a `.09.01.08` é *"despesas relativas a juros, não incluídas nas
  contas específicas"*. Multa não é juro, e existe conta específica: a `3.01.01.07.01.22` (-) Multas trata na própria
  ORIENTAÇÃO a multa *"de natureza compensatória"* como dedutível e a punitiva como indedutível.
- **Escolha final:** `.07.01.22`, mais específica. O custo é a diferença de apresentação entre a DRE interna e a ECF.
- **Teste que teria me derrubado:** se a `.07.01.22` fosse sintética ou não existisse no P150A, a troca cairia. O script deu
  **tipo A, igual no L e no P**.

**Outros falsificadores que rodei:**
- todo código proposto passou pelo script contra L e P (existência, tipo A, mesma descrição, DT_FIM vazio);
- a sugestão do dono "3.01.01.07 / 3.02.01.07" para a 4.5 **caiu**: uma é sintética e a outra não existe;
- a candidata `1071` da Parte B **perdeu** para a `2210`, porque não cobre o M300 91.01 (baixa).
