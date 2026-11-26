# Relatório de pesquisa legal — landing-resend-transferencia-internacional

**Pergunta:** Landing: enviar o e-mail de confirmação de inscrição pelo Resend (dados nos EUA, sem cláusulas-padrão da ANPD) é transferência internacional permitida pela LGPD? Qual hipótese do art. 33, requisitos, e o que consentimento e política de privacidade devem dizer
**Aberto em:** 2026-11-26T17:49:26-03:00 · **Atualizado em:** 2026-11-26T17:58:23-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Em duas linhas:** com o Resend como ele é hoje, a LGPD só permite o envio por um caminho: o **consentimento
específico e em destaque para a transferência** [D01 art. 33 VIII]. Os outros caminhos não servem. Os EUA não têm
decisão de adequação (a única é a da UE [D02 art. 1º; D05]). O Resend recusa por escrito as cláusulas-padrão da ANPD
[F02], e elas só valem assinadas e sem alteração [D04 Anexo I art. 16].
**Risco principal:** o próprio DPA faz do Resend **controlador independente** do endereço de destino da mensagem
[F01 cl. 1.7 e 9.1]. Isso pede um consentimento específico a mais, para compartilhar com outro controlador
[D01 art. 7º §5º]. E ligar a chave com o texto v2 ("não são repassados a terceiros") torna nulo o consentimento de
quem se inscrever [D01 art. 9º §1º].

Graus: **verificado** = li o texto vigente; **inferido** = aplicação minha ao caso, sobre texto lido; **fato de
fornecedor** = o que o documento do Resend diz na data da leitura (não é norma).

### 1.1 É transferência internacional?
**Sim.** Ao mandar o e-mail, o servidor da landing transmite nome, e-mail e o link de confirmação
(`src/entities/lead/model/email-confirmation.ts:45`) a uma empresa nos EUA, que os guarda lá:
"Resend stores customer data in the United States, including message content, delivery logs, webhook payloads, and
account records" [F02].
- A LGPD define transferência internacional como a "transferência de dados pessoais para país estrangeiro"
  [D01 art. 5º XV]. O regulamento chama de transferência transmitir, compartilhar "ou disponibiliza[r] acesso" a outro
  agente [D04 Anexo I art. 3º III]. O importador é o agente "localizado em país estrangeiro" [art. 3º II]. A
  transferência se caracteriza "quando o exportador transferir dados pessoais para o importador" [art. 5º].
  *Verificado (texto) / inferido (aplicação).*
- **A região de envio São Paulo não muda nada:** a região "does not control where data is stored" [F02]. *Fato de
  fornecedor.*
- **Não é "coleta internacional"** [D04 Anexo I arts. 3º V e 6º]. Quem coleta é a landing, no formulário dela, e o
  Resend só recebe depois. *Inferido.*

### 1.2 O que toda transferência precisa
Duas coisas ao mesmo tempo [D04 Anexo I art. 9º]:
1. uma **base legal** do art. 7º. A da lista é o consentimento [D01 art. 7º I], que a política já declara;
2. um **mecanismo** do art. 33.

Além disso, a transferência se limita "ao mínimo necessário" [D04 Anexo I art. 9º, par. ún.]. *Inferido:* o e-mail
funciona sem o nome ("Olá, Fulana"). Tirar o nome reduz o que vai aos EUA.

Quem tem de verificar e provar o mecanismo é o **controlador** (o dono da landing) [D04 Anexo I art. 4º III]. O
operador só presta "auxílio … mediante o fornecimento das informações de que dispuser" [art. 4º §1º]. *Verificado.*

### 1.3 Cada hipótese do art. 33 neste caso (item 2 do pedido)

| Hipótese | Serve? | Por quê |
|---|---|---|
| **I — país adequado** | **Não** | Só a UE (mais Islândia, Liechtenstein e Noruega) foi reconhecida [D02 art. 1º e par. ún.]. A página da ANPD repete que é a única [D05]. O EU-U.S. Data Privacy Framework citado pelo Resend [F02] é decisão de outro país: "Decisões de adequação emitidas por outros países não são válidas para o Brasil" [D05]. *Verificado.* |
| **II "b" — cláusulas-padrão da ANPD** | **Não** | Só valem com "adoção integral e sem alteração do texto disponibilizado no Anexo II, mediante instrumento contratual firmado entre o exportador e o importador" [D04 Anexo I art. 16]. O Resend: "We don't sign … Brazil LGPD / ANPD standard contractual clauses" [F02]. As cláusulas europeias do DPA dele [F01 cl. 6.1] não servem: equivalência de cláusula estrangeira depende de reconhecimento da ANPD [D04 Anexo I art. 18], e nenhuma foi reconhecida [D05]. *Verificado (norma) / fato de fornecedor (recusa).* |
| **II "a" — cláusulas específicas** | **Não, na prática** | O controlador pede a aprovação à ANPD com a íntegra das cláusulas [D04 Anexo I arts. 21, 22 e 24]. Exigiria um contrato próprio assinado pelo Resend, que só oferece o DPA padrão [F02], e um processo na ANPD. *Inferido.* |
| **II "c" — normas corporativas globais** | **Não** | Valem só entre empresas do mesmo grupo [D04 Anexo I art. 25]. *Verificado.* |
| **II "d" — selos e certificados** | **Não** | A Res. 19/2024 regula só as alíneas "a", "b" e "c" [D04 art. 1º]. Não achei na lista de regulamentações da ANPD [D06] ato que designe organismo de certificação [D01 art. 35 §3º]. *Inferido.* |
| **III a VII** | **Não** | Cooperação entre órgãos públicos, proteção da vida, autorização da ANPD, acordo internacional, política pública [D01 art. 33 III–VII]. Nada disso é o caso. *Verificado.* |
| **VIII — consentimento específico e em destaque** | **Sim, é o único caminho** | O titular dá "consentimento específico e em destaque para a transferência, com informação prévia sobre o caráter internacional da operação, distinguindo claramente esta de outras finalidades" [D01 art. 33 VIII]. Requisitos no §1.5. Fica a dúvida A1 (§4). |
| **IX — necessário para o art. 7º II, V ou VI** | **Não (leitura mais segura)** | A base da lista é o consentimento (7º I), que o inciso IX não alcança. Mesmo lendo a inscrição como "procedimento preliminar" de contrato (7º V), a transferência não é "necessária": o mesmo e-mail sai por fornecedor no Brasil ou na UE. Ver A3. *Inferido.* |

### 1.4 O problema que o §5.9 não mostrava: o Resend é controlador do endereço de destino
- O DPA define "Company Usage Data" incluindo "data used to identify the source and destination of a communication,
  activity logs" [F01 cl. 1.7]. Sobre esses dados: "Company is an independent controller, not a joint controller with
  Customer" [F01 cl. 9.1]. Os fins incluem "to provide, optimize, and maintain the Services", segundo a política de
  privacidade do próprio Resend [F01 cl. 9.1]. *Fato de fornecedor.*
- O destino de um e-mail é o endereço do inscrito. **Para esse dado, o Resend não é só operador da landing: é outro
  controlador.** *Inferido.*
- Efeito na LGPD:
  - quem tem o consentimento e precisa "comunicar ou compartilhar dados pessoais com outros controladores deverá obter
    consentimento específico do titular para esse fim" [D01 art. 7º §5º];
  - a informação "acerca do uso compartilhado de dados pelo controlador e a finalidade" entra no aviso
    [D01 art. 9º V]. O uso compartilhado inclui a transferência internacional entre entes privados
    [D01 art. 5º XVI].

  *Verificado (texto) / inferido (aplicação).*
- **Consequência:** o consentimento do inscrito, no caminho do Resend, tem de cobrir **duas** coisas: a ida aos EUA
  (art. 33 VIII) e o compartilhamento do endereço com o Resend como controlador (art. 7º §5º). As duas cabem na mesma
  caixa específica, desde que o texto diga as duas.

### 1.5 Requisitos do consentimento do art. 33 VIII
Texto da lei [D01]:
- **específico e em destaque para a transferência** (art. 33 VIII);
- **informação prévia sobre o caráter internacional** (art. 33 VIII);
- **distinguindo claramente esta de outras finalidades** (art. 33 VIII);
- livre, informado e inequívoco, para finalidade determinada (art. 5º XII); autorização genérica é nula (art. 8º §4º);
- é do controlador o ônus de provar que obteve o consentimento (art. 8º §2º);
- pode ser revogado a qualquer momento, por procedimento gratuito e facilitado (art. 8º §5º);
- é nulo se a informação for enganosa ou não for apresentada antes, com transparência (art. 9º §1º).

O que isso pede no produto (*inferido*):
- uma **caixa própria, desmarcada**, separada da caixa de inscrição;
- o registro, por inscrito, da versão do texto e da data do aceite **dessa** caixa (a prova do art. 8º §2º);
- um texto que nomeie **EUA**, **Resend**, **o que vai** (e-mail, e o nome se continuar indo), **para quê** (só o
  e-mail de confirmação), **por quanto tempo** fica lá (30 dias de mensagens e registros, 7 de cópia de segurança
  [F02; plano §5.9]) e que o Resend usa o endereço também para fins próprios (§1.4);
- **o que acontece se a pessoa não marcar a caixa**: ver A1.

**Revogação:** depois de enviado, o e-mail já está no Resend. Apagar uma mensagem enviada só é possível pelo suporte
(plano §5.9). O pedido de eliminação [D01 art. 18 VI] chega a ele por esse canal ou pelo prazo de 30 dias. *Fato de
fornecedor / inferido.*

### 1.6 Caixa de correio do inscrito (Gmail, Outlook etc.) não é transferência do controlador
O e-mail sempre termina no provedor de correio **escolhido pelo próprio inscrito**, que muitas vezes fica nos EUA.
- *Inferido:* isso não é transferência da landing, porque esse provedor não é agente de tratamento da landing. O
  regulamento exige transferência de um agente "a outro agente de tratamento" [D04 Anexo I art. 3º III], e o provedor
  de correio age para o titular.
- Isso vale para qualquer caminho, inclusive SMTP próprio no Brasil.
- Não está em texto da ANPD (ver lacuna L3).

### 1.7 O que muda no texto de consentimento e na política, por caminho (item 4)
Hoje:
- o **consentimento v2** diz "não são repassados a terceiros" (`src/features/lead-capture/ui/consent-text.tsx:20`);
- a **política P1**, seção "Onde os dados ficam e quem mais os trata", diz "Não vendemos nem repassamos os dados da
  inscrição a ninguém" (`src/app/privacidade/privacy-policy.tsx:204`).

**Em todos os caminhos** (*inferido*):
- "não são repassados a terceiros" deixa de ser verdade, porque um fornecedor recebe o e-mail para enviar a mensagem.
  Manter a frase faz a informação enganosa e o consentimento nulo [D01 art. 9º §1º];
- o texto passa a dizer que os dados não são vendidos nem usados por outras empresas para fins delas, e que um
  prestador contratado envia os e-mails em nome do controlador, nomeado na política;
- versão nova (v3);
- a política nomeia o prestador, o papel dele, o país e o mecanismo [D01 art. 9º V e VI].

| Caminho | Consentimento | Política |
|---|---|---|
| **A. Resend + art. 33 VIII** | v3 sem "não são repassados a terceiros", **mais uma caixa própria desmarcada** (texto-modelo abaixo). Registrar o aceite dessa caixa com versão e data. | Seção nova "Envio de e-mails e transferência para os EUA". Deve dizer: Resend, Inc., EUA; o que vai e para quê; 30 dias de guarda (7 de cópia); que o Resend é controlador do endereço de destino para fins próprios [F01 9.1], com link para a política dele; que os EUA não têm adequação reconhecida pela ANPD; como revogar e o que acontece com o que já foi. **Também:** o art. 8º §6º manda avisar com destaque quem já se inscreveu, se a mudança alcançar essas pessoas (ver §1.9, item 3). |
| **B. Fornecedor fora do Brasil que assina as cláusulas-padrão da ANPD** | v3 sem "não são repassados a terceiros". **Não precisa de caixa de transferência**: o mecanismo é o contrato [D01 art. 33 II "b"]. Se o fornecedor também for controlador de algum dado (como o Resend no §1.4), volta a precisar do consentimento do art. 7º §5º. | O documento de transparência em português, em página própria ou "de forma destacada" na política [D04 Anexo I art. 17 §§2º e 3º]: forma, duração e finalidade; país de destino; controlador e contato; uso compartilhado; responsabilidades e medidas de segurança; direitos e como exercê-los, inclusive peticionar à ANPD. Entrega das cláusulas a quem pedir, em 15 dias [art. 17 caput e §1º]. |
| **C. Fornecedor que trata e guarda só na UE/EEE** | v3 sem "não são repassados a terceiros". Sem caixa de transferência: o mecanismo é a adequação [D02 art. 1º]. | Informar país (UE), prestador e finalidade [D01 art. 9º V e VI]. A transferência tem de ser "informad[a] ao titular" [D04 Anexo I art. 9º]. *Inferido:* a página do art. 17 §2º está na seção das cláusulas-padrão e não se aplica literalmente à adequação. Usar o mesmo conteúdo é a leitura segura. |
| **D. Fornecedor brasileiro que trata e guarda no Brasil, ou SMTP no próprio servidor no Brasil** | v3 sem "não são repassados a terceiros". Sem caixa de transferência: não há transferência. | Nomear o prestador como operador [D01 art. 9º VI]. Se for SMTP próprio, o país é o do servidor da landing (§1.9). |

**Texto-modelo da caixa do caminho A** (rascunho para o dono e o advogado, *não ratificado*):
> ☐ Autorizo o envio do meu e-mail [e nome] para os **Estados Unidos**, à **Resend, Inc.**, empresa que manda o e-mail
> de confirmação da inscrição em nome de {controlador}. Os EUA não têm reconhecimento da autoridade brasileira de
> proteção de dados (ANPD) de que protegem dados como a lei brasileira. A Resend guarda a mensagem e o registro do
> envio por até 30 dias e usa o endereço também para manter e proteger o serviço dela (política da Resend: link). Esta
> autorização é só para esse envio. Posso retirá-la quando quiser por {contato}.

### 1.8 Alternativas que evitam ou amparam a transferência (item 5)
Descritas pelo requisito legal, sem escolher fornecedor. Para cada candidato, conferir no contrato dele, por escrito:

| Requisito | O que conferir no contrato | Efeito |
|---|---|---|
| **Sem transferência** | Tratamento **e** guarda no Brasil: conteúdo, registros, cópia de segurança e suboperadores. Empresa com sede no Brasil, ou ver A5 se a sede for no exterior. | Só o contrato de operador [D01 art. 39]. Sem mecanismo do art. 33. |
| **Adequação** | Tratamento e guarda **só** na UE/EEE, suboperadores incluídos, e sem acesso a partir de fora [D04 Anexo I art. 3º III, "disponibiliza acesso"]. Não basta enviar da UE, como no Resend. | Art. 33 I [D02]. |
| **Cláusulas-padrão da ANPD** | Assina o Anexo II **integral e sem alteração**, como contrato próprio ou aditivo [D04 Anexo I art. 16 e §§1º–3º]. Opção A da Cláusula 4, com a landing como controladora e o fornecedor como operador [D04 Anexo II, Cl. 4]. Nada no resto do contrato pode "excluir, modificar ou contrariar" as cláusulas [art. 16 §2º]. | Art. 33 II "b", em qualquer país. |
| **Sem papel de controlador próprio** | O fornecedor não se declara controlador do destinatário ou dos registros de envio, como faz o Resend [F01 cl. 9.1]. | Dispensa o consentimento do art. 7º §5º. |
| **SMTP no próprio servidor** | Nenhum contrato de envio, porque o servidor da landing manda o e-mail. A entrega costuma pior (reputação do IP, SPF/DKIM): é questão técnica, não legal. | Cai na mesma resposta do servidor (§1.9). |

*Fato já lido em outro dossiê, não escolha:* em 29/10/2026, o CDPA do Google Cloud trazia as BR SCCs da ANPD
(dossiê `lgpd-teammates-ia-mcp`, §6). Isso mostra que o requisito existe no mercado. Não li o contrato de nenhum
serviço de e-mail além do Resend.

### 1.9 O que vale igual para as outras duas pesquisas (servidor e armazenamento fora do Brasil) (item 6)
**Vale igual, seja qual for o país:**
1. o enquadramento: transferência = dado que sai para agente no exterior [D01 art. 5º XV; D04 Anexo I arts. 3º e 5º];
   precisa de base **e** mecanismo [D04 Anexo I art. 9º]; quem prova é o controlador [art. 4º III];
2. a lista de mecanismos e o estado deles hoje: só a UE é adequada [D02; D05]; cláusulas da ANPD só integrais e
   assinadas [D04 art. 16]; nenhuma cláusula equivalente, específica ou norma corporativa aprovada [D05]; selo sem
   regulamento [D04 art. 1º];
3. a frase "não vendemos nem repassamos" da política e "não são repassados a terceiros" do consentimento precisam
   mudar em qualquer caso de prestador (§1.7).

**Muda para servidor e armazenamento:**
- **O consentimento do art. 33 VIII não serve** (*inferido*):
  - o servidor e a cópia de segurança recebem **todos** os dados: inscritos, visitantes, registros de acesso;
  - não dá para condicionar a guarda de cada dado ao consentimento de cada pessoa, nem desfazê-la quando alguém
    revoga;
  - o visitante que nunca se inscreveu não dá consentimento nenhum.
  
  Para essas duas, os caminhos reais são três: **Brasil** (sem transferência), **UE/EEE** (adequação) ou **outro país
  com as cláusulas da ANPD assinadas**.
- **Depende do país que o dono ainda não escolheu:**
  - servidor no Brasil: o SMTP próprio (caminho D) também fica sem transferência;
  - servidor nos EUA ou em outro país sem adequação: o servidor inteiro precisa das cláusulas da ANPD no contrato de
    hospedagem, e o e-mail pelo SMTP próprio herda esse amparo;
  - mesma lógica para o armazenamento da cópia de segurança e da mídia.

**Recomendação (estrutural):** decidir as três pesquisas juntas, com um critério único para todo fornecedor da landing:
Brasil, UE/EEE ou cláusulas da ANPD assinadas. Assim nenhum dado da lista depende de um consentimento por pessoa que
pode ser revogado.
- **Versão incremental:** o e-mail pode entrar antes, por um fornecedor que já cumpra o critério (§1.8), sem esperar o
  servidor.
- **Alternativa (remendo): Resend com a caixa do art. 33 VIII.** O que ela deixa aberto:
  - A1;
  - quem não marca a caixa;
  - os e-mails futuros à lista. O consentimento v2 já promete o link "sair" "de qualquer e-mail". Cada envio futuro
    pelo Resend para quem se inscreveu na v2 precisa da caixa dessa pessoa, e do aviso do art. 8º §6º;
  - a dependência de um fornecedor que recusa por escrito o mecanismo da ANPD.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Definição | LGPD art. 5º XV | [D01] | "transferência de dados pessoais para país estrangeiro ou organismo internacional do qual o país seja membro" |
| Rol fechado | LGPD art. 33 caput | [D01] | "A transferência internacional de dados pessoais somente é permitida nos seguintes casos" |
| Consentimento para transferir | LGPD art. 33 VIII | [D01] | "consentimento específico e em destaque para a transferência, com informação prévia sobre o caráter internacional da operação, distinguindo claramente esta de outras finalidades" |
| Necessidade | LGPD art. 33 IX | [D01] | "quando necessário para atender as hipóteses previstas nos incisos II, V e VI do art. 7º" |
| Outro controlador | LGPD art. 7º §5º | [D01] | "deverá obter consentimento específico do titular para esse fim" |
| Prova | LGPD art. 8º §2º | [D01] | "Cabe ao controlador o ônus da prova de que o consentimento foi obtido em conformidade" |
| Finalidade determinada | LGPD art. 8º §4º | [D01] | "as autorizações genéricas para o tratamento de dados pessoais serão nulas" |
| Mudança de informação | LGPD art. 8º §6º | [D01] | "o controlador deverá informar ao titular, com destaque de forma específica do teor das alterações" |
| Nulidade | LGPD art. 9º §1º | [D01] | "considerado nulo caso as informações fornecidas ao titular tenham conteúdo enganoso ou abusivo" |
| Uso compartilhado | LGPD art. 9º V; art. 5º XVI | [D01] | "informações acerca do uso compartilhado de dados pelo controlador e a finalidade" |
| Base + mecanismo | Res. 19/2024 Anexo I art. 9º | [D04] | "desde que amparada em: I - uma das hipóteses legais previstas no art. 7º … e II - um dos seguintes mecanismos válidos" |
| Mínimo necessário | Res. 19/2024 Anexo I art. 9º par. ún. | [D04] | "deverá se limitar ao mínimo necessário para o alcance de suas finalidades" |
| Dever do controlador | Res. 19/2024 Anexo I art. 4º III | [D04] | "está amparada em hipótese legal e em mecanismo de transferência internacional válidos" |
| Transferência | Res. 19/2024 Anexo I art. 3º III | [D04] | "transmite, compartilha ou disponibiliza acesso a dados pessoais a outro agente de tratamento" |
| Cláusulas integrais | Res. 19/2024 Anexo I art. 16 | [D04] | "adoção integral e sem alteração do texto disponibilizado no Anexo II, mediante instrumento contratual firmado entre o exportador e o importador" |
| Transparência | Res. 19/2024 Anexo I art. 17 §2º | [D04] | "publicar em sua página na Internet documento contendo informações em língua portuguesa" |
| UE adequada | Res. CD/ANPD 32/2026 art. 1º | [D02] | "Fica reconhecida a União Europeia como organismo internacional que proporciona grau de proteção de dados pessoais adequado" |
| Única adequação | Página da ANPD | [D05] | "Até o momento, a União Europeia foi considerada como organismo internacional adequado" |
| Decisão estrangeira | Página da ANPD | [D05] | "Decisões de adequação emitidas por outros países não são válidas para o Brasil" |
| Nada aprovado além | Página da ANPD | [D05] | "não houve nenhuma decisão do Conselho Diretor da ANPD acerca de cláusulas contratuais específicas, cláusulas-padrão equivalentes ou normas corporativas globais" |

## 3. Vigência conferida
- **[D01] LGPD:** acervo, versão compilada, cópia de 13/10/2026, sem alerta mecânico.
  - *Evidência de texto mais novo:* a Lei 15.352/2026 mudou a parte institucional (ANPD vira "Agência"). Por isso
    baixei a compilada do Planalto [D03].
  - Nos arts. 5º, 7º a 9º e 33 a 36 do Planalto não há nenhuma marca "Redação dada", "Incluído" ou "Vide" de 2025 ou
    2026. A 15.352/2026 aparece só nos arts. 5º VIII e XIX e 55-A em diante.
  - Os oito trechos citados foram buscados literalmente no Planalto e aparecem iguais.
- **[D02] Res. CD/ANPD 32/2026:** acervo (`reguladores/mj/resolucoes/2026/`), "publicação original" do DOU de
  27/01/2026. O alerta mecânico pede a compilada. Resolvi pela lista oficial da ANPD [D06], que dá a resolução como
  "Vigente" sem alteração, e pela página de transferência [D05], que a confirma como a única adequação. Reavaliação
  prevista em até 4 anos [D02 art. 4º §1º].
- **[D04] Res. CD/ANPD 19/2024:** não está no acervo (a pasta `reguladores/mj/resolucoes/2024` só tem as resoluções
  CD/ANPD 12, 13, 14, 16 e 20). Baixada do portal da ANPD.
  - Status oficial: "Vigente com as alterações da RETIFICAÇÃO DE 18/08/2025" [D06]. A retificação toca os itens 15.2
    e 15.3 do Anexo II (dossiê `lgpd-teammates-ia-mcp`), que não uso.
  - O `baixar` acusou "TEXTO MUDOU desde 2026-10-29". A diferença é só o menu do portal ("Auditoria" → "Auditorias").
    O dossiê `landing-cookies-variantes` (25/11) já tinha visto isso. A conclusão do `lgpd-teammates-ia-mcp` não muda.
  - O prazo de 12 meses para adaptar contratos [D04 art. 2º, par. ún.] venceu em 23/08/2025.
- **Norma mais nova:** a resolução CD/ANPD mais recente da lista oficial [D06] é a 32/2026. No acervo, a única
  posterior é a 33/2026, que é sobre cargos e não toca o tema. Não há regulamento novo de transferência nem nova
  decisão de adequação até 26/11/2026 [D05; D06].

## 4. Ambiguidades (só o que precisa de decisão humana)

**A1. É "livre" o consentimento para a transferência se, sem ele, a pessoa não recebe o número Founder?**
- *Leitura 1:* pode condicionar. O art. 9º §3º admite tratamento "condição para o fornecimento de produto ou de
  serviço", desde que informado com destaque.
- *Leitura 2:* não pode. O art. 33 VIII pede consentimento "específico" para a transferência, "distinguindo
  claramente esta de outras finalidades". Se recusar a ida aos EUA tira o número, a escolha deixa de ser separada e de
  ser livre [D01 art. 5º XII].
- *Efeito:* na leitura 2, quem não marca a caixa precisa de outro caminho até o número, como confirmação por outro
  canal ou sem confirmação. Isso esvazia a confirmação, que o dono quer antes do número.
- *Mais segura:* leitura 2, ou um caminho sem transferência (§1.8). Na prática, a leitura 2 empurra para as
  alternativas.

**A2. O que o Resend faz como controlador do endereço de destino?**
- A cláusula 9.1 remete à política de privacidade do Resend, que **não li** [F01].
- Se ela permitir usar o endereço para marketing, perfil ou venda, o compartilhamento vai além do envio, e o texto da
  caixa (§1.7) tem de dizer isso.
- *Mais segura:* ler a política do Resend antes de redigir a caixa. Se ela for além de segurança, antiabuso e operação
  do serviço, ficar fora do Resend.

**A3. O art. 33 IX com o art. 7º V (procedimento preliminar de contrato) dispensa o consentimento?**
- *Sim:* a inscrição com número Founder seria passo preliminar de um contrato futuro, a pedido do titular.
- *Não:* a base declarada é o consentimento. Trocar de base muda a política. E a transferência não é "necessária",
  porque há fornecedor no Brasil ou na UE.
- *Mais segura:* não usar o IX.

**A4. Basta uma frase em destaque no texto atual, ou precisa de caixa separada?**
- A lei diz "em destaque" e "distinguindo claramente" [D01 art. 33 VIII]. Não diz "caixa".
- *Mais segura:* caixa própria, desmarcada, com registro próprio. Essa forma também facilita a prova do art. 8º §2º.

**A5. Fornecedor estrangeiro com região no Brasil faz transferência?**
- Relevante para as alternativas e para o servidor.
- *Leitura 1:* não, se o dado fica guardado no Brasil.
- *Leitura 2:* sim, se a empresa no exterior "disponibiliza acesso" para si, por suporte ou administração remota
  [D04 Anexo I art. 3º III], já que o importador é o agente "localizado em país estrangeiro" [art. 3º II].
- *Mais segura:* exigir no contrato que o acesso de fora do Brasil não ocorra, ou que tenha mecanismo (cláusulas da
  ANPD).

**Perguntas exatas ao advogado** (se o dono quiser levar o caminho A adiante):
1. "Para mandar o e-mail de confirmação de uma lista de espera por um fornecedor nos EUA que recusa as cláusulas-padrão
   da ANPD, o consentimento do art. 33, VIII, da LGPD pode ser condição para receber o número da lista, ou quem recusar
   precisa de outro caminho até o número?" (A1)
2. "Se o DPA do fornecedor o declara controlador independente do endereço de destino e dos registros de envio, basta
   uma única caixa de consentimento cobrir o art. 33, VIII, e o art. 7º, §5º, ou são consentimentos separados?" (§1.4,
   A2)
3. "Um prestador com sede no exterior e região de dados no Brasil, com acesso remoto do pessoal dele, faz transferência
   internacional pela Res. CD/ANPD 19/2024, Anexo I, art. 3º, III?" (A5; vale para as três pesquisas)

## 5. Lacunas (item 7)
- **L1.** A política de privacidade do Resend, que rege o uso do endereço como controlador [F01 cl. 9.1], não foi lida
  (A2).
- **L2.** A lista de suboperadores do Resend e o local de cada um: só pelo resumo do plano §5.9 ("22, todos com sede
  nos EUA; o local de tratamento de cada um não é dito"). Não reli.
- **L3.** Não achei texto da ANPD (guia, nota técnica ou FAQ) sobre a forma do consentimento do art. 33 VIII, nem
  sobre a caixa de correio do destinatário (§1.6). Busquei só nas páginas [D05] e [D06]. Guias e decisões
  sancionadoras não foram pesquisados.
- **L4.** O texto em português da Res. 32/2026 no DOU (in.gov.br) não foi baixado. Usei a cópia do acervo, que é a
  própria publicação do DOU.
- **L5.** Não li o contrato de nenhum outro serviço de envio de e-mail. As alternativas do §1.8 são critérios, não
  fornecedores conferidos.
- **L6.** O Anexo II da Res. 19/2024 (texto integral das cláusulas) não foi lido além das Cláusulas 4 e 14 e das
  definições. Só importa no caminho B.
- **Achado em outros dossiês:**
  - `lgpd-teammates-ia-mcp` (§3) e `landing-cookies-variantes` (§3) dizem que a Res. 32/2026 não está no acervo. Ela
    está, em `reguladores/mj/resolucoes/2026/resolucao-n-32-de-26-de-janeiro-de-2026-683334547.md`, com nome genérico
    ("resolução n. 32"). Não muda a conclusão de nenhum dos dois.
  - Registrado como nit na caixa do Luminaris: `L-20261126-205803-8c22`.
- **Fora de escopo, registrado na caixa da landing:** as pesquisas do servidor e do armazenamento fora do Brasil não
  estavam na caixa. Agora estão em `L-20261126-205742-9431` (fork, fiscal), com o §1.9 como ponto de partida.

## 6. Fontes de fornecedor (não normativas)
| Id | Documento | Origem | Lido | SHA-256 |
|---|---|---|---|---|
| F01 | Resend — Data Processing Addendum (texto extraído do HTML) | <https://resend.com/legal/dpa> (curl) | 2026-11-26 | `a8b410acc82b967c055614afc42abfb8ac07ae19d5a350eb45d2c10598af5641` |
| F02 | Resend — GDPR / perguntas (markdown) | <https://resend.com/security/gdpr.md> (curl) | 2026-11-26 | `801da6db7cf8dd56360aac8bef68b1587618319726e7d4af43d3a535679c9669` |

Os demais fatos do Resend (regiões, suboperadores, aviso de incidente, política de uso) vêm do plano da landing §5.9
(`docs/superpowers/specs/2026-11-26-admin-conteudo-metricas-google-plano.md`, commit `1f27488` da branch
`feat/waitlist-founders`), lido em 26/11/2026.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 13.709 de 14/08/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/183a6accb5801eb88fe63d57acdd375ae6339401/federal/leis-ordinarias/2018/lei-13709-2018-08-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2018-08-14;13709> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-26T17:49:30-03:00 · arquivo local `docs/D01_lei-13709-2018-08-14.md` · SHA-256 `72d32431037ce85955c6f959f50f11d10971a8ec36f93cdae5ee3459ec66a4dd`
- **[D02]** Resolução Nº 32, DE 26 DE janeiro DE 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/1b9bb3ddaa43737703ca11821142da8cb6d6a2cf/reguladores/mj/resolucoes/2026/resolucao-n-32-de-26-de-janeiro-de-2026-683334547.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-n-32-de-26-de-janeiro-de-2026-683334547> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-11-26T17:49:31-03:00 · arquivo local `docs/D02_resolucao-n-32-de-26-de-janeiro-de-2026-683334547.md` · SHA-256 `a0aa860bd71cd0cbc3f6157e67727dab9e9f7ce8cc8a24d376fed8b5e0cfb0a2`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** L13709compilado — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm>  
  Baixado em 2026-11-26T17:49:49-03:00 · arquivo local `docs/D03_l13709compilado-htm.html` · SHA-256 `f761ccb6a39c2c27c18e4c7c986bd7e81d069cbe0883666f2f283e63b0fba299`
- **[D04]** Resolução CD/ANPD nº 19, de 23 de agosto de 2024Portal Gov.br — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024>  
  Baixado em 2026-11-26T17:49:50-03:00 · arquivo local `docs/D04_resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024.html` · SHA-256 `f3702b05f3ad140b46360f5a8d09c4c71a11b9723ade3f67b2369c9049e3bbb0`  
  ⚠ TEXTO MUDOU desde 2026-10-29. Dossiês que citaram a versão anterior: lgpd-teammates-ia-mcp D03. Conferir se a conclusão deles ainda vale
- **[D05]** Transferência Internacional de DadosPortal Gov.br — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados>  
  Baixado em 2026-11-26T17:49:50-03:00 · arquivo local `docs/D05_transferencia-internacional-de-dados.html` · SHA-256 `4976a44ca0d456ed9720243fc938a34cb15e98f257e4aea7acc35ba4571a45aa`
- **[D06]** Regulamentações da ANPDPortal Gov.br — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd>  
  Baixado em 2026-11-26T17:49:59-03:00 · arquivo local `docs/D06_regulamentacoes_anpd.html` · SHA-256 `0d81bddeec32453c9d569a84aef78a7977d900f9ef9925903754c549a9f6bc49`

## Registro de buscas
_Nenhuma busca registrada._
