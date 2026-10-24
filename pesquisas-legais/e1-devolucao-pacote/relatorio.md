# Relatório de pesquisa legal — e1-devolucao-pacote

**Pergunta:** Efeito fiscal (IBS/CBS, ISS/NFS-e) da devolução e do cancelamento de venda de serviço/produto/pacote pré-pago; momento do fato gerador do pacote
**Aberto em:** 2026-10-22T22:11:23-03:00 · **Atualizado em:** 2026-10-22T22:15:13-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

1. **Pacote não consumido devolvido é, para IBS/CBS, um _cancelamento_, não uma devolução.** O regulamento da CBS
   define devolução como "desfazimento de operação após o fornecimento" e cancelamento como "desfazimento de
   operação antes do fornecimento" ([D05] Dec. 12.955/2026 art. 57 § 1º I–II). O pagamento antecipado do pacote é
   a hipótese da LC 214 art. 10 § 4º, e o § 5º (redação da LC 227/2026) manda aplicar "as regras aplicáveis ao
   cancelamento" quando o fornecimento não ocorre, inclusive por distrato ([D04]). No regulamento, o § 6º do art. 11
   remete esse caso ao art. 57 ([D05]).
2. **O dispositivo do pacote é o art. 10 § 4º/§ 5º, não o § 3º.** O § 3º (redação LC 227/2026) trata de execução
   continuada ou fracionada ("primeira entre... exigível... ou pagamento") ([D04]). A citação "art. 10 § 3" da linha
   E-1 do GAP-MAP deve apontar para o § 4º/§ 5º.
3. **Efeito fiscal da devolução e do cancelamento (IBS/CBS):** documento fiscal no valor da operação desfeita, com a
   mesma base e a mesma alíquota da operação original ([D04] LC 214 art. 12 § 7º e art. 17). Para adquirente não
   contribuinte no regime regular (o cliente pessoa física do salão), o fornecedor apropria crédito ou estorna débito
   ([D04] art. 47 § 8º, red. LC 227/2026). O regulamento dá a ordem dos efeitos e quem emite o documento: na
   devolução, o fornecedor se o adquirente não emite documento fiscal; no cancelamento, sempre o fornecedor
   ([D05] art. 57 §§ 3º e 6º). A devolução de operação que não gerou crédito ao adquirente depende de o fornecedor
   provar que assumiu o encargo ([D05] art. 57 § 8º I c/c art. 38 II).
4. **ISS:** o fato gerador é a prestação do serviço e a base é o preço ([D01] LC 116 art. 1º e art. 7º). A LC 116
   não traz regra de devolução ou cancelamento. No pacote com fato gerador no consumo (`pacoteFatoGerador =
   'CONSUMO'`, F-DFE-9 a), o pacote não consumido nunca gerou ISS nem NFS-e. Serviço já prestado e depois
   reembolsado não desfaz a prestação pela LC 116. O efeito no ISS e na NFS-e depende da lei municipal e não foi
   lido (lacuna).
5. **No produto hoje, nada disso vira código:** não há apuração de IBS/CBS (nó M5, diferido). O BRIEF registra os
   pontos como contrato para o M5, e a classificação devolução × cancelamento como insumo da decisão contábil.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Devolução × cancelamento | Dec. 12.955/2026 art. 57 § 1º | [D05] | "II - cancelamento de operação - desfazimento de operação antes do fornecimento." |
| Pacote não fornecido | LC 214 art. 10 § 5º (red. LC 227/2026) | [D04] | "caso não ocorra o fornecimento ... observar-se-ão as regras aplicáveis ao cancelamento" |
| Antecipação no pagamento | LC 214 art. 10 § 4º I | [D04] | "serão exigidas antecipações dos tributos" |
| Base da devolução | LC 214 art. 12 § 7º | [D04] | "A base de cálculo relativa à devolução ou ao cancelamento será a mesma utilizada na operação original." |
| Alíquota da devolução | LC 214 art. 17 | [D04] | "será a mesma cobrada na operação original" |
| Adquirente não contribuinte | LC 214 art. 47 § 8º (red. LC 227/2026) | [D04] | "poderá apropriar créditos ou estornar débitos" |
| Quem emite | Dec. 12.955 art. 57 § 6º | [D05] | "II - na hipótese de cancelamento da operação, pelo fornecedor." |
| ISS: fato gerador | LC 116 art. 1º | [D01] | "tem como fato gerador a prestação de serviços" |
| ISS: base | LC 116 art. 7º | [D01] | "A base de cálculo do imposto é o preço do serviço." |

## 3. Vigência conferida
- [D03] (acervo da LC 214) é republicação, não compilada: conferida no compilado do Planalto [D04]. Os §§ 3º, 4º I
  a 2, 4º II c e 5º do art. 10 e o § 8º do art. 47 estão na redação da LC 227/2026, e as redações anteriores aparecem
  tachadas no compilado. O § 12 e o § 13 do art. 47 foram incluídos pela LC 227/2026.
- [D02] (acervo do Dec. 12.955) é o texto original: conferido no Planalto [D05]. O art. 57 não traz marca de
  alteração. Os Decretos 13.075 e 13.133/2026 alteram outros artigos.
- [D01] LC 116: compilada, cópia de 13/10/2026, sem alerta.
- O regulamento do IBS não foi lido.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **Reembolso de serviço já prestado (devolução de venda de serviço) no ISS.** Leitura A: a prestação ocorreu, o ISS
  fica e o reembolso é abatimento comercial, sem efeito no ISS. Leitura B: a lei municipal admite cancelar ou
  substituir a NFS-e e excluir o valor da base. A LC 116 não decide. Leitura mais segura: A, até ler a norma do
  município. Pergunta ao contador: "Em São Paulo, a devolução do valor de um serviço já prestado, com NFS-e
  emitida, permite cancelar a nota ou excluir o valor da base do ISS? Por qual dispositivo?"
- **Pacote com `pacoteFatoGerador = 'VENDA'` cancelado ou devolvido com consumo parcial.** A NFS-e do pacote saiu
  inteira na venda. Não está decidido se o desfazimento parcial pede cancelamento com reemissão pelo valor consumido
  ou outro procedimento municipal. Pergunta ao contador: "Na NFS-e emitida na venda de um pacote, o reembolso do
  saldo não usado exige cancelar e substituir a nota pelo valor consumido?"

## 5. Lacunas
- Lei e regulamento do ISS de São Paulo sobre cancelamento ou substituição de NFS-e e sobre a base do ISS na devolução
  de serviço: não lidos.
- Regulamento do IBS: não lido.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 116 de 31/07/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ae234474cd3e1e3f6e871eaa102aeb862ec17541/federal/leis-complementares/2003/lcp-116-2003-07-31.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2003-07-31;116> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-22T22:11:31-03:00 · arquivo local `docs/D01_lcp-116-2003-07-31.md` · SHA-256 `ee5663cd6f75d06dc795b4b9b49b52e4a9d7ad9c2575d817375088a5ed3098b9`
- **[D02]** Decreto nº 12.955 de 29/04/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/517db958cd0ae2ba36c1f0b524b3cc55fe4198c6/federal/decretos/2026/dec-12955-2026-04-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2026-04-29;12955> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-22T22:11:32-03:00 · arquivo local `docs/D02_dec-12955-2026-04-29.md` · SHA-256 `5527dbfe923a984a86c22b27ef1c5c0b6f4f0c2996bbe14315e8804afd08bbd9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-22T22:11:33-03:00 · arquivo local `docs/D03_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D04]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-22T22:11:40-03:00 · arquivo local `docs/D04_lcp214-htm.html` · SHA-256 `09db0fd1e8e840ab7c30090ff3f02654ff9d5644d0b2d2a6837b12262ede4e41`
- **[D05]** d12955 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>  
  Baixado em 2026-10-22T22:12:21-03:00 · arquivo local `docs/D05_d12955-htm.html` · SHA-256 `6394469359a533b6e08574c2cd5aa259808c68d5ef4b4f06af448eb4575d83f9`

## Registro de buscas
_Nenhuma busca registrada._
