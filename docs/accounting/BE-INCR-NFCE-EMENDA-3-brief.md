# BE-INCR-NFCE — EMENDA 3 (inutilização some em SP em 01/11/2026; NT 2025.001 v1.03; MOC online; NTs novas)

> `sessao-planejamento`, 2026-10-17, base `265f2659`. **Emenda** ao BRIEF
> [`BE-INCR-NFCE-brief.md`](BE-INCR-NFCE-brief.md) e às emendas [`-EMENDA-1`](BE-INCR-NFCE-EMENDA-1-brief.md) e
> [`-EMENDA-2`](BE-INCR-NFCE-EMENDA-2-brief.md) (nó [`X10a`](../plano/nos/X10a.md)). Sem código de aplicação.
> **Implementação exige "executa" próprio** (ORCH-006).
>
> **Autorização, literal:** dono, chat, 2026-10-17: *"Já dispara as correções que ainda não começaram"*, sobre as
> correções do consolidado de verificação legal de 17/10 (dossiê `pesquisas-legais/verif-2026-10-17-nfe-nfce-dfe/`,
> PR #754). **Cobre:** esta emenda e as correções de referência da §3. **Não cobre:** escrever código da
> inutilização. Os forks reabrem decisões ratificadas (F-NFCE-5; itens 24–25 do BRIEF; E-6 da EMENDA-1), e reabrir
> fork é do dono.
>
> **Forks: ✅ RATIFICADOS 2026-10-17** pelo dono, por questionário nesta sessão: **E3-1 → (c), contra a
> recomendação**; E3-2 → (a). Registro na §2.1 e em
> [`D-2026-10-17-X10A-INUTILIZACAO-SP`](../plano/decisoes/D-2026-10-17-X10A-INUTILIZACAO-SP.md).
>
> **Em duas linhas:** a partir de **01/11/2026** o Pedido de Inutilização de NF-e e de NFC-e "não se aplica aos Estados
> do Acre, Bahia e São Paulo" (Aj. SINIEF 40/26 e 38/26), e **não achei ato da SEFAZ-SP dizendo o que entra no lugar**.
> **Risco principal:** na NFC-e, a cl. 11ª §5º do Aj. 19/16 presume que número pulado "sem que tenha havido a
> inutilização" é nota emitida em contingência e não transmitida; sem inutilização em SP, toda lacuna pode cair nessa
> presunção (leitura literal, não confirmada por SP).

## 1. O que mudou na lei (fonte: [`pesquisas-legais/sp-inutilizacao-nfe-nfce-2026-11/relatorio.md`](../../pesquisas-legais/sp-inutilizacao-nfe-nfce-2026-11/relatorio.md))

| Chave | Regra | Onde | Grau |
|---|---|---|---|
| `[SP-SEM-INUT-55]` | "O Pedido de Inutilização de Número da NF-e previsto no 'caput' não se aplica aos Estados do Acre, Bahia e São Paulo" | Aj. SINIEF 07/05 cl. 14ª §6º, acrescido pelo Aj. SINIEF 40/26 cl. 2ª II | V |
| `[SP-SEM-INUT-65]` | idem para a NFC-e | Aj. SINIEF 19/16 cl. 16ª §6º, acrescido pelo Aj. SINIEF 38/26 cl. 2ª II | V |
| `[SP-SEM-INUT-VIG]` | efeitos "a partir do primeiro dia do segundo mês subsequente ao da publicação"; DOU 14/09/2026 ⇒ **01/11/2026** | Aj. 38/26 e 40/26 cl. 3ª | V |
| `[NFCE-PRESUNCAO]` | quebra de sequência "sem que tenha havido a inutilização", constatada a partir do 11º dia do mês seguinte ⇒ "documentos emitidos em contingência e não transmitidos". **Só NFC-e**; o Aj. 07/05 não tem regra igual | Aj. 19/16 cl. 11ª §5º (red. Aj. 26/19) | V (o texto); a aplicação a SP é ambígua |
| `[SP-SRE80-ART10]` | SP: o contribuinte "poderá solicitar … a inutilização do número da NF-e … observados … as cláusulas décima segunda a décima quarta do Ajuste SINIEF 07/05". Norma da NF-e em SP desde 17/11/2025; revogou a CAT 162/08 | Portaria SRE 80/25 art. 10 | V; nenhum ato posterior listado na página |
| `[SP-SRE40-SEM-INUT]` | a portaria da NFC-e em SP não trata de inutilização nem de quebra de sequência | Portaria SRE 40/24 (alterada só pela SRE 81/25) | V |
| `[SP-ATO-AUSENTE]` | nenhum ato, comunicado ou aviso da SEFAZ-SP sobre os Aj. 38/26 e 40/26 nos portais NF-e e NFC-e, nem em legislacao.fazenda.sp.gov.br | busca de 17/10/2026 | V (ausência na busca; não prova que não exista) |

## 2. Forks — ✅ RATIFICADOS 2026-10-17 (reabriram F-NFCE-5, itens 24–25 e E-6; texto da cédula preservado)

### F-NFCE-E3-1 — A inutilização na porta, por UF, a partir de 01/11/2026
O F-NFCE-5 (a) e o E-6 previam `inutilizar()` para todas as UF (E1-3 b: 27 UF). Agora três UF saem.
- **(a)** Manter `FiscalNumberVoid` + `inutilizar()` + rota para as UF onde o pedido vale, e **recusar com motivo
  nomeado** para AC, BA e SP com data de emissão do pedido ≥ 01/11/2026. A exclusão vira parâmetro legal com vigência
  (padrão `LinhaLegal` do BE-INCR-LEGAL-PARAMS, F-LP-4 a: UF + data de início + fonte), não `if (uf === 'SP')`.
  Pedido de SP antes de 01/11 segue normal.
- **(b)** Suspender os itens 24 e E-6 inteiros (sem `inutilizar()`) até haver ato de SP.
- **(c)** Manter como ratificado e chamar o `NFeInutilizacao4` de SP depois de 01/11; o webservice decide.
- **Recomendação: (a).** Respeita o E1-3 (b): as outras 24 UF continuam com a inutilização, e (b) a tiraria delas
  também. (c) pede à SEFAZ um ato que o Ajuste diz que não se aplica a SP; o resultado (rejeição, aceite mudo ou erro)
  não está documentado. O custo de (a) é uma linha de parâmetro e um teste por UF. **✅ RATIFICADO 17/10 → (c), contra a recomendação.**

### F-NFCE-E3-2 — O que o Luminaris faz com a lacuna de numeração em SP depois de 01/11
O item 25 lista lacunas para o operador pedir a inutilização. Em SP não há mais o que pedir.
- **(a)** Evitar a lacuna: a nova tentativa depois de uma rejeição **reaproveita o número** em vez de consumir outro.
  A lacuna que sobrar continua listada (item 25), com o aviso "SP: sem inutilização desde 01/11/2026; ver com o
  contador" e o texto da presunção `[NFCE-PRESUNCAO]` para a NFC-e. Que o número de nota rejeitada (não denegada)
  pode ser reusado está **a confirmar no PR-0** (MOC VG, rejeição × denegação); se o MOC não disser isso, (a) fica só
  com a lista e o aviso.
- **(b)** Só listar a lacuna, sem aviso e sem reaproveitar número.
- **(c)** Pausar o item 25 para SP até a resposta da SEFAZ-SP (§4 item 1).
- **Recomendação: (a).** Lacuna que não nasce não precisa de regularização, e a regra vale nas 27 UF. O aviso
  explícito evita que o operador procure um botão que a lei tirou. (b) esconde o risco da presunção. (c) deixa o
  cliente sem visão das lacunas no período em que ela mais importa. **✅ RATIFICADO 17/10 → (a).**

### Efeito nos itens, por ramo (tabela de planejamento; o efeito que vale está na §2.1)
| Item | E3-1 (a) | E3-1 (b) | E3-2 (a) |
|---|---|---|---|
| 24 (`FiscalNumberVoid` + `inutilizar()` + rota) | guarda nova antes da porta: UF/data na tabela de exclusão ⇒ 400 nomeado; teste por UF e na véspera/no dia 01/11 | sai do PR-4 | — |
| 25 (lacunas pendentes) | resposta ganha `inutilizavel: boolean` + `motivo` | lista sem ação | aviso + presunção no payload; retry reaproveita número (cond. PR-0) |
| E-6 (`inutNFe` → `NFeInutilizacao4`) | não chamado para UF excluída | sai do PR-7 | — |
| 23 (sequência) | — | — | consumo do número amarrado ao documento, não à tentativa (cond. PR-0) |

### 2.1 RATIFICAÇÃO — 2026-10-17 (dono, chat, AskUserQuestion nesta sessão)

| Fork | Recomendação | Resposta do dono (literal) | Contra? | Efeito |
|---|---|---|---|---|
| **F-NFCE-E3-1** | (a) recusar só AC/BA/SP | *"(c) Manter e deixar a SEFAZ decidir"* | **SIM** | Itens 24 e E-6 **não mudam**: `inutilizar()` chama o `NFeInutilizacao4` da UF também em SP depois de 01/11/2026. Sem tabela de exclusão por UF. **Consequência declarada:** o Ajuste diz que o pedido "não se aplica" a SP, e o que o webservice de SP responde depois de 01/11 não está documentado (aceite, rejeição ou erro). O PR-7 trata a resposta como qualquer outra: `cStat` e `xMotivo` da SEFAZ chegam ao operador sem tradução nossa, e rejeição não vira `HOMOLOGATED`. Aceite de SP não prova que a inutilização tenha efeito fiscal (§4 item 1 segue aberto) |
| **F-NFCE-E3-2** | (a) evitar a lacuna + avisar | *"(a) Evitar a lacuna + avisar (Recommended)"* | não | Item 23: o número fica amarrado ao documento, e a nova tentativa depois de rejeição reusa o número **se o PR-0 confirmar no MOC** (§4 item 2); se não, fica só o aviso. Item 25: a lacuna listada traz aviso para AC/BA/SP com data ≥ 01/11/2026. Com o E3-1 (c), o aviso diz: *"o Aj. SINIEF 40/26 (NF-e) / 38/26 (NFC-e) diz que o pedido de inutilização não se aplica a esta UF desde 01/11/2026; o pedido pode ser enviado e a SEFAZ decide; ver com o contador"*. Na NFC-e, vai junto o texto da presunção `[NFCE-PRESUNCAO]`. UF e data do aviso vêm de parâmetro legal com vigência (padrão `LinhaLegal`), não de `if` por UF. Teste: lacuna em SP com data 31/10 sem aviso; 01/11 com aviso; NFC-e com o texto da presunção, NF-e sem |

Não é "executa" (ORCH-006): o [[X10a]] não ganha autorização de código com esta ratificação.

## 3. Correções diretas de referência (sem fork; feitas neste PR)

1. **NT 2025.001: v1.02 → v1.03** (Setembro/2025; implantação em produção **03/11/2025**; Portal NF-e
   `exibirArquivo.aspx?conteudo=NvuzQGYd6E8=`, sha256 `333b69f71debe5040585b677b574bb13b39362aa7934b904edc59cdf83cded02`,
   15 pp.). A v1.03 altera as RV YA03-10 (rej. 865, "Exceção 2": não se aplica a `tPag` 90 **ou 91**), YA03-30
   (rej. 904, uso do 91 "em operações em que haja a postergação total ou parcial do pagamento") e E16a-30 (rej. 805);
   histórico de versões, p. 3; regras, pp. 10–11. **O leiaute do QR v3 não muda.** Feito: chaves `[NT2025001-*]` e
   item 1 da EMENDA-1 apontam para a v1.03.
2. **`[NFE-PAG]` ganha o `tPag` 91 (pagamento posterior)** no BRIEF original §2. **Não há tabela de `tPag` em código**
   (`grep tPag server/src` só acha uma fixture XML de compra), então a correção é só de doc. O item 18 (mapeamento de
   `sales.paymentMethod`) **não muda**: nenhum meio de pagamento do Luminaris é pagamento posterior hoje.
3. **MOC:** a partir de 01/11/2026 o MOC da NF-e e o da NFC-e são definidos no "Manual de Orientação do Contribuinte -
   MOC - da NF-e [NFC-e]", e "O Estado do Paraná deve disponibilizar, em meio eletrônico, versão online do MOC" (Aj.
   07/05 cl. 2ª-A caput e §2º, red. e acr. pelo Aj. 40/26 cl. 1ª I e 2ª I; Aj. 19/16 cl. 3ª caput e §2º, pelo Aj.
   38/26 cl. 1ª e 2ª I). As transcrições do "MOC 7.0" continuam válidas como texto; o PR-0 confere se a versão online
   diverge. Feito: comentários em `server/src/lib/nfeSignature.ts:12` e `server/src/lib/nfe.ts:273` e nota no topo
   de `fontes-oficiais/TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`.
4. **Inventário de NTs** (`[NT-NOVAS]` da EMENDA-1), acrescentado (lista do Portal NF-e lida em 17/10/2026 no dossiê
   `verif-2026-10-17-nfe-nfce-dfe`, [P0]):

| NT | Assunto | Produção | Lida? |
|---|---|---|---|
| **2026.010 v1.00** (publ. 01/10/2026) | DANFE da NF-e 55 com a Reforma Tributária: bloco de totais IBS/CBS/IS e campos UB por item; QR Code no DANFE 55 "em breve" em NT própria (§4.5) | **01/12/2026** (sem fase de teste) | **sim** (9 pp., sha256 `eadc5246235f37a55f8140ddcf84595c8ce77f2d760f111f7b85ddf389b8f484`) |
| 2026.009 v1.00 (publ. 09/09/2026) | "Divulga correção em regra de validação" | — | não |
| 2026.006 v1.00 (publ. 25/08/2026) | vinculação entre NF-e e transação financeira sujeita ao split payment | — | não |
| 2026.003 v1.00 (publ. 25/05/2026) | DANFE Simplificado Tipo 2 | — | não |
| 2014.001 **v1.41** (publ. 04/08/2026) | EPEC | — | não |
| 2014.002 v1.40 (publ. 03/07/2026) | distribuição de DF-e (já citada na EMENDA-1 §8) | — | não |

   Efeito no BRIEF: a NT 2026.010 toca o **DANFE**, que pelo E1-6 (b) é do BRIEF de FE; vai para lá como insumo,
   não para o BE. A 2014.001 v1.41 (EPEC) só importa se o E1-5 voltar a considerar EPEC (hoje: off-line, EPEC fora).

## 4. Pendente de validação externa

1. **SEFAZ-SP: como regularizar a quebra de sequência depois de 01/11/2026**, se o `NFeInutilizacao4` de SP continua
   recebendo pedidos e se a cl. 11ª §5º do Aj. 19/16 se aplica a SP. Pergunta exata no relatório do dossiê (§4).
   Quem responde: Fale Conosco da SEFAZ-SP (opção NF-e/NFC-e) ou, se ele recusar por ser interpretação, Consulta
   formal / contador. **Quem envia é o dono.**
2. **MOC VG: número de NF-e/NFC-e rejeitada pode ser reusado?** Condiciona o E3-2 (a). Fonte: MOC (7.0 ou online do
   PR), a ler no PR-0.
3. **Endereço do MOC online do Paraná**: não localizado (os Ajustes não o publicam).

## 5. Insumos ausentes
1. Ato da SEFAZ-SP sobre os Aj. 38/26 e 40/26 (`[SP-ATO-AUSENTE]`).
2. MOC online do Paraná.
3. NTs 2026.009, 2026.006, 2026.003 e 2014.001 v1.41: não lidas.

## 6. Achados fora de escopo
1. A **Portaria SRE 80/25** (NF-e em SP desde 17/11/2025, revogou a CAT 162/08) não aparece nos BRIEFs do X10a, que
   citam só a SRE 40/24 (NFC-e) e a SRE 79/24 (SAT). Vale o PR-0 registrá-la como fonte da NF-e 55 em SP. Exige
   pedido próprio para além do registro.
2. A NT 2026.010 (DANFE RTC, 01/12/2026) vai ao BRIEF `FE-INCR-NFE` / DANFE quando ele for aberto.

## 7. Gates de envio [OPS-001]
1. **Objetivo:** a frase de topo diz o que mudou, que não há ato de SP e qual é o risco; os forks estão listados e não
   decididos.
2. **Grau:** texto dos Ajustes e das portarias **V** (lido no compilado do CONFAZ e em legislacao.fazenda.sp.gov.br,
   com SHA-256 no manifest do dossiê); ausência de ato de SP **V na busca**, não prova de inexistência; reuso de número
   rejeitado **NV** (§4 item 2); aplicação da presunção a SP **ambígua** (dossiê §4).
3. **Caso adversarial:** "a SRE 80/25 art. 10 mantém a inutilização em SP, então nada muda". Resultado: o art. 10 só
   remete às cl. 12ª–14ª do Aj. 07/05, e a cl. 14ª §6º exclui SP a partir de 01/11. A portaria não tem regra própria
   de inutilização que sobreviva à remissão. Não derruba a conclusão.
4. **Checagem que teria falhado:** o SHA-256 dos compilados do CONFAZ baixados de novo é igual ao do dossiê de 17/10
   (`f44adf45…` e `6692d344…`); os PDFs das NTs 2025.001 v1.03 e 2026.010 batem com os hashes do dossiê.
5. **Duas primeiras linhas:** o bloco "Em duas linhas" traz o fato e o risco.
