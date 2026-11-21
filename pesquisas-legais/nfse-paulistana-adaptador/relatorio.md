# Relatório de pesquisa legal — nfse-paulistana-adaptador

**Pergunta:** Quem emite NFS-e pela Nota Paulistana (SP capital) em 2026-2027, regime normal; webservice oficial (layout RPS, assinatura, metodos, ambiente de teste, cancelamento); regras de RPS e cancelamento
**Aberto em:** 2026-11-21T16:56:04-03:00 · **Atualizado em:** 2026-11-21T17:05:36-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

1. **Quem ainda emite pela Paulistana (V, com uma ambiguidade):** em São Paulo capital a NFS-e é obrigatória para todo
   prestador [D09, IN SF/SUREM 10/2011 art. 1º]. Desde 01/11/2026 ficam **fora** do sistema próprio do município, e
   obrigados à NFS-e Nacional, o MEI (tomador CNPJ), a ME/EPP optante pelo Simples (inclusive opção pendente e
   impedimento do art. 12 da Res. CGSN 140), o autônomo isento da Lei 14.864/2008 e a uniprofissional optante pelo Simples
   [D09, art. 1º-A I–IV, red. IN 13/2026; D06 art. 5º e art. 10 I–II]. O § 2º veda o sistema próprio a essas pessoas
   "inclusive na hipótese de … virem a ser posteriormente desenquadradas do Simples Nacional" [D09, art. 1º-A § 2º].
   **Sobra para a Paulistana:** a PJ de SP capital em regime normal (Presumido/Real) que não está em nenhum inciso do
   art. 1º-A — grau **inferido forte** (a regra geral do art. 1º manda emitir NFS-e e nenhum ato lido manda o regime
   normal para o Emissor Nacional; o manual do webservice, de 19/11/2026, continua recebendo RPS de regime normal [D04]).
2. **Webservice oficial (V):** manual v3.4.1 de 19/11/2026 [D04]. SOAP 1.2, TLS 1.2 com autenticação mútua; mensagem
   assinada em XMLDSig enveloped rsa-sha1 + c14n 2001; o certificado ICP-Brasil (A1/A3/A4) tem de conter o CNPJ; o
   remetente (`CPFCNPJRemetente`) é o mesmo CNPJ/CPF do certificado do TLS [D04 §3.2.2, §3.2.3, §3.2.5]. Além da
   assinatura da mensagem, cada RPS leva uma **assinatura RSA-SHA1 de uma cadeia ASCII** (versão 2: IM com 12 posições,
   série 5, número 12, data, tributação, status, ISS retido, valor, deduções, código do serviço 5, tomador, intermediário,
   NIF) e cada cancelamento leva outra, de 20 posições (IM 8 + número da NF-e 12) [D04 §4.3.2, §4.3.10].
3. **Endereços (V):** síncrono `https://nfews.prefeitura.sp.gov.br/lotenfe.asmx` e assíncrono
   `https://nfews.prefeitura.sp.gov.br/lotenfeasync.asmx`, ambos com os leiautes 1 e 2; o antigo
   `nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx` não aceita o leiaute 2 e "futuramente deverá ser desativado" [D04 §4.1].
   Schemas do leiaute 2: `schemas-reformatributaria-v02-8`, atualizados em 12/11/2026 [D04 §4.3.1].
4. **Não existe ambiente de homologação (V):** só os métodos `TesteEnvioLoteRPS` / `TesteEnvioLoteRpsAsync`, no mesmo
   endereço de produção, que fazem as mesmas verificações e não geram NF-e [D04 §2.1.3, §2.2.3, §4.3.4]. Consulta,
   cancelamento e reenvio não têm teste.
5. **Reenvio do mesmo RPS cancela e reemite (V):** alerta 217 — "RPS reenviado. A NF-e … foi cancelada e uma nova NF-e
   foi emitida" [D04 §4.5.2]. Retentativa às cegas depois de timeout é proibida por desenho; a consulta por `ChaveRPS`
   (`ConsultaNFe`) vem antes [D04 §4.3.5].
6. **Cancelamento (V):** `CancelamentoNFe`, só da NF-e gerada por webservice (erro 1306), em lote de até 50, com prazo
   ("ultrapassado o prazo permitido", erro 324) que o manual não diz [D04 §4.3.10, §4.5.1]. A nota cancelada no site
   aparece na `ConsultaNFe` (`StatusNFe`, `DataCancelamento`) [D04 tpNFe].
7. **Leiaute 2 (V):** em uso desde 01/01/2026, com ISS, IBS e CBS; o leiaute 1 segue aceito na transição [D02]. O
   manual já traz os erros 631/639 ("fato gerador a partir/até de {0}") sem a data [D04 §4.5.1]. A NFS-e da Paulistana
   ganha `ChaveNotaNacional` no leiaute 2 [D04 tpChaveNFe].

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| NFS-e obrigatória a todo prestador | IN SF/SUREM 10/2011 art. 1º | [D09] | "A emissão de Nota Fiscal de Serviços Eletrônica NFS-e é obrigatória para todos os prestadores dos serviços" |
| Simples, MEI, autônomo isento e SUP do Simples → NFS-e Nacional | IN 10/2011 art. 1º-A I–IV (red. IN 13/2026) | [D09][D06] | "É obrigatória a emissão de Nota Fiscal de Serviços Eletrônica de padrão nacional – NFS-e Nacional nas prestações de serviços por:" |
| Vedação do sistema próprio, também depois do desenquadramento | IN 10/2011 art. 1º-A § 2º | [D09] | "inclusive na hipótese de as pessoas de que tratam os incisos II e IV virem a ser posteriormente desenquadradas do Simples Nacional" |
| Vigência | IN 13/2026 art. 10 I–II | [D06] | incisos II e IV a partir de 01/11/2026; inciso III a partir de 01/08/2026 |
| Sem homologação | Manual v3.4.1 §2.1.3 | [D04] | "na interface de Teste, nenhuma NF-e é gerada" |
| Reenvio cancela | Manual v3.4.1 §4.5.2, alerta 217 | [D04] | "foi cancelada e uma nova NF-e foi emitida" |
| Endereço do leiaute 2 | Manual v3.4.1 §4.1 | [D04] | "Este novo endereço do serviço síncrono comporta ambos os layouts (versão 1 e 2)" |
| Leiaute 2 desde 01/01/2026 | Notícia SF 02/01/2026 | [D02] | "o sistema permitirá a utilização de 2 layouts" |
| Simples sai em 01/11/2026; sistema municipal só retroativo | Notícia 19/10/2026 | [D03] | "continuará disponível para consulta e emissão retroativa de notas referentes a fatos geradores de ISS ocorridos até 31/10/2026" |

## 3. Vigência conferida
- **Nenhuma norma municipal de SP do assunto está no acervo** `ctresb/leis` (`municipais/SP/sao-paulo` só tem
  `decretos/2026/decreto-65599-2026.md` e a lei orgânica, listado em 21/11 por `gh api git/trees`). Tudo foi lido na fonte
  oficial (legislacao.prefeitura.sp.gov.br e notadomilhao.sf.prefeitura.sp.gov.br) — regra 3 do método ("ausente").
- IN 10/2011 lida no **texto compilado** do catálogo municipal, já com a redação da IN 13/2026 [D09]; a IN 13/2026 lida
  na íntegra [D06] ("Este texto não substitui o original publicado no Diário Oficial").
- O manual muda com frequência: 12 versões entre agosto/2025 e novembro/2026 [D04 changelog]. O BRIEF fixa a v3.4.1
  (SHA-256 `8fcea6e8…`) e põe vigilância.
- Ato Conjunto RFB/CGIBS 7/2026 (11/11) mexeu nas datas do IBS/CBS nos documentos (01/01 ou 01/03/2027) e manteve
  01/11/2026 para o Simples [D07]; não li o ato (é federal e fica com o nó IBS-CBS-2027).

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **"Posteriormente desenquadradas" (§ 2º).** Leitura A: vale para quem estava no Simples em 01/11/2026 ou depois e
   saiu — fica na Nacional para sempre. Leitura B: vale também para quem saiu do Simples antes de 01/11/2026. A leitura A
   é a do texto ("virem a ser" = futuro em relação à vigência). Implica: a regra de roteamento precisa saber **quando**
   a empresa saiu do Simples, não só o regime atual. Pergunta ao contador: "Empresa de SP capital excluída do Simples em
   [data] e hoje no Presumido emite pela Paulistana ou pela NFS-e Nacional?". Mais segura: perguntar na carga do perfil
   e travar a Paulistana se houver Simples a partir de 01/11/2026.
2. **Erro 1647 do manual ("contribuinte cadastrado no CNC … deve emitir nota no ambiente nacional")** [D04 §4.5.1]. Não
   achei ato que diga quem entra no CNC em SP. Leitura mais segura: tratar o 1647 como rejeição terminal que leva a
   unidade para a NFS-e Nacional, sem retentativa.
3. **Cadeia do cancelamento no leiaute 2.** O RPS v2 usa IM com 12 posições; o quadro do cancelamento segue com 8
   (20 posições) e não tem versão 2 [D04 §4.3.2 × §4.3.10]. O `TesteEnvioLoteRPS` não cobre cancelamento: provar no
   runbook com nota real (ou perguntar à Prodam/SF).
4. **Regime normal fica na Paulistana em 2027?** Nenhum ato lido muda isso; LC 214 e o convênio de SP com o padrão
   nacional (Res. CGNFS-e 9/2025, citada só por fonte secundária) não foram lidos. Vigilância trimestral.

## 5. Lacunas
- Prazo de cancelamento pela internet (erro 324) — a norma não foi lida (Decreto municipal da NFS-e / IN; insumo
  ausente).
- Tabela oficial dos códigos de serviço de 5 dígitos (Anexo I da IN SF/SUREM 8/2011, alterada em 2026) e a
  correlação com item LC 116/NBS/cClassTrib — não baixada.
- XSDs `schemas-reformatributaria-v02-8` e exemplos XML — não baixados (zip/páginas); são insumo do PR-1.
- Data `{0}` dos erros 631/639 (leiaute 2 obrigatório por fato gerador).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** » Manuais - Nota Fiscal PaulistanaManuais – Nota Fiscal Paulistana — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://notadomilhao.sf.prefeitura.sp.gov.br/manuais/>  
  Baixado em 2026-11-21T16:56:53-03:00 · arquivo local `docs/D01_manuais.html` · SHA-256 `194209e5334c222d4093adba4008ffe90873c75b9287b7fa3fcc48d8f86b5eb4`
- **[D02]** Prefeitura de São Paulo implementa novo layout da NFS-e com destaque de IBS e CBS - Secretaria Municipal da Fazenda - Prefeitura — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://prefeitura.sp.gov.br/web/fazenda/w/novolayoutimplementado>  
  Baixado em 2026-11-21T16:56:53-03:00 · arquivo local `docs/D02_novolayoutimplementado.html` · SHA-256 `b7313822e033f7d4fcfc4e0406989add6fbdd00f35e657d9ee1d990949e06f91`
- **[D03]** » Migração de contribuintes do Simples Nacional para o Ambiente Nacional - Nota Fiscal PaulistanaMigração de contribuintes do Simples Nacional para o Ambiente Nacional – Nota Fiscal PaulistanaMigração de contribuintes do Simples Nacional para o Ambiente Nacional – Nota Fiscal Paulistana — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://notadomilhao.sf.prefeitura.sp.gov.br/noticias/migracao-de-contribuintes-do-simples-nacional-para-o-ambiente-nacional/>  
  Baixado em 2026-11-21T16:56:54-03:00 · arquivo local `docs/D03_migracao-de-contribuintes-do-simples-nacional-para-o-ambient.html` · SHA-256 `ba4f646821a42b3f04df912faa4d12843bff197465803393b3bf56897daae5e0`
- **[D04]** Microsoft Word - NFe_Web_Service v3.4.1_AlteradoProdam_ - Copia — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://notadomilhao.sf.prefeitura.sp.gov.br/wp-content/uploads/2026/11/NFe_Web_Service.pdf>  
  Baixado em 2026-11-21T16:57:16-03:00 · arquivo local `docs/D04_NFe_Web_Service-pdf.pdf` · SHA-256 `8fcea6e81a3f252f419215057e49a7a0e79ce7b03127b9c07198e80fea3c003a`
- **[D05]**     — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://notadomilhao.sf.prefeitura.sp.gov.br/wp-content/uploads/2025/05/NFe_Layout_RPS.pdf>  
  Baixado em 2026-11-21T16:57:18-03:00 · arquivo local `docs/D05_NFe_Layout_RPS-pdf.pdf` · SHA-256 `9a8c2bbf4ecaf63d363f62652e77bb0d331bffb55334cfb669058b2f81c7354e`
- **[D06]** INSTRUÇÃO NORMATIVA SECRETARIA MUNICIPAL DA FAZENDA - SF/SUREM Nº 13 DE 4 DE NOVEMBRO DE 2026 « Catálogo de Legislação Municipal — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.prefeitura.sp.gov.br/instrucao-normativa-secretaria-municipal-da-fazenda-sf-surem-13-de-4-de-novembro-de-2026>  
  Baixado em 2026-11-21T16:58:20-03:00 · arquivo local `docs/D06_instrucao-normativa-secretaria-municipal-da-fazenda-sf-surem.html` · SHA-256 `5359d3d4debd810fb2468ea21f2d4f43eba249c8c889528f6330a90a0b7237fd`
- **[D07]** Novos prazos para emissão de documentos fiscais com IBS e CBS - Secretaria Municipal da Fazenda - Prefeitura — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://prefeitura.sp.gov.br/web/fazenda/w/usoemissornacional>  
  Baixado em 2026-11-21T16:58:20-03:00 · arquivo local `docs/D07_usoemissornacional.html` · SHA-256 `0ced34dbceb83466acc6c44137f535937a63330e33433b868bf27c0ad7478bb1`
- **[D08]** » Prestadores - Nota Fiscal PaulistanaPrestadores – Nota Fiscal Paulistana — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://notadomilhao.sf.prefeitura.sp.gov.br/prestador/>  
  Baixado em 2026-11-21T16:58:20-03:00 · arquivo local `docs/D08_prestador.html` · SHA-256 `2056b1e2bb324e68687e525abcc5f82aefbe07d3dc836ee2e6d644d78cf82f33`
- **[D09]** INSTRUÇÃO NORMATIVA SECRETARIA MUNICIPAL DE FINANÇAS - SF/SUREM Nº 10 DE 12 DE AGOSTO DE 2011 « Catálogo de Legislação Municipal — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.prefeitura.sp.gov.br/instrucao-normativa-secret-mun-de-financas-e-desenv-economico-surem-10-de-13-de-agosto-de-2011>  
  Baixado em 2026-11-21T17:00:30-03:00 · arquivo local `docs/D09_instrucao-normativa-secret-mun-de-financas-e-desenv-economic.html` · SHA-256 `c262bd4c73a90e80eeb846707e81cbb0e168e8abd9e8692b8befbc3b9feb943c`

## Registro de buscas
_Nenhuma busca registrada._
