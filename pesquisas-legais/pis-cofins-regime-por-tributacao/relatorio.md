# Relatório de pesquisa legal — pis-cofins-regime-por-tributacao

**Pergunta:** O regime de PIS/Cofins (cumulativo × não cumulativo) é determinado pela forma de tributação do IRPJ (Presumido, Real, Simples)?
**Aberto em:** 2026-10-14T23:36:33-03:00 · **Atualizado em:** 2026-10-14T23:37:49-03:00
**Método:** somente fontes oficiais; documentos baixados e com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Sim, para dois dos três regimes. O regime de PIS/Cofins é determinado pela forma de tributação do IRPJ:
- **Presumido** (ou arbitrado) permanece no regime **cumulativo** de PIS e de Cofins: [D02] art. 8º, II; [D01] art. 10, II.
- **Simples Nacional** fica fora do não cumulativo: [D02] art. 8º, III; [D01] art. 10, III. Ele recolhe PIS e Cofins dentro do documento único: [D03] art. 13, IV e V.
- **MEI** é optante pelo Simples Nacional: [D03] art. 18-A, §1º.
- **Real** segue a incidência **não cumulativa** como regra ([D01] art. 1º; [D02] art. 1º). Porém receitas listadas no [D01] art. 10 continuam no cumulativo, inclusive no Real. O PIS segue o mesmo, por [D01] art. 15. Entre essas receitas estão os serviços de "hospital, pronto-socorro, **clínica médica**, odontológica…" ([D01] art. 10, XIII, "a"). Logo, no Real o regime pode ser **misto por receita**.

`icmsContribuinte` **não** decorre do regime. É contribuinte quem realiza, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria ([D04] art. 4º). Isso é fato da empresa, que só o dono informa.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Presumido → PIS cumulativo | Lei 10.637/2002 art. 8º, II | [D02] | "II – as pessoas jurídicas tributadas pelo imposto de renda com base no lucro presumido ou arbitrado" |
| Presumido → Cofins cumulativa | Lei 10.833/2003 art. 10, II | [D01] | "II - as pessoas jurídicas tributadas pelo imposto de renda com base no lucro presumido ou arbitrado" |
| Simples fora do não cumulativo | Lei 10.637 art. 8º, III; Lei 10.833 art. 10, III | [D02], [D01] | "III – as pessoas jurídicas optantes pelo Simples" |
| Simples recolhe PIS/Cofins no DAS | LC 123/2006 art. 13, IV e V | [D03] | "IV - … COFINS …; V - Contribuição para o PIS/Pasep" |
| MEI é optante do Simples | LC 123/2006 art. 18-A, §1º | [D03] | "considera-se MEI o empresário individual … optante pelo Simples Nacional" |
| Regra do não cumulativo | Lei 10.833 art. 1º | [D01] | "a Cofins, com a incidência não cumulativa, incide sobre o total das receitas auferidas no mês" |
| Exceção por receita (saúde) | Lei 10.833 art. 10, XIII, "a"; art. 15 (estende ao PIS) | [D01] | "as receitas decorrentes de serviços: a) prestados por hospital, pronto-socorro, clínica médica, odontológica…" |
| Contribuinte de ICMS | LC 87/1996 art. 4º | [D04] | "Contribuinte é qualquer pessoa … que realize, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria" |

## 3. Vigência conferida
- **Redação atual / alterações posteriores:** os artigos citados aparecem no Planalto na redação compilada de 14/10/2026.
  - Lei 10.637 art. 8º, I: redação da Lei 14.967/2024.
  - Lei 10.833 art. 1º: redação da Lei 12.973/2014.
  - Lei 10.833 art. 10, XIII: redação da Lei 10.865/2004.
- **Regulamentação pendente ou norma mais específica:** todos os dispositivos trazem a nota "Vide Lei Complementar nº 214, de 2025 — Produção de efeitos" (reforma do consumo). A substituição de PIS/Cofins pela CBS **não** foi verificada aqui. O campo `pisCofinsRegime` vale enquanto PIS e Cofins existirem; a transição é assunto de outro dossiê.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **Clínica estética no Lucro Real.** O [D01] art. 10, XIII, "a" mantém no cumulativo as receitas de "clínica médica".
  - Leitura 1: procedimento estético feito por médico conta como serviço de clínica médica. Nesse caso a receita da clínica fica no cumulativo, mesmo no Real, e o perfil `NAO_CUMULATIVO` daria crédito indevido de PIS/Cofins.
  - Leitura 2: estética não médica fica fora do art. 10, e vale o não cumulativo.
  - Leitura mais segura: não derivar o regime para a clínica no Real. Deixar `pisCofinsRegime` para o contador.
  - Pergunta exata ao contador: *"Para a clínica estética tributada pelo Lucro Real, as receitas de procedimentos entram no art. 10, XIII, 'a' da Lei 10.833/2003 (cumulativo) ou no não cumulativo?"*
- **Salão no Lucro Real:** serviços de beleza não aparecem no art. 10 (lido no Planalto). A regra do art. 1º (não cumulativo) se aplica sem ambiguidade encontrada.

## 5. Lacunas
- A Solução de Consulta da RFB sobre estética × "clínica médica" não foi pesquisada. A pergunta acima vai ao contador.
- O efeito da LC 214/2025 sobre PIS/Cofins não foi verificado.
<!-- /ANALISE -->

## Fontes oficiais consultadas
- **[D01]** L10833 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm>  
  Baixado em 2026-10-14T23:36:38-03:00 · arquivo local `docs/D01_l10-833-htm.html` · SHA-256 `64e1016345815d7370dddc6c33a1ce1fc564914b78421bce0874300f65e537bc`
- **[D02]** L10637 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/2002/l10637.htm>  
  Baixado em 2026-10-14T23:36:38-03:00 · arquivo local `docs/D02_l10637-htm.html` · SHA-256 `120d65400cb579d5ffb72b98360a323e23303dacd22942544bcd7d7a3e84b7be`
- **[D03]** Lcp 123 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm>  
  Baixado em 2026-10-14T23:36:39-03:00 · arquivo local `docs/D03_lcp123-htm.html` · SHA-256 `b1e7af19959dfd03c234852a39e76ccdc3903ab9f40d9b60028ea4691eed16dd`
- **[D04]** Lcp87 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp87.htm>  
  Baixado em 2026-10-14T23:37:10-03:00 · arquivo local `docs/D04_lcp87-htm.html` · SHA-256 `79dc4998325cb8a34787f16fe568ccd3611f39a66ca558ea4a2ef0f886b5099b`

## Registro de buscas
_Nenhuma busca registrada._
