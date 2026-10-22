# Relatório de pesquisa legal — nfe-danfe-ibscbs-nt2026010

**Pergunta:** O que a NT 2026.010 exige no DANFE (NF-e 55 e NFC-e 65) com IBS/CBS/IS, e desde quando?
**Aberto em:** 2026-10-22T13:19:04-03:00 · **Atualizado em:** 2026-10-22T13:23:04-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
A NT 2026.010 v1.00 (out/2026) muda **só o DANFE da NF-e modelo 55** (retrato como leiaute principal, paisagem como
alternativo) e entra em **produção em 01/12/2026, sem fase de teste** [D03] p. 3. **Não trata do DANFE NFC-e**: os dois
modelos de referência são "DANFE - Modelo55" [D03] §5. O que muda:
1. bloco novo **"Total do IBS/CBS/IS"** logo após "Total do ICMS/IPI": vCBS W56, vIBSUF W41, vIBSMun W46, vIS W33,
   vIBSMono W58, vCBSMono W59, vIBSMonoReten W59a, vCBSMonoReten W59b [D03] §4.1;
2. no emitente, **CRT (C21)** e um campo **reservado** "Tipo de Regime de Apuração do IBS e da CBS", sem tag publicada,
   que "não imprimir conteúdo enquanto não houver definição" [D03] §4.2 e §4.4;
3. nos itens, cClassTrib UB14, vBC UB16, alíquota e valor de IBS UF (UB18/UB35), IBS Mun (UB37/UB54), CBS (UB56/UB67),
   e IS (vBCIS UB05, pIS UB06, vIS UB11). Com o grupo gRed informado, imprime-se a alíquota efetiva pAliqEfet (UB28,
   UB47, UB66); sem ele, a vigente. IS usa sempre pIS [D03] §4.3;
4. quadros facultativos só aparecem se a informação existir no XML; "a faculdade de exibição não autoriza a criação,
   inferência ou impressão de informação inexistente no XML" [D03] §4.4;
5. QR Code no DANFE 55: NT própria "em breve" [D03] §4.5.

Base legal do DANFE: Aj. SINIEF 07/05 cl. 9ª — leiaute "estabelecido no MOC", só após a Autorização de Uso (§1º),
protocolo impresso (§1º-A), A4 a ofício 2 (§4º), código de barras "conforme padrão estabelecido no MOC" (§5º) [D01].

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| DANFE instituído, leiaute no MOC | Aj. SINIEF 07/05 cl. 9ª caput | [D01] | "Fica instituído o Documento Auxiliar da NF-e - DANFE, conforme leiaute estabelecido no MOC" |
| Só após autorização | cl. 9ª §1º | [D01] | "somente poderá ser utilizado para transitar com as mercadorias após a concessão da Autorização de Uso" |
| Código de barras | cl. 9ª §5º | [D01] | "O DANFE deverá conter código de barras, conforme padrão estabelecido no MOC." |
| Produção da NT | NT 2026.010 p. 3 | [D03] | "Alteração do Leiaute do DANFE … - … 01/12/2026" |
| Nada inferido | NT 2026.010 §4.4 | [D03] | "não autoriza a criação, inferência ou impressão de informação inexistente no XML" |

## 3. Vigência conferida
- O acervo ctresb/leis não cobre NT do Portal da NF-e nem Ajuste SINIEF; os dois Ajustes vieram do CONFAZ (compilado,
  sha igual ao do dossiê `verif-2026-10-17-nfe-nfce-dfe`) e a NT do Portal. O SHA-256 da NT é igual ao registrado em
  17/10 ([P3] daquele dossiê): mesma versão 1.00.
- Na lista do Portal lida em 17/10, a 2026.010 só tinha a v1.00. Não houve nova leitura da lista hoje.
- Pendente: NT futura com a tag do Tipo de Regime de Apuração (§4.2) e NT do QR Code no DANFE 55 (§4.5).

## 4. Ambiguidades
- **Leiaute novo antes de 01/12/2026.** A NT não diz se o leiaute novo pode ser usado antes da produção, nem se o antigo
  vale depois para nota autorizada antes. Leitura mais segura: o DANFE de nota autorizada a partir de 01/12/2026 sai no
  leiaute novo; antes disso, o novo só acrescenta quadros (a NT preserva "ao máximo a estrutura do DANFE atual").
  Só importa se o Luminaris emitir NF-e 55 em produção antes de 01/12/2026 (hoje não emite).

## 5. Lacunas
- O leiaute base do DANFE (posições, código de barras CODE-128C, texto de homologação) está no MOC (Visão Geral / Manual
  do DANFE), não nesta NT. Não lido nesta sessão.
- NTs 2026.003 (DANFE Simplificado Tipo 2), 2026.009, 2026.006 e 2014.001 v1.41: não lidas.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** AJUSTE SINIEF 7/05 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2005/AJ007_05>  
  Baixado em 2026-10-22T13:19:38-03:00 · arquivo local `docs/D01_AJ007_05.html` · SHA-256 `f44adf45f3e22df040e5dc588c5aa5d944b0a7a468ea90adecc000e405843670`
- **[D02]** AJUSTE SINIEF 19/16 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2016/AJ_019_16>  
  Baixado em 2026-10-22T13:19:38-03:00 · arquivo local `docs/D02_AJ_019_16.html` · SHA-256 `6692d344259fba1448dcb53b50385d9eb9106cec341af56c09316409feaa3570`
- **[D03]** Nota Técnica 2026.010 v1.00 — DANFE Reforma Tributária (Portal Nacional da NF-e) — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=ugn4MYF5PLg=>  
  Baixado em 2026-10-22T13:19:00-03:00 · arquivo local `docs/D03_NT2026010-v1.00.pdf` · SHA-256 `eadc5246235f37a55f8140ddcf84595c8ce77f2d760f111f7b85ddf389b8f484`

## Registro de buscas
_Nenhuma busca registrada._
