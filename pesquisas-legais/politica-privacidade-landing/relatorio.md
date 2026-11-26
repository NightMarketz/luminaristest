# Relatório de pesquisa legal — politica-privacidade-landing

**Pergunta:** Politica de privacidade da landing Luminaris (lista de espera): conteudo minimo do art. 9 da LGPD e da regulamentacao da ANPD; prazos e forma de atender o titular (art. 18 par. 5, art. 19); encarregado e dispensa de agente de pequeno porte; o que informar sobre transferencia internacional (art. 33) se a analise de uso for ligada
**Aberto em:** 2026-11-26T14:34:23-03:00 · **Atualizado em:** 2026-11-26T14:51:26-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Em duas linhas:** a política da lista de espera tem de cobrir os sete incisos do art. 9º da LGPD; a ANPD não editou
regulamento de direitos do titular, então o único prazo em texto é o do art. 19 (15 dias para a declaração completa),
em dobro para agente de pequeno porte. A dispensa de encarregado depende de o controlador ser de pequeno porte, fato
que só o dono tem; com PostHog fora do Brasil, a página tem de dizer o país e o mecanismo da transferência.

**(1) Conteúdo mínimo.**
- O art. 9º manda informar "de forma clara, adequada e ostensiva" [D01 art. 9º]:
  - finalidade específica (I);
  - forma e duração (II);
  - identificação do controlador (III) e contato dele (IV);
  - uso compartilhado e a finalidade (V);
  - responsabilidades dos agentes (VI);
  - direitos do titular, "com menção explícita aos direitos contidos no art. 18" (VII).
- O caput remete a "outras características previstas em regulamentação". Na lista de regulamentações da ANPD baixada
  hoje [D02] não há regulamento sobre transparência nem sobre direitos do titular. Valem só os sete incisos.
- O Marco Civil pede ainda "informações claras e completas sobre coleta, uso, armazenamento, tratamento e proteção"
  [D06 art. 7º VIII].
- Com consentimento, informação enganosa ou não apresentada "previamente" anula o consentimento [D01 art. 9º §1º].
  Mudança de finalidade se informa antes, com direito de revogar [D01 art. 9º §2º].

**(2) Prazos e forma de atender o titular.**
- Atendimento sem custo, "nos prazos e nos termos previstos em regulamento" [D01 art. 18 §5º], e o regulamento não
  existe [D02].
- O que está em lei é o art. 19 [D01]:
  - confirmação ou acesso em formato simplificado, "imediatamente" (I);
  - declaração clara e completa em até 15 dias do requerimento (II);
  - por meio eletrônico ou impresso, à escolha do titular (§2º);
  - com cópia eletrônica integral quando a base é o consentimento (§3º).
- Agente de pequeno porte: prazo em dobro para atender pedidos do art. 18 e para a declaração do art. 19 II
  [D03 art. 14, I e III]. A declaração simplificada pode sair em até 15 dias [D03 art. 15].
- Quando não puder atender na hora, o controlador responde dizendo por quê ou indicando o agente certo [D01 art. 18 §4º].
- O titular pode peticionar à ANPD e aos órgãos de defesa do consumidor [D01 art. 18 §§1º e 8º].

**(3) Encarregado.**
- Regra geral: o controlador indica encarregado e divulga identidade e contato "preferencialmente no sítio
  eletrônico" [D01 art. 41 caput e §1º].
- Agente de pequeno porte "não é obrigado" a indicar encarregado, mas deve manter canal de comunicação com o titular
  [D03 art. 11 caput e §1º]. Indicar é boa prática [D03 art. 11 §2º].
- Quem é de pequeno porte: microempresa, EPP (incluído o MEI), startup, PJ de direito privado, e também a pessoa
  natural que trata dados como controlador [D03 art. 2º I e II].
- Perde o benefício quem:
  - faz tratamento de alto risco [D03 art. 3º I];
  - passa do teto de receita da LC 123 [D03 art. 3º II];
  - pertence a grupo que passa desse teto [D03 art. 3º III].
- **Alto risco** exige um critério geral **e** um específico [D03 art. 4º]. Nenhum dos específicos aparece na lista de
  espera, por leitura minha do código: sem tecnologia emergente aplicada ao titular, sem vigilância de zona pública,
  sem decisão automatizada e sem dado sensível, de criança ou de idoso. Por isso, inferido, a lista não é de alto
  risco.
- Conclusão: a dispensa se aplica **se** o controlador de `NEXT_PUBLIC_CONTROLLER_NAME` for ME, EPP, MEI, startup ou
  pessoa natural dentro do teto. Isso é fato do dono (ambiguidade A1).
- A Res. CD/ANPD 18/2024 (atuação do encarregado) **não foi lida**: o DOU recusou o download (403) e o navegador
  embutido. Ela não muda a dispensa do art. 11 da Res. 2/2022, que a lista [D02] dá como vigente.

**(4) Transferência internacional (PostHog).**
- Já tratada no dossiê `landing-cookies-variantes`:
  - host fora do Brasil é transferência [D01 art. 5º XV];
  - precisa de hipótese legal e de mecanismo (Res. 19/2024, Anexo I art. 9º);
  - União Europeia: adequação pela Res. 32/2026;
  - EUA: cláusulas-padrão ou consentimento específico e em destaque [D01 art. 33 VIII].
- O que a página tem de dizer se a transferência for por **cláusulas-padrão**: o controlador publica, em português e
  em linguagem simples [D04 art. 17 §2º]:
  - forma, duração e finalidade;
  - país de destino;
  - identificação e contato do controlador;
  - uso compartilhado;
  - responsabilidades dos agentes **e medidas de segurança**;
  - direitos e meios de exercício, inclusive peticionar à ANPD.
- A íntegra das cláusulas vai ao titular que pedir, em 15 dias [D04 art. 17 caput e §1º].
- Para a adequação da UE, não li norma que exija o mesmo documento; a página traz o país do mesmo jeito.
- Na página escrita, o bloco do PostHog só aparece com as quatro variáveis da análise preenchidas. Ele cobre:
  - país (`NEXT_PUBLIC_ANALYTICS_LOCATION_TEXT`), prazo, finalidade e forma;
  - controlador e direitos (seções próprias).
- **Não cobre as medidas de segurança do PostHog**: não li o contrato dele (lacuna herdada do dossiê de cookies).

**Termos de uso (fora do escopo da página, pergunta do relato).**
- Nenhuma norma lida exige termos de uso de uma lista de espera:
  - o Marco Civil fala em "eventuais políticas de uso" [D06 art. 7º XI];
  - o Decreto 7.962/2013 obriga a identificar o fornecedor só nos sítios "utilizados para oferta ou conclusão de
    contrato de consumo" [D07 art. 2º].
- A lista não tem preço nem contrato; inferido, o decreto não se aplica a ela. Passa a se aplicar quando houver oferta
  (preço ou benefício Founder escrito, que vincula pelo CDC art. 30, dossiê `waitlist-lgpd-cdc`).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Conteúdo mínimo | LGPD art. 9º | [D01] | "de forma clara, adequada e ostensiva acerca de, entre outras características previstas em regulamentação" |
| Menção ao art. 18 | LGPD art. 9º VII | [D01] | "direitos do titular, com menção explícita aos direitos contidos no art. 18 desta Lei" |
| Prazo por regulamento | LGPD art. 18 §5º | [D01] | "será atendido sem custos para o titular, nos prazos e nos termos previstos em regulamento" |
| Declaração completa | LGPD art. 19 II | [D01] | "fornecida no prazo de até 15 (quinze) dias, contado da data do requerimento do titular" |
| Cópia eletrônica | LGPD art. 19 §3º | [D01] | "o titular poderá solicitar cópia eletrônica integral de seus dados pessoais" |
| Petição | LGPD art. 18 §§1º e 8º | [D01] | "o direito de peticionar em relação aos seus dados contra o controlador perante a autoridade nacional" |
| Encarregado | LGPD art. 41 §1º | [D01] | "deverão ser divulgadas publicamente, de forma clara e objetiva, preferencialmente no sítio eletrônico do controlador" |
| Dispensa | Res. 2/2022 art. 11 | [D03] | "não são obrigados a indicar o encarregado pelo tratamento de dados pessoais" |
| Canal | Res. 2/2022 art. 11 §1º | [D03] | "deve disponibilizar um canal de comunicação com o titular de dados" |
| Quem é pequeno porte | Res. 2/2022 art. 2º I | [D03] | "bem como pessoas naturais e entes privados despersonalizados que realizam tratamento de dados pessoais" |
| Exclusões | Res. 2/2022 art. 3º | [D03] | "realizem tratamento de alto risco para os titulares" |
| Alto risco | Res. 2/2022 art. 4º | [D03] | "atender cumulativamente a pelo menos um critério geral e um critério específico" |
| Prazo em dobro | Res. 2/2022 art. 14 I e III | [D03] | "Aos agentes de tratamento de pequeno porte será concedido prazo em dobro" |
| Transparência da transferência | Res. 19/2024 art. 17 §2º | [D04] | "publicar em sua página na Internet documento contendo informações em língua portuguesa, em linguagem simples" |
| Informação clara | Marco Civil art. 7º VIII | [D06] | "informações claras e completas sobre coleta, uso, armazenamento, tratamento e proteção de seus dados pessoais" |
| Políticas de uso | Marco Civil art. 7º XI | [D06] | "publicidade e clareza de eventuais políticas de uso" |
| Registro de acesso | Marco Civil art. 15 | [D06] | "deverá manter os respectivos registros de acesso a aplicações de internet, sob sigilo [...] pelo prazo de 6 (seis) meses" |
| Comércio eletrônico | Dec. 7.962/2013 art. 2º | [D07] | "utilizados para oferta ou conclusão de contrato de consumo" |

## 3. Vigência conferida
- **LGPD [D01] e Marco Civil [D06]:** acervo, versão compilada, cópia de 13/10/2026, sem alerta. Os artigos citados
  não trazem marca de alteração posterior à Lei 13.853/2019.
- **Decreto 7.962/2013:** o acervo [D05] está em `versao_texto: original` (alerta). Conferido na fonte oficial,
  Planalto [D07], sem marca de "Redação dada", "Incluído" ou "Vide" no art. 2º.
- **ANPD:** fora do acervo. Lista de regulamentações [D02], baixada em 26/11/2026:
  - Res. 2/2022: "Vigente com alterações pela Resolução CD/ANPD nº 15", que só mudou o art. 14 II (incidente) [D03];
  - Res. 18/2024: "Vigente";
  - Res. 19/2024: "Vigente com as alterações da RETIFICAÇÃO DE 18/08/2025";
  - nenhum regulamento de direitos do titular.
- **Res. 19/2024 [D04]:** a página mudou desde 29/10/2026 só no menu ("Auditoria" para "Auditorias"), como no dossiê
  de cookies. Os artigos citados não mudaram.
- **Res. 2/2022 [D03]:** o `legal.py` acusou a mesma mudança de menu. O texto citado é o do art. 2º ao 15.

## 4. Ambiguidades (só o que precisa de decisão humana)

**A1. O controlador é agente de pequeno porte?**
- Leitura 1: é (ME, EPP, MEI, startup ou pessoa natural, dentro do teto, sem alto risco) [D03 arts. 2º e 3º].
  - Basta o canal de contato [D03 art. 11 §1º], que a página já traz.
  - Os prazos dobram [D03 art. 14].
- Leitura 2: não é (receita acima do teto, grupo econômico, ou PJ de outra natureza).
  - A página tem de nomear o encarregado, com identidade e contato [D01 art. 41 §1º].
- **Mais segura:** nomear um encarregado de qualquer modo. É boa prática [D03 art. 11 §2º] e não depende do porte.
- Pergunta ao contador: "O CNPJ/CPF que vai em NEXT_PUBLIC_CONTROLLER_NAME se enquadra no art. 2º da Res. CD/ANPD
  2/2022, sem as exclusões do art. 3º?"

**A2. Prazo de resposta a prometer na página.**
- Leitura 1: 15 dias para a declaração completa [D01 art. 19 II]. Vale para todo agente, é a mais segura e é a que a
  página escrita promete (ponto R4).
- Leitura 2: 30 dias, em dobro, se A1 for "sim" [D03 art. 14 III]. Dá folga, mas só vale com o porte confirmado.
- Atender na hora em formato simplificado (art. 19 I) depende de alguém ler o e-mail. A página não promete isso.

**A3. Servidor e backup contratados são "uso compartilhado" (art. 9º V; art. 18 VII)?**
- Leitura 1: são operadores que tratam em nome do controlador [D01 art. 5º VII]. Não é compartilhamento, mas a página
  tem de dizer que existem (forma do tratamento, art. 9º II e VI).
- Leitura 2: qualquer terceiro que recebe o dado conta como compartilhamento.
- **Mais segura:** nomear provedor e país dos dois quando forem escolhidos (ponto R3; pré-condições P5 e P7). O
  destino do backup pode estar fora do Brasil (`BACKUP_REMOTE` é livre), e aí o art. 33 vale mesmo sem PostHog.

**A4. Marco Civil art. 15 e a frase "o IP não é gravado".**
- Leitura 1: o controlador é PJ com fins econômicos e provedor de aplicação, então tem de guardar data, hora e IP por
  6 meses [D06 art. 15]. A landing não guarda: o Caddyfile não tem `log`.
- Leitura 2: pessoa física, ou lista sem fins econômicos diretos: o caput não se aplica (§1º: só por ordem judicial).
- Efeito: na leitura 1 a página muda (passa a citar o registro) e a contagem não pode ser cruzada com ele.
- Lacuna `L-20261126-174904-21bb`, classe fork, na caixa da landing.

## 5. Lacunas
- **Res. CD/ANPD 18/2024 (encarregado): não lida.** O DOU (in.gov.br) recusou o `baixar` (HTTP 403) e o navegador
  embutido. Pode detalhar como divulgar o encarregado; não muda a dispensa da Res. 2/2022.
- **Contrato do PostHog** (onde trata, medidas de segurança, cláusulas-padrão): não lido. Herdado do dossiê
  `landing-cookies-variantes`.
- **Agenda regulatória (Res. 23/2024 com a Res. 31/2025):** não li se o regulamento de direitos do titular está nela
  nem com que data.
- **Guia da ANPD sobre agentes de pequeno porte e o guia do encarregado:** não pesquisados.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 13.709 de 14/08/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/183a6accb5801eb88fe63d57acdd375ae6339401/federal/leis-ordinarias/2018/lei-13709-2018-08-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2018-08-14;13709> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-26T14:34:26-03:00 · arquivo local `docs/D01_lei-13709-2018-08-14.md` · SHA-256 `72d32431037ce85955c6f959f50f11d10971a8ec36f93cdae5ee3459ec66a4dd`
- **[D02]** Regulamentações da ANPDPortal Gov.br — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd>  
  Baixado em 2026-11-26T14:34:52-03:00 · arquivo local `docs/D02_regulamentacoes_anpd.html` · SHA-256 `f5f71a48cf0d2619d3adc090ebae207e7cd5d1a58b9b7f89638a5b86ace7fdd6`
- **[D03]** Resolução CD/ANPD nº 2, de 27 de janeiro de 2022Portal Gov.br — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022>  
  Baixado em 2026-11-26T14:35:13-03:00 · arquivo local `docs/D03_resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022.html` · SHA-256 `7a62912f1ef458ff9f9a2f630aac9ec9429f415480d08c607d926d5d71a09d50`  
  ⚠ TEXTO MUDOU desde 2026-10-29. Dossiês que citaram a versão anterior: lgpd-teammates-ia-mcp D04. Conferir se a conclusão deles ainda vale
- **[D04]** Resolução CD/ANPD nº 19, de 23 de agosto de 2024Portal Gov.br — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024>  
  Baixado em 2026-11-26T14:35:34-03:00 · arquivo local `docs/D04_resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024.html` · SHA-256 `9b45afdfd004f90dcec6ae0184f712b24fcecbbca1fe20f2d93b7813020659f2`  
  ⚠ TEXTO MUDOU desde 2026-10-29. Dossiês que citaram a versão anterior: lgpd-teammates-ia-mcp D03. Conferir se a conclusão deles ainda vale
- **[D05]** Decreto nº 7.962 de 15/03/2013 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2013/dec-7962-2013-03-15.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2013-03-15;7962> · versao_texto: original · cópia de 2026-10-16  
  Lido em 2026-11-26T14:36:06-03:00 · arquivo local `docs/D05_dec-7962-2013-03-15.md` · SHA-256 `29024d783fd7a78a19ba4f51814649543cfa91bdeb3b2bcf3687579f5d3472d8`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D06]** Lei nº 12.965 de 23/04/2014 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/304b3a90473b9f312cbbff04119cbc81dd492e3c/federal/leis-ordinarias/2014/lei-12965-2014-04-23.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2014-04-23;12965> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-26T14:36:08-03:00 · arquivo local `docs/D06_lei-12965-2014-04-23.md` · SHA-256 `3ab62009e0cbb77fa5c2113950e088852347108d8ec05c45f57dedff40923a38`
- **[D07]** Decreto nº 7962 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm>  
  Baixado em 2026-11-26T14:36:22-03:00 · arquivo local `docs/D07_d7962-htm.html` · SHA-256 `0b4cd5cd2bc1d9ed61a73f270e9184d88f31a82b9c553835cd990687dde2ff12`

## Registro de buscas
_Nenhuma busca registrada._
