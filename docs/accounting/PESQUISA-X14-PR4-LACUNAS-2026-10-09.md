# Pesquisa X14 PR-4 — lacunas do review (alíquota de retenção, parâmetro ausente, alerta NFS-e)

Data: 2026-10-09 · Nó: X14 (`docs/plano/nos/X14.md`) · Código lido: branch `claude/mei-contracts-simei-routing-7d3f0d` (HEAD `5e226e0d`; commits `1c885169`, `8f098e4b`, `5e226e0d`) · Esta sessão não escreveu código.

**Conclusão:** a rota `GET …/simples/aliquotas/:competencia` implementa só o inciso I do art. 27 da Res. CGSN 140 (faixa do mês anterior). Não implementa o inciso II (2% no mês de início, vigente até 31/12/2032) nem o inciso V (5% sem informação). Em 2027 ela erra a janela em um mês: a LC 227/2026 passa a referência da alíquota para o mês da prestação, e o código continua a montar o mês anterior. Para atividade sem receita no mês anterior, a rota devolve a lista sem essa atividade, sem erro e sem alerta. O alerta de NFS-e do MEI compara receita que a lei dispensa de nota (venda a pessoa física).

**Risco principal:** a partir de 02/2027 a rota sugere alíquota pela faixa errada: janela M−14…M−3, quando a lei manda M−13…M−2. Pelo art. 27 VI, quem responde pela diferença é o prestador, e a rota não avisa. Esse risco é verificado no texto da LC 227 e no código, mas não executado em teste.

> **Revisão de 2026-10-09 (2ª sessão):** a 1ª versão deste arquivo, na branch `claude/iss-retencao-inicio-atividade-cf3ce6`, não tinha lido a LC 123, a LC 214, a LC 116, a Lei 12.592 nem o Anexo I da NFS-e (ECONNRESET). Esta versão leu todos no Planalto e no gov.br. Mudou: §0, 1a (texto da LC e de 2027), 1c (risco de 2027 agora verificado), 1e (piso e teto), 2a (G3 rebaixado), 2b, 3a, 3b, 3c, o pseudocódigo (novo) e os forks F-PR4-2, 5, 8, 11, 12 e 13 (novo). O que segue sem leitura está no fim do arquivo.

---

## 0. Fontes e o que foi lido

| Fonte | Como foi lida | Grau |
|---|---|---|
| Res. CGSN 140/2018, texto multivigente até Res. 183/2025 — `docs/accounting/fontes-oficiais/Res-CGSN-140-2018.txt` | Lida no disco. sha256 do `.txt` local: `15792fa0fa0568d6e28a7ce135c4b565f9715eb4e878d36fb0c3e079b801ac69`. O MANIFEST registra `8d9b024965c1…` para o `.json` de origem; **não consegui ligar o `.txt` ao `.json`** pelo hash. | verificado (texto) |
| Transcrição das tabelas (LC 123 Anexos I–V; LC 214 Anexos XVIII–XXII) — `TRANSCRICAO-SIMPLES-ANEXOS-LC123-LC214-2026-10-07.txt` | Lida. sha256 `a7f08527…` do arquivo; o sha do texto LC 123 citado nele, `07ee7d3adc227cc2a4781a57cda10c26ec6d5599ab6d1879605bb1ad3c766515`, bate com o MANIFEST. Tem **só tabelas**, nenhum artigo. | verificado (tabelas) |
| Código PR-4: `SimplesApuracaoService.ts` (métodos `montar`, `limites`, `limiteMei`, `montarMei`, `conferirNfse`, `aliquotas`), `simplesCalc.ts` (`rbt12`, `fatorR`, `apurar`, `apurarSimei`), `FiscalDocumentRepository.ts` (`somaNfseAutorizadaNaCompetencia`), `legalParameter.ts` (`linhaLegalVigente`) | Lidos via `git show`/`git grep` na branch PR-4 (o worktree atual é outra branch). Não rodei testes. | verificado (código) |
| Notícia RFB sobre Res. CGSN 191/2026 (NFS-e nacional para ME/EPP a partir de 01/11/2026) — gov.br | Lida via WebFetch (texto, não bytes). sha do MANIFEST `be6cc4a38faf…` não recalculado. | verificado (notícia oficial); texto da resolução **não lido** |
| LC 123/2006 — `planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm`, baixada 2026-10-09 | Lida (art. 3º I/II, 13-A, 18-A § 1º, 21 § 4º e § 4º-A, 26). 1.622.252 bytes, sha256 `a0c5393b3c582d7696ca5d074d3474175632ff1b89180e3ee372c6e0e64b5be7` | verificado |
| LC 214/2025 — `…/lcp214.htm`, 2026-10-09 | Lida (art. 517 → LC 123 art. 18 § 1º e § 1º-A; art. 543 V "d"; art. 544). 5.403.613 bytes, sha256 `693848766f5d8d92e3eac908f4c704ffcdd14fccb105394d7dc61ff689f69c93` | verificado |
| LC 227/2026 — `…/lcp227.htm`, 2026-10-09 | Lida (art. 169 → LC 123 art. 21 § 4º I; art. 181; art. 182). 1.334.008 bytes, sha256 `756da1f19e5c36b9756ed816cdfa5fdea6121a61bec35d9c89c53aa2747f1cd8` | verificado |
| LC 116/2003 — `…/lcp116.htm`, 2026-10-09 | Lida (art. 6º, 8º, 8º-A, lista item 3.01). 104.392 bytes, sha256 `362a27fdda324e42649cd6f3bc43c9ab460849b9a3474ebd53a688577b5132f3` | verificado |
| Lei 12.592/2012 — `…/_ato2011-2014/2012/lei/l12592.htm`, 2026-10-09 | Lida (art. 1º-A §§ 4º, 5º, 7º). 21.926 bytes, sha256 `26689429c556e35a789bd129e4668c46875ad2a4bccc14d171fd35f551dc1809` | verificado |
| Anexo I NFS-e v1.01 (leiaute DPS/NFS-e) — URL `nfse-anexo-i` do MANIFEST | Lido (`dCompet` e regras de validação). sha256 `de5bc492959eadc8bfa7540e16939995924f2188f743648eaf84d3b31e9eeb7c` — **bate com o MANIFEST** (`de5bc492959e`) | verificado |
| Manual do PGDAS-D e DEFIS (URL do MANIFEST) | **Não lido.** Não era necessário para as três perguntas. | — |

**sha256 dos HTML do Planalto não identifica a versão (verificado):** as quatro páginas baixadas têm **o mesmo tamanho** registrado no MANIFEST (LC 123 1.622.252; LC 214 5.403.613; LC 116 104.392; Lei 12.592 21.926) e **sha256 diferente**. Uma segunda cópia da LC 116, baixada minutos depois, veio com outro tamanho (102.833 bytes) e outro hash. O Planalto varia bytes entre requisições, então o sha256 do HTML não serve para afirmar "mesmo documento". A âncora deste arquivo é **o trecho citado + a data de leitura**. Isso vale também para o `fonteSha256` gravado nas linhas `SIMPLES_TETO_ISS` do seed. (Não investiguei quais bytes mudam.)

**Compilação do Planalto atrasada (verificado):** a página compilada da LC 123 **não mostra** a redação da LC 227 no art. 21 § 4º I (a busca por "mês da prestação" no texto da LC 123 não acha nada). A nova redação só aparece no texto da própria LC 227. Quem ler só a LC 123 compilada perde a mudança de 2027.
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

**LC 123 art. 21 § 4º — redação vigente (verificado, Planalto 2026-10-09).** O caput diz: "A retenção na fonte de ISS das microempresas ou das empresas de pequeno porte optantes pelo Simples Nacional somente será permitida se observado o disposto no art. 3º da Lei Complementar nº 116 […] e deverá observar as seguintes normas". Os incisos vigentes:
- **I** (red. LC 155/2016): "corresponderá à alíquota efetiva de ISS a que a microempresa ou a empresa de pequeno porte estiver sujeita no mês anterior ao da prestação";
- **II** (red. LC 155/2016): "na hipótese de o serviço sujeito à retenção ser prestado no mês de início de atividades […], deverá ser aplicada pelo tomador a alíquota efetiva de 2% (dois por cento)";
- **III**: diferença recolhida "no mês subseqüente ao do início de atividade em guia própria do Município";
- **IV**: valores fixos mensais, sem retenção. O texto da LC **não** tem a ressalva "salvo quando o ISS for devido a outro Município", que está só na Res. 140 art. 27 IV;
- **V** (red. LC 155/2016): sem informação no documento, "alíquota efetiva de 5% (cinco por cento)";
- **VI** e **VII**: iguais aos da Res. 140.
- **§ 4º-A**: responsabilidade criminal e tributária pela falsidade nas informações dos incisos I e II.

**Redação de 2027 (verificado, LC 227/2026):** o art. 169 dá nova redação **só ao inciso I**: "a alíquota aplicável na retenção na fonte deverá ser informada no documento fiscal e corresponderá à alíquota efetiva de ISS a que a microempresa ou a empresa de pequeno porte estiver sujeita **no mês da prestação**". Efeitos a partir de **1º/01/2027** (LC 227 art. 182, I, "b"). O bloco do art. 21 no art. 169 tem pontilhado nos demais incisos, então o **inciso II não muda**.

**Revogação (verificado, LC 214):** o art. 543, V, "d", revoga "os §§ 4º e § 4-A do art. 21" da LC 123 **a partir de 1º/01/2033** (art. 543, caput, e art. 544, V). A data coincide com a extinção do ISS (LC 214 art. 543 IV revoga a LC 116 na mesma data).

**Resposta ao item 1a:** o inciso II (2% no mês de início) **não foi alterado nem revogado** até hoje. Ele vale até 31/12/2032 e cai com o § 4º em 1º/01/2033. O inciso I muda de "mês anterior" para "mês da prestação" em 1º/01/2027. A Res. 140 compilada (até a Res. 183/2025) ainda traz a redação de 2018, e não achei resolução do CGSN que a ajuste para 2027 (a Res. 191/2026 não está compilada; ver lista final).

Nota de leitura: um site de terceiros citava "LC 227 art. 169 acrescenta inciso I ao art. 21 § 4º". O texto oficial mostra **nova redação** do inciso I, e não acréscimo. A LC 227 art. 181, IV, "b", revoga "os incisos I e II do § 4º do art. **41**" da LC 123, que é outro dispositivo, não o art. 21. Conferi para não confundir.

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

**Defasagem de 2027 (verificado na lei e no código; não executado):**
- **Lei:** a LC 214 art. 517 dá nova redação ao LC 123 art. 18 § 1º: "o sujeito passivo utilizará a receita bruta acumulada nos doze meses antecedentes ao mês anterior ao do período de apuração" (§ 1º-A I, RBT12, no mesmo sentido; efeitos em 1º/01/2027 pelo art. 544 III). Junto com a LC 227 (retenção "no mês da prestação"), a janela legal da retenção do mês M em 2027 é a do **PA = M**, ou seja, **M−13 … M−2**. É a mesma janela de 2026: a lei trocou as duas referências ao mesmo tempo, e o intervalo de meses ficou igual.
- **Código:** `aliquotas()` faz `mesReferencia = proximo(competencia, -1)` e `montar(M−1)`, e `janelaRbt12(comp)` para `comp ≥ INICIO_LC214` devolve `comp−13 … comp−2` (`simplesCalc.ts`, função `janelaRbt12`). Com comp = M−1, a janela vira **M−14 … M−3**.
- **Efeito:** a partir de **M = 2027-02** a rota usa a janela um mês mais antiga. Em **M = 2027-01** a janela fica certa (comp = 2026-12 usa a regra antiga, 2025-12 … 2026-11), mas a tabela é a de 2026, quando a lei manda a alíquota efetiva **do mês da prestação** (tabelas de 2027, com IBS/CBS). Em consequência, `creditoAdquirente` sai com IBS/CBS `null` em 2027-01. Isso é inferido: `percentuais` de 2026 não têm IBS/CBS. Não executei.
- **Correção sugerida (não é decisão):** para M ≥ 2027-01, a faixa sai do RBT12 do PA = M e as tabelas são as vigentes em M. Trocar `montar(M−1)` por `montar(M)` **não basta**: `montar` lista as atividades a partir da receita do próprio PA, e a receita do mês da prestação costuma estar incompleta ou vazia quando a nota é emitida. A rota precisa calcular a faixa sem depender da receita do mês, o que é a mesma mudança do F-PR4-4 (inferido da leitura de `montar`). → Fork **F-PR4-2**, parte 2027.

### 1d. Atividade sem receita no mês anterior

**O que a norma diz (verificado, art. 27 I):** a faixa é a da **ME** ("a faixa de receita bruta a que a ME ou EPP estiver sujeita no mês anterior"), e não a da atividade. A faixa vem do RBT12 e o art. 21 II "a" define RBT12 como "receita bruta acumulada nos doze meses anteriores ao período de apuração" (verificado), sem separar por atividade. O anexo vem da atividade (Anexo III, IV ou V; a regra de enquadramento por anexo não foi lida no LC 123 art. 18 §§ 5º-C e 5º-I, que não estão no disco).

- **Qual alíquota:** faixa do RBT12 **global** da empresa × anexo da atividade (inferido do texto "a faixa a que a ME estiver sujeita"). Não é 2%, porque o inciso II só vale no mês de início. Não é 5%, porque o inciso V só vale quando não há informação.
- **Anexo e faixa dependem de quê:** o anexo depende da natureza da atividade. A faixa depende do RBT12 global. A receita **da atividade** no mês anterior não entra na faixa. (inferido)
- **Fator R:** art. 26 (verificado) define r como folha dos 12 meses anteriores ao PA ÷ receita bruta dos mesmos 12 meses (incisos I e II). A exigência é **na janela**, não no mês: a falta de folha **no mês anterior** não impede o cálculo. O código faz o mesmo (`fatorR(... base.meses ...)`, verificado). Mas a atividade sem receita no mês anterior **nem aparece** na lista hoje, então o fator R dela não chega à rota (verificado: `aliquotas` só lê `calculada.atividades`).

**Gap G2 (verificado no código):** `aliquotas()` monta as atividades a partir da receita de M−1 (`montar`). Atividade nova no mês M não aparece na resposta, sem erro e sem alerta. Quem consome a rota não sabe que falta a alíquota dela.

→ Fork **F-PR4-4**.

### 1e. Piso ou teto na retenção

- **Teto:** a própria Res. 140 põe teto de 5% no ISS efetivo: art. 21 III "a" — "o percentual efetivo máximo destinado ao ISS será de 5% (cinco por cento)" (verificado). E o código aplica o teto antes de devolver `percentuais.ISS` (verificado, `simplesCalc.ts` linhas 366–369: `if (iss && teto && cmp(iss, BP(teto.percentualBp)) > 0)`). Então **sim, o teto vale para a retenção**, porque a rota lê `percentuais.ISS` depois do teto.
  - A LC 123 tem a mesma regra. A nota "(*)" dos Anexos III e IV diz "O percentual efetivo máximo devido ao ISS será de 5%, transferindo-se a diferença […] aos tributos federais". De 2027 em diante, o art. 18 § 1º-B I (red. LC 227) diz o mesmo, transferindo também ao IBS. O teto cai para 4,5% em 2029, 4% em 2030, 3,5% em 2031 e 3% em 2032 (Anexos XX/XXI da LC 214, red. LC 227, na transcrição de 07/10). (verificado)
  - **G3 rebaixado (verificado):** o `if` tem `teto &&`, e sem linha `SIMPLES_TETO_ISS` o ISS não é limitado. Mas a ausência é **legítima** em dois casos: (1) **Anexo V**, que não tem nota de teto na LC 123 porque o ISS máximo dele é 23,5% × 21,275% = **4,9996%** (5ª faixa, RBT12 de R$ 3,6 mi), abaixo de 5% (calculado das tabelas); (2) **2033 em diante**, sem ISS. O seed tem teto só para III e IV, de 2018 a 2032 (12 linhas `sn1-teto-*`, verificado). O silêncio só é defeito para **III/IV antes de 2033**.
- **Piso (verificado):** a LC 116 art. 8º-A diz: "A alíquota mínima do Imposto sobre Serviços de Qualquer Natureza é de 2% (dois por cento)". O § 1º proíbe isenção ou benefício "que resulte […] em carga tributária menor que a decorrente da aplicação da alíquota mínima", e o § 2º anula "a lei ou o ato do Município" que não a respeite. O destinatário é a **lei municipal**. A Res. 140 leva o piso ao Simples **só para benefício municipal**: o art. 31, parágrafo único, diz que a isenção, a redução ou o valor fixo do ISS "não poderão resultar em percentual menor do que 2%", com exceção dos subitens 7.02, 7.05 e 16.01.
- **O percentual que sai da tabela pode ficar abaixo de 2% (calculado, verificado nas tabelas):** no início da 2ª faixa (RBT12 = R$ 180.000,01), Anexo III: efetiva 6,00% × 32,00% = **1,92%**; Anexo IV: efetiva 4,50% × 40,00% = **1,80%**. Na 1ª faixa: III = 2,01%, IV = 2,0025%, V = 2,17%. Nenhuma norma lida manda elevar o percentual da tabela a 2%. A LC 123 é a lei especial que fixa a partilha. **Inferido:** sem piso no inciso I. O piso só entra quando a alíquota informada decorre de benefício municipal (art. 27 § 1º + art. 31 parágrafo único).
- **O 2% do inciso II é alíquota fixa do mês de início, não piso** (verificado pela redação).

→ Fork **F-PR4-5** (agora com base lida).

### 1f. Erro do prestador ao informar a alíquota

**Verificado (art. 27 VI e III):** a responsabilidade do prestador **não é eximida** quando a alíquota informada é inferior à devida, e a diferença é recolhida em guia municipal. No caso do inciso II, a diferença é paga no mês seguinte ao do início (III). O § 3º prevê responsabilidade criminal e tributária do responsável, do titular e dos sócios pela falsidade.

- **Quem responde:** o prestador (VI). Quem informa a alíquota é o prestador, não a rota.
- **Efeito na escolha "a rota calcula" × "a rota só sugere":** a rota não tem o dever legal de calcular, e o prestador responde de todo jeito. Mas o § 2º do art. 27 deixa o **município** definir os critérios de informação da alíquota efetiva, e o § 1º trata de isenção municipal que a rota não conhece. Uma rota que "calcula" passa a parecer autoridade sobre algo que o município pode regular diferente. **Recomendação: "sugere" + alerta** com a faixa, o mês de referência e a janela usada (F-PR4-6).

### Regra completa em pseudocódigo (fonte por ramo)

```
aliquotaRetencaoIss(empresa, M /* mês da prestação */, atividade):
  se M >= 2033-01:                       -> SEM_RETENCAO_ISS        # LC 214 art. 543 V "d" + art. 544 V (verificado)
  se empresa.ehMei:                      -> ERRO "MEI: valores fixos" # Res. 140 art. 101; LC 123 art. 21 § 4º IV (verificado)
  se empresa.issPorValorFixoMunicipal:                                 # LC 123 art. 21 § 4º IV; Res. 140 art. 27 IV (verificado)
      se issDevidoAOutroMunicipio:       -> segue para o cálculo     # ressalva só na Res. 140 art. 27 IV (verificado)
      senão                              -> SEM_RETENCAO
  S := mês(dataAberturaCNPJ)                                           # Res. 140 art. 2º V (verificado); migração de regime não reinicia (inferido) — F-PR4-1
  se M == S:                             -> 2,00% + aviso "diferença no mês S+1, guia municipal"
                                                                       # LC 123 art. 21 § 4º II e III; Res. 140 art. 27 II e III (verificado)
  PA := (M < 2027-01) ? M−1 : M                                        # mês anterior até 2026 (LC 123 21 § 4º I red. LC 155);
                                                                       # mês da prestação a partir de 2027 (red. LC 227 art. 169; efeitos art. 182 I "b") (verificado)
  RBT12 := se PA < 2027-01: soma(PA−12 … PA−1)                         # LC 123 art. 18 § 1º red. LC 155; Res. 140 art. 21 II "a" (verificado)
           senão:          soma(PA−13 … PA−2)                          # LC 123 art. 18 § 1º red. LC 214 art. 517 (verificado)
           — em ambos os casos a janela é M−13 … M−2
           se início < 13 meses antes de M: média(meses de S até o fim da janela) × 12
                                                                       # Res. 140 art. 27 I "b" (verificado; texto de 2018)
           se nenhum mês na janela (M == S+1): ??? — F-PR4-2 (a norma não fecha)
  faixa := faixa(RBT12 GLOBAL da empresa)                              # "faixa a que a ME ou EPP estiver sujeita" (verificado; global = inferido)
  anexo := anexo(atividade, fatorR(janela de 12 meses))                # LC 123 art. 18 §§ 5º-C/5º-I (não lidos); fator r = Res. 140 art. 26 (verificado)
  iss := efetiva(faixa, anexo, tabelas vigentes em PA) × repartiçãoISS(faixa, anexo)
  iss := min(iss, tetoIss(anexo, ano))   # 5% até 2028; 4,5/4/3,5/3% em 2029–32; III e IV apenas (verificado); V sem teto (calculado)
  se benefícioMunicipal(atividade):      iss := max(alíquotaDoBenefício, 2%) salvo 7.02/7.05/16.01
                                                                       # Res. 140 art. 27 § 1º + art. 31 parágrafo único; LC 116 art. 8º-A § 1º (verificado)
  retorno: SUGESTÃO {iss, PA, janela, faixa, anexo, regra}
           + aviso "prestador responde pela diferença" (LC 123 art. 21 § 4º VI) e "município pode ter critério próprio" (Res. 140 art. 27 § 2º)
  # se o prestador não informar no documento: 5%  (LC 123 art. 21 § 4º V red. LC 155) — vale para o tomador, a rota só informa
```

### Casos-limite numerados (resumo)

1. Início no mês da prestação: 2% (II). Código devolve lista vazia (G1).
2. Início no mês anterior: janela com um mês só (lacuna da norma, F-PR4-2).
3. Início há menos de 13 meses: média × 12 (código bate).
4. Início há 13 meses ou mais: acumulado 12 meses (código bate).
5. Migração de outro regime: não é início pelo art. 2º V (inferido).
6. Atividade nova sem receita no mês anterior: some da lista (G2).
7. Anexo III/V com fator R sem folha no mês anterior: o fator R é da janela, não do mês (código bate, mas a atividade não chega à rota).
8. ISS efetivo acima do teto (5% até 2028; 4,5/4/3,5/3% de 2029 a 2032): o teto existe só nos Anexos III e IV. O Anexo V não precisa (máximo de 4,9996%). Teto ausente só é defeito em III/IV antes de 2033 (G3).
9. ISS efetivo abaixo de 2% (2ª faixa: Anexo III = 1,92%, Anexo IV = 1,80%): sem piso. O piso de 2% vale só para benefício municipal (Res. 140 art. 31 parágrafo único; LC 116 art. 8º-A § 1º).
10. Prestador informa alíquota errada: prestador responde (art. 27 VI).
11. Município com regra própria (§ 2º): rota não sabe.
12. Retenção de 2027-02 em diante: o código usa M−14…M−3, e a lei manda M−13…M−2 (verificado: LC 227 art. 169 + LC 214 art. 517 + `janelaRbt12`). Em 2027-01 a janela fica certa, mas a tabela usada é a de 2026, não a de 2027.
13. A partir de 2033-01 não há retenção de ISS (§ 4º revogado; ISS extinto).
14. ME com ISS por valor fixo municipal e serviço devido a outro município: a Res. 140 art. 27 IV manda reter; a LC 123 § 4º IV não traz essa ressalva (verificado nos dois textos). A rota não sabe se há valor fixo.

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
Para 2027 (base lida: LC 227 art. 169 + LC 214 art. 517): (a) a rota usa PA = M (mês da prestação) e as tabelas de M, o que dá a janela M−13…M−2 — **recomendado**, porque é o texto da lei; (b) manter `montar(M−1)`, que dá M−14…M−3 e contradiz a LC 227. A opção (a) depende do F-PR4-4 (faixa calculada sem depender da receita do mês).
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
- (a) sem piso no percentual da tabela; piso de 2% só quando a alíquota vem de benefício municipal (Res. 140 art. 31 parágrafo único; LC 116 art. 8º-A § 1º; os dois lidos) — **recomendado**;
- (b) piso de 2% sempre: sem base lida, porque nenhum texto manda elevar o percentual da tabela;
- (c) só alerta informativo quando o efetivo ficar abaixo de 2%, dizendo que é o percentual da tabela.
Impacto: hoje nenhum, porque a rota não conhece benefício municipal. Com (a), o ramo só existe quando o perfil tiver benefício municipal (art. 27 § 1º). O gate anterior (ler a LC 116) está **fechado**.

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
| `simplesCalc.ts:368–369` (teto do ISS) | `teto` `undefined` → `if (iss && teto && …)` pula o teto | **G3**: ISS sem limite, em silêncio. **Dinheiro**, mas só em III/IV antes de 2033: Anexo V e 2033+ não têm teto por lei (ver 1e) |
| `simplesCalc.ts:479–481` (`apurarSimei`, função `valor`) | lança `Error` | Padrão explícito. O SIMEI já responde 400 (`SimplesApuracaoService.ts`, `montarMei`, "Não há parâmetro legal publicado para o SIMEI…"). |
| `models/issLimite.ts:12` (`issAliquotaMaxBp`) | lança `SemLinhaVigenteError` | Explícito. |
| `models/pisCofinsParams.ts:43, 90` | lança erro (`pisCofinsParams: linha … fora do formato`; `SemLinhaVigenteError`) | Explícito. |
| `lib/ecf.ts:54`, `lib/sped.ts:133` (`LEIAUTE_SPED`) | retorna `undefined` a quem chama | Não li o chamador; o teste `companyFiscalProfile.sped.integration.test.ts:18` diz "sem linha vigente de LEIAUTE_SPED" → **400**, então é erro explícito. |

Conclusão do 2a: o repositório tem **três políticas** coexistindo: erro explícito (SIMEI, ISS máximo, PIS/COFINS, SPED), silêncio com `undefined` (teto do ISS) e silêncio com `?? 0` (limites, limiteMei). As duas de silêncio que tocam o cálculo são S1 e S2 e G3.

Os demais `?? 0` no `SimplesApuracaoService.ts` (`receitaPa ?? 0n` na linha 340 e `hist.get(...) ?? 0`) são **ausência de receita = zero**, que está certo. Não são parâmetro.

### 2b. Vigência dos limites da LC 123

- **Lido na LC 123, Planalto (verificado):**
  - art. 3º I: ME com receita bruta "igual ou inferior a R$ 360.000,00";
  - art. 3º II (red. LC 155/2016): EPP "superior a R$ 360.000,00 e igual ou inferior a R$ 4.800.000,00";
  - art. 13-A (incl. LC 155/2016): "Para efeito de recolhimento do ICMS e do ISS no Simples Nacional, o limite máximo […] será de R$ 3.600.000,00";
  - art. 18-A § 1º (red. LC 188/2021): MEI com receita bruta "no ano-calendário anterior, de até R$ 81.000,00".
  - **Res. 140 art. 100** (verificado): caput R$ 81.000,00; § 1º, no início de atividade, R$ 6.750,00 × meses até o fim do ano; § 1º-A, **transportador autônomo de cargas** (tabela B do Anexo XI), R$ 251.600,00 e, no início, R$ 20.966,67 × meses.
- **Vigência aberta (verificado):** nenhum desses dispositivos tem data de fim, e a LC 214 e a LC 227 não alteram esses valores (a única redação da LC 214 no art. 13-A é a extensão ao IBS, segundo o próprio seed, `sn1-lim-sublimite`; não conferi esse trecho no texto). O seed grava `vigenteAte = NULL` nas 4 linhas (verificado).
- **Projetos de alteração (Câmara, via busca; ficha não aberta):** PLP 108/2021 (Senado → Câmara), que eleva o limite do MEI para R$ 130 mil. Situação, segundo o portal da Câmara: comissão especial, "aguardando parecer do relator"; último ato registrado em 01/07/2026 (requerimento de seminário). Não está sancionado. Ficha: `camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2295251`. O "PLP 186/2026 do governo", citado na 1ª versão, **não foi confirmado**: a busca só achou o anúncio do ministro de que o governo apresentaria proposta. Retirado como fato.
- **Achado lateral (verificado no código):** `limiteMei` lê só a chave `MEI` (R$ 81 mil) e aplica o proporcional de início, o que bate com o § 1º. **Não trata o TAC** (§ 1º-A): MEI transportador autônomo entre R$ 81 mil e R$ 251,6 mil recebe LIMITE_MEI_EXCEDIDO falso. → Fork **F-PR4-13**.
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

**Recomendação (F-PR4-7):** (b) para S1 e S2, com `PARAMETRO_AUSENTE` em `BLOQUEANTES` (registro do DAS bloqueado; cálculo visível). Para o SIMEI, manter (a), que já existe. Para `LEIAUTE_SPED`, `ISS_LIMITE` e PIS/COFINS, manter o padrão atual.

**F-PR4-8 (G3, teto do ISS):** a ausência só é falha quando `anexo ∈ {III, IV}` e a data é anterior a 2033-01. Opções: (a) `PARAMETRO_AUSENTE` só nesse recorte — **recomendado**, porque em V e em 2033+ a falta de linha é a própria lei; (b) alerta em toda ausência, o que geraria falso alerta em todo cálculo de Anexo V; (c) manter o silêncio. Impacto: `simplesCalc.ts`, bloco do teto (`if (iss && teto && …)`).

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
- **LC 123 (verificado, Planalto):** art. 26 § 1º: o MEI comprova a receita pelo registro de vendas, "ficando dispensado da emissão do documento fiscal previsto no inciso I do caput, ressalvadas as hipóteses de emissão obrigatória previstas pelo referido Comitê". O § 6º II diz: "será obrigatória a emissão de documento fiscal nas vendas e nas prestações de serviços realizadas pelo MEI para destinatário cadastrado no […] CNPJ, ficando dispensado desta emissão para o consumidor final". Os §§ 9º e 10 **não tratam de dispensa**: o § 9º é o apoio do SEBRAE, e o § 10 diz que o documento eletrônico "representa sua própria escrituração fiscal". **Redação de 2027:** a LC 214 altera o art. 26 só no caput II, no § 3º, no § 4º-A II e no § 12-A; **§§ 1º e 6º não mudam** (verificado pelas notas "Redação dada pela LC 214" no texto compilado; a LC 227 não aparece no art. 26).
- **Res. CGSN 169/2022:** o portal NFS-e (gov.br/nfse, "Legislação aplicável ao MEI", lida via WebFetch) a descreve como a norma que "estabelece a obrigatoriedade de emissão de nota fiscal de serviços pelo MEI no padrão nacional", **a partir de 03/04/2023**. Outra página do mesmo portal fala em 01/09/2023. **O texto da 169 não foi lido.** A 169 é anterior à Res. 183/2025, então o texto multivigente da Res. 140 (até a 183) já incorpora o que ela alterou. Nele, o art. 106 II "a.1" (dispensa para pessoa física) **segue vigente** e o art. 106-A traz a NFS-e nacional. Conclusão (inferido do texto compilado): a 169 mudou **o meio** (NFS-e nacional, vedado o emissor municipal), não **quando** o MEI emite.

**Conclusão 3a (verificado + inferido):** a dispensa para PF é a regra do art. 106 II "a.1" e não foi alterada no texto lido. Para o alerta, o que importa é **a receita de serviço a tomador CNPJ**. Hoje `conferirNfse` compara **toda** a receita de serviço (`natureza !== 'REVENDA'`, verificado na linha 513 de `SimplesApuracaoService.ts`), inclusive a vendida a PF, que não tem NFS-e por lei. Isso gera divergência falsa no MEI. O modelo de receita fiscal lido no código **não tem campo de tomador** (verificado por grep: só campos de documento fiscal). Se o campo não existir, o alerta não consegue separar. (inferido de "não há campo" — o grep é de `tomador` em `models/*.ts` e `schema.prisma`, sem exaustão do modelo de receita)

**Defeito de consistência (verificado):** na montagem do ME (`montar`), a conferência recebe `servicosPa`, que **exclui a cota de aluguel de bem móvel do salão-parceiro** (linhas 366–367, review `8f098e4b`). Na montagem do MEI (`montarMei`), a conferência recebe `linhasPa` **sem esse filtro** (linha 442). As duas trilhas ficaram diferentes depois do review. **Lei 12.592 art. 1º-A (verificado, red. Lei 13.352/2016):**
- o § 4º diz que a cota-parte retida pelo salão "ocorrerá a título de atividade de aluguel de bens móveis e de utensílios […] e/ou a título de serviços de gestão, de apoio administrativo, de escritório, de cobrança";
- o § 5º diz: "A cota-parte destinada ao profissional-parceiro não será considerada para o cômputo da receita bruta do salão-parceiro ainda que adotado sistema de emissão de nota fiscal unificada ao consumidor";
- o § 7º diz que o **profissional-parceiro** pode ser MEI.

A lei **não distingue** o porte do salão-parceiro. Se um salão MEI pode ser salão-parceiro (o que depende das ocupações do Anexo XI da Res. 140, não lido), o filtro vale igual. O aluguel de bem móvel **não está na lista do ISS**: o item 3.01 da LC 116 está "(VETADO)" (verificado). Então a cota de aluguel não tem NFS-e, e excluí-la da conferência é coerente com a lei. Já a cota a título de **serviço de gestão** (§ 4º, segunda parte) é serviço e pode ter NFS-e (inferido). → Fork **F-PR4-11**.

### 3b. ME/EPP

**Verificado (Res. 140 art. 59, texto multivigente):**
- art. 59 I: documentos autorizados pelos entes federados onde a empresa tem estabelecimento; II: documentos emitidos pelo sistema nacional, sem custo, quando disponível no Portal.
- § 1º: "Relativamente à prestação de serviços sujeita ao ISS, a ME ou EPP optante pelo Simples Nacional utilizará a Nota Fiscal de Serviços, conforme modelo aprovado e autorizado pelo Município, ou Distrito Federal, ou outro documento fiscal autorizado conjuntamente pelo Estado e pelo Município da sua circunscrição fiscal."

**Notícia RFB (verificado, gov.br, lida via WebFetch):** Res. CGSN **191, de 4 de agosto de 2026**, tornou a NFS-e nacional obrigatória para ME e EPP do Simples que prestam serviços sujeitos à NFS-e, **a partir de 01/11/2026**, emitida pelo Emissor Nacional (web ou API). Revoga a Res. 189/2026 (que dizia 01/09/2026). A notícia **não menciona MEI** nem dispensas. **O texto da Res. 191 não está compilado** (a compilação RFB vai até a 183/2025).

**Casos legítimos de receita sem NFS-e (o que a lei permite, verificado ou não):**

| Caso | Base | Grau | Efeito no alerta |
|---|---|---|---|
| Venda de mercadoria (ICMS) | NF-e, não NFS-e | verificado (art. 59; `conferirNfse` exclui `REVENDA`, linha 513) | já excluída |
| Cota do profissional-parceiro (salão-parceiro) | Lei 12.592 art. 1º-A § 5º (fora da receita bruta do salão) | verificado (lei lida); o código exclui a cota (linha 513, `cotaProfissionalCents`) | já excluída (ME); MEI não (3a) |
| Locação de bem móvel (`LOCACAO_MOVEL`) | LC 116, lista, item 3.01 "(VETADO)": fora do ISS; Simples: Anexo III "deduzida a parcela correspondente ao ISS" (LC 123 art. 18 § 4º V, citado no código) | verificado (LC 116); o § 4º V não foi relido | **hoje contada como serviço**: `conferirNfse` exclui só `REVENDA` (verificado). **Divergência falsa certa**: a lei não dá NFS-e para essa receita |
| Documento municipal próprio (art. 59 § 1º) | Município ou Estado+Município | verificado (art. 59 § 1º) | **hoje divergência**: a soma só conta `kind = NFSE` (verificado no repositório). Documento municipal fora da tabela não entra |
| NFS-e emitida fora do emissor nacional | art. 59 II + Res. 191 (de 01/11/2026) | verificado a notícia; texto não lido | a partir de 01/11/2026, a Res. 191 exige o nacional para ME/EPP (inferido: fora dele não é mais permitido) |

### 3c. Data que casa NFS-e e competência

- **Código (verificado):** a NFS-e é somada por `dCompet startsWith competência` (`FiscalDocumentRepository.ts`, função `somaNfseAutorizadaNaCompetencia`, linhas 61–71). A receita é lida por competência (`findByCompetencia`).
- **Regra da base de cálculo (art. 16, verificado):** a receita mensal é a auferida (regime de **competência**) ou a recebida (regime de **caixa**), conforme opção do contribuinte. O alerta compara por competência, então **não respeita a opção de caixa**.
- **`dCompet` é a data da prestação (verificado, Anexo I v1.01, sha256 igual ao do MANIFEST):** "Data de competência da prestação do serviço" e "A data de competência deve ser única e ser a mesma que a data do fato gerador do tributo, ou seja, a data da prestação do serviço". Há uma regra de validação: "A data de competência informada na DPS não pode ser posterior à data de emissão (dhEmi)".
- **Nota emitida no mês seguinte à prestação não gera divergência falsa** no regime de competência: ela leva `dCompet` do mês da prestação e cai na competência certa (verificado pelo leiaute + `startsWith` do repositório). Nota emitida **antes** da prestação não existe, porque o leiaute a rejeita.
- **Regime de caixa:** a receita do PGDAS-D é a recebida (art. 16), e a NFS-e continua pela data da prestação. Toda prestação recebida em outro mês gera divergência no mês da prestação e no do recebimento. É divergência falsa por construção (inferido do art. 16 + leiaute).

### 3d. Tratamento por caso

| Caso | (i) excluir da soma | (ii) informativo com motivo | (iii) manter |
|---|---|---|---|
| MEI venda a PF | — (não há tomador na receita, verificado) | — | **Hoje: divergência falsa** |
| MEI serviço a CNPJ | — | — | **Certo** (é o que a lei exige) |
| Cota do salão-parceiro (ME) | **já (i)** (linha 367) | — | — |
| Cota do salão-parceiro (MEI) | (i), por simetria: a Lei 12.592 § 5º não distingue porte (verificado) | — | hoje: divergência |
| Locação de bem móvel (ME e MEI) | **(i)**: fora da lista do ISS (LC 116, item 3.01 vetado, verificado), sem NFS-e por lei | — | hoje: divergência falsa |
| Documento municipal (art. 59 § 1º) | (i) **não** (não é receita fora da lei) | **(ii)** com motivo "documento municipal, não lançado no emissor"; **some a partir de 01/11/2026** para ME/EPP (Res. 191, notícia) | hoje: divergência |
| Nota emitida no mês seguinte à prestação | — | — | **(iii)**: `dCompet` = data da prestação (Anexo I, verificado), sem divergência |
| Regime de caixa × NFS-e | — | (ii), ou comparar por recebimento (F-PR4-12) | hoje: divergência falsa |

**Recomendação do alerta MEI (F-PR4-9):** o alerta **não deve depender de declaração** "vendo só para PF", porque a lei define a dispensa pelo **tipo de destinatário** (LC 123 art. 26 § 6º II; Res. 140 art. 106 II), não por declaração. Enquanto a receita não tiver tomador, o alerta fica **desligado para o MEI**, e o alerta de limite (LIMITE_MEI_EXCEDIDO) continua. Quando houver tomador, o alerta passa a comparar só serviço a CNPJ.

**Recomendação do alerta ME (F-PR4-10):** manter o alerta; tirar da soma a locação de bem móvel (sem ISS pela lista da LC 116); tratar documento municipal como (ii) até 31/10/2026.

### Forks da Pergunta 3

**F-PR4-9 — Alerta NFSE_DIVERGE do MEI: ligado, desligado ou dependente de declaração?**
- (a) ligado, comparando toda a receita de serviço (como hoje) — **não recomendado** (divergência falsa: LC 123 art. 26 § 6º II, Res. 140 art. 106 II "a.1");
- (b) **desligado** até a receita ter tomador; depois, comparar só serviço a CNPJ — **recomendado**;
- (c) dependente de declaração "vende só para PF" no perfil — não recomendado (a lei decide pelo destinatário, não por declaração).
Impacto: `conferirNfse` (`SimplesApuracaoService.ts`, a partir da linha 506) e `montarMei` (linha 442); modelo de receita fiscal (campo de tomador, que hoje não existe).

**F-PR4-10 — Alerta NFSE_DIVERGE do ME: locação de bem móvel e documento municipal**
- (a) excluir a locação da soma (sem ISS, LC 116 item 3.01 vetado) e tratar documento municipal como informativo até 31/10/2026 — **recomendado**;
- (b) informativo com motivo para os dois;
- (c) manter como está.
Impacto: `conferirNfse`, filtro de natureza (`LOCACAO_MOVEL` hoje entra; passa a sair junto com `REVENDA`) e o motivo no alerta. Data de corte 01/11/2026 só pela notícia da RFB (texto da Res. 191 não lido).

**F-PR4-11 — Simetria da cota do salão-parceiro no MEI (linha 442 × linha 367)**
- (a) aplicar ao MEI o mesmo filtro do ME — **recomendado**: a Lei 12.592 art. 1º-A §§ 4º–5º (lida) não distingue o porte do salão;
- (b) manter a diferença: sem base, porque nenhum texto lido trata ME e MEI de forma diferente aqui.
Impacto: `montarMei` (linha 442), passar `servicosPa` filtrado em vez de `linhasPa`. Ressalva: se o Anexo XI da Res. 140 não permitir salão-parceiro MEI, o ramo nunca roda; a correção é inócua, não errada (Anexo XI não lido).

**F-PR4-12 — Base de data da conferência: competência ou caixa**
- (a) manter `dCompet` por competência, sem tratar o regime de caixa — certo para quem é de competência (Anexo I lido), errado para quem é de caixa;
- (b) competência para o regime de competência; para o de caixa, alerta informativo "regime de caixa: NFS-e pela data da prestação, receita pelo recebimento" — **recomendado** (a comparação exata exigiria casar nota com recebimento);
- (c) tolerância de um mês.
Impacto: `conferirNfse` e a leitura do regime no perfil. O gate anterior (ler o `dCompet`) está **fechado**: é a data da prestação.

**F-PR4-13 — Limite do MEI transportador autônomo de cargas (achado lateral, fora das 3 perguntas)**
- (a) acrescentar a linha `SIMPLES_LIMITE`/`MEI_TAC` (R$ 251.600,00; início R$ 20.966,67 × meses; Res. 140 art. 100 § 1º-A) e escolher a chave pela ocupação — **recomendado**, se o produto atende TAC;
- (b) registrar como fora de escopo (não atende TAC) e bloquear a ocupação no perfil;
- (c) manter como está (alerta falso para TAC entre R$ 81 mil e R$ 251,6 mil).
Impacto: `limiteMei` e seed `legal_parameters_simples_v1.sql`. A ocupação TAC no perfil não foi verificada.

---

## Não achado / não lido (com onde procurar)

1. **Res. CGSN 191/2026 (texto):** não compilado pela RFB. Li só a notícia (gov.br/receitafederal, ago/2026): NFS-e nacional obrigatória para ME/EPP desde 01/11/2026; revoga a Res. 189. A busca indica que o portal Normas lista o ato com data 10/08/2026 e as prefeituras citam 04/08/2026 (data do ato × publicação; não conferido). Onde: `normas.receita.fazenda.gov.br` (CGSN, Res. 191) e DOU de ago/2026.
2. **Res. CGSN 169/2022 (texto):** não lido. O portal NFS-e dá 03/04/2023 numa página e 01/09/2023 noutra para a obrigatoriedade do MEI. Isso não muda a conclusão do 3a, que se apoia no texto compilado da Res. 140 (posterior à 169). Onde: DOU 28/07/2022.
3. **Res. CGSN que ajuste o art. 27 da Res. 140 à LC 227 (retenção "no mês da prestação" em 2027):** não achada. A compilação vai até a 183/2025. Se a 191 ou outra posterior tratar disso, muda o F-PR4-2. Onde: Normas RFB, filtro CGSN 2026.
4. **LC 123 art. 18 §§ 5º-C, 5º-I e § 4º V** (enquadramento por anexo e dedução do ISS na locação): não relidos nesta revisão; o código os cita. Onde: `lcp123.htm`.
5. **Res. 140 Anexo XI** (ocupações do MEI; pergunta: salão-parceiro pode ser MEI? TAC no perfil?): não lido. Onde: `Res-CGSN-140-2018.txt`, Anexo XI.
6. **Res. 140 art. 106 § 1º:** não lido. Onde: mesmo arquivo, "Art. 106".
7. **PLP 108/2021:** ficha de tramitação não aberta (só o resumo da busca, último ato em 01/07/2026). Onde: `camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2295251`.
8. **Manual do PGDAS-D e DEFIS:** não baixado; não era necessário para estas três perguntas.
9. **sha256 dos HTML do Planalto:** não estável entre requisições (ver §0); citado com a data de leitura. O Anexo I (xlsx do gov.br) bate com o MANIFEST.
10. **Testes do PR-4:** não rodei. Li o teste de alíquotas (`simplesApuracao.integration.test.ts:277`, caso 2026-07: 10,56% × 32,50% = 3,4320%, coerente com o art. 27 I "a"). Não há teste de 2027-02 na rota de alíquotas (busca por `aliquotas` + `2027` não feita; **a fazer** antes de corrigir F-PR4-2).

---

## Questionário para o dono (uma pergunta por fork)

> **Respondido em 2026-10-09** — ver "Respostas do dono" logo abaixo da lista e [[D-2026-10-09-X14-PR4-FORKS]].

Os forks não se ratificam sozinhos. Respostas no chat; nada é implementado antes do "executa".

1. **F-PR4-1 — "início de atividade" para a retenção:** (a) data de abertura do CNPJ (Res. 140 art. 2º V) — recomendado; (b) data da opção pelo Simples; (c) primeiro mês com receita. Qual?
2. **F-PR4-2 — 2º mês de atividade e 2027:** no 2º mês (a lei não tem meses na janela), (a) receita do mês de início × 12, como hoje — recomendado —, (b) 5% ou (c) 2%? E a partir de 2027, a rota passa a usar o mês da prestação (janela M−13…M−2, LC 227 art. 169) — recomendado —, ou fica como está (M−14…M−3)?
3. **F-PR4-3 — mês de início:** a rota devolve 2% por atividade no mês de início (LC 123 art. 21 § 4º II, vigente até 2032) — recomendado —, não devolve nada e alerta, ou devolve 5%?
4. **F-PR4-4 — atividade sem receita no mês anterior:** (a) faixa do RBT12 global × anexo da atividade, sem depender da receita do mês — recomendado —, (b) 2% ou (c) 5%?
5. **F-PR4-5 — piso de ISS:** (a) sem piso no percentual da tabela; 2% só para alíquota de benefício municipal (Res. 140 art. 31 parágrafo único) — recomendado —, (b) piso de 2% sempre, ou (c) só alerta abaixo de 2%?
6. **F-PR4-6 — papel da rota:** (a) sugere, com faixa, mês de referência, janela e aviso de responsabilidade (LC 123 art. 21 § 4º VI) — recomendado —, ou (b) calcula e declara válida?
7. **F-PR4-7 — limite ausente (ME/EPP/sublimite/MEI):** (a) erro 400/422; (b) alerta `PARAMETRO_AUSENTE` que bloqueia o registro do DAS — recomendado —; ou (c) manter o silêncio?
8. **F-PR4-8 — teto do ISS ausente:** (a) `PARAMETRO_AUSENTE` só para Anexos III/IV antes de 2033 (no Anexo V e de 2033 em diante a falta é a lei) — recomendado —, (b) alerta em toda ausência, ou (c) silêncio?
9. **F-PR4-9 — NFSE_DIVERGE do MEI:** (a) ligado como hoje, (b) desligado até a receita ter tomador, depois só serviço a CNPJ — recomendado —, ou (c) depende de declaração "vende só para PF"?
10. **F-PR4-10 — NFSE_DIVERGE do ME:** (a) tirar a locação de bem móvel da soma e tratar documento municipal como informativo até 31/10/2026 — recomendado —, (b) informativo para os dois, ou (c) manter?
11. **F-PR4-11 — cota do salão-parceiro no MEI:** (a) mesmo filtro do ME (Lei 12.592 não distingue porte) — recomendado —, ou (b) manter a diferença?
12. **F-PR4-12 — data da conferência:** (a) `dCompet` como hoje, (b) como hoje para competência e alerta informativo para quem é de caixa — recomendado —, ou (c) tolerância de um mês?
13. **F-PR4-13 — MEI transportador autônomo de cargas (R$ 251.600):** (a) acrescentar o limite TAC — recomendado se o produto atende TAC —, (b) declarar TAC fora de escopo e bloquear no perfil, ou (c) manter?


### Respostas do dono (chat, 2026-10-09)

Mensagem do dono com as decisões 1–10 e, no questionário de pontos não cobertos (AskUserQuestion), *"Sim, executa"*.

| # | Fork | Resposta | Implementado em |
|---|---|---|---|
| 1 | F-PR4-1 | (a) abertura do CNPJ. **Validar contra o dado da RFB: fora do escopo** (sem integração de CNPJ; fonte a decidir) | `aliquotas()` lê `inicioAtividadeEm` do perfil |
| 2 | F-PR4-2 | (a) 2º mês = receita do 1º × 12; 2027: PA = M, janela M−13…M−2, tabelas de M | `aliquotas()` |
| 3 | F-PR4-3 | (a) 2% por atividade | `aliquotas()` |
| 4 | F-PR4-4 | (a) atividades do cadastro (natureza/cTribNac), RBT12 global, fator R da janela | `aliquotas()` + `montar(…, catalogo)` |
| 5 | F-PR4-5 | (a) sem piso na tabela; 2% só trava benefício municipal | sem mudança de cálculo (guarda de regressão) |
| 6 | F-PR4-6 | (a) sugere, com memória de cálculo + aviso de responsabilidade | payload de `aliquotas()` |
| 7 | F-PR4-7 | **(a) fail-fast** (diverge da recomendação b). Questionário: subclasse de `SemLinhaVigenteError` com código `PARAMETRO_LEGAL_AUSENTE` (400) | `limites`, `limiteMei` |
| 8 | F-PR4-8 | **não decidido — fora do escopo** | — |
| 9 | F-PR4-9 | ligado só para receita a tomador CNPJ. Questionário: **campo `tomadorTipo` em `ReceitaFiscalLinha`** | schema + ponte/reconcile + `montarMei` |
| 10 | F-PR4-10 | **não decidido — fora do escopo** | — |
| 11 | F-PR4-11 | (a) mesmo filtro do ME | `montarMei` |
| 12 | F-PR4-12 | **não decidido — fora do escopo** | — |
| 13 | F-PR4-13 | (a) limite TAC R$ 251.600 / R$ 20.966,67 × meses. Questionário: **boolean `meiTransportadorCargas` no perfil** | schema + DTO + `limiteMei` + semente v4 |

Custo registrado do F-PR4-7 (a): sem a linha `SIMPLES_LIMITE`, o `calcular` do ME inteiro para (a pesquisa
recomendava alerta + bloqueio só do registro do DAS). O fail-fast **não** foi estendido ao teto do ISS (F-PR4-8):
a ausência de `SIMPLES_TETO_ISS` é legítima no Anexo V e de 2033 em diante.

---

## Próximos passos que não dependem do dono (sem código)

- Procurar no Normas RFB uma resolução CGSN de 2026 que ajuste o art. 27 da Res. 140 à LC 227 (item 3 da lista acima). Se existir, reabre o F-PR4-2.
- Ler o Anexo XI da Res. 140 (F-PR4-11 e F-PR4-13).
- Rodar a suíte do PR-4 para medir o custo real de F-PR4-7 e F-PR4-8.
