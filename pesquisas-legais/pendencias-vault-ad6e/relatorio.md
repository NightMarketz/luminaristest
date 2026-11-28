# Relatório de pesquisa legal — pendencias-vault-ad6e

**Pergunta:** 24 linhas 'não conferido' do RELATORIO-PENDENCIAS-VAULT-2026-11-24: vigência de norma (RBT12, § 3º, Anexos XVIII-XXII, art. 25/DEFIS, Lei 10.147, compilação Res. CGSN 140), fontes fora do acervo e estado de BRIEF
**Aberto em:** 2026-11-26T21:41:30-03:00 · **Atualizado em:** 2026-11-26T21:56:03-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

As 24 linhas "não conferido nesta passada" de `docs/RELATORIO-PENDENCIAS-VAULT-2026-11-24.md` têm estado novo, linha a
linha, na coluna "Estado" daquele relatório (26/11). Resumo:

- **Nenhuma divergência nova entre as normas de 2027 lidas e o cálculo do DAS.** RBT12, fim do caixa, partilha 2029–2032
  e o limiar do teto do ISS conferem com o código (graus abaixo). O P0 da lacuna ad6e ("vigência assumida, DAS errado em
  01/2027") não se confirma para essas regras.
  - As divergências já conhecidas seguem na caixa. A 09b7 trata da nota (*) do Anexo XX/XXI de 2027–28, que diz
    "federais" quando o art. 18 § 1º-B I diz "federais e IBS" (teto do ISS na 6ª faixa; itens 1–2 do BRIEF #1436). A
    976c trata da soma multiunidade no RBT12.
- **Quatro "inferidos" da nota de 29/09 viram verificados:** RBT12 de 2027; "o caixa acaba"; "a DEFIS acaba"; não há
  tabela oficial CNAE × anexo.
- **Duas divergências foram à caixa:**
  - `L-20261127-005504-79dc`: o bloco socioeconômico do art. 38-B no PGDAS-D, a partir do AC 2027, não existe no produto.
    A mensagem do código diz "aguarda regulamentação", o que é falso desde a Res. 190.
  - `L-20261127-005539-e917`: o corpus local da Res. CGSN 140 parou na Res. 183.
- **Seis achados foram à caixa sem `--pai`** (dono, 27/11). Com `--pai` a caixa os recusava como filhos fora da meta
  (D-2026-11-25 §8b). Estão no §5.
- **Não sobra ambiguidade para o contador.** A A1 da DEFIS de 2026 foi respondida por lei (art. 144-F). A A1 do combo foi
  respondida em 21/10.

## 2. Fundamentação

Siglas das fontes de outros dossiês (não rebaixadas; lidas de novo nos trechos citados, 26/11):
- **[EG-D04]** `pesquisas-legais/das-espelho-guia/docs/D04_lcp214-htm.txt`: LC 214/2025 compilada, Planalto. Baixada em
  20/11/2026, sha256 `6efc444b…` (HTML).
- **[DT-D09]**, **[DT-D10]**, **[DT-D13]** e **[DT-D24]**, em `pesquisas-legais/dp-tabelas-irrf-das-sst/docs/`, com a visão
  multivigente da API Normas RFB baixada em 25/11/2026:
  - D09: Res. CGSN 190 (rfb:152832);
  - D10: Res. CGSN 196 (rfb:154694);
  - D13: Anexo III da Res. 196;
  - D24: Res. CGSN 140 (rfb:92278).

| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| RBT12 de 2027 | LC 123 art. 18 § 1º e § 1º-A I, red. LC 214 art. 517 | [EG-D04] l. 9811-9815 | "receita bruta acumulada nos doze meses antecedentes ao mês anterior ao do período de apuração" |
| Efeitos do art. 517 | LC 214 art. 544 III, red. LC 227 | [EG-D04] l. 10863 | "a partir de 1º de janeiro de 2027, em relação aos arts. … 517, 519 a 534 e 542" |
| RBT12 na resolução | Res. 140 art. 21 II "a", red. Res. 190 (vigência 01/01/2027; não revogado pela 196) | [DT-D09] l. 92 | "doze meses antecedentes ao mês anterior ao do período de apuração" |
| Fator r na mesma janela | Res. 140 art. 26, red. Res. 190 | [DT-D09] l. 144-152 | "FS12, a folha de salários dos 12 (doze) meses antecedentes ao mês anterior ao PA" |
| Fim da opção pela receita recebida | LC 123 art. 18 § 3º, red. LC 214 art. 517 | [EG-D04] l. 9825 | "Sobre a receita bruta auferida no mês incidirá a alíquota efetiva" |
| Fim do caixa na resolução | Res. 140 art. 16, red. Res. 190 | [DT-D09] l. 82 | "será a receita bruta total mensal auferida" |
| Data dos efeitos da 190 | Res. 190 art. 9º II, red. Res. 196 | [DT-D09] l. 373-375 | "a partir de 1º de janeiro de 2027, em relação às demais alterações" |
| Caixa de 2026 não recebido | Res. 140 art. 144-C, incl. Res. 196 | [DT-D24] l. 2061-2063 | "deverá integrá-los à base de cálculo do mês de dezembro de 2026" |
| Limiar do teto do ISS | LC 214 Anexo XX (2027–28) e Res. 196 Anexo III | [DT-D13] l. 22 e 26 | "superior a 14,92537%" (frase) × "superior a 14,93%" (rótulo da linha) |
| Declaração mensal e assistida | LC 123 art. 25 caput e §§ 6º–8º, red. LC 214 art. 517 | [EG-D04] l. 9944-9960 | "no mês subsequente ao de sua ocorrência"; "poderá apresentar ao optante declaração assistida" |
| DEFIS revogada | Res. 190 art. 8º XXI | [DT-D09] l. 359 | "XXI - o art. 72" (vigência 01/01/2027) |
| Bloco anual no PGDAS-D | Res. 140 art. 38-B § 1º, incl. Res. 190 | [DT-D09] l. 173-174 | "prestadas uma única vez no PGDAS-D, no período de janeiro a março de cada ano-calendário" |
| O que a 196 mudou no 38-B | Res. 196 art. 2º (art. 38-B § 2º-A) | [DT-D10] l. 63-65 | "também se aplica às hipóteses de exclusão" |
| DEFIS do AC 2026 | Res. 140 art. 144-F, incl. Res. 196 | [DT-D24] l. 2076 | "até 31 de março de 2027, por meio do módulo do aplicativo PGDAS-D 2018" |
| CNAE só impeditivo/ambíguo | Res. 140 art. 8º §§ 1º–2º | [DT-D24] l. 228-229 | "O Anexo VI relaciona códigos da CNAE correspondentes a atividades impeditivas"; "O Anexo VII relaciona códigos ambíguos" |
| Arbitramento por valor de mercado | LC 214 art. 13 I "b" e p.ú. I | [EG-D04] (art. 13) | "valor notoriamente inferior ao valor de mercado da operação" |
| Fim da Lei 10.147 | LC 214 art. 542 XI | [EG-D04] (art. 542) | "Ficam revogados a partir de 1º de janeiro de 2027: … XI - a Lei nº 10.147" |
| Retenção na CPRB | SC Cosit 153/2026 (ementa e Conclusão, itens 14.1–14.3) | [D02], [D03] l. 320-333 | "é de 3,5% … quando a empresa contratada for optante pela … CPRB"; "A partir de 1º de janeiro de 2028, será de 11 %" |

**Código lido (26/11, `origin/main` `40b6ab8f4`):**
- **Janela do RBT12.** `simplesCalc.ts:198-201` usa M−13…M−2 a partir da linha `MARCO_LEGAL/INICIO_LC214_RBT12`
  (2027-01). O fator r soma folha e receita dos mesmos meses da base (`fatorR`, `:264-288`).
- **Fim do caixa.** A linha `MARCO_LEGAL/FIM_REGIME_CAIXA_SIMPLES` (`server/prisma/data/legal_parameters_marco_legal_v2.sql`)
  já cita a Res. 190 art. 9º II, red. Res. 196.
- **Anexos.** Da Res. 196 só o Anexo III foi aberto ([DT-D13]); os outros ficam para o item 4 do BRIEF #1436.
- **Teto do ISS.** `simplesCalc.ts:397` dispara o teto quando o percentual do ISS passa de `percentualBp` (5%). Isso
  equivale a 5/33,5 = 14,92537…%, e o campo `limiarAliquotaEfetiva` não entra na comparação. O gerador também toma o
  limiar da frase (`gen-simples-anexos.mjs:18-19`).
- **Monofásico.** O fim vem do `vigenteAte` da linha `PIS_COFINS` (`D-2026-11-24-MONOFASICO-POR-LINHA`).
- **DEFIS.** `SimplesDeclaracaoService.ts:147-150` recusa ano > 2026, com a mensagem "aguarda regulamentação".
- **Combobox.** `CatalogCombobox.tsx:106-124`: `commitText` marca "não encontrado" sem olhar `loading`, e o input só
  fica `disabled` por prop.

## 3. Vigência conferida

**Alertas do acervo e como foram resolvidos:**
- A LC 123 do acervo traz "(Vide LC 214)", e a LC 214 do acervo é só a promulgação dos vetos. Por isso valeu a LC 214
  compilada do Planalto [EG-D04], de 6 dias atrás.
- A Res. 140 do acervo é a publicação original, e as IN RFB 2.110 e 1.700 e a SC Cosit 153 estão fora do acervo
  (listagem de 26/11: `instrucoes-normativas/2022` com 12 itens, sem a 2.110; a pasta de IN começa em 2018;
  `solucoes-de-consulta/2026` com 272 itens, sem a 153). Por isso valeu a API do Normas RFB:
  - Res. 140, 190 e 196: [DT-*];
  - IN 2.110: `pesquisas-legais/dp-cobertura-100` [D19];
  - IN 1.700 Anexo III: `pesquisas-legais/salao-depreciacao-equipamentos` [D10];
  - SC Cosit 153: [D02] e [D03].
- O idAto 152980 da SC saiu da busca do portal novo (`normas.receita.fazenda.gov.br/pesquisa`), lida no navegador
  embutido. O [D01] é a casca JS do link antigo do SIJUT, com o mesmo sha de 27/10, e não sustenta conclusão nenhuma:
  fica só como prova de que esse link não passa no `baixar`.

**Redação atual e alterações posteriores:**
- A Res. 196 (DOU 24/11/2026) é a mudança mais nova lida.
- Ela não revoga a redação da 190 para o art. 21 II "a" nem para o art. 16. A DEFIS continua revogada em 2027 pela 190
  (art. 8º XXI).
- No 38-B ela só acrescenta o § 2º-A.

**Regulamentação pendente:** nenhuma nos pontos lidos. A declaração assistida é faculdade da RFB, "poderá" no art. 38-A,
red. Res. 190 ([DT-D09] l. 169-172).

## 4. Ambiguidades (só o que precisa de decisão humana)

Nenhuma nova.
- **A1 da DEFIS de 2026 (DEFIS ou PGDAS-D jan–mar/2027):** respondida pela Res. 140 art. 144-F, incl. Res. 196: DEFIS
  até 31/03/2027 no PGDAS-D 2018. O BRIEF #1436 item 5 corrige a `fonte` da semente. Os três documentos que ainda a
  chamam de "aberta" estão no §5.
- **A1 do combo:** decidida em 21/10 (`D-2026-10-21-TRIAGEM-CONTADOR-F1`, l. 26): `PROPORCIONAL_CATALOGO` é o padrão, e
  `CARGA_TRIBUTARIA` só vale com aceite do contador do cliente.

## 5. Lacunas

**Na caixa:**
- `L-20261127-005504-79dc` (feature·fiscal·G3·E4, P2): bloco do art. 38-B do AC 2027 e a mensagem "aguarda
  regulamentação".
- `L-20261127-005539-e917` (débito·fiscal·G3·E4, P2): corpus `Res-CGSN-140-2018.txt` parado na Res. 183. Os outros 22
  documentos do corpus não foram reconferidos: o `--forcar` reescreve `.txt` versionados e o MANIFEST, então vai em PR
  próprio.

**Na caixa sem `--pai`** (dono, 27/11). Com `--pai`, a caixa recusava cada um como filho fora da meta (D-2026-11-25 §8b).
Os eixos abaixo são os gravados; a prioridade é a que a caixa derivou:
1. **`~/.claude/tools/pesquisa-legal/legal.py:83-84`**: `L-20261128-000742-8085` (defeito·engenharia·G3·E2·ruidoso·
   verificado, P2). A mesma sessão deve pegar a 04ca e a 0a90, que estão no mesmo arquivo.
   - **Defeito:** o `baixar` não guarda cookie. Por isso o portal da NF-e entra em laço (`AspxAutoDetectCookieSupport`).
   - **Prova:** com cookie jar, o curl recebe 200 depois de 1 redirect.
   - **Falta também:** um modo de achar o idAto de um ato da RFB por tipo, número e ano. O portal novo devolve o idAto num
     POST a `/api/indexacao/ato/pesquisar`.
   - **Correção:** `urllib.request.build_opener(HTTPCookieProcessor())` e um comando de busca.
2. **`my-app/features/accounting/components/CatalogCombobox.tsx:106`**: `L-20261128-000744-c5a6`
   (defeito·produto·G3·E3·ruidoso·verificado, P2).
   - **Defeito:** quem digita o código antes de o catálogo carregar recebe "não encontrado", e o valor é limpo.
   - **Origem:** achado de produção "relatado" na nota de 30/09 e não registrado desde então.
   - **Correção:** `commitText` não decide com `loading` verdadeiro, e o input fica `readOnly` enquanto carrega.
3. **`my-app/features/accounting/components/__tests__/LalurEntryModal.test.tsx:119`**: `L-20261128-000745-4c87`
   (defeito·engenharia·G4·E4·silencioso·inferido, P3).
   - **Defeito:** o caso "matrix…" assere `toBeDisabled` ("histórico missing") sem precondição de `toBeEnabled` com o
     histórico preenchido. Pode passar vácuo, como o "switching the tributo" passava antes do #434.
4. **A1 da DEFIS de 2026 ainda "aberta" em três documentos**: `L-20261128-000748-2ff3`
   (débito·fiscal·G4·E2·silencioso·verificado, P2 fiscal: entra na meta):
   - `docs/accounting/BE-INCR-SIMPLES-DEFIS-MANUAL-brief.md:149`;
   - `docs/accounting/BE-INCR-SIMPLES-NACIONAL-brief.md:284`;
   - `docs/accounting/PEDIDO-CONTADOR-2026-10-17-AMBIGUIDADES.md:23`.
   - O art. 144-F responde. O item 5 do BRIEF #1436 só troca a `fonte` da semente. Sem a correção, a pergunta pode voltar
     ao pacote do contador.
5. **`my-app/features/accounting/components/LalurPanel.tsx:107-108`**: `L-20261128-000751-6bef`
   (defeito·produto·G4·E3·silencioso·inferido, P2).
   - **Defeito possível:** a nota de 30/09 relatou um latente no "loader do padrão" sem `cancelled`, que deixa uma
     resposta em voo depois do teardown do jsdom.
   - **Estado em 26/11:** só o loader do catálogo tem `cancelled` (`:124-138`). `fetchEntries` e `fetchParteB` não têm. A
     nota não diz qual loader era, então ele não foi identificado.
6. **`docs/accounting/BE-INCR-EFICIENCIA-FISCAL-brief.md:302`**: `L-20261128-000754-d421` (débito·fiscal·G5, fora da
   contagem): o item 28 ainda diz "valor 2026 não
   conferido". O §6 do mesmo BRIEF (P-EF-8) registra o valor conferido em 27/10.

**Não achado:** SC Cosit ou acórdão CARF sobre rateio de desconto em kit/combo. A busca foi feita em 20–21/10
(`pesquisas-legais/brief-eficiencia-fiscal/relatorio.md:36`) e não foi refeita aqui. O padrão proporcional não depende
dela.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Normas — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action?facetsExistentes=&orgaosSelecionados=Cosit&tiposAtosSelecionados=72&numero_ato=153&ano_ato=2026&termoBusca=>  
  Baixado em 2026-11-26T21:41:30-03:00 · arquivo local `docs/D01_consulta-action.html` · SHA-256 `9f9413e20884b24680269927744a2abbf407243127ba5087a1489fd91fc8153a`
- **[D02]** Solução de Consulta Cosit nº 153, de 19 de agosto de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/152980/visao/multivigente>  
  Baixado em 2026-11-26T21:53:17-03:00 · arquivo local `docs/D02_rfb-152980-multivigente.json` · SHA-256 `e4b70e2b65aa555960d1e85f17cdc2f991e5e8d823d6e746424e3a1bbb8450d0`  
  ⚠ 1 anexo binário não baixado (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D03]** D03_85906 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152980/anexo/85906>  
  Baixado em 2026-11-26T21:53:26-03:00 · arquivo local `docs/D03_85906.pdf` · SHA-256 `14377746b9a583a56ef5b5f34b7d34ce652499be0b00f4a1ea0738ddcf1d15e0`

## Registro de buscas
_Nenhuma busca registrada._
