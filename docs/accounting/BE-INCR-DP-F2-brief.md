# BE-INCR-DP-F2 — DP, núcleo: motor mensal da folha (F2) (BRIEF, nó PES-4)

> **Sessão:** `sessao-planejamento`. Produz decisão, não código.
> **Autorização (dono, chat, 2026-11-05):** *"Sim, planeja o F2"*, em resposta a "Abro a sessão de planejamento do BRIEF
> do F2 (só o BRIEF, sem código)?". Cobre **este** BRIEF (fase F2 da spec §11, motor mensal) e a linha dele na nota do
> nó [`PES-4`](../plano/nos/PES-4.md). **Não** cobre código: o `executa` do F2 pede autorização nova
> ([[D-2026-10-28-FLUXO-AUTONOMO]]; ORCH-006). Não cobre F3..F6, o BRIEF do SST nem a ponte contábil (F-FOL-1..9).
> **Passo 1 (a autorização cobre o item?):** cobre exatamente. A nota do nó (estado de 04/11) diz "Próximo: BRIEF do F2
> (sessão de planejamento)". Sem divergência.
> **Insumos:** [`PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md`](../adr/PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md) (Accepted, F-DP-1..14);
> [`BE-INCR-DP-F0-F1-brief.md`](BE-INCR-DP-F0-F1-brief.md) §7 (encaixes do F2); a spec externa
> [`SPEC-DP-2026-10-31-katz.md`](../dp/SPEC-DP-2026-10-31-katz.md) §6, §10 e §11 (insumo, não decisão);
> [`PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md`](PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md) F-PES-7/8/9/13; a régua
> [`APRENDIZADOS-TESTES-2026-11-04.md`](../operating-manual/APRENDIZADOS-TESTES-2026-11-04.md) (A1–A8); o código do F0+F1
> em `origin/main` `fe5a2d76` (re-fetch 05/11).
> **Escopo:** backend. O FE é nó vizinho (holerite e tela da folha, a abrir).
> **Dossiê legal:** [`pesquisas-legais/brief-pes4-f2/relatorio.md`](../../pesquisas-legais/brief-pes4-f2/relatorio.md).
> As referências [Dnn] abaixo são dele; [F1-Dnn] são do dossiê do F0+F1 (`pesquisas-legais/brief-pes4-f0-f1/`).

## TLDR (2 linhas)

O F2 calcula a folha **mensal** e o **adiantamento** de cada vínculo do núcleo (101, 103, 901, 723), como função pura
sobre um snapshot guardado inteiro e com hash, com prova de cálculo e resultado imutável. Entram junto os dependentes e os
lançamentos informados (horas extras, noturno, comissão, faltas), porque sem eles o holerite do horista e do
comissionista não fecha. **Risco principal:** a **EC 141/2026** (DOU 16/10/2026) muda a jornada máxima para 42 h em
16/12/2026 e para 40 h em 16/12/2027, e dá **2 dias de repouso semanal remunerado** a partir de 16/12/2026. O divisor do
salário-hora e o DSR depois dela não têm regra lida (F-DPF-1). Nada do F2 vale como folha sem o golden conferido pelo
contador.

---

## 0. Fatos consumados que este BRIEF respeita (lidos nesta sessão)

Grau **V** = lido no arquivo ou na fonte citada, em `origin/main` `fe5a2d76`.

| # | Fato | Onde |
|---|---|---|
| G1 | Núcleo numa feature só, `features/dp/` (D-1 do F0+F1); trava `D1` no `check:arch`: o núcleo não importa opcional | `features/dp/`; `.dependency-cruiser.cjs` |
| G2 | `parametrosFolha(fotografia, data)` devolve faixas do INSS do empregado, teto, `fgtsBp`, `fgtsAprendizBp`, `ciSeguradoBp`, `patronalBp`, salário mínimo e o IRRF (faixas, redução do art. 3º-A, dependente, desconto simplificado); tabela ausente ⇒ `ParametroLegalAusenteError` | `features/dp/models/parametrosFolha.ts` |
| G3 | `calcularIrrfPf(rendimento, {rendimentoMesAntes, retidoMesAntes, dependentes, previdencia, pensao}, tabela, data)` já faz a base, o desconto simplificado quando maior, a redução do art. 3º-A, a soma no mês e a dispensa `MINIMO_R10` | `features/accounting/models/withholdingCalc.ts:111` |
| G4 | Catálogo fechado de 6 rubricas (`SALARIO_BASE`, `BOLSA_ESTAGIO`, `PRO_LABORE`, `INSS_SEGURADO`, `IRRF`, `FGTS_MES`), `calculo` ∈ `CONTRATUAL·LEGAL·INFORMADO`; `published.json` congela `{codigo, natureza, incidencia}`; `RUBRICAS_CONFERIDAS_PELO_CONTADOR = false` | `features/dp/models/rubricas/catalogo.ts` |
| G5 | `vinculoNaData(vinculo, data)` resolve a versão vigente com lotação, cargo, jornada e sindicato; versões contínuas, sem sobreposição | `features/dp/models/vinculo.ts:127` |
| G6 | `DpVinculoVersao.salarioCents` (BigInt) + `unidadeSalario` (domínio `undSalFixo` do S-2200); `DpJornada.minutosSemanais` + `tipoJornada`; jornada referenciada trava esses campos (D-5) | `schema.prisma:3805, 3931` |
| G7 | `parametroCctVigente`; `CCT_CHAVES = ['PISO_SALARIAL_CENTS']` (discriminador = `cargoId`) | `features/dp/models/cadastros.ts:28` |
| G8 | `DpAfastamento {motivo (Tabela 18), inicio, fim?}` sem dado clínico; `DpFeriasImplantacao` só para saldo vindo de outro sistema (não há gozo de férias no F1) | `schema.prisma:3956, 3974` |
| G9 | Porta `JORNADA_APURADA` com `NullJornadaApurada`; `JornadaApuradaItem = never` ("o formato nasce no BRIEF do F2") | `features/dp/ports/JornadaApuradaPort.ts` |
| G10 | `DpPortResolver` escolhe adaptador pelos módulos ativos na competência; `DpModuloAtivacao` por competência | `features/dp/ports/DpPortResolver.ts` |
| G11 | `DP_ERROR_REASONS` fechado; `dpValidationError`/`dpConflictError` com `reason` | `features/dp/models/erros.ts` |
| G12 | Eventos `dp.*` na `PAYLOAD_ALLOWLIST`, sem PII; trabalhador e correções com hash HMAC (`DP_AUDIT_KEYRING`) | `accounting/audit/auditCanonical.ts:417`; `vinculo.ts:96` |
| G13 | 34 rotas em `routes/dp.ts`; `BASELINE` do `openapi-paths.test.ts` congelado (dono, 16/10); paths novos entram só por `/api/dp/*` copiado do gerado | `routes/dp.ts`; nota do nó, "Armadilhas" |
| G14 | Model novo com `userId` reprova o `accountingResetClassification.test.ts` até ser classificado (nasce BLOCKING) e entra no `resetDb()` em ordem de FK | nota do nó, "Armadilhas" |
| G15 | `fast-check` disponível no `jest` | `server/package.json` |

**Lei (dossiê `brief-pes4-f2`, V):** Lei 605/1949 arts. 6º e 7º [D01]; CLT arts. 58, 59, 64, 73, 78, 428 § 2º, 457,
459, 462 [D02]; Lei 8.213 arts. 60 § 3º, 65, 66, 68 [D03]; Lei 9.250 art. 4º [D05]; Lei 7.713 art. 7º [D06]; Lei 9.430
art. 67 [D07]; Lei 11.788 art. 12 [D08]; Dec. 10.854/2021 arts. 157 e 158 [D10]; **EC 141/2026** [D12]; Súmulas TST 27,
172, 340 e 431 [D13–D16]. Do F0+F1: EC 103 art. 28 [F1-D01/D06], tabela do INSS de 2026 [F1-D07], Lei 8.212 arts. 12 e
28 [F1-D02], Lei 8.036 art. 15 [F1-D04], CF art. 7º [F1-D12].

---

## 1. Divisão em PRs (o `executa`, quando vier, vale para o BRIEF inteiro; merge na ordem)

| PR | Conteúdo | Itens | Muda comportamento? |
|---|---|---|---|
| **PR-0** | Calculadoras legais puras e o nó de prova | 1–12 | Não (só funções puras) |
| **PR-1** | Dependentes, lançamentos informados e o formato do `JornadaApuradaItem` | 13–22 | Sim: rotas novas |
| **PR-2** | Rubricas do F2 no catálogo | 23–26 | Sim: `GET /dp/rubricas` devolve mais linhas |
| **PR-3** | Snapshot (montagem, forma canônica, hash) e fatiamento | 27–33 | Não (serviço sem rota) |
| **PR-4** | Motor: roteiros `MENSAL` e `ADIANTAMENTO`, pendências e goldens | 34–47 | Não (função pura) |
| **PR-5** | Folha, execução e resultado persistidos; rotas de cálculo e holerite | 48–58 | Sim |
| **PR-6** | Seed de cenário DP e testes pela HTTP (régua A3, A4, A6, A7, A8) | 59–64 | Não (só teste e seed) |

---

## 2. Checklist de comportamentos (cada um testável isoladamente)

Convenções do F2: dinheiro em centavos `bigint`; minutos em `number` inteiro; taxas em basis points (`bp`, 10 000 = 100%).
**Nenhum valor intermediário arredonda**: as calculadoras trabalham em frações exatas (`{num, den}` em `bigint`) e
arredondam **só** no ponto que o item declara (spec §5, "arredondamento só no ponto declarado pela regra"). O modo de
arredondamento é meio-para-cima ao centavo, salvo F-DPF-3.

### PR-0 — calculadoras legais puras (`features/dp/models/folha/`)

1. **`CalcNode`** = `{ rotulo, valorCents: bigint, fonte?: string, filhos: CalcNode[] }`. `fonte` é o artigo ou o id da
   linha de `LegalParameter` (ex.: `"CLT art. 64"`, `"LP:<id>"`). Toda calculadora devolve `{ valor, prova: CalcNode }`.
   Teste: a soma dos filhos marcados `soma: true` bate com o pai.
2. **`Fracao`** exata (`bigint` num/den, normalizada) com `arredondarCentavos(f, modo)`; propriedade (fast-check):
   `arredondar(a)+arredondar(b)` difere de `arredondar(a+b)` em no máximo 1 centavo; nenhuma operação usa `number`.
3. **`salarioHora(salarioMensalCents, minutosSemanais, regraDivisor)`** — o divisor sai de F-DPF-1. Até a ratificação, o
   executor implementa só a forma **parametrizada** (`regraDivisor` recebido de fora) e o teste cobre as duas leituras
   do F-DPF-1 com 44 h (220), 42 h e 40 h. CLT art. 64 [D02].
4. **`proporcionalMensalista(salarioCents, diasNoMes, diasDevidos)`** — base de 30 dias (Lei 605 art. 7º § 2º [D01];
   Dec. 10.854 art. 157 § 2º [D10]); a contagem de `diasDevidos` na admissão e no término sai do F-DPF-4.
5. **`inssEmpregado(baseCents, faixas, tetoCents, jaContribuidoCents)`** — progressivo por faixa (EC 103 art. 28 § 1º
   [F1-D01]), base limitada ao teto descontado o que já contribuiu em outros vínculos da competência (item 41); prova com
   um filho por faixa. Arredondamento: F-DPF-3.
6. **`inssContribuinteIndividual(baseCents, aliquotaBp, tetoCents, jaContribuidoCents)`** — 11% do pró-labore até o teto
   (`ciSeguradoBp`, G2; Lei 8.212 art. 28 III [F1-D02]; Lei 10.666 [F1-D03]).
7. **`fgts(baseCents, bp)`** — `fgtsBp` (8%) ou `fgtsAprendizBp` (2%) pela categoria (Lei 8.036 art. 15 e § 7º [F1-D04]).
8. **`irrfMensal(...)`** — **reusa** `calcularIrrfPf` (G3; `_REUSE-CRITERION`: mesmo objeto, a retenção de PF, vivo nos
   dois lados). O adaptador só monta a entrada: rendimento = base IRRF das rubricas; `previdenciaCents` = INSS do mês;
   `pensaoCents` = 0 no F2 (pensão é F3); `dependentes` do item 14; `rendimentoMesAntes`/`retidoMesAntes` = o que a
   mesma fonte já pagou no mês de pagamento (Lei 7.713 art. 7º § 1º [D06]). **A tabela é a da data de pagamento**, não a
   da competência (mesmo artigo: "por ocasião de cada pagamento"). Dispensa ≤ R$ 10 já vem do G3 (Lei 9.430 art. 67 [D07]).
9. **`horaExtra(salarioHoraCents, minutos, adicionalBp)`** — adicional ≥ 50% (CLT art. 59 § 1º [D02]); a rubrica de
   100% (domingo ou feriado trabalhado sem folga) por Lei 605 art. 9º [D01]. Adicional maior por CCT: §5.
10. **`adicionalNoturno(salarioHoraCents, minutosRelogio, adicionalBp)`** — converte minutos de relógio em horas
    noturnas de 52'30" (× 60/52,5) e aplica ≥ 20% (CLT art. 73 caput e § 1º [D02]). A janela 22h–5h é do lançamento,
    não do motor (o motor recebe os minutos já classificados).
11. **`dsrSobreVariaveis(variaveisCents, diasUteis, diasRepouso)`** — `variaveis ÷ diasUteis × diasRepouso`; base legal
    Lei 605 art. 7º "a"/"b" [D01], Súm. 172 (horas extras habituais) [D14] e Súm. 27 (comissionista) [D13]. **A contagem
    de `diasUteis` e `diasRepouso` sai do F-DPF-2** (sábado; 2 dias de repouso depois de 16/12/2026).
12. **`complementoMinimo(remuneracaoCents, minimoCents)`** — `max(0, mínimo − remuneração)`, sem desconto em mês
    seguinte (CLT art. 78 parágrafo único [D02]; CF art. 7º VII [F1-D12]). O mínimo de referência: salário mínimo
    nacional (G2), mínimo-hora do aprendiz (CLT art. 428 § 2º [D02]) ou piso da CCT (G7); a proporcionalidade do piso à
    jornada sai do F-DPF-6.

### PR-1 — dependentes, lançamentos informados e jornada apurada

13. **`DpDependente`** (Prisma, sem `userId`: a posse vem do trabalhador, como a versão do vínculo): `trabalhadorId`,
    `nome` (PII), `cpf?` (PII), `nascimento` (PII), `tipo` (Tabela 07 do eSocial, transcrita como `LegalParameter`
    `ESOCIAL_TIPO_DEPENDENTE` no padrão do D-8 do F0+F1), `deduzIrrf: boolean`, `salarioFamilia: boolean`,
    `vigenteDesde`/`vigenteAte`. Soft-delete. PII fora da auditoria (G12).
14. **`dependentesIrrfNaData(dependentes, data)`** puro: conta os vigentes com `deduzIrrf` (Lei 9.250 art. 4º III [D05]).
    O valor por dependente vem do G2, não do código.
15. **Dependente de salário-família:** o campo existe e é validado (filho ou equiparado até 14 anos, ou inválido; Lei
    8.213 art. 66 [D03]), mas **o cálculo da cota não entra** até a fonte da cota de 2026 (§5; F-DPF-7).
16. **`DpLancamento`** (fato de entrada, spec §5 `lancamento`): `vinculoId`, `competencia` (`AAAA-MM`), `rubrica`
    (código do catálogo com `calculo = INFORMADO`), `quantidadeMin?` (minutos) **ou** `valorCents?` (exatamente um, pela
    rubrica), `origem` ∈ `MANUAL | MODULO`, `moduloKey?`, `observacao?`, `informadoPorId`. Soft-delete. Lançamento de
    competência com folha `CALCULADA` é aceito e marca a folha como desatualizada (item 52), nunca altera a execução.
17. **Validação do lançamento:** rubrica existe, é `INFORMADO` e aplica à categoria do vínculo; competência dentro do
    vínculo (`dataInicio`..`dataTermino`); `quantidadeMin > 0` ou `valorCents > 0`. Erro com `reason` novo
    `DP_LANCAMENTO_INVALIDO` e o campo nomeado.
18. **`JornadaApuradaItem`** deixa de ser `never`: `{ rubrica, quantidadeMin, data? }` — o mesmo formato do lançamento
    `MODULO`. O `NullJornadaApurada` segue devolvendo lista vazia com motivo (G9).
19. **Precedência MANUAL × MODULO:** se o `DP-PONTO` estiver ativo na competência e devolver itens, os lançamentos
    `MANUAL` das rubricas de jornada (HE, noturno, faltas) da mesma competência viram pendência bloqueante
    `LANCAMENTO_DUPLICADO_COM_PONTO` (nunca soma silenciosa). Hoje todo opcional é `disponivel: false`, então o teste usa
    registro de teste, como o PR-1 do F0.
20. **Rotas:** `GET/POST/PATCH/DELETE /dp/trabalhadores/:id/dependentes`, `GET/POST/PATCH/DELETE /dp/vinculos/:id/lancamentos`
    (filtro `?competencia=`). Cadeia Route → Controller → Service → Repository → Prisma (+ `DpPolicy`), DTO `.strict()`,
    Tier-0 (outro dono ⇒ 404), openapi só com os paths `/api/dp/*` novos (G13).
21. **Auditoria:** `dp.dependente.{created,updated,deleted}` com `['dependenteId', 'trabalhadorId', 'tipo']` (sem nome,
    CPF nem nascimento; correção com hash HMAC dos campos, como o trabalhador, G12); `dp.lancamento.{created,updated,deleted}`
    com `['lancamentoId', 'vinculoId', 'competencia', 'rubrica', 'quantidadeMin', 'valorCents', 'origem']` (lançamento
    não tem PII, mas tem valor; F-DPF-9).
22. **Reset e `resetDb`:** os dois models entram no `accountingResetClassification` (BLOCKING, G14) e no `resetDb()` antes
    de `dpVinculo`/`dpTrabalhador`.

### PR-2 — rubricas do F2

23. **Rubricas novas** (o executor escolhe natureza e incidência nas tabelas carregadas no PR-2 do F0+F1 e cita a linha
    do dossiê, como no item 51 de lá): `HORA_EXTRA_50`, `HORA_EXTRA_100`, `ADICIONAL_NOTURNO`, `DSR_VARIAVEIS`,
    `COMISSAO` (INFORMADO, `valorCents`), `FALTAS` (desconto, INFORMADO em minutos ou dias), `DSR_PERDIDO` (desconto),
    `COMPLEMENTO_MINIMO`, `COMPLEMENTO_PISO`, `AFASTAMENTO_EMPRESA_15D` (os 15 primeiros dias pagos pela empresa, Lei
    8.213 art. 60 § 3º [D03]), `ADIANTAMENTO` (provento da folha de adiantamento) e `DESCONTO_ADIANTAMENTO` (desconto na
    mensal). `calculo` ganha a família `DERIVADO` (DSR, complementos, desconto do adiantamento).
24. **Mapa rubrica → calculadora** (`features/dp/models/folha/rubricaCalculo.ts`): `as const satisfies` sobre o catálogo;
    rubrica sem calculadora reprova o teste (sem rubrica órfã).
25. **Consistência** (o teste do item 52 do F0+F1 cobre as novas): natureza e incidências vigentes; nenhuma rubrica de 723
    ou 901 com `codIncCP` em `[25, 26, 51]`; `published.json` recebe só as novas (as 6 antigas não mudam).
26. **Conferência:** as novas também ficam `conferidoPeloContador: false` e entram na mesma pergunta do pacote do contador
    (§5), que passa de 6 para 18 rubricas.

### PR-3 — snapshot e fatiamento

27. **`DpSnapshotService.montar(scope, competencia, roteiro, dataPagamento)`** lê, por vínculo vivo na competência: a
    identidade e **todas** as versões que tocam o mês (G5); lotação, cargo, jornada, sindicato; os parâmetros da CCT
    vigentes no mês (G7); afastamentos que tocam o mês (G8); lançamentos da competência (item 16); itens da porta de
    jornada (item 18); dependentes vigentes na data de pagamento (item 13); módulos ativos (G10); e
    `parametrosFolha` na competência **e** na data de pagamento (o IRRF usa a segunda, item 8). Nenhuma leitura de
    `employees` (D-2 do F0+F1).
28. **Forma canônica:** JSON com chaves ordenadas, `bigint` como string decimal, listas ordenadas por id;
    `snapshotSha256` = SHA-256 dessa forma. Propriedade (fast-check): permutar a ordem de leitura das linhas não muda o
    hash.
29. **PII no snapshot:** o snapshot guarda `trabalhadorId` e `dependenteId`, **nunca** nome, CPF ou nascimento; a idade
    que o motor precisa (aprendiz, salário-família) entra já calculada na data. Teste: o JSON serializado não contém o
    CPF nem o nome do trabalhador do cenário.
30. **`fatiar(vinculoSnapshot, competencia)`** puro: corta o mês em fatias nos dias em que muda a versão, começa ou
    termina o vínculo ou começa ou termina um afastamento. Cada fatia = `{ inicio, fim, versao, afastamento?, dias }`.
    Propriedade: as fatias cobrem exatamente os dias devidos do vínculo no mês, sem buraco e sem sobreposição; a soma
    dos dias de calendário das fatias = dias do vínculo no mês.
31. **Dias devidos por fatia** (`diasRemunerados`) na base de 30 do mensalista (item 4, F-DPF-4) ou em horas para o
    horista (`unidadeSalario` = hora: as horas vêm do lançamento ou da porta, não do calendário).
32. **Afastamento no fatiamento** (F-DPF-5): motivo de doença ou acidente não do trabalho conta os 15 primeiros dias
    consecutivos desde `inicio` como pagos pela empresa (`AFASTAMENTO_EMPRESA_15D`), **atravessando competências**
    (o dia 16 em diante não é pago pela folha); qualquer outro motivo da Tabela 18 vira pendência bloqueante
    `AFASTAMENTO_SEM_REGRA_NO_F2` com o motivo nomeado.
33. **Sem cálculo no snapshot:** o serviço só lê e serializa; o teste de integração (A6) confere que dois `montar`
    seguidos sem escrita dão o mesmo hash.

### PR-4 — motor (`features/dp/models/folha/motor.ts`)

34. **`calcularVinculo(snapshotVinculo, roteiro) → { linhas, bases, totais, prova, pendencias }`**, pura e determinística.
    `linhas` = `{ rubrica, referencia (min ou dias), valorCents, tipo }`; `bases` = `{ cp, irrf, fgts }` somadas pela
    incidência de cada rubrica (G4), nunca por nome; `totais` = `{ proventos, descontos, liquido }`.
35. **Ordem de avaliação fixa** (sem grafo e sem intérprete, F-DP-5 revisto): contratual por fatia → informados →
    afastamento → derivados (DSR, complementos) → bases → INSS → IRRF → FGTS (informativa) → desconto do adiantamento →
    totais. A ordem é uma lista em código; o teste do item 24 garante que toda rubrica tem lugar nela.
36. **Roteiro `MENSAL`, empregado 101 mensalista:** salário por fatia (item 4); HE e noturno sobre o salário-hora (itens
    3, 9, 10); DSR sobre HE e noturno (item 11); faltas e DSR perdido na semana da falta injustificada (Lei 605 art. 6º
    [D01]; semana de segunda a domingo, Dec. 10.854 art. 158 § 4º [D10]); complementos (item 12); INSS, IRRF e FGTS 8%.
37. **Horista** (`unidadeSalario` hora): salário = horas normais × salário-hora contratual; DSR do horista = a jornada
    normal por dia de repouso, com as HE habituais (Lei 605 art. 7º "b" [D01]); depois igual ao 36.
38. **Comissionista:** `COMISSAO` informada; DSR sobre comissão (Súm. 27 [D13]); HE do comissionista só o adicional sobre
    o valor-hora da comissão, divisor = horas trabalhadas (Súm. 340 [D15]); complemento até o mínimo (item 12).
39. **Aprendiz 103:** mínimo-hora (CLT art. 428 § 2º [D02]) × horas da jornada; FGTS 2%.
40. **Estagiário 901:** só a bolsa e o IRRF; sem INSS (contribuição só facultativa, Lei 11.788 art. 12 § 2º [D08]) e sem
    FGTS. **Pró-labore 723:** só o pró-labore, INSS de contribuinte individual (item 6) e IRRF; sem FGTS.
41. **Dois vínculos do mesmo trabalhador na instância:** o motor calcula os vínculos do mesmo CPF em ordem estável
    (`dataInicio`, `matricula`) e passa o INSS já descontado ao próximo, para o teto valer na soma (EC 103 art. 28 [F1-D01];
    Lei 8.212 art. 28 III para o 723 [F1-D02]). Remuneração em **outra** empresa: F-DPF-8.
42. **Roteiro `ADIANTAMENTO`:** `ADIANTAMENTO` = percentual × salário contratual da versão vigente no dia do
    pagamento, sem INSS e sem FGTS. O percentual é parâmetro da instância (item 50), não lei. O IRRF do adiantamento: F-DPF-10.
43. **Desconto do adiantamento na mensal:** a mensal desconta o que a execução `ADIANTAMENTO` **mais recente** da mesma
    competência pagou ao vínculo (`DESCONTO_ADIANTAMENTO`); sem execução de adiantamento, nada.
44. **Pendências** (tipo fechado `DpPendenciaFolha`, cada uma com `codigo`, `vinculoId`, `dado` nomeado pelo rótulo que o
    usuário vê — matrícula, nome do cargo, código da rubrica — e nunca cuid nem nome de tabela; A3): `SEM_VERSAO_NA_COMPETENCIA`,
    `PARAMETRO_LEGAL_AUSENTE` (com a tabela e a data), `JORNADA_AUSENTE`, `AFASTAMENTO_SEM_REGRA_NO_F2`,
    `LIQUIDO_NEGATIVO` (F-DPF-11), `LANCAMENTO_DUPLICADO_COM_PONTO`, `SALARIO_FAMILIA_SEM_PARAMETRO` (F-DPF-7),
    `JORNADA_ACIMA_DO_LIMITE` (F-DPF-1), `DIVISOR_NAO_RATIFICADO` (enquanto o F-DPF-1 estiver pendente e a competência
    for ≥ 2026-12). Vínculo com pendência bloqueante não tem linhas; os outros calculam normalmente.
45. **Determinismo** (fast-check): o mesmo snapshot dá o mesmo `resultadoSha256` (forma canônica do item 28 sobre
    linhas, bases, totais e pendências); a ordem dos vínculos no snapshot não muda o resultado de nenhum vínculo, salvo
    o item 41 (que tem ordem fixa).
46. **Goldens** (`features/dp/models/folha/__goldens__/*.json`, um arquivo por cenário, molde spec §10): entradas
    mínimas + esperados por rubrica, base e total em centavos (A7) + `conferidoPor: null` + `dataRef` literal (A8).
    Catálogo do F2: mensalista simples; admissão em 15/03/2026; horista com HE 50% e noturno; comissionista com DSR e
    complemento de mínimo; afastamento por doença de 10/03 a 20/04 (atravessa competências, os 15 dias pela empresa);
    aprendiz; estagiário; pró-labore acima do teto; dois vínculos do mesmo CPF somando o teto; adiantamento de 40% e o
    desconto na mensal. **Os valores esperados são calculados pelo executor à mão, com a conta escrita no arquivo**, e
    ficam `conferidoPor: null` até o contador (§5): o teste prova regressão, não folha.
47. **Competências de 2026-12 em diante:** os goldens do F2 ficam em 2026-03/2026-04 (antes da EC 141). Um golden de
    2026-12 só nasce depois do F-DPF-1 e do F-DPF-2.

### PR-5 — folha, execução e resultado persistidos

48. **`DpFolha`**: `userId`, `competencia`, `tipo` ∈ `MENSAL | ADIANTAMENTO`, `dataPagamento` (date-only, obrigatória:
    o IRRF depende dela, item 8), `estado` ∈ `ABERTA | CALCULADA`, `execucaoAtualId?`, `desatualizada: boolean`.
    Uma viva por (`userId`, `competencia`, `tipo`), por gate no serviço dentro da tx (F19 do F0+F1). O estado
    `FECHADA` e a reabertura são do F5 (fechamento).
49. **`DpExecucaoCalculo`** (imutável depois de gravada): `folhaId`, `motorVersao` (constante em código, sobe a cada
    mudança de regra), `snapshotJson`, `snapshotSha256`, `resultadoSha256`, `calculadoPorId`, `createdAt`. Sem
    `updatedAt` e sem `deletedAt`. **`DpResultadoVinculo`** (imutável): `execucaoId`, `vinculoId`, `linhasJson`,
    `basesJson`, `totaisJson`, `provaJson`, `pendenciasJson`. Recalcular = execução nova; `execucaoAtualId` aponta para
    ela; as antigas ficam (F-DP-8: "o cálculo antigo se reproduz pelo snapshot gravado").
50. **Parâmetros da folha da instância:** `DpParametrosFolha` (`userId`, `adiantamentoBp`, vigência por competência),
    porque o percentual do adiantamento é contrato ou CCT, não lei. Sem linha vigente ⇒ o roteiro `ADIANTAMENTO`
    responde 400 com `reason` `DP_ADIANTAMENTO_SEM_PARAMETRO`.
51. **`DpFolhaService.calcular(scope, folhaId)`**, numa tx: monta o snapshot (PR-3), roda o motor por vínculo (PR-4),
    grava a execução e os resultados e aponta `execucaoAtualId`, com CAS no `estado`/`execucaoAtualId` lido. Síncrono,
    no processo (T11; F-DPF-12). Folha de outro dono ⇒ 404.
52. **Desatualizada:** criar, editar ou apagar lançamento, versão de vínculo, afastamento ou dependente que toque a
    competência de uma folha `CALCULADA` marca `desatualizada = true` (na mesma tx da escrita); `calcular` volta a
    `false`. A execução antiga não muda. Teste no estado de partida certo (A2): folha **já** `CALCULADA`, depois o
    lançamento.
53. **Reprodução:** `POST /dp/folhas/:id/execucoes/:execId/reproduzir` roda o motor de hoje sobre o `snapshotJson`
    gravado e responde se o `resultadoSha256` bate. Diferença com `motorVersao` igual é bug (teste); com `motorVersao`
    diferente é resposta informativa.
54. **Rotas:** `POST /dp/folhas`, `GET /dp/folhas?competencia=`, `GET /dp/folhas/:id`, `POST /dp/folhas/:id/calcular`,
    `GET /dp/folhas/:id/execucoes`, `GET /dp/folhas/:id/holerites/:vinculoId` (linhas, bases, totais e prova da execução
    atual), a de reprodução (item 53), `GET/POST /dp/parametros-folha`. Cadeia completa, Tier-0, openapi pelos paths
    `/api/dp/*`.
55. **Auditoria:** `dp.folha.created` `['folhaId', 'competencia', 'tipo', 'dataPagamento']`; `dp.folha.calculada`
    `['folhaId', 'execucaoId', 'motorVersao', 'snapshotSha256', 'resultadoSha256', 'vinculos', 'pendencias']` (contagens,
    sem valor por pessoa); `dp.parametros_folha.created`. Valor por trabalhador **nunca** vai à auditoria.
56. **`reason` novos:** `DP_LANCAMENTO_INVALIDO`, `DP_FOLHA_DUPLICADA`, `DP_FOLHA_CONCORRENTE` (CAS), `DP_ADIANTAMENTO_SEM_PARAMETRO`.
57. **Reset e `resetDb`:** `DpFolha`, `DpExecucaoCalculo`, `DpResultadoVinculo`, `DpParametrosFolha` BLOCKING (G14),
    no `resetDb()` em ordem de FK (resultado → execução → folha).
58. **Migração** pelo `prisma migrate diff` do schema anterior, com prólogo defensivo (memória
    `migracao-sqlite-nao-e-transacional`); sem `prisma format` no schema inteiro.

### PR-6 — seed de cenário e testes pela pilha real (régua A1–A8)

59. **Seed `dp-folha-mensal`** em banco descartável (A4), escrito pelos serviços (nunca `prisma.*` direto), com
    `refDate = '2026-03-15'` literal (A8): instância com 1 unidade, lotação, cargo com piso de CCT, jornada de 44 h,
    sindicato e convenção; 4 trabalhadores — mensalista 101, horista 101 com HE e noturno lançados, aprendiz 103,
    sócio 723 com `Partner`; competência 2026-03 com folha `MENSAL` (pagamento 2026-04-06) e `ADIANTAMENTO`. O seed se
    autoconfere (lê de volta e falha com o dado nomeado). O banco descartável sai do modelo fechado ou da API de backup
    do SQLite (A8).
60. **Caminho feliz pela HTTP** (A6; `makeApp` + `authHeader`): `POST /dp/folhas` → `POST …/calcular` → **segunda
    leitura** `GET …/holerites/:vinculoId`; o teste compara a resposta inteira com a tabela de esperados do golden do
    mesmo cenário (A7), em centavos, e confere que o evento de auditoria saiu sem valor por pessoa.
61. **Uma falta por vez** (A3), cada uma com exatamente uma pendência e a mensagem com o dado nomeado e **sem** cuid nem
    nome de tabela: (a) vínculo sem versão em 2026-03 → `SEM_VERSAO_NA_COMPETENCIA` com a matrícula; (b) sem
    `INSS_EMPREGADO` vigente em 2026-03 → `PARAMETRO_LEGAL_AUSENTE` com "INSS_EMPREGADO" e a data; (c) versão de 101 sem
    jornada → `JORNADA_AUSENTE` com a matrícula; (d) afastamento com motivo sem regra → `AFASTAMENTO_SEM_REGRA_NO_F2` com
    o código do motivo; (e) sem `DpParametrosFolha` → 400 `DP_ADIANTAMENTO_SEM_PARAMETRO`.
62. **Desatualizada** (A2): folha `CALCULADA` + `POST` de lançamento ⇒ `GET` da folha devolve `desatualizada: true` e
    a execução antiga continua igual (hash relido).
63. **Concorrência:** dois `calcular` com o mesmo `execucaoAtualId` lido ⇒ um 200 e um 409 `DP_FOLHA_CONCORRENTE`. Em
    SQLite local o teste serializa; vale o CI Linux (memória `windows-serializa-sqlite-ci-linux-nao`).
64. **Separação AUTO × EXT** (A5): AUTO = tudo acima; EXT = a conferência do contador de cada golden (`conferidoPor`) e
    das 18 rubricas; nenhum runbook neste BRIEF. Quando o contador conferir, a planilha dele vira fixture versionada e
    o golden passa a citá-la.

---

## 3. Contratos (esboço materializável)

### 3.1 Tipos puros (PR-0, PR-4)

```ts
type Cents = bigint;
interface CalcNode { rotulo: string; valorCents: Cents; fonte?: string; soma?: boolean; filhos: CalcNode[] }
type Roteiro = 'MENSAL' | 'ADIANTAMENTO';
interface LinhaFolha { rubrica: RubricaCodigo; tipo: 'PROVENTO' | 'DESCONTO' | 'INFORMATIVA';
  referencia?: { minutos?: number; dias?: number }; valorCents: Cents }
interface ResultadoVinculo { vinculoId: string; linhas: LinhaFolha[];
  bases: { cp: Cents; irrf: Cents; fgts: Cents }; totais: { proventos: Cents; descontos: Cents; liquido: Cents };
  prova: CalcNode; pendencias: DpPendenciaFolha[] }
type DpPendenciaCodigo = 'SEM_VERSAO_NA_COMPETENCIA' | 'PARAMETRO_LEGAL_AUSENTE' | 'JORNADA_AUSENTE'
  | 'AFASTAMENTO_SEM_REGRA_NO_F2' | 'LIQUIDO_NEGATIVO' | 'LANCAMENTO_DUPLICADO_COM_PONTO'
  | 'SALARIO_FAMILIA_SEM_PARAMETRO' | 'JORNADA_ACIMA_DO_LIMITE' | 'DIVISOR_NAO_RATIFICADO';
interface DpPendenciaFolha { codigo: DpPendenciaCodigo; vinculoId: string; bloqueante: boolean;
  dado: string /* rótulo visível: matrícula, código da rubrica, tabela + data */; mensagem: string }
```

### 3.2 Snapshot (PR-3)

```ts
interface DpSnapshot {
  versaoFormato: 1; competencia: Competencia; roteiro: Roteiro; dataPagamento: string;
  parametros: { competencia: ParametrosFolha; pagamento: ParametrosFolha; adiantamentoBp?: number };
  modulosAtivos: DpModuleKey[];
  vinculos: Array<{
    vinculoId: string; trabalhadorId: string; matricula: string; categoria: CategoriaNucleo;
    dataInicio: string; dataTermino: string | null; idadeNaDataPagamento: number; pcd: boolean;
    versoes: Array<{ vigenteDesde: string; vigenteAte: string | null; salarioCents: string; unidadeSalario: string;
      jornada: { minutosSemanais: number; tipoJornada: string } | null; cargoId: string | null; sindicatoId: string | null }>;
    cct: Array<{ chave: CctChave; valorInt: string; vigenteDesde: string; vigenteAte: string | null }>;
    afastamentos: Array<{ motivo: string; inicio: string; fim: string | null }>;
    lancamentos: Array<{ rubrica: RubricaCodigo; quantidadeMin?: number; valorCents?: string; origem: 'MANUAL' | 'MODULO' }>;
    dependentes: { irrf: number; salarioFamilia: Array<{ idade: number; invalido: boolean }> };
    jaPagoNoMesDePagamento: { rendimentoCents: string; irrfRetidoCents: string };
    adiantamentoPagoCents?: string;
  }>;
}
```

### 3.3 Prisma (PR-1, PR-5; dinheiro `BigInt` centavos, datas date-only em `String`)

```prisma
model DpDependente { id String @id @default(cuid()); trabalhadorId String; trabalhador DpTrabalhador @relation(fields: [trabalhadorId], references: [id], onDelete: Restrict)
  nome String /* PII */; cpf String? /* PII */; nascimento String /* PII */; tipo String; deduzIrrf Boolean; salarioFamilia Boolean
  vigenteDesde String; vigenteAte String?; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; deletedAt DateTime?
  @@index([trabalhadorId]) @@map("dp_dependentes") }
model DpLancamento { id String @id @default(cuid()); vinculoId String; vinculo DpVinculo @relation(fields: [vinculoId], references: [id], onDelete: Restrict)
  competencia String; rubrica String; quantidadeMin Int?; valorCents BigInt?; origem String; moduloKey String?; observacao String?
  informadoPorId String; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; deletedAt DateTime?
  @@index([vinculoId, competencia]) @@map("dp_lancamentos") }
model DpParametrosFolha { id String @id @default(cuid()); userId String; user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  adiantamentoBp Int; competenciaInicio String; competenciaFim String?; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; deletedAt DateTime?
  @@index([userId]) @@map("dp_parametros_folha") }
model DpFolha { id String @id @default(cuid()); userId String; user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  competencia String; tipo String; dataPagamento String; estado String; execucaoAtualId String?; desatualizada Boolean @default(false)
  createdById String; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; deletedAt DateTime?
  execucoes DpExecucaoCalculo[]; @@index([userId, competencia]) @@map("dp_folhas") }
model DpExecucaoCalculo { id String @id @default(cuid()); folhaId String; folha DpFolha @relation(fields: [folhaId], references: [id], onDelete: Restrict)
  motorVersao String; snapshotJson String; snapshotSha256 String; resultadoSha256 String; calculadoPorId String; createdAt DateTime @default(now())
  resultados DpResultadoVinculo[]; @@index([folhaId]) @@map("dp_execucoes_calculo") }
model DpResultadoVinculo { id String @id @default(cuid()); execucaoId String; execucao DpExecucaoCalculo @relation(fields: [execucaoId], references: [id], onDelete: Restrict)
  vinculoId String; linhasJson String; basesJson String; totaisJson String; provaJson String; pendenciasJson String
  @@index([execucaoId, vinculoId]) @@map("dp_resultados_vinculo") }
```

O `onDelete: Restrict` da execução e do resultado repete o achado do revisor do #1026 (apagar `User` com DP falha por
FK): registrado em §8, não resolvido aqui.

### 3.4 HTTP (aditivo; tudo sob `/api/dp`)

| Método e path | Corpo / resposta |
|---|---|
| `GET/POST /dp/trabalhadores/:id/dependentes`, `PATCH/DELETE …/:depId` | `DpDependenteCreateDto` `.strict()` / lista sem CPF completo (máscara) |
| `GET/POST /dp/vinculos/:id/lancamentos?competencia=`, `PATCH/DELETE …/:lancId` | `DpLancamentoCreateDto` (`quantidadeMin` xor `valorCents`) |
| `GET/POST /dp/parametros-folha` | `{ adiantamentoBp, competenciaInicio, competenciaFim? }` |
| `POST /dp/folhas` · `GET /dp/folhas?competencia=` · `GET /dp/folhas/:id` | `{ competencia, tipo, dataPagamento }` |
| `POST /dp/folhas/:id/calcular` | 200 `{ execucaoId, snapshotSha256, resultadoSha256, vinculos, pendencias[] }` |
| `GET /dp/folhas/:id/execucoes` · `POST …/execucoes/:execId/reproduzir` | lista · `{ bate: boolean, motorVersaoGravada, motorVersaoAtual }` |
| `GET /dp/folhas/:id/holerites/:vinculoId` | `ResultadoVinculo` da execução atual (dinheiro como string) |

### 3.5 Gates de cada PR

`tsc` limpo (server); `npm run check:arch` (a `D1` segue valendo: nada em `features/dp/` importa `features/dp<Nome>/`);
snapshot de shape dos DTOs (só o nó `dp` muda; memória `dto-snapshot-update-reordena-no-windows`); allowlist do
`auditCanonical.ts` no PR que emite o evento; paths `/api/dp/*` no openapi sem subir o `BASELINE`; classificação do
reset; testes com escopo (`npx jest --runTestsByPath …`, integração `--runInBand`).

---

## 4. Forks deste BRIEF — RATIFICAÇÃO PENDENTE (nenhum se auto-ratifica)

### F-DPF-1 — Divisor do salário-hora depois da EC 141/2026

A EC 141 [D12] fixa 42 h a partir de 16/12/2026 e 40 h a partir de 16/12/2027 (art. 6º I e II), 2 dias de repouso
semanal remunerado desde 16/12/2026 (art. 1º XV; art. 10 I) e veda redução salarial nominal ou proporcional (art. 2º).
O CLT art. 64 [D02] usa "30 vezes o número de horas" da duração **diária**; a Súm. 431 [D16] dá o divisor 200 para 40 h,
mas é de 2012, com 1 dia de repouso.
- **(a)** horas semanais ÷ 6 × 30 (a prática do 220/200 e da Súm. 431): 42 h → 210; 40 h → 200.
- **(b)** horas semanais ÷ 5 × 30, porque com 2 dias de repouso a semana tem 5 dias de trabalho: 42 h → 252; 40 h → 240.
- **(c)** divisor como dado por jornada (campo novo em `DpJornada`), digitado pelo operador com a fonte.
- **Recomendação: (c) com (a) como valor sugerido**, e pergunta ao contador/advogado (§5). Nenhuma das duas leituras tem
  regra lida, e (a) × (b) muda o valor da hora extra em 20%. O dado por jornada deixa a escolha visível e auditável, e
  uma regulamentação futura vira PR de dado. Até ratificar, toda competência ≥ 2026-12 dá `DIVISOR_NAO_RATIFICADO`
  (item 44): **não calcula errado em silêncio**. Contra (c): é um campo que o usuário pode errar.
- **Junto:** jornada com `minutosSemanais` acima do limite vigente na competência (44 h até 15/12/2026, 42 h, 40 h a
  partir de 16/12/2027) ⇒ pendência bloqueante `JORNADA_ACIMA_DO_LIMITE`. Os limites entram como `LegalParameter`
  `JORNADA_LIMITE_SEMANAL` com fonte EC 141 art. 6º (o executor transcreve; PR de dado no PR-2).

### F-DPF-2 — Dias úteis e dias de repouso no DSR sobre variáveis

- **(a)** dias úteis = dias do mês − domingos − feriados (sábado é útil); repouso = domingos + feriados. Depois de
  16/12/2026, o segundo dia de repouso da semana sai da jornada (campo novo: dias de repouso da jornada).
- **(b)** dias úteis pela escala da jornada (sábado não trabalhado não é útil).
- **Recomendação: (b)**, porque a EC 141 obriga 2 dias de repouso e a escala passa a ser o dado que decide; (a) quebra
  em 16/12/2026. Os feriados vêm de `FERIADO_NACIONAL`/`FERIADO_LOCAL` (já em `main`). A leitura vai ao contador (§5).

### F-DPF-3 — Arredondamento do INSS progressivo

- **(a)** soma exata das faixas e um arredondamento no total. **(b)** arredonda cada faixa e soma.
- **Recomendação: (a)** (um ponto declarado de arredondamento, spec §5). Diferença máxima: 1 centavo por faixa. O
  contador confere no golden (§5).

### F-DPF-4 — Dias do mensalista na admissão e no término

- **(a)** mês comercial de 30: admitido no dia *d* recebe `30 − d + 1` dias (fevereiro e meses de 31 tratados como 30);
  desligado no dia *d* recebe *d* dias (com 31 ⇒ 30).
- **(b)** dias corridos ÷ dias do mês × salário.
- **Recomendação: (a)**, pela Lei 605 art. 7º § 2º [D01] e pelo Dec. 10.854 art. 157 § 2º [D10], que tratam a base de
  30 como a do mensalista. Os casos de borda (admissão em 29/02, 31/03) entram no golden para o contador.

### F-DPF-5 — Afastamento no F2

- **(a)** só doença ou acidente não do trabalho (15 dias pela empresa, Lei 8.213 art. 60 § 3º [D03]); outro motivo ⇒
  pendência bloqueante. **(b)** toda a Tabela 18 já no F2.
- **Recomendação: (a).** Maternidade (Lei 8.213 art. 72 § 1º, com "Vide Lei 15.371/2026" não lida), acidente de
  trabalho e licenças têm efeito em FGTS, compensação e S-2230 que são do F3/F4. O novo afastamento pela mesma doença
  em 60 dias (Dec. 3.048 art. 75, não lido) fica em §5.

### F-DPF-6 — Piso da CCT para jornada menor

- **(a)** piso proporcional à jornada contratual (minutos ÷ 44 h ou o limite vigente). **(b)** piso integral sempre.
- **Recomendação: (a)** para tempo parcial (CLT art. 58-A § 1º [D02]: salário "proporcional à sua jornada"), mas
  **depois de 16/12/2026 o art. 2º da EC 141 proíbe reduzir piso** por causa da redução da jornada: o divisor da
  proporção vira o limite vigente, e quem já tinha 44 h não perde. Pergunta ao contador (§5). Até lá, a proporção só
  vale para `tipoJornada` de tempo parcial.

### F-DPF-7 — Salário-família sem a cota de 2026

- **(a)** pendência bloqueante `SALARIO_FAMILIA_SEM_PARAMETRO` para vínculo 101/103 com dependente marcado, até a
  tabela `SALARIO_FAMILIA` (cota e limite, com fonte) entrar por PR de dado. **(b)** calcula sem salário-família e avisa
  (não bloqueia). **(c)** fica para o F3.
- **Recomendação: (a).** É pagamento devido junto com o salário (Lei 8.213 art. 68 [D03]); calcular sem ele é folha
  errada calada. O bloqueio é por vínculo, não da folha inteira.

### F-DPF-8 — INSS de quem tem outro emprego fora da instância

- **(a)** campo informado por vínculo e competência ("remuneração em outra empresa", com o documento como fonte), somado
  ao teto. **(b)** fora do F2 (só vínculos da mesma instância).
- **Recomendação: (b) no F2**, com (a) no F4 (o S-1200 tem o grupo de múltiplos vínculos e o MOS dá o formato). O F2 já
  soma os vínculos da mesma instância (item 41).

### F-DPF-9 — Valor do lançamento na auditoria

- **(a)** o evento leva `quantidadeMin` e `valorCents` (remuneração de uma pessoa, mas sem identificá-la além do
  `vinculoId`). **(b)** só ids, competência e rubrica, com hash HMAC dos valores (como a correção do trabalhador).
- **Recomendação: (b)**, coerente com o F-DPB-3 e o HMAC de 04/11: valor de remuneração por pessoa é dado pessoal e a
  cadeia de hash é irreversível.

### F-DPF-10 — IRRF do adiantamento

A Lei 7.713 art. 7º § 1º [D06] soma os pagamentos da mesma fonte no mês. A regra específica do adiantamento está na
IN SRF 15/2001 (não lida, §6).
- **(a)** adiantamento sem retenção quando a mensal é paga no mesmo mês; se a `dataPagamento` da mensal cair em mês
  diferente da do adiantamento, pendência bloqueante até a IN ser lida. **(b)** retém IRRF em todo pagamento, somando
  no mês (só a Lei 7.713). **(c)** só a mensal retém.
- **Recomendação: (a)** até a leitura da IN; (b) é o fallback legal se a IN não trouxer regra própria.

### F-DPF-11 — Líquido negativo

- **(a)** pendência bloqueante `LIQUIDO_NEGATIVO` no F2; o saldo para a competência seguinte e o limite de descontos
  (CLT art. 462 [D02]) são do F3. **(b)** saldo devedor já no F2.
- **Recomendação: (a).** No F2 só faltas e o desconto do adiantamento levam ao negativo; a regra de carregar saldo é do
  mesmo pacote do limite de descontos e do consignado (spec F3).

### F-DPF-12 — Execução síncrona

- **(a)** `calcular` síncrono na requisição, no processo (T11). **(b)** job com fila.
- **Recomendação: (a)**, pela T11 (sem fila) e porque o motor é puro e independente por vínculo. A meta da spec (1.000
  vínculos em menos de 60 s) vira teste de desempenho só informativo no PR-4 (gera 1.000 vínculos sintéticos e mede);
  se passar de 30 s, vira fork no BRIEF do F5.

### F-DPF-13 — Autônomo 701 (encaixe registrado no F0+F1 §7 como "fork obrigatório do F2")

- **(a)** fica fora do DP: o pagamento a autônomo segue no contas a pagar com retenção (RETENCOES-FONTE,
  `TRABALHO_NAO_ASSALARIADO_PF`); o DP só entra quando o eSocial (F4) exigir o S-1200 dele. **(b)** entra no núcleo do
  DP no F2.
- **Recomendação: (a).** O F-DPB-1 deixou o 701 fora; o pagamento já tem dono e retenção. Puxar para o DP agora duplica a
  retenção em dois lugares.

**Decididos pela casa (regra do dono de 07/10; o dono pode reverter):**

| # | Pergunta | Decisão | Base |
|---|---|---|---|
| D-1 | Fórmula das rubricas | Funções puras em código, ordem fixa, sem grafo nem intérprete | F-DP-5 revisto / F-PES-9 (a) |
| D-2 | Calculadora do IRRF | Reusa `calcularIrrfPf` | `_REUSE-CRITERION` (mesmo objeto, vivo nos dois lados); G3 |
| D-3 | Tabela do IRRF | A da data de pagamento | Lei 7.713 art. 7º § 1º [D06] |
| D-4 | Onde mora o motor | `features/dp/models/folha/` (puro) + `DpFolhaService` | D-1 do F0+F1; FEATURE_TEMPLATE |
| D-5 | Imutabilidade | Execução e resultado sem update; recálculo = execução nova | F-DP-8 (b) |
| D-6 | Patronal (CPP, RAT, terceiros) | **Fora do F2**: o resultado guarda as bases; as alíquotas patronais entram com a ponte contábil e a DCTFWeb (F5) e com o S-1005/S-1020 (F4) | Não muda o holerite; F-PES-13 (patronal por regime) e F-FOL pendentes |
| D-7 | PII no snapshot | Só ids e idades | F-DPB-3; G12 |

---

## 5. Pendente de validação externa (não entra em checklist até ter fonte ou resposta)

- **Contador (um pacote só, depois da triagem; memória `pacote-contador-triar-antes`):** (1) os goldens do item 46
  (`conferidoPor`); (2) as 18 rubricas (6 do F1 + 12 do F2) para o S-1010; (3) F-DPF-1 (divisor depois da EC 141);
  (4) F-DPF-2 (dias úteis e repouso); (5) F-DPF-3 (arredondamento do INSS); (6) F-DPF-6 (piso com jornada menor e o
  art. 2º da EC 141).
- **Advogado, se o contador não fechar o F-DPF-1:** "A EC 141/2026 muda o divisor do salário-hora do mensalista (CLT
  art. 64) com 42 h e 2 dias de repouso a partir de 16/12/2026?"
- **Cota e limite do salário-família de 2026** (Portaria Interministerial MPS/MF 13/2026): o DOU deu 403 no F1. Entra
  por PR de dado com fonte (F-DPF-7).
- **IN SRF 15/2001** (IRRF sobre adiantamento): ler na fonte oficial (SIJUT, pelo navegador embutido) antes do PR-4
  (F-DPF-10).
- **Dec. 3.048/1999 art. 75** (novo afastamento pela mesma doença em 60 dias): ler antes do PR-3 (item 32).
- **Adicional de hora extra e noturno maiores por CCT:** quais cláusulas a primeira CCT real traz (L-PES-7). Se trouxer,
  `CCT_CHAVES` ganha `ADICIONAL_HE_BP`/`ADICIONAL_NOTURNO_BP` por PR com teste.
- **Lei complementar da EC 141 art. 5º** (transição para ME/EPP): ainda não existe, pelo que se leu. Se vier, muda os
  limites do `JORNADA_LIMITE_SEMANAL` para essas empresas.

## 6. Insumos ausentes

- IN SRF 15/2001; Portaria Interministerial MPS/MF 13/2026 (salário-família); Dec. 3.048/1999 art. 75.
- Tabela 07 do eSocial (tipos de dependente): está no [F1-D10], mas não foi transcrita aqui; o executor transcreve no
  PR-1, como fez com a Tabela 18 no PR-6 do F0+F1.
- As figuras da spec (fluxo da competência) seguem ausentes.

## 7. Encaixes registrados (o que este BRIEF prepara e outro BRIEF faz)

| Encaixe | Onde entra | O que o F2 deixa |
|---|---|---|
| Férias, 13º, rescisão, complementar, retroativo, pensão, consignado, limite de descontos, saldo devedor | F3 | Snapshot com todas as versões do mês; motor com roteiro como parâmetro; `LIQUIDO_NEGATIVO` |
| Médias de variáveis (férias, 13º, aviso) | F3 | Resultados imutáveis por competência (a média lê execuções atuais) |
| S-1200/S-1210, S-1010 das 18 rubricas, múltiplos vínculos externos (F-DPF-8 a) | F4 | Linhas por rubrica com natureza e incidências; `dataPagamento` para o S-1210 |
| Patronal (CPP, RAT/FAP, terceiros), lançamento contábil, DCTFWeb, guia do FGTS | F5 (com F-FOL-1..9) | `bases` por vínculo; FGTS calculado |
| Estado `FECHADA`, reabertura, painel do contador, gate do ponto | F5 | `DpFolha.estado` com espaço para o valor novo |
| SST (`BE-INCR-DP-SST`) | BRIEF próprio | Nada novo no F2 |
| Ponto (`DP-PONTO`) | F6 | Formato do `JornadaApuradaItem` (item 18) e a precedência (item 19) |

## 8. Achados fora de escopo (registrados, não planejados)

- **EC 141/2026 fora da folha:** os cadastros de jornada do F1 aceitam 44 h sem aviso; a verificação de limite no
  cadastro e a contagem de 2 dias de repouso na escala são do F5 (verificações) e do `DP-PONTO`. O F2 só bloqueia o
  cálculo (F-DPF-1). Fora do DP, a EC também toca o preset `employees` do Core (`workSchedule`) e o simulador de custo
  de folha do X14 (`encargosFolhaDe`); nenhum dos dois foi lido nesta sessão.
- **`onDelete: Restrict` em cadeia** (execução e resultado) repete o achado do revisor do #1026: apagar `User` com DP
  falha por FK. Decidir junto com o resto antes de apagar usuário com DP.
- **PRE-ADR-PESSOAL** ainda diz "Proposed" no cabeçalho (já registrado no F0+F1 §8).
- **O `PATCH` do trabalhador não revalida os vínculos** (pergunta do revisor do #1032, ainda com o dono): no F2 isso
  aparece como idade errada no snapshot do aprendiz.

## 9. Perfil previsto por PR (taxonomia do `classificador.md`; previsão, não decisão)

| PR | Perfil | Por quê |
|---|---|---|
| PR-0 | opus-medio | Aritmética exata com propriedades e a conferência de cada artigo |
| PR-1 | opus-baixo | Dois CRUDs no molde do F1, com PII e uma precedência |
| PR-2 | opus-baixo | Doze rubricas com consistência; a escolha dos códigos vai ao contador |
| PR-3 | opus-medio | Montagem com hash canônico e fatiamento com propriedades |
| PR-4 | opus-alto | Motor com ordem fixa, dez goldens com a conta escrita e as pendências |
| PR-5 | opus-medio | Persistência imutável, CAS, desatualização na mesma tx |
| PR-6 | opus-baixo | Seed e testes pela HTTP |

## 10. Riscos (incluindo os vieses do autor)

- **Sem oráculo.** Os goldens são do executor até o contador conferir. O teste prova que o motor não muda, não que a
  folha está certa. Mitigação: conta escrita no golden, `conferidoPor: null` visível, e nenhuma folha vira lançamento
  ou eSocial antes do F5.
- **EC 141/2026 recente** (16/10/2026), sem regulamentação lida e com uma lei complementar possível para ME/EPP. A
  resposta do BRIEF é bloquear a competência ≥ 2026-12 até o F-DPF-1, não adivinhar. O go-live é em 2027 (memória
  `go-live-em-2027`): toda folha real já cai depois da EC.
- **Escopo grande:** 64 itens em 7 PRs. PR-0..PR-4 não têm rota e já dão o motor testável; PR-5 e PR-6 ligam.
- **Viés do autor:** preferi reusar o `calcularIrrfPf` e os moldes do F1 em todo lugar. O caso adversarial tentado foi
  o D-2: o IRRF da folha precisa somar adiantamento e mensal do mesmo mês, e o `calcularIrrfPf` já recebe
  `rendimentoMesAntes` e `retidoMesAntes` (G3), então serve sem mudança. O que **não** tentei: um caso real de
  pró-labore com distribuição de lucros no mesmo mês (IRRF-DISTRIBUICAO), que pode somar pela mesma fonte.
- **Leitura adotada que pode estar errada:** a tabela do IRRF pela data de pagamento (D-3). Folha de março paga em 6 de
  abril usa a tabela de abril; numa virada de tabela isso muda o valor. É a letra do art. 7º § 1º, mas o contador
  confere no golden de admissão.
