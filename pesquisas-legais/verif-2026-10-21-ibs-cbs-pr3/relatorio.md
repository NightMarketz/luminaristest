# Relatório de pesquisa legal — verif-2026-10-21-ibs-cbs-pr3

**Pergunta:** IBS/CBS PR-3: momento do crédito (art. 47), uso/consumo (art. 57), antecipação (art. 10 § 4º) — LC 214 e Dec. 12.955
**Aberto em:** 2026-10-21T23:18:10-03:00 · **Atualizado em:** 2026-10-21T23:52:19-03:00
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
- **Acerto no consumo × documento do consumo** — item 18 literal (dono 21/10): o acerto é a diferença de alíquota da porção;
  o débito do documento emitido no consumo também entra (F-IBS-3). Leitura alternativa: o acerto deduz a antecipação do
  débito do documento. Pergunta ao contador (P-IBS-3): "no salão com NFS-e no consumo, o IBS/CBS antecipado no pagamento
  do pacote deduz o débito da nota do consumo?"

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
