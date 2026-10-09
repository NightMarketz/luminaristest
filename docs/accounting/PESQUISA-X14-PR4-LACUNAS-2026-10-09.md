# Pesquisa X14 PR-4 — lacunas do review (alíquota de retenção, parâmetro ausente, alerta NFS-e)

Data: 2026-10-09 · Nó: X14 (`docs/plano/nos/X14.md`) · Código lido: branch `claude/mei-contracts-simei-routing-7d3f0d` (HEAD `5e226e0d`; commits `1c885169`, `8f098e4b`, `5e226e0d`) · Esta sessão não escreveu código.

**Conclusão:** a rota `GET …/simples/aliquotas/:competencia` implementa só o inciso I do art. 27 da Res. CGSN 140 (faixa do mês anterior). Não implementa o inciso II (2% no mês de início) nem o inciso V (5% sem informação). Para atividade sem receita no mês anterior, a rota devolve a lista sem essa atividade, sem erro e sem alerta. Os três pontos do review têm resposta na norma só em parte: o alerta de NFS-e do MEI compara o que a lei dispensa, e a lista de parâmetros silenciosos tem quatro casos, dois dos quais tocam tributo.

**Risco principal:** o prestador lê a rota como cálculo e informa alíquota errada no documento. Pelo art. 27 VI a responsabilidade pela diferença é dele, e a rota não avisa. Segundo risco: a LC 123 e a LC 214 **não foram lidas no texto do Planalto nesta sessão** (o host respondeu ECONNRESET em todas as tentativas). O texto de 2027 do inciso II (2%) está em aberto, e não o afirmo.

---

## 0. Fontes e o que foi lido

| Fonte | Como foi lida | Grau |
|---|---|---|
| Res. CGSN 140/2018, texto multivigente até Res. 183/2025 — `docs/accounting/fontes-oficiais/Res-CGSN-140-2018.txt` | Lida no disco. sha256 do `.txt` local: `15792fa0fa0568d6e28a7ce135c4b565f9715eb4e878d36fb0c3e079b801ac69`. O MANIFEST registra `8d9b024965c1…` para o `.json` de origem; **não consegui ligar o `.txt` ao `.json`** pelo hash. | verificado (texto) |
| Transcrição das tabelas (LC 123 Anexos I–V; LC 214 Anexos XVIII–XXII) — `TRANSCRICAO-SIMPLES-ANEXOS-LC123-LC214-2026-10-07.txt` | Lida. sha256 `a7f08527…` do arquivo; o sha do texto LC 123 citado nele, `07ee7d3adc227cc2a4781a57cda10c26ec6d5599ab6d1879605bb1ad3c766515`, bate com o MANIFEST. Tem **só tabelas**, nenhum artigo. | verificado (tabelas) |
| Código PR-4: `SimplesApuracaoService.ts` (métodos `montar`, `limites`, `limiteMei`, `montarMei`, `conferirNfse`, `aliquotas`), `simplesCalc.ts` (`rbt12`, `fatorR`, `apurar`, `apurarSimei`), `FiscalDocumentRepository.ts` (`somaNfseAutorizadaNaCompetencia`), `legalParameter.ts` (`linhaLegalVigente`) | Lidos via `git show`/`git grep` na branch PR-4 (o worktree atual é outra branch). Não rodei testes. | verificado (código) |
| Notícia RFB sobre Res. CGSN 191/2026 (NFS-e nacional para ME/EPP a partir de 01/11/2026) — gov.br | Lida via WebFetch (texto, não bytes). sha do MANIFEST `be6cc4a38faf…` não recalculado. | verificado (notícia oficial); texto da resolução **não lido** |
| LC 123, LC 214, LC 116, Lei 12.592 (Planalto) | **Não lidas.** ECONNRESET em todas as tentativas. O `curl` também não alcança a rede (código 000). Sha256 dos bytes **não recalculado nesta sessão**. | — |
| Manual do PGDAS-D e DEFIS (URL do MANIFEST) | **Não lido.** Não está no disco e não foi baixado. | — |
| Anexo I NFS-e (leiaute, `dCompet`) | **Não lido.** Não está no disco (o MANIFEST lista, o diretório não tem). | — |
| Buscas web (sites de terceiros: legjur, juruadocs, contabeis, jornais) | Usadas só para **pistas**. Legjur/juruadocs responderam 403 ao fetch direto. Nada abaixo que venha só delas está marcado como verificado. | assumido/inferido |

Não usei fonte fora de gov.br / planalto.gov.br / DOU / Portal do Simples (regra da sessão). As buscas trouxeram sites comerciais: tratei como pista e marquei como tal.

---

## PERGUNTA 1 — Alíquota de retenção do ISS no início de atividade

### 1a. Art. 27 da Res. CGSN 140 — transcrição integral (verificado, texto multivigente no disco)

> **Art. 27.** A retenção na fonte de ISS da ME ou EPP optante pelo Simples Nacional, observado o disposto nos arts. 3º e 6º da Lei Complementar nº 116, de 2003, ocorrerá se observado cumulativamente o seguinte: *(LC 123/2006, art. 21, § 4º)*
>
> **I** - a alíquota aplicável na retenção na fonte deverá ser informada no documento fiscal e corresponderá ao percentual efetivo de ISS decorrente da aplicação das tabelas dos Anexos III, IV ou V desta Resolução para a faixa de receita bruta a que a ME ou EPP estiver sujeita no mês anterior ao da prestação, assim considerada:
> a) a receita bruta acumulada nos 12 (doze) meses que antecederem o mês anterior ao da prestação; ou
> b) a média aritmética da receita bruta total dos meses que antecederem o mês anterior ao da prestação, multiplicada por 12 (doze), na hipótese de a empresa ter iniciado suas atividades há menos de 13 (treze) meses da prestação;
>
> **II** - na hipótese de o serviço sujeito à retenção ser prestado no mês de início de atividade da ME ou EPP, a alíquota aplicável será de 2% (dois por cento);
>
> **III** - na hipótese prevista no inciso II, constatando-se que houve diferença entre a alíquota utilizada e a efetivamente apurada, caberá à ME ou à EPP prestadora dos serviços efetuar o recolhimento da diferença no mês subsequente ao do início de atividade em guia própria do Município;
>
> **IV** - na hipótese de a ME ou a EPP estar sujeita à tributação do ISS pelo Simples Nacional por valores fixos mensais, não caberá a retenção a que se refere o caput, salvo quando o ISS for devido a outro Município;
>
> **V** - na hipótese de a ME ou EPP não informar no documento fiscal a alíquota de que tratam os incisos I e II, aplicar-se-á a alíquota de 5% (cinco por cento);
>
> **VI** - não será eximida a responsabilidade do prestador de serviços quando a alíquota do ISS informada no documento fiscal for inferior à devida, hipótese em que o recolhimento da diferença será realizado em guia própria do Município; e
>
> **VII** - o valor retido, devidamente recolhido, será definitivo, não sendo objeto de partilha com os Municípios, e sobre a receita de prestação de serviços que sofreu a retenção não haverá incidência de ISS a ser recolhido pelo Simples Nacional.
>
> **§ 1º** Na hipótese prevista no caput, caso a prestadora de serviços esteja abrangida por isenção ou redução do ISS em face de legislação municipal ou distrital que tenha instituído benefícios à ME ou à EPP optante pelo Simples Nacional, na forma prevista no art. 31, caberá a ela informar no documento fiscal a alíquota aplicável na retenção na fonte, bem como a legislação concessiva do respectivo benefício.
>
> **§ 2º** Para fins do disposto no inciso I do caput, respeitado o disposto no art. 21, o Município ou o Distrito Federal poderá estabelecer critérios de informação da alíquota efetiva de ISS a constar do documento fiscal, de acordo com a respectiva legislação.
>
> **§ 3º** Nas hipóteses de que tratam os incisos I e II do caput, a falsidade na prestação dessas informações sujeitará o responsável, o titular, os sócios ou os administradores da ME ou da EPP, juntamente com as demais pessoas que concorrerem para sua prática, às penalidades previstas na legislação criminal e tributária.

Nota de texto: a Res. 140 cita como base o LC 123 art. 21 § 4º, e o § 3º cita o § 4º-A. O texto de Planalto desses dispositivos não foi lido (ver §0).

### 1b. "Início de atividade" para esse fim

**Regra verificada (Res. 140, art. 2º, V):** "data de início de atividade a data de abertura constante do CNPJ". (verificado)

Há também o art. 2º, IV: "empresa em início de atividade aquela que se encontra no período de 60 (sessenta) dias a partir da data de abertura constante do CNPJ" (o texto de 180 dias está revogado, na mesma linha do texto). (verificado) Esse inciso define um **período de 60 dias**, não um mês; o inciso II do art. 27 fala em "mês de início de atividade". O código não usa nenhum dos dois: lê `perfil.inicioAtividadeEm` (campo digitado no perfil) e pega o mês com `slice(0,7)` (verificado, `SimplesApuracaoService.ts`, função `montar`).

- **Abertura do CNPJ:** é a data de início para o art. 27. (verificado pelo art. 2º V; a aplicação ao art. 27 II é inferida, porque o art. 27 não define o termo.)
- **Empresa que migra de outro regime:** o CNPJ é o mesmo e a data de abertura é antiga. Pelo art. 2º V, **não conta como início**. A data da opção pelo Simples não é o início por esse critério. (inferido do art. 2º V; não há norma que diga "migração não é início" com essas palavras)
- **Ponto de atenção no código:** o campo `inicioAtividadeEm` é digitado. Se o usuário digitar a data da opção ou da primeira venda, a regra fica errada sem alerta. Precisa de validação ou de origem do CNPJ.

→ Fork **F-PR4-1**.

### 1c. RBT12 no 2º ao 13º mês de atividade

**Regra (art. 27 I "b", verificado):** média aritmética da receita dos meses **que antecedem o mês anterior ao da prestação**, × 12, quando a empresa iniciou há menos de 13 meses da prestação.

Seja M o mês da prestação, S o mês de início e `janela(PA)` a janela de `rbt12()` (`simplesCalc.ts`, função `janelaRbt12`, verificado). A rota `aliquotas` chama `montar(M−1)`, então a janela usada é a do PA = M−1, que dá **M−13 … M−2** (2026 e antes). Esse intervalo é exatamente o do art. 27 I "a" (12 meses que antecedem M−1).

| Mês da prestação M | Lei (art. 27 I) | Código (verificado) | Bate? |
|---|---|---|---|
| M = S (mês de início) | II: 2% | `montar(M−1)`: sem receita antes de S, lista de atividades vazia, sem alerta | **Não** (gap G1) |
| M = S+1 | I "b" pede meses que antecedem M−1 = S: **não há nenhum** | `rbt12`: M−1 = S, método INICIO_PRIMEIRO_MES = receita(S) × 12 | **Lacuna da norma** (fork F-PR4-2) |
| S+2 ≤ M ≤ S+12 | I "b": média dos meses de S até M−2, × 12 | `rbt12` com filtro `m ≥ inicio`, método INICIO_MEDIA | Sim |
| M ≥ S+13 | I "a": 12 meses M−13 … M−2 | ACUMULADO | Sim |

Fronteira de 13 meses: para M = S+12 o código aplica a média (inicio > janela.de); para M = S+13, o acumulado. Bate com "menos de 13 meses".

**Risco de 2027 (inferido, a confirmar):** `janelaRbt12` passa a usar **comp−13 … comp−2** para PA ≥ 2027-01 (regra do art. 517 da LC 214, segundo o comentário do código). Com PA = M−1, a janela de retenção vira **M−14 … M−3**, um mês mais antiga que o art. 27 I "a" do texto de 2018. Se o art. 27 não mudou em 2027, a rota de 2027 calcula com a janela errada. A redação do art. 517 não foi lida (ver §0). → Fork **F-PR4-2b** (incluído em F-PR4-2).

### 1d. Atividade sem receita no mês anterior

**O que a norma diz (verificado, art. 27 I):** a faixa é a da **ME** ("a faixa de receita bruta a que a ME ou EPP estiver sujeita no mês anterior"), e não a da atividade. A faixa vem do RBT12 e o art. 21 II "a" define RBT12 como "receita bruta acumulada nos doze meses anteriores ao período de apuração" (verificado), sem separar por atividade. O anexo vem da atividade (Anexo III, IV ou V; a regra de enquadramento por anexo não foi lida no LC 123 art. 18 §§ 5º-C e 5º-I, que não estão no disco).

- **Qual alíquota:** faixa do RBT12 **global** da empresa × anexo da atividade (inferido do texto "a faixa a que a ME estiver sujeita"). Não é 2%, porque o inciso II só vale no mês de início. Não é 5%, porque o inciso V só vale quando não há informação.
- **Anexo e faixa dependem de quê:** o anexo depende da natureza da atividade. A faixa depende do RBT12 global. A receita **da atividade** no mês anterior não entra na faixa. (inferido)
- **Fator R:** art. 26 (verificado) define r como folha dos 12 meses anteriores ao PA ÷ receita bruta dos mesmos 12 meses (incisos I e II). A exigência é **na janela**, não no mês: a falta de folha **no mês anterior** não impede o cálculo. O código faz o mesmo (`fatorR(... base.meses ...)`, verificado). Mas a atividade sem receita no mês anterior **nem aparece** na lista hoje, então o fator R dela não chega à rota (verificado: `aliquotas` só lê `calculada.atividades`).

**Gap G2 (verificado no código):** `aliquotas()` monta as atividades a partir da receita de M−1 (`montar`). Atividade nova no mês M não aparece na resposta, sem erro e sem alerta. Quem consome a rota não sabe que falta a alíquota dela.

→ Fork **F-PR4-4**.

### 1e. Piso ou teto na retenção

- **Teto:** a própria Res. 140 põe teto de 5% no ISS efetivo: art. 21 III "a" — "o percentual efetivo máximo destinado ao ISS será de 5% (cinco por cento)" (verificado). E o código aplica o teto antes de devolver `percentuais.ISS` (verificado, `simplesCalc.ts` linhas 366–369: `if (iss && teto && cmp(iss, BP(teto.percentualBp)) > 0)`). Então **sim, o teto vale para a retenção**, porque a rota lê `percentuais.ISS` depois do teto.
  - **Gap G3 (verificado no código):** o `if` tem `teto &&`. Se a linha `SIMPLES_TETO_ISS` faltar, o ISS **não é limitado**, em silêncio. Mesma família do item 2.
- **Piso:** a Res. 140 não tem piso no art. 27 (verificado). O único valor fixo é o de 2% do inciso II, que vale só no mês de início (e é fixo, não piso).
  - A LC 116 tem regra de alíquota mínima de ISS (art. 8º-A, citado na pergunta). **Não li o texto** (ver §0). Não afirmo se ela alcança a retenção do Simples. → Fork **F-PR4-5**.
- **Faixa do percentual efetivo abaixo de 2% ou acima de 5%:** pela Res. 140, a retenção é o efetivo de ISS (com teto de 5%), sem piso. Abaixo de 2%, a Res. 140 não manda elevar. Se a LC 116 tiver piso de 2% alcançando a retenção, o inciso I ficaria em conflito com ela. Isso não tenho como fechar sem o texto.

### 1f. Erro do prestador ao informar a alíquota

**Verificado (art. 27 VI e III):** a responsabilidade do prestador **não é eximida** quando a alíquota informada é inferior à devida, e a diferença é recolhida em guia municipal. No caso do inciso II, a diferença é paga no mês seguinte ao do início (III). O § 3º prevê responsabilidade criminal e tributária do responsável, do titular e dos sócios pela falsidade.

- **Quem responde:** o prestador (VI). Quem informa a alíquota é o prestador, não a rota.
- **Efeito na escolha "a rota calcula" × "a rota só sugere":** a rota não tem o dever legal de calcular, e o prestador responde de todo jeito. Mas o § 2º do art. 27 deixa o **município** definir os critérios de informação da alíquota efetiva, e o § 1º trata de isenção municipal que a rota não conhece. Uma rota que "calcula" passa a parecer autoridade sobre algo que o município pode regular diferente. **Recomendação: "sugere" + alerta** com a faixa, o mês de referência e a janela usada (F-PR4-6).

### Casos-limite numerados (resumo)

1. Início no mês da prestação: 2% (II). Código devolve lista vazia (G1).
2. Início no mês anterior: janela com um mês só (lacuna da norma, F-PR4-2).
3. Início há menos de 13 meses: média × 12 (código bate).
4. Início há 13 meses ou mais: acumulado 12 meses (código bate).
5. Migração de outro regime: não é início pelo art. 2º V (inferido).
6. Atividade nova sem receita no mês anterior: some da lista (G2).
7. Anexo III/V com fator R sem folha no mês anterior: o fator R é da janela, não do mês (código bate, mas a atividade não chega à rota).
8. ISS efetivo acima de 5%: teto de 5% (art. 21 III "a"). Teto ausente: sem limite (G3).
9. ISS efetivo abaixo de 2%: sem piso na Res. 140; LC 116 não lida.
10. Prestador informa alíquota errada: prestador responde (art. 27 VI).
11. Município com regra própria (§ 2º): rota não sabe.
12. Retenção em 2027: janela de RBT12 pode ter defasagem de um mês (inferido; LC 214 art. 517 não lido).

### Forks da Pergunta 1

**F-PR4-1 — O que é "início de atividade" para a retenção**
- (a) data de abertura do CNPJ (art. 2º V) — **recomendado**;
- (b) data da opção pelo Simples;
- (c) primeiro mês com receita.
Impacto: `SimplesApuracaoService.ts`, `montar` (campo `inicio`, `perfil.inicioAtividadeEm`); validar a origem do campo ou documentar a regra no perfil. Migração: sem 2%, por (a).

**F-PR4-2 — 2º mês de atividade (art. 27 I "b" sem meses antecedentes) e a janela de 2027**
- (a) receita do mês de início × 12, como o código faz hoje (analogia com art. 22 § 2º da Res. 140) — **recomendado** para 2º mês;
- (b) não informar alíquota e exigir o inciso V (5%);
- (c) aplicar 2% também no 2º mês.
Para 2027: (a) manter janela M−13 … M−2 pelo art. 27 I "a" de 2018, ou (b) seguir a janela nova do art. 517 da LC 214. **Não recomendo fechar a janela de 2027 sem ler o art. 517 e o texto que a LC 227/2026 (se existir) alterou.**
Impacto: `aliquotas()` e `janelaRbt12` (`simplesCalc.ts`).

**F-PR4-3 — Mês de início: a rota deve devolver 2%?**
- (a) sim, 2% para as atividades do mês de início (art. 27 II, verificado) — **recomendado**;
- (b) não devolver alíquota e alertar;
- (c) 5%.
Impacto: `aliquotas()`: detectar `competencia === mês de início` e devolver 2% por atividade; hoje a rota devolve lista vazia (G1). Deve vir com a regra de diferença (III): o prestador paga a diferença no mês seguinte.

**F-PR4-4 — Atividade sem receita no mês anterior**
- (a) faixa do RBT12 global × anexo da atividade, pela natureza e cTribNac da atividade, mesmo sem receita no mês anterior — **recomendado** pela redação "a faixa a que a ME estiver sujeita";
- (b) 2%;
- (c) 5%.
Impacto: `aliquotas()` deixa de montar as atividades só a partir de M−1; passa a usar o catálogo de atividades (natureza, cTribNac) e aplica a faixa global. Fator R pela janela (art. 26, verificado).

**F-PR4-5 — Piso de ISS na retenção**
- (a) sem piso (texto da Res. 140, verificado) — **recomendado até ler a LC 116**;
- (b) piso de 2% se a LC 116 art. 8º-A alcançar a retenção do Simples (não verificado);
- (c) alerta quando o efetivo ficar abaixo de 2% ou acima de 5%.
Impacto: `simplesCalc.ts` (teto, linhas 366–369) e `aliquotas()`. **Gate: ler LC 116 art. 8º-A no Planalto antes de ratificar (a) ou (b).**

**F-PR4-6 — Papel da rota: calcula ou sugere**
- (a) sugere, com faixa, mês de referência e janela usadas, e alerta de responsabilidade (art. 27 VI) — **recomendado** (o § 2º deixa o município regular, e o prestador responde de todo jeito);
- (b) calcula e declara a alíquota como válida.
Impacto: nome dos campos `issRetencao` e `pTotTribSNSugerido`, e textos de resposta. Não muda cálculo.

---

## PERGUNTA 2 — Parâmetro de limite ausente

### 2a. Levantamento no código (verificado, branch PR-4, `git grep`)

Busca `valorInt ?? 0`: **só duas ocorrências**, ambas em `SimplesApuracaoService.ts`:

| # | Arquivo:linha | O que faz | Efeito quando a linha falta | Risco |
|---|---|---|---|---|
| S1 | `server/src/features/accounting/services/SimplesApuracaoService.ts:374` (`limites`, helper `limite()`) | `linhaLegalVigente(...SIMPLES_LIMITE, chave, data)?.valorInt ?? 0` | `sub = fator(0) = 0`. Guardas `sub > 0n` em `:393`, `:396` e `:397` **silenciam** o alerta SUBLIMITE_ICMS_ISS **e** o impedimento (`impedidoEsteAno`/`impedidoPeloAnterior`). Consequência: ICMS/ISS continuam no DAS quando a lei manda sair. | **Dinheiro** (DAS errado) e **prazo legal** (exclusão do Simples prevista no art. 13-A / Res. 140 art. 12). |
| S2 | `SimplesApuracaoService.ts:467` (`limiteMei`) | `linhaLegalVigente(... SIMPLES_LIMITE, 'MEI', ...)?.valorInt ?? 0` | `anual = 0`, `limite = 0`; a guarda `limite > 0n &&` em `:470` **silencia** LIMITE_MEI_EXCEDIDO. | **Prazo legal**: o alerta diz "comunique até o último dia útil do mês seguinte"; sem alerta, o desenquadramento não é comunicado. |

Ocorrências de `linhaLegalVigente` com outra política (verificado):

| Arquivo:linha | Política | Obs. |
|---|---|---|
| `simplesCalc.ts:286` (helper `linha`) | retorna `undefined` | Chamadores obrigatórios usam `exigir()` (lança erro); **os opcionais não**. |
| `simplesCalc.ts:368–369` (teto do ISS) | `teto` `undefined` → `if (iss && teto && …)` pula o teto | **G3**: ISS sem limite, em silêncio. **Dinheiro.** |
| `simplesCalc.ts:479–481` (`apurarSimei`, função `valor`) | lança `Error` | Padrão explícito. O SIMEI já responde 400 (`SimplesApuracaoService.ts`, `montarMei`, "Não há parâmetro legal publicado para o SIMEI…"). |
| `models/issLimite.ts:12` (`issAliquotaMaxBp`) | lança `SemLinhaVigenteError` | Explícito. |
| `models/pisCofinsParams.ts:43, 90` | lança erro (`pisCofinsParams: linha … fora do formato`; `SemLinhaVigenteError`) | Explícito. |
| `lib/ecf.ts:54`, `lib/sped.ts:133` (`LEIAUTE_SPED`) | retorna `undefined` a quem chama | Não li o chamador; o teste `companyFiscalProfile.sped.integration.test.ts:18` diz "sem linha vigente de LEIAUTE_SPED" → **400**, então é erro explícito. |

Conclusão do 2a: o repositório tem **três políticas** coexistindo: erro explícito (SIMEI, ISS máximo, PIS/COFINS, SPED), silêncio com `undefined` (teto do ISS) e silêncio com `?? 0` (limites, limiteMei). As duas de silêncio que tocam o cálculo são S1 e S2 e G3.

Os demais `?? 0` no `SimplesApuracaoService.ts` (`receitaPa ?? 0n` na linha 340 e `hist.get(...) ?? 0`) são **ausência de receita = zero**, que está certo. Não são parâmetro.

### 2b. Vigência dos limites da LC 123

- **Lido na Res. 140 (verificado):** limite ME de R$ 360.000,00 e EPP de R$ 4.800.000,00 (dispositivo de definição de ME/EPP, linhas 37 e 39 do `.txt`, que citam LC 123 art. 3º I e II). Os textos de limite mais recentes (art. 3º § 9º-A, art. 13-A, art. 18-A § 1º) **não foram lidos** no Planalto.
- **Vigência aberta:** no texto lido não há data de fim para esses limites. **Não verifiquei** o texto do art. 18-A § 1º (limite do MEI) na Res. 140 nem na LC 123.
- **Projetos de alteração (fonte secundária, não verificada no Congresso):**
  - PLP 108/2021: a Câmara aprovou a urgência em 17/03/2026, por 430 votos (AmdJus). O texto do Senado elevaria o teto para R$ 130 mil (mesma fonte). Ainda sem sanção, pelo que encontrei.
  - PLP 186/2026 (governo): enviado em 29/06/2026, R$ 110 mil em 2027 e R$ 140 mil a partir de 2028 (Reforma Tributária). Em tramitação.
  - Nenhuma foi sancionada na minha busca. **Confirmar no site da Câmara/Senado antes de qualquer decisão.**
- **Ausência de linha é estado impossível ou falha de carga?** O valor **muda por lei complementar**, e a lei muda com data de vigência. Logo, o estado "não tem linha vigente" **não é impossível**: ou a carga está incompleta, ou a data consultada é anterior ao início da tabela. As duas são falha de carga, e devem aparecer como erro, não como zero. (inferido de que o valor muda por lei; a arquitetura de `vigenteDesde` já suporta a troca.)

### 2c. Política uniforme: custo nos testes

Procurei nos testes do PR-4 por `SIMPLES_LIMITE`, `PARAMETRO_AUSENTE`, "sem linha" e "2%" (verificado por `git grep`):
- **Nenhum teste remove `SIMPLES_LIMITE` nem assere ausência de linha.** Os testes de alerta de limite usam a tabela seedada (`simplesMei.integration.test.ts:110, 117, 128`; `simplesApuracao` não tem caso de limite).
- **Não li o corpo de todos os testes.** A conclusão "nenhum quebra" vale para a busca feita, não para a suíte inteira. Rodar a suíte é o oráculo (não rodei: a sessão é de pesquisa).

Custo por opção:

- **(a) erro 400/422, como o SIMEI:** não quebra teste existente, mas **bloqueia `calcular` de todo o ME** em qualquer mês em que a linha falte, inclusive para quem não usa o limite. Blast radius alto. Adequado para o caso MEI (que já é 400 para o salário mínimo).
- **(b) alerta próprio `PARAMETRO_AUSENTE` + inclusão em `BLOQUEANTES` no registro do DAS:** nenhum teste quebra (acréscimo). Mantém o cálculo visível e impede o **registro** com o parâmetro ausente. Melhor compromisso para dinheiro.
- **(c) manter o silêncio:** nenhum teste quebra; mantém o defeito. Não recomendo.

→ Fork **F-PR4-7** (política) e **F-PR4-8** (teto do ISS ausente, G3).

**Recomendação (F-PR4-7):** (b) para S1, S2 e G3, com `PARAMETRO_AUSENTE` em `BLOQUEANTES` (registro do DAS bloqueado; cálculo visível). Para o SIMEI, manter (a), que já existe. Para `LEIAUTE_SPED`, `ISS_LIMITE` e PIS/COFINS, manter o padrão atual.

---

## PERGUNTA 3 — Alerta NFSE_DIVERGE_RECEITA (item 31)

### 3a. MEI

**Verificado (Res. 140 art. 106, texto multivigente):**

> **Art. 106.** O MEI: *(LC 123/2006, art. 26, §§ 1º e 6º, inciso II)*
> I - deverá comprovar a receita bruta mediante apresentação do Relatório Mensal de Receitas Brutas … até o dia 20 … do mês subsequente …;
> II - em relação ao documento fiscal previsto no art. 59:
> a) ficará dispensado da emissão: 1. nas operações com venda de mercadorias ou prestações de serviços para consumidor final pessoa física; e 2. nas operações com mercadorias para destinatário inscrito no CNPJ, quando o destinatário emitir nota fiscal de entrada; e
> b) ficará obrigado à sua emissão: 1. nas prestações de serviços para tomador inscrito no CNPJ; e 2. nas operações com mercadorias para destinatário inscrito no CNPJ, quando o destinatário não emitir nota fiscal de entrada.

> **Art. 106-A.** Relativamente às operações não compreendidas no campo de incidência do ICMS, o MEI utilizará a NFS-e de padrão nacional, emitida por sistema informatizado disponível no Portal do Simples Nacional … I - emissor de NFS-e web; II - aplicativo para dispositivos móveis; III - serviço … API. § 1º É vedada a emissão, pelo MEI, da NFS-e de que trata o caput em operações sujeitas apenas à incidência do ICMS. (verificado)

- **Quando o MEI é dispensado:** venda ou prestação para **consumidor final pessoa física** (art. 106 II "a.1"), e venda de mercadoria a CNPJ que emita nota de entrada (II "a.2"). Não há no texto lido exceção "por município". Municípios podem ter regra própria (art. 59 § 1º, verificado), e o texto de "por município" da pergunta não aparece na Res. 140.
- **Serviço a CNPJ: obrigatório** (art. 106 II "b.1"). Esse é o ponto que o alerta deveria comparar.
- **Obrigação de NFS-e nacional para o MEI:** a Res. 140 (art. 106-A, verificado) já prevê a NFS-e de padrão nacional para operações fora do ICMS. A **Res. CGSN 169/2022** existe (fonte secundária: de 27/07/2022, tornou a NFS-e nacional facultativa para MEI em 2023 e obrigatória para prestação a pessoa jurídica; a data de início aparece como 01/01/2023, 03/04/2023 ou 01/09/2023 conforme a fonte). **Não li o texto da 169/2022.** A dúvida "a dispensa mudou?" fica em aberto para o texto da 169.
- **Não li** LC 123 art. 26 §§ 6º, 9º e 10 nem o art. 106 § 1º (lista de dispensas completa).

**Conclusão 3a (verificado + inferido):** a dispensa para PF é a regra do art. 106 II "a.1" e não foi alterada no texto lido. Para o alerta, o que importa é **a receita de serviço a tomador CNPJ**. Hoje `conferirNfse` compara **toda** a receita de serviço (`natureza !== 'REVENDA'`, verificado na linha 513 de `SimplesApuracaoService.ts`), inclusive a vendida a PF, que não tem NFS-e por lei. Isso gera divergência falsa no MEI. O modelo de receita fiscal lido no código **não tem campo de tomador** (verificado por grep: só campos de documento fiscal). Se o campo não existir, o alerta não consegue separar. (inferido de "não há campo" — o grep é de `tomador` em `models/*.ts` e `schema.prisma`, sem exaustão do modelo de receita)

**Defeito de consistência (verificado):** na montagem do ME (`montar`), a conferência recebe `servicosPa`, que **exclui a cota de aluguel de bem móvel do salão-parceiro** (linhas 366–367, review `8f098e4b`). Na montagem do MEI (`montarMei`), a conferência recebe `linhasPa` **sem esse filtro** (linha 442). As duas trilhas ficaram diferentes depois do review. Se o MEI pode ter essa cota, a divergência é falsa. A regra da cota vem da Lei 12.592 art. 1º-A §§ 4º–5º, **não lida** (ver §0). → Fork **F-PR4-11**.

### 3b. ME/EPP

**Verificado (Res. 140 art. 59, texto multivigente):**
- art. 59 I: documentos autorizados pelos entes federados onde a empresa tem estabelecimento; II: documentos emitidos pelo sistema nacional, sem custo, quando disponível no Portal.
- § 1º: "Relativamente à prestação de serviços sujeita ao ISS, a ME ou EPP optante pelo Simples Nacional utilizará a Nota Fiscal de Serviços, conforme modelo aprovado e autorizado pelo Município, ou Distrito Federal, ou outro documento fiscal autorizado conjuntamente pelo Estado e pelo Município da sua circunscrição fiscal."

**Notícia RFB (verificado, gov.br, lida via WebFetch):** Res. CGSN **191, de 4 de agosto de 2026**, tornou a NFS-e nacional obrigatória para ME e EPP do Simples que prestam serviços sujeitos à NFS-e, **a partir de 01/11/2026**, emitida pelo Emissor Nacional (web ou API). Revoga a Res. 189/2026 (que dizia 01/09/2026). A notícia **não menciona MEI** nem dispensas. **O texto da Res. 191 não está compilado** (a compilação RFB vai até a 183/2025).

**Casos legítimos de receita sem NFS-e (o que a lei permite, verificado ou não):**

| Caso | Base | Grau | Efeito no alerta |
|---|---|---|---|
| Venda de mercadoria (ICMS) | NF-e, não NFS-e | verificado (art. 59; `conferirNfse` exclui `REVENDA`, linha 513) | já excluída |
| Cota do profissional-parceiro (salão-parceiro) | Lei 12.592 art. 1º-A § 4º–5º | o código exclui a cota (linha 513, `cotaProfissionalCents`); **texto da lei não lido** | já excluída (ME); MEI não (3a) |
| Locação de bem móvel (`LOCACAO_MOVEL`) | ISS ou não, conforme a lista da LC 116 e o município | **não lido** | **hoje contada como serviço**: `conferirNfse` exclui só `REVENDA` (verificado). Gera divergência se não houver NFS-e |
| Documento municipal próprio (art. 59 § 1º) | Município ou Estado+Município | verificado (art. 59 § 1º) | **hoje divergência**: a soma só conta `kind = NFSE` (verificado no repositório). Documento municipal fora da tabela não entra |
| NFS-e emitida fora do emissor nacional | art. 59 II + Res. 191 (de 01/11/2026) | verificado a notícia; texto não lido | a partir de 01/11/2026, a Res. 191 exige o nacional para ME/EPP (inferido: fora dele não é mais permitido) |

### 3c. Data que casa NFS-e e competência

- **Código (verificado):** a NFS-e é somada por `dCompet startsWith competência` (`FiscalDocumentRepository.ts`, função `somaNfseAutorizadaNaCompetencia`, linhas 61–71). A receita é lida por competência (`findByCompetencia`).
- **Regra da base de cálculo (art. 16, verificado):** a receita mensal é a auferida (regime de **competência**) ou a recebida (regime de **caixa**), conforme opção do contribuinte. O alerta compara por competência, então **não respeita a opção de caixa**.
- **`dCompet` é data da prestação ou da emissão?** **Não verificado**: o leiaute NFS-e (Anexo I, `NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx`) está no MANIFEST, mas não no disco e não foi baixado (ver §0).
- **Nota emitida no mês seguinte à prestação gera divergência falsa?** Depende de `dCompet`. Se `dCompet` for a data da prestação, a nota cai no mês certo e **não** gera divergência, mesmo emitida depois. Se o regime é de caixa, há divergência **de competência** em todo mês em que o recebimento e a prestação caem em meses diferentes. (inferido; depende da leitura do Anexo I e da regra de caixa)

### 3d. Tratamento por caso

| Caso | (i) excluir da soma | (ii) informativo com motivo | (iii) manter |
|---|---|---|---|
| MEI venda a PF | — (não há tomador na receita, verificado) | — | **Hoje: divergência falsa** |
| MEI serviço a CNPJ | — | — | **Certo** (é o que a lei exige) |
| Cota do salão-parceiro (ME) | **já (i)** (linha 367) | — | — |
| Cota do salão-parceiro (MEI) | (i), por simetria — a confirmar na Lei 12.592 | — | hoje: divergência |
| Locação de bem móvel (ME) | (i) **só** se a leitura da LC 116 / art. 59 disser que não há NFS-e | (ii) até ler a norma | hoje: divergência |
| Documento municipal (art. 59 § 1º) | (i) **não** (não é receita fora da lei) | **(ii)** com motivo "documento municipal, não lançado no emissor" | hoje: divergência |
| Diferença de competência (caixa × NFS-e) | — | (ii) | — |

**Recomendação do alerta MEI (F-PR4-9):** o alerta **não deve depender de declaração** "vendo só para PF", porque a lei diz o que é dispensado pelo **tipo de tomador**, não pela declaração. Enquanto a receita não tiver tomador, o alerta fica **desligado para o MEI** e o alerta de limite (LIMITE_MEI_EXCEDIDO) continua. Quando houver tomador, ele passa a comparar só serviço a CNPJ (art. 106 II "b.1").

**Recomendação do alerta ME (F-PR4-10):** manter. Tratar locação e documento municipal como (ii), com motivo; excluir só o que a lei excluir (cota do salão já excluída). Revisar em 01/11/2026 quando a Res. 191 entrar em vigor.

### Forks da Pergunta 3

**F-PR4-9 — Alerta NFSE_DIVERGE do MEI: ligado, desligado ou dependente de declaração?**
- (a) ligado, comparando toda a receita de serviço (como está hoje) — **não recomendado** (divergência falsa, art. 106 II "a.1");
- (b) **desligado** até a receita ter tomador; depois, comparar só serviço a CNPJ — **recomendado**;
- (c) dependente de declaração "vende só para PF" no perfil — não recomendado (a lei é por tomador, não por declaração).
Impacto: `conferirNfse` (`SimplesApuracaoService.ts`, a partir da linha 506) e `montarMei` (linha 442); modelo de receita fiscal (campo de tomador, se houver).

**F-PR4-10 — Alerta NFSE_DIVERGE do ME: tratamento de locação de bem móvel e de documento municipal**
- (a) excluir locação e documento municipal da soma;
- (b) alerta informativo com motivo para ambos — **recomendado** até ler a LC 116 e o art. 59 § 1º no texto do município;
- (c) manter como está.
Impacto: `conferirNfse`, filtro de natureza (`LOCACAO_MOVEL` hoje entra) e tabela de documentos (`kind`). Consultar a LC 116 antes de (a).

**F-PR4-11 — Simetria da cota do salão-parceiro no MEI (linha 442 × linha 367)**
- (a) aplicar ao MEI o mesmo filtro do ME (`servicosPa` sem `ALUGUEL_BEM_MOVEL`) — **recomendado** se a Lei 12.592 art. 1º-A § 5º confirmar a cota fora da receita do salão, para ME e MEI;
- (b) manter a diferença, se a lei tratar ME e MEI de forma diferente (não há essa diferença no texto lido).
Impacto: `montarMei` (linha 442). Não é só ajuste de código: depende da leitura da Lei 12.592.

**F-PR4-12 — Base de data da conferência: competência ou caixa**
- (a) manter `dCompet` por competência (atual), sem tratar o regime de caixa — não recomendado enquanto houver ME em caixa;
- (b) competência para o regime de competência e recebimento para o de caixa — **recomendado**, se o perfil tiver a opção;
- (c) tolerância mensal de um mês.
Impacto: `FiscalDocumentRepository.ts` (`somaNfseAutorizadaNaCompetencia`) e a leitura de receita. **Antes de ratificar: confirmar o significado de `dCompet` no Anexo I.**

---

## Não achado / não lido (com onde procurar)

1. **LC 123 (texto Planalto):** art. 21 § 4º (redação vigente, incisos I e II e § 4º-A), art. 26 §§ 6º, 9º e 10, art. 18 § 1º-B (teto do ISS), art. 3º §§ 9º-A e art. 13-A, art. 18-A § 1º (MEI). Onde: `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm` (ECONNRESET nesta sessão; sha esperado no MANIFEST `07ee7d3adc22…`).
2. **LC 214 (texto Planalto):** art. 517 (janela do RBT12 em 2027), art. 543 e art. 544 III (revogações e vigência). Onde: `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm` (ECONNRESET).
3. **LC 227/2026, art. 169 (fonte secundária, não verificada):** a busca sugere que ela acrescenta um inciso I ao art. 21 § 4º a partir de 01/01/2027, trocando o mês de referência da alíquota (do mês anterior para o mês da prestação), e que a LC 214 revoga o § 4º só em 2033. **Não confirmei nenhuma das duas afirmações.** Os sites de terceiros que trazem isso responderam 403. Esse ponto é a **resposta da redação de 2027 do inciso II**, e está em aberto. Onde: planalto.gov.br (lcp227 não respondeu; buscar a LC pelo número e pelo art. 169).
4. **LC 116 art. 6º e art. 8º-A** (piso de ISS e retenção pelo tomador). Onde: `http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm` (ECONNRESET).
5. **Lei 12.592/2012 art. 1º-A §§ 4º e 5º** (cota-parte fora da receita do salão). Onde: `https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12592.htm` (não tentado nesta fase; o WebFetch anterior também caiu em ECONNRESET).
6. **Res. CGSN 191/2026 (texto):** não compilado pela RFB. Onde: Portal do Simples Nacional e DOU, data 04/08/2026. Só li a notícia.
7. **Res. CGSN 169/2022 (texto):** não lido. Fonte secundária diz NFS-e nacional facultativa para MEI em 2023 e obrigatória a partir de NT 2023.001 (datas divergentes). Onde: DOU e `gov.br/nfse` (NT 2023.001).
8. **Res. 140 art. 100 (limite do MEI) e art. 106 § 1º:** não li. Onde: `docs/accounting/fontes-oficiais/Res-CGSN-140-2018.txt`, busca "Art. 100".
9. **Leiaute NFS-e (Anexo I, `dCompet`):** não está no disco. Onde: MANIFEST `nfse-anexo-i`; baixar pela URL do MANIFEST.
10. **Manual do PGDAS-D e DEFIS:** não está no disco; não baixado (ECONNRESET/rede). Não era necessário para estas três perguntas.
11. **sha256 de bytes baixados nesta sessão:** nenhum, porque o host de download não respondeu. Os hashes citados vêm do MANIFEST e da transcrição. O `.txt` da Res. 140 não pode ser ligado ao `.json` do MANIFEST pelo hash.
12. **Testes do PR-4:** não rodei; li só os nomes e o teste de alíquotas (`simplesApuracao.integration.test.ts:277`, caso 2026-07: 10,56% × 32,50% = 3,4320%, consistente com o art. 27 I "a").

---

## Questionário para o dono (uma pergunta por fork — nenhum fork está ratificado)

Os forks não se ratificam sozinhos. Respostas em chat; eu não implemento nada antes do "executa".

1. **F-PR4-1 — "início de atividade" para a retenção:** (a) data de abertura do CNPJ (art. 2º V) — recomendado; (b) data da opção pelo Simples; (c) primeiro mês com receita. Qual?
2. **F-PR4-2 — 2º mês de atividade e janela de 2027:** para o 2º mês, (a) receita do mês de início × 12 (como hoje) — recomendado —, (b) exigir 5%, ou (c) 2%? Para 2027: manter a janela M−13…M−2 ou seguir a janela nova do art. 517 da LC 214 (ainda não lida)?
3. **F-PR4-3 — mês de início:** a rota deve devolver 2% por atividade no mês de início (art. 27 II) — recomendado —, não devolver nada e alertar, ou 5%?
4. **F-PR4-4 — atividade sem receita no mês anterior:** (a) faixa do RBT12 global × anexo da atividade — recomendado —, (b) 2%, ou (c) 5%?
5. **F-PR4-5 — piso de ISS:** (a) sem piso (texto da Res. 140) até ler a LC 116 art. 8º-A — recomendado —, (b) piso de 2% se a LC 116 alcançar a retenção, ou (c) só alerta? *Gate: a LC 116 precisa ser lida antes de escolher (b).*
6. **F-PR4-6 — papel da rota:** (a) sugere, com faixa, mês de referência, janela e aviso de responsabilidade (art. 27 VI) — recomendado —, ou (b) calcula e declara válida?
7. **F-PR4-7 — parâmetro de limite ausente:** (a) erro 400/422 em todo caso; (b) alerta `PARAMETRO_AUSENTE` com bloqueio do registro do DAS — recomendado —, ou (c) manter o silêncio?
8. **F-PR4-8 — teto do ISS ausente (G3, `simplesCalc.ts:368–369`):** o mesmo tratamento do F-PR4-7 — (b) recomendado —, ou manter o silêncio?
9. **F-PR4-9 — alerta NFSE_DIVERGE do MEI:** (a) ligado, comparando toda receita de serviço, (b) desligado até a receita ter tomador, depois só serviço a CNPJ — recomendado —, ou (c) dependente de declaração "vende só para PF"?
10. **F-PR4-10 — alerta NFSE_DIVERGE do ME:** para locação de bem móvel e documento municipal, (a) excluir da soma, (b) alerta informativo com motivo — recomendado —, ou (c) manter como está?
11. **F-PR4-11 — cota do salão-parceiro no MEI (`montarMei`, linha 442):** aplicar o mesmo filtro do ME — recomendado se a Lei 12.592 art. 1º-A § 5º confirmar — ou manter a diferença?
12. **F-PR4-12 — base de data da conferência:** (a) `dCompet` por competência como hoje, (b) competência para regime de competência e recebimento para o de caixa — recomendado —, ou (c) tolerância de um mês? *Gate: confirmar o significado de `dCompet` no Anexo I antes.*

---

## Próximos passos que não dependem do dono (sem código)

- Ler no Planalto: LC 123 art. 21 § 4º, art. 26 §§ 6º, 9º, 10; LC 214 art. 517, 543, 544; LC 116 art. 8º-A e art. 6º. Repetir a pesquisa quando a rede voltar.
- Baixar e conferir o sha256 do leiaute NFS-e (Anexo I) e do Manual PGDAS-D pela URL do MANIFEST.
- Rodar a suíte do PR-4 para medir o custo real de F-PR4-7 (tabelas ausentes nas fixtures).
