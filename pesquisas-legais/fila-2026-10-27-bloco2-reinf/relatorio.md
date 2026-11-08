# Relatório de pesquisa legal — fila-2026-10-27-bloco2-reinf

**Pergunta:** Bloco 2 da fila: P-REINF-7 (classTrib do R-1000 para salão e clínica no Simples), P-REINF-2 (natureza do rendimento, Tabela 01, de cada serviço que salão ou clínica contrata de PJ) e P-REINF-5 (a EFD-Reinf Web aceita digitar os eventos R-4000?)
**Aberto em:** 2026-10-27T02:25:45-03:00 · **Atualizado em:** 2026-10-27T02:33:30-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **P-REINF-7, classTrib do R-1000: 01 para salão e clínica do Simples.** Quem é tributado pelos Anexos III ou V (contribuição previdenciária patronal dentro do DAS) informa **01**, "Empresa enquadrada no regime de tributação Simples Nacional com tributação previdenciária substituída" [D07, Anexo I, Tabela 08]. **02** é para quem só tem atividade do Anexo IV (CPP fora do DAS); **03**, para quem tem as duas ao mesmo tempo; **99**, "Pessoas jurídicas em geral", para Presumido e Real. O Anexo IV é o de construção, vigilância, limpeza, conservação e advocacia (IN 2.110 art. 164 § 1º, dossiê `fila-2026-10-27-p-ret-5`). O código sai do perfil fiscal (regime e anexo), sem pergunta a ninguém.
- **P-REINF-5, Reinf Web: aceita os R-4000.** O portal da EFD-Reinf no e-CAC gera e transmite os eventos a partir de formulários [D01, MOU item 7.2]; o FAQ oficial diz que ele "estará apto a recepcionar todos os eventos", pensado como contingência [D05, 6.1]; o menu "Rendimentos Pagos/Creditados (Série R-4000)" tem R-4010 e R-4020 [D04, 27/11/2025]. Limite de 100 notas por evento no portal [D05, 2.3.19]. Na fase 1, o relatório do produto pode ser digitado à mão no portal.
- **P-REINF-2, natureza do rendimento por serviço: mapa pronto, o contador só confirma.** Tirado da Tabela 01 oficial de 15/01/2026 [D03], a mesma já carregada no PR-1 do RETENCOES-FONTE:

  | Serviço contratado de PJ | natRend |
  |---|---|
  | Contabilidade | 15015 |
  | Advocacia | 15004 |
  | Limpeza | 15043 |
  | Conservação e manutenção, exceto reforma | 15044 |
  | Segurança, vigilância | 15045 |
  | Locação de mão de obra (ex.: recepcionista terceirizada) | 15046 |
  | Fisioterapia | 15022 |
  | Fonoaudiologia | 15023 |
  | Medicina, exceto hospital, ambulatório, pronto-socorro e afins | 15026 |
  | Nutrição | 15027 |
  | Odontologia | 15028 |
  | Psicologia | 15034 |
  | Biomedicina | 15012 |
  | Análise clínica laboratorial | 15005 |
  | Radiologia | 15036 |
  | Terapia ocupacional | 15039 |
  | Prótese | 15033 |
  | Ensino e treinamento | 15020 |
  | Consultoria | 15014 |
  | Assessoria técnica | 15008 |
  | Programação (TI) | 15032 |
  | Assessoria mercadológica, gestão de crédito, cobrança, contas a pagar e a receber | 15047 |
  | Demais serviços técnicos ou administrativos | 15099 |

  Reforma e obra não têm natureza no grupo 15 (a 15019 exclui "construção de estradas, pontes, prédios e obras assemelhadas"): não há IRRF nem CSRF, só a retenção de INSS (R-2010).
- **Achado fora do bloco, P-RET-9 = P-REINF-8 (autônomo pessoa física):** o manual diz que "Como regra geral, rendimentos do trabalho devem ser informados apenas no eSocial" [D01, item 11], e o FAQ oficial manda ao R-4010 só o pagamento a PF "na situação em que não há relação com o trabalho, mesmo sem vínculo empregatício"; havendo relação de trabalho, "no ambiente do eSocial" [D05, 1.17]. O dossiê de 22/10 (ambiguidade C) não tinha esses dois textos. Leitura que sai deles: IRRF de autônomo vai no eSocial (S-1210), não no R-4010, que é o que o BRIEF da Reinf já assume no item 19 (`PF_SERVICO_FORA_DA_REINF`). A pergunta ao contador vira confirmação (§4).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| classTrib 01 | Leiaute 2.1.2, Anexo I, Tabela 08 | [D07] | "01 Empresa enquadrada no regime de tributação Simples Nacional com tributação previdenciária substituída" |
| classTrib 99 | idem | [D07] | "99 Pessoas jurídicas em geral" |
| Portal gera e transmite | MOU 2.1.2.1, item 7.2 | [D01] | "cujos formulários após preenchidos e salvos, já operam a geração e transmissão do evento" |
| Todos os eventos | FAQ EFD-Reinf, 6.1 | [D05] | "O Portal Web, quando disponível, estará apto a recepcionar todos os eventos." |
| R-4000 no portal | Página SPED de 27/11/2025 | [D04] | "acessar a opção de menu “Rendimentos Pagos/Creditados (Série R-4000)”" |
| Limite do portal | FAQ EFD-Reinf, 2.3.19 | [D05] | "a quantidade de notas fiscais informadas através do Portal Web está limitada a 100 por evento" |
| Natureza por serviço | Tabela 01 | [D03] | "15022 [...] Remuneração de Serviços de fisioterapia" |
| Trabalho vai ao eSocial | MOU 2.1.2.1, item 11 | [D01] | "Como regra geral, rendimentos do trabalho devem ser informados apenas no eSocial." |
| Idem, FAQ | FAQ EFD-Reinf, 1.17 | [D05] | "No caso em que houver relação de trabalho, a informação sobre o pagamento deve ser prestada no ambiente do eSocial." |

## 3. Vigência conferida
- **Alertas e como foram resolvidos:** [D01], [D02] e [D03] vieram com o mesmo SHA-256 das cópias de 22/10/2026 (`563e771c…`, `26a82d92…`, `31c04713…`): nenhuma versão nova publicada no SPED desde então. A Tabela 08 foi extraída do PDF do Anexo I com pypdf para `docs/D07_anexo-I-tabelas.txt`.
- **Redação atual:** leiaute 2.1.2, aprovado pelo ADE Cofis 23/2023 (DOU de 16/03/2023) [D06]; é a versão a que o MOU 2.1.2.1 se refere. [D04] é de 27/11/2025; [D05] foi baixado hoje.
- **Norma mais específica:** as notas técnicas 1, 2 e 3 de 2026 (no dossiê `verif-2026-10-22-efd-reinf-brief`) mexem em R-4010 e R-4020; não foram relidas aqui para a Tabela 08.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **Natureza 10002 × eSocial.** A Tabela 01 mantém a 10002, "Rendimento decorrente do trabalho sem vínculo empregatício", com declarante PJ [D03], enquanto o manual e o FAQ mandam rendimento do trabalho ao eSocial. Leitura 1: seguir o manual e o FAQ e não gerar R-4010 de autônomo que já está no eSocial. Leitura 2: informar também no R-4010 com a 10002. A 1 é a mais segura (dois textos oficiais e não duplica a informação); a 10002 fica para quem não envia o eSocial. Pergunta ao contador, agora de sim ou não: *"Autônomo PF que já entra no eSocial (S-1200/S-1210): confirmamos que não vai R-4010?"*
- **Enquadramento de um contrato concreto no mapa** (ex.: manutenção de equipamento estético é 15044 ou 15099?) é julgamento por fornecedor. O contador confirma o mapa uma vez.

## 5. Lacunas
- As notas técnicas de 2026 não foram relidas para a Tabela 08.
- O grupo 20 da Tabela 01 (comissões, propaganda) não foi mapeado.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Manual-20da-20EFD-Reinf-20vers-c3-a3o-202-1-2-1-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/28/40FAAC1C636CC110D4C12D2790B43C641C6BCA/Manual%20da%20EFD-Reinf%20vers%c3%a3o%202.1.2.1.pdf>  
  Baixado em 2026-10-27T02:26:01-03:00 · arquivo local `docs/D01_Manual-20da-20EFD-Reinf-20vers-c3-a3o-202-1-2-1-pdf.pdf` · SHA-256 `563e771cf0b48dec156c44bc3582a469c8a7203b2e415a89da7bba1ee27f5977`
- **[D02]** D02_XSD-20EFD-Reinf-20v2-1-2-20-20CNPJ-20Alfanum-c3-a9rico-zip — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/74/6A2EE4D441E3A9536B5BC35CB282735B479423/XSD%20EFD-Reinf%20v2.1.2%20-%20CNPJ%20Alfanum%c3%a9rico.zip>  
  Baixado em 2026-10-27T02:26:01-03:00 · arquivo local `docs/D02_XSD-20EFD-Reinf-20v2-1-2-20-20CNPJ-20Alfanum-c3-a9rico-zip.html` · SHA-256 `26a82d92bdccc4dddc56150e08080e60043315964b9f7e6800a3402f6218d4b9`
- **[D03]** D03_EFD-REINF-20-20Tabelas-2015012026-zip — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/56/02690B8D5DE8904DFAB98799195B016052E4F5/EFD-REINF%20-%20Tabelas%2015012026.zip>  
  Baixado em 2026-10-27T02:26:02-03:00 · arquivo local `docs/D03_EFD-REINF-20-20Tabelas-2015012026-zip.html` · SHA-256 `31c04713b92a965c7413190a21dfc1b8eab4b10002a58371506da758e770b1a7`
- **[D04]** Pesquisa avançada por nome do beneficiário no portal do e-CAC — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/pagina/show/7911>  
  Baixado em 2026-10-27T02:27:02-03:00 · arquivo local `docs/D04_7911.html` · SHA-256 `e7ed06d59e5e2d6e418a9b2062deac160f488ba9bcc8a7821eea22dec398b21a`
- **[D05]** EFD-Reinf — Receita Federal — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr>  
  Baixado em 2026-10-27T02:27:02-03:00 · arquivo local `docs/D05_efdr.html` · SHA-256 `9db77f57c87112ad41a9f99bf42cff5976c73d566f9d5aa5441c68960daec9da`
- **[D06]** Versão 2.1.2 dos leiautes da EFD-Reinf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/pagina/show/7186>  
  Baixado em 2026-10-27T02:28:41-03:00 · arquivo local `docs/D06_7186.html` · SHA-256 `99158b8918c8f3eca62e7fd4c0ccdcc67c1a84ff555e283b32bc8e32608b17c7`
- **[D07]** D07_Leiautes-20da-20EFD-Reinf-20vers-c3-a3o-202-1-2-zip — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/54/624B4458B9B21F00B964E01CC71AF7FB00E13C/Leiautes%20da%20EFD-Reinf%20vers%c3%a3o%202.1.2.zip>  
  Baixado em 2026-10-27T02:29:23-03:00 · arquivo local `docs/D07_Leiautes-20da-20EFD-Reinf-20vers-c3-a3o-202-1-2-zip.html` · SHA-256 `4e81428926b42f455119d7771cee28df0c0116fdbf662ae78a0a407e01a83fd1`

## Registro de buscas
_Nenhuma busca registrada._
