# PRE-ADR-SIMULACAO-COMPLETA-12-MESES — Simulação contábil e fiscal completa de 12 meses, com os dados do usuário e padrão realista

**Estado:** RATIFICADO. Dono, chat, 2026-11-21: *"Ratifico"*, em resposta a *"Ratifica o PRE-ADR da simulação completa?"*.
Os 8 forks foram respondidos na mesma data. A ratificação não autoriza código, a nota do nó nem o BRIEF do PR-0: cada um
pede autorização própria (ORCH-006).

**Ratificações (dono, AskUserQuestion, 2026-11-21):**

| Fork | Resposta do dono |
|---|---|
| F-SIM-1 | **(c) "Produto, página como protótipo"**: o motor do produto passa a aceitar o cenário informado (emenda à D8); a página fica congelada na versão `1795282000-2388` como protótipo e oráculo de regressão até a tela do produto existir |
| F-SIM-3 | **(c) "Em camadas"** |
| F-SIM-4 | **(b) "2027, com 2026 histórico"** |
| F-SIM-5 | **(b) "Núcleo neutro, SP primeiro"** |
| F-SIM-2 | **(a) "Não guarda por ora"**: sem estado nas etapas do motor; o `module-boundary-selector` roda antes da etapa que precisar salvar |
| F-SIM-6 | **(a) + (b) "Pesquisa + kit setorial"**: cada padrão de mercado com fonte citável, data e faixa; o kit do setor carrega os campos e os valores |
| F-SIM-7 | **(a) "Como faixa"** |
| F-SIM-8 | **"Depois da rodada"**: a rodada de texto em curso termina e publica; dali em diante a página só recebe correção de erro, e a versão congelada vira a base de conferência (substitui a versão `1795282000-2388` citada no F-SIM-1) |

**Próximo passo:**
1. O dono ratifica este PRE-ADR.
2. Vêm a nota do nó em `docs/plano/nos/` e o BRIEF do PR-0 (§6), cada um com autorização própria.
3. A ordem na régua F também é decisão do dono.
4. A pesquisa dos padrões de mercado (§7) pode rodar em paralelo, como dossiê de pesquisa legal e de mercado, sem código.
**Autorização:** dono, chat, 2026-11-21: *"Pode planejar"*. É a resposta à pergunta *"Autoriza eu escrever o plano da
simulação completa de 12 meses?"*. A autorização cobre só este plano: não autoriza código, edição do artefato nem nota de
nó. Pelo `docs/plano/README.md` (linha 77), a nota em `nos/` só nasce depois deste PRE-ADR ratificado.
**Direção do dono na mesma conversa (21/11):**
- *"O que queremos é que fique uma simulação completa, os dados realmente vão ser todos entregues pelo usuário"*, pedindo
  12 meses em vez de 1 mês com média, para o Real e o Presumido ficarem completos.
- *"melhor pedir, mas deixar um valor padrão realista"*, para o preenchimento não ficar infinito.

**Lacunas de origem:** `L-20261121-181921-ea2b` (o que o modelo não representa) e `L-20261121-181428-60ca` (padrão realista).
**Base congelada:** versão `1795282000-2388` do artefato `4T2JYWqnJXm9e6p2aUfDLu` (Simulador Tributário do Salão). A rodada
de revisão de texto em curso (16 lacunas `em-sessao`) não é replanejada aqui.

Graus: **V** = lido nesta sessão no código ou na norma; **V-dossiê** = lido em dossiê anterior, citado e não relido;
**I** = inferido; **L** = localizado (nome lido, corpo não lido).

---

## 1. Fatos

### 1.1 O simulador da página (artefato)
- **(V)** O motor da página (`cenario`, `regimes`, `anoMeses`) calcula um **mês típico**.
- **(V)** Só a receita varia ao longo do ano, pelo bloco "Meses do ano" (`x.meses.sv/rv`). Folha, despesas, compras,
  equipamentos e ajustes do LALUR são o mês da ficha repetido.
- **(V)** 13º, férias e rescisão entram como provisão de 1/12 ao mês.
- **(V)** Três coisas não passam de um período para o outro:
  - o crédito que sobra (`fecha()` zera base negativa);
  - o prejuízo de um trimestre, que não aumenta o saldo para o seguinte;
  - o caixa.
- **(V)** O DAS de 2026 bate no centavo com os exemplos 2 e 8 do manual do PGDAS-D. São 22 valores oficiais, conferidos por
  `pesquisas-legais/parecer-salao-sp-4-pessoas/artefatos/conferencia-pgdas-manual.js`.
- **(V)** A página tem regras que o produto não tem:
  - RAT × FAP e terceiros;
  - convenção coletiva (piso, adicional por tempo, cesta, benefícios);
  - parceria (Lei 12.592);
  - ICMS da revenda;
  - adições do LALUR;
  - DSR sobre comissão;
  - rescisão.
- **(V)** A página não tem duas coisas que o produto tem:
  - parâmetro legal com vigência (as alíquotas estão escritas no código);
  - dinheiro em centavos inteiros (usa `float`).

### 1.2 O motor do produto
- **(V)** `server/src/features/accounting/models/taxSimulation.ts:360`: `simularRegimeAno` faz 12 meses nos três regimes.
  - Usa `apurar` (Simples), `apurarPresumidoTrimestral`, `apurarRealTrimestral` e `apurarPisCofinsMensal`.
  - Os parâmetros vêm de `LinhaLegal`, com vigência.
  - **A entrada vem do razão de uma empresa real** (`TaxSimulationService.ts:231–277`: `receitaBrutaPorAtividade`,
    `resultadoAntesIrpjCsll`).
  - É a decisão **D8** do `ADR-INCR-EFICIENCIA-FISCAL`, linha 222: *"Simuladores são funções puras sobre o razão/subrazão"*.
    Nenhum simulador grava apuração (I-5).
- **(V)** O próprio simulador declara o que fica aproximado (linhas 364–385):
  - Real sem LALUR e sem compensação de prejuízo;
  - PIS/Cofins não cumulativo sem créditos;
  - sem RAT, FAP e terceiros;
  - sem ICMS;
  - CBS/IBS sem créditos.
- **(V)** As funções que ele chama aceitam bem mais do que recebem; o simulador passa esses campos vazios:
  - `EntradaPisCofins.saldoAnterior` (`OrigemSaldoAnterior`, `pisCofinsCalc.ts:65`);
  - `outrosCreditos` (energia, aluguel, depreciação);
  - `EntradaReal.linhasParteA` (`taxAssessmentCalc.ts:644`).
- **(L)** O Real anual tem funções próprias: `apurarEstimativaReceitaBruta` e `apurarBalancete`, em `taxAssessmentCalcAnual.ts`.
- **(L)** Há cálculo de folha em `server/src/features/dp/models/folha/`: INSS do empregado, FGTS, IRRF, afastamento, faltas
  e DSR perdido, adiantamento. O núcleo é "sempre ligado" (`dp/README.md`, F-DP-6). Os parâmetros da convenção vivem em
  `DpConvencaoParametro`.
- **(L)** O kit setorial `sectorKits/kits/beautySalon/kit.v6.ts` traz `serviceFiscalDefaults`.
- **(V)** `apurarRealTrimestral` recusa a apuração sem a Parte B do LALUR fechada (`taxAssessmentCalc.ts:659`). Um cenário
  simulado não tem LALUR gravado, então precisa de uma entrada própria.

### 1.3 Consequência (I)
A mesma lei está implementada duas vezes, e as duas versões divergem nos dois sentidos. Pelo critério de reuso da casa
(`.claude/skills/_REUSE-CRITERION.md`: mesmo objeto de domínio, vivo dos dois lados), essa é a situação que pede uma
implementação só.

---

## 2. Forks — todos RATIFICAÇÃO PENDENTE

### F-SIM-1 — Onde a simulação vive *(decide o resto do documento)*
| Caminho | O que é | O que deixa aberto |
|---|---|---|
| **(a) A página cresce** | O motor continua em JS dentro do HTML, com 12 meses de tudo, saldos e caixa | Duas implementações da lei, que divergem mais a cada incremento. Alíquota sem vigência. `float`. Não importa documento do usuário |
| **(b) Motor do produto, cenário informado** | Emenda à D8: o simulador aceita o razão **ou** um cenário informado pelo usuário. O cenário roda as funções puras do produto (`simplesCalc`, `taxAssessmentCalc*`, `pisCofinsCalc`, `dp/models/folha`), sem gravar nada (I-5). A página vira a tela do produto (`FE-INCR-*`) | É o trabalho maior, e a ordem da régua F muda. Os gaps declarados do produto (§1.2) precisam ser fechados no produto |
| **(c) Híbrido** | (b), com a página congelada na versão `1795282000-2388` como protótipo e oráculo de regressão até a tela do produto existir | O custo de manter a página até a troca |

**Recomendação: (b), em etapas, com a página tratada como em (c) durante a transição.**
- É a opção estrutural: a lei vive num lugar só, a camada dona (`features/accounting`, `features/dp`).
- O produto já aceita saldo credor, créditos e Parte A, e tem parâmetro com vigência.
- O cenário pode depois virar onboarding: o salão simulado é o salão que entra no produto.
- A versão incremental é o PR-0 de contrato (§6). O que a página tem e o produto não tem (§1.1) entra como regra do
  produto, com o dossiê que a página já cita.

### F-SIM-2 — O cenário fica guardado?
| Caminho | Observação |
|---|---|
| (a) Não persiste: requisição sem estado, o cliente guarda o cenário | Mais simples; não serve para comparar versões nem para retomar depois |
| (b) DynamicTable | O esquema do cenário é nosso e fixo, não desenhado pelo usuário: não bate com o critério do ADR-PERSISTENCE-BOUNDARY §2.1 |
| (c) Prisma first-class (`SimulacaoCenario`: payload versionado + `parametrosSha256`) | Precisa justificar pelo §2.1 (a lei não desenha o cenário) ou por uma emenda ao ADR |

**Recomendação:** (a) nas etapas de motor. Rodar o `module-boundary-selector` antes da etapa que precisar guardar.

### F-SIM-3 — Quanto o usuário precisa digitar
| Caminho | O que é |
|---|---|
| (a) 12 meses por categoria | Uma grade de meses × categorias |
| (b) Eventos com data | Cada venda, compra, folha e retirada |
| **(c) Em camadas** | Mês típico + sazonalidade → mês a mês por categoria → evento. Toda camada nasce com padrão, e o usuário desce só onde quiser |

**Recomendação:** (c). É a regra do dono, "pedir, mas deixar um valor padrão realista".

### F-SIM-4 — Anos cobertos
| Caminho | O que é |
|---|---|
| (a) Só 2027 | — |
| **(b) 2027 com 2026 como histórico** | 2026 entra só como RBT12, ano anterior e posição de abertura |
| (c) 2026 a 2033 | Inclui a transição do ISS e do ICMS |

**Recomendação:** (b) agora e (c) em etapa própria.
- O produto entra no ar em 2027, e regra que vale só em 2026 não tem cliente.
- 2027 não tem oráculo (manual do PGDAS-D de 2027 e alíquota da CBS); vai para o §4.

### F-SIM-5 — Alcance de empresa
| Caminho | O que é |
|---|---|
| (a) Só o salão de SP capital | — |
| **(b) Núcleo neutro + SP primeiro** | Município, UF, convenção e setor viram parâmetro, na borda. Depois: outros municípios, MEI, filial, clínica estética |
| (c) Tudo de uma vez | — |

**Recomendação:** (b). Completude em etapas, com o país e o município na borda.

### F-SIM-6 — De onde vem o padrão realista
| Caminho | O que é |
|---|---|
| (a) Pesquisa de mercado com fonte citável | Cada padrão leva fonte, data e faixa |
| (b) O kit setorial carrega os padrões | O kit diz o quê; o número vem de (a) |
| (c) Só padrões de lei e de convenção | O de mercado fica vazio |

**Recomendação:** (a) + (b). Nenhum número de mercado entra sem fonte (§5).

### F-SIM-7 — Faixa quando o resultado depende de padrão
| Caminho | O que é |
|---|---|
| **(a) Faixa da fonte** | O padrão traz mínimo e máximo; o resultado sai como faixa sempre que um campo de peso alto é padrão |
| (b) Número único com o percentual de proveniência | — |

**Recomendação:** (a).

### F-SIM-8 — O que acontece com a página
| Caminho | O que é |
|---|---|
| **(a) Congelar** | Fechar a rodada de revisão em curso e, depois dela, só correção. Funcionalidade nova vai para o produto |
| (b) Seguir as duas em paralelo | — |

**Recomendação:** (a). Vale se F-SIM-1 for (b) ou (c).

---

## 3. Checklist candidato

Cada item vale para qualquer resposta de F-SIM-1, salvo onde marcado. Item sem norma citada está no §4, não aqui.

1. **Contrato do cenário** (§5.1) em Zod `.strict()`, com dinheiro em centavos inteiros e um `Valor` com proveniência em
   cada campo.
2. **Proveniência:** cada valor é `PADRAO`, `ESTIMADO` ou `REAL` e leva a sua fonte. A saída traz quanto do resultado vem
   de cada estado, por regime.
3. **Derivação em camadas (F-SIM-3):**
   - os 12 meses saem do mês típico × sazonalidade, até o usuário abrir mês a mês;
   - o 13º sai do cadastro da equipe, na data da lei: adiantamento de fevereiro a novembro e saldo até 20/12 (Lei 4.749
     arts. 1º e 2º, V-dossiê `folha-contabil-2026-10-22`);
   - as férias saem do período aquisitivo (CLT art. 129 [D06 do parecer]); o terço constitucional está no §4.
4. **Sensibilidade:** ordena os campos pelo efeito no resultado daquele cenário, variando cada um dentro da faixa do
   padrão. A tela pede primeiro os de maior efeito.
5. **Faixa (F-SIM-7):** com campo de peso alto em `PADRAO`, o resultado de cada regime sai como mínimo e máximo.
6. **Saldo credor de PIS/Cofins transportado** de um mês para o outro: *"O crédito não aproveitado em determinado mês poderá
   sê-lo nos meses subseqüentes"* (Lei 10.833 art. 3º § 4º [D23 do parecer], V). No produto, `saldoAnterior`.
7. **Prejuízo fiscal e base negativa acumulados** entre períodos, com a trava de 30% (Lei 9.065 arts. 15 e 16, V-dossiê
   `verif-2026-10-17-irpj-csll`). O prejuízo de um período soma ao saldo do seguinte.
8. **Apuração no período real de cada tributo:**
   - DAS mensal;
   - IRPJ e CSLL trimestrais, ou anuais por estimativa ou balancete (Lei 9.430 arts. 1º, 2º e 6º e Lei 8.981 art. 35,
     citados no artefato; no produto, `taxAssessmentCalc*`);
   - PIS e Cofins mensais até 2026;
   - ICMS da revenda mensal, não cumulativo (Lei SP 6.374 arts. 34 e 36, citados no artefato);
   - CBS e IBS mensais em 2027.
9. **LALUR do cenário:** adições e exclusões informadas mês a mês. No produto (F-SIM-1 b), uma entrada de simulação no lugar
   de `parteBFechada` e `linhasParteA`, sem tocar a pré-condição da apuração real.
10. **Folha por pessoa, mês a mês, com eventos:** admissão, demissão, férias gozadas, 13º, comissão, DSR e adicional por tempo
    de serviço. Usa as regras que a página já cita (CCT SP006651/2026; TST Súmula 27; Lei 8.212 art. 28 §§ 7º e 9º).
    Hora extra, insalubridade e afastamento estão no §4.
11. **Encargos fora do DAS por período:** INSS patronal, RAT × FAP e terceiros sobre a folha do mês, com 13º e férias na
    competência em que são pagos (Lei 8.212 arts. 22 e 28, citados no artefato).
12. **Posição de abertura:**
    - caixa, contas a receber, estoque, imobilizado com data e vida útil, dívidas e tributos a pagar;
    - prejuízo fiscal e base negativa, saldos credores;
    - receita dos 12 meses anteriores.
13. **Caixa mês a mês:** entradas pelo prazo de cada forma de pagamento, informado com padrão; saídas na data de vencimento
    de cada tributo e encargo, pelos prazos que a página já cita (DAS dia 20, Res. CGSN 140 art. 40; ISS dia 10, Decreto SP
    53.151; e os demais do calendário da aba 6). Mais saldo, empréstimo e retirada do sócio.
14. **Patrimônio:** os movimentos do cenário viram lançamentos em memória, sem gravar (I-5). Deles saem DRE, balanço e
    demonstração de lucros acumulados, pela NBC TG 1002 [D16 do parecer]. No produto, reusar o plano de contas e a forma de
    lançamento sem chamar `postEntry`.
15. **Obrigações derivadas:** o calendário passa a ser derivado dos eventos do cenário, não fixo.
16. **Oráculo de regressão:** os exemplos 2 e 8 do manual do PGDAS-D (`conferencia-pgdas-manual.js`) passam a rodar contra
    o motor escolhido; a ficha de exemplo da página congelada vira caso de regressão.
17. **(Só F-SIM-1 b) Rota e camadas:** `GET/POST /accounting/simulacoes/cenario` → Controller → `CenarioSimulacaoService` →
    funções puras. Factory, DTO no snapshot de shape, i18n pt/en, path-count do openapi e `check:arch`.

---

## 4. Pendente de validação externa

- **Folha:**
  - adicional de hora extra (CF art. 7º XVI; CLT art. 59);
  - insalubridade (CLT arts. 189–192; NR-15);
  - afastamento e os 15 dias pagos pela empresa (Lei 8.213 art. 60 § 3º);
  - terço de férias (CF art. 7º XVII).
  
  Nada disso foi baixado para este dossiê.
- **FGTS Digital:** prazo e forma de recolhimento (só V-dossiê).
- **Saldo credor de CBS e IBS em 2027:** compensação e ressarcimento (LC 214), não lidos.
- **Saldo credor de PIS/Cofins depois da extinção em 01/01/2027** (LC 214 art. 542): regra de transição não lida.
- **2027:** opção pelo regime regular, com prazos que divergem (`7064`, com o dono); partilha do Anexo XX a 100,01%
  (`a3a5`, com o dono); alíquota de referência da CBS (DRAFT, LC 214 art. 349 I); manual do PGDAS-D de 2027 inexistente.
- **Terceiros:** enquadramento FPAS 515 (`c574`, com o dono).
- **Estética e massagem:** subitens 6.02 e 6.03 no Anexo III sem fator r (`f821`).
- **Qualquer mês real** de salão como oráculo (`2c8a`, com o dono: "Ainda não").

## 5. Contratos esboçados

### 5.1 Entrada
```ts
const Origem = z.enum(['PADRAO', 'ESTIMADO', 'REAL']);
const Valor = z.object({
  cents: z.string().regex(/^-?\d+$/),           // BigInt serializado
  origem: Origem,
  fonte: z.string().nullable(),                 // obrigatória quando origem = 'PADRAO'
  faixa: z.tuple([z.string(), z.string()]).nullable(),
}).strict();
const Competencia = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const CenarioEntrada = z.object({
  versao: z.literal(1),
  perfil: z.object({
    uf: z.string().length(2), municipioIbge: z.string().length(7), cnae: z.string(),
    regimes: z.array(z.enum(['SIMPLES', 'SIMPLES_IBS_CBS_REGULAR', 'PRESUMIDO', 'REAL_TRIMESTRAL', 'REAL_ESTIMATIVA', 'REAL_BALANCETE'])),
    inicioAtividade: Competencia.nullable(), ano: z.number().int(),
  }).strict(),
  abertura: z.object({
    caixa: Valor, aReceber: Valor, estoque: Valor,
    imobilizado: z.array(z.object({ nome: z.string(), custo: Valor, aquisicao: Competencia, vidaUtilMeses: z.number().int() }).strict()),
    dividas: z.array(z.object({ saldo: Valor, taxaMensalBp: z.number().int(), parcelas: z.number().int() }).strict()),
    tributosAPagar: z.array(z.object({ tributo: z.string(), valor: Valor, vencimento: z.string() }).strict()),
    prejuizoFiscal: Valor, baseNegativaCsll: Valor,
    saldoCredor: z.object({ pis: Valor, cofins: Valor, icms: Valor, cbs: Valor, ibs: Valor }).strict(),
    receitaMesesAnteriores: z.array(z.object({ competencia: Competencia, receita: Valor, folha: Valor }).strict()).max(24),
  }).strict(),
  cadastros: z.object({
    equipe: z.array(z.object({ id: z.string(), funcao: z.string(), vinculo: z.enum(['CLT', 'PARCEIRO', 'SOCIO']), salario: Valor, comissaoBp: z.number().int(), admissao: Competencia, cnpj: z.boolean().nullable() }).strict()),
    servicos: z.array(z.object({ id: z.string(), cTribNac: z.string(), preco: Valor, insumoPorAtendimento: Valor, profissionalId: z.string().nullable() }).strict()),
    produtos: z.array(z.object({ id: z.string(), ncm: z.string(), preco: Valor, custo: Valor }).strict()),
  }).strict(),
  tipico: z.object({                            // camada 1 (F-SIM-3): o mês típico, com padrão
    atendimentosPorServico: z.record(z.string(), Valor), vendasPorProduto: z.record(z.string(), Valor),
    despesas: z.array(z.object({ nome: z.string(), valor: Valor, daCredito: z.boolean() }).strict()),
    formasPagamento: z.object({ pix: Valor, dinheiro: Valor, debito: Valor, credito: Valor, creditoParcelado: Valor }).strict(), // em bp da receita
    prazoRecebimentoDias: z.object({ debito: Valor, credito: Valor, creditoParcelado: Valor }).strict(),
    taxaCartaoBp: Valor,
  }).strict(),
  sazonalidadeBp: z.array(z.number().int()).length(12).nullable(), // camada 1
  meses: z.array(z.object({                     // camada 2: só o que o usuário abriu; o resto vem do típico × sazonalidade
    competencia: Competencia,
    receitaServico: Valor.optional(), receitaRevenda: Valor.optional(),
    compras: z.object({ insumo: Valor, revenda: Valor, usoConsumo: Valor }).partial().strict().optional(),
    despesas: z.array(z.object({ nome: z.string(), valor: Valor, daCredito: z.boolean() }).strict()).optional(),
    lalur: z.array(z.object({ codigo: z.string(), tipo: z.enum(['A', 'E']), valor: Valor, soIrpj: z.boolean() }).strict()).optional(),
  }).strict()).max(12),
  eventos: z.array(z.discriminatedUnion('tipo', [      // camada 3
    z.object({ tipo: z.literal('ADMISSAO'), data: z.string(), pessoaId: z.string() }).strict(),
    z.object({ tipo: z.literal('DEMISSAO'), data: z.string(), pessoaId: z.string(), motivo: z.enum(['SEM_JUSTA_CAUSA', 'PEDIDO', 'JUSTA_CAUSA', 'ACORDO']) }).strict(),
    z.object({ tipo: z.literal('FERIAS'), inicio: z.string(), dias: z.number().int(), pessoaId: z.string() }).strict(),
    z.object({ tipo: z.literal('COMPRA_IMOBILIZADO'), data: z.string(), nome: z.string(), custo: Valor, vidaUtilMeses: z.number().int() }).strict(),
    z.object({ tipo: z.literal('EMPRESTIMO'), data: z.string(), valor: Valor, taxaMensalBp: z.number().int(), parcelas: z.number().int() }).strict(),
    z.object({ tipo: z.literal('RETIRADA_SOCIO'), data: z.string(), socioId: z.string(), valor: Valor, natureza: z.enum(['PRO_LABORE', 'DIVIDENDO']) }).strict(),
  ])),
}).strict();
```

### 5.2 Saída
```ts
const LinhaTributo = z.object({ tributo: z.string(), periodo: z.string(), baseCents: z.string(), devidoCents: z.string(), vencimento: z.string(), fonte: z.string() }).strict();
const CenarioSaida = z.object({
  ano: z.number().int(),
  regimes: z.array(z.object({
    regime: z.string(), disponivel: z.boolean(), motivoIndisponivel: z.string().nullable(),
    meses: z.array(z.object({
      competencia: z.string(), receitaCents: z.string(), tributos: z.array(LinhaTributo), folhaCents: z.string(), resultadoCents: z.string(),
      caixa: z.object({ entradasCents: z.string(), saidasCents: z.string(), saldoCents: z.string() }).strict(),
      saldosTransportados: z.object({ pis: z.string(), cofins: z.string(), icms: z.string(), cbs: z.string(), ibs: z.string(), prejuizoFiscal: z.string(), baseNegativa: z.string() }).strict(),
    }).strict()).length(12),
    ano: z.object({ cargaCents: z.string(), faixaCargaCents: z.tuple([z.string(), z.string()]).nullable(), dre: z.array(z.object({ conta: z.string(), cents: z.string() }).strict()), balanco: z.array(z.object({ conta: z.string(), cents: z.string() }).strict()) }).strict(),
  }).strict()),
  proveniencia: z.object({ padraoBp: z.number().int(), estimadoBp: z.number().int(), realBp: z.number().int() }).strict(),
  sensibilidade: z.array(z.object({ campo: z.string(), efeitoCents: z.string() }).strict()),
  obrigacoes: z.array(z.object({ data: z.string(), obrigacao: z.string(), fonte: z.string() }).strict()),
  avisos: z.array(z.string()),
  parametrosSha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
```

## 6. Sequência incremental (se F-SIM-1 = b)

| PR | Conteúdo |
|---|---|
| PR-0 | Emenda à D8 do `ADR-INCR-EFICIENCIA-FISCAL` (o cenário informado como entrada) + contrato §5 em Zod + snapshot de shape. Sem lógica |
| PR-1 | Motor de 12 meses sobre o cenário: Simples, Presumido e Real (trimestral, estimativa, balancete), com os saldos transportados (itens 6–9) |
| PR-2 | Folha por pessoa e por evento pelo `dp/models/folha` + encargos fora do DAS (itens 10–11), com as regras da página que o produto não tem |
| PR-3 | Revenda fora do Simples (ICMS) e créditos (Lei 10.833 art. 3º; LC 214 art. 47) |
| PR-4 | Caixa (item 13) e patrimônio em memória (item 14) |
| PR-5 | Camadas, padrões com fonte, proveniência, sensibilidade e faixa (itens 2–5); depende do §7 |
| PR-6 | Importação de documentos (extrato do PGDAS-D, maquininha, XML da NFS-e, folha) |
| FE-INCR | Tela do cenário no produto, no lugar da página |

## 7. Insumos ausentes

- **Padrões de mercado:** insumo por serviço, taxa de cartão, mix de formas de pagamento, sazonalidade, rotatividade,
  ticket. Nenhum número foi pesquisado; nenhum entra sem fonte (F-SIM-6).
- **Formatos de importação** do extrato do PGDAS-D e dos arquivos das adquirentes: não lidos.
- **Corpo das funções** de `dp/models/folha/`, `taxAssessmentCalcAnual.ts` e `simplesCalc.apurar`: localizados, não lidos.
  Ler antes do PR-1 e do PR-2.
- **Conteúdo de `serviceFiscalDefaults`** do kit do salão: não lido.

## 8. Lacunas abertas no simulador e o destino de cada uma

| Destino | Lacunas |
|---|---|
| Entram neste plano | `ea2b`, `60ca` (origem); `3f49` (revenda fora do Simples → PR-3); `38c0` (ICMS no Simples impedido → PR-3); `bbc7` (monofásico no DAS, ano 2026 → F-SIM-4); `445d` (Presumido morto no `cenario()`); `967b` (convenção do crédito de 2027 → PR-3); `883f` (estabilidades na rescisão → PR-2); `4f10` e `7c15` (prazos do ICMS → item 13) |
| Ficam na rodada de texto da página (`em-sessao`) | `8890`, `3c1b`, `d3bf`, `693c`, `fe42`, `a600`, `7ebe`, `2945`, `38c6`, `ee62`, `079e`, `add7`, `db88`, `b9d2`, `c365`, `300d` |
| Com o dono | `7064`, `a3a5`, `c574`, `2c8a`, `ca7a` |
| Pesquisa já pedida, entra quando chegar | `f821`, `f88e`, `0952`, `ec55`, `4f67`, `6aa2`, `43d7`, `e9c8`, `37f3`, `bfa2`, `368c` |
| Fora deste plano | `4e7d` (dossiê duplicado), `dce7` (PR #1309), `a579` (KPI a 375 px), `59df` (acervo), `99cc` (cópia do repo atrás) |

## 9. Achados fora de escopo

- O simulador de regime do produto (`taxSimulation.ts:364–385`) subestima o Presumido e o Real (sem RAT, FAP e terceiros)
  e superestima o Real (sem créditos), por decisão registrada (`D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO`, decisão 3: "carga completa, com avisos"). Na
  caixa como `L-20261121-184437-b34e`. Se F-SIM-1 for (b), o PR-1 e o PR-3 fecham a lacuna.

## 10. Write-set (rascunho, só se F-SIM-1 = b)

- **Editar:** `docs/adr/ADR-INCR-EFICIENCIA-FISCAL.md` (emenda D8); `server/src/features/accounting/models/taxSimulation.ts`.
- **Criar:**
  - `server/src/features/accounting/models/cenarioSimulacao*.ts`;
  - `server/src/features/accounting/dtos/CenarioSimulacaoDto.ts`;
  - `server/src/features/accounting/services/CenarioSimulacaoService.ts`;
  - `server/src/controllers/cenarioSimulacaoController.ts`;
  - testes ao lado de cada arquivo.
- **Registros (PAR-001):** `server/src/lib/factory.ts`, `server/src/routes/accounting.ts`,
  `server/src/routes/docs/accounting.tax-simulation.paths.ts`, `server/src/routes/docs.paths.ts`, `server/public/openapi.json`,
  o snapshot de shape dos DTOs e `my-app/types/contracts/accounting/*.gen.ts`.
