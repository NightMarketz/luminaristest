# BRIEF — item 7: meses do ano (mês a mês e sazonalidade) no Simulador Tributário do Salão

Artifact: https://claude.ai/artifact/4T2JYWqnJXm9e6p2aUfDLu. Base: a versão publicada depois de `p08_lalur.py` (ver HANDOFF).
Decisão do dono (DECISOES-2026-11-21, item 7, literal): "Ambas as opções calcular mes a mes ou sazonalidade simples".
Vazio = meses iguais, como hoje. Este BRIEF não ratifica fork: os forks abaixo estão pendentes e vão ao dono antes do código.

## 1. O que muda para o usuário
Na ficha entra o seletor **"Meses do ano"** com três modos:
- **Iguais** (padrão). A conta fica como hoje.
- **Sazonalidade.** São 12 fatores em %, um por mês, sobre a receita do mês da ficha. 100 é o mês da ficha; dezembro a 140 vende 40% a mais. A conta normaliza a média a 100, ou avisa quando ela não é 100 (fork F7-1).
- **Mês a mês.** São 12 receitas de serviços digitadas, de janeiro a dezembro.

O resultado do ano passa a ser a soma dos 12 meses. O demonstrativo ganha uma tabela de 12 colunas mais o total. A aba DAS usa o mês escolhido em "Competência".

## 2. Contrato de dados (PR-0)
- O estado fica à parte da ficha, como o `DS` e o `INS`: `MKEY = KEY+"-mes"` e `MS = {modo:"IG"|"SZ"|"MM", f:[12], r:[12]}`.
  - `f` são os fatores em %. Vazio vale 100.
  - `r` são as receitas de serviços em R$. Vazio vale o mês da ficha.
  - Na leitura do `localStorage`, normalizar 12 posições, números ≥ 0 e o modo inválido para `"IG"`.
  - Entra no `#reset`.
  - Fica fora do `isEx`: o aviso de "exemplo" depende só da ficha, como o DS hoje.
- `x.meses = {modo, k:[12]}`, montado em `effective()`. `k[m]` é o multiplicador da receita do mês m sobre o mês da ficha:
  - **SZ:** `f[m]/100`;
  - **MM:** `r[m]/serv`; com `serv = 0`, cada mês usa `r[m]` como total e `servPor` proporcional ao cadastro.
- `escalaMes(x,k)` devolve a ficha do mês. Usa o mesmo padrão de `comX(...,"fat")`: escala `serv` e `servPor`, a revenda (fork F7-2) e o insumo (proporcional aos atendimentos).
  - A comissão acompanha sozinha, porque é % dos serviços.
  - Ficam iguais: o salário fixo, as despesas, a depreciação, a TFE e os benefícios.

## 3. Cálculo (CALC puro, testável no Node)
1. **`anoMeses(x,modo,reg)`** devolve, para m = 1..12, `cenarioReg({...escalaMes(x,k[m]), mes:m, rbaAnt, rbt12}, modo, reg)` e a soma do ano.
   - `rbaAnt` é a receita de janeiro (ou da abertura) até m − 1. Ela já move `apuracaoAno`, isto é, sublimite, limite, exclusão e impedimento no meio do ano.
   - `rbt12` é a soma da janela de `janelaRbt(m, ano)`. Em 2027 a janela recua um mês, e isso já está no código.
   - Os meses do ano anterior seguem o mesmo perfil (fork F7-3). Se o campo "Receita do ano passado" da aba DAS estiver preenchido, o perfil é escalado para somar esse total.
2. **Simples.** O DAS de cada mês sai com a alíquota efetiva do RBT12 daquele mês (LC 123 art. 18 § 1º; em 2027, a nova redação pela LC 214 art. 517), e o ano é a soma. A regra de início de atividade (`inicioAtiv`) já recebe `x.mes`.
3. **Presumido: IRPJ e CSLL por trimestre.** A base é a soma dos três meses. O adicional de 10% incide sobre o que passar de R$ 20 mil × 3. Hoje a conta usa R$ 20 mil por mês, o que só coincide com meses iguais.
   - **Pré-requisito legal:** ler pelo método oficial a Lei 9.249 art. 3º § 1º e a Lei 9.430 arts. 1º, 3º p.ú., 4º, 25 e 28, no acervo `ctresb/leis`.
   - Criar o dossiê `pesquisas-legais/salao-trimestre-adicional-irpj` antes do código.
   - O PIS, a Cofins, a CBS, o IBS e o ISS continuam mensais.
4. **Real.** O padrão é o trimestral: lucro real do trimestre, adicional acima de R$ 60 mil e compensação de 30% no trimestre (fork F7-4). A estimativa mensal fica fora deste BRIEF.
   - O LALUR do p08 passa a valer por trimestre.
   - O saldo de prejuízo fiscal é consumido em ordem: 30% do lucro ajustado de cada trimestre, até acabar. Isso substitui o "1/12 do saldo por mês", que é premissa do modo "iguais".
5. **Teto do lucro isento.**
   - Simples: soma dos meses de 32% × serviços + 8% × revenda − IRPJ do DAS.
   - Presumido: soma dos trimestres.
6. **Modo "iguais".** `anoMeses` precisa reproduzir exatamente o cálculo de hoje: 12 × o mês, nos três regimes. Isso é a invariante da migração.

## 4. Telas
- **Ficha.** O fieldset "Meses do ano" leva o seletor e uma grade de 12 campos, de fatores ou de receitas conforme o modo. Abaixo, uma linha com a soma do ano e a média.
- **Topo.** O KPI "Lucro do ano" passa a ser a soma dos meses. O KPI do mês mostra o mês da competência.
- **Aba DAS.** A competência escolhida usa o mês do perfil. "Receita de janeiro até o mês anterior" e o RBT12 vazios passam a vir do perfil, e o texto dos placeholders muda.
- **Aba 1 (Regime).** A comparação do ano soma os 12 meses, ou os 4 trimestres. O valor "por ano" deixa de ser 12 × o mês. Os gráficos de virada continuam no mês da ficha, e o texto diz isso.
- **Demonstrativo.** Ganha a tabela de 12 meses mais o ano: receita, tributos, pessoal, outras despesas e resultado, com o IRPJ/CSLL trimestral no mês do pagamento.
  - A DRE atual vira a DRE do mês escolhido.
  - A coluna "Ano" passa a ser a soma.
- **Aba 5 (Lucro).** O lucro do ano e o teto passam a ser somas.
- **Textos.** Atualizar o rodapé ("A conta supõe receita igual nos 12 meses"), "O que esta conta supõe" ("Com meses iguais, o trimestre e a estimativa mensal dão o mesmo"), o rodapé das duas DREs ("com meses iguais") e o KPI "12 meses iguais". Ver o grep da seção 6.

## 5. Checklist de PRs (patches reaplicáveis `p10a..p10e`)
- **p10a (PR-0, contrato).** Estado `MS`, UI do seletor e da grade, `effective()` com `x.meses`, `escalaMes`. O cálculo ainda não usa nada disso. Teste: bateria idêntica à versão base; reload sem perder `MS`; `#reset`.
- **p10b (motor do Simples).** `anoMeses` no Simples e no SR, com RBT12 e `rbaAnt` por mês. Teste:
  - "iguais" igual a hoje, byte a byte, na bateria;
  - "sazonalidade" com todos os fatores 100 igual a "iguais";
  - a soma dos meses igual ao KPI do ano;
  - um caso que cruza o sublimite em outubro, conferido à mão contra o `apuracaoAno` de hoje.
- **p10c (Presumido e Real trimestrais).** Só depois do dossiê do item 3.3 e dos forks F7-4 e F7-5. Teste: com meses iguais, igual a hoje; com sazonalidade, um trimestre acima de R$ 60 mil, conferido à mão.
- **p10d (telas).** Tabela de 12 meses no demonstrativo, KPIs, aba 1 e aba 5. Teste: a DRE fecha mês a mês e no ano; `dre4`/`card4` com um config SZ e um MM.
- **p10e (textos).** Grep da seção 6. Perguntas novas em "Ainda é decisão", se a pesquisa deixar alguma.

## 6. Grep de textos que mudam
`meses iguais|12 meses iguais|receita igual nos 12 meses|12 × o mês|1/12 do saldo|o trimestre e a estimativa mensal`

## 7. Forks pendentes (vão ao dono por questionário, com contexto)
- **F7-1.** Na sazonalidade, quando a média dos fatores não é 100:
  - (a) normalizar, para que o ano continue 12 × o mês da ficha;
  - (b) não normalizar: o ano é Σ fatores × o mês.
  Recomendação: (b), com aviso da média. O usuário que digita 140 em dezembro quer dezembro maior, não os outros meses menores.
- **F7-2.** A revenda acompanha os fatores dos serviços, ou fica igual todo mês? E no modo mês a mês: um segundo vetor de revenda, ou a revenda proporcional?
- **F7-3.** O ano anterior, para a janela do RBT12, segue o mesmo perfil do ano corrente? Ou o usuário digita os 12 meses do ano passado?
- **F7-4.** No Real, a conta usa o trimestral (padrão) ou também oferece a estimativa mensal com balancete de suspensão (Lei 9.430 art. 2º; Lei 8.981 art. 35)?
- **F7-5.** No caixa, o 13º e as férias são pagos em novembro/dezembro e no mês das férias. A tabela de 12 meses fica por competência, com provisão mensal, como a DRE de hoje (recomendado), ou mostra também o caixa?

## 8. Fora do escopo deste item
- Previsão de inflação ou reajuste de preço no ano.
- Sazonalidade da folha, como contratação temporária no fim do ano.
- Os gráficos de virada por mês.

## 9. Riscos
- A sensibilidade (`sens3`) varre 40+ campos em 12 configs. Com 12 meses por render, o tempo de cada render sobe cerca de 12 vezes. Medir no p10b e, se passar de cerca de 50 ms, guardar em cache por assinatura da ficha.
- A virada (`virada()`) já chama `regimes()` 150 vezes por eixo. Ela não deve passar a chamar `anoMeses`.

## 10. Emenda após os forks (21/11/2026, sessão "item 7 meses")
Forks ratificados em `DECISOES-2026-11-21.md` (item 7). O que muda no escopo:
- **F7-2:** no mês a mês, um 2º vetor de 12 receitas de revenda (vazio = proporcional aos serviços).
- **F7-3:** grade de 12 receitas do ano anterior (vazio = mesmo perfil; com "Receita do ano passado" da aba DAS, o perfil escalado) **e importação** (PDF do extrato do PGDAS-D, CSV/colar do Excel, exportação do sistema de caixa), com prévia. O leitor do PDF e o do sistema de caixa só se conferem com um arquivo real do dono.
- **F7-4:** o Real ganha o seletor trimestral | estimativa mensal | estimativa com balancete de suspensão (Lei 9.430 arts. 2º e 6º; Lei 8.981 art. 35). Sai do "fora do escopo" do §3.4.
- **F7-5:** além da competência, uma visão de caixa: 13º (adiantamento fev–nov e saldo até 20/12, Lei 4.749 arts. 1º e 2º), férias no mês informado por pessoa (CLT art. 145; campo novo na equipe), salário até o 5º dia útil (CLT art. 459 § 1º), tributos no vencimento (calendário da página; IRPJ/CSLL trimestral no mês seguinte ao trimestre, estimativa no mês seguinte, ajuste em março, Lei 9.430 arts. 5º e 6º).
- Dossiê legal feito: `pesquisas-legais/salao-trimestre-adicional-irpj/relatorio.md`.
- **Fatias novas depois do p10e:** p10f (caixa), p10g (importação CSV/colar), p10h (PDF do PGDAS-D e exportação do sistema de caixa, só com arquivo do dono).
- Invariante mantida: modo "iguais" é o caminho antigo, literalmente 12 × o mês (`anoMeses` devolve null). "Sazonalidade com 100 em tudo = iguais" só vale longe dos limites do Simples e com prejuízo fiscal e base negativa zerados (no mês a mês o saldo é consumido em ordem, 30% por período; nos iguais, 1/12 por mês).
