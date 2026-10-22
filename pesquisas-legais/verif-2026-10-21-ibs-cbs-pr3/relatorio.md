# Relatório de pesquisa legal — verif-2026-10-21-ibs-cbs-pr3

**Pergunta:** IBS/CBS PR-3: momento do crédito (art. 47), uso/consumo (art. 57), antecipação (art. 10 § 4º) — LC 214 e Dec. 12.955
**Aberto em:** 2026-10-21T23:18:10-03:00 · **Atualizado em:** 2026-10-22T01:56:48-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **Crédito (item 14/16):** no regime regular, o crédito de IBS/CBS é apropriado quando o débito da operação de entrada é
  extinto (art. 27), segregado por tributo e no valor destacado no documento de aquisição — LC 214 art. 47 caput, § 1º I–II
  e § 2º I [D03]. Fora do crédito: uso ou consumo pessoal (art. 57 [D03]). O PR-3 registra o crédito `PENDENTE` na entrada
  e só o soma na apuração do mês em que vira `APROPRIADO` (com comprovante).
- **Uso/consumo (item 15):** art. 57 I lista categorias (joias, obras de arte, bebidas alcoólicas, tabaco, armas, bens e
  serviços recreativos, esportivos e **estéticos**, e a manutenção deles) e o inciso II o fornecimento não oneroso a sócios,
  empregados e parentes [D03]. A lista operacional (prefixo de NCM, dono 21/10) é do contador (P-IBS-2).
- **Antecipação (itens 17–18):** pagamento antes do fornecimento ⇒ antecipação na data de cada parcela, base = parcela, alíquota
  da data do documento ou do pagamento, o que vier primeiro; no fornecimento, valor definitivo sobre o total com a alíquota da
  data do fornecimento; diferença a maior = débito; a menor ⇒ arts. 38 e 491 do decreto; sem fornecimento ⇒ art. 57 do decreto
  — LC 214 art. 10 § 4º [D03]; Decreto 12.955 art. 11 §§ 5º–6º [D04, compilado].

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Crédito na extinção | LC 214 art. 47 caput | [D03] | "poderá apropriar créditos do IBS e da CBS quando ocorrer a extinção" |
| Segregação por tributo | LC 214 art. 47 § 1º I | [D03] | "será realizada de forma segregada para o IBS e para a CBS" |
| Valor do crédito | LC 214 art. 47 § 2º I | [D03] | "destacados no documento fiscal de aquisição e extintos" |
| Uso/consumo | LC 214 art. 57 I f | [D03] | "bens e serviços recreativos, esportivos e estéticos" |
| Antecipação | Dec. 12.955 art. 11 § 5º I a 2 | [D04] | "na data do pagamento, o que ocorrer primeiro" |
| Sem fornecimento | Dec. 12.955 art. 11 § 6º | [D04] | "será observado o disposto no art. 57" |

## 3. Vigência conferida
- Alertas do acervo e como foram resolvidos: a LC 214 do acervo [D02] é só a republicação (corpo vazio) ⇒ lida no Planalto
  compilado [D03] (redação da LC 227/2026 nos arts. 4º, 5º, 47 § 8º, 57). O Decreto 12.955 do acervo [D01] está em versão
  original ⇒ conferido no Planalto compilado [D04]: art. 11 sem alteração (as alterações dos Decretos 13.075 e 13.133/2026
  estão em outros artigos).
- Redação atual: art. 47 § 12 (LC 227/2026) remete ao regulamento a devolução/cancelamento com adquirente regular — fora do PR-3.
- Regulamentação pendente: alíquota de referência da CBS 2027 (Res. SF, art. 349 I) — a antecipação de CBS responde 400
  nomeado até a linha `PUBLISHED`; regulamento do IBS (CG-IBS) e hipótese dos 5 dias (art. 10 § 7º) não localizados.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **Alíquota da antecipação** — o decreto fala na alíquota "vigente e aplicável à operação" [D04]: leitura (a) inclui a
  redução do `cClassTrib` (ex.: saúde); (b) referência cheia. O dono escolheu 21/10 a referência cheia + aviso
  `ANTECIPACAO_SEM_REDUCAO`, com o acerto no consumo corrigindo pela diferença. Pergunta ao contador (junto da P-IBS-3):
  "a antecipação do pacote de serviço com redução de alíquota usa a alíquota reduzida já na parcela?"
- **Acerto no consumo × documento do consumo** — resolvido em 22/10 pelo dono, pelo decreto: consumo com nota ⇒ a nota
  entra cheia e a antecipação da porção é deduzida (§ 5º II [D04]); venda com nota (pacoteFatoGerador VENDA) ⇒ a nota é a
  antecipação, sem linha a mais (§ 5º I a 2).

## 4-A. Conferência do texto colado pelo dono em 22/10 (origem não identificada — tratado como pista, não fonte)
| Claim colado | Veredito | Fonte |
|---|---|---|
| 1. Antecipado deduz o débito do documento do consumo | **Confere**: no fornecimento, o definitivo usa o total e só a diferença vira débito; a maior ⇒ arts. 38/491 | Dec. 12.955 art. 11 § 5º II a–c [D04] |
| 1. A NFS-e do consumo deve referenciar o documento da antecipação | **Não localizado**: nem o decreto nem as transcrições da NFS-e nacional no corpus trazem isso. É emissão (fora do PR-3) | [D04]; `docs/accounting/fontes-oficiais/TRANSCRICAO-NFSe-*` |
| 2. Saúde com redução de 60% | **Confere** (serviços do Anexo III) | LC 214 arts. 128 II e 130 [D03] |
| 2. Antecipação já com a alíquota reduzida | **Confere em tese**: alíquotas "vigentes e aplicáveis à operação" | Dec. 12.955 art. 11 § 5º I a 2 [D04] |
| 2. Pacote misto: alíquota proporcional ao contrato; parte indefinida pela padrão | **Sem fonte**: não localizado na LC nem no decreto | — |
| 3(1) Café/copa/lanche de funcionários são uso/consumo | **Diverge**: alimentação e bebida não alcoólica para empregados no estabelecimento, durante a jornada, NÃO é uso pessoal; o art. 57 não lista item de cliente | LC 214 art. 57 § 3º IV c [D03] |
| 3(2) Veículos leves: aquisição, locação, combustível, seguro, manutenção | **Confere em parte**: só quando fornecidos sem contraprestação às pessoas do inciso II (sócio, empregado, parente) | LC 214 art. 57 II e § 1º II [D03] |
| 3(3) Uniforme que não seja EPI é consumo | **Diverge**: uniformes e fardamentos e EPI NÃO são uso pessoal | LC 214 art. 57 § 3º IV a–b [D03] |
| 3(4) Cosmético de uso interno dos profissionais/sócios | **Confere em parte**: bens estéticos são do inciso I f, salvo usados só pelos clientes no estabelecimento (§ 3º III); fornecidos a sócios/empregados ⇒ inciso II | LC 214 art. 57 I f, II, § 3º III [D03] |
| 3(5) Brindes e cortesias a clientes | **Diverge**: o art. 57 não alcança terceiros; o fornecimento não oneroso é tratado em outro artigo | LC 214 art. 57 [D03] |
| 3. Referencial CBS `1.01.03.02.99` / IBS `1.01.03.03.99` | **Diverge**: `1.01.03.02` = ESTOQUES DE PRODUTOS, `1.01.03.03` = ESTOQUES – ATIVIDADE IMOBILIÁRIA, sem folha .99. O grupo de tributos é `1.01.02.03 TRIBUTOS A RECUPERAR`, com folha `1.01.02.03.40 Outros Impostos e Contribuições a Recuperar` (L100A e P100A) | ECF leiaute 12 AC 2025 — `pesquisas-legais/ibs-cbs-referencial-sped` [D01] |
| 4. Taxa provisória da CBS de 8,8% a 9,0% | **Sem fonte oficial**: a resolução do Senado não saiu. Implementado como parâmetro editável PROVISÓRIO (nasce vazio), só na prévia | LC 214 art. 349 I [D03] |

Nada da lista de uso/consumo colada entra na tabela `IBS_CBS_USO_CONSUMO`: o texto dá categorias, não prefixos de NCM, e três delas contrariam o § 3º.

## 5. Lacunas
- Regulamento do CG-IBS (IBS) e a hipótese dos 5 dias (art. 10 § 7º): não localizados em fonte oficial.
- Lista oficial de NCM/NBS de uso ou consumo pessoal: não localizada (o art. 57 lista categorias).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Decreto nº 12.955 de 29/04/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/517db958cd0ae2ba36c1f0b524b3cc55fe4198c6/federal/decretos/2026/dec-12955-2026-04-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2026-04-29;12955> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-21T23:18:17-03:00 · arquivo local `docs/D01_dec-12955-2026-04-29.md` · SHA-256 `5527dbfe923a984a86c22b27ef1c5c0b6f4f0c2996bbe14315e8804afd08bbd9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-21T23:18:18-03:00 · arquivo local `docs/D02_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-21T23:18:23-03:00 · arquivo local `docs/D03_lcp214-htm.html` · SHA-256 `568f48d881d66f9c1ab691f859c994b6d6a1b0f282dce9c2f853620b0e16634e`
- **[D04]** d12955 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>  
  Baixado em 2026-10-21T23:51:46-03:00 · arquivo local `docs/D04_d12955-htm.html` · SHA-256 `6e92bcd8bf682ef7982249e54391bdb4c31c1fa57e4fee8c09d9305e7a73c483`

## Registro de buscas
_Nenhuma busca registrada._
